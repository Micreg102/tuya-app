from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
from prophet import Prophet

app = FastAPI(title="Tuya Smart Prophet AI")

class HistoryData(BaseModel):
    timestamps: list[str]
    temperatures: list[float]
    predict_hours: int = 12

@app.post("/predict")
def predict_temperature(data: HistoryData):
    # Model sezonowy potrzebuje więcej danych do znalezienia cyklu (minimum np. z jednego dnia)
    if len(data.temperatures) < 24:
        raise HTTPException(status_code=400, detail="Zbyt mało danych dla modelu sezonowego. Zostaw serwer włączony na minimum dobę.")

    # 1. Prophet wymaga kolumn o sztywnych nazwach: 'ds' (daty) i 'y' (wartości)
    df = pd.DataFrame({
        'ds': pd.to_datetime(data.timestamps),
        'y': data.temperatures
    })

    # KRYTYCZNE: Prophet nie toleruje stref czasowych, musimy je usunąć z danych z Javy
    df['ds'] = df['ds'].dt.tz_localize(None)
    df = df.sort_values(by='ds').reset_index(drop=True)
    # 2. Konfiguracja "Mądrego" Modelu
    # Wymuszamy szukanie cyklu dobowego. changepoint_prior_scale=0.05 pozwala mu
    # elastycznie reagować na nagłe otwarcia okien lub włączenie kaloryfera.
    model = Prophet(
        yearly_seasonality=False,
        weekly_seasonality=False,
        daily_seasonality=True,
        changepoint_prior_scale=0.05
    )

    # 3. Trening na podstawie danych z MongoDB
    model.fit(df)

    # 4. Prosimy AI o wygenerowanie pustej osi czasu na kolejne 12 godzin (freq='h')
    future = model.make_future_dataframe(periods=data.predict_hours, freq='h')

    # 5. Właściwa predykcja - model wypełnia pustą oś czasu
    forecast = model.predict(future)

    # 6. Prophet zwraca całą historię + predykcję. My wyciągamy tylko te X nowych godzin z końca.
    future_predictions = forecast.tail(data.predict_hours)

    predictions = []

    # --- NOWE: "Sklejamy" wykres (Punkt zerowy) ---
    # Bierzemy ostatni czas i temperaturę z danych historycznych
    last_time = df['ds'].iloc[-1]
    last_temp = df['y'].iloc[-1]

    predictions.append({
        "timestamp": last_time.isoformat(),
        "predicted_temperature": round(last_temp, 1) # Używamy RZECZYWISTEJ wartości z czujnika!
    })
    # ----------------------------------------------

    # Dodajemy właściwą predykcję z Propheta
    for index, row in future_predictions.iterrows():
        predictions.append({
            # Konwertujemy czas z powrotem do standardu ISO dla Reacta
            "timestamp": row['ds'].isoformat(),
            "predicted_temperature": round(row['yhat'], 1) # 'yhat' to matematyczna nazwa predykcji
        })

    return {"predictions": predictions}