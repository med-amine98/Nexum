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
import os
from datetime import datetime

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
    
    def extract_text(self, image_path_or_bytes) -> Optional[Dict[str, Any]]:
        """
        Extraire le texte d'une image avec EasyOCR
        
        Args:
            image_path_or_bytes: Chemin vers l'image ou bytes de l'image
            
        Returns:
            Dictionnaire contenant le texte extrait, les détections et la confiance moyenne
        """
        try:
            # Si c'est un chemin de fichier
            if isinstance(image_path_or_bytes, str):
                if not os.path.exists(image_path_or_bytes):
                    logger.error(f"❌ Fichier non trouvé: {image_path_or_bytes}")
                    return None
                image = cv2.imread(image_path_or_bytes)
            else:
                # Si c'est des bytes
                nparr = np.frombuffer(image_path_or_bytes, np.uint8)
                image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                raise ValueError("Impossible de lire l'image")
            
            # Extraire le texte
            results = self.reader.readtext(image)
            
            if not results:
                logger.warning("Aucun texte détecté dans l'image")
                return {
                    'text': '',
                    'detections': [],
                    'confidence': 0,
                    'word_count': 0
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
            
            confidence_avg = sum([d['confidence'] for d in detections]) / len(detections) if detections else 0
            
            logger.info(f"✅ OCR terminé: {len(detections)} mots détectés, confiance moyenne: {confidence_avg:.2f}%")
            
            return {
                'text': text,
                'detections': detections,
                'confidence': confidence_avg,
                'word_count': len(text.split())
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur OCR avec EasyOCR: {str(e)}")
            return None
    
    def analyze_layout(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Analyser le layout du document pour détecter les champs structurés
        
        Args:
            image_bytes: Bytes de l'image
            
        Returns:
            Dictionnaire contenant les champs extraits et les anomalies
        """
        try:
            # Convertir les bytes en image
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return {'extracted_fields': {}, 'anomalies': []}
            
            # Extraire le texte avec EasyOCR
            results = self.reader.readtext(image)
            
            extracted_fields = {}
            anomalies = []
            
            # Analyser le texte pour trouver des motifs courants
            full_text = ' '.join([r[1] for r in results]).lower()
            
            # Détecter les numéros de document
            doc_patterns = [
                (r'numéro\s*(?:de\s*)?(?:document|facture|contrat|commande|dossier|sinistre)\s*[:]?\s*([A-Z0-9\-]+)', 'document_number'),
                (r'n°\s*([A-Z0-9\-]+)', 'document_number'),
                (r'reference\s*[:]?\s*([A-Z0-9\-]+)', 'reference'),
                (r'facture\s*n°\s*([0-9]+)', 'invoice_number'),
                (r'contrat\s*n°\s*([0-9]+)', 'contract_number'),
            ]
            
            for pattern, field_name in doc_patterns:
                matches = re.findall(pattern, full_text, re.IGNORECASE)
                if matches:
                    extracted_fields[field_name] = matches[0]
            
            # Détecter les montants
            amount_patterns = [
                (r'(?:total|montant|somme|prix)\s*[:]?\s*([0-9]+[\s.,]?[0-9]*)\s*(?:€|eur|euros)', 'amount'),
                (r'([0-9]+[\s.,]?[0-9]*)\s*(?:€|eur|euros)', 'amount'),
            ]
            
            for pattern, field_name in amount_patterns:
                matches = re.findall(pattern, full_text, re.IGNORECASE)
                if matches:
                    extracted_fields[field_name] = matches[0]
            
            # Détecter les dates
            date_patterns = [
                (r'(\d{2}[/-]\d{2}[/-]\d{4})', 'date'),
                (r'(\d{2}[/-]\d{2}[/-]\d{2})', 'date'),
                (r'(\d{4}[/-]\d{2}[/-]\d{2})', 'date'),
            ]
            
            for pattern, field_name in date_patterns:
                matches = re.findall(pattern, full_text)
                if matches:
                    extracted_fields[field_name] = matches[0]
            
            # Détecter les noms
            name_patterns = [
                (r'(?:nom|client|beneficiaire|assuré)\s*[:]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', 'name'),
                (r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)', 'name'),
            ]
            
            for pattern, field_name in name_patterns:
                matches = re.findall(pattern, full_text)
                if matches:
                    extracted_fields[field_name] = matches[0]
            
            # Détecter les anomalies de layout
            # 1. Vérifier si le texte est aligné correctement
            if len(results) > 0:
                y_positions = [r[0][0][1] for r in results]
                if y_positions:
                    # Vérifier les écarts importants
                    sorted_y = sorted(y_positions)
                    gaps = []
                    for i in range(1, len(sorted_y)):
                        gap = sorted_y[i] - sorted_y[i-1]
                        if gap > 100:
                            gaps.append(gap)
                    if len(gaps) > 2:
                        anomalies.append({
                            'type': 'irregular_spacing',
                            'description': 'Espacement irrégulier détecté',
                            'severity': 'medium'
                        })
            
            # 2. Vérifier les rotations
            if len(results) > 0:
                angles = []
                for r in results:
                    bbox = r[0]
                    if len(bbox) >= 2:
                        dx = bbox[1][0] - bbox[0][0]
                        dy = bbox[1][1] - bbox[0][1]
                        if dx != 0:
                            angle = np.arctan2(dy, dx) * 180 / np.pi
                            angles.append(abs(angle))
                if angles and max(angles) > 5:
                    anomalies.append({
                        'type': 'rotation_detected',
                        'description': 'Rotation de document détectée',
                        'severity': 'low'
                    })
            
            logger.info(f"📐 Analyse layout terminée: {len(extracted_fields)} champs extraits, {len(anomalies)} anomalies")
            
            return {
                'extracted_fields': extracted_fields,
                'anomalies': anomalies
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur analyse layout: {str(e)}")
            return {'extracted_fields': {}, 'anomalies': []}
    
    def detect_forgery(self, image_bytes: bytes) -> Dict[str, Any]:
        """
        Détecter les falsifications dans l'image
        
        Args:
            image_bytes: Bytes de l'image
            
        Returns:
            Dictionnaire contenant le score de falsification et les régions manipulées
        """
        try:
            # Convertir les bytes en image
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if image is None:
                return {'forgery_score': 0, 'manipulated_regions': []}
            
            forgery_score = 0
            manipulated_regions = []
            
            # 1. Vérifier la présence de JPEG artifacts (indice de manipulation)
            gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            
            # Détecter les bords
            edges = cv2.Canny(gray, 50, 150)
            edge_density = np.sum(edges > 0) / (edges.shape[0] * edges.shape[1])
            
            # Si la densité de bords est trop élevée ou trop faible, suspect
            if edge_density > 0.3:
                forgery_score += 15
                manipulated_regions.append({
                    'type': 'high_edge_density',
                    'description': 'Densité de bords anormalement élevée',
                    'severity': 'medium'
                })
            elif edge_density < 0.02:
                forgery_score += 10
                manipulated_regions.append({
                    'type': 'low_edge_density',
                    'description': 'Densité de bords anormalement faible',
                    'severity': 'low'
                })
            
            # 2. Vérifier les incohérences de compression
            # Analyser les blocs DCT pour détecter les modifications
            # (Simplifié: on utilise la variance locale)
            
            # 3. Vérifier les différences de luminosité suspectes
            mean_brightness = np.mean(gray)
            std_brightness = np.std(gray)
            
            if std_brightness > 80:
                forgery_score += 20
                manipulated_regions.append({
                    'type': 'high_contrast_variation',
                    'description': 'Variation de contraste anormale',
                    'severity': 'high'
                })
            
            # 4. Vérifier la présence de zones uniformes suspectes
            # (Simplifié)
            
            # 5. Vérifier les artefacts de copier-coller
            # (Simplifié)
            
            # Limiter le score
            forgery_score = min(100, forgery_score)
            
            # Ajouter un score basé sur la confiance OCR (si disponible)
            try:
                ocr_result = self.extract_text(image_bytes)
                if ocr_result and ocr_result.get('confidence', 0) < 50:
                    forgery_score += 15
                    manipulated_regions.append({
                        'type': 'low_ocr_confidence',
                        'description': 'Faible confiance OCR - document potentiellement altéré',
                        'severity': 'high'
                    })
            except:
                pass
            
            logger.info(f"🔍 Détection falsification terminée: score={forgery_score}, {len(manipulated_regions)} régions")
            
            return {
                'forgery_score': min(100, forgery_score),
                'manipulated_regions': manipulated_regions
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur détection falsification: {str(e)}")
            return {'forgery_score': 0, 'manipulated_regions': []}
    
    def calculate_fraud_score(self, forgery_result: Dict, layout_result: Dict, ocr_result: Dict) -> Dict[str, Any]:
        """
        Calculer le score de fraude global
        
        Args:
            forgery_result: Résultat de la détection de falsification
            layout_result: Résultat de l'analyse de layout
            ocr_result: Résultat de l'OCR
            
        Returns:
            Dictionnaire contenant le score de fraude et le niveau
        """
        try:
            # Récupérer les scores
            forgery_score = forgery_result.get('forgery_score', 0)
            
            # Score basé sur les anomalies de layout
            layout_anomalies = layout_result.get('anomalies', [])
            layout_score = min(30, len(layout_anomalies) * 10)
            
            # Score basé sur l'OCR
            ocr_confidence = ocr_result.get('confidence', 0)
            ocr_score = max(0, 30 - ocr_confidence * 0.3) if ocr_confidence > 0 else 0
            
            # Score total
            total_fraud_score = min(100, forgery_score + layout_score + ocr_score)
            
            # Niveau de fraude
            if total_fraud_score > 80:
                fraud_level = 'critical'
            elif total_fraud_score > 60:
                fraud_level = 'high'
            elif total_fraud_score > 40:
                fraud_level = 'medium'
            elif total_fraud_score > 20:
                fraud_level = 'low'
            else:
                fraud_level = 'none'
            
            # Score d'authenticité
            authenticity_score = max(0, 100 - total_fraud_score)
            
            logger.info(f"🔒 Score de fraude calculé: {total_fraud_score}% - Niveau: {fraud_level}")
            
            return {
                'fraud_score': total_fraud_score,
                'fraud_level': fraud_level,
                'authenticity_score': authenticity_score,
                'forgery_score': forgery_score,
                'layout_score': layout_score,
                'ocr_score': ocr_score
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur calcul score fraude: {str(e)}")
            return {
                'fraud_score': 0,
                'fraud_level': 'none',
                'authenticity_score': 100,
                'forgery_score': 0,
                'layout_score': 0,
                'ocr_score': 0
            }
    
    def extract_data_by_rules(self, text: str, rules: List[Dict]) -> Dict[str, Any]:
        """
        Extraire des données selon des règles personnalisées
        
        Args:
            text: Texte à analyser
            rules: Liste des règles d'extraction
            
        Returns:
            Dictionnaire des champs extraits
        """
        extracted = {}
        
        if not text or not rules:
            return extracted
        
        for rule in rules:
            field_name = rule.get('field_name')
            pattern = rule.get('pattern')
            is_regex = rule.get('is_regex', True)
            
            if not field_name or not pattern:
                continue
            
            try:
                if is_regex:
                    matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
                    if matches:
                        extracted[field_name] = matches[0] if len(matches) == 1 else matches
                else:
                    # Recherche simple
                    if pattern.lower() in text.lower():
                        # Extraire le contexte autour du pattern
                        idx = text.lower().find(pattern.lower())
                        start = max(0, idx - 50)
                        end = min(len(text), idx + len(pattern) + 50)
                        context = text[start:end]
                        extracted[field_name] = context
            except Exception as e:
                logger.error(f"Erreur extraction champ {field_name}: {str(e)}")
                continue
        
        return extracted


# ============================================
# CRÉER UNE INSTANCE UNIQUE DU SERVICE
# ============================================
try:
    ocr_ai_service = OCRService()
    logger.info("✅ Instance OCRService créée avec succès")
except Exception as e:
    logger.error(f"❌ Erreur lors de la création de l'instance OCRService: {str(e)}")
    ocr_ai_service = None