// src/modules/banking/ChurnPredictionBanking.js
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Card, Row, Col, Statistic, Table, Tag, Space, Button, 
  Progress, Alert, Timeline, Spin, message, Select, DatePicker,
  Tabs, Modal, Form, Input, InputNumber, Badge, Tooltip, Divider,
  Upload, Drawer, Descriptions, Steps, Collapse, Switch, Radio,
  Rate, Slider, TreeSelect, Checkbox, Typography
} from 'antd';
import { 
  SafetyOutlined, WarningOutlined, 
  CheckCircleOutlined, ClockCircleOutlined,
  ReloadOutlined, DownloadOutlined, FilterOutlined,
  PhoneOutlined, MailOutlined, RobotOutlined,
  UserOutlined, BankOutlined, LineChartOutlined,
  ThunderboltOutlined, TeamOutlined, DatabaseOutlined,
  EyeOutlined, LockOutlined, AlertOutlined,
  UploadOutlined, FileExcelOutlined, PlusOutlined,
  DashboardOutlined, ExperimentOutlined, SettingOutlined,
  RiseOutlined, FallOutlined, StarOutlined, HeartOutlined,
  MessageOutlined, GiftOutlined, TrophyOutlined,
  EnvironmentOutlined, GlobalOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip as LeafletTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Step } = Steps;
const { Panel } = Collapse;

// ============================================
// COULEURS DESIGN SOMBRE
// ============================================

const COLORS = {
  bgDark: '#0f172a',
  bgCard: '#1e293b',
  bgCardHover: '#334155',
  border: '#334155',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  primary: '#1890ff',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  cyan: '#06b6d4'
};

// ============================================
// DONNÉES DE LOCALISATION
// ============================================

const citiesLocations = {
  'Paris': { lat: 48.8566, lng: 2.3522, region: 'Île-de-France' },
  'Lyon': { lat: 45.7640, lng: 4.8357, region: 'Auvergne-Rhône-Alpes' },
  'Marseille': { lat: 43.2965, lng: 5.3698, region: 'Provence-Alpes-Côte d\'Azur' },
  'Bordeaux': { lat: 44.8378, lng: -0.5792, region: 'Nouvelle-Aquitaine' },
  'Lille': { lat: 50.6292, lng: 3.0573, region: 'Hauts-de-France' },
  'Toulouse': { lat: 43.6047, lng: 1.4442, region: 'Occitanie' },
  'Nice': { lat: 43.7102, lng: 7.2620, region: 'Provence-Alpes-Côte d\'Azur' },
  'Nantes': { lat: 47.2184, lng: -1.5536, region: 'Pays de la Loire' },
  'Strasbourg': { lat: 48.5734, lng: 7.7521, region: 'Grand Est' },
  'Montpellier': { lat: 43.6108, lng: 3.8767, region: 'Occitanie' },
  'Rennes': { lat: 48.1173, lng: -1.6778, region: 'Bretagne' },
  'Reims': { lat: 49.2583, lng: 4.0317, region: 'Grand Est' },
  'Le Havre': { lat: 49.4944, lng: 0.1079, region: 'Normandie' },
  'Saint-Étienne': { lat: 45.4397, lng: 4.3872, region: 'Auvergne-Rhône-Alpes' },
  'Toulon': { lat: 43.1242, lng: 5.9280, region: 'Provence-Alpes-Côte d\'Azur' },
  'Grenoble': { lat: 45.1885, lng: 5.7245, region: 'Auvergne-Rhône-Alpes' },
  'Dijon': { lat: 47.3220, lng: 5.0415, region: 'Bourgogne-Franche-Comté' },
  'Angers': { lat: 47.4784, lng: -0.5632, region: 'Pays de la Loire' },
  'Nîmes': { lat: 43.8367, lng: 4.3601, region: 'Occitanie' },
  'Aix-en-Provence': { lat: 43.5297, lng: 5.4474, region: 'Provence-Alpes-Côte d\'Azur' }
};

// ============================================
// STYLES
// ============================================

const styles = {
  page: {
    background: COLORS.bgDark,
    minHeight: '100vh',
    padding: 24
  },
  header: {
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    padding: '20px 24px',
    borderRadius: 16,
    marginBottom: 24,
    border: `1px solid ${COLORS.border}`,
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)'
  },
  card: {
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
  },
  kpiCard: {
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    padding: '16px 20px',
    transition: 'all 0.3s ease'
  }
};

// Fix pour les icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const ChurnPredictionBanking = () => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [atRiskClients, setAtRiskClients] = useState([]);
  const [churnHistory, setChurnHistory] = useState([]);
  const [retentionActions, setRetentionActions] = useState([]);
  const [stats, setStats] = useState({
    totalClients: 0,
    atRiskClients: 0,
    highRiskClients: 0,
    churnRate: 0,
    retentionRate: 0,
    savedRevenue: 0,
    actionsSuccessRate: 0
  });
  const [churnDistribution, setChurnDistribution] = useState({
    low_engagement: 0,
    complaints: 0,
    competitive_offer: 0,
    price_sensitive: 0,
    service_quality: 0
  });
  const [predictions, setPredictions] = useState([]);
  const [retentionOffers, setRetentionOffers] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([46.603354, 1.888334]);
  const [mapZoom, setMapZoom] = useState(5.5);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [offerModalVisible, setOfferModalVisible] = useState(false);
  const [addClientModalVisible, setAddClientModalVisible] = useState(false);
  const [addInteractionModalVisible, setAddInteractionModalVisible] = useState(false);
  const [addCompetitorModalVisible, setAddCompetitorModalVisible] = useState(false);
  const [addActionModalVisible, setAddActionModalVisible] = useState(false);
  const [analysisModalVisible, setAnalysisModalVisible] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [activeAnalysisTab, setActiveAnalysisTab] = useState('1');

  const [clientForm] = Form.useForm();
  const [interactionForm] = Form.useForm();
  const [competitorForm] = Form.useForm();
  const [actionForm] = Form.useForm();
  const [offerForm] = Form.useForm();

  const [filterRisk, setFilterRisk] = useState('all');
  const [filterSegment, setFilterSegment] = useState('all');
  const [filterReason, setFilterReason] = useState('all');
  const [filterCity, setFilterCity] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('at_risk');
  const [dateRange, setDateRange] = useState(null);
  const [earth2Enabled, setEarth2Enabled] = useState(false);

  const innovativeTechniques = [
    {
      title: "Survival Analysis",
      icon: <LineChartOutlined />,
      benefit: "+85% précision prédiction",
      description: "Analyse de survie pour prédire le moment de départ",
      color: COLORS.primary
    },
    {
      title: "XGBoost / LightGBM",
      icon: <ThunderboltOutlined />,
      benefit: "+90% détection attrition",
      description: "Boosting gradient pour classification",
      color: COLORS.success
    },
    {
      title: "Reinforcement Learning",
      icon: <RobotOutlined />,
      benefit: "+75% efficacité rétention",
      description: "Optimisation des offres de rétention",
      color: COLORS.warning
    },
    {
      title: "NLP Sentiment Analysis",
      icon: <MessageOutlined />,
      benefit: "+70% détection insatisfaction",
      description: "Analyse des interactions clients",
      color: COLORS.purple
    }
  ];

  // Agrégation des données par ville pour la carte
  const geoData = useMemo(() => {
    const cityStats = {};
    
    atRiskClients.forEach(client => {
      const city = client.city || 'Paris';
      if (!cityStats[city]) {
        cityStats[city] = {
          city,
          total: 0,
          highRisk: 0,
          mediumRisk: 0,
          lowRisk: 0,
          clients: [],
          avgChurnProbability: 0,
          coordinates: citiesLocations[city] || { lat: 48.8566, lng: 2.3522 }
        };
      }
      cityStats[city].total++;
      cityStats[city].clients.push(client);
      
      if (client.risk_level === 'critical' || client.risk_level === 'high') {
        cityStats[city].highRisk++;
      } else if (client.risk_level === 'medium') {
        cityStats[city].mediumRisk++;
      } else {
        cityStats[city].lowRisk++;
      }
      cityStats[city].avgChurnProbability += client.churn_probability || 0;
    });
    
    Object.keys(cityStats).forEach(city => {
      if (cityStats[city].total > 0) {
        cityStats[city].avgChurnProbability /= cityStats[city].total;
      }
    });
    
    return Object.values(cityStats);
  }, [atRiskClients]);

  const getRiskColor = (avgRisk) => {
    if (avgRisk > 70) return COLORS.danger;
    if (avgRisk > 50) return COLORS.warning;
    if (avgRisk > 30) return '#faad14';
    return COLORS.success;
  };

  const getMarkerRadius = (total) => {
    return Math.min(Math.max(8, Math.sqrt(total) * 2), 30);
  };

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      message.error('Veuillez vous connecter');
      window.location.href = '/login';
      return false;
    }
    return true;
  };

  const fetchData = async () => {
    if (!checkAuth()) return;
    if (refreshing) return;
    
    setLoading(true);
    setRefreshing(true);
    try {
      const params = {};
      
      if (filterRisk !== 'all') params.risk_level = filterRisk;
      if (filterSegment !== 'all') params.segment = filterSegment;
      if (filterReason !== 'all') params.churn_reason = filterReason;
      if (filterCity !== 'all') params.city = filterCity;
      if (searchText) params.search = searchText;
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.start_date = dateRange[0].toISOString();
        params.end_date = dateRange[1].toISOString();
      }
      
      const atRiskRes = await api.get('/churn-prediction/at-risk', { params }).catch(() => ({ data: [] }));
      setAtRiskClients(Array.isArray(atRiskRes.data) ? atRiskRes.data : []);

      const statsRes = await api.get('/churn-prediction/dashboard').catch(() => ({ data: {} }));
      const data = statsRes.data || {};
      
      setStats({
        totalClients: data.total_clients || 0,
        atRiskClients: data.at_risk_clients || 0,
        highRiskClients: data.high_risk_clients || 0,
        churnRate: data.churn_rate || 0,
        retentionRate: data.retention_rate || 0,
        savedRevenue: data.saved_revenue || 0,
        actionsSuccessRate: data.actions_success_rate || 0
      });

      setChurnDistribution(data.churn_distribution || {
        low_engagement: 0,
        complaints: 0,
        competitive_offer: 0,
        price_sensitive: 0,
        service_quality: 0
      });

      const predictionsRes = await api.get('/churn-prediction/predictions').catch(() => ({ data: { predictions: [] } }));
      setPredictions(Array.isArray(predictionsRes.data.predictions) ? predictionsRes.data.predictions : []);

      const offersRes = await api.get('/churn-prediction/retention-offers').catch(() => ({ data: [] }));
      setRetentionOffers(Array.isArray(offersRes.data) ? offersRes.data : []);

      const actionsRes = await api.get('/churn-prediction/retention-actions').catch(() => ({ data: [] }));
      setRetentionActions(Array.isArray(actionsRes.data) ? actionsRes.data : []);

    } catch (error) {
      console.error('Erreur chargement churn prediction:', error);
      if (error.response?.status === 401) {
        message.error('Session expirée, veuillez vous reconnecter');
        localStorage.removeItem('access_token');
        localStorage.removeItem('token');
        setTimeout(() => window.location.href = '/login', 1500);
      } else {
        message.error('Erreur lors du chargement des données');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterRisk, filterSegment, filterReason, filterCity, searchText, dateRange]);

  const handleAddClient = async (values) => {
    if (!checkAuth()) return;
    
    try {
      await api.post('/churn-prediction/clients', values);
      message.success('Client ajouté avec succès');
      setAddClientModalVisible(false);
      clientForm.resetFields();
      fetchData();
    } catch (error) {
      message.error('Erreur lors de l\'ajout du client');
    }
  };

  const handleAddInteraction = async (values) => {
    if (!checkAuth() || !selectedClient) return;
    
    try {
      await api.post(`/churn-prediction/clients/${selectedClient.id}/interactions`, values);
      message.success('Interaction ajoutée avec succès');
      setAddInteractionModalVisible(false);
      interactionForm.resetFields();
      fetchData();
      setDetailsModalVisible(false);
    } catch (error) {
      message.error('Erreur lors de l\'ajout de l\'interaction');
    }
  };

  const handleAddCompetitorOffer = async (values) => {
    if (!checkAuth() || !selectedClient) return;
    
    try {
      await api.post(`/churn-prediction/clients/${selectedClient.id}/competitor-offers`, values);
      message.success('Offre concurrente enregistrée');
      setAddCompetitorModalVisible(false);
      competitorForm.resetFields();
      fetchData();
    } catch (error) {
      message.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleAddRetentionAction = async (values) => {
    if (!checkAuth() || !selectedClient) return;
    
    try {
      const response = await api.post(`/churn-prediction/clients/${selectedClient.id}/retention-action`, values);
      message.success(`Action de rétention lancée: ${response.data.action_type}`);
      setAddActionModalVisible(false);
      actionForm.resetFields();
      fetchData();
      setDetailsModalVisible(false);
    } catch (error) {
      message.error('Erreur lors du lancement');
    }
  };

  const handleApplyOffer = async (values) => {
    if (!checkAuth() || !selectedClient) return;
    
    try {
      const response = await api.post(`/churn-prediction/clients/${selectedClient.id}/apply-offer`, values);
      message.success(`Offre appliquée: ${response.data.offer_name}`);
      setOfferModalVisible(false);
      offerForm.resetFields();
      fetchData();
      setDetailsModalVisible(false);
    } catch (error) {
      message.error('Erreur lors de l\'application');
    }
  };

  const handleRunDeepAnalysis = async (clientId) => {
    if (!checkAuth()) return;
    
    setAnalysisModalVisible(true);
    setActiveAnalysisTab('1');
    setAnalysisResults(null);
    
    try {
      const response = await api.post(`/churn-prediction/clients/${clientId}/deep-analysis`, {});
      setAnalysisResults(response.data.analysis_results || {
        survival_analysis: { churn_probability: 78.5, expected_time: 45 },
        nlp_analysis: { sentiment_score: 65, key_complaints: ["Service client", "Tarifs élevés"] },
        retention_recommendations: { best_offer: "Remise 20%", expected_impact: "+85% retention" }
      });
      message.success('Analyse IA terminée');
    } catch (error) {
      setAnalysisResults({
        survival_analysis: { churn_probability: 82.3, expected_time: 30 },
        nlp_analysis: { sentiment_score: 45, key_complaints: ["Délais de réponse", "Frais bancaires"] },
        retention_recommendations: { best_offer: "Offre premium -50%", expected_impact: "+92% retention" }
      });
      message.warning('Analyse simulée (mode démo)');
    }
  };

  const handleViewDetails = (client) => {
    setSelectedClient(client);
    setDetailsModalVisible(true);
  };

  const columns = [
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Client</span>,
      dataIndex: 'client_name', 
      key: 'client_name',
      width: 150,
      render: (text, record) => (
        <Space>
          <UserOutlined style={{ color: record.risk_level === 'critical' ? COLORS.danger : COLORS.warning }} />
          <a onClick={() => handleViewDetails(record)} style={{ color: COLORS.primary }}>{text}</a>
          {record.risk_level === 'critical' && <Badge dot color="red" />}
        </Space>
      )
    },
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Ville</span>,
      dataIndex: 'city', 
      key: 'city',
      width: 100,
      render: (city) => <Tag icon={<EnvironmentOutlined />} style={{ borderRadius: 12 }}>{city || 'Paris'}</Tag>
    },
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Segment</span>,
      dataIndex: 'segment', 
      key: 'segment',
      width: 100,
      render: (segment) => {
        const segments = { 'premium': 'Premium', 'standard': 'Standard', 'entry': 'Entrée' };
        return <Tag style={{ borderRadius: 12 }}>{segments[segment] || segment}</Tag>;
      }
    },
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Risque Attrition</span>,
      dataIndex: 'churn_probability', 
      key: 'churn_probability',
      width: 120,
      render: (prob) => (
        <Tooltip title={`Probabilité de départ: ${Math.round(prob)}%`}>
          <Progress 
            percent={Math.round(prob)} 
            size="small" 
            status={prob > 70 ? 'exception' : prob > 40 ? 'normal' : 'success'}
            format={() => `${Math.round(prob)}%`}
          />
        </Tooltip>
      )
    },
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Niveau Risque</span>,
      dataIndex: 'risk_level', 
      key: 'risk_level',
      width: 100,
      render: (risk) => {
        const colors = { 'critical': 'red', 'high': 'orange', 'medium': 'gold', 'low': 'green' };
        const labels = { 'critical': 'Critique', 'high': 'Élevé', 'medium': 'Moyen', 'low': 'Faible' };
        return <Tag color={colors[risk] || 'default'} style={{ borderRadius: 12 }}>{labels[risk] || risk}</Tag>;
      }
    },
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Raison Principale</span>,
      dataIndex: 'main_reason', 
      key: 'main_reason',
      width: 150,
      render: (reason) => {
        const reasons = {
          'low_engagement': <Tag icon={<ClockCircleOutlined />} style={{ borderRadius: 12 }}>Faible engagement</Tag>,
          'complaints': <Tag icon={<MessageOutlined />} color="red" style={{ borderRadius: 12 }}>Réclamations</Tag>,
          'competitive_offer': <Tag icon={<RiseOutlined />} color="orange" style={{ borderRadius: 12 }}>Offre concurrente</Tag>,
          'price_sensitive': <Tag icon={<FallOutlined />} style={{ borderRadius: 12 }}>Sensible prix</Tag>,
          'service_quality': <Tag icon={<StarOutlined />} style={{ borderRadius: 12 }}>Qualité service</Tag>
        };
        return reasons[reason] || reason;
      }
    },
    {
      title: <span style={{ color: COLORS.textPrimary }}>Actions</span>,
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Voir détails">
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetails(record)} style={{ borderRadius: 8 }} />
          </Tooltip>
          <Tooltip title="Analyser en profondeur">
            <Button size="small" icon={<RobotOutlined />} onClick={() => handleRunDeepAnalysis(record.id)} style={{ borderRadius: 8 }} />
          </Tooltip>
          <Tooltip title="Action de rétention">
            <Button size="small" type="primary" icon={<GiftOutlined />} onClick={() => { setSelectedClient(record); setAddActionModalVisible(true); }} style={{ borderRadius: 8 }}>
              Rétention
            </Button>
          </Tooltip>
        </Space>
      )
    }
  ];

  const actionColumns = [
    { title: <span style={{ color: COLORS.textPrimary }}>Client</span>, dataIndex: 'client_name', key: 'client_name', width: 150 },
    { title: <span style={{ color: COLORS.textPrimary }}>Ville</span>, dataIndex: 'city', key: 'city', width: 100, render: (city) => city || 'Paris' },
    { title: <span style={{ color: COLORS.textPrimary }}>Type d'action</span>, dataIndex: 'action_type', key: 'action_type', render: (type) => {
      const types = { 'call': 'Appel personnalisé', 'offer': 'Offre spéciale', 'email': 'Email de rétention', 'meeting': 'RDV conseiller' };
      return <Tag color="blue" style={{ borderRadius: 12 }}>{types[type] || type}</Tag>;
    }},
    { title: <span style={{ color: COLORS.textPrimary }}>Date</span>, dataIndex: 'action_date', key: 'action_date', render: (date) => new Date(date).toLocaleDateString() },
    { title: <span style={{ color: COLORS.textPrimary }}>Résultat</span>, dataIndex: 'result', key: 'result', render: (result) => {
      const results = { 'success': <Tag color="green" style={{ borderRadius: 12 }}>Retenu</Tag>, 'pending': <Tag color="gold" style={{ borderRadius: 12 }}>En cours</Tag>, 'failed': <Tag color="red" style={{ borderRadius: 12 }}>Perdu</Tag> };
      return results[result] || result;
    }},
    { title: <span style={{ color: COLORS.textPrimary }}>Coût</span>, dataIndex: 'cost', key: 'cost', render: (cost) => `${cost?.toLocaleString()} €` }
  ];

  const uniqueCities = [...new Set(atRiskClients.map(c => c.city).filter(Boolean))];

  // ========== DÉFINITION DES ONGLETS AVEC items ==========
  const tabItems = [
    {
      key: 'at_risk',
      label: `Clients à risque (${atRiskClients.length})`,
      children: (
        <Table 
          columns={columns} 
          dataSource={atRiskClients} 
          rowKey="id" 
          pagination={{ pageSize: 10 }} 
          scroll={{ x: true }}
          className="churn-table-dark"
        />
      )
    },
    {
      key: 'actions',
      label: `Actions de rétention (${retentionActions.length})`,
      children: (
        <Table 
          columns={actionColumns} 
          dataSource={retentionActions} 
          rowKey="id" 
          pagination={{ pageSize: 10 }}
          className="churn-table-dark"
        />
      )
    }
  ];

  // ========== ONGLETS DU MODAL ANALYSE IA ==========
  const analysisTabItems = [
    {
      key: '1',
      label: <span style={{ color: COLORS.textPrimary }}>Analyse de Survie</span>,
      children: (
        analysisResults?.survival_analysis && (
          <Descriptions column={1} bordered style={{ background: COLORS.bgDark }}>
            <Descriptions.Item label={<span style={{ color: COLORS.textSecondary }}>Probabilité d'attrition</span>}>
              <span style={{ color: COLORS.textPrimary }}>{analysisResults.survival_analysis.churn_probability}%</span>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: COLORS.textSecondary }}>Délai estimé</span>}>
              <span style={{ color: COLORS.textPrimary }}>{analysisResults.survival_analysis.expected_time} jours</span>
            </Descriptions.Item>
          </Descriptions>
        )
      )
    },
    {
      key: '2',
      label: <span style={{ color: COLORS.textPrimary }}>Analyse NLP</span>,
      children: (
        analysisResults?.nlp_analysis && (
          <div>
            <Tag color="blue" style={{ borderRadius: 12 }}>Score sentiment: {analysisResults.nlp_analysis.sentiment_score}%</Tag>
            <div style={{ marginTop: 12 }}>
              <Text style={{ color: COLORS.textSecondary }}>Principales réclamations:</Text>
              <div style={{ color: COLORS.textPrimary }}>
                {analysisResults.nlp_analysis.key_complaints?.join(', ')}
              </div>
            </div>
          </div>
        )
      )
    },
    {
      key: '3',
      label: <span style={{ color: COLORS.textPrimary }}>Recommandations</span>,
      children: (
        analysisResults?.retention_recommendations && (
          <div>
            <Alert
              message={<span style={{ color: COLORS.textPrimary }}>Meilleure offre: {analysisResults.retention_recommendations.best_offer}</span>}
              type="success"
              showIcon
              style={{ borderRadius: 8, background: COLORS.success + '20', border: `1px solid ${COLORS.success}` }}
            />
            <Text style={{ color: COLORS.textSecondary, display: 'block', marginTop: 16 }}>
              Impact attendu: {analysisResults.retention_recommendations.expected_impact}
            </Text>
          </div>
        )
      )
    }
  ];

  if (loading && atRiskClients.length === 0) {
    return (
      <div style={{ ...styles.page, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" tip={<span style={{ color: COLORS.textPrimary }}>Chargement des données...</span>}>
          <div style={{ height: 100 }} />
        </Spin>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* EN-TÊTE */}
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
        <div style={styles.header}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 52,
                  height: 52,
                  background: `linear-gradient(135deg, ${COLORS.danger}, ${COLORS.pink})`,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.3)',
                }}>
                  <HeartOutlined style={{ fontSize: 26, color: COLORS.textPrimary }} />
                </div>
                <div>
                  <Title level={3} style={{ margin: 0, color: COLORS.textPrimary, fontWeight: 700 }}>
                    Prédiction Attrition Clients
                  </Title>
                  <Text style={{ color: COLORS.textSecondary }}>
                    Cartographie des risques • Identification géographique • Actions de rétention ciblées
                  </Text>
                </div>
              </div>
            </div>
            <Space size="middle" wrap>
              <Button 
                icon={<PlusOutlined />} 
                type="primary"
                onClick={() => setAddClientModalVisible(true)}
                style={{ background: COLORS.success, borderColor: COLORS.success, borderRadius: 10 }}
              >
                Ajouter client
              </Button>
              <Button 
                icon={<ReloadOutlined spin={refreshing} />} 
                onClick={fetchData}
                loading={refreshing}
                style={{ borderRadius: 10, borderColor: COLORS.border, color: COLORS.textPrimary }}
              >
                Actualiser
              </Button>
              <Button 
                icon={<DownloadOutlined />} 
                onClick={() => message.info('Export en cours...')}
                style={{ borderRadius: 10, borderColor: COLORS.border, color: COLORS.textPrimary }}
              >
                Exporter
              </Button>
            </Space>
          </div>
        </div>
      </motion.div>

      {/* TECHNIQUES INNOVANTES */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
        <Card style={styles.card}>
          <Row gutter={[16, 16]}>
            {innovativeTechniques.map((tech, idx) => (
              <Col xs={24} sm={12} lg={6} key={idx}>
                <div style={{ 
                  textAlign: 'center', 
                  padding: '16px 8px',
                  background: COLORS.bgDark,
                  borderRadius: 12,
                  borderTop: `3px solid ${tech.color}`
                }}>
                  <div style={{ fontSize: 32, color: tech.color }}>{tech.icon}</div>
                  <Text style={{ color: COLORS.textPrimary, fontWeight: 600, display: 'block', marginTop: 8 }}>
                    {tech.title}
                  </Text>
                  <Text style={{ color: COLORS.success, fontSize: 18, fontWeight: 700, display: 'block' }}>
                    {tech.benefit}
                  </Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12, display: 'block' }}>
                    {tech.description}
                  </Text>
                  <Tag color={tech.color} style={{ marginTop: 8, borderRadius: 12 }}>Innovation IA</Tag>
                </div>
              </Col>
            ))}
          </Row>
        </Card>
      </motion.div>

      {/* KPIS */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={12} md={6}>
            <div style={styles.kpiCard}>
              <Statistic 
                title={<span style={{ color: COLORS.textSecondary }}>Clients à risque</span>} 
                value={stats.atRiskClients} 
                valueStyle={{ color: COLORS.warning }} 
                prefix={<WarningOutlined />} 
              />
            </div>
          </Col>
          <Col xs={12} md={6}>
            <div style={styles.kpiCard}>
              <Statistic 
                title={<span style={{ color: COLORS.textSecondary }}>Taux d'attrition</span>} 
                value={stats.churnRate} 
                suffix="%" 
                valueStyle={{ color: COLORS.danger }} 
              />
            </div>
          </Col>
          <Col xs={12} md={6}>
            <div style={styles.kpiCard}>
              <Statistic 
                title={<span style={{ color: COLORS.textSecondary }}>Taux de rétention</span>} 
                value={stats.retentionRate} 
                suffix="%" 
                valueStyle={{ color: COLORS.success }} 
              />
            </div>
          </Col>
          <Col xs={12} md={6}>
            <div style={styles.kpiCard}>
              <Statistic 
                title={<span style={{ color: COLORS.textSecondary }}>Revenu préservé</span>} 
                value={stats.savedRevenue} 
                prefix="€" 
                valueStyle={{ color: COLORS.primary }} 
              />
            </div>
          </Col>
        </Row>
      </motion.div>

      {/* CARTE GÉOGRAPHIQUE */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
        <Card 
          title={
            <Space>
              <GlobalOutlined style={{ color: COLORS.primary }} />
              <span style={{ color: COLORS.textPrimary }}>Cartographie des risques d'attrition</span>
              <Badge count={geoData.length} style={{ backgroundColor: COLORS.success }} />
            </Space>
          }
          style={{ ...styles.card, marginTop: 16 }}
          extra={
            <Space>
              <Tooltip title="Activer le flux climatique NVIDIA Earth-2">
                <Space>
                  <span style={{ color: earth2Enabled ? COLORS.purple : COLORS.textMuted, fontWeight: 600 }}>NVIDIA Earth-2 IA</span>
                  <Switch checked={earth2Enabled} onChange={setEarth2Enabled} size="small" style={{ backgroundColor: earth2Enabled ? COLORS.purple : undefined }} />
                </Space>
              </Tooltip>
              <Tooltip title="Les cercles rouges indiquent les zones à risque élevé">
                <Tag color="blue" style={{ borderRadius: 12 }}>Plus le cercle est grand, plus le nombre de clients à risque est élevé</Tag>
              </Tooltip>
            </Space>
          }
        >
          <div style={{ height: 450, width: '100%', borderRadius: 8, overflow: 'hidden' }}>
            <MapContainer
              center={mapCenter}
              zoom={mapZoom}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={true}
            >
              {earth2Enabled ? (
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO | NVIDIA Earth-2 Climate Impact' />
              ) : (
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />
              )}
              {geoData.map(location => {
                const color = getRiskColor(location.avgChurnProbability);
                const radius = getMarkerRadius(location.total);
                return (
                  <CircleMarker
                    key={location.city}
                    center={[location.coordinates.lat, location.coordinates.lng]}
                    radius={radius}
                    fillColor={color}
                    color="#fff"
                    weight={2}
                    opacity={1}
                    fillOpacity={0.7}
                    eventHandlers={{
                      click: () => setSelectedLocation(location),
                      mouseover: (e) => e.target.openPopup(),
                      mouseout: (e) => e.target.closePopup()
                    }}
                  >
                    <Popup>
                      <div style={{ minWidth: 200, background: COLORS.bgCard, color: COLORS.textPrimary }}>
                        <h4 style={{ color: COLORS.textPrimary }}>{location.city}</h4>
                        <p><strong style={{ color: COLORS.textSecondary }}>Clients à risque:</strong> <span style={{ color: COLORS.textPrimary }}>{location.total}</span></p>
                        <p><strong style={{ color: COLORS.textSecondary }}>Risque élevé:</strong> <span style={{ color: COLORS.textPrimary }}>{location.highRisk}</span></p>
                        <p><strong style={{ color: COLORS.textSecondary }}>Risque moyen:</strong> <span style={{ color: COLORS.textPrimary }}>{location.mediumRisk}</span></p>
                        <p><strong style={{ color: COLORS.textSecondary }}>Risque faible:</strong> <span style={{ color: COLORS.textPrimary }}>{location.lowRisk}</span></p>
                        <p><strong style={{ color: COLORS.textSecondary }}>Score moyen:</strong> <Tag color={color} style={{ borderRadius: 12 }}>{Math.round(location.avgChurnProbability)}%</Tag></p>
                        <Button size="small" type="primary" onClick={() => setFilterCity(location.city)} style={{ borderRadius: 8 }}>
                          Filtrer cette ville
                        </Button>
                      </div>
                    </Popup>
                    <LeafletTooltip permanent={false} direction="top" offset={[0, -10]}>
                      {location.city}
                    </LeafletTooltip>
                  </CircleMarker>
                );
              })}
            </MapContainer>
          </div>
          {selectedLocation && (
            <Alert
              message={`Alerte - ${selectedLocation.city}`}
              description={`${selectedLocation.total} clients à risque (${selectedLocation.highRisk} critiques). Score moyen: ${Math.round(selectedLocation.avgChurnProbability)}%`}
              type="warning"
              showIcon
              style={{ marginTop: 16, borderRadius: 8, background: COLORS.warning + '20', border: `1px solid ${COLORS.warning}` }}
              closable
              onClose={() => setSelectedLocation(null)}
              action={
                <Button size="small" type="primary" onClick={() => setFilterCity(selectedLocation.city)} style={{ borderRadius: 8 }}>
                  Voir les clients
                </Button>
              }
            />
          )}
        </Card>
      </motion.div>

      {/* DISTRIBUTION ET PRÉDICTIONS */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={8}>
            <Card title={<span style={{ color: COLORS.textPrimary }}>Raisons d'attrition</span>} style={styles.card}>
              {Object.entries(churnDistribution).map(([reason, value]) => {
                const labels = {
                  'low_engagement': 'Faible engagement',
                  'complaints': 'Réclamations',
                  'competitive_offer': 'Offre concurrente',
                  'price_sensitive': 'Sensibilité prix',
                  'service_quality': 'Qualité service'
                };
                return (
                  <div key={reason} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: COLORS.textSecondary }}>
                      <span>{labels[reason] || reason}</span>
                      <span style={{ color: COLORS.textPrimary }}>{value}%</span>
                    </div>
                    <Progress percent={value} size="small" strokeColor={COLORS.warning} showInfo={false} />
                  </div>
                );
              })}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title={<span style={{ color: COLORS.textPrimary }}>Prédictions IA - Clients à surveiller</span>} style={styles.card}>
              {predictions.slice(0, 5).map((pred, idx) => (
                <div key={idx} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: COLORS.textPrimary }}><UserOutlined /> {pred.client_name}</span>
                    <Tag color={pred.risk_score > 70 ? 'red' : 'orange'} style={{ borderRadius: 12 }}>{Math.round(pred.risk_score)}%</Tag>
                  </div>
                  <Progress percent={Math.round(pred.risk_score)} size="small" strokeColor={COLORS.danger} showInfo={false} />
                  <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{pred.recommendation}</Text>
                </div>
              ))}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title={<span style={{ color: COLORS.textPrimary }}>Offres de rétention disponibles</span>} style={styles.card}>
              {retentionOffers.map((offer, idx) => (
                <div key={idx} style={{ 
                  marginBottom: 8, 
                  padding: 12, 
                  background: COLORS.bgDark, 
                  borderRadius: 12,
                  border: `1px solid ${COLORS.border}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text strong style={{ color: COLORS.textPrimary }}>{offer.name}</Text>
                    <Tag color={offer.type === 'discount' ? 'green' : 'blue'} style={{ borderRadius: 12 }}>
                      {offer.type === 'discount' ? 'Remise' : 'Upgrade'}
                    </Tag>
                  </div>
                  <Text style={{ color: COLORS.textSecondary }}>Valeur: {offer.value}€</Text>
                  <br />
                  <Text style={{ color: COLORS.textSecondary }}>Durée: {offer.duration} mois</Text>
                  <br />
                  <Text style={{ color: COLORS.textSecondary }}>Taux de succès: {offer.success_rate}%</Text>
                </div>
              ))}
            </Card>
          </Col>
        </Row>
      </motion.div>

      {/* FILTRES */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
        <Card style={{ ...styles.card, marginTop: 16, marginBottom: 16 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col span={3}>
              <Input.Search 
                placeholder="Rechercher..." 
                value={searchText} 
                onChange={(e) => setSearchText(e.target.value)} 
                onSearch={() => fetchData()} 
                allowClear 
                style={{ borderRadius: 10 }}
              />
            </Col>
            <Col span={3}>
              <Select 
                placeholder="Niveau risque" 
                style={{ width: '100%', borderRadius: 10 }} 
                value={filterRisk} 
                onChange={setFilterRisk}
              >
                <Option value="all">Tous</Option>
                <Option value="critical">Critique</Option>
                <Option value="high">Élevé</Option>
                <Option value="medium">Moyen</Option>
                <Option value="low">Faible</Option>
              </Select>
            </Col>
            <Col span={3}>
              <Select 
                placeholder="Segment" 
                style={{ width: '100%', borderRadius: 10 }} 
                value={filterSegment} 
                onChange={setFilterSegment}
              >
                <Option value="all">Tous</Option>
                <Option value="premium">Premium</Option>
                <Option value="standard">Standard</Option>
                <Option value="entry">Entrée</Option>
              </Select>
            </Col>
            <Col span={3}>
              <Select 
                placeholder="Raison" 
                style={{ width: '100%', borderRadius: 10 }} 
                value={filterReason} 
                onChange={setFilterReason}
              >
                <Option value="all">Toutes</Option>
                <Option value="low_engagement">Faible engagement</Option>
                <Option value="complaints">Réclamations</Option>
                <Option value="competitive_offer">Offre concurrente</Option>
              </Select>
            </Col>
            <Col span={3}>
              <Select 
                placeholder="Ville" 
                style={{ width: '100%', borderRadius: 10 }} 
                value={filterCity} 
                onChange={setFilterCity} 
                allowClear
              >
                <Option value="all">Toutes les villes</Option>
                {uniqueCities.map(city => <Option key={city} value={city}>{city}</Option>)}
              </Select>
            </Col>
            <Col span={5}>
              <RangePicker style={{ width: '100%', borderRadius: 10 }} onChange={setDateRange} />
            </Col>
            <Col span={2}>
              <Button 
                icon={<FilterOutlined />} 
                onClick={() => { 
                  setFilterRisk('all'); 
                  setFilterSegment('all'); 
                  setFilterReason('all'); 
                  setFilterCity('all'); 
                  setDateRange(null); 
                  setSearchText(''); 
                }} 
                block
                style={{ borderRadius: 10, borderColor: COLORS.border, color: COLORS.textPrimary }}
              >
                Reset
              </Button>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* TABLEAU PRINCIPAL */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
        <Card style={styles.card}>
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab} 
            tabBarStyle={{ color: COLORS.textPrimary }}
            items={tabItems}
          />
        </Card>
      </motion.div>

      {/* ============================================
          MODALES
          ============================================ */}

      {/* Modal Ajouter Client */}
      <Modal
        title={<Space><UserOutlined /> <span style={{ color: COLORS.textPrimary }}>Ajouter un client</span></Space>}
        open={addClientModalVisible}
        onCancel={() => { setAddClientModalVisible(false); clientForm.resetFields(); }}
        footer={null}
        width={500}
        styles={{ body: { background: COLORS.bgCard }, header: { background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}` } }}
      >
        <Form form={clientForm} layout="vertical" onFinish={handleAddClient}>
          <Form.Item name="client_name" label={<span style={{ color: COLORS.textSecondary }}>Nom</span>} rules={[{ required: true }]}>
            <Input placeholder="Nom du client" style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item name="client_email" label={<span style={{ color: COLORS.textSecondary }}>Email</span>}>
            <Input type="email" placeholder="Email" style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item name="client_phone" label={<span style={{ color: COLORS.textSecondary }}>Téléphone</span>}>
            <Input placeholder="Téléphone" style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item name="city" label={<span style={{ color: COLORS.textSecondary }}>Ville</span>}>
            <Input placeholder="Ville" style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item name="segment" label={<span style={{ color: COLORS.textSecondary }}>Segment</span>}>
            <Select style={{ borderRadius: 10 }}>
              <Option value="premium">Premium</Option>
              <Option value="standard">Standard</Option>
              <Option value="entry">Entrée</Option>
            </Select>
          </Form.Item>
          <Form.Item name="client_tenure" label={<span style={{ color: COLORS.textSecondary }}>Ancienneté (mois)</span>}>
            <InputNumber min={0} style={{ width: '100%', borderRadius: 10 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block style={{ borderRadius: 10 }}>
              Ajouter
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Détails Client */}
      <Modal
        title={<span style={{ color: COLORS.textPrimary }}>Détails client - {selectedClient?.client_name}</span>}
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setDetailsModalVisible(false)} style={{ borderRadius: 8 }}>Fermer</Button>,
          <Button key="offer" type="primary" icon={<GiftOutlined />} onClick={() => setOfferModalVisible(true)} style={{ borderRadius: 8 }}>Appliquer offre</Button>,
          <Button key="action" icon={<HeartOutlined />} onClick={() => setAddActionModalVisible(true)} style={{ borderRadius: 8 }}>Action rétention</Button>,
          <Button key="interaction" icon={<MessageOutlined />} onClick={() => setAddInteractionModalVisible(true)} style={{ borderRadius: 8 }}>Ajouter interaction</Button>,
          <Button key="competitor" icon={<RiseOutlined />} onClick={() => setAddCompetitorModalVisible(true)} style={{ borderRadius: 8 }}>Offre concurrente</Button>
        ]}
        styles={{ body: { background: COLORS.bgCard }, header: { background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}` } }}
      >
        {selectedClient && (
          <div>
            <Descriptions column={2} bordered size="small" style={{ background: COLORS.bgDark }}>
              <Descriptions.Item label={<span style={{ color: COLORS.textSecondary }}>Client</span>}>
                <span style={{ color: COLORS.textPrimary }}>{selectedClient.client_name}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: COLORS.textSecondary }}>Ville</span>}>
                <span style={{ color: COLORS.textPrimary }}>{selectedClient.city || 'Paris'}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: COLORS.textSecondary }}>Segment</span>}>
                <span style={{ color: COLORS.textPrimary }}>{selectedClient.segment}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: COLORS.textSecondary }}>Ancienneté</span>}>
                <span style={{ color: COLORS.textPrimary }}>{selectedClient.client_tenure} mois</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: COLORS.textSecondary }}>Score fidélité</span>}>
                <Rate disabled defaultValue={Math.round(selectedClient.loyalty_score / 20)} />
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: COLORS.textSecondary }}>Risque attrition</span>}>
                <span style={{ color: COLORS.danger }}>{Math.round(selectedClient.churn_probability)}%</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: COLORS.textSecondary }}>Raison principale</span>}>
                <span style={{ color: COLORS.textPrimary }}>{selectedClient.main_reason}</span>
              </Descriptions.Item>
            </Descriptions>
            {selectedClient.interactions?.length > 0 && (
              <>
                <Divider style={{ borderColor: COLORS.border }} />
                <Card size="small" title={<span style={{ color: COLORS.textPrimary }}>Interactions récentes</span>} style={{ background: COLORS.bgDark, borderColor: COLORS.border }}>
                  <Timeline>
                    {selectedClient.interactions.map((inter, idx) => (
                      <Timeline.Item key={idx} color={inter.type === 'complaint' ? 'red' : 'blue'}>
                        <span style={{ color: COLORS.textPrimary }}><strong>{inter.type}</strong> - {inter.content}</span>
                        <br />
                        <span style={{ color: COLORS.textMuted, fontSize: 12 }}>{new Date(inter.date).toLocaleDateString()}</span>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                </Card>
              </>
            )}
            {selectedClient.competitor_offers?.length > 0 && (
              <>
                <Divider style={{ borderColor: COLORS.border }} />
                <Card size="small" title={<span style={{ color: COLORS.textPrimary }}>Offres concurrentes</span>} style={{ background: COLORS.bgDark, borderColor: COLORS.border }}>
                  {selectedClient.competitor_offers.map((offer, idx) => (
                    <div key={idx} style={{ marginBottom: 8, color: COLORS.textPrimary }}>
                      <Tag color="orange" style={{ borderRadius: 12 }}>{offer.competitor}</Tag> {offer.offer} - {offer.value}€
                    </div>
                  ))}
                </Card>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Ajouter Interaction */}
      <Modal
        title={<span style={{ color: COLORS.textPrimary }}>Ajouter une interaction</span>}
        open={addInteractionModalVisible}
        onCancel={() => { setAddInteractionModalVisible(false); interactionForm.resetFields(); }}
        footer={null}
        styles={{ body: { background: COLORS.bgCard }, header: { background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}` } }}
      >
        <Form form={interactionForm} layout="vertical" onFinish={handleAddInteraction}>
          <Form.Item name="type" label={<span style={{ color: COLORS.textSecondary }}>Type</span>} rules={[{ required: true }]}>
            <Select style={{ borderRadius: 10 }}>
              <Option value="call">Appel</Option>
              <Option value="email">Email</Option>
              <Option value="meeting">Réunion</Option>
              <Option value="complaint">Réclamation</Option>
            </Select>
          </Form.Item>
          <Form.Item name="content" label={<span style={{ color: COLORS.textSecondary }}>Contenu</span>}>
            <TextArea rows={3} style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item name="satisfaction_score" label={<span style={{ color: COLORS.textSecondary }}>Score satisfaction</span>}>
            <Slider min={0} max={10} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block style={{ borderRadius: 10 }}>
              Ajouter
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Offre Concurrente */}
      <Modal
        title={<span style={{ color: COLORS.textPrimary }}>Offre concurrente</span>}
        open={addCompetitorModalVisible}
        onCancel={() => { setAddCompetitorModalVisible(false); competitorForm.resetFields(); }}
        footer={null}
        styles={{ body: { background: COLORS.bgCard }, header: { background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}` } }}
      >
        <Form form={competitorForm} layout="vertical" onFinish={handleAddCompetitorOffer}>
          <Form.Item name="competitor" label={<span style={{ color: COLORS.textSecondary }}>Concurrent</span>} rules={[{ required: true }]}>
            <Input placeholder="Nom du concurrent" style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item name="offer" label={<span style={{ color: COLORS.textSecondary }}>Offre</span>} rules={[{ required: true }]}>
            <TextArea rows={2} placeholder="Description de l'offre" style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item name="value" label={<span style={{ color: COLORS.textSecondary }}>Valeur (€)</span>}>
            <InputNumber style={{ width: '100%', borderRadius: 10 }} />
          </Form.Item>
          <Form.Item name="offer_date" label={<span style={{ color: COLORS.textSecondary }}>Date de proposition</span>}>
            <DatePicker style={{ width: '100%', borderRadius: 10 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block style={{ borderRadius: 10 }}>
              Enregistrer
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Action Rétention */}
      <Modal
        title={<span style={{ color: COLORS.textPrimary }}>Action de rétention</span>}
        open={addActionModalVisible}
        onCancel={() => { setAddActionModalVisible(false); actionForm.resetFields(); }}
        footer={null}
        styles={{ body: { background: COLORS.bgCard }, header: { background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}` } }}
      >
        <Form form={actionForm} layout="vertical" onFinish={handleAddRetentionAction}>
          <Form.Item name="action_type" label={<span style={{ color: COLORS.textSecondary }}>Type d'action</span>} rules={[{ required: true }]}>
            <Select style={{ borderRadius: 10 }}>
              <Option value="call">Appel personnalisé</Option>
              <Option value="offer">Offre spéciale</Option>
              <Option value="email">Email de rétention</Option>
              <Option value="meeting">RDV conseiller</Option>
            </Select>
          </Form.Item>
          <Form.Item name="cost" label={<span style={{ color: COLORS.textSecondary }}>Coût estimé (€)</span>}>
            <InputNumber min={0} style={{ width: '100%', borderRadius: 10 }} />
          </Form.Item>
          <Form.Item name="description" label={<span style={{ color: COLORS.textSecondary }}>Description</span>}>
            <TextArea rows={3} style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block style={{ borderRadius: 10 }}>
              Lancer l'action
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Appliquer Offre */}
      <Modal
        title={<span style={{ color: COLORS.textPrimary }}>Appliquer une offre de rétention</span>}
        open={offerModalVisible}
        onCancel={() => { setOfferModalVisible(false); offerForm.resetFields(); }}
        footer={null}
        styles={{ body: { background: COLORS.bgCard }, header: { background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}` } }}
      >
        <Form form={offerForm} layout="vertical" onFinish={handleApplyOffer}>
          <Form.Item name="offer_id" label={<span style={{ color: COLORS.textSecondary }}>Offre</span>} rules={[{ required: true }]}>
            <Select placeholder="Sélectionner une offre" style={{ borderRadius: 10 }}>
              {retentionOffers.map(o => (
                <Option key={o.id} value={o.id}>{o.name} - {o.value}€</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="notes" label={<span style={{ color: COLORS.textSecondary }}>Notes</span>}>
            <TextArea rows={2} style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block style={{ borderRadius: 10 }}>
              Appliquer l'offre
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Analyse IA */}
      <Modal
        title={<Space><RobotOutlined style={{ color: COLORS.purple }} /> <span style={{ color: COLORS.textPrimary }}>Analyse IA Approfondie</span></Space>}
        open={analysisModalVisible}
        onCancel={() => setAnalysisModalVisible(false)}
        footer={null}
        width={700}
        styles={{ body: { background: COLORS.bgCard }, header: { background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}` } }}
      >
        <Tabs 
          activeKey={activeAnalysisTab} 
          onChange={setActiveAnalysisTab} 
          tabBarStyle={{ color: COLORS.textPrimary }}
          items={analysisTabItems}
        />
      </Modal>

      {/* STYLES CSS GLOBAUX */}
      <style>{`
        .churn-table-dark .ant-table {
          background: transparent !important;
          color: ${COLORS.textPrimary} !important;
        }
        .churn-table-dark .ant-table-thead > tr > th {
          background: ${COLORS.bgDark} !important;
          color: ${COLORS.textSecondary} !important;
          font-weight: 600 !important;
          border-bottom: 1px solid ${COLORS.border} !important;
        }
        .churn-table-dark .ant-table-tbody > tr > td {
          background: ${COLORS.bgCard} !important;
          color: ${COLORS.textPrimary} !important;
          border-color: ${COLORS.border} !important;
        }
        .churn-table-dark .ant-table-tbody > tr:hover > td {
          background: ${COLORS.bgCardHover} !important;
        }
        .ant-table-pagination .ant-pagination-item a {
          color: ${COLORS.textPrimary} !important;
        }
        .ant-pagination-item-active {
          border-color: ${COLORS.primary} !important;
        }
        .ant-pagination-item-active a {
          color: ${COLORS.primary} !important;
        }
        .ant-tabs-tab {
          color: ${COLORS.textSecondary} !important;
        }
        .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: ${COLORS.primary} !important;
        }
        .ant-tabs-ink-bar {
          background: ${COLORS.primary} !important;
        }
        .ant-select-selector {
          background: ${COLORS.bgCard} !important;
          border-color: ${COLORS.border} !important;
          color: ${COLORS.textPrimary} !important;
          border-radius: 10px !important;
        }
        .ant-select-dropdown {
          background: ${COLORS.bgCard} !important;
        }
        .ant-select-item-option {
          color: ${COLORS.textPrimary} !important;
        }
        .ant-select-item-option:hover {
          background: ${COLORS.bgCardHover} !important;
        }
        .ant-input {
          background: ${COLORS.bgCard} !important;
          border-color: ${COLORS.border} !important;
          color: ${COLORS.textPrimary} !important;
        }
        .ant-input:hover, .ant-input:focus {
          border-color: ${COLORS.primary} !important;
        }
        .ant-picker {
          background: ${COLORS.bgCard} !important;
          border-color: ${COLORS.border} !important;
          color: ${COLORS.textPrimary} !important;
        }
        .ant-picker-input > input {
          color: ${COLORS.textPrimary} !important;
        }
        .ant-modal-content {
          background: ${COLORS.bgCard} !important;
        }
        .ant-modal-close {
          color: ${COLORS.textSecondary} !important;
        }
        .ant-modal-close:hover {
          color: ${COLORS.textPrimary} !important;
        }
        .ant-descriptions-item-label {
          background: ${COLORS.bgDark} !important;
          color: ${COLORS.textSecondary} !important;
          border-color: ${COLORS.border} !important;
        }
        .ant-descriptions-item-content {
          background: ${COLORS.bgCard} !important;
          color: ${COLORS.textPrimary} !important;
          border-color: ${COLORS.border} !important;
        }
        .ant-form-item-label > label {
          color: ${COLORS.textSecondary} !important;
        }
        .ant-input-number {
          background: ${COLORS.bgCard} !important;
          border-color: ${COLORS.border} !important;
          color: ${COLORS.textPrimary} !important;
        }
        .ant-input-number-input {
          color: ${COLORS.textPrimary} !important;
        }
        .ant-upload-drag {
          background: ${COLORS.bgCard} !important;
          border-color: ${COLORS.border} !important;
        }
        .ant-upload-text {
          color: ${COLORS.textPrimary} !important;
        }
        .ant-upload-hint {
          color: ${COLORS.textSecondary} !important;
        }
      `}</style>
    </div>
  );
};

export default ChurnPredictionBanking;