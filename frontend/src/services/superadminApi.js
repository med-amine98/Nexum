// src/services/superadminApi.js
// Utilise l'instance API centralisée
import api from './api';

// Helper to get the correct base path
const getBasePath = () => {
  const role = localStorage.getItem('userRole');
  return role === 'admin' ? '/admin' : '/superadmin';
};

export const superAdminApi = {
  // Dashboard
  getDashboardStats: () => api.get(`${getBasePath()}/dashboard`),

  // Utilisateurs
  getUsers: (skip = 0, limit = 100) => api.get(`${getBasePath()}/users?skip=${skip}&limit=${limit}`),
  getUser: (id) => api.get(`${getBasePath()}/users/${id}`),
  updateUser: (id, data) => api.put(`${getBasePath()}/users/${id}`, data),
  deleteUser: (id) => api.delete(`${getBasePath()}/users/${id}`),

  // Entreprises
  getCompanies: (skip = 0, limit = 100) => api.get(`${getBasePath()}/companies?skip=${skip}&limit=${limit}`),
  getCompany: (id) => api.get(`${getBasePath()}/companies/${id}`),
  updateCompany: (id, data) => api.put(`${getBasePath()}/companies/${id}`, data),

  // Demandes de modèles
  getRequests: (status) => api.get(`${getBasePath()}/requests${status ? `?status=${status}` : ''}`),
  getRequest: (id) => api.get(`${getBasePath()}/requests/${id}`),
  processRequest: (id, status, adminNotes) => 
    api.post(`${getBasePath()}/requests/${id}/process?status=${status}`, { admin_notes: adminNotes }),
  markRequestPaid: (id, paymentData) => 
    api.post(`${getBasePath()}/requests/${id}/pay`, paymentData),

  // Statistiques
  getSectorStats: () => api.get(`${getBasePath()}/stats/sectors`),
  getRoleStats: () => api.get(`${getBasePath()}/stats/roles`),
};