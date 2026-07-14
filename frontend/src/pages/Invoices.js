import React, { useState, useEffect } from 'react';
import {
  Card, Table, Tag, Space, Button,
  Select, DatePicker, Input, Badge,
  Typography, Row, Col, Statistic,
  Tooltip, Alert
} from 'antd';
import {
  DownloadOutlined, SearchOutlined,
  FilePdfOutlined, PrinterOutlined,
  EuroOutlined, FileTextOutlined,
  CheckCircleOutlined, ClockCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { fetchInvoices } from '../api';
import './Invoices.css';

const { RangePicker } = DatePicker;
const { Option } = Select;
const { Title, Text } = Typography;

const Invoices = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [stats, setStats] = useState({
    totalInvoices: 0,
    totalAmount: 0,
    paidCount: 0,
    pendingCount: 0
  });

  const loadInvoices = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInvoices();
      setInvoices(data);
      setFilteredInvoices(data);
      const total = data.reduce((acc, inv) => acc + inv.amount, 0);
      const paid = data.filter(inv => inv.status === 'payée').length;
      const pending = data.filter(inv => inv.status === 'en attente').length;
      setStats({
        totalInvoices: data.length,
        totalAmount: total,
        paidCount: paid,
        pendingCount: pending
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  useEffect(() => {
    let filtered = [...invoices];
    if (searchText) {
      const lower = searchText.toLowerCase();
      filtered = filtered.filter(inv =>
        inv.id.toLowerCase().includes(lower) ||
        inv.items?.toLowerCase().includes(lower)
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(inv => inv.status === statusFilter);
    }
    if (dateRange && dateRange.length === 2) {
      const [start, end] = dateRange;
      filtered = filtered.filter(inv => {
        const invDate = new Date(inv.date.split('/').reverse().join('-'));
        return invDate >= start && invDate <= end;
      });
    }
    setFilteredInvoices(filtered);
  }, [searchText, statusFilter, dateRange, invoices]);

  const columns = [
    { title: 'Facture', dataIndex: 'id', key: 'id', render: (id) => <Text strong>{id}</Text>, sorter: (a, b) => a.id.localeCompare(b.id) },
    { title: 'Date', dataIndex: 'date', key: 'date', sorter: (a, b) => a.date.localeCompare(b.date) },
    { title: 'Échéance', dataIndex: 'dueDate', key: 'dueDate', sorter: (a, b) => a.dueDate.localeCompare(b.dueDate) },
    { title: 'Description', dataIndex: 'items', key: 'items', ellipsis: true },
    { title: 'Montant', dataIndex: 'amount', key: 'amount', render: (amount) => <Text strong>{amount} €</Text>, sorter: (a, b) => a.amount - b.amount },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status) => <Badge status={status === 'payée' ? 'success' : 'warning'} text={status === 'payée' ? 'Payée' : 'En attente'} />,
      filters: [{ text: 'Payée', value: 'payée' }, { text: 'En attente', value: 'en attente' }],
      onFilter: (value, record) => record.status === value,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: () => (
        <Space>
          <Tooltip title="Télécharger en PDF"><Button icon={<FilePdfOutlined />} size="small" type="link" /></Tooltip>
          <Tooltip title="Imprimer"><Button icon={<PrinterOutlined />} size="small" type="link" /></Tooltip>
          <Tooltip title="Télécharger"><Button icon={<DownloadOutlined />} size="small" type="link" /></Tooltip>
        </Space>
      ),
    },
  ];

  if (error) {
    return (
      <div className="invoices-page">
        <Alert
          message="Erreur de chargement"
          description={error}
          type="error"
          showIcon
          action={<Button size="small" type="primary" icon={<ReloadOutlined />} onClick={loadInvoices}>Réessayer</Button>}
        />
      </div>
    );
  }

  return (
    <div className="invoices-page">
      <Title level={2}>Factures</Title>

      <Row gutter={[16, 16]} className="stats-row">
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic title={<Space><FileTextOutlined style={{ color: '#1890ff' }} /><span>Total factures</span></Space>} value={stats.totalInvoices} loading={loading} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic title={<Space><EuroOutlined style={{ color: '#52c41a' }} /><span>Montant total</span></Space>} value={stats.totalAmount} suffix="€" loading={loading} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic title={<Space><CheckCircleOutlined style={{ color: '#52c41a' }} /><span>Payées</span></Space>} value={stats.paidCount} loading={loading} />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card className="stat-card">
            <Statistic title={<Space><ClockCircleOutlined style={{ color: '#faad14' }} /><span>En attente</span></Space>} value={stats.pendingCount} loading={loading} />
          </Card>
        </Col>
      </Row>

      <Card className="invoices-card" variant="borderless">
        <div className="invoices-header">
          <div className="filters-left">
            <Input placeholder="Rechercher une facture..." prefix={<SearchOutlined />} style={{ width: 250 }} value={searchText} onChange={(e) => setSearchText(e.target.value)} allowClear />
            <Select defaultValue="all" style={{ width: 150 }} value={statusFilter} onChange={(value) => setStatusFilter(value)}>
              <Option value="all">Tous les statuts</Option>
              <Option value="payée">Payées</Option>
              <Option value="en attente">En attente</Option>
            </Select>
            <RangePicker onChange={(dates) => setDateRange(dates)} placeholder={['Date début', 'Date fin']} />
          </div>
          <div className="filters-right">
            <Button type="primary" icon={<DownloadOutlined />}>Exporter</Button>
          </div>
        </div>

        <Table columns={columns} dataSource={filteredInvoices} rowKey="id" pagination={{ pageSize: 10, showSizeChanger: true }} loading={loading} locale={{ emptyText: 'Aucune facture trouvée' }} />
      </Card>
    </div>
  );
};

export default Invoices;