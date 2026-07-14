import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, Space, Button, Modal, Form, Input, InputNumber, Select, message, DatePicker, Badge, Tooltip } from 'antd';
import { EyeOutlined, CheckCircleOutlined, CloseCircleOutlined, DeleteOutlined, DollarOutlined } from '@ant-design/icons';
import api from '../../../services/api';

const { Option } = Select;

const PaymentManagement = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
  setLoading(true);
  try {
    const response = await api.get('/admin/payments');
    // S'assurer que les données sont un tableau
    const paymentsData = response.data?.payments || response.data?.data || [];
    setPayments(Array.isArray(paymentsData) ? paymentsData : []);
  } catch (error) {
    console.error('Erreur chargement paiements:', error);
    message.error('Erreur lors du chargement des paiements');
    setPayments([]);
  } finally {
    setLoading(false);
  }
};

  const handleViewDetails = (payment) => {
    setSelectedPayment(payment);
    form.setFieldsValue(payment);
    setModalVisible(true);
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.put(`/admin/payments/${id}/status`, { status });
      message.success('Statut mis à jour');
      fetchPayments();
    } catch (error) {
      message.error('Erreur lors de la mise à jour');
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 80 },
    { title: 'Client', dataIndex: 'client_name', key: 'client_name' },
    { title: 'Montant', dataIndex: 'amount', key: 'amount', render: (amt) => `${amt?.toLocaleString()} €` },
    { title: 'Méthode', dataIndex: 'method', key: 'method', render: (method) => <Tag color="blue">{method}</Tag> },
    { title: 'Statut', dataIndex: 'status', key: 'status', render: (status) => {
      const colors = { pending: 'gold', completed: 'green', failed: 'red', refunded: 'orange' };
      return <Tag color={colors[status] || 'default'}>{status}</Tag>;
    }},
    { title: 'Date', dataIndex: 'created_at', key: 'created_at', render: (date) => new Date(date).toLocaleDateString() },
    { title: 'Actions', key: 'actions', render: (_, record) => (
      <Space>
        <Tooltip title="Voir détails"><Button icon={<EyeOutlined />} size="small" onClick={() => handleViewDetails(record)} /></Tooltip>
        {record.status === 'pending' && (
          <>
            <Tooltip title="Approuver"><Button icon={<CheckCircleOutlined />} size="small" onClick={() => handleUpdateStatus(record.id, 'completed')} style={{ color: '#52c41a' }} /></Tooltip>
            <Tooltip title="Rejeter"><Button icon={<CloseCircleOutlined />} size="small" onClick={() => handleUpdateStatus(record.id, 'failed')} style={{ color: '#ff4d4f' }} /></Tooltip>
          </>
        )}
      </Space>
    )}
  ];

  return (
    <Card title="Gestion des Paiements" extra={<Button icon={<DollarOutlined />} onClick={fetchPayments}>Actualiser</Button>}>
      <Table columns={columns} dataSource={payments} rowKey="id" loading={loading} pagination={{ pageSize: 10 }} />
      
      <Modal title="Détails du paiement" open={modalVisible} onCancel={() => setModalVisible(false)} footer={null} width={600}>
        {selectedPayment && (
          <Form form={form} layout="vertical">
            <Form.Item label="Client" name="client_name"><Input disabled /></Form.Item>
            <Form.Item label="Montant" name="amount"><InputNumber disabled style={{ width: '100%' }} /></Form.Item>
            <Form.Item label="Méthode" name="method"><Input disabled /></Form.Item>
            <Form.Item label="Statut" name="status">
              <Select onChange={(val) => handleUpdateStatus(selectedPayment.id, val)}>
                <Option value="pending">En attente</Option>
                <Option value="completed">Terminé</Option>
                <Option value="failed">Échoué</Option>
                <Option value="refunded">Remboursé</Option>
              </Select>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </Card>
  );
};

export default PaymentManagement;