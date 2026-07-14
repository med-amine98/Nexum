// src/modules/security/FraudDetection.js
import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Statistic, Table, Tag, Space, 
  Alert, Button, Tooltip, Progress, Badge, 
  Typography, Divider, Modal, Descriptions, Tabs,
  Empty, Skeleton, message
} from 'antd';
import { 
  SafetyCertificateOutlined, ReloadOutlined, WarningOutlined,
  EyeOutlined, CheckCircleOutlined,
  ThunderboltOutlined, RobotOutlined,
  ClockCircleOutlined,
  BellOutlined, LockOutlined, ExperimentOutlined,
  ApiOutlined, DatabaseOutlined,
  FilterOutlined, ExportOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;

// ========== FONCTIONS UTILITAIRES ==========
const safeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data === null || data === undefined) return [];
  try {
    if (typeof data === 'object') {
      if (data.data && Array.isArray(data.data)) return data.data;
      if (data.items && Array.isArray(data.items)) return data.items;
      if (data.alerts && Array.isArray(data.alerts)) return data.alerts;
    }
  } catch (e) {
    console.warn('Erreur dans safeArray:', e);
  }
  return [];
};

const safeObject = (obj, defaultValue = {}) => {
  if (!obj) return defaultValue;
  if (typeof obj === 'object' && !Array.isArray(obj)) return obj;
  return defaultValue;
};

const safeNumber = (num, defaultValue = 0) => {
  if (typeof num === 'number' && !isNaN(num)) return num;
  if (num === null || num === undefined) return defaultValue;
  try {
    const parsed = parseFloat(num);
    return isNaN(parsed) ? defaultValue : parsed;
  } catch {
    return defaultValue;
  }
};

const safeString = (str, defaultValue = '') => {
  if (str === null || str === undefined) return defaultValue;
  if (typeof str === 'string') return str;
  try {
    return String(str);
  } catch {
    return defaultValue;
  }
};

const formatAmount = (amount) => {
  const num = safeNumber(amount);
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M €`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}k €`;
  return `${num.toLocaleString('fr-FR')} €`;
};

// Modèles IA de détection
const detectionModels = [
  { id: 'xgboost', name: 'XGBoost', accuracy: 96, icon: <ExperimentOutlined />, color: '#1890ff' },
  { id: 'lightgbm', name: 'LightGBM', accuracy: 95, icon: <ThunderboltOutlined />, color: '#52c41a' },
  { id: 'catboost', name: 'CatBoost', accuracy: 94, icon: <RobotOutlined />, color: '#722ed1' },
  { id: 'dnn', name: 'Deep Neural Net', accuracy: 97, icon: <ApiOutlined />, color: '#fa8c16' }
];

const FraudDetection = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  // Charger toutes les données
  const fetchData = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    
    try {
      const dashboardRes = await api.get('/fraud/dashboard').catch(err => ({ data: null }));
      const dashboardData = safeObject(dashboardRes.data);
      setAlerts(safeArray(dashboardData.alerts));
      
      const statsRes = await api.get('/fraud/stats').catch(err => ({ data: null }));
      setStats(safeObject(statsRes.data));
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Erreur:', err);
      setError("Impossible de charger les données de détection de fraude");
    } finally {
      setLoading(false);
      if (showRefreshing) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleViewDetails = (alert) => {
    setSelectedAlert(alert);
    setModalVisible(true);
  };

  const handleRefresh = () => fetchData(true);

  const getRiskColor = (risk) => {
    const safeRisk = safeNumber(risk);
    if (safeRisk > 80) return '#f5222d';
    if (safeRisk > 60) return '#fa8c16';
    if (safeRisk > 40) return '#faad14';
    return '#52c41a';
  };

  const getRiskLevel = (risk) => {
    const safeRisk = safeNumber(risk);
    if (safeRisk > 80) return { text: 'CRITIQUE', color: 'error' };
    if (safeRisk > 60) return { text: 'ÉLEVÉ', color: 'warning' };
    if (safeRisk > 40) return { text: 'MOYEN', color: 'gold' };
    return { text: 'FAIBLE', color: 'success' };
  };

  const filteredAlerts = alerts.filter(alert => {
    if (activeTab === 'all') return true;
    if (activeTab === 'critical') return safeNumber(alert.risk_score) > 80;
    if (activeTab === 'high') return safeNumber(alert.risk_score) > 60 && safeNumber(alert.risk_score) <= 80;
    if (activeTab === 'resolved') return alert.status === 'résolu';
    return true;
  });

  const columns = [
    { 
      title: 'Transaction', 
      dataIndex: 'transaction_id', 
      key: 'transaction',
      width: 180,
      render: (text) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{safeString(text).slice(0, 16)}...</span>
    },
    { 
      title: 'Montant', 
      dataIndex: 'amount', 
      key: 'amount',
      width: 120,
      render: (amount) => <span style={{ fontWeight: 'bold', color: '#3f8600' }}>{formatAmount(amount)}</span>
    },
    { 
      title: 'Score risque', 
      dataIndex: 'risk_score', 
      key: 'risk',
      width: 120,
      render: (risk) => {
        const safeRisk = safeNumber(risk);
        return (
          <Tooltip title={`Score: ${safeRisk}%`}>
            <Progress 
              percent={safeRisk} 
              size="small" 
              status={safeRisk > 70 ? 'exception' : 'active'}
              strokeColor={getRiskColor(risk)}
              style={{ width: 100 }}
            />
          </Tooltip>
        );
      }
    },
    { 
      title: 'Niveau', 
      dataIndex: 'risk_score', 
      key: 'level',
      width: 100,
      render: (risk) => {
        const level = getRiskLevel(risk);
        return <Tag color={level.color} icon={<WarningOutlined />}>{level.text}</Tag>;
      }
    },
    { 
      title: 'Modèle', 
      dataIndex: 'detection_model', 
      key: 'model',
      width: 120,
      render: (model) => <Tag color="purple" icon={<RobotOutlined />}>{model || 'Ensemble'}</Tag>
    },
    { 
      title: 'Date', 
      dataIndex: 'timestamp', 
      key: 'date',
      width: 160,
      render: (ts) => new Date(ts).toLocaleString()
    },
    {
      title: 'Action',
      key: 'action',
      width: 80,
      render: (_, record) => (
        <Tooltip title="Voir détails">
          <Button 
            size="small" 
            icon={<EyeOutlined />} 
            onClick={() => handleViewDetails(record)}
            type="text"
          />
        </Tooltip>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', padding: 24 }}>
        <Card style={{ borderRadius: 24, padding: 32 }}>
          <Skeleton active avatar paragraph={{ rows: 6 }} />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 24, minHeight: '100vh', background: '#f0f2f5' }}>
        <Alert
          message="Erreur de chargement"
          description={error}
          type="error"
          showIcon
          style={{ borderRadius: 12 }}
          action={
            <Button size="small" type="primary" onClick={() => fetchData(true)}>
              Réessayer
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', padding: 24 }}
    >
      {/* En-tête premium */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{ 
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: 24, 
          padding: '24px 32px', 
          marginBottom: 32,
          boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
        }}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="large">
              <div style={{ 
                width: 60, 
                height: 60, 
                background: 'linear-gradient(135deg, #f5222d, #ff7875)',
                borderRadius: 20,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 8px 20px rgba(245,34,45,0.3)'
              }}>
                <SafetyCertificateOutlined style={{ fontSize: 32, color: 'white' }} />
              </div>
              <div>
                <Title level={2} style={{ margin: 0, color: 'white' }}>Système Anti-Fraude</Title>
                <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
                  Détection temps réel • 4 modèles IA • Protection continue
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              {lastUpdate && (
                <Tag color="blue" icon={<ClockCircleOutlined />} style={{ background: 'rgba(24,144,255,0.2)', border: 'none', color: 'white' }}>
                  {lastUpdate.toLocaleTimeString()}
                </Tag>
              )}
              <Button 
                icon={<ReloadOutlined spin={refreshing} />} 
                onClick={handleRefresh}
                loading={refreshing}
                type="primary"
                ghost
              >
                Actualiser
              </Button>
            </Space>
          </Col>
        </Row>
      </motion.div>

      {/* KPIs */}
      <Row gutter={[24, 24]}>
        <Col xs={24} sm={12} lg={6}>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
            <Card hoverable style={{ borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <Statistic 
                title="Score de risque moyen" 
                value={safeNumber(stats?.avg_risk_score)} 
                suffix="/100" 
                prefix={<WarningOutlined />}
                valueStyle={{ color: getRiskColor(stats?.avg_risk_score) }}
              />
              <Progress 
                percent={safeNumber(stats?.avg_risk_score)} 
                size="small" 
                strokeColor={getRiskColor(stats?.avg_risk_score)}
                showInfo={false}
                style={{ marginTop: 8 }}
              />
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
            <Card hoverable style={{ borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <Statistic 
                title="Transactions analysées" 
                value={safeNumber(stats?.total_transactions_analyzed)} 
                prefix={<DatabaseOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
              <Text type="secondary">24h glissantes</Text>
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
            <Card hoverable style={{ borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <Statistic 
                title="Alertes critiques" 
                value={safeNumber(stats?.critical_alerts)} 
                prefix={<WarningOutlined />}
                valueStyle={{ color: '#f5222d' }}
              />
              <Tag color="error" icon={<WarningOutlined />}>Action immédiate requise</Tag>
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.35 }}>
            <Card hoverable style={{ borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
              <Statistic 
                title="Montant économisé" 
                value={safeNumber(stats?.saved_amount)} 
                precision={0}
                suffix="€"
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
              <Text type="success">Protection continue</Text>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Modèles IA */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}>
            <Card 
              title={<Space><RobotOutlined /> Modèles de détection IA</Space>}
              style={{ borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
            >
              <Row gutter={[16, 16]}>
                {detectionModels.map(model => (
                  <Col xs={24} sm={12} lg={6} key={model.id}>
                    <Card hoverable size="small" style={{ textAlign: 'center', borderTop: `3px solid ${model.color}` }}>
                      <div style={{ fontSize: 28, color: model.color }}>{model.icon}</div>
                      <Title level={5} style={{ marginTop: 8 }}>{model.name}</Title>
                      <Progress percent={model.accuracy} size="small" strokeColor={model.color} />
                      <Tag color={model.color} style={{ marginTop: 8 }}>Précision {model.accuracy}%</Tag>
                    </Card>
                  </Col>
                ))}
              </Row>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Alertes */}
      <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
        <Col span={24}>
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.45 }}>
            <Card 
              title={
                <Space>
                  <BellOutlined style={{ color: '#f5222d' }} />
                  <span>Alertes de fraude</span>
                  <Badge count={alerts.length} style={{ backgroundColor: '#f5222d' }} />
                </Space>
              }
              extra={
                <Space>
                  <Button size="small" icon={<FilterOutlined />}>Filtrer</Button>
                  <Button size="small" icon={<ExportOutlined />}>Exporter</Button>
                </Space>
              }
              style={{ borderRadius: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
            >
              <Tabs activeKey={activeTab} onChange={setActiveTab} style={{ marginBottom: 16 }}>
                <Tabs.TabPane tab="Toutes" key="all" />
                <Tabs.TabPane tab="Critiques" key="critical" />
                <Tabs.TabPane tab="Élevées" key="high" />
                <Tabs.TabPane tab="Résolues" key="resolved" />
              </Tabs>
              
              {filteredAlerts.length > 0 ? (
                <Table 
                  columns={columns} 
                  dataSource={filteredAlerts.map(a => ({ ...a, key: a.id }))} 
                  rowKey="key"
                  pagination={{ pageSize: 8 }}
                  scroll={{ x: 800 }}
                  locale={{ emptyText: <Empty description="Aucune alerte" /> }}
                />
              ) : (
                <Empty description="Aucune alerte pour cette catégorie" />
              )}
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Alerte critique */}
      {stats?.critical_alerts > 0 && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          style={{ marginTop: 24 }}
        >
          <Alert
            message={`${stats.critical_alerts} alerte(s) critique(s) nécessitent votre attention immédiate`}
            description="Ces transactions présentent un risque de fraude très élevé. Une investigation rapide est recommandée."
            type="error"
            showIcon
            icon={<WarningOutlined />}
            action={
              <Button size="small" type="primary" danger onClick={() => setActiveTab('critical')}>
                Voir les alertes
              </Button>
            }
            style={{ borderRadius: 12 }}
          />
        </motion.div>
      )}

      {/* Modal Détails */}
      <Modal
        title={
          <Space>
            <WarningOutlined style={{ color: '#f5222d' }} />
            <span>Détails de l'alerte</span>
            {selectedAlert && (
              <Tag color={getRiskLevel(selectedAlert.risk_score).color}>
                {getRiskLevel(selectedAlert.risk_score).text}
              </Tag>
            )}
          </Space>
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setModalVisible(false)}>Fermer</Button>,
          selectedAlert?.risk_score > 60 && (
            <Button key="block" type="primary" danger icon={<LockOutlined />}>
              Bloquer la transaction
            </Button>
          )
        ]}
      >
        {selectedAlert && (
          <div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Transaction ID" span={2}>
                <span style={{ fontFamily: 'monospace' }}>{selectedAlert.transaction_id}</span>
              </Descriptions.Item>
              <Descriptions.Item label="Montant">
                <Text strong style={{ color: '#3f8600' }}>{formatAmount(selectedAlert.amount)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Score de risque">
                <Progress 
                  percent={safeNumber(selectedAlert.risk_score)} 
                  size="small" 
                  status={safeNumber(selectedAlert.risk_score) > 70 ? 'exception' : 'active'}
                  strokeColor={getRiskColor(selectedAlert.risk_score)}
                  style={{ width: 120 }}
                />
              </Descriptions.Item>
              <Descriptions.Item label="Niveau">
                <Tag color={getRiskLevel(selectedAlert.risk_score).color}>
                  {getRiskLevel(selectedAlert.risk_score).text}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Modèle détecteur">
                <Tag color="purple" icon={<RobotOutlined />}>
                  {selectedAlert.detection_model || 'Ensemble IA'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Date" span={2}>
                {new Date(selectedAlert.timestamp).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="Raison" span={2}>
                {selectedAlert.reason || 'Comportement anormal détecté'}
              </Descriptions.Item>
              <Descriptions.Item label="Indicateurs" span={2}>
                <Space wrap>
                  <Tag color="red">Montant inhabituel</Tag>
                  <Tag color="orange">Localisation suspecte</Tag>
                  <Tag color="gold">Nouveau bénéficiaire</Tag>
                  {selectedAlert.risk_score > 70 && <Tag color="red">Double dépense potentielle</Tag>}
                </Space>
              </Descriptions.Item>
            </Descriptions>
            
            <Divider />
            <Alert
              message="Recommandation IA"
              description={
                selectedAlert.risk_score > 80 
                  ? "Cette transaction présente un risque de fraude très élevé. Blocage immédiat recommandé suivi d'une investigation approfondie."
                  : selectedAlert.risk_score > 60
                  ? "Cette transaction présente un risque de fraude significatif. Une vérification supplémentaire est recommandée."
                  : "Cette transaction présente un risque modéré. Une surveillance renforcée est conseillée."
              }
              type={selectedAlert.risk_score > 60 ? 'error' : 'warning'}
              showIcon
            />
          </div>
        )}
      </Modal>
    </motion.div>
  );
};

export default FraudDetection;