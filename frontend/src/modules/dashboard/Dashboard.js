// Dashboard.js - Version Premium Nexum v3.0 avec i18n et Theme Variables
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, Row, Col, Statistic, Progress, Table, Tag, 
  Space, Typography, Avatar, Badge, Tooltip, Skeleton,
  Button, Alert, Result, Empty
} from 'antd';
import { 
  ShoppingOutlined, DollarOutlined, 
  TeamOutlined, WarningOutlined, 
  RiseOutlined, FallOutlined,
  ArrowUpOutlined,
  ClockCircleOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, ReloadOutlined,
  ApiOutlined, ThunderboltOutlined,
  StarOutlined, TrophyOutlined,
  SafetyOutlined, CustomerServiceOutlined,
  CrownOutlined, GoldOutlined,
  UserOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import { Line } from '@ant-design/charts';
import { motion } from 'framer-motion';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import './Dashboard.css';

const { Title, Text, Paragraph } = Typography;

const getModuleIcon = (moduleName) => {
  const iconStyle = { fontSize: '16px' };
  const iconMap = {
    'Ventes': <ShoppingOutlined style={iconStyle} />,
    'Sales': <ShoppingOutlined style={iconStyle} />,
    'Achats': <ShoppingOutlined style={iconStyle} />,
    'Purchases': <ShoppingOutlined style={iconStyle} />,
    'CRM': <TeamOutlined style={iconStyle} />,
    'Comptabilité': <DollarOutlined style={iconStyle} />,
    'Finance': <DollarOutlined style={iconStyle} />,
    'Stock': <WarningOutlined style={iconStyle} />,
    'Inventory': <WarningOutlined style={iconStyle} />,
    'RH': <TeamOutlined style={iconStyle} />,
    'HR': <TeamOutlined style={iconStyle} />,
  };
  return iconMap[moduleName] || <CheckCircleOutlined style={iconStyle} />;
};

const Dashboard = () => {
  const { theme: currentTheme, strategy } = useTheme();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [errorDetails, setErrorDetails] = useState('');
  const navigate = useNavigate();
  
  const [kpis, setKpis] = useState({
    revenue: { total: 0, trend: 0, trend_up: true },
    orders: { total: 0, trend: 0, trend_up: true },
    clients: { new: 0, trend: 0, trend_up: true },
    alerts: { total: 0, critical: 0, warning: 0, trend: 0, trend_up: false }
  });
  const [modules, setModules] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [salesChartData, setSalesChartData] = useState([]);
  const [alertsCount, setAlertsCount] = useState({ total: 0, critical: 0, warning: 0, info: 0 });

  const fetchDashboardData = async () => {
    setRefreshing(true);
    setApiError(false);
    try {
      const [kpisRes, modulesRes, activitiesRes, chartRes, alertsRes] = await Promise.allSettled([
        api.get(`/dashboard/kpis`),
        api.get(`/dashboard/modules`),
        api.get(`/dashboard/activities?limit=10`),
        api.get(`/dashboard/sales-chart`),
        api.get(`/dashboard/alerts`)
      ]);

      if (kpisRes.status === 'fulfilled') setKpis(kpisRes.value.data);
      if (modulesRes.status === 'fulfilled') setModules(modulesRes.value.data);
      if (activitiesRes.status === 'fulfilled') setRecentActivities(activitiesRes.value.data);
      if (chartRes.status === 'fulfilled') setSalesChartData(chartRes.value.data);
      if (alertsRes.status === 'fulfilled') setAlertsCount(alertsRes.value.data);

    } catch (error) {
      console.error('Erreur chargement dashboard:', error);
      setApiError(true);
      setErrorDetails(error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleRefresh = () => fetchDashboardData();

  const columns = [
    {
      title: t('activity'),
      dataIndex: 'action',
      key: 'action',
      render: (text) => <Text strong style={{ fontSize: 14, color: '#1e293b' }}>{text}</Text>,
    },
    {
      title: t('details'),
      key: 'details',
      render: (_, record) => (
        <Space>
          <Tag color="blue" style={{ borderRadius: 12, border: 'none' }}>{record.user}</Tag>
          <Text style={{ color: '#475569' }}>{record.amount}</Text>
          {record.module && <Tag style={{ borderRadius: 12, border: '1px solid #e2e8f0' }}>{record.module}</Tag>}
        </Space>
      ),
    },
    {
      title: t('time'),
      dataIndex: 'time',
      key: 'time',
      render: (text) => (
        <Space>
          <ClockCircleOutlined style={{ fontSize: '12px', color: '#94a3b8' }} />
          <Text type="secondary">{text}</Text>
        </Space>
      ),
    },
    {
      title: t('status'),
      key: 'status',
      render: (_, record) => (
        <Badge 
          status={record.status === 'success' ? 'success' : record.status === 'warning' ? 'warning' : 'error'} 
          text={<span style={{ color: '#475569' }}>{t(record.status)}</span>}
        />
      ),
    },
  ];

  const chartConfig = {
    data: salesChartData,
    xField: 'month',
    yField: 'ventes',
    point: { size: 5, shape: 'circle' },
    line: { style: { stroke: '#1890ff', lineWidth: 3 } },
    area: { style: { fill: 'l(270) 0:rgba(0, 82, 204, 0.25) 1:transparent', fillOpacity: 0.2 } },
    smooth: true,
    theme: currentTheme === 'dark' ? 'dark' : 'light',
    color: '#1890ff',
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', minHeight: '100vh' }}>
        <Skeleton active paragraph={{ rows: 12 }} />
      </div>
    );
  }

  if (apiError) {
    return (
      <div style={{ padding: '24px', minHeight: '100vh' }}>
        <Result
          status="500"
          title={t('connection_error')}
          subTitle={errorDetails}
          extra={<Button type="primary" onClick={handleRefresh} icon={<ReloadOutlined />}>{t('retry')}</Button>}
        />
      </div>
    );
  }

  return (
    <div className="dashboard-container animate-fadeIn">
      {/* HEADER */}
      <div className="dashboard-header-premium" style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div className="header-icon-glow">
            <CrownOutlined style={{ fontSize: 28, color: 'white' }} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: '#1e293b', fontWeight: 800 }}>
              {t('strategic_dashboard')}
            </Title>
            <Text type="secondary">{t('nexum_enterprise_intelligence')}</Text>
          </div>
        </div>
        <Space size="middle">
          <Button 
            icon={<ReloadOutlined spin={refreshing} />} 
            onClick={handleRefresh}
            className="glass-button"
          >
            {t('refresh')}
          </Button>
          <Badge count={alertsCount.critical} style={{ backgroundColor: '#ef4444' }}>
            <Avatar shape="square" icon={<ExclamationCircleOutlined />} className="alert-avatar critical" />
          </Badge>
        </Space>
      </div>

      {/* IA STRATEGY */}
      <Alert
        className="magic-card ia-alert"
        message={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <ThunderboltOutlined className="ia-icon-pulse" />
            <Text strong style={{ color: '#1e293b' }}>IA Insight :</Text>
            <Text style={{ color: '#475569' }}>{strategy?.message || t('analyzing_strategy')}</Text>
          </div>
        }
        type="info"
      />

      {/* KPI CARDS */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        {[
          { key: 'revenue', title: t('revenue'), icon: <DollarOutlined />, value: (kpis?.revenue?.total || 0).toLocaleString() + ' €', trend: kpis?.revenue?.trend || 0, color: '#1890ff' },
          { key: 'orders', title: t('orders'), icon: <ShoppingOutlined />, value: kpis?.orders?.total || 0, trend: kpis?.orders?.trend || 0, color: '#10b981' },
          { key: 'clients', title: t('new_clients'), icon: <UserOutlined />, value: kpis?.clients?.new || 0, trend: kpis?.clients?.trend || 0, color: '#22c55e' },
          { key: 'alerts', title: t('alerts'), icon: <WarningOutlined />, value: kpis?.alerts?.total || 0, trend: kpis?.alerts?.trend || 0, color: '#ef4444' }
        ].map(kpi => (
          <Col xs={24} sm={12} lg={6} key={kpi.key}>
            <Card className="kpi-card-premium magic-card" style={{ borderLeft: `4px solid ${kpi.color}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <Text type="secondary" strong style={{ textTransform: 'uppercase', fontSize: 11 }}>{kpi.title}</Text>
                  <Title level={3} style={{ margin: '8px 0', color: '#1e293b' }}>{kpi.value}</Title>
                  <Tag color={kpi.trend >= 0 ? 'success' : 'error'} style={{ borderRadius: 20 }}>
                    {kpi.trend >= 0 ? <RiseOutlined /> : <FallOutlined />} {Math.abs(kpi.trend)}%
                  </Tag>
                </div>
                <div className="kpi-icon-wrapper" style={{ color: kpi.color, background: `${kpi.color}15` }}>
                  {kpi.icon}
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* CHARTS & MODULES */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card 
            className="magic-card chart-card"
            title={<Space><LineChartOutlined style={{ color: '#1890ff' }} /><Text strong>{t('analytical_evolution')}</Text></Space>}
          >
            {salesChartData && salesChartData.length > 0 ? <Line {...chartConfig} height={350} /> : <Empty description={t('no_data')} style={{ height: 350, display: 'flex', flexDirection: 'column', justifyContent: 'center' }} />}
          </Card>
        </Col>
        
        <Col xs={24} lg={8}>
          <Card 
            className="magic-card modules-card"
            title={<Space><CheckCircleOutlined style={{ color: '#22c55e' }} /><Text strong>{t('deployed_capabilities')}</Text></Space>}
            extra={<Tag color="blue">{modules.length} {t('active')}</Tag>}
          >
            {modules.length > 0 ? modules.map((mod, idx) => (
              <div key={idx} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Space>
                    <Avatar size={32} icon={getModuleIcon(mod.name)} style={{ background: 'var(--bg-tertiary)', color: '#1890ff' }} />
                    <Text strong style={{ color: '#1e293b' }}>{mod.name}</Text>
                  </Space>
                  <Text strong style={{ color: '#1890ff' }}>{mod.progress}%</Text>
                </div>
                <Progress percent={mod.progress} strokeColor="#1890ff" size="small" showInfo={false} />
              </div>
            )) : <Empty description={t('no_modules_active')} />}
          </Card>
        </Col>
      </Row>

      {/* ACTIVITIES */}
      <Row style={{ marginTop: 24 }}>
        <Col span={24}>
          <Card 
            className="magic-card table-card"
            title={<Space><ClockCircleOutlined style={{ color: '#0ea5e9' }} /><Text strong>{t('operation_log')}</Text></Space>}
            extra={<Button type="link" onClick={() => navigate('/history')}>{t('view_all')} <ArrowUpOutlined style={{ transform: 'rotate(45deg)' }} /></Button>}
          >
            <Table columns={columns} dataSource={recentActivities || []} pagination={false} rowKey="id" size="middle" locale={{ emptyText: t('no_data') }} />
          </Card>
        </Col>
      </Row>

      {/* FOOTER STATS */}
      <div className="dashboard-footer-premium magic-card" style={{ marginTop: 32, padding: '32px' }}>
        <Row gutter={[32, 32]} justify="space-around">
          {[
            { icon: <TrophyOutlined />, value: '94%', label: t('performance'), color: '#22c55e' },
            { icon: <ThunderboltOutlined />, value: '0.8s', label: t('response_time'), color: '#10b981' },
            { icon: <SafetyOutlined />, value: '99.9%', label: t('availability'), color: '#1890ff' },
            { icon: <StarOutlined />, value: '4.8/5', label: t('satisfaction'), color: '#fa8c16' },
            { icon: <CustomerServiceOutlined />, value: '24/7', label: t('support'), color: '#22c55e' }
          ].map((stat, i) => (
            <Col key={i}>
              <Space direction="vertical" align="center" size={12}>
                <div className="footer-stat-icon" style={{ color: stat.color, background: `${stat.color}15` }}>
                  {stat.icon}
                </div>
                <Title level={4} style={{ margin: 0, color: '#1e293b' }}>{stat.value}</Title>
                <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }}>{stat.label}</Text>
              </Space>
            </Col>
          ))}
        </Row>
      </div>
    </div>
  );
};

export default Dashboard;