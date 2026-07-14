# scripts/download_yolo_model.py
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import logging
import torch

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def download_yolo_model():
    """Télécharger le modèle YOLO11m depuis ultralytics"""
    try:
        from ultralytics import YOLO
        
        logger.info("📥 Téléchargement du modèle YOLO11m depuis ultralytics...")
        
        # Créer le dossier models
        os.makedirs("models", exist_ok=True)
        os.makedirs("models/yolo", exist_ok=True)
        
        # Télécharger le modèle - utilise le cache de ultralytics
        logger.info("⏳ Téléchargement en cours... (peut prendre 2-3 minutes)")
        model = YOLO("yolo11m.pt")
        
        # Le modèle est automatiquement téléchargé dans le cache de ultralytics
        # Vérifier où il a été sauvegardé
        cache_dir = os.path.expanduser("~/.cache/ultralytics")
        logger.info(f"📁 Cache ultralytics: {cache_dir}")
        
        # Sauvegarder une copie locale dans models/
        try:
            # Sauvegarder le modèle entraîné
            model_path = "models/yolo/yolo11m.pt"
            model.export(format="pt", imgsz=640)
            
            # Vérifier si le fichier a été créé
            if os.path.exists(model_path):
                logger.info(f"✅ Modèle sauvegardé dans {model_path}")
            else:
                # Chercher dans le cache
                cache_files = []
                for root, dirs, files in os.walk(cache_dir):
                    for file in files:
                        if file.endswith('.pt'):
                            cache_files.append(os.path.join(root, file))
                
                if cache_files:
                    import shutil
                    latest_model = max(cache_files, key=os.path.getctime)
                    shutil.copy2(latest_model, model_path)
                    logger.info(f"✅ Modèle copié depuis {latest_model} vers {model_path}")
                else:
                    logger.warning("⚠️ Fichier modèle non trouvé dans le cache")
        
        except Exception as save_error:
            logger.warning(f"⚠️ Erreur sauvegarde: {save_error}")
            logger.info("💡 Le modèle est déjà disponible dans le cache de ultralytics")
        
        # Vérifier que le modèle fonctionne
        test_model = YOLO("yolo11m.pt")
        logger.info("✅ Modèle YOLO11m téléchargé et testé avec succès!")
        return True
        
    except ImportError:
        logger.error("❌ ultralytics n'est pas installé")
        logger.info("💡 Installez ultralytics: pip install ultralytics")
        return False
    except Exception as e:
        logger.error(f"❌ Erreur téléchargement: {e}")
        logger.info("💡 Essayez de télécharger manuellement:")
        logger.info("   from ultralytics import YOLO")
        logger.info("   model = YOLO('yolo11m.pt')")
        return False

def test_yolo_model():
    """Tester que le modèle fonctionne"""
    try:
        from ultralytics import YOLO
        import cv2
        import numpy as np
        
        logger.info("🧪 Test du modèle YOLO...")
        
        # Créer une image de test
        test_image = np.zeros((640, 640, 3), dtype=np.uint8)
        test_image[100:200, 100:200] = [255, 255, 255]
        
        # Charger et tester
        model = YOLO("yolo11m.pt")
        results = model(test_image)
        
        logger.info(f"✅ Test réussi: {len(results)} résultat(s)")
        return True
        
    except Exception as e:
        logger.error(f"❌ Erreur test: {e}")
        return False

if __name__ == "__main__":
    logger.info("=" * 50)
    logger.info("🚀 TÉLÉCHARGEMENT DU MODÈLE YOLO")
    logger.info("=" * 50)
    
    success = download_yolo_model()
    
    if success:
        logger.info("\n✅ Téléchargement terminé avec succès!")
        test_yolo_model()
    else:
        logger.error("\n❌ Échec du téléchargement")
        logger.info("\n💡 Solutions possibles:")
        logger.info("   1. Vérifiez votre connexion internet")
        logger.info("   2. Lancez Python interactivement:")
        logger.info("      python -c 'from ultralytics import YOLO; YOLO(\"yolo11m.pt\")'")
        logger.info("   3. Téléchargez manuellement depuis:")
        logger.info("      https://github.com/ultralytics/assets/releases")