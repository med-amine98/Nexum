import React, { useEffect } from 'react';
import { Card, Result, Button, Space, Typography } from 'antd';
import { CheckCircleOutlined, DownloadOutlined, HomeOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import './PaymentSuccess.css';

const { Title, Text } = Typography;

// Fonction de confettis maison (simplifiée)
const launchConfetti = () => {
  const colors = ['#52c41a', '#1890ff', '#722ed1', '#faad14'];
  
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.style.position = 'fixed';
    confetti.style.width = '10px';
    confetti.style.height = '10px';
    confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    confetti.style.borderRadius = '50%';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.top = '-10px';
    confetti.style.zIndex = '9999';
    confetti.style.pointerEvents = 'none';
    confetti.style.animation = `fall ${Math.random() * 3 + 2}s linear forwards`;
    document.body.appendChild(confetti);

    setTimeout(() => {
      confetti.remove();
    }, 5000);
  }

  // Ajouter l'animation CSS dynamiquement si elle n'existe pas
  if (!document.getElementById('confetti-style')) {
    const style = document.createElement('style');
    style.id = 'confetti-style';
    style.innerHTML = `
      @keyframes fall {
        to {
          transform: translateY(100vh) rotate(360deg);
        }
      }
    `;
    document.head.appendChild(style);
  }
};

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { plan, amount } = location.state || { plan: 'standard', amount: 0 };

  useEffect(() => {
    launchConfetti();
  }, []);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '80vh',
      padding: 24
    }}>
      <Card style={{ maxWidth: 600, width: '100%', textAlign: 'center' }}>
        <Result
          icon={<CheckCircleOutlined style={{ color: '#52c41a', fontSize: 72 }} />}
          status="success"
          title="Paiement réussi !"
          subTitle={`Votre abonnement au forfait ${plan} a été activé. Montant : ${amount}€`}
        />

        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Title level={4}>Prochaines étapes</Title>
            <Space direction="vertical">
              <Text>✓ Vous allez recevoir un email de confirmation</Text>
              <Text>✓ Votre espace est maintenant accessible</Text>
              <Text>✓ Profitez de toutes les fonctionnalités</Text>
            </Space>
          </div>

          <Space size="middle">
            <Button 
              type="primary" 
              icon={<HomeOutlined />}
              onClick={() => navigate('/dashboard')}
            >
              Accéder au dashboard
            </Button>
            <Button 
              icon={<DownloadOutlined />}
              onClick={() => window.print()}
            >
              Télécharger la facture
            </Button>
          </Space>
        </Space>
      </Card>
    </div>
  );
};

export default PaymentSuccess;