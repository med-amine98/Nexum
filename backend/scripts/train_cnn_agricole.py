# scripts/train_cnn_agricole.py
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms, models
from PIL import Image
from pathlib import Path
import json
import argparse

BASE_DIR = Path(__file__).parent.parent
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)

CLASSES = ['healthy', 'disease', 'natural_disaster']

class AgricoleDataset(Dataset):
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


class AgricoleCNN(nn.Module):
    def __init__(self, num_classes=3, model_name='resnet50'):
        super(AgricoleCNN, self).__init__()
        
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


def train_agricole(data_dir, epochs=50, batch_size=32, lr=0.001):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info(f"📱 Device: {device}")
    logger.info("=" * 50)
    
    train_dir = Path(data_dir) / "train"
    val_dir = Path(data_dir) / "val"
    
    logger.info("\n📊 Distribution des données:")
    for class_name in CLASSES:
        train_count = len(list((train_dir / class_name).glob("*.*"))) if (train_dir / class_name).exists() else 0
        val_count = len(list((val_dir / class_name).glob("*.*"))) if (val_dir / class_name).exists() else 0
        logger.info(f"  {class_name}: Train={train_count}, Val={val_count}")
    
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    train_dataset = AgricoleDataset(train_dir, train_transform)
    val_dataset = AgricoleDataset(val_dir, val_transform)
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0)
    
    model = AgricoleCNN(num_classes=len(CLASSES)).to(device)
    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', patience=5, factor=0.5)
    
    logger.info("\n🚀 Démarrage de l'entraînement...")
    logger.info("=" * 50)
    
    best_val_acc = 0
    
    for epoch in range(epochs):
        model.train()
        train_loss = 0
        train_correct = 0
        train_total = 0
        
        for images, labels in train_loader:
            images, labels = images.to(device), labels.to(device)
            optimizer.zero_grad()
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            train_loss += loss.item()
            _, predicted = torch.max(outputs, 1)
            train_total += labels.size(0)
            train_correct += (predicted == labels).sum().item()
        
        train_acc = 100 * train_correct / train_total
        avg_train_loss = train_loss / len(train_loader)
        
        model.eval()
        val_loss = 0
        val_correct = 0
        val_total = 0
        
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                val_loss += loss.item()
                _, predicted = torch.max(outputs, 1)
                val_total += labels.size(0)
                val_correct += (predicted == labels).sum().item()
        
        val_acc = 100 * val_correct / val_total
        avg_val_loss = val_loss / len(val_loader)
        
        scheduler.step(avg_val_loss)
        current_lr = optimizer.param_groups[0]['lr']
        
        logger.info(f"Epoch {epoch+1:3d}: LR={current_lr:.6f}, Train Loss={avg_train_loss:.4f}, Train Acc={train_acc:.2f}%, Val Loss={avg_val_loss:.4f}, Val Acc={val_acc:.2f}%")
        
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'val_acc': val_acc,
                'class_names': CLASSES
            }, MODEL_DIR / "agricole_damage_cnn.pth")
            logger.info(f"  💾 Meilleur modèle sauvegardé (Acc: {val_acc:.2f}%)")
    
    logger.info("\n" + "=" * 50)
    logger.info(f"✅ Entraînement terminé!")
    logger.info(f"🎯 Meilleure accuracy: {best_val_acc:.2f}%")
    logger.info(f"📁 Modèle: {MODEL_DIR / 'agricole_damage_cnn.pth'}")


def predict_agricole(image_path, model_path=None):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    if model_path is None:
        model_path = MODEL_DIR / "agricole_damage_cnn.pth"
    
    if not model_path.exists():
        logger.error(f"❌ Modèle non trouvé: {model_path}")
        return None
    
    checkpoint = torch.load(model_path, map_location=device)
    class_names = checkpoint['class_names']
    
    model = AgricoleCNN(num_classes=len(class_names))
    model.load_state_dict(checkpoint['model_state_dict'])
    model.to(device)
    model.eval()
    
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
    
    # Décision assurance
    decision_map = {
        'healthy': {
            'verdict': '✅ CULTURE/ANIMAL EN BONNE SANTÉ',
            'action': 'Aucune indemnisation',
            'estimated_cost': 0,
            'fraud_risk': 0
        },
        'disease': {
            'verdict': '⚠️ MALADIE DÉTECTÉE',
            'action': 'Expertise vétérinaire requise',
            'estimated_cost': 500,
            'fraud_risk': 25
        },
        'natural_disaster': {
            'verdict': '🌪️ DÉGÂTS CLIMATIQUES DÉTECTÉS',
            'action': 'Indemnisation sous réserve d\'expertise',
            'estimated_cost': 1500,
            'fraud_risk': 35
        }
    }
    
    decision = decision_map.get(predicted_class, decision_map['healthy'])
    
    result = {
        'class': predicted_class,
        'confidence': confidence_score,
        'verdict': decision['verdict'],
        'action': decision['action'],
        'estimated_cost': decision['estimated_cost'],
        'fraud_risk': decision['fraud_risk'],
        'recommendations': [
            "Consulter un vétérinaire/agronome",
            "Prendre des photos supplémentaires",
            "Conserver les échantillons"
        ] if predicted_class != 'healthy' else [
            "Aucune action requise",
            "Surveillance périodique recommandée"
        ],
        'probabilities': {class_names[i]: float(probs[0][i]) for i in range(len(class_names))}
    }
    
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--data_dir', type=str, default='data_agricole')
    parser.add_argument('--epochs', type=int, default=50)
    args = parser.parse_args()
    
    train_agricole(args.data_dir, args.epochs)