from kafka import KafkaConsumer
import json
import logging
logger = logging.getLogger(__name__)
from app.neo4j_service import insert_tx
from app.blockchain import add_block
from app.grover_service import index_data
from app.qdrant_service import process_vector
from app.orchestrator import route

consumer = KafkaConsumer(
    "assistant-events",
    bootstrap_servers="kafka:29092",
    value_deserializer=lambda m: json.loads(m.decode()),
    group_id="pipeline-group"
)

import asyncio
from app.services.fraud_react_agent import fraud_react_agent

logger.info("🚀 Pipeline démarré...")

for msg in consumer:
    data = msg.value

    logger.info("📥 Event reçu:", data)

    # 🔹 1. Graph DB
    insert_tx(data)

    # 🔹 2. Search engine (Grover)
    index_data(data)

    # 🔹 3. Vector DB
    process_vector(data)

    # 🔹 4. Orchestration
    decision = route(data)

    # 🔹 5. Blockchain (sécurité globale)
    add_block(data)

    # 🔹 6. ReAct Agent Autonome Anti-Fraude
    try:
        asyncio.run(fraud_react_agent.run(data))
    except Exception as e:
        logger.error(f"Erreur déclenchement ReAct Agent: {e}")

    logger.info("✅ Pipeline exécuté →", decision)