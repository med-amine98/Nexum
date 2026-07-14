// src/modules/insurance/WarrantyRecommender.js
import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Button, Tag, Rate, 
  Progress, Alert, Avatar, Space,
  Typography, message, Modal,
  Divider, Spin, Statistic, Tabs, Tooltip,
  Badge, Descriptions, Form, Select,
  InputNumber, Checkbox, Input, Switch
} from 'antd';
import { 
  SafetyOutlined, ThunderboltOutlined,
  HomeOutlined, CarOutlined, HeartOutlined,
  CheckCircleOutlined, 
  SafetyCertificateOutlined, TrophyOutlined, RocketOutlined,
  FileTextOutlined, ExperimentOutlined,
  WarningOutlined, SearchOutlined,
  FilterOutlined, RobotOutlined, BulbOutlined,
  PlusOutlined, CalculatorOutlined, CrownOutlined,
  StarOutlined, TeamOutlined, ClockCircleOutlined
} from '@ant-design/icons';
import api from '../../services/axiosConfig';
import './WarrantyRecommender.css';

const { Title, Text } = Typography;
const { Option } = Select;
const WarrantyRecommender = () => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedWarranty, setSelectedWarranty] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('recommendations');
  const [myWarranties, setMyWarranties] = useState([]);
  const [showPredictionForm, setShowPredictionForm] = useState(false);
  const [showAddWarrantyForm, setShowAddWarrantyForm] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [addingWarranty, setAddingWarranty] = useState(false);
  const [predictionForm] = Form.useForm();
  const [addWarrantyForm] = Form.useForm();
  const [stats, setStats] = useState({
    total_saved: 0,
    active_warranties: 0,
    coverage_total: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recRes, warrantiesRes] = await Promise.all([
        api.get('/insurance/warranty-recommendations'),
        api.get('/insurance/my-warranties')
      ]);
      
      setProfile(recRes.data.profile);
      setRecommendations(recRes.data.recommendations);
      setMyWarranties(warrantiesRes.data || []);
      
      const activeWarranties = warrantiesRes.data?.filter(w => w.status === 'active') || [];
      const totalCoverage = activeWarranties.reduce((sum, w) => sum + (w.warranty?.coverage || 0), 0);
      
      setStats({
        total_saved: 0,
        active_warranties: activeWarranties.length,
        coverage_total: totalCoverage
      });
    } catch (error) {
      console.error('Erreur chargement:', error);
      message.error('Erreur de chargement des recommandations');
    } finally {
      setLoading(false);
    }
  };

  const subscribeWarranty = async (warrantyId) => {
    try {
      await api.post('/insurance/subscribe-warranty', { warranty_id: warrantyId });
      message.success('Garantie souscrite avec succès !');
      setModalVisible(false);
      fetchData();
    } catch (error) {
      message.error('Erreur lors de la souscription');
    }
  };

  const handlePredict = async (values) => {
    setPredicting(true);
    try {
      const response = await api.post('/insurance/analyze-case', values);
      setPredictionResult(response.data);
      setRecommendations(response.data.recommendations);
      message.success('Prédiction terminée !');
      setShowPredictionForm(false);
      predictionForm.resetFields();
    } catch (error) {
      console.error('Erreur prédiction:', error);
      message.error('Erreur lors de la prédiction');
    } finally {
      setPredicting(false);
    }
  };

  const handleAddWarranty = async (values) => {
    setAddingWarranty(true);
    try {
      await api.post('/insurance/warranties', values);
      message.success('Garantie ajoutée avec succès !');
      setShowAddWarrantyForm(false);
      addWarrantyForm.resetFields();
      fetchData();
    } catch (error) {
      console.error('Erreur ajout:', error);
      message.error('Erreur lors de l\'ajout de la garantie');
    } finally {
      setAddingWarranty(false);
    }
  };

  const getRiskColor = (level) => {
    const colors = { 
      low: '#00d4ff', 
      medium: '#ffb700', 
      high: '#ff4757' 
    };
    return colors[level] || '#1890ff';
  };

  const getRiskGradient = (level) => {
    const gradients = {
      low: 'linear-gradient(135deg, #00d4ff 0%, #00b8d4 100%)',
      medium: 'linear-gradient(135deg, #ffb700 0%, #ff8f00 100%)',
      high: 'linear-gradient(135deg, #ff4757 0%, #c0392b 100%)'
    };
    return gradients[level] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#00d4ff';
    if (score >= 70) return '#4a90e2';
    if (score >= 60) return '#ffb700';
    return '#ff4757';
  };

  const getIconForType = (type) => {
    const icons = {
      home: <HomeOutlined />,
      car: <CarOutlined />,
      health: <HeartOutlined />,
      life: <HeartOutlined />,
      travel: <RocketOutlined />,
      electronics: <ThunderboltOutlined />
    };
    return icons[type] || <SafetyOutlined />;
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: '#0a0a0a'
      }}>
        <Spin size="large" tip="Chargement..." style={{ color: '#00d4ff' }} />
      </div>
    );
  }

  return (
    <div style={{ 
      padding: 24, 
      background: '#0a0a0a',
      minHeight: '100vh',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      {/* En-tête avec design sombre et élégant */}
      <div style={{ 
        background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0d0d0d 100%)',
        borderRadius: 24,
        padding: '40px 48px',
        marginBottom: 32,
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(0,212,255,0.03) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute',
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(100,100,255,0.03) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />
        
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="large">
              <div style={{ 
                width: 80, 
                height: 80, 
                background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(0,212,255,0.3)',
                position: 'relative'
              }}>
                <SafetyCertificateOutlined style={{ fontSize: 40, color: 'white' }} />
                <div style={{
                  position: 'absolute',
                  top: -4,
                  right: -4,
                  width: 24,
                  height: 24,
                  background: '#00d4ff',
                  borderRadius: '50%',
                  border: '2px solid #0a0a0a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: 'white'
                }}>
                  AI
                </div>
              </div>
              <div>
                <Title level={2} style={{ 
                  margin: 0, 
                  color: 'white',
                  fontWeight: 700,
                  letterSpacing: '-0.5px',
                  background: 'linear-gradient(135deg, #ffffff 0%, #a0a0a0 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>
                  Garanties Personnalisées
                </Title>
                <Text style={{ 
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: 16,
                  fontWeight: 300
                }}>
                  Prédiction intelligente et gestion optimisée des garanties
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space size="middle">
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                padding: '8px 16px',
                borderRadius: 12,
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <Space>
                  <Badge 
                    count={stats.active_warranties} 
                    style={{ 
                      backgroundColor: '#00d4ff',
                      boxShadow: '0 0 20px rgba(0,212,255,0.3)'
                    }}
                  >
                    <SafetyCertificateOutlined style={{ color: 'rgba(255,255,255,0.7)', fontSize: 20 }} />
                  </Badge>
                  <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Mes garanties</Text>
                </Space>
              </div>
              <Button 
                icon={<CalculatorOutlined />} 
                onClick={() => setShowPredictionForm(true)}
                style={{
                  background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
                  border: 'none',
                  color: 'white',
                  fontWeight: 500,
                  boxShadow: '0 4px 20px rgba(0,212,255,0.3)',
                  borderRadius: 12,
                  height: 40,
                  padding: '0 24px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 30px rgba(0,212,255,0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 20px rgba(0,212,255,0.3)';
                }}
              >
                Prédire
              </Button>
              <Button 
                icon={<PlusOutlined />} 
                type="primary" 
                onClick={() => setShowAddWarrantyForm(true)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  borderRadius: 12,
                  height: 40,
                  padding: '0 24px',
                  backdropFilter: 'blur(10px)'
                }}
              >
                Ajouter une garantie
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Modal de prédiction avec design sombre */}
      <Modal
        title={
          <Space style={{ color: 'white' }}>
            <RobotOutlined style={{ color: '#00d4ff' }} />
            <span style={{ fontWeight: 600 }}>Prédiction de garantie</span>
          </Space>
        }
        open={showPredictionForm}
        onCancel={() => setShowPredictionForm(false)}
        footer={null}
        width={700}
        style={{ top: 20 }}
        bodyStyle={{
          background: '#1a1a1a',
          borderRadius: 12,
          padding: '24px'
        }}
        modalRender={(modal) => (
          <div style={{ 
            background: '#1a1a1a',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.9)'
          }}>
            {modal}
          </div>
        )}
      >
        <Form 
          form={predictionForm} 
          layout="vertical" 
          onFinish={handlePredict}
          style={{ color: 'rgba(255,255,255,0.85)' }}
        >
          <Title level={5} style={{ color: '#00d4ff', fontWeight: 600 }}>📋 Informations générales</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="type" label="Type de garantie" rules={[{ required: true }]}>
                <Select 
                  placeholder="Sélectionnez"
                  style={{ background: '#2a2a2a' }}
                  dropdownStyle={{ background: '#2a2a2a' }}
                >
                  <Option value="home">🏠 Habitation</Option>
                  <Option value="car">🚗 Automobile</Option>
                  <Option value="health">❤️ Santé</Option>
                  <Option value="life">👨‍👩‍👧‍👦 Vie</Option>
                  <Option value="travel">✈️ Voyage</Option>
                  <Option value="electronics">💻 Électronique</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="value" label="Valeur à protéger (€)" rules={[{ required: true }]}>
                <InputNumber 
                  style={{ width: '100%', background: '#2a2a2a' }} 
                  min={0} 
                  max={1000000} 
                  placeholder="250000"
                />
              </Form.Item>
            </Col>
          </Row>

          <Title level={5} style={{ color: '#00d4ff', fontWeight: 600, marginTop: 16 }}>👤 Informations personnelles</Title>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="age" label="Âge">
                <InputNumber style={{ width: '100%', background: '#2a2a2a' }} min={18} max={100} placeholder="35" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="annual_income" label="Revenu annuel (€)">
                <InputNumber style={{ width: '100%', background: '#2a2a2a' }} min={0} max={500000} placeholder="50000" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="credit_score" label="Score de crédit">
                <Select 
                  placeholder="Sélectionnez"
                  style={{ background: '#2a2a2a' }}
                  dropdownStyle={{ background: '#2a2a2a' }}
                >
                  <Option value={850}>Excellent (750+)</Option>
                  <Option value={700}>Bon (700-749)</Option>
                  <Option value={650}>Moyen (650-699)</Option>
                  <Option value={550}>Faible (550-649)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Title level={5} style={{ color: '#00d4ff', fontWeight: 600, marginTop: 16 }}>⚠️ Situation et risque</Title>
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="previous_claims" label="Sinistres antérieurs">
                <InputNumber style={{ width: '100%', background: '#2a2a2a' }} min={0} max={10} placeholder="0" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="location" label="Zone géographique">
                <Select 
                  placeholder="Sélectionnez"
                  style={{ background: '#2a2a2a' }}
                  dropdownStyle={{ background: '#2a2a2a' }}
                >
                  <Option value="low_risk">Faible risque</Option>
                  <Option value="medium_risk">Risque modéré</Option>
                  <Option value="high_risk">Risque élevé</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="health_status" label="État de santé">
                <Select 
                  placeholder="Sélectionnez"
                  style={{ background: '#2a2a2a' }}
                  dropdownStyle={{ background: '#2a2a2a' }}
                >
                  <Option value="excellent">Excellent</Option>
                  <Option value="good">Bon</Option>
                  <Option value="fair">Moyen</Option>
                  <Option value="poor">Médiocre</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Title level={5} style={{ color: '#00d4ff', fontWeight: 600, marginTop: 16 }}>🛡️ Options de couverture</Title>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="coverage_level" label="Niveau de couverture">
                <Select 
                  placeholder="Sélectionnez"
                  style={{ background: '#2a2a2a' }}
                  dropdownStyle={{ background: '#2a2a2a' }}
                >
                  <Option value="basic">Basique</Option>
                  <Option value="standard">Standard</Option>
                  <Option value="premium">Premium</Option>
                  <Option value="ultimate">Ultime</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="payment_method" label="Mode de paiement">
                <Select 
                  placeholder="Sélectionnez"
                  style={{ background: '#2a2a2a' }}
                  dropdownStyle={{ background: '#2a2a2a' }}
                >
                  <Option value="monthly">Mensuel</Option>
                  <Option value="yearly">Annuel (-8%)</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="hasFamily" valuePropName="checked">
                <Checkbox style={{ color: 'rgba(255,255,255,0.85)' }}>Personnes à charge</Checkbox>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="existingInsurance" valuePropName="checked">
                <Checkbox style={{ color: 'rgba(255,255,255,0.85)' }}>Assurance similaire existante</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                icon={<CalculatorOutlined />} 
                loading={predicting}
                style={{
                  background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
                  border: 'none',
                  fontWeight: 500,
                  boxShadow: '0 4px 20px rgba(0,212,255,0.3)',
                  borderRadius: 8
                }}
              >
                Prédire
              </Button>
              <Button 
                onClick={() => setShowPredictionForm(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.85)'
                }}
              >
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal d'ajout de garantie avec design sombre */}
      <Modal
        title={
          <Space style={{ color: 'white' }}>
            <PlusOutlined style={{ color: '#00d4ff' }} />
            <span style={{ fontWeight: 600 }}>Ajouter une garantie</span>
          </Space>
        }
        open={showAddWarrantyForm}
        onCancel={() => setShowAddWarrantyForm(false)}
        footer={null}
        width={600}
        style={{ top: 20 }}
        bodyStyle={{
          background: '#1a1a1a',
          borderRadius: 12,
          padding: '24px'
        }}
        modalRender={(modal) => (
          <div style={{ 
            background: '#1a1a1a',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.9)'
          }}>
            {modal}
          </div>
        )}
      >
        <Form form={addWarrantyForm} layout="vertical" onFinish={handleAddWarranty}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Nom de la garantie" rules={[{ required: true }]}>
                <Input placeholder="Ex: Protection Habitation" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                <Select placeholder="Sélectionnez">
                  <Option value="home">Habitation</Option>
                  <Option value="car">Automobile</Option>
                  <Option value="health">Santé</Option>
                  <Option value="life">Vie</Option>
                  <Option value="travel">Voyage</Option>
                  <Option value="electronics">Électronique</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Description" rules={[{ required: true }]}>
            <Input.TextArea rows={3} placeholder="Description de la garantie" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="coverage_amount" label="Montant de couverture (€)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} max={1000000} placeholder="300000" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="monthly_price" label="Prix mensuel (€)" rules={[{ required: true }]}>
                <InputNumber style={{ width: '100%' }} min={0} max={1000} placeholder="45" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="yearly_price" label="Prix annuel (€)">
                <InputNumber style={{ width: '100%' }} min={0} max={10000} placeholder="540" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="deductible" label="Franchise (€)">
                <InputNumber style={{ width: '100%' }} min={0} max={10000} placeholder="50" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="features" label="Caractéristiques (séparées par des virgules)">
            <Input placeholder="Incendie, Dégâts des eaux, Vol" />
          </Form.Item>

          <Form.Item name="is_active" valuePropName="checked">
            <Switch checkedChildren="Actif" unCheckedChildren="Inactif" defaultChecked />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                icon={<PlusOutlined />} 
                loading={addingWarranty}
                style={{
                  background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
                  border: 'none',
                  fontWeight: 500,
                  boxShadow: '0 4px 20px rgba(0,212,255,0.3)',
                  borderRadius: 8
                }}
              >
                Ajouter
              </Button>
              <Button 
                onClick={() => setShowAddWarrantyForm(false)}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.85)'
                }}
              >
                Annuler
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Résultat de prédiction */}
      {predictionResult && (
        <Card style={{ 
          borderRadius: 16, 
          marginBottom: 24, 
          background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
          border: '1px solid rgba(0,212,255,0.1)',
          boxShadow: '0 4px 30px rgba(0,212,255,0.05)'
        }}>
          <Row gutter={24}>
            <Col span={6}>
              <Statistic 
                title={<span style={{ color: 'rgba(255,255,255,0.6)' }}>Score de risque</span>}
                value={predictionResult.analysis.risk_score}
                suffix="/100"
                valueStyle={{ 
                  color: getRiskColor(predictionResult.analysis.risk_level),
                  fontWeight: 700
                }}
              />
              <Progress 
                percent={predictionResult.analysis.risk_score} 
                strokeColor={getRiskColor(predictionResult.analysis.risk_level)} 
                size="small" 
                showInfo={false}
                style={{ marginTop: 8 }}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title={<span style={{ color: 'rgba(255,255,255,0.6)' }}>Niveau de risque</span>}
                value={predictionResult.analysis.risk_level === 'low' ? 'Faible' : predictionResult.analysis.risk_level === 'medium' ? 'Modéré' : 'Élevé'}
                valueStyle={{ 
                  color: getRiskColor(predictionResult.analysis.risk_level),
                  fontWeight: 700
                }}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title={<span style={{ color: 'rgba(255,255,255,0.6)' }}>Prime mensuelle estimée</span>}
                value={predictionResult.analysis.estimated_premium}
                prefix="€"
                valueStyle={{ 
                  color: '#ffb700',
                  fontWeight: 700
                }}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title={<span style={{ color: 'rgba(255,255,255,0.6)' }}>Couverture recommandée</span>}
                value={predictionResult.analysis.coverage_total}
                prefix="€"
                valueStyle={{ 
                  color: '#00d4ff',
                  fontWeight: 700
                }}
              />
            </Col>
          </Row>
        </Card>
      )}

      {/* Profil client */}
      <Card style={{ 
        borderRadius: 16, 
        marginBottom: 24,
        background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.3)'
      }}>
        <Row gutter={24} align="middle">
          <Col xs={24} md={16}>
            <Row gutter={24}>
              <Col span={8}>
                <Statistic 
                  title={<span style={{ color: 'rgba(255,255,255,0.6)' }}>Score de risque</span>}
                  value={profile?.score || 0} 
                  suffix="/100"
                  valueStyle={{ 
                    color: getRiskColor(profile?.risk_level),
                    fontWeight: 700
                  }}
                  prefix={<WarningOutlined style={{ color: getRiskColor(profile?.risk_level) }} />}
                />
                <Progress 
                  percent={profile?.score || 0} 
                  strokeColor={getRiskColor(profile?.risk_level)} 
                  showInfo={false} 
                  style={{ marginTop: 8 }} 
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title={<span style={{ color: 'rgba(255,255,255,0.6)' }}>Prime annuelle estimée</span>}
                  value={profile?.premium || 0} 
                  prefix="€"
                  valueStyle={{ 
                    color: '#ffb700',
                    fontWeight: 700
                  }}
                />
              </Col>
              <Col span={8}>
                <Statistic 
                  title={<span style={{ color: 'rgba(255,255,255,0.6)' }}>Couverture totale</span>}
                  value={stats.coverage_total} 
                  prefix="€"
                  valueStyle={{ 
                    color: '#00d4ff',
                    fontWeight: 700
                  }}
                />
              </Col>
            </Row>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: 'center' }}>
            <div style={{ 
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 16, 
              padding: '16px',
              border: '1px solid rgba(255,255,255,0.05)'
            }}>
              <Rate 
                disabled 
                defaultValue={profile?.rating || 4} 
                style={{ 
                  fontSize: 20,
                  color: '#ffb700'
                }} 
              />
              <Text strong style={{ 
                display: 'block', 
                marginTop: 8,
                color: 'rgba(255,255,255,0.85)'
              }}>
                Confiance: {profile?.confidence || 85}%
              </Text>
              <Tag 
                icon={<TrophyOutlined />} 
                style={{ 
                  marginTop: 8,
                  background: getRiskGradient(profile?.risk_level),
                  border: 'none',
                  color: 'white',
                  padding: '4px 12px',
                  fontWeight: 500
                }}
              >
                {profile?.risk_level === 'low' ? 'Client Premium' : profile?.risk_level === 'medium' ? 'Client Standard' : 'Client à risque'}
              </Tag>
            </div>
          </Col>
        </Row>
      </Card>

      {/* Tabs avec cartes en fond blanc */}
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        style={{ marginTop: 24 }}
        tabBarStyle={{
          borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}
        tabBarExtraContent={
          <Space>
            <Badge 
              count={recommendations.filter(r => r.recommended).length} 
              style={{ backgroundColor: '#00d4ff' }}
            >
              <Button 
                icon={<StarOutlined />}
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.7)'
                }}
              >
                Recommandés
              </Button>
            </Badge>
          </Space>
        }
        items={[
          {
            key: 'recommendations',
            label: <span style={{ color: 'rgba(255,255,255,0.85)' }}>
              <ExperimentOutlined style={{ color: '#00d4ff' }} /> 
              {' '}Recommandations
            </span>,
            children: (
              <Row gutter={[24, 24]}>
                {recommendations.map((rec, idx) => (
                  <Col xs={24} md={12} lg={8} key={idx}>
                    <Card 
                      hoverable
                      style={{ 
                        borderRadius: 16,
                        background: '#ffffff',
                        border: rec.recommended ? '2px solid #00d4ff' : '1px solid #e8e8e8',
                        position: 'relative',
                        transition: 'all 0.3s ease',
                        boxShadow: rec.recommended ? '0 0 30px rgba(0,212,255,0.1)' : '0 2px 8px rgba(0,0,0,0.06)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-8px)';
                        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.12)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = rec.recommended ? '0 0 30px rgba(0,212,255,0.1)' : '0 2px 8px rgba(0,0,0,0.06)';
                      }}
                      actions={[
                        <Button 
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          onClick={() => {
                            setSelectedWarranty(rec);
                            setModalVisible(true);
                          }}
                          style={{
                            background: rec.recommended ? 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)' : '#1890ff',
                            border: 'none',
                            color: 'white',
                            fontWeight: 500,
                            boxShadow: rec.recommended ? '0 4px 20px rgba(0,212,255,0.3)' : '0 2px 8px rgba(24,144,255,0.3)'
                          }}
                        >
                          Souscrire
                        </Button>
                      ]}
                    >
                      {rec.recommended && (
                        <div style={{ position: 'absolute', top: 12, right: 12 }}>
                          <Tooltip title="Recommandé pour vous">
                            <Badge 
                              count="⭐ Recommandé" 
                              style={{ 
                                backgroundColor: '#00d4ff',
                                boxShadow: '0 0 20px rgba(0,212,255,0.3)',
                                fontWeight: 500
                              }} 
                            />
                          </Tooltip>
                        </div>
                      )}
                      
                      {rec.score && (
                        <div style={{ position: 'absolute', top: 12, left: 12 }}>
                          <Tooltip title={`Score de pertinence: ${rec.score}%`}>
                            <Tag 
                              color={getScoreColor(rec.score)}
                              style={{ 
                                fontWeight: 600,
                                border: 'none',
                                background: getScoreColor(rec.score) + '20',
                                color: '#000000'
                              }}
                            >
                              {rec.score}% match
                            </Tag>
                          </Tooltip>
                        </div>
                      )}
                      
                      <div style={{ textAlign: 'center', marginBottom: 16 }}>
                        <Avatar 
                          size={64} 
                          icon={getIconForType(rec.icon)} 
                          style={{ 
                            backgroundColor: rec.color + '20',
                            color: rec.color,
                            border: `2px solid ${rec.color}40`,
                            boxShadow: `0 4px 20px ${rec.color}20`
                          }} 
                        />
                      </div>
                      
                      <Title level={4} style={{ 
                        textAlign: 'center',
                        color: '#000000',
                        fontWeight: 600
                      }}>
                        {rec.name}
                      </Title>
                      <Text style={{ 
                        display: 'block', 
                        textAlign: 'center',
                        color: '#666666'
                      }}>
                        {rec.description}
                      </Text>
                      
                      <Divider style={{ borderColor: '#f0f0f0' }} />
                      
                      <Row gutter={16}>
                        <Col span={12}>
                          <div style={{ textAlign: 'center' }}>
                            <Text style={{ color: '#888888', fontSize: 12 }}>
                              Couverture annuelle
                            </Text>
                            <div>
                              <Text strong style={{ fontSize: 20, color: '#00d4ff' }}>
                                {rec.coverage.toLocaleString()} €
                              </Text>
                            </div>
                          </div>
                        </Col>
                        <Col span={12}>
                          <div style={{ textAlign: 'center' }}>
                            <Text style={{ color: '#888888', fontSize: 12 }}>
                              Prime mensuelle
                            </Text>
                            <div>
                              <Text strong style={{ fontSize: 20, color: '#faad14' }}>
                                {rec.price} €
                              </Text>
                            </div>
                          </div>
                        </Col>
                      </Row>
                      
                      <Divider style={{ borderColor: '#f0f0f0' }} />
                      
                      <div style={{ marginTop: 16 }}>
                        <Text style={{ color: '#333333', fontSize: 13, fontWeight: 500 }}>
                          Inclus :
                        </Text>
                        <div style={{ marginTop: 8 }}>
                          {rec.features?.slice(0, 3).map((feature, i) => (
                            <Tag 
                              key={i} 
                              icon={<CheckCircleOutlined />}
                              style={{ 
                                marginBottom: 8, 
                                marginRight: 8, 
                                padding: '4px 12px',
                                background: 'rgba(0,212,255,0.1)',
                                border: '1px solid rgba(0,212,255,0.2)',
                                color: '#000000'
                              }}
                            >
                              {feature}
                            </Tag>
                          ))}
                          {rec.features?.length > 3 && (
                            <Tag 
                              style={{ 
                                background: '#f5f5f5',
                                border: '1px solid #e8e8e8',
                                color: '#666666'
                              }}
                            >
                              +{rec.features.length - 3} autres
                            </Tag>
                          )}
                        </div>
                      </div>
                    </Card>
                  </Col>
                ))}
              </Row>
            )
          },
          {
            key: 'my-warranties',
            label: <span style={{ color: 'rgba(255,255,255,0.85)' }}>
              <SafetyCertificateOutlined style={{ color: '#00d4ff' }} /> 
              {' '}Mes garanties
            </span>,
            children: myWarranties.length === 0 ? (
              <Card style={{ 
                borderRadius: 16, 
                textAlign: 'center', 
                padding: 48,
                background: '#ffffff',
                border: '1px solid #e8e8e8'
              }}>
                <SafetyCertificateOutlined style={{ fontSize: 64, color: '#d9d9d9', marginBottom: 16 }} />
                <Title level={4} style={{ color: '#000000' }}>Aucune garantie souscrite</Title>
                <Text style={{ color: '#666666' }}>
                  Découvrez nos offres personnalisées pour protéger ce qui compte pour vous.
                </Text>
                <Button 
                  type="primary" 
                  style={{ 
                    marginTop: 24,
                    background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
                    border: 'none',
                    boxShadow: '0 4px 20px rgba(0,212,255,0.3)'
                  }} 
                  onClick={() => setActiveTab('recommendations')}
                >
                  Voir les recommandations
                </Button>
              </Card>
            ) : (
              <Row gutter={[24, 24]}>
                {myWarranties.map((warranty, idx) => (
                  <Col xs={24} md={12} key={idx}>
                    <Card style={{ 
                      borderRadius: 16,
                      background: '#ffffff',
                      border: '1px solid #e8e8e8'
                    }}>
                      <Row gutter={16}>
                        <Col span={6}>
                          <Avatar 
                            size={48} 
                            icon={getIconForType(warranty.warranty?.type)} 
                            style={{ 
                              backgroundColor: warranty.warranty?.color + '20',
                              color: warranty.warranty?.color || '#00d4ff'
                            }}
                          />
                        </Col>
                        <Col span={18}>
                          <Title level={5} style={{ margin: 0, color: '#000000' }}>
                            {warranty.warranty?.name}
                          </Title>
                          <Tag 
                            color="green" 
                            icon={<CheckCircleOutlined />}
                            style={{ 
                              background: 'rgba(0,212,255,0.1)',
                              border: '1px solid rgba(0,212,255,0.2)',
                              color: '#00d4ff'
                            }}
                          >
                            Active
                          </Tag>
                          <div style={{ marginTop: 8 }}>
                            <Text style={{ color: '#888888', fontSize: 12 }}>
                              Souscrite le {new Date(warranty.start_date).toLocaleDateString()}
                            </Text>
                          </div>
                        </Col>
                      </Row>
                      <Divider style={{ borderColor: '#f0f0f0' }} />
                      <Row>
                        <Col span={12}>
                          <Text style={{ color: '#888888', fontSize: 12 }}>Couverture</Text>
                          <div><Text strong style={{ color: '#00d4ff' }}>{warranty.warranty?.coverage?.toLocaleString()} €</Text></div>
                        </Col>
                        <Col span={12}>
                          <Text style={{ color: '#888888', fontSize: 12 }}>Prime</Text>
                          <div><Text strong style={{ color: '#faad14' }}>{warranty.price_paid} €/{warranty.payment_frequency === 'monthly' ? 'mois' : 'an'}</Text></div>
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                ))}
              </Row>
            )
          }
        ]}
      />

      {/* Modal de confirmation avec design sombre */}
      <Modal
        title={
          <Space style={{ color: 'white' }}>
            <SafetyCertificateOutlined style={{ color: '#00d4ff' }} />
            <span style={{ fontWeight: 600 }}>Confirmation de souscription</span>
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button 
            key="cancel" 
            onClick={() => setModalVisible(false)}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)'
            }}
          >
            Annuler
          </Button>,
          <Button 
            key="subscribe" 
            type="primary" 
            icon={<CheckCircleOutlined />}
            onClick={() => subscribeWarranty(selectedWarranty?.id)}
            style={{
              background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
              border: 'none',
              boxShadow: '0 4px 20px rgba(0,212,255,0.3)'
            }}
          >
            Confirmer la souscription
          </Button>
        ]}
        width={500}
        style={{ top: 20 }}
        bodyStyle={{
          background: '#1a1a1a',
          borderRadius: 12,
          padding: '24px'
        }}
        modalRender={(modal) => (
          <div style={{ 
            background: '#1a1a1a',
            borderRadius: 16,
            border: '1px solid rgba(255,255,255,0.05)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.9)'
          }}>
            {modal}
          </div>
        )}
      >
        {selectedWarranty && (
          <div>
            <Alert 
              message={<span style={{ color: 'white' }}>{selectedWarranty.name}</span>}
              description={<span style={{ color: 'rgba(255,255,255,0.6)' }}>{selectedWarranty.description}</span>}
              type="info" 
              showIcon 
              style={{ 
                borderRadius: 12, 
                marginBottom: 16,
                background: 'rgba(0,212,255,0.05)',
                border: '1px solid rgba(0,212,255,0.1)'
              }}
            />
            
            <Descriptions 
              column={1} 
              bordered 
              size="small"
              style={{
                background: '#0d0d0d',
                borderRadius: 8
              }}
            >
              <Descriptions.Item label="Couverture annuelle" labelStyle={{ color: 'rgba(255,255,255,0.5)' }}>
                <Text strong style={{ color: '#00d4ff', fontSize: 16 }}>
                  {selectedWarranty.coverage.toLocaleString()} €
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Prime mensuelle" labelStyle={{ color: 'rgba(255,255,255,0.5)' }}>
                <Text strong style={{ color: '#ffb700', fontSize: 16 }}>
                  {selectedWarranty.price} €
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Période de validité" labelStyle={{ color: 'rgba(255,255,255,0.5)' }}>
                <span style={{ color: 'rgba(255,255,255,0.85)' }}>1 an renouvelable</span>
              </Descriptions.Item>
              <Descriptions.Item label="Franchise" labelStyle={{ color: 'rgba(255,255,255,0.5)' }}>
                <span style={{ color: 'rgba(255,255,255,0.85)' }}>50 € par sinistre</span>
              </Descriptions.Item>
            </Descriptions>
            
            <Divider style={{ borderColor: 'rgba(255,255,255,0.05)' }} />
            
            <Alert
              message={<span style={{ color: 'white' }}>Ce que vous allez recevoir</span>}
              description={
                <ul style={{ margin: 0, paddingLeft: 20, color: 'rgba(255,255,255,0.6)' }}>
                  <li>Contrat de garantie par email</li>
                  <li>Accès à votre espace personnel</li>
                  <li>Assistance 24/7</li>
                </ul>
              }
              type="success"
              showIcon
              style={{ 
                borderRadius: 12,
                background: 'rgba(0,212,255,0.05)',
                border: '1px solid rgba(0,212,255,0.1)'
              }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WarrantyRecommender;