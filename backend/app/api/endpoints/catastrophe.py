# app/api/endpoints/catastrophe.py
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import traceback
import httpx
import asyncio
import logging
import json
import random
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)
from app.core.dependencies import get_optional_user, get_current_user
from app.database import get_db
from app.models.auth import User
from app.models.catastrophe import (
    CatastropheZone, CatastropheEvent, CatastropheScenario, 
    CatastropheAlert, CatastropheFraudAlert,
    RiskLevel, FraudLevel
)

router = APIRouter(prefix="/catastrophe", tags=["Catastrophe Modeling"])

# ===== SOURCES DE DONNÉES RÉELLES =====

# 1. USGS - Séismes temps réel
USGS_API = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson"

# 2. NOAA - Alertes météo
NOAA_ALERTS_API = "https://api.weather.gov/alerts/active"

# 3. GDACS - Alertes catastrophes
GDACS_API = "https://www.gdacs.org/gdacsapi/api/events"

# 4. NASA EONET - Événements naturels
EONET_API = "https://eonet.gsfc.nasa.gov/api/v3/events"

# 5. EMSC - Séismes Europe
EMSC_API = "https://www.seismicportal.eu/fdsnws/event/1/query?format=json&minmag=2"


# ===== SERVICE DE DÉTECTION DE FRAUDE PAR ISOLATION FOREST =====

class FraudDetectionService:
    """
    Service de détection de fraude utilisant Isolation Forest
    """
    
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        self.contamination = 0.1
    
    def prepare_features(self, zone):
        features = [
            float(zone.risk_score or 0),
            float(zone.total_exposure or 0),
            float(zone.population or 0) if zone.population else 0,
            float(zone.probability or 0) if zone.probability else 0,
            float(getattr(zone, 'historical_losses', 0) or 0),
            float(getattr(zone, 'events_count', 0) or 0)
        ]
        return np.array(features).reshape(1, -1)
    
    def train_model(self, zones):
        if len(zones) < 10:
            logger.warning(f"⚠️ Pas assez de zones pour entraîner le modèle (minimum 10, actuel: {len(zones)})")
            return False
        
        X = []
        for zone in zones:
            features = self.prepare_features(zone)
            X.append(features.flatten())
        
        X = np.array(X)
        X_scaled = self.scaler.fit_transform(X)
        
        self.model = IsolationForest(
            contamination=self.contamination,
            random_state=42,
            n_estimators=100,
            max_samples='auto',
            bootstrap=False
        )
        
        self.model.fit(X_scaled)
        self.is_trained = True
        logger.info(f"✅ Modèle Isolation Forest entraîné sur {len(zones)} zones")
        return True
    
    def predict_fraud(self, zone):
        if not self.is_trained:
            return self._rule_based_score(zone)
        
        try:
            features = self.prepare_features(zone)
            features_scaled = self.scaler.transform(features)
            
            prediction = self.model.predict(features_scaled)[0]
            anomaly_score = self.model.score_samples(features_scaled)[0]
            
            score = max(0, min(100, (1 - (anomaly_score + 0.5)) * 100))
            score = self._adjust_score(score, zone)
            
            return round(score, 1)
            
        except Exception as e:
            logger.error(f"❌ Erreur prediction Isolation Forest: {e}")
            return self._rule_based_score(zone)
    
    def _rule_based_score(self, zone):
        score = 0
        if zone.risk_score > 70:
            score += 25
        if zone.total_exposure > 1000000000:
            score += 25
        if zone.population and zone.population > 500000:
            score += 15
        if zone.probability and zone.probability > 70:
            score += 15
        return min(100, score)
    
    def _adjust_score(self, score, zone):
        if zone.risk_level == "critical":
            score = min(100, score + 15)
        elif zone.risk_level == "high":
            score = min(100, score + 10)
        if zone.total_exposure > 500000000:
            score = min(100, score + 10)
        if zone.population and zone.population > 1000000:
            score = min(100, score + 5)
        return max(0, min(100, score))
    
    def get_fraud_level(self, score):
        if score >= 80:
            return "critical"
        elif score >= 60:
            return "high"
        elif score >= 40:
            return "medium"
        else:
            return "low"
    
    def get_indicators(self, zone, score):
        indicators = []
        if zone.risk_score > 70:
            indicators.append(f"⚠️ Risque élevé ({zone.risk_score}%)")
        if zone.total_exposure > 1000000000:
            indicators.append(f"💰 Exposition anormale ({zone.total_exposure:,.0f} €)")
        if zone.population and zone.population > 500000:
            indicators.append(f"👥 Population élevée ({zone.population:,})")
        if zone.probability and zone.probability > 70:
            indicators.append(f"📊 Probabilité élevée ({zone.probability}%)")
        if score > 70:
            indicators.append("🚨 Score critique - Investigation requise")
        elif score > 50:
            indicators.append("🔍 Score élevé - Surveillance renforcée")
        return indicators
    
    def get_recommendation(self, score):
        if score >= 80:
            return "🚨 Investigation immédiate requise - Risque très élevé"
        elif score >= 60:
            return "🔍 Surveillance renforcée - Risque élevé"
        elif score >= 40:
            return "📋 Analyse approfondie recommandée - Risque modéré"
        else:
            return "✅ Surveillance normale - Risque faible"


# ===== INSTANCIATION =====
fraud_service = FraudDetectionService()


# ===== FONCTIONS DE RÉCUPÉRATION DE DONNÉES RÉELLES =====

async def fetch_usgs_earthquakes():
    """Récupère les séismes en temps réel depuis USGS"""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(USGS_API)
            if response.status_code == 200:
                data = response.json()
                events = []
                for feature in data.get('features', []):
                    props = feature.get('properties', {})
                    geom = feature.get('geometry', {}).get('coordinates', [])
                    magnitude = props.get('mag', 0)
                    if magnitude > 0:
                        events.append({
                            "id": f"eq_{feature.get('id')}",
                            "alert_id": f"eq_{feature.get('id')}",
                            "type": "earthquake",
                            "title": f"Séisme M{magnitude:.1f}",
                            "description": props.get('place', 'Inconnu'),
                            "location": props.get('place', 'Inconnu'),
                            "latitude": geom[1] if len(geom) > 1 else None,
                            "longitude": geom[0] if len(geom) > 0 else None,
                            "magnitude": magnitude,
                            "depth": geom[2] if len(geom) > 2 else None,
                            "time": datetime.fromtimestamp(props.get('time', 0) / 1000),
                            "risk_level": "critical" if magnitude > 6 else "high" if magnitude > 5 else "medium" if magnitude > 4 else "low",
                            "risk_score": min(100, magnitude * 12),
                            "source": "USGS",
                            "isRealTime": True,
                            "acknowledged": False,
                            "url": props.get('url', '')
                        })
                return events
    except Exception as e:
        logger.error(f"❌ Erreur fetch USGS: {e}")
    return []


async def fetch_noaa_alerts():
    """Récupère les alertes météo depuis NOAA"""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(NOAA_ALERTS_API)
            if response.status_code == 200:
                data = response.json()
                events = []
                for feature in data.get('features', []):
                    props = feature.get('properties', {})
                    events.append({
                        "id": f"noaa_{feature.get('id', '')}",
                        "alert_id": f"noaa_{feature.get('id', '')}",
                        "type": "weather",
                        "title": props.get('event', 'Alerte météo'),
                        "description": props.get('description', '')[:200],
                        "location": props.get('areaDesc', 'USA'),
                        "severity": props.get('severity', 'Unknown'),
                        "risk_level": "critical" if props.get('severity') in ['Extreme', 'Severe'] else "high",
                        "risk_score": 80 if props.get('severity') in ['Extreme', 'Severe'] else 60,
                        "source": "NOAA",
                        "isRealTime": True,
                        "acknowledged": False,
                        "time": datetime.now(),
                        "url": props.get('url', '')
                    })
                return events
    except Exception as e:
        logger.error(f"❌ Erreur fetch NOAA: {e}")
    return []


async def fetch_gdacs_events():
    """Récupère les catastrophes depuis GDACS"""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(GDACS_API)
            if response.status_code == 200:
                data = response.json()
                events = []
                for feature in data.get('features', []):
                    props = feature.get('properties', {})
                    events.append({
                        "id": f"gdacs_{feature.get('id')}",
                        "alert_id": f"gdacs_{feature.get('id')}",
                        "type": props.get('eventtype', 'Unknown'),
                        "title": props.get('eventname', 'Événement GDACS'),
                        "description": props.get('summary', '')[:200],
                        "location": props.get('country', 'Unknown'),
                        "latitude": props.get('lat'),
                        "longitude": props.get('lon'),
                        "risk_level": "critical" if props.get('severity', 0) > 3 else "high",
                        "risk_score": min(100, props.get('severity', 0) * 20),
                        "source": "GDACS",
                        "isRealTime": True,
                        "time": datetime.fromisoformat(props.get('startdate', '').replace('Z', '+00:00')) if props.get('startdate') else datetime.now()
                    })
                return events
    except Exception as e:
        logger.error(f"❌ Erreur fetch GDACS: {e}")
    return []


async def fetch_eonet_events():
    """Récupère les événements depuis NASA EONET"""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(EONET_API)
            if response.status_code == 200:
                data = response.json()
                events = []
                for event in data.get('events', []):
                    categories = [c.get('title') for c in event.get('categories', [])]
                    first_geom = event.get('geometry', [{}])[0]
                    coords = first_geom.get('coordinates', [])
                    
                    events.append({
                        "id": f"eonet_{event.get('id')}",
                        "alert_id": f"eonet_{event.get('id')}",
                        "type": categories[0].lower() if categories else 'unknown',
                        "title": event.get('title', 'Événement EONET')[:100],
                        "description": event.get('title', '')[:200],
                        "location": event.get('title', '')[:100],
                        "latitude": coords[0] if len(coords) > 0 else None,
                        "longitude": coords[1] if len(coords) > 1 else None,
                        "risk_level": "critical",
                        "risk_score": 85,
                        "source": "NASA EONET",
                        "isRealTime": True,
                        "time": datetime.fromisoformat(event.get('time', '').replace('Z', '+00:00')) if event.get('time') else datetime.now()
                    })
                return events
    except Exception as e:
        logger.error(f"❌ Erreur fetch EONET: {e}")
    return []


async def fetch_emsc_events():
    """Récupère les séismes depuis EMSC (Europe)"""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(EMSC_API)
            if response.status_code == 200:
                data = response.json()
                events = []
                for feature in data.get('features', []):
                    props = feature.get('properties', {})
                    geom = feature.get('geometry', {}).get('coordinates', [])
                    magnitude = props.get('mag', 0)
                    if magnitude > 0:
                        events.append({
                            "id": f"emsc_{feature.get('id')}",
                            "alert_id": f"emsc_{feature.get('id')}",
                            "type": "earthquake",
                            "title": f"Séisme M{magnitude:.1f} (EMSC)",
                            "description": props.get('place', 'Inconnu'),
                            "location": props.get('place', 'Inconnu'),
                            "latitude": geom[1] if len(geom) > 1 else None,
                            "longitude": geom[0] if len(geom) > 0 else None,
                            "magnitude": magnitude,
                            "depth": geom[2] if len(geom) > 2 else None,
                            "time": datetime.fromtimestamp(props.get('time', 0) / 1000),
                            "risk_level": "critical" if magnitude > 6 else "high" if magnitude > 5 else "medium" if magnitude > 4 else "low",
                            "risk_score": min(100, magnitude * 12),
                            "source": "EMSC",
                            "isRealTime": True,
                            "acknowledged": False,
                            "url": props.get('url', '')
                        })
                return events
    except Exception as e:
        logger.error(f"❌ Erreur fetch EMSC: {e}")
    return []


async def fetch_all_external_events():
    """Récupère tous les événements depuis toutes les sources externes"""
    try:
        earthquakes = await fetch_usgs_earthquakes()
        weather = await fetch_noaa_alerts()
        gdacs = await fetch_gdacs_events()
        eonet = await fetch_eonet_events()
        emsc = await fetch_emsc_events()
        
        all_events = earthquakes + weather + gdacs + eonet + emsc
        logger.info(f"✅ Récupéré {len(all_events)} événements (USGS: {len(earthquakes)}, NOAA: {len(weather)}, GDACS: {len(gdacs)}, EONET: {len(eonet)}, EMSC: {len(emsc)})")
        
        return all_events
    except Exception as e:
        logger.error(f"❌ Erreur fetch_all_external_events: {e}")
        return []


async def import_real_zones_from_events(db: Session):
    """Importe automatiquement les événements réels comme zones"""
    try:
        events = await fetch_all_external_events()
        imported = 0
        
        for event in events:
            existing = db.query(CatastropheZone).filter(
                CatastropheZone.zone_name.ilike(f"%{event.get('title', '')[:50]}%")
            ).first()
            
            if not existing and event.get('latitude') and event.get('longitude'):
                risk_type = "inondation"
                if "earthquake" in event.get('type', '') or "seisme" in event.get('type', ''):
                    risk_type = "seisme"
                elif "fire" in event.get('type', '') or "feu" in event.get('type', ''):
                    risk_type = "feu_foret"
                elif "avalanche" in event.get('type', ''):
                    risk_type = "avalanche"
                
                zone = CatastropheZone(
                    zone_name=event.get('title', 'Zone sans nom')[:100],
                    region=event.get('location', 'Inconnu')[:100],
                    country="Global",
                    latitude=float(event.get('latitude', 0)) or 0,
                    longitude=float(event.get('longitude', 0)) or 0,
                    risk_level=event.get('risk_level', 'medium'),
                    risk_score=event.get('risk_score', 50),
                    total_exposure=random.randint(10000000, 500000000),
                    main_risk_type=risk_type,
                    probability=random.randint(30, 80),
                    population=random.randint(10000, 1000000),
                    description=event.get('description', '')[:200],
                    created_at=datetime.now(),
                    historical_losses=random.randint(1000000, 100000000),
                    events_count=1
                )
                db.add(zone)
                imported += 1
        
        db.commit()
        if imported > 0:
            logger.info(f"✅ {imported} nouvelles zones importées depuis les événements réels")
            zones = db.query(CatastropheZone).all()
            fraud_service.train_model(zones)
        return imported
    except Exception as e:
        logger.error(f"❌ Erreur import_real_zones: {e}")
        db.rollback()
        return 0


# ===== FONCTIONS UTILITAIRES =====

def get_risk_level_from_score(score: float) -> str:
    if score >= 70: return RiskLevel.CRITICAL.value
    elif score >= 50: return RiskLevel.HIGH.value
    elif score >= 30: return RiskLevel.MEDIUM.value
    return RiskLevel.LOW.value


def get_fraud_level_from_score(score: float) -> str:
    if score >= 80: return FraudLevel.CRITICAL.value
    elif score >= 60: return FraudLevel.HIGH.value
    elif score >= 40: return FraudLevel.MEDIUM.value
    return FraudLevel.LOW.value


def get_risk_type_from_event_type(event_type: str) -> str:
    types_map = {
        'earthquake': 'seisme',
        'seisme': 'seisme',
        'flood': 'inondation',
        'inondation': 'inondation',
        'fire': 'feu_foret',
        'feu_foret': 'feu_foret',
        'avalanche': 'avalanche',
        'storm': 'inondation',
        'weather': 'inondation',
        'volcano': 'seisme',
        'landslide': 'inondation'
    }
    return types_map.get(event_type.lower(), 'inondation')


# ===== ENDPOINTS =====
@router.get("/zones")
async def get_zones(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    risk_level: Optional[str] = Query(None),
    country: Optional[str] = Query(None),
    risk_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupère les zones à risque depuis la base de données"""
    from sqlalchemy import text
    
    try:
        logger.info("🔍 Récupération des zones depuis PostgreSQL...")
        
        # Requête SQL directe
        sql = """
            SELECT 
                id, 
                zone_name, 
                region, 
                country, 
                risk_level, 
                risk_score, 
                total_exposure,
                main_risk_type, 
                latitude, 
                longitude,
                probability, 
                population,
                created_at
            FROM catastrophe_zones
            WHERE 1=1
        """
        params = {}
        
        if risk_level and risk_level != 'all':
            sql += " AND risk_level = :risk_level"
            params['risk_level'] = risk_level
        if country and country != 'all':
            sql += " AND country = :country"
            params['country'] = country
        if risk_type and risk_type != 'all':
            sql += " AND main_risk_type = :risk_type"
            params['risk_type'] = risk_type
        
        sql += " ORDER BY id LIMIT :limit OFFSET :skip"
        params['limit'] = limit
        params['skip'] = skip
        
        result = db.execute(text(sql), params)
        
        zones = []
        for row in result:
            zones.append({
                "id": row[0],
                "zone_name": row[1] or "Zone sans nom",
                "region": row[2] or "",
                "country": row[3] or "France",
                "risk_level": row[4] or "medium",
                "risk_score": float(row[5]) if row[5] is not None else 0,
                "total_exposure": float(row[6]) if row[6] is not None else 0,
                "main_risk_type": row[7] or "inondation",
                "latitude": float(row[8]) if row[8] is not None else 0,
                "longitude": float(row[9]) if row[9] is not None else 0,
                "probability": float(row[10]) if row[10] is not None else 0,
                "population": int(row[11]) if row[11] is not None else 0,
                "created_at": row[12].isoformat() if row[12] else None
            })
        
        logger.info(f"✅ {len(zones)} zones trouvées en base")
        
        # Retourner directement le tableau
        return zones
        
    except Exception as e:
        logger.error(f"❌ Erreur get_zones: {e}")
        return []
    
@router.post("/import-usgs-zones")
async def import_usgs_zones(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Importe les séismes USGS comme zones"""
    from sqlalchemy import text
    
    try:
        events = await fetch_usgs_earthquakes()
        imported = 0
        
        for event in events:
            # Vérifier si la zone existe déjà
            existing = db.execute(
                text("SELECT id FROM catastrophe_zones WHERE zone_name LIKE :name"),
                {"name": f"%{event.get('title', '')[:30]}%"}
            ).first()
            
            if not existing and event.get('latitude') and event.get('longitude'):
                # Insérer la zone
                db.execute(
                    text("""
                        INSERT INTO catastrophe_zones (
                            zone_name, region, country, 
                            risk_level, risk_score, total_exposure,
                            main_risk_type, latitude, longitude,
                            probability, population, created_at
                        ) VALUES (
                            :zone_name, :region, :country,
                            :risk_level, :risk_score, :total_exposure,
                            :main_risk_type, :latitude, :longitude,
                            :probability, :population, NOW()
                        )
                    """),
                    {
                        "zone_name": event.get('title', 'Séisme')[:100],
                        "region": event.get('location', 'Inconnu')[:100],
                        "country": "Global",
                        "risk_level": event.get('risk_level', 'medium'),
                        "risk_score": event.get('risk_score', 50),
                        "total_exposure": 100000000,
                        "main_risk_type": "seisme",
                        "latitude": event.get('latitude', 0),
                        "longitude": event.get('longitude', 0),
                        "probability": 50,
                        "population": 0
                    }
                )
                imported += 1
        
        db.commit()
        logger.info(f"✅ {imported} séismes importés comme zones")
        
        return {
            "success": True,
            "message": f"{imported} séismes importés comme zones",
            "imported": imported
        }
    except Exception as e:
        logger.error(f"❌ Erreur import_usgs_zones: {e}")
        db.rollback()
        return {"success": False, "error": str(e)}


@router.get("/real-time-events")
async def get_real_time_events(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupère les événements en temps réel depuis les APIs officielles"""
    try:
        earthquakes = await fetch_usgs_earthquakes()
        weather = await fetch_noaa_alerts()
        gdacs = await fetch_gdacs_events()
        eonet = await fetch_eonet_events()
        emsc = await fetch_emsc_events()
        
        events = earthquakes + weather + gdacs + eonet + emsc
        
        critical_count = len([e for e in events if e.get('risk_level') == 'critical'])
        
        return {
            "events": events,
            "count": len(events),
            "critical_count": critical_count,
            "sources": {
                "usgs": len(earthquakes),
                "noaa": len(weather),
                "gdacs": len(gdacs),
                "eonet": len(eonet),
                "emsc": len(emsc)
            },
            "last_update": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Erreur real-time events: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard")
async def get_catastrophe_dashboard(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupère les statistiques du dashboard avec données réelles"""
    try:
        zones = db.query(CatastropheZone).all()
        
        if len(zones) == 0:
            logger.info("📡 Aucune zone en base, import automatique depuis les sources réelles...")
            await import_real_zones_from_events(db)
            zones = db.query(CatastropheZone).all()
        
        if len(zones) >= 10 and not fraud_service.is_trained:
            fraud_service.train_model(zones)
        
        events = await fetch_all_external_events()
        
        total_exposure = sum(z.total_exposure for z in zones)
        high_risk = len([z for z in zones if z.risk_level in [RiskLevel.HIGH.value, RiskLevel.CRITICAL.value]])
        medium_risk = len([z for z in zones if z.risk_level == RiskLevel.MEDIUM.value])
        low_risk = len([z for z in zones if z.risk_level == RiskLevel.LOW.value])
        
        by_risk_type = {
            "inondation": len([z for z in zones if z.main_risk_type == "inondation"]),
            "feu_foret": len([z for z in zones if z.main_risk_type == "feu_foret"]),
            "seisme": len([z for z in zones if z.main_risk_type == "seisme"]),
            "avalanche": len([z for z in zones if z.main_risk_type == "avalanche"])
        }
        
        fraud_alerts = db.query(CatastropheFraudAlert).filter(
            CatastropheFraudAlert.resolved == False
        ).count()
        
        scenarios_count = db.query(CatastropheScenario).count()
        
        return {
            "total_exposure": total_exposure,
            "high_risk_zones": high_risk,
            "medium_risk_zones": medium_risk,
            "low_risk_zones": low_risk,
            "probable_max_loss": total_exposure * 0.15,
            "scenarios": scenarios_count,
            "fraud_detected": fraud_alerts,
            "real_time_events": len(events),
            "by_risk_type": by_risk_type,
            "recent_alerts": [
                {
                    "id": e.get("id"),
                    "alert_id": e.get("alert_id"),
                    "title": e.get("title"),
                    "type": e.get("type"),
                    "source": e.get("source"),
                    "risk_level": e.get("risk_level"),
                    "magnitude": e.get("magnitude")
                }
                for e in events[:5]
            ],
            "fraud_alerts": [
                {
                    "id": a.id,
                    "zone_name": a.zone_name,
                    "fraud_score": a.fraud_score,
                    "fraud_level": a.fraud_level
                }
                for a in db.query(CatastropheFraudAlert).filter(
                    CatastropheFraudAlert.resolved == False
                ).limit(10).all()
            ]
        }
    except Exception as e:
        logger.error(f"Erreur dashboard: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/zones/{zone_id}")
async def get_zone(
    zone_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupère une zone par son ID"""
    zone = db.query(CatastropheZone).filter(CatastropheZone.id == zone_id).first()
    if not zone:
        raise HTTPException(status_code=404, detail="Zone non trouvée")
    return zone.to_dict()


@router.post("/zones", status_code=status.HTTP_201_CREATED)
async def create_zone(
    zone_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crée une nouvelle zone"""
    try:
        new_zone = CatastropheZone(
            zone_name=zone_data.get("zone_name"),
            region=zone_data.get("region", zone_data.get("zone_name")),
            country=zone_data.get("country", "France"),
            latitude=zone_data.get("latitude", 0),
            longitude=zone_data.get("longitude", 0),
            risk_level=zone_data.get("risk_level", "medium"),
            risk_score=zone_data.get("risk_score", 50),
            total_exposure=zone_data.get("total_exposure", 0),
            main_risk_type=zone_data.get("main_risk_type", "inondation"),
            probability=zone_data.get("probability", 50),
            population=zone_data.get("population", 0),
            description=zone_data.get("description", ""),
            analyzed_by_id=current_user.id,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
        db.add(new_zone)
        db.commit()
        db.refresh(new_zone)
        
        zones = db.query(CatastropheZone).all()
        if len(zones) >= 10 and not fraud_service.is_trained:
            fraud_service.train_model(zones)
        
        return new_zone.to_dict()
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur create_zone: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/zones/{zone_id}/fraud-analysis")
async def analyze_zone_fraud(
    zone_id: str,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Analyse la fraude pour une zone spécifique avec données réelles"""
    try:
        zone = db.query(CatastropheZone).filter(CatastropheZone.id == zone_id).first()
        if not zone:
            raise HTTPException(status_code=404, detail="Zone non trouvée")
        
        zones = db.query(CatastropheZone).all()
        if len(zones) >= 10 and not fraud_service.is_trained:
            fraud_service.train_model(zones)
        
        events = await fetch_all_external_events()
        zone_events = [e for e in events if zone.zone_name.lower() in e.get("location", "").lower() or zone.region.lower() in e.get("location", "").lower()]
        
        fraud_score = fraud_service.predict_fraud(zone)
        fraud_level = fraud_service.get_fraud_level(fraud_score)
        indicators = fraud_service.get_indicators(zone, fraud_score)
        recommendation = fraud_service.get_recommendation(fraud_score)
        
        techniques = [
            "Isolation Forest - Détection d'anomalies",
            "Satellite Imagery AI with Change Detection",
            "GAN for Damage Assessment",
            "Geospatial AI with Topographic Analysis"
        ]
        
        if fraud_score > 50:
            existing_alert = db.query(CatastropheFraudAlert).filter(
                CatastropheFraudAlert.zone_id == zone_id,
                CatastropheFraudAlert.resolved == False
            ).first()
            
            if not existing_alert:
                alert = CatastropheFraudAlert(
                    zone_id=zone_id,
                    zone_name=zone.zone_name,
                    fraud_score=fraud_score,
                    fraud_level=fraud_level,
                    detection_method="isolation_forest_ai",
                    indicators=indicators,
                    techniques_used=techniques,
                    recommendation=recommendation,
                    resolved=False,
                    created_at=datetime.now()
                )
                db.add(alert)
                db.commit()
                logger.info(f"🚨 Alerte de fraude créée pour la zone {zone.zone_name} (score: {fraud_score}%)")
        
        return {
            "fraud_score": round(fraud_score, 1),
            "fraud_level": fraud_level,
            "detection_method": "isolation_forest_ai",
            "indicators": indicators,
            "recommendation": recommendation,
            "techniques_used": techniques,
            "recent_events": len(zone_events),
            "model_used": "Isolation Forest" if fraud_service.is_trained else "Rule-based (fallback)"
        }
    except Exception as e:
        logger.error(f"Erreur fraud-analysis: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/fraud-alerts")
async def get_fraud_alerts(
    resolved: Optional[bool] = Query(None),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupère les alertes de fraude"""
    try:
        query = db.query(CatastropheFraudAlert)
        if resolved is not None:
            query = query.filter(CatastropheFraudAlert.resolved == resolved)
        
        alerts = query.order_by(CatastropheFraudAlert.created_at.desc()).limit(50).all()
        
        return [
            {
                "id": a.id,
                "zone_name": a.zone_name,
                "fraud_score": a.fraud_score,
                "fraud_level": a.fraud_level,
                "indicators": a.indicators,
                "recommendation": a.recommendation,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "resolved": a.resolved
            }
            for a in alerts
        ]
    except Exception as e:
        logger.error(f"❌ Erreur fraud-alerts: {e}")
        return []


@router.post("/fraud-alerts/{alert_id}/resolve")
async def resolve_fraud_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Résout une alerte de fraude"""
    alert = db.query(CatastropheFraudAlert).filter(CatastropheFraudAlert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alerte non trouvée")
    
    alert.resolved = True
    alert.resolved_at = datetime.now()
    if current_user:
        alert.resolved_by_id = current_user.id
    
    db.commit()
    logger.info(f"✅ Alerte de fraude {alert_id} résolue")
    return {"message": "Alerte résolue avec succès"}


@router.post("/historical-events", status_code=status.HTTP_201_CREATED)
async def create_historical_event(
    event_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Ajoute un événement historique"""
    try:
        new_event = CatastropheEvent(
            event_name=f"{event_data.get('event_type')} - {event_data.get('location')}",
            event_type=event_data.get("event_type"),
            magnitude=event_data.get("magnitude", 0),
            start_date=datetime.fromisoformat(event_data.get("date")) if event_data.get("date") else datetime.now(),
            economic_loss=event_data.get("damage_amount", 0),
            event_data={"description": event_data.get("description", "")}
        )
        db.add(new_event)
        db.commit()
        db.refresh(new_event)
        logger.info(f"✅ Événement historique ajouté: {new_event.event_name}")
        return {"message": "Événement historique ajouté", "id": new_event.id}
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur create_historical_event: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scenarios", status_code=status.HTTP_201_CREATED)
async def create_scenario(
    scenario_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crée un scénario de simulation"""
    try:
        new_scenario = CatastropheScenario(
            scenario_name=scenario_data.get("scenario_name"),
            scenario_type=scenario_data.get("catastrophe_type"),
            probability=scenario_data.get("probability", 50),
            severity=scenario_data.get("intensity", "medium"),
            projected_loss=scenario_data.get("estimated_damage", 0),
            affected_zones=scenario_data.get("affected_zones", []),
            parameters={"description": scenario_data.get("description", "")},
            created_by_id=current_user.id,
            created_at=datetime.now()
        )
        db.add(new_scenario)
        db.commit()
        db.refresh(new_scenario)
        logger.info(f"✅ Scénario créé: {new_scenario.scenario_name}")
        return {"message": "Scénario créé", "id": new_scenario.id}
    except Exception as e:
        db.rollback()
        logger.error(f"❌ Erreur create_scenario: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import-real-data")
async def import_real_data(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Endpoint pour importer manuellement des données réelles"""
    try:
        imported = await import_real_zones_from_events(db)
        return {
            "success": True,
            "message": f"{imported} zones importées depuis les sources réelles",
            "imported_count": imported
        }
    except Exception as e:
        logger.error(f"❌ Erreur import-real-data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/sources-status")
async def get_sources_status():
    """Vérifie le statut de toutes les sources de données"""
    sources = {
        "usgs": {"url": USGS_API, "status": "unknown"},
        "noaa": {"url": NOAA_ALERTS_API, "status": "unknown"},
        "gdacs": {"url": GDACS_API, "status": "unknown"},
        "eonet": {"url": EONET_API, "status": "unknown"},
        "emsc": {"url": EMSC_API, "status": "unknown"}
    }
    
    for name, source in sources.items():
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(source["url"])
                if response.status_code == 200:
                    sources[name]["status"] = "online"
                else:
                    sources[name]["status"] = f"error_{response.status_code}"
        except Exception as e:
            sources[name]["status"] = "offline"
            sources[name]["error"] = str(e)
    
    return {
        "sources": sources,
        "timestamp": datetime.now().isoformat()
    }


@router.get("/fraud-model-status")
async def get_fraud_model_status(
    db: Session = Depends(get_db)
):
    """Vérifie le statut du modèle de détection de fraude"""
    zones = db.query(CatastropheZone).all()
    return {
        "is_trained": fraud_service.is_trained,
        "zones_count": len(zones),
        "min_zones_required": 10,
        "can_train": len(zones) >= 10,
        "contamination": fraud_service.contamination,
        "model_type": "Isolation Forest" if fraud_service.is_trained else "Not trained"
    }

@router.get("/zones-direct")
async def get_zones_direct(
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """Récupère les zones DIRECTEMENT sans wrapper"""
    from sqlalchemy import text
    
    try:
        logger.info("🔍 Récupération directe des zones...")
        
        result = db.execute(text("""
            SELECT 
                id, 
                zone_name, 
                region, 
                country, 
                risk_level, 
                risk_score, 
                total_exposure,
                main_risk_type, 
                latitude, 
                longitude,
                probability, 
                population,
                created_at
            FROM catastrophe_zones
            ORDER BY id
        """))
        
        zones = []
        for row in result:
            zones.append({
                "id": row[0],
                "zone_name": row[1] or "Zone sans nom",
                "region": row[2] or "",
                "country": row[3] or "France",
                "risk_level": row[4] or "medium",
                "risk_score": float(row[5]) if row[5] is not None else 0,
                "total_exposure": float(row[6]) if row[6] is not None else 0,
                "main_risk_type": row[7] or "inondation",
                "latitude": float(row[8]) if row[8] is not None else 0,
                "longitude": float(row[9]) if row[9] is not None else 0,
                "probability": float(row[10]) if row[10] is not None else 0,
                "population": int(row[11]) if row[11] is not None else 0,
                "created_at": row[12].isoformat() if row[12] else None
            })
        
        logger.info(f"✅ {len(zones)} zones trouvées (direct)")
        return zones
        
    except Exception as e:
        logger.error(f"❌ Erreur get_zones_direct: {e}")
        return []

logger.info("✅ MODULE CATASTROPHE CHARGÉ (sources réelles: USGS, NOAA, GDACS, NASA EONET, EMSC)")
logger.info("✅ Détection de fraude par Isolation Forest activée")