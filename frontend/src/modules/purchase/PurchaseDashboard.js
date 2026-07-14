// src/modules/purchases/PurchaseDashboard.js - Version professionnelle avec palette Corporate Trust
import React, { useState, useEffect } from 'react';
import './PurchaseDashboard.css';
import { 
  Card, Row, Col, Statistic, Table, Button, Space, 
  Tag, Progress, DatePicker, Select, Input,
  Badge, Tooltip, Modal, Form, message, Spin,
  Avatar, Divider, Switch, Alert, Typography, Empty,
  Descriptions, Popover
} from 'antd';
import { 
  ShoppingCartOutlined, DollarOutlined, RiseOutlined, 
  FallOutlined, FileTextOutlined, PlusOutlined,
  DownloadOutlined, FilterOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  EyeOutlined, DeleteOutlined,
  TruckOutlined, ClockCircleOutlined, ReloadOutlined,
  UserOutlined, MailOutlined,
  PhoneOutlined, StarOutlined, ThunderboltOutlined,
  FireOutlined, TrophyOutlined, HeartOutlined,
  CalendarOutlined, GlobalOutlined, TrendingUpOutlined,
  WalletOutlined, TeamOutlined, LoadingOutlined,
  SendOutlined, ExclamationCircleOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import api from '../../services/api';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;
const { Search } = Input;
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// ============================================
// PALETTE "CORPORATE TRUST" - Cohérente avec Sales
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
  sky: '#0ea5e9',
  skyLight: '#7dd3fc',
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
};

// ============================================
// CONFIGURATION DES STATUTS (Adapté aux modèles backend)
// ============================================

const STATUS_CONFIG = {
  // Statuts backend: draft, sent, confirmed, received, cancelled
  'draft': { 
    color: COLORS.gray400, 
    bg: COLORS.gray100,
    icon: <FileTextOutlined />, 
    label: 'Brouillon',
    badgeColor: COLORS.gray400,
    step: 0,
    nextStatus: 'sent'
  },
  'sent': { 
    color: COLORS.sky, 
    bg: '#e0f2fe',
    icon: <SendOutlined />, 
    label: 'Envoyé',
    badgeColor: COLORS.sky,
    step: 1,
    nextStatus: 'confirmed'
  },
  'confirmed': { 
    color: COLORS.primary, 
    bg: COLORS.primarySurface,
    icon: <CheckCircleOutlined />, 
    label: 'Confirmé',
    badgeColor: COLORS.primary,
    step: 2,
    nextStatus: 'received'
  },
  'received': { 
    color: COLORS.emerald, 
    bg: COLORS.emeraldSurface,
    icon: <CheckCircleOutlined />, 
    label: 'Reçu',
    badgeColor: COLORS.emerald,
    step: 3,
    nextStatus: null
  },
  'cancelled': { 
    color: COLORS.red, 
    bg: '#fef2f2',
    icon: <CloseCircleOutlined />, 
    label: 'Annulé',
    badgeColor: COLORS.red,
    step: -1,
    nextStatus: null
  },
};

// Configurations de livraison
const DELIVERY_CONFIG = {
  'delivered': { status: 'success', text: '✓ Livré', color: COLORS.emerald, bg: COLORS.emeraldSurface },
  'partial': { status: 'warning', text: '⚠ Partiel', color: COLORS.amber, bg: '#fef3c7' },
  'not_delivered': { status: 'error', text: '✗ Non livré', color: COLORS.red, bg: '#fef2f2' },
};

// ============================================
// COMPOSANTS STYLISÉS
// ============================================

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG['draft'];
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 14px',
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

const DeliveryBadge = ({ status }) => {
  const config = DELIVERY_CONFIG[status];
  if (!config) return <Badge status="default" text="-" />;
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
      fontSize: 12,
    }}>
      <span>{config.text}</span>
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
// COMPOSANT PRINCIPAL
// ============================================

const PurchaseDashboard = () => {
  // États
  const [loading, setLoading] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [kpiData, setKpiData] = useState([]);
  const [supplierStats, setSupplierStats] = useState([]);
  
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isSupplierModalVisible, setIsSupplierModalVisible] = useState(false);
  const [selectedPO, setSelectedPO] = useState(null);
  
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSupplier, setFilterSupplier] = useState('all');
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'days'), dayjs()]);
  const [searchText, setSearchText] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  
  const [form] = Form.useForm();
  const [supplierForm] = Form.useForm();

  // Données initiales des KPI
  const defaultKpis = [
    { title: 'Total achats', value: 0, trend: 12.5, color: COLORS.primary, prefix: '€', icon: <WalletOutlined /> },
    { title: 'Commandes en cours', value: 0, trend: 8.2, color: COLORS.emerald, icon: <ShoppingCartOutlined /> },
    { title: 'Délai moyen', value: 0, trend: -5.4, color: COLORS.sky, icon: <ClockCircleOutlined />, suffix: 'j' },
    { title: 'Fournisseurs actifs', value: 0, trend: 3.1, color: COLORS.slate, icon: <TruckOutlined /> }
  ];

  // ===== FONCTIONS API =====
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterSupplier !== 'all') params.supplier_id = filterSupplier;
      if (dateRange[0]) params.date_from = dateRange[0].format('YYYY-MM-DD');
      if (dateRange[1]) params.date_to = dateRange[1].format('YYYY-MM-DD');
      if (searchText) params.search = searchText;
      
      
      const ordersRes = await api.get('/purchases/orders', { params });
      
      // Extraire les données correctement
      let ordersData = [];
      if (ordersRes.data && ordersRes.data.success === true) {
        ordersData = ordersRes.data.data || [];
      } else if (Array.isArray(ordersRes.data)) {
        ordersData = ordersRes.data;
      } else {
        ordersData = ordersRes.data?.data || [];
      }
      
      const adaptedOrders = ordersData.map(order => ({
        ...order,
        lines: (order.lines || []).map(line => ({
          ...line,
          quantity_invoiced: line.quantity_invoiced || 0,
          quantity_received: line.quantity_received || 0,
        }))
      }));
      setPurchaseOrders(adaptedOrders);

      await fetchSuppliers();

      try {
        const kpiRes = await api.get('/purchases/dashboard/kpi');
        setKpiData(kpiRes.data?.data || kpiRes.data || defaultKpis);
      } catch (kpiError) {
        console.warn('⚠️ Erreur chargement KPI, utilisation des valeurs par défaut:', kpiError);
        setKpiData(defaultKpis);
      }

      try {
        const statsRes = await api.get('/purchases/dashboard/supplier-stats');
        setSupplierStats(statsRes.data?.data || statsRes.data || []);
      } catch (statsError) {
        console.warn('⚠️ Erreur chargement statistiques fournisseurs:', statsError);
        setSupplierStats([]);
      }
    } catch (error) {
      console.error('❌ Erreur fetchData:', error);
      message.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    setSuppliersLoading(true);
    try {
      const response = await api.get('/purchases/suppliers');
      
      let suppliersData = [];
      if (response.data && response.data.success === true) {
        suppliersData = response.data.data || [];
      } else if (Array.isArray(response.data)) {
        suppliersData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        suppliersData = response.data.data;
      } else {
        suppliersData = [];
        console.warn('⚠️ Format de réponse inattendu:', response.data);
      }
      
      const finalSuppliers = Array.isArray(suppliersData) ? suppliersData : [];
      setSuppliers(finalSuppliers);
      
    } catch (error) {
      console.error('❌ Erreur fetchSuppliers:', error);
      setSuppliers([]);
    } finally {
      setSuppliersLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (isCreateModalVisible) {
      fetchSuppliers();
      form.setFieldsValue({ lines: [{ description: '', quantity: 1, price_unit: 0 }] });
    }
  }, [isCreateModalVisible]);

  const applyFilters = () => fetchData();

  // ===== GESTION DES FOURNISSEURS =====
  const handleCreateSupplier = async (values) => {
    try {
      const supplierData = {
        name: values.name,
        code: values.code || '',
        email: values.email || '',
        phone: values.phone || '',
        address: values.address || '',
        city: values.city || '',
        country: values.country || 'France',
        contact_name: values.contact_name || '',
        contact_email: values.contact_email || '',
        contact_phone: values.contact_phone || '',
        is_preferred: values.is_preferred || false
      };

      
      const response = await api.post('/purchases/suppliers', supplierData);

      if (response.data && response.data.success === true) {
        message.success('Fournisseur créé avec succès');
        setIsSupplierModalVisible(false);
        supplierForm.resetFields();
        await fetchSuppliers();
        await fetchData();
      } else {
        message.error(response.data?.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('❌ Erreur création fournisseur:', error);
      message.error(error.response?.data?.error || 'Erreur lors de la création du fournisseur');
    }
  };

  // ===== GESTION DES COMMANDES =====
  const handleCreateOrder = async (values) => {
    try {
      if (!values.supplier_id) {
        message.error('Veuillez sélectionner un fournisseur');
        return;
      }

      const validLines = (values.lines || []).filter(line => 
        line && line.description && line.description.trim() !== '' && 
        parseFloat(line.quantity) > 0 && 
        parseFloat(line.price_unit) > 0
      );

      if (validLines.length === 0) {
        message.error('Aucune ligne de commande valide');
        return;
      }

      const orderData = {
        supplier_id: parseInt(values.supplier_id),
        lines: validLines.map(line => ({
          description: line.description.trim(),
          quantity: parseFloat(line.quantity) || 1,
          price_unit: parseFloat(line.price_unit) || 0,
          product_id: line.product_id ? parseInt(line.product_id) : null,
        }))
      };

      if (values.expected_date) orderData.expected_date = values.expected_date.toISOString();
      if (values.reference) orderData.reference = values.reference.trim();
      if (values.notes) orderData.notes = values.notes.trim();


      await api.post('/purchases/orders', orderData);
      message.success('Commande créée avec succès');
      setIsCreateModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      console.error('❌ Erreur création commande:', error);
      message.error('Erreur lors de la création de la commande');
    }
  };

  // ===== GESTION DES STATUTS =====
  const updateOrderStatus = async (orderId, newStatus) => {
    setUpdateLoading(true);
    try {
      
      const response = await api.patch(`/purchases/orders/${orderId}/status`, { status: newStatus });
      
      if (response.data && response.data.success) {
        message.success(`Statut mis à jour: ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
        await fetchData();
        setIsModalVisible(false);
      } else {
        message.error(response.data?.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('❌ Erreur mise à jour statut:', error);
      message.error(error.response?.data?.error || 'Erreur lors de la mise à jour du statut');
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
      onOk: () => updateOrderStatus(order.id, newStatus)
    });
  };

  const showPODetails = async (po) => {
    try {
      const response = await api.get(`/purchases/orders/${po.id}`);
      setSelectedPO(response.data);
      setIsModalVisible(true);
    } catch (error) {
      console.error('❌ Erreur chargement détails:', error);
      message.error('Erreur lors du chargement des détails');
    }
  };

  const displayKpis = kpiData.length > 0 ? kpiData : defaultKpis;
  const totalOrders = purchaseOrders.length;
  
  // Calcul des statistiques avec les nouveaux statuts
  const draftOrders = purchaseOrders.filter(o => o.status === 'draft').length;
  const sentOrders = purchaseOrders.filter(o => o.status === 'sent').length;
  const confirmedOrders = purchaseOrders.filter(o => o.status === 'confirmed').length;
  const receivedOrders = purchaseOrders.filter(o => o.status === 'received').length;
  const cancelledOrders = purchaseOrders.filter(o => o.status === 'cancelled').length;

  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];

  // ===== RENDU =====

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{ 
        padding: 24, 
        background: COLORS.slateSurface, 
        minHeight: '100vh' 
      }}
    >
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
            <ShoppingCartOutlined style={{ fontSize: 26, color: COLORS.white }} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: COLORS.gray900, fontWeight: 700 }}>
              Gestion des Achats
            </Title>
            <Text style={{ color: COLORS.slate, fontSize: 14 }}>
              Gérez vos commandes fournisseurs et approvisionnements
            </Text>
          </div>
        </div>
        <Space size="middle" wrap>
          <Tooltip title="Actualiser">
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchData}
              loading={loading}
              style={{ borderRadius: 12 }}
            >
              Actualiser
            </Button>
          </Tooltip>
          <Tooltip title="Exporter les données">
            <Button 
              icon={<DownloadOutlined />} 
              onClick={() => message.info('Export en cours de développement')}
              style={{ borderRadius: 12 }}
            >
              Exporter
            </Button>
          </Tooltip>
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

      {/* ========== KPIS ========== */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={6}>
            <KpiCard
              title="Total achats"
              value={purchaseOrders.reduce((sum, o) => sum + (o.amount_total || 0), 0)}
              prefix="€"
              icon={<WalletOutlined />}
              trend={12.5}
              color={COLORS.primary}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <KpiCard
              title="Commandes"
              value={totalOrders}
              icon={<ShoppingCartOutlined />}
              trend={8.2}
              color={COLORS.primary}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <KpiCard
              title="En cours"
              value={confirmedOrders + sentOrders}
              icon={<ClockCircleOutlined />}
              trend={-3.2}
              color={COLORS.amber}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <KpiCard
              title="Reçues"
              value={receivedOrders}
              icon={<CheckCircleOutlined />}
              trend={15.3}
              color={COLORS.emerald}
            />
          </Col>
        </Row>
      </motion.div>

      {/* ========== FILTRES ========== */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
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
            <Col xs={24} md={6}>
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
                placeholder="Fournisseur"
                value={filterSupplier}
                onChange={setFilterSupplier}
                style={{ width: '100%', borderRadius: 10 }}
                loading={suppliersLoading}
                allowClear
                suffixIcon={<TruckOutlined style={{ color: COLORS.slateLight }} />}
              >
                <Option value="all">Tous les fournisseurs</Option>
                {safeSuppliers.map(s => (
                  <Option key={s.id} value={s.id}>
                    <Space>
                      <Avatar size="small" style={{ backgroundColor: COLORS.primary }}>
                        {s.name ? s.name.charAt(0).toUpperCase() : '?'}
                      </Avatar>
                      {s.name || 'Fournisseur inconnu'}
                    </Space>
                  </Option>
                ))}
              </Select>
            </Col>
            <Col xs={12} md={4}>
              <Select 
                placeholder="Statut"
                value={filterStatus}
                onChange={setFilterStatus}
                style={{ width: '100%', borderRadius: 10 }}
                allowClear
              >
                <Option value="all">Tous les statuts</Option>
                <Option value="draft">Brouillon</Option>
                <Option value="sent">Envoyé</Option>
                <Option value="confirmed">Confirmé</Option>
                <Option value="received">Reçu</Option>
                <Option value="cancelled">Annulé</Option>
              </Select>
            </Col>
            <Col xs={24} md={6}>
              <RangePicker 
                style={{ width: '100%', borderRadius: 10 }}
                value={dateRange}
                onChange={setDateRange}
                format="DD/MM/YYYY"
                placeholder={['Date début', 'Date fin']}
              />
            </Col>
            <Col xs={24} md={3}>
              <Button 
                type="primary"
                icon={<FilterOutlined />} 
                onClick={applyFilters} 
                block
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, 
                  border: 'none',
                  borderRadius: 10,
                }}
              >
                Appliquer
              </Button>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* ========== STATISTIQUES FOURNISSEURS ========== */}
      {supplierStats.length > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <div style={{ marginBottom: 24 }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 12, 
              marginBottom: 16 
            }}>
              <div style={{
                width: 32,
                height: 32,
                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <TeamOutlined style={{ color: COLORS.white, fontSize: 16 }} />
              </div>
              <Title level={4} style={{ margin: 0, color: COLORS.gray800 }}>
                Performances fournisseurs
              </Title>
              <Tag style={{ borderRadius: 20, background: COLORS.slateSurface, color: COLORS.slate, border: 'none' }}>
                {supplierStats.length} actifs
              </Tag>
            </div>
            <Row gutter={[16, 16]}>
              {supplierStats.slice(0, 8).map((stat, index) => {
                const percent = stat.total > 0 ? Math.min(100, Math.round((stat.total / 50000) * 100)) : 0;
                return (
                  <Col xs={12} sm={8} md={4} lg={3} key={index}>
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -4 }}
                    >
                      <Card 
                        size="small" 
                        hoverable 
                        style={{ 
                          borderRadius: 16, 
                          textAlign: 'center', 
                          height: '100%',
                          border: `1px solid ${COLORS.gray200}`,
                          transition: 'all 0.3s ease',
                        }}
                      >
                        <Progress
                          type="circle"
                          percent={percent}
                          width={70}
                          strokeColor={percent > 50 ? COLORS.emerald : percent > 20 ? COLORS.amber : COLORS.primary}
                          format={(p) => (
                            <div>
                              <Text strong style={{ fontSize: 14, color: percent > 0 ? COLORS.emerald : COLORS.slateLight }}>
                                {p}%
                              </Text>
                              <br />
                              <Text type="secondary" style={{ fontSize: 9, color: COLORS.slateLight }}>atteint</Text>
                            </div>
                          )}
                        />
                        <div style={{ marginTop: 10 }}>
                          <Tooltip title={stat.name}>
                            <Text strong style={{ 
                              fontSize: 13, 
                              display: 'block', 
                              whiteSpace: 'nowrap', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              color: COLORS.primary 
                            }}>
                              {stat.name?.length > 15 ? stat.name.substring(0, 15) + '...' : stat.name}
                            </Text>
                          </Tooltip>
                          <Text type="secondary" style={{ fontSize: 11, color: COLORS.slate }}>
                            {stat.count || 0} commandes
                          </Text>
                          <div>
                            <Text strong style={{ color: COLORS.primary, fontSize: 13 }}>
                              {(stat.total || 0).toLocaleString()} €
                            </Text>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  </Col>
                );
              })}
            </Row>
          </div>
        </motion.div>
      )}

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
                <ShoppingCartOutlined style={{ color: COLORS.white, fontSize: 16 }} />
              </div>
              <span style={{ fontWeight: 600, color: COLORS.gray800, fontSize: 16 }}>
                Commandes fournisseurs
              </span>
              <Tag style={{ borderRadius: 20, background: COLORS.slateSurface, color: COLORS.slate, border: 'none' }}>
                {totalOrders}
              </Tag>
            </Space>
          }
          extra={
            <Space size="middle">
              <Badge status="default" text={<span style={{ color: COLORS.gray400 }}>Brouillon</span>} />
              <Badge status="processing" text={<span style={{ color: COLORS.sky }}>Envoyé</span>} />
              <Badge status="processing" text={<span style={{ color: COLORS.primary }}>Confirmé</span>} />
              <Badge status="success" text={<span style={{ color: COLORS.emerald }}>Reçu</span>} />
              <Badge status="error" text={<span style={{ color: COLORS.red }}>Annulé</span>} />
            </Space>
          }
          style={{ 
            borderRadius: 16, 
            border: `1px solid ${COLORS.gray200}`, 
            background: COLORS.white,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <Spin spinning={loading}>
            {purchaseOrders.length === 0 ? (
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
                columns={[
                  { 
                    title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>N° Commande</span>, 
                    dataIndex: 'name', 
                    key: 'name',
                    width: 150,
                    fixed: 'left',
                    render: (text, record) => (
                      <a 
                        onClick={() => showPODetails(record)} 
                        style={{ 
                          color: COLORS.primary, 
                          fontWeight: 600,
                          fontSize: 14,
                        }}
                      >
                        {text || `PO-${record.id}`}
                      </a>
                    )
                  },
                  { 
                    title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Fournisseur</span>, 
                    dataIndex: 'supplier_name', 
                    key: 'supplier',
                    width: 200,
                    render: (text, record) => {
                      const supplierName = text || record.supplier?.name || 'Non assigné';
                      return (
                        <Space>
                          <Avatar 
                            size="small" 
                            style={{ backgroundColor: COLORS.primary }}
                          >
                            {supplierName.charAt(0).toUpperCase()}
                          </Avatar>
                          <div>
                            <Text strong style={{ 
                              color: supplierName === 'Non assigné' ? COLORS.slateLight : COLORS.gray800 
                            }}>
                              {supplierName}
                            </Text>
                            {record.supplier_code && (
                              <div>
                                <Text type="secondary" style={{ fontSize: 11, color: COLORS.slateLight }}>
                                  Code: {record.supplier_code}
                                </Text>
                              </div>
                            )}
                          </div>
                        </Space>
                      );
                    }
                  },
                  { 
                    title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Date</span>, 
                    dataIndex: 'date_order', 
                    key: 'date',
                    width: 110,
                    render: (text) => text ? dayjs(text).format('DD/MM/YYYY') : '-'
                  },
                  { 
                    title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Montant</span>, 
                    dataIndex: 'amount_total', 
                    key: 'amount',
                    width: 130,
                    align: 'right',
                    render: (val) => (
                      <Text strong style={{ color: COLORS.primary, fontSize: 15 }}>
                        {val && val > 0 ? `${Number(val).toFixed(2)} €` : '0,00 €'}
                      </Text>
                    )
                  },
                  { 
                    title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Statut</span>, 
                    dataIndex: 'status', 
                    key: 'status',
                    width: 160,
                    render: (status, record) => {
                      const config = STATUS_CONFIG[status] || STATUS_CONFIG['draft'];
                      const statusOptions = ['draft', 'sent', 'confirmed', 'received', 'cancelled'];
                      const availableStatuses = statusOptions.filter(s => s !== 'cancelled' && s !== 'received');
                      
                      // Si le statut est 'received' ou 'cancelled', afficher en lecture seule
                      if (status === 'received' || status === 'cancelled') {
                        return <StatusBadge status={status} />;
                      }
                      
                      return (
                        <Select
                          value={status || 'draft'}
                          onChange={(newStatus) => handleStatusChange(record, newStatus)}
                          style={{ width: 130 }}
                          size="small"
                          suffixIcon={<span style={{ color: config.color }}>{config.icon}</span>}
                          dropdownStyle={{ borderRadius: 12 }}
                        >
                          <Option value="draft">
                            <StatusBadge status="draft" />
                          </Option>
                          <Option value="sent">
                            <StatusBadge status="sent" />
                          </Option>
                          <Option value="confirmed">
                            <StatusBadge status="confirmed" />
                          </Option>
                          <Option value="received">
                            <StatusBadge status="received" />
                          </Option>
                          <Option value="cancelled">
                            <StatusBadge status="cancelled" />
                          </Option>
                        </Select>
                      );
                    }
                  },
                  { 
                    title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Livraison</span>, 
                    dataIndex: 'delivery_status', 
                    key: 'delivery',
                    width: 120,
                    render: (delivery) => <DeliveryBadge status={delivery} />
                  },
                  {
                    title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Actions</span>,
                    key: 'actions',
                    width: 130,
                    fixed: 'right',
                    render: (_, record) => (
                      <Space size="small">
                        <Tooltip title="Voir détails">
                          <Button 
                            type="text" 
                            icon={<EyeOutlined />} 
                            onClick={() => showPODetails(record)} 
                            style={{ color: COLORS.primary }}
                          />
                        </Tooltip>
                        {record.status === 'draft' && (
                          <Tooltip title="Envoyer la commande">
                            <Button 
                              type="text" 
                              icon={<SendOutlined style={{ color: COLORS.sky }} />} 
                              onClick={() => updateOrderStatus(record.id, 'sent')} 
                            />
                          </Tooltip>
                        )}
                        {record.status === 'sent' && (
                          <Tooltip title="Confirmer la commande">
                            <Button 
                              type="text" 
                              icon={<CheckCircleOutlined style={{ color: COLORS.primary }} />} 
                              onClick={() => updateOrderStatus(record.id, 'confirmed')} 
                            />
                          </Tooltip>
                        )}
                        {record.status === 'confirmed' && record.delivery_status !== 'delivered' && (
                          <Tooltip title="Réceptionner la marchandise">
                            <Button 
                              type="text" 
                              icon={<TruckOutlined style={{ color: COLORS.emerald }} />} 
                              onClick={() => updateOrderStatus(record.id, 'received')} 
                            />
                          </Tooltip>
                        )}
                        {(record.status === 'draft' || record.status === 'sent') && (
                          <Tooltip title="Annuler la commande">
                            <Button 
                              type="text" 
                              danger
                              icon={<CloseCircleOutlined />} 
                              onClick={() => {
                                Modal.confirm({
                                  title: 'Annuler la commande',
                                  content: `Voulez-vous vraiment annuler la commande #${record.name} ?`,
                                  okText: 'Oui, annuler',
                                  okType: 'danger',
                                  cancelText: 'Non',
                                  onOk: () => updateOrderStatus(record.id, 'cancelled')
                                });
                              }} 
                            />
                          </Tooltip>
                        )}
                      </Space>
                    ),
                  },
                ]} 
                dataSource={purchaseOrders}
                rowKey="id"
                pagination={{ 
                  pageSize: 10, 
                  showSizeChanger: true, 
                  showTotal: (total) => (
                    <span style={{ color: COLORS.slate }}>
                      📊 Total: {total} commande{total > 1 ? 's' : ''}
                    </span>
                  ),
                  pageSizeOptions: ['10', '20', '50'],
                  showQuickJumper: true
                }}
                scroll={{ x: 1200 }}
                size="middle"
                style={{ borderRadius: 12 }}
                rowClassName={(record) => {
                  if (record.delivery_status === 'partial') return 'row-partial';
                  if (record.status === 'received') return 'row-received';
                  if (record.status === 'cancelled') return 'row-cancelled';
                  return '';
                }}
              />
            )}
          </Spin>
        </Card>
      </motion.div>

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
            <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Nouvelle commande fournisseur</span>
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
          {/* Section Fournisseur */}
          <Card 
            title={
              <Space>
                <TruckOutlined style={{ color: COLORS.primary }} />
                <span style={{ color: COLORS.gray800 }}>Fournisseur</span>
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
                  name="supplier_id" 
                  label="Sélectionner un fournisseur" 
                  rules={[{ required: true, message: 'Veuillez sélectionner un fournisseur' }]}
                >
                  <Select 
                    placeholder="Rechercher un fournisseur..."
                    showSearch
                    optionFilterProp="children"
                    loading={suppliersLoading}
                    style={{ borderRadius: 10 }}
                    suffixIcon={<TruckOutlined style={{ color: COLORS.slateLight }} />}
                    notFoundContent={suppliersLoading ? <Spin size="small" /> : "Aucun fournisseur trouvé"}
                  >
                    {safeSuppliers.map(supplier => (
                      <Option key={supplier.id} value={supplier.id}>
                        <Space>
                          <Avatar size="small" style={{ backgroundColor: COLORS.primary }}>
                            {supplier.name ? supplier.name.charAt(0).toUpperCase() : '?'}
                          </Avatar>
                          <div>
                            <Text strong style={{ color: COLORS.gray800 }}>{supplier.name || 'Inconnu'}</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              {supplier.email || supplier.city || 'Aucune info'}
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
                  onClick={() => setIsSupplierModalVisible(true)}
                  style={{ marginTop: 30, borderRadius: 10 }}
                  block
                >
                  Nouveau fournisseur
                </Button>
              </Col>
            </Row>
          </Card>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="expected_date" label="Date prévue de livraison">
                <DatePicker 
                  style={{ width: '100%', borderRadius: 10 }} 
                  placeholder="Sélectionner une date"
                  format="DD/MM/YYYY"
                  suffixIcon={<CalendarOutlined style={{ color: COLORS.slateLight }} />}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="reference" label="Référence fournisseur">
                <Input 
                  placeholder="N° de commande fournisseur" 
                  style={{ borderRadius: 10 }}
                />
              </Form.Item>
            </Col>
          </Row>

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
                    description="Cliquez sur 'Ajouter une ligne' pour ajouter des articles"
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
                        extra={
                          fields.length > 1 && (
                            <Button 
                              type="text" 
                              danger 
                              icon={<DeleteOutlined />}
                              onClick={() => remove(name)}
                              size="small"
                            />
                          )
                        }
                      >
                        <Row gutter={12}>
                          <Col span={10}>
                            <Form.Item 
                              {...restField} 
                              name={[name, 'description']} 
                              label="Description" 
                              rules={[{ required: true, message: 'Description requise' }]}
                              style={{ marginBottom: 8 }}
                            >
                              <Input placeholder="Description du produit" style={{ borderRadius: 10 }} />
                            </Form.Item>
                          </Col>
                          <Col span={4}>
                            <Form.Item 
                              {...restField} 
                              name={[name, 'quantity']} 
                              label="Quantité" 
                              rules={[{ required: true, message: 'Quantité requise' }]}
                              style={{ marginBottom: 8 }}
                            >
                              <Input 
                                type="number" 
                                min={0.01} 
                                step={0.01} 
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
                  Ajouter une ligne
                </Button>
              </>
            )}
          </Form.List>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea 
              rows={3} 
              placeholder="Informations complémentaires..." 
              style={{ borderRadius: 10 }}
            />
          </Form.Item>

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

      {/* ========== MODAL CRÉATION FOURNISSEUR ========== */}
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
              <TruckOutlined style={{ color: COLORS.white, fontSize: 16 }} />
            </div>
            <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Nouveau fournisseur</span>
          </Space>
        }
        open={isSupplierModalVisible}
        onCancel={() => {
          setIsSupplierModalVisible(false);
          supplierForm.resetFields();
        }}
        width={700}
        footer={null}
        destroyOnClose
        style={{ borderRadius: 20 }}
      >
        <Form form={supplierForm} layout="vertical" onFinish={handleCreateSupplier}>
          <Card 
            title="Informations générales" 
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
                  label="Nom du fournisseur" 
                  rules={[{ required: true, message: 'Veuillez saisir un nom' }]}
                >
                  <Input placeholder="Ex: Apple France" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="code" label="Code">
                  <Input placeholder="SUP-001" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="email" label="Email">
                  <Input 
                    prefix={<MailOutlined style={{ color: COLORS.slateLight }} />} 
                    placeholder="contact@fournisseur.fr" 
                    style={{ borderRadius: 10 }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="phone" label="Téléphone">
                  <Input 
                    prefix={<PhoneOutlined style={{ color: COLORS.slateLight }} />} 
                    placeholder="01 23 45 67 89" 
                    style={{ borderRadius: 10 }}
                  />
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

            <Form.Item name="is_preferred" label="Fournisseur préféré" valuePropName="checked">
              <Switch 
                checkedChildren={<StarOutlined />} 
                unCheckedChildren="⭐" 
              />
            </Form.Item>
          </Card>

          <Card 
            title="Contact principal" 
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
              <Col span={8}>
                <Form.Item name="contact_name" label="Nom">
                  <Input placeholder="Jean Dupont" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="contact_email" label="Email">
                  <Input placeholder="jean@fournisseur.fr" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="contact_phone" label="Téléphone">
                  <Input placeholder="06 12 34 56 78" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Form.Item style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button onClick={() => setIsSupplierModalVisible(false)} size="large" style={{ borderRadius: 10 }}>
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
                Créer le fournisseur
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
              Détails commande
            </span>
            {selectedPO?.name && (
              <Tag color="primary" style={{ borderRadius: 20 }}>
                #{selectedPO.name}
              </Tag>
            )}
            {selectedPO?.status && (
              <StatusBadge status={selectedPO.status} />
            )}
          </Space>
        }
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        width={800}
        footer={[
          <Button key="back" onClick={() => setIsModalVisible(false)} style={{ borderRadius: 10 }}>
            Fermer
          </Button>,
          selectedPO?.status === 'draft' && (
            <Button 
              key="send" 
              type="primary" 
              icon={<SendOutlined />}
              onClick={() => updateOrderStatus(selectedPO.id, 'sent')}
              loading={updateLoading}
              style={{ 
                background: COLORS.sky, 
                border: 'none',
                borderRadius: 10,
              }}
            >
              Envoyer
            </Button>
          ),
          selectedPO?.status === 'sent' && (
            <Button 
              key="confirm" 
              type="primary" 
              icon={<CheckCircleOutlined />}
              onClick={() => updateOrderStatus(selectedPO.id, 'confirmed')}
              loading={updateLoading}
              style={{ 
                background: COLORS.primary, 
                border: 'none',
                borderRadius: 10,
              }}
            >
              Confirmer
            </Button>
          ),
          selectedPO?.status === 'confirmed' && selectedPO?.delivery_status !== 'delivered' && (
            <Button 
              key="receive" 
              icon={<TruckOutlined />}
              onClick={() => updateOrderStatus(selectedPO.id, 'received')}
              loading={updateLoading}
              style={{ 
                background: COLORS.emerald, 
                border: 'none', 
                color: COLORS.white,
                borderRadius: 10,
              }}
            >
              Réceptionner
            </Button>
          ),
        ]}
        style={{ borderRadius: 20 }}
      >
        {selectedPO && (
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
                  {selectedPO.name || `PO-${selectedPO.id}`}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Statut" span={1}>
                <StatusBadge status={selectedPO.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Fournisseur" span={1}>
                <Space>
                  <TruckOutlined style={{ color: COLORS.slate }} />
                  <Text>{selectedPO.supplier_name || 'Non spécifié'}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Date" span={1}>
                <CalendarOutlined style={{ marginRight: 6, color: COLORS.slate }} />
                {dayjs(selectedPO.date_order).format('DD/MM/YYYY à HH:mm')}
              </Descriptions.Item>
              <Descriptions.Item label="Montant total" span={2}>
                <Text strong style={{ color: COLORS.primary, fontSize: 18 }}>
                  {(selectedPO.amount_total || 0).toFixed(2)} €
                </Text>
              </Descriptions.Item>
              {selectedPO.supplier_code && (
                <Descriptions.Item label="Code fournisseur" span={2}>
                  <Tag style={{ borderRadius: 20 }}>{selectedPO.supplier_code}</Tag>
                </Descriptions.Item>
              )}
              {selectedPO.expected_date && (
                <Descriptions.Item label="Livraison prévue" span={2}>
                  <Space>
                    <CalendarOutlined style={{ color: COLORS.slate }} />
                    {dayjs(selectedPO.expected_date).format('DD/MM/YYYY')}
                    {selectedPO.delivery_status && (
                      <DeliveryBadge status={selectedPO.delivery_status} />
                    )}
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>
            
            <Divider orientation="left" style={{ marginTop: 20, marginBottom: 16 }}>
              <Space>
                <ShoppingCartOutlined style={{ color: COLORS.primary }} />
                <span style={{ color: COLORS.gray800 }}>Lignes de commande</span>
                <Tag style={{ borderRadius: 20, background: COLORS.slateSurface, color: COLORS.slate, border: 'none' }}>
                  {selectedPO.lines?.length || 0} articles
                </Tag>
              </Space>
            </Divider>
            
            <Table
              size="middle"
              columns={[
                { 
                  title: 'Description', 
                  dataIndex: 'description', 
                  key: 'description',
                  render: (text) => <Text>{text || 'Produit'}</Text>
                },
                { 
                  title: 'Qté', 
                  dataIndex: 'quantity', 
                  key: 'quantity', 
                  align: 'center',
                  render: (val) => Number(val || 0).toFixed(2)
                },
                { 
                  title: 'Prix unitaire', 
                  dataIndex: 'price_unit', 
                  key: 'price_unit', 
                  render: (val) => val ? `${Number(val).toFixed(2)} €` : '0 €', 
                  align: 'right' 
                },
                { 
                  title: 'Total', 
                  dataIndex: 'price_subtotal', 
                  key: 'price_subtotal', 
                  render: (val) => (
                    <Text strong style={{ color: COLORS.primary }}>
                      {val ? `${Number(val).toFixed(2)} €` : '0 €'}
                    </Text>
                  ), 
                  align: 'right' 
                },
              ]}
              dataSource={selectedPO.lines || []}
              pagination={false}
              rowKey={(record, index) => record.id || `line-${index}`}
              style={{ borderRadius: 12 }}
              locale={{ emptyText: 'Aucune ligne de commande' }}
            />

            {selectedPO.notes && (
              <Alert
                style={{ marginTop: 16, borderRadius: 12 }}
                message="Notes"
                description={selectedPO.notes}
                type="info"
                showIcon
                icon={<FileTextOutlined />}
              />
            )}

            {selectedPO.status === 'received' && (
              <Alert
                message="Commande réceptionnée"
                description="Cette commande a été entièrement réceptionnée. Les stocks ont été mis à jour."
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                style={{ marginTop: 16, borderRadius: 12 }}
              />
            )}

            {selectedPO.status === 'cancelled' && (
              <Alert
                message="Commande annulée"
                description="Cette commande a été annulée."
                type="warning"
                showIcon
                icon={<CloseCircleOutlined />}
                style={{ marginTop: 16, borderRadius: 12 }}
              />
            )}
          </div>
        )}
      </Modal>

      {/* Styles CSS globaux */}
      <style jsx="true">{`
        .row-delayed {
          background: #fef2f2 !important;
        }
        .row-delayed:hover {
          background: #fee2e2 !important;
        }
        .row-received {
          background: ${COLORS.emeraldSurface} !important;
        }
        .row-received:hover {
          background: #d1fae5 !important;
        }
        .row-cancelled {
          background: #fef2f2 !important;
          opacity: 0.7;
        }
        .row-cancelled:hover {
          background: #fee2e2 !important;
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
      `}</style>
    </motion.div>
  );
};

export default PurchaseDashboard;