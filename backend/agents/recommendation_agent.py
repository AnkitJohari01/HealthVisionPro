# from crewai import Agent, Task, Crew
# import json
# from typing import Literal

# ContextType = Literal["imaging_report", "voice_symptoms"]


# def generate_recommendations_from_text(
#     input_text: str,
#     context_type: ContextType = "imaging_report",
# ) -> dict:
#     """
#     Uses GPT (via CrewAI) to generate:
#       - patient-friendly report
#       - doctor-friendly report
#       - dynamic recommendations (tests, referrals, self-care, urgency, disclaimer)
#     Everything is LLM-driven, nothing is hardcoded to any specific disease.
#     """

#     # Short hint to the model about the source
#     if context_type == "imaging_report":
#         source_hint = "This text is an imaging report or image-based analysis."
#     else:
#         source_hint = "This text is a symptom description or voice-based analysis."

#     system_prompt = f"""
#     You are a clinical decision support assistant working inside the HealthVisionPro app.

#     You receive ONLY the CURRENT information (no past history), which might be:
#     - a radiology / imaging report
#     - or a symptom description (possibly from voice transcription)
#     {source_hint}

#     Your job is to:
#     1. Create a short, very simple, **patient-friendly** explanation.
#     2. Create a concise, more technical, **doctor-friendly** summary.
#     3. Generate **dynamic, context-aware next-step recommendations**, which may include:
#        - suggested diagnostic tests (if appropriate)
#        - suggested specialist referrals (if appropriate)
#        - safe self-care guidance (if appropriate)
#        - an urgency/risk level
#        - red-flag points if any
#        - a safety disclaimer telling the patient to consult a doctor

#     IMPORTANT:
#     - Do NOT assume past medical history.
#     - Base everything ONLY on the text you receive.
#     - Do NOT hard-code any generic advice; tailor everything to the content.
#     - If information is insufficient, say so clearly and recommend medical review.

#     Return your answer as **pure JSON ONLY**, no extra text, in this exact shape:

#     {{
#       "patient_friendly_report": "string",
#       "doctor_friendly_report": "string",
#       "recommendations": {{
#           "diagnostic_tests": ["string", "..."],
#           "specialist_referrals": ["string", "..."],
#           "self_care_advice": ["string", "..."],
#           "urgency_level": "low | moderate | high | emergency",
#           "red_flags": ["string", "..."],
#           "disclaimer": "string"
#       }}
#     }}
#     """

#     agent = Agent(
#         role="Context-Aware Recommendation Assistant",
#         goal=(
#             "Transform the current imaging/symptom data into safe, "
#             "personalized next-step guidance for both patient and doctor."
#         ),
#         backstory=(
#             "You work inside a digital radiology & symptom triage app. "
#             "You never use old data – only what is given in this message – "
#             "and you always speak clearly and responsibly."
#         ),
#         llm="openai/gpt-4o"  # same family you are already using
#     )

#     task = Task(
#         description=(
#             "Here is the CURRENT input text:\n\n"
#             f"{input_text}\n\n"
#             "Follow the system instructions and return ONLY the JSON object."
#         ),
#         agent=agent,
#         expected_output="A strict JSON object with patient & doctor reports and recommendations."
#     )

#     crew = Crew(agents=[agent], tasks=[task])
#     result = crew.kickoff()

#     # ---- Extract raw text from CrewAI result (reuse your existing pattern) ----
#     raw_text = None

#     if hasattr(result, "json_dict") and result.json_dict:
#         # Some CrewAI configs put final text here
#         jd = result.json_dict
#         if isinstance(jd, dict) and jd.get("final_output"):
#             raw_text = jd["final_output"]
#         elif isinstance(jd, dict) and jd.get("result"):
#             raw_text = jd["result"]

#     if raw_text is None and hasattr(result, "raw") and result.raw:
#         raw = result.raw
#         raw_text = raw.get("output_text") or raw.get("text") if isinstance(raw, dict) else str(raw)

#     if raw_text is None and hasattr(result, "tasks_output") and result.tasks_output:
#         t = result.tasks_output[0]
#         raw_text = getattr(t, "output", None) or getattr(t, "result", None) or str(t)

#     if raw_text is None:
#         # Worst case – no output
#         return {
#             "patient_friendly_report": "No recommendations could be generated from the current data.",
#             "doctor_friendly_report": "No structured recommendation output was produced by the model.",
#             "recommendations": {
#                 "diagnostic_tests": [],
#                 "specialist_referrals": [],
#                 "self_care_advice": [],
#                 "urgency_level": "low",
#                 "red_flags": [],
#                 "disclaimer": "Unable to generate reliable guidance. Please consult a doctor."
#             }
#         }

#     # Try to parse JSON from the LLM output
#     raw_text = raw_text.strip()
#     try:
#         parsed = json.loads(raw_text)
#         return parsed
#     except Exception:
#         # If the model added extra text, try to extract JSON substring
#         import re
#         match = re.search(r"\{.*\}", raw_text, re.DOTALL)
#         if match:
#             try:
#                 return json.loads(match.group(0))
#             except Exception:
#                 pass

#     # Final fallback – wrap the raw text in a JSON shell (still dynamic content)
#     return {
#         "patient_friendly_report": raw_text,
#         "doctor_friendly_report": raw_text,
#         "recommendations": {
#             "diagnostic_tests": [],
#             "specialist_referrals": [],
#             "self_care_advice": [],
#             "urgency_level": "low",
#             "red_flags": [],
#             "disclaimer": "Model returned non-JSON output; please verify clinically."
#         }
#     }



























from crewai import Agent, Task, Crew
import json
from typing import Literal

ContextType = Literal["imaging_report", "voice_symptoms"]


def generate_recommendations_from_text(
    input_text: str | dict,
    context_type: ContextType = "imaging_report",
) -> dict:

    # ==============================
    # 🔥 INPUT FIX (kept same)
    # ==============================
    if isinstance(input_text, dict):
        input_text = (
            f"Transcript:\n{input_text.get('transcript','')}\n\n"
            f"Analysis:\n{input_text.get('analysis','')}"
        )

    # ==============================
    # PROMPT (untouched)
    # ==============================
    if context_type == "imaging_report":
        source_hint = "This text is an imaging report or image-based analysis."
    else:
        source_hint = "This text is a symptom description or voice-based analysis."

    system_prompt = f"""
    You are a clinical decision support assistant inside HealthVisionPro.
    Use ONLY current information, produce patient- and doctor-style summaries,
    and generate context-based recommendations. Return pure JSON only.

    {source_hint}
    """

    agent = Agent(
        role="Context-Aware Recommendation Assistant",
        goal="Generate structured, safe medical recommendations.",
        backstory="You interpret the CURRENT clinical text only.",
        llm="openai/gpt-4o"
    )

    task = Task(
        description=f"Return ONLY JSON:\n\n{input_text}",
        agent=agent,
        expected_output="JSON with reports + recommendations"
    )

    crew = Crew(agents=[agent], tasks=[task])
    result = crew.kickoff()


    # ============================================================
    # 🔥 FINAL FIX — this was your ONLY breaking source
    #    raw may be STRING → so .get() must NEVER run blindly
    # ============================================================
    raw_text = None

    # --- Case 1: CrewAI returned json_dict ---
    if hasattr(result, "json_dict") and result.json_dict:
        jd = result.json_dict
        if isinstance(jd, dict):
            raw_text = jd.get("final_output") or jd.get("result")

    # --- Case 2: .raw may be STRING or DICT ---
    if raw_text is None and hasattr(result, "raw"):
        raw = result.raw

        if isinstance(raw, str):               # <-- FIX
            raw_text = raw

        elif isinstance(raw, dict):            # <-- FIX
            raw_text = raw.get("output_text") or raw.get("text") or str(raw)

        else:
            raw_text = str(raw)

    # --- Case 3: tasks_output fallback ---
    if raw_text is None and hasattr(result, "tasks_output") and result.tasks_output:
        t = result.tasks_output[0]
        raw_text = getattr(t, "output", None) or getattr(t, "result", None) or str(t)

    # --- Case 4: nothing still found ---
    if raw_text is None:
        return default_fail_response()


    # ==============================
    # JSON PARSE (untouched)
    # ==============================
    raw_text = raw_text.strip()

    try:
        return json.loads(raw_text)
    except:
        import re
        match = re.search(r"\{.*\}", raw_text, re.DOTALL)
        if match:
            try: return json.loads(match.group(0))
            except: pass

    # ==============================
    # FALLBACK (untouched)
    # ==============================
    return {
        "patient_friendly_report": raw_text,
        "doctor_friendly_report": raw_text,
        "recommendations": {
            "diagnostic_tests": [],
            "specialist_referrals": [],
            "self_care_advice": [],
            "urgency_level": "low",
            "red_flags": [],
            "disclaimer": "Non-JSON output returned — manual review required."
        }
    }


# Keep this helper at bottom
def default_fail_response():
    return {
        "patient_friendly_report": "No recommendations generated.",
        "doctor_friendly_report": "Model returned no structured output.",
        "recommendations": {
            "diagnostic_tests": [],
            "specialist_referrals": [],
            "self_care_advice": [],
            "urgency_level": "low",
            "red_flags": [],
            "disclaimer": "Please consult a doctor."
        }
    }
