import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Layout, Typography, Button, Row, Col, Card,
  Avatar, Space, Divider, Tag, Tooltip, Badge,
  Statistic, Modal, Form, Input, message,
  Rate, Carousel, Tabs, Collapse,
  List, Select, DatePicker, Grid,
  FloatButton, Popover, Progress, Steps,
  Timeline, Alert, ConfigProvider, theme
} from 'antd';
import {
  RocketOutlined, CrownOutlined, TeamOutlined,
  ShoppingOutlined, ShoppingCartOutlined, WalletOutlined,
  DatabaseOutlined, ExperimentOutlined, DashboardOutlined,
  ArrowRightOutlined, CheckCircleOutlined,
  GithubOutlined, LinkedinOutlined, TwitterOutlined,
  MailOutlined, PhoneOutlined, EnvironmentOutlined,
  SafetyCertificateOutlined, ThunderboltOutlined,
  CloudOutlined, ApiOutlined, LockOutlined,
  GlobalOutlined, UserOutlined, LoginOutlined,
  UserAddOutlined, MenuOutlined, CloseOutlined,
  FacebookOutlined, InstagramOutlined, YoutubeOutlined,
  AppstoreOutlined, PlayCircleOutlined, DownloadOutlined,
  GiftOutlined, BulbOutlined,
  FundOutlined, NodeIndexOutlined,
  QuestionCircleOutlined, BankOutlined,
  RiseOutlined, BarChartOutlined,
  MessageOutlined, SendOutlined, RobotOutlined,
  CustomerServiceOutlined, CommentOutlined,
  LineChartOutlined, PieChartOutlined,
  StarFilled, TrophyOutlined,
  CompassOutlined, DeploymentUnitOutlined,
  CodeOutlined, GatewayOutlined,
  PartitionOutlined, DotChartOutlined, SettingOutlined,
  RobotFilled, FundFilled, SafetyCertificateFilled,
  AntCloudOutlined, HeatMapOutlined,
  FireOutlined, ThunderboltFilled, StarOutlined,
  LikeOutlined, ShareAltOutlined,
  EyeOutlined, ZoomInOutlined, CalendarOutlined,
  ClockCircleOutlined, VerifiedOutlined, SecurityScanOutlined,
  InsuranceOutlined, TransactionOutlined, PercentageOutlined, LinkOutlined,
  SyncOutlined,
  ArrowUpOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import CountUp from 'react-countup';
import confetti from 'canvas-confetti';
import './Home.css';

const { Header, Content, Footer } = Layout;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { useBreakpoint } = Grid;

// ============================================
// CONSTANTS & CONFIGURATION - PALETTE AURORA
// ============================================

const COLORS = {
  primary: '#6366F1',
  primaryDark: '#4F46E5',
  primaryLight: '#818CF8',
  primaryDarker: '#3730A3',
  primarySubtle: 'rgba(99, 102, 241, 0.12)',
  secondary: '#14B8A6',
  secondaryDark: '#0D9488',
  secondaryLight: '#5EEAD4',
  secondarySubtle: 'rgba(20, 184, 166, 0.12)',
  tertiary: '#F43F5E',
  tertiaryDark: '#E11D48',
  tertiaryLight: '#FB7185',
  accent: '#8B5CF6',
  accentDark: '#7C3AED',
  accentLight: '#A78BFA',
  success: '#10B981',
  successDark: '#059669',
  successLight: '#34D399',
  warning: '#F59E0B',
  warningDark: '#D97706',
  warningLight: '#FBBF24',
  error: '#EF4444',
  errorDark: '#DC2626',
  errorLight: '#F87171',
  info: '#3B82F6',
  infoDark: '#2563EB',
  infoLight: '#60A5FA',
  grayIcon: '#94A3B8',
  grayIconDark: '#64748B',
  grayIconLight: '#CBD5E1',
  bgDeep: '#030014',
  bgPrimary: '#0A0A1A',
  bgSecondary: '#111128',
  bgTertiary: '#1A1A3E',
  bgCard: 'rgba(17, 17, 40, 0.95)',
  bgGlass: 'rgba(10, 10, 26, 0.95)',
  bgGlassLight: 'rgba(10, 10, 26, 0.8)',
  textPrimary: '#FFFFFF',
  textSecondary: '#E2E8F0',
  textTertiary: '#CBD5E1',
  textMuted: '#94A3B8',
  textDisabled: '#64748B',
  textDark: '#0F172A',
  border: 'rgba(255, 255, 255, 0.06)',
  borderLight: 'rgba(255, 255, 255, 0.03)',
  borderMedium: 'rgba(255, 255, 255, 0.1)',
  borderHeavy: 'rgba(255, 255, 255, 0.14)',
  white: '#FFFFFF',
  whiteSmoke: '#F5F5FA',
  gradientPrimary: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #14B8A6 100%)',
  gradientPrimaryHover: 'linear-gradient(135deg, #818CF8 0%, #A78BFA 50%, #5EEAD4 100%)',
  gradientSecondary: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
  gradientTertiary: 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)',
  gradientAccent: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
  gradientSuccess: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  gradientWarning: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  gradientError: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
  gradientDark: 'linear-gradient(135deg, #030014 0%, #0A0A1A 40%, #111128 70%, #1A1A3E 100%)',
  gradientGold: 'linear-gradient(135deg, #F59E0B 0%, #F43F5E 100%)',
};

const ANIMATION_VARIANTS = {
  fadeInUp: {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  },
  fadeIn: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.8 } }
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.5, type: "spring", stiffness: 200 } }
  },
  slideInLeft: {
    hidden: { opacity: 0, x: -100 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, type: "spring", stiffness: 100 } }
  },
  slideInRight: {
    hidden: { opacity: 0, x: 100 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, type: "spring", stiffness: 100 } }
  },
  staggerContainer: {
    visible: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      }
    }
  }
};

// ============================================
// CUSTOM COMPONENTS
// ============================================

const TiltCard = ({ children, className, style }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useSpring(x, { stiffness: 400, damping: 30 });
  const mouseY = useSpring(y, { stiffness: 400, damping: 30 });
  const rotateX = useTransform(mouseY, [-0.5, 0.5], ["7.5deg", "-7.5deg"]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-7.5deg", "7.5deg"]);

  const handleMouseMove = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const width = rect.width;
    const height = rect.height;
    const mouseXRelative = (e.clientX - rect.left) / width;
    const mouseYRelative = (e.clientY - rect.top) / height;
    x.set(mouseXRelative - 0.5);
    y.set(mouseYRelative - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      ref={ref}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
        ...style
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const ParticleBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let animationFrameId;
    let particles = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const createParticles = () => {
      const particleCount = 120;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          radius: Math.random() * 2 + 1,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: (Math.random() - 0.5) * 0.3,
          opacity: Math.random() * 0.4,
          color: Math.random() > 0.5 ? COLORS.primary : COLORS.secondary,
        });
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    resize();
    createParticles();
    animate();
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  );
};

const TypingIndicator = () => (
  <div style={{ display: 'flex', gap: 6 }}>
    {[0, 1, 2].map((i) => (
      <motion.div
        key={i}
        animate={{
          y: [0, -8, 0],
          opacity: [0.3, 1, 0.3],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          delay: i * 0.2,
          ease: "easeInOut",
        }}
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: COLORS.primary,
        }}
      />
    ))}
  </div>
);

const AnimatedNumber = ({ value, suffix, color }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref}>
      {isVisible ? (
        <CountUp
          start={0}
          end={value}
          duration={2.5}
          separator=" "
          suffix={suffix}
        >
          {({ countUpRef }) => (
            <span ref={countUpRef} style={{ color, fontSize: 48, fontWeight: 'bold' }} />
          )}
        </CountUp>
      ) : (
        <span style={{ color, fontSize: 48, fontWeight: 'bold' }}>0</span>
      )}
    </div>
  );
};

const GlowCard = ({ children, color, className, style, onClick }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className={className}
      style={{
        position: 'relative',
        borderRadius: 20,
        overflow: 'hidden',
        ...style,
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -10 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
    >
      {isHovered && (
        <motion.div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `radial-gradient(circle at 50% 50%, ${color}20, transparent)`,
            pointerEvents: 'none',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
      {children}
    </motion.div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

const Home = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactModalVisible, setContactModalVisible] = useState(false);
  const [demoModalVisible, setDemoModalVisible] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeModule, setActiveModule] = useState(0);
  const [activeSector, setActiveSector] = useState(0);
  const [activeAssistant, setActiveAssistant] = useState(0);
  const [hoveredFeature, setHoveredFeature] = useState(null);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [assistantTyping, setAssistantTyping] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [avatarAnimation, setAvatarAnimation] = useState('idle');

  const messagesEndRef = useRef(null);
  const statsRef = useRef(null);
  const heroRef = useRef(null);

  const navigate = useNavigate();
  const screens = useBreakpoint();

  const stats = useMemo(() => [
    {
      value: 50,
      suffix: '+',
      label: 'Modules intégrés',
      icon: <AppstoreOutlined />,
      color: COLORS.primary,
      gradient: COLORS.gradientPrimary,
      description: 'Couverture fonctionnelle complète'
    },
    {
      value: 1000,
      suffix: '+',
      label: 'Entreprises clientes',
      icon: <TeamOutlined />,
      color: COLORS.accent,
      gradient: COLORS.gradientAccent,
      description: 'Dans plus de 15 pays'
    },
    {
      value: 99.9,
      suffix: '%',
      label: 'Disponibilité',
      icon: <ThunderboltOutlined />,
      color: COLORS.success,
      gradient: COLORS.gradientSuccess,
      description: 'SLA garantie'
    },
    {
      value: 24,
      suffix: '/7',
      label: 'Support premium',
      icon: <SafetyCertificateOutlined />,
      color: COLORS.secondary,
      gradient: COLORS.gradientSecondary,
      description: 'Assistance prioritaire'
    },
  ], []);

  const modules = useMemo(() => [
    {
      icon: <ShoppingOutlined />,
      title: 'Ventes & Commerce',
      color: COLORS.primary,
      gradient: COLORS.gradientPrimary,
      description: 'Optimisez votre cycle de vente de A à Z',
      features: [
        'Gestion des devis et propositions',
        'Commandes clients et facturation',
        'Catalogue produits dynamique',
        'Suivi commercial en temps réel'
      ],
      stats: { conversion: '+45%', satisfaction: '98%' },
      kpi: '124 commandes/mois',
      demoLink: '/demo/sales',
      iconBg: '#6366f120',
      iconColor: COLORS.primary
    },
    {
      icon: <ShoppingCartOutlined />,
      title: 'Achats & Supply',
      color: COLORS.warning,
      gradient: COLORS.gradientWarning,
      description: 'Maîtrisez votre chaîne d\'approvisionnement',
      features: [
        'Commandes fournisseurs automatisées',
        'Gestion des stocks prédictive',
        'Réceptions et contrôles qualité',
        'Retours et avoirs fournisseurs'
      ],
      stats: { economie: '-30%', delai: '-45%' },
      kpi: '56 commandes/mois',
      demoLink: '/demo/procurement',
      iconBg: '#f59e0b20',
      iconColor: COLORS.warning
    },
    {
      icon: <TeamOutlined />,
      title: 'CRM 360°',
      color: COLORS.success,
      gradient: COLORS.gradientSuccess,
      description: 'Une vision unifiée de vos clients',
      features: [
        'Gestion des leads et opportunités',
        'Pipeline de vente interactif',
        'Historique client complet',
        'Campagnes marketing intégrées'
      ],
      stats: { satisfaction: '+65%', retention: '+40%' },
      kpi: '89 leads actifs',
      demoLink: '/demo/crm',
      iconBg: '#10b98120',
      iconColor: COLORS.success
    },
    {
      icon: <WalletOutlined />,
      title: 'Finance & Compta',
      color: COLORS.tertiary,
      gradient: COLORS.gradientTertiary,
      description: 'Une gestion financière en temps réel',
      features: [
        'Comptabilité générale et analytique',
        'Facturation électronique',
        'Trésorerie prévisionnelle',
        'Rapports financiers automatisés'
      ],
      stats: { gain: '-50%', precision: '100%' },
      kpi: '234 factures/mois',
      demoLink: '/demo/finance',
      iconBg: '#f43f5e20',
      iconColor: COLORS.tertiary
    },
    {
      icon: <DatabaseOutlined />,
      title: 'Stock & Logistique',
      color: COLORS.info,
      gradient: `linear-gradient(135deg, ${COLORS.info} 0%, ${COLORS.primary} 100%)`,
      description: 'Optimisez vos stocks intelligemment',
      features: [
        'Gestion multi-entrepôts',
        'Mouvements de stock en temps réel',
        'Alertes de réapprovisionnement',
        'Inventaire tournant'
      ],
      stats: { rupture: '-75%', precision: '99.5%' },
      kpi: '1245 références',
      demoLink: '/demo/inventory',
      iconBg: '#3b82f620',
      iconColor: COLORS.info
    },
    {
      icon: <ExperimentOutlined />,
      title: 'Projets & Collaboratif',
      color: COLORS.secondary,
      gradient: COLORS.gradientSecondary,
      description: 'Gérez vos projets efficacement',
      features: [
        'Planification de projets',
        'Suivi des tâches et jalons',
        'Gestion des ressources',
        'Tableaux de bord collaboratifs'
      ],
      stats: { efficacite: '+55%', delais: '-40%' },
      kpi: '23 projets actifs',
      demoLink: '/demo/projects',
      iconBg: '#14b8a620',
      iconColor: COLORS.secondary
    },
  ], []);

  const assistants = useMemo(() => [
    {
      id: 'predict',
      icon: <FundFilled />,
      title: 'Nexy Predict',
      subtitle: 'Intelligence Prédictive',
      color: COLORS.primary,
      gradient: COLORS.gradientPrimary,
      description: 'Anticipez les dynamiques de marché',
      longDescription: 'Nexy Predict déploie des algorithmes d\'apprentissage profond pour transformer vos données historiques en leviers stratégiques.',
      features: [
        'Analyse prédictive des flux de trésorerie',
        'Identification des vecteurs de croissance',
        'Modélisation de scénarios stratégiques',
        'Scoring dynamique des opportunités'
      ],
      stats: { precision: '95%', gain: '+35%' },
      capabilities: [
        { name: 'Précision analytique', value: 95 },
        { name: 'Vitesse de traitement', value: 98 },
        { name: 'Fiabilité des modèles', value: 92 }
      ],
      path: '/assistant/predict',
      demoLink: '/demo/predict',
      icon_alt: <LineChartOutlined />
    },
    {
      id: 'risk',
      icon: <SafetyCertificateFilled />,
      title: 'Nexy Risk',
      subtitle: 'Gestion des Risques',
      color: COLORS.accent,
      gradient: COLORS.gradientAccent,
      description: 'Sécurisez vos actifs',
      longDescription: 'Nexy Risk assure une surveillance périmétrique continue de vos flux financiers pour neutraliser les anomalies.',
      features: [
        'Détection de fraude par intelligence artificielle',
        'Évaluation de solvabilité multicritères',
        'Alertes de conformité en temps réel',
        'Automatisation du contrôle interne'
      ],
      stats: { protection: '99%', reduction: '-60%' },
      capabilities: [
        { name: 'Détection cyber-fraude', value: 99 },
        { name: 'Mitigation des risques', value: 85 },
        { name: 'Conformité globale', value: 97 }
      ],
      path: '/assistant/risk',
      demoLink: '/demo/risk',
      icon_alt: <SafetyCertificateOutlined />
    },
    {
      id: 'growth',
      icon: <RiseOutlined />,
      title: 'Nexy Growth',
      subtitle: 'Optimisation de Croissance',
      color: COLORS.success,
      gradient: COLORS.gradientSuccess,
      description: 'Maximisez vos revenus',
      longDescription: 'Nexy Growth identifie les gisements de valeur inexploités dans votre portefeuille client.',
      features: [
        'Intelligence économique et concurrentielle',
        'Algorithmes de recommandation Up-sell',
        'Optimisation de la LTV client',
        'Analyse de l\'attrition prévisionnelle'
      ],
      stats: { croissance: '+45%', retention: '+30%' },
      capabilities: [
        { name: 'Recommandations ROI', value: 93 },
        { name: 'Accélération business', value: 89 },
        { name: 'Indice de fidélité', value: 91 }
      ],
      path: '/assistant/growth',
      demoLink: '/demo/growth',
      icon_alt: <RiseOutlined />
    },
    {
      id: 'copilot',
      icon: <RobotFilled />,
      title: 'Nexy Copilot',
      subtitle: 'Excellence Opérationnelle',
      color: COLORS.secondary,
      gradient: COLORS.gradientSecondary,
      description: 'Automatisez vos processus',
      longDescription: 'Nexy Copilot agit comme un multiplicateur de force opérationnelle.',
      features: [
        'Orchestration intelligente des processus',
        'Interface conversationnelle contextuelle',
        'Assistance décisionnelle immédiate',
        'Supervision proactive des KPIs'
      ],
      stats: { efficience: '+40%', temps: '-55%' },
      capabilities: [
        { name: 'Automatisation', value: 94 },
        { name: 'Agilité système', value: 88 },
        { name: 'Précision exécutive', value: 96 }
      ],
      path: '/assistant/copilot',
      demoLink: '/demo/copilot',
      icon_alt: <ThunderboltOutlined />
    }
  ], []);

  const testimonials = useMemo(() => [
    {
      name: 'Sophie Martin',
      role: 'Directrice Générale',
      company: 'TechCorp International',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      content: 'Nexum a révolutionné notre ingénierie de processus. La plateforme est d\'une puissance analytique rare.',
      rating: 5,
      result: '+40% efficience',
      metric: 'Déploiement global',
      icon: <GlobalOutlined />
    },
    {
      name: 'Thomas Dubois',
      role: 'CEO',
      company: 'InnovStart',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      content: 'Le système ERP le plus modulaire du marché. Sa capacité à intégrer l\'intelligence prédictive nous donne un avantage concurrentiel majeur.',
      rating: 5,
      result: '+120% ROI',
      metric: 'Scaling accéléré',
      icon: <RiseOutlined />
    },
    {
      name: 'Marie Lambert',
      role: 'Directrice Administrative',
      company: 'Groupe Lambert',
      avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
      content: 'L\'automatisation des flux financiers nous a permis de réduire drastiquement nos cycles de clôture.',
      rating: 5,
      result: '-50% latence',
      metric: 'Flux automatisés',
      icon: <BankOutlined />
    },
  ], []);

  const sectors = useMemo(() => [
    {
      icon: <BankOutlined />,
      title: 'Banques & Finance',
      color: COLORS.primary,
      gradient: COLORS.gradientPrimary,
      description: 'Solutions conformes aux standards bancaires internationaux.',
      features: [
        { icon: <SafetyCertificateOutlined />, text: 'Conformité Bâle III & KYC' },
        { icon: <FundOutlined />, text: 'Modélisation des risques de crédit' },
        { icon: <BarChartOutlined />, text: 'Reporting financier consolidé' },
        { icon: <LockOutlined />, text: 'Sécurisation des flux transactionnels' }
      ],
      clients: 150,
      success: 'Disponibilité 99.99%',
      image_alt: <BankOutlined />
    },
    {
      icon: <InsuranceOutlined />,
      title: 'Assurances',
      color: COLORS.accent,
      gradient: COLORS.gradientAccent,
      description: 'Optimisation de la chaîne de valeur.',
      features: [
        { icon: <DeploymentUnitOutlined />, text: 'Gestion automatisée des polices' },
        { icon: <PieChartOutlined />, text: 'Analyse actuarielle prédictive' },
        { icon: <DotChartOutlined />, text: 'Digitalisation du parcours sinistre' },
        { icon: <CustomerServiceOutlined />, text: 'Expérience client unifiée' }
      ],
      clients: 85,
      success: 'Optimisation du ratio S/P',
      image_alt: <InsuranceOutlined />
    },
    {
      icon: <GlobalOutlined />,
      title: 'Groupes Internationaux',
      color: COLORS.success,
      gradient: COLORS.gradientSuccess,
      description: 'Convergence opérationnelle pour structures multi-sites.',
      features: [
        { icon: <PartitionOutlined />, text: 'Pilotage multi-filiales & devises' },
        { icon: <GatewayOutlined />, text: 'Gouvernance de données centralisée' },
        { icon: <DeploymentUnitOutlined />, text: 'Supply Chain collaborative' },
        { icon: <CodeOutlined />, text: 'Analytics BI temps réel' }
      ],
      clients: 200,
      success: 'ROI mesuré à 18 mois',
      image_alt: <GlobalOutlined />
    }
  ], []);

  const mainFeatures = useMemo(() => [
    {
      icon: <DashboardOutlined />,
      title: 'Dashboard intuitif',
      description: 'Visualisez vos KPIs en temps réel',
      gradient: COLORS.gradientPrimary,
      color: COLORS.primary,
      iconColor: COLORS.white
    },
    {
      icon: <ApiOutlined />,
      title: 'API puissante',
      description: 'Intégrez facilement vos applications',
      gradient: COLORS.gradientAccent,
      color: COLORS.accent,
      iconColor: COLORS.white
    },
    {
      icon: <CloudOutlined />,
      title: 'Cloud hybride',
      description: 'Déployez selon vos besoins',
      gradient: COLORS.gradientSuccess,
      color: COLORS.success,
      iconColor: COLORS.white
    },
    {
      icon: <LockOutlined />,
      title: 'Sécurité avancée',
      description: 'Protection des données avec chiffrement',
      gradient: COLORS.gradientSecondary,
      color: COLORS.secondary,
      iconColor: COLORS.white
    }
  ], []);

  // ============================================
  // EFFETS & HOOKS
  // ============================================

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setScrolled(window.scrollY > 50);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: [COLORS.primary, COLORS.secondary, COLORS.accent],
          });
        }
      },
      { threshold: 0.5 }
    );

    if (statsRef.current) {
      observer.observe(statsRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [assistantMessages]);

  useEffect(() => {
    if (showWelcome) {
      setTimeout(() => {
        setAssistantMessages([
          {
            id: 1,
            type: 'bot',
            text: "Bienvenue dans l'écosystème décisionnel Nexum ERP. Je suis Nexy, votre interface d'intelligence augmentée. Comment puis-je assister votre pilotage stratégique aujourd'hui ?",
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setShowWelcome(false);
      }, 1000);
    }
  }, [showWelcome]);

  useEffect(() => {
    if (assistantMessages.length > 0 && assistantMessages[assistantMessages.length - 1].type === 'bot') {
      setAvatarAnimation('talking');
      setTimeout(() => setAvatarAnimation('idle'), 2000);
    }
  }, [assistantMessages]);

  // ============================================
  // HANDLERS
  // ============================================

  const getBotResponse = useCallback((message) => {
    const lowerMsg = message.toLowerCase();

    const responses = {
      greeting: {
        keywords: ['bonjour', 'salut', 'hello', 'coucou'],
        response: "Bonjour ! Je suis ravi de vous aider. Que souhaitez-vous découvrir sur Nexum ERP aujourd'hui ?"
      },
      presentation: {
        keywords: ['présente', 'c\'est quoi', 'quest ce que', 'explique'],
        response: "Nexum ERP est une solution de gestion d'entreprise nouvelle génération. Elle centralise l'ensemble de vos processus métier et utilise l'IA pour optimiser vos opérations."
      },
      modules: {
        keywords: ['module', 'fonctionnalité', 'feature'],
        response: "Nexum propose 50+ modules interconnectés : Ventes & Commerce, Achats & Supply, CRM 360°, Finance & Compta, Stock & Logistique, Projets & Collaboratif, et IA & Analytics."
      },
      demo: {
        keywords: ['démo', 'demo', 'essai', 'test'],
        response: "Vous pouvez demander une démo personnalisée gratuitement ! Cliquez sur le bouton 'Démo personnalisée' en haut de la page."
      },
      pricing: {
        keywords: ['tarif', 'prix', 'coût', 'forfait'],
        response: "Nous proposons des formules flexibles : Startup à partir de 29€/mois, Business à 79€/mois, et Enterprise sur mesure. Tous les plans incluent 30 jours d'essai gratuit !"
      },
      support: {
        keywords: ['support', 'aide', 'contact'],
        response: "Notre support est disponible 24/7 : Email : support@nexum.com, Téléphone : +33 1 86 26 27 28"
      },
      security: {
        keywords: ['sécurité', 'securite', 'données', 'rgpd'],
        response: "Sécurité de classe entreprise : Chiffrement AES-256, authentification multi-facteurs, infrastructure certifiée, conformité RGPD et ISO 27001."
      }
    };

    for (const [_, value] of Object.entries(responses)) {
      if (value.keywords.some(keyword => lowerMsg.includes(keyword))) {
        return value.response;
      }
    }

    return "Pour un accompagnement sur mesure, je vous suggère : 1. L'examen de notre documentation technique, 2. Une mise en relation avec un ingénieur d'affaires, 3. La planification d'un audit de vos besoins.";
  }, []);

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: newMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setAssistantMessages(prev => [...prev, userMessage]);
    setNewMessage('');
    setAssistantTyping(true);

    setTimeout(() => {
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        text: getBotResponse(userMessage.text),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setAssistantMessages(prev => [...prev, botResponse]);
      setAssistantTyping(false);

      if (userMessage.text.toLowerCase().includes('merci') || userMessage.text.toLowerCase().includes('thanks')) {
        confetti({
          particleCount: 50,
          spread: 50,
          origin: { y: 0.8 },
          colors: [COLORS.primary, COLORS.accent],
        });
      }
    }, 1500);
  }, [newMessage, getBotResponse]);

  const handleSuggestionClick = useCallback((suggestion) => {
    const userMessage = {
      id: Date.now(),
      type: 'user',
      text: suggestion,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setAssistantMessages(prev => [...prev, userMessage]);
    setAssistantTyping(true);

    setTimeout(() => {
      const botResponse = {
        id: Date.now() + 1,
        type: 'bot',
        text: getBotResponse(suggestion),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setAssistantMessages(prev => [...prev, botResponse]);
      setAssistantTyping(false);
    }, 1500);
  }, [getBotResponse]);

  const handleContactSubmit = useCallback((values) => {
    message.success({
      content: 'Votre message a été transmis avec succès. Un consultant reviendra vers vous sous 24 heures.',
      icon: <CheckCircleOutlined style={{ color: COLORS.success }} />,
      duration: 3,
    });
    setContactModalVisible(false);

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: [COLORS.primary, COLORS.accent],
    });
  }, []);

  const handleDemoSubmit = useCallback((values) => {
    message.success({
      content: 'Demande de démonstration enregistrée. Un ingénieur Nexum prendra contact avec vous prochainement.',
      icon: <CheckCircleOutlined style={{ color: COLORS.success }} />,
      duration: 4,
    });
    setDemoModalVisible(false);

    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.7 },
      colors: [COLORS.primary, COLORS.accent, COLORS.secondary],
    });
  }, []);

  const handleLoginClick = () => navigate('/login');
  const handleSignupClick = () => navigate('/pricing');
  const handleAssistantClick = (path) => navigate(path);

  const handleShareClick = () => {
    navigator.clipboard.writeText(window.location.href);
    message.success('Lien copié ! Partagez Nexum autour de vous');
  };

  // ============================================
  // RENDU
  // ============================================

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: COLORS.primary,
          colorLink: COLORS.primary,
          borderRadius: 12,
          fontFamily: "'Inter', 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        },
        components: {
          Button: { algorithm: true },
          Card: {
            colorBgContainer: COLORS.bgCard,
            colorBorderSecondary: COLORS.border,
          },
        },
      }}
    >
      <Layout className="home-layout" style={{ background: COLORS.bgPrimary }}>
        {/* Header */}
        <motion.header
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          className={`home-header ${scrolled ? 'scrolled' : ''}`}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1000,
            padding: '20px 0',
            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            background: scrolled ? COLORS.bgGlass : 'transparent',
            backdropFilter: scrolled ? 'blur(16px)' : 'none',
            borderBottom: scrolled ? `1px solid ${COLORS.border}` : 'none',
          }}
        >
          <div className="header-container" style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0 24px'
          }}>
            <motion.div
              className="logo-container"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              whileHover={{ scale: 1.05 }}
              style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
            >
              <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: -1, background: COLORS.gradientPrimary, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>
                NEXUM
              </span>
            </motion.div>

            <div className="nav-links" style={{ display: screens.md ? 'flex' : 'none', gap: 32, alignItems: 'center' }}>
              {['Services', 'Solutions', 'Écosystème', 'Contact'].map((item) => (
                <Text key={item} className="nav-item" style={{
                  color: COLORS.textSecondary,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'color 0.3s ease',
                  position: 'relative'
                }}
                  onMouseEnter={(e) => e.target.style.color = COLORS.primary}
                  onMouseLeave={(e) => e.target.style.color = COLORS.textSecondary}
                  onClick={() => {
                    if (item === 'Contact') {
                      navigate('/contact');
                    } else {
                      const id = item === 'Écosystème' ? 'assistants' : 
                                 item === 'Services' ? 'modules' :
                                 item === 'Solutions' ? 'features' : 'contact';
                      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
                    }
                  }}
                >
                  {item}
                </Text>
              ))}
              
              <Button
                type="default"
                style={{
                  height: 40,
                  padding: '0 20px',
                  borderRadius: 10,
                  fontWeight: 600,
                  borderColor: COLORS.primary,
                  color: COLORS.primary,
                  background: 'transparent'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = COLORS.gradientPrimary;
                  e.currentTarget.style.color = COLORS.white;
                  e.currentTarget.style.borderColor = 'transparent';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = COLORS.primary;
                  e.currentTarget.style.borderColor = COLORS.primary;
                }}
                onClick={() => navigate('/pricing')}
              >
                Tarifs
              </Button>
              
              <Divider type="vertical" style={{ borderColor: COLORS.border, height: 24 }} />
              <Button type="text" style={{ color: COLORS.textPrimary, fontWeight: 600 }} onClick={() => navigate('/login')}>
                Accès Client
              </Button>
              <Button
                type="primary"
                style={{
                  height: 45,
                  padding: '0 24px',
                  borderRadius: 12,
                  fontWeight: 700,
                  background: COLORS.gradientPrimary,
                  color: COLORS.white,
                  border: 'none',
                  boxShadow: `0 4px 15px ${COLORS.primary}40`
                }}
                onClick={() => navigate('/signup')}
              >
                Déployer Nexum
              </Button>
            </div>

            <Button
              className="mobile-menu-btn"
              icon={mobileMenuOpen ? <CloseOutlined /> : <MenuOutlined />}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ color: COLORS.white, display: screens.md ? 'none' : 'block' }}
            />
          </div>
        </motion.header>

        <Content>
          {/* Hero Section */}
          <motion.section
            id="accueil"
            className="hero-section"
            initial="hidden"
            animate="visible"
            variants={ANIMATION_VARIANTS.fadeIn}
            style={{
              background: COLORS.gradientDark,
              position: 'relative',
              overflow: 'hidden',
              minHeight: '100vh',
              display: 'flex',
              alignItems: 'center',
              paddingTop: 100
            }}
            ref={heroRef}
          >
            <ParticleBackground />

            <div className="hero-content" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', width: '100%' }}>
              <Row gutter={[48, 48]} align="middle">
                <Col xs={24} lg={12}>
                  <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                    >
                      <Badge.Ribbon text="STANDARD INTERNATIONAL 4.0" color={COLORS.primary}>
                        <Title level={1} className="hero-title" style={{ 
                          background: COLORS.gradientPrimary, 
                          WebkitBackgroundClip: 'text', 
                          backgroundClip: 'text', 
                          color: 'transparent', 
                          fontSize: 56, 
                          fontWeight: 800 
                        }}>
                          Nexum Enterprise
                        </Title>
                      </Badge.Ribbon>
                    </motion.div>

                    <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
                      <Title level={2} className="hero-subtitle" style={{ color: COLORS.white, fontSize: 32, marginTop: 16 }}>
                        L'Intelligence Artificielle au service de l'
                        <span style={{
                          background: COLORS.gradientPrimary,
                          WebkitBackgroundClip: 'text',
                          backgroundClip: 'text',
                          color: 'transparent',
                        }}>Excellence Opérationnelle</span>
                      </Title>
                    </motion.div>

                    <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
                      <Paragraph className="hero-description" style={{ color: COLORS.textSecondary, fontSize: 18 }}>
                        Centralisez, automatisez et optimisez l'ensemble de vos processus métier
                        avec la première plateforme ERP intelligente qui apprend de votre entreprise.
                      </Paragraph>
                    </motion.div>

                    <motion.div variants={ANIMATION_VARIANTS.fadeInUp} className="hero-buttons">
                      <Space size="middle" wrap>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            background: COLORS.gradientPrimary,
                            border: 'none',
                            borderRadius: 14,
                            padding: '14px 36px',
                            color: COLORS.white,
                            fontWeight: 800,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 16,
                          }}
                          onClick={() => setDemoModalVisible(true)}
                        >
                          <RocketOutlined /> Démo personnalisée
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            background: 'transparent',
                            border: `2px solid ${COLORS.white}`,
                            borderRadius: 12,
                            padding: '12px 32px',
                            color: COLORS.white,
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 16,
                          }}
                        >
                          <PlayCircleOutlined /> Voir la vidéo
                        </motion.button>
                      </Space>
                    </motion.div>

                    <motion.div
                      variants={ANIMATION_VARIANTS.staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className="hero-stats"
                      ref={statsRef}
                    >
                      <Space size="large" wrap>
                        {stats.map((stat, index) => (
                          <motion.div key={index} variants={ANIMATION_VARIANTS.fadeInUp}>
                            <Tooltip title={stat.description}>
                              <div style={{ textAlign: 'center' }}>
                                <div style={{ color: stat.color, fontSize: 48, fontWeight: 'bold' }}>
                                  <AnimatedNumber value={stat.value} suffix={stat.suffix} color={stat.color} />
                                </div>
                                <div style={{ color: COLORS.textSecondary, marginTop: 8 }}>
                                  {stat.icon} {stat.label}
                                </div>
                              </div>
                            </Tooltip>
                          </motion.div>
                        ))}
                      </Space>
                    </motion.div>
                  </motion.div>
                </Col>

                <Col xs={24} lg={12}>
                  <motion.div
                    className="hero-image-container"
                    initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
                  >
                    <TiltCard>
                      <Card className="hero-image-card" style={{ borderRadius: 24, overflow: 'hidden', background: COLORS.bgTertiary }}>
                        <motion.img
                          src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-1.2.1&auto=format&fit=crop&w=1350&q=80"
                          alt="ERP Dashboard"
                          className="hero-image"
                          style={{ width: '100%', height: 'auto' }}
                          whileHover={{ scale: 1.05 }}
                          transition={{ duration: 0.3 }}
                        />
                        <div className="hero-image-overlay" style={{ position: 'absolute', bottom: 24, left: 24, right: 24 }}>
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}
                          >
                            <motion.div whileHover={{ scale: 1.05 }}>
                              <Tag color="blue" className="image-tag" style={{ background: COLORS.primary, color: COLORS.white, padding: '8px 16px', borderRadius: 20 }}>
                                <RobotOutlined /> IA intégrée
                              </Tag>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }}>
                              <Tag color="purple" className="image-tag" style={{ background: COLORS.accent, color: COLORS.white, padding: '8px 16px', borderRadius: 20 }}>
                                <GlobalOutlined /> Multi-plateforme
                              </Tag>
                            </motion.div>
                            <motion.div whileHover={{ scale: 1.05 }}>
                              <Tag color="green" className="image-tag" style={{ background: COLORS.success, color: COLORS.white, padding: '8px 16px', borderRadius: 20 }}>
                                <CloudOutlined /> Cloud hybride
                              </Tag>
                            </motion.div>
                          </motion.div>
                        </div>
                      </Card>
                    </TiltCard>
                  </motion.div>
                </Col>
              </Row>
            </div>

            <motion.div
              className="scroll-indicator"
              style={{
                position: 'absolute',
                bottom: 30,
                left: '50%',
                transform: 'translateX(-50%)',
                cursor: 'pointer',
                zIndex: 10,
              }}
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              onClick={() => document.getElementById('modules')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <div style={{ width: 30, height: 50, border: `2px solid ${COLORS.white}`, borderRadius: 15, position: 'relative' }}>
                <motion.div
                  style={{
                    width: 4,
                    height: 10,
                    background: COLORS.primary,
                    borderRadius: 2,
                    position: 'absolute',
                    top: 8,
                    left: '50%',
                    transform: 'translateX(-50%)',
                  }}
                  animate={{ y: [0, 20, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
            </motion.div>
          </motion.section>

          {/* Stats Section */}
          <motion.section
            className="stats-section"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={ANIMATION_VARIANTS.staggerContainer}
            style={{ background: COLORS.bgSecondary, padding: '80px 0', borderTop: `1px solid ${COLORS.border}` }}
          >
            <Row gutter={[24, 24]} justify="center" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
              {stats.map((stat, index) => (
                <Col xs={12} sm={6} key={index}>
                  <motion.div variants={ANIMATION_VARIANTS.scaleIn}>
                    <GlowCard color={stat.color}>
                      <Card className="stat-card" variant="borderless" hoverable style={{ textAlign: 'center', borderRadius: 20, background: COLORS.bgTertiary }}>
                        <motion.div
                          whileHover={{ rotate: 360 }}
                          transition={{ duration: 0.5 }}
                        >
                          <Avatar
                            size={64}
                            icon={stat.icon}
                            style={{
                              background: stat.gradient,
                              marginBottom: 16,
                              boxShadow: `0 4px 15px ${stat.color}40`,
                              color: COLORS.white,
                            }}
                          />
                        </motion.div>
                        <Title level={2} style={{ color: stat.color, margin: 0 }}>
                          <AnimatedNumber value={stat.value} suffix={stat.suffix} color={stat.color} />
                        </Title>
                        <Text type="secondary" style={{ color: COLORS.textMuted }}>{stat.label}</Text>
                        <Text className="stat-description" style={{ color: COLORS.textMuted, fontSize: 12, display: 'block', marginTop: 8 }}>{stat.description}</Text>
                      </Card>
                    </GlowCard>
                  </motion.div>
                </Col>
              ))}
            </Row>
          </motion.section>

          {/* Features Section */}
          <motion.section
            id="features"
            className="features-section"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={ANIMATION_VARIANTS.staggerContainer}
            style={{ background: COLORS.bgPrimary, padding: '80px 0', position: 'relative', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${COLORS.primary}, transparent)` }} />

            <div className="section-header" style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto 48px', padding: '0 24px' }}>
              <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
                <motion.div
                  initial={{ scale: 0 }}
                  whileInView={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  <Tag color="blue" className="section-tag" style={{ border: `1px solid ${COLORS.primary}`, color: COLORS.primary, background: 'transparent', padding: '6px 16px', borderRadius: 20 }}>
                    <BulbOutlined /> CAPACITÉS IA
                  </Tag>
                </motion.div>
                <Title level={2} style={{ color: COLORS.textPrimary, marginTop: 16, fontWeight: 800 }}>Une plateforme qui évolue avec vous</Title>
                <Paragraph type="secondary" style={{ color: COLORS.textMuted, fontSize: 18 }}>
                  Découvrez les fonctionnalités qui redéfinissent la gestion d'entreprise
                </Paragraph>
              </motion.div>
            </div>

            <Row gutter={[32, 32]} style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
              {mainFeatures.map((feature, index) => (
                <Col xs={24} sm={12} md={6} key={index}>
                  <motion.div
                    variants={ANIMATION_VARIANTS.scaleIn}
                    onHoverStart={() => setHoveredFeature(index)}
                    onHoverEnd={() => setHoveredFeature(null)}
                  >
                    <TiltCard>
                      <Card className={`feature-card ${hoveredFeature === index ? 'hovered' : ''}`} variant="borderless" hoverable style={{ background: COLORS.bgTertiary, borderRadius: 20, height: '100%', position: 'relative', overflow: 'hidden' }}>
                        {hoveredFeature === index && (
                          <motion.div
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              height: 3,
                              background: feature.gradient,
                            }}
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ duration: 0.3 }}
                          />
                        )}
                        <motion.div
                          className="feature-icon"
                          style={{ background: feature.gradient, width: 60, height: 60, borderRadius: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, marginBottom: 16, color: feature.iconColor }}
                          animate={hoveredFeature === index ? {
                            scale: 1.2,
                            rotate: 360,
                            boxShadow: `0 0 30px ${feature.color}`,
                          } : {}}
                          transition={{ duration: 0.5 }}
                        >
                          {feature.icon}
                        </motion.div>
                        <Title level={4} style={{ color: COLORS.textPrimary }}>{feature.title}</Title>
                        <Text type="secondary" style={{ color: COLORS.textMuted }}>{feature.description}</Text>
                        <AnimatePresence>
                          {hoveredFeature === index && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="feature-hover-content"
                            >
                              <Divider style={{ borderColor: COLORS.border }} />
                              <Button type="link" icon={<ArrowRightOutlined />} style={{ color: COLORS.primary }}>
                                En savoir plus
                              </Button>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </Card>
                    </TiltCard>
                  </motion.div>
                </Col>
              ))}
            </Row>
          </motion.section>

          {/* Modules Section */}
          <motion.section
            id="modules"
            className="modules-section"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={ANIMATION_VARIANTS.staggerContainer}
            style={{ background: COLORS.bgSecondary, padding: '120px 0', borderTop: `1px solid ${COLORS.border}` }}
          >
            <div className="section-header" style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto 48px', padding: '0 24px' }}>
              <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
                <Tag color="blue" className="section-tag" style={{ border: `1px solid ${COLORS.primary}`, color: COLORS.primary, background: 'transparent', padding: '4px 16px', borderRadius: 20, marginBottom: 16 }}>
                  <AppstoreOutlined /> ÉCOSYSTÈME
                </Tag>
                <Title level={2} style={{ color: COLORS.textPrimary, fontWeight: 800 }}>Une solution qui s'adapte à vos besoins</Title>
                <Paragraph type="secondary" style={{ color: COLORS.textMuted, fontSize: 18 }}>
                  Plus de 50 modules interconnectés pour une gestion d'entreprise sans couture
                </Paragraph>
              </motion.div>
            </div>

            <Tabs
              activeKey={activeModule.toString()}
              onChange={(key) => setActiveModule(parseInt(key))}
              className="modules-tabs"
              centered
              style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}
              items={[
                {
                  key: '0',
                  label: "Services Intégrés",
                  children: (
                    <Row gutter={[24, 24]}>
                      {modules.map((module, index) => (
                        <Col xs={24} sm={12} lg={8} key={index}>
                          <motion.div
                            variants={ANIMATION_VARIANTS.scaleIn}
                            whileHover={{ y: -10 }}
                          >
                            <GlowCard color={module.color}>
                              <Card
                                className="module-card"
                                hoverable
                                style={{ 
                                  borderTop: `3px solid ${module.color}`, 
                                  borderRadius: 20, 
                                  background: '#FFFFFF',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                }}
                              >
                                <motion.div
                                  className="module-icon"
                                  style={{ 
                                    background: module.iconBg, 
                                    width: 60, 
                                    height: 60, 
                                    borderRadius: 15, 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center', 
                                    marginBottom: 16, 
                                    fontSize: 28, 
                                    color: module.iconColor 
                                  }}
                                  whileHover={{ rotate: 10, scale: 1.1 }}
                                >
                                  {module.icon}
                                </motion.div>
                                
                                <div style={{ color: '#1A1A2E', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
                                  {module.title}
                                </div>
                                
                                <div style={{ color: '#334155', fontSize: 14, marginBottom: 16 }}>
                                  {module.description}
                                </div>

                                <div className="module-stats" style={{ marginBottom: 16 }}>
                                  <Space split={<Divider type="vertical" style={{ borderColor: '#E2E8F0' }} />}>
                                    {Object.entries(module.stats).map(([key, value]) => (
                                      <Tooltip title={key} key={key}>
                                        <span style={{ 
                                          background: `${module.color}15`, 
                                          color: module.color, 
                                          padding: '4px 12px',
                                          borderRadius: 20,
                                          fontSize: 12,
                                          fontWeight: 600
                                        }}>
                                          {value}
                                        </span>
                                      </Tooltip>
                                    ))}
                                  </Space>
                                </div>

                                <Divider style={{ borderColor: '#E2E8F0', margin: '16px 0' }} />

                                <div style={{ marginBottom: 16 }}>
                                  {module.features.map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                                      <CheckCircleOutlined style={{ color: module.color, fontSize: 14, marginRight: 12 }} />
                                      <span style={{ color: '#1E293B', fontSize: 13, fontWeight: 500 }}>{item}</span>
                                    </div>
                                  ))}
                                </div>

                                <Divider style={{ borderColor: '#E2E8F0', margin: '16px 0' }} />

                                <motion.div whileHover={{ x: 10 }}>
                                  <Button
                                    type="link"
                                    icon={<ArrowRightOutlined />}
                                    onClick={() => navigate(module.demoLink)}
                                    style={{ color: module.color, fontWeight: 600, padding: 0 }}
                                  >
                                    Voir la démo
                                  </Button>
                                </motion.div>
                              </Card>
                            </GlowCard>
                          </motion.div>
                        </Col>
                      ))}
                    </Row>
                  )
                }
              ]}
            />
          </motion.section>

          {/* Assistants IA Section */}
          <motion.section
            id="assistants"
            className="assistants-section"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={ANIMATION_VARIANTS.staggerContainer}
            style={{ background: COLORS.bgPrimary, padding: '80px 0', position: 'relative' }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${COLORS.primary}, transparent)` }} />

            <div className="section-header" style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto 48px', padding: '0 24px' }}>
              <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
                <Tag color="blue" className="section-tag" style={{ background: COLORS.gradientPrimary, color: COLORS.white, border: 'none', padding: '6px 16px', borderRadius: 20 }}>
                  <RobotOutlined /> Assistants IA
                </Tag>
                <Title level={2} style={{ color: COLORS.textPrimary }}>Des intelligences artificielles dédiées</Title>
                <Paragraph type="secondary" style={{ color: COLORS.textMuted, fontSize: 18 }}>
                  Quatre assistants spécialisés pour booster votre performance
                </Paragraph>
              </motion.div>
            </div>

            <Tabs
              activeKey={activeAssistant.toString()}
              onChange={(key) => setActiveAssistant(parseInt(key))}
              centered
              className="assistants-tabs"
              style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}
              items={assistants.map((assistant, index) => ({
                key: index.toString(),
                label: (
                  <Space>
                    <motion.span
                      style={{ color: assistant.color, fontSize: 20 }}
                      whileHover={{ scale: 1.2, rotate: 10 }}
                    >
                      {assistant.icon}
                    </motion.span>
                    <span style={{ color: '#1A1A2E', fontWeight: 600 }}>{assistant.title}</span>
                  </Space>
                ),
                children: (
                  <Row gutter={[48, 48]}>
                    <Col xs={24} md={12}>
                      <motion.div
                        className="assistant-content"
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, type: "spring" }}
                      >
                        <motion.div
                          className="assistant-icon-large"
                          style={{ background: assistant.gradient, width: 80, height: 80, borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, marginBottom: 24, color: '#FFFFFF' }}
                          whileHover={{ scale: 1.1, rotate: 5 }}
                        >
                          {assistant.icon}
                        </motion.div>
                        
                        <div style={{ color: '#1A1A2E', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
                          {assistant.title}
                        </div>
                        
                        <div style={{ color: '#475569', fontSize: 16, fontWeight: 500, marginBottom: 16 }}>
                          {assistant.subtitle}
                        </div>
                        
                        <div style={{ color: '#334155', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
                          {assistant.longDescription}
                        </div>

                        <div style={{ borderTop: '1px solid #E2E8F0', margin: '24px 0' }} />

                        <div style={{ color: '#1A1A2E', fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
                          <ThunderboltOutlined style={{ marginRight: 8, color: assistant.color }} /> Fonctionnalités clés
                        </div>
                        
                        <div style={{ marginBottom: 24 }}>
                          {assistant.features.map((item, idx) => (
                            <motion.div
                              key={idx}
                              whileHover={{ x: 5 }}
                              transition={{ duration: 0.2 }}
                              style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}
                            >
                              <CheckCircleOutlined style={{ color: assistant.color, fontSize: 14, marginRight: 12 }} />
                              <span style={{ color: '#1E293B', fontSize: 14 }}>{item}</span>
                            </motion.div>
                          ))}
                        </div>

                        <div style={{ borderTop: '1px solid #E2E8F0', margin: '24px 0' }} />

                        <div style={{ display: 'flex', gap: 32, marginBottom: 24 }}>
                          {Object.entries(assistant.stats).map(([key, value]) => (
                            <div key={key} style={{ flex: 1 }}>
                              <div style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                                {key}
                              </div>
                              <div style={{ color: assistant.color, fontSize: 28, fontWeight: 800 }}>
                                {value}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div style={{ borderTop: '1px solid #E2E8F0', margin: '24px 0' }} />

                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                              background: assistant.gradient,
                              border: 'none',
                              borderRadius: 12,
                              padding: '12px 24px',
                              color: '#FFFFFF',
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                            onClick={() => handleAssistantClick(assistant.path)}
                          >
                            <RocketOutlined /> Découvrir {assistant.title}
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            style={{
                              background: 'transparent',
                              border: `2px solid ${assistant.color}`,
                              borderRadius: 12,
                              padding: '12px 24px',
                              color: assistant.color,
                              fontWeight: 'bold',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <PlayCircleOutlined /> Voir la démo
                          </motion.button>
                        </div>
                      </motion.div>
                    </Col>
                    
                    <Col xs={24} md={12}>
                      <motion.div
                        className="assistant-capabilities"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
                      >
                        <div style={{ 
                          background: '#FFFFFF', 
                          borderRadius: 20, 
                          padding: 24,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          border: '1px solid #E2E8F0'
                        }}>
                          <div style={{ color: '#1A1A2E', fontSize: 18, fontWeight: 700, marginBottom: 20 }}>
                            <BarChartOutlined style={{ marginRight: 8, color: assistant.color }} /> Capacités de l'assistant
                          </div>
                          
                          {assistant.capabilities.map((cap, idx) => (
                            <div key={idx} style={{ marginBottom: 20 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                <span style={{ color: '#1E293B', fontWeight: 500 }}>{cap.name}</span>
                                <span style={{ color: assistant.color, fontWeight: 700 }}>{cap.value}%</span>
                              </div>
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: '100%' }}
                                transition={{ duration: 1, delay: idx * 0.2 }}
                              >
                                <div style={{ 
                                  height: 8, 
                                  background: '#E2E8F0', 
                                  borderRadius: 4, 
                                  overflow: 'hidden' 
                                }}>
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${cap.value}%` }}
                                    transition={{ duration: 1, delay: idx * 0.2 }}
                                    style={{ 
                                      height: '100%', 
                                      background: assistant.gradient,
                                      borderRadius: 4
                                    }}
                                  />
                                </div>
                              </motion.div>
                            </div>
                          ))}
                        </div>

                        <div style={{ 
                          marginTop: 24, 
                          background: '#FFFFFF', 
                          borderRadius: 20, 
                          padding: 24,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          border: '1px solid #E2E8F0',
                          textAlign: 'center'
                        }}>
                          <motion.div whileHover={{ scale: 1.05 }} style={{ padding: '8px' }}>
                            <div>
                              <div style={{ color: '#64748B', fontSize: 14, marginBottom: 8 }}>
                                <ClockCircleOutlined style={{ marginRight: 6 }} /> Temps de réponse moyen
                              </div>
                              <div style={{ color: assistant.color, fontSize: 36, fontWeight: 800 }}>
                                0.5<span style={{ fontSize: 18 }}>sec</span>
                              </div>
                            </div>
                            <div style={{ marginTop: 24 }}>
                              <div style={{ color: '#64748B', fontSize: 14, marginBottom: 8 }}>
                                <VerifiedOutlined style={{ marginRight: 6 }} /> Disponibilité
                              </div>
                              <div style={{ color: assistant.color, fontSize: 36, fontWeight: 800 }}>
                                99.9<span style={{ fontSize: 18 }}>%</span>
                              </div>
                            </div>
                          </motion.div>
                        </div>
                      </motion.div>
                    </Col>
                  </Row>
                )
              }))}
            />
          </motion.section>

          {/* Secteurs d'activité Section */}
          <motion.section
            className="sectors-section"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={ANIMATION_VARIANTS.staggerContainer}
            style={{ background: COLORS.bgSecondary, padding: '80px 0' }}
          >
            <div className="section-header" style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto 48px', padding: '0 24px' }}>
              <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
                <Tag color="blue" className="section-tag" style={{ background: COLORS.gradientPrimary, color: COLORS.white, border: 'none', padding: '6px 16px', borderRadius: 20 }}>
                  <BankOutlined /> Secteurs
                </Tag>
                <Title level={2} style={{ color: COLORS.textPrimary }}>Des solutions métier spécialisées</Title>
                <Paragraph type="secondary" style={{ fontSize: 18, color: COLORS.textMuted }}>
                  Nexum s'adapte aux exigences de votre secteur d'activité
                </Paragraph>
              </motion.div>
            </div>

            <Tabs
              activeKey={activeSector.toString()}
              onChange={(key) => setActiveSector(parseInt(key))}
              centered
              className="sectors-tabs"
              style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}
              items={sectors.map((sector, index) => ({
                key: index.toString(),
                label: (
                  <span style={{ color: activeSector === index ? sector.color : '#64748B', fontWeight: 500 }}>
                    {sector.title}
                  </span>
                ),
                children: (
                  <Row gutter={[32, 32]}>
                    <Col xs={24} md={12}>
                      <motion.div
                        className="sector-content"
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.5, type: "spring" }}
                      >
                        <motion.div
                          className="sector-icon-large"
                          style={{ 
                            background: sector.gradient, 
                            width: 80, 
                            height: 80, 
                            borderRadius: 20, 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontSize: 40, 
                            marginBottom: 24, 
                            color: '#FFFFFF' 
                          }}
                          whileHover={{ scale: 1.1, rotate: 10 }}
                        >
                          {sector.icon}
                        </motion.div>
                        
                        <div style={{ color: '#1A1A2E', fontSize: 28, fontWeight: 800, marginBottom: 12 }}>
                          {sector.title}
                        </div>
                        
                        <div style={{ color: '#475569', fontSize: 16, lineHeight: 1.5, marginBottom: 24 }}>
                          {sector.description}
                        </div>

                        <div style={{ marginBottom: 32 }}>
                          {sector.features.map((item, idx) => (
                            <motion.div 
                              key={idx} 
                              whileHover={{ x: 5 }}
                              style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}
                            >
                              <div style={{ 
                                width: 32, 
                                height: 32, 
                                background: `${sector.color}15`, 
                                borderRadius: 10, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                marginRight: 12
                              }}>
                                <div style={{ color: sector.color, fontSize: 16 }}>{item.icon}</div>
                              </div>
                              <span style={{ color: '#1E293B', fontSize: 14, fontWeight: 500 }}>{item.text}</span>
                            </motion.div>
                          ))}
                        </div>

                        <div style={{ borderTop: '1px solid #E2E8F0', margin: '24px 0' }} />

                        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                              Clients satisfaits
                            </div>
                            <div style={{ color: sector.color, fontSize: 32, fontWeight: 800 }}>
                              {sector.clients}<span style={{ fontSize: 18 }}>+</span>
                            </div>
                          </div>
                          <div>
                            <div style={{ color: '#64748B', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                              Performance
                            </div>
                            <div style={{ color: sector.color, fontSize: 32, fontWeight: 800 }}>
                              {sector.success}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </Col>
                    
                    <Col xs={24} md={12}>
                      <motion.div
                        className="sector-visual"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2, type: "spring" }}
                      >
                        <div style={{ 
                          background: '#FFFFFF', 
                          borderRadius: 20, 
                          padding: 40,
                          textAlign: 'center',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          border: '1px solid #E2E8F0'
                        }}>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                            style={{ fontSize: 100, color: sector.color, marginBottom: 24 }}
                          >
                            {sector.icon}
                          </motion.div>
                          
                          <div style={{ color: '#1A1A2E', fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
                            Expertise {sector.title}
                          </div>
                          
                          <div style={{ color: '#64748B', fontSize: 14, lineHeight: 1.5 }}>
                            Des solutions sur mesure pour votre secteur
                          </div>
                          
                          <div style={{ 
                            marginTop: 24, 
                            padding: '8px 16px', 
                            background: `${sector.color}10`, 
                            borderRadius: 30,
                            display: 'inline-block'
                          }}>
                            <span style={{ color: sector.color, fontSize: 13, fontWeight: 600 }}>
                              <SafetyCertificateOutlined style={{ marginRight: 6 }} />
                              Certification sectorielle
                            </span>
                          </div>
                        </div>

                        <div style={{ 
                          marginTop: 24, 
                          background: `linear-gradient(135deg, ${sector.color}10, #FFFFFF)`,
                          borderRadius: 20, 
                          padding: 24,
                          border: `1px solid ${sector.color}20`
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                            <div style={{ 
                              width: 40, 
                              height: 40, 
                              background: sector.gradient, 
                              borderRadius: 40, 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              color: '#FFFFFF'
                            }}>
                              <StarFilled style={{ fontSize: 18 }} />
                            </div>
                            <div>
                              <div style={{ color: '#1A1A2E', fontWeight: 700 }}>Taux de satisfaction</div>
                              <div style={{ color: sector.color, fontSize: 24, fontWeight: 800 }}>98%</div>
                            </div>
                          </div>
                          <div style={{ color: '#64748B', fontSize: 13, lineHeight: 1.5 }}>
                            "La solution Nexum a transformé notre gestion financière. Une fiabilité et une performance exceptionnelles."
                          </div>
                        </div>
                      </motion.div>
                    </Col>
                  </Row>
                )
              }))}
            />
          </motion.section>

          {/* Testimonials Section */}
          <motion.section
            className="testimonials-section"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={ANIMATION_VARIANTS.staggerContainer}
            style={{ background: COLORS.bgPrimary, padding: '80px 0' }}
          >
            <div className="section-header" style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto 48px', padding: '0 24px' }}>
              <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
                <Tag color="blue" className="section-tag" style={{ background: COLORS.gradientPrimary, color: COLORS.white, border: 'none', padding: '6px 16px', borderRadius: 20 }}>
                  <StarFilled /> Témoignages
                </Tag>
                <Title level={2} style={{ color: COLORS.textPrimary }}>Ils ont transformé leur entreprise avec Nexum</Title>
                <Paragraph type="secondary" style={{ color: COLORS.textMuted, fontSize: 18 }}>
                  Rejoignez plus de 1000 entreprises satisfaites
                </Paragraph>
              </motion.div>
            </div>

            <Carousel autoplay dots className="testimonials-carousel" autoplaySpeed={5000} style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
              {testimonials.map((testimonial, index) => (
                <div key={index}>
                  <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <TiltCard>
                      <Card className="testimonial-card" style={{ background: COLORS.bgTertiary, border: 'none', borderRadius: 20, margin: 20 }}>
                        <Row gutter={[32, 32]} align="middle">
                          <Col xs={24} md={8} className="testimonial-image-col" style={{ textAlign: 'center' }}>
                            <motion.div
                              whileHover={{ scale: 1.1 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Avatar src={testimonial.avatar} size={120} className="testimonial-avatar" style={{ border: `3px solid ${COLORS.primary}` }} />
                            </motion.div>
                            <div className="testimonial-metrics" style={{ marginTop: 16 }}>
                              <Tag color="blue" className="result-tag" style={{ background: `${COLORS.primary}20`, color: COLORS.primary, border: 'none', padding: '8px 16px', borderRadius: 20 }}>
                                <TrophyOutlined /> {testimonial.result}
                              </Tag>
                              <div style={{ marginTop: 8 }}>
                                <Text type="secondary" style={{ color: COLORS.textMuted }}>{testimonial.metric}</Text>
                              </div>
                            </div>
                          </Col>
                          <Col xs={24} md={16}>
                            <Rate disabled defaultValue={testimonial.rating} className="testimonial-rating" style={{ color: COLORS.accent }} />
                            <Paragraph className="testimonial-text" style={{ color: COLORS.textSecondary, fontSize: 18, lineHeight: 1.6, marginTop: 16 }}>
                              "{testimonial.content}"
                            </Paragraph>
                            <div className="testimonial-author" style={{ marginTop: 24 }}>
                              <div>
                                <Title level={4} style={{ color: COLORS.textPrimary, marginBottom: 4 }}>{testimonial.name}</Title>
                                <Text type="secondary" style={{ color: COLORS.textMuted }}>{testimonial.role}</Text>
                                <br />
                                <Text strong style={{ color: COLORS.primary }}>{testimonial.company}</Text>
                              </div>
                            </div>
                          </Col>
                        </Row>
                      </Card>
                    </TiltCard>
                  </motion.div>
                </div>
              ))}
            </Carousel>
          </motion.section>

          {/* FAQ Section */}
          <motion.section
            id="faq"
            className="faq-section"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={ANIMATION_VARIANTS.staggerContainer}
            style={{ background: COLORS.bgSecondary, padding: '80px 0' }}
          >
            <div className="section-header" style={{ textAlign: 'center', maxWidth: 800, margin: '0 auto 48px', padding: '0 24px' }}>
              <motion.div variants={ANIMATION_VARIANTS.fadeInUp}>
                <Tag color="blue" className="section-tag" style={{ background: COLORS.gradientPrimary, color: COLORS.white, border: 'none', padding: '6px 16px', borderRadius: 20 }}>
                  <QuestionCircleOutlined /> FAQ
                </Tag>
                <Title level={2} style={{ color: COLORS.textPrimary }}>Questions fréquentes</Title>
                <Paragraph type="secondary" style={{ fontSize: 18, color: COLORS.textMuted }}>
                  Tout ce que vous devez savoir sur Nexum
                </Paragraph>
              </motion.div>
            </div>

            <Row gutter={[48, 48]} style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
              <Col xs={24} lg={12}>
                <motion.div variants={ANIMATION_VARIANTS.slideInLeft}>
                  <Collapse
                    variant="borderless"
                    className="faq-collapse"
                    items={[
                      {
                        question: <><LinkOutlined /> Comment Nexum s'intègre-t-il à mes outils existants ?</>,
                        answer: 'Nexum propose des connecteurs natifs pour plus de 50 applications (Salesforce, Shopify, Magento, SAP, etc.) et une API REST complète pour des intégrations personnalisées. Notre équipe d\'experts vous accompagne dans toutes vos intégrations.'
                      },
                      {
                        question: <><LockOutlined /> Quel est le niveau de sécurité des données ?</>,
                        answer: 'Nous appliquons les plus hauts standards de sécurité : chiffrement AES-256, authentification 2FA obligatoire, audits de sécurité mensuels, hébergement en France certifié ISO 27001 et conformité RGPD complète.'
                      },
                      {
                        question: <><GiftOutlined /> Proposez-vous une période d'essai ?</>,
                        answer: 'Oui, vous bénéficiez de 30 jours d\'essai gratuit sans engagement, avec accès à toutes les fonctionnalités premium et l\'accompagnement personnalisé de notre équipe.'
                      },
                      {
                        question: <><SyncOutlined /> Comment se passe la migration depuis un autre ERP ?</>,
                        answer: 'Notre équipe vous accompagne pas à pas avec un plan de migration personnalisé, des outils d\'import automatisés, une validation à chaque étape et une garantie de zéro perte de données.'
                      }
                    ].map((item, index) => ({
                      key: String(index),
                      label: item.question,
                      className: 'faq-panel',
                      style: { background: COLORS.bgTertiary, borderRadius: 12, marginBottom: 16, border: 'none' },
                      children: <Text style={{ fontSize: 15, lineHeight: 1.6, color: COLORS.textSecondary }}>{item.answer}</Text>
                    }))}
                  />
                </motion.div>
              </Col>
              <Col xs={24} lg={12}>
                <motion.div
                  variants={ANIMATION_VARIANTS.slideInRight}
                  whileHover={{ y: -5 }}
                >
                  <Card className="faq-contact-card" style={{ background: COLORS.gradientPrimary, borderRadius: 20, textAlign: 'center', padding: '48px 24px' }}>
                    <motion.div
                      animate={{ y: [0, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <div className="faq-avatar" style={{ fontSize: 64, marginBottom: 24 }}>
                        <CustomerServiceOutlined style={{ color: COLORS.white }} />
                      </div>
                    </motion.div>
                    <Title level={4} style={{ color: COLORS.white }}>Vous avez d'autres questions ?</Title>
                    <Paragraph type="secondary" style={{ color: COLORS.whiteSmoke, marginTop: 16 }}>
                      Notre équipe d'experts est disponible pour vous répondre 24/7
                    </Paragraph>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      style={{
                        background: COLORS.white,
                        border: 'none',
                        borderRadius: 12,
                        padding: '12px 32px',
                        color: COLORS.primary,
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 8,
                        marginTop: 24,
                      }}
                      onClick={() => setContactModalVisible(true)}
                    >
                      <MailOutlined /> Contactez-nous
                    </motion.button>
                  </Card>
                </motion.div>
              </Col>
            </Row>
          </motion.section>

          {/* CTA Section */}
          <motion.section
            className="cta-section"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={ANIMATION_VARIANTS.fadeInUp}
            style={{ padding: '80px 0', background: COLORS.bgPrimary, position: 'relative' }}
          >
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${COLORS.primary}, transparent)` }} />

            <TiltCard>
              <Card className="cta-card" style={{ background: COLORS.gradientPrimary, borderRadius: 24, maxWidth: 1200, margin: '0 auto', padding: '48px', textAlign: 'center' }}>
                <Row gutter={[24, 24]} align="middle">
                  <Col xs={24} lg={16}>
                    <motion.div
                      initial={{ opacity: 0, x: -50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Title level={2} style={{ color: COLORS.white, marginBottom: 16 }}>
                        Prêt à propulser votre entreprise ?
                      </Title>
                      <Paragraph style={{ color: COLORS.whiteSmoke, fontSize: 18, marginBottom: 0 }}>
                        Rejoignez plus de 1000 entreprises qui ont déjà choisi Nexum pour leur transformation digitale
                      </Paragraph>
                    </motion.div>
                  </Col>
                  <Col xs={24} lg={8} className="cta-buttons">
                    <motion.div
                      initial={{ opacity: 0, x: 50 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Space direction="vertical" size="middle" className="cta-space" style={{ width: '100%' }}>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            background: COLORS.white,
                            border: 'none',
                            borderRadius: 12,
                            padding: '14px 32px',
                            color: COLORS.primary,
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            width: '100%',
                            fontSize: 16,
                          }}
                          onClick={() => setDemoModalVisible(true)}
                        >
                          <RocketOutlined /> Demander une démo
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          style={{
                            background: 'transparent',
                            border: `2px solid ${COLORS.white}`,
                            borderRadius: 12,
                            padding: '14px 32px',
                            color: COLORS.white,
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            width: '100%',
                            fontSize: 16,
                          }}
                          onClick={handleSignupClick}
                        >
                          <GiftOutlined /> Essai gratuit 30 jours
                        </motion.button>
                      </Space>
                    </motion.div>
                  </Col>
                </Row>
              </Card>
            </TiltCard>
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
          borderTop: `1px solid ${COLORS.border}`,
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Row gutter={[48, 48]}>
              <Col xs={24} sm={12} md={6}>
                <div style={{ marginBottom: '24px' }}>
                  <motion.div
                    style={{
                      fontSize: '32px',
                      fontWeight: 'bold',
                      marginBottom: '20px',
                      color: COLORS.textPrimary,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                    }}
                    whileHover={{ x: 5 }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                    >
                      <RocketOutlined style={{ color: COLORS.primary }} />
                    </motion.div>
                    <span>Nexum</span>
                  </motion.div>
                  <p style={{
                    color: COLORS.textMuted,
                    marginBottom: '24px',
                    lineHeight: '1.6',
                    fontSize: '14px'
                  }}>
                    La solution ERP intelligente qui propulse votre entreprise vers la réussite.
                  </p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    {[
                      { icon: <FacebookOutlined />, color: '#1877F2' },
                      { icon: <TwitterOutlined />, color: '#1DA1F2' },
                      { icon: <LinkedinOutlined />, color: '#0A66C2' },
                      { icon: <InstagramOutlined />, color: '#E4405F' },
                    ].map((social, idx) => (
                      <motion.div
                        key={idx}
                        whileHover={{ scale: 1.1, y: -3 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button
                          type="link"
                          icon={social.icon}
                          style={{
                            color: COLORS.textMuted,
                            fontSize: '20px',
                            background: 'rgba(255, 255, 255, 0.05)',
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: 0,
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.color = social.color}
                          onMouseLeave={(e) => e.currentTarget.style.color = COLORS.textMuted}
                        />
                      </motion.div>
                    ))}
                  </div>
                </div>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <div>
                  <h4 style={{
                    color: COLORS.textPrimary,
                    fontSize: '18px',
                    marginBottom: '20px',
                    paddingBottom: '10px',
                    borderBottom: `2px solid ${COLORS.primary}`,
                    display: 'inline-block'
                  }}>
                    <AppstoreOutlined /> Produit
                  </h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginTop: 20 }}>
                    {['Fonctionnalités', 'Assistants IA', 'Témoignages', 'FAQ', 'Support'].map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '12px' }}>
                        <motion.div whileHover={{ x: 5 }}>
                          <Button
                            type="link"
                            style={{
                              color: COLORS.textMuted,
                              padding: 0,
                              height: 'auto',
                              fontSize: '14px',
                              textAlign: 'left'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = COLORS.primary}
                            onMouseLeave={(e) => e.currentTarget.style.color = COLORS.textMuted}
                          >
                            {item}
                          </Button>
                        </motion.div>
                      </li>
                    ))}
                  </ul>
                </div>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <div>
                  <h4 style={{
                    color: COLORS.textPrimary,
                    fontSize: '18px',
                    marginBottom: '20px',
                    paddingBottom: '10px',
                    borderBottom: `2px solid ${COLORS.primary}`,
                    display: 'inline-block'
                  }}>
                    <GlobalOutlined /> Entreprise
                  </h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginTop: 20 }}>
                    {['À propos', 'Blog', 'Carrières', 'Partenaires'].map((item, idx) => (
                      <li key={idx} style={{ marginBottom: '12px' }}>
                        <motion.div whileHover={{ x: 5 }}>
                          <Button
                            type="link"
                            style={{
                              color: COLORS.textMuted,
                              padding: 0,
                              height: 'auto',
                              fontSize: '14px'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.color = COLORS.primary}
                            onMouseLeave={(e) => e.currentTarget.style.color = COLORS.textMuted}
                          >
                            {item}
                          </Button>
                        </motion.div>
                      </li>
                    ))}
                  </ul>
                </div>
              </Col>

              <Col xs={24} sm={12} md={6}>
                <div>
                  <h4 style={{
                    color: COLORS.textPrimary,
                    fontSize: '18px',
                    marginBottom: '20px',
                    paddingBottom: '10px',
                    borderBottom: `2px solid ${COLORS.primary}`,
                    display: 'inline-block'
                  }}>
                    <CustomerServiceOutlined /> Contact
                  </h4>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, marginTop: 20 }}>
                    <motion.li whileHover={{ x: 5 }} style={{
                      color: COLORS.textMuted,
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <MailOutlined style={{ color: COLORS.primary }} />
                      <span>contact@nexum.com</span>
                    </motion.li>
                    <motion.li whileHover={{ x: 5 }} style={{
                      color: COLORS.textMuted,
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <PhoneOutlined style={{ color: COLORS.primary }} />
                      <span>+33 1 86 26 27 28</span>
                    </motion.li>
                    <motion.li whileHover={{ x: 5 }} style={{
                      color: COLORS.textMuted,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <EnvironmentOutlined style={{ color: COLORS.primary }} />
                      <span>123 Rue de l'Innovation, 75001 Paris</span>
                    </motion.li>
                  </ul>
                </div>
              </Col>
            </Row>

            <Divider style={{
              margin: '48px 0 24px',
              borderColor: COLORS.border,
              backgroundColor: 'transparent'
            }} />

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <span style={{ color: COLORS.textMuted, fontSize: '13px' }}>
                © 2026 Nexum. Tous droits réservés.
              </span>
              <div style={{ display: 'flex', gap: '24px' }}>
                {['Mentions légales', 'Politique de confidentialité', 'CGU'].map((item, idx) => (
                  <motion.div key={idx} whileHover={{ y: -2 }}>
                    <Button
                      type="link"
                      style={{ color: COLORS.textMuted, fontSize: '13px', padding: 0 }}
                      onMouseEnter={(e) => e.currentTarget.style.color = COLORS.primary}
                      onMouseLeave={(e) => e.currentTarget.style.color = COLORS.textMuted}
                    >
                      {item}
                    </Button>
                  </motion.div>
                ))}
              </div>
              <motion.div whileHover={{ scale: 1.1 }}>
                <Button
                  type="link"
                  icon={<ShareAltOutlined />}
                  onClick={handleShareClick}
                  style={{ color: COLORS.textMuted }}
                >
                  Partager
                </Button>
              </motion.div>
            </div>
          </div>
        </Footer>

        {/* Assistant IA */}
        <div className="assistant-container">
          <motion.div
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <FloatButton
              icon={<RobotOutlined />}
              type="primary"
              style={{
                right: 24,
                bottom: 24,
                width: 60,
                height: 60,
                background: COLORS.gradientPrimary,
              }}
              badge={{ count: assistantOpen ? 0 : 1, color: '#52c41a' }}
              onClick={() => {
                setAssistantOpen(!assistantOpen);
                if (!assistantOpen) {
                  confetti({
                    particleCount: 50,
                    spread: 50,
                    origin: { y: 0.9 },
                    colors: [COLORS.primary, COLORS.secondary],
                  });
                }
              }}
              tooltip="Posez votre question à Nexy"
            />
          </motion.div>

          <AnimatePresence>
            {assistantOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                transition={{ duration: 0.3, type: "spring" }}
              >
                <Card
                  className="assistant-chat-window"
                  style={{
                    position: 'fixed',
                    right: 24,
                    bottom: 100,
                    width: 400,
                    height: 600,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                    borderRadius: 24,
                    zIndex: 1000,
                    overflow: 'hidden',
                    background: COLORS.bgTertiary,
                    border: `1px solid ${COLORS.border}`,
                  }}
                  bodyStyle={{ padding: 0 }}
                >
                  <div style={{
                    background: COLORS.gradientPrimary,
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    position: 'relative'
                  }}>
                    <div className="assistant-avatar-container" style={{ position: 'relative' }}>
                      <motion.div
                        animate={{
                          scale: avatarAnimation === 'talking' ? [1, 1.1, 1] : 1,
                          rotate: avatarAnimation === 'talking' ? [0, 10, -10, 0] : 0
                        }}
                        transition={{ duration: 0.5, repeat: avatarAnimation === 'talking' ? 2 : 0 }}
                      >
                        <Avatar
                          size={48}
                          icon={<RobotFilled />}
                          style={{
                            background: COLORS.white,
                            color: COLORS.primary,
                            border: '3px solid rgba(255,255,255,0.3)',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                          }}
                        />
                      </motion.div>

                      <motion.div
                        style={{
                          position: 'absolute',
                          bottom: 2,
                          right: 2,
                          width: 14,
                          height: 14,
                          background: '#52c41a',
                          borderRadius: '50%',
                          border: `2px solid ${COLORS.white}`
                        }}
                        animate={{
                          scale: [1, 1.3, 1],
                        }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 'bold', color: COLORS.white, fontSize: 16 }}>Nexy</div>
                      <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.9)' }}>
                        <Badge status="processing" text="En ligne" style={{ color: COLORS.white }} />
                      </div>
                    </div>

                    <Button
                      type="text"
                      icon={<CloseOutlined />}
                      onClick={() => setAssistantOpen(false)}
                      style={{ color: COLORS.white }}
                    />
                  </div>

                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                    background: COLORS.bgPrimary
                  }}>
                    {assistantMessages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.3 }}
                        style={{
                          display: 'flex',
                          justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
                          marginBottom: 8
                        }}
                      >
                        {msg.type === 'bot' && (
                          <Avatar
                            size={32}
                            icon={<RobotFilled />}
                            style={{
                              marginRight: 8,
                              background: COLORS.primary,
                              color: COLORS.white,
                            }}
                          />
                        )}
                        <motion.div
                          style={{
                            maxWidth: '75%',
                            padding: '10px 14px',
                            borderRadius: msg.type === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            background: msg.type === 'user' ? COLORS.gradientPrimary : COLORS.bgTertiary,
                            color: msg.type === 'user' ? COLORS.white : COLORS.textPrimary,
                            wordWrap: 'break-word',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                          }}
                          whileHover={{ scale: 1.02 }}
                        >
                          <div style={{ whiteSpace: 'pre-wrap', fontSize: 14, lineHeight: 1.5 }}>
                            {msg.text}
                          </div>
                          <div style={{
                            fontSize: 10,
                            marginTop: 6,
                            opacity: 0.6,
                            textAlign: 'right',
                            color: msg.type === 'user' ? 'rgba(255,255,255,0.8)' : COLORS.textMuted
                          }}>
                            {msg.time}
                          </div>
                        </motion.div>
                        {msg.type === 'user' && (
                          <Avatar
                            icon={<UserOutlined />}
                            size={32}
                            style={{
                              backgroundColor: COLORS.secondary,
                              marginLeft: 8,
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              color: COLORS.white
                            }}
                          />
                        )}
                      </motion.div>
                    ))}

                    {assistantTyping && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}
                      >
                        <Avatar
                          size={32}
                          icon={<RobotFilled />}
                          style={{ marginRight: 8, background: COLORS.primary }}
                        />
                        <div style={{
                          padding: '12px 16px',
                          borderRadius: 18,
                          background: COLORS.bgTertiary,
                          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                        }}>
                          <TypingIndicator />
                        </div>
                      </motion.div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  <div style={{
                    padding: '12px 16px',
                    borderTop: `1px solid ${COLORS.border}`,
                    background: COLORS.bgTertiary
                  }}>
                    <Text type="secondary" style={{ fontSize: 11, color: COLORS.textMuted }}><BulbOutlined /> Suggestions :</Text>
                    <Space wrap size={[8, 8]} style={{ marginTop: 8 }}>
                      {[
                        { text: 'Présentez Nexum', icon: <RocketOutlined /> },
                        { text: 'Modules disponibles', icon: <AppstoreOutlined /> },
                        { text: 'Demander une démo', icon: <PlayCircleOutlined /> },
                        { text: 'Tarifs', icon: <WalletOutlined /> },
                        { text: 'Sécurité', icon: <LockOutlined /> }
                      ].map((sugg, idx) => (
                        <motion.div
                          key={idx}
                          whileHover={{ scale: 1.05, y: -2 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          <Tag
                            color="blue"
                            style={{
                              cursor: 'pointer',
                              margin: 0,
                              padding: '6px 14px',
                              borderRadius: 20,
                              transition: 'all 0.2s',
                              background: `${COLORS.primary}15`,
                              borderColor: COLORS.primary,
                              color: COLORS.primary,
                            }}
                            onClick={() => handleSuggestionClick(sugg.text)}
                          >
                            {sugg.icon} {sugg.text}
                          </Tag>
                        </motion.div>
                      ))}
                    </Space>
                  </div>

                  <div style={{
                    display: 'flex',
                    gap: 8,
                    padding: '12px 16px',
                    borderTop: `1px solid ${COLORS.border}`,
                    background: COLORS.bgTertiary
                  }}>
                    <Input
                      placeholder="Posez votre question..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onPressEnter={handleSendMessage}
                      size="middle"
                      style={{
                        borderRadius: 24,
                        background: COLORS.bgPrimary,
                        border: `1px solid ${COLORS.border}`,
                        padding: '8px 16px',
                        color: COLORS.textPrimary,
                      }}
                    />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        border: 'none',
                        background: COLORS.gradientPrimary,
                        color: COLORS.white,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      onClick={handleSendMessage}
                    >
                      <SendOutlined />
                    </motion.button>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Contact Modal */}
        <Modal
          title={
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>
              <MailOutlined /> Contactez-nous
            </div>
          }
          open={contactModalVisible}
          onCancel={() => setContactModalVisible(false)}
          footer={null}
          className="modern-modal"
          style={{ borderRadius: 20 }}
        >
          <Form layout="vertical" onFinish={handleContactSubmit}>
            <Form.Item
              name="name"
              label="Nom complet"
              rules={[{ required: true, message: 'Veuillez entrer votre nom' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Jean Dupont" size="large" style={{ borderRadius: 12 }} />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email professionnel"
              rules={[
                { required: true, message: 'Veuillez entrer votre email' },
                { type: 'email', message: 'Email invalide' }
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="jean.dupont@entreprise.com" size="large" style={{ borderRadius: 12 }} />
            </Form.Item>
            <Form.Item
              name="company"
              label="Entreprise"
            >
              <Input prefix={<BankOutlined />} placeholder="Nexum SAS" size="large" style={{ borderRadius: 12 }} />
            </Form.Item>
            <Form.Item
              name="message"
              label="Message"
              rules={[{ required: true, message: 'Veuillez entrer votre message' }]}
            >
              <Input.TextArea rows={4} placeholder="Parlez-nous de votre projet..." size="large" style={{ borderRadius: 12 }} />
            </Form.Item>
            <Form.Item>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                style={{
                  width: '100%',
                  background: COLORS.gradientPrimary,
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px',
                  color: COLORS.white,
                  fontWeight: 'bold',
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                Envoyer le message
              </motion.button>
            </Form.Item>
          </Form>
        </Modal>

        {/* Demo Modal */}
        <Modal
          title={
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>
              <PlayCircleOutlined /> Demander une démo personnalisée
            </div>
          }
          open={demoModalVisible}
          onCancel={() => setDemoModalVisible(false)}
          footer={null}
          className="modern-modal"
          style={{ borderRadius: 20 }}
        >
          <Form layout="vertical" onFinish={handleDemoSubmit}>
            <Form.Item
              name="name"
              label="Nom complet"
              rules={[{ required: true, message: 'Veuillez entrer votre nom' }]}
            >
              <Input prefix={<UserOutlined />} placeholder="Jean Dupont" size="large" style={{ borderRadius: 12 }} />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email professionnel"
              rules={[
                { required: true, message: 'Veuillez entrer votre email' },
                { type: 'email', message: 'Email invalide' }
              ]}
            >
              <Input prefix={<MailOutlined />} placeholder="jean.dupont@entreprise.com" size="large" style={{ borderRadius: 12 }} />
            </Form.Item>
            <Form.Item
              name="company"
              label="Entreprise"
              rules={[{ required: true, message: 'Veuillez entrer le nom de votre entreprise' }]}
            >
              <Input prefix={<BankOutlined />} placeholder="Nexum SAS" size="large" style={{ borderRadius: 12 }} />
            </Form.Item>
            <Form.Item
              name="size"
              label="Taille de l'entreprise"
            >
              <Select placeholder="Sélectionnez" size="large" style={{ borderRadius: 12 }}>
                <Option value="1-10"><RocketOutlined /> Startup (1-10 employés)</Option>
                <Option value="11-50"><ArrowUpOutlined /> PME (11-50 employés)</Option>
                <Option value="51-200"><BankOutlined /> ETI (51-200 employés)</Option>
                <Option value="201-500"><GlobalOutlined /> Grande entreprise (201-500 employés)</Option>
                <Option value="500+"><CrownOutlined /> Groupe (500+ employés)</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="phone"
              label="Téléphone"
            >
              <Input prefix={<PhoneOutlined />} placeholder="+33 6 12 34 56 78" size="large" style={{ borderRadius: 12 }} />
            </Form.Item>
            <Form.Item>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                style={{
                  width: '100%',
                  background: COLORS.gradientPrimary,
                  border: 'none',
                  borderRadius: 12,
                  padding: '12px',
                  color: COLORS.white,
                  fontWeight: 'bold',
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                Programmer une démo
              </motion.button>
            </Form.Item>
          </Form>
        </Modal>
      </Layout>
    </ConfigProvider>
  );
};

export default Home;