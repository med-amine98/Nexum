import React from 'react';
import { Card, Result, Button, Space } from 'antd';
import { CloseCircleOutlined, ArrowLeftOutlined, HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

const PaymentCancel = () => {
  const navigate = useNavigate();

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
          icon={<CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 72 }} />}
          status="error"
          title="Paiement annulé"
          subTitle="Votre paiement a été annulé. Aucun montant n'a été débité."
        />

        <Space size="middle" style={{ marginTop: 24 }}>
          <Button 
            type="primary" 
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/payment')}
          >
            Réessayer
          </Button>
          <Button 
            icon={<HomeOutlined />}
            onClick={() => navigate('/pricing')}
          >
            Voir les offres
          </Button>
        </Space>
      </Card>
    </div>
  );
};

export default PaymentCancel;