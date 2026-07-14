# app/services/graph_transformer_service.py
"""
Service GraphTransformer - Connexion réelle au conteneur neura-graph-transformer
"""

import logging
import numpy as np
import requests
import json
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.core.config import settings

logger = logging.getLogger(__name__)

class GraphTransformerService:
    """Service GraphTransformer pour l'analyse des graphes"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
        # ✅ Utiliser le bon nom de conteneur
        self.url = "http://neura-graph-transformer:8000"
        self.is_ready = False
        self._check_health()
        logger.info(f"✅ GraphTransformerService initialisé ({self.url})")
    
    def _check_health(self):
        """Vérifie la santé du service"""
        try:
            response = requests.get(f"{self.url}/health", timeout=5)
            self.is_ready = response.status_code == 200
            if self.is_ready:
                logger.info(f"✅ GraphTransformer connecté sur {self.url}")
            else:
                logger.warning(f"⚠️ GraphTransformer non disponible (status: {response.status_code})")
        except requests.exceptions.ConnectionError:
            logger.warning(f"⚠️ GraphTransformer non accessible sur {self.url}")
            self.is_ready = False
        except Exception as e:
            logger.error(f"❌ Erreur connexion GraphTransformer: {e}")
            self.is_ready = False
    
    def analyze_transaction(self, transaction: Dict[str, Any], graph_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyse une transaction avec le GNN"""
        if not self.is_ready:
            # ✅ Retourner un résultat par défaut au lieu d'échouer
            return {
                "probabilities": [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1],
                "confidence": 0.1,
                "embedding": [],
                "graph_score": 0.1,
                "error": "Service non disponible"
            }
        
        try:
            # Construire les features pour le GNN
            features = self._build_features(transaction, graph_data)
            
            # Appeler le service
            response = requests.post(
                f"{self.url}/analyze",
                json={
                    "transaction_id": transaction.get("transaction_id"),
                    "amount": transaction.get("amount", 0),
                    "sender": transaction.get("sender", {}),
                    "recipient": transaction.get("recipient", {}),
                    "features": features.tolist(),
                    "graph_data": graph_data,
                    "timestamp": datetime.now().isoformat()
                },
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "probabilities": result.get("probabilities", []),
                    "embedding": result.get("embedding", []),
                    "confidence": result.get("confidence", 0.5),
                    "fraud_type": result.get("fraud_type", "UNKNOWN"),
                    "graph_score": result.get("graph_score", 0)
                }
            else:
                logger.error(f"❌ Erreur GNN: {response.status_code}")
                return {
                    "probabilities": [],
                    "confidence": 0.5,
                    "embedding": [],
                    "graph_score": 0,
                    "error": f"Status: {response.status_code}"
                }
                
        except Exception as e:
            logger.error(f"❌ Erreur analyse GNN: {e}")
            return {
                "probabilities": [],
                "confidence": 0.5,
                "embedding": [],
                "graph_score": 0,
                "error": str(e)
            }
    
    def _build_features(self, transaction: Dict[str, Any], graph_data: Dict[str, Any]) -> np.ndarray:
        """Construit le vecteur de features pour le GNN"""
        features = [
            transaction.get("amount", 0) / 10000,
            graph_data.get("intermediaries", 0) / 10,
            len(graph_data.get("intermediary_accounts", [])),
            float(transaction.get("fraud_score", 0)),
            float(transaction.get("risk_score", 0)),
            float(transaction.get("velocity", 1)),
            float(transaction.get("frequency", 1)),
            1.0 if graph_data.get("is_related", False) else 0.0
        ]
        
        # Padding à 384 dimensions
        while len(features) < 384:
            features.append(0.0)
        
        return np.array(features[:384], dtype=np.float32)

# Instance globale
graph_transformer_service = GraphTransformerService()