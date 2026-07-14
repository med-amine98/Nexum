// src/components/Guards/SuperAdminGuard.js
import { Navigate } from 'react-router-dom';

const SuperAdminGuard = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (user.role !== 'super_admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default SuperAdminGuard;