// src/modules/insurance/RiskPrevention.js - Version corrigée
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Row, Col, Alert, List, Tag, Button,
  Timeline, Badge, Progress, Space, Typography,
  Statistic, Tooltip, Spin, Divider, message, 
  Skeleton, Empty, Modal, Switch, Drawer,
  Descriptions, Avatar, Tabs, Table, Select
} from 'antd';
import { 
  WarningOutlined, ThunderboltOutlined, 
  BellOutlined, CheckCircleOutlined,
  ReloadOutlined, SettingOutlined,
  LineChartOutlined, DownloadOutlined,
  RobotOutlined, SafetyOutlined, EuroOutlined,
  CloudOutlined, FireOutlined, HomeOutlined,
  CarOutlined, HeartOutlined, EnvironmentOutlined,
  DashboardOutlined, ApiOutlined, GlobalOutlined,
  SafetyCertificateOutlined, DatabaseOutlined, BulbOutlined,
  RiseOutlined, FallOutlined, ShieldOutlined
} from '@ant-design/icons';
import { Line } from '@ant-design/charts';
import { motion } from 'framer-motion';
import api from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// ============================================
// CONFIGURATION DESIGN SOMBRE PROFESSIONNEL
// ============================================

const COLORS = {
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  secondary: '#00CEC9',
  success: '#00B894',
  successLight: '#55EFC4',
  warning: '#FDCB6E',
  danger: '#E17055',
  info: '#74B9FF',
  gold: '#FDCB6E',
  purple: '#6C5CE7',
  cyan: '#00CEC9',
  pink: '#FD79A8',
  
  darkBg: '#0D0D1A',
  darkBgSecondary: '#14142B',
  darkCard: '#1A1A33',
  darkCardHover: '#24244A',
  darkBorder: '#2D2D55',
  darkBorderLight: '#3D3D6B',
  
  textPrimary: '#E8E8F0',
  textSecondary: '#9898B0',
  textMuted: '#6B6B8A',
  textInverse: '#0D0D1A',
  
  statusActive: '#00B894',
  statusApplied: '#6C5CE7',
  statusDismissed: '#6B6B8A',
};

const GRADIENTS = {
  primary: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)',
  secondary: 'linear-gradient(135deg, #00CEC9 0%, #81ECEC 100%)',
  success: 'linear-gradient(135deg, #00B894 0%, #55EFC4 100%)',
  warning: 'linear-gradient(135deg, #FDCB6E 0%, #F9CA24 100%)',
  danger: 'linear-gradient(135deg, #E17055 0%, #D63031 100%)',
  darkCard: 'linear-gradient(145deg, #1A1A33 0%, #14142B 100%)',
  glass: 'linear-gradient(135deg, rgba(108, 92, 231, 0.15) 0%, rgba(0, 206, 201, 0.10) 100%)',
};

const SHADOWS = {
  card: '0 8px 32px rgba(0, 0, 0, 0.4)',
  cardHover: '0 12px 48px rgba(108, 92, 231, 0.15)',
  glow: '0 0 40px rgba(108, 92, 231, 0.1)',
  inner: 'inset 0 2px 4px rgba(255, 255, 255, 0.05)',
};

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

const formatDate = (dateString) => {
  if (!dateString) return '--/--/----';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  } catch {
    return dateString;
  }
};

const getRiskLevel = (score) => {
  if (score >= 70) return { 
    level: 'Critique', 
    color: '#E17055', 
    bgColor: 'rgba(225, 112, 85, 0.15)',
    textColor: '#E17055', 
    icon: <FireOutlined /> 
  };
  if (score >= 50) return { 
    level: 'Élevé', 
    color: '#FDCB6E', 
    bgColor: 'rgba(253, 203, 110, 0.15)',
    textColor: '#FDCB6E', 
    icon: <WarningOutlined /> 
  };
  if (score >= 30) return { 
    level: 'Modéré', 
    color: '#74B9FF', 
    bgColor: 'rgba(116, 185, 255, 0.15)',
    textColor: '#74B9FF', 
    icon: <CloudOutlined /> 
  };
  return { 
    level: 'Faible', 
    color: '#00B894', 
    bgColor: 'rgba(0, 184, 148, 0.15)',
    textColor: '#00B894', 
    icon: <CheckCircleOutlined /> 
  };
};

const COUNTRIES = [
  { code: 'france', name: 'France', flag: '🇫🇷', capital: 'Paris', lat: 48.8566, lon: 2.3522 },
  { code: 'tunisie', name: 'Tunisie', flag: '🇹🇳', capital: 'Tunis', lat: 36.8065, lon: 10.1815 },
  { code: 'uae', name: 'Émirats Arabes Unis', flag: '🇦🇪', capital: 'Dubaï', lat: 25.2048, lon: 55.2708 },
  { code: 'canada', name: 'Canada', flag: '🇨🇦', capital: 'Ottawa', lat: 45.4215, lon: -75.6972 }
];

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const RiskPrevention = () => {
  // États principaux
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('tunisie');
  const [locationInfo, setLocationInfo] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [riskScore, setRiskScore] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [weatherData, setWeatherData] = useState([]);
  const [realTimeWeather, setRealTimeWeather] = useState(null);
  const [multiSourceWeather, setMultiSourceWeather] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [uvIndex, setUvIndex] = useState(null);
  const [earthquakeRisk, setEarthquakeRisk] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeTab, setActiveTab] = useState('1');

  // Fonction de chargement des données
  const fetchData = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    
    try {
      const response = await api.get('/insurance/risk-prevention', {
        params: {
          country: selectedCountry,
          timestamp: new Date().getTime()
        }
      });
      
      const data = response.data;
      
      setLocationInfo(data.location);
      setAlerts(data.alerts || []);
      setRiskScore(data.risk_score);
      setRecommendations(data.recommendations || []);
      setWeatherData(data.weather_trend || []);
      setRealTimeWeather(data.real_time_weather);
      setMultiSourceWeather(data.multi_source_weather);
      setAirQuality(data.air_quality);
      setUvIndex(data.uv_index);
      setEarthquakeRisk(data.earthquake_risk);
      setLastUpdate(new Date());
      
      if (!silent && data.location) {
        message.success(`${data.location.flag} Chargement des données pour ${data.location.country}`);
      }
      
      const criticalAlerts = (data.alerts || []).filter(a => 
        a.severity === 'critical' || a.severity === 'high'
      );
      
      if (criticalAlerts.length > 0 && !silent) {
        message.warning({
          content: `${criticalAlerts.length} alerte(s) critique(s) à ${data.location?.country}`,
          duration: 5,
          icon: <WarningOutlined />
        });
      }
      
    } catch (error) {
      console.error('Erreur chargement:', error);
      if (error.response?.status === 401) {
        message.error('Session expirée, veuillez vous reconnecter');
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      } else {
        message.error(`Erreur lors du chargement des données pour ${COUNTRIES.find(c => c.code === selectedCountry)?.name}`);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCountry]);

  // Configuration du rafraîchissement automatique
  useEffect(() => {
    fetchData();
    
    let interval;
    if (autoRefresh) {
      interval = setInterval(() => fetchData(true), 300000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh, selectedCountry, fetchData]);

  // Changement de pays
  const handleCountryChange = (countryCode) => {
    setSelectedCountry(countryCode);
    message.info(`Changement de pays vers ${COUNTRIES.find(c => c.code === countryCode)?.name}...`);
  };

  // Appliquer une recommandation
  const applyRecommendation = async (recommendationId) => {
    const hide = message.loading('Application en cours...', 0);
    try {
      await api.post(`/insurance/risk-prevention/recommendations/${recommendationId}/apply`);
      hide();
      message.success('Recommandation appliquée avec succès');
      fetchData(true);
    } catch (error) {
      hide();
      message.error('Erreur lors de l\'application');
    }
  };

  // Marquer une alerte comme lue
  const markAlertRead = async (alertId) => {
    try {
      await api.put(`/insurance/risk-prevention/alerts/${alertId}/read`);
      setAlerts(prev => prev.map(a => 
        a.id === alertId ? { ...a, is_read: true } : a
      ));
      message.success('Alerte marquée comme lue');
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Export du rapport
  const exportReport = () => {
    const reportData = {
      generated_at: new Date().toISOString(),
      location: locationInfo,
      risk_score: riskScore,
      alerts: alerts.filter(a => !a.is_read),
      recommendations: recommendations,
      weather_trend: weatherData.slice(-7),
      air_quality: airQuality,
      uv_index: uvIndex,
      earthquake_risk: earthquakeRisk
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `risk_report_${locationInfo?.country || 'unknown'}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('Rapport exporté avec succès');
  };

  // Configuration du graphique principal - Dark Theme
  const chartConfig = useMemo(() => ({
    data: weatherData,
    xField: 'date',
    yField: 'risk',
    smooth: true,
    areaStyle: { 
      fill: 'l(270) 0:#E17055 0.5:#FDCB6E 1:#00B894', 
      fillOpacity: 0.3 
    },
    line: { color: '#6C5CE7', lineWidth: 2 },
    point: { 
      size: 4, 
      shape: 'circle', 
      color: '#A29BFE',
      style: { stroke: '#2D2D55', lineWidth: 2 }
    },
    xAxis: { 
      title: { text: 'Date', style: { fontSize: 12, fill: '#9898B0' } },
      label: { rotate: -45, autoHide: true, style: { fill: '#6B6B8A' } },
      grid: { line: { style: { stroke: '#2D2D55' } } }
    },
    yAxis: { 
      title: { text: 'Niveau de risque (%)', style: { fontSize: 12, fill: '#9898B0' } }, 
      min: 0, 
      max: 100,
      label: { formatter: (v) => `${v}%`, style: { fill: '#6B6B8A' } },
      grid: { line: { style: { stroke: '#2D2D55' } } }
    },
    tooltip: { 
      formatter: (datum) => ({
        name: 'Risque global',
        value: `${datum.risk}%`
      }),
      containerStyle: { background: '#1A1A33', border: '1px solid #2D2D55' }
    },
    theme: 'dark'
  }), [weatherData]);

  // Graphique multi-sources - Dark Theme
  const multiSourceChartConfig = useMemo(() => ({
    data: multiSourceWeather?.history || [],
    xField: 'date',
    yField: 'value',
    seriesField: 'source',
    smooth: true,
    legend: { 
      position: 'top',
      text: { style: { fill: '#9898B0' } }
    },
    yAxis: { 
      title: { text: 'Température (°C)', style: { fontSize: 12, fill: '#9898B0' } },
      grid: { line: { style: { stroke: '#2D2D55' } } },
      label: { style: { fill: '#6B6B8A' } }
    },
    xAxis: {
      label: { style: { fill: '#6B6B8A' } },
      grid: { line: { style: { stroke: '#2D2D55' } } }
    },
    tooltip: { 
      shared: true,
      containerStyle: { background: '#1A1A33', border: '1px solid #2D2D55' }
    },
    theme: 'dark'
  }), [multiSourceWeather]);

  // Statistiques calculées
  const stats = useMemo(() => ({
    activeAlerts: alerts.filter(a => !a.is_read).length,
    criticalAlerts: alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length,
    appliedRecos: recommendations.filter(r => r.is_applied).length,
    totalSavings: recommendations
      .filter(r => r.is_applied)
      .reduce((sum, r) => sum + (r.savings || 0), 0),
    averageRisk: weatherData.reduce((sum, d) => sum + (d.risk || 0), 0) / (weatherData.length || 1)
  }), [alerts, recommendations, weatherData]);

  const riskLevelInfo = useMemo(() => getRiskLevel(riskScore?.current || 0), [riskScore]);

  // Onglets pour la prop items (Ant Design v5 style)
  const tabItems = useMemo(() => [
    {
      key: '1',
      label: <span style={{ color: COLORS.textPrimary }}>📈 Évolution des risques</span>,
      children: weatherData.length > 0 ? (
        <Line {...chartConfig} height={350} />
      ) : (
        <Empty description="Aucune donnée disponible" style={{ color: COLORS.textSecondary }} />
      )
    },
    {
      key: '2',
      label: <span style={{ color: COLORS.textPrimary }}>🌡️ Comparaison multi-sources</span>,
      children: multiSourceWeather?.history && multiSourceWeather.history.length > 0 ? (
        <Line {...multiSourceChartConfig} height={350} />
      ) : (
        <Empty description="Données multi-sources non disponibles" style={{ color: COLORS.textSecondary }} />
      )
    },
    {
      key: '3',
      label: <span style={{ color: COLORS.textPrimary }}>📊 Facteurs de risque détaillés</span>,
      children: (
        <Row gutter={[16, 16]}>
          <Col span={24} md={12}>
            <Card 
              size="small" 
              title="Par catégorie"
              style={{ 
                background: COLORS.darkBgSecondary,
                border: `1px solid ${COLORS.darkBorder}`,
                borderRadius: 12
              }}
            >
              <div style={{ padding: 12 }}>
                <div style={{ marginBottom: 16 }}>
                  <Text style={{ color: COLORS.textSecondary }}>Habitation</Text>
                  <Progress percent={riskScore?.home_risk || 0} strokeColor="#ff7c43" trailColor={COLORS.darkBorder} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text style={{ color: COLORS.textSecondary }}>Automobile</Text>
                  <Progress percent={riskScore?.car_risk || 0} strokeColor="#f95d6a" trailColor={COLORS.darkBorder} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <Text style={{ color: COLORS.textSecondary }}>Santé</Text>
                  <Progress percent={riskScore?.health_risk || 0} strokeColor="#d45087" trailColor={COLORS.darkBorder} />
                </div>
                <div>
                  <Text style={{ color: COLORS.textSecondary }}>Financier</Text>
                  <Progress percent={riskScore?.financial_risk || 0} strokeColor="#6C5CE7" trailColor={COLORS.darkBorder} />
                </div>
              </div>
            </Card>
          </Col>
          <Col span={24} md={12}>
            <Card 
              size="small" 
              title="Liste des facteurs identifiés"
              style={{ 
                background: COLORS.darkBgSecondary,
                border: `1px solid ${COLORS.darkBorder}`,
                borderRadius: 12
              }}
            >
              <List
                dataSource={riskScore?.risk_factors || []}
                renderItem={item => (
                  <List.Item style={{ borderBottom: `1px solid ${COLORS.darkBorder}` }}>
                    <Space>
                      <Badge color="red" />
                      <Text style={{ color: COLORS.textPrimary }}>{item}</Text>
                    </Space>
                  </List.Item>
                )}
                locale={{ emptyText: <Empty description="Aucun facteur identifié" /> }}
              />
            </Card>
          </Col>
        </Row>
      )
    }
  ], [weatherData, chartConfig, multiSourceWeather, multiSourceChartConfig, riskScore]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        background: COLORS.darkBg 
      }}>
        <Spin size="large" tip="Chargement des données..." />
      </div>
    );
  }

  return (
    <div style={{ 
      padding: 24, 
      background: COLORS.darkBg, 
      minHeight: '100vh',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif'
    }}>
      {/* En-tête premium */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        style={{ 
          background: GRADIENTS.primary,
          borderRadius: 24, 
          padding: '28px 36px', 
          marginBottom: 28,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(108, 92, 231, 0.3)'
        }}
      >
        <div style={{ position: 'relative', zIndex: 2 }}>
          <Row align="middle" justify="space-between" gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Space size="large">
                <div style={{ 
                  width: 60, 
                  height: 60, 
                  background: 'rgba(255,255,255,0.12)',
                  borderRadius: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <SafetyCertificateOutlined style={{ fontSize: 30, color: 'white' }} />
                </div>
                <div>
                  <Title level={2} style={{ margin: 0, color: 'white', fontWeight: 700, letterSpacing: '-0.5px' }}>
                    Prévention des Sinistres
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>
                    Multi-sources • IA prédictive
                  </Text>
                </div>
              </Space>
            </Col>
            
            <Col xs={24} md={4}>
              <div style={{ 
                background: 'rgba(255,255,255,0.1)',
                borderRadius: 16,
                padding: '12px 16px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>📍 Pays actuel</Text>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>
                  {locationInfo?.flag} {locationInfo?.country}
                </div>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                  Capitale: {locationInfo?.capital}
                </Text>
              </div>
            </Col>
            
            <Col xs={24} md={4}>
              <Select
                style={{ width: '100%' }}
                placeholder="Sélectionner un pays"
                value={selectedCountry}
                onChange={handleCountryChange}
                size="large"
                dropdownStyle={{ background: COLORS.darkCard }}
              >
                {COUNTRIES.map(country => (
                  <Option key={country.code} value={country.code}>
                    <Space>
                      <span>{country.flag}</span>
                      <span style={{ color: COLORS.textPrimary }}>{country.name}</span>
                    </Space>
                  </Option>
                ))}
              </Select>
            </Col>
            
            <Col xs={24} md={4}>
              {realTimeWeather && (
                <div style={{ 
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  padding: '12px 16px',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>🌡️ Météo actuelle</Text>
                  <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>
                    {realTimeWeather.temperature}°C
                  </div>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                    💨 Vent: {realTimeWeather.wind_speed} km/h
                  </Text>
                </div>
              )}
            </Col>
            
            <Col xs={24} md={4}>
              <Space wrap style={{ justifyContent: 'flex-end' }}>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={() => fetchData(true)}
                  loading={refreshing}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    borderRadius: 12
                  }}
                >
                  Rafraîchir
                </Button>
                <Button 
                  icon={<SettingOutlined />} 
                  onClick={() => setShowSettings(true)}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    borderRadius: 12
                  }}
                />
              </Space>
            </Col>
          </Row>
        </div>
      </motion.div>

      {/* KPIs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { 
            key: 'risk', 
            title: 'Score de risque global', 
            value: riskScore?.current || 0, 
            suffix: '/100',
            icon: riskLevelInfo.icon,
            color: riskLevelInfo.color,
            bgColor: riskLevelInfo.bgColor,
            extra: (
              <Progress 
                percent={riskScore?.current || 0} 
                showInfo={false}
                strokeColor={riskLevelInfo.color}
                trailColor={COLORS.darkBorder}
                style={{ marginTop: 8 }}
              />
            )
          },
          { 
            key: 'alerts', 
            title: 'Alertes actives', 
            value: stats.activeAlerts,
            icon: <BellOutlined />,
            color: '#FDCB6E',
            bgColor: 'rgba(253, 203, 110, 0.15)',
            extra: (
              <div style={{ marginTop: 8, color: COLORS.textSecondary }}>
                <Badge status="error" /> {stats.criticalAlerts} critiques
              </div>
            )
          },
          { 
            key: 'factors', 
            title: 'Facteurs de risque', 
            value: riskScore?.risk_factors?.length || 0,
            suffix: ' facteurs',
            icon: <DashboardOutlined />,
            color: '#74B9FF',
            bgColor: 'rgba(116, 185, 255, 0.15)',
            extra: (
              <Space wrap size="small" style={{ marginTop: 8 }}>
                <Tag icon={<HomeOutlined />} color="blue">Habitation</Tag>
                <Tag icon={<CarOutlined />} color="cyan">Auto</Tag>
              </Space>
            )
          },
          { 
            key: 'savings', 
            title: 'Économies potentielles', 
            value: stats.totalSavings,
            suffix: '€/an',
            prefix: '€',
            icon: <EuroOutlined />,
            color: '#00B894',
            bgColor: 'rgba(0, 184, 148, 0.15)',
            extra: (
              <Progress 
                percent={recommendations.length ? (stats.appliedRecos / recommendations.length) * 100 : 0}
                size="small"
                strokeColor="#00B894"
                trailColor={COLORS.darkBorder}
                style={{ marginTop: 8 }}
                format={() => `${stats.appliedRecos}/${recommendations.length} appliquées`}
              />
            )
          }
        ].map((kpi, index) => (
          <Col xs={24} sm={12} lg={6} key={kpi.key}>
            <motion.div 
              whileHover={{ y: -4 }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                style={{ 
                  borderRadius: 16, 
                  background: COLORS.darkCard,
                  border: `1px solid ${COLORS.darkBorder}`,
                  boxShadow: SHADOWS.card
                }}
                bodyStyle={{ padding: '20px 16px' }}
                hoverable
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyBetween: 'space-between' }}>
                  <div style={{ flex: 1 }}>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 12, textTransform: 'uppercase' }}>
                      {kpi.title}
                    </Text>
                    <div style={{ fontSize: 28, fontWeight: 700, color: kpi.color, marginTop: 4 }}>
                      {kpi.prefix}{kpi.value}{kpi.suffix}
                    </div>
                  </div>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: kpi.bgColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: kpi.color
                  }}>
                    {kpi.icon}
                  </div>
                </div>
                {kpi.extra}
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* Risques environnementaux */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { 
            key: 'air', 
            title: '🌫️ Qualité de l\'air',
            data: airQuality,
            render: () => airQuality && !airQuality.error ? (
              <div style={{ textAlign: 'center' }}>
                <Progress 
                  type="circle" 
                  percent={(airQuality.aqi || 1) * 20} 
                  format={() => `${airQuality.aqi || 0}/5`}
                  strokeColor={(airQuality.aqi || 0) > 3 ? '#E17055' : '#00B894'}
                  trailColor={COLORS.darkBorder}
                  width={120}
                />
                <div style={{ marginTop: 12 }}>
                  <Tag color="green">{airQuality.category || 'Normal'}</Tag>
                </div>
              </div>
            ) : null
          },
          { 
            key: 'uv', 
            title: '☀️ Index UV',
            data: uvIndex,
            render: () => uvIndex && !uvIndex.error ? (
              <div style={{ textAlign: 'center' }}>
                <Progress 
                  type="circle" 
                  percent={((uvIndex.current || 0) / 11) * 100} 
                  format={() => `${uvIndex.current || 0}/11`}
                  strokeColor={(uvIndex.current || 0) > 5 ? '#FDCB6E' : '#00B894'}
                  trailColor={COLORS.darkBorder}
                  width={120}
                />
                <div style={{ marginTop: 12 }}>
                  <Tag color="orange">{uvIndex.level || 'Modéré'}</Tag>
                </div>
              </div>
            ) : null
          },
          { 
            key: 'earthquake', 
            title: '🌍 Risque sismique',
            data: earthquakeRisk,
            render: () => earthquakeRisk && !earthquakeRisk.error ? (
              <div style={{ textAlign: 'center' }}>
                <Progress 
                  type="circle" 
                  percent={(earthquakeRisk.probability || 0) * 100} 
                  format={() => `${((earthquakeRisk.probability || 0) * 100).toFixed(1)}%`}
                  strokeColor={(earthquakeRisk.probability || 0) > 0.1 ? '#E17055' : '#00B894'}
                  trailColor={COLORS.darkBorder}
                  width={120}
                />
                <div style={{ marginTop: 12 }}>
                  <Tag color="blue">{earthquakeRisk.risk_level || 'Faible'}</Tag>
                </div>
              </div>
            ) : null
          }
        ].map((item, index) => (
          <Col xs={24} md={8} key={item.key}>
            <Card 
              title={<span style={{ color: COLORS.textPrimary }}>{item.title}</span>}
              style={{ 
                borderRadius: 16, 
                background: COLORS.darkCard,
                border: `1px solid ${COLORS.darkBorder}`,
                boxShadow: SHADOWS.card
              }}
            >
              {item.data && !item.data.error ? item.render() : (
                <Empty description="Données non disponibles" style={{ color: COLORS.textSecondary }} />
              )}
            </Card>
          </Col>
        ))}
      </Row>

      {/* Graphiques et Tendances */}
      <Card 
        style={{ 
          marginBottom: 24, 
          borderRadius: 16,
          background: COLORS.darkCard,
          border: `1px solid ${COLORS.darkBorder}`,
          boxShadow: SHADOWS.card
        }}
      >
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          tabBarStyle={{ borderBottom: `1px solid ${COLORS.darkBorder}` }}
          items={tabItems}
        />
      </Card>

      {/* Alertes & Recommandations */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={12}>
          <Card 
            title={<span style={{ color: COLORS.textPrimary }}>🚨 Alertes de Risques actives</span>}
            style={{ borderRadius: 16, background: COLORS.darkCard, border: `1px solid ${COLORS.darkBorder}` }}
          >
            <List
              dataSource={alerts}
              renderItem={alert => (
                <List.Item 
                  actions={[
                    !alert.is_read && (
                      <Button type="link" onClick={() => markAlertRead(alert.id)}>
                        Marquer comme lu
                      </Button>
                    )
                  ]}
                  style={{ borderBottom: `1px solid ${COLORS.darkBorder}` }}
                >
                  <List.Item.Meta
                    avatar={<WarningOutlined style={{ color: COLORS.danger, fontSize: 24 }} />}
                    title={<span style={{ color: COLORS.textPrimary }}>{alert.title}</span>}
                    description={<span style={{ color: COLORS.textSecondary }}>{alert.description}</span>}
                  />
                </List.Item>
              )}
              locale={{ emptyText: <Empty description="Aucune alerte en cours" /> }}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card 
            title={<span style={{ color: COLORS.textPrimary }}>💡 Recommandations IA</span>}
            style={{ borderRadius: 16, background: COLORS.darkCard, border: `1px solid ${COLORS.darkBorder}` }}
          >
            <List
              dataSource={recommendations}
              renderItem={reco => (
                <List.Item 
                  actions={[
                    <Button 
                      type="primary" 
                      disabled={reco.is_applied} 
                      onClick={() => applyRecommendation(reco.id)}
                    >
                      {reco.is_applied ? 'Appliqué' : 'Appliquer'}
                    </Button>
                  ]}
                  style={{ borderBottom: `1px solid ${COLORS.darkBorder}` }}
                >
                  <List.Item.Meta
                    avatar={<BulbOutlined style={{ color: COLORS.gold, fontSize: 24 }} />}
                    title={<span style={{ color: COLORS.textPrimary }}>{reco.title}</span>}
                    description={<span style={{ color: COLORS.textSecondary }}>{reco.description} • Économies: {reco.savings}€/an</span>}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      {/* Configuration Drawer */}
      <Drawer
        title="Paramètres de Prévention"
        placement="right"
        onClose={() => setShowSettings(false)}
        open={showSettings}
        width={350}
        headerStyle={{ background: COLORS.darkBgSecondary, borderBottom: `1px solid ${COLORS.darkBorder}` }}
        bodyStyle={{ background: COLORS.darkBg, color: COLORS.textPrimary }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: COLORS.textPrimary }}>Rafraîchissement auto (5m)</Text>
            <Switch checked={autoRefresh} onChange={setAutoRefresh} />
          </div>
          <Divider style={{ borderColor: COLORS.darkBorder }} />
          <Button type="primary" block icon={<DownloadOutlined />} onClick={exportReport}>
            Exporter les données JSON
          </Button>
        </Space>
      </Drawer>
    </div>
  );
};

export default RiskPrevention;