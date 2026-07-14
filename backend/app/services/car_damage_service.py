# backend/app/services/car_damage_service.py
import cv2
import numpy as np
from PIL import Image, ImageDraw
import io
import base64
from typing import List, Dict, Any
import warnings
import torch
import torch.nn as nn
import torch.nn.functional as F
import os
import logging
logger = logging.getLogger(__name__)
warnings.filterwarnings("ignore")

# ============================================
# CNN POUR LA DÉTECTION DE DÉGÂTS
# ============================================

class DamageCNN(nn.Module):
    """CNN simple mais efficace pour la détection de dégâts"""
    def __init__(self):
        super(DamageCNN, self).__init__()
        # Couches de convolution
        self.conv1 = nn.Conv2d(3, 32, 3, padding=1)
        self.bn1 = nn.BatchNorm2d(32)
        self.conv2 = nn.Conv2d(32, 64, 3, padding=1)
        self.bn2 = nn.BatchNorm2d(64)
        self.conv3 = nn.Conv2d(64, 128, 3, padding=1)
        self.bn3 = nn.BatchNorm2d(128)
        self.conv4 = nn.Conv2d(128, 256, 3, padding=1)
        self.bn4 = nn.BatchNorm2d(256)
        
        self.pool = nn.MaxPool2d(2, 2)
        self.dropout = nn.Dropout(0.5)
        
        # Couches fully connected
        self.fc1 = nn.Linear(256 * 8 * 8, 512)
        self.fc2 = nn.Linear(512, 128)
        self.fc3 = nn.Linear(128, 1)
    
    def forward(self, x):
        x = self.pool(F.relu(self.bn1(self.conv1(x))))
        x = self.pool(F.relu(self.bn2(self.conv2(x))))
        x = self.pool(F.relu(self.bn3(self.conv3(x))))
        x = self.pool(F.relu(self.bn4(self.conv4(x))))
        x = x.view(-1, 256 * 8 * 8)
        x = F.relu(self.fc1(x))
        x = self.dropout(x)
        x = F.relu(self.fc2(x))
        x = self.dropout(x)
        x = torch.sigmoid(self.fc3(x))
        return x


class CarDamageDetector:
    """
    Détecteur de dégâts automobiles avec CNN (PyTorch)
    """
    
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.input_size = (128, 128)
        self.load_model()
        logger.info(f"✅ Service de détection automobile CNN sur {self.device}")
    
    def load_model(self):
        """Charge ou crée le modèle CNN"""
        try:
            self.model = DamageCNN().to(self.device)
            
            # Charger les poids pré-entraînés si disponibles
            weights_path = "models/damage_cnn_weights.pth"
            if os.path.exists(weights_path):
                self.model.load_state_dict(torch.load(weights_path, map_location=self.device))
                logger.info("✅ Poids du CNN chargés")
            else:
                logger.warning("⚠️ Aucun poids trouvé, utilisation du CNN non entraîné")
                # Créer le dossier models
                os.makedirs("models", exist_ok=True)
            
            self.model.eval()
            
        except Exception as e:
            logger.error(f"⚠️ Erreur chargement CNN: {e}")
            self.model = None
    
    def save_weights(self):
        """Sauvegarde les poids du modèle"""
        if self.model:
            os.makedirs("models", exist_ok=True)
            torch.save(self.model.state_dict(), "models/damage_cnn_weights.pth")
            logger.info("✅ Poids sauvegardés")
    
    def preprocess_patch(self, patch: np.ndarray) -> torch.Tensor:
        """Prétraite un patch pour le CNN"""
        # Redimensionner
        patch_resized = cv2.resize(patch, self.input_size)
        # Normaliser
        patch_normalized = patch_resized.astype(np.float32) / 255.0
        # Convertir en tensor (C, H, W)
        patch_tensor = torch.from_numpy(patch_normalized).permute(2, 0, 1).unsqueeze(0)
        return patch_tensor.to(self.device)
    
    def detect_damage(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Détection des dégâts avec CNN
        """
        try:
            # Charger l'image
            image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            h, w = img_cv.shape[:2]
            
            # Redimensionner
            if max(h, w) > 800:
                scale = 800 / max(h, w)
                new_w = int(w * scale)
                new_h = int(h * scale)
                img_cv = cv2.resize(img_cv, (new_w, new_h))
                h, w = new_h, new_w
            
            # Détection par patchs avec CNN
            damage_zones = self._detect_by_cnn_patches(img_cv)
            
            # Filtrer les faux positifs
            damage_zones = self._filter_by_cnn_confidence(damage_zones)
            
            # Calcul du coût
            total_cost = sum(z['estimated_cost'] for z in damage_zones)
            
            # Niveau de dégâts
            if not damage_zones:
                damage_level = 'aucun'
                confidence = 100
            else:
                avg_cnn_score = sum(z['cnn_score'] for z in damage_zones) / len(damage_zones)
                if avg_cnn_score > 0.7:
                    damage_level = 'critique'
                elif avg_cnn_score > 0.4:
                    damage_level = 'modere'
                else:
                    damage_level = 'mineur'
                confidence = min(95, avg_cnn_score * 100 + 20)
            
            # Détections formatées
            detections = []
            for i, zone in enumerate(damage_zones, 1):
                detections.append({
                    'id': i,
                    'damage_area': zone['zone'],
                    'confidence': zone['confidence'],
                    'zone': zone['zone'],
                    'estimated_cost': zone['estimated_cost'],
                    'severity': zone['severity'],
                    'repair_suggestion': self._get_repair_suggestion(zone['severity'])
                })
            
            # Annoter l'image
            pil_image = Image.fromarray(cv2.cvtColor(img_cv, cv2.COLOR_BGR2RGB))
            annotated_image = self._draw_damage_boxes(pil_image, damage_zones, damage_level)
            
            # Assurance
            franchise = 100 if total_cost > 0 else 0
            insurance_coverage = max(0, total_cost - franchise)
            
            return {
                'success': True,
                'has_damage': total_cost > 0,
                'detections': detections,
                'damage_count': len(damage_zones),
                'damage_level': damage_level,
                'total_estimated_cost': total_cost,
                'franchise': franchise,
                'insurance_coverage': insurance_coverage,
                'remaining_to_pay': min(total_cost, franchise),
                'annotated_image': annotated_image,
                'confidence': round(confidence, 2)
            }
            
        except Exception as e:
            logger.error(f"Erreur: {e}")
            return {
                'success': False,
                'has_damage': False,
                'error': str(e),
                'detections': [],
                'damage_count': 0,
                'total_estimated_cost': 0,
                'annotated_image': None
            }
    
    def _detect_by_cnn_patches(self, image: np.ndarray) -> List[Dict]:
        """
        Détection par patchs avec CNN
        """
        h, w = image.shape[:2]
        patch_size = 64
        step = 32
        
        damage_zones = []
        
        with torch.no_grad():
            for y in range(0, h - patch_size + 1, step):
                for x in range(0, w - patch_size + 1, step):
                    patch = image[y:y+patch_size, x:x+patch_size]
                    
                    # Prédiction CNN
                    patch_input = self.preprocess_patch(patch)
                    
                    if self.model:
                        cnn_score = float(self.model(patch_input).cpu().numpy()[0][0])
                    else:
                        # Fallback: analyse de texture simple
                        gray = cv2.cvtColor(patch, cv2.COLOR_BGR2GRAY)
                        edges = cv2.Canny(gray, 50, 150)
                        cnn_score = min(0.9, np.sum(edges > 0) / (patch_size * patch_size) * 3)
                    
                    # Seuil de détection CNN
                    if cnn_score > 0.35:
                        center_x = x + patch_size/2
                        center_y = y + patch_size/2
                        
                        if center_x < w/2:
                            zone_name = 'avant_gauche' if center_y < h/2 else 'arriere_gauche'
                        else:
                            zone_name = 'avant_droit' if center_y < h/2 else 'arriere_droit'
                        
                        severity = min(100, int(cnn_score * 100))
                        confidence = min(95, int(40 + cnn_score * 55))
                        estimated_cost = int(150 + cnn_score * 350)
                        
                        damage_zones.append({
                            'zone': zone_name,
                            'confidence': confidence,
                            'severity': severity,
                            'estimated_cost': estimated_cost,
                            'bbox': [x, y, x + patch_size, y + patch_size],
                            'cnn_score': cnn_score
                        })
        
        # Fusionner les patchs proches
        damage_zones = self._merge_nearby_patches(damage_zones)
        
        # Trier par score CNN
        damage_zones.sort(key=lambda x: x['cnn_score'], reverse=True)
        
        return damage_zones[:6]  # Limiter à 6 zones
    
    def _filter_by_cnn_confidence(self, zones: List[Dict]) -> List[Dict]:
        """Filtre les zones avec score CNN trop bas"""
        return [z for z in zones if z['cnn_score'] > 0.4]
    
    def _merge_nearby_patches(self, zones: List[Dict], distance_threshold: int = 40) -> List[Dict]:
        """Fusionne les patches proches"""
        if len(zones) <= 1:
            return zones
        
        merged = []
        used = set()
        
        for i, zone1 in enumerate(zones):
            if i in used:
                continue
            
            bbox1 = zone1['bbox']
            group = [zone1]
            used.add(i)
            
            for j, zone2 in enumerate(zones[i+1:], i+1):
                if j in used:
                    continue
                
                bbox2 = zone2['bbox']
                
                cx1 = (bbox1[0] + bbox1[2]) / 2
                cy1 = (bbox1[1] + bbox1[3]) / 2
                cx2 = (bbox2[0] + bbox2[2]) / 2
                cy2 = (bbox2[1] + bbox2[3]) / 2
                
                distance = np.sqrt((cx2 - cx1)**2 + (cy2 - cy1)**2)
                
                if distance < distance_threshold:
                    group.append(zone2)
                    used.add(j)
            
            if len(group) > 1:
                min_x = min(z['bbox'][0] for z in group)
                min_y = min(z['bbox'][1] for z in group)
                max_x = max(z['bbox'][2] for z in group)
                max_y = max(z['bbox'][3] for z in group)
                
                avg_score = sum(z['cnn_score'] for z in group) / len(group)
                avg_severity = sum(z['severity'] for z in group) / len(group)
                avg_confidence = sum(z['confidence'] for z in group) / len(group)
                total_cost = sum(z['estimated_cost'] for z in group)
                
                merged.append({
                    'zone': group[0]['zone'],
                    'confidence': min(95, int(avg_confidence)),
                    'severity': int(avg_severity),
                    'estimated_cost': total_cost,
                    'bbox': [min_x, min_y, max_x, max_y],
                    'cnn_score': avg_score
                })
            else:
                merged.append(zone1)
        
        return merged
    
    def _draw_damage_boxes(self, image: Image.Image, damage_zones: List, damage_level: str) -> str:
        """Dessine les cadres"""
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        draw = ImageDraw.Draw(image)
        
        colors = {
            'critique': (255, 0, 0),
            'modere': (255, 165, 0),
            'mineur': (255, 255, 0),
            'aucun': (0, 255, 0)
        }
        
        color = colors.get(damage_level, (255, 0, 0))
        
        for zone in damage_zones:
            bbox = zone['bbox']
            x1, y1, x2, y2 = bbox
            draw.rectangle([x1, y1, x2, y2], outline=color, width=3)
            
            label = f"{zone['zone']} ({zone['confidence']:.0f}%)"
            draw.rectangle([x1, y1 - 18, x1 + 85, y1], fill=color)
            draw.text((x1 + 3, y1 - 16), label, fill=(255, 255, 255))
        
        draw.rectangle([0, 0, image.width, 35], fill=(0, 0, 0))
        
        if damage_level == 'aucun':
            draw.text((10, 8), "✅ AUCUN DEGAT DETECTE", fill=(0, 255, 0))
        else:
            draw.text((10, 8), f"⚠️ {damage_level.upper()} - {len(damage_zones)} zone(s)", fill=color)
        
        buffer = io.BytesIO()
        image.save(buffer, format='PNG')
        return base64.b64encode(buffer.getvalue()).decode('utf-8')
    
    def _get_repair_suggestion(self, severity: int) -> str:
        if severity > 70:
            return "Expertise urgente requise"
        elif severity > 40:
            return "Rendez-vous carrosserie recommandé"
        else:
            return "Petite réparation"


car_detector = CarDamageDetector()