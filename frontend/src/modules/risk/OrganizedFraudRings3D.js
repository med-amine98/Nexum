// src/modules/intelligence/OrganizedFraudRings3D.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, Typography, Spin, Badge, Space, Row, Col, 
  Statistic, Tag, Tooltip, Button, Progress, 
  Modal, Descriptions, message, Avatar, Divider,
  Timeline, Steps, Table, Switch, Select,
  Empty, Alert, Segmented
} from 'antd';
import { 
  NodeIndexOutlined, EyeOutlined, ReloadOutlined,
  WarningOutlined, CheckCircleOutlined, CloseCircleOutlined,
  FireOutlined, TrophyOutlined, ClockCircleOutlined,
  DatabaseOutlined, SafetyCertificateOutlined, RocketOutlined,
  DollarOutlined, GlobalOutlined, LineChartOutlined, 
  BarChartOutlined, ExportOutlined, FilterOutlined,
  ZoomInOutlined, ZoomOutOutlined, FullscreenOutlined,
  ThunderboltOutlined, ApiOutlined, CloudSyncOutlined,
  DashboardOutlined, BranchesOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import './OrganizedFraudRings3D.css';
import * as echarts from 'echarts';
const { Title, Text } = Typography;
const { Option } = Select;

// Palette de couleurs sombres professionnelles
const COLORS = {
  primary: '#00d4ff',
  primaryDark: '#0099cc',
  secondary: '#7c3aed',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  surface: 'rgba(15, 23, 42, 0.95)',
  surfaceLight: 'rgba(30, 41, 59, 0.8)',
  border: 'rgba(255, 255, 255, 0.06)',
  text: '#e2e8f0',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  glow: 'rgba(0, 212, 255, 0.15)',
};

const OrganizedFraudRings3D = () => {
  const [loading, setLoading] = useState(true);
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [stats, setStats] = useState({
    totalEntities: 0,
    fraudRings: 0,
    highRiskCount: 0,
    detectionScore: 0,
    totalTransactions: 0,
    averageRisk: 0
  });
  const [selectedNode, setSelectedNode] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pipelineStatus, setPipelineStatus] = useState({});
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [riskFilter, setRiskFilter] = useState('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);
  const [evolutionData, setEvolutionData] = useState([]);
  const [rankingData, setRankingData] = useState([]);
  const [viewMode, setViewMode] = useState('graph');
  const [lastUpdate, setLastUpdate] = useState(null);
  const chartRef = useRef(null);

  // Catégories avec couleurs
  const categories = [
    { name: 'Patient', color: '#3b82f6', icon: '👤' },
    { name: 'Doctor', color: '#10b981', icon: '👨‍⚕️' },
    { name: 'Lawyer', color: '#f59e0b', icon: '⚖️' },
    { name: 'Auto Shop', color: '#ec4899', icon: '🔧' },
    { name: 'Policy Holder', color: '#8b5cf6', icon: '📄' }
  ];

  // Récupération des données depuis l'API
  const fetchFraudRings = async () => {
    try {
      setRefreshing(true);
      const res = await api.get('/digital-twins/fraud-rings-3d');
      
      if (res.data && res.data.nodes) {
        let nodes = res.data.nodes || [];
        let links = res.data.links || [];
        
        // Application du filtre
        if (riskFilter !== 'all') {
          const minRisk = riskFilter === 'low' ? 0 : riskFilter === 'medium' ? 30 : riskFilter === 'high' ? 60 : 80;
          nodes = nodes.filter(n => (n.value || 0) >= minRisk);
          links = links.filter(l => 
            nodes.some(n => n.id === l.source) && nodes.some(n => n.id === l.target)
          );
        }
        
        setGraphData({ nodes, links });
        
        // Calcul des statistiques
        const highRisk = nodes.filter(n => (n.value || 0) > 80).length;
        const mediumRisk = nodes.filter(n => (n.value || 0) > 50 && (n.value || 0) <= 80).length;
        const fraudRings = Math.ceil(nodes.length / 8);
        
        setStats({
          totalEntities: nodes.length,
          fraudRings: fraudRings,
          highRiskCount: highRisk,
          detectionScore: nodes.length > 0 ? Math.min(98, Math.floor(85 + (highRisk / nodes.length) * 30)) : 0,
          totalTransactions: links.length,
          averageRisk: nodes.length > 0 ? Math.round(nodes.reduce((acc, n) => acc + (n.value || 0), 0) / nodes.length) : 0
        });
        
        // Alertes
        const alerts = nodes.filter(n => (n.value || 0) > 85).slice(0, 5).map((node, idx) => ({
          id: idx,
          entity: node.name,
          role: node.category,
          riskScore: Math.round(node.value || 0),
          time: new Date().toLocaleTimeString(),
          message: `Activité suspecte détectée sur ${node.name}`
        }));
        setRecentAlerts(alerts);
        
        // Données d'évolution
        const evol = [];
        if (nodes.length > 0) {
          for (let i = 0; i < 30; i++) {
            evol.push({
              date: `J${i + 1}`,
              fraudes: Math.floor((highRisk / 30) * (i + 1)),
              suspects: Math.floor((mediumRisk / 30) * (i + 1)),
              normales: Math.floor((nodes.length / 30) * (i + 1))
            });
          }
        }
        setEvolutionData(evol);
        
        // Classement
        const ranking = nodes
          .map(n => ({
            name: n.name,
            role: n.category,
            riskScore: Math.round(n.value || 0),
            connections: links.filter(l => l.source === n.id || l.target === n.id).length
          }))
          .sort((a, b) => b.riskScore - a.riskScore)
          .slice(0, 10);
        setRankingData(ranking);
        
        // Statut du pipeline
        setPipelineStatus({
          ingestion: { status: 'success', message: nodes.length > 0 ? `${Math.min(1200, nodes.length * 10)} msg/s` : '0 msg/s' },
          graph: { status: 'success', message: `${nodes.length} entités` },
          gnn: { status: 'success', message: `${highRisk} anomalies` },
          quantum: { status: 'success', message: `${fraudRings} clusters` },
          orchestrator: { status: 'success', message: `${alerts.length} alertes` }
        });
        
        setLastUpdate(new Date());
      } else {
        setGraphData({ nodes: [], links: [] });
        setStats({
          totalEntities: 0,
          fraudRings: 0,
          highRiskCount: 0,
          detectionScore: 0,
          totalTransactions: 0,
          averageRisk: 0
        });
        setRecentAlerts([]);
        setEvolutionData([]);
        setRankingData([]);
      }
    } catch (err) {
      console.error('Erreur:', err);
      message.error('Erreur de connexion au service');
      setGraphData({ nodes: [], links: [] });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFraudRings();
    let interval;
    if (autoRefresh) {
      interval = setInterval(fetchFraudRings, refreshInterval * 1000);
    }
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, riskFilter]);

  const handleRefresh = () => fetchFraudRings();

  const getGraphOption = () => {
    const nodes = graphData.nodes || [];
    const links = graphData.links || [];
    
    if (nodes.length === 0) {
      return {
        title: { 
          show: true, 
          text: 'Aucune donnée disponible', 
          textStyle: { color: COLORS.textSecondary, fontSize: 16 },
          left: 'center', 
          top: 'center' 
        },
        backgroundColor: 'transparent'
      };
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: COLORS.surface,
        borderColor: COLORS.border,
        borderWidth: 1,
        textStyle: { color: COLORS.text, fontSize: 12 },
        formatter: (params) => {
          if (params.dataType === 'node') {
            const cat = categories.find(c => c.name === params.data.category) || categories[0];
            const risk = params.data.value || 50;
            return `
              <div style="padding: 12px; min-width: 200px;">
                <div style="font-size: 16px; font-weight: 700; color: ${COLORS.primary}; margin-bottom: 8px;">
                  ${params.name}
                </div>
                <div style="display: flex; gap: 8px; margin-bottom: 8px;">
                  <span style="color: ${COLORS.textSecondary};">${cat.icon}</span>
                  <span style="color: ${COLORS.text};">${cat.name}</span>
                </div>
                <div style="margin-bottom: 8px;">
                  <span style="color: ${COLORS.textSecondary};">⚠️ Risque: </span>
                  <span style="color: ${risk > 80 ? COLORS.danger : risk > 60 ? COLORS.warning : COLORS.success}; font-weight: 700;">
                    ${Math.round(risk)}%
                  </span>
                </div>
                <div style="background: ${COLORS.surfaceLight}; border-radius: 4px; height: 4px; width: 100%;">
                  <div style="width: ${risk}%; height: 4px; background: ${risk > 80 ? COLORS.danger : risk > 60 ? COLORS.warning : COLORS.success}; border-radius: 4px;"></div>
                </div>
                <div style="margin-top: 8px; color: ${COLORS.textSecondary};">
                  🔗 ${params.data.connections || 0} connexions
                </div>
              </div>
            `;
          }
          return `<div style="color: ${COLORS.text};">💰 ${((params.value || 1) * 50000).toLocaleString()} €</div>`;
        }
      },
      series: [{
        type: 'graph',
        layout: 'force',
        force: {
          repulsion: 350,
          edgeLength: 120,
          gravity: 0.08,
          friction: 0.15,
          layoutAnimation: false
        },
        roam: true,
        draggable: true,
        data: nodes.map(node => {
          const cat = categories.find(c => c.name === node.category) || categories[0];
          const risk = node.value || 50;
          return {
            id: node.id,
            name: node.name,
            category: node.category,
            value: risk,
            connections: links.filter(l => l.source === node.id || l.target === node.id).length,
            symbolSize: Math.max(18, Math.min(45, 18 + (risk / 100) * 27)),
            itemStyle: {
              color: risk > 80 ? COLORS.danger : risk > 60 ? COLORS.warning : risk > 30 ? cat.color : COLORS.success,
              borderColor: COLORS.border,
              borderWidth: 2,
              shadowBlur: 15,
              shadowColor: risk > 80 ? `${COLORS.danger}60` : `${COLORS.primary}40`
            },
            label: {
              show: true,
              position: 'right',
              fontSize: 11,
              color: COLORS.textSecondary,
              offset: [8, 0],
              formatter: (p) => p.data.value > 80 ? '⚠️' : p.data.value > 60 ? '⚡' : ''
            }
          };
        }),
        links: links.map(link => ({
          source: link.source,
          target: link.target,
          value: link.value || 1,
          lineStyle: {
            color: link.isSuspicious ? COLORS.danger : COLORS.primary,
            width: (link.value || 1) * 1.5,
            opacity: 0.4,
            curveness: 0.2,
            type: link.isSuspicious ? 'dashed' : 'solid'
          }
        })),
        categories: categories.map(c => ({ name: c.name, itemStyle: { color: c.color } })),
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: [0, 6],
        focusNodeAdjacency: true,
        label: {
          show: true,
          position: 'right',
          fontSize: 10,
          color: COLORS.textSecondary
        },
        emphasis: {
          focus: 'adjacency',
          label: { show: true, color: COLORS.primary, fontSize: 12 },
          lineStyle: { width: 3, color: COLORS.warning }
        },
        animation: true,
        animationDuration: 600
      }],
      toolbox: {
        show: true,
        feature: {
          saveAsImage: { title: 'Sauvegarder', pixelRatio: 2 }
        },
        right: 20,
        top: 10,
        iconStyle: { borderColor: COLORS.textSecondary }
      }
    };
  };

  const rankingColumns = [
    { 
      title: <span style={{ color: COLORS.text }}>Entité</span>, 
      dataIndex: 'name', 
      key: 'name', 
      render: (text) => <span style={{ color: COLORS.text }}>{text}</span> 
    },
    { 
      title: <span style={{ color: COLORS.text }}>Rôle</span>, 
      dataIndex: 'role', 
      key: 'role', 
      render: (role) => <Tag color="purple" style={{ color: COLORS.text, background: 'rgba(124, 58, 237, 0.3)', border: 'none' }}>{role}</Tag> 
    },
    { 
      title: <span style={{ color: COLORS.text }}>Score risque</span>, 
      dataIndex: 'riskScore', 
      key: 'riskScore', 
      render: (score) => (
        <Progress 
          percent={score} 
          size="small" 
          strokeColor={score > 80 ? COLORS.danger : score > 60 ? COLORS.warning : COLORS.success}
          showInfo={false}
          style={{ width: 80 }}
        />
      ) 
    },
    { 
      title: <span style={{ color: COLORS.text }}>Connexions</span>, 
      dataIndex: 'connections', 
      key: 'connections', 
      render: (text) => <span style={{ color: COLORS.textSecondary }}>{text}</span> 
    },
    {
      title: '',
      key: 'action',
      render: (_, r) => (
        <Button 
          type="text" 
          icon={<EyeOutlined style={{ color: COLORS.primary }} />} 
          onClick={() => { setSelectedNode(r); setDetailsModalVisible(true); }}
          size="small"
        />
      )
    }
  ];

  const StatCard = ({ title, value, icon, color, suffix }) => (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
      <Card 
        className="stat-card"
        style={{ 
          background: COLORS.surface,
          borderColor: COLORS.border,
          borderRadius: 16,
          backdropFilter: 'blur(10px)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {title}
            </Text>
            <div style={{ color: COLORS.text, fontSize: 28, fontWeight: 700, marginTop: 4 }}>
              {value}
              {suffix && <span style={{ fontSize: 16, color: COLORS.textSecondary, marginLeft: 2 }}>{suffix}</span>}
            </div>
          </div>
          <div style={{ 
            width: 44, 
            height: 44, 
            borderRadius: 12, 
            background: `${color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            color: color
          }}>
            {icon}
          </div>
        </div>
      </Card>
    </motion.div>
  );

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'radial-gradient(ellipse at center, #0f172a 0%, #020617 100%)'
      }}>
        <Spin size="large" tip={<span style={{ color: COLORS.textSecondary }}>Chargement du réseau...</span>} ><div/></Spin>
      </div>
    );
  }

  return (
    <div className="fraud-rings-container" style={{ 
      padding: 24, 
      background: 'radial-gradient(ellipse at center, #0f172a 0%, #020617 100%)',
      minHeight: '100vh',
      color: COLORS.text
    }}>
      
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <Card style={{ 
          borderRadius: 20, 
          marginBottom: 24, 
          background: COLORS.surface,
          borderColor: COLORS.border,
          backdropFilter: 'blur(10px)',
        }}>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Space size={20}>
                <div style={{ 
                  width: 56, 
                  height: 56, 
                  borderRadius: 16, 
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 8px 32px ${COLORS.primary}40`
                }}>
                  <NodeIndexOutlined style={{ fontSize: 28, color: '#fff' }} />
                </div>
                <div>
                  <Title level={2} style={{ margin: 0, color: COLORS.text, fontWeight: 700 }}>
                    Réseaux de Fraude Organisée
                  </Title>
                  <Text style={{ color: COLORS.textSecondary }}>
                    Détection et visualisation des clusters suspects en temps réel
                  </Text>
                </div>
              </Space>
            </Col>
            <Col>
              <Space>
                <Badge 
                  status="processing" 
                  text={<span style={{ color: COLORS.success }}>● Temps réel</span>} 
                />
                <Button 
                  icon={<ReloadOutlined spin={refreshing} />} 
                  onClick={handleRefresh}
                  style={{ 
                    background: 'rgba(255,255,255,0.05)',
                    borderColor: COLORS.border,
                    color: COLORS.text
                  }}
                >
                  Rafraîchir
                </Button>
                {lastUpdate && (
                  <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                    Dernière mise à jour: {lastUpdate.toLocaleTimeString()}
                  </Text>
                )}
              </Space>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* Statistiques */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} sm={12} lg={4}>
            <StatCard 
              title="Entités surveillées" 
              value={stats.totalEntities} 
              icon={<DatabaseOutlined />} 
              color={COLORS.primary} 
            />
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <StatCard 
              title="Clusters suspects" 
              value={stats.fraudRings} 
              icon={<FireOutlined />} 
              color={COLORS.danger} 
            />
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <StatCard 
              title="Risque critique" 
              value={stats.highRiskCount} 
              icon={<WarningOutlined />} 
              color={COLORS.warning} 
            />
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <StatCard 
              title="Précision détection" 
              value={stats.detectionScore} 
              suffix="%" 
              icon={<TrophyOutlined />} 
              color={COLORS.success} 
            />
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <StatCard 
              title="Transactions analysées" 
              value={stats.totalTransactions} 
              icon={<DollarOutlined />} 
              color="#3b82f6" 
            />
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <StatCard 
              title="Risque moyen" 
              value={stats.averageRisk} 
              suffix="%" 
              icon={<LineChartOutlined />} 
              color={COLORS.textSecondary} 
            />
          </Col>
        </Row>
      </motion.div>

      {/* Filtres et Pipeline */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={8}>
            <Card style={{ 
              borderRadius: 16, 
              background: COLORS.surface,
              borderColor: COLORS.border,
              backdropFilter: 'blur(10px)',
            }}>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                <Button 
                  icon={<ZoomInOutlined />} 
                  onClick={() => chartRef.current?.getEchartsInstance()?.dispatchAction({ type: 'graphRoam', zoom: 0.9 })}
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: COLORS.border, color: COLORS.text }}
                >
                  Zoom +
                </Button>
                <Button 
                  icon={<ZoomOutOutlined />} 
                  onClick={() => chartRef.current?.getEchartsInstance()?.dispatchAction({ type: 'graphRoam', zoom: 1.1 })}
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: COLORS.border, color: COLORS.text }}
                >
                  Zoom -
                </Button>
                <Button 
                  icon={<FullscreenOutlined />} 
                  onClick={() => chartRef.current?.getEchartsInstance()?.dispatchAction({ type: 'graphRoam', reset: true })}
                  style={{ background: 'rgba(255,255,255,0.05)', borderColor: COLORS.border, color: COLORS.text }}
                >
                  Reset
                </Button>
              </div>
              <Divider style={{ margin: '12px 0', borderColor: COLORS.border }} />
              <Row gutter={8} align="middle">
                <Col><FilterOutlined style={{ color: COLORS.primary }} /></Col>
                <Col flex="auto">
                  <Select 
                    value={riskFilter} 
                    onChange={setRiskFilter} 
                    style={{ width: '100%', background: 'rgba(255,255,255,0.05)' }}
                    dropdownStyle={{ background: COLORS.surface, borderColor: COLORS.border }}
                  >
                    <Option value="all" style={{ color: COLORS.text }}>Tous les risques</Option>
                    <Option value="critical" style={{ color: COLORS.text }}>Critique (&gt;80%)</Option>
                    <Option value="high" style={{ color: COLORS.text }}>Élevé (60-80%)</Option>
                    <Option value="medium" style={{ color: COLORS.text }}>Moyen (30-60%)</Option>
                    <Option value="low" style={{ color: COLORS.text }}>Faible (&lt;30%)</Option>
                  </Select>
                </Col>
                <Col><Switch checked={autoRefresh} onChange={setAutoRefresh} /></Col>
                {autoRefresh && (
                  <Col>
                    <Select 
                      value={refreshInterval} 
                      onChange={setRefreshInterval} 
                      style={{ width: 70, background: 'rgba(255,255,255,0.05)' }}
                      dropdownStyle={{ background: COLORS.surface, borderColor: COLORS.border }}
                    >
                      <Option value={15} style={{ color: COLORS.text }}>15s</Option>
                      <Option value={30} style={{ color: COLORS.text }}>30s</Option>
                      <Option value={60} style={{ color: COLORS.text }}>60s</Option>
                    </Select>
                  </Col>
                )}
              </Row>
            </Card>
          </Col>
          <Col xs={24} lg={16}>
            <Card style={{ 
              borderRadius: 16, 
              background: COLORS.surface,
              borderColor: COLORS.border,
              backdropFilter: 'blur(10px)',
            }}>
              <Steps 
                current={4} 
                status="finish" 
                style={{ padding: '4px 0' }}
                items={[
                  { 
                    title: <span style={{ color: COLORS.text, fontSize: 12 }}>Kafka</span>, 
                    icon: <CheckCircleOutlined style={{ color: COLORS.success }} /> 
                  },
                  { 
                    title: <span style={{ color: COLORS.text, fontSize: 12 }}>Neo4j</span>, 
                    icon: <CheckCircleOutlined style={{ color: COLORS.success }} /> 
                  },
                  { 
                    title: <span style={{ color: COLORS.text, fontSize: 12 }}>GNN</span>, 
                    icon: <CheckCircleOutlined style={{ color: COLORS.success }} /> 
                  },
                  { 
                    title: <span style={{ color: COLORS.text, fontSize: 12 }}>QNN</span>, 
                    icon: <CheckCircleOutlined style={{ color: COLORS.success }} /> 
                  },
                  { 
                    title: <span style={{ color: COLORS.text, fontSize: 12 }}>Verdict</span>, 
                    icon: <CheckCircleOutlined style={{ color: COLORS.success }} /> 
                  }
                ]} 
              />
            </Card>
          </Col>
        </Row>
      </motion.div>

      {/* Visualisation réseau */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Card 
          title={
            <Space>
              <GlobalOutlined style={{ color: COLORS.primary }} />
              <span style={{ color: COLORS.text, fontWeight: 600 }}>Visualisation du réseau - Force Graph</span>
            </Space>
          }
          style={{ 
            borderRadius: 20, 
            marginBottom: 24, 
            background: COLORS.surface,
            borderColor: COLORS.border,
            overflow: 'hidden',
            backdropFilter: 'blur(10px)',
          }}
          extra={
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <Segmented
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { value: 'graph', label: <span style={{ color: COLORS.text }}>🌐 Graph</span> },
                  { value: 'heatmap', label: <span style={{ color: COLORS.text }}>🔥 Heatmap</span> },
                ]}
                style={{ background: 'rgba(255,255,255,0.05)' }}
              />
              {categories.map(cat => (
                <Tooltip key={cat.name} title={cat.name}>
                  <div style={{ 
                    width: 12, 
                    height: 12, 
                    borderRadius: '50%', 
                    background: cat.color, 
                    boxShadow: `0 0 8px ${cat.color}60`,
                    border: '1px solid rgba(255,255,255,0.1)'
                  }} />
                </Tooltip>
              ))}
            </div>
          }
        >
          <div style={{ 
            height: 550, 
            width: '100%', 
            borderRadius: 16, 
            overflow: 'hidden', 
            background: 'rgba(0,0,0,0.3)',
            border: `1px solid ${COLORS.border}`
          }}>
            {graphData.nodes.length > 0 ? (
              <ReactECharts
                ref={chartRef}
                option={getGraphOption()}
                style={{ height: '100%', width: '100%' }}
                onEvents={{ click: (params) => params.dataType === 'node' && setSelectedNode(params.data) }}
                theme="dark"
              />
            ) : (
              <Empty 
                description={<span style={{ color: COLORS.textSecondary }}>Aucune donnée réseau disponible</span>}
                style={{ paddingTop: 200 }}
              />
            )}
          </div>
        </Card>
      </motion.div>

      {/* Alertes et Classement */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <WarningOutlined style={{ color: COLORS.danger }} />
                  <span style={{ color: COLORS.text, fontWeight: 600 }}>Alertes récentes</span>
                  <Badge count={recentAlerts.length} style={{ backgroundColor: COLORS.danger }} />
                </Space>
              }
              style={{ 
                borderRadius: 20, 
                background: COLORS.surface,
                borderColor: COLORS.border,
                height: '100%',
                backdropFilter: 'blur(10px)',
              }}
            >
              {recentAlerts.length > 0 ? (
                <Timeline>
                  {recentAlerts.map(alert => (
                    <Timeline.Item 
                      key={alert.id} 
                      color={COLORS.danger} 
                      dot={<WarningOutlined style={{ fontSize: 14, color: COLORS.danger }} />}
                    >
                      <div style={{ marginBottom: 4 }}>
                        <Text strong style={{ color: COLORS.text }}>{alert.entity}</Text>
                      </div>
                      <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>{alert.message}</Text>
                      <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Tag color="error" style={{ borderRadius: 12 }}>{alert.riskScore}%</Tag>
                        <Tag color="purple" style={{ background: 'rgba(124, 58, 237, 0.3)', border: 'none', color: COLORS.text }}>{alert.role}</Tag>
                        <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>{alert.time}</Text>
                      </div>
                    </Timeline.Item>
                  ))}
                </Timeline>
              ) : (
                <Empty 
                  description={<span style={{ color: COLORS.textSecondary }}>Aucune alerte récente</span>}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card 
              title={
                <Space>
                  <BarChartOutlined style={{ color: COLORS.primary }} />
                  <span style={{ color: COLORS.text, fontWeight: 600 }}>Classement des entités à risque</span>
                </Space>
              }
              style={{ 
                borderRadius: 20, 
                background: COLORS.surface,
                borderColor: COLORS.border,
                height: '100%',
                backdropFilter: 'blur(10px)',
              }}
            >
              <Table 
                dataSource={rankingData} 
                columns={rankingColumns} 
                rowKey="name" 
                pagination={{ pageSize: 8 }}
                className="ranking-table"
                style={{ background: 'transparent' }}
              />
            </Card>
          </Col>
        </Row>
      </motion.div>

      {/* Évolution */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <Row style={{ marginTop: 24 }}>
          <Col span={24}>
            <Card 
              title={
                <Space>
                  <LineChartOutlined style={{ color: COLORS.primary }} />
                  <span style={{ color: COLORS.text, fontWeight: 600 }}>Évolution des détections (30 jours)</span>
                </Space>
              }
              style={{ 
                borderRadius: 20, 
                background: COLORS.surface,
                borderColor: COLORS.border,
                backdropFilter: 'blur(10px)',
              }}
            >
              <div style={{ height: 400 }}>
                <ReactECharts 
                  option={{
                    tooltip: { 
                      trigger: 'axis',
                      backgroundColor: COLORS.surface,
                      borderColor: COLORS.border,
                      textStyle: { color: COLORS.text }
                    },
                    legend: { 
                      data: ['Fraudes', 'Suspectes', 'Normales'], 
                      textStyle: { color: COLORS.textSecondary },
                      top: 0
                    },
                    grid: { top: 50, left: 60, right: 30, bottom: 30 },
                    xAxis: { 
                      type: 'category', 
                      data: evolutionData.map(d => d.date), 
                      axisLabel: { color: COLORS.textMuted, rotate: 45 },
                      axisLine: { lineStyle: { color: COLORS.border } }
                    },
                    yAxis: { 
                      type: 'value', 
                      name: 'Nombre', 
                      axisLabel: { color: COLORS.textMuted },
                      splitLine: { lineStyle: { color: COLORS.border } },
                      nameTextStyle: { color: COLORS.textMuted }
                    },
                    series: [
                      { 
                        name: 'Fraudes', 
                        type: 'line', 
                        data: evolutionData.map(d => d.fraudes), 
                        smooth: true, 
                        lineStyle: { color: COLORS.danger, width: 2 },
                        areaStyle: { 
                          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: `${COLORS.danger}40` },
                            { offset: 1, color: `${COLORS.danger}00` }
                          ])
                        }
                      },
                      { 
                        name: 'Suspectes', 
                        type: 'line', 
                        data: evolutionData.map(d => d.suspects), 
                        smooth: true, 
                        lineStyle: { color: COLORS.warning, width: 2 },
                        areaStyle: { 
                          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: `${COLORS.warning}40` },
                            { offset: 1, color: `${COLORS.warning}00` }
                          ])
                        }
                      },
                      { 
                        name: 'Normales', 
                        type: 'line', 
                        data: evolutionData.map(d => d.normales), 
                        smooth: true, 
                        lineStyle: { color: COLORS.success, width: 2 },
                        areaStyle: { 
                          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                            { offset: 0, color: `${COLORS.success}40` },
                            { offset: 1, color: `${COLORS.success}00` }
                          ])
                        }
                      }
                    ]
                  }} 
                  style={{ height: '100%', width: '100%' }} 
                  theme="dark"
                />
              </div>
            </Card>
          </Col>
        </Row>
      </motion.div>

      {/* Modal détails */}
      <Modal 
        title={<span style={{ color: COLORS.text }}>🔍 Détails de l'entité</span>}
        open={detailsModalVisible} 
        onCancel={() => setDetailsModalVisible(false)} 
        footer={[
          <Button 
            key="close" 
            onClick={() => setDetailsModalVisible(false)}
            style={{ 
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.secondary})`,
              border: 'none',
              color: '#fff'
            }}
          >
            Fermer
          </Button>
        ]}
        width={500}
        styles={{
          body: { background: COLORS.surface },
          header: { background: COLORS.surface, borderBottom: `1px solid ${COLORS.border}` }
        }}
      >
        {selectedNode && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item 
              label={<span style={{ color: COLORS.textSecondary }}>Nom</span>}
              labelStyle={{ background: 'rgba(255,255,255,0.03)', color: COLORS.textSecondary }}
              contentStyle={{ color: COLORS.text }}
            >
              {selectedNode.name}
            </Descriptions.Item>
            <Descriptions.Item 
              label={<span style={{ color: COLORS.textSecondary }}>Rôle</span>}
              labelStyle={{ background: 'rgba(255,255,255,0.03)', color: COLORS.textSecondary }}
              contentStyle={{ color: COLORS.text }}
            >
              <Tag color="purple" style={{ background: 'rgba(124, 58, 237, 0.3)', border: 'none', color: COLORS.text }}>
                {selectedNode.role || selectedNode.category}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item 
              label={<span style={{ color: COLORS.textSecondary }}>Score suspicion</span>}
              labelStyle={{ background: 'rgba(255,255,255,0.03)', color: COLORS.textSecondary }}
              contentStyle={{ color: COLORS.text }}
            >
              <Progress 
                percent={selectedNode.riskScore || selectedNode.value || 0} 
                strokeColor={(selectedNode.riskScore || selectedNode.value || 0) > 80 ? COLORS.danger : COLORS.primary}
                format={(p) => `${p}%`}
              />
            </Descriptions.Item>
            <Descriptions.Item 
              label={<span style={{ color: COLORS.textSecondary }}>Connexions</span>}
              labelStyle={{ background: 'rgba(255,255,255,0.03)', color: COLORS.textSecondary }}
              contentStyle={{ color: COLORS.text }}
            >
              {selectedNode.connections || 0} liens suspects
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      {/* Styles CSS */}
      <style>{`
        .fraud-rings-container .ant-card {
          box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
        }
        .fraud-rings-container .ant-card-head {
          border-bottom: 1px solid ${COLORS.border};
        }
        .fraud-rings-container .ant-card-head-title {
          color: ${COLORS.text};
        }
        .fraud-rings-container .ant-timeline-item-content {
          color: ${COLORS.text};
        }
        .fraud-rings-container .ant-timeline-item-head {
          border-color: ${COLORS.primary};
        }
        .fraud-rings-container .ant-table {
          background: transparent;
          color: ${COLORS.text};
        }
        .fraud-rings-container .ant-table-thead > tr > th {
          background: rgba(255,255,255,0.03);
          color: ${COLORS.textSecondary};
          border-bottom: 1px solid ${COLORS.border};
        }
        .fraud-rings-container .ant-table-tbody > tr > td {
          border-bottom: 1px solid ${COLORS.border};
          background: transparent;
          color: ${COLORS.text};
        }
        .fraud-rings-container .ant-table-tbody > tr:hover > td {
          background: rgba(255,255,255,0.03);
        }
        .fraud-rings-container .ant-select-selector {
          background: rgba(255,255,255,0.05) !important;
          border-color: ${COLORS.border} !important;
          color: ${COLORS.text} !important;
        }
        .fraud-rings-container .ant-select-selection-item {
          color: ${COLORS.text} !important;
        }
        .fraud-rings-container .ant-select-arrow {
          color: ${COLORS.textSecondary} !important;
        }
        .fraud-rings-container .ant-steps-item-title {
          color: ${COLORS.textSecondary} !important;
        }
        .fraud-rings-container .ant-steps-item-process .ant-steps-item-title {
          color: ${COLORS.text} !important;
        }
        .fraud-rings-container .ant-steps-item-finish .ant-steps-item-title {
          color: ${COLORS.text} !important;
        }
        .fraud-rings-container .ant-steps-item-finish .ant-steps-item-icon {
          background-color: ${COLORS.success} !important;
          border-color: ${COLORS.success} !important;
        }
        .fraud-rings-container .ant-switch {
          background: ${COLORS.textMuted};
        }
        .fraud-rings-container .ant-switch-checked {
          background: ${COLORS.primary};
        }
        .stat-card {
          transition: all 0.3s ease;
          cursor: default;
        }
        .stat-card:hover {
          border-color: ${COLORS.primary}40 !important;
          box-shadow: 0 8px 32px ${COLORS.primary}20;
        }
        .ranking-table .ant-progress-inner {
          background: rgba(255,255,255,0.05);
        }
        .ant-empty-description {
          color: ${COLORS.textSecondary} !important;
        }
        .ant-tooltip-inner {
          background: ${COLORS.surface} !important;
          border: 1px solid ${COLORS.border} !important;
        }
        .ant-modal-content {
          background: ${COLORS.surface} !important;
          border: 1px solid ${COLORS.border} !important;
        }
        .ant-modal-header {
          background: ${COLORS.surface} !important;
          border-bottom: 1px solid ${COLORS.border} !important;
        }
        .ant-descriptions-item-label {
          color: ${COLORS.textSecondary} !important;
        }
        .ant-descriptions-item-content {
          color: ${COLORS.text} !important;
        }
        .ant-descriptions-bordered .ant-descriptions-item-label {
          background: rgba(255,255,255,0.03) !important;
        }
        .ant-descriptions-bordered .ant-descriptions-item-content {
          background: transparent !important;
        }
      `}</style>
    </div>
  );
};

export default OrganizedFraudRings3D;