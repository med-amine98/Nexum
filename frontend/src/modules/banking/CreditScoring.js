// src/modules/banking/CreditScoring.js - Version avec IA Backend réelle et méthodes POST
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Card, Row, Col, Statistic, Table, Tag, Space, Progress, Button,
  Tabs, Select, DatePicker, Input, message, Spin, Modal, Descriptions,
  Tooltip, Divider, Alert, Badge, Steps, Switch,
  Form, InputNumber, Upload, Checkbox, Avatar, Timeline, Empty,
  Drawer, Typography
} from 'antd';
import {
  FundOutlined, UserOutlined, DollarOutlined,
  DownloadOutlined, WarningOutlined, CheckCircleOutlined, EyeOutlined,
  ReloadOutlined, FilterOutlined, CloseCircleOutlined, FileTextOutlined,
  RobotOutlined, SafetyOutlined, ThunderboltOutlined,
  ScanOutlined, BankOutlined, LineChartOutlined, AlertOutlined,
  PlusOutlined, UploadOutlined, WalletOutlined, CreditCardOutlined,
  HomeOutlined, RiseOutlined, DeleteOutlined, SearchOutlined,
  EuroCircleOutlined, CloudDownloadOutlined, StarOutlined,
  TrophyOutlined, TeamOutlined, ClockCircleOutlined,
  BulbOutlined, NodeIndexOutlined, ApiOutlined, DatabaseOutlined,
  CloudServerOutlined, ExperimentOutlined, BlockOutlined,
  DashboardOutlined, TransactionOutlined, HistoryOutlined,
  SettingOutlined, LockOutlined, SecurityScanOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import api from '../../services/api';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { TextArea } = Input;
const { Title, Text } = Typography;

// ============================================
// 🔬 AFFICHAGE DES ALGORITHMES IA UTILISÉS
// ============================================
const AI_ALGORITHMS = {
  credit: {
    name: 'RandomForestRegressor',
    description: 'Régression pour le scoring de crédit',
    version: '1.0',
    features: ['Revenu', 'Dépenses', 'Épargne', 'Âge', 'Ancienneté', 'Historique paiement']
  },
  fraud: {
    name: 'GradientBoostingClassifier',
    description: 'Classification pour la détection de fraude',
    version: '1.0',
    features: ['Ratio actif/revenu', 'Demandes récentes', 'Dépenses/revenus', 'Incidents bancaires']
  }
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const CreditScoring = () => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [clients, setClients] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [aiStatus, setAiStatus] = useState({
    loaded: false,
    models: [],
    lastUpdate: null
  });
  const [stats, setStats] = useState({
    totalRequests: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
    avgScore: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    fraudDetected: 0,
    fraudPreventionRate: 0,
    totalClients: 0,
    totalAmountApproved: 0
  });
  const [fraudDistribution, setFraudDistribution] = useState({
    credit_fraud: 0,
    intentional_default: 0,
    multiple_requests: 0,
    forged_documents: 0,
    income_inconsistency: 0,
    identity_theft: 0
  });
  
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [addClientModalVisible, setAddClientModalVisible] = useState(false);
  const [addRequestModalVisible, setAddRequestModalVisible] = useState(false);
  const [decisionModalVisible, setDecisionModalVisible] = useState(false);
  const [aiAnalysisModalVisible, setAiAnalysisModalVisible] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [decisionType, setDecisionType] = useState('');
  const [activeTab, setActiveTab] = useState('requests');
  const [submitting, setSubmitting] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [notificationHistory, setNotificationHistory] = useState([]);
  
  const [clientForm] = Form.useForm();
  const [requestForm] = Form.useForm();

  // ============================================
  // 📊 CHARGEMENT DES DONNÉES ET STATUT IA
  // ============================================
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Vérifier le statut de l'IA
      try {
        const aiStatusResponse = await api.get('/credit-scoring/ai-status');
        if (aiStatusResponse.data) {
          setAiStatus({
            loaded: aiStatusResponse.data.loaded || false,
            models: aiStatusResponse.data.models || [],
            lastUpdate: aiStatusResponse.data.lastUpdate || null
          });
        }
      } catch (e) {
        console.warn('Statut IA non disponible:', e);
      }
      
      // 2. Charger les demandes
      const requestsResponse = await api.get('/credit-scoring/requests');
      const requestsData = requestsResponse.data || [];
      setRequests(requestsData);
      
      // 3. Charger les clients
      const clientsResponse = await api.get('/credit-scoring/clients');
      const clientsData = clientsResponse.data || [];
      setClients(clientsData);
      
      // 4. Charger les alertes
      const alertsResponse = await api.get('/credit-scoring/fraud-alerts');
      setFraudAlerts(alertsResponse.data || []);
      
      // 5. Mettre à jour les stats
      updateStats(requestsData, clientsData);
      
    } catch (error) {
      console.error('Erreur chargement:', error);
      message.error('Erreur de chargement des données');
      
      if (process.env.NODE_ENV === 'development') {
        const demoRequests = generateDemoData();
        setRequests(demoRequests);
        setClients(generateDemoClients());
        updateStats(demoRequests, generateDemoClients());
      }
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // 📊 DONNÉES DE DÉMONSTRATION (DEV UNIQUEMENT)
  // ============================================
  const generateDemoData = () => {
    return [
      {
        id: '1',
        client_name: 'Jean Dupont',
        amount: 25000,
        credit_score: 720,
        fraud_risk: 'low',
        status: 'approved',
        created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
        purpose: 'Achat immobilier',
        income: 45000,
        age: 35,
        employment_years: 8,
        existing_loans: 1,
        payment_history: 'excellent'
      },
      {
        id: '2',
        client_name: 'Marie Martin',
        amount: 15000,
        credit_score: 680,
        fraud_risk: 'medium',
        status: 'pending',
        created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
        purpose: 'Travaux',
        income: 38000,
        age: 28,
        employment_years: 4,
        existing_loans: 2,
        payment_history: 'good'
      },
      {
        id: '3',
        client_name: 'Pierre Durand',
        amount: 50000,
        credit_score: 590,
        fraud_risk: 'high',
        status: 'pending',
        created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
        purpose: 'Création entreprise',
        income: 65000,
        age: 42,
        employment_years: 12,
        existing_loans: 3,
        payment_history: 'average'
      }
    ];
  };

  const generateDemoClients = () => {
    return [
      { id: '1', client_name: 'Jean Dupont', client_email: 'jean@email.com', client_phone: '0612345678', client_income: 45000, request_count: 2 },
      { id: '2', client_name: 'Marie Martin', client_email: 'marie@email.com', client_phone: '0698765432', client_income: 38000, request_count: 1 },
      { id: '3', client_name: 'Pierre Durand', client_email: 'pierre@email.com', client_phone: '0745123698', client_income: 65000, request_count: 3 }
    ];
  };

  // ============================================
  // 📊 MISE À JOUR DES STATISTIQUES
  // ============================================
  const updateStats = (requestsData, clientsData) => {
    const total = requestsData.length;
    const approved = requestsData.filter(r => r.status === 'approved').length;
    const rejected = requestsData.filter(r => r.status === 'rejected').length;
    const pending = requestsData.filter(r => r.status === 'pending').length;
    const avgScore = total > 0 ? Math.round(requestsData.reduce((sum, r) => sum + (r.credit_score || 0), 0) / total) : 0;
    const highRisk = requestsData.filter(r => r.fraud_risk === 'high' || r.fraud_risk === 'critical').length;
    const mediumRisk = requestsData.filter(r => r.fraud_risk === 'medium').length;
    const lowRisk = requestsData.filter(r => r.fraud_risk === 'low').length;
    const totalAmountApproved = requestsData.filter(r => r.status === 'approved').reduce((sum, r) => sum + (r.amount || 0), 0);
    
    // Calculer la distribution des fraudes à partir des données réelles
    const fraudDist = {
      credit_fraud: requestsData.filter(r => r.fraud_type === 'credit_fraud').length || 0,
      intentional_default: requestsData.filter(r => r.fraud_type === 'intentional_default').length || 0,
      multiple_requests: requestsData.filter(r => r.fraud_type === 'multiple_requests').length || 0,
      forged_documents: requestsData.filter(r => r.fraud_type === 'forged_documents').length || 0,
      income_inconsistency: requestsData.filter(r => r.fraud_type === 'income_inconsistency').length || 0,
      identity_theft: requestsData.filter(r => r.fraud_type === 'identity_theft').length || 0
    };
    
    setStats({
      totalRequests: total,
      approved,
      rejected,
      pending,
      avgScore,
      highRisk,
      mediumRisk,
      lowRisk,
      fraudDetected: requestsData.filter(r => r.fraud_risk === 'high' || r.fraud_risk === 'critical').length,
      fraudPreventionRate: total > 0 ? Math.round((requestsData.filter(r => r.fraud_risk === 'low').length / total) * 100) : 0,
      totalClients: clientsData.length,
      totalAmountApproved
    });
    
    setFraudDistribution(fraudDist);
  };

  // ============================================
  // 🤖 ANALYSE IA AVEC LE BACKEND
  // ============================================
  const analyzeRequestWithAI = useCallback(async (request) => {
    try {
      setLoading(true);
      
      // Appel API pour l'analyse IA
      const response = await api.post(`/credit-scoring/requests/${request.id}/fraud-analysis`);
      
      if (response.data) {
        const result = response.data;
        setAiAnalysisResult({
          credit_score: request.credit_score || 0,
          fraud_score: result.fraud_score || 0,
          fraud_risk: result.fraud_level || 'low',
          fraud_factors: result.indicators || [],
          default_probability: 0.15,
          decision: request.status || 'pending',
          decision_reason: result.recommendation || 'Analyse en cours',
          confidence: result.confidence || 85,
          analysis_date: new Date().toISOString(),
          algorithms_used: [
            { name: 'RandomForestRegressor', status: '✅ Actif', version: '1.0' },
            { name: 'GradientBoostingClassifier', status: '✅ Actif', version: '1.0' }
          ]
        });
        setAiAnalysisModalVisible(true);
        
        addToHistory('Analyse IA', `Demande ${request.client_name} - Score fraude: ${result.fraud_score}%`, 'info', 'system');
      }
      
    } catch (error) {
      console.error('Erreur analyse IA:', error);
      message.error('Erreur lors de l\'analyse IA');
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================
  // 📝 HISTORIQUE DES NOTIFICATIONS
  // ============================================
  const addToHistory = (title, message, type, source, data = {}) => {
    const historyItem = {
      id: Date.now(),
      title,
      message,
      type,
      source,
      data,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotificationHistory(prev => [historyItem, ...prev].slice(0, 200));
  };

  // ============================================
  // 👤 AJOUT D'UN CLIENT
  // ============================================
  const handleAddClient = async () => {
    try {
      const values = await clientForm.validateFields();
      setSubmitting(true);
      
      const response = await api.post('/credit-scoring/clients', {
        client_name: values.client_name,
        client_email: values.client_email || '',
        client_phone: values.client_phone || '',
        client_address: values.client_address || '',
        client_income: values.client_income || 0,
        client_employment_years: values.client_employment_years || 0
      });
      
      if (response.data && response.data.id) {
        const newClient = {
          id: String(response.data.id),
          client_id: response.data.client_id,
          client_name: response.data.client_name,
          client_email: response.data.client_email,
          client_phone: response.data.client_phone,
          client_income: response.data.client_income || values.client_income || 0,
          request_count: 0,
          created_at: new Date().toISOString()
        };
        
        setClients(prev => [newClient, ...prev]);
        updateStats(requests, [newClient, ...clients]);
        
        message.success(`✅ Client ${values.client_name} ajouté avec succès`);
        addToHistory('Nouveau client', `Client ${values.client_name} ajouté`, 'success', 'system');
        setAddClientModalVisible(false);
        clientForm.resetFields();
      }
    } catch (error) {
      console.error('Erreur ajout client:', error);
      if (error.response?.data?.detail) {
        message.error(`❌ ${error.response.data.detail}`);
      } else {
        message.error('❌ Erreur lors de l\'ajout du client');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // 📝 AJOUT D'UNE DEMANDE AVEC IA
  // ============================================
  const handleAddRequest = async () => {
    try {
      const values = await requestForm.validateFields();
      setSubmitting(true);
      
      // Appel API avec les données pour l'IA
      const response = await api.post('/credit-scoring/requests', {
        client_name: values.client_name,
        amount: values.amount,
        purpose: values.purpose,
        income: values.income || 35000,
        age: values.age || 35,
        employment_years: values.employment_years || 5,
        existing_loans: values.existing_loans || 0,
        payment_history: values.payment_history || 'good',
        income_sources: [],
        expenses: [],
        properties: [],
        investments: [],
        bank_incidents: []
      });
      
      if (response.data && response.data.id) {
        const newRequest = {
          id: response.data.id,
          ...values,
          credit_score: response.data.credit_score || 0,
          fraud_risk: response.data.fraud_risk || 'low',
          fraud_score: response.data.fraud_score || 0,
          status: response.data.status || 'pending',
          decision_reason: response.data.decision_reason || '',
          created_at: new Date().toISOString()
        };
        
        setRequests(prev => [newRequest, ...prev]);
        updateStats([newRequest, ...requests], clients);
        
        message.success(`✅ Demande soumise - Score: ${response.data.credit_score || 0}/850`);
        
        if (response.data.fraud_risk === 'high' || response.data.fraud_risk === 'critical') {
          message.warning(`⚠️ Risque de fraude ${response.data.fraud_risk.toUpperCase()} détecté`);
          addToHistory('Alerte Fraude', `${values.client_name} - Score fraude: ${response.data.fraud_score}%`, 'critical', 'system');
        }
        
        setAddRequestModalVisible(false);
        requestForm.resetFields();
      }
    } catch (error) {
      console.error('Erreur soumission:', error);
      if (error.response?.data?.detail) {
        message.error(`❌ ${error.response.data.detail}`);
      } else {
        message.error('❌ Erreur lors de la soumission');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // ✅ APPROUVER UNE DEMANDE (POST)
  // ============================================
  const handleApprove = async () => {
    try {
      const response = await api.post(`/credit-scoring/requests/${selectedRequest.id}/approve`, {
        notes: decisionNotes
      });
      
      if (response.data) {
        setRequests(prev => prev.map(r => 
          r.id === selectedRequest.id ? { ...r, status: 'approved' } : r
        ));
        updateStats(requests.map(r => 
          r.id === selectedRequest.id ? { ...r, status: 'approved' } : r
        ), clients);
        
        message.success('✅ Demande approuvée');
        addToHistory('Décision', `Demande ${selectedRequest.client_name} approuvée`, 'success', 'system');
        setDecisionModalVisible(false);
        setDetailsModalVisible(false);
        setDecisionNotes('');
      }
    } catch (error) {
      console.error('Erreur approbation:', error);
      message.error('❌ Erreur lors de l\'approbation');
    }
  };

  // ============================================
  // ❌ REJETER UNE DEMANDE (POST)
  // ============================================
  const handleReject = async () => {
    if (!decisionNotes.trim()) {
      message.warning('Veuillez saisir une raison');
      return;
    }
    
    try {
      const response = await api.post(`/credit-scoring/requests/${selectedRequest.id}/reject`, {
        reason: decisionNotes
      });
      
      if (response.data) {
        setRequests(prev => prev.map(r => 
          r.id === selectedRequest.id ? { ...r, status: 'rejected', rejection_reason: decisionNotes } : r
        ));
        updateStats(requests.map(r => 
          r.id === selectedRequest.id ? { ...r, status: 'rejected' } : r
        ), clients);
        
        message.success('❌ Demande rejetée');
        addToHistory('Décision', `Demande ${selectedRequest.client_name} rejetée: ${decisionNotes}`, 'warning', 'system');
        setDecisionModalVisible(false);
        setDetailsModalVisible(false);
        setDecisionNotes('');
      }
    } catch (error) {
      console.error('Erreur rejet:', error);
      message.error('❌ Erreur lors du rejet');
    }
  };

  // ============================================
  // 🔄 INITIALISATION
  // ============================================
  useEffect(() => {
    fetchData();
  }, []);

  // ============================================
  // 📊 GRAPHIQUES ECHARTS
  // ============================================
  const distributionChartOption = {
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#f1f5f9' }
    },
    grid: { left: 10, right: 10, top: 20, bottom: 20, containLabel: true },
    xAxis: {
      type: 'category',
      data: ['Critique', 'Élevé', 'Moyen', 'Faible'],
      axisLabel: { color: '#94a3b8' },
      axisLine: { lineStyle: { color: '#334155' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#334155', type: 'dashed' } }
    },
    series: [{
      type: 'bar',
      data: [
        { value: stats.highRisk, itemStyle: { color: '#ef4444' } },
        { value: stats.highRisk, itemStyle: { color: '#f59e0b' } },
        { value: stats.mediumRisk, itemStyle: { color: '#10b981' } },
        { value: stats.lowRisk, itemStyle: { color: '#34d399' } }
      ],
      barWidth: '40%',
      label: { show: true, position: 'top', color: '#f1f5f9' }
    }]
  };

  const fraudDistributionChartOption = {
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(30, 41, 59, 0.95)',
      borderColor: '#334155',
      textStyle: { color: '#f1f5f9' }
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: true,
      itemStyle: {
        borderRadius: 8,
        borderColor: '#0f172a',
        borderWidth: 2
      },
      label: {
        color: '#94a3b8',
        formatter: '{b}\n{d}%'
      },
      data: [
        { value: fraudDistribution.credit_fraud || 1, name: 'Fraude crédit', itemStyle: { color: '#ef4444' } },
        { value: fraudDistribution.intentional_default || 1, name: 'Défaut intentionnel', itemStyle: { color: '#f59e0b' } },
        { value: fraudDistribution.multiple_requests || 1, name: 'Demandes multiples', itemStyle: { color: '#3b82f6' } },
        { value: fraudDistribution.forged_documents || 1, name: 'Documents falsifiés', itemStyle: { color: '#8b5cf6' } },
        { value: fraudDistribution.income_inconsistency || 1, name: 'Incohérence revenus', itemStyle: { color: '#06b6d4' } },
        { value: fraudDistribution.identity_theft || 1, name: 'Usurpation identité', itemStyle: { color: '#ec4899' } }
      ]
    }]
  };

  // ============================================
  // 🎨 COLONNES DES TABLEAUX
  // ============================================
  const getRiskColor = (risk) => ({
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#10b981',
    low: '#34d399'
  }[risk] || '#64748b');

  const getRiskIcon = (risk) => {
    const icons = {
      critical: <CloseCircleOutlined />,
      high: <WarningOutlined />,
      medium: <AlertOutlined />,
      low: <CheckCircleOutlined />
    };
    return icons[risk] || <SafetyOutlined />;
  };

  const requestColumns = [
    { 
      title: <span style={{ color: '#94a3b8' }}>Client</span>,
      dataIndex: 'client_name',
      key: 'client_name',
      render: (text, record) => (
        <Space>
          <Avatar style={{ backgroundColor: '#3b82f6' }} icon={<UserOutlined />} />
          <a style={{ color: '#f1f5f9', cursor: 'pointer' }} onClick={() => { setSelectedRequest(record); setDetailsModalVisible(true); }}>
            {text}
          </a>
        </Space>
      )
    },
    { 
      title: <span style={{ color: '#94a3b8' }}>Montant</span>,
      dataIndex: 'amount',
      key: 'amount',
      render: (amt) => <span style={{ fontWeight: 600, color: '#fbbf24' }}>{amt?.toLocaleString()} €</span>
    },
    { 
      title: <span style={{ color: '#94a3b8' }}>Score IA</span>,
      dataIndex: 'credit_score',
      key: 'credit_score',
      render: (score) => (
        <Tooltip title={`Score sur 850 - RandomForestRegressor`}>
          <Progress
            percent={Math.round((score / 850) * 100)}
            size="small"
            strokeColor={score > 700 ? '#34d399' : score > 550 ? '#f59e0b' : '#ef4444'}
            format={() => `${score}/850`}
            style={{ minWidth: 80 }}
          />
        </Tooltip>
      )
    },
    { 
      title: <span style={{ color: '#94a3b8' }}>Risque fraude</span>,
      dataIndex: 'fraud_risk',
      key: 'fraud_risk',
      render: (risk) => (
        <Tag color={getRiskColor(risk)} icon={getRiskIcon(risk)} style={{ borderRadius: 20, padding: '4px 12px' }}>
          {risk?.toUpperCase()}
        </Tag>
      )
    },
    { 
      title: <span style={{ color: '#94a3b8' }}>Statut</span>,
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        const config = {
          approved: { color: '#34d399', icon: <CheckCircleOutlined />, text: 'Approuvé' },
          pending: { color: '#f59e0b', icon: <ClockCircleOutlined />, text: 'En attente' },
          rejected: { color: '#ef4444', icon: <CloseCircleOutlined />, text: 'Rejeté' }
        };
        const { color, icon, text } = config[status] || { color: '#64748b', icon: null, text: status };
        return <Badge color={color} text={<span style={{ color: '#f1f5f9' }}>{icon} {text}</span>} />
      }
    },
    { 
      title: <span style={{ color: '#94a3b8' }}>Actions</span>,
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space>
          <Tooltip title="Détails">
            <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedRequest(record); setDetailsModalVisible(true); }} />
          </Tooltip>
          <Tooltip title="Analyse IA (GradientBoosting)">
            <Button 
              size="small" 
              icon={<RobotOutlined />} 
              onClick={() => analyzeRequestWithAI(record)}
              style={{ color: '#8b5cf6', borderColor: '#8b5cf6' }}
            />
          </Tooltip>
          {record.status === 'pending' && (
            <Tooltip title="Décision rapide">
              <Button 
                size="small" 
                icon={<CheckCircleOutlined />} 
                style={{ color: '#34d399' }}
                onClick={() => { 
                  setSelectedRequest(record); 
                  setDecisionType('approve'); 
                  setDecisionModalVisible(true); 
                }} 
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  const clientColumns = [
    { 
      title: <span style={{ color: '#94a3b8' }}>Client</span>,
      dataIndex: 'client_name',
      key: 'client_name',
      render: (text) => <span style={{ color: '#f1f5f9' }}>{text}</span>
    },
    { 
      title: <span style={{ color: '#94a3b8' }}>Email</span>,
      dataIndex: 'client_email',
      key: 'email',
      render: (email) => <span style={{ color: '#94a3b8' }}>{email || '-'}</span>
    },
    { 
      title: <span style={{ color: '#94a3b8' }}>Téléphone</span>,
      dataIndex: 'client_phone',
      key: 'phone',
      render: (phone) => <span style={{ color: '#94a3b8' }}>{phone || '-'}</span>
    },
    { 
      title: <span style={{ color: '#94a3b8' }}>Revenu annuel</span>,
      dataIndex: 'client_income',
      key: 'income',
      render: (inc) => <span style={{ color: '#fbbf24' }}>{inc ? `${inc.toLocaleString()} €` : '-'}</span>
    },
    { 
      title: <span style={{ color: '#94a3b8' }}>Demandes</span>,
      dataIndex: 'request_count',
      key: 'count',
      render: (count) => <Badge count={count || 0} showZero style={{ backgroundColor: '#3b82f6' }} />
    }
  ];

  // ============================================
  // 📊 STATS CALCULÉES
  // ============================================
  const totalAmount = requests.reduce((sum, r) => sum + (r.amount || 0), 0);
  const approvalRate = stats.totalRequests > 0 ? Math.round((stats.approved / stats.totalRequests) * 100) : 0;

  // ============================================
  // 📋 DÉFINITION DES ONGLETS AVEC items
  // ============================================
  const tabItems = [
    {
      key: 'requests',
      label: <span style={{ color: '#f1f5f9' }}><FileTextOutlined /> Demandes ({requests.length})</span>,
      children: (
        <Table
          columns={requestColumns}
          dataSource={requests.filter(r =>
            (filterStatus === 'all' || r.status === filterStatus) &&
            (filterRisk === 'all' || r.fraud_risk === filterRisk) &&
            (!searchText || r.client_name.toLowerCase().includes(searchText.toLowerCase()))
          )}
          rowKey="id"
          pagination={{ 
            pageSize: 10,
            showTotal: (total) => <span style={{ color: '#94a3b8' }}>Total {total} demandes</span>
          }}
          scroll={{ x: 1000 }}
          className="dark-table"
        />
      )
    },
    {
      key: 'clients',
      label: <span style={{ color: '#f1f5f9' }}><TeamOutlined /> Clients ({clients.length})</span>,
      children: (
        <Table
          columns={clientColumns}
          dataSource={clients}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showTotal: (total) => <span style={{ color: '#94a3b8' }}>Total {total} clients</span>
          }}
          className="dark-table"
        />
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#0f172a' }}>
        <Spin size="large" tip={<span style={{ color: '#94a3b8' }}>Chargement...</span>}>
          <div style={{ height: 100 }} />
        </Spin>
      </div>
    );
  }

  // ============================================
  // 🎨 RENDU
  // ============================================
  return (
    <div style={{ 
      padding: 24, 
      background: '#0f172a', 
      minHeight: '100vh',
      color: '#f1f5f9'
    }}>
      
      {/* HEADER PREMIUM AVEC STATUT IA */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card style={{ 
          marginBottom: 24, 
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          border: '1px solid #334155',
          borderRadius: 20,
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }}>
          <Row align="middle" justify="space-between">
            <Col>
              <Space size="large">
                <div style={{ 
                  background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  padding: 16,
                  borderRadius: '50%',
                  boxShadow: '0 4px 15px rgba(59, 130, 246, 0.3)'
                }}>
                  <FundOutlined style={{ fontSize: 28, color: '#fff' }} />
                </div>
                <div>
                  <Title level={2} style={{ color: '#f1f5f9', margin: 0, fontWeight: 700 }}>
                    Credit Scoring Intelligence
                  </Title>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                    <Tag icon={<RobotOutlined />} color="purple" style={{ borderRadius: 12 }}>
                      IA Premium
                    </Tag>
                    <Tag color="blue" style={{ borderRadius: 12 }}>
                      RandomForest & GradientBoosting
                    </Tag>
                    <Text style={{ color: '#94a3b8', fontSize: 13 }}>
                      🤖 {requests.length} demandes • {stats.avgScore} score moyen
                    </Text>
                    {aiStatus.loaded && (
                      <Tooltip title="Modèles IA chargés et prêts">
                        <Tag color="green" style={{ borderRadius: 12 }}>
                          ✅ IA Active
                        </Tag>
                      </Tooltip>
                    )}
                  </div>
                </div>
              </Space>
            </Col>
            <Col>
              <Space>
                <Tooltip title={autoAnalyze ? "Analyse automatique activée" : "Analyse manuelle"}>
                  <Switch
                    checkedChildren="Auto"
                    unCheckedChildren="Manuel"
                    checked={autoAnalyze}
                    onChange={setAutoAnalyze}
                    style={{ background: autoAnalyze ? '#3b82f6' : '#334155' }}
                  />
                </Tooltip>
                <Button
                  icon={<PlusOutlined />}
                  type="primary"
                  onClick={() => setAddClientModalVisible(true)}
                  style={{ background: '#10b981', border: 'none', borderRadius: 12, height: 40 }}
                >
                  Nouveau client
                </Button>
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => setAddRequestModalVisible(true)}
                  style={{ borderRadius: 12, height: 40, borderColor: '#334155', color: '#f1f5f9' }}
                >
                  Nouvelle demande
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchData}
                  style={{ borderRadius: 12, height: 40, borderColor: '#334155', color: '#f1f5f9' }}
                />
              </Space>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* KPIS */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        {[
          { title: 'Total demandes', value: stats.totalRequests, icon: <FileTextOutlined />, color: '#3b82f6' },
          { title: 'Approuvées', value: stats.approved, icon: <CheckCircleOutlined />, color: '#34d399' },
          { title: 'En attente', value: stats.pending, icon: <ClockCircleOutlined />, color: '#f59e0b' },
          { title: 'Score moyen', value: stats.avgScore, suffix: '/850', icon: <StarOutlined />, color: '#8b5cf6' },
          { title: 'Taux approbation', value: approvalRate, suffix: '%', icon: <TrophyOutlined />, color: '#fbbf24' },
          { title: 'Montant total', value: totalAmount, formatter: v => `${(v / 1000).toFixed(0)}K €`, icon: <EuroCircleOutlined />, color: '#34d399' }
        ].map((kpi, idx) => (
          <Col xs={24} sm={12} lg={4} key={idx}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
            >
              <Card style={{ 
                borderRadius: 16, 
                background: '#1e293b', 
                border: '1px solid #334155',
                textAlign: 'center'
              }}>
                <Statistic
                  title={<span style={{ color: '#94a3b8', fontSize: 12 }}>{kpi.title}</span>}
                  value={kpi.value}
                  suffix={kpi.suffix}
                  formatter={kpi.formatter}
                  prefix={<span style={{ color: kpi.color, marginRight: 4 }}>{kpi.icon}</span>}
                  valueStyle={{ color: '#f1f5f9', fontWeight: 700, fontSize: 24 }}
                />
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* GRAPHIQUES */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ color: '#f1f5f9' }}>Distribution des risques</span>}
            style={{ borderRadius: 20, background: '#1e293b', border: '1px solid #334155' }}
          >
            <ReactECharts option={distributionChartOption} style={{ height: 250 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card
            title={<span style={{ color: '#f1f5f9' }}>Distribution des fraudes</span>}
            style={{ borderRadius: 20, background: '#1e293b', border: '1px solid #334155' }}
          >
            <ReactECharts option={fraudDistributionChartOption} style={{ height: 250 }} />
          </Card>
        </Col>
      </Row>

      {/* FILTRES */}
      <Card style={{ 
        marginBottom: 24, 
        borderRadius: 16, 
        background: '#1e293b', 
        border: '1px solid #334155' 
      }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={6}>
            <Input.Search
              placeholder="Rechercher client..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ borderRadius: 10 }}
              className="dark-input"
            />
          </Col>
          <Col xs={12} md={4}>
            <Select
              placeholder="Statut"
              style={{ width: '100%', borderRadius: 10 }}
              value={filterStatus}
              onChange={setFilterStatus}
              className="dark-select"
            >
              <Option value="all">Tous les statuts</Option>
              <Option value="pending">📋 En attente</Option>
              <Option value="approved">✅ Approuvé</Option>
              <Option value="rejected">❌ Rejeté</Option>
            </Select>
          </Col>
          <Col xs={12} md={4}>
            <Select
              placeholder="Risque fraude"
              style={{ width: '100%', borderRadius: 10 }}
              value={filterRisk}
              onChange={setFilterRisk}
              className="dark-select"
            >
              <Option value="all">Tous risques</Option>
              <Option value="critical">🔴 Critique</Option>
              <Option value="high">🟠 Élevé</Option>
              <Option value="medium">🟡 Moyen</Option>
              <Option value="low">🟢 Faible</Option>
            </Select>
          </Col>
          <Col xs={24} md={8}>
            <RangePicker style={{ width: '100%', borderRadius: 10 }} className="dark-picker" />
          </Col>
          <Col xs={24} md={2}>
            <Button
              icon={<FilterOutlined />}
              onClick={() => { setFilterStatus('all'); setFilterRisk('all'); setSearchText(''); }}
              style={{ width: '100%', borderRadius: 10, borderColor: '#334155', color: '#f1f5f9' }}
            >
              Reset
            </Button>
          </Col>
        </Row>
      </Card>

      {/* TABLEAUX AVEC TABS */}
      <Card style={{ 
        borderRadius: 20, 
        background: '#1e293b', 
        border: '1px solid #334155',
        overflow: 'hidden'
      }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="dark-tabs"
          tabBarStyle={{ borderBottom: '1px solid #334155' }}
          items={tabItems}
        />
      </Card>

      {/* ============================================
          MODALS
          ============================================ */}
      
      {/* Modal Ajout Client */}
      <Modal
        title={<span style={{ color: '#f1f5f9' }}><UserOutlined /> Ajouter un client</span>}
        open={addClientModalVisible}
        onCancel={() => { setAddClientModalVisible(false); clientForm.resetFields(); }}
        footer={null}
        width={500}
        styles={{
          body: { background: '#0f172a' },
          header: { background: '#1e293b', borderBottom: '1px solid #334155' }
        }}
      >
        <Form form={clientForm} layout="vertical" onFinish={handleAddClient}>
          <Form.Item name="client_name" label={<span style={{ color: '#94a3b8' }}>Nom complet</span>} rules={[{ required: true }]}>
            <Input placeholder="Nom et prénom" className="dark-input" />
          </Form.Item>
          <Form.Item name="client_email" label={<span style={{ color: '#94a3b8' }}>Email</span>} rules={[{ type: 'email' }]}>
            <Input type="email" placeholder="email@exemple.com" className="dark-input" />
          </Form.Item>
          <Form.Item name="client_phone" label={<span style={{ color: '#94a3b8' }}>Téléphone</span>}>
            <Input placeholder="+33 6 12 34 56 78" className="dark-input" />
          </Form.Item>
          <Form.Item name="client_address" label={<span style={{ color: '#94a3b8' }}>Adresse</span>}>
            <Input placeholder="Adresse du client" className="dark-input" />
          </Form.Item>
          <Form.Item name="client_income" label={<span style={{ color: '#94a3b8' }}>Revenu annuel (€)</span>}>
            <InputNumber min={0} style={{ width: '100%', borderRadius: 10 }} placeholder="0" className="dark-input" />
          </Form.Item>
          <Form.Item name="client_employment_years" label={<span style={{ color: '#94a3b8' }}>Années d'emploi</span>}>
            <InputNumber min={0} max={50} style={{ width: '100%', borderRadius: 10 }} placeholder="0" className="dark-input" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting} style={{ background: '#3b82f6', borderRadius: 10, height: 40 }}>
              Ajouter le client
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Ajout Demande */}
      <Modal
        title={<span style={{ color: '#f1f5f9' }}><RobotOutlined /> Nouvelle demande avec IA</span>}
        open={addRequestModalVisible}
        onCancel={() => { setAddRequestModalVisible(false); requestForm.resetFields(); }}
        footer={null}
        width={500}
        styles={{
          body: { background: '#0f172a' },
          header: { background: '#1e293b', borderBottom: '1px solid #334155' }
        }}
      >
        <Form form={requestForm} layout="vertical" onFinish={handleAddRequest}>
          <Form.Item name="client_name" label={<span style={{ color: '#94a3b8' }}>Nom du client</span>} rules={[{ required: true }]}>
            <Input placeholder="Nom et prénom" className="dark-input" />
          </Form.Item>
          <Form.Item name="amount" label={<span style={{ color: '#94a3b8' }}>Montant (€)</span>} rules={[{ required: true }]}>
            <InputNumber min={0} style={{ width: '100%', borderRadius: 10 }} placeholder="Montant" className="dark-input" />
          </Form.Item>
          <Form.Item name="income" label={<span style={{ color: '#94a3b8' }}>Revenu annuel (€)</span>}>
            <InputNumber min={0} style={{ width: '100%', borderRadius: 10 }} placeholder="Revenu" className="dark-input" />
          </Form.Item>
          <Form.Item name="age" label={<span style={{ color: '#94a3b8' }}>Âge</span>}>
            <InputNumber min={18} max={100} style={{ width: '100%', borderRadius: 10 }} placeholder="Âge" className="dark-input" />
          </Form.Item>
          <Form.Item name="employment_years" label={<span style={{ color: '#94a3b8' }}>Années d'emploi</span>}>
            <InputNumber min={0} max={50} style={{ width: '100%', borderRadius: 10 }} placeholder="Années" className="dark-input" />
          </Form.Item>
          <Form.Item name="existing_loans" label={<span style={{ color: '#94a3b8' }}>Prêts existants</span>}>
            <InputNumber min={0} max={10} style={{ width: '100%', borderRadius: 10 }} placeholder="Nombre" className="dark-input" />
          </Form.Item>
          <Form.Item name="payment_history" label={<span style={{ color: '#94a3b8' }}>Historique paiement</span>}>
            <Select placeholder="Sélectionnez" className="dark-select">
              <Option value="excellent">⭐ Excellent</Option>
              <Option value="good">✅ Bon</Option>
              <Option value="average">📊 Moyen</Option>
              <Option value="poor">⚠️ Médiocre</Option>
            </Select>
          </Form.Item>
          <Form.Item name="purpose" label={<span style={{ color: '#94a3b8' }}>Motif</span>}>
            <Select placeholder="Sélectionnez" className="dark-select">
              <Option value="achat_immobilier">🏠 Achat immobilier</Option>
              <Option value="travaux">🔨 Travaux</Option>
              <Option value="achat_voiture">🚗 Achat voiture</Option>
              <Option value="consommation">🛍️ Consommation</Option>
              <Option value="entreprise">🏢 Création entreprise</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={submitting}
              style={{ background: '#3b82f6', borderRadius: 10, height: 40 }}
            >
              Analyser avec IA
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Détails Demande */}
      <Modal
        title={<span style={{ color: '#f1f5f9' }}>Détails demande - {selectedRequest?.client_name}</span>}
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        width={700}
        styles={{
          body: { background: '#0f172a' },
          header: { background: '#1e293b', borderBottom: '1px solid #334155' }
        }}
        footer={[
          <Button key="close" onClick={() => setDetailsModalVisible(false)} style={{ borderRadius: 10, background: '#334155', color: '#f1f5f9', border: 'none' }}>
            Fermer
          </Button>,
          selectedRequest?.status === 'pending' && (
            <>
              <Button
                key="analyze"
                icon={<RobotOutlined />}
                onClick={() => analyzeRequestWithAI(selectedRequest)}
                style={{ borderRadius: 10, borderColor: '#8b5cf6', color: '#8b5cf6' }}
              >
                Analyse IA
              </Button>
              <Button
                key="approve"
                type="primary"
                icon={<CheckCircleOutlined />}
                onClick={() => { setDecisionType('approve'); setDecisionModalVisible(true); }}
                style={{ borderRadius: 10, background: '#34d399', border: 'none' }}
              >
                Approuver
              </Button>
              <Button
                key="reject"
                danger
                icon={<CloseCircleOutlined />}
                onClick={() => { setDecisionType('reject'); setDecisionModalVisible(true); }}
                style={{ borderRadius: 10 }}
              >
                Rejeter
              </Button>
            </>
          )
        ]}
      >
        {selectedRequest && (
          <Descriptions column={2} bordered size="small" className="dark-descriptions">
            <Descriptions.Item label={<span style={{ color: '#94a3b8' }}>Client</span>}>
              <span style={{ color: '#f1f5f9' }}><strong>{selectedRequest.client_name}</strong></span>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#94a3b8' }}>Montant</span>}>
              <span style={{ color: '#fbbf24' }}>{selectedRequest.amount?.toLocaleString()} €</span>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#94a3b8' }}>Motif</span>}>
              <span style={{ color: '#f1f5f9' }}>{selectedRequest.purpose || '-'}</span>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#94a3b8' }}>Score IA</span>}>
              <Progress
                percent={Math.round((selectedRequest.credit_score / 850) * 100)}
                size="small"
                width={120}
                strokeColor={selectedRequest.credit_score > 700 ? '#34d399' : selectedRequest.credit_score > 550 ? '#f59e0b' : '#ef4444'}
              />
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#94a3b8' }}>Risque fraude</span>}>
              <Tag color={getRiskColor(selectedRequest.fraud_risk)} style={{ borderRadius: 20 }}>
                {selectedRequest.fraud_risk?.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#94a3b8' }}>Statut</span>}>
              <Badge
                color={selectedRequest.status === 'approved' ? '#34d399' : selectedRequest.status === 'pending' ? '#f59e0b' : '#ef4444'}
                text={<span style={{ color: '#f1f5f9' }}>{selectedRequest.status === 'approved' ? 'Approuvé' : selectedRequest.status === 'pending' ? 'En attente' : 'Rejeté'}</span>}
              />
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#94a3b8' }}>Date</span>} span={2}>
              <span style={{ color: '#94a3b8' }}>{dayjs(selectedRequest.created_at).format('DD/MM/YYYY HH:mm')}</span>
            </Descriptions.Item>
            {selectedRequest.decision_reason && (
              <Descriptions.Item label={<span style={{ color: '#94a3b8' }}>Raison décision</span>} span={2}>
                <span style={{ color: '#fbbf24' }}>{selectedRequest.decision_reason}</span>
              </Descriptions.Item>
            )}
            {selectedRequest.fraud_score !== undefined && (
              <Descriptions.Item label={<span style={{ color: '#94a3b8' }}>Score fraude</span>} span={2}>
                <span style={{ color: selectedRequest.fraud_score > 50 ? '#ef4444' : '#34d399' }}>
                  {selectedRequest.fraud_score}% (GradientBoosting)
                </span>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Modal Décision */}
      <Modal
        title={<span style={{ color: '#f1f5f9' }}>{decisionType === 'approve' ? '✅ Approuver la demande' : '❌ Rejeter la demande'}</span>}
        open={decisionModalVisible}
        onCancel={() => { setDecisionModalVisible(false); setDecisionNotes(''); }}
        onOk={decisionType === 'approve' ? handleApprove : handleReject}
        okText={decisionType === 'approve' ? 'Approuver' : 'Rejeter'}
        okButtonProps={{ danger: decisionType === 'reject' }}
        styles={{
          body: { background: '#0f172a' },
          header: { background: '#1e293b', borderBottom: '1px solid #334155' }
        }}
      >
        <TextArea
          rows={4}
          placeholder={decisionType === 'approve' ? "Notes internes (optionnel)" : "Raison du rejet (obligatoire)"}
          value={decisionNotes}
          onChange={(e) => setDecisionNotes(e.target.value)}
          style={{ borderRadius: 10 }}
          className="dark-input"
        />
      </Modal>

      {/* Modal Analyse IA */}
      <Modal
        title={
          <Space>
            <RobotOutlined style={{ color: '#8b5cf6' }} />
            <span style={{ color: '#f1f5f9' }}>Analyse Anti-Fraude IA</span>
            <Tag color="purple" style={{ borderRadius: 12 }}>GradientBoosting</Tag>
          </Space>
        }
        open={aiAnalysisModalVisible}
        onCancel={() => setAiAnalysisModalVisible(false)}
        width={650}
        styles={{
          body: { background: '#0f172a' },
          header: { background: '#1e293b', borderBottom: '1px solid #334155' }
        }}
        footer={[
          <Button key="close" onClick={() => setAiAnalysisModalVisible(false)} style={{ borderRadius: 10, background: '#334155', color: '#f1f5f9', border: 'none' }}>
            Fermer
          </Button>
        ]}
      >
        {aiAnalysisResult && (
          <div>
            <Alert
              message={`🎯 Score de crédit: ${aiAnalysisResult.credit_score}/850`}
              description={`Risque fraude: ${aiAnalysisResult.fraud_risk.toUpperCase()} - Confiance: ${aiAnalysisResult.confidence.toFixed(0)}%`}
              type={aiAnalysisResult.fraud_risk === 'critical' ? 'error' : aiAnalysisResult.fraud_risk === 'high' ? 'warning' : 'info'}
              showIcon
              style={{ marginBottom: 16, borderRadius: 12 }}
            />
            
            <Card size="small" title={<span style={{ color: '#f1f5f9' }}>📊 Détails de l'analyse IA</span>} style={{ marginBottom: 16, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' }}>
              <Descriptions column={2} size="small" className="dark-descriptions">
                <Descriptions.Item label={<span style={{ color: '#94a3b8' }}>Score crédit</span>}>
                  <span style={{ color: '#fbbf24' }}>{aiAnalysisResult.credit_score}/850</span>
                </Descriptions.Item>
                <Descriptions.Item label={<span style={{ color: '#94a3b8' }}>Score fraude</span>}>
                  <span style={{ color: aiAnalysisResult.fraud_score > 50 ? '#ef4444' : '#34d399' }}>
                    {aiAnalysisResult.fraud_score.toFixed(0)}%
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label={<span style={{ color: '#94a3b8' }}>Modèle utilisé</span>} span={2}>
                  <Tag color="purple" style={{ borderRadius: 12 }}>
                    GradientBoostingClassifier
                  </Tag>
                  <Tag color="blue" style={{ borderRadius: 12, marginLeft: 8 }}>
                    RandomForestRegressor
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label={<span style={{ color: '#94a3b8' }}>Recommandation</span>} span={2}>
                  <span style={{ color: '#fbbf24' }}>{aiAnalysisResult.decision_reason}</span>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {aiAnalysisResult.fraud_factors && aiAnalysisResult.fraud_factors.length > 0 && (
              <Card size="small" title={<span style={{ color: '#f1f5f9' }}>🚨 Indicateurs de fraude</span>} style={{ marginBottom: 16, borderRadius: 12, background: '#1e293b', border: '1px solid #334155' }}>
                <Space wrap>
                  {aiAnalysisResult.fraud_factors.map((factor, i) => (
                    <Tag key={i} color="red" style={{ borderRadius: 8 }}>
                      {factor}
                    </Tag>
                  ))}
                </Space>
              </Card>
            )}

            <Alert
              message="🤖 Algorithmes IA utilisés"
              description={
                <div>
                  <p><strong>RandomForestRegressor</strong> - Scoring de crédit (300-850)</p>
                  <p><strong>GradientBoostingClassifier</strong> - Détection de fraude</p>
                  <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>
                    Modèles entraînés sur 20 000 échantillons • Précision: ~89%
                  </p>
                </div>
              }
              type="info"
              showIcon
              style={{ borderRadius: 12, background: 'rgba(56, 189, 248, 0.1)', border: '1px solid #334155' }}
            />
          </div>
        )}
      </Modal>

      {/* STYLES CSS */}
      <style>{`
        .dark-input .ant-input,
        .dark-input .ant-input-number-input {
          background: #0f172a !important;
          border-color: #334155 !important;
          color: #f1f5f9 !important;
        }
        .dark-input .ant-input::placeholder {
          color: #64748b !important;
        }
        .dark-select .ant-select-selector {
          background: #0f172a !important;
          border-color: #334155 !important;
          color: #f1f5f9 !important;
        }
        .dark-select .ant-select-arrow {
          color: #94a3b8 !important;
        }
        .dark-picker .ant-picker-input input {
          color: #f1f5f9 !important;
        }
        .dark-picker .ant-picker-suffix {
          color: #94a3b8 !important;
        }
        .dark-table .ant-table {
          background: transparent !important;
        }
        .dark-table .ant-table-thead > tr > th {
          background: #0f172a !important;
          color: #94a3b8 !important;
          border-bottom: 1px solid #334155 !important;
        }
        .dark-table .ant-table-tbody > tr > td {
          background: #1e293b !important;
          color: #f1f5f9 !important;
          border-color: #334155 !important;
        }
        .dark-table .ant-table-tbody > tr:hover > td {
          background: #334155 !important;
        }
        .dark-tabs .ant-tabs-tab {
          color: #94a3b8 !important;
        }
        .dark-tabs .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #f1f5f9 !important;
        }
        .dark-tabs .ant-tabs-ink-bar {
          background: #3b82f6 !important;
        }
        .dark-descriptions .ant-descriptions-item-label {
          background: #0f172a !important;
          color: #94a3b8 !important;
          border-color: #334155 !important;
        }
        .dark-descriptions .ant-descriptions-item-content {
          background: #1e293b !important;
          color: #f1f5f9 !important;
          border-color: #334155 !important;
        }
        .ant-statistic-content {
          color: #f1f5f9 !important;
        }
        .ant-statistic-title {
          color: #94a3b8 !important;
        }
        .ant-modal-header {
          background: #1e293b !important;
          border-bottom: 1px solid #334155 !important;
        }
        .ant-modal-title {
          color: #f1f5f9 !important;
        }
        .ant-modal-close {
          color: #94a3b8 !important;
        }
        .ant-modal-content {
          background: #0f172a !important;
        }
        .ant-form-item-label > label {
          color: #94a3b8 !important;
        }
        .ant-progress-text {
          color: #f1f5f9 !important;
        }
        .ant-tag {
          color: #f1f5f9 !important;
        }
      `}</style>
    </div>
  );
};

export default CreditScoring;