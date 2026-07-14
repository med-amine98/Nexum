# backend/scripts/download_dataset.py
"""
Script pour télécharger le dataset Car Damage Detection depuis Kaggle
et organiser les fichiers pour l'entraînement
"""

import os
import shutil
import random
from pathlib import Path
import zipfile
import kagglehub

# Configuration
DATASET_NAME = "anujms/car-damage-detection"
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
TRAIN_DIR = DATA_DIR / "train"
VAL_DIR = DATA_DIR / "val"
TEST_DIR = DATA_DIR / "test"

# Classes
CLASSES = ['normal', 'minor', 'moderate', 'severe']

# Ratio de split (train/val/test)
TRAIN_RATIO = 0.7
VAL_RATIO = 0.15
TEST_RATIO = 0.15

def create_directories():
    """Créer la structure des dossiers"""
    for dir_path in [TRAIN_DIR, VAL_DIR, TEST_DIR]:
        for class_name in CLASSES:
            (dir_path / class_name).mkdir(parents=True, exist_ok=True)
    logger.info("✅ Dossiers créés")

def download_dataset():
    """Télécharger le dataset depuis Kaggle"""
    logger.info("📥 Téléchargement du dataset depuis Kaggle...")
    try:
        path = kagglehub.dataset_download(DATASET_NAME)
        logger.info(f"✅ Dataset téléchargé: {path}")
        return path
    except Exception as e:
        logger.error(f"❌ Erreur de téléchargement: {e}")
        return None

def extract_dataset(download_path, extract_to):
    """Extraire le dataset téléchargé"""
    logger.info(f"📂 Extraction du dataset vers {extract_to}...")
    
    # Chercher les fichiers zip
    for file in Path(download_path).glob("*.zip"):
        with zipfile.ZipFile(file, 'r') as zip_ref:
            zip_ref.extractall(extract_to)
        logger.info(f"✅ Fichier extrait: {file.name}")
        return True
    
    # Si pas de zip, copier directement
    for file in Path(download_path).glob("*"):
        if file.is_file():
            shutil.copy(file, extract_to / file.name)
        elif file.is_dir():
            shutil.copytree(file, extract_to / file.name, dirs_exist_ok=True)
    
    logger.info(f"✅ Dataset copié vers {extract_to}")
    return True

def organize_dataset(source_dir):
    """Organiser les images dans la structure train/val/test"""
    logger.info("📋 Organisation du dataset...")
    
    # Parcourir les classes
    for class_name in CLASSES:
        # Chercher les images de cette classe
        class_source = source_dir / class_name
        if not class_source.exists():
            # Chercher dans d'autres structures possibles
            for subdir in source_dir.iterdir():
                if subdir.is_dir():
                    potential = subdir / class_name
                    if potential.exists():
                        class_source = potential
                        break
        
        if not class_source.exists():
            logger.warning(f"⚠️ Dossier non trouvé pour la classe: {class_name}")
            continue
        
        # Lister toutes les images
        images = []
        for ext in ['*.jpg', '*.jpeg', '*.png', '*.JPG', '*.JPEG', '*.PNG']:
            images.extend(list(class_source.glob(ext)))
        
        logger.info(f"📊 {class_name}: {len(images)} images trouvées")
        
        # Mélanger les images
        random.shuffle(images)
        
        # Split
        total = len(images)
        train_count = int(total * TRAIN_RATIO)
        val_count = int(total * VAL_RATIO)
        
        train_images = images[:train_count]
        val_images = images[train_count:train_count + val_count]
        test_images = images[train_count + val_count:]
        
        # Copier les images
        for img in train_images:
            shutil.copy(img, TRAIN_DIR / class_name / img.name)
        for img in val_images:
            shutil.copy(img, VAL_DIR / class_name / img.name)
        for img in test_images:
            shutil.copy(img, TEST_DIR / class_name / img.name)
        
        logger.info(f"  - Train: {len(train_images)}")
        logger.info(f"  - Val: {len(val_images)}")
        logger.info(f"  - Test: {len(test_images)}")
    
    logger.info("✅ Organisation terminée")

def verify_dataset():
    """Vérifier le dataset après organisation"""
    logger.info("\n📊 Vérification du dataset:")
    logger.info("="*50)
    
    for split_name, split_dir in [("Train", TRAIN_DIR), ("Validation", VAL_DIR), ("Test", TEST_DIR)]:
        logger.info(f"\n{split_name}:")
        total = 0
        for class_name in CLASSES:
            class_dir = split_dir / class_name
            if class_dir.exists():
                count = len(list(class_dir.glob("*.*")))
                total += count
                logger.info(f"  - {class_name}: {count} images")
        logger.info(f"  Total: {total} images")

def main():
    logger.info("🚀 Démarrage du téléchargement et de la préparation du dataset")
    logger.info("="*50)
    
    # Créer les dossiers
    create_directories()
    
    # Télécharger le dataset
    download_path = download_dataset()
    if not download_path:
        logger.error("❌ Impossible de télécharger le dataset")
        return
    
    # Extraire dans un dossier temporaire
    temp_dir = DATA_DIR / "temp"
    temp_dir.mkdir(exist_ok=True)
    
    if extract_dataset(download_path, temp_dir):
        # Organiser les fichiers
        organize_dataset(temp_dir)
        
        # Vérifier le résultat
        verify_dataset()
        
        # Nettoyer les fichiers temporaires
        shutil.rmtree(temp_dir)
        logger.info("\n✅ Dataset prêt pour l'entraînement!")
    else:
        logger.error("❌ Erreur lors de l'extraction du dataset")

if __name__ == "__main__":
    main()