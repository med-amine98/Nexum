// src/pages/AuthSuccess.js
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Spin, message } from 'antd';
import api from '../services/api';

const AuthSuccess = () => {
  const navigate = useNavigate();
  const { search } = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(search);
    const token = params.get('token');
    if (!token) {
      message.error('Token manquant');
      navigate('/login');
      return;
    }
    // Store token (cookie already set by backend, but we also keep it in localStorage for convenience)
    localStorage.setItem('token', token);
    // Fetch user profile to get sector
    api
      .get('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => {
        const sector = res.data?.sector || 'enterprise';
        localStorage.setItem('userSector', sector);
        // Redirect to appropriate dashboard
        if (sector === 'bank' || sector === 'banking') {
          navigate('/banking-dashboard');
        } else if (sector === 'insurance') {
          navigate('/insurance-dashboard');
        } else {
          navigate('/enterprise-dashboard');
        }
      })
      .catch(() => {
        message.error('Impossible de récupérer les informations utilisateur');
        navigate('/login');
      });
  }, [search, navigate]);

  return <Spin size="large" tip="Connexion en cours..." ><div/></Spin>;
};

export default AuthSuccess;
