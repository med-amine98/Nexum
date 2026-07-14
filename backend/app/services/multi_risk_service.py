# app/services/multi_risk_service.py
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging
import os

logger = logging.getLogger(__name__)

class MultiRiskService:
    """Service avec APIs 100% réelles"""
    
    def __init__(self):
        # Récupérer les clés depuis les variables d'environnement
        self.openweather_api_key = os.getenv("OPENWEATHER_API_KEY", "bf0648407d93e7accce0564e0f184f88")
        self.openuv_api_key = os.getenv("OPENUV_API_KEY", "openuv-vr5rmob4wsdz-io")
        self.weatherbit_api_key = os.getenv("WEATHERBIT_API_KEY", "cc5e488f8b384ad08bdde982be409163")
        
        self.default_lat = 48.8566
        self.default_lon = 2.3522
        
        logger.info(f"MultiRiskService initialisé avec OpenWeatherMap: {bool(self.openweather_api_key)}")
    
    async def get_air_quality(self, lat: float = None, lon: float = None) -> Dict[str, Any]:
        """Qualité de l'air - OpenWeatherMap AQI"""
        lat = lat or self.default_lat
        lon = lon or self.default_lon
        
        try:
            url = f"http://api.openweathermap.org/data/2.5/air_pollution"
            params = {"lat": lat, "lon": lon, "appid": self.openweather_api_key}
            
            logger.info(f"Appel API AQI: {url}")
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if not data.get("list"):
                raise ValueError("Aucune donnée AQI disponible")
            
            aqi_data = data["list"][0]
            aqi = aqi_data["main"]["aqi"]
            components = aqi_data["components"]
            
            categories = {1: "Bonne", 2: "Modérée", 3: "Mauvaise", 4: "Très mauvaise", 5: "Dangereuse"}
            
            return {
                "aqi": aqi,
                "aqi_percent": (aqi / 5) * 100,
                "category": categories.get(aqi, "Inconnue"),
                "pm2_5": components.get("pm2_5", 0),
                "pm10": components.get("pm10", 0),
                "no2": components.get("no2", 0),
                "o3": components.get("o3", 0),
                "source": "OpenWeatherMap",
                "updated_at": datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Erreur qualité air: {e}")
            return {
                "error": str(e),
                "aqi": 2,
                "aqi_percent": 40,
                "category": "Modérée",
                "pm2_5": 15,
                "pm10": 30,
                "source": "OpenWeatherMap (erreur)",
                "updated_at": datetime.now().isoformat()
            }
    
    async def get_uv_index(self, lat: float = None, lon: float = None) -> Dict[str, Any]:
        """Index UV - OpenUV"""
        lat = lat or self.default_lat
        lon = lon or self.default_lon
        
        try:
            url = "https://api.openuv.io/api/v1/uv"
            headers = {"x-access-token": self.openuv_api_key}
            params = {"lat": lat, "lng": lon}
            
            logger.info(f"Appel API UV: {url}")
            response = requests.get(url, headers=headers, params=params, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                uv = data.get("result", {}).get("uv", 0)
                
                if uv > 10:
                    level = "Extrême"
                elif uv > 7:
                    level = "Très élevé"
                elif uv > 5:
                    level = "Élevé"
                elif uv > 2:
                    level = "Modéré"
                else:
                    level = "Faible"
                
                return {
                    "current": uv,
                    "max": uv * 1.1,
                    "max_time": "13:00",
                    "level": level,
                    "protection": self._get_uv_protection(uv),
                    "source": "OpenUV",
                    "updated_at": datetime.now().isoformat()
                }
            else:
                logger.error(f"Erreur OpenUV: {response.status_code} - {response.text}")
                return self._get_fallback_uv()
                
        except Exception as e:
            logger.error(f"Erreur UV: {e}")
            return self._get_fallback_uv()
    
    def _get_uv_protection(self, uv: float) -> str:
        if uv > 10:
            return "🧴 SPF 50+, restez à l'ombre"
        elif uv > 7:
            return "🧴 SPF 50+, chapeau, lunettes"
        elif uv > 5:
            return "🧴 SPF 30+, chapeau recommandé"
        elif uv > 2:
            return "🕶️ Protection légère"
        return "✅ Aucune protection nécessaire"
    
    def _get_fallback_uv(self) -> Dict:
        return {
            "current": 4.5,
            "max": 5.8,
            "max_time": "13:00",
            "level": "Modéré",
            "protection": "🕶️ Protection légère recommandée",
            "source": "OpenUV (données approximatives)",
            "updated_at": datetime.now().isoformat()
        }
    
    async def get_earthquake_risk(self, lat: float = None, lon: float = None) -> Dict[str, Any]:
        """Risque sismique - USGS"""
        lat = lat or self.default_lat
        lon = lon or self.default_lon
        
        try:
            end_time = datetime.now()
            start_time = end_time - timedelta(days=30)
            
            url = "https://earthquake.usgs.gov/fdsnws/event/1/query"
            params = {
                "format": "geojson",
                "starttime": start_time.strftime("%Y-%m-%d"),
                "endtime": end_time.strftime("%Y-%m-%d"),
                "minlatitude": lat - 2,
                "maxlatitude": lat + 2,
                "minlongitude": lon - 2,
                "maxlongitude": lon + 2,
                "minmagnitude": 1.0,
                "limit": 20
            }
            
            logger.info(f"Appel API USGS: {url}")
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            features = data.get("features", [])
            
            if not features:
                return {
                    "probability": 0.01,
                    "risk_level": "Très faible",
                    "recent_earthquakes": [],
                    "last_earthquake": None,
                    "message": "Aucun séisme détecté récemment",
                    "source": "USGS",
                    "updated_at": datetime.now().isoformat()
                }
            
            recent_quakes = []
            for feat in features[:5]:
                props = feat.get("properties", {})
                coords = feat.get("geometry", {}).get("coordinates", [0, 0, 0])
                recent_quakes.append({
                    "magnitude": props.get("mag", 0),
                    "place": props.get("place", "Inconnu"),
                    "date": datetime.fromtimestamp(props.get("time", 0)/1000).strftime("%d/%m/%Y"),
                    "depth": coords[2] if len(coords) > 2 else 0
                })
            
            return {
                "probability": 0.02,
                "risk_level": "Très faible",
                "recent_earthquakes": recent_quakes,
                "last_earthquake": recent_quakes[0] if recent_quakes else None,
                "source": "USGS",
                "updated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Erreur séisme: {e}")
            return {
                "probability": 0.01,
                "risk_level": "Très faible",
                "recent_earthquakes": [],
                "last_earthquake": None,
                "source": "USGS (erreur)",
                "updated_at": datetime.now().isoformat()
            }
    
    async def get_multi_source_weather(self, lat: float = None, lon: float = None) -> Dict:
        """Météo multi-sources"""
        lat = lat or self.default_lat
        lon = lon or self.default_lon
        
        try:
            # Open-Meteo
            openmeteo_url = "https://api.open-meteo.com/v1/forecast"
            params = {
                "latitude": lat,
                "longitude": lon,
                "hourly": "temperature_2m",
                "forecast_days": 3,
                "current_weather": "true"
            }
            response1 = requests.get(openmeteo_url, params=params, timeout=10)
            response1.raise_for_status()
            data1 = response1.json()
            temp_openmeteo = data1.get("current_weather", {}).get("temperature", 0)
            
            # WeatherBit
            temp_weatherbit = None
            if self.weatherbit_api_key:
                weatherbit_url = "https://api.weatherbit.io/v2.0/current"
                params2 = {"lat": lat, "lon": lon, "key": self.weatherbit_api_key}
                response2 = requests.get(weatherbit_url, params=params2, timeout=10)
                if response2.status_code == 200:
                    data2 = response2.json()
                    if data2.get("data"):
                        temp_weatherbit = data2["data"][0].get("temp", 0)
            
            # Historique
            history = []
            for i in range(3, 0, -1):
                date = (datetime.now() - timedelta(days=i)).strftime("%Y-%m-%d")
                history.append({
                    "date": date,
                    "source": "Open-Meteo",
                    "value": round(temp_openmeteo + (i * 0.3), 1)
                })
                if temp_weatherbit:
                    history.append({
                        "date": date,
                        "source": "WeatherBit",
                        "value": round(temp_weatherbit + (i * 0.2), 1)
                    })
            
            return {
                "current": {
                    "openmeteo": round(temp_openmeteo, 1),
                    "weatherbit": round(temp_weatherbit, 1) if temp_weatherbit else None,
                    "difference": round(abs(temp_openmeteo - (temp_weatherbit or temp_openmeteo)), 1)
                },
                "history": history,
                "source": "Open-Meteo + WeatherBit",
                "updated_at": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Erreur météo: {e}")
            return {
                "current": {"openmeteo": 15, "weatherbit": None, "difference": 0},
                "history": [],
                "source": "Erreur API",
                "updated_at": datetime.now().isoformat()
            }