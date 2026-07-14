// InsuranceDashboard.js - Version Premium Nexum v4.0 - Design Amélioré (CORRIGÉ)
import React, { useState, useEffect, useCallback } from 'react';
import useWebSocket from '../../hooks/useWebSocket';
import { useNavigate } from 'react-router-dom';
import { 
  Card, Row, Col, Statistic, Button, Space, 
  Tag, Badge, Avatar, Modal, message, Table,
  Spin, Typography, Empty, Drawer, List, Alert,
  Progress, Tooltip, Segmented, Pagination
} from 'antd';
import { 
  InsuranceOutlined, SafetyCertificateOutlined, ReloadOutlined,
  WarningOutlined, EuroOutlined, FileProtectOutlined,
  CloudOutlined, RobotOutlined, ExportOutlined,
  BellOutlined, MessageOutlined, CameraOutlined,
  DiscordOutlined, DeleteOutlined, CheckCircleOutlined,
  CloseCircleOutlined, HistoryOutlined, EyeOutlined,
  DashboardOutlined, ThunderboltOutlined,
  RiseOutlined, TrophyOutlined,
  ClockCircleOutlined,
  CarOutlined, HomeOutlined, HeartOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import { Line, Pie } from '@ant-design/charts';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import './InsuranceDashboard.css';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';

dayjs.extend(relativeTime);
dayjs.locale('fr');

const { Title, Text } = Typography;

// Clé pour localStorage
const NOTIFICATIONS_STORAGE_KEY = 'insurance_notifications_history';

const InsuranceDashboard = () => {
  const navigate = useNavigate();
  const { theme: currentTheme } = useTheme();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [discordClaims, setDiscordClaims] = useState([]);
  const [discordNotifications, setDiscordNotifications] = useState([]);
  const [notificationDrawerVisible, setNotificationDrawerVisible] = useState(false);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);
  const [lastNotifId, setLastNotifId] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [claimDetailVisible, setClaimDetailVisible] = useState(false);
  const [claimsStats, setClaimsStats] = useState(null);
  const [claimTypesStats, setClaimTypesStats] = useState([]);
  const [processingSteps, setProcessingSteps] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [portfolio, setPortfolio] = useState({
    total_contracts: 1250,
    total_premiums: 2340000,
    loss_ratio: 32.5,
    claims_count: 0,
    satisfaction_rate: 94.2,
    avg_response_time: 2.4,
    fraud_detection_rate: 98.4
  });

  // Charger l'historique depuis localStorage
  const loadNotificationHistory = useCallback(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotificationHistory(parsed);
        const maxId = Math.max(...parsed.map(n => n.id || 0), 0);
        setLastNotifId(maxId);
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  }, []);

  // Sauvegarder l'historique
  const saveNotificationHistory = useCallback((notifications) => {
    try {
      const limited = notifications.slice(0, 500);
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(limited));
    } catch (error) {
      console.error('Erreur sauvegarde historique:', error);
    }
  }, []);

  // Ajouter une notification à l'historique
  const addToHistory = useCallback((title, message, type, source, data = {}) => {
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
    setNotificationHistory(prev => {
      const updated = [historyItem, ...prev];
      saveNotificationHistory(updated);
      return updated;
    });
    return historyItem;
  }, [saveNotificationHistory]);

  // Marquer une notification comme lue
  const markAsRead = useCallback((notificationId) => {
    setNotificationHistory(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  }, []);

  // Marquer toutes comme lues
  const markAllAsRead = useCallback(() => {
    setNotificationHistory(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
    setDiscordNotifications(prev => prev.map(n => ({ ...n, read: true })));
    message.success('Toutes les notifications marquées comme lues');
  }, []);

  // Effacer l'historique
  const clearHistory = useCallback(() => {
    Modal.confirm({
      title: 'Effacer l\'historique',
      content: 'Êtes-vous sûr de vouloir effacer tout l\'historique des notifications ?',
      okText: 'Oui',
      cancelText: 'Non',
      okButtonProps: { danger: true },
      onOk: () => {
        setNotificationHistory([]);
        saveNotificationHistory([]);
        message.success('Historique effacé');
      }
    });
  }, [saveNotificationHistory]);

  // Helper pour les labels des types
  const getClaimTypeLabel = (type) => {
    const labels = {
      'accident_declaration': 'Auto',
      'home_claim': 'Habitation',
      'health_claim': 'Santé',
      'agricole_claim': 'Agricole',
      'unknown': 'Autre'
    };
    return labels[type] || type || 'Autre';
  };

  // Helper pour les couleurs des types
  const getClaimTypeColor = (type) => {
    const colors = {
      'accident_declaration': '#ef4444',
      'home_claim': '#10b981',
      'health_claim': '#10b981',
      'agricole_claim': '#475569',
      'unknown': '#6b7280'
    };
    return colors[type] || '#3b82f6';
  };

  // Récupérer les sinistres Discord
  const fetchDiscordClaims = useCallback(async () => {
    try {
      const response = await api.get(`/insurance/claims/discord`);
      const claims = response.data?.claims || [];
      setDiscordClaims(claims);
      setPortfolio(prev => ({ ...prev, claims_count: claims.length }));
      
      const typesCount = {};
      claims.forEach(claim => {
        const type = claim.type || 'unknown';
        typesCount[type] = (typesCount[type] || 0) + 1;
      });
      const typesStats = Object.entries(typesCount).map(([type, count]) => ({
        type: getClaimTypeLabel(type),
        count: count,
        color: getClaimTypeColor(type)
      }));
      setClaimTypesStats(typesStats);
    } catch (error) {
      console.error('Erreur fetch Discord claims:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Récupérer les étapes de traitement
  const fetchProcessingSteps = useCallback(async () => {
    try {
      const response = await api.get('/claims/processing-steps');
      if (response.data && response.data.data) {
        setProcessingSteps(response.data.data);
      } else {
        setProcessingSteps([
          { step: 'Déclaration reçue', status: 'completed', percentage: 100 },
          { step: 'Validation des documents', status: 'in_progress', percentage: 65 },
          { step: 'Expertise en cours', status: 'pending', percentage: 30 },
          { step: 'Indemnisation effectuée', status: 'pending', percentage: 0 }
        ]);
      }
    } catch (error) {
      console.error('Erreur fetch processing steps:', error);
    }
  }, []);

  // Récupérer les alertes de fraude
  const fetchFraudAlerts = useCallback(async () => {
    try {
      const response = await api.get('/claims/fraud-alerts');
      if (response.data && response.data.data) {
        setFraudAlerts(response.data.data);
      }
    } catch (error) {
      console.error('Erreur fetch fraud alerts:', error);
    }
  }, []);

  // Récupérer les types de sinistres
  const fetchClaimTypes = useCallback(async () => {
    try {
      const response = await api.get('/claims/types');
      if (response.data && response.data.data) {
        setClaimTypesStats(response.data.data);
      }
    } catch (error) {
      console.error('Erreur fetch claim types:', error);
    }
  }, []);

  // Récupérer les statistiques
  const fetchStats = useCallback(async () => {
    try {
      const response = await api.get('/claims/stats');
      if (response.data && response.data.data) {
        setClaimsStats(response.data.data);
        setPortfolio(prev => ({
          ...prev,
          loss_ratio: response.data.data.loss_ratio || 32.5,
          claims_count: response.data.data.total || 0
        }));
      }
    } catch (error) {
      console.error('Erreur fetch stats:', error);
    }
  }, []);

  // Rafraîchir toutes les données
  const refreshAllData = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchDiscordClaims(),
        fetchProcessingSteps(),
        fetchFraudAlerts(),
        fetchClaimTypes(),
        fetchStats()
      ]);
    } catch (error) {
      console.error('Erreur refresh:', error);
    } finally {
      setRefreshing(false);
    }
  }, [fetchDiscordClaims, fetchProcessingSteps, fetchFraudAlerts, fetchClaimTypes, fetchStats]);

  // Polling des notifications Discord
  const fetchDiscordNotifications = useCallback(async () => {
    try {
      const response = await api.get('/discord/notifications', { 
        params: { since: lastNotifId, limit: 20 }
      }).catch(() => ({ data: [] }));
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        response.data.forEach(notif => {
          const newNotif = {
            id: notif.id,
            title: notif.title || 'Notification',
            message: notif.message || '',
            type: notif.type || 'info',
            timestamp: new Date(notif.timestamp).toLocaleTimeString(),
            read: false,
            source: notif.source || 'discord',
            data: notif.data || {}
          };
          
          setDiscordNotifications(prev => [newNotif, ...prev].slice(0, 100));
          addToHistory(notif.title || 'Notification', notif.message || '', notif.type || 'info', notif.source || 'discord', notif.data);
          
          if (notif.type === 'assurance_accident' || notif.type === 'assurance_home_claim' || notif.type === 'assurance_health_claim') {
            refreshAllData();
          }
        });
        
        const maxId = Math.max(...response.data.map(n => n.id || 0), lastNotifId);
        setLastNotifId(maxId);
      }
    } catch (error) {
      console.error('Erreur polling notifications:', error);
    }
  }, [lastNotifId, addToHistory, refreshAllData]);

  // WebSocket pour les notifications temps réel
  const handleWebSocketMessage = useCallback((wsMsg) => {
    
    if (wsMsg && wsMsg.type === 'discord_notification') {
      const notif = wsMsg.data || {};
      const newNotif = {
        id: notif.id || Date.now(),
        title: notif.title || 'Notification',
        message: notif.message || '',
        type: notif.type || 'info',
        timestamp: new Date().toLocaleTimeString(),
        read: false,
        source: 'discord',
        data: notif
      };
      
      setDiscordNotifications(prev => [newNotif, ...prev].slice(0, 100));
      addToHistory(notif.title || 'Notification', notif.message || '', notif.type || 'info', 'discord', notif);
      
      message.info({
        content: `🔔 ${notif.title || 'Notification'}`,
        description: notif.message || '',
        icon: <DiscordOutlined style={{ color: '#5865F2' }} />,
        duration: 6
      });
      
      if (notif.type?.includes('accident') || notif.type?.includes('claim')) {
        refreshAllData();
      }
    } else if (wsMsg && wsMsg.type === 'notification' && wsMsg.sector === 'insurance') {
      Modal.info({
        title: wsMsg.title || 'Notification',
        content: wsMsg.message || '',
        icon: <BellOutlined />,
        okText: 'OK',
      });
      refreshAllData();
    } else if (wsMsg && wsMsg.type === 'new_claim') {
      message.info({
        content: `Nouveau sinistre reçu: ${wsMsg.data?.claim_number || ''}`,
        icon: <WarningOutlined style={{ color: '#fa8c16' }} />,
        duration: 5
      });
      refreshAllData();
    }
  }, [refreshAllData, addToHistory]);

  useWebSocket('insurance', handleWebSocketMessage);

  // Effets
  useEffect(() => {
    loadNotificationHistory();
    refreshAllData();
  }, [loadNotificationHistory, refreshAllData]);

  // Polling des notifications toutes les 5 secondes
  useEffect(() => {
    fetchDiscordNotifications();
    const interval = setInterval(fetchDiscordNotifications, 5000);
    return () => clearInterval(interval);
  }, [fetchDiscordNotifications]);

  // Filtrer l'historique
  const filteredHistory = Array.isArray(notificationHistory) ? notificationHistory.filter(item => {
    if (historyFilter === 'all') return true;
    return item.source === historyFilter;
  }) : [];

  const pageSize = 20;
  const paginatedHistory = filteredHistory.slice((historyPage - 1) * pageSize, historyPage * pageSize);
  const totalUnread = Array.isArray(notificationHistory) ? notificationHistory.filter(n => !n.read).length : 0;

  // Obtenir l'icône de notification
  const getNotificationIcon = (type, source) => {
    if (source === 'discord') return <DiscordOutlined style={{ color: '#5865F2' }} />;
    switch (type) {
      case 'critical': return <CloseCircleOutlined style={{ color: '#ef4444' }} />;
      case 'warning': return <WarningOutlined style={{ color: '#10b981' }} />;
      case 'success': return <CheckCircleOutlined style={{ color: '#10b981' }} />;
      default: return <BellOutlined style={{ color: '#34d399' }} />;
    }
  };

  // Configuration du graphique circulaire
  const pieConfig = {
    data: claimTypesStats,
    angleField: 'count',
    colorField: 'type',
    radius: 0.8,
    innerRadius: 0.6,
    label: { type: 'spider', content: '{type}\n{percentage}' },
    statistic: {
      title: { content: 'Total', style: { fontSize: 14 } },
      content: { content: String(claimTypesStats.reduce((sum, item) => sum + (item.count || 0), 0)), style: { fontSize: 24, fontWeight: 'bold' } }
    },
    theme: currentTheme === 'dark' ? 'dark' : 'light',
    color: ({ type }) => {
      const item = claimTypesStats.find(d => d.type === type);
      return item?.color || '#10b981';
    }
  };

  // Configuration du graphique d'évolution
  const mockTrendData = [
    { month: 'Jan', claims: 12 },
    { month: 'Fév', claims: 15 },
    { month: 'Mar', claims: 18 },
    { month: 'Avr', claims: 22 },
    { month: 'Mai', claims: 25 },
    { month: 'Jun', claims: discordClaims.length || 28 }
  ];

  const lineConfig = {
    data: mockTrendData,
    xField: 'month',
    yField: 'claims',
    smooth: true,
    animation: true,
    theme: currentTheme === 'dark' ? 'dark' : 'light',
    color: '#10b981',
    point: { size: 5, shape: 'circle' },
    tooltip: { shared: true }
  };

  const discordClaimColumns = [
    { 
      title: 'ID', 
      dataIndex: 'claim_number', 
      key: 'id', 
      width: 180,
      render: (id) => <Text code style={{ fontSize: 12 }}>{id?.substring(0, 15)}...</Text> 
    },
    { 
      title: 'Client', 
      dataIndex: 'client', 
      key: 'client',
      render: (client) => <Text strong>{client || 'Inconnu'}</Text>
    },
    { 
      title: 'Type', 
      dataIndex: 'type', 
      key: 'type', 
      width: 120,
      render: (type) => {
        const config = {
          'accident_declaration': { color: 'red', icon: <CarOutlined />, label: 'Accident' },
          'home_claim': { color: 'orange', icon: <HomeOutlined />, label: 'Habitation' },
          'health_claim': { color: 'green', icon: <HeartOutlined />, label: 'Santé' },
          'agricole_claim': { color: 'gold', icon: <TrophyOutlined />, label: 'Agricole' }
        };
        const c = config[type] || { color: 'blue', icon: <BellOutlined />, label: type || 'Autre' };
        return <Tag color={c.color} icon={c.icon}>{c.label}</Tag>;
      }
    },
    { 
      title: 'Statut', 
      dataIndex: 'status', 
      key: 'status', 
      width: 120,
      render: (s) => <Badge status={s === 'pending' ? 'processing' : 'success'} text={s === 'pending' ? 'En attente' : 'Traité'} />
    },
    { 
      title: 'Date', 
      dataIndex: 'created_at', 
      key: 'date',
      width: 150,
      render: (date) => (
        <Tooltip title={date ? dayjs(date).format('DD/MM/YYYY HH:mm') : 'N/A'}>
          <Text type="secondary">{date ? dayjs(date).fromNow() : 'N/A'}</Text>
        </Tooltip>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, r) => (
        <Tooltip title="Voir les détails">
          <Button 
            size="small" 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => {
              setSelectedClaim(r);
              setClaimDetailVisible(true);
            }} 
          />
        </Tooltip>
      )
    }
  ];

  // Rafraîchissement manuel
  const handleManualRefresh = () => {
    refreshAllData();
    message.success('Données actualisées');
  };

  if (loading && !discordClaims.length) return (
    <div style={{ padding: 50, textAlign: 'center', background: currentTheme === 'dark' ? '#0f172a' : '#f0f2f5', minHeight: '100vh' }}>
      <Spin size="large" tip="Chargement du tableau de bord..." ><div/></Spin>
    </div>
  );

  return (
    <div className="insurance-dashboard-premium" style={{ padding: 24, background: currentTheme === 'dark' ? '#0f172a' : '#f0f2f5', minHeight: '100vh' }}>
      
      {/* HEADER BANNER */}
      <div style={{ 
        marginBottom: 24, 
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', 
        borderRadius: 24,
        padding: '28px 32px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.1)' }} />
        <div style={{ position: 'absolute', bottom: -30, left: -30, width: 150, height: 150, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.08)' }} />
        
        <Row align="middle" justify="space-between" style={{ position: 'relative', zIndex: 1 }}>
          <Col>
            <Space size="large" align="center">
              <div style={{ 
                background: 'linear-gradient(135deg, #10b981, #d97706)', 
                padding: 16, 
                borderRadius: '20px',
                boxShadow: '0 8px 20px rgba(245, 158, 11, 0.3)'
              }}>
                <InsuranceOutlined style={{ fontSize: 36, color: 'white' }} />
              </div>
              <div>
                <Title level={2} style={{ color: 'white', margin: 0, fontWeight: 700 }}>Insurance Intelligence Suite</Title>
                <div style={{ marginTop: 8 }}>
                  <Space>
                    <Tag icon={<SafetyCertificateOutlined />} color="gold">Anti-fraude {portfolio.fraud_detection_rate}%</Tag>
                    <Tag icon={<ThunderboltOutlined />} color="cyan">Temps réel</Tag>
                    <Tag icon={<RobotOutlined />} color="purple">IA Quantique</Tag>
                  </Space>
                </div>
              </div>
            </Space>
          </Col>
          <Col>
            <Space size="middle">
              <Tooltip title="Actualiser">
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={handleManualRefresh}
                  loading={refreshing}
                  style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 12, height: 40 }}
                >
                  Actualiser
                </Button>
              </Tooltip>
              <Tooltip title="Historique">
                <Badge count={totalUnread} offset={[-5, 5]} size="small">
                  <Button 
                    icon={<HistoryOutlined />} 
                    onClick={() => setHistoryDrawerVisible(true)}
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 12, height: 40 }}
                  >
                    Historique
                  </Button>
                </Badge>
              </Tooltip>
              <Tooltip title="Notifications">
                <Badge count={discordNotifications.filter(n => !n.read).length} offset={[-2, 5]} size="small">
                  <Button 
                    icon={<BellOutlined />} 
                    onClick={() => setNotificationDrawerVisible(true)}
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 12, height: 40 }}
                  >
                    Notifications
                  </Button>
                </Badge>
              </Tooltip>
              <Button 
                icon={<ExportOutlined />} 
                style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 12, height: 40 }}
                onClick={async () => {
                  message.loading({ content: 'Génération du rapport...', key: 'report' });
                  await new Promise(r => setTimeout(r, 1500));
                  message.success({ content: 'Rapport généré avec succès !', key: 'report', duration: 3 });
                }}
              >
                Exporter
              </Button>
              <Button 
                icon={<RobotOutlined />} 
                type="primary" 
                onClick={() => navigate('/ai/nexy')} 
                style={{ background: '#10b981', border: 'none', borderRadius: 12, height: 40, fontWeight: 600 }}
              >
                Nexy Assist
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* ALERTE EN TEMPS REEL */}
      {discordNotifications.filter(n => !n.read).length > 0 && (
        <Alert
          message={
            <Space>
              <BellOutlined style={{ fontSize: 16 }} />
              <Text strong>{discordNotifications.filter(n => !n.read).length} nouvelle(s) notification(s)</Text>
            </Space>
          }
          description="Cliquez sur la cloche pour voir les dernières notifications Discord"
          type="info"
          showIcon
          closable
          style={{ marginBottom: 24, borderRadius: 12, border: 'none' }}
          action={
            <Button size="small" type="primary" onClick={() => setNotificationDrawerVisible(true)} style={{ borderRadius: 8 }}>
              Voir
            </Button>
          }
        />
      )}

      {/* ALERTE FRAUDE */}
      {fraudAlerts.length > 0 && (
        <Alert
          message={
            <Space>
              <WarningOutlined style={{ color: '#ef4444', fontSize: 16 }} />
              <Text strong>{fraudAlerts.length} alerte(s) de fraude détectée(s)</Text>
            </Space>
          }
          description="Des sinistres présentent un risque élevé de fraude. Une investigation est recommandée."
          type="error"
          showIcon
          closable
          style={{ marginBottom: 24, borderRadius: 12, border: 'none' }}
        />
      )}

      {/* KPI CARDS */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        {[
          { title: 'Contrats actifs', value: portfolio.total_contracts, icon: <FileProtectOutlined />, trend: '+8%', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
          { title: 'Primes totales', value: (portfolio.total_premiums / 1000000).toFixed(1) + 'M', suffix: '€', icon: <EuroOutlined />, trend: '+12%', color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
          { title: 'Satisfaction client', value: portfolio.satisfaction_rate, suffix: '%', icon: <TrophyOutlined />, trend: '+5%', color: '#10b981', bg: 'rgba(245,158,11,0.1)' },
          { title: 'Sinistres en cours', value: discordClaims.filter(c => c.status === 'pending').length, icon: <WarningOutlined />, trend: `${discordClaims.length} total`, color: '#ef4444', bg: 'rgba(239,68,68,0.1)' }
        ].map((kpi, idx) => (
          <Col xs={24} sm={12} lg={6} key={idx}>
            <div style={{ 
              background: currentTheme === 'dark' ? '#1e293b' : '#fff', 
              borderRadius: 20, 
              padding: '20px 24px',
              transition: 'all 0.3s',
              cursor: 'pointer',
              borderLeft: `4px solid ${kpi.color}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 13 }}>{kpi.title}</Text>
                  <div style={{ fontSize: 32, fontWeight: 700, color: currentTheme === 'dark' ? '#fff' : '#1e293b', marginTop: 8 }}>
                    {kpi.value}{kpi.suffix}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Tag color={kpi.trend.startsWith('+') ? 'green' : 'blue'} style={{ borderRadius: 12 }}>
                      {kpi.trend}
                    </Tag>
                  </div>
                </div>
                <div style={{ 
                  background: kpi.bg, 
                  padding: 12, 
                  borderRadius: 16,
                  color: kpi.color
                }}>
                  {React.cloneElement(kpi.icon, { style: { fontSize: 28 } })}
                </div>
              </div>
            </div>
          </Col>
        ))}
      </Row>

      {/* STATISTIQUES SUPPLEMENTAIRES */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <div style={{ background: currentTheme === 'dark' ? '#1e293b' : '#fff', borderRadius: 16, padding: 16, textAlign: 'center' }}>
            <Text type="secondary">Sinistralité</Text>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#ef4444' }}>{claimsStats?.loss_ratio || portfolio.loss_ratio}%</div>
            <Progress percent={claimsStats?.loss_ratio || portfolio.loss_ratio} strokeColor="#ef4444" showInfo={false} size="small" />
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div style={{ background: currentTheme === 'dark' ? '#1e293b' : '#fff', borderRadius: 16, padding: 16, textAlign: 'center' }}>
            <Text type="secondary">Sinistres traités</Text>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>{claimsStats?.processed || discordClaims.filter(c => c.status !== 'pending').length}</div>
            <Progress percent={discordClaims.length ? Math.round((discordClaims.filter(c => c.status !== 'pending').length / discordClaims.length) * 100) : 0} strokeColor="#10b981" showInfo={false} size="small" />
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div style={{ background: currentTheme === 'dark' ? '#1e293b' : '#fff', borderRadius: 16, padding: 16, textAlign: 'center' }}>
            <Text type="secondary">Détection fraude</Text>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>{portfolio.fraud_detection_rate}%</div>
            <Progress percent={portfolio.fraud_detection_rate} strokeColor="#10b981" showInfo={false} size="small" />
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div style={{ background: currentTheme === 'dark' ? '#1e293b' : '#fff', borderRadius: 16, padding: 16, textAlign: 'center' }}>
            <Text type="secondary">Temps réponse moyen</Text>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#475569' }}>{portfolio.avg_response_time}h</div>
            <Progress percent={85} strokeColor="#475569" showInfo={false} size="small" />
          </div>
        </Col>
      </Row>

      {/* TAB SECTION */}
      <Card style={{ borderRadius: 20, background: currentTheme === 'dark' ? '#1e293b' : '#fff', marginBottom: 24, border: 'none' }}>
        <Segmented
          options={[
            { label: <span><DashboardOutlined /> Vue d'ensemble</span>, value: 'overview' },
            { label: <span><MessageOutlined /> Sinistres Discord</span>, value: 'claims' },
            { label: <span><LineChartOutlined /> Analyses</span>, value: 'analytics' }
          ]}
          value={activeTab}
          onChange={setActiveTab}
          style={{ marginBottom: 24 }}
        />
        
        {activeTab === 'overview' && (
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={14}>
              <div>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Évolution des sinistres</Text>
                </div>
                <Line {...lineConfig} height={300} />
              </div>
            </Col>
            <Col xs={24} lg={10}>
              <div>
                <div style={{ marginBottom: 16 }}>
                  <Text strong>Répartition par type</Text>
                </div>
                {claimTypesStats && claimTypesStats.length > 0 ? (
                  <Pie {...pieConfig} height={300} />
                ) : (
                  <Empty description="Aucune donnée de distribution disponible" style={{ padding: 40 }} />
                )}
              </div>
            </Col>
          </Row>
        )}

        {activeTab === 'claims' && (
          <Table 
            dataSource={discordClaims} 
            columns={discordClaimColumns} 
            pagination={{ pageSize: 10, showSizeChanger: true }}
            rowKey="claim_number"
            style={{ borderRadius: 16 }}
            locale={{ emptyText: 'Aucun sinistre trouvé' }}
          />
        )}

        {activeTab === 'analytics' && (
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <div style={{ textAlign: 'center', padding: 24 }}>
                <Text type="secondary">Délais de traitement</Text>
                <div style={{ marginTop: 16 }}>
                  {processingSteps && processingSteps.length > 0 ? (
                    processingSteps.map((step, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Space>
                          <div style={{ 
                            width: 10, 
                            height: 10, 
                            borderRadius: 10, 
                            background: step.status === 'completed' ? '#10b981' : step.status === 'in_progress' ? '#10b981' : '#d9d9d9' 
                          }} />
                          <Text>{step.step || step.title}</Text>
                        </Space>
                        <Text strong>{step.percentage || 0}%</Text>
                      </div>
                    ))
                  ) : (
                    <Empty description="Aucune donnée de traitement disponible" />
                  )}
                </div>
              </div>
            </Col>
            <Col xs={24} lg={12}>
              <div style={{ textAlign: 'center', padding: 24 }}>
                <Text type="secondary">Types de sinistres</Text>
                <div style={{ marginTop: 16 }}>
                  {claimTypesStats && claimTypesStats.length > 0 ? (
                    claimTypesStats.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <Space>
                          <div style={{ width: 10, height: 10, borderRadius: 10, background: item.color }} />
                          <Text>{item.type}</Text>
                        </Space>
                        <Text strong>{item.count}</Text>
                      </div>
                    ))
                  ) : (
                    <Empty description="Aucune donnée de type disponible" />
                  )}
                </div>
              </div>
            </Col>
          </Row>
        )}
      </Card>

      {/* AI AGENTS SECTION */}
      <div style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={4} style={{ margin: 0, color: currentTheme === 'dark' ? '#fff' : '#1e293b' }}>
            <RobotOutlined style={{ marginRight: 8, color: '#10b981' }} />
            Nexum Insurance AI Agents
          </Title>
          <Button type="link" onClick={() => navigate('/models')}>Voir tous →</Button>
        </div>
        <Row gutter={[16, 16]}>
          {[
            { key: 'claim-declaration', label: 'Déclaration Sinistre IA', icon: <CameraOutlined />, color: '#fa8c16', desc: 'Déclarez un sinistre en 30 secondes', badge: 'Nouveau' },
            { key: 'damage-estimation', label: 'Estimation Auto IA', icon: <EuroOutlined />, color: '#52c41a', desc: 'Estimation immédiate des dégâts', badge: 'Popular' },
            { key: 'coverage-recommendation', label: 'Recommandation Garanties', icon: <SafetyCertificateOutlined />, color: '#eb2f96', desc: 'Garanties adaptées à vos besoins', badge: '' },
            { key: 'loss-prevention', label: 'Prévention Sinistres', icon: <WarningOutlined />, color: '#ff4d4f', desc: 'Conseils proactifs personnalisés', badge: '' }
          ].map(model => (
            <Col xs={24} sm={12} md={6} key={model.key}>
              <div 
                style={{ 
                  background: currentTheme === 'dark' ? '#1e293b' : '#fff', 
                  borderRadius: 16, 
                  padding: 20,
                  borderLeft: `4px solid ${model.color}`,
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  position: 'relative',
                  height: '100%'
                }}
                onClick={() => navigate('/models?category=Assurance IA')}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
              >
                {model.badge && (
                  <Tag color="gold" style={{ position: 'absolute', top: 12, right: 12, borderRadius: 12 }}>
                    {model.badge}
                  </Tag>
                )}
                <div style={{ color: model.color, fontSize: 28, marginBottom: 12 }}>
                  {model.icon}
                </div>
                <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8, color: currentTheme === 'dark' ? '#fff' : '#1e293b' }}>
                  {model.label}
                </Text>
                <Text type="secondary" style={{ fontSize: 13 }}>{model.desc}</Text>
                <div style={{ marginTop: 12 }}>
                  <Tag color="cyan" style={{ borderRadius: 12 }}>Actif</Tag>
                  <Tag color="purple" style={{ borderRadius: 12 }}>v2.0</Tag>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </div>

      {/* CLAIM DETAIL MODAL */}
      <Modal
        title={
          <Space>
            <FileProtectOutlined style={{ color: '#10b981' }} />
            <span>Détails du sinistre</span>
          </Space>
        }
        open={claimDetailVisible}
        onCancel={() => setClaimDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setClaimDetailVisible(false)}>Fermer</Button>,
          <Button key="process" type="primary" style={{ background: '#10b981', border: 'none' }}>Traiter</Button>
        ]}
        width={600}
        styles={{ body: { padding: '16px 24px' } }}
      >
        {selectedClaim && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text type="secondary">Numéro de sinistre</Text>
                <div><Text code>{selectedClaim.claim_number}</Text></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Date de déclaration</Text>
                <div><Text>{selectedClaim.created_at ? dayjs(selectedClaim.created_at).format('DD/MM/YYYY HH:mm') : 'N/A'}</Text></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Client</Text>
                <div><Text strong>{selectedClaim.client || 'Inconnu'}</Text></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Type</Text>
                <div><Tag color="blue">{selectedClaim.type || 'Non spécifié'}</Tag></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Statut</Text>
                <div><Badge status={selectedClaim.status === 'pending' ? 'processing' : 'success'} text={selectedClaim.status === 'pending' ? 'En attente' : 'Traité'} /></div>
              </Col>
              <Col span={12}>
                <Text type="secondary">Source</Text>
                <div><Tag icon={<DiscordOutlined />} color="#5865F2">Discord</Tag></div>
              </Col>
              <Col span={24}>
                <Text type="secondary">Description</Text>
                <div style={{ marginTop: 8, padding: 12, background: currentTheme === 'dark' ? '#0f172a' : '#f8fafc', borderRadius: 12 }}>
                  <Text>{selectedClaim.description || 'Aucune description fournie'}</Text>
                </div>
              </Col>
            </Row>
          </div>
        )}
      </Modal>

      {/* NOTIFICATIONS DRAWER */}
      <Drawer
        title={
          <Space>
            <BellOutlined style={{ color: '#10b981' }} />
            <span style={{ fontWeight: 600 }}>Notifications</span>
            <Badge count={discordNotifications.filter(n => !n.read).length} />
          </Space>
        }
        placement="right"
        onClose={() => setNotificationDrawerVisible(false)}
        open={notificationDrawerVisible}
        width={450}
        extra={
          <Button type="text" icon={<CheckCircleOutlined />} onClick={markAllAsRead} style={{ color: '#10b981' }}>
            Tout marquer lu
          </Button>
        }
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: 16 }}>
          {discordNotifications.length > 0 ? (
            <List
              dataSource={discordNotifications}
              renderItem={item => (
                <div 
                  style={{ 
                    background: item.read ? (currentTheme === 'dark' ? '#1e293b' : '#fafafa') : (currentTheme === 'dark' ? '#2d3748' : '#e6f7ff'),
                    borderRadius: 12, 
                    marginBottom: 12, 
                    padding: 16,
                    borderLeft: `4px solid ${item.type === 'assurance_accident' ? '#ef4444' : item.type === 'assurance_home_claim' ? '#10b981' : item.type === 'assurance_health_claim' ? '#10b981' : '#5865F2'}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onClick={() => {
                    setDiscordNotifications(prev => prev.map(n => n.id === item.id ? { ...n, read: true } : n));
                    markAsRead(item.id);
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <Avatar icon={getNotificationIcon(item.type, 'discord')} style={{ background: '#5865F2' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text strong style={{ fontSize: 14 }}>{item.title}</Text>
                        {!item.read && <Badge dot color="#10b981" />}
                      </div>
                      <Text style={{ color: '#64748b', fontSize: 13 }}>{item.message}</Text>
                      <div style={{ marginTop: 8 }}>
                        <Tag icon={<DiscordOutlined />} color="#5865F2" style={{ borderRadius: 12 }}>Discord</Tag>
                        <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>{item.timestamp}</Text>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            />
          ) : (
            <Empty description="Aucune notification" style={{ marginTop: 40 }} />
          )}
        </div>
      </Drawer>

      {/* HISTORY DRAWER */}
      <Drawer
        title={
          <Space>
            <HistoryOutlined style={{ color: '#10b981' }} />
            <span style={{ fontWeight: 600 }}>Historique des notifications</span>
            <Badge count={totalUnread} />
          </Space>
        }
        placement="right"
        onClose={() => setHistoryDrawerVisible(false)}
        open={historyDrawerVisible}
        width={500}
        extra={
          <Space>
            <Button type="text" icon={<DeleteOutlined />} onClick={clearHistory} style={{ color: '#ef4444' }}>
              Effacer
            </Button>
            <Button type="text" icon={<CheckCircleOutlined />} onClick={markAllAsRead} style={{ color: '#10b981' }}>
              Tout lire
            </Button>
          </Space>
        }
        styles={{ body: { padding: 0 } }}
      >
        <div style={{ padding: 16 }}>
          <Space style={{ marginBottom: 16, padding: '0 8px' }}>
            <Segmented
              options={[
                { label: 'Toutes', value: 'all' },
                { label: <Space><DiscordOutlined /> Discord</Space>, value: 'discord' },
                { label: <Space><BellOutlined /> Système</Space>, value: 'system' }
              ]}
              value={historyFilter}
              onChange={(v) => { setHistoryFilter(v); setHistoryPage(1); }}
              size="small"
            />
          </Space>

          {paginatedHistory.length > 0 ? (
            <>
              <List
                dataSource={paginatedHistory}
                renderItem={item => (
                  <div 
                    style={{ 
                      background: item.read ? (currentTheme === 'dark' ? '#1e293b' : '#fafafa') : (currentTheme === 'dark' ? '#2d3748' : '#e6f7ff'),
                      borderRadius: 12, 
                      marginBottom: 12, 
                      padding: 16,
                      borderLeft: `4px solid ${item.type === 'critical' ? '#ef4444' : item.type === 'warning' ? '#10b981' : '#5865F2'}`,
                      cursor: 'pointer'
                    }}
                    onClick={() => markAsRead(item.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <Avatar icon={getNotificationIcon(item.type, item.source)} style={{ background: item.source === 'discord' ? '#5865F2' : '#10b981' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text strong style={{ fontSize: 14 }}>{item.title}</Text>
                          {!item.read && <Badge dot color="#10b981" />}
                        </div>
                        <Text style={{ color: '#64748b', fontSize: 13 }}>{item.message}</Text>
                        <div style={{ marginTop: 8 }}>
                          {item.source === 'discord' && <Tag icon={<DiscordOutlined />} color="#5865F2" style={{ borderRadius: 12 }}>Discord</Tag>}
                          {item.source === 'system' && <Tag icon={<BellOutlined />} color="blue" style={{ borderRadius: 12 }}>Système</Tag>}
                          <Tooltip title={dayjs(item.timestamp).format('DD/MM/YYYY HH:mm:ss')}>
                            <Text type="secondary" style={{ fontSize: 11, marginLeft: 8 }}>{dayjs(item.timestamp).fromNow()}</Text>
                          </Tooltip>
                        </div>
                        {item.data?.amount && <Tag color="gold" style={{ marginTop: 8, borderRadius: 12 }}>Montant: {item.data.amount}€</Tag>}
                      </div>
                    </div>
                  </div>
                )}
              />
              <div style={{ marginTop: 16, textAlign: 'center' }}>
                <Pagination
                  current={historyPage}
                  total={filteredHistory.length}
                  pageSize={pageSize}
                  onChange={(page) => setHistoryPage(page)}
                  size="small"
                  showTotal={(total) => `${total} notifications`}
                />
              </div>
            </>
          ) : (
            <Empty description="Aucune notification dans l'historique" style={{ marginTop: 40 }} />
          )}
        </div>
      </Drawer>
    </div>
  );
};

export default InsuranceDashboard;