import sys
sys.path.append('C:/Users/salah/Desktop/mon-erp/backend')
from app.services.digital_twin_service import digital_twin_service
sample = {"temperature": 90, "vibration": 5, "pressure": 70, "operating_hours": 2000}
print('Prediction:', digital_twin_service.predict(sample))
