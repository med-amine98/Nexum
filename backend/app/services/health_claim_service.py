# app/services/health_claim_service.py
import base64
import random
import re
from PIL import Image, ImageDraw, ImageFont
import io
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class HealthClaimDetector:
    def __init__(self):
        logger.info("=" * 50)
        logger.info("INITIALISATION DETECTEUR SANTE")
        logger.info("=" * 50)
        logger.info("✅ Service sante pret")
    
    async def analyze_document(self, image_data: bytes) -> dict:
        try:
            image = Image.open(io.BytesIO(image_data)).convert('RGB')
            width, height = image.size
            
            # Extraction OCR simulee (a remplacer par un vrai OCR)
            extracted_text = self._simulate_ocr(image)
            
            # Analyse du document
            result = self._extract_medical_info(extracted_text, image, width, height)
            
            return result
                
        except Exception as e:
            logger.error(f"Erreur: {e}")
            return {"success": False, "error": str(e)}
    
    def _simulate_ocr(self, image):
        """Simulation OCR (a remplacer par Tesseract ou autre)"""
        # Dans la realite, utilisez pytesseract ou un service OCR
        return """
        Docteur Martin
        Consultation du 15/03/2024
        Patient: Jean Dupont
        N° Secu: 1234567890123
        Montant: 45.00€
        Remboursement: 70%
        """
    
    def _extract_medical_info(self, text, image, width, height):
        """Extrait les informations medicales du texte"""
        draw = ImageDraw.Draw(image)
        
        # Extraction des donnees avec regex
        patient_match = re.search(r'Patient:\s*([A-Za-z\s]+)', text)
        doctor_match = re.search(r'Docteur\s*([A-Za-z\s]+)', text)
        date_match = re.search(r'(\d{2}/\d{2}/\d{4})', text)
        amount_match = re.search(r'Montant:\s*(\d+\.?\d*)€', text)
        ssn_match = re.search(r'N° Secu:\s*(\d+)', text)
        
        patient_name = patient_match.group(1).strip() if patient_match else "Non identifie"
        doctor_name = doctor_match.group(1).strip() if doctor_match else "Non identifie"
        care_date = date_match.group(1) if date_match else datetime.now().strftime("%d/%m/%Y")
        base_amount = float(amount_match.group(1)) if amount_match else 45.0
        ssn = ssn_match.group(1) if ssn_match else ""
        
        # Calcul du remboursement
        reimbursement_rate = 0.70
        secu_reimbursement = base_amount * reimbursement_rate
        mutuelle_reimbursement = secu_reimbursement * 0.30
        total_reimbursement = secu_reimbursement + mutuelle_reimbursement
        patient_remaining = base_amount - total_reimbursement
        
        # Detection du type de soin
        if "consultation" in text.lower():
            care_type = "consultation"
            care_type_name = "Consultation medicale"
        elif "hospitalisation" in text.lower():
            care_type = "hospitalisation"
            care_type_name = "Hospitalisation"
        elif "medicament" in text.lower() or "ordonnance" in text.lower():
            care_type = "medicaments"
            care_type_name = "Medicaments"
        else:
            care_type = "consultation"
            care_type_name = "Consultation medicale"
        
        # Dessiner les zones d'interet
        zones = [
            {"bbox": [50, 50, 250, 80], "part": "Nom patient", "value": patient_name},
            {"bbox": [50, 90, 250, 120], "part": "Docteur", "value": doctor_name},
            {"bbox": [50, 130, 200, 160], "part": "Date", "value": care_date},
            {"bbox": [300, 50, 450, 80], "part": "Montant", "value": f"{base_amount}€"},
            {"bbox": [300, 90, 500, 120], "part": "N° Secu", "value": ssn}
        ]
        
        for zone in zones:
            bbox = zone["bbox"]
            draw.rectangle(bbox, outline='green', width=2)
            draw.rectangle([bbox[0], bbox[1]-20, bbox[0]+120, bbox[1]], fill='green')
            draw.text((bbox[0]+5, bbox[1]-17), zone["part"], fill='white')
            draw.text((bbox[0]+5, bbox[3]-18), zone["value"], fill='white', font=None)
        
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG', quality=90)
        annotated_image = base64.b64encode(buffer.getvalue()).decode('utf-8')
        
        fraud_score = self._calculate_fraud_score(ssn, base_amount)
        
        return {
            "success": True,
            "care_type": care_type,
            "care_type_name": care_type_name,
            "base_amount": round(base_amount, 2),
            "reimbursement_rate": reimbursement_rate,
            "secu_reimbursement": round(secu_reimbursement, 2),
            "mutuelle_reimbursement": round(mutuelle_reimbursement, 2),
            "total_reimbursement": round(total_reimbursement, 2),
            "patient_remaining": round(patient_remaining, 2),
            "extracted_data": {
                "patient_name": patient_name,
                "doctor_name": doctor_name,
                "care_date": care_date,
                "social_security_number": ssn
            },
            "annotated_image": annotated_image,
            "fraud_score": fraud_score,
            "is_fraudulent": fraud_score > 70,
            "confidence": 85,
            "description": f"Document medical analyse. Montant: {base_amount}€. Remboursement: {round(total_reimbursement, 2)}€",
            "warnings": self._get_warnings(fraud_score, ssn),
            "required_documents": ["Feuille de soins", "Carte vitale", "Ordonnance"]
        }
    
    def _calculate_fraud_score(self, ssn, amount):
        """Calcule un score de fraude base sur differents criteres"""
        score = 0
        
        # Verifier le numero de secu (13 chiffres)
        if len(ssn) != 13 or not ssn.isdigit():
            score += 30
        
        # Montant anormalement eleve
        if amount > 200:
            score += 20
        elif amount > 100:
            score += 10
        
        # Score aleatoire pour simulation
        score += random.randint(0, 20)
        
        return min(score, 100)
    
    def _get_warnings(self, fraud_score, ssn):
        """Genere des avertissements"""
        warnings = []
        
        if fraud_score > 70:
            warnings.append("⚠️ Anomalies detectees - Verification recommandee")
        
        if len(ssn) != 13:
            warnings.append("⚠️ Numero de securite sociale invalide")
        
        if fraud_score > 50 and fraud_score <= 70:
            warnings.append("⚠️ Verification supplementaire recommandee")
        
        return warnings