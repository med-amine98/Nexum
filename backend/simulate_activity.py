import time
import random
from datetime import datetime, timedelta
import requests
import json
import os

# Configuration
API_BASE = "http://localhost:8000/api/v1"
# On essaie de récupérer un token si possible, sinon on simule sans auth (si le backend le permet en local)
# Pour ce script, on assume qu'il tourne sur le serveur ou qu'on a un token d'admin
TOKEN = os.environ.get("NEXUM_ADMIN_TOKEN", "your_admin_token_here")

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json"
}

def simulate_cyber_threat():
    """Simule une menace bloquée dans CyberShield."""
    threats = ["SQL Injection", "Brute Force", "DDoS Attempt", "XSS Attack", "Unauthorized API Call"]
    ips = [f"{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}" for _ in range(5)]
    
    # Envoi au backend (via AuditLog ou un endpoint spécifique si existant)
    # Pour l'instant on simule l'activité qui génère des logs
    logger.info(f"🛡️ [CyberShield] Menace détectée : {random.choice(threats)} depuis {random.choice(ips)} - BLOCKED")

def simulate_blockchain_tx():
    """Simule une transaction d'indemnisation SmartClaims."""
    amount = random.uniform(100, 2500)
    tx_hash = f"0x{random.getrandbits(128):032x}"
    logger.info(f"⛓️ [Blockchain] Transaction confirmée : {tx_hash} - Montant : {amount:.2f} EUR")

def simulate_crm_lead():
    """Simule l'arrivée d'un nouveau lead."""
    names = ["Jean Dupont", "Marie Curie", "Albert Einstein", "Steve Jobs", "Elon Musk"]
    companies = ["Tesla", "SpaceX", "Apple", "Google", "Nexum Corp"]
    logger.info(f"👤 [CRM] Nouveau lead entrant : {random.choice(names)} ({random.choice(companies)})")

def run_simulation():
    logger.info("🚀 Démarrage de la simulation Nexum Intelligence en temps réel...")
    logger.info("Pressez Ctrl+C pour arrêter.")
    
    try:
        while True:
            # Choix aléatoire d'une action à simuler
            action = random.choice([simulate_cyber_threat, simulate_blockchain_tx, simulate_crm_lead])
            action()
            
            # Délai aléatoire entre 2 et 5 secondes
            time.sleep(random.uniform(2, 5))
            
    except KeyboardInterrupt:
        logger.info("\n🛑 Simulation arrêtée.")

if __name__ == "__main__":
    run_simulation()
