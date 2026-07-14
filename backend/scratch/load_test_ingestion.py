import json
import time
import random
import asyncio
from kafka import KafkaProducer
from datetime import datetime

# Configuration
KAFKA_BROKERS = ["localhost:9092"] # Ajuster selon l'exposition des ports
TOPIC = "transactions"
NUM_TRANSACTIONS = 1000  # Nombre de transactions pour le test de charge

def generate_transaction():
    tx_id = f"TX-{random.randint(100000, 999999)}"
    return {
        "transaction_id": tx_id,
        "timestamp": datetime.utcnow().isoformat(),
        "amount": round(random.uniform(10, 10000), 2),
        "currency": "EUR",
        "sender": {"id": f"ACC-{random.randint(1000, 9999)}", "name": "Test Sender"},
        "recipient": {"id": f"ACC-{random.randint(1000, 9999)}", "name": "Test Recipient"},
        "metadata": {
            "ip": f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}",
            "device": "LoadTest-Client"
        }
    }

async def run_load_test():
    logger.info(f"🚀 Démarrage du test de charge: {NUM_TRANSACTIONS} transactions...")
    try:
        producer = KafkaProducer(
            bootstrap_servers=KAFKA_BROKERS,
            value_serializer=lambda x: json.dumps(x).encode('utf-8')
        )
    except Exception as e:
        logger.error(f"❌ Erreur connexion Kafka: {e}")
        return

    start_time = time.time()
    
    for i in range(NUM_TRANSACTIONS):
        tx = generate_transaction()
        producer.send(TOPIC, tx)
        if i % 100 == 0:
            logger.info(f"📡 {i} transactions envoyées...")
    
    producer.flush()
    end_time = time.time()
    
    duration = end_time - start_time
    tps = NUM_TRANSACTIONS / duration
    
    logger.info("\n" + "="*30)
    logger.info(f"✅ TEST DE CHARGE TERMINÉ")
    logger.info(f"⏱️ Durée: {duration:.2f} secondes")
    logger.info(f"📊 Débit: {tps:.2f} transactions/sec")
    logger.info("="*30)
    logger.info("Vérifiez les logs de MinIO et Postgres pour valider l'ingestion.")

if __name__ == "__main__":
    asyncio.run(run_load_test())
