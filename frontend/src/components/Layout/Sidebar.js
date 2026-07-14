// Sidebar.js - Réorganisé avec 4 zones claires + isolation company_id + section Assistants IA
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Layout, Menu, Badge, Tooltip, Button, Space, Modal, Select, Input, Typography, Divider, Spin, Avatar, Tag, Progress, message, App, Row, Col, Card, List } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  MenuFoldOutlined, MenuUnfoldOutlined, CrownOutlined,
  AppstoreAddOutlined, DeleteOutlined,
  CheckCircleOutlined,
  BankOutlined, InsuranceOutlined, ApartmentOutlined,
  DashboardOutlined, DashboardFilled,
  ShoppingOutlined, ShoppingCartOutlined,
  TeamOutlined, WalletOutlined, DatabaseOutlined,
  UserOutlined, ProjectOutlined,
  RobotOutlined,
  FundOutlined, FundFilled,
  SettingOutlined,
  SafetyCertificateOutlined, SafetyCertificateFilled,
  ScanOutlined,
  CreditCardOutlined,
  GlobalOutlined, ThunderboltOutlined, NodeIndexOutlined,
  StarOutlined,
  SecurityScanOutlined, DeploymentUnitOutlined, SearchOutlined, BulbOutlined,
  EnvironmentOutlined, LayoutOutlined, ExperimentOutlined,
  LockOutlined, GoldOutlined,
  FileTextOutlined, DollarOutlined,
  RiseOutlined, FallOutlined, LineChartOutlined,
  ClockCircleOutlined, CameraOutlined, EuroOutlined,
  CustomerServiceOutlined, PhoneOutlined, MedicineBoxOutlined,
  CarOutlined, WarningOutlined, BookOutlined,
  RobotFilled, GiftOutlined, TrophyOutlined, ThunderboltFilled,
  ShopOutlined, ApiOutlined, HomeOutlined
} from '@ant-design/icons';

import api from '../../services/api';
import { useAuth } from '../../services/auth';
import { useModules } from '../../context/ModuleContext';
import './Sidebar.css';

const { Sider } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

// ─────────────────────────────────────────────────────────────
// DESIGN TOKENS
// ─────────────────────────────────────────────────────────────
const COLORS = {
  primary: '#2563eb',
  success: '#22c55e',
  gold: '#d4af37',
  bgSecondary: '#0f172a',
  bgCard: 'rgba(255,255,255,0.03)',
  textPrimary: '#ffffff',
  textSecondary: '#f1f5f9',
  textMuted: '#94a3b8',
  border: 'rgba(255, 255, 255, 0.08)',
  gradientGold: 'linear-gradient(135deg, #d4af37 0%, #b8860b 100%)',
  gradientBlue: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
  gradientPurple: 'linear-gradient(135deg, #4c1d95 0%, #475569 100%)',
};

const SECTOR_COLORS = {
  banking: '#1890ff',
  insurance: '#52c41a',
  enterprise: '#d4af37',
};

const BORDER_COLORS = {
  banking: '#1890ff',
  insurance: '#52c41a',
  enterprise: '#d4af37',
};

// ─────────────────────────────────────────────────────────────
// MODULES ADMIN
// ─────────────────────────────────────────────────────────────
const ADMIN_MODULES = [
  { key: 'admin-dashboard', icon: <DashboardOutlined />, iconFilled: <DashboardFilled />, label: 'Dashboard', path: '/admin/dashboard', shortLabel: 'Dashboard', removable: false, isDefault: true },
  { key: 'admin-users', icon: <TeamOutlined />, iconFilled: <TeamOutlined />, label: 'Utilisateurs', path: '/admin/users', shortLabel: 'Users', removable: false, isDefault: true },
  { key: 'admin-companies', icon: <ApartmentOutlined />, iconFilled: <ApartmentOutlined />, label: 'Entreprises', path: '/admin/companies', shortLabel: 'Companies', removable: false, isDefault: true },
  { key: 'admin-settings', icon: <SettingOutlined />, iconFilled: <SettingOutlined />, label: 'Paramètres', path: '/admin/settings', shortLabel: 'Settings', removable: false, isDefault: true },
];

// ─────────────────────────────────────────────────────────────
// MODULES MÉTIER (selon secteur)
// ─────────────────────────────────────────────────────────────
const CORE_BUSINESS_MODULES = [
  { key: 'dashboard', icon: <DashboardOutlined />, iconFilled: <DashboardFilled />, label: 'Tableau de bord', path: '/dashboard', shortLabel: 'Dashboard', removable: false, isDefault: true, description: "Vue d'ensemble de l'activité" },
  { key: 'sale', icon: <ShoppingOutlined />, iconFilled: <ShoppingOutlined />, label: 'Ventes', path: '/sale', shortLabel: 'Ventes', removable: false, isDefault: true, description: 'Gestion des ventes' },
  { key: 'purchase', icon: <ShoppingCartOutlined />, iconFilled: <ShoppingCartOutlined />, label: 'Achats', path: '/purchase', shortLabel: 'Achats', removable: false, isDefault: true, description: 'Gestion des achats' },
  { key: 'crm', icon: <TeamOutlined />, iconFilled: <TeamOutlined />, label: 'CRM', path: '/crm', shortLabel: 'CRM', removable: false, isDefault: true, description: 'Gestion relation client' },
  { key: 'account', icon: <WalletOutlined />, iconFilled: <WalletOutlined />, label: 'Comptabilité', path: '/account', shortLabel: 'Compta', removable: false, isDefault: true, description: 'Gestion comptable' },
  { key: 'stock', icon: <DatabaseOutlined />, iconFilled: <DatabaseOutlined />, label: 'Stock', path: '/stock', shortLabel: 'Stock', removable: false, isDefault: true, description: 'Gestion des stocks' },
  { key: 'hr', icon: <UserOutlined />, iconFilled: <UserOutlined />, label: 'RH', path: '/hr', shortLabel: 'RH', removable: false, isDefault: true, description: 'Ressources humaines' },
  { key: 'project', icon: <ProjectOutlined />, iconFilled: <ProjectOutlined />, label: 'Projets', path: '/project', shortLabel: 'Projets', removable: false, isDefault: true, description: 'Gestion de projets' },
];

const BANKING_MODULES = [
  { key: 'banking-dashboard', icon: <BankOutlined />, iconFilled: <BankOutlined />, label: 'Dashboard Banque', path: '/banking-dashboard', shortLabel: 'Dashboard', removable: false, isDefault: true },
  { key: 'credit-scoring', icon: <FundFilled />, iconFilled: <FundFilled />, label: 'Crédit Scoring IA', path: '/banking/credit-scoring', shortLabel: 'Crédit', badge: 'IA', badgeColor: '#ff4d4f', removable: true, isDefault: true },
  { key: 'fraud-detection-banking', icon: <SafetyCertificateFilled />, iconFilled: <SafetyCertificateFilled />, label: 'Anti-Fraude IA', path: '/banking/fraud-detection', shortLabel: 'Fraude', badge: 'IA', badgeColor: '#ff4d4f', removable: true, isDefault: true },
  { key: 'kyc-automation', icon: <ScanOutlined />, iconFilled: <ScanOutlined />, label: 'KYC Automatisé', path: '/banking/kyc', shortLabel: 'KYC', removable: false, isDefault: true },
  { key: 'aml-compliance', icon: <SafetyCertificateOutlined />, iconFilled: <SafetyCertificateOutlined />, label: 'AML Compliance', path: '/banking/aml', shortLabel: 'AML', removable: false, isDefault: true },
  { key: 'churn-prediction-banking', icon: <FallOutlined />, iconFilled: <FallOutlined />, label: 'Prédiction Attrition', path: '/banking/churn-prediction', shortLabel: 'Churn', removable: false, isDefault: true },
  { key: 'fraud-bank-3d', icon: <BankOutlined />, iconFilled: <BankOutlined />, label: 'Lutte Fraude 3D', path: '/intelligence/fraud-bank-3d', shortLabel: 'Fraude 3D', badge: '3D', badgeColor: '#f5222d', removable: true, isDefault: true },
  { key: 'robo-advisor', icon: <RobotFilled />, iconFilled: <RobotFilled />, label: 'Robo-Advisor', path: '/finance/robo-advisor', shortLabel: 'Robo-advisor', removable: false, isDefault: true },
];

const INSURANCE_MODULES = [
  { key: 'insurance-dashboard', icon: <InsuranceOutlined />, iconFilled: <InsuranceOutlined />, label: 'Dashboard Assurance', path: '/insurance-dashboard', shortLabel: 'Dashboard', removable: false, isDefault: true },
  { key: 'claims-processing', icon: <FileTextOutlined />, iconFilled: <FileTextOutlined />, label: 'Traitement Sinistres', path: '/insurance/claims', shortLabel: 'Sinistres', removable: false, isDefault: true },
  { key: 'fraud-detection-insurance', icon: <SafetyCertificateFilled />, iconFilled: <SafetyCertificateFilled />, label: 'Anti-Fraude IA', path: '/insurance/fraud-detection', shortLabel: 'Fraude', badge: 'IA', badgeColor: '#fa8c16', removable: true, isDefault: true },
  { key: 'catastrophe-modeling', icon: <WarningOutlined />, iconFilled: <WarningOutlined />, label: 'Modélisation Catastrophes', path: '/insurance/catastrophe', shortLabel: 'Catas', removable: false, isDefault: true },
  { key: 'risk-scoring-insurance', icon: <FundOutlined />, iconFilled: <FundOutlined />, label: 'Scoring Risque', path: '/insurance/risk-scoring', shortLabel: 'Scoring', removable: false, isDefault: true },
  { key: 'damage-estimation-3d', icon: <CarOutlined />, iconFilled: <CarOutlined />, label: 'Sinistres 3D', path: '/intelligence/damage-estimation-3d', shortLabel: 'Sinistres 3D', badge: '3D', badgeColor: '#fa8c16', removable: true, isDefault: true },
  { key: 'climate-risk-3d', icon: <GlobalOutlined />, iconFilled: <GlobalOutlined />, label: 'Climat 3D', path: '/intelligence/climate-risk-3d', shortLabel: 'Climat 3D', badge: '3D', badgeColor: '#1890ff', removable: true, isDefault: true },
  { key: 'fraud-rings-3d-insurance', icon: <NodeIndexOutlined />, iconFilled: <NodeIndexOutlined />, label: 'Réseaux Fraude', path: '/intelligence/fraud-rings-3d', shortLabel: 'Fraude 3D', badge: '3D', badgeColor: '#722ed1', removable: true, isDefault: true },
];

// ─────────────────────────────────────────────────────────────
// INTELLIGENCE HUB (premium, tous secteurs)
// ─────────────────────────────────────────────────────────────
const INTELLIGENCE_HUB_MODULES = [
  { key: 'cyber-shield', icon: <SecurityScanOutlined />, iconFilled: <SecurityScanOutlined />, label: 'Cyber-Shield', path: '/intelligence/cyber-shield', shortLabel: 'Cyber', badge: 'PREMIUM', badgeColor: '#d4af37', color: '#00d1ff', removable: true, isDefault: false },
  { key: 'digital-twin', icon: <DeploymentUnitOutlined />, iconFilled: <DeploymentUnitOutlined />, label: '3D Digital Twin', path: '/intelligence/digital-twin', shortLabel: '3D Twin', badge: 'PREMIUM', badgeColor: '#d4af37', color: '#00d1ff', removable: true, isDefault: false },
  { key: 'nexum-agents', icon: <RobotOutlined />, iconFilled: <RobotOutlined />, label: 'Nexum Agents', path: '/intelligence/agents', shortLabel: 'Agents', badge: 'PREMIUM', badgeColor: '#d4af37', color: '#722ed1', removable: true, isDefault: false },
  { key: 'esg-tracker', icon: <EnvironmentOutlined />, iconFilled: <EnvironmentOutlined />, label: 'ESG Tracker', path: '/intelligence/esg', shortLabel: 'ESG', badge: 'PREMIUM', badgeColor: '#d4af37', color: '#52c41a', removable: true, isDefault: false },
  { key: 'nexum-predict', icon: <BulbOutlined />, iconFilled: <BulbOutlined />, label: 'Nexum Predict', path: '/intelligence/predict', shortLabel: 'Predict', badge: 'PREMIUM', badgeColor: '#d4af37', color: '#667eea', removable: true, isDefault: false },
  { key: 'fraud-rings-3d', icon: <NodeIndexOutlined />, iconFilled: <NodeIndexOutlined />, label: 'Réseaux Fraude 3D', path: '/intelligence/fraud-rings-3d', shortLabel: 'Réseaux', badge: 'PREMIUM', badgeColor: '#d4af37', color: '#722ed1', removable: true, isDefault: false },
  { key: 'assistants-3d-place', icon: <RobotOutlined />, iconFilled: <RobotFilled />, label: 'Place des Assistants', path: '/intelligence/assistants-3d-place', shortLabel: 'Place 3D', badge: 'NEW', badgeColor: '#1890ff', color: '#1890ff', removable: true, isDefault: false },
];

// ─────────────────────────────────────────────────────────────
// ASSISTANTS IA (section dédiée)
// ─────────────────────────────────────────────────────────────
const ASSISTANT_MODULES = [
  { key: 'assistant-copilot', icon: <RobotFilled />, iconFilled: <RobotFilled />, label: 'Nexy Copilot', path: '/copilot', shortLabel: 'Copilot', color: '#8b5cf6', badge: 'IA', badgeColor: '#8b5cf6', removable: true, isDefault: false, description: 'Assistant universel ERP' },
  { key: 'assistant-risk', icon: <SafetyCertificateFilled />, iconFilled: <SafetyCertificateFilled />, label: 'James — Risque', path: '/assistant/risk', shortLabel: 'Risque', color: '#ef4444', badge: 'IA', badgeColor: '#ef4444', removable: true, isDefault: false, description: 'Expert risque & fraude' },
  { key: 'assistant-predict', icon: <RiseOutlined />, iconFilled: <RiseOutlined />, label: 'Sophie — Prédiction', path: '/assistant/predict', shortLabel: 'Predict', color: '#722ed1', badge: 'IA', badgeColor: '#722ed1', removable: true, isDefault: false, description: 'Expert prévisions & IA' },
  { key: 'assistant-growth', icon: <LineChartOutlined />, iconFilled: <LineChartOutlined />, label: 'Elena — Croissance', path: '/assistant/growth', shortLabel: 'Croissance', color: '#52c41a', badge: 'IA', badgeColor: '#52c41a', removable: true, isDefault: false, description: 'Expert stratégie & croissance' },
];

// ─────────────────────────────────────────────────────────────
// MODULES OPTIONNELS (depuis le marketplace)
// ─────────────────────────────────────────────────────────────
const ADDABLE_MODULES = [
  { key: 'ai-report-generator', icon: <FileTextOutlined />, iconFilled: <FileTextOutlined />, label: 'Génération Rapports IA', path: '/ai/report-generator', shortLabel: 'Rapports IA', badge: 'IA', badgeColor: '#667eea', removable: true, isDefault: false },
  { key: 'ai-quote-generator', icon: <DollarOutlined />, iconFilled: <DollarOutlined />, label: 'Génération Devis IA', path: '/ai/quote-generator', shortLabel: 'Devis IA', badge: 'IA', badgeColor: '#52c41a', removable: true, isDefault: false },
  { key: 'ticket-auto-resolve', icon: <CustomerServiceOutlined />, iconFilled: <CustomerServiceOutlined />, label: 'Support Auto-Résolu', path: '/support/auto-resolve', shortLabel: 'Support', badge: 'RAG', badgeColor: '#1890ff', removable: true, isDefault: false },
  { key: 'call-analysis', icon: <PhoneOutlined />, iconFilled: <PhoneOutlined />, label: 'Analyse des Appels', path: '/call-analytics', shortLabel: 'Appels', badge: 'Speech', badgeColor: '#722ed1', removable: true, isDefault: false },
  { key: 'claim-auto-declaration', icon: <CameraOutlined />, iconFilled: <CameraOutlined />, label: 'Déclaration Sinistre', path: '/claims/declaration', shortLabel: 'Déclaration', badge: 'CV', badgeColor: '#fa8c16', removable: true, isDefault: false },
  { key: 'claim-real-time-tracking', icon: <ClockCircleOutlined />, iconFilled: <ClockCircleOutlined />, label: 'Suivi Sinistre', path: '/claims/tracking', shortLabel: 'Suivi', removable: true, isDefault: false },
  { key: 'damage-auto-estimation', icon: <EuroOutlined />, iconFilled: <EuroOutlined />, label: 'Estimation Dommages', path: '/claims/estimation', shortLabel: 'Estimation', badge: 'DL', badgeColor: '#52c41a', removable: true, isDefault: false },
  { key: 'coverage-recommendation', icon: <SafetyCertificateOutlined />, iconFilled: <SafetyCertificateOutlined />, label: 'Recommandation Garanties', path: '/insurance/warranties', shortLabel: 'Garanties', removable: true, isDefault: false },
  { key: 'loss-prevention', icon: <WarningOutlined />, iconFilled: <WarningOutlined />, label: 'Prévention Sinistres', path: '/insurance/prevention', shortLabel: 'Prévention', removable: true, isDefault: false },
  { key: 'medical-assistant', icon: <MedicineBoxOutlined />, iconFilled: <MedicineBoxOutlined />, label: 'Assistant Médical', path: '/health/assistant', shortLabel: 'Médical', removable: true, isDefault: false },
  { key: 'smart-claims', icon: <NodeIndexOutlined />, iconFilled: <NodeIndexOutlined />, label: 'Smart-Claims', path: '/intelligence/smart-claims', shortLabel: 'Smart Claims', badge: 'PREMIUM', badgeColor: '#d4af37', removable: true, isDefault: false },
  { key: 'omnichannel-portal', icon: <GlobalOutlined />, iconFilled: <GlobalOutlined />, label: 'Portail Omnicanal', path: '/customer/omnichannel', shortLabel: 'Omnicanal', removable: true, isDefault: false },
  { key: 'performance-monitor', icon: <ThunderboltOutlined />, iconFilled: <ThunderboltOutlined />, label: 'Performance Monitor', path: '/performance/monitor', shortLabel: 'Performance', removable: true, isDefault: false },
  { key: 'blockchain', icon: <NodeIndexOutlined />, iconFilled: <NodeIndexOutlined />, label: 'Blockchain', path: '/blockchain', shortLabel: 'Blockchain', removable: true, isDefault: false },
  { key: 'talent-mapping-3d', icon: <TeamOutlined />, iconFilled: <TeamOutlined />, label: 'Talents 3D', path: '/intelligence/talent-mapping-3d', shortLabel: 'Talents', badge: 'PREMIUM', badgeColor: '#d4af37', removable: true, isDefault: false },
  { key: 'document-intelligence', icon: <BookOutlined />, iconFilled: <BookOutlined />, label: 'Intelligence Documentaire', path: '/shared/document-intelligence', shortLabel: 'Doc Intel', removable: true, isDefault: false },
  { key: 'enterprise-dashboard', icon: <ApartmentOutlined />, iconFilled: <ApartmentOutlined />, label: 'Dashboard Entreprise', path: '/enterprise-dashboard', shortLabel: 'Ent Dash', removable: true, isDefault: false },
  { key: 'smart-dashboard', icon: <LayoutOutlined />, iconFilled: <LayoutOutlined />, label: 'Smart Dashboard', path: '/smart-dashboard', shortLabel: 'Smart Dash', removable: true, isDefault: false },
  { key: 'nexy-ai', icon: <RobotOutlined />, iconFilled: <RobotOutlined />, label: 'Nexy AI 3D', path: '/ai/nexy', shortLabel: 'Nexy AI', removable: true, isDefault: false },
  { key: 'kanban', icon: <ProjectOutlined />, iconFilled: <ProjectOutlined />, label: 'Kanban', path: '/project/kanban', shortLabel: 'Kanban', removable: true, isDefault: false },
];

// ─────────────────────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────────────────────
const UTILITY_MODULES = [
  { key: 'ocr', icon: <ScanOutlined />, iconFilled: <ScanOutlined />, label: 'OCR Documents', path: '/ocr', shortLabel: 'OCR', removable: false, isDefault: true },
  { key: 'settings', icon: <SettingOutlined />, iconFilled: <SettingOutlined />, label: 'Paramètres', path: '/settings', shortLabel: 'Params', removable: false, isDefault: true },
];

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const getAllModules = () => [
  ...CORE_BUSINESS_MODULES,
  ...BANKING_MODULES,
  ...INSURANCE_MODULES,
  ...INTELLIGENCE_HUB_MODULES,
  ...ASSISTANT_MODULES,
  ...ADDABLE_MODULES,
  ...UTILITY_MODULES,
];

const getModuleByKey = (key) => getAllModules().find((m) => m.key === key);

// ─────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────
const Sidebar = ({ collapsed: propCollapsed, setCollapsed: propSetCollapsed, isSuperAdmin = false }) => {
  const { user } = useAuth();

  // ── State ──────────────────────────────────────────────────
  const [localCollapsed, setLocalCollapsed] = useState(false);
  const collapsed = propCollapsed !== undefined ? propCollapsed : localCollapsed;
  const setCollapsed = propSetCollapsed || setLocalCollapsed;

  const navigate = useNavigate();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);
  const [pendingRemove, setPendingRemove] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [messageApi, contextHolder] = message.useMessage();
  const { customModules: installedModules, setCustomModules, fetchCustomModules, loading, isHidden, removeCustomModule } = useModules();
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [subscriptionPlanModalVisible, setSubscriptionPlanModalVisible] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState({
    plan: 'free', planName: 'Gratuit', price: 0,
    features: ['Modules de base', 'Support standard'], usage: 0,
    endDate: null, daysRemaining: 0, nextBilling: null, isActive: false,
  });

  // ── Détection admin ─────────────────────────────────────────
  const isAdminMode = isSuperAdmin || user?.role === 'admin' || user?.role === 'super_admin';

  // ── Secteur utilisateur ────────────────────────────────────
  const getNormalizedSector = (sector) => {
    if (!sector) return 'enterprise';
    const s = sector.toLowerCase();
    if (['bank', 'banking', 'banque'].includes(s)) return 'banking';
    if (['insurance', 'assurance'].includes(s)) return 'insurance';
    return 'enterprise';
  };

  const rawSector = user?.sector || localStorage.getItem('userSector') || 'enterprise';
  const userSector = getNormalizedSector(rawSector);
  const sectorColor = isAdminMode ? '#ef4444' : (SECTOR_COLORS[userSector] || SECTOR_COLORS.enterprise);
  const borderColor = isAdminMode ? '#ef4444' : (BORDER_COLORS[userSector] || BORDER_COLORS.enterprise);

  // ── Helpers ────────────────────────────────────────────────
  const calculateDaysRemaining = (endDateStr) => {
    if (!endDateStr) return 0;
    try {
      const end = new Date(endDateStr);
      if (isNaN(end)) return 0;
      const diffTime = end - new Date();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    } catch { return 0; }
  };

  const truncateLabel = (label, maxLength = 20) => {
    if (!label || label.length <= maxLength) return label;
    return label.substring(0, maxLength - 3) + '…';
  };

  // ── Abonnement ─────────────────────────────────────────────
  const fetchSubscriptionData = useCallback(async () => {
    try {
      const response = await api.get('/saas/subscriptions', { params: { status: 'active' } });
      const subscriptions = response.data.subscriptions || [];
      const activeSub = subscriptions.find((s) => s.status === 'active') || subscriptions[0];

      if (activeSub) {
        const endDate = activeSub.end_date || activeSub.current_period_end;
        const daysRemaining = endDate ? calculateDaysRemaining(endDate) : 0;
        let usage = 0;
        if (endDate && activeSub.start_date) {
          const start = new Date(activeSub.start_date);
          const end = new Date(endDate);
          const now = new Date();
          const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
          const elapsedDays = Math.max(0, Math.ceil((now - start) / (1000 * 60 * 60 * 24)));
          usage = totalDays > 0 ? Math.min(100, Math.floor((elapsedDays / totalDays) * 100)) : 0;
        }
        setSubscriptionData({
          plan: activeSub.plan || 'premium',
          planName: activeSub.plan_name || (activeSub.plan === 'premium' ? 'Premium' : activeSub.plan === 'enterprise' ? 'Enterprise' : 'Gratuit'),
          price: activeSub.amount || 299,
          features: ['Modules IA illimités', 'Support 24/7', 'API Access'],
          usage, endDate, daysRemaining, nextBilling: endDate, isActive: true,
        });
      } else {
        const tier = user?.subscription_tier || 'free';
        setSubscriptionData({
          plan: tier,
          planName: tier === 'premium' ? 'Premium' : tier === 'enterprise' ? 'Enterprise' : 'Gratuit',
          price: tier === 'premium' ? 79 : tier === 'enterprise' ? 199 : 0,
          features: tier === 'free' ? ['Modules de base', 'Support standard'] : ['Modules IA illimités', 'Support 24/7'],
          usage: 0, endDate: null, daysRemaining: 0, nextBilling: null, isActive: false,
        });
      }
    } catch {
      const tier = user?.subscription_tier || 'free';
      setSubscriptionData({
        plan: tier,
        planName: tier === 'premium' ? 'Premium' : tier === 'enterprise' ? 'Enterprise' : 'Gratuit',
        price: tier === 'premium' ? 79 : tier === 'enterprise' ? 199 : 0,
        features: ['Modules de base'], usage: 0, endDate: null,
        daysRemaining: 0, nextBilling: null, isActive: false,
      });
    }
  }, [user]);

  // ── Modules installés ──────────────────────────────────────
  const handleRemoveModule = useCallback(async (moduleKey) => {
    setRemoveLoading(true);
    try {
      await removeCustomModule(moduleKey);
    } catch {
      messageApi.error('Erreur lors de la suppression');
    } finally {
      setRemoveLoading(false);
      setPendingRemove(null);
    }
  }, [removeCustomModule, messageApi]);

  // ── Effects ────────────────────────────────────────────────
  useEffect(() => {
    fetchCustomModules().finally(() => {
      setInitialLoaded(true);
    });
    fetchSubscriptionData();
  }, [fetchCustomModules, fetchSubscriptionData]);

  // ── Calcul des modules actifs ──────────────────────────────
  const activeModules = useMemo(() => {
    if (isAdminMode) return { sector: ADMIN_MODULES, intelligence: [], assistants: [], added: [], utility: [] };

    const sectorModsRaw = userSector === 'banking' ? BANKING_MODULES
      : userSector === 'insurance' ? INSURANCE_MODULES
      : CORE_BUSINESS_MODULES;

    // Un module est actif s'il est par défaut OU s'il a été installé par l'utilisateur, ET s'il n'est pas masqué
    const isModuleActive = (m) => !isHidden(m.key) && (m.isDefault || (Array.isArray(installedModules) && installedModules.includes(m.key)));

    const sectorMods = sectorModsRaw.filter(isModuleActive);
    const intelligenceMods = INTELLIGENCE_HUB_MODULES.filter(isModuleActive);
    const assistantMods = ASSISTANT_MODULES.filter(isModuleActive);

    // Ensemble de toutes les clés déjà présentes dans les groupes ci-dessus
    const alreadyShownKeys = new Set([
      ...sectorModsRaw.map((m) => m.key),
      ...INTELLIGENCE_HUB_MODULES.map((m) => m.key),
      ...ASSISTANT_MODULES.map((m) => m.key),
    ]);

    // Modules ajoutés depuis la marketplace qui n'appartiennent à aucun groupe existant et ne sont pas masqués
    const addedMods = [];
    if (Array.isArray(installedModules)) {
      installedModules.forEach((key) => {
        if (!alreadyShownKeys.has(key) && !isHidden(key)) {
          const def = getModuleByKey(key);
          if (def) addedMods.push({ ...def, removable: true });
        }
      });
    }

    return {
      sector: sectorMods,
      intelligence: intelligenceMods,
      assistants: assistantMods,
      added: addedMods,
      utility: UTILITY_MODULES,
    };
  }, [isAdminMode, userSector, installedModules, isHidden]);

  // ── Navigation ─────────────────────────────────────────────
  const getActiveKey = () => {
    const path = location.pathname;
    const all = getAllModules();
    const mod = all.find((m) => m.path === path || path.startsWith(m.path + '/'));
    if (mod) return mod.key;
    if (isAdminMode) return 'admin-dashboard';
    if (userSector === 'banking') return 'banking-dashboard';
    if (userSector === 'insurance') return 'insurance-dashboard';
    return 'dashboard';
  };

  const getDashboardPath = () => {
    if (isAdminMode) return '/admin/dashboard';
    if (userSector === 'banking') return '/banking-dashboard';
    if (userSector === 'insurance') return '/insurance-dashboard';
    return '/dashboard';
  };

  const handleSubscribeToPlan = (plan) => {
    setSubscriptionPlanModalVisible(false);
    localStorage.setItem('selectedPlan', JSON.stringify({ id: plan.id, name: plan.name, price: plan.price, billingCycle: 'monthly', code: plan.code }));
    navigate('/payment', { state: { plan: { name: plan.name, price: plan.price, billingCycle: 'monthly', code: plan.code } } });
  };

  const sectorLabel = isAdminMode ? 'Administration' : userSector === 'banking' ? 'Banque' : userSector === 'insurance' ? 'Assurance' : 'Entreprise';
  const sectorIcon = isAdminMode ? <CrownOutlined /> : userSector === 'banking' ? <BankOutlined /> : userSector === 'insurance' ? <InsuranceOutlined /> : <ApartmentOutlined />;
  const buildMenuItems = () => {
    const items = [];
    const filter = (arr) => arr.filter((m) => !searchQuery || m.label.toLowerCase().includes(searchQuery.toLowerCase()));

    const renderModuleLabel = (module, isActive) => (
      <div onMouseEnter={() => setHoveredItem(module.key)} onMouseLeave={() => setHoveredItem(null)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <Tooltip title={module.description} placement="right">
          <span style={{ fontWeight: isActive ? 600 : 400, color: isActive ? '#fff' : COLORS.textSecondary, fontSize: 13 }}>
            {collapsed ? (module.shortLabel || module.label) : truncateLabel(module.label)}
          </span>
        </Tooltip>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {!collapsed && module.badge && <Badge count={module.badge} size="small" style={{ backgroundColor: module.badgeColor, fontSize: 9 }} />}
          {module.removable && (
            <Button type="text" icon={<DeleteOutlined style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }} />} size="small"
              onClick={(e) => { e.stopPropagation(); setPendingRemove(module.key); }}
              style={{ opacity: hoveredItem === module.key ? 1 : 0, transition: 'opacity 0.2s', minWidth: 22, height: 22 }}
            />
          )}
        </div>
      </div>
    );

    // ── Groupe 1 : Métier ──────────────────────────────────
    const sectorMods = filter(activeModules.sector);
    if (sectorMods.length > 0) {
      items.push({
        key: 'sector-group',
        type: 'group',
        label: !collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: sectorColor, fontSize: 13 }}>{sectorIcon}</span>
            <span style={{ color: COLORS.textMuted, fontWeight: 700, fontSize: 10, letterSpacing: 0.5 }}>{sectorLabel.toUpperCase()}</span>
          </div>
        ),
        children: sectorMods.map((module) => {
          const isActive = location.pathname === module.path;
          return {
            key: module.key,
            icon: <span style={{ color: isActive ? sectorColor : COLORS.textMuted, fontSize: 17 }}>{isActive ? module.iconFilled : module.icon}</span>,
            label: renderModuleLabel(module, isActive),
          };
        }),
      });
      items.push({ type: 'divider' });
    }

    // ── Groupe 2 : Intelligence Hub ─────────────────────────
    const hubMods = filter(activeModules.intelligence);
    if (hubMods.length > 0) {
      items.push({
        key: 'intelligence-group',
        type: 'group',
        label: !collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#d4af37', fontSize: 13 }}><ThunderboltFilled /></span>
            <span style={{ color: COLORS.textMuted, fontWeight: 700, fontSize: 10, letterSpacing: 0.5 }}>INTELLIGENCE HUB</span>
          </div>
        ),
        children: hubMods.map((module) => {
          const isActive = location.pathname === module.path;
          return {
            key: module.key,
            icon: <span style={{ color: isActive ? (module.color || sectorColor) : COLORS.textMuted, fontSize: 17 }}>{isActive ? module.iconFilled : module.icon}</span>,
            label: renderModuleLabel(module, isActive),
          };
        }),
      });
      items.push({ type: 'divider' });
    }

    // ── Groupe 3 : Assistants IA ────────────────────────────
    const assistantMods = filter(activeModules.assistants);
    if (assistantMods.length > 0) {
      items.push({
        key: 'assistants-group',
        type: 'group',
        label: !collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#8b5cf6', fontSize: 13 }}><RobotFilled /></span>
            <span style={{ color: COLORS.textMuted, fontWeight: 700, fontSize: 10, letterSpacing: 0.5 }}>ASSISTANTS IA</span>
          </div>
        ),
        children: assistantMods.map((module) => {
          const isActive = location.pathname === module.path;
          return {
            key: module.key,
            icon: <span style={{ color: isActive ? (module.color || '#8b5cf6') : COLORS.textMuted, fontSize: 17 }}>{isActive ? module.iconFilled : module.icon}</span>,
            label: renderModuleLabel(module, isActive),
          };
        }),
      });
    }

    // ── Groupe 4 : Modules optionnels installés ─────────────
    const addedMods = filter(activeModules.added);
    if (addedMods.length > 0) {
      items.push({ type: 'divider' });
      items.push({
        key: 'added-group',
        type: 'group',
        label: !collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: sectorColor, fontSize: 13 }}><StarOutlined /></span>
            <span style={{ color: COLORS.textMuted, fontWeight: 700, fontSize: 10, letterSpacing: 0.5 }}>MES MODULES</span>
          </div>
        ),
        children: addedMods.map((module) => {
          const isActive = location.pathname === module.path;
          return {
            key: module.key,
            icon: <span style={{ color: isActive ? sectorColor : (module.color || COLORS.textMuted), fontSize: 17 }}>{isActive ? module.iconFilled : module.icon}</span>,
            label: renderModuleLabel(module, isActive),
          };
        }),
      });
    }

    // ── Groupe 5 : Utilitaires ──────────────────────────────
    const utilMods = filter(activeModules.utility);
    if (utilMods.length > 0) {
      items.push({ type: 'divider', style: { marginTop: 8 } });
      items.push({
        key: 'utility-group',
        type: 'group',
        label: !collapsed && (
          <span style={{ color: COLORS.textMuted, fontWeight: 700, fontSize: 10, letterSpacing: 0.5 }}>UTILITAIRES</span>
        ),
        children: utilMods.map((module) => {
          const isActive = location.pathname === module.path;
          return {
            key: module.key,
            icon: <span style={{ color: isActive ? sectorColor : COLORS.textMuted, fontSize: 17 }}>{isActive ? module.iconFilled : module.icon}</span>,
            label: (
              <span style={{ fontWeight: isActive ? 600 : 400, color: isActive ? sectorColor : COLORS.textSecondary, fontSize: 13 }}>
                {collapsed ? (module.shortLabel || module.label) : truncateLabel(module.label)}
              </span>
            ),
          };
        }),
      });
    }

    return items;
  };

  if (loading && !initialLoaded) {
    return (
      <Sider width={280} collapsedWidth={80} theme="dark" style={{ background: COLORS.bgSecondary, height: '100vh' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
          <Spin size="large" />
        </div>
      </Sider>
    );
  }

  return (
    <>{contextHolder}
      <Sider
        trigger={null} collapsible collapsed={collapsed} onCollapse={setCollapsed}
        theme="dark" width={280} collapsedWidth={80}
        className="professional-sidebar"
        style={{ background: COLORS.bgSecondary, height: '100vh', position: 'fixed', left: 0, top: 0, bottom: 0, zIndex: 100, borderRight: `3px solid ${borderColor}`, display: 'flex', flexDirection: 'column' }}
      >

        {/* ── ZONE 1 : Header ──────────────────────────────── */}
        <div style={{ padding: collapsed ? '20px 0' : '20px 18px', borderBottom: `2px solid ${borderColor}`, background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', position: 'relative', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', gap: 12, cursor: 'pointer' }} onClick={() => navigate(getDashboardPath())}>
            <div style={{ width: 38, height: 38, background: `linear-gradient(135deg, ${sectorColor}, ${sectorColor}80)`, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {React.cloneElement(sectorIcon, { style: { fontSize: 20, color: '#1a1a2e' } })}
            </div>
            {!collapsed && (
              <div>
                <span style={{ fontSize: 20, fontWeight: 900, color: sectorColor }}>NEXUM</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: sectorColor, animation: 'pulse 2s infinite' }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: COLORS.textMuted, letterSpacing: 1 }}>
                    {sectorLabel.toUpperCase()}
                  </span>
                </div>
              </div>
            )}
          </div>
          <Tooltip title={collapsed ? 'Agrandir' : 'Réduire'}>
            <Button type="text" icon={collapsed ? <MenuUnfoldOutlined style={{ color: sectorColor }} /> : <MenuFoldOutlined style={{ color: sectorColor }} />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }}
            />
          </Tooltip>
        </div>

        {/* ── ZONE 2 : Widget abonnement compact ───────────── */}
        <div style={{ padding: collapsed ? '8px 6px' : '10px 12px', borderBottom: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
          <div
            onClick={() => setSubscriptionPlanModalVisible(true)}
            style={{ background: `${sectorColor}12`, borderRadius: 8, padding: collapsed ? '8px 0' : '10px 12px', cursor: 'pointer', border: `1px solid ${sectorColor}25`, transition: 'all 0.2s', textAlign: collapsed ? 'center' : 'left' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = `${sectorColor}20`; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = `${sectorColor}12`; }}
          >
            {!collapsed ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <TrophyOutlined style={{ color: sectorColor, fontSize: 14 }} />
                    <Text style={{ color: COLORS.textMuted, fontSize: 10, fontWeight: 600 }}>ABONNEMENT</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: sectorColor, fontSize: 12, fontWeight: 700 }}>{subscriptionData.planName}</Text>
                    <Tag color={subscriptionData.isActive ? 'success' : 'default'} style={{ fontSize: 9, padding: '0 4px', margin: 0, lineHeight: '16px' }}>
                      {subscriptionData.isActive ? 'ACTIF' : 'INACTIF'}
                    </Tag>
                  </div>
                </div>
                <Progress
                  percent={subscriptionData.usage} showInfo={false}
                  strokeColor={subscriptionData.daysRemaining < 7 && subscriptionData.daysRemaining > 0 ? '#ef4444' : sectorColor}
                  trailColor={`${sectorColor}15`} size="small" style={{ margin: 0 }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ color: COLORS.textMuted, fontSize: 9 }}>
                    {subscriptionData.isActive
                      ? subscriptionData.daysRemaining > 0 ? `${subscriptionData.daysRemaining}j restants` : "Expire aujourd'hui"
                      : 'Aucun abonnement'}
                  </Text>
                  <Text style={{ color: sectorColor, fontSize: 10, fontWeight: 600 }}>
                    {subscriptionData.price > 0 ? `${subscriptionData.price}€/mois` : 'Gratuit'}
                  </Text>
                </div>
              </div>
            ) : (
              <Tooltip title={`${subscriptionData.planName} — ${subscriptionData.isActive ? `${subscriptionData.daysRemaining}j restants` : 'Inactif'}`} placement="right">
                <div style={{ textAlign: 'center', position: 'relative' }}>
                  <TrophyOutlined style={{ color: sectorColor, fontSize: 18 }} />
                  {subscriptionData.isActive && subscriptionData.daysRemaining < 10 && subscriptionData.daysRemaining > 0 && (
                    <div style={{ position: 'absolute', top: -4, right: -4, width: 14, height: 14, background: '#ef4444', borderRadius: '50%', fontSize: 8, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {subscriptionData.daysRemaining}
                    </div>
                  )}
                </div>
              </Tooltip>
            )}
          </div>
        </div>

        {/* ── ZONE 3 : Recherche + Menu ─────────────────────── */}
        {!collapsed && (
          <div style={{ padding: '8px 12px 4px', flexShrink: 0 }}>
            <Input
              placeholder="Rechercher un module…"
              prefix={<SearchOutlined style={{ color: COLORS.textMuted, fontSize: 13 }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              size="small"
              style={{ background: 'rgba(255,255,255,0.05)', border: `1px solid ${sectorColor}30`, borderRadius: 6, color: '#fff', fontSize: 12 }}
            />
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 10px 16px 10px', minHeight: 0 }}>
          <Menu
            mode="inline"
            selectedKeys={[getActiveKey()]}
            defaultOpenKeys={['sector-group', 'intelligence-group', 'assistants-group', 'added-group']}
            items={buildMenuItems()}
            onClick={({ key }) => {
              const all = getAllModules();
              const mod = all.find((m) => m.key === key);
              if (mod) navigate(mod.path);
            }}
            style={{ background: 'transparent', border: 'none' }}
            theme="dark"
          />
        </div>

        {/* ── ZONE 4 : Footer — Nexum Store ─────────────────── */}
        <div style={{ padding: collapsed ? '10px 6px' : '10px 12px', borderTop: `1px solid ${COLORS.border}`, flexShrink: 0 }}>
          <Tooltip title={collapsed ? 'Nexum Store — Ajouter des modules' : ''} placement="right">
            <Button
              type="primary"
              block={!collapsed}
              icon={<ShopOutlined />}
              onClick={() => navigate('/marketplace')}
              style={{
                background: `linear-gradient(135deg, ${sectorColor}, ${sectorColor}cc)`,
                border: 'none',
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 12,
                height: 36,
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: 8,
                boxShadow: `0 2px 8px ${sectorColor}40`,
              }}
            >
              {!collapsed && 'Nexum Store'}
            </Button>
          </Tooltip>
          {!collapsed && (
            <div style={{ textAlign: 'center', marginTop: 6 }}>
              <Text style={{ color: COLORS.textMuted, fontSize: 9 }}>Nexum ERP v2.0 — © 2026</Text>
            </div>
          )}
        </div>
      </Sider>

      {/* ── Modal suppression module ─────────────────────────── */}
      <Modal title="Supprimer le module" open={!!pendingRemove}
        onOk={() => handleRemoveModule(pendingRemove)} onCancel={() => setPendingRemove(null)}
        okText="Oui, supprimer" cancelText="Annuler"
        okButtonProps={{ danger: true, loading: removeLoading }}
      >
        <p>Êtes-vous sûr de vouloir supprimer ce module ?</p>
        <p style={{ color: COLORS.textMuted, fontSize: 13 }}>Vous pourrez le réactiver plus tard depuis le Nexum Store.</p>
      </Modal>

      {/* ── Modal plans d'abonnement ─────────────────────────── */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CreditCardOutlined style={{ fontSize: 22, color: sectorColor }} />
            <span style={{ fontSize: 18, fontWeight: 700 }}>Choisissez votre formule</span>
          </div>
        }
        open={subscriptionPlanModalVisible}
        onCancel={() => setSubscriptionPlanModalVisible(false)}
        footer={null} width={680} style={{ top: 50 }}
      >
        <div style={{ padding: '16px 0' }}>
          <Row gutter={[20, 20]}>
            {[
              { id: 'basic', name: 'Basic', price: 29, icon: <BankOutlined />, desc: 'Pour démarrer', features: ["Jusqu'à 5 utilisateurs", 'Modules de base', 'Support standard', 'Stockage 10GB'], highlight: false },
              { id: 'premium', name: 'Premium', price: 79, icon: <CrownOutlined />, desc: 'Pour les pros', features: ["Jusqu'à 20 utilisateurs", 'Tous les modules', 'Support prioritaire', 'Stockage 100GB', 'API illimitée'], highlight: true },
              { id: 'enterprise', name: 'Enterprise', price: 199, icon: <TrophyOutlined />, desc: 'Sur mesure', features: ['Utilisateurs illimités', 'Tous les modules Premium', 'Support dédié 24/7', 'Stockage illimité', 'SLA garanti'], highlight: false },
            ].map((plan) => (
              <Col xs={24} md={8} key={plan.id}>
                <Card hoverable style={{ borderRadius: 14, border: `${plan.highlight ? 2 : 1}px solid ${plan.highlight ? sectorColor : `${sectorColor}30`}`, height: '100%', position: 'relative', overflow: 'hidden' }}>
                  {plan.highlight && (
                    <div style={{ position: 'absolute', top: 10, right: -28, background: sectorColor, color: 'white', padding: '3px 36px', transform: 'rotate(45deg)', fontSize: 10, fontWeight: 'bold' }}>POPULAIRE</div>
                  )}
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <div style={{ width: 52, height: 52, background: `${sectorColor}${plan.highlight ? '30' : '15'}`, borderRadius: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                      <span style={{ fontSize: 24, color: sectorColor }}>{plan.icon}</span>
                    </div>
                    <Title level={5} style={{ marginBottom: 2 }}>{plan.name}</Title>
                    <Text type="secondary" style={{ fontSize: 12 }}>{plan.desc}</Text>
                    <div style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 24, fontWeight: 'bold', color: sectorColor }}>{plan.price}€</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>/mois</Text>
                    </div>
                  </div>
                  <Divider style={{ margin: '10px 0' }} />
                  <List size="small" dataSource={plan.features} renderItem={(item) => (
                    <List.Item style={{ border: 'none', padding: '4px 0' }}>
                      <CheckCircleOutlined style={{ color: '#22c55e', marginRight: 6, fontSize: 12 }} />
                      <Text style={{ fontSize: 12 }}>{item}</Text>
                    </List.Item>
                  )} />
                  <Button type={plan.highlight ? 'primary' : 'default'} block
                    style={{ marginTop: 14, borderRadius: 8, borderColor: sectorColor, color: plan.highlight ? '#fff' : sectorColor, background: plan.highlight ? sectorColor : 'transparent' }}
                    onClick={() => handleSubscribeToPlan({ id: plan.id, name: plan.name, price: plan.price, code: plan.id })}
                  >
                    Choisir ce plan
                  </Button>
                </Card>
              </Col>
            ))}
          </Row>
          <Divider style={{ margin: '20px 0 10px' }} />
          <div style={{ textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Tous nos plans incluent <strong>14 jours d'essai gratuit</strong>. Annulez à tout moment.
            </Text>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default Sidebar;