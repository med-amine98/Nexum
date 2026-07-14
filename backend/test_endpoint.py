from fastapi.testclient import TestClient
import sys, os, logging
sys.path.append(r'C:/Users/salah/Desktop/mon-erp/backend')
from app.main import app

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

client = TestClient(app)
response = client.post('/api/v1/auth/login', data={'username': 'nonexistent@example.com', 'password': 'test'})
logger.info(f'Status code: {response.status_code}')
logger.info(f'Response json: {response.json()}')
