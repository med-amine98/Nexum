# app/services/habitation_service.py
import sys
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

# Ajouter le chemin du projet
BASE_DIR = Path(__file__).parent.parent.parent
sys.path.append(str(BASE_DIR))

from scripts.train_cnn_habitation import predict_habitation
import base64
from PIL import Image
import io

class HabitationDamageDetector:
    def __init__(self):
        self.model_path = BASE_DIR / "models" / "habitation_damage_cnn.pth"
        logger.info("✅ Service Habitation initialisé")
    
    async def analyze_damage(self, image_data: bytes) -> dict:
        """
        Analyse une image de dégâts d'habitation
        
        Args:
            image_data: Bytes de l'image
            
        Returns:
            dict: Résultat de l'analyse
        """
        try:
            # Sauvegarder temporairement l'image
            temp_path = BASE_DIR / "temp_image.jpg"
            with open(temp_path, 'wb') as f:
                f.write(image_data)
            
            # Prédiction
            result = predict_habitation(str(temp_path), self.model_path)
            
            # Nettoyer
            temp_path.unlink()
            
            # Générer l'image annotée
            annotated_image = await self._annotate_image(image_data, result)
            
            return {
                "success": True,
                "damage_type": result['class'],
                "severity_score": result['confidence'],
                "total_estimated_cost": result['estimated_cost'],
                "detected_parts": [result['class']],
                "bounding_boxes": [],
                "annotated_image": annotated_image,
                "fraud_score": result['fraud_risk'],
                "is_fraudulent": result['fraud_risk'] > 50,
                "description": result['verdict'],
                "recommendation": result['action']
            }
            
        except Exception as e:
            logger.error(f"Erreur: {e}")
            return {"success": False, "error": str(e)}
    
    async def _annotate_image(self, image_data: bytes, result: dict) -> str:
        """Ajoute une annotation sur l'image"""
        image = Image.open(io.BytesIO(image_data))
        # Ajouter du texte sur l'image
        # ... (code d'annotation)
        
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=90)
        return base64.b64encode(buffer.getvalue()).decode('utf-8')