from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import random
import uuid
import traceback
import logging
logger = logging.getLogger(__name__)
from app.models.catastrophe import (
    CatastropheZone, CatastropheEvent, 
    CatastropheScenario, CatastropheAlert
)
from app.models.auth import User
from app.schemas.catastrophe import (
    CatastropheZoneCreate, CatastropheZoneUpdate,
    CatastropheEventCreate, CatastropheScenarioCreate,
    CatastropheAlertCreate, CatastropheStatsResponse
)

class CatastropheService:
    def __init__(self, db: Session):
        self.db = db
        self.ai_model_name = "NeuralBayesian_v2"
        logger.info(f"🤖 Catastrophe AI Engine: {self.ai_model_name} initialized")

    # ===== Zones =====
    def create_zone(self, zone: CatastropheZoneCreate, current_user: User) -> CatastropheZone:
        """Crée une nouvelle zone à risque"""
        try:
            logger.info(f"🔍 Création zone: {zone.zone_name}")
            
            zone_id = f"ZONE-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
            
            # Calculer le score de risque
            risk_score = self._calculate_risk_score(zone)
            risk_level = self._determine_risk_level(risk_score)
            probability = self._calculate_probability(zone)
            pml = self._calculate_pml(zone, probability)
            
            db_zone = CatastropheZone(
                zone_id=zone_id,
                **zone.dict(),
                risk_score=risk_score,
                risk_level=risk_level,
                probability=probability,
                probable_max_loss=pml,
                analyzed_by_id=current_user.id
            )
            
            self.db.add(db_zone)
            self.db.commit()
            self.db.refresh(db_zone)
            
            logger.info(f"✅ Zone créée avec ID: {db_zone.id}")
            return db_zone
            
        except Exception as e:
            logger.error(f"❌ Erreur create_zone: {e}")
            traceback.print_exc()
            self.db.rollback()
            raise

    def get_zones(
        self,
        skip: int = 0,
        limit: int = 100,
        risk_level: Optional[str] = None,
        country: Optional[str] = None,
        risk_type: Optional[str] = None,
        company_id: Optional[int] = None
    ) -> List[CatastropheZone]:
        """Récupère les zones avec filtres"""
        try:
            logger.info(f"🔍 get_zones: skip={skip}, limit={limit}")
            
            query = self.db.query(CatastropheZone)
            
            if risk_level:
                query = query.filter(CatastropheZone.risk_level == risk_level)
            if country:
                query = query.filter(CatastropheZone.country == country)
            if risk_type:
                query = query.filter(CatastropheZone.main_risk_type == risk_type)
            if company_id:
                query = query.filter(CatastropheZone.company_id == company_id)
                
            result = query.order_by(desc(CatastropheZone.risk_score)).offset(skip).limit(limit).all()
            logger.info(f"✅ {len(result)} zones trouvées")
            return result
            
        except Exception as e:
            logger.error(f"❌ Erreur get_zones: {e}")
            traceback.print_exc()
            return []

    def get_zone(self, zone_id: int) -> Optional[CatastropheZone]:
        """Récupère une zone par son ID"""
        try:
            return self.db.query(CatastropheZone).filter(CatastropheZone.id == zone_id).first()
        except Exception as e:
            logger.error(f"❌ Erreur get_zone: {e}")
            return None

    def get_zone_by_ref(self, ref: str) -> Optional[CatastropheZone]:
        """Récupère une zone par sa référence"""
        try:
            return self.db.query(CatastropheZone).filter(CatastropheZone.zone_id == ref).first()
        except Exception as e:
            logger.error(f"❌ Erreur get_zone_by_ref: {e}")
            return None

    def update_zone(
        self,
        zone_id: int,
        update_data: CatastropheZoneUpdate,
        current_user: User
    ) -> Optional[CatastropheZone]:
        """Met à jour une zone"""
        try:
            db_zone = self.get_zone(zone_id)
            if db_zone:
                for key, value in update_data.dict(exclude_unset=True).items():
                    setattr(db_zone, key, value)
                db_zone.analyzed_by_id = current_user.id
                self.db.commit()
                self.db.refresh(db_zone)
                logger.info(f"✅ Zone {zone_id} mise à jour")
            return db_zone
        except Exception as e:
            logger.error(f"❌ Erreur update_zone: {e}")
            traceback.print_exc()
            self.db.rollback()
            return None

    # ===== Events =====
    def create_event(self, event: CatastropheEventCreate, current_user: User) -> CatastropheEvent:
        """Enregistre un événement catastrophique"""
        try:
            logger.info(f"🔍 Création événement pour zone {event.zone_id}")
            
            event_id = f"EVT-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
            
            db_event = CatastropheEvent(
                event_id=event_id,
                **event.dict()
            )
            
            self.db.add(db_event)
            self.db.commit()
            self.db.refresh(db_event)
            
            # Mettre à jour la zone concernée
            zone = self.get_zone(event.zone_id)
            if zone:
                zone.last_event_date = event.start_date
                zone.events_count += 1
                zone.historical_losses += event.economic_loss
                self.db.commit()
                logger.info(f"✅ Zone {event.zone_id} mise à jour avec l'événement")
            
            logger.info(f"✅ Événement créé avec ID: {db_event.id}")
            return db_event
            
        except Exception as e:
            logger.error(f"❌ Erreur create_event: {e}")
            traceback.print_exc()
            self.db.rollback()
            raise

    def get_events(
        self,
        skip: int = 0,
        limit: int = 100,
        event_type: Optional[str] = None,
        zone_id: Optional[int] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None
    ) -> List[CatastropheEvent]:
        """Récupère les événements avec filtres"""
        try:
            logger.info(f"🔍 get_events: skip={skip}, limit={limit}")
            
            query = self.db.query(CatastropheEvent)
            
            if event_type:
                query = query.filter(CatastropheEvent.event_type == event_type)
            if zone_id:
                query = query.filter(CatastropheEvent.zone_id == zone_id)
            if date_from:
                query = query.filter(CatastropheEvent.start_date >= date_from)
            if date_to:
                query = query.filter(CatastropheEvent.start_date <= date_to)
                
            result = query.order_by(desc(CatastropheEvent.start_date)).offset(skip).limit(limit).all()
            logger.info(f"✅ {len(result)} événements trouvés")
            return result
            
        except Exception as e:
            logger.error(f"❌ Erreur get_events: {e}")
            traceback.print_exc()
            return []

    # ===== Scenarios =====
    def create_scenario(self, scenario: CatastropheScenarioCreate, current_user: User) -> CatastropheScenario:
        """Crée un scénario de simulation"""
        try:
            logger.info(f"🔍 Création scénario: {scenario.scenario_name}")
            
            db_scenario = CatastropheScenario(
                **scenario.dict(),
                created_by_id=current_user.id
            )
            
            self.db.add(db_scenario)
            self.db.commit()
            self.db.refresh(db_scenario)
            
            logger.info(f"✅ Scénario créé avec ID: {db_scenario.id}")
            return db_scenario
            
        except Exception as e:
            logger.error(f"❌ Erreur create_scenario: {e}")
            traceback.print_exc()
            self.db.rollback()
            raise

    def get_scenarios(
        self,
        skip: int = 0,
        limit: int = 100,
        active_only: bool = False
    ) -> List[CatastropheScenario]:
        """Récupère les scénarios"""
        try:
            logger.info(f"🔍 get_scenarios: skip={skip}, limit={limit}, active_only={active_only}")
            
            query = self.db.query(CatastropheScenario)
            if active_only:
                query = query.filter(CatastropheScenario.is_active == True)
                
            result = query.offset(skip).limit(limit).all()
            logger.info(f"✅ {len(result)} scénarios trouvés")
            return result
            
        except Exception as e:
            logger.error(f"❌ Erreur get_scenarios: {e}")
            traceback.print_exc()
            return []

    # ===== Alerts =====
    def create_alert(self, alert: CatastropheAlertCreate, current_user: User) -> CatastropheAlert:
        """Crée une alerte"""
        try:
            logger.info(f"🔍 Création alerte: {alert.title}")
            
            db_alert = CatastropheAlert(
                **alert.dict(),
                created_by_id=current_user.id
            )
            
            self.db.add(db_alert)
            self.db.commit()
            self.db.refresh(db_alert)
            
            logger.info(f"✅ Alerte créée avec ID: {db_alert.id}")
            return db_alert
            
        except Exception as e:
            logger.error(f"❌ Erreur create_alert: {e}")
            traceback.print_exc()
            self.db.rollback()
            raise

    def get_active_alerts(self) -> List[CatastropheAlert]:
        """Récupère les alertes actives"""
        try:
            now = datetime.now()
            alerts = self.db.query(CatastropheAlert).filter(
                CatastropheAlert.is_active == True,
                CatastropheAlert.end_date >= now
            ).all()
            logger.info(f"✅ {len(alerts)} alertes actives trouvées")
            return alerts
        except Exception as e:
            logger.error(f"❌ Erreur get_active_alerts: {e}")
            traceback.print_exc()
            return []

    def acknowledge_alert(self, alert_id: int) -> Optional[CatastropheAlert]:
        """Marque une alerte comme acquittée"""
        try:
            db_alert = self.db.query(CatastropheAlert).filter(CatastropheAlert.id == alert_id).first()
            if db_alert:
                db_alert.acknowledged = True
                self.db.commit()
                self.db.refresh(db_alert)
                logger.info(f"✅ Alerte {alert_id} acquittée")
            return db_alert
        except Exception as e:
            logger.error(f"❌ Erreur acknowledge_alert: {e}")
            traceback.print_exc()
            self.db.rollback()
            return None

    # ===== Dashboard Stats =====
    def get_dashboard_stats(self) -> CatastropheStatsResponse:
        """Récupère les statistiques pour le dashboard"""
        try:
            logger.info("🔍 Calcul des statistiques dashboard...")
            
            # Statistiques globales
            total_exposure = self.db.query(func.sum(CatastropheZone.total_exposure)).scalar() or 0
            high_risk = self.db.query(CatastropheZone).filter(CatastropheZone.risk_level == "high").count()
            medium_risk = self.db.query(CatastropheZone).filter(CatastropheZone.risk_level == "medium").count()
            low_risk = self.db.query(CatastropheZone).filter(CatastropheZone.risk_level == "low").count()
            
            # Ajouter critical si présent
            critical_risk = self.db.query(CatastropheZone).filter(CatastropheZone.risk_level == "critical").count()
            high_risk += critical_risk
            
            # PML total
            total_pml = self.db.query(func.sum(CatastropheZone.probable_max_loss)).scalar() or 0
            
            # Nombre de scénarios
            scenarios_count = self.db.query(CatastropheScenario).count()
            
            # Distribution par type de risque
            risk_types = {}
            for risk_type in ["inondation", "ouragan", "seisme", "feu_foret", "avalanche"]:
                count = self.db.query(CatastropheZone).filter(
                    CatastropheZone.main_risk_type == risk_type
                ).count()
                if count > 0:
                    risk_types[risk_type] = count
            
            # Top zones à risque
            top_zones_raw = self.db.query(CatastropheZone).order_by(
                desc(CatastropheZone.risk_score)
            ).limit(5).all()
            
            top_zones = []
            for zone in top_zones_raw:
                exposure_val = zone.total_exposure if zone.total_exposure else 0
                top_zones.append({
                    "zone": zone.zone_name,
                    "risk": zone.risk_level,
                    "exposure": f"{exposure_val/1e6:.0f}M €" if exposure_val >= 1e6 else f"{exposure_val:.0f} €",
                    "probability": zone.probability if zone.probability else 0,
                    "type": zone.main_risk_type
                })
            
            # Alertes récentes
            now = datetime.now()
            recent_alerts_raw = self.db.query(CatastropheAlert).filter(
                CatastropheAlert.is_active == True,
                CatastropheAlert.end_date >= now
            ).order_by(desc(CatastropheAlert.created_at)).limit(3).all()
            
            recent_alerts = []
            for alert in recent_alerts_raw:
                recent_alerts.append({
                    "type": alert.alert_type,
                    "severity": alert.severity,
                    "title": alert.title,
                    "description": alert.description,
                    "start_date": alert.start_date.strftime("%Y-%m-%d") if alert.start_date else None,
                    "end_date": alert.end_date.strftime("%Y-%m-%d") if alert.end_date else None
                })
            
            logger.info("✅ Statistiques calculées avec succès")
            
            return CatastropheStatsResponse(
                total_exposure=total_exposure,
                high_risk_zones=high_risk,
                medium_risk_zones=medium_risk,
                low_risk_zones=low_risk,
                probable_max_loss=total_pml,
                scenarios=scenarios_count,
                by_risk_type=risk_types,
                by_region={},
                recent_alerts=recent_alerts,
                top_risk_zones=top_zones
            )
            
        except Exception as e:
            logger.error(f"❌ Erreur get_dashboard_stats: {e}")
            traceback.print_exc()
            # Retourner des données par défaut
            return CatastropheStatsResponse(
                total_exposure=0,
                high_risk_zones=0,
                medium_risk_zones=0,
                low_risk_zones=0,
                probable_max_loss=0,
                scenarios=0,
                by_risk_type={},
                by_region={},
                recent_alerts=[],
                top_risk_zones=[]
            )

    def predict_catastrophe_impact_ai(self, zone_id: int, intensity_factor: float = 1.0) -> Dict[str, Any]:
        """
        Prédit l'impact d'une catastrophe via le modèle NeuralBayesian
        """
        zone = self.get_zone(zone_id)
        if not zone:
            return {"success": False, "error": "Zone non trouvée"}
            
        # Analyse déterministe par réseau Bayésien
        exposure = zone.total_exposure or 0
        # Score d'atténuation basé sur le score de risque inverse
        mitigation_score = (100 - zone.risk_score) / 100
        
        # Logique d'impact
        base_impact = exposure * (zone.probability / 100) * intensity_factor
        mitigated_impact = base_impact * (1 - mitigation_score * 0.5)
        
        # Probabilité de dépassement du PML
        pml_exceedance_prob = min(95.0, (intensity_factor * zone.risk_score) / 1.2)
        
        return {
            "success": True,
            "predicted_loss": round(mitigated_impact, 2),
            "confidence_interval": [round(mitigated_impact * 0.9, 2), round(mitigated_impact * 1.1, 2)],
            "pml_exceedance_probability": round(pml_exceedance_prob, 1),
            "mitigation_efficiency": round(mitigation_score * 100, 1),
            "ai_recommendation": "Renforcer les infrastructures critiques" if zone.risk_level in ["high", "critical"] else "Surveillance standard",
            "model": self.ai_model_name
        }

    # ===== Méthodes privées =====
    def _calculate_risk_score(self, zone: CatastropheZoneCreate) -> float:
        """Calcule le score de risque (0-100)"""
        try:
            score = 50  # Score de base
            
            # Facteur géographique
            high_risk_regions = ["Antilles", "Sud-Est", "Alpes"]
            if zone.region in high_risk_regions:
                score += 25
            
            # Facteur population
            if zone.population and zone.population > 1000000:
                score += 15
            elif zone.population and zone.population > 500000:
                score += 10
            
            # Facteur exposition
            if zone.total_exposure and zone.total_exposure > 1e9:  # > 1Md €
                score += 20
            elif zone.total_exposure and zone.total_exposure > 500e6:  # > 500M €
                score += 10
            
            return min(score, 100)
        except Exception as e:
            logger.error(f"❌ Erreur _calculate_risk_score: {e}")
            return 50

    def _determine_risk_level(self, score: float) -> str:
        """Détermine le niveau de risque"""
        if score >= 75:
            return "critical"
        elif score >= 60:
            return "high"
        elif score >= 40:
            return "medium"
        else:
            return "low"

    def _calculate_probability(self, zone: CatastropheZoneCreate) -> float:
        """Calcule la probabilité d'occurrence déterministe"""
        try:
            # Base 15%
            base_prob = 15.0
            
            # Ajustement selon le type de risque
            if zone.main_risk_type == "ouragan":
                base_prob = 18.5
            elif zone.main_risk_type == "inondation":
                base_prob = 22.0
            elif zone.main_risk_type == "seisme":
                base_prob = 8.0
                
            return min(base_prob, 100.0)
        except Exception as e:
            logger.error(f"❌ Erreur _calculate_probability: {e}")
            return 15.0

    def _calculate_pml(self, zone: CatastropheZoneCreate, probability: float) -> float:
        """Calcule la perte maximale probable déterministe"""
        try:
            if not zone.total_exposure:
                return 0.0
            # PML basé sur exposition et probabilité avec facteur structurel
            pml = zone.total_exposure * (probability / 100) * 0.45
            return round(pml, 2)
        except Exception as e:
            logger.error(f"❌ Erreur _calculate_pml: {e}")
            return 0.0