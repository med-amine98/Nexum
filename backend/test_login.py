from fastapi.testclient import TestClient
import sys, os
sys.path.append(r'C:/Users/salah/Desktop/mon-erp/backend')
from app.main import app
client = TestClient(app)
# Attempt login with dummy credentials (will likely fail auth if user not in DB)
response = client.post('/api/v1/auth/login', data={'username': 'nonexistent@example.com', 'password': 'test'})
logger.info('Status code:', response.status_code)
logger.info('Response JSON:', response.json())
