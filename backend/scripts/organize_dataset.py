# scripts/organize_kaggle_dataset.py
import os
import shutil
import random
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
TEMP_DIR = BASE_DIR / "data" / "temp"
DATA_DIR = BASE_DIR / "data"

# Dossiers de destination
TRAIN_DIR = DATA_DIR / "train"
VAL_DIR = DATA_DIR / "val"
TEST_DIR = DATA_DIR / "test"

def explore_and_copy():
    """Explorer et copier les images du dataset Kaggle"""
    
    # Parcourir tout le dossier temp
    images_found = []
    
    for ext in ['*.jpg', '*.jpeg', '*.png', '*.JPG', '*.JPEG', '*.PNG']:
        for img_path in TEMP_DIR.rglob(ext):
            images_found.append(img_path)
            logger.info(f"📸 Trouvé: {img_path.name} dans {img_path.parent.name}")
    
    if not images_found:
        logger.error("\n❌ Aucune image trouvée!")
        logger.info("📌 Vérifions le contenu du dossier temp...")
        for item in TEMP_DIR.iterdir():
            logger.info(f"  - {item.name}")
        return
    
    logger.info(f"\n✅ Total images trouvées: {len(images_found)}")
    
    # Classifier les images basé sur le nom du dossier parent
    images_by_class = {
        'normal': [],
        'minor': [],
        'moderate': [],
        'severe': []
    }
    
    for img in images_found:
        parent = img.parent.name.lower()
        if 'normal' in parent or 'whole' in parent or 'undamaged' in parent:
            images_by_class['normal'].append(img)
        elif 'damage' in parent or '00-damage' in parent:
            images_by_class['severe'].append(img)
        elif 'minor' in parent:
            images_by_class['minor'].append(img)
        elif 'moderate' in parent:
            images_by_class['moderate'].append(img)
        else:
            # Par défaut
            images_by_class['normal'].append(img)
    
    # Afficher les statistiques
    for class_name, images in images_by_class.items():
        if images:
            logger.info(f"📊 {class_name}: {len(images)} images")
    
    # Créer les dossiers
    for split in ['train', 'val', 'test']:
        for class_name in images_by_class.keys():
            (DATA_DIR / split / class_name).mkdir(parents=True, exist_ok=True)
    
    # Split et copier
    for class_name, images in images_by_class.items():
        if not images:
            continue
        
        random.shuffle(images)
        total = len(images)
        train_count = int(total * 0.7)
        val_count = int(total * 0.15)
        
        train_images = images[:train_count]
        val_images = images[train_count:train_count + val_count]
        test_images = images[train_count + val_count:]
        
        for img in train_images:
            shutil.copy2(img, DATA_DIR / "train" / class_name / img.name)
        for img in val_images:
            shutil.copy2(img, DATA_DIR / "val" / class_name / img.name)
        for img in test_images:
            shutil.copy2(img, DATA_DIR / "test" / class_name / img.name)
        
        logger.info(f"\n✅ {class_name}:")
        logger.info(f"  Train: {len(train_images)}")
        logger.info(f"  Val: {len(val_images)}")
        logger.info(f"  Test: {len(test_images)}")

def main():
    logger.info("🚀 Organisation du dataset Kaggle")
    logger.info("="*50)
    
    if not TEMP_DIR.exists():
        logger.error(f"❌ Dossier {TEMP_DIR} non trouvé!")
        logger.info("📌 Exécutez d'abord le script de téléchargement")
        return
    
    explore_and_copy()
    
    logger.info("\n✅ Dataset organisé avec succès!")
    logger.info(f"📁 Train: {DATA_DIR / 'train'}")
    logger.info(f"📁 Val: {DATA_DIR / 'val'}")
    logger.info(f"📁 Test: {DATA_DIR / 'test'}")

if __name__ == "__main__":
    main()