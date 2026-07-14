// src/modules/insurance/RecommendationGaranties.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Row, Col, Button, Slider, Progress, Alert, 
  Tabs, Tag, Badge, Avatar, Space, Divider, 
  Typography, Steps, Tooltip, Statistic, message,
  Collapse, List, Rate, Modal, Form, Input, Select,
  Switch, Radio, Checkbox, Table, Timeline, Descriptions,
  Spin, Empty, Result, Skeleton
} from 'antd';
import {
  SafetyCertificateOutlined, RocketOutlined, 
  HeartOutlined, CarOutlined, HomeOutlined,
  WalletOutlined, StarOutlined, CheckCircleOutlined,
  ThunderboltOutlined, ExperimentOutlined, 
  LineChartOutlined, PieChartOutlined, FundOutlined,
  UserOutlined, PhoneOutlined, MailOutlined,
  EnvironmentOutlined, CalendarOutlined,
  CrownOutlined, GiftOutlined, DownloadOutlined,
  ShareAltOutlined, PrinterOutlined, EyeOutlined,
  PlusOutlined, CloseOutlined, EditOutlined,
  DeleteOutlined, SaveOutlined, ReloadOutlined
} from '@ant-design/icons';
import { Line, Pie, Column, Radar } from '@ant-design/charts';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import './RecommendationGaranties.css';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;

const { Option } = Select;
// Types de garanties
const GUARANTEE_TYPES = {
  auto: {
    label: 'Auto',
    icon: <CarOutlined />,
    color: '#1890ff',
    guarantees: [
      { id: 'auto_responsabilite', name: 'Responsabilité civile', base: 120, description: 'Couverture obligatoire pour les dommages causés à autrui', mandatory: true },
      { id: 'auto_tous_risques', name: 'Tous risques', base: 450, description: 'Couverture complète incluant le vol, l\'incendie et les bris de glace', mandatory: false, discount: 15 },
      { id: 'auto_vol_incendie', name: 'Vol & Incendie', base: 280, description: 'Protection contre le vol et l\'incendie', mandatory: false },
      { id: 'auto_assistance', name: 'Assistance 0km', base: 65, description: 'Assistance dépannage 24/7', mandatory: false },
      { id: 'auto_vehicule_prete', name: 'Véhicule de prêt', base: 95, description: 'Mise à disposition d\'un véhicule en cas de sinistre', mandatory: false },
      { id: 'auto_protection_juridique', name: 'Protection juridique', base: 45, description: 'Assistance juridique en cas de litige', mandatory: false }
    ]
  },
  sante: {
    label: 'Santé',
    icon: <HeartOutlined />,
    color: '#52c41a',
    guarantees: [
      { id: 'sante_base', name: 'Formule de base', base: 380, description: 'Remboursement des consultations et médicaments', mandatory: true },
      { id: 'sante_hospitalisation', name: 'Hospitalisation', base: 290, description: 'Prise en charge des frais d\'hospitalisation', mandatory: false },
      { id: 'sante_dentaire', name: 'Soins dentaires', base: 180, description: 'Remboursement des soins dentaires', mandatory: false },
      { id: 'sante_optique', name: 'Optique', base: 150, description: 'Remboursement des lunettes et lentilles', mandatory: false },
      { id: 'sante_medecine_douce', name: 'Médecines douces', base: 85, description: 'Ostéopathie, acupuncture, etc.', mandatory: false },
      { id: 'sante_prevoyance', name: 'Prévoyance', base: 210, description: 'Garantie en cas d\'arrêt de travail', mandatory: false }
    ]
  },
  habitation: {
    label: 'Habitation',
    icon: <HomeOutlined />,
    color: '#fa8c16',
    guarantees: [
      { id: 'habitation_base', name: 'Formule de base', base: 180, description: 'Couverture des risques locatifs', mandatory: true },
      { id: 'habitation_tous_risques', name: 'Tous risques', base: 420, description: 'Couverture complète du logement', mandatory: false },
      { id: 'habitation_vol', name: 'Vol & Cambriolage', base: 95, description: 'Protection contre le vol', mandatory: false },
      { id: 'habitation_assistance', name: 'Assistance', base: 55, description: 'Assistance dépannage 24/7', mandatory: false },
      { id: 'habitation_juridique', name: 'Protection juridique', base: 65, description: 'Assistance juridique', mandatory: false },
      { id: 'habitation_equipements', name: 'Équipements électroniques', base: 110, description: 'Couverture des appareils électroniques', mandatory: false }
    ]
  },
  vie: {
    label: 'Vie',
    icon: <CrownOutlined />,
    color: '#eb2f96',
    guarantees: [
      { id: 'vie_deces', name: 'Décès', base: 150, description: 'Capital versé aux bénéficiaires', mandatory: true },
      { id: 'vie_invalidite', name: 'Invalidité', base: 95, description: 'Rente en cas d\'invalidité', mandatory: false },
      { id: 'vie_dependance', name: 'Dépendance', base: 120, description: 'Couverture en cas de perte d\'autonomie', mandatory: false },
      { id: 'vie_epargne', name: 'Épargne', base: 250, description: 'Capital garanti avec intérêts', mandatory: false }
    ]
  },
  prevoyance: {
    label: 'Prévoyance',
    icon: <SafetyCertificateOutlined />,
    color: '#722ed1',
    guarantees: [
      { id: 'prev_arret_travail', name: 'Arrêt de travail', base: 180, description: 'Indemnités en cas d\'arrêt maladie', mandatory: true },
      { id: 'prev_invalidite', name: 'Invalidité', base: 210, description: 'Rente d\'invalidité', mandatory: false },
      { id: 'prev_chomage', name: 'Perte d\'emploi', base: 95, description: 'Couverture en cas de chômage', mandatory: false }
    ]
  }
};

// Profils types pour le scoring
const PROFILES = {
  jeune_actif: { name: 'Jeune actif', risk: 4, budget: 800, priority: ['sante', 'auto'] },
  famille: { name: 'Famille', risk: 5, budget: 1500, priority: ['sante', 'habitation', 'vie'] },
  senior: { name: 'Senior', risk: 6, budget: 1200, priority: ['sante', 'prevoyance', 'vie'] },
  cadre: { name: 'Cadre supérieur', risk: 3, budget: 2000, priority: ['sante', 'prevoyance', 'auto'] },
  entrepreneur: { name: 'Entrepreneur', risk: 7, budget: 2500, priority: ['prevoyance', 'sante', 'vie'] }
};

const RecommendationGaranties = () => {
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState([]);
  const [selectedGuarantees, setSelectedGuarantees] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [activeTab, setActiveTab] = useState('auto');
  const [currentStep, setCurrentStep] = useState(0);
  const [showComparison, setShowComparison] = useState(false);
  const [budget, setBudget] = useState(1000);
  const [riskTolerance, setRiskTolerance] = useState(5);
  const [personalInfo, setPersonalInfo] = useState({
    age: 35,
    profession: 'cadre',
    situation_familiale: 'marié',
    enfants: 2,
    revenu_mensuel: 4000,
    epargne: 50000,
    antecedents: []
  });
  
  // Formulaires modaux
  const [detailModal, setDetailModal] = useState(false);
  const [selectedGuarantee, setSelectedGuarantee] = useState(null);
  const [simulationModal, setSimulationModal] = useState(false);
  const [simulationResult, setSimulationResult] = useState(null);

  useEffect(() => {
    fetchRecommendations();
    fetchUserProfile();
  }, [personalInfo, budget, riskTolerance]);

  // Récupération des recommandations
  const fetchRecommendations = async () => {
    setLoading(true);
    try {
      const response = await api.post('/insurance/recommendations', {
        profile: personalInfo,
        budget: budget,
        risk_tolerance: riskTolerance
      });
      setRecommendations(response.data.recommendations);
      setSelectedGuarantees(response.data.selected_guarantees || []);
    } catch (error) {
      console.error('Erreur de chargement:', error);
      // Données de fallback
      generateFallbackRecommendations();
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/user/profile');
      setUserProfile(response.data);
      setPersonalInfo(prev => ({ ...prev, ...response.data }));
    } catch (error) {
      console.error('Erreur profil:', error);
    }
  };

  // Génération de recommandations de fallback
  const generateFallbackRecommendations = () => {
    const recos = [];
    let totalCost = 0;
    
    // Scoring basé sur le profil
    const profileType = getProfileType();
    const priorityGuarantees = PROFILES[profileType]?.priority || ['sante'];
    
    for (const [typeKey, typeData] of Object.entries(GUARANTEE_TYPES)) {
      for (const guarantee of typeData.guarantees) {
        const score = calculateScore(guarantee, typeKey);
        if (score > 60) {
          const isPriority = priorityGuarantees.includes(typeKey);
          const finalScore = isPriority ? score + 15 : score;
          
          if (finalScore > 70 && totalCost + guarantee.base <= budget * 1.2) {
            recos.push({
              ...guarantee,
              type: typeKey,
              typeLabel: typeData.label,
              typeIcon: typeData.icon,
              typeColor: typeData.color,
              score: finalScore,
              recommended: true,
              price: guarantee.base,
              discount: guarantee.discount || 0,
              finalPrice: guarantee.base * (1 - (guarantee.discount || 0) / 100)
            });
            totalCost += guarantee.base * (1 - (guarantee.discount || 0) / 100);
          }
        }
      }
    }
    
    setRecommendations(recos.sort((a, b) => b.score - a.score));
    setSelectedGuarantees(recos.filter(r => r.recommended).map(r => r.id));
  };

  // Calcul du score pour une garantie
  const calculateScore = (guarantee, type) => {
    let score = 50; // Score de base
    
    // Facteur âge
    if (personalInfo.age < 30 && type === 'auto') score += 10;
    if (personalInfo.age > 50 && type === 'sante') score += 15;
    if (personalInfo.age > 60 && type === 'vie') score += 20;
    
    // Facteur situation familiale
    if (personalInfo.enfants > 0 && type === 'sante') score += 15;
    if (personalInfo.enfants > 0 && type === 'vie') score += 10;
    if (personalInfo.situation_familiale === 'marié' && type === 'prevoyance') score += 10;
    
    // Facteur revenu
    if (personalInfo.revenu_mensuel > 5000 && type === 'prevoyance') score += 15;
    if (personalInfo.revenu_mensuel < 2000 && type === 'auto') score -= 10;
    
    // Facteur épargne
    if (personalInfo.epargne > 100000 && type === 'vie') score += 20;
    
    // Facteur antécédents
    if (personalInfo.antecedents?.includes('accident') && type === 'auto') score += 25;
    if (personalInfo.antecedents?.includes('maladie') && type === 'sante') score += 30;
    
    return Math.min(100, Math.max(0, score));
  };

  const getProfileType = () => {
    if (personalInfo.age < 35 && personalInfo.epargne < 20000) return 'jeune_actif';
    if (personalInfo.enfants > 0) return 'famille';
    if (personalInfo.age > 55) return 'senior';
    if (personalInfo.revenu_mensuel > 5000) return 'cadre';
    return 'jeune_actif';
  };

  const handleToggleGuarantee = (guaranteeId) => {
    setSelectedGuarantees(prev => 
      prev.includes(guaranteeId)
        ? prev.filter(id => id !== guaranteeId)
        : [...prev, guaranteeId]
    );
  };

  const handleApplyRecommendations = async () => {
    try {
      await api.post('/insurance/apply-recommendations', {
        guarantees: selectedGuarantees,
        profile: personalInfo
      });
      message.success('Vos garanties ont été mises à jour avec succès !');
    } catch (error) {
      message.error('Erreur lors de l\'application des recommandations');
    }
  };

  const handleSimulate = () => {
    const totalCost = recommendations
      .filter(r => selectedGuarantees.includes(r.id))
      .reduce((sum, r) => sum + r.finalPrice, 0);
    
    const savings = recommendations
      .filter(r => selectedGuarantees.includes(r.id))
      .reduce((sum, r) => sum + (r.discount ? r.base * r.discount / 100 : 0), 0);
    
    setSimulationResult({
      totalCost,
      savings,
      coverageScore: Math.min(100, (selectedGuarantees.length / recommendations.length) * 100),
      recommendationsCount: selectedGuarantees.length
    });
    setSimulationModal(true);
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#52c41a';
    if (score >= 60) return '#faad14';
    return '#ff4d4f';
  };

  // Configuration du graphique radar
  const radarConfig = {
    data: recommendations.slice(0, 8).map(r => ({
      name: r.name.length > 15 ? r.name.substring(0, 15) + '...' : r.name,
      score: r.score
    })),
    xField: 'name',
    yField: 'score',
    meta: { score: { min: 0, max: 100 } },
    area: { style: { fill: 'rgba(65, 88, 208, 0.2)' } },
    point: { size: 4, color: '#4158D0' },
    line: { color: '#4158D0', lineWidth: 2 }
  };

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="large" tip="Analyse de votre profil..." ><div/></Spin>
      </div>
    );
  }

  return (
    <div className="recommendation-garanties" style={{ padding: 24, background: '#f0f2f5', minHeight: '100vh' }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <Title level={2}>
          <SafetyCertificateOutlined style={{ marginRight: 12, color: '#722ed1' }} />
          Recommandation de Garanties Personnalisées
        </Title>
        <Paragraph type="secondary">
          Des garanties sur mesure adaptées à votre profil et vos besoins
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        {/* Sidebar - Profil utilisateur */}
        <Col xs={24} lg={6}>
          <Card className="profile-card" style={{ borderRadius: 16 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <Avatar size={80} icon={<UserOutlined />} style={{ backgroundColor: '#722ed1' }} />
              <Title level={4} style={{ marginTop: 12, marginBottom: 4 }}>
                {userProfile?.name || 'Client'}
              </Title>
              <Tag color="gold" icon={<CrownOutlined />}>Profil Premium</Tag>
            </div>

            <Divider />

            <Descriptions column={1} size="small">
              <Descriptions.Item label="Âge">{personalInfo.age} ans</Descriptions.Item>
              <Descriptions.Item label="Situation">{personalInfo.situation_familiale}</Descriptions.Item>
              <Descriptions.Item label="Enfants">{personalInfo.enfants}</Descriptions.Item>
              <Descriptions.Item label="Revenu mensuel">{personalInfo.revenu_mensuel} €</Descriptions.Item>
              <Descriptions.Item label="Épargne">{personalInfo.epargne.toLocaleString()} €</Descriptions.Item>
            </Descriptions>

            <Divider />

            <div className="budget-section">
              <Text strong>Budget mensuel</Text>
              <Slider
                value={budget}
                onChange={setBudget}
                min={300}
                max={3000}
                step={50}
                marks={{ 300: '300€', 1500: '1500€', 3000: '3000€' }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Budget recommandé: {PROFILES[getProfileType()]?.budget || 1000}€
              </Text>
            </div>

            <div className="risk-section" style={{ marginTop: 16 }}>
              <Text strong>Tolérance au risque</Text>
              <Slider
                value={riskTolerance}
                onChange={setRiskTolerance}
                min={1}
                max={10}
                marks={{ 1: 'Faible', 5: 'Modéré', 10: 'Élevé' }}
              />
            </div>

            <Button 
              type="primary" 
              icon={<ReloadOutlined />} 
              onClick={fetchRecommendations}
              block 
              style={{ marginTop: 16, borderRadius: 8 }}
            >
              Mettre à jour
            </Button>
          </Card>

          {/* Score global */}
          <Card style={{ marginTop: 16, borderRadius: 16, textAlign: 'center' }}>
            <Statistic 
              title="Score de couverture"
              value={Math.round((selectedGuarantees.length / recommendations.length) * 100)}
              suffix="%"
              valueStyle={{ color: '#722ed1', fontSize: 32 }}
            />
            <Progress 
              percent={Math.round((selectedGuarantees.length / recommendations.length) * 100)} 
              strokeColor="#722ed1"
              showInfo={false}
              style={{ marginTop: 8 }}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {selectedGuarantees.length} garanties sur {recommendations.length} recommandées
            </Text>
          </Card>
        </Col>

        {/* Main content */}
        <Col xs={24} lg={18}>
          {/* Steps */}
          <Card style={{ marginBottom: 24, borderRadius: 16 }}>
            <Steps current={currentStep} onChange={setCurrentStep}>
              <Step title="Analyse profil" description="Vos besoins et objectifs" />
              <Step title="Recommandations" description="Garanties personnalisées" />
              <Step title="Simulation" description="Estimation et devis" />
              <Step title="Confirmation" description="Validation finale" />
            </Steps>
          </Card>

          {/* Graphique radar des scores */}
          {recommendations.length > 0 && currentStep === 1 && (
            <Card title="Score de pertinence des garanties" style={{ marginBottom: 24, borderRadius: 16 }}>
              <Radar {...radarConfig} height={300} />
              <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 16 }}>
                Score de recommandation basé sur votre profil (0-100)
              </Text>
            </Card>
          )}

          {/* Liste des garanties recommandées */}
          <Card 
            title={
              <Space>
                <StarOutlined style={{ color: '#faad14' }} />
                <span>Garanties recommandées pour vous</span>
                <Badge count={recommendations.filter(r => r.score >= 70).length} style={{ backgroundColor: '#52c41a' }} />
              </Space>
            }
            style={{ borderRadius: 16 }}
            extra={
              <Space>
                <Button icon={<EyeOutlined />} onClick={() => setShowComparison(!showComparison)}>
                  {showComparison ? 'Masquer comparaison' : 'Comparer'}
                </Button>
                <Button type="primary" icon={<SaveOutlined />} onClick={handleApplyRecommendations}>
                  Appliquer les recommandations
                </Button>
              </Space>
            }
          >
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              {Object.entries(GUARANTEE_TYPES).map(([key, type]) => (
                <TabPane 
                  tab={
                    <span>
                      {type.icon}
                      {type.label}
                      <Badge 
                        count={recommendations.filter(r => r.type === key && r.score >= 70).length} 
                        size="small" 
                        style={{ marginLeft: 8, backgroundColor: '#52c41a' }}
                      />
                    </span>
                  } 
                  key={key}
                >
                  <List
                    dataSource={type.guarantees}
                    renderItem={guarantee => {
                      const recommendation = recommendations.find(r => r.id === guarantee.id);
                      const score = recommendation?.score || calculateScore(guarantee, key);
                      const isSelected = selectedGuarantees.includes(guarantee.id);
                      const isRecommended = score >= 70;
                      
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Card 
                            className={`guarantee-card ${isSelected ? 'selected' : ''}`}
                            style={{ 
                              marginBottom: 16,
                              border: isSelected ? `2px solid ${type.color}` : '1px solid #f0f0f0',
                              borderRadius: 12,
                              cursor: 'pointer'
                            }}
                            onClick={() => handleToggleGuarantee(guarantee.id)}
                          >
                            <Row align="middle">
                              <Col flex="auto">
                                <Space direction="vertical" size={4}>
                                  <Space>
                                    <Text strong style={{ fontSize: 16 }}>{guarantee.name}</Text>
                                    {guarantee.mandatory && <Tag color="red">Obligatoire</Tag>}
                                    {isRecommended && <Tag color="green" icon={<StarOutlined />}>Recommandé</Tag>}
                                    {recommendation?.discount && <Tag color="orange">-{recommendation.discount}%</Tag>}
                                  </Space>
                                  <Text type="secondary">{guarantee.description}</Text>
                                  <Space>
                                    <Tag color="blue">Score: {Math.round(score)}%</Tag>
                                    <Tag color="purple">{guarantee.base}€/an</Tag>
                                    {recommendation?.finalPrice && recommendation.finalPrice !== guarantee.base && (
                                      <Tag color="green">{recommendation.finalPrice}€/an</Tag>
                                    )}
                                  </Space>
                                </Space>
                              </Col>
                              <Col>
                                <div style={{ textAlign: 'right' }}>
                                  <Progress 
                                    type="circle" 
                                    percent={Math.round(score)} 
                                    width={60}
                                    strokeColor={getScoreColor(score)}
                                    format={percent => `${percent}%`}
                                  />
                                  <Button 
                                    type="link" 
                                    icon={<EyeOutlined />}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedGuarantee(guarantee);
                                      setDetailModal(true);
                                    }}
                                  >
                                    Détails
                                  </Button>
                                </div>
                              </Col>
                            </Row>
                          </Card>
                        </motion.div>
                      );
                    }}
                  />
                </TabPane>
              ))}
            </Tabs>

            <Divider />

            {/* Section résumé des sélections */}
            <div className="selected-summary">
              <Row gutter={16} align="middle">
                <Col span={12}>
                  <Statistic 
                    title="Garanties sélectionnées"
                    value={selectedGuarantees.length}
                    suffix={`/${recommendations.length}`}
                  />
                </Col>
                <Col span={12}>
                  <Statistic 
                    title="Coût annuel estimé"
                    value={recommendations
                      .filter(r => selectedGuarantees.includes(r.id))
                      .reduce((sum, r) => sum + r.finalPrice, 0)}
                    prefix="€"
                    precision={2}
                  />
                </Col>
              </Row>
              <Button 
                type="primary" 
                size="large" 
                icon={<LineChartOutlined />}
                onClick={handleSimulate}
                style={{ marginTop: 16, borderRadius: 8 }}
                block
              >
                Simuler mon offre personnalisée
              </Button>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Modal détails garantie */}
      <Modal
        title={
          <Space>
            <SafetyCertificateOutlined />
            <span>Détails de la garantie</span>
          </Space>
        }
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModal(false)}>Fermer</Button>,
          <Button 
            key="select" 
            type="primary" 
            onClick={() => {
              if (selectedGuarantee) {
                handleToggleGuarantee(selectedGuarantee.id);
                setDetailModal(false);
              }
            }}
          >
            {selectedGuarantees.includes(selectedGuarantee?.id) ? 'Retirer' : 'Ajouter'}
          </Button>
        ]}
        width={600}
      >
        {selectedGuarantee && (
          <div>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Nom">{selectedGuarantee.name}</Descriptions.Item>
              <Descriptions.Item label="Description">{selectedGuarantee.description}</Descriptions.Item>
              <Descriptions.Item label="Type">{GUARANTEE_TYPES[activeTab]?.label}</Descriptions.Item>
              <Descriptions.Item label="Prix annuel">{selectedGuarantee.base} €</Descriptions.Item>
              {selectedGuarantee.discount && (
                <Descriptions.Item label="Promotion">-{selectedGuarantee.discount}%</Descriptions.Item>
              )}
            </Descriptions>
            
            <Divider />
            
            <Alert
              message="Couverture"
              description="Cette garantie offre une protection complète avec un taux de remboursement jusqu'à 100% selon les conditions."
              type="info"
              showIcon
            />
            
            <Divider />
            
            <Collapse items={[
              {
                key: '1',
                label: 'Conditions générales',
                children: <Text>Les conditions détaillées sont disponibles dans le contrat. Franchise applicable selon les sinistres.</Text>,
              },
              {
                key: '2',
                label: 'Exclusions',
                children: <Text>Ne sont pas couverts: les dommages intentionnels, la négligence grave, les actes de guerre.</Text>,
              },
            ]} />
          </div>
        )}
      </Modal>

      {/* Modal simulation */}
      <Modal
        title={
          <Space>
            <LineChartOutlined />
            <span>Simulation de votre offre personnalisée</span>
          </Space>
        }
        open={simulationModal}
        onCancel={() => setSimulationModal(false)}
        footer={[
          <Button key="close" onClick={() => setSimulationModal(false)}>Fermer</Button>,
          <Button 
            key="apply" 
            type="primary" 
            icon={<CheckCircleOutlined />}
            onClick={() => {
              handleApplyRecommendations();
              setSimulationModal(false);
            }}
          >
            Confirmer et souscrire
          </Button>
        ]}
        width={700}
      >
        {simulationResult && (
          <div>
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Card>
                  <Statistic 
                    title="Coût total annuel"
                    value={simulationResult.totalCost}
                    prefix="€"
                    valueStyle={{ color: '#722ed1' }}
                  />
                  <Text type="secondary">Soit {Math.round(simulationResult.totalCost / 12)}€/mois</Text>
                </Card>
              </Col>
              <Col span={12}>
                <Card>
                  <Statistic 
                    title="Économies réalisées"
                    value={simulationResult.savings}
                    prefix="€"
                    valueStyle={{ color: '#52c41a' }}
                  />
                  <Text type="secondary">Grâce aux offres personnalisées</Text>
                </Card>
              </Col>
            </Row>

            <Divider />

            <Card title="Récapitulatif des garanties sélectionnées">
              <List
                dataSource={recommendations.filter(r => selectedGuarantees.includes(r.id))}
                renderItem={item => (
                  <List.Item>
                    <Space>
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      <Text strong>{item.name}</Text>
                      <Tag color="blue">{item.typeLabel}</Tag>
                      <Text>{item.finalPrice}€/an</Text>
                      {item.discount && <Tag color="orange">-{item.discount}%</Tag>}
                    </Space>
                  </List.Item>
                )}
              />
            </Card>

            <Alert
              message="Offre personnalisée"
              description={`Basée sur votre profil ${PROFILES[getProfileType()]?.name}, nous vous recommandons cette sélection de garanties.`}
              type="success"
              showIcon
              style={{ marginTop: 16 }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default RecommendationGaranties;