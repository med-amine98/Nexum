import requests

logger.info('='*50)
logger.info('TEST IMAGE NORMALE')
logger.info('='*50)
with open('data_wildfire/val/normal/sample_0.jpg', 'rb') as f:
    r = requests.post('http://localhost:8000/api/v1/claims/analyze-building-damage-public', files={'photo': f})
    data = r.json()
    logger.info(f"Classe: {data['class_name']}")
    logger.info(f"Confiance: {data['confidence']:.1f}%")
    logger.info(f"Description: {data['description']}")
    logger.info(f"Estimation: {data['total_estimated_cost']}€")
    logger.info(f"Probas: normal={data['probabilities']['normal']:.1f}%, feu={data['probabilities']['fire_damage']:.1f}%")

logger.info('\n' + '='*50)
logger.info('TEST IMAGE INCENDIE')
logger.info('='*50)
with open('data_wildfire/val/fire_damage/sample_0.jpg', 'rb') as f:
    r = requests.post('http://localhost:8000/api/v1/claims/analyze-building-damage-public', files={'photo': f})
    data = r.json()
    logger.info(f"Classe: {data['class_name']}")
    logger.info(f"Confiance: {data['confidence']:.1f}%")
    logger.info(f"Description: {data['description']}")
    logger.info(f"Estimation: {data['total_estimated_cost']}€")
    logger.info(f"Probas: normal={data['probabilities']['normal']:.1f}%, feu={data['probabilities']['fire_damage']:.1f}%")
