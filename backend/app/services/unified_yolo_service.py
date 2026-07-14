# backend/app/services/unified_yolo_service.py
import cv2
import numpy as np
from PIL import Image, ImageDraw  # <-- AJOUTER ImageDraw
import io
import base64
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class UnifiedYOLOService:
    """Service de détection unifié (sans YOLO)"""
    
    def __init__(self):
        self.model = None
        self.use_mediapipe = False
        self.use_opencv = False
        self.objectron = None
        
        logger.info("=" * 60)
        logger.info("🎯 INITIALISATION SERVICE DE DÉTECTION UNIFIÉ")
        logger.info("=" * 60)
        
        # Essayer MediaPipe
        try:
            import mediapipe as mp
            self.mp = mp
            self.mp_objects = mp.solutions.objectron
            self.objectron = self.mp_objects.Objectron(
                static_image_mode=True,
                max_num_objects=5,
                min_detection_confidence=0.5
            )
            self.use_mediapipe = True
            logger.info("✅ MediaPipe chargé (alternative à YOLO)")
            return
        except ImportError as e:
            logger.warning(f"⚠️ MediaPipe non disponible: {e}")
        except Exception as e:
            logger.warning(f"⚠️ Erreur MediaPipe: {e}")
        
        # Fallback OpenCV
        try:
            self.face_cascade = cv2.CascadeClassifier(
                cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
            )
            self.use_opencv = True
            logger.info("✅ OpenCV chargé (mode fallback)")
            return
        except Exception as e:
            logger.warning(f"⚠️ OpenCV non disponible: {e}")
        
        logger.warning("⚠️ Mode basique - détection limitée")
    
    async def detect(self, image_data: bytes, task_type: str = "general") -> Dict[str, Any]:
        """Détection d'objets unifiée"""
        try:
            # Charger l'image
            image = Image.open(io.BytesIO(image_data)).convert('RGB')
            img_cv = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
            
            detections = []
            
            if self.use_mediapipe and self.objectron:
                detections = await self._detect_with_mediapipe(img_cv)
            elif self.use_opencv:
                detections = await self._detect_with_opencv(img_cv)
            else:
                detections = await self._basic_detection(img_cv)
            
            # Annoter l'image
            annotated_image = await self._annotate_image(image, detections)
            
            return {
                "success": True,
                "detections": detections,
                "count": len(detections),
                "annotated_image": annotated_image,
                "method": "mediapipe" if self.use_mediapipe else ("opencv" if self.use_opencv else "basic")
            }
            
        except Exception as e:
            logger.error(f"Erreur détection: {e}")
            return {"success": False, "error": str(e), "detections": []}
    
    async def _detect_with_mediapipe(self, image: np.ndarray) -> List[Dict]:
        """Détection avec MediaPipe"""
        detections = []
        try:
            if self.objectron is None:
                return detections
                
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            results = self.objectron.process(image_rgb)
            
            if results.detected_objects:
                for obj in results.detected_objects:
                    if obj.bounding_box:
                        # Récupérer le label si disponible
                        label = getattr(obj, 'label', None)
                        if label is None and hasattr(obj, 'category'):
                            label = obj.category
                        elif label is None:
                            label = 'object'
                        
                        detections.append({
                            "class": str(label),
                            "confidence": float(obj.score) * 100 if hasattr(obj, 'score') else 85.0,
                            "bbox": [
                                float(obj.bounding_box.xmin),
                                float(obj.bounding_box.ymin),
                                float(obj.bounding_box.xmax),
                                float(obj.bounding_box.ymax)
                            ]
                        })
            logger.debug(f"MediaPipe: {len(detections)} détections")
        except Exception as e:
            logger.error(f"Erreur MediaPipe: {e}")
        return detections
    
    async def _detect_with_opencv(self, image: np.ndarray) -> List[Dict]:
        """Détection basique avec OpenCV"""
        detections = []
        try:
            # Détection de visages
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            faces = self.face_cascade.detectMultiScale(gray, 1.1, 4)
            
            for (x, y, w, h) in faces:
                detections.append({
                    "class": "face",
                    "confidence": 75.0,
                    "bbox": [float(x), float(y), float(x+w), float(y+h)]
                })
            
            # Détection de corps avec HOG (optionnel)
            try:
                hog = cv2.HOGDescriptor()
                hog.setSVMDetector(cv2.HOGDescriptor_getDefaultPeopleDetector())
                bodies, _ = hog.detectMultiScale(gray)
                for (x, y, w, h) in bodies:
                    detections.append({
                        "class": "person",
                        "confidence": 70.0,
                        "bbox": [float(x), float(y), float(x+w), float(y+h)]
                    })
            except Exception:
                pass  # HOG peut ne pas être disponible
            
            logger.debug(f"OpenCV: {len(detections)} détections")
        except Exception as e:
            logger.error(f"Erreur OpenCV: {e}")
        return detections
    
    async def _basic_detection(self, image: np.ndarray) -> List[Dict]:
        """Détection basique par contours"""
        detections = []
        try:
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            blurred = cv2.GaussianBlur(gray, (5, 5), 0)
            edges = cv2.Canny(blurred, 50, 150)
            
            contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            for contour in contours:
                area = cv2.contourArea(contour)
                if 1000 < area < 100000:  # Filtrer les zones trop petites ou trop grandes
                    x, y, w, h = cv2.boundingRect(contour)
                    # Éviter les doublons
                    is_duplicate = False
                    for det in detections:
                        existing_bbox = det["bbox"]
                        if abs(existing_bbox[0] - x) < 20 and abs(existing_bbox[1] - y) < 20:
                            is_duplicate = True
                            break
                    
                    if not is_duplicate:
                        detections.append({
                            "class": "object",
                            "confidence": min(95.0, area / 1000),
                            "bbox": [float(x), float(y), float(x+w), float(y+h)]
                        })
            
            # Limiter à 10 détections
            detections = detections[:10]
            logger.debug(f"Détection basique: {len(detections)} détections")
        except Exception as e:
            logger.error(f"Erreur détection basique: {e}")
        return detections
    
    async def _annotate_image(self, image: Image.Image, detections: List[Dict]) -> Optional[str]:
        """Annote l'image avec les détections"""
        try:
            # S'assurer que ImageDraw est importé
            from PIL import ImageDraw
            
            draw = ImageDraw.Draw(image)
            
            for det in detections:
                bbox = det.get("bbox", [])
                if len(bbox) >= 4:
                    x1, y1, x2, y2 = [int(x) for x in bbox[:4]]
                    # S'assurer que les coordonnées sont dans l'image
                    x1 = max(0, min(x1, image.width - 1))
                    y1 = max(0, min(y1, image.height - 1))
                    x2 = max(0, min(x2, image.width - 1))
                    y2 = max(0, min(y2, image.height - 1))
                    
                    if x2 > x1 and y2 > y1:
                        # Dessiner le rectangle
                        draw.rectangle([x1, y1, x2, y2], outline=(0, 255, 0), width=3)
                        
                        # Ajouter le texte
                        label = det.get("class", "object")
                        confidence = det.get("confidence", 0)
                        text = f"{label} ({confidence:.0f}%)"
                        
                        # Dessiner le fond du texte
                        try:
                            from PIL import ImageFont
                            try:
                                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
                            except:
                                font = ImageFont.load_default()
                        except:
                            font = ImageFont.load_default()
                        
                        # Position du texte
                        text_bbox = draw.textbbox((x1, y1 - 20), text, font=font)
                        draw.rectangle(text_bbox, fill=(0, 255, 0))
                        draw.text((x1, y1 - 20), text, fill=(0, 0, 0), font=font)
            
            # Convertir en base64
            buffer = io.BytesIO()
            image.save(buffer, format='PNG')
            return base64.b64encode(buffer.getvalue()).decode('utf-8')
            
        except Exception as e:
            logger.error(f"Erreur annotation: {e}")
            return None
    
    def detect_sync(self, image_data: bytes, task_type: str = "general") -> Dict[str, Any]:
        """Version synchrone de la détection"""
        import asyncio
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(self.detect(image_data, task_type))


# Instance globale
yolo_service = UnifiedYOLOService()