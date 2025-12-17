from crewai import Agent, Task, Crew
import logging
import base64
import json
import re
from openai import OpenAI
import os
import traceback

logger = logging.getLogger("image_agent")
logger.setLevel(logging.DEBUG)



def format_detection_summary(obj):
    """
    Converts YOLO + recommendation into clean markdown.
    """
    md = "### Detection Summary\n\n"

    reports = obj.get("reports", [])
    if not reports:
        md += "- No objects detected.\n\n"
    else:
        md += "**Detected Objects:**\n"
        for d in reports:
            md += f"- **{d['label']}** (confidence: {d['confidence']:.2f})\n"
        md += "\n"

    rec = obj.get("recommendations", "")
    if rec:
        md += "### Recommendations\n"
        md += f"{rec}\n"

    return md


# ============================================================
#   0) NEW — Convert Detection JSON → Clean Markdown Output
# ============================================================

def format_yolo_recommendations(obj):
    """
    Converts YOLO recommendation JSON into clean markdown.
    """
    md = "### Recommendations\n\n"

    recs = obj.get("recommendations", [])
    if not recs:
        return md + "- No recommendations provided.\n"

    for r in recs:
        action = r.get("action", "Action")
        desc = r.get("description", "")
        md += f"- **{action}:** {desc}\n"

    return md


# ============================================================
#   1) Radiology Report Agent (your logic preserved)
# ============================================================

def run_radiology_agent_for_image(img_bytes: bytes) -> str:
    """
    SAME NAME, SAME LOGIC, same behavior.
    """

    b64_image = base64.b64encode(img_bytes).decode("utf-8")
    data_url = f"data:image/png;base64,{b64_image}"

    client = OpenAI()

    system_prompt = """
    You are an expert radiologist. Analyze the image and produce a clean, structured report.
    and produce a clear, simple report. YOU MUST identify the actual body part.
    Do NOT hallucinate a different body region.
    Follow THIS EXACT MARKDOWN FORMAT:
    
    # Summary
    A short 2–3 sentence overview.

    # What the image shows
    - Bullet points only
    - No numbering
    - No long paragraphs
    
    # Any abnormalities
    Write clearly using bullet points only.
    
    # Impression
    1–2 sentence radiology-style conclusion.
    
    DO NOT add extra numbering.
    DO NOT repeat sections.
    DO NOT add sub-numbering (1.1, 1.2 etc.).
    DO NOT include anything outside these four sections.
    """

    try:
        response = client.chat.completions.create(
            model=os.getenv("RADIOLOGY_MODEL", "gpt-5.1"),
            messages=[
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": data_url}
                        },
                        {
                            "type": "text",
                            "text": "Analyze this medical image."
                        }
                    ]
                }
            ]
        )
    except Exception as e:
        print("Radiology chat completion failed, returning fallback message:", e)
        traceback.print_exc()
        return "[Error generating report] The radiology analysis service is currently unavailable."

    return response.choices[0].message.content


# ============================================================
#   2) Bounding Box Annotation (your logic preserved)
# ============================================================

def get_annotation_instructions(img_bytes: bytes):
    b64_image = base64.b64encode(img_bytes).decode("utf-8")
    data_url = f"data:image/png;base64,{b64_image}"

    system_prompt = """
    You are a radiology annotation assistant.
    You must return ONLY JSON:

    {
        "findings": [
            {
                "label": "...",
                "description": "...",
                "bbox": [x, y, w, h]
            }
        ]
    }
    """

    client = OpenAI()

    response = client.chat.completions.create(
        model=os.getenv("ANNOTATION_MODEL", "gpt-3.5-turbo"),
        messages=[
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": data_url}
                    },
                    {
                        "type": "text",
                        "text": "Return JSON only."
                    }
                ]
            }
        ]
    )

    raw_text = response.choices[0].message.content

    match = re.search(r"\{.*\}", raw_text, re.DOTALL)
    if not match:
        raise ValueError("No valid JSON found in GPT response")

    return json.loads(match.group(0))
