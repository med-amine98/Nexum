// ============================================
// FRAUD DETECTION INSURANCE - VERSION DE DÉMONSTRATION
// Avec données mockées pour affichage immédiat
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Row, Col, Statistic, Table, Tag, Space, Alert, Timeline,
  Badge, Button, Progress, Tabs, List, Spin, message, Modal,
  Descriptions, Divider, Tooltip, Select, DatePicker, Input,
  Switch, Avatar, Typography, Drawer, Dropdown, Empty, Segmented,
  Form, InputNumber, ConfigProvider, theme, Skeleton
} from 'antd';
import {
  SafetyCertificateOutlined, WarningOutlined, EyeOutlined,
  LockOutlined, CheckCircleOutlined, CloseCircleOutlined,
  ReloadOutlined, DownloadOutlined, FilterOutlined,
  CarOutlined, HomeOutlined, HeartOutlined,
  RobotOutlined, ThunderboltOutlined, PlusOutlined,
  UserOutlined, BarChartOutlined, PieChartOutlined,
  SettingOutlined, BellOutlined, ExportOutlined,
  SearchOutlined, ClockCircleOutlined, TrophyOutlined,
  FundOutlined, LineChartOutlined, RadarChartOutlined,
  FilePdfOutlined, FileExcelOutlined,
  DollarOutlined, AlertOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { Line, Pie, Column, Area, Radar, Gauge } from '@ant-design/plots';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';
import api from '../../services/api';

dayjs.extend(relativeTime);
dayjs.locale('fr');

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { useToken } = theme;

// ============================================
// DONNÉES DE DÉMONSTRATION
// ============================================

const MOCK_DATA = {
  stats: {
    totalDetected: 1847,
    blocked: 423,
    investigating: 156,
    falsePositive: 89,
    amountSaved: 2400000,
    suspiciousRate: 12.8,
    detectionAccuracy: 96.5,
    totalClients: 3456,
    avgFraudScore: 28,
    recoveryRate: 82,
    alertsToday: 47
  },
  claims: [
    {
      id: 1,
      claim_number: 'F-2026-0042',
      client_name: 'Sophie Martin',
      amount: 48500,
      claim_type: 'auto',
      risk_level: 'critical',
      fraud_score: 92,
      status: 'blocked',
      created_at: '2026-06-24T09:30:00Z',
      description: 'Sinistre suspect - Incohérence dans le rapport d\'accident'
    },
    {
      id: 2,
      claim_number: 'F-2026-0041',
      client_name: 'Jean Dupont',
      amount: 32500,
      claim_type: 'habitation',
      risk_level: 'high',
      fraud_score: 78,
      status: 'investigating',
      created_at: '2026-06-24T08:15:00Z',
      description: 'Déclaration de sinistre avec documents suspects'
    },
    {
      id: 3,
      claim_number: 'F-2026-0040',
      client_name: 'Marie Laurent',
      amount: 15600,
      claim_type: 'sante',
      risk_level: 'medium',
      fraud_score: 65,
      status: 'investigating',
      created_at: '2026-06-23T14:45:00Z',
      description: 'Factures médicales potentiellement frauduleuses'
    },
    {
      id: 4,
      claim_number: 'F-2026-0039',
      client_name: 'Pierre Dubois',
      amount: 22300,
      claim_type: 'auto',
      risk_level: 'medium',
      fraud_score: 58,
      status: 'false_positive',
      created_at: '2026-06-23T11:20:00Z',
      description: 'Faux positif - Documentation vérifiée'
    },
    {
      id: 5,
      claim_number: 'F-2026-0038',
      client_name: 'Isabelle Petit',
      amount: 87500,
      claim_type: 'habitation',
      risk_level: 'critical',
      fraud_score: 95,
      status: 'blocked',
      created_at: '2026-06-22T16:30:00Z',
      description: 'Fraude organisée - Fausse déclaration de vol'
    },
    {
      id: 6,
      claim_number: 'F-2026-0037',
      client_name: 'Thomas Bernard',
      amount: 12400,
      claim_type: 'sante',
      risk_level: 'low',
      fraud_score: 25,
      status: 'approved',
      created_at: '2026-06-22T10:00:00Z',
      description: 'Sinistre validé après vérification'
    }
  ],
  clients: [
    { id: 1, client_name: 'Sophie Martin', client_email: 'sophie.martin@email.com', client_phone: '+33 6 12 34 56 78', claims_count: 3, total_amount: 48500, risk_level: 'high' },
    { id: 2, client_name: 'Jean Dupont', client_email: 'jean.dupont@email.com', client_phone: '+33 6 98 76 54 32', claims_count: 2, total_amount: 32500, risk_level: 'medium' },
    { id: 3, client_name: 'Marie Laurent', client_email: 'marie.laurent@email.com', client_phone: '+33 6 45 67 89 01', claims_count: 1, total_amount: 15600, risk_level: 'low' }
  ],
  fraudAlerts: [
    { id: 1, claim_number: 'F-2026-0042', fraud_score: 92, fraud_level: 'critical', description: 'Fraude confirmée - Blocage automatique', created_at: '2026-06-24T09:30:00Z' },
    { id: 2, claim_number: 'F-2026-0041', fraud_score: 78, fraud_level: 'high', description: 'Anomalie détectée - Enquête en cours', created_at: '2026-06-24T08:15:00Z' }
  ],
  detectionRules: [
    { id: 1, rule_name: 'Montant anormal', threshold: 50000, weight: 15, is_active: true },
    { id: 2, rule_name: 'Délai suspect', threshold: 30, weight: 10, is_active: true },
    { id: 3, rule_name: 'Historique incohérent', threshold: 3, weight: 20, is_active: true }
  ],
  charts: {
    fraudTrend: [
      { month: 'Jan', count: 120 },
      { month: 'Fév', count: 145 },
      { month: 'Mar', count: 132 },
      { month: 'Avr', count: 168 },
      { month: 'Mai', count: 156 },
      { month: 'Juin', count: 184 }
    ],
    byClaimType: { auto: 45, habitation: 30, sante: 25 },
    riskDistribution: { critical: 15, high: 25, medium: 35, low: 25 },
    dailyActivity: [
      { hour: '00:00', count: 5 },
      { hour: '04:00', count: 3 },
      { hour: '08:00', count: 25 },
      { hour: '12:00', count: 42 },
      { hour: '16:00', count: 38 },
      { hour: '20:00', count: 18 }
    ]
  }
};

// ============================================
// CONSTANTES
// ============================================

const STATUS_CONFIG = {
  blocked: { status: 'error', text: 'Bloqué', color: '#ef4444' },
  investigating: { status: 'processing', text: 'En enquête', color: '#f97316' },
  false_positive: { status: 'warning', text: 'Faux positif', color: '#eab308' },
  approved: { status: 'success', text: 'Approuvé', color: '#10b981' }
};

const RISK_CONFIG = {
  critical: { color: '#ef4444', label: 'CRITIQUE', bg: '#fef2f2' },
  high: { color: '#f97316', label: 'ÉLEVÉ', bg: '#fff7ed' },
  medium: { color: '#eab308', label: 'MOYEN', bg: '#fefce8' },
  low: { color: '#10b981', label: 'FAIBLE', bg: '#ecfdf5' }
};

const CLAIM_TYPES = {
  auto: { label: 'Automobile', icon: CarOutlined, color: '#3b82f6', bg: '#eff6ff' },
  habitation: { label: 'Habitation', icon: HomeOutlined, color: '#10b981', bg: '#ecfdf5' },
  sante: { label: 'Santé', icon: HeartOutlined, color: '#ef4444', bg: '#fef2f2' }
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const FraudDetectionInsurance = () => {
  const { token } = useToken();
  
  // États principaux
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [claims, setClaims] = useState([]);
  const [clients, setClients] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [detectionRules, setDetectionRules] = useState([]);
  
  // États statistiques
  const [stats, setStats] = useState({
    totalDetected: 0,
    blocked: 0,
    investigating: 0,
    falsePositive: 0,
    amountSaved: '0 €',
    suspiciousRate: 0,
    detectionAccuracy: 0,
    totalClients: 0,
    avgFraudScore: 0,
    recoveryRate: 0,
    alertsToday: 0
  });
  
  const [charts, setCharts] = useState({
    fraudTrend: [],
    byClaimType: { auto: 0, habitation: 0, sante: 0 },
    riskDistribution: { critical: 0, high: 0, medium: 0, low: 0 },
    dailyActivity: []
  });

  // États UI
  const [activeTab, setActiveTab] = useState('claims');
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [autoDetect, setAutoDetect] = useState(true);
  const [apiError, setApiError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [useMockData, setUseMockData] = useState(true);
  
  // États modaux
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [addClientModalVisible, setAddClientModalVisible] = useState(false);
  const [addClaimModalVisible, setAddClaimModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [fraudModalVisible, setFraudModalVisible] = useState(false);
  const [fraudAnalysis, setFraudAnalysis] = useState(null);
  const [actionType, setActionType] = useState('');
  const [actionReason, setActionReason] = useState('');
  const [reportsDrawerVisible, setReportsDrawerVisible] = useState(false);
  const [selectedReportPeriod, setSelectedReportPeriod] = useState('month');
  
  const [clientForm] = Form.useForm();
  const [claimForm] = Form.useForm();

  // ============================================
  // FONCTIONS DE NORMALISATION
  // ============================================

  const formatCurrency = (amount) => {
    if (!amount) return '0 €';
    const num = parseFloat(amount);
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M €`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(0)}K €`;
    return `${num.toFixed(0)} €`;
  };

  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================

  const loadMockData = useCallback(() => {
    
    const data = MOCK_DATA;
    
    setStats({
      totalDetected: data.stats.totalDetected,
      blocked: data.stats.blocked,
      investigating: data.stats.investigating,
      falsePositive: data.stats.falsePositive,
      amountSaved: formatCurrency(data.stats.amountSaved),
      suspiciousRate: data.stats.suspiciousRate,
      detectionAccuracy: data.stats.detectionAccuracy,
      totalClients: data.stats.totalClients,
      avgFraudScore: data.stats.avgFraudScore,
      recoveryRate: data.stats.recoveryRate,
      alertsToday: data.stats.alertsToday
    });

    setClaims(data.claims);
    setClients(data.clients);
    setFraudAlerts(data.fraudAlerts);
    setDetectionRules(data.detectionRules);
    
    setCharts({
      fraudTrend: data.charts.fraudTrend,
      byClaimType: data.charts.byClaimType,
      riskDistribution: data.charts.riskDistribution,
      dailyActivity: data.charts.dailyActivity
    });

    setLastUpdate(new Date());
    setApiError(false);
  }, []);

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setApiError(false);
    
    try {
      // Tentative de récupération des données API
      const [dashboardRes, claimsRes, clientsRes, alertsRes, rulesRes] = await Promise.allSettled([
        api.get('/fraud-insurance/dashboard').catch(() => null),
        api.get('/fraud-insurance/claims').catch(() => null),
        api.get('/fraud-insurance/clients').catch(() => null),
        api.get('/fraud-insurance/fraud-alerts').catch(() => null),
        api.get('/fraud-insurance/rules', { params: { active_only: true } }).catch(() => null)
      ]);

      // Vérifier si les données API sont disponibles
      const hasApiData = dashboardRes.status === 'fulfilled' && dashboardRes.value?.data;
      
      if (hasApiData) {
        // Traiter les données API ici...
        setUseMockData(false);
      } else {
        loadMockData();
        setUseMockData(true);
        if (dashboardRes.status === 'rejected') {
          setApiError(true);
        }
      }
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('❌ Erreur de chargement:', error);
      loadMockData();
      setApiError(true);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [loadMockData]);

  // ============================================
  // EFFET DE CHARGEMENT INITIAL
  // ============================================

  useEffect(() => {
    // Chargement immédiat des données de démonstration
    loadMockData();
    
    // Puis tentative de chargement API
    setTimeout(() => {
      fetchAllData();
    }, 500);
    
    const interval = setInterval(() => {
      if (!useMockData) {
        fetchAllData();
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // ============================================
  // WEBSOCKET (simplifié)
  // ============================================

  useEffect(() => {
    let ws = null;
    if (autoDetect && typeof window !== 'undefined' && !useMockData) {
      try {
        const io = require('socket.io-client');
        ws = io(process.env.REACT_APP_WS_URL || 'ws://localhost:8000', {
          path: '/ws',
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 3
        });

        ws.on('connect', () => console.log('✅ WebSocket connecté'));
        ws.on('fraud_alert', (data) => {
          setLiveAlerts(prev => [data, ...prev].slice(0, 20));
          message.error(`🚨 Fraude: ${data?.description || 'Nouvelle alerte'}`);
        });
        ws.on('disconnect', () => console.log('❌ WebSocket déconnecté'));
      } catch (error) {
        console.warn('WebSocket non disponible');
      }
    }
    return () => { if (ws) ws.disconnect(); };
  }, [autoDetect, useMockData]);

  // ============================================
  // GESTIONNAIRES D'ACTIONS
  // ============================================

  const handleViewDetails = (claim) => {
    setSelectedClaim(claim);
    setDetailsModalVisible(true);
  };

  const handleViewClient = (client) => {
    setSelectedClient(client);
    setClientModalVisible(true);
  };

  const handleAnalyzeFraud = (claimId) => {
    setFraudAnalysis({
      fraud_score: 87,
      fraud_level: 'high',
      confidence: 92,
      detection_method: 'Analyse comportementale avancée',
      indicators: ['Montant anormal', 'Délai suspect', 'Historique incohérent', 'Patterns inhabituels'],
      recommendation: 'Vérifier les documents justificatifs et l\'historique du client',
      timestamp: new Date().toISOString()
    });
    setFraudModalVisible(true);
  };

  const handleAction = (claim, type) => {
    setSelectedClaim(claim);
    setActionType(type);
    setActionModalVisible(true);
  };

  const handleConfirmAction = async () => {
    if (!actionReason.trim()) {
      message.warning('Veuillez saisir une raison');
      return;
    }

    message.success(actionType === 'block' ? 'Sinistre bloqué' : 'Marqué comme faux positif');
    setActionModalVisible(false);
    setActionReason('');
    
    // Mettre à jour le statut localement
    if (selectedClaim) {
      const updatedClaims = claims.map(c => 
        c.id === selectedClaim.id 
          ? { ...c, status: actionType === 'block' ? 'blocked' : 'false_positive' }
          : c
      );
      setClaims(updatedClaims);
    }
  };

  const handleAddClient = async (values) => {
    message.success('Client ajouté');
    setAddClientModalVisible(false);
    clientForm.resetFields();
    
    // Ajouter localement
    const newClient = {
      id: clients.length + 1,
      ...values,
      claims_count: 0,
      total_amount: 0,
      risk_level: 'low'
    };
    setClients([...clients, newClient]);
  };

  const handleAddClaim = async (values) => {
    message.success('Sinistre ajouté');
    setAddClaimModalVisible(false);
    claimForm.resetFields();
    
    // Ajouter localement
    const newClaim = {
      id: claims.length + 1,
      ...values,
      fraud_score: Math.floor(Math.random() * 50) + 20,
      risk_level: 'medium',
      status: 'investigating',
      created_at: new Date().toISOString()
    };
    setClaims([newClaim, ...claims]);
  };

  const handleExportReport = async () => {
    message.success('Rapport exporté');
    setReportsDrawerVisible(false);
  };

  // ============================================
  // COLONNES DES TABLEAUX
  // ============================================

  const claimColumns = [
    {
      title: 'N° Sinistre',
      dataIndex: 'claim_number',
      key: 'claim_number',
      width: 130,
      render: (text, record) => (
        <a onClick={() => handleViewDetails(record)} style={{ color: token.colorPrimary, fontWeight: 600 }}>
          {text || '-'}
        </a>
      )
    },
    {
      title: 'Client',
      dataIndex: 'client_name',
      key: 'client_name',
      width: 150,
      render: (text) => <Text strong>{text || 'N/A'}</Text>
    },
    {
      title: 'Montant',
      dataIndex: 'amount',
      key: 'amount',
      width: 100,
      render: (amt) => (
        <span style={{ color: token.colorSuccess, fontWeight: 600 }}>
          {amt?.toLocaleString()} €
        </span>
      )
    },
    {
      title: 'Type',
      dataIndex: 'claim_type',
      key: 'claim_type',
      width: 100,
      render: (type) => {
        const config = CLAIM_TYPES[type];
        if (!config) return <Tag>{type}</Tag>;
        const Icon = config.icon;
        return (
          <Tag style={{ background: config.bg, border: 'none', color: config.color, borderRadius: 12 }}>
            <Space size={4}>
              <Icon style={{ fontSize: 12 }} />
              {config.label}
            </Space>
          </Tag>
        );
      }
    },
    {
      title: 'Risque',
      dataIndex: 'risk_level',
      key: 'risk_level',
      width: 100,
      render: (risk) => {
        const config = RISK_CONFIG[risk] || RISK_CONFIG.low;
        return (
          <Tag color={config.color} style={{ borderRadius: 12, fontWeight: 600, background: config.bg, border: 'none' }}>
            {config.label}
          </Tag>
        );
      }
    },
    {
      title: 'Score Fraude',
      dataIndex: 'fraud_score',
      key: 'fraud_score',
      width: 130,
      render: (score) => {
        const value = Math.round(score || 0);
        return (
          <Progress
            percent={value}
            size="small"
            status={value > 70 ? 'exception' : value > 40 ? 'normal' : 'success'}
            format={() => `${value}%`}
            strokeColor={value > 70 ? token.colorError : value > 40 ? token.colorWarning : token.colorSuccess}
          />
        );
      }
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => {
        const config = STATUS_CONFIG[status] || STATUS_CONFIG.investigating;
        return <Badge status={config.status} text={config.text} />;
      }
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 140,
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Détails">
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetails(record)} />
          </Tooltip>
          {record.fraud_score > 60 && (
            <Tooltip title="Analyse IA">
              <Button size="small" icon={<RobotOutlined />} danger onClick={() => handleAnalyzeFraud(record.id)} />
            </Tooltip>
          )}
          {record.status === 'investigating' && (
            <Dropdown
              menu={{
                items: [
                  { key: 'block', label: 'Bloquer', icon: <LockOutlined />, onClick: () => handleAction(record, 'block') },
                  { key: 'false', label: 'Faux positif', icon: <CheckCircleOutlined />, onClick: () => handleAction(record, 'falsePositive') }
                ]
              }}
            >
              <Button size="small" type="primary" icon={<SettingOutlined />} />
            </Dropdown>
          )}
        </Space>
      )
    }
  ];

  const clientColumns = [
    {
      title: 'Client',
      dataIndex: 'client_name',
      key: 'client_name',
      render: (text, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: token.colorPrimary }} />
          <a onClick={() => handleViewClient(record)} style={{ fontWeight: 500, color: token.colorPrimary }}>
            {text || 'N/A'}
          </a>
        </Space>
      )
    },
    {
      title: 'Email',
      dataIndex: 'client_email',
      key: 'email',
      render: (email) => email || '-'
    },
    {
      title: 'Téléphone',
      dataIndex: 'client_phone',
      key: 'phone',
      render: (phone) => phone || '-'
    },
    {
      title: 'Sinistres',
      dataIndex: 'claims_count',
      key: 'claims_count',
      render: (count) => (
        <Badge count={count || 0} showZero style={{ backgroundColor: token.colorPrimary }} />
      )
    },
    {
      title: 'Montant total',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amt) => (
        <span style={{ fontWeight: 600, color: token.colorSuccess }}>
          {amt?.toLocaleString()} €
        </span>
      )
    },
    {
      title: 'Risque',
      dataIndex: 'risk_level',
      key: 'risk_level',
      render: (risk) => {
        const config = RISK_CONFIG[risk] || RISK_CONFIG.low;
        return (
          <Tag color={config.color} style={{ borderRadius: 12, fontWeight: 600, background: config.bg, border: 'none' }}>
            {config.label}
          </Tag>
        );
      }
    }
  ];

  // ============================================
  // CONFIGURATION DES GRAPHIQUES
  // ============================================

  const fraudTrendConfig = {
    data: charts.fraudTrend,
    xField: 'month',
    yField: 'count',
    smooth: true,
    point: { size: 4, shape: 'circle', style: { fill: '#fff', stroke: token.colorPrimary, lineWidth: 2 } },
    color: token.colorPrimary,
    areaStyle: { fill: `l(270) 0:#ffffff 0.5:${token.colorPrimaryBg} 1:${token.colorPrimary}`, opacity: 0.3 },
    tooltip: { formatter: (datum) => ({ name: 'Sinistres suspects', value: datum.count }) },
    animation: true
  };

  const byTypeData = Object.entries(charts.byClaimType).map(([key, value]) => ({
    type: CLAIM_TYPES[key]?.label || key,
    value: value || 0
  }));

  const byTypeConfig = {
    data: byTypeData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: { type: 'outer', content: '{name}: {percentage}', style: { fontSize: 11 } },
    legend: { position: 'bottom', itemName: { style: { fontSize: 12 } } },
    color: ({ type }) => {
      const colors = { Automobile: token.colorPrimary, Habitation: token.colorSuccess, Santé: token.colorError };
      return colors[type] || token.colorPrimary;
    }
  };

  const riskData = Object.entries(charts.riskDistribution).map(([key, value]) => ({
    risk: key === 'critical' ? 'Critique' : key === 'high' ? 'Élevé' : key === 'medium' ? 'Moyen' : 'Faible',
    count: value || 0
  }));

  const riskConfig = {
    data: riskData,
    xField: 'risk',
    yField: 'count',
    color: ({ risk }) => {
      const colors = { Critique: token.colorError, Élevé: token.colorWarning, Moyen: token.colorWarning, Faible: token.colorSuccess };
      return colors[risk] || token.colorPrimary;
    },
    label: { position: 'top', style: { fill: token.colorTextSecondary, fontSize: 11 } },
    columnStyle: { radius: [6, 6, 0, 0] }
  };

  // ============================================
  // RENDU
  // ============================================

  if (initialLoading) {
    return (
      <div style={{ padding: 24, minHeight: '100vh', background: token.colorBgLayout }}>
        <Card style={{ marginBottom: 24 }}>
          <Skeleton active paragraph={{ rows: 3 }} />
        </Card>
        <Row gutter={[20, 20]}>
          {[1, 2, 3, 4].map(i => (
            <Col xs={12} sm={6} key={i}>
              <Card><Skeleton active paragraph={{ rows: 2 }} /></Card>
            </Col>
          ))}
        </Row>
        <Card><Skeleton active paragraph={{ rows: 6 }} /></Card>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, minHeight: '100vh', background: token.colorBgLayout }}>

      {/* EN-TÊTE */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Card
          style={{ borderRadius: token.borderRadiusLG, marginBottom: 24, border: `1px solid ${token.colorBorderSecondary}` }}
          styles={{ body: { padding: '24px 32px' } }}
        >
          <Row gutter={[16, 16]} align="middle" justify="space-between">
            <Col xs={24} md={16}>
              <Space size={20} wrap>
                <div style={{
                  width: 56, height: 56,
                  background: `linear-gradient(135deg, ${token.colorPrimary}, #1d4ed8)`,
                  borderRadius: token.borderRadiusLG,
                  display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                  <SafetyCertificateOutlined style={{ fontSize: 28, color: '#fff' }} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    <Badge status="processing" text={<span style={{ color: token.colorPrimary, fontWeight: 600 }}>SYSTÈME ACTIF</span>} />
                    <Text style={{ color: token.colorTextSecondary, fontSize: 13 }}>
                      Détection IA • {stats.detectionAccuracy}% précision
                    </Text>
                    {lastUpdate && (
                      <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                        <ClockCircleOutlined /> {dayjs(lastUpdate).format('HH:mm')}
                      </Text>
                    )}
                  </div>
                  <Title level={2} style={{ margin: 0, color: token.colorText, fontWeight: 700 }}>
                    Anti-Fraude Assurance
                  </Title>
                  <Text style={{ color: token.colorTextSecondary, fontSize: 14 }}>
                    Surveillance temps réel des sinistres • {claims.length} sinistres • {clients.length} clients
                  </Text>
                </div>
              </Space>
            </Col>
            <Col xs={24} md={8}>
              <Space size={12} wrap>
                <Button icon={<DownloadOutlined />} onClick={() => setReportsDrawerVisible(true)}>
                  Rapports
                </Button>
                <Switch
                  checkedChildren="Auto"
                  unCheckedChildren="Manuel"
                  checked={autoDetect}
                  onChange={setAutoDetect}
                  style={{ background: autoDetect ? token.colorSuccess : token.colorTextTertiary }}
                />
                <Button icon={<ReloadOutlined />} onClick={fetchAllData} loading={loading} />
              </Space>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* ALERTES */}
      {liveAlerts.length > 0 && (
        <Alert
          message={<Space><Badge color="red" /><strong>{liveAlerts.length} alerte{liveAlerts.length > 1 ? 's' : ''} en temps réel</strong></Space>}
          description={
            <div style={{ maxHeight: 100, overflowY: 'auto' }}>
              {liveAlerts.slice(0, 5).map((alert, i) => (
                <div key={i} style={{ padding: '4px 0', borderBottom: i < liveAlerts.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                  <Text strong>{alert?.claim_number || 'Nouveau'}</Text>
                  <Text style={{ marginLeft: 8, color: token.colorTextSecondary }}>{alert?.description || 'Alerte détectée'}</Text>
                  <Text style={{ marginLeft: 8, color: token.colorTextTertiary, fontSize: 12 }}>
                    {dayjs(alert?.timestamp).fromNow()}
                  </Text>
                </div>
              ))}
            </div>
          }
          type="error"
          showIcon
          closable
          onClose={() => setLiveAlerts([])}
          style={{ marginBottom: 24, borderRadius: token.borderRadiusLG }}
        />
      )}

      {apiError && (
        <Alert
          message="ℹ️ Mode démonstration"
          description="Les données affichées sont des exemples. Connectez-vous au backend pour les données réelles."
          type="info"
          showIcon
          closable
          onClose={() => setApiError(false)}
          style={{ marginBottom: 24, borderRadius: token.borderRadiusLG }}
        />
      )}

      {/* KPIS */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <motion.div whileHover={{ y: -4 }}>
            <Card styles={{ body: { padding: '20px' } }}>
              <Statistic
                title={<span style={{ color: token.colorTextSecondary, fontSize: 13 }}>Sinistres suspects</span>}
                value={stats.totalDetected}
                valueStyle={{ color: token.colorError, fontSize: 26, fontWeight: 700 }}
                prefix={<WarningOutlined style={{ fontSize: 18 }} />}
              />
              <div style={{ marginTop: 8 }}>
                <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                  {stats.suspiciousRate}% des sinistres
                </Text>
              </div>
            </Card>
          </motion.div>
        </Col>
        <Col xs={12} sm={6}>
          <motion.div whileHover={{ y: -4 }}>
            <Card styles={{ body: { padding: '20px' } }}>
              <Statistic
                title={<span style={{ color: token.colorTextSecondary, fontSize: 13 }}>Sinistres bloqués</span>}
                value={stats.blocked}
                valueStyle={{ color: token.colorError, fontSize: 26, fontWeight: 700 }}
                prefix={<LockOutlined style={{ fontSize: 18 }} />}
              />
              <div style={{ marginTop: 8 }}>
                <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                  Taux: {stats.totalDetected > 0 ? Math.round((stats.blocked / stats.totalDetected) * 100) : 0}%
                </Text>
              </div>
            </Card>
          </motion.div>
        </Col>
        <Col xs={12} sm={6}>
          <motion.div whileHover={{ y: -4 }}>
            <Card styles={{ body: { padding: '20px' } }}>
              <Statistic
                title={<span style={{ color: token.colorTextSecondary, fontSize: 13 }}>Montant préservé</span>}
                value={stats.amountSaved}
                valueStyle={{ color: token.colorSuccess, fontSize: 26, fontWeight: 700 }}
                prefix={<DollarOutlined style={{ fontSize: 18 }} />}
              />
              <div style={{ marginTop: 8 }}>
                <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                  {stats.recoveryRate}% récupérés
                </Text>
              </div>
            </Card>
          </motion.div>
        </Col>
        <Col xs={12} sm={6}>
          <motion.div whileHover={{ y: -4 }}>
            <Card styles={{ body: { padding: '20px' } }}>
              <Statistic
                title={<span style={{ color: token.colorTextSecondary, fontSize: 13 }}>Précision IA</span>}
                value={stats.detectionAccuracy}
                suffix="%"
                valueStyle={{ color: token.colorPrimary, fontSize: 26, fontWeight: 700 }}
                prefix={<TrophyOutlined style={{ fontSize: 18 }} />}
              />
              <Progress
                percent={stats.detectionAccuracy}
                strokeColor={token.colorPrimary}
                showInfo={false}
                size="small"
                style={{ marginTop: 12 }}
              />
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* FILTRES */}
      <Card style={{ marginBottom: 24, borderRadius: token.borderRadiusLG }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={4}>
            <Input.Search
              placeholder="Rechercher..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              onSearch={() => {}}
              allowClear
              prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
            />
          </Col>
          <Col xs={12} md={3}>
            <Select
              placeholder="Risque"
              style={{ width: '100%' }}
              value={filterRisk}
              onChange={setFilterRisk}
              allowClear
              onClear={() => setFilterRisk('all')}
            >
              <Option value="all">Tous risques</Option>
              <Option value="critical">Critique</Option>
              <Option value="high">Élevé</Option>
              <Option value="medium">Moyen</Option>
              <Option value="low">Faible</Option>
            </Select>
          </Col>
          <Col xs={12} md={3}>
            <Select
              placeholder="Statut"
              style={{ width: '100%' }}
              value={filterStatus}
              onChange={setFilterStatus}
              allowClear
              onClear={() => setFilterStatus('all')}
            >
              <Option value="all">Tous statuts</Option>
              <Option value="investigating">En enquête</Option>
              <Option value="blocked">Bloqué</Option>
              <Option value="false_positive">Faux positif</Option>
              <Option value="approved">Approuvé</Option>
            </Select>
          </Col>
          <Col xs={12} md={3}>
            <Select
              placeholder="Type"
              style={{ width: '100%' }}
              value={filterType}
              onChange={setFilterType}
              allowClear
              onClear={() => setFilterType('all')}
            >
              <Option value="all">Tous types</Option>
              <Option value="auto">Auto</Option>
              <Option value="habitation">Habitation</Option>
              <Option value="sante">Santé</Option>
            </Select>
          </Col>
          <Col xs={12} md={8}>
            <RangePicker
              style={{ width: '100%' }}
              onChange={setDateRange}
              placeholder={['Date début', 'Date fin']}
              format="DD/MM/YYYY"
            />
          </Col>
          <Col xs={24} md={3}>
            <Button
              icon={<FilterOutlined />}
              onClick={() => {
                setFilterRisk('all');
                setFilterStatus('all');
                setFilterType('all');
                setDateRange(null);
                setSearchText('');
              }}
              style={{ width: '100%' }}
            >
              Réinitialiser
            </Button>
          </Col>
        </Row>
      </Card>

      {/* GRAPHIQUES */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title={<Space><LineChartOutlined style={{ color: token.colorPrimary }} /> Évolution mensuelle</Space>}
            style={{ borderRadius: token.borderRadiusLG }}
          >
            {charts.fraudTrend.length > 0 ? (
              <Line {...fraudTrendConfig} height={280} />
            ) : (
              <Empty description="Aucune donnée disponible" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={6}>
          <Card
            title={<Space><PieChartOutlined style={{ color: token.colorPrimary }} /> Par type</Space>}
            style={{ borderRadius: token.borderRadiusLG }}
          >
            {Object.values(charts.byClaimType).some(v => v > 0) ? (
              <Pie {...byTypeConfig} height={280} />
            ) : (
              <Empty description="Aucune donnée" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={6}>
          <Card
            title={<Space><RadarChartOutlined style={{ color: token.colorPrimary }} /> Performance</Space>}
            style={{ borderRadius: token.borderRadiusLG }}
          >
            <Radar
              data={[
                { category: 'Auto', score: 85, fullMark: 100 },
                { category: 'Habitation', score: 72, fullMark: 100 },
                { category: 'Santé', score: 68, fullMark: 100 },
                { category: 'Vie', score: 45, fullMark: 100 },
                { category: 'Pro', score: 58, fullMark: 100 }
              ]}
              xField="category"
              yField="score"
              area={{ style: { fill: `rgba(59, 130, 246, 0.1)` } }}
              point={{ size: 4, color: token.colorPrimary }}
              line={{ color: token.colorPrimary, width: 2 }}
              height={280}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={8}>
          <Card
            title={<Space><BarChartOutlined style={{ color: token.colorPrimary }} /> Distribution des risques</Space>}
            style={{ borderRadius: token.borderRadiusLG }}
          >
            {Object.values(charts.riskDistribution).some(v => v > 0) ? (
              <Column {...riskConfig} height={280} />
            ) : (
              <Empty description="Aucune donnée" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={<Space><ClockCircleOutlined style={{ color: token.colorPrimary }} /> Activité horaire</Space>}
            style={{ borderRadius: token.borderRadiusLG }}
          >
            {charts.dailyActivity.length > 0 ? (
              <Area
                data={charts.dailyActivity}
                xField="hour"
                yField="count"
                smooth={true}
                color={token.colorPrimary}
                areaStyle={{ fill: `l(270) 0:${token.colorPrimary} 1:${token.colorPrimaryBg}`, opacity: 0.2 }}
                point={{ size: 4, shape: 'circle', style: { fill: token.colorPrimary } }}
                height={280}
              />
            ) : (
              <Empty description="Aucune donnée" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={<Space><FundOutlined style={{ color: token.colorPrimary }} /> Performance système</Space>}
            style={{ borderRadius: token.borderRadiusLG }}
          >
            <div style={{ textAlign: 'center' }}>
              <Gauge
                percent={(stats.detectionAccuracy || 76) / 100}
                range={{ color: 'l(0) 0:#3b82f6 1:#1d4ed8' }}
                indicator={{ pointer: { style: { stroke: '#94a3b8' } }, pin: { style: { stroke: '#94a3b8' } } }}
                statistic={{ content: { style: { fontSize: '24px', color: '#1e293b', fontWeight: 600 } } }}
                height={200}
              />
              <Row gutter={12} style={{ marginTop: 16 }}>
                <Col span={12}>
                  <div style={{ background: token.colorBgLayout, borderRadius: token.borderRadius, padding: 12, textAlign: 'center' }}>
                    <Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>Précision</Text>
                    <div style={{ fontSize: 20, fontWeight: 700, color: token.colorPrimary }}>{stats.detectionAccuracy}%</div>
                  </div>
                </Col>
                <Col span={12}>
                  <div style={{ background: token.colorBgLayout, borderRadius: token.borderRadius, padding: 12, textAlign: 'center' }}>
                    <Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>Récupération</Text>
                    <div style={{ fontSize: 20, fontWeight: 700, color: token.colorSuccess }}>{stats.recoveryRate}%</div>
                  </div>
                </Col>
              </Row>
            </div>
          </Card>
        </Col>
      </Row>

      {/* TABLEAUX PRINCIPAUX */}
      <Card style={{ borderRadius: token.borderRadiusLG, overflow: 'hidden' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'claims',
              label: <Space><WarningOutlined style={{ color: token.colorPrimary }} /> Sinistres ({claims.length})</Space>,
              children: (
                <Table
                  columns={claimColumns}
                  dataSource={claims}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} sinistres`
                  }}
                  scroll={{ x: 1200 }}
                />
              )
            },
            {
              key: 'clients',
              label: <Space><UserOutlined style={{ color: token.colorPrimary }} /> Clients ({clients.length})</Space>,
              children: (
                <Table
                  columns={clientColumns}
                  dataSource={clients}
                  rowKey="id"
                  loading={loading}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showTotal: (total) => `Total ${total} clients`
                  }}
                />
              )
            },
            {
              key: 'alerts',
              label: <Space><BellOutlined style={{ color: token.colorPrimary }} /> Alertes ({fraudAlerts.length})</Space>,
              children: (
                <List
                  dataSource={fraudAlerts}
                  loading={loading}
                  renderItem={alert => (
                    <List.Item
                      actions={[
                        <Button type="link" icon={<RobotOutlined />} onClick={() => handleAnalyzeFraud(alert.id)}>
                          Analyser
                        </Button>
                      ]}
                    >
                      <List.Item.Meta
                        avatar={<Avatar icon={<WarningOutlined />} style={{ backgroundColor: token.colorError }} />}
                        title={<Text strong>{alert.claim_number}</Text>}
                        description={
                          <div>
                            <Tag color={alert.fraud_level === 'critical' ? 'error' : 'warning'}>
                              Score: {alert.fraud_score}%
                            </Tag>
                            <Text style={{ marginLeft: 8, color: token.colorTextSecondary }}>{alert.description}</Text>
                            <br />
                            <Text style={{ color: token.colorTextTertiary, fontSize: 12 }}>
                              {dayjs(alert.created_at).fromNow()}
                            </Text>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
              )
            },
            {
              key: 'rules',
              label: <Space><SettingOutlined style={{ color: token.colorPrimary }} /> Règles ({detectionRules.length})</Space>,
              children: (
                <List
                  dataSource={detectionRules}
                  loading={loading}
                  renderItem={rule => (
                    <List.Item>
                      <List.Item.Meta
                        title={<Text strong>{rule.rule_name}</Text>}
                        description={
                          <Text style={{ color: token.colorTextSecondary }}>
                            Seuil: {rule.threshold} - Impact: {rule.weight} points
                          </Text>
                        }
                      />
                      <Tag color={rule.is_active ? 'success' : 'default'}>
                        {rule.is_active ? 'Actif' : 'Inactif'}
                      </Tag>
                    </List.Item>
                  )}
                />
              )
            }
          ]}
        />
      </Card>

      {/* ============================================ */}
      {/* MODALS */}
      {/* ============================================ */}

      {/* Détails Sinistre */}
      <Modal
        title={`Détails - ${selectedClaim?.claim_number || ''}`}
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setDetailsModalVisible(false)}>Fermer</Button>,
          selectedClaim?.status === 'investigating' && (
            <Button key="block" danger icon={<LockOutlined />} onClick={() => { setDetailsModalVisible(false); handleAction(selectedClaim, 'block'); }}>
              Bloquer
            </Button>
          ),
          selectedClaim?.fraud_score > 60 && (
            <Button key="analyze" type="primary" icon={<RobotOutlined />} onClick={() => handleAnalyzeFraud(selectedClaim.id)}>
              Analyser IA
            </Button>
          )
        ]}
      >
        {selectedClaim && (
          <Descriptions column={2} bordered size="middle">
            <Descriptions.Item label="N° Sinistre"><Text strong>{selectedClaim.claim_number}</Text></Descriptions.Item>
            <Descriptions.Item label="Client">{selectedClaim.client_name}</Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag>{selectedClaim.claim_type}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Date">{dayjs(selectedClaim.created_at).format('DD/MM/YYYY')}</Descriptions.Item>
            <Descriptions.Item label="Montant">
              <span style={{ color: token.colorSuccess, fontWeight: 600 }}>{selectedClaim.amount?.toLocaleString()} €</span>
            </Descriptions.Item>
            <Descriptions.Item label="Score fraude">
              <Progress percent={Math.round(selectedClaim.fraud_score || 0)} size="small" width={100} />
            </Descriptions.Item>
            <Descriptions.Item label="Risque">
              <Tag color={RISK_CONFIG[selectedClaim.risk_level]?.color}>{RISK_CONFIG[selectedClaim.risk_level]?.label}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Statut">
              <Badge {...STATUS_CONFIG[selectedClaim.status]} />
            </Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>{selectedClaim.description || '-'}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Détails Client */}
      <Modal
        title="Détails client"
        open={clientModalVisible}
        onCancel={() => setClientModalVisible(false)}
        footer={null}
        width={500}
      >
        {selectedClient && (
          <Descriptions column={1} bordered size="middle">
            <Descriptions.Item label="Nom"><Text strong>{selectedClient.client_name}</Text></Descriptions.Item>
            <Descriptions.Item label="Email">{selectedClient.client_email || '-'}</Descriptions.Item>
            <Descriptions.Item label="Téléphone">{selectedClient.client_phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="Adresse">{selectedClient.client_address || '-'}</Descriptions.Item>
            <Descriptions.Item label="Sinistres">
              <Badge count={selectedClient.claims_count || 0} style={{ backgroundColor: token.colorPrimary }} />
            </Descriptions.Item>
            <Descriptions.Item label="Montant total">
              <span style={{ fontWeight: 600, color: token.colorSuccess }}>{selectedClient.total_amount?.toLocaleString()} €</span>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Ajout Client */}
      <Modal
        title="Ajouter un client"
        open={addClientModalVisible}
        onCancel={() => { setAddClientModalVisible(false); clientForm.resetFields(); }}
        footer={null}
        width={500}
      >
        <Form form={clientForm} layout="vertical" onFinish={handleAddClient}>
          <Form.Item name="client_name" label="Nom complet" rules={[{ required: true }]}>
            <Input placeholder="Nom du client" />
          </Form.Item>
          <Form.Item name="client_email" label="Email" rules={[{ type: 'email' }]}>
            <Input type="email" placeholder="Email" />
          </Form.Item>
          <Form.Item name="client_phone" label="Téléphone">
            <Input placeholder="Téléphone" />
          </Form.Item>
          <Form.Item name="client_address" label="Adresse">
            <TextArea rows={2} placeholder="Adresse" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ width: '100%' }}>Ajouter</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Ajout Sinistre */}
      <Modal
        title="Ajouter un sinistre"
        open={addClaimModalVisible}
        onCancel={() => { setAddClaimModalVisible(false); claimForm.resetFields(); }}
        footer={null}
        width={500}
      >
        <Form form={claimForm} layout="vertical" onFinish={handleAddClaim}>
          <Form.Item name="claim_number" label="N° Sinistre" rules={[{ required: true }]}>
            <Input placeholder="Numéro du sinistre" />
          </Form.Item>
          <Form.Item name="client_name" label="Client" rules={[{ required: true }]}>
            <Input placeholder="Nom du client" />
          </Form.Item>
          <Form.Item name="amount" label="Montant" rules={[{ required: true }]}>
            <InputNumber placeholder="Montant" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="claim_type" label="Type" rules={[{ required: true }]}>
            <Select placeholder="Sélectionner le type">
              <Option value="auto">Automobile</Option>
              <Option value="habitation">Habitation</Option>
              <Option value="sante">Santé</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Description" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" style={{ width: '100%' }}>Ajouter</Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Action Modal */}
      <Modal
        title={actionType === 'block' ? 'Bloquer le sinistre' : 'Marquer comme faux positif'}
        open={actionModalVisible}
        onCancel={() => { setActionModalVisible(false); setActionReason(''); }}
        onOk={handleConfirmAction}
        okButtonProps={{ danger: actionType === 'block' }}
      >
        <TextArea
          rows={4}
          placeholder={actionType === 'block' ? "Raison du blocage" : "Notes"}
          value={actionReason}
          onChange={(e) => setActionReason(e.target.value)}
        />
      </Modal>

      {/* Analyse IA */}
      <Modal
        title="Analyse Anti-Fraude IA"
        open={fraudModalVisible}
        onCancel={() => setFraudModalVisible(false)}
        footer={[<Button key="close" onClick={() => setFraudModalVisible(false)}>Fermer</Button>]}
        width={600}
      >
        {fraudAnalysis && (
          <div>
            <Alert
              message={`Score: ${fraudAnalysis.fraud_score}% - Niveau ${fraudAnalysis.fraud_level}`}
              description={`Confiance: ${fraudAnalysis.confidence}% - Méthode: ${fraudAnalysis.detection_method}`}
              type={fraudAnalysis.fraud_level === 'critical' ? 'error' : 'warning'}
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Card size="small" title="Indicateurs">
              <Space wrap>
                {fraudAnalysis.indicators?.map((ind, i) => (
                  <Tag key={i} color="red">{ind}</Tag>
                ))}
              </Space>
            </Card>
            <Card size="small" title="Recommandation" style={{ marginTop: 16 }}>
              <Alert message={fraudAnalysis.recommendation} type="info" showIcon />
            </Card>
          </div>
        )}
      </Modal>

      {/* Rapports Drawer */}
      <Drawer
        title="Export de rapports"
        placement="right"
        width={400}
        open={reportsDrawerVisible}
        onClose={() => setReportsDrawerVisible(false)}
      >
        <Text strong>Période du rapport</Text>
        <Segmented
          value={selectedReportPeriod}
          onChange={setSelectedReportPeriod}
          options={[
            { label: 'Mensuel', value: 'month' },
            { label: 'Trimestriel', value: 'quarter' },
            { label: 'Annuel', value: 'year' }
          ]}
          block
          style={{ marginBottom: 24, marginTop: 12 }}
        />
        <Divider />
        <Space direction="vertical" style={{ width: '100%' }} size={12}>
          <Button icon={<FilePdfOutlined />} block onClick={handleExportReport}>PDF - Rapport complet</Button>
          <Button icon={<FileExcelOutlined />} block>Excel - Données brutes</Button>
        </Space>
        <Divider />
        <div style={{ background: token.colorBgLayout, borderRadius: token.borderRadius, padding: 16 }}>
          <Text strong>Statistiques</Text>
          <Row gutter={16} style={{ marginTop: 12 }}>
            <Col span={12}>
              <Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>Sinistres suspects</Text>
              <div style={{ fontSize: 20, fontWeight: 700, color: token.colorError }}>{stats.totalDetected}</div>
            </Col>
            <Col span={12}>
              <Text style={{ color: token.colorTextSecondary, fontSize: 12 }}>Montant préservé</Text>
              <div style={{ fontSize: 20, fontWeight: 700, color: token.colorSuccess }}>{stats.amountSaved}</div>
            </Col>
          </Row>
        </div>
      </Drawer>

      {/* BOUTONS FLOTTANTS - ACTIONS RAPIDES */}
      <div style={{ position: 'fixed', bottom: 32, right: 32, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Tooltip title="Nouveau sinistre">
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => setAddClaimModalVisible(true)}
            style={{ boxShadow: '0 4px 12px rgba(59,130,246,0.4)' }}
          />
        </Tooltip>
        <Tooltip title="Nouveau client">
          <Button
            shape="circle"
            size="large"
            icon={<UserOutlined />}
            onClick={() => setAddClientModalVisible(true)}
            style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
          />
        </Tooltip>
      </div>

      {/* Styles CSS */}
      <style>{`
        .ant-card-body { padding: 16px; }
        .ant-table-thead > tr > th {
          background: ${token.colorBgLayout} !important;
          color: ${token.colorTextSecondary} !important;
          font-weight: 600 !important;
        }
        .ant-tabs-tab-active { color: ${token.colorPrimary} !important; }
        .ant-tabs-ink-bar { background: ${token.colorPrimary} !important; }
        .ant-table-tbody > tr:hover > td { background: ${token.colorPrimaryBg} !important; }
      `}</style>

    </div>
  );
};

export default FraudDetectionInsurance;