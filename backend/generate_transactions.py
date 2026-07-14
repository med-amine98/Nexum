from kafka import KafkaProducer
import json
import random
from datetime import datetime
import time

producer = KafkaProducer(
    bootstrap_servers=['neura-kafka:9092'],
    value_serializer=lambda x: json.dumps(x).encode('utf-8')
)

print("🚀 Génération de 30 transactions...")
print("=" * 50)

for i in range(30):
    amount = random.choice([
        random.randint(100, 1000),
        random.randint(1000, 10000),
        random.randint(10000, 150000)
    ])
    
    tx = {
        'transaction_id': f'tx_{i+1:04d}',
        'timestamp': datetime.now().isoformat(),
        'amount': amount,
        'sender': {
            'id': f'sender_{random.randint(1,5)}',
            'name': f'Client_{random.randint(1,5)}',
            'history': random.choice(['new', 'regular', 'frequent'])
        },
        'recipient': {
            'id': f'recipient_{random.randint(1,5)}',
            'name': f'Merchant_{random.randint(1,5)}'
        }
    }
    
    producer.send('transactions', value=tx)
    producer.flush()
    
    risk = "🔴 HIGH" if amount > 50000 else ("🟡 MEDIUM" if amount > 10000 else "🟢 LOW")
    print(f"{i+1:2}. {tx['transaction_id']}: {amount:>6}€ {risk}")
    time.sleep(0.3)

print("=" * 50)
print("✅ 30 transactions générées!")
producer.close()
