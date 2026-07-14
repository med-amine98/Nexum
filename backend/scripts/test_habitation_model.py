# scripts/test_habitation_model.py
import torch
import sys
from pathlib import Path
from PIL import Image
import json
from datetime import datetime

# Ajouter le chemin parent
sys.path.append(str(Path(__file__).parent.parent))

from train_cnn_habitation import predict_habitation

def test_single_image(image_path, model_path):
    """Teste une seule image"""
    logger.info(f"\n🔍 Analyse de: {Path(image_path).name}")
    logger.info("-" * 40)
    
    # Convertir en string si nécessaire
    result = predict_habitation(str(image_path), str(model_path))
    
    if result is None:
        logger.error("❌ Erreur lors de la prédiction")
        return None
    
    logger.info(f"📊 Classe prédite: {result['class']}")
    logger.info(f"🎯 Confiance: {result['confidence']:.2f}%")
    logger.info(f"📈 Probabilités:")
    for class_name, prob in result['probabilities'].items():
        logger.info(f"   - {class_name}: {prob:.2f}%")
    logger.info(f"💶 Estimation: {result['estimated_cost']}€")
    
    return result

def test_batch(model_path, test_dir):
    """Teste un dossier entier d'images"""
    results = []
    test_dir = Path(test_dir)
    
    if not test_dir.exists():
        logger.error(f"❌ Dossier non trouvé: {test_dir}")
        return results
    
    for img_path in test_dir.glob("*.*"):
        if img_path.suffix.lower() in ['.jpg', '.jpeg', '.png']:
            result = test_single_image(img_path, model_path)
            if result:
                results.append({
                    'image': str(img_path.name),
                    'predicted_class': result['class'],
                    'confidence': result['confidence'],
                    'probabilities': result['probabilities']
                })
    
    return results

def test_with_real_photos(model_path):
    """Test spécifique avec des photos réelles"""
    
    logger.info("\n" + "="*60)
    logger.info("📱 TEST AVEC PHOTOS RÉELLES")
    logger.info("="*60)
    
    real_dir = Path("test_images/real")
    if real_dir.exists():
        results = []
        for class_name in ['normal', 'fire_damage']:
            class_dir = real_dir / class_name
            if class_dir.exists():
                logger.info(f"\n📂 Test classe: {class_name}")
                class_results = test_batch(model_path, class_dir)
                results.extend(class_results)
        
        # Résumé
        logger.info("\n" + "="*60)
        logger.info("📊 RÉSUMÉ DES TESTS")
        logger.info("="*60)
        
        normal_count = sum(1 for r in results if r['predicted_class'] == 'normal')
        fire_count = sum(1 for r in results if r['predicted_class'] == 'fire_damage')
        
        logger.info(f"✅ Images normales détectées: {normal_count}")
        logger.info(f"🔥 Images feu détectées: {fire_count}")
        if len(results) > 0:
            logger.info(f"📊 Précision globale: {(normal_count + fire_count)/len(results)*100:.1f}%")
        
        return results
    else:
        logger.error("❌ Dossier test_images/real/ non trouvé")
        logger.info("   Créez-le avec: mkdir -p test_images/real/normal test_images/real/fire_damage")
        return []

def test_fake_images(model_path):
    """Test avec des images générées par IA (fraude potentielle)"""
    
    logger.info("\n" + "="*60)
    logger.info("🤖 TEST AVEC IMAGES GÉNÉRÉES PAR IA")
    logger.info("="*60)
    
    fake_dir = Path("test_images/fake")
    if fake_dir.exists():
        results = test_batch(model_path, fake_dir)
        
        logger.warning("\n⚠️ ALERTE FRAUDE POTENTIELLE:")
        for r in results:
            if r['confidence'] > 95:
                logger.info(f"   - {r['image']}: Confiance anormalement élevée ({r['confidence']:.1f}%)")
        
        return results
    else:
        logger.error("❌ Dossier test_images/fake/ non trouvé")
        return []

def generate_report(results, output_file="test_results/report.json"):
    """Génère un rapport de test"""
    
    # Créer le dossier si nécessaire
    Path(output_file).parent.mkdir(parents=True, exist_ok=True)
    
    report = {
        'date': datetime.now().isoformat(),
        'total_tests': len(results),
        'results': results
    }
    
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    logger.info(f"\n📄 Rapport sauvegardé: {output_file}")

if __name__ == "__main__":
    model_path = "models/habitation_damage_cnn.pth"
    
    logger.info("="*60)
    logger.info("🧪 TEST DU MODÈLE HABITATION")
    logger.info("="*60)
    
    # Vérifier que le modèle existe
    if not Path(model_path).exists():
        logger.error(f"❌ Modèle non trouvé: {model_path}")
        logger.info("   Lancez d'abord l'entraînement:")
        logger.info("   python scripts/train_cnn_habitation.py --data_dir data_wildfire")
        sys.exit(1)
    
    # 1. Test avec images du dataset de validation
    logger.info("\n📁 Test avec images du dataset de validation...")
    val_dir = Path("data_wildfire/val")
    if val_dir.exists():
        all_results = []
        for class_name in ['normal', 'fire_damage']:
            class_dir = val_dir / class_name
            if class_dir.exists():
                logger.info(f"\n📂 Test classe: {class_name}")
                class_results = test_batch(model_path, class_dir)
                all_results.extend(class_results)
        
        # Générer rapport
        if all_results:
            generate_report(all_results)
    else:
        logger.error("❌ Dataset de validation non trouvé")
        logger.info("   Structure attendue: data_wildfire/val/normal/ et data_wildfire/val/fire_damage/")
    
    # 2. Test avec photos réelles (optionnel - décommenter pour utiliser)
    # test_with_real_photos(model_path)
    
    # 3. Test avec images frauduleuses (optionnel - décommenter pour utiliser)
    # test_fake_images(model_path)
    
    logger.info("\n" + "="*60)
    logger.info("✅ TESTS TERMINÉS")
    logger.info("="*60)