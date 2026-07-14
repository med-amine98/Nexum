// src/pages/Contact.js - Version Premium Nexum Dark Mode
import React, { useState } from 'react';
import {
  Layout, Typography, Row, Col, Card, Form, Input, Button,
  Select, message, Divider, Space, Avatar, Tag, Tooltip,
  Statistic, Timeline, Collapse, Alert, Modal, Upload,
  Badge, Progress
} from 'antd';
import {
  MailOutlined, PhoneOutlined, EnvironmentOutlined,
  UserOutlined, SendOutlined, CheckCircleOutlined,
  ClockCircleOutlined, TeamOutlined, GlobalOutlined,
  SafetyCertificateOutlined, RocketOutlined,
  MessageOutlined, FileTextOutlined, StarOutlined,
  LikeOutlined, SafetyOutlined, CustomerServiceOutlined,
  CopyrightOutlined, LinkedinOutlined, TwitterOutlined,
  FacebookOutlined, InstagramOutlined, GithubOutlined,
  HomeOutlined, CodeOutlined, BulbOutlined,
  QuestionCircleOutlined, DownloadOutlined,
  ExperimentOutlined, ThunderboltOutlined,
  CloudOutlined, ApiOutlined, DashboardOutlined,
  ArrowRightOutlined, GiftOutlined, HeartOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import './Contact.css';

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// ============================================
// CONSTANTS - Palette Aurora Dark Mode
// ============================================

const COLORS = {
  // Palette principale - Aurora Indigo
  primary: '#2563eb',
  primaryDark: '#2563eb',
  primaryLight: '#818CF8',
  primaryDarker: '#3730A3',
  primarySubtle: 'rgba(99, 102, 241, 0.12)',
  
  // Palette secondaire - Cyber Teal
  secondary: '#34d399',
  secondaryDark: '#0D9488',
  secondaryLight: '#5EEAD4',
  secondarySubtle: 'rgba(20, 184, 166, 0.12)',
  
  // Palette tertiaire - Sunset Coral
  tertiary: '#059669',
  tertiaryDark: '#E11D48',
  tertiaryLight: '#FB7185',
  
  // Accent - Electric Violet
  accent: '#475569',
  accentDark: '#334155',
  accentLight: '#A78BFA',
  
  // Couleurs sémantiques
  success: '#10B981',
  successDark: '#059669',
  successLight: '#34D399',
  warning: '#10b981',
  warningDark: '#D97706',
  warningLight: '#FBBF24',
  error: '#EF4444',
  errorDark: '#DC2626',
  errorLight: '#F87171',
  info: '#3B82F6',
  infoDark: '#2563EB',
  infoLight: '#60A5FA',
  
  // Fonds - Deep Space
  bgDeep: '#030014',
  bgPrimary: '#0A0A1A',
  bgSecondary: '#111128',
  bgTertiary: '#1A1A3E',
  bgCard: 'rgba(17, 17, 40, 0.95)',
  bgGlass: 'rgba(10, 10, 26, 0.95)',
  bgGlassLight: 'rgba(10, 10, 26, 0.8)',
  
  // Textes - Stellar Clarity
  textPrimary: '#FFFFFF',
  textSecondary: '#E2E8F0',
  textTertiary: '#CBD5E1',
  textMuted: '#94A3B8',
  textDisabled: '#64748B',
  textDark: '#0F172A',
  
  // Bordures
  border: 'rgba(255, 255, 255, 0.06)',
  borderLight: 'rgba(255, 255, 255, 0.03)',
  borderMedium: 'rgba(255, 255, 255, 0.1)',
  borderHeavy: 'rgba(255, 255, 255, 0.14)',
  
  // Blancs
  white: '#FFFFFF',
  whiteSmoke: '#F5F5FA',
  
  // Gradients Premium - Aurora Collection
  gradientPrimary: 'linear-gradient(135deg, #2563eb 0%, #475569 50%, #34d399 100%)',
  gradientPrimaryHover: 'linear-gradient(135deg, #818CF8 0%, #A78BFA 50%, #5EEAD4 100%)',
  gradientSecondary: 'linear-gradient(135deg, #34d399 0%, #0D9488 100%)',
  gradientTertiary: 'linear-gradient(135deg, #059669 0%, #E11D48 100%)',
  gradientAccent: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
  gradientSuccess: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  gradientWarning: 'linear-gradient(135deg, #10b981 0%, #D97706 100%)',
  gradientError: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
  gradientDark: 'linear-gradient(135deg, #030014 0%, #0A0A1A 40%, #111128 70%, #1A1A3E 100%)',
  gradientGold: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
};

// ============================================
// ANIMATIONS
// ============================================

const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const fadeIn = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.8 } }
};

const staggerContainer = {
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.3 }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, type: "spring", stiffness: 200 } }
};

const slideInLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, type: "spring", stiffness: 100 } }
};

const slideInRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, type: "spring", stiffness: 100 } }
};

// ============================================
// MAIN COMPONENT
// ============================================

const Contact = () => {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [hoveredCard, setHoveredCard] = useState(null);
  const navigate = useNavigate();

  // Gestionnaire d'envoi du formulaire
  const handleSubmit = async (values) => {
    setSubmitting(true);
    
    setTimeout(() => {
      message.success({
        content: 'Votre message a été envoyé avec succès ! Un conseiller vous répondra sous 24h.',
        icon: <CheckCircleOutlined style={{ color: COLORS.success }} />,
        duration: 4,
      });
      form.resetFields();
      setSubmitting(false);
      
      import('canvas-confetti').then((confetti) => {
        confetti.default({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: [COLORS.primary, COLORS.accent, COLORS.secondary],
        });
      });
    }, 1500);
  };

  // Gestionnaire newsletter
  const handleNewsletter = (email) => {
    if (email && email.includes('@') && email.includes('.')) {
      setSubscribed(true);
      message.success('Merci pour votre inscription à notre newsletter !');
      setTimeout(() => setSubscribed(false), 3000);
      const input = document.getElementById('newsletter-email');
      if (input) input.value = '';
    } else {
      message.warning('Veuillez entrer une adresse email valide');
    }
  };

  // Informations de contact
  const contactInfo = [
    {
      icon: <MailOutlined />,
      title: 'Email',
      details: ['contact@nexum.ai', 'support@nexum.ai', 'commercial@nexum.ai'],
      action: 'Envoyer un email',
      link: 'mailto:contact@nexum.ai',
      color: COLORS.primary,
      gradient: COLORS.gradientPrimary
    },
    {
      icon: <PhoneOutlined />,
      title: 'Téléphone',
      details: ['+33 (0)1 23 45 67 89', '+33 (0)6 12 34 56 78'],
      action: 'Appeler maintenant',
      link: 'tel:+33123456789',
      color: COLORS.secondary,
      gradient: COLORS.gradientSecondary
    },
    {
      icon: <EnvironmentOutlined />,
      title: 'Adresse',
      details: ['123 Avenue des Champs-Élysées', '75008 Paris, France'],
      action: 'Voir sur Maps',
      link: 'https://maps.google.com/',
      color: COLORS.accent,
      gradient: COLORS.gradientAccent
    }
  ];

  // Équipe support
  const supportTeam = [
    { name: 'Sophie Laurent', role: 'Directrice Commerciale', email: 's.laurent@nexum.ai', avatar: 'https://randomuser.me/api/portraits/women/1.jpg', color: COLORS.primary },
    { name: 'Thomas Bernard', role: 'Support Technique', email: 't.bernard@nexum.ai', avatar: 'https://randomuser.me/api/portraits/men/2.jpg', color: COLORS.secondary },
    { name: 'Marie Dubois', role: 'Conseillère Client', email: 'm.dubois@nexum.ai', avatar: 'https://randomuser.me/api/portraits/women/3.jpg', color: COLORS.accent }
  ];

  // FAQ
  const faqItems = [
    {
      key: '1',
      label: 'Quels sont vos horaires de support ?',
      children: 'Notre support technique est disponible 24/7, 365 jours par an. L\'équipe commerciale est joignable du lundi au vendredi de 9h à 19h.'
    },
    {
      key: '2',
      label: 'Comment obtenir une démo personnalisée ?',
      children: 'Remplissez simplement le formulaire de contact en précisant "Démo" dans l\'objet. Un expert vous contactera sous 24h pour planifier une démo sur mesure.'
    },
    {
      key: '3',
      label: 'Proposez-vous une formation ?',
      children: 'Oui, nous proposons des formations complètes pour vos équipes, en présentiel ou à distance. Notre équipe vous accompagne tout au long de votre projet.'
    },
    {
      key: '4',
      label: 'Quels sont les délais de réponse ?',
      children: 'Nous nous engageons à répondre sous 2h pour les demandes urgentes et sous 24h pour les demandes standards.'
    }
  ];

  // Statistiques
  const stats = [
    { value: 1000, label: 'Clients satisfaits', icon: <TeamOutlined />, color: COLORS.primary },
    { value: 98, label: '% Satisfaction', icon: <StarOutlined />, color: COLORS.accent },
    { value: 24, label: 'Support 24/7', icon: <ClockCircleOutlined />, color: COLORS.secondary },
    { value: 15, label: 'Pays', icon: <GlobalOutlined />, color: COLORS.success }
  ];

  return (
    <Layout style={{ background: COLORS.bgDeep, minHeight: '100vh' }}>
      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          padding: '16px 0',
          background: COLORS.bgGlass,
          backdropFilter: 'blur(16px)',
          borderBottom: `1px solid ${COLORS.border}`,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <motion.div
            whileHover={{ scale: 1.05 }}
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              style={{
                width: 40,
                height: 40,
                background: COLORS.gradientPrimary,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <RocketOutlined style={{ fontSize: 20, color: COLORS.white }} />
            </motion.div>
            <span style={{ fontSize: 24, fontWeight: 800, background: COLORS.gradientPrimary, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
              NEXUM
            </span>
          </motion.div>
          
          <Button 
            type="text" 
            icon={<HomeOutlined />}
            onClick={() => navigate('/')}
            style={{ color: COLORS.textSecondary, fontWeight: 500 }}
            onMouseEnter={(e) => e.currentTarget.style.color = COLORS.primary}
            onMouseLeave={(e) => e.currentTarget.style.color = COLORS.textSecondary}
          >
            Retour à l'accueil
          </Button>
        </div>
      </motion.header>

      <Content style={{ marginTop: 80, padding: '40px 24px' }}>
        {/* Hero Section */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={fadeIn}
          style={{ textAlign: 'center', marginBottom: 60 }}
        >
          <motion.div variants={fadeInUp}>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            >
              <Tag color="blue" style={{ background: COLORS.gradientPrimary, border: 'none', padding: '6px 20px', borderRadius: 20, marginBottom: 16, color: COLORS.white }}>
                <CustomerServiceOutlined /> Contactez-nous
              </Tag>
            </motion.div>
            <Title level={1} style={{ color: COLORS.textPrimary, fontSize: 52, fontWeight: 800, marginBottom: 16 }}>
              Parlons de votre <span style={{ background: COLORS.gradientPrimary, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>projet</span>
            </Title>
            <Paragraph style={{ color: COLORS.textSecondary, fontSize: 18, maxWidth: 600, margin: '0 auto' }}>
              Une question ? Un projet ? Notre équipe d'experts est là pour vous accompagner.
              Remplissez le formulaire ou contactez-nous directement.
            </Paragraph>
          </motion.div>
        </motion.section>

        {/* Stats Section */}
        <motion.section
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          style={{ marginBottom: 60 }}
        >
          <Row gutter={[24, 24]} justify="center">
            {stats.map((stat, index) => (
              <Col xs={12} sm={6} key={index}>
                <motion.div variants={scaleIn}>
                  <Card
                    style={{
                      background: COLORS.bgCard,
                      backdropFilter: 'blur(10px)',
                      borderRadius: 20,
                      textAlign: 'center',
                      border: `1px solid ${COLORS.border}`,
                      transition: 'all 0.3s'
                    }}
                    hoverable
                  >
                    <div style={{ fontSize: 40, color: stat.color, marginBottom: 8 }}>{stat.icon}</div>
                    <Title level={2} style={{ color: stat.color, marginBottom: 4 }}>
                      {stat.value}
                    </Title>
                    <Text style={{ color: COLORS.textMuted }}>{stat.label}</Text>
                  </Card>
                </motion.div>
              </Col>
            ))}
          </Row>
        </motion.section>

        {/* Contact Info Cards */}
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <Row gutter={[24, 24]} style={{ marginBottom: 60 }}>
            {contactInfo.map((info, index) => (
              <Col xs={24} sm={12} md={8} key={index}>
                <motion.div
                  variants={scaleIn}
                  onHoverStart={() => setHoveredCard(index)}
                  onHoverEnd={() => setHoveredCard(null)}
                >
                  <Card
                    style={{
                      background: COLORS.bgCard,
                      borderRadius: 20,
                      textAlign: 'center',
                      border: `1px solid ${COLORS.border}`,
                      transition: 'all 0.3s',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    hoverable
                  >
                    {hoveredCard === index && (
                      <motion.div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 3,
                          background: info.gradient,
                        }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 360 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Avatar
                        size={64}
                        icon={info.icon}
                        style={{
                          background: info.gradient,
                          marginBottom: 16,
                          boxShadow: `0 4px 15px ${info.color}40`,
                          color: COLORS.white
                        }}
                      />
                    </motion.div>
                    <Title level={4} style={{ color: COLORS.textPrimary }}>{info.title}</Title>
                    {info.details.map((detail, i) => (
                      <Text key={i} style={{ color: COLORS.textSecondary, display: 'block' }}>{detail}</Text>
                    ))}
                    <Divider style={{ borderColor: COLORS.border, margin: '16px 0' }} />
                    <Button
                      type="link"
                      icon={<SendOutlined />}
                      href={info.link}
                      style={{ color: info.color }}
                    >
                      {info.action}
                    </Button>
                  </Card>
                </motion.div>
              </Col>
            ))}
          </Row>
        </motion.div>

        {/* Formulaire et Carte */}
        <Row gutter={[48, 48]}>
          <Col xs={24} lg={14}>
            <motion.div
              variants={slideInLeft}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              <Card
                title={
                  <Space>
                    <MessageOutlined style={{ color: COLORS.primary }} />
                    <span style={{ color: COLORS.textPrimary, fontWeight: 600 }}>Envoyez-nous un message</span>
                  </Space>
                }
                style={{
                  background: COLORS.bgCard,
                  borderRadius: 20,
                  border: `1px solid ${COLORS.border}`,
                  overflow: 'hidden'
                }}
              >
                <div style={{ height: 4, background: COLORS.gradientPrimary, position: 'absolute', top: 0, left: 0, right: 0 }} />
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSubmit}
                  size="large"
                >
                  <Row gutter={16}>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="firstName"
                        label={<span style={{ color: COLORS.textSecondary }}>Prénom</span>}
                        rules={[{ required: true, message: 'Veuillez entrer votre prénom' }]}
                      >
                        <Input prefix={<UserOutlined />} placeholder="Jean" style={{ borderRadius: 12, background: COLORS.bgSecondary, borderColor: COLORS.border, color: COLORS.textPrimary }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} sm={12}>
                      <Form.Item
                        name="lastName"
                        label={<span style={{ color: COLORS.textSecondary }}>Nom</span>}
                        rules={[{ required: true, message: 'Veuillez entrer votre nom' }]}
                      >
                        <Input placeholder="Dupont" style={{ borderRadius: 12, background: COLORS.bgSecondary, borderColor: COLORS.border, color: COLORS.textPrimary }} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    name="email"
                    label={<span style={{ color: COLORS.textSecondary }}>Email professionnel</span>}
                    rules={[
                      { required: true, message: 'Veuillez entrer votre email' },
                      { type: 'email', message: 'Email invalide' }
                    ]}
                  >
                    <Input prefix={<MailOutlined />} placeholder="jean.dupont@entreprise.com" style={{ borderRadius: 12, background: COLORS.bgSecondary, borderColor: COLORS.border, color: COLORS.textPrimary }} />
                  </Form.Item>

                  <Form.Item
                    name="phone"
                    label={<span style={{ color: COLORS.textSecondary }}>Téléphone</span>}
                  >
                    <Input prefix={<PhoneOutlined />} placeholder="+33 6 12 34 56 78" style={{ borderRadius: 12, background: COLORS.bgSecondary, borderColor: COLORS.border, color: COLORS.textPrimary }} />
                  </Form.Item>

                  <Form.Item
                    name="subject"
                    label={<span style={{ color: COLORS.textSecondary }}>Sujet</span>}
                    rules={[{ required: true, message: 'Veuillez choisir un sujet' }]}
                  >
                    <Select placeholder="Sélectionnez un sujet" style={{ borderRadius: 12 }} dropdownStyle={{ background: COLORS.bgSecondary }}>
                      <Option value="demo"><RocketOutlined /> Demande de démo</Option>
                      <Option value="support"><CustomerServiceOutlined /> Support technique</Option>
                      <Option value="commercial"><TeamOutlined /> Information commerciale</Option>
                      <Option value="partnership"><GlobalOutlined /> Partenariat</Option>
                      <Option value="other"><MessageOutlined /> Autre demande</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="message"
                    label={<span style={{ color: COLORS.textSecondary }}>Message</span>}
                    rules={[{ required: true, message: 'Veuillez entrer votre message' }]}
                  >
                    <TextArea rows={5} placeholder="Décrivez votre projet ou votre question..." style={{ borderRadius: 12, background: COLORS.bgSecondary, borderColor: COLORS.border, color: COLORS.textPrimary }} />
                  </Form.Item>

                  <Form.Item>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="submit"
                      disabled={submitting}
                      style={{
                        width: '100%',
                        background: COLORS.gradientPrimary,
                        border: 'none',
                        borderRadius: 12,
                        padding: '14px',
                        color: COLORS.white,
                        fontWeight: 'bold',
                        fontSize: 16,
                        cursor: submitting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                        opacity: submitting ? 0.7 : 1
                      }}
                    >
                      <SendOutlined />
                      {submitting ? 'Envoi en cours...' : 'Envoyer le message'}
                    </motion.button>
                  </Form.Item>
                </Form>
              </Card>
            </motion.div>
          </Col>

          <Col xs={24} lg={10}>
            <motion.div
              variants={slideInRight}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
            >
              {/* Carte de localisation */}
              <Card
                style={{
                  background: COLORS.bgCard,
                  borderRadius: 20,
                  marginBottom: 24,
                  border: `1px solid ${COLORS.border}`,
                  overflow: 'hidden'
                }}
              >
                <div style={{ height: 4, background: COLORS.gradientPrimary, position: 'absolute', top: 0, left: 0, right: 0 }} />
                <Title level={4} style={{ color: COLORS.textPrimary, marginBottom: 16 }}>
                  <EnvironmentOutlined style={{ color: COLORS.primary }} /> Nous trouver
                </Title>
                <div style={{
                  height: 200,
                  background: COLORS.bgSecondary,
                  borderRadius: 12,
                  marginBottom: 16,
                  overflow: 'hidden'
                }}>
                  <iframe
                    title="map"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2624.9916256937595!2d2.29229261550961!3d48.85837007928746!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47e66e2964e34e2d%3A0x8ddca9ee380ef7e0!2sChamps-%C3%89lys%C3%A9es!5e0!3m2!1sfr!2sfr!4v1700000000000!5m2!1sfr!2sfr"
                    width="100%"
                    height="200"
                    style={{ border: 0, borderRadius: 12 }}
                    allowFullScreen=""
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div><Text strong style={{ color: COLORS.textPrimary }}>📍 Adresse :</Text> <Text style={{ color: COLORS.textSecondary }}>123 Avenue des Champs-Élysées, 75008 Paris</Text></div>
                  <div><Text strong style={{ color: COLORS.textPrimary }}>🚇 Métro :</Text> <Text style={{ color: COLORS.textSecondary }}>Ligne 1 - Station Champs-Élysées-Clémenceau</Text></div>
                  <div><Text strong style={{ color: COLORS.textPrimary }}>🚗 Parking :</Text> <Text style={{ color: COLORS.textSecondary }}>Parking Champs-Élysées (entrée rue de Berri)</Text></div>
                </Space>
              </Card>

              {/* Horaires - Version avec texte noir */}
<Card
  style={{
    background: COLORS.bgCard,
    borderRadius: 20,
    marginBottom: 24,
    border: `1px solid ${COLORS.border}`,
    overflow: 'hidden'
  }}
>
  <div style={{ height: 4, background: COLORS.gradientSecondary, position: 'absolute', top: 0, left: 0, right: 0 }} />
  <Title level={4} style={{ color: COLORS.textPrimary, marginBottom: 16 }}>
    <ClockCircleOutlined style={{ color: COLORS.secondary }} /> Horaires d'ouverture
  </Title>
  <Timeline
    items={[
      { 
        children: (
          <>
            <div style={{ color: '#1A1A2E', fontWeight: 700, fontSize: 15 }}>Lundi - Vendredi</div>
            <div style={{ color: '#334155', fontSize: 14 }}>9h00 - 19h00</div>
          </>
        ), 
        color: COLORS.primary 
      },
      { 
        children: (
          <>
            <div style={{ color: '#1A1A2E', fontWeight: 700, fontSize: 15 }}>Samedi</div>
            <div style={{ color: '#334155', fontSize: 14 }}>10h00 - 17h00</div>
          </>
        ), 
        color: COLORS.accent 
      },
      { 
        children: (
          <>
            <div style={{ color: '#1A1A2E', fontWeight: 700, fontSize: 15 }}>Support technique</div>
            <div style={{ color: '#334155', fontSize: 14 }}>24/7 - Assistance permanente</div>
          </>
        ), 
        color: COLORS.success 
      }
    ]}
  />
</Card>

              {/* Newsletter */}
              <Card
                style={{
                  background: COLORS.gradientPrimary,
                  borderRadius: 20,
                  textAlign: 'center',
                  border: 'none',
                  overflow: 'hidden'
                }}
              >
                <Title level={4} style={{ color: COLORS.white, marginBottom: 8 }}>
                  <MailOutlined /> Newsletter
                </Title>
                <Text style={{ color: COLORS.whiteSmoke, display: 'block', marginBottom: 16 }}>
                  Recevez nos actualités et offres exclusives
                </Text>
                {!subscribed ? (
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      placeholder="Votre email"
                      style={{ borderRadius: '12px 0 0 12px', background: COLORS.white, color: COLORS.textDark }}
                      id="newsletter-email"
                    />
                    <Button
                      type="primary"
                      style={{ background: COLORS.white, color: COLORS.primary, borderRadius: '0 12px 12px 0', fontWeight: 600 }}
                      onClick={() => {
                        const email = document.getElementById('newsletter-email')?.value;
                        handleNewsletter(email);
                      }}
                    >
                      S'abonner
                    </Button>
                  </Space.Compact>
                ) : (
                  <Alert message="Merci pour votre inscription !" type="success" showIcon style={{ borderRadius: 12, background: COLORS.success, border: 'none' }} />
                )}
              </Card>
            </motion.div>
          </Col>
        </Row>

        {/* Équipe */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          style={{ marginTop: 80 }}
        >
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <motion.div variants={fadeInUp}>
              <Tag color="blue" style={{ background: COLORS.gradientPrimary, border: 'none', padding: '6px 20px', borderRadius: 20, color: COLORS.white }}>
                <TeamOutlined /> Notre équipe
              </Tag>
              <Title level={2} style={{ color: COLORS.textPrimary, marginTop: 16, fontWeight: 800 }}>
                Des experts à votre <span style={{ background: COLORS.gradientPrimary, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>écoute</span>
              </Title>
              <Text style={{ color: COLORS.textSecondary, fontSize: 16 }}>
                Une équipe dédiée pour vous accompagner dans votre projet
              </Text>
            </motion.div>
          </div>

          <Row gutter={[24, 24]}>
            {supportTeam.map((member, index) => (
              <Col xs={24} sm={12} md={8} key={index}>
                <motion.div variants={scaleIn}>
                  <Card
                    hoverable
                    style={{
                      background: COLORS.bgCard,
                      borderRadius: 20,
                      textAlign: 'center',
                      border: `1px solid ${COLORS.border}`,
                      transition: 'all 0.3s'
                    }}
                  >
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Avatar src={member.avatar} size={100} style={{ marginBottom: 16, border: `3px solid ${member.color}` }} />
                    </motion.div>
                    <Title level={4} style={{ color: COLORS.textPrimary, marginBottom: 4 }}>{member.name}</Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 12, color: COLORS.textMuted }}>{member.role}</Text>
                    <Button 
                      type="link" 
                      icon={<MailOutlined />} 
                      href={`mailto:${member.email}`} 
                      style={{ color: member.color }}
                    >
                      {member.email}
                    </Button>
                  </Card>
                </motion.div>
              </Col>
            ))}
          </Row>
        </motion.section>

        {/* FAQ */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          style={{ marginTop: 80 }}
        >
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <motion.div variants={fadeInUp}>
              <Tag color="blue" style={{ background: COLORS.gradientTertiary, border: 'none', padding: '6px 20px', borderRadius: 20, color: COLORS.white }}>
                <QuestionCircleOutlined /> FAQ
              </Tag>
              <Title level={2} style={{ color: COLORS.textPrimary, marginTop: 16, fontWeight: 800 }}>
                Questions <span style={{ background: COLORS.gradientTertiary, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>fréquentes</span>
              </Title>
            </motion.div>
          </div>

          <Row gutter={[48, 48]}>
            <Col xs={24} lg={12}>
              <Collapse
                items={faqItems.slice(0, 2)}
                style={{ background: COLORS.bgCard, borderRadius: 12, border: `1px solid ${COLORS.border}` }}
                expandIconPosition="end"
              />
            </Col>
            <Col xs={24} lg={12}>
              <Collapse
                items={faqItems.slice(2)}
                style={{ background: COLORS.bgCard, borderRadius: 12, border: `1px solid ${COLORS.border}` }}
                expandIconPosition="end"
              />
            </Col>
          </Row>
        </motion.section>

        {/* CTA */}
        <motion.section
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          style={{ marginTop: 80 }}
        >
          <Card
            style={{
              background: COLORS.gradientPrimary,
              borderRadius: 24,
              textAlign: 'center',
              padding: '48px',
              border: 'none',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
            <div style={{ position: 'absolute', bottom: -50, left: -50, width: 150, height: 150, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }} />
            
            <Title level={3} style={{ color: COLORS.white, marginBottom: 16, fontWeight: 800 }}>
              Prêt à transformer votre entreprise ?
            </Title>
            <Text style={{ color: COLORS.whiteSmoke, fontSize: 16, display: 'block', marginBottom: 32 }}>
              Rejoignez plus de 1000 entreprises qui nous font confiance
            </Text>
            <Space size="middle" wrap>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="large"
                  icon={<RocketOutlined />}
                  style={{ background: COLORS.white, color: COLORS.primary, fontWeight: 'bold', borderRadius: 12 }}
                  onClick={() => navigate('/pricing')}
                >
                  Découvrir les offres
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button
                  size="large"
                  icon={<DownloadOutlined />}
                  style={{ background: 'transparent', borderColor: COLORS.white, color: COLORS.white, borderRadius: 12 }}
                  onClick={() => window.open('/brochure.pdf')}
                >
                  Télécharger brochure
                </Button>
              </motion.div>
            </Space>
          </Card>
        </motion.section>
      </Content>

      {/* Footer */}
      <Footer style={{
        background: COLORS.bgSecondary,
        padding: '48px 24px 24px',
        borderTop: `1px solid ${COLORS.border}`,
        marginTop: 60
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', textAlign: 'center' }}>
          <motion.div 
            style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 24 }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {[
              { icon: <LinkedinOutlined />, color: '#0A66C2', url: 'https://linkedin.com' },
              { icon: <TwitterOutlined />, color: '#1DA1F2', url: 'https://twitter.com' },
              { icon: <FacebookOutlined />, color: '#1877F2', url: 'https://facebook.com' },
              { icon: <InstagramOutlined />, color: '#E4405F', url: 'https://instagram.com' },
              { icon: <GithubOutlined />, color: COLORS.textPrimary, url: 'https://github.com' }
            ].map((social, idx) => (
              <motion.div key={idx} whileHover={{ scale: 1.1, y: -3 }}>
                <Button 
                  type="link" 
                  icon={social.icon} 
                  href={social.url}
                  target="_blank"
                  style={{ color: COLORS.textMuted, fontSize: 20 }}
                  onMouseEnter={(e) => e.currentTarget.style.color = social.color}
                  onMouseLeave={(e) => e.currentTarget.style.color = COLORS.textMuted}
                />
              </motion.div>
            ))}
          </motion.div>
          <div style={{ color: COLORS.textMuted }}>
            <Text style={{ color: COLORS.textMuted }}>© 2026 Nexum. Tous droits réservés.</Text>
            <Divider type="vertical" style={{ background: COLORS.border, margin: '0 16px' }} />
            <Text style={{ color: COLORS.textMuted }}><CopyrightOutlined /> Mentions légales</Text>
            <Divider type="vertical" style={{ background: COLORS.border, margin: '0 16px' }} />
            <Text style={{ color: COLORS.textMuted }}>Politique de confidentialité</Text>
          </div>
        </div>
      </Footer>
    </Layout>
  );
};

export default Contact;