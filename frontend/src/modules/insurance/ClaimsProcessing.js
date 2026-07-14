// ClaimsProcessing.js - Version corrigée avec texte du tableau en noir
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Row, Col, Statistic, Table, Tag, Space, Button, Steps, 
  Descriptions, Timeline, Progress, Avatar, Badge, Tooltip, 
  Tabs, Modal, message, Alert, Divider, Typography, List, Spin,
  Form, Input, InputNumber, DatePicker, Upload, Drawer,
  Select, Empty, ConfigProvider, theme, Pagination, Switch
} from 'antd';
import { 
  FileTextOutlined, CheckCircleOutlined, 
  ClockCircleOutlined, DollarOutlined, 
  EyeOutlined, CarOutlined, HomeOutlined, HeartOutlined, BellOutlined,
  WarningOutlined, UserOutlined, PhoneOutlined, MailOutlined,
  FileProtectOutlined, PieChartOutlined,
  PlusOutlined, UploadOutlined, ExportOutlined,
  ShopOutlined, CheckOutlined, ReloadOutlined,
  ApiOutlined, DiscordOutlined, CloseCircleOutlined,
  HistoryOutlined, DeleteOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';

dayjs.extend(relativeTime);
dayjs.locale('fr');

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Clé pour localStorage
const ALERTS_STORAGE_KEY = 'claims_alerts_history';

const ClaimsProcessing = () => {
  const [loading, setLoading] = useState(true);
  const [apiConnected, setApiConnected] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [addClaimModalVisible, setAddClaimModalVisible] = useState(false);
  const [expertModalVisible, setExpertModalVisible] = useState(false);
  const [compensationModalVisible, setCompensationModalVisible] = useState(false);
  const [quoteDrawerVisible, setQuoteDrawerVisible] = useState(false);
  const [claimsStats, setClaimsStats] = useState(null);
  const [recentClaims, setRecentClaims] = useState([]);
  const [claimTypes, setClaimTypes] = useState([]);
  const [processingSteps, setProcessingSteps] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [processedAlerts, setProcessedAlerts] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [experts, setExperts] = useState([]);
  const [discordNotifications, setDiscordNotifications] = useState([]);
  const [notificationDrawerVisible, setNotificationDrawerVisible] = useState(false);
  const [alertDrawerVisible, setAlertDrawerVisible] = useState(false);
  const [lastNotifId, setLastNotifId] = useState(0);
  const [addClaimForm] = Form.useForm();
  const [quoteForm] = Form.useForm();
  const [expertForm] = Form.useForm();
  const [compensationForm] = Form.useForm();

  // Charger les alertes depuis localStorage
  const loadProcessedAlerts = useCallback(() => {
    try {
      const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
      if (stored) {
        setProcessedAlerts(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Erreur chargement alertes traitées:', error);
    }
  }, []);

  // Sauvegarder les alertes traitées
  const saveProcessedAlerts = useCallback((alerts) => {
    try {
      localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(alerts));
    } catch (error) {
      console.error('Erreur sauvegarde alertes:', error);
    }
  }, []);

  // Marquer une alerte comme traitée
  const handleAcceptAlert = (alertId) => {
    const newProcessed = [...processedAlerts, alertId];
    setProcessedAlerts(newProcessed);
    saveProcessedAlerts(newProcessed);
    message.success('Alerte marquée comme traitée');
  };

  // Marquer toutes les alertes comme traitées
  const handleAcceptAllAlerts = () => {
    const allAlertIds = safeFraudAlerts.map(alert => alert.id);
    const newProcessed = [...processedAlerts, ...allAlertIds];
    setProcessedAlerts(newProcessed);
    saveProcessedAlerts(newProcessed);
    message.success(`${allAlertIds.length} alertes marquées comme traitées`);
  };

  // Filtrer les alertes non traitées
  const getUnprocessedAlerts = () => {
    return safeFraudAlerts.filter(alert => !processedAlerts.includes(alert.id));
  };

  // Polling des notifications Discord
  const fetchDiscordNotifications = useCallback(async () => {
    try {
      const response = await api.get('/discord/notifications', { 
        params: { since: lastNotifId, limit: 20 }
      });
      
      if (response.data && Array.isArray(response.data) && response.data.length > 0) {
        response.data.forEach(notif => {
          const newNotif = {
            id: notif.id,
            title: notif.title,
            message: notif.message,
            type: notif.type || 'info',
            timestamp: new Date(notif.timestamp).toLocaleTimeString(),
            read: false,
            source: notif.source || 'discord',
            data: notif.data || {}
          };
          
          setDiscordNotifications(prev => [newNotif, ...prev].slice(0, 100));
        });
        
        const maxId = Math.max(...response.data.map(n => n.id || 0), lastNotifId);
        setLastNotifId(maxId);
      }
    } catch (error) {
      console.error('Erreur polling notifications:', error);
    }
  }, [lastNotifId]);

  // ========== CHARGEMENT DES DONNÉES RÉELLES ==========
  const fetchData = async () => {
    try {
      setLoading(true);
      
      
      // 1. STATS
      try {
        const statsRes = await api.get('/claims/stats');
        if (statsRes.data) {
          const statsData = statsRes.data.data || statsRes.data;
          setClaimsStats(statsData);
        }
      } catch (error) {
        console.error('❌ [Claims] Erreur stats:', error);
        setClaimsStats(null);
      }

      // 2. SINISTRES RÉCENTS
      try {
        const claimsRes = await api.get('/claims/recent');
        let claimsData = [];
        if (claimsRes.data) {
          if (claimsRes.data.success === true && Array.isArray(claimsRes.data.data)) {
            claimsData = claimsRes.data.data;
          } else if (Array.isArray(claimsRes.data)) {
            claimsData = claimsRes.data;
          }
        }
        setRecentClaims(claimsData);
      } catch (error) {
        console.error('❌ [Claims] Erreur recent:', error);
        setRecentClaims([]);
      }

      // 3. TYPES
      try {
        const typesRes = await api.get('/claims/types');
        let typesData = [];
        if (typesRes.data) {
          if (typesRes.data.success === true && Array.isArray(typesRes.data.data)) {
            typesData = typesRes.data.data;
          } else if (Array.isArray(typesRes.data)) {
            typesData = typesRes.data;
          }
        }
        setClaimTypes(typesData);
      } catch (error) {
        console.error('❌ [Claims] Erreur types:', error);
        setClaimTypes([]);
      }

      // 4. ÉTAPES
      try {
        const stepsRes = await api.get('/claims/processing-steps');
        let stepsData = [];
        if (stepsRes.data) {
          if (stepsRes.data.success === true && Array.isArray(stepsRes.data.data)) {
            stepsData = stepsRes.data.data;
          } else if (Array.isArray(stepsRes.data)) {
            stepsData = stepsRes.data;
          }
        }
        setProcessingSteps(stepsData);
      } catch (error) {
        console.error('❌ [Claims] Erreur steps:', error);
        setProcessingSteps([]);
      }

      // 5. ALERTES FRAUDE
      try {
        const fraudRes = await api.get('/claims/fraud-alerts');
        let alertsData = [];
        if (fraudRes.data) {
          if (fraudRes.data.success === true && Array.isArray(fraudRes.data.data)) {
            alertsData = fraudRes.data.data;
          } else if (Array.isArray(fraudRes.data)) {
            alertsData = fraudRes.data;
          }
          const alertsWithId = alertsData.map((alert, idx) => ({
            ...alert,
            id: alert.id || `alert_${idx}_${Date.now()}`
          }));
          setFraudAlerts(alertsWithId);
        }
      } catch (error) {
        console.error('❌ [Claims] Erreur fraud:', error);
        setFraudAlerts([]);
      }

      // 6. DEVIS
      try {
        const quotesRes = await api.get('/claims/quotes');
        let quotesData = [];
        if (quotesRes.data) {
          if (quotesRes.data.success === true && Array.isArray(quotesRes.data.data)) {
            quotesData = quotesRes.data.data;
          } else if (Array.isArray(quotesRes.data)) {
            quotesData = quotesRes.data;
          }
        }
        setQuotes(quotesData);
      } catch (error) {
        console.error('❌ [Claims] Erreur quotes:', error);
        setQuotes([]);
      }

      // 7. EXPERTS
      try {
        const expertsRes = await api.get('/claims/experts');
        let expertsData = [];
        if (expertsRes.data) {
          if (expertsRes.data.success === true && Array.isArray(expertsRes.data.data)) {
            expertsData = expertsRes.data.data;
          } else if (Array.isArray(expertsRes.data)) {
            expertsData = expertsRes.data;
          }
        }
        setExperts(expertsData);
      } catch (error) {
        console.error('❌ [Claims] Erreur experts:', error);
        setExperts([]);
      }

      // Vérifier si au moins une requête a réussi
      const hasData = claimsStats !== null || recentClaims.length > 0;
      setApiConnected(hasData);
      
      
    } catch (error) {
      console.error('❌ [Claims] Erreur générale:', error);
      setApiConnected(false);
      setClaimsStats(null);
      setRecentClaims([]);
      setClaimTypes([]);
      setProcessingSteps([]);
      setFraudAlerts([]);
      setQuotes([]);
      setExperts([]);
    } finally {
      setLoading(false);
    }
  };

  // ========== CRUD ==========
  const handleAddClaim = async (values) => {
    try {
      const response = await api.post('/claims', {
        client_name: values.client_name,
        client_email: values.client_email || '',
        client_phone: values.client_phone || '',
        policy_number: values.policy_number,
        type: values.type,
        amount: values.amount || 0,
        incident_date: values.incident_date?.toISOString(),
        description: values.description || '',
        circumstances: values.circumstances || '',
        status: 'pending'
      });
      
      if (response.data) {
        setRecentClaims(prev => [response.data, ...prev]);
        message.success('Déclaration de sinistre ajoutée avec succès');
        setAddClaimModalVisible(false);
        addClaimForm.resetFields();
        await fetchData();
      }
    } catch (error) {
      console.error('Erreur ajout sinistre:', error);
      message.error(error.response?.data?.message || 'Erreur lors de l\'ajout');
    }
  };

  const handleAddQuote = async (values) => {
    try {
      const response = await api.post('/quotes', {
        claim_id: selectedClaim?.id,
        amount: values.amount,
        provider: values.provider,
        date: values.date?.toISOString(),
        description: values.description,
        status: 'pending'
      });
      
      if (response.data) {
        setQuotes(prev => [...prev, response.data]);
        message.success('Devis ajouté avec succès');
        setQuoteDrawerVisible(false);
        quoteForm.resetFields();
        await fetchData();
      }
    } catch (error) {
      console.error('Erreur ajout devis:', error);
      message.error(error.response?.data?.message || 'Erreur lors de l\'ajout du devis');
    }
  };

  const handleAddExpert = async (values) => {
    try {
      const response = await api.post('/experts', {
        claim_id: selectedClaim?.id,
        name: values.name,
        title: values.title,
        report: values.report,
        conclusions: values.conclusions,
        date: values.date?.toISOString()
      });
      
      if (response.data) {
        setExperts(prev => [...prev, response.data]);
        message.success('Expert ajouté avec succès');
        setExpertModalVisible(false);
        expertForm.resetFields();
        await fetchData();
      }
    } catch (error) {
      console.error('Erreur ajout expert:', error);
      message.error(error.response?.data?.message || 'Erreur lors de l\'ajout de l\'expert');
    }
  };

  const handleCompensation = async (values) => {
    try {
      await api.post(`/claims/${selectedClaim?.id}/compensate`, {
        amount: values.amount,
        date: values.date?.toISOString(),
        payment_method: values.payment_method
      });
      
      setRecentClaims(prev => prev.map(claim => 
        claim.id === selectedClaim?.id 
          ? { ...claim, status: 'approved' }
          : claim
      ));
      
      message.success(`Indemnisation de ${values.amount}€ effectuée avec succès`);
      setCompensationModalVisible(false);
      compensationForm.resetFields();
      setModalVisible(false);
      await fetchData();
    } catch (error) {
      console.error('Erreur indemnisation:', error);
      message.error(error.response?.data?.message || 'Erreur lors de l\'indemnisation');
    }
  };

  const handleProcessClaim = async (claimId, newStatus) => {
    try {
      await api.patch(`/claims/${claimId}/status`, { status: newStatus });
      
      setRecentClaims(prev => prev.map(claim => 
        claim.id === claimId 
          ? { ...claim, status: newStatus }
          : claim
      ));
      
      message.success(`Sinistre ${newStatus === 'processing' ? 'mis en traitement' : 'traité avec succès'}`);
      setModalVisible(false);
      await fetchData();
    } catch (error) {
      console.error('Erreur traitement:', error);
      message.error(error.response?.data?.message || 'Erreur lors du traitement');
    }
  };

  const handleUploadDocument = async (file, claimId) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('claim_id', claimId);
    
    try {
      message.loading({ content: 'Téléchargement...', key: 'upload' });
      await api.post('/claims/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      message.success({ content: `${file.name} téléchargé avec succès`, key: 'upload' });
    } catch (error) {
      console.error('Erreur upload:', error);
      message.error({ content: 'Erreur lors du téléchargement', key: 'upload' });
    }
    return false;
  };

  const clearNotificationHistory = () => {
    Modal.confirm({
      title: 'Effacer l\'historique',
      content: 'Êtes-vous sûr de vouloir effacer toutes les notifications ?',
      okText: 'Oui',
      cancelText: 'Non',
      okButtonProps: { danger: true },
      onOk: () => {
        setDiscordNotifications([]);
        message.success('Historique effacé');
      }
    });
  };

  const getTypeIcon = (type) => {
    if (type === 'Auto') return <CarOutlined />;
    if (type === 'Habitation') return <HomeOutlined />;
    if (type === 'Santé') return <HeartOutlined />;
    return <FileTextOutlined />;
  };

  const getStatusColor = (status) => {
    if (status === 'approved') return 'success';
    if (status === 'processing') return 'processing';
    if (status === 'pending') return 'warning';
    if (status === 'rejected') return 'error';
    return 'default';
  };

  const getStatusText = (status) => {
    if (status === 'approved') return 'Approuvé';
    if (status === 'processing') return 'En cours';
    if (status === 'pending') return 'En attente';
    if (status === 'rejected') return 'Rejeté';
    return status;
  };

  // ========== COLONNES DU TABLEAU - TEXTE EN NOIR POUR TOUTES LES LIGNES ==========
  const columns = [
    { 
      title: <span style={{ color: '#000000', fontWeight: 'bold' }}>N° Sinistre</span>, 
      dataIndex: 'claim_number', 
      key: 'claim',
      width: 180,
      render: (text) => <span style={{ color: '#000000', fontFamily: 'monospace', fontSize: '13px' }}>{text || '-'}</span>
    },
    { 
      title: <span style={{ color: '#000000', fontWeight: 'bold' }}>Client</span>, 
      dataIndex: 'client_name', 
      key: 'client',
      render: (text) => text ? (
        <Space>
          <Avatar icon={<UserOutlined />} size="small" style={{ backgroundColor: '#1677ff' }} />
          <span style={{ color: '#000000' }}>{text}</span>
        </Space>
      ) : <span style={{ color: '#000000' }}>-</span>
    },
    { 
      title: <span style={{ color: '#000000', fontWeight: 'bold' }}>Montant</span>, 
      dataIndex: 'amount', 
      key: 'amount',
      render: (amount) => <span style={{ color: '#000000', fontWeight: 'bold', fontSize: '14px' }}>{amount ? amount.toLocaleString() : '-'} €</span>
    },
    { 
      title: <span style={{ color: '#000000', fontWeight: 'bold' }}>Type</span>, 
      dataIndex: 'type', 
      key: 'type',
      render: (type) => type ? (
        <Tag icon={getTypeIcon(type)} color="blue" style={{ borderRadius: '12px', padding: '2px 10px' }}>
          <span style={{ color: '#000000' }}>{type}</span>
        </Tag>
      ) : <span style={{ color: '#000000' }}>-</span>
    },
    { 
      title: <span style={{ color: '#000000', fontWeight: 'bold' }}>Statut</span>, 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => status ? (
        <Tag color={getStatusColor(status)} icon={status === 'approved' ? <CheckCircleOutlined /> : <ClockCircleOutlined />} style={{ borderRadius: '12px', padding: '2px 10px' }}>
          <span style={{ color: '#000000' }}>{getStatusText(status)}</span>
        </Tag>
      ) : <span style={{ color: '#000000' }}>-</span>
    },
    { 
      title: <span style={{ color: '#000000', fontWeight: 'bold' }}>Fraude</span>, 
      dataIndex: 'fraud_score', 
      key: 'fraud',
      width: 120,
      render: (score) => score !== undefined && score !== null ? (
        <Tooltip title={`Score de fraude: ${score}%`}>
          <Progress 
            percent={score} 
            size="small" 
            strokeColor={score > 70 ? '#ff4d4f' : score > 30 ? '#faad14' : '#52c41a'}
            format={() => <span style={{ color: '#000000' }}>{score}%</span>}
          />
        </Tooltip>
      ) : <span style={{ color: '#000000' }}>-</span>
    },
    { 
      title: <span style={{ color: '#000000', fontWeight: 'bold' }}>Date</span>, 
      dataIndex: 'incident_date', 
      key: 'date',
      width: 110,
      render: (date) => <span style={{ color: '#000000' }}>{date ? dayjs(date).format('DD/MM/YYYY') : '-'}</span>
    },
    {
      title: <span style={{ color: '#000000', fontWeight: 'bold' }}>Actions</span>,
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space>
          <Tooltip title="Voir détails">
            <Button 
              icon={<EyeOutlined />} 
              size="small" 
              type="link"
              onClick={() => {
                setSelectedClaim(record);
                setModalVisible(true);
              }}
            />
          </Tooltip>
          {record.status === 'pending' && (
            <Tooltip title="Commencer le traitement">
              <Button 
                icon={<FileProtectOutlined />} 
                size="small" 
                type="primary"
                onClick={() => handleProcessClaim(record.id, 'processing')}
              />
            </Tooltip>
          )}
          {record.status === 'processing' && (
            <Tooltip title="Indemniser">
              <Button 
                icon={<DollarOutlined />} 
                size="small" 
                type="primary"
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
                onClick={() => {
                  setSelectedClaim(record);
                  setCompensationModalVisible(true);
                }}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  // ========== DONNÉES SÉCURISÉES ==========
  const safeRecentClaims = Array.isArray(recentClaims) ? recentClaims : [];
  const safeClaimTypes = Array.isArray(claimTypes) ? claimTypes : [];
  const safeProcessingSteps = Array.isArray(processingSteps) ? processingSteps : [];
  const safeFraudAlerts = Array.isArray(fraudAlerts) ? fraudAlerts : [];
  const safeQuotes = Array.isArray(quotes) ? quotes : [];
  const safeExperts = Array.isArray(experts) ? experts : [];
  const unprocessedAlerts = getUnprocessedAlerts();

  const totalClaims = safeRecentClaims.length;
  const processedClaims = safeRecentClaims.filter(c => c.status === 'approved').length;
  const pendingClaims = safeRecentClaims.filter(c => c.status === 'pending').length;
  const totalAmount = safeRecentClaims.reduce((sum, c) => sum + (c.amount || 0), 0);
  const processingRate = totalClaims > 0 ? Math.round((processedClaims / totalClaims) * 100) : 0;

  // ========== EFFECTS ==========
  useEffect(() => {
    fetchDiscordNotifications();
    const interval = setInterval(fetchDiscordNotifications, 5000);
    return () => clearInterval(interval);
  }, [fetchDiscordNotifications]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    loadProcessedAlerts();
    return () => clearInterval(interval);
  }, []);

  // ========== LOADING ==========
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#000000', padding: 24 }}>
        <Card style={{ borderRadius: 16, background: '#141414', borderColor: '#303030' }}>
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Spin size="large" tip="Chargement des sinistres..." />
          </div>
        </Card>
      </div>
    );
  }

  // ========== RENDU ==========
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          colorBgContainer: '#141414',
          colorBgElevated: '#1f1f1f',
          colorBorderSecondary: '#303030',
        },
      }}
    >
      <div style={{ minHeight: '100vh', background: '#000000', padding: 24 }}>
        {/* En-tête */}
        <motion.div 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          style={{ 
            background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)',
            borderRadius: 20, 
            padding: '28px 32px', 
            marginBottom: 28,
            border: '1px solid #303030',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
          }}
        >
          <Row align="middle" justify="space-between">
            <Col>
              <Space size="middle">
                <div style={{ 
                  width: 56, 
                  height: 56, 
                  background: 'linear-gradient(135deg, #1677ff, #4096ff)',
                  borderRadius: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(22,119,255,0.3)'
                }}>
                  <FileTextOutlined style={{ fontSize: 28, color: 'white' }} />
                </div>
                <div>
                  <Title level={3} style={{ margin: 0, color: 'white', fontWeight: 600 }}>Gestion des Sinistres</Title>
                  <Text style={{ color: '#8c8c8c', fontSize: '14px' }}>
                    {totalClaims > 0 ? `${totalClaims} sinistres en base` : 'Aucun sinistre enregistré'}
                  </Text>
                </div>
              </Space>
            </Col>
            <Col>
              <Space size="middle">
                <Badge count={discordNotifications.length} offset={[-5, 5]} size="small">
                  <Button 
                    icon={<BellOutlined />} 
                    onClick={() => setNotificationDrawerVisible(true)}
                    style={{ borderRadius: '8px', height: '40px' }}
                  >
                    Notifications
                  </Button>
                </Badge>
                <Badge count={unprocessedAlerts.length} style={{ backgroundColor: '#ff4d4f' }} offset={[-5, 5]}>
                  <Button 
                    icon={<WarningOutlined />} 
                    danger 
                    onClick={() => setAlertDrawerVisible(true)}
                    style={{ borderRadius: '8px', height: '40px' }}
                  >
                    Alertes Fraude
                  </Button>
                </Badge>
                {!apiConnected && totalClaims === 0 && (
                  <Tooltip title="Problème de connexion API">
                    <Badge status="error" text="API déconnectée" />
                  </Tooltip>
                )}
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={fetchData}
                  style={{ borderRadius: '8px', height: '40px' }}
                >
                  Actualiser
                </Button>
                <Button 
                  icon={<PlusOutlined />} 
                  type="primary" 
                  onClick={() => setAddClaimModalVisible(true)}
                  style={{ background: '#52c41a', borderColor: '#52c41a', borderRadius: '8px', height: '40px', fontWeight: 500 }}
                >
                  Nouvelle déclaration
                </Button>
                <Button icon={<ExportOutlined />} style={{ borderRadius: '8px', height: '40px' }}>
                  Exporter
                </Button>
              </Space>
            </Col>
          </Row>
        </motion.div>

        {/* Alerte connexion API */}
        {!apiConnected && totalClaims === 0 && (
          <Alert
            message="⚠️ Problème de connexion à l'API"
            description="Impossible de communiquer avec le serveur backend. Vérifiez que l'API est démarrée sur le port correct."
            type="error"
            showIcon
            icon={<ApiOutlined />}
            style={{ marginBottom: 28, borderRadius: 12, border: 'none' }}
            action={
              <Button size="small" onClick={fetchData} style={{ borderRadius: '6px' }}>
                Réessayer
              </Button>
            }
          />
        )}

        {/* KPIs - Couleurs optimisées */}
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} lg={6}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
              <Card hoverable style={{ borderRadius: 16, background: '#141414', borderColor: '#303030' }}>
                <Statistic 
                  title={<span style={{ color: '#ffffff', fontSize: '14px' }}>Total sinistres</span>}
                  value={totalClaims} 
                  prefix={<FileTextOutlined style={{ fontSize: '20px', color: '#1677ff' }} />}
                  valueStyle={{ color: '#ffffff', fontSize: '28px', fontWeight: 600 }}
                />
                <Progress 
                  percent={processingRate} 
                  size="small" 
                  strokeColor="#1677ff" 
                />
                <Text style={{ color: '#94a3b8', fontSize: '12px', marginTop: 8, display: 'block' }}>
                  Taux de traitement: {processingRate}%
                </Text>
              </Card>
            </motion.div>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
              <Card hoverable style={{ borderRadius: 16, background: '#141414', borderColor: '#303030' }}>
                <Statistic 
                  title={<span style={{ color: '#ffffff', fontSize: '14px' }}>Sinistres traités</span>}
                  value={processedClaims} 
                  prefix={<CheckCircleOutlined style={{ fontSize: '20px', color: '#52c41a' }} />}
                  valueStyle={{ color: '#ffffff', fontSize: '28px', fontWeight: 600 }}
                />
                <Divider style={{ margin: '12px 0' }} />
                <Text style={{ color: '#94a3b8', fontSize: '12px' }}>
                  {totalClaims > 0 ? `${Math.round((processedClaims / totalClaims) * 100)}% traités` : 'Aucun sinistre'}
                </Text>
              </Card>
            </motion.div>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
              <Card hoverable style={{ borderRadius: 16, background: '#141414', borderColor: '#303030' }}>
                <Statistic 
                  title={<span style={{ color: '#ffffff', fontSize: '14px' }}>En attente</span>}
                  value={pendingClaims} 
                  prefix={<ClockCircleOutlined style={{ fontSize: '20px', color: '#faad14' }} />}
                  valueStyle={{ color: '#ffffff', fontSize: '28px', fontWeight: 600 }}
                />
                <Divider style={{ margin: '12px 0' }} />
                <Text style={{ color: '#94a3b8', fontSize: '12px' }}>
                  En cours de traitement
                </Text>
              </Card>
            </motion.div>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
              <Card hoverable style={{ borderRadius: 16, background: '#141414', borderColor: '#303030' }}>
                <Statistic 
                  title={<span style={{ color: '#ffffff', fontSize: '14px' }}>Montant total</span>}
                  value={totalAmount} 
                  suffix={<span style={{ color: '#ffffff' }}>€</span>}
                  prefix={<DollarOutlined style={{ fontSize: '20px', color: '#1677ff' }} />}
                  valueStyle={{ color: '#ffffff', fontSize: '28px', fontWeight: 600 }}
                />
                <Divider style={{ margin: '12px 0' }} />
                <Text style={{ color: '#94a3b8', fontSize: '12px' }}>
                  {safeRecentClaims.length > 0 ? `${safeRecentClaims.length} sinistres` : 'Aucun montant'}
                </Text>
              </Card>
            </motion.div>
          </Col>
        </Row>

        {/* Sinistres récents - Tableau avec texte en noir */}
        <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
          <Col span={24}>
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
              <Card 
                title={
                  <Space>
                    <FileTextOutlined style={{ color: '#1677ff' }} />
                    <span style={{ color: '#ffffff', fontWeight: 600 }}>Sinistres récents</span>
                    <Badge count={safeRecentClaims.length} style={{ backgroundColor: '#1677ff' }} />
                  </Space>
                }
                extra={
                  <Button icon={<ReloadOutlined />} type="link" onClick={fetchData} style={{ color: '#1677ff' }}>
                    Actualiser
                  </Button>
                }
                style={{ borderRadius: 16, background: '#141414', borderColor: '#303030' }}
                bodyStyle={{ padding: 0 }}
              >
                {safeRecentClaims.length > 0 ? (
                  <Table 
                    columns={columns} 
                    dataSource={safeRecentClaims} 
                    rowKey="id"
                    pagination={{ 
                      pageSize: 10, 
                      showSizeChanger: true, 
                      showTotal: (total) => <span style={{ color: '#ffffff' }}>Total {total} sinistres</span>,
                    }}
                    loading={loading}
                    scroll={{ x: 1000 }}
                    rowClassName={() => 'claims-table-row'}
                  />
                ) : (
                  <div style={{ padding: '60px', textAlign: 'center' }}>
                    <Empty description="Aucun sinistre trouvé dans la base de données" />
                  </div>
                )}
              </Card>
            </motion.div>
          </Col>
        </Row>

        {/* Styles CSS pour forcer le texte en noir */}
        <style jsx global>{`
          .claims-table-row td {
            color: #ffffff !important;
          }
          .claims-table-row .ant-table-cell {
            color: #ffffff !important;
          }
          .ant-table-tbody > tr > td {
            color: #ffffff !important;
          }
          .ant-table-tbody > tr > td span {
            color: #ffffff !important;
          }
          .ant-table-tbody > tr > td .ant-tag {
            color: #ffffff !important;
          }
          .ant-table-tbody > tr > td .ant-tag span {
            color: #ffffff  !important;
          }
          .ant-table-tbody > tr > td .ant-progress-text {
            color: #ffffff !important;
          }
        `}</style>

        {/* DRAWER NOTIFICATIONS DISCORD */}
        <Drawer
          title={
            <Space>
              <DiscordOutlined style={{ color: '#5865F2' }} />
              <span style={{ color: '#ffffff', fontWeight: 600 }}>Notifications Discord</span>
              <Badge count={discordNotifications.filter(n => !n.read).length} />
            </Space>
          }
          placement="right"
          onClose={() => setNotificationDrawerVisible(false)}
          open={notificationDrawerVisible}
          width={450}
          extra={
            <Button type="text" icon={<DeleteOutlined />} onClick={clearNotificationHistory} style={{ color: '#ef4444' }}>
              Effacer tout
            </Button>
          }
        >
          <div style={{ padding: 16 }}>
            {discordNotifications.length > 0 ? (
              <List
                dataSource={discordNotifications}
                renderItem={item => (
                  <div 
                    style={{ 
                      background: item.read ? '#1e293b' : '#2d3748',
                      borderRadius: 12, 
                      marginBottom: 12, 
                      padding: 16,
                      borderLeft: `4px solid ${item.type === 'new_claim' ? '#52c41a' : '#5865F2'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <Avatar icon={<DiscordOutlined />} style={{ background: '#5865F2' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text strong style={{ color: '#ffffff', fontSize: 14 }}>{item.title}</Text>
                          {!item.read && <Badge dot color="#10b981" />}
                        </div>
                        <Text style={{ color: '#94a3b8', fontSize: 13 }}>{item.message}</Text>
                        <div style={{ marginTop: 8 }}>
                          <Tag icon={<DiscordOutlined />} color="#5865F2" style={{ borderRadius: 12 }}>Discord</Tag>
                          <Text style={{ color: '#64748b', fontSize: 11, marginLeft: 8 }}>{item.timestamp}</Text>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              />
            ) : (
              <Empty description="Aucune notification Discord" />
            )}
          </div>
        </Drawer>

        {/* DRAWER ALERTES FRAUDE */}
        <Drawer
          title={
            <Space>
              <WarningOutlined style={{ color: '#ff4d4f' }} />
              <span style={{ color: '#ffffff', fontWeight: 600 }}>Alertes Fraude</span>
              <Badge count={unprocessedAlerts.length} style={{ backgroundColor: '#ff4d4f' }} />
            </Space>
          }
          placement="right"
          onClose={() => setAlertDrawerVisible(false)}
          open={alertDrawerVisible}
          width={500}
          extra={
            unprocessedAlerts.length > 0 && (
              <Button type="primary" icon={<CheckCircleOutlined />} onClick={handleAcceptAllAlerts} style={{ background: '#52c41a', borderColor: '#52c41a', borderRadius: 8 }}>
                Tout accepter
              </Button>
            )
          }
        >
          <div style={{ padding: 16 }}>
            {unprocessedAlerts.length > 0 ? (
              <List
                dataSource={unprocessedAlerts}
                renderItem={alert => (
                  <div 
                    style={{ 
                      background: '#2d3748',
                      borderRadius: 12, 
                      marginBottom: 12, 
                      padding: 16,
                      borderLeft: `4px solid ${alert.status === 'critical' ? '#ff4d4f' : '#faad14'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                      <Avatar icon={<WarningOutlined />} style={{ background: '#ff4d4f' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <Text strong style={{ color: '#ffffff', fontSize: 14 }}>
                            {alert.claim_number || `Alerte #${alert.id}`}
                          </Text>
                          <Tag color={alert.status === 'critical' ? 'error' : 'warning'} style={{ borderRadius: 12 }}>
                            {alert.status === 'critical' ? 'Critique' : 'Attention'}
                          </Tag>
                        </div>
                        <Text style={{ color: '#94a3b8', fontSize: 13 }}>{alert.reason || 'Score de fraude élevé détecté'}</Text>
                        <div style={{ marginTop: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <Text style={{ color: '#94a3b8', fontSize: 12 }}>Score de confiance</Text>
                            <Text strong style={{ color: '#10b981' }}>{100 - (alert.fraud_score || 0)}%</Text>
                          </div>
                          <Progress 
                            percent={100 - (alert.fraud_score || 0)} 
                            size="small" 
                            strokeColor={alert.fraud_score > 70 ? '#ff4d4f' : '#faad14'}
                            showInfo={false}
                          />
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
                            <Text style={{ color: '#94a3b8', fontSize: 12 }}>Client: {alert.client_name || alert.client}</Text>
                            <Button 
                              size="small" 
                              type="primary" 
                              icon={<CheckCircleOutlined />} 
                              onClick={() => handleAcceptAlert(alert.id)}
                              style={{ background: '#52c41a', borderColor: '#52c41a', borderRadius: 6 }}
                            >
                              Accepter
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              />
            ) : (
              <Empty description="Aucune alerte de fraude non traitée" />
            )}
          </div>
        </Drawer>

        {/* MODAL AJOUT DÉCLARATION */}
        <Modal
          title={<Space><PlusOutlined style={{ color: '#52c41a' }} /> <span style={{ color: '#000000' }}>Nouvelle déclaration de sinistre</span></Space>}
          open={addClaimModalVisible}
          onCancel={() => { setAddClaimModalVisible(false); addClaimForm.resetFields(); }}
          footer={null}
          width={720}
          style={{ top: 20 }}
        >
          <Form form={addClaimForm} layout="vertical" onFinish={handleAddClaim}>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="client_name" label={<span style={{ color: '#000000' }}>Nom du client</span>} rules={[{ required: true }]}>
                  <Input placeholder="Nom complet" size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="client_email" label={<span style={{ color: '#000000' }}>Email</span>}>
                  <Input type="email" placeholder="Email" size="large" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="client_phone" label={<span style={{ color: '#000000' }}>Téléphone</span>}>
                  <Input placeholder="Téléphone" size="large" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="policy_number" label={<span style={{ color: '#000000' }}>N° Police</span>} rules={[{ required: true }]}>
                  <Input placeholder="Numéro de police" size="large" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="type" label={<span style={{ color: '#000000' }}>Type de sinistre</span>} rules={[{ required: true }]}>
                  <Select size="large">
                    <Option value="Auto">🚗 Auto</Option>
                    <Option value="Habitation">🏠 Habitation</Option>
                    <Option value="Santé">❤️ Santé</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="amount" label={<span style={{ color: '#000000' }}>Montant estimé (€)</span>}>
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="Montant" size="large" />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="incident_date" label={<span style={{ color: '#000000' }}>Date du sinistre</span>} rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} size="large" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="description" label={<span style={{ color: '#000000' }}>Description</span>}>
              <TextArea rows={3} placeholder="Description du sinistre..." />
            </Form.Item>
            <Form.Item name="circumstances" label={<span style={{ color: '#000000' }}>Circonstances</span>}>
              <TextArea rows={3} placeholder="Circonstances du sinistre..." />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" size="large" style={{ borderRadius: '8px' }}>Enregistrer</Button>
                <Button onClick={() => setAddClaimModalVisible(false)} size="large" style={{ borderRadius: '8px' }}>Annuler</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* MODAL DÉTAILS SINISTRE */}
        <Modal
          title={
            <Space>
              <FileProtectOutlined style={{ color: '#faad14' }} />
              <span style={{ color: '#000000' }}>Détails du sinistre</span>
              {selectedClaim && (
                <Tag color={getStatusColor(selectedClaim.status)} style={{ borderRadius: '10px' }}>
                  <span style={{ color: '#000000' }}>{getStatusText(selectedClaim.status)}</span>
                </Tag>
              )}
            </Space>
          }
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          width={1000}
          footer={[
            <Button key="close" onClick={() => setModalVisible(false)} style={{ borderRadius: '8px' }}>Fermer</Button>,
            selectedClaim?.status === 'pending' && (
              <Button key="process" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleProcessClaim(selectedClaim.id, 'processing')} style={{ borderRadius: '8px' }}>
                Traiter le sinistre
              </Button>
            ),
            selectedClaim?.status === 'processing' && (
              <Button key="compensate" type="primary" icon={<DollarOutlined />} style={{ background: '#52c41a', borderColor: '#52c41a', borderRadius: '8px' }} onClick={() => setCompensationModalVisible(true)}>
                Indemniser
              </Button>
            )
          ]}
        >
          {selectedClaim && (
            <div>
              <Tabs defaultActiveKey="info">
                <TabPane tab={<span style={{ color: '#000000' }}>Informations</span>} key="info">
                  <Descriptions column={2} bordered size="small">
                    <Descriptions.Item label={<span style={{ color: '#000000' }}>N° Sinistre</span>} span={2}>
                      <Text style={{ color: '#000000', fontFamily: 'monospace', fontSize: '14px' }}>{selectedClaim.claim_number}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#000000' }}>Client</span>}>
                      <Space>
                        <Avatar icon={<UserOutlined />} size="small" style={{ backgroundColor: '#1677ff' }} />
                        <Text style={{ color: '#000000' }}>{selectedClaim.client_name}</Text>
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#000000' }}>Contact</span>}>
                      <Space direction="vertical" size={0}>
                        <Text style={{ color: '#000000' }}><MailOutlined /> {selectedClaim.client_email || '-'}</Text>
                        <Text style={{ color: '#000000' }}><PhoneOutlined /> {selectedClaim.client_phone || '-'}</Text>
                      </Space>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#000000' }}>Type</span>}>
                      <Tag icon={getTypeIcon(selectedClaim.type)} color="blue" style={{ borderRadius: '10px' }}>
                        <span style={{ color: '#000000' }}>{selectedClaim.type}</span>
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#000000' }}>Montant</span>}>
                      <Text style={{ color: '#000000', fontSize: '16px', fontWeight: 'bold' }}>
                        {selectedClaim.amount?.toLocaleString()} €
                      </Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#000000' }}>Date sinistre</span>}>
                      <Text style={{ color: '#000000' }}>{selectedClaim.incident_date ? dayjs(selectedClaim.incident_date).format('DD/MM/YYYY') : '-'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#000000' }}>Date déclaration</span>}>
                      <Text style={{ color: '#000000' }}>{selectedClaim.created_at ? dayjs(selectedClaim.created_at).format('DD/MM/YYYY') : '-'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#000000' }}>Description</span>} span={2}>
                      <Text style={{ color: '#000000' }}>{selectedClaim.description || 'Non renseignée'}</Text>
                    </Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#000000' }}>Circonstances</span>} span={2}>
                      <Text style={{ color: '#000000' }}>{selectedClaim.circumstances || 'Non renseignées'}</Text>
                    </Descriptions.Item>
                  </Descriptions>
                </TabPane>

                <TabPane tab={<span style={{ color: '#000000' }}>Devis</span>} key="quotes">
                  <div style={{ marginBottom: 16 }}>
                    <Button 
                      type="dashed" 
                      icon={<PlusOutlined />} 
                      onClick={() => setQuoteDrawerVisible(true)}
                      disabled={selectedClaim.status === 'approved'}
                      style={{ borderRadius: '8px' }}
                    >
                      Ajouter un devis
                    </Button>
                  </div>
                  {safeQuotes.filter(q => q.claim_id === selectedClaim.id).length > 0 ? (
                    <List
                      dataSource={safeQuotes.filter(q => q.claim_id === selectedClaim.id)}
                      renderItem={quote => (
                        <List.Item>
                          <Card size="small" style={{ width: '100%', borderRadius: '12px', background: '#1f1f1f' }}>
                            <Row justify="space-between" align="middle">
                              <Col>
                                <Space>
                                  <ShopOutlined style={{ fontSize: '24px', color: '#1677ff' }} />
                                  <div>
                                    <Text style={{ color: '#ffffff' }} strong>{quote.provider}</Text>
                                    <br />
                                    <Text style={{ color: '#94a3b8', fontSize: '12px' }}>{quote.date ? dayjs(quote.date).format('DD/MM/YYYY') : '-'}</Text>
                                  </div>
                                </Space>
                              </Col>
                              <Col>
                                <Text style={{ color: '#52c41a', fontSize: '18px', fontWeight: 'bold' }}>{quote.amount?.toLocaleString()} €</Text>
                              </Col>
                            </Row>
                            <Paragraph style={{ color: '#94a3b8', marginTop: 12 }}>{quote.description}</Paragraph>
                          </Card>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty description="Aucun devis disponible" />
                  )}
                </TabPane>

                <TabPane tab={<span style={{ color: '#000000' }}>Expertise</span>} key="expertise">
                  <div style={{ marginBottom: 16 }}>
                    <Button 
                      type="dashed" 
                      icon={<PlusOutlined />} 
                      onClick={() => setExpertModalVisible(true)}
                      disabled={selectedClaim.status === 'approved'}
                      style={{ borderRadius: '8px' }}
                    >
                      Ajouter un expert
                    </Button>
                  </div>
                  {safeExperts.filter(e => e.claim_id === selectedClaim.id).length > 0 ? (
                    <List
                      dataSource={safeExperts.filter(e => e.claim_id === selectedClaim.id)}
                      renderItem={expert => (
                        <List.Item>
                          <Card size="small" style={{ width: '100%', borderRadius: '12px', background: '#1f1f1f' }}>
                            <Row justify="space-between" align="middle">
                              <Col>
                                <Space>
                                  <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
                                  <div>
                                    <Text style={{ color: '#ffffff' }} strong>{expert.name}</Text>
                                    <br />
                                    <Text style={{ color: '#94a3b8', fontSize: '12px' }}>{expert.title}</Text>
                                  </div>
                                </Space>
                              </Col>
                              <Col>
                                <Text style={{ color: '#94a3b8', fontSize: '12px' }}>{expert.date ? dayjs(expert.date).format('DD/MM/YYYY') : '-'}</Text>
                              </Col>
                            </Row>
                            <Divider style={{ margin: '12px 0', borderColor: '#303030' }} />
                            <Text style={{ color: '#ffffff' }} strong>Rapport:</Text>
                            <Paragraph style={{ color: '#94a3b8' }}>{expert.report || '-'}</Paragraph>
                            <Text style={{ color: '#ffffff' }} strong>Conclusions:</Text>
                            <Paragraph style={{ color: '#94a3b8' }}>{expert.conclusions || '-'}</Paragraph>
                          </Card>
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty description="Aucune expertise disponible" />
                  )}
                </TabPane>

                <TabPane tab={<span style={{ color: '#000000' }}>Documents</span>} key="documents">
                  <Upload.Dragger beforeUpload={(file) => handleUploadDocument(file, selectedClaim.id)} accept=".pdf,.jpg,.png" multiple>
                    <p className="ant-upload-drag-icon"><UploadOutlined style={{ color: '#000000' }} /></p>
                    <p className="ant-upload-text" style={{ color: '#000000' }}>Cliquez ou glissez des fichiers ici</p>
                    <p className="ant-upload-hint" style={{ color: '#000000' }}>Support des fichiers PDF, JPG, PNG</p>
                  </Upload.Dragger>
                </TabPane>
              </Tabs>

              {selectedClaim.fraud_score > 70 && (
                <Alert
                  message="⚠️ Alerte fraude détectée"
                  description={`Cette transaction présente un risque de fraude de ${selectedClaim.fraud_score}%. Une investigation approfondie est recommandée.`}
                  type="error"
                  showIcon
                  icon={<WarningOutlined />}
                  style={{ marginTop: 16, borderRadius: '12px' }}
                />
              )}
            </div>
          )}
        </Modal>

        {/* DRAWER AJOUT DEVIS */}
        <Drawer
          title={<span style={{ color: '#000000' }}>Ajouter un devis</span>}
          placement="right"
          onClose={() => setQuoteDrawerVisible(false)}
          open={quoteDrawerVisible}
          width={480}
        >
          <Form form={quoteForm} layout="vertical" onFinish={handleAddQuote}>
            <Form.Item name="provider" label={<span style={{ color: '#000000' }}>Prestataire</span>} rules={[{ required: true }]}>
              <Input placeholder="Nom du prestataire" size="large" />
            </Form.Item>
            <Form.Item name="amount" label={<span style={{ color: '#000000' }}>Montant (€)</span>} rules={[{ required: true }]}>
              <InputNumber min={0} style={{ width: '100%' }} placeholder="Montant" size="large" />
            </Form.Item>
            <Form.Item name="date" label={<span style={{ color: '#000000' }}>Date du devis</span>} rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} size="large" />
            </Form.Item>
            <Form.Item name="description" label={<span style={{ color: '#000000' }}>Description</span>}>
              <TextArea rows={4} placeholder="Description des travaux/prestations..." />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" size="large" style={{ borderRadius: '8px' }}>Ajouter le devis</Button>
                <Button onClick={() => setQuoteDrawerVisible(false)} size="large" style={{ borderRadius: '8px' }}>Annuler</Button>
              </Space>
            </Form.Item>
          </Form>
        </Drawer>

        {/* MODAL AJOUT EXPERT */}
        <Modal
          title={<span style={{ color: '#000000' }}>Ajouter un expert</span>}
          open={expertModalVisible}
          onCancel={() => setExpertModalVisible(false)}
          footer={null}
          width={600}
        >
          <Form form={expertForm} layout="vertical" onFinish={handleAddExpert}>
            <Form.Item name="name" label={<span style={{ color: '#000000' }}>Nom de l'expert</span>} rules={[{ required: true }]}>
              <Input placeholder="Nom complet" size="large" />
            </Form.Item>
            <Form.Item name="title" label={<span style={{ color: '#000000' }}>Titre / Fonction</span>}>
              <Input placeholder="Expert en sinistres" size="large" />
            </Form.Item>
            <Form.Item name="date" label={<span style={{ color: '#000000' }}>Date de l'expertise</span>} rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} size="large" />
            </Form.Item>
            <Form.Item name="report" label={<span style={{ color: '#000000' }}>Rapport d'expertise</span>}>
              <TextArea rows={3} placeholder="Rapport détaillé..." />
            </Form.Item>
            <Form.Item name="conclusions" label={<span style={{ color: '#000000' }}>Conclusions</span>}>
              <TextArea rows={3} placeholder="Conclusions de l'expertise..." />
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" size="large" style={{ borderRadius: '8px' }}>Ajouter l'expert</Button>
                <Button onClick={() => setExpertModalVisible(false)} size="large" style={{ borderRadius: '8px' }}>Annuler</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* MODAL INDEMNISATION */}
        <Modal
          title={<Space><DollarOutlined style={{ color: '#52c41a' }} /> <span style={{ color: '#000000' }}>Indemnisation du sinistre</span></Space>}
          open={compensationModalVisible}
          onCancel={() => setCompensationModalVisible(false)}
          footer={null}
        >
          <Form form={compensationForm} layout="vertical" onFinish={handleCompensation}>
            <Form.Item name="amount" label={<span style={{ color: '#000000' }}>Montant de l'indemnisation (€)</span>} rules={[{ required: true }]}>
              <InputNumber 
                min={0} 
                max={selectedClaim?.amount} 
                style={{ width: '100%' }} 
                placeholder="Montant"
                defaultValue={selectedClaim?.amount}
                size="large"
              />
            </Form.Item>
            <Form.Item name="date" label={<span style={{ color: '#000000' }}>Date d'indemnisation</span>} rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} defaultValue={dayjs()} size="large" />
            </Form.Item>
            <Form.Item name="payment_method" label={<span style={{ color: '#000000' }}>Mode de paiement</span>} rules={[{ required: true }]}>
              <Select size="large">
                <Option value="virement">Virement bancaire</Option>
                <Option value="cheque">Chèque</Option>
                <Option value="especes">Espèces</Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Space>
                <Button type="primary" htmlType="submit" icon={<CheckOutlined />} style={{ background: '#52c41a', borderColor: '#52c41a', borderRadius: '8px' }} size="large">
                  Valider l'indemnisation
                </Button>
                <Button onClick={() => setCompensationModalVisible(false)} size="large" style={{ borderRadius: '8px' }}>Annuler</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default ClaimsProcessing;