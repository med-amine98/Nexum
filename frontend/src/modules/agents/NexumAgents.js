// src/modules/agents/NexumAgents.js - Version corrigée avec les bonnes URLs
import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Input, Button, List, Tag, 
  Switch, message, Typography, Space, Badge,
  Divider, Progress, Tooltip, Avatar, Empty, Statistic,
  Spin, Alert, Modal, Form, Select
} from 'antd';
import { 
  RobotOutlined, ThunderboltOutlined, 
  SendOutlined, CheckCircleOutlined,
  StopOutlined, PlayCircleOutlined,
  SettingOutlined, QuestionCircleOutlined,
  CustomerServiceOutlined, DollarOutlined,
  GlobalOutlined, SafetyCertificateOutlined,
  HistoryOutlined, ReloadOutlined,
  WarningOutlined, InfoCircleOutlined,
  TeamOutlined, LineChartOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

// ============================================
// CONFIGURATION DES ENDPOINTS (sans /api/v1, car le service api l'ajoute déjà)
// ============================================

const API_ENDPOINTS = {
  PROJECT_MODULES: '/project/modules',               // au lieu de '/api/v1/project/modules'
  PROJECT_ACTIVITIES: '/project/activities',         // idem
  PROJECT_ALERTS: '/project/alerts',
  PROJECT_KPIS: '/project/kpis',
  PROJECT_HEALTH: '/project/health',
  PREDICT_QUERY: '/intelligence/predict/query',      // au lieu de '/api/v1/intelligence/predict/query'
  TWIN_TELEMETRY: '/intelligence/twin/telemetry',
};

const NexumAgents = () => {
  const [command, setCommand] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [agents, setAgents] = useState([]);
  const [history, setHistory] = useState([]);
  const [systemStatus, setSystemStatus] = useState({
    capacity: 0,
    tps: 0,
    active_agents: 0,
    total_tasks: 0,
    success_rate: 0
  });
  const [lastUpdate, setLastUpdate] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [form] = Form.useForm();

  // Récupérer les données réelles
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Récupérer les modules (agents)
      const modulesRes = await api.get(API_ENDPOINTS.PROJECT_MODULES);
      const modulesData = modulesRes.data || [];
      

      // 2. Récupérer les activités récentes
      const activitiesRes = await api.get(`${API_ENDPOINTS.PROJECT_ACTIVITIES}?limit=20`);
      const activitiesData = activitiesRes.data || [];


      // 3. Récupérer les alertes
      const alertsRes = await api.get(API_ENDPOINTS.PROJECT_ALERTS);
      const alertsData = alertsRes.data || {};

      // 4. Récupérer les KPIs
      const kpisRes = await api.get(API_ENDPOINTS.PROJECT_KPIS);
      const kpisData = kpisRes.data || {};

      // 5. Récupérer la santé du système
      const healthRes = await api.get(API_ENDPOINTS.PROJECT_HEALTH);
      const healthData = healthRes.data || {};

      // Construire les agents à partir des modules
      const agentsList = modulesData.map((module, index) => {
        // Déterminer le type d'agent en fonction du nom du module
        let agentType = 'general';
        let icon = <RobotOutlined />;
        let description = module.description || 'Agent intelligent';
        let status = module.is_active ? 'active' : 'paused';
        
        if (module.name === 'CRM') {
          agentType = 'fidelity';
          icon = <TeamOutlined />;
          description = 'Analyse le sentiment client et propose des remises';
        } else if (module.name === 'Stock') {
          agentType = 'esg';
          icon = <GlobalOutlined />;
          description = 'Optimise les ressources et réduit l\'empreinte carbone';
        } else if (module.name === 'Ventes') {
          agentType = 'predict';
          icon = <LineChartOutlined />;
          description = 'Analyse les tendances et prédit les performances';
        } else if (module.name === 'Comptabilité') {
          agentType = 'finance';
          icon = <DollarOutlined />;
          description = 'Surveille les transactions et détecte les anomalies';
        }

        return {
          id: module.name || `agent_${index}`,
          name: `Agent ${module.name}`,
          type: agentType,
          status: status,
          description: description,
          tasks: module.progress || 0,
          success_rate: module.confidence ? Math.round(module.confidence * 100) : 85,
          last_action: module.description || 'Aucune activité récente',
          icon: icon,
          color: module.color || '#1890ff',
          module_data: module
        };
      });

      // Ajouter un agent Sentinel si des alertes existent
      if (alertsData.total > 0) {
        agentsList.push({
          id: 'sentinel',
          name: 'Agent Sentinel Anti-Fraude',
          type: 'security',
          status: 'active',
          description: 'Surveille les transactions et bloque les IPs suspectes',
          tasks: alertsData.total || 0,
          success_rate: alertsData.critical > 0 ? 95 : 98,
          last_action: `${alertsData.critical || 0} alertes critiques, ${alertsData.warning || 0} warnings`,
          icon: <SafetyCertificateOutlined />,
          color: '#ff4d4f',
          is_sentinel: true
        });
      }

      setAgents(agentsList);

      // Construire l'historique des activités
      const historyList = activitiesData.slice(0, 10).map((act, index) => {
        const agentName = act.module || 'Système';
        const foundAgent = agentsList.find(a => a.name.includes(agentName));
        
        return {
          id: act.id || index,
          time: act.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          agent: foundAgent ? foundAgent.name : agentName,
          action: act.action || 'Activité système',
          status: act.status || 'success',
          amount: act.amount || '-'
        };
      });

      // Ajouter les alertes à l'historique
      if (alertsData.critical > 0) {
        historyList.unshift({
          id: 'alert_critical',
          time: 'Maintenant',
          agent: 'Sentinel Anti-Fraude',
          action: `${alertsData.critical} alertes critiques détectées`,
          status: 'error',
          amount: `${alertsData.critical}`
        });
      }

      setHistory(historyList);

      // Calculer les statistiques système
      const totalTasks = agentsList.reduce((sum, a) => sum + a.tasks, 0);
      const avgSuccess = agentsList.reduce((sum, a) => sum + a.success_rate, 0) / (agentsList.length || 1);
      const activeAgents = agentsList.filter(a => a.status === 'active').length;

      setSystemStatus({
        capacity: Math.min(100, Math.round((totalTasks / 20) * 10)),
        tps: Math.round(totalTasks / 30) || 10,
        active_agents: activeAgents,
        total_tasks: totalTasks,
        success_rate: Math.round(avgSuccess)
      });

      setLastUpdate(new Date().toLocaleTimeString());

    } catch (error) {
      console.error('❌ Erreur NexumAgents:', error);
      setError(error.message || 'Erreur de chargement des données');
      message.error('Erreur de chargement des agents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // Gérer la commande
  const handleCommand = async () => {
    if (!command || command.trim().length < 3) {
      message.warning('Veuillez saisir une commande plus précise');
      return;
    }

    message.loading("L'orchestrateur analyse votre commande...", 0);
    
    try {
      // Envoyer la commande à l'API de prédiction
      const response = await api.post(API_ENDPOINTS.PREDICT_QUERY, { 
        query: command,
        type: 'agent_command'
      });
      
      const data = response.data;
      
      // Ajouter l'action à l'historique
      const newAction = {
        id: Date.now(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        agent: 'Orchestrateur Nexum',
        action: `Commande: "${command}" - ${data.insight || 'Traitée avec succès'}`,
        status: 'success',
        amount: data.predicted_value ? `Prédiction: ${data.predicted_value}` : '-'
      };
      
      setHistory([newAction, ...history]);
      setCommand('');
      message.destroy();
      message.success("Agent configuré et déployé avec succès.");
      
      // Rafraîchir les données
      setTimeout(fetchData, 1000);
      
    } catch (error) {
      console.error('Erreur commande:', error);
      message.destroy();
      message.error('Erreur lors du traitement de la commande');
    }
  };

  // Ouvrir les détails d'un agent
  const showAgentDetails = (agent) => {
    setSelectedAgent(agent);
    setIsModalVisible(true);
  };

  // Toggle agent status
  const toggleAgentStatus = async (agentId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      // Appel API pour mettre à jour le statut (à implémenter)
      // await api.patch(`/agents/${agentId}/status`, { status: newStatus });
      
      setAgents(prev => prev.map(a => 
        a.id === agentId ? { ...a, status: newStatus } : a
      ));
      
      message.success(`Agent ${newStatus === 'active' ? 'activé' : 'mis en pause'}`);
    } catch (error) {
      message.error('Erreur lors du changement de statut');
    }
  };

  // Afficher le loader
  if (loading) {
    return (
      <div style={{ 
        background: '#050505', 
        minHeight: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <Spin size="large" tip="Chargement des agents..." ><div/></Spin>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: '#050505', minHeight: '100vh', color: 'white' }}>
      {/* Header */}
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <Title level={2} style={{ color: 'white', margin: 0 }}>
            <RobotOutlined style={{ marginRight: 12, color: '#1890ff' }} />
            Nexum Autonomous Agents
          </Title>
          <Text style={{ color: 'rgba(255,255,255,0.45)' }}>
            Gestion et orchestration de l'intelligence distribuée • {systemStatus.active_agents} agents actifs
            {lastUpdate && ` • Dernière mise à jour: ${lastUpdate}`}
          </Text>
        </div>
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={fetchData}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
          >
            Actualiser
          </Button>
          <Badge 
            count={systemStatus.active_agents} 
            status="processing" 
            style={{ color: '#52c41a' }}
          />
        </Space>
      </div>

      {error && (
        <Alert
          message="Erreur de chargement"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 24, background: 'rgba(255,77,79,0.1)', border: '1px solid rgba(255,77,79,0.2)' }}
        />
      )}

      <Row gutter={[24, 24]}>
        {/* Command Center */}
        <Col xs={24} lg={16}>
          <Card style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20 }}>
            <Title level={4} style={{ color: 'white', marginBottom: 20 }}>
              <ThunderboltOutlined style={{ color: '#faad14', marginRight: 8 }} />
              Command Center (Natural Language Programming)
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.65)' }}>
              Décrivez l'objectif de votre agent. L'IA Nexum analysera et exécutera la commande.
            </Paragraph>
            <TextArea 
              rows={4} 
              placeholder='Ex: "Analyse les tendances des ventes et propose des recommandations"'
              value={command}
              onChange={e => setCommand(e.target.value)}
              style={{ 
                background: 'rgba(255,255,255,0.03)', 
                border: '1px solid rgba(24,144,255,0.3)', 
                color: 'white', 
                borderRadius: 12,
                resize: 'none'
              }}
              onPressEnter={(e) => {
                if (e.shiftKey) return;
                e.preventDefault();
                handleCommand();
              }}
            />
            <Button 
              type="primary" 
              icon={<SendOutlined />} 
              size="large" 
              style={{ marginTop: 16, borderRadius: 8, height: 45 }}
              onClick={handleCommand}
              block
            >
              Déployer l'Agent
            </Button>
          </Card>

          <Title level={4} style={{ color: 'white', marginTop: 40, marginBottom: 20 }}>
            <HistoryOutlined style={{ marginRight: 8 }} />
            Flux d'actions en temps réel
          </Title>
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 20, padding: 20 }}>
            {history.length > 0 ? (
              <List
                dataSource={history}
                renderItem={item => (
                  <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '12px 0' }}>
                    <div style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                      <Text style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, minWidth: 60 }}>
                        {item.time}
                      </Text>
                      <Tag color={item.status === 'error' ? 'red' : 'blue'} style={{ borderRadius: 4 }}>
                        {item.agent}
                      </Tag>
                      <Text style={{ color: 'rgba(255,255,255,0.85)', flex: 1 }}>
                        {item.action}
                      </Text>
                      {item.amount && item.amount !== '-' && (
                        <Tag color="green" style={{ borderRadius: 4 }}>
                          {item.amount}
                        </Tag>
                      )}
                      {item.status === 'success' ? (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      ) : item.status === 'error' ? (
                        <WarningOutlined style={{ color: '#ff4d4f' }} />
                      ) : (
                        <InfoCircleOutlined style={{ color: '#1890ff' }} />
                      )}
                    </div>
                  </List.Item>
                )}
              />
            ) : (
              <Empty description="Aucune activité récente" />
            )}
          </div>
        </Col>

        {/* Agents Registry */}
        <Col xs={24} lg={8}>
          <Title level={4} style={{ color: 'white', marginBottom: 20 }}>
            Agents Actifs ({systemStatus.active_agents})
          </Title>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {agents.length > 0 ? (
              agents.map(agent => (
                <Card 
                  key={agent.id}
                  size="small"
                  style={{ 
                    background: 'rgba(255,255,255,0.02)', 
                    border: `1px solid ${agent.status === 'active' ? `${agent.color}40` : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: 16,
                    cursor: 'pointer'
                  }}
                  onClick={() => showAgentDetails(agent)}
                  hoverable
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <Space>
                      <Avatar 
                        icon={agent.icon || <RobotOutlined />} 
                        style={{ 
                          backgroundColor: agent.status === 'active' ? agent.color : '#595959',
                          color: 'white'
                        }} 
                      />
                      <Text strong style={{ color: 'white' }}>{agent.name}</Text>
                    </Space>
                    <Switch 
                      size="small" 
                      checked={agent.status === 'active'} 
                      onChange={(e) => {
                        e.stopPropagation();
                        toggleAgentStatus(agent.id, agent.status);
                      }}
                      checkedChildren={<PlayCircleOutlined />}
                      unCheckedChildren={<StopOutlined />}
                    />
                  </div>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, display: 'block', marginBottom: 12 }}>
                    {agent.description}
                  </Text>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Statistic 
                        title={<Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Tâches</Text>} 
                        value={agent.tasks} 
                        valueStyle={{ color: 'white', fontSize: 16 }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic 
                        title={<Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Succès</Text>} 
                        value={agent.success_rate} 
                        suffix="%"
                        valueStyle={{ color: agent.success_rate > 90 ? '#52c41a' : '#faad14', fontSize: 16 }}
                      />
                    </Col>
                  </Row>
                  <Divider style={{ margin: '12px 0', borderColor: 'rgba(255,255,255,0.05)' }} />
                  <div style={{ fontSize: 11, color: agent.color || 'rgba(24,144,255,0.8)' }}>
                    <ThunderboltOutlined style={{ marginRight: 4 }} />
                    {agent.last_action}
                  </div>
                </Card>
              ))
            ) : (
              <Empty description="Aucun agent disponible" />
            )}
          </div>

          {/* Système */}
          <Card 
            style={{ 
              marginTop: 24, 
              background: 'linear-gradient(135deg, #001529 0%, #003a8c 100%)', 
              border: 'none', 
              borderRadius: 20 
            }}
          >
            <Title level={5} style={{ color: 'white' }}>Capacité Système</Title>
            <Progress 
              percent={systemStatus.capacity} 
              strokeColor={systemStatus.capacity > 80 ? '#52c41a' : '#faad14'} 
              trailColor="rgba(255,255,255,0.1)" 
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                {systemStatus.tps} tps (Tasks Per Second)
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
                {systemStatus.total_tasks} tâches totales
              </Text>
            </div>
            <Divider style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
            <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
              Taux de succès: <strong style={{ color: systemStatus.success_rate > 90 ? '#52c41a' : '#faad14' }}>
                {systemStatus.success_rate}%
              </strong>
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Modal détails agent */}
      <Modal
        title={
          <Space>
            <Avatar 
              icon={selectedAgent?.icon || <RobotOutlined />} 
              style={{ backgroundColor: selectedAgent?.color || '#1890ff' }} 
            />
            <span style={{ color: 'white' }}>{selectedAgent?.name}</span>
          </Space>
        }
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          setSelectedAgent(null);
        }}
        footer={null}
        style={{ borderRadius: 20 }}
        width={600}
      >
        {selectedAgent && (
          <div>
            <Paragraph style={{ color: 'rgba(255,255,255,0.7)' }}>
              {selectedAgent.description}
            </Paragraph>
            
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card size="small" style={{ background: 'rgba(255,255,255,0.03)', border: 'none' }}>
                  <Statistic 
                    title="Statut" 
                    value={selectedAgent.status === 'active' ? 'Actif' : 'En pause'} 
                    valueStyle={{ color: selectedAgent.status === 'active' ? '#52c41a' : '#faad14' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" style={{ background: 'rgba(255,255,255,0.03)', border: 'none' }}>
                  <Statistic 
                    title="Tâches" 
                    value={selectedAgent.tasks} 
                    valueStyle={{ color: 'white' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" style={{ background: 'rgba(255,255,255,0.03)', border: 'none' }}>
                  <Statistic 
                    title="Taux de succès" 
                    value={selectedAgent.success_rate} 
                    suffix="%"
                    valueStyle={{ color: selectedAgent.success_rate > 90 ? '#52c41a' : '#faad14' }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" style={{ background: 'rgba(255,255,255,0.03)', border: 'none' }}>
                  <Statistic 
                    title="Dernière action" 
                    value={selectedAgent.last_action || 'Aucune'} 
                    valueStyle={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}
                  />
                </Card>
              </Col>
            </Row>

            {selectedAgent.module_data && (
              <>
                <Divider style={{ borderColor: 'rgba(255,255,255,0.05)' }} />
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: 12, borderRadius: 8 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                    Données du module: {selectedAgent.module_data.name}
                    {selectedAgent.module_data.description && ` - ${selectedAgent.module_data.description}`}
                  </Text>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default NexumAgents;