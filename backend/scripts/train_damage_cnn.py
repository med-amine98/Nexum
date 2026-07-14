#!/usr/bin/env python
# backend/scripts/train_damage_cnn.py
"""
Script d'entraînement du modèle CNN pour la détection de dégâts
À exécuter sur une machine avec GPU (Google Colab ou serveur dédié)
"""

import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import DataLoader, Dataset
from torchvision import transforms, models
import os
from PIL import Image
import numpy as np
from sklearn.metrics import classification_report, confusion_matrix
import matplotlib.pyplot as plt
import seaborn as sns
from tqdm import tqdm
import json
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuration
class Config:
    # Chemins
    DATA_PATH = "data/"
    MODEL_SAVE_PATH = "models/damage_cnn.pth"
    LOGS_PATH = "logs/"
    
    # Hyperparamètres
    BATCH_SIZE = 32
    NUM_EPOCHS = 50
    LEARNING_RATE = 0.001
    NUM_CLASSES = 4
    CLASS_NAMES = ['normal', 'minor', 'moderate', 'severe']
    
    # Device
    DEVICE = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    # Augmentation des données
    IMG_SIZE = 224

class DamageDataset(Dataset):
    """Dataset personnalisé pour les images de dégâts"""
    
    def __init__(self, root_dir, transform=None, class_names=None):
        self.root_dir = root_dir
        self.transform = transform
        self.class_names = class_names or ['normal', 'minor', 'moderate', 'severe']
        self.class_to_idx = {cls: idx for idx, cls in enumerate(self.class_names)}
        
        self.images = []
        self.labels = []
        
        # Parcourir les dossiers
        for class_name in self.class_names:
            class_dir = os.path.join(root_dir, class_name)
            if os.path.exists(class_dir):
                for img_name in os.listdir(class_dir):
                    if img_name.lower().endswith(('.png', '.jpg', '.jpeg', '.bmp')):
                        self.images.append(os.path.join(class_dir, img_name))
                        self.labels.append(self.class_to_idx[class_name])
        
        logger.info(f"📁 Chargé {len(self.images)} images depuis {root_dir}")
    
    def __len__(self):
        return len(self.images)
    
    def __getitem__(self, idx):
        img_path = self.images[idx]
        label = self.labels[idx]
        
        try:
            image = Image.open(img_path).convert('RGB')
            if self.transform:
                image = self.transform(image)
            return image, label
        except Exception as e:
            logger.error(f"Erreur chargement {img_path}: {e}")
            # Retourner une image noire en cas d'erreur
            return torch.zeros(3, 224, 224), label

class DamageCNN(nn.Module):
    """Modèle CNN amélioré pour la détection de dégâts"""
    
    def __init__(self, num_classes=4, pretrained=True):
        super(DamageCNN, self).__init__()
        # Utiliser ResNet18 pré-entraîné (transfer learning)
        self.backbone = models.resnet18(weights='IMAGENET1K_V1' if pretrained else None)
        
        # Remplacer la dernière couche
        in_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(in_features, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, num_classes)
        )
    
    def forward(self, x):
        return self.backbone(x)

def get_transforms():
    """Définir les transformations pour l'entraînement et la validation"""
    
    train_transform = transforms.Compose([
        transforms.Resize((Config.IMG_SIZE, Config.IMG_SIZE)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((Config.IMG_SIZE, Config.IMG_SIZE)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    return train_transform, val_transform

def train_epoch(model, loader, criterion, optimizer, device):
    """Entraîner une époque"""
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    
    pbar = tqdm(loader, desc='Training')
    for inputs, labels in pbar:
        inputs, labels = inputs.to(device), labels.to(device)
        
        optimizer.zero_grad()
        outputs = model(inputs)
        loss = criterion(outputs, labels)
        loss.backward()
        optimizer.step()
        
        running_loss += loss.item()
        _, predicted = outputs.max(1)
        total += labels.size(0)
        correct += predicted.eq(labels).sum().item()
        
        pbar.set_postfix({'loss': loss.item(), 'acc': 100.*correct/total})
    
    epoch_loss = running_loss / len(loader)
    epoch_acc = 100. * correct / total
    
    return epoch_loss, epoch_acc

def validate_epoch(model, loader, criterion, device):
    """Valider une époque"""
    model.eval()
    running_loss = 0.0
    correct = 0
    total = 0
    all_preds = []
    all_labels = []
    
    with torch.no_grad():
        pbar = tqdm(loader, desc='Validation')
        for inputs, labels in pbar:
            inputs, labels = inputs.to(device), labels.to(device)
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            
            running_loss += loss.item()
            _, predicted = outputs.max(1)
            total += labels.size(0)
            correct += predicted.eq(labels).sum().item()
            
            all_preds.extend(predicted.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
    
    epoch_loss = running_loss / len(loader)
    epoch_acc = 100. * correct / total
    
    return epoch_loss, epoch_acc, all_preds, all_labels

def plot_training_history(history, save_path):
    """Visualiser l'historique d'entraînement"""
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 4))
    
    # Loss
    ax1.plot(history['train_loss'], label='Train Loss')
    ax1.plot(history['val_loss'], label='Val Loss')
    ax1.set_xlabel('Epoch')
    ax1.set_ylabel('Loss')
    ax1.set_title('Training and Validation Loss')
    ax1.legend()
    ax1.grid(True)
    
    # Accuracy
    ax2.plot(history['train_acc'], label='Train Acc')
    ax2.plot(history['val_acc'], label='Val Acc')
    ax2.set_xlabel('Epoch')
    ax2.set_ylabel('Accuracy (%)')
    ax2.set_title('Training and Validation Accuracy')
    ax2.legend()
    ax2.grid(True)
    
    plt.tight_layout()
    plt.savefig(save_path)
    plt.close()

def plot_confusion_matrix(y_true, y_pred, class_names, save_path):
    """Visualiser la matrice de confusion"""
    cm = confusion_matrix(y_true, y_pred)
    plt.figure(figsize=(10, 8))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', 
                xticklabels=class_names, yticklabels=class_names)
    plt.xlabel('Predicted')
    plt.ylabel('Actual')
    plt.title('Confusion Matrix')
    plt.tight_layout()
    plt.savefig(save_path)
    plt.close()

def main():
    """Fonction principale d'entraînement"""
    logger.info("🚀 Démarrage de l'entraînement du modèle CNN")
    logger.info(f"📱 Device: {Config.DEVICE}")
    
    # Créer les dossiers
    os.makedirs(Config.MODEL_SAVE_PATH.rsplit('/', 1)[0], exist_ok=True)
    os.makedirs(Config.LOGS_PATH, exist_ok=True)
    
    # Charger les données
    train_transform, val_transform = get_transforms()
    
    train_dataset = DamageDataset(
        os.path.join(Config.DATA_PATH, 'train'),
        transform=train_transform,
        class_names=Config.CLASS_NAMES
    )
    
    val_dataset = DamageDataset(
        os.path.join(Config.DATA_PATH, 'val'),
        transform=val_transform,
        class_names=Config.CLASS_NAMES
    )
    
    train_loader = DataLoader(train_dataset, batch_size=Config.BATCH_SIZE, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_dataset, batch_size=Config.BATCH_SIZE, shuffle=False, num_workers=4)
    
    logger.info(f"📊 Train samples: {len(train_dataset)}")
    logger.info(f"📊 Val samples: {len(val_dataset)}")
    
    # Initialiser le modèle
    model = DamageCNN(num_classes=Config.NUM_CLASSES, pretrained=True).to(Config.DEVICE)
    
    # Loss et optimizer
    criterion = nn.CrossEntropyLoss()
    optimizer = optim.Adam(model.parameters(), lr=Config.LEARNING_RATE)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', patience=5, factor=0.5)
    
    # Historique
    history = {
        'train_loss': [], 'train_acc': [],
        'val_loss': [], 'val_acc': []
    }
    
    best_val_acc = 0
    patience_counter = 0
    
    # Boucle d'entraînement
    for epoch in range(Config.NUM_EPOCHS):
        logger.info(f"\n{'='*50}")
        logger.info(f"Epoch {epoch+1}/{Config.NUM_EPOCHS}")
        
        # Train
        train_loss, train_acc = train_epoch(model, train_loader, criterion, optimizer, Config.DEVICE)
        history['train_loss'].append(train_loss)
        history['train_acc'].append(train_acc)
        
        # Validation
        val_loss, val_acc, val_preds, val_labels = validate_epoch(model, val_loader, criterion, Config.DEVICE)
        history['val_loss'].append(val_loss)
        history['val_acc'].append(val_acc)
        
        logger.info(f"📈 Train Loss: {train_loss:.4f}, Train Acc: {train_acc:.2f}%")
        logger.info(f"📈 Val Loss: {val_loss:.4f}, Val Acc: {val_acc:.2f}%")
        
        # Scheduler
        scheduler.step(val_loss)
        
        # Sauvegarder le meilleur modèle
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_acc': val_acc,
                'class_names': Config.CLASS_NAMES
            }, Config.MODEL_SAVE_PATH)
            logger.info(f"💾 Meilleur modèle sauvegardé (Acc: {val_acc:.2f}%)")
            patience_counter = 0
        else:
            patience_counter += 1
            if patience_counter >= 10:
                logger.info("⏹️ Early stopping")
                break
    
    # Visualisations
    plot_training_history(history, os.path.join(Config.LOGS_PATH, 'training_history.png'))
    plot_confusion_matrix(val_labels, val_preds, Config.CLASS_NAMES, 
                         os.path.join(Config.LOGS_PATH, 'confusion_matrix.png'))
    
    # Rapport de classification
    report = classification_report(val_labels, val_preds, target_names=Config.CLASS_NAMES)
    logger.info("\n📊 Classification Report:")
    logger.info(report)
    
    # Sauvegarder le rapport
    with open(os.path.join(Config.LOGS_PATH, 'classification_report.txt'), 'w') as f:
        f.write(report)
    
    logger.info(f"\n✅ Entraînement terminé!")
    logger.info(f"🎯 Meilleure accuracy de validation: {best_val_acc:.2f}%")
    logger.info(f"📁 Modèle sauvegardé: {Config.MODEL_SAVE_PATH}")

if __name__ == "__main__":
    main()