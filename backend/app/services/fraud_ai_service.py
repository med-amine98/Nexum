# app/services/fraud_ai_service.py
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import joblib
import os
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

class FraudAIService:
    """Service IA pour la détection de fraude"""
    
    def __init__(self):
        self.model = None
        self.scaler = None
        self.is_loaded = False
        self.model_path = "models/fraud_ai_model.pkl"
        self.scaler_path = "models/fraud_ai_scaler.pkl"
        
        # Créer le dossier models
        os.makedirs("models", exist_ok=True)
        
        # Charger ou créer le modèle
        self._initialize()
    
    def _initialize(self):
        """Initialiser le modèle IA"""
        try:
            # Essayer de charger un modèle existant
            if os.path.exists(self.model_path) and os.path.exists(self.scaler_path):
                self.model = joblib.load(self.model_path)
                self.scaler = joblib.load(self.scaler_path)
                self.is_loaded = True
                logger.info("✅ Modèle IA chargé avec succès")
                return
            
            # Créer un nouveau modèle
            logger.info("🔄 Création d'un nouveau modèle IA...")
            self._train_model()
            
        except Exception as e:
            logger.error(f"❌ Erreur initialisation modèle: {e}")
            # Créer un modèle simple de secours
            self._create_fallback_model()
    
    def _train_model(self):
        """Entraîner le modèle avec des données synthétiques réalistes"""
        try:
            # Générer des données d'entraînement
            X, y = self._generate_training_data(5000)
            
            # Split en train/test
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=0.2, random_state=42
            )
            
            # Normaliser
            self.scaler = StandardScaler()
            X_train_scaled = self.scaler.fit_transform(X_train)
            X_test_scaled = self.scaler.transform(X_test)
            
            # Créer et entraîner le modèle
            self.model = RandomForestClassifier(
                n_estimators=150,
                max_depth=12,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                class_weight='balanced',
                n_jobs=-1
            )
            self.model.fit(X_train_scaled, y_train)
            
            # Évaluer
            train_score = self.model.score(X_train_scaled, y_train)
            test_score = self.model.score(X_test_scaled, y_test)
            
            logger.info(f"✅ Modèle entraîné - Train: {train_score:.2%}, Test: {test_score:.2%}")
            
            # Sauvegarder
            joblib.dump(self.model, self.model_path)
            joblib.dump(self.scaler, self.scaler_path)
            self.is_loaded = True
            
        except Exception as e:
            logger.error(f"❌ Erreur entraînement: {e}")
            self._create_fallback_model()
    
    def _generate_training_data(self, n_samples):
        """Générer des données d'entraînement réalistes"""
        np.random.seed(42)
        
        X = []
        y = []
        
        # Définition des features
        # 0: montant_moyen_sinistre
        # 1: nombre_sinistres
        # 2: delai_moyen_jours
        # 3: age_client
        # 4: type_sinistre (0:autre, 1:accident, 2:vol, 3:sante, 4:dommage)
        # 5: montant_prime
        # 6: score_risque_initial
        
        for _ in range(n_samples):
            # 80% de données normales
            if np.random.random() < 0.8:
                montant = np.random.exponential(2000)
                nb_sinistres = np.random.poisson(1)
                delai = np.random.exponential(180) + 30
                age = np.random.normal(40, 15)
                type_sinistre = np.random.choice([0, 3, 4], p=[0.2, 0.4, 0.4])
                prime = np.random.exponential(800) + 200
                risk_score = np.random.exponential(30)
                label = 0
            else:
                # 20% frauduleux
                montant = np.random.exponential(8000) + 2000
                nb_sinistres = np.random.poisson(3) + 1
                delai = np.random.exponential(20) + 1
                age = np.random.choice([20, 22, 24, 70, 72, 75])
                type_sinistre = np.random.choice([1, 2], p=[0.6, 0.4])
                prime = np.random.exponential(1500) + 500
                risk_score = np.random.exponential(30) + 40
                label = 1
            
            # Limiter les valeurs
            montant = min(montant, 100000)
            nb_sinistres = min(nb_sinistres, 20)
            delai = min(delai, 730)
            age = min(max(age, 18), 90)
            prime = min(prime, 10000)
            risk_score = min(risk_score, 100)
            
            X.append([montant, nb_sinistres, delai, age, type_sinistre, prime, risk_score])
            y.append(label)
        
        return np.array(X), np.array(y)
    
    def _create_fallback_model(self):
        """Créer un modèle de secours simple"""
        logger.warning("⚠️ Création d'un modèle de secours")
        self.model = RandomForestClassifier(n_estimators=50, random_state=42)
        self.scaler = StandardScaler()
        
        # Entraîner avec des données minimales
        X, y = self._generate_training_data(500)
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled, y)
        self.is_loaded = True
        logger.info("✅ Modèle de secours créé")
    
    def predict(self, features):
        """
        Prédire le score de fraude
        
        Args:
            features: dict avec les caractéristiques
        Returns:
            dict: {fraud_score, fraud_probability, risk_level, confidence}
        """
        if not self.is_loaded or self.model is None:
            return self._fallback_prediction(features)
        
        try:
            # Extraire et normaliser les features
            montant = min(features.get('montant_moyen', 0), 100000)
            nb_sinistres = min(features.get('nombre_sinistres', 0), 20)
            delai = min(features.get('delai_moyen', 365), 730)
            age = min(max(features.get('age_client', 40), 18), 90)
            type_sinistre = features.get('type_sinistre', 0)
            prime = min(features.get('prime', 500), 10000)
            risk_score = min(features.get('risk_score', 50), 100)
            
            # Créer le vecteur
            X = np.array([[montant, nb_sinistres, delai, age, type_sinistre, prime, risk_score]])
            
            # Normaliser
            X_scaled = self.scaler.transform(X)
            
            # Prédire
            fraud_probability = float(self.model.predict_proba(X_scaled)[0][1])
            fraud_score = fraud_probability * 100
            
            # Déterminer le niveau
            if fraud_score >= 70:
                risk_level = 'critical'
            elif fraud_score >= 50:
                risk_level = 'high'
            elif fraud_score >= 30:
                risk_level = 'medium'
            else:
                risk_level = 'low'
            
            return {
                'fraud_score': round(fraud_score, 1),
                'fraud_probability': round(fraud_probability, 3),
                'risk_level': risk_level,
                'confidence': round(70 + fraud_probability * 25, 1),
                'model_used': 'Random Forest'
            }
            
        except Exception as e:
            logger.error(f"❌ Erreur prédiction: {e}")
            return self._fallback_prediction(features)
    
    def _fallback_prediction(self, features):
        """Prédiction de secours"""
        score = 0
        
        # Règles simples
        if features.get('montant_moyen', 0) > 5000:
            score += 20
        if features.get('nombre_sinistres', 0) > 3:
            score += 25
        if features.get('delai_moyen', 365) < 30:
            score += 20
        if features.get('age_client', 40) < 25 or features.get('age_client', 40) > 70:
            score += 15
        if features.get('type_sinistre', 0) in [1, 2]:
            score += 15
        if features.get('risk_score', 50) > 70:
            score += 15
        
        fraud_score = min(100, score)
        
        if fraud_score >= 70:
            risk_level = 'critical'
        elif fraud_score >= 50:
            risk_level = 'high'
        elif fraud_score >= 30:
            risk_level = 'medium'
        else:
            risk_level = 'low'
        
        return {
            'fraud_score': round(fraud_score, 1),
            'fraud_probability': round(fraud_score / 100, 3),
            'risk_level': risk_level,
            'confidence': 75,
            'model_used': 'Fallback Rules'
        }
    
    def get_feature_importance(self):
        """Retourner l'importance des features"""
        if self.model is None:
            return []
        
        feature_names = [
            'Montant moyen',
            'Nombre sinistres',
            'Délai moyen',
            'Âge client',
            'Type sinistre',
            'Prime',
            'Score risque initial'
        ]
        
        importance = self.model.feature_importances_
        return sorted(zip(feature_names, importance), key=lambda x: x[1], reverse=True)


# Singleton
_fraud_ai_service = None

def get_fraud_ai_service():
    global _fraud_ai_service
    if _fraud_ai_service is None:
        _fraud_ai_service = FraudAIService()
    return _fraud_ai_service