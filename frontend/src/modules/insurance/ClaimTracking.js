// src/modules/claims/ClaimTracking.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Card, Steps, Timeline, Tag, Button, Alert, 
  Progress, Descriptions, Badge, Space, message,
  Statistic, Row, Col, Tooltip, Divider, Spin, Typography,
  Modal, List, Avatar, Rate, Upload, Input, Form,
  Calendar, Collapse, Empty
} from 'antd';
import { 
  CheckCircleOutlined, ClockCircleOutlined, 
  SyncOutlined, CloseCircleOutlined, 
  BellOutlined, MessageOutlined, PhoneOutlined,
  DownloadOutlined, ShareAltOutlined, PrinterOutlined,
  UserOutlined, RobotOutlined, FileTextOutlined,
  CalendarOutlined, HistoryOutlined, ThunderboltOutlined,
  SafetyOutlined, WarningOutlined, SmileOutlined,
  StarOutlined, HeartOutlined, TeamOutlined,
  SearchOutlined, DollarOutlined, SendOutlined,
  EyeOutlined, DeleteOutlined, PlusOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import io from 'socket.io-client';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import 'dayjs/locale/fr';
import './ClaimTracking.css';

const { Text, Title } = Typography;
const { Step } = Steps;
const { Panel } = Collapse;
const { TextArea } = Input;

dayjs.extend(relativeTime);
dayjs.locale('fr');


const WS_BASE = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

const ClaimTracking = ({ claimId }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claim, setClaim] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [estimatedCompletion, setEstimatedCompletion] = useState(null);
  const [chatVisible, setChatVisible] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [stats, setStats] = useState({});
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackValue, setFeedbackValue] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [liveUpdate, setLiveUpdate] = useState(null);

  // Connexion WebSocket pour les mises à jour en temps réel
  useEffect(() => {
    const newSocket = io(WS_BASE, {
      transports: ['websocket'],
      path: '/ws/claims-tracking'
    });
    
    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('subscribe_claim', { claim_id: claimId });
    });
    
    newSocket.on('claim_update', (data) => {
      setLiveUpdate(data);
      setClaim(prev => ({ ...prev, ...data.claim }));
      setTimeline(data.timeline);
      setEstimatedCompletion(data.estimated_completion);
      
      if (data.notification) {
        message.info(data.notification);
      }
    });
    
    newSocket.on('new_message', (data) => {
      setChatMessages(prev => [...prev, data]);
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.close();
    };
  }, [claimId]);

  useEffect(() => {
    fetchClaimData();
    fetchStats();
    const interval = setInterval(() => {
      if (!refreshing) fetchClaimData(false);
    }, 30000);
    return () => clearInterval(interval);
  }, [claimId]);

  const fetchClaimData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    else setRefreshing(true);
    
    try {
      const response = await api.get(`/claims/${claimId}/tracking`);
      setClaim(response.data.claim);
      setTimeline(response.data.timeline);
      setEstimatedCompletion(response.data.estimated_completion);
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error('Erreur chargement:', error);
      if (error.response?.status === 401) {
        message.error('Session expirée, veuillez vous reconnecter');
      }
    } finally {
      if (showLoading) setLoading(false);
      else setRefreshing(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/claims/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Erreur stats:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      const response = await api.post(`/claims/${claimId}/chat`, 
        { message: newMessage }
      );
      setChatMessages([...chatMessages, { role: 'user', content: newMessage, time: new Date() }]);
      setChatMessages([...chatMessages, { role: 'assistant', content: response.data.reply, time: new Date() }]);
      setNewMessage('');
    } catch (error) {
      message.error('Erreur lors de l\'envoi');
    }
  };

  const submitFeedback = async () => {
    try {
      await api.post(`/claims/${claimId}/feedback`, 
        { rating: feedbackValue, comment: feedbackComment }
      );
      message.success('Merci pour votre retour !');
      setFeedbackVisible(false);
      setFeedbackValue(0);
      setFeedbackComment('');
    } catch (error) {
      message.error('Erreur lors de l\'envoi');
    }
  };

  const uploadDocument = async (file) => {
    const formData = new FormData();
    formData.append('document', file);
    formData.append('claim_id', claimId);
    
    try {
      await api.post('/claims/upload-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      message.success('Document uploadé avec succès');
      fetchClaimData(false);
    } catch (error) {
      message.error('Erreur lors de l\'upload');
    }
    return false;
  };

  const stepsConfig = [
    { title: 'Déclaration', icon: <FileTextOutlined />, description: 'Sinistre déclaré' },
    { title: 'Analyse', icon: <SearchOutlined />, description: 'En cours d\'analyse' },
    { title: 'Expertise', icon: <UserOutlined />, description: 'Expert assigné' },
    { title: 'Indemnisation', icon: <DollarOutlined />, description: 'Paiement en cours' }
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Chargement de votre dossier..." ><div/></Spin>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      {/* En-tête avec gradient */}
      <div style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 24,
        padding: '32px 32px',
        marginBottom: 32,
        color: 'white'
      }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="large">
              <div style={{ 
                width: 70, 
                height: 70, 
                background: 'rgba(255,255,255,0.2)', 
                borderRadius: 24, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backdropFilter: 'blur(10px)'
              }}>
                <ClockCircleOutlined style={{ fontSize: 36, color: 'white' }} />
              </div>
              <div>
                <Title level={2} style={{ margin: 0, color: 'white' }}>Suivi de Sinistre</Title>
                <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                  {claim?.claim_number} - {claim?.claim_type}
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Tooltip title={isConnected ? 'Mises à jour en temps réel' : 'Connexion en cours...'}>
                <Badge status={isConnected ? 'success' : 'processing'} text={isConnected ? 'Temps réel' : 'Connexion...'} />
              </Tooltip>
              <Button icon={<SyncOutlined spin={refreshing} />} onClick={() => fetchClaimData(false)} loading={refreshing}>
                Actualiser
              </Button>
              <Button icon={<PrinterOutlined />}>Imprimer</Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Alertes en temps réel */}
      {liveUpdate && (
        <Alert
          message="Mise à jour en temps réel"
          description={liveUpdate.message}
          type="info"
          showIcon
          closable
          style={{ marginBottom: 24, borderRadius: 16 }}
        />
      )}

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card 
            title={
              <Space>
                <SafetyOutlined />
                <span>Avancement du dossier</span>
                <Tag color={claim?.status_color}>{claim?.status}</Tag>
              </Space>
            }
            style={{ borderRadius: 24, marginBottom: 24 }}
            extra={
              <Tooltip title="Partager le suivi">
                <Button icon={<ShareAltOutlined />} size="small">Partager</Button>
              </Tooltip>
            }
          >
            <Steps current={claim?.current_step} status={claim?.status === 'rejected' ? 'error' : 'process'}>
              {stepsConfig.map((step, idx) => (
                <Step key={idx} title={step.title} icon={step.icon} description={step.description} />
              ))}
            </Steps>

            <Divider />

            <Alert
              message="Estimation des délais"
              description={
                <div>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Statistic 
                        title="Date estimée de finalisation" 
                        value={estimatedCompletion?.date || 'En cours'} 
                        prefix={<CalendarOutlined />}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic 
                        title="Progression" 
                        value={estimatedCompletion?.progress || 0} 
                        suffix="%" 
                        prefix={<SyncOutlined />}
                      />
                    </Col>
                  </Row>
                  <Progress 
                    percent={estimatedCompletion?.progress} 
                    status="active" 
                    strokeColor="#1890ff"
                    style={{ marginTop: 16 }}
                  />
                  <Text type="secondary" style={{ marginTop: 8, display: 'block' }}>
                    Prochaine étape: {estimatedCompletion?.next_step}
                  </Text>
                </div>
              }
              type="info"
              showIcon
              style={{ borderRadius: 16 }}
            />

            <Divider />

            <Title level={5}>Chronologie détaillée</Title>
            <Timeline mode="left">
              {timeline.map((event, idx) => (
                <Timeline.Item
                  key={idx}
                  dot={event.status === 'completed' ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
                  color={event.status === 'completed' ? 'green' : 'blue'}
                >
                  <div style={{ padding: '4px 0' }}>
                    <Text strong style={{ fontSize: 16 }}>{event.title}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {dayjs(event.date).format('DD/MM/YYYY HH:mm')} - {dayjs(event.date).fromNow()}
                    </Text>
                    <br />
                    <Text style={{ marginTop: 8, display: 'block' }}>{event.description}</Text>
                    {event.documents && event.documents.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <Space wrap>
                          {event.documents.map((doc, i) => (
                            <Tag key={i} color="blue" icon={<FileTextOutlined />}>
                              {doc}
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    )}
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>

          <Card 
            title={
              <Space>
                <HistoryOutlined />
                <span>Notifications et alertes</span>
                <Badge count={notifications.filter(n => !n.is_read).length} />
              </Space>
            }
            style={{ borderRadius: 24 }}
          >
            {notifications.length === 0 ? (
              <Empty description="Aucune notification" />
            ) : (
              <List
                dataSource={notifications}
                renderItem={notification => (
                  <List.Item
                    style={{ 
                      background: notification.is_read ? 'transparent' : '#e6f7ff',
                      borderRadius: 12,
                      marginBottom: 8,
                      padding: '12px 16px'
                    }}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          icon={notification.type === 'warning' ? <WarningOutlined /> : <BellOutlined />} 
                          style={{ background: notification.type === 'warning' ? '#faad14' : '#1890ff' }}
                        />
                      }
                      title={notification.title}
                      description={
                        <div>
                          <div>{notification.message}</div>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {dayjs(notification.created_at).fromNow()}
                          </Text>
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card 
            title={
              <Space>
                <TeamOutlined />
                <span>Assistance</span>
              </Space>
            }
            style={{ borderRadius: 24, marginBottom: 24 }}
          >
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Button 
                icon={<MessageOutlined />} 
                block 
                size="large"
                onClick={() => setChatVisible(true)}
                style={{ borderRadius: 12, height: 48 }}
              >
                Chat avec un conseiller
              </Button>
              <Button 
                icon={<PhoneOutlined />} 
                block 
                size="large"
                style={{ borderRadius: 12, height: 48 }}
              >
                Appeler le support (0 800 123 456)
              </Button>
              <Button 
                icon={<BellOutlined />} 
                block 
                size="large"
                style={{ borderRadius: 12, height: 48 }}
              >
                Activer les notifications
              </Button>
            </Space>
          </Card>

          <Card 
            title="Documents requis"
            style={{ borderRadius: 24, marginBottom: 24 }}
            extra={<Button type="link" size="small">Voir tout</Button>}
          >
            <List
              dataSource={claim?.required_documents || []}
              renderItem={(doc, idx) => (
                <List.Item
                  actions={[
                    !doc.uploaded && (
                      <Upload
                        beforeUpload={uploadDocument}
                        showUploadList={false}
                        accept=".pdf,.jpg,.png"
                      >
                        <Button size="small" type="link">Ajouter</Button>
                      </Upload>
                    )
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        icon={<FileTextOutlined />} 
                        style={{ backgroundColor: doc.uploaded ? '#52c41a' : '#faad14' }}
                      />
                    }
                    title={doc.name}
                    description={doc.description}
                  />
                  {doc.uploaded && <Tag color="success">Déposé</Tag>}
                </List.Item>
              )}
            />
          </Card>

          <Card 
            title="Contact expert"
            style={{ borderRadius: 24, marginBottom: 24 }}
          >
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Nom">
                <Space>
                  <Avatar icon={<UserOutlined />} size="small" />
                  <Text strong>{claim?.expert?.name || 'En cours d\'affectation'}</Text>
                </Space>
              </Descriptions.Item>
              {claim?.expert?.phone && (
                <Descriptions.Item label="Téléphone">
                  <a href={`tel:${claim.expert.phone}`}>{claim.expert.phone}</a>
                </Descriptions.Item>
              )}
              {claim?.expert?.email && (
                <Descriptions.Item label="Email">
                  <a href={`mailto:${claim.expert.email}`}>{claim.expert.email}</a>
                </Descriptions.Item>
              )}
            </Descriptions>
            {claim?.expert?.name && (
              <Button 
                type="primary" 
                block 
                style={{ marginTop: 16 }}
                onClick={() => setChatVisible(true)}
              >
                Contacter l'expert
              </Button>
            )}
          </Card>

          <Card 
            title={
              <Space>
                <StarOutlined />
                <span>Donnez votre avis</span>
              </Space>
            }
            style={{ borderRadius: 24 }}
          >
            <div style={{ textAlign: 'center' }}>
              <Rate 
                value={feedbackValue} 
                onChange={setFeedbackValue} 
                style={{ fontSize: 24, marginBottom: 16 }}
              />
              <Button 
                type="primary" 
                block 
                onClick={() => setFeedbackVisible(true)}
                disabled={feedbackValue === 0}
              >
                Évaluer mon expérience
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Modal de chat */}
      <Modal
        title={
          <Space>
            <MessageOutlined />
            <span>Chat avec l'expert</span>
            {claim?.expert?.name && <Tag color="blue">{claim.expert.name}</Tag>}
          </Space>
        }
        open={chatVisible}
        onCancel={() => setChatVisible(false)}
        footer={null}
        width={500}
      >
        <div style={{ height: 400, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, overflow: 'auto', marginBottom: 16 }}>
            <List
              dataSource={chatMessages}
              renderItem={msg => (
                <List.Item style={{ 
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  border: 'none',
                  padding: '4px 0'
                }}>
                  <div style={{ 
                    maxWidth: '80%',
                    background: msg.role === 'user' ? '#1890ff' : '#f0f0f0',
                    color: msg.role === 'user' ? 'white' : 'black',
                    padding: '8px 12px',
                    borderRadius: 16,
                    marginLeft: msg.role === 'user' ? 'auto' : 0
                  }}>
                    <div>{msg.content}</div>
                    <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7 }}>
                      {dayjs(msg.time).format('HH:mm')}
                    </div>
                  </div>
                </List.Item>
              )}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <TextArea
              rows={2}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Posez votre question à l'expert..."
              onPressEnter={sendMessage}
            />
            <Button type="primary" icon={<SendOutlined />} onClick={sendMessage} />
          </div>
        </div>
      </Modal>

      {/* Modal de feedback */}
      <Modal
        title="Évaluation de l'expérience"
        open={feedbackVisible}
        onCancel={() => setFeedbackVisible(false)}
        onOk={submitFeedback}
        okText="Envoyer"
        cancelText="Annuler"
      >
        <div style={{ textAlign: 'center', padding: '24px 0' }}>
          <Rate value={feedbackValue} onChange={setFeedbackValue} style={{ fontSize: 32 }} />
          <div style={{ marginTop: 16 }}>
            <TextArea
              rows={3}
              placeholder="Partagez votre expérience (optionnel)"
              value={feedbackComment}
              onChange={(e) => setFeedbackComment(e.target.value)}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">Votre avis nous aide à nous améliorer</Text>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ClaimTracking;