# app/services/agricole_service.py
import torch
from torchvision import transforms
from PIL import Image, ImageDraw
import io
import base64
import logging
from pathlib import Path
import sys

BASE_DIR = Path(__file__).parent.parent.parent
sys.path.append(str(BASE_DIR))

from scripts.train_cnn_agricole import AgricoleCNN

logger = logging.getLogger(__name__)

class AgricoleDamageDetector:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.class_names = ['healthy', 'disease', 'natural_disaster']
        self.transform = None
        
        logger.info("=" * 50)
        logger.info("INITIALISATION DETECTEUR AGRICOLE")
        logger.info("=" * 50)
        
        self.load_model()
    
    def load_model(self):
        try:
            model_path = BASE_DIR / "models" / "agricole_damage_cnn.pth"
            
            if not model_path.exists():
                logger.warning("⚠️ Modèle non trouvé")
                self.model = None
                return
            
            logger.info(f"📁 Chargement du modèle: {model_path}")
            
            checkpoint = torch.load(model_path, map_location=self.device)
            
            if 'class_names' in checkpoint:
                self.class_names = checkpoint['class_names']
            
            num_classes = len(self.class_names)
            logger.info(f"📊 Classes: {self.class_names}")
            
            self.model = AgricoleCNN(num_classes=num_classes)
            self.model.load_state_dict(checkpoint['model_state_dict'])
            self.model.to(self.device)
            self.model.eval()
            
            self.transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            
            logger.info(f"✅ Modèle agricole chargé avec succès")
            
        except Exception as e:
            logger.error(f"❌ Erreur: {e}")
            self.model = None
    
    async def analyze_damage(self, image_data: bytes) -> dict:
        try:
            if self.model is None:
                return self._get_fallback_response()
            
            image = Image.open(io.BytesIO(image_data)).convert('RGB')
            original_image = image.copy()
            
            image_tensor = self.transform(image).unsqueeze(0).to(self.device)
            
            with torch.no_grad():
                outputs = self.model(image_tensor)
                probs = torch.softmax(outputs, dim=1)
                confidence, predicted = torch.max(probs, 1)
            
            predicted_class = self.class_names[predicted.item()]
            confidence_score = confidence.item() * 100
            
            logger.info(f"\n🌾 ANALYSE SINISTRE AGRICOLE")
            logger.info(f"📊 Classe: {predicted_class} ({confidence_score:.1f}%)")
            
            # Mapping des résultats
            if predicted_class == 'healthy':
                damage_type = 'healthy'
                damage_type_name = 'Culture/animal en bonne santé'
                estimated_cost = 0
                description = "Aucun sinistre détecté. L'exploitation semble en bon état."
                fraud_risk = 0
                insurance_coverage = False
                
            elif predicted_class == 'disease':
                damage_type = 'disease'
                damage_type_name = 'Maladie détectée'
                estimated_cost = 500
                description = f"Signes de maladie détectés avec une confiance de {confidence_score:.1f}%. Expertise vétérinaire recommandée."
                fraud_risk = 25
                insurance_coverage = True
                
            else:  # natural_disaster
                damage_type = 'natural_disaster'
                damage_type_name = 'Dégâts climatiques'
                estimated_cost = 1500
                description = f"Dégâts climatiques (grêle/gel/sécheresse) détectés avec une confiance de {confidence_score:.1f}%"
                fraud_risk = 35
                insurance_coverage = True
            
            annotated_image = await self._annotate_image(original_image, predicted_class, confidence_score)
            
            return {
                "success": True,
                "damage_type": damage_type,
                "damage_type_name": damage_type_name,
                "severity_score": confidence_score,
                "total_estimated_cost": estimated_cost,
                "detected_parts": [damage_type_name],
                "bounding_boxes": [],
                "annotated_image": annotated_image,
                "fraud_score": fraud_risk,
                "is_fraudulent": fraud_risk > 50,
                "confidence": round(confidence_score, 1),
                "description": description,
                "recommendations": [
                    "Consulter un vétérinaire/agronome",
                    "Prendre des photos supplémentaires",
                    "Conserver les échantillons",
                    "Contacter votre assureur"
                ] if predicted_class != 'healthy' else [
                    "Aucune action requise",
                    "Surveillance périodique recommandée"
                ],
                "need_expert": predicted_class != 'healthy',
                "class_name": predicted_class,
                "insurance_coverage": insurance_coverage,
                "probabilities": {
                    self.class_names[i]: float(probs[0][i]) for i in range(len(self.class_names))
                }
            }
                
        except Exception as e:
            logger.error(f"❌ Erreur: {e}")
            return {"success": False, "error": str(e)}
    
    async def _annotate_image(self, image, prediction, confidence):
        try:
            draw = ImageDraw.Draw(image)
            width, height = image.size
            
            if prediction == 'healthy':
                color = (0, 255, 0)
                text = f"✅ BON ETAT - {confidence:.1f}%"
                bg_color = (0, 100, 0)
            elif prediction == 'disease':
                color = (255, 165, 0)
                text = f"🦠 MALADIE - {confidence:.1f}%"
                bg_color = (200, 100, 0)
            else:
                color = (255, 0, 0)
                text = f"🌪️ SINISTRE CLIMATIQUE - {confidence:.1f}%"
                bg_color = (200, 0, 0)
            
            draw.rectangle([(10, 10), (width-10, height-10)], outline=color, width=5)
            draw.rectangle([(10, 10), (450, 50)], fill=bg_color)
            draw.text((20, 20), text, fill=(255, 255, 255))
            
            buffer = io.BytesIO()
            image.save(buffer, format='JPEG', quality=90)
            return base64.b64encode(buffer.getvalue()).decode('utf-8')
            
        except Exception as e:
            return None
    
    def _get_fallback_response(self):
        return {
            "success": True,
            "damage_type": "unknown",
            "damage_type_name": "Non déterminé",
            "severity_score": 0,
            "total_estimated_cost": 0,
            "detected_parts": [],
            "bounding_boxes": [],
            "annotated_image": None,
            "fraud_score": 0,
            "is_fraudulent": False,
            "confidence": 0,
            "description": "Service d'analyse non disponible",
            "recommendations": ["Contacter votre assureur", "Prendre des photos supplémentaires"],
            "need_expert": False,
            "class_name": "unknown",
            "insurance_coverage": False,
            "probabilities": {"healthy": 0, "disease": 0, "natural_disaster": 0}
        }