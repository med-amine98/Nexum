# scripts/train_cnn_habitation.py
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms, models
from PIL import Image
from pathlib import Path
import os
import json
import numpy as np

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)

CLASSES = ['normal', 'fire_damage']

class DamageDatasetHabitation(Dataset):
    def __init__(self, root_dir, transform=None):
        self.root_dir = root_dir
        self.transform = transform
        self.images = []
        self.labels = []
        
        for idx, class_name in enumerate(CLASSES):
            class_dir = root_dir / class_name
            if class_dir.exists():
                for img in class_dir.glob("*.*"):
                    if img.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                        self.images.append(img)
                        self.labels.append(idx)
        
        logger.info(f"✅ Chargé {len(self.images)} images depuis {root_dir}")
    
    def __len__(self):
        return len(self.images)
    
    def __getitem__(self, idx):
        img = Image.open(self.images[idx]).convert('RGB')
        label = self.labels[idx]
        if self.transform:
            img = self.transform(img)
        return img, label


class FireDamageCNN(nn.Module):
    def __init__(self, num_classes=2, model_name='resnet50'):
        super(FireDamageCNN, self).__init__()
        
        if model_name == 'resnet18':
            self.backbone = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)
            feat_dim = 512
        else:
            self.backbone = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)
            feat_dim = 2048
        
        self.backbone.fc = nn.Sequential(
            nn.Dropout(0.4),
            nn.Linear(feat_dim, 512),
            nn.ReLU(),
            nn.BatchNorm1d(512),
            nn.Dropout(0.3),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.BatchNorm1d(256),
            nn.Dropout(0.2),
            nn.Linear(256, num_classes)
        )
    
    def forward(self, x):
        return self.backbone(x)


def predict_habitation(image_path, model_path=None):
    """Prédiction sur une image d'habitation"""
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    if model_path is None:
        model_path = MODEL_DIR / "habitation_damage_cnn.pth"
    
    # Convertir en Path si c'est une chaîne
    if isinstance(model_path, str):
        model_path = Path(model_path)
    
    if not model_path.exists():
        logger.error(f"❌ Modèle non trouvé: {model_path}")
        return None
    
    # Charger le modèle
    checkpoint = torch.load(model_path, map_location=device)
    class_names = checkpoint.get('class_names', CLASSES)
    
    model = FireDamageCNN(num_classes=len(class_names))
    model.load_state_dict(checkpoint['model_state_dict'])
    model.to(device)
    model.eval()
    
    # Transformer l'image
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    image = Image.open(image_path).convert('RGB')
    image_tensor = transform(image).unsqueeze(0).to(device)
    
    with torch.no_grad():
        outputs = model(image_tensor)
        probs = torch.softmax(outputs, dim=1)
        confidence, predicted = torch.max(probs, 1)
    
    predicted_class = class_names[predicted.item()]
    confidence_score = confidence.item() * 100
    
    result = {
        'class': predicted_class,
        'confidence': confidence_score,
        'probabilities': {class_names[i]: float(probs[0][i]) for i in range(len(class_names))}
    }
    
    return result


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Entraînement CNN pour habitation')
    parser.add_argument('--data_dir', type=str, default='data_wildfire', help='Dossier des données')
    parser.add_argument('--epochs', type=int, default=50, help="Nombre d'époques")
    parser.add_argument('--batch_size', type=int, default=32, help='Taille du batch')
    
    args = parser.parse_args()
    
    logger.info("🚀 Lancez l'entraînement avec le script dédié")
    logger.info(f"   python scripts/train_cnn_habitation_full.py --data_dir {args.data_dir}")