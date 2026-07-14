// components/ProtectedRoute.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../services/auth'; // ← IMPORTANT: utiliser le contexte

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth(); // ← UTILISER LE CONTEXTE, PAS localStorage
  
  // Afficher un spinner pendant le chargement
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'var(--bg-primary)' 
      }}>
        <Spin size="large" tip="Vérification de l'authentification..." ><div/></Spin>
      </div>
    );
  }
  
  // Rediriger vers login si non authentifié
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Afficher le contenu protégé
  return children;
};

export default ProtectedRoute;