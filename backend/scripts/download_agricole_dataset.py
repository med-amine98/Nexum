# scripts/download_agricole_dataset.py
import kagglehub
import shutil
from pathlib import Path
import os
import random
from sklearn.model_selection import train_test_split

def download_cow_disease_dataset():
    """Télécharge le dataset Lumpy Skin Disease Cow Images"""
    logger.info("=" * 60)
    logger.info("📥 TÉLÉCHARGEMENT DU DATASET COW DISEASE")
    logger.info("=" * 60)
    
    try:
        # Télécharger via kagglehub
        path = kagglehub.dataset_download("saurabhshahane/cow-disease-dataset")
        logger.info(f"✅ Dataset téléchargé: {path}")
        return Path(path)
    except Exception as e:
        logger.error(f"❌ Erreur: {e}")
        logger.info("   Téléchargement manuel: https://www.kaggle.com/datasets/saurabhshahane/cow-disease-dataset")
        return None

def download_plant_disease_dataset():
    """Télécharge le dataset PlantVillage"""
    logger.info("\n" + "=" * 60)
    logger.info("📥 TÉLÉCHARGEMENT DU DATASET PLANT DISEASE")
    logger.info("=" * 60)
    
    try:
        path = kagglehub.dataset_download("emmarex/plantdisease")
        logger.info(f"✅ Dataset téléchargé: {path}")
        return Path(path)
    except Exception as e:
        logger.error(f"❌ Erreur: {e}")
        return None

def create_synthetic_agricole_dataset(target_path="data_agricole", num_per_class=200):
    """Crée un dataset synthétique de dégâts agricoles"""
    from PIL import Image, ImageDraw
    
    logger.info("\n" + "=" * 60)
    logger.info("🌾 CRÉATION DU DATASET AGRICOLE SYNTHÉTIQUE")
    logger.info("=" * 60)
    
    target = Path(target_path)
    
    # Créer les dossiers
    for split in ['train', 'val', 'test']:
        for class_name in ['healthy', 'disease', 'natural_disaster']:
            (target / split / class_name).mkdir(parents=True, exist_ok=True)
    
    logger.info("🌱 Création des cultures saines (healthy)...")
    for i in range(num_per_class):
        img = Image.new('RGB', (224, 224), color=(34, 139, 34))
        draw = ImageDraw.Draw(img)
        draw.text((70, 100), "CULTURE SAINE", fill=(255, 255, 255))
        for split in ['train', 'val', 'test']:
            img.save(target / split / 'healthy' / f"healthy_{i}.jpg")
    
    logger.info("🦠 Création des cultures malades (disease)...")
    for i in range(num_per_class):
        img = Image.new('RGB', (224, 224), color=(139, 69, 19))
        draw = ImageDraw.Draw(img)
        if i % 3 == 0:
            draw.ellipse([50, 50, 174, 174], fill=(101, 67, 33))
            draw.text((60, 100), "TACHE", fill=(0, 0, 0))
        else:
            draw.rectangle([50, 50, 174, 174], fill=(101, 67, 33))
            draw.text((60, 100), "MALADIE", fill=(0, 0, 0))
        for split in ['train', 'val', 'test']:
            img.save(target / split / 'disease' / f"disease_{i}.jpg")
    
    logger.info("🌪️ Création des dégâts naturels (natural_disaster)...")
    for i in range(num_per_class):
        img = Image.new('RGB', (224, 224), color=(160, 160, 160))
        draw = ImageDraw.Draw(img)
        if i % 3 == 0:
            # Grêle
            for _ in range(30):
                x = random.randint(30, 194)
                y = random.randint(30, 194)
                draw.ellipse([x, y, x+10, y+10], fill=(200, 200, 255))
            draw.text((60, 100), "GRELE", fill=(0, 0, 0))
        elif i % 3 == 1:
            # Gel
            draw.rectangle([50, 50, 174, 174], fill=(173, 216, 230))
            draw.text((60, 100), "GEL", fill=(0, 0, 139))
        else:
            # Sécheresse
            draw.rectangle([50, 50, 174, 174], fill=(244, 164, 96))
            draw.text((50, 100), "SECHERESSE", fill=(0, 0, 0))
        for split in ['train', 'val', 'test']:
            img.save(target / split / 'natural_disaster' / f"disaster_{i}.jpg")
    
    logger.info(f"✅ Dataset agricole créé dans {target}")
    return target

if __name__ == "__main__":
    # Télécharger les datasets réels (optionnel)
    cow_path = download_cow_disease_dataset()
    plant_path = download_plant_disease_dataset()
    
    # Créer dataset synthétique
    agricole_path = create_synthetic_agricole_dataset()
    
    logger.info("\n🎉 Préparation terminée!")
    logger.info(f"📁 Dataset: {agricole_path}")