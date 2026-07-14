// frontend/src/services/realTimeDataService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

class RealTimeDataService {
  constructor() {
    this.sources = {
      // Sources de catastrophes naturelles
      usgs: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
      gdacs: 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/EVENTS',
      ecdc: 'https://opendata.ecdc.europa.eu/...',
      // Sources de conflits
      acled: 'https://api.acleddata.com/acled/read',
      unocha: 'https://api.unocha.org/...',
      // Sources météo
      openweather: 'https://api.openweathermap.org/data/2.5/weather',
    };
  }

  async fetchEarthquakes() {
    try {
      const response = await axios.get(this.sources.usgs);
      return response.data.features.map(feature => ({
        id: feature.id,
        type: 'earthquake',
        title: `Séisme M${feature.properties.mag}`,
        location: feature.properties.place,
        latitude: feature.geometry.coordinates[1],
        longitude: feature.geometry.coordinates[0],
        magnitude: feature.properties.mag,
        depth: feature.geometry.coordinates[2],
        time: new Date(feature.properties.time),
        risk_level: feature.properties.mag > 6 ? 'critical' : 
                     feature.properties.mag > 4 ? 'high' : 'medium',
        icon: '🌍'
      }));
    } catch (error) {
      console.error('Erreur chargement séismes:', error);
      return [];
    }
  }

  async fetchFloods() {
    // Remplacer par appel API réel
    return [];
  }

  async fetchFires() {
    // Remplacer par appel API réel
    return [];
  }

  async fetchConflicts() {
    try {
      // Remplacer par appel API réel
      return [];
    } catch (error) {
      console.error('Erreur chargement conflits:', error);
      return [];
    }
  }

  async fetchWeatherAlerts() {
    // Remplacer par appel API réel
    return [];
  }

  async fetchAllEvents() {
    try {
      const [
        earthquakes,
        floods,
        fires,
        conflicts,
        weather
      ] = await Promise.all([
        this.fetchEarthquakes(),
        this.fetchFloods(),
        this.fetchFires(),
        this.fetchConflicts(),
        this.fetchWeatherAlerts()
      ]);

      return [...earthquakes, ...floods, ...fires, ...conflicts, ...weather];
    } catch (error) {
      console.error('Erreur chargement événements:', error);
      return [];
    }
  }

  // WebSocket pour les données en temps réel
  connectWebSocket(onMessage) {
    const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';
    const ws = new WebSocket(`${WS_URL}/ws/alerts`);
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.error('WebSocket parse error:', err);
      }
    };
    
    ws.onopen = () => console.log('WebSocket connected');
    ws.onclose = () => console.log('WebSocket disconnected');
    ws.onerror = (error) => console.error('WebSocket error:', error);
    
    return () => ws.close();
  }
}

export default new RealTimeDataService();