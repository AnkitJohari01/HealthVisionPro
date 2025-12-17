from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
import asyncpg
import os
import base64
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# ------------------------------------------------------
# Initialize FastAPI (ONLY ONCE!)
# ------------------------------------------------------
app = FastAPI()

# ------------------------------------------------------
# CORS Setup
# ------------------------------------------------------
# Allow origins are configurable — avoid using wildcard when credentials are used
FRONTEND_ORIGINS = os.getenv("FRONTEND_ORIGINS", "http://localhost:5173")
allowed_origins = [origin.strip() for origin in FRONTEND_ORIGINS.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins or ["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------------------------------------
# Import Routers (VOICE, HISTORY, PREDICT, GRAPH)
# ------------------------------------------------------
from routers.voice_router import router as voice_router
from routers.history_router import router as history_router
from routes.predict import router as predict_router
from routes.GraphicalRepresentation import router as graph_router

# Register routers
app.include_router(voice_router)
app.include_router(history_router)
app.include_router(graph_router)            # /graph/*
app.include_router(predict_router, prefix="/api")   # /api/*


@app.get("/health")
def health_check():
    """Simple health endpoint to verify the server and CORS behavior quickly."""
    return {"status": "ok"}

# ------------------------------------------------------
# Database Connection
# ------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL")

async def get_pg_pool():
    return await asyncpg.create_pool(DATABASE_URL)

# ------------------------------------------------------
# Import ML + Image Agents AFTER app creation
# ------------------------------------------------------
from utils.db import save_imaging_result
from agents.report_agent import run_radiology_agent
from tools.file_tools import extract_pdf_pages
from agents.image_agent import (
    run_radiology_agent_for_image,
    get_annotation_instructions
)

from agents.recommendation_agent import generate_recommendations_from_text



# format_detection_summary removed — YOLO/annotation features disabled
import json
import traceback

@app.post("/analyze/image")
async def analyze_image(file: UploadFile = File(...)):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, "Unsupported image type")

    try:
        # 1️⃣ Read bytes
        img_bytes = await file.read()

        # 2️⃣ Radiology report
        try:
            report = run_radiology_agent_for_image(img_bytes)
        except Exception as lm_err:
            # If the LLM fails, log the error and return a helpful placeholder
            print("Radiology agent failed:", lm_err)
            traceback.print_exc()
            report = "[Error generating report] The radiology analysis service is currently unavailable."

        try:
            recommendations = generate_recommendations_from_text(report, "imaging_report")
        except Exception as rec_err:
            print("Recommendation generation failed:", rec_err)
            traceback.print_exc()
            recommendations = []

        # Previously we ran YOLO and returned annotated images. That has been
        # removed; keep API response keys but return empty placeholders so the
        # frontend continues to work without changes.
        findings = []
        annotated_b64 = None
        yolo_markdown = ""

        # Save to DB (annotated_img left as None). If DB fails, log and continue
        try:
            saved_id = await save_imaging_result(
                file_name=file.filename,
                report=report,
                annotated_img=annotated_b64,
                findings=findings,
            )
        except Exception as db_err:
            print("Failed to save imaging result:", db_err)
            traceback.print_exc()
            saved_id = None

        return {
            "id": saved_id,
            "filename": file.filename,
            "report": report,
            "annotations": findings,
            "annotated_image": annotated_b64,
            "recommendations": recommendations,
            "yolo_explanation": yolo_markdown,
        }

    except HTTPException:
        # Re-raise any explicit HTTPExceptions
        raise
    except Exception as e:
        print("Unhandled error in /analyze/image:", e)
        traceback.print_exc()
        raise HTTPException(500, "Internal server error while processing image")


from typing import List

@app.post("/analyze/images")
async def analyze_multiple_images(files: List[UploadFile] = File(...)):
    results = []

    for file in files:
        img_bytes = await file.read()

        try:
            report = run_radiology_agent_for_image(img_bytes)
        except Exception as e:
            print(f"Radiology agent failed for {file.filename}:", e)
            report = "[Error generating report] The radiology analysis service is currently unavailable."

        findings = []

        results.append({
            "filename": file.filename,
            "report": report,
            "findings": findings,
            "annotated_image": None,
        })

    # Combined summary (very simple version)
    combined_report = "\n\n".join([r["report"] for r in results])
    combined_findings = [f for r in results for f in r["findings"]]

    return {
        "images": results,
        "combined_report": combined_report,
        "combined_findings": combined_findings
    }



# ------------------------------------------------------
# PDF ANALYSIS
# ------------------------------------------------------
@app.post("/analyze")
async def analyze_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(400, "Only PDF files allowed")

    try:
        pdf_bytes = await file.read()
        pdf_data = extract_pdf_pages(pdf_bytes)
        try:
            report = run_radiology_agent(pdf_data)
        except Exception as lm_err:
            print("Radiology agent failed for PDF:", lm_err)
            traceback.print_exc()
            report = "[Error generating report] The radiology analysis service is currently unavailable."

        pool = await get_pg_pool()
        async with pool.acquire() as con:
            try:
                await con.execute(
                    """
                    INSERT INTO radiology_reports (filename, report)
                    VALUES ($1, $2)
                    """,
                    file.filename,
                    report,
                )
            except Exception as db_err:
                print("Failed to save PDF report:", db_err)
                traceback.print_exc()

        return {"filename": file.filename, "report": report}

    except Exception as e:
        raise HTTPException(500, str(e))
