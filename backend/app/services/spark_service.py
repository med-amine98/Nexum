# app/services/spark_service.py - Version sans PySpark
"""
Service Spark - Utilise l'API REST
"""

import logging
import requests
from typing import Dict, Any, List, Optional
from datetime import datetime

from app.core.config import settings

logger = logging.getLogger(__name__)

class SparkService:
    """Service Spark pour l'analyse en temps réel (API REST)"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def __init__(self):
        if hasattr(self, '_initialized'):
            return
        self._initialized = True
        self.master = settings.SPARK_MASTER
        self.ui_url = settings.SPARK_UI_URL
        self.is_connected = False
        self._check_connection()
        logger.info(f"✅ SparkService initialisé ({self.master})")
    
    def _check_connection(self):
        """Vérifie la connexion à Spark"""
        try:
            # Utiliser le nom du conteneur Spark Master
            spark_host = "neura-spark-master"
            spark_port = 8080
            url = f"http://{spark_host}:{spark_port}/json"
            
            response = requests.get(url, timeout=5)
            self.is_connected = response.status_code == 200
            if self.is_connected:
                logger.info(f"✅ Connecté à Spark sur {url}")
            else:
                logger.warning(f"⚠️ Spark non disponible (status: {response.status_code})")
        except Exception as e:
            logger.warning(f"⚠️ Spark non accessible: {e}")
            self.is_connected = False
    
    def analyze_transactions(self, transactions: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyse les transactions"""
        if not transactions:
            return {
                "stats": {"count": 0, "avg_amount": 0, "std_amount": 0, "min_amount": 0, "max_amount": 0},
                "anomalies_count": 0,
                "anomalies": []
            }
        
        try:
            amounts = [t.get("amount", 0) for t in transactions]
            n = len(amounts)
            
            if n == 0:
                return {"stats": {"count": 0, "avg_amount": 0, "std_amount": 0, "min_amount": 0, "max_amount": 0}, "anomalies_count": 0, "anomalies": []}
            
            avg_amount = sum(amounts) / n
            variance = sum((x - avg_amount) ** 2 for x in amounts) / n
            std_amount = variance ** 0.5
            
            min_amount = min(amounts)
            max_amount = max(amounts)
            
            threshold = avg_amount + 3 * std_amount if std_amount > 0 else float('inf')
            anomalies = [t for t in transactions if t.get("amount", 0) > threshold]
            
            return {
                "stats": {
                    "count": n,
                    "avg_amount": round(avg_amount, 2),
                    "std_amount": round(std_amount, 2),
                    "min_amount": round(min_amount, 2),
                    "max_amount": round(max_amount, 2),
                    "avg_fraud_score": round(sum(t.get("fraud_score", 0) for t in transactions) / n, 3) if n > 0 else 0
                },
                "risk_distribution": [],
                "anomalies_count": len(anomalies),
                "anomalies": [
                    {
                        "transaction_id": t.get("transaction_id"),
                        "amount": t.get("amount", 0),
                        "risk_level": t.get("risk_level", "low")
                    }
                    for t in anomalies[:20]
                ],
                "spark_connected": self.is_connected
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur analyse Spark: {e}")
            return {
                "stats": {"count": 0, "avg_amount": 0, "std_amount": 0, "min_amount": 0, "max_amount": 0},
                "anomalies_count": 0,
                "anomalies": [],
                "error": str(e)
            }

# Instance globale
spark_service = SparkService()