// models/sector_schemas.js

// ============================================
// BANQUE - Transactions et fraudes
// ============================================
const BankingSchema = {
  // Collections
  transactions: {
    transaction_id: String,
    amount: Number,
    currency: String,
    sender: {
      id: String,
      name: String,
      account_type: String,
      country: String
    },
    recipient: {
      id: String,
      name: String,
      account_type: String,
      country: String
    },
    fraud_score: Number,
    risk_level: String,
    final_verdict: String,
    timestamp: Date,
    status: String // pending, confirmed, blocked
  },
  
  accounts: {
    account_id: String,
    client_name: String,
    account_type: String, // particulier, entreprise
    balance: Number,
    country: String,
    status: String, // active, blocked, closed
    created_at: Date,
    last_transaction: Date
  },
  
  fraud_alerts: {
    alert_id: String,
    transaction_id: String,
    severity: String, // low, medium, high, critical
    reason: String,
    status: String, // open, resolved, false_positive
    created_at: Date,
    resolved_at: Date
  }
};

// ============================================
// ENTREPRISE - RH, Projets, Produits, Commandes
// ============================================
const EnterpriseSchema = {
  // Collections
  employees: {
    employee_id: String,
    first_name: String,
    last_name: String,
    email: String,
    department: String,
    position: String,
    salary: Number,
    hire_date: Date,
    status: String, // active, inactive, terminated
    manager_id: String
  },
  
  projects: {
    project_id: String,
    name: String,
    description: String,
    department: String,
    manager_id: String,
    status: String, // planning, active, completed, on_hold
    budget: Number,
    start_date: Date,
    end_date: Date,
    team: [String] // employee_ids
  },
  
  products: {
    product_id: String,
    name: String,
    category: String,
    price: Number,
    stock: Number,
    supplier: String,
    status: String, // active, discontinued
    created_at: Date
  },
  
  orders: {
    order_id: String,
    client_id: String,
    products: [{
      product_id: String,
      quantity: Number,
      price: Number
    }],
    total_amount: Number,
    status: String, // pending, processing, shipped, delivered
    order_date: Date,
    delivery_date: Date
  },
  
  stock_alerts: {
    alert_id: String,
    product_id: String,
    current_stock: Number,
    threshold: Number,
    status: String, // open, resolved
    created_at: Date
  }
};

// ============================================
// ASSURANCE - Sinistres, Contrats, Primes
// ============================================
const InsuranceSchema = {
  // Collections
  policies: {
    policy_id: String,
    client_id: String,
    type: String, // auto, habitation, santé, vie
    coverage_amount: Number,
    premium: Number,
    start_date: Date,
    end_date: Date,
    status: String, // active, expired, cancelled
    beneficiaries: [String]
  },
  
  claims: {
    claim_id: String,
    policy_id: String,
    client_id: String,
    amount: Number,
    description: String,
    status: String, // open, investigating, approved, rejected, paid
    fraud_score: Number,
    risk_level: String,
    created_at: Date,
    resolved_at: Date,
    documents: [String] // URLs MinIO
  },
  
  clients: {
    client_id: String,
    first_name: String,
    last_name: String,
    email: String,
    phone: String,
    address: String,
    policies: [String], // policy_ids
    claims: [String], // claim_ids
    risk_score: Number,
    created_at: Date
  },
  
  payments: {
    payment_id: String,
    policy_id: String,
    client_id: String,
    amount: Number,
    type: String, // premium, claim_payout
    status: String, // pending, completed, failed
    payment_date: Date,
    method: String // card, bank_transfer, check
  }
};

// ============================================
// COLLECTIONS COMMUNES
// ============================================
const CommonSchema = {
  // Logs système
  system_logs: {
    log_id: String,
    level: String, // INFO, WARNING, ERROR, DEBUG
    component: String,
    message: String,
    timestamp: Date,
    user_id: String,
    ip_address: String,
    details: Object
  },
  
  // Métriques de performance
  performance_metrics: {
    metric_id: String,
    component: String,
    metric: String,
    value: Number,
    unit: String,
    timestamp: Date,
    sector: String // banking, enterprise, insurance
  },
  
  // Modèles ML
  ml_models: {
    model_id: String,
    name: String,
    type: String, // fraud_detection, risk_assessment, etc.
    version: String,
    sector: String, // banking, enterprise, insurance
    accuracy: Number,
    path: String, // MinIO path
    created_at: Date,
    status: String // training, active, deprecated
  }
};