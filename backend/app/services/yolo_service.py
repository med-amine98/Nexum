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
import cv2
from ultralytics import YOLO

logger = logging.getLogger(__name__)

class YOLODamageDetector:
    def __init__(self):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        
        # ---------- Modèles pour les dégâts automobiles ----------
        self.yolo_model = None          # YOLO pour détection de dégâts
        self.class_names_yolo = {}      # Classes du modèle YOLO
        
        # Modèle CNN pour la sévérité globale (2 ou 4 classes)
        self.cnn_model = None
        self.cnn_transform = None
        self.cnn_num_classes = 2
        self.class_names = ['normal', 'severe']  # sera mis à jour
        self.class_severity_scores = {
            'normal': 0,
            'minor': 30,
            'moderate': 65,
            'severe': 90
        }
        
        # ---------- Modèle pour les catastrophes naturelles ----------
        self.disaster_model = None
        self.disaster_transform = None
        self.disaster_class_names = []  # Sera rempli par le modèle
        
        # Mapping français des classes de catastrophes (exemple)
        self.disaster_display_names = {
            'cyclone': 'Cyclone',
            'wildfire': 'Incendie',
            'flood': 'Inondation',
            'earthquake': 'Tremblement de terre',
            # Ajoutez d'autres si votre modèle les contient
        }
        
        # ---------- Configurations des coûts (dégâts auto) ----------
        self.damage_display_names = {
            'crack': 'Fissure',
            'dent': 'Bosse',
            'glass shatter': 'Vitre brisée',
            'lamp broken': 'Lampe cassée',
            'scratch': 'Rayure',
            'tire flat': 'Pneu crevé'
        }
        self.damage_costs = {
            'crack': 500,
            'dent': 300,
            'glass shatter': 800,
            'lamp broken': 450,
            'scratch': 150,
            'tire flat': 200
        }
        
        logger.info("=" * 50)
        logger.info("INITIALISATION DU SERVICE MULTI-MODÈLES")
        logger.info("=" * 50)
        
        # Chargement de tous les modèles
        self.load_yolo_model()        # Dégâts auto (YOLO)
        self.load_cnn_model()         # Sévérité globale (CNN)
        self.load_disaster_model()    # Catastrophes naturelles (ResNet)
        
        logger.info(f"Service initialisé sur {self.device}")
        logger.info("=" * 50)
    
    # ========================================================
    # 1. MODÈLE YOLO – DÉTECTION DE DÉGÂTS AUTOMOBILES
    # ========================================================
    def load_yolo_model(self):
        """Charger le modèle YOLO (local ou depuis Hugging Face)."""
        # 1. Chercher un fichier local
        local_paths = [
            Path("models/car_damage_yolo.pt"),
            Path("/app/models/car_damage_yolo.pt"),
            Path("car_damage_yolo.pt")
        ]
        for p in local_paths:
            if p.exists():
                try:
                    logger.info(f"📁 Chargement YOLO local depuis: {p}")
                    self.yolo_model = YOLO(str(p))
                    self.class_names_yolo = self.yolo_model.names
                    logger.info(f"✅ YOLO local chargé ({len(self.class_names_yolo)} classes)")
                    return
                except Exception as e:
                    logger.error(f"❌ Erreur chargement YOLO local: {e}")
                    # On continue vers le fallback
        
        # 2. Tentative depuis Hugging Face
        try:
            logger.info("📥 Téléchargement YOLO depuis Hugging Face...")
            self.yolo_model = YOLO('harpreetsahota/car-dd-segmentation-yolov11')
            self.class_names_yolo = self.yolo_model.names
            logger.info(f"✅ YOLO HF chargé ({len(self.class_names_yolo)} classes)")
            return
        except Exception as e:
            logger.error(f"❌ Erreur chargement YOLO HF: {e}")
        
        # 3. Fallback ultime
        try:
            logger.warning("⚠️ Utilisation de yolov8n.pt comme fallback")
            self.yolo_model = YOLO('yolov8n.pt')
            self.class_names_yolo = self.yolo_model.names
            logger.info("✅ Fallback YOLO chargé")
        except Exception as e:
            logger.error(f"❌ Échec du fallback YOLO: {e}")
            self.yolo_model = None
            self.class_names_yolo = {}
    
    # ========================================================
    # 2. MODÈLE CNN – SÉVÉRITÉ GLOBALE
    # ========================================================
    def load_cnn_model(self):
        """Charger le modèle CNN (2 ou 4 classes) pour la sévérité globale."""
        try:
            model_paths = [
                Path("/app/models/damage_cnn.pth"),
                Path("./models/damage_cnn.pth"),
                Path("damage_cnn.pth"),
                Path("../models/damage_cnn.pth")
            ]
            model_path = None
            for p in model_paths:
                if p.exists():
                    model_path = p
                    break
            if model_path is None:
                logger.warning("⚠️ Modèle CNN non trouvé")
                self.cnn_model = None
                return
            
            logger.info(f"📁 Chargement CNN depuis: {model_path}")
            checkpoint = torch.load(model_path, map_location=self.device)
            
            # Déterminer le nombre de classes
            state_dict = checkpoint.get('model_state_dict', checkpoint)
            num_classes = None
            for key in state_dict.keys():
                if 'fc.weight' in key or 'classifier.weight' in key:
                    num_classes = state_dict[key].shape[0]
                    break
            if num_classes is None:
                num_classes = 2
                logger.warning(f"⚠️ Nombre de classes non détecté, supposé {num_classes}")
            
            self.cnn_num_classes = num_classes
            self.class_names = ['normal', 'severe'] if num_classes == 2 else ['normal', 'minor', 'moderate', 'severe']
            logger.info(f"📊 CNN : {num_classes} classes")
            
            # Créer le modèle avec le bon nombre de classes
            model = models.resnet18(weights=None)
            in_features = model.fc.in_features
            model.fc = nn.Sequential(
                nn.Dropout(0.3),
                nn.Linear(in_features, 256),
                nn.ReLU(),
                nn.Dropout(0.2),
                nn.Linear(256, num_classes)
            )
            model.load_state_dict(state_dict, strict=False)
            model.to(self.device)
            model.eval()
            self.cnn_model = model
            
            self.cnn_transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
            ])
            logger.info("✅ CNN chargé")
        except Exception as e:
            logger.error(f"❌ Erreur chargement CNN: {e}")
            self.cnn_model = None
    
    # ========================================================
    # 3. MODÈLE RESNET – CLASSIFICATION CATASTROPHES
    # ========================================================
    def load_disaster_model(self):
        """Charger le modèle ResNet18 entraîné sur les catastrophes."""
        try:
            model_paths = [
                Path("/app/models/best_disaster_model.pth"),
                Path("./models/best_disaster_model.pth"),
                Path("best_disaster_model.pth"),
                Path("../models/best_disaster_model.pth")
            ]
            model_path = None
            for p in model_paths:
                if p.exists():
                    model_path = p
                    break
            if model_path is None:
                logger.warning("⚠️ Modèle catastrophes non trouvé")
                self.disaster_model = None
                return
            
            logger.info(f"📁 Chargement catastrophes depuis: {model_path}")
            # Charger le checkpoint
            state_dict = torch.load(model_path, map_location=self.device)
            
            # Créer le modèle ResNet18 (identique à l'entraînement)
            model = models.resnet18(weights=None)
            # Déterminer le nombre de classes à partir de la taille de la dernière couche
            # Si state_dict contient 'fc.weight', on peut deviner
            num_classes = None
            for key in state_dict.keys():
                if 'fc.weight' in key:
                    num_classes = state_dict[key].shape[0]
                    break
            if num_classes is None:
                # Fallback : supposer 4 classes (cyclone, wildfire, flood, earthquake)
                num_classes = 4
                logger.warning(f"⚠️ Nombre de classes non détecté, supposé {num_classes}")
            model.fc = nn.Linear(512, num_classes)
            model.load_state_dict(state_dict)
            model.to(self.device)
            model.eval()
            self.disaster_model = model
            
            # Définir les noms des classes si connus
            # Si le modèle a été entraîné avec le dataset rupakroy, les classes sont :
            # cyclone, wildfire, flood, earthquake (ordre alphabétique)
            # On peut les stocker dans un attribut
            self.disaster_class_names = ['cyclone', 'wildfire', 'flood', 'earthquake'][:num_classes]
            logger.info(f"✅ Modèle catastrophes chargé ({num_classes} classes)")
            self.disaster_transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
            ])
        except Exception as e:
            logger.error(f"❌ Erreur chargement catastrophes: {e}")
            self.disaster_model = None
    
    # ========================================================
    # MÉTHODES D'ANALYSE
    # ========================================================
    
    # ---- DÉTECTION DE DÉGÂTS AUTOMOBILES ----
    async def analyze_damage(self, image_data: bytes) -> dict:
        """Analyse d'image pour détecter les dégâts automobiles."""
        try:
            image = Image.open(io.BytesIO(image_data)).convert('RGB')
            width, height = image.size
            image_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            # 1. Sévérité globale (CNN)
            cnn_result = await self._classify_with_cnn(image)
            severity_class = cnn_result.get('class', 'moderate')
            cnn_confidence = cnn_result.get('confidence', 0.7)
            
            # 2. Détection YOLO
            yolo_result = await self._detect_with_yolo(image_cv, width, height)
            detected_damages = yolo_result.get('detected_damages', [])
            
            # 3. Si aucun dégât et CNN normal
            if not detected_damages and severity_class == 'normal':
                return self._empty_result(image, "Aucun dégât détecté ✅", "Véhicule en bon état")
            
            # 4. Construire les pièces endommagées
            damaged_parts = []
            repair_details = []
            total_cost = 0
            total_time = 0
            
            for det in detected_damages:
                damage_type = det["type"]
                bbox = det["bbox"]
                confidence = det["confidence"]
                severity = severity_class
                cost = self._estimate_cost_for_damage(damage_type, severity)
                repair_time = 2.0
                display_name = self._get_display_name(damage_type)
                damaged_parts.append({
                    "part": display_name,
                    "confidence": confidence,
                    "bbox": bbox,
                    "severity": severity,
                    "type": damage_type,
                    "estimated_cost": cost
                })
                repair_details.append({
                    "part": damage_type,
                    "estimated_cost": cost,
                    "repair_time": repair_time,
                    "severity": severity,
                    "confidence": confidence * 100
                })
                total_cost += cost
                total_time += repair_time
            
            # 5. Sévérité globale finale
            if total_cost > 2000:
                severity_global = "severe"
            elif total_cost > 800:
                severity_global = "moderate"
            elif total_cost > 0:
                severity_global = "minor"
            else:
                severity_global = "normal"
            
            result = {
                "success": True,
                "damaged_parts": damaged_parts,
                "damage_detections": damaged_parts,
                "repair_details": repair_details,
                "total_estimated_cost": total_cost,
                "total_repair_time": round(total_time, 1),
                "severity": severity_global,
                "severity_score": self.class_severity_scores.get(severity_global, 0),
                "confidence": max([d["confidence"] for d in detected_damages]) * 100 if detected_damages else 0,
                "detected_parts": detected_damages,
                "is_fraudulent": False,
                "fraud_score": 0,
                "description": self._generate_description(damaged_parts, total_cost, severity_global),
                "need_expert": {"need_expert": severity_global in ["moderate", "severe"]},
                "recommendation": self._generate_recommendation(severity_global, total_cost)
            }
            annotated = self._create_annotated_image(image, result)
            result["annotated_image"] = annotated
            return result
        except Exception as e:
            logger.error(f"❌ Erreur analyse dégâts: {e}")
            return self._fallback_analysis(image_data)
    
    # ---- CLASSIFICATION CATASTROPHES ----
    async def classify_disaster(self, image_data: bytes) -> dict:
        """Classification d'image en catastrophe naturelle."""
        if self.disaster_model is None:
            return {
                "success": False,
                "error": "Modèle catastrophes non disponible",
                "prediction": None,
                "confidence": 0
            }
        try:
            image = Image.open(io.BytesIO(image_data)).convert('RGB')
            img_tensor = self.disaster_transform(image).unsqueeze(0).to(self.device)
            with torch.no_grad():
                outputs = self.disaster_model(img_tensor)
                probs = torch.softmax(outputs, dim=1)
                confidence, predicted = torch.max(probs, 1)
            
            class_idx = predicted.item()
            class_name = self.disaster_class_names[class_idx] if class_idx < len(self.disaster_class_names) else f"classe_{class_idx}"
            confidence_score = confidence.item() * 100
            display_name = self.disaster_display_names.get(class_name, class_name.capitalize())
            
            # Générer une image annotée (texte sur l'image)
            annotated_image = self._annotate_disaster_image(image, display_name, confidence_score)
            
            return {
                "success": True,
                "prediction": class_name,
                "display_name": display_name,
                "confidence": round(confidence_score, 2),
                "class_index": class_idx,
                "all_probs": {self.disaster_class_names[i]: round(probs[0][i].item()*100, 2) for i in range(len(self.disaster_class_names))},
                "annotated_image": annotated_image
            }
        except Exception as e:
            logger.error(f"❌ Erreur classification catastrophe: {e}")
            return {
                "success": False,
                "error": str(e),
                "prediction": None,
                "confidence": 0
            }
    
    # ---- MÉTHODES INTERNES ----
    
    async def _classify_with_cnn(self, image: Image.Image) -> dict:
        if self.cnn_model is None:
            return {"class": "moderate", "confidence": 0.7}
        try:
            img_tensor = self.cnn_transform(image).unsqueeze(0).to(self.device)
            with torch.no_grad():
                outputs = self.cnn_model(img_tensor)
                probs = torch.softmax(outputs, dim=1)
                confidence, predicted = torch.max(probs, 1)
            class_idx = predicted.item()
            severity_class = self.class_names[class_idx] if class_idx < len(self.class_names) else 'normal'
            return {"class": severity_class, "confidence": confidence.item(), "class_idx": class_idx}
        except Exception as e:
            logger.error(f"Erreur CNN: {e}")
            return {"class": "moderate", "confidence": 0.7}
    
    async def _detect_with_yolo(self, image_cv, width, height):
        if self.yolo_model is None:
            return {"detected_damages": []}
        try:
            results = self.yolo_model(image_cv, conf=0.25, iou=0.45)
            detected_damages = []
            for r in results:
                if r.boxes is not None:
                    for box in r.boxes:
                        x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                        conf = float(box.conf[0].cpu().numpy())
                        cls = int(box.cls[0].cpu().numpy())
                        x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
                        damage_type = self.class_names_yolo.get(cls, f"damage_{cls}")
                        detected_damages.append({
                            "type": damage_type,
                            "confidence": conf,
                            "bbox": [x1, y1, x2, y2],
                            "class_id": cls
                        })
            return {"detected_damages": detected_damages}
        except Exception as e:
            logger.error(f"YOLO error: {e}")
            return {"detected_damages": []}
    
    def _get_display_name(self, damage_type: str) -> str:
        normalized = damage_type.replace('_', ' ')
        return self.damage_display_names.get(normalized, damage_type.replace('_', ' ').capitalize())
    
    def _estimate_cost_for_damage(self, damage_type: str, severity: str) -> int:
        normalized = damage_type.replace('_', ' ')
        base_cost = self.damage_costs.get(normalized, 400)
        multiplier = {'minor': 1.0, 'moderate': 1.8, 'severe': 2.5}.get(severity, 1.0)
        return int(base_cost * multiplier)
    
    def _empty_result(self, image, description, recommendation):
        return {
            "success": True,
            "damaged_parts": [],
            "damage_detections": [],
            "repair_details": [],
            "total_estimated_cost": 0,
            "total_repair_time": 0,
            "severity": "normal",
            "severity_score": 0,
            "confidence": 0,
            "detected_parts": [],
            "is_fraudulent": False,
            "fraud_score": 0,
            "description": description,
            "need_expert": {"need_expert": False},
            "recommendation": recommendation,
            "annotated_image": self._create_annotated_image(image, {"damaged_parts": []})
        }
    
    def _generate_description(self, parts, total_cost, severity):
        if not parts:
            return "Aucun dégât détecté ✅"
        part_names = ", ".join([p["part"] for p in parts[:3]])
        if severity == "severe":
            return f"🚨 Dégâts sévères sur: {part_names}"
        elif severity == "moderate":
            return f"⚠️ Dégâts modérés sur: {part_names}"
        else:
            return f"🔧 Dégâts mineurs sur: {part_names}"
    
    def _generate_recommendation(self, severity, total_cost):
        if severity == "severe":
            return f"🚨 Expertise urgente. Coût estimé: {total_cost}€"
        elif severity == "moderate":
            return f"📋 Réparation en garage. Coût: {total_cost}€"
        elif severity == "minor":
            return f"🔧 Réparation légère. Coût: {total_cost}€"
        else:
            return "✅ Aucune réparation nécessaire"
    
    def _create_annotated_image(self, image, result):
        try:
            draw = ImageDraw.Draw(image)
            w, h = image.size
            parts = result.get("damaged_parts", [])
            if not parts:
                draw.rectangle([(10,10),(w-10,h-10)], outline=(0,255,0), width=4)
                draw.text((20,20), "✅ AUCUN DEGAT", fill=(0,255,0))
            else:
                colors = ["#FF0000", "#FF6B00", "#FFD700", "#00BFFF", "#FF00FF", "#FF1493"]
                for i, p in enumerate(parts):
                    bbox = p.get("bbox", [])
                    if len(bbox)==4:
                        x1,y1,x2,y2 = bbox
                        x1,y1,x2,y2 = max(0,x1), max(0,y1), min(w,x2), min(h,y2)
                        color = colors[i % len(colors)]
                        rgb = tuple(int(color[j:j+2],16) for j in (1,3,5))
                        draw.rectangle([x1,y1,x2,y2], outline=rgb, width=4)
                        label = f"{p['part']}"
                        if "estimated_cost" in p:
                            label += f" {p['estimated_cost']}€"
                        draw.rectangle([x1,y1-24, x1+len(label)*8+14, y1], fill=rgb)
                        draw.text((x1+7,y1-22), label, fill=(255,255,255))
                total = result.get("total_estimated_cost", 0)
                severity = result.get("severity", "normal")
                sev_col = {"severe":"#FF0000","moderate":"#FF6B00","minor":"#FFD700","normal":"#00FF00"}.get(severity,"#FFFFFF")
                draw.rectangle([(10,10),(w-10,85)], fill=(0,0,0,220))
                draw.text((20,20), f"🔴 {len(parts)} dégât(s) détecté(s)", fill=(255,255,255))
                draw.text((20,42), f"💰 Estimation: {total} €", fill=(255,215,0))
                draw.text((20,64), f"📊 Gravité: {severity.upper()}", fill=sev_col)
            buf = io.BytesIO()
            image.save(buf, format='JPEG', quality=90)
            return base64.b64encode(buf.getvalue()).decode('utf-8')
        except Exception as e:
            logger.error(f"Annotation error: {e}")
            return ""
    
    def _annotate_disaster_image(self, image, display_name, confidence):
        """Ajoute un texte sur l'image pour la classification catastrophe."""
        try:
            draw = ImageDraw.Draw(image)
            w, h = image.size
            draw.rectangle([(10,10),(w-10,80)], fill=(0,0,0,180))
            draw.text((20,20), f"🌪️ Catastrophe détectée: {display_name}", fill=(255,255,255))
            draw.text((20,45), f"🎯 Confiance: {confidence:.1f}%", fill=(200,255,200))
            buf = io.BytesIO()
            image.save(buf, format='JPEG', quality=90)
            return base64.b64encode(buf.getvalue()).decode('utf-8')
        except Exception as e:
            logger.error(f"Erreur annotation catastrophes: {e}")
            return ""
    
    def _fallback_analysis(self, image_data):
        return {
            "success": False,
            "error": "Analyse impossible",
            "damaged_parts": [],
            "total_estimated_cost": 0,
            "severity": "unknown",
            "annotated_image": base64.b64encode(image_data).decode('utf-8')
        }

# Instance globale
car_detector = YOLODamageDetector()