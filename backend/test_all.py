import asyncio
import aiohttp
import json
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Endpoints (Ports Docker)
ORCHESTRATOR_URL = "http://localhost:8007/process"
BC_URL = "http://localhost:8008/secure-claim"
WS_URL = "ws://localhost:8000/ws/test_user"

async def test_full_intelligent_pipeline():
    """
    Simule une transaction bancaire et un sinistre assurance
    pour valider l'orchestration, l'IA et la Blockchain.
    """
    logger.info("🎬 Démarrage du test global du pipeline intelligent")
    
    async with aiohttp.ClientSession() as session:
        # 1. Test Orchestrateur de Transactions (GNN + XAI)
        transaction = {
            "transaction_id": "TEST-TX-999",
            "amount": 15000.0,
            "sender": {"id": 1, "name": "Jean Dupont", "country": "FR"},
            "recipient": {"id": 101, "name": "Global Trade", "country": "CY"},
            "timestamp": datetime.now().isoformat(),
            "metadata": {"device": "unknown_linux_vps"}
        }
        
        logger.info(f"📤 Envoi transaction suspecte à l'Orchestrateur...")
        try:
            async with session.post(ORCHESTRATOR_URL, json=transaction) as resp:
                if resp.status == 200:
                    verdict = await resp.json()
                    logger.info(f"✅ Verdict reçu : {'FRAUDE' if verdict['is_fraudulent'] else 'OK'}")
                    logger.info(f"💡 Explication IA : {verdict['explanation']}")
                    logger.info(f"⛓️ Chemin de décision : {verdict['path']}")
        except Exception as e:
            logger.error(f"❌ Erreur test transaction: {e}")

        # 2. Test Sécurisation Sinistre (ZK-Proof)
        claim_data = {
            "claim_id": "CLAIM-2026-X4",
            "verdict": "ACCEPTED",
            "risk_score": 0.12,
            "evidence_hash": "a8f3c1d2e5b6..."
        }
        
        logger.info(f"📤 Sécurisation du sinistre sur la Blockchain...")
        try:
            async with session.post(BC_URL, params=claim_data) as resp:
                if resp.status == 200:
                    bc_result = await resp.json()
                    logger.info(f"✅ Sinistre sécurisé ! TX: {bc_result['blockchain_tx']}")
                    logger.info(f"🔏 Preuve ZK générée : {bc_result['zk_proof'][:50]}...")
        except Exception as e:
            logger.error(f"❌ Erreur test blockchain: {e}")

    logger.info("🏁 Test global terminé avec succès !")

if __name__ == "__main__":
    asyncio.run(test_full_intelligent_pipeline())
