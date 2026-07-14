# app/services/car_damage_service.py
# Wrapper delegating to yolo_service
import logging
from .yolo_service import YOLODamageDetector, car_detector

logger = logging.getLogger(__name__)

class CarDamageService(YOLODamageDetector):
    """
    Service wrapper pour la détection de dégâts de voiture,
    héritant de YOLODamageDetector pour la compatibilité.
    """
    def __init__(self):
        super().__init__()
        logger.info("🚗 CarDamageService initialisé (wrapper yolo_service)")

car_damage_service = car_detector
