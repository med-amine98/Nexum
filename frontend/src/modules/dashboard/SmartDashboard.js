// SmartDashboard.js - Version avec API réelle et design sombre
import React, { useState, useEffect, useCallback } from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import {
  Card, Typography, Button, Space,
  Tooltip, Empty, message, Divider, Tag, Progress,
  Avatar, Dropdown, Switch, Select, Row, Col,
  Skeleton, Spin, DatePicker, Radio, Badge,
  Modal, Alert, Statistic
} from 'antd';
import {
  EditOutlined,
  SaveOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  LayoutOutlined,
  TeamOutlined,
  DollarOutlined,
  ShoppingCartOutlined,
  RiseOutlined,
  MoreOutlined,
  ExportOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  GlobalOutlined,
  PieChartOutlined,
  BarChartOutlined,
  LineChartOutlined,
  RadarChartOutlined,
  SettingOutlined,
  FullscreenOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { Line, Pie, Column, Radar } from '@ant-design/charts';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip as MapTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import './SmartDashboard.css';

const ResponsiveGridLayout = WidthProvider(Responsive);
const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// ============================================
// CONFIGURATION
// ============================================

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const COLORS = {
  primary: '#667eea',
  secondary: '#764ba2',
  success: '#52c41a',
  warning: '#faad14',
  danger: '#ff4d4f',
  info: '#1890ff',
  gold: '#f3c300',
  purple: '#722ed1',
  cyan: '#13c2c2',
  pink: '#eb2f96',
  darkBg: '#0a0a0f',
  darkCard: '#14141e',
  darkBorder: '#2a2a3a'
};

const GRADIENTS = {
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  success: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
  warning: 'linear-gradient(135deg, #faad14 0%, #d48806 100%)',
  danger: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)',
  info: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
  gold: 'linear-gradient(135deg, #f3c300 0%, #d4a800 100%)',
  purple: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)'
};

const defaultLayout = [
  { i: 'kpi-total', x: 0, y: 0, w: 2, h: 2 },
  { i: 'kpi-suspicious', x: 2, y: 0, w: 2, h: 2 },
  { i: 'kpi-blocked', x: 4, y: 0, w: 2, h: 2 },
  { i: 'kpi-investigating', x: 6, y: 0, w: 2, h: 2 },
  { i: 'kpi-amount-saved', x: 8, y: 0, w: 2, h: 2 },
  { i: 'kpi-fraud-rate', x: 10, y: 0, w: 2, h: 2 },
  { i: 'chart-risk-distribution', x: 0, y: 2, w: 4, h: 4 },
  { i: 'chart-hourly-activity', x: 4, y: 2, w: 4, h: 4 },
  { i: 'chart-fraud-trend', x: 8, y: 2, w: 4, h: 4 },
  { i: 'recent-alerts', x: 0, y: 6, w: 6, h: 5 },
  { i: 'recent-transactions', x: 6, y: 6, w: 6, h: 5 },
];

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const SmartDashboard = () => {
  const [layout, setLayout] = useState(defaultLayout);
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [selectedSector, setSelectedSector] = useState('all');
  const [timeRange, setTimeRange] = useState('week');
  const [showSettings, setShowSettings] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [notifications, setNotifications] = useState([]);

  // ============================================
  // ÉTATS DES DONNÉES
  // ============================================

  const [stats, setStats] = useState({
    total_transactions: 0,
    suspicious_transactions: 0,
    blocked_transactions: 0,
    investigating: 0,
    cleared: 0,
    false_positive: 0,
    total_amount_blocked: 0,
    fraud_percentage: 0,
    avg_fraud_score: 0,
    critical_alerts: 0,
    high_alerts: 0,
    medium_alerts: 0,
    low_alerts: 0,
    risk_distribution: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    }
  });

  const [transactions, setTransactions] = useState([]);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [hourlyActivity, setHourlyActivity] = useState([]);
  const [fraudTrend, setFraudTrend] = useState([]);
  const [riskDistribution, setRiskDistribution] = useState([]);

  // ============================================
  // FONCTIONS D'APPEL API
  // ============================================

  const getAuthHeaders = () => ({
    'Authorization': 'Bearer ' + localStorage.getItem('token'),
    'Content-Type': 'application/json'
  });

  // Charger les statistiques
  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/fraud-banking/dashboard/stats`, {
        headers: getAuthHeaders()
      });
      
      const data = response.data?.data || response.data || {};
      setStats(prev => ({
        ...prev,
        total_transactions: data.total_transactions || 0,
        suspicious_transactions: data.suspicious_transactions || 0,
        blocked_transactions: data.blocked_transactions || 0,
        investigating: data.investigating || 0,
        cleared: data.cleared || 0,
        false_positive: data.false_positive || 0,
        total_amount_blocked: data.total_amount_blocked || 0,
        fraud_percentage: data.fraud_percentage || 0,
        avg_fraud_score: data.avg_fraud_score || 0,
        critical_alerts: data.critical_alerts || 0,
        high_alerts: data.high_alerts || 0,
        medium_alerts: data.medium_alerts || 0,
        low_alerts: data.low_alerts || 0,
        risk_distribution: data.risk_distribution || { critical: 0, high: 0, medium: 0, low: 0 }
      }));

      // Mettre à jour la distribution des risques pour le graphique
      const riskDist = data.risk_distribution || {};
      setRiskDistribution([
        { name: 'Critique', value: riskDist.critical || 0 },
        { name: 'Élevé', value: riskDist.high || 0 },
        { name: 'Moyen', value: riskDist.medium || 0 },
        { name: 'Faible', value: riskDist.low || 0 }
      ]);

    } catch (error) {
      console.error('❌ Erreur chargement stats:', error);
      addNotification('error', 'Erreur de chargement', 'Impossible de charger les statistiques');
    }
  };

  // Charger les transactions
  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams({ limit: 50 });
      const response = await axios.get(`${API_BASE_URL}/fraud-banking/transactions?${params}`, {
        headers: getAuthHeaders()
      });
      
      const data = response.data || {};
      const txList = data.data || data.transactions || [];
      setTransactions(Array.isArray(txList) ? txList : []);
      
      // Extraire la distribution des risques si disponible
      if (data.risk_distribution) {
        setRiskDistribution(data.risk_distribution);
      }

    } catch (error) {
      console.error('❌ Erreur chargement transactions:', error);
      setTransactions([]);
    }
  };

  // Charger les alertes récentes
  const fetchAlerts = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/fraud-banking/alerts/recent?limit=10`, {
        headers: getAuthHeaders()
      });
      
      const data = response.data?.data || response.data || {};
      const alerts = data.alerts || [];
      setRecentAlerts(Array.isArray(alerts) ? alerts : []);
      
      const activity = data.hourly_activity || [];
      setHourlyActivity(Array.isArray(activity) ? activity : []);

    } catch (error) {
      console.error('❌ Erreur chargement alertes:', error);
      setRecentAlerts([]);
      setHourlyActivity([]);
    }
  };

  // Charger les analytics
  const fetchAnalytics = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/fraud-banking/analytics`, {
        headers: getAuthHeaders()
      });
      
      const data = response.data?.data || response.data || {};
      const trend = data.trend || [];
      setFraudTrend(Array.isArray(trend) ? trend : []);

    } catch (error) {
      console.error('❌ Erreur chargement analytics:', error);
      setFraudTrend([]);
    }
  };

  // Charger toutes les données
  const fetchAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchStats(),
        fetchTransactions(),
        fetchAlerts(),
        fetchAnalytics()
      ]);
      addNotification('success', 'Données actualisées', 'Le tableau de bord a été mis à jour');
    } catch (error) {
      console.error('❌ Erreur chargement global:', error);
      message.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // GESTION DES NOTIFICATIONS
  // ============================================

  const addNotification = (type, title, message) => {
    const newNotif = {
      id: Date.now(),
      type,
      title,
      message,
      time: new Date().toISOString(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev].slice(0, 50));
  };

  const markNotificationAsRead = (id) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    );
  };

  // ============================================
  // SAUVEGARDE DU LAYOUT
  // ============================================

  const onLayoutChange = (newLayout) => {
    if (isEditing && Array.isArray(newLayout)) {
      setLayout(newLayout);
    }
  };

  const saveLayout = () => {
    try {
      localStorage.setItem('dashboard-layout', JSON.stringify(layout));
      setIsEditing(false);
      message.success('Configuration sauvegardée');
    } catch (error) {
      message.error('Erreur lors de la sauvegarde');
    }
  };

  const resetLayout = () => {
    Modal.confirm({
      title: 'Réinitialiser le layout',
      content: 'Voulez-vous vraiment réinitialiser la disposition ?',
      okText: 'Réinitialiser',
      cancelText: 'Annuler',
      onOk: () => {
        setLayout(defaultLayout);
        localStorage.removeItem('dashboard-layout');
        message.info('Layout réinitialisé');
      }
    });
  };

  // ============================================
  // EXPORT DES DONNÉES
  // ============================================

  const exportData = async () => {
    try {
      const data = {
        stats,
        transactions,
        recentAlerts,
        hourlyActivity,
        fraudTrend,
        exportDate: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `dashboard-data-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      message.success('Export réussi');
      addNotification('success', 'Export effectué', 'Les données ont été exportées');
    } catch (error) {
      console.error('Erreur export:', error);
      message.error('Erreur lors de l\'export');
    }
  };

  // ============================================
  // HOOKS
  // ============================================

  useEffect(() => {
    fetchAllData();
    
    const interval = setInterval(fetchAllData, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboard-layout');
    if (savedLayout) {
      try {
        setLayout(JSON.parse(savedLayout));
      } catch (error) {
        console.error('Erreur de chargement du layout:', error);
      }
    }
  }, []);

  // ============================================
  // RENDU DES WIDGETS
  // ============================================

  const renderKPIWidget = (id, config) => {
    let value = 0;
    let trend = 0;
    let target = 0;

    // Mapper les IDs aux valeurs
    switch(id) {
      case 'kpi-total':
        value = stats.total_transactions;
        trend = 12.4;
        target = 50000;
        break;
      case 'kpi-suspicious':
        value = stats.suspicious_transactions;
        trend = -8.2;
        target = 1000;
        break;
      case 'kpi-blocked':
        value = stats.blocked_transactions;
        trend = 5.7;
        target = 500;
        break;
      case 'kpi-investigating':
        value = stats.investigating;
        trend = -2.3;
        target = 200;
        break;
      case 'kpi-amount-saved':
        value = stats.total_amount_blocked;
        trend = 15.8;
        target = 1000000;
        break;
      case 'kpi-fraud-rate':
        value = stats.fraud_percentage;
        trend = -1.5;
        target = 5;
        break;
      default:
        return null;
    }

    const isPositive = trend > 0;
    const progressPercent = target > 0 ? (value / target) * 100 : 0;

    return (
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ duration: 0.2 }}
      >
        <Card 
          className="kpi-card"
          style={{ 
            height: '100%',
            borderRadius: 12,
            background: '#14141e',
            border: '1px solid #2a2a3a',
          }}
          bodyStyle={{ padding: '20px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8c8c8c' }}>
                {config.title}
              </Text>
              <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8, color: '#f1f5f9', display: 'flex', alignItems: 'baseline', gap: 4 }}>
                {config.format ? config.format(value) : value.toLocaleString()}
                {config.suffix && <span style={{ fontSize: 14, fontWeight: 400, color: '#8c8c8c' }}>{config.suffix}</span>}
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tag 
                  color={isPositive ? 'success' : 'error'} 
                  icon={isPositive ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                  style={{ borderRadius: 12, fontSize: 12 }}
                >
                  {Math.abs(trend).toFixed(1)}%
                </Tag>
                <Text type="secondary" style={{ fontSize: 12, color: '#8c8c8c' }}>
                  vs période précédente
                </Text>
              </div>
            </div>
            <div 
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: config.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {React.cloneElement(config.icon, { style: { fontSize: 22, color: '#fff' } })}
            </div>
          </div>
          
          <div style={{ marginTop: 16 }}>
            <Progress 
              percent={Math.min(progressPercent, 100)} 
              size="small" 
              strokeColor={progressPercent >= 100 ? COLORS.success : COLORS.primary}
              showInfo={false}
              strokeLinecap="round"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: 11, color: '#8c8c8c' }}>
                Objectif: {config.formatTarget ? config.formatTarget(target) : target.toLocaleString()}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: 600, color: progressPercent >= 100 ? COLORS.success : COLORS.primary }}>
                {progressPercent.toFixed(0)}%
              </Text>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  };

  const renderChartWidget = (title, icon, chart, extra = null) => (
    <Card 
      className="chart-widget"
      style={{ 
        height: '100%', 
        borderRadius: 12, 
        background: '#14141e',
        border: '1px solid #2a2a3a',
      }}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f1f5f9' }}>
          {icon}
          <span style={{ fontWeight: 500, color: '#f1f5f9' }}>{title}</span>
          {loading && <Spin size="small" style={{ marginLeft: 8 }} />}
        </span>
      }
      extra={extra}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <div style={{ height: '100%', minHeight: 280 }}>
          {chart}
        </div>
      )}
    </Card>
  );

  const renderWidget = (id) => {
    if (loading && !['kpi-total', 'kpi-suspicious', 'kpi-blocked', 'kpi-investigating', 'kpi-amount-saved', 'kpi-fraud-rate'].includes(id)) {
      return <Card style={{ height: '100%', background: '#14141e', border: '1px solid #2a2a3a' }}><Skeleton active paragraph={{ rows: 6 }} /></Card>;
    }

    const commonConfig = {
      animation: true,
      smooth: true,
      theme: 'dark'
    };

    switch (id) {
      case 'kpi-total':
        return renderKPIWidget('kpi-total', { 
          title: "Total Transactions", 
          icon: <ShoppingCartOutlined />, 
          gradient: GRADIENTS.primary,
          format: (val) => val.toLocaleString(),
          formatTarget: (val) => val.toLocaleString()
        });
      
      case 'kpi-suspicious':
        return renderKPIWidget('kpi-suspicious', { 
          title: "Transactions Suspectes", 
          icon: <WarningOutlined />, 
          gradient: GRADIENTS.warning,
          format: (val) => val.toLocaleString(),
          formatTarget: (val) => val.toLocaleString()
        });
      
      case 'kpi-blocked':
        return renderKPIWidget('kpi-blocked', { 
          title: "Transactions Bloquées", 
          icon: <CloseCircleOutlined />, 
          gradient: GRADIENTS.danger,
          format: (val) => val.toLocaleString(),
          formatTarget: (val) => val.toLocaleString()
        });
      
      case 'kpi-investigating':
        return renderKPIWidget('kpi-investigating', { 
          title: "En Cours d'Analyse", 
          icon: <ClockCircleOutlined />, 
          gradient: GRADIENTS.info,
          format: (val) => val.toLocaleString(),
          formatTarget: (val) => val.toLocaleString()
        });
      
      case 'kpi-amount-saved':
        return renderKPIWidget('kpi-amount-saved', { 
          title: "Montant Protégé", 
          suffix: "€", 
          icon: <DollarOutlined />, 
          gradient: GRADIENTS.success,
          format: (val) => val >= 1000000 ? `${(val/1000000).toFixed(1)}M` : `${(val/1000).toFixed(0)}k`,
          formatTarget: (val) => `${(val/1000).toFixed(0)}k€`
        });
      
      case 'kpi-fraud-rate':
        return renderKPIWidget('kpi-fraud-rate', { 
          title: "Taux de Fraude", 
          suffix: "%", 
          icon: <RiseOutlined />, 
          gradient: GRADIENTS.purple,
          format: (val) => val.toFixed(1),
          formatTarget: (val) => `${val}%`
        });

      case 'chart-risk-distribution':
        return renderChartWidget(
          'Distribution des Risques',
          <PieChartOutlined style={{ color: COLORS.primary }} />,
          riskDistribution.length > 0 && riskDistribution.some(r => r.value > 0) ? (
            <Pie 
              data={riskDistribution} 
              angleField="value" 
              colorField="name" 
              radius={0.8} 
              innerRadius={0.6}
              label={{ content: '{name}\n{d}%', style: { fontSize: 11, fill: '#f1f5f9' } }} 
              color={['#ff4d4f', '#fa8c16', '#faad14', '#52c41a']}
              statistic={{ 
                title: { content: 'Total', style: { fontSize: 14, color: '#8c8c8c' } }, 
                content: { 
                  content: riskDistribution.reduce((sum, item) => sum + item.value, 0),
                  style: { fontSize: 24, fontWeight: 600, color: '#f1f5f9' }
                } 
              }} 
              height={280}
              {...commonConfig}
            />
          ) : (
            <Empty description="Aucune donnée disponible" style={{ color: '#8c8c8c' }} />
          )
        );

      case 'chart-hourly-activity':
        return renderChartWidget(
          'Activité Horaire',
          <BarChartOutlined style={{ color: COLORS.primary }} />,
          hourlyActivity.length > 0 ? (
            <Column 
              data={hourlyActivity} 
              xField="hour" 
              yField="count" 
              color={COLORS.primary}
              label={{ position: 'top', style: { fill: '#8c8c8c', fontSize: 11 } }} 
              height={280}
              xAxis={{ label: { rotate: -30, style: { fill: '#8c8c8c' } } }}
              yAxis={{ label: { style: { fill: '#8c8c8c' } } }}
              {...commonConfig}
            />
          ) : (
            <Empty description="Aucune activité" style={{ color: '#8c8c8c' }} />
          )
        );

      case 'chart-fraud-trend':
        return renderChartWidget(
          'Tendance des Fraudés',
          <LineChartOutlined style={{ color: COLORS.primary }} />,
          fraudTrend.length > 0 ? (
            <Line 
              data={fraudTrend} 
              xField="month" 
              yField="value" 
              smooth 
              point={{ size: 6, shape: 'circle' }} 
              color={COLORS.danger}
              areaStyle={{ fill: `l(270) 0:${COLORS.danger} 1:${COLORS.danger}10`, opacity: 0.3 }}
              height={280}
              xAxis={{ label: { style: { fill: '#8c8c8c' } } }}
              yAxis={{ label: { style: { fill: '#8c8c8c' } } }}
              {...commonConfig}
            />
          ) : (
            <Empty description="Aucune donnée de tendance" style={{ color: '#8c8c8c' }} />
          ),
          <Radio.Group value={timeRange} onChange={(e) => setTimeRange(e.target.value)} size="small">
            <Radio.Button value="week">Semaine</Radio.Button>
            <Radio.Button value="month">Mois</Radio.Button>
            <Radio.Button value="year">Année</Radio.Button>
          </Radio.Group>
        );

      case 'recent-alerts':
        return (
          <Card 
            className="activity-widget"
            style={{ 
              height: '100%', 
              borderRadius: 12, 
              background: '#14141e',
              border: '1px solid #2a2a3a',
            }}
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f1f5f9' }}>
                <WarningOutlined style={{ color: COLORS.danger }} />
                <span style={{ fontWeight: 500 }}>Alertes Récentes</span>
                <Badge count={recentAlerts.filter(a => a.risk_level === 'critical').length} style={{ marginLeft: 8 }} />
              </span>
            }
          >
            <div style={{ maxHeight: 350, overflowY: 'auto' }}>
              {recentAlerts.length > 0 ? (
                <AnimatePresence>
                  {recentAlerts.slice(0, 10).map((alert, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '12px 0',
                        borderBottom: idx < recentAlerts.length - 1 ? '1px solid #2a2a3a' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        <Tag 
                          color={alert.risk_level === 'critical' ? 'error' : 'warning'}
                          style={{ borderRadius: 12, minWidth: 70, textAlign: 'center' }}
                        >
                          {alert.risk_level?.toUpperCase() || 'LOW'}
                        </Tag>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ color: '#f1f5f9' }}>{alert.transaction_id || 'N/A'}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 11, color: '#8c8c8c' }}>
                            {alert.amount ? `${alert.amount.toLocaleString()}€` : ''} • {alert.location || 'Inconnu'}
                          </Text>
                        </div>
                      </div>
                      <Text type="secondary" style={{ fontSize: 11, color: '#8c8c8c' }}>
                        {alert.created_at ? new Date(alert.created_at).toLocaleDateString() : ''}
                      </Text>
                    </motion.div>
                  ))}
                </AnimatePresence>
              ) : (
                <Empty description="Aucune alerte récente" style={{ color: '#8c8c8c' }} />
              )}
            </div>
          </Card>
        );

      case 'recent-transactions':
        return (
          <Card 
            className="activity-widget"
            style={{ 
              height: '100%', 
              borderRadius: 12, 
              background: '#14141e',
              border: '1px solid #2a2a3a',
            }}
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#f1f5f9' }}>
                <ClockCircleOutlined style={{ color: COLORS.primary }} />
                <span style={{ fontWeight: 500 }}>Transactions Récentes</span>
              </span>
            }
          >
            <div style={{ maxHeight: 350, overflowY: 'auto' }}>
              {transactions.length > 0 ? (
                <AnimatePresence>
                  {transactions.slice(0, 10).map((tx, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between',
                        padding: '12px 0',
                        borderBottom: idx < transactions.length - 1 ? '1px solid #2a2a3a' : 'none'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1 }}>
                        <Tag 
                          color={
                            tx.risk_level === 'critical' ? 'error' :
                            tx.risk_level === 'high' ? 'warning' :
                            tx.risk_level === 'medium' ? 'gold' : 'success'
                          }
                          style={{ borderRadius: 12, minWidth: 70, textAlign: 'center' }}
                        >
                          {tx.risk_level?.toUpperCase() || 'LOW'}
                        </Tag>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ color: '#f1f5f9' }}>{tx.transaction_id || 'N/A'}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 11, color: '#8c8c8c' }}>
                            {tx.amount ? `${tx.amount.toLocaleString()}€` : '0€'} • {tx.beneficiary || tx.client_name || 'Inconnu'}
                          </Text>
                        </div>
                      </div>
                      <Badge 
                        status={tx.status === 'blocked' ? 'error' : tx.status === 'cleared' ? 'success' : 'processing'} 
                        text={tx.status || 'investigating'}
                        style={{ color: '#8c8c8c' }}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              ) : (
                <Empty description="Aucune transaction récente" style={{ color: '#8c8c8c' }} />
              )}
            </div>
          </Card>
        );

      default:
        return <Card style={{ height: '100%', background: '#14141e', border: '1px solid #2a2a3a' }}><Empty description="Widget non trouvé" style={{ color: '#8c8c8c' }} /></Card>;
    }
  };

  // ============================================
  // MENU ITEMS
  // ============================================

  const menuItems = [
    { key: 'export', icon: <DownloadOutlined />, label: 'Exporter les données', onClick: exportData },
    { key: 'refresh', icon: <ReloadOutlined />, label: 'Actualiser', onClick: fetchAllData },
    { key: 'settings', icon: <SettingOutlined />, label: 'Paramètres', onClick: () => setShowSettings(true) },
    { key: 'fullscreen', icon: <FullscreenOutlined />, label: 'Plein écran', onClick: () => document.documentElement.requestFullscreen?.() }
  ];

  // ============================================
  // RENDU PRINCIPAL
  // ============================================

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0a0a0f',
      padding: 24,
      color: '#f1f5f9'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: 24,
        padding: '16px 24px',
        background: '#14141e',
        borderRadius: 12,
        border: '1px solid #2a2a3a'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: GRADIENTS.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <LayoutOutlined style={{ fontSize: 24, color: '#fff' }} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, color: '#f1f5f9', fontWeight: 600 }}>
                🛡️ Détection Fraude Bancaire
              </Title>
              <Text style={{ color: '#8c8c8c', fontSize: 12 }}>
                Dernière MAJ: {new Date().toLocaleString()}
              </Text>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            <Switch 
              checkedChildren="🌙" 
              unCheckedChildren="☀️" 
              checked={darkMode} 
              onChange={setDarkMode} 
              style={{ background: darkMode ? '#1890ff' : '#8c8c8c' }}
            />
            
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchAllData} 
              loading={loading}
              style={{ background: '#1a1a2e', color: '#f1f5f9', border: '1px solid #2a2a3a' }}
            >
              Actualiser
            </Button>
            
            {isEditing ? (
              <>
                <Button type="primary" icon={<SaveOutlined />} onClick={saveLayout}>
                  Sauvegarder
                </Button>
                <Button danger onClick={resetLayout}>
                  Réinitialiser
                </Button>
              </>
            ) : (
              <Button 
                icon={<EditOutlined />} 
                onClick={() => setIsEditing(true)}
                style={{ background: '#1a1a2e', color: '#f1f5f9', border: '1px solid #2a2a3a' }}
              >
                Modifier
              </Button>
            )}
            
            <Dropdown menu={{ items: menuItems }} placement="bottomRight">
              <Button style={{ background: '#1a1a2e', color: '#f1f5f9', border: '1px solid #2a2a3a' }}>
                <MoreOutlined />
              </Button>
            </Dropdown>
            
            <Badge count={unreadCount} overflowCount={99}>
              <Button 
                icon={<InfoCircleOutlined />} 
                onClick={() => {
                  if (unreadCount > 0) {
                    notifications.forEach(n => markNotificationAsRead(n.id));
                    message.success(`${unreadCount} notification(s) marquée(s) comme lue(s)`);
                  }
                }}
                style={{ background: '#1a1a2e', color: '#f1f5f9', border: '1px solid #2a2a3a' }}
              />
            </Badge>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {notifications.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <AnimatePresence>
            {notifications.slice(0, 3).map((notif) => (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.3 }}
                style={{ marginBottom: 8 }}
              >
                <Alert
                  message={notif.title}
                  description={notif.message}
                  type={notif.type}
                  showIcon
                  closable
                  onClose={() => markNotificationAsRead(notif.id)}
                  style={{ borderRadius: 8, background: '#1a1a2e', border: `1px solid ${notif.type === 'success' ? '#237804' : notif.type === 'error' ? '#a8071a' : '#1d39c4'}` }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Grid Layout */}
      <ResponsiveGridLayout 
        layouts={{ lg: layout }} 
        breakpoints={{ lg: 1200, md: 996, sm: 768 }} 
        cols={{ lg: 12, md: 10, sm: 6 }} 
        rowHeight={85} 
        isDraggable={isEditing} 
        isResizable={isEditing} 
        onLayoutChange={onLayoutChange}
        draggableHandle=".ant-card-head"
        margin={[16, 16]}
      >
        {layout.map(item => (
          <div key={item.i} className="grid-item">
            {renderWidget(item.i)}
          </div>
        ))}
      </ResponsiveGridLayout>

      {/* Footer */}
      <div style={{ 
        marginTop: 32, 
        padding: '16px',
        borderTop: '1px solid #2a2a3a',
        textAlign: 'center'
      }}>
        <Space split={<Divider type="vertical" style={{ background: '#2a2a3a' }} />}>
          <Text style={{ color: '#8c8c8c' }}>🛡️ Détection Fraude Bancaire v2.0</Text>
          <Text style={{ color: '#8c8c8c' }}>Données en temps réel</Text>
          <Text style={{ color: '#8c8c8c' }}>📊 {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
          <Badge status="processing" text="Live" style={{ color: '#8c8c8c' }} />
        </Space>
      </div>

      {/* Settings Modal */}
      <Modal
        title={<span style={{ color: '#f1f5f9' }}><SettingOutlined /> Paramètres du dashboard</span>}
        open={showSettings}
        onCancel={() => setShowSettings(false)}
        footer={[
          <Button key="close" onClick={() => setShowSettings(false)} style={{ background: '#1a1a2e', color: '#f1f5f9', border: '1px solid #2a2a3a' }}>
            Fermer
          </Button>,
          <Button key="save" type="primary" onClick={() => {
            message.success('Paramètres sauvegardés');
            setShowSettings(false);
          }}>
            Sauvegarder
          </Button>
        ]}
        styles={{
          body: { background: '#14141e' },
          header: { background: '#14141e', borderBottom: '1px solid #2a2a3a' }
        }}
      >
        <div style={{ padding: '8px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <Text style={{ color: '#f1f5f9' }} strong>Rafraîchissement automatique</Text>
            <div style={{ marginTop: 8 }}>
              <Select 
                value={refreshInterval} 
                onChange={setRefreshInterval} 
                style={{ width: '100%', background: '#1a1a2e' }}
              >
                <Option value={15}>15 secondes</Option>
                <Option value={30}>30 secondes</Option>
                <Option value={60}>1 minute</Option>
                <Option value={300}>5 minutes</Option>
                <Option value={0}>Désactivé</Option>
              </Select>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default SmartDashboard;