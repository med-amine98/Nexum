// src/services/profileApi.js
// Utilise l'instance API centralisée avec la bonne URL et le token automatique
import api from './api';

const profileApi = {
  // Récupérer le profil
  getProfile: async () => {
    try {
      const response = await api.get('/profile/');
      return response.data;
    } catch (error) {
      console.error('Erreur getProfile:', error);
      throw error;
    }
  },

  // Mettre à jour le profil
  updateProfile: async (profileData) => {
    try {
      const response = await api.put('/profile/', profileData);
      return response.data;
    } catch (error) {
      console.error('Erreur updateProfile:', error);
      throw error;
    }
  },

  // Upload avatar
  uploadAvatar: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/profile/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data.url;
    } catch (error) {
      console.error('Erreur uploadAvatar:', error);
      throw error;
    }
  },

  // Changer mot de passe
  changePassword: async (passwordData) => {
    try {
      const response = await api.post('/profile/change-password', passwordData);
      return response.data;
    } catch (error) {
      console.error('Erreur changePassword:', error);
      throw error;
    }
  },

  // Récupérer les sessions
  getSessions: async () => {
    try {
      const response = await api.get('/profile/sessions');
      return response.data;
    } catch (error) {
      console.error('Erreur getSessions:', error);
      return []; // Retourner tableau vide en cas d'erreur
    }
  },

  // Terminer une session
  terminateSession: async (sessionId) => {
    try {
      const response = await api.delete(`/profile/sessions/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur terminateSession:', error);
      throw error;
    }
  },

  // Terminer toutes les sessions
  terminateAllSessions: async () => {
    try {
      const response = await api.post('/profile/sessions/terminate-all');
      return response.data;
    } catch (error) {
      console.error('Erreur terminateAllSessions:', error);
      throw error;
    }
  },

  // Récupérer l'activité
  getActivity: async () => {
    try {
      const response = await api.get('/profile/activity');
      return response.data;
    } catch (error) {
      console.error('Erreur getActivity:', error);
      return []; // Retourner tableau vide en cas d'erreur
    }
  },

  // Récupérer les préférences de notifications
  getNotificationSettings: async () => {
    try {
      const response = await api.get('/profile/notifications');
      return response.data;
    } catch (error) {
      console.error('Erreur getNotificationSettings:', error);
      return {
        security_alerts: true,
        new_features: true,
        weekly_reports: false,
        system_updates: true,
      };
    }
  },

  // Mettre à jour les notifications
  updateNotificationSettings: async (settings) => {
    try {
      const response = await api.put('/profile/notifications', settings);
      return response.data;
    } catch (error) {
      console.error('Erreur updateNotificationSettings:', error);
      throw error;
    }
  },

  // Récupérer les paramètres de sécurité
  getSecuritySettings: async () => {
    try {
      const response = await api.get('/profile/security-settings');
      return response.data;
    } catch (error) {
      console.error('Erreur getSecuritySettings:', error);
      return {
        two_factor_enabled: false,
        login_notifications: true,
        email_alerts: true,
      };
    }
  },

  // Mettre à jour les paramètres de sécurité
  updateSecuritySettings: async (settings) => {
    try {
      const response = await api.put('/profile/security-settings', settings);
      return response.data;
    } catch (error) {
      console.error('Erreur updateSecuritySettings:', error);
      throw error;
    }
  },

  // Configurer 2FA
  setup2FA: async () => {
    try {
      const response = await api.post('/profile/2fa/setup');
      return response.data;
    } catch (error) {
      console.error('Erreur setup2FA:', error);
      throw error;
    }
  },

  // Vérifier 2FA
  verify2FA: async (codeData) => {
    try {
      const response = await api.post('/profile/2fa/verify', codeData);
      return response.data;
    } catch (error) {
      console.error('Erreur verify2FA:', error);
      throw error;
    }
  },

  // Désactiver 2FA
  disable2FA: async () => {
    try {
      const response = await api.post('/profile/2fa/disable');
      return response.data;
    } catch (error) {
      console.error('Erreur disable2FA:', error);
      throw error;
    }
  },

  // Récupérer les stats
  getStats: async () => {
    try {
      const response = await api.get('/profile/stats');
      return response.data;
    } catch (error) {
      console.error('Erreur getStats:', error);
      return {
        active_projects: 0,
        total_projects: 0,
        connections: 0,
        security_score: 0,
        profile_completion: 0,
      };
    }
  },
};

export default profileApi;