import React, { useState, useEffect } from 'react';
import { 
  Layout, Menu, Card, Row, Col, Statistic, Table, 
  Avatar, Badge, Progress, Timeline, Dropdown, Space,
  Button, Tag, Tooltip, List, Tabs, Input, Typography,
  Divider, Empty, Alert, Spin, Modal, Drawer, Radio
} from 'antd';
import EmailReportModal from '../components/EmailReportModal';
import StripeSubscribeButton from '../components/StripeSubscribeButton';

import {
  MenuFoldOutlined, MenuUnfoldOutlined,
  DashboardOutlined, ShoppingOutlined, ShoppingCartOutlined,
  TeamOutlined, WalletOutlined, AppstoreOutlined,
  SettingOutlined, BellOutlined, UserOutlined,
  SearchOutlined, QuestionCircleOutlined,
  RiseOutlined, FallOutlined, PlusOutlined,
  FileTextOutlined, CalendarOutlined, 
  TruckOutlined, BarChartOutlined, 
  EuroCircleOutlined, DatabaseOutlined,
  ExperimentOutlined, NotificationOutlined,
  MessageOutlined, StarOutlined, ClockCircleOutlined,
  SunOutlined, MoonOutlined, LogoutOutlined,
  HomeOutlined, InfoCircleOutlined,
  DownloadOutlined, PrinterOutlined,
  FilterOutlined, ReloadOutlined,
  EyeOutlined, EditOutlined, DeleteOutlined
} from '@ant-design/icons';

import { useTranslation } from 'react-i18next';
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';

// NE PAS importer Dashboard.css !

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

// ============================================
// CONSTANTES - Couleurs en dur pour éviter les variables CSS
// ============================================


const MODULE_COLORS = {
  Ventes: '#875A7B',
  Achats: '#F6AE2D',
  CRM: '#86BBD8',
  Compta: '#758E4F',
  Stock: '#F26419',
  RH: '#33658A',
  Projets: '#F6AE2D',
  Facturation: '#875A7B',
};

const OdooDashboard = () => {
  const [emailModalVisible, setEmailModalVisible] = useState(false);

  const openEmailModal = () => setEmailModalVisible(true);
  const closeEmailModal = () => setEmailModalVisible(false);

  const [selectedMenu, setSelectedMenu] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [kpiData, setKpiData] = useState(null);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  }, []);

  
  const { theme, toggleTheme, language, changeLanguage } = useTheme();
  const { t } = useTranslation();


  const [modules, setModules] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);

  // Fetch dashboard data from backend
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch('/api/v1/dashboard');
        if (!res.ok) throw new Error('Failed to load dashboard data');
        const data = await res.json();
        setKpiData(data.kpiData);
        setModules(data.modules);
        setRecentTasks(data.recentTasks);
        setNotifications(data.notifications);
      } catch (err) {
        console.error(err);
        message.error('Unable to load dashboard data');
      }
    };
    fetchDashboard();
  }, []);

  // Provide fallback while loading data
  if (!kpiData) {
    return (
      <Layout style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
        <Sider trigger={null} collapsible collapsed={collapsed} width={280} style={{ background: 'var(--bg-secondary)', borderRight: `1px solid ${'var(--border)'}` }} />
        <Layout>
          <Header style={{ background: 'var(--glass)', backdropFilter: 'blur(16px)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${'var(--border)'}`, height: 64 }} />
          <Content style={{ padding: '24px', overflow: 'auto' }}>
            <Spin size="large" tip={t('dash_loading')} ><div/></Spin>
          </Content>
        </Layout>
      </Layout>
    );
  }

  const userMenu = (
    <Menu style={{ background: 'var(--bg-secondary)', borderRadius: 12 }}>
      <Menu.Item key="profile" icon={<UserOutlined />} style={{ color: 'var(--text-secondary)' }}>{t('dash_my_profile')}</Menu.Item>
      <Menu.Item key="settings" icon={<SettingOutlined />} style={{ color: 'var(--text-secondary)' }}>{t('dash_settings')}</Menu.Item>
      <Menu.Divider style={{ borderColor: 'var(--border)' }} />
      <Menu.Item key="logout" icon={<LogoutOutlined />} danger>{t('dash_logout')}</Menu.Item>
    </Menu>
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setSearchModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Sidebar */}
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        width={280}
        style={{ background: 'var(--bg-secondary)', borderRight: `1px solid ${'var(--border)'}` }}
      >
        <div style={{ height: 64, display: 'flex', alignItems: 'center', padding: '0 24px', borderBottom: `1px solid ${'var(--border)'}` }}>
          <div style={{ width: 40, height: 40, background: 'var(--gradient-primary)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--white)', fontSize: 20 }}>
            <DashboardOutlined />
          </div>
          {!collapsed && (
            <div style={{ marginLeft: 12 }}>
              <Title level={4} style={{ color: 'var(--white)', margin: 0 }}>NeuraDecide</Title>
              <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('dash_erp_intelligent')}</Text>
            </div>
          )}
        </div>

        <div style={{ padding: '16px' }}>
          <Input 
            prefix={<SearchOutlined style={{ color: 'var(--text-muted)' }} />} 
            placeholder={t('dash_search_placeholder')}
            onClick={() => setSearchModal(true)}
            readOnly
            style={{ background: 'var(--bg-tertiary)', border: `1px solid ${'var(--border)'}`, color: 'var(--text-primary)', borderRadius: 8 }}
          />
        </div>

        <Menu
          mode="inline"
          selectedKeys={[selectedMenu]}
          onClick={({ key }) => {
            setSelectedMenu(key);
            if (key !== 'dashboard' && key !== 'settings') {
              window.location.href = modules.find(m => m.key === key)?.path || '/';
            }
          }}
          theme="dark"
          style={{ background: 'transparent', borderRight: 'none' }}
          items={modules.map(module => ({
            key: module.key,
            icon: <span style={{ color: module.color }}>{module.icon}</span>,
            label: (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{module.name}</span>
                {module.notifications > 0 && (
                  <Badge count={module.notifications} size="small" style={{ backgroundColor: 'var(--error)' }} />
                )}
              </div>
            ),
          }))}
        />

        <div style={{ position: 'fixed', bottom: 0, width: collapsed ? 80 : 280, padding: '20px', borderTop: `1px solid ${'var(--border)'}`, background: 'var(--bg-secondary)' }}>
          <Progress percent={75} size="small" strokeColor={'var(--gradient-primary)'} showInfo={false} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('dash_space_used')}</Text>
            <Text strong style={{ color: 'var(--white)', fontSize: 12 }}>75%</Text>
          </div>
        </div>
      </Sider>


      <Layout>
        {/* Header */}
        <Header style={{ background: 'var(--glass)', backdropFilter: 'blur(16px)', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${'var(--border)'}`, height: 64 }}>
          <Button type="text" icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />} onClick={() => setCollapsed(!collapsed)} style={{ color: 'var(--text-secondary)', fontSize: 18 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
<Button type="text" icon={theme === 'light' ? <MoonOutlined /> : <SunOutlined />} onClick={toggleTheme} style={{ color: 'var(--text-secondary)' }} />
            <Button type="text" onClick={() => changeLanguage(language === 'fr' ? 'en' : 'fr')} style={{ color: 'var(--text-secondary)' }}>{language === 'fr' ? 'EN' : 'FR'}</Button>

            <Space size="middle">
              <Badge count={notifications.length} style={{ backgroundColor: 'var(--error)' }}>
                <BellOutlined style={{ fontSize: 18, cursor: 'pointer', color: 'var(--text-secondary)' }} />
              </Badge>
              <Badge count={3} style={{ backgroundColor: 'var(--primary)' }}>
                <MessageOutlined style={{ fontSize: 18, cursor: 'pointer', color: 'var(--text-secondary)' }} />
              </Badge>
              <Dropdown overlay={userMenu} trigger={['click']} placement="bottomRight">
                <Space style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: 20, background: 'var(--bg-tertiary)' }}>
                  <Avatar icon={<UserOutlined />} style={{ backgroundColor: 'var(--primary)' }} />
                  <span style={{ color: 'var(--text-primary)' }}>{t('dash_admin')}</span>
                </Space>
              </Dropdown>
              <Button type="primary" onClick={openEmailModal} style={{ borderRadius: 8, marginRight: 8 }}>
                  {t('dash_send_report')}
                </Button>
                <StripeSubscribeButton />
            </Space>
          </div>
        </Header>

        {/* Content */}
        <Content style={{ padding: '24px', overflow: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400, flexDirection: 'column', gap: 16 }}>
              <Spin size="large" />
              <Text style={{ color: 'var(--text-secondary)' }}>{t('dash_loading')}</Text>
            </div>
          ) : (
            <>
              {/* Breadcrumb */}
              <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
                <HomeOutlined /> <span>{t('dash_breadcrumb_home')}</span> <span>/</span> <span style={{ color: 'var(--primary)' }}>{t('dash_breadcrumb_dashboard')}</span>
              </div>

              {/* Page Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div>
                  <Title level={2} style={{ color: 'var(--text-primary)', marginBottom: 8 }}>{t('dash_title')}</Title>
                  <Text style={{ color: 'var(--text-muted)' }}>{t('dash_welcome')} {new Date().toLocaleDateString(language === 'fr' ? 'fr-FR' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                </div>
                <Space>
                  <Button icon={<FilterOutlined />} style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{t('dash_filters')}</Button>
                  <Button icon={<DownloadOutlined />} style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}>{t('dash_export')}</Button>
                  <Button type="primary" icon={<PlusOutlined />} style={{ background: 'var(--gradient-primary)', border: 'none' }}>{t('dash_new')}</Button>
                </Space>
              </div>

              {/* KPIs Grid - Style inline simplifié */}
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={6}>
                  <div className="magic-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(135,90,123,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingOutlined style={{ fontSize: 24, color: MODULE_COLORS.Ventes }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('dash_sales')}</Text>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text-primary)' }}>{kpiData.sales.month.toLocaleString()} €</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                          <span style={{ color: 'var(--success)', fontSize: 12 }}><RiseOutlined /> +{kpiData.sales.trend}%</span>
                          <Progress percent={Math.round((kpiData.sales.month / kpiData.sales.target) * 100)} size="small" showInfo={false} strokeColor={MODULE_COLORS.Ventes} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <div className="magic-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(246,174,45,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ShoppingCartOutlined style={{ fontSize: 24, color: MODULE_COLORS.Achats }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('dash_purchases')}</Text>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text-primary)' }}>{kpiData.purchases.month.toLocaleString()} €</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                          <span style={{ color: 'var(--error)', fontSize: 12 }}><FallOutlined /> {Math.abs(kpiData.purchases.trend)}%</span>
                          <Progress percent={Math.round((kpiData.purchases.month / kpiData.purchases.target) * 100)} size="small" showInfo={false} strokeColor={MODULE_COLORS.Achats} />
                        </div>
                      </div>
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <div className="magic-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(134,187,216,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileTextOutlined style={{ fontSize: 24, color: MODULE_COLORS.Crm }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('dash_invoices')}</Text>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text-primary)' }}>{kpiData.invoices.paid.toLocaleString()} €</div>
                        <Space size="small" style={{ marginTop: 8 }}>
                          <Badge status="success" text={`${kpiData.invoices.paid}€`} />
                          <Badge status="warning" text={`${kpiData.invoices.draft}€`} />
                        </Space>
                      </div>
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                  <div className="magic-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(242,100,25,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <DatabaseOutlined style={{ fontSize: 24, color: MODULE_COLORS.Stock }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>{t('dash_stock')}</Text>
                        <div style={{ fontSize: 24, fontWeight: 'bold', color: 'var(--text-primary)' }}>{kpiData.stock.value.toLocaleString()} €</div>
                        <Space size="small" style={{ marginTop: 8 }}>
                          <Badge status="warning" text={`${kpiData.stock.alert} ${t('dash_alerts_count')}`} />
                          <Badge status="error" text={`${kpiData.stock.low} ${t('dash_outages_count')}`} />
                        </Space>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Charts */}
              <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
                <Col xs={24} lg={16}>
                  <div className="magic-card" style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <span style={{ color: 'var(--text-primary)' }}><BarChartOutlined /> {t('dash_sales_evolution')}</span>
                      <Radio.Group value={salesPeriod} onChange={(e) => setSalesPeriod(e.target.value)} size="small">
                        <Radio.Button value="week">{t('dash_week')}</Radio.Button>
                        <Radio.Button value="month">{t('dash_month')}</Radio.Button>
                      </Radio.Group>
                    </div>
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={getSalesChartData()}>
                        <CartesianGrid strokeDasharray="3 3" stroke={'var(--border)'} />
                        <XAxis dataKey="name" stroke={'var(--text-muted)'} />
                        <YAxis stroke={'var(--text-muted)'} />
                        <RechartsTooltip 
                          contentStyle={{ background: 'var(--bg-secondary)', borderColor: 'var(--border)', borderRadius: 8, color: 'var(--text-primary)' }}
                          labelStyle={{ color: 'var(--text-primary)' }}
                        />
                        <Legend wrapperStyle={{ color: 'var(--text-secondary)' }} />
                        <Area type="monotone" dataKey="objectif" stroke="#82ca9d" strokeDasharray="5 5" fill="none" name={t('dash_objective')} />
                        <Area type="monotone" dataKey="prevision" stroke={MODULE_COLORS.Achats} fill={`${MODULE_COLORS.Achats}20`} name={t('dash_forecast')} />
                        <Area type="monotone" dataKey="ventes" stroke={MODULE_COLORS.Ventes} fill={`${MODULE_COLORS.Ventes}20`} name={t('dash_sales')} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </Col>

                <Col xs={24} lg={8}>
                  <div className="magic-card" style={{ padding: 20 }}>
                    <div style={{ marginBottom: 16, color: 'var(--text-primary)' }}><AppstoreOutlined /> {t('dash_active_modules')}</div>
                    <List
                      dataSource={modules.slice(1, 7)}
                      renderItem={item => (
                        <div style={{ padding: '12px 0', borderBottom: `1px solid ${'var(--border)'}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                          <Avatar style={{ backgroundColor: item.color }} icon={item.icon} />
                          <div style={{ flex: 1 }}>
                            <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{item.name}</div>
                            <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.stats}</Text>
                          </div>
                          <Progress percent={item.progress} size="small" strokeColor={item.color} showInfo={false} style={{ width: 80 }} />
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.progress}%</span>
                        </div>
                      )}
                    />
                  </div>
                </Col>
              </Row>
            </>
          )}
        </Content>
      </Layout>

      {/* Search Modal */}
      <Modal title={t('dash_global_search')} open={searchModal} onCancel={() => setSearchModal(false)} footer={null} width={600} style={{ top: 100 }}>
        <Input placeholder={t('dash_search_orders')} prefix={<SearchOutlined />} size="large" autoFocus style={{ borderRadius: 8 }} />
        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Tag>{t('dash_tag_orders')}</Tag> <Tag>{t('dash_tag_clients')}</Tag> <Tag>{t('dash_tag_products')}</Tag> <Tag>{t('dash_tag_invoices')}</Tag> <Tag>{t('dash_tag_employees')}</Tag>
        </div>
        <Divider />
        <Empty description={t('dash_start_typing')} />
      </Modal>

      {/* Notifications Drawer */}
      <Drawer title={t('dash_notifications')} placement="right" onClose={() => setNotificationsDrawer(false)} open={notificationsDrawer} width={400}>
        <List
          dataSource={notifications}
          renderItem={item => (
            <div style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
              <Badge status={item.type === 'error' ? 'error' : item.type === 'warning' ? 'warning' : 'processing'} />
              <div style={{ flex: 1 }}>
                <div style={{ color: 'var(--text-primary)' }}>{item.message}</div>
                <Text style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.module} • {item.time}</Text>
              </div>
              <Tag color={item.priority === 'haute' ? 'red' : item.priority === 'moyenne' ? 'orange' : 'blue'}>{item.priority}</Tag>
            </div>
          )}
        />
      </Drawer>
    </Layout>
  );
};

export default OdooDashboard;