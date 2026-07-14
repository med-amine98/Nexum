import requests

logger.info('Test image INCENDIE:')
with open('data_wildfire/val/fire_damage/sample_0.jpg', 'rb') as f:
    r = requests.post('http://localhost:8000/api/v1/claims/analyze-building-damage-public', files={'photo': f})
    data = r.json()
    logger.info(f'  Classe: {data["class_name"]}')
    logger.info(f'  Confiance: {data["confidence"]:.1f}%')
    logger.info(f'  Description: {data["description"]}')
    logger.info(f'  Estimation: {data["total_estimated_cost"]}€')
