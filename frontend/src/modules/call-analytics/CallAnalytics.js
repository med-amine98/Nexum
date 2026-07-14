// src/modules/call-analytics/CallAnalytics.js - Version Premium Dark Design
import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Statistic, Table, Tag, Space, Button,
  Select, DatePicker, Progress, Badge,
  Timeline, Descriptions, Modal, message, Typography,
  Divider, Spin, Empty, Alert, Avatar, Tooltip
} from 'antd';
import {
  PhoneOutlined, RiseOutlined, FallOutlined,
  ClockCircleOutlined, StarOutlined,
  DownloadOutlined, ReloadOutlined, EyeOutlined,
  CustomerServiceOutlined, ExportOutlined,
  SmileOutlined, FrownOutlined, MehOutlined,
  FilterOutlined, UserOutlined, DashboardOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  SoundOutlined, BarChartOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { Line, Pie, Column } from '@ant-design/charts';
import api from '../../services/api';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

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
  positive: '#00B894',
  neutral: '#FDCB6E',
  negative: '#E17055',
};

const GRADIENTS = {
  primary: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)',
  secondary: 'linear-gradient(135deg, #00CEC9 0%, #81ECEC 100%)',
  success: 'linear-gradient(135deg, #00B894 0%, #55EFC4 100%)',
  warning: 'linear-gradient(135deg, #FDCB6E 0%, #F9CA24 100%)',
  danger: 'linear-gradient(135deg, #E17055 0%, #D63031 100%)',
  info: 'linear-gradient(135deg, #74B9FF 0%, #0984E3 100%)',
  darkCard: 'linear-gradient(145deg, #1A1A33 0%, #14142B 100%)',
  glass: 'linear-gradient(135deg, rgba(108, 92, 231, 0.15) 0%, rgba(0, 206, 201, 0.10) 100%)',
};

const SHADOWS = {
  card: '0 8px 32px rgba(0, 0, 0, 0.4)',
  cardHover: '0 12px 48px rgba(108, 92, 231, 0.15)',
  glow: '0 0 40px rgba(108, 92, 231, 0.1)',
  inner: 'inset 0 2px 4px rgba(255, 255, 255, 0.05)',
};

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? 
    `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
    '108, 92, 231';
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const CallAnalytics = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [calls, setCalls] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    avgDuration: 0,
    satisfaction: 0,
    missed: 0,
    positive: 0,
    neutral: 0,
    negative: 0,
    totalDuration: 0,
    peakHour: '14:00'
  });
  const [selectedCall, setSelectedCall] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [dateRange, setDateRange] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState('all');
  const [selectedSentiment, setSelectedSentiment] = useState('all');
  const [callVolumeData, setCallVolumeData] = useState([]);
  const [sentimentData, setSentimentData] = useState([]);

  useEffect(() => {
    fetchData();
  }, [dateRange, selectedAgent, selectedSentiment]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.start_date = dateRange[0].toISOString();
        params.end_date = dateRange[1].toISOString();
      }
      if (selectedAgent !== 'all') params.agent = selectedAgent;
      if (selectedSentiment !== 'all') params.sentiment = selectedSentiment;
      
      const [callsRes, statsRes] = await Promise.all([
        api.get('/call-analytics/calls', { params }).catch(() => ({ data: [] })),
        api.get('/call-analytics/stats', { params }).catch(() => ({ data: {} }))
      ]);
      
      setCalls(Array.isArray(callsRes.data) ? callsRes.data : []);
      setStats({
        total: statsRes.data?.total || 0,
        avgDuration: statsRes.data?.avg_duration || 0,
        satisfaction: statsRes.data?.satisfaction || 0,
        missed: statsRes.data?.missed || 0,
        positive: statsRes.data?.positive || 0,
        neutral: statsRes.data?.neutral || 0,
        negative: statsRes.data?.negative || 0,
        totalDuration: statsRes.data?.total_duration || 0,
        peakHour: statsRes.data?.peak_hour || '14:00'
      });

      // Générer des données pour les graphiques
      const volumeData = [
        { day: 'Lun', calls: Math.floor(Math.random() * 30) + 20 },
        { day: 'Mar', calls: Math.floor(Math.random() * 30) + 20 },
        { day: 'Mer', calls: Math.floor(Math.random() * 30) + 20 },
        { day: 'Jeu', calls: Math.floor(Math.random() * 30) + 20 },
        { day: 'Ven', calls: Math.floor(Math.random() * 30) + 20 },
        { day: 'Sam', calls: Math.floor(Math.random() * 20) + 10 },
        { day: 'Dim', calls: Math.floor(Math.random() * 15) + 5 },
      ];
      setCallVolumeData(volumeData);

      const sentimentStats = [
        { type: 'Positif', value: statsRes.data?.positive || 0 },
        { type: 'Neutre', value: statsRes.data?.neutral || 0 },
        { type: 'Négatif', value: statsRes.data?.negative || 0 },
      ];
      setSentimentData(sentimentStats);

    } catch (error) {
      console.error('Erreur:', error);
      message.error('Erreur de chargement des données');
      setCalls([]);
      setStats({
        total: 0,
        avgDuration: 0,
        satisfaction: 0,
        missed: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        totalDuration: 0,
        peakHour: '14:00'
      });
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment) => {
    if (sentiment === 'positive') return COLORS.positive;
    if (sentiment === 'negative') return COLORS.negative;
    return COLORS.neutral;
  };

  const getSentimentLabel = (sentiment) => {
    if (sentiment === 'positive') return 'Positif';
    if (sentiment === 'negative') return 'Négatif';
    return 'Neutre';
  };

  const getSentimentIcon = (sentiment) => {
    if (sentiment === 'positive') return <SmileOutlined />;
    if (sentiment === 'negative') return <FrownOutlined />;
    return <MehOutlined />;
  };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Configuration des graphiques - Dark Theme
  const volumeChartConfig = {
    data: callVolumeData,
    xField: 'day',
    yField: 'calls',
    label: {
      style: {
        fill: COLORS.textSecondary,
        fontSize: 12,
      },
    },
    xAxis: {
      label: { style: { fill: COLORS.textSecondary } },
      grid: { line: { style: { stroke: COLORS.darkBorder } } },
    },
    yAxis: {
      label: { style: { fill: COLORS.textSecondary } },
      grid: { line: { style: { stroke: COLORS.darkBorder } } },
      title: { text: 'Nombre d\'appels', style: { fill: COLORS.textSecondary } },
    },
    color: COLORS.primary,
    theme: 'dark',
    smooth: true,
    point: {
      size: 5,
      shape: 'circle',
      style: {
        fill: COLORS.primaryLight,
        stroke: COLORS.primary,
        lineWidth: 2,
      },
    },
    tooltip: {
      containerStyle: { background: COLORS.darkCard, border: `1px solid ${COLORS.darkBorder}` },
    },
  };

  const sentimentPieConfig = {
    data: sentimentData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    innerRadius: 0.5,
    color: [COLORS.positive, COLORS.neutral, COLORS.negative],
    label: {
      type: 'outer',
      content: '{name}\n{percentage}%',
      style: { fill: COLORS.textPrimary, fontSize: 12 },
    },
    legend: {
      position: 'bottom',
      text: { style: { fill: COLORS.textSecondary } },
    },
    statistic: {
      title: { style: { color: COLORS.textSecondary, fontSize: 14 } },
      content: { style: { color: COLORS.textPrimary, fontSize: 24, fontWeight: 700 } },
    },
    theme: 'dark',
    tooltip: {
      containerStyle: { background: COLORS.darkCard, border: `1px solid ${COLORS.darkBorder}` },
    },
  };

  const columns = [
    {
      title: 'Appelant',
      dataIndex: 'caller',
      key: 'caller',
      render: (text) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} style={{ background: COLORS.primary }} />
          <Text style={{ color: COLORS.textPrimary }}>{text}</Text>
        </Space>
      )
    },
    {
      title: 'Durée',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration) => (
        <Tag icon={<ClockCircleOutlined />} style={{ background: COLORS.darkBgSecondary, border: 'none', color: COLORS.textSecondary }}>
          {formatDuration(duration)}
        </Tag>
      )
    },
    {
      title: 'Sentiment',
      dataIndex: 'sentiment',
      key: 'sentiment',
      render: (sentiment) => (
        <Tag 
          color={getSentimentColor(sentiment)}
          style={{ 
            borderRadius: 20,
            padding: '4px 12px',
            fontWeight: 500
          }}
        >
          {getSentimentIcon(sentiment)} {getSentimentLabel(sentiment)}
        </Tag>
      )
    },
    {
      title: 'Satisfaction',
      dataIndex: 'satisfaction',
      key: 'satisfaction',
      render: (score) => (
        <Progress 
          percent={score * 20} 
          size="small" 
          format={() => `${score}/5`}
          strokeColor={score >= 4 ? COLORS.success : score >= 3 ? COLORS.warning : COLORS.danger}
          trailColor={COLORS.darkBorder}
          style={{ width: 120 }}
        />
      )
    },
    {
      title: 'Agent',
      dataIndex: 'agent',
      key: 'agent',
      render: (agent) => (
        <Space>
          <UserOutlined style={{ color: COLORS.textSecondary }} />
          <Text style={{ color: COLORS.textSecondary }}>{agent}</Text>
        </Space>
      )
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags) => (
        <Space size={4}>
          {tags && tags.map(tag => (
            <Tag key={tag} style={{ background: COLORS.darkBgSecondary, border: 'none', color: COLORS.textSecondary }}>
              {tag}
            </Tag>
          ))}
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button 
          icon={<EyeOutlined />} 
          size="small"
          onClick={() => {
            setSelectedCall(record);
            setModalVisible(true);
          }}
          style={{
            background: 'rgba(108, 92, 231, 0.2)',
            border: `1px solid ${COLORS.darkBorder}`,
            color: COLORS.primaryLight,
            borderRadius: 8
          }}
        >
          Détails
        </Button>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        background: COLORS.darkBg 
      }}>
        <Spin size="large" tip="Chargement des données..." ><div/></Spin>
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
            <Col xs={24} md={16}>
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
                  <PhoneOutlined style={{ fontSize: 30, color: 'white' }} />
                </div>
                <div>
                  <Title level={2} style={{ margin: 0, color: 'white', fontWeight: 700, letterSpacing: '-0.5px' }}>
                    Analyse des Appels Clients
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 15 }}>
                    Analysez les conversations téléphoniques et améliorez l'expérience client
                  </Text>
                </div>
              </Space>
            </Col>
            <Col xs={24} md={8}>
              <Space wrap style={{ justifyContent: 'flex-end' }}>
                <Button 
                  icon={<ExportOutlined />} 
                  style={{ 
                    background: 'rgba(255,255,255,0.1)', 
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    borderRadius: 12
                  }}
                >
                  Exporter rapport
                </Button>
                <Button 
                  icon={<ReloadOutlined spin={refreshing} />} 
                  onClick={fetchData}
                  style={{ 
                    background: 'rgba(255,255,255,0.1)', 
                    border: '1px solid rgba(255,255,255,0.2)',
                    color: 'white',
                    borderRadius: 12
                  }}
                >
                  Actualiser
                </Button>
              </Space>
            </Col>
          </Row>
        </div>
        {/* Effets de fond */}
        <div style={{
          position: 'absolute',
          top: -80,
          right: -80,
          width: 250,
          height: 250,
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute',
          bottom: -120,
          left: '30%',
          width: 300,
          height: 300,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '50%'
        }} />
      </motion.div>

      {/* Filtres - Dark Theme */}
      <Card 
        style={{ 
          marginBottom: 24, 
          borderRadius: 16,
          background: COLORS.darkCard,
          border: `1px solid ${COLORS.darkBorder}`,
          boxShadow: SHADOWS.card
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={6}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>📅 Période</Text>
            <RangePicker 
              style={{ 
                width: '100%',
                background: COLORS.darkBgSecondary,
                borderColor: COLORS.darkBorder,
                borderRadius: 10
              }}
              onChange={(dates) => setDateRange(dates)}
              placeholder={['Date début', 'Date fin']}
            />
          </Col>
          <Col xs={12} md={4}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>👤 Agent</Text>
            <Select
              placeholder="Agent"
              style={{ 
                width: '100%',
                background: COLORS.darkBgSecondary,
                borderRadius: 10
              }}
              value={selectedAgent}
              onChange={setSelectedAgent}
              dropdownStyle={{ background: COLORS.darkCard }}
            >
              <Option value="all">Tous les agents</Option>
              <Option value="Sophie Martin">Sophie Martin</Option>
              <Option value="Jean Dupont">Jean Dupont</Option>
              <Option value="Marie Lambert">Marie Lambert</Option>
            </Select>
          </Col>
          <Col xs={12} md={4}>
            <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>😊 Sentiment</Text>
            <Select
              placeholder="Sentiment"
              style={{ 
                width: '100%',
                background: COLORS.darkBgSecondary,
                borderRadius: 10
              }}
              value={selectedSentiment}
              onChange={setSelectedSentiment}
              dropdownStyle={{ background: COLORS.darkCard }}
            >
              <Option value="all">Tous les sentiments</Option>
              <Option value="positive">Positif</Option>
              <Option value="neutral">Neutre</Option>
              <Option value="negative">Négatif</Option>
            </Select>
          </Col>
          <Col xs={12} md={5}>
            <Button 
              icon={<FilterOutlined />} 
              onClick={fetchData}
              style={{
                marginTop: 20,
                width: '100%',
                background: GRADIENTS.primary,
                border: 'none',
                borderRadius: 10,
                color: 'white',
                fontWeight: 600
              }}
            >
              Appliquer les filtres
            </Button>
          </Col>
          <Col xs={12} md={5}>
            <Button 
              icon={<DownloadOutlined />} 
              type="primary"
              style={{
                marginTop: 20,
                width: '100%',
                background: GRADIENTS.secondary,
                border: 'none',
                borderRadius: 10,
                fontWeight: 600
              }}
            >
              Exporter les données
            </Button>
          </Col>
        </Row>
      </Card>

      {/* KPIs - Dark Theme */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {[
          { 
            key: 'total', 
            title: 'Appels totaux', 
            value: stats.total, 
            icon: <PhoneOutlined />,
            color: COLORS.info,
            bgColor: 'rgba(116, 185, 255, 0.15)',
            extra: (
              <Progress 
                percent={stats.total > 0 ? Math.round((stats.total - stats.missed) / stats.total * 100) : 0} 
                size="small"
                strokeColor={COLORS.success}
                trailColor={COLORS.darkBorder}
                style={{ marginTop: 8 }}
                format={() => `${stats.total - stats.missed} traités`}
              />
            )
          },
          { 
            key: 'avgDuration', 
            title: 'Durée moyenne', 
            value: stats.avgDuration,
            suffix: 'min',
            icon: <ClockCircleOutlined />,
            color: COLORS.success,
            bgColor: 'rgba(0, 184, 148, 0.15)',
            extra: (
              <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                Total: {formatDuration(stats.totalDuration)}
              </Text>
            )
          },
          { 
            key: 'satisfaction', 
            title: 'Satisfaction client', 
            value: stats.satisfaction,
            suffix: '%',
            icon: <StarOutlined />,
            color: COLORS.gold,
            bgColor: 'rgba(253, 203, 110, 0.15)',
            extra: (
              <Progress 
                percent={stats.satisfaction} 
                strokeColor={COLORS.gold}
                trailColor={COLORS.darkBorder}
                size="small"
                style={{ marginTop: 8 }}
              />
            )
          },
          { 
            key: 'missed', 
            title: 'Appels manqués', 
            value: stats.missed,
            icon: <FallOutlined />,
            color: COLORS.danger,
            bgColor: 'rgba(225, 112, 85, 0.15)',
            extra: (
              <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>
                Taux: {stats.total > 0 ? Math.round(stats.missed / stats.total * 100) : 0}%
              </Text>
            )
          }
        ].map((kpi, index) => (
          <Col xs={24} sm={12} lg={6} key={kpi.key}>
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
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div>
                    <Text style={{ color: COLORS.textSecondary, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {kpi.title}
                    </Text>
                    <div style={{ 
                      fontSize: 28, 
                      fontWeight: 700, 
                      color: kpi.color,
                      marginTop: 4,
                      display: 'flex',
                      alignItems: 'baseline'
                    }}>
                      {kpi.value}{kpi.suffix}
                    </div>
                  </div>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: kpi.bgColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 20,
                    color: kpi.color
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

      {/* Graphiques - Dark Theme */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={14}>
          <Card 
            title={<Text style={{ color: COLORS.textPrimary, fontWeight: 600 }}>📊 Volume d'appels par jour</Text>}
            style={{ 
              borderRadius: 16,
              background: COLORS.darkCard,
              border: `1px solid ${COLORS.darkBorder}`,
              boxShadow: SHADOWS.card
            }}
          >
            {callVolumeData.length > 0 ? (
              <Column {...volumeChartConfig} height={300} />
            ) : (
              <Empty description="Aucune donnée disponible" style={{ color: COLORS.textSecondary }} />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={10}>
          <Card 
            title={<Text style={{ color: COLORS.textPrimary, fontWeight: 600 }}>🎯 Répartition des sentiments</Text>}
            style={{ 
              borderRadius: 16,
              background: COLORS.darkCard,
              border: `1px solid ${COLORS.darkBorder}`,
              boxShadow: SHADOWS.card
            }}
          >
            {sentimentData.some(d => d.value > 0) ? (
              <Pie {...sentimentPieConfig} height={300} />
            ) : (
              <Empty description="Aucune donnée disponible" style={{ color: COLORS.textSecondary }} />
            )}
          </Card>
        </Col>
      </Row>

      {/* Statistiques supplémentaires - Dark Theme */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} md={8}>
          <Card 
            style={{ 
              borderRadius: 16,
              background: COLORS.darkCard,
              border: `1px solid ${COLORS.darkBorder}`,
              boxShadow: SHADOWS.card
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Heure de pointe</Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.primary, marginTop: 4 }}>
                  {stats.peakHour}
                </div>
                <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>Moment le plus actif</Text>
              </div>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(108, 92, 231, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                color: COLORS.primary
              }}>
                <ClockCircleOutlined />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card 
            style={{ 
              borderRadius: 16,
              background: COLORS.darkCard,
              border: `1px solid ${COLORS.darkBorder}`,
              boxShadow: SHADOWS.card
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Taux de résolution</Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.success, marginTop: 4 }}>
                  {stats.total > 0 ? Math.round(((stats.total - stats.missed) / stats.total) * 100) : 0}%
                </div>
                <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>Appels résolus</Text>
              </div>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(0, 184, 148, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                color: COLORS.success
              }}>
                <CheckCircleOutlined />
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card 
            style={{ 
              borderRadius: 16,
              background: COLORS.darkCard,
              border: `1px solid ${COLORS.darkBorder}`,
              boxShadow: SHADOWS.card
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>Durée totale</Text>
                <div style={{ fontSize: 24, fontWeight: 700, color: COLORS.info, marginTop: 4 }}>
                  {formatDuration(stats.totalDuration)}
                </div>
                <Text style={{ color: COLORS.textMuted, fontSize: 12 }}>Temps d'écoute total</Text>
              </div>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'rgba(116, 185, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                color: COLORS.info
              }}>
                <SoundOutlined />
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Tableau des appels - Dark Theme */}
      <Card 
        title={
          <Space>
            <PhoneOutlined style={{ color: COLORS.primary }} />
            <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>Historique des appels</span>
            <Badge count={calls.length} style={{ backgroundColor: COLORS.primary }} />
          </Space>
        }
        extra={
          <Space>
            <Button 
              icon={<FilterOutlined />} 
              onClick={() => message.info('Filtres avancés')}
              style={{ 
                background: COLORS.darkBgSecondary,
                border: `1px solid ${COLORS.darkBorder}`,
                color: COLORS.textSecondary,
                borderRadius: 8
              }}
            >
              Filtrer
            </Button>
            <Button 
              icon={<DownloadOutlined />}
              style={{ 
                background: COLORS.darkBgSecondary,
                border: `1px solid ${COLORS.darkBorder}`,
                color: COLORS.textSecondary,
                borderRadius: 8
              }}
            >
              Exporter CSV
            </Button>
          </Space>
        }
        style={{ 
          borderRadius: 16,
          background: COLORS.darkCard,
          border: `1px solid ${COLORS.darkBorder}`,
          boxShadow: SHADOWS.card
        }}
      >
        <Table 
          columns={columns} 
          dataSource={calls} 
          rowKey="id"
          pagination={{ 
            pageSize: 10,
            style: { color: COLORS.textSecondary }
          }}
          locale={{ 
            emptyText: <Empty description="Aucun appel trouvé" style={{ color: COLORS.textSecondary }} />
          }}
          scroll={{ x: 800 }}
          style={{ background: 'transparent' }}
        />
      </Card>

      {/* Modal détails appel - Dark Theme */}
      <Modal
        title={
          <Space>
            <PhoneOutlined style={{ color: COLORS.primary }} />
            <span style={{ color: COLORS.textPrimary }}>Détails de l'appel</span>
            {selectedCall && (
              <Tag 
                color={getSentimentColor(selectedCall.sentiment)}
                style={{ borderRadius: 20 }}
              >
                {getSentimentLabel(selectedCall.sentiment)}
              </Tag>
            )}
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
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
            key="export" 
            icon={<DownloadOutlined />}
            style={{ 
              background: COLORS.darkBgSecondary,
              border: `1px solid ${COLORS.darkBorder}`,
              color: COLORS.textSecondary,
              borderRadius: 10
            }}
          >
            Exporter
          </Button>
        ]}
        width={700}
        styles={{
          body: { background: COLORS.darkCard, padding: '24px' },
          header: { background: COLORS.darkCard, borderBottom: `1px solid ${COLORS.darkBorder}` },
          content: { background: COLORS.darkCard, borderRadius: 16 }
        }}
        maskStyle={{ background: 'rgba(0,0,0,0.8)' }}
      >
        {selectedCall && (
          <div>
            <Descriptions 
              column={2} 
              bordered 
              size="small"
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
              <Descriptions.Item label="Appelant">
                <PhoneOutlined /> {selectedCall.caller}
              </Descriptions.Item>
              <Descriptions.Item label="Agent">
                <UserOutlined /> {selectedCall.agent}
              </Descriptions.Item>
              <Descriptions.Item label="Durée">
                <ClockCircleOutlined /> {formatDuration(selectedCall.duration)}
              </Descriptions.Item>
              <Descriptions.Item label="Date">
                {new Date(selectedCall.date).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Satisfaction" span={2}>
                <Progress 
                  percent={selectedCall.satisfaction * 20} 
                  size="small" 
                  format={() => `${selectedCall.satisfaction}/5`}
                  strokeColor={selectedCall.satisfaction >= 4 ? COLORS.success : COLORS.danger}
                  trailColor={COLORS.darkBorder}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Tags" span={2}>
                <Space>
                  {selectedCall.tags && selectedCall.tags.map(tag => (
                    <Tag key={tag} style={{ background: COLORS.darkBgSecondary, border: 'none', color: COLORS.textSecondary }}>
                      {tag}
                    </Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            </Descriptions>

            <Divider style={{ borderColor: COLORS.darkBorder }} />

            <Card 
              size="small" 
              title={<span style={{ color: COLORS.textPrimary }}>📝 Transcription</span>}
              style={{ 
                background: COLORS.darkBgSecondary,
                border: `1px solid ${COLORS.darkBorder}`,
                borderRadius: 12
              }}
            >
              <Timeline>
                <Timeline.Item color={COLORS.success} dot={<PhoneOutlined />}>
                  <div>
                    <Text strong style={{ color: COLORS.textPrimary }}>Appelant:</Text>
                    <Text style={{ color: COLORS.textSecondary, display: 'block', marginTop: 4 }}>
                      {selectedCall.transcript || "Bonjour, j'ai un problème avec mon compte..."}
                    </Text>
                  </div>
                </Timeline.Item>
                <Timeline.Item color={COLORS.primary} dot={<CustomerServiceOutlined />}>
                  <div>
                    <Text strong style={{ color: COLORS.textPrimary }}>Agent:</Text>
                    <Text style={{ color: COLORS.textSecondary, display: 'block', marginTop: 4 }}>
                      "Je vous écoute, comment puis-je vous aider ?"
                    </Text>
                  </div>
                </Timeline.Item>
                <Timeline.Item color={COLORS.info} dot={<UserOutlined />}>
                  <div>
                    <Text strong style={{ color: COLORS.textPrimary }}>Résumé IA:</Text>
                    <Text style={{ color: COLORS.textSecondary, display: 'block', marginTop: 4 }}>
                      Appel identifié comme {getSentimentLabel(selectedCall.sentiment).toLowerCase()}. 
                      Score de satisfaction: {selectedCall.satisfaction}/5.
                    </Text>
                  </div>
                </Timeline.Item>
              </Timeline>
            </Card>

            <Divider style={{ borderColor: COLORS.darkBorder }} />

            <Alert
              message="🤖 Analyse IA"
              description={
                <div>
                  <Text style={{ color: COLORS.textSecondary }}>
                    Appel identifié comme <Text strong style={{ color: getSentimentColor(selectedCall.sentiment) }}>
                      {getSentimentLabel(selectedCall.sentiment).toLowerCase()}
                    </Text>. 
                    Score de satisfaction: <Text strong>{selectedCall.satisfaction}/5</Text>.
                  </Text>
                  <div style={{ marginTop: 8 }}>
                    <Space>
                      <Tag color="green">Recommandation: {selectedCall.sentiment === 'positive' ? 'Féliciter l\'agent' : 'Formation recommandée'}</Tag>
                      <Tag color="blue">Priorité: {selectedCall.sentiment === 'negative' ? 'Haute' : 'Normale'}</Tag>
                    </Space>
                  </div>
                </div>
              }
              type={selectedCall.sentiment === 'positive' ? 'success' : selectedCall.sentiment === 'negative' ? 'error' : 'info'}
              showIcon
              style={{ 
                borderRadius: 12,
                background: COLORS.darkBgSecondary,
                border: `1px solid ${COLORS.darkBorder}`
              }}
            />
          </div>
        )}
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
        .ant-picker {
          background: ${COLORS.darkBgSecondary} !important;
          border-color: ${COLORS.darkBorder} !important;
        }
        .ant-picker-input > input {
          color: ${COLORS.textPrimary} !important;
        }
        .ant-picker-suffix {
          color: ${COLORS.textSecondary} !important;
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
        .ant-empty-description {
          color: ${COLORS.textSecondary} !important;
        }
        .ant-timeline-item-content {
          color: ${COLORS.textPrimary} !important;
        }
        .ant-timeline-item-tail {
          border-color: ${COLORS.darkBorder} !important;
        }
        .ant-timeline-item-head {
          border-color: ${COLORS.darkBorder} !important;
        }
        .ant-alert {
          background: ${COLORS.darkBgSecondary} !important;
          border-color: ${COLORS.darkBorder} !important;
        }
        .ant-alert-message {
          color: ${COLORS.textPrimary} !important;
        }
        .ant-alert-description {
          color: ${COLORS.textSecondary} !important;
        }
        .ant-tag {
          color: ${COLORS.textPrimary} !important;
        }
        .ant-tag-blue {
          color: ${COLORS.info} !important;
        }
        .ant-tag-green {
          color: ${COLORS.success} !important;
        }
        .ant-tag-red {
          color: ${COLORS.danger} !important;
        }
        .ant-tag-orange {
          color: ${COLORS.warning} !important;
        }
        .ant-tag-purple {
          color: ${COLORS.primaryLight} !important;
        }
        .ant-tag-cyan {
          color: ${COLORS.cyan} !important;
        }
      `}</style>
    </div>
  );
};

export default CallAnalytics;