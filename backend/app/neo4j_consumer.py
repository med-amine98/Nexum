# /app/neo4j_consumer.py
from neo4j import GraphDatabase
from kafka import KafkaConsumer
import json

# 1. Connexion Neo4j
driver = GraphDatabase.driver("bolt://neo4j:7687", auth=("neo4j", "neo4j123"))

# 2. Connexion Kafka
consumer = KafkaConsumer(
    'transactions-enriched',
    bootstrap_servers=['kafka:9092'],
    value_deserializer=lambda x: json.loads(x.decode('utf-8'))
)

print("✅ Neo4j connecté")
print("📡 En attente des transactions enrichies...")

for msg in consumer:
    tx = msg.value
    
    # 3. Stockage dans Neo4j
    with driver.session() as session:
        session.run("""
            CREATE (tx:Transaction {
                id: $id,
                amount: $amount,
                fraud_score: $fraud_score
            })
            WITH tx
            MATCH (s:Account {id: $sender_id})
            MATCH (r:Account {id: $recipient_id})
            CREATE (s)-[:SENT]->(tx)
            CREATE (tx)-[:TO]->(r)
        """,
        id=tx['transaction_id'],
        amount=tx['amount'],
        fraud_score=tx.get('fraud_score', 0),
        sender_id=tx['sender']['id'],
        recipient_id=tx['recipient']['id']
        )
    
    print(f"✅ Transaction {tx['transaction_id']} stockée dans Neo4j")