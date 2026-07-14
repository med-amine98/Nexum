# app/ml/bayesian_risk.py
import numpy as np
import pandas as pd
from scipy import stats
from sklearn.preprocessing import StandardScaler
import joblib
import logging
from typing import Dict, List, Tuple
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

class BayesianRiskModel:
    """
    Modèle Bayésien pour la prédiction des risques clients
    Utilise des réseaux de neurones bayésiens avec quantification d'incertitude
    """
    
    def __init__(self):
        self.scaler = StandardScaler()
        self.prior_params = None
        self.posterior_params = None
        self.is_trained = False
        
    def _compute_bayesian_weights(self, features: np.ndarray, targets: np.ndarray) -> Dict:
        """
        Calcule les poids bayésiens avec inférence variationnelle
        """
        n_samples, n_features = features.shape
        
        # Prior: N(0, 1/lambda)
        lambda_prior = 1.0
        
        # Calcul de la moyenne a posteriori
        XtX = features.T @ features
        XtY = features.T @ targets
        
        # Ajout du prior
        posterior_cov = np.linalg.inv(XtX + lambda_prior * np.eye(n_features))
        posterior_mean = posterior_cov @ XtY
        
        # Incertitude (variance a posteriori)
        posterior_var = np.diag(posterior_cov)
        
        return {
            'mean': posterior_mean,
            'variance': posterior_var,
            'covariance': posterior_cov
        }
    
    def predict_with_uncertainty(self, features: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """
        Prédiction avec quantification de l'incertitude
        Retourne: (prédiction, incertitude)
        """
        if not self.is_trained:
            raise ValueError("Modèle non entraîné")
        
        # Prédiction déterministe
        predictions = features @ self.posterior_params['mean']
        
        # Incertitude prédictive
        predictive_var = np.diag(features @ self.posterior_params['covariance'] @ features.T)
        aleatoric_var = 0.1  # Variance aléatoire
        
        total_uncertainty = np.sqrt(predictive_var + aleatoric_var)
        
        return predictions, total_uncertainty
    
    def train(self, features: np.ndarray, targets: np.ndarray):
        """
        Entraîne le modèle bayésien
        """
        # Standardisation
        self.scaler.fit(features)
        features_scaled = self.scaler.transform(features)
        
        # Calcul des poids bayésiens
        self.posterior_params = self._compute_bayesian_weights(features_scaled, targets)
        self.is_trained = True
        logger.info("Modèle bayésien entraîné avec succès")
    
    def get_feature_importance(self, feature_names: List[str]) -> Dict:
        """
        Calcule l'importance des features avec intervalle de confiance
        """
        if not self.is_trained:
            return {}
        
        importance = {}
        for i, name in enumerate(feature_names):
            mean = self.posterior_params['mean'][i]
            std = np.sqrt(self.posterior_params['variance'][i])
            
            # Intervalle de confiance à 95%
            ci_lower = mean - 1.96 * std
            ci_upper = mean + 1.96 * std
            
            importance[name] = {
                'mean': float(mean),
                'std': float(std),
                'ci_lower': float(ci_lower),
                'ci_upper': float(ci_upper),
                'importance': float(abs(mean))
            }
        
        return importance

# Modèle bayésien avec réseau de neurones
class BayesianNeuralNetwork:
    """
    Réseau de neurones bayésien avec couches probabilistes
    """
    
    def __init__(self, input_dim: int, hidden_dim: int = 64, output_dim: int = 1):
        self.input_dim = input_dim
        self.hidden_dim = hidden_dim
        self.output_dim = output_dim
        
        # Poids avec incertitude
        self.W1_mean = np.random.randn(input_dim, hidden_dim) * 0.01
        self.W1_var = np.ones((input_dim, hidden_dim)) * 0.1
        self.b1_mean = np.zeros(hidden_dim)
        self.b1_var = np.ones(hidden_dim) * 0.1
        
        self.W2_mean = np.random.randn(hidden_dim, output_dim) * 0.01
        self.W2_var = np.ones((hidden_dim, output_dim)) * 0.1
        self.b2_mean = np.zeros(output_dim)
        self.b2_var = np.ones(output_dim) * 0.1
        
    def forward(self, x: np.ndarray, n_samples: int = 10) -> Tuple[np.ndarray, np.ndarray]:
        """
        Forward pass avec Monte Carlo Dropout
        """
        predictions = []
        
        for _ in range(n_samples):
            # Échantillonnage des poids
            W1 = self.W1_mean + np.random.randn(*self.W1_mean.shape) * np.sqrt(self.W1_var)
            b1 = self.b1_mean + np.random.randn(*self.b1_mean.shape) * np.sqrt(self.b1_var)
            W2 = self.W2_mean + np.random.randn(*self.W2_mean.shape) * np.sqrt(self.W2_var)
            b2 = self.b2_mean + np.random.randn(*self.b2_mean.shape) * np.sqrt(self.b2_var)
            
            # Forward pass
            h = np.tanh(x @ W1 + b1)
            y = h @ W2 + b2
            predictions.append(y)
        
        predictions = np.array(predictions)
        mean = np.mean(predictions, axis=0)
        std = np.std(predictions, axis=0)
        
        return mean, std