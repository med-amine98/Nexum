# app/services/support_ai_service.py
import re
from typing import List, Dict, Any
import logging

logger = logging.getLogger(__name__)

class SupportAIService:
    """Service IA pour la résolution automatique des tickets par secteur"""
    
    # Solutions par secteur et par type de problème
    SOLUTIONS = {
        "banque": {
            "login": {
                "solution": """
## 🔐 Problème de connexion bancaire - Solution

### Étape 1 : Vérification des identifiants
- Vérifiez votre numéro de client (8 chiffres)
- Vérifiez votre code secret (6 chiffres)
- Assurez-vous que votre clavier numérique est actif

### Étape 2 : Vérification de l'application
- Mettez à jour l'application bancaire
- Videz le cache de l'application
- Réinstallez l'application si nécessaire

### Étape 3 : Vérification du compte
- Vérifiez que votre compte n'est pas bloqué
- Vérifiez que votre carte n'est pas expirée
- Contactez votre agence si le problème persiste

### Assistance bancaire
- 📞 Service client : 0 800 123 456 (24h/24)
- 💬 Chat en ligne : disponible sur l'application
- 📧 Email : support@banque-neura.fr
""",
                "steps": [
                    "Vérifiez vos identifiants bancaires",
                    "Mettez à jour l'application mobile",
                    "Vérifiez l'état de votre compte",
                    "Contactez le service client bancaire"
                ],
                "confidence": 0.92
            },
            "transaction": {
                "solution": """
## 💰 Problème de transaction bancaire - Solution

### Étape 1 : Vérification du compte
- Vérifiez votre solde disponible
- Vérifiez vos plafonds de paiement quotidiens
- Vérifiez que vous n'avez pas atteint votre découvert autorisé

### Étape 2 : Vérification de la transaction
- Le bénéficiaire est-il correctement renseigné ?
- Le montant est-il dans les limites autorisées ?
- La devise est-elle correcte ?

### Étape 3 : Vérification des délais
- Les virements peuvent prendre 24-48h
- Les paiements par carte sont immédiats
- Les chèques peuvent prendre 5-7 jours

### Contact anti-fraude
- 📞 Service anti-fraude : 0 800 789 012 (24h/24)
- 📧 Email : fraude@banque-neura.fr
""",
                "steps": [
                    "Vérifiez votre solde et plafonds",
                    "Vérifiez les informations du bénéficiaire",
                    "Vérifiez les délais de traitement",
                    "Contactez le service anti-fraude"
                ],
                "confidence": 0.88
            },
            "general": {
                "solution": """
## 🏦 Assistance bancaire - Informations

Nous avons bien reçu votre demande concernant vos comptes bancaires.

### Services disponibles
- 💳 Consultation de comptes
- 💸 Virements et prélèvements
- 📊 Épargne et placements
- 🏠 Crédits immobiliers

### Horaires d'ouverture
- Lundi - Vendredi : 8h30 - 18h00
- Samedi : 9h00 - 13h00
- Dimanche : Fermé

### Contacts utiles
- 📞 Standard : 0 800 123 456
- 💬 Chat : neura-banque.fr/chat
- 📧 Email : contact@banque-neura.fr
""",
                "steps": [
                    "Identifiez votre besoin précis",
                    "Préparez votre numéro de client",
                    "Contactez votre conseiller bancaire"
                ],
                "confidence": 0.85
            }
        },
        "assurance": {
            "login": {
                "solution": """
## 🔐 Problème de connexion assurance - Solution

### Étape 1 : Vérification des identifiants
- Numéro de contrat à 10 chiffres
- Date de naissance du souscripteur
- Code postal de résidence

### Étape 2 : Réinitialisation du mot de passe
- Cliquez sur "Mot de passe oublié"
- Un email vous sera envoyé sous 5 minutes
- Vérifiez vos spams

### Étape 3 : Vérification du contrat
- Vérifiez que votre contrat est actif
- Vérifiez que vos cotisations sont à jour
- Contactez votre agent d'assurance

### Assistance assurance
- 📞 Service client : 0 800 456 789
- 💬 Chat : disponible sur l'espace client
- 📧 Email : support@assurance-neura.fr
""",
                "steps": [
                    "Vérifiez votre numéro de contrat",
                    "Réinitialisez votre mot de passe",
                    "Vérifiez l'état de votre contrat",
                    "Contactez votre agent d'assurance"
                ],
                "confidence": 0.92
            },
            "claim": {
                "solution": """
## 📄 Déclaration de sinistre - Procédure

### Étape 1 : Documents à préparer
- Constat amiable rempli et signé
- Photos des dégâts (minimum 5 photos)
- Devis de réparation
- Factures des biens endommagés

### Étape 2 : Déclaration du sinistre
- En ligne : espace client > Déclarer un sinistre
- Par téléphone : 0 800 456 789 (24h/24)
- Via l'application mobile

### Étape 3 : Suivi du dossier
- Un expert sera mandaté sous 48h
- Vous recevrez un accusé de réception
- Suivez l'avancement dans votre espace client

### Délais de traitement
- Expertise : 5-10 jours
- Indemnisation : 15-30 jours
""",
                "steps": [
                    "Préparez les documents nécessaires",
                    "Déclarez le sinistre en ligne ou par téléphone",
                    "Suivez l'avancement de votre dossier",
                    "Conservez toutes les preuves"
                ],
                "confidence": 0.90
            },
            "general": {
                "solution": """
## 🛡️ Assistance assurance - Informations

Votre demande a bien été prise en compte.

### Types de contrats disponibles
- 🚗 Assurance automobile
- 🏠 Assurance habitation
- ❤️ Assurance santé
- ✈️ Assurance voyage
- 👨‍👩‍👧‍👦 Assurance vie

### Contacts
- 📞 Standard : 0 800 456 789
- 💬 Chat : neura-assurance.fr/chat
- 📧 Email : contact@assurance-neura.fr

### Documents utiles
- Conditions générales
- Notice d'information
- Formulaire de résiliation
""",
                "steps": [
                    "Identifiez votre type de contrat",
                    "Préparez votre numéro de contrat",
                    "Contactez le service concerné"
                ],
                "confidence": 0.85
            }
        },
        "entreprise": {
            "login": {
                "solution": """
## 🔐 Problème de connexion professionnelle - Solution

### Étape 1 : Vérification des identifiants
- Email professionnel (nom@entreprise.com)
- Mot de passe (respectez la casse)
- Code d'entreprise (si demandé)

### Étape 2 : Vérification de la licence
- La licence est-elle à jour ?
- Le nombre d'utilisateurs est-il dépassé ?
- Contactez votre administrateur

### Étape 3 : Support technique
- Service technique : 0 800 789 012
- Email : support@neura-erp.com
- Chat : disponible sur la plateforme

### Assistance entreprise
- 📞 Support prioritaire : 24h/24, 7j/7
- 💬 Chat dédié : pour les comptes Premium
- 📧 Email : support@neura-erp.com
""",
                "steps": [
                    "Vérifiez vos identifiants professionnels",
                    "Vérifiez l'état de votre licence",
                    "Contactez votre administrateur",
                    "Contactez le support technique"
                ],
                "confidence": 0.92
            },
            "billing": {
                "solution": """
## 💰 Problème de facturation - Solution

### Étape 1 : Vérification de la facture
- Vérifiez la période de facturation
- Vérifiez les options souscrites
- Vérifiez le nombre d'utilisateurs

### Étape 2 : Vérification du paiement
- Le moyen de paiement est-il valide ?
- Y a-t-il eu un prélèvement ?
- Contactez votre service comptabilité

### Étape 3 : Contactez le service facturation
- Service facturation : 0 800 789 012
- Email : facturation@neura-erp.com
- Téléchargez vos factures dans l'espace client

### Informations utiles
- Factures disponibles en ligne
- Paiement par carte ou virement
- Devis sur demande
""",
                "steps": [
                    "Vérifiez votre facture en ligne",
                    "Vérifiez votre moyen de paiement",
                    "Contactez le service facturation",
                    "Mettez à jour vos coordonnées bancaires"
                ],
                "confidence": 0.88
            },
            "general": {
                "solution": """
## 🏢 Support entreprise - Informations

Nous avons bien reçu votre demande.

### Services disponibles
- 📊 Modules ERP (comptabilité, RH, ventes)
- 🤖 Intelligence artificielle
- 📈 Reporting et analytics
- 🔗 API et intégrations

### Assistance
- 📞 Support technique : 0 800 789 012
- 💬 Chat : disponible sur la plateforme
- 📧 Email : support@neura-erp.com

### Ressources
- 📚 Documentation en ligne
- 🎓 Formations disponibles
- 👥 Communauté d'utilisateurs
""",
                "steps": [
                    "Identifiez le module concerné",
                    "Consultez la documentation",
                    "Contactez le support technique"
                ],
                "confidence": 0.85
            }
        }
    }
    
    @staticmethod
    def detect_problem_type(description: str, sector: str) -> str:
        """Détecter le type de problème en fonction du secteur"""
        description_lower = description.lower()
        
        if sector == "banque":
            if any(word in description_lower for word in ['login', 'connexion', 'accès', 'mot de passe', 'identifiant']):
                return "login"
            elif any(word in description_lower for word in ['transaction', 'virement', 'paiement', 'carte', 'dépôt']):
                return "transaction"
            else:
                return "general"
                
        elif sector == "assurance":
            if any(word in description_lower for word in ['login', 'connexion', 'accès', 'mot de passe', 'identifiant']):
                return "login"
            elif any(word in description_lower for word in ['sinistre', 'accident', 'dégât', 'vol', 'incendie', 'claim']):
                return "claim"
            else:
                return "general"
                
        else:  # entreprise
            if any(word in description_lower for word in ['login', 'connexion', 'accès', 'mot de passe', 'identifiant']):
                return "login"
            elif any(word in description_lower for word in ['facture', 'facturation', 'paiement', 'billing', 'invoice']):
                return "billing"
            else:
                return "general"
    
    @staticmethod
    def analyze_ticket(description: str, category: str = None, sector: str = "entreprise") -> Dict[str, Any]:
        """Analyser le ticket et proposer une solution selon le secteur"""
        
        # Détection du type de problème
        problem_type = SupportAIService.detect_problem_type(description, sector)
        
        # Récupérer la solution adaptée
        sector_solutions = SupportAIService.SOLUTIONS.get(sector, SupportAIService.SOLUTIONS["entreprise"])
        solution_data = sector_solutions.get(problem_type, sector_solutions["general"])
        
        # Ajouter une note sur le secteur
        sector_note = f"\n\n---\n*🤖 Ce ticket a été traité par l'IA spécialisée dans le secteur **{sector.upper()}***"
        
        return {
            "solution": solution_data["solution"] + sector_note,
            "steps": solution_data["steps"],
            "sources": [
                {
                    "title": f"Base de connaissances - Secteur {sector.upper()}",
                    "excerpt": f"Guide de résolution pour les problèmes de {problem_type}",
                    "url": f"/knowledge-base/{sector}/{problem_type}"
                },
                {
                    "title": "FAQ - Questions fréquentes",
                    "excerpt": "Documentation officielle du support",
                    "url": "/knowledge-base/faq"
                }
            ],
            "confidence": solution_data["confidence"],
            "problem_type": problem_type,
            "sector": sector
        }
    
    @staticmethod
    def search_knowledge_base(query: str, knowledge_base: List[Dict], sector: str = None) -> List[Dict]:
        """Rechercher dans la base de connaissances par secteur"""
        
        query_lower = query.lower()
        results = []
        
        for item in knowledge_base:
            # Filtrer par secteur si spécifié
            if sector and item.get('sector') and item['sector'] != sector:
                continue
                
            score = 0
            if query_lower in item.get('title', '').lower():
                score += 50
            if query_lower in item.get('content', '').lower():
                score += 30
            if any(tag in query_lower for tag in item.get('tags', [])):
                score += 20
            
            if score > 0:
                results.append({
                    **item,
                    "relevance_score": score
                })
        
        results.sort(key=lambda x: x.get('relevance_score', 0), reverse=True)
        return results[:5]