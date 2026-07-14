// src/pages/Signup.js - Version SaaS avec sélection du plan depuis Pricing
// DESIGN DARK MODE - COHÉRENT AVEC LES AUTRES PAGES
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Form, Input, Button, Card, Checkbox, Typography, 
  Divider, Alert, Space, Steps, Select,
  Progress, message, Avatar,
  Modal, Descriptions, Badge, Tooltip,
  Row, Col, Spin, Tag
} from 'antd';
import { 
  UserOutlined, LockOutlined, MailOutlined, 
  PhoneOutlined, HomeOutlined, BankOutlined,
  GlobalOutlined, SafetyCertificateOutlined,
  ArrowLeftOutlined, ArrowRightOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  EyeOutlined, EyeInvisibleOutlined,
  GoogleOutlined, LinkedinOutlined,
  RocketOutlined, ShopOutlined,
  WarningOutlined, StarOutlined,
  ThunderboltOutlined, TeamOutlined,
  TrophyOutlined, GiftOutlined,
  DashboardOutlined, ApiOutlined, CloudOutlined,
  RobotOutlined, FundOutlined,
  HeartOutlined, SecurityScanOutlined,
  IdcardOutlined, EnvironmentOutlined,
  CalendarOutlined, CheckOutlined,
  BuildOutlined, FileProtectOutlined,
  InsuranceOutlined, ApartmentOutlined,
  CreditCardOutlined, CrownOutlined
} from '@ant-design/icons';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import './Signup.css';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { Option } = Select;

// ============================================
// CONSTANTS - Palette couleurs DARK MODE
// ============================================

const COLORS = {
  // Couleurs principales (inchangées)
  primary: '#3b82f6',
  primaryLight: '#60a5fa',
  primaryDark: '#2563eb',
  secondary: '#475569',
  secondaryLight: '#a78bfa',
  accent: '#f97316',
  success: '#10b981',
  successLight: '#34d399',
  error: '#ef4444',
  warning: '#10b981',
  info: '#0ea5e9',
  
  // Blanc et nuances pour dark mode
  white: '#ffffff',
  
  // Gris pour dark mode (inversés)
  gray50: '#111827',    // Fond le plus sombre
  gray100: '#1f2937',   // Fond secondaire
  gray200: '#374151',   // Bordures
  gray300: '#4b5563',   // Bordures plus claires
  gray400: '#6b7280',   // Texte désactivé
  gray500: '#9ca3af',   // Texte secondaire
  gray600: '#d1d5db',   // Texte
  gray700: '#e5e7eb',   // Texte important
  gray800: '#f3f4f6',   // Titres
  gray900: '#f9fafb',   // Texte le plus clair
  
  // Fond colorés pour dark mode
  blue50: 'rgba(59, 130, 246, 0.15)',
  green50: 'rgba(16, 185, 129, 0.15)',
  amber50: 'rgba(245, 158, 11, 0.15)',
  purple50: 'rgba(139, 92, 246, 0.15)',
};

// Secteurs disponibles
const SECTORS = [
  { value: 'banking', label: 'Banque & Finance', icon: <BankOutlined />, color: COLORS.primary, bgColor: COLORS.blue50 },
  { value: 'insurance', label: 'Assurance', icon: <InsuranceOutlined />, color: COLORS.accent, bgColor: COLORS.amber50 },
  { value: 'enterprise', label: 'Entreprise', icon: <ApartmentOutlined />, color: COLORS.success, bgColor: COLORS.green50 },
];

// Features list
const featuresList = [
  { icon: <DashboardOutlined />, title: 'Tableau de bord', desc: 'Personnalisé avec indicateurs clés' },
  { icon: <RobotOutlined />, title: 'Assistants IA', desc: 'Predict, Risk, Growth, Copilot' },
  { icon: <TeamOutlined />, title: 'Collaboration', desc: 'Outils collaboratifs en temps réel' },
  { icon: <FundOutlined />, title: 'Analyses', desc: 'Rapports avancés et exports' },
  { icon: <SafetyCertificateOutlined />, title: 'Support 24/7', desc: 'Assistance prioritaire' },
  { icon: <CloudOutlined />, title: 'Cloud sécurisé', desc: 'Hébergement haute disponibilité' },
  { icon: <ApiOutlined />, title: 'API ouverte', desc: 'Intégrations complètes' },
  { icon: <SecurityScanOutlined />, title: 'Sécurité', desc: 'Chiffrement AES-256, RGPD' },
];

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const Signup = () => {
  const location = useLocation();
  // États
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [previewModal, setPreviewModal] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [formData, setFormData] = useState({});
  const [selectedPlan, setSelectedPlan] = useState(null);
  
  const navigate = useNavigate();
  const [form] = Form.useForm();

  // Récupérer le plan sélectionné depuis la page Pricing
  useEffect(() => {
    // Vérifier d'abord dans location.state
    if (location.state?.selectedPlan) {
      setSelectedPlan(location.state.selectedPlan);
      localStorage.removeItem('selectedPlan');
    } 
    // Sinon dans localStorage
    else {
      const savedPlan = localStorage.getItem('selectedPlan');
      if (savedPlan) {
        setSelectedPlan(JSON.parse(savedPlan));
        localStorage.removeItem('selectedPlan');
      }
    }
  }, [location]);

  // Vérification de la force du mot de passe
  const checkPasswordStrength = (password) => {
    if (!password) {
      setPasswordStrength(0);
      return 0;
    }
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    
    setPasswordStrength(strength);
    return strength;
  };

  // Vérification de disponibilité de l'email
  const checkEmailAvailability = useCallback(async (email) => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailAvailable(null);
      return;
    }
    
    setVerifyingEmail(true);
    try {
      const response = await api.get(`/auth/check-email?email=${encodeURIComponent(email)}`);
      setEmailAvailable(response.data.available);
    } catch (err) {
      setEmailAvailable(null);
    } finally {
      setVerifyingEmail(false);
    }
  }, []);

  // Debounce pour la vérification email
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      const email = form.getFieldValue('email');
      if (email) checkEmailAvailability(email);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [form.getFieldValue('email'), checkEmailAvailability]);

  // Redirection si déjà connecté
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      navigate('/dashboard', { replace: true });
    }
  }, [navigate]);

  const handleNext = async () => {
    try {
      const fieldsToValidate = currentStep === 0 
        ? ['fullname', 'email', 'phone', 'password', 'confirmPassword', 'sector']
        : ['companyName', 'companySize', 'address', 'city', 'country'];
      
      await form.validateFields(fieldsToValidate);
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const values = form.getFieldsValue(true);
      
      const signupData = {
        full_name: values.fullname,
        email: values.email,
        phone: values.phone || '',
        password: values.password,
        sector: values.sector || 'enterprise',
        company_name: values.companyName || '',
        company_size: values.companySize || '',
        registration_number: values.registrationNumber || null,
        address: values.address || '',
        city: values.city || '',
        country: values.country || 'France',
        siret: values.siret || null,
        newsletter: values.newsletter || false,
        selected_plan: selectedPlan ? {
          id: selectedPlan.id,
          name: selectedPlan.name,
          price: selectedPlan.price,
          billingCycle: selectedPlan.billingCycle
        } : null
      };

      const response = await api.post('/auth/register', signupData, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      const data = response.data;
      
      if (data.success || data.token) {
        if (data.token?.access_token) {
          localStorage.setItem('token', data.token.access_token);
        }
        if (data.token?.user) {
          localStorage.setItem('user', JSON.stringify(data.token.user));
          localStorage.setItem('userSector', values.sector || 'enterprise');
        }
        
        setSuccess('Compte créé avec succès ! Redirection en cours...');
        message.success({
          content: `Bienvenue ${values.fullname} ! 🎉`,
          icon: <CheckCircleOutlined style={{ color: COLORS.success }} />,
          duration: 3,
        });
        
        // Redirection vers la page de paiement si un plan payant a été sélectionné
        if (selectedPlan && selectedPlan.price > 0 && !selectedPlan.id.includes('free')) {
          setTimeout(() => {
            navigate('/payment', { 
              state: { 
                plan: selectedPlan,
                user: { email: values.email, name: values.fullname }
              } 
            });
          }, 2000);
        } else {
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 2000);
        }
      } else {
        setError(data.message || 'Erreur lors de l\'inscription');
      }
    } catch (err) {
      console.error('❌ Erreur inscription:', err);
      
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Une erreur est survenue';
      setError(typeof errorMsg === 'string' ? errorMsg : JSON.stringify(errorMsg));
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return COLORS.error;
    if (passwordStrength <= 3) return COLORS.warning;
    if (passwordStrength <= 4) return COLORS.info;
    return COLORS.success;
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 2) return 'Faible';
    if (passwordStrength <= 3) return 'Moyen';
    if (passwordStrength <= 4) return 'Fort';
    return 'Très fort';
  };

  return (
    <div className="signup-page">
      {/* Header */}
      <div className="signup-header">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="header-logo-wrapper"
        >
          <div className="header-logo-icon">
            <RocketOutlined />
          </div>
          <Title level={2} className="header-title">
            NEXUM<span className="header-title-accent">.</span>
          </Title>
          <Badge count="v4.0" className="header-badge" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Text className="header-subtitle">
            Créez votre compte professionnel et rejoignez l'aventure Nexum
          </Text>
        </motion.div>
      </div>

      {/* Formulaire principal */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="signup-form-container"
      >
        <Card className="signup-card">
          <div className="card-gradient-bar" />
          
          <div className="card-content">
            {/* Bannière du plan sélectionné */}
            {selectedPlan && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="selected-plan-banner"
              >
                <div className="plan-banner-content">
                  <div className="plan-info">
                    <CrownOutlined className="plan-icon" />
                    <div>
                      <Text strong className="plan-name">
                        Plan sélectionné : {selectedPlan.name}
                      </Text>
                      <br />
                      <Text className="plan-price">
                        {selectedPlan.price > 0 ? `${selectedPlan.price}€/mois` : 'Essai gratuit 14 jours'}
                      </Text>
                    </div>
                  </div>
                  <Tag className="plan-trial-tag">
                    <GiftOutlined /> 14 jours d'essai inclus
                  </Tag>
                </div>
              </motion.div>
            )}

            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Alert
                    message="Erreur d'inscription"
                    description={error}
                    type="error"
                    showIcon
                    closable
                    className="signup-alert"
                    onClose={() => setError('')}
                  />
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Alert
                    message="Inscription réussie !"
                    description={success}
                    type="success"
                    showIcon
                    className="signup-alert"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <Form
              form={form}
              layout="vertical"
              size="large"
              initialValues={{ country: 'France', companySize: '1-10', sector: selectedPlan?.sector || 'enterprise' }}
              onValuesChange={(changed, all) => {
                setFormData(all);
                if (changed.password) {
                  checkPasswordStrength(changed.password);
                }
              }}
            >
              <AnimatePresence mode="wait">
                {/* Étape 1 - Informations personnelles et secteur */}
                {currentStep === 0 && (
                  <motion.div
                    key="step0"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="step-header-container">
                      <div className="step-icon personal-icon">
                        <UserOutlined />
                      </div>
                      <Title level={4} className="step-title">
                        Informations personnelles
                      </Title>
                      <Text className="step-description">
                        Veuillez renseigner vos informations personnelles
                      </Text>
                    </div>

                    <Form.Item
                      name="fullname"
                      label={<span className="form-label">Nom complet <span className="required-star">*</span></span>}
                      rules={[
                        { required: true, message: 'Veuillez entrer votre nom complet' },
                        { min: 3, message: 'Minimum 3 caractères' },
                        { max: 100, message: 'Maximum 100 caractères' }
                      ]}
                    >
                      <Input 
                        prefix={<UserOutlined className="input-prefix-icon" />}
                        placeholder="Jean Dupont"
                        className="form-input"
                      />
                    </Form.Item>

                    <Form.Item
                      name="email"
                      label={<span className="form-label">Adresse email <span className="required-star">*</span></span>}
                      validateStatus={emailAvailable === false ? 'error' : emailAvailable === true ? 'success' : ''}
                      help={emailAvailable === false ? 'Cet email est déjà utilisé' : 'Utilisé pour la connexion et les notifications'}
                      rules={[
                        { required: true, message: 'Veuillez entrer votre email' },
                        { type: 'email', message: 'Format d\'email invalide' }
                      ]}
                    >
                      <Input 
                        prefix={<MailOutlined className="input-prefix-icon" />}
                        placeholder="jean.dupont@entreprise.com"
                        suffix={verifyingEmail && <Spin size="small" />}
                        className="form-input"
                      />
                    </Form.Item>

                    <Form.Item
                      name="phone"
                      label={<span className="form-label">Téléphone <span className="required-star">*</span></span>}
                      rules={[
                        { required: true, message: 'Veuillez entrer votre numéro de téléphone' },
                        { 
                          pattern: /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\.]?[(]?[0-9]{1,3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/, 
                          message: 'Format de téléphone invalide' 
                        }
                      ]}
                    >
                      <Input 
                        prefix={<PhoneOutlined className="input-prefix-icon" />}
                        placeholder="+33 6 12 34 56 78"
                        className="form-input"
                      />
                    </Form.Item>

                    {/* SECTEUR D'ACTIVITÉ */}
                    <Form.Item
                      name="sector"
                      label={<span className="form-label">Secteur d'activité <span className="required-star">*</span></span>}
                      rules={[{ required: true, message: 'Veuillez sélectionner votre secteur d\'activité' }]}
                    >
                      <Select 
                        placeholder="Sélectionnez votre secteur d'activité"
                        className="form-select"
                        disabled={!!selectedPlan?.sector}
                      >
                        {SECTORS.map(sector => (
                          <Option key={sector.value} value={sector.value}>
                            <Space>
                              <span style={{ fontSize: 18, color: sector.color }}>{sector.icon}</span>
                              <span>{sector.label}</span>
                            </Space>
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    {/* Mot de passe */}
                    <Form.Item
                      name="password"
                      label={<span className="form-label">Mot de passe <span className="required-star">*</span></span>}
                      rules={[
                        { required: true, message: 'Veuillez créer un mot de passe' },
                        { min: 8, message: 'Le mot de passe doit contenir au moins 8 caractères' },
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined className="input-prefix-icon" />}
                        placeholder="Créez un mot de passe sécurisé"
                        visibilityToggle={{ visible: passwordVisible, onVisibleChange: setPasswordVisible }}
                        iconRender={visible => visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                        className="form-input"
                      />
                    </Form.Item>

                    {/* Indicateur de force du mot de passe */}
                    {form.getFieldValue('password') && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="password-strength-container"
                      >
                        <Progress 
                          percent={(passwordStrength / 5) * 100} 
                          strokeColor={getPasswordStrengthColor()}
                          showInfo={false}
                          size="small"
                          strokeLinecap="round"
                        />
                        <div className="password-strength-info">
                          <Text style={{ color: getPasswordStrengthColor() }} className="strength-text">
                            Force : {getPasswordStrengthText()}
                          </Text>
                          <Text className="strength-count">
                            {passwordStrength}/5 critères
                          </Text>
                        </div>
                      </motion.div>
                    )}

                    {/* Confirmation mot de passe */}
                    <Form.Item
                      name="confirmPassword"
                      label={<span className="form-label">Confirmer le mot de passe <span className="required-star">*</span></span>}
                      dependencies={['password']}
                      rules={[
                        { required: true, message: 'Veuillez confirmer votre mot de passe' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('password') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject('Les mots de passe ne correspondent pas');
                          },
                        }),
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined className="input-prefix-icon" />}
                        placeholder="Confirmez votre mot de passe"
                        visibilityToggle={{ visible: confirmPasswordVisible, onVisibleChange: setConfirmPasswordVisible }}
                        iconRender={visible => visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                        className="form-input"
                      />
                    </Form.Item>
                  </motion.div>
                )}

                {/* Étape 2 - Informations entreprise */}
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="step-header-container">
                      <div className="step-icon company-icon">
                        <ShopOutlined />
                      </div>
                      <Title level={4} className="step-title">
                        Informations de l'entreprise
                      </Title>
                      <Text className="step-description">
                        Détails de votre structure professionnelle
                      </Text>
                    </div>

                    <Form.Item
                      name="companyName"
                      label={<span className="form-label">Nom de l'entreprise <span className="required-star">*</span></span>}
                      rules={[
                        { required: true, message: 'Veuillez entrer le nom de votre entreprise' },
                        { min: 2, message: 'Minimum 2 caractères' }
                      ]}
                    >
                      <Input 
                        prefix={<BankOutlined className="input-prefix-icon" />}
                        placeholder="Nexum SAS"
                        className="form-input"
                      />
                    </Form.Item>

                    <Form.Item
                      name="companySize"
                      label={<span className="form-label">Taille de l'entreprise <span className="required-star">*</span></span>}
                      rules={[{ required: true, message: 'Veuillez sélectionner la taille de votre entreprise' }]}
                    >
                      <Select placeholder="Sélectionnez la taille" className="form-select">
                        <Option value="1-10">🚀 1-10 employés (TPE)</Option>
                        <Option value="11-50">📈 11-50 employés (Petite entreprise)</Option>
                        <Option value="51-200">🏢 51-200 employés (PME)</Option>
                        <Option value="201-500">🌆 201-500 employés (ETI)</Option>
                        <Option value="500+">🌍 500+ employés (Grande entreprise)</Option>
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="address"
                      label={<span className="form-label">Adresse <span className="required-star">*</span></span>}
                      rules={[{ required: true, message: 'Veuillez entrer l\'adresse de votre entreprise' }]}
                    >
                      <Input 
                        prefix={<HomeOutlined className="input-prefix-icon" />}
                        placeholder="123 Rue de l'Innovation"
                        className="form-input"
                      />
                    </Form.Item>

                    <Row gutter={16}>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          name="city"
                          label={<span className="form-label">Ville <span className="required-star">*</span></span>}
                          rules={[{ required: true, message: 'Veuillez entrer votre ville' }]}
                        >
                          <Input 
                            prefix={<EnvironmentOutlined className="input-prefix-icon" />}
                            placeholder="Paris"
                            className="form-input"
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item
                          name="country"
                          label={<span className="form-label">Pays <span className="required-star">*</span></span>}
                          rules={[{ required: true, message: 'Veuillez sélectionner votre pays' }]}
                        >
                          <Select placeholder="Sélectionnez votre pays" className="form-select">
                            <Option value="France">🇫🇷 France</Option>
                            <Option value="Belgique">🇧🇪 Belgique</Option>
                            <Option value="Suisse">🇨🇭 Suisse</Option>
                            <Option value="Canada">🇨🇦 Canada</Option>
                            <Option value="Luxembourg">🇱🇺 Luxembourg</Option>
                            <Option value="Maroc">🇲🇦 Maroc</Option>
                            <Option value="Tunisie">🇹🇳 Tunisie</Option>
                          </Select>
                        </Form.Item>
                      </Col>
                    </Row>
                  </motion.div>
                )}

                {/* Étape 3 - Confirmation */}
                {currentStep === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="step-header-container">
                      <div className="step-icon confirm-icon">
                        <CheckOutlined />
                      </div>
                      <Title level={4} className="step-title">
                        Vérification et confirmation
                      </Title>
                      <Text className="step-description">
                        Vérifiez vos informations avant de finaliser
                      </Text>
                    </div>

                    <div className="summary-container">
                      <Title level={5} className="summary-title">
                        <TrophyOutlined /> Résumé de votre inscription
                      </Title>
                      <Row gutter={[16, 12]}>
                        <Col span={12}><Text type="secondary">Nom complet:</Text><br /><Text strong>{form.getFieldValue('fullname') || '-'}</Text></Col>
                        <Col span={12}><Text type="secondary">Email:</Text><br /><Text strong>{form.getFieldValue('email') || '-'}</Text></Col>
                        <Col span={12}><Text type="secondary">Téléphone:</Text><br /><Text strong>{form.getFieldValue('phone') || '-'}</Text></Col>
                        <Col span={12}><Text type="secondary">Secteur:</Text><br /><Text strong>{SECTORS.find(s => s.value === form.getFieldValue('sector'))?.label || '-'}</Text></Col>
                        <Col span={12}><Text type="secondary">Entreprise:</Text><br /><Text strong>{form.getFieldValue('companyName') || '-'}</Text></Col>
                        <Col span={12}><Text type="secondary">Taille:</Text><br /><Text strong>{form.getFieldValue('companySize') || '-'}</Text></Col>
                        <Col span={24}><Text type="secondary">Localisation:</Text><br /><Text strong>{form.getFieldValue('city') ? `${form.getFieldValue('city')}, ${form.getFieldValue('country')}` : '-'}</Text></Col>
                      </Row>
                    </div>

                    <div className="features-container">
                      <Title level={5} className="features-title">
                        <GiftOutlined /> Fonctionnalités incluses
                      </Title>
                      <Row gutter={[12, 12]}>
                        {featuresList.map((feature, index) => (
                          <Col xs={24} sm={12} key={index}>
                            <div className="feature-item">
                              <div className="feature-icon-wrapper">{feature.icon}</div>
                              <div>
                                <div className="feature-title-text">{feature.title}</div>
                                <div className="feature-desc-text">{feature.desc}</div>
                              </div>
                            </div>
                          </Col>
                        ))}
                      </Row>
                      <Button 
                        type="link" 
                        onClick={() => setPreviewModal(true)}
                        className="view-details-btn"
                      >
                        Voir tous les détails →
                      </Button>
                    </div>

                    <Form.Item
                      name="terms"
                      valuePropName="checked"
                      rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject('Vous devez accepter les conditions générales') }]}
                    >
                      <Checkbox onChange={(e) => setTermsAccepted(e.target.checked)}>
                        J'accepte les{' '}
                        <a href="/terms" target="_blank" className="terms-link">conditions générales d'utilisation</a>
                        {' '}et la{' '}
                        <a href="/privacy" target="_blank" className="terms-link">politique de confidentialité</a>
                      </Checkbox>
                    </Form.Item>

                    <Alert
                      message="Information importante"
                      description="Un email de confirmation vous sera envoyé pour valider votre compte. Vérifiez vos spams si vous ne recevez pas l'email dans les 5 minutes."
                      type="info"
                      showIcon
                      className="info-alert"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation buttons */}
              <div className="navigation-buttons">
                {currentStep > 0 && (
                  <Button 
                    onClick={handlePrev}
                    icon={<ArrowLeftOutlined />}
                    size="large"
                    className="nav-button prev-button"
                  >
                    Étape précédente
                  </Button>
                )}
                
                {currentStep < 2 ? (
                  <Button 
                    type="primary" 
                    onClick={handleNext}
                    icon={<ArrowRightOutlined />}
                    size="large"
                    className={`nav-button next-button ${currentStep === 0 ? 'next-button-auto' : ''}`}
                  >
                    Étape suivante
                  </Button>
                ) : (
                  <Button 
                    type="primary" 
                    onClick={handleSubmit}
                    loading={loading}
                    icon={<RocketOutlined />}
                    size="large"
                    disabled={!termsAccepted}
                    className="nav-button submit-button"
                  >
                    {selectedPlan?.price > 0 ? 'Créer mon compte et payer' : 'Créer mon compte'}
                  </Button>
                )}
              </div>
            </Form>

            {/* Divider */}
            <Divider plain className="social-divider">
              <Text className="divider-text">OU INSCRIVEZ-VOUS AVEC</Text>
            </Divider>

            {/* Boutons sociaux */}
            <Space direction="vertical" size="middle" className="social-buttons">
              {[
                { provider: 'Google', icon: <GoogleOutlined />, color: '#DB4437' },
                { provider: 'LinkedIn', icon: <LinkedinOutlined />, color: '#0077b5' },
              ].map((btn, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="social-button-wrapper"
                >
                  <Button 
                    block 
                    size="large"
                    icon={btn.icon}
                    onClick={() => message.info(`Inscription avec ${btn.provider} disponible prochainement`, 2)}
                    className="social-button"
                  >
                    S'inscrire avec {btn.provider}
                  </Button>
                </motion.div>
              ))}
            </Space>

            <div className="login-redirect">
              <Text className="login-text">
                Déjà un compte ?{' '}
                <Link to="/login" className="login-link-text">
                  Se connecter →
                </Link>
              </Text>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Modal des fonctionnalités */}
      <Modal
        title={<div className="modal-title"><StarOutlined /> Fonctionnalités incluses</div>}
        open={previewModal}
        onCancel={() => setPreviewModal(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewModal(false)} className="modal-close-btn">
            Fermer
          </Button>
        ]}
        width={650}
        className="preview-modal"
      >
        <Descriptions column={1} bordered>
          <Descriptions.Item label="✨ Espace personnel">Tableau de bord personnalisé avec vos indicateurs clés</Descriptions.Item>
          <Descriptions.Item label="🤖 Assistants IA">Accès aux 4 assistants intelligents (Predict, Risk, Growth, Copilot)</Descriptions.Item>
          <Descriptions.Item label="📦 Modules inclus">Ventes, Achats, CRM, Finance, Stock, RH, Projets</Descriptions.Item>
          <Descriptions.Item label="🤝 Outils collaboratifs">Partage de documents, commentaires, notifications en temps réel</Descriptions.Item>
          <Descriptions.Item label="📊 Rapports">Création et export de rapports (PDF, Excel, CSV)</Descriptions.Item>
          <Descriptions.Item label="🛡️ Support">Assistance prioritaire 24/7 par email et chat</Descriptions.Item>
          <Descriptions.Item label="🔒 Sécurité">Authentification sécurisée, chiffrement AES-256, conformité RGPD</Descriptions.Item>
          <Descriptions.Item label="🔄 Mises à jour">Mises à jour automatiques incluses</Descriptions.Item>
          <Descriptions.Item label="🌐 API">Accès à l'API REST complète pour intégrations</Descriptions.Item>
        </Descriptions>
      </Modal>
    </div>
  );
};

export default Signup;