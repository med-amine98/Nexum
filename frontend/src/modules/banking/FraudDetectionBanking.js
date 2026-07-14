// FraudDetectionBanking.js - Version Premium Professionnelle
import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Table, Tag, Space, Alert, Timeline, 
  Badge, Button, Progress, Spin, message, Select, DatePicker, Tabs,
  Modal, Form, Input, InputNumber, Tooltip,
  Descriptions, Typography, Empty,
  Dropdown, Skeleton, Divider, Statistic
} from 'antd';
import { 
  SafetyCertificateFilled, WarningOutlined, EyeOutlined, GlobalOutlined,
  LockOutlined, ReloadOutlined, DownloadOutlined, FilterOutlined,
  CheckCircleOutlined, CloseCircleOutlined, BankOutlined, 
  LogoutOutlined, PlusOutlined,
  MobileOutlined, ClockCircleOutlined,
  DollarOutlined, FlagOutlined,
  BulbOutlined, DashboardOutlined,
  ThunderboltOutlined, RiseOutlined, FallOutlined,
  ScanOutlined, LineChartOutlined, PieChartOutlined,
  FileTextOutlined, CustomerServiceOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';

dayjs.extend(relativeTime);
dayjs.locale('fr');

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

// ============================================
// URL DE L'API
// ============================================
const API_BASE_URL = 'http://localhost:8000/api/v1';

// ============================================
// COMPOSANT STATS CARD - Design Professionnel
// ============================================
const StatsCard = ({ title, value, icon, color, trend, trendValue, loading, subtitle }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        background: '#ffffff',
        borderRadius: 16,
        padding: '20px 24px',
        boxShadow: isHovered 
          ? '0 12px 40px rgba(0,0,0,0.12)' 
          : '0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid #f0f0f0',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Skeleton loading={loading} active paragraph={{ rows: 2 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Text style={{ color: '#8c8c8c', fontSize: 13, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
              {title}
            </Text>
            <div style={{ 
              fontSize: 28, 
              fontWeight: 700, 
              color: '#1a1a2e', 
              marginTop: 6,
              fontFamily: 'Inter, -apple-system, sans-serif'
            }}>
              {value !== undefined && value !== null ? value : 0}
            </div>
            {subtitle && (
              <Text style={{ color: '#bfbfbf', fontSize: 12, display: 'block', marginTop: 2 }}>
                {subtitle}
              </Text>
            )}
            {trend && (
              <Tag 
                color={trend === 'up' ? 'success' : 'error'} 
                style={{ 
                  borderRadius: 12, 
                  padding: '2px 12px',
                  border: 'none',
                  fontSize: 12,
                  fontWeight: 600,
                  marginTop: 6
                }}
              >
                {trend === 'up' ? <RiseOutlined /> : <FallOutlined />} {trendValue}%
              </Tag>
            )}
          </div>
          <div style={{
            width: 48,
            height: 48,
            background: `${color}10`,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${color}20`
          }}>
            {React.cloneElement(icon, { 
              style: { fontSize: 22, color } 
            })}
          </div>
        </div>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: `linear-gradient(90deg, ${color}, ${color}60)`,
          opacity: isHovered ? 1 : 0.5,
          transition: 'opacity 0.3s ease'
        }} />
      </Skeleton>
    </motion.div>
  );
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
const FraudDetectionBanking = () => {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [stats, setStats] = useState({
    total_detected: 0,
    blocked: 0,
    investigating: 0,
    false_positive: 0,
    amount_saved: 0,
    total_transactions: 0,
    suspicious_transactions: 0,
    blocked_transactions: 0,
    fraud_percentage: 0,
    total_amount_blocked: 0,
    avg_fraud_score: 0,
    critical_alerts: 0,
    high_alerts: 0,
    medium_alerts: 0,
    low_alerts: 0
  });
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [riskDistribution, setRiskDistribution] = useState([]);
  const [hourlyActivity, setHourlyActivity] = useState([]);
  const [authChecked, setAuthChecked] = useState(false);
  const [filters, setFilters] = useState({ risk: 'all', status: 'all', dateRange: null });
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [addTransactionModalVisible, setAddTransactionModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('transactions');
  const [xaiModalVisible, setXaiModalVisible] = useState(false);
  const [xaiData, setXaiData] = useState(null);
  const [xaiLoading, setXaiLoading] = useState(false);
  
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [reportForm] = Form.useForm();

  // ============================================
  // FONCTIONS D'APPEL API
  // ============================================
  
  const getAuthHeaders = () => ({
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  });

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/fraud-banking/dashboard/stats`, {
        headers: getAuthHeaders()
      });
      
      const data = response.data || {};
      const statsData = data.data || data;
      
      setStats(prev => ({
        ...prev,
        total_detected: statsData.total_detected ?? statsData.suspicious_transactions ?? 0,
        blocked: statsData.blocked ?? statsData.blocked_transactions ?? 0,
        investigating: statsData.investigating ?? 0,
        false_positive: statsData.false_positive ?? 0,
        amount_saved: statsData.amount_saved ?? statsData.total_amount_blocked ?? 0,
        total_transactions: statsData.total_transactions ?? 0,
        suspicious_transactions: statsData.suspicious_transactions ?? 0,
        blocked_transactions: statsData.blocked_transactions ?? 0,
        fraud_percentage: statsData.fraud_percentage ?? 0,
        total_amount_blocked: statsData.total_amount_blocked ?? 0,
        avg_fraud_score: statsData.avg_fraud_score ?? 0,
        critical_alerts: statsData.critical_alerts ?? 0,
        high_alerts: statsData.high_alerts ?? 0,
        medium_alerts: statsData.medium_alerts ?? 0,
        low_alerts: statsData.low_alerts ?? 0
      }));
      
    } catch (error) {
      console.error('❌ Erreur stats:', error.message);
      message.error('Erreur lors du chargement des statistiques');
    }
  };

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.risk !== 'all') params.append('risk_level', filters.risk);
      if (filters.status !== 'all') params.append('status', filters.status);
      if (filters.dateRange && filters.dateRange[0] && filters.dateRange[1]) {
        params.append('date_from', filters.dateRange[0].format('YYYY-MM-DD'));
        params.append('date_to', filters.dateRange[1].format('YYYY-MM-DD'));
      }
      
      const response = await axios.get(`${API_BASE_URL}/fraud-banking/transactions?${params.toString()}`, {
        headers: getAuthHeaders()
      });
      
      const data = response.data || {};
      let txList = data.data || data.transactions || [];
      if (!Array.isArray(txList)) {
        txList = [];
      }
      
      setTransactions(txList);
      
      const riskDist = data.risk_distribution || data.riskDistribution || [];
      if (Array.isArray(riskDist) && riskDist.length > 0) {
        setRiskDistribution(riskDist);
      } else if (txList.length > 0) {
        const dist = [
          { name: 'Critique', value: txList.filter(t => t.risk_level === 'critical').length },
          { name: 'Élevé', value: txList.filter(t => t.risk_level === 'high').length },
          { name: 'Moyen', value: txList.filter(t => t.risk_level === 'medium').length },
          { name: 'Faible', value: txList.filter(t => t.risk_level === 'low').length }
        ];
        setRiskDistribution(dist);
      }
      
    } catch (error) {
      console.error('❌ Erreur transactions:', error.message);
      message.error('Erreur lors du chargement des transactions');
      setTransactions([]);
    }
  };

  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/fraud-banking/alerts/recent`, {
        headers: getAuthHeaders()
      });
      
      const data = response.data || {};
      const alerts = data.data?.alerts || data.alerts || [];
      
      if (Array.isArray(alerts)) {
        setRecentAlerts(alerts.slice(0, 10));
      }
      
      const activity = data.data?.hourly_activity || data.hourly_activity || [];
      if (Array.isArray(activity)) {
        setHourlyActivity(activity);
      }
      
    } catch (error) {
      console.error('❌ Erreur alertes:', error.message);
      setRecentAlerts([]);
      setHourlyActivity([]);
    }
  };

  const fetchAnalytics = async () => {
    try {
      await axios.get(`${API_BASE_URL}/fraud-banking/analytics`, {
        headers: getAuthHeaders()
      });
    } catch (error) {
      console.error('❌ Erreur analytics:', error.message);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchTransactions(),
        fetchAlerts(),
        fetchAnalytics()
      ]);
    } catch (error) {
      console.error('❌ Erreur chargement global:', error);
      message.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // GESTION DE L'AUTHENTIFICATION
  // ============================================

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      message.warning('Veuillez vous connecter');
      navigate('/login');
    } else {
      setAuthChecked(true);
      fetchAllData();
    }
  }, []);

  useEffect(() => {
    if (authChecked) {
      fetchTransactions();
    }
  }, [filters]);

  // ============================================
  // FONCTIONS DE FORMATAGE
  // ============================================

  const formatAmountSaved = (amount) => {
    if (!amount && amount !== 0) return '0 €';
    if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M €`;
    if (amount >= 1000) return `${(amount / 1000).toFixed(0)}K €`;
    return `${amount} €`;
  };

  // ============================================
  // GESTION DES ACTIONS
  // ============================================

  const handleViewDetails = async (transaction) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/fraud-banking/transactions/${transaction.id}`, {
        headers: getAuthHeaders()
      });
      setSelectedTransaction(response.data);
      setDetailsModalVisible(true);
    } catch (error) {
      setSelectedTransaction(transaction);
      setDetailsModalVisible(true);
    }
  };

  const handleBlockTransaction = async (transactionId) => {
    try {
      await axios.post(`${API_BASE_URL}/fraud-banking/transactions/${transactionId}/block`, {}, {
        headers: getAuthHeaders()
      });
      message.success('Transaction bloquée avec succès');
      fetchTransactions();
      fetchStats();
      setDetailsModalVisible(false);
    } catch (error) {
      message.error('Erreur lors du blocage');
    }
  };

  const handleClearTransaction = async (transactionId) => {
    try {
      await axios.post(`${API_BASE_URL}/fraud-banking/transactions/${transactionId}/clear`, {}, {
        headers: getAuthHeaders()
      });
      message.success('Transaction marquée comme légitime');
      fetchTransactions();
      fetchStats();
      setDetailsModalVisible(false);
    } catch (error) {
      message.error('Erreur lors de la validation');
    }
  };

  const handleExplainTransaction = async (transactionId) => {
    setXaiLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/fraud-banking/transactions/${transactionId}/explain`, {
        headers: getAuthHeaders()
      });
      setXaiData(response.data);
      setXaiModalVisible(true);
    } catch (error) {
      message.error('Erreur lors de l\'analyse XAI');
    } finally {
      setXaiLoading(false);
    }
  };

  const handleAddTransaction = async (values) => {
    try {
      await axios.post(`${API_BASE_URL}/fraud-banking/transactions`, values, {
        headers: getAuthHeaders()
      });
      message.success('Transaction ajoutée avec succès');
      setAddTransactionModalVisible(false);
      form.resetFields();
      fetchTransactions();
      fetchStats();
    } catch (error) {
      message.error('Erreur lors de l\'ajout');
    }
  };

  const handleReportFraud = async (values) => {
    try {
      await axios.post(`${API_BASE_URL}/fraud-banking/reports`, {
        ...values,
        transaction_id: selectedTransaction?.id
      }, {
        headers: getAuthHeaders()
      });
      message.success('Signalement envoyé avec succès');
      setReportModalVisible(false);
      reportForm.resetFields();
    } catch (error) {
      message.error('Erreur lors de l\'envoi');
    }
  };

  const handleExport = async (format = 'csv') => {
    try {
      const response = await axios.get(`${API_BASE_URL}/fraud-banking/export?format=${format}`, {
        headers: getAuthHeaders(),
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fraud_report_${Date.now()}.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success('Export réussi');
    } catch (error) {
      message.error('Erreur lors de l\'export');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    message.success('Déconnexion réussie');
    navigate('/login');
  };

  // ============================================
  // COLONNES DU TABLEAU - Design professionnel
  // ============================================

  const columns = [
    {
      title: 'ID Transaction',
      dataIndex: 'transaction_id',
      key: 'transaction_id',
      width: 180,
      render: (text, record) => (
        <Button 
          type="link" 
          onClick={() => handleViewDetails(record)} 
          style={{ padding: 0, color: '#1890ff', fontWeight: 500 }}
        >
          {text || record.id || record.transaction_id || 'N/A'}
        </Button>
      )
    },
    {
      title: 'Montant',
      dataIndex: 'amount',
      key: 'amount',
      width: 130,
      render: (amount) => (
        <Text strong style={{ color: '#1a1a2e', fontFamily: 'monospace' }}>
          {amount ? Number(amount).toLocaleString() : '0'} €
        </Text>
      )
    },
    {
      title: 'Bénéficiaire',
      dataIndex: 'beneficiary',
      key: 'beneficiary',
      width: 160,
      render: (text, record) => (
        <Text style={{ color: '#262626' }}>
          {text || record?.client_name || record?.recipient || '-'}
        </Text>
      )
    },
    {
      title: 'Canal',
      dataIndex: 'channel',
      key: 'channel',
      width: 110,
      render: (channel) => {
        const icons = {
          mobile: <MobileOutlined />,
          web: <GlobalOutlined />,
          agence: <BankOutlined />
        };
        return (
          <Space size={4}>
            {React.cloneElement(icons[channel] || <BankOutlined />, { 
              style: { color: '#8c8c8c' } 
            })}
            <span style={{ color: '#595959' }}>{channel || 'N/A'}</span>
          </Space>
        );
      }
    },
    {
      title: 'Niveau Risque',
      dataIndex: 'risk_level',
      key: 'risk_level',
      width: 130,
      render: (risk) => {
        const riskLevel = risk || 'low';
        const configs = {
          critical: { color: '#cf1322', bg: '#fff1f0', label: 'Critique', icon: <CloseCircleOutlined /> },
          high: { color: '#d46b08', bg: '#fff7e6', label: 'Élevé', icon: <WarningOutlined /> },
          medium: { color: '#d48806', bg: '#fffbeb', label: 'Moyen', icon: <WarningOutlined /> },
          low: { color: '#389e0d', bg: '#f6ffed', label: 'Faible', icon: <CheckCircleOutlined /> }
        };
        const config = configs[riskLevel] || { color: '#8c8c8c', bg: '#f5f5f5', label: riskLevel || 'Inconnu', icon: null };
        return (
          <Tag 
            style={{ 
              borderRadius: 12, 
              padding: '2px 14px',
              background: config.bg,
              border: `1px solid ${config.color}30`,
              color: config.color,
              fontWeight: 500,
              fontSize: 12
            }}
          >
            {config.icon} {config.label}
          </Tag>
        );
      }
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status) => {
        const statusValue = status || 'investigating';
        const configs = {
          blocked: { status: 'error', text: 'Bloqué' },
          investigating: { status: 'processing', text: 'En cours' },
          cleared: { status: 'success', text: 'Légitime' },
          false_positive: { status: 'warning', text: 'Faux positif' }
        };
        const config = configs[statusValue] || { status: 'default', text: statusValue || 'Inconnu' };
        return <Badge status={config.status} text={<span style={{ color: '#262626' }}>{config.text}</span>} />;
      }
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 170,
      render: (date) => (
        <Text style={{ color: '#8c8c8c', fontSize: 13 }}>
          {date ? dayjs(date).format('DD/MM/YYYY HH:mm') : 'N/A'}
        </Text>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space size={4}>
          <Tooltip title="Détails">
            <Button
              type="primary"
              shape="circle"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
              size="small"
              style={{ background: '#1890ff', border: 'none' }}
            />
          </Tooltip>
          <Tooltip title="Analyse XAI">
            <Button
              shape="circle"
              icon={<BulbOutlined />}
              onClick={() => handleExplainTransaction(record.id || record.transaction_id)}
              size="small"
              style={{ 
                border: '1px solid #faad14',
                color: '#faad14',
                background: '#fffbeb'
              }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  // ============================================
  // GRAPHIQUES - Design professionnel
  // ============================================

  const riskChartOption = {
    tooltip: { 
      trigger: 'item', 
      backgroundColor: '#ffffff', 
      borderColor: '#e8e8e8',
      borderWidth: 1,
      textStyle: { color: '#262626' },
      formatter: (params) => `
        <div style="font-weight:600;font-size:14px;margin-bottom:4px">${params.name}</div>
        <div style="color:#595959">${params.value} transactions</div>
        <div style="color:${params.color}">${params.percent}%</div>
      `
    },
    series: [{
      type: 'pie',
      radius: ['40%', '72%'],
      center: ['50%', '50%'],
      data: riskDistribution.length > 0 ? riskDistribution : [
        { name: 'Critique', value: 0 },
        { name: 'Élevé', value: 0 },
        { name: 'Moyen', value: 0 },
        { name: 'Faible', value: 0 }
      ],
      label: { 
        show: true, 
        color: '#262626', 
        formatter: '{b}\n{d}%',
        fontSize: 12,
        fontWeight: 500
      },
      labelLine: { lineStyle: { color: '#d9d9d9' } },
      itemStyle: {
        borderRadius: 6,
        borderColor: '#ffffff',
        borderWidth: 2
      },
      color: ['#cf1322', '#d46b08', '#d48806', '#389e0d'],
      emphasis: {
        scale: true,
        label: { show: true, fontWeight: 'bold' }
      },
      animationDuration: 1200,
      animationEasing: 'cubicOut'
    }]
  };

  const activityChartOption = {
    tooltip: { 
      trigger: 'axis', 
      backgroundColor: '#ffffff',
      borderColor: '#e8e8e8',
      borderWidth: 1,
      textStyle: { color: '#262626' }
    },
    xAxis: { 
      type: 'category', 
      data: hourlyActivity.length > 0 ? hourlyActivity.map(h => h?.hour || '') : ['00h', '04h', '08h', '12h', '16h', '20h'],
      axisLabel: { color: '#595959', fontSize: 11 },
      axisLine: { lineStyle: { color: '#e8e8e8' } },
      axisTick: { show: false }
    },
    yAxis: { 
      type: 'value', 
      axisLabel: { color: '#595959', fontSize: 11 },
      splitLine: { lineStyle: { color: '#f0f0f0', type: 'dashed' } }
    },
    series: [{
      type: 'line',
      data: hourlyActivity.length > 0 ? hourlyActivity.map(h => h?.count || 0) : [0, 0, 0, 0, 0, 0],
      smooth: true,
      areaStyle: { 
        opacity: 0.15, 
        color: '#1890ff'
      },
      lineStyle: { 
        color: '#1890ff', 
        width: 3
      },
      itemStyle: { 
        color: '#096dd9',
        borderWidth: 2,
        borderColor: '#ffffff'
      },
      symbol: 'circle',
      symbolSize: 8,
      animationDuration: 1200,
      animationEasing: 'cubicOut'
    }],
    grid: { top: 20, bottom: 30, left: 50, right: 20 }
  };

  const trendChartOption = {
    tooltip: { 
      trigger: 'axis', 
      backgroundColor: '#ffffff',
      borderColor: '#e8e8e8',
      borderWidth: 1,
      textStyle: { color: '#262626' }
    },
    xAxis: { 
      type: 'category', 
      data: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
      axisLabel: { color: '#595959' },
      axisLine: { lineStyle: { color: '#e8e8e8' } }
    },
    yAxis: { 
      type: 'value', 
      axisLabel: { color: '#595959' },
      splitLine: { lineStyle: { color: '#f0f0f0' } }
    },
    series: [{ 
      type: 'bar', 
      data: [12, 19, 15, 27, 22, 34],
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: '#1890ff'
      },
      barWidth: '40%'
    }]
  };

  // ============================================
  // RENDU
  // ============================================

  if (!authChecked) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: '#f5f7fa'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Spin size="large" tip="Vérification de l'authentification..." ><div/></Spin>
        </div>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f5f7fa',
      padding: 24
    }}>
      {/* Header - Design professionnel */}
      <div style={{
        background: '#ffffff',
        borderRadius: 16,
        padding: '24px 32px',
        marginBottom: 24,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        border: '1px solid #f0f0f0'
      }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col>
            <Space size={16} align="center">
              <div style={{
                width: 48,
                height: 48,
                background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <SafetyCertificateFilled style={{ fontSize: 24, color: '#ffffff' }} />
              </div>
              <div>
                <Title level={3} style={{ margin: 0, color: '#1a1a2e' }}>
                  Détection Fraude Bancaire
                </Title>
                <Space size={16}>
                  <Text style={{ color: '#8c8c8c', fontSize: 13 }}>
                    <ScanOutlined /> Surveillance en temps réel
                  </Text>
                  <Divider type="vertical" />
                  <Text style={{ color: '#8c8c8c', fontSize: 13 }}>
                    <SafetyCertificateFilled /> IA anti-fraude
                  </Text>
                  <Divider type="vertical" />
                  <Text style={{ color: '#8c8c8c', fontSize: 13 }}>
                    <FileTextOutlined /> Conformité RGPD
                  </Text>
                </Space>
              </div>
            </Space>
          </Col>
          <Col>
            <Space size={12} wrap>
              <Button 
                icon={<PlusOutlined />} 
                type="primary"
                onClick={() => setAddTransactionModalVisible(true)}
                style={{ borderRadius: 8 }}
              >
                Ajouter transaction
              </Button>
              <Dropdown menu={{ 
                items: [
                  { key: 'csv', label: '📊 Export CSV', onClick: () => handleExport('csv') },
                  { key: 'pdf', label: '📄 Export PDF', onClick: () => handleExport('pdf') },
                  { key: 'excel', label: '📈 Export Excel', onClick: () => handleExport('xlsx') }
                ] 
              }}>
                <Button icon={<DownloadOutlined />} style={{ borderRadius: 8 }}>
                  Exporter
                </Button>
              </Dropdown>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={fetchAllData} 
                loading={loading}
                style={{ borderRadius: 8 }}
              >
                Actualiser
              </Button>
              <Button 
                icon={<LogoutOutlined />} 
                onClick={handleLogout}
                danger
                style={{ borderRadius: 8 }}
              />
            </Space>
          </Col>
        </Row>
      </div>

      {/* Filtres - Design professionnel */}
      <Card 
        style={{ 
          borderRadius: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #f0f0f0'
        }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8} md={5}>
            <Select
              placeholder="Niveau de risque"
              style={{ width: '100%', borderRadius: 8 }}
              value={filters.risk}
              onChange={(value) => setFilters({ ...filters, risk: value })}
              size="large"
            >
              <Option value="all">Tous les risques</Option>
              <Option value="critical">🔴 Critique</Option>
              <Option value="high">🟠 Élevé</Option>
              <Option value="medium">🟡 Moyen</Option>
              <Option value="low">🟢 Faible</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={5}>
            <Select
              placeholder="Statut"
              style={{ width: '100%', borderRadius: 8 }}
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              size="large"
            >
              <Option value="all">Tous les statuts</Option>
              <Option value="investigating">🔍 En cours</Option>
              <Option value="blocked">🔒 Bloqué</Option>
              <Option value="cleared">✅ Légitime</Option>
              <Option value="false_positive">⚠️ Faux positif</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={10}>
            <RangePicker
              style={{ width: '100%', borderRadius: 8 }}
              onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
              placeholder={['Date début', 'Date fin']}
              size="large"
              suffixIcon={<ClockCircleOutlined style={{ color: '#bfbfbf' }} />}
            />
          </Col>
          <Col xs={24} sm={4} md={4}>
            <Button
              icon={<FilterOutlined />}
              onClick={() => setFilters({ risk: 'all', status: 'all', dateRange: null })}
              block
              size="large"
              style={{ borderRadius: 8 }}
            >
              Réinitialiser
            </Button>
          </Col>
        </Row>
      </Card>

      {/* KPIs - Design professionnel */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatsCard
            title="Alertes détectées"
            value={stats.total_detected}
            icon={<WarningOutlined />}
            color="#cf1322"
            loading={loading}
            trend="up"
            trendValue="12"
            subtitle="+8% vs mois dernier"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatsCard
            title="Transactions bloquées"
            value={stats.blocked}
            icon={<LockOutlined />}
            color="#d46b08"
            loading={loading}
            trend="up"
            trendValue="5"
            subtitle="Taux de blocage: 94%"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatsCard
            title="Montant protégé"
            value={formatAmountSaved(stats.amount_saved)}
            icon={<DollarOutlined />}
            color="#389e0d"
            loading={loading}
            trend="up"
            trendValue="18"
            subtitle="Économies réalisées"
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatsCard
            title="En cours d'analyse"
            value={stats.investigating}
            icon={<ClockCircleOutlined />}
            color="#d48806"
            loading={loading}
            subtitle="Temps moyen: 2.4 min"
          />
        </Col>
      </Row>

      {/* Graphiques - Design professionnel */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <PieChartOutlined style={{ color: '#1890ff' }} />
                <span style={{ color: '#1a1a2e', fontWeight: 500 }}>Distribution des risques</span>
              </Space>
            }
            style={{ 
              borderRadius: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: '1px solid #f0f0f0'
            }}
            styles={{ body: { padding: 20 } }}
          >
            {riskDistribution.some(r => r.value > 0) ? (
              <ReactECharts option={riskChartOption} style={{ height: 280 }} />
            ) : (
              <Empty description="Aucune donnée disponible" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <LineChartOutlined style={{ color: '#1890ff' }} />
                <span style={{ color: '#1a1a2e', fontWeight: 500 }}>Activité horaire</span>
              </Space>
            }
            style={{ 
              borderRadius: 16,
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              border: '1px solid #f0f0f0'
            }}
            styles={{ body: { padding: 20 } }}
          >
            {hourlyActivity.some(h => (h?.count || 0) > 0) ? (
              <ReactECharts option={activityChartOption} style={{ height: 280 }} />
            ) : (
              <Empty description="Aucune donnée disponible" />
            )}
          </Card>
        </Col>
      </Row>

      {/* Alertes récentes - Design professionnel */}
      <Card 
        title={
          <Space>
            <ThunderboltOutlined style={{ color: '#d46b08' }} />
            <span style={{ color: '#1a1a2e', fontWeight: 500 }}>Dernières alertes</span>
            <Badge count={recentAlerts.length} style={{ background: '#cf1322' }} />
          </Space>
        }
        style={{ 
          borderRadius: 16,
          marginTop: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #f0f0f0'
        }}
        styles={{ body: { padding: '16px 24px' } }}
      >
        {recentAlerts.length > 0 ? (
          <Timeline style={{ marginTop: 4 }}>
            {recentAlerts.slice(0, 5).map((alert, index) => (
              <Timeline.Item 
                key={alert.id || alert.transaction_id || index}
                color={alert.risk_level === 'critical' ? '#cf1322' : '#d46b08'}
                dot={alert.risk_level === 'critical' ? <CloseCircleOutlined style={{ fontSize: 14, color: '#cf1322' }} /> : <WarningOutlined style={{ fontSize: 14, color: '#d46b08' }} />}
              >
                <div style={{ 
                  background: '#fafafa',
                  borderRadius: 8,
                  padding: '12px 16px',
                  border: '1px solid #f0f0f0'
                }}>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Space>
                        <Text strong style={{ color: '#1a1a2e' }}>
                          {alert.transaction_id || alert.id || 'N/A'}
                        </Text>
                        <Text style={{ color: '#595959', fontSize: 13 }}>
                          {alert.amount ? Number(alert.amount).toLocaleString() : '0'} €
                        </Text>
                      </Space>
                    </Col>
                    <Col>
                      <Tag 
                        color={alert.risk_level === 'critical' ? 'error' : 'warning'}
                        style={{ borderRadius: 12 }}
                      >
                        {alert.risk_level === 'critical' ? 'Critique' : 'Élevé'}
                      </Tag>
                    </Col>
                  </Row>
                  <Text style={{ color: '#8c8c8c', fontSize: 12, marginTop: 4, display: 'block' }}>
                    {alert.created_at ? dayjs(alert.created_at).fromNow() : 'Date inconnue'} • {alert.location || 'Localisation inconnue'}
                  </Text>
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        ) : (
          <Empty description="Aucune alerte récente" />
        )}
      </Card>

      {/* Tableau des transactions - Design professionnel */}
      <Card 
        style={{ 
          borderRadius: 16,
          marginTop: 16,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          border: '1px solid #f0f0f0',
          padding: 0
        }}
        styles={{ body: { padding: 0 } }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'transactions',
              label: (
                <Space>
                  <WarningOutlined style={{ color: '#d46b08' }} />
                  <span style={{ color: '#1a1a2e' }}>Transactions suspectes</span>
                </Space>
              ),
              children: (
                <Table
                  columns={columns}
                  dataSource={transactions}
                  rowKey={(record) => record.id || record.transaction_id || Math.random().toString()}
                  pagination={{ 
                    pageSize: 10, 
                    showSizeChanger: true,
                    style: { padding: '0 16px' }
                  }}
                  loading={loading}
                  scroll={{ x: 1200 }}
                  style={{ padding: '0 16px' }}
                  locale={{ emptyText: 'Aucune transaction trouvée' }}
                  size="middle"
                />
              )
            },
            {
              key: 'analytics',
              label: (
                <Space>
                  <DashboardOutlined style={{ color: '#1890ff' }} />
                  <span style={{ color: '#1a1a2e' }}>Analytics avancées</span>
                </Space>
              ),
              children: (
                <div style={{ padding: 20 }}>
                  <Row gutter={[16, 16]}>
                    <Col span={24}>
                      <Card 
                        title="Tendance des fraudes"
                        size="small"
                        style={{ 
                          borderRadius: 12,
                          border: '1px solid #f0f0f0'
                        }}
                      >
                        <ReactECharts option={trendChartOption} style={{ height: 280 }} />
                      </Card>
                    </Col>
                  </Row>
                </div>
              )
            }
          ]}
          tabBarStyle={{ 
            padding: '0 24px',
            borderBottom: '1px solid #f0f0f0',
            marginBottom: 0
          }}
        />
      </Card>

      {/* Modal Détails Transaction - Design professionnel */}
      <Modal
        title={
          <Space>
            <FileTextOutlined style={{ color: '#1890ff' }} />
            <span>Détails de la transaction</span>
          </Space>
        }
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        width={720}
        footer={[
          <Button key="close" onClick={() => setDetailsModalVisible(false)}>
            Fermer
          </Button>,
          <Button key="report" icon={<FlagOutlined />} onClick={() => setReportModalVisible(true)}>
            Signaler
          </Button>,
          selectedTransaction?.status === 'investigating' && (
            <Button key="block" danger icon={<LockOutlined />} onClick={() => handleBlockTransaction(selectedTransaction.id)}>
              Bloquer
            </Button>
          ),
          selectedTransaction?.status === 'investigating' && (
            <Button key="clear" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleClearTransaction(selectedTransaction.id)}>
              Marquer légitime
            </Button>
          )
        ].filter(Boolean)}
        styles={{
          content: {
            borderRadius: 16
          }
        }}
      >
        {selectedTransaction && (
          <div>
            <Descriptions 
              column={2} 
              bordered 
              size="middle"
              labelStyle={{ fontWeight: 500, color: '#1a1a2e' }}
              contentStyle={{ color: '#262626' }}
            >
              <Descriptions.Item label="ID">{selectedTransaction.transaction_id || selectedTransaction.id}</Descriptions.Item>
              <Descriptions.Item label="Montant">
                <Text strong style={{ color: '#1a1a2e' }}>
                  {selectedTransaction.amount ? Number(selectedTransaction.amount).toLocaleString() : '0'} €
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Bénéficiaire">{selectedTransaction.beneficiary || selectedTransaction.client_name || selectedTransaction.recipient || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Canal">{selectedTransaction.channel || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Localisation">{selectedTransaction.location || 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Date">{selectedTransaction.created_at ? dayjs(selectedTransaction.created_at).format('DD/MM/YYYY HH:mm') : 'N/A'}</Descriptions.Item>
              <Descriptions.Item label="Score risque" span={2}>
                <Progress 
                  percent={selectedTransaction.risk_score || selectedTransaction.fraud_score || 0} 
                  strokeColor="#cf1322"
                  format={(percent) => `${percent}%`}
                />
              </Descriptions.Item>
            </Descriptions>
            
            {selectedTransaction.fraud_indicators?.length > 0 && (
              <Card 
                title="Indicateurs de fraude" 
                size="small" 
                style={{ 
                  marginTop: 16,
                  borderRadius: 12,
                  border: '1px solid #f0f0f0'
                }}
                headStyle={{ fontWeight: 500, color: '#1a1a2e' }}
              >
                <Space wrap>
                  {selectedTransaction.fraud_indicators.map((ind, i) => (
                    <Tag key={i} color="error" style={{ borderRadius: 12 }}>{ind}</Tag>
                  ))}
                </Space>
              </Card>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Ajout Transaction */}
      <Modal
        title={
          <Space>
            <PlusOutlined style={{ color: '#1890ff' }} />
            <span>Ajouter une transaction</span>
          </Space>
        }
        open={addTransactionModalVisible}
        onCancel={() => setAddTransactionModalVisible(false)}
        footer={null}
        width={580}
        styles={{
          content: { borderRadius: 16 }
        }}
      >
        <Form form={form} layout="vertical" onFinish={handleAddTransaction}>
          <Form.Item name="amount" label="Montant (€)" rules={[{ required: true }]}>
            <InputNumber 
              min={0} 
              style={{ width: '100%', borderRadius: 8 }} 
              placeholder="0"
              size="large"
            />
          </Form.Item>
          <Form.Item name="beneficiary" label="Bénéficiaire" rules={[{ required: true }]}>
            <Input placeholder="Nom du bénéficiaire" size="large" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="channel" label="Canal" rules={[{ required: true }]}>
                <Select size="large" style={{ borderRadius: 8 }}>
                  <Option value="mobile">Mobile</Option>
                  <Option value="web">Web</Option>
                  <Option value="agence">Agence</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="location" label="Localisation">
                <Input placeholder="Ville / Pays" size="large" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Description de la transaction..." style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large"
                style={{ borderRadius: 8 }}
              >
                Ajouter
              </Button>
              <Button 
                onClick={() => setAddTransactionModalVisible(false)}
                size="large"
                style={{ borderRadius: 8 }}
              >
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Signalement */}
      <Modal
        title={
          <Space>
            <FlagOutlined style={{ color: '#cf1322' }} />
            <span>Signaler une fraude</span>
          </Space>
        }
        open={reportModalVisible}
        onCancel={() => setReportModalVisible(false)}
        footer={null}
        width={580}
        styles={{
          content: { borderRadius: 16 }
        }}
      >
        <Form form={reportForm} layout="vertical" onFinish={handleReportFraud}>
          <Form.Item name="client_name" label="Votre nom" rules={[{ required: true }]}>
            <Input placeholder="Nom complet" size="large" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="client_email" label="Email">
            <Input type="email" placeholder="Email" size="large" style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item name="reason" label="Motif" rules={[{ required: true }]}>
            <Select size="large" style={{ borderRadius: 8 }}>
              <Option value="transaction_non_autorisee">Transaction non autorisée</Option>
              <Option value="usurpation_identite">Usurpation d'identité</Option>
              <Option value="phishing">Phishing</Option>
              <Option value="autre">Autre</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <TextArea rows={4} placeholder="Décrivez la situation..." style={{ borderRadius: 8 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large"
                style={{ borderRadius: 8 }}
              >
                Envoyer
              </Button>
              <Button 
                onClick={() => setReportModalVisible(false)}
                size="large"
                style={{ borderRadius: 8 }}
              >
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal XAI */}
      <Modal
        title={
          <Space>
            <BulbOutlined style={{ color: '#faad14' }} />
            <span>Analyse explicable (XAI)</span>
          </Space>
        }
        open={xaiModalVisible}
        onCancel={() => setXaiModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setXaiModalVisible(false)} style={{ borderRadius: 8 }}>
            Fermer
          </Button>
        ]}
        width={620}
        styles={{
          content: { borderRadius: 16 }
        }}
      >
        {xaiLoading ? (
          <div style={{ textAlign: 'center', padding: 50 }}>
            <Spin tip="Analyse en cours..." ><div/></Spin>
          </div>
        ) : xaiData && (
          <div>
            <Alert
              message="Décision du modèle"
              description={xaiData.explanation || 'Analyse terminée'}
              type="info"
              showIcon
              style={{ 
                marginBottom: 16, 
                borderRadius: 8,
                border: '1px solid #e6f7ff'
              }}
            />
            <Title level={5} style={{ color: '#1a1a2e' }}>Facteurs d'influence</Title>
            {xaiData.features?.map((feature, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <Row justify="space-between" style={{ marginBottom: 4 }}>
                  <Text style={{ color: '#262626' }}>{feature.name || 'Facteur'}</Text>
                  <Text strong style={{ color: feature.impact === 'positif' ? '#cf1322' : '#389e0d' }}>
                    {feature.impact === 'positif' ? '+' : ''}{((feature.value || 0) * 100).toFixed(1)}%
                  </Text>
                </Row>
                <Progress 
                  percent={Math.abs((feature.value || 0) * 100)} 
                  strokeColor={feature.impact === 'positif' ? '#cf1322' : '#389e0d'} 
                  showInfo={false}
                  style={{ marginBottom: 4 }}
                />
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default FraudDetectionBanking;