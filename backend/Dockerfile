FROM python:3.10-slim

WORKDIR /app

ENV PIP_DEFAULT_TIMEOUT=1000
ENV PIP_NO_CACHE_DIR=1
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# Installation des dépendances système
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    libpq-dev \
    tesseract-ocr \
    libjpeg-dev \
    zlib1g-dev \
    libfreetype6-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

# Mise à jour de pip
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Installation de PyTorch CPU
RUN pip install --no-cache-dir torch==2.1.2+cpu torchvision==0.16.2+cpu --index-url https://download.pytorch.org/whl/cpu

# Supprimer python-multipart du requirements.txt pour éviter les conflits
RUN sed -i '/python-multipart/d' requirements.txt || true

# Installer toutes les dépendances
RUN pip install --no-cache-dir --retries 10 --timeout 120 -r requirements.txt

# Vérification simple (optionnelle - vous pouvez supprimer cette ligne)
RUN python -c "print('✅ Build terminé avec succès')"

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]