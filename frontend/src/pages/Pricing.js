// src/pages/Pricing.js - Version corrigée avec redirection vers signup
import React, { useState, useEffect, useCallback } from 'react';
import {
  Layout, Typography, Button, Row, Col, Card,
  Space, Divider, Tag, Tooltip, Badge,
  Modal, Form, Input, message, Radio,
  List, Select, Checkbox, Tabs, Progress,
  Steps, Descriptions, Alert, Switch,
  Slider, Avatar, Timeline, Statistic, Spin
} from 'antd';
import {
  RocketOutlined, CheckCircleOutlined, CloseCircleOutlined,
  CrownOutlined, TeamOutlined, UserOutlined,
  BankOutlined, InsuranceOutlined, ApartmentOutlined,
  SafetyCertificateOutlined, ThunderboltOutlined,
  DashboardOutlined, ApiOutlined, CloudOutlined,
  LockOutlined, GlobalOutlined, MailOutlined,
  PhoneOutlined, EnvironmentOutlined, ArrowRightOutlined,
  QuestionCircleOutlined, GiftOutlined, PlayCircleOutlined,
  DownloadOutlined, MenuOutlined, CloseOutlined,
  FacebookOutlined, TwitterOutlined, LinkedinOutlined,
  InstagramOutlined, StarFilled, StarOutlined,
  FundOutlined, RiseOutlined, BulbOutlined,
  ExperimentOutlined, DatabaseOutlined, WalletOutlined,
  ShoppingOutlined, ShoppingCartOutlined,
  PercentageOutlined, CalculatorOutlined,
  FileTextOutlined, CreditCardOutlined,
  EuroCircleOutlined, PayCircleOutlined, CustomerServiceOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CountUp from 'react-countup';
import './Pricing.css';

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// ============================================
// CONSTANTS - Palette professionnelle
// ============================================

const COLORS = {
  primary: '#3b82f6',
  secondary: '#475569',
  accent: '#10b981',
  success: '#10b981',
  error: '#ef4444',
  warning: '#fbbf24',
  info: '#06b6d4',
  bgPrimary: '#0f172a',
  bgSecondary: '#1e293b',
  bgTertiary: '#334155',
  textPrimary: '#ffffff',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  border: '#334155',
  white: '#ffffff',
  whiteSmoke: '#f8fafc',
  gold: '#d4af37',
  gradientPrimary: 'linear-gradient(135deg, #3b82f6 0%, #475569 100%)',
  gradientAccent: 'linear-gradient(135deg, #10b981 0%, #ef4444 100%)',
  gradientSuccess: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)'
};

// ============================================
// PLANS TARIFAIRES PAR SECTEUR
// ============================================

// Plans Banque
const bankingPlans = [
  {
    id: 'banking-essential',
    name: 'Essential',
    icon: <BankOutlined />,
    color: COLORS.primary,
    gradient: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)`,
    price: { monthly: 299, yearly: 2990, savings: 'Économisez 598€' },
    description: 'Solution bancaire essentielle',
    users: 'Jusqu\'à 5 utilisateurs',
    freeTrial: '14 jours',
    features: [
      { text: 'Core Banking', included: true },
      { text: 'Gestion des comptes', included: true },
      { text: 'Transactions bancaires', included: true },
      { text: 'Credit Scoring basique', included: true },
      { text: 'Conformité KYC', included: true },
      { text: 'API limitée', included: true, limited: '500 req/jour' },
      { text: 'Anti-Fraude avancé', included: false },
      { text: 'AML Compliance', included: false },
    ],
    recommended: false,
  },
  {
    id: 'banking-business',
    name: 'Business',
    icon: <CrownOutlined />,
    color: COLORS.accent,
    gradient: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.secondary} 100%)`,
    price: { monthly: 599, yearly: 5990, savings: 'Économisez 1198€' },
    description: 'Solution bancaire complète',
    users: 'Jusqu\'à 20 utilisateurs',
    freeTrial: '14 jours',
    features: [
      { text: 'Toutes fonctionnalités Essential', included: true },
      { text: 'Anti-Fraude avancé (IA)', included: true },
      { text: 'AML Compliance', included: true },
      { text: 'API illimitée', included: true },
      { text: 'Support prioritaire 24/7', included: true },
      { text: 'Dashboard analytics', included: true },
    ],
    recommended: true,
    badge: 'POPULAIRE',
  },
  {
    id: 'banking-enterprise',
    name: 'Enterprise',
    icon: <BankOutlined />,
    color: COLORS.success,
    gradient: `linear-gradient(135deg, ${COLORS.success} 0%, ${COLORS.primary} 100%)`,
    price: { monthly: 1499, yearly: 14990, savings: 'Économisez 2998€' },
    description: 'Solution bancaire sur mesure',
    users: 'Utilisateurs illimités',
    freeTrial: '14 jours',
    features: [
      { text: 'Toutes fonctionnalités Business', included: true },
      { text: 'Robo-advisor avancé', included: true },
      { text: 'Hébergement dédié', included: true },
      { text: 'SLA personnalisé (99.99%)', included: true },
      { text: 'Account manager dédié', included: true },
      { text: 'Formation incluse', included: true },
    ],
    recommended: false,
  },
];

// Plans Assurance
const insurancePlans = [
  {
    id: 'insurance-essential',
    name: 'Essential',
    icon: <InsuranceOutlined />,
    color: COLORS.primary,
    gradient: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)`,
    price: { monthly: 249, yearly: 2490, savings: 'Économisez 498€' },
    description: 'Solution assurance essentielle',
    users: 'Jusqu\'à 5 utilisateurs',
    freeTrial: '14 jours',
    features: [
      { text: 'Gestion des sinistres', included: true },
      { text: 'Gestion des contrats', included: true },
      { text: 'Portail client', included: true },
      { text: 'Scoring risque basique', included: true },
      { text: 'API limitée', included: true, limited: '500 req/jour' },
      { text: 'Vision IA', included: false },
      { text: 'Détection fraude', included: false },
    ],
    recommended: false,
  },
  {
    id: 'insurance-business',
    name: 'Business',
    icon: <CrownOutlined />,
    color: COLORS.accent,
    gradient: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.secondary} 100%)`,
    price: { monthly: 499, yearly: 4990, savings: 'Économisez 998€' },
    description: 'Solution assurance complète',
    users: 'Jusqu\'à 20 utilisateurs',
    freeTrial: '14 jours',
    features: [
      { text: 'Toutes fonctionnalités Essential', included: true },
      { text: 'Vision IA pour sinistres', included: true },
      { text: 'Détection fraude IA', included: true },
      { text: 'API illimitée', included: true },
      { text: 'Support prioritaire 24/7', included: true },
    ],
    recommended: true,
    badge: 'POPULAIRE',
  },
  {
    id: 'insurance-enterprise',
    name: 'Enterprise',
    icon: <InsuranceOutlined />,
    color: COLORS.success,
    gradient: `linear-gradient(135deg, ${COLORS.success} 0%, ${COLORS.primary} 100%)`,
    price: { monthly: 1299, yearly: 12990, savings: 'Économisez 2598€' },
    description: 'Solution assurance sur mesure',
    users: 'Utilisateurs illimités',
    freeTrial: '14 jours',
    features: [
      { text: 'Toutes fonctionnalités Business', included: true },
      { text: 'Prévention sinistres IA', included: true },
      { text: 'Hébergement dédié', included: true },
      { text: 'SLA personnalisé', included: true },
      { text: 'Account manager dédié', included: true },
    ],
    recommended: false,
  },
];

// Plans Entreprise
const enterprisePlans = [
  {
    id: 'enterprise-essential',
    name: 'Essential',
    icon: <ApartmentOutlined />,
    color: COLORS.primary,
    gradient: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.secondary} 100%)`,
    price: { monthly: 199, yearly: 1990, savings: 'Économisez 398€' },
    description: 'Solution ERP essentielle',
    users: 'Jusqu\'à 5 utilisateurs',
    freeTrial: '14 jours',
    features: [
      { text: 'Ventes & Achats', included: true },
      { text: 'CRM de base', included: true },
      { text: 'Comptabilité simple', included: true },
      { text: 'Gestion de stock', included: true },
      { text: 'Rapports standards', included: true },
      { text: 'API limitée', included: true, limited: '500 req/jour' },
      { text: 'RH & Paie', included: false },
      { text: 'Support prioritaire', included: false },
    ],
    recommended: false,
  },
  {
    id: 'enterprise-business',
    name: 'Business',
    icon: <CrownOutlined />,
    color: COLORS.accent,
    gradient: `linear-gradient(135deg, ${COLORS.accent} 0%, ${COLORS.secondary} 100%)`,
    price: { monthly: 399, yearly: 3990, savings: 'Économisez 798€' },
    description: 'Solution ERP complète',
    users: 'Jusqu\'à 20 utilisateurs',
    freeTrial: '14 jours',
    features: [
      { text: 'Toutes fonctionnalités Essential', included: true },
      { text: 'RH & Paie', included: true },
      { text: 'Support prioritaire', included: true },
      { text: 'API illimitée', included: true },
      { text: 'Rapports avancés & BI', included: true },
    ],
    recommended: true,
    badge: 'POPULAIRE',
  },
  {
    id: 'enterprise-enterprise',
    name: 'Enterprise',
    icon: <ApartmentOutlined />,
    color: COLORS.success,
    gradient: `linear-gradient(135deg, ${COLORS.success} 0%, ${COLORS.primary} 100%)`,
    price: { monthly: 999, yearly: 9990, savings: 'Économisez 1998€' },
    description: 'Solution ERP sur mesure',
    users: 'Utilisateurs illimités',
    freeTrial: '14 jours',
    features: [
      { text: 'Toutes fonctionnalités Business', included: true },
      { text: 'BI avancée & Analytics IA', included: true },
      { text: 'Hébergement dédié', included: true },
      { text: 'SLA personnalisé (99.99%)', included: true },
      { text: 'Account manager dédié', included: true },
    ],
    recommended: false,
  },
];

// Secteurs disponibles
const SECTORS = [
  { key: 'banking', label: '🏦 Banque & Finance', icon: <BankOutlined />, color: COLORS.primary, plans: bankingPlans },
  { key: 'insurance', label: '🛡️ Assurance', icon: <InsuranceOutlined />, color: COLORS.accent, plans: insurancePlans },
  { key: 'enterprise', label: '🏢 Entreprise', icon: <ApartmentOutlined />, color: COLORS.success, plans: enterprisePlans },
];

// ============================================
// MAIN COMPONENT
// ============================================

const Pricing = () => {
  const { t } = useTranslation();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [selectedSector, setSelectedSector] = useState(() => {
    return localStorage.getItem('selectedSector') || 'enterprise';
  });
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [enterpriseModalVisible, setEnterpriseModalVisible] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredPlan, setHoveredPlan] = useState(null);
  const [loading, setLoading] = useState(false);
  
  const navigate = useNavigate();

  // Scroll handler
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Obtenir les plans du secteur sélectionné
  const currentSector = SECTORS.find(s => s.key === selectedSector);
  const plans = currentSector?.plans || enterprisePlans;

  // Changer de secteur
  const handleSectorChange = (sectorKey) => {
    setLoading(true);
    setSelectedSector(sectorKey);
    localStorage.setItem('selectedSector', sectorKey);
    setTimeout(() => setLoading(false), 300);
  };

  // ========== CORRECTION : Redirection vers signup au lieu de login ==========
  const handleStartTrial = (plan) => {
    // Stocker le plan sélectionné dans localStorage
    const selectedPlanData = {
      id: plan.id,
      name: plan.name,
      price: plan.price[billingCycle],
      billingCycle: billingCycle,
      sector: selectedSector,
      features: plan.features,
      users: plan.users,
      freeTrial: plan.freeTrial
    };
    localStorage.setItem('selectedPlan', JSON.stringify(selectedPlanData));
    
    // Rediriger vers signup au lieu de login
    navigate('/signup', { 
      state: { 
        selectedPlan: selectedPlanData,
        fromPricing: true
      } 
    });
  };

  const handleEnterpriseContactClick = (plan) => {
    setSelectedPlan(plan);
    setEnterpriseModalVisible(true);
  };

  const handleEnterpriseContact = (values) => {
    message.success({
      content: 'Demande envoyée ! Notre équipe vous contactera sous 24h.',
      icon: <CheckCircleOutlined style={{ color: COLORS.success }} />
    });
    setEnterpriseModalVisible(false);
  };

  const handleDemoRequest = () => {
    message.info('Demande de démo envoyée. Un expert vous contactera prochainement.');
  };

  // Statistiques
  const stats = [
    { value: 1500, label: 'Clients', icon: <TeamOutlined />, color: COLORS.primary },
    { value: 98, label: '% satisfaction', icon: <StarFilled />, color: COLORS.accent },
    { value: 60, label: 'Modules', icon: <DatabaseOutlined />, color: COLORS.secondary },
    { value: 24, label: 'Support 24/7', icon: <ThunderboltOutlined />, color: COLORS.success }
  ];

  // Animations
  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer = {
    visible: {
      transition: { staggerChildren: 0.1, delayChildren: 0.3 }
    }
  };

  return (
    <Layout className="pricing-layout" style={{ background: COLORS.bgPrimary, minHeight: '100vh' }}>
      {/* Header */}
      <Header className={`pricing-header ${scrolled ? 'scrolled' : ''}`} style={{ 
        position: 'fixed', 
        width: '100%', 
        zIndex: 1000, 
        background: scrolled ? COLORS.bgSecondary : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? `1px solid ${COLORS.border}` : 'none',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        height: scrolled ? '70px' : '90px',
        display: 'flex',
        alignItems: 'center',
        padding: '0 50px'
      }}>
        <div className="header-container" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="logo-container" onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}>
            <motion.div 
              whileHover={{ scale: 1.05 }}
              style={{ 
                width: 40, 
                height: 40, 
                background: COLORS.gradientPrimary,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: `0 0 20px ${COLORS.primary}40`
              }}
            >
              <RocketOutlined style={{ fontSize: 24, color: COLORS.white }} />
            </motion.div>
            <span className="logo-text" style={{ color: COLORS.textPrimary, fontSize: 24, fontWeight: 900, letterSpacing: -1 }}>NEXUM<span style={{ color: COLORS.primary }}>.</span></span>
          </div>

          <div className="nav-menu" style={{ display: 'flex', gap: 32 }}>
            <Button type="link" onClick={() => navigate('/')} style={{ color: COLORS.textSecondary, fontWeight: 600, fontSize: 15, padding: 0 }}>Accueil</Button>
            <Button type="link" onClick={() => navigate('/contact')} style={{ color: COLORS.textSecondary, fontWeight: 600, fontSize: 15, padding: 0 }}>Contact</Button>
            <Button type="link" onClick={() => navigate('/pricing')} style={{ color: COLORS.accent, fontWeight: 600, fontSize: 15, padding: 0 }}>Tarifs</Button>
          </div>

          <Space size="middle">
            <Button 
              onClick={() => navigate('/login')}
              style={{ background: 'transparent', border: `1px solid ${COLORS.border}`, color: COLORS.textPrimary, borderRadius: 12, fontWeight: 600 }}
            >
              Se connecter
            </Button>
            <Button 
              type="primary" 
              onClick={() => navigate('/signup')}
              style={{ background: COLORS.gradientPrimary, border: 'none', color: COLORS.white, borderRadius: 12, fontWeight: 700, padding: '0 24px' }}
            >
              Essai gratuit
            </Button>
          </Space>
        </div>
      </Header>

      <Content>
        {/* Hero Section */}
        <motion.section 
          className="pricing-hero"
          initial="visible"
          style={{ paddingTop: 120, paddingBottom: 80, textAlign: 'center', position: 'relative', background: `linear-gradient(135deg, ${COLORS.bgSecondary}, ${COLORS.bgTertiary})`, minHeight: 'auto' }}
        >
          <div className="hero-content" style={{ maxWidth: 800, margin: '0 auto', padding: '0 24px' }}>
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge.Ribbon text="14 jours gratuits" color={COLORS.accent}>
                <Title level={1} style={{ color: COLORS.textPrimary, fontSize: 48, fontWeight: 800, marginBottom: 0 }}>
                  Nos <span style={{ color: COLORS.primary }}>tarifs</span>
                </Title>
              </Badge.Ribbon>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Title level={2} className="hero-subtitle" style={{ color: COLORS.textSecondary, fontSize: 24, marginTop: 16 }}>
                Des solutions adaptées à votre secteur
              </Title>
              
              <Paragraph className="hero-description" style={{ color: COLORS.textMuted, fontSize: 18, marginBottom: 32 }}>
                Choisissez le plan qui correspond à vos besoins. Tous nos plans incluent un essai gratuit de 14 jours.
              </Paragraph>
            </motion.div>

            {/* Sélecteur de secteur */}
            <div className="sector-selector" style={{ marginBottom: 48 }}>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
                {SECTORS.map(sector => (
                  <Button
                    key={sector.key}
                    size="large"
                    onClick={() => handleSectorChange(sector.key)}
                    style={{
                      background: selectedSector === sector.key ? sector.color : 'transparent',
                      borderColor: sector.color,
                      color: selectedSector === sector.key ? COLORS.white : sector.color,
                      borderRadius: 12,
                      padding: '8px 24px',
                      fontWeight: 600
                    }}
                  >
                    {sector.icon} {sector.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <Row gutter={[24, 24]} className="hero-stats" justify="center">
              {stats.map((stat, index) => (
                <Col xs={12} sm={6} key={index}>
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5, delay: 0.4 + (index * 0.1) }}
                  >
                    <Statistic
                      title={<span style={{ color: COLORS.textMuted }}>{stat.label}</span>}
                      value={stat.value}
                      prefix={stat.icon}
                      valueStyle={{ color: stat.color }}
                    />
                  </motion.div>
                </Col>
              ))}
            </Row>
          </div>
        </motion.section>

        {/* Pricing Cards */}
        <motion.section 
          className="pricing-cards-section"
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          style={{ padding: '80px 24px' }}
        >
          <div className="section-header" style={{ textAlign: 'center', marginBottom: 48 }}>
            <Tag color={currentSector?.color} className="section-tag" style={{ background: currentSector?.color, border: 'none', color: 'white', padding: '4px 16px', borderRadius: 20 }}>
              {currentSector?.icon} {currentSector?.label}
            </Tag>
            <Title level={2} style={{ color: COLORS.textPrimary, marginTop: 16 }}>Choisissez votre formule</Title>
            <Paragraph type="secondary" style={{ color: COLORS.textMuted }}>
              Des prix transparents, sans engagement
            </Paragraph>
          </div>

          {/* Billing Toggle */}
          <div className="billing-toggle" style={{ textAlign: 'center', marginBottom: 48 }}>
            <Space size="large">
              <Text strong style={{ color: billingCycle === 'monthly' ? COLORS.primary : COLORS.textMuted }}>Mensuel</Text>
              <Switch
                checked={billingCycle === 'yearly'}
                onChange={(checked) => setBillingCycle(checked ? 'yearly' : 'monthly')}
                checkedChildren="Annuel"
                unCheckedChildren="Mensuel"
                style={{ background: COLORS.gradientPrimary }}
              />
              <Text strong style={{ color: billingCycle === 'yearly' ? COLORS.primary : COLORS.textMuted }}>Annuel</Text>
              {billingCycle === 'yearly' && (
                <Tag color="gold" style={{ background: `${COLORS.accent}20`, border: 'none', color: COLORS.accent }}>Économisez 20%</Tag>
              )}
            </Space>
          </div>

          {/* Plans Cards */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <Spin size="large" tip="Chargement des offres..." ><div/></Spin>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedSector}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
              >
                <Row gutter={[32, 32]} justify="center" style={{ maxWidth: 1400, margin: '0 auto' }}>
                  {plans && plans.length > 0 ? (
                    plans.map((plan, index) => (
                      <Col xs={24} md={8} key={plan.id}>
                        <motion.div
                          variants={fadeInUp}
                          onHoverStart={() => setHoveredPlan(plan.id)}
                          onHoverEnd={() => setHoveredPlan(null)}
                        >
                          <Card
                            className={`pricing-card ${plan.recommended ? 'recommended' : ''}`}
                            hoverable
                            style={{ 
                              background: COLORS.bgSecondary, 
                              backdropFilter: 'blur(16px)',
                              border: plan.recommended ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
                              borderRadius: 24,
                              height: '100%',
                              position: 'relative',
                              overflow: 'hidden'
                            }}
                          >
                            {plan.recommended && (
                              <div style={{ position: 'absolute', top: 20, right: -30, transform: 'rotate(45deg)', background: COLORS.accent, padding: '8px 40px', fontSize: 12, fontWeight: 'bold', color: 'white' }}>
                                RECOMMANDÉ
                              </div>
                            )}

                            {/* Badge essai gratuit */}
                            <div style={{ position: 'absolute', top: 20, left: 20, zIndex: 1 }}>
                              <Tag color="gold" style={{ background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.gold})`, border: 'none', color: 'white', fontWeight: 'bold' }}>
                                14 jours gratuits
                              </Tag>
                            </div>

                            <div className="plan-header" style={{ textAlign: 'center', marginBottom: 24 }}>
                              <motion.div
                                whileHover={{ scale: 1.1, rotate: 10 }}
                                style={{ 
                                  width: 70, 
                                  height: 70, 
                                  background: plan.gradient,
                                  borderRadius: 20,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  margin: '0 auto 20px',
                                  fontSize: 32,
                                  color: COLORS.white
                                }}
                              >
                                {plan.icon}
                              </motion.div>
                              <Title level={3} style={{ color: COLORS.textPrimary, marginBottom: 8 }}>{plan.name}</Title>
                              <Text style={{ color: COLORS.textMuted }}>{plan.description}</Text>
                            </div>

                            <div className="plan-price" style={{ textAlign: 'center', marginBottom: 24 }}>
                              <Title level={1} style={{ color: COLORS.textPrimary, marginBottom: 8 }}>
                                {typeof plan.price[billingCycle] === 'number' ? (
                                  <>
                                    <CountUp
                                      start={0}
                                      end={plan.price[billingCycle]}
                                      duration={2}
                                      prefix="€"
                                    />
                                    <small style={{ color: COLORS.textMuted, fontSize: 14 }}>/mois</small>
                                  </>
                                ) : (
                                  <span style={{ color: COLORS.accent }}>{plan.price[billingCycle]}</span>
                                )}
                              </Title>
                              {billingCycle === 'yearly' && plan.price.yearly !== 'Sur mesure' && (
                                <Tag color="green" style={{ background: `${COLORS.success}20`, border: 'none', color: COLORS.success }}>{plan.savings}</Tag>
                              )}
                              <div style={{ marginTop: 8 }}>
                                <Tag color="gold" style={{ background: `${COLORS.accent}20`, border: 'none' }}>
                                  <GiftOutlined /> Essai 14 jours inclus
                                </Tag>
                              </div>
                            </div>

                            <div className="plan-specs" style={{ background: COLORS.bgTertiary, borderRadius: 12, padding: 16, marginBottom: 24 }}>
                              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                <Text style={{ color: COLORS.textSecondary }}><UserOutlined /> {plan.users}</Text>
                              </Space>
                            </div>

                            <Divider style={{ borderColor: COLORS.border, margin: '16px 0' }} />

                            <div className="plan-features" style={{ marginBottom: 24 }}>
                              <List
                                dataSource={plan.features}
                                renderItem={feature => (
                                  <List.Item style={{ padding: '8px 0', border: 'none' }}>
                                    {feature.included ? (
                                      <CheckCircleOutlined style={{ color: COLORS.success, marginRight: 12 }} />
                                    ) : (
                                      <CloseCircleOutlined style={{ color: COLORS.error, marginRight: 12 }} />
                                    )}
                                    <Text style={{ color: feature.included ? COLORS.textSecondary : COLORS.textMuted }}>
                                      {feature.text}
                                      {feature.limited && (
                                        <Tag color="blue" style={{ marginLeft: 8, background: `${COLORS.info}20`, border: 'none' }}>{feature.limited}</Tag>
                                      )}
                                    </Text>
                                  </List.Item>
                                )}
                              />
                            </div>

                            {/* ========== BOUTON CORRIGÉ ========== */}
                            {plan.id.includes('enterprise') ? (
                              <Button
                                type="default"
                                size="large"
                                block
                                onClick={() => handleEnterpriseContactClick(plan)}
                                style={{ 
                                  background: 'transparent',
                                  borderColor: COLORS.primary,
                                  color: COLORS.primary,
                                  borderRadius: 12,
                                  fontWeight: 700,
                                  height: 50
                                }}
                              >
                                Contacter les ventes
                              </Button>
                            ) : (
                              <Button
                                type={plan.recommended ? "primary" : "default"}
                                size="large"
                                block
                                onClick={() => handleStartTrial(plan)}
                                style={{ 
                                  background: plan.recommended ? COLORS.gradientPrimary : 'transparent',
                                  borderColor: COLORS.primary,
                                  color: plan.recommended ? COLORS.white : COLORS.primary,
                                  borderRadius: 12,
                                  fontWeight: 700,
                                  height: 50
                                }}
                              >
                                Commencer l'essai gratuit
                              </Button>
                            )}
                          </Card>
                        </motion.div>
                      </Col>
                    ))
                  ) : (
                    <div style={{ textAlign: 'center', padding: 50 }}>
                      <Text style={{ color: COLORS.textMuted }}>Aucun plan disponible pour ce secteur.</Text>
                    </div>
                  )}
                </Row>
              </motion.div>
            </AnimatePresence>
          )}
        </motion.section>

        {/* FAQ Section */}
        <motion.section 
          className="pricing-faq"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={fadeInUp}
          style={{ padding: '80px 24px' }}
        >
          <div className="section-header" style={{ textAlign: 'center', marginBottom: 48 }}>
            <Tag color="cyan" className="section-tag" style={{ background: `linear-gradient(135deg, ${COLORS.info}, ${COLORS.secondary})`, border: 'none', color: COLORS.white, padding: '4px 16px', borderRadius: 20 }}>
              FAQ
            </Tag>
            <Title level={2} style={{ color: COLORS.textPrimary, marginTop: 16 }}>Questions fréquentes</Title>
            <Paragraph type="secondary" style={{ color: COLORS.textMuted }}>
              Tout ce que vous devez savoir sur nos offres
            </Paragraph>
          </div>

          <Row gutter={[32, 32]} style={{ maxWidth: 1200, margin: '0 auto' }}>
            <Col xs={24} md={12}>
              <Card className="faq-card" style={{ background: COLORS.bgSecondary, border: `1px solid ${COLORS.border}`, borderRadius: 20 }}>
                {[
                  { q: "Qu'est-ce que l'essai gratuit de 14 jours ?", a: "L'essai gratuit vous permet de tester notre plateforme en conditions réelles pendant 14 jours, sans aucun engagement." },
                  { q: "Puis-je changer de formule à tout moment ?", a: "Oui, vous pouvez passer à une formule supérieure à tout moment. Le passage à une formule inférieure est possible en fin de cycle de facturation." },
                  { q: "Y a-t-il des frais d'installation ?", a: "Non, l'installation est entièrement gratuite et notre équipe vous accompagne lors de la mise en place." },
                  { q: "Quels sont les modes de paiement acceptés ?", a: "Nous acceptons les cartes bancaires (Visa, Mastercard, American Express) et les virements bancaires." }
                ].map((item, idx) => (
                  <div key={idx} style={{ 
                    padding: '16px 0', 
                    borderBottom: idx < 3 ? `1px solid ${COLORS.border}` : 'none' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <QuestionCircleOutlined style={{ color: COLORS.primary, fontSize: 18 }} />
                      <Text strong style={{ color: COLORS.textPrimary, fontSize: 16 }}>{item.q}</Text>
                    </div>
                    <Text style={{ color: COLORS.textMuted, marginLeft: 30, display: 'block' }}>{item.a}</Text>
                  </div>
                ))}
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card className="faq-card" style={{ background: COLORS.bgSecondary, border: `1px solid ${COLORS.border}`, borderRadius: 20 }}>
                {[
                  { q: "Proposez-vous des réductions pour les ONG ?", a: "Oui, nous offrons des tarifs préférentiels pour les organisations à but non lucratif. Contactez-nous pour plus d'informations." },
                  { q: "Comment se passe le support technique ?", a: "Le support technique est disponible 24/7 par chat, email et téléphone pour les formules Business et Enterprise." },
                  { q: "Mes données sont-elles sécurisées ?", a: "Absolument ! Nous sommes certifiés ISO 27001 et RGPD compliant. Vos données sont hébergées en France." },
                  { q: "Puis-je résilier à tout moment ?", a: "Oui, vous pouvez résilier votre abonnement à tout moment sans frais supplémentaires." }
                ].map((item, idx) => (
                  <div key={idx} style={{ 
                    padding: '16px 0', 
                    borderBottom: idx < 3 ? `1px solid ${COLORS.border}` : 'none' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                      <QuestionCircleOutlined style={{ color: COLORS.accent, fontSize: 18 }} />
                      <Text strong style={{ color: COLORS.textPrimary, fontSize: 16 }}>{item.q}</Text>
                    </div>
                    <Text style={{ color: COLORS.textMuted, marginLeft: 30, display: 'block' }}>{item.a}</Text>
                  </div>
                ))}
              </Card>
            </Col>
          </Row>
        </motion.section>

        {/* CTA Section */}
        <motion.section 
          className="pricing-cta"
          variants={fadeInUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          style={{ padding: '80px 24px', background: COLORS.bgSecondary }}
        >
          <Card className="cta-card" style={{ maxWidth: 1000, margin: '0 auto', background: COLORS.gradientPrimary, borderRadius: 24, border: 'none' }}>
            <Row align="middle" gutter={[24, 24]}>
              <Col xs={24} md={16}>
                <Title level={2} style={{ color: COLORS.white, marginBottom: 8 }}>Prêt à démarrer ?</Title>
                <Paragraph style={{ color: COLORS.whiteSmoke, marginBottom: 0 }}>
                  Profitez de 14 jours d'essai gratuit. Aucune carte bancaire requise.
                </Paragraph>
              </Col>
              <Col xs={24} md={8}>
                <Space direction="vertical" size="middle" className="cta-buttons" style={{ width: '100%' }}>
                  <Button 
                    type="primary" 
                    size="large" 
                    block
                    icon={<RocketOutlined />}
                    onClick={() => navigate('/signup')}
                    style={{ background: COLORS.white, color: COLORS.primary, border: 'none', borderRadius: 12, fontWeight: 700 }}
                  >
                    Essai gratuit 14 jours
                  </Button>
                  <Button 
                    size="large" 
                    block
                    onClick={handleDemoRequest}
                    style={{ background: 'transparent', border: `2px solid ${COLORS.white}`, color: COLORS.white, borderRadius: 12, fontWeight: 700 }}
                  >
                    Demander une démo
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>
        </motion.section>
      </Content>

      {/* Footer */}
      <Footer style={{ 
        backgroundColor: COLORS.bgSecondary, 
        color: COLORS.white,
        padding: '60px 24px 24px',
        width: '100%',
        position: 'relative',
        zIndex: 1000,
        marginTop: '40px',
        borderTop: `1px solid ${COLORS.border}`
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <Row gutter={[48, 48]}>
            <Col xs={24} sm={12} md={6}>
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '20px', color: COLORS.white, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                    <RocketOutlined style={{ color: COLORS.primary }} />
                  </motion.div>
                  <span>Nexum</span>
                </div>
                <p style={{ color: COLORS.textMuted, marginBottom: '24px', lineHeight: '1.6', fontSize: '14px' }}>
                  La plateforme ERP nouvelle génération qui transforme la gestion d'entreprise.
                </p>
              </div>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div>
                <h4 style={{ color: COLORS.textPrimary, fontSize: '18px', marginBottom: '20px', paddingBottom: '10px', borderBottom: `2px solid ${COLORS.primary}`, display: 'inline-block' }}>
                  Produit
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginTop: 20 }}>
                  <li style={{ marginBottom: '12px' }}><Button type="link" onClick={() => navigate('/features')} style={{ color: COLORS.textMuted, padding: 0, height: 'auto' }}>Fonctionnalités</Button></li>
                  <li style={{ marginBottom: '12px' }}><Button type="link" onClick={() => navigate('/pricing')} style={{ color: COLORS.textMuted, padding: 0, height: 'auto' }}>Tarifs</Button></li>
                  <li style={{ marginBottom: '12px' }}><Button type="link" onClick={() => navigate('/security')} style={{ color: COLORS.textMuted, padding: 0, height: 'auto' }}>Sécurité</Button></li>
                </ul>
              </div>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div>
                <h4 style={{ color: COLORS.textPrimary, fontSize: '18px', marginBottom: '20px', paddingBottom: '10px', borderBottom: `2px solid ${COLORS.primary}`, display: 'inline-block' }}>
                  Ressources
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginTop: 20 }}>
                  <li style={{ marginBottom: '12px' }}><Button type="link" onClick={() => navigate('/blog')} style={{ color: COLORS.textMuted, padding: 0, height: 'auto' }}>Blog</Button></li>
                  <li style={{ marginBottom: '12px' }}><Button type="link" onClick={() => navigate('/documentation')} style={{ color: COLORS.textMuted, padding: 0, height: 'auto' }}>Documentation</Button></li>
                  <li style={{ marginBottom: '12px' }}><Button type="link" onClick={() => navigate('/support')} style={{ color: COLORS.textMuted, padding: 0, height: 'auto' }}>Support</Button></li>
                </ul>
              </div>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <div>
                <h4 style={{ color: COLORS.textPrimary, fontSize: '18px', marginBottom: '20px', paddingBottom: '10px', borderBottom: `2px solid ${COLORS.primary}`, display: 'inline-block' }}>
                  Contact
                </h4>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginTop: 20 }}>
                  <li style={{ color: COLORS.textMuted, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <MailOutlined style={{ color: COLORS.primary }} /> contact@nexum.com
                  </li>
                  <li style={{ color: COLORS.textMuted, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <PhoneOutlined style={{ color: COLORS.primary }} /> +33 1 86 26 27 28
                  </li>
                  <li style={{ color: COLORS.textMuted, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <EnvironmentOutlined style={{ color: COLORS.primary }} /> 123 Avenue des Champs-Élysées, 75008 Paris
                  </li>
                </ul>
              </div>
            </Col>
          </Row>

          <Divider style={{ margin: '32px 0 24px', borderColor: COLORS.border }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <span style={{ color: COLORS.textMuted, fontSize: '13px' }}>© 2026 Nexum. Tous droits réservés.</span>
            <div style={{ display: 'flex', gap: '16px' }}>
              <Button type="link" style={{ color: COLORS.textMuted, fontSize: '13px', padding: 0 }}>Mentions légales</Button>
              <Button type="link" style={{ color: COLORS.textMuted, fontSize: '13px', padding: 0 }}>Politique de confidentialité</Button>
              <Button type="link" style={{ color: COLORS.textMuted, fontSize: '13px', padding: 0 }}>CGV</Button>
            </div>
          </div>
        </div>
      </Footer>

      {/* Enterprise Modal */}
      <Modal
        title={<span style={{ fontSize: 20, fontWeight: 'bold' }}>Contact commercial</span>}
        open={enterpriseModalVisible}
        onCancel={() => setEnterpriseModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form layout="vertical" onFinish={handleEnterpriseContact}>
          <Form.Item name="name" label="Nom complet" rules={[{ required: true }]}>
            <Input size="large" placeholder="Jean Dupont" />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input size="large" placeholder="jean.dupont@entreprise.com" />
          </Form.Item>
          <Form.Item name="company" label="Entreprise" rules={[{ required: true }]}>
            <Input size="large" placeholder="Ma société" />
          </Form.Item>
          <Form.Item name="phone" label="Téléphone">
            <Input size="large" placeholder="+33 6 12 34 56 78" />
          </Form.Item>
          <Form.Item name="employees" label="Nombre d'employés">
            <Select size="large" placeholder="Sélectionnez">
              <Option value="1-50">1-50</Option>
              <Option value="51-200">51-200</Option>
              <Option value="201-500">201-500</Option>
              <Option value="500+">500+</Option>
            </Select>
          </Form.Item>
          <Form.Item name="message" label="Message">
            <Input.TextArea rows={4} placeholder="Décrivez votre projet..." />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" style={{ background: COLORS.gradientPrimary }}>
              Envoyer la demande
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default Pricing;