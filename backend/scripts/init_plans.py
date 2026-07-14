from app.core.database import SessionLocal
from app.models.saas import SubscriptionPlan

def init_plans():
    db = SessionLocal()
    
    plans = [
        {
            "name": "Pack Gratuit",
            "code": "free",
            "price": 0.0,
            "max_users": 2,
            "max_storage_gb": 0.5,
            "features": ["Accès Dashboard", "Rapports Basiques"]
        },
        {
            "name": "Pack Standard",
            "code": "standard",
            "price": 99.0,
            "max_users": 10,
            "max_storage_gb": 5.0,
            "features": ["Accès Dashboard", "Rapports IA", "Support Email"]
        },
        {
            "name": "Pack Premium",
            "code": "premium",
            "price": 299.0,
            "max_users": 50,
            "max_storage_gb": 20.0,
            "features": ["Accès Dashboard", "Rapports IA Avancés", "Sync Blockchain", "Support 24/7"]
        },
        {
            "name": "Pack Enterprise",
            "code": "enterprise",
            "price": 999.0,
            "max_users": 999,
            "max_storage_gb": 500.0,
            "features": ["Tout illimité", "IA Sur Mesure", "Cluster Privé", "Account Manager Dédié"]
        }
    ]
    
    for p_data in plans:
        existing = db.query(SubscriptionPlan).filter(SubscriptionPlan.code == p_data["code"]).first()
        if not existing:
            plan = SubscriptionPlan(**p_data)
            db.add(plan)
            logger.info(f"✅ Plan {p_data['name']} ajouté.")
    
    db.commit()
    db.close()

if __name__ == "__main__":
    init_plans()
