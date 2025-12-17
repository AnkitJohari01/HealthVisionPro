# backend/routers/history_router.py

from fastapi import APIRouter, HTTPException
from utils.db import get_pg_pool
import json

router = APIRouter()


# =========================================================
# 📌 1. IMAGING HISTORY
# =========================================================
@router.get("/history/images")
async def get_imaging_history():
    try:
        pool = await get_pg_pool()
        async with pool.acquire() as con:
            rows = await con.fetch(
                """
                SELECT 
                    id, 
                    file_name, 
                    report, 
                    annotated_img, 
                    findings, 
                    created_at
                FROM imaging_results
                ORDER BY created_at DESC;
                """
            )

        imaging_data = []
        for r in rows:
            imaging_data.append({
                "id": r["id"],
                "file_name": r["file_name"],
                "report": r["report"] or "",    # markdown-safe
                "annotated_img": r["annotated_img"],
                "findings": r["findings"],
                "created_at": r["created_at"]
            })

        return {"imaging": imaging_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# 📌 2. VOICE HISTORY
# =========================================================
@router.get("/history/voice")
async def get_voice_history():
    try:
        pool = await get_pg_pool()
        async with pool.acquire() as con:
            rows = await con.fetch(
                """
                SELECT 
                    id,
                    transcript,
                    ai_analysis,
                    similar_cases,
                    created_at
                FROM voice_results
                ORDER BY created_at DESC;
                """
            )

        voice_data = []
        for r in rows:
            similar = r["similar_cases"]

            # Convert JSON string → Python list
            try:
                if isinstance(similar, str):
                    similar = json.loads(similar)
            except:
                similar = None

            voice_data.append({
                "id": r["id"],
                "transcript": r["transcript"] or "",
                "ai_analysis": r["ai_analysis"] or "",   # markdown-safe
                "similar_cases": similar,
                "created_at": r["created_at"]
            })

        return {"voice": voice_data}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =========================================================
# 📌 3. OPTIONAL — COMBINED ENDPOINT (Frontend Friendly)
# =========================================================
@router.get("/history")
async def get_combined_history():
    try:
        pool = await get_pg_pool()

        async with pool.acquire() as con:
            imaging_rows = await con.fetch("""
                SELECT id, file_name, report, annotated_img, findings, created_at
                FROM imaging_results
                ORDER BY created_at DESC;
            """)

            voice_rows = await con.fetch("""
                SELECT id, transcript, ai_analysis, similar_cases, created_at
                FROM voice_results
                ORDER BY created_at DESC;
            """)

        # Imaging formatting
        imaging = [
            {
                "id": r["id"],
                "file_name": r["file_name"],
                "report": r["report"] or "",
                "annotated_img": r["annotated_img"],
                "findings": r["findings"],
                "created_at": r["created_at"]
            }
            for r in imaging_rows
        ]

        # Voice formatting
        voice = []
        for r in voice_rows:
            similar = r["similar_cases"]
            try:
                if isinstance(similar, str):
                    similar = json.loads(similar)
            except:
                similar = None

            voice.append({
                "id": r["id"],
                "transcript": r["transcript"] or "",
                "ai_analysis": r["ai_analysis"] or "",
                "similar_cases": similar,
                "created_at": r["created_at"]
            })

        return {"imaging": imaging, "voice": voice}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))




# =========================================================
# 📌 4. CLEAR ALL HISTORY (Images + Voice)
# =========================================================
@router.delete("/history/clear")
async def clear_history():
    try:
        pool = await get_pg_pool()
        async with pool.acquire() as con:
            # Clear imaging history
            await con.execute("DELETE FROM imaging_results")

            # Clear voice analysis history
            await con.execute("DELETE FROM voice_results")

        return {"message": "History cleared"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

