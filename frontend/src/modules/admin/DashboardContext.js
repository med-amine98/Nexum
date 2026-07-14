import React, { createContext, useState, useEffect, useCallback } from 'react';

export const DashboardContext = createContext(null);

export const DashboardProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [offers, setOffers] = useState([]);
  const [models, setModels] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersRes, paymentsRes, offersRes, modelsRes, companiesRes] = await Promise.all([
        fetch(`${process.env.REACT_APP_API_BASE}/admin/users`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch(`${process.env.REACT_APP_API_BASE}/saas/all-payments`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch(`${process.env.REACT_APP_API_BASE}/saas/plans`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch(`${process.env.REACT_APP_API_BASE}/admin/models`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        fetch(`${process.env.REACT_APP_API_BASE}/admin/companies`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      ]);
      if (usersRes.ok) setUsers(await usersRes.json());
      if (paymentsRes.ok) setPayments(await paymentsRes.json());
      if (offersRes.ok) setOffers(await offersRes.json());
      if (modelsRes.ok) setModels(await modelsRes.json());
      if (companiesRes.ok) setCompanies(await companiesRes.json());
      setLastUpdate(new Date());
    } catch (e) {
      console.error('Dashboard fetch error', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const loadDashboardData = useCallback(() => {
    fetchData();
  }, []);

  return (
    <DashboardContext.Provider value={{ loading, users, payments, offers, models, companies, alerts, notifications, lastUpdate, setAlerts, setNotifications, loadDashboardData, setPayments, setUsers, setOffers, setModels, setCompanies }}>
      {children}
    </DashboardContext.Provider>
  );
};
