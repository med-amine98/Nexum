// src/services/api.js - Instance Axios centralisée
import axios from 'axios';
import { message } from 'antd';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur de requête - Ajoute le token automatiquement
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur de réponse - Gère les erreurs 401/403 et formate les détails d'erreurs
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Formater les erreurs de validation Pydantic/FastAPI (detail est un tableau ou un objet)
    if (error.response?.data) {
      const data = error.response.data;
      if (data.detail && typeof data.detail !== 'string') {
        if (Array.isArray(data.detail)) {
          data.detail = data.detail.map(err => {
            const field = err.loc ? err.loc.filter(l => l !== 'body' && l !== 'query' && l !== 'path').join('.') : '';
            return `${field ? field + ': ' : ''}${err.msg}`;
          }).join(', ');
        } else if (typeof data.detail === 'object') {
          data.detail = data.detail.msg || data.detail.message || JSON.stringify(data.detail);
        }
      }
    }

    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }
        
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken
        });
        
        const { access_token } = response.data;
        localStorage.setItem('token', access_token);
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout
        localStorage.removeItem('token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
        
        if (!window.location.pathname.includes('/login') && 
            !window.location.pathname.includes('/signup') &&
            !window.location.pathname.includes('/home')) {
          message.error('Session expirée, veuillez vous reconnecter');
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
export { API_URL };