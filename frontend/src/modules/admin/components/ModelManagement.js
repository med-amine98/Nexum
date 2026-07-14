import React, { useState, useEffect } from 'react';
import { Table, Card, Button, Modal, Form, Input, Select, message, Tag, Space, Tooltip, Switch } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, ApiOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../../../services/api';

const { Option } = Select;

const ModelManagement = () => {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingModel, setEditingModel] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
  setLoading(true);
  try {
    const response = await api.get('/admin/models');
    // S'assurer que les données sont un tableau
    const modelsData = response.data?.models || response.data?.data || response.data;
    setModels(Array.isArray(modelsData) ? modelsData : []);
  } catch (error) {
    console.error('Erreur chargement modèles:', error);
    message.error('Erreur lors du chargement des modèles');
    setModels([]);
  } finally {
    setLoading(false);
  }
};

  const handleSave = async (values) => {
    try {
      if (editingModel) {
        await api.put(`/admin/models/${editingModel.id}`, values);
        message.success('Modèle modifié');
      } else {
        await api.post('/admin/models', values);
        message.success('Modèle créé');
      }
      setModalVisible(false);
      form.resetFields();
      setEditingModel(null);
      fetchModels();
    } catch (error) {
      message.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: 'Supprimer le modèle',
      content: 'Êtes-vous sûr de vouloir supprimer ce modèle ?',
      onOk: async () => {
        try {
          await api.delete(`/admin/models/${id}`);
          message.success('Modèle supprimé');
          fetchModels();
        } catch (error) {
          message.error('Erreur lors de la suppression');
        }
      }
    });
  };

  const columns = [
    { title: 'Nom', dataIndex: 'name', key: 'name' },
    { title: 'Clé', dataIndex: 'key', key: 'key', render: (key) => <code>{key}</code> },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (type) => <Tag color="purple">{type}</Tag> },
    { title: 'Version', dataIndex: 'version', key: 'version' },
    { title: 'Actif', dataIndex: 'is_active', key: 'is_active', render: (active) => <Tag color={active ? 'green' : 'red'}>{active ? 'Actif' : 'Inactif'}</Tag> },
    { title: 'Actions', key: 'actions', render: (_, record) => (
      <Space>
        <Tooltip title="Modifier"><Button icon={<EditOutlined />} size="small" onClick={() => { setEditingModel(record); form.setFieldsValue(record); setModalVisible(true); }} /></Tooltip>
        <Tooltip title="Supprimer"><Button icon={<DeleteOutlined />} size="small" danger onClick={() => handleDelete(record.id)} /></Tooltip>
      </Space>
    )}
  ];

  return (
    <Card title="Gestion des Modèles IA" extra={<Button icon={<PlusOutlined />} type="primary" onClick={() => { setEditingModel(null); form.resetFields(); setModalVisible(true); }}>Nouveau modèle</Button>}>
      <Table columns={columns} dataSource={models} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      
      <Modal title={editingModel ? 'Modifier le modèle' : 'Nouveau modèle'} open={modalVisible} onCancel={() => { setModalVisible(false); setEditingModel(null); form.resetFields(); }} onOk={form.submit} width={500}>
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item name="name" label="Nom" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="key" label="Clé unique" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select>
              <Option value="fraud_detection">Détection de fraude</Option>
              <Option value="credit_scoring">Scoring crédit</Option>
              <Option value="churn_prediction">Prédiction churn</Option>
              <Option value="recommendation">Recommandation</Option>
            </Select>
          </Form.Item>
          <Form.Item name="version" label="Version"><Input /></Form.Item>
          <Form.Item name="is_active" label="Actif" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ModelManagement;