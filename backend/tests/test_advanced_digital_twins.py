import pytest
from unittest.mock import patch, MagicMock
from app.services.advanced_digital_twins_service import AdvancedDigitalTwinsService
from fastapi.testclient import TestClient

def test_init_and_train():
    """Vérifier que les 5 modèles sont bien entraînés/chargés sans erreur."""
    service = AdvancedDigitalTwinsService(fallback_enabled=True)
    assert service.models_loaded is True
    assert service.aml_model is not None
    assert service.damage_model is not None
    assert service.climate_model is not None
    assert service.fraud_ring_model is not None
    assert service.talent_model is not None

def test_predict_aml():
    service = AdvancedDigitalTwinsService(fallback_enabled=True)
    suspicion, prob = service.predict_aml({"transaction_volume": 0.8, "transaction_frequency": 0.9, "foreign_trans_ratio": 0.7})
    assert isinstance(suspicion, float)
    assert isinstance(prob, float)

def test_predict_damage():
    service = AdvancedDigitalTwinsService(fallback_enabled=True)
    dmg = service.predict_damage({"impact_velocity": 0.8, "material_density": 0.2, "part_vulnerability": 0.9})
    assert isinstance(dmg, float)

def test_predict_climate():
    service = AdvancedDigitalTwinsService(fallback_enabled=True)
    risk = service.predict_climate({"rainfall_intensity": 0.8, "wind_speed": 0.9, "elevation": 0.1})
    assert isinstance(risk, float)

def test_predict_fraud_ring():
    service = AdvancedDigitalTwinsService(fallback_enabled=True)
    centrality, prob = service.predict_fraud_ring({"shared_addresses": 0.8, "linked_phones": 0.9, "claims_frequency": 0.7})
    assert isinstance(centrality, float)
    assert isinstance(prob, float)

def test_predict_talent():
    service = AdvancedDigitalTwinsService(fallback_enabled=True)
    perf = service.predict_talent({"skills_match": 0.9, "tenure_years_norm": 0.5, "collaboration_score": 0.8})
    assert isinstance(perf, float)

# Pour les tests API, on s'assure juste que les routes sont bien branchées
def test_api_health():
    from app.main import app
    client = TestClient(app)
    response = client.get("/api/v1/advanced-twins/health")
    assert response.status_code == 200
    assert "models_loaded" in response.json()
