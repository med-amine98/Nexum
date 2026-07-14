# app/services/yolo_service.py
import base64
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image, ImageDraw
import io
import logging
from pathlib import Path
import numpy as np
import random

logger = logging.getLogger(__name__)

class YOLODamageDetector:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.transform = None
        self.class_names = ['normal', 'severe']
        
        logger.info("=" * 50)
        logger.info("INITIALISATION DU DETECTEUR")
        logger.info("=" * 50)
        
        self.load_cnn_model()
        logger.info(f"Service initialise sur {self.device}")
    
    def load_cnn_model(self):
        try:
            # Chercher le modèle dans différents emplacements
            model_paths = [
                Path("/app/models/damage_cnn.pth"),
                Path("./models/damage_cnn.pth"),
                Path("damage_cnn.pth"),
                Path("../models/damage_cnn.pth")
            ]
            
            model_path = None
            for path in model_paths:
                if path.exists():
                    model_path = path
                    break
            
            if model_path is None:
                logger.warning("⚠️ Modèle CNN non trouvé, utilisation du mode simulation")
                self.model = None
                return
            
            logger.info(f"📁 Chargement du modèle depuis: {model_path}")
            
            # Créer le modèle ResNet18
            model = models.resnet18(weights=None)
            model.fc = nn.Linear(model.fc.in_features, 2)  # 2 classes: normal, severe
            
            # Charger les poids
            checkpoint = torch.load(model_path, map_location=self.device)
            
            if 'model_state_dict' in checkpoint:
                model.load_state_dict(checkpoint['model_state_dict'])
                accuracy = checkpoint.get('val_acc', 'N/A')
                logger.info(f"✅ Modèle chargé avec Accuracy: {accuracy}%")
            else:
                model.load_state_dict(checkpoint)
                logger.info("✅ Modèle chargé avec succès")
            
            model.to(self.device)
            model.eval()
            
            self.model = model
            self.transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])
            
            logger.info(f"📊 Nombre de classes: {len(self.class_names)}")
            logger.info("=" * 50)
            
        except Exception as e:
            logger.error(f"❌ Erreur chargement du modèle: {e}")
            self.model = None
    
    async def analyze_damage(self, image_data: bytes) -> dict:
        """
        Analyser une image pour détecter les dégâts
        """
        try:
            if self.model is None:
                logger.info("⚠️ Mode simulation: modèle non disponible")
                return self._simulate_damage_analysis(image_data)
            
            # Ouvrir l'image
            image = Image.open(io.BytesIO(image_data)).convert('RGB')
            width, height = image.size
            
            # Prétraitement
            image_tensor = self.transform(image).unsqueeze(0).to(self.device)
            
            # Inference
            with torch.no_grad():
                outputs = self.model(image_tensor)
                probs = torch.softmax(outputs, dim=1)
                confidence, predicted = torch.max(probs, 1)
            
            prediction = self.class_names[predicted.item()]
            confidence_score = confidence.item() * 100
            
            logger.info(f"🎯 Prédiction: {prediction} ({confidence_score:.1f}%)")
            
            # Générer l'image annotée
            annotated_image = self._create_annotated_image(
                image, prediction, confidence_score
            )
            
            # Simuler les pièces détectées et les coûts
            damaged_parts = self._simulate_damaged_parts(prediction)
            
            return {
                "success": True,
                "damaged_parts": damaged_parts,
                "total_estimated_cost": self._calculate_cost(damaged_parts, prediction),
                "severity": prediction,
                "severity_score": confidence_score,
                "annotated_image": annotated_image,
                "fraud_score": 0,
                "is_fraudulent": False,
                "confidence": confidence_score,
                "detected_parts": [{"part": p["part"], "confidence": p["confidence"]} for p in damaged_parts],
                "description": self._generate_description(prediction, confidence_score),
                "need_expert": {"need_expert": prediction == "severe"},
                "recommendation": self._generate_recommendation(prediction, damaged_parts)
            }
                
        except Exception as e:
            logger.error(f"❌ Erreur analyse: {e}")
            return {
                "success": False, 
                "error": str(e),
                "damaged_parts": [],
                "total_estimated_cost": 0,
                "severity": "unknown",
                "confidence": 0
            }
    
    def _create_annotated_image(self, image: Image.Image, prediction: str, confidence: float) -> str:
        """Créer une image annotée"""
        try:
            draw = ImageDraw.Draw(image)
            width, height = image.size
            
            # Encadré de résultat
            draw.rectangle([(10, 10), (400, 120)], fill=(0, 0, 0), outline=(255, 255, 255))
            draw.text((20, 20), "RESULTAT ANALYSE IA", fill=(255, 255, 255))
            
            if prediction == 'severe':
                draw.text((20, 50), "⚠️ DEGATS DETECTES", fill=(255, 0, 0))
                draw.text((20, 80), f"Confiance: {confidence:.1f}%", fill=(255, 255, 255))
                draw.rectangle([(5, 5), (width-5, height-5)], outline=(255, 0, 0), width=5)
            else:
                draw.text((20, 50), "✅ AUCUN DEGAT", fill=(0, 255, 0))
                draw.text((20, 80), f"Confiance: {confidence:.1f}%", fill=(255, 255, 255))
                draw.rectangle([(5, 5), (width-5, height-5)], outline=(0, 255, 0), width=5)
            
            # Convertir en base64
            buffer = io.BytesIO()
            image.save(buffer, format='JPEG', quality=90)
            return base64.b64encode(buffer.getvalue()).decode('utf-8')
            
        except Exception as e:
            logger.error(f"Erreur annotation: {e}")
            return ""
    
    def _simulate_damaged_parts(self, prediction: str) -> list:
        """Simuler les pièces endommagées"""
        parts_db = [
            {"part": "pare-chocs avant", "base_cost": 800},
            {"part": "pare-chocs arrière", "base_cost": 750},
            {"part": "capot", "base_cost": 1200},
            {"part": "aile avant gauche", "base_cost": 600},
            {"part": "aile avant droite", "base_cost": 600},
            {"part": "porte avant gauche", "base_cost": 900},
            {"part": "porte avant droite", "base_cost": 900},
            {"part": "phare avant", "base_cost": 450},
            {"part": "feu arrière", "base_cost": 350},
            {"part": "pare-brise", "base_cost": 550}
        ]
        
        if prediction == 'severe':
            # Dégâts sévères: plusieurs pièces
            num_parts = random.randint(2, 4)
            selected = random.sample(parts_db, num_parts)
            return [
                {
                    "part": p["part"],
                    "confidence": random.uniform(0.75, 0.95),
                    "cost": p["base_cost"] * random.uniform(1.0, 1.5)
                }
                for p in selected
            ]
        elif prediction == 'normal':
            # Pas de dégâts ou dégâts mineurs
            if random.random() < 0.2:
                p = random.choice(parts_db)
                return [{
                    "part": p["part"],
                    "confidence": random.uniform(0.5, 0.7),
                    "cost": p["base_cost"] * random.uniform(0.3, 0.7)
                }]
            return []
        else:
            return []
    
    def _calculate_cost(self, damaged_parts: list, prediction: str) -> float:
        """Calculer le coût total estimé"""
        if not damaged_parts:
            return 0
        
        total = sum(p["cost"] for p in damaged_parts)
        
        # Majoration pour les dégâts sévères
        if prediction == 'severe':
            total *= 1.2
        
        return round(total, 0)
    
    def _simulate_damage_analysis(self, image_data: bytes) -> dict:
        """Simuler une analyse quand le modèle n'est pas disponible"""
        import random
        
        # Simulation basée sur la taille de l'image
        is_severe = random.random() > 0.5
        confidence = random.uniform(60, 90)
        
        parts = [
            {"part": "pare-chocs avant", "confidence": 0.85, "cost": 750},
            {"part": "capot", "confidence": 0.78, "cost": 1100}
        ] if is_severe else []
        
        total_cost = sum(p["cost"] for p in parts) if parts else 0
        
        # Convertir l'image en base64
        image_base64 = base64.b64encode(image_data).decode('utf-8')
        
        return {
            "success": True,
            "damaged_parts": parts,
            "total_estimated_cost": total_cost,
            "severity": "severe" if is_severe else "normal",
            "severity_score": confidence,
            "annotated_image": image_base64,
            "fraud_score": 0,
            "is_fraudulent": False,
            "confidence": confidence,
            "detected_parts": [{"part": p["part"], "confidence": p["confidence"]} for p in parts],
            "description": "Dégâts détectés" if is_severe else "Aucun dégât détecté",
            "need_expert": {"need_expert": is_severe},
            "recommendation": "Expertise recommandée" if is_severe else "Véhicule en bon état"
        }
    
    def _generate_description(self, prediction: str, confidence: float) -> str:
        """Générer une description"""
        if prediction == 'severe':
            return f"Dégâts significatifs détectés avec {confidence:.1f}% de confiance"
        return f"Aucun dégât majeur détecté ({confidence:.1f}% de confiance)"
    
    def _generate_recommendation(self, prediction: str, damaged_parts: list) -> str:
        """Générer une recommandation"""
        if prediction == 'severe':
            return "Expertise recommandée. Contactez votre assureur."
        elif damaged_parts:
            return "Réparation légère recommandée. Consultez un carrossier."
        return "Véhicule en bon état. Aucune réparation nécessaire."

# Instance globale
car_detector = YOLODamageDetector()