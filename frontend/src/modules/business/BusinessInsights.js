// src/modules/insights/BusinessInsights.js - Version Premium avec design sombre professionnel
import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Statistic, Table, Tag, Space, 
  List, Rate, Tooltip, Progress, Button,
  Typography, Spin, message, Badge, Divider,
  Modal, Descriptions, Tabs,
  Empty, Form, Input, Select, InputNumber,
  Switch, Dropdown
} from 'antd';
import { 
  BulbOutlined, StarOutlined, LikeOutlined, 
  RiseOutlined, CrownOutlined, FireOutlined,
  WarningOutlined, CheckCircleOutlined, CloseCircleOutlined,
  RocketOutlined, ThunderboltOutlined, ExperimentOutlined,
  EyeOutlined, DownloadOutlined, ShareAltOutlined,
  RobotOutlined, LineChartOutlined,
  DollarOutlined, TeamOutlined, GlobalOutlined,
  ClockCircleOutlined, ReloadOutlined, FallOutlined,
  PlusOutlined, MenuOutlined,
  DashboardOutlined, TrophyOutlined
} from '@ant-design/icons';
import { WordCloud, Pie, Gauge } from '@ant-design/plots';
import api from '../../services/api';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';

dayjs.extend(relativeTime);
dayjs.locale('fr');
const { Text, Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

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
  success: 'linear-gradient(135deg, #00B894 0%, #55EFC4 100%)',
  warning: 'linear-gradient(135deg, #FDCB6E 0%, #F9CA24 100%)',
  danger: 'linear-gradient(135deg, #E17055 0%, #D63031 100%)',
};

const SHADOWS = {
  card: '0 8px 32px rgba(0, 0, 0, 0.4)',
  cardHover: '0 12px 48px rgba(108, 92, 231, 0.15)',
  inner: 'inset 0 2px 4px rgba(255, 255, 255, 0.05)',
};

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

const formatValue = (value) => {
  const num = Number(value) || 0;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M €`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k €`;
  return `${num} €`;
};

const getInsightIcon = (type, category) => {
  const icons = {
    opportunity: <RiseOutlined style={{ color: COLORS.success }} />,
    risk: <FireOutlined style={{ color: COLORS.warning }} />,
    recommendation: <BulbOutlined style={{ color: COLORS.primaryLight }} />,
    alert: <WarningOutlined style={{ color: COLORS.danger }} />,
    'Marché': <GlobalOutlined style={{ color: COLORS.info }} />,
    'Concurrence': <TeamOutlined style={{ color: COLORS.warning }} />,
    'Opérations': <ExperimentOutlined style={{ color: COLORS.cyan }} />,
    'Client': <CrownOutlined style={{ color: COLORS.purple }} />,
    'Finances': <DollarOutlined style={{ color: COLORS.gold }} />,
  };
  return icons[type] || icons[category] || <BulbOutlined />;
};

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
    '108, 92, 231';
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const BusinessInsights = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [filterType, setFilterType] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  
  const [insights, setInsights] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [performance, setPerformance] = useState(null);
  const [marketTrends, setMarketTrends] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    applied: 0,
    dismissed: 0,
    total_value: 0,
    avg_confidence: 0
  });
  
  const [selectedInsight, setSelectedInsight] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);
  const [addInsightModalVisible, setAddInsightModalVisible] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [addInsightForm] = Form.useForm();
  const [feedbackForm] = Form.useForm();

  // ============================================
  // CHARGEMENT DES DONNÉES - URLs CORRIGÉES
  // ============================================

  const fetchData = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    
    try {
      const response = await api.get('/insights/dashboard');
      const data = response.data || {};
      
      const insightsData = data.insights || [];
      const keywordsData = data.keywords || [];
      const performanceData = data.performance || {};
      const marketTrendsData = data.market_trends || [];
      
      setInsights(insightsData);
      setKeywords(keywordsData);
      setPerformance(performanceData);
      setMarketTrends(marketTrendsData);
      
      setStats({
        total: insightsData.length,
        active: insightsData.filter(i => !i.is_applied && !i.is_dismissed).length,
        applied: insightsData.filter(i => i.is_applied).length,
        dismissed: insightsData.filter(i => i.is_dismissed).length,
        total_value: insightsData.reduce((sum, i) => sum + (i.potential_value || 0), 0),
        avg_confidence: insightsData.length > 0 
          ? insightsData.reduce((sum, i) => sum + (i.confidence || 0), 0) / insightsData.length 
          : 0
      });
      
      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('Erreur chargement:', error);
      message.error('Impossible de charger les données');
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  };

  // ============================================
  // ACTIONS
  // ============================================

  const handleRefresh = () => {
    fetchData(true);
    message.success('Données actualisées');
  };

  const handleApplyInsight = async (insightId) => {
    try {
      await api.post(`/insights/${insightId}/apply`);
      message.success('Insight appliqué avec succès');
      fetchData(true);
    } catch (error) {
      console.error('Erreur application:', error);
      const errorMsg = error.response?.data?.detail || 'Erreur lors de l\'application';
      message.error(errorMsg);
    }
  };

  const handleDismissInsight = async (insightId) => {
    try {
      await api.post(`/insights/${insightId}/dismiss`);
      message.success('Insight ignoré');
      fetchData(true);
    } catch (error) {
      console.error('Erreur ignorance:', error);
      const errorMsg = error.response?.data?.detail || 'Erreur lors de l\'ignorance';
      message.error(errorMsg);
    }
  };

  const handleAddInsight = async (values) => {
    try {
      const insightData = {
        title: values.title,
        description: values.description,
        insight_type: values.insight_type,
        category: values.category,
        impact: values.impact || 'Moyen',
        potential_value: values.potential_value || 0,
        confidence: values.confidence || 80,
        urgency: values.urgency || 0,
        recommended_actions: values.recommended_actions || [],
        ai_source_model: values.ai_source_model || 'Elena',
        ai_confidence_score: (values.confidence || 80) / 100,
        ai_execution_strategy: { steps: values.recommended_actions || [] },
        company_id: 1
      };
      
      await api.post('/insights', insightData);
      message.success('Insight ajouté avec succès');
      setAddInsightModalVisible(false);
      addInsightForm.resetFields();
      fetchData(true);
    } catch (error) {
      console.error('Erreur création:', error);
      const errorMsg = error.response?.data?.detail || 'Erreur lors de l\'ajout';
      message.error(errorMsg);
    }
  };

  const handleAddFeedback = async (values) => {
    try {
      const feedbackData = {
        insight_id: selectedInsight?.id,
        action_taken: values.action_taken || '',
        result: values.result || '',
        roi: values.roi || 0,
        rating: values.rating || 0,
        comments: values.comments || ''
      };
      
      await api.post(`/insights/${selectedInsight?.id}/feedback`, feedbackData);
      message.success('Feedback enregistré avec succès');
      setFeedbackModalVisible(false);
      feedbackForm.resetFields();
    } catch (error) {
      console.error('Erreur feedback:', error);
      const errorMsg = error.response?.data?.detail || 'Erreur lors de l\'enregistrement';
      message.error(errorMsg);
    }
  };

  const handleViewDetails = (insight) => {
    setSelectedInsight(insight);
    setModalVisible(true);
  };

  // ============================================
  // FILTRES
  // ============================================

  const filteredInsights = insights.filter(item => {
    if (filterType !== 'all' && item.insight_type !== filterType) return false;
    if (filterCategory !== 'all' && item.category !== filterCategory) return false;
    return true;
  });

  const topOpportunities = insights
    .filter(i => i.insight_type === 'opportunity' && !i.is_dismissed)
    .slice(0, 3);
    
  const strategicAlerts = insights
    .filter(i => (i.insight_type === 'risk' || i.insight_type === 'alert') && !i.is_dismissed)
    .slice(0, 3);

  // ============================================
  // HOOKS
  // ============================================

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 300000);
    return () => clearInterval(interval);
  }, []);

  // ============================================
  // CONFIGURATIONS DES GRAPHIQUES
  // ============================================

  const gaugeConfig = {
    percent: Math.min((stats.avg_confidence || 0) / 100, 1),
    range: { color: ['#6C5CE7', '#2D2D55'] },
    indicator: { 
      pointer: { style: { stroke: '#A29BFE' } }, 
      pin: { style: { stroke: '#A29BFE' } } 
    },
    statistic: { 
      title: { formatter: () => 'Confiance IA', style: { color: '#9898B0', fontSize: 14 } }, 
      content: { 
        formatter: () => `${Math.round(stats.avg_confidence || 0)}%`,
        style: { color: '#E8E8F0', fontSize: 32, fontWeight: 700 }
      } 
    },
    axis: { 
      label: { formatter: (v) => `${v * 100}%`, style: { color: '#6B6B8A', fontSize: 11 } } 
    },
    theme: 'dark'
  };

  const pieConfig = {
    data: [
      { name: 'Actifs', value: stats.active },
      { name: 'Appliqués', value: stats.applied },
      { name: 'Ignorés', value: stats.dismissed }
    ].filter(d => d.value > 0),
    angleField: 'value',
    colorField: 'name',
    radius: 0.8,
    innerRadius: 0.5,
    color: ['#00B894', '#6C5CE7', '#6B6B8A'],
    label: { 
      type: 'outer', 
      content: '{name}\n{percentage}%',
      style: { fill: '#E8E8F0', fontSize: 12 }
    },
    legend: { 
      position: 'bottom',
      text: { style: { fill: '#9898B0', fontSize: 12 } }
    },
    statistic: {
      title: { style: { color: '#9898B0', fontSize: 14 } },
      content: { style: { color: '#E8E8F0', fontSize: 24, fontWeight: 700 } }
    },
    theme: 'dark'
  };

  const wordCloudConfig = {
    data: keywords.length > 0 ? keywords.map(k => ({ text: k.text, value: k.value })) : [{ text: 'Aucune donnée', value: 1 }],
    wordField: 'text',
    weightField: 'value',
    wordStyle: {
      fontFamily: 'Inter, sans-serif',
      fontSize: [12, 42],
      rotation: 0,
      color: (word) => {
        const colors = ['#6C5CE7', '#A29BFE', '#00CEC9', '#FD79A8', '#FDCB6E', '#74B9FF'];
        return colors[Math.floor(Math.random() * colors.length)];
      }
    },
    height: 280,
    theme: 'dark'
  };

  // ============================================
  // COLONNES DU TABLEAU
  // ============================================

  const columns = [
    {
      title: 'Titre',
      dataIndex: 'title',
      key: 'title',
      width: 220,
      render: (text, record) => (
        <Button 
          type="link" 
          onClick={() => handleViewDetails(record)}
          style={{ 
            padding: 0, 
            color: COLORS.primaryLight,
            fontWeight: 500,
            fontSize: 14
          }}
        >
          {text}
        </Button>
      )
    },
    {
      title: 'Type',
      dataIndex: 'insight_type',
      key: 'insight_type',
      width: 130,
      render: (type) => {
        const configs = {
          opportunity: { color: '#00B894', label: 'Opportunité', icon: <RiseOutlined /> },
          risk: { color: '#FDCB6E', label: 'Risque', icon: <FireOutlined /> },
          recommendation: { color: '#6C5CE7', label: 'Recommandation', icon: <BulbOutlined /> },
          alert: { color: '#E17055', label: 'Alerte', icon: <WarningOutlined /> }
        };
        const config = configs[type] || configs.recommendation;
        return (
          <Tag 
            color={config.color}
            icon={config.icon}
            style={{ borderRadius: 20, padding: '4px 12px', fontWeight: 500 }}
          >
            {config.label}
          </Tag>
        );
      }
    },
    {
      title: 'Catégorie',
      dataIndex: 'category',
      key: 'category',
      width: 130,
      render: (cat) => (
        <Tag 
          color={cat === 'Marché' ? '#74B9FF' : cat === 'Concurrence' ? '#FDCB6E' : '#6C5CE7'}
          style={{ borderRadius: 20 }}
        >
          {cat || 'N/A'}
        </Tag>
      )
    },
    {
      title: 'Impact',
      dataIndex: 'impact',
      key: 'impact',
      width: 100,
      render: (impact) => {
        const colors = {
          'Haut': '#E17055',
          'Élevé': '#FDCB6E',
          'Moyen': '#74B9FF',
          'Faible': '#00B894'
        };
        return (
          <Tag 
            color={colors[impact] || '#6B6B8A'}
            style={{ borderRadius: 20 }}
          >
            {impact || 'Faible'}
          </Tag>
        );
      }
    },
    {
      title: 'Valeur',
      dataIndex: 'potential_value',
      key: 'potential_value',
      width: 120,
      render: (value) => (
        <Text strong style={{ color: '#FDCB6E', fontSize: 15 }}>
          {formatValue(value)}
        </Text>
      )
    },
    {
      title: 'Confiance',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 140,
      render: (score) => (
        <Progress 
          percent={Math.round(score || 0)} 
          size="small" 
          strokeColor={score > 70 ? '#00B894' : score > 50 ? '#FDCB6E' : '#E17055'}
          trailColor="#2D2D55"
          format={(p) => `${p}%`}
          style={{ width: 100 }}
        />
      )
    },
    {
      title: 'Statut',
      key: 'status',
      width: 110,
      render: (_, record) => {
        if (record.is_dismissed) {
          return <Tag color="#6B6B8A" style={{ borderRadius: 20 }}>Ignoré</Tag>;
        }
        if (record.is_applied) {
          return <Tag color="#00B894" style={{ borderRadius: 20 }}>Appliqué</Tag>;
        }
        return <Badge status="processing" text={<span style={{ color: '#00B894' }}>Actif</span>} />;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_, record) => (
        <Space>
          <Tooltip title="Détails">
            <Button 
              type="primary" 
              shape="circle" 
              icon={<EyeOutlined />} 
              onClick={() => handleViewDetails(record)}
              size="small"
              style={{ 
                background: 'rgba(108, 92, 231, 0.2)',
                border: '1px solid rgba(108, 92, 231, 0.3)',
                color: COLORS.primaryLight
              }}
            />
          </Tooltip>
          {!record.is_applied && !record.is_dismissed && (
            <>
              <Tooltip title="Appliquer">
                <Button 
                  shape="circle" 
                  icon={<CheckCircleOutlined />} 
                  onClick={() => handleApplyInsight(record.id)}
                  size="small"
                  style={{ 
                    color: '#00B894', 
                    borderColor: '#00B894',
                    background: 'rgba(0, 184, 148, 0.1)'
                  }}
                />
              </Tooltip>
              <Tooltip title="Ignorer">
                <Button 
                  shape="circle" 
                  icon={<CloseCircleOutlined />} 
                  onClick={() => handleDismissInsight(record.id)}
                  size="small"
                  style={{ 
                    color: '#E17055', 
                    borderColor: '#E17055',
                    background: 'rgba(225, 112, 85, 0.1)'
                  }}
                />
              </Tooltip>
            </>
          )}
        </Space>
      )
    }
  ];

  // ============================================
  // DÉFINITION DES ONGLETS AVEC items
  // ============================================
  const tabItems = [
    {
      key: 'overview',
      label: <span style={{ color: COLORS.textPrimary, fontWeight: 500 }}><DashboardOutlined /> Vue d'ensemble</span>,
      children: (
        <div style={{ padding: 24 }}>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Card 
                title={<Text style={{ color: COLORS.textPrimary, fontSize: 16, fontWeight: 600 }}>Distribution des insights</Text>}
                style={{ 
                  borderRadius: 16, 
                  background: COLORS.darkBgSecondary, 
                  border: `1px solid ${COLORS.darkBorder}`
                }}
              >
                {stats.active + stats.applied + stats.dismissed > 0 ? (
                  <Pie {...pieConfig} height={280} />
                ) : (
                  <Empty description={<span style={{ color: COLORS.textSecondary }}>Aucune donnée disponible</span>} />
                )}
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card 
                title={<Text style={{ color: COLORS.textPrimary, fontSize: 16, fontWeight: 600 }}>Confiance de l'IA</Text>}
                style={{ 
                  borderRadius: 16, 
                  background: COLORS.darkBgSecondary, 
                  border: `1px solid ${COLORS.darkBorder}`
                }}
              >
                <Gauge {...gaugeConfig} height={280} />
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card 
                title={<Text style={{ color: COLORS.textPrimary, fontSize: 16, fontWeight: 600 }}>Mots-clés stratégiques</Text>}
                style={{ 
                  borderRadius: 16, 
                  background: COLORS.darkBgSecondary, 
                  border: `1px solid ${COLORS.darkBorder}`
                }}
              >
                {keywords.length > 0 ? (
                  <WordCloud {...wordCloudConfig} />
                ) : (
                  <Empty description={<span style={{ color: COLORS.textSecondary }}>Aucun mot-clé disponible</span>} />
                )}
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card 
                title={<Text style={{ color: COLORS.textPrimary, fontSize: 16, fontWeight: 600 }}>Performance</Text>}
                style={{ 
                  borderRadius: 16, 
                  background: COLORS.darkBgSecondary, 
                  border: `1px solid ${COLORS.darkBorder}`
                }}
              >
                {performance ? (
                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <Progress 
                      type="circle" 
                      percent={Math.round(performance.value || 0)} 
                      strokeColor={performance.value > 70 ? '#00B894' : '#FDCB6E'}
                      trailColor={COLORS.darkBorder}
                      format={(p) => `${p}%`}
                      width={160}
                      strokeWidth={8}
                    />
                    <div style={{ marginTop: 16 }}>
                      <Rate disabled defaultValue={Math.round((performance.value || 0) / 20)} style={{ fontSize: 16 }} />
                    </div>
                    {performance.trend && performance.trend !== 0 && (
                      <Tag 
                        color={performance.trend > 0 ? 'success' : 'error'} 
                        style={{ marginTop: 12, borderRadius: 20 }}
                        icon={performance.trend > 0 ? <RiseOutlined /> : <FallOutlined />}
                      >
                        {performance.trend > 0 ? '+' : ''}{performance.trend}% vs mois dernier
                      </Tag>
                    )}
                  </div>
                ) : (
                  <Empty description={<span style={{ color: COLORS.textSecondary }}>Aucune donnée de performance</span>} />
                )}
              </Card>
            </Col>
          </Row>

          {/* Top opportunités et alertes */}
          <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
            <Col xs={24} lg={12}>
              <Card 
                title={
                  <Space>
                    <RiseOutlined style={{ color: '#00B894' }} />
                    <Text style={{ color: COLORS.textPrimary, fontWeight: 600 }}>Top opportunités</Text>
                    <Badge count={topOpportunities.length} style={{ backgroundColor: '#00B894', color: 'white' }} />
                  </Space>
                }
                style={{ 
                  borderRadius: 16, 
                  background: COLORS.darkBgSecondary, 
                  border: `1px solid ${COLORS.darkBorder}`
                }}
              >
                {topOpportunities.length > 0 ? (
                  <List
                    dataSource={topOpportunities}
                    renderItem={item => (
                      <List.Item
                        actions={[
                          <Button 
                            type="link" 
                            size="small"
                            onClick={() => handleApplyInsight(item.id)}
                            disabled={item.is_applied}
                            style={{ color: '#00B894' }}
                          >
                            Explorer
                          </Button>
                        ]}
                        style={{ borderBottom: `1px solid ${COLORS.darkBorder}`, padding: '12px 0' }}
                      >
                        <List.Item.Meta
                          avatar={<StarOutlined style={{ color: '#FDCB6E', fontSize: 20 }} />}
                          title={<Text style={{ color: COLORS.textPrimary }}>{item.title}</Text>}
                          description={
                            <Space direction="vertical" size={2}>
                              <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>{item.description}</Text>
                              {item.potential_value > 0 && (
                                <Tag color="success" icon={<RiseOutlined />} style={{ borderRadius: 20 }}>
                                  +{formatValue(item.potential_value)}
                                </Tag>
                              )}
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description={<span style={{ color: COLORS.textSecondary }}>Aucune opportunité pour le moment</span>} />
                )}
              </Card>
            </Col>
            <Col xs={24} lg={12}>
              <Card 
                title={
                  <Space>
                    <WarningOutlined style={{ color: '#FDCB6E' }} />
                    <Text style={{ color: COLORS.textPrimary, fontWeight: 600 }}>Alertes stratégiques</Text>
                    <Badge count={strategicAlerts.length} style={{ backgroundColor: '#FDCB6E', color: '#1A1A33' }} />
                  </Space>
                }
                style={{ 
                  borderRadius: 16, 
                  background: COLORS.darkBgSecondary, 
                  border: `1px solid ${COLORS.darkBorder}`
                }}
              >
                {strategicAlerts.length > 0 ? (
                  <List
                    dataSource={strategicAlerts}
                    renderItem={item => (
                      <List.Item
                        actions={[
                          <Button 
                            type="link" 
                            size="small"
                            danger
                            onClick={() => handleApplyInsight(item.id)}
                            style={{ color: '#E17055' }}
                          >
                            Agir
                          </Button>
                        ]}
                        style={{ borderBottom: `1px solid ${COLORS.darkBorder}`, padding: '12px 0' }}
                      >
                        <List.Item.Meta
                          avatar={<FireOutlined style={{ color: '#FDCB6E', fontSize: 20 }} />}
                          title={<Text style={{ color: COLORS.textPrimary }}>{item.title}</Text>}
                          description={
                            <Space direction="vertical" size={2}>
                              <Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>{item.description}</Text>
                              {item.urgency > 0 && (
                                <Tag color="error" icon={<WarningOutlined />} style={{ borderRadius: 20 }}>
                                  Urgence: {item.urgency}/5
                                </Tag>
                              )}
                            </Space>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description={<span style={{ color: COLORS.textSecondary }}>Aucune alerte stratégique</span>} />
                )}
              </Card>
            </Col>
          </Row>

          {/* Tendances du marché */}
          {marketTrends.length > 0 && (
            <Card 
              title={
                <Space>
                  <LineChartOutlined style={{ color: '#6C5CE7' }} />
                  <Text style={{ color: COLORS.textPrimary, fontWeight: 600 }}>Tendances du marché</Text>
                </Space>
              }
              style={{ 
                borderRadius: 16, 
                background: COLORS.darkBgSecondary, 
                border: `1px solid ${COLORS.darkBorder}`,
                marginTop: 24
              }}
            >
              <Row gutter={[16, 16]}>
                {marketTrends.map((trend, idx) => (
                  <Col xs={24} sm={12} md={8} key={idx}>
                    <Card 
                      size="small" 
                      hoverable 
                      style={{ 
                        borderRadius: 16, 
                        background: COLORS.darkCard, 
                        border: `1px solid ${COLORS.darkBorder}`
                      }}
                    >
                      <Statistic 
                        title={<Text style={{ color: COLORS.textSecondary, fontSize: 13 }}>{trend.segment}</Text>}
                        value={trend.growth_rate || 0}
                        suffix="%"
                        precision={1}
                        prefix={trend.growth_rate > 0 ? <RiseOutlined /> : <FallOutlined />}
                        valueStyle={{ 
                          color: trend.growth_rate > 0 ? '#00B894' : '#E17055',
                          fontSize: 28
                        }}
                      />
                      <Divider style={{ margin: '12px 0', borderColor: COLORS.darkBorder }} />
                      <Space>
                        <Tooltip title="Niveau de confiance">
                          <Progress 
                            percent={trend.confidence || 80} 
                            size="small" 
                            showInfo={false}
                            strokeColor="#6C5CE7"
                            trailColor={COLORS.darkBorder}
                            style={{ width: 100 }}
                          />
                        </Tooltip>
                        <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Confiance: {trend.confidence || 80}%</Text>
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          )}
        </div>
      )
    },
    {
      key: 'insights',
      label: <span style={{ color: COLORS.textPrimary, fontWeight: 500 }}><BulbOutlined /> Tous les insights</span>,
      children: (
        <div style={{ padding: 24 }}>
          <Table 
            columns={columns} 
            dataSource={filteredInsights}
            rowKey="id"
            pagination={{ 
              pageSize: 10, 
              showSizeChanger: true,
              showTotal: (total) => <span style={{ color: COLORS.textSecondary }}>{total} insights</span>
            }}
            scroll={{ x: 1200 }}
            locale={{ emptyText: <Empty description={<span style={{ color: COLORS.textSecondary }}>Aucun insight trouvé</span>} /> }}
          />
        </div>
      )
    }
  ];

  // ============================================
  // RENDU
  // ============================================

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        background: COLORS.darkBg 
      }}>
        <Spin size="large" tip="Chargement des insights...">
          <div style={{ height: 100 }} />
        </Spin>
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
            <Col xs={24} md={14}>
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
                  <BulbOutlined style={{ fontSize: 30, color: 'white' }} />
                </div>
                <div>
                  <Title level={2} style={{ margin: 0, color: 'white', fontWeight: 700, letterSpacing: '-0.5px' }}>
                    Business Insights
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>
                    Intelligence stratégique • IA prédictive • Actions immédiates
                  </Text>
                </div>
              </Space>
            </Col>
            <Col xs={24} md={10}>
              <Space wrap style={{ justifyContent: 'flex-end' }}>
                {lastUpdate && (
                  <Tag 
                    icon={<ClockCircleOutlined />} 
                    style={{ 
                      background: 'rgba(255,255,255,0.1)', 
                      border: '1px solid rgba(255,255,255,0.15)',
                      color: 'white',
                      borderRadius: 20,
                      padding: '4px 16px'
                    }}
                  >
                    {dayjs(lastUpdate).fromNow()}
                  </Tag>
                )}
                <Button 
                  icon={<ReloadOutlined spin={refreshing} />} 
                  onClick={handleRefresh}
                  loading={refreshing}
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    borderRadius: 12
                  }}
                >
                  Actualiser
                </Button>
                <Button 
                  icon={<PlusOutlined />} 
                  type="primary"
                  onClick={() => setAddInsightModalVisible(true)}
                  style={{
                    background: 'white',
                    color: COLORS.primary,
                    border: 'none',
                    borderRadius: 12,
                    fontWeight: 600
                  }}
                >
                  Ajouter
                </Button>
                <Dropdown menu={{ 
                  items: [
                    { key: 'export', icon: <DownloadOutlined />, label: 'Exporter' },
                    { key: 'share', icon: <ShareAltOutlined />, label: 'Partager' }
                  ]
                }} placement="bottomRight">
                  <Button 
                    icon={<MenuOutlined />}
                    style={{
                      background: 'rgba(255,255,255,0.1)',
                      border: '1px solid rgba(255,255,255,0.2)',
                      color: 'white',
                      borderRadius: 12
                    }}
                  />
                </Dropdown>
              </Space>
            </Col>
          </Row>
        </div>
        {/* Effets de fond */}
        <div style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 300,
          height: 300,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute',
          bottom: -150,
          left: '20%',
          width: 350,
          height: 350,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '50%'
        }} />
      </motion.div>

      {/* KPIs */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { key: 'total', title: 'Total Insights', value: stats.total, icon: <BulbOutlined />, color: '#6C5CE7' },
          { key: 'active', title: 'Actifs', value: stats.active, icon: <DashboardOutlined />, color: '#00B894' },
          { key: 'applied', title: 'Appliqués', value: stats.applied, icon: <CheckCircleOutlined />, color: '#6C5CE7' },
          { key: 'value', title: 'Valeur totale', value: formatValue(stats.total_value), icon: <DollarOutlined />, color: '#FDCB6E' },
          { key: 'confidence', title: 'Confiance IA', value: `${Math.round(stats.avg_confidence || 0)}%`, icon: <RobotOutlined />, color: '#74B9FF' },
          { key: 'success', title: 'Taux de succès', value: `${stats.total > 0 ? Math.round((stats.applied / stats.total) * 100) : 0}%`, icon: <TrophyOutlined />, color: '#00B894' }
        ].map((kpi, index) => (
          <Col xs={24} sm={12} lg={4} key={kpi.key}>
            <motion.div 
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card 
                style={{ 
                  borderRadius: 16, 
                  background: COLORS.darkCard,
                  border: `1px solid ${COLORS.darkBorder}`,
                  boxShadow: SHADOWS.card,
                  transition: 'all 0.3s ease'
                }}
                bodyStyle={{ padding: '20px 16px' }}
                hoverable
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {kpi.title}
                    </Text>
                    <div style={{ 
                      fontSize: 24, 
                      fontWeight: 700, 
                      color: COLORS.textPrimary,
                      marginTop: 4
                    }}>
                      {kpi.value}
                    </div>
                  </div>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: `rgba(${hexToRgb(kpi.color)}, 0.15)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    color: kpi.color
                  }}>
                    {kpi.icon}
                  </div>
                </div>
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* Contenu principal */}
      <Card 
        style={{ 
          borderRadius: 24, 
          background: COLORS.darkCard,
          border: `1px solid ${COLORS.darkBorder}`,
          boxShadow: SHADOWS.card,
          overflow: 'hidden'
        }}
        bodyStyle={{ padding: 0 }}
      >
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          size="large"
          style={{ padding: '0 24px' }}
          tabBarStyle={{ 
            borderBottom: `1px solid ${COLORS.darkBorder}`, 
            marginBottom: 0,
            background: 'transparent'
          }}
          tabBarExtraContent={
            <Space>
              <Select 
                value={filterType} 
                onChange={setFilterType} 
                size="small"
                style={{ 
                  width: 140,
                  background: COLORS.darkBgSecondary,
                  borderRadius: 10,
                  borderColor: COLORS.darkBorder
                }}
                dropdownStyle={{ background: COLORS.darkCard }}
              >
                <Option value="all">Tous les types</Option>
                <Option value="opportunity">Opportunités</Option>
                <Option value="risk">Risques</Option>
                <Option value="recommendation">Recommandations</Option>
                <Option value="alert">Alertes</Option>
              </Select>
              <Select 
                value={filterCategory} 
                onChange={setFilterCategory} 
                size="small"
                style={{ 
                  width: 140,
                  background: COLORS.darkBgSecondary,
                  borderRadius: 10,
                  borderColor: COLORS.darkBorder
                }}
                dropdownStyle={{ background: COLORS.darkCard }}
              >
                <Option value="all">Toutes catégories</Option>
                <Option value="Marché">Marché</Option>
                <Option value="Concurrence">Concurrence</Option>
                <Option value="Opérations">Opérations</Option>
                <Option value="Client">Client</Option>
                <Option value="Finances">Finances</Option>
                <Option value="Technologie">Technologie</Option>
                <Option value="Réglementation">Réglementation</Option>
              </Select>
            </Space>
          }
          items={tabItems}
        />
      </Card>

      {/* ============================================ */}
      {/* MODALS */}
      {/* ============================================ */}

      {/* Modal Ajout Insight */}
      <Modal
        title={<Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: 600 }}>Ajouter un insight</Text>}
        open={addInsightModalVisible}
        onCancel={() => {
          setAddInsightModalVisible(false);
          addInsightForm.resetFields();
        }}
        footer={null}
        width={600}
        styles={{
          body: { background: COLORS.darkCard, padding: '24px 24px 32px' },
          header: { background: COLORS.darkCard, borderBottom: `1px solid ${COLORS.darkBorder}` },
          content: { background: COLORS.darkCard, borderRadius: 16 }
        }}
        maskStyle={{ background: 'rgba(0,0,0,0.8)' }}
      >
        <Form form={addInsightForm} layout="vertical" onFinish={handleAddInsight}>
          <Form.Item 
            name="title" 
            label={<Text style={{ color: COLORS.textSecondary }}>Titre</Text>} 
            rules={[{ required: true, message: 'Veuillez saisir un titre' }]}
          >
            <Input 
              placeholder="Titre de l'insight" 
              style={{ 
                background: COLORS.darkBgSecondary,
                border: `1px solid ${COLORS.darkBorder}`,
                color: COLORS.textPrimary,
                borderRadius: 10
              }}
            />
          </Form.Item>
          <Form.Item 
            name="description" 
            label={<Text style={{ color: COLORS.textSecondary }}>Description</Text>} 
            rules={[{ required: true, message: 'Veuillez saisir une description' }]}
          >
            <TextArea 
              rows={3} 
              placeholder="Description détaillée..."
              style={{ 
                background: COLORS.darkBgSecondary,
                border: `1px solid ${COLORS.darkBorder}`,
                color: COLORS.textPrimary,
                borderRadius: 10
              }}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item 
                name="insight_type" 
                label={<Text style={{ color: COLORS.textSecondary }}>Type</Text>} 
                rules={[{ required: true }]}
              >
                <Select 
                  style={{ background: COLORS.darkBgSecondary, borderRadius: 10 }}
                  dropdownStyle={{ background: COLORS.darkCard }}
                >
                  <Option value="opportunity">Opportunité</Option>
                  <Option value="risk">Risque</Option>
                  <Option value="recommendation">Recommandation</Option>
                  <Option value="alert">Alerte</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item 
                name="category" 
                label={<Text style={{ color: COLORS.textSecondary }}>Catégorie</Text>} 
                rules={[{ required: true }]}
              >
                <Select 
                  style={{ background: COLORS.darkBgSecondary, borderRadius: 10 }}
                  dropdownStyle={{ background: COLORS.darkCard }}
                >
                  <Option value="Marché">Marché</Option>
                  <Option value="Concurrence">Concurrence</Option>
                  <Option value="Opérations">Opérations</Option>
                  <Option value="Client">Client</Option>
                  <Option value="Finances">Finances</Option>
                  <Option value="Technologie">Technologie</Option>
                  <Option value="Réglementation">Réglementation</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="impact" label={<Text style={{ color: COLORS.textSecondary }}>Impact</Text>}>
                <Select 
                  style={{ background: COLORS.darkBgSecondary, borderRadius: 10 }}
                  dropdownStyle={{ background: COLORS.darkCard }}
                >
                  <Option value="Faible">Faible</Option>
                  <Option value="Moyen">Moyen</Option>
                  <Option value="Élevé">Élevé</Option>
                  <Option value="Haut">Haut</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="potential_value" label={<Text style={{ color: COLORS.textSecondary }}>Valeur (€)</Text>}>
                <InputNumber 
                  min={0} 
                  style={{ 
                    width: '100%', 
                    background: COLORS.darkBgSecondary,
                    border: `1px solid ${COLORS.darkBorder}`,
                    borderRadius: 10,
                    color: COLORS.textPrimary
                  }} 
                  placeholder="0" 
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="confidence" label={<Text style={{ color: COLORS.textSecondary }}>Confiance (%)</Text>}>
                <InputNumber 
                  min={0} 
                  max={100} 
                  style={{ 
                    width: '100%', 
                    background: COLORS.darkBgSecondary,
                    border: `1px solid ${COLORS.darkBorder}`,
                    borderRadius: 10,
                    color: COLORS.textPrimary
                  }} 
                  placeholder="80" 
                />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="urgency" label={<Text style={{ color: COLORS.textSecondary }}>Urgence (0-5)</Text>}>
                <InputNumber 
                  min={0} 
                  max={5} 
                  style={{ 
                    width: '100%', 
                    background: COLORS.darkBgSecondary,
                    border: `1px solid ${COLORS.darkBorder}`,
                    borderRadius: 10,
                    color: COLORS.textPrimary
                  }} 
                  placeholder="0" 
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="ai_source_model" label={<Text style={{ color: COLORS.textSecondary }}>Modèle IA</Text>}>
                <Select 
                  style={{ background: COLORS.darkBgSecondary, borderRadius: 10 }}
                  dropdownStyle={{ background: COLORS.darkCard }}
                >
                  <Option value="Elena">Elena - Stratégie</Option>
                  <Option value="Sophie">Sophie - Analyse</Option>
                  <Option value="James">James - Opérations</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="recommended_actions" label={<Text style={{ color: COLORS.textSecondary }}>Actions recommandées</Text>}>
            <Select 
              mode="tags" 
              placeholder="Ajouter des actions"
              style={{ background: COLORS.darkBgSecondary, borderRadius: 10 }}
              dropdownStyle={{ background: COLORS.darkCard }}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                style={{ 
                  background: GRADIENTS.primary,
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 600
                }}
              >
                Ajouter
              </Button>
              <Button 
                onClick={() => setAddInsightModalVisible(false)}
                style={{ 
                  background: COLORS.darkBgSecondary,
                  border: `1px solid ${COLORS.darkBorder}`,
                  color: COLORS.textSecondary,
                  borderRadius: 10
                }}
              >
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Détails Insight */}
      <Modal
        title={<Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: 600 }}>Détails de l'insight</Text>}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={700}
        styles={{
          body: { background: COLORS.darkCard, padding: '24px' },
          header: { background: COLORS.darkCard, borderBottom: `1px solid ${COLORS.darkBorder}` },
          content: { background: COLORS.darkCard, borderRadius: 16 }
        }}
        maskStyle={{ background: 'rgba(0,0,0,0.8)' }}
        footer={[
          <Button 
            key="close" 
            onClick={() => setModalVisible(false)}
            style={{ 
              background: COLORS.darkBgSecondary,
              border: `1px solid ${COLORS.darkBorder}`,
              color: COLORS.textSecondary,
              borderRadius: 10
            }}
          >
            Fermer
          </Button>,
          <Button 
            key="feedback" 
            icon={<LikeOutlined />}
            onClick={() => {
              setModalVisible(false);
              setFeedbackModalVisible(true);
            }}
            style={{ 
              border: `1px solid ${COLORS.darkBorder}`,
              color: COLORS.textPrimary,
              borderRadius: 10
            }}
          >
            Feedback
          </Button>,
          !selectedInsight?.is_applied && !selectedInsight?.is_dismissed && (
            <Button 
              key="apply" 
              type="primary" 
              onClick={() => {
                handleApplyInsight(selectedInsight?.id);
                setModalVisible(false);
              }}
              style={{ 
                background: GRADIENTS.primary,
                border: 'none',
                borderRadius: 10,
                fontWeight: 600
              }}
            >
              Appliquer
            </Button>
          )
        ].filter(Boolean)}
      >
        {selectedInsight && (
          <Descriptions 
            column={2} 
            bordered
            labelStyle={{ 
              background: COLORS.darkBgSecondary,
              color: COLORS.textSecondary,
              borderColor: COLORS.darkBorder
            }}
            contentStyle={{ 
              background: COLORS.darkCard,
              color: COLORS.textPrimary,
              borderColor: COLORS.darkBorder
            }}
          >
            <Descriptions.Item label="Titre" span={2}>
              <Text style={{ color: COLORS.textPrimary, fontWeight: 500 }}>{selectedInsight.title}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Type">
              <Tag 
                color={
                  selectedInsight.insight_type === 'opportunity' ? '#00B894' :
                  selectedInsight.insight_type === 'risk' ? '#FDCB6E' : '#6C5CE7'
                }
                style={{ borderRadius: 20 }}
              >
                {selectedInsight.insight_type === 'opportunity' ? 'Opportunité' :
                 selectedInsight.insight_type === 'risk' ? 'Risque' : 
                 selectedInsight.insight_type === 'alert' ? 'Alerte' : 'Recommandation'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Catégorie">
              <Tag style={{ borderRadius: 20, background: COLORS.darkBgSecondary, color: COLORS.textPrimary }}>
                {selectedInsight.category}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Description" span={2}>
              <Text style={{ color: COLORS.textPrimary }}>{selectedInsight.description}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Impact">
              <Tag 
                color={
                  selectedInsight.impact === 'Haut' ? '#E17055' :
                  selectedInsight.impact === 'Élevé' ? '#FDCB6E' :
                  selectedInsight.impact === 'Moyen' ? '#74B9FF' : '#00B894'
                }
                style={{ borderRadius: 20 }}
              >
                {selectedInsight.impact || 'Faible'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Valeur">
              <Text strong style={{ color: '#FDCB6E' }}>
                {formatValue(selectedInsight.potential_value)}
              </Text>
            </Descriptions.Item>
            <Descriptions.Item label="Confiance">
              <Progress 
                percent={Math.round(selectedInsight.confidence || 0)} 
                size="small" 
                strokeColor={selectedInsight.confidence > 70 ? '#00B894' : '#FDCB6E'}
                trailColor={COLORS.darkBorder}
                style={{ width: 120 }}
              />
            </Descriptions.Item>
            <Descriptions.Item label="Urgence">
              <Tag color="#E17055" style={{ borderRadius: 20 }}>Urgence: {selectedInsight.urgency || 0}/5</Tag>
            </Descriptions.Item>
            {selectedInsight.ai_source_model && (
              <Descriptions.Item label="Modèle IA" span={2}>
                <Tag color="#6C5CE7" style={{ borderRadius: 20 }}>{selectedInsight.ai_source_model}</Tag>
                {selectedInsight.ai_confidence_score && (
                  <Text style={{ color: COLORS.textSecondary, marginLeft: 8 }}>
                    Score: {Math.round((selectedInsight.ai_confidence_score || 0) * 100)}%
                  </Text>
                )}
              </Descriptions.Item>
            )}
            <Descriptions.Item label="Créé le" span={2}>
              <Text style={{ color: COLORS.textSecondary }}>
                {selectedInsight.created_at ? dayjs(selectedInsight.created_at).format('DD/MM/YYYY HH:mm') : 'N/A'}
              </Text>
            </Descriptions.Item>
            {selectedInsight.recommended_actions?.length > 0 && (
              <Descriptions.Item label="Actions recommandées" span={2}>
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  {selectedInsight.recommended_actions.map((action, idx) => (
                    <li key={idx} style={{ color: COLORS.textPrimary }}>{action}</li>
                  ))}
                </ul>
              </Descriptions.Item>
            )}
          </Descriptions>
        )}
      </Modal>

      {/* Modal Feedback */}
      <Modal
        title={<Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: 600 }}>Feedback sur l'insight</Text>}
        open={feedbackModalVisible}
        onCancel={() => {
          setFeedbackModalVisible(false);
          feedbackForm.resetFields();
        }}
        footer={null}
        width={500}
        styles={{
          body: { background: COLORS.darkCard, padding: '24px' },
          header: { background: COLORS.darkCard, borderBottom: `1px solid ${COLORS.darkBorder}` },
          content: { background: COLORS.darkCard, borderRadius: 16 }
        }}
        maskStyle={{ background: 'rgba(0,0,0,0.8)' }}
      >
        <Form form={feedbackForm} layout="vertical" onFinish={handleAddFeedback}>
          <Form.Item name="action_taken" label={<Text style={{ color: COLORS.textSecondary }}>Action entreprise</Text>}>
            <TextArea 
              rows={2} 
              placeholder="Décrivez l'action entreprise..."
              style={{ 
                background: COLORS.darkBgSecondary,
                border: `1px solid ${COLORS.darkBorder}`,
                color: COLORS.textPrimary,
                borderRadius: 10
              }}
            />
          </Form.Item>
          <Form.Item name="result" label={<Text style={{ color: COLORS.textSecondary }}>Résultat obtenu</Text>}>
            <TextArea 
              rows={2} 
              placeholder="Quel a été le résultat ?"
              style={{ 
                background: COLORS.darkBgSecondary,
                border: `1px solid ${COLORS.darkBorder}`,
                color: COLORS.textPrimary,
                borderRadius: 10
              }}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="roi" label={<Text style={{ color: COLORS.textSecondary }}>ROI (€)</Text>}>
                <InputNumber 
                  min={0} 
                  style={{ 
                    width: '100%', 
                    background: COLORS.darkBgSecondary,
                    border: `1px solid ${COLORS.darkBorder}`,
                    borderRadius: 10,
                    color: COLORS.textPrimary
                  }} 
                  placeholder="0" 
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="rating" label={<Text style={{ color: COLORS.textSecondary }}>Évaluation</Text>}>
                <Rate style={{ color: '#FDCB6E' }} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="comments" label={<Text style={{ color: COLORS.textSecondary }}>Commentaires</Text>}>
            <TextArea 
              rows={2} 
              placeholder="Commentaires supplémentaires..."
              style={{ 
                background: COLORS.darkBgSecondary,
                border: `1px solid ${COLORS.darkBorder}`,
                color: COLORS.textPrimary,
                borderRadius: 10
              }}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit"
                style={{ 
                  background: GRADIENTS.primary,
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 600
                }}
              >
                Envoyer
              </Button>
              <Button 
                onClick={() => setFeedbackModalVisible(false)}
                style={{ 
                  background: COLORS.darkBgSecondary,
                  border: `1px solid ${COLORS.darkBorder}`,
                  color: COLORS.textSecondary,
                  borderRadius: 10
                }}
              >
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Styles CSS personnalisés */}
      <style jsx="true">{`
        .ant-table-tbody > tr > td {
          border-bottom: 1px solid ${COLORS.darkBorder} !important;
          color: ${COLORS.textPrimary} !important;
        }
        .ant-table-thead > tr > th {
          background: ${COLORS.darkBgSecondary} !important;
          color: ${COLORS.textSecondary} !important;
          border-bottom: 2px solid ${COLORS.darkBorder} !important;
          font-weight: 600 !important;
        }
        .ant-table-pagination {
          color: ${COLORS.textSecondary} !important;
        }
        .ant-select-selector {
          background: ${COLORS.darkBgSecondary} !important;
          border-color: ${COLORS.darkBorder} !important;
          color: ${COLORS.textPrimary} !important;
          border-radius: 10px !important;
        }
        .ant-select-selection-item {
          color: ${COLORS.textPrimary} !important;
        }
        .ant-select-arrow {
          color: ${COLORS.textSecondary} !important;
        }
        .ant-input {
          background: ${COLORS.darkBgSecondary} !important;
          border-color: ${COLORS.darkBorder} !important;
          color: ${COLORS.textPrimary} !important;
        }
        .ant-input-number {
          background: ${COLORS.darkBgSecondary} !important;
          border-color: ${COLORS.darkBorder} !important;
        }
        .ant-input-number-input {
          color: ${COLORS.textPrimary} !important;
        }
        .ant-modal-content {
          background: ${COLORS.darkCard} !important;
        }
        .ant-modal-close-x {
          color: ${COLORS.textSecondary} !important;
        }
        .ant-descriptions-item-label {
          background: ${COLORS.darkBgSecondary} !important;
          color: ${COLORS.textSecondary} !important;
        }
        .ant-descriptions-item-content {
          background: ${COLORS.darkCard} !important;
          color: ${COLORS.textPrimary} !important;
        }
        .ant-progress-text {
          color: ${COLORS.textPrimary} !important;
        }
        .ant-badge-status-text {
          color: ${COLORS.textPrimary} !important;
        }
        .ant-tabs-tab:hover {
          color: ${COLORS.primaryLight} !important;
        }
        .ant-tabs-tab-active {
          color: ${COLORS.primaryLight} !important;
        }
        .ant-tabs-ink-bar {
          background: ${COLORS.primary} !important;
        }
        .ant-tabs-tab-btn {
          color: ${COLORS.textSecondary} !important;
        }
        .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: ${COLORS.textPrimary} !important;
        }
      `}</style>
    </div>
  );
};

export default BusinessInsights;