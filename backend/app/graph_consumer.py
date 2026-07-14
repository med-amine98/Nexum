# /app/graph_consumer.py
import requests
import json
from neo4j import GraphDatabase
import time

# 1. Connexion Neo4j
driver = GraphDatabase.driver("bolt://neo4j:7687", auth=("neo4j", "neo4j123"))

# 2. Récupérer les données du graphe
def get_graph_data():
    with driver.session() as session:
        result = session.run("""
            MATCH (s:Account)-[:SENT]->(tx:Transaction)-[:TO]->(r:Account)
            RETURN s.id as source, r.id as target, tx.amount as amount
            LIMIT 50
        """)
        return [{"source": r['source'], "target": r['target'], "amount": r['amount']} for r in result]

print("✅ Neo4j connecté pour Graph Transformer")

while True:
    # 3. Envoyer au Graph Transformer
    graph_data = get_graph_data()
    if graph_data:
        response = requests.post(
            "http://graph-transformer:8000/analyze",
            json={"graph": graph_data, "amount": 95000},
            timeout=5
        )
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Graph Transformer: {result}")
    time.sleep(5)