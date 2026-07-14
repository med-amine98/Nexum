# scripts/organize_plant_disease_dataset.py
from pathlib import Path
import shutil
import random
from sklearn.model_selection import train_test_split

def organize_plant_disease_dataset():
    """Organise le dataset Plant Disease pour l'entraînement"""
    
    logger.info("=" * 60)
    logger.info("🌱 ORGANISATION DU DATASET PLANT DISEASE")
    logger.info("=" * 60)
    
    # Chemins
    source = Path(r"C:\Users\salah\.cache\kagglehub\datasets\emmarex\plantdisease\versions\1\PlantVillage")
    target = Path("data_agricole_real")
    
    # Créer la structure
    for split in ['train', 'val', 'test']:
        for class_name in ['healthy', 'disease']:
            (target / split / class_name).mkdir(parents=True, exist_ok=True)
    
    # Parcourir les dossiers source
    healthy_images = []
    disease_images = []
    
    for folder in source.iterdir():
        if folder.is_dir():
            folder_name = folder.name.lower()
            logger.info(f"📁 Traitement: {folder.name}")
            
            # Récupérer toutes les images
            images = list(folder.glob("*.JPG")) + list(folder.glob("*.jpg")) + list(folder.glob("*.png"))
            
            if "healthy" in folder_name:
                # Images saines
                healthy_images.extend(images)
                logger.info(f"   ✅ Saines: {len(images)} images")
            else:
                # Images malades
                disease_images.extend(images)
                logger.info(f"   🦠 Malades: {len(images)} images")
    
    logger.info(f"\n📊 Résumé:")
    logger.info(f"   - Cultures saines: {len(healthy_images)} images")
    logger.info(f"   - Cultures malades: {len(disease_images)} images")
    
    # Équilibrer les classes
    min_count = min(len(healthy_images), len(disease_images))
    healthy_images = healthy_images[:min_count]
    disease_images = disease_images[:min_count]
    
    logger.info(f"\n⚖️ Après équilibrage: {min_count} images par classe")
    
    # Split train/val/test (70/15/15)
    healthy_train, healthy_temp = train_test_split(healthy_images, test_size=0.3, random_state=42)
    healthy_val, healthy_test = train_test_split(healthy_temp, test_size=0.5, random_state=42)
    
    disease_train, disease_temp = train_test_split(disease_images, test_size=0.3, random_state=42)
    disease_val, disease_test = train_test_split(disease_temp, test_size=0.5, random_state=42)
    
    # Copier les fichiers
    logger.info("\n📋 Copie des fichiers...")
    
    # Healthy
    for img in healthy_train:
        shutil.copy2(img, target / 'train' / 'healthy' / img.name)
    for img in healthy_val:
        shutil.copy2(img, target / 'val' / 'healthy' / img.name)
    for img in healthy_test:
        shutil.copy2(img, target / 'test' / 'healthy' / img.name)
    
    # Disease
    for img in disease_train:
        shutil.copy2(img, target / 'train' / 'disease' / img.name)
    for img in disease_val:
        shutil.copy2(img, target / 'val' / 'disease' / img.name)
    for img in disease_test:
        shutil.copy2(img, target / 'test' / 'disease' / img.name)
    
    logger.info(f"\n✅ Organisation terminée!")
    logger.info(f"📁 Dataset organisé dans: {target.absolute()}")
    
    # Afficher le résumé final
    logger.info("\n📊 RÉSUMÉ FINAL:")
    for split in ['train', 'val', 'test']:
        for class_name in ['healthy', 'disease']:
            count = len(list((target / split / class_name).glob("*.*")))
            logger.info(f"   {split}/{class_name}: {count} images")
    
    return target

def create_agricole_config():
    """Crée la configuration pour l'entraînement"""
    
    config = {
        "classes": ["healthy", "disease"],
        "num_classes": 2,
        "description": "Classification des maladies des plantes",
        "dataset": "PlantVillage",
        "total_images": 0
    }
    
    import json
    config_path = Path("data_agricole_real/config.json")
    with open(config_path, 'w') as f:
        json.dump(config, f, indent=2)
    
    logger.info(f"\n✅ Configuration sauvegardée: {config_path}")

if __name__ == "__main__":
    organize_plant_disease_dataset()
    create_agricole_config()
    
    logger.info("\n" + "=" * 60)
    logger.info("🎉 PRÉPARATION TERMINÉE!")
    logger.info("=" * 60)
    logger.info("\n🚀 Pour lancer l'entraînement avec les données réelles:")
    logger.info("   python scripts/train_cnn_agricole.py --data_dir data_agricole_real --epochs 30")