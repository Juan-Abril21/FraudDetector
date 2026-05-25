from fastapi import FastAPI
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware

import pandas as pd
import numpy as np
import joblib

# =========================
# LOAD MODEL AND SCALER
# =========================

model = joblib.load("fraud_model.pkl")
amount_scaler = joblib.load("amount_scaler.pkl")
time_scaler = joblib.load("time_scaler.pkl")

# =========================
# FASTAPI APP
# =========================

app = FastAPI(
    title="Fraud Detection API",
    description="Credit Card Fraud Detection System",
    version="1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# INPUT MODEL
# =========================

class Transaction(BaseModel):

    Time: float
    V1: float
    V2: float
    V3: float
    V4: float
    V5: float
    V6: float
    V7: float
    V8: float
    V9: float
    V10: float
    V11: float
    V12: float
    V13: float
    V14: float
    V15: float
    V16: float
    V17: float
    V18: float
    V19: float
    V20: float
    V21: float
    V22: float
    V23: float
    V24: float
    V25: float
    V26: float
    V27: float
    V28: float
    Amount: float

# =========================
# ROOT
# =========================

@app.get("/")
def home():
    return {
        "message": "Fraud Detection API Running"
    }

# =========================
# PREDICT ENDPOINT
# =========================

@app.post("/predict")
def predict(transaction: Transaction):

    # Convert to dataframe
    data = pd.DataFrame([transaction.dict()])

    # Scale Amount and Time
    data["Amount"] = amount_scaler.transform(data[["Amount"]])
    data["Time"] = time_scaler.transform(data[["Time"]])

    # Predict probability
    probability = model.predict_proba(data)[0][1]

    # Decision logic
    if probability < 0.30:
        decision = "APPROVED"

    elif probability < 0.70:
        decision = "REVIEW"

    else:
        decision = "BLOCKED"

    return {
        "risk_score": round(float(probability), 4),
        "decision": decision
    }