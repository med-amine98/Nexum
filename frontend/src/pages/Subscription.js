import React, { useState } from 'react';
import { 
  Card, Row, Col, Statistic, Button, Space, 
  Tag, Progress, Modal, Radio, message, Descriptions,
  Typography, Divider  // ← AJOUT DE Typography ET Divider
} from 'antd';
import { 
  CrownOutlined, RocketOutlined, 
  EuroOutlined, CheckCircleOutlined,
  ArrowRightOutlined, WarningOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../services/auth';
import './Subscription.css';

const { Title, Text } = Typography;  // ← AJOUT DE Title ET Text

const Subscription = () => {
  const { user } = useAuth();
  const [changePlanModal, setChangePlanModal] = useState(false);
  const [cancelModal, setCancelModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('pro');
  const navigate = useNavigate();

  const currentPlan = {
    name: user?.subscription_tier === 'trial' ? 'Essai Gratuit (7j)' : (user?.subscription_tier === 'pro' ? 'Performance' : (user?.subscription_tier === 'enterprise' ? 'Enterprise' : 'Essentiel')),
    price: user?.subscription_tier === 'pro' ? 79 : (user?.subscription_tier === 'trial' ? 0 : 29),
    cycle: 'mensuel',
    nextBilling: user?.subscription_expires ? new Date(user.subscription_expires).toLocaleDateString() : 'N/A',
    users: 0, // À dynamiser plus tard si besoin
    storage: '0 Go / 10 Go',
    status: 'actif'
  };

  const plans = [
    { id: 'basic', name: 'Essentiel', price: 29, icon: <RocketOutlined /> },
    { id: 'pro', name: 'Performance', price: 79, icon: <CrownOutlined />, current: true },
    { id: 'enterprise', name: 'Enterprise', price: 'Sur mesure', icon: <CrownOutlined /> },
  ];

  const handleChangePlan = () => {
    message.success('Demande de changement de forfait envoyée');
    setChangePlanModal(false);
  };

  const handleCancelSubscription = () => {
    message.warning('Votre abonnement sera résilié à la fin de la période');
    setCancelModal(false);
  };

  return (
    <div className="subscription-page">
      <Title level={2}>Mon abonnement</Title>

      <Row gutter={[24, 24]}>
        {/* Plan actuel */}
        <Col xs={24} lg={16}>
          <Card className="current-plan-card">
            <div className="plan-header">
              <div>
                <Tag color="gold" icon={<CrownOutlined />}>Plan actuel</Tag>
                <Title level={3}>{currentPlan.name}</Title>
              </div>
              <div className="plan-price">
                <Title level={2}>{currentPlan.price}€</Title>
                <Text type="secondary">/{currentPlan.cycle}</Text>
              </div>
            </div>

            <Descriptions column={2} className="plan-details">
              <Descriptions.Item label="Prochain paiement">
                {currentPlan.nextBilling}
              </Descriptions.Item>
              <Descriptions.Item label="Statut">
                <Tag color="green">Actif</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Utilisateurs">
                {currentPlan.users} / 20
                <Progress percent={60} size="small" showInfo={false} />
              </Descriptions.Item>
              <Descriptions.Item label="Stockage">
                {currentPlan.storage}
                <Progress percent={45} size="small" showInfo={false} />
              </Descriptions.Item>
            </Descriptions>

            <Space className="plan-actions">
              <Button 
                type="primary"
                onClick={() => setChangePlanModal(true)}
              >
                Changer de forfait
              </Button>
              <Button 
                danger
                onClick={() => setCancelModal(true)}
              >
                Résilier l'abonnement
              </Button>
            </Space>
          </Card>
        </Col>

        {/* Résumé */}
        <Col xs={24} lg={8}>
          <Card className="summary-card">
            <Statistic 
              title="Total dépensé" 
              value={237} 
              suffix="€" 
            />
            <Divider />
            <Statistic 
              title="Prochain paiement" 
              value="79€" 
            />
            <Divider />
            <Button 
              type="link" 
              icon={<ArrowRightOutlined />}
              onClick={() => navigate('/billing')}
            >
              Voir l'historique
            </Button>
          </Card>
        </Col>
      </Row>

      {/* Modal changement de forfait */}
      <Modal
        title="Changer de forfait"
        open={changePlanModal}
        onCancel={() => setChangePlanModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setChangePlanModal(false)}>
            Annuler
          </Button>,
          <Button key="submit" type="primary" onClick={handleChangePlan}>
            Confirmer le changement
          </Button>
        ]}
      >
        <Radio.Group 
          value={selectedPlan} 
          onChange={(e) => setSelectedPlan(e.target.value)}
          className="plan-radio"
        >
          <Space direction="vertical">
            {plans.map(plan => (
              <Radio key={plan.id} value={plan.id}>
                <Space>
                  {plan.icon}
                  <strong>{plan.name}</strong>
                  {typeof plan.price === 'number' ? `${plan.price}€` : plan.price}
                  {plan.current && <Tag color="gold">Actuel</Tag>}
                </Space>
              </Radio>
            ))}
          </Space>
        </Radio.Group>
      </Modal>

      {/* Modal résiliation */}
      <Modal
        title="Résilier l'abonnement"
        open={cancelModal}
        onCancel={() => setCancelModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setCancelModal(false)}>
            Garder mon abonnement
          </Button>,
          <Button key="submit" danger onClick={handleCancelSubscription}>
            Confirmer la résiliation
          </Button>
        ]}
      >
        <div className="cancel-warning">
          <WarningOutlined style={{ color: '#faad14', fontSize: 48, marginBottom: 16 }} />
          <Title level={4}>Êtes-vous sûr de vouloir résilier ?</Title>
          <Text type="secondary">
            Votre abonnement restera actif jusqu'au {currentPlan.nextBilling}. 
            Passé cette date, vous perdrez l'accès à toutes les fonctionnalités premium.
          </Text>
        </div>
      </Modal>
    </div>
  );
};

export default Subscription;