// src/modules/analytics/PredictiveAnalytics.js
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Row, Col, Table, Tag, Space, Progress, 
  Typography, Spin, Alert, Badge, Tooltip, Divider, Button, 
  Modal, Form, Input, InputNumber, DatePicker, Slider, Switch,
  Timeline, List, message, Descriptions, Select, Checkbox,
  Statistic, Empty
} from 'antd';
import { 
  FundOutlined, RiseOutlined, FallOutlined, 
  LineChartOutlined, 
  CheckCircleOutlined, WarningOutlined,
  ThunderboltOutlined, RobotOutlined,
  AreaChartOutlined, BarChartOutlined,
  PlusOutlined, ReloadOutlined, ExportOutlined,
  ApiOutlined,
  BellOutlined, ExperimentOutlined,
  DashboardOutlined, ArrowUpOutlined, ArrowDownOutlined,
  ClockCircleOutlined, DatabaseOutlined, ShoppingOutlined, ShoppingCartOutlined, PercentageOutlined, TeamOutlined 
} from '@ant-design/icons';
import { Line } from '@ant-design/plots';
import api from '../../services/api';
import { motion } from 'framer-motion';
import io from 'socket.io-client';

const { Text, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const WS_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8000';

// ========== FONCTIONS UTILITAIRES ==========
const safeArray = (data) => Array.isArray(data) ? data : [];
const safeObject = (obj, defaultValue = {}) => (obj && typeof obj === 'object' && !Array.isArray(obj)) ? obj : defaultValue;
const safeNumber = (num, defaultValue = 0) => {
  if (num === null || num === undefined) return defaultValue;
  const parsed = parseFloat(num);
  return isNaN(parsed) ? defaultValue : parsed;
};

const formatValue = (value, unit = '€') => {
  const num = safeNumber(value);
  if (num === 0) {
    if (unit === '€') return '0 €';
    if (unit === '%') return '0%';
    if (unit === 'commandes') return '0 commandes';
    if (unit === 'entreprises') return '0 entreprises';
    return '0';
  }
  if (unit === '€') return `${num.toLocaleString('fr-FR')} €`;
  if (unit === '%') return `${num.toFixed(1)}%`;
  if (unit === 'commandes') return `${num.toLocaleString('fr-FR')} commandes`;
  if (unit === 'entreprises') return `${num.toLocaleString('fr-FR')} entreprises`;
  return num.toLocaleString('fr-FR');
};

const getTrendColor = (value) => {
  if (value > 0) return '#00d4ff';
  if (value < 0) return '#ff4757';
  return '#ffb700';
};

const getTrendIcon = (value) => {
  if (value > 0) return <ArrowUpOutlined style={{ color: '#00d4ff' }} />;
  if (value < 0) return <ArrowDownOutlined style={{ color: '#ff4757' }} />;
  return null;
};

const PredictiveAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  const [salesForecast, setSalesForecast] = useState([]);
  const [metricPredictions, setMetricPredictions] = useState([]);
  const [animateChart, setAnimateChart] = useState(true);
  const [realTimeAlerts, setRealTimeAlerts] = useState([]);
  const [scenarios, setScenarios] = useState([]);
  const [exogenousFactors, setExogenousFactors] = useState([]);
  const [thresholds, setThresholds] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  
  const [addScenarioModalVisible, setAddScenarioModalVisible] = useState(false);
  const [addExogenousModalVisible, setAddExogenousModalVisible] = useState(false);
  const [addThresholdModalVisible, setAddThresholdModalVisible] = useState(false);
  const [simulationModalVisible, setSimulationModalVisible] = useState(false);
  const [simulationResults, setSimulationResults] = useState(null);
  
  const [scenarioForm] = Form.useForm();
  const [exogenousForm] = Form.useForm();
  const [thresholdForm] = Form.useForm();
  const [simulationForm] = Form.useForm();
  
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      const socket = io(WS_URL, { path: '/ws', query: { token }, transports: ['websocket'] });
      socket.on('connect', () => console.log('✅ WebSocket connecté'));
      socket.on('prediction_alert', (data) => {
        setRealTimeAlerts(prev => [data, ...prev].slice(0, 20));
        if (data.severity === 'critical') message.warning(`🔔 ${data.message}`);
      });
      socket.on('threshold_breached', (data) => {
        setRealTimeAlerts(prev => [data, ...prev].slice(0, 20));
        message.error(`⚠️ ${data.message}`);
      });
      return () => socket.disconnect();
    }
  }, []);

  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    try {
      setError(null);
      const timestamp = Date.now();
      
      const [dashboardRes, metricsRes, scenariosRes, factorsRes, thresholdsRes, historicalRes] = await Promise.all([
        api.get('/predictions/dashboard', { params: { _t: timestamp } }),
        api.get('/predictions/metrics', { params: { _t: timestamp } }),
        api.get('/predictions/scenarios', { params: { _t: timestamp } }),
        api.get('/predictions/exogenous-factors', { params: { _t: timestamp } }),
        api.get('/predictions/thresholds', { params: { _t: timestamp } }),
        api.get('/predictions/historical', { params: { _t: timestamp } }).catch(() => ({ data: [] }))
      ]);
      
      const data = safeObject(dashboardRes.data);
      const metrics = safeArray(metricsRes.data);
      
      setDashboardData(data);
      setMetricPredictions(metrics);
      setHistoricalData(safeArray(historicalRes.data));
      
      // Récupérer les prévisions
      let futureForecasts = safeArray(data.sales_forecast || []);
      
      if (futureForecasts.length === 0 && metrics.length > 0) {
        // Générer des prévisions basées sur les métriques réelles
        const lastRevenue = metrics.find(m => m.metric_name === 'revenue')?.current_value || 0;
        if (lastRevenue > 0) {
          futureForecasts = generateForecastFromData(metrics);
        }
      }
      
      setSalesForecast(futureForecasts);
      setScenarios(safeArray(scenariosRes.data));
      setExogenousFactors(safeArray(factorsRes.data));
      setThresholds(safeArray(thresholdsRes.data));
      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('Erreur:', error);
      if (error.response?.status === 401) {
        message.error('Session expirée');
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      } else {
        setError("Erreur de connexion au serveur");
        message.error('Erreur de connexion');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Générer des prévisions à partir des données réelles
  const generateForecastFromData = (metrics) => {
    const revenueMetric = metrics.find(m => m.metric_name === 'revenue');
    if (!revenueMetric) return [];
    
    const currentRevenue = safeNumber(revenueMetric.current_value);
    const growthRate = safeNumber(revenueMetric.growth_rate, 0.08);
    const forecasts = [];
    const today = new Date();
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    
    for (let i = 1; i <= 12; i++) {
      const date = new Date(today);
      date.setMonth(today.getMonth() + i);
      const value = currentRevenue * Math.pow(1 + growthRate, i);
      forecasts.push({
        month: `${months[date.getMonth()]} ${date.getFullYear()}`,
        value: Math.round(value),
        type: 'prédiction',
        lower: Math.round(value * 0.85),
        upper: Math.round(value * 1.15),
        key: i,
        date: date.toISOString()
      });
    }
    return forecasts;
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 300000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ========== HANDLERS ==========
  
  const handleAddScenario = async (values) => {
    const hide = message.loading('Création...', 0);
    try {
      await api.post('/predictions/scenarios', values);
      hide();
      message.success('Scénario créé avec succès');
      setAddScenarioModalVisible(false);
      scenarioForm.resetFields();
      fetchData(true);
    } catch (error) {
      hide();
      message.error('Erreur lors de la création du scénario');
    }
  };

  const handleAddExogenousFactor = async (values) => {
    const hide = message.loading('Ajout...', 0);
    try {
      await api.post('/predictions/exogenous-factors', values);
      hide();
      message.success('Facteur exogène ajouté avec succès');
      setAddExogenousModalVisible(false);
      exogenousForm.resetFields();
      fetchData(true);
    } catch (error) {
      hide();
      message.error('Erreur lors de l\'ajout du facteur');
    }
  };

  const handleAddThreshold = async (values) => {
    const hide = message.loading('Création...', 0);
    try {
      await api.post('/predictions/thresholds', values);
      hide();
      message.success('Seuil d\'alerte ajouté avec succès');
      setAddThresholdModalVisible(false);
      thresholdForm.resetFields();
      fetchData(true);
    } catch (error) {
      hide();
      message.error('Erreur lors de l\'ajout du seuil');
    }
  };

  const handleRunSimulation = async (values) => {
    const hide = message.loading('Simulation en cours...', 0);
    try {
      const res = await api.post('/predictions/simulate', values);
      hide();
      setSimulationResults(res.data);
      message.success('Simulation terminée avec succès');
    } catch (error) {
      hide();
      message.error('Erreur lors de la simulation');
    }
  };

  const handleExport = async () => {
    try {
      const res = await api.get('/predictions/export', { 
        responseType: 'blob' 
      });
      const url = URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = `predictions_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      message.success('Export réussi');
    } catch (error) {
      message.error('Erreur lors de l\'export');
    }
  };

  // Récupérer les métriques réelles
  const realRevenue = metricPredictions.find(m => m.metric_name === 'revenue')?.current_value || 0;
  const realOrders = metricPredictions.find(m => m.metric_name === 'orders')?.current_value || 0;
  const realAvgBasket = metricPredictions.find(m => m.metric_name === 'avg_basket')?.current_value || 0;
  const realNewClients = metricPredictions.find(m => m.metric_name === 'new_clients')?.current_value || 0;
  const realConversion = metricPredictions.find(m => m.metric_name === 'conversion')?.current_value || 0;

  // Prédictions depuis l'API
  const predictedRevenue = metricPredictions.find(m => m.metric_name === 'revenue')?.predicted_value || realRevenue * 1.1;
  const predictedOrders = metricPredictions.find(m => m.metric_name === 'orders')?.predicted_value || Math.round(realOrders * 1.1);

  const tableData = [
    {
      key: 'revenue',
      metric: { name: 'Chiffre d\'affaires', unit: '€', icon: <DashboardOutlined /> },
      current: formatValue(realRevenue, '€'),
      prediction: formatValue(predictedRevenue, '€'),
      trend: safeNumber(metricPredictions.find(m => m.metric_name === 'revenue')?.growth_rate, 0) * 100,
      confidence: safeNumber(metricPredictions.find(m => m.metric_name === 'revenue')?.confidence, 85)
    },
    {
      key: 'orders',
      metric: { name: 'Commandes', unit: 'commandes', icon: <ShoppingOutlined /> },
      current: formatValue(realOrders, 'commandes'),
      prediction: formatValue(predictedOrders, 'commandes'),
      trend: safeNumber(metricPredictions.find(m => m.metric_name === 'orders')?.growth_rate, 0) * 100,
      confidence: safeNumber(metricPredictions.find(m => m.metric_name === 'orders')?.confidence, 82)
    },
    {
      key: 'avg_basket',
      metric: { name: 'Panier moyen', unit: '€', icon: <ShoppingCartOutlined /> },
      current: formatValue(realAvgBasket, '€'),
      prediction: formatValue(realAvgBasket * 1.02, '€'),
      trend: safeNumber(metricPredictions.find(m => m.metric_name === 'avg_basket')?.growth_rate, 0) * 100,
      confidence: safeNumber(metricPredictions.find(m => m.metric_name === 'avg_basket')?.confidence, 90)
    },
    {
      key: 'conversion',
      metric: { name: 'Taux de conversion', unit: '%', icon: <PercentageOutlined /> },
      current: formatValue(realConversion, '%'),
      prediction: formatValue(realConversion * 1.03, '%'),
      trend: safeNumber(metricPredictions.find(m => m.metric_name === 'conversion')?.growth_rate, 0) * 100,
      confidence: safeNumber(metricPredictions.find(m => m.metric_name === 'conversion')?.confidence, 78)
    },
    {
      key: 'new_clients',
      metric: { name: 'Nouveaux clients', unit: 'entreprises', icon: <TeamOutlined /> },
      current: formatValue(realNewClients, 'entreprises'),
      prediction: formatValue(Math.round(realNewClients * 1.08), 'entreprises'),
      trend: safeNumber(metricPredictions.find(m => m.metric_name === 'new_clients')?.growth_rate, 0) * 100,
      confidence: safeNumber(metricPredictions.find(m => m.metric_name === 'new_clients')?.confidence, 85)
    }
  ];

  // ✅ DÉFINIR lineConfig ICI (après les données, avant le return)
  const lineConfig = {
    data: salesForecast,
    xField: 'date',
    yField: 'predicted_value',
    color: '#00d4ff',
    point: { size: 4, shape: 'circle', style: { fill: '#00d4ff', stroke: '#0066ff', lineWidth: 2 } },
    smooth: true,
    height: 350,
    area: { style: { fill: 'url(#gradient)', fillOpacity: 0.3 } },
    animate: animateChart,
    tooltip: { 
      formatter: (d) => ({ 
        name: 'Prédiction B2B', 
        value: `${d.predicted_value?.toLocaleString('fr-FR') || 0} €` 
      }) 
    },
    xAxis: {
      label: {
        formatter: (text) => {
          try {
            const date = new Date(text);
            return `${date.toLocaleString('fr-FR', { month: 'short' })} ${date.getFullYear()}`;
          } catch {
            return text;
          }
        }
      }
    },
    lineStyle: { stroke: '#00d4ff', lineWidth: 3 },
    meta: {
      predicted_value: { alias: 'Prédiction (€)' },
      date: { alias: 'Mois' }
    }
  };

  const columns = [
    { 
      title: 'Métrique', 
      dataIndex: ['metric', 'name'], 
      key: 'metric', 
      render: (t, record) => (
        <Space>
          {record.metric.icon || <AreaChartOutlined style={{ color: '#00d4ff' }} />}
          <strong style={{ color: '#ffffff' }}>{t}</strong>
          <Text type="secondary" style={{ fontSize: 12 }}>{record.metric.unit}</Text>
        </Space>
      ) 
    },
    { 
      title: 'Valeur Actuelle', 
      dataIndex: 'current', 
      key: 'current', 
      render: (t) => <span style={{ color: '#00d4ff', fontWeight: 600, fontSize: 16 }}>{t}</span> 
    },
    { 
      title: 'Prédiction J+30', 
      dataIndex: 'prediction', 
      key: 'prediction', 
      render: (t) => <span style={{ color: '#ffb700', fontWeight: 'bold', fontSize: 16 }}>{t}</span> 
    },
    { 
      title: 'Confiance', 
      dataIndex: 'confidence', 
      key: 'confidence', 
      render: (c) => (
        <Progress 
          percent={Math.round(c || 85)} 
          size="small" 
          style={{ width: 80 }} 
          strokeColor={c > 80 ? '#00d4ff' : c > 60 ? '#ffb700' : '#ff4757'} 
        />
      ) 
    },
    { 
      title: 'Tendance', 
      dataIndex: 'trend', 
      key: 'trend', 
      render: (t) => {
        const safeTrend = safeNumber(t);
        const color = getTrendColor(safeTrend);
        const icon = getTrendIcon(safeTrend);
        return (
          <Tag color={safeTrend > 0 ? 'success' : 'error'} icon={icon} style={{ fontWeight: 600 }}>
            {safeTrend > 0 ? '+' : ''}{safeTrend.toFixed(1)}%
          </Tag>
        );
      }
    }
  ];

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#0a0a0a'
      }}>
        <Spin size="large" tip="Chargement des analyses prédictives..." style={{ color: '#00d4ff' }} ><div/></Spin>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ 
      minHeight: '100vh', 
      background: '#0a0a0a', 
      padding: 24,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* ========== EN-TÊTE ========== */}
      <motion.div initial={{ y: -20 }} animate={{ y: 0 }} style={{ 
        background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0d0d0d 100%)',
        borderRadius: 24, 
        padding: '32px 40px', 
        marginBottom: 32,
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(0,212,255,0.03) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute',
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(100,100,255,0.03) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />
        
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col xs={24} md={16}>
            <Space size="large">
              <div style={{ 
                width: 70, 
                height: 70, 
                background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
                borderRadius: 20,
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(0,212,255,0.3)',
                position: 'relative'
              }}>
                <FundOutlined style={{ fontSize: 34, color: 'white' }} />
                <div style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 24,
                  height: 24,
                  background: '#00d4ff',
                  borderRadius: '50%',
                  border: '2px solid #0a0a0a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  AI
                </div>
              </div>
              <div>
                <Title level={2} style={{ 
                  margin: 0, 
                  color: 'white',
                  fontWeight: 700,
                  letterSpacing: '-0.5px',
                  background: 'linear-gradient(135deg, #ffffff 0%, #a0a0a0 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Analytics Prédictif
                </Title>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>
                  Prévisions IA • Croissance basée sur les données réelles
                </Text>
                {lastUpdate && (
                  <div style={{ marginTop: 8 }}>
                    <Tag icon={<ClockCircleOutlined />} color="blue" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}>
                      Dernière MAJ: {lastUpdate.toLocaleString()}
                    </Tag>
                  </div>
                )}
              </div>
            </Space>
          </Col>
          <Col xs={24} md={8}>
            <Space wrap style={{ float: 'right' }}>
              <Button 
                icon={<ExperimentOutlined />} 
                onClick={() => setSimulationModalVisible(true)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.85)',
                  borderRadius: 12
                }}
              >
                Simulation
              </Button>
              <Button 
                icon={<ExportOutlined />} 
                onClick={handleExport}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.85)',
                  borderRadius: 12
                }}
              >
                Exporter
              </Button>
              <Button 
                icon={<ReloadOutlined spin={refreshing} />} 
                onClick={() => fetchData(true)} 
                loading={refreshing}
                style={{
                  background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 500,
                  boxShadow: '0 4px 20px rgba(0,212,255,0.3)',
                  borderRadius: 12
                }}
              >
                Rafraîchir
              </Button>
            </Space>
          </Col>
        </Row>
      </motion.div>

      {/* ========== ALERTES TEMPS RÉEL ========== */}
      {realTimeAlerts.length > 0 && (
        <Card style={{ 
          marginBottom: 24, 
          borderRadius: 16, 
          background: 'linear-gradient(135deg, #1a0a0a 0%, #2a0a0a 100%)',
          border: '1px solid rgba(255,71,87,0.2)',
          boxShadow: '0 4px 30px rgba(255,71,87,0.05)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <BellOutlined style={{ color: '#ff4757' }} />
              <Text strong style={{ color: 'white' }}>Alertes en temps réel ({realTimeAlerts.length})</Text>
            </Space>
            <Button 
              size="small" 
              onClick={() => setRealTimeAlerts([])}
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.7)'
              }}
            >
              Effacer
            </Button>
          </div>
          <Divider style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '12px 0' }} />
          <Timeline 
            items={realTimeAlerts.slice(0, 5).map((alert, idx) => ({
              key: idx,
              color: alert.severity === 'critical' ? 'red' : 'orange',
              children: (
                <div>
                  <Text strong style={{ color: 'white' }}>{alert.title}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', display: 'block' }}>{alert.message}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {new Date(alert.timestamp).toLocaleString()}
                  </Text>
                </div>
              )
            }))} 
          />
        </Card>
      )}

      <Row gutter={[24, 24]}>
        {/* ========== GRAPHIQUE DES PRÉVISIONS ========== */}
        <Col span={24}>
          <Card 
            title={
              <Space>
                <LineChartOutlined style={{ color: '#00d4ff' }} />
                <Text strong style={{ color: 'white' }}>Prévisions de ventes B2B (12 mois)</Text>
                <Tag color="blue" icon={<RobotOutlined />} style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}>
                  IA Random Forest
                </Tag>
                {realRevenue > 0 && (
                  <Tag color="green" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.1)', color: '#00d4ff' }}>
                    CA réel: {formatValue(realRevenue)}
                  </Tag>
                )}
              </Space>
            }
            extra={
              <Switch 
                checkedChildren="Animé" 
                unCheckedChildren="Statique" 
                checked={animateChart} 
                onChange={setAnimateChart}
                style={{ color: 'rgba(255,255,255,0.7)' }}
              />
            }
            style={{ 
              borderRadius: 20,
              background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
              border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
            }}
          >
            <svg style={{ height: 0, width: 0 }}>
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#00d4ff" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#0066ff" stopOpacity="0.0"/>
                </linearGradient>
              </defs>
            </svg>
            {salesForecast.length > 0 ? (
              <Line {...lineConfig} />
            ) : (
              <div style={{ height: 350, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin tip="Génération des prévisions en cours..." ><div/></Spin>
              </div>
            )}
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Badge color="#00d4ff" text={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Prédictions mensuelles</span>} />
              {realRevenue > 0 && (
                <Badge color="#00d4ff" text={<span style={{ color: 'rgba(255,255,255,0.7)' }}>CA actuel: {formatValue(realRevenue)}</span>} style={{ marginLeft: 16 }} />
              )}
            </div>
          </Card>
        </Col>

        {/* ========== KPIS ========== */}
        <Col xs={24} md={8}>
          <Card style={{ 
            borderRadius: 20, 
            textAlign: 'center',
            background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
          }}>
            <Progress 
              type="dashboard" 
              percent={Math.round((metricPredictions.find(m => m.metric_name === 'revenue')?.confidence) || 88)} 
              format={() => `${Math.round((metricPredictions.find(m => m.metric_name === 'revenue')?.confidence) || 88)}%`} 
              strokeColor={{ '0%': '#ff4757', '100%': '#00d4ff' }} 
              width={180}
            />
            <div style={{ marginTop: 8 }}>
              <Text strong style={{ color: 'white' }}>Confiance du modèle</Text>
              <Tag color="success" style={{ display: 'block', marginTop: 8, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}>
                {(metricPredictions.find(m => m.metric_name === 'revenue')?.confidence || 88)}% de fiabilité
              </Tag>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card style={{ 
            borderRadius: 20, 
            textAlign: 'center',
            background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
          }}>
            <Progress 
              type="dashboard" 
              percent={Math.min(100, (realRevenue / 1000000) * 100)} 
              format={() => `${((realRevenue / 1000000) * 100).toFixed(1)}%`} 
              strokeColor="#00d4ff" 
              width={180}
            />
            <div style={{ marginTop: 8 }}>
              <Text strong style={{ color: 'white' }}>Objectif: 1M€</Text>
              <Tag color="success" style={{ display: 'block', marginTop: 8, background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}>
                CA actuel: {formatValue(realRevenue)}
              </Tag>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card style={{ 
            borderRadius: 20, 
            textAlign: 'center',
            background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
          }}>
            <Progress 
              type="dashboard" 
              percent={88} 
              format={() => "±8.5%"} 
              strokeColor="#ffb700" 
              width={180}
            />
            <div style={{ marginTop: 8 }}>
              <Text strong style={{ color: 'white' }}>Marge d'erreur</Text>
              <Tag color="orange" style={{ display: 'block', marginTop: 8, background: 'rgba(255,183,0,0.1)', border: '1px solid rgba(255,183,0,0.2)', color: '#ffb700' }}>
                Précision ±8.5%
              </Tag>
            </div>
          </Card>
        </Col>

        {/* ========== TABLEAU DES MÉTRIQUES ========== */}
        <Col span={24}>
          <Card 
            title={
              <Space>
                <BarChartOutlined style={{ color: '#00d4ff' }} />
                <Text strong style={{ color: 'white' }}>Indicateurs B2B</Text>
                {realRevenue > 0 && (
                  <Tag color="blue" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}>
                    {formatValue(realRevenue)} de CA réel
                  </Tag>
                )}
                {realOrders > 0 && (
                  <Tag color="cyan" style={{ background: 'rgba(0,212,255,0.05)', border: '1px solid rgba(0,212,255,0.1)', color: '#00d4ff' }}>
                    {realOrders} commandes réelles
                  </Tag>
                )}
              </Space>
            } 
            style={{ 
              borderRadius: 20,
              background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
              border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
            }}
          >
            <Table 
              dataSource={tableData} 
              columns={columns} 
              pagination={false} 
              rowKey="key"
              style={{ color: 'rgba(255,255,255,0.85)' }}
              className="dark-table"
            />
          </Card>
        </Col>

        {/* ========== SCÉNARIOS ========== */}
        <Col xs={24} md={12}>
          <Card 
            title={<Space><ExperimentOutlined style={{ color: '#00d4ff' }} /><Text strong style={{ color: 'white' }}>Scénarios</Text></Space>} 
            extra={
              <Button 
                icon={<PlusOutlined />} 
                size="small" 
                onClick={() => setAddScenarioModalVisible(true)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)',
                  borderRadius: 8
                }}
              >
                Ajouter
              </Button>
            } 
            style={{ 
              borderRadius: 20,
              background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
              border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
            }}
          >
            {scenarios.length > 0 ? (
              <List 
                dataSource={scenarios} 
                renderItem={item => (
                  <List.Item 
                    actions={[
                      <Button 
                        icon={<ExperimentOutlined />} 
                        size="small" 
                        onClick={() => { simulationForm.setFieldsValue({ scenario_id: item.id }); setSimulationModalVisible(true); }}
                        style={{
                          background: 'rgba(0,212,255,0.1)',
                          border: '1px solid rgba(0,212,255,0.2)',
                          color: '#00d4ff',
                          borderRadius: 8
                        }}
                      >
                        Simuler
                      </Button>
                    ]}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                  >
                    <List.Item.Meta 
                      title={<Text strong style={{ color: 'white' }}>{item.name}</Text>} 
                      description={
                        <div>
                          <Text style={{ color: 'rgba(255,255,255,0.6)' }}>{item.description}</Text>
                          <br />
                          <Space>
                            <Tag style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}>
                              Impact: {safeNumber(item.impact)}%
                            </Tag>
                            <Tag style={{ background: 'rgba(255,183,0,0.1)', border: '1px solid rgba(255,183,0,0.2)', color: '#ffb700' }}>
                              Probabilité: {safeNumber(item.probability)}%
                            </Tag>
                          </Space>
                        </div>
                      } 
                    />
                  </List.Item>
                )} 
              />
            ) : (
              <Empty 
                description={<span style={{ color: 'rgba(255,255,255,0.5)' }}>Aucun scénario configuré</span>}
                style={{ padding: '20px 0' }}
              />
            )}
          </Card>
        </Col>

        {/* ========== FACTEURS EXOGÈNES ========== */}
        <Col xs={24} md={12}>
          <Card 
            title={<Space><ApiOutlined style={{ color: '#00d4ff' }} /><Text strong style={{ color: 'white' }}>Facteurs exogènes</Text></Space>} 
            extra={
              <Button 
                icon={<PlusOutlined />} 
                size="small" 
                onClick={() => setAddExogenousModalVisible(true)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)',
                  borderRadius: 8
                }}
              >
                Ajouter
              </Button>
            } 
            style={{ 
              borderRadius: 20,
              background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
              border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
            }}
          >
            {exogenousFactors.length > 0 ? (
              <List 
                dataSource={exogenousFactors} 
                renderItem={item => (
                  <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <List.Item.Meta 
                      title={<Text strong style={{ color: 'white' }}>{item.name}</Text>} 
                      description={
                        <div>
                          <Text style={{ color: 'rgba(255,255,255,0.6)' }}>{item.description}</Text>
                          <br />
                          <Space>
                            <Tag style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}>
                              Type: {item.type}
                            </Tag>
                            <Tag style={{ background: 'rgba(255,183,0,0.1)', border: '1px solid rgba(255,183,0,0.2)', color: '#ffb700' }}>
                              Fréquence: {item.frequency}
                            </Tag>
                          </Space>
                        </div>
                      } 
                    />
                  </List.Item>
                )} 
              />
            ) : (
              <Empty 
                description={<span style={{ color: 'rgba(255,255,255,0.5)' }}>Aucun facteur exogène configuré</span>}
                style={{ padding: '20px 0' }}
              />
            )}
          </Card>
        </Col>

        {/* ========== SEUILS D'ALERTE ========== */}
        <Col span={24}>
          <Card 
            title={<Space><BellOutlined style={{ color: '#00d4ff' }} /><Text strong style={{ color: 'white' }}>Seuils d'alerte</Text></Space>} 
            extra={
              <Button 
                icon={<PlusOutlined />} 
                size="small" 
                onClick={() => setAddThresholdModalVisible(true)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.7)',
                  borderRadius: 8
                }}
              >
                Ajouter
              </Button>
            } 
            style={{ 
              borderRadius: 20,
              background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
              border: '1px solid rgba(255,255,255,0.05)',
              boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
            }}
          >
            {thresholds.length > 0 ? (
              <Table 
                dataSource={thresholds} 
                columns={[
                  { 
                    title: <span style={{ color: 'rgba(255,255,255,0.7)' }}>Métrique</span>, 
                    dataIndex: 'metric', 
                    key: 'metric',
                    render: (text) => <span style={{ color: 'white' }}>{text}</span>
                  },
                  { 
                    title: <span style={{ color: 'rgba(255,255,255,0.7)' }}>Condition</span>, 
                    dataIndex: 'condition', 
                    key: 'condition', 
                    render: (c, r) => <span style={{ color: 'rgba(255,255,255,0.85)' }}>{c} {r.threshold}</span> 
                  },
                  { 
                    title: <span style={{ color: 'rgba(255,255,255,0.7)' }}>Niveau</span>, 
                    dataIndex: 'level', 
                    key: 'level', 
                    render: l => (
                      <Tag color={l === 'critical' ? 'red' : l === 'warning' ? 'orange' : 'blue'}>
                        {l}
                      </Tag>
                    ) 
                  },
                  { 
                    title: <span style={{ color: 'rgba(255,255,255,0.7)' }}>Notification</span>, 
                    dataIndex: 'notification_method', 
                    key: 'notification', 
                    render: m => <span style={{ color: 'rgba(255,255,255,0.85)' }}>{Array.isArray(m) ? m.join(', ') : m}</span> 
                  }
                ]} 
                pagination={false} 
                rowKey="id"
                style={{ color: 'rgba(255,255,255,0.85)' }}
                className="dark-table"
              />
            ) : (
              <Empty 
                description={<span style={{ color: 'rgba(255,255,255,0.5)' }}>Aucun seuil d'alerte configuré</span>}
                style={{ padding: '20px 0' }}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* ========== MODALS ========== */}
      
      {/* Modal Scénario */}
      <Modal
        title={<Space><ExperimentOutlined style={{ color: '#00d4ff' }} /><span style={{ color: 'white' }}>Ajouter un scénario</span></Space>}
        open={addScenarioModalVisible}
        onCancel={() => { setAddScenarioModalVisible(false); scenarioForm.resetFields(); }}
        footer={null}
        style={{ top: 20 }}
        bodyStyle={{
          background: '#1a1a1a',
          borderRadius: 12,
          padding: '24px'
        }}
        modalRender={(modal) => (
          <div style={{ 
            background: '#1a1a1a',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.9)'
          }}>
            {modal}
          </div>
        )}
      >
        <Form form={scenarioForm} layout="vertical" onFinish={handleAddScenario}>
          <Form.Item name="name" label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Nom</span>} rules={[{ required: true }]}>
            <Input placeholder="Ex: Croissance B2B" style={{ background: '#2a2a2a', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }} />
          </Form.Item>
          <Form.Item name="description" label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Description</span>}>
            <TextArea rows={2} style={{ background: '#2a2a2a', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }} />
          </Form.Item>
          <Form.Item name="impact" label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Impact (%)</span>}>
            <Slider min={-50} max={50} />
          </Form.Item>
          <Form.Item name="probability" label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Probabilité (%)</span>}>
            <Slider min={0} max={100} />
          </Form.Item>
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block
              style={{
                background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
                border: 'none',
                fontWeight: 500,
                boxShadow: '0 4px 20px rgba(0,212,255,0.3)',
                borderRadius: 8
              }}
            >
              Créer
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Facteur Exogène */}
      <Modal
        title={<Space><ApiOutlined style={{ color: '#00d4ff' }} /><span style={{ color: 'white' }}>Ajouter un facteur exogène</span></Space>}
        open={addExogenousModalVisible}
        onCancel={() => { setAddExogenousModalVisible(false); exogenousForm.resetFields(); }}
        footer={null}
        style={{ top: 20 }}
        bodyStyle={{
          background: '#1a1a1a',
          borderRadius: 12,
          padding: '24px'
        }}
        modalRender={(modal) => (
          <div style={{ 
            background: '#1a1a1a',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.9)'
          }}>
            {modal}
          </div>
        )}
      >
        <Form form={exogenousForm} layout="vertical" onFinish={handleAddExogenousFactor}>
          <Form.Item name="name" label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Nom</span>} rules={[{ required: true }]}>
            <Input placeholder="Ex: Conjoncture B2B" style={{ background: '#2a2a2a', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }} />
          </Form.Item>
          <Form.Item name="type" label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Type</span>}>
            <Select style={{ background: '#2a2a2a', color: 'white' }} dropdownStyle={{ background: '#2a2a2a' }}>
              <Option value="economic">Économique</Option>
              <Option value="seasonal">Saisonnier</Option>
            </Select>
          </Form.Item>
          <Form.Item name="frequency" label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Périodicité</span>}>
            <Select style={{ background: '#2a2a2a', color: 'white' }} dropdownStyle={{ background: '#2a2a2a' }}>
              <Option value="monthly">Mensuelle</Option>
              <Option value="quarterly">Trimestrielle</Option>
            </Select>
          </Form.Item>
          <Form.Item name="description" label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Description</span>}>
            <TextArea rows={2} style={{ background: '#2a2a2a', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }} />
          </Form.Item>
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block
              style={{
                background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
                border: 'none',
                fontWeight: 500,
                boxShadow: '0 4px 20px rgba(0,212,255,0.3)',
                borderRadius: 8
              }}
            >
              Ajouter
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Seuil */}
      <Modal
        title={<Space><BellOutlined style={{ color: '#00d4ff' }} /><span style={{ color: 'white' }}>Ajouter un seuil d'alerte</span></Space>}
        open={addThresholdModalVisible}
        onCancel={() => { setAddThresholdModalVisible(false); thresholdForm.resetFields(); }}
        footer={null}
        style={{ top: 20 }}
        bodyStyle={{
          background: '#1a1a1a',
          borderRadius: 12,
          padding: '24px'
        }}
        modalRender={(modal) => (
          <div style={{ 
            background: '#1a1a1a',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.9)'
          }}>
            {modal}
          </div>
        )}
      >
        <Form form={thresholdForm} layout="vertical" onFinish={handleAddThreshold}>
          <Form.Item name="metric" label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Métrique</span>}>
            <Select style={{ background: '#2a2a2a', color: 'white' }} dropdownStyle={{ background: '#2a2a2a' }}>
              <Option value="revenue">CA B2B</Option>
              <Option value="orders">Commandes</Option>
            </Select>
          </Form.Item>
          <Form.Item name="condition" label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Condition</span>}>
            <Select style={{ background: '#2a2a2a', color: 'white' }} dropdownStyle={{ background: '#2a2a2a' }}>
              <Option value="gt">&gt;</Option>
              <Option value="lt">&lt;</Option>
            </Select>
          </Form.Item>
          <Form.Item name="threshold" label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Seuil</span>}>
            <InputNumber style={{ width: '100%', background: '#2a2a2a', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }} />
          </Form.Item>
          <Form.Item name="level" label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Niveau</span>}>
            <Select style={{ background: '#2a2a2a', color: 'white' }} dropdownStyle={{ background: '#2a2a2a' }}>
              <Option value="warning">Warning</Option>
              <Option value="critical">Critical</Option>
            </Select>
          </Form.Item>
          <Form.Item name="notification_method" label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Notification</span>}>
            <Checkbox.Group>
              <Checkbox style={{ color: 'rgba(255,255,255,0.85)' }} value="email">Email</Checkbox>
              <Checkbox style={{ color: 'rgba(255,255,255,0.85)' }} value="push">Push</Checkbox>
            </Checkbox.Group>
          </Form.Item>
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block
              style={{
                background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
                border: 'none',
                fontWeight: 500,
                boxShadow: '0 4px 20px rgba(0,212,255,0.3)',
                borderRadius: 8
              }}
            >
              Ajouter
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Simulation */}
      <Modal
        title={<Space><ExperimentOutlined style={{ color: '#00d4ff' }} /><span style={{ color: 'white' }}>Simulation B2B</span></Space>}
        open={simulationModalVisible}
        onCancel={() => { setSimulationModalVisible(false); setSimulationResults(null); simulationForm.resetFields(); }}
        footer={null}
        width={700}
        style={{ top: 20 }}
        bodyStyle={{
          background: '#1a1a1a',
          borderRadius: 12,
          padding: '24px'
        }}
        modalRender={(modal) => (
          <div style={{ 
            background: '#1a1a1a',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.9)'
          }}>
            {modal}
          </div>
        )}
      >
        <Form form={simulationForm} layout="vertical" onFinish={handleRunSimulation}>
          <Form.Item name="scenario_id" label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Scénario</span>}>
            <Select placeholder="Choisir un scénario" style={{ background: '#2a2a2a', color: 'white' }} dropdownStyle={{ background: '#2a2a2a' }}>
              {scenarios.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="custom_params" label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Paramètres personnalisés</span>}>
            <TextArea rows={3} placeholder='{"growth_rate": 0.15}' style={{ background: '#2a2a2a', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }} />
          </Form.Item>
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              block
              style={{
                background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
                border: 'none',
                fontWeight: 500,
                boxShadow: '0 4px 20px rgba(0,212,255,0.3)',
                borderRadius: 8
              }}
            >
              Lancer la simulation
            </Button>
          </Form.Item>
        </Form>
        {simulationResults && (
          <div style={{ marginTop: 24 }}>
            <Divider style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Résultats de la simulation</Text>
            </Divider>
            <Descriptions column={2} bordered size="small" style={{ background: '#0d0d0d', borderRadius: 8 }}>
              <Descriptions.Item label={<span style={{ color: 'rgba(255,255,255,0.5)' }}>Scénario</span>}>
                <span style={{ color: 'white' }}>{simulationResults.scenario_name}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: 'rgba(255,255,255,0.5)' }}>CA prévu</span>}>
                <span style={{ color: '#00d4ff', fontWeight: 600 }}>{formatValue(simulationResults.projected_revenue)}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: 'rgba(255,255,255,0.5)' }}>Variation</span>}>
                <span style={{ color: simulationResults.variation > 0 ? '#00d4ff' : '#ff4757' }}>
                  {simulationResults.variation}%
                </span>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: 'rgba(255,255,255,0.5)' }}>Confiance</span>}>
                <span style={{ color: '#ffb700' }}>{simulationResults.confidence}%</span>
              </Descriptions.Item>
            </Descriptions>
            <Alert
              message={<span style={{ color: 'white' }}>Recommandation</span>}
              description={<span style={{ color: 'rgba(255,255,255,0.7)' }}>{simulationResults.recommendation}</span>}
              type="info"
              showIcon
              style={{ 
                marginTop: 16, 
                borderRadius: 12,
                background: 'rgba(0,212,255,0.05)',
                border: '1px solid rgba(0,212,255,0.1)'
              }}
            />
          </div>
        )}
      </Modal>

      {/* ========== STYLES CSS ========== */}
      <style jsx>{`
        .dark-table .ant-table {
          background: transparent !important;
        }
        .dark-table .ant-table-thead > tr > th {
          background: rgba(255,255,255,0.03) !important;
          color: rgba(255,255,255,0.7) !important;
          border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        }
        .dark-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid rgba(255,255,255,0.03) !important;
          color: rgba(255,255,255,0.85) !important;
        }
        .dark-table .ant-table-tbody > tr:hover > td {
          background: rgba(255,255,255,0.02) !important;
        }
        .dark-table .ant-table-row-expand-icon {
          color: rgba(255,255,255,0.5) !important;
        }
        .dark-table .ant-empty-description {
          color: rgba(255,255,255,0.3) !important;
        }
      `}</style>
    </motion.div>
  );
};

export default PredictiveAnalytics;