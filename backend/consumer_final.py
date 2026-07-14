import json
import time
import requests
from kafka import KafkaConsumer
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    logger.info('🚀 Consumer Kafka → Neo4j')
    
    while True:
        try:
            consumer = KafkaConsumer(
                'assistant-events',
                bootstrap_servers='neura-kafka:9092',
                auto_offset_reset='earliest',
                enable_auto_commit=True,
                group_id='neo4j-consumer',
                value_deserializer=lambda m: json.loads(m.decode('utf-8'))
            )
            logger.info('✅ Connecté à Kafka')
            break
        except Exception as e:
            logger.warning(f'⏳ Attente Kafka: {e}')
            time.sleep(5)
    
    count = 0
    for message in consumer:
        try:
            data = message.value
            if data.get('type') == 'transaction':
                tx = data.get('data', {})
                tx_id = tx.get('transaction_id', 'unknown')
                count += 1
                logger.info(f'💰 [{count}] {tx_id} - {tx.get(" amount\,
