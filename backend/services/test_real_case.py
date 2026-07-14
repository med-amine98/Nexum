# scripts/test_real_case.py
import requests
from pathlib import Path

def test_api(image_path, api_url="http://localhost:8000/predict"):
    """Teste l'API avec une image réelle"""
    with open(image_path, 'rb') as f:
        files = {'file': (image_path, f, 'image/jpeg')}
        response = requests.post(api_url, files=files)
    
    result = response.json()
    logger.info("="*50)
    logger.info("🔍 RÉSULTAT DE L'ANALYSE")
    logger.info("="*50)
    logger.info(f"Classe prédite: {result['class']}")
    logger.info(f"Confiance: {result['confidence']:.2f}%")
    logger.info(f"Verdict: {result['verdict']}")
    logger.info(f"Action: {result['action']}")
    logger.info(f"Estimation: {result['estimated_cost']}€")
    
    return result

# Tester avec une vraie image
if __name__ == "__main__":
    test_api("test_images/maison_incendie.jpg")