from dotenv import load_dotenv
load_dotenv()

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL")

engine = None
SessionLocal = None


if DATABASE_URL:
    try:
        engine = create_engine(DATABASE_URL, pool_pre_ping=True)
        SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
        print("DB Engine Initialized")
    except Exception as e:
        print("Engine Creation Failed:", e)
else:
    print("DATABASE_URL not set. Skipping DB initialization.")


# ==========================
# POSTGRES ASYNC POOL
# ==========================
pg_pool = None

async def get_pg_pool():
    global pg_pool
    if pg_pool is None:
        pg_pool = await asyncpg.create_pool(DATABASE_URL, max_size=10)
    return pg_pool


# ==============================
# Save Interactions  (UNCHANGED)
# ==============================
async def save_interaction(patient_id: int, transcript: str, analysis: str, similar_cases: dict):
    pool = await get_pg_pool()
    async with pool.acquire() as con:
        await con.execute(
            """
            INSERT INTO interactions (patient_id, transcript, ai_analysis, similar_cases)
            VALUES ($1, $2, $3, $4)
            """,
            patient_id, transcript, analysis, json.dumps(similar_cases)
        )


# ==============================
# Save Appointments  (UNCHANGED)
# ==============================
async def save_appointment(patient_id: int, summary: str, start: str, end: str, event_id: str):
    pool = await get_pg_pool()
    async with pool.acquire() as con:
        await con.execute(
            """
            INSERT INTO appointments (patient_id, summary, start_time, end_time, event_id)
            VALUES ($1, $2, $3, $4, $5)
            """,
            patient_id, summary, start, end, event_id
        )


# ===============================================================
# SAVE MEDICAL IMAGING RESULT (History Tab)
# ===============================================================
async def save_imaging_result(file_name: str, report: str, annotated_img: str, findings: list):

    pool = await get_pg_pool()
    async with pool.acquire() as con:
        row = await con.fetchrow(
            """
            INSERT INTO imaging_results 
            (file_name, report, annotated_img, findings, created_at)
            VALUES ($1, $2, $3, $4, NOW())
            RETURNING id;
            """,
            file_name,
            report,
            annotated_img,
            json.dumps(findings)
        )

    return row["id"]


# ===============================================================
# SAVE VOICE RESULT (History Tab)
# ===============================================================
async def save_voice_result(
    name,
    age,
    sex,
    symptoms,
    duration,
    body_location,
    transcript,
    analysis,
    similar_cases
):
    pool = await get_pg_pool()

    async with pool.acquire() as con:
        await con.execute(
            """
            INSERT INTO voice_results 
            (name, age, sex, symptoms, duration, body_location,
             transcript, ai_analysis, similar_cases)
            VALUES ($1, $2, $3, $4, $5, $6,
                    $7, $8, $9)
            """,
            name,
            age,
            sex,
            symptoms,               
            duration,
            body_location,
            transcript,
            analysis,
            json.dumps(similar_cases)
        )


# =======================================================
# DB Connection Test (UNCHANGED)
# =======================================================
if __name__ == "__main__":
    if SessionLocal is None:
        print("❌ SessionLocal NOT initialized — Check DATABASE_URL")
    else:
        try:
            db = SessionLocal()
            db.execute(text("SELECT 1"))
            db.close()
            print("✅ PostgreSQL connection OK")
        except Exception as e:
            print("❌ PostgreSQL connection FAILED:", e)
