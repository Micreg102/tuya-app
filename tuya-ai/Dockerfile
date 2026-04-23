# Używamy lekkiej wersji Pythona 3.10
FROM python:3.10-slim

WORKDIR /app

# KRYTYCZNE DLA MAC STUDIO (ARM64):
# Prophet wymaga kompilacji narzędzia Stan pod spodem. Potrzebujemy gcc i g++.
RUN apt-get update && apt-get install -y \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# host 0.0.0.0 jest wymagany w Dockerze, aby wystawić port na zewnątrz
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]