import React, { useState } from 'react';
import { Card, Row, Col, Typography, Space, Button, Timeline, Tag, Badge, Result, Progress, Modal, Divider, message } from 'antd';
import { 
  DeploymentUnitOutlined, 
  SafetyCertificateOutlined, 
  ThunderboltOutlined,
  CheckCircleOutlined,
  GlobalOutlined,
  NodeIndexOutlined,
  WalletOutlined,
  CameraOutlined,
  EuroOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import './SmartClaims.css';

import api from '../../services/api';

const { Title, Text } = Typography;

const SmartClaims = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [txHash, setTxHash] = useState(null);
  const [blockchainStats, setBlockchainStats] = useState(null);

  const handleProcess = async () => {
    setLoading(true);
    setStep(1);
    
    try {
      // Simulation des étapes de vérification IA + Oracle
      for (let i = 2; i <= 5; i++) {
        setStep(i);
        await new Promise(r => setTimeout(r, 1000));
      }

      // Appel réel au backend pour obtenir le statut blockchain
      const response = await api.get('/intelligence/claims/blockchain/status');
      const data = response.data;
      setBlockchainStats(data);
      
      if (data.recent_transactions.length > 0) {
        setTxHash(data.recent_transactions[0].hash);
      }
      
      setStep(6);
    } catch (error) {
      console.error("Erreur Blockchain:", error);
      message.error("Échec de la validation blockchain.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="smart-claims-container">
      <div className="smart-claims-header">
        <Space size="large">
          <NodeIndexOutlined style={{ fontSize: 40, color: '#52c41a' }} />
          <div>
            <Title level={2} style={{ color: 'white', margin: 0 }}>SMART-CONTRACT CLAIMS <Tag color="green">SECURE</Tag></Title>
            <Text style={{ color: 'rgba(255,255,255,0.6)' }}>Autonomous Blockchain Indemnification System</Text>
          </div>
        </Space>
      </div>

      <Row gutter={[32, 32]} style={{ marginTop: 40 }}>
        <Col xs={24} lg={12}>
          <Card className="smart-card" title="INDEMNIFICATION FLOW">
            <Timeline
              pending={loading ? "Executing Smart Contract..." : false}
              items={[
                { label: '0s', children: 'Claim Initiated by User', color: 'blue', dot: <CameraOutlined /> },
                { label: '1.2s', children: 'AI Damage Analysis (YOLO)', color: step >= 1 ? 'green' : 'gray', dot: step >= 1 && <CheckCircleOutlined /> },
                { label: '2.4s', children: 'NVIDIA Earth-2 Oracle Verification', color: step >= 3 ? 'green' : 'gray', dot: step >= 3 && <GlobalOutlined /> },
                { label: '4.8s', children: 'Smart Contract Payment Authorization', color: step >= 5 ? 'green' : 'gray', dot: step >= 5 && <SafetyCertificateOutlined /> },
                { label: '6.0s', children: 'Funds Released to Blockchain', color: step >= 6 ? 'green' : 'gray', dot: step >= 6 && <WalletOutlined /> },
              ]}
              mode="left"
              style={{ color: 'white', marginTop: 24 }}
            />
            {!loading && step === 0 && (
              <Button type="primary" block size="large" icon={<ThunderboltOutlined />} onClick={handleProcess} style={{ marginTop: 24, background: '#52c41a', border: 'none' }}>
                TRIGGER AUTONOMOUS CLAIM
              </Button>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <AnimatePresence>
            {txHash && (
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                <Card className="smart-card glass-card" style={{ textAlign: 'center' }}>
                  <Result
                    status="success"
                    title={<span style={{ color: 'white' }}>Indemnification Successful</span>}
                    subTitle={<span style={{ color: 'rgba(255,255,255,0.6)' }}>The payment has been autonomously processed by the Nexum Blockchain Oracle.</span>}
                    extra={[
                      <div key="details" style={{ background: 'rgba(0,0,0,0.3)', padding: 16, borderRadius: 8, textAlign: 'left', marginBottom: 16 }}>
                        <Text type="secondary" style={{ color: '#52c41a' }}>Transaction Hash:</Text><br />
                        <Text code style={{ fontSize: 11 }}>{txHash}</Text><br />
                        <Divider style={{ margin: '8px 0', borderColor: 'rgba(255,255,255,0.1)' }} />
                        <Text type="secondary" style={{ color: '#52c41a' }}>Amount Paid:</Text><br />
                        <Title level={3} style={{ color: 'white', margin: 0 }}>1,450.00 €</Title>
                      </div>,
                      <Button key="explorer" ghost block>View on Nexum Explorer</Button>
                    ]}
                  />
                </Card>
              </motion.div>
            )}
            {!txHash && !loading && (
              <Card className="smart-card empty-card" style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ textAlign: 'center', opacity: 0.5 }}>
                  <DeploymentUnitOutlined style={{ fontSize: 80, marginBottom: 16 }} />
                  <p>Wait for autonomous process to start...</p>
                </div>
              </Card>
            )}
            {loading && (
              <Card className="smart-card">
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Progress type="circle" percent={Math.round((step/6)*100)} strokeColor="#52c41a" />
                  <div style={{ marginTop: 24 }}>
                    <Text strong style={{ color: 'white' }}>Executing Cross-Chain Protocol...</Text>
                  </div>
                </div>
              </Card>
            )}
          </AnimatePresence>
        </Col>
      </Row>

      <style jsx>{`
        .smart-claims-container {
          background: #050811;
          min-height: 100vh;
          padding: 40px;
        }
        .smart-card {
          background: rgba(16, 22, 38, 0.8) !important;
          border: 1px solid rgba(255, 255, 255, 0.05) !important;
          border-radius: 12px !important;
          backdrop-filter: blur(10px);
        }
        .smart-card .ant-card-head {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          color: #52c41a !important;
        }
        .glass-card {
          border: 1px solid rgba(82, 196, 26, 0.3) !important;
          box-shadow: 0 0 20px rgba(82, 196, 26, 0.1);
        }
        .empty-card { background: transparent !important; border: 2px dashed rgba(255,255,255,0.05) !important; }
      `}</style>
    </div>
  );
};

export default SmartClaims;
