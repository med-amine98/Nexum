# backend/app/routes/pipeline.py
from fastapi import APIRouter, HTTPException, Depends, Header
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import json
import redis
import asyncio
from kafka import KafkaConsumer, KafkaProducer
import logging

router = APIRouter(prefix="/pipeline", tags=["pipeline"])

# Configuration des logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Connexion Redis
redis_client = redis.Redis(
    host='redis',
    port=6379,
    db=0,
    decode_responses=True,
    socket_connect_timeout=5,
    socket_timeout=5
)

# Configuration Kafka
KAFKA_BOOTSTRAP_SERVERS = 'kafka:29092'
TOPIC_VERDICT = 'transactions-verdict'
TOPIC_RAW = 'transactions-raw'
TOPIC_PREPROCESSED = 'transactions-preprocessed'

class PipelineService:
    """Service pour gérer les transactions du pipeline"""
    
    @staticmethod
    async def get_transactions(limit: int = 100, offset: int = 0, fraud_only: bool = False) -> List[Dict]:
        """Récupère les transactions depuis Redis"""
        transactions = []
        
        try:
            # Récupérer toutes les clés de verdict
            pattern = "verdict:*"
            keys = redis_client.keys(pattern)
            
            if not keys:
                logger.warning("Aucune transaction trouvée dans Redis")
                return PipelineService._get_demo_transactions()
            
            # Trier les clés par timestamp (les plus récentes d'abord)
            keys_sorted = sorted(keys, key=lambda k: redis_client.get(k) or '', reverse=True)
            
            for key in keys_sorted[offset:offset+limit]:
                try:
                    tx_data = redis_client.get(key)
                    if tx_data:
                        transaction = json.loads(tx_data)
                        if fraud_only and not transaction.get('is_fraudulent', False):
                            continue
                        transactions.append(transaction)
                except json.JSONDecodeError as e:
                    logger.error(f"Erreur décodage JSON pour {key}: {e}")
                    continue
                    
        except redis.RedisError as e:
            logger.error(f"Erreur Redis: {e}")
            return PipelineService._get_demo_transactions()
        
        if not transactions:
            return PipelineService._get_demo_transactions()
        
        return transactions
    
    @staticmethod
    async def get_transaction_by_id(transaction_id: str) -> Optional[Dict]:
        """Récupère une transaction spécifique par son ID"""
        try:
            key = f"verdict:{transaction_id}"
            tx_data = redis_client.get(key)
            if tx_data:
                return json.loads(tx_data)
        except Exception as e:
            logger.error(f"Erreur récupération transaction {transaction_id}: {e}")
        return None
    
    @staticmethod
    async def get_statistics() -> Dict:
        """Récupère les statistiques du pipeline"""
        transactions = await PipelineService.get_transactions(limit=1000)
        
        if not transactions:
            return {
                "total_transactions": 0,
                "total_frauds": 0,
                "detection_rate": 0,
                "path_distribution": [],
                "avg_confidence": 0,
                "avg_response_time": 0,
                "transactions_last_hour": 0,
                "frauds_last_hour": 0
            }
        
        total = len(transactions)
        frauds = len([t for t in transactions if t.get('is_fraudulent', False)])
        
        # Distribution par chemin
        path_counts = {}
        for t in transactions:
            path = t.get('path', 'unknown')
            path_counts[path] = path_counts.get(path, 0) + 1
        
        path_distribution = [
            {"type": k, "name": PipelineService._get_path_name(k), "value": v}
            for k, v in path_counts.items()
        ]
        
        # Confiance moyenne
        avg_confidence = sum(t.get('confidence', 0) for t in transactions) / total if total > 0 else 0
        
        # Transactions dernière heure
        one_hour_ago = datetime.now() - timedelta(hours=1)
        last_hour = len([t for t in transactions if datetime.fromisoformat(t.get('timestamp', '2000-01-01')) > one_hour_ago])
        frauds_last_hour = len([t for t in transactions if t.get('is_fraudulent', False) and datetime.fromisoformat(t.get('timestamp', '2000-01-01')) > one_hour_ago])
        
        return {
            "total_transactions": total,
            "total_frauds": frauds,
            "detection_rate": round((frauds / total * 100), 2) if total > 0 else 0,
            "path_distribution": path_distribution,
            "avg_confidence": round(avg_confidence, 3),
            "avg_response_time": round(sum(t.get('response_time', 0) for t in transactions) / total, 2) if total > 0 else 0,
            "transactions_last_hour": last_hour,
            "frauds_last_hour": frauds_last_hour
        }
    
    @staticmethod
    def _get_path_name(path: str) -> str:
        """Retourne le nom lisible du chemin"""
        names = {
            'fast': 'Voie Rapide',
            'deep': 'Analyse Profonde',
            'quantum': 'Quantique'
        }
        return names.get(path, path)
    
    @staticmethod
    def _get_demo_transactions() -> List[Dict]:
        """Génère des transactions de démonstration"""
        demo_transactions = []
        for i in range(1, 26):
            is_fraud = i % 3 == 0  # 33% de fraudes en démo
            demo_transactions.append({
                "transaction_id": f"DEMO_TXN_{datetime.now().strftime('%Y%m%d')}_{i:04d}",
                "amount": round(100 + (50000 if is_fraud else 500) * (i % 10 + 1), 2),
                "source_account": f"ACC_{1000 + i}",
                "target_account": f"ACC_{2000 + i}",
                "timestamp": (datetime.now() - timedelta(minutes=i)).isoformat(),
                "ip_address": f"192.168.{i % 255}.{i % 254 + 1}",
                "device_id": f"DEVICE_{1000 + i}",
                "is_fraudulent": is_fraud,
                "confidence": round(0.85 if is_fraud else 0.25 + (i % 50) / 100, 2),
                "path": "quantum" if is_fraud and i % 2 == 0 else "deep" if is_fraud else "fast",
                "explanation": "Pattern de fraude détecté par analyse comportementale" if is_fraud else "Transaction normale",
                "response_time": round(0.05 + (i % 20) / 100, 3),
                "gnn_score": round(0.8 + (i % 20) / 100, 2) if is_fraud else round(0.1 + (i % 30) / 100, 2),
                "qdrant_score": round(0.75 + (i % 25) / 100, 2) if is_fraud else round(0.15 + (i % 35) / 100, 2),
                "neo4j_score": round(0.7 + (i % 30) / 100, 2) if is_fraud else round(0.2 + (i % 25) / 100, 2)
            })
        return demo_transactions


# ==================== ENDPOINTS API ====================

@router.get("/transactions")
async def get_pipeline_transactions(
    limit: int = 100,
    offset: int = 0,
    fraud_only: bool = False
):
    """
    Récupère les dernières transactions du pipeline anti-fraude
    
    - **limit**: Nombre maximum de transactions à retourner
    - **offset**: Pagination - nombre de transactions à sauter
    - **fraud_only**: Si True, retourne uniquement les transactions frauduleuses
    """
    try:
        transactions = await PipelineService.get_transactions(limit=limit, offset=offset, fraud_only=fraud_only)
        return {
            "success": True,
            "data": transactions,
            "total": len(transactions),
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        logger.error(f"Erreur get_pipeline_transactions: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transactions/{transaction_id}")
async def get_transaction_detail(transaction_id: str):
    """Récupère les détails d'une transaction spécifique"""
    try:
        transaction = await PipelineService.get_transaction_by_id(transaction_id)
        if not transaction:
            raise HTTPException(status_code=404, detail="Transaction non trouvée")
        return {"success": True, "data": transaction}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erreur get_transaction_detail: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics")
async def get_pipeline_statistics():
    """Récupère les statistiques globales du pipeline"""
    try:
        stats = await PipelineService.get_statistics()
        return {"success": True, "data": stats}
    except Exception as e:
        logger.error(f"Erreur get_pipeline_statistics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def pipeline_health_check():
    """Vérifie l'état de santé du pipeline"""
    try:
        # Vérifier Redis
        redis_ok = redis_client.ping()
        
        # Vérifier Kafka (optionnel)
        kafka_ok = False
        try:
            consumer = KafkaConsumer(
                TOPIC_VERDICT,
                bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
                consumer_timeout_ms=1000
            )
            kafka_ok = True
            consumer.close()
        except Exception:
            kafka_ok = False
        
        return {
            "success": True,
            "status": "healthy",
            "services": {
                "redis": redis_ok,
                "kafka": kafka_ok
            },
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        return {
            "success": False,
            "status": "unhealthy",
            "error": str(e)
        }


@router.post("/simulate")
async def simulate_transaction(transaction: Dict[str, Any]):
    """Simule l'envoi d'une transaction dans le pipeline (pour test)"""
    try:
        # Envoyer à Kafka
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode('utf-8')
        )
        
        transaction['timestamp'] = datetime.now().isoformat()
        transaction['simulated'] = True
        
        producer.send(TOPIC_RAW, transaction)
        producer.flush()
        producer.close()
        
        return {
            "success": True,
            "message": "Transaction envoyée au pipeline",
            "transaction_id": transaction.get('transaction_id')
        }
    except Exception as e:
        logger.error(f"Erreur simulation transaction: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts/recent")
async def get_recent_alerts(limit: int = 20):
    """Récupère les alertes de fraude récentes"""
    try:
        fraud_transactions = await PipelineService.get_transactions(limit=limit, fraud_only=True)
        
        alerts = []
        for tx in fraud_transactions:
            alerts.append({
                "id": tx.get('transaction_id'),
                "transaction_id": tx.get('transaction_id'),
                "amount": tx.get('amount'),
                "fraud_score": int(tx.get('confidence', 0) * 100),
                "fraud_level": "critical" if tx.get('confidence', 0) > 0.9 else "high" if tx.get('confidence', 0) > 0.7 else "medium",
                "detection_method": tx.get('path', 'unknown'),
                "timestamp": tx.get('timestamp'),
                "status": "pending"
            })
        
        return {"success": True, "data": alerts}
    except Exception as e:
        logger.error(f"Erreur get_recent_alerts: {e}")
        raise HTTPException(status_code=500, detail=str(e))