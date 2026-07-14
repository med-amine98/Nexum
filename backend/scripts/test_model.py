# scripts/test_model.py
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
from pathlib import Path
import sys

BASE_DIR = Path(__file__).parent.parent
MODEL_DIR = BASE_DIR / "models"

def load_model():
    """Charger le modèle entraîné"""
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    
    # Créer le modèle avec la même architecture
    model = models.resnet18(weights=None)
    num_features = model.fc.in_features
    model.fc = nn.Sequential(
        nn.Dropout(0.3),
        nn.Linear(num_features, 256),
        nn.ReLU(),
        nn.Dropout(0.2),
        nn.Linear(256, 2)  # 2 classes: normal, severe
    )
    
    # Charger les poids
    checkpoint = torch.load(MODEL_DIR / "damage_cnn.pth", map_location=device)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.to(device)
    model.eval()
    
    logger.info(f"✅ Modèle chargé depuis {MODEL_DIR / 'damage_cnn.pth'}")
    logger.info(f"📊 Accuracy du modèle: {checkpoint.get('val_acc', 'N/A')}%")
    
    return model, device

def predict_image(model, device, image_path):
    """Prédire la classe d'une image"""
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])
    
    image = Image.open(image_path).convert('RGB')
    image_tensor = transform(image).unsqueeze(0).to(device)
    
    with torch.no_grad():
        outputs = model(image_tensor)
        probabilities = torch.softmax(outputs, dim=1)
        confidence, predicted = torch.max(probabilities, 1)
    
    classes = ['normal', 'severe']
    result = classes[predicted.item()]
    confidence_score = confidence.item() * 100
    
    return result, confidence_score

if __name__ == "__main__":
    if len(sys.argv) < 2:
        logger.info("Usage: python test_model.py <chemin_image>")
        sys.exit(1)
    
    image_path = sys.argv[1]
    
    if not Path(image_path).exists():
        logger.error(f"❌ Image non trouvée: {image_path}")
        sys.exit(1)
    
    model, device = load_model()
    result, confidence = predict_image(model, device, image_path)
    
    logger.info(f"\n📸 Image: {image_path}")
    logger.info(f"🎯 Prédiction: {result}")
    logger.info(f"📊 Confiance: {confidence:.2f}%")
    
    if result == 'severe':
        logger.warning("⚠️ Des dégâts ont été détectés sur ce véhicule!")
    else:
        logger.info("✅ Aucun dégât détecté - Véhicule en bon état")