import pandas as pd
import numpy as np
import os

def preprocess_data():
    # Define file paths
    dataset_path = os.path.join('dataset', 'dataset.csv')
    output_path = os.path.join('dataset', 'training_data_processed.csv')

    # Check if file exists
    if not os.path.exists(dataset_path):
        print(f"Error: File not found at {dataset_path}")
        return

    print("Loading dataset...")
    df = pd.read_csv(dataset_path)
    print(f"Original dataframe shape: {df.shape}")

    # Create an explicit row_id to ensure we can merge back correctly later
    df['row_id'] = range(len(df))

    # The dataset has 'Disease' and 'Symptom_1' to 'Symptom_17'
    
    # Get all symptom columns
    symptom_cols = [col for col in df.columns if 'Symptom' in col]
    
    print("Cleaning symptom names...")
    # Function to clean symptom strings
    def clean_symptom(x):
        if pd.isna(x):
            return x
        if isinstance(x, str):
            return x.replace('_', ' ').strip()
        return x

    # Apply cleaning to all symptom columns
    for col in symptom_cols:
        df[col] = df[col].apply(clean_symptom)

    print("Extracting unique symptoms...")
    # Get all unique symptoms from the entire dataframe (excluding Disease column)
    all_symptoms = pd.unique(df[symptom_cols].values.ravel())
    unique_symptoms = [s for s in all_symptoms if pd.notna(s)]
    unique_symptoms.sort()
    print(f"Found {len(unique_symptoms)} unique symptoms.")

    print("Creating binary dataframe...")
    
    # 1. Melt to long format
    # We keep row_id to track which patient has which symptom
    df_melted = df.melt(id_vars=['row_id'], value_vars=symptom_cols, value_name='Symptom')
    
    # 2. Drop rows where Symptom is NaN
    df_melted = df_melted.dropna(subset=['Symptom'])
    
    # 3. Use crosstab to create the binary matrix
    # index=row_id, columns=Symptom
    df_binary = pd.crosstab(df_melted['row_id'], df_melted['Symptom'])
    
    # Ensure binary
    df_binary = (df_binary > 0).astype(int)
    
    print(f"Binary dataframe shape: {df_binary.shape}")
    print(f"df row_id unique count: {df['row_id'].nunique()}")
    print(f"df_binary index unique count: {df_binary.index.nunique()}")
    
    # 4. Merge with the Disease column from the original dataframe
    # We merge on row_id to ensure correct alignment
    final_df = pd.merge(df[['row_id', 'Disease']], df_binary, on='row_id', how='left')
    
    # Fill NaNs with 0 (for patients with no symptoms, if any)
    final_df = final_df.fillna(0)
    
    # Drop the row_id as it's no longer needed
    final_df = final_df.drop('row_id', axis=1)
    
    print("Saving processed data...")
    final_df.to_csv(output_path, index=False)
    
    print(f"Successfully saved to {output_path}")
    print(f"Shape of new dataframe: {final_df.shape}")
    print("First 5 rows:")
    print(final_df.head())

if __name__ == "__main__":
    preprocess_data()
