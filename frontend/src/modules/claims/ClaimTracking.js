// src/modules/claims/ClaimTracking.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Card, Table, Tag, Button, Space, message,
  Statistic, Row, Col, Spin, Typography, Select, Empty, Result,
  Steps, Timeline, Progress, Descriptions, Badge, Alert,
  Modal, List, Avatar, Rate, Upload, Input, Divider
} from 'antd';
import { 
  FileTextOutlined, SyncOutlined, CheckCircleOutlined, 
  ClockCircleOutlined, EyeOutlined, HistoryOutlined,
  CarOutlined, HomeOutlined, HeartOutlined, ToolOutlined,
  SafetyOutlined, TeamOutlined, MessageOutlined, PhoneOutlined,
  BellOutlined, StarOutlined, DownloadOutlined, PlusOutlined,
  UserOutlined, CalendarOutlined, DollarOutlined, CloseCircleOutlined,
  InfoCircleOutlined, ReloadOutlined, SearchOutlined, SendOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';
import './ClaimTracking.css';

const { Title, Text } = Typography;
const { Step } = Steps;
const { TextArea } = Input;
const { Option } = Select;

dayjs.extend(relativeTime);
dayjs.locale('fr');

// Configuration des types de sinistres
const CLAIM_TYPES = {
  accident: { name: 'Accident automobile', icon: <CarOutlined />, color: '#ff4d4f', bg: '#fff1f0' },
  habitation: { name: 'Sinistre habitation', icon: <HomeOutlined />, color: '#1890ff', bg: '#e6f7ff' },
  sante: { name: 'Santé', icon: <HeartOutlined />, color: '#52c41a', bg: '#f6ffed' },
  agricole: { name: 'Sinistre agricole', icon: <ToolOutlined />, color: '#faad14', bg: '#fffbe6' }
};

// Configuration des statuts
const STATUS_CONFIG = {
  pending: { color: 'orange', text: 'En attente', icon: <ClockCircleOutlined /> },
  analyzing: { color: 'blue', text: 'En analyse', icon: <SyncOutlined /> },
  expert_assigned: { color: 'purple', text: 'Expert assigné', icon: <UserOutlined /> },
  approved: { color: 'green', text: 'Approuvé', icon: <CheckCircleOutlined /> },
  paid: { color: 'green', text: 'Indemnisé', icon: <DollarOutlined /> },
  rejected: { color: 'red', text: 'Rejeté', icon: <CloseCircleOutlined /> }
};

const ClaimTracking = () => {
  const { claimId } = useParams();
  const navigate = useNavigate();
  
  // États pour la liste
  const [claimsList, setClaimsList] = useState([]);
  const [claimsStats, setClaimsStats] = useState({ total: 0, pending: 0, approved: 0, total_amount: 0 });
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loadingClaims, setLoadingClaims] = useState(false);
  
  // États pour le détail
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claim, setClaim] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [estimatedCompletion, setEstimatedCompletion] = useState(null);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackValue, setFeedbackValue] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [documents, setDocuments] = useState([]);
  const [expertRating, setExpertRating] = useState(0);

  // Charger la liste des sinistres
  const loadClaimsList = useCallback(async () => {
    setLoadingClaims(true);
    try {
      const response = await api.get('/claims/history');
      
      // La réponse est directement un tableau
      let claims = [];
      if (Array.isArray(response)) {
        claims = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        claims = response.data;
      } else if (response && response.claims && Array.isArray(response.claims)) {
        claims = response.claims;
      } else {
        console.warn('⚠️ Structure inattendue:', response);
        claims = [];
      }
      
      
      setClaimsList(claims);
      
      const stats = {
        total: claims.length,
        pending: claims.filter(c => c && ['pending', 'analyzing'].includes(c.status)).length,
        approved: claims.filter(c => c && ['approved', 'paid'].includes(c.status)).length,
        total_amount: claims.reduce((sum, c) => sum + (c?.amount || 0), 0)
      };
      setClaimsStats(stats);
      
    } catch (error) {
      console.error('❌ Erreur:', error);
      message.error('Erreur lors du chargement des sinistres');
    } finally {
      setLoadingClaims(false);
    }
  }, []);

  // Charger le détail d'un sinistre
  const loadClaimDetail = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(`/claims/${claimId}/tracking`);
      
      const claimData = response.data || response;
      setClaim(claimData);
      setTimeline(claimData.steps || []);
      setEstimatedCompletion(claimData.estimated_completion);
      setNotifications(claimData.notifications || []);
      
      const [docsRes, msgsRes] = await Promise.all([
        api.get(`/claims/${claimId}/documents`).catch(() => ({ data: [] })),
        api.get(`/claims/${claimId}/messages`).catch(() => ({ data: [] }))
      ]);
      setDocuments(docsRes.data || []);
      setChatMessages(msgsRes.data || []);
      
    } catch (error) {
      console.error('Erreur:', error);
      if (error.response?.status === 404) {
        message.error('Sinistre non trouvé');
        navigate('/claims/tracking-list');
      }
    } finally {
      setLoading(false);
    }
  }, [claimId, navigate]);

  useEffect(() => {
    if (claimId && claimId !== 'undefined') {
      loadClaimDetail();
    } else {
      loadClaimsList();
    }
  }, [claimId, loadClaimDetail, loadClaimsList]);

  // Filtrer les sinistres
  const filteredClaims = claimsList.filter(claim => {
    if (!claim) return false;
    if (filterType !== 'all' && claim.claim_type !== filterType) return false;
    if (filterStatus !== 'all') {
      if (filterStatus === 'pending' && !['pending', 'analyzing'].includes(claim.status)) return false;
      if (filterStatus === 'approved' && !['approved', 'paid'].includes(claim.status)) return false;
      if (claim.status !== filterStatus) return false;
    }
    return true;
  });

  // Colonnes du tableau
  const columns = [
    {
      title: 'N° Sinistre',
      dataIndex: 'claim_number',
      key: 'claim_number',
      width: 180,
      render: (text, record) => {
        return <Tag color="blue" style={{ fontWeight: 'bold' }}>{text || record?.claim_number || 'N/A'}</Tag>;
      }
    },
    {
      title: 'Type',
      dataIndex: 'claim_type',
      key: 'claim_type',
      width: 160,
      render: (type) => {
        const config = CLAIM_TYPES[type] || { name: type || 'Inconnu', icon: <FileTextOutlined />, color: '#666' };
        return <Tag color={config.color} icon={config.icon} style={{ borderRadius: 20 }}>{config.name}</Tag>;
      }
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (date) => date ? dayjs(date).format('DD/MM/YYYY') : 'N/A'
    },
    {
      title: 'Montant',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (amount) => <Text strong style={{ color: '#52c41a' }}>{(amount || 0).toLocaleString()}€</Text>
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status) => {
        const config = STATUS_CONFIG[status] || { color: 'default', text: status || 'Inconnu', icon: <InfoCircleOutlined /> };
        return <Tag color={config.color} icon={config.icon} style={{ borderRadius: 20 }}>{config.text}</Tag>;
      }
    },
    {
      title: 'Action',
      key: 'action',
      width: 100,
      render: (_, record) => (
        <Button type="primary" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/claims/tracking/${record.id}`)}>
          Suivre
        </Button>
      )
    }
  ];

  // ==================== RENDU LISTE ====================
  if (!claimId || claimId === 'undefined') {
    
    return (
      <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
        {/* En-tête */}
        <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: 24, padding: '32px', marginBottom: 32, color: 'white' }}>
          <Row align="middle" justify="space-between">
            <Col>
              <Space size="large">
                <div style={{ width: 70, height: 70, background: 'rgba(255,255,255,0.2)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <HistoryOutlined style={{ fontSize: 36 }} />
                </div>
                <div>
                  <Title level={2} style={{ margin: 0, color: 'white' }}>Mes sinistres</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.8)' }}>Suivez l'évolution de vos déclarations</Text>
                </div>
              </Space>
            </Col>
            <Col>
              <Button icon={<ReloadOutlined />} onClick={loadClaimsList} loading={loadingClaims} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}>
                Rafraîchir
              </Button>
            </Col>
          </Row>
        </div>

        {/* Statistiques */}
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: 20, textAlign: 'center' }} hoverable>
              <Statistic title="Total des sinistres" value={claimsStats.total} prefix={<FileTextOutlined style={{ color: '#1890ff' }} />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: 20, textAlign: 'center' }} hoverable>
              <Statistic title="En cours" value={claimsStats.pending} prefix={<SyncOutlined style={{ color: '#faad14' }} />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: 20, textAlign: 'center' }} hoverable>
              <Statistic title="Approuvés" value={claimsStats.approved} prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: 20, textAlign: 'center' }} hoverable>
              <Statistic title="Montant total" value={claimsStats.total_amount} prefix="€" />
            </Card>
          </Col>
        </Row>

        {/* Tableau */}
        <Card style={{ borderRadius: 24, marginTop: 24 }} 
          title="Liste de mes sinistres"
          extra={
            <Space>
              <Select value={filterType} onChange={setFilterType} style={{ width: 150 }} placeholder="Type" variant="borderless">
                <Option value="all">Tous les types</Option>
                <Option value="accident">🚗 Accident</Option>
                <Option value="habitation">🏠 Habitation</Option>
                <Option value="sante">🩺 Santé</Option>
                <Option value="agricole">🌾 Agricole</Option>
              </Select>
              <Select value={filterStatus} onChange={setFilterStatus} style={{ width: 130 }} placeholder="Statut" variant="borderless">
                <Option value="all">Tous statuts</Option>
                <Option value="pending">⏳ En attente</Option>
                <Option value="approved">✅ Approuvés</Option>
              </Select>
            </Space>
          }>
          {loadingClaims ? (
            <div style={{ textAlign: 'center', padding: 50 }}>
              <Spin size="large" tip="Chargement..." ><div/></Spin>
            </div>
          ) : filteredClaims.length === 0 ? (
            <Empty description="Aucun sinistre trouvé" style={{ padding: 50 }}>
              <Button type="primary" onClick={() => navigate('/claims/declaration')}>Déclarer un sinistre</Button>
            </Empty>
          ) : (
            <Table 
              columns={columns} 
              dataSource={filteredClaims} 
              rowKey={(record) => record.id || Math.random().toString()}
              pagination={{ pageSize: 10, showTotal: (total) => `${total} sinistres` }}
            />
          )}
        </Card>
      </div>
    );
  }

  // ==================== RENDU DÉTAIL ====================
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Chargement..." ><div/></Spin>
      </div>
    );
  }

  if (!claim) {
    return (
      <div style={{ padding: 50, textAlign: 'center' }}>
        <Result status="404" title="Sinistre non trouvé" />
      </div>
    );
  }

  const claimTypeConfig = CLAIM_TYPES[claim.claim_type] || CLAIM_TYPES.accident;
  const currentStatus = STATUS_CONFIG[claim.status] || STATUS_CONFIG.pending;

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ background: `linear-gradient(135deg, ${claimTypeConfig.color} 0%, '#ffffff' 100%)`, borderRadius: 24, padding: '32px', marginBottom: 32, color: 'white' }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="large">
              <div style={{ width: 70, height: 70, background: 'rgba(255,255,255,0.2)', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {claimTypeConfig.icon}
              </div>
              <div>
                <Title level={2} style={{ margin: 0, color: 'white' }}>Suivi de Sinistre</Title>
                <Text style={{ color: 'rgba(255,255,255,0.9)' }}>{claim.claim_number} • {claimTypeConfig.name}</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Tag color={currentStatus.color} icon={currentStatus.icon} style={{ borderRadius: 20 }}>{currentStatus.text}</Tag>
              <Button icon={<ReloadOutlined />} onClick={loadClaimDetail} loading={refreshing} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white' }}>Actualiser</Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card style={{ borderRadius: 24, marginBottom: 24 }}>
            <Steps current={claim.current_step || 0}>
              <Step title="Déclaration" icon={<FileTextOutlined />} />
              <Step title="Analyse" icon={<SearchOutlined />} />
              <Step title="Expertise" icon={<UserOutlined />} />
              <Step title="Indemnisation" icon={<DollarOutlined />} />
            </Steps>
            <Divider />
            <Alert message="Estimation des délais" description={
              <div>
                <Statistic title="Progression" value={estimatedCompletion?.progress || 0} suffix="%" />
                <Progress percent={estimatedCompletion?.progress || 0} strokeColor={claimTypeConfig.color} />
                <Text type="secondary">Prochaine étape: {estimatedCompletion?.next_step || 'Finalisation'}</Text>
              </div>
            } type="info" showIcon style={{ borderRadius: 16 }} />
            
            <Divider />
            <Title level={5}>Chronologie</Title>
            <Timeline>
              {timeline.map((event, idx) => (
                <Timeline.Item key={idx} color={event.status === 'completed' ? 'green' : 'blue'}>
                  <Text strong>{event.title}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>{dayjs(event.date).format('DD/MM/YYYY HH:mm')}</Text>
                  <br />
                  <Text>{event.description}</Text>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card style={{ borderRadius: 24, marginBottom: 24 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button icon={<MessageOutlined />} block onClick={() => setChatVisible(true)}>Chat avec un conseiller</Button>
              <Button icon={<PhoneOutlined />} block>Appeler le support</Button>
            </Space>
          </Card>
        </Col>
      </Row>

      <Modal title="Chat avec l'expert" open={chatVisible} onCancel={() => setChatVisible(false)} footer={null} width={500}>
        <div style={{ height: 400, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'auto', marginBottom: 16 }}>
            {chatMessages.length === 0 ? (
              <Empty description="Aucun message" />
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} style={{ textAlign: msg.role === 'user' ? 'right' : 'left', marginBottom: 8 }}>
                  <div style={{ display: 'inline-block', background: msg.role === 'user' ? '#1890ff' : '#f0f0f0', color: msg.role === 'user' ? 'white' : 'black', padding: '8px 12px', borderRadius: 16, maxWidth: '80%' }}>
                    {msg.content}
                    <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>{dayjs(msg.time).format('HH:mm')}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <TextArea rows={2} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Votre message..." />
            <Button type="primary" icon={<SendOutlined />}>Envoyer</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ClaimTracking;