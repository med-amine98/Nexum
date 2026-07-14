#!/usr/bin/env python
# backend/scripts/export_model.py
"""
Exporter le modèle pour la production (format optimisé)
"""

import torch
import onnx
from train_damage_cnn import DamageCNN, Config

def export_to_onnx(model_path, output_path, input_size=(3, 224, 224)):
    """Exporter le modèle au format ONNX pour une inference plus rapide"""
    device = torch.device('cpu')
    
    # Charger le modèle
    model = DamageCNN(num_classes=4).to(device)
    checkpoint = torch.load(model_path, map_location=device)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    
    # Exemple d'entrée
    dummy_input = torch.randn(1, *input_size).to(device)
    
    # Exporter
    torch.onnx.export(
        model,
        dummy_input,
        output_path,
        export_params=True,
        opset_version=11,
        do_constant_folding=True,
        input_names=['input'],
        output_names=['output'],
        dynamic_axes={'input': {0: 'batch_size'}, 'output': {0: 'batch_size'}}
    )
    
    logger.info(f"✅ Modèle exporté en ONNX: {output_path}")
    
    # Vérifier le modèle ONNX
    onnx_model = onnx.load(output_path)
    onnx.checker.check_model(onnx_model)
    logger.info("✅ Vérification ONNX réussie")

def export_to_script(model_path, output_path):
    """Exporter au format TorchScript pour production"""
    device = torch.device('cpu')
    
    model = DamageCNN(num_classes=4).to(device)
    checkpoint = torch.load(model_path, map_location=device)
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    
    # Exporter en TorchScript
    example_input = torch.randn(1, 3, 224, 224)
    traced_script_module = torch.jit.trace(model, example_input)
    traced_script_module.save(output_path)
    
    logger.info(f"✅ Modèle exporté en TorchScript: {output_path}")

if __name__ == "__main__":
    model_path = "models/damage_cnn.pth"
    
    # Exporter en ONNX
    export_to_onnx(model_path, "models/damage_cnn.onnx")
    
    # Exporter en TorchScript
    export_to_script(model_path, "models/damage_cnn.pt")