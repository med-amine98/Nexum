import requests

logger.info('Test image NORMALE:')
with open('data_wildfire/val/normal/sample_0.jpg', 'rb') as f:
    r = requests.post('http://localhost:8000/api/v1/claims/analyze-building-damage-public', files={'photo': f})
    data = r.json()
    logger.info('  Classe:', data['class_name'])
    logger.info('  Confiance:', round(data['confidence'], 1), '%')
    logger.info('  Description:', data['description'])

logger.info('\nTest image INCENDIE:')
with open('data_wildfire/val/fire_damage/sample_0.jpg', 'rb') as f:
    r = requests.post('http://localhost:8000/api/v1/claims/analyze-building-damage-public', files={'photo': f})
    data = r.json()
    logger.info('  Classe:', data['class_name'])
    logger.info('  Confiance:', round(data['confidence'], 1), '%')
    logger.info('  Description:', data['description'])
