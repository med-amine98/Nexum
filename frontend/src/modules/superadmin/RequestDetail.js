import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Space, Button, Spin,
  Typography, Divider, Steps, message, Modal, Form,
  Input, Select
} from 'antd';
import {
  FileTextOutlined, ArrowLeftOutlined, CheckCircleOutlined,
  DollarOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import { superAdminApi } from '../../services/superadminApi';

const { TextArea } = Input;
const { Option } = Select;

const RequestDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [request, setRequest] = useState(null);
  const [processModal, setProcessModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [processForm] = Form.useForm();
  const [paymentForm] = Form.useForm();

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const fetchRequest = async () => {
    try {
      const response = await superAdminApi.getRequest(id);
      setRequest(response.data);
    } catch (error) {
      message.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const handleProcessRequest = async (values) => {
    try {
      await superAdminApi.processRequest(id, values.status, values.admin_notes);
      message.success('Demande traitée');
      setProcessModal(false);
      fetchRequest();
    } catch (error) {
      message.error('Erreur lors du traitement');
    }
  };

  const handleMarkPaid = async (values) => {
    try {
      await superAdminApi.markRequestPaid(id, values);
      message.success('Paiement marqué');
      setPaymentModal(false);
      fetchRequest();
    } catch (error) {
      message.error('Erreur lors du marquage');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'warning',
      'approved': 'success',
      'rejected': 'error',
      'in_progress': 'processing'
    };
    return colors[status] || 'default';
  };

  const getPaymentStatusColor = (status) => {
    const colors = {
      'paid': 'success',
      'pending': 'warning',
      'failed': 'error',
      'refunded': 'processing'
    };
    return colors[status] || 'default';
  };

  if (loading) return <Spin size="large" />;

  return (
    <div style={{ padding: 24 }}>
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/superadmin/requests')}
        style={{ marginBottom: 16 }}
      >
        Retour
      </Button>

      <Card>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Steps current={
            request?.status === 'pending' ? 0 :
            request?.status === 'approved' ? 1 :
            request?.status === 'in_progress' ? 1 : 2
          } style={{ marginBottom: 24 }}>
            <Steps.Step title="Demande" icon={<FileTextOutlined />} />
            <Steps.Step title="Validation" icon={<CheckCircleOutlined />} />
            <Steps.Step title="Paiement" icon={<DollarOutlined />} />
          </Steps>

          <Descriptions bordered column={2}>
            <Descriptions.Item label="ID">{request?.id}</Descriptions.Item>
            <Descriptions.Item label="Modèle">{request?.model_name}</Descriptions.Item>
            <Descriptions.Item label="Catégorie">{request?.model_category}</Descriptions.Item>
            <Descriptions.Item label="Clé">{request?.model_key}</Descriptions.Item>
            <Descriptions.Item label="Entreprise">{request?.company_name}</Descriptions.Item>
            <Descriptions.Item label="Demandeur">{request?.user_name}</Descriptions.Item>
            <Descriptions.Item label="Statut">
              <Tag color={getStatusColor(request?.status)}>{request?.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Paiement">
              <Tag color={getPaymentStatusColor(request?.payment_status)}>{request?.payment_status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Montant">{request?.payment_amount} €</Descriptions.Item>
            <Descriptions.Item label="Date demande">
              {new Date(request?.requested_at).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Notes" span={2}>
              {request?.notes || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="Notes admin" span={2}>
              {request?.admin_notes || '-'}
            </Descriptions.Item>
          </Descriptions>

          <Divider />

          <Space>
            {request?.status === 'pending' && (
              <Button type="primary" onClick={() => setProcessModal(true)}>
                Traiter la demande
              </Button>
            )}
            {request?.payment_status !== 'paid' && (
              <Button onClick={() => setPaymentModal(true)}>
                Marquer comme payé
              </Button>
            )}
          </Space>
        </Space>
      </Card>

      <Modal
        title="Traiter la demande"
        open={processModal}
        onCancel={() => setProcessModal(false)}
        footer={null}
      >
        <Form form={processForm} layout="vertical" onFinish={handleProcessRequest}>
          <Form.Item name="status" label="Décision" rules={[{ required: true }]}>
            <Select>
              <Option value="approved">Approuver</Option>
              <Option value="rejected">Rejeter</Option>
            </Select>
          </Form.Item>
          <Form.Item name="admin_notes" label="Notes">
            <TextArea rows={4} />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setProcessModal(false)}>Annuler</Button>
              <Button type="primary" htmlType="submit">Confirmer</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Marquer le paiement"
        open={paymentModal}
        onCancel={() => setPaymentModal(false)}
        footer={null}
      >
        <Form form={paymentForm} layout="vertical" onFinish={handleMarkPaid}>
          <Form.Item name="amount" label="Montant (€)" rules={[{ required: true }]}>
            <Input type="number" />
          </Form.Item>
          <Form.Item name="payment_method" label="Mode de paiement" rules={[{ required: true }]}>
            <Select>
              <Option value="card">Carte bancaire</Option>
              <Option value="transfer">Virement</Option>
              <Option value="cash">Espèces</Option>
              <Option value="check">Chèque</Option>
            </Select>
          </Form.Item>
          <Form.Item name="transaction_id" label="ID Transaction">
            <Input />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setPaymentModal(false)}>Annuler</Button>
              <Button type="primary" htmlType="submit">Confirmer</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default RequestDetail;