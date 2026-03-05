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
You are a board-certified radiologist with 20+ years of experience. 
You will be given a medical image. Your job is to analyze it carefully and produce a structured radiology report.

CRITICAL RULES:
- You MUST correctly identify the actual body part/region shown in the image before writing anything.
- Do NOT assume or hallucinate a body region — look at the image carefully.
- If the image is not a medical/radiology image, state that clearly in the Summary and leave other sections minimal.
- Do NOT add any text, notes, or disclaimers outside the four sections below.
- Do NOT use numbering, sub-numbering (1.1, 1.2), or nested bullets.
- Do NOT repeat information across sections.

Follow THIS EXACT MARKDOWN FORMAT and no other format:

# Summary
Provide a 2–3 sentence overview. State the imaging modality (X-ray, MRI, CT, ultrasound, etc.), the body part, and the general impression.

# What the Image Shows
- Describe visible anatomical structures using precise medical terminology.
- Each bullet should cover one distinct observation.
- Comment on tissue density, symmetry, alignment, or any notable features.
- Keep each bullet concise — one idea per point.

# Abnormalities
- List any abnormal findings as individual bullet points.
- If no abnormalities are detected, write a single bullet: "No significant abnormalities detected."
- Be specific: include location, size (if estimable), and nature of the finding.

# Impression
Provide a 1–2 sentence radiology-style conclusion summarizing the most clinically significant finding or confirming a normal study.
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
