
from app.database import SessionLocal
from app.models.module import Module

db = SessionLocal()

# Liste des modules à rendre payants
paid_modules = {
    "ai-report-generator": 49.99,
    "ai-quote-generator": 29.99,
    "cyber-shield": 99.99,
    "digital-twin": 149.99,
    "fraud-detection-banking": 199.99,
    "fraud-detection-insurance": 199.99,
    "catastrophe-modeling": 299.99,
    "damage-auto-estimation": 79.99,
    "nexy-ai": 39.99
}

try:
    # Mettre à jour tous les modules pour être gratuits par défaut
    db.query(Module).update({Module.is_free: True, Module.price: 0.0})
    
    # Appliquer les prix aux modules payants
    for key, price in paid_modules.items():
        module = db.query(Module).filter(Module.key == key).first()
        if module:
            module.is_free = False
            module.price = price
            logger.info(f"Module {key} mis à jour: {price} EUR")
    
    db.commit()
    logger.info("Base de données mise à jour avec succès pour le modèle SaaS")
except Exception as e:
    db.rollback()
    logger.error(f"Erreur lors de la mise à jour: {e}")
finally:
    db.close()
