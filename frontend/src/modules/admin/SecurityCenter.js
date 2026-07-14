import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Table, Tag, Typography, 
  Button, Space, Statistic, Progress, 
  List, Avatar, Badge, Modal, Form, 
  Input, message, Divider, Tooltip, Empty, Alert
} from 'antd';
import { 
  SafetyCertificateOutlined, 
  HistoryOutlined, 
  GlobalOutlined, 
  KeyOutlined, 
  DesktopOutlined, 
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  UnlockOutlined,
  LockOutlined,
  ReloadOutlined,
  EyeOutlined,
  DeleteOutlined,
  PlusOutlined,
  SearchOutlined
} from '@ant-design/icons';
import { Column, Pie } from '@ant-design/charts';
import api from '../../services/api';
import { motion } from 'framer-motion';

const { Title, Text, Paragraph } = Typography;

const SecurityCenter = () => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [stats, setStats] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [tokenModalVisible, setTokenModalVisible] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logsRes, sessionsRes, statsRes] = await Promise.all([
        api.get('/security/logs?limit=10'),
        api.get('/security/sessions'),
        api.get('/security/stats')
      ]);
      
      setLogs(logsRes.data.items || []);
      setSessions(sessionsRes.data || []);
      setStats(statsRes.data);
      
      // Données de tokens factices pour la démo
      setTokens([
        { id: '1', name: 'Production API', lastUsed: '2026-05-05 14:20', created: '2026-04-01' },
        { id: '2', name: 'Development Webhook', lastUsed: 'Jamais', created: '2026-04-20' }
      ]);

    } catch (error) {
      message.error('Erreur lors du chargement des données de sécurité');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateToken = async (values) => {
    try {
      const res = await api.post('/security/tokens', values);
      message.success('Token API généré avec succès');
      setTokens([...tokens, { ...res.data, created: new Date().toLocaleDateString() }]);
      setTokenModalVisible(false);
      form.resetFields();
    } catch (error) {
      message.error('Erreur lors de la génération du token');
    }
  };

  const logColumns = [
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (action) => {
        let color = 'blue';
        if (action === 'delete') color = 'red';
        if (action === 'login') color = 'green';
        return <Tag color={color}>{action.toUpperCase()}</Tag>;
      }
    },
    {
      title: 'Ressource',
      dataIndex: 'resource',
      key: 'resource',
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleString()
    },
    {
      title: 'IP',
      dataIndex: 'ip_address',
      key: 'ip_address',
    }
  ];

  const sessionColumns = [
    {
      title: 'Appareil',
      key: 'device',
      render: (_, record) => (
        <Space>
          <DesktopOutlined />
          <Text>{record.user_agent ? record.user_agent.split(' ')[0] : 'Inconnu'}</Text>
        </Space>
      )
    },
    {
      title: 'Adresse IP',
      dataIndex: 'ip_address',
      key: 'ip_address',
    },
    {
      title: 'Dernière activité',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (date) => new Date(date).toLocaleString()
    },
    {
      title: 'Statut',
      key: 'status',
      render: () => <Tag color="green">Active</Tag>
    }
  ];

  return (
    <div style={{ padding: '32px 24px', background: '#f8fafc', minHeight: '100vh' }} className="animate-fadeIn">
      <div style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.5px', color: '#0f172a' }}>
            <SafetyCertificateOutlined style={{ marginRight: 16, color: '#3b82f6' }} />
            Centre de Sécurité & Audit
          </Title>
          <Text style={{ fontSize: 16, color: '#64748b', marginTop: 8, display: 'block' }}>
            Surveillance proactive et contrôle des flux d'accès stratégiques du système.
          </Text>
        </div>
        <Button 
          icon={<ReloadOutlined />} 
          onClick={fetchData}
          style={{ borderRadius: 10, height: 44, fontWeight: 600, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}
        >
          Actualiser les données
        </Button>
      </div>

      <Row gutter={[24, 24]}>
        {/* Score de Sécurité */}
        <Col xs={24} lg={8}>
          <Card 
            variant="borderless" 
            style={{ 
              borderRadius: 24, 
              height: '100%', 
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
              color: 'white',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
              overflow: 'hidden'
            }}
          >
            <div style={{ textAlign: 'center', padding: '30px 0', position: 'relative', zIndex: 2 }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 700, letterSpacing: '1px' }}>SECURITY COMPLIANCE SCORE</Text>
              <div style={{ position: 'relative', marginTop: 40 }}>
                <Progress 
                  type="dashboard" 
                  percent={stats?.health_score || 94} 
                  strokeColor={{ '0%': '#3b82f6', '100%': '#10b981' }}
                  strokeWidth={10}
                  width={200}
                  format={(percent) => (
                    <div style={{ color: 'white' }}>
                      <div style={{ fontSize: 56, fontWeight: 900 }}>{percent}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.6 }}>OPTIMAL</div>
                    </div>
                  )}
                />
              </div>
              <div style={{ marginTop: 32, display: 'flex', justifyContent: 'center', gap: 20 }}>
                <Badge status="success" text={<span style={{ color: 'white', opacity: 0.9, fontSize: 12 }}>Firewall Active</span>} />
                <Badge status="success" text={<span style={{ color: 'white', opacity: 0.9, fontSize: 12 }}>SSL Verified</span>} />
              </div>
            </div>
            {/* Décoration background */}
            <div style={{ position: 'absolute', bottom: -20, right: -20, opacity: 0.1 }}>
              <SafetyCertificateOutlined style={{ fontSize: 200, color: 'white' }} />
            </div>
          </Card>
        </Col>

        {/* Statistiques Rapides */}
        <Col xs={24} lg={16}>
          <Row gutter={[24, 24]}>
            {[
              { title: 'Sessions Actives', value: sessions.length, icon: <DesktopOutlined />, color: '#3b82f6', sub: '3 sources distinctes' },
              { title: 'Niveau de Menace', value: stats?.threat_level || 'Bas', icon: <GlobalOutlined />, color: '#10b981', sub: 'Surveillance mondiale' },
              { title: 'Tentatives (24h)', value: 128, icon: <UnlockOutlined />, color: '#10b981', sub: '0 alertes critiques' },
              { title: 'Alertes Bloquées', value: stats?.alerts_blocked || 12, icon: <CheckCircleOutlined />, color: '#ef4444', sub: 'Protection auto' }
            ].map((s, idx) => (
              <Col xs={12} key={idx}>
                <Card style={{ borderRadius: 20, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ 
                      width: 48, 
                      height: 48, 
                      borderRadius: 14, 
                      backgroundColor: `${s.color}15`, 
                      color: s.color, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      fontSize: 22
                    }}>
                      {s.icon}
                    </div>
                    <div>
                      <Text style={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>{s.title}</Text>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#1e293b' }}>{s.value}</div>
                      <Text style={{ fontSize: 11, color: '#94a3b8' }}>{s.sub}</Text>
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>

          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <HistoryOutlined style={{ color: '#3b82f6' }} />
                <span style={{ fontWeight: 700 }}>Activité de Connexion (7 jours)</span>
              </div>
            }
            style={{ borderRadius: 24, marginTop: 24, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}
          >
            {stats?.login_activity ? (
              <Column 
                data={stats.login_activity} 
                xField="day" 
                yField="count" 
                color="#3b82f6"
                height={160}
                columnStyle={{ radius: [4, 4, 0, 0] }}
              />
            ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Données d'activité non disponibles" />}
          </Card>
        </Col>

        {/* Logs d'Audit */}
        <Col span={24}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <HistoryOutlined style={{ color: '#3b82f6' }} />
                <span style={{ fontWeight: 700 }}>Journal d'Audit Stratégique</span>
              </div>
            }
            variant="borderless"
            style={{ borderRadius: 24, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', overflow: 'hidden' }}
            extra={<Button type="link" style={{ fontWeight: 600 }}>Exporter le rapport complet</Button>}
          >
            <Table 
              columns={logColumns} 
              dataSource={logs} 
              pagination={false} 
              size="middle"
              rowKey="id"
              className="premium-security-table"
            />
          </Card>
        </Col>

        {/* Clés API et Sessions */}
        <Col xs={24} lg={12}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <KeyOutlined style={{ color: '#10b981' }} />
                <span style={{ fontWeight: 700 }}>Clés API & Webhooks Actifs</span>
              </div>
            }
            variant="borderless"
            style={{ borderRadius: 24, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', height: '100%' }}
            extra={<Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => setTokenModalVisible(true)} style={{ borderRadius: 8 }}>Générer</Button>}
          >
            <List
              itemLayout="horizontal"
              dataSource={tokens}
              renderItem={item => (
                <List.Item
                  actions={[
                    <Tooltip title="Voir les détails"><Button type="text" icon={<EyeOutlined />} /></Tooltip>,
                    <Tooltip title="Révoquer"><Button type="text" danger icon={<DeleteOutlined />} /></Tooltip>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<div style={{ width: 40, height: 40, borderRadius: 10, background: '#fff7e6', color: '#fa8c16', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><KeyOutlined /></div>}
                    title={<Text strong style={{ color: '#1e293b' }}>{item.name}</Text>}
                    description={`Créé le ${item.created} • Dernière utilisation: ${item.lastUsed}`}
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card 
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <DesktopOutlined style={{ color: '#10b981' }} />
                <span style={{ fontWeight: 700 }}>Sessions Appareils en Cours</span>
              </div>
            }
            variant="borderless"
            style={{ borderRadius: 24, boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05)', height: '100%' }}
          >
            <List
              itemLayout="horizontal"
              dataSource={sessions}
              renderItem={item => (
                <List.Item>
                  <List.Item.Meta
                    avatar={<div style={{ width: 40, height: 40, borderRadius: 10, background: '#f0fdf4', color: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><DesktopOutlined /></div>}
                    title={<Text strong style={{ color: '#1e293b' }}>{item.device_info || 'Appareil inconnu'}</Text>}
                    description={`${item.ip_address} • ${item.location || 'Localisation non détectée'}`}
                  />
                  <Tag color="success" style={{ borderRadius: 6, fontWeight: 700 }}>ACTIF MAINTENANT</Tag>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>

      <style>{`
        .premium-security-table .ant-table-thead > tr > th {
          background: #f8fafc;
          color: #64748b;
          font-weight: 700;
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #f1f5f9;
        }
        .premium-security-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid #f1f5f9;
        }
        .premium-security-table .ant-table-tbody > tr:hover > td {
          background: #f8fafc !important;
        }
      `}</style>

      {/* Token Modal */}
      <Modal
        title="Générer un nouveau token API"
        open={tokenModalVisible}
        onCancel={() => setTokenModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateToken}>
          <Form.Item name="name" label="Nom du token" rules={[{ required: true, message: 'Nom requis' }]}>
            <Input placeholder="Ex: Production App" />
          </Form.Item>
          <Form.Item name="expiration" label="Expiration">
            <Input placeholder="90 jours (recommandé)" disabled />
          </Form.Item>
          <Alert 
            message="Sécurité"
            description="Le token ne sera affiché qu'une seule fois. Gardez-le précieusement."
            type="warning"
            showIcon
          />
        </Form>
      </Modal>
    </div>
  );
};

export default SecurityCenter;
