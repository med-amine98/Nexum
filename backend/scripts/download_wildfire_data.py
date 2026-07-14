# scripts/download_wildfire_data.py
import kagglehub
import pandas as pd
import requests
from pathlib import Path
import os
import random
from sklearn.model_selection import train_test_split
from PIL import Image
from io import BytesIO
import time

def download_and_prepare_wildfire_data():
    """
    Télécharge le dataset California Wildfire Damage et prépare les images
    """
    
    logger.info("="*60)
    logger.info("📥 TÉLÉCHARGEMENT DU DATASET CALIFORNIA WILDFIRE")
    logger.info("="*60)
    
    # Télécharger la dernière version du dataset
    logger.info("\n🔄 Téléchargement du CSV...")
    path = kagglehub.dataset_download("vivekattri/california-wildfire-damage-2014-feb2025")
    
    logger.info(f"✅ Dataset téléchargé: {path}")
    
    # Lire le CSV
    csv_path = Path(path) / "California Wildfire Damage.csv"
    df = pd.read_csv(csv_path)
    
    logger.info(f"\n📊 Aperçu du CSV:")
    logger.info(f"   - Colonnes: {list(df.columns)}")
    logger.info(f"   - Lignes: {len(df)}")
    logger.info(f"\n📋 Premières lignes:")
    logger.info(df.head())
    
    return Path(path), df

def download_images_from_urls(df, target_base_path="data_wildfire", max_images_per_class=1000):
    """
    Télécharge les images depuis les URLs dans le CSV
    """
    
    logger.info("\n" + "="*60)
    logger.info("📸 TÉLÉCHARGEMENT DES IMAGES")
    logger.info("="*60)
    
    target_path = Path(target_base_path)
    
    # Créer les dossiers
    for split in ['train', 'val', 'test']:
        for class_name in ['normal', 'fire_damage']:
            (target_path / split / class_name).mkdir(parents=True, exist_ok=True)
    
    # Identifier la colonne contenant les URLs et les labels
    url_column = None
    label_column = None
    
    for col in df.columns:
        col_lower = col.lower()
        if 'url' in col_lower or 'link' in col_lower or 'image' in col_lower:
            url_column = col
        if 'damage' in col_lower or 'label' in col_lower or 'class' in col_lower or 'status' in col_lower:
            label_column = col
    
    logger.info(f"🔍 Colonne URL détectée: {url_column}")
    logger.info(f"🔍 Colonne Label détectée: {label_column}")
    
    if url_column is None:
        logger.error("❌ Aucune colonne URL trouvée!")
        logger.info(f"Colonnes disponibles: {list(df.columns)}")
        return None
    
    # Séparer les données par classe
    fire_images = []
    normal_images = []
    
    for idx, row in df.iterrows():
        url = row[url_column]
        if pd.isna(url):
            continue
        
        # Déterminer la classe
        if label_column and not pd.isna(row[label_column]):
            label = str(row[label_column]).lower()
            if 'damage' in label or 'fire' in label or 'burn' in label or 'destroy' in label:
                fire_images.append(url)
            else:
                normal_images.append(url)
        else:
            # Si pas de label, essayer de déduire
            normal_images.append(url)
    
    logger.info(f"\n📊 URLs trouvées:")
    logger.info(f"   - Fire damage: {len(fire_images)} URLs")
    logger.info(f"   - Normal: {len(normal_images)} URLs")
    
    # Limiter le nombre d'images
    fire_images = fire_images[:max_images_per_class]
    normal_images = normal_images[:max_images_per_class]
    
    logger.info(f"\n⚖️ Après limitation: {len(fire_images)} fire, {len(normal_images)} normal")
    
    # Télécharger les images
    def download_image(url, save_path, retries=3):
        for attempt in range(retries):
            try:
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                response = requests.get(url, headers=headers, timeout=30)
                if response.status_code == 200:
                    img = Image.open(BytesIO(response.content))
                    img = img.convert('RGB')
                    img.save(save_path, 'JPEG', quality=85)
                    return True
            except Exception as e:
                logger.info(f"   Tentative {attempt+1} échouée: {str(e)[:50]}")
                time.sleep(1)
        return False
    
    # Split train/val/test
    fire_train, fire_temp = train_test_split(fire_images, test_size=0.3, random_state=42)
    fire_val, fire_test = train_test_split(fire_temp, test_size=0.5, random_state=42)
    
    normal_train, normal_temp = train_test_split(normal_images, test_size=0.3, random_state=42)
    normal_val, normal_test = train_test_split(normal_temp, test_size=0.5, random_state=42)
    
    # Télécharger les images
    logger.info("\n📥 Téléchargement des images (cela peut prendre du temps)...")
    
    splits = {
        'fire_damage': {
            'train': fire_train, 'val': fire_val, 'test': fire_test
        },
        'normal': {
            'train': normal_train, 'val': normal_val, 'test': normal_test
        }
    }
    
    for class_name, splits_dict in splits.items():
        for split_name, urls in splits_dict.items():
            target_dir = target_path / split_name / class_name
            logger.info(f"\n📁 Téléchargement {split_name}/{class_name}: {len(urls)} images")
            
            for i, url in enumerate(urls):
                if url and isinstance(url, str):
                    img_name = f"img_{i}_{hash(url) % 10000}.jpg"
                    img_path = target_dir / img_name
                    
                    if download_image(url, img_path):
                        if (i + 1) % 50 == 0:
                            logger.info(f"   ✅ {i+1}/{len(urls)} téléchargées")
    
    logger.info(f"\n✅ Téléchargement terminé!")
    return target_path

def create_sample_images_if_no_urls(target_path, num_samples=500):
    """
    Si aucune URL n'est trouvée, créer des images d'exemple pour tester
    """
    logger.info("\n" + "="*60)
    logger.info("🎨 CRÉATION D'IMAGES D'EXEMPLE")
    logger.info("="*60)
    
    from PIL import Image, ImageDraw
    
    for split in ['train', 'val', 'test']:
        for class_name in ['normal', 'fire_damage']:
            class_dir = target_path / split / class_name
            class_dir.mkdir(parents=True, exist_ok=True)
            
            for i in range(num_samples):
                # Créer une image synthétique
                img = Image.new('RGB', (224, 224), color='white')
                draw = ImageDraw.Draw(img)
                
                if class_name == 'fire_damage':
                    # Simuler des dégâts d'incendie
                    draw.rectangle([50, 50, 174, 174], fill=(255, 100, 100))
                    draw.rectangle([100, 100, 200, 200], fill=(200, 50, 50))
                    draw.text((10, 10), "FIRE DAMAGE", fill=(255, 0, 0))
                else:
                    # Image normale
                    draw.rectangle([50, 50, 174, 174], fill=(100, 200, 100))
                    draw.text((10, 10), "NORMAL", fill=(0, 255, 0))
                
                img.save(class_dir / f"sample_{i}.jpg")
            
            logger.info(f"✅ Créé {num_samples} images dans {split}/{class_name}")
    
    return target_path

def verify_dataset_structure(data_path):
    """Vérifie la structure du dataset"""
    logger.info("\n" + "="*60)
    logger.info("🔍 VÉRIFICATION DE LA STRUCTURE")
    logger.info("="*60)
    
    required_dirs = ['train', 'val', 'test']
    required_classes = ['normal', 'fire_damage']
    
    total_images = 0
    
    for dir_name in required_dirs:
        for class_name in required_classes:
            class_dir = Path(data_path) / dir_name / class_name
            if class_dir.exists():
                count = len(list(class_dir.glob("*.*")))
                total_images += count
                logger.info(f"✅ {dir_name}/{class_name}: {count} images")
            else:
                logger.error(f"❌ {dir_name}/{class_name}: manquant")
                class_dir.mkdir(parents=True, exist_ok=True)
    
    logger.info(f"\n📊 TOTAL: {total_images} images")
    return total_images

def create_data_yaml(data_path, output_path=None):
    """Crée le fichier data.yaml pour YOLO"""
    if output_path is None:
        output_path = Path(data_path) / "data.yaml"
    
    yaml_content = f"""
# Dataset path
path: {Path(data_path).absolute()}

# Train/val/test sets
train: images/train
val: images/val
test: images/test

# Number of classes
nc: 2

# Class names
names:
  0: normal
  1: fire_damage
"""
    
    with open(output_path, 'w') as f:
        f.write(yaml_content)
    
    logger.info(f"\n✅ Fichier data.yaml créé: {output_path}")
    return output_path

def create_training_script(data_path):
    """Crée un script d'entraînement personnalisé"""
    
    training_script = f'''
# scripts/train_wildfire_model.py
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from scripts.train_cnn_habitation import train_habitation

if __name__ == "__main__":
    model, history = train_habitation(
        data_dir="{data_path}",
        epochs=50,
        batch_size=32,
        lr=0.001,
        model_name='resnet50'
    )
'''
    
    script_path = Path("scripts/train_wildfire_model.py")
    script_path.parent.mkdir(exist_ok=True)
    with open(script_path, 'w') as f:
        f.write(training_script)
    
    logger.info(f"✅ Script d'entraînement créé: {script_path}")

if __name__ == "__main__":
    # 1. Télécharger le CSV
    dataset_path, df = download_and_prepare_wildfire_data()
    
    # 2. Essayer de télécharger les images depuis les URLs
    organized_path = download_images_from_urls(df, max_images_per_class=500)
    
    # 3. Si aucune image n'a été téléchargée, créer des images d'exemple
    if organized_path is None or verify_dataset_structure(organized_path) == 0:
        logger.warning("\n⚠️ Aucune image trouvée, création d'images d'exemple...")
        organized_path = Path("data_wildfire")
        create_sample_images_if_no_urls(organized_path, num_samples=300)
    
    # 4. Vérifier la structure finale
    verify_dataset_structure(organized_path)
    
    # 5. Créer data.yaml
    create_data_yaml(organized_path)
    
    # 6. Créer script d'entraînement
    create_training_script(organized_path)
    
    logger.info("\n" + "="*60)
    logger.info("🎉 PRÉPARATION TERMINÉE!")
    logger.info("="*60)
    logger.info("\n🚀 Pour lancer l'entraînement:")
    logger.info("   python scripts/train_wildfire_model.py")