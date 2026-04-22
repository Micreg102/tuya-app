from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
from sklearn.linear_model import LinearRegression
import numpy as np
from datetime import timedelta

app = FastAPI(title="Tuya AI Predictor")

# Format danych wejściowych
class HistoryData(BaseModel):
    timestamps: list[str]
    temperatures: list[float]
    predict_hours: int = 3 # Domyślnie przewidujemy 3 godziny do przodu

@app.post("/predict")
def predict_temperature(data: HistoryData):
    if len(data.temperatures) < 5:
        raise HTTPException(status_code=400, detail="Zbyt mało danych do predykcji (minimum 5 punktów).")

    # 1. Konwersja danych do DataFrame (formatu dla AI)
    df = pd.DataFrame({
        'ds': pd.to_datetime(data.timestamps),
        'y': data.temperatures
    })

    # 2. Przygotowanie danych (zamiana czasu na liczby - sekundy od startu)
    df['ds_numeric'] = (df['ds'] - df['ds'].min()).dt.total_seconds()

    X = df[['ds_numeric']].values
    y = df['y'].values

    # 3. Trenowanie Modelu (Machine Learning)
    model = LinearRegression()
    model.fit(X, y)

    # 4. Przewidywanie Przyszłości
    last_time = df['ds'].max()
    last_time_numeric = df['ds_numeric'].max()

    predictions = []
    # Generujemy punkty na kolejne X godzin (co 1 godzinę)
    for i in range(1, data.predict_hours + 1):
        future_seconds = last_time_numeric + (i * 3600) # + 1 godzina w sekundach
        future_temp = model.predict([[future_seconds]])[0]
        future_time = last_time + timedelta(hours=i)

        predictions.append({
            "timestamp": future_time.isoformat(),
            "predicted_temperature": round(future_temp, 1)
        })

    return {"predictions": predictions}