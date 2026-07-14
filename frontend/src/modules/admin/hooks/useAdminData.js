// src/modules/admin/hooks/useAdminData.js
import { useState, useEffect, useCallback } from 'react';
import adminService from '../services/adminService';
import { message } from 'antd';

export const useAdminData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kpiData, setKpiData] = useState(null);
  const [users, setUsers] = useState([]);
  const [models, setModels] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [offers, setOffers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [
        stats,
        modelsData,
        companiesData,
        usersData,
        plansData,
        paymentsData,
        analyticsData
      ] = await Promise.all([
        adminService.getStats(),
        adminService.getModels(),
        adminService.getCompanies(),
        adminService.getUsers(),
        adminService.getPlans(),
        adminService.getPayments(),
        adminService.getDashboardAnalytics('month')
      ]);

      setKpiData(stats);
      setModels(Array.isArray(modelsData) ? modelsData : []);
      setCompanies(Array.isArray(companiesData) ? companiesData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setOffers(Array.isArray(plansData) ? plansData : []);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      setAnalytics(analyticsData);
    } catch (err) {
      console.error('Error loading admin data:', err);
      setError(err.message);
      message.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshData = useCallback(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    loading,
    error,
    kpiData,
    users,
    models,
    companies,
    offers,
    payments,
    analytics,
    refreshData
  };
};