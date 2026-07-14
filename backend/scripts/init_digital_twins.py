# scripts/init_digital_twins.py
import asyncio
import random
from datetime import datetime, timedelta

async def init_digital_twins():
    """Initialise les jumeaux numériques avec des données de base"""
    
    twins_data = {
        "commercial": {
            "name": "Jumeau Commercial",
            "description": "Modèle prédictif des ventes et comportements clients",
            "metrics": ["CA prévisionnel", "Taux de conversion", "Panier moyen"],
            "algorithms": ["Prophet", "LSTM", "XGBoost"]
        },
        "stock": {
            "name": "Jumeau Stock",
            "description": "Optimisation des niveaux de stock et réapprovisionnement",
            "metrics": ["Stock de sécurité", "Point de commande", "Rotation des stocks"],
            "algorithms": ["ARIMA", "Random Forest", "Reinforcement Learning"]
        },
        "production": {
            "name": "Jumeau Production",
            "description": "Planification et optimisation de la production",
            "metrics": ["Taux d'occupation", "Lead time", "Efficacité globale"],
            "algorithms": ["Linear Programming", "Genetic Algorithm", "Simulation"]
        },
        "logistique": {
            "name": "Jumeau Logistique",
            "description": "Optimisation des flux logistiques et livraisons",
            "metrics": ["Délai de livraison", "Coût au km", "Taux de satisfaction"],
            "algorithms": ["Vehicle Routing", "Ant Colony", "Q-Learning"]
        }
    }
    
    logger.info("✅ Digital Twins initialisés avec succès")
    for key, twin in twins_data.items():
        logger.info(f"   - {twin['name']}: {twin['description']}")
    
    return twins_data

if __name__ == "__main__":
    asyncio.run(init_digital_twins())