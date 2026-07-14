// src/modules/admin/components/CustomerManagement.js
import React, { useState, useMemo } from 'react';
import {
  Card, Table, Button, Space, Input, Select, Modal, Form, message,
  Avatar, Tag, Badge, Tooltip, Dropdown, Menu, Upload, Row, Col,
  Statistic, Descriptions, DatePicker, Progress
} from 'antd';
import {
  SearchOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, DownloadOutlined, ImportOutlined, UserOutlined,
  MailOutlined, PhoneOutlined, BankOutlined, HistoryOutlined,
  FileTextOutlined, ExportOutlined, InboxOutlined, TeamOutlined,
  CrownOutlined, EuroOutlined
} from '@ant-design/icons';
import adminService from '../services/adminService';

const { Option } = Select;

const CustomerManagement = ({ customers = [], payments = [], loading, onRefresh }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [form] = Form.useForm();
  const [exportLoading, setExportLoading] = useState(false);

  // Statistiques
  const stats = useMemo(() => ({
    total: customers.length,
    actifs: customers.filter(c => c.status === 'actif').length,
    premium: customers.filter(c => c.plan === 'premium').length,
    revenue: customers.reduce((acc, c) => acc + (c.revenue || 0), 0)
  }), [customers]);

  // Filtrage
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      const searchMatch = 
        (customer.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (customer.email || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (customer.company || '').toLowerCase().includes(searchText.toLowerCase());
      
      const statusMatch = filterStatus === 'all' || customer.status === filterStatus;
      
      return searchMatch && statusMatch;
    });
  }, [customers, searchText, filterStatus]);

  const handleCreate = async (values) => {
    try {
      await adminService.createCustomer(values);
      message.success('Client créé avec succès');
      setModalVisible(false);
      form.resetFields();
      onRefresh();
    } catch (error) {
      message.error('Erreur lors de la création');
    }
  };

  const handleUpdate = async (values) => {
    try {
      await adminService.updateCustomer(selectedCustomer.id, values);
      message.success('Client mis à jour');
      setModalVisible(false);
      onRefresh();
    } catch (error) {
      message.error('Erreur lors de la mise à jour');
    }
  };

  const handleDelete = async () => {
    try {
      await adminService.deleteCustomer(customerToDelete.id);
      message.success('Client supprimé');
      setDeleteModalVisible(false);
      setCustomerToDelete(null);
      onRefresh();
    } catch (error) {
      message.error('Erreur lors de la suppression');
    }
  };

  const handleExport = async (format) => {
    setExportLoading(true);
    try {
      const blob = await adminService.exportData('customers', format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers.${format.toLowerCase()}`;
      a.click();
      message.success('Export réussi');
    } catch (error) {
      message.error('Erreur lors de l\'export');
    } finally {
      setExportLoading(false);
    }
  };

  const columns = [
    {
      title: 'Client',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#4158D0' }} />
          <div>
            <strong>{text}</strong>
            <br />
            <small>{record.email}</small>
          </div>
        </Space>
      ),
      sorter: (a, b) => (a.name || '').localeCompare(b.name || '')
    },
    {
      title: 'Entreprise',
      dataIndex: 'company',
      key: 'company',
      render: (text) => text || '-'
    },
    {
      title: 'Plan',
      dataIndex: 'plan',
      key: 'plan',
      render: (plan) => (
        <Tag color={plan === 'premium' ? 'gold' : 'blue'}>
          {plan?.toUpperCase() || 'STANDARD'}
        </Tag>
      )
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge 
          status={status === 'actif' ? 'success' : 'default'} 
          text={status || 'inactif'} 
        />
      )
    },
    {
      title: 'Revenu',
      dataIndex: 'revenue',
      key: 'revenue',
      render: (revenue) => `${revenue?.toLocaleString() || 0} €`,
      sorter: (a, b) => (a.revenue || 0) - (b.revenue || 0)
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Modifier">
            <Button 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => {
                setSelectedCustomer(record);
                setModalMode('edit');
                form.setFieldsValue(record);
                setModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Supprimer">
            <Button 
              icon={<DeleteOutlined />} 
              size="small" 
              danger
              onClick={() => {
                setCustomerToDelete(record);
                setDeleteModalVisible(true);
              }}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <div>
      {/* Statistiques */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic title="Total clients" value={stats.total} prefix={<TeamOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Clients actifs" value={stats.actifs} valueStyle={{ color: '#3f8600' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Premium" value={stats.premium} prefix={<CrownOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="CA mensuel" value={stats.revenue} prefix={<EuroOutlined />} />
          </Card>
        </Col>
      </Row>

      {/* Filtres */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Input
              placeholder="Rechercher..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col>
            <Select value={filterStatus} onChange={setFilterStatus} style={{ width: 120 }}>
              <Option value="all">Tous</Option>
              <Option value="actif">Actif</Option>
              <Option value="inactif">Inactif</Option>
            </Select>
          </Col>
          <Col>
            <Dropdown overlay={
              <Menu>
                <Menu.Item key="csv" onClick={() => handleExport('CSV')}>
                  <FileTextOutlined /> CSV
                </Menu.Item>
                <Menu.Item key="excel" onClick={() => handleExport('EXCEL')}>
                  <ExportOutlined /> Excel
                </Menu.Item>
              </Menu>
            }>
              <Button icon={<DownloadOutlined />} loading={exportLoading}>
                Exporter
              </Button>
            </Dropdown>
          </Col>
          <Col>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => {
                setModalMode('create');
                form.resetFields();
                setModalVisible(true);
              }}
            >
              Nouveau client
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Tableau */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredCustomers}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (total) => `${total} clients` }}
        />
      </Card>

      {/* Modal création/édition */}
      <Modal
        title={modalMode === 'create' ? 'Nouveau client' : 'Modifier client'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={modalMode === 'create' ? handleCreate : handleUpdate}
        >
          <Form.Item name="name" label="Nom" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="company" label="Entreprise">
            <Input />
          </Form.Item>
          <Form.Item name="plan" label="Plan">
            <Select>
              <Option value="standard">Standard</Option>
              <Option value="premium">Premium</Option>
              <Option value="enterprise">Enterprise</Option>
            </Select>
          </Form.Item>
          <Form.Item name="status" label="Statut">
            <Select>
              <Option value="actif">Actif</Option>
              <Option value="inactif">Inactif</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal suppression */}
      <Modal
        title="Confirmer la suppression"
        open={deleteModalVisible}
        onCancel={() => setDeleteModalVisible(false)}
        onOk={handleDelete}
        okText="Supprimer"
        cancelText="Annuler"
        okButtonProps={{ danger: true }}
      >
        <p>Supprimer le client <strong>{customerToDelete?.name}</strong> ?</p>
        <p>Cette action est irréversible.</p>
      </Modal>
    </div>
  );
};

export default CustomerManagement;