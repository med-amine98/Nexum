import requests

logger.info('Test image NORMALE:')
with open('data_wildfire/val/normal/sample_0.jpg', 'rb') as f:
    r = requests.post('http://localhost:8000/api/v1/claims/analyze-building-damage-public', files={'photo': f})
    data = r.json()
    logger.info(f'  Classe: {data["class_name"]}')
    logger.info(f'  Confiance: {data["confidence"]:.1f}%')
    logger.info(f'  Description: {data["description"]}')
