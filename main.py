from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

import joblib
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent

ml_model = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    ml_model["model"] = joblib.load(BASE_DIR / "credit_risk_model.pkl")
    ml_model["threshold"] = float(joblib.load(BASE_DIR / "best_threshold.pkl"))
    yield
    ml_model.clear()


app = FastAPI(title="Credit Risk API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class LoanApplication(BaseModel):
    person_age: int = Field(..., ge=18, le=100)
    person_income: float = Field(..., gt=0)
    person_home_ownership: Literal["RENT", "OWN", "MORTGAGE", "OTHER"]
    person_emp_length: float = Field(..., ge=0, le=100)
    loan_intent: Literal[
        "PERSONAL", "EDUCATION", "MEDICAL", "VENTURE",
        "HOMEIMPROVEMENT", "DEBTCONSOLIDATION",
    ]
    loan_grade: Literal["A", "B", "C", "D", "E", "F", "G"]
    loan_amnt: float = Field(..., gt=0)
    loan_int_rate: float = Field(..., gt=0)
    loan_percent_income: float = Field(..., ge=0)
    cb_person_default_on_file: Literal["Y", "N"]
    cb_person_cred_hist_length: int = Field(..., ge=0)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict")
def predict(data: LoanApplication):
    input_df = pd.DataFrame([data.model_dump()])

    probability = float(ml_model["model"].predict_proba(input_df)[:, 1][0])
    threshold = ml_model["threshold"]
    prediction = int(probability >= threshold)

    return {
        "default_probability": probability,
        "default_prediction": prediction,
        "threshold": threshold,
        "Result": "High Risk" if prediction == 1 else "Low Risk",
    }


# Keep this LAST so it doesn't swallow /predict
app.mount("/", StaticFiles(directory=BASE_DIR / "static", html=True), name="static")