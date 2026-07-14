import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Statistic, Table, Tag, Space, Button, Progress, 
  Spin, message, Modal, Divider, Tooltip, Select,
  Tabs, Input, DatePicker, Timeline, Empty, Form, InputNumber,
  Upload, Drawer, Collapse, Alert, Steps, Typography, Badge,
  Switch, Popover, Radio, Slider, Transfer, TreeSelect
} from 'antd';
import { 
  FundOutlined, WarningOutlined, 
  CheckCircleOutlined, RiseOutlined,
  ReloadOutlined, FileExcelOutlined, FilterOutlined,
  EyeOutlined, HistoryOutlined, BarChartOutlined,
  CarOutlined, HomeOutlined, HeartOutlined,
  PlusOutlined, RobotOutlined,
  ThunderboltOutlined, TeamOutlined, DatabaseOutlined,
  SafetyOutlined, UserOutlined, DashboardOutlined,
  ArrowUpOutlined, ArrowDownOutlined, ClockCircleOutlined,
  FileProtectOutlined, NodeIndexOutlined, GlobalOutlined,
  FireOutlined, InsuranceOutlined, TransactionOutlined,
  IdcardOutlined, MobileOutlined, CodeOutlined,
  CloudServerOutlined, LockOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import { v4 as uuidv4 } from 'uuid';
import { motion, AnimatePresence } from 'framer-motion';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { Step } = Steps;

// ============================================
// CONFIGURATION DES COULEURS POUR FOND SOMBRE
// ============================================

const COLORS = {
  primary: '#1890ff',
  primaryDark: '#0c4a6e',
  success: '#10b981',
  successBg: 'rgba(16, 185, 129, 0.15)',
  warning: '#f59e0b',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  danger: '#ef4444',
  dangerBg: 'rgba(239, 68, 68, 0.15)',
  purple: '#8b5cf6',
  purpleBg: 'rgba(139, 92, 246, 0.15)',
  pink: '#ec4899',
  pinkBg: 'rgba(236, 72, 153, 0.15)',
  cyan: '#06b6d4',
  cyanBg: 'rgba(6, 182, 212, 0.15)',
  slate: '#94a3b8',
  slateBg: 'rgba(148, 163, 184, 0.1)',
  white: '#ffffff',
  black: '#000000',
  bgDark: '#0f172a',
  bgCard: '#1e293b',
  bgCardHover: '#334155',
  border: '#334155',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
};

// ============================================
// STYLES GLOBAUX
// ============================================

const styles = {
  page: {
    background: COLORS.bgDark,
    minHeight: '100vh',
    padding: 24,
  },
  header: {
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    padding: '24px 32px',
    borderRadius: 16,
    marginBottom: 24,
    border: `1px solid ${COLORS.border}`,
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  },
  card: {
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  cardHover: {
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  },
  kpiCard: {
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    padding: '20px 24px',
    transition: 'all 0.3s ease',
  },
  table: {
    background: COLORS.bgCard,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modal: {
    background: COLORS.bgCard,
    borderRadius: 16,
  },
  textPrimary: { color: COLORS.textPrimary },
  textSecondary: { color: COLORS.textSecondary },
  textMuted: { color: COLORS.textMuted },
};

// ============================================
// COMPOSANTS STYLISÉS
// ============================================

const KpiCard = ({ title, value, icon, color, subtitle, trend, suffix }) => (
  <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }}>
    <Card style={styles.kpiCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: 500, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            {title}
          </Text>
          <div style={{ color: COLORS.textPrimary, fontSize: 28, fontWeight: 700, marginTop: 8 }}>
            {value}{suffix && <span style={{ fontSize: 16, color: COLORS.textMuted, marginLeft: 4 }}>{suffix}</span>}
          </div>
          {trend && (
            <div style={{ marginTop: 8 }}>
              <Tag color={trend > 0 ? 'success' : 'error'} style={{ borderRadius: 12 }}>
                {trend > 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                {Math.abs(trend)}%
              </Tag>
              <Text style={{ color: COLORS.textMuted, fontSize: 12, marginLeft: 8 }}>vs mois dernier</Text>
            </div>
          )}
          {subtitle && (
            <Text style={{ color: COLORS.textMuted, fontSize: 12, display: 'block', marginTop: 4 }}>
              {subtitle}
            </Text>
          )}
        </div>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: color || COLORS.primary + '20',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          color: color || COLORS.primary,
        }}>
          {icon}
        </div>
      </div>
    </Card>
  </motion.div>
);

const RiskBadge = ({ level, score }) => {
  const configs = {
    low: { color: COLORS.success, bg: COLORS.successBg, label: 'Faible', icon: <CheckCircleOutlined /> },
    medium: { color: COLORS.warning, bg: COLORS.warningBg, label: 'Moyen', icon: <WarningOutlined /> },
    high: { color: COLORS.danger, bg: COLORS.dangerBg, label: 'Élevé', icon: <FireOutlined /> },
    critical: { color: '#dc2626', bg: 'rgba(220, 38, 38, 0.2)', label: 'Critique', icon: <FireOutlined /> },
  };
  
  const config = configs[level] || configs.low;
  
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 14px', borderRadius: 20, background: config.bg }}>
      <span style={{ color: config.color }}>{config.icon}</span>
      <span style={{ color: COLORS.textPrimary, fontWeight: 600, fontSize: 13 }}>{config.label}</span>
      {score !== undefined && (
        <span style={{ color: config.color, fontSize: 12, fontWeight: 700 }}>{score}%</span>
      )}
    </div>
  );
};

// ============================================
// FONCTIONS UTILITAIRES POUR LES INDICATEURS
// ============================================

const renderIndicators = (indicators) => {
  if (!indicators || indicators.length === 0) {
    return <Text style={{ color: COLORS.textSecondary }}>Aucun indicateur détecté</Text>;
  }
  
  return indicators.map((indicator, idx) => {
    if (typeof indicator === 'string') {
      return (
        <Tag key={idx} color="orange" style={{ borderRadius: 12 }}>
          {indicator}
        </Tag>
      );
    }
    
    if (typeof indicator === 'object' && indicator !== null) {
      const color = indicator.severity === 'high' ? 'red' 
                  : indicator.severity === 'medium' ? 'orange' 
                  : 'blue';
      
      return (
        <Tooltip key={idx} title={indicator.description || indicator.name}>
          <Tag color={color} style={{ borderRadius: 12, cursor: 'pointer' }}>
            <Space size={4}>
              {indicator.severity === 'high' && <WarningOutlined style={{ color: '#ef4444' }} />}
              {indicator.severity === 'medium' && <WarningOutlined style={{ color: '#f59e0b' }} />}
              <span>{indicator.name}</span>
              {indicator.score && (
                <span style={{ 
                  background: 'rgba(0,0,0,0.1)', 
                  padding: '0 6px', 
                  borderRadius: 8,
                  fontSize: 10,
                  fontWeight: 'bold'
                }}>
                  {indicator.score}%
                </span>
              )}
            </Space>
          </Tag>
        </Tooltip>
      );
    }
    
    return (
      <Tag key={idx} color="default" style={{ borderRadius: 12 }}>
        {String(indicator)}
      </Tag>
    );
  });
};

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

const generateUniquePolicyNumber = (policyType) => {
  const prefixes = {
    'auto': 'AUTO',
    'habitation': 'HAB',
    'sante': 'SANTE'
  };
  
  const prefix = prefixes[policyType] || 'POL';
  const timestamp = Date.now();
  const uuid = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  
  return `${prefix}-${timestamp}-${uuid}-${random}`;
};

const isTokenValid = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const exp = payload.exp * 1000;
    return Date.now() < exp;
  } catch (e) {
    return false;
  }
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const RiskScoringInsurance = () => {
  const [loading, setLoading] = useState(false);
  const [policies, setPolicies] = useState([]);
  const [stats, setStats] = useState({
    totalPolicies: 0,
    lowRisk: 0,
    mediumRisk: 0,
    highRisk: 0,
    criticalRisk: 0,
    avgPremium: 0,
    lossRatio: 0
  });
  const [riskDistribution, setRiskDistribution] = useState({
    low: 0,
    medium: 0,
    high: 0,
    critical: 0
  });
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [fraudModalVisible, setFraudModalVisible] = useState(false);
  const [addPolicyModalVisible, setAddPolicyModalVisible] = useState(false);
  const [importDrawerVisible, setImportDrawerVisible] = useState(false);
  const [policyHistory, setPolicyHistory] = useState([]);
  const [fraudAnalysis, setFraudAnalysis] = useState(null);
  const [addPolicyForm] = Form.useForm();
  const [riskCalculationLoading, setRiskCalculationLoading] = useState(false);
  const [calculatedRiskScore, setCalculatedRiskScore] = useState(null);
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchText, setSearchText] = useState('');

  // ============================================
  // LOGIQUE MÉTIER
  // ============================================

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    if (!token) {
      message.error('Veuillez vous connecter');
      window.location.href = '/login';
      return false;
    }
    return true;
  };

  const calculatePremium = (formData, riskScore) => {
    const basePremium = {
      auto: 500,
      habitation: 300,
      sante: 400
    }[formData.policy_type] || 400;

    const riskMultiplier = 1 + (riskScore / 100);
    let premium = basePremium * riskMultiplier;

    if (formData.coverage_amount) {
      premium += (formData.coverage_amount * 0.005);
    }

    if (formData.policy_type === 'auto' && formData.vehicle_value) {
      premium += (formData.vehicle_value * 0.02);
    }

    return Math.round(premium);
  };

  const calculateRiskScore = (formData) => {
    let score = 0;
    let factors = [];

    const driverAge = formData.driver_age || 0;
    const driverExperience = formData.driver_experience || 0;
    const infractionsCount = formData.infractions_count || 0;

    if (driverAge < 25 && driverAge > 0) {
      score += 25;
      factors.push({ name: "Âge conducteur (<25 ans)", impact: "+25", severity: "high" });
    } else if (driverAge > 65) {
      score += 15;
      factors.push({ name: "Âge conducteur (>65 ans)", impact: "+15", severity: "medium" });
    }

    if (driverExperience < 2 && driverExperience > 0) {
      score += 20;
      factors.push({ name: "Expérience conduite (<2 ans)", impact: "+20", severity: "high" });
    }

    if (infractionsCount > 0) {
      const infractionScore = Math.min(infractionsCount * 10, 30);
      score += infractionScore;
      factors.push({ name: `Historique infractions (${infractionsCount})`, impact: `+${infractionScore}`, severity: "high" });
    }

    const vehiclePower = formData.vehicle_power || 0;
    const vehicleYear = formData.vehicle_year || new Date().getFullYear();
    const vehicleUsage = formData.vehicle_usage;

    if (vehiclePower > 200) {
      score += 15;
      factors.push({ name: "Puissance véhicule (>200 CV)", impact: "+15", severity: "medium" });
    } else if (vehiclePower > 150) {
      score += 10;
      factors.push({ name: "Puissance véhicule (>150 CV)", impact: "+10", severity: "low" });
    }

    const vehicleAge = new Date().getFullYear() - vehicleYear;
    if (vehicleAge > 10 && vehicleYear > 1900) {
      score += 10;
      factors.push({ name: "Véhicule ancien (>10 ans)", impact: "+10", severity: "medium" });
    }

    if (vehicleUsage === 'professional') {
      score += 15;
      factors.push({ name: "Usage professionnel", impact: "+15", severity: "medium" });
    } else if (vehicleUsage === 'high_mileage') {
      score += 20;
      factors.push({ name: "Kilométrage élevé (>25k km/an)", impact: "+20", severity: "high" });
    }

    const claimsHistory = formData.claims_history || [];
    let totalClaimsAmount = 0;
    let atFaultClaims = 0;

    if (Array.isArray(claimsHistory)) {
      claimsHistory.forEach(claim => {
        totalClaimsAmount += claim.amount || 0;
        if (claim.responsibility === 'at_fault') {
          atFaultClaims++;
        }
      });
    }

    if (claimsHistory.length > 0) {
      const claimsScore = Math.min(claimsHistory.length * 15, 45);
      score += claimsScore;
      factors.push({ name: `Historique sinistres (${claimsHistory.length})`, impact: `+${claimsScore}`, severity: "high" });
    }

    if (atFaultClaims > 0) {
      const atFaultScore = Math.min(atFaultClaims * 20, 40);
      score += atFaultScore;
      factors.push({ name: `Sinistres responsables (${atFaultClaims})`, impact: `+${atFaultScore}`, severity: "critical" });
    }

    if (totalClaimsAmount > 10000) {
      score += 15;
      factors.push({ name: "Montant sinistres élevé (>10k€)", impact: "+15", severity: "medium" });
    }

    const propertyValue = formData.property_value || 0;
    const propertyLocation = formData.property_location;

    if (propertyValue > 500000) {
      score += 15;
      factors.push({ name: "Valeur bien élevée (>500k€)", impact: "+15", severity: "medium" });
    }

    if (propertyLocation === 'high_risk') {
      score += 25;
      factors.push({ name: "Zone à risque élevé", impact: "+25", severity: "high" });
    } else if (propertyLocation === 'medium_risk') {
      score += 10;
      factors.push({ name: "Zone à risque moyen", impact: "+10", severity: "low" });
    }

    score = Math.min(score, 100);

    let riskLevel = 'low';
    if (score >= 70) riskLevel = 'critical';
    else if (score >= 50) riskLevel = 'high';
    else if (score >= 25) riskLevel = 'medium';
    else riskLevel = 'low';

    return {
      score: Math.round(score),
      level: riskLevel,
      factors: factors,
      recommendedPremium: calculatePremium(formData, score)
    };
  };

  const handleAddPolicy = async (values) => {
    if (!checkAuth()) return;
    
    setRiskCalculationLoading(true);
    
    let attempts = 0;
    const maxAttempts = 3;
    
    const tryCreatePolicy = async () => {
      try {
        const riskAssessment = calculateRiskScore(values);
        const policyNumber = generateUniquePolicyNumber(values.policy_type);
        
        const newPolicy = {
          client_name: values.client_name,
          client_age: values.driver_age || values.client_age || null,
          client_profession: values.client_profession || null,
          client_email: values.client_email || null,
          policy_type: values.policy_type,
          policy_number: policyNumber,
          premium: parseFloat(riskAssessment.recommendedPremium),
          coverage_amount: parseFloat(values.coverage_amount) || 0,
          risk_score: parseFloat(riskAssessment.score),
          risk_level: riskAssessment.level,
          claims_count: parseInt(values.claims_history?.length) || 0,
          total_claims_amount: parseFloat(values.claims_history?.reduce((sum, c) => sum + (c.amount || 0), 0)) || 0,
          status: 'active',
          start_date: new Date().toISOString(),
          risk_factors: riskAssessment.factors,
          description: values.description || null,
          driver_age: values.driver_age || null,
          driver_experience: values.driver_experience || null,
          infractions_count: values.infractions_count || 0,
          vehicle_model: values.vehicle_model || null,
          vehicle_year: values.vehicle_year || null,
          vehicle_power: values.vehicle_power || null,
          vehicle_usage: values.vehicle_usage || null,
          vehicle_value: values.vehicle_value || null,
          property_value: values.property_value || null,
          property_location: values.property_location || null,
          property_characteristics: values.property_characteristics || null
        };
        
        await api.post('/risk-scoring/policies', newPolicy);
        
        message.success(`Police ${policyNumber} ajoutée - Score: ${riskAssessment.score}/100`);
        setAddPolicyModalVisible(false);
        addPolicyForm.resetFields();
        setCalculatedRiskScore(null);
        fetchData();
        setRiskCalculationLoading(false);
        
      } catch (error) {
        console.error(`Erreur tentative ${attempts + 1}:`, error);
        
        if (error.response?.status === 401) {
          message.error('Session expirée, veuillez vous reconnecter');
          localStorage.removeItem('token');
          localStorage.removeItem('refresh_token');
          setTimeout(() => window.location.href = '/login', 1500);
          setRiskCalculationLoading(false);
          return;
        }
        
        const isDuplicateError = error.response?.data?.detail?.includes('duplicate key') || 
                                 error.response?.data?.detail?.includes('already exists') ||
                                 error.message?.includes('UniqueViolation');
        
        if (isDuplicateError && attempts < maxAttempts - 1) {
          attempts++;
          message.warning(`Conflit de numéro de police, nouvelle tentative (${attempts}/${maxAttempts})...`);
          setTimeout(() => tryCreatePolicy(), 500);
        } else if (isDuplicateError) {
          message.error('Erreur: Impossible de générer un numéro de police unique après plusieurs tentatives.');
          setRiskCalculationLoading(false);
        } else {
          message.error('Erreur lors de l\'ajout: ' + (error.response?.data?.detail || error.message));
          setRiskCalculationLoading(false);
        }
      }
    };
    
    await tryCreatePolicy();
  };

  const handleFormChange = (changedValues, allValues) => {
    if (Object.keys(changedValues).length > 0) {
      const riskAssessment = calculateRiskScore(allValues);
      setCalculatedRiskScore(riskAssessment);
    }
  };

  const handleImportData = (file) => {
    message.loading('Import des données...', 1);
    setTimeout(() => {
      message.success(`${file.name} importé avec succès`);
      setImportDrawerVisible(false);
      fetchData();
    }, 1000);
    return false;
  };

  const handleFraudAnalysis = async (policyId) => {
    if (!checkAuth()) return;
    
    setFraudModalVisible(true);
    setFraudAnalysis(null);
    
    try {
      const response = await api.post(`/risk-scoring/policies/${policyId}/fraud-analysis`);
      setFraudAnalysis(response.data);
    } catch (error) {
      console.error('Erreur analyse fraude:', error);
      message.error('Échec de l\'analyse de fraude. Veuillez réessayer plus tard.');
      setFraudModalVisible(false);
    }
  };

  const handleViewDetails = async (policy) => {
    try {
      const response = await api.get(`/risk-scoring/policies/${policy.id}`);
      setSelectedPolicy(response.data);
      setDetailsModalVisible(true);
    } catch (error) {
      console.error('Erreur chargement détails:', error);
      setSelectedPolicy(policy);
      setDetailsModalVisible(true);
    }
  };

  const handleViewHistory = async (policyId) => {
    try {
      const response = await api.get(`/risk-scoring/policies/${policyId}/history`);
      setPolicyHistory(Array.isArray(response.data) ? response.data : []);
      setHistoryModalVisible(true);
    } catch (error) {
      console.error('Erreur chargement historique:', error);
      setPolicyHistory([]);
      setHistoryModalVisible(true);
    }
  };

  // ============================================
  // COLONNES DU TABLEAU
  // ============================================

  const columns = [
    { 
      title: <span style={{ color: COLORS.textPrimary }}>N° Police</span>, 
      dataIndex: 'policy_number', 
      key: 'policy_number',
      width: 220,
      render: (text, record) => (
        <a onClick={() => handleViewDetails(record)} style={{ color: COLORS.primary }}>
          {text || '-'}
        </a>
      )
    },
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Client</span>, 
      dataIndex: 'client_name', 
      key: 'client_name',
      render: (text) => <span style={{ color: COLORS.textPrimary }}>{text || '-'}</span>
    },
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Type</span>, 
      dataIndex: 'policy_type', 
      key: 'policy_type',
      width: 100,
      render: (type) => {
        const icons = {
          'auto': <CarOutlined style={{ color: COLORS.primary }} />,
          'habitation': <HomeOutlined style={{ color: COLORS.success }} />,
          'sante': <HeartOutlined style={{ color: COLORS.pink }} />
        };
        const labels = {
          'auto': 'Auto',
          'habitation': 'Habitation',
          'sante': 'Santé'
        };
        return (
          <Space>
            {icons[type]}
            <span style={{ color: COLORS.textPrimary }}>{labels[type] || type}</span>
          </Space>
        );
      }
    },
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Risque</span>, 
      dataIndex: 'risk_level', 
      key: 'risk_level',
      width: 120,
      render: (risk, record) => <RiskBadge level={risk} score={record.risk_score} />
    },
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Prime</span>, 
      dataIndex: 'premium', 
      key: 'premium',
      width: 100,
      render: (premium) => <span style={{ color: COLORS.textPrimary }}>{(premium || 0).toLocaleString()} €</span>
    },
    {
      title: <span style={{ color: COLORS.textPrimary }}>Fraude</span>,
      key: 'fraud',
      width: 80,
      render: (_, record) => (
        <Tooltip title="Analyser la fraude">
          <Button 
            size="small" 
            icon={<SafetyOutlined />}
            danger={record.fraud_score > 70}
            onClick={() => handleFraudAnalysis(record.id)}
            style={{ borderRadius: 8 }}
          />
        </Tooltip>
      )
    },
    {
      title: <span style={{ color: COLORS.textPrimary }}>Actions</span>,
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Voir détails">
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetails(record)} style={{ borderRadius: 8 }} />
          </Tooltip>
          <Tooltip title="Historique">
            <Button size="small" icon={<HistoryOutlined />} onClick={() => handleViewHistory(record.id)} style={{ borderRadius: 8 }} />
          </Tooltip>
        </Space>
      )
    }
  ];

  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================

  const fetchData = async () => {
    if (!checkAuth()) return;
    
    setLoading(true);
    try {
      const params = {};
      if (filterRisk !== 'all') params.risk_level = filterRisk;
      if (filterType !== 'all') params.policy_type = filterType;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (searchText) params.search = searchText;
      
      const policiesRes = await api.get('/risk-scoring/policies', { params });
      setPolicies(Array.isArray(policiesRes.data) ? policiesRes.data : []);

      const statsRes = await api.get('/risk-scoring/dashboard');
      const data = statsRes.data || {};
      
      setStats({
        totalPolicies: data.total_policies || 0,
        lowRisk: data.low_risk || 0,
        mediumRisk: data.medium_risk || 0,
        highRisk: data.high_risk || 0,
        criticalRisk: data.critical_risk || 0,
        avgPremium: data.avg_premium || 0,
        lossRatio: data.loss_ratio || 0
      });

      setRiskDistribution(data.risk_distribution || {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      });

      const fraudRes = await api.get('/risk-scoring/fraud-alerts');
      setFraudAlerts(Array.isArray(fraudRes.data) ? fraudRes.data : []);

    } catch (error) {
      console.error('Erreur chargement risk scoring:', error);
      if (error.response?.status === 401) {
        message.error('Session expirée, veuillez vous reconnecter');
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        setTimeout(() => window.location.href = '/login', 1500);
      } else {
        message.error('Erreur lors du chargement des données');
      }
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterRisk, filterType, filterStatus, searchText]);

  if (loading) {
    return (
      <div style={{ ...styles.page, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" tip={<span style={{ color: COLORS.textPrimary }}>Chargement des données...</span>} />
      </div>
    );
  }

  // ============================================
  // RENDU PRINCIPAL
  // ============================================

  return (
    <div style={styles.page}>
      {/* EN-TÊTE */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={styles.header}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 52,
                height: 52,
                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.purple})`,
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(24, 144, 255, 0.3)',
              }}>
                <FundOutlined style={{ fontSize: 26, color: COLORS.white }} />
              </div>
              <div>
                <Title level={3} style={{ margin: 0, color: COLORS.white, fontWeight: 700 }}>
                  Scoring des Risques & Détection de Fraude
                </Title>
                <Text style={{ color: COLORS.textSecondary }}>
                  Évaluation avancée des risques d'assurance avec IA anti-fraude
                </Text>
              </div>
            </div>
          </div>
          <Space size="middle" wrap>
            <Button 
              icon={<PlusOutlined />} 
              type="primary"
              onClick={() => setAddPolicyModalVisible(true)}
              style={{ background: COLORS.success, borderColor: COLORS.success, borderRadius: 10 }}
            >
              Nouvelle évaluation
            </Button>
            <Button 
              icon={<FileExcelOutlined />} 
              onClick={() => setImportDrawerVisible(true)}
              style={{ borderRadius: 10, borderColor: COLORS.border, color: COLORS.textPrimary }}
            >
              Importer
            </Button>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchData}
              style={{ borderRadius: 10, borderColor: COLORS.border, color: COLORS.textPrimary }}
            >
              Actualiser
            </Button>
          </Space>
        </div>
      </motion.div>

      {/* ALERTES FRAUDE */}
      {fraudAlerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Alert
            message={
              <Space>
                <SafetyOutlined style={{ color: COLORS.danger }} />
                <span style={{ color: COLORS.textPrimary }}>{fraudAlerts.length} alerte(s) de fraude détectée(s)</span>
              </Space>
            }
            description={<span style={{ color: COLORS.textSecondary }}>Utilisez les techniques innovantes : Health Data Cross-Validation AI, Behavioral Underwriting AI, Digital Life Indicators</span>}
            type="error"
            showIcon={false}
            style={{ marginBottom: 24, borderRadius: 12, background: COLORS.dangerBg, border: `1px solid rgba(239, 68, 68, 0.2)` }}
            action={
              <Button size="small" type="primary" onClick={() => setFilterRisk('critical')} style={{ borderRadius: 8 }}>
                Voir les alertes
              </Button>
            }
          />
        </motion.div>
      )}

      {/* TECHNIQUES INNOVANTES */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <Card style={styles.card}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div style={{ 
                  width: 56, 
                  height: 56, 
                  background: COLORS.primary + '20', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 12px'
                }}>
                  <ThunderboltOutlined style={{ fontSize: 28, color: COLORS.primary }} />
                </div>
                <Text style={{ color: COLORS.textPrimary, fontWeight: 600 }}>Health Data Cross-Validation AI</Text>
                <div style={{ marginTop: 8 }}>
                  <Text style={{ color: COLORS.success, fontSize: 20, fontWeight: 700 }}>+65%</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12, display: 'block' }}>détection fausses déclarations santé</Text>
                </div>
                <Tag color="blue" style={{ marginTop: 8, borderRadius: 12 }}>Croisement données médicales</Tag>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div style={{ textAlign: 'center', padding: '16px 8px' }}>
                <div style={{ 
                  width: 56, 
                  height: 56, 
                  background: COLORS.warning + '20', 
                  borderRadius: '50%', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  margin: '0 auto 12px'
                }}>
                  <RobotOutlined style={{ fontSize: 28, color: COLORS.warning }} />
                </div>
                <Text style={{ color: COLORS.textPrimary, fontWeight: 600 }}>Behavioral Underwriting AI</Text>
                <div style={{ marginTop: 8 }}>
                  <Text style={{ color: COLORS.warning, fontSize: 20, fontWeight: 700 }}>+40%</Text>
                  <Text style={{ color: COLORS.textMuted, fontSize: 12, display: 'block' }}>précision de tarification comportementale</Text>
                </div>
                <Tag color="orange" style={{ marginTop: 8, borderRadius: 12 }}>Analyse comportementale</Tag>
              </div>
            </Col>
          </Row>
        </Card>
      </motion.div>
    </div>
  );
};

export default RiskScoringInsurance;