import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib
import os

def train_model():
    print("Loading dataset...")
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(base_dir, 'data', 'dataset.csv')
    
    if not os.path.exists(data_path):
        print(f"Error: {data_path} not found.")
        return

    df = pd.read_csv(data_path)
    
    # 1. Veriyi Ön İşle
    # Veri setinde 'Disease' ve 'Symptom_1'den 'Symptom_17'ye kadar sütunlar var
    # Bunu, sütunların benzersiz semptomlar olduğu ikili bir matrise dönüştürmemiz gerekiyor
    
    print("Preprocessing data...")
    
    # Tüm semptom sütunlarını al
    symptom_cols = [col for col in df.columns if 'Symptom' in col]
    
    # Semptom metinlerini temizle (boşlukları kaldır, alt çizgileri değiştir)
    for col in symptom_cols:
        df[col] = df[col].str.strip().str.replace('_', ' ')
    
    # Tüm benzersiz semptomları al
    # Tüm semptomların uzun bir listesini almak için veri çerçevesini dönüştürüyoruz (melt)
    melted = df.melt(id_vars=['Disease'], value_vars=symptom_cols).dropna()
    unique_symptoms = sorted(melted['value'].unique())
    
    print(f"Found {len(unique_symptoms)} unique symptoms.")
    
    # İkili bir matris oluştur
    # Sıfırlarla dolu bir veri çerçevesi başlat
    X = pd.DataFrame(0, index=df.index, columns=unique_symptoms)
    
    # Matrisi doldur
    # Bu çok büyük veri setleri için yavaş olabilir, ancak bu boyut için uygundur
    for col in symptom_cols:
        # Her semptom sütunu için, X'teki karşılık gelen semptom sütununu 1 yap
        # get_dummies mantığını kullanıyoruz ancak satır bazında veya eşleme yoluyla uyguluyoruz
        # Daha hızlı bir yol:
        for idx, row in df.iterrows():
            symptoms = row[symptom_cols].values
            # NaN ve None değerlerini filtrele
            valid_symptoms = [s for s in symptoms if pd.notna(s)]
            X.loc[idx, valid_symptoms] = 1

    y = df['Disease']
    
    # 2. Modeli Eğit
    print("Training RandomForest Classifier...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)
    
    y_pred = clf.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    print(f"Model Accuracy: {accuracy * 100:.2f}%")
    
    # 3. Modeli ve Meta Verileri Kaydet
    models_dir = os.path.join(base_dir, 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    model_path = os.path.join(models_dir, 'disease_model.joblib')
    symptoms_path = os.path.join(models_dir, 'symptoms_list.joblib')
    
    joblib.dump(clf, model_path)
    joblib.dump(unique_symptoms, symptoms_path)
    
    print(f"Model saved to {model_path}")
    print(f"Symptoms list saved to {symptoms_path}")

if __name__ == "__main__":
    train_model()
