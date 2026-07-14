# scripts/train_cnn_model.py
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms, models
from PIL import Image
from pathlib import Path
import os
import json
from datetime import datetime

BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)

# Classes - seulement normal et severe pour commencer
CLASSES = ['normal', 'severe']

class DamageDataset(Dataset):
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

def train():
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info(f"📱 Device: {device}")
    logger.info("="*50)
    
    # Compter les images
    logger.info("\n📊 Distribution des données:")
    for class_name in CLASSES:
        train_count = len(list((DATA_DIR / "train" / class_name).glob("*.*"))) if (DATA_DIR / "train" / class_name).exists() else 0
        val_count = len(list((DATA_DIR / "val" / class_name).glob("*.*"))) if (DATA_DIR / "val" / class_name).exists() else 0
        logger.info(f"  {class_name}: Train={train_count}, Val={val_count}")
    
    # Transformations avec augmentation de données
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
    
    # Datasets
    train_dataset = DamageDataset(DATA_DIR / "train", train_transform)
    val_dataset = DamageDataset(DATA_DIR / "val", val_transform)
    
    train_loader = DataLoader(train_dataset, batch_size=32, shuffle=True, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=32, shuffle=False, num_workers=0)
    
    # Modèle ResNet18 pré-entraîné
    model = models.resnet18(weights=models.ResNet18_Weights.IMAGENET1K_V1)
    
    # Remplacer la dernière couche pour 2 classes
    num_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(num_features, 256),
        nn.ReLU(),
        nn.Dropout(0.2),
        nn.Linear(256, len(CLASSES))
    )
    model = model.to(device)
    
    # Loss et optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', patience=3, factor=0.5)
    
    logger.info("\n🚀 Démarrage de l'entraînement...")
    logger.info("="*50)
    
    best_val_acc = 0
    history = {'train_loss': [], 'train_acc': [], 'val_loss': [], 'val_acc': []}
    
    for epoch in range(30):
        # Training
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
        
        # Validation
        model.eval()
        val_loss = 0
        val_correct = 0
        val_total = 0
        val_preds = []
        val_labels_list = []
        
        with torch.no_grad():
            for images, labels in val_loader:
                images, labels = images.to(device), labels.to(device)
                outputs = model(images)
                loss = criterion(outputs, labels)
                
                val_loss += loss.item()
                _, predicted = torch.max(outputs, 1)
                val_total += labels.size(0)
                val_correct += (predicted == labels).sum().item()
                
                val_preds.extend(predicted.cpu().numpy())
                val_labels_list.extend(labels.cpu().numpy())
        
        val_acc = 100 * val_correct / val_total
        avg_val_loss = val_loss / len(val_loader)
        
        # Scheduler
        scheduler.step(avg_val_loss)
        
        # Enregistrer l'historique
        history['train_loss'].append(avg_train_loss)
        history['train_acc'].append(train_acc)
        history['val_loss'].append(avg_val_loss)
        history['val_acc'].append(val_acc)
        
        logger.info(f"Epoch {epoch+1:2d}: Train Loss={avg_train_loss:.4f}, Train Acc={train_acc:.2f}%, Val Loss={avg_val_loss:.4f}, Val Acc={val_acc:.2f}%")
        
        # Sauvegarder le meilleur modèle
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            
            # Sauvegarder le modèle
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_acc': val_acc,
                'class_names': CLASSES
            }, MODEL_DIR / "damage_cnn.pth")
            
            logger.info(f"  💾 Meilleur modèle sauvegardé (Acc: {val_acc:.2f}%)")
    
    # Sauvegarder l'historique
    with open(MODEL_DIR / "training_history.json", 'w') as f:
        json.dump(history, f, indent=2)
    
    logger.info("\n" + "="*50)
    logger.info(f"✅ Entraînement terminé!")
    logger.info(f"🎯 Meilleure accuracy de validation: {best_val_acc:.2f}%")
    logger.info(f"📁 Modèle sauvegardé: {MODEL_DIR / 'damage_cnn.pth'}")
    logger.info(f"📏 Taille: {os.path.getsize(MODEL_DIR / 'damage_cnn.pth') / 1024 / 1024:.2f} MB")
    
    return model, history

if __name__ == "__main__":
    model, history = train()