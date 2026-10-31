"""FlyFlex-AI service: Sentence-BERT flight matching + XGBoost delay estimation.
Uses synthetic educational training data; never treat estimates as operational guarantees.
"""
from datetime import datetime
from pathlib import Path
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sentence_transformers import SentenceTransformer, util

app = FastAPI(title="FlyFlex-AI: SBERT + XGBoost", version="2.0.0")
ROOT = Path(__file__).parent
DELAY_MODEL = ROOT / "delay_xgboost.joblib"
EMBED_MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"
_encoder = None
_delay_model = None

class FlightCandidate(BaseModel):
    id: int
    airline: str = ""
    flight_number: str = ""
    origin: str
    destination: str
    departure_at: str
    fare: float = Field(ge=0)
    change_fee: float = Field(default=0, ge=0)
    flexibility_score: int = Field(default=3, ge=1, le=5)

class MatchRequest(BaseModel):
    preferences: str = Field(min_length=3, max_length=1000)
    flights: list[FlightCandidate] = Field(min_length=1, max_length=100)

class DelayRequest(BaseModel):
    route: str = Field(min_length=3, max_length=15)
    departure_hour: int = Field(ge=0, le=23)
    day_of_week: int = Field(ge=0, le=6)
    month: int = Field(ge=1, le=12)
    demand_level: int = Field(ge=1, le=3)
    weather_risk: int = Field(ge=0, le=2)

@app.get("/health")
def health():
    return {"status":"UP", "sbert":"lazy-loaded", "xgboost_model_available":DELAY_MODEL.exists(),
            "training_data":"synthetic demonstration data"}

def encoder():
    global _encoder
    if _encoder is None:
        _encoder = SentenceTransformer(EMBED_MODEL_NAME)
    return _encoder

def delay_model():
    global _delay_model
    if _delay_model is None:
        if not DELAY_MODEL.exists():
            raise HTTPException(status_code=503, detail="Train the XGBoost model with python train_model.py first")
        _delay_model = joblib.load(DELAY_MODEL)
    return _delay_model

@app.post("/match-flights")
def match_flights(req: MatchRequest):
    """Semantic match of natural-language passenger preferences against candidate details."""
    descriptions = [f"{f.airline} flight {f.flight_number}, route {f.origin} to {f.destination}, "
                   f"departure {f.departure_at}, fare {f.fare} rupees, change fee {f.change_fee}, "
                   f"flexibility {f.flexibility_score} out of 5" for f in req.flights]
    model = encoder()
    query_embedding = model.encode(req.preferences, convert_to_tensor=True)
    flight_embeddings = model.encode(descriptions, convert_to_tensor=True)
    scores = util.cos_sim(query_embedding, flight_embeddings)[0].cpu().tolist()
    ranked = sorted(zip(req.flights, scores), key=lambda x: x[1], reverse=True)
    return {"model":"Sentence-BERT all-MiniLM-L6-v2", "matches":[{"flight_id":f.id,"similarity":round(float(score),4),"description":desc}
            for (f,score),desc in zip(ranked,[next(d for x,d in zip(req.flights,descriptions) if x.id==f.id) for f,_ in ranked])],
            "warning":"Semantic similarity is a preference signal, not a safety, schedule or booking validation."}

@app.post("/predict-delay")
def predict_delay(req: DelayRequest):
    model=delay_model()
    row=pd.DataFrame([{"route":req.route.upper(),"departure_hour":req.departure_hour,"day_of_week":req.day_of_week,
                       "month":req.month,"demand_level":req.demand_level,"weather_risk":req.weather_risk}])
    minutes=max(0.0,float(model.predict(row)[0]))
    return {"model":"XGBoost", "predicted_delay_minutes":round(minutes,1), "is_estimate":True,
            "warning":"Trained on synthetic demo data. Not suitable for real operational or passenger decisions."}
