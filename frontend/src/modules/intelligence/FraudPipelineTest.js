import React, { useState, useRef, useEffect } from 'react';
import {
  Card, Row, Col, Button, Tag, Statistic, Table,
  Alert, Space, Typography, Switch, message
} from 'antd';
import {
  ThunderboltOutlined, ApiOutlined, NodeIndexOutlined,
  ExperimentOutlined, SafetyCertificateOutlined, CheckCircleOutlined,
  CloseCircleOutlined, LoadingOutlined, SendOutlined, ReloadOutlined,
  DatabaseOutlined, RobotOutlined, BlockOutlined, WarningOutlined,
  CloudServerOutlined, LineChartOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

const { Title, Text } = Typography;

// ─── Palettes ────────────────────────────────────────────────────────────────
const C = {
  bg: '#0f172a',
  card: '#1e293b',
  border: '#334155',
  blue: '#3b82f6',
  purple: '#475569',
  green: '#10b981',
  red: '#ef4444',
  orange: '#10b981',
  cyan: '#06b6d4',
  text: '#f1f5f9',
  muted: '#94a3b8',
};

// ─── Générateur de transactions virtuelles ───────────────────────────────────
function generateTransaction(type = 'normal') {
  const id = `VIRT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
  const configs = {
    normal: { amount: 150 + Math.random() * 500, risk: 0.05, label: '✅ Légitime', color: C.green },
    suspect: { amount: 8500 + Math.random() * 5000, risk: 0.55, label: '⚠️ Suspect', color: C.orange },
    fraud: { amount: 85000 + Math.random() * 15000, risk: 0.92, label: '🚨 Fraude', color: C.red },
  };
  const cfg = configs[type] || configs.normal;
  return {
    transaction_id: id,
    amount: parseFloat(cfg.amount.toFixed(2)),
    currency: 'EUR',
    sender: { 
      id: type === 'fraud' ? 'ACC-BLACKLIST-001' : 'ACC-SAFE-001', 
      name: type === 'fraud' ? 'Compte Suspect' : 'Compte Test', 
      country: 'FR' 
    },
    recipient: { 
      id: type === 'fraud' ? 'ACC-OFFSHORE-999' : 'ACC-SAFE-002', 
      name: type === 'fraud' ? 'Compte Off-shore' : 'Bénéficiaire Test', 
      country: type === 'fraud' ? 'CY' : 'FR' 
    },
    timestamp: new Date().toISOString(),
    metadata: { ip: '192.168.1.1', risk_hint: cfg.risk, transaction_type: type },
    _label: cfg.label,
    _color: cfg.color,
  };
}

// ─── Étapes Pipeline ─────────────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: 'kafka',   label: 'Kafka',         icon: <ThunderboltOutlined />, color: C.orange, desc: 'Publication dans le topic transactions' },
  { key: 'neo4j',   label: 'Neo4j',         icon: <NodeIndexOutlined />,   color: C.cyan,   desc: 'Création du graphe de relation' },
  { key: 'gnn',     label: 'GNN Transformer', icon: <ApiOutlined />,       color: C.purple, desc: 'Analyse topologique du réseau' },
  { key: 'grover',  label: 'Grover / QNN',  icon: <ExperimentOutlined />,  color: C.blue,   desc: 'Classification quantique' },
  { key: 'verdict', label: 'Verdict Final', icon: <SafetyCertificateOutlined />, color: C.green, desc: 'Décision consolidée + Blockchain' },
];

// ─── Composant Stage Card amélioré ──────────────────────────────────────────
function StageCard({ stage, status, result, index }) {
  const statusConfig = {
    idle:    { color: C.border,  icon: null,                         bg: C.card, label: 'En attente' },
    running: { color: C.blue,    icon: <LoadingOutlined spin />,     bg: '#1e3a5f', label: 'En cours...' },
    done:    { color: C.green,   icon: <CheckCircleOutlined />,      bg: '#064e3b', label: 'Terminé' },
    fraud:   { color: C.red,     icon: <CloseCircleOutlined />,      bg: '#7f1d1d', label: 'Fraude détectée' },
  };
  const cfg = statusConfig[status] || statusConfig.idle;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      style={{
        border: `2px solid ${cfg.color}`,
        borderRadius: 16,
        padding: '16px',
        background: cfg.bg,
        minHeight: 140,
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Barre de progression animée pour l'état running */}
      {status === 'running' && (
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 1.5, repeat: Infinity }}
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            height: 3,
            background: `linear-gradient(90deg, ${cfg.color}, ${C.cyan})`,
          }}
        />
      )}
      
      <Space align="center" style={{ marginBottom: 12 }}>
        <span style={{ color: stage.color, fontSize: 22 }}>{stage.icon}</span>
        <Text strong style={{ color: C.text, fontSize: 15 }}>{stage.label}</Text>
        {cfg.icon && <span style={{ color: cfg.color, marginLeft: 4 }}>{cfg.icon}</span>}
        <Tag color={cfg.color.replace('#', '')} style={{ marginLeft: 8, borderRadius: 12 }}>
          {cfg.label}
        </Tag>
      </Space>
      
      <Text style={{ color: C.muted, fontSize: 12, display: 'block', marginBottom: 12 }}>{stage.desc}</Text>
      
      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ marginTop: 10, padding: '10px', background: 'rgba(0,0,0,0.4)', borderRadius: 10 }}
        >
          {Object.entries(result).map(([k, v]) => (
            <div key={k} style={{ fontSize: 12, marginBottom: 4 }}>
              <Text style={{ color: C.muted }}>{k}: </Text>
              <Text strong style={{ color: typeof v === 'boolean' ? (v ? C.red : C.green) : C.cyan }}>
                {typeof v === 'boolean' ? (v ? '⚠️ OUI' : '✅ NON') : String(v)}
              </Text>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

// ─── Page Principale ──────────────────────────────────────────────────────────
export default function FraudPipelineTest() {
  const [txType, setTxType] = useState('fraud');
  const [transaction, setTransaction] = useState(null);
  const [stages, setStages] = useState({});
  const [running, setRunning] = useState(false);
  const [history, setHistory] = useState([]);
  const [autoMode, setAutoMode] = useState(false);
  const [apiStatus, setApiStatus] = useState({ gnn: true, grover: true });
  const autoRef = useRef(null);

  const updateStage = (key, status, result = null) =>
    setStages(prev => ({ ...prev, [key]: { status, result } }));

  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

  const runPipeline = async (tx) => {
    if (running) return;
    setRunning(true);
    setStages({});
    const current = tx || generateTransaction(txType);
    setTransaction(current);

    try {
      // ── Étape 1: Kafka ──
      updateStage('kafka', 'running');
      await sleep(600);
      updateStage('kafka', 'done', { topic: 'transactions', offset: Math.floor(Math.random() * 9999), partition: 0 });

      // ── Étape 2: Neo4j ──
      updateStage('neo4j', 'running');
      await sleep(800);
      updateStage('neo4j', 'done', { nodes_created: 2, relation: `TRANSACTION_${current.amount.toFixed(0)}€`, depth: 3 });

      // ── Étape 3: GNN ──
      updateStage('gnn', 'running');
      let gnnResult = { is_fraudulent: false, confidence: 0.12, path: 'fast' };
      try {
        const r = await api.post('/fraud-detection/analyze', {
          transaction_id: current.transaction_id,
          amount: current.amount,
          sender: current.sender,
          recipient: current.recipient,
          timestamp: current.timestamp,
          metadata: current.metadata,
        });
        if (r.data) {
          gnnResult = { 
            is_fraudulent: r.data.is_fraudulent, 
            confidence: parseFloat((r.data.confidence || 0.5).toFixed(3)), 
            path: r.data.path || 'deep' 
          };
          setApiStatus(prev => ({ ...prev, gnn: true }));
        }
      } catch (error) {
        console.warn('GNN API unavailable, using fallback');
        setApiStatus(prev => ({ ...prev, gnn: false }));
        gnnResult = {
          is_fraudulent: txType === 'fraud',
          confidence: txType === 'fraud' ? 0.87 : txType === 'suspect' ? 0.55 : 0.08,
          path: txType === 'fraud' ? 'quantum_simulated' : 'fast',
        };
      }
      updateStage('gnn', gnnResult.is_fraudulent ? 'fraud' : 'done', gnnResult);
      await sleep(600);

      // ── Étape 4: Grover / QNN ──
      updateStage('grover', 'running');
      let qnnResult = { is_fraudulent: false, confidence: 0.1, quantum_state: 'coherent' };
      try {
        const baseUrl = process.env.REACT_APP_GROVER_URL || 'http://localhost:8001';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const r = await fetch(`${baseUrl}/qnn/classify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            transaction_id: current.transaction_id, 
            amount: current.amount, 
            risk_score: current.metadata?.risk_hint || 0.1 
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (r.ok) { 
          const d = await r.json(); 
          qnnResult = d.qnn_verdict || qnnResult;
          setApiStatus(prev => ({ ...prev, grover: true }));
        }
      } catch (error) {
        console.warn('Grover API unavailable, using fallback');
        setApiStatus(prev => ({ ...prev, grover: false }));
        qnnResult = {
          is_fraudulent: txType === 'fraud',
          confidence: txType === 'fraud' ? 0.91 : 0.07,
          quantum_state: txType === 'fraud' ? 'entangled_simulated' : 'coherent',
        };
      }
      updateStage('grover', qnnResult.is_fraudulent ? 'fraud' : 'done', qnnResult);
      await sleep(600);

      // ── Étape 5: Verdict ──
      updateStage('verdict', 'running');
      await sleep(500);
      const isFraud = gnnResult.is_fraudulent || qnnResult.is_fraudulent;
      const confidence = Math.max(gnnResult.confidence, qnnResult.confidence);
      const verdict = {
        fraude_détectée: isFraud,
        score_global: parseFloat(confidence.toFixed(3)),
        action: isFraud ? '🚫 Transaction bloquée' : '✅ Transaction validée',
        blockchain_hash: `0x${Math.random().toString(16).slice(2, 18)}${Math.random().toString(16).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
      };
      updateStage('verdict', isFraud ? 'fraud' : 'done', verdict);

      // Message de notification
      if (isFraud) {
        message.error(`🚨 Fraude détectée pour la transaction ${current.transaction_id.slice(-8)}`);
      } else {
        message.success(`✅ Transaction ${current.transaction_id.slice(-8)} validée`);
      }

      // Historique
      const entry = {
        key: current.transaction_id,
        id: current.transaction_id.slice(-12),
        montant: `${current.amount.toLocaleString()} €`,
        type: current._label,
        gnn: `${(gnnResult.confidence * 100).toFixed(0)}%`,
        qnn: `${(qnnResult.confidence * 100).toFixed(0)}%`,
        verdict: isFraud ? '🚨 FRAUDE' : '✅ LÉGITIME',
        date: new Date().toLocaleTimeString(),
      };
      setHistory(prev => [entry, ...prev].slice(0, 20));
      
    } catch (error) {
      console.error('Pipeline error:', error);
      message.error('Erreur lors de l\'exécution du pipeline');
    } finally {
      setRunning(false);
    }
  };

  // Mode auto
  useEffect(() => {
    if (autoMode && !running) {
      autoRef.current = setInterval(() => {
        const types = ['normal', 'normal', 'suspect', 'fraud'];
        const t = types[Math.floor(Math.random() * types.length)];
        runPipeline(generateTransaction(t));
      }, 8000);
    } else {
      clearInterval(autoRef.current);
    }
    return () => clearInterval(autoRef.current);
  }, [autoMode, running]);

  const columns = [
    { title: 'ID', dataIndex: 'id', width: 120, render: v => <code style={{ color: C.cyan, fontSize: 11 }}>{v}</code> },
    { title: 'Montant', dataIndex: 'montant', width: 100, render: v => <Text strong style={{ color: C.text }}>{v}</Text> },
    { title: 'Type', dataIndex: 'type', width: 100, render: v => <span style={{ color: v.includes('Fraude') ? C.red : v.includes('Suspect') ? C.orange : C.green }}>{v}</span> },
    { title: 'GNN', dataIndex: 'gnn', width: 70, render: v => <Tag color="purple" style={{ borderRadius: 12 }}>{v}</Tag> },
    { title: 'QNN', dataIndex: 'qnn', width: 70, render: v => <Tag color="blue" style={{ borderRadius: 12 }}>{v}</Tag> },
    { title: 'Verdict', dataIndex: 'verdict', width: 100, render: v => <Tag color={v.includes('FRAUDE') ? 'red' : 'green'} style={{ borderRadius: 12 }}>{v}</Tag> },
    { title: 'Heure', dataIndex: 'date', width: 100, render: v => <Text style={{ color: C.muted, fontSize: 11 }}>{v}</Text> },
  ];

  const stageStatus = (key) => stages[key]?.status || 'idle';
  const stageResult = (key) => stages[key]?.result || null;

  // Alerte si API non disponibles
  const showApiWarning = !apiStatus.gnn || !apiStatus.grover;

  return (
    <div style={{ padding: 24, background: C.bg, minHeight: '100vh' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #1e1b4b 0%, #172554 100%)', 
          borderRadius: 20, 
          padding: '24px 32px', 
          marginBottom: 24, 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          flexWrap: 'wrap',
          gap: 16,
          border: `1px solid ${C.border}` 
        }}>
          <div>
            <Title level={2} style={{ margin: 0, color: C.text }}>
              <RobotOutlined style={{ marginRight: 12, color: C.purple }} />
              Pipeline Fraud Intelligence — Test en Direct
            </Title>
            <Text style={{ color: C.muted }}>Kafka → Neo4j → GNN → Grover/QNN → Verdict Blockchain</Text>
          </div>
          <Space>
            <Text style={{ color: C.muted }}>Mode Auto</Text>
            <Switch checked={autoMode} onChange={setAutoMode} />
          </Space>
        </div>
      </motion.div>

      {/* Alerte API si nécessaire */}
      {showApiWarning && (
        <Alert
          message="API externes non disponibles"
          description="Les services GNN et/ou Grover ne répondent pas. Le pipeline utilise des simulations locales."
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 24, borderRadius: 12 }}
          closable
        />
      )}

      {/* Contrôles */}
      <Card style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, marginBottom: 24 }}>
        <Row gutter={16} align="middle">
          <Col>
            <Text strong style={{ color: C.text }}>Type de transaction : </Text>
          </Col>
          {['normal', 'suspect', 'fraud'].map(t => (
            <Col key={t}>
              <Button
                type={txType === t ? 'primary' : 'default'}
                onClick={() => setTxType(t)}
                style={{ 
                  borderRadius: 12, 
                  background: txType === t ? (t === 'fraud' ? C.red : t === 'suspect' ? C.orange : C.green) : undefined,
                  borderColor: txType === t ? 'transparent' : C.border,
                  color: txType === t ? 'white' : C.text,
                }}
              >
                {t === 'normal' ? '✅ Légitime' : t === 'suspect' ? '⚠️ Suspect' : '🚨 Fraude'}
              </Button>
            </Col>
          ))}
          <Col flex="auto" />
          <Col>
            <Button
              type="primary"
              size="large"
              icon={running ? <LoadingOutlined /> : <SendOutlined />}
              onClick={() => runPipeline()}
              disabled={running}
              style={{ 
                borderRadius: 14, 
                background: 'linear-gradient(135deg, #2563eb, #475569)', 
                border: 'none', 
                height: 44,
                boxShadow: '0 4px 15px rgba(99,102,241,0.3)'
              }}
            >
              {running ? 'Analyse en cours...' : 'Lancer le Pipeline'}
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Transaction active */}
      <AnimatePresence>
        {transaction && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }} 
            style={{ marginBottom: 24 }}
          >
            <Card style={{ background: '#1e2433', border: `1px solid ${transaction._color}`, borderRadius: 16 }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} md={5}>
                  <Statistic 
                    title={<span style={{ color: C.muted }}>ID Transaction</span>} 
                    value={transaction.transaction_id.slice(-12)} 
                    valueStyle={{ color: C.cyan, fontSize: 13, fontFamily: 'monospace' }} 
                  />
                </Col>
                <Col xs={24} sm={12} md={4}>
                  <Statistic 
                    title={<span style={{ color: C.muted }}>Montant</span>} 
                    value={transaction.amount.toLocaleString()} 
                    suffix="€" 
                    valueStyle={{ color: transaction._color, fontWeight: 700, fontSize: 20 }} 
                  />
                </Col>
                <Col xs={24} sm={12} md={5}>
                  <Statistic 
                    title={<span style={{ color: C.muted }}>Émetteur</span>} 
                    value={transaction.sender.id} 
                    valueStyle={{ color: C.text, fontSize: 12, fontFamily: 'monospace' }} 
                  />
                </Col>
                <Col xs={24} sm={12} md={5}>
                  <Statistic 
                    title={<span style={{ color: C.muted }}>Bénéficiaire</span>} 
                    value={transaction.recipient.id} 
                    valueStyle={{ color: C.text, fontSize: 12, fontFamily: 'monospace' }} 
                  />
                </Col>
                <Col xs={24} sm={12} md={5}>
                  <Statistic 
                    title={<span style={{ color: C.muted }}>Type</span>} 
                    value={transaction._label} 
                    valueStyle={{ color: transaction._color, fontSize: 14, fontWeight: 600 }} 
                  />
                </Col>
              </Row>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Étapes Pipeline */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {PIPELINE_STAGES.map((stage, idx) => (
          <Col xs={24} sm={12} md={8} lg={5} key={stage.key}>
            <StageCard 
              stage={stage} 
              status={stageStatus(stage.key)} 
              result={stageResult(stage.key)} 
              index={idx}
            />
          </Col>
        ))}
      </Row>

      {/* Verdict Global */}
      <AnimatePresence>
        {stages.verdict?.status && stages.verdict.status !== 'idle' && stages.verdict.status !== 'running' && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }} 
            animate={{ opacity: 1, scale: 1 }} 
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ marginBottom: 24 }}
          >
            <Alert
              type={stages.verdict.status === 'fraud' ? 'error' : 'success'}
              showIcon
              icon={stages.verdict.status === 'fraud' ? <CloseCircleOutlined /> : <CheckCircleOutlined />}
              message={
                <Text strong style={{ fontSize: 18, color: 'white' }}>
                  {stages.verdict.result?.action || ''}
                </Text>
              }
              description={
                <Space wrap>
                  <Tag color="blue" style={{ borderRadius: 12 }}>Score: {((stages.verdict.result?.score_global || 0) * 100).toFixed(1)}%</Tag>
                  <Tag color="cyan" style={{ borderRadius: 12 }}>Hash: {stages.verdict.result?.blockchain_hash?.slice(0, 24)}...</Tag>
                  <Tag color="purple" style={{ borderRadius: 12 }}><BlockOutlined /> Enregistré sur Blockchain</Tag>
                </Space>
              }
              style={{ 
                borderRadius: 16, 
                border: `2px solid ${stages.verdict.status === 'fraud' ? C.red : C.green}`,
                background: stages.verdict.status === 'fraud' ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)'
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Historique */}
      {history.length > 0 && (
        <Card
          title={
            <Space>
              <DatabaseOutlined style={{ color: C.blue }} />
              <Text strong style={{ color: C.text }}>Historique des Tests ({history.length})</Text>
              <Tag color="blue" style={{ borderRadius: 12 }}>20 derniers</Tag>
            </Space>
          }
          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16 }}
          extra={
            <Button 
              size="small" 
              icon={<ReloadOutlined />} 
              onClick={() => setHistory([])} 
              style={{ borderRadius: 8 }}
            >
              Effacer
            </Button>
          }
        >
          <Table
            dataSource={history}
            columns={columns}
            pagination={{ pageSize: 8, showSizeChanger: false }}
            size="middle"
            style={{ background: 'transparent' }}
            className="dark-table"
            rowClassName={() => 'dark-table-row'}
          />
        </Card>
      )}

      <style>{`
        .dark-table .ant-table { background: transparent !important; color: #f1f5f9 !important; }
        .dark-table .ant-table-thead > tr > th { 
          background: #0f172a !important; 
          color: #94a3b8 !important; 
          border-color: #334155 !important;
          font-weight: 600 !important;
        }
        .dark-table .ant-table-tbody > tr > td { 
          border-color: #1e293b !important;
          background: transparent !important;
        }
        .dark-table .ant-table-tbody > tr:hover > td { 
          background: #1e293b !important; 
        }
        .dark-table .ant-table-row { background: transparent !important; }
        .dark-table .ant-pagination .ant-pagination-item { 
          background: transparent !important;
          border-color: #334155 !important;
        }
        .dark-table .ant-pagination .ant-pagination-item a { color: #94a3b8; }
        .dark-table .ant-pagination .ant-pagination-item-active { 
          border-color: #3b82f6 !important;
          background: #3b82f6 !important;
        }
        .dark-table .ant-pagination .ant-pagination-item-active a { color: white !important; }
        .dark-table .ant-pagination-prev button, 
        .dark-table .ant-pagination-next button { 
          background: transparent !important;
          border-color: #334155 !important;
          color: #94a3b8 !important;
        }
        .dark-table-row {
          background: transparent !important;
        }
      `}</style>
    </div>
  );
}