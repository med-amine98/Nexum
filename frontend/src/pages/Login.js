// src/pages/Login.js - Version complète avec vérification du token de connexion

import React, { useState, useEffect, useRef } from 'react';
import { 
  Form, Input, Button, Card, Checkbox, Typography, 
  Divider, Alert, Space, Modal, message,
  Avatar, Badge, Tooltip, Select, Tag
} from 'antd';
import { 
  UserOutlined, LockOutlined, MailOutlined,
  GoogleOutlined, LinkedinOutlined,
  EyeOutlined, EyeInvisibleOutlined,
  ArrowRightOutlined, RocketOutlined,
  SafetyCertificateOutlined, ThunderboltOutlined,
  CheckCircleOutlined,
  DashboardOutlined,
  RobotOutlined, SendOutlined, KeyOutlined,
  SecurityScanOutlined, BankOutlined, InsuranceOutlined, ApartmentOutlined, AppstoreOutlined
} from '@ant-design/icons';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import { useAuth } from '../services/auth';
import './Login.css';

const { Title, Text, Paragraph } = Typography;

// ============================================
// CONSTANTS
// ============================================

const COLORS = {
  primary: '#3b82f6',
  primaryDark: '#1d4ed8',
  primaryLight: '#60a5fa',
  secondary: '#1e293b',
  secondaryDark: '#0f172a',
  accent: '#f59e0b',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#0ea5e9',
  white: '#ffffff',
  gray50: '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1e293b',
  gray900: '#0f172a',
};

const SECTOR_OPTIONS = [
  { value: 'ENTERPRISE', label: '🏢 Entreprise', color: '#10b981' },
  { value: 'BANK', label: '🏦 Banque & Finance', color: '#3b82f6' },
  { value: 'INSURANCE', label: '🛡️ Assurance', color: '#f59e0b' },
];

// ✅ Routes par secteur
const SECTOR_ROUTES = {
  'BANK': '/banking-dashboard',
  'INSURANCE': '/insurance-dashboard',
  'ENTERPRISE': '/dashboard',
};

const ANIMATION_VARIANTS = {
  fadeInLeft: {
    hidden: { opacity: 0, x: -60 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } }
  },
  fadeInRight: {
    hidden: { opacity: 0, x: 60 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1], delay: 0.1 } }
  },
  fadeInUp: {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] } }
  },
  staggerContainer: {
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.2 } }
  }
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const Login = () => {
  // États
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState('password');
  const [rememberMe, setRememberMe] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  
  const navigate = useNavigate();
  const location = useLocation();
  const [form] = Form.useForm();
  const hasRedirected = useRef(false);
  const { login, user } = useAuth();

  // ✅ États pour les paramètres de l'URL
  const [prefilledEmail, setPrefilledEmail] = useState('');
  const [prefilledSector, setPrefilledSector] = useState('');
  const [verifiedUser, setVerifiedUser] = useState(null);
  const [loginTokenVerified, setLoginTokenVerified] = useState(false);

  // Social login states
  const [socialModalVisible, setSocialModalVisible] = useState(false);
  const [socialProvider, setSocialProvider] = useState('');
  const [socialEmail, setSocialEmail] = useState('');
  const [socialName, setSocialName] = useState('');
  const [socialSector, setSocialSector] = useState('ENTERPRISE');
  const [socialLoading, setSocialLoading] = useState(false);

  // ============================================
  // ✅ VÉRIFICATION DU TOKEN DE CONNEXION
  // ============================================
  
  const verifyLoginToken = async (token) => {
    try {
      setLoading(true);
      
      const response = await api.get(`/auth/verify-login-token?token=${token}`);
      
      
      if (response.data.success) {
        const userData = response.data;
        setVerifiedUser(userData);
        setLoginTokenVerified(true);
        
        // Pré-remplir le formulaire avec les infos de l'utilisateur
        const email = userData.email;
        const sector = userData.sector || 'ENTERPRISE';
        
        setPrefilledEmail(email);
        setPrefilledSector(sector);
        form.setFieldsValue({ email: email });
        localStorage.setItem('userSector', sector);
        
        message.success({
          content: `✅ Bonjour ${userData.full_name || 'Utilisateur'} ! Veuillez entrer votre mot de passe.`,
          duration: 4,
        });
        
        return true;
      } else {
        message.error('❌ Lien de connexion invalide ou expiré. Veuillez demander un nouveau lien.');
        setLoginTokenVerified(false);
        return false;
      }
    } catch (error) {
      console.error('❌ Erreur vérification token:', error);
      message.error('❌ Lien de connexion invalide ou expiré');
      setLoginTokenVerified(false);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ✅ FONCTION DE VÉRIFICATION D'EMAIL
  // ============================================
  
  const handleEmailVerification = async (token, sector) => {
    try {
      setLoading(true);
      
      const response = await api.get(`/auth/verify-email?verify_token=${token}`);
      
      
      if (response.data.success) {
        message.success({
          content: "✅ Email vérifié avec succès !",
          duration: 4,
        });
        
        const userSector = response.data.sector || sector || 'ENTERPRISE';
        localStorage.setItem('userSector', userSector);
        
        // Si l'API retourne une URL de redirection
        if (response.data.redirect_url) {
          // Rediriger vers l'URL avec le token de connexion
          window.location.href = response.data.redirect_url;
        } else {
          const route = SECTOR_ROUTES[userSector] || '/dashboard';
          setTimeout(() => {
            navigate(route, { replace: true });
          }, 1500);
        }
      } else {
        message.error(response.data.message || "❌ Erreur lors de la vérification");
      }
    } catch (err) {
      console.error('❌ Erreur vérification email:', err);
      message.error("❌ Le lien de vérification est invalide ou a expiré.");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // ✅ USEFFECT - ANALYSE DES PARAMÈTRES DE L'URL
  // ============================================
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get('token');
    const verifyToken = params.get('verify_token');
    const sector = params.get('sector');
    const verified = params.get('verified');
    

    // ✅ A. TOKEN DE CONNEXION (lien "Se connecter" de l'email)
    if (token) {
      verifyLoginToken(token);
    }

    // ✅ B. TOKEN DE VÉRIFICATION D'EMAIL
    if (verifyToken) {
      handleEmailVerification(verifyToken, sector || 'ENTERPRISE');
    }

    // ✅ C. SECTEUR DANS L'URL (fallback)
    if (sector && !token && !verifyToken) {
      localStorage.setItem('userSector', sector);
      setPrefilledSector(sector);
    }

    // ✅ D. VÉRIFICATION RÉUSSIE
    if (verified === '1') {
      message.success({
        content: "✅ Votre adresse email a été vérifiée avec succès !",
        duration: 5,
      });
      const userSector = localStorage.getItem('userSector') || sector || 'ENTERPRISE';
      const route = SECTOR_ROUTES[userSector] || '/dashboard';
      setTimeout(() => navigate(route, { replace: true }), 1000);
    }

  }, [location]);

  // Redirection si déjà connecté
  useEffect(() => {
    if (user && !hasRedirected.current) {
      hasRedirected.current = true;
      const userSector = localStorage.getItem('userSector') || 'ENTERPRISE';
      const route = SECTOR_ROUTES[userSector] || '/dashboard';
      setTimeout(() => navigate(route, { replace: true }), 100);
    }
  }, [user, navigate]);

  // ============================================
  // HANDLERS
  // ============================================

  // ✅ Connexion avec email et mot de passe
  const handleSubmit = async (values) => {
    setLoading(true);
    setError('');
    
    try {
      
      const response = await login(values.email, values.password);
      
      // ✅ Récupérer le secteur (de la réponse ou du localStorage ou de l'utilisateur vérifié)
      const userSector = response.user?.sector || 
                         localStorage.getItem('userSector') || 
                         verifiedUser?.sector || 
                         'ENTERPRISE';
      localStorage.setItem('userSector', userSector);
      
      if (rememberMe) {
        localStorage.setItem('remember_nexum', 'true');
        localStorage.setItem('nexum_email', values.email);
      }
      
      message.success({
        content: `✅ Connexion réussie ! Bienvenue dans Nexum`,
        icon: <CheckCircleOutlined style={{ color: COLORS.success }} />,
        duration: 3,
      });
      
      hasRedirected.current = true;
      
      // ✅ Redirection vers le dashboard du secteur
      const route = SECTOR_ROUTES[userSector] || '/dashboard';
      navigate(route, { replace: true });
      
    } catch (err) {
      console.error('❌ Erreur login:', err);
      
      if (err.response?.status === 401) {
        setError('Email ou mot de passe incorrect');
        message.error('Email ou mot de passe incorrect');
      } else if (err.response?.status === 423) {
        setError('Compte verrouillé. Contactez le support.');
        message.error('Compte verrouillé');
      } else if (err.response?.status === 400) {
        const detail = err.response.data?.detail || 'Compte inactif ou non vérifié';
        setError(detail);
        message.error(detail);
      } else if (err.code === 'ERR_NETWORK') {
        setError('Impossible de joindre le serveur. Vérifiez votre connexion.');
        message.error('Erreur de connexion au serveur');
      } else {
        setError('Erreur de connexion. Veuillez réessayer.');
        message.error('Erreur de connexion');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMfaSubmit = async () => {
    if (!mfaCode || mfaCode.length !== 6) {
      message.warning('Veuillez entrer un code à 6 chiffres');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await api.post('/auth/mfa/verify', {
        tempToken,
        code: mfaCode
      });
      
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        const userSector = response.data.user?.sector || 'ENTERPRISE';
        localStorage.setItem('userSector', userSector);
        message.success('Authentification à deux facteurs réussie');
        const route = SECTOR_ROUTES[userSector] || '/dashboard';
        navigate(route);
      }
    } catch (err) {
      setError('Code invalide. Veuillez réessayer.');
      message.error('Code MFA invalide');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      message.warning('Veuillez entrer votre adresse email');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail)) {
      message.warning('Veuillez entrer une adresse email valide');
      return;
    }
    
    setResetLoading(true);
    
    try {
      await api.post('/auth/forgot-password', {
        email: resetEmail
      });
      
      setForgotPasswordVisible(false);
      setResetEmail('');
      message.success({
        content: `📧 Un email de réinitialisation a été envoyé à ${resetEmail}`,
        icon: <MailOutlined style={{ color: COLORS.success }} />,
        duration: 4,
      });
    } catch (err) {
      message.error("Impossible d'envoyer l'email. Veuillez réessayer.");
    } finally {
      setResetLoading(false);
    }
  };

  // ========== SOCIAL LOGIN ==========
  const handleSocialLogin = (provider) => {
    setSocialProvider(provider);
    setSocialModalVisible(true);
    setSocialEmail('');
    setSocialName('');
    setSocialSector('ENTERPRISE');
  };

  // ✅ Social Login - Version corrigée avec redirection
  const handleSocialSubmit = async () => {
    if (!socialEmail) {
      message.warning('Veuillez entrer votre adresse email');
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(socialEmail)) {
      message.warning('Veuillez entrer une adresse email valide');
      return;
    }
    
    setSocialLoading(true);
    
    try {
      const requestBody = {
        email: socialEmail,
        name: socialName || socialEmail.split('@')[0],
        sector: socialSector
      };
      
      
      const response = await api.post('/auth/social-login', requestBody);
      
      
      if (response.data.success) {
        const user = response.data.user;
        const sector = user?.sector || socialSector;
        
        // ✅ Sauvegarder le token et les infos utilisateur
        if (response.data.access_token) {
          localStorage.setItem('token', response.data.access_token);
          localStorage.setItem('user', JSON.stringify(user));
          localStorage.setItem('userSector', sector);
        }
        
        // ✅ Message de succès
        message.success({
          content: '✅ Connexion réussie ! Bienvenue sur Nexum',
          duration: 3,
        });
        
        // ✅ Fermer le modal
        setSocialModalVisible(false);
        
        // ✅ Rediriger vers le dashboard du secteur
        const route = SECTOR_ROUTES[sector] || '/dashboard';
        
        setTimeout(() => {
          navigate(route, { replace: true });
        }, 500);
        
      } else {
        message.error(response.data.message || 'Erreur lors de la connexion');
      }
      
    } catch (err) {
      console.error('❌ Erreur social-login:', err);
      
      if (err.response?.status === 500) {
        message.error('Erreur serveur. Veuillez réessayer.');
      } else if (err.response?.data?.detail) {
        message.error(err.response.data.detail);
      } else if (err.code === 'ERR_NETWORK') {
        message.error('Erreur de connexion au serveur. Vérifiez que le backend est en cours d\'exécution.');
      } else {
        message.error('Erreur de connexion. Veuillez réessayer.');
      }
    } finally {
      setSocialLoading(false);
    }
  };

  // ========== RENVOYER L'EMAIL DE VÉRIFICATION ==========
  const resendVerificationEmail = async () => {
    const email = localStorage.getItem('pending_verification_email');
    if (!email) {
      message.warning('Aucun email en attente de vérification');
      return;
    }
    
    try {
      const response = await api.post('/auth/resend-verification', { email });
      if (response.data.success) {
        message.success(`📧 Nouvel email de vérification envoyé à ${email}`);
      }
    } catch (err) {
      message.error('Erreur lors du renvoi de l\'email');
    }
  };

  const handleMagicLink = () => {
    const email = form.getFieldValue('email');
    if (!email) {
      message.warning('Veuillez entrer votre email d\'abord');
      return;
    }
    
    message.loading({ content: 'Envoi du lien magique...', key: 'magicLink', duration: 0 });
    
    api.post('/auth/magic-link', { email })
      .then(() => {
        message.success({ 
          content: `✨ Lien magique envoyé à ${email} ! Vérifiez votre boîte de réception.`, 
          key: 'magicLink',
          duration: 4 
        });
      })
      .catch(() => {
        message.error({ 
          content: '❌ Erreur lors de l\'envoi du lien magique', 
          key: 'magicLink',
          duration: 3 
        });
      });
  };

  // ============================================
  // RENDU - Écran MFA
  // ============================================

  if (mfaRequired) {
    return (
      <div className="login-page" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        background: `linear-gradient(135deg, ${COLORS.gray900} 0%, ${COLORS.gray800} 100%)`,
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ width: '100%', maxWidth: 420, padding: 24 }}
        >
          <Card style={{ borderRadius: 24, textAlign: 'center' }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
              style={{
                width: 80,
                height: 80,
                background: `linear-gradient(135deg, ${COLORS.primary}20, ${COLORS.accent}20)`,
                borderRadius: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
              }}
            >
              <SecurityScanOutlined style={{ fontSize: 40, color: COLORS.primary }} />
            </motion.div>
            
            <Title level={3}>Authentification à deux facteurs</Title>
            <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
              Entrez le code à 6 chiffres envoyé à votre appareil authentificateur
            </Text>
            
            <Input.OTP 
              length={6} 
              value={mfaCode}
              onChange={setMfaCode}
              style={{ marginBottom: 24 }}
              size="large"
            />
            
            <Space style={{ width: '100%' }} direction="vertical">
              <Button 
                type="primary" 
                size="large" 
                block
                loading={loading}
                onClick={handleMfaSubmit}
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
                  border: 'none',
                  borderRadius: 12,
                  height: 48,
                }}
              >
                Vérifier
              </Button>
              <Button 
                type="link" 
                onClick={() => {
                  setMfaRequired(false);
                  setMfaCode('');
                  setTempToken('');
                }}
              >
                Retour à la connexion
              </Button>
            </Space>
          </Card>
        </motion.div>
      </div>
    );
  }

  // ============================================
  // RENDU - PRINCIPAL
  // ============================================

  return (
    <div className="login-page" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      background: COLORS.gray50,
      position: 'relative',
      overflow: 'hidden'
    }}>
      
      {/* Background décoratif */}
      <div className="login-bg-particles" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {[...Array(30)].map((_, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: Math.random() * 6 + 2,
              height: Math.random() * 6 + 2,
              background: Math.random() > 0.7 ? COLORS.primary : COLORS.accent,
              borderRadius: '50%',
              opacity: Math.random() * 0.15,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, Math.random() * 100 - 50, 0],
              x: [0, Math.random() * 100 - 50, 0],
              opacity: [0, 0.2, 0],
            }}
            transition={{
              duration: Math.random() * 15 + 15,
              repeat: Infinity,
              ease: "linear",
            }}
          />
        ))}
      </div>

      {/* SECTION HERO GAUCHE */}
      <motion.div 
        className="login-banner"
        variants={ANIMATION_VARIANTS.fadeInLeft}
        initial="hidden"
        animate="visible"
        style={{
          flex: 1.2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
          position: 'relative',
          background: `linear-gradient(135deg, ${COLORS.gray900} 0%, ${COLORS.gray800} 50%, ${COLORS.gray700} 100%)`,
          overflow: 'hidden',
        }}
      >
        {/* Orbes décoratifs */}
        <div className="banner-orbs" style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <motion.div 
            className="orb orb-1"
            style={{
              position: 'absolute',
              width: '60vh',
              height: '60vh',
              background: COLORS.primary,
              borderRadius: '50%',
              filter: 'blur(100px)',
              opacity: 0.12,
              top: '-20%',
              right: '-10%',
            }}
            animate={{ scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          />
          <motion.div 
            className="orb orb-2"
            style={{
              position: 'absolute',
              width: '50vh',
              height: '50vh',
              background: COLORS.accent,
              borderRadius: '50%',
              filter: 'blur(100px)',
              opacity: 0.1,
              bottom: '-20%',
              left: '-10%',
            }}
            animate={{ scale: [1.2, 1, 1.2], rotate: [360, 180, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          />
        </div>

        <div className="banner-content" style={{ position: 'relative', zIndex: 10, maxWidth: 520 }}>
          <motion.div 
            className="banner-logo"
            whileHover={{ scale: 1.02 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 12, marginBottom: 40, padding: '8px 20px', background: 'rgba(255,255,255,0.03)', borderRadius: 100, backdropFilter: 'blur(10px)' }}
          >
            <motion.div 
              className="logo-icon"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              style={{
                width: 40,
                height: 40,
                background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RocketOutlined style={{ color: COLORS.white, fontSize: 20 }} />
            </motion.div>
            <Title level={3} style={{ margin: 0, color: COLORS.white, fontWeight: 700, letterSpacing: -0.5 }}>
              NEXUM<span style={{ color: COLORS.primary }}>.</span>
            </Title>
            <Badge 
              count="v4.0" 
              style={{ 
                backgroundColor: COLORS.accent, 
                color: COLORS.white,
                fontWeight: 600,
                borderRadius: 8,
                padding: '0 10px',
                fontSize: 11,
              }} 
            />
          </motion.div>
          
          <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
            <Title level={1} className="banner-headline" style={{ 
              fontSize: 52, 
              fontWeight: 800, 
              color: COLORS.white,
              marginBottom: 20,
              lineHeight: 1.2,
              letterSpacing: -1.5,
            }}>
              La plateforme ERP 
              <span style={{ color: COLORS.primary, display: 'block' }}>nouvelle génération</span>
            </Title>
          </motion.div>
          
          <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
            <Paragraph className="banner-description" style={{ 
              fontSize: 17, 
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: 40,
              lineHeight: 1.6,
            }}>
              Nexum combine puissance analytique, automatisation intelligente et sécurité 
              de classe entreprise pour transformer votre gestion opérationnelle.
            </Paragraph>
          </motion.div>

          <motion.div 
            variants={ANIMATION_VARIANTS.staggerContainer}
            initial="hidden"
            animate="visible"
            style={{ marginBottom: 40 }}
          >
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <AppstoreOutlined style={{ fontSize: 14 }} /> Solutions sectorielles
            </Text>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(0,82,204,0.15)', borderRadius: 20 }}>
                <BankOutlined style={{ color: '#1890ff', fontSize: 14 }} />
                <span style={{ color: 'white', fontSize: 13 }}>Banque</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(243,156,18,0.15)', borderRadius: 20 }}>
                <InsuranceOutlined style={{ color: '#f39c12', fontSize: 14 }} />
                <span style={{ color: 'white', fontSize: 13 }}>Assurance</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', background: 'rgba(39,174,96,0.15)', borderRadius: 20 }}>
                <ApartmentOutlined style={{ color: '#27ae60', fontSize: 14 }} />
                <span style={{ color: 'white', fontSize: 13 }}>Entreprise</span>
              </div>
            </div>
          </motion.div>

          <motion.div 
            className="banner-features"
            variants={ANIMATION_VARIANTS.staggerContainer}
            initial="hidden"
            animate="visible"
            style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48 }}
          >
            {[
              { icon: <SafetyCertificateOutlined />, text: 'ISO 27001', color: COLORS.success },
              { icon: <ThunderboltOutlined />, text: '99.9% SLA', color: COLORS.accent },
              { icon: <RobotOutlined />, text: 'IA Intégrée', color: COLORS.primary },
            ].map((feature, idx) => (
              <motion.div key={idx} variants={ANIMATION_VARIANTS.fadeInUp} whileHover={{ scale: 1.05, y: -2 }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: 40, backdropFilter: 'blur(10px)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <div style={{ color: feature.color, fontSize: 16 }}>{feature.icon}</div>
                <span style={{ color: COLORS.white, fontSize: 13, fontWeight: 500 }}>{feature.text}</span>
              </motion.div>
            ))}
          </motion.div>

          <motion.div 
            variants={ANIMATION_VARIANTS.staggerContainer}
            initial="hidden"
            animate="visible"
            style={{ 
              display: 'flex', 
              gap: 48, 
              paddingTop: 32,
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            {[
              { value: '50+', label: 'Modules', icon: <DashboardOutlined />, delay: 0.3 },
              { value: '1000+', label: 'Clients', icon: <UserOutlined />, delay: 0.4 },
              { value: '99.9%', label: 'Uptime', icon: <ThunderboltOutlined />, delay: 0.5 },
            ].map((stat, idx) => (
              <motion.div key={idx} variants={ANIMATION_VARIANTS.fadeInUp} style={{ textAlign: 'center' }}>
                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: stat.delay, type: 'spring', stiffness: 200 }} style={{ fontSize: 32, fontWeight: 800, color: COLORS.primary, marginBottom: 4 }}>
                  {stat.value}
                </motion.div>
                <div style={{ fontSize: 12, color: 'rgba(255, 255, 255, 0.6)' }}>{stat.icon} {stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* SECTION FORMULAIRE DROITE */}
      <motion.div 
        className="login-form-container"
        variants={ANIMATION_VARIANTS.fadeInRight}
        initial="hidden"
        animate="visible"
        style={{
          flex: 0.8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 48,
          position: 'relative',
        }}
      >
        <Card className="login-card" style={{
          width: '100%',
          maxWidth: 460,
          borderRadius: 28,
          background: COLORS.white,
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: 'none',
          overflow: 'hidden',
          position: 'relative',
          zIndex: 10,
        }}>
          <div style={{ height: 4, background: `linear-gradient(90deg, ${COLORS.primary}, ${COLORS.accent}, ${COLORS.primary})`, position: 'absolute', top: 0, left: 0, right: 0 }} />

          <div className="login-header" style={{ textAlign: 'center', padding: '28px 28px 0' }}>
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Avatar 
                size={72}
                icon={<UserOutlined />}
                className="role-avatar"
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
                  boxShadow: `0 8px 20px ${COLORS.primary}40`,
                }}
              />
            </motion.div>
            <Title level={3} style={{ marginTop: 20, marginBottom: 6, color: COLORS.gray900, fontWeight: 700 }}>
              Authentification sécurisée
            </Title>
            <Text style={{ color: COLORS.gray500, fontSize: 14 }}>
              Accédez à votre écosystème décisionnel
            </Text>

            {/* ✅ Affichage de l'email pré-rempli */}
            {prefilledEmail && (
              <div style={{ 
                marginTop: 16, 
                padding: '8px 16px', 
                background: '#f0f9ff', 
                borderRadius: 8,
                border: '1px solid #bae6fd'
              }}>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  📧 Connexion pour : <strong>{prefilledEmail}</strong>
                </Text>
                {verifiedUser && (
                  <div style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>
                    ✅ Identité vérifiée : {verifiedUser.full_name || verifiedUser.username}
                  </div>
                )}
              </div>
            )}
            
            {prefilledSector && (
              <div style={{ marginTop: 8 }}>
                <Tag color="blue" style={{ fontSize: 12 }}>
                  🌐 Secteur : {prefilledSector}
                </Tag>
              </div>
            )}

            {/* ✅ Message si le token a été vérifié */}
            {loginTokenVerified && verifiedUser && (
              <div style={{ 
                marginTop: 12, 
                padding: '10px 16px', 
                background: '#ecfdf5', 
                borderRadius: 8,
                border: '1px solid #10b981'
              }}>
                <Text style={{ fontSize: 13, color: '#065f46' }}>
                  ✅ Connexion sécurisée pour : <strong>{verifiedUser.email}</strong>
                </Text>
              </div>
            )}
          </div>

          <div className="login-body" style={{ padding: '24px 28px 32px' }}>
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Alert
                    message="Erreur de connexion"
                    description={error}
                    type="error"
                    showIcon
                    closable
                    className="login-alert"
                    style={{ borderRadius: 12, marginBottom: 24 }}
                    onClose={() => setError('')}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="login-tabs" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 8, background: COLORS.gray100, padding: 4, borderRadius: 12 }}>
                {[
                  { key: 'password', label: 'Mot de passe', icon: <LockOutlined /> },
                  { key: 'email', label: 'Email magique', icon: <SendOutlined /> },
                ].map(tab => (
                  <motion.button
                    key={tab.key}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setLoginMethod(tab.key)}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      background: loginMethod === tab.key ? COLORS.white : 'transparent',
                      border: 'none',
                      borderRadius: 10,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      fontWeight: 500,
                      color: loginMethod === tab.key ? COLORS.primary : COLORS.gray600,
                      boxShadow: loginMethod === tab.key ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {loginMethod === 'password' && (
              <Form
                form={form}
                name="login"
                onFinish={handleSubmit}
                layout="vertical"
                size="large"
                className="login-form"
              >
                <Form.Item
                  name="email"
                  label={<span style={{ fontWeight: 600 }}>Email professionnel</span>}
                  initialValue={prefilledEmail}
                  rules={[
                    { required: true, message: 'Veuillez entrer votre email' },
                    { type: 'email', message: 'Adresse email invalide' }
                  ]}
                >
                  <Input 
                    prefix={<MailOutlined style={{ color: COLORS.gray400 }} />} 
                    placeholder="jean.dupont@entreprise.com"
                    autoComplete="email"
                    style={{ borderRadius: 12, borderColor: COLORS.gray200, padding: '10px 16px' }}
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label={<span style={{ fontWeight: 600 }}>Mot de passe</span>}
                  rules={[
                    { required: true, message: 'Veuillez entrer votre mot de passe' },
                    { min: 6, message: 'Minimum 6 caractères' }
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: COLORS.gray400 }} />}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    visibilityToggle={{ visible: passwordVisible, onVisibleChange: setPasswordVisible }}
                    iconRender={visible => visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                    style={{ borderRadius: 12, borderColor: COLORS.gray200, padding: '10px 16px' }}
                    size="large"
                  />
                </Form.Item>

                <div className="login-options" style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Checkbox 
                    checked={rememberMe} 
                    onChange={(e) => setRememberMe(e.target.checked)}
                  >
                    Se souvenir de moi
                  </Checkbox>
                  <Button 
                    type="link" 
                    className="forgot-link"
                    onClick={() => setForgotPasswordVisible(true)}
                    style={{ color: COLORS.primary, padding: 0, height: 'auto' }}
                  >
                    Mot de passe oublié ?
                  </Button>
                </div>

                <Form.Item>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      width: '100%',
                      background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
                      border: 'none',
                      borderRadius: 12,
                      padding: '14px',
                      color: COLORS.white,
                      fontWeight: 600,
                      fontSize: 15,
                      cursor: loading ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      opacity: loading ? 0.7 : 1,
                    }}
                    onClick={() => form.submit()}
                    disabled={loading}
                  >
                    {loading ? 'Connexion en cours...' : <>Se connecter <ArrowRightOutlined /></>}
                  </motion.button>
                </Form.Item>
              </Form>
            )}

            {loginMethod === 'email' && (
              <div className="email-login" style={{ textAlign: 'center' }}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div style={{ 
                    width: 80, 
                    height: 80, 
                    background: `linear-gradient(135deg, ${COLORS.primary}10, ${COLORS.accent}10)`,
                    borderRadius: 40,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                  }}>
                    <SendOutlined style={{ fontSize: 36, color: COLORS.primary }} />
                  </div>
                  
                  <Paragraph style={{ color: COLORS.gray600, marginBottom: 24 }}>
                    Recevez un lien de connexion magique directement dans votre boîte email.
                    Aucun mot de passe requis.
                  </Paragraph>
                  
                  <Input
                    placeholder="votre@email.com"
                    prefix={<MailOutlined style={{ color: COLORS.gray400 }} />}
                    size="large"
                    style={{ borderRadius: 12, marginBottom: 16 }}
                    onChange={(e) => form.setFieldsValue({ email: e.target.value })}
                  />
                  
                  <Button
                    type="primary"
                    size="large"
                    block
                    icon={<SendOutlined />}
                    onClick={handleMagicLink}
                    style={{ 
                      background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
                      border: 'none',
                      borderRadius: 12,
                      height: 48,
                      fontWeight: 600,
                    }}
                  >
                    Recevoir le lien magique
                  </Button>
                  
                  <Text type="secondary" style={{ display: 'block', marginTop: 16, fontSize: 12, color: COLORS.gray400 }}>
                    Un lien sécurisé vous sera envoyé, valable 15 minutes
                  </Text>
                </motion.div>
              </div>
            )}

            <Divider plain className="login-divider" style={{ margin: '24px 0', borderColor: COLORS.gray200 }}>
              <Text style={{ color: COLORS.gray400, fontSize: 12, fontWeight: 500 }}>OU CONNECTEZ-VOUS AVEC</Text>
            </Divider>

            <Space direction="vertical" size="middle" className="social-login" style={{ width: '100%' }}>
              {[
                { provider: 'Google', icon: <GoogleOutlined />, color: '#DB4437' },
                { provider: 'LinkedIn', icon: <LinkedinOutlined />, color: '#0077b5' },
              ].map((btn, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  style={{ width: '100%' }}
                >
                  <Button 
                    block 
                    size="large"
                    icon={btn.icon}
                    onClick={() => handleSocialLogin(btn.provider)}
                    style={{
                      borderRadius: 12,
                      height: 46,
                      borderColor: COLORS.gray200,
                      fontWeight: 500,
                    }}
                  >
                    Continuer avec {btn.provider}
                  </Button>
                </motion.div>
              ))}
            </Space>

            <div className="login-footer" style={{ marginTop: 28, textAlign: 'center' }}>
              <Text type="secondary" style={{ color: COLORS.gray500, fontSize: 14 }}>
                Pas encore de compte ?{' '}
                <Link to="/signup" className="signup-link" style={{ color: COLORS.primary, fontWeight: 600 }}>
                  Créer un compte gratuit
                </Link>
              </Text>
            </div>

            <div style={{ 
              marginTop: 28, 
              paddingTop: 20, 
              borderTop: `1px solid ${COLORS.gray200}`,
              display: 'flex',
              justifyContent: 'center',
              gap: 28,
              flexWrap: 'wrap',
            }}>
              <Tooltip title="Certification ISO 27001">
                <SafetyCertificateOutlined style={{ fontSize: 18, color: COLORS.gray400 }} />
              </Tooltip>
              <Tooltip title="Conformité RGPD">
                <CheckCircleOutlined style={{ fontSize: 18, color: COLORS.gray400 }} />
              </Tooltip>
              <Tooltip title="Chiffrement AES-256">
                <LockOutlined style={{ fontSize: 18, color: COLORS.gray400 }} />
              </Tooltip>
              <Tooltip title="Authentification 2 facteurs">
                <SecurityScanOutlined style={{ fontSize: 18, color: COLORS.gray400 }} />
              </Tooltip>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* MODAL RÉINITIALISATION */}
      <Modal
        title={
          <div style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36,
              height: 36,
              background: `linear-gradient(135deg, ${COLORS.primary}20, ${COLORS.accent}20)`,
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <KeyOutlined style={{ color: COLORS.primary, fontSize: 18 }} />
            </div>
            <span>Réinitialisation du mot de passe</span>
          </div>
        }
        open={forgotPasswordVisible}
        onCancel={() => setForgotPasswordVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setForgotPasswordVisible(false)} style={{ borderRadius: 10 }}>Annuler</Button>,
          <Button key="submit" type="primary" loading={resetLoading} onClick={handleForgotPassword} style={{ background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`, border: 'none', borderRadius: 10, fontWeight: 600 }}>Envoyer</Button>,
        ]}
        className="reset-modal"
        style={{ borderRadius: 20 }}
        width={440}
      >
        <motion.div 
          className="reset-content"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring" }}
        >
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{
                width: 72,
                height: 72,
                background: `linear-gradient(135deg, ${COLORS.primary}15, ${COLORS.accent}15)`,
                borderRadius: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
              }}
            >
              <MailOutlined style={{ fontSize: 32, color: COLORS.primary }} />
            </motion.div>
          </div>
          
          <Paragraph style={{ textAlign: 'center', marginBottom: 20, color: COLORS.gray600 }}>
            Entrez votre adresse email professionnelle pour recevoir un lien de réinitialisation.
          </Paragraph>
          
          <Input
            placeholder="jean.dupont@entreprise.com"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
            prefix={<MailOutlined style={{ color: COLORS.primary }} />}
            size="large"
            style={{ borderRadius: 10 }}
          />
          
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: 16, fontSize: 12, color: COLORS.gray400 }}>
            Un email vous sera envoyé sous quelques instants
          </Text>
        </motion.div>
      </Modal>

      {/* MODAL SOCIAL LOGIN */}
      <Modal
        title={
          <div style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 36,
              height: 36,
              background: socialProvider === 'Google' ? 'rgba(219, 68, 55, 0.1)' : 'rgba(0, 119, 181, 0.1)',
              borderRadius: 10,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {socialProvider === 'Google' ? (
                <GoogleOutlined style={{ color: '#DB4437', fontSize: 18 }} />
              ) : (
                <LinkedinOutlined style={{ color: '#0077b5', fontSize: 18 }} />
              )}
            </div>
            <span>Continuer avec {socialProvider}</span>
          </div>
        }
        open={socialModalVisible}
        onCancel={() => setSocialModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setSocialModalVisible(false)} style={{ borderRadius: 10 }}>Annuler</Button>,
          <Button key="submit" type="primary" loading={socialLoading} onClick={handleSocialSubmit} style={{ background: socialProvider === 'Google' ? '#DB4437' : '#0077b5', border: 'none', borderRadius: 10, fontWeight: 600 }}>Confirmer</Button>,
        ]}
        style={{ borderRadius: 20 }}
        width={480}
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring" }}
          style={{ padding: '10px 0' }}
        >
          <div style={{ 
            background: '#f0f9ff', 
            padding: '12px', 
            borderRadius: '8px', 
            marginBottom: 20,
            border: '1px solid #bae6fd'
          }}>
            <Text style={{ fontSize: 13, display: 'block', textAlign: 'center' }}>
              📧 Un email de confirmation avec un lien de vérification vous sera envoyé.
              <br />
              <span style={{ fontSize: 12, color: COLORS.gray500 }}>
                Cliquez sur le lien pour activer votre compte.
              </span>
            </Text>
          </div>
          
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>📧 Email</label>
            <Input
              placeholder="votre@email.com"
              value={socialEmail}
              onChange={(e) => setSocialEmail(e.target.value)}
              prefix={<MailOutlined style={{ color: COLORS.gray400 }} />}
              size="large"
              style={{ borderRadius: 10 }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>👤 Nom complet</label>
            <Input
              placeholder="Jean Dupont"
              value={socialName}
              onChange={(e) => setSocialName(e.target.value)}
              prefix={<UserOutlined style={{ color: COLORS.gray400 }} />}
              size="large"
              style={{ borderRadius: 10 }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ fontWeight: 600, display: 'block', marginBottom: 6 }}>🏢 Secteur d'activité</label>
            <Select
              style={{ width: '100%' }}
              size="large"
              value={socialSector}
              onChange={(value) => setSocialSector(value)}
              options={SECTOR_OPTIONS}
            />
          </div>

          <div style={{ 
            background: '#fef3c7', 
            padding: '12px', 
            borderRadius: '8px', 
            border: '1px solid #fcd34d'
          }}>
            <Text style={{ fontSize: 12, display: 'block', textAlign: 'center', color: '#92400e' }}>
              ⚠️ Après validation, vous serez redirigé vers votre dashboard sectoriel.
            </Text>
          </div>
        </motion.div>
      </Modal>
    </div>
  );
};

export default Login;