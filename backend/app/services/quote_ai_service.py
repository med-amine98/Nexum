# app/services/quote_ai_service.py
import re
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class QuoteAIService:
    """Service IA pour la génération intelligente de devis"""
    
    @staticmethod
    def analyze_description(description: str) -> Dict[str, Any]:
        """Analyser la description et extraire des informations"""
        
        # Détection du type de prestation
        service_keywords = ['prestation', 'service', 'conseil', 'formation', 'audit', 'consultant', 'accompagnement']
        product_keywords = ['produit', 'matériel', 'équipement', 'logiciel', 'licence', 'matériel']
        subscription_keywords = ['abonnement', 'annuel', 'mensuel', 'saas', 'maintenance', 'support']
        
        quote_type = "prestation"
        if any(word in description.lower() for word in product_keywords):
            quote_type = "produit"
        elif any(word in description.lower() for word in subscription_keywords):
            quote_type = "abonnement"
        
        # Extraction des montants
        amounts = re.findall(r'(\d+(?:[.,]\d+)?)\s*€', description)
        amounts = [float(a.replace(',', '.')) for a in amounts]
        
        # Extraction de la durée
        duration = 1
        duration_match = re.search(r'(\d+)\s*(?:mois|an|année|jour)', description.lower())
        if duration_match:
            duration = int(duration_match.group(1))
        
        # Génération des items suggérés
        suggested_items = []
        
        if quote_type == "prestation":
            suggested_items = [
                {"name": "Analyse des besoins", "quantity": 1, "price": 300},
                {"name": "Prestation de conseil", "quantity": duration, "price": 800},
                {"name": "Rapport de synthèse", "quantity": 1, "price": 200}
            ]
        elif quote_type == "produit":
            base_price = amounts[0] if amounts else 1000
            suggested_items = [
                {"name": "Matériel / Équipement", "quantity": 1, "price": base_price},
                {"name": "Installation", "quantity": 1, "price": 200},
                {"name": "Formation utilisateur", "quantity": 1, "price": 500}
            ]
        elif quote_type == "abonnement":
            base_price = amounts[0] if amounts else 100
            suggested_items = [
                {"name": "Abonnement mensuel", "quantity": duration, "price": base_price},
                {"name": "Support technique", "quantity": 1, "price": 100}
            ]
        
        # Suggestion de remise
        recommended_discount = 0
        if len(amounts) > 1 and amounts[0] > 2000:
            recommended_discount = 10
        elif duration > 6:
            recommended_discount = 15
        
        return {
            "type": quote_type,
            "suggested_items": suggested_items,
            "recommended_discount": recommended_discount,
            "duration": duration,
            "detected_amounts": amounts
        }
    
    @staticmethod
    def enhance_description(description: str) -> str:
        """Améliorer la description"""
        
        enhancements = []
        
        if "livraison" not in description.lower():
            enhancements.append("Livraison sous 48h")
        
        if "garantie" not in description.lower():
            enhancements.append("Garantie 1 an incluse")
        
        if enhancements:
            return description + " (" + ", ".join(enhancements) + ")"
        
        return description