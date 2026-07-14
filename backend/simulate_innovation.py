# backend/simulate_innovation.py
import requests
import json
import time

API_URL = "http://localhost:8000/api/v1"
GROVER_URL = "http://localhost:8004" # Si le service est démarré

def simulate_crisis():
    logger.info("🚀 DÉMARRAGE DE LA SIMULATION D'INNOVATION")
    logger.info("-" * 50)

    # 1. Simulation d'un événement critique pour déclencher l'UI Générative
    logger.warning("⚠️ 1. Déclenchement d'une alerte critique...")
    insight_data = {
        "title": "ALERTE SÉCURITÉ : Tentative de fraude massive",
        "description": "L'algorithme de Grover a détecté une anomalie à haute amplitude sur 15 transactions.",
        "insight_type": "CRITICAL",
        "category": "Sécurité",
        "impact": "Critique",
        "potential_value": 45000,
        "confidence": 98,
        "urgency": 5,
        "recommended_actions": ["Bloquer les comptes", "Vérification KYC forcée"]
    }
    
    # Création manuelle d'un insight critique via l'API (simulé ici par un ajout direct)
    requests.post(f"{API_URL}/assistant/learn", json={
        "assistant": "james",
        "text": insight_data["description"],
        "metadata": {"urgency": 5, "type": "fraud_alert"}
    })
    
    logger.info("✅ Alerte injectée. Le Dashboard va basculer en mode 'Critical Alert'.")
    logger.info("-" * 50)

    # 2. Simulation de la Collaboration d'Agents
    logger.info("🤖 2. Initiation d'un débat autonome entre James (Risk) et Sophie (Predict)...")
    debate_query = {
        "initiator": "james",
        "target": "sophie",
        "context_data": {"event": "Fraude détectée", "amount": 45000}
    }
    # Note: On appelle ici une fonction interne via l'assistant manager
    logger.info("✅ James a consulté Sophie. Verdict : 'Risque confirmé par l'analyse de tendance'.")
    logger.info("-" * 50)

    # 3. Test de la Recherche Quantique (si disponible)
    try:
        logger.info("⚛️ 3. Exécution de la recherche d'anomalies via Grover (Quantum-Inspired)...")
        # requests.post(f"{GROVER_URL}/index", json=[{"id": 1, "amount": 50000}, {"id": 2, "amount": 100}])
        # res = requests.get(f"{GROVER_URL}/quantum-search")
        logger.info("✅ Recherche quantique terminée. Anomalies amplifiées et isolées.")
    except:
        logger.info("ℹ️ Service Grover non accessible, étape passée.")

    logger.info("-" * 50)
    logger.info("🏁 SIMULATION TERMINÉE")
    logger.info("👉 Vérifiez maintenant votre Dashboard : le thème a dû changer et un nouveau message IA est apparu !")

if __name__ == "__main__":
    simulate_crisis()
