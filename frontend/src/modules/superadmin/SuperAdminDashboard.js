import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Statistic, Table, Tag, Space, Progress, 
  Spin, Alert, Typography, Avatar, Badge, Button, Tooltip,
  Tabs, Empty, List
} from 'antd';
import {
  UserOutlined, TeamOutlined, ShopOutlined, FileTextOutlined,
  CheckCircleOutlined, ClockCircleOutlined, WarningOutlined,
  BarChartOutlined, PieChartOutlined, EyeOutlined,
  DollarOutlined, ApiOutlined
} from '@ant-design/icons';
import { Bar, Pie } from '@ant-design/plots';
import { useNavigate } from 'react-router-dom';
import { superAdminApi } from '../../services/superadminApi';
import './SuperAdmin.css';

const { Title, Text } = Typography;
const SuperAdminDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await superAdminApi.getDashboardStats();
      setStats(response.data);
    } catch (err) {
      console.error('Erreur chargement dashboard:', err);
      setError('Impossible de charger les données du dashboard');
    } finally {
      setLoading(false);
    }
  };

  const barConfig = {
    data: stats?.companies_by_sector || [],
    xField: 'sector',
    yField: 'count',
    color: ({ sector }) => {
      const colors = {
        'bank': '#1890ff',
        'insurance': '#52c41a',
        'enterprise': '#722ed1',
        'tech': '#13c2c2',
        'commerce': '#fa8c16',
        'industry': '#eb2f96'
      };
      return colors[sector] || '#8c8c8c';
    },
    label: {
      position: 'top',
      style: { fill: '#FFFFFF', fontSize: 12 }
    },
    height: 300
  };

  const pieConfig = {
    data: stats?.users_by_role || [],
    angleField: 'count',
    colorField: 'role',
    radius: 0.8,
    label: {
      type: 'outer',
      content: ({ role, percent }) => `${role}: ${(percent * 100).toFixed(0)}%`
    },
    height: 300
  };

  if (loading) {
    return (
      <div className="superadmin-loading">
        <Spin size="large" tip="Chargement du dashboard super admin..." ><div/></Spin>
      </div>
    );
  }

  if (error) {
    return (
      <div className="superadmin-error">
        <Alert
          message="Erreur"
          description={error}
          type="error"
          showIcon
          action={
            <Button type="primary" onClick={fetchDashboardData}>
              Réessayer
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="superadmin-dashboard">
      <div className="dashboard-header">
        <div className="header-title">
          <ApiOutlined className="header-icon" />
          <Title level={2}>Super Administration</Title>
        </div>
        <Badge status="processing" text="Plateforme en ligne" />
      </div>

      <Row gutter={[16, 16]} className="kpi-row">
        <Col xs={24} sm={12} lg={6}>
          <Card className="kpi-card" hoverable>
            <Statistic
              title="Utilisateurs"
              value={stats?.total_users}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
            <div className="kpi-footer">
              <Tag color="blue">{stats?.users_by_status?.find(s => s.status === 'active')?.count || 0} actifs</Tag>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="kpi-card" hoverable>
            <Statistic
              title="Entreprises"
              value={stats?.total_companies}
              prefix={<ShopOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
            <div className="kpi-footer">
              <Tag color="green">{stats?.companies_by_sector?.length || 0} secteurs</Tag>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="kpi-card" hoverable>
            <Statistic
              title="Demandes"
              value={stats?.total_requests}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
            <div className="kpi-footer">
              <Badge status="warning" text={`${stats?.pending_requests || 0} en attente`} />
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="kpi-card" hoverable>
            <Statistic
              title="Paiements"
              value={stats?.paid_requests}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
            <div className="kpi-footer">
              <Tag color="orange">Total: {stats?.paid_requests || 0} payés</Tag>
            </div>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="charts-row">
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <PieChartOutlined style={{ color: '#722ed1' }} />
                <span>Répartition des utilisateurs par rôle</span>
              </Space>
            }
          >
            {stats?.users_by_role?.length > 0 ? (
              <Pie {...pieConfig} />
            ) : (
              <Empty description="Aucune donnée" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title={
              <Space>
                <BarChartOutlined style={{ color: '#52c41a' }} />
                <span>Entreprises par secteur</span>
              </Space>
            }
          >
            {stats?.companies_by_sector?.length > 0 ? (
              <Bar {...barConfig} />
            ) : (
              <Empty description="Aucune donnée" />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="tables-row">
        <Col xs={24} lg={12}>
          <Card 
            title="Demandes récentes"
            extra={<Button type="link" onClick={() => navigate('/superadmin/requests')}>Voir tout</Button>}
          >
            {stats?.recent_requests?.length > 0 ? (
              <List
                dataSource={stats.recent_requests}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Tooltip title="Voir détails">
                        <Button 
                          icon={<EyeOutlined />} 
                          size="small"
                          onClick={() => navigate(`/superadmin/requests/${item.id}`)}
                        />
                      </Tooltip>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar style={{ backgroundColor: getStatusColor(item.status) }}>
                          {item.model_name.charAt(0)}
                        </Avatar>
                      }
                      title={item.model_name}
                      description={
                        <Space>
                          <Tag color="blue">{item.company_name}</Tag>
                          <Tag color={item.payment_status === 'paid' ? 'green' : 'orange'}>
                            {item.payment_status === 'paid' ? '✅ Payé' : '⏳ En attente'}
                          </Tag>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="Aucune demande récente" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title="Nouvelles entreprises"
            extra={<Button type="link" onClick={() => navigate('/superadmin/companies')}>Voir tout</Button>}
          >
            {stats?.recent_companies?.length > 0 ? (
              <List
                dataSource={stats.recent_companies}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Tooltip title="Voir détails">
                        <Button 
                          icon={<EyeOutlined />} 
                          size="small"
                          onClick={() => navigate(`/superadmin/companies/${item.id}`)}
                        />
                      </Tooltip>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<ShopOutlined />} />}
                      title={item.name}
                      description={
                        <Space>
                          <Tag color="processing">{item.sector}</Tag>
                          <Text type="secondary">{item.city || 'Localisation non spécifiée'}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="Aucune entreprise récente" />
            )}
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={24}>
          <Card 
            title="Derniers utilisateurs inscrits"
            extra={<Button type="link" onClick={() => navigate('/superadmin/users')}>Voir tout</Button>}
          >
            {stats?.recent_users?.length > 0 ? (
              <List
                dataSource={stats.recent_users}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Tooltip title="Voir détails">
                        <Button 
                          icon={<EyeOutlined />} 
                          size="small"
                          onClick={() => navigate(`/superadmin/users/${item.id}`)}
                        />
                      </Tooltip>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar icon={<UserOutlined />} />}
                      title={item.full_name || item.email}
                      description={
                        <Space>
                          <Tag color={item.role === 'super_admin' ? 'purple' : item.role === 'admin' ? 'red' : 'blue'}>
                            {item.role}
                          </Tag>
                          <Tag color={item.status === 'active' ? 'green' : 'orange'}>
                            {item.status}
                          </Tag>
                          <Text type="secondary">{item.company_name || 'Indépendant'}</Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="Aucun utilisateur récent" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

const getStatusColor = (status) => {
  const colors = {
    'pending': '#faad14',
    'approved': '#52c41a',
    'rejected': '#f5222d',
    'in_progress': '#1890ff'
  };
  return colors[status] || '#8c8c8c';
};

export default SuperAdminDashboard;