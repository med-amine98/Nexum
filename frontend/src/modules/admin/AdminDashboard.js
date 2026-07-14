// src/modules/admin/AdminDashboard.js - Version complète avec endpoints existants
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Card, Row, Col, Button, Space, Tag, Badge, Tooltip,
  Modal, message, Dropdown, Menu, Spin, Typography,
  Drawer, Switch, Tabs, Avatar, Progress, Timeline,
  Select, Form, DatePicker, Radio, Statistic, Empty, Table,
  Input, Descriptions, Divider, Alert, ConfigProvider, theme,
  Popconfirm, Popover, List, Skeleton
} from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  WalletOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  BellOutlined,
  SettingOutlined,
  LogoutOutlined,
  ReloadOutlined,
  FullscreenOutlined,
  FullscreenExitOutlined,
  SunOutlined,
  MoonOutlined,
  MenuOutlined,
  RobotOutlined,
  CreditCardOutlined,
  GiftOutlined,
  BankOutlined,
  WarningOutlined,
  UserOutlined,
  DollarOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  MessageOutlined,
  CloseOutlined,
  InsuranceOutlined,
  ApartmentOutlined,
  EyeOutlined,
  SearchOutlined,
  ThunderboltOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  FilterOutlined,
  ExportOutlined,
  ImportOutlined,
  MailOutlined,
  PhoneOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Pie, Column } from '@ant-design/plots';
import api from '../../services/api';
import { useAssistant } from '../../context/AssistantContext';
import './AdminDashboard.css';

const { Title, Text } = Typography;
const { Option } = Select;

// Composant Assistant Bulle
const AssistantBubble = ({ onClose, statsData, refreshData }) => {
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([{
        type: 'bot',
        content: `👋 Bonjour Administrateur ! Je suis votre assistant IA.

📊 **Résumé du jour :**
• ${statsData?.totalUsers || 0} utilisateurs
• ${statsData?.totalCompanies || 0} entreprises  
• ${statsData?.pendingSubscriptions || 0} demandes en attente
• ${statsData?.activeModels || 0} modèles IA actifs

💡 **Que puis-je faire pour vous ?`,
        time: new Date().toLocaleTimeString(),
        quickReplies: ['📊 Voir les stats', '👥 Utilisateurs', '💰 Abonnements', '📦 Modules']
      }]);
    }
  }, []);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const generateBotResponse = (query, stats) => {
    const q = query.toLowerCase();
    
    if (q.includes('statistique') || q.includes('kpi') || q.includes('stat') || q.includes('indicateur')) {
      return `📊 **Statistiques détaillées :**

• **Utilisateurs** : ${stats?.totalUsers || 0}
• **Actifs** : ${stats?.activeUsers || 0}
• **Entreprises** : ${stats?.totalCompanies || 0}
• **Chiffre d'affaires** : ${(stats?.totalRevenue || 0).toLocaleString()} €
• **Modèles IA actifs** : ${stats?.activeModels || 0}
• **Demandes en attente** : ${stats?.pendingSubscriptions || 0}`;
    }
    
    if (q.includes('secteur') || q.includes('secteurs') || q.includes('répartition')) {
      return `📈 **Répartition par secteur :**

🏦 **Banque** : ${stats?.bankCount || 0} clients
🛡️ **Assurance** : ${stats?.insuranceCount || 0} clients
🏢 **Entreprise** : ${stats?.enterpriseCount || 0} clients
💻 **Tech** : ${stats?.techCount || 0} clients
🛒 **Commerce** : ${stats?.commerceCount || 0} clients`;
    }
    
    if (q.includes('abonnement') || q.includes('demande') || q.includes('approbation')) {
      return `💰 **Abonnements en attente** : ${stats?.pendingSubscriptions || 0}

${stats?.pendingSubscriptions > 0 ? 
  '📝 **Actions recommandées :**\n• Consultez l\'onglet "Abonnements"\n• Vérifiez les demandes\n• Approuvez ou rejetez' : 
  '✅ Aucune demande en attente. Tout est à jour !'}`;
    }
    
    if (q.includes('utilisateur') || q.includes('client') || q.includes('membre')) {
      return `👥 **Gestion des utilisateurs :**

• **Total** : ${stats?.totalUsers || 0} utilisateurs
• **Actifs** : ${stats?.activeUsers || 0}
• **En attente** : ${stats?.pendingUsers || 0}

🛠️ **Actions disponibles :**
• Ajouter un utilisateur
• Modifier les rôles
• Suspendre/Activer
• Consulter les profils`;
    }
    
    return `🤖 **Assistant Administrateur**

Voici ce que je peux faire :
📊 **Statistiques** - Vue d'ensemble des KPIs
👥 **Utilisateurs** - Gérer les comptes
🏢 **Secteurs** - Répartition des clients
💰 **Abonnements** - Gérer les demandes
📦 **Modules** - Catalogue des modules

Posez-moi une question ou utilisez les suggestions !`;
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    const userMessage = { type: 'user', content: inputValue, time: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    
    setTimeout(() => {
      const botResponse = generateBotResponse(inputValue, statsData);
      setMessages(prev => [...prev, { 
        type: 'bot', 
        content: botResponse, 
        time: new Date().toLocaleTimeString(),
        quickReplies: ['📊 Statistiques', '🏢 Secteurs', '👥 Utilisateurs', '💰 Abonnements', '📦 Modules']
      }]);
      setIsTyping(false);
    }, 800);
    
    setInputValue('');
  };

  const handleQuickReply = (reply) => {
    setInputValue(reply);
    setTimeout(() => handleSendMessage(), 100);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.8, y: 50 }} 
      animate={{ opacity: 1, scale: 1, y: 0 }} 
      exit={{ opacity: 0, scale: 0.8, y: 50 }} 
      className="assistant-bubble"
      style={{ 
        position: 'fixed', bottom: 90, right: 24, 
        width: 420, height: 580, 
        background: 'white', borderRadius: 24, 
        boxShadow: '0 20px 60px rgba(0,0,0,0.15)', 
        display: 'flex', flexDirection: 'column', 
        overflow: 'hidden', zIndex: 1001,
        border: '1px solid rgba(0,0,0,0.06)'
      }}
    >
      <div style={{ 
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', 
        padding: '16px 20px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        color: 'white' 
      }}>
        <Space>
          <div style={{ 
            width: 40, height: 40, 
            borderRadius: '50%', 
            background: 'rgba(255,255,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)'
          }}>
            <RobotOutlined style={{ fontSize: 20 }} />
          </div>
          <div>
            <Text strong style={{ color: 'white', fontSize: 16, letterSpacing: '0.5px' }}>Assistant IA</Text>
            <br />
            <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>
              <Badge status="success" /> En ligne • Réponse instantanée
            </Text>
          </div>
        </Space>
        <Button type="text" icon={<CloseOutlined />} onClick={onClose} style={{ color: 'rgba(255,255,255,0.7)' }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#f7f9fc' }}>
        {messages.map((msg, idx) => (
          <div key={idx}>
            <div style={{ display: 'flex', justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start', marginBottom: 12 }}>
              {msg.type === 'bot' && (
                <div style={{ 
                  width: 32, height: 32, 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #667eea, #764ba2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 8,
                  flexShrink: 0
                }}>
                  <RobotOutlined style={{ fontSize: 14, color: 'white' }} />
                </div>
              )}
              <div style={{ 
                maxWidth: '75%', 
                padding: '10px 16px', 
                borderRadius: msg.type === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                background: msg.type === 'user' ? 'linear-gradient(135deg, #667eea, #764ba2)' : 'white', 
                color: msg.type === 'user' ? 'white' : '#2d3748',
                boxShadow: msg.type === 'user' 
                  ? '0 4px 12px rgba(102,126,234,0.3)' 
                  : '0 2px 8px rgba(0,0,0,0.06)',
                whiteSpace: 'pre-wrap',
                border: msg.type === 'bot' ? '1px solid rgba(0,0,0,0.04)' : 'none'
              }}>
                <Text style={{ color: msg.type === 'user' ? 'white' : '#2d3748', fontSize: 14, lineHeight: '1.6' }}>
                  {msg.content}
                </Text>
                <div style={{ fontSize: 10, marginTop: 6, opacity: 0.6, color: msg.type === 'user' ? 'rgba(255,255,255,0.7)' : '#a0aec0' }}>
                  {msg.time}
                </div>
              </div>
              {msg.type === 'user' && (
                <div style={{ 
                  width: 32, height: 32, 
                  borderRadius: '50%', 
                  background: 'linear-gradient(135deg, #48bb78, #38a169)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8,
                  flexShrink: 0
                }}>
                  <UserOutlined style={{ fontSize: 14, color: 'white' }} />
                </div>
              )}
            </div>
            
            {msg.quickReplies && msg.quickReplies.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16, marginLeft: 40 }}>
                {msg.quickReplies.map((reply, ridx) => (
                  <Button 
                    key={ridx} 
                    size="small" 
                    onClick={() => handleQuickReply(reply)} 
                    style={{ 
                      borderRadius: 20, 
                      fontSize: 12,
                      borderColor: '#667eea',
                      color: '#667eea',
                      background: 'white',
                      boxShadow: '0 2px 4px rgba(102,126,234,0.1)'
                    }}
                  >
                    {reply}
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
        
        {isTyping && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <div style={{ 
              width: 32, height: 32, 
              borderRadius: '50%', 
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <RobotOutlined style={{ fontSize: 14, color: 'white' }} />
            </div>
            <div style={{ background: 'white', padding: '12px 18px', borderRadius: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="typing-indicator"><span></span><span></span><span></span></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '10px 16px', borderTop: '1px solid #edf2f7', background: 'white' }}>
        <Text type="secondary" style={{ fontSize: 11, color: '#a0aec0' }}>Suggestions :</Text>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
          {['📊 Statistiques', '🏢 Secteurs', '👥 Utilisateurs', '💰 Abonnements', '📦 Modules'].map((sugg, idx) => (
            <Button 
              key={idx} 
              size="small" 
              onClick={() => handleQuickReply(sugg)} 
              style={{ 
                borderRadius: 20, 
                fontSize: 12,
                border: '1px solid #e2e8f0',
                color: '#4a5568',
                background: '#f7f9fc'
              }}
            >
              {sugg}
            </Button>
          ))}
        </div>
      </div>

      <div style={{ padding: 12, borderTop: '1px solid #edf2f7', background: 'white', display: 'flex', gap: 8 }}>
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onPressEnter={handleSendMessage}
          placeholder="Posez votre question..."
          style={{ 
            borderRadius: 24,
            borderColor: '#e2e8f0',
            background: '#f7f9fc'
          }}
          prefix={<RobotOutlined style={{ color: '#a0aec0' }} />}
        />
        <Button 
          type="primary" 
          icon={<MessageOutlined />} 
          onClick={handleSendMessage}
          style={{ 
            borderRadius: 24, 
            background: 'linear-gradient(135deg, #667eea, #764ba2)',
            border: 'none',
            boxShadow: '0 4px 12px rgba(102,126,234,0.3)'
          }}
        />
      </div>
    </motion.div>
  );
};

// Bouton flottant assistant
const FloatingAssistantButton = ({ onClick, pendingCount }) => (
  <motion.div 
    initial={{ scale: 0 }} 
    animate={{ scale: 1 }} 
    whileHover={{ scale: 1.05 }} 
    whileTap={{ scale: 0.95 }}
    style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000, cursor: 'pointer' }} 
    onClick={onClick}
  >
    <div style={{ 
      width: 64, height: 64, 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
      borderRadius: '50%', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      boxShadow: '0 8px 32px rgba(102,126,234,0.4)',
      transition: 'all 0.3s ease'
    }}>
      <RobotOutlined style={{ fontSize: 30, color: 'white' }} />
    </div>
    {pendingCount > 0 && (
      <div style={{ 
        position: 'absolute', top: -6, right: -6, 
        width: 26, height: 26, 
        background: '#f56565', borderRadius: '50%', 
        border: '3px solid white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        boxShadow: '0 2px 8px rgba(245,101,101,0.4)'
      }}>
        {pendingCount > 9 ? '9+' : pendingCount}
      </div>
    )}
  </motion.div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { assistantEnabled, toggleAssistant } = useAssistant();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [assistantVisible, setAssistantVisible] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [notificationsDrawer, setNotificationsDrawer] = useState(false);
  const [settingsDrawer, setSettingsDrawer] = useState(false);
  const [subscriptionModalVisible, setSubscriptionModalVisible] = useState(false);
  const [selectedSubscription, setSelectedSubscription] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // États pour les données
  const [statsData, setStatsData] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    totalCompanies: 0,
    bankCount: 0,
    insuranceCount: 0,
    enterpriseCount: 0,
    techCount: 0,
    commerceCount: 0,
    otherCount: 0,
    totalRevenue: 0,
    activeModels: 0,
    pendingSubscriptions: 0
  });

  const [clients, setClients] = useState([]);
  const [models, setModels] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [offers, setOffers] = useState([]);
  const [modules, setModules] = useState([]);
  const [companies, setCompanies] = useState([]);

  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientForm] = Form.useForm();
  const [searchText, setSearchText] = useState('');
  const [filterSector, setFilterSector] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  const handleEditClient = (client) => {
    setEditingClient(client);
    clientForm.setFieldsValue({
      name: client.name,
      email: client.email,
      phone: client.phone,
      sector: client.sector,
      status: client.status,
    });
    setClientModalVisible(true);
  };

  const handleUpdateClient = async (values) => {
    try {
      await api.put(`/admin/users/${editingClient.id}`, values);
      message.success('Client mis à jour avec succès');
      setClientModalVisible(false);
      fetchDashboardData();
    } catch (error) {
      console.error(error);
      message.error('Erreur lors de la mise à jour du client');
    }
  };

  const handleDeleteClient = (id) => {
    Modal.confirm({
      title: 'Supprimer le client',
      content: 'Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.',
      okText: 'Oui, supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await api.delete(`/admin/users/${id}`);
          message.success('Client supprimé avec succès');
          fetchDashboardData();
        } catch (error) {
          console.error(error);
          message.error('Erreur lors de la suppression du client');
        }
      }
    });
  };

  // Récupération des données depuis l'API
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // 1. Statistiques admin - GET /api/v1/admin/stats
      const statsRes = await api.get('/admin/stats');
      const stats = statsRes.data || {};
      
      // 2. Utilisateurs - GET /api/v1/admin/users
      const clientsRes = await api.get('/admin/users');
      const clientsData = clientsRes.data?.users || clientsRes.data || [];
      
      // 3. Modèles IA - GET /api/v1/admin/models
      const modelsRes = await api.get('/admin/models');
      const modelsData = modelsRes.data || [];
      
      // 4. Offres - GET /api/v1/admin/offers
      const offersRes = await api.get('/admin/offers');
      const offersData = offersRes.data || [];
      
      // 5. Abonnements en attente - GET /api/v1/saas/subscriptions?status=pending
      const subsRes = await api.get('/saas/subscriptions?status=pending');
      const subsData = subsRes.data?.subscriptions || subsRes.data || [];
      
      // 6. Entreprises - GET /api/v1/admin/companies
      const companiesRes = await api.get('/admin/companies');
      const companiesData = companiesRes.data?.companies || companiesRes.data || [];
      
      // 7. Modules - GET /api/v1/modules/
      const modulesRes = await api.get('/modules/');
      const modulesData = modulesRes.data?.data || modulesRes.data || [];

      // Mettre à jour les états
      setStatsData({
        totalUsers: stats.total_users || clientsData.length,
        activeUsers: stats.active_users || clientsData.filter(c => c.status === 'active').length,
        pendingUsers: stats.pending_users || clientsData.filter(c => c.status === 'pending').length,
        totalCompanies: stats.total_companies || companiesData.length,
        bankCount: stats.bank_count || 0,
        insuranceCount: stats.insurance_count || 0,
        enterpriseCount: stats.enterprise_count || 0,
        techCount: stats.tech_count || 0,
        commerceCount: stats.commerce_count || 0,
        otherCount: stats.other_count || 0,
        totalRevenue: stats.total_revenue || 0,
        activeModels: modelsData.filter(m => m.status === 'active').length || 0,
        pendingSubscriptions: subsData.length || 0
      });

      setClients(clientsData);
      setModels(modelsData);
      setSubscriptions(subsData);
      setOffers(offersData);
      setCompanies(companiesData);
      setModules(modulesData);

    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      message.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Activer l'assistant quand la bulle est ouverte
  useEffect(() => {
    if (assistantVisible && !assistantEnabled) {
      toggleAssistant();
    }
  }, [assistantVisible, assistantEnabled, toggleAssistant]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  }, []);

  const handleRefresh = async () => {
    await fetchDashboardData();
    setLastUpdate(new Date());
    message.success('Données actualisées');
  };

  const handleLogout = useCallback(() => {
    Modal.confirm({
      title: 'Déconnexion',
      content: 'Êtes-vous sûr de vouloir vous déconnecter ?',
      onOk: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userRole');
        navigate('/login');
      },
    });
  }, [navigate]);

  const handleApproveSubscription = (subscription) => {
    setSelectedSubscription(subscription);
    setSubscriptionModalVisible(true);
  };

  const confirmApprove = async () => {
    try {
      await api.put(`/saas/subscriptions/${selectedSubscription.id}/approve`);
      message.success('Abonnement approuvé');
      await fetchDashboardData();
      setSubscriptionModalVisible(false);
      setSelectedSubscription(null);
    } catch (error) {
      message.error('Erreur lors de l\'approbation');
    }
  };

  const handleRejectSubscription = async (id) => {
    Modal.confirm({
      title: 'Rejeter la demande',
      content: 'Êtes-vous sûr de vouloir rejeter cette demande ?',
      onOk: async () => {
        try {
          await api.put(`/saas/subscriptions/${id}/reject`);
          message.success('Demande rejetée');
          await fetchDashboardData();
        } catch (error) {
          message.error('Erreur lors du rejet');
        }
      }
    });
  };

  // Colonnes des tableaux
  const clientColumns = [
    { 
      title: <span style={{ color: '#000000', fontWeight: 600 }}>Entreprise</span>, 
      dataIndex: 'name', 
      key: 'name', 
      render: (text, record) => (
        <Space>
          <Avatar 
            icon={record.sector?.toUpperCase() === 'BANK' ? <BankOutlined /> : 
              record.sector?.toUpperCase() === 'INSURANCE' ? <InsuranceOutlined /> : 
              <ApartmentOutlined />} 
            style={{ 
              backgroundColor: record.sector?.toUpperCase() === 'BANK' ? '#1890ff' : 
                record.sector?.toUpperCase() === 'INSURANCE' ? '#52c41a' : 
                '#fa8c16' 
            }} 
          />
          <div>
            <Text strong style={{ color: '#000000' }}>{text}</Text>
            <br />
            <Text style={{ color: '#000000', fontSize: 12 }}>{record.email}</Text>
          </div>
        </Space>
      )
    },
    { 
      title: <span style={{ color: '#000000', fontWeight: 600 }}>Secteur</span>, 
      dataIndex: 'sector', 
      key: 'sector', 
      render: (sector) => {
        const sectorMap = { 
          BANK: 'Banque', 
          INSURANCE: 'Assurance', 
          ENTERPRISE: 'Entreprise', 
          TECH: 'Tech', 
          COMMERCE: 'Commerce',
          OTHER: 'Autre'
        };
        const colorMap = { 
          BANK: 'blue', 
          INSURANCE: 'green', 
          ENTERPRISE: 'orange', 
          TECH: 'purple', 
          COMMERCE: 'cyan',
          OTHER: 'default'
        };
        const normalizedSector = sector?.toUpperCase().trim();
        return <Tag color={colorMap[normalizedSector] || 'default'} style={{ color: '#000000', borderRadius: 12 }}>{sectorMap[normalizedSector] || sector || 'Non défini'}</Tag>;
      }
    },
    { 
      title: <span style={{ color: '#000000', fontWeight: 600 }}>Statut</span>, 
      dataIndex: 'status', 
      key: 'status', 
      render: (status) => (
        <Tag 
          color={status === 'active' ? 'success' : 'warning'} 
          style={{ 
            borderRadius: 12,
            padding: '2px 12px',
            color: '#000000'
          }}
        >
          {status === 'active' ? 'Actif' : 'En attente'}
        </Tag>
      ) 
    },
    { 
      title: <span style={{ color: '#000000', fontWeight: 600 }}>Téléphone</span>, 
      dataIndex: 'phone', 
      key: 'phone',
      render: (phone) => <span style={{ color: '#000000' }}>{phone || '-'}</span>
    },
    {
      title: <span style={{ color: '#000000', fontWeight: 600 }}>Actions</span>,
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Modifier">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              onClick={() => handleEditClient(record)} 
              style={{ color: '#1890ff' }} 
            />
          </Tooltip>
          <Tooltip title="Supprimer">
            <Button 
              type="text" 
              danger 
              icon={<DeleteOutlined />} 
              onClick={() => handleDeleteClient(record.id)} 
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const modelColumns = [
    { 
      title: <span style={{ color: '#000000', fontWeight: 600 }}>Modèle</span>, 
      dataIndex: 'name', 
      key: 'name', 
      render: (text) => <Text strong style={{ color: '#000000' }}>{text}</Text> 
    },
    { 
      title: <span style={{ color: '#000000', fontWeight: 600 }}>Type</span>, 
      dataIndex: 'type', 
      key: 'type', 
      render: (type) => <Tag color="purple" style={{ color: '#000000', borderRadius: 12 }}>{type}</Tag> 
    },
    { 
      title: <span style={{ color: '#000000', fontWeight: 600 }}>Statut</span>, 
      dataIndex: 'status', 
      key: 'status', 
      render: (status) => (
        <Tag 
          color={status === 'active' ? 'success' : 'default'} 
          style={{ color: '#000000', borderRadius: 12 }}
        >
          {status === 'active' ? 'Actif' : 'Inactif'}
        </Tag>
      ) 
    },
    { 
      title: <span style={{ color: '#000000', fontWeight: 600 }}>Précision</span>, 
      dataIndex: 'accuracy', 
      key: 'accuracy',
      render: (acc) => <span style={{ color: '#000000' }}>{acc || 0}%</span>
    }
  ];

  const subscriptionColumns = [
    { 
      title: <span style={{ color: '#000000', fontWeight: 600 }}>Entreprise</span>, 
      dataIndex: 'company_name', 
      key: 'company_name',
      render: (text) => <Text strong style={{ color: '#000000' }}>{text}</Text>
    },
    { 
      title: <span style={{ color: '#000000', fontWeight: 600 }}>Plan</span>, 
      dataIndex: 'plan', 
      key: 'plan', 
      render: (plan) => (
        <Tag color={plan === 'premium' ? 'gold' : plan === 'enterprise' ? 'purple' : 'blue'} style={{ color: '#000000', borderRadius: 12 }}>
          {plan === 'premium' ? '⭐ Premium' : plan === 'enterprise' ? '🏢 Enterprise' : '📦 Standard'}
        </Tag>
      ) 
    },
    { 
      title: <span style={{ color: '#000000', fontWeight: 600 }}>Montant</span>, 
      dataIndex: 'amount', 
      key: 'amount', 
      render: (amt) => <Text strong style={{ color: '#000000' }}>{amt}€/mois</Text> 
    },
    { 
      title: <span style={{ color: '#000000', fontWeight: 600 }}>Statut</span>, 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => (
        <Tag 
          color={status === 'active' ? 'success' : status === 'pending' ? 'warning' : 'error'}
          style={{ color: '#000000', borderRadius: 12 }}
        >
          {status === 'active' ? '✅ Actif' : status === 'pending' ? '⏳ En attente' : '❌ Inactif'}
        </Tag>
      )
    },
    { 
      title: <span style={{ color: '#000000', fontWeight: 600 }}>Date</span>, 
      dataIndex: 'created_at', 
      key: 'created_at', 
      render: (date) => <span style={{ color: '#000000' }}>{date ? new Date(date).toLocaleDateString() : '-'}</span> 
    }
  ];

  const moduleColumns = [
    { 
      title: <span style={{ color: '#000000', fontWeight: 600 }}>Module</span>, 
      dataIndex: 'name', 
      key: 'name',
      render: (text) => <Text strong style={{ color: '#000000' }}>{text}</Text>
    },
    { 
      title: <span style={{ color: '#000000', fontWeight: 600 }}>Catégorie</span>, 
      dataIndex: 'category', 
      key: 'category',
      render: (cat) => <Tag color="purple" style={{ color: '#000000', borderRadius: 12 }}>{cat}</Tag>
    },
    { 
      title: <span style={{ color: '#000000', fontWeight: 600 }}>Prix</span>, 
      dataIndex: 'price', 
      key: 'price',
      render: (price) => <Text strong style={{ color: '#000000' }}>{price || 0}€</Text>
    },
    { 
      title: <span style={{ color: '#000000', fontWeight: 600 }}>Statut</span>, 
      dataIndex: 'is_free', 
      key: 'is_free',
      render: (isFree) => (
        <Tag color={isFree ? 'success' : 'gold'} style={{ color: '#000000', borderRadius: 12 }}>
          {isFree ? 'Gratuit' : 'Payant'}
        </Tag>
      )
    }
  ];

  // Filtrer les clients
  const filteredClients = clients.filter(client => {
    const matchSearch = client.name?.toLowerCase().includes(searchText.toLowerCase()) ||
                        client.email?.toLowerCase().includes(searchText.toLowerCase());
    const matchSector = filterSector === 'all' || 
                        (client.sector && client.sector.toUpperCase().includes(filterSector.toUpperCase()));
    const matchStatus = filterStatus === 'all' || client.status === filterStatus;
    return matchSearch && matchSector && matchStatus;
  });

  // Graphiques
  const sectorDistribution = [
    { sector: 'Banque', value: statsData.bankCount || 0 },
    { sector: 'Assurance', value: statsData.insuranceCount || 0 },
    { sector: 'Entreprise', value: statsData.enterpriseCount || 0 },
    { sector: 'Tech', value: statsData.techCount || 0 },
    { sector: 'Commerce', value: statsData.commerceCount || 0 }
  ];

  const sectorsWithData = sectorDistribution.filter(s => s.value > 0);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Chargement du dashboard..." ><div/></Spin>
      </div>
    );
  }

  return (
    <ConfigProvider theme={{ algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
      <div className={`admin-dashboard-container ${darkMode ? 'dark-mode' : 'light-mode'}`}>
        {/* En-tête */}
        <div className="dashboard-header">
          <div className="header-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(102,126,234,0.3)'
              }}>
                <DashboardOutlined style={{ fontSize: 24, color: 'white' }} />
              </div>
              <div>
                <Title level={3} style={{ margin: 0, color: '#2d3748' }}>
                  Dashboard Administration
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Vue d'ensemble de votre plateforme
                </Text>
              </div>
            </div>
          </div>
          <div className="header-right">
            <Space size="middle">
              <Tag 
                icon={<ReloadOutlined spin={loading} />} 
                color="blue" 
                style={{ borderRadius: 12, padding: '4px 12px' }}
              >
                {lastUpdate.toLocaleTimeString()}
              </Tag>
              <Tooltip title="Mode sombre">
                <Switch 
                  checked={darkMode} 
                  onChange={setDarkMode} 
                  checkedChildren={<MoonOutlined />} 
                  unCheckedChildren={<SunOutlined />} 
                />
              </Tooltip>
              <Badge count={statsData.pendingSubscriptions} offset={[-4, 4]}>
                <Button 
                  icon={<BellOutlined />} 
                  onClick={() => setNotificationsDrawer(true)} 
                  type="text"
                  style={{ borderRadius: 12 }}
                />
              </Badge>
              <Button 
                icon={<ReloadOutlined spin={loading} />} 
                onClick={handleRefresh} 
                type="text"
                style={{ borderRadius: 12 }}
              />
              <Button 
                icon={fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} 
                onClick={toggleFullscreen} 
                type="text"
                style={{ borderRadius: 12 }}
              />
              <Dropdown
                menu={{
                  items: [
                    { key: 'settings', icon: <SettingOutlined />, label: 'Paramètres', onClick: () => setSettingsDrawer(true) },
                    { key: 'assistant', icon: <RobotOutlined />, label: assistantEnabled ? 'Désactiver assistant' : 'Activer assistant', onClick: toggleAssistant },
                    { type: 'divider' },
                    { key: 'logout', icon: <LogoutOutlined />, label: 'Déconnexion', onClick: handleLogout, danger: true }
                  ]
                }}
              >
                <Button icon={<MenuOutlined />} type="text" style={{ borderRadius: 12 }} />
              </Dropdown>
            </Space>
          </div>
        </div>

        {/* KPIs */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card className="kpi-card" onClick={() => setActiveTab('customers')}>
              <Statistic 
                title="Total clients" 
                value={statsData.totalUsers} 
                prefix={<TeamOutlined />} 
                valueStyle={{ color: '#667eea' }} 
              />
              <div style={{ marginTop: 8 }}>
                <Progress 
                  percent={statsData.totalUsers > 0 ? Math.round((statsData.activeUsers / statsData.totalUsers) * 100) : 0}
                  size="small"
                  status="active"
                  showInfo={false}
                />
                <Text style={{ color: '#000000', fontSize: 12 }}>
                  {statsData.activeUsers} actifs • {statsData.pendingUsers} en attente
                </Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="kpi-card" onClick={() => setActiveTab('customers')}>
              <Statistic 
                title="Entreprises" 
                value={statsData.totalCompanies} 
                prefix={<BankOutlined />} 
                valueStyle={{ color: '#52c41a' }} 
              />
              <div style={{ marginTop: 8 }}>
                <Text style={{ color: '#000000', fontSize: 12 }}>
                  {statsData.bankCount} banques • {statsData.insuranceCount} assurances
                </Text>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="kpi-card" onClick={() => setActiveTab('models')}>
              <Statistic 
                title="Modèles IA actifs" 
                value={statsData.activeModels} 
                prefix={<RobotOutlined />} 
                valueStyle={{ color: '#fa8c16' }} 
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card className="kpi-card">
              <Statistic 
                title="CA total" 
                value={statsData.totalRevenue} 
                prefix="€" 
                valueStyle={{ color: '#1890ff' }} 
              />
            </Card>
          </Col>
        </Row>

        {/* Tabs avec texte en noir */}
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab} 
          className="dashboard-tabs"
          items={[
            {
              key: 'overview',
              label: <span style={{ color: '#000000' }}><DashboardOutlined style={{ color: '#000000' }} /> Vue d'ensemble</span>,
              children: (
                <>
                  <Row gutter={[16, 16]}>
                    <Col span={12}>
                      <Card 
                        title={<span style={{ color: '#000000' }}>Répartition par secteur</span>}
                        className="chart-card"
                        headStyle={{ color: '#000000' }}
                      >
                        {sectorsWithData.length > 0 ? (
                          <Pie 
                            data={sectorsWithData} 
                            angleField="value" 
                            colorField="sector" 
                            radius={0.8} 
                            height={280} 
                            label={{ 
                              type: 'outer', 
                              content: '{name}: {percentage}%',
                              style: { fontSize: 12, color: '#000000' }
                            }} 
                            statistic={{
                              title: false,
                              content: {
                                style: { fontSize: 14, fontWeight: 'bold', color: '#000000' }
                              }
                            }}
                          />
                        ) : (
                          <Empty description="Aucune donnée secteur disponible" />
                        )}
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card 
                        title={<span style={{ color: '#000000' }}>Modèles IA par type</span>}
                        className="chart-card"
                        headStyle={{ color: '#000000' }}
                      >
                        {models.length > 0 ? (
                          <Column 
                            data={models} 
                            xField="type" 
                            yField="accuracy" 
                            height={280}
                            label={{
                              style: { fill: '#000000' }
                            }}
                          />
                        ) : (
                          <Empty description="Aucun modèle IA disponible" />
                        )}
                      </Card>
                    </Col>
                  </Row>
                  <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    <Col span={24}>
                      <Card 
                        title={<span style={{ color: '#000000' }}>📝 Demandes d'abonnement en attente</span>}
                        extra={<Badge count={statsData.pendingSubscriptions} style={{ backgroundColor: '#fa8c16' }} />}
                        headStyle={{ color: '#000000' }}
                      >
                        {subscriptions.length > 0 ? (
                          <Table 
                            columns={subscriptionColumns} 
                            dataSource={subscriptions} 
                            rowKey="id" 
                            pagination={{ pageSize: 10 }} 
                          />
                        ) : (
                          <Empty description="Aucune demande d'abonnement en attente" />
                        )}
                      </Card>
                    </Col>
                  </Row>
                </>
              )
            },
            {
              key: 'customers',
              label: <span style={{ color: '#000000' }}><TeamOutlined style={{ color: '#000000' }} /> Clients</span>,
              children: (
                <Card>
                  <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <Input
                      placeholder="Rechercher un client..."
                      prefix={<SearchOutlined />}
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      style={{ width: 250 }}
                    />
                    <Select
                      placeholder="Secteur"
                      value={filterSector}
                      onChange={setFilterSector}
                      style={{ width: 150 }}
                    >
                      <Option value="all">Tous les secteurs</Option>
                      <Option value="BANK">Banque</Option>
                      <Option value="INSURANCE">Assurance</Option>
                      <Option value="ENTERPRISE">Entreprise</Option>
                      <Option value="TECH">Tech</Option>
                      <Option value="COMMERCE">Commerce</Option>
                    </Select>
                    <Select
                      placeholder="Statut"
                      value={filterStatus}
                      onChange={setFilterStatus}
                      style={{ width: 150 }}
                    >
                      <Option value="all">Tous les statuts</Option>
                      <Option value="active">Actif</Option>
                      <Option value="pending">En attente</Option>
                      <Option value="inactive">Inactif</Option>
                    </Select>
                  </div>
                  {filteredClients.length > 0 ? (
                    <Table 
                      columns={clientColumns} 
                      dataSource={filteredClients} 
                      rowKey="id" 
                      pagination={{ pageSize: 10 }} 
                    />
                  ) : (
                    <Empty description="Aucun client trouvé" />
                  )}
                </Card>
              )
            },
            {
              key: 'models',
              label: <span style={{ color: '#000000' }}><RobotOutlined style={{ color: '#000000' }} /> Modèles IA</span>,
              children: (
                <Card>
                  {models.length > 0 ? (
                    <Table columns={modelColumns} dataSource={models} rowKey="id" pagination={{ pageSize: 10 }} />
                  ) : (
                    <Empty description="Aucun modèle IA trouvé" />
                  )}
                </Card>
              )
            },
            {
              key: 'subscriptions',
              label: <span style={{ color: '#000000' }}><CreditCardOutlined style={{ color: '#000000' }} /> Abonnements</span>,
              children: (
                <Card>
                  <div style={{ marginBottom: 16 }}>
                    <Space>
                      <Tag color="gold" style={{ color: '#000000' }}>⭐ Premium</Tag>
                      <Tag color="purple" style={{ color: '#000000' }}>🏢 Enterprise</Tag>
                      <Tag color="blue" style={{ color: '#000000' }}>📦 Standard</Tag>
                      <Tag color="success" style={{ color: '#000000' }}>✅ Actif</Tag>
                      <Tag color="warning" style={{ color: '#000000' }}>⏳ En attente</Tag>
                    </Space>
                  </div>
                  {subscriptions.length > 0 ? (
                    <Table 
                      columns={subscriptionColumns} 
                      dataSource={subscriptions} 
                      rowKey="id" 
                      pagination={{ pageSize: 10 }} 
                    />
                  ) : (
                    <Empty description="Aucun abonnement trouvé" />
                  )}
                </Card>
              )
            },
            {
              key: 'modules',
              label: <span style={{ color: '#000000' }}><AppstoreOutlined style={{ color: '#000000' }} /> Catalogue modules</span>,
              children: (
                <Card>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Modules disponibles</Text>
                  </div>
                  {modules.length > 0 ? (
                    <Table 
                      columns={moduleColumns} 
                      dataSource={modules} 
                      rowKey="id" 
                      pagination={{ pageSize: 10 }} 
                    />
                  ) : (
                    <Empty description="Aucun module trouvé" />
                  )}
                </Card>
              )
            }
          ]}
        />

        {/* Assistant */}
        <AnimatePresence>
          {assistantVisible && assistantEnabled && (
            <AssistantBubble 
              statsData={statsData} 
              onClose={() => setAssistantVisible(false)} 
              refreshData={fetchDashboardData}
            />
          )}
        </AnimatePresence>
        
        {assistantEnabled && !assistantVisible && (
          <FloatingAssistantButton 
            onClick={() => setAssistantVisible(true)} 
            pendingCount={statsData.pendingSubscriptions} 
          />
        )}

        {/* Modal d'approbation */}
        <Modal 
          title="Approuver la demande d'abonnement" 
          open={subscriptionModalVisible} 
          onOk={confirmApprove} 
          onCancel={() => setSubscriptionModalVisible(false)} 
          okText="Approuver" 
          cancelText="Annuler"
          okButtonProps={{ style: { background: '#52c41a' } }}
          style={{ borderRadius: 16 }}
        >
          {selectedSubscription && (
            <div>
              <Descriptions column={1} bordered size="small">
                <Descriptions.Item label="Entreprise">{selectedSubscription.company_name}</Descriptions.Item>
                <Descriptions.Item label="Plan">{selectedSubscription.plan}</Descriptions.Item>
                <Descriptions.Item label="Montant">{selectedSubscription.amount}€/mois</Descriptions.Item>
                <Descriptions.Item label="Contact">{selectedSubscription.contact_email}</Descriptions.Item>
              </Descriptions>
              <Alert 
                message="Confirmation" 
                description={`L'entreprise aura accès à toutes les fonctionnalités du plan.`} 
                type="success" 
                showIcon 
                style={{ marginTop: 16, borderRadius: 12 }} 
              />
            </div>
          )}
        </Modal>

        {/* Modal édition client */}
        <Modal
          title="Modifier le client"
          open={clientModalVisible}
          onCancel={() => setClientModalVisible(false)}
          footer={null}
        >
          <Form form={clientForm} layout="vertical" onFinish={handleUpdateClient}>
            <Form.Item name="name" label="Entreprise" rules={[{ required: true }]}>
              <Input prefix={<ApartmentOutlined />} />
            </Form.Item>
            <Form.Item name="email" label="Email" rules={[{ type: 'email', required: true }]}>
              <Input prefix={<MailOutlined />} />
            </Form.Item>
            <Form.Item name="phone" label="Téléphone">
              <Input prefix={<PhoneOutlined />} />
            </Form.Item>
            <Form.Item name="sector" label="Secteur">
              <Select>
                <Option value="BANK">Banque</Option>
                <Option value="INSURANCE">Assurance</Option>
                <Option value="ENTERPRISE">Entreprise</Option>
                <Option value="TECH">Tech</Option>
                <Option value="COMMERCE">Commerce</Option>
                <Option value="OTHER">Autre</Option>
              </Select>
            </Form.Item>
            <Form.Item name="status" label="Statut">
              <Select>
                <Option value="active">Actif</Option>
                <Option value="pending">En attente</Option>
              </Select>
            </Form.Item>
            <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setClientModalVisible(false)}>Annuler</Button>
                <Button type="primary" htmlType="submit">Mettre à jour</Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Drawer notifications */}
        <Drawer 
          title="Notifications" 
          placement="right" 
          width={400} 
          onClose={() => setNotificationsDrawer(false)} 
          open={notificationsDrawer}
          style={{ borderRadius: 16 }}
        >
          {subscriptions.length > 0 ? (
            subscriptions.map((sub, idx) => (
              <div key={idx} style={{ 
                padding: '12px 16px', 
                borderBottom: '1px solid #f0f0f0',
                borderRadius: 12,
                marginBottom: 8,
                background: '#fafafa'
              }}>
                <Space>
                  <Avatar icon={<CreditCardOutlined />} style={{ backgroundColor: '#fa8c16' }} />
                  <div>
                    <Text strong style={{ color: '#000000' }}>Nouvelle demande</Text>
                    <br />
                    <Text style={{ color: '#000000' }}>{sub.company_name} demande un abonnement</Text>
                    <br />
                    <Text style={{ color: '#000000', fontSize: 10 }}>{new Date(sub.created_at).toLocaleDateString()}</Text>
                  </div>
                </Space>
              </div>
            ))
          ) : (
            <Empty description="Aucune notification" />
          )}
        </Drawer>

        {/* Drawer paramètres */}
        <Drawer 
          title="Paramètres" 
          placement="right" 
          width={400} 
          onClose={() => setSettingsDrawer(false)} 
          open={settingsDrawer}
          style={{ borderRadius: 16 }}
        >
          <Form layout="vertical">
            <Form.Item label="Assistant IA">
              <Switch 
                checked={assistantEnabled} 
                onChange={toggleAssistant} 
                checkedChildren="Activé" 
                unCheckedChildren="Désactivé" 
              />
            </Form.Item>
            <Form.Item label="Thème">
              <Radio.Group value={darkMode ? 'dark' : 'light'} onChange={(e) => setDarkMode(e.target.value === 'dark')}>
                <Radio.Button value="light">Clair</Radio.Button>
                <Radio.Button value="dark">Sombre</Radio.Button>
              </Radio.Group>
            </Form.Item>
          </Form>
        </Drawer>

        <style jsx>{`
          .admin-dashboard-container { 
            min-height: 100vh; 
            background: #f0f2f5; 
            padding: 24px; 
            transition: all 0.3s; 
          }
          .admin-dashboard-container.dark-mode { 
            background: #141414; 
          }
          .dashboard-header { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            margin-bottom: 24px; 
            flex-wrap: wrap; 
            gap: 16px; 
          }
          .kpi-card { 
            border-radius: 16px; 
            transition: all 0.3s; 
            cursor: pointer; 
          }
          .kpi-card:hover { 
            transform: translateY(-4px); 
            box-shadow: 0 8px 24px rgba(0,0,0,0.12); 
          }
          .dashboard-tabs { 
            margin-top: 24px; 
          }
          .dashboard-tabs .ant-tabs-tab {
            color: #000000 !important;
          }
          .dashboard-tabs .ant-tabs-tab-active {
            color: #000000 !important;
          }
          .dashboard-tabs .ant-tabs-tab-btn {
            color: #000000 !important;
          }
          .dashboard-tabs .ant-tabs-tab .anticon {
            color: #000000 !important;
          }
          .chart-card { 
            border-radius: 16px; 
            height: 100%; 
          }
          .chart-card .ant-card-head-title {
            color: #000000 !important;
          }
          .ant-table {
            color: #000000 !important;
          }
          .ant-table-thead > tr > th {
            color: #000000 !important;
            font-weight: 600 !important;
          }
          .ant-table-tbody > tr > td {
            color: #000000 !important;
          }
          .ant-table-tbody > tr > td .ant-typography {
            color: #000000 !important;
          }
          .ant-table-tbody > tr > td .ant-tag {
            color: #000000 !important;
          }
          .ant-table-tbody > tr > td .ant-space {
            color: #000000 !important;
          }
          .ant-table-tbody > tr > td span {
            color: #000000 !important;
          }
          .ant-statistic-content {
            color: #000000 !important;
          }
          .ant-statistic-content-value {
            color: #000000 !important;
          }
          .ant-statistic-content-suffix {
            color: #000000 !important;
          }
          .typing-indicator { 
            display: flex; 
            gap: 4px; 
            align-items: center; 
          }
          .typing-indicator span { 
            width: 8px; 
            height: 8px; 
            background: #667eea; 
            border-radius: 50%; 
            animation: typing 1.4s infinite ease-in-out; 
          }
          .typing-indicator span:nth-child(1) { animation-delay: 0s; }
          .typing-indicator span:nth-child(2) { animation-delay: 0.2s; }
          .typing-indicator span:nth-child(3) { animation-delay: 0.4s; }
          @keyframes typing { 
            0%,60%,100% { transform: translateY(0); opacity: 0.4; } 
            30% { transform: translateY(-10px); opacity: 1; } 
          }
        `}</style>
      </div>
    </ConfigProvider>
  );
};

export default AdminDashboard;