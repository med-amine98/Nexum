// src/modules/admin/services/adminService.js
import api from '../../../services/api';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

class AdminService {
  async getStats() {
    const response = await api.get(`${API_BASE}/admin/stats`);
    return response.data;
  }

  async getModels() {
    const response = await api.get(`${API_BASE}/admin/models`);
    return response.data;
  }

  async getCompanies() {
    const response = await api.get(`${API_BASE}/admin/companies`);
    return response.data;
  }

  async getUsers() {
    const response = await api.get(`${API_BASE}/admin/users`);
    return response.data;
  }

  async getPlans() {
    const response = await api.get(`${API_BASE}/saas/plans`);
    return response.data;
  }

  async getPayments() {
    const response = await api.get(`${API_BASE}/saas/all-payments`);
    return response.data;
  }

  async validatePayment(paymentId) {
    const response = await api.post(`${API_BASE}/saas/payments/${paymentId}/validate`);
    return response.data;
  }

  async createCustomer(data) {
    const response = await api.post(`${API_BASE}/admin/users`, data);
    return response.data;
  }

  async updateCustomer(id, data) {
    const response = await api.put(`${API_BASE}/admin/users/${id}`, data);
    return response.data;
  }

  async deleteCustomer(id) {
    const response = await api.delete(`${API_BASE}/admin/users/${id}`);
    return response.data;
  }

  async createOffer(data) {
    const response = await api.post(`${API_BASE}/saas/plans`, data);
    return response.data;
  }

  async updateOffer(id, data) {
    const response = await api.put(`${API_BASE}/saas/plans/${id}`, data);
    return response.data;
  }

  async deleteOffer(id) {
    const response = await api.delete(`${API_BASE}/saas/plans/${id}`);
    return response.data;
  }

  async exportData(type, format) {
    const response = await api.get(`${API_BASE}/admin/export/${type}`, {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }

  async getDashboardAnalytics(timeRange) {
    const response = await api.get(`${API_BASE}/admin/analytics`, {
      params: { timeRange }
    });
    return response.data;
  }
}

export default new AdminService();