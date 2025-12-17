from fastapi import APIRouter
from sqlalchemy import text
from utils.db import engine   # existing DB connection
if engine is None:
    print("DB not available. GraphicalRepresentation will use fallback logic.")

router = APIRouter()

# backend/routes/graphs.py
import pandas as pd
from fastapi import APIRouter

router = APIRouter()

@router.get("/graph/visit-distribution")
def visit_distribution():
    df = pd.read_csv("healthvisionpro_dataset_1000.csv")

    # group by visit count
    dist = (
        df["visit_count"]
        .value_counts()
        .sort_index()
        .reset_index()
        .rename(columns={"index": "visits", "visit_count": "patients"})
    )

    return {
        "labels": dist["visits"].tolist(),
        "values": dist["patients"].tolist()
    }



# NEW API — Heart Disease Distribution
@router.get("/graph/heart-disease")
def heart_disease():
    df = pd.read_csv("healthvisionpro_dataset_1000.csv")
    counts = df["heart_disease"].value_counts().to_dict()
    return {
        "labels": ["No Heart Disease", "Heart Disease"],
        "values": [counts.get(0, 0), counts.get(1, 0)]
    }


# NEW API — Smoking Status Distribution
@router.get("/graph/smoking-status")
def smoking_status():
    df = pd.read_csv("healthvisionpro_dataset_1000.csv")
    counts = df["smoking_status"].value_counts().to_dict()
    return {
        "labels": ["Non-Smoker", "Smoker"],
        "values": [counts.get(0, 0), counts.get(1, 0)]
    }


# NEW API — Diabetes Distribution
@router.get("/graph/diabetes")
def diabetes():
    df = pd.read_csv("healthvisionpro_dataset_1000.csv")
    counts = df["diabetes"].value_counts().to_dict()
    return {
        "labels": ["No Diabetes", "Diabetic"],
        "values": [counts.get(0, 0), counts.get(1, 0)]
    }
