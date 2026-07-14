import os
import joblib
import numpy as np
import logging
from typing import Dict, Any, Tuple
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier

logger = logging.getLogger(__name__)

class AdvancedDigitalTwinsService:
    """Service to predict outcomes for the 5 advanced 3D Digital Twins."""

    def __init__(self, fallback_enabled: bool = True):
        self.models_loaded = False
        self.fallback_enabled = fallback_enabled
        
        # AML Fraud
        self.aml_model = None
        # Damage Estimation
        self.damage_model = None
        # Climate Risk
        self.climate_model = None
        # Fraud Rings
        self.fraud_ring_model = None
        # Talent Mapping
        self.talent_model = None

        self.init_models()

    def init_models(self):
        """Load trained models or train new ones on synthetic data."""
        try:
            models_path = 'app/models/saved/'
            os.makedirs(models_path, exist_ok=True)
            
            paths = {
                'aml': f'{models_path}twin_aml_rf.pkl',
                'damage': f'{models_path}twin_damage_rf.pkl',
                'climate': f'{models_path}twin_climate_rf.pkl',
                'fraud_ring': f'{models_path}twin_fraud_ring_rf.pkl',
                'talent': f'{models_path}twin_talent_rf.pkl',
            }

            all_exist = all(os.path.exists(p) for p in paths.values())

            if all_exist:
                self.aml_model = joblib.load(paths['aml'])
                self.damage_model = joblib.load(paths['damage'])
                self.climate_model = joblib.load(paths['climate'])
                self.fraud_ring_model = joblib.load(paths['fraud_ring'])
                self.talent_model = joblib.load(paths['talent'])
                self.models_loaded = True
                logger.info("✅ Advanced Digital Twins ML models loaded from disk")
            else:
                self.train_and_save_models(paths)
        except Exception as e:
            logger.error(f"❌ Error loading advanced digital twin models: {e}. Re-training...")
            self.train_and_save_models()

    def train_and_save_models(self, paths: Dict[str, str] = None):
        """Train scikit-learn models on synthetic data for the 5 twins."""
        try:
            np.random.seed(42)
            n_samples = 2000

            # 1. AML Model (Classifier)
            # Features: [transaction_volume, transaction_frequency, foreign_trans_ratio]
            X_aml = np.random.rand(n_samples, 3)
            # Higher volume & frequency -> higher chance of ML
            y_aml_prob = (X_aml[:, 0] * 0.4 + X_aml[:, 1] * 0.4 + X_aml[:, 2] * 0.2)
            y_aml_class = (y_aml_prob > 0.6).astype(int)
            self.aml_model = RandomForestClassifier(n_estimators=50, max_depth=6, random_state=42)
            self.aml_model.fit(X_aml, y_aml_class)

            # 2. Damage Estimation Model (Regressor)
            # Features: [impact_velocity, material_density, part_vulnerability]
            X_dam = np.random.rand(n_samples, 3)
            y_dam = (X_dam[:, 0] * 50) + (1 - X_dam[:, 1]) * 30 + (X_dam[:, 2] * 20)
            self.damage_model = RandomForestRegressor(n_estimators=50, max_depth=6, random_state=42)
            self.damage_model.fit(X_dam, y_dam)

            # 3. Climate Risk Model (Regressor)
            # Features: [rainfall_intensity, wind_speed, elevation]
            X_cli = np.random.rand(n_samples, 3)
            y_cli = (X_cli[:, 0] * 40) + (X_cli[:, 1] * 40) - (X_cli[:, 2] * 20)
            y_cli = np.clip(y_cli, 0, 100)
            self.climate_model = RandomForestRegressor(n_estimators=50, max_depth=6, random_state=42)
            self.climate_model.fit(X_cli, y_cli)

            # 4. Fraud Ring Model (Classifier)
            # Features: [shared_addresses, linked_phones, claims_frequency]
            X_fri = np.random.rand(n_samples, 3)
            y_fri_prob = (X_fri[:, 0] * 0.5 + X_fri[:, 1] * 0.3 + X_fri[:, 2] * 0.2)
            y_fri_class = (y_fri_prob > 0.5).astype(int)
            self.fraud_ring_model = RandomForestClassifier(n_estimators=50, max_depth=6, random_state=42)
            self.fraud_ring_model.fit(X_fri, y_fri_class)

            # 5. Talent Mapping Model (Regressor)
            # Features: [skills_match, tenure_years_norm, collaboration_score]
            X_tal = np.random.rand(n_samples, 3)
            # predicting performance potential
            y_tal = (X_tal[:, 0] * 50) + (X_tal[:, 1] * 20) + (X_tal[:, 2] * 30)
            self.talent_model = RandomForestRegressor(n_estimators=50, max_depth=6, random_state=42)
            self.talent_model.fit(X_tal, y_tal)

            if paths:
                joblib.dump(self.aml_model, paths.get('aml'))
                joblib.dump(self.damage_model, paths.get('damage'))
                joblib.dump(self.climate_model, paths.get('climate'))
                joblib.dump(self.fraud_ring_model, paths.get('fraud_ring'))
                joblib.dump(self.talent_model, paths.get('talent'))
                logger.info("✅ Advanced Digital Twins ML models trained and saved")

            self.models_loaded = True
        except Exception as e:
            logger.error(f"❌ Failed to train advanced digital twin models: {e}")
            self.models_loaded = False

    def predict_aml(self, data: Dict[str, Any]) -> Tuple[float, float]:
        """Returns (suspicion_score, aml_probability)"""
        if not self.models_loaded and not self.fallback_enabled:
            raise RuntimeError("Models not loaded")
        
        v = float(data.get("transaction_volume", 0.5))
        f = float(data.get("transaction_frequency", 0.5))
        r = float(data.get("foreign_trans_ratio", 0.5))
        features = np.array([[v, f, r]])
        
        if self.models_loaded and self.aml_model:
            prob = self.aml_model.predict_proba(features)[0]
            aml_prob = float(prob[1] * 100) if len(prob) > 1 else float(prob[0] * 100)
            suspicion_score = float(aml_prob * 0.1) # scale 0-10
            return round(suspicion_score, 1), round(aml_prob, 1)
        return 5.0, 50.0

    def predict_damage(self, data: Dict[str, Any]) -> float:
        """Returns estimated damage percentage"""
        if not self.models_loaded and not self.fallback_enabled:
            raise RuntimeError("Models not loaded")
            
        v = float(data.get("impact_velocity", 0.5))
        m = float(data.get("material_density", 0.5))
        p = float(data.get("part_vulnerability", 0.5))
        features = np.array([[v, m, p]])
        
        if self.models_loaded and self.damage_model:
            dmg = self.damage_model.predict(features)[0]
            return round(float(dmg), 1)
        return 50.0

    def predict_climate(self, data: Dict[str, Any]) -> float:
        """Returns flood/climate risk probability"""
        if not self.models_loaded and not self.fallback_enabled:
            raise RuntimeError("Models not loaded")
            
        r = float(data.get("rainfall_intensity", 0.5))
        w = float(data.get("wind_speed", 0.5))
        e = float(data.get("elevation", 0.5))
        features = np.array([[r, w, e]])
        
        if self.models_loaded and self.climate_model:
            risk = self.climate_model.predict(features)[0]
            return round(float(risk), 1)
        return 50.0

    def predict_fraud_ring(self, data: Dict[str, Any]) -> Tuple[float, float]:
        """Returns (centrality_score, fraud_ring_probability)"""
        if not self.models_loaded and not self.fallback_enabled:
            raise RuntimeError("Models not loaded")
            
        a = float(data.get("shared_addresses", 0.5))
        p = float(data.get("linked_phones", 0.5))
        f = float(data.get("claims_frequency", 0.5))
        features = np.array([[a, p, f]])
        
        if self.models_loaded and self.fraud_ring_model:
            prob = self.fraud_ring_model.predict_proba(features)[0]
            ring_prob = float(prob[1] * 100) if len(prob) > 1 else float(prob[0] * 100)
            centrality = float(ring_prob * 0.1) # scale 0-10
            return round(centrality, 1), round(ring_prob, 1)
        return 5.0, 50.0

    def predict_talent(self, data: Dict[str, Any]) -> float:
        """Returns performance potential score (0-100)"""
        if not self.models_loaded and not self.fallback_enabled:
            raise RuntimeError("Models not loaded")
            
        s = float(data.get("skills_match", 0.5))
        t = float(data.get("tenure_years_norm", 0.5))
        c = float(data.get("collaboration_score", 0.5))
        features = np.array([[s, t, c]])
        
        if self.models_loaded and self.talent_model:
            perf = self.talent_model.predict(features)[0]
            return round(float(perf), 1)
        return 50.0

advanced_digital_twins_service = AdvancedDigitalTwinsService()
