from pymongo import MongoClient
import datetime
import random
import math

# 1. Podłączamy się do lokalnego portu, który udostępnia Twój kontener z MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["tuya_iot"]
collection = db["temperature_history"]

# Twój konkretny czujnik w salonie
device_id = "bf725076682667c134lh1i"

print("Czyszczenie starej historii...")
collection.delete_many({"deviceId": device_id})

now = datetime.datetime.now()
records = []

print("Generowanie 7 dni ultra-realistycznego klimatu z wietrzeniem...")

# Zaczynamy od standardowej temperatury 21.0
current_temp = 21.0

# Generujemy pomiary co 30 minut.
# Idziemy pętlą od najstarszego pomiaru (7 dni temu) do "teraz", żeby ładnie symulować nagrzewanie po wietrzeniu
for i in range(336, -1, -1):
    past_time = now - datetime.timedelta(minutes=30 * i)
    hour = past_time.hour

    # --- NATURALNY CYKL (Słońce i piec) ---
    # Słońce nagrzewa salon w dzień (max ok. 15:00 -> ~23°C), w nocy stygnie (min ok. 03:00 -> ~19°C)
    target_temp = 21.0 + math.sin((hour - 9) * (math.pi / 12)) * 2.0

    # --- SYMULACJA WIETRZENIA ---
    is_ventilation = False
    # Załóżmy, że ktoś w domu wietrzy zazwyczaj rano (7:00-8:00) lub po powrocie z pracy/przed snem (18:00-19:00)
    if (hour == 7 or hour == 18) and past_time.minute == 0:
        # 40% szans, że akurat tego dnia ktoś otworzył okno na oścież
        if random.random() > 0.6:
            is_ventilation = True

    if is_ventilation:
        print(f"[{past_time.strftime('%Y-%m-%d %H:%M')}] Otwarto okno! Wietrzenie salonu.")
        # Nagły spadek o 1.5 do 3.0 stopni w ciągu 30 minut
        current_temp -= random.uniform(1.5, 3.0)
        hum_modifier = -15.0 # Zimą przy wietrzeniu drastycznie spada wilgotność
    else:
        # Jeśli okno jest zamknięte, salon powoli dąży do temperatury docelowej (naturalnej lub nagrzewa się po wietrzeniu)
        current_temp += (target_temp - current_temp) * 0.4
        # Delikatny "szum" czujnika elektronicznego (nigdy nie ma idealnie gładkich pomiarów)
        current_temp += random.uniform(-0.2, 0.2)
        hum_modifier = 0

    # Wyliczanie wilgotności (podąża za temperaturą, ale ma więcej szumu)
    base_hum = 45.0 + math.sin((hour - 9) * (math.pi / 12)) * 5.0
    current_hum = base_hum + hum_modifier + random.uniform(-2.0, 2.0)

    # Zabezpieczenie fizyki (żeby wilgotność przy wietrzeniu nie spadła poniżej 20%)
    current_hum = max(20.0, current_hum)

    records.append({
        "deviceId": device_id,
        "temperature": round(current_temp, 1),
        "humidity": round(current_hum, 1),
        "timestamp": past_time,
        "_class": "com.tuya.open.spring.boot.sample.ability.model.TemperatureRecord"
    })

# 3. Wrzucamy całą wygenerowaną paczkę do bazy!
collection.insert_many(records)
print(f"SUKCES! Wgrano {len(records)} punktów testowych do bazy.")