from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import pandas as pd
from prophet import Prophet

app = FastAPI(title="Tuya Smart Prophet AI")

class HistoryData(BaseModel):
    timestamps: list[str]
    temperatures: list[float]
    humidities: list[float]
    predict_hours: int = 12

@app.post("/predict")
def predict_climate(data: HistoryData):
    if len(data.temperatures) < 24 or len(data.humidities) < 24:
        raise HTTPException(status_code=400, detail="Zbyt mało danych. Zostaw serwer włączony na minimum dobę.")

    df_main = pd.DataFrame({
        'ds': pd.to_datetime(data.timestamps),
        'temp': data.temperatures,
        'hum': data.humidities
    })

    df_main['ds'] = df_main['ds'].dt.tz_localize(None)
    df_main = df_main.sort_values(by='ds').reset_index(drop=True)

    df_temp = pd.DataFrame({'ds': df_main['ds'], 'y': df_main['temp']})
    df_hum = pd.DataFrame({'ds': df_main['ds'], 'y': df_main['hum']})

    model_temp = Prophet(yearly_seasonality=False, weekly_seasonality=False, daily_seasonality=True, changepoint_prior_scale=0.05)
    model_temp.fit(df_temp)

    model_hum = Prophet(yearly_seasonality=False, weekly_seasonality=False, daily_seasonality=True, changepoint_prior_scale=0.05)
    model_hum.fit(df_hum)
    future = model_temp.make_future_dataframe(periods=data.predict_hours, freq='h')
    forecast_temp = model_temp.predict(future)
    forecast_hum = model_hum.predict(future)

    future_predictions_temp = forecast_temp.tail(data.predict_hours)
    future_predictions_hum = forecast_hum.tail(data.predict_hours)

    predictions = []

    last_time = df_main['ds'].iloc[-1]
    last_temp = df_main['temp'].iloc[-1]
    last_hum = df_main['hum'].iloc[-1]

    predictions.append({
        "timestamp": last_time.isoformat(),
        "predicted_temperature": round(last_temp, 1),
        "predicted_humidity": round(last_hum, 1)
    })

    for (index, row_temp), (_, row_hum) in zip(future_predictions_temp.iterrows(), future_predictions_hum.iterrows()):
        predictions.append({
            "timestamp": row_temp['ds'].isoformat(),
            "predicted_temperature": round(row_temp['yhat'], 1),
            "predicted_humidity": round(row_hum['yhat'], 1)
        })

    return {"predictions": predictions}
