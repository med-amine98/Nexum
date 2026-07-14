# /app/orchestrator_consumer.py
import requests
import json
from kafka import KafkaConsumer

def orchestrate(transaction):
    """Orchestre le pipeline"""
    
    # 1. Envoyer à Graph Transformer
    gnn_result = requests.post(
        "http://graph-transformer:8000/analyze",
        json={"amount": transaction.get("amount", 0)},
        timeout=5
    ).json()
    
    # 2. Envoyer à Grover
    grover_result = requests.post(
        "http://grover:8000/analyze",
        json=transaction,
        timeout=5
    ).json()
    
    # 3. Décision finale
    gnn_score = gnn_result.get("fraud_score", 0)
    grover_score = grover_result.get("fraud_score", 0)
    
    final_score = (gnn_score * 0.5 + grover_score * 0.5)
    verdict = "FRAUD" if final_score > 0.6 else "LEGIT"
    
    return {
        "transaction_id": transaction.get("transaction_id"),
        "final_score": final_score,
        "verdict": verdict,
        "gnn_score": gnn_score,
        "grover_score": grover_score
    }

print("🎯 Orchestrateur prêt")

# Consommer les transactions
consumer = KafkaConsumer(
    'transactions',
    bootstrap_servers=['kafka:9092'],
    value_deserializer=lambda x: json.loads(x.decode('utf-8'))
)

for msg in consumer:
    result = orchestrate(msg.value)
    print(f"🏆 Verdict final: {result}")