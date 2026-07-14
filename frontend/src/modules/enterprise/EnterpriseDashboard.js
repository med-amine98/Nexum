// src/modules/enterprise/EnterpriseDashboard.js – Version sombre et professionnelle
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Button,
  Space,
  Tag,
  Progress,
  Badge,
  Tooltip,
  Modal,
  message,
  List,
  Table,
  Typography,
  Alert,
  Form,
  FloatButton,
  Avatar,
  Empty,
  notification,
  Timeline,
  ConfigProvider,
  DatePicker,
  Rate,
  Drawer,
  Tabs,
  Skeleton,
  Input,
  Select,
  Switch,
  Divider,
  Statistic,
  Descriptions,
  theme
} from 'antd';
import {
  ShoppingOutlined,
  TeamOutlined,
  RiseOutlined,
  FallOutlined,
  EuroOutlined,
  BarChartOutlined,
  ReloadOutlined,
  DeleteOutlined,
  ProjectOutlined,
  CheckCircleOutlined,
  UserOutlined,
  StarOutlined,
  RobotOutlined,
  WarningOutlined,
  TransactionOutlined,
  BellOutlined,
  DashboardOutlined,
  ClockCircleOutlined,
  ExportOutlined,
  PieChartOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  SettingOutlined,
  DiscordOutlined,
  SoundOutlined,
  CrownOutlined,
  TrophyOutlined,
  ShoppingOutlined as ShoppingIcon,
  ClearOutlined,
  CustomerServiceOutlined,
  SendOutlined,
  MessageOutlined,
  CloseCircleOutlined,
  StockOutlined,
  DollarOutlined,
  ShopOutlined,
  CheckOutlined,
  CloseOutlined,
  FileTextOutlined,
  MoonOutlined,
  SunOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  GiftOutlined,
  FireOutlined,
  StarFilled,
  TrophyFilled,
  CrownFilled
} from '@ant-design/icons';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';
import './EnterpriseDashboard.css';

dayjs.extend(relativeTime);
dayjs.locale('fr');

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
// Clé pour le localStorage
const NOTIFICATIONS_STORAGE_KEY = 'discord_notifications';
const THEME_STORAGE_KEY = 'enterprise_theme';

// Palette de couleurs sombre et professionnelle
const COLORS = {
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#4834D4',
  secondary: '#00CEC9',
  success: '#00B894',
  successLight: '#55EFC4',
  warning: '#FDCB6E',
  error: '#FF6B6B',
  discord: '#5865F2',
  
  // Couleurs sombres
  bgPrimary: '#0a0a0f',
  bgSecondary: '#12121a',
  bgCard: 'rgba(255,255,255,0.04)',
  bgCardHover: 'rgba(255,255,255,0.08)',
  bgGradient: 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
  
  textPrimary: '#ffffff',
  textSecondary: 'rgba(255,255,255,0.7)',
  textMuted: 'rgba(255,255,255,0.45)',
  
  border: 'rgba(255,255,255,0.06)',
  borderHover: 'rgba(255,255,255,0.12)',
  
  glowPrimary: '0 0 30px rgba(108, 92, 231, 0.15)',
  glowSuccess: '0 0 30px rgba(0, 184, 148, 0.15)',
  
  gradientPrimary: 'linear-gradient(135deg, #6C5CE7 0%, #4834D4 100%)',
  gradientSecondary: 'linear-gradient(135deg, #00CEC9 0%, #00B894 100%)',
  gradientDiscord: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)',
  gradientGold: 'linear-gradient(135deg, #FDCB6E 0%, #F39C12 100%)',
  gradientNeon: 'linear-gradient(135deg, #6C5CE7, #00CEC9, #6C5CE7)',
};

// Styles globaux pour le mode sombre
const darkTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorPrimary: COLORS.primary,
    colorBgContainer: COLORS.bgSecondary,
    colorBgElevated: COLORS.bgCard,
    colorText: COLORS.textPrimary,
    colorTextSecondary: COLORS.textSecondary,
    colorBorder: COLORS.border,
    borderRadius: 16,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  components: {
    Card: {
      colorBgContainer: COLORS.bgCard,
      colorBorderSecondary: COLORS.border,
      boxShadowTertiary: 'none',
    },
    Table: {
      colorBgContainer: 'transparent',
      colorBgBody: 'transparent',
      colorBorderSecondary: COLORS.border,
    },
    Tabs: {
      colorBgContainer: 'transparent',
      colorBorderSecondary: COLORS.border,
    },
  }
};

// Composant KPI Card amélioré
const ExecutiveKpiCard = ({ title, value, suffix, icon, color, trend, trendValue, subtitle, onClick, loading }) => (
  <motion.div 
    whileHover={{ y: -6, scale: 1.01 }} 
    initial={{ opacity: 0, y: 20 }} 
    animate={{ opacity: 1, y: 0 }} 
    transition={{ duration: 0.5 }}
    style={{ height: '100%', cursor: onClick ? 'pointer' : 'default' }} 
    onClick={onClick}
  >
    <Card 
      className="premium-card-dark"
      style={{ 
        borderRadius: 20, 
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(10px)',
        height: '100%', 
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
      }}
      bodyStyle={{ padding: '24px' }}
    >
      {/* Effet de fond lumineux */}
      <div style={{
        position: 'absolute',
        top: -50,
        right: -50,
        width: 150,
        height: 150,
        borderRadius: '50%',
        background: `${color}15`,
        filter: 'blur(60px)',
        pointerEvents: 'none',
      }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1 }}>
        <div style={{ flex: 1 }}>
          <Text style={{ color: COLORS.textMuted, fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            {title}
          </Text>
          <div style={{ fontSize: 32, fontWeight: 800, marginTop: 8, color: COLORS.textPrimary, letterSpacing: -0.5 }}>
            {loading ? '...' : typeof value === 'number' ? value.toLocaleString() : value}
            <span style={{ fontSize: 16, fontWeight: 500, color: COLORS.textMuted, marginLeft: 4 }}>{suffix}</span>
          </div>
          {subtitle && <Text style={{ color: COLORS.textMuted, fontSize: 12, marginTop: 4, display: 'block' }}>{subtitle}</Text>}
          {trend && (
            <Space size={4} style={{ marginTop: 8 }}>
              {trend === 'up' ? (
                <ArrowUpOutlined style={{ color: COLORS.success, fontSize: 12 }} />
              ) : (
                <ArrowDownOutlined style={{ color: COLORS.error, fontSize: 12 }} />
              )}
              <Text style={{ color: trend === 'up' ? COLORS.success : COLORS.error, fontSize: 12, fontWeight: 600 }}>
                {Math.abs(trendValue)}%
              </Text>
              <Text style={{ color: COLORS.textMuted, fontSize: 11 }}>vs période préc.</Text>
            </Space>
          )}
        </div>
        <div style={{
          background: `${color}15`,
          borderRadius: 16,
          padding: 14,
          color: color,
          boxShadow: `0 4px 20px ${color}25`,
          border: `1px solid ${color}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {React.cloneElement(icon, { style: { fontSize: 24 } })}
        </div>
      </div>
      
      {/* Barre de progression en bas */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: '100%',
        height: 3,
        background: `linear-gradient(90deg, ${color}40, ${color}80, ${color})`,
        opacity: 0.6,
      }} />
    </Card>
  </motion.div>
);

// Composant Notification Card amélioré
const DiscordNotificationCard = ({ notification, onClose, onAccept, onReject, onClick }) => {
  const getIcon = (type) => {
    const icons = {
      'order': <ShoppingOutlined />,
      'payment': <EuroOutlined />,
      'stock': <WarningOutlined />,
      'alert': <BellOutlined />,
      'ticket': <CustomerServiceOutlined />,
      'success': <CheckCircleOutlined />,
      'info': <BulbOutlined />,
    };
    return icons[type] || <MessageOutlined />;
  };

  const getColor = (type) => {
    const colors = {
      'order': COLORS.secondary,
      'payment': COLORS.primary,
      'stock': COLORS.warning,
      'alert': COLORS.error,
      'ticket': COLORS.discord,
      'success': COLORS.success,
      'info': COLORS.primary,
    };
    return colors[type] || COLORS.discord;
  };

  const isPendingOrder = notification.type === 'order' && notification.status === 'pending';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 100, scale: 0.9 }}
      transition={{ duration: 0.3 }}
      className="discord-notification-dark"
      style={{
        background: notification.status === 'accepted' ? 'rgba(0, 184, 148, 0.08)' : 
                   notification.status === 'rejected' ? 'rgba(255, 107, 107, 0.08)' : 
                   'rgba(255,255,255,0.03)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        border: `1px solid ${notification.status === 'accepted' ? 'rgba(0, 184, 148, 0.2)' : 
                   notification.status === 'rejected' ? 'rgba(255, 107, 107, 0.2)' : 
                   'rgba(255,255,255,0.06)'}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        backdropFilter: 'blur(10px)',
      }}
      onClick={() => onClick && onClick(notification)}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = notification.status === 'accepted' ? 'rgba(0, 184, 148, 0.12)' : 
                                           notification.status === 'rejected' ? 'rgba(255, 107, 107, 0.12)' : 
                                           'rgba(255,255,255,0.06)';
        e.currentTarget.style.borderColor = notification.status === 'accepted' ? 'rgba(0, 184, 148, 0.3)' : 
                                           notification.status === 'rejected' ? 'rgba(255, 107, 107, 0.3)' : 
                                           'rgba(255,255,255,0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = notification.status === 'accepted' ? 'rgba(0, 184, 148, 0.08)' : 
                                           notification.status === 'rejected' ? 'rgba(255, 107, 107, 0.08)' : 
                                           'rgba(255,255,255,0.03)';
        e.currentTarget.style.borderColor = notification.status === 'accepted' ? 'rgba(0, 184, 148, 0.2)' : 
                                           notification.status === 'rejected' ? 'rgba(255, 107, 107, 0.2)' : 
                                           'rgba(255,255,255,0.06)';
      }}
    >
      <div className="discord-notification-header" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{
          background: `${getColor(notification.type)}20`,
          borderRadius: 12,
          padding: 10,
          color: getColor(notification.type),
          flexShrink: 0,
          border: `1px solid ${getColor(notification.type)}20`,
        }}>
          {getIcon(notification.type)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.textPrimary }}>{notification.title}</div>
          <div style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>{notification.message}</div>
          {notification.orderId && (
            <div style={{ fontSize: 11, marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              <Tag color="blue" style={{ background: 'rgba(108, 92, 231, 0.15)', border: 'none', color: COLORS.primaryLight }}>
                N°: {notification.orderId}
              </Tag>
              {notification.quantity && (
                <Tag color="green" style={{ background: 'rgba(0, 184, 148, 0.15)', border: 'none', color: COLORS.successLight }}>
                  Qté: {notification.quantity}
                </Tag>
              )}
              {notification.amount && (
                <Tag color="gold" style={{ background: 'rgba(253, 203, 110, 0.15)', border: 'none', color: COLORS.warning }}>
                  {notification.amount}€
                </Tag>
              )}
            </div>
          )}
          <div style={{ fontSize: 11, marginTop: 6, color: COLORS.textMuted }}>
            {dayjs(notification.timestamp).fromNow()}
            {notification.status === 'accepted' && <Tag color="success" style={{ marginLeft: 8, background: 'rgba(0, 184, 148, 0.15)', border: 'none' }}>Acceptée</Tag>}
            {notification.status === 'rejected' && <Tag color="error" style={{ marginLeft: 8, background: 'rgba(255, 107, 107, 0.15)', border: 'none' }}>Rejetée</Tag>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
          {isPendingOrder && (
            <>
              <Tooltip title="Accepter la commande">
                <Button
                  type="primary"
                  shape="circle"
                  icon={<CheckOutlined />}
                  size="small"
                  style={{ background: COLORS.success, border: 'none' }}
                  onClick={() => onAccept && onAccept(notification)}
                />
              </Tooltip>
              <Tooltip title="Rejeter la commande">
                <Button
                  danger
                  shape="circle"
                  icon={<CloseOutlined />}
                  size="small"
                  style={{ background: 'rgba(255, 107, 107, 0.1)', border: `1px solid ${COLORS.error}40` }}
                  onClick={() => onReject && onReject(notification)}
                />
              </Tooltip>
            </>
          )}
          <Tooltip title="Fermer">
            <Button
              type="text"
              shape="circle"
              icon={<CloseOutlined />}
              size="small"
              style={{ color: COLORS.textMuted }}
              onClick={() => onClose && onClose(notification)}
            />
          </Tooltip>
        </div>
      </div>
    </motion.div>
  );
};

// Composant principal
const EnterpriseDashboard = () => {
  const navigate = useNavigate();
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [activeTab, setActiveTab] = useState('overview');
  const [discordNotifications, setDiscordNotifications] = useState([]);
  const [notificationsDrawer, setNotificationsDrawer] = useState(false);
  const [discordConnected, setDiscordConnected] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [processingOrder, setProcessingOrder] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookModal, setWebhookModal] = useState(false);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const [orderDetailsModal, setOrderDetailsModal] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Données API
  const [salesOrders, setSalesOrders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [products, setProducts] = useState([]);
  const [stockAlerts, setStockAlerts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [invoices, setInvoices] = useState([]);

  // Charger le thème depuis localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme !== null) {
      setIsDarkMode(savedTheme === 'dark');
    }
  }, []);

  // Sauvegarder le thème
  const toggleTheme = () => {
    const newTheme = !isDarkMode;
    setIsDarkMode(newTheme);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme ? 'dark' : 'light');
  };

  // Charger les notifications depuis localStorage
  const loadNotificationsFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const notifications = parsed.map(n => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        setDiscordNotifications(notifications);
      }
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
    }
  }, []);

  // Sauvegarder les notifications dans localStorage
  const saveNotificationsToStorage = useCallback((notifications) => {
    try {
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
    } catch (error) {
      console.error('Erreur sauvegarde notifications:', error);
    }
  }, []);

  const getEnterpriseId = useCallback(() => {
    return localStorage.getItem('enterpriseId') || localStorage.getItem('companyId') || '1';
  }, []);

  // Ouvrir les détails de la commande
  const openOrderDetails = (notification) => {
    setSelectedOrderDetails(notification);
    setOrderDetailsModal(true);
  };

  // ==================== FONCTIONS API ====================
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [salesOrdersRes, projectsRes, productsRes, stockRes, employeesRes, invoicesRes] = await Promise.all([
        api.get(`/orders/sales-orders`).catch(() => ({ data: [] })),
        api.get(`/enterprise/projects`).catch(() => ({ data: [] })),
        api.get(`/enterprise/products`).catch(() => ({ data: [] })),
        api.get(`/orders/stock/alerts`).catch(() => ({ data: [] })),
        api.get(`/hr/employees`).catch(() => ({ data: [] })),
        api.get(`/orders/invoices`).catch(() => ({ data: [] }))
      ]);
      
      setSalesOrders(Array.isArray(salesOrdersRes?.data) ? salesOrdersRes.data : []);
      setProjects(Array.isArray(projectsRes?.data) ? projectsRes.data : []);
      setProducts(Array.isArray(productsRes?.data) ? productsRes.data : []);
      setStockAlerts(Array.isArray(stockRes?.data) ? stockRes.data : []);
      setEmployees(Array.isArray(employeesRes?.data) ? employeesRes.data : []);
      setInvoices(Array.isArray(invoicesRes?.data) ? invoicesRes.data : []);
      
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Erreur chargement:', error);
      message.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const refreshData = useCallback(async () => {
    setRefreshing(true);
    await fetchAllData();
    setRefreshing(false);
    message.success('Données actualisées');
  }, [fetchAllData]);

  // ==================== GESTION DES COMMANDES ====================
  const handleAcceptOrder = async (notification) => {
    if (processingOrder) return;
    setProcessingOrder(true);
    
    try {
      message.loading({ content: 'Traitement de la commande...', key: 'orderProcessing', duration: 0 });
      
      const orderResponse = await api.post('/orders/create', {
        order_id: notification.orderId,
        user_id: 'discord_user',
        username: notification.customer || 'Client Discord',
        product: notification.product,
        quantity: notification.quantity,
        customer: notification.customer,
        address: 'Adresse à confirmer',
        phone: '',
        email: '',
        status: 'confirmed',
        date: new Date().toISOString(),
        source: 'discord',
        price: notification.amount / notification.quantity,
        company_id: parseInt(getEnterpriseId())
      });
      
      await api.post('/discord/notify', {
        type: 'order_accepted',
        title: '✅ Commande acceptée',
        message: `Commande #${notification.orderId} acceptée et ajoutée aux ventes`,
        order_id: notification.orderId,
        enterprise_id: getEnterpriseId()
      });
      
      notification.success({
        message: 'Commande acceptée',
        description: `La commande #${notification.orderId} a été ajoutée aux ventes`,
        placement: 'topRight',
        duration: 5
      });
      
      const updatedNotifications = discordNotifications.map(n =>
        n.id === notification.id
          ? { 
              ...n, 
              status: 'accepted', 
              title: '✅ Commande acceptée', 
              message: `Commande #${notification.orderId} acceptée - Ajoutée aux ventes`,
              read: true
            }
          : n
      );
      setDiscordNotifications(updatedNotifications);
      saveNotificationsToStorage(updatedNotifications);
      
      const newSaleOrder = {
        id: orderResponse.data?.id || Date.now(),
        name: notification.orderId,
        partner_name: notification.customer,
        amount_total: notification.amount,
        date_order: new Date().toISOString(),
        status: 'confirmé',
        created_from_discord: true
      };
      
      setSalesOrders(prev => [newSaleOrder, ...prev]);
      
      message.success({ content: `Commande #${notification.orderId} acceptée et ajoutée aux ventes !`, key: 'orderProcessing', duration: 3 });
      
      setNotificationsDrawer(false);
      setTimeout(() => {
        setActiveTab('sales');
        message.info('Nouvelle commande visible dans l\'onglet Ventes', 2);
      }, 500);
      
      refreshData();
      
    } catch (error) {
      console.error('Erreur traitement commande:', error);
      message.error({ content: 'Erreur lors du traitement de la commande', key: 'orderProcessing', duration: 3 });
    } finally {
      setProcessingOrder(false);
    }
  };

  const handleRejectOrder = async (notification) => {
    Modal.confirm({
      title: 'Rejeter la commande',
      content: `Êtes-vous sûr de vouloir rejeter la commande #${notification.orderId} ?`,
      okText: 'Oui, rejeter',
      okType: 'danger',
      cancelText: 'Non',
      onOk: async () => {
        await api.post('/discord/notify', {
          type: 'order_rejected',
          title: '❌ Commande rejetée',
          message: `Commande #${notification.orderId} a été rejetée`,
          order_id: notification.orderId,
          enterprise_id: getEnterpriseId()
        });
        
        notification.warning({
          message: 'Commande rejetée',
          description: `La commande #${notification.orderId} a été rejetée`,
          placement: 'topRight',
          duration: 5
        });
        
        const updatedNotifications = discordNotifications.map(n =>
          n.id === notification.id
            ? { 
                ...n, 
                status: 'rejected', 
                title: '❌ Commande rejetée', 
                message: `Commande #${notification.orderId} a été rejetée`,
                read: true
              }
            : n
        );
        setDiscordNotifications(updatedNotifications);
        saveNotificationsToStorage(updatedNotifications);
        
        message.warning(`Commande #${notification.orderId} rejetée`);
        refreshData();
      }
    });
  };

  // ==================== CONFIGURATION DISCORD ====================
  const saveDiscordConfig = async () => {
    try {
      await api.post('/discord/config', {
        enabled: discordConnected,
        webhook_url: webhookUrl
      });
      message.success('Configuration Discord sauvegardée');
      setWebhookModal(false);
    } catch (error) {
      message.error('Erreur lors de la sauvegarde');
    }
  };
  
  const testDiscordWebhook = async () => {
    try {
      await api.post('/discord/test', { webhook_url: webhookUrl });
      message.success('Test envoyé sur Discord !');
    } catch (error) {
      message.error('Erreur lors de l\'envoi du test');
    }
  };

  // ==================== WEBSOCKET ====================
  const connectWebSocket = useCallback(() => {
    const enterpriseId = getEnterpriseId();
    const wsUrl = `ws://localhost:8000/ws/discord/${enterpriseId}`;
    
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      message.success('Connecté au serveur de notifications', 2);
      const pingInterval = setInterval(() => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send('ping');
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);
    };
    
    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'discord_notification' || data.type === 'notification') {
          const notifData = data.data || data;
          const newNotif = {
            id: Date.now(),
            type: data.notification_type || notifData.type || 'info',
            title: notifData.title || data.title || 'Notification',
            message: notifData.message || data.message || '',
            orderId: notifData.orderId || data.orderId || notifData.order_id,
            ticketId: notifData.ticketId || data.ticketId || notifData.ticket_id,
            product: notifData.product,
            quantity: notifData.quantity,
            customer: notifData.customer,
            amount: notifData.amount,
            status: notifData.status || 'pending',
            timestamp: new Date(),
            read: false
          };
          
          setDiscordNotifications(prev => {
            const updated = [newNotif, ...prev];
            saveNotificationsToStorage(updated);
            return updated;
          });
          
          if (soundEnabled) {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(e => console.log('Son non joué:', e));
          }
          
          notification.info({
            message: newNotif.title,
            description: newNotif.message,
            icon: <DiscordOutlined style={{ color: COLORS.discord }} />,
            placement: 'topRight',
            duration: 5
          });
          
          if (newNotif.type === 'order') {
            refreshData();
          }
        }
      } catch (e) {
        console.error('Erreur parsing message WebSocket:', e);
      }
    };
    
    wsRef.current.onerror = (error) => {
      console.error('❌ Erreur WebSocket:', error);
    };
    
    wsRef.current.onclose = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, 5000);
    };
  }, [getEnterpriseId, soundEnabled, refreshData, saveNotificationsToStorage]);
  
  // ==================== INITIALISATION ====================
  useEffect(() => {
    loadNotificationsFromStorage();
    fetchAllData();
    const interval = setInterval(refreshData, 120000);
    return () => clearInterval(interval);
  }, [fetchAllData, refreshData, loadNotificationsFromStorage]);
  
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);
  
  // ==================== UTILS ====================
  const clearNotifications = () => {
    setDiscordNotifications([]);
    saveNotificationsToStorage([]);
    message.success('Notifications effacées');
  };
  
  const removeNotification = (notification) => {
    const updated = discordNotifications.filter(n => n.id !== notification.id);
    setDiscordNotifications(updated);
    saveNotificationsToStorage(updated);
  };
  
  const exportData = () => {
    const data = {
      salesOrders: salesOrders,
      projects: projects,
      products: products,
      stockAlerts: stockAlerts,
      employees: employees,
      invoices: invoices,
      discordNotifications: discordNotifications,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-export-${dayjs().format('YYYY-MM-DD')}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('Export terminé');
  };
  
  // ==================== CALCULS ====================
  const totalRevenue = Array.isArray(salesOrders) ? salesOrders.reduce((sum, s) => sum + (s.amount_total || 0), 0) : 0;
  const totalProjects = Array.isArray(projects) ? projects.length : 0;
  const activeProjects = Array.isArray(projects) ? projects.filter(p => p.status === 'ACTIVE' || p.status === 'on_track').length : 0;
  const employeesCount = Array.isArray(employees) ? employees.length : 0;
  const pendingOrdersCount = discordNotifications.filter(n => n.type === 'order' && n.status === 'pending').length;
  const unreadCount = discordNotifications.filter(n => !n.read).length;
  
  // ==================== COLONNES TABLEAUX ====================
  const salesColumns = [
    { title: 'Commande', dataIndex: 'name', key: 'name' },
    { title: 'Client', dataIndex: 'partner_name', key: 'partner_name' },
    { title: 'Montant', dataIndex: 'amount_total', key: 'amount_total', render: (val) => `${val?.toLocaleString()}€` },
    { title: 'Date', dataIndex: 'date_order', key: 'date_order', render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-' },
    { title: 'Statut', dataIndex: 'status', key: 'status', render: (status) => <Tag color={status === 'confirmé' ? 'success' : status === 'brouillon' ? 'warning' : 'default'}>{status}</Tag> },
    {
      title: 'Origine',
      key: 'origin',
      render: (_, record) => record.created_from_discord && <Tag icon={<DiscordOutlined />} color="#5865F2">Discord</Tag>
    }
  ];
  
  const invoicesColumns = [
    { title: 'Facture', dataIndex: 'number', key: 'number' },
    { title: 'Client', dataIndex: 'partner_name', key: 'partner_name' },
    { title: 'Montant', dataIndex: 'amount_total', key: 'amount_total', render: (val) => `${val?.toLocaleString()}€` },
    { title: 'Date', dataIndex: 'date_invoice', key: 'date_invoice', render: (val) => val ? dayjs(val).format('DD/MM/YYYY') : '-' },
    { title: 'Statut', dataIndex: 'status', key: 'status', render: (status) => <Tag color={status === 'paid' ? 'success' : status === 'draft' ? 'warning' : 'error'}>{status}</Tag> }
  ];
  
  const projectColumns = [
    { title: 'Projet', dataIndex: 'name', key: 'name' },
    { title: 'Avancement', dataIndex: 'progress', key: 'progress', render: (p) => <Progress percent={Math.round(p || 0)} size="small" strokeColor={COLORS.primary} /> },
    { title: 'Statut', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'on_track' || s === 'ACTIVE' ? 'success' : 'default'}>{s}</Tag> },
    { title: 'Budget', dataIndex: 'budget', key: 'budget', render: (val) => val ? `${val?.toLocaleString()}€` : '-' }
  ];
  
  const productsColumns = [
    { title: 'Produit', dataIndex: 'name', key: 'name' },
    { title: 'SKU', dataIndex: 'sku', key: 'sku' },
    { title: 'Prix', dataIndex: 'price', key: 'price', render: (val) => `${val?.toLocaleString()}€` },
    { title: 'Stock', dataIndex: 'quantity', key: 'quantity', render: (qty) => <Badge status={qty < 10 ? 'error' : qty < 20 ? 'warning' : 'success'} text={Math.round(qty)} /> }
  ];
  
  const employeeColumns = [
    { title: 'Nom', key: 'name', render: (_, record) => `${record.first_name} ${record.last_name}` },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Poste', dataIndex: 'position', key: 'position' },
    { title: 'Département', dataIndex: 'department', key: 'department' }
  ];

  // Style de fond global
  const backgroundStyle = {
    background: isDarkMode ? COLORS.bgGradient : '#f0f2f5',
    minHeight: '100vh',
    padding: 24,
    transition: 'all 0.3s ease',
  };

  if (loading) {
    return (
      <div style={backgroundStyle}>
        <Skeleton active paragraph={{ rows: 1 }} />
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          {[1, 2, 3, 4].map(i => (
            <Col xs={24} sm={12} lg={6} key={i}>
              <Card style={{ background: isDarkMode ? COLORS.bgCard : 'white', borderRadius: 20 }}>
                <Skeleton active paragraph={{ rows: 2 }} />
              </Card>
            </Col>
          ))}
        </Row>
        <Skeleton active paragraph={{ rows: 6 }} style={{ marginTop: 24 }} />
      </div>
    );
  }

  return (
    <ConfigProvider theme={isDarkMode ? darkTheme : undefined}>
      <div className="enterprise-dashboard animate-fadeIn" style={backgroundStyle}>
        
        {/* Header amélioré */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: 16,
                  background: COLORS.gradientPrimary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: COLORS.glowPrimary,
                }}>
                  <DashboardOutlined style={{ fontSize: 24, color: 'white' }} />
                </div>
                <div>
                  <Title level={2} style={{ 
                    margin: 0, 
                    fontWeight: 800, 
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    color: isDarkMode ? COLORS.textPrimary : '#1a1a2e',
                    background: isDarkMode ? 'none' : 'linear-gradient(135deg, #6C5CE7, #00CEC9)',
                    WebkitBackgroundClip: isDarkMode ? 'none' : 'text',
                    WebkitTextFillColor: isDarkMode ? COLORS.textPrimary : 'transparent',
                  }}>
                    Enterprise Intelligence
                    <Tag color="gold" style={{ fontSize: 12, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #FDCB6E 0%, #F39C12 100%)', color: '#fff', verticalAlign: 'middle' }}>PRO</Tag>
                  </Title>
                  <Text style={{ color: isDarkMode ? COLORS.textSecondary : '#666', fontSize: 15, fontWeight: 500 }}>
                    Plateforme avancée de pilotage et performance d'entreprise
                  </Text>
                </div>
              </div>
            </div>
            
            <Space size="middle" wrap>
              {/* Bouton thème */}
              <Tooltip title={isDarkMode ? "Mode clair" : "Mode sombre"}>
                <Button
                  icon={isDarkMode ? <SunOutlined /> : <MoonOutlined />}
                  onClick={toggleTheme}
                  style={{
                    borderRadius: 12,
                    borderColor: isDarkMode ? COLORS.border : '#d9d9d9',
                    color: isDarkMode ? COLORS.textSecondary : '#666',
                    background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
                  }}
                />
              </Tooltip>
              
              <Tooltip title={discordConnected ? "Notifications Discord actives" : "Configurer Discord"}>
                <Card
                  size="small"
                  style={{
                    background: discordConnected ? COLORS.gradientDiscord : (isDarkMode ? 'rgba(255,255,255,0.05)' : '#f1f5f9'),
                    borderRadius: 12,
                    cursor: 'pointer',
                    border: discordConnected ? 'none' : (isDarkMode ? `1px solid ${COLORS.border}` : '1px solid #e2e8f0'),
                  }}
                  onClick={() => setWebhookModal(true)}
                >
                  <Space>
                    <DiscordOutlined style={{ fontSize: 20, color: discordConnected ? 'white' : COLORS.discord }} />
                    <Text style={{ color: discordConnected ? 'white' : (isDarkMode ? COLORS.textSecondary : '#64748b'), fontWeight: 500 }}>
                      {discordConnected ? 'Discord Connecté' : 'Configurer Discord'}
                    </Text>
                    {discordConnected && <Badge dot color="green" />}
                  </Space>
                </Card>
              </Tooltip>
              
              <Button
                icon={<ReloadOutlined spin={refreshing} />}
                onClick={refreshData}
                loading={refreshing}
                style={{
                  borderRadius: 12,
                  borderColor: isDarkMode ? COLORS.border : '#d9d9d9',
                  color: isDarkMode ? COLORS.textSecondary : '#666',
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
                }}
              >
                Actualiser
              </Button>
              
              <Button
                icon={<ExportOutlined />}
                onClick={exportData}
                style={{
                  borderRadius: 12,
                  borderColor: isDarkMode ? COLORS.border : '#d9d9d9',
                  color: isDarkMode ? COLORS.textSecondary : '#666',
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
                }}
              >
                Exporter
              </Button>
              
              <div className="notification-badge" onClick={() => setNotificationsDrawer(true)} style={{ cursor: 'pointer' }}>
                <Badge count={unreadCount + pendingOrdersCount} offset={[-5, 5]}>
                  <Button
                    icon={<BellOutlined />}
                    style={{
                      borderRadius: 12,
                      borderColor: (unreadCount + pendingOrdersCount) > 0 ? COLORS.primary : (isDarkMode ? COLORS.border : '#d9d9d9'),
                      color: (unreadCount + pendingOrdersCount) > 0 ? COLORS.primary : (isDarkMode ? COLORS.textSecondary : '#666'),
                      background: (unreadCount + pendingOrdersCount) > 0 ? `${COLORS.primary}15` : (isDarkMode ? 'rgba(255,255,255,0.05)' : 'white'),
                    }}
                  >
                    Notifications
                  </Button>
                </Badge>
                {pendingOrdersCount > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: COLORS.warning,
                    animation: 'pulse 2s infinite',
                  }} />
                )}
              </div>
            </Space>
          </div>
          
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <Text style={{ color: isDarkMode ? COLORS.textMuted : '#999', fontSize: 12 }}>
              <ClockCircleOutlined /> Dernière mise à jour : {dayjs(lastUpdate).format('DD/MM/YYYY HH:mm:ss')}
            </Text>
            <Space>
              <Tooltip title={soundEnabled ? "Son activé" : "Son désactivé"}>
                <Button
                  type="text"
                  icon={<SoundOutlined />}
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  style={{ color: soundEnabled ? COLORS.primary : (isDarkMode ? COLORS.textMuted : '#999') }}
                />
              </Tooltip>
              <Tag icon={<CrownFilled />} color="gold" style={{ 
                background: isDarkMode ? 'rgba(253, 203, 110, 0.15)' : '#fffbe6',
                border: isDarkMode ? '1px solid rgba(253, 203, 110, 0.3)' : '1px solid #ffe58f',
                color: isDarkMode ? COLORS.warning : '#d48806',
              }}>
                Enterprise Pro
              </Tag>
              {isDarkMode && (
                <Tag icon={<FireOutlined />} color="red" style={{ background: 'rgba(255, 107, 107, 0.15)', border: '1px solid rgba(255, 107, 107, 0.3)' }}>
                  Mode Sombre
                </Tag>
              )}
            </Space>
          </div>
        </div>
        
        {/* Statistiques rapides améliorées */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={8}>
            <Card style={{
              borderRadius: 16,
              background: isDarkMode ? 'rgba(0, 206, 201, 0.05)' : '#f0fdf4',
              border: isDarkMode ? '1px solid rgba(0, 206, 201, 0.15)' : '1px solid #bbf7d0',
            }}>
              <Statistic
                title={<span style={{ color: isDarkMode ? COLORS.textSecondary : '#666' }}>Commandes en attente</span>}
                value={pendingOrdersCount}
                prefix={<ShoppingOutlined style={{ color: COLORS.secondary }} />}
                valueStyle={{ color: COLORS.secondary }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={{
              borderRadius: 16,
              background: isDarkMode ? 'rgba(108, 92, 231, 0.05)' : '#eff6ff',
              border: isDarkMode ? '1px solid rgba(108, 92, 231, 0.15)' : '1px solid #bfdbfe',
            }}>
              <Statistic
                title={<span style={{ color: isDarkMode ? COLORS.textSecondary : '#666' }}>Factures en attente</span>}
                value={0}
                prefix={<FileTextOutlined style={{ color: COLORS.primary }} />}
                valueStyle={{ color: COLORS.primary }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card style={{
              borderRadius: 16,
              background: isDarkMode ? 'rgba(0, 184, 148, 0.05)' : '#ecfdf5',
              border: isDarkMode ? '1px solid rgba(0, 184, 148, 0.15)' : '1px solid #a7f3d0',
            }}>
              <Statistic
                title={<span style={{ color: isDarkMode ? COLORS.textSecondary : '#666' }}>Alertes stock</span>}
                value={0}
                prefix={<StockOutlined style={{ color: COLORS.success }} />}
                valueStyle={{ color: COLORS.success }}
              />
            </Card>
          </Col>
        </Row>
        
        {/* Tabs améliorés */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          style={{ marginBottom: 24 }}
          tabBarStyle={{
            borderBottom: isDarkMode ? `1px solid ${COLORS.border}` : '1px solid #f0f0f0',
            background: 'transparent',
          }}
          items={[
            { key: 'overview', label: <span><DashboardOutlined style={{ color: activeTab === 'overview' ? COLORS.primary : undefined }} /> Vue d'ensemble</span> },
            { key: 'orders', label: <span><ShoppingOutlined style={{ color: activeTab === 'orders' ? COLORS.primary : undefined }} /> Commandes</span> },
            { key: 'sales', label: <span><EuroOutlined style={{ color: activeTab === 'sales' ? COLORS.primary : undefined }} /> Ventes</span> },
            { key: 'invoices', label: <span><FileTextOutlined style={{ color: activeTab === 'invoices' ? COLORS.primary : undefined }} /> Factures</span> },
            { key: 'projects', label: <span><ProjectOutlined style={{ color: activeTab === 'projects' ? COLORS.primary : undefined }} /> Projets</span> },
            { key: 'products', label: <span><StockOutlined style={{ color: activeTab === 'products' ? COLORS.primary : undefined }} /> Stock</span> },
            { key: 'employees', label: <span><TeamOutlined style={{ color: activeTab === 'employees' ? COLORS.primary : undefined }} /> Employés</span> },
          ]}
        />
        
        {/* Vue d'ensemble */}
        {activeTab === 'overview' && (
          <>
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} lg={6}>
                <ExecutiveKpiCard
                  title="Chiffre d'affaires"
                  value={totalRevenue}
                  suffix="€"
                  icon={<EuroOutlined />}
                  color={COLORS.primary}
                  trend="up"
                  trendValue={12}
                  loading={loading}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <ExecutiveKpiCard
                  title="Employés"
                  value={employeesCount}
                  suffix=""
                  icon={<TeamOutlined />}
                  color={COLORS.success}
                  loading={loading}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <ExecutiveKpiCard
                  title="Projets actifs"
                  value={activeProjects}
                  suffix={`/ ${totalProjects}`}
                  icon={<ProjectOutlined />}
                  color={COLORS.secondary}
                  loading={loading}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <ExecutiveKpiCard
                  title="Valeur du stock"
                  value={0}
                  suffix="€"
                  icon={<EuroOutlined />}
                  color={COLORS.warning}
                  loading={loading}
                />
              </Col>
            </Row>
            
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card
                  title={<span style={{ color: isDarkMode ? COLORS.textPrimary : '#1a1a2e' }}>Commandes en attente</span>}
                  style={{
                    borderRadius: 20,
                    background: isDarkMode ? COLORS.bgCard : 'white',
                    border: isDarkMode ? `1px solid ${COLORS.border}` : '1px solid #f0f0f0',
                    backdropFilter: isDarkMode ? 'blur(10px)' : 'none',
                  }}
                  extra={<Button type="link" onClick={() => setActiveTab('orders')} style={{ color: COLORS.primary }}>Voir toutes</Button>}
                >
                  <Table
                    columns={salesColumns}
                    dataSource={discordNotifications.filter(n => n.type === 'order' && n.status === 'pending').slice(0, 5)}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    style={{ color: isDarkMode ? COLORS.textPrimary : '#1a1a2e' }}
                  />
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <Card
                  title={<span style={{ color: isDarkMode ? COLORS.textPrimary : '#1a1a2e' }}>Factures récentes</span>}
                  style={{
                    borderRadius: 20,
                    background: isDarkMode ? COLORS.bgCard : 'white',
                    border: isDarkMode ? `1px solid ${COLORS.border}` : '1px solid #f0f0f0',
                    backdropFilter: isDarkMode ? 'blur(10px)' : 'none',
                  }}
                  extra={<Button type="link" onClick={() => setActiveTab('invoices')} style={{ color: COLORS.primary }}>Voir toutes</Button>}
                >
                  <Table
                    columns={invoicesColumns}
                    dataSource={Array.isArray(invoices) ? invoices.slice(0, 5) : []}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    style={{ color: isDarkMode ? COLORS.textPrimary : '#1a1a2e' }}
                  />
                </Card>
              </Col>
            </Row>
          </>
        )}
        
        {/* Commandes */}
        {activeTab === 'orders' && (
          <Card
            title={<span style={{ color: isDarkMode ? COLORS.textPrimary : '#1a1a2e' }}>Gestion des commandes Discord</span>}
            style={{
              borderRadius: 20,
              background: isDarkMode ? COLORS.bgCard : 'white',
              border: isDarkMode ? `1px solid ${COLORS.border}` : '1px solid #f0f0f0',
              backdropFilter: isDarkMode ? 'blur(10px)' : 'none',
            }}
            extra={<Tag color={pendingOrdersCount > 0 ? 'warning' : 'success'}>{pendingOrdersCount} en attente</Tag>}
          >
            <Table
              columns={[
                { title: 'Commande', dataIndex: 'orderId', key: 'orderId' },
                { title: 'Client', dataIndex: 'customer', key: 'customer' },
                { title: 'Produit', dataIndex: 'product', key: 'product' },
                { title: 'Quantité', dataIndex: 'quantity', key: 'quantity' },
                { title: 'Montant', dataIndex: 'amount', key: 'amount', render: (val) => `${val}€` },
                { title: 'Date', dataIndex: 'timestamp', key: 'timestamp', render: (val) => dayjs(val).format('DD/MM/YYYY HH:mm') },
                { title: 'Statut', dataIndex: 'status', key: 'status', render: (status) => <Tag color={status === 'accepted' ? 'success' : status === 'rejected' ? 'error' : 'warning'}>{status || 'pending'}</Tag> },
                {
                  title: 'Actions',
                  key: 'actions',
                  render: (_, record) => record.status === 'pending' && (
                    <Space>
                      <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => handleAcceptOrder(record)} loading={processingOrder}>Accepter</Button>
                      <Button danger size="small" icon={<CloseOutlined />} onClick={() => handleRejectOrder(record)}>Rejeter</Button>
                    </Space>
                  )
                }
              ]}
              dataSource={discordNotifications.filter(n => n.type === 'order')}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              style={{ color: isDarkMode ? COLORS.textPrimary : '#1a1a2e' }}
            />
          </Card>
        )}
        
        {/* Ventes */}
        {activeTab === 'sales' && (
          <Card
            title={<span style={{ color: isDarkMode ? COLORS.textPrimary : '#1a1a2e' }}>Historique des ventes</span>}
            style={{
              borderRadius: 20,
              background: isDarkMode ? COLORS.bgCard : 'white',
              border: isDarkMode ? `1px solid ${COLORS.border}` : '1px solid #f0f0f0',
              backdropFilter: isDarkMode ? 'blur(10px)' : 'none',
            }}
          >
            <Table
              columns={salesColumns}
              dataSource={Array.isArray(salesOrders) ? salesOrders : []}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              style={{ color: isDarkMode ? COLORS.textPrimary : '#1a1a2e' }}
            />
          </Card>
        )}
        
        {/* Factures */}
        {activeTab === 'invoices' && (
          <Card
            title={<span style={{ color: isDarkMode ? COLORS.textPrimary : '#1a1a2e' }}>Gestion des factures</span>}
            style={{
              borderRadius: 20,
              background: isDarkMode ? COLORS.bgCard : 'white',
              border: isDarkMode ? `1px solid ${COLORS.border}` : '1px solid #f0f0f0',
              backdropFilter: isDarkMode ? 'blur(10px)' : 'none',
            }}
          >
            <Table
              columns={invoicesColumns}
              dataSource={Array.isArray(invoices) ? invoices : []}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              style={{ color: isDarkMode ? COLORS.textPrimary : '#1a1a2e' }}
            />
          </Card>
        )}
        
        {/* Projets */}
        {activeTab === 'projects' && (
          <Card
            title={<span style={{ color: isDarkMode ? COLORS.textPrimary : '#1a1a2e' }}>Gestion des projets</span>}
            style={{
              borderRadius: 20,
              background: isDarkMode ? COLORS.bgCard : 'white',
              border: isDarkMode ? `1px solid ${COLORS.border}` : '1px solid #f0f0f0',
              backdropFilter: isDarkMode ? 'blur(10px)' : 'none',
            }}
          >
            <Table
              columns={projectColumns}
              dataSource={Array.isArray(projects) ? projects : []}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              style={{ color: isDarkMode ? COLORS.textPrimary : '#1a1a2e' }}
            />
          </Card>
        )}
        
        {/* Stock */}
        {activeTab === 'products' && (
          <Card
            title={<span style={{ color: isDarkMode ? COLORS.textPrimary : '#1a1a2e' }}>Catalogue produits</span>}
            style={{
              borderRadius: 20,
              background: isDarkMode ? COLORS.bgCard : 'white',
              border: isDarkMode ? `1px solid ${COLORS.border}` : '1px solid #f0f0f0',
              backdropFilter: isDarkMode ? 'blur(10px)' : 'none',
            }}
          >
            <Table
              columns={productsColumns}
              dataSource={Array.isArray(products) ? products : []}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              style={{ color: isDarkMode ? COLORS.textPrimary : '#1a1a2e' }}
            />
          </Card>
        )}
        
        {/* Employés */}
        {activeTab === 'employees' && (
          <Card
            title={<span style={{ color: isDarkMode ? COLORS.textPrimary : '#1a1a2e' }}>Annuaire des employés</span>}
            style={{
              borderRadius: 20,
              background: isDarkMode ? COLORS.bgCard : 'white',
              border: isDarkMode ? `1px solid ${COLORS.border}` : '1px solid #f0f0f0',
              backdropFilter: isDarkMode ? 'blur(10px)' : 'none',
            }}
          >
            <Table
              columns={employeeColumns}
              dataSource={Array.isArray(employees) ? employees : []}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              style={{ color: isDarkMode ? COLORS.textPrimary : '#1a1a2e' }}
            />
          </Card>
        )}
        
        {/* Drawer Notifications amélioré */}
        <Drawer
          title={
            <Space>
              <DiscordOutlined style={{ color: COLORS.discord }} />
              <span style={{ color: isDarkMode ? COLORS.textPrimary : '#1a1a2e' }}>Notifications Discord</span>
              {pendingOrdersCount > 0 && <Tag color="warning">{pendingOrdersCount} commandes en attente</Tag>}
            </Space>
          }
          placement="right"
          onClose={() => setNotificationsDrawer(false)}
          open={notificationsDrawer}
          width={480}
          extra={<Button type="text" icon={<ClearOutlined />} onClick={clearNotifications} style={{ color: isDarkMode ? COLORS.textMuted : '#999' }}>Tout effacer</Button>}
          styles={{
            body: {
              background: isDarkMode ? COLORS.bgPrimary : '#f8fafc',
              padding: '16px 20px',
            },
            header: {
              background: isDarkMode ? COLORS.bgSecondary : 'white',
              borderBottom: isDarkMode ? `1px solid ${COLORS.border}` : '1px solid #f0f0f0',
            },
          }}
        >
          {discordNotifications.length === 0 ? (
            <Empty
              description={<span style={{ color: isDarkMode ? COLORS.textMuted : '#999' }}>Aucune notification</span>}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" icon={<DiscordOutlined />} onClick={() => setWebhookModal(true)}>Configurer Discord</Button>
            </Empty>
          ) : (
            <AnimatePresence>
              {discordNotifications.map(notif => (
                <DiscordNotificationCard
                  key={notif.id}
                  notification={notif}
                  onClose={() => removeNotification(notif)}
                  onAccept={handleAcceptOrder}
                  onReject={handleRejectOrder}
                  onClick={() => openOrderDetails(notif)}
                />
              ))}
            </AnimatePresence>
          )}
        </Drawer>
        
        {/* Modal Détails Commande amélioré */}
        <Modal
          title={
            <Space>
              <DiscordOutlined style={{ color: COLORS.discord }} />
              <span style={{ color: isDarkMode ? COLORS.textPrimary : '#1a1a2e' }}>Détails de la commande</span>
              {selectedOrderDetails?.orderId && <Tag color="blue">{selectedOrderDetails.orderId}</Tag>}
            </Space>
          }
          open={orderDetailsModal}
          onCancel={() => setOrderDetailsModal(false)}
          footer={[
            <Button key="close" onClick={() => setOrderDetailsModal(false)}>Fermer</Button>,
            selectedOrderDetails?.status === 'pending' && (
              <Button key="accept" type="primary" icon={<CheckOutlined />} onClick={() => {
                handleAcceptOrder(selectedOrderDetails);
                setOrderDetailsModal(false);
              }} style={{ background: COLORS.success }}>
                Accepter
              </Button>
            ),
            selectedOrderDetails?.status === 'pending' && (
              <Button key="reject" danger icon={<CloseOutlined />} onClick={() => {
                handleRejectOrder(selectedOrderDetails);
                setOrderDetailsModal(false);
              }}>
                Rejeter
              </Button>
            )
          ]}
          width={600}
          styles={{
            body: {
              background: isDarkMode ? COLORS.bgPrimary : '#f8fafc',
            },
            header: {
              background: isDarkMode ? COLORS.bgSecondary : 'white',
              borderBottom: isDarkMode ? `1px solid ${COLORS.border}` : '1px solid #f0f0f0',
            },
          }}
        >
          {selectedOrderDetails && (
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="N° Commande">
                <Tag color="blue">{selectedOrderDetails.orderId}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Client">
                <UserOutlined /> {selectedOrderDetails.customer || 'Client inconnu'}
              </Descriptions.Item>
              <Descriptions.Item label="Produit">
                <ShoppingOutlined /> {selectedOrderDetails.product || 'Non spécifié'}
              </Descriptions.Item>
              <Descriptions.Item label="Quantité">
                {selectedOrderDetails.quantity || 1} unité(s)
              </Descriptions.Item>
              <Descriptions.Item label="Montant">
                <Text strong style={{ color: COLORS.primary, fontSize: 16 }}>
                  {selectedOrderDetails.amount || 0} €
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Date">
                {dayjs(selectedOrderDetails.timestamp).format('DD/MM/YYYY HH:mm:ss')}
              </Descriptions.Item>
              <Descriptions.Item label="Statut">
                {selectedOrderDetails.status === 'pending' ? (
                  <Tag color="warning">En attente</Tag>
                ) : selectedOrderDetails.status === 'accepted' ? (
                  <Tag color="success">Acceptée</Tag>
                ) : (
                  <Tag color="error">Rejetée</Tag>
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Message">
                {selectedOrderDetails.message || 'Aucun message'}
              </Descriptions.Item>
            </Descriptions>
          )}
        </Modal>
        
        {/* Modal Configuration Discord amélioré */}
        <Modal
          title={<span style={{ color: isDarkMode ? COLORS.textPrimary : '#1a1a2e' }}>Configuration Discord</span>}
          open={webhookModal}
          onOk={saveDiscordConfig}
          onCancel={() => setWebhookModal(false)}
          width={500}
          styles={{
            body: {
              background: isDarkMode ? COLORS.bgPrimary : '#f8fafc',
            },
            header: {
              background: isDarkMode ? COLORS.bgSecondary : 'white',
              borderBottom: isDarkMode ? `1px solid ${COLORS.border}` : '1px solid #f0f0f0',
            },
          }}
        >
          <Form layout="vertical">
            <Form.Item label="Activer les notifications">
              <Switch checked={discordConnected} onChange={setDiscordConnected} />
            </Form.Item>
            <Form.Item label="URL du Webhook Discord" help="Créez un webhook dans votre serveur Discord et collez l'URL ici">
              <Input.TextArea
                value={webhookUrl}
                onChange={e => setWebhookUrl(e.target.value)}
                placeholder="https://discord.com/api/webhooks/..."
                rows={3}
                style={{
                  background: isDarkMode ? 'rgba(255,255,255,0.05)' : 'white',
                  borderColor: isDarkMode ? COLORS.border : '#d9d9d9',
                  color: isDarkMode ? COLORS.textPrimary : '#1a1a2e',
                }}
              />
            </Form.Item>
            <Form.Item>
              <Button icon={<SendOutlined />} onClick={testDiscordWebhook} disabled={!webhookUrl}>Tester la connexion</Button>
            </Form.Item>
          </Form>
          <Divider style={{ borderColor: isDarkMode ? COLORS.border : '#f0f0f0' }} />
          <Text style={{ color: isDarkMode ? COLORS.textMuted : '#999' }}>Notifications disponibles :</Text>
          <ul style={{ marginTop: 8, color: isDarkMode ? COLORS.textSecondary : '#666' }}>
            <li>📦 Nouvelles commandes</li>
            <li>🎫 Tickets support</li>
            <li>⚠️ Alertes stock critique</li>
            <li>💰 Paiements reçus</li>
          </ul>
        </Modal>
        
        {/* Actions flottantes améliorées */}
        <FloatButton.Group shape="circle" style={{ position: 'fixed', bottom: 24, right: 24 }}>
          <FloatButton icon={<SettingOutlined />} tooltip="Paramètres" />
          <FloatButton icon={<ExportOutlined />} tooltip="Exporter rapport" onClick={exportData} />
          <FloatButton icon={<RobotOutlined />} tooltip="Assistant IA" onClick={() => message.info('Assistant bientôt disponible')} />
          <FloatButton
            icon={<DiscordOutlined />}
            tooltip="Discord"
            type="primary"
            onClick={() => setWebhookModal(true)}
            badge={{ dot: discordConnected }}
            style={{ background: COLORS.gradientDiscord }}
          />
          <FloatButton.BackTop visibilityHeight={400} />
        </FloatButton.Group>
      </div>
      
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.8); }
            100% { opacity: 1; transform: scale(1); }
          }
          
          .premium-card-dark {
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          }
          
          .premium-card-dark:hover {
            border-color: rgba(255,255,255,0.15);
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          }
          
          .ant-tabs-tab {
            transition: all 0.3s ease;
          }
          
          .ant-tabs-tab:hover {
            color: ${COLORS.primary} !important;
          }
          
          .ant-tabs-tab-active {
            color: ${COLORS.primary} !important;
          }
          
          .ant-table {
            background: transparent !important;
          }
          
          .ant-table-thead > tr > th {
            background: ${isDarkMode ? 'rgba(255,255,255,0.03)' : '#fafafa'} !important;
            color: ${isDarkMode ? COLORS.textSecondary : '#666'} !important;
            border-bottom: ${isDarkMode ? `1px solid ${COLORS.border}` : '1px solid #f0f0f0'} !important;
          }
          
          .ant-table-tbody > tr > td {
            border-bottom: ${isDarkMode ? `1px solid ${COLORS.border}` : '1px solid #f0f0f0'} !important;
            color: ${isDarkMode ? COLORS.textPrimary : '#1a1a2e'} !important;
          }
          
          .ant-table-tbody > tr:hover > td {
            background: ${isDarkMode ? 'rgba(255,255,255,0.03)' : '#fafafa'} !important;
          }
          
          .ant-empty-description {
            color: ${isDarkMode ? COLORS.textMuted : '#999'} !important;
          }
          
          .ant-statistic-title {
            color: ${isDarkMode ? COLORS.textSecondary : '#666'} !important;
          }
          
          .ant-modal-content {
            background: ${isDarkMode ? COLORS.bgSecondary : 'white'} !important;
          }
          
          .ant-modal-header {
            background: ${isDarkMode ? COLORS.bgSecondary : 'white'} !important;
            border-bottom: ${isDarkMode ? `1px solid ${COLORS.border}` : '1px solid #f0f0f0'} !important;
          }
          
          .ant-drawer-header {
            background: ${isDarkMode ? COLORS.bgSecondary : 'white'} !important;
            border-bottom: ${isDarkMode ? `1px solid ${COLORS.border}` : '1px solid #f0f0f0'} !important;
          }
          
          .ant-drawer-body {
            background: ${isDarkMode ? COLORS.bgPrimary : '#f8fafc'} !important;
          }
          
          .ant-tag {
            background: ${isDarkMode ? 'rgba(255,255,255,0.05)' : '#fafafa'} !important;
            border-color: ${isDarkMode ? COLORS.border : '#e8e8e8'} !important;
            color: ${isDarkMode ? COLORS.textSecondary : '#666'} !important;
          }
        `}
      </style>
    </ConfigProvider>
  );
};

export default EnterpriseDashboard;