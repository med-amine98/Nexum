// src/modules/banking/AMLCompliance.js
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Row, Col, Statistic, Table, Tag, Space, Tabs, 
  Spin, Alert, Button, Select, DatePicker, message, Modal, 
  Descriptions, Tooltip, Badge, Divider, Form, Input, Radio,
  Switch, InputNumber, Typography
} from 'antd';
import { 
  SafetyCertificateOutlined, 
  GlobalOutlined,
  ReloadOutlined, FilterOutlined,
  EyeOutlined, BankOutlined,
  SecurityScanOutlined, FileTextOutlined,
  PlusOutlined, UserOutlined,
  WarningOutlined, LogoutOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import { useAuth } from '../../services/auth';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

// Importer Leaflet
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip as LeafletTooltip } from 'react-leaflet';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

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

// ============================================
// CONFIGURATION ICÔNES LEAFLET
// ============================================

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ============================================
// DONNÉES FATF
// ============================================

const FATF_HIGH_RISK = [
  { country: "Iran", risk: "critical", lat: 32.4279, lng: 53.6880, reason: "Non-respect des normes FATF - Juridiction à haut risque" },
  { country: "Corée du Nord", risk: "critical", lat: 40.3399, lng: 127.5101, reason: "Sanctions internationales - Risque de financement illicite" },
  { country: "Myanmar", risk: "critical", lat: 21.9162, lng: 95.9560, reason: "Risque élevé de blanchiment d'argent" },
  { country: "Syrie", risk: "critical", lat: 34.8021, lng: 38.9968, reason: "Sanctions internationales - Risque terrorisme" },
  { country: "Yémen", risk: "critical", lat: 15.5527, lng: 48.5164, reason: "Conflit armé - Risque de blanchiment" },
  { country: "Panama", risk: "high", lat: 8.5379, lng: -80.7821, reason: "Juridiction à haut risque - Paradis fiscal" },
  { country: "Bahamas", risk: "high", lat: 25.0343, lng: -77.3963, reason: "Risque de blanchiment - Centre offshore" },
  { country: "Malte", risk: "high", lat: 35.9375, lng: 14.3754, reason: "Sous surveillance renforcée FATF" },
  { country: "Îles Caïmans", risk: "high", lat: 19.3133, lng: -81.2546, reason: "Centre financier offshore" },
  { country: "Luxembourg", risk: "medium", lat: 49.8153, lng: 6.1296, reason: "Risque modéré - Secteur financier développé" },
  { country: "Suisse", risk: "medium", lat: 46.8182, lng: 8.2275, reason: "Risque modéré - Place financière importante" },
  { country: "Émirats Arabes Unis", risk: "high", lat: 23.4241, lng: 53.8478, reason: "Risque de blanchiment - Hub financier" },
  { country: "Russie", risk: "critical", lat: 61.5240, lng: 105.3188, reason: "Sanctions internationales - Risque élevé" }
];

// ============================================
// SERVICE AML
// ============================================

class AMLDetectionService {
  getFATFRisks() {
    return FATF_HIGH_RISK.map(country => ({
      id: `fatf_${country.country.replace(/\s/g, '_')}`,
      type: "aml_risk",
      title: `${country.country} - Risque de blanchiment`,
      country: country.country,
      latitude: country.lat,
      longitude: country.lng,
      risk_level: country.risk,
      source: "FATF",
      isRealTime: true,
      description: country.reason,
      last_update: new Date().toISOString()
    }));
  }

  analyzeTransactions(transactions) {
    if (!Array.isArray(transactions)) return [];
    
    const suspiciousPatterns = [];
    
    transactions.forEach(t => {
      if (t.amount > 9000 && t.amount < 10000) {
        suspiciousPatterns.push({
          ...t,
          alert: "Transaction juste en dessous du seuil de déclaration (10 000€)",
          risk_level: "high"
        });
      }
      
      const fatfCountry = FATF_HIGH_RISK.find(c => c.country === t.country);
      if (fatfCountry && fatfCountry.risk === "critical") {
        suspiciousPatterns.push({
          ...t,
          alert: `Transaction vers pays à haut risque: ${t.country} - ${fatfCountry.reason}`,
          risk_level: "critical"
        });
      }
      
      if (t.amount > 100000) {
        suspiciousPatterns.push({
          ...t,
          alert: "Transaction d'un montant anormalement élevé (>100 000€)",
          risk_level: "critical"
        });
      }
      
      if (t.amount % 10000 === 0 && t.amount > 50000) {
        suspiciousPatterns.push({
          ...t,
          alert: "Montant rond élevé - Possible structuration",
          risk_level: "high"
        });
      }
    });
    
    return suspiciousPatterns;
  }

  fetchAllAMLRisks() {
    return this.getFATFRisks();
  }
}

const amlService = new AMLDetectionService();

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const AMLCompliance = () => {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMap, setLoadingMap] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [suspiciousTransactions, setSuspiciousTransactions] = useState([]);
  const [pepList, setPepList] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [declarations, setDeclarations] = useState([]);
  const [amlRisks, setAmlRisks] = useState([]);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [addPepModalVisible, setAddPepModalVisible] = useState(false);
  const [addWatchlistModalVisible, setAddWatchlistModalVisible] = useState(false);
  const [addTransactionModalVisible, setAddTransactionModalVisible] = useState(false);
  const [addDeclarationModalVisible, setAddDeclarationModalVisible] = useState(false);
  const [showMapRisks, setShowMapRisks] = useState(true);
  const [earth2Enabled, setEarth2Enabled] = useState(false);
  const [mapCenter] = useState([20, 0]);
  const [mapZoom] = useState(2);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [mapKey, setMapKey] = useState(0);
  const [stats, setStats] = useState({
    totalTransactions: 0,
    suspiciousDetected: 0,
    reported: 0,
    underReview: 0,
    pepCount: 0,
    watchlistCount: 0,
    complianceRate: 96.5,
    totalAmountBlocked: 0,
    activeRisks: 0
  });
  const [riskDistribution, setRiskDistribution] = useState({
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  });
  const [activeTab, setActiveTab] = useState('transactions');
  const [autoRefresh, setAutoRefresh] = useState(true);
  
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  
  const [newTransaction, setNewTransaction] = useState({
    client_name: '',
    amount: '',
    currency: 'EUR',
    country: '',
    beneficiary: '',
    reason: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [newPep, setNewPep] = useState({
    full_name: '',
    country: '',
    position: '',
    source_of_funds: '',
    notes: ''
  });

  const [newWatchlist, setNewWatchlist] = useState({
    entity_name: '',
    entity_type: 'individual',
    country: '',
    risk_level: 'high',
    reason: ''
  });

  const [newDeclaration, setNewDeclaration] = useState({
    transaction_id: '',
    analysis_report: '',
    decision: 'pending',
    notes: ''
  });
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // ========== CHARGEMENT DES DONNÉES ==========
  
  const loadAMLRisks = useCallback(async () => {
    setLoadingMap(true);
    try {
      const risks = amlService.fetchAllAMLRisks();
      setAmlRisks(risks);
      setStats(prev => ({ ...prev, activeRisks: risks.length }));
      setLastUpdate(new Date());
      
      const criticalRisks = risks.filter(r => r.risk_level === 'critical');
      if (criticalRisks.length > 0) {
        message.warning(`${criticalRisks.length} risque(s) critique(s) de blanchiment détecté(s)`);
      }
    } catch (error) {
      console.error('Erreur chargement risques AML:', error);
    } finally {
      setLoadingMap(false);
    }
  }, []);

  const fetchData = async () => {
    if (refreshing) return;
    
    setLoading(true);
    setRefreshing(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        message.warning('Veuillez vous connecter');
        navigate('/login');
        return;
      }

      let transactionsData = [];
      try {
        const transactionsRes = await api.get('/aml/transactions');
        transactionsData = Array.isArray(transactionsRes.data) ? transactionsRes.data : 
                          (transactionsRes.data?.items || []);
      } catch (error) {
        if (error.response?.status === 401) {
          message.error('Session expirée');
          navigate('/login');
          return;
        }
        transactionsData = [];
      }
      setTransactions(transactionsData);
      
      const suspicious = amlService.analyzeTransactions(transactionsData);
      setSuspiciousTransactions(suspicious);

      let pepData = [];
      try {
        const pepRes = await api.get('/aml/pep');
        pepData = Array.isArray(pepRes.data) ? pepRes.data : (pepRes.data?.items || []);
      } catch (error) {
        pepData = [];
      }
      setPepList(pepData);

      let watchlistData = [];
      try {
        const watchlistRes = await api.get('/aml/watchlist');
        watchlistData = Array.isArray(watchlistRes.data) ? watchlistRes.data : (watchlistRes.data?.items || []);
      } catch (error) {
        watchlistData = [];
      }
      setWatchlist(watchlistData);

      let declarationsData = [];
      try {
        const declarationsRes = await api.get('/aml/declarations');
        declarationsData = Array.isArray(declarationsRes.data) ? declarationsRes.data : (declarationsRes.data?.items || []);
      } catch (error) {
        declarationsData = [];
      }
      setDeclarations(declarationsData);

      const reported = transactionsData.filter(t => t.reported_to_tracfin).length;
      const underReview = transactionsData.filter(t => t.status === 'review').length;
      const totalAmount = suspicious.reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const riskDist = {
        low: transactionsData.filter(t => t.risk_level === 'low').length,
        medium: transactionsData.filter(t => t.risk_level === 'medium').length,
        high: transactionsData.filter(t => t.risk_level === 'high').length,
        critical: transactionsData.filter(t => t.risk_level === 'critical').length
      };

      setStats(prev => ({
        ...prev,
        totalTransactions: transactionsData.length,
        suspiciousDetected: suspicious.length,
        reported,
        underReview,
        pepCount: pepData.length,
        watchlistCount: watchlistData.length,
        totalAmountBlocked: totalAmount
      }));

      setRiskDistribution(riskDist);

    } catch (error) {
      console.error('Erreur chargement AML:', error);
      if (error.response?.status !== 401) {
        message.error('Erreur lors du chargement des données AML');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    loadAMLRisks();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchData();
        loadAMLRisks();
      }, 30000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh]);

  useEffect(() => {
    setMapKey(prev => prev + 1);
  }, [amlRisks, showMapRisks]);

  // ========== GESTION DES DONNÉES ==========
  
  const handleAddTransaction = async () => {
    if (!newTransaction.client_name || !newTransaction.amount || !newTransaction.country || !newTransaction.beneficiary) {
      message.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const transactionData = {
        ...newTransaction,
        transaction_id: `TX-${Date.now()}`,
        amount: parseFloat(newTransaction.amount),
        risk_level: newTransaction.amount > 100000 ? 'critical' : (newTransaction.amount > 50000 ? 'high' : 'medium'),
        status: 'pending',
        reported_to_tracfin: false,
        created_by: user?.name || 'Utilisateur',
        created_at: new Date().toISOString()
      };

      await api.post('/aml/transactions', transactionData);
      message.success('Transaction ajoutée avec succès');
      setAddTransactionModalVisible(false);
      setNewTransaction({
        client_name: '',
        amount: '',
        currency: 'EUR',
        country: '',
        beneficiary: '',
        reason: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (error) {
      message.error('Erreur lors de l\'ajout');
    }
  };

  const handleAddPep = async () => {
    if (!newPep.full_name || !newPep.country) {
      message.error('Veuillez remplir les champs obligatoires');
      return;
    }

    try {
      await api.post('/aml/pep', { ...newPep, created_by: user?.name, created_at: new Date().toISOString() });
      message.success('PEP ajouté avec succès');
      setAddPepModalVisible(false);
      setNewPep({ full_name: '', country: '', position: '', source_of_funds: '', notes: '' });
      fetchData();
    } catch (error) {
      message.error('Erreur lors de l\'ajout');
    }
  };

  const handleAddWatchlist = async () => {
    if (!newWatchlist.entity_name || !newWatchlist.country) {
      message.error('Veuillez remplir les champs obligatoires');
      return;
    }

    try {
      await api.post('/aml/watchlist', { ...newWatchlist, created_by: user?.name, created_at: new Date().toISOString() });
      message.success('Entrée ajoutée à la liste de surveillance');
      setAddWatchlistModalVisible(false);
      setNewWatchlist({ entity_name: '', entity_type: 'individual', country: '', risk_level: 'high', reason: '' });
      fetchData();
    } catch (error) {
      message.error('Erreur lors de l\'ajout');
    }
  };

  const handleAddDeclaration = async () => {
    if (!newDeclaration.transaction_id || !newDeclaration.analysis_report) {
      message.error('Veuillez remplir les champs obligatoires');
      return;
    }

    try {
      await api.post('/aml/declarations', {
        ...newDeclaration,
        declared_by: user?.name,
        declared_at: new Date().toISOString(),
        reference: `TRF-${Date.now()}`
      });
      
      if (newDeclaration.transaction_id) {
        await api.patch(`/aml/transactions/${newDeclaration.transaction_id}/report`);
      }
      
      message.success('Déclaration TRACFIN enregistrée');
      setAddDeclarationModalVisible(false);
      setNewDeclaration({ transaction_id: '', analysis_report: '', decision: 'pending', notes: '' });
      fetchData();
    } catch (error) {
      message.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleReportTransaction = async (transactionId) => {
    try {
      await api.patch(`/aml/transactions/${transactionId}/report`);
      message.success('Transaction déclarée à TRACFIN');
      fetchData();
    } catch (error) {
      message.error('Erreur lors de la déclaration');
    }
  };

  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setDetailsModalVisible(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    if (logout) logout();
    navigate('/login');
  };

  const getRiskColor = (risk) => {
    const colors = { low: COLORS.success, medium: '#faad14', high: COLORS.warning, critical: COLORS.danger };
    return colors[risk] || COLORS.primary;
  };

  const columns = [
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Transaction</span>,
      dataIndex: 'transaction_id', 
      key: 'transaction_id', 
      width: 150,
      render: (text) => <span style={{ fontFamily: 'monospace', color: COLORS.textPrimary }}>{text?.substring(0, 15)}...</span> 
    },
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Client</span>,
      dataIndex: 'client_name', 
      key: 'client_name',
      render: (text) => <span style={{ color: COLORS.textPrimary }}>{text}</span>
    },
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Montant</span>,
      dataIndex: 'amount', 
      key: 'amount',
      render: (amount) => <span style={{ fontWeight: 'bold', color: COLORS.warning }}>{amount?.toLocaleString()} €</span> 
    },
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Bénéficiaire</span>,
      dataIndex: 'beneficiary', 
      key: 'beneficiary',
      render: (text) => <span style={{ color: COLORS.textPrimary }}>{text}</span>
    },
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Pays</span>,
      dataIndex: 'country', 
      key: 'country',
      render: (text) => <span style={{ color: COLORS.textPrimary }}>{text}</span>
    },
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Risque</span>,
      dataIndex: 'risk_level', 
      key: 'risk_level',
      render: (risk) => <Tag color={getRiskColor(risk)} style={{ borderRadius: 12 }}>{risk?.toUpperCase()}</Tag> 
    },
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Statut</span>,
      dataIndex: 'status', 
      key: 'status',
      render: (status) => {
        const config = { reported: { color: 'red', text: 'Déclaré' }, review: { color: 'processing', text: 'Analyse' }, pending: { color: 'gold', text: 'Attente' } };
        const c = config[status] || { color: 'default', text: status };
        return <Tag color={c.color} style={{ borderRadius: 12 }}>{c.text}</Tag>;
      }
    },
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Actions</span>,
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Voir détails">
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetails(record)} style={{ borderRadius: 8 }} />
          </Tooltip>
          {!record.reported_to_tracfin && (record.risk_level === 'high' || record.risk_level === 'critical') && (
            <Button size="small" type="primary" danger onClick={() => handleReportTransaction(record.id)} style={{ borderRadius: 8 }}>
              Déclarer
            </Button>
          )}
        </Space>
      )
    }
  ];

  const pepColumns = [
    { title: <span style={{ color: COLORS.textPrimary }}>Nom</span>, dataIndex: 'full_name', key: 'full_name', render: (text) => <span style={{ color: COLORS.textPrimary }}>{text}</span> },
    { title: <span style={{ color: COLORS.textPrimary }}>Pays</span>, dataIndex: 'country', key: 'country', render: (text) => <span style={{ color: COLORS.textPrimary }}>{text}</span> },
    { title: <span style={{ color: COLORS.textPrimary }}>Fonction</span>, dataIndex: 'position', key: 'position', render: (text) => <span style={{ color: COLORS.textPrimary }}>{text}</span> },
    { title: <span style={{ color: COLORS.textPrimary }}>Source des fonds</span>, dataIndex: 'source_of_funds', key: 'source_of_funds', render: (text) => <span style={{ color: COLORS.textPrimary }}>{text}</span> },
    { title: <span style={{ color: COLORS.textPrimary }}>Ajouté le</span>, dataIndex: 'created_at', key: 'created_at', render: (date) => date ? new Date(date).toLocaleDateString() : '-' }
  ];

  const watchlistColumns = [
    { title: <span style={{ color: COLORS.textPrimary }}>Entité</span>, dataIndex: 'entity_name', key: 'entity_name', render: (text) => <span style={{ color: COLORS.textPrimary }}>{text}</span> },
    { title: <span style={{ color: COLORS.textPrimary }}>Type</span>, dataIndex: 'entity_type', key: 'entity_type', render: (type) => <span style={{ color: COLORS.textPrimary }}>{type === 'individual' ? 'Individu' : 'Organisation'}</span> },
    { title: <span style={{ color: COLORS.textPrimary }}>Pays</span>, dataIndex: 'country', key: 'country', render: (text) => <span style={{ color: COLORS.textPrimary }}>{text}</span> },
    { title: <span style={{ color: COLORS.textPrimary }}>Risque</span>, dataIndex: 'risk_level', key: 'risk_level', render: (risk) => <Tag color={risk === 'critical' ? 'red' : 'orange'} style={{ borderRadius: 12 }}>{risk}</Tag> },
    { title: <span style={{ color: COLORS.textPrimary }}>Raison</span>, dataIndex: 'reason', key: 'reason', render: (text) => <span style={{ color: COLORS.textPrimary }}>{text}</span> }
  ];

  const declarationColumns = [
    { title: <span style={{ color: COLORS.textPrimary }}>Référence</span>, dataIndex: 'reference', key: 'reference', render: (text) => <span style={{ color: COLORS.textPrimary }}>{text}</span> },
    { title: <span style={{ color: COLORS.textPrimary }}>Transaction</span>, dataIndex: 'transaction_id', key: 'transaction_id', render: (text) => <span style={{ color: COLORS.textPrimary }}>{text}</span> },
    { title: <span style={{ color: COLORS.textPrimary }}>Décision</span>, dataIndex: 'decision', key: 'decision', render: (d) => <Tag color={d === 'approved' ? 'green' : d === 'rejected' ? 'red' : 'orange'} style={{ borderRadius: 12 }}>{d}</Tag> },
    { title: <span style={{ color: COLORS.textPrimary }}>Déclarant</span>, dataIndex: 'declared_by', key: 'declared_by', render: (text) => <span style={{ color: COLORS.textPrimary }}>{text}</span> },
    { title: <span style={{ color: COLORS.textPrimary }}>Date</span>, dataIndex: 'declared_at', key: 'declared_at', render: (date) => date ? new Date(date).toLocaleString() : '-' }
  ];

  const displayRisks = showMapRisks ? amlRisks : amlRisks.filter(r => r.risk_level === 'critical');

  // ========== DÉFINITION DES ONGLETS AVEC items ==========
  const tabItems = [
    {
      key: 'transactions',
      label: <span style={{ color: activeTab === 'transactions' ? COLORS.primary : COLORS.textSecondary }}>
        <BankOutlined /> Transactions suspectes ({suspiciousTransactions.length})
      </span>,
      children: (
        <Table 
          columns={columns} 
          dataSource={suspiciousTransactions.length > 0 ? suspiciousTransactions : transactions} 
          rowKey="id" 
          pagination={{ pageSize: 10 }}
          className="aml-table-dark"
        />
      )
    },
    {
      key: 'pep',
      label: <span style={{ color: activeTab === 'pep' ? COLORS.primary : COLORS.textSecondary }}>
        <UserOutlined /> PEP ({pepList.length})
      </span>,
      children: (
        <>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddPepModalVisible(true)} style={{ borderRadius: 10 }}>
              Ajouter un PEP
            </Button>
          </div>
          <Table columns={pepColumns} dataSource={pepList} rowKey="id" pagination={{ pageSize: 10 }} className="aml-table-dark" />
        </>
      )
    },
    {
      key: 'watchlist',
      label: <span style={{ color: activeTab === 'watchlist' ? COLORS.primary : COLORS.textSecondary }}>
        <SecurityScanOutlined /> Listes de surveillance ({watchlist.length})
      </span>,
      children: (
        <>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddWatchlistModalVisible(true)} style={{ borderRadius: 10 }}>
              Ajouter
            </Button>
          </div>
          <Table columns={watchlistColumns} dataSource={watchlist} rowKey="id" pagination={{ pageSize: 10 }} className="aml-table-dark" />
        </>
      )
    },
    {
      key: 'declarations',
      label: <span style={{ color: activeTab === 'declarations' ? COLORS.primary : COLORS.textSecondary }}>
        <FileTextOutlined /> Déclarations TRACFIN ({declarations.length})
      </span>,
      children: (
        <>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddDeclarationModalVisible(true)} style={{ borderRadius: 10 }}>
              Nouvelle déclaration
            </Button>
          </div>
          <Table columns={declarationColumns} dataSource={declarations} rowKey="id" pagination={{ pageSize: 10 }} className="aml-table-dark" />
        </>
      )
    }
  ];

  if (loading && transactions.length === 0) {
    return (
      <div style={{ ...styles.page, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" tip={<span style={{ color: COLORS.textPrimary }}>Chargement des données AML...</span>}>
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
                  background: `linear-gradient(135deg, ${COLORS.purple}, ${COLORS.primary})`,
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 16px rgba(139, 92, 246, 0.3)',
                }}>
                  <SafetyCertificateOutlined style={{ fontSize: 26, color: COLORS.textPrimary }} />
                </div>
                <div>
                  <Title level={3} style={{ margin: 0, color: COLORS.textPrimary, fontWeight: 700 }}>
                    Anti-Blanchiment (AML) & Détection
                  </Title>
                  <Text style={{ color: COLORS.textSecondary }}>
                    Sources: FATF • TRACFIN • Détection de patterns suspects
                  </Text>
                </div>
              </div>
            </div>
            <Space size="middle" wrap>
              <Button 
                type="primary" 
                icon={<PlusOutlined />} 
                onClick={() => setAddTransactionModalVisible(true)} 
                style={{ background: COLORS.success, borderColor: COLORS.success, borderRadius: 10 }}
              >
                Ajouter transaction
              </Button>
              <Button 
                icon={<ReloadOutlined spin={refreshing} />} 
                onClick={() => { fetchData(); loadAMLRisks(); }}
                loading={refreshing}
                style={{ borderRadius: 10, borderColor: COLORS.border, color: COLORS.textPrimary }}
              >
                Actualiser
              </Button>
              <Button 
                icon={<LogoutOutlined />} 
                onClick={handleLogout} 
                danger
                style={{ borderRadius: 10 }}
              >
                Déconnexion
              </Button>
            </Space>
          </div>
        </div>
      </motion.div>

      {/* KPIS */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} lg={4}>
            <div style={styles.kpiCard}>
              <Statistic 
                title={<span style={{ color: COLORS.textSecondary }}>Transactions analysées</span>} 
                value={stats.totalTransactions} 
                valueStyle={{ color: COLORS.textPrimary }} 
              />
            </div>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <div style={styles.kpiCard}>
              <Statistic 
                title={<span style={{ color: COLORS.textSecondary }}>Suspectes détectées</span>} 
                value={stats.suspiciousDetected} 
                valueStyle={{ color: COLORS.warning }} 
              />
            </div>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <div style={styles.kpiCard}>
              <Statistic 
                title={<span style={{ color: COLORS.textSecondary }}>Déclarations TRACFIN</span>} 
                value={stats.reported} 
                valueStyle={{ color: COLORS.danger }} 
              />
            </div>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <div style={styles.kpiCard}>
              <Statistic 
                title={<span style={{ color: COLORS.textSecondary }}>Risques AML actifs</span>} 
                value={stats.activeRisks} 
                valueStyle={{ color: COLORS.primary }} 
                prefix={<WarningOutlined />} 
              />
            </div>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <div style={styles.kpiCard}>
              <Statistic 
                title={<span style={{ color: COLORS.textSecondary }}>PEP identifiés</span>} 
                value={stats.pepCount} 
                valueStyle={{ color: COLORS.textPrimary }} 
              />
            </div>
          </Col>
          <Col xs={12} sm={8} lg={4}>
            <div style={styles.kpiCard}>
              <Statistic 
                title={<span style={{ color: COLORS.textSecondary }}>Montant bloqué</span>} 
                value={stats.totalAmountBlocked} 
                precision={0} 
                suffix="€" 
                valueStyle={{ color: COLORS.danger }} 
              />
            </div>
          </Col>
        </Row>
      </motion.div>

      {/* CARTE DES RISQUES AML */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
        <Card 
          title={
            <Space>
              <GlobalOutlined style={{ color: COLORS.primary }} />
              <span style={{ color: COLORS.textPrimary }}>Cartographie des risques de blanchiment</span>
            </Space>
          }
          style={{ ...styles.card, marginTop: 16, marginBottom: 16 }}
          extra={
            <Space>
              <Tooltip title="Activer le flux analytique NVIDIA Earth-2">
                <Space>
                  <span style={{ color: earth2Enabled ? COLORS.purple : COLORS.textMuted, fontWeight: 600 }}>NVIDIA Earth-2 IA</span>
                  <Switch checked={earth2Enabled} onChange={setEarth2Enabled} size="small" style={{ backgroundColor: earth2Enabled ? COLORS.purple : undefined }} />
                </Space>
              </Tooltip>
              <Switch 
                checkedChildren="Tous risques" 
                unCheckedChildren="Critiques uniquement" 
                checked={showMapRisks} 
                onChange={setShowMapRisks} 
              />
            </Space>
          }
        >
          {loadingMap ? (
            <div style={{ height: 450, background: COLORS.bgDark, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
              <Spin tip={<span style={{ color: COLORS.textSecondary }}>Chargement des données de risques...</span>}>
                <div style={{ height: 50 }} />
              </Spin>
            </div>
          ) : (
            <MapContainer key={mapKey} center={mapCenter} zoom={mapZoom} style={{ height: 450, borderRadius: 8 }}>
              {earth2Enabled ? (
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO | NVIDIA Earth-2 Analytics' />
              ) : (
                <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
              )}
              {displayRisks.map((risk, index) => (
                <CircleMarker
                  key={risk.id || `risk-${index}`}
                  center={[risk.latitude, risk.longitude]}
                  radius={risk.risk_level === 'critical' ? 12 : 8}
                  fillColor={getRiskColor(risk.risk_level)}
                  color="#fff"
                  weight={2}
                  fillOpacity={0.7}
                  eventHandlers={{ click: () => setSelectedLocation(risk) }}
                >
                  <Popup>
                    <div style={{ minWidth: 200, background: COLORS.bgCard, color: COLORS.textPrimary }}>
                      <strong style={{ color: COLORS.textPrimary }}>{risk.title}</strong>
                      <Tag color={getRiskColor(risk.risk_level)} style={{ marginLeft: 8, borderRadius: 12 }}>{risk.risk_level}</Tag>
                      <Divider style={{ margin: '8px 0', borderColor: COLORS.border }} />
                      <p><strong style={{ color: COLORS.textSecondary }}>Source:</strong> <span style={{ color: COLORS.textPrimary }}>{risk.source}</span></p>
                      <p><strong style={{ color: COLORS.textSecondary }}>Risque:</strong> <span style={{ color: COLORS.textPrimary }}>{risk.description}</span></p>
                      <Button size="small" type="primary" onClick={() => setSelectedLocation(risk)} block style={{ borderRadius: 8 }}>
                        Détails
                      </Button>
                    </div>
                  </Popup>
                  <LeafletTooltip>{risk.title}</LeafletTooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          )}
          
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 24 }}>
            <Space><div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: COLORS.danger }} /><span style={{ color: COLORS.textSecondary }}>Risque Critique</span></Space>
            <Space><div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: COLORS.warning }} /><span style={{ color: COLORS.textSecondary }}>Risque Élevé</span></Space>
            <Space><div style={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: '#faad14' }} /><span style={{ color: COLORS.textSecondary }}>Risque Moyen</span></Space>
            <Space><SafetyCertificateOutlined style={{ color: COLORS.primary }} /><span style={{ color: COLORS.textSecondary }}>Juridictions FATF</span></Space>
          </div>
        </Card>
      </motion.div>

      {/* FILTRES */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
        <Card style={{ ...styles.card, marginBottom: 16 }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={6}>
              <Select 
                placeholder="Niveau de risque" 
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
            <Col xs={24} sm={12} md={6}>
              <Select 
                placeholder="Statut" 
                style={{ width: '100%', borderRadius: 10 }} 
                value={filterStatus} 
                onChange={setFilterStatus}
              >
                <Option value="all">Tous</Option>
                <Option value="reported">Déclaré</Option>
                <Option value="pending">En attente</Option>
                <Option value="review">En analyse</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <RangePicker style={{ width: '100%', borderRadius: 10 }} onChange={setDateRange} />
            </Col>
            <Col xs={24} sm={12} md={4}>
              <Button 
                icon={<FilterOutlined />} 
                onClick={() => { setFilterRisk('all'); setFilterStatus('all'); setDateRange(null); }}
                block
                style={{ borderRadius: 10, borderColor: COLORS.border, color: COLORS.textPrimary }}
              >
                Reset
              </Button>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* ONGLETS */}
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
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
          MODALS - DESIGN SOMME
          ============================================ */}

      <Modal 
        title={<span style={{ color: COLORS.textPrimary }}>Ajouter une transaction suspecte</span>} 
        open={addTransactionModalVisible} 
        onCancel={() => setAddTransactionModalVisible(false)} 
        onOk={handleAddTransaction} 
        width={600}
        styles={{ body: { background: COLORS.bgCard }, header: { background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}` } }}
      >
        <Form layout="vertical">
          <Form.Item label={<span style={{ color: COLORS.textSecondary }}>Nom du client</span>}>
            <Input 
              value={newTransaction.client_name} 
              onChange={e => setNewTransaction({...newTransaction, client_name: e.target.value})}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>
          <Form.Item label={<span style={{ color: COLORS.textSecondary }}>Bénéficiaire</span>}>
            <Input 
              value={newTransaction.beneficiary} 
              onChange={e => setNewTransaction({...newTransaction, beneficiary: e.target.value})}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>
          <Form.Item label={<span style={{ color: COLORS.textSecondary }}>Montant (€)</span>}>
            <InputNumber 
              style={{ width: '100%', borderRadius: 10 }} 
              min={0} 
              value={newTransaction.amount} 
              onChange={val => setNewTransaction({...newTransaction, amount: val})} 
            />
          </Form.Item>
          <Form.Item label={<span style={{ color: COLORS.textSecondary }}>Pays</span>}>
            <Input 
              value={newTransaction.country} 
              onChange={e => setNewTransaction({...newTransaction, country: e.target.value})}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>
          <Form.Item label={<span style={{ color: COLORS.textSecondary }}>Motif de suspicion</span>}>
            <TextArea 
              rows={3} 
              value={newTransaction.reason} 
              onChange={e => setNewTransaction({...newTransaction, reason: e.target.value})}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal 
        title={<span style={{ color: COLORS.textPrimary }}>Ajouter un PEP</span>} 
        open={addPepModalVisible} 
        onCancel={() => setAddPepModalVisible(false)} 
        onOk={handleAddPep}
        styles={{ body: { background: COLORS.bgCard }, header: { background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}` } }}
      >
        <Form layout="vertical">
          <Form.Item label={<span style={{ color: COLORS.textSecondary }}>Nom complet</span>}>
            <Input 
              value={newPep.full_name} 
              onChange={e => setNewPep({...newPep, full_name: e.target.value})}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>
          <Form.Item label={<span style={{ color: COLORS.textSecondary }}>Pays</span>}>
            <Input 
              value={newPep.country} 
              onChange={e => setNewPep({...newPep, country: e.target.value})}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>
          <Form.Item label={<span style={{ color: COLORS.textSecondary }}>Fonction</span>}>
            <Input 
              value={newPep.position} 
              onChange={e => setNewPep({...newPep, position: e.target.value})}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal 
        title={<span style={{ color: COLORS.textPrimary }}>Ajouter à la liste de surveillance</span>} 
        open={addWatchlistModalVisible} 
        onCancel={() => setAddWatchlistModalVisible(false)} 
        onOk={handleAddWatchlist}
        styles={{ body: { background: COLORS.bgCard }, header: { background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}` } }}
      >
        <Form layout="vertical">
          <Form.Item label={<span style={{ color: COLORS.textSecondary }}>Entité</span>}>
            <Input 
              value={newWatchlist.entity_name} 
              onChange={e => setNewWatchlist({...newWatchlist, entity_name: e.target.value})}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>
          <Form.Item label={<span style={{ color: COLORS.textSecondary }}>Pays</span>}>
            <Input 
              value={newWatchlist.country} 
              onChange={e => setNewWatchlist({...newWatchlist, country: e.target.value})}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>
          <Form.Item label={<span style={{ color: COLORS.textSecondary }}>Raison</span>}>
            <TextArea 
              rows={2} 
              value={newWatchlist.reason} 
              onChange={e => setNewWatchlist({...newWatchlist, reason: e.target.value})}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal 
        title={<span style={{ color: COLORS.textPrimary }}>Déclaration TRACFIN</span>} 
        open={addDeclarationModalVisible} 
        onCancel={() => setAddDeclarationModalVisible(false)} 
        onOk={handleAddDeclaration} 
        width={600}
        styles={{ body: { background: COLORS.bgCard }, header: { background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}` } }}
      >
        <Form layout="vertical">
          <Form.Item label={<span style={{ color: COLORS.textSecondary }}>Transaction</span>}>
            <Select 
              value={newDeclaration.transaction_id} 
              onChange={val => setNewDeclaration({...newDeclaration, transaction_id: val})} 
              placeholder="Sélectionner une transaction"
              style={{ borderRadius: 10 }}
            >
              {suspiciousTransactions.map(t => <Option key={t.id} value={t.id}>{t.transaction_id} - {t.client_name} - {t.amount}€</Option>)}
            </Select>
          </Form.Item>
          <Form.Item label={<span style={{ color: COLORS.textSecondary }}>Rapport d'analyse</span>}>
            <TextArea 
              rows={4} 
              value={newDeclaration.analysis_report} 
              onChange={e => setNewDeclaration({...newDeclaration, analysis_report: e.target.value})}
              style={{ borderRadius: 10 }}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal 
        title={<span style={{ color: COLORS.textPrimary }}>Détails transaction</span>} 
        open={detailsModalVisible} 
        onCancel={() => setDetailsModalVisible(false)} 
        footer={[<Button key="close" onClick={() => setDetailsModalVisible(false)} style={{ borderRadius: 8 }}>Fermer</Button>]}
        styles={{ body: { background: COLORS.bgCard }, header: { background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}` } }}
      >
        {selectedTransaction && (
          <Descriptions column={1} bordered>
            <Descriptions.Item label={<span style={{ color: COLORS.textSecondary }}>ID</span>}>
              <span style={{ color: COLORS.textPrimary }}>{selectedTransaction.transaction_id}</span>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: COLORS.textSecondary }}>Client</span>}>
              <span style={{ color: COLORS.textPrimary }}>{selectedTransaction.client_name}</span>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: COLORS.textSecondary }}>Montant</span>}>
              <span style={{ color: COLORS.warning }}>{selectedTransaction.amount?.toLocaleString()} €</span>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: COLORS.textSecondary }}>Pays</span>}>
              <span style={{ color: COLORS.textPrimary }}>{selectedTransaction.country}</span>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: COLORS.textSecondary }}>Risque</span>}>
              <Tag color={getRiskColor(selectedTransaction.risk_level)} style={{ borderRadius: 12 }}>{selectedTransaction.risk_level}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* ALERTE FLOATING */}
      {selectedLocation && (
        <Alert
          message={`Risque AML - ${selectedLocation.title}`}
          description={selectedLocation.description}
          type="warning"
          showIcon
          style={{ 
            position: 'fixed', 
            bottom: 24, 
            right: 24, 
            width: 320, 
            zIndex: 1000,
            borderRadius: 12,
            background: COLORS.warning + '20',
            border: `1px solid ${COLORS.warning}`,
            color: COLORS.textPrimary
          }}
          closable
          onClose={() => setSelectedLocation(null)}
        />
      )}

      {/* STYLES CSS GLOBAUX */}
      <style>{`
        .aml-table-dark .ant-table {
          background: transparent !important;
          color: ${COLORS.textPrimary} !important;
        }
        .aml-table-dark .ant-table-thead > tr > th {
          background: ${COLORS.bgDark} !important;
          color: ${COLORS.textSecondary} !important;
          font-weight: 600 !important;
          border-bottom: 1px solid ${COLORS.border} !important;
        }
        .aml-table-dark .ant-table-tbody > tr > td {
          background: ${COLORS.bgCard} !important;
          color: ${COLORS.textPrimary} !important;
          border-color: ${COLORS.border} !important;
        }
        .aml-table-dark .ant-table-tbody > tr:hover > td {
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
        .leaflet-popup-content-wrapper {
          background: ${COLORS.bgCard} !important;
          color: ${COLORS.textPrimary} !important;
        }
        .leaflet-popup-tip {
          background: ${COLORS.bgCard} !important;
        }
        .leaflet-popup-content {
          color: ${COLORS.textPrimary} !important;
        }
      `}</style>
    </div>
  );
};

export default AMLCompliance;