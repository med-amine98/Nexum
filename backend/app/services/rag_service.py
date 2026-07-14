# app/services/rag_service.py - Communication TOTALE (matrice complète)
from qdrant_client import QdrantClient
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Optional, Any
import os
import json
import logging
from datetime import datetime
import hashlib
import random
from collections import defaultdict

logger = logging.getLogger(__name__)

class RAGService:
    def __init__(self):
        qdrant_host = os.environ.get("QDRANT_HOST", "localhost")
        self.client = QdrantClient(host=qdrant_host, port=6333)
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        
        # LES 7 ASSISTANTS - ÉQUIPE COMPLÈTE
        self.assistants = {
            "copilot": {
                "collection": "copilot_knowledge",
                "role": "directeur",
                "color": "#8b5cf6",
                "description": "Directeur de l'équipe - Coordination et décision finale",
                "can_talk_to": ["sophie", "elena", "james", "risk", "growth", "predict"]
            },
            "sophie": {
                "collection": "risk_knowledge", 
                "role": "experte_risques",
                "color": "#ef4444",
                "description": "Experte en analyse des risques et conformité",
                "can_talk_to": ["copilot", "elena", "james", "risk", "growth", "predict"]
            },
            "elena": {
                "collection": "growth_knowledge",
                "role": "experte_croissance", 
                "color": "#52c41a",
                "description": "Experte en stratégie de croissance et acquisition",
                "can_talk_to": ["copilot", "sophie", "james", "risk", "growth", "predict"]
            },
            "james": {
                "collection": "predict_knowledge",
                "role": "expert_data",
                "color": "#1890ff", 
                "description": "Expert en data science et prédictions",
                "can_talk_to": ["copilot", "sophie", "elena", "risk", "growth", "predict"]
            },
            "risk": {
                "collection": "risk_knowledge",
                "role": "analyste_risque",
                "color": "#fa8c16",
                "description": "Analyste d'évaluation des risques",
                "can_talk_to": ["copilot", "sophie", "elena", "james", "growth", "predict"]
            },
            "growth": {
                "collection": "growth_knowledge", 
                "role": "analyste_croissance",
                "color": "#13c2c2",
                "description": "Analyste d'opportunités de croissance",
                "can_talk_to": ["copilot", "sophie", "elena", "james", "risk", "predict"]
            },
            "predict": {
                "collection": "predict_knowledge",
                "role": "specialiste_predictions",
                "color": "#722ed1",
                "description": "Spécialiste en modèles prédictifs",
                "can_talk_to": ["copilot", "sophie", "elena", "james", "risk", "growth"]
            }
        }
        
        # Collections
        self.collections = {
            "copilot": "copilot_knowledge",
            "sophie": "risk_knowledge",
            "elena": "growth_knowledge", 
            "james": "predict_knowledge",
            "risk": "risk_knowledge",
            "growth": "growth_knowledge",
            "predict": "predict_knowledge",
            "shared_intelligence": "nexy_shared_intelligence",
            "communication_logs": "communication_logs",
            "team_meetings": "team_meetings",
            "learning_feedback": "learning_feedback",
            "decisions": "team_decisions"
        }
        
        self._init_collections()
        self._load_knowledge_base()
        self._init_full_communication_matrix()
        logger.info("✅ RAG Service initialisé - Communication TOTALE entre TOUS les assistants (matrice 7x7)")
    
    def _init_collections(self):
        """Initialise toutes les collections"""
        for name in self.collections.values():
            try:
                self.client.create_collection(
                    collection_name=name,
                    vectors_config=models.VectorParams(
                        size=384,
                        distance=models.Distance.COSINE
                    )
                )
                logger.info(f"✅ Collection créée: {name}")
            except Exception:
                pass
    
    def _init_full_communication_matrix(self):
        """Initialise la matrice de communication COMPLÈTE 7x7 (tous parlent à tous)"""
        
        assistant_names = list(self.assistants.keys())
        total_connections = 0
        
        # Créer TOUTES les connexions possibles (sauf soi-même)
        for source in assistant_names:
            for target in assistant_names:
                if source != target:
                    # Vérifier que la communication est autorisée
                    if target in self.assistants[source]["can_talk_to"]:
                        connection_id = int(hashlib.md5(f"{source}_{target}".encode()).hexdigest()[:8], 16) % 1000000
                        
                        vector_text = f"{source} communique avec {target} - Collaboration en équipe"
                        vector = self.encoder.encode(vector_text).tolist()
                        
                        try:
                            self.client.upsert(
                                collection_name=self.collections["communication_logs"],
                                points=[
                                    models.PointStruct(
                                        id=connection_id,
                                        vector=vector,
                                        payload={
                                            "source": source,
                                            "target": target,
                                            "type": "bidirectional",
                                            "priority": "high",
                                            "active": True,
                                            "created_at": datetime.now().isoformat()
                                        }
                                    )
                                ]
                            )
                            total_connections += 1
                        except Exception:
                            pass
        
        logger.info(f"✅ Matrice de communication 7x7 initialisée: {total_connections} connexions actives")
    
    def _load_knowledge_base(self):
        """Charge la base de connaissances pour chaque assistant"""
        
        knowledge_base = {
            "sophie": [
                {"id": 1, "content": "Les sinistres les plus fréquents: incendies (35%), dégâts des eaux (28%), vols (22%).", "metadata": {"type": "sinistre", "importance": "high"}},
                {"id": 2, "content": "Scoring risque client: historique paiement (40%), secteur (25%), montant (20%), ancienneté (15%).", "metadata": {"type": "scoring", "importance": "high"}},
                {"id": 3, "content": "Clients haut risque (score>75): audit renforcé, révision garanties, suivi mensuel.", "metadata": {"type": "client", "importance": "high"}}
            ],
            "elena": [
                {"id": 1, "content": "Leviers croissance: acquisition (40%), fidélisation (35%), upselling (25%).", "metadata": {"type": "strategie", "importance": "high"}},
                {"id": 2, "content": "Taux d'attrition: 12.5%. Causes: prix (45%), support (30%), concurrence (25%).", "metadata": {"type": "attrition", "importance": "high"}},
                {"id": 3, "content": "Secteurs potentiels: Assurance (450K€), Banque (380K€), Retail (220K€).", "metadata": {"type": "opportunite", "importance": "high"}}
            ],
            "james": [
                {"id": 1, "content": "Score crédit moyen: 87/100. Capacité emprunt: 4.2x revenus.", "metadata": {"type": "credit", "importance": "high"}},
                {"id": 2, "content": "Détection fraude: 98.5% précision. 2 transactions suspectes ce mois.", "metadata": {"type": "fraude", "importance": "high"}},
                {"id": 3, "content": "Prévisions CA: mois 450K€, trimestre 1.35M€, année 5.4M€.", "metadata": {"type": "prevision", "importance": "high"}}
            ],
            "risk": [
                {"id": 1, "content": "Risque financier: PD 2.5%, LGD 45%, EAD moyen 100K€", "metadata": {"type": "credit_risk", "importance": "high"}},
                {"id": 2, "content": "Risques opérationnels: conformité 78%, 22% à améliorer", "metadata": {"type": "operational", "importance": "medium"}}
            ],
            "growth": [
                {"id": 1, "content": "Cross-selling: conversion 23%, panier moyen +156€", "metadata": {"type": "opportunity", "importance": "high"}},
                {"id": 2, "content": "Expansion: nouveaux marchés +35%, nouveaux produits +28%", "metadata": {"type": "expansion", "importance": "high"}}
            ],
            "predict": [
                {"id": 1, "content": "Churn prediction: accuracy 89%, features: fréquence, satisfaction", "metadata": {"type": "churn", "importance": "high"}},
                {"id": 2, "content": "Tendances: croissance Q3 +8%, Q4 +12%", "metadata": {"type": "trend", "importance": "high"}}
            ],
            "copilot": [
                {"id": 1, "content": "Je suis le directeur. Je peux parler à Sophie, Elena, James, Risk, Growth et Predict.", "metadata": {"type": "role", "importance": "high"}},
                {"id": 2, "content": "Toute l'équipe collabore. Chacun peut consulter les autres pour des décisions croisées.", "metadata": {"type": "team", "importance": "high"}},
                {"id": 3, "content": "Commandes: dites le nom d'un assistant pour lui parler directement.", "metadata": {"type": "voice", "importance": "medium"}}
            ]
        }
        
        for assistant, docs in knowledge_base.items():
            collection = self.collections.get(assistant, self.collections["copilot"])
            
            try:
                if self.client.collection_exists(collection):
                    self.client.delete_collection(collection)
                self.client.create_collection(
                    collection_name=collection,
                    vectors_config=models.VectorParams(size=384, distance=models.Distance.COSINE)
                )
            except:
                pass
            
            for doc in docs:
                vector = self.encoder.encode(doc["content"]).tolist()
                self.client.upsert(
                    collection_name=collection,
                    points=[models.PointStruct(id=doc["id"], vector=vector, payload={
                        "content": doc["content"], "metadata": doc["metadata"], "assistant": assistant
                    })]
                )
            
            logger.info(f"✅ {len(docs)} documents pour {assistant}")
    
    # ========== COMMUNICATION TOTALE ==========
    
    def talk(self, source: str, target: str, message: str, context: Dict = None) -> Dict:
        """Communication directe entre deux assistants (n'importe quelle paire)"""
        if source not in self.assistants:
            return {"success": False, "error": f"Source {source} inconnu"}
        if target not in self.assistants:
            return {"success": False, "error": f"Cible {target} inconnue"}
        
        # Vérifier si la communication est autorisée
        if target not in self.assistants[source]["can_talk_to"]:
            return {"success": False, "error": f"{source} ne peut pas parler à {target}"}
        
        try:
            comm_id = int(datetime.now().timestamp() * 1000) + random.randint(1, 1000)
            vector = self.encoder.encode(f"{source} → {target}: {message}").tolist()
            
            self.client.upsert(
                collection_name=self.collections["communication_logs"],
                points=[
                    models.PointStruct(
                        id=comm_id,
                        vector=vector,
                        payload={
                            "source": source,
                            "target": target,
                            "message": message,
                            "context": context or {},
                            "timestamp": datetime.now().isoformat(),
                            "type": "direct"
                        }
                    )
                ]
            )
            
            # Auto-apprentissage
            self._learn_from_exchange(source, target, message)
            
            logger.info(f"💬 {source} → {target}: {message[:50]}...")
            
            # Si Copilot parle, notifier tout le monde
            if source == "copilot":
                self._notify_team(source, target, message)
            
            return {
                "success": True,
                "from": source,
                "to": target,
                "message": message,
                "timestamp": datetime.now().isoformat()
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    def team_chat(self, speaker: str, message: str) -> Dict:
        """Chat d'équipe - l'assistant parle à TOUTE l'équipe"""
        results = {}
        for target in self.assistants.keys():
            if target != speaker:
                results[target] = self.talk(speaker, target, message)
        
        # Enregistrer la réunion d'équipe
        self._record_team_meeting(speaker, message, results)
        
        logger.info(f"👥 RÉUNION D'ÉQUIPE: {speaker} a parlé à toute l'équipe")
        
        return {
            "success": True,
            "speaker": speaker,
            "message": message,
            "team_size": len(self.assistants) - 1,
            "communications": results
        }
    
    def consult(self, requester: str, topic: str) -> Dict:
        """Consulter TOUS les assistants sur un sujet (comme une réunion)"""
        results = {}
        expert_opinions = []
        
        for assistant in self.assistants.keys():
            if assistant != requester:
                # Rechercher dans la base de l'assistant
                search_results = self._search_assistant_knowledge(assistant, topic)
                if search_results:
                    results[assistant] = search_results[0]["content"]
                    expert_opinions.append({
                        "expert": assistant,
                        "opinion": search_results[0]["content"],
                        "confidence": search_results[0]["score"]
                    })
                
                # Enregistrer la consultation
                self.talk(requester, assistant, f"Consultation sur: {topic}")
        
        # Synthèse par Copilot (le directeur)
        synthesis = self._synthesize_opinions(topic, expert_opinions) if expert_opinions else "Aucun avis d'expert disponible"
        
        return {
            "success": True,
            "requester": requester,
            "topic": topic,
            "consulted_assistants": list(results.keys()),
            "expert_opinions": expert_opinions,
            "director_synthesis": synthesis,
            "timestamp": datetime.now().isoformat()
        }
    
    def _search_assistant_knowledge(self, assistant: str, query: str) -> List[Dict]:
        """Recherche dans la connaissance d'un assistant spécifique"""
        collection = self.collections.get(assistant)
        if not collection:
            return []
        
        try:
            query_vector = self.encoder.encode(query).tolist()
            results = self.client.search(
                collection_name=collection,
                query_vector=query_vector,
                limit=1
            )
            return [{
                "content": hit.payload["content"],
                "score": round(hit.score, 3)
            } for hit in results]
        except:
            return []
    
    def _synthesize_opinions(self, topic: str, opinions: List[Dict]) -> str:
        """Synthétise les opinions des experts"""
        if not opinions:
            return f"Je n'ai pas pu consulter les experts sur {topic}"
        
        synthesis = f"📋 SYNTHÈSE DU DIRECŒUR sur '{topic}':\n\n"
        for opinion in opinions:
            synthesis += f"• {opinion['expert'].upper()}: {opinion['opinion'][:150]}...\n\n"
        
        synthesis += "✅ Décision: Tous les experts ont été consultés. Je recommande une analyse croisée."
        return synthesis
    
    def _learn_from_exchange(self, source: str, target: str, message: str):
        """Auto-apprentissage à partir des échanges"""
        try:
            learning_vector = self.encoder.encode(f"{source} a appris de {target}: {message}").tolist()
            
            self.client.upsert(
                collection_name=self.collections["learning_feedback"],
                points=[
                    models.PointStruct(
                        id=int(datetime.now().timestamp() * 1000),
                        vector=learning_vector,
                        payload={
                            "type": "exchange_learning",
                            "from": source,
                            "to": target,
                            "message": message,
                            "learned_at": datetime.now().isoformat()
                        }
                    )
                ]
            )
            
            # Enrichir la base du target
            self._enrich_assistant_knowledge(target, message, source)
        except Exception as e:
            logger.error(f"Erreur apprentissage: {e}")
    
    def _enrich_assistant_knowledge(self, assistant: str, knowledge: str, source: str):
        """Enrichit la base de connaissances d'un assistant"""
        try:
            collection = self.collections.get(assistant)
            if not collection:
                return
            
            new_id = random.randint(10000, 999999)
            vector = self.encoder.encode(knowledge).tolist()
            
            self.client.upsert(
                collection_name=collection,
                points=[
                    models.PointStruct(
                        id=new_id,
                        vector=vector,
                        payload={
                            "content": knowledge,
                            "metadata": {"type": "learned", "source": source, "learned_at": datetime.now().isoformat()},
                            "assistant": assistant
                        }
                    )
                ]
            )
            logger.info(f"📚 {assistant} a appris de {source}")
        except Exception as e:
            logger.error(f"Erreur enrichment: {e}")
    
    def _record_team_meeting(self, speaker: str, message: str, results: Dict):
        """Enregistre une réunion d'équipe"""
        try:
            vector = self.encoder.encode(f"Réunion: {speaker} a dit {message}").tolist()
            
            self.client.upsert(
                collection_name=self.collections["team_meetings"],
                points=[
                    models.PointStruct(
                        id=int(datetime.now().timestamp() * 1000),
                        vector=vector,
                        payload={
                            "speaker": speaker,
                            "message": message,
                            "participants": list(results.keys()),
                            "timestamp": datetime.now().isoformat()
                        }
                    )
                ]
            )
        except Exception:
            pass
    
    def _notify_team(self, source: str, target: str, message: str):
        """Notifie l'équipe quand Copilot parle"""
        # Copilot peut demander aux autres de réagir
        if "urgence" in message.lower() or "critique" in message.lower():
            for assistant in self.assistants.keys():
                if assistant != source and assistant != target:
                    self.talk("copilot", assistant, f"⚠️ Alerte: {message[:100]}")
    
    # ========== MÉTHODES PUBLIQUES ==========
    
    def search(self, assistant: str, query: str, limit: int = 3) -> List[Dict]:
        """Recherche dans la base d'un assistant"""
        collection = self.collections.get(assistant)
        if not collection:
            return []
        
        try:
            query_vector = self.encoder.encode(query).tolist()
            results = self.client.search(
                collection_name=collection,
                query_vector=query_vector,
                limit=limit
            )
            return [{
                "content": hit.payload["content"],
                "score": round(hit.score, 3),
                "metadata": hit.payload.get("metadata", {})
            } for hit in results]
        except:
            return []
    
    def search_all(self, query: str, limit: int = 2) -> Dict:
        """Recherche dans TOUS les assistants"""
        results = {}
        for assistant in self.assistants.keys():
            results[assistant] = self.search(assistant, query, limit)
        return results
    
    def get_team_status(self) -> Dict:
        """Statut de l'équipe"""
        return {
            "team_name": "Nexum AI Assistants",
            "director": "Copilot",
            "members": list(self.assistants.keys()),
            "total_members": len(self.assistants),
            "communication_matrix": "7x7 (tous parlent à tous)",
            "status": "active"
        }
    
    def get_assistant_info(self, name: str) -> Dict:
        """Informations sur un assistant"""
        if name not in self.assistants:
            return {"error": "Assistant non trouvé"}
        return {
            "name": name,
            "role": self.assistants[name]["role"],
            "color": self.assistants[name]["color"],
            "description": self.assistants[name]["description"],
            "can_talk_to": self.assistants[name]["can_talk_to"]
        }
    
    def get_conversation_history(self, limit: int = 50) -> List[Dict]:
        """Historique des conversations"""
        try:
            results = self.client.search(
                collection_name=self.collections["communication_logs"],
                query_vector=self.encoder.encode("all conversations").tolist(),
                limit=limit
            )
            return [{
                "from": hit.payload.get("source"),
                "to": hit.payload.get("target"),
                "message": hit.payload.get("message"),
                "timestamp": hit.payload.get("timestamp")
            } for hit in results]
        except:
            return []

# Instance globale
rag_service = RAGService()