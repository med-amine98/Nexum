import os
import uuid
import re
import time
import requests
from bs4 import BeautifulSoup
from qdrant_client import QdrantClient
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer
import urllib.parse
import logging

# Configuration du logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ========== CONFIGURATION ==========
QDRANT_HOST = "neura-qdrant"  # ou "localhost" si exécuté hors docker
QDRANT_PORT = 6333
MODEL_NAME = "all-MiniLM-L6-v2"
COLLECTION_SIZE = 384

# ========== CONNEXION ==========
client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
model = SentenceTransformer(MODEL_NAME)

# ========== FONCTIONS DE SCRAPING ROBUSTES ==========
def fetch_wikipedia_text(page_title):
    """
    Récupère le contenu textuel d'une page Wikipedia via l'API REST.
    """
    try:
        # Nettoyer le titre
        title = page_title.strip().replace(' ', '_')
        url = f"https://fr.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles={urllib.parse.quote(title)}&format=json"
        headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
        response = requests.get(url, headers=headers, timeout=15)
        if response.status_code == 200:
            data = response.json()
            pages = data.get('query', {}).get('pages', {})
            for page_id, page_data in pages.items():
                if 'extract' in page_data:
                    return page_data['extract']
        return None
    except Exception as e:
        logger.warning(f"Erreur API Wikipedia pour {page_title}: {e}")
        return None

def fetch_webpage_text(url, timeout=20, retries=3):
    """
    Télécharge le contenu textuel d'une page web avec retries.
    """
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    for attempt in range(retries):
        try:
            response = requests.get(url, headers=headers, timeout=timeout)
            if response.status_code == 200:
                soup = BeautifulSoup(response.text, 'html.parser')
                for elem in soup(["script", "style", "nav", "footer", "header"]):
                    elem.decompose()
                text = soup.get_text(separator=' ', strip=True)
                text = re.sub(r'\s+', ' ', text)
                # Garder seulement les paragraphes avec des phrases significatives (plus de 100 caractères)
                if len(text) < 200:
                    logger.warning(f"Contenu trop court pour {url} (taille: {len(text)})")
                    return None
                return text
            elif response.status_code in [403, 404]:
                logger.warning(f"Erreur HTTP {response.status_code} pour {url}")
                return None
            else:
                logger.warning(f"Tentative {attempt+1}/{retries} : status {response.status_code} pour {url}")
                time.sleep(2)
        except Exception as e:
            logger.warning(f"Tentative {attempt+1}/{retries} : exception pour {url} - {str(e)[:80]}")
            time.sleep(2)
    return None

def scrape_text_from_url(url):
    """Point d'entrée pour scraper une URL, avec détection Wikipedia."""
    # Si c'est Wikipedia, utiliser l'API
    if 'wikipedia.org' in url:
        # Extraire le titre de la page
        parsed = urllib.parse.urlparse(url)
        path = parsed.path
        # ex: /wiki/Gestion_des_risques
        if path.startswith('/wiki/'):
            page_title = path[6:].replace('_', ' ')
            text = fetch_wikipedia_text(page_title)
            if text:
                return text
            else:
                # Fallback: scraper la page HTML normale
                pass
    # Sinon, scraper normalement
    return fetch_webpage_text(url)

def chunk_text(text, max_chars=1500):
    """Découpe le texte en chunks de taille maximale."""
    if not text:
        return []
    # Découpage par phrases
    sentences = re.split(r'(?<=[.!?])\s+', text)
    chunks = []
    current_chunk = ""
    for sent in sentences:
        if len(current_chunk) + len(sent) + 1 < max_chars:
            current_chunk += sent + " "
        else:
            if current_chunk.strip():
                chunks.append(current_chunk.strip())
            current_chunk = sent + " "
    if current_chunk.strip():
        chunks.append(current_chunk.strip())
    return chunks

def get_embedding(text):
    return model.encode(text).tolist()

def recreate_collection(collection_name):
    """Recrée la collection avec la bonne taille."""
    try:
        collections = client.get_collections().collections
        exists = any(c.name == collection_name for c in collections)
        if exists:
            client.delete_collection(collection_name)
            logger.info(f"   🗑️ Collection supprimée")
        client.create_collection(
            collection_name=collection_name,
            vectors_config=models.VectorParams(
                size=COLLECTION_SIZE,
                distance=models.Distance.COSINE
            )
        )
        logger.info(f"   📁 Collection recréée (taille {COLLECTION_SIZE})")
    except Exception as e:
        logger.error(f"Erreur recréation collection {collection_name}: {e}")

def upsert_documents(collection_name, docs):
    if not docs:
        logger.warning("   ⚠️ Aucun document à insérer.")
        return
    points = []
    for idx, doc in enumerate(docs):
        if "question" in doc and "answer" in doc:
            text_to_embed = f"Question: {doc['question']} Réponse: {doc['answer']}"
            payload = {"question": doc["question"], "answer": doc["answer"], "full_text": text_to_embed}
        else:
            text_to_embed = doc["text"][:1000]  # tronquer si trop long pour l'embedding
            payload = {"text": doc["text"], "full_text": text_to_embed}
        vector = get_embedding(text_to_embed)
        point_id = str(uuid.uuid4())
        points.append(
            models.PointStruct(
                id=point_id,
                vector=vector,
                payload=payload
            )
        )
        # Petit batch de 100 points pour éviter de surcharger Qdrant
        if len(points) >= 100:
            client.upsert(collection_name=collection_name, points=points)
            points = []
    if points:
        client.upsert(collection_name=collection_name, points=points)
    logger.info(f"   ✅ {len(docs)} points insérés")

# ========== CONFIGURATION DES ASSISTANTS ==========
# Pour chaque assistant, on fournit des URLs de scrapings (certaines avec fallback)
assistants_config = {
    "risk_assistant_knowledge": {
        "name": "Risk (Sophie Laurent)",
        "static_docs": [
            {"question": "Bonjour", "answer": "Bonjour ! Je suis Risk, votre experte en gestion des risques. Comment puis-je vous aider aujourd'hui ?"},
            # ... (vos autres questions/réponses)
        ],
        "scrape_urls": [
            {"url": "https://fr.wikipedia.org/wiki/Gestion_des_risques", "fallback": None},
            {"url": "https://www.eba.europa.eu/risk-analysis", "fallback": "https://www.eba.europa.eu/risk"},
        ]
    },
    "growth_assistant_knowledge": {
        "name": "Growth (Elena Petrova)",
        "static_docs": [
            {"question": "Bonjour", "answer": "Bonjour ! Je suis Growth, votre conseillère en stratégie de croissance. Comment puis-je booster votre activité ?"},
            # ...
        ],
        "scrape_urls": [
            {"url": "https://fr.wikipedia.org/wiki/Croissance_de_l%27entreprise", "fallback": None},
            {"url": "https://www.hubspot.com/marketing-statistics", "fallback": "https://blog.hubspot.com/marketing/statistics"},
        ]
    },
    "predict_assistant_knowledge": {
        "name": "Predict (James O'Connor)",
        "static_docs": [
            {"question": "Bonjour", "answer": "Bonjour ! Je suis Predict, votre expert en data science et prédictions. Comment puis-je vous aider à anticiper ?"},
            # ...
        ],
        "scrape_urls": [
            {"url": "https://fr.wikipedia.org/wiki/Apprentissage_automatique", "fallback": None},
            {"url": "https://scikit-learn.org/stable/tutorial/machine_learning_map/index.html", "fallback": "https://scikit-learn.org/stable/tutorial/index.html"},
        ]
    },
    "compliance_assistant_knowledge": {
        "name": "Compliance (Risk)",
        "static_docs": [
            {"question": "Bonjour", "answer": "Bonjour ! Je suis Compliance, votre expert en conformité réglementaire. Comment puis-je vous aider ?"},
            # ...
        ],
        "scrape_urls": [
            {"url": "https://fr.wikipedia.org/wiki/Lutte_contre_le_blanchiment_d%27argent", "fallback": "https://fr.wikipedia.org/wiki/Brulage"},
        ]
    },
    "operations_assistant_knowledge": {
        "name": "Operations (predict)",
        "static_docs": [
            {"question": "Bonjour", "answer": "Bonjour ! Je suis Operations, votre expert en optimisation des processus et supply chain."},
            # ...
        ],
        "scrape_urls": [
            {"url": "https://fr.wikipedia.org/wiki/Logistique", "fallback": None},
            {"url": "https://www.supplychain.fr/", "fallback": "https://www.supplychain.com/"},
        ]
    },
    "analytics_assistant_knowledge": {
        "name": "Analytics (growth)",
        "static_docs": [
            {"question": "Bonjour", "answer": "Bonjour ! Je suis Analytics, votre experte en analyse de données et tableaux de bord."},
            # ...
        ],
        "scrape_urls": [
            {"url": "https://fr.wikipedia.org/wiki/Analyse_de_donn%C3%A9es", "fallback": None},
            {"url": "https://www.kdnuggets.com/", "fallback": "https://www.datasciencecentral.com/"},
        ]
    }
}

# ========== EXÉCUTION PRINCIPALE ==========
if __name__ == "__main__":
    logger.info("🚀 Début du peuplement des collections Qdrant (modèle local)")
    logger.info(f"🔹 Modèle : {MODEL_NAME}, dimension {COLLECTION_SIZE}\n")

    for col_name, config in assistants_config.items():
        logger.info(f"📝 Traitement de {col_name} (assistant {config['name']})")
        recreate_collection(col_name)

        docs = []
        # 1. Documents statiques
        for qa in config.get("static_docs", []):
            docs.append({"question": qa["question"], "answer": qa["answer"]})
        logger.info(f"   📄 {len(docs)} documents statiques")

        # 2. Scraping
        for entry in config.get("scrape_urls", []):
            url = entry.get("url")
            fallback = entry.get("fallback")
            logger.info(f"   🌐 Scraping {url}")
            text = scrape_text_from_url(url)
            if not text and fallback:
                logger.info(f"      ↳ Fallback vers {fallback}")
                text = scrape_text_from_url(fallback)
            if text:
                chunks = chunk_text(text)
                for chunk in chunks:
                    docs.append({"text": chunk})
                logger.info(f"      ➜ {len(chunks)} chunks extraits")
            else:
                logger.warning(f"      ❌ Échec scraping (et fallback)")
            time.sleep(1)  # Politesse

        # 3. Insertion
        upsert_documents(col_name, docs)
        logger.info("")

    logger.info("✅ Toutes les collections ont été enrichies.")