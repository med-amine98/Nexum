import re
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class InvoiceExtractor:
    """
    Extracteur d'informations spécifique aux factures
    """
    
    def __init__(self):
        # Patterns regex pour différents formats de factures
        self.patterns = {
            'invoice_number': [
                r'(facture|invoice|fact\.?|inv\.?)\s*n[°°]?\s*[:.]?\s*([A-Z0-9-/_]+)',
                r'n[°°]\s*([A-Z0-9-/_]+)',
                r'num[eé]ro\s*[:.]?\s*([A-Z0-9-/_]+)',
                r'ref(?:érence)?\s*[:.]?\s*([A-Z0-9-/_]+)',
                r'([A-Z]{2,4}[-_/]?\d{4,8}[-_/]?\d{2,4})'
            ],
            
            'date': [
                r'date\s*[:.]?\s*(\d{2}[/-]\d{2}[/-]\d{4})',
                r'date\s*[:.]?\s*(\d{2}\s+\w+\s+\d{4})',
                r'(\d{2}[/-]\d{2}[/-]\d{4})',
                r'(\d{4}[/-]\d{2}[/-]\d{2})'
            ],
            
            'due_date': [
                r'(?:échéance|echeance|due\s*date|date\s*limite)\s*[:.]?\s*(\d{2}[/-]\d{2}[/-]\d{4})',
                r'paiement\s*(?:avant|le)\s*[:.]?\s*(\d{2}[/-]\d{2}[/-]\d{4})',
                r'r[eè]glement\s*(?:avant|le)\s*[:.]?\s*(\d{2}[/-]\d{2}[/-]\d{4})'
            ],
            
            'total_ht': [
                r'total\s*ht\s*[:.]?\s*([\d\s,.]+)\s*(?:€|euros?|eur)',
                r'sous-total\s*[:.]?\s*([\d\s,.]+)\s*(?:€|euros?|eur)',
                r'montant\s*ht\s*[:.]?\s*([\d\s,.]+)\s*(?:€|euros?|eur)',
                r'([\d\s,.]+)\s*(?:€|euros?|eur)\s*(?:ht|hors\s*taxe)'
            ],
            
            'total_ttc': [
                r'total\s*ttc\s*[:.]?\s*([\d\s,.]+)\s*(?:€|euros?|eur)',
                r'total\s*(?:général|general)?\s*[:.]?\s*([\d\s,.]+)\s*(?:€|euros?|eur)',
                r'net\s*[àa]\s*payer\s*[:.]?\s*([\d\s,.]+)\s*(?:€|euros?|eur)',
                r'([\d\s,.]+)\s*(?:€|euros?|eur)\s*(?:ttc|toutes\s*taxes)'
            ],
            
            'tva': [
                r'tva\s*[:.]?\s*([\d\s,.]+)\s*%',
                r'taxe\s*[:.]?\s*([\d\s,.]+)\s*(?:€|euros?|eur)',
                r'([\d\s,.]+)\s*%\s*(?:tva)?'
            ],
            
            'client_name': [
                r'client\s*[:.]?\s*([^\n\r]+)',
                r'factur[eé]\s*[àa]\s*[:.]?\s*([^\n\r]+)',
                r'(?:à|to)\s*:\s*([^\n\r]+)',
                r'(?:destinataire|bill to)\s*[:.]?\s*([^\n\r]+)'
            ],
            
            'client_siret': [
                r'(?:siret|siren)\s*[:.]?\s*([\d\s]+)',
                r'([\d]{3,4}[\s]?[\d]{3,4}[\s]?[\d]{3,4})'
            ],
            
            'client_address': [
                r'adresse\s*[:.]?\s*([^\n\r]+(?:[\n\r][^\n\r]+)*?)(?=\n\s*\n|\n\s*[A-Z]|\Z)'
            ],
            
            'supplier_name': [
                r'^(.*?)(?:\n|$)',
                r'(?:fournisseur|seller|vendor)\s*[:.]?\s*([^\n\r]+)',
                r'([A-Z][A-Z\s]+(?:SARL|SAS|SA|EURL|EI))'
            ],
            
            'supplier_siret': [
                r'(?:siret|siren)\s*[:.]?\s*([\d\s]+)'
            ],
            
            'iban': [
                r'iban\s*[:.]?\s*([A-Z]{2}\d{2}[A-Z0-9]{10,30})',
                r'([A-Z]{2}\d{2}\s?(?:\d{4}\s?){5,7})'
            ]
        }
    
    def extract(self, text: str) -> Dict[str, Any]:
        """
        Extrait toutes les informations d'une facture
        """
        result = {
            'invoice_number': self._extract_field(text, 'invoice_number'),
            'date': self._extract_field(text, 'date'),
            'due_date': self._extract_field(text, 'due_date'),
            'total_ht': self._extract_amount(text, 'total_ht'),
            'total_ttc': self._extract_amount(text, 'total_ttc'),
            'tva': self._extract_percentage(text, 'tva'),
            'client': {
                'name': self._extract_field(text, 'client_name'),
                'siret': self._extract_field(text, 'client_siret'),
                'address': self._extract_field(text, 'client_address')
            },
            'supplier': {
                'name': self._extract_field(text, 'supplier_name'),
                'siret': self._extract_field(text, 'supplier_siret')
            },
            'iban': self._extract_field(text, 'iban'),
            'lines': self._extract_lines(text)
        }
        
        # Calculer TVA si manquante mais HT et TTC présents
        if result['total_ht'] and result['total_ttc'] and not result['tva']:
            ht = self._clean_amount(result['total_ht'])
            ttc = self._clean_amount(result['total_ttc'])
            if ht and ttc and ht > 0:
                tva_value = ttc - ht
                tva_percent = round((tva_value / ht) * 100, 2)
                result['tva'] = tva_percent
        
        return result
    
    def _extract_field(self, text: str, field: str) -> Optional[str]:
        """Extrait un champ texte"""
        patterns = self.patterns.get(field, [])
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.MULTILINE)
            if match:
                # Prendre le dernier groupe capturé (généralement la valeur)
                value = match.group(match.lastindex or len(match.groups()))
                return value.strip()
        
        return None
    
    def _extract_amount(self, text: str, field: str) -> Optional[float]:
        """Extrait un montant et le convertit en float"""
        value = self._extract_field(text, field)
        if value:
            return self._clean_amount(value)
        return None
    
    def _extract_percentage(self, text: str, field: str) -> Optional[float]:
        """Extrait un pourcentage"""
        value = self._extract_field(text, field)
        if value:
            # Nettoyer et convertir en float
            cleaned = re.sub(r'[^\d.,]', '', value)
            cleaned = cleaned.replace(',', '.')
            try:
                return float(cleaned)
            except:
                return None
        return None
    
    def _clean_amount(self, amount_str: str) -> Optional[float]:
        """Nettoie une chaîne de montant et la convertit en float"""
        if not amount_str:
            return None
        
        # Enlever les espaces et remplacer la virgule
        cleaned = re.sub(r'\s', '', amount_str)
        cleaned = cleaned.replace(',', '.')
        
        # Extraire les chiffres et le point décimal
        match = re.search(r'(\d+(?:\.\d{1,2})?)', cleaned)
        if match:
            try:
                return float(match.group(1))
            except:
                return None
        return None
    
    def _extract_lines(self, text: str) -> List[Dict[str, Any]]:
        """
        Tente d'extraire les lignes de facture
        """
        lines = []
        
        # Pattern pour détecter les lignes de facture
        # (description, quantité, prix unitaire, total)
        line_pattern = r'([^\n]{10,60}?)\s+(\d+)\s*x?\s*([\d\s,.]+)\s*€?\s*([\d\s,.]+)\s*€'
        
        matches = re.finditer(line_pattern, text, re.MULTILINE)
        
        for match in matches:
            description = match.group(1).strip()
            quantity = match.group(2).strip()
            unit_price = self._clean_amount(match.group(3))
            total = self._clean_amount(match.group(4))
            
            if description and quantity and unit_price:
                lines.append({
                    'description': description,
                    'quantity': int(quantity) if quantity.isdigit() else 1,
                    'unit_price': unit_price,
                    'total': total or (unit_price * int(quantity) if quantity.isdigit() else unit_price)
                })
        
        return lines