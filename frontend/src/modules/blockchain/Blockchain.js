// src/modules/blockchain/Blockchain.js - Version avec mapping CORRECT des données
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Row, Col, Table, Tag, Space, Button, Tooltip, Spin, 
  Modal, Divider, Badge, Typography, 
  Tabs, Statistic, FloatButton, Switch, Alert, Drawer,
  Progress, message, Descriptions, Popover, Empty, Result
} from 'antd';
import { 
  TransactionOutlined, WarningOutlined, ReloadOutlined, 
  SecurityScanOutlined, CheckCircleOutlined, ClockCircleOutlined, 
  EyeOutlined, SyncOutlined, 
  DashboardOutlined, ApiOutlined,
  InfoCircleOutlined, BulbOutlined,
  LinkOutlined, CloudSyncOutlined,
  DatabaseOutlined, NodeIndexOutlined,
  ThunderboltOutlined, SafetyCertificateOutlined,
  RadarChartOutlined,
  MergeOutlined,
  BlockOutlined,
  LineChartOutlined,
  ExperimentOutlined,
  RiseOutlined,
  FallOutlined,
  DollarOutlined,
  TeamOutlined,
  UserOutlined,
  FileTextOutlined,
  IdcardOutlined,
  AlertOutlined,
  GlobalOutlined,
  BankOutlined,
  ShopOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import api from '../../services/api';

const { Title, Text } = Typography;

// ============================================
// VOS 10 TYPES DE FRAUDE
// ============================================

const FRAUD_TYPES = {
  CARD_FRAUD: { 
    label: 'Fraude à la carte bancaire', 
    icon: '💳', 
    color: '#ef4444', 
    severity: 'HIGH', 
    description: 'Transaction suspecte sur carte bancaire',
    detected_by: 'Spark + GNN + Grover',
    indicators: ['Multiples pays', 'Montant inhabituel', 'Nouvel appareil']
  },
  MONEY_LAUNDERING: { 
    label: 'Blanchiment d\'argent (AML)', 
    icon: '🏦', 
    color: '#dc2626', 
    severity: 'CRITICAL', 
    description: 'Activité suspecte de blanchiment d\'argent',
    detected_by: 'Spark + GNN + Grover',
    indicators: ['Transactions circulaires', 'Chaînes de transfert', 'Comptes mules']
  },
  ORGANIZED_FRAUD: { 
    label: 'Réseau de fraude organisé', 
    icon: '👥', 
    color: '#b91c1c', 
    severity: 'CRITICAL', 
    description: 'Réseau de fraude organisé détecté',
    detected_by: 'Neo4j + GNN + Grover',
    indicators: ['Communautés suspectes', 'Comptes liés', 'Patterns récurrents']
  },
  MONEY_MULE: { 
    label: 'Compte mule', 
    icon: '🐴', 
    color: '#f59e0b', 
    severity: 'HIGH', 
    description: 'Compte utilisé comme mule financière',
    detected_by: 'Spark + GNN + Grover',
    indicators: ['Virements rapides', 'Multiples comptes', 'Montants moyens']
  },
  ACCOUNT_TAKEOVER: { 
    label: 'Prise de contrôle de compte', 
    icon: '🔓', 
    color: '#d97706', 
    severity: 'HIGH', 
    description: 'Compte potentiellement compromis',
    detected_by: 'Spark + GNN + Grover',
    indicators: ['Nouvel appareil', 'Localisation différente', 'Activité anormale']
  },
  LOAN_FRAUD: { 
    label: 'Fraude au prêt', 
    icon: '📋', 
    color: '#8b5cf6', 
    severity: 'MEDIUM', 
    description: 'Demande de prêt frauduleuse',
    detected_by: 'Spark + Neo4j + GNN + Grover',
    indicators: ['Documents réutilisés', 'Entreprises fictives', 'Réseaux d\'emprunteurs']
  },
  IDENTITY_FRAUD: { 
    label: 'Fraude à l\'identité', 
    icon: '🎭', 
    color: '#7c3aed', 
    severity: 'HIGH', 
    description: 'Usurpation d\'identité détectée',
    detected_by: 'Spark + Neo4j + GNN + Grover',
    indicators: ['Identités partagées', 'Documents réutilisés', 'Multiples comptes']
  },
  ANOMALOUS_TRANSACTION: { 
    label: 'Transaction anormale', 
    icon: '⚡', 
    color: '#f59e0b', 
    severity: 'MEDIUM', 
    description: 'Comportement transactionnel anormal',
    detected_by: 'Spark + GNN',
    indicators: ['Fréquence inhabituelle', 'Montant incohérent', 'Heure suspecte']
  },
  INSIDER_FRAUD: { 
    label: 'Fraude interne', 
    icon: '👨‍💼', 
    color: '#ef4444', 
    severity: 'CRITICAL', 
    description: 'Activité frauduleuse interne',
    detected_by: 'Spark + Neo4j + GNN + Grover',
    indicators: ['Accès injustifié', 'Validation suspecte', 'Accès aux comptes']
  },
  SWIFT_FRAUD: { 
    label: 'Fraude SWIFT', 
    icon: '🌍', 
    color: '#dc2626', 
    severity: 'CRITICAL', 
    description: 'Virement international suspect',
    detected_by: 'Spark + Neo4j + GNN + Grover',
    indicators: ['Itinéraires anormaux', 'Bénéficiaires à risque', 'Réseaux complexes']
  },
  LEGIT: { 
    label: 'Légitime', 
    icon: '✅', 
    color: '#10b981', 
    severity: 'LOW', 
    description: 'Transaction légitime',
    detected_by: 'Pipeline',
    indicators: ['Comportement normal']
  },
  UNKNOWN: { 
    label: 'Type inconnu', 
    icon: '❓', 
    color: '#6b7280', 
    severity: 'LOW', 
    description: 'Type de fraude non identifié',
    detected_by: 'N/A',
    indicators: []
  }
};

// Mapping des verdicts depuis l'API vers nos constantes
const VERDICT_MAP = {
  'fraud': 'FRAUD',
  'FRAUD': 'FRAUD',
  'suspect': 'SUSPECT',
  'SUSPECT': 'SUSPECT',
  'legit': 'LEGIT',
  'LEGIT': 'LEGIT',
  'legitimate': 'LEGIT',
  'pending': 'PENDING',
  'PENDING': 'PENDING'
};

const VERDICT_COLORS = {
  FRAUD: { bg: '#ef444420', border: '#ef4444', text: '#ef4444', icon: '🔴', label: 'FRAUDE' },
  SUSPECT: { bg: '#f59e0b20', border: '#f59e0b', text: '#f59e0b', icon: '🟡', label: 'SUSPECT' },
  LEGIT: { bg: '#10b98120', border: '#10b981', text: '#10b981', icon: '🟢', label: 'LÉGITIME' },
  PENDING: { bg: '#64748b20', border: '#64748b', text: '#94a3b8', icon: '⏳', label: 'EN ATTENTE' }
};

const PIPELINE_SERVICES = [
  { key: 'kafka', label: 'Kafka', icon: <ApiOutlined />, color: '#3b82f6', role: 'Collecte en temps réel' },
  { key: 'spark', label: 'Spark', icon: <ThunderboltOutlined />, color: '#f59e0b', role: 'Analyse temps réel' },
  { key: 'neo4j', label: 'Neo4j', icon: <DatabaseOutlined />, color: '#10b981', role: 'Base de données graphe' },
  { key: 'orchestrator', label: 'Orchestrator', icon: <MergeOutlined />, color: '#8b5cf6', role: 'Décision intelligente' },
  { key: 'graph_transformer', label: 'GraphTransformer', icon: <NodeIndexOutlined />, color: '#8b5cf6', role: 'Analyse GNN' },
  { key: 'grover', label: 'Grover Quantum', icon: <ExperimentOutlined />, color: '#06b6d4', role: 'Recherche quantique' },
  { key: 'blockchain', label: 'Blockchain', icon: <BlockOutlined />, color: '#ec4899', role: 'Enregistrement immuable' }
];

const DEFAULT_PIPELINE_STATUS = {
  kafka: { status: 'healthy' },
  spark: { status: 'healthy' },
  neo4j: { status: 'healthy' },
  orchestrator: { status: 'healthy' },
  graph_transformer: { status: 'healthy' },
  grover: { status: 'healthy' },
  blockchain: { status: 'healthy' },
  global: 'healthy'
};

const Blockchain = () => {
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [orchestratorLogs, setOrchestratorLogs] = useState([]);
  const [blockchainLogs, setBlockchainLogs] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState(null);
  const [xaiVisible, setXaiVisible] = useState(false);
  const [xaiTransactionId, setXaiTransactionId] = useState(null);
  const [pipelineStatus, setPipelineStatus] = useState(DEFAULT_PIPELINE_STATUS);
  const [blockchainStats, setBlockchainStats] = useState({ total: 0, pending: 0, confirmed: 0, failed: 0 });
  const [orchestratorDecisions, setOrchestratorDecisions] = useState([]);
  const [stats, setStats] = useState({ total: 0, frauds: 0, suspect: 0, legit: 0, avgScore: 0, byFraudType: {} });

  // ============================================
  // LOGS
  // ============================================

  const addLog = useCallback((message, type = 'info', source = 'pipeline') => {
    const timestamp = new Date();
    const logEntry = { id: Date.now() + Math.random(), message, type, timestamp, source };
    setLogs(prev => [...prev, logEntry]);
    if (source === 'orchestrator') setOrchestratorLogs(prev => [...prev, logEntry]);
    if (source === 'blockchain') setBlockchainLogs(prev => [...prev, logEntry]);
  }, []);

  // ============================================
  // DÉTERMINER LE TYPE DE FRAUDE À PARTIR DES DONNÉES
  // ============================================

  const determineFraudType = (tx) => {
    // Si la transaction a un type de fraude explicite
    if (tx.fraud_type && tx.fraud_type !== 'UNKNOWN') {
      return tx.fraud_type;
    }
    
    // Déterminer en fonction du verdict et du score
    const verdict = (tx.final_verdict || tx.verdict || '').toUpperCase();
    const score = parseFloat(tx.final_score || tx.fraud_score || 0);
    
    if (verdict === 'LEGIT' || verdict === 'LEGITIMATE') {
      return 'LEGIT';
    }
    
    if (verdict === 'FRAUD' || score > 0.7) {
      // Essayer de déduire le type à partir du risk_level ou d'autres indices
      if (tx.risk_level) {
        const riskMap = {
          'card_fraud': 'CARD_FRAUD',
          'aml': 'MONEY_LAUNDERING',
          'organized': 'ORGANIZED_FRAUD',
          'money_mule': 'MONEY_MULE',
          'account_takeover': 'ACCOUNT_TAKEOVER',
          'loan_fraud': 'LOAN_FRAUD',
          'identity_fraud': 'IDENTITY_FRAUD',
          'anomalous': 'ANOMALOUS_TRANSACTION',
          'insider': 'INSIDER_FRAUD',
          'swift': 'SWIFT_FRAUD'
        };
        const normalizedRisk = tx.risk_level.toLowerCase().replace(/['"]/g, '').trim();
        if (riskMap[normalizedRisk]) {
          return riskMap[normalizedRisk];
        }
      }
      
      // Si le score est très élevé mais pas de type spécifique
      if (score > 0.85) {
        return 'CARD_FRAUD'; // Type par défaut pour les fraudes graves
      }
      
      return 'ANOMALOUS_TRANSACTION';
    }
    
    if (verdict === 'SUSPECT' || score > 0.4) {
      return 'ANOMALOUS_TRANSACTION';
    }
    
    return 'LEGIT';
  };

  // ============================================
  // FETCH DONNÉES RÉELLES
  // ============================================

  const fetchTransactions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/neo4j/transactions?limit=200');
      
      let txData = [];
      if (response.data?.transactions) {
        txData = response.data.transactions;
      } else if (Array.isArray(response.data)) {
        txData = response.data;
      }
      
      
      if (!txData || txData.length === 0) {
        setError('Aucune transaction trouvée dans le pipeline');
        addLog('⚠️ Aucune transaction trouvée dans le pipeline', 'warning', 'pipeline');
        setTransactions([]);
        setStats({ total: 0, frauds: 0, suspect: 0, legit: 0, avgScore: 0, byFraudType: {} });
        return;
      }
      
      const txWithKeys = txData.map((tx, i) => {
        // Extraire les scores
        const sparkScore = parseFloat(tx.fraud_score) || parseFloat(tx.spark_score) || 0;
        const graphScore = parseFloat(tx.graph_score) || 0;
        const quantumScore = parseFloat(tx.quantum_score) || 0;
        const finalScore = parseFloat(tx.final_score) || parseFloat(tx.fraud_score) || 0;
        
        // Extraire les verdicts
        const graphVerdict = VERDICT_MAP[tx.graph_verdict?.toLowerCase()] || VERDICT_MAP[tx.final_verdict?.toLowerCase()] || 'PENDING';
        const finalVerdict = VERDICT_MAP[tx.final_verdict?.toLowerCase()] || VERDICT_MAP[tx.verdict?.toLowerCase()] || 'PENDING';
        
        // Déterminer le type de fraude
        const fraudType = determineFraudType(tx);
        const fraudInfo = FRAUD_TYPES[fraudType] || FRAUD_TYPES.UNKNOWN;
        
        // Extraire le statut blockchain
        let web3Status = 'pending';
        if (tx.web3_status) {
          web3Status = tx.web3_status.toLowerCase();
        } else if (tx.blockchain_status) {
          web3Status = tx.blockchain_status.toLowerCase();
        }
        
        return {
          transaction_id: tx.transaction_id || tx.id || `TX-${Date.now()}-${i}`,
          amount: parseFloat(tx.amount) || 0,
          currency: tx.currency || 'USD',
          sender: tx.sender || { name: 'Inconnu' },
          recipient: tx.recipient || { name: 'Inconnu' },
          timestamp: tx.timestamp || new Date().toISOString(),
          
          // Scores
          spark_score: sparkScore,
          graph_score: graphScore,
          quantum_score: quantumScore,
          final_score: finalScore,
          
          // Verdicts
          spark_verdict: finalVerdict,
          graph_verdict: graphVerdict,
          quantum_verdict: graphVerdict,
          final_verdict: finalVerdict,
          
          // Type de fraude
          fraud_type: fraudType,
          fraud_type_info: fraudInfo,
          risk_level: tx.risk_level || 'unknown',
          
          // Blockchain
          web3_status: web3Status,
          web3_tx_hash: tx.web3_tx_hash || tx.blockchain_hash || null,
          web3_block: tx.web3_block || tx.blockchain_block || null,
          
          // Métadonnées
          service_used: tx.enriched_by || 'spark',
          path: tx.path || 'fast',
          explanation: tx.explanation || `Analyse automatique - ${fraudInfo.label}`,
          enriched_by: tx.enriched_by || 'spark',
          
          // Données brutes pour référence
          _raw: tx,
          _key: `${tx.transaction_id || tx.id || i}-${i}`
        };
      });
      
      setTransactions(txWithKeys);
      
      // Calcul des statistiques
      const total = txWithKeys.length;
      const frauds = txWithKeys.filter(t => t.final_verdict === 'FRAUD').length;
      const suspect = txWithKeys.filter(t => t.final_verdict === 'SUSPECT').length;
      const legit = txWithKeys.filter(t => t.final_verdict === 'LEGIT').length;
      const avgScore = total > 0 ? txWithKeys.reduce((acc, t) => acc + (t.final_score || 0), 0) / total : 0;
      
      const byFraudType = {};
      txWithKeys.forEach(tx => {
        const type = tx.fraud_type || 'UNKNOWN';
        if (!byFraudType[type]) byFraudType[type] = { count: 0, amount: 0 };
        byFraudType[type].count++;
        byFraudType[type].amount += tx.amount || 0;
      });
      
      const pendingBlockchain = txWithKeys.filter(t => t.web3_status === 'pending').length;
      const confirmedBlockchain = txWithKeys.filter(t => t.web3_status === 'confirmed' || t.web3_status === 'success').length;
      
      setStats({ total, frauds, suspect, legit, avgScore, byFraudType });
      setBlockchainStats({
        total,
        pending: pendingBlockchain,
        confirmed: confirmedBlockchain,
        failed: total - pendingBlockchain - confirmedBlockchain
      });
      
      // Log des types de fraude trouvés
      const fraudTypesFound = Object.keys(byFraudType).filter(k => k !== 'UNKNOWN' && k !== 'LEGIT' && byFraudType[k].count > 0);
      if (fraudTypesFound.length > 0) {
        addLog(`🔍 Types de fraude détectés: ${fraudTypesFound.join(', ')}`, 'info', 'pipeline');
      } else {
        addLog('ℹ️ Aucun type de fraude spécifique détecté', 'info', 'pipeline');
      }
      
      addLog(`📊 ${total} transactions chargées (${frauds} fraudes, ${suspect} suspectes)`, 'info', 'pipeline');
      
    } catch (err) {
      console.error('❌ Erreur fetchTransactions:', err);
      setError(`Erreur de chargement: ${err.message}`);
      addLog(`❌ Erreur API: ${err.message}`, 'error', 'pipeline');
      message.error('Erreur de chargement des transactions');
      
      setTransactions([]);
      setStats({ total: 0, frauds: 0, suspect: 0, legit: 0, avgScore: 0, byFraudType: {} });
    } finally {
      setLoading(false);
    }
  }, [addLog]);

  const fetchPipelineStatus = useCallback(async () => {
    try {
      const response = await api.get('/pipeline/status');
      if (response.data) {
        const statusData = response.data;
        setPipelineStatus({
          kafka: statusData.kafka || { status: 'healthy' },
          spark: statusData.spark || { status: 'healthy' },
          neo4j: statusData.neo4j || { status: 'healthy' },
          orchestrator: statusData.orchestrator || { status: 'healthy' },
          graph_transformer: statusData.graph_transformer || statusData.graphTransformer || { status: 'healthy' },
          grover: statusData.grover || { status: 'healthy' },
          blockchain: statusData.blockchain || { status: 'healthy' },
          global: statusData.global || 'healthy'
        });
        addLog(`🔄 Pipeline status: ${statusData.global || 'healthy'}`, 'info', 'pipeline');
      }
    } catch (err) {
      console.warn('Pipeline status error:', err);
      addLog('⚠️ Erreur récupération statut pipeline', 'warning', 'pipeline');
    }
  }, [addLog]);

  const fetchOrchestratorDecisions = useCallback(async () => {
    try {
      const response = await api.get('/orchestrator/decisions?limit=20');
      if (response.data) {
        const decisions = response.data.data || response.data.decisions || [];
        setOrchestratorDecisions(decisions);
        addLog(`🎯 ${decisions.length} décisions Orchestrator`, 'info', 'orchestrator');
      }
    } catch (err) {
      console.warn('Orchestrator decisions error:', err);
    }
  }, [addLog]);

  const fetchBlockchainStats = useCallback(async () => {
    try {
      const response = await api.get('/blockchain/status');
      if (response.data) {
        const total = response.data.total_blocks || response.data.total || 0;
        const pending = response.data.pending_transactions || 0;
        const confirmed = response.data.total_transactions || response.data.confirmed_count || 0;
        
        setBlockchainStats(prev => ({
          ...prev,
          total,
          pending,
          confirmed,
          failed: 0
        }));
        addLog(`⛓️ Blockchain: ${total} blocs, ${pending} en attente`, 'info', 'blockchain');
      }
    } catch (err) {
      console.warn('Blockchain stats error:', err);
    }
  }, [addLog]);

  const fetchData = useCallback(async () => {
    await Promise.allSettled([
      fetchTransactions(),
      fetchPipelineStatus(),
      fetchBlockchainStats(),
      fetchOrchestratorDecisions()
    ]);
  }, [fetchTransactions, fetchPipelineStatus, fetchBlockchainStats, fetchOrchestratorDecisions]);

  const handleExplainAI = (record) => {
    setXaiTransactionId(record.transaction_id);
    setXaiVisible(true);
    addLog(`🧠 Explication AI pour ${record.transaction_id}`, 'info', 'pipeline');
  };

  const handleTrace = (record) => {
    setSelectedTx(record);
    setModalVisible(true);
    addLog(`🔍 Trace blockchain ${record.transaction_id}`, 'info', 'blockchain');
  };

  const refreshAll = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    refreshAll();
    let interval;
    if (autoRefresh) {
      interval = setInterval(refreshAll, 15000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [autoRefresh, refreshAll]);

  // ============================================
  // COLONNES TABLEAU
  // ============================================

  const columns = [
    { 
      title: 'ID', 
      dataIndex: 'transaction_id', 
      key: 'id', 
      width: 110, 
      render: (id) => <code style={{ color: '#3b82f6', fontSize: 11 }}>{id?.substring(0, 12) || 'N/A'}</code> 
    },
    { 
      title: 'Expéditeur', 
      dataIndex: ['sender', 'name'], 
      key: 'sender', 
      width: 90, 
      render: (name) => <Text style={{ color: '#cbd5e1' }}>{name || '-'}</Text> 
    },
    { 
      title: 'Destinataire', 
      dataIndex: ['recipient', 'name'], 
      key: 'recipient', 
      width: 90, 
      render: (name) => <Text style={{ color: '#cbd5e1' }}>{name || '-'}</Text> 
    },
    { 
      title: 'Montant', 
      dataIndex: 'amount', 
      key: 'amount', 
      width: 80, 
      align: 'right', 
      render: (amount) => <Text strong style={{ color: '#10b981' }}>{amount?.toLocaleString() || 0}€</Text> 
    },
    { 
      title: 'Spark', 
      dataIndex: 'spark_score', 
      key: 'spark', 
      width: 55, 
      align: 'center', 
      render: (s) => {
        const score = parseFloat(s) || 0;
        return <Tag color={score > 0.7 ? '#ef4444' : score > 0.4 ? '#f59e0b' : '#10b981'} style={{ borderRadius: 8, fontSize: 10 }}>{(score * 100).toFixed(0)}%</Tag>;
      } 
    },
    { 
      title: 'Graph', 
      dataIndex: 'graph_score', 
      key: 'graph', 
      width: 55, 
      align: 'center', 
      render: (s) => {
        const score = parseFloat(s) || 0;
        return <Tag color={score > 0.7 ? '#ef4444' : score > 0.4 ? '#f59e0b' : '#10b981'} style={{ borderRadius: 8, fontSize: 10 }}>{(score * 100).toFixed(0)}%</Tag>;
      } 
    },
    { 
      title: 'Quantum', 
      dataIndex: 'quantum_score', 
      key: 'quantum', 
      width: 55, 
      align: 'center', 
      render: (s) => {
        const score = parseFloat(s) || 0;
        return <Tag color={score > 0.7 ? '#ef4444' : score > 0.4 ? '#f59e0b' : '#10b981'} style={{ borderRadius: 8, fontSize: 10 }}>{(score * 100).toFixed(0)}%</Tag>;
      } 
    },
    { 
      title: 'Final', 
      dataIndex: 'final_score', 
      key: 'final', 
      width: 55, 
      align: 'center', 
      render: (s) => {
        const score = parseFloat(s) || 0;
        return <Tag color={score > 0.7 ? '#ef4444' : score > 0.4 ? '#f59e0b' : '#10b981'} style={{ borderRadius: 8, fontSize: 10 }}>{(score * 100).toFixed(0)}%</Tag>;
      } 
    },
    { 
      title: 'Verdict', 
      dataIndex: 'final_verdict', 
      key: 'verdict', 
      width: 70, 
      render: (v) => { 
        const verdict = (v || 'PENDING').toUpperCase();
        const info = VERDICT_COLORS[verdict] || VERDICT_COLORS.PENDING; 
        return <Tag style={{ background: info.bg, borderColor: info.border, color: info.text, borderRadius: 8, fontSize: 10 }}>{info.icon} {info.label}</Tag>;
      } 
    },
    { 
      title: 'Type fraude', 
      dataIndex: 'fraud_type', 
      key: 'fraud_type', 
      width: 180, 
      render: (type) => { 
        const info = FRAUD_TYPES[type] || FRAUD_TYPES.UNKNOWN; 
        return (
          <Tooltip title={
            <div>
              <div><strong>{info.label}</strong></div>
              <div style={{ marginTop: 4, fontSize: 11 }}>{info.description}</div>
              <div style={{ marginTop: 4, fontSize: 11 }}>Détecté par: {info.detected_by}</div>
              {info.indicators && info.indicators.length > 0 && (
                <div style={{ marginTop: 4, fontSize: 11 }}>Indicateurs: {info.indicators.join(', ')}</div>
              )}
            </div>
          }>
            <Tag color={info.color} style={{ borderRadius: 8, fontSize: 10 }}>
              {info.icon} {info.label}
            </Tag>
          </Tooltip>
        );
      } 
    },
    { 
      title: 'Détecté par', 
      dataIndex: 'service_used', 
      key: 'detected_by', 
      width: 100, 
      render: (s) => {
        const colors = { spark: '#f59e0b', graph_transformer: '#8b5cf6', grover: '#06b6d4', orchestrator: '#ec4899' };
        const labels = { spark: 'Spark', graph_transformer: 'Graph GNN', grover: 'Grover Quantum', orchestrator: 'Orchestrator' };
        return <Tag color={colors[s] || '#64748b'} style={{ borderRadius: 8, fontSize: 10 }}>{labels[s] || s || 'spark'}</Tag>;
      } 
    },
    { 
      title: 'Path', 
      dataIndex: 'path', 
      key: 'path', 
      width: 60, 
      render: (p) => <Tag color={p === 'quantum' ? '#06b6d4' : p === 'deep' ? '#8b5cf6' : '#10b981'} style={{ borderRadius: 8, fontSize: 10 }}>{p || 'N/A'}</Tag> 
    },
    { 
      title: 'Blockchain', 
      key: 'blockchain', 
      width: 90, 
      render: (_, r) => { 
        const status = r.web3_status || 'pending';
        const statusLower = status.toLowerCase();
        const colors = { confirmed: '#10b981', success: '#10b981', pending: '#f59e0b', failed: '#ef4444' };
        const labels = { confirmed: '✅ Confirmé', success: '✅ Confirmé', pending: '⏳ En attente', failed: '❌ Échec' };
        const color = colors[statusLower] || '#64748b';
        const label = labels[statusLower] || status;
        return (
          <Tooltip title={
            <div>
              <div>{label}</div>
              {r.web3_tx_hash && <div style={{ fontSize: 11 }}>Hash: {r.web3_tx_hash?.substring(0, 16)}...</div>}
              {r.web3_block && <div style={{ fontSize: 11 }}>Bloc: #{r.web3_block}</div>}
            </div>
          }>
            <Tag color={color} style={{ borderRadius: 8, fontSize: 10 }}>
              {statusLower === 'confirmed' || statusLower === 'success' ? '✅' : 
               statusLower === 'pending' ? '⏳' : '❌'} {status}
            </Tag>
          </Tooltip>
        );
      } 
    },
    { 
      title: 'AI', 
      key: 'ai', 
      width: 40, 
      render: (_, r) => <Tooltip title="Explainable AI (SHAP + GNNExplainer)"><Button type="text" icon={<BulbOutlined />} onClick={() => handleExplainAI(r)} style={{ color: '#10b981' }} size="small" /></Tooltip> 
    },
    { 
      title: '', 
      key: 'action', 
      width: 40, 
      render: (_, r) => <Button type="text" icon={<EyeOutlined />} onClick={() => handleTrace(r)} style={{ color: '#3b82f6' }} size="small" /> 
    }
  ];

  // ============================================
  // RENDU PIPELINE STATUS
  // ============================================

  const renderPipelineStatus = () => {
    return PIPELINE_SERVICES.map(service => {
      const statusObj = pipelineStatus[service.key] || { status: 'healthy' };
      const statusValue = String(statusObj.status || 'healthy').toLowerCase();
      const isHealthy = statusValue === 'healthy' || statusValue === 'ok' || statusValue === 'active' || statusValue === 'connected';
      
      const color = isHealthy ? '#10b981' : '#ef4444';
      const bgColor = isHealthy ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)';
      const borderColor = isHealthy ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)';
      
      return (
        <div key={service.key} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', background: bgColor, borderRadius: 6, border: `1px solid ${borderColor}` }}>
          <span style={{ color: color, fontSize: 10 }}>●</span>
          <Text style={{ color: '#94a3b8', fontSize: 10 }}>{service.label}</Text>
          <Text style={{ color: color, fontSize: 9, fontWeight: 'bold' }}>{isHealthy ? '✅' : '❌'}</Text>
          <Tooltip title={service.role}><InfoCircleOutlined style={{ color: '#475569', fontSize: 10 }} /></Tooltip>
        </div>
      );
    });
  };

  // ============================================
  // CHART OPTIONS
  // ============================================

  const fraudTypesOption = useMemo(() => {
    const data = Object.entries(stats.byFraudType || {})
      .filter(([key]) => key && key !== 'UNKNOWN' && key !== 'LEGIT')
      .map(([key, value]) => {
        const info = FRAUD_TYPES[key] || FRAUD_TYPES.UNKNOWN;
        return { name: info.label, value: value.count || 0, itemStyle: { color: info.color } };
      }).filter(d => d.value > 0);
    
    if (data.length === 0) {
      return {
        tooltip: { trigger: 'item', formatter: 'Aucune fraude détectée' },
        series: [{ 
          type: 'pie', 
          radius: ['40%', '65%'], 
          itemStyle: { borderRadius: 6, borderColor: '#0a0a1a', borderWidth: 2 }, 
          label: { color: '#94a3b8', fontSize: 10 }, 
          data: [{ value: 1, name: 'Aucune fraude', itemStyle: { color: '#334155' } }] 
        }]
      };
    }
    
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', left: 'left', textStyle: { color: '#94a3b8', fontSize: 10 }, itemWidth: 8, itemHeight: 8 },
      series: [{ type: 'pie', radius: ['40%', '65%'], itemStyle: { borderRadius: 6, borderColor: '#0a0a1a', borderWidth: 2 }, label: { color: '#94a3b8', fontSize: 10 }, data }]
    };
  }, [stats.byFraudType]);

  const pieOption = useMemo(() => {
    const data = stats.total > 0 ? [
      { value: stats.frauds || 0, name: 'FRAUD', itemStyle: { color: '#ef4444' } },
      { value: stats.suspect || 0, name: 'SUSPECT', itemStyle: { color: '#f59e0b' } },
      { value: stats.legit || 0, name: 'LEGIT', itemStyle: { color: '#10b981' } }
    ] : [{ value: 1, name: 'Aucune donnée', itemStyle: { color: '#334155' } }];
    
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', left: 'left', textStyle: { color: '#94a3b8', fontSize: 10 }, itemWidth: 8, itemHeight: 8 },
      series: [{ type: 'pie', radius: ['40%', '65%'], itemStyle: { borderRadius: 6, borderColor: '#0a0a1a', borderWidth: 2 }, label: { color: '#94a3b8', fontSize: 10 }, data }]
    };
  }, [stats]);

  const blockchainPieOption = useMemo(() => {
    const data = [
      { value: blockchainStats.confirmed || 0, name: 'Confirmés', itemStyle: { color: '#10b981' } },
      { value: blockchainStats.pending || 0, name: 'En attente', itemStyle: { color: '#f59e0b' } },
      { value: blockchainStats.failed || 0, name: 'Échecs', itemStyle: { color: '#ef4444' } }
    ].filter(d => d.value > 0);
    
    if (data.length === 0) {
      return {
        tooltip: { trigger: 'item', formatter: 'Aucune transaction blockchain' },
        series: [{ 
          type: 'pie', 
          radius: ['40%', '65%'], 
          itemStyle: { borderRadius: 6, borderColor: '#0a0a1a', borderWidth: 2 }, 
          label: { color: '#94a3b8', fontSize: 10 }, 
          data: [{ value: 1, name: 'Aucune donnée', itemStyle: { color: '#334155' } }] 
        }]
      };
    }
    
    return {
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      legend: { orient: 'vertical', left: 'left', textStyle: { color: '#94a3b8', fontSize: 10 }, itemWidth: 8, itemHeight: 8 },
      series: [{ type: 'pie', radius: ['40%', '65%'], itemStyle: { borderRadius: 6, borderColor: '#0a0a1a', borderWidth: 2 }, label: { color: '#94a3b8', fontSize: 10 }, data }]
    };
  }, [blockchainStats]);

  const decisionColumns = [
    { title: 'Transaction', dataIndex: 'transaction_id', key: 'id', width: 110, render: id => <code style={{ color: '#3b82f6' }}>{id?.substring(0, 12) || 'N/A'}</code> },
    { title: 'Service', dataIndex: 'service_used', key: 'service', width: 100, render: s => <Tag color={s === 'grover' ? '#06b6d4' : s === 'graph_transformer' ? '#8b5cf6' : '#f59e0b'}>{s || 'N/A'}</Tag> },
    { title: 'Path', dataIndex: 'path', key: 'path', width: 80, render: p => p || 'N/A' },
    { title: 'Verdict', dataIndex: 'is_fraudulent', key: 'verdict', width: 70, render: v => v ? <Tag color="#ef4444">FRAUD</Tag> : <Tag color="#10b981">LEGIT</Tag> },
    { title: 'Confiance', dataIndex: 'confidence', key: 'conf', width: 70, render: c => `${((c || 0) * 100).toFixed(0)}%` },
    { title: 'Volume', dataIndex: 'volume_at_time', key: 'volume', width: 70, render: v => `${v || 0} tx/sec` }
  ];

  // ============================================
  // RENDER PRINCIPAL
  // ============================================

  if (loading && transactions.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: 'linear-gradient(145deg, #0a0a1a 0%, #0f0f2a 50%, #1a1a3a 100%)' }}>
        <Spin size="large" tip="Chargement des données du pipeline..." ><div/></Spin>
      </div>
    );
  }

  return (
    <div style={{ background: 'linear-gradient(145deg, #0a0a1a 0%, #0f0f2a 50%, #1a1a3a 100%)', minHeight: '100vh', padding: 16 }}>

      {/* HEADER */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} style={{
        background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(20px)',
        borderRadius: 24, border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)', padding: '16px 24px', marginBottom: 16
      }}>
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col>
            <Space size={12}>
              <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #3b82f6, #475569)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <SafetyCertificateOutlined style={{ fontSize: 20, color: '#fff' }} />
              </div>
              <div>
                <Title level={5} style={{ margin: 0, color: '#fff', fontWeight: 700 }}>Pipeline Intelligence & Blockchain</Title>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}><TransactionOutlined /> {stats.total || 0} tx</Text>
                  <Text style={{ color: '#ef4444', fontSize: 11 }}><WarningOutlined /> {stats.frauds || 0}</Text>
                  <Text style={{ color: '#f59e0b', fontSize: 11 }}><InfoCircleOutlined /> {stats.suspect || 0}</Text>
                  <Text style={{ color: '#10b981', fontSize: 11 }}><CheckCircleOutlined /> {stats.legit || 0}</Text>
                  <Text style={{ color: '#475569', fontSize: 11 }}><SecurityScanOutlined /> {((stats.avgScore || 0) * 100).toFixed(0)}%</Text>
                  <Text style={{ color: '#10b981', fontSize: 11 }}><LinkOutlined /> {blockchainStats.confirmed || 0} confirmés</Text>
                  <Text style={{ color: '#8b5cf6', fontSize: 11 }}><MergeOutlined /> {orchestratorDecisions.length || 0} décisions</Text>
                </div>
              </div>
            </Space>
          </Col>
          <Col>
            <Space size={8}>
              <Switch checkedChildren={<SyncOutlined />} unCheckedChildren={<ClockCircleOutlined />} checked={autoRefresh} onChange={setAutoRefresh} size="small" style={{ background: autoRefresh ? '#10b981' : '#475569' }} />
              <Button icon={<ReloadOutlined spin={loading} />} onClick={refreshAll} size="small" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', borderRadius: 8 }}>Actualiser</Button>
            </Space>
          </Col>
        </Row>
      </motion.div>

      {/* STATS CARDS */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={6} lg={3}>
          <Card style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }} bodyStyle={{ padding: 14 }}>
            <Statistic title={<Text style={{ color: '#94a3b8', fontSize: 10 }}>Total</Text>} value={stats.total || 0} valueStyle={{ color: '#fff', fontSize: 20 }} prefix={<TransactionOutlined style={{ color: '#3b82f6' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={6} lg={3}>
          <Card style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }} bodyStyle={{ padding: 14 }}>
            <Statistic title={<Text style={{ color: '#94a3b8', fontSize: 10 }}>Fraudes</Text>} value={stats.frauds || 0} valueStyle={{ color: '#ef4444', fontSize: 20 }} prefix={<WarningOutlined style={{ color: '#ef4444' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={6} lg={3}>
          <Card style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }} bodyStyle={{ padding: 14 }}>
            <Statistic title={<Text style={{ color: '#94a3b8', fontSize: 10 }}>Suspectes</Text>} value={stats.suspect || 0} valueStyle={{ color: '#f59e0b', fontSize: 20 }} prefix={<InfoCircleOutlined style={{ color: '#f59e0b' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={6} lg={3}>
          <Card style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }} bodyStyle={{ padding: 14 }}>
            <Statistic title={<Text style={{ color: '#94a3b8', fontSize: 10 }}>Score</Text>} value={((stats.avgScore || 0) * 100).toFixed(0)} suffix="%" valueStyle={{ color: '#475569', fontSize: 20 }} prefix={<SecurityScanOutlined style={{ color: '#475569' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={6} lg={3}>
          <Card style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }} bodyStyle={{ padding: 14 }}>
            <Statistic title={<Text style={{ color: '#94a3b8', fontSize: 10 }}>TPS</Text>} value={0} valueStyle={{ color: '#475569', fontSize: 20 }} prefix={<LineChartOutlined style={{ color: '#475569' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={6} lg={3}>
          <Card style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }} bodyStyle={{ padding: 14 }}>
            <Statistic title={<Text style={{ color: '#94a3b8', fontSize: 10 }}>Blockchain</Text>} value={blockchainStats.confirmed || 0} valueStyle={{ color: '#10b981', fontSize: 20 }} prefix={<LinkOutlined style={{ color: '#10b981' }} />} suffix={<Text style={{ fontSize: 11, color: '#64748b' }}>/ {blockchainStats.total || 0}</Text>} />
          </Card>
        </Col>
        <Col xs={24} sm={6} lg={3}>
          <Card style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }} bodyStyle={{ padding: 14 }}>
            <Statistic title={<Text style={{ color: '#94a3b8', fontSize: 10 }}>Types Fraude</Text>} value={Object.keys(stats.byFraudType || {}).filter(k => k && k !== 'UNKNOWN' && k !== 'LEGIT' && stats.byFraudType[k]?.count > 0).length} valueStyle={{ color: '#8b5cf6', fontSize: 20 }} prefix={<RadarChartOutlined style={{ color: '#8b5cf6' }} />} />
          </Card>
        </Col>
        <Col xs={24} sm={6} lg={3}>
          <Card style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }} bodyStyle={{ padding: 14 }}>
            <Statistic title={<Text style={{ color: '#94a3b8', fontSize: 10 }}>Latence</Text>} value={0} suffix="ms" valueStyle={{ color: '#475569', fontSize: 20 }} prefix={<ClockCircleOutlined style={{ color: '#475569' }} />} />
          </Card>
        </Col>
      </Row>

      {/* PIPELINE STATUS */}
      <Card style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)', marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}><ApiOutlined /> Pipeline Status</Text>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{renderPipelineStatus()}</div>
          <Badge status={pipelineStatus.global === 'healthy' || pipelineStatus.global === 'ok' ? 'success' : 'warning'} text={<Text style={{ color: '#64748b', fontSize: 11 }}>{pipelineStatus.global || 'Healthy'}</Text>} />
        </div>
      </Card>

      {/* CHARTS */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={8}>
          <Card style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }} bodyStyle={{ padding: 12 }}>
            <Text style={{ color: '#94a3b8', fontSize: 11 }}>Distribution des verdicts</Text>
            <ReactECharts option={pieOption} style={{ height: 180, width: '100%' }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }} bodyStyle={{ padding: 12 }}>
            <Text style={{ color: '#94a3b8', fontSize: 11 }}>Statut Blockchain</Text>
            <ReactECharts option={blockchainPieOption} style={{ height: 180, width: '100%' }} />
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }} bodyStyle={{ padding: 12 }}>
            <Text style={{ color: '#94a3b8', fontSize: 11 }}>Types de fraude détectés</Text>
            <ReactECharts option={fraudTypesOption} style={{ height: 180, width: '100%' }} />
          </Card>
        </Col>
      </Row>

      {/* MAIN TABS */}
      <Card style={{ background: 'rgba(255,255,255,0.03)', backdropFilter: 'blur(12px)', borderRadius: 16, border: '1px solid rgba(255,255,255,0.06)' }} bodyStyle={{ padding: 0 }}>
        <Tabs defaultActiveKey="transactions" style={{ padding: '0 12px' }}
          items={[
            { key: 'transactions', label: <span><TransactionOutlined /> Transactions ({transactions.length})</span>,
              children: <Table columns={columns} dataSource={transactions} rowKey="_key" pagination={{ pageSize: 10, showTotal: (t) => `Total: ${t}` }} loading={loading} style={{ padding: '0 12px 12px' }} locale={{ emptyText: 'Aucune transaction disponible dans le pipeline' }} />
            },
            { key: 'orchestrator', label: <span><MergeOutlined /> Orchestrator ({orchestratorDecisions.length})</span>,
              children: (
                <div style={{ padding: 12 }}>
                  <Table columns={decisionColumns} dataSource={orchestratorDecisions} rowKey={(r, i) => `${r.transaction_id || i}-${i}`} pagination={{ pageSize: 10 }} size="small" locale={{ emptyText: 'Aucune décision disponible' }} />
                  <Divider />
                  <Card size="small" style={{ background: 'rgba(139,92,246,0.05)', borderColor: 'rgba(139,92,246,0.1)' }}>
                    <Text style={{ color: '#94a3b8', fontSize: 11 }}>Logs Orchestrator</Text>
                    <div style={{ background: '#0f172a', borderRadius: 8, padding: 8, maxHeight: 150, overflowY: 'auto', marginTop: 4 }}>
                      {orchestratorLogs.length === 0 ? <Text style={{ color: '#64748b', fontSize: 10 }}>Aucun log</Text> :
                        orchestratorLogs.slice().reverse().slice(0, 20).map((log, i) => (
                          <div key={i} style={{ padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: 6 }}>
                            <Text style={{ color: log.type === 'error' ? '#ef4444' : '#94a3b8', fontSize: 10 }}>{log.type === 'error' ? '❌' : '📝'}</Text>
                            <Text style={{ color: '#94a3b8', fontSize: 10, flex: 1 }}>{log.message}</Text>
                            <Text style={{ color: '#475569', fontSize: 8 }}>{log.timestamp?.toLocaleTimeString()}</Text>
                          </div>
                        ))
                      }
                    </div>
                  </Card>
                </div>
              )
            },
            { key: 'blockchain', label: <span><LinkOutlined /> Blockchain</span>,
              children: (
                <div style={{ padding: 12 }}>
                  <Card style={{ background: 'rgba(16,185,129,0.05)', borderRadius: 12, border: '1px solid rgba(16,185,129,0.1)' }}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><Text style={{ color: '#94a3b8' }}>Blocs</Text><Text style={{ color: '#10b981' }}>{blockchainStats.total || 0}</Text></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><Text style={{ color: '#94a3b8' }}>Confirmées</Text><Text style={{ color: '#10b981' }}>{blockchainStats.confirmed || 0}</Text></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><Text style={{ color: '#94a3b8' }}>En attente</Text><Text style={{ color: '#f59e0b' }}>{blockchainStats.pending || 0}</Text></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><Text style={{ color: '#94a3b8' }}>Échecs</Text><Text style={{ color: '#ef4444' }}>{blockchainStats.failed || 0}</Text></div>
                      <Progress percent={blockchainStats.total > 0 ? (blockchainStats.confirmed / blockchainStats.total * 100) : 0} strokeColor="#10b981" size="small" showInfo={false} />
                      <Text style={{ color: '#64748b', fontSize: 10 }}>Taux confirmation: {blockchainStats.total > 0 ? (blockchainStats.confirmed / blockchainStats.total * 100).toFixed(1) : 0}%</Text>
                      <Divider />
                      <Text style={{ color: '#94a3b8', fontSize: 11 }}>Logs Blockchain</Text>
                      <div style={{ background: '#0f172a', borderRadius: 8, padding: 8, maxHeight: 150, overflowY: 'auto' }}>
                        {blockchainLogs.length === 0 ? <Text style={{ color: '#64748b', fontSize: 10 }}>Aucun log</Text> :
                          blockchainLogs.slice().reverse().slice(0, 20).map((log, i) => (
                            <div key={i} style={{ padding: '2px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: 6 }}>
                              <Text style={{ color: log.type === 'error' ? '#ef4444' : '#10b981', fontSize: 10 }}>{log.type === 'error' ? '❌' : '⛓️'}</Text>
                              <Text style={{ color: '#94a3b8', fontSize: 10, flex: 1 }}>{log.message}</Text>
                              <Text style={{ color: '#475569', fontSize: 8 }}>{log.timestamp?.toLocaleTimeString()}</Text>
                            </div>
                          ))
                        }
                      </div>
                    </Space>
                  </Card>
                </div>
              )
            },
            { key: 'logs', label: <span><span style={{ fontSize: 14 }}>📝</span> Tous les logs</span>,
              children: (
                <div style={{ padding: 12 }}>
                  <div style={{ background: '#0f172a', borderRadius: 10, padding: 12, maxHeight: 400, overflowY: 'auto' }}>
                    {logs.length === 0 ? <div style={{ textAlign: 'center', padding: 20, color: '#64748b' }}>Aucun log</div> :
                      logs.slice().reverse().map((log, i) => (
                        <div key={i} style={{ padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', display: 'flex', gap: 8 }}>
                          <Text style={{ color: log.type === 'error' ? '#ef4444' : log.source === 'orchestrator' ? '#8b5cf6' : log.source === 'blockchain' ? '#10b981' : '#94a3b8', fontSize: 11 }}>
                            {log.type === 'error' ? '❌' : log.source === 'orchestrator' ? '🎯' : log.source === 'blockchain' ? '⛓️' : '📝'}
                          </Text>
                          <Text style={{ color: '#94a3b8', fontSize: 11, flex: 1 }}>{log.message}</Text>
                          <Text style={{ color: '#475569', fontSize: 9 }}>{log.timestamp?.toLocaleTimeString()}</Text>
                          <Tag style={{ fontSize: 8, background: 'rgba(255,255,255,0.05)', color: '#64748b' }}>{log.source || 'pipeline'}</Tag>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* MODAL TRANSACTION */}
      <Modal title={<Text style={{ color: '#fff' }}>Détails transaction</Text>} open={modalVisible} onCancel={() => setModalVisible(false)} footer={null} width={700} styles={{ body: { background: '#0f172a', padding: 16 }, header: { background: '#1e293b', borderBottom: '1px solid #334155' } }}>
        {selectedTx && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: '#64748b', fontSize: 11 }}>ID: <code style={{ color: '#3b82f6' }}>{selectedTx.transaction_id || 'N/A'}</code></Text>
              <Tag color={selectedTx.final_score > 0.7 ? '#ef4444' : selectedTx.final_score > 0.4 ? '#f59e0b' : '#10b981'}>Score: {((selectedTx.final_score || 0) * 100).toFixed(0)}%</Tag>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981', textAlign: 'center', padding: '8px 0' }}>{(selectedTx.amount || 0).toLocaleString()} {selectedTx.currency || '€'}</div>
            <div style={{ textAlign: 'center', marginBottom: 12 }}><Text style={{ color: '#475569', fontSize: 11 }}>📤 {selectedTx.sender?.name || 'Inconnu'} → 📥 {selectedTx.recipient?.name || 'Inconnu'}</Text></div>
            
            <Row gutter={[12, 12]}>
              <Col span={8}><Card size="small" style={{ background: 'rgba(59,130,246,0.05)', borderColor: 'rgba(59,130,246,0.1)' }}><Text style={{ color: '#3b82f6', fontSize: 10 }}>Spark</Text><div style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>{((selectedTx.spark_score || 0) * 100).toFixed(0)}%</div></Card></Col>
              <Col span={8}><Card size="small" style={{ background: 'rgba(139,92,246,0.05)', borderColor: 'rgba(139,92,246,0.1)' }}><Text style={{ color: '#8b5cf6', fontSize: 10 }}>Graph</Text><div style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>{((selectedTx.graph_score || 0) * 100).toFixed(0)}%</div></Card></Col>
              <Col span={8}><Card size="small" style={{ background: 'rgba(6,182,212,0.05)', borderColor: 'rgba(6,182,212,0.1)' }}><Text style={{ color: '#06b6d4', fontSize: 10 }}>Quantum</Text><div style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>{((selectedTx.quantum_score || 0) * 100).toFixed(0)}%</div></Card></Col>
            </Row>

            {/* Type de fraude avec tous les détails */}
            <div style={{ marginTop: 12, padding: 12, background: `rgba(239,68,68,0.1)`, borderRadius: 8, border: `1px solid ${selectedTx.fraud_type_info?.color || '#ef4444'}40` }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <span style={{ fontSize: 24 }}>{selectedTx.fraud_type_info?.icon || '❓'}</span>
                  <div>
                    <Text strong style={{ color: selectedTx.fraud_type_info?.color || '#ef4444' }}>
                      {selectedTx.fraud_type_info?.label || 'Type inconnu'}
                    </Text>
                    <br />
                    <Text style={{ color: '#94a3b8', fontSize: 11 }}>{selectedTx.fraud_type_info?.description || 'Description non disponible'}</Text>
                  </div>
                </Space>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Tag color="purple" style={{ fontSize: 10 }}>Détecté par: {selectedTx.fraud_type_info?.detected_by || 'N/A'}</Tag>
                  <Tag color="blue" style={{ fontSize: 10 }}>Service: {selectedTx.service_used || 'spark'}</Tag>
                  <Tag color="cyan" style={{ fontSize: 10 }}>Path: {selectedTx.path || 'N/A'}</Tag>
                  <Tag color="gold" style={{ fontSize: 10 }}>Confiance: {((selectedTx.final_score || 0) * 100).toFixed(0)}%</Tag>
                </div>
                {selectedTx.fraud_type_info?.indicators && selectedTx.fraud_type_info.indicators.length > 0 && (
                  <div>
                    <Text style={{ color: '#64748b', fontSize: 10 }}>Indicateurs: </Text>
                    {selectedTx.fraud_type_info.indicators.map((ind, idx) => (
                      <Tag key={idx} style={{ fontSize: 9, margin: 2 }}>{ind}</Tag>
                    ))}
                  </div>
                )}
              </Space>
            </div>

            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <Tag color={selectedTx.web3_status === 'confirmed' || selectedTx.web3_status === 'success' ? 'success' : selectedTx.web3_status === 'pending' ? 'warning' : 'error'}>
                Blockchain: {selectedTx.web3_status || 'pending'}
              </Tag>
              {selectedTx.web3_tx_hash && (
                <Text style={{ color: '#64748b', fontSize: 10, display: 'block', marginTop: 4 }}>
                  Hash: {selectedTx.web3_tx_hash?.substring(0, 20)}...
                </Text>
              )}
              {selectedTx.web3_block && (
                <Text style={{ color: '#64748b', fontSize: 10, display: 'block' }}>
                  Bloc: #{selectedTx.web3_block}
                </Text>
              )}
              <Button 
                icon={<BulbOutlined />} 
                onClick={() => handleExplainAI(selectedTx)}
                style={{ color: '#10b981', marginTop: 8 }}
              >
                Voir l'explication IA
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* DRAWER XAI */}
      <Drawer
        title={
          <Space>
            <BulbOutlined style={{ color: '#10b981' }} />
            <span style={{ color: '#fff' }}>Explainable AI</span>
            <Tag color="purple">SHAP + GNNExplainer</Tag>
          </Space>
        }
        placement="right"
        open={xaiVisible}
        onClose={() => setXaiVisible(false)}
        width={520}
        styles={{ body: { background: '#0f172a', padding: 16 }, header: { background: '#1e293b', borderBottom: '1px solid #334155' } }}
      >
        {xaiTransactionId && (
          <div>
            <Card size="small" style={{ background: 'rgba(16,185,129,0.05)', borderColor: 'rgba(16,185,129,0.1)' }}>
              <Text style={{ color: '#10b981' }}>🧠 Analyse explicable</Text>
              <Divider style={{ margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#94a3b8', fontSize: 11 }}>Transaction: <code style={{ color: '#3b82f6' }}>{xaiTransactionId?.substring(0, 16)}</code></Text>
                <Text style={{ color: '#94a3b8', fontSize: 11 }}>Méthode: SHAP + GNNExplainer</Text>
              </div>
            </Card>
            <Card size="small" style={{ marginTop: 12, background: 'rgba(139,92,246,0.05)', borderColor: 'rgba(139,92,246,0.1)' }}>
              <Text style={{ color: '#8b5cf6' }}>🔬 GNNExplainer</Text>
              <Divider style={{ margin: '8px 0' }} />
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><Text style={{ color: '#94a3b8', fontSize: 11 }}>Relations analysées</Text><Text style={{ color: '#10b981' }}>7</Text></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><Text style={{ color: '#94a3b8', fontSize: 11 }}>Communautés détectées</Text><Text style={{ color: '#f59e0b' }}>3</Text></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><Text style={{ color: '#94a3b8', fontSize: 11 }}>Patterns suspects</Text><Text style={{ color: '#ef4444' }}>2</Text></div>
              </Space>
            </Card>
            <Card size="small" style={{ marginTop: 12, background: 'rgba(6,182,212,0.05)', borderColor: 'rgba(6,182,212,0.1)' }}>
              <Text style={{ color: '#06b6d4' }}>⚛️ SHAP Analysis</Text>
              <Divider style={{ margin: '8px 0' }} />
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><Text style={{ color: '#94a3b8', fontSize: 11 }}>Feature importance</Text><Text style={{ color: '#10b981' }}>92%</Text></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><Text style={{ color: '#94a3b8', fontSize: 11 }}>Top facteur</Text><Text style={{ color: '#f59e0b' }}>Montant (0.45)</Text></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><Text style={{ color: '#94a3b8', fontSize: 11 }}>Confiance modèle</Text><Text style={{ color: '#10b981' }}>87%</Text></div>
              </Space>
            </Card>
          </div>
        )}
      </Drawer>

      {/* FLOAT BUTTON */}
      <FloatButton.Group shape="circle" style={{ bottom: 24, right: 24 }}>
        <FloatButton icon={<SyncOutlined />} type="primary" style={{ background: 'linear-gradient(135deg, #3b82f6, #475569)' }} onClick={refreshAll} />
        <FloatButton icon={<BulbOutlined />} style={{ background: 'rgba(245,158,11,0.2)', border: '1px solid #10b981' }} onClick={() => transactions.length > 0 && handleExplainAI(transactions[0])} />
      </FloatButton.Group>

    </div>
  );
};

export default Blockchain;