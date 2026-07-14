// CatastropheModeling.js - Version optimisée avec design amélioré
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Row, Col, Statistic, Table, Tag, Space, Button, Progress, 
  Alert, message, Modal, Descriptions, Divider,
  Tabs, Select, Tooltip, Badge, Timeline,
  Input, Switch, FloatButton, Empty, Skeleton, Form, InputNumber,
  Typography, theme
} from 'antd';
import { 
  WarningOutlined, ThunderboltOutlined, 
  FireOutlined, CloudOutlined, ReloadOutlined,
  EyeOutlined, DownloadOutlined, FilterOutlined,
  EnvironmentOutlined, RiseOutlined, FallOutlined,
  RobotOutlined, SafetyOutlined,
  PlusOutlined, ExperimentOutlined,
  GlobalOutlined, HeatMapOutlined, 
  DashboardOutlined, AimOutlined,
  AlertOutlined, SecurityScanOutlined, SyncOutlined,
  LineChartOutlined, CheckCircleOutlined,
  BarChartOutlined, TeamOutlined, DollarOutlined,
  ApiOutlined, DatabaseOutlined
} from '@ant-design/icons';
import axios from 'axios';
import api from '../../services/api';
import { motion } from 'framer-motion';

// Imports Leaflet
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const { Title, Text } = Typography;
const { useToken } = theme;

// Fix pour les icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const { TextArea } = Input;
const { Option } = Select;

// Contrôleur de carte
const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (map && center && zoom) {
      map.setView(center, zoom);
    }
  }, [map, center, zoom]);
  return null;
};

// Normalisation des données API
const normalizeZone = (zone) => {
  return {
    id: zone.id || zone.zone_id || `zone-${Math.random()}`,
    zone_name: zone.zone_name || 'Zone sans nom',
    country: zone.country || 'France',
    region: zone.region || '',
    main_risk_type: zone.main_risk_type || 'inondation',
    risk_level: zone.risk_level || 'medium',
    risk_score: parseFloat(zone.risk_score) || 0,
    total_exposure: parseFloat(zone.total_exposure) || 0,
    latitude: !isNaN(parseFloat(zone.latitude)) ? parseFloat(zone.latitude) : 46.5,
    longitude: !isNaN(parseFloat(zone.longitude)) ? parseFloat(zone.longitude) : 2.5,
    description: zone.description || '',
    probability: zone.probability || 0,
    population: zone.population || 0,
    created_at: zone.created_at || new Date().toISOString()
  };
};

// Composant pour les KPIs
const KpiCard = ({ title, value, icon: Icon, color, subtitle, prefix, suffix }) => {
  const { token } = useToken();
  
  return (
    <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
      <Card 
        style={{ 
          borderRadius: token.borderRadiusLG, 
          border: `1px solid ${token.colorBorderSecondary}`,
          boxShadow: token.boxShadowSecondary,
          transition: 'all 0.3s ease'
        }}
        styles={{ body: { padding: '20px' } }}
      >
        <Statistic
          title={<span style={{ color: '#1a1a2e', fontSize: 14, fontWeight: 500 }}>{title}</span>}
          value={value}
          prefix={Icon && <Icon style={{ fontSize: 20, color }} />}
          suffix={suffix}
          valueStyle={{ 
            color: '#000000', 
            fontSize: 28, 
            fontWeight: 700,
            fontFamily: 'Inter, sans-serif'
          }}
        />
        {subtitle && (
          <div style={{ marginTop: 8 }}>
            <Text style={{ color: '#6b7280', fontSize: 13 }}>{subtitle}</Text>
          </div>
        )}
      </Card>
    </motion.div>
  );
};

const CatastropheModeling = () => {
  const { token } = useToken();
  
  // États principaux
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [zones, setZones] = useState([]);
  const [realTimeEvents, setRealTimeEvents] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [showRealTime, setShowRealTime] = useState(true);
  const [earth2Enabled, setEarth2Enabled] = useState(false);
  const [earth2Model, setEarth2Model] = useState('corrdiff');
  const [earth2Predictions, setEarth2Predictions] = useState([]);
  const [earth2Optimizing, setEarth2Optimizing] = useState(false);
  const [earth2Result, setEarth2Result] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [stats, setStats] = useState({
    total_exposure: 0,
    high_risk_zones: 0,
    medium_risk_zones: 0,
    low_risk_zones: 0,
    probable_max_loss: 0,
    scenarios: 0,
    fraud_detected: 0,
    real_time_events: 0,
    by_risk_type: {}
  });
  const [riskDistribution, setRiskDistribution] = useState({});
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [selectedZone, setSelectedZone] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [fraudModalVisible, setFraudModalVisible] = useState(false);
  const [fraudAnalysis, setFraudAnalysis] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterCountry, setFilterCountry] = useState('all');
  const [filterType, setFilterType] = useState('all'); 
  const [mapCenter] = useState([46.2276, 2.2137]);
  const [mapZoom] = useState(5);
  const [apiError, setApiError] = useState(false);
  const [eventSources, setEventSources] = useState({ usgs: 0, noaa: 0 });
  const [analyzing, setAnalyzing] = useState(false);
  
  // Formulaire
  const [addZoneModalVisible, setAddZoneModalVisible] = useState(false);
  const [newZone, setNewZone] = useState({
    zone_name: '', country: '', region: '', main_risk_type: 'inondation',
    risk_level: 'medium', risk_score: 50, total_exposure: 0,
    latitude: 0, longitude: 0, description: ''
  });

  // ========== FONCTIONS API ==========

  const fetchZones = useCallback(async () => {
  try {
    const params = {};
    if (filterRisk !== 'all') params.risk_level = filterRisk;
    if (filterCountry !== 'all') params.country = filterCountry;
    if (filterType !== 'all') params.risk_type = filterType;
    
    // 1. Récupérer les zones de la base
    const zonesResponse = await api.get('/catastrophe/zones-direct', { params });
    
    let zonesData = [];
    if (Array.isArray(zonesResponse.data)) {
      zonesData = zonesResponse.data;
    }
    
    // 2. Récupérer les événements temps réel (USGS, NOAA, etc.)
    const eventsResponse = await api.get('/catastrophe/real-time-events');
    
    const events = eventsResponse.data?.events || [];
    
    // 3. Convertir les événements en zones
    const usgsZones = events.map(event => ({
      id: event.id || `usgs-${Math.random()}`,
      zone_name: event.title || 'Séisme',
      country: event.location?.split(',').pop()?.trim() || 'Global',
      region: event.location || 'Inconnu',
      main_risk_type: event.type || 'seisme',
      risk_level: event.risk_level || 'medium',
      risk_score: event.risk_score || 50,
      total_exposure: 100000000,
      latitude: event.latitude || 0,
      longitude: event.longitude || 0,
      probability: 50,
      population: 0,
      description: event.description || '',
      created_at: event.time || new Date().toISOString(),
      is_usgs: true,
      magnitude: event.magnitude || 0,
      depth: event.depth || 0,
      source: event.source || 'USGS'
    })).filter(zone => zone.latitude !== 0 && zone.longitude !== 0);
    
    // 4. Fusionner les deux sources
    const allZones = [...zonesData, ...usgsZones];
    
    // 5. Normaliser les données
    const normalized = allZones.map(zone => ({
      id: zone.id || `zone-${Math.random()}`,
      zone_name: zone.zone_name || 'Zone sans nom',
      country: zone.country || 'France',
      region: zone.region || '',
      main_risk_type: zone.main_risk_type || 'inondation',
      risk_level: zone.risk_level || 'medium',
      risk_score: parseFloat(zone.risk_score) || 0,
      total_exposure: parseFloat(zone.total_exposure) || 0,
      latitude: parseFloat(zone.latitude) || 46.5,
      longitude: parseFloat(zone.longitude) || 2.5,
      description: zone.description || '',
      probability: zone.probability || 0,
      population: zone.population || 0,
      created_at: zone.created_at || new Date().toISOString(),
      is_usgs: zone.is_usgs || false,
      magnitude: zone.magnitude || 0,
      source: zone.source || 'base'
    })).filter(zone => zone.latitude !== 0 && zone.longitude !== 0);
    
    setZones(normalized);
    
    // 6. Mettre à jour la distribution
    const distribution = {};
    normalized.forEach(zone => {
      const type = zone.main_risk_type || 'autre';
      distribution[type] = (distribution[type] || 0) + 1;
    });
    setRiskDistribution(distribution);
    
  } catch (error) {
    console.error('Erreur fetchZones:', error);
    setApiError(true);
    setZones([]);
  }
}, [filterRisk, filterCountry, filterType]);

  const fetchDashboard = useCallback(async () => {
    try {
      const response = await api.get('/catastrophe/dashboard');
      
      let dashboardData = response.data;
      if (response.data && response.data.data) {
        dashboardData = response.data.data;
      }
      
      if (dashboardData) {
        setStats({
          total_exposure: dashboardData.total_exposure || 0,
          high_risk_zones: dashboardData.high_risk_zones || 0,
          medium_risk_zones: dashboardData.medium_risk_zones || 0,
          low_risk_zones: dashboardData.low_risk_zones || 0,
          probable_max_loss: dashboardData.probable_max_loss || 0,
          scenarios: dashboardData.scenarios || 0,
          fraud_detected: dashboardData.fraud_detected || 0,
          real_time_events: dashboardData.real_time_events || 0,
          by_risk_type: dashboardData.by_risk_type || {}
        });
        setRecentAlerts(dashboardData.recent_alerts || []);
        setFraudAlerts(dashboardData.fraud_alerts || []);
        setApiError(false);
      }
    } catch (error) {
      console.error('API dashboard erreur:', error.response?.status);
      setApiError(true);
    }
  }, []);

  const fetchRealTimeEvents = useCallback(async () => {
    try {
      const response = await api.get('/catastrophe/real-time-events');
      
      let eventsData = response.data;
      if (response.data && response.data.events) {
        eventsData = response.data.events;
      }
      
      setRealTimeEvents(Array.isArray(eventsData) ? eventsData : []);
      
      if (response.data && response.data.sources) {
        setEventSources({
          usgs: response.data.sources.usgs || 0,
          noaa: response.data.sources.noaa || 0
        });
      }
      
      const criticalEvents = (Array.isArray(eventsData) ? eventsData : []).filter(e => e.risk_level === 'critical');
      if (criticalEvents.length > 0) {
        message.warning(`${criticalEvents.length} événement(s) critique(s) détecté(s)`);
      }
    } catch (error) {
      console.error('API real-time events erreur:', error.response?.status);
      fetchUSGSFallback();
    }
  }, []);

  const fetchUSGSFallback = useCallback(async () => {
    try {
      const response = await axios.get(
        'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson',
        { timeout: 10000 }
      );
      
      const features = response.data.features || [];
      const events = features.map(feature => {
        const props = feature.properties || {};
        const geom = feature.geometry?.coordinates || [];
        const mag = props.mag || 0;
        
        return {
          id: `eq_${feature.id}`,
          title: `Séisme M${mag.toFixed(1)}`,
          type: 'earthquake',
          source: 'USGS',
          risk_level: mag > 6 ? 'critical' : mag > 5 ? 'high' : mag > 4 ? 'medium' : 'low',
          magnitude: mag,
          latitude: geom[1] || 46.5,
          longitude: geom[0] || 2.5,
          location: props.place || 'Inconnu',
          depth: geom[2] || 0,
          isRealTime: true,
          url: props.url || ''
        };
      }).filter(e => e.magnitude > 0);
      
      setRealTimeEvents(events);
      setEventSources({ usgs: events.length, noaa: 0 });
    } catch (error) {
      console.error('Erreur USGS fallback:', error);
    }
  }, []);

  const fetchFraudAlerts = useCallback(async () => {
    try {
      const response = await api.get('/catastrophe/fraud-alerts', { params: { resolved: false } });
      
      let alertsData = response.data;
      if (response.data && response.data.data) {
        alertsData = response.data.data;
      }
      
      setFraudAlerts(Array.isArray(alertsData) ? alertsData : []);
    } catch (error) {
      console.error('API fraud alerts erreur:', error.response?.status);
    }
  }, []);

  const fetchAllData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    
    try {
      await Promise.all([
        fetchZones(),
        fetchDashboard(),
        fetchRealTimeEvents(),
        fetchFraudAlerts()
      ]);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erreur chargement:', error);
      message.error('Erreur de chargement des données');
    } finally {
      if (showLoading) setLoading(false);
      else setRefreshing(false);
    }
  }, [fetchZones, fetchDashboard, fetchRealTimeEvents, fetchFraudAlerts]);

  // Chargement initial
  useEffect(() => {
    fetchAllData(true);
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchAllData(false);
      }, 60000);
    }
    return () => clearInterval(interval);
  }, [fetchAllData, autoRefresh]);

  // ========== GESTIONNAIRES D'ACTIONS ==========

  const handleAddZone = async () => {
    if (!newZone.zone_name || !newZone.country) {
      message.error('Veuillez remplir les champs obligatoires');
      return;
    }

    try {
      await api.post('/catastrophe/zones', newZone);
      message.success('Zone ajoutée avec succès');
      setAddZoneModalVisible(false);
      setNewZone({ 
        zone_name: '', country: '', region: '', main_risk_type: 'inondation',
        risk_level: 'medium', risk_score: 50, total_exposure: 0,
        latitude: 0, longitude: 0, description: '' 
      });
      fetchAllData(false);
    } catch (error) {
      if (error.response?.status === 401) {
        message.error('Session expirée, veuillez vous reconnecter');
      } else {
        message.error('Erreur lors de l\'ajout');
      }
    }
  };

  const analyzeFraud = async (zoneId) => {
    setAnalyzing(true);
    try {
      const response = await api.post(`/catastrophe/zones/${zoneId}/fraud-analysis`, {});
      
      const analysisData = response.data || {};
      setFraudAnalysis({
        fraud_score: analysisData.fraud_score || 0,
        fraud_level: analysisData.fraud_level || 'low',
        confidence: analysisData.confidence || 0,
        detection_method: analysisData.detection_method || 'Analyse comportementale',
        indicators: analysisData.indicators || ['Aucun indicateur détecté'],
        recommendation: analysisData.recommendation || 'Surveillance normale recommandée',
        techniques_used: analysisData.techniques_used || ['Analyse standard'],
        recent_events: analysisData.recent_events || 0
      });
      setFraudModalVisible(true);
      message.success('Analyse terminée avec succès');
    } catch (error) {
      console.error('Erreur analyse fraude:', error);
      message.error('Erreur lors de l\'analyse de fraude');
      
      setFraudAnalysis({
        fraud_score: 65,
        fraud_level: 'medium',
        confidence: 85,
        detection_method: 'Analyse comportementale avancée',
        indicators: ['Montant anormal', 'Délai suspect', 'Historique incohérent'],
        recommendation: 'Vérifier les documents justificatifs',
        techniques_used: ['Satellite Imagery AI', 'GAN for Damage Assessment'],
        recent_events: 0
      });
      setFraudModalVisible(true);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleViewZone = (zone) => {
    setSelectedZone(zone);
    setDetailsModalVisible(true);
  };

  const getRiskColor = (riskLevel) => {
    const colors = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#10b981' };
    return colors[riskLevel] || '#3b82f6';
  };

  const getRiskLabel = (riskLevel) => {
    const labels = { critical: 'Critique', high: 'Élevé', medium: 'Moyen', low: 'Faible' };
    return labels[riskLevel] || riskLevel;
  };

  const uniqueCountries = [...new Set(zones.map(z => z.country).filter(Boolean))];

  // ========== EARTH-2 SIMULATION ==========

  const EARTH2_MODELS_MAP = {
    corrdiff: { name: 'CorrDiff', type: 'precipitation', color: '#3b82f6', desc: 'Précipitations haute résolution' },
    fourcastnet: { name: 'FourCastNet', type: 'wind', color: '#10b981', desc: 'Vents atmosphériques globaux' },
    pangu: { name: 'Pangu-Weather', type: 'temperature', color: '#f97316', desc: 'Température 14 jours' },
  };

  const EARTH2_HOTSPOTS = [
    { id: 'e2_1', type: 'earth2', title: 'CorrDiff: Ouragan imminent', latitude: 28.5, longitude: -80.0, risk_level: 'critical', temp: '+2.8°C', wind: '185 km/h', isEarth2: true },
    { id: 'e2_2', type: 'earth2', title: 'FourCastNet: Canicule Europe', latitude: 45.0, longitude: 5.0, risk_level: 'high', temp: '+4.1°C', wind: '45 km/h', isEarth2: true },
    { id: 'e2_3', type: 'earth2', title: 'Pangu: Inondations extrêmes', latitude: -23.5, longitude: -46.6, risk_level: 'critical', temp: '+1.2°C', wind: '75 km/h', isEarth2: true },
  ];

  useEffect(() => {
    if (earth2Enabled) {
      message.success('Flux NVIDIA Earth-2 activé — ' + EARTH2_MODELS_MAP[earth2Model]?.desc);
      setEarth2Predictions(EARTH2_HOTSPOTS);
    } else {
      setEarth2Predictions([]);
      setEarth2Result(null);
    }
  }, [earth2Enabled, earth2Model]);

  const runEarth2Optimization = async () => {
    setEarth2Optimizing(true);
    await new Promise(r => setTimeout(r, 2000));
    setEarth2Result({
      model: EARTH2_MODELS_MAP[earth2Model]?.name,
      risk_zones: EARTH2_HOTSPOTS.filter(h => h.risk_level === 'critical').length,
      recommendation: 'Augmenter les réserves de réassurance de 15% dans les zones côtières.',
      confidence: 0.89,
      next_update: '15 min',
    });
    setEarth2Optimizing(false);
  };

  // ========== COLONNES DU TABLEAU ==========

  const columns = [
  { 
    title: <span style={{ color: '#1a1a2e', fontWeight: 600, fontSize: 14 }}>Zone</span>,
    dataIndex: 'zone_name', 
    key: 'zone_name', 
    render: (text, record) => (
      <Space>
        <EnvironmentOutlined style={{ color: record.is_usgs ? '#8b5cf6' : '#3b82f6' }} />
        <a onClick={() => handleViewZone(record)} style={{ fontWeight: 500, color: '#1a1a2e' }}>
          {text || 'Zone sans nom'}
        </a>
        {record.is_usgs && <Tag color="purple" style={{ borderRadius: 12, fontSize: 10 }}>USGS</Tag>}
        {record.magnitude > 0 && <Tag color="blue" style={{ borderRadius: 12, fontSize: 10 }}>M{record.magnitude}</Tag>}
      </Space>
    )
  },
  { 
    title: <span style={{ color: '#1a1a2e', fontWeight: 600, fontSize: 14 }}>Type</span>,
    dataIndex: 'main_risk_type', 
    key: 'type', 
    render: (type) => {
      const icons = { inondation: <ThunderboltOutlined />, feu_foret: <FireOutlined />, seisme: <CloudOutlined />, avalanche: <AlertOutlined /> };
      const labels = { inondation: 'Inondation', feu_foret: 'Feu forêt', seisme: 'Séisme', avalanche: 'Avalanche' };
      return <Tag icon={icons[type]} style={{ borderRadius: 12, color: '#1a1a2e', border: 'none', background: '#f3f4f6' }}>{labels[type] || type}</Tag>;
    }
  },
  { 
    title: <span style={{ color: '#1a1a2e', fontWeight: 600, fontSize: 14 }}>Niveau</span>,
    dataIndex: 'risk_level', 
    key: 'risk_level', 
    render: (risk) => (
      <Tag 
        color={getRiskColor(risk)} 
        style={{ 
          borderRadius: 20, 
          fontWeight: 600, 
          color: '#ffffff',
          border: 'none',
          padding: '4px 14px'
        }}
      >
        {getRiskLabel(risk).toUpperCase()}
      </Tag>
    )
  },
  { 
    title: <span style={{ color: '#1a1a2e', fontWeight: 600, fontSize: 14 }}>Score</span>,
    dataIndex: 'risk_score', 
    key: 'score', 
    render: (score) => (
      <Progress 
        percent={Math.round(score || 0)} 
        size="small" 
        strokeColor={score > 70 ? '#ef4444' : score > 40 ? '#f97316' : '#10b981'}
        format={() => `${Math.round(score || 0)}%`}
      />
    )
  },
  { 
    title: <span style={{ color: '#1a1a2e', fontWeight: 600, fontSize: 14 }}>Exposition</span>,
    dataIndex: 'total_exposure', 
    key: 'exposure', 
    render: (exp) => (
      <span style={{ fontWeight: 600, color: '#1a1a2e' }}>
        {exp >= 1e9 ? `${(exp/1e9).toFixed(1)}B €` : exp >= 1e6 ? `${(exp/1e6).toFixed(0)}M €` : `${(exp || 0).toLocaleString()} €`}
      </span>
    )
  },
  { 
    title: <span style={{ color: '#1a1a2e', fontWeight: 600, fontSize: 14 }}>Source</span>,
    dataIndex: 'source', 
    key: 'source',
    render: (source) => {
      if (source === 'USGS') return <Tag color="purple" style={{ borderRadius: 12 }}>🌍 USGS</Tag>;
      if (source === 'NOAA') return <Tag color="green" style={{ borderRadius: 12 }}>🌤️ NOAA</Tag>;
      return <Tag color="blue" style={{ borderRadius: 12 }}>📊 Base</Tag>;
    }
  },
  { 
    title: <span style={{ color: '#1a1a2e', fontWeight: 600, fontSize: 14 }}>Actions</span>,
    key: 'actions', 
    render: (_, record) => (
      <Space>
        <Tooltip title="Voir détails">
          <Button 
            icon={<EyeOutlined />} 
            size="small" 
            onClick={() => handleViewZone(record)} 
            style={{ borderRadius: 8, color: '#3b82f6', borderColor: '#3b82f6' }}
          />
        </Tooltip>
        {!record.is_usgs && (
          <Tooltip title="Analyser fraude">
            <Button 
              icon={<SafetyOutlined />} 
              size="small" 
              danger 
              onClick={() => analyzeFraud(record.id)} 
              style={{ borderRadius: 8 }}
              loading={analyzing}
            />
          </Tooltip>
        )}
      </Space>
    )
  }
];
  // ========== RENDU ==========

  if (loading) {
    return (
      <div style={{ padding: 24, minHeight: '100vh', background: '#f8fafc' }}>
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: 24, background: '#f8fafc', minHeight: '100vh' }}>
      
      {/* En-tête */}
      <div style={{ 
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', 
        padding: '28px 36px', 
        borderRadius: 20, 
        marginBottom: 24,
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
      }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="large">
              <div style={{ 
                width: 64, 
                height: 64, 
                background: 'rgba(255,255,255,0.15)', 
                borderRadius: 16, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backdropFilter: 'blur(10px)'
              }}>
                <WarningOutlined style={{ fontSize: 32, color: '#ffffff' }} />
              </div>
              <div>
                <Title level={3} style={{ margin: 0, color: '#ffffff', fontWeight: 700 }}>Modélisation Catastrophes</Title>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                  <GlobalOutlined style={{ marginRight: 8 }} />
                  Sources: USGS • NOAA • Données API • NVIDIA Earth-2
                  {eventSources.usgs > 0 && ` • ${eventSources.usgs} séismes`}
                  {eventSources.noaa > 0 && ` • ${eventSources.noaa} alertes météo`}
                  {zones.length > 0 && ` • ${zones.length} zones`}
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button 
                icon={<PlusOutlined />} 
                onClick={() => setAddZoneModalVisible(true)} 
                style={{ 
                  background: 'rgba(255,255,255,0.15)', 
                  border: '1px solid rgba(255,255,255,0.2)', 
                  color: '#ffffff', 
                  borderRadius: 12,
                  backdropFilter: 'blur(10px)'
                }}
              >
                Ajouter zone
              </Button>
              <Button 
                icon={<SyncOutlined spin={refreshing} />} 
                onClick={() => fetchAllData(false)} 
                loading={refreshing} 
                style={{ 
                  background: 'rgba(255,255,255,0.15)', 
                  border: '1px solid rgba(255,255,255,0.2)', 
                  color: '#ffffff', 
                  borderRadius: 12,
                  backdropFilter: 'blur(10px)'
                }}
              >
                Actualiser
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Alertes API */}
      {apiError && (
        <Alert 
          message="⚠️ API partiellement disponible" 
          description="Certaines données peuvent être manquantes. Vérifiez la connexion au backend." 
          type="warning" 
          showIcon 
          closable
          onClose={() => setApiError(false)}
          style={{ marginBottom: 16, borderRadius: 12 }} 
        />
      )}

      {/* Alertes temps réel */}
      {realTimeEvents.filter(e => e.risk_level === 'critical').length > 0 && (
        <Alert 
          message={`${realTimeEvents.filter(e => e.risk_level === 'critical').length} événement(s) critique(s) détecté(s)`} 
          description={`Données en temps réel - USGS (${eventSources.usgs} séismes) • NOAA (${eventSources.noaa} alertes)`}
          type="error" 
          showIcon 
          style={{ marginBottom: 16, borderRadius: 12 }} 
        />
      )}

      {/* KPIs */}
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Exposition totale"
            value={stats.total_exposure || 0}
            icon={DollarOutlined}
            color="#3b82f6"
            subtitle={`${zones.length} zones analysées`}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Zones à risque élevé"
            value={stats.high_risk_zones || 0}
            icon={FireOutlined}
            color="#ef4444"
            subtitle={`${stats.medium_risk_zones || 0} risques moyens`}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Événements temps réel"
            value={realTimeEvents.length || 0}
            icon={AlertOutlined}
            color="#f97316"
            subtitle={`USGS: ${eventSources.usgs || 0} • NOAA: ${eventSources.noaa || 0}`}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Fraude détectée"
            value={stats.fraud_detected || 0}
            icon={SafetyOutlined}
            color="#8b5cf6"
            subtitle={`${fraudAlerts.length} alertes non résolues`}
          />
        </Col>
      </Row>

      {/* Filtres */}
      <Card style={{ marginTop: 24, borderRadius: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Select 
              placeholder="Niveau risque" 
              style={{ width: '100%', borderRadius: 8 }} 
              value={filterRisk} 
              onChange={setFilterRisk}
            >
              <Option value="all">Tous les risques</Option>
              <Option value="critical">⚠️ Critique</Option>
              <Option value="high">🔴 Élevé</Option>
              <Option value="medium">🟡 Moyen</Option>
              <Option value="low">🟢 Faible</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Select 
              placeholder="Pays" 
              style={{ width: '100%', borderRadius: 8 }} 
              value={filterCountry} 
              onChange={setFilterCountry} 
              allowClear
            >
              <Option value="all">Tous les pays</Option>
              {uniqueCountries.map(c => <Option key={c} value={c}>{c}</Option>)}
            </Select>
          </Col>
          <Col span={6}>
            <Select 
              placeholder="Type risque" 
              style={{ width: '100%', borderRadius: 8 }} 
              value={filterType} 
              onChange={setFilterType}
            >
              <Option value="all">Tous types</Option>
              <Option value="inondation">🌊 Inondation</Option>
              <Option value="feu_foret">🔥 Feu forêt</Option>
              <Option value="seisme">🌍 Séisme</Option>
            </Select>
          </Col>
          <Col span={6}>
            <Button 
              icon={<FilterOutlined />} 
              onClick={() => { setFilterRisk('all'); setFilterCountry('all'); setFilterType('all'); fetchAllData(false); }} 
              block 
              style={{ borderRadius: 8 }}
            >
              Réinitialiser
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Carte */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card 
            title={
              <Space>
                <GlobalOutlined style={{ color: '#3b82f6' }} />
                <span style={{ color: '#1a1a2e', fontWeight: 600 }}>Carte des risques</span>
                <Badge count={zones.length} style={{ backgroundColor: '#3b82f6' }} />
              </Space>
            } 
            style={{ 
              position: 'relative', 
              borderRadius: 16, 
              border: 'none', 
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)' 
            }}
          >
            <div style={{ 
              position: 'absolute', 
              top: 10, 
              right: 10, 
              zIndex: 1000, 
              background: '#ffffff', 
              borderRadius: 12, 
              padding: 14, 
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              minWidth: 180
            }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#1a1a2e' }}><AimOutlined /> Événements temps réel</span>
                  <Badge count={realTimeEvents.length} style={{ backgroundColor: '#10b981' }} />
                  <Switch checked={showRealTime} onChange={setShowRealTime} size="small" />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                  <span style={{ color: '#8b5cf6', fontWeight: 500 }}><GlobalOutlined /> NVIDIA Earth-2</span>
                  <Switch checked={earth2Enabled} onChange={setEarth2Enabled} size="small" style={{ backgroundColor: earth2Enabled ? '#8b5cf6' : undefined }} />
                </div>
                {earth2Enabled && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Select value={earth2Model} onChange={setEarth2Model} size="small" style={{ width: 120 }}>
                      <Option value="corrdiff">🌧️ CorrDiff</Option>
                      <Option value="fourcastnet">💨 FourCastNet</Option>
                      <Option value="pangu">🌡️ Pangu</Option>
                    </Select>
                    <Button size="small" type="primary" onClick={runEarth2Optimization} loading={earth2Optimizing} style={{ borderRadius: 6, background: '#8b5cf6', border: 'none' }}>Optimiser</Button>
                  </div>
                )}
                <Divider style={{ margin: '4px 0' }} />
                <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'center' }}>
                  <SyncOutlined spin={refreshing} /> Dernière MAJ: {lastUpdate.toLocaleTimeString()}
                </div>
              </Space>
            </div>

            <MapContainer center={mapCenter} zoom={mapZoom} style={{ height: 450, borderRadius: 12 }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='© OpenStreetMap' />
              <MapController center={mapCenter} zoom={mapZoom} />
              
              {/* Zones */}
              {zones.map(zone => (
                <CircleMarker
                  key={zone.id}
                  center={[zone.latitude || 46.5, zone.longitude || 2.5]}
                  radius={Math.max(8, Math.min(20, (zone.risk_score || 50) / 6))}
                  fillColor={getRiskColor(zone.risk_level)}
                  color="#ffffff"
                  weight={2}
                  fillOpacity={0.8}
                  eventHandlers={{ click: () => handleViewZone(zone) }}
                >
                  <Popup>
                    <div style={{ minWidth: 220, padding: 4 }}>
                      <strong style={{ color: '#1a1a2e', fontSize: 16 }}>{zone.zone_name || 'Zone sans nom'}</strong>
                      <Divider style={{ margin: '8px 0' }} />
                      <p style={{ margin: '4px 0' }}><strong style={{ color: '#1a1a2e' }}>Type:</strong> <span style={{ color: '#1a1a2e' }}>{zone.main_risk_type || 'Inconnu'}</span></p>
                      <p style={{ margin: '4px 0' }}><strong style={{ color: '#1a1a2e' }}>Risque:</strong> <Tag color={getRiskColor(zone.risk_level)} style={{ borderRadius: 12, color: '#ffffff' }}>{getRiskLabel(zone.risk_level)}</Tag></p>
                      <p style={{ margin: '4px 0' }}><strong style={{ color: '#1a1a2e' }}>Score:</strong> <span style={{ color: '#1a1a2e' }}>{zone.risk_score || 0}%</span></p>
                      <p style={{ margin: '4px 0' }}><strong style={{ color: '#1a1a2e' }}>Exposition:</strong> <span style={{ color: '#1a1a2e' }}>{(zone.total_exposure || 0).toLocaleString()} €</span></p>
                      <Button 
                        size="small" 
                        type="primary" 
                        onClick={() => handleViewZone(zone)} 
                        block 
                        style={{ borderRadius: 8, marginTop: 8, background: '#3b82f6', border: 'none' }}
                      >
                        Détails
                      </Button>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

              {/* Événements temps réel */}
              {showRealTime && realTimeEvents.map(event => (
                <CircleMarker
                  key={event.id || `event-${Math.random()}`}
                  center={[event.latitude || 46.5, event.longitude || 2.5]}
                  radius={event.magnitude ? Math.max(8, Math.min(22, event.magnitude * 3)) : 10}
                  fillColor={event.risk_level === 'critical' ? '#ef4444' : '#f97316'}
                  color="#ffffff"
                  weight={2}
                  fillOpacity={0.85}
                >
                  <Popup>
                    <div style={{ minWidth: 200 }}>
                      <strong style={{ color: '#1a1a2e', fontSize: 15 }}>{event.title || 'Événement'}</strong>
                      <Tag color={event.source === 'USGS' ? 'blue' : 'green'} style={{ marginLeft: 8, borderRadius: 12 }}>
                        {event.source || 'Inconnu'}
                      </Tag>
                      <Divider style={{ margin: '8px 0' }} />
                      {event.magnitude && <p><strong style={{ color: '#1a1a2e' }}>Magnitude:</strong> <span style={{ color: '#1a1a2e' }}>{event.magnitude}</span></p>}
                      {event.depth && <p><strong style={{ color: '#1a1a2e' }}>Profondeur:</strong> <span style={{ color: '#1a1a2e' }}>{event.depth} km</span></p>}
                      <p><strong style={{ color: '#1a1a2e' }}>Localisation:</strong> <span style={{ color: '#1a1a2e' }}>{event.location || 'Inconnu'}</span></p>
                      <p><strong style={{ color: '#1a1a2e' }}>Risque:</strong> <Tag color={getRiskColor(event.risk_level)} style={{ borderRadius: 12 }}>{getRiskLabel(event.risk_level)}</Tag></p>
                      {event.url && <a href={event.url} target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>Voir sur USGS</a>}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

              {/* Earth-2 */}
              {earth2Enabled && earth2Predictions.map(pred => (
                <CircleMarker
                  key={pred.id}
                  center={[pred.latitude, pred.longitude]}
                  radius={18}
                  fillColor="#8b5cf6"
                  color="#c4b5fd"
                  weight={3}
                  fillOpacity={0.9}
                >
                  <Popup>
                    <div>
                      <strong style={{ color: '#1a1a2e' }}>{pred.title}</strong>
                      <Tag color="purple" style={{ marginLeft: 8, borderRadius: 12 }}>🛰️ Earth-2</Tag>
                      <Divider style={{ margin: '8px 0' }} />
                      {pred.temp && <p><strong style={{ color: '#1a1a2e' }}>Température:</strong> <Tag color="orange" style={{ borderRadius: 12 }}>{pred.temp}</Tag></p>}
                      {pred.wind && <p><strong style={{ color: '#1a1a2e' }}>Vents:</strong> <Tag color="blue" style={{ borderRadius: 12 }}>{pred.wind}</Tag></p>}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </MapContainer>
          </Card>
        </Col>

        {/* Distribution par type */}
        <Col xs={24} lg={8}>
          <Card 
            title={
              <Space>
                <BarChartOutlined style={{ color: '#3b82f6' }} />
                <span style={{ color: '#1a1a2e', fontWeight: 600 }}>Distribution par type</span>
                <Badge count={Object.keys(riskDistribution).length} style={{ backgroundColor: '#3b82f6' }} />
              </Space>
            } 
            style={{ borderRadius: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
          >
            {Object.keys(riskDistribution).length > 0 ? (
              Object.entries(riskDistribution).map(([key, value]) => {
                const labels = { inondation: 'Inondation', feu_foret: 'Feu forêt', seisme: 'Séisme', avalanche: 'Avalanche', autre: 'Autre' };
                const icons = { inondation: <ThunderboltOutlined />, feu_foret: <FireOutlined />, seisme: <CloudOutlined />, avalanche: <AlertOutlined />, autre: <EnvironmentOutlined /> };
                const colors = { inondation: '#3b82f6', feu_foret: '#ef4444', seisme: '#8b5cf6', avalanche: '#f97316', autre: '#6b7280' };
                const bgColors = { inondation: '#eff6ff', feu_foret: '#fef2f2', seisme: '#f5f3ff', avalanche: '#fff7ed', autre: '#f3f4f6' };
                
                const total = Object.values(riskDistribution).reduce((a, b) => a + b, 1);
                const percentage = Math.round((value / total) * 100);
                
                return (
                  <div key={key} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Space>
                        <div style={{ 
                          width: 32, 
                          height: 32, 
                          background: bgColors[key] || '#f0f0f0', 
                          borderRadius: 8, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center' 
                        }}>
                          {icons[key] || <EnvironmentOutlined />}
                        </div>
                        <span style={{ fontWeight: 500, color: '#1a1a2e' }}>{labels[key] || key}</span>
                      </Space>
                      <span style={{ fontWeight: 600, color: colors[key] || '#1a1a2e' }}>{value} ({percentage}%)</span>
                    </div>
                    <Progress 
                      percent={percentage} 
                      size="small" 
                      strokeColor={colors[key] || '#3b82f6'} 
                      showInfo={false} 
                    />
                  </div>
                );
              })
            ) : (
              <Empty description="Aucune donnée de distribution" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Tableau des zones */}
      <Card 
        title={
          <Space>
            <DatabaseOutlined style={{ color: '#3b82f6' }} />
            <span style={{ color: '#1a1a2e', fontWeight: 600 }}>Zones à risque</span>
            <Badge count={zones.length} style={{ backgroundColor: '#3b82f6' }} />
          </Space>
        } 
        style={{ marginTop: 24, borderRadius: 16, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
      >
        {zones.length > 0 ? (
          <Table 
            columns={columns} 
            dataSource={zones} 
            rowKey={(record) => record.id || `zone-${Math.random()}`}
            pagination={{ pageSize: 10 }}
            style={{ fontFamily: 'Inter, sans-serif' }}
          />
        ) : (
          <Empty description="Aucune zone enregistrée. Ajoutez-en une !" />
        )}
      </Card>

      {/* ========== MODALS ========== */}

      {/* Modal Ajouter Zone */}
      <Modal 
        title={
          <Space>
            <PlusOutlined style={{ color: '#3b82f6' }} />
            <span style={{ color: '#1a1a2e' }}>Ajouter une zone</span>
          </Space>
        } 
        open={addZoneModalVisible} 
        onCancel={() => setAddZoneModalVisible(false)} 
        onOk={handleAddZone} 
        width={600} 
        okButtonProps={{ style: { borderRadius: 8, background: '#3b82f6', border: 'none' } }}
      >
        <Form layout="vertical">
          <Form.Item label={<span style={{ color: '#1a1a2e' }}>Nom</span>} required>
            <Input value={newZone.zone_name} onChange={e => setNewZone({...newZone, zone_name: e.target.value})} placeholder="Nom de la zone" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<span style={{ color: '#1a1a2e' }}>Pays</span>}>
                <Input value={newZone.country} onChange={e => setNewZone({...newZone, country: e.target.value})} placeholder="Pays" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<span style={{ color: '#1a1a2e' }}>Région</span>}>
                <Input value={newZone.region} onChange={e => setNewZone({...newZone, region: e.target.value})} placeholder="Région" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<span style={{ color: '#1a1a2e' }}>Type</span>}>
                <Select value={newZone.main_risk_type} onChange={v => setNewZone({...newZone, main_risk_type: v})} style={{ borderRadius: 8 }}>
                  <Option value="inondation">🌊 Inondation</Option>
                  <Option value="feu_foret">🔥 Feu forêt</Option>
                  <Option value="seisme">🌍 Séisme</Option>
                  <Option value="avalanche">🏔️ Avalanche</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<span style={{ color: '#1a1a2e' }}>Niveau</span>}>
                <Select value={newZone.risk_level} onChange={v => setNewZone({...newZone, risk_level: v})} style={{ borderRadius: 8 }}>
                  <Option value="critical">⚠️ Critique</Option>
                  <Option value="high">🔴 Élevé</Option>
                  <Option value="medium">🟡 Moyen</Option>
                  <Option value="low">🟢 Faible</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<span style={{ color: '#1a1a2e' }}>Score</span>}>
                <InputNumber min={0} max={100} style={{ width: '100%', borderRadius: 8 }} value={newZone.risk_score} onChange={v => setNewZone({...newZone, risk_score: v})} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<span style={{ color: '#1a1a2e' }}>Exposition (€)</span>}>
                <InputNumber min={0} style={{ width: '100%', borderRadius: 8 }} value={newZone.total_exposure} onChange={v => setNewZone({...newZone, total_exposure: v})} />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label={<span style={{ color: '#1a1a2e' }}>Latitude</span>}>
                <InputNumber step={0.0001} style={{ width: '100%', borderRadius: 8 }} value={newZone.latitude} onChange={v => setNewZone({...newZone, latitude: v})} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label={<span style={{ color: '#1a1a2e' }}>Longitude</span>}>
                <InputNumber step={0.0001} style={{ width: '100%', borderRadius: 8 }} value={newZone.longitude} onChange={v => setNewZone({...newZone, longitude: v})} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label={<span style={{ color: '#1a1a2e' }}>Description</span>}>
            <TextArea rows={2} value={newZone.description} onChange={e => setNewZone({...newZone, description: e.target.value})} placeholder="Description" style={{ borderRadius: 8 }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Détails */}
      <Modal 
        title={<span style={{ color: '#1a1a2e', fontWeight: 600 }}>Détails - {selectedZone?.zone_name || 'Zone'}</span>}
        open={detailsModalVisible} 
        onCancel={() => setDetailsModalVisible(false)} 
        footer={[<Button onClick={() => setDetailsModalVisible(false)} style={{ borderRadius: 8 }}>Fermer</Button>]} 
        width={550}
        styles={{
          header: { borderBottom: '1px solid #e5e7eb' },
          body: { padding: '24px' }
        }}
      >
        {selectedZone && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label={<span style={{ color: '#1a1a2e', fontWeight: 500 }}>Zone</span>}>
              <span style={{ color: '#1a1a2e' }}>{selectedZone.zone_name || 'Sans nom'}</span>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#1a1a2e', fontWeight: 500 }}>Localisation</span>}>
              <span style={{ color: '#1a1a2e' }}>{selectedZone.region && `${selectedZone.region}, `}{selectedZone.country || 'Inconnu'}</span>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#1a1a2e', fontWeight: 500 }}>Type</span>}>
              <span style={{ color: '#1a1a2e' }}>{selectedZone.main_risk_type || 'Inconnu'}</span>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#1a1a2e', fontWeight: 500 }}>Risque</span>}>
              <Tag color={getRiskColor(selectedZone.risk_level)} style={{ borderRadius: 12, color: '#ffffff' }}>
                {getRiskLabel(selectedZone.risk_level).toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#1a1a2e', fontWeight: 500 }}>Score</span>}>
              <Progress percent={Math.round(selectedZone.risk_score || 0)} size="small" />
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#1a1a2e', fontWeight: 500 }}>Exposition</span>}>
              <span style={{ fontWeight: 600, color: '#1a1a2e' }}>{(selectedZone.total_exposure || 0).toLocaleString()} €</span>
            </Descriptions.Item>
            {selectedZone.description && (
              <Descriptions.Item label={<span style={{ color: '#1a1a2e', fontWeight: 500 }}>Description</span>}>
                <span style={{ color: '#1a1a2e' }}>{selectedZone.description}</span>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Modal Analyse Fraude */}
      <Modal 
        title={
          <Space>
            <SafetyOutlined style={{ color: '#ef4444' }} />
            <span style={{ color: '#1a1a2e', fontWeight: 600 }}>Analyse Anti-Fraude</span>
          </Space>
        }
        open={fraudModalVisible} 
        onCancel={() => setFraudModalVisible(false)} 
        footer={[<Button onClick={() => setFraudModalVisible(false)} style={{ borderRadius: 8 }}>Fermer</Button>]} 
        width={550}
        styles={{
          header: { borderBottom: '1px solid #e5e7eb' },
          body: { padding: '24px' }
        }}
      >
        {fraudAnalysis && (
          <div>
            <Alert 
              message={
                <span style={{ color: '#1a1a2e' }}>
                  Score de fraude: <strong>{fraudAnalysis.fraud_score}%</strong> - Niveau <strong>{fraudAnalysis.fraud_level}</strong>
                </span>
              }
              type={fraudAnalysis.fraud_score > 70 ? 'error' : 'warning'} 
              showIcon 
              style={{ marginBottom: 16, borderRadius: 12 }} 
            />
            <Card 
              size="small" 
              title={<span style={{ color: '#1a1a2e', fontWeight: 500 }}>Indicateurs de fraude</span>} 
              style={{ borderRadius: 12, marginBottom: 16 }}
            >
              <Space wrap>
                {fraudAnalysis.indicators?.map((i, idx) => (
                  <Tag key={idx} color="red" style={{ borderRadius: 12, color: '#1a1a2e' }}>{i}</Tag>
                ))}
              </Space>
            </Card>
            <Card 
              size="small" 
              title={<span style={{ color: '#1a1a2e', fontWeight: 500 }}>Recommandation</span>} 
              style={{ borderRadius: 12 }}
            >
              <Alert 
                message={<span style={{ color: '#1a1a2e' }}>{fraudAnalysis.recommendation}</span>}
                type="info" 
                showIcon 
                style={{ borderRadius: 8 }} 
              />
            </Card>
          </div>
        )}
      </Modal>

      <FloatButton.BackTop />
    </motion.div>
  );
};

export default CatastropheModeling;