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
  InfoCircleOutlined, ReloadOutlined, SearchOutlined, SendOutlined,
  WarningOutlined
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
  pending: { color: 'orange', text: 'En attente', icon: <ClockCircleOutlined />, step: 0 },
  analyzing: { color: 'blue', text: 'En analyse', icon: <SyncOutlined />, step: 1 },
  expert_assigned: { color: 'purple', text: 'Expert assigné', icon: <UserOutlined />, step: 2 },
  approved: { color: 'green', text: 'Approuvé', icon: <CheckCircleOutlined />, step: 3 },
  paid: { color: 'green', text: 'Indemnisé', icon: <DollarOutlined />, step: 4 },
  rejected: { color: 'red', text: 'Rejeté', icon: <CloseCircleOutlined />, step: 4 }
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
  const [errorMessage, setErrorMessage] = useState(null);
  
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
    setErrorMessage(null);
    try {
      const response = await api.get('/claims/history');
      
      let claims = [];
      if (Array.isArray(response)) {
        claims = response;
      } else if (response && response.data && Array.isArray(response.data)) {
        claims = response.data;
      } else if (response && response.claims && Array.isArray(response.claims)) {
        claims = response.claims;
      } else {
        claims = [];
      }
      
      
      if (claims.length === 0) {
        setErrorMessage("Aucun sinistre trouvé. Commencez par déclarer un sinistre.");
      }
      
      setClaimsList(claims);
      
      const stats = {
        total: claims.length,
        pending: claims.filter(c => c && ['pending', 'analyzing', 'expert_assigned'].includes(c.status)).length,
        approved: claims.filter(c => c && ['approved', 'paid'].includes(c.status)).length,
        total_amount: claims.reduce((sum, c) => sum + (c?.amount || 0), 0)
      };
      setClaimsStats(stats);
      
    } catch (error) {
      console.error('❌ Erreur:', error);
      setErrorMessage("Impossible de charger les sinistres. Vérifiez votre connexion.");
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

  // Forcer l'avancement manuel (admin)
  const forceAdvance = async () => {
    setRefreshing(true);
    try {
      await api.post('/claims/force-advance');
      message.success('Avancement des statuts effectué');
      await loadClaimsList();
      if (claimId && claimId !== 'undefined') {
        await loadClaimDetail();
      }
    } catch (error) {
      console.error('Erreur:', error);
      message.error('Erreur lors de l\'avancement');
    } finally {
      setRefreshing(false);
    }
  };

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
      if (filterStatus === 'pending' && !['pending', 'analyzing', 'expert_assigned'].includes(claim.status)) return false;
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
      render: (text) => <Tag color="blue" style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{text || 'N/A'}</Tag>
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
      <div style={{ padding: 24, background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 30%, #0d0d0d 100%)', minHeight: '100vh' }}>
        {/* En-tête */}
        <div style={{ 
          background: 'linear-gradient(135deg, #1a1a3e 0%, #2d1b69 50%, #1a1a3e 100%)',
          borderRadius: 24, 
          padding: '32px', 
          marginBottom: 32, 
          color: 'white',
          border: '1px solid rgba(102, 126, 234, 0.3)',
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.15)'
        }}>
          <Row align="middle" justify="space-between">
            <Col>
              <Space size="large">
                <div style={{ 
                  width: 70, 
                  height: 70, 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 24, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)'
                }}>
                  <HistoryOutlined style={{ fontSize: 36 }} />
                </div>
                <div>
                  <Title level={2} style={{ margin: 0, color: 'white', textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>Mes sinistres</Title>
                  <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Suivez l'évolution de vos déclarations</Text>
                </div>
              </Space>
            </Col>
            <Col>
              <Space>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={loadClaimsList} 
                  loading={loadingClaims} 
                  style={{ 
                    background: 'rgba(255,255,255,0.08)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  Rafraîchir
                </Button>
                <Button 
                  icon={<SyncOutlined />} 
                  onClick={forceAdvance} 
                  loading={refreshing} 
                  style={{ 
                    background: 'rgba(255,255,255,0.08)', 
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'white',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  Avancer statuts
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Message d'information */}
        {errorMessage && (
          <Alert
            message="Information"
            description={errorMessage}
            type="info"
            showIcon
            icon={<InfoCircleOutlined />}
            style={{ 
              marginBottom: 24, 
              borderRadius: 16,
              background: 'rgba(24, 144, 255, 0.12)',
              border: '1px solid rgba(24, 144, 255, 0.25)',
              color: '#e8e8e8'
            }}
            action={
              <Button size="small" type="primary" onClick={() => navigate('/claims/declaration')}>
                Déclarer un sinistre
              </Button>
            }
          />
        )}

        {/* Statistiques */}
        <Row gutter={[24, 24]}>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ 
              borderRadius: 20, 
              textAlign: 'center',
              background: 'rgba(20, 20, 20, 0.95)',
              border: '1px solid #2a2a2a',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
            }} hoverable>
              <Statistic 
                title={<span style={{ color: '#888' }}>Total des sinistres</span>}
                value={claimsStats.total} 
                prefix={<FileTextOutlined style={{ color: '#1890ff' }} />} 
                valueStyle={{ color: '#1890ff' }}
              />
              <Text style={{ color: '#666', fontSize: 12 }}>Nombre total de déclarations</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ 
              borderRadius: 20, 
              textAlign: 'center',
              background: 'rgba(20, 20, 20, 0.95)',
              border: '1px solid #2a2a2a',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
            }} hoverable>
              <Statistic 
                title={<span style={{ color: '#888' }}>En cours</span>}
                value={claimsStats.pending} 
                prefix={<SyncOutlined style={{ color: '#faad14' }} />} 
                valueStyle={{ color: '#faad14' }}
              />
              <Text style={{ color: '#666', fontSize: 12 }}>Dossiers en traitement</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ 
              borderRadius: 20, 
              textAlign: 'center',
              background: 'rgba(20, 20, 20, 0.95)',
              border: '1px solid #2a2a2a',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
            }} hoverable>
              <Statistic 
                title={<span style={{ color: '#888' }}>Approuvés</span>}
                value={claimsStats.approved} 
                prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />} 
                valueStyle={{ color: '#52c41a' }}
              />
              <Text style={{ color: '#666', fontSize: 12 }}>Dossiers acceptés</Text>
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ 
              borderRadius: 20, 
              textAlign: 'center',
              background: 'rgba(20, 20, 20, 0.95)',
              border: '1px solid #2a2a2a',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
            }} hoverable>
              <Statistic 
                title={<span style={{ color: '#888' }}>Montant total</span>}
                value={claimsStats.total_amount} 
                prefix="€" 
                valueStyle={{ color: '#52c41a' }}
              />
              <Text style={{ color: '#666', fontSize: 12 }}>Indemnisations totales</Text>
            </Card>
          </Col>
        </Row>

        {/* Tableau */}
        <Card style={{ 
          borderRadius: 24, 
          marginTop: 24,
          background: 'rgba(20, 20, 20, 0.95)',
          border: '1px solid #2a2a2a',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
        }}
          title={
            <Space>
              <FileTextOutlined style={{ color: '#e8e8e8' }} />
              <span style={{ color: '#e8e8e8' }}>Liste de mes sinistres</span>
              {claimsStats.total > 0 && <Tag color="blue">{claimsStats.total} dossier(s)</Tag>}
            </Space>
          }
          headStyle={{ borderBottom: '1px solid #2a2a2a' }}
          extra={
            <Space>
              <Select 
                value={filterType} 
                onChange={setFilterType} 
                style={{ width: 150 }} 
                placeholder="Type" 
                variant="borderless"
                dropdownStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
              >
                <Option value="all" style={{ color: '#e8e8e8' }}>📋 Tous les types</Option>
                <Option value="accident" style={{ color: '#e8e8e8' }}>🚗 Accident</Option>
                <Option value="habitation" style={{ color: '#e8e8e8' }}>🏠 Habitation</Option>
                <Option value="sante" style={{ color: '#e8e8e8' }}>🩺 Santé</Option>
                <Option value="agricole" style={{ color: '#e8e8e8' }}>🌾 Agricole</Option>
              </Select>
              <Select 
                value={filterStatus} 
                onChange={setFilterStatus} 
                style={{ width: 130 }} 
                placeholder="Statut" 
                variant="borderless"
                dropdownStyle={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}
              >
                <Option value="all" style={{ color: '#e8e8e8' }}>📊 Tous statuts</Option>
                <Option value="pending" style={{ color: '#e8e8e8' }}>⏳ En attente</Option>
                <Option value="approved" style={{ color: '#e8e8e8' }}>✅ Approuvés</Option>
              </Select>
            </Space>
          }>
          {loadingClaims ? (
            <div style={{ textAlign: 'center', padding: 50 }}>
              <Spin size="large" tip="Chargement de vos sinistres..." ><div/></Spin>
            </div>
          ) : filteredClaims.length === 0 && claimsStats.total > 0 ? (
            <Empty 
              description={<span style={{ color: '#888' }}>Aucun sinistre ne correspond aux filtres sélectionnés</span>}
              style={{ padding: 50 }}
            >
              <Button onClick={() => { setFilterType('all'); setFilterStatus('all'); }}>
                Réinitialiser les filtres
              </Button>
            </Empty>
          ) : filteredClaims.length === 0 ? (
            <Empty 
              description={<span style={{ color: '#888' }}>Vous n'avez aucun sinistre déclaré</span>}
              style={{ padding: 50 }}
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Button type="primary" onClick={() => navigate('/claims/declaration')}>
                + Déclarer un sinistre
              </Button>
            </Empty>
          ) : (
            <Table 
              columns={columns} 
              dataSource={filteredClaims} 
              rowKey={(record) => record.id}
              className="dark-table"
              pagination={{ 
                pageSize: 10, 
                showSizeChanger: true, 
                showTotal: (total) => `${total} sinistre(s)`,
                pageSizeOptions: ['10', '20', '50']
              }}
            />
          )}
        </Card>
      </div>
    );
  }

  // ==================== RENDU DÉTAIL ====================
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0a' }}>
        <Spin size="large" tip="Chargement de votre dossier..." ><div/></Spin>
      </div>
    );
  }

  if (!claim) {
    return (
      <div style={{ padding: 50, textAlign: 'center', background: '#0a0a0a', minHeight: '100vh' }}>
        <Result 
          status="404" 
          title={<span style={{ color: '#e8e8e8' }}>Sinistre non trouvé</span>}
          subTitle={<span style={{ color: '#888' }}>Le sinistre que vous recherchez n'existe pas ou a été supprimé.</span>}
          extra={
            <Button type="primary" onClick={() => navigate('/claims/tracking-list')}>
              Retour à la liste
            </Button>
          }
        />
      </div>
    );
  }

  const claimTypeConfig = CLAIM_TYPES[claim.claim_type] || CLAIM_TYPES.accident;
  const currentStatus = STATUS_CONFIG[claim.status] || STATUS_CONFIG.pending;
  const currentStep = currentStatus.step;

  return (
    <div style={{ padding: 24, background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 30%, #0d0d0d 100%)', minHeight: '100vh' }}>
      <div style={{ 
        background: `linear-gradient(135deg, ${claimTypeConfig.color}dd 0%, ${claimTypeConfig.color}55 50%, #0d0d0d 100%)`,
        borderRadius: 24, 
        padding: '32px', 
        marginBottom: 32, 
        color: 'white',
        border: `1px solid ${claimTypeConfig.color}44`,
        boxShadow: `0 8px 32px ${claimTypeConfig.color}22`
      }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="large">
              <div style={{ 
                width: 70, 
                height: 70, 
                background: `linear-gradient(135deg, ${claimTypeConfig.color} 0%, ${claimTypeConfig.color}88 100%)`,
                borderRadius: 24, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: `0 4px 20px ${claimTypeConfig.color}44`
              }}>
                {claimTypeConfig.icon}
              </div>
              <div>
                <Title level={2} style={{ margin: 0, color: 'white', textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>Suivi de Sinistre</Title>
                <Text style={{ color: 'rgba(255,255,255,0.7)' }}>{claim.claim_number} • {claimTypeConfig.name}</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Tag color={currentStatus.color} icon={currentStatus.icon} style={{ borderRadius: 20, padding: '4px 12px' }}>{currentStatus.text}</Tag>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={loadClaimDetail} 
                loading={refreshing} 
                style={{ 
                  background: 'rgba(255,255,255,0.08)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  backdropFilter: 'blur(10px)'
                }}
              >
                Actualiser
              </Button>
              <Button 
                icon={<HistoryOutlined />} 
                onClick={() => navigate('/claims/tracking-list')} 
                style={{ 
                  background: 'rgba(255,255,255,0.08)', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  backdropFilter: 'blur(10px)'
                }}
              >
                Mes sinistres
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card style={{ 
            borderRadius: 24, 
            marginBottom: 24,
            background: 'rgba(20, 20, 20, 0.95)',
            border: '1px solid #2a2a2a',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
          }}>
            <Steps current={currentStep}>
              <Step title="Déclaration" icon={<FileTextOutlined />} />
              <Step title="Analyse" icon={<SearchOutlined />} />
              <Step title="Expertise" icon={<UserOutlined />} />
              <Step title="Indemnisation" icon={<DollarOutlined />} />
            </Steps>
            <Divider style={{ borderColor: '#2a2a2a' }} />
            <Alert 
              message={<span style={{ color: '#e8e8e8' }}>Estimation des délais</span>}
              description={
                <div>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Statistic 
                        title={<span style={{ color: '#888' }}>Progression</span>}
                        value={estimatedCompletion?.progress || 0} 
                        suffix="%" 
                        valueStyle={{ color: claimTypeConfig.color }}
                      />
                    </Col>
                    <Col span={12}>
                      <Text style={{ color: '#888' }}>Prochaine étape: {estimatedCompletion?.next_step || 'Finalisation'}</Text>
                    </Col>
                  </Row>
                  <Progress 
                    percent={estimatedCompletion?.progress || 0} 
                    strokeColor={claimTypeConfig.color} 
                    trailColor="#2a2a2a"
                    style={{ marginTop: 16 }} 
                  />
                  <Text style={{ color: '#666', display: 'block', marginTop: 8 }}>
                    💡 Les statuts évoluent automatiquement avec le temps
                  </Text>
                </div>
              } 
              type="info" 
              showIcon 
              style={{ 
                borderRadius: 16,
                background: 'rgba(24, 144, 255, 0.08)',
                border: '1px solid rgba(24, 144, 255, 0.2)'
              }}
            />
            
            <Divider style={{ borderColor: '#2a2a2a' }} />
            <Title level={5} style={{ color: '#e8e8e8' }}>Chronologie</Title>
            {timeline.length === 0 ? (
              <Empty description={<span style={{ color: '#888' }}>Aucune étape disponible</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              <Timeline>
                {timeline.map((event, idx) => (
                  <Timeline.Item key={idx} color={event.status === 'completed' ? 'green' : 'blue'}>
                    <Text strong style={{ color: '#e8e8e8' }}>{event.title}</Text>
                    <br />
                    <Text style={{ color: '#666', fontSize: 12 }}>{dayjs(event.date).format('DD/MM/YYYY HH:mm')}</Text>
                    <br />
                    <Text style={{ color: '#888' }}>{event.description}</Text>
                  </Timeline.Item>
                ))}
              </Timeline>
            )}
            
            {/* Notifications */}
            {notifications.length > 0 && (
              <>
                <Divider style={{ borderColor: '#2a2a2a' }} />
                <Title level={5} style={{ color: '#e8e8e8' }}>Notifications</Title>
                <Timeline mode="left">
                  {notifications.slice(0, 5).map((notif, idx) => (
                    <Timeline.Item key={idx} color={notif.type === 'success' ? 'green' : notif.type === 'error' ? 'red' : 'blue'}>
                      <Text strong style={{ color: '#e8e8e8' }}>{notif.title}</Text>
                      <br />
                      <Text style={{ color: '#666', fontSize: 12 }}>{dayjs(notif.created_at).format('DD/MM/YYYY HH:mm')}</Text>
                      <br />
                      <Text style={{ color: '#888' }}>{notif.message}</Text>
                    </Timeline.Item>
                  ))}
                </Timeline>
              </>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card style={{ 
            borderRadius: 24, 
            marginBottom: 24,
            background: 'rgba(20, 20, 20, 0.95)',
            border: '1px solid #2a2a2a',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
          }} 
          title={<span style={{ color: '#e8e8e8' }}>Assistance</span>}
          headStyle={{ borderBottom: '1px solid #2a2a2a' }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Button 
                icon={<MessageOutlined />} 
                block 
                onClick={() => setChatVisible(true)} 
                style={{ 
                  height: 48,
                  background: `linear-gradient(135deg, ${claimTypeConfig.color} 0%, ${claimTypeConfig.color}88 100%)`,
                  border: 'none',
                  color: 'white'
                }}
              >
                💬 Chat avec un conseiller
              </Button>
              <Button 
                icon={<PhoneOutlined />} 
                block 
                style={{ 
                  height: 48,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid #2a2a2a',
                  color: '#e8e8e8'
                }}
              >
                📞 Appeler le support (0 800 123 456)
              </Button>
              <Alert 
                message={<span style={{ color: '#e8e8e8' }}>Besoin d'aide ?</span>}
                description={<span style={{ color: '#888' }}>Nos conseillers sont disponibles du lundi au vendredi de 9h à 18h.</span>}
                type="info" 
                showIcon 
                style={{ 
                  marginTop: 16,
                  background: 'rgba(24, 144, 255, 0.08)',
                  border: '1px solid rgba(24, 144, 255, 0.2)'
                }}
              />
            </Space>
          </Card>
        </Col>
      </Row>

      <Modal 
        title={<span style={{ color: '#e8e8e8' }}>Chat avec l'expert</span>}
        open={chatVisible} 
        onCancel={() => setChatVisible(false)} 
        footer={null} 
        width={500}
        style={{ background: 'rgba(0,0,0,0.8)' }}
        bodyStyle={{ background: '#1a1a1a' }}
      >
        <div style={{ height: 400, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'auto', marginBottom: 16, padding: '0 8px' }}>
            {chatMessages.length === 0 ? (
              <Empty description={<span style={{ color: '#888' }}>Aucun message</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
            ) : (
              chatMessages.map((msg, i) => (
                <div key={i} style={{ textAlign: msg.role === 'user' ? 'right' : 'left', marginBottom: 12 }}>
                  <div style={{ 
                    display: 'inline-block', 
                    background: msg.role === 'user' ? claimTypeConfig.color : '#2a2a2a', 
                    color: msg.role === 'user' ? 'white' : '#e8e8e8', 
                    padding: '10px 14px', 
                    borderRadius: 18, 
                    maxWidth: '80%',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                  }}>
                    <div>{msg.content}</div>
                    <div style={{ fontSize: 10, marginTop: 4, opacity: 0.6 }}>{dayjs(msg.time).format('HH:mm')}</div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <TextArea 
              rows={2} 
              value={newMessage} 
              onChange={(e) => setNewMessage(e.target.value)} 
              placeholder="Posez votre question à l'expert..."
              style={{ 
                background: '#2a2a2a', 
                border: '1px solid #333',
                color: '#e8e8e8',
                borderRadius: 8
              }}
              onPressEnter={(e) => {
                if (e.shiftKey) return;
                e.preventDefault();
                if (newMessage.trim()) {
                  setChatMessages(prev => [...prev, { role: 'user', content: newMessage, time: new Date() }]);
                  setNewMessage('');
                  message.info("Votre message a été envoyé. Un expert vous répondra bientôt.");
                }
              }}
            />
            <Button 
              type="primary" 
              icon={<SendOutlined />} 
              style={{ background: claimTypeConfig.color, borderColor: claimTypeConfig.color }}
              onClick={() => {
                if (newMessage.trim()) {
                  setChatMessages(prev => [...prev, { role: 'user', content: newMessage, time: new Date() }]);
                  setNewMessage('');
                  message.info("Votre message a été envoyé. Un expert vous répondra bientôt.");
                }
              }}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ClaimTracking;