import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Modal, Form, Input, InputNumber, Select, message, Tag, Space, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, DollarOutlined } from '@ant-design/icons';
import api from '../../../services/api';

const { Option } = Select;

const OfferManagement = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
  setLoading(true);
  try {
    const response = await api.get('/admin/offers');
    // S'assurer que les données sont un tableau
    const offersData = response.data?.offers || response.data?.data || response.data;
    setOffers(Array.isArray(offersData) ? offersData : []);
  } catch (error) {
    console.error('Erreur chargement offres:', error);
    message.error('Erreur lors du chargement des offres');
    setOffers([]);
  } finally {
    setLoading(false);
  }
};

  const handleSave = async (values) => {
    try {
      if (editingOffer) {
        await api.put(`/admin/offers/${editingOffer.id}`, values);
        message.success('Offre modifiée');
      } else {
        await api.post('/admin/offers', values);
        message.success('Offre créée');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingOffer(null);
      fetchOffers();
    } catch (error) {
      message.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: 'Supprimer l\'offre',
      content: 'Êtes-vous sûr de vouloir supprimer cette offre ?',
      onOk: async () => {
        try {
          await api.delete(`/admin/offers/${id}`);
          message.success('Offre supprimée');
          fetchOffers();
        } catch (error) {
          message.error('Erreur lors de la suppression');
        }
      }
    });
  };

  const columns = [
    { title: 'Nom', dataIndex: 'name', key: 'name' },
    { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
    { title: 'Prix', dataIndex: 'price', key: 'price', render: (price) => `${price} €` },
    { title: 'Période', dataIndex: 'period', key: 'period', render: (period) => <Tag color="blue">{period}</Tag> },
    { title: 'Statut', dataIndex: 'is_active', key: 'is_active', render: (active) => <Tag color={active ? 'green' : 'red'}>{active ? 'Actif' : 'Inactif'}</Tag> },
    { title: 'Actions', key: 'actions', render: (_, record) => (
      <Space>
        <Tooltip title="Modifier"><Button icon={<EditOutlined />} size="small" onClick={() => { setEditingOffer(record); form.setFieldsValue(record); setModalVisible(true); }} /></Tooltip>
        <Tooltip title="Supprimer"><Button icon={<DeleteOutlined />} size="small" danger onClick={() => handleDelete(record.id)} /></Tooltip>
      </Space>
    )}
  ];

  return (
    <Card title="Gestion des Offres" extra={<Button icon={<PlusOutlined />} type="primary" onClick={() => { setEditingOffer(null); form.resetFields(); setModalVisible(true); }}>Nouvelle offre</Button>}>
      <Table columns={columns} dataSource={offers} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      
      <Modal title={editingOffer ? 'Modifier l\'offre' : 'Nouvelle offre'} open={modalVisible} onCancel={() => { setModalVisible(false); setEditingOffer(null); form.resetFields(); }} onOk={form.submit} width={500}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="Nom" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="description" label="Description"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="price" label="Prix (€)" rules={[{ required: true }]}><InputNumber min={0} style={{ width: '100%' }} /></Form.Item>
          <Form.Item name="period" label="Période" rules={[{ required: true }]}>
            <Select>
              <Option value="monthly">Mensuel</Option>
              <Option value="quarterly">Trimestriel</Option>
              <Option value="yearly">Annuel</Option>
            </Select>
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

export default OfferManagement;