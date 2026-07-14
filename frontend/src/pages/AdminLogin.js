// src/pages/AdminLogin.js - Version avec redirection immédiate forcée (Corrigée pour AntD v5)
import React, { useState, useEffect, useRef } from 'react';
import { 
  Form, Input, Button, Card, Checkbox, Typography, 
  Divider, Alert, Space, Modal, message, Tabs,
  Avatar, Tag
} from 'antd';
import { 
  LockOutlined, MailOutlined,
  EyeOutlined, EyeInvisibleOutlined,
  RocketOutlined, CrownOutlined,
  SafetyCertificateOutlined,
  GlobalOutlined,
  WarningOutlined,
  LoginOutlined,
  ShopOutlined,
  BankOutlined,
  SecurityScanOutlined,
  KeyOutlined,
  UserAddOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../services/auth';
import api from '../services/api';
import './AdminLogin.css';

const { Title, Text, Paragraph } = Typography;
const COLORS = {
  primary: '#2563eb',
  primaryDark: '#2563eb',
  primaryLight: '#818CF8',
  secondary: '#34d399',
  accent: '#475569',
  success: '#10B981',
  warning: '#10b981',
  error: '#EF4444',
  bgDeep: '#030014',
  bgPrimary: '#0A0A1A',
  bgSecondary: '#111128',
  bgTertiary: '#1A1A3E',
  bgCard: 'rgba(17, 17, 40, 0.95)',
  bgGlass: 'rgba(10, 10, 26, 0.95)',
  textPrimary: '#FFFFFF',
  textSecondary: '#E2E8F0',
  textMuted: '#94A3B8',
  border: 'rgba(255, 255, 255, 0.06)',
  white: '#FFFFFF',
  gradientPrimary: 'linear-gradient(135deg, #2563eb 0%, #475569 50%, #34d399 100%)',
  gradientSecondary: 'linear-gradient(135deg, #34d399 0%, #0D9488 100%)',
  gradientAccent: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
};

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, type: "spring", stiffness: 200 } }
};

const AdminLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState('password');
  const [rememberMe, setRememberMe] = useState(false);
  const [twoFactorVisible, setTwoFactorVisible] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form] = Form.useForm();
  
  // Ref pour suivre si le composant est monté
  const isMounted = useRef(true);

  // Fonction de redirection forcée
  const forceRedirect = (path) => {
    // Méthode 1: React Router
    navigate(path, { replace: true });
    
    // Méthode 2: Window location (plus agressive)
    setTimeout(() => {
      window.location.href = path;
    }, 100);
    
    // Méthode 3: Si tout échoue, recharger la page avec la nouvelle URL
    setTimeout(() => {
      if (window.location.pathname !== path) {
        window.location.replace(path);
      }
    }, 300);
  };

  // Effet pour vérifier l'authentification au chargement
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      const userRole = localStorage.getItem('userRole');
      
      if (token && userRole === 'admin') {
        forceRedirect('/admin/dashboard');
        return;
      } else if (token) {
        forceRedirect('/dashboard');
        return;
      }
    };
    
    checkAuth();
    
    // Cleanup
    return () => {
      isMounted.current = false;
    };
  }, [navigate]);

  const handleSubmit = async (values) => {
    if (loading) return;
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const formData = new URLSearchParams();
      formData.append('username', values.email);
      formData.append('password', values.password);
      
      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      const { access_token } = response.data;
      
      const userResponse = await api.get('/auth/me', {
        headers: { 'Authorization': `Bearer ${access_token}` }
      });
      
      const userData = userResponse.data;
      
      if (userData.role === 'admin' || userData.is_superuser) {
        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('userRole', userData.role);
        
        if (rememberMe) {
          localStorage.setItem('remember', 'true');
        }
        
        setSuccess('Connexion admin réussie !');
        message.success(`Bienvenue ${userData.full_name || 'Administrateur'} !`);
        
        forceRedirect('/admin/dashboard');
      } else {
        setError('Vous n\'avez pas les droits administrateur');
        message.error('Accès non autorisé - Droits administrateur requis');
        setLoading(false);
      }
    } catch (err) {
      console.error('Erreur connexion admin:', err);
      if (err.response?.status === 401) {
        setError('Email ou mot de passe administrateur incorrect');
        message.error('Échec de la connexion admin');
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
        message.error(err.response.data.detail);
      } else {
        setError('Une erreur est survenue lors de la connexion');
        message.error('Échec de la connexion');
      }
      setLoading(false);
    }
  };

  const handleSetupAdmin = async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const response = await api.post('/auth/setup-admin');
      
      if (response.data.success) {
        const { access_token, user, credentials } = response.data;
        
        localStorage.setItem('token', access_token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userRole', 'admin');
        
        message.success(`Admin créé avec succès ! Identifiants: ${credentials.email} / ${credentials.password}`);
        
        forceRedirect('/admin/dashboard');
      } else {
        message.info(response.data.message || 'Un administrateur existe déjà');
        setLoading(false);
      }
    } catch (err) {
      console.error('Erreur création admin:', err);
      if (err.response?.status === 500) {
        message.info('Un administrateur existe probablement déjà');
      } else {
        message.error('Erreur lors de la création de l\'administrateur');
      }
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = () => {
    setTwoFactorLoading(true);
    
    setTimeout(() => {
      if (twoFactorCode === '123456') {
        setTwoFactorVisible(false);
        message.success('Vérification 2FA réussie');
        forceRedirect('/admin/dashboard');
      } else {
        message.error('Code 2FA invalide');
      }
      setTwoFactorLoading(false);
    }, 1500);
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      message.warning('Veuillez entrer votre adresse email');
      return;
    }
    
    setResetLoading(true);
    
    try {
      await api.post('/auth/forgot-password', { email: resetEmail });
      setForgotPasswordVisible(false);
      message.success('Un email de réinitialisation a été envoyé à ' + resetEmail);
      setResetEmail('');
    } catch (err) {
      console.error('Erreur réinitialisation:', err);
      if (err.response?.status === 404) {
        message.error('Aucun compte trouvé avec cet email');
      } else {
        message.error('Erreur lors de l\'envoi de l\'email');
      }
    } finally {
      setResetLoading(false);
    }
  };

  // Redirection sans loader si l'utilisateur est déjà connecté en tant qu'admin
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  
  if (token && userRole === 'admin') {
    window.location.href = '/admin/dashboard';
    return null;
  }

  // Définition des éléments des onglets (Tabs) selon l'API standard d'Ant Design v5
  const tabItems = [
    {
      key: 'password',
      label: (
        <span style={{ color: COLORS.textSecondary }}>
          <KeyOutlined /> Mot de passe
        </span>
      ),
      children: (
        <Form
          form={form}
          name="adminLogin"
          onFinish={handleSubmit}
          layout="vertical"
          size="large"
          className="login-form"
        >
          <Form.Item
            name="email"
            label={<span style={{ color: COLORS.textSecondary }}>Email administrateur</span>}
            rules={[
              { required: true, message: 'Veuillez entrer votre email' },
              { type: 'email', message: 'Email invalide' }
            ]}
          >
            <Input 
              prefix={<MailOutlined className="input-icon" />} 
              placeholder="admin@nexum.com"
              autoComplete="email"
              style={{ background: COLORS.bgSecondary, borderColor: COLORS.border, borderRadius: 12, color: COLORS.textPrimary }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            label={<span style={{ color: COLORS.textSecondary }}>Mot de passe</span>}
            rules={[
              { required: true, message: 'Veuillez entrer votre mot de passe' },
            ]}
          >
            <Input.Password
              prefix={<LockOutlined className="input-icon" />}
              placeholder="••••••••"
              autoComplete="current-password"
              style={{ background: COLORS.bgSecondary, borderColor: COLORS.border, borderRadius: 12 }}
              iconRender={visible => visible ? <EyeOutlined style={{ color: COLORS.textMuted }} /> : <EyeInvisibleOutlined style={{ color: COLORS.textMuted }} />}
            />
          </Form.Item>

          <Form.Item className="login-options">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <Checkbox 
                checked={rememberMe} 
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ color: COLORS.textSecondary }}
              >
                Se souvenir de moi
              </Checkbox>
              <Button 
                type="link" 
                className="forgot-link"
                onClick={() => setForgotPasswordVisible(true)}
                style={{ color: COLORS.primary, padding: 0 }}
              >
                Mot de passe oublié ?
              </Button>
            </div>
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
              size="large"
              className="admin-login-button"
              icon={<LoginOutlined />}
              style={{ background: COLORS.gradientPrimary, border: 'none', borderRadius: 14, height: 48, fontWeight: 700, boxShadow: `0 4px 15px ${COLORS.primary}40` }}
            >
              Accéder à l'administration
            </Button>
          </Form.Item>
        </Form>
      )
    },
    {
      key: 'company',
      label: (
        <span style={{ color: COLORS.textSecondary }}>
          <BankOutlined /> Accès entreprise
        </span>
      ),
      children: (
        <div className="company-login">
          <Form layout="vertical" size="large">
            <Form.Item
              name="companyCode"
              label={<span style={{ color: COLORS.textSecondary }}>Code entreprise</span>}
              rules={[{ required: true, message: 'Veuillez saisir le code' }]}
            >
              <Input 
                prefix={<ShopOutlined className="input-icon" />}
                placeholder="CODE-ENT-123"
                style={{ background: COLORS.bgSecondary, borderColor: COLORS.border, borderRadius: 12, color: COLORS.textPrimary }}
              />
            </Form.Item>
            <Form.Item
              name="accessKey"
              label={<span style={{ color: COLORS.textSecondary }}>Clé d'accès</span>}
              rules={[{ required: true, message: 'Veuillez saisir la clé d\'accès' }]}
            >
              <Input.Password
                prefix={<KeyOutlined className="input-icon" />}
                placeholder="••••••••"
                style={{ background: COLORS.bgSecondary, borderColor: COLORS.border, borderRadius: 12 }}
              />
            </Form.Item>
            <Button 
              type="primary" 
              block 
              size="large"
              className="admin-login-button"
              style={{ background: COLORS.gradientPrimary, border: 'none', borderRadius: 14, height: 48, fontWeight: 700 }}
            >
              Accéder à l'espace entreprise
            </Button>
          </Form>
          <Text type="secondary" className="company-hint" style={{ color: COLORS.textMuted, marginTop: 16, display: 'block', textAlign: 'center' }}>
            Réservé aux accès multi-entreprises
          </Text>
        </div>
      )
    }
  ];

  return (
    <div className="admin-login-page" style={{ background: COLORS.bgDeep }}>
      {/* Bannière gauche */}
      <motion.div 
        className="admin-login-banner"
        initial={{ x: -100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <div className="banner-overlay" style={{ background: 'radial-gradient(circle at 30% 50%, rgba(99,102,241,0.15), transparent)' }}></div>
        <div className="banner-content">
          <motion.div 
            className="banner-logo"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <div className="logo-icon" style={{ background: COLORS.gradientPrimary, width: 40, height: 40, borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <RocketOutlined style={{ fontSize: 20, color: COLORS.white }} />
            </div>
            <Title level={2} className="banner-title" style={{ color: COLORS.white, margin: 0 }}>Nexum</Title>
            <Tag color="gold" className="admin-tag" style={{ background: COLORS.gradientAccent, border: 'none', color: COLORS.white, marginLeft: 8 }}>
              ADMIN
            </Tag>
          </motion.div>
          
          <motion.div variants={fadeInUp} initial="hidden" animate="visible">
            <Title level={1} className="banner-headline" style={{ color: COLORS.white }}>
              Espace<br />Administrateur
            </Title>
          </motion.div>
          
          <motion.div className="banner-features" variants={fadeInUp} initial="hidden" animate="visible" transition={{ delay: 0.3 }}>
            <div className="feature-item" style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div className="feature-icon-wrapper" style={{ background: `${COLORS.primary}20`, padding: '8px', borderRadius: '8px' }}>
                <SafetyCertificateOutlined className="feature-icon" style={{ color: COLORS.primary, fontSize: '20px' }} />
              </div>
              <div>
                <Text strong style={{ color: COLORS.white, display: 'block' }}>Accès sécurisé</Text>
                <Text type="secondary" style={{ color: COLORS.textMuted }}>Authentification renforcée</Text>
              </div>
            </div>
            <div className="feature-item" style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
              <div className="feature-icon-wrapper" style={{ background: `${COLORS.accent}20`, padding: '8px', borderRadius: '8px' }}>
                <CrownOutlined className="feature-icon" style={{ color: COLORS.accent, fontSize: '20px' }} />
              </div>
              <div>
                <Text strong style={{ color: COLORS.white, display: 'block' }}>Privilèges étendus</Text>
                <Text type="secondary" style={{ color: COLORS.textMuted }}>Gestion complète du système</Text>
              </div>
            </div>
            <div className="feature-item" style={{ display: 'flex', gap: '12px' }}>
              <div className="feature-icon-wrapper" style={{ background: `${COLORS.secondary}20`, padding: '8px', borderRadius: '8px' }}>
                <GlobalOutlined className="feature-icon" style={{ color: COLORS.secondary, fontSize: '20px' }} />
              </div>
              <div>
                <Text strong style={{ color: COLORS.white, display: 'block' }}>Supervision globale</Text>
                <Text type="secondary" style={{ color: COLORS.textMuted }}>Vue d'ensemble de l'ERP</Text>
              </div>
            </div>
          </motion.div>

          <motion.div className="banner-stats" variants={fadeInUp} initial="hidden" animate="visible" transition={{ delay: 0.4 }} style={{ display: 'flex', gap: '24px', marginTop: '24px' }}>
            <div className="stat">
              <Text className="stat-value" style={{ color: COLORS.primary, fontWeight: 'bold', fontSize: '24px', display: 'block' }}>24/7</Text>
              <Text className="stat-label" style={{ color: COLORS.textMuted }}>Disponibilité</Text>
            </div>
            <div className="stat">
              <Text className="stat-value" style={{ color: COLORS.secondary, fontWeight: 'bold', fontSize: '24px', display: 'block' }}>99.9%</Text>
              <Text className="stat-label" style={{ color: COLORS.textMuted }}>Sécurité</Text>
            </div>
            <div className="stat">
              <Text className="stat-value" style={{ color: COLORS.accent, fontWeight: 'bold', fontSize: '24px', display: 'block' }}>50+</Text>
              <Text className="stat-label" style={{ color: COLORS.textMuted }}>Modules</Text>
            </div>
          </motion.div>
        </div>
        <div className="banner-decoration" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, background: `linear-gradient(transparent, ${COLORS.bgDeep})` }} />
      </motion.div>

      {/* Formulaire de connexion admin */}
      <motion.div 
        className="admin-login-form-container"
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <Card className="admin-login-card" style={{ background: COLORS.bgCard, borderRadius: 28, border: `1px solid ${COLORS.border}`, backdropFilter: 'blur(10px)' }}>
          <motion.div className="login-header" variants={scaleIn} initial="hidden" animate="visible" style={{ textAlign: 'center', marginBottom: 24 }}>
            <Avatar 
              size={80}
              icon={<CrownOutlined />}
              className="admin-avatar"
              style={{ background: COLORS.gradientPrimary, boxShadow: `0 8px 25px ${COLORS.primary}40` }}
            />
            <Title level={2} style={{ color: COLORS.textPrimary, marginTop: 16, marginBottom: 4 }}>
              Administration
            </Title>
            <Text type="secondary" style={{ color: COLORS.textMuted }}>
              Accès réservé aux administrateurs système
            </Text>
            <div style={{ marginTop: 12 }}>
              <Tag icon={<SecurityScanOutlined />} className="security-tag" style={{ background: `${COLORS.success}20`, border: 'none', color: COLORS.success }}>
                Connexion sécurisée
              </Tag>
            </div>
          </motion.div>

          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="login-alert" style={{ marginBottom: 16 }}>
              <Alert
                message="Échec de la connexion admin"
                description={error}
                type="error"
                showIcon
                closable
                onClose={() => setError('')}
                style={{ borderRadius: 12, background: `${COLORS.error}15`, border: `1px solid ${COLORS.error}30` }}
              />
            </motion.div>
          )}

          {success && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="login-alert" style={{ marginBottom: 16 }}>
              <Alert
                message="Succès"
                description={success}
                type="success"
                showIcon
                style={{ borderRadius: 12, background: `${COLORS.success}15`, border: `1px solid ${COLORS.success}30` }}
              />
            </motion.div>
          )}

          <Alert
            message="Accès administrateur"
            description="Cette zone est strictement réservée au personnel autorisé. Toute tentative d'accès non autorisée sera enregistrée."
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            className="security-alert"
            style={{ borderRadius: 12, background: `${COLORS.warning}15`, border: `1px solid ${COLORS.warning}30`, marginBottom: 20 }}
          />

          {/* Utilisation propre du tableau d'items d'AntD v5 */}
          <Tabs 
            activeKey={loginMethod} 
            onChange={setLoginMethod}
            centered
            className="login-tabs"
            style={{ marginTop: 20 }}
            items={tabItems}
          />

          <Divider plain className="login-divider" style={{ borderColor: COLORS.border, color: COLORS.textMuted }}>
            Accès rapide
          </Divider>

          <div className="admin-quick-links">
            <Space direction="vertical" size="middle" className="quick-links" style={{ width: '100%' }}>
              <Button 
                block 
                size="large"
                icon={<SafetyCertificateOutlined />}
                onClick={() => window.open('/admin/documentation', '_blank')}
                style={{ borderRadius: 12, borderColor: COLORS.border, color: COLORS.textSecondary, background: 'transparent' }}
              >
                Documentation administrateur
              </Button>
              
              <Button 
                block 
                size="large"
                icon={<SettingOutlined />}
                onClick={() => window.open('/admin/security', '_blank')}
                style={{ borderRadius: 12, borderColor: COLORS.border, color: COLORS.textSecondary, background: 'transparent' }}
              >
                Centre de sécurité
              </Button>
            </Space>
          </div>

          <div className="admin-signup-section">
            <Divider plain style={{ borderColor: COLORS.border, color: COLORS.textMuted }}>Premier accès ?</Divider>
            <Button 
              type="default"
              block
              size="large"
              icon={<UserAddOutlined />}
              className="admin-signup-button"
              onClick={handleSetupAdmin}
              loading={loading}
              style={{ borderRadius: 12, borderColor: COLORS.border, color: COLORS.primary, background: 'transparent' }}
            >
              Configurer le premier administrateur
            </Button>
            <Text type="secondary" className="signup-hint" style={{ color: COLORS.textMuted, marginTop: 12, display: 'block', textAlign: 'center', fontSize: 12 }}>
              Crée automatiquement un compte admin (admin@nexum.com / admin123)
            </Text>
          </div>

          <div className="login-footer" style={{ marginTop: 32, textAlign: 'center' }}>
            <Space direction="vertical" align="center">
              <Text type="secondary" style={{ color: COLORS.textMuted }}>
                Retour à l'<Link to="/" className="back-link" style={{ color: COLORS.primary }}>accueil</Link> • 
                <Link to="/login" className="back-link" style={{ color: COLORS.primary }}> espace membre</Link>
              </Text>
              <Text type="secondary" className="copyright" style={{ color: COLORS.textMuted, fontSize: 12 }}>
                © 2026 Nexum. Tous droits réservés.
              </Text>
            </Space>
          </div>
        </Card>
      </motion.div>

      {/* Modal 2FA */}
      <Modal
        title={<span style={{ color: COLORS.textPrimary }}>Authentification à deux facteurs</span>}
        open={twoFactorVisible}
        onCancel={() => setTwoFactorVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setTwoFactorVisible(false)} style={{ borderRadius: 10 }}>
            Annuler
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={twoFactorLoading}
            onClick={handleTwoFactorSubmit}
            className="admin-login-button"
            style={{ background: COLORS.gradientPrimary, border: 'none', borderRadius: 10 }}
          >
            Vérifier
          </Button>,
        ]}
        className="twofactor-modal"
        modalRender={(node) => (
          <div style={{ background: COLORS.bgCard, borderRadius: 20 }}>
            {node}
          </div>
        )}
      >
        <div className="twofactor-content" style={{ textAlign: 'center', padding: '20px' }}>
          <SecurityScanOutlined className="twofactor-icon" style={{ fontSize: 64, color: COLORS.primary, marginBottom: 16 }} />
          <Paragraph style={{ color: COLORS.textSecondary }}>
            Entrez le code à 6 chiffres généré par votre application d'authentification.
          </Paragraph>
          <Input
            placeholder="123456"
            value={twoFactorCode}
            onChange={(e) => setTwoFactorCode(e.target.value)}
            size="large"
            maxLength={6}
            style={{ textAlign: 'center', fontSize: 24, letterSpacing: 8, background: COLORS.bgSecondary, borderColor: COLORS.border, borderRadius: 12, color: COLORS.textPrimary }}
          />
          <div className="twofactor-help" style={{ marginTop: 16 }}>
            <Button type="link" size="small" style={{ color: COLORS.primary }}>
              Problème avec votre code ?
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal de réinitialisation */}
      <Modal
        title={<span style={{ color: COLORS.textPrimary }}>Réinitialisation du mot de passe administrateur</span>}
        open={forgotPasswordVisible}
        onCancel={() => setForgotPasswordVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setForgotPasswordVisible(false)} style={{ borderRadius: 10 }}>
            Annuler
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={resetLoading}
            onClick={handleForgotPassword}
            className="admin-login-button"
            style={{ background: COLORS.gradientPrimary, border: 'none', borderRadius: 10 }}
          >
            Envoyer
          </Button>,
        ]}
        className="reset-modal"
      >
        <div className="reset-content" style={{ textAlign: 'center', padding: '20px' }}>
          <MailOutlined className="reset-icon" style={{ fontSize: 64, color: COLORS.secondary, marginBottom: 16 }} />
          <Paragraph style={{ color: COLORS.textSecondary }}>
            Entrez votre email administrateur pour recevoir un lien de réinitialisation.
          </Paragraph>
          <Input
            placeholder="admin@nexum.com"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            prefix={<MailOutlined />}
            size="large"
            style={{ background: COLORS.bgSecondary, borderColor: COLORS.border, borderRadius: 12, color: COLORS.textPrimary }}
          />
        </div>
      </Modal>
    </div>
  );
};

export default AdminLogin;