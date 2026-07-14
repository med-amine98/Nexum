// MainLayout.js
import React, { useState, useCallback } from 'react';
import { Layout } from 'antd';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const { Content } = Layout;

const MainLayout = () => {
  // État pour le collapsed
  const [collapsed, setCollapsed] = useState(false);

  // Fonction memoizée pour éviter les re-rendus inutiles
  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => !prev);
  }, []);

  // Vérification que setCollapsed est bien une fonction

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar 
        collapsed={collapsed} 
        setCollapsed={setCollapsed}
      />
      
      <Layout>
        <TopBar 
          collapsed={collapsed} 
          setCollapsed={setCollapsed}
        />
        
        <Content style={{ 
          margin: '24px 16px', 
          padding: 24, 
          background: 'var(--bg-secondary)',
          minHeight: 280 
        }}>
          {/* Vos routes enfants seront rendues ici */}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;