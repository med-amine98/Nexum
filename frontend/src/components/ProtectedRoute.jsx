// frontend/src/components/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const ProtectedRoute = ({ children, roles = [] }) => {
  const { user, token, loading } = useAuth();

  if (loading) {
    return <div>Chargement...</div>;
  }

  if (!token) {
    return <Navigate to="/login" />;
  }

  // Vérifier les rôles si spécifiés
  if (roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
};

export default ProtectedRoute;