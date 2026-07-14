# app/services/fraud_classifier.py
"""
Classificateur de fraude intégré - Utilise tous les services
"""

import logging
from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime

from app.core.config import settings 
from app.services.kafka_service import kafka_service
from app.services.neo4j_service import neo4j_service
from app.services.spark_service import spark_service
from app.services.graph_transformer_service import graph_transformer_service
from app.services.grover_service import grover_service
from app.services.blockchain_service import blockchain_service
from app.services.fraud_types import FraudType, FRAUD_CONFIG

logger = logging.getLogger(__name__)

class FraudClassifier:
    """Classificateur de fraude utilisant tous les services"""
    
    def __init__(self):
        self.services = {
            "kafka": kafka_service,
            "neo4j": neo4j_service,
            "spark": spark_service,
            "graph_transformer": graph_transformer_service,
            "grover": grover_service,
            "blockchain": blockchain_service
        }
        self.threshold = settings.FRAUD_CLASSIFICATION_THRESHOLD
        logger.info("✅ FraudClassifier initialisé avec tous les services")
    
    async def classify_transaction(self, transaction: Dict[str, Any]) -> Dict[str, Any]:
        """Classifie une transaction avec tous les services"""
        try:
            transaction_id = transaction.get("transaction_id", "unknown")
            logger.info(f"🔍 Classification: {transaction_id}")
            
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
            
            # 6. Convertir les probabilités GNN
            predictions = self._gnn_to_predictions(gnn_result)
            
            # 7. Optimiser avec Grover
            grover_result = grover_service.optimize_predictions(predictions, graph_data)
            optimized_predictions = grover_result.get("optimized_predictions", predictions)
            
            # 8. Déterminer le type de fraude
            fraud_type, confidence = self._determine_type(optimized_predictions)
            
            # 9. Extraire les indicateurs
            indicators = self._extract_indicators(transaction, graph_data, spark_result, fraud_type)
            
            # 10. Enregistrer dans la Blockchain
            blockchain_result = blockchain_service.record_transaction({
                "transaction_id": transaction_id,
                "fraud_type": fraud_type.value if fraud_type else "NONE",
                "confidence": confidence,
                "amount": transaction.get("amount", 0),
                "timestamp": datetime.now().isoformat()
            })
            
            # 11. Construire la réponse
            is_fraud = confidence > self.threshold
            result = {
                "success": True,
                "transaction_id": transaction_id,
                "fraud_detected": is_fraud,
                "fraud_type": fraud_type.value if fraud_type else None,
                "fraud_type_name": FRAUD_CONFIG.get(fraud_type, {}).get("name") if fraud_type else "Aucune",
                "confidence": confidence,
                "severity": FRAUD_CONFIG.get(fraud_type, {}).get("severity", "LOW") if fraud_type else "LOW",
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
            logger.error(f"❌ Erreur classification: {e}")
            return {
                "success": False,
                "transaction_id": transaction.get("transaction_id"),
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }
    
    def _gnn_to_predictions(self, gnn_result: Dict[str, Any]) -> Dict[str, float]:
        """Convertit la sortie GNN en probabilités par type"""
        predictions = {}
        fraud_types = list(FraudType)
        probabilities = gnn_result.get("probabilities", [])
        
        for i, fraud_type in enumerate(fraud_types):
            if i < len(probabilities):
                predictions[fraud_type.value] = float(probabilities[i])
            else:
                predictions[fraud_type.value] = 0.1
        
        return predictions
    
    def _determine_type(self, predictions: Dict[str, float]) -> Tuple[Optional[FraudType], float]:
        """Détermine le type de fraude"""
        if not predictions:
            return None, 0.0
        
        best_type_str = max(predictions, key=predictions.get)
        best_confidence = predictions[best_type_str]
        
        if best_confidence < self.threshold:
            return None, best_confidence
        
        try:
            fraud_type = FraudType(best_type_str)
            return fraud_type, best_confidence
        except ValueError:
            return None, best_confidence
    
    def _extract_indicators(self, transaction: Dict[str, Any], graph_data: Dict[str, Any], 
                           spark_result: Dict[str, Any], fraud_type: Optional[FraudType]) -> List[str]:
        """Extrait les indicateurs de fraude"""
        indicators = []
        
        # Indicateurs basés sur le montant
        amount = transaction.get("amount", 0)
        if amount > 10000:
            indicators.append("Montant élevé (> 10 000€)")
        if amount > 50000:
            indicators.append("Montant très élevé (> 50 000€)")
        
        # Indicateurs basés sur le graphe
        if graph_data.get("intermediaries", 0) > 2:
            indicators.append(f"Multiple intermédiaires ({graph_data['intermediaries']})")
        if graph_data.get("is_related", False):
            indicators.append("Relation suspecte entre comptes")
        
        # Indicateurs Spark
        if spark_result.get("anomalies_count", 0) > 0:
            indicators.append("Transaction anormale détectée par Spark")
        
        # Indicateurs spécifiques au type de fraude
        if fraud_type:
            fraud_indicators = FRAUD_CONFIG.get(fraud_type, {}).get("indicators", [])
            for ind in fraud_indicators[:3]:
                if ind == "multiple_countries":
                    if transaction.get("location") != transaction.get("usual_location"):
                        indicators.append("Transaction dans un pays différent")
                elif ind == "unusual_amount":
                    indicators.append("Montant inhabituel")
                elif ind == "circular_transactions":
                    indicators.append("Transactions circulaires détectées")
                elif ind == "shared_devices":
                    indicators.append("Appareil partagé avec d'autres comptes")
                elif ind == "rapid_redistribution":
                    indicators.append("Redistribution rapide des fonds")
                elif ind == "income_discrepancy":
                    indicators.append("Incohérence de revenu")
                elif ind == "unusual_access":
                    indicators.append("Accès en dehors des heures de bureau")
                elif ind == "unusual_route":
                    indicators.append("Route de virement complexe")
        
        # Indicateur par défaut
        if not indicators:
            indicators.append("Comportement suspect détecté")
        
        return indicators[:5]

# Instance globale
fraud_classifier = FraudClassifier()