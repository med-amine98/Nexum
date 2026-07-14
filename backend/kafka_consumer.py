#!/usr/bin/env python3
import json
import requests
from kafka import KafkaConsumer
import time
import sys

print("🚀 Démarrage du consumer Kafka...")

BACKEND_URL = "http://backend:8000/api/v1"

try:
    from neo4j import GraphDatabase
    neo4j_available = True
    print("✅ Neo4j disponible")
except ImportError:
    neo4j_available = False
    print("⚠️ Neo4j non disponible")

try:
    consumer = KafkaConsumer(
        'transactions',
        bootstrap_servers=['neura-kafka:9092'],
        auto_offset_reset='earliest',
        enable_auto_commit=True,
        group_id='pipeline-group',
        value_deserializer=lambda x: json.loads(x.decode('utf-8')),
        request_timeout_ms=31000,
        session_timeout_ms=30000,
        heartbeat_interval_ms=3000,
        max_poll_records=10,
        api_version_auto_timeout_ms=10000
    )
    print("✅ Consumer Kafka démarré avec succès")
except Exception as e:
    print(f"❌ Erreur Kafka: {e}")
    sys.exit(1)

print("📡 En attente de transactions...")

for msg in consumer:
    transaction = msg.value
    tx_id = transaction.get('transaction_id')
    amount = transaction.get('amount', 0)
    
    print(f"📨 Transaction reçue: {tx_id} - {amount}€")
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/pipeline/transactions",
            json=transaction,
            timeout=5
        )
        if response.status_code in [200, 201]:
            result = response.json()
            print(f"   ✅ Score: {result.get('fraud_score', 0):.0%}")
        else:
            print(f"   ⚠️ Erreur backend: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Erreur envoi: {e}")
    
    time.sleep(0.1)
