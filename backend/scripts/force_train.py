# scripts/force_train.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.services.predictive_ml_service import get_predictive_ml_service
from app.models.predictive_analytics import HistoricalData, MetricType

def force_train():
    db = SessionLocal()
    
    try:
        # Vérifier les données
        for metric in MetricType:
            count = db.query(HistoricalData).filter(
                HistoricalData.metric == metric.value
            ).count()
            print(f"📊 {metric.value}: {count} données")
        
        # Entraîner les modèles
        print("🔄 Entraînement des modèles...")
        ml_service = get_predictive_ml_service()
        results = ml_service.train_all_models(db)
        
        for metric, result in results.items():
            if result.get("success"):
                print(f"✅ {metric}: {result}")
            else:
                print(f"❌ {metric}: {result.get('message')}")
        
        # Forcer la sauvegarde
        print("💾 Sauvegarde des modèles...")
        ml_service.save_models()
        
        # Vérifier les fichiers
        import os
        model_path = ml_service.model_path
        files = os.listdir(model_path) if os.path.exists(model_path) else []
        print(f"📁 Fichiers dans {model_path}: {files}")
        
    except Exception as e:
        print(f"❌ Erreur: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    force_train()