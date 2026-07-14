import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms, models
from PIL import Image
from pathlib import Path
import os
import json
import argparse

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
        for idx, class_name in enumerate(CLASSES):
            count = len([1 for label in self.labels if label == idx])
            logger.info(f"   - {class_name}: {count} images")
    
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

def train_habitation(data_dir, epochs=50, batch_size=32, lr=0.001):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info(f"📱 Device: {device}")
    logger.info("="*50)
    
    train_dir = Path(data_dir) / "train"
    val_dir = Path(data_dir) / "val"
    
    # Vérifier les dossiers
    logger.info("\n📊 Distribution des données:")
    for class_name in CLASSES:
        train_count = len(list((train_dir / class_name).glob("*.*"))) if (train_dir / class_name).exists() else 0
        val_count = len(list((val_dir / class_name).glob("*.*"))) if (val_dir / class_name).exists() else 0
        logger.info(f"  {class_name}: Train={train_count}, Val={val_count}")
    
    train_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomVerticalFlip(p=0.2),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.3, contrast=0.3, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    train_dataset = DamageDatasetHabitation(train_dir, train_transform)
    val_dataset = DamageDatasetHabitation(val_dir, val_transform)
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0)
    
    model = FireDamageCNN(num_classes=len(CLASSES)).to(device)
    
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=lr)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', patience=5, factor=0.5)
    
    logger.info("\n🚀 Démarrage de l'entraînement...")
    logger.info("="*50)
    
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
            }, MODEL_DIR / "habitation_damage_cnn.pth")
            logger.info(f"  💾 Meilleur modèle sauvegardé (Acc: {val_acc:.2f}%)")
    
    logger.info("\n" + "="*50)
    logger.info(f"✅ Entraînement terminé!")
    logger.info(f"🎯 Meilleure accuracy: {best_val_acc:.2f}%")
    logger.info(f"📁 Modèle: {MODEL_DIR / 'habitation_damage_cnn.pth'}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument('--data_dir', type=str, default='data_wildfire')
    parser.add_argument('--epochs', type=int, default=50)
    parser.add_argument('--batch_size', type=int, default=32)
    parser.add_argument('--lr', type=float, default=0.001)
    args = parser.parse_args()
    
    train_habitation(args.data_dir, args.epochs, args.batch_size, args.lr)