# backend/scripts/populate_redis.py
import redis
import json
import random
from datetime import datetime, timedelta
import uuid

# Connexion Redis
redis_client = redis.Redis(
    host='redis',
    port=6379,
    db=0,
    decode_responses=True
)

def generate_transaction(is_fraud=False):
    """Génère une transaction test"""
    confidence = random.uniform(0.7, 0.98) if is_fraud else random.uniform(0.01, 0.5)
    path = random.choice(['fast', 'deep', 'quantum'])
    
    return {
        "transaction_id": str(uuid.uuid4()),
        "amount": round(random.uniform(100, 50000 if is_fraud else 5000), 2),
        "source_account": f"ACC_{random.randint(1000, 9999)}",
        "target_account": f"ACC_{random.randint(1000, 9999)}",
        "timestamp": datetime.now().isoformat(),
        "ip_address": f"192.168.{random.randint(1,255)}.{random.randint(1,255)}",
        "device_id": f"DEVICE_{random.randint(1000, 9999)}",
        "is_fraudulent": is_fraud,
        "confidence": round(confidence, 3),
        "path": path,
        "explanation": "Pattern de fraude détecté" if is_fraud else "Transaction normale",
        "response_time": round(random.uniform(0.01, 0.5), 3),
        "gnn_score": round(random.uniform(0.5, 0.95) if is_fraud else random.uniform(0.01, 0.4), 3),
        "qdrant_score": round(random.uniform(0.5, 0.95) if is_fraud else random.uniform(0.01, 0.4), 3),
        "neo4j_score": round(random.uniform(0.5, 0.95) if is_fraud else random.uniform(0.01, 0.4), 3)
    }

def populate_redis():
    """Peuple Redis avec des transactions"""
    logger.info("🚀 Peuplement de Redis avec des transactions...")
    
    # Nettoyer les anciennes données
    keys = redis_client.keys("verdict:*")
    if keys:
        redis_client.delete(*keys)
        logger.info(f"🗑️ Supprimé {len(keys)} anciennes transactions")
    
    # Générer 100 transactions (30% de fraudes)
    transactions = []
    for i in range(100):
        is_fraud = i % 3 == 0  # 33% de fraudes
        tx = generate_transaction(is_fraud)
        transactions.append(tx)
        
        # Stocker dans Redis avec expiration (24h)
        key = f"verdict:{tx['transaction_id']}"
        redis_client.setex(key, 86400, json.dumps(tx))
    
    logger.info(f"✅ {len(transactions)} transactions ajoutées à Redis")
    logger.info(f"   - Transactions normales: {len([t for t in transactions if not t['is_fraudulent']])}")
    logger.info(f"   - Fraudes: {len([t for t in transactions if t['is_fraudulent']])}")
    
    return transactions

if __name__ == "__main__":
    populate_redis()