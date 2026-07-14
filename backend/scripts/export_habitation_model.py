# scripts/export_habitation_model.py
import torch
import onnx
from pathlib import Path
import sys

# Ajouter le chemin parent pour les imports
sys.path.append(str(Path(__file__).parent.parent))

from train_cnn_habitation import FireDamageCNN

def export_to_onnx(model_path, output_path="models/habitation_model.onnx"):
    """
    Exporte le modèle au format ONNX pour déploiement
    
    Args:
        model_path: Chemin du modèle PyTorch (.pth)
        output_path: Chemin de sortie pour le fichier ONNX
    
    Returns:
        str: Chemin du fichier exporté
    """
    device = torch.device('cpu')
    
    # Vérifier que le modèle existe
    if not Path(model_path).exists():
        raise FileNotFoundError(f"Modèle non trouvé: {model_path}")
    
    # Charger le checkpoint
    checkpoint = torch.load(model_path, map_location=device)
    class_names = checkpoint['class_names']
    num_classes = len(class_names)
    
    logger.info(f"📊 Chargement du modèle avec {num_classes} classes: {class_names}")
    
    # Créer le modèle
    model = FireDamageCNN(num_classes=num_classes, model_name='resnet50')
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    
    # Créer le dossier de sortie si nécessaire
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    # Exemple d'entrée
    dummy_input = torch.randn(1, 3, 224, 224)
    
    # Exporter vers ONNX
    torch.onnx.export(
        model, 
        dummy_input, 
        output_path,
        input_names=['input'], 
        output_names=['output'],
        dynamic_axes={
            'input': {0: 'batch_size'}, 
            'output': {0: 'batch_size'}
        },
        opset_version=11,
        do_constant_folding=True,
        verbose=False
    )
    
    logger.info(f"✅ Modèle exporté vers {output_path}")
    
    # Vérifier le modèle ONNX
    onnx_model = onnx.load(output_path)
    onnx.checker.check_model(onnx_model)
    logger.info("✅ Vérification ONNX réussie")
    
    # Afficher les infos du modèle
    logger.info(f"📊 Format: ONNX")
    logger.info(f"📊 Taille: {Path(output_path).stat().st_size / 1024 / 1024:.2f} MB")
    
    return output_path


def export_to_torchscript(model_path, output_path="models/habitation_model.pt"):
    """
    Exporte au format TorchScript
    
    Args:
        model_path: Chemin du modèle PyTorch (.pth)
        output_path: Chemin de sortie pour le fichier TorchScript
    
    Returns:
        str: Chemin du fichier exporté
    """
    device = torch.device('cpu')
    
    # Vérifier que le modèle existe
    if not Path(model_path).exists():
        raise FileNotFoundError(f"Modèle non trouvé: {model_path}")
    
    # Charger le checkpoint
    checkpoint = torch.load(model_path, map_location=device)
    class_names = checkpoint['class_names']
    num_classes = len(class_names)
    
    logger.info(f"📊 Chargement du modèle avec {num_classes} classes: {class_names}")
    
    # Créer le modèle
    model = FireDamageCNN(num_classes=num_classes, model_name='resnet50')
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    
    # Créer le dossier de sortie si nécessaire
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    # Exemple d'entrée
    example_input = torch.randn(1, 3, 224, 224)
    
    # Tracer le modèle
    with torch.no_grad():
        traced_model = torch.jit.trace(model, example_input)
    
    traced_model.save(output_path)
    
    logger.info(f"✅ Modèle TorchScript exporté vers {output_path}")
    logger.info(f"📊 Taille: {Path(output_path).stat().st_size / 1024 / 1024:.2f} MB")
    
    return output_path


def export_to_jit(model_path, output_path="models/habitation_model_jit.pt"):
    """
    Exporte au format JIT (script)
    
    Args:
        model_path: Chemin du modèle PyTorch (.pth)
        output_path: Chemin de sortie pour le fichier JIT
    
    Returns:
        str: Chemin du fichier exporté
    """
    device = torch.device('cpu')
    
    # Vérifier que le modèle existe
    if not Path(model_path).exists():
        raise FileNotFoundError(f"Modèle non trouvé: {model_path}")
    
    # Charger le checkpoint
    checkpoint = torch.load(model_path, map_location=device)
    class_names = checkpoint['class_names']
    num_classes = len(class_names)
    
    logger.info(f"📊 Chargement du modèle avec {num_classes} classes: {class_names}")
    
    # Créer le modèle
    model = FireDamageCNN(num_classes=num_classes, model_name='resnet50')
    model.load_state_dict(checkpoint['model_state_dict'])
    model.eval()
    
    # Créer le dossier de sortie si nécessaire
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    # Script le modèle
    scripted_model = torch.jit.script(model)
    scripted_model.save(output_path)
    
    logger.info(f"✅ Modèle JIT exporté vers {output_path}")
    logger.info(f"📊 Taille: {Path(output_path).stat().st_size / 1024 / 1024:.2f} MB")
    
    return output_path


def save_model_with_metadata(model_path, output_path="models/habitation_model_complete.pt"):
    """
    Sauvegarde le modèle avec ses métadonnées
    
    Args:
        model_path: Chemin du modèle PyTorch (.pth)
        output_path: Chemin de sortie pour le modèle complet
    
    Returns:
        str: Chemin du fichier exporté
    """
    device = torch.device('cpu')
    
    # Vérifier que le modèle existe
    if not Path(model_path).exists():
        raise FileNotFoundError(f"Modèle non trouvé: {model_path}")
    
    # Charger le checkpoint
    checkpoint = torch.load(model_path, map_location=device)
    
    # Ajouter des métadonnées
    checkpoint['model_info'] = {
        'version': '1.0.0',
        'date_export': str(Path(model_path).stat().st_mtime),
        'input_size': (224, 224),
        'mean': [0.485, 0.456, 0.406],
        'std': [0.229, 0.224, 0.225],
        'framework': 'PyTorch',
        'model_type': 'habitation_damage_detection'
    }
    
    # Créer le dossier de sortie si nécessaire
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    
    torch.save(checkpoint, output_path)
    
    logger.info(f"✅ Modèle complet exporté vers {output_path}")
    logger.info(f"📊 Taille: {Path(output_path).stat().st_size / 1024 / 1024:.2f} MB")
    logger.info(f"📊 Métadonnées incluses: {list(checkpoint['model_info'].keys())}")
    
    return output_path


def test_exported_model(model_path, format='onnx'):
    """
    Teste le modèle exporté avec une entrée aléatoire
    
    Args:
        model_path: Chemin du modèle exporté
        format: Format du modèle ('onnx', 'torchscript', 'jit')
    """
    import numpy as np
    
    if format == 'onnx':
        import onnxruntime as ort
        session = ort.InferenceSession(model_path)
        input_name = session.get_inputs()[0].name
        dummy_input = np.random.randn(1, 3, 224, 224).astype(np.float32)
        output = session.run(None, {input_name: dummy_input})
        logger.info(f"✅ Test ONNX réussi - Output shape: {output[0].shape}")
        
    elif format in ['torchscript', 'jit']:
        model = torch.jit.load(model_path)
        dummy_input = torch.randn(1, 3, 224, 224)
        with torch.no_grad():
            output = model(dummy_input)
        logger.info(f"✅ Test TorchScript réussi - Output shape: {output.shape}")
    
    return True


def export_all_formats(model_path, output_dir="models"):
    """
    Exporte le modèle dans tous les formats disponibles
    
    Args:
        model_path: Chemin du modèle PyTorch (.pth)
        output_dir: Dossier de sortie pour les exports
    """
    logger.info("="*60)
    logger.info("📦 EXPORT DU MODÈLE DANS TOUS LES FORMATS")
    logger.info("="*60)
    
    exports = {}
    
    # ONNX
    logger.info("\n1️⃣ Export ONNX...")
    exports['onnx'] = export_to_onnx(model_path, f"{output_dir}/habitation_model.onnx")
    
    # TorchScript (trace)
    logger.info("\n2️⃣ Export TorchScript (trace)...")
    exports['torchscript'] = export_to_torchscript(model_path, f"{output_dir}/habitation_model.pt")
    
    # JIT (script)
    logger.info("\n3️⃣ Export JIT (script)...")
    exports['jit'] = export_to_jit(model_path, f"{output_dir}/habitation_model_jit.pt")
    
    # Complet avec métadonnées
    logger.info("\n4️⃣ Export complet avec métadonnées...")
    exports['complete'] = save_model_with_metadata(model_path, f"{output_dir}/habitation_model_complete.pt")
    
    logger.info("\n" + "="*60)
    logger.info("✅ TOUS LES EXPORTS RÉUSSIS !")
    logger.info("="*60)
    logger.info("\n📁 Fichiers exportés:")
    for name, path in exports.items():
        logger.info(f"   - {name}: {path}")
    
    return exports


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Export du modèle habitation')
    parser.add_argument('--model', type=str, default='models/habitation_damage_cnn.pth', 
                        help='Chemin du modèle PyTorch (.pth)')
    parser.add_argument('--format', type=str, default='onnx', 
                        choices=['onnx', 'torchscript', 'jit', 'complete', 'all'],
                        help='Format d\'export')
    parser.add_argument('--output', type=str, default=None, 
                        help='Chemin de sortie (optionnel)')
    parser.add_argument('--test', action='store_true',
                        help='Tester le modèle après export')
    
    args = parser.parse_args()
    
    if args.format == 'all':
        output_dir = Path(args.output).parent if args.output else "models"
        export_all_formats(args.model, output_dir)
    else:
        if args.format == 'onnx':
            output = args.output or 'models/habitation_model.onnx'
            export_to_onnx(args.model, output)
        elif args.format == 'torchscript':
            output = args.output or 'models/habitation_model.pt'
            export_to_torchscript(args.model, output)
        elif args.format == 'jit':
            output = args.output or 'models/habitation_model_jit.pt'
            export_to_jit(args.model, output)
        elif args.format == 'complete':
            output = args.output or 'models/habitation_model_complete.pt'
            save_model_with_metadata(args.model, output)
        
        # Tester le modèle exporté
        if args.test and args.format != 'complete':
            test_exported_model(output, args.format)
    
    logger.info("\n🎉 Export terminé!")