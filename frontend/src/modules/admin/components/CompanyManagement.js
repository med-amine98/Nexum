import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Modal, Form, Input, Select, message, Tag, Space, Tooltip, DatePicker } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, BankOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../../../services/api';

const { Option } = Select;

const CompanyManagement = () => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCompany, setEditingCompany] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCompanies();
  }, []);

 const fetchCompanies = async () => {
  setLoading(true);
  try {
    const response = await api.get('/admin/companies');
    // S'assurer que les données sont un tableau
    const companiesData = response.data?.companies || response.data?.data || response.data;
    setCompanies(Array.isArray(companiesData) ? companiesData : []);
  } catch (error) {
    console.error('Erreur chargement entreprises:', error);
    message.error('Erreur lors du chargement des entreprises');
    setCompanies([]);
  } finally {
    setLoading(false);
  }
};

  const handleSave = async (values) => {
    try {
      if (editingCompany) {
        await api.put(`/admin/companies/${editingCompany.id}`, values);
        message.success('Entreprise modifiée');
      } else {
        await api.post('/admin/companies', values);
        message.success('Entreprise créée');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingCompany(null);
      fetchCompanies();
    } catch (error) {
      message.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: 'Supprimer l\'entreprise',
      content: 'Êtes-vous sûr de vouloir supprimer cette entreprise ?',
      onOk: async () => {
        try {
          await api.delete(`/admin/companies/${id}`);
          message.success('Entreprise supprimée');
          fetchCompanies();
        } catch (error) {
          message.error('Erreur lors de la suppression');
        }
      }
    });
  };

  const columns = [
    { title: 'Nom', dataIndex: 'name', key: 'name' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { title: 'Téléphone', dataIndex: 'phone', key: 'phone' },
    { title: 'Secteur', dataIndex: 'sector', key: 'sector', render: (sector) => <Tag color="blue">{sector}</Tag> },
    { title: 'Abonnement', dataIndex: 'subscription_tier', key: 'subscription_tier', render: (tier) => <Tag color={tier === 'premium' ? 'gold' : 'default'}>{tier}</Tag> },
    { title: 'Statut', dataIndex: 'is_active', key: 'is_active', render: (active) => <Tag color={active ? 'green' : 'red'}>{active ? 'Actif' : 'Inactif'}</Tag> },
    { title: 'Actions', key: 'actions', render: (_, record) => (
      <Space>
        <Tooltip title="Modifier"><Button icon={<EditOutlined />} size="small" onClick={() => { setEditingCompany(record); form.setFieldsValue({ ...record, subscription_expires: record.subscription_expires ? dayjs(record.subscription_expires) : null }); setModalVisible(true); }} /></Tooltip>
        <Tooltip title="Supprimer"><Button icon={<DeleteOutlined />} size="small" danger onClick={() => handleDelete(record.id)} /></Tooltip>
      </Space>
    )}
  ];

  return (
    <Card title="Gestion des Entreprises" extra={<Button icon={<PlusOutlined />} type="primary" onClick={() => { setEditingCompany(null); form.resetFields(); setModalVisible(true); }}>Nouvelle entreprise</Button>}>
      <Table columns={columns} dataSource={companies} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      
      <Modal title={editingCompany ? 'Modifier l\'entreprise' : 'Nouvelle entreprise'} open={modalVisible} onCancel={() => { setModalVisible(false); setEditingCompany(null); form.resetFields(); }} onOk={form.submit} width={600}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="Nom" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="email" label="Email"><Input type="email" /></Form.Item>
          <Form.Item name="phone" label="Téléphone"><Input /></Form.Item>
          <Form.Item name="address" label="Adresse"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="sector" label="Secteur" rules={[{ required: true }]}>
            <Select>
              <Option value="enterprise">Entreprise</Option>
              <Option value="banking">Banque</Option>
              <Option value="insurance">Assurance</Option>
            </Select>
          </Form.Item>
          <Form.Item name="subscription_tier" label="Abonnement">
            <Select>
              <Option value="free">Gratuit</Option>
              <Option value="premium">Premium</Option>
              <Option value="enterprise">Enterprise</Option>
            </Select>
          </Form.Item>
          <Form.Item name="subscription_expires" label="Expiration abonnement">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="is_active" label="Actif" valuePropName="checked">
            <Select>
              <Option value={true}>Actif</Option>
              <Option value={false}>Inactif</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default CompanyManagement;