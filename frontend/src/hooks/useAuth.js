// frontend/src/hooks/useAuth.js
import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier si le token est valide
    if (token) {
      // Décoder le token pour obtenir les infos utilisateur
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        setUser({ id: payload.sub, email: payload.email });
      } catch (error) {
        console.error('Token invalide', error);
        logout();
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await fetch('http://localhost:8000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: email, password })
      });
      
      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('token', data.access_token);
        setToken(data.access_token);
        setUser({ id: data.user_id, email: data.email });
        return { success: true };
      }
      return { success: false, error: data.detail };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return { user, token, loading, login, logout };
};

// Hook pour les requêtes authentifiées
export const useAuthenticatedRequest = () => {
  const { token } = useAuth();

  const request = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers
    };

    const response = await fetch(url, { ...options, headers });
    if (response.status === 401) {
      // Token expiré - rediriger vers login
      localStorage.removeItem('token');
      window.location.href = '/login';
      throw new Error('Session expirée');
    }
    return response;
  };

  return { request };
};