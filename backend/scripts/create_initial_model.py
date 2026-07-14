# scripts/create_initial_model.py
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import torch
import numpy as np
from app.services.damage_ai_service import DamageCNN, PART_MAPPING, DAMAGE_CLASSES
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_initial_model():
    """Créer un modèle initial avec des poids aléatoires mais entraînés"""
    logger.info("🚀 Création du modèle initial...")
    
    # Créer le modèle
    model = DamageCNN(
        num_classes=len(DAMAGE_CLASSES),
        num_parts=len(PART_MAPPING)
    )
    
    # Mettre en mode entraînement
    model.train()
    
    # Générer des données synthétiques pour un pré-entraînement
    logger.info("📊 Pré-entraînement sur données synthétiques...")
    
    optimizer = torch.optim.Adam(model.parameters(), lr=0.001)
    criterion_class = torch.nn.CrossEntropyLoss()
    criterion_parts = torch.nn.BCEWithLogitsLoss()
    criterion_severity = torch.nn.MSELoss()
    criterion_bbox = torch.nn.SmoothL1Loss()
    
    # 100 itérations d'entraînement synthétique
    for epoch in range(20):
        # Données synthétiques
        batch_size = 8
        images = torch.randn(batch_size, 3, 224, 224)
        damage_labels = torch.randint(0, len(DAMAGE_CLASSES), (batch_size,))
        parts_labels = torch.randint(0, 2, (batch_size, len(PART_MAPPING))).float()
        severity_labels = torch.rand(batch_size, 1)
        bbox_labels = torch.rand(batch_size, 4)
        
        # Forward
        output = model(images)
        
        # Loss
        loss = (
            criterion_class(output['damage_class'], damage_labels) +
            criterion_parts(output['parts'], parts_labels) +
            criterion_severity(output['severity'], severity_labels) +
            criterion_bbox(output['bbox'], bbox_labels)
        )
        
        # Backward
        optimizer.zero_grad()
        loss.backward()
        optimizer.step()
        
        if epoch % 5 == 0:
            logger.info(f"Epoch {epoch}: Loss = {loss.item():.4f}")
    
    # Sauvegarder
    os.makedirs("models", exist_ok=True)
    torch.save(model.state_dict(), "models/damage_model.pth")
    logger.info("✅ Modèle initial sauvegardé dans models/damage_model.pth")
    
    # Vérifier le chargement
    from app.services.damage_ai_service import get_damage_service
    service = get_damage_service()
    if service.is_loaded:
        logger.info("✅ Service fonctionnel")
    else:
        logger.error("❌ Erreur chargement du service")

if __name__ == "__main__":
    create_initial_model()