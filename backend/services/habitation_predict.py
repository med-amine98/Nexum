# app/services/habitation_predict.py
from fastapi import FastAPI, UploadFile, File
import torch
from PIL import Image
import io
import numpy as np
import logging
import os

logger = logging.getLogger(__name__)

app = FastAPI()

class HabitationDamagePredictor:
    def __init__(self, model_path="models/habitation_damage_cnn.pth"):
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model = None
        self.class_names = ['normal', 'fire_damage']
        if os.path.exists(model_path):
            self.load_model(model_path)
        else:
            logger.warning(f"⚠️ Modèle non trouvé: {model_path}, mode simulation activé")
    
    def load_model(self, model_path):
        try:
            checkpoint = torch.load(model_path, map_location=self.device)
            self.class_names = checkpoint['class_names']
            
            from scripts.train_cnn_habitation import FireDamageCNN
            self.model = FireDamageCNN(num_classes=len(self.class_names))
            self.model.load_state_dict(checkpoint['model_state_dict'])
            self.model.to(self.device)
            self.model.eval()
            
            logger.info(f"✅ Modèle chargé: {self.class_names}")
        except Exception as e:
            logger.error(f"❌ Erreur chargement modèle habitation: {e}")
            self.model = None
    
    def predict(self, image_bytes):
        # Prétraitement
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        image = image.resize((224, 224))
        
        # Transformation
        from torchvision import transforms
        transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])
        
        image_tensor = transform(image).unsqueeze(0).to(self.device)
        
        # Prédiction
        with torch.no_grad():
            outputs = self.model(image_tensor)
            probs = torch.softmax(outputs, dim=1)
            confidence, predicted = torch.max(probs, 1)
        
        return {
            'class': self.class_names[predicted.item()],
            'confidence': confidence.item() * 100,
            'probabilities': {
                self.class_names[i]: float(probs[0][i]) for i in range(len(self.class_names))
            }
        }

predictor = HabitationDamagePredictor()

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    image_bytes = await file.read()
    result = predictor.predict(image_bytes)
    
    # Décision assurance
    if result['class'] == 'fire_damage' and result['confidence'] > 80:
        verdict = "SINISTRE INCENDIE CONFIRMÉ"
        action = "Expertise requise"
        estimated_cost = 5000
    elif result['class'] == 'fire_damage':
        verdict = "SUSPICION DE SINISTRE"
        action = "Vérification recommandée"
        estimated_cost = 2500
    else:
        verdict = "PAS DE SINISTRE DÉTECTÉ"
        action = "Aucune action"
        estimated_cost = 0
    
    return {
        **result,
        'verdict': verdict,
        'action': action,
        'estimated_cost': estimated_cost
    }