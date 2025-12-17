from fastapi import APIRouter, HTTPException
import joblib
import numpy as np
import os
# shap can be optional at import time; we import it when needed inside ensure_model_loaded
import pandas as pd
import asyncpg
from openai import OpenAI
import json

router = APIRouter()

# ------------------------------------
# Load Model + Encoders + Feature Order
# ------------------------------------
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(__file__)))

MODEL_PATH = os.path.join(BASE_DIR, "xgboost_health_model.pkl")
ENCODER_PATH = os.path.join(BASE_DIR, "encoders.pkl")
FEATURE_ORDER_PATH = os.path.join(BASE_DIR, "feature_order.pkl")
CSV_PATH = os.path.join(BASE_DIR, "healthvisionpro_dataset_1000.csv")

from pathlib import Path
METRICS_FILE = Path(__file__).resolve().parent / "model_metrics.json"

with open(METRICS_FILE, "r") as f:
    MODEL_METRICS = json.load(f)

# METRICS_PATH = os.path.join(BASE_DIR, "model_metrics.json")

# with open(METRICS_PATH, "r") as f:
#     model_metrics = json.load(f)


# Lazy model loading to avoid import-time failures (server should start even if model files are missing)
model = None
encoders = None
feature_order = None
explainer = None
MODEL_LOAD_ERROR = None


def ensure_model_loaded():
    """Attempt to load model, encoders and feature order on first use.
    If loading fails, set MODEL_LOAD_ERROR and leave module-level objects None.
    """
    global model, encoders, feature_order, explainer, MODEL_LOAD_ERROR

    if model is not None and encoders is not None and feature_order is not None:
        return True

    try:
        model = joblib.load(MODEL_PATH)
        encoders = joblib.load(ENCODER_PATH)
        feature_order = joblib.load(FEATURE_ORDER_PATH)
        try:
            import shap as _shap
            explainer = _shap.TreeExplainer(model)
        except Exception:
            # shap is optional; some environments don't have it installed
            print("shap not available or failed to build explainer; continuing without shap explanations")
            explainer = None
        print("Model, encoders & feature order loaded successfully!")
        MODEL_LOAD_ERROR = None
        return True
    except Exception as e:
        MODEL_LOAD_ERROR = str(e)
        print("Warning: Failed to load model or encoders:", MODEL_LOAD_ERROR)
        return False

# Load CSV dataset only once (fail gracefully if the CSV is missing)
try:
    dataset_df = pd.read_csv(CSV_PATH)
except Exception as e:
    print("Warning: failed to load CSV dataset:", e)
    dataset_df = pd.DataFrame()

# SHAP explainer is created when the model is loaded (see ensure_model_loaded)

# OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


# ---------------------------------------------------------
# PREPROCESS FUNCTION — must appear BEFORE usage
# ---------------------------------------------------------
def preprocess(patient: dict):
    
    # Auto-create age_group if missing
    if "age_group" not in patient and "age" in patient:
        age = int(patient["age"])
        if age < 40:
            patient["age_group"] = "20-40"
        elif age <= 60:
            patient["age_group"] = "40-60"
        else:
            patient["age_group"] = "60+"

    processed = {}

    for col in feature_order:
        if col in encoders:  # categorical columns
            processed[col] = encoders[col].transform([patient[col]])[0]
        else:  # numeric columns
            processed[col] = float(patient[col])

    X = np.array([[processed[col] for col in feature_order]])
    return X, feature_order



# ---------------------------------------------------------
# Fetch patient data (DB → CSV fallback)
# ---------------------------------------------------------
async def fetch_from_db(patient_id: str):
    try:
        conn = await asyncpg.connect(
            user="postgres",
            password="RadheRadhe",
            host="localhost",
            database="radiology"
        )

        row = await conn.fetchrow("""
            SELECT *
            FROM imaging_results
            WHERE patient_id = $1
            ORDER BY created_at DESC
            LIMIT 1
        """, patient_id)

        await conn.close()

        return dict(row) if row else None

    except Exception as e:
        print("DB fetch error:", e)
        return None


def fetch_from_csv(patient_id: str):
    row = dataset_df[dataset_df["patient_id"] == patient_id]
    return None if row.empty else row.iloc[0].to_dict()


async def get_patient_data(patient_id: str):
    record = await fetch_from_db(patient_id)
    if record:
        print("✨ Loaded from DATABASE")
        return record

    record = fetch_from_csv(patient_id)
    if record:
        print("✨ Loaded from CSV")
        return record

    raise HTTPException(404, f"Patient {patient_id} not found in DB or dataset.")


# ---------------------------------------------------------
# GPT-4o INSIGHT GENERATOR
# ---------------------------------------------------------
def generate_llm_insight(patient, shap_factors, pred_class, prob):

    prompt = f"""
You are a friendly medical assistant. Explain the patient’s risk in simple English.

PATIENT:
{patient}

TOP FACTORS:
{shap_factors}

PREDICTION:
- Class: {pred_class}
- Probability: {prob:.2%}

Write 4–6 short, clear, human-style bullet points.
Avoid technical ML terms.
"""

    # Try a list of models in order, fall back if one is unavailable
    model_candidates = [m.strip() for m in os.getenv("INSIGHT_MODELS", "gpt-4o,gpt-4,gpt-3.5-turbo").split(",") if m.strip()]

    last_error = None
    for model_name in model_candidates:
        try:
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {"role": "system", "content": "You explain medical risk in simple language."},
                    {"role": "user", "content": prompt},
                ],
            )

            # Different SDKs may return content in slightly different shapes
            try:
                return response.choices[0].message.content
            except Exception:
                try:
                    return response.choices[0].text
                except Exception:
                    return str(response)

        except Exception as e:
            last_error = e
            msg = str(e).lower()
            # If the error indicates the model is not found or unavailable, try the next model
            if "model" in msg and ("not" in msg or "does not" in msg or "model_not_found" in msg):
                print(f"Model {model_name} not available, trying next model: {e}")
                continue
            # For other transient errors, log and try next model as well
            print(f"Error calling model {model_name}, trying next: {e}")
            continue

    # If we reach here, all models failed — degrade gracefully
    print("LLM insight generation failed for all candidate models; returning fallback summary.", last_error)
    bullets = []
    for f in shap_factors[:6]:
        bullets.append(f"{f['feature']}: impact {f['impact']:.3f}")

    fallback = (
        "Summary generation service is unavailable. "
        "Key factors: " + "; ".join(bullets)
    )
    return fallback


# ---------------------------------------------------------
# Prediction Endpoint
# ---------------------------------------------------------
@router.post("/predict-risk")
async def predict_risk(payload: dict):
    """
    Prediction endpoint using ONLY patient_id.
    Backend automatically loads patient record from DB or CSV.
    Missing features are auto-filled so model always receives complete data.
    """

    # -------------------------------
    # 1️⃣ Validate patient_id
    # -------------------------------
    patient_id = payload.get("patient_id")
    if not patient_id:
        raise HTTPException(400, "patient_id is required")

    # -------------------------------
    # 2️⃣ Fetch patient record
    # -------------------------------
    patient = await get_patient_data(patient_id)
    if not patient:
        raise HTTPException(404, f"Patient {patient_id} not found")

    # -------------------------------
    # 3️⃣ Auto-fill missing required fields
    # -------------------------------
    default_values = {
        "age": 0,
        "gender": "Unknown",
        "BMI": 0,
        "diabetes": 0,
        "hypertension": 0,
        "smoking_status": "never",
        "heart_disease": 0,
        "patients_visited": 1,
        "target_urgent_followup": 0,
    }

    # Merge defaults into patient dict
    for key, value in default_values.items():
        patient.setdefault(key, value)

    # ---------------------------------------
    # Auto-create age_group (required by model)
    # ---------------------------------------
    if "age_group" not in patient:
        age = int(patient.get("age", 0))
        if age < 40:
            patient["age_group"] = "20-40"
        elif age <= 60:
            patient["age_group"] = "40-60"
        else:
            patient["age_group"] = "60+"




    # -------------------------------
    # 4️⃣ Preprocess for model
    # -------------------------------
    # Ensure model is loaded before running predictions
    if not ensure_model_loaded():
        raise HTTPException(503, f"Model not available: {MODEL_LOAD_ERROR}")

    X, feature_names = preprocess(patient)

    # -------------------------------
    # 5️⃣ Model Prediction
    # -------------------------------
    pred_class = int(model.predict(X)[0])
    pred_proba = float(model.predict_proba(X)[0][1])

    # -------------------------------
    # 6️⃣ SHAP explanation
    # -------------------------------
    try:
        shap_values = explainer.shap_values(X)
        shap_row = shap_values[0]
    except Exception:
        # shap may fail for some models or versions; fall back to zeros
        shap_row = [0.0] * len(feature_names)

    pairs = zip(feature_names, shap_row)
    top_five = sorted(pairs, key=lambda x: abs(x[1]), reverse=True)[:5]
    shap_output = [{"feature": f, "impact": float(v)} for f, v in top_five]

    # -------------------------------
    # 7️⃣ GPT Summary
    # -------------------------------
    insight_text = generate_llm_insight(patient, shap_output, pred_class, pred_proba)

    # -------------------------------
    # 8️⃣ Final Response
    # -------------------------------
    return {
        "patient_data": patient,
        "prediction": pred_class,
        "probability": pred_proba,
        "top_factors": shap_output,
        "summary": insight_text,
        "bullets": [],
    }



# from pathlib import Path
# import json

# BASE_DIR = Path(__file__).resolve().parent

# with open(BASE_DIR / "model_metrics.json") as f:
#     MODEL_METRICS = json.load(f)


@router.get("/model-metrics")
def get_model_metrics():
    try:
        return {"accuracy": float(MODEL_METRICS.get("accuracy"))}
    except:
        return {"accuracy": None}







# ---------------------------------------------------------
# NEW ENDPOINT: Get patients who visited X times
# ---------------------------------------------------------
@router.get("/patients/by-visits")
async def get_patients_by_visits(count: int):
    """
    Returns patients from CSV who have visited exactly `count` times.
    """

    try:
        filtered = dataset_df[dataset_df["patients_visited"] == count]

        result = [
            {
                "patient_id": row["patient_id"],
                "patient_name": row["Patients_Name"],
                "visit_count": int(row["patients_visited"])
            }
            for _, row in filtered.iterrows()
        ]

        return {"requested_count": count, "patients": result}

    except Exception as e:
        print("Visit count error:", e)
        raise HTTPException(500, "Failed to fetch visit counts")












@router.get("/patients/search")
async def search_patients(q: str, limit: int = 10):
    """
    Smart patient search:
    - If q is a number → search by visit count
    - If q is text → search by patient name
    """

    if dataset_df.empty:
        raise HTTPException(500, "Dataset not loaded")

    q = q.strip()

    try:
        # -------------------------------
        # Case 1: Visit count search
        # -------------------------------
        if q.isdigit():
            visit_count = int(q)

            filtered = dataset_df[
                dataset_df["patients_visited"] == visit_count
            ]

        # -------------------------------
        # Case 2: Name search
        # -------------------------------
        else:
            filtered = dataset_df[
                dataset_df["Patients_Name"]
                .astype(str)
                .str.lower()
                .str.contains(q.lower())
            ]

        # -------------------------------
        # Format for dropdown
        # -------------------------------
        results = [
            {
                "patient_id": row["patient_id"],
                "patient_name": row["Patients_Name"],
                "patients_visited": int(row["patients_visited"]),
            }
            for _, row in filtered.head(limit).iterrows()
        ]

        return results

    except Exception as e:
        print("Patient search error:", e)
        raise HTTPException(500, "Failed to search patients")



































