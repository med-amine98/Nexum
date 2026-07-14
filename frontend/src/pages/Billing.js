import React, { useState, useEffect } from 'react';
import {
  Card, Tabs, Table, Tag, Space, Button,
  Statistic, Row, Col, Progress, Badge,
  Typography, Tooltip, Alert
} from 'antd';
import {
  DownloadOutlined, EuroOutlined,
  FileTextOutlined, CreditCardOutlined,
  DatabaseOutlined, UserOutlined, ApiOutlined,
  WalletOutlined, CalendarOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { fetchInvoices, fetchPayments, fetchUsage, fetchBillingStats } from '../api';
import './Billing.css';

const { Title, Text } = Typography;

const Billing = () => {
  const [activeTab, setActiveTab] = useState('invoices');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [usage, setUsage] = useState({
    storage: { used: 0, total: 0, unit: 'Go' },
    users: { used: 0, total: 0 },
    api: { used: 0, total: 0, unit: 'appels' }
  });
  const [stats, setStats] = useState({
    totalSpent: 0,
    nextInvoiceDate: '--/--/----',
    paymentMethod: 'Non renseigné'
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [inv, pay, usg, st] = await Promise.all([
        fetchInvoices(),
        fetchPayments(),
        fetchUsage(),
        fetchBillingStats()
      ]);
      setInvoices(inv);
      setPayments(pay);
      setUsage(usg);
      setStats(st);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const invoiceColumns = [
    { title: 'Facture', dataIndex: 'id', key: 'id', render: (id) => <Text strong>{id}</Text> },
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Montant', dataIndex: 'amount', key: 'amount', render: (amt) => `${amt} €` },
    { title: 'Forfait', dataIndex: 'plan', key: 'plan', render: (plan) => <Tag color="blue">{plan}</Tag> },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge status={status === 'payée' ? 'success' : 'warning'} text={status === 'payée' ? 'Payée' : 'En attente'} />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Tooltip title="Télécharger la facture">
          <Button icon={<DownloadOutlined />} size="small" type="link" onClick={() => console.log('Télécharger', record.id)} />
        </Tooltip>
      )
    }
  ];

  const paymentColumns = [
    { title: 'Transaction', dataIndex: 'id', key: 'id', render: (id) => <Text code>{id}</Text> },
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Montant', dataIndex: 'amount', key: 'amount', render: (amt) => `${amt} €` },
    { title: 'Méthode', dataIndex: 'method', key: 'method', render: (method) => <Tag icon={<CreditCardOutlined />}>{method}</Tag> },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge status={status === 'réussi' ? 'success' : 'error'} text={status === 'réussi' ? 'Réussi' : 'Échoué'} />
      )
    }
  ];

  const renderUsageProgress = (label, used, total, unit = '', icon, color) => {
    const percent = total > 0 ? Math.min((used / total) * 100, 100) : 0;
    const isNearLimit = percent > 80;
    return (
      <div style={{ marginBottom: 16 }}>
        <Space align="center" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <Space>{icon}<Text strong>{label}</Text></Space>
          <Text type={isNearLimit ? 'danger' : 'secondary'}>
            {used} {unit} / {total} {unit}
          </Text>
        </Space>
        <Progress percent={percent} size="small" strokeColor={isNearLimit ? '#ff4d4f' : color || '#1890ff'} showInfo={false} />
      </div>
    );
  };

  if (error) {
    return (
      <div className="billing-page">
        <Alert
          message="Erreur de chargement"
          description={error}
          type="error"
          showIcon
          action={<Button size="small" type="primary" icon={<ReloadOutlined />} onClick={loadData}>Réessayer</Button>}
        />
      </div>
    );
  }

  return (
    <div className="billing-page">
      <Title level={2}>Facturation</Title>

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={24} sm={8}>
          <Card variant="borderless" className="stat-card">
            <Statistic title={<Space><EuroOutlined style={{ color: '#52c41a' }} /><span>Total dépensé</span></Space>}
              value={stats.totalSpent} suffix="€" loading={loading} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless" className="stat-card">
            <Statistic title={<Space><CalendarOutlined style={{ color: '#1890ff' }} /><span>Prochaine facture</span></Space>}
              value={stats.nextInvoiceDate} loading={loading} valueStyle={{ fontSize: '1.2rem' }} />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card variant="borderless" className="stat-card">
            <Statistic title={<Space><WalletOutlined style={{ color: '#faad14' }} /><span>Moyen de paiement</span></Space>}
              value={stats.paymentMethod} loading={loading} valueStyle={{ fontSize: '1rem' }} />
          </Card>
        </Col>
      </Row>

      <Card
        title={<Space><FileTextOutlined /><span>Utilisation du forfait <Text strong>Performance</Text></span></Space>}
        extra={<Button type="primary" ghost size="small">Modifier le forfait</Button>}
        className="usage-card"
        variant="borderless"
        style={{ marginBottom: 24 }}
        loading={loading}
      >
        <Row gutter={[24, 24]}>
          <Col xs={24} md={8}>
            {renderUsageProgress('Stockage', usage.storage.used, usage.storage.total, usage.storage.unit, <DatabaseOutlined />, '#1890ff')}
          </Col>
          <Col xs={24} md={8}>
            {renderUsageProgress('Utilisateurs', usage.users.used, usage.users.total, '', <UserOutlined />, '#722ed1')}
          </Col>
          <Col xs={24} md={8}>
            {renderUsageProgress('Appels API', usage.api.used, usage.api.total, usage.api.unit, <ApiOutlined />, '#13c2c2')}
          </Col>
        </Row>
      </Card>

      <Card variant="borderless" className="tabs-card">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'invoices',
              label: <span><FileTextOutlined /> Factures</span>,
              children: <Table columns={invoiceColumns} dataSource={invoices} rowKey="id" pagination={{ pageSize: 5 }} loading={loading} locale={{ emptyText: 'Aucune facture trouvée' }} />
            },
            {
              key: 'payments',
              label: <span><CreditCardOutlined /> Historique des paiements</span>,
              children: <Table columns={paymentColumns} dataSource={payments} rowKey="id" pagination={{ pageSize: 5 }} loading={loading} locale={{ emptyText: 'Aucun paiement enregistré' }} />
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default Billing;