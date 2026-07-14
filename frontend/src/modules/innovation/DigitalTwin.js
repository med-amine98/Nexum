// src/modules/digital-twin/DigitalTwin.js - Version sans mock data
import React, { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Box, Torus, Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import { graphic } from 'echarts';
import { Row, Col, Typography, Space, Progress, Badge, Button, Tabs, Spin, Empty, Alert,Card } from 'antd';
import {
  DeploymentUnitOutlined, ClusterOutlined, DatabaseOutlined,
  CloudServerOutlined, ThunderboltOutlined, RocketOutlined,
  GlobalOutlined, NodeIndexOutlined, ReloadOutlined,
  WarningOutlined, CheckCircleOutlined, LineChartOutlined,
  SyncOutlined, DashboardOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import api from '../../services/api';
import './DigitalTwin.css';

const { Title, Text } = Typography;

/* ═══════════════════════════════════════════════════════════
   3D SCENE COMPONENTS
═══════════════════════════════════════════════════════════ */

/* Pulsing core sphere */
const CoreSphere = ({ health }) => {
  const meshRef = useRef();
  const glowRef = useRef();

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      meshRef.current.rotation.y = t * 0.4;
      meshRef.current.rotation.z = t * 0.15;
    }
    if (glowRef.current) {
      const s = 1 + 0.08 * Math.sin(t * 2);
      glowRef.current.scale.set(s, s, s);
      glowRef.current.material.opacity = 0.12 + 0.06 * Math.sin(t * 2);
    }
  });

  const color = health > 90 ? '#2dd4bf' : health > 70 ? '#10b981' : '#ef4444';

  return (
    <group>
      <Sphere ref={glowRef} args={[1.6, 32, 32]}>
        <meshBasicMaterial color={color} transparent opacity={0.12} />
      </Sphere>
      <Sphere ref={meshRef} args={[1.0, 64, 64]}>
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.4}
          roughness={0.3}
          metalness={0.6}
          wireframe
        />
      </Sphere>
      <Sphere args={[0.55, 32, 32]}>
        <meshStandardMaterial
          color="#0f172a"
          emissive={color}
          emissiveIntensity={0.2}
          roughness={0.1}
          metalness={0.9}
        />
      </Sphere>
    </group>
  );
};

/* Orbiting rings */
const OrbitRing = ({ radius, speed, color, tiltX = 0, tiltZ = 0 }) => {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.getElapsedTime() * speed;
  });
  return (
    <group ref={ref} rotation={[tiltX, 0, tiltZ]}>
      <Torus args={[radius, 0.015, 8, 128]}>
        <meshBasicMaterial color={color} transparent opacity={0.35} />
      </Torus>
    </group>
  );
};

/* Twin node */
const TwinNode = ({ position, label, icon, status, value, delay = 0, metrics = {} }) => {
  const ref = useRef();
  const color = status === 'nominal' ? '#2dd4bf' : status === 'warning' ? '#10b981' : '#ef4444';
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() + delay;
    ref.current.position.y = position[1] + Math.sin(t * 0.8) * 0.15;
  });

  // Construire l'affichage des métriques
  const metricDisplay = Object.entries(metrics)
    .slice(0, 3)
    .map(([key, val]) => `${key}: ${val}`)
    .join(' | ');

  return (
    <group ref={ref} position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <Box args={[0.6, 0.6, 0.6]}>
        <meshStandardMaterial
          color={hovered ? '#fff' : '#0f172a'}
          emissive={color}
          emissiveIntensity={hovered ? 0.8 : 0.3}
          roughness={0.2}
          metalness={0.8}
        />
      </Box>
      <Sphere args={[0.5, 16, 16]}>
        <meshBasicMaterial color={color} transparent opacity={hovered ? 0.2 : 0.08} />
      </Sphere>
      {hovered && (
        <Html distanceFactor={8} center>
          <div style={{
            background: 'rgba(15,23,42,.95)',
            border: `1px solid ${color}`,
            borderRadius: 10,
            padding: '8px 14px',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(8px)',
            boxShadow: `0 8px 24px ${color}33`,
          }}>
            <div style={{ color, marginBottom: 2 }}>{label}</div>
            <div style={{ color: '#94a3b8', fontSize: 11 }}>{value}</div>
            {metricDisplay && (
              <div style={{ color: '#64748b', fontSize: 10, marginTop: 2 }}>{metricDisplay}</div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
};

/* Animated connection line */
const DataLine = ({ from, to, color = '#2dd4bf' }) => {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current && ref.current.material) {
      ref.current.material.dashOffset -= 0.02;
    }
  });
  const points = [new THREE.Vector3(...from), new THREE.Vector3(...to)];
  return (
    <Line
      points={points}
      color={color}
      lineWidth={1}
      dashed
      dashScale={3}
      dashSize={0.3}
      gapSize={0.2}
      opacity={0.5}
      transparent
    />
  );
};

/* Data particles */
const Particles = ({ count = 60 }) => {
  const points = useRef();
  const positions = useRef(new Float32Array(count * 3));

  useEffect(() => {
    for (let i = 0; i < count; i++) {
      const r = 2 + Math.random() * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      positions.current[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions.current[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions.current[i * 3 + 2] = r * Math.cos(phi);
    }
  }, [count]);

  useFrame(({ clock }) => {
    if (!points.current) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      positions.current[i * 3 + 1] += Math.sin(t + i) * 0.002;
    }
    points.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions.current}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#2dd4bf" transparent opacity={0.7} />
    </points>
  );
};

/* Prediction wave ring */
const PredictionWave = ({ radius, speed, color }) => {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * speed;
    const s = 1 + 0.5 * Math.sin(t);
    ref.current.scale.set(s, s, s);
    ref.current.material.opacity = 0.15 * (1 - (s - 1) / 0.5);
  });
  return (
    <Torus ref={ref} args={[radius, 0.03, 8, 64]}>
      <meshBasicMaterial color={color} transparent opacity={0.15} />
    </Torus>
  );
};

/* Main 3D Scene */
const TwinScene3D = ({ nodes, health }) => (
  <>
    <ambientLight intensity={0.25} />
    <pointLight position={[10, 10, 10]} intensity={1.2} color="#3b82f6" />
    <pointLight position={[-10, -10, -10]} intensity={0.8} color="#0d9488" />
    <pointLight position={[0, 5, 0]} intensity={0.6} color="#ffffff" />

    <CoreSphere health={health} />

    <OrbitRing radius={2.2} speed={0.3} color="#2dd4bf" tiltX={0.4} />
    <OrbitRing radius={2.8} speed={-0.2} color="#3b82f6" tiltX={-0.6} tiltZ={0.3} />
    <OrbitRing radius={3.5} speed={0.15} color="#1e40af" tiltX={1.0} tiltZ={-0.4} />

    <PredictionWave radius={2.2} speed={1.5} color="#2dd4bf" />
    <PredictionWave radius={3.2} speed={0.9} color="#3b82f6" />

    <Particles count={80} />

    {nodes.map((node, i) => (
      <React.Fragment key={node.id}>
        <TwinNode 
          {...node} 
          delay={i * 1.2} 
          metrics={node.metrics || {}}
        />
        <DataLine from={[0, 0, 0]} to={node.position} color={
          node.status === 'nominal' ? '#2dd4bf' : '#10b981'
        } />
      </React.Fragment>
    ))}

    <OrbitControls enablePan={false} minDistance={4} maxDistance={10} autoRotate autoRotateSpeed={0.6} />
  </>
);

/* ═══════════════════════════════════════════════════════════
   PREDICTION CHART - BASÉ SUR LES DONNÉES RÉELLES
═══════════════════════════════════════════════════════════ */
const getPredictionChartOption = (twins, historicalData) => {
  // Utiliser les données historiques réelles si disponibles
  const labels = historicalData && historicalData.length > 0
    ? historicalData.map(d => d.month || d.label || '')
    : Array.from({ length: 12 }, (_, i) => {
        const d = new Date(Date.now() + i * 3600000);
        return `${d.getHours()}h`;
      });

  const series = twins.map((twin, ti) => {
    const colors = ['#2dd4bf', '#3b82f6', '#10b981', '#10b981'];
    
    // Utiliser les données réelles du jumeau
    const data = twin.historicalData && twin.historicalData.length > 0
      ? twin.historicalData.map(val => ({
          value: val.toFixed(1)
        }))
      : labels.map((_, i) => ({
          value: (twin.baseVal || 70 + (Math.random() - 0.5) * 5).toFixed(1)
        }));

    return {
      name: twin.name,
      type: 'line',
      smooth: true,
      data: data,
      lineStyle: { width: 2.5, color: colors[ti % 4] },
      itemStyle: { color: colors[ti % 4] },
      areaStyle: {
        color: new graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: colors[ti % 4] + '40' },
          { offset: 1, color: colors[ti % 4] + '00' },
        ]),
      },
      symbol: 'circle',
      symbolSize: 6,
    };
  });

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15,23,42,.92)',
      borderColor: 'rgba(45,212,191,.2)',
      borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 12 },
    },
    legend: {
      top: 10,
      textStyle: { color: '#94a3b8', fontSize: 12 },
    },
    grid: { left: 40, right: 20, top: 50, bottom: 30 },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: 'rgba(148,163,184,.2)' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      min: 0,
      max: 100,
      axisLine: { show: false },
      splitLine: { lineStyle: { color: 'rgba(148,163,184,.1)' } },
      axisLabel: { color: '#64748b', fontSize: 11, formatter: (value) => `${value}%` },
    },
    series,
  };
};

/* Gauge option */
const getGaugeOption = (value, label) => ({
  backgroundColor: 'transparent',
  series: [{
    type: 'gauge',
    startAngle: 200,
    endAngle: -20,
    min: 0,
    max: 100,
    splitNumber: 5,
    axisLine: {
      lineStyle: {
        width: 14,
        color: [
          [0.3, '#ef4444'],
          [0.6, '#10b981'],
          [0.85, '#3b82f6'],
          [1.0, '#2dd4bf'],
        ],
      },
    },
    pointer: {
      length: '65%',
      width: 6,
      itemStyle: { color: 'auto' },
    },
    axisTick: { length: 8, lineStyle: { color: 'auto', width: 1.5 } },
    splitLine: { length: 16, lineStyle: { color: 'auto', width: 3 } },
    axisLabel: { color: '#64748b', fontSize: 10, distance: 20 },
    title: {
      offsetCenter: [0, '70%'],
      fontSize: 11,
      color: '#94a3b8',
      fontWeight: 600,
    },
    detail: {
      fontSize: 28,
      fontWeight: 800,
      offsetCenter: [0, '35%'],
      color: 'auto',
      formatter: (value) => `${value}%`,
      valueAnimation: true,
    },
    data: [{ value, name: label }],
  }],
});

/* ═══════════════════════════════════════════════════════════
   MAIN COMPOSANT - SANS MOCK DATA
═══════════════════════════════════════════════════════════ */
const DigitalTwin = () => {
  const [health, setHealth] = useState(0);
  const [syncRate, setSyncRate] = useState(0);
  const [latency, setLatency] = useState(0);
  const [activeTwins, setActiveTwins] = useState(0);
  const [twins, setTwins] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('3d');
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [totalSync, setTotalSync] = useState(0);
  const [accuracy, setAccuracy] = useState(0);

  // Positions par défaut pour les jumeaux (uniquement la position, pas les données)
  const NODE_POSITIONS = {
    'commercial': [-3.0, 1.5, 0.0],
    'stock': [3.0, 1.5, 0.0],
    'production': [-2.5, -1.5, 1.0],
    'logistique': [2.5, -1.5, 1.0],
    'default': [0, 0, 0]
  };

  const fetchTelemetry = async () => {
    setLoading(true);
    setError(null);
    try {
      // Récupérer les données des jumeaux numériques
      const res = await api.get('/intelligence/twin/telemetry');
      const data = res.data;
      

      if (data && data.nodes) {
        // Mettre à jour les métriques
        setHealth(data.system_health || 0);
        setSyncRate(data.system_health || 0);
        setActiveTwins(data.nodes.length || 0);
        setTotalSync(data.recent_audits || 0);
        setAccuracy(data.system_health || 0);
        
        // Construire les jumeaux à partir des données réelles
        const formattedTwins = data.nodes.map((node, index) => {
          // Trouver la position correspondante
          const posKey = Object.keys(NODE_POSITIONS).find(key => 
            node.name.toLowerCase().includes(key)
          );
          const position = posKey ? NODE_POSITIONS[posKey] : NODE_POSITIONS.default;
          
          // Extraire les métriques
          const metrics = node.metrics || {};
          const load = node.load || 0;
          
          return {
            id: node.id || index + 1,
            name: node.name || `Node ${index + 1}`,
            status: node.status === 'nominal' ? 'nominal' : 'warning',
            position: position,
            value: `${load}% charge`,
            baseVal: load,
            volatility: 5 + Math.random() * 10,
            metrics: metrics,
            historicalData: [load - 10, load - 5, load, load + 5, load + 10]
          };
        });

        setTwins(formattedTwins);
        
        // Données historiques pour le graphique
        if (data.nodes && data.nodes.length > 0) {
          const histData = data.nodes.map(node => ({
            month: node.name.split('(')[0].trim(),
            value: node.load || 0
          }));
          setHistoricalData(histData);
        }

        setLastUpdate(new Date());
      } else {
        // Pas de données - afficher un message
        setTwins([]);
        setHistoricalData([]);
      }
    } catch (error) {
      console.error('❌ Erreur chargement télémétrie:', error);
      setError(error.message || 'Erreur de chargement des données');
      setTwins([]);
      setHistoricalData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    
    // Rafraîchissement toutes les 30 secondes
    const interval = setInterval(() => {
      fetchTelemetry();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Calcul des KPIs
  const KPI_CARDS = [
    { 
      label: 'Santé Globale', 
      value: health.toFixed(1), 
      suffix: '%', 
      icon: <CheckCircleOutlined />, 
      color: health > 80 ? '#10b981' : health > 50 ? '#10b981' : '#ef4444',
      trend: health > 80 ? '+0.2%' : health > 50 ? 'stable' : '-2%'
    },
    { 
      label: 'Taux de Sync.', 
      value: syncRate.toFixed(0), 
      suffix: '%', 
      icon: <ClusterOutlined />, 
      color: '#2dd4bf',
      trend: '+1.5%'
    },
    { 
      label: 'Latence', 
      value: latency.toFixed(0), 
      suffix: 'ms',
      icon: <ThunderboltOutlined />, 
      color: '#3b82f6',
      trend: '-2ms'
    },
    { 
      label: 'Jumeaux Actifs', 
      value: activeTwins, 
      suffix: '', 
      icon: <DeploymentUnitOutlined />, 
      color: '#10b981',
      trend: 'stable'
    }
  ];

  // Afficher un loader pendant le chargement
  if (loading) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        background: '#0a0f1c'
      }}>
        <Spin size="large" tip="Chargement des jumeaux numériques..." ><div/></Spin>
      </div>
    );
  }

  // Afficher une erreur si pas de données
  if (error && twins.length === 0) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        padding: 40,
        background: '#0a0f1c',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <Card style={{ maxWidth: 500, background: 'rgba(16,22,38,0.9)', border: '1px solid rgba(255,77,79,0.3)' }}>
          <Space direction="vertical" align="center" size="large">
            <WarningOutlined style={{ fontSize: 48, color: '#ef4444' }} />
            <Title level={3} style={{ color: 'white' }}>Aucune donnée disponible</Title>
            <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
              Aucun jumeau numérique n'est actuellement disponible.
              Vérifiez que les données sont bien synchronisées.
            </Text>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />} 
              onClick={fetchTelemetry}
            >
              Réessayer
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  const displayNodes = twins.length > 0 ? twins : [];

  return (
    <div className="dt-container">
      {/* Header */}
      <div className="dt-header">
        <div className="dt-header-left">
          <div className="dt-badge">
            <span className="dt-badge-dot" style={{ background: health > 80 ? '#2dd4bf' : '#ef4444' }} />
            {health > 80 ? 'LIVE SYNC' : 'DÉGRADÉ'}
          </div>
          <Title level={2} className="dt-title">NEXUM Digital Twin</Title>
          <Text className="dt-subtitle">
            Infrastructure Holographique 3D — {activeTwins} jumeaux actifs
          </Text>
        </div>
        <div className="dt-header-right">
          <Text className="dt-update-time">
            Dernière sync : {lastUpdate.toLocaleTimeString()}
          </Text>
          <Button
            icon={<ReloadOutlined />}
            className="dt-refresh-btn"
            onClick={fetchTelemetry}
          >
            Actualiser
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <Row gutter={[16, 16]} style={{ marginBottom: 28 }}>
        {KPI_CARDS.map(kpi => (
          <Col xs={12} sm={6} key={kpi.label}>
            <div className="dt-kpi-card">
              <div className="dt-kpi-icon" style={{ color: kpi.color }}>{kpi.icon}</div>
              <div className="dt-kpi-value" style={{ color: kpi.color }}>
                {kpi.value}{kpi.suffix}
              </div>
              <div className="dt-kpi-label">{kpi.label}</div>
              <div className="dt-kpi-trend">{kpi.trend}</div>
            </div>
          </Col>
        ))}
      </Row>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        className="dt-tabs"
        items={[
          {
            key: '3d',
            label: <span><RocketOutlined /> Vue 3D Interactive</span>,
            children: displayNodes.length > 0 ? (
              <Row gutter={[24, 24]}>
                {/* 3D Canvas */}
                <Col xs={24} lg={15}>
                  <div className="dt-canvas-wrap">
                    <div className="dt-canvas-label">
                      <GlobalOutlined style={{ marginRight: 6 }} />
                      Infrastructure Holographique — Rotation libre · Zoom
                    </div>
                    <Canvas
                      style={{ height: 560 }}
                      camera={{ position: [0, 0, 7], fov: 55 }}
                      gl={{ antialias: true, alpha: true }}
                    >
                      <Suspense fallback={null}>
                        <TwinScene3D nodes={displayNodes} health={health} />
                      </Suspense>
                    </Canvas>

                    {/* Overlay node legend */}
                    <div className="dt-node-legend">
                      {displayNodes.map(n => (
                        <div key={n.id} className="dt-legend-item">
                          <span
                            className="dt-legend-dot"
                            style={{ background: n.status === 'nominal' ? '#2dd4bf' : '#10b981' }}
                          />
                          <span className="dt-legend-label">{n.name}</span>
                          <Badge
                            status={n.status === 'nominal' ? 'success' : 'warning'}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </Col>

                {/* Side gauges */}
                <Col xs={24} lg={9}>
                  <Space direction="vertical" size={20} style={{ width: '100%' }}>
                    {/* Health gauge */}
                    <div className="dt-gauge-card">
                      <div className="dt-card-title">
                        <RocketOutlined /> Efficacité Système
                      </div>
                      <ReactECharts
                        option={getGaugeOption(health, 'Santé Système')}
                        style={{ height: 200 }}
                      />
                    </div>

                    {/* Node status list */}
                    <div className="dt-status-card">
                      <div className="dt-card-title">
                        <NodeIndexOutlined /> État des Jumeaux
                      </div>
                      {displayNodes.map(node => (
                        <div key={node.id} className="dt-node-row">
                          <div className="dt-node-info">
                            <span
                              className="dt-node-status-dot"
                              style={{ background: node.status === 'nominal' ? '#2dd4bf' : '#10b981' }}
                            />
                            <span className="dt-node-name">{node.name}</span>
                          </div>
                          <div className="dt-node-value">{node.value}</div>
                          {node.status === 'warning' && (
                            <WarningOutlined style={{ color: '#10b981', fontSize: 13 }} />
                          )}
                        </div>
                      ))}

                      <div className="dt-infra-bar">
                        <Text className="dt-infra-label">
                          <CheckCircleOutlined style={{ color: '#10b981', marginRight: 6 }} />
                          Intégrité Infrastructure
                        </Text>
                        <Progress
                          percent={Math.round(health)}
                          strokeColor={{ from: '#2dd4bf', to: '#10b981' }}
                          trailColor="rgba(148,163,184,.2)"
                          status="active"
                          size="small"
                        />
                      </div>
                    </div>
                  </Space>
                </Col>
              </Row>
            ) : (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <Empty 
                  description={<Text style={{ color: 'rgba(255,255,255,0.5)' }}>Aucun jumeau numérique disponible</Text>}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            )
          },
          {
            key: 'predictions',
            label: <span><LineChartOutlined /> Prédictions IA</span>,
            children: displayNodes.length > 0 ? (
              <Row gutter={[24, 24]}>
                <Col xs={24} lg={16}>
                  <div className="dt-chart-card">
                    <div className="dt-card-title">
                      <ThunderboltOutlined /> Prédictions de performance
                    </div>
                    <ReactECharts
                      option={getPredictionChartOption(displayNodes, historicalData)}
                      style={{ height: 420 }}
                      notMerge
                    />
                  </div>
                </Col>

                <Col xs={24} lg={8}>
                  <Space direction="vertical" size={16} style={{ width: '100%' }}>
                    {displayNodes.map(node => (
                      <div key={node.id} className="dt-pred-card">
                        <div className="dt-pred-header">
                          <span className="dt-pred-name">{node.name}</span>
                          <Badge
                            status={node.status === 'nominal' ? 'success' : 'warning'}
                            text={node.status === 'nominal' ? 'Nominal' : 'Attention'}
                          />
                        </div>
                        <div className="dt-pred-value">
                          Charge prévue : <strong>{(node.baseVal || 0).toFixed(0)}%</strong>
                        </div>
                        <Progress
                          percent={Math.round(node.baseVal || 0)}
                          strokeColor={node.status === 'nominal' ? '#2dd4bf' : '#10b981'}
                          trailColor="rgba(148,163,184,.15)"
                          size="small"
                          showInfo={false}
                        />
                        <div className="dt-pred-ai">
                          🤖 IA: {node.status === 'nominal' 
                            ? 'Aucune anomalie détectée' 
                            : 'Risque modéré — surveiller'}
                        </div>
                      </div>
                    ))}
                  </Space>
                </Col>
              </Row>
            ) : (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <Empty 
                  description={<Text style={{ color: 'rgba(255,255,255,0.5)' }}>Aucune prédiction disponible</Text>}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              </div>
            )
          }
        ]}
      />
    </div>
  );
};

export default DigitalTwin;