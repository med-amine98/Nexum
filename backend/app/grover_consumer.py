# /app/grover_consumer.py
import requests
import time
import json

def send_to_grover(transaction):
    """Envoie une transaction à Grover pour analyse quantique"""
    payload = {
        "id": transaction.get("transaction_id", "unknown"),
        "amount": transaction.get("amount", 0),
        "source_account": transaction.get("sender", {}).get("id", "ACC-000"),
        "target_account": transaction.get("recipient", {}).get("id", "ACC-001"),
        "metadata": {"fraud_score": transaction.get("fraud_score", 0)}
    }
    
    response = requests.post(
        "http://grover:8000/search",
        json=payload,
        timeout=5
    )
    
    if response.status_code == 200:
        return response.json()
    return None

print("✅ Grover connecté")

# Simuler l'envoi
for i in range(10):
    tx = {
        "transaction_id": f"TX-{i}",
        "amount": 95000 if i % 2 == 0 else 150,
        "fraud_score": 0.85 if i % 2 == 0 else 0.05
    }
    
    result = send_to_grover(tx)
    if result:
        print(f"✅ Grover: {result}")
    
    time.sleep(2)