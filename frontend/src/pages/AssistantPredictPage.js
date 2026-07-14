import React, { useState, useEffect } from 'react';
import { Layout, Typography, Card, Row, Col, Statistic, Button, Space, Tabs, Table, Tag, Progress, Alert, message, Badge } from 'antd';
import { 
  BankOutlined, 
  RiseOutlined, 
  SafetyCertificateOutlined,
  WarningOutlined,
  RobotOutlined,
  BarChartOutlined,
  LineChartOutlined,
  SendOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { Line, Column } from '@ant-design/charts';
import AssistantChat from '../components/Assistant/AssistantChat';
import { useAssistantCommunication } from '../hooks/useAssistantCommunication';
import './AssistantPages.css';

const { Content } = Layout;
const { Title, Text } = Typography;

const AssistantPredictPage = () => {
  const [activeTab, setActiveTab] = useState('1');
  const [pendingTasks, setPendingTasks] = useState([]);
  
  // Communication avec Copilot et autres assistants
  const { 
    sendToCopilot, 
    sendToAssistant,
    inbox, 
    unreadCount,
    markAsRead 
  } = useAssistantCommunication('predict');

  // Données simulées pour les graphiques
  const creditData = [
    { month: 'Jan', value: 85 },
    { month: 'Fév', value: 88 },
    { month: 'Mar', value: 92 },
    { month: 'Avr', value: 87 },
    { month: 'Mai', value: 91 },
    { month: 'Juin', value: 94 }
  ];

  const fraudData = [
    { type: 'Transactions suspectes', value: 23 },
    { type: 'Connexions anormales', value: 15 },
    { type: 'Montants inhabituels', value: 18 },
    { type: 'Multiples comptes', value: 12 }
  ];

  // Écouter les messages du Copilot et des autres assistants
  useEffect(() => {
    const newMessages = inbox.filter(m => !m.read);
    
    newMessages.forEach(msg => {
      if (msg.from === 'copilot') {
        handleCopilotMessage(msg);
      } else if (msg.from === 'risk' || msg.from === 'growth') {
        handleAssistantMessage(msg);
      }
      markAsRead(msg.id);
    });
  }, [inbox, markAsRead]);

  // Gérer les messages du Copilot
  const handleCopilotMessage = (msg) => {
    const content = msg.content;
    
    if (content.type === 'delegation') {
      // Nouvelle tâche déléguée
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
      
      // Répondre au Copilot
      sendToCopilot({
        type: 'acknowledgment',
        taskId: msg.id,
        status: 'received',
        estimatedTime: '5 minutes'
      });
      
    } else if (content.type === 'query') {
      // Question du Copilot
      message.info(`🔍 Question du Copilot: ${content.query}`);
      
      // Simuler une réponse après un délai
      setTimeout(() => {
        sendToCopilot({
          type: 'response',
          queryId: msg.id,
          answer: `Analyse terminée pour "${content.query}". Voici les résultats...`,
          data: generateResponseData(content.query)
        });
      }, 2000);
      
    } else if (content.type === 'coordination') {
      // Demande de collaboration
      message.info(`🔄 Collaboration demandée avec ${content.target || 'autre assistant'}`);
      
      if (content.target === 'risk') {
        // Transmettre à Risk
        sendToAssistant('risk', {
          type: 'coordination',
          from: 'predict',
          originalRequest: content,
          timestamp: new Date()
        });
      }
    }
  };

  // Gérer les messages des autres assistants
  const handleAssistantMessage = (msg) => {
    const content = msg.content;
    
    if (content.type === 'request') {
      message.info(`📨 Demande de ${msg.from}: ${content.need}`);
      
      // Répondre avec les données demandées
      setTimeout(() => {
        sendToAssistant(msg.from, {
          type: 'response',
          requestId: msg.id,
          data: {
            clientHistory: generateClientHistory(),
            riskProfile: calculateRiskProfile()
          }
        });
      }, 1500);
    }
  };

  // Générer des données de réponse
  const generateResponseData = (query) => {
    return {
      analysis: `Analyse de ${query}`,
      confidence: 0.95,
      recommendations: [
        'Augmenter la limite de crédit',
        'Surveiller les transactions',
        'Programmer un suivi'
      ]
    };
  };

  const generateClientHistory = () => {
    return {
      transactions: 145,
      averageAmount: 1250,
      riskScore: 87,
      flags: 0
    };
  };

  const calculateRiskProfile = () => {
    return {
      level: 'low',
      score: 92,
      factors: ['Historique stable', 'Paiements réguliers', 'Ancienneté > 3 ans']
    };
  };

  // Envoyer un rapport au Copilot
  const sendReportToCopilot = () => {
    sendToCopilot({
      type: 'report',
      title: 'Rapport d\'activité Predict',
      data: {
        creditScores: creditData,
        fraudAlerts: fraudData,
        period: 'Mois en cours',
        summary: {
          averageScore: 87.5,
          totalFraudAlerts: 23,
          confirmedFrauds: 8,
          accuracy: '94.5%'
        }
      },
      recommendations: [
        'Mettre à jour les modèles de scoring',
        'Renforcer la surveillance des transactions internationales',
        'Programmer une maintenance préventive'
      ]
    });
    
    message.success('Rapport envoyé au Copilot');
  };

  // Demander une analyse à Nexy Risk
  const askRiskAnalysis = () => {
    sendToAssistant('risk', {
      type: 'request',
      need: 'analyse de risque pour nouveau client',
      clientData: {
        id: 'CLT-2024-1234',
        sector: 'finance',
        revenue: '2.5M€'
      },
      from: 'predict',
      priority: 'medium'
    });
    
    message.info('Demande d\'analyse envoyée à Nexy Risk');
  };

  // Compléter une tâche
  const completeTask = (taskId) => {
    setPendingTasks(prev => prev.filter(t => t.id !== taskId));
    
    sendToCopilot({
      type: 'task-complete',
      taskId: taskId,
      result: {
        success: true,
        details: 'Tâche exécutée avec succès',
        timestamp: new Date()
      }
    });
    
    message.success('Tâche marquée comme terminée');
  };

  const config = {
    data: creditData,
    xField: 'month',
    yField: 'value',
    point: {
      size: 5,
      shape: 'diamond',
    },
    label: {
      style: {
        fill: '#aaa',
      },
    },
    smooth: true,
    color: '#1890ff',
  };

  const columnConfig = {
    data: fraudData,
    xField: 'type',
    yField: 'value',
    color: '#1890ff',
    label: {
      position: 'top',
    },
  };

  // Définition propre des onglets pour Ant Design v5
  const tabItems = [
    {
      key: '1',
      label: (
        <span>
          <BarChartOutlined /> Scoring Crédit
        </span>
      ),
      children: (
        <Card className="tab-card">
          <div className="kpi-row" style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
            <Statistic 
              title="Score moyen"
              value={87.5}
              precision={1}
              valueStyle={{ color: '#1890ff' }}
              prefix={<RiseOutlined />}
              suffix="/100"
            />
            <Statistic 
              title="Dossiers analysés"
              value={1245}
              valueStyle={{ color: '#52c41a' }}
            />
            <Statistic 
              title="Taux d'approbation"
              value={76}
              suffix="%"
              valueStyle={{ color: '#faad14' }}
            />
          </div>
          
          <Title level={5}>Évolution du scoring crédit</Title>
          <Line {...config} height={250} />

          <Alert
            message="Prédiction du mois"
            description="Augmentation prévue de 5.2% des demandes de crédit le mois prochain. Je recommande d'ajuster vos critères d'évaluation."
            type="info"
            showIcon
            className="prediction-alert"
            style={{ marginTop: '20px' }}
            action={
              <Button size="small" type="primary" ghost onClick={() => sendToCopilot({
                type: 'notification',
                message: 'Prédiction du mois disponible',
                data: { increase: '5.2%' }
              })}>
                Notifier Copilot
              </Button>
            }
          />
        </Card>
      )
    },
    {
      key: '2',
      label: (
        <span>
          <WarningOutlined /> Détection Fraude
        </span>
      ),
      children: (
        <Card className="tab-card">
          <div className="kpi-row" style={{ display: 'flex', gap: '24px', marginBottom: '24px' }}>
            <Statistic 
              title="Alertes en cours"
              value={23}
              valueStyle={{ color: '#ff4d4f' }}
            />
            <Statistic 
              title="Fraudes confirmées"
              value={8}
              valueStyle={{ color: '#faad14' }}
            />
            <Statistic 
              title="Taux de précision"
              value={94.5}
              suffix="%"
              valueStyle={{ color: '#52c41a' }}
            />
          </div>

          <Title level={5}>Types de fraudes détectées</Title>
          <Column {...columnConfig} height={250} />

          <Table
            size="small"
            style={{ marginTop: '20px' }}
            columns={[
              { title: 'Transaction', dataIndex: 'transaction' },
              { title: 'Montant', dataIndex: 'amount' },
              { title: 'Risque', dataIndex: 'risk' },
              { 
                title: 'Action', 
                dataIndex: 'action',
                render: (_, record) => (
                  <Space>
                    <Button size="small" type="link">Analyser</Button>
                    <Button 
                      size="small" 
                      type="link" 
                      icon={<SendOutlined />}
                      onClick={() => sendToCopilot({
                        type: 'alert',
                        transaction: record,
                        risk: record.riskName
                      })}
                    >
                      Alerter
                    </Button>
                  </Space>
                )
              }
            ]}
            dataSource={[
              { key: '1', transaction: 'VIR-2024-001', amount: '15 000€', risk: <Tag color="red">Élevé</Tag>, riskName: 'Élevé' },
              { key: '2', transaction: 'CB-2024-089', amount: '3 200€', risk: <Tag color="orange">Moyen</Tag>, riskName: 'Moyen' },
              { key: '3', transaction: 'VIR-2024-023', amount: '8 500€', risk: <Tag color="red">Élevé</Tag>, riskName: 'Élevé' }
            ]}
            pagination={false}
          />
        </Card>
      )
    },
    {
      key: '3',
      label: (
        <span>
          <LineChartOutlined /> Prévisions
        </span>
      ),
      children: (
        <Card className="tab-card">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card className="prediction-card">
                <Statistic 
                  title="Trésorerie prévue"
                  value={1250000}
                  precision={0}
                  suffix="€"
                  valueStyle={{ color: '#1890ff' }}
                />
                <Progress percent={85} strokeColor="#1890ff" />
                <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                  <Text>+12% vs mois dernier</Text>
                </div>
                <Button 
                  type="link" 
                  size="small" 
                  style={{ padding: 0 }}
                  onClick={() => sendToCopilot({
                    type: 'forecast',
                    value: 1250000,
                    trend: '+12%'
                  })}
                >
                  Partager
                </Button>
              </Card>
            </Col>
            <Col span={12}>
              <Card className="prediction-card">
                <Statistic 
                  title="Risque de liquidité"
                  value={23}
                  suffix="%"
                  valueStyle={{ color: '#52c41a' }}
                />
                <Progress percent={23} strokeColor="#52c41a" />
                <div style={{ marginTop: '8px', marginBottom: '8px' }}>
                  <Text>Niveau bas - Satisfaisant</Text>
                </div>
                <Button 
                  type="link" 
                  size="small"
                  style={{ padding: 0 }}
                  onClick={() => sendToCopilot({
                    type: 'risk-update',
                    liquidityRisk: '23%',
                    status: 'stable'
                  })}
                >
                  Partager
                </Button>
              </Card>
            </Col>
          </Row>
        </Card>
      )
    }
  ];

  return (
    <Layout className="assistant-page">
      <Content className="assistant-page-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="header-icon" style={{ background: 'linear-gradient(135deg, #1890ff, #096dd9)', padding: '12px', borderRadius: '8px', color: '#fff', fontSize: '24px', display: 'flex' }}>
              <BankOutlined />
            </div>
            <div className="header-title">
              <Title level={2} style={{ margin: 0 }}>Nexy Predict</Title>
              <Text type="secondary">Expert en solutions bancaires et financières</Text>
            </div>
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
            >
              Rapport au Copilot
            </Button>
            <Button 
              icon={<SafetyCertificateOutlined />} 
              onClick={askRiskAnalysis}
            >
              Consulter Nexy Risk
            </Button>
          </Space>
        </div>

        {/* Tâches en attente */}
        {pendingTasks.length > 0 && (
          <Card className="pending-tasks-card" style={{ marginBottom: 16, borderColor: '#ffe58f', backgroundColor: '#fffbe6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <ThunderboltOutlined style={{ color: '#faad14' }} />
                <Text strong>Tâches en attente du Copilot</Text>
                <Tag color="blue">{pendingTasks.length}</Tag>
              </Space>
            </div>
            <div style={{ marginTop: 8 }}>
              {pendingTasks.map(task => (
                <div key={task.id} className="pending-task-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f0f0f0' }}>
                  <Text>{task.task}</Text>
                  <Button 
                    size="small" 
                    type="link" 
                    onClick={() => completeTask(task.id)}
                  >
                    Marquer comme terminé
                  </Button>
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
              assistantType="predict"
              assistantColor="#1890ff"
              assistantName="Nexy Predict"
              onSendToCopilot={(msg) => sendToCopilot({
                type: 'chat-message',
                content: msg,
                from: 'predict'
              })}
            />
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default AssistantPredictPage;