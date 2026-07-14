# scripts/test_pretrained_models.py
import requests
import json
from pathlib import Path

def test_classification():
    """Test la classification d'image"""
    logger.info("\n" + "=" * 50)
    logger.info("🔍 TEST CLASSIFICATION")
    logger.info("=" * 50)
    
    with open("test_image.jpg", "rb") as f:
        response = requests.post(
            "http://localhost:8000/unified-claims/classify",
            files={"photo": f}
        )
    
    result = response.json()
    logger.info(json.dumps(result, indent=2, ensure_ascii=False))

def test_damage_detection():
    """Test la détection de dommages"""
    logger.info("\n" + "=" * 50)
    logger.info("🚗 TEST DÉTECTION DE DOMMAGES")
    logger.info("=" * 50)
    
    with open("test_car.jpg", "rb") as f:
        response = requests.post(
            "http://localhost:8000/unified-claims/detect-damage",
            files={"photo": f}
        )
    
    result = response.json()
    logger.info(f"Détections: {result.get('count', 0)}")
    for detection in result.get('detections', []):
        logger.info(f"  - {detection['object']}: {detection['confidence']:.2f}")

def test_agriculture():
    """Test l'analyse agricole"""
    logger.info("\n" + "=" * 50)
    logger.info("🌾 TEST ANALYSE AGRICOLE")
    logger.info("=" * 50)
    
    with open("test_plant.jpg", "rb") as f:
        response = requests.post(
            "http://localhost:8000/unified-claims/analyze-agriculture",
            files={"photo": f}
        )
    
    result = response.json()
    logger.info(f"Malade: {result.get('is_diseased', False)}")
    logger.info(f"Maladie: {result.get('disease_name', 'inconnu')}")
    logger.info(f"Confiance: {result.get('confidence', 0):.1f}%")

def test_full_analysis():
    """Test l'analyse complète"""
    logger.info("\n" + "=" * 50)
    logger.info("🎯 TEST ANALYSE COMPLÈTE")
    logger.info("=" * 50)
    
    with open("test_image.jpg", "rb") as f:
        response = requests.post(
            "http://localhost:8000/unified-claims/full-analysis",
            files={"photo": f},
            data={"text": "Consultation du 15/03/2024. Prescription: Paracétamol 500mg"}
        )
    
    result = response.json()
    logger.info(json.dumps(result, indent=2, ensure_ascii=False))

if __name__ == "__main__":
    # Assurez-vous que le serveur est démarré
    # uvicorn app.routes.unified_claims:router --reload --port 8000
    
    test_classification()
    test_damage_detection()
    test_agriculture()
    test_full_analysis()