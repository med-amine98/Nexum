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

def main():
    logger.info('🚀 Consumer Kafka → Neo4j (fix)')
    
    # Configuration explicite
    config = {
        'bootstrap_servers': ['neura-kafka:9092'],
        'auto_offset_reset': 'earliest',
        'enable_auto_commit': True,
        'group_id': 'neo4j-consumer-fixed',
        'value_deserializer': lambda m: json.loads(m.decode('utf-8')),
        'consumer_timeout_ms': 1000,
        'max_poll_interval_ms': 300000,
        'request_timeout_ms': 30000,
        'session_timeout_ms': 10000,
        'heartbeat_interval_ms': 3000,
        'api_version': (3, 4, 0)  # Forcer la version API
    }
    
    try:
        consumer = KafkaConsumer('assistant-events', **config)
        logger.info('✅ Connecté à Kafka sur neura-kafka:9092')
        logger.info('📡 Écoute sur: assistant-events')
        
        count = 0
        for message in consumer:
            try:
                data = message.value
                event_type = data.get('type', 'unknown')
                
                if event_type == 'transaction':
                    tx = data.get('data', {})
                    tx_id = tx.get('transaction_id', 'unknown')
                    amount = tx.get('amount', 0)
                    count += 1
                    
                    logger.info(f'💰 [{count}] {tx_id} - {amount}€')
                    
                    response = requests.post(
                        'http://localhost:8000/api/v1/pipeline/transaction-direct',
                        json=tx,
                        timeout=10
                    )
                    
                    if response.status_code == 200:
                        logger.info(f'✅ {tx_id} → Neo4j OK')
                    else:
                        logger.error(f'❌ Erreur API: {response.status_code}')
                        
            except Exception as e:
                logger.error(f'❌ Erreur traitement: {e}')
                
    except Exception as e:
        logger.error(f'❌ Erreur connexion Kafka: {e}')
        logger.info('🔄 Reconnexion dans 5 secondes...')
        time.sleep(5)
        main()

if __name__ == '__main__':
    main()
