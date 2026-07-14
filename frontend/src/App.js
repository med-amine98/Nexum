import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Layout, theme, Spin, ConfigProvider } from 'antd';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AssistantResponseBubble from './components/Assistant/AssistantResponseBubble';

// ===== PROVIDERS =====
import { AuthProvider, useAuth } from './services/auth';
import { AssistantProvider } from './context/AssistantContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { ModuleProvider } from './context/ModuleContext';
import './i18n';

// ===== LAYOUT COMPONENTS =====
import Sidebar from './components/Layout/Sidebar';
import TopBar from './components/Layout/TopBar';
import SuperAdminLayout from './components/Layout/SuperAdminLayout';

// ===== ASSISTANT COMPONENTS =====
import SelectedAssistant from './components/Assistant/SelectedAssistant';
import AssistantBubble from './components/Assistant/AssistantBubble';
import CopilotBubble from './components/Copilot/CopilotBubble';

// ===== PAGES PUBLIQUES =====
import Home from './pages/Home.js';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import AdminLogin from './pages/AdminLogin';
import AdminSignup from './pages/AdminSignup';
import SplashScreen from './pages/SplashScreen';
import Contact from './pages/Contact';
import Marketplace from './pages/Marketplace';
// ===== PAGES DE TARIFICATION ET PAIEMENT =====
import Pricing from './pages/Pricing';
import Payment from './pages/Payment';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import Billing from './pages/Billing';
import Invoices from './pages/Invoices';
import Subscription from './pages/Subscription';

// ===== MODULES MÉTIER DE BASE =====
import Dashboard from './modules/dashboard/Dashboard';
import SmartDashboard from './modules/dashboard/SmartDashboard';
import SaleDashboard from './modules/sale/SaleDashboard';
import SaleOrders from './modules/sale/SaleOrders';
import PurchaseDashboard from './modules/purchase/PurchaseDashboard';
import CRMDashboard from './modules/crm/CRMDashboard';
import AccountDashboard from './modules/account/AccountDashboard';
import StockDashboard from './modules/stock/StockDashboard';
import HRDashboard from './modules/hr/HRDashboard';
import ProjectDashboard from './modules/project/ProjectDashboard';
import Settings from './modules/settings/Settings';

// ===== MODULES IA INTELLIGENTS =====
import AdminDashboard from './modules/admin/AdminDashboard';
import AIAssistant from './modules/ai/AIAssistant';
import PredictiveAnalytics from './modules/analytics/PredictiveAnalytics';
import FraudDetection from './modules/security/FraudDetection';

import RiskManagement from './modules/risk/RiskManagement';
import BusinessInsights from './modules/business/BusinessInsights';
import SecurityCenter from './modules/admin/SecurityCenter';

// ===== MODULES TECHNOLOGIQUES =====
import OCR from './modules/OCR/OCR';
import PerformanceMonitor from './modules/performance/PerformanceMonitor';
import Blockchain from './modules/blockchain/Blockchain';
import ModelsCatalog from './modules/models/ModelsCatalog';

// ===== SUPER ADMIN MODULES =====
import SuperAdminDashboard from './modules/superadmin/SuperAdminDashboard';
import UsersManagement from './modules/superadmin/UsersManagement';
import CompaniesManagement from './modules/superadmin/CompaniesManagement';
import ModelRequestsManagement from './modules/superadmin/ModelRequestsManagement';
import UserDetail from './modules/superadmin/UserDetail';
import CompanyDetail from './modules/superadmin/CompanyDetail';
import RequestDetail from './modules/superadmin/RequestDetail';

// ===== MODULES BANKING & INSURANCE =====
import CreditScoring from './modules/banking/CreditScoring';
import FraudDetectionBanking from './modules/banking/FraudDetectionBanking';
import AMLCompliance from './modules/banking/AMLCompliance';
import ChurnPredictionBanking from './modules/banking/ChurnPredictionBanking';
import KYCAutomation from './modules/banking/KYCAutomation';
import ClaimsProcessing from './modules/insurance/ClaimsProcessing';
import FraudDetectionInsurance from './modules/insurance/FraudDetectionInsurance';
import RiskScoringInsurance from './modules/insurance/RiskScoringInsurance';
import CatastropheModeling from './modules/insurance/CatastropheModeling';
import DocumentIntelligence from './modules/shared/DocumentIntelligence';

// ===== DASHBOARDS CLIENTS SPÉCIALISÉS =====
import BankingDashboard from './modules/banking/BankingDashboard';
import InsuranceDashboard from './modules/insurance/InsuranceDashboard';
import EnterpriseDashboard from './modules/enterprise/EnterpriseDashboard';

// ===== NOUVEAUX MODULES - ANALYSE & INSURANCE =====
import CallAnalytics from './modules/call-analytics/CallAnalytics';
import ClaimDeclaration from './modules/claims/ClaimDeclaration';
import ClaimTracking from './modules/claims/ClaimTracking';
import ClaimTrackingList from './modules/claims/ClaimTrackingList';
import KanbanBoard from './modules/project/KanbanBoard';
import DamageEstimation from './modules/claims/DamageEstimation';
import WarrantyRecommender from './modules/insurance/WarrantyRecommender';
import RiskPrevention from './modules/insurance/RiskPrevention';

import QuoteGenerator from './modules/ai/QuoteGenerator';

// === INNOVATION MODULES ===
import CyberShield from './modules/innovation/CyberShield';
import DigitalTwin from './modules/innovation/DigitalTwin';
import Advanced3DTwin from './modules/dashboard/Advanced3DTwin';
import NexumAgents from './modules/agents/NexumAgents';
import ESGTracker from './modules/esg/ESGTracker';
import NexumPredict from './modules/innovation/NexumPredict';
// === NEW 3D TWIN MODULES ===
import FraudDetectionBank3D from './modules/banking/FraudDetectionBank3D';
import DamageEstimation3D from './modules/insurance/DamageEstimation3D';
import ClimateRiskModeling3D from './modules/insurance/ClimateRiskModeling3D';
import OrganizedFraudRings3D from './modules/risk/OrganizedFraudRings3D';
import TalentMapping3D from './modules/hr/TalentMapping3D';
import SmartClaims from './modules/innovation/SmartClaims';
import OmnichannelPortal from './modules/customer/OmnichannelPortal';
import AIGenerator from './modules/ai/AIGenerator';
import AutoResolveTicket from './modules/support/AutoResolveTicket';
import SecurityCompliance from './modules/security/SecurityCompliance';
import NexyAvatar from './components/AI/NexyAvatar';
import MagicTask from './components/AI/MagicTask';
import FraudPipelineTest from './modules/intelligence/FraudPipelineTest';
import SubscriptionPortal from './modules/saas/SubscriptionPortal';
import ModelsAssistantsPlace from './modules/intelligence/ModelsAssistantsPlace';
// ===== ASSISTANT PAGES =====
import AssistantWorkspace from './pages/AssistantWorkspace';
import AssistantPredictPage from './pages/AssistantPredictPage';
import AssistantRiskPage from './pages/AssistantRiskPage';
import AssistantGrowthPage from './pages/AssistantGrowthPage';


// ===== CONSTANTES =====
const { Content } = Layout;
const queryClient = new QueryClient();

// ===== COMPOSANT DE CHARGEMENT =====
const LoadingScreen = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh',
    background: 'var(--bg-primary)' 
  }}>
    <Spin size="large" tip="Chargement..." ><div/></Spin>
  </div>
);

// ===== COMPOSANT DE REDIRECTION CLIENT =====
const ClientDashboardRedirect = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const sector = user?.sector || localStorage.getItem('userSector');
    if (sector === 'bank' || sector === 'banking') {
      navigate('/banking-dashboard', { replace: true });
    } else if (sector === 'insurance') {
      navigate('/insurance-dashboard', { replace: true });
    } else if (sector === 'enterprise') {
      navigate('/enterprise-dashboard', { replace: true });
    } else {
      navigate('/enterprise-dashboard', { replace: true });
    }
  }, [user, navigate]);

  return <LoadingScreen />;
};

// ===== COMPOSANT DE GESTION DE LA SPLASH SCREEN =====
const SplashScreenWrapper = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const hasSeenSplash = sessionStorage.getItem('hasSeenSplash');
    
    if (hasSeenSplash) {
      navigate('/home', { replace: true });
    } else {
      sessionStorage.setItem('hasSeenSplash', 'true');
      
      const timer = setTimeout(() => {
        navigate('/home', { replace: true });
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [navigate]);

  return <SplashScreen />;
};

// ===== GUARDS =====
const SuperAdminGuard = ({ children }) => {
  const { user, userRole, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
      } else if (userRole !== 'super_admin') {
        navigate('/dashboard');
      }
    }
  }, [user, userRole, loading, navigate]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user || userRole !== 'super_admin') {
    return null;
  }

  return children;
};

const AdminGuard = ({ children }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/admin/login');
      } else if (user.role !== 'admin') {
        navigate('/dashboard');
      }
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return children;
};

const ClientGuard = ({ children, allowedRoles = ['bank', 'insurance', 'enterprise'] }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
      } else if (!allowedRoles.includes(user.role) && 
                 user.role !== 'admin' && 
                 user.role !== 'super_admin') {
        navigate('/dashboard');
      }
    }
  }, [user, loading, navigate, allowedRoles]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return children;
};

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingScreen />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// ===== LAYOUT PRINCIPAL =====
const AppLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const { user, loading } = useAuth();
  
  const {
    token: { borderRadiusLG },
  } = theme.useToken();

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return children;
  }

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} />
      
      <Layout style={{ 
        marginLeft: collapsed ? '80px' : '280px',
        transition: 'var(--transition-base)',
        width: collapsed ? 'calc(100% - 80px)' : 'calc(100% - 280px)',
        background: 'transparent',
        position: 'relative'
      }}>
        {/* Orbe décoratif en arrière-plan */}
        <div style={{
          position: 'absolute',
          top: '10%',
          right: '5%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(29, 78, 216, 0.05) 0%, transparent 70%)',
          zIndex: 0,
          pointerEvents: 'none'
        }} />

        <TopBar collapsed={collapsed} setCollapsed={setCollapsed} />
        
        <Content style={{ 
          margin: '24px 24px', 
          padding: 32, 
          background: 'var(--bg-secondary)', 
          backdropFilter: 'var(--blur-md)',
          WebkitBackdropFilter: 'var(--blur-md)',
          borderRadius: 24,
          border: '1px solid var(--border-color)',
          minHeight: 'calc(100vh - 128px)',
          overflowY: 'auto',
          zIndex: 1,
          boxShadow: 'var(--shadow-xl)'
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

// ===== LAYOUT SUPER ADMIN =====
const SuperAdminLayoutWrapper = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  
  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken();

  return (
    <Layout style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} isSuperAdmin={true} />
      
      <Layout style={{ 
        marginLeft: collapsed ? '80px' : '280px',
        transition: 'margin-left 0.3s ease',
        width: collapsed ? 'calc(100% - 80px)' : 'calc(100% - 280px)',
        background: 'var(--bg-primary)'
      }}>
        <TopBar collapsed={collapsed} setCollapsed={setCollapsed} />
        
        <Content style={{ 
          margin: '24px 16px', 
          padding: 24, 
          background: 'var(--bg-secondary)', 
          borderRadius: borderRadiusLG,
          border: '1px solid var(--border-color)',
          minHeight: 'calc(100vh - 118px)',
          overflowY: 'auto'
        }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

// ===== COMPOSANT DE ROUTAGE =====
const AppRoutes = () => {
  const { loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      {/* ===== ROUTES PUBLIQUES ===== */}
      <Route path="/" element={<SplashScreenWrapper />} />
      <Route path="/home" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/Contact" element={<Contact />} />
      <Route path="/marketplace" element={<ProtectedRoute><AppLayout><Marketplace /></AppLayout></ProtectedRoute>} />
      {/* ===== ROUTES ADMIN PUBLIQUES ===== */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/signup" element={<AdminSignup />} />
      
      {/* ===== ROUTES DE PAIEMENT PROTÉGÉES ===== */}
      <Route path="/payment" element={<ProtectedRoute><Payment /></ProtectedRoute>} />
      <Route path="/payment/success" element={<ProtectedRoute><PaymentSuccess /></ProtectedRoute>} />
      <Route path="/payment/cancel" element={<ProtectedRoute><PaymentCancel /></ProtectedRoute>} />
      <Route path="/billing" element={<ProtectedRoute><Billing /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
      <Route path="/subscription" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
      <Route path="/saas/subscription" element={<ProtectedRoute><AppLayout><SubscriptionPortal /></AppLayout></ProtectedRoute>} />
      
      {/* ===== DASHBOARDS CLIENTS SPÉCIALISÉS ===== */}
      <Route path="/banking-dashboard" element={<ProtectedRoute><AppLayout><BankingDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/insurance-dashboard" element={<ProtectedRoute><AppLayout><InsuranceDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/enterprise-dashboard" element={<ProtectedRoute><AppLayout><EnterpriseDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/client-dashboard" element={<ClientGuard><AppLayout><ClientDashboardRedirect /></AppLayout></ClientGuard>} />
      
      {/* ===== NOUVEAUX MODULES - ANALYSE APPELS ===== */}
      <Route path="/call-analytics" element={<ProtectedRoute><AppLayout><CallAnalytics /></AppLayout></ProtectedRoute>} />
      
      {/* ===== NOUVEAUX MODULES - SINISTRES ===== */}
      <Route path="/claims/declaration" element={<ProtectedRoute><AppLayout><ClaimDeclaration /></AppLayout></ProtectedRoute>} />
      <Route path="/claims/tracking-list" element={<ProtectedRoute><AppLayout><ClaimTrackingList /></AppLayout></ProtectedRoute>} />
      <Route path="/claims/tracking/:claimId" element={<ProtectedRoute><AppLayout><ClaimTracking /></AppLayout></ProtectedRoute>} />
      <Route path="/claims/estimation" element={<ProtectedRoute><AppLayout><DamageEstimation /></AppLayout></ProtectedRoute>} />
      
      {/* ===== NOUVEAUX MODULES - ASSURANCE ===== */}
      <Route path="/insurance/warranties" element={<ProtectedRoute><AppLayout><WarrantyRecommender /></AppLayout></ProtectedRoute>} />
      <Route path="/insurance/prevention" element={<ProtectedRoute><AppLayout><RiskPrevention /></AppLayout></ProtectedRoute>} />
      
      {/* ===== NOUVEAUX MODULES - CLIENT ===== */}
      <Route path="/customer/omnichannel" element={<ProtectedRoute><AppLayout><OmnichannelPortal /></AppLayout></ProtectedRoute>} />
      
      {/* ===== ROUTES ADMIN PROTÉGÉES ===== */}
      <Route path="/admin/dashboard" element={<AdminGuard><AppLayout><AdminDashboard /></AppLayout></AdminGuard>} />
      <Route path="/admin/users" element={<AdminGuard><AppLayout><UsersManagement /></AppLayout></AdminGuard>} />
      <Route path="/admin/settings" element={<AdminGuard><AppLayout><Settings /></AppLayout></AdminGuard>} />
      <Route path="/admin/companies" element={<AdminGuard><AppLayout><CompaniesManagement /></AppLayout></AdminGuard>} />
      <Route path="/admin/security" element={<AdminGuard><AppLayout><FraudDetection /></AppLayout></AdminGuard>} />
      <Route path="/admin/payments" element={<AdminGuard><AppLayout><Billing /></AppLayout></AdminGuard>} />
      <Route path="/admin/subscriptions" element={<AdminGuard><AppLayout><Subscription /></AppLayout></AdminGuard>} />
      
      {/* ===== MODULES MÉTIER DE BASE ===== */}
      <Route path="/dashboard" element={<ProtectedRoute><AppLayout><ClientDashboardRedirect /></AppLayout></ProtectedRoute>} />
      <Route path="/smart-dashboard" element={<ProtectedRoute><AppLayout><SmartDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/sale" element={<ProtectedRoute><AppLayout><SaleDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/sale/orders" element={<ProtectedRoute><AppLayout><SaleOrders /></AppLayout></ProtectedRoute>} />
      <Route path="/purchase" element={<ProtectedRoute><AppLayout><PurchaseDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/crm" element={<ProtectedRoute><AppLayout><CRMDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/account" element={<ProtectedRoute><AppLayout><AccountDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/stock" element={<ProtectedRoute><AppLayout><StockDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/hr" element={<ProtectedRoute><AppLayout><HRDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/project" element={<ProtectedRoute><AppLayout><ProjectDashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/project/kanban" element={<ProtectedRoute><AppLayout><KanbanBoard /></AppLayout></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><AppLayout><Profile /></AppLayout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
      <Route path="/security" element={<ProtectedRoute><AppLayout><SecurityCenter /></AppLayout></ProtectedRoute>} />
      <Route path="/security/compliance" element={<ProtectedRoute><AppLayout><SecurityCompliance /></AppLayout></ProtectedRoute>} />
      <Route path="/ai/nexy" element={<ProtectedRoute><AppLayout><NexyAvatar /></AppLayout></ProtectedRoute>} />
      <Route path="/ai/task" element={<ProtectedRoute><AppLayout><MagicTask /></AppLayout></ProtectedRoute>} />
      <Route path="/intelligence/pipeline-test" element={<ProtectedRoute><AppLayout><FraudPipelineTest /></AppLayout></ProtectedRoute>} />
      
      {/* ===== MODULES IA INTELLIGENTS ===== */}
      <Route path="/security/fraud" element={<ProtectedRoute><AppLayout><FraudDetection /></AppLayout></ProtectedRoute>} />
      <Route path="/ai/assistant" element={<ProtectedRoute><AppLayout><AIAssistant /></AppLayout></ProtectedRoute>} />
      <Route path="/analytics/predictive" element={<ProtectedRoute><AppLayout><PredictiveAnalytics /></AppLayout></ProtectedRoute>} />
      <Route path="/risk/management" element={<ProtectedRoute><AppLayout><RiskManagement /></AppLayout></ProtectedRoute>} />
      <Route path="/insights/business" element={<ProtectedRoute><AppLayout><BusinessInsights /></AppLayout></ProtectedRoute>} />
      <Route path="/models" element={<ProtectedRoute><AppLayout><ModelsCatalog /></AppLayout></ProtectedRoute>} />
      
      {/* ===== MODULES TECHNOLOGIQUES ===== */}
      <Route path="/ocr" element={<ProtectedRoute><AppLayout><OCR /></AppLayout></ProtectedRoute>} />
      <Route path="/performance/monitor" element={<ProtectedRoute><AppLayout><PerformanceMonitor /></AppLayout></ProtectedRoute>} />
      <Route path="/blockchain" element={<ProtectedRoute><AppLayout><Blockchain /></AppLayout></ProtectedRoute>} />
      
      {/* ===== INNOVATION & INTELLIGENCE HUB ===== */}
      <Route path="/intelligence/cyber-shield" element={<ProtectedRoute><AppLayout><CyberShield /></AppLayout></ProtectedRoute>} />
      <Route path="/intelligence/digital-twin" element={<ProtectedRoute><AppLayout><DigitalTwin /></AppLayout></ProtectedRoute>} />
      <Route path="/intelligence/agents" element={<ProtectedRoute><AppLayout><NexumAgents /></AppLayout></ProtectedRoute>} />
      <Route path="/intelligence/esg" element={<ProtectedRoute><AppLayout><ESGTracker /></AppLayout></ProtectedRoute>} />
      <Route path="/intelligence/predict" element={<ProtectedRoute><AppLayout><NexumPredict /></AppLayout></ProtectedRoute>} />
      <Route path="/intelligence/smart-claims" element={<ProtectedRoute><AppLayout><SmartClaims /></AppLayout></ProtectedRoute>} />
      <Route path="/intelligence/fraud-bank-3d" element={<ProtectedRoute><AppLayout><FraudDetectionBank3D /></AppLayout></ProtectedRoute>} />
      <Route path="/intelligence/damage-estimation-3d" element={<ProtectedRoute><AppLayout><DamageEstimation3D /></AppLayout></ProtectedRoute>} />
      <Route path="/intelligence/climate-risk-3d" element={<ProtectedRoute><AppLayout><ClimateRiskModeling3D /></AppLayout></ProtectedRoute>} />
      <Route path="/intelligence/fraud-rings-3d" element={<ProtectedRoute><AppLayout><OrganizedFraudRings3D /></AppLayout></ProtectedRoute>} />
      <Route path="/intelligence/talent-mapping-3d" element={<ProtectedRoute><AppLayout><TalentMapping3D /></AppLayout></ProtectedRoute>} />
      <Route path="/intelligence/assistants-3d-place" element={<ProtectedRoute><AppLayout><ModelsAssistantsPlace /></AppLayout></ProtectedRoute>} />
      
      {/* ===== MODULES BANKING & INSURANCE ===== */}
      <Route path="/banking/credit-scoring" element={<ProtectedRoute><AppLayout><CreditScoring /></AppLayout></ProtectedRoute>} />
      <Route path="/banking/fraud-detection" element={<ProtectedRoute><AppLayout><FraudDetectionBanking /></AppLayout></ProtectedRoute>} />
      <Route path="/banking/aml" element={<ProtectedRoute><AppLayout><AMLCompliance /></AppLayout></ProtectedRoute>} />
      <Route path="/banking/churn-prediction" element={<ProtectedRoute><AppLayout><ChurnPredictionBanking /></AppLayout></ProtectedRoute>} />
      <Route path="/banking/kyc" element={<ProtectedRoute><AppLayout><KYCAutomation /></AppLayout></ProtectedRoute>} />
      <Route path="/insurance/claims" element={<ProtectedRoute><AppLayout><ClaimsProcessing /></AppLayout></ProtectedRoute>} />
      <Route path="/insurance/fraud-detection" element={<ProtectedRoute><AppLayout><FraudDetectionInsurance /></AppLayout></ProtectedRoute>} />
      <Route path="/insurance/risk-scoring" element={<ProtectedRoute><AppLayout><RiskScoringInsurance /></AppLayout></ProtectedRoute>} />
      <Route path="/insurance/catastrophe" element={<ProtectedRoute><AppLayout><CatastropheModeling /></AppLayout></ProtectedRoute>} />
      <Route path="/shared/document-intelligence" element={<ProtectedRoute><AppLayout><DocumentIntelligence /></AppLayout></ProtectedRoute>} />
      <Route path="/ai/report-generator" element={<ProtectedRoute><AppLayout><AIGenerator /></AppLayout></ProtectedRoute>} />
      <Route path="/support/auto-resolve" element={<ProtectedRoute><AppLayout><AutoResolveTicket /></AppLayout></ProtectedRoute>} />
      {/* ===== SUPER ADMIN ===== */}
      <Route path="/superadmin" element={<SuperAdminGuard><SuperAdminLayoutWrapper /></SuperAdminGuard>}>
        <Route index element={<SuperAdminDashboard />} />
        <Route path="users" element={<UsersManagement />} />
        <Route path="companies" element={<CompaniesManagement />} />
        <Route path="requests" element={<ModelRequestsManagement />} />
        <Route path="fraud" element={<FraudDetection />} />
        <Route path="security" element={<SecurityCenter />} />
        <Route path="users/:id" element={<UserDetail />} />
        <Route path="companies/:id" element={<CompanyDetail />} />
        <Route path="requests/:id" element={<RequestDetail />} />
        <Route path="payments" element={<Billing />} />
        <Route path="subscriptions" element={<Subscription />} />
      </Route>
      
      {/* ===== ASSISTANT PAGES ===== */}
      <Route path="/assistant/predict" element={<ProtectedRoute><AppLayout><AssistantPredictPage /></AppLayout></ProtectedRoute>} />
      <Route path="/assistant/risk" element={<ProtectedRoute><AppLayout><AssistantRiskPage /></AppLayout></ProtectedRoute>} />
      <Route path="/assistant/growth" element={<ProtectedRoute><AppLayout><AssistantGrowthPage /></AppLayout></ProtectedRoute>} />
      <Route path="/assistant/:assistantId" element={<ProtectedRoute><AppLayout><AssistantWorkspace /></AppLayout></ProtectedRoute>} />
      <Route path="/ai/quote-generator" element={<ProtectedRoute><AppLayout><QuoteGenerator /></AppLayout></ProtectedRoute>} />
      {/* ===== REDIRECTION PAR DÉFAUT ===== */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const YourComponent = () => {
  return (
    <>
      {/* Nexy Predict */}
      <AssistantResponseBubble
        type="predict"
        color="#1890ff"
        name="Nexy Predict"
        initialPosition={{ bottom: 260, right: 30 }}
        onResponse={(response) => console.log('Réponse reçue:', response)}
      />

      {/* Nexy Risk */}
      <AssistantResponseBubble
        type="risk"
        color="#f5222d"
        name="Nexy Risk"
        initialPosition={{ bottom: 190, right: 30 }}
      />

      {/* Nexy Growth */}
      <AssistantResponseBubble
        type="growth"
        color="#52c41a"
        name="Nexy Growth"
        initialPosition={{ bottom: 120, right: 30 }}
      />
    </>
  );
};

// ===== COMPOSANT PRINCIPAL =====
const AppContent = () => {
  const { theme: currentTheme } = useTheme();

  return (
    <ConfigProvider
      theme={{
        algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563eb', // Bleu Premium
          colorInfo: '#2563eb',
          colorSuccess: '#22c55e',
          colorWarning: '#f97316', // Orange
          colorError: '#ef4444',
          borderRadius: 16,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          colorBgBase: currentTheme === 'dark' ? '#0f172a' : '#f8fafc',
          colorBgContainer: currentTheme === 'dark' ? '#1e293b' : '#ffffff',
          colorBgLayout: currentTheme === 'dark' ? '#0f172a' : '#f8fafc',
          colorTextBase: currentTheme === 'dark' ? '#f8fafc' : '#0f172a',
          colorBorder: currentTheme === 'dark' ? '#334155' : '#e2e8f0',
        },
      }}
    >
      <AuthProvider>
        <AssistantProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppRoutes />
            
            {/* ===== COMPOSANTS GLOBAUX ===== */}
            <AssistantBubble />
            <SelectedAssistant />
            <CopilotBubble />
          </Router>
        </AssistantProvider>
      </AuthProvider>
    </ConfigProvider>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ModuleProvider>
          <AppContent />
        </ModuleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
const callAssistant = async (agentName, query) => {
  const response = await fetch('http://backend:8000/api/v1/assistants/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agent_name: agentName,
      query: query,
      user_id: 1
    })
  });
  const data = await response.json();
  return data.response;
};
export default App;