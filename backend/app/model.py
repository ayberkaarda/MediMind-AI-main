import joblib
import os

model = None

def load_model():
    global model
    model_path = os.path.join("backend", "models", "model.joblib")
    if os.path.exists(model_path):
        model = joblib.load(model_path)
    else:
        print("Model not found.")

def predict(features):
    if model:
        return model.predict([features])
    return None
