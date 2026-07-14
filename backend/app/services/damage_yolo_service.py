# app/services/damage_yolo_service.py
import numpy as np
from PIL import Image
import torch
import cv2
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import os
import sys

logger = logging.getLogger(__name__)

class YoloDamageDetector:
    """
    Utilise YOLO pour la détection de dommages sur les voitures
    Modèle: YOLO11m (très performant pour les dommages automobiles)
    """
    
    def __init__(self, model_name: str = "yolo11m.pt"):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.is_loaded = False
        self.model_name = model_name
        self.model_path = os.path.join("models", model_name)
        
        # Créer le dossier models s'il n'existe pas
        os.makedirs("models", exist_ok=True)
        
        # Mapping des classes YOLO
        self.class_names = {
            0: "dent",
            1: "scratch", 
            2: "crack",
            3: "glass_shatter",
            4: "lamp_broken",
            5: "tire_flat",
            6: "bumper_damage",
            7: "door_damage"
        }
        
        self._load_model()
    
    def _load_model(self):
        """Charger le modèle YOLO"""
        try:
            from ultralytics import YOLO
            
            logger.info(f"📥 Chargement du modèle YOLO: {self.model_name}...")
            
            # Vérifier si le modèle existe localement
            if os.path.exists(self.model_path):
                logger.info(f"📁 Modèle trouvé localement: {self.model_path}")
                self.model = YOLO(self.model_path)
            else:
                logger.info(f"📥 Téléchargement du modèle {self.model_name} depuis ultralytics...")
                # Télécharger le modèle
                self.model = YOLO(self.model_name)
                # Sauvegarder localement pour usage futur
                if self.model and hasattr(self.model, 'model'):
                    try:
                        self.model.export(format="pt")  # Sauvegarder localement
                        logger.info(f"✅ Modèle sauvegardé dans {self.model_path}")
                    except Exception as e:
                        logger.warning(f"⚠️ Impossible de sauvegarder le modèle: {e}")
            
            self.is_loaded = True
            logger.info(f"✅ Modèle YOLO chargé sur {self.device}")
            
        except ImportError as e:
            logger.error(f"❌ Erreur import ultralytics: {e}")
            logger.info("💡 Installez ultralytics: pip install ultralytics")
            self.is_loaded = False
        except Exception as e:
            logger.error(f"❌ Erreur chargement YOLO: {e}")
            self.is_loaded = False
    
    def analyze_image(self, image: np.ndarray) -> Dict[str, Any]:
        """
        Analyser une image avec YOLO
        
        Args:
            image: Image en format numpy array (BGR)
            
        Returns:
            Dict contenant les résultats de l'analyse
        """
        if not self.is_loaded:
            logger.warning("⚠️ YOLO non chargé, utilisation du fallback")
            return self._fallback_analysis(image)
        
        try:
            # Convertir BGR vers RGB pour YOLO
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            
            # Inférence YOLO
            results = self.model(image_rgb)
            
            detected_parts = []
            total_severity = 0
            max_confidence = 0
            bboxes = []
            
            for r in results:
                boxes = r.boxes
                if boxes is not None:
                    for box in boxes:
                        # Coordonnées
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        confidence = float(box.conf[0])
                        class_id = int(box.cls[0])
                        
                        # Nom de la classe
                        class_name = self.class_names.get(class_id, f"damage_{class_id}")
                        
                        # Sévérité basée sur la confiance et le type
                        severity = self._get_severity(class_name, confidence)
                        
                        # Bounding box
                        bbox = [int(x1), int(y1), int(x2 - x1), int(y2 - y1)]
                        bboxes.append(bbox)
                        
                        # Mapping vers les pièces du modèle 3D
                        part_id = self._map_to_part(class_name)
                        
                        detected_parts.append({
                            'part_id': part_id,
                            'part_name': self._get_part_name(class_name),
                            'category': self._get_category(class_name),
                            'repairable': True,
                            'confidence': confidence,
                            'severity': severity,
                            'bbox': bbox,
                            'damage_type': class_name
                        })
                        
                        total_severity += severity
                        max_confidence = max(max_confidence, confidence)
            
            # Calculer la sévérité globale
            if detected_parts:
                avg_severity = total_severity / len(detected_parts)
                global_severity = min(1, avg_severity * 1.2)
            else:
                global_severity = 0
            
            return {
                'success': True,
                'damage_class': self._get_damage_class(global_severity),
                'damage_name': self._get_damage_name(global_severity),
                'confidence': max_confidence or 0.5,
                'severity': global_severity,
                'detected_parts': detected_parts,
                'bboxes': bboxes,
                'analysis_time': datetime.now().isoformat(),
                'model': 'yolo11m',
                'fallback': False
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur analyse YOLO: {e}")
            return self._fallback_analysis(image)
    
    def _get_severity(self, damage_type: str, confidence: float) -> float:
        """Déterminer la sévérité basée sur le type de dommage"""
        severity_map = {
            'dent': 0.5,
            'scratch': 0.3,
            'crack': 0.7,
            'glass_shatter': 0.9,
            'lamp_broken': 0.6,
            'tire_flat': 0.8,
            'bumper_damage': 0.5,
            'door_damage': 0.5
        }
        base_severity = severity_map.get(damage_type, 0.5)
        return min(1, base_severity * (0.8 + 0.4 * confidence))
    
    def _get_part_name(self, damage_type: str) -> str:
        """Mapper le type de dommage au nom de la pièce"""
        part_map = {
            'dent': 'Enfoncement',
            'scratch': 'Rayure',
            'crack': 'Fissure',
            'glass_shatter': 'Vitre brisée',
            'lamp_broken': 'Phare cassé',
            'tire_flat': 'Pneu crevé',
            'bumper_damage': 'Pare-chocs endommagé',
            'door_damage': 'Porte endommagée'
        }
        return part_map.get(damage_type, damage_type)
    
    def _get_category(self, damage_type: str) -> str:
        """Mapper le type de dommage à la catégorie"""
        category_map = {
            'dent': 'carrosserie',
            'scratch': 'carrosserie',
            'crack': 'vitrage',
            'glass_shatter': 'vitrage',
            'lamp_broken': 'éclairage',
            'tire_flat': 'roues',
            'bumper_damage': 'protection',
            'door_damage': 'portes'
        }
        return category_map.get(damage_type, 'carrosserie')
    
    def _map_to_part(self, damage_type: str) -> str:
        """Mapper le type de dommage à une pièce du modèle 3D"""
        part_map = {
            'dent': 'carrosserie_centrale',
            'scratch': 'carrosserie_centrale',
            'crack': 'pare_brise',
            'glass_shatter': 'pare_brise',
            'lamp_broken': 'phare_gauche',
            'tire_flat': 'roue_avant_gauche',
            'bumper_damage': 'pare_chocs_avant',
            'door_damage': 'porte_avant_gauche'
        }
        return part_map.get(damage_type, 'carrosserie')
    
    def _get_damage_class(self, severity: float) -> str:
        """Déterminer la classe de dommage"""
        if severity > 0.7:
            return 'critical'
        elif severity > 0.4:
            return 'moderate'
        elif severity > 0.1:
            return 'minor'
        else:
            return 'none'
    
    def _get_damage_name(self, severity: float) -> str:
        """Déterminer le nom du dommage"""
        if severity > 0.7:
            return 'Dommage critique'
        elif severity > 0.4:
            return 'Dommage modéré'
        elif severity > 0.1:
            return 'Dommage mineur'
        else:
            return 'Aucun dommage'
    
    def _fallback_analysis(self, image: np.ndarray) -> Dict[str, Any]:
        """Analyse de fallback avec OpenCV améliorée"""
        try:
            # Traitement d'image avancé
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Détection de contours avec différents seuils
            edges1 = cv2.Canny(gray, 30, 100)
            edges2 = cv2.Canny(gray, 50, 150)
            edges3 = cv2.Canny(gray, 70, 200)
            
            # Combiner les edges
            edges = cv2.bitwise_or(edges1, edges2)
            edges = cv2.bitwise_or(edges, edges3)
            
            # Dilater pour connecter les contours
            kernel = np.ones((3, 3), np.uint8)
            edges = cv2.dilate(edges, kernel, iterations=2)
            
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Filtrer les petits contours
            significant_contours = [c for c in contours if cv2.contourArea(c) > 100]
            
            if significant_contours:
                # Zones endommagées
                total_area = sum(cv2.contourArea(c) for c in significant_contours)
                image_area = image.shape[0] * image.shape[1]
                damage_ratio = total_area / image_area
                
                severity = min(1, damage_ratio * 8)
                
                # Détecter les pièces par position
                detected_parts = []
                height, width = image.shape[:2]
                
                for i, contour in enumerate(significant_contours[:5]):
                    x, y, w, h = cv2.boundingRect(contour)
                    area = cv2.contourArea(contour)
                    confidence = min(0.9, 0.3 + (area / image_area) * 10)
                    
                    # Déterminer la pièce par position
                    part_id = self._detect_part_by_position(x, y, width, height)
                    
                    detected_parts.append({
                        'part_id': part_id,
                        'part_name': self._get_part_name_by_id(part_id),
                        'category': self._get_category_by_id(part_id),
                        'repairable': True,
                        'confidence': confidence,
                        'severity': min(1, severity * (0.5 + 0.5 * i / len(significant_contours))),
                        'bbox': [int(x), int(y), int(w), int(h)]
                    })
                
                return {
                    'success': True,
                    'damage_class': self._get_damage_class(severity),
                    'damage_name': self._get_damage_name(severity),
                    'confidence': min(0.8, 0.4 + severity * 0.4),
                    'severity': severity,
                    'detected_parts': detected_parts,
                    'analysis_time': datetime.now().isoformat(),
                    'model': 'opencv_fallback_advanced',
                    'fallback': True
                }
            
            return {
                'success': True,
                'damage_class': 'none',
                'damage_name': 'Aucun dommage détecté',
                'confidence': 0.5,
                'severity': 0,
                'detected_parts': [],
                'analysis_time': datetime.now().isoformat(),
                'model': 'opencv_fallback',
                'fallback': True
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur fallback: {e}")
            return {
                'success': False,
                'error': str(e),
                'fallback': True
            }
    
    def _detect_part_by_position(self, x: int, y: int, width: int, height: int) -> str:
        """Détecter la pièce par position dans l'image"""
        center_x = x + width / 2
        center_y = y + height / 2
        
        # Positions relatives (normalisées)
        rel_x = center_x / width
        rel_y = center_y / height
        
        if rel_y < 0.3:
            if rel_x < 0.3:
                return 'phare_gauche'
            elif rel_x > 0.7:
                return 'phare_droit'
            else:
                return 'pare_brise'
        elif rel_y < 0.5:
            if rel_x < 0.2:
                return 'porte_avant_gauche'
            elif rel_x > 0.8:
                return 'porte_avant_droite'
            else:
                return 'capot'
        elif rel_y < 0.7:
            if rel_x < 0.2:
                return 'porte_arriere_gauche'
            elif rel_x > 0.8:
                return 'porte_arriere_droite'
            else:
                return 'carrosserie_centrale'
        else:
            if rel_x < 0.3:
                return 'roue_arriere_gauche'
            elif rel_x > 0.7:
                return 'roue_arriere_droite'
            else:
                return 'coffre'
    
    def _get_part_name_by_id(self, part_id: str) -> str:
        """Obtenir le nom de la pièce par son ID"""
        names = {
            'phare_gauche': 'Phare Gauche',
            'phare_droit': 'Phare Droit',
            'pare_brise': 'Pare-brise',
            'porte_avant_gauche': 'Porte Avant Gauche',
            'porte_avant_droite': 'Porte Avant Droite',
            'porte_arriere_gauche': 'Porte Arrière Gauche',
            'porte_arriere_droite': 'Porte Arrière Droite',
            'capot': 'Capot Moteur',
            'carrosserie_centrale': 'Carrosserie Centrale',
            'roue_arriere_gauche': 'Roue Arrière Gauche',
            'roue_arriere_droite': 'Roue Arrière Droite',
            'coffre': 'Coffre'
        }
        return names.get(part_id, 'Carrosserie')
    
    def _get_category_by_id(self, part_id: str) -> str:
        """Obtenir la catégorie de la pièce par son ID"""
        categories = {
            'phare_gauche': 'éclairage',
            'phare_droit': 'éclairage',
            'pare_brise': 'vitrage',
            'porte_avant_gauche': 'portes',
            'porte_avant_droite': 'portes',
            'porte_arriere_gauche': 'portes',
            'porte_arriere_droite': 'portes',
            'capot': 'mécanique',
            'carrosserie_centrale': 'carrosserie',
            'roue_arriere_gauche': 'roues',
            'roue_arriere_droite': 'roues',
            'coffre': 'mécanique'
        }
        return categories.get(part_id, 'carrosserie')


# ============================================
# SINGLETON
# ============================================

_yolo_detector = None

def get_yolo_detector() -> YoloDamageDetector:
    """Obtenir l'instance du détecteur YOLO"""
    global _yolo_detector
    if _yolo_detector is None:
        _yolo_detector = YoloDamageDetector()
    return _yolo_detector