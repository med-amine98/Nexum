// ModelsCatalog.jsx - Version corrigée avec mise à jour du localStorage
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../services/auth';
import { useModules } from '../../context/ModuleContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Card, Row, Col, Input, Tag, Space, Typography, 
  Button, Select, Badge, Tooltip, Empty, Spin,
  Modal, message, Divider, Avatar, Statistic,
  Progress, Segmented, Descriptions,
  List, Flex, ConfigProvider
} from 'antd';
import { 
  AppstoreOutlined, BankOutlined, InsuranceOutlined, 
  ApartmentOutlined, SearchOutlined, PlusOutlined,
  EyeOutlined, StarOutlined, StarFilled,
  ThunderboltOutlined, DatabaseOutlined, CloudOutlined,
  SafetyCertificateOutlined, RocketOutlined,
  FundOutlined, ShopOutlined, TeamOutlined, GlobalOutlined,
  FileTextOutlined, SettingOutlined, FilterOutlined,
  SortAscendingOutlined, SortDescendingOutlined,
  BookOutlined, ApiOutlined, UnorderedListOutlined,
  CheckCircleOutlined,
  WarningOutlined, WalletOutlined,
  RobotFilled, FundFilled, SafetyCertificateFilled,
  DashboardOutlined, ShoppingOutlined, ShoppingCartOutlined, 
  UserOutlined, ProjectOutlined, ScanOutlined,
  RobotOutlined, BulbOutlined, AlertOutlined,
  NodeIndexOutlined, RiseOutlined, FallOutlined,
  EuroOutlined, LineChartOutlined,
  CustomerServiceOutlined, CameraOutlined,
  ClockCircleOutlined, DollarOutlined, MedicineBoxOutlined,
  PhoneOutlined,
  CrownOutlined, FireOutlined, CarOutlined,
  LayoutOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import api from '../../services/api';
import './ModelsCatalog.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const ANIMATION_VARIANTS = {
  fadeInUp: {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  },
  scaleIn: {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.4, type: "spring", stiffness: 200 } }
  }
};

const ModelsCatalog = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryParams = new URLSearchParams(location.search);
  const initialCategory = queryParams.get('category') || 'all';

  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('popularity');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('grid');
  const [selectedModel, setSelectedModel] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [activating, setActivating] = useState(false);

  const { installedModules, customModules, fetchInstalledModules, fetchCustomModules, addCustomModule, showModule } = useModules();

  // Vérifier si un module est installé
  const isModuleActive = (moduleKey) => {
    return installedModules?.includes(moduleKey) || customModules?.includes(moduleKey);
  };

  // Fonction pour restaurer un module dans le sidebar (le retirer des supprimés)
  const restoreModuleInSidebar = (moduleKey) => {
    const userId = user?.id || 'anonymous';
    const storageKey = `deleted_modules_${userId}`;
    const saved = localStorage.getItem(storageKey);
    
    if (saved) {
      try {
        let deletedModules = JSON.parse(saved);
        // Retirer le module de la liste des supprimés
        deletedModules = deletedModules.filter(k => k !== moduleKey);
        localStorage.setItem(storageKey, JSON.stringify(deletedModules));
      } catch (e) {
        console.error('Erreur lors de la restauration:', e);
      }
    }
    
    // Dispatch événements pour rafraîchir le sidebar
    window.dispatchEvent(new CustomEvent('moduleAdded', { detail: { moduleKey } }));
    // window.dispatchEvent(new Event('modulesChanged'));
  };

  // Fonction pour mettre à jour les modules installés dans le localStorage du Sidebar
  const updateSidebarModules = () => {
    // Rafraîchir les contextes
    if (fetchInstalledModules) fetchInstalledModules();
    if (fetchCustomModules) fetchCustomModules();
  };

  useEffect(() => {
    const savedFavorites = localStorage.getItem('modelFavorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
    
    const categoryFromUrl = queryParams.get('category');
    if (categoryFromUrl) {
      setSelectedCategory(categoryFromUrl);
    }
    
    setTimeout(() => setLoading(false), 800);
  }, [location.search]);

  useEffect(() => {
    localStorage.setItem('modelFavorites', JSON.stringify(favorites));
  }, [favorites]);

  // ============================================
  // TOUS LES MODÈLES
  // ============================================

  const allModels = [
    // Core Business (8 modèles)
    { key: 'enterprise-dashboard', icon: <DashboardOutlined />, label: 'Tableau de bord', description: "Vue d'ensemble de l'activité avec indicateurs clés", category: 'Core Business', sector: 'enterprise', color: '#3b82f6', usage: 95, tags: ['Dashboard', 'Analytics'] },
    { key: 'sale', icon: <ShoppingOutlined />, label: 'Ventes', description: 'Gestion complète des ventes et commandes', category: 'Core Business', sector: 'enterprise', color: '#10b981', usage: 92, tags: ['Commercial'] },
    { key: 'purchase', icon: <ShoppingCartOutlined />, label: 'Achats', description: 'Gestion des achats et approvisionnements', category: 'Core Business', sector: 'enterprise', color: '#10b981', usage: 78, tags: ['Achats'] },
    { key: 'crm', icon: <TeamOutlined />, label: 'CRM', description: 'Gestion de la relation client', category: 'Core Business', sector: 'enterprise', color: '#475569', usage: 88, tags: ['CRM'] },
    { key: 'account', icon: <WalletOutlined />, label: 'Comptabilité', description: 'Gestion comptable et financière', category: 'Core Business', sector: 'enterprise', color: '#06b6d4', usage: 85, tags: ['Finance'] },
    { key: 'stock', icon: <DatabaseOutlined />, label: 'Stock', description: 'Gestion des stocks et inventaires', category: 'Core Business', sector: 'enterprise', color: '#fbbf24', usage: 82, tags: ['Logistique'] },
    { key: 'hr', icon: <UserOutlined />, label: 'RH', description: 'Gestion des ressources humaines', category: 'Core Business', sector: 'enterprise', color: '#ec4899', usage: 76, tags: ['RH'] },
    { key: 'project', icon: <ProjectOutlined />, label: 'Projets', description: 'Gestion de projets et tâches', category: 'Core Business', sector: 'enterprise', color: '#3b82f6', usage: 71, tags: ['Projets'] },

    // IA Générative (2 modèles)
    { key: 'ai-report-generator', icon: <FileTextOutlined />, label: 'Génération Auto de Rapports IA', description: "Créez des rapports complexes en langage naturel", category: 'IA Générative', sector: 'all', color: '#667eea', badge: 'IA', usage: 97, tags: ['IA', 'Rapports'] },
    { key: 'ai-quote-generator', icon: <DollarOutlined />, label: 'Génération Auto de Devis IA', description: 'Générez des devis professionnels instantanément', category: 'IA Générative', sector: 'all', color: '#52c41a', badge: 'IA', usage: 98, tags: ['IA', 'Devis'] },

    // Support IA (2 modèles)
    { key: 'ticket-auto-resolve', icon: <CustomerServiceOutlined />, label: 'Ticket Support Auto-Résolu', description: 'Résolution intelligente des tickets support', category: 'Support IA', sector: 'all', color: '#1890ff', badge: 'RAG', usage: 96, tags: ['Support'] },
    { key: 'call-analysis', icon: <PhoneOutlined />, label: 'Analyse des Appels Clients', description: "Extraction d'insights des conversations téléphoniques", category: 'Support IA', sector: 'all', color: '#722ed1', badge: 'Speech', usage: 94, tags: ['Speech-to-Text'] },

    // Assurance IA (6 modèles)
    { key: 'claim-auto-declaration', icon: <CameraOutlined />, label: 'Déclaration Sinistre Automatisée', description: 'Déclarez un sinistre en 30 secondes par IA', category: 'Assurance IA', sector: 'insurance', color: '#fa8c16', badge: 'Computer Vision', usage: 97, tags: ['IA', 'Sinistres'] },
    { key: 'damage-auto-estimation', icon: <EuroOutlined />, label: 'Estimation Auto des Dommages', description: 'Estimation immédiate des dégâts', category: 'Assurance IA', sector: 'insurance', color: '#52c41a', badge: 'Deep Learning', usage: 96, tags: ['IA'] },
    { key: 'fraud-detection-insurance', icon: <SafetyCertificateFilled />, label: 'Détection Fraude Assurance', description: "Détection des fraudes à l'assurance", category: 'Assurance IA', sector: 'insurance', color: '#f5222d', badge: 'Anti-fraude', usage: 96, tags: ['Fraude'] },
    { key: 'catastrophe-modeling', icon: <WarningOutlined />, label: 'Modélisation Catastrophes', description: 'Modélisation des risques climatiques', category: 'Assurance IA', sector: 'insurance', color: '#fa8c16', usage: 76, tags: ['Catastrophe'] },
    { key: 'medical-assistant', icon: <MedicineBoxOutlined />, label: 'Assistant Médical Virtuel', description: 'Aide aux démarches médicales par IA', category: 'Assurance IA', sector: 'insurance', color: '#2f54eb', usage: 91, tags: ['Médical'] },
    { key: 'risk-scoring-insurance', icon: <FundOutlined />, label: 'Scoring des Risques', description: 'Évaluation des risques pour la tarification', category: 'Assurance IA', sector: 'insurance', color: '#eb2f96', usage: 93, tags: ['Scoring'] },

    // Banque (6 modèles)
    { key: 'credit-scoring', icon: <FundFilled />, label: 'Credit Scoring IA', description: 'Évaluation automatisée de la solvabilité', category: 'Banque', sector: 'bank', color: '#1890ff', badge: 'IA', usage: 96, tags: ['Scoring'] },
    { key: 'fraud-detection-banking', icon: <SafetyCertificateFilled />, label: 'Détection Fraude Bancaire', description: 'Détection en temps réel des fraudes', category: 'Banque', sector: 'bank', color: '#f5222d', badge: 'Temps réel', usage: 98, tags: ['Fraude'] },
    { key: 'kyc-automation', icon: <ScanOutlined />, label: 'KYC Automatisé', description: "Vérification d'identité automatisée", category: 'Banque', sector: 'bank', color: '#52c41a', badge: 'Nouveau', usage: 97, tags: ['KYC'] },
    { key: 'aml-compliance', icon: <SafetyCertificateOutlined />, label: 'AML Compliance', description: 'Anti-blanchiment et conformité', category: 'Banque', sector: 'bank', color: '#722ed1', usage: 94, tags: ['AML'] },
    { key: 'churn-prediction-banking', icon: <FallOutlined />, label: 'Prédiction Attrition', description: 'Prédiction des départs clients', category: 'Banque', sector: 'bank', color: '#ff4d4f', usage: 91, tags: ['Churn'] },
    
    // Assurance Pro (5 modèles)
    { key: 'claims-processing', icon: <FileTextOutlined />, label: 'Traitement des Sinistres', description: 'Automatisation du traitement des sinistres', category: 'Assurance Pro', sector: 'insurance', color: '#fa8c16', usage: 95, tags: ['Sinistres'] },
    { key: 'claim-real-time-tracking', icon: <ClockCircleOutlined />, label: 'Suivi Sinistre Temps Réel', description: 'Timeline interactive des sinistres', category: 'Assurance Pro', sector: 'insurance', color: '#13c2c2', usage: 95, tags: ['Suivi'] },
    { key: 'coverage-recommendation', icon: <SafetyCertificateOutlined />, label: 'Recommandation Garanties', description: 'Upsell intelligent de garanties', category: 'Assurance Pro', sector: 'insurance', color: '#eb2f96', usage: 93, tags: ['Garanties'] },
    { key: 'loss-prevention', icon: <WarningOutlined />, label: 'Prévention des Sinistres', description: 'Conseils proactifs de prévention', category: 'Assurance Pro', sector: 'insurance', color: '#ff4d4f', usage: 88, tags: ['Prévention'] },
    { key: 'document-intelligence', icon: <BookOutlined />, label: 'Intelligence Documentaire', description: 'Extraction automatique de documents', category: 'Assurance Pro', sector: 'insurance', color: '#8c8c8c', usage: 99, tags: ['OCR'] },

    // Entreprise IA (2 modèles)
    { key: 'omnichannel-portal', icon: <GlobalOutlined />, label: 'Portail Client Omnicanal', description: 'Expérience client unifiée multi-canaux', category: 'Entreprise IA', sector: 'enterprise', color: '#722ed1', usage: 98, tags: ['Omnicanal'] },
    { key: 'robo-advisor', icon: <RobotFilled />, label: 'Conseiller Financier Automatisé', description: 'Robo-advisor pour optimisation financière', category: 'Entreprise IA', sector: 'enterprise', color: '#1890ff', usage: 94, tags: ['Robo-advisor'] },

    // Dashboards (3 modèles)
    { key: 'banking-dashboard', icon: <BankOutlined />, label: 'Dashboard Banque', description: 'Tableau de bord bancaire intelligent', category: 'Dashboards', sector: 'bank', color: '#1890ff', usage: 97, tags: ['Banque'] },
    { key: 'insurance-dashboard', icon: <InsuranceOutlined />, label: 'Dashboard Assurance', description: 'Dashboard spécialisé pour les assurances', category: 'Dashboards', sector: 'insurance', color: '#52c41a', usage: 96, tags: ['Assurance'] },
    { key: 'enterprise-dashboard', icon: <ApartmentOutlined />, label: 'Dashboard Entreprise', description: 'Tableau de bord complet pour entreprises', category: 'Dashboards', sector: 'enterprise', color: '#722ed1', usage: 99, tags: ['Entreprise'] },

    // Modules transversaux (7 modèles)
    { key: 'smart-dashboard', icon: <LayoutOutlined />, label: 'Smart Dashboard', description: 'Dashboard personnalisable avec widgets', category: 'Modules Transversaux', sector: 'all', color: '#3b82f6', badge: 'NEW', usage: 85, tags: ['Dashboard', 'Personnalisable'] },
    { key: 'nexy-ai', icon: <RobotOutlined />, label: 'Nexy AI 3D', description: 'Assistant vocal 3D immersif et intelligent', category: 'Modules Transversaux', sector: 'all', color: '#475569', badge: '3D', usage: 99, tags: ['3D', 'Vocal', 'IA'] },
    { key: 'kanban', icon: <ProjectOutlined />, label: 'Kanban', description: 'Gestion de tâches en mode tableau', category: 'Modules Transversaux', sector: 'all', color: '#52c41a', usage: 78, tags: ['Tâches', 'Projets'] },
    { key: 'ocr', icon: <ScanOutlined />, label: 'OCR', description: 'Reconnaissance de documents', category: 'Modules Transversaux', sector: 'all', color: '#8c8c8c', usage: 75, tags: ['OCR', 'Documents'] },
    { key: 'document-intelligence', icon: <BookOutlined />, label: 'Doc Intelligence', description: 'Analyse OCR intelligente', category: 'Modules Transversaux', sector: 'all', color: '#667eea', badge: 'IA', usage: 88, tags: ['IA', 'OCR'] },

    // Assistants IA (3 modèles)
    { key: 'assistant-predict', icon: <RobotFilled />, label: 'Assistant Prédictif', description: 'Assistant IA spécialisé dans les prédictions', category: 'Assistants IA', sector: 'all', color: '#667eea', usage: 85, tags: ['Prédictions'] },
    { key: 'assistant-risk', icon: <SafetyCertificateFilled />, label: 'Assistant Risques', description: "Assistant IA pour l'analyse des risques", category: 'Assistants IA', sector: 'all', color: '#f5222d', usage: 82, tags: ['Risques'] },
    { key: 'assistant-growth', icon: <RiseOutlined />, label: 'Assistant Croissance', description: 'Assistant IA pour la stratégie commerciale', category: 'Assistants IA', sector: 'all', color: '#52c41a', usage: 88, tags: ['Croissance'] },

    // Technologies (2 modèles)
    { key: 'performance-monitor', icon: <ThunderboltOutlined />, label: 'Performance Monitor', description: 'Monitoring des performances système', category: 'Technologies', sector: 'all', color: '#1890ff', usage: 93, tags: ['Monitoring'] },
    { key: 'blockchain', icon: <NodeIndexOutlined />, label: 'Blockchain', description: 'Traçabilité blockchain sécurisée', category: 'Technologies', sector: 'all', color: '#2f54eb', usage: 67, tags: ['Blockchain'] }
  ];

  // Catégories pour filtrage
  const categories = [
    { value: 'all', label: 'Tous', icon: <AppstoreOutlined />, count: allModels.length },
    { value: 'Core Business', label: 'Core Business', icon: <ShopOutlined />, count: allModels.filter(m => m.category === 'Core Business').length },
    { value: 'Modules Transversaux', label: 'Modules Transversaux', icon: <GlobalOutlined />, count: allModels.filter(m => m.category === 'Modules Transversaux').length },
    { value: 'IA Générative', label: 'IA Générative', icon: <BulbOutlined />, count: allModels.filter(m => m.category === 'IA Générative').length },
    { value: 'Banque', label: 'Banque', icon: <BankOutlined />, count: allModels.filter(m => m.category === 'Banque').length },
    { value: 'Assurance IA', label: 'Assurance IA', icon: <SafetyCertificateOutlined />, count: allModels.filter(m => m.category === 'Assurance IA').length },
    { value: 'Assurance Pro', label: 'Assurance Pro', icon: <InsuranceOutlined />, count: allModels.filter(m => m.category === 'Assurance Pro').length },
    { value: 'Entreprise IA', label: 'Entreprise IA', icon: <ApartmentOutlined />, count: allModels.filter(m => m.category === 'Entreprise IA').length },
    { value: 'Dashboards', label: 'Dashboards', icon: <DashboardOutlined />, count: allModels.filter(m => m.category === 'Dashboards').length },
    { value: 'Assistants IA', label: 'Assistants IA', icon: <RobotOutlined />, count: allModels.filter(m => m.category === 'Assistants IA').length },
    { value: 'Technologies', label: 'Technologies', icon: <ApiOutlined />, count: allModels.filter(m => m.category === 'Technologies').length }
  ];

  const getFilteredModels = () => {
    let filtered = [...allModels];

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(m => m.category === selectedCategory);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.label.toLowerCase().includes(term) ||
        m.description.toLowerCase().includes(term) ||
        m.tags.some(tag => tag.toLowerCase().includes(term))
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === 'popularity') {
        const compareA = a.usage || 0;
        const compareB = b.usage || 0;
        return sortOrder === 'asc' ? compareA - compareB : compareB - compareA;
      } else {
        const compareA = (a.label || '').toLowerCase();
        const compareB = (b.label || '').toLowerCase();
        if (sortOrder === 'asc') {
          return compareA.localeCompare(compareB);
        } else {
          return compareB.localeCompare(compareA);
        }
      }
    });

    return filtered;
  };

  const filteredModels = getFilteredModels();
  const stats = {
    total: allModels.length,
    installed: (installedModules?.length || 0) + (customModules?.length || 0),
    favorites: favorites.length
  };

  const handleAddModel = async (model) => {
    // Vérifier si déjà actif
    if (isModuleActive(model.key)) {
      message.info(`Le module "${model.label}" est déjà actif`);
      return;
    }
    
    setActivating(true);
    const hideLoading = message.loading(`Activation de "${model.label}"...`, 0);
    
    try {
      const res = await addCustomModule(model.key);
      hideLoading();
      
      if (res?.success) {
        // Rediriger vers la page appropriée après activation
        setTimeout(() => {
          if (model.sector === 'bank') {
            navigate('/banking-dashboard');
          } else if (model.sector === 'insurance') {
            navigate('/insurance-dashboard');
          } else if (model.sector === 'enterprise') {
            navigate('/enterprise-dashboard');
          } else if (model.key === 'smart-dashboard') {
            navigate('/smart-dashboard');
          } else if (model.key === 'nexy-ai') {
            navigate('/ai/nexy');
          } else if (model.key === 'kanban') {
            navigate('/project/kanban');
          } else if (model.key === 'ocr') {
            navigate('/ocr');
          } else if (model.key === 'document-intelligence') {
            navigate('/shared/document-intelligence');
          }
        }, 500);
      }
    } catch (error) {
      hideLoading();
      console.error('Erreur activation:', error);
      message.error(`Erreur lors de l'activation de "${model.label}"`);
    } finally {
      setActivating(false);
    }
  };

  const handleViewDetails = (model) => {
    setSelectedModel(model);
  };

  const toggleFavorite = (modelKey) => {
    setFavorites(prev => 
      prev.includes(modelKey) 
        ? prev.filter(k => k !== modelKey)
        : [...prev, modelKey]
    );
  };

  const getUsageColor = (usage) => {
    if (usage >= 90) return '#10b981';
    if (usage >= 70) return '#10b981';
    return '#64748b';
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f8fafc', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" tip="Chargement du catalogue..." ><div/></Spin>
      </div>
    );
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#3b82f6',
          borderRadius: 12,
        }
      }}
    >
      <div style={{ padding: 32, background: '#f8fafc', minHeight: '100vh' }}>
        {/* Header Premium */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={ANIMATION_VARIANTS.scaleIn}
          style={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #475569 100%)',
            padding: '32px 40px',
            borderRadius: 28,
            marginBottom: 32,
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}
        >
          <div style={{ position: 'absolute', top: -100, right: -100, width: 300, height: 300, background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />
          <div style={{ position: 'absolute', bottom: -80, left: -80, width: 200, height: 200, background: 'rgba(255,255,255,0.08)', borderRadius: '50%' }} />
          
          <div style={{ position: 'relative', zIndex: 1 }}>
            <Flex justify="space-between" align="center" wrap="wrap" gap={16}>
              <Space size={20}>
                <div style={{
                  width: 64, height: 64,
                  background: 'rgba(255,255,255,0.2)',
                  borderRadius: 20,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backdropFilter: 'blur(10px)'
                }}>
                  <CrownOutlined style={{ fontSize: 32, color: 'white' }} />
                </div>
                <div>
                  <Title level={1} style={{ margin: 0, color: 'white', fontWeight: 800, fontSize: 32 }}>
                    Catalogue des Modèles IA
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16 }}>
                    Découvrez et activez les {stats.total} modules intelligents de Nexum
                  </Text>
                </div>
              </Space>
              
              <Space size={16}>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: '12px 24px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Total modèles</Text>
                  <Title level={3} style={{ margin: 0, color: 'white' }}>{stats.total}</Title>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: '12px 24px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Installés</Text>
                  <Title level={3} style={{ margin: 0, color: '#10b981' }}>{stats.installed}</Title>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 16, padding: '12px 24px', textAlign: 'center', backdropFilter: 'blur(10px)' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Favoris</Text>
                  <Title level={3} style={{ margin: 0, color: '#fbbf24' }}>{stats.favorites}</Title>
                </div>
              </Space>
            </Flex>

            {/* Catégories rapides */}
            <Flex wrap="wrap" gap={12} style={{ marginTop: 32 }}>
              {categories.map(cat => (
                <motion.div
                  key={cat.value}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div
                    onClick={() => setSelectedCategory(cat.value)}
                    style={{
                      background: selectedCategory === cat.value ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
                      borderRadius: 40,
                      padding: '8px 20px',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      border: selectedCategory === cat.value ? '1px solid rgba(255,255,255,0.5)' : '1px solid transparent',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <Space>
                      {cat.icon}
                      <Text style={{ color: 'white' }}>{cat.label}</Text>
                      <Badge count={cat.count} style={{ backgroundColor: 'rgba(255,255,255,0.3)', color: 'white' }} />
                    </Space>
                  </div>
                </motion.div>
              ))}
            </Flex>
          </div>
        </motion.div>

        {/* Filtres */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ marginBottom: 24 }}
        >
          <Card style={{ borderRadius: 20, border: '1px solid #e2e8f0', background: '#ffffff' }}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} md={8}>
                <Input
                  placeholder="Rechercher un modèle..."
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  allowClear
                  size="large"
                  style={{ borderRadius: 12 }}
                />
              </Col>
              <Col xs={24} md={4}>
                <Select
                  value={sortBy}
                  onChange={setSortBy}
                  size="large"
                  style={{ width: '100%' }}
                >
                  <Option value="popularity">⭐ Popularité</Option>
                  <Option value="name">📝 Nom</Option>
                </Select>
              </Col>
              <Col xs={24} md={3}>
                <Button
                  icon={sortOrder === 'asc' ? <SortAscendingOutlined /> : <SortDescendingOutlined />}
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  size="large"
                  block
                >
                  {sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
                </Button>
              </Col>
              <Col xs={24} md={5}>
                <Segmented
                  value={viewMode}
                  onChange={setViewMode}
                  size="large"
                  block
                  options={[
                    { value: 'grid', icon: <AppstoreOutlined />, label: 'Grille' },
                    { value: 'list', icon: <UnorderedListOutlined />, label: 'Liste' }
                  ]}
                />
              </Col>
              <Col xs={24} md={4}>
                <Button
                  icon={<FilterOutlined />}
                  onClick={() => {
                    setSelectedCategory('all');
                    setSearchTerm('');
                    setSortBy('popularity');
                    setSortOrder('desc');
                  }}
                  size="large"
                  block
                >
                  Réinitialiser
                </Button>
              </Col>
            </Row>
          </Card>
        </motion.div>

        {/* Résultats */}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text type="secondary">
            <FireOutlined style={{ marginRight: 8, color: '#fbbf24' }} />
            {filteredModels.length} modèle(s) trouvé(s)
          </Text>
          {favorites.length > 0 && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              <StarFilled style={{ color: '#fbbf24', marginRight: 4 }} />
              {favorites.length} favori(s)
            </Text>
          )}
        </div>

        {/* Grille des modèles */}
        {filteredModels.length === 0 ? (
          <Empty description="Aucun modèle trouvé" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ marginTop: 48 }} />
        ) : viewMode === 'grid' ? (
          <Row gutter={[24, 24]}>
            {filteredModels.map((model, index) => {
              const isFavorite = favorites.includes(model.key);
              const isActive = isModuleActive(model.key);
              return (
                <Col xs={24} sm={12} lg={8} xl={6} key={model.key}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ y: -4 }}
                  >
                    <Card
                      style={{
                        borderRadius: 20,
                        border: '1px solid #e2e8f0',
                        height: '100%',
                        position: 'relative',
                        overflow: 'hidden',
                        background: '#ffffff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                      }}
                      styles={{ body: { padding: '20px' } }}
                      hoverable
                    >
                      {model.badge && (
                        <div style={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          background: model.color,
                          padding: '2px 12px',
                          borderRadius: 20,
                          fontSize: 10,
                          fontWeight: 600,
                          color: 'white',
                          zIndex: 1,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}>
                          {model.badge}
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                        <Avatar
                          size={52}
                          icon={model.icon}
                          style={{
                            background: `${model.color}15`,
                            color: model.color,
                            borderRadius: 16
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <Flex align="center" justify="space-between">
                            <Title level={5} style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>{model.label}</Title>
                            {isFavorite && <StarFilled style={{ color: '#fbbf24', fontSize: 14 }} />}
                          </Flex>
                          <Tag color={model.color} style={{ marginTop: 4, borderRadius: 12, fontSize: 10 }}>
                            {model.category}
                          </Tag>
                        </div>
                      </div>
                      
                      <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16, minHeight: 60, color: '#64748b' }}>
                        {model.description.length > 100 ? `${model.description.substring(0, 100)}...` : model.description}
                      </Paragraph>
                      
                      <div style={{ marginBottom: 12 }}>
                        <Space wrap size={6}>
                          {model.tags.slice(0, 3).map(tag => (
                            <Tag key={tag} style={{ borderRadius: 12, fontSize: 10, background: '#f1f5f9', color: '#64748b' }}>{tag}</Tag>
                          ))}
                        </Space>
                      </div>
                      
                      <Progress
                        percent={model.usage}
                        size="small"
                        strokeColor={getUsageColor(model.usage)}
                        showInfo={false}
                        style={{ marginBottom: 16 }}
                      />
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space size={4}>
                          {isActive ? (
                            <Tag color="success" icon={<CheckCircleOutlined />} style={{ borderRadius: 20 }}>
                              Installé
                            </Tag>
                          ) : (
                            <Tag icon={<CloudOutlined />} style={{ borderRadius: 20, color: '#64748b' }}>
                              Disponible
                            </Tag>
                          )}
                        </Space>
                        <Space>
                          <Tooltip title="Voir détails">
                            <Button
                              type="text"
                              icon={<EyeOutlined />}
                              onClick={() => handleViewDetails(model)}
                              style={{ color: '#3b82f6' }}
                            />
                          </Tooltip>
                          <Tooltip title={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
                            <Button
                              type="text"
                              icon={<StarOutlined />}
                              onClick={() => toggleFavorite(model.key)}
                              style={{ color: isFavorite ? '#fbbf24' : '#64748b' }}
                            />
                          </Tooltip>
                          {!isActive && (
                            <Tooltip title="Activer le module">
                              <Button
                                type="primary"
                                shape="circle"
                                icon={<PlusOutlined />}
                                onClick={() => handleAddModel(model)}
                                size="small"
                                loading={activating}
                                style={{ background: 'linear-gradient(135deg, #3b82f6, #475569)', border: 'none' }}
                              />
                            </Tooltip>
                          )}
                        </Space>
                      </div>
                    </Card>
                  </motion.div>
                </Col>
              );
            })}
          </Row>
        ) : (
          <Card style={{ borderRadius: 20, border: '1px solid #e2e8f0', background: '#ffffff' }}>
            <List
              dataSource={filteredModels}
              renderItem={(model) => {
                const isFavorite = favorites.includes(model.key);
                const isActive = isModuleActive(model.key);
                return (
                  <List.Item
                    actions={[
                      <Button key="details" type="text" icon={<EyeOutlined />} onClick={() => handleViewDetails(model)}>Détails</Button>,
                      <Button
                        key="favorite"
                        type="text"
                        icon={isFavorite ? <StarFilled /> : <StarOutlined />}
                        onClick={() => toggleFavorite(model.key)}
                        style={{ color: isFavorite ? '#fbbf24' : undefined }}
                      >
                        {isFavorite ? 'Favori' : 'Ajouter'}
                      </Button>,
                      !isActive && (
                        <Button key="activate" type="primary" icon={<PlusOutlined />} onClick={() => handleAddModel(model)} loading={activating}>
                          Activer
                        </Button>
                      )
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar size={48} icon={model.icon} style={{ background: `${model.color}15`, color: model.color, borderRadius: 12 }} />}
                      title={
                        <Space>
                          <Text strong style={{ fontSize: 16, color: '#1e293b' }}>{model.label}</Text>
                          {model.badge && <Tag color={model.badge}>{model.badge}</Tag>}
                          {isActive && <Tag color="success">Installé</Tag>}
                          {isFavorite && <StarFilled style={{ color: '#fbbf24' }} />}
                        </Space>
                      }
                      description={
                        <div>
                          <Text type="secondary" style={{ display: 'block', marginBottom: 8, color: '#64748b' }}>{model.description}</Text>
                          <Space size={8}>
                            <Tag color={model.color} style={{ borderRadius: 12 }}>{model.category}</Tag>
                            {model.tags.slice(0, 3).map(tag => <Tag key={tag} style={{ borderRadius: 12 }}>{tag}</Tag>)}
                          </Space>
                        </div>
                      }
                    />
                  </List.Item>
                );
              }}
            />
          </Card>
        )}

        {/* Modal Détails */}
        <Modal
          title={
            <Space>
              <div style={{
                width: 40, height: 40,
                background: `${selectedModel?.color}15`,
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                {selectedModel?.icon}
              </div>
              <span style={{ fontSize: 18, fontWeight: 600, color: '#1e293b' }}>{selectedModel?.label}</span>
            </Space>
          }
          open={!!selectedModel}
          onCancel={() => setSelectedModel(null)}
          footer={[
            <Button key="close" onClick={() => setSelectedModel(null)}>Fermer</Button>,
            !isModuleActive(selectedModel?.key) && (
              <Button
                key="add"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  handleAddModel(selectedModel);
                  setSelectedModel(null);
                }}
                loading={activating}
                style={{ background: 'linear-gradient(135deg, #3b82f6, #475569)', border: 'none' }}
              >
                Activer le module
              </Button>
            )
          ]}
          width={650}
          styles={{ content: { borderRadius: 24 } }}
        >
          {selectedModel && (
            <div>
              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Catégorie">
                  <Tag color={selectedModel.color}>{selectedModel.category}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Secteur">
                  <Tag color={selectedModel.sector === 'bank' ? 'blue' : selectedModel.sector === 'insurance' ? 'green' : 'purple'}>
                    {selectedModel.sector === 'bank' ? 'Banque' : selectedModel.sector === 'insurance' ? 'Assurance' : 'Tous secteurs'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Popularité">
                  <Progress percent={selectedModel.usage} size="small" width={80} />
                </Descriptions.Item>
                <Descriptions.Item label="Statut">
                  {isModuleActive(selectedModel.key) ? (
                    <Tag color="success" icon={<CheckCircleOutlined />}>Actif</Tag>
                  ) : (
                    <Tag icon={<CloudOutlined />}>Disponible</Tag>
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="Tags" span={2}>
                  <Space wrap>
                    {selectedModel.tags.map(tag => <Tag key={tag}>{tag}</Tag>)}
                  </Space>
                </Descriptions.Item>
              </Descriptions>
              
              <Divider orientation="left">Description</Divider>
              <Paragraph style={{ color: '#64748b' }}>{selectedModel.description}</Paragraph>
              
              <Divider orientation="left">Intégrations</Divider>
              <Space wrap>
                <Tag icon={<ApiOutlined />}>API REST</Tag>
                <Tag icon={<DatabaseOutlined />}>Base de données</Tag>
                <Tag icon={<RobotOutlined />}>IA</Tag>
              </Space>
            </div>
          )}
        </Modal>
      </div>
    </ConfigProvider>
  );
};

export default ModelsCatalog;