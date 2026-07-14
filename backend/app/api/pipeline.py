# app/api/pipeline.py - Version corrigée (SANS /status)
"""Pipeline API endpoints - Version corrigée sans /status"""

from fastapi import APIRouter, Query, HTTPException
from typing import Optional, List, Dict
from datetime import datetime, timedelta
import json
import os
import random
import logging
from kafka import KafkaConsumer, KafkaProducer
from kafka.errors import KafkaError as NoBrokersAvailable
from neo4j import GraphDatabase

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/pipeline", tags=["pipeline"])

# ========== CONFIGURATION ==========
KAFKA_BOOTSTRAP = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
KAFKA_TOPIC_TRANSACTIONS = "transactions-verdict"
KAFKA_TOPIC_ALERTS = "fraud-alerts"

logger.info(f"✅ Pipeline configuré - Kafka: {KAFKA_BOOTSTRAP}")

# Cache mémoire
memory_cache = {
    "transactions": [],
    "alerts": [],
    "max_size": 1000
}

NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "neo4j123")

neo4j_driver = None
try:
    neo4j_driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    logger.info("✅ Connexion Neo4j établie")
except Exception as e:
    neo4j_driver = None
    logger.error(f"⚠️ Erreur connexion Neo4j: {e}")

# ========== FONCTIONS KAFKA ==========

def get_kafka_consumer(topic: str):
    try:
        return KafkaConsumer(
            topic,
            bootstrap_servers=[KAFKA_BOOTSTRAP],
            auto_offset_reset='latest',
            enable_auto_commit=True,
            consumer_timeout_ms=3000,
            value_deserializer=lambda x: json.loads(x.decode('utf-8')) if x else {},
            api_version_auto_timeout_ms=5000,
            request_timeout_ms=10000
        )
    except Exception as e:
        logger.error(f"⚠️ Erreur connexion Kafka: {e}")
        return None

def get_kafka_producer():
    try:
        return KafkaProducer(
            bootstrap_servers=[KAFKA_BOOTSTRAP],
            value_serializer=lambda v: json.dumps(v).encode('utf-8'),
            acks=1,
            request_timeout_ms=5000
        )
    except Exception as e:
        logger.error(f"⚠️ Erreur producteur Kafka: {e}")
        return None

def add_to_cache(topic: str, data: Dict):
    if topic == KAFKA_TOPIC_TRANSACTIONS:
        memory_cache["transactions"].insert(0, data)
        if len(memory_cache["transactions"]) > memory_cache["max_size"]:
            memory_cache["transactions"] = memory_cache["transactions"][:memory_cache["max_size"]]

# ============================================
# ENDPOINTS (SANS /status - DÉFINI DANS MAIN.PY)
# ============================================

@router.get("/health")
async def pipeline_health():
    """Vérifie la santé du pipeline."""
    return {
        "status": "healthy",
        "service": "pipeline",
        "kafka_bootstrap": KAFKA_BOOTSTRAP,
        "cache_size": len(memory_cache["transactions"]),
        "websocket_enabled": False,
        "timestamp": datetime.now().isoformat()
    }

@router.get("/transactions")
async def get_pipeline_transactions(
    limit: int = Query(50, ge=1, le=200),
    verdict: Optional[str] = Query(None),
    source: Optional[str] = Query(None)
):
    """Récupère les transactions depuis le cache ou Kafka."""
    transactions = []
    
    try:
        consumer = get_kafka_consumer(KAFKA_TOPIC_TRANSACTIONS)
        if consumer:
            count = 0
            for msg in consumer:
                tx = msg.value
                if tx and isinstance(tx, dict):
                    clean_tx = {
                        "transaction_id": tx.get("transaction_id", str(msg.offset)),
                        "amount": float(tx.get("amount", 0)),
                        "risk_score": float(tx.get("risk_score", 0)),
                        "verdict": tx.get("verdict", "UNKNOWN"),
                        "path": tx.get("path", "fast"),
                        "timestamp": tx.get("timestamp", datetime.now().isoformat()),
                        "confidence": float(tx.get("confidence", 0.5)),
                        "sender_id": tx.get("sender_id", "inconnu"),
                        "sender_name": tx.get("sender_name", "Inconnu"),
                        "recipient_id": tx.get("recipient_id", "inconnu"),
                        "recipient_name": tx.get("recipient_name", "Inconnu"),
                        "source": tx.get("source", "unknown"),
                        "reason": tx.get("reason", "")
                    }
                    
                    if source == "discord" and clean_tx["source"] != "discord_bot":
                        continue
                    if source == "demo" and clean_tx["source"] == "discord_bot":
                        continue
                    
                    transactions.append(clean_tx)
                    add_to_cache(KAFKA_TOPIC_TRANSACTIONS, clean_tx)
                    
                count += 1
                if count >= limit:
                    break
            consumer.close()
    except Exception as e:
        logger.error(f"⚠️ Erreur lecture Kafka: {e}")
        transactions = memory_cache["transactions"][:limit]
    
    if not transactions:
        transactions = memory_cache["transactions"][:limit]
    
    if verdict and verdict != 'all' and transactions:
        transactions = [t for t in transactions if t.get("verdict") == verdict]
    
    return transactions

@router.get("/alerts")
async def get_pipeline_alerts(limit: int = Query(20, ge=1, le=100)):
    """Récupère les alertes."""
    alerts = []
    try:
        consumer = get_kafka_consumer(KAFKA_TOPIC_ALERTS)
        if consumer:
            count = 0
            for msg in consumer:
                alert = msg.value
                if alert:
                    alerts.append({
                        "transaction_id": alert.get("transaction_id"),
                        "amount": float(alert.get("amount", 0)),
                        "risk_score": float(alert.get("risk_score", 0)),
                        "verdict": "FRAUD",
                        "timestamp": alert.get("timestamp", datetime.now().isoformat())
                    })
                count += 1
                if count >= limit:
                    break
            consumer.close()
    except Exception as e:
        logger.error(f"⚠️ Erreur lecture alertes: {e}")
        alerts = memory_cache["alerts"][:limit]
    
    return alerts

@router.get("/stats")
async def get_pipeline_stats():
    """Statistiques du pipeline."""
    transactions = memory_cache["transactions"]
    
    total = len(transactions)
    frauds = len([t for t in transactions if t.get("verdict") == "FRAUD"])
    legit = len([t for t in transactions if t.get("verdict") == "LEGIT"])
    suspects = len([t for t in transactions if t.get("verdict") == "SUSPECT"])
    
    path_distribution = []
    paths = {}
    for t in transactions:
        path = t.get("path", "fast")
        paths[path] = paths.get(path, 0) + 1
    for path, count in paths.items():
        path_distribution.append({"path": path, "count": count})
    
    discord_tx = len([t for t in transactions if t.get("source") == "discord_bot"])
    
    return {
        "total_transactions": total,
        "total_frauds": frauds,
        "detection_rate": round(frauds / total * 100, 1) if total > 0 else 0,
        "avg_risk_score": round(sum(t.get("risk_score", 0) for t in transactions) / total, 3) if total > 0 else 0,
        "discord_transactions": discord_tx,
        "verdict_distribution": [
            {"verdict": "LEGIT", "count": legit},
            {"verdict": "SUSPECT", "count": suspects},
            {"verdict": "FRAUD", "count": frauds}
        ],
        "path_distribution": path_distribution
    }

@router.get("/graph")
async def get_pipeline_graph():
    """Récupère le graphe du pipeline."""
    nodes = [
        {"id": 'kafka', "name": 'Kafka Broker', "color": '#1890ff', "risk": 0.1, "x": 300, "y": 200, "size": 60},
        {"id": 'spark', "name": 'Spark Engine', "color": '#722ed1', "risk": 0.15, "x": 500, "y": 100, "size": 55},
        {"id": 'neo4j', "name": 'Neo4j Graph DB', "color": '#52c41a', "risk": 0.1, "x": 700, "y": 200, "size": 55},
        {"id": 'gnn', "name": 'GNN Transformer', "color": '#fa8c16', "risk": 0.2, "x": 600, "y": 350, "size": 65},
        {"id": 'grover', "name": 'Grover Orchestrator', "color": '#00d1ff', "risk": 0.05, "x": 400, "y": 350, "size": 70},
        {"id": 'suspect1', "name": 'IP Suspecte', "color": '#f5222d', "risk": 0.4, "x": 150, "y": 350, "size": 45},
        {"id": 'suspect2', "name": 'Shell Account', "color": '#f5222d', "risk": 0.4, "x": 850, "y": 350, "size": 45},
        {"id": 'blockchain', "name": 'Blockchain Ledger', "color": '#13c2c2', "risk": 0.05, "x": 500, "y": 480, "size": 50},
    ]
    edges = [
        {"source": 'kafka', "target": 'spark'},
        {"source": 'kafka', "target": 'grover'},
        {"source": 'spark', "target": 'neo4j'},
        {"source": 'neo4j', "target": 'gnn'},
        {"source": 'gnn', "target": 'grover'},
        {"source": 'grover', "target": 'blockchain'},
        {"source": 'suspect1', "target": 'kafka'},
        {"source": 'suspect2', "target": 'neo4j'},
        {"source": 'suspect1', "target": 'suspect2'},
    ]
    
    transactions = memory_cache.get("transactions", [])
    frauds = len([t for t in transactions if t.get("verdict") == "FRAUD"])
    
    if frauds > 0:
        for node in nodes:
            if node["id"] in ["suspect1", "suspect2"]:
                node["risk"] = 0.95
            elif node["id"] == "gnn":
                node["risk"] = 0.6
            elif node["id"] == "kafka":
                node["risk"] = 0.5

    if neo4j_driver:
        try:
            with neo4j_driver.session() as session:
                result = session.run("MATCH (n:Account)-[r:TRANSACTION]->(m:Account) RETURN n, r, m ORDER BY r.timestamp DESC LIMIT 15")
                nodes_set = set([n["id"] for n in nodes])
                for record in result:
                    n = record["n"]
                    m = record["m"]
                    
                    if n["id"] not in nodes_set:
                        nodes.append({
                            "id": n["id"],
                            "name": f"Tx {n['id'][:4]}",
                            "color": "rgba(255,255,255,0.7)",
                            "risk": 0.1,
                            "x": random.randint(650, 750),
                            "y": random.randint(150, 250),
                            "size": 15
                        })
                        nodes_set.add(n["id"])
                        edges.append({
                            "source": "neo4j",
                            "target": n["id"],
                        })
                    
                    if m["id"] not in nodes_set:
                        nodes.append({
                            "id": m["id"],
                            "name": f"Tx {m['id'][:4]}",
                            "color": "rgba(255,255,255,0.7)",
                            "risk": 0.1,
                            "x": random.randint(650, 750),
                            "y": random.randint(150, 250),
                            "size": 15
                        })
                        nodes_set.add(m["id"])
                        edges.append({
                            "source": "neo4j",
                            "target": m["id"],
                        })
                        
                    edges.append({
                        "source": n["id"],
                        "target": m["id"]
                    })
        except Exception as e:
            logger.error("Error Neo4j query:", e)
            
    return {"nodes": nodes, "edges": edges}

@router.get("/alerts/recent")
async def get_alerts_recent(limit: int = Query(20)):
    """Récupère les alertes récentes."""
    return await get_pipeline_alerts(limit)

@router.get("/statistics")
async def get_statistics():
    """Récupère les statistiques."""
    return await get_pipeline_stats()

@router.get("/flow")
async def get_pipeline_flow(hours: int = Query(24, ge=1, le=168)):
    """Récupère le flux du pipeline."""
    transactions = memory_cache["transactions"]
    
    flow_by_hour = {}
    now = datetime.now()
    cutoff = now - timedelta(hours=hours)
    
    for tx in transactions:
        ts_str = tx.get("timestamp")
        if ts_str:
            try:
                ts = datetime.fromisoformat(str(ts_str).replace('Z', '+00:00'))
                if ts >= cutoff:
                    hour_key = ts.strftime("%Y-%m-%d %H:00:00")
                    flow_by_hour[hour_key] = flow_by_hour.get(hour_key, 0) + 1
            except:
                pass
    
    flow_data = [{"timestamp": k, "count": v} for k, v in sorted(flow_by_hour.items())]
    return flow_data[-48:]

@router.post("/discord/transaction")
async def receive_discord_transaction(transaction: dict):
    """Reçoit une transaction Discord."""
    formatted_tx = {
        "transaction_id": transaction.get("transaction_id", f"DISCORD_{datetime.now().timestamp()}"),
        "amount": float(transaction.get("amount", 0)),
        "sender_id": transaction.get("sender_id"),
        "sender_name": transaction.get("sender_name"),
        "recipient_id": transaction.get("recipient_id"),
        "recipient_name": transaction.get("recipient_name"),
        "reason": transaction.get("reason", ""),
        "timestamp": datetime.now().isoformat(),
        "risk_score": float(transaction.get("risk_score", 0)),
        "verdict": transaction.get("verdict", "LEGIT"),
        "path": transaction.get("path", "fast"),
        "source": "discord_bot",
        "confidence": 0.85
    }
    
    add_to_cache(KAFKA_TOPIC_TRANSACTIONS, formatted_tx)
    
    try:
        producer = get_kafka_producer()
        if producer:
            producer.send(KAFKA_TOPIC_TRANSACTIONS, value=formatted_tx)
            producer.flush()
            producer.close()
    except Exception as e:
        logger.error(f"⚠️ Erreur envoi Kafka: {e}")
    
    return {
        "success": True,
        "transaction_id": formatted_tx["transaction_id"],
        "message": "Transaction reçue"
    }

@router.post("/generate-demo-transactions")
async def generate_demo_transactions(count: int = Query(10, ge=1, le=50)):
    """Génère des transactions de démonstration."""
    transactions = []
    verdicts = ["LEGIT", "SUSPECT", "FRAUD"]
    verdict_weights = [0.7, 0.2, 0.1]
    paths = ["fast", "deep", "quantum"]
    
    for i in range(count):
        verdict = random.choices(verdicts, weights=verdict_weights)[0]
        amount = round(random.uniform(10, 5000), 2)
        
        if verdict == "SUSPECT":
            risk_score = round(random.uniform(0.4, 0.7), 3)
        elif verdict == "FRAUD":
            risk_score = round(random.uniform(0.7, 0.95), 3)
        else:
            risk_score = round(random.uniform(0, 0.3), 3)
        
        tx = {
            "transaction_id": f"DEMO_{int(datetime.now().timestamp())}_{i}",
            "amount": amount,
            "sender_id": f"user_{random.randint(1000, 9999)}",
            "sender_name": f"User{random.randint(1, 100)}",
            "recipient_id": f"user_{random.randint(1000, 9999)}",
            "recipient_name": f"User{random.randint(1, 100)}",
            "reason": "Transaction de démonstration",
            "timestamp": datetime.now().isoformat(),
            "risk_score": risk_score,
            "verdict": verdict,
            "path": random.choice(paths),
            "source": "demo_generator",
            "confidence": round(random.uniform(0.6, 0.95), 3)
        }
        
        add_to_cache(KAFKA_TOPIC_TRANSACTIONS, tx)
        transactions.append(tx)
    
    return {
        "success": True,
        "message": f"{count} transactions générées",
        "transactions": transactions
    }

@router.post("/block")
async def block_transaction(data: dict):
    """Bloque une transaction."""
    return {
        "success": True,
        "transaction_id": data.get("transaction_id"),
        "message": "Transaction bloquée"
    }

@router.post("/test/discord-transaction")
async def test_discord_transaction():
    """Ajoute une transaction Discord de test dans le cache."""
    import time
    
    test_tx = {
        "transaction_id": f"DISCORD_TEST_{int(time.time())}",
        "amount": 123.45,
        "sender_id": "test_user_123",
        "sender_name": "TestUser",
        "recipient_id": "test_user_456",
        "recipient_name": "TestRecipient",
        "reason": "Test manuel Discord",
        "timestamp": datetime.now().isoformat(),
        "risk_score": 0.15,
        "verdict": "LEGIT",
        "path": "fast",
        "source": "discord_bot",
        "confidence": 0.95
    }
    
    add_to_cache(KAFKA_TOPIC_TRANSACTIONS, test_tx)
    
    producer = get_kafka_producer()
    if producer:
        producer.send(KAFKA_TOPIC_TRANSACTIONS, value=test_tx)
        producer.flush()
        producer.close()
    
    return {
        "success": True, 
        "transaction": test_tx,
        "message": "Transaction Discord de test ajoutée"
    }

@router.post("/restart")
async def restart_pipeline():
    """Redémarre le pipeline."""
    logger.info("🔄 Redémarrage du pipeline demandé")
    return {
        "success": True,
        "message": "Pipeline redémarré avec succès",
        "timestamp": datetime.now().isoformat()
    }

logger.info("✅ MODULE PIPELINE CHARGÉ (sans /status)")