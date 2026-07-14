# app/services/fraud_pipeline.py
"""
Pipeline principal de détection de fraude
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from app.services.kafka_service import kafka_service
from app.services.neo4j_service import neo4j_service
from app.services.spark_service import spark_service
from app.services.graph_transformer_service import graph_transformer_service
from app.services.grover_service import grover_service
from app.services.blockchain_service import blockchain_service
from app.services.fraud_classifier import fraud_classifier

logger = logging.getLogger(__name__)

class FraudPipeline:
    """Pipeline principal de détection de fraude"""
    
    def __init__(self):
        self.services = {
            "kafka": kafka_service,
            "neo4j": neo4j_service,
            "spark": spark_service,
            "graph_transformer": graph_transformer_service,
            "grover": grover_service,
            "blockchain": blockchain_service
        }
        logger.info("✅ FraudPipeline initialisé")
    
    async def process_transaction(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """Traite une transaction avec tout le pipeline"""
        try:
            transaction_id = transaction.get("transaction_id", "unknown")
            logger.info(f"📥 Transaction reçue: {transaction_id}")
            
            # 1. Envoyer à Kafka
            kafka_service.send_transaction(transaction)
            
            # 2. Sauvegarder dans Neo4j
            neo4j_service.save_transaction(transaction)
            
            # 3. Récupérer les données du graphe
            graph_data = neo4j_service.get_transaction_graph(transaction_id)
            
            # 4. Analyser avec Spark
            spark_result = spark_service.analyze_transactions([transaction])
            
            # 5. Analyser avec GraphTransformer (GNN)
            gnn_result = graph_transformer_service.analyze_transaction(transaction, graph_data)
            
            # 6. Optimiser avec Grover
            predictions = fraud_classifier._gnn_to_predictions(gnn_result)
            grover_result = grover_service.optimize_predictions(predictions, graph_data)
            optimized_predictions = grover_result.get("optimized_predictions", predictions)
            
            # 7. Déterminer le type de fraude
            fraud_type, confidence = fraud_classifier._determine_type(optimized_predictions)
            
            # 8. Extraire les indicateurs
            indicators = fraud_classifier._extract_indicators(transaction, graph_data, spark_result, fraud_type)
            
            # 9. Enregistrer dans la Blockchain
            blockchain_result = blockchain_service.record_transaction({
                "transaction_id": transaction_id,
                "fraud_type": fraud_type.value if fraud_type else "NONE",
                "confidence": confidence,
                "amount": transaction.get("amount", 0),
                "timestamp": datetime.now().isoformat()
            })
            
            # 10. Construire la réponse
            is_fraud = confidence > fraud_classifier.threshold
            result = {
                "success": True,
                "transaction_id": transaction_id,
                "fraud_detected": is_fraud,
                "fraud_type": fraud_type.value if fraud_type else None,
                "fraud_type_name": fraud_classifier._get_fraud_type_name(fraud_type),
                "confidence": confidence,
                "severity": fraud_classifier._get_fraud_severity(fraud_type),
                "indicators": indicators,
                "blockchain_tx_hash": blockchain_result.get("tx_hash"),
                "block_number": blockchain_result.get("block_number"),
                "grover_optimized": grover_result.get("quantum_advantage", False),
                "gnn_confidence": gnn_result.get("confidence", 0),
                "spark_anomalies": spark_result.get("anomalies_count", 0),
                "graph_intermediaries": graph_data.get("intermediaries", 0),
                "timestamp": datetime.now().isoformat()
            }
            
            # Si fraude détectée, envoyer une alerte
            if is_fraud:
                kafka_service.send_alert(result)
                logger.info(f"🚨 FRAUDE DÉTECTÉE: {result['fraud_type_name']} ({confidence:.2%})")
            else:
                logger.info(f"✅ Transaction légitime: {confidence:.2%}")
            
            return result
            
        except Exception as e:
            logger.error(f"❌ Erreur pipeline: {e}")
            return {
                "success": False,
                "transaction_id": transaction.get("transaction_id"),
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def get_status(self) -> Dict[str, Any]:
        """Récupère le statut de tous les services"""
        status = {
            "timestamp": datetime.now().isoformat(),
            "services": {}
        }
        
        for name, service in self.services.items():
            if hasattr(service, "is_connected"):
                status["services"][name] = {
                    "connected": service.is_connected,
                    "status": "healthy" if service.is_connected else "unhealthy"
                }
            elif hasattr(service, "is_ready"):
                status["services"][name] = {
                    "connected": service.is_ready,
                    "status": "healthy" if service.is_ready else "unhealthy"
                }
            else:
                status["services"][name] = {"status": "unknown"}
        
        return status


# ✅ Exporter la classe que main.py essaie d'importer
FraudDetectionService = FraudPipeline


# ✅ Instance globale pour utilisation
fraud_pipeline = FraudPipeline()