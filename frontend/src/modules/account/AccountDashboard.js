// src/modules/accounting/AccountDashboard.js - Version corrigée
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Row, Col, Statistic, Table, Button, Space, 
  Tag, Tabs, DatePicker, Select, Input,
  Badge, Tooltip, Progress, Modal, Form, message,
  Spin, Alert, Divider, Popconfirm, Typography, Avatar, Empty,
  Descriptions, Popover
} from 'antd';
import { 
  WalletOutlined, DollarOutlined, RiseOutlined, 
  FallOutlined, FileTextOutlined, PlusOutlined,
  DownloadOutlined, FilterOutlined, PrinterOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  EyeOutlined, EditOutlined, DeleteOutlined,
  BarChartOutlined, PieChartOutlined,
  EuroCircleOutlined, CreditCardOutlined, ClockCircleOutlined,
  ReloadOutlined, BankOutlined, ThunderboltOutlined,
  FireOutlined, TrophyOutlined, HeartOutlined,
  CalendarOutlined, GlobalOutlined, DiscordOutlined,
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
const { TextArea } = Input;

// ============================================
// PALETTE "CORPORATE TRUST" - Cohérente
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
  gold: '#d4a017',
  goldLight: '#fbbf24',
  teal: '#0d9488',
  tealLight: '#5eead4',
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
  'paid': { 
    color: COLORS.emerald, 
    bg: COLORS.emeraldSurface,
    icon: <CheckCircleOutlined />, 
    label: 'Payée',
    badgeColor: COLORS.emerald,
    step: 3
  },
  'sent': { 
    color: COLORS.primary, 
    bg: COLORS.primarySurface,
    icon: <SendOutlined />, 
    label: 'Envoyée',
    badgeColor: COLORS.primary,
    step: 2
  },
  'draft': { 
    color: COLORS.slate, 
    bg: COLORS.slateSurface,
    icon: <FileTextOutlined />, 
    label: 'Brouillon',
    badgeColor: COLORS.slate,
    step: 0
  },
  'cancelled': { 
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
      styles={{ body: { padding: '20px 24px' } }}
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

const CashFlowCard = ({ label, value, icon, color, bgColor, isPositive }) => (
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
        textAlign: 'center',
        transition: 'all 0.3s ease',
      }}
      styles={{ body: { padding: '20px 16px' } }}
    >
      <div style={{
        width: 56,
        height: 56,
        borderRadius: 14,
        background: bgColor || `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 12px',
        fontSize: 26,
        color: color,
      }}>
        {icon}
      </div>
      <Text style={{ color: COLORS.slate, fontSize: 13, fontWeight: 500 }}>
        {label}
      </Text>
      <div style={{
        fontSize: 24,
        fontWeight: 700,
        color: color,
        marginTop: 8,
      }}>
        {typeof value === 'number' ? value.toLocaleString('fr-FR', { minimumFractionDigits: 2 }) : value} €
      </div>
      {isPositive !== undefined && (
        <Tag 
          color={isPositive ? 'success' : 'error'} 
          style={{ borderRadius: 12, marginTop: 8, fontSize: 12 }}
        >
          {isPositive ? '📈 Excédent' : '📉 Déficit'}
        </Tag>
      )}
    </Card>
  </motion.div>
);

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const AccountDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [kpiData, setKpiData] = useState([]);
  const [taxes, setTaxes] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [cashFlow, setCashFlow] = useState(null);
  const [animateValues, setAnimateValues] = useState({});
  const [newInvoiceAlert, setNewInvoiceAlert] = useState(null);
  
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isPaymentModalVisible, setIsPaymentModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [period, setPeriod] = useState('30days');
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'days'), dayjs()]);
  const [searchText, setSearchText] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  
  const [form] = Form.useForm();
  const [paymentForm] = Form.useForm();

  // ===== CHARGEMENT DES DONNÉES =====
  const fetchData = async () => {
    setLoading(true);
    try {
      let invoicesUrl = `/accounting/invoices?`;
      
      if (filterStatus !== 'all') invoicesUrl += `status=${filterStatus}&`;
      if (filterType !== 'all') invoicesUrl += `type=${filterType}&`;
      
      // ✅ Ne filtrer par date que si ce n'est pas "all"
      if (period !== 'all') {
        if (dateRange[0]) invoicesUrl += `date_from=${dateRange[0].format('YYYY-MM-DD')}&`;
        if (dateRange[1]) invoicesUrl += `date_to=${dateRange[1].format('YYYY-MM-DD')}&`;
      }
      
      if (searchText) invoicesUrl += `search=${searchText}&`;
      
      
      const [invoicesRes, kpiRes, taxesRes, accountsRes, cashRes] = await Promise.allSettled([
        api.get(invoicesUrl),
        api.get('/accounting/dashboard/kpi'),
        api.get('/accounting/taxes'),
        api.get('/accounting/accounts'),
        api.get('/accounting/dashboard/cash-flow?days=30')
      ]);
      
      // ✅ Extraire les factures
      if (invoicesRes.status === 'fulfilled') {
        const responseData = invoicesRes.value;
        
        let invoicesData = [];
        const apiData = responseData.data;
        
        if (apiData && apiData.success === true && Array.isArray(apiData.data)) {
          invoicesData = apiData.data;
        } else if (Array.isArray(apiData)) {
          invoicesData = apiData;
        } else if (apiData && Array.isArray(apiData.invoices)) {
          invoicesData = apiData.invoices;
        }
        
        setInvoices(invoicesData);
      } else {
        setInvoices([]);
      }
      
      // ✅ Extraire les KPIs
      if (kpiRes.status === 'fulfilled') {
        const responseData = kpiRes.value;
        const apiData = responseData.data;
        let kpiDataValue = [];
        if (apiData && apiData.success === true && Array.isArray(apiData.data)) {
          kpiDataValue = apiData.data;
        } else if (Array.isArray(apiData)) {
          kpiDataValue = apiData;
        }
        setKpiData(kpiDataValue);
      } else {
        setKpiData([]);
      }
      
      // ✅ Extraire les taxes
      if (taxesRes.status === 'fulfilled') {
        const responseData = taxesRes.value;
        const apiData = responseData.data;
        let taxesData = [];
        if (apiData && apiData.success === true && Array.isArray(apiData.data)) {
          taxesData = apiData.data;
        } else if (Array.isArray(apiData)) {
          taxesData = apiData;
        }
        setTaxes(taxesData);
      }
      
      // ✅ Extraire les comptes
      if (accountsRes.status === 'fulfilled') {
        const responseData = accountsRes.value;
        const apiData = responseData.data;
        let accountsData = [];
        if (apiData && apiData.success === true && Array.isArray(apiData.data)) {
          accountsData = apiData.data;
        } else if (Array.isArray(apiData)) {
          accountsData = apiData;
        }
        setAccounts(accountsData);
      }
      
      // ✅ Extraire le cash flow
      if (cashRes.status === 'fulfilled') {
        const responseData = cashRes.value;
        const apiData = responseData.data;
        if (apiData && apiData.success === true) {
          setCashFlow(apiData.data || apiData);
        } else if (apiData && apiData.data) {
          setCashFlow(apiData.data);
        } else {
          setCashFlow(apiData);
        }
      }
      
    } catch (error) {
      console.error('❌ Erreur fetchData:', error);
      message.error('Erreur lors du chargement des données');
      setInvoices([]);
      setKpiData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterType, dateRange, period, searchText]);

  // ===== GESTION DES FACTURES =====
  const handleCreateInvoice = async (values) => {
    setUpdateLoading(true);
    try {
      if (!values.partner_name) {
        message.error('Veuillez saisir le nom du client/fournisseur');
        return;
      }

      const lines = [{
        product_name: values.description,
        quantity: parseFloat(values.quantity) || 1,
        price_unit: parseFloat(values.price_unit) || 0,
      }];

      const invoiceData = {
        partner_name: values.partner_name,
        date_invoice: new Date().toISOString(),
        date_due: values.due_date ? values.due_date.toISOString() : null,
        lines: lines,
        notes: values.notes || null,
        status: 'draft'
      };

      
      const response = await api.post('/accounting/invoices', invoiceData);
      
      if (response.data && response.data.success) {
        message.success('Facture créée avec succès');
        setIsCreateModalVisible(false);
        form.resetFields();
        fetchData();
      } else {
        message.error(response.data?.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('❌ Erreur création facture:', error);
      message.error(error.response?.data?.detail || 'Erreur lors de la création de la facture');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleValidateInvoice = async (invoiceId) => {
    setUpdateLoading(true);
    try {
      await api.post(`/accounting/invoices/${invoiceId}/validate`);
      message.success('Facture validée avec succès');
      fetchData();
      setIsPaymentModalVisible(false);
    } catch (error) {
      message.error('Erreur lors de la validation');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handlePayInvoice = async (invoiceId) => {
    setUpdateLoading(true);
    try {
      await api.post(`/accounting/invoices/${invoiceId}/pay`);
      message.success('Facture marquée comme payée');
      fetchData();
      setIsPaymentModalVisible(false);
    } catch (error) {
      message.error('Erreur lors du paiement');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    setUpdateLoading(true);
    try {
      await api.delete(`/accounting/invoices/${invoiceId}`);
      message.success('Facture supprimée avec succès');
      fetchData();
    } catch (error) {
      message.error('Erreur lors de la suppression');
    } finally {
      setUpdateLoading(false);
    }
  };

  const showInvoiceDetails = async (invoice) => {
    try {
      const response = await api.get(`/accounting/invoices/${invoice.id}`);
      const data = response.data.data || response.data;
      setSelectedInvoice({
        ...data,
        partner_name: data.partner_name || invoice.partner_name
      });
      setIsPaymentModalVisible(true);
    } catch (error) {
      console.error('❌ Erreur chargement détails:', error);
      message.error('Erreur lors du chargement des détails');
    }
  };

  const getStatusConfig = (status) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG['draft'];
  };

  // ===== STATISTIQUES =====
  const getStats = useCallback(() => {
    if (!Array.isArray(invoices)) {
      return { total: 0, paid: 0, sent: 0, draft: 0, cancelled: 0, overdue: 0 };
    }
    const now = dayjs();
    return {
      total: invoices.length,
      paid: invoices.filter(i => i.status === 'paid').length,
      sent: invoices.filter(i => i.status === 'sent').length,
      draft: invoices.filter(i => i.status === 'draft').length,
      cancelled: invoices.filter(i => i.status === 'cancelled').length,
      overdue: invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled' && i.date_due && dayjs(i.date_due).isBefore(now)).length
    };
  }, [invoices]);

  const stats = getStats();
  const totalInvoices = stats.total;
  const autoInvoices = Array.isArray(invoices) ? invoices.filter(i => i.created_from_order).length : 0;
  const overdueCount = stats.overdue;
  const totalRevenue = Array.isArray(invoices) ? invoices.reduce((sum, i) => sum + (i.amount_total || 0), 0) : 0;
  const paidRevenue = Array.isArray(invoices) ? invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + (i.amount_total || 0), 0) : 0;

  // ===== COLONNES TABLEAU =====
  const columns = [
    { 
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>N° Facture</span>, 
      dataIndex: 'number', 
      key: 'number',
      width: 140,
      fixed: 'left',
      render: (text, record) => (
        <a 
          onClick={() => showInvoiceDetails(record)} 
          style={{ 
            color: COLORS.primary, 
            fontWeight: 600,
            fontSize: 14,
          }}
        >
          {text || `INV-${record.id}`}
        </a>
      )
    },
    { 
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Client</span>, 
      dataIndex: 'partner_name', 
      key: 'partner_name',
      width: 200,
      render: (text, record) => (
        <Space>
          <Avatar 
            size="small" 
            style={{ 
              backgroundColor: record.created_from_order ? COLORS.discord : COLORS.primary,
              width: 32,
              height: 32,
            }}
          >
            {(text || '?').charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <Text strong style={{ color: COLORS.gray800 }}>
              {text || 'Non assigné'}
            </Text>
          </div>
        </Space>
      )
    },
    { 
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Date</span>, 
      dataIndex: 'date_invoice', 
      key: 'date_invoice',
      width: 110,
      render: (text) => text ? dayjs(text).format('DD/MM/YYYY') : '-'
    },
    { 
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Échéance</span>, 
      dataIndex: 'date_due', 
      key: 'date_due',
      width: 120,
      render: (text, record) => {
        const isOverdue = text && dayjs(text).isBefore(dayjs()) && record.status !== 'paid' && record.status !== 'cancelled';
        return (
          <div>
            <span style={{ color: isOverdue ? COLORS.red : COLORS.slate }}>
              {text ? dayjs(text).format('DD/MM/YYYY') : '-'}
            </span>
            {isOverdue && (
              <Tag 
                color="error" 
                style={{ 
                  marginLeft: 8, 
                  fontSize: 10, 
                  borderRadius: 12,
                  padding: '0 8px',
                }}
              >
                <ExclamationCircleOutlined /> En retard
              </Tag>
            )}
          </div>
        );
      }
    },
    { 
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>HT</span>, 
      dataIndex: 'amount_untaxed', 
      key: 'amount_untaxed',
      width: 110,
      align: 'right',
      render: (val) => (
        <Text style={{ color: COLORS.slate }}>
          {Number(val || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
        </Text>
      )
    },
    { 
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>TVA</span>, 
      dataIndex: 'amount_tax', 
      key: 'amount_tax',
      width: 100,
      align: 'right',
      render: (val) => (
        <Text style={{ color: COLORS.slateLight }}>
          {Number(val || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
        </Text>
      )
    },
    { 
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Total TTC</span>, 
      dataIndex: 'amount_total', 
      key: 'amount_total',
      width: 130,
      align: 'right',
      render: (val) => (
        <Text strong style={{ color: COLORS.primary, fontSize: 15 }}>
          {Number(val || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
        </Text>
      )
    },
    { 
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Statut</span>, 
      dataIndex: 'status', 
      key: 'status',
      width: 130,
      render: (status) => <StatusBadge status={status} />
    },
    {
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Actions</span>,
      key: 'actions',
      width: 160,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Voir détails">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              onClick={() => showInvoiceDetails(record)} 
              style={{ color: COLORS.primary }}
            />
          </Tooltip>
          {record.status === 'draft' && (
            <Tooltip title="Valider la facture">
              <Button 
                type="text" 
                icon={<CheckCircleOutlined style={{ color: COLORS.emerald }} />} 
                onClick={() => handleValidateInvoice(record.id)} 
              />
            </Tooltip>
          )}
          {record.status === 'sent' && (
            <Tooltip title="Marquer comme payée">
              <Button 
                type="text" 
                icon={<CreditCardOutlined style={{ color: COLORS.primary }} />} 
                onClick={() => handlePayInvoice(record.id)} 
              />
            </Tooltip>
          )}
          {record.status === 'draft' && !record.created_from_order && (
            <Popconfirm
              title="Supprimer la facture"
              description="Êtes-vous sûr de vouloir supprimer cette facture ?"
              onConfirm={() => handleDeleteInvoice(record.id)}
              okText="Oui"
              cancelText="Non"
              okButtonProps={{ danger: true }}
            >
              <Tooltip title="Supprimer">
                <Button type="text" icon={<DeleteOutlined />} danger />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

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
      {/* ========== ALERTE NOUVELLE FACTURE ========== */}
      <AnimatePresence>
        {newInvoiceAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ marginBottom: 16 }}
          >
            <Alert
              message={
                <Space size="middle">
                  <div style={{ 
                    width: 32, 
                    height: 32, 
                    background: COLORS.discord, 
                    borderRadius: 8, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <FileTextOutlined style={{ color: COLORS.white, fontSize: 16 }} />
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 14, color: COLORS.gray800 }}>
                      Nouvelle facture créée automatiquement
                    </Text>
                    <Text style={{ display: 'block', fontSize: 13, color: COLORS.slate }}>
                      Commande #{newInvoiceAlert.orderId || newInvoiceAlert.orderName}
                    </Text>
                  </div>
                </Space>
              }
              type="success"
              showIcon={false}
              closable
              onClose={() => setNewInvoiceAlert(null)}
              style={{ 
                borderRadius: 16, 
                background: COLORS.white, 
                border: `1px solid ${COLORS.gray200}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              }}
              action={
                <Button 
                  size="middle" 
                  type="primary" 
                  icon={<EyeOutlined />} 
                  onClick={() => {
                    setNewInvoiceAlert(null);
                    fetchData();
                  }}
                  style={{ 
                    background: COLORS.primary, 
                    border: 'none',
                    borderRadius: 10,
                  }}
                >
                  Voir la facture
                </Button>
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
            <WalletOutlined style={{ fontSize: 26, color: COLORS.white }} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: COLORS.gray900, fontWeight: 700 }}>
              Comptabilité
            </Title>
            <Text style={{ color: COLORS.slate, fontSize: 14 }}>
              Gérez vos factures, paiements et trésorerie
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
              onClick={() => {
                message.info('Export en cours de développement');
              }}
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
            Nouvelle facture
          </Button>
        </Space>
      </motion.div>

      {/* ========== CHARGEMENT ========== */}
      {loading && (!Array.isArray(invoices) || invoices.length === 0) ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" tip="Chargement des données..." ><div/></Spin>
        </div>
      ) : (
        <>
          {/* ========== KPIS ========== */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={12} lg={6}>
                <KpiCard
                  title="Chiffre d'affaires"
                  value={totalRevenue}
                  prefix="€"
                  icon={<DollarOutlined />}
                  trend={0}
                  color={COLORS.primary}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <KpiCard
                  title="Factures"
                  value={totalInvoices}
                  icon={<FileTextOutlined />}
                  trend={0}
                  color={COLORS.emerald}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <KpiCard
                  title="En retard"
                  value={overdueCount}
                  icon={<ExclamationCircleOutlined />}
                  trend={0}
                  color={COLORS.red}
                />
              </Col>
              <Col xs={24} sm={12} lg={6}>
                <KpiCard
                  title="Trésorerie"
                  value={paidRevenue}
                  prefix="€"
                  icon={<WalletOutlined />}
                  trend={0}
                  color={COLORS.teal}
                />
              </Col>
            </Row>
          </motion.div>

          {/* ========== CASH FLOW ========== */}
          {cashFlow && cashFlow.summary && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              <Card 
                style={{ 
                  marginBottom: 24, 
                  borderRadius: 16, 
                  border: `1px solid ${COLORS.gray200}`,
                  background: COLORS.white,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
                title={
                  <Space size="middle">
                    <div style={{ 
                      width: 32, 
                      height: 32, 
                      background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.primary})`,
                      borderRadius: 10,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <BarChartOutlined style={{ color: COLORS.white, fontSize: 16 }} />
                    </div>
                    <span style={{ fontWeight: 600, color: COLORS.gray800, fontSize: 15 }}>
                      Prévisions de trésorerie (30 jours)
                    </span>
                  </Space>
                }
              >
                <Row gutter={[16, 16]} justify="center">
                  <Col xs={24} sm={8}>
                    <CashFlowCard
                      label="Entrées prévues"
                      value={cashFlow.summary.total_incoming || 0}
                      icon={<RiseOutlined />}
                      color={COLORS.emerald}
                      bgColor={COLORS.emeraldSurface}
                    />
                  </Col>
                  <Col xs={24} sm={8}>
                    <CashFlowCard
                      label="Sorties prévues"
                      value={cashFlow.summary.total_outgoing || 0}
                      icon={<FallOutlined />}
                      color={COLORS.red}
                      bgColor="#fef2f2"
                    />
                  </Col>
                  <Col xs={24} sm={8}>
                    <CashFlowCard
                      label="Trésorerie nette"
                      value={cashFlow.summary.net_cash_flow || 0}
                      icon={<WalletOutlined />}
                      color={(cashFlow.summary.net_cash_flow || 0) >= 0 ? COLORS.emerald : COLORS.red}
                      bgColor={(cashFlow.summary.net_cash_flow || 0) >= 0 ? COLORS.emeraldSurface : '#fef2f2'}
                      isPositive={(cashFlow.summary.net_cash_flow || 0) >= 0}
                    />
                  </Col>
                </Row>
              </Card>
            </motion.div>
          )}
          
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
              styles={{ body: { padding: '16px 20px' } }}
            >
              <Row gutter={[16, 12]} align="middle">
                <Col xs={24} md={5}>
                  <Search 
                    placeholder="Rechercher une facture..." 
                    allowClear 
                    enterButton={<FilterOutlined />}
                    onSearch={setSearchText}
                    onChange={(e) => !e.target.value && setSearchText('')}
                    style={{ borderRadius: 10 }}
                  />
                </Col>
                <Col xs={12} md={3}>
                  <Select 
                    placeholder="Statut"
                    value={filterStatus}
                    onChange={setFilterStatus}
                    style={{ width: '100%', borderRadius: 10 }}
                    allowClear
                  >
                    <Option value="all">Tous les statuts</Option>
                    <Option value="paid">Payée</Option>
                    <Option value="sent">Envoyée</Option>
                    <Option value="draft">Brouillon</Option>
                    <Option value="cancelled">Annulée</Option>
                  </Select>
                </Col>
                <Col xs={12} md={3}>
                  <Select
                    value={period}
                    onChange={(value) => {
                      setPeriod(value);
                      const now = dayjs();
                      let from;
                      switch(value) {
                        case '7days': from = now.subtract(7, 'days'); break;
                        case '30days': from = now.subtract(30, 'days'); break;
                        case '90days': from = now.subtract(90, 'days'); break;
                        case 'all': from = now.subtract(3650, 'days'); break;
                        default: from = now.subtract(30, 'days');
                      }
                      setDateRange([from, now]);
                    }}
                    style={{ width: '100%', borderRadius: 10 }}
                  >
                    <Option value="7days">📅 7 jours</Option>
                    <Option value="30days">📅 30 jours</Option>
                    <Option value="90days">📅 90 jours</Option>
                    <Option value="all">📅 Tous</Option>
                  </Select>
                </Col>
                <Col xs={24} md={7}>
                  <RangePicker 
                    style={{ width: '100%', borderRadius: 10 }}
                    value={dateRange}
                    onChange={(dates) => {
                      setDateRange(dates);
                      setPeriod('custom');
                    }}
                    format="DD/MM/YYYY"
                    placeholder={['Date début', 'Date fin']}
                    disabled={period === 'all'}
                  />
                </Col>
                <Col xs={24} md={6}>
                  <Button 
                    type="primary"
                    icon={<FilterOutlined />} 
                    onClick={fetchData} 
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

          {/* ========== TABLEAU DES FACTURES ========== */}
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
                    Factures
                  </span>
                  <Tag style={{ borderRadius: 20, background: COLORS.slateSurface, color: COLORS.slate, border: 'none' }}>
                    {totalInvoices}
                  </Tag>
                  {autoInvoices > 0 && (
                    <Tag 
                      style={{ 
                        borderRadius: 20, 
                        background: COLORS.discordSurface, 
                        color: COLORS.discord, 
                        border: 'none' 
                      }}
                    >
                      <DiscordOutlined /> {autoInvoices} auto
                    </Tag>
                  )}
                </Space>
              }
              extra={
                <Space size="middle">
                  <Badge 
                    status="success" 
                    text={<span style={{ color: COLORS.emerald, fontWeight: 500 }}>Payée</span>} 
                  />
                  <Badge 
                    status="processing" 
                    text={<span style={{ color: COLORS.primary, fontWeight: 500 }}>Envoyée</span>} 
                  />
                  <Badge 
                    status="default" 
                    text={<span style={{ color: COLORS.slate, fontWeight: 500 }}>Brouillon</span>} 
                  />
                  <Badge 
                    status="error" 
                    text={<span style={{ color: COLORS.red, fontWeight: 500 }}>Annulée</span>} 
                  />
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
                {!Array.isArray(invoices) || invoices.length === 0 ? (
                  <Empty 
                    description={
                      <div>
                        <Text style={{ color: COLORS.slate }}>Aucune facture trouvée</Text>
                        <br />
                        <Button 
                          type="primary" 
                          icon={<PlusOutlined />} 
                          onClick={() => setIsCreateModalVisible(true)}
                          style={{ marginTop: 12, borderRadius: 10 }}
                        >
                          Créer une facture
                        </Button>
                      </div>
                    }
                    style={{ padding: '40px 0' }}
                  />
                ) : (
                  <Table 
                    columns={columns} 
                    dataSource={invoices}
                    rowKey="id"
                    pagination={{ 
                      pageSize: 10, 
                      showSizeChanger: true, 
                      showTotal: (total) => (
                        <span style={{ color: COLORS.slate }}>
                          📊 Total: {total} facture{total > 1 ? 's' : ''}
                        </span>
                      ),
                      pageSizeOptions: ['10', '20', '50'],
                      showQuickJumper: true
                    }}
                    scroll={{ x: 1200 }}
                    size="middle"
                    style={{ borderRadius: 12 }}
                    rowClassName={(record) => {
                      if (record.status === 'paid') return 'row-paid';
                      if (record.date_due && dayjs(record.date_due).isBefore(dayjs()) && record.status !== 'paid' && record.status !== 'cancelled') return 'row-overdue';
                      if (record.created_from_order) return 'row-auto';
                      return '';
                    }}
                  />
                )}
              </Spin>
            </Card>
          </motion.div>
        </>
      )}

      {/* ========== MODAL CRÉATION FACTURE ========== */}
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
            <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Nouvelle facture</span>
          </Space>
        }
        open={isCreateModalVisible}
        onCancel={() => {
          setIsCreateModalVisible(false);
          form.resetFields();
        }}
        width={620}
        footer={null}
        destroyOnClose
        style={{ borderRadius: 20 }}
        styles={{ body: { paddingTop: 8 } }}
      >
        <Form 
          form={form} 
          layout="vertical" 
          onFinish={handleCreateInvoice} 
          initialValues={{ quantity: 1 }}
        >
          <Card 
            title="Informations générales"
            size="small"
            style={{ 
              marginBottom: 16, 
              borderRadius: 14, 
              border: `1px solid ${COLORS.gray200}`,
              background: COLORS.gray50,
            }}
            styles={{ header: { borderBottom: `1px solid ${COLORS.gray200}` } }}
          >
            <Form.Item name="partner_name" label="Client/Fournisseur" rules={[{ required: true, message: 'Nom requis' }]}>
              <Input placeholder="Nom du client/fournisseur" style={{ borderRadius: 10 }} />
            </Form.Item>

            <Form.Item name="due_date" label="Date d'échéance">
              <DatePicker 
                style={{ width: '100%', borderRadius: 10 }} 
                format="DD/MM/YYYY"
                suffixIcon={<CalendarOutlined style={{ color: COLORS.slateLight }} />}
              />
            </Form.Item>
          </Card>

          <Card 
            title="Ligne de facture"
            size="small"
            style={{ 
              marginBottom: 16, 
              borderRadius: 14, 
              border: `1px solid ${COLORS.gray200}`,
              background: COLORS.gray50,
            }}
            styles={{ header: { borderBottom: `1px solid ${COLORS.gray200}` } }}
          >
            <Form.Item name="description" label="Description" rules={[{ required: true, message: 'Description requise' }]}>
              <Input placeholder="Description du produit/service" style={{ borderRadius: 10 }} />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="quantity" label="Quantité" initialValue={1} rules={[{ required: true }]}>
                  <Input type="number" min={1} step={1} style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="price_unit" label="Prix unitaire HT" rules={[{ required: true }]}>
                  <Input 
                    prefix="€" 
                    type="number" 
                    min={0} 
                    step={0.01} 
                    style={{ borderRadius: 10 }} 
                    placeholder="0.00"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Informations complémentaires..." style={{ borderRadius: 10 }} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
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
                loading={updateLoading}
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, 
                  border: 'none', 
                  borderRadius: 10,
                  padding: '0 40px',
                  boxShadow: '0 4px 12px rgba(26,86,219,0.3)',
                }}
              >
                Créer la facture
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* ========== MODAL DÉTAILS FACTURE ========== */}
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
              Détails de la facture
            </span>
            {selectedInvoice?.number && (
              <Tag color="primary" style={{ borderRadius: 20 }}>
                #{selectedInvoice.number}
              </Tag>
            )}
          </Space>
        }
        open={isPaymentModalVisible && selectedInvoice}
        onCancel={() => {
          setIsPaymentModalVisible(false);
          setSelectedInvoice(null);
        }}
        width={750}
        footer={[
          <Button 
            key="close" 
            onClick={() => {
              setIsPaymentModalVisible(false);
              setSelectedInvoice(null);
            }} 
            style={{ borderRadius: 10 }}
          >
            Fermer
          </Button>,
          selectedInvoice?.status === 'draft' && (
            <Button 
              key="validate" 
              type="primary" 
              icon={<CheckCircleOutlined />}
              onClick={() => handleValidateInvoice(selectedInvoice.id)}
              loading={updateLoading}
              style={{ 
                background: COLORS.emerald, 
                border: 'none',
                borderRadius: 10,
              }}
            >
              Valider
            </Button>
          ),
          selectedInvoice?.status === 'sent' && (
            <Button 
              key="pay" 
              type="primary" 
              icon={<CreditCardOutlined />}
              onClick={() => handlePayInvoice(selectedInvoice.id)}
              loading={updateLoading}
              style={{ 
                background: COLORS.primary, 
                border: 'none',
                borderRadius: 10,
              }}
            >
              Marquer comme payée
            </Button>
          )
        ]}
        style={{ borderRadius: 20 }}
      >
        {selectedInvoice && (
          <div>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 16, 
              marginBottom: 20,
              padding: '16px 20px',
              background: COLORS.gray50,
              borderRadius: 14,
              border: `1px solid ${COLORS.gray200}`
            }}>
              <Avatar 
                size={56} 
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
                  fontSize: 24,
                }}
              >
                {(selectedInvoice.partner_name || '?').charAt(0).toUpperCase()}
              </Avatar>
              <div>
                <Title level={4} style={{ margin: 0, color: COLORS.gray800 }}>
                  {selectedInvoice.partner_name || 'Client inconnu'}
                </Title>
                <div style={{ marginTop: 4 }}>
                  <StatusBadge status={selectedInvoice.status} />
                  <Tag style={{ borderRadius: 20, background: COLORS.slateSurface, color: COLORS.slate, border: 'none', marginLeft: 8 }}>
                    <CalendarOutlined style={{ marginRight: 4 }} />
                    {dayjs(selectedInvoice.date_invoice).format('DD/MM/YYYY')}
                  </Tag>
                </div>
              </div>
            </div>
            
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
              <Descriptions.Item label="N° Facture" span={1}>
                <Text strong style={{ color: COLORS.primary }}>
                  {selectedInvoice.number || `INV-${selectedInvoice.id}`}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Statut" span={1}>
                <StatusBadge status={selectedInvoice.status} />
              </Descriptions.Item>
              <Descriptions.Item label="Client" span={1}>
                <Text>{selectedInvoice.partner_name || 'Non assigné'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Date d'échéance" span={1}>
                {selectedInvoice.date_due ? (
                  <span style={{ 
                    color: dayjs(selectedInvoice.date_due).isBefore(dayjs()) && selectedInvoice.status !== 'paid' 
                      ? COLORS.red 
                      : COLORS.gray800 
                  }}>
                    <CalendarOutlined style={{ marginRight: 6, color: COLORS.slate }} />
                    {dayjs(selectedInvoice.date_due).format('DD/MM/YYYY')}
                    {dayjs(selectedInvoice.date_due).isBefore(dayjs()) && selectedInvoice.status !== 'paid' && (
                      <Tag color="error" style={{ marginLeft: 8, borderRadius: 12 }}>
                        <ExclamationCircleOutlined /> En retard
                      </Tag>
                    )}
                  </span>
                ) : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Montant HT" span={1}>
                <Text>{(selectedInvoice.amount_untaxed || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</Text>
              </Descriptions.Item>
              <Descriptions.Item label="TVA (20%)" span={1}>
                <Text type="secondary">{(selectedInvoice.amount_tax || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Total TTC" span={2}>
                <Text strong style={{ color: COLORS.primary, fontSize: 18 }}>
                  {(selectedInvoice.amount_total || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
                </Text>
              </Descriptions.Item>
            </Descriptions>

            {selectedInvoice.notes && (
              <Alert
                style={{ marginTop: 16, borderRadius: 12 }}
                message="Notes"
                description={selectedInvoice.notes}
                type="info"
                showIcon
                icon={<FileTextOutlined />}
              />
            )}

            {selectedInvoice.status === 'paid' && (
              <Alert
                message="Facture payée"
                description="Cette facture a été réglée intégralement."
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                style={{ marginTop: 16, borderRadius: 12 }}
              />
            )}
          </div>
        )}
      </Modal>

      {/* Styles CSS globaux */}
      <style jsx="true">{`
        .row-paid {
          background: ${COLORS.emeraldSurface} !important;
        }
        .row-paid:hover {
          background: #d1fae5 !important;
        }
        .row-overdue {
          background: #fef2f2 !important;
        }
        .row-overdue:hover {
          background: #fee2e2 !important;
        }
        .row-auto {
          background: ${COLORS.discordSurface} !important;
        }
        .row-auto:hover {
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
      `}</style>
    </motion.div>
  );
};

export default AccountDashboard;