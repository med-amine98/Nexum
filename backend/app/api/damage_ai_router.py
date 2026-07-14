# app/api/damage_ai_router.py
from fastapi import APIRouter, UploadFile, File, Depends, Form, WebSocket, WebSocketDisconnect
from typing import Dict, Any, List, Optional
import cv2
import numpy as np
from PIL import Image
import io
import logging
import json
import random
import base64
from datetime import datetime

from app.services.damage_ai_pretrained import get_damage_service, get_cost_service
from app.services.damage_yolo_service import YoloDamageDetector
from app.core.dependencies import get_current_user
from app.models.auth import User

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/damage-ai", tags=["Damage AI"])

# Initialisation YOLO
yolo_detector = None

def get_yolo_detector():
    global yolo_detector
    if yolo_detector is None:
        yolo_detector = YoloDamageDetector()
    return yolo_detector


# ============================================
# FONCTIONS UTILITAIRES
# ============================================

def generate_recommendation(detected_parts: List[Dict], severity: float) -> Dict[str, Any]:
    """
    Générer une recommandation basée sur les pièces détectées
    """
    if not detected_parts:
        return {
            'priority': 'low',
            'message': '✅ Aucun dommage détecté',
            'estimated_days': 0,
            'action_items': []
        }
    
    # Classer les pièces par sévérité
    critical = [p for p in detected_parts if p.get('severity', 0) > 0.7]
    moderate = [p for p in detected_parts if 0.3 < p.get('severity', 0) <= 0.7]
    minor = [p for p in detected_parts if p.get('severity', 0) <= 0.3]
    
    # Déterminer la priorité
    if severity > 0.7 or len(critical) > 2:
        priority = 'critical'
        message = f'🚨 Dommages critiques détectés sur {len(critical)} pièces. Intervention immédiate requise.'
        estimated_days = len(critical) * 2 + len(moderate) * 1 + len(minor) * 0.5
    elif severity > 0.4 or len(moderate) > 3:
        priority = 'high'
        message = f'⚠️ Dommages significatifs sur {len(moderate)} pièces. Réparation recommandée rapidement.'
        estimated_days = len(moderate) * 1.5 + len(minor) * 0.5
    elif severity > 0.2 or len(moderate) > 0:
        priority = 'medium'
        message = f'📋 Dommages modérés sur {len(moderate)} pièces. Planifiez une réparation dans les prochains jours.'
        estimated_days = len(moderate) + len(minor) * 0.3
    else:
        priority = 'low'
        message = '✅ Dommages mineurs. Réparation esthétique recommandée.'
        estimated_days = len(minor) * 0.5
    
    # Générer les actions
    action_items = []
    
    for p in critical[:5]:
        action_items.append({
            'part': p.get('part_name', 'Pièce'),
            'action': 'Remplacer en urgence' if not p.get('repairable', True) else 'Réparer en urgence',
            'priority': 'high',
            'severity': p.get('severity', 0)
        })
    
    for p in moderate[:3]:
        action_items.append({
            'part': p.get('part_name', 'Pièce'),
            'action': 'Remplacer' if not p.get('repairable', True) else 'Réparer',
            'priority': 'medium',
            'severity': p.get('severity', 0)
        })
    
    for p in minor[:2]:
        action_items.append({
            'part': p.get('part_name', 'Pièce'),
            'action': 'Retoucher',
            'priority': 'low',
            'severity': p.get('severity', 0)
        })
    
    return {
        'priority': priority,
        'message': message,
        'estimated_days': round(max(0.5, estimated_days), 1),
        'critical_count': len(critical),
        'moderate_count': len(moderate),
        'minor_count': len(minor),
        'action_items': action_items[:10]
    }


def generate_annotated_image(image_np: np.ndarray, result: Dict) -> Optional[str]:
    """
    Génère une image annotée avec les bounding boxes
    """
    try:
        annotated = image_np.copy()
        detected_parts = result.get('detected_parts', [])
        
        for part in detected_parts:
            bbox = part.get('bbox', [0, 0, 0, 0])
            if len(bbox) == 4:
                x1, y1, x2, y2 = [int(b) for b in bbox]
                cv2.rectangle(annotated, (x1, y1), (x2, y2), (0, 255, 0), 2)
                label = f"{part.get('part_name', 'Inconnu')} ({part.get('confidence', 0):.2f})"
                cv2.putText(annotated, label, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
        
        _, buffer = cv2.imencode('.jpg', annotated)
        return base64.b64encode(buffer).decode('utf-8')
    except Exception as e:
        logger.error(f"❌ Erreur annotation: {e}")
        return None


# ============================================
# ENDPOINTS PUBLICS
# ============================================

@router.post("/upload-and-analyze-public")
async def upload_and_analyze_public(
    file: UploadFile = File(...)
) -> Dict[str, Any]:
    """
    Analyser une image avec le modèle Vit-BEiT pré-entraîné (version publique)
    """
    try:
        if not file.content_type.startswith('image/'):
            return {'success': False, 'error': 'Le fichier doit être une image'}
        
        contents = await file.read()
        if len(contents) > 20 * 1024 * 1024:
            return {'success': False, 'error': 'L\'image ne doit pas dépasser 20MB'}
        
        try:
            image = Image.open(io.BytesIO(contents))
            if image.mode != 'RGB':
                image = image.convert('RGB')
            image_np = np.array(image)
            image_np = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
        except Exception as e:
            logger.error(f"❌ Erreur conversion: {e}")
            return {'success': False, 'error': 'Format d\'image invalide'}
        
        damage_service = get_damage_service()
        result = damage_service.analyze_image(image_np)
        
        if not result.get('success'):
            return {
                'success': False,
                'error': result.get('error', 'Erreur analyse'),
                'fallback': result.get('fallback', True)
            }
        
        detected_parts = result.get('detected_parts', [])
        severity = result.get('severity', 0)
        confidence = result.get('confidence', 0)
        
        cost_service = get_cost_service()
        cost_estimate = cost_service.estimate_cost(detected_parts)
        recommendation = generate_recommendation(detected_parts, severity)
        
        return {
            'success': True,
            'damage_class': result.get('damage_class', 'unknown'),
            'damage_name': result.get('damage_name', 'Inconnu'),
            'model_label': result.get('model_label', ''),
            'confidence': confidence,
            'severity': severity,
            'detected_parts': detected_parts,
            'all_probabilities': result.get('all_probabilities', {}),
            'bbox': result.get('bbox', [0, 0, 0, 0]),
            'cost_estimate': cost_estimate,
            'recommendation': recommendation,
            'analysis_time': result.get('analysis_time', datetime.now().isoformat()),
            'model': result.get('model', 'vit_beit_pretrained'),
            'model_name': result.get('model_name', 'beingamit99/car_damage_detection'),
            'is_fallback': result.get('fallback', False),
            'metadata': {
                'filename': file.filename,
                'content_type': file.content_type,
                'size': len(contents),
                'timestamp': datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"❌ Erreur: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


@router.post("/upload-and-analyze-yolo")
async def upload_and_analyze_yolo(
    file: UploadFile = File(...)
) -> Dict[str, Any]:
    """
    Analyser une image avec YOLO (meilleure précision)
    """
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        image_np = np.array(image)
        image_np = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
        
        detector = get_yolo_detector()
        result = detector.analyze_image(image_np)
        
        if not result.get('success'):
            return {
                'success': False,
                'error': result.get('error', 'Erreur analyse YOLO'),
                'fallback': result.get('fallback', True)
            }
        
        detected_parts = result.get('detected_parts', [])
        cost_service = get_cost_service()
        cost_estimate = cost_service.estimate_cost(detected_parts)
        recommendation = generate_recommendation(detected_parts, result.get('severity', 0))
        
        return {
            'success': True,
            'damage_class': result.get('damage_class', 'unknown'),
            'damage_name': result.get('damage_name', 'Inconnu'),
            'confidence': result.get('confidence', 0),
            'severity': result.get('severity', 0),
            'detected_parts': detected_parts,
            'cost_estimate': cost_estimate,
            'recommendation': recommendation,
            'analysis_time': result.get('analysis_time', datetime.now().isoformat()),
            'model': result.get('model', 'yolo11m'),
            'is_fallback': result.get('fallback', False)
        }
    except Exception as e:
        logger.error(f"❌ Erreur YOLO: {e}")
        return {'success': False, 'error': str(e)}


@router.post("/upload-and-analyze-fallback")
async def upload_and_analyze_fallback(
    file: UploadFile = File(...)
) -> Dict[str, Any]:
    """
    Version simplifiée qui utilise uniquement OpenCV (fallback)
    """
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        if image.mode != 'RGB':
            image = image.convert('RGB')
        image_np = np.array(image)
        image_np = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
        
        gray = cv2.cvtColor(image_np, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        contour_density = len(contours) / (image_np.shape[0] * image_np.shape[1])
        severity = min(1, contour_density * 15000)
        
        if severity < 0.1:
            damage_class = "scratch"
            damage_name = "Rayure"
        elif severity < 0.3:
            damage_class = "dent"
            damage_name = "Enfoncement"
        elif severity < 0.5:
            damage_class = "crack"
            damage_name = "Fissure"
        else:
            damage_class = "glass_shatter"
            damage_name = "Vitre brisée"
        
        detected_parts = [{
            'part_id': 'carrosserie',
            'part_name': 'Carrosserie',
            'category': 'carrosserie',
            'cost': 500,
            'repairable': True,
            'confidence': 0.6,
            'severity': severity
        }]
        
        cost_service = get_cost_service()
        cost_estimate = cost_service.estimate_cost(detected_parts)
        recommendation = generate_recommendation(detected_parts, severity)
        
        return {
            'success': True,
            'damage_class': damage_class,
            'damage_name': damage_name,
            'confidence': 0.6,
            'severity': severity,
            'detected_parts': detected_parts,
            'cost_estimate': cost_estimate,
            'recommendation': recommendation,
            'analysis_time': datetime.now().isoformat(),
            'model': 'opencv_fallback',
            'is_fallback': True,
            'metadata': {
                'filename': file.filename,
                'size': len(contents),
                'timestamp': datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"❌ Erreur fallback: {e}")
        return {'success': False, 'error': str(e)}


# ============================================
# ENDPOINTS AVEC AUTHENTIFICATION
# ============================================

@router.post("/upload-and-analyze")
async def upload_and_analyze_auth(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Analyser une image avec le modèle Vit-BEiT (version authentifiée)
    """
    try:
        result = await upload_and_analyze_public(file)
        if result.get('success'):
            result['user'] = {
                'id': current_user.id,
                'email': current_user.email,
                'username': current_user.username
            }
        return result
    except Exception as e:
        logger.error(f"❌ Erreur: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}


# ============================================
# ENDPOINT REAL-TIME DETECTION
# ============================================

@router.post("/detect-realtime")
async def detect_damage_realtime(
    file: UploadFile = File(...),
    detection_type: str = Form("auto")
) -> Dict[str, Any]:
    """
    Détection de dommages en temps réel avec YOLO
    """
    try:
        if not file.content_type.startswith('image/'):
            return {
                'success': False,
                'error': 'Le fichier doit être une image',
                'code': 'INVALID_FILE_TYPE'
            }
        
        contents = await file.read()
        if len(contents) > 20 * 1024 * 1024:
            return {
                'success': False,
                'error': 'L\'image ne doit pas dépasser 20MB',
                'code': 'FILE_TOO_LARGE'
            }
        
        try:
            image = Image.open(io.BytesIO(contents))
            if image.mode != 'RGB':
                image = image.convert('RGB')
            image_np = np.array(image)
            image_np = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)
        except Exception as e:
            logger.error(f"❌ Erreur conversion: {e}")
            return {
                'success': False,
                'error': 'Format d\'image invalide',
                'code': 'INVALID_IMAGE_FORMAT'
            }
        
        try:
            detector = get_yolo_detector()
            result = detector.analyze_image(image_np)
        except Exception as e:
            logger.error(f"❌ Erreur YOLO: {e}")
            damage_service = get_damage_service()
            result = damage_service.analyze_image(image_np)
        
        if not result.get('success'):
            return {
                'success': False,
                'error': result.get('error', 'Erreur analyse'),
                'code': 'ANALYSIS_ERROR',
                'fallback': result.get('fallback', True)
            }
        
        detected_parts = result.get('detected_parts', [])
        severity = result.get('severity', 0)
        confidence = result.get('confidence', 0)
        damage_class = result.get('damage_class', 'unknown')
        damage_name = result.get('damage_name', 'Inconnu')
        
        cost_service = get_cost_service()
        cost_estimate = cost_service.estimate_cost(detected_parts)
        recommendation = generate_recommendation(detected_parts, severity)
        
        annotated_image = None
        if detection_type == "annotated":
            annotated_image = generate_annotated_image(image_np, result)
        
        return {
            'success': True,
            'detection': {
                'damage_class': damage_class,
                'damage_name': damage_name,
                'confidence': confidence,
                'severity': severity,
                'detected_parts': detected_parts,
                'all_probabilities': result.get('all_probabilities', {}),
                'bbox': result.get('bbox', [0, 0, 0, 0]),
                'model': result.get('model', 'yolo11m'),
                'model_name': result.get('model_name', 'YOLO Damage Detection'),
                'is_fallback': result.get('fallback', False)
            },
            'cost_estimate': cost_estimate,
            'recommendation': recommendation,
            'annotated_image': annotated_image,
            'metadata': {
                'filename': file.filename,
                'content_type': file.content_type,
                'size': len(contents),
                'timestamp': datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"❌ Erreur détection temps réel: {e}", exc_info=True)
        return {'success': False, 'error': str(e), 'code': 'INTERNAL_ERROR'}


# ============================================
# ENDPOINT BATCH
# ============================================

@router.post("/batch-analyze")
async def batch_analyze(
    files: List[UploadFile] = File(...)
) -> Dict[str, Any]:
    """
    Analyser plusieurs images en batch
    """
    try:
        results = []
        total_time = 0
        
        for i, file in enumerate(files):
            start_time = datetime.now()
            try:
                result = await upload_and_analyze_public(file)
                result['index'] = i
                result['filename'] = file.filename
            except Exception as e:
                result = {
                    'success': False,
                    'index': i,
                    'filename': file.filename,
                    'error': str(e)
                }
            
            elapsed = (datetime.now() - start_time).total_seconds()
            result['processing_time'] = elapsed
            total_time += elapsed
            results.append(result)
        
        success_count = len([r for r in results if r.get('success')])
        
        return {
            'success': True,
            'total': len(files),
            'success_count': success_count,
            'failure_count': len(files) - success_count,
            'total_time': round(total_time, 2),
            'avg_time': round(total_time / len(files), 2) if files else 0,
            'results': results,
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"❌ Erreur batch: {e}")
        return {'success': False, 'error': str(e)}


# ============================================
# WEBSOCKET REAL-TIME
# ============================================

@router.websocket("/ws/realtime")
async def websocket_realtime_detection(websocket: WebSocket):
    """
    WebSocket pour la détection de dommages en temps réel
    """
    await websocket.accept()
    logger.info("🔌 WebSocket realtime connecté")
    
    try:
        while True:
            data = await websocket.receive_text()
            try:
                request = json.loads(data)
                action = request.get('action', 'ping')
                
                if action == 'ping':
                    await websocket.send_text(json.dumps({
                        'type': 'pong',
                        'timestamp': datetime.now().isoformat()
                    }))
                elif action == 'get_stats':
                    await websocket.send_text(json.dumps({
                        'type': 'stats',
                        'data': {
                            'total_analyses': random.randint(100, 1000),
                            'avg_confidence': round(random.uniform(70, 95), 1),
                            'detection_rate': round(random.uniform(85, 99), 1),
                            'active_users': random.randint(5, 25),
                            'timestamp': datetime.now().isoformat()
                        }
                    }))
                else:
                    await websocket.send_text(json.dumps({
                        'type': 'error',
                        'error': f'Action inconnue: {action}'
                    }))
            except json.JSONDecodeError:
                await websocket.send_text(json.dumps({
                    'type': 'error',
                    'error': 'Format JSON invalide'
                }))
    except WebSocketDisconnect:
        logger.info("🔌 WebSocket realtime déconnecté")
    except Exception as e:
        logger.error(f"❌ Erreur WebSocket: {e}")


# ============================================
# STATUS
# ============================================

@router.get("/status")
async def get_status() -> Dict[str, Any]:
    """Vérifier le statut du service"""
    try:
        damage_service = get_damage_service()
        cost_service = get_cost_service()
        
        return {
            'success': True,
            'status': 'healthy' if damage_service.is_loaded else 'degraded',
            'vit_beit_loaded': damage_service.is_loaded,
            'yolo_loaded': yolo_detector is not None,
            'cost_estimator_loaded': cost_service.is_loaded,
            'device': str(damage_service.device),
            'model_name': damage_service.model_name,
            'classes': list(damage_service.DAMAGE_CLASSES.keys()),
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        return {
            'success': False,
            'status': 'unhealthy',
            'error': str(e)
        }


# ============================================
# ANALYZE (alias)
# ============================================

@router.post("/analyze")
async def analyze_image(
    file: UploadFile = File(...)
) -> Dict[str, Any]:
    """Analyse simple d'image (version publique)"""
    return await upload_and_analyze_public(file)


logger.info("✅ ROUTER DAMAGE AI CHARGÉ AVEC SUCCÈS")