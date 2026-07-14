# app/services/grover_service.py
"""
Service Grover Quantum - Connexion réelle au conteneur neura-grover
"""

import logging
import requests
import json
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.core.config import settings

logger = logging.getLogger(__name__)

class GroverService:
    """Service Grover Quantum pour l'optimisation"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
        self.url = settings.GROVER_URL
        self.is_ready = False
        self._check_health()
        logger.info(f"✅ GroverService initialisé ({self.url})")
    
    def _check_health(self):
        """Vérifie la santé du service"""
        try:
            response = requests.get(f"{self.url}/health", timeout=5)
            self.is_ready = response.status_code == 200
            if self.is_ready:
                logger.info(f"✅ Grover connecté sur {self.url}")
            else:
                logger.warning(f"⚠️ Grover non disponible (status: {response.status_code})")
        except Exception as e:
            logger.error(f"❌ Erreur connexion Grover: {e}")
            self.is_ready = False
    
    def optimize_predictions(self, predictions: Dict[str, float], graph_data: Dict[str, Any]) -> Dict[str, Any]:
        """Optimise les prédictions avec Grover"""
        if not self.is_ready:
            self._check_health()
            if not self.is_ready:
                return {
                    "optimized_predictions": predictions,
                    "confidence": 0.5,
                    "grover_score": 0,
                    "quantum_advantage": False,
                    "error": "Service non disponible"
                }
        
        try:
            response = requests.post(
                f"{self.url}/optimize",
                json={
                    "predictions": predictions,
                    "graph_data": graph_data,
                    "timestamp": datetime.now().isoformat()
                },
                timeout=settings.GROVER_TIMEOUT
            )
            
            if response.status_code == 200:
                result = response.json()
                return {
                    "optimized_predictions": result.get("optimized_predictions", predictions),
                    "confidence": result.get("confidence", 0.5),
                    "grover_score": result.get("grover_score", 0),
                    "quantum_advantage": result.get("quantum_advantage", False),
                    "iterations": result.get("iterations", 0)
                }
            else:
                logger.error(f"❌ Erreur Grover: {response.status_code}")
                return {
                    "optimized_predictions": predictions,
                    "confidence": 0.5,
                    "grover_score": 0,
                    "quantum_advantage": False,
                    "error": f"Status: {response.status_code}"
                }
                
        except requests.Timeout:
            logger.error("❌ Timeout Grover")
            return {
                "optimized_predictions": predictions,
                "confidence": 0.5,
                "grover_score": 0,
                "quantum_advantage": False,
                "error": "Timeout"
            }
        except Exception as e:
            logger.error(f"❌ Erreur optimisation Grover: {e}")
            return {
                "optimized_predictions": predictions,
                "confidence": 0.5,
                "grover_score": 0,
                "quantum_advantage": False,
                "error": str(e)
            }
    
    def detect_patterns(self, graph_data: Dict[str, Any]) -> List[str]:
        """Détecte les patterns de fraude avec Grover"""
        if not self.is_ready:
            self._check_health()
            if not self.is_ready:
                return []
        
        try:
            response = requests.post(
                f"{self.url}/detect-patterns",
                json={
                    "graph_data": graph_data,
                    "timestamp": datetime.now().isoformat()
                },
                timeout=settings.GROVER_TIMEOUT
            )
            
            if response.status_code == 200:
                result = response.json()
                return result.get("patterns", [])
            else:
                logger.error(f"❌ Erreur détection patterns: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"❌ Erreur détection patterns: {e}")
            return []
    
    def get_quantum_state(self) -> Dict[str, Any]:
        """Récupère l'état du quantum"""
        if not self.is_ready:
            self._check_health()
            if not self.is_ready:
                return {"status": "unavailable"}
        
        try:
            response = requests.get(
                f"{self.url}/quantum-state",
                timeout=5
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                return {"status": "error", "code": response.status_code}
                
        except Exception as e:
            logger.error(f"❌ Erreur get_quantum_state: {e}")
            return {"status": "error", "error": str(e)}

# Instance globale
grover_service = GroverService()