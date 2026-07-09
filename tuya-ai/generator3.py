from pymongo import MongoClient
import datetime
import random
import math

client = MongoClient("mongodb://localhost:27017/")
db = client["tuya_iot"]
collection = db["temperature_history"]

# Lista wszystkich ID czujników
device_ids = [
    "bf664631bc3ce505d2axeg",
    "bf50c7454f57e344780une",
    "bf1e247b41d357045exxdf",
    "bf725076682667c134lh1i",
    "bf14fc87a023060ca3puav"
]

print("Czyszczenie starej historii dla podanych czujników...")
# Usuwa dokumenty dla wszystkich urządzeń z listy naraz
collection.delete_many({"deviceId": {"$in": device_ids}})

now = datetime.datetime.now()
days_total = 365
points_total = days_total * 24 * 2 # 17520 punktów na jedno urządzenie

# Generowanie unikalnych cech dla każdego pomieszczenia/czujnika
device_configs = {}
for d_id in device_ids:
    device_configs[d_id] = {
        "base_temp_offset": random.uniform(-2.5, 2.5), # Przesunięcie temperatury (np. +/- 2 stopnie w stosunku do reszty domu)
        "base_hum_offset": random.uniform(-10.0, 15.0), # Różnica w wilgotności (np. łazienka vs salon)
        "battery_start": random.uniform(20.0, 100.0), # Baterie startują z różnego poziomu w przeszłości
        "battery_drop_rate": (98.0 / 8760.0) * random.uniform(0.8, 1.2), # Lekkie różnice w drenażu baterii
        "vent_chance_modifier": random.uniform(0.6, 1.4) # Niektóre pokoje są wietrzone częściej
    }

total_records = 0

print(f"Generowanie 365 dni historii dla {len(device_ids)} czujników...")

# Przetwarzamy każde urządzenie po kolei
for d_id in device_ids:
    print(f"Przetwarzanie czujnika: {d_id}...")
    records = []
    config = device_configs[d_id]

    # Inicjalizacja stanu początkowego dla konkretnego czujnika
    current_temp = 21.0 + config["base_temp_offset"]
    battery_level = config["battery_start"]

    for i in range(points_total, -1, -1):
        past_time = now - datetime.timedelta(minutes=30 * i)
        hour = past_time.hour
        day_of_year = past_time.timetuple().tm_yday

        # --- 0. PORY ROKU (Roczny cykl) ---
        season_modifier = -math.cos((day_of_year - 20) / 365.0 * 2.0 * math.pi) * 2.0
        # Baza z uwzględnieniem offsetu konkretnego pokoju
        base_temp = 21.0 + season_modifier + config["base_temp_offset"]

        # --- 1. MAKRO-POGODA (Fronty atmosferyczne) ---
        weather_front = math.sin(day_of_year / 10.0 * math.pi * 2) * 1.5

        # --- 2. CYKL DOBOWY ---
        daily_cycle = math.sin((hour - 9) * (math.pi / 12)) * 1.0

        target_temp = base_temp + weather_front + daily_cycle

        # --- BATERIA ---
        battery_level -= config["battery_drop_rate"]
        if battery_level <= 2.0:
            battery_level = 100.0

            # --- 3. SYMULACJA WIETRZENIA ---
        is_ventilation = False
        if (hour == 7 or hour == 18) and past_time.minute == 0:
            # Prawdopodobieństwo modyfikowane przez cechy pokoju
            if random.random() > (0.7 / config["vent_chance_modifier"]):
                is_ventilation = True

        if is_ventilation:
            if season_modifier < 0:
                current_temp -= random.uniform(1.5, 3.0)
                hum_modifier = -15.0
            else:
                current_temp -= random.uniform(0.2, 1.0)
                hum_modifier = -5.0
        else:
            current_temp += (target_temp - current_temp) * 0.3
            current_temp += random.uniform(-0.15, 0.15)
            hum_modifier = 0

        # --- WILGOTNOŚĆ ---
        season_hum_modifier = season_modifier * 4.0
        # Wilgotność bazowa z offsetem pokoju
        base_hum = 45.0 - (weather_front * 3.0) + (daily_cycle * 2.0) + config["base_hum_offset"]

        current_hum = base_hum + hum_modifier + season_hum_modifier + random.uniform(-2.0, 2.0)
        current_hum = max(20.0, current_hum)
        current_hum = min(80.0, current_hum)

        records.append({
            "deviceId": d_id,
            "temperature": round(current_temp, 1),
            "humidity": round(current_hum, 1),
            "battery": int(battery_level),
            "timestamp": past_time,
            "_class": "com.tuya.open.spring.boot.sample.ability.model.TemperatureRecord"
        })

    # Zapis do bazy całego roku dla danego czujnika
    collection.insert_many(records)
    total_records += len(records)

print(f"SUKCES! Wgrano łącznie {total_records} punktów ze wszystkich czujników do bazy tuya_iot.")