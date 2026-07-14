# app/services/ocr_ai.py
import easyocr
import cv2
import numpy as np
import re
import logging
from typing import Dict, List, Optional, Any
from PIL import Image
import io
import base64

logger = logging.getLogger(__name__)

class OCRService:
    """
    Service OCR utilisant EasyOCR pour l'extraction de texte
    """
    
    def __init__(self, languages: List[str] = ['fr', 'en']):
        """
        Initialiser EasyOCR avec les langues spécifiées
        
        Args:
            languages: Liste des langues à utiliser (par défaut: ['fr', 'en'])
        """
        try:
            self.reader = easyocr.Reader(languages, gpu=False)
            logger.info(f"✅ EasyOCR initialisé avec succès pour les langues: {languages}")
        except Exception as e:
            logger.error(f"❌ Erreur lors de l'initialisation d'EasyOCR: {str(e)}")
            raise
    
    def extract_text(self, image_path: str) -> Optional[Dict[str, Any]]:
        """
        Extraire le texte d'une image avec EasyOCR
        
        Args:
            image_path: Chemin vers l'image
            
        Returns:
            Dictionnaire contenant le texte extrait, les détections et la confiance moyenne
        """
        try:
            # Lire l'image
            image = cv2.imread(image_path)
            if image is None:
                raise ValueError(f"Impossible de lire l'image: {image_path}")
            
            # Extraire le texte
            results = self.reader.readtext(image)
            
            if not results:
                logger.warning(f"Aucun texte détecté dans l'image: {image_path}")
                return {
                    'text': '',
                    'detections': [],
                    'confidence_avg': 0
                }
            
            # Extraire uniquement le texte
            text = ' '.join([result[1] for result in results])
            
            # Extraire les bounding boxes avec les confidences
            detections = []
            for (bbox, text_detected, confidence) in results:
                detections.append({
                    'text': text_detected,
                    'confidence': float(confidence),
                    'bbox': bbox.tolist() if hasattr(bbox, 'tolist') else bbox
                })
            
            confidence_avg = sum([d['confidence'] for d in detections]) / len(detections)
            
            logger.info(f"✅ OCR terminé: {len(detections)} mots détectés, confiance moyenne: {confidence_avg:.2f}%")
            
            return {
                'text': text,
                'detections': detections,
                'confidence_avg': confidence_avg
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur OCR avec EasyOCR: {str(e)}")
            return None
    
    def extract_text_from_bytes(self, image_bytes: bytes) -> Optional[Dict[str, Any]]:
        """
        Extraire le texte à partir de bytes d'image
        
        Args:
            image_bytes: Bytes de l'image
            
        Returns:
            Dictionnaire contenant le texte extrait
        """
        try:
            # Convertir les bytes en image numpy
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                raise ValueError("Impossible de décoder l'image")
            
            # Extraire le texte
            results = self.reader.readtext(image)
            
            if not results:
                return {
                    'text': '',
                    'detections': [],
                    'confidence_avg': 0
                }
            
            text = ' '.join([result[1] for result in results])
            detections = []
            for (bbox, text_detected, confidence) in results:
                detections.append({
                    'text': text_detected,
                    'confidence': float(confidence),
                    'bbox': bbox.tolist() if hasattr(bbox, 'tolist') else bbox
                })
            
            return {
                'text': text,
                'detections': detections,
                'confidence_avg': sum([d['confidence'] for d in detections]) / len(detections) if detections else 0
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur OCR sur bytes: {str(e)}")
            return None
    
    def extract_structured_data(self, image_path: str, extraction_rules: List[Dict]) -> Dict[str, Any]:
        """
        Extraire des données structurées avec EasyOCR
        
        Args:
            image_path: Chemin vers l'image
            extraction_rules: Liste des règles d'extraction
            
        Returns:
            Dictionnaire contenant les champs extraits
        """
        result = self.extract_text(image_path)
        if not result:
            return {}
        
        extracted_data = {
            'raw_text': result['text'],
            'confidence': result['confidence_avg'],
            'extracted_fields': {}
        }
        
        # Appliquer les règles d'extraction
        if extraction_rules:
            for rule in extraction_rules:
                field_name = rule.get('field_name')
                pattern = rule.get('pattern')
                is_regex = rule.get('is_regex', True)
                
                if field_name and pattern:
                    try:
                        if is_regex:
                            matches = re.findall(pattern, result['text'], re.IGNORECASE)
                        else:
                            # Recherche simple
                            if pattern.lower() in result['text'].lower():
                                matches = [pattern]
                            else:
                                matches = []
                        
                        if matches:
                            extracted_data['extracted_fields'][field_name] = matches[0] if len(matches) == 1 else matches
                        else:
                            extracted_data['extracted_fields'][field_name] = None
                            
                    except Exception as e:
                        logger.error(f"Erreur lors de l'extraction du champ {field_name}: {str(e)}")
                        extracted_data['extracted_fields'][field_name] = None
        
        return extracted_data
    
    def detect_fraud(self, image_path: str) -> Dict[str, Any]:
        """
        Détecter les potentielles fraudes sur un document
        
        Args:
            image_path: Chemin vers l'image
            
        Returns:
            Dictionnaire contenant l'analyse de fraude
        """
        result = self.extract_text(image_path)
        if not result:
            return {
                'fraud_score': 0,
                'authenticity_score': 0,
                'warning_messages': ["Impossible d'analyser le document"]
            }
        
        fraud_score = 0
        warning_messages = []
        
        # Vérifier les motifs de fraude courants
        text = result['text'].lower()
        
        # 1. Vérifier la confiance OCR
        if result['confidence_avg'] < 50:
            fraud_score += 20
            warning_messages.append("Faible confiance OCR - Document potentiellement altéré")
        
        # 2. Vérifier les motifs suspects
        suspicious_patterns = [
            (r'\d{16}', "Numéro de carte bancaire détecté"),
            (r'\b\d{3}[-.]?\d{2}[-.]?\d{4}\b', "Format de numéro de sécurité sociale suspect"),
            (r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}', "Adresse email détectée"),
            (r'0[0-9]{9}', "Numéro de téléphone détecté"),
        ]
        
        for pattern, message in suspicious_patterns:
            if re.search(pattern, text):
                fraud_score += 10
                warning_messages.append(message)
        
        # 3. Vérifier la cohérence du texte
        if len(text.strip()) < 10:
            fraud_score += 15
            warning_messages.append("Texte très court - Document potentiellement frauduleux")
        
        # 4. Vérifier la présence de dates
        date_patterns = [
            r'\d{2}[/-]\d{2}[/-]\d{4}',
            r'\d{2}[/-]\d{2}[/-]\d{2}',
            r'\d{4}[/-]\d{2}[/-]\d{2}',
        ]
        has_date = any(re.search(pattern, text) for pattern in date_patterns)
        if not has_date:
            fraud_score += 10
            warning_messages.append("Aucune date détectée - Document suspect")
        
        # Calculer le score d'authenticité
        authenticity_score = max(0, 100 - fraud_score)
        
        return {
            'fraud_score': fraud_score,
            'authenticity_score': authenticity_score,
            'warning_messages': warning_messages,
            'confidence_avg': result['confidence_avg']
        }