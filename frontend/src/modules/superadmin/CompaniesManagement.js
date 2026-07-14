import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Tag, Modal, message,
  Input, Select, Form, Tooltip, Avatar, Badge,
  Typography, Descriptions, Drawer, Row, Col, Statistic
} from 'antd';
import {
  ShopOutlined, SearchOutlined, ReloadOutlined,
  EyeOutlined, EditOutlined, BankOutlined,
  GlobalOutlined, PhoneOutlined, MailOutlined,
  TeamOutlined, ApartmentOutlined
} from '@ant-design/icons';
import { superAdminApi } from '../../services/superadminApi';
import './SuperAdmin.css';

const { Text } = Typography;
const { Option } = Select;

const CompaniesManagement = () => {
  const [loading, setLoading] = useState(false);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    sector: '',
    country: ''
  });
  const [form] = Form.useForm();

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const response = await superAdminApi.getCompanies(0, 100);
      setCompanies(response.data.companies || []);
    } catch (error) {
      message.error('Erreur lors du chargement des entreprises');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const handleViewCompany = (company) => {
    setSelectedCompany(company);
    setDrawerVisible(true);
  };

  const handleEditCompany = (company) => {
    setSelectedCompany(company);
    form.setFieldsValue({
      name: company.name,
      sector: company.sector,
      size: company.size,
      city: company.city,
      country: company.country,
      phone: company.phone,
      email: company.email,
      website: company.website,
      is_active: company.is_active
    });
    setEditModal(true);
  };

  const handleUpdateCompany = async (values) => {
    try {
      await superAdminApi.updateCompany(selectedCompany.id, values);
      message.success('Entreprise mise à jour avec succès');
      setEditModal(false);
      fetchCompanies();
    } catch (error) {
      message.error('Erreur lors de la mise à jour');
    }
  };

  const getSectorColor = (sector) => {
    const colors = {
      'bank': '#1890ff',
      'insurance': '#52c41a',
      'enterprise': '#722ed1',
      'tech': '#13c2c2',
      'commerce': '#fa8c16',
      'industry': '#eb2f96'
    };
    return colors[sector] || '#8c8c8c';
  };

  const getFilteredCompanies = () => {
    return companies.filter(company => {
      if (filters.search && !company.name?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.sector && company.sector !== filters.sector) return false;
      if (filters.country && company.country !== filters.country) return false;
      return true;
    });
  };

  const columns = [
    {
      title: 'Entreprise',
      key: 'company',
      render: (_, record) => (
        <Space>
          <Avatar icon={<ShopOutlined />} style={{ backgroundColor: getSectorColor(record.sector) }} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.legal_name || '-'}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Secteur',
      dataIndex: 'sector',
      key: 'sector',
      render: (sector) => (
        <Tag color={getSectorColor(sector)}>{sector}</Tag>
      )
    },
    {
      title: 'Localisation',
      key: 'location',
      render: (_, record) => (
        <div>
          <div>{record.city || '-'}</div>
          <Text type="secondary">{record.country || '-'}</Text>
        </div>
      )
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <div>
          <div>{record.email || '-'}</div>
          <Text type="secondary">{record.phone || '-'}</Text>
        </div>
      )
    },
    {
      title: 'Utilisateurs',
      dataIndex: 'users_count',
      key: 'users_count',
      render: (count) => (
        <Badge count={count} showZero color="blue" />
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Voir détails">
            <Button icon={<EyeOutlined />} size="small" onClick={() => handleViewCompany(record)} />
          </Tooltip>
          <Tooltip title="Modifier">
            <Button icon={<EditOutlined />} size="small" onClick={() => handleEditCompany(record)} />
          </Tooltip>
        </Space>
      )
    }
  ];

  const filteredCompanies = getFilteredCompanies();

  return (
    <div className="superadmin-page">
      <Card
        title={
          <Space>
            <ShopOutlined />
            <span>Gestion des Entreprises</span>
            <Badge count={filteredCompanies.length} style={{ backgroundColor: '#1890ff' }} />
          </Space>
        }
        extra={
          <Space>
            <Input
              placeholder="Rechercher..."
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              style={{ width: 200 }}
              allowClear
            />
            <Select
              placeholder="Secteur"
              value={filters.sector}
              onChange={(value) => setFilters({ ...filters, sector: value })}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="bank">Banque</Option>
              <Option value="insurance">Assurance</Option>
              <Option value="enterprise">Entreprise</Option>
              <Option value="tech">Technologie</Option>
              <Option value="commerce">Commerce</Option>
              <Option value="industry">Industrie</Option>
            </Select>
            <Tooltip title="Actualiser">
              <Button icon={<ReloadOutlined />} onClick={fetchCompanies} />
            </Tooltip>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredCompanies}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Drawer
        title="Détails de l'entreprise"
        placement="right"
        width={600}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedCompany && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">{selectedCompany.id}</Descriptions.Item>
            <Descriptions.Item label="Nom">{selectedCompany.name}</Descriptions.Item>
            <Descriptions.Item label="Nom légal">{selectedCompany.legal_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Secteur">
              <Tag color={getSectorColor(selectedCompany.sector)}>{selectedCompany.sector}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Taille">{selectedCompany.size || '-'}</Descriptions.Item>
            <Descriptions.Item label="Ville">{selectedCompany.city || '-'}</Descriptions.Item>
            <Descriptions.Item label="Pays">{selectedCompany.country || '-'}</Descriptions.Item>
            <Descriptions.Item label="Téléphone">{selectedCompany.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="Email">{selectedCompany.email || '-'}</Descriptions.Item>
            <Descriptions.Item label="Site web">{selectedCompany.website || '-'}</Descriptions.Item>
            <Descriptions.Item label="Statut">
              <Tag color={selectedCompany.is_active ? 'success' : 'error'}>
                {selectedCompany.is_active ? 'Actif' : 'Inactif'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Abonnement">{selectedCompany.subscription_tier}</Descriptions.Item>
            <Descriptions.Item label="Nombre d'utilisateurs">{selectedCompany.users_count}</Descriptions.Item>
            <Descriptions.Item label="Date création">{new Date(selectedCompany.created_at).toLocaleString()}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Modal
        title="Modifier l'entreprise"
        open={editModal}
        onCancel={() => setEditModal(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateCompany}
        >
          <Form.Item name="name" label="Nom">
            <Input />
          </Form.Item>
          <Form.Item name="sector" label="Secteur">
            <Select>
              <Option value="bank">Banque</Option>
              <Option value="insurance">Assurance</Option>
              <Option value="enterprise">Entreprise</Option>
              <Option value="tech">Technologie</Option>
              <Option value="commerce">Commerce</Option>
              <Option value="industry">Industrie</Option>
            </Select>
          </Form.Item>
          <Form.Item name="size" label="Taille">
            <Select allowClear>
              <Option value="1-10">1-10 employés</Option>
              <Option value="11-50">11-50 employés</Option>
              <Option value="51-200">51-200 employés</Option>
              <Option value="201-500">201-500 employés</Option>
              <Option value="500+">500+ employés</Option>
            </Select>
          </Form.Item>
          <Form.Item name="city" label="Ville">
            <Input />
          </Form.Item>
          <Form.Item name="country" label="Pays">
            <Input />
          </Form.Item>
          <Form.Item name="phone" label="Téléphone">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" />
          </Form.Item>
          <Form.Item name="website" label="Site web">
            <Input />
          </Form.Item>
          <Form.Item name="is_active" label="Statut">
            <Select>
              <Option value={true}>Actif</Option>
              <Option value={false}>Inactif</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setEditModal(false)}>Annuler</Button>
              <Button type="primary" htmlType="submit">
                Mettre à jour
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CompaniesManagement;