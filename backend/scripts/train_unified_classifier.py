# scripts/train_unified_classifier.py
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

# Classes de sinistres
CLASSES = [
    'accident', 'habitation', 'agricole', 'sante', 'transport',
    'catastrophe', 'cyber', 'electronique', 'voyage', 'entreprise', 'animal'
]
NUM_CLASSES = len(CLASSES)

class UnifiedClaimDataset(Dataset):
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


class UnifiedClaimClassifier(nn.Module):
    def __init__(self, num_classes=NUM_CLASSES, model_name='efficientnet_b3'):
        super(UnifiedClaimClassifier, self).__init__()
        
        if model_name == 'resnet50':
            self.backbone = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)
            feat_dim = 2048
        elif model_name == 'efficientnet_b3':
            self.backbone = models.efficientnet_b3(weights=models.EfficientNet_B3_Weights.IMAGENET1K_V1)
            feat_dim = 1536
        elif model_name == 'convnext_base':
            self.backbone = models.convnext_base(weights=models.ConvNeXt_Base_Weights.IMAGENET1K_V1)
            feat_dim = 1024
        else:
            self.backbone = models.resnet50(weights=models.ResNet50_Weights.IMAGENET1K_V1)
            feat_dim = 2048
        
        # Tête de classification
        self.backbone.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(feat_dim, 512),
            nn.ReLU(),
            nn.BatchNorm1d(512),
            nn.Dropout(0.2),
            nn.Linear(512, 256),
            nn.ReLU(),
            nn.BatchNorm1d(256),
            nn.Dropout(0.15),
            nn.Linear(256, num_classes)
        )
    
    def forward(self, x):
        return self.backbone(x)


def train_unified_classifier(data_dir, epochs=50, batch_size=32, lr=0.001, model_name='efficientnet_b3'):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    logger.info(f"📱 Device: {device}")
    logger.info(f"📊 Modèle: {model_name}")
    logger.info(f"📚 Classes: {CLASSES}")
    logger.info("=" * 60)
    
    train_dir = Path(data_dir) / "train"
    val_dir = Path(data_dir) / "val"
    
    logger.info("\n📊 Distribution des données:")
    for class_name in CLASSES:
        train_count = len(list((train_dir / class_name).glob("*.*"))) if (train_dir / class_name).exists() else 0
        val_count = len(list((val_dir / class_name).glob("*.*"))) if (val_dir / class_name).exists() else 0
        logger.info(f"  {class_name}: Train={train_count}, Val={val_count}")
    
    # Transformations avec augmentation
    train_transform = transforms.Compose([
        transforms.Resize((380, 380)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(15),
        transforms.ColorJitter(brightness=0.2, contrast=0.2, saturation=0.2),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    val_transform = transforms.Compose([
        transforms.Resize((380, 380)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    train_dataset = UnifiedClaimDataset(train_dir, train_transform)
    val_dataset = UnifiedClaimDataset(val_dir, val_transform)
    
    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True, num_workers=4)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=4)
    
    model = UnifiedClaimClassifier(num_classes=NUM_CLASSES, model_name=model_name).to(device)
    
    # Pondération des classes pour gérer le déséquilibre
    class_counts = [len([1 for label in train_dataset.labels if label == i]) for i in range(NUM_CLASSES)]
    class_weights = [max(class_counts) / count if count > 0 else 1.0 for count in class_counts]
    class_weights = torch.tensor(class_weights).to(device)
    criterion = nn.CrossEntropyLoss(weight=class_weights)
    
    optimizer = optim.AdamW(model.parameters(), lr=lr, weight_decay=0.01)
    scheduler = optim.lr_scheduler.ReduceLROnPlateau(optimizer, mode='min', patience=5, factor=0.5)
    
    logger.info("\n🚀 Démarrage de l'entraînement...")
    logger.info("=" * 60)
    
    best_val_acc = 0
    history = {'train_loss': [], 'train_acc': [], 'val_loss': [], 'val_acc': []}
    
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
        
        scheduler.step(avg_val_loss)
        current_lr = optimizer.param_groups[0]['lr']
        
        history['train_loss'].append(avg_train_loss)
        history['train_acc'].append(train_acc)
        history['val_loss'].append(avg_val_loss)
        history['val_acc'].append(val_acc)
        
        logger.info(f"Epoch {epoch+1:3d}: LR={current_lr:.6f}, Train Loss={avg_train_loss:.4f}, Train Acc={train_acc:.2f}%, Val Loss={avg_val_loss:.4f}, Val Acc={val_acc:.2f}%")
        
        if val_acc > best_val_acc:
            best_val_acc = val_acc
            
            torch.save({
                'epoch': epoch,
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'val_acc': val_acc,
                'class_names': CLASSES,
                'model_name': model_name
            }, MODEL_DIR / "unified_claim_classifier.pth")
            
            logger.info(f"  💾 Meilleur modèle sauvegardé (Acc: {val_acc:.2f}%)")
    
    # Sauvegarder l'historique
    with open(MODEL_DIR / "unified_classifier_history.json", 'w') as f:
        json.dump(history, f, indent=2)
    
    # Afficher le rapport de classification
    from sklearn.metrics import classification_report
    logger.info("\n📊 Rapport de classification sur la validation:")
    logger.info(classification_report(val_labels_list, val_preds, target_names=CLASSES))
    
    logger.info("\n" + "=" * 60)
    logger.info(f"✅ Entraînement terminé!")
    logger.info(f"🎯 Meilleure accuracy: {best_val_acc:.2f}%")
    logger.info(f"📁 Modèle: {MODEL_DIR / 'unified_claim_classifier.pth'}")
    
    return model, history


def predict_claim_type(image_path, model_path=None):
    """Prédit le type de sinistre à partir d'une image"""
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    if model_path is None:
        model_path = MODEL_DIR / "unified_claim_classifier.pth"
    
    if not model_path.exists():
        logger.error(f"❌ Modèle non trouvé: {model_path}")
        return None
    
    checkpoint = torch.load(model_path, map_location=device)
    class_names = checkpoint['class_names']
    
    model = UnifiedClaimClassifier(num_classes=len(class_names))
    model.load_state_dict(checkpoint['model_state_dict'])
    model.to(device)
    model.eval()
    
    transform = transforms.Compose([
        transforms.Resize((380, 380)),
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
    
    # Top 3 prédictions
    top3_probs, top3_indices = torch.topk(probs, 3)
    top3 = [(class_names[idx], float(probs[0][idx])) for idx in top3_indices[0]]
    
    result = {
        'claim_type': predicted_class,
        'claim_type_id': predicted.item(),
        'confidence': confidence_score,
        'top3_predictions': top3,
        'all_probabilities': {class_names[i]: float(probs[0][i]) for i in range(len(class_names))},
        'need_expert': confidence_score < 70
    }
    
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Entraînement classificateur unifié')
    parser.add_argument('--data_dir', type=str, default='data_classification', help='Dossier des données')
    parser.add_argument('--epochs', type=int, default=50, help="Nombre d'époques")
    parser.add_argument('--batch_size', type=int, default=32, help='Taille du batch')
    parser.add_argument('--lr', type=float, default=0.001, help='Taux d\'apprentissage')
    parser.add_argument('--model', type=str, default='efficientnet_b3', 
                        choices=['resnet50', 'efficientnet_b3', 'convnext_base'])
    
    args = parser.parse_args()
    
    data_path = Path(args.data_dir)
    if not data_path.exists():
        logger.error(f"❌ Dossier {data_path} non trouvé!")
        logger.info("\nCréez la structure:")
        logger.info("data_classification/train/accident/")
        logger.info("data_classification/train/habitation/")
        logger.info("data_classification/train/agricole/")
        logger.info("data_classification/train/sante/")
        logger.info("data_classification/train/transport/")
        logger.info("data_classification/train/catastrophe/")
        logger.info("data_classification/train/cyber/")
        logger.info("data_classification/train/electronique/")
        logger.info("data_classification/train/voyage/")
        logger.info("data_classification/train/entreprise/")
        logger.info("data_classification/train/animal/")
        logger.info("data_classification/val/...")
        exit(1)
    
    model, history = train_unified_classifier(
        data_dir=data_path,
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        model_name=args.model
    )
    
    # Test de prédiction
    logger.info("\n🔮 Test de prédiction sur une image d'exemple:")
    # predict_claim_type("test_image.jpg")