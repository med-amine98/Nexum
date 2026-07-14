// src/modules/hr/HRDashboard.js - Version optimisée avec gestion d'erreurs améliorée
import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Table, Button, Space, 
  Tag, Progress, Input, Select, Tooltip,
  Avatar, Badge, Tabs, Modal, Form, message, DatePicker,
  Spin, Typography, Empty, Alert, Descriptions,
} from 'antd';
import { 
  UserOutlined, TeamOutlined, RiseOutlined, FallOutlined, FileTextOutlined,
  PlusOutlined, FilterOutlined,
  EyeOutlined, CalendarOutlined,
  MailOutlined, PhoneOutlined, ReloadOutlined,
  GiftOutlined, CheckCircleOutlined,
  EnvironmentOutlined, ClockCircleOutlined,
  HeartOutlined, StarOutlined, CloseCircleOutlined,
  ExportOutlined, BankOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import api from '../../services/api';

dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const { Option } = Select;
const { Search } = Input;
const { TextArea } = Input;

// ============================================
// PALETTE DE COULEURS
// ============================================

const COLORS = {
  primary: '#1a56db',
  primaryDark: '#1e3a5f',
  primaryLight: '#3b82f6',
  primarySurface: '#e8edf5',
  slate: '#475569',
  slateLight: '#94a3b8',
  slateSurface: '#f1f5f9',
  navy: '#0f172a',
  emerald: '#059669',
  emeraldSurface: '#ecfdf5',
  red: '#dc2626',
  amber: '#d97706',
  amberLight: '#fbbf24',
  purple: '#7c3aed',
  rose: '#db2777',
  teal: '#0d9488',
  white: '#ffffff',
  gray50: '#f8fafc',
  gray200: '#e2e8f0',
  gray800: '#1e293b',
  gray900: '#0f172a',
};

// ============================================
// CONFIGURATION DES STATUTS
// ============================================

const STATUS_CONFIG = {
  'active': { 
    color: COLORS.emerald, 
    bg: COLORS.emeraldSurface,
    icon: <CheckCircleOutlined />, 
    label: 'Actif',
  },
  'on_leave': { 
    color: COLORS.amber, 
    bg: '#fef3c7',
    icon: <CalendarOutlined />, 
    label: 'En congé',
  },
  'inactive': { 
    color: COLORS.slate, 
    bg: COLORS.slateSurface,
    icon: <UserOutlined />, 
    label: 'Inactif',
  },
  'terminated': { 
    color: COLORS.red, 
    bg: '#fef2f2',
    icon: <CloseCircleOutlined />, 
    label: 'Terminé',
  }
};

const LEAVE_TYPE_CONFIG = {
  'annual': { color: COLORS.primary, label: 'Congés payés', icon: <StarOutlined /> },
  'sick': { color: COLORS.rose, label: 'Maladie', icon: <HeartOutlined /> },
  'unpaid': { color: COLORS.amber, label: 'Sans solde', icon: <ClockCircleOutlined /> },
  'maternity': { color: COLORS.purple, label: 'Congé maternité', icon: <HeartOutlined /> },
  'paternity': { color: COLORS.primary, label: 'Congé paternité', icon: <UserOutlined /> },
};

// ============================================
// COMPOSANTS STYLISÉS
// ============================================

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG['inactive'];
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

const KpiCard = ({ title, value, icon, trend, color, suffix = '' }) => (
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
            {suffix && <span style={{ fontSize: 16, fontWeight: 400, color: COLORS.slateLight, marginLeft: 4 }}>{suffix}</span>}
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

const EmployeeAvatar = ({ firstName, lastName, status, size = 44 }) => {
  const config = STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG['inactive'];
  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <Avatar 
        size={size} 
        style={{ 
          background: `linear-gradient(135deg, ${config.color}, ${COLORS.navy})`,
          fontSize: size > 40 ? 16 : 14,
          fontWeight: 600,
          color: COLORS.white,
        }}
      >
        {firstName?.charAt(0)}{lastName?.charAt(0)}
      </Avatar>
      <div style={{
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: size > 40 ? 14 : 10,
        height: size > 40 ? 14 : 10,
        borderRadius: '50%',
        background: config.color,
        border: `2px solid ${COLORS.white}`,
      }} />
    </div>
  );
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const HRDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [kpiData, setKpiData] = useState([]);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [birthdays, setBirthdays] = useState([]);
  
  const [isEmployeeModalVisible, setIsEmployeeModalVisible] = useState(false);
  const [isLeaveModalVisible, setIsLeaveModalVisible] = useState(false);
  const [isDepartmentModalVisible, setIsDepartmentModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedEmployeeDetails, setSelectedEmployeeDetails] = useState(null);
  
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [activeTab, setActiveTab] = useState('1');
  
  const [form] = Form.useForm();
  const [leaveForm] = Form.useForm();
  const [departmentForm] = Form.useForm();

  // ===== FONCTION POUR EXTRAIRE LES DONNÉES DE LA RÉPONSE =====
  const extractData = (response, defaultValue = []) => {
    if (!response) return defaultValue;
    
    // Structure { success: true, data: [...] }
    if (response.success === true && response.data !== undefined) {
      return Array.isArray(response.data) ? response.data : defaultValue;
    }
    // Tableau direct
    if (Array.isArray(response)) {
      return response;
    }
    // Structure { data: [...] }
    if (response.data && Array.isArray(response.data)) {
      return response.data;
    }
    // Structure { items: [...] } ou { results: [...] }
    if (response.items && Array.isArray(response.items)) {
      return response.items;
    }
    if (response.results && Array.isArray(response.results)) {
      return response.results;
    }
    
    return defaultValue;
  };

  // ===== GESTIONNAIRE D'ERREURS API =====
  const handleApiError = (error, context = 'opération') => {
    console.error(`❌ Erreur ${context}:`, error);
    
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      message.error('⏰ Le serveur met trop de temps à répondre. Veuillez réessayer.');
    } else if (error.response) {
      const errorMsg = error.response.data?.detail || 
                       error.response.data?.message || 
                       error.response.data?.error ||
                       `Erreur ${error.response.status}`;
      message.error(`❌ ${errorMsg}`);
    } else if (error.request) {
      message.error('🌐 Impossible de contacter le serveur. Vérifiez votre connexion.');
    } else {
      message.error(`❌ Une erreur est survenue: ${error.message || 'Erreur inconnue'}`);
    }
  };

  // ===== CHARGEMENT DES DONNÉES =====
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Employés
      const employeesRes = await api.get('/hr/employees');
      const employeesData = extractData(employeesRes.data);
      setEmployees(employeesData);
      
      // 2. Congés
      const leavesRes = await api.get('/hr/leaves');
      const leavesData = extractData(leavesRes.data);
      setLeaves(leavesData);
      
      // 3. Départements
      const departmentsRes = await api.get('/hr/departments');
      const departmentsData = extractData(departmentsRes.data);
      setDepartments(departmentsData);
      
      // 4. Stats départements
      const statsRes = await api.get('/hr/dashboard/departments');
      const statsData = extractData(statsRes.data);
      setDepartmentStats(statsData);
      
      // 5. Anniversaires
      const bdayRes = await api.get('/hr/dashboard/birthdays?days=30');
      const bdayData = extractData(bdayRes.data);
      setBirthdays(bdayData);
      
      // 6. KPIs - Format attendu par le frontend
      const kpiRes = await api.get('/hr/dashboard/kpi');
      let kpiDataValue = extractData(kpiRes.data);
      
      // Si le backend renvoie un objet avec des propriétés, le transformer en tableau
      if (!Array.isArray(kpiDataValue) && typeof kpiDataValue === 'object') {
        const total = kpiDataValue.total_employees || employeesData.length || 0;
        const active = kpiDataValue.active_employees || employeesData.filter(e => e?.status === 'active').length || 0;
        const onLeave = employeesData.filter(e => e?.status === 'on_leave').length || 0;
        const pending = leavesData.filter(l => l?.status === 'pending').length || 0;
        
        kpiDataValue = [
          { title: 'Total employés', value: total, color: COLORS.primary, trend: 5, icon: <TeamOutlined /> },
          { title: 'Employés actifs', value: active, color: COLORS.emerald, trend: 3, icon: <UserOutlined /> },
          { title: 'En congé', value: onLeave, color: COLORS.amber, trend: -2, icon: <CalendarOutlined /> },
          { title: 'Demandes en attente', value: pending, color: COLORS.red, trend: 10, icon: <ClockCircleOutlined /> }
        ];
      }
      
      // Si vide, utiliser les valeurs par défaut
      if (!Array.isArray(kpiDataValue) || kpiDataValue.length === 0) {
        const total = employeesData.length || 0;
        const active = employeesData.filter(e => e?.status === 'active').length || 0;
        const onLeave = employeesData.filter(e => e?.status === 'on_leave').length || 0;
        const pending = leavesData.filter(l => l?.status === 'pending').length || 0;
        
        kpiDataValue = [
          { title: 'Total employés', value: total, color: COLORS.primary, trend: 5, icon: <TeamOutlined /> },
          { title: 'Employés actifs', value: active, color: COLORS.emerald, trend: 3, icon: <UserOutlined /> },
          { title: 'En congé', value: onLeave, color: COLORS.amber, trend: -2, icon: <CalendarOutlined /> },
          { title: 'Demandes en attente', value: pending, color: COLORS.red, trend: 10, icon: <ClockCircleOutlined /> }
        ];
      }
      
      setKpiData(kpiDataValue);

    } catch (error) {
      console.error('❌ Erreur fetchData:', error);
      handleApiError(error, 'chargement des données');
      // Réinitialiser avec des valeurs par défaut
      setKpiData([
        { title: 'Total employés', value: 0, color: COLORS.primary, trend: 0, icon: <TeamOutlined /> },
        { title: 'Employés actifs', value: 0, color: COLORS.emerald, trend: 0, icon: <UserOutlined /> },
        { title: 'En congé', value: 0, color: COLORS.amber, trend: 0, icon: <CalendarOutlined /> },
        { title: 'Demandes en attente', value: 0, color: COLORS.red, trend: 0, icon: <ClockCircleOutlined /> }
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ===== GESTION DES CRÉATIONS =====
  const handleCreateDepartment = async (values) => {
    setSubmitting(true);
    try {
      const payload = {
        name: values.name,
        code: values.code || values.name.slice(0, 3).toUpperCase(),
        description: values.description || '',
        color: values.color || COLORS.primary
      };
      
      const response = await api.post('/hr/departments', payload);
      
      if (response.status === 200 || response.status === 201 || response.data?.success) {
        message.success('✅ Département créé avec succès');
        setIsDepartmentModalVisible(false);
        departmentForm.resetFields();
        await fetchData();
      } else {
        throw new Error(response.data?.message || 'Erreur lors de la création');
      }
    } catch (error) {
      handleApiError(error, 'création du département');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateEmployee = async (values) => {
    setSubmitting(true);
    try {
      const employeeData = {
        first_name: values.first_name?.trim(),
        last_name: values.last_name?.trim(),
        email: values.email?.trim(),
        phone: values.phone?.trim(),
        position: values.job_title?.trim(),
        department_id: values.department_id,
        hire_date: values.hire_date ? values.hire_date.format('YYYY-MM-DD') : null,
        birth_date: values.birth_date ? values.birth_date.format('YYYY-MM-DD') : null,
        address: values.address?.trim(),
        city: values.city?.trim(),
        status: 'active'
      };
      
      const response = await api.post('/hr/employees', employeeData);
      
      if (response.status === 200 || response.status === 201 || response.data?.success) {
        message.success('✅ Employé créé avec succès');
        setIsEmployeeModalVisible(false);
        form.resetFields();
        await fetchData();
      } else {
        throw new Error(response.data?.message || 'Erreur lors de la création');
      }
    } catch (error) {
      handleApiError(error, 'création de l\'employé');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateLeave = async (values) => {
    setSubmitting(true);
    try {
      const leaveData = {
        employee_id: selectedEmployee?.id,
        leave_type: values.leave_type,
        start_date: values.dates[0].format('YYYY-MM-DD'),
        end_date: values.dates[1].format('YYYY-MM-DD'),
        reason: values.reason?.trim() || ''
      };
      
      const response = await api.post('/hr/leaves', leaveData);
      
      if (response.status === 200 || response.status === 201 || response.data?.success) {
        message.success('✅ Demande de congé envoyée avec succès');
        setIsLeaveModalVisible(false);
        leaveForm.resetFields();
        await fetchData();
      } else {
        throw new Error(response.data?.message || 'Erreur lors de la demande');
      }
    } catch (error) {
      handleApiError(error, 'demande de congé');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveLeave = async (leaveId) => {
    setSubmitting(true);
    try {
      const response = await api.put(`/hr/leaves/${leaveId}/approve`);
      if (response.status === 200 || response.status === 201) {
        message.success('✅ Congé approuvé avec succès');
        await fetchData();
      }
    } catch (error) {
      handleApiError(error, 'approbation du congé');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRejectLeave = (leaveId) => {
    Modal.confirm({
      title: 'Rejeter la demande',
      content: 'Êtes-vous sûr de vouloir rejeter cette demande de congé ?',
      okText: 'Oui, rejeter',
      okType: 'danger',
      cancelText: 'Non',
      onOk: async () => {
        setSubmitting(true);
        try {
          const response = await api.put(`/hr/leaves/${leaveId}/reject`);
          if (response.status === 200 || response.status === 201) {
            message.warning('⛔ Demande rejetée');
            await fetchData();
          }
        } catch (error) {
          handleApiError(error, 'rejet du congé');
        } finally {
          setSubmitting(false);
        }
      }
    });
  };

  const handleViewEmployeeDetails = async (employee) => {
    try {
      const response = await api.get(`/hr/employees/${employee.id}`);
      let detailsData = response.data;
      if (response.data && response.data.success === true) {
        detailsData = response.data.data || response.data;
      }
      setSelectedEmployeeDetails(detailsData);
      setDetailsModalVisible(true);
    } catch (error) {
      handleApiError(error, 'chargement des détails');
    }
  };

  const getLeaveTypeConfig = (type) => {
    return LEAVE_TYPE_CONFIG[type?.toLowerCase()] || { color: COLORS.slate, label: type || 'Inconnu', icon: <FileTextOutlined /> };
  };

  // ===== FILTRES =====
  const filteredEmployees = Array.isArray(employees) ? employees.filter(emp => {
    if (!emp) return false;
    if (filterDepartment !== 'all' && emp.department_id !== parseInt(filterDepartment)) return false;
    if (filterStatus !== 'all' && emp.status?.toLowerCase() !== filterStatus) return false;
    if (searchText) {
      const search = searchText.toLowerCase();
      const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
      const email = (emp.email || '').toLowerCase();
      const position = (emp.position || '').toLowerCase();
      if (!fullName.includes(search) && !email.includes(search) && !position.includes(search)) return false;
    }
    return true;
  }) : [];

  const pendingLeaves = leaves.filter(l => l && l.status === 'pending').length || 0;
  const totalEmployees = employees.length || 0;

  // ===== COLONNES TABLEAU =====
  const columns = [
    { 
      title: 'Employé', 
      key: 'employee',
      width: 260,
      fixed: 'left',
      render: (_, record) => (
        <Space>
          <EmployeeAvatar 
            firstName={record.first_name} 
            lastName={record.last_name} 
            status={record.status}
          />
          <div>
            <Text strong style={{ color: COLORS.gray800, fontSize: 15 }}>
              {record.first_name} {record.last_name}
            </Text>
            <br />
            <Text style={{ color: COLORS.slateLight, fontSize: 12 }}>
              {record.position || 'Poste non défini'}
            </Text>
          </div>
        </Space>
      )
    },
    { 
      title: 'Département', 
      key: 'department',
      width: 150,
      render: (_, record) => {
        const dept = departments.find(d => d.id === record.department_id);
        return dept ? (
          <Tag 
            color={dept.color || COLORS.primary} 
            style={{ borderRadius: 20, padding: '4px 14px', fontWeight: 500, border: 'none' }}
          >
            {dept.name}
          </Tag>
        ) : <span style={{ color: COLORS.slateLight }}>-</span>;
      }
    },
    { 
      title: 'Contact', 
      key: 'contact',
      width: 200,
      render: (_, record) => (
        <Space direction="vertical" size={2}>
          <div style={{ fontSize: 13, color: COLORS.gray700 }}>
            <MailOutlined style={{ color: COLORS.slateLight, marginRight: 6, fontSize: 12 }} />
            {record.email}
          </div>
          <div style={{ fontSize: 13, color: COLORS.gray700 }}>
            <PhoneOutlined style={{ color: COLORS.slateLight, marginRight: 6, fontSize: 12 }} />
            {record.phone || '-'}
          </div>
        </Space>
      )
    },
    { 
      title: 'Statut', 
      dataIndex: 'status', 
      key: 'status',
      width: 130,
      render: (status) => <StatusBadge status={status} />
    },
    { 
      title: 'Embauche', 
      dataIndex: 'hire_date', 
      key: 'hire_date',
      width: 120,
      render: (text) => text ? dayjs(text).format('DD/MM/YYYY') : '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Voir détails">
            <Button 
              type="text" 
              icon={<EyeOutlined style={{ color: COLORS.primary }} />} 
              onClick={() => handleViewEmployeeDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Demander congé">
            <Button 
              type="text" 
              icon={<CalendarOutlined style={{ color: COLORS.amber }} />} 
              onClick={() => {
                setSelectedEmployee(record);
                setIsLeaveModalVisible(true);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ===== RENDU =====
  if (loading && employees.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: COLORS.slateSurface }}>
        <Spin size="large" tip="Chargement des données..." ><div/></Spin>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{ padding: 24, background: COLORS.slateSurface, minHeight: '100vh' }}
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
              Ressources Humaines
            </Title>
            <Text style={{ color: COLORS.slate, fontSize: 14 }}>
              Gérez vos employés, congés et absences
            </Text>
          </div>
        </div>
        <Space size="middle" wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading} style={{ borderRadius: 12 }}>
            Actualiser
          </Button>
          <Button icon={<ExportOutlined />} onClick={() => message.info('📊 Export en développement')} style={{ borderRadius: 12 }}>
            Exporter
          </Button>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setIsEmployeeModalVisible(true)}
            style={{ 
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, 
              border: 'none',
              borderRadius: 12,
              boxShadow: '0 4px 12px rgba(26,86,219,0.3)',
            }}
          >
            Nouvel employé
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
          {Array.isArray(kpiData) && kpiData.map((kpi, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <KpiCard
                title={kpi.title}
                value={kpi.value}
                icon={kpi.icon}
                trend={kpi.trend}
                color={kpi.color}
              />
            </Col>
          ))}
        </Row>
      </motion.div>

      {/* ========== CONTENU PRINCIPAL ========== */}
      <Row gutter={[24, 24]}>
        {/* Colonne de gauche - Départements & Anniversaires */}
        <Col xs={24} lg={7}>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            {/* Départements */}
            <Card 
              title={
                <Space size="middle">
                  <div style={{ 
                    width: 32, 
                    height: 32, 
                    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <BankOutlined style={{ color: COLORS.white, fontSize: 16 }} />
                  </div>
                  <span style={{ fontWeight: 600, color: COLORS.gray800, fontSize: 15 }}>Départements</span>
                  <Tag style={{ borderRadius: 20, background: COLORS.slateSurface, color: COLORS.slate, border: 'none' }}>
                    {departmentStats.length || departments.length}
                  </Tag>
                </Space>
              }
              extra={
                <Button 
                  type="link" 
                  icon={<PlusOutlined />}
                  onClick={() => setIsDepartmentModalVisible(true)}
                  style={{ color: COLORS.primary, padding: 0 }}
                >
                  Ajouter
                </Button>
              }
              style={{ 
                borderRadius: 16, 
                border: `1px solid ${COLORS.gray200}`, 
                background: COLORS.white,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                marginBottom: 24,
              }}
            >
              {(() => {
                const deptsToShow = departmentStats.length > 0 ? departmentStats : departments;
                
                if (deptsToShow.length === 0) {
                  return <Empty description="Aucun département" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '20px 0' }} />;
                }
                
                return deptsToShow.map((dept, index) => {
                  let empCount = dept.employees_count || dept.count || dept.employee_count || 0;
                  if (empCount === 0 && departments.length > 0) {
                    empCount = employees.filter(e => e.department_id === dept.id).length;
                  }
                  
                  const percent = totalEmployees > 0 ? Math.round((empCount / totalEmployees) * 100) : 0;
                  
                  return (
                    <motion.div
                      key={dept.id || index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 + index * 0.05 }}
                      style={{ marginBottom: 16 }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Space>
                          <div style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: dept.color || COLORS.primary,
                          }} />
                          <Text strong style={{ color: COLORS.gray800 }}>{dept.name}</Text>
                        </Space>
                        <Text style={{ color: COLORS.slateLight, fontWeight: 500, fontSize: 13 }}>
                          {empCount} employé{empCount > 1 ? 's' : ''}
                        </Text>
                      </div>
                      <Progress 
                        percent={percent}
                        strokeColor={dept.color || COLORS.primary}
                        showInfo={false}
                        strokeWidth={6}
                        style={{ borderRadius: 4 }}
                      />
                    </motion.div>
                  );
                });
              })()}
            </Card>

            {/* Anniversaires */}
            <Card 
              title={
                <Space size="middle">
                  <div style={{ 
                    width: 32, 
                    height: 32, 
                    background: `linear-gradient(135deg, ${COLORS.amber}, ${COLORS.amberLight})`,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <GiftOutlined style={{ color: COLORS.white, fontSize: 16 }} />
                  </div>
                  <span style={{ fontWeight: 600, color: COLORS.gray800, fontSize: 15 }}>Anniversaires</span>
                  <Tag style={{ borderRadius: 20, background: COLORS.slateSurface, color: COLORS.slate, border: 'none' }}>
                    {birthdays.length}
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
              {birthdays.length > 0 ? (
                birthdays.map((bday, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + idx * 0.05 }}
                    style={{ 
                      padding: '12px 0',
                      borderBottom: idx < birthdays.length - 1 ? `1px solid ${COLORS.gray200}` : 'none'
                    }}
                  >
                    <Space>
                      <Avatar 
                        size={36} 
                        style={{ 
                          background: `linear-gradient(135deg, ${COLORS.amber}, ${COLORS.amberLight})`,
                          color: COLORS.white,
                          fontWeight: 600,
                        }}
                      >
                        {bday.name?.charAt(0)}
                      </Avatar>
                      <div>
                        <Text strong style={{ color: COLORS.gray800 }}>{bday.name}</Text>
                        <div style={{ fontSize: 12, color: COLORS.slateLight }}>
                          <CalendarOutlined style={{ marginRight: 4 }} />
                          {dayjs(bday.birth_date || bday.date).format('DD/MM')} · {bday.age || '?'} ans
                        </div>
                      </div>
                    </Space>
                  </motion.div>
                ))
              ) : (
                <Empty description="Aucun anniversaire à venir" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: '20px 0' }} />
              )}
            </Card>
          </motion.div>
        </Col>

        {/* Colonne de droite - Employés & Congés */}
        <Col xs={24} lg={17}>
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <Card
              style={{ 
                borderRadius: 16, 
                border: `1px solid ${COLORS.gray200}`, 
                background: COLORS.white,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
              styles={{ body: { padding: 0 } }}
            >
              <Tabs 
                activeKey={activeTab}
                onChange={setActiveTab}
                size="large"
                style={{ padding: '0 20px' }}
                tabBarStyle={{ margin: 0, borderBottom: `1px solid ${COLORS.gray200}` }}
                items={[
                  {
                    key: '1',
                    label: (
                      <Space>
                        <UserOutlined />
                        <span>Employés</span>
                        <Badge 
                          count={filteredEmployees.length} 
                          style={{ backgroundColor: COLORS.primary, marginLeft: 4 }}
                        />
                      </Space>
                    ),
                    children: (
                      <div style={{ padding: '16px 0' }}>
                        {/* Filtres */}
                        <Row gutter={[16, 12]} style={{ marginBottom: 16 }}>
                          <Col xs={24} sm={8}>
                            <Search 
                              placeholder="Rechercher..." 
                              allowClear 
                              onSearch={setSearchText}
                              onChange={(e) => !e.target.value && setSearchText('')}
                              style={{ borderRadius: 10 }}
                            />
                          </Col>
                          <Col xs={12} sm={5}>
                            <Select 
                              placeholder="Département"
                              value={filterDepartment}
                              onChange={setFilterDepartment}
                              style={{ width: '100%', borderRadius: 10 }}
                              allowClear
                              loading={departmentsLoading}
                            >
                              <Option value="all">Tous départements</Option>
                              {departments.map(d => (
                                <Option key={d.id} value={String(d.id)}>{d.name}</Option>
                              ))}
                            </Select>
                          </Col>
                          <Col xs={12} sm={5}>
                            <Select 
                              placeholder="Statut"
                              value={filterStatus}
                              onChange={setFilterStatus}
                              style={{ width: '100%', borderRadius: 10 }}
                              allowClear
                            >
                              <Option value="all">Tous statuts</Option>
                              <Option value="active">Actif</Option>
                              <Option value="on_leave">En congé</Option>
                              <Option value="inactive">Inactif</Option>
                              <Option value="terminated">Terminé</Option>
                            </Select>
                          </Col>
                          <Col xs={24} sm={6}>
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
                              Filtrer
                            </Button>
                          </Col>
                        </Row>

                        <Table 
                          columns={columns} 
                          dataSource={filteredEmployees}
                          rowKey="id"
                          pagination={{ 
                            pageSize: 10, 
                            showSizeChanger: true, 
                            showTotal: (total) => (
                              <span style={{ color: COLORS.slate }}>
                                Total: {total} employé{total > 1 ? 's' : ''}
                              </span>
                            ),
                            pageSizeOptions: ['10', '20', '50'],
                            showQuickJumper: true
                          }}
                          locale={{ emptyText: 'Aucun employé trouvé' }}
                          scroll={{ x: 1000 }}
                          size="middle"
                          style={{ borderRadius: 12 }}
                          rowClassName={(record) => {
                            if (record.status === 'active') return 'row-active';
                            if (record.status === 'on_leave') return 'row-leave';
                            if (record.status === 'terminated') return 'row-terminated';
                            return '';
                          }}
                        />
                      </div>
                    )
                  },
                  {
                    key: '2',
                    label: (
                      <Space>
                        <CalendarOutlined />
                        <span>Congés</span>
                        <Badge 
                          count={pendingLeaves} 
                          style={{ backgroundColor: COLORS.red, marginLeft: 4 }}
                        />
                      </Space>
                    ),
                    children: (
                      <div style={{ padding: '16px 0' }}>
                        <div style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: 16,
                        }}>
                          <Space>
                            <ClockCircleOutlined style={{ color: COLORS.amber, fontSize: 18 }} />
                            <Text strong style={{ color: COLORS.gray800, fontSize: 15 }}>Demandes en attente</Text>
                            <Tag color="warning" style={{ borderRadius: 20 }}>{pendingLeaves}</Tag>
                          </Space>
                        </div>

                        {pendingLeaves > 0 ? (
                          <AnimatePresence>
                            {leaves.filter(l => l && l.status === 'pending').map((leave, idx) => {
                              const employee = employees.find(e => e && e.id === leave.employee_id);
                              const daysCount = dayjs(leave.end_date).diff(dayjs(leave.start_date), 'day') + 1;
                              const leaveType = getLeaveTypeConfig(leave.leave_type);
                              return (
                                <motion.div
                                  key={idx}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: idx * 0.05 }}
                                  style={{ 
                                    padding: '16px 20px', 
                                    marginBottom: 12,
                                    background: COLORS.gray50,
                                    borderRadius: 14,
                                    border: `1px solid ${COLORS.gray200}`,
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    flexWrap: 'wrap',
                                    gap: 12,
                                  }}
                                >
                                  <Space>
                                    <Avatar 
                                      size={44} 
                                      style={{ 
                                        background: `linear-gradient(135deg, ${COLORS.amber}, ${COLORS.amberLight})`,
                                        color: COLORS.white,
                                        fontWeight: 600,
                                      }}
                                    >
                                      {employee?.first_name?.charAt(0)}{employee?.last_name?.charAt(0)}
                                    </Avatar>
                                    <div>
                                      <Text strong style={{ color: COLORS.gray800, fontSize: 15 }}>
                                        {employee?.first_name} {employee?.last_name}
                                      </Text>
                                      <br />
                                      <Text style={{ color: COLORS.slateLight, fontSize: 12 }}>{employee?.position}</Text>
                                      <div style={{ marginTop: 4 }}>
                                        <Tag color={leaveType.color} style={{ borderRadius: 20, fontSize: 11 }}>
                                          {leaveType.icon} {leaveType.label}
                                        </Tag>
                                      </div>
                                    </div>
                                  </Space>
                                  <div style={{ textAlign: 'right' }}>
                                    <div>
                                      <CalendarOutlined style={{ color: COLORS.slateLight, marginRight: 4 }} />
                                      <Text style={{ color: COLORS.gray700 }}>{dayjs(leave.start_date).format('DD/MM/YYYY')}</Text>
                                      <Text style={{ color: COLORS.slateLight }}> → </Text>
                                      <Text style={{ color: COLORS.gray700 }}>{dayjs(leave.end_date).format('DD/MM/YYYY')}</Text>
                                    </div>
                                    <div style={{ marginTop: 4 }}>
                                      <Text style={{ color: COLORS.slateLight, fontSize: 12 }}>
                                        Durée: {daysCount} jour{daysCount > 1 ? 's' : ''}
                                      </Text>
                                    </div>
                                    <Space style={{ marginTop: 8 }}>
                                      <Button 
                                        size="small" 
                                        type="primary" 
                                        icon={<CheckCircleOutlined />}
                                        onClick={() => handleApproveLeave(leave.id)}
                                        loading={submitting}
                                        style={{ background: COLORS.emerald, border: 'none', borderRadius: 20 }}
                                      >
                                        Approuver
                                      </Button>
                                      <Button 
                                        size="small" 
                                        danger
                                        icon={<CloseCircleOutlined />}
                                        onClick={() => handleRejectLeave(leave.id)}
                                        style={{ borderRadius: 20 }}
                                      >
                                        Rejeter
                                      </Button>
                                    </Space>
                                  </div>
                                </motion.div>
                              );
                            })}
                          </AnimatePresence>
                        ) : (
                          <div style={{ 
                            textAlign: 'center', 
                            padding: '40px 0',
                            background: COLORS.gray50,
                            borderRadius: 14,
                            border: `1px solid ${COLORS.gray200}`,
                          }}>
                            <CheckCircleOutlined style={{ fontSize: 48, marginBottom: 16, color: COLORS.emerald }} />
                            <Text style={{ color: COLORS.slateLight, display: 'block' }}>Aucune demande en attente</Text>
                            <Text style={{ color: COLORS.slateLight, fontSize: 13 }}>Toutes les demandes ont été traitées</Text>
                          </div>
                        )}
                      </div>
                    )
                  }
                ]}
              />
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* ========== MODALS ========== */}
      {/* Les modals restent inchangées - gardez votre code existant pour les modals */}

      {/* Styles CSS globaux */}
      <style jsx="true">{`
        .row-active { background: ${COLORS.emeraldSurface} !important; }
        .row-active:hover { background: #d1fae5 !important; }
        .row-leave { background: #fef3c7 !important; }
        .row-leave:hover { background: #fde68a !important; }
        .row-terminated { background: #fef2f2 !important; }
        .row-terminated:hover { background: #fee2e2 !important; }
        .ant-table-row { transition: background 0.2s ease; }
        .ant-table-row:hover { background: ${COLORS.gray50} !important; }
        .ant-tabs-tab-active .ant-tabs-tab-btn { color: ${COLORS.primary} !important; }
        .ant-tabs-ink-bar { background: ${COLORS.primary} !important; }
      `}</style>
    </motion.div>
  );
};

export default HRDashboard;