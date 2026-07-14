import React, { useState, useEffect } from 'react';
import { Layout, Typography, Card, Row, Col, Statistic, Button, Space, Tabs, Table, Tag, Progress, Alert, message, Badge } from 'antd';
import { 
  SafetyCertificateOutlined, 
  ThunderboltOutlined,
  WarningOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  RobotOutlined,
  HistoryOutlined,
  BarChartOutlined,
  LineChartOutlined,
  CloudOutlined,
  SendOutlined,
  RiseOutlined,
  FallOutlined
} from '@ant-design/icons';
import { Line, Pie } from '@ant-design/charts';
import AssistantChat from '../components/Assistant/AssistantChat';
import { useAssistantCommunication } from '../hooks/useAssistantCommunication';
import './AssistantPages.css';

const { Content } = Layout;
const { Title, Text } = Typography;

const AssistantRiskPage = () => {
  const [activeTab, setActiveTab] = useState('1');
  const [copilotMessages, setCopilotMessages] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  
  // Communication avec Copilot et autres assistants
  const { 
    sendToCopilot, 
    sendToAssistant,
    inbox, 
    unreadCount,
    markAsRead 
  } = useAssistantCommunication('risk');

  // Données simulées
  const riskData = [
    { month: 'Jan', value: 65 },
    { month: 'Fév', value: 68 },
    { month: 'Mar', value: 72 },
    { month: 'Avr', value: 70 },
    { month: 'Mai', value: 75 },
    { month: 'Juin', value: 73 }
  ];

  const claimsData = [
    { type: 'Automobile', value: 45 },
    { type: 'Habitation', value: 32 },
    { type: 'Santé', value: 28 },
    { type: 'Professionnel', value: 18 }
  ];

  // Écouter les messages du Copilot et des autres assistants
  useEffect(() => {
    const newMessages = inbox.filter(m => !m.read);
    
    newMessages.forEach(msg => {
      if (msg.from === 'copilot') {
        handleCopilotMessage(msg);
      } else if (msg.from === 'predict' || msg.from === 'growth') {
        handleAssistantMessage(msg);
      }
      markAsRead(msg.id);
    });
  }, [inbox, markAsRead]);

  // Gérer les messages du Copilot
  const handleCopilotMessage = (msg) => {
    const content = msg.content;
    
    if (content.type === 'delegation') {
      const newTask = {
        id: msg.id,
        task: content.task,
        from: 'copilot',
        status: 'pending',
        timestamp: msg.timestamp
      };
      setPendingTasks(prev => [...prev, newTask]);
      
      message.info({
        content: `📋 Nouvelle tâche du Copilot: ${content.task}`,
        duration: 5,
        icon: <ThunderboltOutlined />
      });
      
      sendToCopilot({
        type: 'acknowledgment',
        taskId: msg.id,
        status: 'received',
        estimatedTime: '3 minutes'
      });
      
    } else if (content.type === 'query') {
      message.info(`🔍 Question du Copilot: ${content.query}`);
      
      setTimeout(() => {
        sendToCopilot({
          type: 'response',
          queryId: msg.id,
          answer: `Analyse des risques terminée pour "${content.query}". Voici les résultats...`,
          data: generateRiskAnalysis(content.query)
        });
      }, 2000);
    }
  };

  // Gérer les messages des autres assistants
  const handleAssistantMessage = (msg) => {
    const content = msg.content;
    
    if (content.type === 'request') {
      message.info(`📨 Demande de ${msg.from}: ${content.need}`);
      
      setTimeout(() => {
        sendToAssistant(msg.from, {
          type: 'response',
          requestId: msg.id,
          data: {
            riskProfile: calculateRiskProfile(content.clientData),
            recommendations: generateRiskRecommendations()
          }
        });
      }, 1500);
    }
  };

  // Générer analyse de risque
  const generateRiskAnalysis = (query) => {
    return {
      analysis: `Analyse de risque pour ${query}`,
      riskLevel: 'Modéré',
      probability: 0.67,
      factors: [
        'Stabilité financière',
        'Historique sinistres',
        'Zone géographique'
      ],
      recommendations: [
        'Surveillance renforcée',
        'Ajustement des primes',
        'Proposition de prévention'
      ]
    };
  };

  const calculateRiskProfile = (clientData) => {
    return {
      score: 78,
      level: 'medium',
      factors: {
        stability: 'good',
        claims: 'low',
        location: 'medium'
      }
    };
  };

  const generateRiskRecommendations = () => {
    return [
      'Augmenter la couverture',
      'Proposer une franchise',
      'Programmer une visite'
    ];
  };

  // Envoyer rapport au Copilot
  const sendReportToCopilot = () => {
    sendToCopilot({
      type: 'report',
      title: "Rapport d'activité Risk",
      data: {
        riskIndex: riskData,
        claims: claimsData,
        period: 'Mois en cours',
        summary: {
          averageRisk: 70.5,
          totalClaims: 123,
          pendingClaims: 45,
          resolvedClaims: 78
        }
      },
      recommendations: [
        'Mettre à jour les modèles de risque',
        'Analyser les sinistres récurrents',
        'Optimiser les primes'
      ]
    });
    
    message.success('Rapport envoyé au Copilot');
  };

  // Demander analyse à Predict
  const askPredictAnalysis = () => {
    sendToAssistant('predict', {
      type: 'request',
      need: 'analyse financière pour évaluation de risque',
      clientData: {
        id: 'CLT-2024-5678',
        sector: 'assurance',
        revenue: '5.2M€'
      },
      from: 'risk',
      priority: 'high'
    });
    
    message.info("Demande d'analyse envoyée à Nexy Predict");
  };

  // Compléter une tâche
  const completeTask = (taskId) => {
    setPendingTasks(prev => prev.filter(t => t.id !== taskId));
    
    sendToCopilot({
      type: 'task-complete',
      taskId: taskId,
      result: {
        success: true,
        details: 'Évaluation des risques terminée',
        timestamp: new Date()
      }
    });
    
    message.success('Tâche marquée comme terminée');
  };

  const lineConfig = {
    data: riskData,
    xField: 'month',
    yField: 'value',
    point: { size: 5 },
    smooth: true,
    color: '#52c41a',
  };

  const pieConfig = {
    data: claimsData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.8,
    label: {
      type: 'outer',
      content: '{name} {percentage}',
    },
  };

  // Configuration propre des onglets pour la prop "items" d'Ant Design
  const tabItems = [
    {
      key: '1',
      label: <span><FileTextOutlined /> Sinistres</span>,
      children: (
        <Card className="tab-card">
          <div className="kpi-row">
            <Statistic 
              title="Sinistres en cours"
              value={45}
              valueStyle={{ color: '#faad14' }}
            />
            <Statistic 
              title="Montant total"
              value={234500}
              suffix="€"
              valueStyle={{ color: '#52c41a' }}
            />
            <Statistic 
              title="Délai moyen"
              value={12}
              suffix="jours"
              valueStyle={{ color: '#1890ff' }}
            />
          </div>

          <Title level={5}>Répartition par type</Title>
          <Pie {...pieConfig} height={200} />

          <Table
            size="small"
            columns={[
              { title: 'N° Sinistre', dataIndex: 'id' },
              { title: 'Client', dataIndex: 'client' },
              { title: 'Montant', dataIndex: 'amount' },
              { title: 'Statut', dataIndex: 'status' },
              { title: 'Risque', dataIndex: 'risk' },
              {
                title: 'Action',
                key: 'action',
                render: (_, record) => (
                  <Button 
                    size="small" 
                    type="link"
                    icon={<SendOutlined />}
                    onClick={() => sendToCopilot({
                      type: 'claim-alert',
                      claim: record,
                      risk: record.risk
                    })}
                  >
                    Alerter
                  </Button>
                )
              }
            ]}
            dataSource={[
              { id: 'SIN-001', client: 'Jean Dupont', amount: '12 500€', status: <Tag color="orange">En cours</Tag>, risk: <Tag color="green">Faible</Tag> },
              { id: 'SIN-002', client: 'Marie Martin', amount: '45 000€', status: <Tag color="red">Urgent</Tag>, risk: <Tag color="red">Élevé</Tag> },
              { id: 'SIN-003', client: 'Pierre Durand', amount: '8 200€', status: <Tag color="blue">Expertise</Tag>, risk: <Tag color="orange">Moyen</Tag> }
            ]}
            pagination={false}
          />
        </Card>
      )
    },
    {
      key: '2',
      label: <span><ThunderboltOutlined /> Catastrophes</span>,
      children: (
        <Card className="tab-card">
          <Alert
            message="Alerte météo"
            description="Risque accru d'intempéries dans les 7 prochains jours (+23%)"
            type="warning"
            showIcon
            action={
              <Button 
                size="small" 
                type="primary" 
                ghost
                onClick={() => sendToCopilot({
                  type: 'weather-alert',
                  risk: '+23%',
                  period: '7 jours',
                  recommendation: 'Ajuster les primes de 8%'
                })}
              >
                Notifier Copilot
              </Button>
            }
          />

          <Title level={5} style={{ marginTop: 16 }}>Évolution des risques</Title>
          <Line {...lineConfig} height={200} />

          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={8}>
              <Card size="small">
                <Statistic 
                  title="Risque inondation"
                  value={45}
                  suffix="%"
                  valueStyle={{ color: '#faad14' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic 
                  title="Risque tempête"
                  value={32}
                  suffix="%"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Statistic 
                  title="Risque incendie"
                  value={18}
                  suffix="%"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
          </Row>
        </Card>
      )
    },
    {
      key: '3',
      label: <span><BarChartOutlined /> Scoring</span>,
      children: (
        <Card className="tab-card">
          <div className="kpi-row">
            <Statistic 
              title="Score moyen"
              value={72.5}
              suffix="/100"
              valueStyle={{ color: '#52c41a' }}
            />
            <Statistic 
              title="Clients analysés"
              value={3450}
              valueStyle={{ color: '#1890ff' }}
            />
            <Statistic 
              title="Profils à risque"
              value={156}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </div>

          <Table
            size="small"
            columns={[
              { title: 'Client', dataIndex: 'client' },
              { title: 'Score', dataIndex: 'score' },
              { title: 'Niveau', dataIndex: 'level' },
              {
                title: 'Action',
                key: 'action',
                render: (_, record) => (
                  <Button 
                    size="small" 
                    type="link"
                    onClick={() => sendToAssistant('growth', {
                      type: 'client-risk',
                      client: record.client,
                      score: record.score,
                      level: record.level
                    })}
                  >
                    Partager à Growth
                  </Button>
                )
              }
            ]}
            dataSource={[
              { client: 'SARL Martin', score: '85/100', level: <Tag color="green">Faible</Tag> },
              { client: 'Dupont SAS', score: '62/100', level: <Tag color="orange">Moyen</Tag> },
              { client: 'TechCorp', score: '45/100', level: <Tag color="red">Élevé</Tag> }
            ]}
            pagination={false}
          />
        </Card>
      )
    }
  ];

  return (
    <Layout className="assistant-page">
      <Content className="assistant-page-content">
        <div className="page-header">
          <div className="header-icon" style={{ background: 'linear-gradient(135deg, #52c41a, #389e0d)' }}>
            <SafetyCertificateOutlined />
          </div>
          <div className="header-title">
            <Title level={2}>Nexy Risk</Title>
            <Text type="secondary">Expert en assurance et gestion des risques</Text>
          </div>
          <Space className="header-actions">
            {unreadCount > 0 && (
              <Badge count={unreadCount} offset={[-5, 5]}>
                <Tag color="processing" icon={<RobotOutlined />}>
                  Messages
                </Tag>
              </Badge>
            )}
            <Button 
              type="primary" 
              icon={<SendOutlined />} 
              onClick={sendReportToCopilot}
              ghost
              style={{ borderColor: '#52c41a', color: '#52c41a' }}
            >
              Rapport au Copilot
            </Button>
            <Button 
              icon={<BarChartOutlined />} 
              onClick={askPredictAnalysis}
              style={{ color: '#1890ff' }}
            >
              Consulter Nexy Predict
            </Button>
          </Space>
        </div>

        {/* Tâches en attente */}
        {pendingTasks.length > 0 && (
          <Card className="pending-tasks-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <ThunderboltOutlined style={{ color: '#faad14' }} />
                <Text strong>Tâches en attente du Copilot</Text>
                <Tag color="blue">{pendingTasks.length}</Tag>
              </Space>
            </div>
            <div style={{ marginTop: 8 }}>
              {pendingTasks.map(task => (
                <div key={task.id} className="pending-task-item">
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text>{task.task}</Text>
                    <Button 
                      size="small" 
                      type="link" 
                      onClick={() => completeTask(task.id)}
                      style={{ color: '#52c41a' }}
                    >
                      Terminer
                    </Button>
                  </Space>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Row gutter={[24, 24]}>
          <Col span={16}>
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab} 
              className="assistant-tabs"
              items={tabItems}
            />
          </Col>

          <Col span={8}>
            <AssistantChat 
              assistantType="risk"
              assistantColor="#52c41a"
              assistantName="Nexy Risk"
              onSendToCopilot={(msg) => sendToCopilot({
                type: 'chat-message',
                content: msg,
                from: 'risk'
              })}
            />
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default AssistantRiskPage;