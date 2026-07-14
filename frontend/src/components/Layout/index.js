import React from 'react';
import { Layout as AntLayout, Menu } from 'antd';
import { DashboardOutlined, UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { Outlet, useNavigate } from 'react-router-dom';

const { Header, Content, Sider } = AntLayout;

const Layout = () => {
  const navigate = useNavigate();

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider>
        <div style={{ height: 64, margin: 16, background: 'rgba(170, 12, 12, 0.2)', borderRadius: 8 }} />
        <Menu theme="dark" mode="inline" defaultSelectedKeys={['dashboard']}>
          <Menu.Item key="dashboard" icon={<DashboardOutlined />} onClick={() => navigate('/dashboard')}>
            Dashboard
          </Menu.Item>
        </Menu>
      </Sider>
      <AntLayout>
        <Header style={{ padding: '0 24px', background: 'var(--bg-secondary)', display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
          <span style={{ marginRight: 16 }}><UserOutlined /> Admin</span>
          <LogoutOutlined style={{ cursor: 'pointer' }} />
        </Header>
        <Content style={{ margin: '16px' }}>
          <div style={{ padding: 24, background: 'var(--bg-secondary)', minHeight: 'calc(100vh - 112px)' }}>
            <Outlet />
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
};

export default Layout;