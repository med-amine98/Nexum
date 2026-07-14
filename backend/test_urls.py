import requests

# L'URL dépend de comment le routeur est monté dans main.py
# Essayez ces URLs:

urls = [
    "http://localhost:8000/claims/analyze-building-damage-public",
    "http://localhost:8000/analyze-building-damage-public", 
    "http://localhost:8000/api/v1/claims/analyze-building-damage-public",
    "http://localhost:8000/api/claims/analyze-building-damage-public"
]

image_path = "data_wildfire/val/normal/sample_0.jpg"

for url in urls:
    try:
        logger.info(f"\nTest URL: {url}")
        with open(image_path, 'rb') as f:
            r = requests.post(url, files={'photo': f})
            if r.status_code == 200:
                logger.info(f"✅ SUCCÈS! URL correcte: {url}")
                logger.info(f"Réponse: {r.json()}")
                break
            else:
                logger.error(f"❌ Status: {r.status_code}")
    except Exception as e:
        logger.error(f"❌ Erreur: {e}")
