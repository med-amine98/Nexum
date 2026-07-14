// services/localDataService.js
class LocalDataService {
  constructor() {
    this.storageKey = 'fraud_detection_data';
    this.initializeData();
  }

  initializeData() {
    if (!localStorage.getItem(this.storageKey)) {
      const defaultData = {
        clients: [],
        claims: [],
        fraudAlerts: [],
        lastId: { clients: 1000, claims: 2000 }
      };
      localStorage.setItem(this.storageKey, JSON.stringify(defaultData));
    }
  }

  getData() {
    return JSON.parse(localStorage.getItem(this.storageKey));
  }

  saveData(data) {
    localStorage.setItem(this.storageKey, JSON.stringify(data));
  }

  // Clients
  addClient(client) {
    const data = this.getData();
    const newClient = {
      id: ++data.lastId.clients,
      ...client,
      created_at: new Date().toISOString(),
      claims_count: 0,
      total_amount: 0,
      risk_level: 'low'
    };
    data.clients.push(newClient);
    this.saveData(data);
    return newClient;
  }

  getClients() {
    return this.getData().clients;
  }

  // Claims
  addClaim(claim) {
    const data = this.getData();
    const newClaim = {
      id: ++data.lastId.claims,
      claim_number: `C-${new Date().getFullYear()}-${data.lastId.claims}`,
      ...claim,
      created_at: new Date().toISOString(),
      fraud_score: Math.random() * 100,
      risk_level: this.calculateRiskLevel(claim.amount),
      status: 'investigating'
    };
    data.claims.push(newClaim);
    this.saveData(data);
    this.updateClientStats(claim.client_id);
    return newClaim;
  }

  getClaims(filters = {}) {
    let claims = this.getData().claims;
    
    // Appliquer les filtres
    if (filters.risk_level && filters.risk_level !== 'all') {
      claims = claims.filter(c => c.risk_level === filters.risk_level);
    }
    if (filters.status && filters.status !== 'all') {
      claims = claims.filter(c => c.status === filters.status);
    }
    if (filters.claim_type && filters.claim_type !== 'all') {
      claims = claims.filter(c => c.claim_type === filters.claim_type);
    }
    if (filters.search) {
      claims = claims.filter(c => 
        c.claim_number?.toLowerCase().includes(filters.search.toLowerCase()) ||
        c.client_name?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    
    return claims;
  }

  calculateRiskLevel(amount) {
    if (amount > 50000) return 'critical';
    if (amount > 20000) return 'high';
    if (amount > 5000) return 'medium';
    return 'low';
  }

  updateClientStats(clientId) {
    const data = this.getData();
    const clientClaims = data.claims.filter(c => c.client_id === clientId);
    const client = data.clients.find(c => c.id === clientId);
    
    if (client) {
      client.claims_count = clientClaims.length;
      client.total_amount = clientClaims.reduce((sum, c) => sum + (c.amount || 0), 0);
      this.saveData(data);
    }
  }

  // Dashboard stats
  getDashboardStats() {
    const data = this.getData();
    const claims = data.claims;
    
    return {
      total_detected: claims.length,
      blocked: claims.filter(c => c.status === 'blocked').length,
      investigating: claims.filter(c => c.status === 'investigating').length,
      false_positive: claims.filter(c => c.status === 'false_positive').length,
      amount_saved: claims.filter(c => c.status === 'blocked').reduce((sum, c) => sum + (c.amount || 0), 0),
      detection_accuracy: 94,
      total_clients: data.clients.length,
      avg_fraud_score: claims.length ? claims.reduce((sum, c) => sum + (c.fraud_score || 0), 0) / claims.length : 0,
      recovery_rate: 78,
      by_claim_type: {
        auto: claims.filter(c => c.claim_type === 'auto').length,
        habitation: claims.filter(c => c.claim_type === 'habitation').length,
        sante: claims.filter(c => c.claim_type === 'sante').length
      },
      risk_distribution: {
        critical: claims.filter(c => c.risk_level === 'critical').length,
        high: claims.filter(c => c.risk_level === 'high').length,
        medium: claims.filter(c => c.risk_level === 'medium').length,
        low: claims.filter(c => c.risk_level === 'low').length
      }
    };
  }

  // Import/Export
  importData(jsonData) {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      localStorage.setItem(this.storageKey, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Erreur import:', error);
      return false;
    }
  }

  exportData() {
    return this.getData();
  }

  // Bulk import depuis CSV
  importFromCSV(csvText, type) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    const imported = [];
    
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(',');
      const item = {};
      headers.forEach((header, idx) => {
        item[header.trim()] = values[idx]?.trim();
      });
      
      if (type === 'client') {
        imported.push(this.addClient(item));
      } else if (type === 'claim') {
        imported.push(this.addClaim(item));
      }
    }
    
    return imported;
  }
}

export const localDataService = new LocalDataService();