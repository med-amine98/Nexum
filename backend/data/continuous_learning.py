# data/continuous_learning.py
import requests
import time
import random

API_URL = "http://localhost:8000/api/v1"

# Nouvelles connaissances à ajouter régulièrement
NEW_KNOWLEDGE = {
    "risk": [
        "Nouvelle alerte: augmentation des cyberattaques de 35% en 2026.",
        "Les assurances climatiques couvrent désormais les inondations et feux de forêt.",
    ],
    "growth": [
        "Le marché du e-commerce devrait croître de 12% cette année.",
        "Les chatbots IA réduisent le support client de 40%.",
    ],
    "predict": [
        "Nouveau modèle de prédiction du churn avec 91% de précision.",
        "L'IA générative améliore la détection de fraude de 15%.",
    ]
}

def add_new_knowledge():
    for assistant, contents in NEW_KNOWLEDGE.items():
        for content in contents:
            response = requests.post(
                f"{API_URL}/assistant/learn",
                json={
                    "assistant": assistant,
                    "content": content,
                    "metadata": {"source": "continuous_learning", "auto_added": True}
                }
            )
            if response.status_code == 200:
                logger.info(f"✅ Ajouté à {assistant}: {content[:50]}...")

if __name__ == "__main__":
    add_new_knowledge()