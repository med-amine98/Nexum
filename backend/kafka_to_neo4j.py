import json
import time
import requests
from kafka import KafkaConsumer
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def consume_kafka_to_neo4j():
    """Consommer Kafka et envoyer les transactions à Neo4j via l'API"""
    
    # Attendre que Kafka soit prêt
    time.sleep(3)
    
    try:
        # Utiliser le bon nom de service
        consumer = KafkaConsumer(
            'assistant-events',
            bootstrap_servers='neura-kafka:9092',  # ← ICI : utiliser neura-kafka
            auto_offset_reset='earliest',
            enable_auto_commit=True,
            group_id='neo4j-consumer-group',
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            consumer_timeout_ms=1000
        )
        
        logger.info("✅ Kafka consumer connecté - Attente des messages...")
        logger.info("📡 Écoute sur le topic: assistant-events")
        
        for message in consumer:
            try:
                data = message.value
                logger.info(f"📨 Message reçu: {data.get('type', 'unknown')}")
                
                if data.get('type') == 'transaction':
                    transaction = data.get('data', {})
                    
                    # Envoyer à l'API Neo4j
                    response = requests.post(
                        "http://localhost:8000/api/v1/pipeline/transaction-direct",
                        json=transaction,
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        logger.info(f"✅ Transaction {transaction.get('transaction_id')} envoyée à Neo4j")
                    else:
                        logger.error(f"❌ Erreur API: {response.status_code} - {response.text}")
                
            except Exception as e:
                logger.error(f"❌ Erreur traitement message: {e}")
                
    except Exception as e:
        logger.error(f"❌ Erreur connexion Kafka: {e}")

if __name__ == "__main__":
    logger.info("🚀 Démarrage du consumer Kafka → Neo4j")
    consume_kafka_to_neo4j()
