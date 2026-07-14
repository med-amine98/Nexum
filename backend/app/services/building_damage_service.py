# app/services/building_damage_service.py
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image, ImageDraw, ImageFont
import io
import base64
import logging
from pathlib import Path
import sys
import numpy as np

# Ajouter le chemin du projet pour les imports
BASE_DIR = Path(__file__).parent.parent.parent
sys.path.append(str(BASE_DIR))

from scripts.train_cnn_habitation import FireDamageCNN

logger = logging.getLogger(__name__)

class BuildingDamageDetector:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.class_names = ['normal', 'fire_damage']
        self.transform = None
        
        # Seuil unique : seulement si confiance > 99% alors incendie
        self.FIRE_THRESHOLD = 99.0
        
        logger.info("=" * 50)
        logger.info("INITIALISATION DETECTEUR HABITATION")
        logger.info("=" * 50)
        logger.warning(f"⚠️ Seuil incendie: {self.FIRE_THRESHOLD}% (seulement si > {self.FIRE_THRESHOLD}%)")
        logger.info("=" * 50)
        
        self.load_model()
        logger.info(f"Service habitation initialisé sur {self.device}")
    
    def load_model(self):
        """Charge le modèle CNN entraîné"""
        try:
            model_paths = [
                BASE_DIR / "models" / "habitation_damage_cnn.pth",
                BASE_DIR / "models" / "damage_cnn.pth",
                Path("/app/models/habitation_damage_cnn.pth")
            ]
            
            model_path = None
            for path in model_paths:
                if path.exists():
                    model_path = path
                    break
            
            if model_path is None:
                logger.warning("⚠️ Modèle non trouvé")
                self.model = None
                return
            
            logger.info(f"📁 Chargement du modèle: {model_path}")
            
            checkpoint = torch.load(model_path, map_location=self.device)
            
            if 'class_names' in checkpoint:
                self.class_names = checkpoint['class_names']
            
            num_classes = len(self.class_names)
            logger.info(f"📊 Classes: {self.class_names}")
            
            self.model = FireDamageCNN(num_classes=num_classes, model_name='resnet50')
            self.model.load_state_dict(checkpoint['model_state_dict'])
            self.model.to(self.device)
            self.model.eval()
            
            self.transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            
            logger.info(f"✅ Modèle habitation chargé avec succès")
            
        except Exception as e:
            logger.error(f"❌ Erreur chargement modèle: {e}")
            import traceback
            traceback.print_exc()
            self.model = None
    
    async def analyze_damage(self, image_data: bytes) -> dict:
        """Analyse une image de dégâts d'habitation"""
        try:
            if self.model is None:
                return self._get_fallback_response()
            
            # Ouvrir l'image
            image = Image.open(io.BytesIO(image_data)).convert('RGB')
            original_image = image.copy()
            width, height = image.size
            
            # Prétraitement
            image_tensor = self.transform(image).unsqueeze(0).to(self.device)
            
            # Prédiction
            with torch.no_grad():
                outputs = self.model(image_tensor)
                probs = torch.softmax(outputs, dim=1)
            
            # Probabilités brutes
            normal_prob = probs[0][0].item() * 100
            fire_prob = probs[0][1].item() * 100
            
            logger.info(f"\n{'='*50}")
            logger.info(f"🔍 ANALYSE IMAGE")
            logger.info(f"{'='*50}")
            logger.info(f"📊 Probabilité NORMAL: {normal_prob:.1f}%")
            logger.info(f"🔥 Probabilité INCENDIE: {fire_prob:.1f}%")
            
            # === LOGIQUE SIMPLE ===
            # Seulement si la probabilité incendie > 99% alors c'est un incendie
            # Sinon c'est normal (même 98.9% = normal)
            
            if fire_prob > self.FIRE_THRESHOLD:
                is_fire = True
                confidence_score = fire_prob
                class_name = 'fire_damage'
                damage_type_name = 'Incendie'
                estimated_cost = 8000
                description = f"🔥 INCENDIE CONFIRMÉ avec une confiance de {confidence_score:.1f}%"
                detected_parts = ["🏚️ Structure carbonisée", "🌫️ Traces de suie étendues", "🔥 Zone brûlée importante"]
                fraud_risk = 25
                recommendations = [
                    "🚨 Contacter les pompiers si l'incendie n'est pas maîtrisé",
                    "📋 Faire établir un constat par les autorités",
                    "🔌 Couper l'électricité et le gaz",
                    "📸 Prendre des photos supplémentaires des dégâts"
                ]
            else:
                is_fire = False
                confidence_score = normal_prob
                class_name = 'normal'
                damage_type_name = 'Normal'
                estimated_cost = 0
                description = f"✅ AUCUN DÉGÂT DÉTECTÉ. Confiance: {confidence_score:.1f}%"
                detected_parts = []
                fraud_risk = 0
                recommendations = [
                    "✅ Aucune action requise",
                    "📋 Vérification périodique recommandée",
                    "🔍 Surveillance des zones à risque"
                ]
            
            logger.info(f"🎯 Décision finale: {class_name} (confiance: {confidence_score:.1f}%)")
            logger.info(f"   Règle: Incendie uniquement si confiance > {self.FIRE_THRESHOLD}%")
            logger.info(f"{'='*50}\n")
            
            # Générer l'image annotée
            annotated_image = await self._annotate_image(
                original_image, 
                'fire_damage' if is_fire else 'normal', 
                confidence_score,
                estimated_cost if is_fire else 0
            )
            
            return {
                "success": True,
                "damage_type": "fire" if is_fire else "normal",
                "damage_type_name": damage_type_name,
                "severity_score": round(confidence_score, 1),
                "total_estimated_cost": estimated_cost,
                "detected_parts": detected_parts,
                "bounding_boxes": [],
                "annotated_image": annotated_image,
                "fraud_score": fraud_risk,
                "is_fraudulent": fraud_risk > 50,
                "confidence": round(confidence_score, 1),
                "description": description,
                "recommendations": recommendations,
                "need_expert": is_fire,
                "class_name": class_name,
                "probabilities": {
                    "normal": round(normal_prob, 1),
                    "fire_damage": round(fire_prob, 1)
                }
            }
                
        except Exception as e:
            logger.error(f"❌ Erreur analyse: {e}")
            import traceback
            traceback.print_exc()
            return {"success": False, "error": str(e)}
    
    async def _annotate_image(self, image, prediction, confidence, estimated_cost=0):
        """Ajoute une annotation sur l'image"""
        try:
            draw = ImageDraw.Draw(image)
            width, height = image.size
            
            if prediction == 'fire_damage':
                color = (255, 0, 0)
                text = f"🔥 INCENDIE - {confidence:.1f}%"
                bg_color = (200, 0, 0)
            else:
                color = (0, 255, 0)
                text = f"✅ NORMAL - {confidence:.1f}%"
                bg_color = (0, 100, 0)
            
            draw.rectangle([(10, 10), (width-10, height-10)], outline=color, width=5)
            draw.rectangle([(10, 10), (400, 50)], fill=bg_color)
            draw.text((20, 20), text, fill=(255, 255, 255))
            
            if prediction == 'fire_damage' and estimated_cost > 0:
                draw.rectangle([(10, height-45), (300, height-10)], fill=bg_color)
                draw.text((20, height-40), f"💰 Estimation: ~{estimated_cost}€", fill=(255, 255, 255))
            
            buffer = io.BytesIO()
            image.save(buffer, format='JPEG', quality=90)
            return base64.b64encode(buffer.getvalue()).decode('utf-8')
            
        except Exception as e:
            logger.error(f"Erreur annotation: {e}")
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
            "recommendations": ["Contacter votre assureur"],
            "need_expert": False,
            "class_name": "unknown",
            "probabilities": {"normal": 0, "fire_damage": 0}
        }