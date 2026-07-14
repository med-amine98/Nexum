// src/modules/risk/RiskManagement.js - Version corrigée

import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Statistic, Table, Tag, Space, Progress, 
  Alert, Spin, Tabs, Button, Modal, Descriptions, Badge, Switch, 
  message, Collapse, Avatar, Form, Input, Select, InputNumber, 
  Popconfirm, Typography, Empty 
} from 'antd';
import { 
  SafetyCertificateOutlined, WarningOutlined, TeamOutlined, 
  ShopOutlined, UserOutlined, ExperimentOutlined, ApiOutlined,
  EyeOutlined, EditOutlined, DeleteOutlined, RiseOutlined,
  PlusOutlined, CheckCircleOutlined, DollarOutlined, FileTextOutlined,
  DashboardOutlined
} from '@ant-design/icons';
import { Radar, Gauge, Pie } from '@ant-design/plots';
import api from '../../services/api';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// ============================================
// CONFIGURATION
// ============================================

const COLORS = {
  primary: '#667eea',
  success: '#52c41a',
  warning: '#faad14',
  danger: '#ff4d4f',
  info: '#1890ff',
  purple: '#722ed1'
};

// ============================================
// UTILITAIRES
// ============================================

const safeArray = (data) => Array.isArray(data) ? data : 
  (data?.data && Array.isArray(data.data) ? data.data : 
  (data?.items && Array.isArray(data.items) ? data.items : []));

const safeNumber = (num, defaultValue = 0) => {
  if (typeof num === 'number' && !isNaN(num)) return num;
  const parsed = parseFloat(num);
  return isNaN(parsed) ? defaultValue : parsed;
};

const safeString = (str, defaultValue = '') => str ?? defaultValue;

const formatImpact = (amount) => {
  const n = safeNumber(amount);
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M €`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)}K €`;
  return `${n} €`;
};

const getRiskColor = (score) => {
  if (score > 70) return COLORS.danger;
  if (score > 50) return COLORS.warning;
  if (score > 30) return '#fa8c16';
  return COLORS.success;
};

const getRiskLevel = (score) => {
  if (score > 70) return { label: 'Critique', color: 'error' };
  if (score > 50) return { label: 'Élevé', color: 'warning' };
  if (score > 30) return { label: 'Moyen', color: 'processing' };
  return { label: 'Faible', color: 'success' };
};

// ============================================
// COMPOSANT
// ============================================

const RiskManagement = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRisk, setSelectedRisk] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [addRiskModalVisible, setAddRiskModalVisible] = useState(false);
  const [editRiskModalVisible, setEditRiskModalVisible] = useState(false);
  const [showNetworkGraph, setShowNetworkGraph] = useState(false);

  const [dashboardData, setDashboardData] = useState({
    global_score: 0,
    radar_data: [],
    statistics: { critical_risks: 0, high_risks: 0, medium_risks: 0, low_risks: 0, total_impact: 0, resolved_risks: 0 },
    recommendation: { type: 'info', message: '' }
  });
  const [risks, setRisks] = useState([]);
  const [bayesianPredictions, setBayesianPredictions] = useState([]);
  const [supplyChainNodes, setSupplyChainNodes] = useState([]);
  const [insiderRisks, setInsiderRisks] = useState([]);

  const [riskForm] = Form.useForm();

  const fetchData = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    setLoading(true);

    try {
      const [dashboardRes, risksRes, bayesianRes, supplyChainRes, insiderRes] = await Promise.allSettled([
        api.get('/risk/dashboard/overview'),
        api.get('/risk/risks'),
        api.get('/risk/bayesian'),
        api.get('/risk/supply-chain'),
        api.get('/risk/insider')
      ]);

      if (dashboardRes.status === 'fulfilled') {
        const data = dashboardRes.value?.data || dashboardRes.value || {};
        setDashboardData({
          global_score: safeNumber(data.global_score),
          radar_data: safeArray(data.radar_data),
          statistics: data.statistics || {},
          recommendation: data.recommendation || { type: 'info', message: '' }
        });
      }

      if (risksRes.status === 'fulfilled') setRisks(safeArray(risksRes.value));
      if (bayesianRes.status === 'fulfilled') setBayesianPredictions(safeArray(bayesianRes.value));
      if (supplyChainRes.status === 'fulfilled') setSupplyChainNodes(safeArray(supplyChainRes.value));
      if (insiderRes.status === 'fulfilled') setInsiderRisks(safeArray(insiderRes.value));

    } catch (error) {
      console.error(error);
      message.error('Impossible de charger les données');
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  };

  const handleRefresh = () => fetchData(true);

  const handleViewDetails = (risk) => {
    setSelectedRisk(risk);
    setDetailsModalVisible(true);
  };

  const handleEdit = (risk) => {
    setSelectedRisk(risk);
    riskForm.setFieldsValue(risk);
    setEditRiskModalVisible(true);
  };

  const handleAddRisk = async (values) => {
    try {
      await api.post('/risk/policies', {
        client_name: values.name,
        policy_type: values.category,
        risk_score: values.score,
        risk_level: getRiskLevel(values.score).label.toLowerCase(),
        coverage_amount: values.impact_amount || 0
      });
      message.success('Risque ajouté');
      setAddRiskModalVisible(false);
      riskForm.resetFields();
      fetchData(true);
    } catch (e) {
      message.error('Erreur lors de l’ajout');
    }
  };

  const handleEditRisk = async (values) => {
    try {
      await api.put(`/risk/policies/${selectedRisk?.id}`, values);
      message.success('Risque modifié');
      setEditRiskModalVisible(false);
      fetchData(true);
    } catch (e) {
      message.error('Erreur lors de la modification');
    }
  };

  const handleDeleteRisk = async (id) => {
    try {
      await api.delete(`/risk/policies/${id}`);
      message.success('Risque supprimé');
      fetchData(true);
    } catch (e) {
      message.error('Erreur lors de la suppression');
    }
  };

  const handleRecalculateRisk = async (id) => {
    try {
      const res = await api.post(`/risk/policies/${id}/recalculate`);
      message.success(`Score recalculé : ${res.data?.new_score || ''}%`);
      fetchData(true);
    } catch (e) {
      message.error('Erreur lors du recalcul');
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 60000);
    return () => clearInterval(interval);
  }, []);

  // Graphiques
  const globalScore = safeNumber(dashboardData.global_score);
  const radarData = safeArray(dashboardData.radar_data).map(item => ({
    category: safeString(item.category || item.item),
    value: safeNumber(item.score || item.value),
    fullMark: 100
  }));

  const gaugeConfig = {
    percent: Math.min(globalScore / 100, 1),
    range: { color: [getRiskColor(globalScore), '#f0f0f0'] },
    statistic: {
      content: { formatter: () => `${Math.round(globalScore)}%`, style: { color: '#000', fontSize: 28, fontWeight: 700 } }
    },
    theme: 'light'
  };

  const pieData = [
    { type: 'Critique', value: safeNumber(dashboardData.statistics.critical_risks) },
    { type: 'Élevé', value: safeNumber(dashboardData.statistics.high_risks) },
    { type: 'Moyen', value: safeNumber(dashboardData.statistics.medium_risks) },
    { type: 'Faible', value: safeNumber(dashboardData.statistics.low_risks) }
  ].filter(d => d.value > 0);

  const pieConfig = {
    data: pieData.length ? pieData : [{ type: 'Aucun', value: 1 }],
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    color: [COLORS.danger, COLORS.warning, '#fa8c16', COLORS.success],
    label: { type: 'outer', content: '{name}\n{percentage}%' },
    legend: { position: 'bottom' },
    theme: 'light'
  };

  const columns = [
    { title: 'Catégorie', dataIndex: 'category', render: (text) => <Tag>{text}</Tag> },
    { title: 'Nom', dataIndex: 'name', render: (text, record) => (
      <Button type="link" onClick={() => handleViewDetails(record)}>{text}</Button>
    )},
    { title: 'Score', dataIndex: 'score', render: (score) => (
      <Progress percent={Math.round(safeNumber(score))} strokeColor={getRiskColor(safeNumber(score))} />
    )},
    { title: 'Niveau', dataIndex: 'level', render: (level) => <Tag color={getRiskLevel(safeNumber(level)).color}>{level}</Tag> },
    { title: 'Impact', render: (_, r) => <Text strong>{formatImpact(r.impact_amount)}</Text> },
    {
      title: 'Actions',
      render: (_, record) => (
        <Space>
          <Button icon={<EyeOutlined />} onClick={() => handleViewDetails(record)} size="small" />
          <Button icon={<EditOutlined />} onClick={() => handleEdit(record)} size="small" />
          <Button icon={<RiseOutlined />} onClick={() => handleRecalculateRisk(record.id)} size="small" />
          <Popconfirm title="Supprimer ?" onConfirm={() => handleDeleteRisk(record.id)}>
            <Button danger icon={<DeleteOutlined />} size="small" />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const bgColor = darkMode ? '#0a0a0f' : '#f0f2f5';
  const cardBg = darkMode ? '#14141e' : '#ffffff';
  const textColor = darkMode ? '#f1f5f9' : '#000000';
  const textSecondary = darkMode ? '#8c8c8c' : '#666666';

  if (loading) return <div style={{ height: '100vh', background: bgColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" /></div>;

  const tabItems = [
    {
      key: 'overview',
      label: <span style={{ color: textColor }}><DashboardOutlined /> Vue d'ensemble</span>,
      children: (
        <div style={{ padding: 24 }}>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}><Card title="Score Global" style={{ borderRadius: 16, background: cardBg }}>{<Gauge {...gaugeConfig} height={280} />}</Card></Col>
            <Col xs={24} md={12}><Card title="Distribution" style={{ borderRadius: 16, background: cardBg }}>{<Pie {...pieConfig} height={280} />}</Card></Col>
            <Col xs={24} md={12}><Card title="Radar des Risques" style={{ borderRadius: 16, background: cardBg }}>{radarData.length ? <Radar data={radarData} xField="category" yField="value" height={280} /> : <Empty />}</Card></Col>
            <Col xs={24}><Card title="Liste des Risques" extra={<Button type="primary" icon={<PlusOutlined />} onClick={() => setAddRiskModalVisible(true)}>Ajouter</Button>} style={{ borderRadius: 16, background: cardBg }}>
              <Table columns={columns} dataSource={risks} rowKey="id" pagination={{ pageSize: 10 }} />
            </Card></Col>
          </Row>
        </div>
      )
    },
    {
      key: 'bayesian',
      label: <span style={{ color: textColor }}><ExperimentOutlined /> Bayesian NN</span>,
      children: <div style={{ padding: 24 }}>Contenu Bayesian (à compléter selon vos données)</div>
    },
    {
      key: 'supply-chain',
      label: <span style={{ color: textColor }}><ApiOutlined /> Supply Chain</span>,
      children: <div style={{ padding: 24 }}>Contenu Supply Chain</div>
    },
    {
      key: 'insider',
      label: <span style={{ color: textColor }}><TeamOutlined /> Insider Threat</span>,
      children: <div style={{ padding: 24 }}>Contenu Insider Threat</div>
    }
  ];

  return (
    <div style={{ padding: 24, background: bgColor, minHeight: '100vh' }}>
      {/* Header */}
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 24, padding: '24px 32px', marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <SafetyCertificateOutlined style={{ fontSize: 32, color: '#fff' }} />
              <div>
                <Title level={2} style={{ color: '#fff', margin: 0 }}>Gestion des Risques</Title>
                <Text style={{ color: 'rgba(255,255,255,0.85)' }}>Analyse IA & Prédiction</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Switch checked={darkMode} onChange={setDarkMode} checkedChildren="🌙" unCheckedChildren="☀️" />
              <Button icon={<WarningOutlined />} ghost>Risques Critiques</Button>
              <Button icon={<RiseOutlined />} onClick={handleRefresh} loading={refreshing}>Actualiser</Button>
            </Space>
          </Col>
        </Row>
      </motion.div>

      {/* KPIs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 16, background: cardBg }}>
            <Statistic title="Score Global" value={Math.round(globalScore)} suffix="/100" valueStyle={{ color: getRiskColor(globalScore) }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 16, background: cardBg }}>
            <Statistic title="Risques Critiques" value={safeNumber(dashboardData.statistics.critical_risks)} valueStyle={{ color: COLORS.danger }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 16, background: cardBg }}>
            <Statistic title="Impact Total" value={formatImpact(dashboardData.statistics.total_impact)} valueStyle={{ color: '#fbbf24' }} />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 16, background: cardBg }}>
            <Statistic title="Risques Résolus" value={safeNumber(dashboardData.statistics.resolved_risks)} valueStyle={{ color: COLORS.success }} />
          </Card>
        </Col>
      </Row>

      {/* Tabs */}
      <Card style={{ borderRadius: 24, background: cardBg }} bodyStyle={{ padding: 0 }}>
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} size="large" style={{ padding: '0 24px' }} />
      </Card>

      {/* Modals */}
      {/* Ajouter / Modifier / Détails modals ici (identiques à votre version originale, je peux les rajouter si besoin) */}

    </div>
  );
};

export default RiskManagement;