import React, { useState, useEffect } from 'react';
import {
  Card, Table, Button, Space, Tag, Modal, message,
  Select, Tooltip, Badge, Descriptions, Drawer,
  Input, Form, Steps, Statistic, Row, Col, Divider,Typography
} from 'antd';
import {
  FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined,
  EyeOutlined, DollarOutlined, CreditCardOutlined,
  BankOutlined, WalletOutlined, ArrowRightOutlined,
  ClockCircleOutlined, RiseOutlined, FallOutlined
} from '@ant-design/icons';
import { superAdminApi } from '../../services/superadminApi';
import './SuperAdmin.css';

const { Text } = Typography;
const { Option } = Select;
const { Step } = Steps;
const { TextArea } = Input;

const ModelRequestsManagement = () => {
  const [loading, setLoading] = useState(false);
  const [requests, setRequests] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [processModal, setProcessModal] = useState(false);
  const [processForm] = Form.useForm();
  const [paymentForm] = Form.useForm();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async (status = filterStatus) => {
    setLoading(true);
    try {
      const response = await superAdminApi.getRequests(status !== 'all' ? status : null);
      setRequests(response.data.requests || []);
    } catch (error) {
      message.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (value) => {
    setFilterStatus(value);
    fetchRequests(value);
  };

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setDrawerVisible(true);
  };

  const handleProcessRequest = (request) => {
    setSelectedRequest(request);
    setProcessModal(true);
  };

  const submitProcessRequest = async (values) => {
    try {
      await superAdminApi.processRequest(
        selectedRequest.id,
        values.status,
        values.admin_notes
      );
      message.success(`Demande ${values.status === 'approved' ? 'approuvée' : 'rejetée'}`);
      setProcessModal(false);
      fetchRequests();
    } catch (error) {
      message.error('Erreur lors du traitement');
    }
  };

  const handleMarkPaid = (request) => {
    setSelectedRequest(request);
    paymentForm.setFieldsValue({
      amount: request.payment_amount || 0,
      payment_method: 'card'
    });
    setPaymentModal(true);
  };

  const submitPayment = async (values) => {
    try {
      await superAdminApi.markRequestPaid(selectedRequest.id, values);
      message.success('Paiement marqué comme effectué');
      setPaymentModal(false);
      fetchRequests();
    } catch (error) {
      message.error('Erreur lors du marquage du paiement');
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

  const columns = [
    {
      title: 'Modèle',
      dataIndex: 'model_name',
      key: 'model_name',
      render: (text, record) => (
        <Space>
          <FileTextOutlined />
          <div>
            <div style={{ fontWeight: 'bold' }}>{text}</div>
            <Tag color="processing">{record.model_category}</Tag>
          </div>
        </Space>
      )
    },
    {
      title: 'Entreprise',
      dataIndex: 'company_name',
      key: 'company_name',
    },
    {
      title: 'Demandeur',
      dataIndex: 'user_name',
      key: 'user_name',
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Paiement',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (status, record) => (
        <Space direction="vertical" size={2}>
          <Tag color={getPaymentStatusColor(status)}>
            {status === 'paid' ? '✅ Payé' : '⏳ En attente'}
          </Tag>
          {record.payment_amount > 0 && (
            <Text type="secondary">{record.payment_amount} €</Text>
          )}
        </Space>
      )
    },
    {
      title: 'Date',
      dataIndex: 'requested_at',
      key: 'requested_at',
      render: (date) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Voir détails">
            <Button icon={<EyeOutlined />} size="small" onClick={() => handleViewRequest(record)} />
          </Tooltip>
          {record.status === 'pending' && (
            <>
              <Tooltip title="Traiter la demande">
                <Button 
                  icon={<CheckCircleOutlined />} 
                  size="small" 
                  type="primary"
                  onClick={() => handleProcessRequest(record)}
                />
              </Tooltip>
              {record.payment_status !== 'paid' && (
                <Tooltip title="Marquer comme payé">
                  <Button 
                    icon={<DollarOutlined />} 
                    size="small" 
                    type="primary"
                    ghost
                    onClick={() => handleMarkPaid(record)}
                  />
                </Tooltip>
              )}
            </>
          )}
        </Space>
      )
    }
  ];

  const stats = {
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    rejected: requests.filter(r => r.status === 'rejected').length,
    paid: requests.filter(r => r.payment_status === 'paid').length
  };

  return (
    <div className="superadmin-page">
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Total demandes" value={stats.total} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="En attente" value={stats.pending} valueStyle={{ color: '#faad14' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Approuvées" value={stats.approved} valueStyle={{ color: '#52c41a' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small">
            <Statistic title="Payées" value={stats.paid} valueStyle={{ color: '#1890ff' }} />
          </Card>
        </Col>
      </Row>

      <Card
        title={
          <Space>
            <FileTextOutlined />
            <span>Gestion des Demandes de Modèles</span>
          </Space>
        }
        extra={
          <Space>
            <Select value={filterStatus} onChange={handleStatusChange} style={{ width: 150 }}>
              <Option value="all">Tous les statuts</Option>
              <Option value="pending">En attente</Option>
              <Option value="approved">Approuvées</Option>
              <Option value="rejected">Rejetées</Option>
              <Option value="in_progress">En cours</Option>
            </Select>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={requests}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      {/* Drawer détails demande */}
      <Drawer
        title="Détails de la demande"
        placement="right"
        width={600}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedRequest && (
          <>
            <Steps current={
              selectedRequest.status === 'pending' ? 0 :
              selectedRequest.status === 'approved' ? 1 :
              selectedRequest.status === 'in_progress' ? 1 : 2
            } size="small" style={{ marginBottom: 24 }}>
              <Step title="Demande" icon={<FileTextOutlined />} />
              <Step title="Validation" icon={<CheckCircleOutlined />} />
              <Step title="Paiement" icon={<DollarOutlined />} />
            </Steps>

            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="ID">{selectedRequest.id}</Descriptions.Item>
              <Descriptions.Item label="Modèle">{selectedRequest.model_name}</Descriptions.Item>
              <Descriptions.Item label="Catégorie">{selectedRequest.model_category}</Descriptions.Item>
              <Descriptions.Item label="Clé">{selectedRequest.model_key}</Descriptions.Item>
              <Descriptions.Item label="Entreprise">{selectedRequest.company_name}</Descriptions.Item>
              <Descriptions.Item label="Demandeur">{selectedRequest.user_name}</Descriptions.Item>
              <Descriptions.Item label="Statut">
                <Tag color={getStatusColor(selectedRequest.status)}>
                  {selectedRequest.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Paiement">
                <Tag color={getPaymentStatusColor(selectedRequest.payment_status)}>
                  {selectedRequest.payment_status}
                </Tag>
              </Descriptions.Item>
              {selectedRequest.payment_amount > 0 && (
                <Descriptions.Item label="Montant">
                  {selectedRequest.payment_amount} €
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Notes">
                {selectedRequest.notes || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Notes admin">
                {selectedRequest.admin_notes || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="Date demande">
                {new Date(selectedRequest.requested_at).toLocaleString()}
              </Descriptions.Item>
              {selectedRequest.processed_at && (
                <Descriptions.Item label="Date traitement">
                  {new Date(selectedRequest.processed_at).toLocaleString()}
                </Descriptions.Item>
              )}
              {selectedRequest.approved_at && (
                <Descriptions.Item label="Date approbation">
                  {new Date(selectedRequest.approved_at).toLocaleString()}
                </Descriptions.Item>
              )}
            </Descriptions>
          </>
        )}
      </Drawer>

      {/* Modal traitement demande */}
      <Modal
        title="Traiter la demande"
        open={processModal}
        onCancel={() => setProcessModal(false)}
        footer={null}
      >
        <Form form={processForm} layout="vertical" onFinish={submitProcessRequest}>
          <Form.Item
            name="status"
            label="Décision"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="approved">Approuver</Option>
              <Option value="rejected">Rejeter</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="admin_notes"
            label="Notes (optionnel)"
          >
            <TextArea rows={4} placeholder="Commentaire sur la décision..." />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setProcessModal(false)}>Annuler</Button>
              <Button type="primary" htmlType="submit">
                Confirmer
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal paiement */}
      <Modal
        title="Marquer le paiement"
        open={paymentModal}
        onCancel={() => setPaymentModal(false)}
        footer={null}
      >
        <Form form={paymentForm} layout="vertical" onFinish={submitPayment}>
          <Form.Item
            name="amount"
            label="Montant (€)"
            rules={[{ required: true, type: 'number', min: 0 }]}
          >
            <Input type="number" prefix={<DollarOutlined />} />
          </Form.Item>
          <Form.Item
            name="payment_method"
            label="Mode de paiement"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="card">Carte bancaire</Option>
              <Option value="transfer">Virement</Option>
              <Option value="cash">Espèces</Option>
              <Option value="check">Chèque</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="transaction_id"
            label="ID Transaction"
          >
            <Input placeholder="Optionnel" />
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setPaymentModal(false)}>Annuler</Button>
              <Button type="primary" htmlType="submit">
                Confirmer le paiement
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ModelRequestsManagement;