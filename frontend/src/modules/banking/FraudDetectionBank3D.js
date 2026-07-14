import React, { useState, useEffect } from 'react';
import { 
  Card, Typography, Spin, Badge, Space, Row, Col, 
  Statistic, Timeline, Tag, Steps, Button, 
  Tooltip, Progress, Descriptions, Modal,
  message, Divider, Avatar, Empty, Alert
} from 'antd';
import { 
  BankOutlined, ThunderboltOutlined, NodeIndexOutlined,
  ApiOutlined, SafetyCertificateOutlined, CheckCircleOutlined,
  CloseCircleOutlined, LoadingOutlined, ReloadOutlined,
  EyeOutlined, WarningOutlined, DollarOutlined, GlobalOutlined,
  FireOutlined, LineChartOutlined, RocketOutlined, BlockOutlined,
  ClockCircleOutlined, DatabaseOutlined, TrendingUpOutlined,
  ShieldOutlined, FundOutlined, AlertOutlined, PieChartOutlined,
  BarChartOutlined, AreaChartOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import { motion } from 'framer-motion';
import api from '../../services/api';

const { Title, Text } = Typography;

// Données de démonstration pour le mode hors ligne
const DEMO_DATA = {
  nodes: [
    { id: 1, name: 'BNP Paribas', risk: 0.85, amount: 12500000, transactions: 45 },
    { id: 2, name: 'Société Générale', risk: 0.72, amount: 8900000, transactions: 38 },
    { id: 3, name: 'Crédit Agricole', risk: 0.45, amount: 5600000, transactions: 52 },
    { id: 4, name: 'LCL', risk: 0.68, amount: 7200000, transactions: 31 },
    { id: 5, name: 'Banque Populaire', risk: 0.38, amount: 3400000, transactions: 27 },
    { id: 6, name: 'Caisse d\'Epargne', risk: 0.55, amount: 4800000, transactions: 33 },
    { id: 7, name: 'HSBC', risk: 0.92, amount: 15600000, transactions: 29 },
    { id: 8, name: 'Boursorama', risk: 0.35, amount: 2800000, transactions: 98 }
  ],
  links: [
    { source: 1, target: 2, amount: 2500000 },
    { source: 1, target: 3, amount: 1800000 },
    { source: 2, target: 4, amount: 1200000 },
    { source: 3, target: 5, amount: 800000 },
    { source: 4, target: 6, amount: 950000 },
    { source: 5, target: 7, amount: 3200000 },
    { source: 6, target: 8, amount: 450000 },
    { source: 2, target: 7, amount: 2100000 },
    { source: 1, target: 7, amount: 3800000 },
    { source: 3, target: 8, amount: 560000 }
  ]
};

const FraudDetectionBank3D = () => {
  const [loading, setLoading] = useState(true);
  const [pipelineStatus, setPipelineStatus] = useState({});
  const [orchestratorDecisions, setOrchestratorDecisions] = useState([]);
  const [transactionMovements, setTransactionMovements] = useState([]);
  const [stats, setStats] = useState({
    totalProcessed: 0,
    fraudDetected: 0,
    pendingReview: 0,
    avgProcessingTime: 0
  });
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState(false);

  // Données pour les graphiques
  const [networkData, setNetworkData] = useState({ nodes: [], links: [] });
  const [evolutionData, setEvolutionData] = useState([]);
  const [bankRanking, setBankRanking] = useState([]);
  const [pieData, setPieData] = useState({ normal: 0, suspect: 0, fraud: 0 });

  // Génération de données d'évolution
  const generateEvolutionData = (fraudCount, suspectCount, normalCount) => {
    const days = 30;
    const evol = [];
    for (let i = 0; i < days; i++) {
      evol.push({
        date: `J${i + 1}`,
        fraudes: Math.floor((fraudCount / days) * i + Math.random() * 3),
        suspects: Math.floor((suspectCount / days) * i + Math.random() * 5),
        normales: Math.floor((normalCount / days) * i + Math.random() * 20)
      });
    }
    return evol;
  };

  // Récupération des données depuis l'API
  const fetchRealData = async () => {
    try {
      setRefreshing(true);
      setApiError(false);
      
      // 1. Récupération des données du graphe
      let nodes = [];
      let links = [];
      
      try {
        const graphRes = await api.get('/banking/fraud/graph-analysis');
        if (graphRes.data && graphRes.data.nodes && Array.isArray(graphRes.data.nodes)) {
          nodes = graphRes.data.nodes;
          links = graphRes.data.links || [];
        } else {
          // Utiliser les données de démonstration
          nodes = DEMO_DATA.nodes;
          links = DEMO_DATA.links;
          setApiError(true);
        }
      } catch (error) {
        console.warn('API graph-analysis non disponible, utilisation des données de démonstration');
        nodes = DEMO_DATA.nodes;
        links = DEMO_DATA.links;
        setApiError(true);
      }
      
      // Transformation pour le graphique Network
      const networkNodes = nodes.map(node => ({
        id: node.id,
        name: node.name,
        value: node.risk ? Math.round(node.risk * 100) : 50,
        symbolSize: 25 + (node.risk ? node.risk * 30 : 15),
        risk: node.risk || 0.5,
        amount: node.amount || 0,
        transactions: node.transactions || 0
      }));
      
      const networkLinks = links.map(link => ({
        source: link.source,
        target: link.target,
        value: link.amount || link.value || 1000
      }));
      
      setNetworkData({ nodes: networkNodes, links: networkLinks });
      
      // Calcul des statistiques
      const frauds = nodes.filter(n => (n.risk || 0) > 0.8).length;
      const suspects = nodes.filter(n => (n.risk || 0) > 0.5 && (n.risk || 0) <= 0.8).length;
      const normals = nodes.filter(n => (n.risk || 0) <= 0.5).length;
      
      setPieData({ normal: normals, suspect: suspects, fraud: frauds });
      
      const totalTransactions = nodes.reduce((acc, n) => acc + (n.transactions || 0), 0);
      
      setStats({
        totalProcessed: totalTransactions,
        fraudDetected: frauds,
        pendingReview: suspects,
        avgProcessingTime: Math.floor(150 + Math.random() * 100)
      });
      
      // Générer les données d'évolution
      const evol = generateEvolutionData(frauds, suspects, totalTransactions);
      setEvolutionData(evol);
      
      // Classement des banques
      const bankMap = new Map();
      nodes.forEach(node => {
        const bank = node.bank || node.name?.split('-')[0] || node.name;
        if (bankMap.has(bank)) {
          const current = bankMap.get(bank);
          current.totalRisk += (node.risk || 0.5);
          current.count++;
        } else {
          bankMap.set(bank, { totalRisk: (node.risk || 0.5), count: 1 });
        }
      });
      
      const ranking = Array.from(bankMap.entries()).map(([name, data]) => ({
        name: name.length > 15 ? name.substring(0, 12) + '...' : name,
        riskScore: Math.round((data.totalRisk / data.count) * 100)
      })).sort((a, b) => b.riskScore - a.riskScore);
      
      setBankRanking(ranking.slice(0, 8));
      
      // 2. Récupération des décisions de l'orchestrateur
      try {
        const decisionsRes = await api.get('/orchestrator/decisions');
        const decisions = Array.isArray(decisionsRes.data) ? decisionsRes.data : 
                         (decisionsRes.data?.data && Array.isArray(decisionsRes.data.data) ? decisionsRes.data.data : []);
        setOrchestratorDecisions(decisions.slice(0, 8));
      } catch (error) {
        console.warn('API orchestrator/decisions non disponible');
        setOrchestratorDecisions([]);
      }
      
      // 3. Récupération des mouvements
      try {
        const movementsRes = await api.get('/banking/transaction-movements');
        const movements = Array.isArray(movementsRes.data) ? movementsRes.data :
                         (movementsRes.data?.data && Array.isArray(movementsRes.data.data) ? movementsRes.data.data : []);
        
        // Générer des mouvements de démonstration si nécessaire
        let finalMovements = movements;
        if (finalMovements.length === 0) {
          finalMovements = [
            { id: 'TX-001', from: 'BNP Paribas', to: 'Société Générale', amount: 1250000, type: 'suspect', time: 'Il y a 2 min', progress: 75 },
            { id: 'TX-002', from: 'Crédit Agricole', to: 'LCL', amount: 890000, type: 'normal', time: 'Il y a 5 min', progress: 100 },
            { id: 'TX-003', from: 'HSBC', to: 'BNP Paribas', amount: 2500000, type: 'fraud', time: 'Il y a 12 min', progress: 45 },
            { id: 'TX-004', from: 'Boursorama', to: 'Banque Populaire', amount: 450000, type: 'normal', time: 'Il y a 18 min', progress: 100 },
            { id: 'TX-005', from: 'Société Générale', to: 'HSBC', amount: 3200000, type: 'suspect', time: 'Il y a 25 min', progress: 60 },
            { id: 'TX-006', from: 'LCL', to: 'Caisse d\'Epargne', amount: 780000, type: 'normal', time: 'Il y a 32 min', progress: 100 }
          ];
        }
        setTransactionMovements(finalMovements.slice(0, 12));
      } catch (error) {
        console.warn('API transaction-movements non disponible');
        setTransactionMovements([]);
      }
      
    } catch (error) {
      console.error('Erreur chargement données:', error);
      message.warning('Mode démo - Utilisation des données de démonstration');
      
      // Données de secours complètes
      setNetworkData({ nodes: DEMO_DATA.nodes.map(n => ({ ...n, symbolSize: 30 })), links: DEMO_DATA.links });
      setPieData({ normal: 3, suspect: 3, fraud: 2 });
      setStats({ totalProcessed: 380, fraudDetected: 2, pendingReview: 3, avgProcessingTime: 180 });
      setBankRanking([
        { name: 'HSBC', riskScore: 92 }, { name: 'BNP Paribas', riskScore: 85 },
        { name: 'Société Générale', riskScore: 72 }, { name: 'LCL', riskScore: 68 },
        { name: 'Caisse d\'Epargne', riskScore: 55 }, { name: 'Crédit Agricole', riskScore: 45 },
        { name: 'Banque Populaire', riskScore: 38 }, { name: 'Boursorama', riskScore: 35 }
      ]);
      setEvolutionData(generateEvolutionData(2, 3, 380));
      setOrchestratorDecisions([]);
      setTransactionMovements([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRealData();
    
    // Auto-refresh toutes les 30 secondes
    const interval = setInterval(() => {
      if (!loading) fetchRealData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchRealData();
  };

  // Graphique Network Force (Relations entre comptes)
  const getNetworkOption = () => ({
    title: {
      show: true,
      text: '🌐 Relations Interbancaires',
      textStyle: { color: '#94a3b8', fontSize: 13 },
      left: 'center',
      top: 0
    },
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      borderColor: '#38bdf8',
      borderWidth: 1,
      textStyle: { color: '#fff' },
      formatter: (params) => {
        if (params.dataType === 'node') {
          const risk = params.data.risk ? Math.round(params.data.risk * 100) : 50;
          const amount = params.data.amount || 0;
          const transactions = params.data.transactions || 0;
          return `<strong>${params.name}</strong><br/>💰 Montant total: ${amount.toLocaleString()} €<br/>📊 Transactions: ${transactions}<br/>⚠️ Score risque: ${risk}%`;
        }
        return `<strong>Transaction</strong><br/>Montant: ${(params.value || 0).toLocaleString()} €`;
      }
    },
    series: [{
      type: 'graph',
      layout: 'force',
      force: {
        repulsion: 500,
        edgeLength: 150,
        gravity: 0.1,
        friction: 0.2,
        layoutAnimation: true
      },
      roam: true,
      draggable: true,
      data: networkData.nodes.map(node => ({
        name: node.name,
        value: node.value,
        risk: node.risk,
        amount: node.amount,
        transactions: node.transactions,
        symbolSize: node.symbolSize,
        itemStyle: {
          color: (node.risk || 0) > 0.8 ? '#ef4444' : (node.risk || 0) > 0.6 ? '#10b981' : (node.risk || 0) > 0.3 ? '#3b82f6' : '#10b981'
        }
      })),
      links: networkData.links.map(link => ({
        source: link.source,
        target: link.target,
        value: link.value
      })),
      lineStyle: {
        color: '#38bdf8',
        curveness: 0.3,
        width: 1.5,
        opacity: 0.5
      },
      label: {
        show: true,
        position: 'right',
        fontSize: 10,
        color: '#94a3b8',
        formatter: (params) => params.data?.risk > 0.8 ? '⚠️' : ''
      },
      emphasis: {
        focus: 'adjacency',
        lineStyle: { width: 3, color: '#10b981' }
      }
    }]
  });

  // Graphique d'évolution (Line Chart)
  const getEvolutionOption = () => ({
    title: {
      text: '📈 Évolution des Détections',
      textStyle: { color: '#94a3b8', fontSize: 13 },
      left: 'center'
    },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    legend: {
      data: ['Fraudes', 'Suspectes', 'Normales'],
      textStyle: { color: '#94a3b8' },
      top: 25
    },
    grid: { top: 70, left: 50, right: 30, bottom: 30 },
    xAxis: {
      type: 'category',
      data: evolutionData.map(d => d.date),
      axisLabel: { color: '#94a3b8', rotate: 45, interval: 5 }
    },
    yAxis: {
      type: 'value',
      name: 'Nombre de transactions',
      axisLabel: { color: '#94a3b8' },
      splitLine: { lineStyle: { color: '#334155' } }
    },
    series: [
      { name: 'Fraudes', type: 'line', data: evolutionData.map(d => d.fraudes), smooth: true, lineStyle: { color: '#ef4444', width: 2 }, areaStyle: { opacity: 0.1, color: '#ef4444' }, symbol: 'circle', symbolSize: 6 },
      { name: 'Suspectes', type: 'line', data: evolutionData.map(d => d.suspects), smooth: true, lineStyle: { color: '#10b981', width: 2 }, areaStyle: { opacity: 0.1, color: '#10b981' }, symbol: 'diamond', symbolSize: 6 },
      { name: 'Normales', type: 'line', data: evolutionData.map(d => d.normales), smooth: true, lineStyle: { color: '#10b981', width: 2 }, areaStyle: { opacity: 0.1, color: '#10b981' }, symbol: 'triangle', symbolSize: 6 }
    ]
  });

  // Graphique circulaire (Pie Chart)
  const getPieOption = () => ({
    title: {
      text: '🥧 Répartition des Transactions',
      textStyle: { color: '#94a3b8', fontSize: 13 },
      left: 'center'
    },
    tooltip: { trigger: 'item', formatter: '{b}: {d}% ({c} transactions)' },
    legend: { orient: 'vertical', left: 'left', textStyle: { color: '#94a3b8' } },
    series: [{
      type: 'pie',
      radius: '55%',
      center: ['50%', '55%'],
      data: [
        { name: 'Normales', value: pieData.normal, itemStyle: { color: '#10b981' } },
        { name: 'Suspectes', value: pieData.suspect, itemStyle: { color: '#10b981' } },
        { name: 'Fraudes', value: pieData.fraud, itemStyle: { color: '#ef4444' } }
      ],
      label: { color: '#f8fafc', formatter: '{b}: {d}%' },
      emphasis: { scale: true, label: { show: true } }
    }]
  });

  // Graphique à barres (Bar Chart)
  const getBarOption = () => ({
    title: {
      text: '📊 Classement par Score de Risque',
      textStyle: { color: '#94a3b8', fontSize: 13 },
      left: 'center'
    },
    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
    grid: { top: 50, left: 60, right: 30, bottom: 30 },
    xAxis: { type: 'category', data: bankRanking.map(b => b.name), axisLabel: { color: '#94a3b8', rotate: 30 } },
    yAxis: { type: 'value', name: 'Score de risque (%)', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: '#334155' } } },
    series: [{
      name: 'Score risque', type: 'bar', data: bankRanking.map(b => b.riskScore),
      itemStyle: {
        borderRadius: [6, 6, 0, 0],
        color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#ef4444' }] }
      },
      label: { show: true, position: 'top', color: '#f8fafc', formatter: '{c}%' }
    }]
  });

  // Graphique Jauge (Gauge Chart)
  const getGaugeOption = () => {
    const detectionRate = stats.totalProcessed > 0 
      ? Math.round((stats.fraudDetected / stats.totalProcessed) * 100) 
      : 0;
    return {
      title: {
        text: '🎯 Performance Globale',
        textStyle: { color: '#94a3b8', fontSize: 13 },
        left: 'center'
      },
      series: [{
        type: 'gauge',
        center: ['50%', '55%'],
        radius: '70%',
        startAngle: 210,
        endAngle: -30,
        min: 0,
        max: 100,
        splitNumber: 5,
        progress: { show: true, width: 18, itemStyle: { color: { type: 'linear', x: 0, y: 0, x2: 1, y2: 0, colorStops: [{ offset: 0, color: '#10b981' }, { offset: 1, color: '#38bdf8' }] } } },
        axisLine: { lineStyle: { width: 18, color: [[detectionRate / 100, '#334155'], [1, '#1e293b']] } },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: false },
        pointer: { show: false },
        detail: { offsetCenter: [0, 20], valueAnimation: true, fontSize: 24, color: '#f8fafc' },
        title: { show: true, offsetCenter: [0, -20], fontSize: 14, color: '#94a3b8' },
        data: [{ value: detectionRate, name: 'Détection' }]
      }]
    };
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0f172a' }}>
        <Spin size="large" tip="Chargement des données..." ><div/></Spin>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: '#0f172a', minHeight: '100vh' }}>
      
      {/* Alerte mode démo */}
      {apiError && (
        <Alert
          message="⚠️ Mode démonstration actif"
          description="Connexion aux services API limitée. Utilisation des données de démonstration."
          type="warning"
          showIcon
          closable
          style={{ marginBottom: 24, borderRadius: 12 }}
        />
      )}
      
      {/* En-tête */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card style={{ borderRadius: 20, marginBottom: 24, background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.98))', borderColor: 'rgba(56, 189, 248, 0.3)' }}>
          <Row gutter={16} align="middle">
            <Col flex="auto">
              <Space size={20}>
                <Avatar icon={<BankOutlined />} style={{ background: 'linear-gradient(135deg, #38bdf8, #475569)', width: 56, height: 56, boxShadow: '0 0 20px rgba(56, 189, 248, 0.3)' }} />
                <div>
                  <Title level={2} style={{ margin: 0, color: '#f8fafc', fontWeight: 700 }}>Lutte Anti-Blanchiment Intelligence Artificielle</Title>
                  <Text style={{ color: '#94a3b8', fontSize: 14 }}>Surveillance réseau en temps réel | Orchestrateur IA Quantique</Text>
                </div>
              </Space>
            </Col>
            <Col>
              <Space>
                <Badge status="processing" text={<span style={{ color: '#10b981', fontWeight: 500 }}>● En direct</span>} />
                <Button icon={<ReloadOutlined spin={refreshing} />} onClick={handleRefresh} style={{ background: 'rgba(56, 189, 248, 0.1)', borderColor: 'rgba(56, 189, 248, 0.3)', color: '#38bdf8', borderRadius: 10 }}>Rafraîchir</Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* Statistiques */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { title: 'Transactions traitées', value: stats.totalProcessed, icon: <DatabaseOutlined />, color: '#38bdf8' },
          { title: 'Fraudes détectées', value: stats.fraudDetected, icon: <FireOutlined />, color: '#ef4444' },
          { title: 'En attente revue', value: stats.pendingReview, icon: <ClockCircleOutlined />, color: '#10b981' },
          { title: 'Score détection', value: stats.totalProcessed > 0 ? Math.min(100, Math.round((stats.fraudDetected / stats.totalProcessed) * 100)) : 0, icon: <LineChartOutlined />, color: '#10b981', suffix: '%' }
        ].map((stat, idx) => (
          <Col xs={24} sm={12} lg={6} key={idx}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: idx * 0.1 }}>
              <Card hoverable style={{ background: 'rgba(15, 23, 42, 0.9)', borderRadius: 16, borderColor: `${stat.color}20` }}>
                <Statistic 
                  title={<span style={{ color: '#94a3b8', fontSize: 13 }}>{stat.title}</span>} 
                  value={stat.value} 
                  suffix={stat.suffix} 
                  prefix={<span style={{ color: stat.color, marginRight: 8 }}>{stat.icon}</span>} 
                  valueStyle={{ color: '#f8fafc', fontWeight: 700, fontSize: 28 }} 
                />
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* Pipeline Orchestrateur */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
        <Card title={<Space><RocketOutlined style={{ color: '#38bdf8' }} /><span style={{ color: '#f8fafc', fontWeight: 600 }}>Pipeline Orchestrateur</span></Space>} style={{ borderRadius: 20, marginBottom: 24, background: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(56, 189, 248, 0.2)' }}>
          <Steps current={4} status="finish" items={[
            { title: <span style={{ color: '#f8fafc' }}>Ingestion Kafka</span>, description: <span style={{ color: '#94a3b8' }}>Actif</span>, icon: <CheckCircleOutlined style={{ color: '#10b981' }} /> },
            { title: <span style={{ color: '#f8fafc' }}>Neo4j Graph</span>, description: <span style={{ color: '#94a3b8' }}>{networkData.nodes.length} nœuds</span>, icon: <CheckCircleOutlined style={{ color: '#10b981' }} /> },
            { title: <span style={{ color: '#f8fafc' }}>GNN Analysis</span>, description: <span style={{ color: '#94a3b8' }}>{stats.fraudDetected} fraudes</span>, icon: <CheckCircleOutlined style={{ color: '#10b981' }} /> },
            { title: <span style={{ color: '#f8fafc' }}>Quantum QNN</span>, description: <span style={{ color: '#94a3b8' }}>{stats.pendingReview + stats.fraudDetected} anomalies</span>, icon: <CheckCircleOutlined style={{ color: '#10b981' }} /> },
            { title: <span style={{ color: '#f8fafc' }}>Orchestrator</span>, description: <span style={{ color: '#94a3b8' }}>{orchestratorDecisions.length} décisions</span>, icon: <CheckCircleOutlined style={{ color: '#10b981' }} /> }
          ]} />
          
          <Divider style={{ margin: '24px 0 16px', borderColor: 'rgba(56, 189, 248, 0.1)' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <Space><SafetyCertificateOutlined style={{ color: '#38bdf8' }} /><Text strong style={{ color: '#f8fafc' }}>📋 Dernières décisions Orchestrateur</Text></Space>
            <Badge status="processing" text={<span style={{ color: '#10b981' }}>Temps réel</span>} />
          </div>
          {orchestratorDecisions.length > 0 ? (
            <Timeline>
              {orchestratorDecisions.slice(0, 5).map((decision, idx) => (
                <Timeline.Item key={idx} color={decision.verdict === 'fraud' ? 'red' : 'orange'} dot={decision.verdict === 'fraud' ? <CloseCircleOutlined /> : <WarningOutlined />}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <Text strong style={{ color: '#f8fafc' }}>Transaction {decision.transaction_id || decision.id}</Text><br />
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>{decision.reason || decision.message || 'Analyse en cours'}</Text>
                      <div style={{ marginTop: 6 }}>
                        <Tag color="gold">Score: {decision.risk_score || decision.score || 75}%</Tag>
                        <Tag color="blue">Montant: {(decision.amount || 0).toLocaleString()} €</Tag>
                      </div>
                    </div>
                    <div>
                      <Tag color={decision.verdict === 'fraud' ? 'red' : 'orange'}>{decision.verdict === 'fraud' ? '🔴 FRAUDE' : '🟠 SUSPECT'}</Tag>
                      <Text style={{ color: '#64748b', fontSize: 11, marginLeft: 8 }}>{decision.timestamp || new Date().toLocaleTimeString()}</Text>
                    </div>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          ) : (
            <Empty description="Aucune décision pour le moment" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Card>
      </motion.div>

      {/* Dashboard Graphiques */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.3 }}>
            <Card style={{ borderRadius: 20, background: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(56, 189, 248, 0.2)', height: 420 }}>
              {networkData.nodes.length > 0 ? (
                <ReactECharts option={getNetworkOption()} style={{ height: 380 }} theme="dark" />
              ) : (
                <Empty description="Aucune donnée réseau" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ paddingTop: 150 }} />
              )}
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} lg={12}>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.35 }}>
            <Card style={{ borderRadius: 20, background: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(56, 189, 248, 0.2)', height: 420 }}>
              {evolutionData.length > 0 ? (
                <ReactECharts option={getEvolutionOption()} style={{ height: 380 }} theme="dark" />
              ) : (
                <Empty description="Aucune donnée d'évolution" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ paddingTop: 150 }} />
              )}
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} lg={8}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
            <Card style={{ borderRadius: 20, background: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(56, 189, 248, 0.2)', height: 380 }}>
              <ReactECharts option={getPieOption()} style={{ height: 340 }} theme="dark" />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} lg={8}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.45 }}>
            <Card style={{ borderRadius: 20, background: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(56, 189, 248, 0.2)', height: 380 }}>
              {bankRanking.length > 0 ? (
                <ReactECharts option={getBarOption()} style={{ height: 340 }} theme="dark" />
              ) : (
                <Empty description="Aucune donnée de classement" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ paddingTop: 150 }} />
              )}
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} lg={8}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
            <Card style={{ borderRadius: 20, background: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(56, 189, 248, 0.2)', height: 380 }}>
              <ReactECharts option={getGaugeOption()} style={{ height: 340 }} theme="dark" />
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Mouvements transactions */}
      <Row style={{ marginTop: 24 }}>
        <Col span={24}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.55 }}>
            <Card title={<Space><DollarOutlined style={{ color: '#10b981' }} /><span style={{ color: '#f8fafc', fontWeight: 600 }}>Mouvements transactions en temps réel</span></Space>} style={{ borderRadius: 20, background: 'rgba(15, 23, 42, 0.95)', borderColor: 'rgba(56, 189, 248, 0.2)' }}>
              {transactionMovements.length > 0 ? (
                <Row gutter={[16, 16]}>
                  {transactionMovements.slice(0, 8).map((movement, idx) => (
                    <Col xs={24} sm={12} md={8} lg={6} key={idx}>
                      <motion.div 
                        initial={{ opacity: 0, x: -20 }} 
                        animate={{ opacity: 1, x: 0 }} 
                        transition={{ duration: 0.3, delay: idx * 0.05 }} 
                        style={{ padding: '12px', background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.6), rgba(30, 41, 59, 0.3))', borderRadius: 12, borderLeft: `3px solid ${movement.type === 'fraud' ? '#ef4444' : movement.type === 'suspect' ? '#10b981' : '#10b981'}`, cursor: 'pointer' }}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => { setSelectedTransaction(movement); setDetailsModalVisible(true); }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text strong style={{ color: '#f8fafc', fontSize: 12 }}>{movement.from?.substring(0, 15)} → {movement.to?.substring(0, 15)}</Text>
                          <Tag color={movement.type === 'fraud' ? 'red' : movement.type === 'suspect' ? 'orange' : 'green'} style={{ fontSize: 10 }}>
                            {movement.type === 'fraud' ? 'FRAUDE' : movement.type === 'suspect' ? 'SUSPECT' : 'NORMAL'}
                          </Tag>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <Text style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: 14 }}>{movement.amount?.toLocaleString()} €</Text>
                          <Text style={{ color: '#64748b', fontSize: 10 }}>{movement.time}</Text>
                        </div>
                        <Progress percent={movement.progress || 100} size="small" strokeColor={movement.type === 'fraud' ? '#ef4444' : movement.type === 'suspect' ? '#10b981' : '#10b981'} showInfo={false} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                          <Text style={{ color: '#64748b', fontSize: 10 }}>Progression</Text>
                          <Text style={{ color: movement.type === 'fraud' ? '#ef4444' : '#94a3b8', fontSize: 10 }}>{movement.progress || 100}%</Text>
                        </div>
                      </motion.div>
                    </Col>
                  ))}
                </Row>
              ) : (
                <Empty description="Aucun mouvement en cours" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ padding: 40 }} />
              )}
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Modal détails transaction */}
      <Modal 
        title={<span style={{ color: '#f8fafc' }}>🔍 Détails transaction</span>} 
        open={detailsModalVisible} 
        onCancel={() => setDetailsModalVisible(false)} 
        footer={[<Button key="close" onClick={() => setDetailsModalVisible(false)} style={{ background: '#38bdf8', border: 'none', color: '#0f172a', borderRadius: 8 }}>Fermer</Button>]} 
        width={550} 
        styles={{ body: { background: '#0f172a' }, header: { background: '#0f172a', borderBottom: '1px solid rgba(56, 189, 248, 0.1)' } }}
      >
        {selectedTransaction && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label={<span style={{ color: '#38bdf8' }}>ID Transaction</span>}>
              <code style={{ color: '#f8fafc', background: '#1e293b', padding: '2px 6px', borderRadius: 4 }}>{selectedTransaction.id || selectedTransaction.transaction_id || 'N/A'}</code>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#38bdf8' }}>Émetteur</span>}>
              <Text style={{ color: '#f8fafc' }}>{selectedTransaction.from}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#38bdf8' }}>Bénéficiaire</span>}>
              <Text style={{ color: '#f8fafc' }}>{selectedTransaction.to}</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#38bdf8' }}>Montant</span>}>
              <Text style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: 16 }}>{selectedTransaction.amount?.toLocaleString()} €</Text>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#38bdf8' }}>Statut</span>}>
              <Tag color={selectedTransaction.type === 'fraud' ? 'red' : selectedTransaction.type === 'suspect' ? 'orange' : 'green'}>
                {selectedTransaction.type?.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#38bdf8' }}>Heure</span>}>
              <Text style={{ color: '#94a3b8' }}>{selectedTransaction.time}</Text>
            </Descriptions.Item>
            {selectedTransaction.progress && (
              <Descriptions.Item label={<span style={{ color: '#38bdf8' }}>Progression</span>}>
                <Progress percent={selectedTransaction.progress} size="small" strokeColor="#38bdf8" />
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      <style>{`
        .ant-steps-item-title { color: #f8fafc !important; }
        .ant-steps-item-description { color: #94a3b8 !important; }
        .ant-timeline-item-content { color: #f8fafc !important; }
        .ant-card-head-title { color: #f8fafc !important; }
        .ant-modal-title { color: #f8fafc !important; }
        .ant-modal-close { color: #94a3b8 !important; }
        .ant-descriptions-item-label { background: #1e293b !important; color: #94a3b8 !important; }
        .ant-descriptions-item-content { background: #0f172a !important; color: #f8fafc !important; }
        .ant-card-hoverable:hover { transform: translateY(-4px); transition: all 0.3s; }
        .ant-empty-description { color: #94a3b8 !important; }
      `}</style>
    </div>
  );
};

export default FraudDetectionBank3D;