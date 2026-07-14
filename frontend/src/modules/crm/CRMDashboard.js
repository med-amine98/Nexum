// src/modules/crm/CRMDashboard.js - Version corrigée avec pipeline stats synchronisé
import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Statistic, Table, Button, Space, 
  Tag, Progress, Input, Select, DatePicker,
  Avatar, Timeline, Badge, Tooltip, Modal, Form, message, Empty,
  Spin, Divider, Typography, Alert, Descriptions, Popover
} from 'antd';
import { 
  TeamOutlined, UserAddOutlined, RiseOutlined, 
  FallOutlined, PhoneOutlined, MailOutlined,
  PlusOutlined, FilterOutlined,
  CheckCircleOutlined,
  StarOutlined, ClockCircleOutlined,
  BulbOutlined, ToolOutlined, EyeOutlined,
  ReloadOutlined, UserOutlined,
  FileTextOutlined, TrophyOutlined, FireOutlined,
  HeartOutlined, ThunderboltOutlined, DashboardOutlined,
  ShoppingOutlined, DollarOutlined, ExportOutlined,
  SendOutlined, CalendarOutlined, GlobalOutlined,
  LinkedinOutlined, TwitterOutlined, FacebookOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import api from '../../services/api';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

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
  purple: '#7c3aed',
  purpleLight: '#a78bfa',
  purpleSurface: '#f5f3ff',
  pink: '#db2777',
  pinkLight: '#f472b6',
  pinkSurface: '#fdf2f8',
  cyan: '#0891b2',
  cyanLight: '#67e8f9',
  cyanSurface: '#ecfeff',
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
// CONFIGURATION DES STATUTS
// ============================================

const STATUS_CONFIG = {
  'new': { 
    color: COLORS.primary, 
    bg: COLORS.primarySurface,
    icon: <UserOutlined />, 
    label: 'Nouveau',
    badgeColor: COLORS.primary,
    step: 0
  },
  'contacted': { 
    color: COLORS.amber, 
    bg: '#fef3c7',
    icon: <PhoneOutlined />, 
    label: 'Contacté',
    badgeColor: COLORS.amber,
    step: 1
  },
  'qualified': { 
    color: COLORS.purple, 
    bg: COLORS.purpleSurface,
    icon: <StarOutlined />, 
    label: 'Qualifié',
    badgeColor: COLORS.purple,
    step: 2
  },
  'proposal': { 
    color: COLORS.cyan, 
    bg: COLORS.cyanSurface,
    icon: <FileTextOutlined />, 
    label: 'Proposition',
    badgeColor: COLORS.cyan,
    step: 3
  },
  'negotiation': { 
    color: COLORS.pink, 
    bg: COLORS.pinkSurface,
    icon: <BulbOutlined />, 
    label: 'Négociation',
    badgeColor: COLORS.pink,
    step: 4
  },
  'won': { 
    color: COLORS.emerald, 
    bg: COLORS.emeraldSurface,
    icon: <TrophyOutlined />, 
    label: 'Gagné',
    badgeColor: COLORS.emerald,
    step: 5
  },
  'lost': { 
    color: COLORS.red, 
    bg: '#fef2f2',
    icon: <FallOutlined />, 
    label: 'Perdu',
    badgeColor: COLORS.red,
    step: -1
  }
};

// ============================================
// COMPOSANTS STYLISÉS
// ============================================

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG['new'];
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

const KpiCard = ({ title, value, icon, trend, suffix, color }) => (
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

const StageProgress = ({ stage, count, total, color, icon }) => {
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      style={{ textAlign: 'center', padding: '12px 8px' }}
    >
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <Progress
          type="circle"
          percent={percent}
          size={80}
          strokeColor={color}
          strokeWidth={6}
          format={() => (
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.gray800 }}>
                {count}
              </div>
              <div style={{ fontSize: 10, color: COLORS.slateLight }}>leads</div>
            </div>
          )}
        />
        <div style={{
          position: 'absolute',
          top: -8,
          right: -8,
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: COLORS.white,
          fontSize: 14,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}>
          {icon}
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <Text strong style={{ color: COLORS.gray700, fontSize: 13 }}>{stage}</Text>
        <div style={{ fontSize: 11, color: COLORS.slateLight }}>
          {percent}% du total
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const CRMDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [leads, setLeads] = useState([]);
  const [pipelineStats, setPipelineStats] = useState([]);
  const [activities, setActivities] = useState([]);
  const [kpiData, setKpiData] = useState([]);
  const [pipelineStages, setPipelineStages] = useState([]);
  
  const [isLeadModalVisible, setIsLeadModalVisible] = useState(false);
  const [isActivityModalVisible, setIsActivityModalVisible] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);
  
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSource, setFilterSource] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [period, setPeriod] = useState('30days');
  const [dateRange, setDateRange] = useState([dayjs().subtract(30, 'days'), dayjs()]);
  const [updateLoading, setUpdateLoading] = useState(false);
  
  const [form] = Form.useForm();
  const [activityForm] = Form.useForm();

  // ===== CHARGEMENT DES DONNÉES =====
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus !== 'all') params.status = filterStatus.toUpperCase();
      if (filterSource !== 'all') params.source = filterSource;
      if (searchText) params.search = searchText;
      
      if (period !== 'all') {
        if (dateRange[0]) params.date_from = dateRange[0].format('YYYY-MM-DD');
        if (dateRange[1]) params.date_to = dateRange[1].format('YYYY-MM-DD');
      }
      

      
      // ✅ Récupérer d'abord les leads
      const leadsRes = await api.get('/crm/leads', { params });

      
      // ✅ Extraire les leads
      let leadsData = [];
      const apiData = leadsRes.data;
      
      if (apiData && apiData.success === true && Array.isArray(apiData.data)) {
        leadsData = apiData.data;

      }
      
      // ✅ Transformer les données pour le frontend
      const formattedLeads = leadsData.map(lead => ({
        id: lead.id || lead.lead_id,
        name: lead.name || lead.full_name || 'Nom inconnu',
        first_name: lead.first_name || lead.name?.split(' ')[0] || '',
        last_name: lead.last_name || lead.name?.split(' ').slice(1).join(' ') || '',
        company: lead.company || lead.company_name || '',
        email: lead.email || '',
        phone: lead.phone || '',
        source: lead.source || 'inconnu',
        status: (lead.status || 'new').toLowerCase(),
        priority: lead.priority || 'medium',
        expected_revenue: lead.expected_revenue || lead.estimated_value || lead.value || 0,
        probability: lead.probability || 0,
        notes: lead.notes || lead.description || '',
        description: lead.description || '',
        created_at: lead.created_at || lead.createdAt,
        updated_at: lead.updated_at || lead.updatedAt,
        assigned_to: lead.assigned_to || lead.assigned_to_id,
        ai_lead_score: lead.ai_lead_score || 0
      }));
      
      setLeads(formattedLeads);
      
      // ✅ Calculer les statistiques du pipeline à partir des leads chargés
      const stats = {
        new: 0,
        contacted: 0,
        qualified: 0,
        proposal: 0,
        negotiation: 0,
        won: 0,
        lost: 0
      };
      
      formattedLeads.forEach(lead => {
        const status = lead.status?.toLowerCase() || 'new';
        if (stats.hasOwnProperty(status)) {
          stats[status]++;
        }
      });
      

      
      // ✅ Mettre à jour les statistiques du pipeline
      const stages = [
        { name: 'Nouveau', count: stats.new, color: COLORS.primary, icon: <UserOutlined /> },
        { name: 'Contacté', count: stats.contacted, color: COLORS.amber, icon: <PhoneOutlined /> },
        { name: 'Qualifié', count: stats.qualified, color: COLORS.purple, icon: <StarOutlined /> },
        { name: 'Proposition', count: stats.proposal, color: COLORS.cyan, icon: <FileTextOutlined /> },
        { name: 'Négociation', count: stats.negotiation, color: COLORS.pink, icon: <BulbOutlined /> },
        { name: 'Gagné', count: stats.won, color: COLORS.emerald, icon: <TrophyOutlined /> },
        { name: 'Perdu', count: stats.lost, color: COLORS.red, icon: <FallOutlined /> }
      ];
      
      setPipelineStats(stages);
      
      // ✅ Récupérer les autres données en parallèle
      const [activitiesRes, kpiRes, stagesRes] = await Promise.allSettled([
        api.get('/crm/activities', { params: { days: 30 } }),
        api.get('/crm/dashboard/kpi'),
        api.get('/crm/pipeline/stages')
      ]);
      
      // Activities
      if (activitiesRes.status === 'fulfilled') {
        let activitiesData = [];
        const actData = activitiesRes.value;
        if (Array.isArray(actData)) activitiesData = actData;
        else if (actData && Array.isArray(actData.data)) activitiesData = actData.data;
        else if (actData && Array.isArray(actData.activities)) activitiesData = actData.activities;
        setActivities(activitiesData);
      } else {
        setActivities([]);
      }
      
      // KPIs
      if (kpiRes.status === 'fulfilled') {
        let kpiDataArray = [];
        const kpiResponse = kpiRes.value;
        if (Array.isArray(kpiResponse)) kpiDataArray = kpiResponse;
        else if (kpiResponse && Array.isArray(kpiResponse.data)) kpiDataArray = kpiResponse.data;
        setKpiData(kpiDataArray);
      } else {
        setKpiData([]);
      }
      
      // Pipeline stages
      if (stagesRes.status === 'fulfilled') {
        let stagesData = [];
        const stagesResponse = stagesRes.value;
        if (Array.isArray(stagesResponse)) stagesData = stagesResponse;
        else if (stagesResponse && Array.isArray(stagesResponse.data)) stagesData = stagesResponse.data;
        setPipelineStages(stagesData);
      } else {
        setPipelineStages([]);
      }
      
    } catch (error) {
      console.error('❌ Erreur fetchData:', error);
      message.error('Erreur lors du chargement des données');
      setLeads([]);
      setPipelineStats([]);
      setActivities([]);
      setKpiData([]);
      setPipelineStages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus, filterSource, searchText, dateRange, period]);

  // ===== GESTION DES LEADS =====
  const handleCreateLead = async (values) => {
    try {
      const fullName = `${values.first_name} ${values.last_name}`.trim();
      
      const leadData = {
        name: fullName,
        company: values.company,
        email: values.email,
        phone: values.phone,
        source: values.source || 'site web',
        estimated_value: parseFloat(values.estimated_value) || 0,
        notes: values.notes
      };
      
      
      const response = await api.post('/crm/leads', leadData);
      
      if (response.data && response.data.success === true) {
        message.success('Lead créé avec succès');
        setIsLeadModalVisible(false);
        form.resetFields();
        fetchData();
      } else {
        message.error(response.data?.error || 'Erreur lors de la création');
      }
    } catch (error) {
      console.error('❌ Erreur création lead:', error);
      message.error(error.response?.data?.error || 'Erreur lors de la création');
    }
  };

  const handleAddActivity = async (values) => {
    try {
      await api.post('/crm/activities', {
        ...values,
        lead_id: selectedLead.id
      });
      message.success('Activité ajoutée');
      setIsActivityModalVisible(false);
      activityForm.resetFields();
      fetchData();
    } catch (error) {
      console.error('Erreur ajout activité:', error);
      message.error('Erreur lors de l\'ajout');
    }
  };

  const handleStatusChange = async (leadId, newStatus) => {
    setUpdateLoading(true);
    try {
      await api.put(`/crm/leads/${leadId}`, { status: newStatus.toUpperCase() });
      message.success(`Statut mis à jour : ${STATUS_CONFIG[newStatus]?.label || newStatus}`);
      fetchData();
    } catch (error) {
      console.error('Erreur mise à jour statut:', error);
      message.error('Erreur lors de la mise à jour');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleConvertToCustomer = async (leadId) => {
    Modal.confirm({
      title: 'Convertir en client',
      content: 'Voulez-vous convertir ce lead en client ? Un client sera créé dans le module des contacts.',
      okText: 'Oui, convertir',
      okType: 'primary',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await api.post(`/crm/leads/${leadId}/convert`);
          message.success('Lead converti en client avec succès');
          fetchData();
          setIsDetailsModalVisible(false);
        } catch (error) {
          console.error('Erreur conversion:', error);
          message.error('Erreur lors de la conversion');
        }
      }
    });
  };

  const showLeadDetails = async (lead) => {
    try {
      const response = await api.get(`/crm/leads/${lead.id}`);
      const data = response.data.data || response.data;
      setSelectedLead({
        ...data,
        first_name: data.first_name || data.name?.split(' ')[0] || '',
        last_name: data.last_name || data.name?.split(' ').slice(1).join(' ') || '',
        notes: data.notes || data.description || '',
        status: data.status?.toLowerCase() || 'new'
      });
      setIsDetailsModalVisible(true);
    } catch (error) {
      console.error('❌ Erreur chargement détails:', error);
      message.error('Erreur lors du chargement');
    }
  };

  // ===== COLONNES TABLEAU =====
  const columns = [
    { 
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Contact</span>, 
      key: 'contact',
      width: 220,
      render: (_, record) => (
        <Space>
          <Avatar 
            style={{ 
              backgroundColor: COLORS.primary,
              width: 36,
              height: 36,
            }}
          >
            {record.name?.charAt(0) || '?'}
          </Avatar>
          <div>
            <Text strong style={{ color: COLORS.gray800 }}>
              {record.name || 'Nom inconnu'}
            </Text>
            <div>
              <Text type="secondary" style={{ fontSize: 12, color: COLORS.slateLight }}>
                {record.company || 'Indépendant'}
              </Text>
            </div>
          </div>
        </Space>
      )
    },
    { 
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Coordonnées</span>, 
      key: 'contact',
      width: 180,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <div style={{ fontSize: 13 }}>
            <MailOutlined style={{ color: COLORS.slate, marginRight: 6, fontSize: 12 }} />
            <Text style={{ color: COLORS.gray700 }}>{record.email || '-'}</Text>
          </div>
          <div style={{ fontSize: 13 }}>
            <PhoneOutlined style={{ color: COLORS.slate, marginRight: 6, fontSize: 12 }} />
            <Text style={{ color: COLORS.gray700 }}>{record.phone || '-'}</Text>
          </div>
        </Space>
      )
    },
    { 
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Valeur</span>, 
      dataIndex: 'expected_revenue', 
      key: 'value',
      width: 130,
      align: 'right',
      render: (val) => val ? (
        <Text strong style={{ color: COLORS.primary, fontSize: 15 }}>
          {Number(val).toLocaleString()} €
        </Text>
      ) : <Text type="secondary">-</Text>
    },
    { 
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Probabilité</span>, 
      dataIndex: 'probability', 
      key: 'probability',
      width: 120,
      render: (prob) => (
        <Progress 
          percent={prob || 0} 
          size="small" 
          strokeColor={prob > 70 ? COLORS.emerald : prob > 40 ? COLORS.amber : COLORS.primary}
          style={{ width: 100 }}
        />
      )
    },
    { 
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Statut</span>, 
      dataIndex: 'status', 
      key: 'status',
      width: 140,
      render: (status) => <StatusBadge status={status} />
    },
    {
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Actions</span>,
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Voir détails">
            <Button 
              size="small" 
              icon={<EyeOutlined />} 
              onClick={() => showLeadDetails(record)}
              style={{ color: COLORS.primary }}
            />
          </Tooltip>
          <Select 
            size="small" 
            value={record.status?.toLowerCase()}
            style={{ width: 110 }}
            onChange={(value) => handleStatusChange(record.id, value)}
            loading={updateLoading}
            styles={{ popup: { borderRadius: 12 } }}
          >
            <Option value="new">Nouveau</Option>
            <Option value="contacted">Contacté</Option>
            <Option value="qualified">Qualifié</Option>
            <Option value="proposal">Proposition</Option>
            <Option value="negotiation">Négociation</Option>
            <Option value="won">Gagné</Option>
            <Option value="lost">Perdu</Option>
          </Select>
        </Space>
      ),
    },
  ];

  // ===== CALCULS =====
  const totalLeads = leads.length;
  const activeLeads = leads.filter(l => !['won', 'lost'].includes(l.status?.toLowerCase())).length;
  const conversionRate = totalLeads > 0 ? (leads.filter(l => l.status?.toLowerCase() === 'won').length / totalLeads) * 100 : 0;
  const totalRevenue = leads.reduce((sum, l) => sum + (l.expected_revenue || 0), 0);

  const kpiIcons = [<DashboardOutlined />, <TeamOutlined />, <TrophyOutlined />, <DollarOutlined />];
  const kpiColors = [COLORS.primary, COLORS.primary, COLORS.emerald, COLORS.primary];
  const defaultKpis = [
    { title: 'Total leads', value: totalLeads, trend: 0 },
    { title: 'Leads actifs', value: activeLeads, trend: 0 },
    { title: 'Taux de conversion', value: conversionRate, suffix: '%', trend: 0 },
    { title: 'Valeur totale', value: totalRevenue, suffix: '€', trend: 0 }
  ];
  
  const displayKpis = kpiData.length > 0 ? kpiData : defaultKpis;

  // ===== RENDU =====

  if (loading && leads.length === 0) {
    return (
      <div style={{ 
        padding: 24, 
        textAlign: 'center', 
        minHeight: '100vh', 
        background: COLORS.slateSurface,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Spin size="large" tip="Chargement des données..." ><div/></Spin>
      </div>
    );
  }

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
            <TeamOutlined style={{ fontSize: 26, color: COLORS.white }} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: COLORS.gray900, fontWeight: 700 }}>
              Gestion des Leads
            </Title>
            <Text style={{ color: COLORS.slate, fontSize: 14 }}>
              Gérez vos leads, opportunités et relations clients
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
              icon={<ExportOutlined />} 
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
            icon={<UserAddOutlined />}
            onClick={() => setIsLeadModalVisible(true)}
            style={{ 
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, 
              border: 'none',
              borderRadius: 12,
              boxShadow: '0 4px 12px rgba(26,86,219,0.3)',
            }}
          >
            Nouveau lead
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
          {displayKpis.map((kpi, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <KpiCard
                title={kpi.title}
                value={kpi.value}
                icon={kpiIcons[index] || <DashboardOutlined />}
                trend={kpi.trend || 0}
                suffix={kpi.suffix || ''}
                color={kpiColors[index] || COLORS.primary}
              />
            </Col>
          ))}
        </Row>
      </motion.div>

      {/* ========== PIPELINE DES VENTES ========== */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
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
                <TrophyOutlined style={{ color: COLORS.white, fontSize: 16 }} />
              </div>
              <span style={{ fontWeight: 600, color: COLORS.gray800, fontSize: 16 }}>
                Pipeline des ventes
              </span>
              <Tag style={{ borderRadius: 20, background: COLORS.slateSurface, color: COLORS.slate, border: 'none' }}>
                {totalLeads} leads
              </Tag>
            </Space>
          }
          style={{ 
            marginBottom: 24, 
            borderRadius: 16, 
            border: `1px solid ${COLORS.gray200}`, 
            background: COLORS.white,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}
        >
          <Row gutter={[8, 16]} justify="center">
            {pipelineStats.map((stage, index) => (
              <Col xs={12} sm={8} md={3} key={index}>
                <StageProgress
                  stage={stage.name}
                  count={stage.count}
                  total={totalLeads}
                  color={stage.color}
                  icon={stage.icon}
                />
              </Col>
            ))}
          </Row>
        </Card>
      </motion.div>

      {/* ========== FILTRES ========== */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
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
                placeholder="Rechercher un lead..." 
                allowClear 
                enterButton={<FilterOutlined />}
                onSearch={(value) => {
                  setSearchText(value);
                  fetchData();
                }}
                onChange={(e) => !e.target.value && setSearchText('')}
                style={{ borderRadius: 10 }}
              />
            </Col>
            <Col xs={12} md={3}>
              <Select 
                placeholder="Statut"
                value={filterStatus}
                onChange={(value) => {
                  setFilterStatus(value);
                  fetchData();
                }}
                style={{ width: '100%', borderRadius: 10 }}
                allowClear
              >
                <Option value="all">Tous les statuts</Option>
                <Option value="new">Nouveau</Option>
                <Option value="contacted">Contacté</Option>
                <Option value="qualified">Qualifié</Option>
                <Option value="proposal">Proposition</Option>
                <Option value="negotiation">Négociation</Option>
                <Option value="won">Gagné</Option>
                <Option value="lost">Perdu</Option>
              </Select>
            </Col>
            <Col xs={12} md={3}>
              <Select 
                placeholder="Source"
                value={filterSource}
                onChange={(value) => {
                  setFilterSource(value);
                  fetchData();
                }}
                style={{ width: '100%', borderRadius: 10 }}
                allowClear
                suffixIcon={<GlobalOutlined style={{ color: COLORS.slateLight }} />}
              >
                <Option value="all">Toutes sources</Option>
                <Option value="site web">🌐 Site web</Option>
                <Option value="recommandation">🤝 Recommandation</Option>
                <Option value="réseaux sociaux">📱 Réseaux sociaux</Option>
                <Option value="email">📧 Email</Option>
                <Option value="appel">📞 Appel</Option>
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
                  fetchData();
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
                  fetchData();
                }}
                format="DD/MM/YYYY"
                placeholder={['Date début', 'Date fin']}
                disabled={period === 'all'}
              />
            </Col>
            <Col xs={24} md={3}>
              <Button 
                icon={<FilterOutlined />} 
                onClick={() => {
                  setFilterStatus('all');
                  setFilterSource('all');
                  setSearchText('');
                  setPeriod('30days');
                  setDateRange([dayjs().subtract(30, 'days'), dayjs()]);
                  fetchData();
                }}
                block 
                style={{ 
                  background: COLORS.slateSurface, 
                  color: COLORS.slate, 
                  borderRadius: 10,
                  border: 'none',
                }}
              >
                Réinitialiser
              </Button>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* ========== TABLEAU DES LEADS ========== */}
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
                <UserOutlined style={{ color: COLORS.white, fontSize: 16 }} />
              </div>
              <span style={{ fontWeight: 600, color: COLORS.gray800, fontSize: 16 }}>
                Leads
              </span>
              <Tag style={{ borderRadius: 20, background: COLORS.slateSurface, color: COLORS.slate, border: 'none' }}>
                {leads.length}
              </Tag>
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
            {leads.length === 0 ? (
              <Empty 
                description={
                  <div>
                    <Text style={{ color: COLORS.slate }}>Aucun lead trouvé</Text>
                    <br />
                    <Button 
                      type="primary" 
                      icon={<UserAddOutlined />} 
                      onClick={() => setIsLeadModalVisible(true)}
                      style={{ marginTop: 12, borderRadius: 10 }}
                    >
                      Ajouter un lead
                    </Button>
                  </div>
                }
                style={{ padding: '40px 0' }}
              />
            ) : (
              <Table 
                columns={columns} 
                dataSource={leads}
                rowKey="id"
                pagination={{ 
                  pageSize: 10, 
                  showSizeChanger: true,
                  showTotal: (total) => `${total} lead${total > 1 ? 's' : ''}`,
                  pageSizeOptions: ['10', '20', '50']
                }}
                scroll={{ x: 1000 }}
                size="middle"
                style={{ borderRadius: 12 }}
                rowClassName={(record) => {
                  if (record.status?.toLowerCase() === 'won') return 'row-won';
                  if (record.status?.toLowerCase() === 'lost') return 'row-lost';
                  return '';
                }}
              />
            )}
          </Spin>
        </Card>
      </motion.div>

      {/* ========== MODAL NOUVEAU LEAD ========== */}
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
              <UserAddOutlined style={{ color: COLORS.white, fontSize: 16 }} />
            </div>
            <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Nouveau lead</span>
          </Space>
        }
        open={isLeadModalVisible}
        onCancel={() => setIsLeadModalVisible(false)}
        footer={null}
        width={620}
        style={{ borderRadius: 20 }}
        styles={{ body: { paddingTop: 8 } }}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateLead}>
          <Card 
            title="Informations personnelles"
            size="small"
            style={{ 
              marginBottom: 16, 
              borderRadius: 14, 
              border: `1px solid ${COLORS.gray200}`,
              background: COLORS.gray50,
            }}
            styles={{ header: { borderBottom: `1px solid ${COLORS.gray200}` } }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  label="Prénom" 
                  name="first_name" 
                  rules={[{ required: true, message: 'Prénom requis' }]}
                  style={{ marginBottom: 8 }}
                >
                  <Input placeholder="Prénom" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  label="Nom" 
                  name="last_name" 
                  rules={[{ required: true, message: 'Nom requis' }]}
                  style={{ marginBottom: 8 }}
                >
                  <Input placeholder="Nom" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Entreprise" name="company" style={{ marginBottom: 8 }}>
              <Input placeholder="Nom de l'entreprise" style={{ borderRadius: 10 }} />
            </Form.Item>
          </Card>

          <Card 
            title="Coordonnées"
            size="small"
            style={{ 
              marginBottom: 16, 
              borderRadius: 14, 
              border: `1px solid ${COLORS.gray200}`,
              background: COLORS.gray50,
            }}
            styles={{ header: { borderBottom: `1px solid ${COLORS.gray200}` } }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  label="Email" 
                  name="email" 
                  rules={[{ type: 'email', message: 'Email invalide' }]}
                  style={{ marginBottom: 8 }}
                >
                  <Input 
                    prefix={<MailOutlined style={{ color: COLORS.slateLight }} />}
                    placeholder="email@exemple.com" 
                    style={{ borderRadius: 10 }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Téléphone" name="phone" style={{ marginBottom: 8 }}>
                  <Input 
                    prefix={<PhoneOutlined style={{ color: COLORS.slateLight }} />}
                    placeholder="06 12 34 56 78" 
                    style={{ borderRadius: 10 }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card 
            title="Informations commerciales"
            size="small"
            style={{ 
              marginBottom: 16, 
              borderRadius: 14, 
              border: `1px solid ${COLORS.gray200}`,
              background: COLORS.gray50,
            }}
            styles={{ header: { borderBottom: `1px solid ${COLORS.gray200}` } }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Source" name="source" initialValue="site web" style={{ marginBottom: 8 }}>
                  <Select style={{ borderRadius: 10 }}>
                    <Option value="site web">🌐 Site web</Option>
                    <Option value="recommandation">🤝 Recommandation</Option>
                    <Option value="réseaux sociaux">📱 Réseaux sociaux</Option>
                    <Option value="email">📧 Email</Option>
                    <Option value="appel">📞 Appel</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Valeur potentielle (€)" name="estimated_value" style={{ marginBottom: 8 }}>
                  <Input 
                    type="number" 
                    min={0} 
                    step={1000} 
                    prefix="€"
                    placeholder="0" 
                    style={{ borderRadius: 10 }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Form.Item label="Notes" name="notes">
            <TextArea rows={3} placeholder="Informations complémentaires..." style={{ borderRadius: 10 }} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button onClick={() => setIsLeadModalVisible(false)} size="large" style={{ borderRadius: 10 }}>
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
                Créer le lead
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* ========== MODAL DÉTAILS LEAD ========== */}
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
            <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Détails du lead</span>
            {selectedLead?.status && <StatusBadge status={selectedLead.status} />}
          </Space>
        }
        open={isDetailsModalVisible}
        onCancel={() => setIsDetailsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setIsDetailsModalVisible(false)} style={{ borderRadius: 10 }}>
            Fermer
          </Button>,
          selectedLead?.status?.toLowerCase() !== 'won' && selectedLead?.status?.toLowerCase() !== 'lost' && (
            <Button 
              key="convert" 
              type="primary" 
              icon={<SendOutlined />}
              onClick={() => handleConvertToCustomer(selectedLead?.id)}
              style={{ 
                background: COLORS.emerald, 
                border: 'none',
                borderRadius: 10,
              }}
            >
              Convertir en client
            </Button>
          )
        ]}
        width={720}
        style={{ borderRadius: 20 }}
      >
        {selectedLead && (
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
                size={64} 
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
                  fontSize: 28,
                }}
              >
                {selectedLead.name?.charAt(0) || '?'}
              </Avatar>
              <div>
                <Title level={4} style={{ margin: 0, color: COLORS.gray800 }}>
                  {selectedLead.name || 'Nom inconnu'}
                </Title>
                <Text style={{ color: COLORS.slate }}>
                  {selectedLead.company || 'Indépendant'}
                </Text>
                <div style={{ marginTop: 4 }}>
                  <Tag style={{ borderRadius: 20, background: COLORS.primarySurface, color: COLORS.primary, border: 'none' }}>
                    <GlobalOutlined style={{ marginRight: 4 }} />
                    {selectedLead.source || 'Source inconnue'}
                  </Tag>
                  <Tag style={{ borderRadius: 20, background: COLORS.slateSurface, color: COLORS.slate, border: 'none' }}>
                    <CalendarOutlined style={{ marginRight: 4 }} />
                    {dayjs(selectedLead.created_at).format('DD/MM/YYYY')}
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
              <Descriptions.Item label="Email">
                <Space>
                  <MailOutlined style={{ color: COLORS.slate }} />
                  <Text>{selectedLead.email || '-'}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Téléphone">
                <Space>
                  <PhoneOutlined style={{ color: COLORS.slate }} />
                  <Text>{selectedLead.phone || '-'}</Text>
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Valeur estimée">
                <Text strong style={{ color: COLORS.primary, fontSize: 16 }}>
                  {(selectedLead.expected_revenue || 0).toLocaleString()} €
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Probabilité">
                <Progress 
                  percent={selectedLead.probability || 0} 
                  size="small"
                  strokeColor={selectedLead.probability > 70 ? COLORS.emerald : selectedLead.probability > 40 ? COLORS.amber : COLORS.primary}
                  style={{ width: 120 }}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Statut" span={2}>
                <StatusBadge status={selectedLead.status} />
              </Descriptions.Item>
              {(selectedLead.notes || selectedLead.description) && (
                <Descriptions.Item label="Notes" span={2}>
                  <div style={{ 
                    background: COLORS.gray50, 
                    padding: 12, 
                    borderRadius: 10,
                    border: `1px solid ${COLORS.gray200}`,
                  }}>
                    <Text>{selectedLead.notes || selectedLead.description}</Text>
                  </div>
                </Descriptions.Item>
              )}
            </Descriptions>

            {selectedLead.status?.toLowerCase() === 'won' && (
              <Alert
                message="Lead gagné"
                description="Ce lead a été converti avec succès. Félicitations !"
                type="success"
                showIcon
                icon={<TrophyOutlined />}
                style={{ marginTop: 16, borderRadius: 12 }}
              />
            )}

            {selectedLead.status?.toLowerCase() === 'lost' && (
              <Alert
                message="Lead perdu"
                description="Ce lead n'a pas abouti. Il peut être réactivé ultérieurement."
                type="warning"
                showIcon
                icon={<FallOutlined />}
                style={{ marginTop: 16, borderRadius: 12 }}
              />
            )}
          </div>
        )}
      </Modal>

      {/* Styles CSS globaux */}
      <style jsx="true">{`
        .row-won {
          background: ${COLORS.emeraldSurface} !important;
        }
        .row-won:hover {
          background: #d1fae5 !important;
        }
        .row-lost {
          background: #fef2f2 !important;
        }
        .row-lost:hover {
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

export default CRMDashboard;