# app/services/learning_service.py
import os
import json
import hashlib
from datetime import datetime
from typing import List, Dict, Optional
from qdrant_client import QdrantClient
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer
import logging
logger = logging.getLogger(__name__)
class ContinuousLearningService:
    def __init__(self):
        self.client = QdrantClient(host="neura-qdrant", port=6333)
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        
        self.collections = {
            "risk": "risk_knowledge",
            "growth": "growth_knowledge",
            "predict": "predict_knowledge",
            "copilot": "copilot_knowledge",
            "learned": "learned_knowledge",
            "feedback": "feedback_history"
        }
        
        self._init_collections()
        self._load_base_knowledge()
        logger.info("✅ Continuous Learning Service initialisé")
    
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
            except:
                pass
    
    def _load_base_knowledge(self):
        """Charge la base de connaissances initiale"""
        
        base_knowledge = {
            "risk": [
                "Les sinistres les plus fréquents sont les incendies (35%), dégâts des eaux (28%) et vols (22%)",
                "Le scoring de risque client se base sur historique de paiement (40%), secteur (25%), montant (20%), ancienneté (15%)",
                "Le délai moyen de traitement des sinistres est de 4.2 jours",
                "Le taux de conformité moyen est de 94%",
                "Clients à haut risque: scores > 75"
            ],
            "growth": [
                "Les leviers de croissance sont acquisition (40%), fidélisation (35%), upselling (25%)",
                "Le taux d'attrition moyen est de 12.5%",
                "Top secteurs: Assurance (450K€), Banque (380K€), Retail (220K€)",
                "Panier moyen: Banque 345€, Assurance 289€, Retail 156€"
            ],
            "predict": [
                "Score de crédit: 87/100, capacité emprunt 4.2x revenus",
                "Précision détection fraude: 98.5%",
                "Prévisions CA: mois 450K€, trimestre 1.35M€, année 5.4M€"
            ],
            "copilot": [
                "Redirection vers Sophie (Risk), Elena (Growth), James (Predict)",
                "Fonctionnalités: risques, croissance, prédictions, fraude"
            ]
        }
        
        for assistant, texts in base_knowledge.items():
            collection = self.collections[assistant]
            for i, text in enumerate(texts):
                self._add_document(collection, text, {"source": "base", "auto_learned": False})
    
    def _add_document(self, collection: str, content: str, metadata: dict) -> int:
        """Ajoute un document à Qdrant"""
        vector = self.encoder.encode(content).tolist()
        
        points = self.client.scroll(collection_name=collection, limit=10000)
        next_id = len(points[0]) if points[0] else 0
        
        self.client.upsert(
            collection_name=collection,
            points=[
                models.PointStruct(
                    id=next_id,
                    vector=vector,
                    payload={
                        "content": content,
                        "metadata": metadata,
                        "created_at": datetime.now().isoformat()
                    }
                )
            ]
        )
        return next_id
    
    # ========== MÉTHODE SEARCH PRINCIPALE ==========
    def search(self, assistant: str, query: str, limit: int = 5) -> List[Dict]:
        """Recherche les documents pertinents dans la base principale"""
        collection = self.collections.get(assistant)
        if not collection:
            return []
        
        query_vector = self.encoder.encode(query).tolist()
        results = self.client.search(
            collection_name=collection,
            query_vector=query_vector,
            limit=limit
        )
        
        return [
            {
                "content": hit.payload["content"],
                "score": round(hit.score, 3),
                "metadata": hit.payload.get("metadata", {}),
                "id": hit.id
            }
            for hit in results
        ]
    
    # ========== MÉTHODE SEARCH LEARNED (PRIORITAIRE) ==========
    def search_learned(self, assistant: str, query: str, limit: int = 3) -> List[Dict]:
        """Recherche uniquement dans les connaissances apprises"""
        collection = self.collections.get("learned")
        if not collection:
            return []
        
        query_vector = self.encoder.encode(query).tolist()
        results = self.client.search(
            collection_name=collection,
            query_vector=query_vector,
            limit=limit
        )
        
        # Filtrer par assistant et formater
        filtered = []
        for hit in results:
            payload = hit.payload
            metadata = payload.get("metadata", {})
            
            # Vérifier si la connaissance est pour cet assistant
            if metadata.get("assistant") == assistant or assistant in str(payload.get("content", "")):
                # Extraire la réponse
                content = payload.get("answer", payload.get("content", ""))
                if "RÉPONSE:" in content:
                    content = content.split("RÉPONSE:")[-1].strip()
                elif "ANSWER:" in content:
                    content = content.split("ANSWER:")[-1].strip()
                
                filtered.append({
                    "content": content,
                    "score": round(hit.score, 3),
                    "source": "learned",
                    "id": hit.id,
                    "question": payload.get("question", "")
                })
        
        return filtered
    
    # ========== MÉTHODE SEARCH AVEC APPRENTISSAGE ==========
    def search_with_learning(self, assistant: str, query: str, limit: int = 5) -> List[Dict]:
        """Recherche dans les connaissances de base ET les connaissances apprises"""
        
        results = []
        
        # 1. Recherche dans les connaissances apprises (priorité)
        learned_results = self.search_learned(assistant, query, limit)
        for hit in learned_results:
            results.append({
                "content": hit["content"],
                "score": hit["score"],
                "source": "learned",
                "id": hit.get("id")
            })
        
        # 2. Recherche dans la base de connaissances principale
        main_results = self.search(assistant, query, limit)
        for hit in main_results:
            results.append({
                "content": hit["content"],
                "score": hit["score"] * 0.95,  # Légère pénalité pour la base principale
                "source": "base_knowledge",
                "id": hit["id"]
            })
        
        # Trier par score
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:limit]
    
    # ========== APPRENTISSAGE ==========
    def learn_from_conversation(self, assistant: str, question: str, answer: str, feedback_score: int = None):
        """Apprend d'une conversation utilisateur"""
        
        # 1. Créer un document d'apprentissage
        learning_content = f"QUESTION: {question}\nRÉPONSE: {answer}"
        
        # 2. Générer un ID unique basé sur le contenu
        doc_id = int(hashlib.md5(learning_content.encode()).hexdigest()[:8], 16)
        
        # 3. Métadonnées
        metadata = {
            "source": "user_conversation",
            "original_question": question,
            "feedback_score": feedback_score,
            "learned_at": datetime.now().isoformat(),
            "assistant": assistant,
            "times_used": 1
        }
        
        # 4. Ajouter à Qdrant (collection learned)
        vector = self.encoder.encode(learning_content).tolist()
        
        self.client.upsert(
            collection_name=self.collections["learned"],
            points=[
                models.PointStruct(
                    id=doc_id,
                    vector=vector,
                    payload={
                        "content": learning_content,
                        "metadata": metadata,
                        "answer": answer,
                        "question": question
                    }
                )
            ]
        )
        
        # 5. Enregistrer le feedback
        if feedback_score:
            self._store_feedback(assistant, question, answer, feedback_score)
        
        logger.info(f"📚 Apprentissage: nouvelle connaissance ajoutée pour {assistant}")
        return True
    
    def _store_feedback(self, assistant: str, question: str, answer: str, score: int):
        """Stocke l'historique des feedbacks"""
        feedback_id = int(hashlib.md5(f"{question}{datetime.now()}".encode()).hexdigest()[:8], 16)
        
        feedback_content = f"Feedback {score}/5 pour: {question}"
        vector = self.encoder.encode(feedback_content).tolist()
        
        self.client.upsert(
            collection_name=self.collections["feedback"],
            points=[
                models.PointStruct(
                    id=feedback_id,
                    vector=vector,
                    payload={
                        "assistant": assistant,
                        "question": question,
                        "answer": answer,
                        "score": score,
                        "timestamp": datetime.now().isoformat()
                    }
                )
            ]
        )
    
    # ========== STATISTIQUES ==========
    def get_knowledge_stats(self, assistant: str) -> Dict:
        """Statistiques de la base de connaissances principale"""
        collection = self.collections.get(assistant)
        if not collection:
            return {"error": "Collection non trouvée"}
        
        points = self.client.scroll(collection_name=collection, limit=10000)
        docs = points[0] if points[0] else []
        
        # Aussi compter les connaissances apprises pour cet assistant
        learned_points = self.client.scroll(collection_name=self.collections["learned"], limit=10000)
        learned_docs = learned_points[0] if learned_points[0] else []
        
        learned_for_assistant = 0
        for doc in learned_docs:
            if doc.payload.get("metadata", {}).get("assistant") == assistant:
                learned_for_assistant += 1
        
        return {
            "assistant": assistant,
            "documents_count": len(docs),
            "learned_count": learned_for_assistant,
            "collections": list(self.collections.keys()),
            "qdrant_connected": True
        }
    
    def get_learning_stats(self) -> Dict:
        """Statistiques d'apprentissage"""
        try:
            learned_points = self.client.scroll(
                collection_name=self.collections["learned"],
                limit=10000
            )
            feedback_points = self.client.scroll(
                collection_name=self.collections["feedback"],
                limit=10000
            )
            
            learned_count = len(learned_points[0]) if learned_points[0] else 0
            feedback_count = len(feedback_points[0]) if feedback_points[0] else 0
            
            return {
                "learned_knowledge_count": learned_count,
                "feedback_count": feedback_count,
                "status": "active"
            }
        except Exception as e:
            return {"error": str(e), "status": "error"}

# Instance globale
learning_service = ContinuousLearningService()