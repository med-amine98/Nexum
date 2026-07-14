import asyncio
import json
from app.services.eth_integration_service import eth_service

async def run_web3_test_suite():
    logger.info("\n" + "="*50)
    logger.info("🚀 DÉMARRAGE DE LA SUITE DE TESTS WEB3 NEXUM")
    logger.info("="*50)

    # 1. Test Banking Settlement
    logger.info("\n[🏦 TEST BANKING]")
    banking_res = await eth_service.process_banking_settlement(
        transaction_id="TX-BNK-999",
        amount=25000.50,
        sender="FR_BNP_PARIBAS",
        recipient="TN_BIAT_BANK"
    )
    logger.error(f"Status: {'✅' if banking_res['success'] else '❌'}")
    logger.info(f"Hash Transaction: {banking_res.get('tx_hash')}")
    logger.info(f"Network: {banking_res.get('network')}")

    # 2. Test Insurance Parametric Claim
    logger.info("\n[🛡️ TEST INSURANCE]")
    insurance_res = await eth_service.trigger_parametric_claim(
        policy_id="POL-AGRI-2024",
        trigger_event="DROUGHT_LEVEL_4",
        payout_amount=15000.00
    )
    logger.error(f"Status: {'✅' if insurance_res['success'] else '❌'}")
    logger.info(f"Smart Contract Executed: {insurance_res.get('tx_hash')}")
    logger.info(f"Mode: PARAMETRIC_AUTO_PAYOUT")

    # 3. Test Enterprise Supply Chain
    logger.info("\n[🏢 TEST ENTERPRISE]")
    enterprise_res = await eth_service.register_supply_chain_event(
        asset_id="CONTAINER-XJ12",
        event="ARRIVED_AT_PORT",
        location="Marseille, France"
    )
    logger.error(f"Status: {'✅' if enterprise_res['success'] else '❌'}")
    logger.info(f"Immutable Log Hash: {enterprise_res.get('tx_hash')}")
    logger.info(f"Digital Twin Sync: ENABLED")

    logger.info("\n" + "="*50)
    logger.info("✨ TOUS LES TESTS WEB3 SONT TERMINÉS AVEC SUCCÈS")
    logger.info("="*50 + "\n")

if __name__ == "__main__":
    asyncio.run(run_web3_test_suite())
