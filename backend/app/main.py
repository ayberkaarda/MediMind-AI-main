from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
import numpy as np
import os
import json
from typing import List

app = FastAPI(title="MediMind AI API (Turkish)")

# CORS Yapılandırması
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global değişkenler
model = None
unique_symptoms = None
symptom_map = None
disease_map = None
description_df = None
precaution_df = None

class SymptomRequest(BaseModel):
    symptoms: List[str]

@app.on_event("startup")
def load_artifacts():
    global model, unique_symptoms, symptom_map, disease_map, description_df, precaution_df
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir = os.path.join(base_dir, 'models')
    data_dir = os.path.join(base_dir, 'data')
    
    # 1. Modeli ve Semptom Listesini Yükle
    try:
        model = joblib.load(os.path.join(models_dir, 'disease_model.joblib'))
        unique_symptoms = joblib.load(os.path.join(models_dir, 'symptoms_list.joblib'))
        print("Model and symptoms loaded successfully.")
    except Exception as e:
        print(f"Error loading model: {e}")

    # 2. Semptom Haritasını Yükle (İngilizce -> Türkçe)
    try:
        map_path = os.path.join(data_dir, 'symptoms_tr_map.json')
        with open(map_path, 'r', encoding='utf-8') as f:
            symptom_map = json.load(f)
    except Exception as e:
        print(f"Error loading symptom map: {e}")
        symptom_map = {}

    # 3. Hastalık Haritasını Yükle (İngilizce -> Türkçe)
    try:
        d_map_path = os.path.join(data_dir, 'diseases_tr_map.json')
        with open(d_map_path, 'r', encoding='utf-8') as f:
            disease_map = json.load(f)
    except Exception as e:
        print(f"Error loading disease map: {e}")
        disease_map = {}

    # 4. Türkçe Açıklamaları Yükle
    try:
        desc_path = os.path.join(data_dir, 'symptom_Description_TR.csv')
        description_df = pd.read_csv(desc_path)
        description_df['Disease'] = description_df['Disease'].str.strip()
    except Exception as e:
        print(f"Error loading descriptions: {e}")

    # 5. Türkçe Önlemleri Yükle
    try:
        prec_path = os.path.join(data_dir, 'symptom_precaution_TR.csv')
        precaution_df = pd.read_csv(prec_path)
        precaution_df['Disease'] = precaution_df['Disease'].str.strip()
    except Exception as e:
        print(f"Error loading precautions: {e}")

@app.get("/")
def read_root():
    return {"message": "MediMind AI API is running (Turkish Mode)"}

@app.get("/symptoms")
def get_symptoms():
    if unique_symptoms is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    # Format: [{ "label": "Karın Ağrısı", "value": "stomach_pain" }, ...]
    formatted_symptoms = []
    for sym in unique_symptoms:
        # Haritadan Türkçe etiketi al, yoksa İngilizce başlık durumuna dön
        label = symptom_map.get(sym, sym.replace('_', ' ').title())
        formatted_symptoms.append({
            "label": label,
            "value": sym
        })
    
    # Daha iyi kullanıcı deneyimi için Türkçe etikete göre sırala
    formatted_symptoms.sort(key=lambda x: x['label'])
    
    return {"symptoms": formatted_symptoms} # Frontend { symptoms: [...] } bekliyor

@app.post("/predict")
def predict_disease(request: SymptomRequest):
    if model is None or unique_symptoms is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    user_symptoms = request.symptoms
    
    # Eğitim özellik adlarıyla eşleşmesi için giriş vektörünü DataFrame olarak oluştur
    input_vector = pd.DataFrame(0, index=[0], columns=unique_symptoms)
    
    # Mevcut semptomlar için 1 ayarla
    for symptom in user_symptoms:
        if symptom in unique_symptoms:
            input_vector.loc[0, symptom] = 1
            
    # Predict
    prediction = model.predict(input_vector)[0]
    probabilities = model.predict_proba(input_vector)[0]
    
    # En iyi 5 tahmini al
    class_probs = list(zip(model.classes_, probabilities))
    # Olasılığa göre azalan sırada sırala
    class_probs.sort(key=lambda x: x[1], reverse=True)
    top_predictions = class_probs[:5]
    
    # Frontend için en iyi tahminleri biçimlendir
    top_predictions_formatted = []
    for disease, prob in top_predictions:
        if prob > 0.01: # Sadece %1'den büyükse dahil et
            # Hastalık adını çevir
            tr_name = disease_map.get(disease, disease) if disease_map else disease
            top_predictions_formatted.append({
                "name": tr_name,
                "value": float(prob)
            })

    # Güven skorunu al
    class_index = list(model.classes_).index(prediction)
    confidence = float(probabilities[class_index])
    
    # Türkçe Açıklamayı Al
    description = "Tanım bulunamadı."
    if description_df is not None:
        desc_row = description_df[description_df['Disease'] == prediction]
        if not desc_row.empty:
            description = desc_row.iloc[0]['Description']
            
    # Türkçe Önlemleri Al
    precautions = []
    if precaution_df is not None:
        prec_row = precaution_df[precaution_df['Disease'] == prediction]
        if not prec_row.empty:
            p_cols = [col for col in prec_row.columns if 'Precaution' in col]
            precautions = [prec_row.iloc[0][col] for col in p_cols if pd.notna(prec_row.iloc[0][col]) and str(prec_row.iloc[0][col]).strip() != ""]
            # Metinleri temizle
            precautions = [str(p).strip().capitalize() for p in precautions]

    # Ana tahmini çevir
    prediction_tr = disease_map.get(prediction, prediction) if disease_map else prediction

    return {
        "disease": prediction_tr, 
        "confidence": confidence,
        "description": description,
        "precautions": precautions,
        "top_predictions": top_predictions_formatted
    }
