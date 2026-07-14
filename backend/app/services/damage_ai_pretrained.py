# app/services/damage_ai_pretrained.py
import numpy as np
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForImageClassification
import torch
import cv2
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import os
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

# ============================================
# DÉTECTEUR DE DOMMAGES AVEC VIT-BEIT
# ============================================

class PretrainedDamageDetector:
    """
    Utilise le modèle Vit-BEiT pré-entraîné pour la détection de dommages
    Modèle: beingamit99/car_damage_detection (fine-tuné sur car_damage_dataset)
    """
    
    # Mapping des classes du modèle pré-entraîné
    DAMAGE_CLASSES = {
        0: {"id": "crack", "name": "Fissure", "severity": 0.7, "repairable": False, "color": "#ef4444"},
        1: {"id": "scratch", "name": "Rayure", "severity": 0.3, "repairable": True, "color": "#f59e0b"},
        2: {"id": "tire_flat", "name": "Pneu crevé", "severity": 0.8, "repairable": True, "color": "#ef4444"},
        3: {"id": "dent", "name": "Enfoncement", "severity": 0.5, "repairable": True, "color": "#f97316"},
        4: {"id": "glass_shatter", "name": "Vitre brisée", "severity": 0.9, "repairable": False, "color": "#ef4444"},
        5: {"id": "lamp_broken", "name": "Phare cassé", "severity": 0.6, "repairable": False, "color": "#ef4444"}
    }
    
    # Mapping des pièces par type de dommage
    PART_MAPPING = {
        "crack": [
            {"id": "pare_brise", "name": "Pare-brise", "category": "vitrage", "cost": 600},
            {"id": "lunette_arriere", "name": "Lunette Arrière", "category": "vitrage", "cost": 520}
        ],
        "scratch": [
            {"id": "carrosserie_avant", "name": "Carrosserie Avant", "category": "carrosserie", "cost": 800},
            {"id": "carrosserie_centrale", "name": "Carrosserie Centrale", "category": "carrosserie", "cost": 1000},
            {"id": "carrosserie_arriere", "name": "Carrosserie Arrière", "category": "carrosserie", "cost": 700}
        ],
        "tire_flat": [
            {"id": "roue_avant_gauche", "name": "Roue Avant Gauche", "category": "roues", "cost": 380},
            {"id": "roue_avant_droite", "name": "Roue Avant Droite", "category": "roues", "cost": 380},
            {"id": "roue_arriere_gauche", "name": "Roue Arrière Gauche", "category": "roues", "cost": 380},
            {"id": "roue_arriere_droite", "name": "Roue Arrière Droite", "category": "roues", "cost": 380}
        ],
        "dent": [
            {"id": "porte_avant_gauche", "name": "Porte Avant Gauche", "category": "portes", "cost": 700},
            {"id": "porte_avant_droite", "name": "Porte Avant Droite", "category": "portes", "cost": 700},
            {"id": "porte_arriere_gauche", "name": "Porte Arrière Gauche", "category": "portes", "cost": 650},
            {"id": "porte_arriere_droite", "name": "Porte Arrière Droite", "category": "portes", "cost": 650},
            {"id": "capot", "name": "Capot Moteur", "category": "mécanique", "cost": 800}
        ],
        "glass_shatter": [
            {"id": "pare_brise", "name": "Pare-brise", "category": "vitrage", "cost": 600},
            {"id": "lunette_arriere", "name": "Lunette Arrière", "category": "vitrage", "cost": 520}
        ],
        "lamp_broken": [
            {"id": "phare_gauche", "name": "Phare Gauche", "category": "éclairage", "cost": 550},
            {"id": "phare_droit", "name": "Phare Droit", "category": "éclairage", "cost": 550}
        ]
    }
    
    def __init__(self, model_name: str = "beingamit99/car_damage_detection"):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.processor = None
        self.is_loaded = False
        self.model_name = model_name
        
        # Créer le dossier models
        os.makedirs("models", exist_ok=True)
        
        # Charger le modèle
        self._load_model()
        
        # Initialiser l'estimateur de coûts
        self.cost_estimator = CostEstimatorService()
    
    def _load_model(self):
        """Charger le modèle pré-entraîné Vit-BEiT"""
        try:
            logger.info(f"📥 Chargement du modèle Vit-BEiT: {self.model_name}...")
            
            # Charger le processeur et le modèle
            self.processor = AutoImageProcessor.from_pretrained(self.model_name)
            self.model = AutoModelForImageClassification.from_pretrained(self.model_name)
            
            # Mettre sur le bon device
            self.model.to(self.device)
            self.model.eval()
            
            self.is_loaded = True
            
            # Afficher les classes disponibles
            id2label = self.model.config.id2label
            logger.info(f"✅ Modèle Vit-BEiT chargé sur {self.device}")
            logger.info(f"📊 Classes disponibles: {len(id2label)} classes")
            for idx, label in id2label.items():
                logger.info(f"   {idx}: {label}")
            
            # Vérifier la correspondance avec nos classes
            logger.info("📋 Mapping des classes de dommages:")
            for idx, info in self.DAMAGE_CLASSES.items():
                logger.info(f"   {idx}: {info['name']} (sévérité: {info['severity']})")
            
        except Exception as e:
            logger.error(f"❌ Erreur chargement modèle Vit-BEiT: {e}")
            logger.info("🔄 Tentative de chargement depuis le cache local...")
            
            try:
                # Tentative de chargement depuis le cache
                cache_dir = os.path.expanduser("~/.cache/huggingface/hub")
                if os.path.exists(cache_dir):
                    self.processor = AutoImageProcessor.from_pretrained(self.model_name, cache_dir=cache_dir)
                    self.model = AutoModelForImageClassification.from_pretrained(self.model_name, cache_dir=cache_dir)
                    self.model.to(self.device)
                    self.model.eval()
                    self.is_loaded = True
                    logger.info(f"✅ Modèle Vit-BEiT chargé depuis le cache")
            except Exception as cache_error:
                logger.error(f"❌ Erreur chargement depuis le cache: {cache_error}")
                self.is_loaded = False
    
    def analyze_image(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Analyser une image avec le modèle Vit-BEiT
        
        Args:
            image: Image en format numpy array (BGR)
            
        Returns:
            Dict contenant les résultats de l'analyse
        """
        if not self.is_loaded:
            logger.warning("⚠️ Modèle Vit-BEiT non chargé, utilisation du fallback")
            return self._fallback_analysis(image)
        
        try:
            # 1. Convertir l'image pour Vit-BEiT
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(image_rgb)
            
            # 2. Prétraiter avec le processeur Vit-BEiT
            inputs = self.processor(images=pil_image, return_tensors="pt")
            inputs = {k: v.to(self.device) for k, v in inputs.items()}
            
            # 3. Inférence avec Vit-BEiT
            with torch.no_grad():
                outputs = self.model(**inputs)
                logits = outputs.logits.detach().cpu().numpy()[0]
                probabilities = torch.softmax(torch.tensor(logits), dim=0).numpy()
            
            # 4. Identifier la classe prédite par Vit-BEiT
            predicted_class_id = np.argmax(logits)
            confidence = float(probabilities[predicted_class_id])
            
            # 5. Récupérer les informations de la classe
            damage_info = self.DAMAGE_CLASSES.get(predicted_class_id, {
                "id": "unknown",
                "name": "Inconnu",
                "severity": 0.5,
                "repairable": True,
                "color": "#6b7280"
            })
            
            # 6. Récupérer le label du modèle
            model_label = self.model.config.id2label.get(str(predicted_class_id), "unknown")
            
            # 7. Déterminer les pièces touchées
            detected_parts = self._map_damage_to_parts(damage_info["id"], confidence)
            
            # 8. Calculer la sévérité globale
            severity = damage_info["severity"] * confidence
            
            # 9. Ajouter les bounding boxes (simulées pour l'instant)
            bbox = self._generate_bbox(damage_info["id"], image.shape)
            
            # 10. Générer l'analyse complète
            return {
                'success': True,
                'damage_class': damage_info["id"],
                'damage_name': damage_info["name"],
                'model_label': model_label,
                'confidence': confidence,
                'severity': severity,
                'detected_parts': detected_parts,
                'all_probabilities': {
                    self.DAMAGE_CLASSES.get(i, {}).get("id", f"class_{i}"): float(probabilities[i])
                    for i in range(len(probabilities))
                },
                'bbox': bbox,
                'analysis_time': datetime.now().isoformat(),
                'model': 'vit_beit_pretrained',
                'model_name': self.model_name,
                'device': str(self.device),
                'fallback': False
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur analyse avec Vit-BEiT: {e}")
            return self._fallback_analysis(image)
    
    def _map_damage_to_parts(self, damage_type: str, confidence: float) -> List[Dict]:
        """Mapper le type de dommage aux pièces correspondantes"""
        parts = self.PART_MAPPING.get(damage_type, [])
        
        # Si le type de dommage n'est pas reconnu, utiliser des pièces génériques
        if not parts:
            parts = [
                {"id": "carrosserie", "name": "Carrosserie", "category": "carrosserie", "cost": 500}
            ]
        
        result = []
        for part in parts:
            # Ajuster la sévérité en fonction de la confiance
            severity = min(1, 0.5 * confidence + 0.2)
            
            result.append({
                'part_id': part['id'],
                'part_name': part['name'],
                'category': part['category'],
                'cost': part['cost'],
                'repairable': True,
                'confidence': confidence * 0.85,
                'severity': severity
            })
        
        return result
    
    def _generate_bbox(self, damage_type: str, image_shape: tuple) -> List[int]:
        """Générer une bounding box basée sur le type de dommage"""
        height, width = image_shape[:2]
        
        # Simuler des positions différentes selon le type de dommage
        positions = {
            "crack": [0.1, 0.3, 0.8, 0.4],
            "scratch": [0.0, 0.2, 1.0, 0.6],
            "tire_flat": [0.7, 0.7, 0.3, 0.2],
            "dent": [0.3, 0.4, 0.4, 0.3],
            "glass_shatter": [0.1, 0.1, 0.8, 0.3],
            "lamp_broken": [0.0, 0.4, 0.2, 0.2]
        }
        
        bbox = positions.get(damage_type, [0.2, 0.2, 0.6, 0.6])
        
        # Convertir en pixels
        x = int(bbox[0] * width)
        y = int(bbox[1] * height)
        w = int(bbox[2] * width)
        h = int(bbox[3] * height)
        
        return [x, y, w, h]
    
    def _fallback_analysis(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyse de fallback quand Vit-BEiT n'est pas disponible"""
        try:
            # Détection de contours avec OpenCV
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            edges = cv2.Canny(gray, 50, 150)
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Estimer la sévérité
            contour_density = len(contours) / (image.shape[0] * image.shape[1])
            severity = min(1, contour_density * 15000)
            
            # Déterminer la classe
            if severity < 0.1:
                damage_class = "scratch"
                damage_name = "Rayure"
            elif severity < 0.3:
                damage_class = "dent"
                damage_name = "Enfoncement"
            elif severity < 0.5:
                damage_class = "crack"
                damage_name = "Fissure"
            else:
                damage_class = "glass_shatter"
                damage_name = "Vitre brisée"
            
            # Détecter les pièces
            detected_parts = self._map_damage_to_parts(damage_class, 0.6)
            
            # Bounding box
            if contours:
                largest = max(contours, key=cv2.contourArea)
                x, y, w, h = cv2.boundingRect(largest)
                bbox = [int(x), int(y), int(w), int(h)]
            else:
                bbox = [50, 50, 200, 150]
            
            return {
                'success': True,
                'damage_class': damage_class,
                'damage_name': damage_name,
                'confidence': 0.6,
                'severity': severity,
                'detected_parts': detected_parts,
                'all_probabilities': {
                    "scratch": 0.3,
                    "dent": 0.3,
                    "crack": 0.2,
                    "glass_shatter": 0.2
                },
                'bbox': bbox,
                'analysis_time': datetime.now().isoformat(),
                'model': 'fallback_opencv',
                'fallback': True
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur fallback: {e}")
            return {
                'success': False,
                'error': str(e),
                'fallback': True
            }


# ============================================
# ESTIMATEUR DE COÛTS AVEC RANDOM FOREST
# ============================================

class CostEstimatorService:
    """Service d'estimation des coûts avec Random Forest"""
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.is_loaded = False
        self.model_path = "models/cost_estimator.pkl"
        self.scaler_path = "models/cost_scaler.pkl"
        
        os.makedirs("models", exist_ok=True)
        self._load_model()
    
    def _load_model(self):
        """Charger ou créer le modèle de coût"""
        try:
            if os.path.exists(self.model_path) and os.path.exists(self.scaler_path):
                self.model = joblib.load(self.model_path)
                self.scaler = joblib.load(self.scaler_path)
                self.is_loaded = True
                logger.info("✅ Modèle de coût chargé")
            else:
                self._train_model()
        except Exception as e:
            logger.error(f"❌ Erreur chargement modèle coût: {e}")
            self._train_model()
    
    def _train_model(self):
        """Entraîner le modèle de coût"""
        try:
            # Données d'entraînement (réparations réelles)
            X_train = np.array([
                [0.1, 0.2, 45, 50, 10],
                [0.2, 0.3, 45, 80, 20],
                [0.3, 0.4, 55, 120, 35],
                [0.4, 0.4, 55, 150, 50],
                [0.5, 0.5, 65, 200, 70],
                [0.6, 0.6, 65, 280, 90],
                [0.7, 0.7, 75, 350, 110],
                [0.8, 0.8, 85, 450, 140],
                [0.9, 0.9, 95, 600, 180],
                [0.95, 0.95, 110, 800, 220],
            ])
            
            y_train = np.array([75, 120, 180, 250, 350, 480, 600, 780, 980, 1280])
            
            # Augmentation des données
            X_augmented = []
            y_augmented = []
            
            for i in range(len(X_train)):
                for _ in range(30):
                    noise = np.random.normal(0, 0.05, X_train[i].shape)
                    X_aug = X_train[i] + noise
                    y_aug = y_train[i] * (1 + np.random.normal(0, 0.1))
                    
                    X_aug[0] = max(0, min(1, X_aug[0]))
                    X_aug[1] = max(0, min(1, X_aug[1]))
                    X_aug[4] = max(0, X_aug[4])
                    y_aug = max(0, y_aug)
                    
                    X_augmented.append(X_aug)
                    y_augmented.append(y_aug)
            
            X_augmented = np.array(X_augmented)
            y_augmented = np.array(y_augmented)
            
            # Normaliser
            X_scaled = self.scaler.fit_transform(X_augmented)
            
            # Entraîner Random Forest
            self.model = RandomForestRegressor(
                n_estimators=150,
                max_depth=12,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1
            )
            self.model.fit(X_scaled, y_augmented)
            
            # Sauvegarder
            joblib.dump(self.model, self.model_path)
            joblib.dump(self.scaler, self.scaler_path)
            
            self.is_loaded = True
            logger.info("✅ Modèle de coût entraîné")
            
        except Exception as e:
            logger.error(f"❌ Erreur entraînement modèle coût: {e}")
            self.is_loaded = False
    
    def estimate_cost(self, damages: List[Dict]) -> Dict[str, Any]:
        """Estimer le coût total des réparations"""
        if not damages:
            return {
                'total_cost': 0,
                'repair_details': [],
                'parts_cost': 0,
                'labor_cost': 0,
                'confidence': 1.0,
                'currency': 'EUR'
            }
        
        total_cost = 0
        repair_details = []
        
        for damage in damages:
            part_id = damage.get('part_id')
            severity = damage.get('severity', 0.5)
            confidence = damage.get('confidence', 0.7)
            cost = damage.get('cost', 500)
            
            # Caractéristiques pour le modèle
            features = np.array([
                severity,
                0.5,  # complexité moyenne
                50,   # coût de main d'œuvre
                cost * 0.6,  # coût des pièces
                severity * 200  # surface estimée
            ]).reshape(1, -1)
            
            # Estimer le coût
            if self.is_loaded and self.model is not None:
                try:
                    features_scaled = self.scaler.transform(features)
                    estimated_cost = float(self.model.predict(features_scaled)[0])
                except Exception as e:
                    logger.warning(f"⚠️ Erreur prédiction: {e}")
                    estimated_cost = cost * (0.5 + severity * 1.5)
            else:
                estimated_cost = cost * (0.5 + severity * 1.5)
            
            # Ajuster avec la confiance
            estimated_cost *= (0.7 + 0.3 * confidence)
            total_cost += estimated_cost
            
            repair_details.append({
                'part_id': part_id,
                'part_name': damage.get('part_name', 'Pièce'),
                'severity': severity,
                'confidence': confidence,
                'estimated_cost': round(estimated_cost, 2),
                'parts_cost': round(estimated_cost * 0.6, 2),
                'labor_cost': round(estimated_cost * 0.4, 2)
            })
        
        return {
            'total_cost': round(total_cost, 2),
            'repair_details': repair_details,
            'parts_cost': round(total_cost * 0.6, 2),
            'labor_cost': round(total_cost * 0.4, 2),
            'confidence': 0.85,
            'currency': 'EUR'
        }


# ============================================
# SINGLETONS
# ============================================

_damage_service = None
_cost_service = None

def get_damage_service() -> PretrainedDamageDetector:
    """Obtenir l'instance du service de détection Vit-BEiT"""
    global _damage_service
    if _damage_service is None:
        _damage_service = PretrainedDamageDetector()
    return _damage_service

def get_cost_service() -> CostEstimatorService:
    """Obtenir l'instance du service d'estimation"""
    global _cost_service
    if _cost_service is None:
        _cost_service = CostEstimatorService()
    return _cost_service




def analyze_image_aggressive(self, image: np.ndarray) -> Dict[str, Any]:
    """
    Version agressive de l'analyse qui détecte même les dommages subtils
    """
    if not self.is_loaded:
        return self._fallback_analysis(image)
    
    try:
        # Multiples prétraitements
        image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        pil_image = Image.fromarray(image_rgb)
        
        # 1. Analyse standard
        inputs = self.processor(images=pil_image, return_tensors="pt")
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits.detach().cpu().numpy()[0]
            probabilities = torch.softmax(torch.tensor(logits), dim=0).numpy()
        
        # 2. Analyse des contours pour détecter les dommages subtils
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, 30, 100)
        
        contour_density = np.sum(edges > 0) / (image.shape[0] * image.shape[1])
        
        # 3. Combiner les résultats
        predicted_class_id = np.argmax(logits)
        model_confidence = float(probabilities[predicted_class_id])
        
        # Si la détection est faible mais qu'il y a des contours, forcer une détection
        if model_confidence < 0.3 and contour_density > 0.01:
            # Forcer la détection du type le plus probable basé sur les contours
            damage_info = self.DAMAGE_CLASSES.get(3, {"id": "dent", "name": "Enfoncement", "severity": 0.5})
            confidence = max(0.4, min(0.7, contour_density * 50))
            severity = damage_info["severity"] * confidence
        else:
            damage_info = self.DAMAGE_CLASSES.get(predicted_class_id, {
                "id": "unknown",
                "name": "Inconnu",
                "severity": 0.5,
                "repairable": True
            })
            confidence = model_confidence
            severity = damage_info["severity"] * confidence
        
        detected_parts = self._map_damage_to_parts(damage_info["id"], confidence)
        
        return {
            'success': True,
            'damage_class': damage_info["id"],
            'damage_name': damage_info["name"],
            'confidence': confidence,
            'severity': severity,
            'detected_parts': detected_parts,
            'analysis_time': datetime.now().isoformat(),
            'model': 'vit_beit_aggressive',
            'fallback': False
        }
        
    except Exception as e:
        logger.error(f"❌ Erreur analyse agressive: {e}")
        return self._fallback_analysis(image)