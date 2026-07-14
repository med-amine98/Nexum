from kafka import KafkaConsumer
from neo4j import GraphDatabase
import json
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Neo4jConsumer:
    def __init__(self):
        self.driver = GraphDatabase.driver("bolt://neura-neo4j:7687", auth=("neo4j", "neo4j123"))
        self.consumer = KafkaConsumer(
            'transactions-enriched',
            bootstrap_servers=['neura-kafka:9092'],
            auto_offset_reset='earliest',
            enable_auto_commit=True,
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )
        logger.info("🕸️ Neo4j Consumer démarré")
    
    def store(self, tx):
        try:
            with self.driver.session() as session:
                session.run("""
                    MERGE (s:Account {id: $sender_id})
                    SET s.name = $sender_name
                    MERGE (r:Account {id: $recipient_id})
                    SET r.name = $recipient_name
                    CREATE (s)-[:SENT {
                        amount: $amount,
                        transaction_id: $tx_id,
                        timestamp: datetime($timestamp),
                        fraud_score: $fraud_score,
                        risk_level: $risk_level,
                        enriched_by: $enriched_by
                    }]->(r)
                """,
                sender_id=tx.get('sender', {}).get('id', 'unknown'),
                sender_name=tx.get('sender', {}).get('name', 'Unknown'),
                recipient_id=tx.get('recipient', {}).get('id', 'unknown'),
                recipient_name=tx.get('recipient', {}).get('name', 'Unknown'),
                amount=tx.get('amount', 0),
                tx_id=tx.get('transaction_id', 'unknown'),
                timestamp=tx.get('timestamp', datetime.now().isoformat()),
                fraud_score=tx.get('fraud_score', 0),
                risk_level=tx.get('risk_level', 'low'),
                enriched_by=tx.get('enriched_by', 'spark')
                )
            logger.info(f"✅ {tx.get('transaction_id', 'unknown')} dans Neo4j")
        except Exception as e:
            logger.error(f"❌ Erreur: {e}")
    
    def run(self):
        for msg in self.consumer:
            self.store(msg.value)

if __name__ == "__main__":
    Neo4jConsumer().run()
