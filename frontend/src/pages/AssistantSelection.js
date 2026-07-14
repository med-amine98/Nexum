import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Layout, Typography, Button, Card, Space, 
  Avatar, Tag, Divider, Progress, message 
} from 'antd';
import { 
  BankOutlined, 
  SafetyCertificateOutlined, 
  RiseOutlined,
  RocketOutlined,
  ArrowRightOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  CloseOutlined
} from '@ant-design/icons';
import { useAssistant } from '../context/AssistantContext';
import { useTranslation } from 'react-i18next';
import './AssistantSelection.css';

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const colors = {
  bgPrimary: '#020617',
  bgSecondary: '#0f172a',
  accent: 'var(--warning)',
  textPrimary: '#f8fafc',
  textSecondary: '#94a3b8',
  glass: 'rgba(15, 23, 42, 0.7)',
  border: 'rgba(255, 255, 255, 0.08)',
};

// Configuration des 3 Piliers d'Intelligence (Elena, Sophie, James)
const getGuardians = (t) => [
  {
    id: 'predict',
    name: 'ELENA',
    role: t('financial_intelligence'),
    color: colors.accent,
    icon: <BankOutlined />,
    description: t('elena_short_desc'),
    longDescription: t('elena_long_desc'),
    powers: [
      { name: t('analytical_precision'), value: 99 },
      { name: t('ai_anti_fraud'), value: 98 },
      { name: t('flow_forecast'), value: 96 },
      { name: t('regulatory_audit'), value: 97 }
    ],
    background: `linear-gradient(135deg, ${colors.bgSecondary} 0%, ${colors.bgPrimary} 100%)`,
    features: [
      t('real_time_solvency_analysis'),
      t('suspicious_transaction_detection'),
      t('3_month_cash_forecast'),
      t('automated_regulatory_reporting')
    ]
  },
  {
    id: 'risk',
    name: 'JAMES',
    role: t('risk_intelligence'),
    color: colors.accent,
    icon: <SafetyCertificateOutlined />,
    description: t('james_short_desc'),
    longDescription: t('james_long_desc'),
    powers: [
      { name: t('risk_assessment'), value: 98 },
      { name: t('claims_automation'), value: 97 },
      { name: t('global_compliance'), value: 95 },
      { name: t('catastrophe_analysis'), value: 94 }
    ],
    background: `linear-gradient(135deg, ${colors.bgSecondary} 0%, ${colors.bgPrimary} 100%)`,
    features: [
      t('claims_processing_automation'),
      t('client_risk_assessment'),
      t('natural_catastrophe_modeling'),
      t('insurance_fraud_detection')
    ]
  },
  {
    id: 'growth',
    name: 'SOPHIE',
    role: t('growth_optimization'),
    color: colors.accent,
    icon: <RiseOutlined />,
    description: t('sophie_short_desc'),
    longDescription: t('sophie_long_desc'),
    powers: [
      { name: t('lead_scoring'), value: 97 },
      { name: t('churn_prediction'), value: 98 },
      { name: t('sales_conversion'), value: 95 },
      { name: t('market_intelligence'), value: 94 }
    ],
    background: `linear-gradient(135deg, ${colors.bgSecondary} 0%, ${colors.bgPrimary} 100%)`,
    features: [
      t('predictive_sales_analysis'),
      t('attrition_risk_identification'),
      t('cross_selling_recommendations'),
      t('sales_pipeline_optimization')
    ]
  }
];

const AssistantSelection = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const guardians = getGuardians(t);
  const { setSelectedAssistant } = useAssistant();
  const [hoveredId, setHoveredId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let timer;
    if (showConfirmation) {
      timer = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(timer);
            return 100;
          }
          return prev + 10;
        });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [showConfirmation]);

  useEffect(() => {
    if (progress === 100) {
      setTimeout(() => {
        navigate('/dashboard');
      }, 500);
    }
  }, [progress, navigate]);

  const handleSelectAssistant = (guardian) => {
    setSelectedId(guardian.id);
    setSelectedAssistant(guardian);
    setShowConfirmation(true);
    message.success(t('assistant_chosen_success', { name: guardian.name }));
  };

  return (
    <Layout className="assistant-selection-layout" style={{ background: colors.bgPrimary, minHeight: '100vh' }}>
      <Content className="assistant-selection-content" style={{ padding: '60px 24px' }}>
        {/* Bannière */}
        <div className="selection-header" style={{ textAlign: 'center', marginBottom: 60 }}>
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Title level={1} className="selection-title" style={{ color: colors.textPrimary, fontSize: 48, fontWeight: 900 }}>
              {t('select_your')} <span style={{ color: colors.accent }}>{t('dedicated_assistant')}</span>
            </Title>
            <Paragraph className="selection-subtitle" style={{ color: colors.textSecondary, fontSize: 18, maxWidth: 800, margin: '0 auto' }}>
              {t('assistant_selection_desc')}
            </Paragraph>
          </motion.div>
        </div>

        {/* Cartes des assistants */}
        <div className="guardians-container">
          <AnimatePresence>
            {guardians.map((guardian, index) => (
              <motion.div
                key={guardian.id}
                className={`guardian-card-wrapper ${selectedId === guardian.id ? 'selected' : ''}`}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.2 }}
                onHoverStart={() => !selectedId && setHoveredId(guardian.id)}
                onHoverEnd={() => !selectedId && setHoveredId(null)}
              >
                <Card
                  className={`guardian-card ${hoveredId === guardian.id ? 'hovered' : ''} 
                    ${selectedId === guardian.id ? 'selected' : ''}`}
                  style={{
                    background: colors.glass,
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${colors.border}`,
                    borderRadius: 32,
                    borderTop: `6px solid ${guardian.color}`,
                    boxShadow: hoveredId === guardian.id 
                      ? `0 20px 60px ${guardian.color}30` 
                      : '0 10px 30px rgba(0,0,0,0.3)'
                  }}
                >
                  {/* En-tête */}
                  <div className="guardian-card-header">
                    <div 
                      className="guardian-avatar"
                      style={{ background: guardian.background }}
                    >
                      <Avatar 
                        size={80} 
                        icon={guardian.icon} 
                        style={{ 
                          backgroundColor: 'transparent',
                          color: 'white',
                          fontSize: 40
                        }} 
                      />
                    </div>
                    <div className="guardian-titles">
                      <Title level={2} style={{ color: guardian.color, margin: 0 }}>
                        {guardian.name}
                      </Title>
                      <Tag color={guardian.color} style={{ fontSize: 16, padding: '4px 12px' }}>
                        {guardian.role}
                      </Tag>
                    </div>
                  </div>

                  <Divider style={{ borderColor: colors.border }} />

                  {/* Description */}
                  <Paragraph className="guardian-description" style={{ color: colors.textSecondary, fontSize: 15, lineHeight: 1.6 }}>
                    {guardian.longDescription}
                  </Paragraph>

                  {/* Pouvoirs */}
                  <div className="guardian-powers">
                    <Title level={5} style={{ color: colors.textPrimary, marginBottom: 16 }}>{t('key_expertise')}</Title>
                    {guardian.powers.map(power => (
                      <div key={power.name} className="power-item" style={{ marginBottom: 12 }}>
                        <div className="power-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ color: colors.textSecondary }}>{power.name}</span>
                          <span style={{ color: colors.accent, fontWeight: 700 }}>{power.value}%</span>
                        </div>
                        <Progress 
                          percent={power.value} 
                          strokeColor={colors.accent}
                          showInfo={false}
                          size="small"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Features */}
                  <div className="guardian-features">
                    {guardian.features.map((feature, idx) => (
                      <div key={idx} className="feature-item">
                        <CheckCircleOutlined style={{ color: guardian.color }} />
                        <Text style={{ color: colors.textSecondary }}>{feature}</Text>
                      </div>
                    ))}
                  </div>

                  {/* Bouton de sélection */}
                  {!selectedId && (
                  <Button
                    type="primary"
                    size="large"
                    block
                    icon={<ArrowRightOutlined />}
                    onClick={() => handleSelectAssistant(guardian)}
                    style={{ 
                      backgroundColor: colors.accent,
                      borderColor: colors.accent,
                      color: colors.bgPrimary,
                      marginTop: 30,
                      height: 54,
                      fontSize: 16,
                      fontWeight: 800,
                      borderRadius: 14,
                      boxShadow: `0 8px 24px ${colors.accent}40`
                    }}
                    className="select-button"
                  >
                    {t('deploy')} {guardian.name}
                  </Button>
                  )}

                  {/* Overlay de sélection */}
                  {selectedId === guardian.id && (
                    <motion.div
                      className="selected-overlay"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      style={{ 
                        background: 'rgba(2, 6, 23, 0.95)',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        zIndex: 10,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 32
                      }}
                    >
                      <div className="selected-content" style={{ textAlign: 'center' }}>
                        <Avatar 
                          size={100} 
                          icon={guardian.icon} 
                          style={{ 
                            backgroundColor: colors.accent,
                            color: colors.bgPrimary,
                            fontSize: 50,
                            marginBottom: 24,
                            boxShadow: `0 0 40px ${colors.accent}40`
                          }} 
                        />
                        <Title level={3} style={{ color: colors.textPrimary, marginBottom: 24 }}>
                          {t('initializing')}
                        </Title>
                        <Progress
                          type="circle"
                          percent={progress}
                          strokeColor={colors.accent}
                          width={80}
                          format={() => <span style={{ color: colors.accent }}>{progress}%</span>}
                        />
                        <div style={{ marginTop: 24 }}>
                          <Text style={{ color: colors.textSecondary }}>
                            {t('configuring_ecosystem')}
                          </Text>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Pied de page */}
        <div className="selection-footer" style={{ textAlign: 'center', marginTop: 40 }}>
          <Space>
            <SafetyCertificateOutlined style={{ color: colors.accent }} />
            <Text style={{ color: colors.textSecondary }}>
              {t('secured_by_nexum')}
            </Text>
          </Space>
        </div>
      </Content>
    </Layout>
  );
};

export default AssistantSelection;