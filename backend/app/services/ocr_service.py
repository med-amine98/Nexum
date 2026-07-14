import os
import logging
import re
from typing import Dict, Any
import time
import subprocess
import tempfile

logger = logging.getLogger(__name__)

class OCRService:
    def __init__(self):
        logger.info("🔄 Initialisation du service OCR...")
        # Vérifier si tesseract est installé sur le système
        self.tesseract_available = self._check_tesseract()
        
    def _check_tesseract(self):
        """Vérifie si Tesseract est installé sur le système"""
        try:
            subprocess.run(['tesseract', '--version'], 
                         capture_output=True, 
                         check=True)
            logger.info("✅ Tesseract trouvé")
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            logger.warning("⚠️ Tesseract non trouvé, utilisation du mode démo")
            return False

    async def process_document(
        self,
        file_path: str,
        document_id: int,
        language: str = "fr",
        document_type: str = "invoice"
    ) -> Dict[str, Any]:
        start_time = time.time()
        
        try:
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"Fichier non trouvé: {file_path}")
            
            logger.info(f"📄 Traitement: {file_path}")
            
            # Extraire le texte selon la méthode disponible
            if self.tesseract_available:
                text = self._extract_with_tesseract(file_path)
            else:
                text = self._extract_dummy_text(file_path)
            
            # Simuler une confiance
            avg_confidence = 85.0 if self.tesseract_available else 0
            
            extracted_data = {}
            if document_type == "invoice":
                extracted_data = self._extract_invoice_data(text)
            
            return {
                "document_id": document_id,
                "text": text,
                "confidence": avg_confidence,
                "extracted_data": extracted_data,
                "document_type": document_type,
                "page_count": 1,
                "processing_time_ms": int((time.time() - start_time) * 1000),
                "method": "tesseract" if self.tesseract_available else "demo"
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur: {e}")
            raise

    def _extract_with_tesseract(self, file_path: str) -> str:
        """Extrait le texte avec Tesseract (installé sur le système)"""
        try:
            # Utiliser tesseract en ligne de commande
            result = subprocess.run(
                ['tesseract', file_path, 'stdout', '-l', 'fra+eng'],
                capture_output=True,
                text=True,
                check=True
            )
            return result.stdout.strip()
        except Exception as e:
            logger.error(f"Erreur Tesseract: {e}")
            return ""

    def _extract_dummy_text(self, file_path: str) -> str:
        """Mode démo - retourne un texte simulé basé sur le nom du fichier"""
        filename = os.path.basename(file_path)
        
        # Simuler différents types de documents
        if "facture" in filename.lower() or "invoice" in filename.lower():
            return """FACTURE N° INV-2024-00123
Date: 15/03/2024
Client: Entreprise ABC
Description: Prestation de services
Total TTC: 1250.00 €"""
        elif "devis" in filename.lower() or "quote" in filename.lower():
            return """DEVIS N° DEV-2024-00456
Date: 20/03/2024
Client: Société XYZ
Montant: 3450.00 €"""
        else:
            return f"Contenu simulé du document: {filename}"

    def _extract_invoice_data(self, text: str) -> Dict[str, Any]:
        """Extrait les données d'une facture avec des regex"""
        data = {
            "invoice_number": None,
            "date": None,
            "total_ttc": None,
            "client": None,
            "total_ht": None,
            "tva": None
        }
        
        # Numéro facture - plusieurs formats
        patterns = [
            r'(?:facture|invoice|fact|devis)[\s]*n[°°]?[\s:.]*([A-Z0-9][A-Z0-9-_\/]{3,20})',
            r'n[°°][\s:.]*([A-Z0-9][A-Z0-9-_\/]{3,20})',
            r'([A-Z]{2,4}[-_]\d{4,8})'
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                data['invoice_number'] = match.group(1).strip()
                break
        
        # Date (format JJ/MM/AAAA ou JJ-MM-AAAA)
        date_patterns = [
            r'(\d{2}[/-]\d{2}[/-]\d{4})',
            r'date[\s:.]*(\d{2}[/-]\d{2}[/-]\d{4})'
        ]
        for pattern in date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                data['date'] = match.group(1)
                break
        
        # Montants
        # Total TTC
        ttc_match = re.search(r'total[\s]*ttc[\s:.]*([\d\s,.]+)[\s]*€', text, re.IGNORECASE)
        if not ttc_match:
            ttc_match = re.search(r'total[\s:.]*([\d\s,.]+)[\s]*€', text, re.IGNORECASE)
        
        if ttc_match:
            montant = ttc_match.group(1).replace(' ', '').replace(',', '.')
            try:
                data['total_ttc'] = float(montant)
            except:
                pass
        
        # Total HT
        ht_match = re.search(r'total[\s]*ht[\s:.]*([\d\s,.]+)[\s]*€', text, re.IGNORECASE)
        if ht_match:
            montant = ht_match.group(1).replace(' ', '').replace(',', '.')
            try:
                data['total_ht'] = float(montant)
            except:
                pass
        
        # TVA
        tva_match = re.search(r'tva[\s:.]*([\d\s,.]+)[\s]*%', text, re.IGNORECASE)
        if tva_match:
            try:
                data['tva'] = float(tva_match.group(1).replace(',', '.'))
            except:
                pass
        
        # Client
        client_patterns = [
            r'client[\s:.]*([^\n]{3,50})',
            r'facturé[\s]*à[\s:.]*([^\n]{3,50})',
            r'entreprise[\s:.]*([^\n]{3,50})'
        ]
        for pattern in client_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                data['client'] = match.group(1).strip()
                break
        
        return data

    async def extract_text_from_bytes(self, image_bytes: bytes) -> str:
        """Version alternative qui accepte des bytes (sans PIL)"""
        # Sauvegarder temporairement le fichier
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp_file:
            tmp_file.write(image_bytes)
            tmp_path = tmp_file.name
        
        try:
            # Utiliser tesseract sur le fichier temporaire
            if self.tesseract_available:
                text = self._extract_with_tesseract(tmp_path)
            else:
                text = self._extract_dummy_text(tmp_path)
            
            return text
        finally:
            # Nettoyer le fichier temporaire
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)