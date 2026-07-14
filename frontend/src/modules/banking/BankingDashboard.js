// BankingDashboard.js - Version avec Alertes UNIQUEMENT dans les Notifications
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, Row, Col, Statistic, Button, Space, Tag, Badge, 
  Spin, Typography, message, Avatar, 
  Tooltip, Modal, Descriptions, Table,
  Alert, Steps, Empty,
  List, Divider, Drawer, Tabs, Pagination, Progress
} from 'antd';
import { 
  ReloadOutlined, WarningOutlined, 
  BellOutlined, RiseOutlined, ThunderboltOutlined, ClockCircleOutlined,
  SecurityScanOutlined,
  RobotOutlined, StopOutlined,
  LockOutlined, LineChartOutlined,
  FileTextOutlined, EyeOutlined,
  AuditOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined,
  FundFilled, SafetyCertificateFilled, NodeIndexOutlined, TeamOutlined,
  LoadingOutlined, CloseCircleOutlined, ApiOutlined, DatabaseOutlined,
  CloudServerOutlined, ExperimentOutlined,
  BulbOutlined, DiscordOutlined,
  DashboardOutlined, CreditCardOutlined, TransactionOutlined, EuroOutlined,
  UserOutlined, MessageOutlined, CustomerServiceOutlined, DeleteOutlined,
  HistoryOutlined, ClearOutlined, SettingOutlined, BlockOutlined,
  ClusterOutlined, RocketOutlined, ShareAltOutlined,
  InfoCircleOutlined, ContainerOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import ReactECharts from 'echarts-for-react';
import dayjs from 'dayjs';
import ExplainableAI from '../../components/ExplainableAI';
import './BankingDashboard.css';

const { Title, Text } = Typography;
const { Step } = Steps;

// Clé pour le localStorage
const NOTIFICATIONS_STORAGE_KEY = 'banking_notifications_history';

// ============================================
// TYPES DE FRAUDE (10 types) - MIS À JOUR
// ============================================
const FRAUD_TYPES = {
  CARD_FRAUD: { 
    label: 'Fraude à la carte bancaire', 
    icon: '💳', 
    color: '#ef4444',
    severity: 'HIGH',
    description: 'Transaction suspecte sur carte bancaire - carte utilisée dans plusieurs pays, plusieurs cartes sur même appareil',
    detected_by: 'Spark + GNN + Grover',
    indicators: ['Multiples pays', 'Montant inhabituel', 'Nouvel appareil', 'Même appareil sur plusieurs cartes']
  },
  MONEY_LAUNDERING: { 
    label: 'Blanchiment d\'argent (AML)', 
    icon: '🏦', 
    color: '#dc2626',
    severity: 'CRITICAL',
    description: 'Activité suspecte de blanchiment d\'argent - transactions circulaires, chaînes de transfert, comptes mules',
    detected_by: 'Spark + GNN + Grover',
    indicators: ['Transactions circulaires', 'Chaînes de transfert', 'Comptes mules', 'Sociétés écrans']
  },
  ORGANIZED_FRAUD: { 
    label: 'Réseau de fraude organisé', 
    icon: '👥', 
    color: '#b91c1c',
    severity: 'CRITICAL',
    description: 'Réseau de fraude organisé - communautés criminelles avec comptes, cartes et identités liés',
    detected_by: 'Neo4j + GNN + Grover',
    indicators: ['Communautés suspectes', 'Comptes liés', 'Patterns récurrents', 'Identités partagées']
  },
  MONEY_MULE: { 
    label: 'Compte mule', 
    icon: '🐴', 
    color: '#f59e0b',
    severity: 'HIGH',
    description: 'Compte utilisé comme mule financière - reçoit et redistribue rapidement des fonds',
    detected_by: 'Spark + GNN + Grover',
    indicators: ['Virements rapides', 'Multiples comptes', 'Montants moyens', 'Redistribution immédiate']
  },
  ACCOUNT_TAKEOVER: { 
    label: 'Prise de contrôle de compte', 
    icon: '🔓', 
    color: '#d97706',
    severity: 'HIGH',
    description: 'Compte potentiellement compromis - connexion depuis nouvel appareil, localisation différente',
    detected_by: 'Spark + GNN + Grover',
    indicators: ['Nouvel appareil', 'Localisation différente', 'Activité anormale', 'Changement brutal de comportement']
  },
  LOAN_FRAUD: { 
    label: 'Fraude au prêt', 
    icon: '📋', 
    color: '#8b5cf6',
    severity: 'MEDIUM',
    description: 'Demande de prêt frauduleuse - faux emprunteurs, documents réutilisés, entreprises fictives',
    detected_by: 'Spark + Neo4j + GNN + Grover',
    indicators: ['Documents réutilisés', 'Entreprises fictives', 'Réseaux d\'emprunteurs', 'Garants suspects']
  },
  IDENTITY_FRAUD: { 
    label: 'Fraude à l\'identité', 
    icon: '🎭', 
    color: '#7c3aed',
    severity: 'HIGH',
    description: 'Usurpation d\'identité - identités partagées, documents réutilisés, comptes multiples',
    detected_by: 'Spark + Neo4j + GNN + Grover',
    indicators: ['Identités partagées', 'Documents réutilisés', 'Multiples comptes', 'Mêmes ressources techniques']
  },
  ANOMALOUS_TRANSACTION: { 
    label: 'Transaction anormale', 
    icon: '⚡', 
    color: '#f59e0b',
    severity: 'MEDIUM',
    description: 'Comportement transactionnel anormal - montant, fréquence, localisation inhabituelle',
    detected_by: 'Spark + GNN',
    indicators: ['Fréquence inhabituelle', 'Montant incohérent', 'Heure suspecte', 'Bénéficiaire inhabituel']
  },
  INSIDER_FRAUD: { 
    label: 'Fraude interne', 
    icon: '👨‍💼', 
    color: '#ef4444',
    severity: 'CRITICAL',
    description: 'Activité frauduleuse interne - accès injustifié, validation suspecte',
    detected_by: 'Spark + Neo4j + GNN + Grover',
    indicators: ['Accès injustifié', 'Validation suspecte', 'Accès aux comptes', 'Comportement anormal']
  },
  SWIFT_FRAUD: { 
    label: 'Fraude SWIFT', 
    icon: '🌍', 
    color: '#dc2626',
    severity: 'CRITICAL',
    description: 'Virement international suspect - itinéraires anormaux, bénéficiaires à risque',
    detected_by: 'Spark + Neo4j + GNN + Grover',
    indicators: ['Itinéraires anormaux', 'Bénéficiaires à risque', 'Réseaux complexes', 'Pays à haut risque']
  },
  LEGIT: { 
    label: 'Légitime', 
    icon: '✅', 
    color: '#10b981',
    severity: 'LOW',
    description: 'Transaction légitime - comportement normal',
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

// Mapping des verdicts
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

const BankingDashboard = ({ currentUser }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState([]); // Stockage interne (pas affiché)
  const [blockchainBlocks, setBlockchainBlocks] = useState([]);
  const [blockchainStats, setBlockchainStats] = useState({
    total_blocks: 0,
    total_transactions: 0,
    pending_transactions: 0,
    tps: 0
  });
  const [blockedAccounts, setBlockedAccounts] = useState([]);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [predictions, setPredictions] = useState([]);
  const [performanceMetrics, setPerformanceMetrics] = useState({
    detectionRate: 0,
    fraudRate: 0,
    aiAccuracy: 0
  });
  const [notificationDrawerVisible, setNotificationDrawerVisible] = useState(false);
  const [discordNotifications, setDiscordNotifications] = useState([]);
  const [bankingNotifications, setBankingNotifications] = useState([]);
  const [systemNotifications, setSystemNotifications] = useState([]);
  const [notificationHistory, setNotificationHistory] = useState([]);
  const [historyDrawerVisible, setHistoryDrawerVisible] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('all');
  const [historyPage, setHistoryPage] = useState(1);
  const [lastNotifId, setLastNotifId] = useState(0);
  const [pipelineStatus, setPipelineStatus] = useState({
    kafka: { status: 'idle', message: 'En attente', latency: '0ms' },
    spark: { status: 'idle', message: 'En attente', latency: '0ms' },
    neo4j: { status: 'idle', message: 'En attente', latency: '0ms' },
    orchestrator: { status: 'idle', message: 'En attente', latency: '0ms' },
    graph_transformer: { status: 'idle', message: 'En attente', latency: '0ms' },
    grover: { status: 'idle', message: 'En attente', latency: '0ms' },
    blockchain: { status: 'idle', message: 'En attente', latency: '0ms' }
  });
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedBlock, setSelectedBlock] = useState(null);
  
  // États XAI
  const [xaiVisible, setXaiVisible] = useState(false);
  const [xaiTransactionId, setXaiTransactionId] = useState(null);
  const [userStats, setUserStats] = useState({ points: 0, balance: 0, commands: 0 });
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [orchestratorDecisions, setOrchestratorDecisions] = useState([]);

  // ============================================
  // DÉTERMINER LE TYPE DE FRAUDE
  // ============================================
  const determineFraudType = useCallback((tx) => {
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
        return 'CARD_FRAUD';
      }
      
      return 'ANOMALOUS_TRANSACTION';
    }
    
    if (verdict === 'SUSPECT' || score > 0.4) {
      return 'ANOMALOUS_TRANSACTION';
    }
    
    return 'LEGIT';
  }, []);

  // ============================================
  // NOTIFICATIONS FUNCTIONS
  // ============================================

  const loadNotificationHistory = useCallback(() => {
    try {
      const stored = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotificationHistory(parsed);
        const maxId = Math.max(...parsed.map(n => n.id || 0), 0);
        setLastNotifId(maxId);
      }
    } catch (error) {
      console.error('Erreur chargement historique:', error);
    }
  }, []);

  const saveNotificationHistory = useCallback((notifications) => {
    try {
      const limited = notifications.slice(0, 500);
      localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(limited));
    } catch (error) {
      console.error('Erreur sauvegarde historique:', error);
    }
  }, []);

  const addToHistory = useCallback((title, message, type, source, data = {}) => {
    const historyItem = {
      id: Date.now(),
      title,
      message,
      type,
      source,
      data,
      timestamp: new Date().toISOString(),
      read: false
    };
    setNotificationHistory(prev => {
      const updated = [historyItem, ...prev];
      saveNotificationHistory(updated);
      return updated;
    });
    return historyItem;
  }, [saveNotificationHistory]);

  // ============================================
  // EXPLAINABLE AI - HANDLERS
  // ============================================
  const handleExplainAI = (record) => {
    setXaiTransactionId(record.transaction_id || record.id);
    setXaiVisible(true);
    addToHistory('Explication AI', `Analyse de la transaction ${record.transaction_id || record.id}`, 'info', 'system');
  };

  // ============================================
  // GÉNÉRATION D'ALERTE → UNIQUEMENT NOTIFICATION
  // ============================================
  const generateFraudAlert = useCallback((transaction) => {
    const alertLevel = transaction.fraud_score > 0.8 ? 'critical' : 
                       transaction.fraud_score > 0.6 ? 'high' : 'medium';
    
    // Déterminer le type de fraude
    const fraudType = determineFraudType(transaction);
    const fraudInfo = FRAUD_TYPES[fraudType] || FRAUD_TYPES.UNKNOWN;
    
    // Stocker dans les alertes (pour référence interne)
    const alert = {
      id: `alert-${Date.now()}`,
      transaction_id: transaction.transaction_id,
      amount: transaction.amount,
      fraud_score: transaction.fraud_score,
      alert_level: alertLevel,
      fraud_type: fraudType,
      fraud_type_label: fraudInfo.label,
      reason: transaction.reason || transaction.fraud_reason || 'Détection automatique par l\'IA',
      timestamp: new Date().toISOString(),
      status: 'open',
      source: transaction.source || 'GNN'
    };
    
    setAlerts(prev => [alert, ...prev].slice(0, 100));
    
    // ✅ NOTIFICATION UNIQUEMENT (pas d'alerte visible sur le dashboard)
    const alertMessage = `🚨 ${alertLevel.toUpperCase()}: ${fraudInfo.icon} ${fraudInfo.label} - ${transaction.transaction_id} - ${transaction.amount?.toLocaleString() || 0}€`;
    
    // Ajouter à l'historique des notifications
    addToHistory(
      `Alerte Fraude - ${fraudInfo.label}`,
      alertMessage,
      alertLevel === 'critical' ? 'critical' : 'warning',
      'system',
      { 
        amount: transaction.amount,
        transaction_id: transaction.transaction_id,
        level: alertLevel,
        fraud_type: fraudType,
        fraud_label: fraudInfo.label,
        score: transaction.fraud_score,
        indicators: fraudInfo.indicators || []
      }
    );
    
    // ✅ Notification push discrète
    message.warning({
      content: alertMessage,
      duration: 5,
      icon: <WarningOutlined style={{ color: '#ef4444' }} />
    });
    
    return alert;
  }, [addToHistory, determineFraudType]);

  // ============================================
  // POLLING DES NOTIFICATIONS DISCORD
  // ============================================
  const fetchDiscordNotifications = useCallback(async () => {
    try {
      const response = await api.get('/discord/notifications', { 
        params: { since: lastNotifId, limit: 20 }
      }).catch(() => ({ data: [] }));
      
      if (response.data && response.data.length > 0) {
        response.data.forEach(notif => {
          const newNotif = {
            id: notif.id,
            title: notif.title || 'Notification Discord',
            message: notif.message || 'Nouvelle notification',
            type: notif.type || 'info',
            timestamp: notif.timestamp || new Date().toISOString(),
            read: false,
            source: notif.source || 'discord',
            data: notif.data || {}
          };
          
          setDiscordNotifications(prev => [newNotif, ...prev].slice(0, 100));
          addToHistory(newNotif.title, newNotif.message, newNotif.type, 'discord', newNotif.data);
        });
        
        const maxId = Math.max(...response.data.map(n => n.id || 0), lastNotifId);
        setLastNotifId(maxId);
      }
    } catch (error) {
      console.error('Erreur polling notifications:', error);
    }
  }, [lastNotifId, addToHistory]);

  // Horloge
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    loadNotificationHistory();
    return () => clearInterval(timer);
  }, [loadNotificationHistory]);

  // Polling des notifications
  useEffect(() => {
    fetchDiscordNotifications();
    const interval = setInterval(fetchDiscordNotifications, 5000);
    return () => clearInterval(interval);
  }, [fetchDiscordNotifications]);

  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================
  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      // 1. Charger les transactions depuis Neo4j
      const response = await api.get('/neo4j/transactions?limit=200').catch(() => ({ data: [] }));
      const txData = response.data?.transactions || [];
      
      const formattedTx = txData.map(doc => {
        const fraudType = determineFraudType(doc);
        const fraudInfo = FRAUD_TYPES[fraudType] || FRAUD_TYPES.UNKNOWN;
        const verdict = VERDICT_MAP[doc.final_verdict?.toLowerCase()] || 
                        VERDICT_MAP[doc.verdict?.toLowerCase()] || 
                        (doc.fraud_score > 0.7 ? 'FRAUD' : doc.fraud_score > 0.4 ? 'SUSPECT' : 'LEGIT');
        
        return {
          transaction_id: doc.transaction_id || `tx-${Date.now()}`,
          hash: doc.hash || doc.transaction_id,
          amount: doc.amount || 0,
          fraud_score: doc.fraud_score || 0,
          risk_score: doc.risk_score || 0,
          verdict: verdict,
          status: doc.status || 'confirmed',
          timestamp: doc.timestamp || new Date().toISOString(),
          from_address: doc.sender?.id || doc.from_address || '0x0000',
          to_address: doc.recipient?.id || doc.to_address || '0x0000',
          sender_name: doc.sender?.name || 'Client inconnu',
          reason: doc.reason || doc.fraud_reason || 'Analyse en cours',
          confidence: doc.confidence || 0.5,
          fraud_level: doc.fraud_score > 0.8 ? 'critical' : doc.fraud_score > 0.6 ? 'high' : doc.fraud_score > 0.4 ? 'medium' : 'low',
          graph_score: doc.graph_score || 0,
          quantum_score: doc.quantum_score || 0,
          final_verdict: verdict,
          final_score: doc.final_score || doc.fraud_score || 0,
          sender: doc.sender || { name: 'Client inconnu', id: 'unknown' },
          recipient: doc.recipient || { name: 'Inconnu', id: 'unknown' },
          fraud_type: fraudType,
          fraud_type_info: fraudInfo,
          path: doc.path || 'fast',
          service_used: doc.service_used || 'spark',
          explanation: doc.explanation || '',
          web3_status: doc.web3_status || doc.blockchain_status || 'pending',
          web3_tx_hash: doc.web3_tx_hash || doc.blockchain_hash || null,
          web3_block: doc.web3_block || doc.blockchain_block || null
        };
      });
      
      setTransactions(formattedTx);
      
      // ✅ Générer des notifications pour les transactions frauduleuses
      const fraudAlerts = formattedTx.filter(t => t.fraud_score > 0.6 || t.verdict === 'FRAUD');
      fraudAlerts.forEach(tx => generateFraudAlert(tx));
      
      // 2. Charger les blocs blockchain
      const blockchainResponse = await api.get('/blockchain/transactions?limit=50').catch(() => ({ data: [] }));
      const blockchainData = blockchainResponse.data?.transactions || [];
      
      const formattedBlocks = blockchainData.map(block => ({
        hash: block.hash || `0x${Math.random().toString(36).substring(2, 15)}`,
        timestamp: block.timestamp || new Date().toISOString(),
        transactions: block.transactions || 1,
        amount: block.amount || 0,
        status: block.status || 'confirmed',
        fraud_score: block.fraud_score || 0,
        from_address: block.from_address || '0x0000',
        to_address: block.to_address || '0x0000'
      }));
      
      setBlockchainBlocks(formattedBlocks);
      
      setBlockchainStats({
        total_blocks: formattedBlocks.length || 0,
        total_transactions: formattedTx.length || 0,
        pending_transactions: formattedTx.filter(t => t.status === 'pending').length || 0,
        tps: Math.round(formattedTx.length / 60) || 0
      });
      
      setPredictions(calculatePredictions(formattedTx));
      
      // Récupérer les décisions de l'Orchestrator
      await fetchOrchestratorDecisions();
      
      await runPipelineSimulation(formattedTx);
      
      const total = formattedTx.length;
      const frauds = formattedTx.filter(t => t.fraud_score > 0.6).length;
      setPerformanceMetrics({
        detectionRate: total ? ((frauds + formattedTx.filter(t => t.verdict === 'SUSPECT').length) / total * 100).toFixed(1) : 0,
        fraudRate: total ? (frauds / total * 100).toFixed(1) : 0,
        aiAccuracy: (85 + Math.random() * 10).toFixed(1)
      });
      
    } catch (error) {
      console.error('Erreur chargement:', error);
      message.error('Erreur de chargement des transactions');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrchestratorDecisions = useCallback(async () => {
    try {
      const response = await api.get('/orchestrator/decisions?limit=20').catch(() => ({ data: [] }));
      if (response.data) {
        setOrchestratorDecisions(response.data.decisions || response.data.data || []);
      }
    } catch (error) {
      console.warn('Erreur chargement décisions:', error);
    }
  }, []);

  const calculatePredictions = useCallback((historicalData) => {
    if (!historicalData || historicalData.length === 0) return [];
    const last30 = historicalData.slice(-30);
    const fraudRate = last30.filter(t => t.verdict === 'FRAUD' || t.fraud_score > 0.7).length / (last30.length || 1);
    const preds = [];
    for (let i = 1; i <= 7; i++) {
      const predictedFraud = Math.min(100, Math.max(0, (fraudRate * 100) + (i * 1.2)));
      preds.push({
        day: `J+${i}`,
        predictedFraud: Math.round(predictedFraud * 10) / 10,
        confidence: Math.max(50, Math.min(95, 85 - i * 1.5)),
        riskLevel: predictedFraud > 70 ? 'CRITICAL' : predictedFraud > 40 ? 'HIGH' : 'MODERATE'
      });
    }
    return preds;
  }, []);

  const runPipelineSimulation = async (transactionsData) => {
    const stages = [
      { key: 'kafka', label: 'Kafka', status: 'success', message: `${transactionsData.length} transactions collectées` },
      { key: 'spark', label: 'Spark', status: 'success', message: `${alerts.length} anomalies détectées` },
      { key: 'neo4j', label: 'Neo4j', status: 'success', message: `${transactionsData.length} nœuds créés` },
      { key: 'orchestrator', label: 'Orchestrator', status: 'success', message: `${orchestratorDecisions.length} décisions prises` },
      { key: 'graph_transformer', label: 'Graph Transformer', status: 'success', message: `${alerts.length} analyses GNN` },
      { key: 'grover', label: 'Grover Quantum', status: 'success', message: `${Math.ceil(alerts.length / 2)} analyses quantiques` },
      { key: 'blockchain', label: 'Blockchain', status: 'success', message: `${blockchainBlocks.length} blocs validés` }
    ];
    
    stages.forEach(stage => {
      updatePipelineStatus(stage.key, stage.status, { 
        message: stage.message,
        latency: `${20 + Math.floor(Math.random() * 50)}ms` 
      });
    });
  };

  const updatePipelineStatus = (stage, status, details) => {
    setPipelineStatus(prev => ({
      ...prev,
      [stage]: { 
        status, 
        message: details?.message || (status === 'success' ? 'Terminé' : status === 'running' ? 'En cours' : 'En attente'), 
        latency: details?.latency || `${Math.floor(Math.random() * 100) + 20}ms` 
      }
    }));
  };

  const loadUserBankingData = async () => {
    try {
      const userId = currentUser?.id || localStorage.getItem('discord_user_id') || '1';
      const response = await api.get(`/discord/bank/user/${userId}/stats`).catch(() => ({ data: null }));
      if (response?.data) {
        setUserStats({
          points: response.data.points || 0,
          balance: response.data.balance || 0,
          commands: response.data.commands || 0
        });
      }
    } catch (error) {
      console.error('Erreur chargement données utilisateur:', error);
    }
  };

  const handleBlockAccount = async (accountId, transaction) => {
    Modal.confirm({
      title: '🔒 Bloquer le compte',
      content: (
        <div>
          <p>Êtes-vous sûr de vouloir bloquer ce compte ?</p>
          <Alert
            message="Raison IA"
            description={transaction?.reason || 'Score de risque critique détecté'}
            type="warning"
            showIcon
          />
          {transaction?.fraud_type_info && (
            <div style={{ marginTop: 8 }}>
              <Tag color={transaction.fraud_type_info.color}>
                {transaction.fraud_type_info.icon} {transaction.fraud_type_info.label}
              </Tag>
            </div>
          )}
        </div>
      ),
      okText: 'Bloquer',
      cancelText: 'Annuler',
      okButtonProps: { danger: true },
      onOk: () => {
        setBlockedAccounts(prev => [...prev, accountId]);
        message.success(`Compte ${accountId} bloqué avec succès`);
        addToHistory('Action sécurité', `Compte ${accountId} bloqué suite à alerte fraude`, 'critical', 'system');
      }
    });
  };

  const viewBlockDetails = (block) => {
    setSelectedBlock(block);
    setBlockModalVisible(true);
  };

  const clearNotifications = () => {
    setDiscordNotifications([]);
    setBankingNotifications([]);
    setSystemNotifications([]);
    message.success('Notifications effacées');
  };

  const markAllAsRead = () => {
    setNotificationHistory(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
    setDiscordNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setBankingNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setSystemNotifications(prev => prev.map(n => ({ ...n, read: true })));
    message.success('Toutes les notifications marquées comme lues');
  };

  const clearHistory = () => {
    Modal.confirm({
      title: 'Effacer l\'historique',
      content: 'Êtes-vous sûr de vouloir effacer tout l\'historique des notifications ?',
      okText: 'Oui',
      cancelText: 'Non',
      onOk: () => {
        setNotificationHistory([]);
        saveNotificationHistory([]);
        message.success('Historique effacé');
      }
    });
  };

  // Charger les données initiales
  useEffect(() => {
    loadTransactions();
    loadUserBankingData();
    const interval = setInterval(() => {
      loadTransactions();
      loadUserBankingData();
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // ============================================
  // COLONNES DES TABLEAUX
  // ============================================
  const transactionColumns = [
    { 
      title: <span style={{ color: '#94a3b8' }}>ID</span>, 
      dataIndex: 'transaction_id', 
      key: 'id', 
      width: 120, 
      render: (id) => <code style={{ color: '#34d399' }}>{id?.substring(0, 8)}...</code> 
    },
    { 
      title: <span style={{ color: '#94a3b8' }}>Client</span>, 
      dataIndex: 'sender_name', 
      key: 'client', 
      render: (text) => <span style={{ color: '#f1f5f9' }}>{text}</span> 
    },
    { 
      title: <span style={{ color: '#94a3b8' }}>Montant</span>, 
      dataIndex: 'amount', 
      key: 'amount', 
      render: (a) => <Text strong style={{ color: '#fbbf24' }}>{a?.toLocaleString()} €</Text> 
    },
    { 
      title: <span style={{ color: '#94a3b8' }}>Score</span>, 
      dataIndex: 'final_score', 
      key: 'score', 
      render: (s) => {
        const color = s > 0.7 ? '#ef4444' : s > 0.4 ? '#f59e0b' : '#10b981';
        return <Tag color={color} style={{ borderRadius: 12, color: '#fff' }}>{s ? `${(s * 100).toFixed(0)}%` : '0%'}</Tag>;
      }
    },
    { 
      title: <span style={{ color: '#94a3b8' }}>Verdict</span>, 
      dataIndex: 'verdict', 
      key: 'verdict', 
      render: (v) => {
        const color = v === 'FRAUD' ? '#ef4444' : v === 'SUSPECT' ? '#f59e0b' : '#10b981';
        return <Tag color={color} style={{ borderRadius: 12 }}>{v || 'PENDING'}</Tag>;
      }
    },
    { 
      title: <span style={{ color: '#94a3b8' }}>Type fraude</span>, 
      dataIndex: 'fraud_type', 
      key: 'fraud_type', 
      width: 160,
      render: (type) => {
        const info = FRAUD_TYPES[type] || FRAUD_TYPES.UNKNOWN;
        return (
          <Tooltip title={
            <div>
              <div><strong>{info.label}</strong></div>
              <div style={{ fontSize: 11 }}>{info.description}</div>
              {info.indicators && (
                <div style={{ fontSize: 10, marginTop: 4 }}>Indicateurs: {info.indicators.join(', ')}</div>
              )}
            </div>
          }>
            <Tag color={info.color} style={{ borderRadius: 12, fontSize: 10 }}>
              {info.icon} {info.label}
            </Tag>
          </Tooltip>
        );
      }
    },
    { 
      title: <span style={{ color: '#94a3b8' }}>Path</span>, 
      dataIndex: 'path', 
      key: 'path', 
      width: 80,
      render: (p) => <Tag color={p === 'quantum' ? '#06b6d4' : p === 'deep' ? '#8b5cf6' : '#10b981'} style={{ borderRadius: 12 }}>{p || 'N/A'}</Tag>
    },
    { 
      title: <span style={{ color: '#94a3b8' }}>Blockchain</span>,
      dataIndex: 'web3_status',
      key: 'web3_status',
      width: 100,
      render: (status) => {
        const colors = { confirmed: '#10b981', success: '#10b981', pending: '#f59e0b', failed: '#ef4444' };
        const labels = { confirmed: '✅ Confirmé', success: '✅ Confirmé', pending: '⏳ En attente', failed: '❌ Échec' };
        const color = colors[status?.toLowerCase()] || '#64748b';
        return <Tag color={color} style={{ borderRadius: 12 }}>{labels[status?.toLowerCase()] || status || 'pending'}</Tag>;
      }
    },
    { 
      title: <span style={{ color: '#94a3b8' }}>Actions</span>, 
      key: 'actions', 
      width: 150, 
      render: (_, r) => (
        <Space>
          <Tooltip title="Explication IA">
            <Button 
              size="small" 
              icon={<BulbOutlined />} 
              onClick={() => handleExplainAI(r)} 
              style={{ color: '#10b981', borderColor: '#10b981' }} 
            />
          </Tooltip>
          {(r.fraud_score > 0.6 || r.verdict === 'FRAUD') && (
            <Tooltip title="Bloquer le compte">
              <Button size="small" danger icon={<StopOutlined />} onClick={() => handleBlockAccount(r.from_address || r.transaction_id, r)} />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  // ============================================
  // NOTIFICATIONS UTILITIES
  // ============================================
  const getNotificationIcon = (type, source) => {
    if (source === 'discord') return <DiscordOutlined style={{ color: '#5865F2' }} />;
    if (source === 'system') return <SettingOutlined style={{ color: '#34d399' }} />;
    switch (type) {
      case 'critical': return <CloseCircleOutlined style={{ color: '#ef4444' }} />;
      case 'warning': return <WarningOutlined style={{ color: '#f59e0b' }} />;
      case 'success': return <CheckCircleOutlined style={{ color: '#10b981' }} />;
      default: return <BellOutlined style={{ color: '#34d399' }} />;
    }
  };

  const filteredHistory = notificationHistory.filter(item => {
    if (historyFilter === 'all') return true;
    return item.source === historyFilter;
  });

  const pageSize = 20;
  const paginatedHistory = filteredHistory.slice((historyPage - 1) * pageSize, historyPage * pageSize);
  const totalUnread = notificationHistory.filter(n => !n.read).length;

  // ============================================
  // CHART
  // ============================================
  const predictionOption = {
    tooltip: { 
      trigger: 'axis', 
      backgroundColor: '#1e293b', 
      borderColor: '#2d6a4f', 
      borderWidth: 1, 
      textStyle: { color: '#fff' } 
    },
    xAxis: { 
      type: 'category', 
      data: predictions.map(p => p.day), 
      axisLabel: { color: '#94a3b8' } 
    },
    yAxis: { 
      type: 'value', 
      min: 0, 
      max: 100, 
      axisLabel: { color: '#94a3b8' }, 
      name: 'Taux de risque (%)', 
      nameTextStyle: { color: '#94a3b8' } 
    },
    series: [
      { 
        data: predictions.map(p => p.predictedFraud), 
        type: 'line', 
        smooth: true, 
        name: 'Risque prédit', 
        lineStyle: { color: '#ef4444', width: 3 }, 
        areaStyle: { opacity: 0.2, color: '#ef4444' } 
      },
      { 
        data: predictions.map(p => p.confidence), 
        type: 'line', 
        name: 'Confiance', 
        lineStyle: { color: '#10b981', type: 'dashed', width: 2 } 
      }
    ],
    grid: { top: 40, bottom: 30, left: 60, right: 30 },
    legend: { textStyle: { color: '#94a3b8' } }
  };

  // ============================================
  // PIPELINE STEPS
  // ============================================
  const pipelineSteps = [
    { key: 'kafka', title: 'Kafka', icon: <ApiOutlined />, description: 'Collecte' },
    { key: 'spark', title: 'Spark', icon: <ThunderboltOutlined />, description: 'Analyse streaming' },
    { key: 'neo4j', title: 'Neo4j', icon: <DatabaseOutlined />, description: 'Graphe' },
    { key: 'orchestrator', title: 'Orchestrator', icon: <CloudServerOutlined />, description: 'Décision' },
    { key: 'graph_transformer', title: 'Graph GNN', icon: <NodeIndexOutlined />, description: 'Deep Learning' },
    { key: 'grover', title: 'Grover Quantum', icon: <ExperimentOutlined />, description: 'Amplification' },
    { key: 'blockchain', title: 'Blockchain', icon: <BlockOutlined />, description: 'Sécurisation' }
  ];

  const getPipelineStatusIcon = (status) => {
    switch (status) {
      case 'running': return <LoadingOutlined spin style={{ color: '#10b981' }} />;
      case 'success': return <CheckCircleOutlined style={{ color: '#10b981' }} />;
      case 'fraud': return <CloseCircleOutlined style={{ color: '#ef4444' }} />;
      default: return <ClockCircleOutlined style={{ color: '#64748b' }} />;
    }
  };

  if (loading) return (
    <div style={{ padding: 50, textAlign: 'center', background: '#0f172a', minHeight: '100vh' }}>
      <Spin size="large" tip="Chargement du tableau de bord..." ><div/></Spin>
    </div>
  );

  // ============================================
  // RENDER
  // ============================================
  return (
    <div style={{ padding: 24, background: '#0f172a', minHeight: '100vh' }}>
      
      {/* HEADER BANNER */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <Card style={{ 
          marginBottom: 24, 
          background: 'linear-gradient(135deg, #064e3b 0%, #2d6a4f 50%, #40916c 100%)', 
          border: 'none',
          borderRadius: 24,
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }}>
          <Row align="middle" justify="space-between">
            <Col>
              <Space size="large">
                <div style={{ background: 'rgba(255,255,255,0.15)', padding: 15, borderRadius: '50%' }}>
                  <DashboardOutlined style={{ fontSize: 32, color: '#fff' }} />
                </div>
                <div>
                  <Title level={2} style={{ color: '#fff', margin: 0 }}>Banking Intelligence Suite</Title>
                  <Text style={{ color: '#d1d5db', fontSize: 16 }}>
                    🔗 {blockchainStats.total_blocks} blocs • 📊 {transactions.length} transactions • ⚡ {blockchainStats.tps} TPS • {currentTime.toLocaleTimeString()}
                  </Text>
                </div>
              </Space>
            </Col>
            <Col>
              <Space>
                <Badge count={totalUnread} offset={[-5, 5]}>
                  <Button 
                    icon={<HistoryOutlined />} 
                    onClick={() => setHistoryDrawerVisible(true)}
                    style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: 12 }}
                  >
                    Historique
                  </Button>
                </Badge>
                <Badge 
                  count={discordNotifications.filter(n => !n.read).length + bankingNotifications.filter(n => !n.read).length} 
                  offset={[-2, 5]}
                >
                  <Button 
                    icon={<BellOutlined />} 
                    onClick={() => setNotificationDrawerVisible(true)}
                    style={{ background: '#334155', color: '#fff', border: 'none', borderRadius: 12 }}
                  >
                    Notifications
                  </Button>
                </Badge>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={loadTransactions}
                  style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: 12 }}
                >
                  Rafraîchir
                </Button>
                <Button 
                  icon={<RobotOutlined />} 
                  onClick={() => navigate('/ai/nexy')} 
                  style={{ background: '#fff', color: '#2d6a4f', border: 'none', fontWeight: 'bold', borderRadius: 12 }}
                >
                  Nexy Assist
                </Button>
              </Space>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* STATS CARDS */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 16, background: '#1e293b', border: '1px solid #334155' }}>
            <Statistic 
              title={<span style={{ color: '#94a3b8' }}>Points Fidélité</span>} 
              value={userStats.points} 
              prefix={<CreditCardOutlined style={{ color: '#fbbf24', marginRight: 8 }} />}
              valueStyle={{ color: '#fbbf24', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 16, background: '#1e293b', border: '1px solid #334155' }}>
            <Statistic 
              title={<span style={{ color: '#94a3b8' }}>Solde Compte</span>} 
              value={userStats.balance} 
              prefix={<EuroOutlined style={{ color: '#34d399', marginRight: 8 }} />}
              valueStyle={{ color: '#34d399', fontWeight: 700 }}
              precision={2}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 16, background: '#1e293b', border: '1px solid #334155' }}>
            <Statistic 
              title={<span style={{ color: '#94a3b8' }}>Commandes</span>} 
              value={userStats.commands} 
              prefix={<TransactionOutlined style={{ color: '#60a5fa', marginRight: 8 }} />}
              valueStyle={{ color: '#60a5fa', fontWeight: 700 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: 16, background: '#1e293b', border: '1px solid #334155' }}>
            <Statistic 
              title={<span style={{ color: '#94a3b8' }}>Transactions</span>} 
              value={transactions.length} 
              prefix={<TransactionOutlined style={{ color: '#34d399', marginRight: 8 }} />}
              valueStyle={{ color: '#34d399', fontWeight: 700 }}
            />
          </Card>
        </Col>
      </Row>

      {/* KPI ROW */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        {[
          { title: 'Transactions analysées', value: transactions.length, icon: <FileTextOutlined />, color: '#34d399' },
          { title: 'Alertes détectées', value: alerts.length, icon: <WarningOutlined />, color: '#ef4444' },
          { title: 'Blocs blockchain', value: blockchainStats.total_blocks, icon: <BlockOutlined />, color: '#475569' },
          { title: 'TPS', value: blockchainStats.tps, icon: <ThunderboltOutlined />, color: '#10b981' }
        ].map((kpi, idx) => (
          <Col xs={24} sm={12} lg={6} key={idx}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: idx * 0.1 }}>
              <Card style={{ borderRadius: 16, background: '#1e293b', border: '1px solid #334155', textAlign: 'center' }}>
                <Statistic 
                  title={<span style={{ color: '#94a3b8', fontSize: 13 }}>{kpi.title}</span>} 
                  value={kpi.value} 
                  prefix={<span style={{ color: kpi.color, marginRight: 8 }}>{kpi.icon}</span>} 
                  valueStyle={{ color: '#fff', fontWeight: 700, fontSize: 28 }} 
                />
              </Card>
            </motion.div>
          </Col>
        ))}
      </Row>

      {/* PIPELINE STATUS */}
      <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={24}>
          <Card 
            title={<Space><ThunderboltOutlined style={{ color: '#34d399' }} /><span style={{ color: '#fff', fontWeight: 600 }}>Pipeline Orchestrateur</span></Space>}
            style={{ borderRadius: 20, background: '#1e293b', border: '1px solid #334155' }}
          >
            <Steps current={pipelineSteps.findIndex(s => pipelineStatus[s.key]?.status === 'running')} status="process" direction="horizontal">
              {pipelineSteps.map(step => (
                <Step 
                  key={step.key}
                  title={<span style={{ color: '#fff' }}>{step.title}</span>}
                  description={
                    <div>
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>{pipelineStatus[step.key]?.message || step.description}</Text>
                      {pipelineStatus[step.key]?.latency && (
                        <Tag style={{ marginTop: 4, background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', borderRadius: 12 }}>Latence: {pipelineStatus[step.key]?.latency}</Tag>
                      )}
                    </div>
                  }
                  icon={getPipelineStatusIcon(pipelineStatus[step.key]?.status)}
                  status={pipelineStatus[step.key]?.status === 'fraud' ? 'error' : 
                          pipelineStatus[step.key]?.status === 'success' ? 'finish' : 
                          pipelineStatus[step.key]?.status === 'running' ? 'process' : 'wait'}
                />
              ))}
            </Steps>
          </Card>
        </Col>
      </Row>

      {/* PREDICTIONS ET TRANSACTIONS CRITIQUES */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card 
            title={<Space><LineChartOutlined style={{ color: '#34d399' }} /><span style={{ color: '#fff' }}>Prédictions IA - Risque de fraude (7j)</span></Space>}
            style={{ borderRadius: 20, background: '#1e293b', border: '1px solid #334155' }}
          >
            <ReactECharts option={predictionOption} style={{ height: 350 }} />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title={<Space><AuditOutlined style={{ color: '#ef4444' }} /><span style={{ color: '#fff' }}>Transactions critiques</span></Space>}
            style={{ borderRadius: 20, background: '#1e293b', border: '1px solid #334155' }}
            extra={<Tag color="#ef4444" style={{ borderRadius: 12 }}>{alerts.length} alertes</Tag>}
          >
            <Table 
              columns={transactionColumns} 
              dataSource={transactions.filter(t => t.fraud_score > 0.6 || t.verdict === 'FRAUD').slice(0, 6)} 
              pagination={false} 
              size="middle"
              rowKey="transaction_id"
              className="banking-table-dark"
            />
          </Card>
        </Col>
      </Row>

      {/* TRANSACTIONS + BLOCKS */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={12}>
          <Card 
            title={<Space><TransactionOutlined style={{ color: '#34d399' }} /><span style={{ color: '#fff' }}>Transactions récentes</span></Space>}
            style={{ borderRadius: 20, background: '#1e293b', border: '1px solid #334155' }}
            extra={<Tag color="#34d399" style={{ borderRadius: 12 }}>{transactions.length} tx</Tag>}
          >
            <Table 
              columns={transactionColumns} 
              dataSource={transactions.slice(0, 5)} 
              pagination={false} 
              size="middle"
              rowKey="transaction_id"
              className="banking-table-dark"
            />
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card 
            title={<Space><BlockOutlined style={{ color: '#475569' }} /><span style={{ color: '#fff' }}>Derniers blocs Blockchain</span></Space>}
            style={{ borderRadius: 20, background: '#1e293b', border: '1px solid #334155' }}
            extra={<Tag color="#475569" style={{ borderRadius: 12 }}>{blockchainBlocks.length} blocs</Tag>}
          >
            <Table 
              columns={[
                { title: 'Hash', dataIndex: 'hash', key: 'hash', width: 150, render: (h) => <code style={{ color: '#475569' }}>{h?.substring(0, 16)}...</code> },
                { title: 'Montant', dataIndex: 'amount', key: 'amount', render: (a) => <Text strong style={{ color: '#fbbf24' }}>{a?.toLocaleString()} €</Text> },
                { title: 'Statut', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'confirmed' ? 'green' : 'warning'} style={{ borderRadius: 12 }}>{s?.toUpperCase()}</Tag> },
                { title: 'Actions', key: 'actions', render: (_, r) => <Button size="small" icon={<EyeOutlined />} onClick={() => viewBlockDetails(r)} /> }
              ]} 
              dataSource={blockchainBlocks.slice(0, 5)} 
              pagination={false} 
              size="middle"
              rowKey="hash"
              className="banking-table-dark"
            />
          </Card>
        </Col>
      </Row>

      {/* HISTORIQUE COMPLET */}
      <div style={{ marginTop: 24 }}>
        <Card 
          title={<Space><DatabaseOutlined style={{ color: '#34d399' }} /><span style={{ color: '#fff' }}>Journal des transactions</span></Space>}
          style={{ borderRadius: 20, background: '#1e293b', border: '1px solid #334155' }}
          extra={<Button icon={<ReloadOutlined />} onClick={loadTransactions} style={{ borderRadius: 8, background: '#334155', color: '#fff', border: 'none' }}>Rafraîchir</Button>}
        >
          <Table 
            columns={transactionColumns} 
            dataSource={transactions.slice(0, 10)} 
            pagination={{ pageSize: 10, showSizeChanger: true }}
            rowKey="transaction_id"
            className="banking-table-dark"
          />
        </Card>
      </div>

      {/* ============================================ */}
      {/* DRAWER XAI (Explainable AI) */}
      {/* ============================================ */}
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
        styles={{ 
          body: { background: '#0f172a', padding: 16 },
          header: { background: '#1e293b', borderBottom: '1px solid #334155' }
        }}
      >
        {xaiTransactionId && (
          <ExplainableAI 
            transactionId={xaiTransactionId} 
            visible={xaiVisible}
            onClose={() => setXaiVisible(false)}
          />
        )}
      </Drawer>

      {/* ============================================ */}
      {/* NOTIFICATIONS DRAWER - UNIQUEMENT ICI */}
      {/* ============================================ */}
      <Drawer
        title={
          <Space>
            <BellOutlined style={{ color: '#34d399' }} />
            <span style={{ color: '#fff' }}>Notifications</span>
            <Badge count={discordNotifications.filter(n => !n.read).length + bankingNotifications.filter(n => !n.read).length} />
          </Space>
        }
        placement="right"
        onClose={() => setNotificationDrawerVisible(false)}
        open={notificationDrawerVisible}
        width={450}
        extra={
          <Space>
            <Button type="text" icon={<ClearOutlined />} onClick={clearNotifications} style={{ color: '#ef4444' }}>
              Effacer
            </Button>
            <Button type="text" icon={<CheckCircleOutlined />} onClick={markAllAsRead} style={{ color: '#10b981' }}>
              Tout lu
            </Button>
          </Space>
        }
        styles={{ body: { background: '#0f172a' }, header: { background: '#1e293b', borderBottom: '1px solid #334155' } }}
      >
        <Tabs defaultActiveKey="all" items={[
          {
            key: 'all',
            label: <span><BellOutlined /> Toutes ({discordNotifications.length + bankingNotifications.length + systemNotifications.length})</span>,
            children: (
              <div style={{ padding: 16 }}>
                {[...discordNotifications, ...bankingNotifications, ...systemNotifications].length > 0 ? (
                  <List
                    dataSource={[...discordNotifications, ...bankingNotifications, ...systemNotifications].sort((a, b) => b.id - a.id)}
                    renderItem={item => (
                      <List.Item 
                        style={{ 
                          background: '#1e293b', 
                          borderRadius: 12, 
                          marginBottom: 12, 
                          padding: 12,
                          borderLeft: `4px solid ${
                            item.type === 'critical' ? '#ef4444' : 
                            item.type === 'warning' ? '#f59e0b' : 
                            item.type === 'success' ? '#10b981' : '#34d399'
                          }`
                        }}
                      >
                        <List.Item.Meta
                          avatar={<Avatar icon={getNotificationIcon(item.type, item.source)} style={{ background: item.source === 'discord' ? '#5865F2' : '#34d399' }} />}
                          title={<Text strong style={{ color: '#fff' }}>{item.title}</Text>}
                          description={
                            <div>
                              <Text style={{ color: '#94a3b8', fontSize: 12 }}>{item.message}</Text>
                              <div style={{ marginTop: 4 }}>
                                {item.source === 'discord' && <Tag icon={<DiscordOutlined />} color="#5865F2" style={{ borderRadius: 12 }}>Discord</Tag>}
                                {item.source === 'system' && <Tag icon={<SettingOutlined />} color="blue" style={{ borderRadius: 12 }}>Système</Tag>}
                                <Text style={{ color: '#64748b', fontSize: 11, marginLeft: 8 }}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
                              </div>
                              {item.data?.fraud_label && (
                                <Tag color="purple" style={{ marginTop: 4 }}>{item.data.fraud_label}</Tag>
                              )}
                              {item.data?.amount && (
                                <Tag color="gold" style={{ marginTop: 4 }}>Montant: {item.data.amount}€</Tag>
                              )}
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="Aucune notification" style={{ color: '#94a3b8' }} />
                )}
              </div>
            )
          },
          {
            key: 'discord',
            label: <span><DiscordOutlined /> Discord ({discordNotifications.length})</span>,
            children: (
              <div style={{ padding: 16 }}>
                {discordNotifications.length > 0 ? (
                  <List
                    dataSource={discordNotifications}
                    renderItem={item => (
                      <List.Item 
                        style={{ 
                          background: '#1e293b', 
                          borderRadius: 12, 
                          marginBottom: 12, 
                          padding: 12,
                          borderLeft: `4px solid ${item.type === 'critical' ? '#ef4444' : '#5865F2'}`
                        }}
                      >
                        <List.Item.Meta
                          avatar={<Avatar icon={<DiscordOutlined />} style={{ background: '#5865F2' }} />}
                          title={<Text strong style={{ color: '#fff' }}>{item.title}</Text>}
                          description={
                            <div>
                              <Text style={{ color: '#94a3b8', fontSize: 12 }}>{item.message}</Text>
                              <Text style={{ color: '#64748b', fontSize: 11, marginTop: 4, display: 'block' }}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="Aucune notification Discord" style={{ color: '#94a3b8' }} />
                )}
              </div>
            )
          },
          {
            key: 'system',
            label: <span><SettingOutlined /> Système ({systemNotifications.length})</span>,
            children: (
              <div style={{ padding: 16 }}>
                {systemNotifications.length > 0 ? (
                  <List
                    dataSource={systemNotifications}
                    renderItem={item => (
                      <List.Item 
                        style={{ 
                          background: '#1e293b', 
                          borderRadius: 12, 
                          marginBottom: 12, 
                          padding: 12,
                          borderLeft: `4px solid ${item.type === 'success' ? '#10b981' : '#34d399'}`
                        }}
                      >
                        <List.Item.Meta
                          avatar={<Avatar icon={<BellOutlined />} style={{ background: '#34d399' }} />}
                          title={<Text strong style={{ color: '#fff' }}>{item.title}</Text>}
                          description={
                            <div>
                              <Text style={{ color: '#94a3b8', fontSize: 12 }}>{item.message}</Text>
                              <Text style={{ color: '#64748b', fontSize: 11, marginTop: 4, display: 'block' }}>{new Date(item.timestamp).toLocaleTimeString()}</Text>
                            </div>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="Aucune notification système" style={{ color: '#94a3b8' }} />
                )}
              </div>
            )
          }
        ]} />
      </Drawer>

      {/* ============================================ */}
      {/* HISTORIQUE DRAWER */}
      {/* ============================================ */}
      <Drawer
        title={
          <Space>
            <HistoryOutlined style={{ color: '#34d399' }} />
            <span style={{ color: '#fff' }}>Historique des notifications</span>
            <Badge count={totalUnread} />
          </Space>
        }
        placement="right"
        onClose={() => setHistoryDrawerVisible(false)}
        open={historyDrawerVisible}
        width={500}
        extra={
          <Space>
            <Button type="text" icon={<ClearOutlined />} onClick={clearHistory} style={{ color: '#ef4444' }}>
              Tout effacer
            </Button>
            <Button type="text" icon={<CheckCircleOutlined />} onClick={markAllAsRead} style={{ color: '#10b981' }}>
              Tout marquer lu
            </Button>
          </Space>
        }
        styles={{ body: { background: '#0f172a' }, header: { background: '#1e293b', borderBottom: '1px solid #334155' } }}
      >
        <div style={{ padding: 16 }}>
          <Space style={{ marginBottom: 16 }}>
            <Button 
              type={historyFilter === 'all' ? 'primary' : 'default'}
              onClick={() => { setHistoryFilter('all'); setHistoryPage(1); }}
              size="small"
            >
              Toutes
            </Button>
            <Button 
              type={historyFilter === 'discord' ? 'primary' : 'default'}
              onClick={() => { setHistoryFilter('discord'); setHistoryPage(1); }}
              size="small"
              icon={<DiscordOutlined />}
            >
              Discord
            </Button>
            <Button 
              type={historyFilter === 'system' ? 'primary' : 'default'}
              onClick={() => { setHistoryFilter('system'); setHistoryPage(1); }}
              size="small"
              icon={<SettingOutlined />}
            >
              Système
            </Button>
          </Space>

          {paginatedHistory.length > 0 ? (
            <>
              <List
                dataSource={paginatedHistory}
                renderItem={item => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div 
                      style={{ 
                        background: item.read ? '#1e293b' : '#2d3748',
                        borderRadius: 12, 
                        marginBottom: 12, 
                        padding: 12,
                        borderLeft: `4px solid ${
                          item.type === 'critical' ? '#ef4444' : 
                          item.type === 'warning' ? '#f59e0b' : 
                          item.type === 'success' ? '#10b981' : '#34d399'
                        }`,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => {
                        setNotificationHistory(prev => 
                          prev.map(n => n.id === item.id ? { ...n, read: true } : n)
                        );
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                        <Avatar 
                          icon={getNotificationIcon(item.type, item.source)} 
                          style={{ background: item.source === 'discord' ? '#5865F2' : '#34d399' }} 
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text strong style={{ color: '#fff' }}>{item.title}</Text>
                            {!item.read && <Badge dot color="green" />}
                          </div>
                          <Text style={{ color: '#94a3b8', fontSize: 12 }}>{item.message}</Text>
                          <div style={{ marginTop: 8 }}>
                            {item.source === 'discord' && <Tag icon={<DiscordOutlined />} color="#5865F2" style={{ borderRadius: 12 }}>Discord</Tag>}
                            {item.source === 'system' && <Tag icon={<SettingOutlined />} color="blue" style={{ borderRadius: 12 }}>Système</Tag>}
                            <Text style={{ color: '#64748b', fontSize: 11, marginLeft: 8 }}>
                              {dayjs(item.timestamp).format('DD/MM/YYYY HH:mm:ss')}
                            </Text>
                          </div>
                          {item.data?.fraud_label && (
                            <Tag color="purple" style={{ marginTop: 4 }}>{item.data.fraud_label}</Tag>
                          )}
                          {item.data?.amount && (
                            <Tag color="gold" style={{ marginTop: 4 }}>Montant: {item.data.amount}€</Tag>
                          )}
                          {item.data?.level && (
                            <Tag color="red" style={{ marginTop: 4 }}>Niveau: {item.data.level}</Tag>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              />
              <Pagination
                current={historyPage}
                total={filteredHistory.length}
                pageSize={pageSize}
                onChange={(page) => setHistoryPage(page)}
                style={{ marginTop: 16, textAlign: 'center' }}
                showTotal={(total) => `${total} notifications`}
              />
            </>
          ) : (
            <Empty description="Aucune notification dans l'historique" style={{ color: '#94a3b8' }} />
          )}
        </div>
      </Drawer>

      {/* ============================================ */}
      {/* MODAL DÉTAILS BLOC BLOCKCHAIN */}
      {/* ============================================ */}
      <Modal
        title={<Space><BlockOutlined style={{ color: '#475569' }} /><span style={{ color: '#fff' }}>Détails du Bloc</span></Space>}
        open={blockModalVisible}
        onCancel={() => setBlockModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setBlockModalVisible(false)} style={{ borderRadius: 8 }}>
            Fermer
          </Button>
        ]}
        width={600}
        styles={{ body: { background: '#1e293b' }, header: { background: '#1e293b', borderBottom: '1px solid #334155' } }}
      >
        {selectedBlock && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Hash"><code style={{ color: '#475569' }}>{selectedBlock.hash}</code></Descriptions.Item>
            <Descriptions.Item label="Transactions incluses">{selectedBlock.transactions}</Descriptions.Item>
            <Descriptions.Item label="Montant total"><Text strong style={{ color: '#fbbf24' }}>{selectedBlock.amount?.toLocaleString()} €</Text></Descriptions.Item>
            <Descriptions.Item label="Expéditeur">{selectedBlock.from_address}</Descriptions.Item>
            <Descriptions.Item label="Destinataire">{selectedBlock.to_address}</Descriptions.Item>
            <Descriptions.Item label="Statut">
              <Tag color={selectedBlock.status === 'confirmed' ? 'green' : 'warning'} style={{ borderRadius: 12 }}>
                {selectedBlock.status?.toUpperCase()}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Horodatage">{new Date(selectedBlock.timestamp).toLocaleString()}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <style>{`
        .banking-table-dark .ant-table {
          background: transparent !important;
          color: #f1f5f9 !important;
        }
        .banking-table-dark .ant-table-thead > tr > th {
          background: #0f172a !important;
          color: #94a3b8 !important;
          font-weight: 600 !important;
          border-bottom: 1px solid #334155 !important;
        }
        .banking-table-dark .ant-table-tbody > tr > td {
          background: #1e293b !important;
          color: #f1f5f9 !important;
          border-color: #334155 !important;
        }
        .banking-table-dark .ant-table-tbody > tr:hover > td {
          background: #334155 !important;
        }
        .ant-steps-item-title {
          color: #f1f5f9 !important;
        }
        .ant-steps-item-description {
          color: #94a3b8 !important;
        }
        .ant-card-head-title {
          color: #f1f5f9 !important;
        }
        .ant-card-head {
          border-bottom: 1px solid #334155 !important;
        }
        .ant-modal-header {
          background: #1e293b !important;
          border-bottom: 1px solid #334155 !important;
        }
        .ant-modal-title {
          color: #f1f5f9 !important;
        }
        .ant-modal-close {
          color: #94a3b8 !important;
        }
        .ant-descriptions-item-label {
          background: #0f172a !important;
          color: #94a3b8 !important;
          border-color: #334155 !important;
        }
        .ant-descriptions-item-content {
          background: #1e293b !important;
          color: #f1f5f9 !important;
          border-color: #334155 !important;
        }
        .ant-drawer-header {
          background: #1e293b !important;
          border-bottom: 1px solid #334155 !important;
        }
        .ant-drawer-title {
          color: #f1f5f9 !important;
        }
        .ant-drawer-close {
          color: #94a3b8 !important;
        }
      `}</style>
    </div>
  );
};

export default BankingDashboard;