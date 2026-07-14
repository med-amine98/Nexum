import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Typography, Card, Avatar, Button, Space } from 'antd';
import { 
  BankOutlined, 
  SafetyCertificateOutlined, 
  RiseOutlined,
  ArrowLeftOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import MagicTask from '../components/AI/MagicTask';
import './AssistantWorkspace.css';

const { Content } = Layout;
const { Title, Text } = Typography;

const assistantsData = {
  'predict': {
    name: 'Nexy Predict',
    color: '#1890ff',
    icon: <BankOutlined />,
    title: 'Espace Nexy Predict',
    description: 'Votre assistant financier personnel',
    magicTasks: [
      { id: 1, title: 'Optimisation de Trésorerie', description: 'Analyser les flux pour suggérer un placement à court terme (gain estimé: 2.4%)', impact: '+2.4% ROI' },
      { id: 2, title: 'Alerte Churn Prédictive', description: 'Identifier les 5 clients à risque de départ ce mois-ci et préparer une offre.', impact: '-15% Attrition' }
    ]
  },
  'risk': {
    name: 'Nexy Risk',
    color: '#52c41a',
    icon: <SafetyCertificateOutlined />,
    title: 'Espace Nexy Risk',
    description: 'Votre expert en gestion des risques',
    magicTasks: [
      { id: 1, title: 'Audit de Conformité Flash', description: 'Scanner les dernières transactions pour conformité RGPD/TRACFIN.', impact: '100% Secure' },
      { id: 2, title: 'Détection de Fraude GNN', description: 'Lancer une analyse de graphe sur les nouveaux partenaires enregistrés.', impact: 'High Accuracy' }
    ]
  },
  'growth': {
    name: 'Nexy Growth',
    color: '#722ed1',
    icon: <RiseOutlined />,
    title: 'Espace Nexy Growth',
    description: 'Votre conseiller en croissance commerciale',
    magicTasks: [
      { id: 1, title: 'Expansion de Marché', description: 'Comparer les tendances actuelles avec les opportunités du secteur Tech.', impact: 'Growth Opportunity' },
      { id: 2, title: 'Optimisation de Pricing', description: 'Suggérer une mise à jour des prix basée sur l\'analyse concurrentielle.', impact: '+5% Revenue' }
    ]
  }
};

const AssistantWorkspace = () => {
  const { assistantId } = useParams();
  const navigate = useNavigate();
  const assistant = assistantsData[assistantId];

  useEffect(() => {
    if (!assistant) {
      navigate('/');
    }
  }, [assistant, navigate]);

  if (!assistant) return null;

  const handleMagicTask = (task) => {
  };

  return (
    <Layout className="assistant-workspace">
      <Content className="workspace-content">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate(-1)}
            className="back-button"
            style={{ marginBottom: 20 }}
          >
            Retour
          </Button>

          <Card className="workspace-card">
            <div className="workspace-header" style={{ marginBottom: 30 }}>
              <Avatar 
                icon={assistant.icon}
                size={80}
                style={{ backgroundColor: assistant.color, boxShadow: `0 0 20px ${assistant.color}44` }}
              />
              <div className="workspace-title" style={{ marginLeft: 20 }}>
                <Title level={2} style={{ color: assistant.color, margin: 0 }}>
                  {assistant.name}
                </Title>
                <Text type="secondary">{assistant.description}</Text>
              </div>
            </div>

            <div className="workspace-body">
              <Title level={4} style={{ marginBottom: 20, color: 'white' }}>
                <ThunderboltOutlined style={{ marginRight: 10, color: '#722ed1' }} />
                Tâches Magiques suggérées
              </Title>
              
              <div className="magic-tasks-grid">
                {assistant.magicTasks.map(task => (
                  <MagicTask 
                    key={task.id} 
                    task={task} 
                    onComplete={handleMagicTask} 
                  />
                ))}
              </div>

              <div style={{ marginTop: 40 }}>
                <Text type="secondary">Plus de fonctionnalités pour {assistant.name} à venir...</Text>
              </div>
            </div>
          </Card>
        </motion.div>
      </Content>
    </Layout>
  );
};

export default AssistantWorkspace;