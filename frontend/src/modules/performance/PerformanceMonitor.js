// frontend/src/modules/monitoring/PerformanceMonitor.js - Version Sombre Premium (Corrigée)

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Row, Col, Table, Tag, Space, Progress, Tabs, 
  Alert, Button, Spin, Badge, Modal, Descriptions, Switch, 
  message, Empty, Typography, Select
} from 'antd';
import { 
  ThunderboltOutlined, WarningOutlined, CheckCircleOutlined,
  ClockCircleOutlined, ApiOutlined, DatabaseOutlined, SettingOutlined,
  ReloadOutlined, SafetyOutlined, EyeOutlined, AlertOutlined, 
  SecurityScanOutlined, HddOutlined, LineChartOutlined, DashboardOutlined, 
  BellOutlined, FireOutlined, InfoCircleOutlined, ExclamationCircleOutlined,
  CloudOutlined, WifiOutlined, BugOutlined, ToolOutlined,
  GlobalOutlined, RocketOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';
import { Line, Gauge } from '@ant-design/plots';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';

dayjs.extend(relativeTime);
dayjs.locale('fr');

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// ============================================
// CONFIGURATION AVANCÉE
// ============================================

const COLORS = {
  primary: '#667eea',
  primaryLight: '#818cf8',
  primaryDark: '#4f46e5',
  success: '#52c41a',
  successLight: '#95de64',
  warning: '#faad14',
  warningLight: '#ffc53d',
  danger: '#ff4d4f',
  dangerLight: '#ff7875',
  cyan: '#13c2c2',
  purple: '#722ed1',
  gold: '#faad14',
  darkBg: '#0a0a0f',
  darkCard: '#14141e',
  darkCardHover: '#1a1a2e',
  darkBorder: '#2a2a3a',
  darkBorderLight: 'rgba(255,255,255,0.06)',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
};

const GRADIENTS = {
  header: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #2d1b69 100%)',
  card: 'linear-gradient(135deg, rgba(20,20,30,0.8) 0%, rgba(30,30,50,0.6) 100%)',
  success: 'linear-gradient(135deg, #52c41a 0%, #389e0d 100%)',
  warning: 'linear-gradient(135deg, #faad14 0%, #d48806 100%)',
  danger: 'linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)',
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  cyan: 'linear-gradient(135deg, #13c2c2 0%, #08979c 100%)',
};

const STYLES = {
  gradientHeader: {
    background: GRADIENTS.header,
    borderRadius: 24,
    border: '1px solid rgba(255, 255, 255, 0.05)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
  },
  statCard: {
    background: 'rgba(20, 20, 30, 0.6)',
    backdropFilter: 'blur(8px)',
    borderRadius: 16,
    border: '1px solid rgba(255, 255, 255, 0.06)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    cursor: 'pointer',
    overflow: 'hidden',
    position: 'relative',
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 700,
    letterSpacing: '-0.5px',
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  metricLabel: {
    fontSize: 13,
    color: '#8c8c8c',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 500,
  },
  tabCard: {
    borderRadius: 24,
    background: COLORS.darkCard,
    border: `1px solid ${COLORS.darkBorder}`,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
  }
};

// ============================================
// UTILITAIRES AVANCÉS
// ============================================

const safeNumber = (num, defaultValue = 0) => {
  if (typeof num === 'number' && !isNaN(num)) return num;
  if (num === null || num === undefined) return defaultValue;
  const parsed = parseFloat(num);
  return isNaN(parsed) ? defaultValue : parsed;
};

const getMetricColor = (value, thresholds = { warning: 70, critical: 85 }) => {
  if (value >= thresholds.critical) return COLORS.danger;
  if (value >= thresholds.warning) return COLORS.warning;
  return COLORS.success;
};

const getSeverityConfig = (severity) => {
  const configs = {
    critical: { color: COLORS.danger, gradient: GRADIENTS.danger, icon: <FireOutlined />, label: 'Critique', level: 4 },
    high: { color: COLORS.warning, gradient: GRADIENTS.warning, icon: <WarningOutlined />, label: 'Élevée', level: 3 },
    medium: { color: '#fa8c16', gradient: 'linear-gradient(135deg, #fa8c16 0%, #d48806 100%)', icon: <AlertOutlined />, label: 'Moyenne', level: 2 },
    low: { color: COLORS.success, gradient: GRADIENTS.success, icon: <InfoCircleOutlined />, label: 'Basse', level: 1 },
    info: { color: COLORS.primary, gradient: GRADIENTS.primary, icon: <InfoCircleOutlined />, label: 'Info', level: 0 }
  };
  return configs[severity] || configs.info;
};

const formatTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  return dayjs(timestamp).fromNow();
};

const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  return dayjs(timestamp).format('DD/MM/YYYY HH:mm:ss');
};

const generateMockHistory = (hours = 24) => {
  const history = [];
  const now = new Date();
  for (let i = hours - 1; i >= 0; i--) {
    const hour = new Date(now.getTime() - i * 3600000);
    history.push({
      time: hour.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      cpu: 30 + Math.sin(i / 3) * 20 + Math.random() * 15,
      memory: 45 + Math.sin(i / 4) * 15 + Math.random() * 15,
      network: 20 + Math.sin(i / 5) * 10 + Math.random() * 10,
      disk: 35 + Math.sin(i / 6) * 12 + Math.random() * 8,
    });
  }
  return history;
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const PerformanceMonitor = () => {
  // États
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [metrics, setMetrics] = useState({ cpu: 0, memory: 0, disk: 0, response_time: 0, network: 0 });
  const [history, setHistory] = useState([]);
  const [services, setServices] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [alertRules, setAlertRules] = useState([]);
  const [dashboards, setDashboards] = useState([]);
  const [securityAlerts, setSecurityAlerts] = useState([]);
  const [systemHealth, setSystemHealth] = useState({ status: 'healthy', score: 95 });
  
  const [activeTab, setActiveTab] = useState('performance');
  const [autoDetect, setAutoDetect] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [alertModalVisible, setAlertModalVisible] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [hoveredCard, setHoveredCard] = useState(null);

  // ============================================
  // DONNÉES
  // ============================================

  const fetchAllData = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    setLoading(true);

    try {
      const [metricsRes, securityRes] = await Promise.allSettled([
        api.get('/performance/metrics'),
        api.get('/security/alerts')
      ]);

      if (metricsRes.status === 'fulfilled' && metricsRes.value) {
        const data = metricsRes.value;
        setMetrics({
          cpu: safeNumber(data.cpu),
          memory: safeNumber(data.memory),
          disk: safeNumber(data.disk),
          response_time: safeNumber(data.response_time),
          network: safeNumber(data.network, 25)
        });
      }

      if (securityRes.status === 'fulfilled') {
        const data = securityRes.value?.alerts || securityRes.value?.data || [];
        setSecurityAlerts(Array.isArray(data) ? data : []);
      }

      const hours = timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 720;
      const mockHistory = generateMockHistory(hours);
      setHistory(mockHistory);

      setServices([
        { id: 1, service_name: 'API Gateway', status: 'opérationnel', response_time: 45, uptime: 99.99, load: 32, endpoint: '/api/v1' },
        { id: 2, service_name: 'Base de données', status: 'opérationnel', response_time: 12, uptime: 99.95, load: 28, endpoint: 'db:5432' },
        { id: 3, service_name: 'Anti-Fraude IA', status: 'opérationnel', response_time: 89, uptime: 99.92, load: 43, endpoint: 'ai:8080' },
        { id: 4, service_name: 'Blockchain Network', status: 'opérationnel', response_time: 234, uptime: 99.87, load: 56, endpoint: 'bc:8545' },
        { id: 5, service_name: 'Neo4j Graph DB', status: 'opérationnel', response_time: 45, uptime: 99.91, load: 34, endpoint: 'neo4j:7687' },
        { id: 6, service_name: 'Redis Cache', status: 'opérationnel', response_time: 3, uptime: 99.98, load: 12, endpoint: 'redis:6379' },
      ]);

      setAlerts([
        { id: 1, title: 'CPU élevé détecté', severity: 'warning', service: 'API Gateway', created_at: new Date(Date.now() - 300000).toISOString(), description: 'Usage CPU > 80% pendant 5 minutes' },
        { id: 2, title: 'Tentative d\'intrusion', severity: 'critical', service: 'Security', created_at: new Date(Date.now() - 1200000).toISOString(), description: 'Multiple tentatives de connexion échouées depuis IP suspecte' },
        { id: 3, title: 'Latence élevée', severity: 'warning', service: 'Base de données', created_at: new Date(Date.now() - 3600000).toISOString(), description: 'Temps de réponse > 200ms' },
        { id: 4, title: 'Mémoire saturée', severity: 'high', service: 'Neo4j Graph DB', created_at: new Date(Date.now() - 7200000).toISOString(), description: 'Utilisation mémoire > 85%' },
      ]);

      setAlertRules([
        { id: 1, name: 'Alerte CPU', threshold: 80, severity: 'warning', enabled: true },
        { id: 2, name: 'Alerte Mémoire', threshold: 90, severity: 'critical', enabled: true },
        { id: 3, name: 'Alerte Latence', threshold: 200, severity: 'warning', enabled: true },
        { id: 4, name: 'Alerte Disque', threshold: 85, severity: 'high', enabled: true },
        { id: 5, name: 'Alerte Réseau', threshold: 70, severity: 'low', enabled: false },
      ]);

      setDashboards([
        { id: 1, name: 'Vue Globale', status: 'actif', icon: <DashboardOutlined /> },
        { id: 2, name: 'Sécurité', status: 'actif', icon: <SafetyCertificateOutlined /> },
        { id: 3, name: 'IA Performance', status: 'actif', icon: <RocketOutlined /> },
        { id: 4, name: 'Infrastructure', status: 'inactif', icon: <CloudOutlined /> },
      ]);

      setSystemHealth({ status: 'healthy', score: 95 });

    } catch (error) {
      console.error('Erreur chargement:', error);
      message.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  }, [timeRange]);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(() => {
      if (autoDetect) fetchAllData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoDetect, timeRange, fetchAllData]);

  // ============================================
  // VALEURS
  // ============================================

  const cpuValue = safeNumber(metrics.cpu);
  const memoryValue = safeNumber(metrics.memory);
  const diskValue = safeNumber(metrics.disk);
  const responseTimeValue = safeNumber(metrics.response_time);
  const networkValue = safeNumber(metrics.network);

  const cpuPercent = Math.min(cpuValue / 100, 1);

  // ============================================
  // CONFIGURATIONS DES GRAPHIQUES
  // ============================================

  const gaugeConfig = {
    percent: cpuPercent,
    range: { 
      color: cpuPercent > 0.8 ? COLORS.danger : cpuPercent > 0.6 ? COLORS.warning : COLORS.success,
      width: 12,
    },
    indicator: { 
      pointer: { style: { stroke: '#D0D0D0', lineWidth: 2 } },
      pin: { style: { fill: '#D0D0D0' } }
    },
    axis: { 
      label: { 
        formatter: (v) => `${Math.round(v * 100)}%`, 
        style: { fill: '#8c8c8c', fontSize: 10 } 
      },
      tickLine: { style: { stroke: '#2a2a3a' } }
    },
    statistic: { 
      content: { 
        style: { fontSize: '28px', fontWeight: 'bold', fill: '#f1f5f9' }, 
        formatter: () => `${Math.round(cpuValue)}%` 
      },
      title: {
        style: { fill: '#8c8c8c', fontSize: 12 },
        formatter: () => 'Utilisation CPU'
      }
    },
    theme: 'dark'
  };

  const chartData = history.length > 0 ? history : generateMockHistory(24);

  const createLineConfig = (yField, color, label) => ({
    data: chartData,
    xField: 'time',
    yField: yField,
    yAxis: { 
      label: { formatter: (v) => `${v}%`, style: { fill: '#8c8c8c' } }, 
      title: { text: label, style: { fill: '#8c8c8c' } },
      grid: { line: { style: { stroke: 'rgba(255,255,255,0.05)' } } }
    },
    xAxis: { 
      title: { text: 'Heure', style: { fill: '#8c8c8c' } }, 
      label: { rotate: -45, style: { fill: '#8c8c8c' } },
      grid: { line: { style: { stroke: 'rgba(255,255,255,0.05)' } } }
    },
    smooth: true,
    line: { color, style: { lineWidth: 2 } },
    area: { style: { fill: `${color}20`, fillOpacity: 0.3 } },
    tooltip: {
      formatter: (datum) => ({ name: label, value: `${Math.round(datum[yField])}%` })
    },
    animation: {
      appear: {
        duration: 1000,
        easing: 'easeOut'
      }
    },
    theme: 'dark'
  });

  // ============================================
  // COLONNES DES TABLEAUX
  // ============================================

  const serviceColumns = [
    { 
      title: 'Service', 
      dataIndex: 'service_name', 
      key: 'service', 
      render: (text, record) => (
        <Space>
          <div style={{ 
            width: 8, 
            height: 8, 
            borderRadius: '50%', 
            background: record.status === 'opérationnel' ? COLORS.success : COLORS.danger,
            boxShadow: `0 0 8px ${record.status === 'opérationnel' ? COLORS.success : COLORS.danger}40`
          }} />
          <ApiOutlined style={{ color: COLORS.primary }} />
          <Text strong style={{ color: COLORS.textPrimary }}>{text}</Text>
        </Space>
      )
    },
    { 
      title: 'Statut', 
      dataIndex: 'status', 
      key: 'status', 
      render: (status) => {
        const isOk = status === 'opérationnel';
        return <Tag color={isOk ? 'success' : 'error'} icon={isOk ? <CheckCircleOutlined /> : <WarningOutlined />}>{status}</Tag>;
      }
    },
    { 
      title: 'Temps réponse', 
      dataIndex: 'response_time', 
      render: (time) => {
        const color = time < 50 ? COLORS.success : time < 200 ? COLORS.warning : COLORS.danger;
        return <Text style={{ color }}>{time} ms</Text>;
      }
    },
    { 
      title: 'Uptime', 
      dataIndex: 'uptime', 
      render: (uptime) => {
        const color = uptime >= 99.9 ? COLORS.success : uptime >= 99.5 ? COLORS.warning : COLORS.danger;
        return <Text style={{ color }}>{uptime}%</Text>;
      }
    },
    { 
      title: 'Charge', 
      dataIndex: 'load', 
      render: (load) => {
        const color = load < 50 ? COLORS.success : load < 75 ? COLORS.warning : COLORS.danger;
        return <Progress percent={load} strokeColor={color} size="small" showInfo={false} style={{ width: 80 }} />;
      }
    },
    {
      title: 'Endpoint',
      dataIndex: 'endpoint',
      render: (text) => <Text code style={{ color: COLORS.textSecondary, fontSize: 11 }}>{text}</Text>
    }
  ];

  const alertRuleColumns = [
    { title: 'Nom', dataIndex: 'name', render: (text) => <Text strong style={{ color: COLORS.textPrimary }}>{text}</Text> },
    { title: 'Seuil', dataIndex: 'threshold', render: (v) => <Tag color="blue">{v}%</Tag> },
    { 
      title: 'Sévérité', 
      dataIndex: 'severity', 
      render: (s) => {
        const config = getSeverityConfig(s);
        return <Tag color={config.color} icon={config.icon}>{config.label}</Tag>;
      }
    },
    {
      title: 'État',
      dataIndex: 'enabled',
      render: (enabled) => (
        <Tag color={enabled ? 'success' : 'default'}>
          {enabled ? <CheckCircleOutlined /> : <ClockCircleOutlined />} {enabled ? 'Actif' : 'Inactif'}
        </Tag>
      )
    }
  ];

  // ============================================
  // RENDU
  // ============================================

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        background: COLORS.darkBg 
      }}>
        <Spin size="large" />
        <Text style={{ color: COLORS.textSecondary, marginTop: 16 }}>Chargement du moniteur...</Text>
      </div>
    );
  }

  const tabItems = [
    {
      key: 'performance',
      label: <span style={{ color: COLORS.textPrimary }}><DashboardOutlined /> Performance</span>,
      children: (
        <div style={{ padding: 24 }}>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={8}>
              <Card 
                title="CPU en temps réel" 
                style={{ 
                  borderRadius: 16, 
                  background: COLORS.darkCard,
                  border: `1px solid ${COLORS.darkBorder}`
                }}
                headStyle={{ color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.darkBorder}` }}
              >
                <Gauge {...gaugeConfig} height={220} />
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>
                    <ClockCircleOutlined /> Dernière mise à jour: {new Date().toLocaleTimeString()}
                  </Text>
                </div>
              </Card>
            </Col>
            <Col xs={24} md={16}>
              <Card 
                title="Historique CPU" 
                style={{ 
                  borderRadius: 16, 
                  background: COLORS.darkCard,
                  border: `1px solid ${COLORS.darkBorder}`
                }}
                headStyle={{ color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.darkBorder}` }}
              >
                <Line {...createLineConfig('cpu', COLORS.primary, 'CPU %')} height={240} />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card 
                title="Historique Mémoire" 
                style={{ 
                  borderRadius: 16, 
                  background: COLORS.darkCard,
                  border: `1px solid ${COLORS.darkBorder}`
                }}
                headStyle={{ color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.darkBorder}` }}
              >
                <Line {...createLineConfig('memory', COLORS.cyan, 'Mémoire %')} height={200} />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card 
                title="Historique Réseau" 
                style={{ 
                  borderRadius: 16, 
                  background: COLORS.darkCard,
                  border: `1px solid ${COLORS.darkBorder}`
                }}
                headStyle={{ color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.darkBorder}` }}
              >
                <Line {...createLineConfig('network', COLORS.purple, 'Réseau %')} height={200} />
              </Card>
            </Col>
            <Col xs={24}>
              <Card 
                title="Services surveillés" 
                style={{ 
                  borderRadius: 16, 
                  background: COLORS.darkCard,
                  border: `1px solid ${COLORS.darkBorder}`
                }}
                headStyle={{ color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.darkBorder}` }}
              >
                <Table 
                  columns={serviceColumns} 
                  dataSource={services} 
                  rowKey="id" 
                  pagination={false}
                  style={{ background: 'transparent' }}
                  rowClassName={() => 'service-row'}
                />
              </Card>
            </Col>
          </Row>
        </div>
      )
    },
    {
      key: 'alerts',
      label: <span style={{ color: COLORS.textPrimary }}><BellOutlined /> Alertes ({alerts.length})</span>,
      children: (
        <div style={{ padding: 24 }}>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Card 
                title="Règles d'alerte" 
                style={{ 
                  borderRadius: 16, 
                  background: COLORS.darkCard,
                  border: `1px solid ${COLORS.darkBorder}`
                }}
                headStyle={{ color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.darkBorder}` }}
              >
                <Table 
                  columns={alertRuleColumns} 
                  dataSource={alertRules} 
                  rowKey="id" 
                  pagination={false}
                  style={{ background: 'transparent' }}
                />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card 
                title="État du système" 
                style={{ 
                  borderRadius: 16, 
                  background: COLORS.darkCard,
                  border: `1px solid ${COLORS.darkBorder}`
                }}
                headStyle={{ color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.darkBorder}` }}
              >
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ 
                    width: 100, 
                    height: 100, 
                    borderRadius: '50%', 
                    background: `conic-gradient(${COLORS.success} ${systemHealth.score}%, ${COLORS.darkBorder} 0%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px'
                  }}>
                    <div style={{ 
                      width: 80, 
                      height: 80, 
                      borderRadius: '50%', 
                      background: COLORS.darkCard,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 28,
                      color: COLORS.textPrimary,
                      fontWeight: 'bold'
                    }}>
                      {systemHealth.score}%
                    </div>
                  </div>
                  <Tag color="success" icon={<CheckCircleOutlined />} style={{ fontSize: 16, padding: '4px 16px' }}>
                    Système opérationnel
                  </Tag>
                  <Paragraph style={{ color: COLORS.textSecondary, marginTop: 12 }}>
                    Tous les services sont fonctionnels
                  </Paragraph>
                </div>
              </Card>
            </Col>
            <Col xs={24}>
              <Card 
                title="Historique des alertes" 
                style={{ 
                  borderRadius: 16, 
                  background: COLORS.darkCard,
                  border: `1px solid ${COLORS.darkBorder}`
                }}
                headStyle={{ color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.darkBorder}` }}
              >
                <Table 
                  dataSource={alerts}
                  rowKey="id"
                  pagination={{ pageSize: 10 }}
                  style={{ background: 'transparent' }}
                  columns={[
                    { 
                      title: 'Niveau', 
                      dataIndex: 'severity', 
                      render: (s) => {
                        const c = getSeverityConfig(s);
                        return <Tag color={c.color} icon={c.icon}>{c.label}</Tag>;
                      }
                    },
                    { 
                      title: 'Titre', 
                      dataIndex: 'title',
                      render: (text) => <Text style={{ color: COLORS.textPrimary }}>{text}</Text>
                    },
                    { 
                      title: 'Service', 
                      dataIndex: 'service',
                      render: (text) => <Tag color="blue">{text}</Tag>
                    },
                    { 
                      title: 'Description', 
                      dataIndex: 'description',
                      render: (text) => <Text style={{ color: COLORS.textSecondary }}>{text || '-'}</Text>
                    },
                    { 
                      title: 'Date', 
                      dataIndex: 'created_at', 
                      render: (d) => d ? formatDate(d) : '-'
                    },
                    {
                      title: 'Action',
                      render: (_, record) => (
                        <Button 
                          icon={<EyeOutlined />} 
                          size="small" 
                          onClick={() => { 
                            setSelectedAlert(record); 
                            setAlertModalVisible(true); 
                          }}
                          style={{ color: COLORS.primary }}
                        />
                      )
                    }
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </div>
      )
    },
    {
      key: 'dashboards',
      label: <span style={{ color: COLORS.textPrimary }}><LineChartOutlined /> Dashboards</span>,
      children: (
        <div style={{ padding: 24 }}>
          <Card 
            title="Dashboards personnalisés" 
            style={{ 
              borderRadius: 16, 
              background: COLORS.darkCard,
              border: `1px solid ${COLORS.darkBorder}`
            }}
            headStyle={{ color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.darkBorder}` }}
          >
            <Row gutter={[16, 16]}>
              {dashboards.map((d, index) => (
                <Col xs={24} sm={12} lg={6} key={d.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -8, scale: 1.02 }}
                  >
                    <Card 
                      hoverable 
                      style={{ 
                        textAlign: 'center', 
                        background: COLORS.darkCard,
                        borderRadius: 16,
                        border: `1px solid ${COLORS.darkBorder}`,
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={() => setHoveredCard(d.id)}
                      onMouseLeave={() => setHoveredCard(null)}
                    >
                      <div style={{ 
                        fontSize: 48, 
                        marginBottom: 12,
                        color: d.status === 'actif' ? COLORS.primary : COLORS.textMuted
                      }}>
                        {d.icon}
                      </div>
                      <Text strong style={{ color: COLORS.textPrimary }}>{d.name}</Text>
                      <br />
                      <Tag color={d.status === 'actif' ? 'success' : 'default'} style={{ marginTop: 8 }}>
                        {d.status === 'actif' ? <CheckCircleOutlined /> : <ClockCircleOutlined />} {d.status}
                      </Tag>
                    </Card>
                  </motion.div>
                </Col>
              ))}
            </Row>
          </Card>
        </div>
      )
    },
    {
      key: 'security',
      label: <span style={{ color: COLORS.textPrimary }}><SecurityScanOutlined /> Sécurité ({securityAlerts.length})</span>,
      children: (
        <div style={{ padding: 24 }}>
          <Card 
            title="Alertes de sécurité" 
            style={{ 
              borderRadius: 16, 
              background: COLORS.darkCard,
              border: `1px solid ${COLORS.darkBorder}`
            }}
            headStyle={{ color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.darkBorder}` }}
          >
            {securityAlerts.length === 0 ? (
              <Empty 
                description={<Text style={{ color: COLORS.textSecondary }}>Aucune alerte de sécurité</Text>}
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" icon={<SafetyCertificateOutlined />}>Vérifier maintenant</Button>
              </Empty>
            ) : (
              <Table 
                dataSource={securityAlerts}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                style={{ background: 'transparent' }}
                columns={[
                  { 
                    title: 'Sévérité', 
                    dataIndex: 'severity', 
                    render: (s) => {
                      const c = getSeverityConfig(s);
                      return <Tag color={c.color} icon={c.icon}>{c.label}</Tag>;
                    }
                  },
                  { 
                    title: 'Type', 
                    dataIndex: 'event_type',
                    render: (text) => <Tag color="purple">{text}</Tag>
                  },
                  { 
                    title: 'Source', 
                    dataIndex: 'source_ip',
                    render: (text) => <Text code style={{ color: COLORS.textSecondary }}>{text}</Text>
                  },
                  { 
                    title: 'Description', 
                    dataIndex: 'description',
                    render: (text) => <Text style={{ color: COLORS.textSecondary }}>{text}</Text>
                  },
                  { 
                    title: 'Date', 
                    dataIndex: 'created_at', 
                    render: (d) => d ? formatDate(d) : '-'
                  },
                  {
                    title: 'Action',
                    render: (_, record) => (
                      <Button 
                        icon={<EyeOutlined />} 
                        size="small" 
                        onClick={() => { 
                          setSelectedAlert(record); 
                          setAlertModalVisible(true); 
                        }}
                        style={{ color: COLORS.primary }}
                      />
                    )
                  }
                ]}
              />
            )}
          </Card>
        </div>
      )
    }
  ];

  return (
    <div style={{ padding: 24, background: COLORS.darkBg, minHeight: '100vh' }}>
      {/* Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        style={STYLES.gradientHeader}
        transition={{ duration: 0.5 }}
      >
        <div style={{ padding: '20px 28px' }}>
          <Row align="middle" justify="space-between" gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Space size="large" wrap>
                <div style={{ 
                  width: 56, 
                  height: 56, 
                  background: 'rgba(102,126,234,0.2)', 
                  borderRadius: 16, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  border: '1px solid rgba(102,126,234,0.2)'
                }}>
                  <ThunderboltOutlined style={{ fontSize: 28, color: COLORS.primary }} />
                </div>
                <div>
                  <Title level={2} style={{ color: '#f1f5f9', margin: 0, fontSize: 24 }}>
                    Security & Performance Monitor
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.6)' }}>
                    Surveillance temps réel - {new Date().toLocaleDateString('fr-FR', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </Text>
                </div>
              </Space>
            </Col>
            <Col xs={24} md={12}>
              <Space wrap size="middle" style={{ justifyContent: 'flex-end', width: '100%' }}>
                <Select 
                  value={timeRange} 
                  onChange={setTimeRange} 
                  style={{ width: 120 }}
                  dropdownStyle={{ background: COLORS.darkCard }}
                >
                  <Option value="24h">📊 24h</Option>
                  <Option value="7d">📈 7 jours</Option>
                  <Option value="30d">📉 30 jours</Option>
                </Select>
                <Space>
                  <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Auto</Text>
                  <Switch 
                    checked={autoDetect} 
                    onChange={setAutoDetect} 
                    checkedChildren={<RocketOutlined />} 
                    unCheckedChildren={<ClockCircleOutlined />} 
                  />
                </Space>
                <Button 
                  icon={<ReloadOutlined spin={refreshing} />} 
                  onClick={() => fetchAllData(true)} 
                  loading={refreshing}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${COLORS.darkBorder}`,
                    color: COLORS.textPrimary
                  }}
                >
                  Actualiser
                </Button>
              </Space>
            </Col>
          </Row>
        </div>
      </motion.div>

      {/* KPIs */}
      <Row gutter={[16, 16]} style={{ margin: '24px 0' }}>
        <Col xs={12} sm={6}>
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card style={STYLES.statCard}>
              <Text style={STYLES.metricLabel}>CPU</Text>
              <div style={{ ...STYLES.metricValue, color: getMetricColor(cpuValue) }}>
                {Math.round(cpuValue)}%
              </div>
              <Progress 
                percent={Math.round(cpuValue)} 
                strokeColor={getMetricColor(cpuValue)} 
                showInfo={false}
                style={{ marginTop: 8 }}
              />
            </Card>
          </motion.div>
        </Col>
        <Col xs={12} sm={6}>
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card style={STYLES.statCard}>
              <Text style={STYLES.metricLabel}>Mémoire</Text>
              <div style={{ ...STYLES.metricValue, color: getMetricColor(memoryValue, {warning:75, critical:90}) }}>
                {Math.round(memoryValue)}%
              </div>
              <Progress 
                percent={Math.round(memoryValue)} 
                strokeColor={getMetricColor(memoryValue, {warning:75, critical:90})} 
                showInfo={false}
                style={{ marginTop: 8 }}
              />
            </Card>
          </motion.div>
        </Col>
        <Col xs={12} sm={6}>
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card style={STYLES.statCard}>
              <Text style={STYLES.metricLabel}>Disque</Text>
              <div style={{ ...STYLES.metricValue, color: getMetricColor(diskValue, {warning:80, critical:95}) }}>
                {Math.round(diskValue)}%
              </div>
              <Progress 
                percent={Math.round(diskValue)} 
                strokeColor={getMetricColor(diskValue, {warning:80, critical:95})} 
                showInfo={false}
                style={{ marginTop: 8 }}
              />
            </Card>
          </motion.div>
        </Col>
        <Col xs={12} sm={6}>
          <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
            <Card style={STYLES.statCard}>
              <Text style={STYLES.metricLabel}>Réponse</Text>
              <div style={{ ...STYLES.metricValue, color: getMetricColor(responseTimeValue, {warning:300, critical:500}) }}>
                {Math.round(responseTimeValue)} ms
              </div>
              <div style={{ marginTop: 8 }}>
                <Tag color={responseTimeValue < 200 ? 'success' : responseTimeValue < 400 ? 'warning' : 'error'}>
                  {responseTimeValue < 200 ? 'Rapide' : responseTimeValue < 400 ? 'Moyen' : 'Lent'}
                </Tag>
              </div>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Main Content */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
      >
        <Card 
          style={{ 
            borderRadius: 24, 
            background: COLORS.darkCard, 
            border: `1px solid ${COLORS.darkBorder}`,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
          }} 
          bodyStyle={{ padding: 0 }}
        >
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab} 
            items={tabItems} 
            size="large"
            style={{ padding: '0 8px' }}
            tabBarStyle={{ 
              padding: '0 16px',
              marginBottom: 0,
              borderBottom: `1px solid ${COLORS.darkBorder}`
            }}
          />
        </Card>
      </motion.div>

      {/* Modal Détails Alerte */}
      <Modal 
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: COLORS.warning }} />
            <Text strong style={{ color: COLORS.textPrimary }}>Détails de l'alerte</Text>
          </Space>
        }
        open={alertModalVisible} 
        onCancel={() => setAlertModalVisible(false)} 
        footer={[
          <Button key="close" onClick={() => setAlertModalVisible(false)}>
            Fermer
          </Button>
        ]}
        style={{ top: 20 }}
        bodyStyle={{ background: COLORS.darkBg }}
      >
        {selectedAlert && (
          <Descriptions 
            bordered 
            column={1}
            style={{ background: COLORS.darkCard }}
            labelStyle={{ color: COLORS.textSecondary, background: 'rgba(255,255,255,0.03)' }}
            contentStyle={{ color: COLORS.textPrimary }}
          >
            <Descriptions.Item label="Sévérité">
              <Tag color={getSeverityConfig(selectedAlert.severity).color} icon={getSeverityConfig(selectedAlert.severity).icon}>
                {getSeverityConfig(selectedAlert.severity).label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Titre">{selectedAlert.title}</Descriptions.Item>
            <Descriptions.Item label="Service">
              <Tag color="blue">{selectedAlert.service || 'N/A'}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Description">
              {selectedAlert.description || selectedAlert.title || 'Aucune description'}
            </Descriptions.Item>
            <Descriptions.Item label="Date de création">
              {formatDate(selectedAlert.created_at)}
            </Descriptions.Item>
            <Descriptions.Item label="Statut">
              <Tag color="warning">En cours</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* CSS personnalisé pour les tableaux */}
      <style jsx="true">{`
        .service-row:hover {
          background: rgba(255, 255, 255, 0.02);
        }
        .ant-table-tbody > tr > td {
          border-bottom: 1px solid ${COLORS.darkBorder} !important;
          padding: 12px 16px !important;
        }
        .ant-table-thead > tr > th {
          background: rgba(255, 255, 255, 0.03) !important;
          border-bottom: 1px solid ${COLORS.darkBorder} !important;
          color: ${COLORS.textSecondary} !important;
        }
        .ant-tabs-tab {
          padding: 16px 20px !important;
        }
        .ant-tabs-tab-active {
          background: rgba(102, 126, 234, 0.08) !important;
          border-radius: 8px 8px 0 0 !important;
        }
      `}</style>
    </div>
  );
};

export default PerformanceMonitor;