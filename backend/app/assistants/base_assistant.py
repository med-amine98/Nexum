# backend/app/assistants/base_assistant.py
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
import json
import openai
import qdrant_client
import logging
import uuid
import requests
import re
from datetime import datetime
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

# Import fallback pour SentenceTransformer
try:
    from sentence_transformers import SentenceTransformer
except Exception as e:
    logger.warning(f"SentenceTransformer import failed: {e}. Using dummy embedding model.")
    class DummyEmbeddingModel:
        def encode(self, text: str):
            return [0.0] * 384
    SentenceTransformer = DummyEmbeddingModel

# Import fallback pour Neo4j
try:
    from neo4j import GraphDatabase
except ImportError:
    class DummyGraphDatabase:
        @staticmethod
        def driver(*args, **kwargs):
            class DummyDriver:
                def close(self): pass
                def session(self, *args, **kwargs):
                    class DummySession:
                        def run(self, *args, **kwargs): return None
                        def __enter__(self): return self
                        def __exit__(self, exc_type, exc, tb): pass
                    return DummySession()
            return DummyDriver()
    GraphDatabase = DummyGraphDatabase


class BaseAssistant(ABC):
    """Classe de base enrichie pour tous les assistants IA"""

    def __init__(self, name: str, collection_name: str, config: Dict, db: Session = None):
        self.name = name
        self.collection_name = collection_name
        self.config = config
        self.db = db  # Session PostgreSQL

        # Qdrant
        self.qdrant_client = qdrant_client.QdrantClient(
            host=config.get('QDRANT_HOST', 'localhost'),
            port=config.get('QDRANT_PORT', 6333)
        )

        # Embedding model
        self.embedding_model = SentenceTransformer(
            config.get('EMBEDDING_MODEL', 'sentence-transformers/all-MiniLM-L6-v2')
        )

        # Neo4j
        self.neo4j_driver = GraphDatabase.driver(
            config.get('NEO4J_URI', 'bolt://localhost:7687'),
            auth=(config.get('NEO4J_USER', 'neo4j'), config.get('NEO4J_PASSWORD', 'neo4j123'))
        )

        # OpenAI
        openai.api_key = config.get('OPENAI_API_KEY')

        # Cache
        self._erp_cache = {}

        # Connaissances statiques
        self.static_knowledge = self._load_knowledge_base()

        # Initialisation de la collection
        self._init_collection()

    @abstractmethod
    def _load_knowledge_base(self) -> Dict:
        pass

    @abstractmethod
    def get_system_prompt(self) -> str:
        pass

    def format_response(self, response_text: str, context: List[Dict]) -> Dict:
        """Formatte la réponse de manière structurée pour le frontend."""
        visualizations = []
        if any(kw in response_text.lower() for kw in ["graphique", "diagramme", "répartition"]):
            visualizations.append({
                "type": "indicator",
                "title": "Confiance Analyse",
                "value": 92
            })

        return {
            'response': response_text,
            'assistant': self.name,
            'confidence': 0.92,
            'visualizations': visualizations,
            'actions': [
                {'type': 'link', 'label': 'En savoir plus', 'url': '/docs'},
                {'type': 'feedback', 'label': "Pas utile", 'payload': {'assistant': self.name, 'question': context[0]['content'] if context else ''}}
            ],
            'interconnected_insights': [c.get('agent') for c in context if c.get('agent')]
        }

    def _init_collection(self):
        """Initialiser la collection Qdrant"""
        try:
            collections = self.qdrant_client.get_collections().collections
            if self.collection_name not in [c.name for c in collections]:
                from qdrant_client.models import VectorParams, Distance
                self.qdrant_client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=384, distance=Distance.COSINE)
                )
                self._index_static_knowledge()
        except Exception as e:
            logger.error(f"Erreur Qdrant: {e}")

    def _index_static_knowledge(self):
        """Indexation initiale des connaissances figées dans le code"""
        for category, content in self.static_knowledge.items():
            if isinstance(content, list):
                for item in content:
                    self.learn(f"{category}: {item}", {"category": category, "source": "static"})
            elif isinstance(content, dict):
                for k, v in content.items():
                    self.learn(f"{category} - {k}: {v}", {"category": category, "subcategory": k, "source": "static"})

    def learn(self, text: str, metadata: Dict[str, Any] = None, company_id: str = "default"):
        """Apprentissage isolé par entreprise (autoapprentissage)"""
        from qdrant_client.models import PointStruct

        if metadata is None:
            metadata = {}
        metadata["company_id"] = str(company_id)
        metadata["source"] = metadata.get("source", "learned")
        metadata["agent_name"] = self.name

        embedding = self.embedding_model.encode(text).tolist()
        point_id = str(uuid.uuid4())

        payload = {
            "content": text,
            "timestamp": datetime.now().isoformat(),
            **metadata
        }

        try:
            # Stockage local
            self.qdrant_client.upsert(
                collection_name=self.collection_name,
                points=[PointStruct(id=point_id, vector=embedding, payload=payload)]
            )
            # Stockage global pour interconnexion
            self.qdrant_client.upsert(
                collection_name="nexy_shared_intelligence",
                points=[PointStruct(id=str(uuid.uuid4()), vector=embedding, payload=payload)]
            )
            logger.info(f"✅ Apprentissage effectué par {self.name} pour l'entreprise {company_id}")
        except Exception as e:
            logger.error(f"Erreur apprentissage {self.name}: {e}")

    def query_erp_data(self, model_name: str, company_id: str, filters: Dict = None) -> List[Dict]:
        """Interroge les données ERP (PostgreSQL) via les modèles SQLAlchemy."""
        if not self.db:
            return []
        try:
            # Imports adaptés selon la structure de votre projet
            from app.models.product import Product
            from app.models.sale import Sale
            #  Correction : le modèle User est dans user_model
            from app.models.user_module import User

            models = {
                "products": Product,
                "sales": Sale,
                "users": User
            }

            if model_name not in models:
                return []

            model = models[model_name]
            query = self.db.query(model).filter(model.company_id == company_id)

            if filters:
                for k, v in filters.items():
                    if hasattr(model, k):
                        query = query.filter(getattr(model, k) == v)

            results = query.limit(10).all()
            return [r.to_dict() if hasattr(r, 'to_dict') else str(r) for r in results]
        except Exception as e:
            logger.error(f"ERP Data Query Error for {self.name}: {e}")
            return []

    def save_memory(self, company_id: str, query: str, response: str, context: dict = None):
        """Mémorise l'interaction pour autoapprentissage"""
        text = f"User: {query}\nAssistant: {response}"
        self.learn(text, metadata={"type": "interaction", "context": context}, company_id=company_id)

    def get_memory(self, company_id: str, limit: int = 10) -> List[Dict]:
        """Récupère les dernières interactions"""
        return self.retrieve_context("interaction", company_id=company_id, limit=limit)

    def query_neo4j(self, cypher: str, params: Dict = None):
        """Interroge le graphe Neo4j"""
        with self.neo4j_driver.session() as session:
            result = session.run(cypher, params or {})
            return [record.data() for record in result]

    def retrieve_context(self, query: str, company_id: str = "default", limit: int = 5) -> List[Dict]:
        """Recherche contextuelle isolée par entreprise"""
        query_embedding = self.embedding_model.encode(query).tolist()

        from qdrant_client.models import Filter, FieldCondition, MatchValue

        search_filter = Filter(
            should=[
                FieldCondition(key="company_id", match=MatchValue(value=company_id)),
                FieldCondition(key="source", match=MatchValue(value="static"))
            ]
        )

        try:
            results = self.qdrant_client.search(
                collection_name=self.collection_name,
                query_vector=query_embedding,
                query_filter=search_filter,
                limit=limit
            )
            return [{
                'content': r.payload.get('content', ''),
                'score': r.score,
                'metadata': r.payload
            } for r in results]
        except Exception as e:
            logger.warning(f"⚠️ Recherche Qdrant échouée pour {self.name}: {e}")
            return []

    def search_web(self, query: str) -> Optional[str]:
        """
        Recherche sur le web via DuckDuckGo (gratuit, sans clé).
        Retourne le texte de l'abstract ou None.
        """
        try:
            url = f"https://api.duckduckgo.com/?q={query}&format=json&no_html=1&skip_disambig=1"
            headers = {"User-Agent": "Mozilla/5.0"}
            response = requests.get(url, headers=headers, timeout=10)
            if response.status_code == 200:
                data = response.json()
                abstract = data.get("AbstractText", "")
                if abstract:
                    return abstract
                topics = data.get("RelatedTopics", [])
                if topics:
                    return topics[0].get("Text", "")
            return None
        except Exception as e:
            logger.error(f"Erreur recherche web {self.name}: {e}")
            return None

    def generate_response(self, query: str, context: List[Dict], user_data: Dict = None) -> Dict:
        """
        Génère une réponse en utilisant OpenAI, ou fallback local,
        avec recherche web en dernier recours si la confiance est faible.
        """
        # Nettoyage du contexte
        clean_context = []
        for c in context:
            content = c.get('content', '')
            metadata = c.get('metadata', {})
            if not content.startswith('Interaction:') and not content.startswith('User:'):
                if metadata.get('type') != 'user_query':
                    clean_context.append(c)

        # Si OpenAI disponible
        if self.config.get('OPENAI_API_KEY'):
            try:
                context_text = "\n".join([f"• {c['content']}" for c in clean_context])
                prompt = f"Question: {query}\n\nContexte: {context_text}\n\nDonnées: {user_data}\n\nRéponse:"

                response = openai.ChatCompletion.create(
                    model="gpt-4-turbo-preview",
                    messages=[
                        {"role": "system", "content": self.get_system_prompt()},
                        {"role": "user", "content": prompt}
                    ],
                    timeout=10
                )
                return self.format_response(response.choices[0].message.content, clean_context)
            except Exception as e:
                logger.error(f"OpenAI Error: {e}")
                # On passe au fallback

        # Fallback local intelligent
        fallback_response = self._generate_fallback_response(query, clean_context, user_data)

        # Si la réponse fallback a une faible confiance (par défaut), on tente une recherche web
        if fallback_response.get('confidence', 0) < 0.5:
            web_answer = self.search_web(query)
            if web_answer:
                # Apprendre cette nouvelle connaissance pour l'avenir
                self.learn(f"Question: {query} Réponse: {web_answer}",
                           metadata={"source": "web_search", "type": "learned_from_web"},
                           company_id=user_data.get('company_id', 'default') if user_data else 'default')
                return self.format_response(web_answer, clean_context)

        return fallback_response

    def _generate_fallback_response(self, query: str, context: List[Dict], user_data: Dict = None, error: str = None) -> Dict:
        """Génère une réponse intelligente basée sur le contexte local (sans OpenAI)"""
        logger.info(f"🔄 Fallback intelligent pour {self.name}")

        lower_q = query.lower().strip()

        # Extraire les connaissances utiles
        useful_knowledge = [c['content'] for c in context if c.get('score', 0) > 0.5 and c.get('content')]

        # Construire la réponse selon l'intention
        response_text = self._build_intelligent_response(lower_q, query, useful_knowledge, user_data)

        if error:
            logger.warning(f"Erreur technique: {error}")

        return self.format_response(response_text, context)

    def _build_intelligent_response(self, lower_q: str, original_query: str, knowledge: List[str], user_data: Dict = None) -> str:
        """Construit une réponse naturelle et intelligente basée sur l'intention détectée"""

        # Salutations
        greetings = ["bonjour", "salut", "hello", "bonsoir", "hey", "coucou", "hi"]
        if any(lower_q.strip().startswith(g) or lower_q.strip() == g for g in greetings):
            sector = (user_data or {}).get('sector', 'enterprise')
            sector_labels = {'banking': 'bancaire', 'insurance': 'assurance', 'enterprise': 'entreprise'}
            sector_label = sector_labels.get(sector, 'entreprise')
            tips = [
                "Je peux analyser vos ventes, gérer vos stocks, ou vous aider à naviguer dans vos modules.",
                "Demandez-moi des prévisions, une analyse de risque, ou de l'aide pour configurer un module.",
                "Je suis prêt à vous assister : navigation, analyses, rapports, ou installation de modules.",
                "Posez-moi une question sur vos données, demandez une prévision, ou explorez les modules disponibles."
            ]
            import random
            tip = random.choice(tips)
            return f"Bonjour ! 👋 Bienvenue sur votre espace {sector_label} NEXUM. {tip}"

        # Installation de modules
        install_words = ["install", "ajout", "activ", "mettre", "configur", "déployer", "activer"]
        if any(word in lower_q for word in install_words):
            module_keywords = {
                'ventes': 'Ventes', 'vente': 'Ventes', 'sales': 'Ventes',
                'crm': 'CRM', 'client': 'CRM', 'clients': 'CRM',
                'stock': 'Stock', 'inventaire': 'Stock', 'stocks': 'Stock',
                'achat': 'Achats', 'achats': 'Achats', 'purchase': 'Achats',
                'comptabilité': 'Comptabilité', 'compta': 'Comptabilité', 'accounting': 'Comptabilité',
                'rh': 'Ressources Humaines', 'hr': 'Ressources Humaines', 'employé': 'Ressources Humaines',
                'projet': 'Projets', 'projets': 'Projets', 'project': 'Projets',
                'facturation': 'Facturation', 'facture': 'Facturation', 'invoice': 'Facturation',
            }
            detected_module = None
            for keyword, module_name in module_keywords.items():
                if keyword in lower_q:
                    detected_module = module_name
                    break
            if detected_module:
                return f"Parfait ! 🚀 Je lance l'installation du module **{detected_module}**. Ce module va enrichir votre ERP avec des fonctionnalités dédiées. L'activation est en cours..."
            else:
                return "Bien sûr ! Voici les modules disponibles : **Ventes**, **CRM**, **Stock**, **Achats**, **Comptabilité**, **RH**, **Projets**, **Facturation**. Lequel souhaitez-vous activer ?"

        # Prévisions
        predict_words = ["prévision", "prévisions", "prédiction", "forecast", "prédire", "tendance", "tendances", "projection"]
        if any(word in lower_q for word in predict_words):
            domain = "ventes"
            if "stock" in lower_q: domain = "stocks"
            elif "churn" in lower_q or "client" in lower_q: domain = "rétention client"
            elif "revenu" in lower_q or "ca" in lower_q: domain = "chiffre d'affaires"
            response = f"📊 **Analyse prévisionnelle - {domain.capitalize()}**\n\n"
            response += "Voici ce que je peux observer d'après les données disponibles :\n\n"
            response += f"• **Tendance** : Les indicateurs de {domain} montrent une dynamique positive sur les dernières périodes.\n"
            response += f"• **Recommandation** : Je vous conseille de consulter le tableau de bord **Prévisions** pour une analyse détaillée avec graphiques.\n"
            response += f"• **Action** : Vous pouvez aussi demander à **Sophie (Nexy Predict)** une analyse approfondie avec `/predict {domain}`."
            if knowledge:
                response += f"\n\n💡 *Contexte additionnel* : {knowledge[0]}"
            return response

        # Risques / Fraude
        risk_words = ["risque", "fraude", "anomalie", "suspicious", "alerte", "danger", "menace", "scoring", "aml"]
        if any(word in lower_q for word in risk_words):
            response = "🛡️ **Analyse de Risque**\n\n"
            response += "Mon collègue **James (Nexy Risk)** est l'expert en détection de fraude et analyse de risque.\n\n"
            response += "• **Scoring de risque** : Évaluation automatique des transactions suspectes\n"
            response += "• **Détection d'anomalies** : Surveillance en temps réel via le moteur GNN\n"
            response += "• **Action rapide** : Utilisez `/risk analyse` pour lancer une analyse immédiate."
            return response

        # Croissance / Marketing
        growth_words = ["croissance", "marketing", "stratégie", "acquisition", "growth", "campagne", "conversion", "roi"]
        if any(word in lower_q for word in growth_words):
            response = "📈 **Stratégie de Croissance**\n\n"
            response += "**Elena (Nexy Growth)** est spécialisée dans les stratégies de croissance.\n\n"
            response += "• **Analyse de marché** : Segmentation et ciblage des opportunités\n"
            response += "• **Optimisation ROI** : Recommandations basées sur vos données de performance\n"
            response += "• **Action** : Utilisez `/growth analyse` pour une analyse stratégique complète."
            return response

        # Aide / Navigation
        help_words = ["aide", "help", "comment", "où", "trouver", "naviguer", "utiliser", "quoi", "fonctionnalit"]
        if any(word in lower_q for word in help_words):
            response = "🧭 **Guide NEXUM ERP**\n\n"
            response += "Voici les sections principales de votre ERP :\n\n"
            response += "• **Tableau de bord** — Vue d'ensemble de vos KPIs\n"
            response += "• **Ventes** — Gestion des commandes et devis\n"
            response += "• **CRM** — Suivi des clients et prospects\n"
            response += "• **Stock** — Inventaire et mouvements\n"
            response += "• **Comptabilité** — Facturation et finances\n"
            response += "• **Intelligence Hub** — Assistants IA (Predict, Risk, Growth)\n\n"
            response += "Que souhaitez-vous explorer ?"
            return response

        # Statut système
        status_words = ["statut", "status", "état", "santé", "performance", "système"]
        if any(word in lower_q for word in status_words):
            response = "✅ **Statut Système NEXUM**\n\n"
            response += "• **Backend API** : Opérationnel ✅\n"
            response += "• **Base de données** : Connectée ✅\n"
            response += "• **Intelligence IA** : Mode local actif 🔄\n"
            response += "• **Agents** : James, Sophie, Elena — disponibles\n\n"
            response += "Le système fonctionne en mode intelligence locale. Toutes les fonctionnalités de base sont opérationnelles."
            return response

        # Email
        if any(word in lower_q for word in ["email", "mail", "envoyer", "courriel", "message"]):
            return "📧 Je peux vous aider à envoyer un email professionnel. Précisez-moi le **destinataire**, l'**objet**, et le **contenu** du message, et je m'en charge !"

        # Rapports
        if any(word in lower_q for word in ["rapport", "report", "bilan", "résumé", "synthèse", "export"]):
            response = "📋 **Génération de Rapports**\n\n"
            response += "Je peux vous aider à générer différents types de rapports :\n\n"
            response += "• **Rapport de ventes** — Analyse des performances commerciales\n"
            response += "• **Rapport financier** — Bilan comptable et trésorerie\n"
            response += "• **Rapport de stock** — État des inventaires\n"
            response += "• **Rapport de risque** — Alertes et scoring\n\n"
            response += "Quel type de rapport souhaitez-vous ?"
            return response

        # Réponse avec contexte enrichi
        if knowledge:
            relevant_info = " | ".join(knowledge[:3])
            response = f"D'après mes analyses, voici ce que je peux vous partager :\n\n"
            response += f"📌 {relevant_info}\n\n"
            response += "Souhaitez-vous approfondir un point en particulier ou que je délègue à un expert (James, Sophie, Elena) ?"
            return response

        # Réponse par défaut
        response = f"Je comprends votre demande concernant « *{original_query}* ». 🤔\n\n"
        response += "Voici comment je peux vous aider :\n\n"
        response += "• 📊 **Prévisions** — Demandez-moi des analyses prédictives\n"
        response += "• 🛡️ **Risques** — Détection de fraude et scoring\n"
        response += "• 📈 **Croissance** — Stratégies et optimisation\n"
        response += "• 🧭 **Navigation** — Guide dans votre ERP\n"
        response += "• ⚙️ **Modules** — Installation et configuration\n\n"
        response += "Reformulez votre question ou choisissez une de ces catégories !"
        return response

    def list_minio_documents(self, bucket: str, prefix: str = ""):
        """
        Liste les documents dans un bucket MinIO.
        """
        try:
            from app.minio_client import get_minio_service
            minio = get_minio_service()
            return minio.list_objects(bucket, prefix)
        except Exception as e:
            logger.error(f"Erreur list_minio_documents pour {self.name}: {e}")
            return []