# backend/app/services/claim_fraud_detection.py
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import json
import logging
from app.services.fraud_detection import FraudDetectionService

logger = logging.getLogger(__name__)

class ClaimFraudDetectionService:
    """Service de détection de fraude pour les sinistres utilisant le système existant"""
    
    def __init__(self, db_session=None):
        self.db_session = db_session
        # Utiliser votre service existant si besoin
        if db_session:
            self.fraud_service = FraudDetectionService(db_session)
    
    async def analyze_claim(self, claim_data: Dict) -> Dict:
        """Analyser un sinistre pour détecter la fraude"""
        
        fraud_score = 0.0
        indicators = []
        techniques_used = []
        
        # 1. Analyse des dégâts
        damage_score, damage_indicators = self._analyze_damage(claim_data)
        fraud_score += damage_score * 0.30
        indicators.extend(damage_indicators)
        if damage_score > 0.3:
            techniques_used.append("Analyse des dégâts")
        
        # 2. Analyse du montant
        amount_score, amount_indicators = self._analyze_amount(claim_data)
        fraud_score += amount_score * 0.25
        indicators.extend(amount_indicators)
        if amount_score > 0.3:
            techniques_used.append("Analyse des montants")
        
        # 3. Analyse comportementale
        behavior_score, behavior_indicators = self._analyze_behavior(claim_data)
        fraud_score += behavior_score * 0.25
        indicators.extend(behavior_indicators)
        if behavior_score > 0.3:
            techniques_used.append("Analyse comportementale")
        
        # 4. Analyse des patterns temporels
        temporal_score, temporal_indicators = self._analyze_temporal_patterns(claim_data)
        fraud_score += temporal_score * 0.20
        indicators.extend(temporal_indicators)
        if temporal_score > 0.3:
            techniques_used.append("Analyse temporelle")
        
        # 5. Analyse des incohérences
        inconsistency_score, inconsistency_indicators = self._analyze_inconsistencies(claim_data)
        fraud_score += inconsistency_score * 0.20
        indicators.extend(inconsistency_indicators)
        if inconsistency_score > 0.3:
            techniques_used.append("Détection d'incohérences")
        
        # Déterminer le niveau de risque
        fraud_risk = self._determine_risk_level(fraud_score)
        
        # Générer la recommandation
        recommendation = self._generate_recommendation(fraud_score, fraud_risk, indicators)
        
        # Déterminer si un expert est nécessaire
        need_expert = self._need_expert_assessment(fraud_score, claim_data)
        
        return {
            "fraud_score": round(fraud_score * 100, 2),
            "fraud_level": fraud_risk,
            "indicators": list(set(indicators)),
            "techniques_used": techniques_used,
            "recommendation": recommendation,
            "need_expert": need_expert,
            "confidence": round(min(95, fraud_score * 100 + 20), 2),
            "is_fraudulent": fraud_risk in ["critical", "high"]
        }
    
    def _analyze_damage(self, claim_data: Dict) -> Tuple[float, List[str]]:
        """Analyse des dégâts détectés par YOLO"""
        score = 0.0
        indicators = []
        
        damaged_parts = claim_data.get("damaged_parts", [])
        severity = claim_data.get("severity", "mineur")
        
        # Trop de pièces endommagées
        if len(damaged_parts) > 8:
            score += 0.4
            indicators.append(f"Nombre anormal de pièces endommagées: {len(damaged_parts)}")
        elif len(damaged_parts) > 5:
            score += 0.2
            indicators.append(f"Nombre élevé de pièces endommagées: {len(damaged_parts)}")
        
        # Gravité incompatible avec le nombre de pièces
        if severity == "mineur" and len(damaged_parts) > 5:
            score += 0.5
            indicators.append("Incohérence: dégâts mineurs mais trop de pièces")
        
        if severity == "critique" and len(damaged_parts) < 2:
            score += 0.4
            indicators.append("Incohérence: dégâts critiques mais peu de pièces")
        
        # Pièces incompatibles
        incompatible_pairs = [
            ("pare-chocs_avant", "coffre"),
            ("pare-chocs_arriere", "capot")
        ]
        
        for part1, part2 in incompatible_pairs:
            if part1 in damaged_parts and part2 in damaged_parts:
                score += 0.3
                indicators.append(f"Pièces incompatibles endommagées: {part1} et {part2}")
        
        return min(score, 1.0), indicators
    
    def _analyze_amount(self, claim_data: Dict) -> Tuple[float, List[str]]:
        """Analyse du montant estimé"""
        score = 0.0
        indicators = []
        
        estimated_cost = claim_data.get("estimated_cost", 0)
        damaged_parts_count = len(claim_data.get("damaged_parts", []))
        
        # Montant anormalement élevé
        if estimated_cost > 10000:
            score += 0.5
            indicators.append(f"Montant anormalement élevé: {estimated_cost}€")
        elif estimated_cost > 5000:
            score += 0.3
            indicators.append(f"Montant élevé: {estimated_cost}€")
        
        # Montant incohérent avec le nombre de pièces
        if damaged_parts_count > 0:
            avg_cost_per_part = estimated_cost / damaged_parts_count
            if avg_cost_per_part > 1500:
                score += 0.4
                indicators.append(f"Coût moyen par pièce anormal: {avg_cost_per_part:.0f}€")
        
        return min(score, 1.0), indicators
    
    def _analyze_behavior(self, claim_data: Dict) -> Tuple[float, List[str]]:
        """Analyse comportementale du client"""
        score = 0.0
        indicators = []
        
        user_id = claim_data.get("user_id")
        username = claim_data.get("username")
        
        # Vérifier les sinistres récents du même client
        recent_claims = claim_data.get("recent_claims", [])
        
        if len(recent_claims) > 5:
            score += 0.5
            indicators.append(f"Nombre anormal de sinistres récents: {len(recent_claims)}")
        elif len(recent_claims) > 3:
            score += 0.3
            indicators.append(f"Nombre élevé de sinistres récents: {len(recent_claims)}")
        
        # Nouveau client sans historique
        if len(recent_claims) == 0:
            score += 0.2
            indicators.append("Nouveau client sans historique")
        
        # Sinistres trop fréquents
        if len(recent_claims) > 0:
            days_since_last = (datetime.now() - datetime.fromisoformat(recent_claims[0]["created_at"])).days if recent_claims else 999
            if days_since_last < 30:
                score += 0.4
                indicators.append(f"Sinistre trop rapproché: {days_since_last} jours")
        
        return min(score, 1.0), indicators
    
    def _analyze_temporal_patterns(self, claim_data: Dict) -> Tuple[float, List[str]]:
        """Analyse des patterns temporels"""
        score = 0.0
        indicators = []
        
        claim_date = claim_data.get("claim_date")
        
        if claim_date:
            # Sinistre déclaré trop tard
            days_delay = (datetime.now() - datetime.fromisoformat(claim_date)).days
            if days_delay > 15:
                score += 0.5
                indicators.append(f"Déclaration tardive: {days_delay} jours")
            elif days_delay > 7:
                score += 0.3
                indicators.append(f"Déclaration tardive: {days_delay} jours")
        
        return min(score, 1.0), indicators
    
    def _analyze_inconsistencies(self, claim_data: Dict) -> Tuple[float, List[str]]:
        """Analyse des incohérences dans la déclaration"""
        score = 0.0
        indicators = []
        
        description = claim_data.get("description", "")
        damaged_parts = claim_data.get("damaged_parts", [])
        
        # Description trop courte
        if len(description) < 20:
            score += 0.3
            indicators.append("Description trop courte")
        
        # Description ne correspondant pas aux dégâts détectés
        if damaged_parts and "avant" in description.lower() and not any(p in description.lower() for p in ["pare-chocs", "aile", "capot"]):
            score += 0.2
            indicators.append("Description incohérente avec les dégâts détectés")
        
        return min(score, 1.0), indicators
    
    def _determine_risk_level(self, score: float) -> str:
        """Détermine le niveau de risque"""
        if score >= 0.7:
            return "critical"
        elif score >= 0.5:
            return "high"
        elif score >= 0.3:
            return "medium"
        else:
            return "low"
    
    def _generate_recommendation(self, score: float, risk: str, indicators: List[str]) -> str:
        """Génère une recommandation"""
        if risk == "critical":
            return f"🚨 URGENT: Fraude probable (score {score*100:.0f}%). Bloquer la déclaration et envoyer un expert terrain immédiatement. Indicateurs: {', '.join(indicators[:3])}"
        elif risk == "high":
            return f"⚠️ Risque élevé de fraude (score {score*100:.0f}%). Suspension recommandée pour investigation. Envoyer un expert pour vérification."
        elif risk == "medium":
            return f"📋 Risque modéré de fraude (score {score*100:.0f}%). Surveillance renforcée recommandée. Vérification supplémentaire nécessaire."
        else:
            return f"✅ Risque faible (score {score*100:.0f}%). Transaction normale, traitement standard."
    
    def _need_expert_assessment(self, fraud_score: float, claim_data: Dict) -> Dict:
        """Détermine si un expert est nécessaire"""
        need_expert = False
        urgency = "normal"
        reasons = []
        
        severity = claim_data.get("severity", "mineur")
        estimated_cost = claim_data.get("estimated_cost", 0)
        
        if fraud_score > 0.6:
            need_expert = True
            urgency = "critique"
            reasons.append("Suspicion de fraude élevée")
        elif fraud_score > 0.4:
            need_expert = True
            urgency = "urgent"
            reasons.append("Suspicion de fraude modérée")
        
        if severity in ["sever", "critique"]:
            need_expert = True
            urgency = "urgent" if urgency == "normal" else urgency
            reasons.append("Dégâts graves")
        
        if estimated_cost > 5000:
            need_expert = True
            reasons.append("Montant élevé")
        
        return {
            "need_expert": need_expert,
            "urgency": urgency,
            "reasons": reasons,
            "expert_type": "expert_terrain" if urgency in ["critique", "urgent"] else "expert_telephonique"
        }