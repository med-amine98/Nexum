# scripts/organize_wildfire_data.py
import shutil
from pathlib import Path

# Chemins
source_dir = Path("chemin/vers/zenodo_dataset")  # À modifier
target_dir = Path("data_wildfire")

# Créer les dossiers
for split in ['train', 'val', 'test']:
    for cls in ['normal', 'fire_damage']:
        (target_dir / split / cls).mkdir(parents=True, exist_ok=True)

# Copier les images selon leurs labels
# Adaptez selon la structure exacte du dataset téléchargé
for img_path in source_dir.glob("**/*.jpg"):
    # Exemple: si le nom contient "NoDamage" ou "Affected" → normal
    if "NoDamage" in img_path.name or "Affected" in img_path.name:
        shutil.copy(img_path, target_dir / "train" / "normal" / img_path.name)
    # Sinon → fire_damage
    else:
        shutil.copy(img_path, target_dir / "train" / "fire_damage" / img_path.name)

logger.info("✅ Organisation terminée!")