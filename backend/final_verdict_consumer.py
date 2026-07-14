from kafka import KafkaConsumer
from neo4j import GraphDatabase
import json
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class FinalVerdictConsumer:
    def __init__(self):
        self.consumer = KafkaConsumer(
            'final-verdict',
            bootstrap_servers=['neura-kafka:9092'],
            auto_offset_reset='earliest',
            enable_auto_commit=True,
            value_deserializer=lambda x: json.loads(x.decode('utf-8'))
        )
        self.driver = GraphDatabase.driver("bolt://neura-neo4j:7687", auth=("neo4j", "neo4j123"))
        logger.info("📋 Final Verdict Consumer démarré")
    
    def store_verdict(self, verdict):
        try:
            tx_id = verdict.get('transaction_id')
            if not tx_id:
                return
            
            with self.driver.session() as session:
                session.run("""
                    MATCH (s:Account)-[r:SENT]->(t:Account)
                    WHERE r.transaction_id = $tx_id
                    SET r.final_verdict = $verdict,
                        r.final_score = $score,
                        r.final_confidence = $confidence,
                        r.graph_score = $graph_score,
                        r.quantum_score = $quantum_score,
                        r.analyzed_at = datetime()
                """,
                tx_id=tx_id,
                verdict=verdict.get('verdict'),
                score=verdict.get('final_score', 0),
                confidence=verdict.get('final_confidence', 0),
                graph_score=verdict.get('graph_score', 0),
                quantum_score=verdict.get('quantum_score', 0)
                )
            
            logger.info(f"✅ {tx_id} | Verdict: {verdict.get('verdict')}")
            
        except Exception as e:
            logger.error(f"❌ Erreur: {e}")
    
    def run(self):
        for msg in self.consumer:
            self.store_verdict(msg.value)

if __name__ == "__main__":
    FinalVerdictConsumer().run()
