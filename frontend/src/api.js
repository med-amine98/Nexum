// src/api.js

// ════════════════════════════════════════════════
//  MODE MOCK FORCÉ (pas d'appel réseau)
// ════════════════════════════════════════════════
const USE_MOCK = true;   // <- changez à false quand le backend sera prêt

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const MOCK_DATA = {
  invoices: [
    { id: 'INV-2025-001', date: '15/03/2025', amount: 79, status: 'payée', plan: 'Performance' },
    { id: 'INV-2025-002', date: '15/02/2025', amount: 79, status: 'payée', plan: 'Performance' },
    { id: 'INV-2025-003', date: '15/01/2025', amount: 79, status: 'payée', plan: 'Performance' },
  ],
  payments: [
    { id: 'PAY-001', date: '15/03/2025', amount: 79, method: 'Carte bancaire', status: 'réussi' },
    { id: 'PAY-002', date: '15/02/2025', amount: 79, method: 'Carte bancaire', status: 'réussi' },
  ],
  usage: {
    storage: { used: 4.5, total: 10, unit: 'Go' },
    users: { used: 12, total: 20 },
    api: { used: 3000, total: 10000, unit: 'appels' }
  },
  stats: {
    totalSpent: 237,
    nextInvoiceDate: '15/04/2025',
    paymentMethod: 'Carte bancaire (•••• 1234)'
  }
};

const delay = (ms = 600) => new Promise(resolve => setTimeout(resolve, ms));

// ---- Fonctions d'API ----
export const fetchInvoices = async () => {
  if (USE_MOCK) {
    await delay();
    return MOCK_DATA.invoices;
  }
  const res = await fetch(`${API_BASE}/invoices`);
  if (!res.ok) throw new Error('Erreur chargement factures');
  return res.json();
};

export const fetchPayments = async () => {
  if (USE_MOCK) {
    await delay();
    return MOCK_DATA.payments;
  }
  const res = await fetch(`${API_BASE}/payments`);
  if (!res.ok) throw new Error('Erreur chargement paiements');
  return res.json();
};

export const fetchUsage = async () => {
  if (USE_MOCK) {
    await delay();
    return MOCK_DATA.usage;
  }
  const res = await fetch(`${API_BASE}/usage`);
  if (!res.ok) throw new Error('Erreur chargement utilisation');
  return res.json();
};

export const fetchBillingStats = async () => {
  if (USE_MOCK) {
    await delay();
    return MOCK_DATA.stats;
  }
  const res = await fetch(`${API_BASE}/billing-stats`);
  if (!res.ok) throw new Error('Erreur chargement stats');
  return res.json();
};