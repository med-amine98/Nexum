// Marketplace.js - Refonte complète : catégories alignées sur le Sidebar + UI premium
import React, { useState, useEffect, useMemo } from 'react';
import { Row, Col, Card, Button, Tag, Typography, message, Modal, Empty, Spin, Badge, Tooltip } from 'antd';
import {
  ShoppingCartOutlined, CheckCircleOutlined, LockOutlined, RocketOutlined,
  SearchOutlined, AppstoreOutlined, BankOutlined, ApartmentOutlined,
  ThunderboltOutlined, SafetyOutlined, StarOutlined, DeleteOutlined,
  DashboardOutlined, ShopOutlined, TeamOutlined, WalletOutlined,
  DatabaseOutlined, UserOutlined, ProjectOutlined, FileTextOutlined,
  DollarOutlined, CameraOutlined, RobotOutlined, ScanOutlined,
  FundOutlined, SafetyCertificateFilled, LayoutOutlined, GlobalOutlined,
  BookOutlined, PhoneOutlined, CustomerServiceOutlined, RiseOutlined,
  FallOutlined, LineChartOutlined, ClockCircleOutlined, MedicineBoxOutlined,
  EuroOutlined, WarningOutlined, NodeIndexOutlined, InsuranceOutlined,
  FundFilled, ApiOutlined, BulbOutlined, ShoppingOutlined,
  SafetyCertificateOutlined, ThunderboltFilled, SecurityScanOutlined,
  DeploymentUnitOutlined, EnvironmentOutlined, RobotFilled,
  CarOutlined, CrownOutlined, TrophyOutlined
} from '@ant-design/icons';
import api from '../services/api';
import { useModules } from '../context/ModuleContext';
import { useNavigate } from 'react-router-dom';
import './Marketplace.css';

const { Title, Text } = Typography;

// ─────────────────────────────────────────────────────────────
// Mapping icônes (identique au Sidebar pour cohérence)
// ─────────────────────────────────────────────────────────────
const ICON_MAP = {
  DashboardOutlined: <DashboardOutlined />,
  ShoppingOutlined: <ShoppingOutlined />,
  ShoppingCartOutlined: <ShoppingCartOutlined />,
  TeamOutlined: <TeamOutlined />,
  WalletOutlined: <WalletOutlined />,
  DatabaseOutlined: <DatabaseOutlined />,
  UserOutlined: <UserOutlined />,
  ProjectOutlined: <ProjectOutlined />,
  FileTextOutlined: <FileTextOutlined />,
  DollarOutlined: <DollarOutlined />,
  CameraOutlined: <CameraOutlined />,
  RobotOutlined: <RobotOutlined />,
  RobotFilled: <RobotFilled />,
  ScanOutlined: <ScanOutlined />,
  FundOutlined: <FundOutlined />,
  FundFilled: <FundFilled />,
  SafetyCertificateFilled: <SafetyCertificateFilled />,
  SafetyCertificateOutlined: <SafetyCertificateOutlined />,
  LayoutOutlined: <LayoutOutlined />,
  GlobalOutlined: <GlobalOutlined />,
  BookOutlined: <BookOutlined />,
  PhoneOutlined: <PhoneOutlined />,
  CustomerServiceOutlined: <CustomerServiceOutlined />,
  RiseOutlined: <RiseOutlined />,
  FallOutlined: <FallOutlined />,
  LineChartOutlined: <LineChartOutlined />,
  ClockCircleOutlined: <ClockCircleOutlined />,
  MedicineBoxOutlined: <MedicineBoxOutlined />,
  EuroOutlined: <EuroOutlined />,
  WarningOutlined: <WarningOutlined />,
  NodeIndexOutlined: <NodeIndexOutlined />,
  ThunderboltOutlined: <ThunderboltOutlined />,
  BankOutlined: <BankOutlined />,
  ApartmentOutlined: <ApartmentOutlined />,
  AppstoreOutlined: <AppstoreOutlined />,
  InsuranceOutlined: <InsuranceOutlined />,
  SafetyOutlined: <SafetyOutlined />,
  ApiOutlined: <ApiOutlined />,
  BulbOutlined: <BulbOutlined />,
  ShopOutlined: <ShopOutlined />,
  SecurityScanOutlined: <SecurityScanOutlined />,
  DeploymentUnitOutlined: <DeploymentUnitOutlined />,
  EnvironmentOutlined: <EnvironmentOutlined />,
  CarOutlined: <CarOutlined />,
  CrownOutlined: <CrownOutlined />,
  TrophyOutlined: <TrophyOutlined />,
};

const getIcon = (name) => ICON_MAP[name] || <RocketOutlined />;

// ─────────────────────────────────────────────────────────────
// Catégories — alignées avec les groupes du Sidebar
// ─────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    key: 'all',
    label: 'Tous les modules',
    icon: <AppstoreOutlined />,
    gradient: 'linear-gradient(135deg,#1e40af,#0d9488)',
    description: 'Toute la bibliothèque Nexum',
  },
  {
    key: 'Core Business',
    label: 'Core Business',
    icon: <ApartmentOutlined />,
    gradient: 'linear-gradient(135deg,#1e3a8a,#1e40af)',
    description: 'Ventes, achats, CRM, RH, stock, projets',
  },
  {
    key: 'Intelligence Hub',
    label: 'Intelligence Hub',
    icon: <ThunderboltFilled style={{ color: '#d4af37' }} />,
    gradient: 'linear-gradient(135deg,#78350f,#d4af37)',
    description: 'Modules premium 3D & IA avancée',
    badge: 'PREMIUM',
  },
  {
    key: 'Banque & Finance',
    label: 'Banque & Finance',
    icon: <BankOutlined />,
    gradient: 'linear-gradient(135deg,#0d9488,#0f766e)',
    description: 'KYC, AML, crédit scoring, anti-fraude',
  },
  {
    key: 'Assurance',
    label: 'Assurance',
    icon: <InsuranceOutlined />,
    gradient: 'linear-gradient(135deg,#fa8c16,#d46b08)',
    description: 'Sinistres, catastrophes, scoring risque',
  },
  {
    key: 'Assistants IA',
    label: 'Assistants IA',
    icon: <RobotFilled />,
    gradient: 'linear-gradient(135deg,#4c1d95,#7c3aed)',
    description: 'Copilot, James, Sophie, Elena',
    badge: 'IA',
  },
  {
    key: 'IA Générative',
    label: 'IA Générative',
    icon: <BulbOutlined />,
    gradient: 'linear-gradient(135deg,#667eea,#764ba2)',
    description: 'Rapports, devis, génération automatique',
  },
  {
    key: 'Support IA',
    label: 'Support IA',
    icon: <CustomerServiceOutlined />,
    gradient: 'linear-gradient(135deg,#1890ff,#096dd9)',
    description: 'Tickets auto-résolus, analyse appels',
  },
  {
    key: 'Assurance IA',
    label: 'Assurance IA',
    icon: <SafetyCertificateFilled />,
    gradient: 'linear-gradient(135deg,#f5222d,#cf1322)',
    description: 'Déclarations, suivi, estimation dommages',
  },
  {
    key: 'Modules Transversaux',
    label: 'Modules Transversaux',
    icon: <GlobalOutlined />,
    gradient: 'linear-gradient(135deg,#475569,#334155)',
    description: 'OCR, blockchain, performance, kanban',
  },
  {
    key: 'Dashboards',
    label: 'Dashboards',
    icon: <DashboardOutlined />,
    gradient: 'linear-gradient(135deg,#10b981,#059669)',
    description: 'Tableaux de bord spécialisés',
  },
  {
    key: 'Technologies',
    label: 'Technologies',
    icon: <ApiOutlined />,
    gradient: 'linear-gradient(135deg,#2f54eb,#1d39c4)',
    description: 'Blockchain, API avancées',
  },
];

// ─────────────────────────────────────────────────────────────
// Composant carte module
// ─────────────────────────────────────────────────────────────
const ModuleCard = ({ module, onBuy, onActivate, onUninstall, isInstalled, activating }) => {
  const isPaid = isInstalled || module.user_installed;
  const isFree = module.is_free;

  const cat = CATEGORIES.find((c) => c.key === module.category) || CATEGORIES[0];
  const coverGradient = module.color
    ? `linear-gradient(135deg, ${module.color}cc, #0f172a)`
    : cat.gradient;

  const badgeLabel = module.badge || (isFree ? null : 'PREMIUM');
  const badgeBg = module.badge_color || (isFree ? '#22c55e' : '#d4af37');

  return (
    <Col xs={24} sm={12} md={8} lg={6} key={module.id}>
      <Card
        className={`marketplace-card ${isPaid ? 'purchased' : ''}`}
        hoverable
        style={{ borderRadius: 14, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}
        cover={
          <div className="card-cover" style={{ background: coverGradient, position: 'relative', padding: '24px 0 20px', textAlign: 'center', minHeight: 110 }}>
            {isPaid && (
              <div style={{ position: 'absolute', top: 0, right: 0, background: '#22c55e', color: '#fff', fontSize: 9, fontWeight: 700, padding: '4px 10px', borderBottomLeftRadius: 8 }}>
                INSTALLÉ
              </div>
            )}
            {!isPaid && badgeLabel && (
              <div style={{ position: 'absolute', top: 0, left: 0, background: badgeBg, color: '#fff', fontSize: 9, fontWeight: 700, padding: '4px 10px', borderBottomRightRadius: 8 }}>
                {badgeLabel}
              </div>
            )}
            <div style={{ fontSize: 36, color: 'rgba(255,255,255,0.9)', lineHeight: 1 }}>
              {getIcon(module.icon)}
            </div>
            {/* Catégorie tag */}
            <div style={{ marginTop: 8 }}>
              <Tag style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'rgba(255,255,255,0.85)', fontSize: 9, borderRadius: 10 }}>
                {module.category}
              </Tag>
            </div>
          </div>
        }
        bodyStyle={{ padding: '14px 16px', flex: 1, display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 6 }}>
            <Title level={5} style={{ margin: 0, fontSize: 13, lineHeight: 1.3, color: '#1e293b' }}>{module.name}</Title>
            <Tag
              color={isFree ? 'success' : 'gold'}
              style={{ fontSize: 9, padding: '0 5px', margin: 0, lineHeight: '18px', flexShrink: 0, marginLeft: 6 }}
            >
              {isFree ? 'GRATUIT' : 'PREMIUM'}
            </Tag>
          </div>
          <Text style={{ fontSize: 11, color: '#64748b', display: 'block', lineHeight: 1.4 }}>
            {module.description}
          </Text>
        </div>

        <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: isFree ? '#22c55e' : '#0f172a' }}>
              {isFree ? 'Gratuit' : `${module.price} ${module.currency || 'MAD'}`}
            </div>
            {!isFree && <div style={{ fontSize: 10, color: '#94a3b8' }}>/ mois</div>}
          </div>

          {isPaid ? (
            <Button danger size="small" shape="round" icon={<DeleteOutlined />} onClick={() => onUninstall(module)} style={{ fontSize: 11 }}>
              Retirer
            </Button>
          ) : isFree ? (
            <Button type="primary" size="small" shape="round" icon={<RocketOutlined />} onClick={() => onActivate(module)} loading={activating === module.id} style={{ fontSize: 11 }}>
              Activer
            </Button>
          ) : (
            <Button type="primary" size="small" shape="round" icon={<LockOutlined />} onClick={() => onBuy(module)}
              style={{ fontSize: 11, background: 'linear-gradient(135deg,#d4af37,#b8860b)', border: 'none' }}>
              Débloquer
            </Button>
          )}
        </div>
      </Card>
    </Col>
  );
};

// ─────────────────────────────────────────────────────────────
// Composant principal Marketplace
// ─────────────────────────────────────────────────────────────
const Marketplace = () => {
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const { customModules: installedModules, setCustomModules: setInstalledModules, fetchCustomModules, addCustomModule, removeCustomModule, isHidden } = useModules();
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [purchaseModal, setPurchaseModal] = useState({ visible: false, module: null });

  useEffect(() => {
    loadModules();
    fetchCustomModules();
  }, [fetchCustomModules]);

  const loadModules = async () => {
    setLoading(true);
    try {
      const response = await api.get('/modules/');
      let list = [];
      if (Array.isArray(response.data)) list = response.data;
      else if (response.data?.data && Array.isArray(response.data.data)) list = response.data.data;
      else if (response.data?.success && Array.isArray(response.data.data)) list = response.data.data;
      setModules(list);
    } catch {
      message.error('Impossible de charger les modules');
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = (m) => navigate('/payment', { state: { module: m } });

  const handleActivate = async (m) => {
    setActivating(m.id);
    try {
      const res = await addCustomModule(m.key);
      if (res?.success) {
        await loadModules();
      }
    } catch (err) {
      message.error("Erreur lors de l'activation.");
    } finally {
      setActivating(null);
    }
  };

  const handleUninstall = (m) => {
    Modal.confirm({
      title: 'Retirer le module',
      content: `Êtes-vous sûr de vouloir retirer "${m.name}" de votre sidebar ?`,
      okText: 'Oui, retirer', cancelText: 'Annuler',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await removeCustomModule(m.key);
          await loadModules();
        } catch {
          message.error('Erreur lors de la désinstallation');
        }
      },
    });
  };

  const confirmPurchase = async () => {
    const { module: m } = purchaseModal;
    try {
      const res = await addCustomModule(m.key);
      if (res?.success) {
        setPurchaseModal({ visible: false, module: null });
        await loadModules();
      }
    } catch {
      message.error('Paiement échoué. Réessayez.');
    }
  };

  const isModuleInstalled = (module) => installedModules.includes(module.key) && !isHidden(module.key);

  // Filtrage
  const filteredModules = useMemo(() => {
    if (!Array.isArray(modules)) return [];
    return modules.filter((m) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q || (m.name?.toLowerCase().includes(q)) || (m.description?.toLowerCase().includes(q));
      if (!matchSearch) return false;
      if (activeTab !== 'all') return m.category === activeTab;
      return true;
    });
  }, [modules, searchQuery, activeTab]);

  // Stats
  const totalModules = modules.length;
  const freeModules = modules.filter((m) => m.is_free).length;
  const installedCount = modules.filter((m) => isModuleInstalled(m)).length;

  // Modules installés pour la section en tête
  const installedModulesList = useMemo(() => modules.filter((m) => isModuleInstalled(m)), [modules, installedModules]);

  if (loading) {
    return (
      <div className="marketplace-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f5f7fa' }}>
        <Spin size="large" tip="Chargement du Nexum Store…" ><div/></Spin>
      </div>
    );
  }

  return (
    <div className="marketplace-container">

      {/* ── HERO ──────────────────────────────────────────── */}
      <div className="marketplace-hero">
        <div className="hero-orb-left" />
        <div className="hero-content">
          <div className="hero-eyebrow">
            <span className="dot" />
            Nexum Ecosystem
          </div>
          <Title level={1} className="hero-title">
            Nexum <span className="highlight">Store</span>
          </Title>
          <Text className="hero-subtitle">
            Étendez votre ERP avec des modules métier, IA et analytiques de pointe
          </Text>

          <div className="marketplace-search-wrap">
            <div className="marketplace-search">
              <SearchOutlined style={{ color: '#64748b', fontSize: 18, marginRight: 10 }} />
              <input
                placeholder="Rechercher un module (CRM, Anti-Fraude, Digital Twin…)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="hero-stats-strip">
          <div className="hero-stat-item">
            <span className="hero-stat-value">{totalModules}</span>
            <span className="hero-stat-label">Modules disponibles</span>
          </div>
          <div className="hero-stat-item">
            <span className="hero-stat-value">{freeModules}</span>
            <span className="hero-stat-label">Modules gratuits</span>
          </div>
          <div className="hero-stat-item">
            <span className="hero-stat-value">{installedCount}</span>
            <span className="hero-stat-label">Installés</span>
          </div>
          <div className="hero-stat-item">
            <span className="hero-stat-value">{CATEGORIES.length - 1}</span>
            <span className="hero-stat-label">Catégories</span>
          </div>
        </div>
      </div>

      {/* ── CORPS ─────────────────────────────────────────── */}
      <div className="marketplace-body">

        {/* Onglets catégories */}
        <div className="marketplace-tabs-wrap">
          {CATEGORIES.map((cat) => {
            const count = cat.key === 'all' ? modules.length : modules.filter((m) => m.category === cat.key).length;
            if (count === 0 && cat.key !== 'all') return null;
            return (
              <Tooltip key={cat.key} title={cat.description} placement="bottom">
                <button
                  className={`cat-tab-btn ${activeTab === cat.key ? 'active' : ''}`}
                  onClick={() => setActiveTab(cat.key)}
                  style={{ position: 'relative' }}
                >
                  {cat.icon}
                  {cat.label}
                  <span className="cat-count">{count}</span>
                  {cat.badge && (
                    <span style={{ position: 'absolute', top: -4, right: -4, background: cat.key === 'Intelligence Hub' ? '#d4af37' : '#8b5cf6', color: '#fff', fontSize: 8, fontWeight: 700, padding: '1px 5px', borderRadius: 6 }}>
                      {cat.badge}
                    </span>
                  )}
                </button>
              </Tooltip>
            );
          })}
        </div>

        {/* Header section courante */}
        <div className="section-header">
          <Title level={3} className="section-title">
            {CATEGORIES.find((c) => c.key === activeTab)?.label || 'Tous les modules'}
          </Title>
          <span className="section-count">
            {filteredModules.length} module{filteredModules.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Grille de modules */}
        {filteredModules.length > 0 ? (
          <Row gutter={[20, 20]}>
            {filteredModules.map((module) => (
              <ModuleCard
                key={module.id} module={module}
                onBuy={handleBuy} onActivate={handleActivate}
                onUninstall={handleUninstall}
                isInstalled={isModuleInstalled(module)} activating={activating}
              />
            ))}
          </Row>
        ) : (
          <div className="store-empty">
            <Empty
              description={<span style={{ color: '#64748b' }}>Aucun module trouvé pour « {searchQuery || activeTab} »</span>}
            />
          </div>
        )}
      </div>

      {/* ── Modal confirmation achat ──────────────────────── */}
      <Modal
        title={null}
        open={purchaseModal.visible}
        onOk={confirmPurchase}
        onCancel={() => setPurchaseModal({ visible: false, module: null })}
        okText="Confirmer et payer" cancelText="Annuler"
        centered
        okButtonProps={{ style: { background: 'linear-gradient(135deg,#d4af37,#b8860b)', border: 'none', fontWeight: 700, height: 42, borderRadius: 10 } }}
      >
        {purchaseModal.module && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 72, height: 72, background: 'linear-gradient(135deg,#d4af37,#b8860b)', borderRadius: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <LockOutlined style={{ fontSize: 34, color: 'white' }} />
            </div>
            <Title level={4}>Débloquer {purchaseModal.module.name}</Title>
            <Text style={{ color: '#64748b' }}>
              {purchaseModal.module.price} {purchaseModal.module.currency || 'MAD'} / mois
            </Text>
            <br /><br />
            <Text style={{ color: '#94a3b8', fontSize: 12 }}>
              Ce module sera immédiatement accessible depuis votre sidebar.
            </Text>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Marketplace;