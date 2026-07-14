# app/services/fraud_detection.py
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import hashlib
import json
from sqlalchemy.orm import Session
import logging
from app.models.blockchain import Transaction, BlockchainFraudAlert
logger = logging.getLogger(__name__)

class FraudDetectionService:
    def __init__(self, db: Session):
        self.db = db
        
    def analyze_transaction(self, transaction: Transaction) -> Dict:
        """Analyse complète d'une transaction pour détecter la fraude"""
        
        fraud_score = 0.0
        indicators = []
        techniques_used = []
        
        # 1. Analyse du montant
        amount_score, amount_indicators = self._analyze_amount(transaction)
        fraud_score += amount_score * 0.25
        indicators.extend(amount_indicators)
        if amount_score > 0.3:
            techniques_used.append("Analyse des montants anormaux")
        
        # 2. Analyse comportementale
        behavior_score, behavior_indicators = self._analyze_behavior(transaction)
        fraud_score += behavior_score * 0.30
        indicators.extend(behavior_indicators)
        if behavior_score > 0.3:
            techniques_used.append("Analyse comportementale")
        
        # 3. Vérification de la signature
        signature_score, signature_indicators = self._verify_signature(transaction)
        fraud_score += signature_score * 0.20
        indicators.extend(signature_indicators)
        if signature_score > 0.2:
            techniques_used.append("Vérification cryptographique")
        
        # 4. Analyse de la temporalité
        temporal_score, temporal_indicators = self._analyze_temporal_patterns(transaction)
        fraud_score += temporal_score * 0.15
        indicators.extend(temporal_indicators)
        if temporal_score > 0.3:
            techniques_used.append("Analyse temporelle")
        
        # 5. Analyse du réseau
        network_score, network_indicators = self._analyze_network_patterns(transaction)
        fraud_score += network_score * 0.10
        indicators.extend(network_indicators)
        if network_score > 0.3:
            techniques_used.append("Analyse du réseau")
        
        # Déterminer le niveau de risque
        fraud_risk = self._determine_risk_level(fraud_score)
        
        # Générer la recommandation
        recommendation = self._generate_recommendation(fraud_score, fraud_risk, indicators)
        
        return {
            "fraud_score": round(fraud_score * 100, 2),
            "fraud_level": fraud_risk,
            "indicators": list(set(indicators)),  # Éliminer les doublons
            "techniques_used": techniques_used,
            "recommendation": recommendation,
            "confidence": round(min(95, fraud_score * 100 + 20), 2)
        }
    
    def _analyze_amount(self, transaction: Transaction) -> Tuple[float, List[str]]:
        """Analyse du montant de la transaction"""
        score = 0.0
        indicators = []
        
        # Montant anormalement élevé
        if transaction.value > 100000:
            score += 0.5
            indicators.append("Montant anormalement élevé")
        elif transaction.value > 50000:
            score += 0.3
            indicators.append("Montant élevé")
        
        # Montant arrondi suspect
        if transaction.value == round(transaction.value):
            score += 0.2
            indicators.append("Montant arrondi suspect")
        
        # Montant exact (pattern de test)
        if transaction.value in [0.01, 1.00, 100.00]:
            score += 0.4
            indicators.append("Pattern de test détecté")
        
        return min(score, 1.0), indicators
    
    def _analyze_behavior(self, transaction: Transaction) -> Tuple[float, List[str]]:
        """Analyse comportementale de l'adresse"""
        score = 0.0
        indicators = []
        
        # Vérifier les transactions précédentes de l'expéditeur
        recent_txs = self.db.query(Transaction).filter(
            Transaction.from_address == transaction.from_address,
            Transaction.timestamp > datetime.utcnow() - timedelta(hours=24)
        ).all()
        
        # Comportement inhabituel
        if len(recent_txs) > 100:
            score += 0.4
            indicators.append("Activité anormalement élevée")
        elif len(recent_txs) > 50:
            score += 0.2
            indicators.append("Activité élevée")
        
        # Nouveau compte
        if len(recent_txs) == 0:
            score += 0.3
            indicators.append("Nouveau compte sans historique")
        
        # Vérifier les patterns de washing
        wash_patterns = self._detect_washing_patterns(transaction)
        if wash_patterns:
            score += 0.6
            indicators.append(f"Pattern de washing détecté: {wash_patterns}")
        
        return min(score, 1.0), indicators
    
    def _verify_signature(self, transaction: Transaction) -> Tuple[float, List[str]]:
        """Vérification cryptographique de la signature"""
        score = 0.0
        indicators = []
        
        if not transaction.signature:
            score += 0.8
            indicators.append("Signature manquante")
            return score, indicators
        
        # Vérification de la longueur de la signature
        if len(transaction.signature) < 130:
            score += 0.5
            indicators.append("Signature invalide (longueur incorrecte)")
        
        # Vérification du format
        if not transaction.signature.startswith("0x"):
            score += 0.3
            indicators.append("Format de signature invalide")
        
        return min(score, 1.0), indicators
    
    def _analyze_temporal_patterns(self, transaction: Transaction) -> Tuple[float, List[str]]:
        """Analyse des patterns temporels"""
        score = 0.0
        indicators = []
        
        # Transactions à des heures inhabituelles
        hour = transaction.timestamp.hour
        if 2 <= hour <= 5:
            score += 0.4
            indicators.append("Transaction à heure inhabituelle")
        
        # Fréquence des transactions
        recent_txs = self.db.query(Transaction).filter(
            Transaction.from_address == transaction.from_address,
            Transaction.timestamp > datetime.utcnow() - timedelta(minutes=5)
        ).count()
        
        if recent_txs > 10:
            score += 0.5
            indicators.append("Burst de transactions suspect")
        
        return min(score, 1.0), indicators
    
    def _analyze_network_patterns(self, transaction: Transaction) -> Tuple[float, List[str]]:
        """Analyse des patterns réseau"""
        score = 0.0
        indicators = []
        
        # Adresses blacklistées (simulé)
        blacklisted_addresses = []  # À charger depuis la base
        
        if transaction.from_address in blacklisted_addresses:
            score += 1.0
            indicators.append("Adresse blacklistée")
        
        if transaction.to_address in blacklisted_addresses:
            score += 0.8
            indicators.append("Destination blacklistée")
        
        return min(score, 1.0), indicators
    
    def _detect_washing_patterns(self, transaction: Transaction) -> List[str]:
        """Détection des patterns de washing (blanchiment)"""
        patterns = []
        
        # Vérifier les cycles
        recent_txs = self.db.query(Transaction).filter(
            (Transaction.from_address == transaction.to_address) |
            (Transaction.to_address == transaction.from_address),
            Transaction.timestamp > datetime.utcnow() - timedelta(minutes=30)
        ).all()
        
        if len(recent_txs) > 3:
            patterns.append("Cycle de transactions suspect")
        
        return patterns
    
    def _determine_risk_level(self, score: float) -> str:
        """Détermine le niveau de risque en fonction du score"""
        if score >= 0.7:
            return "critical"
        elif score >= 0.5:
            return "high"
        elif score >= 0.3:
            return "medium"
        else:
            return "low"
    
    def _generate_recommendation(self, score: float, risk: str, indicators: List[str]) -> str:
        """Génère une recommandation basée sur l'analyse"""
        if risk == "critical":
            return "URGENT: Bloquer immédiatement la transaction et notifier l'équipe de sécurité. " + \
                   f"Indicateurs critiques: {', '.join(indicators[:3])}"
        elif risk == "high":
            return "Risque élevé: Suspension recommandée pour investigation manuelle. " + \
                   "Vérifier les indicateurs de fraude avant validation."
        elif risk == "medium":
            return "Risque modéré: Surveillance renforcée recommandée. " + \
                   "Vérification supplémentaire via ZKP nécessaire."
        else:
            return "Risque faible: Transaction normale, surveillance standard appliquée."
    
    def create_fraud_alert(self, transaction: Transaction, analysis: Dict) -> BlockchainFraudAlert:
        """Crée une alerte de fraude dans la base de données"""
        
        alert = BlockchainFraudAlert(
            transaction_id=transaction.id,
            transaction_hash=transaction.tx_hash,
            fraud_score=analysis["fraud_score"],
            fraud_level=analysis["fraud_level"],
            description=f"Fraude détectée avec score {analysis['fraud_score']}% - Niveau {analysis['fraud_level']}",
            detection_method="ai_analysis",
            confidence=analysis["confidence"],
            techniques_used=analysis["techniques_used"],
            indicators=analysis["indicators"],
            recommendation=analysis["recommendation"]
        )
        
        self.db.add(alert)
        self.db.commit()
        self.db.refresh(alert)
        
        return alert