import pandas as pd
import numpy as np
import os

def preprocess_data():
    # Dosya yollarını tanımla
    # Betiğin backend dizininden çalıştırıldığı veya yolların buna göre olduğu varsayılıyor
    base_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(base_dir, 'data', 'dataset.csv')
    output_path = os.path.join(base_dir, 'data', 'training_data_processed.csv')

    # Dosyanın var olup olmadığını kontrol et
    if not os.path.exists(dataset_path):
        print(f"Error: File not found at {dataset_path}")
        return

    print("Loading dataset...")
    df = pd.read_csv(dataset_path)
    print(f"Original dataframe shape: {df.shape}")

    # Daha sonra doğru şekilde birleştirebilmek için açık bir row_id oluştur
    df['row_id'] = range(len(df))

    # Veri setinde 'Disease' ve 'Symptom_1'den 'Symptom_17'ye kadar sütunlar var
    
    # Tüm semptom sütunlarını al
    symptom_cols = [col for col in df.columns if 'Symptom' in col]
    
    print("Cleaning symptom names...")
    # Semptom metinlerini temizleme fonksiyonu
    def clean_symptom(x):
        if pd.isna(x):
            return x
        if isinstance(x, str):
            return x.replace('_', ' ').strip()
        return x

    # Temizlemeyi tüm semptom sütunlarına uygula
    for col in symptom_cols:
        df[col] = df[col].apply(clean_symptom)

    print("Extracting unique symptoms...")
    # Tüm veri çerçevesinden benzersiz semptomları al (Hastalık sütunu hariç)
    all_symptoms = pd.unique(df[symptom_cols].values.ravel())
    unique_symptoms = [s for s in all_symptoms if pd.notna(s)]
    unique_symptoms.sort()
    print(f"Found {len(unique_symptoms)} unique symptoms.")

    print("Creating binary dataframe...")
    
    # 1. Uzun formata dönüştür (Melt)
    # Hangi hastanın hangi semptoma sahip olduğunu izlemek için row_id'yi tutuyoruz
    df_melted = df.melt(id_vars=['row_id'], value_vars=symptom_cols, value_name='Symptom')
    
    # 2. Semptomun NaN olduğu satırları at
    df_melted = df_melted.dropna(subset=['Symptom'])
    
    # 3. İkili matrisi oluşturmak için crosstab kullan
    # indeks=row_id, sütunlar=Symptom
    df_binary = pd.crosstab(df_melted['row_id'], df_melted['Symptom'])
    
    # İkili olduğundan emin ol
    df_binary = (df_binary > 0).astype(int)
    
    print(f"Binary dataframe shape: {df_binary.shape}")
    print(f"df row_id unique count: {df['row_id'].nunique()}")
    print(f"df_binary index unique count: {df_binary.index.nunique()}")
    
    # 4. Orijinal veri çerçevesinden Hastalık sütunu ile birleştir
    # Doğru hizalamayı sağlamak için row_id üzerinde birleştiriyoruz
    final_df = pd.merge(df[['row_id', 'Disease']], df_binary, on='row_id', how='left')
    
    # NaN'ları 0 ile doldur (semptomu olmayan hastalar için, varsa)
    final_df = final_df.fillna(0)
    
    # Artık gerekli olmadığı için row_id'yi at
    final_df = final_df.drop('row_id', axis=1)
    
    print("Saving processed data...")
    final_df.to_csv(output_path, index=False)
    
    print(f"Successfully saved to {output_path}")
    print(f"Shape of new dataframe: {final_df.shape}")
    print("First 5 rows:")
    print(final_df.head())

if __name__ == "__main__":
    preprocess_data()
