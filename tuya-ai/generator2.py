from pymongo import MongoClient
import datetime
import random
import math

client = MongoClient("mongodb://localhost:27017/")
db = client["tuya_iot"]
collection = db["temperature_history"]

# Nowe ID czujnika
device_id = "bf50c7454f57e344780une"

print("Czyszczenie starej historii dla tego czujnika...")
collection.delete_many({"deviceId": device_id})

now = datetime.datetime.now()
records = []

print("Generowanie 30 dni historii z uwzględnieniem frontów pogodowych...")

current_temp = 21.0
days_total = 30
points_total = days_total * 24 * 2 # Generujemy 1440 punktów (co 30 min przez 30 dni)

for i in range(points_total, -1, -1):
    past_time = now - datetime.timedelta(minutes=30 * i)
    hour = past_time.hour
    day_of_year = past_time.timetuple().tm_yday

    # --- 1. MAKRO-POGODA (Fronty atmosferyczne) ---
    # Fala o długości około 10 dni. Symuluje, że przez kilka dni z rzędu jest chłodniej (-1.5 st),
    # a potem przychodzi ocieplenie (+1.5 st), co rzutuje na temperaturę bazową w domu.
    weather_front = math.sin(day_of_year / 10.0 * math.pi * 2) * 1.5

    # --- 2. CYKL DOBOWY ---
    # Słońce i piec - w dzień cieplej, w nocy zimniej
    daily_cycle = math.sin((hour - 9) * (math.pi / 12)) * 1.5

    # Temperatura, do której dąży fizycznie salon w danej minucie:
    target_temp = 21.0 + weather_front + daily_cycle

    # --- 3. SYMULACJA WIETRZENIA ---
    is_ventilation = False
    if (hour == 7 or hour == 18) and past_time.minute == 0:
        if random.random() > 0.7: # 30% szans na przewietrzenie pokoju
            is_ventilation = True

    if is_ventilation:
        current_temp -= random.uniform(1.5, 2.5)
        hum_modifier = -15.0 # Wilgotność gwałtownie spada przy otwartym oknie zimą/wiosną
    else:
        # Płynne dążenie do temperatury docelowej
        current_temp += (target_temp - current_temp) * 0.3
        # Delikatny szum czujnika
        current_temp += random.uniform(-0.15, 0.15)
        hum_modifier = 0

    # --- WYliczanie wilgotności ---
    # Wilgotność również reaguje na fronty pogodowe
    base_hum = 45.0 - (weather_front * 3.0) + (daily_cycle * 2.0)
    current_hum = base_hum + hum_modifier + random.uniform(-2.0, 2.0)
    current_hum = max(20.0, current_hum) # Minimum 20%
    current_hum = min(80.0, current_hum) # Maksimum 80%

    records.append({
        "deviceId": device_id,
        "temperature": round(current_temp, 1),
        "humidity": round(current_hum, 1),
        "timestamp": past_time,
        "_class": "com.tuya.open.spring.boot.sample.ability.model.TemperatureRecord"
    })

collection.insert_many(records)
print(f"SUKCES! Wgrano {len(records)} punktów z całego miesiąca do bazy tuya_iot.")