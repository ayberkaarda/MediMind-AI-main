def clean_symptom(symptom):
    if isinstance(symptom, str):
        return symptom.replace('_', ' ').strip()
    return symptom
