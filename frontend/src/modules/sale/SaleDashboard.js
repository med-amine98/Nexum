// src/modules/sales/SaleDashboard.js - Version professionnelle avec palette Corporate Trust
import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Statistic, Table, Button, Space, 
  Tag, Progress, Tabs, DatePicker, Select, Input,
  Badge, Tooltip, Modal, Form, message, Spin, Alert,
  Avatar, Divider, Switch, Typography, Empty, Descriptions,
  notification, Drawer, Steps, Popover, App
} from 'antd';
import { 
  ShoppingOutlined, DollarOutlined, RiseOutlined, CheckOutlined,
  FallOutlined, FileTextOutlined, PlusOutlined, CloseOutlined,
  DownloadOutlined, FilterOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  EyeOutlined, EditOutlined, DeleteOutlined,
  ReloadOutlined, UserOutlined,
  MailOutlined, PhoneOutlined, ThunderboltOutlined,
  StarOutlined, FireOutlined, TrophyOutlined,
  ClockCircleOutlined, HeartOutlined, DiscordOutlined,
  SoundOutlined, ClearOutlined, SendOutlined,
  BarChartOutlined, CalendarOutlined, TeamOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import api from '../../services/axiosConfig';
import ReportGenerator from '../../utils/reportGenerator';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// ============================================
// PALETTE "CORPORATE TRUST"
// ============================================

const COLORS = {
  primary: '#1a56db',
  primaryDark: '#1e3a5f',
  primaryLight: '#3b82f6',
  primaryLighter: '#93b5e8',
  primarySurface: '#e8edf5',
  slate: '#475569',
  slateLight: '#94a3b8',
  slateLighter: '#cbd5e1',
  slateSurface: '#f1f5f9',
  navy: '#0f172a',
  navyLight: '#1e293b',
  emerald: '#059669',
  emeraldLight: '#34d399',
  emeraldSurface: '#ecfdf5',
  red: '#dc2626',
  redLight: '#fca5a5',
  amber: '#d97706',
  amberLight: '#fbbf24',
  white: '#ffffff',
  gray50: '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1e293b',
  gray900: '#0f172a',
  discord: '#5865F2',
  discordSurface: '#eef2ff',
};

// ============================================
// CONFIGURATION DES STATUTS
// ============================================

const STATUS_CONFIG = {
  'brouillon': { 
    color: COLORS.gray400, 
    bg: COLORS.gray100,
    icon: <FileTextOutlined />, 
    label: 'Brouillon', 
    badgeColor: COLORS.gray400, 
    step: 0 
  },
  'en_attente': { 
    color: COLORS.amber, 
    bg: '#fef3c7',
    icon: <ClockCircleOutlined />, 
    label: 'En attente', 
    badgeColor: COLORS.amber, 
    step: 1 
  },
  'en_cours': { 
    color: COLORS.primary, 
    bg: COLORS.primarySurface,
    icon: <RiseOutlined />, 
    label: 'En cours', 
    badgeColor: COLORS.primary, 
    step: 2 
  },
  'termine': { 
    color: COLORS.emerald, 
    bg: COLORS.emeraldSurface,
    icon: <CheckCircleOutlined />, 
    label: 'Terminée', 
    badgeColor: COLORS.emerald, 
    step: 3 
  },
  'annulé': { 
    color: COLORS.red, 
    bg: '#fef2f2',
    icon: <CloseCircleOutlined />, 
    label: 'Annulée', 
    badgeColor: COLORS.red, 
    step: -1 
  }
};

// ============================================
// COMPOSANTS STYLISÉS
// ============================================

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['en_attente'];
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 12px',
      borderRadius: 20,
      background: config.bg,
      color: config.color,
      fontWeight: 500,
      fontSize: 13,
    }}>
      {config.icon}
      <span>{config.label}</span>
    </div>
  );
};

const KpiCard = ({ title, value, icon, trend, prefix, suffix, color }) => (
  <motion.div
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    style={{ height: '100%' }}
  >
    <Card
      style={{
        borderRadius: 16,
        border: `1px solid ${COLORS.gray200}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        height: '100%',
        transition: 'all 0.3s ease',
      }}
      bodyStyle={{ padding: '20px 24px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Text style={{ color: COLORS.slate, fontSize: 13, fontWeight: 500, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
            {title}
          </Text>
          <div style={{ 
            fontSize: 28, 
            fontWeight: 700, 
            color: COLORS.gray900,
            marginTop: 8,
            letterSpacing: '-0.5px'
          }}>
            {prefix && <span style={{ fontSize: 18, color: COLORS.slate, marginRight: 2 }}>{prefix}</span>}
            {typeof value === 'number' ? value.toLocaleString() : value}
            {suffix && <span style={{ fontSize: 16, color: COLORS.slate, marginLeft: 2 }}>{suffix}</span>}
          </div>
        </div>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: color || COLORS.primarySurface,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          color: color || COLORS.primary,
        }}>
          {icon}
        </div>
      </div>
      {trend !== undefined && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tag 
            color={trend >= 0 ? 'success' : 'error'} 
            style={{ 
              borderRadius: 12, 
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              margin: 0
            }}
          >
            {trend >= 0 ? <RiseOutlined /> : <FallOutlined />}
            {Math.abs(trend)}%
          </Tag>
          <Text style={{ color: COLORS.slateLight, fontSize: 12 }}>vs mois dernier</Text>
        </div>
      )}
    </Card>
  </motion.div>
);

// ============================================
// COMPOSANT NOTIFICATION DISCORD
// ============================================

const DiscordNotificationCard = ({ notification, onClose, onAccept, onReject }) => {
  const isPendingOrder = notification.type === 'order' && notification.status === 'pending';
  const isDiscordOrder = notification.created_from_discord || notification.source === 'discord';

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      style={{
        background: COLORS.white,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        border: `1px solid ${COLORS.gray200}`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        transition: 'all 0.2s ease',
      }}
      whileHover={{ borderColor: COLORS.discord }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ 
          width: 40, 
          height: 40, 
          borderRadius: 12, 
          background: COLORS.discord,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <DiscordOutlined style={{ color: COLORS.white, fontSize: 18 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ 
            fontWeight: 600, 
            fontSize: 14, 
            color: COLORS.gray900,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            {notification.title}
            {notification.status === 'pending' && (
              <Tag color="warning" style={{ borderRadius: 12, fontSize: 11, margin: 0 }}>En attente</Tag>
            )}
          </div>
          <Text style={{ fontSize: 13, color: COLORS.slate, marginTop: 4, display: 'block' }}>
            {notification.message}
          </Text>
          {notification.orderId && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              <Tag size="small" style={{ borderRadius: 12, background: COLORS.primarySurface, color: COLORS.primary, border: 'none' }}>
                N° {notification.orderId}
              </Tag>
              {notification.quantity && (
                <Tag size="small" style={{ borderRadius: 12, background: COLORS.emeraldSurface, color: COLORS.emerald, border: 'none' }}>
                  Qté: {notification.quantity}
                </Tag>
              )}
              {notification.amount && (
                <Tag size="small" style={{ borderRadius: 12, background: COLORS.gray100, color: COLORS.gray700, border: 'none' }}>
                  {(notification.amount).toFixed(2)} €
                </Tag>
              )}
            </div>
          )}
          <Text style={{ fontSize: 12, color: COLORS.slateLight, marginTop: 6, display: 'block' }}>
            {dayjs(notification.timestamp).fromNow()}
          </Text>
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          {isDiscordOrder && isPendingOrder && (
            <>
              <Tooltip title="Accepter la commande">
                <Button
                  type="primary"
                  shape="circle"
                  icon={<CheckOutlined />}
                  size="small"
                  style={{ background: COLORS.emerald, border: 'none' }}
                  onClick={() => onAccept && onAccept(notification)}
                />
              </Tooltip>
              <Tooltip title="Rejeter la commande">
                <Button
                  danger
                  shape="circle"
                  icon={<CloseOutlined />}
                  size="small"
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
              onClick={() => onClose && onClose(notification)}
              style={{ color: COLORS.slateLight }}
            />
          </Tooltip>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const SaleDashboardContent = () => {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [kpiData, setKpiData] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'days'), dayjs()]);
  const [searchText, setSearchText] = useState('');
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [discordNotifications, setDiscordNotifications] = useState([]);
  const [notificationsDrawer, setNotificationsDrawer] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [updateLoading, setUpdateLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [isClientModalVisible, setIsClientModalVisible] = useState(false);
  
  const [form] = Form.useForm();
  const [clientForm] = Form.useForm();
  
  const [products, setProducts] = useState([
    { id: 1, name: 'iPhone 15 Pro', price: 1299.00, icon: <StarOutlined /> },
    { id: 2, name: 'AirPods Pro', price: 279.00, icon: <ThunderboltOutlined /> },
    { id: 3, name: 'Chargeur MagSafe', price: 45.00, icon: <HeartOutlined /> },
    { id: 4, name: 'MacBook Pro', price: 2499.00, icon: <TrophyOutlined /> },
    { id: 5, name: 'iPad Air', price: 699.00, icon: <FireOutlined /> },
  ]);

  // WebSocket pour les notifications Discord
  useEffect(() => {
    const wsUrl = `ws://localhost:8000/ws/discord/1`;
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => console.log('✅ WebSocket Discord connecté');
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'discord_notification' || data.type === 'notification') {
          const notifData = data.data || data;
          const newNotif = {
            id: Date.now(),
            type: data.notification_type || notifData.type || 'order',
            title: notifData.title || '📦 Nouvelle commande Discord',
            message: notifData.message || '',
            orderId: notifData.orderId || data.orderId || notifData.order_id,
            product: notifData.product,
            quantity: notifData.quantity,
            customer: notifData.customer,
            amount: notifData.amount,
            status: 'pending',
            created_from_discord: true,
            source: 'discord',
            timestamp: new Date(),
            read: false
          };
          
          setDiscordNotifications(prev => [newNotif, ...prev].slice(0, 50));
          
          if (soundEnabled) {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => {});
          }
          
          notification.info({
            message: newNotif.title,
            description: `${newNotif.message} - Client: ${newNotif.customer || 'Inconnu'} - ${newNotif.amount || 0}€`,
            icon: <DiscordOutlined style={{ color: COLORS.discord }} />,
            placement: 'topRight',
            duration: 6,
          });
          
          setNewOrderAlert(newNotif);
          setTimeout(() => setNewOrderAlert(null), 8000);
          setTimeout(() => fetchData(), 1500);
        }
      } catch (e) {
        console.error('Erreur WebSocket:', e);
      }
    };
    
    ws.onerror = (error) => console.error('WebSocket error:', error);
    ws.onclose = () => console.log('WebSocket déconnecté');
    
    return () => ws.close();
  }, [soundEnabled]);

  // Effet pour recharger les données quand les filtres changent
  useEffect(() => {
    fetchData();
  }, [filterStatus, dateRange, searchText]);

  // ==================== GESTION DES COMMANDES ====================

  const updateOrderStatus = async (order, newStatus) => {
    setUpdateLoading(true);
    try {
      const config = STATUS_CONFIG[newStatus];
      
      // Mise à jour du statut
      await api.patch(`/sales/orders/${order.id}/status`, { status: newStatus });
      
      // Si la commande est terminée, créer la facture
      if (newStatus === 'termine') {
        try {
          const invoiceData = {
            order_id: order.id,
            order_number: order.name,
            customer_name: order.partner_name || order.customer || 'Client',
            amount: order.amount_total || 0,
            date: new Date().toISOString(),
            due_date: dayjs().add(30, 'day').format('YYYY-MM-DD'),
            status: 'pending',
            items: order.lines || []
          };
          
          await api.post('/accounting/invoices', invoiceData);
          
          // Notification Discord (avec gestion d'erreur)
          try {
            await api.post('/discord/notify', {
              type: 'invoice_ready',
              title: '📄 Nouvelle facture disponible',
              message: `La commande #${order.name} est terminée. Facture disponible.`,
              order_id: order.id,
              amount: order.amount_total || 0,
              enterprise_id: 1
            });
          } catch (discordError) {
            console.warn('Erreur notification Discord:', discordError);
            // Non bloquant
          }
          
          notification.success({
            message: 'Commande terminée',
            description: `La facture #${order.name} est disponible dans la comptabilité.`,
            placement: 'topRight',
            duration: 5,
            icon: <FileTextOutlined style={{ color: COLORS.emerald }} />
          });
        } catch (invoiceError) {
          console.error('Erreur création facture:', invoiceError);
          notification.warning({
            message: 'Commande terminée sans facture',
            description: `La commande #${order.name} est terminée mais la facture n'a pas pu être créée automatiquement.`,
            placement: 'topRight',
            duration: 5,
          });
        }
      } else {
        notification.info({
          message: 'Statut mis à jour',
          description: `Commande #${order.name} → ${config.label}`,
          placement: 'topRight',
          duration: 3
        });
      }
      
      message.success(`Statut : ${config.label}`);
      
      // ✅ Recharger les données pour mettre à jour le tableau et les KPIs
      await fetchData();
      setIsModalVisible(false);
      
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      message.error(error.response?.data?.detail || 'Erreur lors de la mise à jour du statut');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleStatusChange = (order, newStatus) => {
    Modal.confirm({
      title: 'Changer le statut',
      content: `Passer la commande #${order.name} en "${STATUS_CONFIG[newStatus]?.label || newStatus}" ?`,
      okText: 'Confirmer',
      cancelText: 'Annuler',
      onOk: () => updateOrderStatus(order, newStatus)
    });
  };

  const handleAcceptDiscordOrder = async (notification) => {
    try {
      message.loading({ content: 'Traitement...', key: 'orderProcessing', duration: 0 });
      
      await api.post('/orders/create', {
        order_id: notification.orderId,
        user_id: 'discord_user',
        username: notification.customer || 'Client Discord',
        product: notification.product,
        quantity: notification.quantity || 1,
        customer: notification.customer,
        address: 'Adresse à confirmer',
        phone: '',
        email: '',
        status: 'en_attente',
        date: new Date().toISOString(),
        source: 'discord',
        price: notification.amount ? notification.amount / (notification.quantity || 1) : 0,
        company_id: 1
      });
      
      try {
        await api.post('/discord/notify', {
          type: 'order_accepted',
          title: '✅ Commande acceptée',
          message: `Commande #${notification.orderId} acceptée`,
          order_id: notification.orderId,
          enterprise_id: 1
        });
      } catch (discordError) {
        console.warn('Erreur notification Discord:', discordError);
      }
      
      setDiscordNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, status: 'accepted', title: '✅ Acceptée' }
            : n
        )
      );
      
      message.success({ content: 'Commande acceptée !', key: 'orderProcessing', duration: 3 });
      await fetchData();
      
    } catch (error) {
      console.error('Erreur:', error);
      message.error({ content: 'Erreur lors de l\'acceptation', key: 'orderProcessing', duration: 3 });
    }
  };

  const handleRejectDiscordOrder = async (notification) => {
    Modal.confirm({
      title: 'Rejeter la commande',
      content: `Rejeter la commande #${notification.orderId} ?`,
      okText: 'Oui, rejeter',
      okType: 'danger',
      cancelText: 'Non',
      onOk: async () => {
        try {
          await api.post('/discord/notify', {
            type: 'order_rejected',
            title: '❌ Commande rejetée',
            message: `Commande #${notification.orderId} rejetée`,
            order_id: notification.orderId,
            enterprise_id: 1
          });
        } catch (discordError) {
          console.warn('Erreur notification Discord:', discordError);
        }
        
        setDiscordNotifications(prev =>
          prev.map(n =>
            n.id === notification.id
              ? { ...n, status: 'rejected', title: '❌ Rejetée' }
              : n
          )
        );
        
        message.warning(`Commande #${notification.orderId} rejetée`);
      }
    });
  };

  // ==================== CHARGEMENT DES DONNÉES ====================

  const fetchClients = async () => {
    setClientsLoading(true);
    try {
      const response = await api.get('/partners/customers');
      setClients(response.data || []);
    } catch (error) {
      console.error('❌ Erreur chargement clients:', error);
      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `${API_URL}/orders/sales-orders?`;
      const params = new URLSearchParams();
      
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (searchText) params.append('search', searchText);
      if (dateRange[0]) params.append('date_from', dateRange[0].format('YYYY-MM-DD'));
      if (dateRange[1]) params.append('date_to', dateRange[1].format('YYYY-MM-DD'));
      
      const queryString = params.toString();
      if (queryString) url += queryString;
      
      const [ordersRes, kpiRes] = await Promise.all([
        api.get(url.replace(API_URL, '')).catch(() => ({ data: [] })),
        api.get('/orders/sales-dashboard/kpi').catch(() => ({ data: [] }))
      ]);
      
      const ordersData = ordersRes.data || [];
      const ordersWithSource = ordersData.map(order => ({
        ...order,
        source: order.origin?.includes('discord') ? 'discord' : 'manual',
        created_from_discord: order.origin?.includes('discord') || order.created_from_discord || false,
        status: order.status || 'en_attente',
        amount_total: order.amount_total || 0
      }));
      
      setOrders(ordersWithSource);
      setKpiData(kpiRes.data || []);
      
      const newDiscordOrders = ordersWithSource.filter(o => 
        o.created_from_discord && 
        o.date_order && 
        new Date(o.date_order) > new Date(Date.now() - 60000)
      );
      
      if (newDiscordOrders.length > 0) {
        setNewOrderAlert({
          ...newDiscordOrders[0],
          type: 'order',
          status: 'pending',
          title: '📦 Nouvelle commande Discord',
          message: `Commande de ${newDiscordOrders[0].partner_name || newDiscordOrders[0].customer}`,
          amount: newDiscordOrders[0].amount_total || 0
        });
        setTimeout(() => setNewOrderAlert(null), 8000);
      }
    } catch (error) {
      console.error('❌ Erreur fetchData:', error);
      message.error('Erreur de chargement des données');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // ==================== GESTION DES COMMANDES ====================

  const handleCreateClient = async (values) => {
    try {
      const clientData = {
        name: values.name,
        email: values.email || null,
        phone: values.phone || null,
        address: values.address || null,
        city: values.city || null,
        country: values.country || 'France',
        is_customer: true,
        is_company: values.is_company || false
      };

      await api.post('/partners', clientData);
      message.success('Client créé avec succès');
      setIsClientModalVisible(false);
      clientForm.resetFields();
      await fetchClients();
    } catch (error) {
      console.error('Erreur création client:', error);
      message.error('Erreur lors de la création du client');
    }
  };

  const handleCreateOrder = async (values) => {
    try {
      if (!values.partner_id) {
        message.error('Veuillez sélectionner un client');
        return;
      }

      const validLines = (values.lines || []).filter(line => 
        line && line.product_id && line.quantity > 0 && line.price_unit > 0
      );

      if (validLines.length === 0) {
        message.error('Ajoutez au moins un article');
        return;
      }

      const orderData = {
        partner_id: values.partner_id,
        status: 'en_attente',
        lines: validLines.map(line => ({
          product_id: line.product_id,
          quantity: parseInt(line.quantity),
          price_unit: parseFloat(line.price_unit),
          description: products.find(p => p.id === line.product_id)?.name || 'Produit'
        }))
      };

      await api.post('/sales/orders', orderData);
      message.success('Commande créée avec succès');
      setIsCreateModalVisible(false);
      form.resetFields();
      await fetchData();
    } catch (error) {
      console.error('❌ Erreur création:', error);
      message.error(error.response?.data?.detail || 'Erreur lors de la création');
    }
  };

  const showOrderDetails = async (order) => {
    try {
      const response = await api.get(`/sales/orders/${order.id}`);
      setSelectedOrder({...response.data, status: response.data.status || order.status});
      setIsModalVisible(true);
    } catch (error) {
      setSelectedOrder(order);
      setIsModalVisible(true);
    }
  };

  const getStatusConfig = (status) => STATUS_CONFIG[status] || STATUS_CONFIG['en_attente'];

  const handleRefresh = () => fetchData();

  const handleExportPDF = () => {
    ReportGenerator.exportToPDF({
      title: 'Rapport des Ventes',
      filename: 'ventes_report',
      columns: [
        { title: 'Commande', dataIndex: 'name' },
        { title: 'Client', dataIndex: 'partner_name' },
        { title: 'Date', dataIndex: 'date_order' },
        { title: 'Total', dataIndex: 'amount_total' },
        { title: 'Statut', dataIndex: 'status' }
      ],
      data: orders,
      metadata: { company: 'Nexum ERP', user: 'Administrateur' }
    });
  };

  const handleExportExcel = () => {
    ReportGenerator.exportToExcel({
      filename: 'ventes_export',
      data: orders.map(o => ({
        ID: o.id,
        Commande: o.name,
        Client: o.partner_name,
        Date: o.date_order,
        Total: o.amount_total,
        Statut: o.status,
        Source: o.created_from_discord ? 'Discord' : 'Manuel'
      }))
    });
  };

  const clearDiscordNotifications = () => {
    setDiscordNotifications([]);
    message.success('Notifications effacées');
  };

  // ==================== CALCULS ====================

  const totalRevenue = orders.reduce((sum, o) => sum + (o.amount_total || 0), 0);
  const pendingCount = orders.filter(o => o.status === 'en_attente').length;
  const completedCount = orders.filter(o => o.status === 'termine').length;
  const discordCount = orders.filter(o => o.created_from_discord).length;
  const discordPendingCount = discordNotifications.filter(n => n.status === 'pending').length;

  // ==================== COLONNES TABLEAU ====================

  const columns = [
    { 
      title: 'N° Commande', 
      dataIndex: 'name', 
      key: 'name',
      width: 140,
      render: (text, record) => (
        <Space>
          <a 
            onClick={() => showOrderDetails(record)} 
            style={{ 
              color: COLORS.primary, 
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {text || record.order_id || 'N/A'}
          </a>
          {record.created_from_discord && (
            <Tooltip title="Créée automatiquement depuis Discord">
              <Tag icon={<DiscordOutlined />} color="#5865F2" style={{ borderRadius: 12, fontSize: 11 }}>
                Discord
              </Tag>
            </Tooltip>
          )}
        </Space>
      )
    },
    { 
      title: 'Client', 
      dataIndex: 'partner_name', 
      key: 'client',
      width: 180,
      render: (text, record) => (
        <Space>
          <Avatar 
            style={{ 
              backgroundColor: record.created_from_discord ? COLORS.discord : COLORS.primary,
              width: 32,
              height: 32,
            }}
          >
            {(text || record.customer || '?').charAt(0).toUpperCase()}
          </Avatar>
          <Text strong style={{ color: COLORS.gray800 }}>
            {text || record.customer || 'Client inconnu'}
          </Text>
        </Space>
      )
    },
    { 
      title: 'Date', 
      dataIndex: 'date_order', 
      key: 'date',
      width: 110,
      render: (text) => text ? dayjs(text).format('DD/MM/YYYY') : '-'
    },
    { 
      title: 'Montant', 
      dataIndex: 'amount_total', 
      key: 'amount',
      width: 120,
      render: (val) => (
        <Text strong style={{ color: COLORS.primary, fontSize: 15 }}>
          {(val || 0).toFixed(2)} €
        </Text>
      )
    },
    { 
      title: 'Statut', 
      dataIndex: 'status', 
      key: 'status',
      width: 160,
      render: (status, record) => {
        const config = getStatusConfig(status);
        
        return (
          <Select
            value={status || 'en_attente'}
            onChange={(newStatus) => handleStatusChange(record, newStatus)}
            style={{ width: 130 }}
            size="small"
            disabled={status === 'annulé' || status === 'termine'}
            popupClassName="status-select-dropdown"
            suffixIcon={<span style={{ color: config.color }}>{config.icon}</span>}
          >
            <Option value="en_attente">
              <StatusBadge status="en_attente" />
            </Option>
            <Option value="en_cours">
              <StatusBadge status="en_cours" />
            </Option>
            <Option value="termine">
              <StatusBadge status="termine" />
            </Option>
          </Select>
        );
      }
    },
    {
      title: 'Origine',
      key: 'origin',
      width: 90,
      render: (_, record) => (
        record.created_from_discord 
          ? <Tag icon={<DiscordOutlined />} color="#5865F2" style={{ borderRadius: 12 }}>Auto</Tag>
          : <Tag style={{ borderRadius: 12, background: COLORS.slateSurface, color: COLORS.slate, border: 'none' }}>Manuel</Tag>
      )
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, record) => (
        <Tooltip title="Voir les détails">
          <Button 
            type="text" 
            icon={<EyeOutlined />} 
            onClick={() => showOrderDetails(record)} 
            style={{ color: COLORS.primary }}
          />
        </Tooltip>
      ),
    },
  ];

  // ==================== RENDU ====================

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{ 
        padding: 24, 
        background: COLORS.slateSurface, 
        minHeight: '100vh',
      }}
    >
      {/* ========== ALERTE NOUVELLE COMMANDE ========== */}
      <AnimatePresence>
        {newOrderAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ marginBottom: 20 }}
          >
            <Alert
              message={
                <Space size="middle">
                  <div style={{ 
                    width: 36, 
                    height: 36, 
                    background: COLORS.discord, 
                    borderRadius: 10, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <DiscordOutlined style={{ color: COLORS.white, fontSize: 18 }} />
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 15, color: COLORS.gray900 }}>
                      Nouvelle commande Discord
                    </Text>
                    <Text style={{ display: 'block', fontSize: 13, color: COLORS.slate }}>
                      Commande #{newOrderAlert.orderId || newOrderAlert.name} - {newOrderAlert.customer || newOrderAlert.partner_name || 'Inconnu'}
                    </Text>
                  </div>
                </Space>
              }
              type="success"
              showIcon={false}
              closable
              onClose={() => setNewOrderAlert(null)}
              style={{ 
                borderRadius: 16, 
                background: COLORS.white, 
                border: `1px solid ${COLORS.gray200}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              }}
              action={
                <Space>
                  <Button 
                    size="middle" 
                    type="primary" 
                    icon={<CheckOutlined />} 
                    onClick={() => handleAcceptDiscordOrder(newOrderAlert)}
                    style={{ 
                      background: COLORS.emerald, 
                      border: 'none',
                      borderRadius: 10,
                    }}
                  >
                    Accepter
                  </Button>
                  <Button 
                    size="middle" 
                    danger 
                    icon={<CloseOutlined />} 
                    onClick={() => handleRejectDiscordOrder(newOrderAlert)}
                    style={{ borderRadius: 10 }}
                  >
                    Rejeter
                  </Button>
                </Space>
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== EN-TÊTE ========== */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 28,
          padding: '20px 28px',
          background: COLORS.white,
          borderRadius: 20,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          border: `1px solid ${COLORS.gray200}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ 
            width: 52, 
            height: 52, 
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.navy})`,
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(26,86,219,0.25)',
          }}>
            <ShoppingOutlined style={{ fontSize: 26, color: COLORS.white }} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: COLORS.gray900, fontWeight: 700 }}>
              Gestion des Ventes
            </Title>
            <Text style={{ color: COLORS.slate, fontSize: 14 }}>
              Gérez vos commandes et suivez leur progression
            </Text>
          </div>
        </div>
        <Space size="middle" wrap>
          <Badge dot={discordPendingCount > 0} offset={[-5, 5]} color={COLORS.discord}>
            <Button 
              icon={<DiscordOutlined />} 
              onClick={() => setNotificationsDrawer(true)}
              style={{ 
                borderRadius: 12, 
                borderColor: COLORS.gray200,
                color: COLORS.discord,
                fontWeight: 500,
              }}
            >
              Discord {discordPendingCount > 0 && `(${discordPendingCount})`}
            </Button>
          </Badge>
          <Tooltip title={soundEnabled ? "Notifications sonores activées" : "Notifications sonores désactivées"}>
            <Button 
              type="text" 
              icon={<SoundOutlined />} 
              onClick={() => setSoundEnabled(!soundEnabled)}
              style={{ 
                color: soundEnabled ? COLORS.primary : COLORS.slateLight,
                fontSize: 18,
              }}
            />
          </Tooltip>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={handleRefresh} 
            loading={loading}
            style={{ borderRadius: 12 }}
          >
            Actualiser
          </Button>
          <Button 
            icon={<DownloadOutlined />} 
            onClick={handleExportPDF}
            style={{ borderRadius: 12 }}
          >
            PDF
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalVisible(true)}
            style={{ 
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, 
              border: 'none',
              borderRadius: 12,
              boxShadow: '0 4px 12px rgba(26,86,219,0.3)',
            }}
          >
            Nouvelle commande
          </Button>
        </Space>
      </motion.div>

      {/* ========== FILTRES ========== */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Card 
          style={{ 
            marginBottom: 24, 
            borderRadius: 16, 
            border: `1px solid ${COLORS.gray200}`, 
            background: COLORS.white,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
          bodyStyle={{ padding: '16px 20px' }}
        >
          <Row gutter={[16, 12]} align="middle">
            <Col xs={24} md={7}>
              <Search 
                placeholder="Rechercher une commande..." 
                allowClear 
                enterButton={<FilterOutlined />}
                onSearch={setSearchText}
                onChange={(e) => !e.target.value && setSearchText('')}
                style={{ borderRadius: 10 }}
              />
            </Col>
            <Col xs={12} md={5}>
              <Select 
                value={filterStatus}
                style={{ width: '100%', borderRadius: 10 }}
                onChange={setFilterStatus}
                allowClear
                placeholder="Statut"
              >
                <Option value="all">Tous les statuts</Option>
                <Option value="en_attente">En attente</Option>
                <Option value="en_cours">En cours</Option>
                <Option value="termine">Terminée</Option>
                <Option value="annulé">Annulée</Option>
              </Select>
            </Col>
            <Col xs={12} md={8}>
              <RangePicker 
                style={{ width: '100%', borderRadius: 10 }}
                value={dateRange}
                onChange={setDateRange}
                format="DD/MM/YYYY"
                placeholder={['Date début', 'Date fin']}
              />
            </Col>
            <Col xs={24} md={4} style={{ textAlign: 'right' }}>
              <Button 
                type="link" 
                onClick={() => {
                  setFilterStatus('all');
                  setDateRange([dayjs().subtract(30, 'days'), dayjs()]);
                  setSearchText('');
                  fetchData();
                }}
                style={{ color: COLORS.primary }}
              >
                Réinitialiser
              </Button>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* ========== KPIS ========== */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Chiffre d'affaires"
            value={totalRevenue}
            prefix="€"
            icon={<DollarOutlined />}
            trend={12}
            color={COLORS.primary}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Commandes"
            value={orders.length}
            icon={<ShoppingOutlined />}
            trend={8}
            color={COLORS.slate}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="En attente"
            value={pendingCount}
            icon={<ClockCircleOutlined />}
            trend={-3}
            color={COLORS.amber}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <KpiCard
            title="Terminées"
            value={completedCount}
            icon={<CheckCircleOutlined />}
            trend={15}
            color={COLORS.emerald}
          />
        </Col>
      </Row>

      {/* ========== TABLEAU DES COMMANDES ========== */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <Card 
          title={
            <Space size="middle">
              <div style={{ 
                width: 36, 
                height: 36, 
                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <FileTextOutlined style={{ color: COLORS.white, fontSize: 16 }} />
              </div>
              <span style={{ fontWeight: 600, color: COLORS.gray800, fontSize: 16 }}>
                Commandes
              </span>
              <Tag style={{ borderRadius: 20, background: COLORS.slateSurface, color: COLORS.slate, border: 'none' }}>
                {orders.length}
              </Tag>
            </Space>
          }
          extra={
            <Tabs 
              activeKey={activeTab}
              size="small" 
              onChange={(key) => {
                setActiveTab(key);
                if (key === 'all') {
                  setFilterStatus('all');
                } else {
                  setFilterStatus(key);
                }
                // ✅ Le rechargement est déclenché par l'effet useEffect
              }}
              style={{ margin: 0 }}
          items={[
            {
              key: 'all',
              label: <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#000000' }}><EyeOutlined /> Toutes</span>
            },
            {
              key: 'en_attente',
              label: <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#000000' }}><ClockCircleOutlined /> En attente</span>
            },
            {
              key: 'en_cours',
              label: <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#000000' }}><RiseOutlined /> En cours</span>
            },
            {
              key: 'termine',
              label: <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#000000' }}><CheckCircleOutlined /> Terminées</span>
            }
          ]}
        />
          }
          style={{ 
            borderRadius: 16, 
            border: `1px solid ${COLORS.gray200}`, 
            background: COLORS.white,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <Spin spinning={loading}>
            {orders.length === 0 ? (
              <Empty 
                description={
                  <div>
                    <Text style={{ color: COLORS.slate }}>Aucune commande trouvée</Text>
                    <br />
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />} 
                      onClick={() => setIsCreateModalVisible(true)}
                      style={{ marginTop: 12, borderRadius: 10 }}
                    >
                      Créer une commande
                    </Button>
                  </div>
                }
                style={{ padding: '40px 0' }}
              />
            ) : (
              <Table 
                columns={columns} 
                dataSource={orders}
                rowKey="id"
                pagination={{ 
                  pageSize: 10, 
                  showSizeChanger: true,
                  showTotal: (total) => `${total} commande${total > 1 ? 's' : ''}`,
                  pageSizeOptions: ['10', '20', '50', '100'],
                  size: 'default',
                }}
                scroll={{ x: 1000 }}
                size="middle"
                style={{ borderRadius: 12 }}
                rowClassName={(record) => 
                  record.created_from_discord ? 'discord-row' : ''
                }
              />
            )}
          </Spin>
        </Card>
      </motion.div>

      {/* ========== DRAWER NOTIFICATIONS DISCORD ========== */}
      <Drawer
        title={
          <Space size="middle">
            <DiscordOutlined style={{ color: COLORS.discord, fontSize: 22 }} />
            <span style={{ fontWeight: 600, fontSize: 16, color: COLORS.gray900 }}>
              Notifications Discord
            </span>
            {discordPendingCount > 0 && (
              <Tag color="warning" style={{ borderRadius: 20 }}>
                {discordPendingCount} en attente
              </Tag>
            )}
          </Space>
        }
        placement="right"
        onClose={() => setNotificationsDrawer(false)}
        open={notificationsDrawer}
        width={460}
        extra={
          <Space>
            <Button 
              type="text" 
              icon={<ClearOutlined />} 
              onClick={clearDiscordNotifications}
              style={{ color: COLORS.slate }}
            >
              Effacer tout
            </Button>
            <Button 
              type="primary" 
              onClick={() => {
                const pending = discordNotifications.filter(n => n.status === 'pending');
                if (pending.length === 0) {
                  message.info('Aucune commande en attente');
                } else {
                  pending.forEach(n => handleAcceptDiscordOrder(n));
                }
              }}
              style={{ 
                background: COLORS.emerald, 
                border: 'none',
                borderRadius: 10,
              }}
              disabled={discordPendingCount === 0}
            >
              Tout accepter
            </Button>
          </Space>
        }
        style={{ borderRadius: '20px 0 0 20px' }}
      >
        {discordNotifications.length === 0 ? (
          <Empty 
            description={
              <Text style={{ color: COLORS.slate }}>
                Aucune notification Discord
              </Text>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ marginTop: 40 }}
          />
        ) : (
          <div style={{ paddingTop: 8 }}>
            <AnimatePresence>
              {discordNotifications.map(notif => (
                <DiscordNotificationCard 
                  key={notif.id} 
                  notification={notif} 
                  onClose={() => setDiscordNotifications(prev => prev.filter(n => n.id !== notif.id))}
                  onAccept={handleAcceptDiscordOrder}
                  onReject={handleRejectDiscordOrder}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </Drawer>

      {/* ========== MODAL CRÉATION COMMANDE ========== */}
      <Modal
        title={
          <Space size="middle">
            <div style={{ 
              width: 32, 
              height: 32, 
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, 
              borderRadius: 10, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <PlusOutlined style={{ color: COLORS.white, fontSize: 16 }} />
            </div>
            <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Nouvelle commande</span>
          </Space>
        }
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          form.resetFields();
        }}
        width={880}
        footer={null}
        destroyOnClose
        style={{ borderRadius: 20 }}
        bodyStyle={{ paddingTop: 8 }}
      >
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={handleCreateOrder} 
          initialValues={{ lines: [{}] }}
        >
          {/* Section Client */}
          <Card 
            title={
              <Space>
                <UserOutlined style={{ color: COLORS.primary }} />
                <span style={{ color: COLORS.gray800 }}>Informations client</span>
                <Tag color="error" style={{ borderRadius: 20, fontSize: 11 }}>Requis</Tag>
              </Space>
            }
            style={{ 
              marginBottom: 20, 
              background: COLORS.gray50, 
              borderRadius: 14, 
              border: `1px solid ${COLORS.gray200}`,
            }}
            size="small"
            headStyle={{ borderBottom: `1px solid ${COLORS.gray200}` }}
          >
            <Row gutter={16}>
              <Col span={18}>
                <Form.Item 
                  name="partner_id" 
                  label="Sélectionner un client" 
                  rules={[{ required: true, message: 'Veuillez sélectionner un client' }]}
                >
                  <Select 
                    placeholder="Rechercher un client..."
                    showSearch
                    optionFilterProp="children"
                    loading={clientsLoading}
                    style={{ borderRadius: 10 }}
                    notFoundContent={clientsLoading ? <Spin size="small" /> : "Aucun client trouvé"}
                    suffixIcon={<UserOutlined style={{ color: COLORS.slateLight }} />}
                  >
                    {(clients || []).map(client => (
                      <Option key={client.id} value={client.id}>
                        <Space>
                          <Avatar size="small" style={{ backgroundColor: COLORS.primary }}>
                            {client.name.charAt(0).toUpperCase()}
                          </Avatar>
                          <div>
                            <Text strong style={{ color: COLORS.gray800 }}>{client.name}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {client.email || client.city || 'Aucune info'}
                            </Text>
                          </div>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={6}>
                <Button 
                  type="dashed" 
                  icon={<PlusOutlined />} 
                  onClick={() => setIsClientModalVisible(true)}
                  style={{ marginTop: 30, borderRadius: 10 }}
                  block
                >
                  Nouveau client
                </Button>
              </Col>
            </Row>
          </Card>

          <Divider style={{ margin: '8px 0 16px', color: COLORS.slateLight }}>
            Articles commandés
          </Divider>

          {/* Liste des articles */}
          <Form.List name="lines">
            {(fields, { add, remove }) => (
              <>
                {fields.length === 0 && (
                  <Alert 
                    message="Aucun article" 
                    description="Cliquez sur 'Ajouter un produit' pour ajouter des articles" 
                    type="info" 
                    showIcon 
                    style={{ marginBottom: 16, borderRadius: 12 }}
                  />
                )}
                
                <AnimatePresence>
                  {fields.map(({ key, name, ...restField }) => (
                    <motion.div 
                      key={key} 
                      initial={{ opacity: 0, y: -10 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      exit={{ opacity: 0, y: -10 }}
                    >
                      <Card 
                        size="small" 
                        style={{ 
                          marginBottom: 12, 
                          background: COLORS.gray50, 
                          borderRadius: 12, 
                          border: `1px solid ${COLORS.gray200}`,
                        }}
                      >
                        <Row gutter={12}>
                          <Col span={10}>
                            <Form.Item 
                              {...restField} 
                              name={[name, 'product_id']} 
                              label="Produit" 
                              rules={[{ required: true, message: 'Sélectionnez un produit' }]}
                              style={{ marginBottom: 8 }}
                            >
                              <Select placeholder="Sélectionner..." style={{ borderRadius: 10 }}>
                                {products.map(p => (
                                  <Option key={p.id} value={p.id}>
                                    <Space>
                                      <span style={{ color: COLORS.primary }}>{p.icon}</span>
                                      <span style={{ color: COLORS.gray800 }}>{p.name}</span>
                                      <span style={{ color: COLORS.slate, fontSize: 13 }}>{p.price.toFixed(2)} €</span>
                                    </Space>
                                  </Option>
                                ))}
                              </Select>
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Form.Item 
                              {...restField} 
                              name={[name, 'quantity']} 
                              label="Qté" 
                              rules={[{ required: true, message: 'Quantité requise' }]}
                              style={{ marginBottom: 8 }}
                            >
                              <Input 
                                type="number" 
                                min={1} 
                                step={1} 
                                style={{ borderRadius: 10 }} 
                                placeholder="1"
                              />
                            </Form.Item>
                          </Col>
                          <Col span={8}>
                            <Form.Item 
                              {...restField} 
                              name={[name, 'price_unit']} 
                              label="Prix unitaire (€)" 
                              rules={[{ required: true, message: 'Prix requis' }]}
                              style={{ marginBottom: 8 }}
                            >
                              <Input 
                                type="number" 
                                min={0} 
                                step={0.01} 
                                prefix="€" 
                                style={{ borderRadius: 10 }} 
                                placeholder="0.00"
                              />
                            </Form.Item>
                          </Col>
                          <Col span={2} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                            <Button 
                              type="text" 
                              danger 
                              icon={<DeleteOutlined />} 
                              onClick={() => remove(name)} 
                              disabled={fields.length === 1}
                              style={{ marginBottom: 8 }}
                            />
                          </Col>
                        </Row>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>

                <Button 
                  type="dashed" 
                  onClick={() => add()} 
                  block 
                  icon={<PlusOutlined />} 
                  style={{ 
                    marginBottom: 20, 
                    borderRadius: 10,
                    borderColor: COLORS.primary,
                    color: COLORS.primary,
                  }}
                >
                  Ajouter un produit
                </Button>
              </>
            )}
          </Form.List>

          <Form.Item style={{ marginTop: 8, marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button 
                onClick={() => {
                  setIsCreateModalVisible(false);
                  form.resetFields();
                }} 
                size="large" 
                style={{ borderRadius: 10 }}
              >
                Annuler
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large" 
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, 
                  border: 'none', 
                  borderRadius: 10,
                  padding: '0 40px',
                  boxShadow: '0 4px 12px rgba(26,86,219,0.3)',
                }}
              >
                Créer la commande
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* ========== MODAL CRÉATION CLIENT ========== */}
      <Modal
        title={
          <Space size="middle">
            <div style={{ 
              width: 32, 
              height: 32, 
              background: `linear-gradient(135deg, ${COLORS.emerald}, ${COLORS.primary})`, 
              borderRadius: 10, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <UserOutlined style={{ color: COLORS.white, fontSize: 16 }} />
            </div>
            <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Nouveau client</span>
          </Space>
        }
        open={isClientModalVisible}
        onCancel={() => {
          setIsClientModalVisible(false);
          clientForm.resetFields();
        }}
        width={650}
        footer={null}
        destroyOnClose
        style={{ borderRadius: 20 }}
      >
        <Form form={clientForm} layout="vertical" onFinish={handleCreateClient}>
          <Card 
            title="Informations client" 
            size="small" 
            style={{ 
              marginBottom: 16, 
              borderRadius: 14, 
              border: `1px solid ${COLORS.gray200}`,
              background: COLORS.gray50,
            }}
            headStyle={{ borderBottom: `1px solid ${COLORS.gray200}` }}
          >
            <Row gutter={16}>
              <Col span={16}>
                <Form.Item 
                  name="name" 
                  label="Nom du client" 
                  rules={[{ required: true, message: 'Veuillez saisir un nom' }]}
                >
                  <Input placeholder="Ex: Jean Dupont" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="is_company" label="Type" valuePropName="checked">
                  <Switch checkedChildren="Société" unCheckedChildren="Particulier" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="email" label="Email">
                  <Input prefix={<MailOutlined style={{ color: COLORS.slateLight }} />} placeholder="client@exemple.fr" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="phone" label="Téléphone">
                  <Input prefix={<PhoneOutlined style={{ color: COLORS.slateLight }} />} placeholder="01 23 45 67 89" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="address" label="Adresse">
              <Input placeholder="Adresse complète" style={{ borderRadius: 10 }} />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="city" label="Ville">
                  <Input placeholder="Paris" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="country" label="Pays" initialValue="France">
                  <Input placeholder="France" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>
          <Form.Item style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button onClick={() => setIsClientModalVisible(false)} size="large" style={{ borderRadius: 10 }}>
                Annuler
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large" 
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS.emerald}, ${COLORS.primary})`, 
                  border: 'none', 
                  borderRadius: 10,
                  padding: '0 32px',
                }}
              >
                Créer le client
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* ========== MODAL DÉTAILS COMMANDE ========== */}
      <Modal
        title={
          <Space size="middle">
            <div style={{ 
              width: 32, 
              height: 32, 
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, 
              borderRadius: 10, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <EyeOutlined style={{ color: COLORS.white, fontSize: 16 }} />
            </div>
            <span style={{ color: COLORS.gray800, fontWeight: 600 }}>
              Détails de la commande
            </span>
            {selectedOrder?.name && (
              <Tag color="primary" style={{ borderRadius: 20 }}>
                #{selectedOrder.name}
              </Tag>
            )}
            {selectedOrder?.created_from_discord && (
              <Tag icon={<DiscordOutlined />} color="#5865F2" style={{ borderRadius: 20 }}>
                Discord
              </Tag>
            )}
          </Space>
        }
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setSelectedOrder(null);
        }}
        width={750}
        footer={[
          <Button key="back" onClick={() => setIsModalVisible(false)} style={{ borderRadius: 10 }}>
            Fermer
          </Button>,
          selectedOrder?.status !== 'termine' && selectedOrder?.status !== 'annulé' && (
            <Button 
              key="update" 
              type="primary" 
              icon={<SendOutlined />}
              onClick={() => {
                const nextStatus = selectedOrder?.status === 'en_attente' ? 'en_cours' : 
                                  selectedOrder?.status === 'en_cours' ? 'termine' : 'en_attente';
                updateOrderStatus(selectedOrder, nextStatus);
              }}
              loading={updateLoading}
              style={{ 
                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, 
                border: 'none', 
                borderRadius: 10 
              }}
            >
              {selectedOrder?.status === 'en_attente' ? 'Lancer la commande' : 
               selectedOrder?.status === 'en_cours' ? 'Terminer la commande' : 'Mettre à jour'}
            </Button>
          )
        ]}
        style={{ borderRadius: 20 }}
      >
        {selectedOrder && (
          <div>
            <Descriptions 
              bordered 
              column={2} 
              size="middle"
              style={{ borderRadius: 12 }}
              labelStyle={{ 
                background: COLORS.gray50, 
                color: COLORS.slate,
                fontWeight: 500,
              }}
            >
              <Descriptions.Item label="N° Commande" span={1}>
                <Text strong style={{ color: COLORS.primary }}>
                  {selectedOrder.name || selectedOrder.order_id}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Statut" span={1}>
                <StatusBadge status={selectedOrder.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Client" span={1}>
                <Space>
                  <UserOutlined style={{ color: COLORS.slate }} />
                  <Text>{selectedOrder.partner_name || selectedOrder.customer || 'N/A'}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Date" span={1}>
                <CalendarOutlined style={{ marginRight: 6, color: COLORS.slate }} />
                {dayjs(selectedOrder.date_order).format('DD/MM/YYYY à HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Montant total" span={2}>
                <Text strong style={{ color: COLORS.primary, fontSize: 18 }}>
                  {(selectedOrder.amount_total || 0).toFixed(2)} €
                </Text>
              </Descriptions.Item>
            </Descriptions>
            
            <Divider orientation="left" style={{ marginTop: 20, marginBottom: 16 }}>
              <Space>
                <ShoppingOutlined style={{ color: COLORS.primary }} />
                <span style={{ color: COLORS.gray800 }}>Lignes de commande</span>
              </Space>
            </Divider>
            
            <Table
              size="middle"
              columns={[
                { 
                  title: 'Produit', 
                  dataIndex: 'description', 
                  key: 'description',
                  render: (text) => <Text>{text || 'Produit'}</Text>
                },
                { 
                  title: 'Qté', 
                  dataIndex: 'quantity', 
                  key: 'quantity', 
                  align: 'center',
                  render: (val) => <Tag style={{ borderRadius: 20 }}>{val || 0}</Tag>
                },
                { 
                  title: 'Prix unitaire', 
                  dataIndex: 'price_unit', 
                  key: 'price_unit', 
                  render: (val) => `${(val || 0).toFixed(2)} €`, 
                  align: 'right' 
                },
                { 
                  title: 'Total', 
                  dataIndex: 'price_subtotal', 
                  key: 'price_subtotal', 
                  render: (val) => (
                    <Text strong style={{ color: COLORS.primary }}>
                      {(val || 0).toFixed(2)} €
                    </Text>
                  ), 
                  align: 'right' 
                },
              ]}
              dataSource={selectedOrder.lines || []}
              pagination={false}
              rowKey={(record, index) => record.id || `line-${index}`}
              style={{ borderRadius: 12 }}
              locale={{ emptyText: 'Aucune ligne de commande' }}
            />
            
            {selectedOrder.status === 'termine' && (
              <Alert
                message="Commande terminée"
                description="Cette commande est terminée. La facture a été générée et est disponible dans le module Comptabilité."
                type="success"
                showIcon
                icon={<FileTextOutlined />}
                style={{ marginTop: 16, borderRadius: 12 }}
                action={
                  <Button 
                    size="small" 
                    type="link" 
                    onClick={() => window.location.href = '/accounting'}
                    style={{ color: COLORS.primary }}
                  >
                    Voir la facture
                  </Button>
                }
              />
            )}
          </div>
        )}
      </Modal>

      {/* Styles CSS globaux */}
      <style jsx="true">{`
        .discord-row {
          background: ${COLORS.discordSurface} !important;
        }
        .discord-row:hover {
          background: #e0e7ff !important;
        }
        .ant-table-row {
          transition: background 0.2s ease;
        }
        .ant-table-row:hover {
          background: ${COLORS.gray50} !important;
        }
        .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: ${COLORS.primary} !important;
        }
        .ant-tabs-ink-bar {
          background: ${COLORS.primary} !important;
        }
        .ant-table-thead > tr > th {
          color: #000000 !important;
          font-weight: 600 !important;
        }
        .ant-table-thead > tr > th .ant-table-column-title {
          color: #000000 !important;
        }
        .status-select-dropdown .ant-select-item-option-content {
          padding: 4px 0;
        }
      `}</style>
    </motion.div>
  );
};

// ============================================
// COMPOSANT PRINCIPAL AVEC APP CONTEXT
// ============================================

const SaleDashboard = () => {
  return (
    <App>
      <SaleDashboardContent />
    </App>
  );
};

export default SaleDashboard;