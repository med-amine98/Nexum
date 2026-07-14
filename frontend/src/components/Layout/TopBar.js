// src/components/TopBar.js - Version Premium avec couleurs dynamiques selon le secteur + couleur admin
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Space, Avatar, Badge, Dropdown, Menu, message, Modal, Button, Tooltip, Typography, Divider } from 'antd';
import { 
  BellOutlined, 
  UserOutlined,
  SettingOutlined, 
  LogoutOutlined,
  DashboardOutlined,
  QuestionCircleOutlined, 
  FullscreenOutlined,
  FullscreenExitOutlined,
  SafetyCertificateOutlined,
  ClockCircleOutlined,
  BankOutlined,
  InsuranceOutlined,
  ApartmentOutlined,
  CrownOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../services/auth';
import { useAssistant } from '../../context/AssistantContext';
import { useTranslation } from 'react-i18next';
import './TopBar.css';

const { Text, Title } = Typography;

// Couleurs par secteur
const SECTOR_COLORS = {
  banking: '#1890ff',      // Bleu pour Banque
  insurance: '#52c41a',    // Vert pour Assurance
  enterprise: '#d4af37',   // Doré pour Entreprise
  admin: '#ef4444',        // Rouge pour Admin
};

const SECTOR_ICONS = {
  banking: <BankOutlined />,
  insurance: <InsuranceOutlined />,
  enterprise: <ApartmentOutlined />,
  admin: <CrownOutlined />
};

const TopBar = ({ collapsed, setCollapsed }) => {
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [assistantNotifications, setAssistantNotifications] = useState([]);
  const [localSector, setLocalSector] = useState(null);
  const { t } = useTranslation();
  
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { selectedAssistant } = useAssistant();

  // ========== RÉCUPÉRATION DU SECTEUR DEPUIS MULTIPLES SOURCES ==========
  const getCurrentSector = useCallback(() => {
    // 1. D'abord depuis le user connecté
    if (user?.sector) {
      return user.sector;
    }
    // 2. Depuis le localStorage
    const savedSector = localStorage.getItem('userSector');
    if (savedSector) {
      return savedSector;
    }
    // 3. Depuis le user (company sector)
    if (user?.company?.sector) {
      return user.company.sector;
    }
    // 4. Par défaut
    return 'enterprise';
  }, [user]);

  // Écouter les changements de localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const newSector = localStorage.getItem('userSector');
      if (newSector) {
        setLocalSector(newSector);

      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Mettre à jour le secteur local quand user change
  useEffect(() => {
    const sector = getCurrentSector();
    if (sector !== localSector) {
      setLocalSector(sector);

    }
  }, [user, getCurrentSector, localSector]);

  // ========== DÉTECTION DU RÔLE ADMIN ==========
  const isAdmin = useMemo(() => {
    return user?.role === 'admin' || 
           user?.role === 'super_admin' || 
           user?.is_super_admin === true ||
           user?.isAdmin === true;
  }, [user]);

  // Récupérer le secteur de l'utilisateur (pour les non-admins)
  const userSector = useMemo(() => {
    // Si admin, on ignore le secteur et on utilise 'admin'
    if (isAdmin) return 'admin';
    // Utiliser le secteur local ou celui du user
    const sector = localSector || getCurrentSector();
    // Normaliser en minuscules
    const normalized = sector?.toLowerCase() || 'enterprise';
    if (normalized === 'bank' || normalized === 'banking') return 'banking';
    if (normalized === 'insurance') return 'insurance';
    return 'enterprise';
  }, [isAdmin, localSector, getCurrentSector]);

  // Couleur dynamique selon le rôle (admin rouge, sinon couleur secteur)
  const sectorColor = useMemo(() => {
    if (isAdmin) return SECTOR_COLORS.admin;
    return SECTOR_COLORS[userSector] || SECTOR_COLORS.enterprise;
  }, [userSector, isAdmin]);

  const sectorIcon = useMemo(() => {
    if (isAdmin) return SECTOR_ICONS.admin;
    return SECTOR_ICONS[userSector] || SECTOR_ICONS.enterprise;
  }, [userSector, isAdmin]);

  const formatTime = useCallback((date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const formatDate = useCallback((date) => {
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true);
      message.success(t('connection_restored'));
    };
    const handleOffline = () => {
      setOnlineStatus(false);
      message.warning(t('connection_lost'));
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [t]);

  // Génération des notifications
  const generateAssistantNotification = useCallback(() => {
    const notifications = [
      {
        type: 'meeting',
        title: 'Réunion dans 15 min',
        message: 'Stratégie Q4 avec équipe',
        icon: <BellOutlined />,
        color: sectorColor
      },
      {
        type: 'document',
        title: 'Document signé',
        message: 'Contrat #INV-2024-001',
        icon: <BellOutlined />,
        color: sectorColor
      },
      {
        type: 'task',
        title: 'Tâche assignée',
        message: 'Finaliser présentation client',
        icon: <BellOutlined />,
        color: sectorColor
      }
    ];

    const randomNotif = notifications[Math.floor(Math.random() * notifications.length)];

    return {
      id: `${Date.now()}-${Math.random()}`,
      title: randomNotif.title,
      message: randomNotif.message,
      icon: randomNotif.icon,
      color: randomNotif.color,
      time: 'À l\'instant',
      read: false
    };
  }, [sectorColor]);

  useEffect(() => {
    if (!selectedAssistant) return;
    const notificationInterval = setInterval(() => {
      setAssistantNotifications(prev => [generateAssistantNotification(), ...prev].slice(0, 10));
    }, 60000);
    return () => clearInterval(notificationInterval);
  }, [selectedAssistant, generateAssistantNotification]);

  const userName = useMemo(() => user?.full_name || user?.firstName || user?.name || user?.username || 'Administrateur', [user]);
  const userInitials = useMemo(() => {
    if (!userName) return 'U';
    const nameParts = userName.split(' ');
    if (nameParts.length >= 2) return `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase();
    return nameParts[0]?.substring(0, 2).toUpperCase() || 'U';
  }, [userName]);

  const avatarColor = useMemo(() => {
    return sectorColor;
  }, [sectorColor]);

  const getSectorLabel = useCallback(() => {
    if (isAdmin) return 'Administrateur';
    const labels = {
      banking: 'Banque',
      insurance: 'Assurance',
      enterprise: 'Entreprise'
    };
    return labels[userSector] || 'Entreprise';
  }, [userSector, isAdmin]);

  const formatRole = useCallback((role) => {
    if (isAdmin) return 'Super Admin';
    if (!role) return getSectorLabel();
    if (role === 'super_admin') return 'Super Admin';
    if (role === 'admin') return 'Administrateur';
    return getSectorLabel();
  }, [isAdmin, getSectorLabel]);

  const unreadCount = useMemo(() => assistantNotifications.filter(n => !n.read).length, [assistantNotifications]);

  const handleLogout = useCallback(() => {
    Modal.confirm({
      title: 'Déconnexion',
      icon: <LogoutOutlined style={{ color: '#ef4444' }} />,
      content: 'Êtes-vous sûr de vouloir vous déconnecter ?',
      okText: 'Déconnexion',
      cancelText: 'Annuler',
      okButtonProps: { danger: true },
      onOk: () => {
        localStorage.removeItem('userSector');
        logout();
        message.success('Déconnexion réussie');
        navigate('/login');
      }
    });
  }, [logout, navigate]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
      message.success('Mode plein écran activé');
    } else {
      document.exitFullscreen();
      setFullscreen(false);
      message.success('Mode plein écran désactivé');
    }
  }, []);

  const handleMenuClick = useCallback(({ key }) => {
    const actions = {
      logout: handleLogout,
      profile: () => navigate('/profile'),
      settings: () => navigate('/settings'),
      dashboard: () => navigate('/dashboard'),
      fullscreen: toggleFullscreen,
      help: () => window.open('/help', '_blank')
    };
    if (actions[key]) actions[key]();
  }, [handleLogout, navigate, toggleFullscreen]);

  const markAllAsRead = useCallback(() => {
    setAssistantNotifications(prev => prev.map(n => ({ ...n, read: true })));
    message.success('Toutes les notifications ont été marquées comme lues');
  }, []);

  const notificationMenu = (
    <Menu className="notification-menu" style={{ 
      width: 380, 
      background: '#1a1a2e', 
      borderRadius: 16, 
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 20px 35px -12px rgba(0,0,0,0.3)'
    }}>
      <div style={{ 
        padding: '16px 20px', 
        borderBottom: '1px solid rgba(255,255,255,0.1)', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
      }}>
        <Space>
          <BellOutlined style={{ color: sectorColor, fontSize: 18 }} />
          <Text strong style={{ color: '#ffffff', fontSize: 16 }}>Notifications</Text>
          {unreadCount > 0 && (
            <Badge count={unreadCount} style={{ backgroundColor: sectorColor }} />
          )}
        </Space>
        <Button type="link" size="small" onClick={markAllAsRead} style={{ color: sectorColor }}>
          Tout marquer lu
        </Button>
      </div>
      
      <div style={{ maxHeight: 400, overflowY: 'auto' }}>
        {assistantNotifications.length > 0 ? (
          assistantNotifications.map(notif => (
            <Menu.Item 
              key={notif.id} 
              style={{ 
                padding: '12px 20px', 
                height: 'auto',
                backgroundColor: !notif.read ? 'rgba(255,255,255,0.05)' : 'transparent'
              }}
            >
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ 
                  width: 36, 
                  height: 36, 
                  borderRadius: 10, 
                  background: `${notif.color}20`, 
                  color: notif.color, 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: 18 
                }}>
                  {notif.icon}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text strong style={{ color: '#ffffff', fontSize: 13 }}>{notif.title}</Text>
                    <Text style={{ color: '#94a3b8', fontSize: 11 }}>{notif.time}</Text>
                  </div>
                  <Text style={{ fontSize: 12, color: '#cbd5e1' }}>
                    {notif.message}
                  </Text>
                </div>
              </div>
            </Menu.Item>
          ))
        ) : (
          <div style={{ textAlign: 'center', padding: '48px 24px' }}>
            <BellOutlined style={{ fontSize: 48, color: '#475569', marginBottom: 16 }} />
            <Text style={{ color: '#ffffff', display: 'block', marginBottom: 8 }}>
              Aucune notification
            </Text>
          </div>
        )}
      </div>
    </Menu>
  );

  const userMenu = (
    <Menu onClick={handleMenuClick} style={{ 
      background: '#1a1a2e', 
      borderRadius: 16, 
      minWidth: 260, 
      border: '1px solid rgba(255,255,255,0.1)',
      boxShadow: '0 20px 35px -12px rgba(0,0,0,0.3)'
    }}>
      <div style={{ 
        padding: '20px', 
        textAlign: 'center', 
        borderBottom: '1px solid rgba(255,255,255,0.1)' 
      }}>
        <Avatar 
          size={64} 
          style={{ 
            backgroundColor: avatarColor, 
            fontSize: 24, 
            fontWeight: 'bold', 
            marginBottom: 12,
            boxShadow: `0 4px 12px ${avatarColor}40`
          }}
        >
          {userInitials}
        </Avatar>
        <div>
          <Title level={5} style={{ margin: 0, color: '#ffffff', marginBottom: 4 }}>
            {userName}
          </Title>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {sectorIcon}
            <Text style={{ color: sectorColor, fontSize: 12, display: 'block' }}>
              {formatRole(user?.role)}
            </Text>
          </div>
        </div>
      </div>
      
      <Divider style={{ margin: '8px 0', borderColor: 'rgba(255,255,255,0.1)' }} />
      
      <Menu.Item key="dashboard" icon={<DashboardOutlined />} style={{ height: 48, color: '#cbd5e1' }}>
        Tableau de bord
      </Menu.Item>
      <Menu.Item key="profile" icon={<UserOutlined />} style={{ height: 48, color: '#cbd5e1' }}>
        Mon profil
      </Menu.Item>
      <Menu.Item key="settings" icon={<SettingOutlined />} style={{ height: 48, color: '#cbd5e1' }}>
        Paramètres
      </Menu.Item>
      
      <Divider style={{ margin: '8px 0', borderColor: 'rgba(255,255,255,0.1)' }} />
      
      <Menu.Item key="fullscreen" icon={fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} style={{ height: 48, color: '#cbd5e1' }}>
        {fullscreen ? 'Quitter plein écran' : 'Plein écran'}
      </Menu.Item>
      <Menu.Item key="help" icon={<QuestionCircleOutlined />} style={{ height: 48, color: '#cbd5e1' }}>
        Aide & Support
      </Menu.Item>
      
      <Divider style={{ margin: '8px 0', borderColor: 'rgba(255,255,255,0.1)' }} />
      
      <Menu.Item key="logout" icon={<LogoutOutlined />} danger style={{ height: 48 }}>
        Déconnexion
      </Menu.Item>
    </Menu>
  );

  return (
    <div className="topbar" style={{ 
      height: 64, 
      background: 'rgba(26, 26, 46, 0.8)', 
      backdropFilter: 'blur(16px)', 
      borderBottom: `1px solid ${sectorColor}40`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      transition: 'all 0.3s ease'
    }}>
      {/* Section gauche - Statut et secteur */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          gap: 8,
          padding: '4px 12px',
          borderRadius: 20,
          background: onlineStatus ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)'
        }}>
          <div style={{ 
            width: 8, 
            height: 8, 
            borderRadius: '50%', 
            background: onlineStatus ? '#22c55e' : '#ef4444',
            animation: onlineStatus ? 'pulse 2s infinite' : 'none'
          }} />
          <Text style={{ 
            color: onlineStatus ? '#22c55e' : '#ef4444', 
            fontSize: 12,
            fontWeight: 500
          }}>
            {onlineStatus ? 'Connecté' : 'Hors ligne'}
          </Text>
        </div>

        {/* Badge secteur / Admin */}
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          borderRadius: 20,
          background: `${sectorColor}15`,
          border: `1px solid ${sectorColor}30`
        }}>
          {sectorIcon}
          <Text style={{ color: sectorColor, fontSize: 12, fontWeight: 500 }}>
            {getSectorLabel()}
          </Text>
        </div>
      </div>

      {/* Section centrale - Horloge */}
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 16px',
        borderRadius: 20,
        background: 'rgba(255,255,255,0.05)'
      }}>
        <ClockCircleOutlined style={{ color: sectorColor, fontSize: 14 }} />
        <Text strong style={{ color: '#ffffff', fontSize: 14 }}>
          {formatTime(currentTime)}
        </Text>
        <Text style={{ color: '#94a3b8', fontSize: 12 }}>
          {formatDate(currentTime)}
        </Text>
      </div>

      {/* Section droite - Actions et profil */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Tooltip title="Aide">
          <Button 
            type="text" 
            icon={<QuestionCircleOutlined />} 
            style={{ 
              width: 36, 
              height: 36,
              borderRadius: 10,
              color: '#94a3b8'
            }} 
            onClick={() => window.open('/help', '_blank')} 
          />
        </Tooltip>

        <Tooltip title="Plein écran">
          <Button 
            type="text" 
            icon={fullscreen ? <FullscreenExitOutlined /> : <FullscreenOutlined />} 
            onClick={toggleFullscreen}
            style={{ 
              width: 36, 
              height: 36,
              borderRadius: 10,
              color: '#94a3b8'
            }}
          />
        </Tooltip>

        <Tooltip title="Notifications">
          <Badge count={unreadCount} style={{ backgroundColor: sectorColor }}>
            <Dropdown 
              popupRender={() => notificationMenu} 
              trigger={['click']} 
              placement="bottomRight" 
              open={notificationsVisible} 
              onOpenChange={setNotificationsVisible}
            >
              <Button 
                type="text" 
                icon={<BellOutlined />} 
                style={{ 
                  width: 36, 
                  height: 36,
                  borderRadius: 10,
                  color: '#94a3b8'
                }} 
              />
            </Dropdown>
          </Badge>
        </Tooltip>

        <div style={{ width: 1, height: 28, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />

        <Dropdown popupRender={() => userMenu} placement="bottomRight" trigger={['click']}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 10,
            padding: '4px 8px 4px 4px',
            borderRadius: 10,
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            border: `1px solid transparent`
          }}
          className="user-profile-hover"
          onMouseEnter={(e) => e.currentTarget.style.borderColor = `${sectorColor}40`}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}
          >
            <Avatar 
              style={{ 
                backgroundColor: avatarColor, 
                fontWeight: 'bold',
                width: 34,
                height: 34,
                lineHeight: '34px',
                fontSize: 14
              }}
            >
              {userInitials}
            </Avatar>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
              <Text strong style={{ color: '#ffffff', fontSize: 13 }}>
                {userName.split(' ')[0]}
              </Text>
              <Text style={{ color: sectorColor, fontSize: 11 }}>
                {formatRole(user?.role)}
              </Text>
            </div>
            <SafetyCertificateOutlined style={{ color: sectorColor, fontSize: 12 }} />
          </div>
        </Dropdown>
      </div>

      <style jsx="true">{`
        @keyframes pulse {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        .user-profile-hover:hover {
          background: rgba(255,255,255,0.05);
        }
      `}</style>
    </div>
  );
};

export default TopBar;