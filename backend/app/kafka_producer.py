import json
import time
from kafka import KafkaProducer
from kafka.errors import KafkaError
import logging

logger = logging.getLogger(__name__)
producer = None

def create_producer():
    global producer

    for i in range(10):
        try:
            producer = KafkaProducer(
                bootstrap_servers="neura-kafka:9092",
                value_serializer=lambda v: json.dumps(v).encode("utf-8"),
                request_timeout_ms=30000,
                max_block_ms=30000,
                retry_backoff_ms=500
                # ❌ SUPPRIMEZ CETTE LIGNE : api_version_auto_timeout_ms=30000
            )
            # Vérifier que Kafka répond
            producer.bootstrap_connected()
            logger.info("✅ Kafka connecté avec succès")
            return
        except KafkaError as ke:
            logger.warning(f"⏳ Erreur Kafka tentative {i+1}/10: {ke}")
            time.sleep(5)
        except Exception as e:
            logger.warning(f"⏳ Erreur générale tentative {i+1}/10: {e}")
            time.sleep(5)

    logger.error("❌ Impossible de se connecter à Kafka après plusieurs tentatives")
    producer = None

# Initialisation
create_producer()

def send_event(event):
    global producer

    if producer is None:
        logger.warning(f"⚠️ Kafka non disponible, événement ignoré: {event}")
        return

    try:
        future = producer.send("assistant-events", event)
        result = future.get(timeout=10)
        logger.info(f"✅ Event envoyé à Kafka: {event}")
        return result
    except Exception as e:
        logger.error(f"❌ Erreur envoi Kafka: {e}")
        # Tenter de reconnecter
        create_producer()
        return None