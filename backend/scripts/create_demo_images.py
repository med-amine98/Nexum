# scripts/create_demo_images.py
from PIL import Image, ImageDraw
import random
from pathlib import Path

def create_demo_dataset(num_images=500):
    """Crée des images synthétiques pour tester le pipeline"""
    
    for split in ['train', 'val', 'test']:
        for class_name in ['normal', 'fire_damage']:
            class_dir = Path(f"data_wildfire/{split}/{class_name}")
            class_dir.mkdir(parents=True, exist_ok=True)
            
            for i in range(num_images):
                img = Image.new('RGB', (224, 224), color='white')
                draw = ImageDraw.Draw(img)
                
                if class_name == 'fire_damage':
                    # Simuler des dégâts
                    draw.rectangle([50, 50, 174, 174], fill=(255, 80, 80))
                    draw.rectangle([100, 100, 200, 200], fill=(200, 50, 50))
                    draw.text((10, 10), "FIRE DAMAGE", fill=(255, 0, 0))
                else:
                    # Image normale
                    draw.rectangle([50, 50, 174, 174], fill=(100, 200, 100))
                    draw.text((10, 10), "NORMAL", fill=(0, 255, 0))
                
                img.save(class_dir / f"sample_{i}.jpg")
    
    logger.info("✅ Dataset de démonstration créé!")

create_demo_dataset(500)