import requests
import json
import sys

logger.info("[INFO] RUNNING ENDPOINT VERIFICATION SCRIPT...")

# 1. Verify Frontend
try:
    resp = requests.get("http://localhost:3001", timeout=5)
    logger.info(f"[OK] Frontend status: {resp.status_code}")
except Exception as e:
    logger.info(f"[ERROR] Frontend offline: {e}")

# 2. Verify Digital Twin Telemetry
try:
    resp = requests.get("http://localhost:8000/api/v1/digital-twins", timeout=5)
    logger.info(f"[OK] Digital Twin status: {resp.status_code}")
    if resp.status_code == 200:
        data = resp.json()
        logger.info(f"   Telemetry keys: {list(data.keys())}")
        logger.info(f"   Status: {data.get('status')}, CPU: {data.get('metrics', {}).get('cpu_load')}%")
except Exception as e:
    logger.info(f"[ERROR] Digital Twin Telemetry offline: {e}")

# 3. Get Auth Token
token = None
try:
    auth_data = {"username": "admin@example.com", "password": "admin123"}
    resp = requests.post("http://localhost:8000/api/v1/auth/login", data=auth_data, timeout=5)
    logger.info(f"[OK] Auth status: {resp.status_code}")
    if resp.status_code == 200:
        token = resp.json().get("access_token")
        logger.info("   Successfully obtained auth token!")
except Exception as e:
    logger.info(f"[ERROR] Auth offline: {e}")

# 4. Verify Blockchain Stats
if token:
    try:
        headers = {"Authorization": f"Bearer {token}"}
        resp = requests.get("http://localhost:8000/api/v1/blockchain/stats", headers=headers, timeout=5)
        logger.info(f"[OK] Blockchain Stats status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            logger.info(f"   Ledger Stats: {json.dumps(data, indent=2)}")
    except Exception as e:
        logger.info(f"[ERROR] Blockchain Stats offline: {e}")
else:
    logger.info("[WARN] Skipping Blockchain tests due to auth failure.")

logger.info("[INFO] VERIFICATION COMPLETED!")
