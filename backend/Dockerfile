FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Seed the DB on first boot only — if a persistent disk is mounted at
# DATABASE_URL's path and already has data, this is skipped so redeploys
# never wipe existing conversations.
RUN mkdir -p uploads
EXPOSE 8000
CMD sh -c "python -m app.seed --if-empty; uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"
