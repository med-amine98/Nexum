import React from 'react';
import { Layout, Menu, Avatar, Dropdown, Space, Badge, Typography } from 'antd';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined, TeamOutlined, ShopOutlined,
  FileTextOutlined, LogoutOutlined, UserOutlined,
  BellOutlined, SettingOutlined, ApiOutlined,
  BarChartOutlined, DollarOutlined
} from '@ant-design/icons';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

const SuperAdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
      onClick: () => navigate('/superadmin')
    },
    {
      key: 'users',
      icon: <TeamOutlined />,
      label: 'Utilisateurs',
      onClick: () => navigate('/superadmin/users')
    },
    {
      key: 'companies',
      icon: <ShopOutlined />,
      label: 'Entreprises',
      onClick: () => navigate('/superadmin/companies')
    },
    {
      key: 'requests',
      icon: <FileTextOutlined />,
      label: 'Demandes',
      onClick: () => navigate('/superadmin/requests')
    }
  ];

  const userMenu = (
    <Menu
      items={[
        {
          key: 'profile',
          icon: <UserOutlined />,
          label: 'Mon profil',
        },
        {
          key: 'settings',
          icon: <SettingOutlined />,
          label: 'Paramètres',
        },
        {
          type: 'divider',
        },
        {
          key: 'logout',
          icon: <LogoutOutlined />,
          label: 'Déconnexion',
          onClick: () => {
            localStorage.clear();
            navigate('/login');
          },
        },
      ]}
    />
  );

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Header spécifique pour Super Admin */}
      <Header style={{ 
        background: 'linear-gradient(135deg, #722ed1 0%, #531dab 100%)',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ApiOutlined style={{ fontSize: 28, color: '#fff' }} />
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>
              Super Admin
            </Text>
          </div>
          
          {/* Menu horizontal */}
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname.split('/')[2] || 'dashboard']}
            items={menuItems}
            style={{ 
              background: 'transparent',
              borderBottom: 'none',
              color: '#fff'
            }}
            theme="dark"
          />
        </div>

        <Space size="middle">
          <Badge count={5}>
            <BellOutlined style={{ fontSize: 18, color: '#fff' }} />
          </Badge>
          <Dropdown overlay={userMenu} placement="bottomRight">
            <Avatar 
              icon={<UserOutlined />} 
              style={{ 
                backgroundColor: '#f56a00',
                cursor: 'pointer'
              }} 
            />
          </Dropdown>
        </Space>
      </Header>

      {/* Contenu principal */}
      <Content style={{ 
        padding: '24px',
        background: 'var(--bg-primary)',
        minHeight: 'calc(100vh - 64px - 70px)'
      }}>
        <Outlet />
      </Content>

      {/* Footer */}
      <Footer style={{ 
        textAlign: 'center', 
        background: 'var(--bg-secondary)',
        borderTop: '1px solid #f0f0f0'
      }}>
        Super Admin Dashboard ©{new Date().getFullYear()} - Tous droits réservés
      </Footer>
    </Layout>
  );
};

export default SuperAdminLayout;