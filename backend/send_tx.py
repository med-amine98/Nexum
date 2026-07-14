from kafka import KafkaProducer
import json
import uuid
import time
import random

p = KafkaProducer(bootstrap_servers=['kafka:29092'], value_serializer=lambda v: json.dumps(v).encode('utf-8'))

for i in range(10):
    is_fraud = random.random() < 0.3
    amount = random.uniform(5000, 50000) if is_fraud else random.uniform(10, 5000)
    tx = {
        'transaction_id': str(uuid.uuid4()),
        'amount': round(amount, 2),
        'sender_id': f'user_{random.randint(1, 100)}',
        'recipient_id': f'merchant_{random.randint(1, 50)}',
        'timestamp': time.time(),
        'is_fraudulent': is_fraud
    }
    p.send('transactions-raw', value=tx)
    logger.info(f'[{i+1}/10] Sent: {tx["transaction_id"][:8]}...')
