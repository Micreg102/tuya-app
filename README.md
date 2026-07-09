# Tuya Smart Home Connector

Aplikacja do monitorowania urządzeń Tuya (czujniki temperatury, wilgotności, dymu) z panelem webowym, historią w MongoDB i prognozą klimatu (Prophet AI).

## Architektura

| Serwis | Technologia | Port |
|--------|-------------|------|
| `frontend` | React + Nginx | 3030 |
| `backend` | Spring Boot | 8088 |
| `ai-service` | FastAPI + Prophet | 8000 |
| `mongodb` | MongoDB 6.0 | 27017 |

## Wymagania

- Docker i Docker Compose
- Konto [Tuya IoT Platform](https://iot.tuya.com/) z utworzonym projektem Cloud

## Konfiguracja kluczy Tuya

Klucze API są wpisane na sztywno w pliku:

`smart-home-backend/src/main/resources/application.properties`

```properties
connector.ak=twoj_access_id
connector.sk=twoj_access_secret
connector.region=EU
```

Dozwolone wartości `connector.region`: `CN`, `US`, `EU`, `IN`.

Po zmianie kluczy przebuduj backend:

```bash
docker compose up --build backend
```

## Lista urządzeń

Edytuj `tuya-frontend/src/devices.json` i wpisz ID swoich czujników przed budowaniem obrazu frontendu.

## Uruchomienie przez Docker

```bash
docker compose up --build
```

Po starcie:

- Panel webowy: http://localhost:3030
- Backend API: http://localhost:8088
- Serwis AI: http://localhost:8000/docs

Zatrzymanie:

```bash
docker compose down
```

Usunięcie danych MongoDB:

```bash
docker compose down -v
```

## Jak to działa w Dockerze

- Frontend (nginx) serwuje React i proxy'uje `/devices` oraz `/ws-tuya` do kontenera `backend`
- Backend łączy się z MongoDB pod adresem `mongodb:27017` (ustawione w `Dockerfile`)
- Backend wysyła predykcje do `ai-service:8000` (zmienna `AI_SERVICE_URL` w `docker-compose.yml`)

## Uruchomienie lokalne (bez Dockera)

Wymaga działającego MongoDB na `localhost:27017`.

### Backend

```bash
cd smart-home-backend
mvn spring-boot:run
```

Backend startuje na porcie 8080.

### Frontend

```bash
cd tuya-frontend
npm install
npm start
```

Frontend startuje na http://localhost:3000. Pole `"proxy"` w `package.json` przekierowuje żądania API i WebSocket do backendu na porcie 8080.

### Serwis AI

```bash
cd tuya-ai
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## Struktura projektu

```
tuya-connector/
├── docker-compose.yml
├── smart-home-backend/    # Spring Boot — API, WebSocket, MongoDB
├── tuya-frontend/         # React — panel urządzeń
├── tuya-ai/               # FastAPI — prognoza temperatury i wilgotności
├── tuya-api/              # Biblioteka konektora Tuya
├── tuya-messaging/        # Obsługa wiadomości Pulsar
└── tuya-common/           # Wspólne narzędzia
```

## Funkcje

- Dashboard z podziałem na czujniki temperatury, dymu i inne urządzenia
- Szczegóły urządzenia z wykresem historii (dzień / miesiąc / rok / całość)
- Aktualizacje na żywo przez WebSocket (STOMP)
- Prognoza klimatu na 12 h (Prophet) — wymaga minimum 24 punktów pomiarowych z ostatnich 7 dni
- Zapis historii pomiarów w MongoDB
