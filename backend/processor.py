import os
from kafka import KafkaConsumer, KafkaProducer
import json
import time
import sys

KAFKA_SERVERS = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'kafka:29092')
logger.info(f'🚀 Processor starting - Kafka: {KAFKA_SERVERS}', flush=True)

consumer = KafkaConsumer(
    'transactions-raw',
    bootstrap_servers=[KAFKA_SERVERS],
    auto_offset_reset='earliest',
    group_id='fraud-processor',
    value_deserializer=lambda x: json.loads(x.decode('utf-8'))
)

producer = KafkaProducer(
    bootstrap_servers=[KAFKA_SERVERS],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

logger.info('✅ Connected to Kafka! Waiting for transactions...', flush=True)

count = 0
for msg in consumer:
    tx = msg.value
    count += 1
    
    # Pré-traitement
    amount = tx.get('amount', 0)
    tx['risk_score'] = min(1.0, amount / 10000)
    tx['risk_level'] = 'HIGH' if tx['risk_score'] > 0.7 else 'MEDIUM' if tx['risk_score'] > 0.3 else 'LOW'
    tx['processed_at'] = time.time()
    
    # Envoyer vers le topic preprocessed
    producer.send('transactions-preprocessed', value=tx)
    
    if count % 5 == 0:
        logger.info(f'📊 Processed {count} transactions', flush=True)
        producer.flush()
