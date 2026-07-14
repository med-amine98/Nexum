// src/modules/support/AutoResolveTicket.js - Version finale adaptée au backend

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Card, Row, Col, Button, Input, Space,
  Typography, Alert, Tabs, Table, Tag,
  Progress, Spin, message, Divider, Badge,
  Modal, Descriptions, Collapse,
  Tooltip, Avatar, List, Statistic,
  Switch, Empty, Steps, theme,
  Popconfirm, Segmented,
  Form, Select, Dropdown
} from 'antd';
import {
  RobotOutlined, SendOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  LoadingOutlined, ClockCircleOutlined,
  FileTextOutlined,
  ThunderboltOutlined, SearchOutlined,
  LikeOutlined, DislikeOutlined,
  SolutionOutlined,
  UserOutlined, BulbOutlined,
  DatabaseOutlined, BookOutlined,
  TrophyOutlined,
  HistoryOutlined, ArrowLeftOutlined,
  StarOutlined,
  LineChartOutlined,
  AppstoreOutlined, ReloadOutlined,
  FilterOutlined, SortAscendingOutlined,
  DownloadOutlined,
  NotificationOutlined, BellOutlined,
  PlusOutlined, MailOutlined, ApiOutlined, MessageOutlined, GlobalOutlined,
  BankOutlined, InsuranceOutlined, ShopOutlined, DiscordOutlined,
  SafetyOutlined, CustomerServiceOutlined, BarChartOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

dayjs.extend(relativeTime);
dayjs.locale('fr');

// Configuration des secteurs
const SECTORS = {
  banque: { name: 'Banque', icon: <BankOutlined />, color: '#1890ff', description: 'Services bancaires, comptes, transactions', bgLight: '#e6f7ff' },
  assurance: { name: 'Assurance', icon: <InsuranceOutlined />, color: '#52c41a', description: 'Contrats, sinistres, garanties', bgLight: '#f6ffed' },
  entreprise: { name: 'Entreprise', icon: <ShopOutlined />, color: '#722ed1', description: 'ERP, facturation, support technique', bgLight: '#f9f0ff' }
};

// Sources possibles (utilisées pour l'affichage)
const SOURCES = {
  web: { name: 'Formulaire web', icon: <GlobalOutlined />, color: '#1890ff', bgLight: '#e6f7ff' },
  discord: { name: 'Discord', icon: <DiscordOutlined />, color: '#5865F2', bgLight: '#f0f2ff' },
  email: { name: 'Email', icon: <MailOutlined />, color: '#52c41a', bgLight: '#f6ffed' },
  api: { name: 'API', icon: <ApiOutlined />, color: '#722ed1', bgLight: '#f9f0ff' },
  discord_assurance: { name: 'Discord Assurance', icon: <DiscordOutlined />, color: '#eb2f96', bgLight: '#fff0f6', parent: 'discord' }
};

const AutoResolveTicket = () => {
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [userQuery, setUserQuery] = useState('');
  const [solution, setSolution] = useState(null);
  const [conversation, setConversation] = useState([]);
  const [autoResolve, setAutoResolve] = useState(true);
  const [activeTab, setActiveTab] = useState('resolve');
  const [ticketStats, setTicketStats] = useState(null);
  const [knowledgeBase, setKnowledgeBase] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterSector, setFilterSector] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [refreshing, setRefreshing] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createForm] = Form.useForm();
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [replyForm] = Form.useForm();
  const messagesEndRef = useRef(null);
  const { token } = theme.useToken();

  // Fonction utilitaire pour extraire un tableau de la réponse API
  const extractDataArray = (responseData, fallback = []) => {
    if (Array.isArray(responseData)) return responseData;
    if (responseData && typeof responseData === 'object' && Array.isArray(responseData.data)) {
      return responseData.data;
    }
    return fallback;
  };

  // Fonction pour extraire un objet de la réponse (pour les stats, solution, etc.)
  const extractDataObject = (responseData, fallback = {}) => {
    if (responseData && typeof responseData === 'object') {
      if (responseData.data && typeof responseData.data === 'object') {
        return responseData.data;
      }
      return responseData;
    }
    return fallback;
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversation]);

  const fetchData = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchTickets(),
        fetchTicketStats(),
        fetchKnowledgeBase()
      ]);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchTickets = async () => {
    try {
      const response = await api.get('/support/tickets');
      const data = extractDataArray(response.data, []);
      setTickets(data);
    } catch (error) {
      console.error('Erreur chargement tickets:', error);
      setTickets([]);
    }
  };

  const fetchTicketStats = async () => {
    try {
      const response = await api.get('/support/tickets/stats');
      const stats = extractDataObject(response.data, {});
      setTicketStats(stats);
    } catch (error) {
      console.error('Erreur chargement stats:', error);
      setTicketStats({
        resolution_rate: 94,
        avg_resolution_time: 45,
        resolved_by_ai: 1234,
        satisfaction_rate: 92,
        monthly_trend: [],
        category_distribution: [],
        sector_distribution: [
          { sector: 'banque', count: 45, color: '#1890ff' },
          { sector: 'assurance', count: 30, color: '#52c41a' },
          { sector: 'entreprise', count: 55, color: '#722ed1' }
        ]
      });
    }
  };

  const fetchKnowledgeBase = async () => {
    try {
      const response = await api.get('/support/knowledge-base');
      const data = extractDataArray(response.data, []);
      setKnowledgeBase(data);
    } catch (error) {
      console.error('Erreur chargement base connaissances:', error);
      setKnowledgeBase([]);
    }
  };

  // Création d'un ticket (adaptation des valeurs pour le backend)
  const createTicket = async (values) => {
    setLoading(true);
    try {
      // Préparer les données : s'assurer que les enums sont en minuscules
      const payload = {
        subject: values.subject,
        description: values.description,
        category: values.category?.toLowerCase() || 'general',
        priority: values.priority?.toLowerCase() || 'medium',
        sector: values.sector?.toLowerCase() || 'entreprise',
        user_email: values.user_email,
        user_name: values.user_name,
        source: 'web' // le backend attend 'web' comme source par défaut
      };
      
      const response = await api.post('/support/tickets', payload);
      const newTicket = extractDataObject(response.data, {});
      
      if (newTicket.id) {
        message.success(`Ticket ${newTicket.ticket_number || 'créé'} avec succès !`);
        setCreateModalVisible(false);
        createForm.resetFields();
        await fetchTickets();
        setSelectedTicket(newTicket);
        setUserQuery(newTicket.description || '');
        setConversation([]);
        setSolution(null);
      } else {
        message.error('Erreur lors de la création du ticket (données inattendues)');
      }
      
    } catch (error) {
      console.error('Erreur création ticket:', error);
      const detail = error.response?.data?.detail || 'Erreur lors de la création du ticket';
      message.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const replyToDiscordTicket = async (values) => {
    if (!selectedTicket) return;
    
    setLoading(true);
    try {
      const response = await api.post('/discord/bank/receive', {
        user_id: selectedTicket.user_id,
        response: values.response,
        responder: 'Support ERP',
        ticket_id: selectedTicket.ticket_number
      });
      
      if (response.data.success) {
        message.success(`Réponse envoyée à l'utilisateur Discord`);
        setReplyModalVisible(false);
        replyForm.resetFields();
        
        setTickets(prev => prev.map(t => 
          t.id === selectedTicket.id ? { ...t, status: 'resolved', resolved_at: new Date(), erp_response: values.response } : t
        ));
        
        await fetchTickets();
      } else {
        message.error('Erreur lors de l\'envoi de la réponse');
      }
    } catch (error) {
      console.error('Erreur envoi réponse Discord:', error);
      message.error('Erreur lors de l\'envoi de la réponse au client Discord');
    } finally {
      setLoading(false);
    }
  };

  const resolveTicket = async (ticketId, query) => {
    if (!ticketId) {
      message.warning('Veuillez sélectionner un ticket');
      return;
    }
    
    setLoading(true);
    try {
      const response = await api.post('/support/tickets/solve', {
        ticket_id: ticketId,
        query: query || userQuery,
        auto_resolve: autoResolve
      });
      
      const result = extractDataObject(response.data, {});
      setSolution(result);
      setConversation(prev => [
        ...prev,
        { 
          role: 'user', 
          content: query || userQuery, 
          timestamp: new Date(), 
          confidence: result.confidence 
        },
        { 
          role: 'assistant', 
          content: result.solution || 'Aucune solution générée', 
          timestamp: new Date(), 
          sources: result.sources || [],
          steps: result.steps || []
        }
      ]);
      
      message.success('Ticket résolu avec succès !');
      await fetchTickets();
      
    } catch (error) {
      console.error('Erreur résolution:', error);
      message.error(error.response?.data?.detail || 'Erreur lors de la résolution du ticket');
    } finally {
      setLoading(false);
    }
  };

  const markHelpful = async (solutionId, helpful) => {
    if (!solutionId) return;
    
    try {
      await api.post('/support/solutions/feedback', {
        solution_id: solutionId,
        helpful: helpful
      });
      message.success(helpful ? 'Merci pour votre retour !' : 'Nous allons améliorer cette solution');
    } catch (error) {
      console.error('Erreur feedback:', error);
      message.error('Erreur lors de l\'envoi du feedback');
    }
  };

  const markTicketResolved = async (ticketId) => {
    if (!ticketId) return;
    
    try {
      await api.put(`/support/tickets/${ticketId}/status`, { status: 'resolved' });
      setTickets(prev => prev.map(t => 
        t.id === ticketId ? { ...t, status: 'resolved', resolved_at: new Date() } : t
      ));
      setSelectedTicket(null);
      setSolution(null);
      setConversation([]);
      message.success('Ticket marqué comme résolu');
      await fetchTickets();
    } catch (error) {
      console.error('Erreur:', error);
      message.error('Erreur lors de la mise à jour');
    }
  };

  // ===== GETTERS =====
  const getSectorIcon = (sector) => {
    const icons = {
      banque: <BankOutlined />,
      assurance: <InsuranceOutlined />,
      entreprise: <ShopOutlined />
    };
    return icons[sector] || <ShopOutlined />;
  };

  const getSectorColor = (sector) => {
    const colors = {
      banque: '#1890ff',
      assurance: '#52c41a',
      entreprise: '#722ed1'
    };
    return colors[sector] || '#722ed1';
  };

  const getSectorBgLight = (sector) => {
    const bgLights = {
      banque: '#e6f7ff',
      assurance: '#f6ffed',
      entreprise: '#f9f0ff'
    };
    return bgLights[sector] || '#f5f5f5';
  };

  const getSectorName = (sector) => {
    const names = {
      banque: 'Banque',
      assurance: 'Assurance',
      entreprise: 'Entreprise'
    };
    return names[sector] || 'Entreprise';
  };

  const getSourceIcon = (source) => {
    const icons = {
      web: <GlobalOutlined />,
      discord: <DiscordOutlined />,
      discord_assurance: <DiscordOutlined />,
      email: <MailOutlined />,
      api: <ApiOutlined />
    };
    return icons[source] || <GlobalOutlined />;
  };

  const getSourceColor = (source) => {
    const colors = {
      web: '#1890ff',
      discord: '#5865F2',
      discord_assurance: '#eb2f96',
      email: '#52c41a',
      api: '#722ed1'
    };
    return colors[source] || '#1890ff';
  };

  const getSourceName = (source) => {
    const names = {
      web: 'Formulaire web',
      discord: 'Discord',
      discord_assurance: 'Discord Assurance',
      email: 'Email',
      api: 'API'
    };
    return names[source] || 'Web';
  };

  // ===== FILTRES ET TRI =====
  const filteredKnowledgeBase = useMemo(() => {
    if (!searchTerm) return knowledgeBase;
    return knowledgeBase.filter(item => 
      item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.content?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [knowledgeBase, searchTerm]);

  const filteredTickets = useMemo(() => {
    // Si tickets n'est pas un tableau, retourner []
    if (!Array.isArray(tickets)) return [];
    let filtered = tickets.filter(t => t.status === 'open');
    
    if (filterPriority !== 'all') {
      filtered = filtered.filter(t => t.priority === filterPriority);
    }
    
    if (filterSector !== 'all') {
      filtered = filtered.filter(t => t.sector === filterSector);
    }
    
    if (filterSource !== 'all') {
      filtered = filtered.filter(t => t.source === filterSource);
    }
    
    if (sortBy === 'date') {
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortBy === 'priority') {
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      filtered.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));
    }
    
    return filtered;
  }, [tickets, filterPriority, filterSector, filterSource, sortBy]);

  const resolvedTickets = useMemo(() => {
    if (!Array.isArray(tickets)) return [];
    return tickets.filter(t => t.status === 'resolved');
  }, [tickets]);

  // Statistiques par secteur
  const sectorStats = useMemo(() => {
    const stats = { banque: 0, assurance: 0, entreprise: 0 };
    if (Array.isArray(tickets)) {
      tickets.forEach(ticket => {
        if (stats[ticket.sector] !== undefined) stats[ticket.sector]++;
      });
    }
    return stats;
  }, [tickets]);

  // Statistiques par source
  const sourceStats = useMemo(() => {
    const stats = { web: 0, discord: 0, discord_assurance: 0, email: 0, api: 0 };
    if (Array.isArray(tickets)) {
      tickets.forEach(ticket => {
        if (stats[ticket.source] !== undefined) stats[ticket.source]++;
      });
    }
    return stats;
  }, [tickets]);

  const ticketSources = [
    { name: 'Formulaire web', icon: <GlobalOutlined />, color: '#1890ff', count: sourceStats.web || 0, source: 'web' },
    { name: 'Discord', icon: <DiscordOutlined />, color: '#5865F2', count: sourceStats.discord || 0, source: 'discord' },
    { name: 'Discord Assurance', icon: <DiscordOutlined />, color: '#eb2f96', count: sourceStats.discord_assurance || 0, source: 'discord_assurance' },
    { name: 'Email', icon: <MailOutlined />, color: '#52c41a', count: sourceStats.email || 0, source: 'email' },
    { name: 'API', icon: <ApiOutlined />, color: '#722ed1', count: sourceStats.api || 0, source: 'api' }
  ];

  const sectorItems = [
    { key: 'banque', label: 'Banque', icon: <BankOutlined />, color: '#1890ff', count: sectorStats.banque || 0 },
    { key: 'assurance', label: 'Assurance', icon: <InsuranceOutlined />, color: '#52c41a', count: sectorStats.assurance || 0 },
    { key: 'entreprise', label: 'Entreprise', icon: <ShopOutlined />, color: '#722ed1', count: sectorStats.entreprise || 0 }
  ];

  // ===== COLONNES DU TABLEAU =====
  const columns = [
    { 
      title: 'Source', 
      dataIndex: 'source', 
      key: 'source', 
      width: 100,
      render: (source) => (
        <Tooltip title={getSourceName(source)}>
          <Tag color={getSourceColor(source)} icon={getSourceIcon(source)} style={{ borderRadius: 16, padding: '4px 12px' }}>
            {getSourceIcon(source)} {getSourceName(source).replace('Discord ', '')}
          </Tag>
        </Tooltip>
      )
    },
    { 
      title: 'ID', 
      dataIndex: 'id', 
      key: 'id', 
      width: 80,
      render: (id) => <Tag color="blue">#{id}</Tag>
    },
    { 
      title: 'Secteur', 
      dataIndex: 'sector', 
      key: 'sector', 
      width: 110,
      render: (sector) => (
        <Tag 
          color={getSectorColor(sector)} 
          icon={getSectorIcon(sector)}
          style={{ borderRadius: 16, padding: '4px 12px' }}
        >
          {getSectorName(sector)}
        </Tag>
      )
    },
    { 
      title: 'Sujet', 
      dataIndex: 'subject', 
      key: 'subject',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{text}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.user_name || record.user_email?.split('@')[0] || 'Anonyme'}
          </Text>
        </Space>
      )
    },
    { 
      title: 'Statut', 
      dataIndex: 'status', 
      key: 'status', 
      width: 100,
      render: (s) => (
        <Badge 
          status={s === 'open' ? 'processing' : 'success'} 
          text={s === 'open' ? 'Ouvert' : 'Résolu'} 
        />
      )
    },
    { 
      title: 'Priorité', 
      dataIndex: 'priority', 
      key: 'priority',
      width: 100,
      render: (p) => {
        const config = {
          critical: { color: "#1e293b", bg: '#000', text: 'Critique' },
          high: { color: '#ff4d4f', bg: '#fff1f0', text: 'Haute' },
          medium: { color: '#faad14', bg: '#fffbe6', text: 'Moyenne' },
          low: { color: '#52c41a', bg: '#f6ffed', text: 'Basse' }
        };
        const c = config[p] || config.medium;
        return <Tag color={c.color} style={{ background: c.bg, border: 'none' }}>{c.text}</Tag>;
      }
    },
    { 
      title: 'Créé le', 
      dataIndex: 'created_at', 
      key: 'created_at', 
      width: 140,
      render: (d) => d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '-'
    },
    {
      title: 'Actions',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          <Button 
            type="primary" 
            size="small" 
            icon={<RobotOutlined />}
            onClick={() => {
              setSelectedTicket(record);
              setUserQuery(record.description);
              setConversation([]);
              setSolution(null);
              setActiveTab('resolve');
            }}
          >
            Résoudre
          </Button>
          {(record.source === 'discord' || record.source === 'discord_assurance') && (
            <Button 
              size="small" 
              icon={<MessageOutlined />}
              onClick={() => {
                setSelectedTicket(record);
                setReplyModalVisible(true);
              }}
            >
              Répondre
            </Button>
          )}
        </Space>
      )
    }
  ];

  const formatTime = (date) => {
    return date ? dayjs(date).format('HH:mm') : '';
  };

  const formatRelativeTime = (date) => {
    return date ? dayjs(date).fromNow() : '';
  };

  return (
    <div style={{ padding: 24, background: token.colorBgLayout, minHeight: '100vh' }}>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 24,
          padding: '32px 32px',
          marginBottom: 32,
          color: 'white'
        }}>
          <Row align="middle" justify="space-between">
            <Col>
              <Space size="large">
                <div style={{ 
                  width: 70, 
                  height: 70, 
                  background: 'rgba(255,255,255,0.2)', 
                  borderRadius: 24, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  backdropFilter: 'blur(10px)'
                }}>
                  <RobotOutlined style={{ fontSize: 36, color: 'white' }} />
                </div>
                <div>
                  <Title level={2} style={{ margin: 0, color: 'white' }}>Support Auto-Résolu par IA</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                    Tickets multi-sources (Web, Discord, Email, API) - Résolution automatique par secteur
                  </Text>
                </div>
              </Space>
            </Col>
            <Col>
              <Space>
                <Tooltip title="Rafraîchir">
                  <Button 
                    icon={<ReloadOutlined spin={refreshing} />} 
                    onClick={fetchData}
                    ghost
                  />
                </Tooltip>
                <Badge count={filteredTickets.length} style={{ backgroundColor: '#ff4d4f' }}>
                  <Button icon={<BellOutlined />} ghost>Tickets ouverts</Button>
                </Badge>
                <Button 
                  type="primary" 
                  icon={<PlusOutlined />} 
                  onClick={() => setCreateModalVisible(true)}
                  ghost
                >
                  Nouveau ticket
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="large"
          items={[
            {
              key: 'resolve',
              label: <span><RobotOutlined /> Résolution IA</span>,
              children: (
                <Row gutter={[24, 24]}>
                  <Col xs={24} lg={16}>
                    <Card 
                      variant="borderless"
                      style={{ 
                        borderRadius: 24, 
                        minHeight: 600, 
                        overflow: 'hidden',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                      }}
                      bodyStyle={{ padding: 0 }}
                    >
                      {!selectedTicket ? (
                        <div style={{ textAlign: 'center', padding: 60 }}>
                          <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.5 }}
                          >
                            <Avatar 
                              icon={<RobotOutlined />} 
                              size={80} 
                              style={{ backgroundColor: token.colorPrimary, marginBottom: 24 }}
                            />
                            <Title level={4}>Assistant de résolution IA</Title>
                            <Paragraph type="secondary">
                              Sélectionnez un ticket dans la liste à droite ou créez-en un nouveau pour commencer.
                              L'IA adaptera sa réponse en fonction du secteur (Banque, Assurance, Entreprise).
                            </Paragraph>
                            <Space>
                              <Tag icon={<BankOutlined />} color="blue">Banque</Tag>
                              <Tag icon={<InsuranceOutlined />} color="green">Assurance</Tag>
                              <Tag icon={<ShopOutlined />} color="purple">Entreprise</Tag>
                              <Tag icon={<DiscordOutlined />} color="#5865F2">Discord</Tag>
                            </Space>
                            <div style={{ marginTop: 24 }}>
                              <Button 
                                type="primary" 
                                icon={<PlusOutlined />} 
                                onClick={() => setCreateModalVisible(true)}
                                size="large"
                              >
                                Créer un ticket
                              </Button>
                            </div>
                          </motion.div>
                        </div>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div style={{ padding: '24px 24px 0 24px' }}>
                            <Button 
                              icon={<ArrowLeftOutlined />} 
                              onClick={() => {
                                setSelectedTicket(null);
                                setSolution(null);
                                setConversation([]);
                              }}
                              style={{ marginBottom: 16 }}
                            >
                              Retour à la liste
                            </Button>
                            
                            <Alert
                              message={
                                <Space>
                                  {getSectorIcon(selectedTicket.sector)}
                                  <Text strong>Ticket #{selectedTicket.id}</Text>
                                  <Tag color={getSectorColor(selectedTicket.sector)} icon={getSectorIcon(selectedTicket.sector)}>
                                    {getSectorName(selectedTicket.sector)}
                                  </Tag>
                                  <Tag color={getSourceColor(selectedTicket.source)} icon={getSourceIcon(selectedTicket.source)}>
                                    {getSourceName(selectedTicket.source)}
                                  </Tag>
                                  <Tag color={
                                    selectedTicket.priority === 'critical' ? '#000' :
                                    selectedTicket.priority === 'high' ? 'red' : 
                                    selectedTicket.priority === 'medium' ? 'orange' : 'green'
                                  }>
                                    {selectedTicket.priority === 'critical' ? 'Critique' :
                                     selectedTicket.priority === 'high' ? 'Haute' : 
                                     selectedTicket.priority === 'medium' ? 'Moyenne' : 'Basse'}
                                  </Tag>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {formatRelativeTime(selectedTicket.created_at)}
                                  </Text>
                                </Space>
                              }
                              description={
                                <div>
                                  <Text strong>Client:</Text> {selectedTicket.user_name || selectedTicket.user_email?.split('@')[0] || 'Anonyme'}
                                  <br />
                                  <Text strong>Message:</Text> {selectedTicket.description}
                                </div>
                              }
                              type="info"
                              showIcon
                              style={{ marginBottom: 24, borderRadius: 12 }}
                            />
                            
                            <div style={{ marginBottom: 24 }}>
                              <Text strong>Question / Problème :</Text>
                              <TextArea
                                rows={3}
                                value={userQuery}
                                onChange={(e) => setUserQuery(e.target.value)}
                                placeholder="Décrivez le problème..."
                                style={{ marginTop: 8, borderRadius: 12 }}
                              />
                            </div>
                            
                            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Space>
                                <Switch 
                                  checked={autoResolve} 
                                  onChange={setAutoResolve}
                                  checkedChildren="Auto"
                                  unCheckedChildren="Manuel"
                                />
                                <Text type="secondary">Résolution automatique</Text>
                              </Space>
                              {(selectedTicket.source === 'discord' || selectedTicket.source === 'discord_assurance') && (
                                <Button 
                                  icon={<MessageOutlined />} 
                                  onClick={() => setReplyModalVisible(true)}
                                >
                                  Répondre sur Discord
                                </Button>
                              )}
                            </div>
                            
                            <Button 
                              type="primary" 
                              icon={loading ? <LoadingOutlined /> : <SendOutlined />}
                              onClick={() => resolveTicket(selectedTicket.id, userQuery)}
                              loading={loading}
                              block
                              size="large"
                              style={{ 
                                height: 48, 
                                borderRadius: 24, 
                                fontWeight: 600,
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                              }}
                            >
                              {loading ? 'Analyse en cours...' : 'Résoudre avec IA'}
                            </Button>
                          </div>

                          <AnimatePresence>
                            {solution && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.3 }}
                              >
                                <div style={{ padding: '24px' }}>
                                  <Divider>
                                    <Space>
                                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                      <Text strong>Solution proposée</Text>
                                      <Badge 
                                        count={`Confiance ${Math.round((solution.confidence || 0.85) * 100)}%`} 
                                        style={{ 
                                          backgroundColor: (solution.confidence || 0.85) > 0.8 ? '#52c41a' : 
                                                          (solution.confidence || 0.85) > 0.6 ? '#faad14' : '#ff4d4f' 
                                        }} 
                                      />
                                    </Space>
                                  </Divider>
                                  
                                  <div style={{ 
                                    background: token.colorBgContainer,
                                    padding: 20,
                                    borderRadius: 16,
                                    border: `1px solid ${token.colorBorder}`,
                                    marginBottom: 16,
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: 1.6
                                  }}>
                                    {typeof solution.solution === 'string' ? (
                                      solution.solution.split('\n').map((line, i) => {
                                        if (line.startsWith('##')) {
                                          return <Title level={2} key={i} style={{ marginTop: 16, marginBottom: 8 }}>{line.replace(/##/g, '').trim()}</Title>;
                                        } else if (line.startsWith('###')) {
                                          return <Title level={3} key={i} style={{ marginTop: 12, marginBottom: 6 }}>{line.replace(/###/g, '').trim()}</Title>;
                                        } else if (line.startsWith('-')) {
                                          return <div key={i} style={{ display: 'flex', marginLeft: 16, marginBottom: 4 }}><span style={{ marginRight: 8 }}>•</span><Text>{line.replace('-', '').trim()}</Text></div>;
                                        } else if (line.match(/^\d+\./)) {
                                          const match = line.match(/^(\d+)\.(.*)/);
                                          return <div key={i} style={{ display: 'flex', marginLeft: 16, marginBottom: 4 }}><span style={{ marginRight: 8 }}>{match[1]}.</span><Text>{match[2].trim()}</Text></div>;
                                        } else if (line.trim() === '') {
                                          return <div key={i} style={{ height: 8 }} />;
                                        } else {
                                          return <Text key={i} style={{ display: 'block', marginBottom: 4 }}>{line}</Text>;
                                        }
                                      })
                                    ) : (
                                      <Text>{JSON.stringify(solution.solution)}</Text>
                                    )}
                                  </div>
                                  
                                  {solution.steps && solution.steps.length > 0 && (
                                    <Card 
                                      title="Étapes à suivre" 
                                      size="small"
                                      style={{ marginBottom: 16, borderRadius: 12 }}
                                    >
                                      {solution.steps.map((step, idx) => (
                                        <div key={idx} style={{ display: 'flex', marginBottom: 12, alignItems: 'flex-start' }}>
                                          <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 12, marginTop: 4 }} />
                                          <Text>{step}</Text>
                                        </div>
                                      ))}
                                    </Card>
                                  )}
                                  
                                  {solution.sources && solution.sources.length > 0 && (
                                    <Collapse 
                                      style={{ marginBottom: 16, borderRadius: 12 }}
                                      items={[{
                                        key: 'sources',
                                        label: <Space><BookOutlined /> Sources et références ({solution.sources.length})</Space>,
                                        children: (
                                          <List
                                            size="small"
                                            dataSource={solution.sources}
                                            renderItem={(source) => (
                                              <List.Item>
                                                <List.Item.Meta
                                                  avatar={<BookOutlined style={{ color: '#1890ff' }} />}
                                                  title={<Text strong>{source.title}</Text>}
                                                  description={source.excerpt}
                                                />
                                              </List.Item>
                                            )}
                                          />
                                        )
                                      }]}
                                    />
                                  )}
                                  
                                  <Divider />
                                  
                                  <Space>
                                    <Popconfirm
                                      title="Confirmer la résolution"
                                      description="Ce ticket sera marqué comme résolu."
                                      onConfirm={() => markTicketResolved(selectedTicket.id)}
                                      okText="Oui"
                                      cancelText="Non"
                                    >
                                      <Button 
                                        icon={<CheckCircleOutlined />} 
                                        type="primary"
                                        size="large"
                                      >
                                        Marquer comme résolu
                                      </Button>
                                    </Popconfirm>
                                    <Button 
                                      icon={<LikeOutlined />} 
                                      onClick={() => markHelpful(solution.id, true)}
                                      size="large"
                                    >
                                      Utile
                                    </Button>
                                    <Button 
                                      icon={<DislikeOutlined />} 
                                      onClick={() => markHelpful(solution.id, false)}
                                      size="large"
                                    >
                                      Pas utile
                                    </Button>
                                  </Space>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {conversation.length > 0 && (
                            <div style={{ padding: '0 24px 24px 24px' }}>
                              <Divider>Conversation</Divider>
                              <List
                                dataSource={conversation}
                                renderItem={(msg) => (
                                  <div style={{ 
                                    display: 'flex',
                                    justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                    marginBottom: 16
                                  }}>
                                    {msg.role === 'assistant' && (
                                      <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#1890ff', marginRight: 12 }} />
                                    )}
                                    <div style={{ 
                                      maxWidth: '70%',
                                      background: msg.role === 'user' ? token.colorPrimary : token.colorBgContainer,
                                      color: msg.role === 'user' ? '#fff' : token.colorText,
                                      padding: '12px 16px',
                                      borderRadius: msg.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                                      border: msg.role === 'assistant' ? `1px solid ${token.colorBorder}` : 'none'
                                    }}>
                                      <div>{msg.content}</div>
                                      <div style={{ fontSize: 10, marginTop: 8, opacity: 0.6 }}>
                                        {formatTime(msg.timestamp)}
                                        {msg.confidence && (
                                          <span> • Confiance: {Math.round(msg.confidence * 100)}%</span>
                                        )}
                                      </div>
                                    </div>
                                    {msg.role === 'user' && (
                                      <Avatar icon={<UserOutlined />} style={{ backgroundColor: token.colorPrimary, marginLeft: 12 }} />
                                    )}
                                  </div>
                                )}
                              />
                              <div ref={messagesEndRef} />
                            </div>
                          )}
                        </motion.div>
                      )}
                    </Card>
                  </Col>
                  
                  <Col xs={24} lg={8}>
                    {/* Filtres par secteur */}
                    <Card 
                      title={
                        <Space>
                          <SolutionOutlined />
                          <span>Secteurs</span>
                        </Space>
                      }
                      variant="borderless"
                      style={{ borderRadius: 24, marginBottom: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      bodyStyle={{ padding: '12px 16px' }}
                    >
                      <Row gutter={8}>
                        {sectorItems.map(sector => (
                          <Col span={8} key={sector.key}>
                            <div 
                              onClick={() => setFilterSector(filterSector === sector.key ? 'all' : sector.key)}
                              style={{ 
                                textAlign: 'center',
                                padding: '12px 8px',
                                borderRadius: 16,
                                cursor: 'pointer',
                                background: filterSector === sector.key ? sector.color : token.colorBgContainer,
                                color: filterSector === sector.key ? 'white' : token.colorText,
                                transition: 'all 0.2s',
                                border: `1px solid ${filterSector === sector.key ? sector.color : token.colorBorder}`
                              }}
                            >
                              <div style={{ fontSize: 24, color: filterSector === sector.key ? 'white' : sector.color }}>
                                {sector.icon}
                              </div>
                              <div style={{ fontWeight: 500, marginTop: 4 }}>{sector.label}</div>
                              <Badge 
                                count={sector.count} 
                                style={{ 
                                  backgroundColor: filterSector === sector.key ? 'rgba(255,255,255,0.3)' : sector.color,
                                  marginTop: 4
                                }} 
                              />
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </Card>

                    <Card 
                      title={
                        <Space>
                          <FileTextOutlined />
                          <span>Tickets ouverts</span>
                          <Badge count={filteredTickets.length} style={{ backgroundColor: '#ff4d4f' }} />
                        </Space>
                      }
                      variant="borderless"
                      style={{ borderRadius: 24, marginBottom: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      extra={
                        <Space>
                          <Tooltip title="Nouveau ticket">
                            <Button 
                              icon={<PlusOutlined />} 
                              size="small" 
                              type="primary"
                              onClick={() => setCreateModalVisible(true)}
                            />
                          </Tooltip>
                          <Tooltip title="Filtrer par source">
                            <Dropdown
                              menu={{
                                items: [
                                  { key: 'all', label: 'Toutes sources', icon: <GlobalOutlined /> },
                                  { key: 'web', label: 'Web', icon: <GlobalOutlined /> },
                                  { key: 'discord', label: 'Discord', icon: <DiscordOutlined /> },
                                  { key: 'discord_assurance', label: 'Discord Assurance', icon: <DiscordOutlined /> },
                                  { key: 'email', label: 'Email', icon: <MailOutlined /> },
                                  { key: 'api', label: 'API', icon: <ApiOutlined /> }
                                ],
                                onClick: ({ key }) => setFilterSource(key)
                              }}
                            >
                              <Button icon={<FilterOutlined />} size="small">
                                {filterSource === 'all' ? 'Source' : getSourceName(filterSource)}
                              </Button>
                            </Dropdown>
                          </Tooltip>
                          <Tooltip title="Filtrer par priorité">
                            <Button 
                              icon={<FilterOutlined />} 
                              size="small" 
                              onClick={() => setFilterPriority(filterPriority === 'all' ? 'high' : 'all')}
                              type={filterPriority !== 'all' ? 'primary' : 'text'}
                            />
                          </Tooltip>
                          <Tooltip title="Trier">
                            <Button 
                              icon={<SortAscendingOutlined />} 
                              size="small" 
                              onClick={() => setSortBy(sortBy === 'date' ? 'priority' : 'date')}
                            />
                          </Tooltip>
                          <Segmented
                            value={viewMode}
                            onChange={setViewMode}
                            size="small"
                            options={[
                              { value: 'list', icon: <FileTextOutlined /> },
                              { value: 'grid', icon: <AppstoreOutlined /> }
                            ]}
                          />
                        </Space>
                      }
                      bodyStyle={{ padding: 0 }}
                    >
                      {filteredTickets.length === 0 ? (
                        <Empty description="Aucun ticket ouvert" style={{ padding: 24 }} />
                      ) : viewMode === 'list' ? (
                        <List
                          dataSource={filteredTickets}
                          renderItem={(ticket) => (
                            <List.Item
                              style={{ 
                                padding: '12px 16px', 
                                cursor: 'pointer', 
                                transition: 'all 0.2s',
                                background: selectedTicket?.id === ticket.id ? getSectorBgLight(ticket.sector) : 'transparent',
                                borderLeft: selectedTicket?.id === ticket.id ? `3px solid ${getSectorColor(ticket.sector)}` : 'none'
                              }}
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setUserQuery(ticket.description);
                                setConversation([]);
                                setSolution(null);
                              }}
                            >
                              <List.Item.Meta
                                avatar={
                                  <Avatar 
                                    icon={getSourceIcon(ticket.source)} 
                                    style={{ backgroundColor: getSourceColor(ticket.source) }} 
                                  />
                                }
                                title={
                                  <Space>
                                    <Text strong>{ticket.subject}</Text>
                                    {ticket.priority === 'high' && <Tag color="red">Urgent</Tag>}
                                    {ticket.priority === 'critical' && <Tag color="#000">Critique</Tag>}
                                  </Space>
                                }
                                description={
                                  <div>
                                    <Space>
                                      <Tag color={getSectorColor(ticket.sector)} icon={getSectorIcon(ticket.sector)}>
                                        {getSectorName(ticket.sector)}
                                      </Tag>
                                      <Text type="secondary" style={{ fontSize: 12 }}>
                                        #{ticket.id} • {ticket.created_at ? dayjs(ticket.created_at).format('DD/MM/YYYY HH:mm') : '-'}
                                      </Text>
                                    </Space>
                                  </div>
                                }
                              />
                            </List.Item>
                          )}
                        />
                      ) : (
                        <Row gutter={[16, 16]} style={{ padding: 16 }}>
                          {filteredTickets.map((ticket) => (
                            <Col span={24} key={ticket.id}>
                              <Card 
                                size="small" 
                                hoverable 
                                style={{ 
                                  borderRadius: 12,
                                  border: selectedTicket?.id === ticket.id ? `2px solid ${getSectorColor(ticket.sector)}` : '1px solid #f0f0f0',
                                  cursor: 'pointer',
                                  background: selectedTicket?.id === ticket.id ? getSectorBgLight(ticket.sector) : token.colorBgContainer
                                }}
                                onClick={() => {
                                  setSelectedTicket(ticket);
                                  setUserQuery(ticket.description);
                                  setConversation([]);
                                  setSolution(null);
                                }}
                              >
                                <Space direction="vertical" style={{ width: '100%' }}>
                                  <Space>
                                    <Tag color={getSourceColor(ticket.source)} icon={getSourceIcon(ticket.source)}>
                                      {getSourceName(ticket.source)}
                                    </Tag>
                                    <Tag color={getSectorColor(ticket.sector)} icon={getSectorIcon(ticket.sector)}>
                                      {getSectorName(ticket.sector)}
                                    </Tag>
                                    {ticket.priority === 'critical' && <Tag color="#000">Critique</Tag>}
                                    {ticket.priority === 'high' && <Tag color="red">Urgent</Tag>}
                                  </Space>
                                  <Text strong>{ticket.subject}</Text>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    #{ticket.id} • {ticket.created_at ? dayjs(ticket.created_at).format('DD/MM/YYYY HH:mm') : '-'}
                                  </Text>
                                </Space>
                              </Card>
                            </Col>
                          ))}
                        </Row>
                      )}
                    </Card>

                    <Card 
                      title={
                        <Space>
                          <GlobalOutlined />
                          <span>Sources des tickets</span>
                        </Space>
                      }
                      variant="borderless"
                      style={{ borderRadius: 24, marginBottom: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                    >
                      <List
                        size="small"
                        dataSource={ticketSources}
                        renderItem={(source) => (
                          <List.Item>
                            <List.Item.Meta
                              avatar={<Avatar icon={source.icon} style={{ backgroundColor: source.color }} />}
                              title={<Space>{source.name} <Tag color={source.color}>{source.count}</Tag></Space>}
                              description={`${source.count} tickets`}
                            />
                          </List.Item>
                        )}
                      />
                    </Card>

                    {ticketStats && (
                      <Card 
                        title={
                          <Space>
                            <TrophyOutlined />
                            <span>Statistiques IA</span>
                          </Space>
                        }
                        variant="borderless"
                        style={{ borderRadius: 24, marginBottom: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      >
                        <Row gutter={16}>
                          <Col span={12}>
                            <Statistic 
                              title="Taux de résolution" 
                              value={ticketStats.resolution_rate || 94} 
                              suffix="%" 
                              prefix={<CheckCircleOutlined />}
                              valueStyle={{ color: '#52c41a' }}
                            />
                          </Col>
                          <Col span={12}>
                            <Statistic 
                              title="Temps moyen" 
                              value={ticketStats.avg_resolution_time || 45} 
                              suffix="sec" 
                              prefix={<ClockCircleOutlined />}
                            />
                          </Col>
                        </Row>
                        <Divider />
                        <Row gutter={16}>
                          <Col span={12}>
                            <Statistic 
                              title="Tickets résolus IA" 
                              value={ticketStats.resolved_by_ai || 0} 
                              prefix={<RobotOutlined />}
                            />
                          </Col>
                          <Col span={12}>
                            <Statistic 
                              title="Satisfaction" 
                              value={ticketStats.satisfaction_rate || 92} 
                              suffix="%" 
                              prefix={<LikeOutlined />}
                              valueStyle={{ color: '#faad14' }}
                            />
                          </Col>
                        </Row>
                        <Progress 
                          percent={ticketStats.satisfaction_rate || 92} 
                          strokeColor="#52c41a" 
                          style={{ marginTop: 16 }} 
                        />
                      </Card>
                    )}

                    <Card 
                      title={
                        <Space>
                          <DatabaseOutlined />
                          <span>Base de connaissances</span>
                          <Badge count={knowledgeBase.length} style={{ backgroundColor: '#52c41a' }} />
                        </Space>
                      }
                      variant="borderless"
                      style={{ borderRadius: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      extra={
                        <Tooltip title="La RAG analyse tous les documents disponibles">
                          <Tag color="blue" icon={<ThunderboltOutlined />}>RAG Actif</Tag>
                        </Tooltip>
                      }
                    >
                      <Input.Search
                        placeholder="Rechercher dans la base..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ marginBottom: 16, borderRadius: 12 }}
                      />
                      <List
                        size="small"
                        dataSource={filteredKnowledgeBase.slice(0, 5)}
                        renderItem={(item) => (
                          <List.Item>
                            <List.Item.Meta
                              avatar={<BookOutlined style={{ color: '#1890ff' }} />}
                              title={<Text strong>{item.title}</Text>}
                              description={item.excerpt?.substring(0, 80) + (item.excerpt?.length > 80 ? '...' : '')}
                            />
                          </List.Item>
                        )}
                      />
                      {knowledgeBase.length > 0 && (
                        <div style={{ marginTop: 8, textAlign: 'center' }}>
                          <Text type="secondary">{knowledgeBase.length} documents disponibles</Text>
                        </div>
                      )}
                    </Card>
                  </Col>
                </Row>
              )
            },
            {
              key: 'history',
              label: <span><HistoryOutlined /> Historique</span>,
              children: (
                <Card variant="borderless" style={{ borderRadius: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                    <Space>
                      <Input.Search placeholder="Rechercher un ticket..." style={{ width: 250 }} />
                      <Select 
                        defaultValue="all" 
                        style={{ width: 120 }}
                        onChange={setFilterSector}
                      >
                        <Option value="all">Tous secteurs</Option>
                        <Option value="banque"><BankOutlined /> Banque</Option>
                        <Option value="assurance"><InsuranceOutlined /> Assurance</Option>
                        <Option value="entreprise"><ShopOutlined /> Entreprise</Option>
                      </Select>
                    </Space>
                    <Button icon={<DownloadOutlined />}>Exporter</Button>
                  </div>
                  <Table 
                    columns={columns} 
                    dataSource={resolvedTickets}
                    rowKey="id"
                    pagination={{ 
                      pageSize: 10, 
                      showSizeChanger: true, 
                      showTotal: (total) => `${total} tickets`,
                      showQuickJumper: true
                    }}
                  />
                </Card>
              )
            },
            {
              key: 'analytics',
              label: <span><LineChartOutlined /> Analytics</span>,
              children: (
                <div>
                  <Row gutter={[24, 24]}>
                    <Col xs={24} lg={24}>
                      <Card title="Performance de l'IA" variant="borderless" style={{ borderRadius: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                        <Row gutter={24}>
                          <Col span={6}>
                            <Statistic title="Précision" value={94} suffix="%" prefix={<CheckCircleOutlined />} />
                            <Progress percent={94} strokeColor="#1890ff" showInfo={false} style={{ marginTop: 8 }} />
                          </Col>
                          <Col span={6}>
                            <Statistic title="Taux auto-résolution" value={78} suffix="%" prefix={<RobotOutlined />} />
                            <Progress percent={78} strokeColor="#52c41a" showInfo={false} style={{ marginTop: 8 }} />
                          </Col>
                          <Col span={6}>
                            <Statistic title="Temps économisé" value={120} suffix="heures" prefix={<ClockCircleOutlined />} />
                          </Col>
                          <Col span={6}>
                            <Statistic title="Satisfaction" value={92} suffix="%" prefix={<StarOutlined />} />
                            <Progress percent={92} strokeColor="#faad14" showInfo={false} style={{ marginTop: 8 }} />
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                  </Row>
                </div>
              )
            }
          ]}
        />
      </motion.div>

      {/* Modal de création de ticket */}
      <Modal
        title={
          <Space>
            <PlusOutlined />
            <span>Nouveau ticket de support</span>
          </Space>
        }
        open={createModalVisible}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={createForm} layout="vertical" onFinish={createTicket}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="user_name" 
                label="Votre nom" 
                rules={[{ required: true, message: 'Veuillez saisir votre nom' }]}
              >
                <Input placeholder="Jean Dupont" size="large" prefix={<UserOutlined />} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="user_email" 
                label="Email" 
                rules={[
                  { required: true, message: 'Veuillez saisir votre email' },
                  { type: 'email', message: 'Email invalide' }
                ]}
              >
                <Input placeholder="jean@example.com" size="large" prefix={<MailOutlined />} />
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item 
            name="subject" 
            label="Sujet" 
            rules={[{ required: true, message: 'Veuillez saisir un sujet' }]}
          >
            <Input placeholder="Problème de connexion..." size="large" />
          </Form.Item>
          
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="sector" 
                label="Secteur" 
                initialValue="entreprise"
                rules={[{ required: true, message: 'Veuillez sélectionner un secteur' }]}
              >
                <Select size="large">
                  <Option value="banque"><BankOutlined /> Banque - Services bancaires</Option>
                  <Option value="assurance"><InsuranceOutlined /> Assurance - Contrats et sinistres</Option>
                  <Option value="entreprise"><ShopOutlined /> Entreprise - ERP et facturation</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="priority" 
                label="Priorité" 
                initialValue="medium"
              >
                <Select size="large">
                  <Option value="low">🟢 Basse</Option>
                  <Option value="medium">🟡 Moyenne</Option>
                  <Option value="high">🔴 Haute</Option>
                  <Option value="critical">⚫ Critique</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          
          <Form.Item 
            name="category" 
            label="Catégorie" 
            initialValue="general"
          >
            <Select size="large">
              <Option value="technical">🔧 Problème technique</Option>
              <Option value="billing">💰 Facturation</Option>
              <Option value="account">👤 Compte utilisateur</Option>
              <Option value="general">❓ Question générale</Option>
            </Select>
          </Form.Item>
          
          <Form.Item 
            name="description" 
            label="Description" 
            rules={[{ required: true, message: 'Veuillez décrire votre problème' }]}
          >
            <TextArea 
              rows={5} 
              placeholder="Décrivez votre problème en détail. L'IA adaptera sa réponse en fonction du secteur sélectionné."
            />
          </Form.Item>
          
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setCreateModalVisible(false);
                createForm.resetFields();
              }}>
                Annuler
              </Button>
              <Button type="primary" htmlType="submit" loading={loading} icon={<SendOutlined />}>
                Créer le ticket
              </Button>
            </Space>
          </Form.Item>
        </Form>
        
        <Divider />
        
        <div style={{ textAlign: 'center', color: '#999', fontSize: 12 }}>
          <Space split={<Divider type="vertical" />}>
            <span><BankOutlined /> Banque</span>
            <span><InsuranceOutlined /> Assurance</span>
            <span><ShopOutlined /> Entreprise</span>
            <span><DiscordOutlined /> Discord</span>
            <span><CheckCircleOutlined /> IA adaptative</span>
          </Space>
        </div>
      </Modal>

      {/* Modal de réponse Discord */}
      <Modal
        title={
          <Space>
            <DiscordOutlined style={{ color: '#5865F2' }} />
            <span>Répondre au ticket Discord</span>
          </Space>
        }
        open={replyModalVisible}
        onCancel={() => {
          setReplyModalVisible(false);
          replyForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Alert
          message="Ticket Discord"
          description={
            <div>
              <Text strong>Client:</Text> {selectedTicket?.user_name || selectedTicket?.user_email?.split('@')[0] || 'Anonyme'}
              <br />
              <Text strong>Sujet:</Text> {selectedTicket?.subject}
              <br />
              <Text strong>Secteur:</Text> {getSectorName(selectedTicket?.sector)}
              <br />
              <Text strong>Message:</Text> {selectedTicket?.description}
            </div>
          }
          type="info"
          style={{ marginBottom: 16 }}
        />
        
        <Form form={replyForm} layout="vertical" onFinish={replyToDiscordTicket}>
          <Form.Item 
            name="response" 
            label="Votre réponse" 
            rules={[{ required: true, message: 'Veuillez saisir votre réponse' }]}
          >
            <TextArea 
              rows={6} 
              placeholder="Saisissez votre réponse qui sera envoyée au client sur Discord..."
            />
          </Form.Item>
          
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => {
                setReplyModalVisible(false);
                replyForm.resetFields();
              }}>
                Annuler
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading} 
                icon={<SendOutlined />}
                style={{ backgroundColor: '#5865F2' }}
              >
                Envoyer sur Discord
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AutoResolveTicket;