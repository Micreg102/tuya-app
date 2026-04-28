from pymongo import MongoClient
import datetime
import random
import math

client = MongoClient("mongodb://localhost:27017/")
db = client["tuya_iot"]
collection = db["temperature_history"]

# ID czujnika
device_id = "bf50c7454f57e344780une"

print("Czyszczenie starej historii dla tego czujnika...")
collection.delete_many({"deviceId": device_id})

now = datetime.datetime.now()
records = []

print("Generowanie 365 dni historii z uwzględnieniem pór roku i baterii...")

current_temp = 21.0
days_total = 365
points_total = days_total * 24 * 2 # Generujemy 17520 punktów (co 30 min przez 365 dni)

# --- KONFIGURACJA BATERII ---
battery_level = 100.0
# Spadek baterii na jeden pomiar.
# Chcemy stracić 98% (od 100 do 2) w ciągu pół roku (182.5 dnia)
# W ciągu 182.5 dnia mamy: 182.5 * 48 = 8760 pomiarów
battery_drop_per_point = 98.0 / 8760.0

for i in range(points_total, -1, -1):
    past_time = now - datetime.timedelta(minutes=30 * i)
    hour = past_time.hour
    day_of_year = past_time.timetuple().tm_yday

    # --- 0. PORY ROKU (Roczny cykl) ---
    # Funkcja cosinus, przesunięta tak, by najchłodniej było zimą (styczeń), a najcieplej latem (lipiec).
    # Wpływa na bazową temperaturę w domu (+/- 2 stopnie) w ciągu roku.
    season_modifier = -math.cos((day_of_year - 20) / 365.0 * 2.0 * math.pi) * 2.0
    base_temp = 21.0 + season_modifier

    # --- 1. MAKRO-POGODA (Fronty atmosferyczne) ---
    # Fale kilkudniowych ociepleń/ochłodzeń
    weather_front = math.sin(day_of_year / 10.0 * math.pi * 2) * 1.5

    # --- 2. CYKL DOBOWY ---
    # W dzień od słońca cieplej, w nocy chłodniej
    daily_cycle = math.sin((hour - 9) * (math.pi / 12)) * 1.0

    # Docelowa temperatura, do jakiej zmierza dom w tej minucie
    target_temp = base_temp + weather_front + daily_cycle

    # --- BATERIA ---
    battery_level -= battery_drop_per_point
    if battery_level <= 2.0:
        battery_level = 100.0 # Symulacja: Użytkownik wymienia baterię, gdy spadnie do 2%

    # --- 3. SYMULACJA WIETRZENIA ---
    is_ventilation = False
    if (hour == 7 or hour == 18) and past_time.minute == 0:
        if random.random() > 0.7: # 30% szans na przewietrzenie pokoju
            is_ventilation = True

    if is_ventilation:
        # W zimie wietrzenie wychładza bardzo mocno, w lecie delikatnie
        if season_modifier < 0:
            current_temp -= random.uniform(1.5, 3.0) # Zima/jesień
            hum_modifier = -15.0 # Ostre mroźne powietrze mocno zbija wilgotność w domu
        else:
            current_temp -= random.uniform(0.2, 1.0) # Lato
            hum_modifier = -5.0
    else:
        # Płynne dążenie do temperatury docelowej
        current_temp += (target_temp - current_temp) * 0.3
        # Szum czujnika
        current_temp += random.uniform(-0.15, 0.15)
        hum_modifier = 0

    # --- WYliczanie wilgotności ---
    # Zimą od grzejników jest sucho (season_modifier jest na minusie), latem wilgotniej
    season_hum_modifier = season_modifier * 4.0
    base_hum = 45.0 - (weather_front * 3.0) + (daily_cycle * 2.0)

    current_hum = base_hum + hum_modifier + season_hum_modifier + random.uniform(-2.0, 2.0)
    current_hum = max(20.0, current_hum) # Minimum fizyczne w warunkach domowych
    current_hum = min(80.0, current_hum) # Maksimum

    records.append({
        "deviceId": device_id,
        "temperature": round(current_temp, 1),
        "humidity": round(current_hum, 1),
        "battery": int(battery_level), # Zaokrąglamy do pełnych procentów
        "timestamp": past_time,
        "_class": "com.tuya.open.spring.boot.sample.ability.model.TemperatureRecord"
    })

collection.insert_many(records)
print(f"SUKCES! Wgrano {len(records)} punktów z całego roku do bazy tuya_iot.")