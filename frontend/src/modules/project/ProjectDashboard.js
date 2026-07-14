// src/modules/dashboard/ProjectDashboard.js - Version sans mock data
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Row, Col, Statistic, Progress, Tag, 
  Space, Typography, Avatar, Badge, Tooltip, Skeleton,
  Button, message, Divider, Empty, FloatButton, 
  Spin, Timeline, ConfigProvider, Modal, Descriptions, Alert,
  Dropdown, Menu
} from 'antd';
import { 
  ShoppingOutlined, DollarOutlined, TeamOutlined, WarningOutlined, 
  RiseOutlined, FallOutlined, ClockCircleOutlined, ExclamationCircleOutlined, 
  ReloadOutlined, SecurityScanOutlined, LineChartOutlined, 
  ThunderboltOutlined, AppstoreOutlined, RocketOutlined, 
  GlobalOutlined, CheckCircleOutlined, ArrowUpOutlined, ArrowDownOutlined,
  EyeOutlined, EyeInvisibleOutlined, CloudServerOutlined,
  DeploymentUnitOutlined, SyncOutlined, DashboardOutlined,
  TrophyOutlined, StarOutlined, MenuOutlined, ExportOutlined, BellOutlined, SettingOutlined,
  CloseCircleOutlined, InfoCircleOutlined, HeartOutlined, FireOutlined,
  CrownOutlined, CompassOutlined
} from '@ant-design/icons';
import { Line } from '@ant-design/charts';
import api from '../../services/axiosConfig';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';
import './ProjectDashboard.css';

dayjs.extend(relativeTime);
dayjs.locale('fr');

const { Title, Text } = Typography;

// ============================================
// CONSTANTES - TOUT EN NOIR
// ============================================

const COLORS = {
  success: '#10b981',
  warning: '#10b981',
  error: '#ef4444',
  info: '#3b82f6',
  purple: '#475569',
  primary: '#2563eb',
  // TOUT EN NOIR
  textPrimary: '#000000',
  textSecondary: '#000000',
  textMuted: '#000000',
  border: '#e2e8f0',
  bgLight: '#f8fafc',
  white: '#ffffff'
};

const ANIMATION_VARIANTS = {
  fadeInUp: {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  },
  fadeInLeft: {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
  },
  fadeInRight: {
    hidden: { opacity: 0, x: 30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } }
  },
  staggerContainer: {
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } }
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, type: "spring", stiffness: 200 } }
  },
  pulse: {
    scale: [1, 1.05, 1],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
  }
};

// ========== STYLES ==========
const styles = {
  glassCard: {
    background: 'rgba(255, 255, 255, 0.8)',
    backdropFilter: 'blur(20px)',
    borderRadius: 28,
    border: '1px solid rgba(226, 232, 240, 0.5)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.02)',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  gradientBg: {
    background: 'linear-gradient(135deg, #2563eb 0%, #475569 50%, #ec4899 100%)',
    position: 'relative',
    overflow: 'hidden'
  },
  neonCard: {
    background: COLORS.white,
    borderRadius: 24,
    border: `1px solid ${COLORS.border}`,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)',
    transition: 'all 0.3s ease'
  }
};

// ========== AUCUNE DONNÉE MOCKÉE ==========
// Suppression de DEFAULT_DIGITAL_TWINS

// ========== COMPOSANT KPI PREMIUM ==========
const KpiCardPremium = ({ title, value, suffix, icon, color, trend, prediction, onClick, loading, showPredictions }) => {
  const displayPrediction = showPredictions && prediction && prediction > 0;
  
  return (
    <motion.div 
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      variants={ANIMATION_VARIANTS.scaleIn}
      style={{ height: '100%' }}
    >
      <Card 
        className="kpi-card-premium"
        style={{ 
          ...styles.neonCard, 
          overflow: 'hidden', 
          position: 'relative',
          cursor: onClick ? 'pointer' : 'default',
          borderRadius: 24
        }}
        bodyStyle={{ padding: '24px' }}
        hoverable={!!onClick}
        onClick={onClick}
      >
        <div className="kpi-glow" style={{ background: `radial-gradient(circle at top right, ${color}15, transparent 70%)` }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 500, color: '#000000' }}>
              {title}
            </Text>
            {loading ? (
              <Skeleton.Input active size="small" style={{ width: 100, marginTop: 12 }} />
            ) : (
              <div style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 36, fontWeight: 700, color: '#000000', fontFamily: 'monospace' }}>
                  <CountUp end={value || 0} duration={2} separator=" " suffix={suffix} />
                </Text>
              </div>
            )}
            <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {trend !== undefined && trend !== 0 && (
                <Tag 
                  color={trend > 0 ? 'success' : 'error'} 
                  icon={trend > 0 ? <RiseOutlined /> : <FallOutlined />}
                  style={{ borderRadius: 20, padding: '4px 14px', fontWeight: 500 }}
                >
                  {trend > 0 ? '+' : ''}{Math.abs(trend)}%
                </Tag>
              )}
              {displayPrediction && (
                <Tag icon={<LineChartOutlined />} color="purple" style={{ borderRadius: 20 }}>
                  <LineChartOutlined /> Prévision: {typeof prediction === 'number' ? prediction.toLocaleString() : prediction}{suffix}
                </Tag>
              )}
            </div>
          </div>
          <motion.div 
            whileHover={{ rotate: 360, scale: 1.1 }}
            transition={{ duration: 0.5 }}
            className="kpi-icon-wrapper"
            style={{ 
              width: 56, height: 56, borderRadius: 18, 
              background: `linear-gradient(135deg, ${color}20, ${color}05)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            {React.cloneElement(icon, { style: { fontSize: 28, color } })}
          </motion.div>
        </div>
        <motion.div 
          className="kpi-progress"
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 1, delay: 0.3 }}
          style={{ 
            height: 3, 
            background: `linear-gradient(90deg, ${color}, ${color}40)`,
            marginTop: 20,
            borderRadius: 3
          }}
        />
      </Card>
    </motion.div>
  );
};

// ========== COMPOSANT JAUGE DE SANTÉ ==========
const HealthGaugePremium = ({ score }) => {
  const getColor = () => {
    if (score >= 80) return { main: COLORS.success, gradient: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)' };
    if (score >= 60) return { main: COLORS.warning, gradient: 'linear-gradient(135deg, #10b981 0%, #fbbf24 100%)' };
    if (score >= 40) return { main: '#fa8c16', gradient: 'linear-gradient(135deg, #fa8c16 0%, #ffa940 100%)' };
    return { main: COLORS.error, gradient: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)' };
  };

  const color = getColor();

  return (
    <motion.div 
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
      style={{ textAlign: 'center' }}
    >
      <Progress
        type="circle"
        percent={score}
        size={180}
        strokeColor={color.gradient}
        strokeWidth={12}
        trailColor="rgba(0,0,0,0.04)"
        format={(percent) => (
          <div>
            <Text style={{ fontSize: 44, fontWeight: 700, color: '#000000', fontFamily: 'monospace' }}>
              {percent || 0}%
            </Text>
            <Text style={{ fontSize: 13, display: 'block', marginTop: 8, fontWeight: 500, color: '#000000' }}>
              Santé globale
            </Text>
          </div>
        )}
      />
    </motion.div>
  );
};

// ========== COMPOSANT ALERTE ==========
const AlertCard = ({ alert, onClose }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    style={{ marginBottom: 12 }}
  >
    <Alert
      message={<Text strong style={{ color: '#000000' }}>{alert.title}</Text>}
      description={<Text style={{ color: '#000000' }}>{alert.description}</Text>}
      type={alert.type === 'critical' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}
      showIcon
      closable
      onClose={() => onClose(alert.id)}
      style={{ borderRadius: 16, border: 'none' }}
      action={
        alert.action && (
          <Button size="small" type="primary" ghost onClick={alert.action.onClick}>
            {alert.action.label}
          </Button>
        )
      }
    />
  </motion.div>
);

// ========== COMPOSANT DIGITAL TWIN ==========
const DigitalTwinCard = ({ twin, onSync, onClick, showPredictions }) => {
  const getStatus = () => {
    switch(twin.status) {
      case 'synced': return { color: COLORS.success, icon: <CheckCircleOutlined />, text: 'Synchro' };
      case 'syncing': return { color: COLORS.warning, icon: <SyncOutlined spin />, text: 'Sync...' };
      default: return { color: twin.color || COLORS.info, icon: <CloudServerOutlined />, text: 'Actif' };
    }
  };
  const status = getStatus();

  return (
    <motion.div whileHover={{ y: -4, scale: 1.01 }} transition={{ duration: 0.2 }}>
      <Card 
        hoverable 
        className="digital-twin-card"
        style={{ 
          ...styles.neonCard, 
          cursor: 'pointer', 
          marginBottom: 12, 
          borderRadius: 20,
          borderLeft: `4px solid ${status.color}`
        }}
        bodyStyle={{ padding: '18px' }}
        onClick={onClick}
      >
        <Row align="middle" justify="space-between">
          <Col flex="auto">
            <Space size={14}>
              <Avatar 
                size={48} 
                icon={<CloudServerOutlined />} 
                style={{ backgroundColor: `${status.color}15`, color: status.color, boxShadow: `0 4px 12px ${status.color}20` }}
              />
              <div>
                <Text strong style={{ fontSize: 16, color: '#000000' }}>{twin.name}</Text>
                <br />
                <Space size="small" style={{ marginTop: 4 }}>
                  <Tag color={status.color === COLORS.success ? 'success' : status.color === COLORS.warning ? 'warning' : 'default'} icon={status.icon} style={{ borderRadius: 20, fontSize: 11 }}>
                    {status.text}
                  </Tag>
                  <Text style={{ fontSize: 11, color: '#000000' }}>
                    {dayjs(twin.lastSync).fromNow()}
                  </Text>
                </Space>
              </div>
            </Space>
          </Col>
          <Col>
            <div style={{ textAlign: 'right' }}>
              <Text strong style={{ fontSize: 20, color: '#000000', fontFamily: 'monospace' }}>{twin.data}</Text>
              <br />
              <div style={{ width: 80, marginTop: 6 }}>
                <Progress 
                  percent={twin.accuracy} 
                  size="small" 
                  strokeColor={status.color}
                  format={(p) => `${p}%`}
                />
              </div>
            </div>
          </Col>
        </Row>
        {showPredictions && twin.prediction && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="prediction-badge"
            style={{ marginTop: 14, padding: '10px 14px', background: `linear-gradient(135deg, ${COLORS.purple}08, ${COLORS.bgLight})`, borderRadius: 14 }}
          >
            <Space>
              <LineChartOutlined style={{ color: COLORS.purple }} />
              <Text style={{ fontSize: 12, color: '#000000' }}>Prédiction IA:</Text>
              <Text strong style={{ color: '#000000' }}>{twin.prediction}</Text>
            </Space>
          </motion.div>
        )}
      </Card>
    </motion.div>
  );
};

// ========== COMPOSANT ACTIVITÉ ==========
const ActivityTimeline = ({ activity, index }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: index * 0.05 }}
    className="activity-item"
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '12px 0' }}>
      <Avatar 
        size={36} 
        icon={activity.status === 'success' ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
        style={{ backgroundColor: activity.status === 'success' ? `${COLORS.success}15` : `${COLORS.warning}15`, color: activity.status === 'success' ? COLORS.success : COLORS.warning }}
      />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Text strong style={{ color: '#000000' }}>{activity.action}</Text>
          <Text style={{ fontSize: 11, color: '#000000' }}>{activity.time}</Text>
        </div>
        <Space size="small" style={{ marginTop: 6 }}>
          <Tag style={{ borderRadius: 12, background: `${COLORS.primary}10`, border: 'none', color: COLORS.primary }}>{activity.module}</Tag>
          {activity.amount && activity.amount !== '-' && <Text style={{ fontSize: 12, color: '#000000' }}>{activity.amount}</Text>}
        </Space>
      </div>
    </div>
  </motion.div>
);

// ========== COMPOSANT MODULE ==========
const ModuleGridCard = ({ module, onClick, showPredictions }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: module.order * 0.05 }}
  >
    <Card 
      size="small" 
      hoverable 
      className="module-card"
      style={{ marginBottom: 12, cursor: 'pointer', borderRadius: 16, border: `1px solid ${COLORS.border}` }}
      bodyStyle={{ padding: '14px 16px' }}
      onClick={onClick}
    >
      <Row justify="space-between" align="middle">
        <Col>
          <Space size={12}>
            <Avatar size={40} style={{ background: `${module.color || COLORS.primary}15`, color: module.color || COLORS.primary, borderRadius: 12 }}>
              {module.name === 'Ventes' && <ShoppingOutlined />}
              {module.name === 'CRM' && <TeamOutlined />}
              {module.name === 'Stock' && <WarningOutlined />}
              {module.name === 'RH' && <TeamOutlined />}
              {module.name === 'Comptabilité' && <DollarOutlined />}
              {module.name === 'Achats' && <ShoppingOutlined />}
            </Avatar>
            <div>
              <Text strong style={{ color: '#000000' }}>{module.name}</Text>
              <br />
              <Text style={{ fontSize: 11, color: '#000000' }}>{module.description}</Text>
            </div>
          </Space>
        </Col>
        <Col>
          <div style={{ textAlign: 'right' }}>
            <Text strong style={{ color: '#000000', fontSize: 16 }}>{module.progress || 0}%</Text>
            <Progress percent={module.progress || 0} strokeColor={module.color || COLORS.primary} showInfo={false} size="small" style={{ width: 70, marginTop: 4 }} />
            {showPredictions && module.predicted_trend !== undefined && (
              <Tag icon={<LineChartOutlined />} color="purple" style={{ fontSize: 10, marginTop: 4, borderRadius: 12 }}>
                {module.predicted_trend > 0 ? '+' : ''}{Math.round(module.predicted_trend)}%
              </Tag>
            )}
          </div>
        </Col>
      </Row>
    </Card>
  </motion.div>
);

// ========== COMPOSANT PRINCIPAL ==========
const ProjectDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showPredictions, setShowPredictions] = useState(true);
  const [kpis, setKpis] = useState(null);
  const [modules, setModules] = useState([]);
  const [activities, setActivities] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [health, setHealth] = useState({ score: 0, metrics: {} });
  const [digitalTwins, setDigitalTwins] = useState(null); // Initialisé à null
  const [twinModalVisible, setTwinModalVisible] = useState(false);
  const [selectedTwin, setSelectedTwin] = useState(null);
  const [hoveredMetric, setHoveredMetric] = useState(null);
  const navigate = useNavigate();

  const generateAlerts = (alertsData, kpisData) => {
    const newAlerts = [];
    
    if (alertsData?.critical > 0) {
      newAlerts.push({
        id: 'stock',
        type: 'critical',
        title: `⚠️ Stock critique - ${alertsData.critical} produit(s)`,
        description: `${alertsData.critical} produit(s) ont un niveau de stock inférieur au seuil minimum. Une action immédiate est recommandée.`,
        action: { label: 'Voir le stock', onClick: () => navigate('/stock') }
      });
    }
    
    if (kpisData?.orders?.trend < -10) {
      newAlerts.push({
        id: 'orders',
        type: 'warning',
        title: '📦 Baisse des commandes',
        description: `Les commandes ont diminué de ${Math.abs(kpisData.orders.trend)}% ce mois-ci. Analysez les causes pour réagir rapidement.`,
        action: { label: 'Analyser', onClick: () => navigate('/sales') }
      });
    }
    
    if (kpisData?.clients?.new === 0 && kpisData?.clients?.trend < 0) {
      newAlerts.push({
        id: 'leads',
        type: 'info',
        title: '📋 Aucun nouveau client',
        description: 'Aucun nouveau client n\'a été converti ce mois-ci. Boostez vos efforts marketing.',
        action: { label: 'Voir CRM', onClick: () => navigate('/crm') }
      });
    }
    
    return newAlerts;
  };

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [kpisRes, modulesRes, activitiesRes, chartRes, alertsRes, healthRes, twinsRes] = await Promise.all([
        api.get('/project/kpis').catch(() => ({ data: null })),
        api.get('/project/modules').catch(() => ({ data: [] })),
        api.get('/project/activities').catch(() => ({ data: [] })),
        api.get('/project/sales-chart').catch(() => ({ data: [] })),
        api.get('/project/alerts').catch(() => ({ data: { total: 0, critical: 0 } })),
        api.get('/project/health').catch(() => ({ data: { score: 0, metrics: {} } })),
        api.get('/digital-twins').catch(() => ({ data: { twins: [] } }))
      ]);

      setKpis(kpisRes.data);
      setModules(modulesRes.data || []);
      setActivities(activitiesRes.data.map(a => ({ ...a, time: dayjs(a.created_at).fromNow() })) || []);
      setChartData(chartRes.data || []);
      setHealth(healthRes.data || { score: 0, metrics: {} });
      
      // Ne définir que si des données existent
      if (twinsRes.data && twinsRes.data.twins && twinsRes.data.twins.length > 0) {
        setDigitalTwins(twinsRes.data);
      } else {
        setDigitalTwins(null);
      }
      
      setAlerts(generateAlerts(alertsRes.data, kpisRes.data));
      
    } catch (error) {
      console.error('Erreur chargement:', error);
      message.error('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    message.success({ content: 'Données actualisées', key: 'refresh', duration: 2 });
  }, [fetchAllData]);

  const closeAlert = (alertId) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(() => {
      refreshData();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchAllData, refreshData]);

  const syncDigitalTwin = async (twinId, e) => {
    if (e) e.stopPropagation();
    try {
      message.loading({ content: 'Synchronisation...', key: 'sync' });
      await api.post(`/digital-twins/${twinId}/sync`);
      message.success({ content: 'Synchronisé', key: 'sync', duration: 2 });
      await fetchAllData();
    } catch (error) {
      message.error({ content: 'Erreur', key: 'sync', duration: 2 });
    }
  };

  const togglePredictions = () => {
    setShowPredictions(!showPredictions);
    message.info(showPredictions ? 'Prédictions masquées' : 'Prédictions affichées');
  };

  const openTwinModal = (twin) => {
    setSelectedTwin(twin);
    setTwinModalVisible(true);
  };

  const chartConfig = {
    data: chartData,
    xField: 'month',
    yField: 'ventes',
    smooth: true,
    point: { size: 6, shape: 'circle', style: { fill: COLORS.purple, stroke: '#fff', lineWidth: 2, shadowBlur: 10, shadowColor: `${COLORS.purple}50` } },
    line: { color: COLORS.purple, lineWidth: 3, shadowBlur: 10, shadowColor: `${COLORS.purple}50` },
    area: { style: { fill: `linear-gradient(180deg, ${COLORS.purple}30, transparent)`, opacity: 0.3 } },
    tooltip: { formatter: (d) => ({ name: 'Chiffre d\'affaires', value: `${d.ventes?.toLocaleString()} €` }) },
    xAxis: { label: { style: { fill: '#000000' } }, grid: { line: { style: { stroke: COLORS.border } } } },
    yAxis: { label: { formatter: (v) => `${(v / 1000).toFixed(0)}k€`, style: { fill: '#000000' } }, grid: { line: { style: { stroke: COLORS.border } } } },
    animation: false,
    theme: 'light'
  };

  const menu = (
    <Menu className="dashboard-menu">
      <Menu.Item key="1" icon={<ExportOutlined />}>Exporter PDF</Menu.Item>
      <Menu.Item key="2" icon={<ExportOutlined />}>Exporter Excel</Menu.Item>
      <Menu.Divider />
      <Menu.Item key="3" icon={<SettingOutlined />}>Paramètres</Menu.Item>
    </Menu>
  );

  if (loading) {
    return (
      <div className="dashboard-loading" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #2563eb 0%, #475569 50%, #ec4899 100%)', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" tip={<span style={{ color: 'white', fontWeight: 500 }}>Chargement du tableau de bord...</span>} ><div/></Spin>
      </div>
    );
  }

  return (
    <ConfigProvider>
      <div className="project-dashboard" style={{ minHeight: '100vh', background: COLORS.bgLight }}>
        {/* Background decoration */}
        <div className="dashboard-bg-decoration">
          <div className="bg-blob blob-1" />
          <div className="bg-blob blob-2" />
          <div className="bg-blob blob-3" />
        </div>

        {/* Header Premium */}
        <motion.div 
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="dashboard-header-premium"
          style={{ ...styles.gradientBg, padding: '32px 40px', marginBottom: 32, position: 'relative', zIndex: 10 }}
        >
          <div className="header-glow" />
          <Row justify="space-between" align="middle" wrap>
            <Col xs={24} md={14}>
              <Space size={24} wrap>
                <motion.div whileHover={{ rotate: 360, scale: 1.1 }} transition={{ duration: 0.6 }}>
                  <Avatar size={64} icon={<CrownOutlined />} className="header-avatar" />
                </motion.div>
                <div>
                  <Title level={1} style={{ margin: 0, color: 'white', fontWeight: 800, fontSize: 32, letterSpacing: '-0.5px' }}>
                    Nexum Dashboard
                  </Title>
                  <Space size={8} style={{ marginTop: 8 }}>
                    <Tag icon={<StarOutlined />} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: 20 }}>
                      Enterprise
                    </Tag>
                    <Tag icon={<CompassOutlined />} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: 20 }}>
                      IA Prédictive
                    </Tag>
                    <Tag icon={<ThunderboltOutlined />} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', borderRadius: 20 }}>
                      Temps Réel
                    </Tag>
                  </Space>
                </div>
              </Space>
            </Col>
            <Col xs={24} md={10} style={{ marginTop: 16 }}>
              <Space size={16} wrap style={{ justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                <Tooltip title={showPredictions ? "Masquer les prédictions IA" : "Afficher les prédictions IA"}>
                  <Button 
                    icon={showPredictions ? <EyeOutlined /> : <EyeInvisibleOutlined />} 
                    type={showPredictions ? 'primary' : 'default'}
                    onClick={togglePredictions}
                    shape="circle"
                    size="large"
                    className="glass-button"
                  />
                </Tooltip>
                <Dropdown overlay={menu} placement="bottomRight">
                  <Button icon={<MenuOutlined />} shape="circle" size="large" className="glass-button" />
                </Dropdown>
                <Tooltip title="Actualiser les données">
                  <Button 
                    icon={<ReloadOutlined spin={refreshing} />} 
                    onClick={refreshData} 
                    shape="circle" 
                    size="large" 
                    className="glass-button"
                  />
                </Tooltip>
                <Badge count={alerts.length} offset={[-5, 5]} style={{ backgroundColor: COLORS.error, boxShadow: '0 2px 8px rgba(255,77,79,0.4)' }}>
                  <Avatar icon={<BellOutlined />} className="glass-avatar" />
                </Badge>
              </Space>
            </Col>
          </Row>
        </motion.div>

        <div style={{ padding: '0 32px 32px', position: 'relative', zIndex: 10 }}>
          {/* Alertes */}
          {alerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{ marginBottom: 24 }}
            >
              <Card 
                title={
                  <Space>
                    <div className="alert-title-icon"><BellOutlined /></div>
                    <span style={{ fontWeight: 600, fontSize: 16, color: '#000000' }}>Alertes système ({alerts.length})</span>
                  </Space>
                }
                className="alerts-card"
                style={{ borderRadius: 24 }}
              >
                <AnimatePresence>
                  {alerts.map(alert => (
                    <AlertCard key={alert.id} alert={alert} onClose={closeAlert} />
                  ))}
                </AnimatePresence>
              </Card>
            </motion.div>
          )}

          {/* KPIs Grid */}
          {kpis && (
            <motion.div variants={ANIMATION_VARIANTS.staggerContainer} initial="hidden" animate="visible">
              <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
                <Col xs={24} sm={12} lg={6}>
                  <KpiCardPremium 
                    title="Chiffre d'affaires" value={kpis.revenue?.total} suffix="€" icon={<DollarOutlined />} 
                    color={COLORS.success} trend={kpis.revenue?.trend} prediction={kpis.revenue?.prediction}
                    onClick={() => navigate('/sales')} loading={loading} showPredictions={showPredictions}
                  />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <KpiCardPremium 
                    title="Commandes" value={kpis.orders?.total} icon={<ShoppingOutlined />} 
                    color={COLORS.info} trend={kpis.orders?.trend} prediction={kpis.orders?.prediction}
                    onClick={() => navigate('/orders')} loading={loading} showPredictions={showPredictions}
                  />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <KpiCardPremium 
                    title="Nouveaux clients" value={kpis.clients?.new} icon={<TeamOutlined />} 
                    color={COLORS.purple} trend={kpis.clients?.trend} prediction={kpis.clients?.prediction}
                    onClick={() => navigate('/crm')} loading={loading} showPredictions={showPredictions}
                  />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <KpiCardPremium 
                    title="Alertes" value={kpis.alerts?.total} icon={<WarningOutlined />} 
                    color={COLORS.error} trend={kpis.alerts?.trend}
                    onClick={() => {}} loading={loading} showPredictions={showPredictions}
                  />
                </Col>
              </Row>
            </motion.div>
          )}

          {/* Digital Twins Section - Uniquement si des données existent */}
          {digitalTwins && digitalTwins.twins && digitalTwins.twins.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              style={{ marginBottom: 32 }}
            >
              <Card 
                title={
                  <Space>
                    <div className="section-icon digital-icon"><DeploymentUnitOutlined /></div>
                    <span style={{ fontSize: 18, fontWeight: 600, color: '#000000' }}>Jumeaux Numériques</span>
                    <Tag color="purple" style={{ borderRadius: 20, fontWeight: 500 }}>{digitalTwins.activeTwins || 0} actifs</Tag>
                  </Space>
                } 
                className="digital-twins-card"
                style={{ borderRadius: 28 }}
                extra={
                  <Space size={32}>
                    <Statistic 
                      title={<Text style={{ fontSize: 12, color: '#000000' }}>Synchro/jour</Text>} 
                      value={digitalTwins.totalSync || 0} 
                      valueStyle={{ fontSize: 16, fontWeight: 600, color: '#000000' }} 
                    />
                    <Statistic 
                      title={<Text style={{ fontSize: 12, color: '#000000' }}>Précision IA</Text>} 
                      value={digitalTwins.accuracy || 0} 
                      suffix="%" 
                      valueStyle={{ fontSize: 16, fontWeight: 600, color: COLORS.success }} 
                    />
                  </Space>
                }
              >
                <Row gutter={[20, 20]}>
                  {digitalTwins.twins.map(twin => (
                    <Col xs={24} md={12} key={twin.id}>
                      <DigitalTwinCard 
                        twin={twin} 
                        onSync={(e) => syncDigitalTwin(twin.id, e)}
                        onClick={() => openTwinModal(twin)}
                        showPredictions={showPredictions}
                      />
                    </Col>
                  ))}
                </Row>
              </Card>
            </motion.div>
          )}

          {/* Charts & Health Section */}
          <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
            <Col xs={24} lg={16}>
              <motion.div variants={ANIMATION_VARIANTS.fadeInLeft} initial="hidden" animate="visible">
                <Card 
                  title={
                    <Space>
                      <div className="section-icon chart-icon"><LineChartOutlined /></div>
                      <span style={{ fontSize: 18, fontWeight: 600, color: '#000000' }}>Évolution des ventes</span>
                    </Space>
                  } 
                  className="chart-card"
                  extra={<Tag style={{ borderRadius: 20 }}>6 derniers mois</Tag>}
                >
                  {chartData.length > 0 ? (
                    <Line {...chartConfig} height={360} />
                  ) : (
                    <div style={{ height: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Empty description="Aucune donnée disponible" />
                    </div>
                  )}
                </Card>
              </motion.div>
            </Col>
            <Col xs={24} lg={8}>
              <motion.div variants={ANIMATION_VARIANTS.fadeInRight} initial="hidden" animate="visible">
                <Card 
                  title={
                    <Space>
                      <div className="section-icon health-icon"><TrophyOutlined /></div>
                      <span style={{ fontSize: 18, fontWeight: 600, color: '#000000' }}>Santé de l'entreprise</span>
                    </Space>
                  } 
                  className="health-card"
                >
                  <HealthGaugePremium score={health.score} />
                  <Divider style={{ margin: '24px 0 16px' }} />
                  <Row gutter={[16, 20]}>
                    {Object.entries(health.metrics || {}).map(([key, value], idx) => (
                      <Col span={12} key={key}>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          onMouseEnter={() => setHoveredMetric(key)}
                          onMouseLeave={() => setHoveredMetric(null)}
                          className="metric-item"
                          style={{ textAlign: 'center', cursor: 'pointer', padding: '8px', borderRadius: 16, transition: 'all 0.3s' }}
                        >
                          <Text style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 500, color: '#000000' }}>{key}</Text>
                          <motion.div
                            animate={hoveredMetric === key ? { scale: 1.05 } : { scale: 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Text strong style={{ 
                              fontSize: 28, 
                              display: 'block', 
                              marginTop: 4,
                              color: value >= 70 ? COLORS.success : value >= 50 ? COLORS.warning : COLORS.error,
                              fontFamily: 'monospace'
                            }}>
                              {value || 0}%
                            </Text>
                          </motion.div>
                          <Progress 
                            percent={value || 0} 
                            showInfo={false} 
                            strokeColor={value >= 70 ? COLORS.success : COLORS.warning} 
                            size="small" 
                            style={{ marginTop: 8, width: '80%' }}
                          />
                        </motion.div>
                      </Col>
                    ))}
                  </Row>
                </Card>
              </motion.div>
            </Col>
          </Row>

          {/* Modules & Activities */}
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <motion.div variants={ANIMATION_VARIANTS.fadeInLeft} initial="hidden" animate="visible" transition={{ delay: 0.3 }}>
                <Card 
                  title={
                    <Space>
                      <div className="section-icon modules-icon"><AppstoreOutlined /></div>
                      <span style={{ fontSize: 18, fontWeight: 600, color: '#000000' }}>Modules actifs</span>
                    </Space>
                  } 
                  className="modules-card"
                  extra={<Tag style={{ borderRadius: 20 }}>{modules.length} modules</Tag>}
                >
                  <div style={{ maxHeight: 440, overflowY: 'auto', paddingRight: 8 }}>
                    {modules.length > 0 ? (
                      modules.map((mod, idx) => (
                        <ModuleGridCard key={idx} module={{ ...mod, order: idx }} onClick={() => navigate(`/${mod.name.toLowerCase()}`)} showPredictions={showPredictions} />
                      ))
                    ) : (
                      <Empty description="Aucun module actif" />
                    )}
                  </div>
                </Card>
              </motion.div>
            </Col>
            <Col xs={24} lg={12}>
              <motion.div variants={ANIMATION_VARIANTS.fadeInRight} initial="hidden" animate="visible" transition={{ delay: 0.3 }}>
                <Card 
                  title={
                    <Space>
                      <div className="section-icon activity-icon"><ClockCircleOutlined /></div>
                      <span style={{ fontSize: 18, fontWeight: 600, color: '#000000' }}>Activités récentes</span>
                    </Space>
                  } 
                  className="activities-card"
                  extra={<Tag style={{ borderRadius: 20 }}>Temps réel</Tag>}
                >
                  <div style={{ maxHeight: 440, overflowY: 'auto', paddingRight: 8 }}>
                    {activities.length > 0 ? (
                      activities.slice(0, 10).map((act, idx) => (
                        <ActivityTimeline key={act.id} activity={act} index={idx} />
                      ))
                    ) : (
                      <Empty description="Aucune activité récente" />
                    )}
                  </div>
                </Card>
              </motion.div>
            </Col>
          </Row>
        </div>

        {/* Modal Digital Twin */}
        <Modal
          title={
            <Space>
              <DeploymentUnitOutlined style={{ color: COLORS.purple, fontSize: 20 }} />
              <span style={{ fontSize: 18, fontWeight: 600, color: '#000000' }}>{selectedTwin?.name || 'Détails du jumeau'}</span>
            </Space>
          }
          open={twinModalVisible}
          onCancel={() => {
            setTwinModalVisible(false);
            setSelectedTwin(null);
          }}
          footer={null}
          width={580}
          className="digital-twin-modal"
        >
          {selectedTwin ? (
            <>
              <Descriptions column={2} bordered size="small" className="twin-descriptions">
                <Descriptions.Item label="Statut" labelStyle={{ color: '#000000' }}>
                  <Tag color={selectedTwin.status === 'synced' ? 'success' : 'warning'} style={{ borderRadius: 20 }}>
                    {selectedTwin.status === 'synced' ? 'Synchronisé' : 'Actif'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Précision IA" labelStyle={{ color: '#000000' }}>{selectedTwin.accuracy}%</Descriptions.Item>
                <Descriptions.Item label="Dernière synchronisation" span={2} labelStyle={{ color: '#000000' }}>
                  {dayjs(selectedTwin.lastSync).format('DD/MM/YYYY HH:mm:ss')}
                </Descriptions.Item>
                <Descriptions.Item label="Valeur actuelle" span={2} labelStyle={{ color: '#000000' }}>
                  <Text strong style={{ fontSize: 16, color: '#000000' }}>{selectedTwin.data}</Text>
                </Descriptions.Item>
                {showPredictions && selectedTwin.prediction && (
                  <Descriptions.Item label="Prédiction IA" span={2} labelStyle={{ color: '#000000' }}>
                    <Tag color="purple" icon={<LineChartOutlined />} style={{ borderRadius: 20, padding: '4px 12px' }}>
                      {selectedTwin.prediction}
                    </Tag>
                  </Descriptions.Item>
                )}
              </Descriptions>
              
              <Divider />
              
              <div style={{ textAlign: 'center' }}>
                <Button 
                  type="primary" 
                  icon={<SyncOutlined />} 
                  onClick={(e) => syncDigitalTwin(selectedTwin.id, e)}
                  size="large"
                  className="sync-button"
                >
                  Synchroniser maintenant
                </Button>
              </div>
            </>
          ) : (
            <Empty description="Aucune donnée disponible" />
          )}
        </Modal>

        {/* Float Buttons */}
        <FloatButton.Group shape="circle" className="float-buttons">
          <FloatButton 
            icon={showPredictions ? <EyeOutlined /> : <EyeInvisibleOutlined />} 
            onClick={togglePredictions}
            tooltip={showPredictions ? "Masquer les prédictions IA" : "Afficher les prédictions IA"}
          />
          <FloatButton icon={<ReloadOutlined />} onClick={refreshData} tooltip="Actualiser" />
          <FloatButton icon={<DeploymentUnitOutlined />} onClick={() => setTwinModalVisible(true)} tooltip="Digital Twins" />
          <FloatButton.BackTop visibilityHeight={400} />
        </FloatButton.Group>
      </div>
    </ConfigProvider>
  );
};

export default ProjectDashboard;