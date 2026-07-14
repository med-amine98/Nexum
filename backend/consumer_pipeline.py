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
    logger.info('🚀 Consumer Kafka → Neo4j (Pipeline)')
    
    # Attendre que Kafka soit prêt
    time.sleep(5)
    
    try:
        consumer = KafkaConsumer(
            'assistant-events',
            bootstrap_servers='neura-kafka:9092',
            auto_offset_reset='earliest',
            enable_auto_commit=True,
            group_id='pipeline-consumer-group',
            value_deserializer=lambda m: json.loads(m.decode('utf-8')),
            consumer_timeout_ms=1000
        )
        
        logger.info('✅ Connecté à Kafka sur neura-kafka:9092')
        logger.info('📡 Écoute sur le topic: assistant-events')
        
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
                    
                    # Envoyer à Neo4j via l'API
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
        logger.info('🔄 Tentative de reconnexion dans 5 secondes...')
        time.sleep(5)
        main()

if __name__ == '__main__':
    main()
