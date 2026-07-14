// src/services/auth.js - AuthProvider avec vrais appels API
import React, { createContext, useState, useContext, useEffect } from 'react';
import { message } from 'antd';
import api from './api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  // Charger l'utilisateur au démarrage
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          // Vérifier que le token est encore valide
          const response = await api.get('/auth/me');
          const userData = response.data;
          
          localStorage.setItem('user', JSON.stringify(userData));
          setUser(userData);
          setUserRole(userData.role);
        } catch (error) {
          console.warn('Token invalide, nettoyage...', error);
          // Si le token est invalide, on utilise les données sauvegardées
          // pour éviter la déconnexion brutale en cas d'erreur réseau
          if (error.code === 'ERR_NETWORK') {
            const parsed = JSON.parse(savedUser);
            setUser(parsed);
            setUserRole(parsed.role);
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Connexion via l'API (OAuth2 form)
  const login = async (email, password) => {
    try {
      // Le backend FastAPI attend un OAuth2 form (URLSearchParams)
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);

      const response = await api.post('/auth/login', formData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });

      const { access_token } = response.data;

      if (!access_token) {
        throw new Error('Pas de token reçu');
      }

      // Stocker le token
      localStorage.setItem('token', access_token);

      // Récupérer les infos utilisateur
      const userResponse = await api.get('/auth/me');
      const userData = userResponse.data;

      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setUserRole(userData.role);

      return { token: access_token, user: userData };
    } catch (error) {
      console.error('Erreur login:', error);
      throw error;
    }
  };

  // Déconnexion
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setUserRole(null);
    message.success('Déconnexion réussie');
  };

  // Inscription via l'API
  const register = async (userData) => {
    try {
      const signupData = {
        full_name: userData.fullname || userData.full_name,
        email: userData.email,
        phone: userData.phone || '',
        password: userData.password,
        confirm_password: userData.confirmPassword || userData.confirm_password,
        company_name: userData.companyName || userData.company_name || '',
        company_size: userData.companySize || userData.company_size || '',
        registration_number: userData.registrationNumber || userData.registration_number || null,
        address: userData.address || '',
        city: userData.city || '',
        country: userData.country || 'France',
        siret: userData.siret || null,
        sector: userData.sector || userData.companySector || 'enterprise'
      };

      const response = await api.post('/auth/register', signupData);
      const data = response.data;

      if (data.success && data.token?.access_token) {
        localStorage.setItem('token', data.token.access_token);
        if (data.token.user) {
          localStorage.setItem('user', JSON.stringify(data.token.user));
          setUser(data.token.user);
          setUserRole(data.token.user.role);
        }
        return { token: data.token.access_token, user: data.token.user };
      } else {
        throw new Error(data.message || 'Erreur d\'inscription');
      }
    } catch (error) {
      console.error('Erreur register:', error);
      throw error;
    }
  };

  // Mise à jour du profil
  const updateProfile = async (profileData) => {
    try {
      const response = await api.put('/profile/', profileData);
      const updatedUser = response.data;
      
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      return updatedUser;
    } catch (error) {
      // Fallback: mise à jour locale si l'API profile n'existe pas encore
      const updatedUser = { ...user, ...profileData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      return updatedUser;
    }
  };

  // Vérification des permissions
  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === 'admin' || user.role === 'super_admin') return true;
    return user.permissions?.includes(permission) || false;
  };

  const isAdmin = () => {
    return user?.role === 'admin' || user?.role === 'super_admin';
  };

  const isSuperAdmin = () => {
    return user?.role === 'super_admin';
  };

  const isMember = () => {
    return user?.role === 'user' || user?.role === 'member';
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      userRole,
      login,
      logout,
      register,
      updateProfile,
      hasPermission,
      isAdmin,
      isSuperAdmin,
      isMember
    }}>
      {children}
    </AuthContext.Provider>
  );
};