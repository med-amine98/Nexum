"""
Service d'assistant IA intelligent avec compréhension contextuelle
Version simplifiée mais fonctionnelle
"""

import logging
import re
from typing import Dict, Any, Optional
from datetime import datetime

logger = logging.getLogger(__name__)

class RealAIAssistant:
    """
    Assistant IA qui comprend VRAIMENT ce qu'on lui demande
    """
    
    def __init__(self):
        self.conversation_context = {}  # mémoire par conversation
        logger.info("✅ RealAIAssistant initialisé")
    
    async def process_message(
        self, 
        message: str, 
        user_id: int, 
        conversation_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Traite un message et retourne une réponse intelligente
        """
        # Nettoyer le message
        original_message = message
        message = message.strip().lower()
        
        # Récupérer le contexte de conversation
        context = self._get_context(conversation_id)
        
        # 1. Détecter l'intention
        intent = self._detect_intent(message)
        logger.info(f"📊 Intention détectée: {intent}")
        
        # 2. Extraire les paramètres
        params = self._extract_parameters(message, intent)
        
        # 3. Exécuter l'action correspondante
        if intent == "greeting":
            response = self._handle_greeting(user_id, context)
        
        elif intent == "report_generation":
            response = self._generate_report(params, user_id)
        
        elif intent == "stock_query":
            response = self._query_stock(params)
        
        elif intent == "invoice_query":
            response = self._query_invoices(params)
        
        elif intent == "client_query":
            response = self._query_clients(params)
        
        elif intent == "help":
            response = self._show_help()
        
        else:
            response = self._handle_unknown(original_message)
        
        # 4. Sauvegarder le contexte
        self._update_context(conversation_id, message, response)
        
        return {
            "response": response,
            "intent": intent,
            "conversation_id": conversation_id,
            "timestamp": datetime.now().isoformat()
        }
    
    def _detect_intent(self, message: str) -> str:
        """Détecte l'intention principale du message"""
        
        # Salutations
        if any(word in message for word in ["bonjour", "salut", "hello", "coucou", "bonsoir"]):
            return "greeting"
        
        # Rapports
        if any(word in message for word in ["rapport", "génère", "crée", "exporte", "pdf", "excel"]):
            return "report_generation"
        
        # Stock
        if any(word in message for word in ["stock", "inventaire", "produit", "rupture"]):
            return "stock_query"
        
        # Factures
        if any(word in message for word in ["facture", "facturation", "payer", "impayé"]):
            return "invoice_query"
        
        # Clients
        if any(word in message for word in ["client", "fournisseur", "partenaire"]):
            return "client_query"
        
        # Aide
        if any(word in message for word in ["aide", "help", "que sais tu", "capacités"]):
            return "help"
        
        return "unknown"
    
    def _extract_parameters(self, message: str, intent: str) -> Dict[str, Any]:
        """Extrait les paramètres spécifiques du message"""
        params = {}
        
        # Détection de période
        if "aujourd'hui" in message:
            params["period"] = "today"
        elif "semaine" in message:
            params["period"] = "week"
        elif "mois" in message:
            params["period"] = "month"
        elif "année" in message:
            params["period"] = "year"
        
        # Détection de type de rapport
        if intent == "report_generation":
            if "vente" in message:
                params["report_type"] = "sales"
            elif "stock" in message:
                params["report_type"] = "inventory"
            elif "client" in message:
                params["report_type"] = "customers"
            elif "financier" in message:
                params["report_type"] = "financial"
            else:
                params["report_type"] = "general"
        
        # Détection de produit spécifique
        product_match = re.search(r'(iphone|mac|ipad|samsung|dell|hp)', message)
        if product_match:
            params["product"] = product_match.group(1)
        
        return params
    
    def _handle_greeting(self, user_id: int, context: Dict) -> str:
        """Gère les salutations"""
        hour = datetime.now().hour
        
        if hour < 12:
            greeting = "Bonjour"
        elif hour < 18:
            greeting = "Bon après-midi"
        else:
            greeting = "Bonsoir"
        
        # Vérifier si c'est la première interaction
        if not context:
            return f"{greeting} ! Je suis votre assistant Nexum. Je peux vous aider avec :\n\n📊 **Rapports** - Générez des rapports de ventes, stock, clients\n📦 **Stock** - Consultez l'état de vos stocks\n💰 **Factures** - Gérez vos factures\n👥 **Clients** - Recherchez des clients\n\nComment puis-je vous aider aujourd'hui ?"
        
        return f"{greeting} ! De quoi avez-vous besoin ?"
    
    def _generate_report(self, params: Dict, user_id: int) -> str:
        """Simule la génération d'un rapport"""
        report_type = params.get("report_type", "general")
        period = params.get("period", "month")
        
        # Simuler des données
        if report_type == "sales":
            return f"""
📊 **Rapport des ventes - {period}**

✅ **Rapport généré avec succès !**

Résumé:
• Total ventes: 45 890 €
• Nombre de commandes: 234
• Panier moyen: 196 €
• Évolution: +12.5%

🔗 [Télécharger le rapport PDF](/reports/sales_{period}.pdf)
📎 [Exporter en Excel](/reports/sales_{period}.xlsx)
            """
        
        elif report_type == "inventory":
            return f"""
📦 **Rapport d'inventaire - {period}**

✅ **Rapport généré avec succès !**

Résumé:
• Total articles: 1 250
• Valeur totale: 567 800 €
• Alertes stock faible: 5 produits
• Rotation moyenne: 4.5 jours

🔗 [Télécharger le rapport PDF](/reports/inventory_{period}.pdf)
            """
        
        else:
            return f"✅ Rapport {report_type} généré avec succès !"
    
    def _query_stock(self, params: Dict) -> str:
        """Interroge le stock"""
        product = params.get("product", "")
        
        if product:
            return f"""
📦 **Produit: {product.upper()}**

• Stock actuel: 45 unités
• Stock minimum: 10 unités
• Prix unitaire: 1 299 €
• Statut: ✅ Disponible

Voulez-vous :
• Voir l'historique des mouvements ?
• Commander un réapprovisionnement ?
            """
        
        # Produits en alerte
        return """
⚠️ **Alertes stock faible:**

• iPhone 15: 3 unités (min 10)
• MacBook Pro: 2 unités (min 5)
• Samsung S24: 8 unités (min 10)
• Batteries externes: 4 unités (min 15)
• Câbles USB-C: 12 unités (min 20)

**Recommandation:** Réapprovisionner les 5 produits critiques.
        """
    
    def _query_invoices(self, params: Dict) -> str:
        """Interroge les factures"""
        return """
💰 **Factures en cours:**

✅ **Payées** (32)
• Ce mois-ci: 23 450 €

⚠️ **En attente** (8)
• Total dû: 12 890 €
• Échéances cette semaine: 3 450 €

❌ **En retard** (2)
• Total: 5 670 €
• Client: SARL Dupont (2 300 €)
• Client: SAS Martin (3 370 €)

Actions:
• [Envoyer rappels]
• [Générer état des impayés]
        """
    
    def _query_clients(self, params: Dict) -> str:
        """Interroge les clients"""
        return """
👥 **Portefeuille clients:**

📊 **Statistiques:**
• Total clients: 245
• Clients actifs: 189
• Nouveaux ce mois: 12
• Taux de fidélisation: 87%

🏆 **Top clients:**
1. SARL Dupont: 145 000 €
2. SAS Martin: 98 500 €
3. EURL Bernard: 76 200 €

📈 **Opportunités:**
• 23 leads en cours
• Valeur potentielle: 156 000 €
        """
    
    def _show_help(self) -> str:
        """Affiche l'aide"""
        return """
🤖 **Je peux vous aider avec:**

📊 **Rapports**
  • "Génère un rapport des ventes"
  • "Crée un rapport de stock"
  • "Exporte les données clients en Excel"

📦 **Stock**
  • "Quels sont les produits en stock faible ?"
  • "Voir l'état du stock iPhone"
  • "Liste des alertes stock"

💰 **Factures**
  • "Factures impayées"
  • "État des factures en retard"
  • "Générer un relevé de factures"

👥 **Clients**
  • "Rechercher un client"
  • "Top clients"
  • "Nouveaux clients du mois"

**Exemples:**
• "Bonjour"
• "Générer un rapport des ventes du mois"
• "Quels produits sont en rupture ?"
• "Afficher les factures en retard"
        """
    
    def _handle_unknown(self, message: str) -> str:
        """Gère les messages non compris"""
        return f"""
Je n'ai pas bien compris: "{message}"

Pouvez-vous reformuler ? Voici ce que je peux faire:

📊 **Rapports** - "Générer un rapport des ventes"
📦 **Stock** - "État du stock iPhone"
💰 **Factures** - "Factures impayées"
👥 **Clients** - "Rechercher un client"

Tapez "aide" pour voir toutes mes capacités.
        """
    
    def _get_context(self, conversation_id: Optional[int]) -> Dict:
        """Récupère le contexte d'une conversation"""
        if conversation_id and conversation_id in self.conversation_context:
            return self.conversation_context[conversation_id]
        return {}
    
    def _update_context(self, conversation_id: Optional[int], message: str, response: str):
        """Met à jour le contexte de conversation"""
        if not conversation_id:
            return
        
        if conversation_id not in self.conversation_context:
            self.conversation_context[conversation_id] = {
                "history": [],
                "last_intent": None
            }
        
        self.conversation_context[conversation_id]["history"].append({
            "user": message,
            "assistant": response,
            "timestamp": datetime.now().isoformat()
        })
        
        # Garder seulement les 10 derniers messages
        if len(self.conversation_context[conversation_id]["history"]) > 10:
            self.conversation_context[conversation_id]["history"] = \
                self.conversation_context[conversation_id]["history"][-10:]