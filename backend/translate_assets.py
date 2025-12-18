import pandas as pd
import json
import os
import time
from googletrans import Translator

def translate_assets():
    translator = Translator()
    # Yolu bu betiğe göre ayarla
    base_dir = os.path.dirname(os.path.abspath(__file__))
    data_dir = os.path.join(base_dir, 'data')
    
    print("--- Starting Translation Process ---")

    # 1. Semptom Açıklamalarını Çevir
    desc_path = os.path.join(data_dir, 'symptom_Description.csv')
    if os.path.exists(desc_path):
        print("Translating Descriptions...")
        df_desc = pd.read_csv(desc_path)
        
        # Güvenli çeviri için yardımcı fonksiyon
        def safe_translate(text):
            try:
                time.sleep(0.2) # Hız sınırından kaçın
                if not isinstance(text, str): return text
                return translator.translate(text, src='en', dest='tr').text
            except Exception as e:
                print(f"Error translating {text}: {e}")
                return text

        df_desc['Description'] = df_desc['Description'].apply(safe_translate)
        
        output_desc = os.path.join(data_dir, 'symptom_Description_TR.csv')
        df_desc.to_csv(output_desc, index=False)
        print(f"Saved: {output_desc}")

    # 2. Önlemleri Çevir
    prec_path = os.path.join(data_dir, 'symptom_precaution.csv')
    if os.path.exists(prec_path):
        print("Translating Precautions...")
        df_prec = pd.read_csv(prec_path)
        
        cols_to_translate = ['Precaution_1', 'Precaution_2', 'Precaution_3', 'Precaution_4']
        
        for col in cols_to_translate:
            print(f"Processing column: {col}")
            # Hataları önlemek için önce NaN'ları doldur
            df_prec[col] = df_prec[col].fillna("")
            df_prec[col] = df_prec[col].apply(lambda x: safe_translate(x) if x != "" else "")

        output_prec = os.path.join(data_dir, 'symptom_precaution_TR.csv')
        df_prec.to_csv(output_prec, index=False)
        print(f"Saved: {output_prec}")

    # 3. Semptom Haritası Oluştur (İngilizce -> Türkçe)
    dataset_path = os.path.join(data_dir, 'dataset.csv')
    if os.path.exists(dataset_path):
        print("Creating Symptom Map...")
        df = pd.read_csv(dataset_path)
        
        # Symptom_1'den Symptom_17'ye kadar olan sütunlardan tüm benzersiz semptomları al
        symptom_cols = [col for col in df.columns if 'Symptom' in col]
        
        # Anahtarları eşleştirmek için semptomları tam olarak model eğitiminde yapıldığı gibi temizlememiz gerekiyor
        # train_model.py içinde: df[col] = df[col].str.strip().str.replace('_', ' ')
        # Ancak burada haritanın *modelin* özellik adlarına göre anahtarlanmasını istiyoruz.
        # Model özellikleri symptoms_list.joblib içinde saklanır, ancak bunları burada da türetebiliriz.
        
        # Önce sadece ham benzersiz değerleri alalım
        all_symptoms = pd.unique(df[symptom_cols].values.ravel())
        unique_symptoms = [str(s).strip() for s in all_symptoms if pd.notna(s)]
        unique_symptoms = sorted(list(set(unique_symptoms))) 
        
        symptom_map = {}
        
        print(f"Translating {len(unique_symptoms)} unique symptoms...")
        for sym in unique_symptoms:
            # Model alt çizgi yerine boşluk kullanıyor
            model_key = sym.replace('_', ' ')
            
            # Translate
            tr_text = safe_translate(model_key)
            
            # Daha iyi kullanıcı arayüzü için baş harfleri büyüt
            symptom_map[model_key] = tr_text.title()
            
        map_path = os.path.join(data_dir, 'symptoms_tr_map.json')
        with open(map_path, 'w', encoding='utf-8') as f:
            json.dump(symptom_map, f, ensure_ascii=False, indent=4)
        print(f"Saved: {map_path}")

    # 4. Hastalık Haritası Oluştur (İngilizce -> Türkçe)
    if os.path.exists(desc_path):
        print("Creating Disease Map...")
        # Daha önce yüklediğimiz açıklama veri çerçevesini kullanabilir veya yeniden yükleyebiliriz
        df_desc = pd.read_csv(desc_path)
        unique_diseases = df_desc['Disease'].unique()
        
        disease_map = {}
        print(f"Translating {len(unique_diseases)} diseases...")
        
        for disease in unique_diseases:
            disease = disease.strip()
            tr_text = safe_translate(disease)
            disease_map[disease] = tr_text.title()
            
        disease_map_path = os.path.join(data_dir, 'diseases_tr_map.json')
        with open(disease_map_path, 'w', encoding='utf-8') as f:
            json.dump(disease_map, f, ensure_ascii=False, indent=4)
        print(f"Saved: {disease_map_path}")

    print("--- Translation Complete ---")

if __name__ == "__main__":
    translate_assets()
