from fastapi import UploadFile, File, HTTPException, APIRouter
from openai import OpenAI
import os
from crewai import Agent, Task, Crew
from agents.recommendation_agent import generate_recommendations_from_text
from utils.db import save_interaction, save_voice_result
import traceback

router = APIRouter()

# Lazy OpenAI client to avoid import-time failures when API key is missing
client = None


def get_openai_client():
    global client
    if client is None:
        try:
            client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        except Exception as e:
            print("OpenAI client init failed:", e)
            client = None
    return client

# ======================================================
# 1. Whisper Transcription
# ======================================================

@router.post("/voice/transcribe")
async def transcribe_audio(file: UploadFile = File(...)):
    try:
        audio_bytes = await file.read()

        if len(audio_bytes) < 500:
            raise HTTPException(status_code=400, detail="Audio file too small")

        c = get_openai_client()
        if c is None:
            print("Transcription service not configured (missing API key)")
            return {"transcript": "", "warning": "Transcription service unavailable"}
        # Try multiple common transcription models in order to maintain
        # compatibility with different OpenAI account setups.
        candidate_models = [
            "gpt-4o-transcribe",
            "gpt-5.1",
            "gpt-4o",
            "whisper-1",
        ]

        transcription = None
        last_err = None
        for model_name in candidate_models:
            try:
                print(f"Attempting transcription with model: {model_name}")
                transcription = c.audio.transcriptions.create(
                    model=model_name, file=(file.filename, audio_bytes)
                )
                break
            except Exception as e:
                last_err = e
                print(f"Model {model_name} failed: {e}")

        if transcription is None:
            print("All transcription models failed:", last_err)
            traceback.print_exc()
            return {"transcript": "", "warning": "Transcription service unavailable"}

        # Robust extraction of transcript text from various response shapes
        text = None
        try:
            if hasattr(transcription, "text"):
                text = transcription.text
            elif isinstance(transcription, dict):
                # common dict shapes
                text = (
                    transcription.get("text")
                    or transcription.get("transcript")
                    or (transcription.get("data") and transcription["data"][0].get("text"))
                    or transcription.get("output")
                )
            else:
                # Some SDKs return objects with nested properties
                # fall back to string conversion
                text = str(transcription)
        except Exception as e:
            print("Failed to extract transcript text:", e)
            traceback.print_exc()
            text = None

        return {"transcript": text or ""}

    except HTTPException:
        raise
    except Exception as e:
        print("Unhandled error in /voice/transcribe:", e)
        traceback.print_exc()
        # Return a safe payload instead of raising a 500 so the frontend
        # doesn't get an unhandled error when transcription fails.
        return {"transcript": "", "error": "Internal server error while transcribing audio"}


# ======================================================
# 2. Voice Transcript → AI Clinical Analysis (Your Logic)
# ======================================================

def analyze_patient_voice_text(transcript: str) -> str:
    agent = Agent(
        role="Medical Voice Assistant",
        goal="Generate a complete structured clinical interpretation from patient speech.",
        backstory=(
            "You are an expert clinical assistant who ALWAYS returns a full medical report "
            "in a consistent, predictable structure that never omits any section."
        ),
        llm="openai/gpt-4o"
    )

    # ✅ NEW — Bulletproof system prompt
    task = Task(
        description=f"""
You MUST analyze the following patient transcript:

\"\"\"{transcript}\"\"\"

Return the FULL structured medical report in Markdown EXACTLY in this format:

## Summary
<1–2 sentence summary>

## Key Symptoms
- symptom 1
- symptom 2
(If none provided → write "Not enough information provided.")

## Duration
<duration OR "Not enough information provided.">

## Severity
<severity OR "Not enough information provided.">

## Possible Causes
- cause 1
- cause 2
(If unknown → "Not enough information provided.")

## Red Flag Warnings
- warning 1
- warning 2
(If none → "None identified.")

## Patient-Friendly Explanation
<simple explanation in everyday language>

## Doctor Summary
<formal medical summary>

## Recommended Next Steps
- step 1
- step 2

IMPORTANT RULES:
- NEVER skip a section.
- NEVER reorder sections.
- NEVER output raw JSON.
- ALWAYS keep Markdown format exactly as above.
- If any section lacks information, write: "Not enough information provided."
""",
        agent=agent,
        expected_output="A complete structured Markdown medical report."
    )

    crew = Crew(agents=[agent], tasks=[task])
    try:
        result = crew.kickoff()

        # ---- SAFE EXTRACTION (unchanged) ----
        if hasattr(result, "json_dict") and result.json_dict:
            jd = result.json_dict
            if jd.get("final_output"):
                return jd["final_output"]
            if jd.get("result"):
                return jd["result"]
            return str(jd)

        if hasattr(result, "raw") and result.raw:
            raw = result.raw
            if isinstance(raw, dict):
                if raw.get("output_text"):
                    return raw["output_text"]
                if raw.get("text"):
                    return raw["text"]
            return str(raw)

        if hasattr(result, "tasks_output") and result.tasks_output:
            t = result.tasks_output[0]
            if getattr(t, "output", None):
                return str(t.output)
            if getattr(t, "result", None):
                return str(t.result)
            return str(t)

    except Exception as crew_err:
        # If Crew or its underlying LLM is not available (model missing, access denied, etc.)
        # fall back to a direct OpenAI chat completion using a widely available model.
        print("Crew kickoff failed, falling back to direct OpenAI chat completion:", crew_err)
        traceback.print_exc()

        try:
            client = get_openai_client()
            if client is None:
                raise RuntimeError("OpenAI client not configured")

            fallback_model = os.getenv("VOICE_ANALYSIS_MODEL", "gpt-3.5-turbo")
            response = client.chat.completions.create(
                model=fallback_model,
                messages=[
                    {"role": "system", "content": "You are an expert radiologist and medical analyst. " + task.description},
                    {"role": "user", "content": transcript},
                ],
            )

            # Extract text robustly
            try:
                return response.choices[0].message.content
            except Exception:
                # Last-resort: coerce to string
                return str(response)

        except Exception as fallback_err:
            print("Fallback OpenAI chat completion failed:", fallback_err)
            traceback.print_exc()
            return "[Analysis service unavailable]"

    return "No analysis produced."



# ======================================================
# Pinecone Storage + Retrieval
# ======================================================

from utils.pinecone_client import get_index, embed_text

def save_to_pinecone(patient_id: int, analysis_text: str):
    idx = get_index()
    if idx is None:
        print("Warning: Pinecone index not available. Skipping save.")
        return

    embedding = embed_text(analysis_text)

    idx.upsert(
        vectors=[
            {
                "id": f"case-{patient_id}-{os.urandom(4).hex()}",
                "values": embedding,
                "metadata": {
                    "patient_id": patient_id,
                    "analysis": analysis_text
                }
            }
        ]
    )


def search_similar_cases(query_text: str, top_k: int = 3):
    idx = get_index()
    if idx is None:
        print("Warning: Pinecone index not available.")
        return []

    embedding = embed_text(query_text)

    results = idx.query(
        vector=embedding,
        top_k=top_k,
        include_metadata=True
    )

    matches = []
    for match in results.get("matches", []):
        matches.append({
            "score": match.get("score"),
            "analysis": match.get("metadata", {}).get("analysis")
        })

    return matches


# ======================================================
# Extract Patient Information (JSON)
# ======================================================

import re
import gender_guesser.detector as gender

# Initialize only once
detector = gender.Detector()


def guess_gender_from_name(name: str):
    """Infer gender based on first name."""
    if not name:
        return None

    first = name.split()[0]

    g = detector.get_gender(first)

    if g in ("male", "mostly_male"):
        return "Male"
    elif g in ("female", "mostly_female"):
        return "Female"
    else:
        return None  # unisex or unknown


def extract_patient_info(text: str):
    if not text:
        return {
            "name": None,
            "age": None,
            "sex": None,
            "symptoms": [],
            "duration": None,
            "body_location": None
        }

    # ---------- NAME ----------
    name = None
    name_patterns = [
        r"my name is ([A-Za-z ]+)",
        r"\bi am ([A-Za-z ]+)",
        r"\bi'm ([A-Za-z ]+)",
        r"this is ([A-Za-z ]+)",
    ]

    for p in name_patterns:
        match = re.search(p, text, re.IGNORECASE)
        if match:
            extracted = match.group(1).strip()
            extracted = re.sub(r"^(hi|hello|hey)[, ]+", "", extracted, flags=re.IGNORECASE)
            name = extracted.split(",")[0].strip()
            break

    # ---------- AGE ----------
    age = None
    age_match = re.search(r"(\d{1,2})[- ]?year[- ]?old", text, re.IGNORECASE)
    if age_match:
        age = int(age_match.group(1))

    # ---------- SEX (explicit) ----------
    sex = None
    if re.search(r"\bmale\b", text, re.IGNORECASE):
        sex = "Male"
    elif re.search(r"\bfemale\b", text, re.IGNORECASE):
        sex = "Female"

    # ---------- SEX (infer from name) ----------
    if sex is None and name:
        inferred = guess_gender_from_name(name)
        if inferred:
            sex = inferred

    # ---------- SYMPTOMS ----------
    symptoms = []
    symptom_match = re.search(r"i have (.*?)(?:\.|$)", text, re.IGNORECASE)
    if symptom_match:
        raw = symptom_match.group(1)
        symptoms = [s.strip() for s in re.split(r",|and", raw)]

    # ---------- BODY LOCATION ----------
    body_location = None
    body_match = re.search(
        r"(pain|pimples|rash|injury|swelling|discomfort) (on|in|at) ([A-Za-z ]+)",
        text,
        re.IGNORECASE
    )
    if body_match:
        body_location = body_match.group(3).strip()

    # ---------- DURATION ----------
    duration = None
    duration_match = re.search(
        r"for (\d+ (day|days|week|weeks|month|months|year|years))",
        text,
        re.IGNORECASE
    )
    if duration_match:
        duration = duration_match.group(1).strip()

    return {
        "name": name,
        "age": age,
        "sex": sex,
        "symptoms": symptoms,
        "duration": duration,
        "body_location": body_location
    }




# ======================================================
# 3. Voice Analyze Endpoint (Final)
# ======================================================

# top of file imports (add if not present)
import re
from fastapi import HTTPException



# ===============================
# Remove excessive blank lines
# ===============================
def remove_large_gaps(text: str) -> str:
    """
    Collapses unnecessary large gaps in markdown.
    Turns 3+ blank lines → 1 blank line.
    Also removes trailing spaces that create visual spacing.
    """
    text = re.sub(r"\n{3,}", "\n\n", text)      # collapse 3+ newlines
    text = re.sub(r"[ \t]+\n", "\n", text)     # remove trailing spaces
    return text


# ===============================
# Helper: robust formatter
# ===============================
def format_analysis_markdown(text: str) -> str:
    text = text.replace("```", "").replace("\\n", "\n").strip()

    # Normalize lines
    lines = [l.strip() for l in text.splitlines()]

    sections = {
        "summary": "",
        "symptoms": "",
        "duration": "",
        "severity": "",
        "causes": "",
        "warnings": "",
        "friendly": "",
        "doctor": "",
        "steps": "",
    }

    current = None

    KEYWORDS = {
        "summary": ["summary", "clinical summary", "doctor-style summary"],
        "symptoms": ["key symptoms", "symptoms"],
        "duration": ["duration"],
        "severity": ["severity"],
        "causes": ["possible causes", "causes"],
        "warnings": ["red flag", "warnings"],
        "friendly": ["patient-friendly", "explanation"],
        "doctor": ["doctor summary", "doctor-style"],
        "steps": ["recommended next steps", "next steps"],
    }

    # Assign lines based on keyword matches
    for line in lines:
        low = line.lower()

        # Detect header keywords
        matched = False
        for key, patterns in KEYWORDS.items():
            if any(p in low for p in patterns):
                current = key
                matched = True
                break

        # Append content to current section
        if not matched and current:
            sections[current] += line + "\n"

    # Cleanup each section
    for k in sections:
        sections[k] = sections[k].strip()

    # Final structured markdown
    final = f"""
1. **Summary:**  
{sections['summary'] or '-'}

2. **Key Symptoms:**  
{sections['symptoms'] or '-'}

3. **Duration:**  
{sections['duration'] or '-'}

4. **Severity:**  
{sections['severity'] or '-'}

5. **Possible Causes:**  
{sections['causes'] or '-'}

6. **Red Flag Warnings:**  
{sections['warnings'] or '-'}

7. **Patient-Friendly Explanation:**  
{sections['friendly'] or '-'}

8. **Doctor Summary:**  
{sections['doctor'] or '-'}

9. **Recommended Next Steps:**  
{sections['steps'] or '-'}
""".strip()

    # Remove empty numbered sections like: "3.\n"
    final = re.sub(r"\n\d+\.\s*\n", "\n", final)

    # Collapse too many blank lines
    final = re.sub(r"\n{3,}", "\n\n", final)

    # Trim trailing spaces
    final = re.sub(r"[ \t]+$", "", final, flags=re.MULTILINE)

    return final








# ======================================================
# ⭐ FULL ENDPOINT (Your logic untouched)
# ======================================================
@router.post("/voice/analyze")
async def analyze_voice(data: dict):

    transcript = data.get("transcript")
    patient_id = data.get("patient_id", 1)

    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript is required")

    try:
        # 1️⃣ Extract patient metadata
        patient_info = extract_patient_info(transcript)

        # 2️⃣ Full AI analysis (raw text)
        analysis_raw = analyze_patient_voice_text(transcript)
        analysis_raw = analysis_raw.replace("```", "").replace("\\n", "\n").strip()

        
        analysis = format_analysis_markdown(analysis_raw)
        analysis = remove_large_gaps(analysis).strip()

        # 3️⃣ Store in Pinecone
        save_to_pinecone(patient_id, analysis)

        # 4️⃣ Retrieve similar cases
        similar_cases = search_similar_cases(analysis)

        # 5️⃣ AI recommendations
        rec_input = {
            "transcript": transcript,
            "analysis": analysis,
            "patient_info": patient_info
        }
        recs = generate_recommendations_from_text(
            rec_input,
            context_type="voice_symptoms",
        )

        # 6️⃣ Save to PostgreSQL
        await save_voice_result(
            patient_info["name"],
            patient_info["age"],
            patient_info["sex"],
            patient_info["symptoms"],
            patient_info["duration"],
            patient_info["body_location"],
            transcript,
            analysis,
            similar_cases
        )

        # 7️⃣ Interaction Log
        await save_interaction(
            patient_id=patient_id,
            transcript=transcript,
            analysis=analysis,
            similar_cases=similar_cases
        )

        return {
            "patient_info": patient_info,
            "analysis": analysis,
            "similar_cases": similar_cases,
            "recommendations": recs
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
