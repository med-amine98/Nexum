import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout

class WeatherRiskPredictor:
    """Prédiction des risques météo basée sur Deep Learning (LSTM)"""
    
    def __init__(self):
        self.seq_length = 7
        self.model = None
        self.n_features = 5  # Temp, Hum, Wind, Press, Precip
        
    def build_model(self):
        """Construit l'architecture du modèle LSTM"""
        self.model = Sequential([
            LSTM(64, return_sequences=True, input_shape=(self.seq_length, self.n_features)),
            Dropout(0.2),
            LSTM(32),
            Dropout(0.2),
            Dense(16, activation='relu'),
            Dense(3, activation='sigmoid')  # 3 risques: Inondation, Tempête, Incendie
        ])
        
        self.model.compile(optimizer='adam', loss='mse')
        logger.info("✅ Architecture LSTM construite pour la météo")
        
    def train(self, historical_data: np.ndarray, epochs: int = 10):
        """Entraîne le modèle sur les données historiques"""
        if self.model is None:
            self.build_model()
            
        # Simulation de labels pour l'entraînement (Inondation, Tempête, Incendie)
        # Dans un cas réel, y serait fourni
        y = np.random.rand(historical_data.shape[0], 3)
        
        # Reshape data pour LSTM: (samples, time_steps, features)
        # On suppose que historical_data est déjà fenêtré ou on simule le fenêtrage
        X = np.array([historical_data[i:i+self.seq_length] for i in range(len(historical_data)-self.seq_length)])
        y = y[self.seq_length:]
        
        self.model.fit(X, y, epochs=epochs, verbose=0)
        logger.info(f"✅ Modèle météo entraîné sur {len(X)} séquences")
        
    def predict_risks(self, last_7_days: np.ndarray) -> Dict:
        """Prédit les risques pour les 7 prochains jours"""
        if self.model is None:
            return self._fallback_predict(last_7_days)
            
        try:
            # Reshape pour l'inférence
            input_data = last_7_days.reshape((1, self.seq_length, self.n_features))
            pred = self.model.predict(input_data, verbose=0)[0]
            
            # Projection sur 7 jours avec légère dégradation de confiance
            predictions = []
            for i in range(7):
                noise = np.random.normal(0, 0.05 * i, 3)
                day_pred = np.clip(pred + noise, 0, 1)
                predictions.append(day_pred)
            
            # Analyse de risque météo pour l'UI
            risk_level = "high" if float(pred[0]) > 0.5 else "low"
            
            return {
                'flood_risk': [float(p[0]) for p in predictions],
                'storm_risk': [float(p[1]) for p in predictions],
                'fire_risk': [float(p[2]) for p in predictions],
                'risk_level': risk_level,
                'ui_trigger': "weather_warning" if risk_level == "high" else "standard",
                'dates': [(datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d') 
                         for i in range(1, 8)],
                'method': 'lstm_prediction'
            }
        except Exception as e:
            logger.error(f"Erreur prédiction LSTM: {e}")
            return self._fallback_predict(last_7_days)

    def _fallback_predict(self, last_7_days: np.ndarray) -> Dict:
        """Méthode de secours si le modèle n'est pas prêt"""
        return {
            'flood_risk': [0.2] * 7,
            'storm_risk': [0.1] * 7,
            'fire_risk': [0.05] * 7,
            'dates': [(datetime.now() + timedelta(days=i)).strftime('%Y-%m-%d') for i in range(1, 8)],
            'method': 'fallback_constant'
        }

# Instance globale
weather_predictor = WeatherRiskPredictor()