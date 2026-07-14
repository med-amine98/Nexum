import React, { useState, useEffect } from 'react';
import { Layout, Typography, Card, Row, Col, Statistic, Button, Space, Tabs, Table, Tag, Progress, Alert, message, Badge } from 'antd';
import { 
  RiseOutlined, 
  TeamOutlined,
  ShoppingOutlined,
  LineChartOutlined,
  BarChartOutlined,
  FileTextOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  RobotOutlined,
  SendOutlined,
  ThunderboltOutlined,
  UserOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { Line, Column } from '@ant-design/charts';
import AssistantChat from '../components/Assistant/AssistantChat';
import { useAssistantCommunication } from '../hooks/useAssistantCommunication';
import './AssistantPages.css';

const { Content } = Layout;
const { Title, Text } = Typography;
const AssistantGrowthPage = () => {
  const [activeTab, setActiveTab] = useState('1');
  const [pendingTasks, setPendingTasks] = useState([]);
  
  // Communication avec Copilot et autres assistants
  const { 
    sendToCopilot, 
    sendToAssistant,
    inbox, 
    unreadCount,
    markAsRead 
  } = useAssistantCommunication('growth');

  // Données simulées
  const salesData = [
    { month: 'Jan', value: 85000 },
    { month: 'Fév', value: 92000 },
    { month: 'Mar', value: 105000 },
    { month: 'Avr', value: 98000 },
    { month: 'Mai', value: 115000 },
    { month: 'Juin', value: 128000 }
  ];

  const churnData = [
    { category: 'Faible risque', value: 345 },
    { category: 'Risque modéré', value: 87 },
    { category: 'Risque élevé', value: 34 },
    { category: 'Critique', value: 12 }
  ];

  // Écouter les messages
  useEffect(() => {
    const newMessages = inbox.filter(m => !m.read);
    
    newMessages.forEach(msg => {
      if (msg.from === 'copilot') {
        handleCopilotMessage(msg);
      } else if (msg.from === 'predict' || msg.from === 'risk') {
        handleAssistantMessage(msg);
      }
      markAsRead(msg.id);
    });
  }, [inbox, markAsRead]);

  // Gérer messages Copilot
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
        content: `📋 Nouvelle mission du Copilot: ${content.task}`,
        duration: 5,
        icon: <ThunderboltOutlined />
      });
      
      sendToCopilot({
        type: 'acknowledgment',
        taskId: msg.id,
        status: 'received',
        estimatedTime: '2 minutes'
      });
      
    } else if (content.type === 'query') {
      message.info(`🔍 Question du Copilot: ${content.query}`);
      
      setTimeout(() => {
        sendToCopilot({
          type: 'response',
          queryId: msg.id,
          answer: `Analyse commerciale terminée pour "${content.query}". Voici les résultats...`,
          data: generateSalesAnalysis(content.query)
        });
      }, 2000);
    }
  };

  // Gérer messages des autres assistants
  const handleAssistantMessage = (msg) => {
    const content = msg.content;
    
    if (content.type === 'client-risk') {
      message.warning({
        content: `⚠️ Client à risque signalé par ${msg.from}: ${content.client}`,
        duration: 6
      });
      
      // Ajouter une action recommandée
      setPendingTasks(prev => [...prev, {
        id: `risk-${Date.now()}`,
        task: `Contacter client ${content.client} (risque ${content.level})`,
        from: msg.from,
        status: 'pending',
        priority: 'high'
      }]);
    }
  };

  // Générer analyse
  const generateSalesAnalysis = (query) => {
    return {
      analysis: `Analyse des ventes pour ${query}`,
      trends: {
        growth: '+15%',
        topProducts: ['Produit A', 'Produit B', 'Produit C'],
        opportunities: 23
      },
      recommendations: [
        'Lancer campagne emailing',
        'Contacter leads chauds',
        'Optimiser pricing'
      ]
    };
  };

  // Envoyer rapport au Copilot
  const sendReportToCopilot = () => {
    sendToCopilot({
      type: 'report',
      title: 'Rapport commercial Growth',
      data: {
        sales: salesData,
        churn: churnData,
        period: 'Mois en cours',
        summary: {
          totalRevenue: 623000,
          growth: '+15%',
          newCustomers: 45,
          churnRisk: 46
        }
      },
      recommendations: [
        'Cibler les clients à risque',
        'Lancer campagne cross-selling',
        'Optimiser le pipeline'
      ]
    });
    
    message.success('Rapport envoyé au Copilot');
  };

  // Demander analyse à Risk
  const askRiskAnalysis = (client) => {
    sendToAssistant('risk', {
      type: 'request',
      need: `analyse de risque pour client ${client}`,
      clientData: client,
      from: 'growth',
      priority: 'medium'
    });
    
    message.info('Demande d\'analyse envoyée à Nexy Risk');
  };

  // Compléter tâche
  const completeTask = (taskId) => {
    setPendingTasks(prev => prev.filter(t => t.id !== taskId));
    
    sendToCopilot({
      type: 'task-complete',
      taskId: taskId,
      result: {
        success: true,
        details: 'Action commerciale exécutée',
        timestamp: new Date()
      }
    });
    
    message.success('Mission accomplie !');
  };

  const lineConfig = {
    data: salesData,
    xField: 'month',
    yField: 'value',
    point: { size: 5 },
    smooth: true,
    color: '#722ed1',
  };

  const columnConfig = {
    data: churnData,
    xField: 'category',
    yField: 'value',
    color: ({ category }) => {
      if (category === 'Critique') return '#ff4d4f';
      if (category === 'Risque élevé') return '#faad14';
      if (category === 'Risque modéré') return '#52c41a';
      return '#1890ff';
    },
  };

  return (
    <Layout className="assistant-page">
      <Content className="assistant-page-content">
        <div className="page-header">
          <div className="header-icon" style={{ background: 'linear-gradient(135deg, #722ed1, #531dab)' }}>
            <RiseOutlined />
          </div>
          <div className="header-title">
            <Title level={2}>Nexy Growth</Title>
            <Text type="secondary">Expert en développement commercial</Text>
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
              style={{ borderColor: '#722ed1', color: '#722ed1' }}
            >
              Rapport au Copilot
            </Button>
          </Space>
        </div>

        {/* Missions en attente */}
        {pendingTasks.length > 0 && (
          <Card className="pending-tasks-card" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Space>
                <ThunderboltOutlined style={{ color: '#faad14' }} />
                <Text strong>Missions en cours</Text>
                <Tag color="purple">{pendingTasks.length}</Tag>
              </Space>
            </div>
            <div style={{ marginTop: 8 }}>
              {pendingTasks.map(task => (
                <div key={task.id} className="pending-task-item">
                  <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                    <Text>{task.task}</Text>
                    {task.priority === 'high' && <Tag color="red">Urgent</Tag>}
                    <Button 
                      size="small" 
                      type="link" 
                      onClick={() => completeTask(task.id)}
                      style={{ color: '#722ed1' }}
                    >
                      Accomplir
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
  items={[
    {
      key: '1',
      label: <span><LineChartOutlined /> Performance</span>,
      children: (
        <Card className="tab-card">
          <div className="kpi-row">
            <Statistic 
              title="CA mensuel"
              value={128000}
              precision={0}
              suffix="€"
              valueStyle={{ color: '#722ed1' }}
              prefix={<RiseOutlined />}
            />
            <Statistic 
              title="Croissance"
              value={15}
              suffix="%"
              valueStyle={{ color: '#52c41a' }}
            />
            <Statistic 
              title="Objectif"
              value={85}
              suffix="%"
              valueStyle={{ color: '#faad14' }}
            />
          </div>

          <Title level={5}>Évolution du chiffre d'affaires</Title>
          <Line {...lineConfig} height={200} />

          <Alert
            message="Objectif du mois"
            description="+15% de croissance vs objectif de 10% - Excellent travail !"
            type="success"
            showIcon
            style={{ marginTop: 16 }}
          />
        </Card>
      )
    },
    {
      key: '2',
      label: <span><WarningOutlined /> Risques d'attrition</span>,
      children: (
        <Card className="tab-card">
          <div className="kpi-row">
            <Statistic 
              title="Clients à risque"
              value={46}
              valueStyle={{ color: '#ff4d4f' }}
            />
            <Statistic 
              title="Valeur en jeu"
              value={345000}
              suffix="€"
              valueStyle={{ color: '#faad14' }}
            />
            <Statistic 
              title="Taux de rétention"
              value={94.5}
              suffix="%"
              valueStyle={{ color: '#52c41a' }}
            />
          </div>

          <Title level={5}>Distribution des risques</Title>
          <Column {...columnConfig} height={200} />

          <Table
            size="small"
            columns={[
              { title: 'Client', dataIndex: 'client' },
              { title: 'CA annuel', dataIndex: 'revenue' },
              { title: 'Risque', dataIndex: 'risk' },
              { title: 'Dernier contact', dataIndex: 'lastContact' },
              {
                title: 'Action',
                key: 'action',
                render: (_, record) => (
                  <Space>
                    <Button size="small" type="link">Contacter</Button>
                    <Button 
                      size="small" 
                      type="link"
                      onClick={() => askRiskAnalysis(record.client)}
                    >
                      Analyser risque
                    </Button>
                  </Space>
                )
              }
            ]}
            dataSource={[
              { 
                client: 'SARL Martin', 
                revenue: '125 000€', 
                risk: <Tag color="red">Critique</Tag>, 
                lastContact: '30 jours' 
              },
              { 
                client: 'TechCorp', 
                revenue: '85 000€', 
                risk: <Tag color="orange">Élevé</Tag>, 
                lastContact: '45 jours' 
              },
              { 
                client: 'InnovStart', 
                revenue: '45 000€', 
                risk: <Tag color="green">Faible</Tag>, 
                lastContact: '7 jours' 
              }
            ]}
            pagination={false}
          />
        </Card>
      )
    },
    {
      key: '3',
      label: <span><ShoppingOutlined /> Opportunités</span>,
      children: (
        <Card className="tab-card">
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card className="opportunity-card">
                <Statistic 
                  title="Cross-selling"
                  value={23}
                  suffix="opportunités"
                  valueStyle={{ color: '#722ed1' }}
                />
                <Text>Potentiel: 45 000€</Text>
                <Button type="link" size="small" style={{ display: 'block', marginTop: 8 }}>
                  Voir détails
                </Button>
              </Card>
            </Col>
            <Col span={8}>
              <Card className="opportunity-card">
                <Statistic 
                  title="Upselling"
                  value={15}
                  suffix="opportunités"
                  valueStyle={{ color: '#52c41a' }}
                />
                <Text>Potentiel: 32 000€</Text>
                <Button type="link" size="small" style={{ display: 'block', marginTop: 8 }}>
                  Voir détails
                </Button>
              </Card>
            </Col>
            <Col span={8}>
              <Card className="opportunity-card">
                <Statistic 
                  title="Nouveaux clients"
                  value={8}
                  suffix="leads"
                  valueStyle={{ color: '#1890ff' }}
                />
                <Text>Potentiel: 28 000€</Text>
                <Button type="link" size="small" style={{ display: 'block', marginTop: 8 }}>
                  Voir détails
                </Button>
              </Card>
            </Col>
          </Row>
        </Card>
      )
    }
  ]}
/>
          </Col>

          <Col span={8}>
            <AssistantChat 
              assistantType="growth"
              assistantColor="#722ed1"
              assistantName="Nexy Growth"
              onSendToCopilot={(msg) => sendToCopilot({
                type: 'chat-message',
                content: msg,
                from: 'growth'
              })}
            />
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default AssistantGrowthPage;