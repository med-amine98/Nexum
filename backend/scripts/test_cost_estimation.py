# scripts/test_cost_estimation.py
import requests
import json

def test_all_estimations():
    """Teste toutes les estimations de coûts"""
    
    base_url = "http://localhost:8000/estimate"
    
    tests = [
        ("accident", {"parts": ["pare-chocs_avant", "phare_avant_gauche"]}),
        ("habitation", {"damage_type": "mur", "surface_m2": 15}),
        ("agricole", {"disease_name": "late_blight"}),
        ("sante", {"care_type": "hospitalisation_jour"})
    ]
    
    logger.info("=" * 60)
    logger.info("💰 TEST D'ESTIMATION DES COÛTS")
    logger.info("=" * 60)
    
    for claim_type, params in tests:
        logger.info(f"\n📋 {claim_type.upper()}")
        logger.info("-" * 40)
        
        response = requests.post(f"{base_url}/{claim_type}", json=params)
        
        if response.status_code == 200:
            result = response.json()
            logger.info(f"Total HT: {result.get('total_cost', 0)}€")
            logger.info(f"TVA (20%): {result.get('tva', 0)}€")
            logger.info(f"Total TTC: {result.get('total_ttc', 0)}€")
            
            if 'details' in result:
                logger.info("\nDétails:")
                for detail in result['details'][:3]:
                    logger.info(f"  - {detail.get('piece', detail.get('care_type', 'unknown'))}: {detail.get('total', 0)}€")
        else:
            logger.error(f"❌ Erreur: {response.status_code}")
    
    logger.info("\n" + "=" * 60)
    logger.info("✅ TESTS TERMINÉS")
    logger.info("=" * 60)

if __name__ == "__main__":
    test_all_estimations()