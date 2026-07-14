# app/services/pipeline_manager.py
"""
Pipeline Manager — auto-launches fraud detection pipeline on startup.
Covers: Kafka consumer, Neo4j sync, GNN (via orchestrator), Grover/Elasticsearch, Blockchain, Discord bot.
"""
import asyncio
import logging
import os
import aiohttp
from datetime import datetime
from typing import Dict, Any

logger = logging.getLogger(__name__)

# ─── Service URLs (resolved via Docker DNS) ───────────────────────────────────
ORCHESTRATOR_URL  = os.getenv("ORCHESTRATOR_URL",      "http://orchestrator:8000")
BLOCKCHAIN_URL    = os.getenv("BLOCKCHAIN_URL",         "http://blockchain-service:8000")
GROVER_URL        = os.getenv("GROVER_URL",             "http://grover:8000")
NEO4J_URL         = os.getenv("NEO4J_URL",              "bolt://neo4j:7687")
KAFKA_BROKERS     = os.getenv("KAFKA_BOOTSTRAP_SERVERS","kafka:29092")
ELASTICSEARCH_URL = os.getenv("ELASTICSEARCH_URL",      "http://elasticsearch:9200")
DISCORD_BOT_URL   = os.getenv("DISCORD_BOT_URL",        "http://discord-bot:4000")

# ─── Pipeline health state (exposed to dashboard) ─────────────────────────────
pipeline_status: Dict[str, Any] = {
    "kafka":         {"ok": False, "last_check": None, "details": "Not checked"},
    "neo4j":         {"ok": False, "last_check": None, "details": "Not checked"},
    "orchestrator":  {"ok": False, "last_check": None, "details": "Not checked"},
    "blockchain":    {"ok": False, "last_check": None, "details": "Not checked"},
    "grover":        {"ok": False, "last_check": None, "details": "Not checked"},
    "elasticsearch": {"ok": False, "last_check": None, "details": "Not checked"},
    "discord_bot":   {"ok": False, "last_check": None, "details": "Not checked"},
    "pipeline_active": False,
    "started_at": None,
}

# ─── Kafka consumer background task ───────────────────────────────────────────
_kafka_task: asyncio.Task = None

def _kafka_consumer_sync():
    """Blocking Kafka consumer loop running in a separate thread."""
    import json
    try:
        from kafka import KafkaConsumer
        consumer = KafkaConsumer(
            "transactions",
            bootstrap_servers=[KAFKA_BROKERS],
            value_deserializer=lambda x: json.loads(x.decode("utf-8")),
            auto_offset_reset="latest",
            group_id="nexum-fraud-pipeline",
        )
        pipeline_status["kafka"]["ok"] = True
        pipeline_status["kafka"]["details"] = f"Consuming topic 'transactions' from {KAFKA_BROKERS}"
        logger.info(f"✅ Kafka consumer ready on {KAFKA_BROKERS}")
        
        # This is a blocking loop
        for msg in consumer:
            tx = msg.value
            try:
                # Synchronous processing or call async in a safe way
                # For simplicity and performance, we'll use a new loop or the main loop
                # but since we are in a thread, we should use run_coroutine_threadsafe if needed.
                # However, _sync_neo4j is synchronous.
                _sync_neo4j(tx)
                
                # For async orchestrator, we can use a temporary session or run_coroutine_threadsafe
                loop = asyncio.new_event_loop()
                loop.run_until_complete(_call_orchestrator(tx))
                loop.close()
                
            except Exception as e:
                logger.warning(f"⚠️ Pipeline error for tx {tx.get('transaction_id')}: {e}")
                
    except Exception as e:
        pipeline_status["kafka"]["ok"] = False
        pipeline_status["kafka"]["details"] = str(e)
        logger.error(f"❌ Kafka consumer error: {e}")

async def _kafka_consumer_loop():
    """Lancer le consommateur Kafka dans un thread pour ne pas bloquer l'event loop."""
    await asyncio.to_thread(_kafka_consumer_sync)

def _sync_neo4j(tx: dict):
    """Synchronous Neo4j write (runs in thread pool)."""
    try:
        from neo4j import GraphDatabase
        neo4j_user = os.getenv("NEO4J_USER", "neo4j")
        neo4j_pass = os.getenv("NEO4J_PASSWORD", "neo4j123")
        driver = GraphDatabase.driver(NEO4J_URL, auth=(neo4j_user, neo4j_pass))
        with driver.session() as session:
            session.run("""
                MERGE (s:Account {id: $s_id})
                MERGE (r:Account {id: $r_id})
                CREATE (s)-[:TRANSACTION {id: $id, amount: $amount, ts: $ts}]->(r)
            """,
                s_id=str(tx.get("sender", {}).get("id", "?")),
                r_id=str(tx.get("recipient", {}).get("id", "?")),
                id=tx.get("transaction_id", "?"),
                amount=float(tx.get("amount", 0)),
                ts=tx.get("timestamp", ""),
            )
        driver.close()
        pipeline_status["neo4j"]["ok"] = True
        pipeline_status["neo4j"]["details"] = "Graph in sync"
    except Exception as e:
        pipeline_status["neo4j"]["ok"] = False
        pipeline_status["neo4j"]["details"] = str(e)

async def _call_orchestrator(tx: dict):
    """Send transaction to Grover orchestrator (GNN + XAI + Blockchain)."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{ORCHESTRATOR_URL}/process", json=tx, timeout=aiohttp.ClientTimeout(total=10)) as resp:
                if resp.status == 200:
                    verdict = await resp.json()
                    pipeline_status["orchestrator"]["ok"] = True
                    pipeline_status["orchestrator"]["details"] = f"Last verdict: {verdict.get('path','?')} path"
                    # Index verdict in Grover/Elasticsearch
                    await _index_grover(tx, verdict)
    except Exception as e:
        pipeline_status["orchestrator"]["ok"] = False
        pipeline_status["orchestrator"]["details"] = str(e)

async def _index_grover(tx: dict, verdict: dict):
    """Index fraud verdict into Grover (Elasticsearch wrapper)."""
    doc = {
        "transaction_id": tx.get("transaction_id"),
        "amount": tx.get("amount"),
        "is_fraudulent": verdict.get("is_fraudulent"),
        "confidence": verdict.get("confidence"),
        "path": verdict.get("path"),
        "explanation": verdict.get("explanation"),
        "timestamp": datetime.utcnow().isoformat(),
    }
    try:
        async with aiohttp.ClientSession() as session:
            # Try Grover first
            async with session.post(f"{GROVER_URL}/index", json=doc, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                if resp.status in (200, 201):
                    pipeline_status["grover"]["ok"] = True
                    pipeline_status["grover"]["details"] = "Indexing active"
    except Exception:
        pass  # Grover down — try direct ES
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{ELASTICSEARCH_URL}/fraud-verdicts/_doc",
                json=doc,
                timeout=aiohttp.ClientTimeout(total=5)
            ) as resp:
                if resp.status in (200, 201):
                    pipeline_status["elasticsearch"]["ok"] = True
                    pipeline_status["elasticsearch"]["details"] = "Direct ES indexing active"
    except Exception as e:
        pipeline_status["elasticsearch"]["details"] = str(e)

# ─── Health probe loop ─────────────────────────────────────────────────────────
async def _health_loop():
    """Every 30 s, probe all pipeline services and update status dict."""
    while True:
        await asyncio.sleep(30)
        now = datetime.utcnow().isoformat()
        checks = {
            "orchestrator":  f"{ORCHESTRATOR_URL}/health",
            "blockchain":    f"{BLOCKCHAIN_URL}/health",
            "grover":        f"{GROVER_URL}/health",
            "elasticsearch": f"{ELASTICSEARCH_URL}/_cluster/health",
            "discord_bot":   f"{DISCORD_BOT_URL}/health",
        }
        async with aiohttp.ClientSession() as session:
            for svc, url in checks.items():
                try:
                    async with session.get(url, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                        pipeline_status[svc]["ok"] = resp.status < 400
                        pipeline_status[svc]["last_check"] = now
                        pipeline_status[svc]["details"] = f"HTTP {resp.status}"
                except Exception as e:
                    pipeline_status[svc]["ok"] = False
                    pipeline_status[svc]["last_check"] = now
                    pipeline_status[svc]["details"] = str(e)

# ─── Public API ───────────────────────────────────────────────────────────────
async def start_pipeline():
    """Called from FastAPI startup — launches all background tasks."""
    global _kafka_task
    logger.info("🚀 Starting fraud detection pipeline...")

    # Kafka consumer (non-blocking background task)
    _kafka_task = asyncio.create_task(_kafka_consumer_loop())
    asyncio.create_task(_health_loop())

    pipeline_status["pipeline_active"] = True
    pipeline_status["started_at"] = datetime.utcnow().isoformat()
    logger.info("✅ Pipeline tasks launched (Kafka → Neo4j → Orchestrator/GNN → Grover/ES → Blockchain)")

async def stop_pipeline():
    global _kafka_task
    if _kafka_task and not _kafka_task.done():
        _kafka_task.cancel()
        logger.info("🛑 Pipeline Kafka consumer stopped")
    pipeline_status["pipeline_active"] = False

def get_pipeline_status() -> Dict[str, Any]:
    return pipeline_status
