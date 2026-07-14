from kafka import KafkaConsumer, KafkaProducer
import json
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SparkEnricher:
    def __init__(self):
        self.consumer = KafkaConsumer(
            'transactions',
            bootstrap_servers=['neura-kafka:9092'],
            auto_offset_reset='earliest',
            enable_auto_commit=True,
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )
        self.producer = KafkaProducer(
            bootstrap_servers=['neura-kafka:9092'],
            value_serializer=lambda x: json.dumps(x).encode('utf-8')
        )
        logger.info("⚡ Spark Enricher démarré")
    
    def enrich(self, transaction):
        amount = transaction.get('amount', 0)
        
        if amount > 50000:
            fraud_score = 0.85
            risk_level = "high"
        elif amount > 10000:
            fraud_score = 0.4
            risk_level = "medium"
        else:
            fraud_score = 0.05
            risk_level = "low"
        
        transaction['fraud_score'] = fraud_score
        transaction['risk_level'] = risk_level
        transaction['enriched_by'] = 'spark'
        transaction['enriched_at'] = datetime.now().isoformat()
        return transaction
    
    def run(self):
        logger.info("📡 En attente des transactions...")
        count = 0
        for msg in self.consumer:
            enriched = self.enrich(msg.value)
            self.producer.send('transactions-enriched', value=enriched)
            self.producer.flush()
            count += 1
            logger.info(f"✅ {enriched.get('transaction_id', 'unknown')}: {enriched['amount']}€ | Score: {enriched['fraud_score']:.2f} | {enriched['risk_level']}")

if __name__ == "__main__":
    SparkEnricher().run()
