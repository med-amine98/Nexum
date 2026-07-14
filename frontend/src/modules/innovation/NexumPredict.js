// src/modules/predict/NexumPredict.js - Version sans mock data
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Input, Button, Typography, Space, Spin, Tag, Badge, List, message, Statistic, Empty, Alert } from 'antd';
import { 
  RocketOutlined, 
  SearchOutlined, 
  RobotOutlined, 
  LineChartOutlined,
  BulbOutlined,
  NodeIndexOutlined,
  CloudUploadOutlined,
  DownloadOutlined,
  AreaChartOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  WarningOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import { useTranslation } from 'react-i18next';
import './NexumPredict.css';
import api from '../../services/api';

const { Title, Text } = Typography;
const { Search } = Input;

const NexumPredict = () => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [thinkingSteps, setThinkingSteps] = useState([]);
  const [historicalData, setHistoricalData] = useState([]);
  const [error, setError] = useState(null);
  const [lastPredictions, setLastPredictions] = useState([]);

  // Récupérer l'historique des prédictions
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await api.get('/intelligence/predict/history');
        if (response.data && response.data.predictions) {
          setLastPredictions(response.data.predictions.slice(0, 5));
        }
      } catch (error) {
      }
    };
    fetchHistory();
  }, []);

  const handlePredict = async (value) => {
    if (!value || value.trim().length < 3) {
      message.warning('Veuillez saisir une requête plus précise (minimum 3 caractères)');
      return;
    }

    setLoading(true);
    setResult(null);
    setThinkingSteps([]);
    setError(null);
    
    try {
      // Appel à l'API réelle
      const response = await api.post('/intelligence/predict/query', { query: value });
      const data = response.data;


      if (data && data.success !== false) {
        // Afficher progressivement les étapes de réflexion
        const steps = data.thinking_steps || [
          'Analyse sémantique de la requête...',
          'Récupération des données historiques...',
          'Calcul de la tendance et des corrélations...',
          'Génération de la prédiction IA...',
          'Persistance en base de données'
        ];

        for (let i = 0; i < steps.length; i++) {
          setThinkingSteps(prev => [...prev, steps[i]]);
          await new Promise(r => setTimeout(r, 500));
        }

        // Construire le résultat à partir des données réelles
        const chartData = data.data || [];
        const labels = chartData.map(d => d.month || d.label || '');
        const values = chartData.map(d => d.value || 0);
        
        // Identifier la prédiction (dernier point avec predicted: true)
        const predictedIndex = chartData.findIndex(d => d.predicted === true);
        const predictedValue = predictedIndex !== -1 ? chartData[predictedIndex].value : null;

        setResult({
          summary: data.insight || 'Prédiction générée avec succès',
          data: values,
          labels: labels,
          confidence: data.confidence ? data.confidence * 100 : 85,
          predictedValue: predictedValue,
          historicalPoints: data.historical_data_points || 0,
          metric: data.metric || 'revenue',
          predictionId: data.prediction_id || null,
          stockContext: data.stock_context || null,
          realData: data.real_data || false
        });

        // Mettre à jour l'historique
        if (data.prediction_id) {
          setLastPredictions(prev => [
            {
              id: data.prediction_id,
              query: value,
              timestamp: new Date().toISOString(),
              metric: data.metric
            },
            ...prev.slice(0, 4)
          ]);
        }
      } else {
        setError(data?.message || 'Erreur lors de la prédiction');
      }
    } catch (error) {
      console.error('❌ Erreur NexumPredict:', error);
      
      let errorMessage = 'Impossible de joindre le moteur de prédiction IA.';
      if (error.response) {
        errorMessage = error.response.data?.detail || error.response.data?.message || errorMessage;
      } else if (error.request) {
        errorMessage = 'Le serveur ne répond pas. Vérifiez votre connexion.';
      }
      
      setError(errorMessage);
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Configuration du graphique
  const chartOption = result ? {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(15,23,42,.92)',
      borderColor: 'rgba(0,209,255,.2)',
      borderWidth: 1,
      textStyle: { color: '#e2e8f0', fontSize: 12 },
      formatter: (params) => {
        const p = params[0];
        const isPredicted = p.dataIndex === result.data.length - 1 && result.predictedValue !== null;
        return `
          <div style="font-weight:600;margin-bottom:4px;">${isPredicted ? '🔮 PRÉDICTION' : '📊 DONNÉE'}</div>
          <div>${p.name}: <strong>${p.value.toFixed(1)}</strong></div>
          ${isPredicted ? `<div style="color:#00d1ff;font-size:11px;margin-top:4px;">Confiance: ${result.confidence.toFixed(0)}%</div>` : ''}
        `;
      }
    },
    legend: {
      data: ['Données réelles', 'Prédiction'],
      textStyle: { color: 'rgba(255,255,255,0.6)', fontSize: 12 },
      top: 10
    },
    grid: { left: 50, right: 20, top: 50, bottom: 30 },
    xAxis: {
      type: 'category',
      data: result.labels,
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } },
      axisLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
    },
    yAxis: {
      type: 'value',
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
      axisLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
    },
    series: [
      {
        name: 'Données réelles',
        data: result.data.map((val, idx) => {
          const isPredicted = idx === result.data.length - 1 && result.predictedValue !== null;
          return isPredicted ? null : val;
        }),
        type: 'line',
        smooth: true,
        lineStyle: { color: '#00d1ff', width: 3 },
        itemStyle: { color: '#00d1ff' },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(0, 209, 255, 0.3)' },
              { offset: 1, color: 'rgba(0, 209, 255, 0)' }
            ]
          }
        }
      },
      {
        name: 'Prédiction',
        data: result.data.map((val, idx) => {
          const isPredicted = idx === result.data.length - 1 && result.predictedValue !== null;
          return isPredicted ? val : null;
        }),
        type: 'line',
        smooth: true,
        lineStyle: { color: '#10b981', width: 3, type: 'dashed' },
        itemStyle: { color: '#10b981' },
        symbol: 'diamond',
        symbolSize: 12,
        markPoint: {
          data: [
            {
              type: 'max',
              name: 'Prédiction',
              symbol: 'diamond',
              symbolSize: 50,
              label: {
                formatter: (p) => `${p.value.toFixed(0)}`,
                color: '#10b981',
                fontSize: 14,
                fontWeight: 700
              }
            }
          ]
        }
      }
    ]
  } : {};

  // ========== AFFICHAGE ==========

  return (
    <div className="nexum-predict-container">
      <div className="predict-header">
        <Space size="large">
          <BulbOutlined style={{ fontSize: 40, color: '#00d1ff' }} />
          <div>
            <Title level={2} style={{ color: 'white', margin: 0 }}>
              NEXUM PREDICT <Tag color="cyan">BETA</Tag>
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.6)' }}>
              {result ? '🔮 Prédiction IA basée sur vos données réelles' : 'Generative Business Intelligence & Predictive Analytics'}
            </Text>
            {result && result.realData && (
              <Tag color="green" style={{ marginLeft: 12 }}>✓ Données réelles</Tag>
            )}
          </div>
        </Space>
      </div>

      <div className="predict-search-box">
        <Search
          placeholder="Ex: Prédit mon chiffre d'affaires pour les 6 prochains mois..."
          allowClear
          enterButton={
            <Button 
              type="primary" 
              icon={<RocketOutlined />}
              loading={loading}
            >
              ANALYZER
            </Button>
          }
          size="large"
          onSearch={handlePredict}
          onChange={(e) => setQuery(e.target.value)}
          className="futuristic-search"
          value={query}
        />
        <div className="search-suggestions">
          <Space wrap>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>Suggestions:</Text>
            <Tag ghost style={{ cursor: 'pointer' }} onClick={() => handlePredict("Prévision des ventes pour les 6 prochains mois")}>
              📊 Ventes 6 mois
            </Tag>
            <Tag ghost style={{ cursor: 'pointer' }} onClick={() => handlePredict("Analyse du risque client")}>
              ⚠️ Risque client
            </Tag>
            <Tag ghost style={{ cursor: 'pointer' }} onClick={() => handlePredict("Prédiction du chiffre d'affaires 2026")}>
              💰 CA 2026
            </Tag>
            <Tag ghost style={{ cursor: 'pointer' }} onClick={() => handlePredict("Tendance des commandes")}>
              📦 Commandes
            </Tag>
          </Space>
        </div>
      </div>

      <AnimatePresence>
        {loading && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="thinking-container"
          >
            <Card className="thinking-card">
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <Spin size="large" indicator={<RobotOutlined spin style={{ fontSize: 40 }} />} />
                  <div style={{ marginTop: 16 }}>
                    <Text strong style={{ color: 'white', fontSize: 18 }}>Nexum AI analyse vos données...</Text>
                  </div>
                </div>
                <List
                  dataSource={thinkingSteps}
                  renderItem={(step, index) => (
                    <List.Item style={{ border: 'none', padding: '4px 0' }}>
                      <Space>
                        <Badge 
                          status={index === thinkingSteps.length - 1 ? 'processing' : 'success'} 
                        />
                        <Text style={{ color: index === thinkingSteps.length - 1 ? '#00d1ff' : 'rgba(255,255,255,0.7)' }}>
                          {step}
                        </Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </Space>
            </Card>
          </motion.div>
        )}

        {error && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="error-container"
          >
            <Card style={{ 
              maxWidth: 600, 
              margin: '0 auto',
              background: 'rgba(16,22,38,0.9)',
              border: '1px solid rgba(255,77,79,0.3)',
              borderRadius: 12
            }}>
              <Space direction="vertical" align="center" size="large" style={{ width: '100%' }}>
                <WarningOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
                <Title level={4} style={{ color: 'white' }}>Erreur de prédiction</Title>
                <Text style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center' }}>{error}</Text>
                <Button 
                  type="primary" 
                  icon={<ReloadOutlined />} 
                  onClick={() => handlePredict(query)}
                >
                  Réessayer
                </Button>
              </Space>
            </Card>
          </motion.div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="result-container"
          >
            <Row gutter={[24, 24]}>
              <Col xs={24} lg={16}>
                <Card className="result-card chart-card" title={<Space><AreaChartOutlined /> TRAJECTOIRE PRÉDICTIVE</Space>}>
                  <ReactECharts option={chartOption} style={{ height: 400 }} />
                  {result.predictionId && (
                    <div style={{ marginTop: 12, textAlign: 'right' }}>
                      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11 }}>
                        ID Prédiction: {result.predictionId} • {result.historicalPoints} points historiques
                      </Text>
                    </div>
                  )}
                </Card>
              </Col>
              <Col xs={24} lg={8}>
                <Space direction="vertical" size={24} style={{ width: '100%' }}>
                  <Card className="result-card" title={<Space><BulbOutlined /> RÉSUMÉ IA</Space>}>
                    <Title level={4} style={{ color: 'white' }}>
                      {result.predictedValue ? `Prédiction: ${result.predictedValue.toFixed(0)}` : 'Analyse terminée'}
                    </Title>
                    <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>
                      {result.summary}
                    </Text>
                    <div style={{ marginTop: 16 }}>
                      <Statistic 
                        title="Score de confiance" 
                        value={result.confidence} 
                        suffix="%" 
                        valueStyle={{ color: result.confidence > 80 ? '#52c41a' : result.confidence > 50 ? '#faad14' : '#ff4d4f' }} 
                      />
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <Tag color="blue">Métrique: {result.metric}</Tag>
                      {result.realData && <Tag color="green">✓ Données réelles</Tag>}
                    </div>
                    {result.stockContext && (
                      <div style={{ marginTop: 12, padding: 8, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>
                          📊 Contexte boursier: {result.stockContext.symbol} @ ${result.stockContext.price} ({result.stockContext.change > 0 ? '+' : ''}{result.stockContext.change}%)
                        </Text>
                      </div>
                    )}
                  </Card>
                  
                  <Card className="result-card" title={<Space><CheckCircleOutlined /> RECOMMANDATION</Space>}>
                    <Text style={{ color: '#52c41a', fontSize: 14 }}>
                      {result.recommendation || 'Analyse terminée. Consultez les données pour plus d\'informations.'}
                    </Text>
                    <div style={{ marginTop: 16 }}>
                      <Button icon={<DownloadOutlined />} block ghost>
                        Exporter le rapport PDF
                      </Button>
                    </div>
                  </Card>

                  {/* Historique des prédictions récentes */}
                  {lastPredictions.length > 0 && (
                    <Card className="result-card" title={<Space><InfoCircleOutlined /> PRÉDICTIONS RÉCENTES</Space>}>
                      <List
                        size="small"
                        dataSource={lastPredictions}
                        renderItem={(item) => (
                          <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '8px 0' }}>
                            <Space direction="vertical" size={0} style={{ width: '100%' }}>
                              <Text style={{ color: 'white', fontSize: 13 }}>{item.query}</Text>
                              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                                {new Date(item.timestamp).toLocaleString()} • ID: {item.id}
                              </Text>
                            </Space>
                          </List.Item>
                        )}
                      />
                    </Card>
                  )}
                </Space>
              </Col>
            </Row>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx>{`
        .nexum-predict-container {
          background: #0a0f1c;
          min-height: 100vh;
          padding: 40px;
        }
        .predict-header { margin-bottom: 40px; }
        .predict-search-box {
          max-width: 900px;
          margin: 0 auto 40px;
        }
        .futuristic-search .ant-input-search-button {
          background: linear-gradient(135deg, #2563eb, #00d1ff) !important;
          border: none !important;
          height: 50px !important;
          padding: 0 32px !important;
        }
        .futuristic-search .ant-input {
          background: rgba(16, 22, 38, 0.9) !important;
          border: 1px solid rgba(0, 209, 255, 0.3) !important;
          color: white !important;
          height: 50px !important;
          border-radius: 8px 0 0 8px !important;
        }
        .futuristic-search .ant-input::placeholder {
          color: rgba(255,255,255,0.3);
        }
        .search-suggestions { margin-top: 12px; }
        .search-suggestions .ant-tag {
          color: rgba(255,255,255,0.4);
          border-color: rgba(255,255,255,0.1);
        }
        .search-suggestions .ant-tag:hover {
          color: #00d1ff;
          border-color: #00d1ff;
        }
        .thinking-card, .result-card {
          background: rgba(16, 22, 38, 0.8) !important;
          border: 1px solid rgba(255, 255, 255, 0.05) !important;
          border-radius: 12px !important;
          backdrop-filter: blur(10px);
        }
        .result-card .ant-card-head {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          color: #00d1ff !important;
        }
        .thinking-container { max-width: 600px; margin: 0 auto; }
        .error-container { max-width: 600px; margin: 0 auto; }
        .chart-card .ant-card-body {
          padding: 16px;
        }
      `}</style>
    </div>
  );
};

export default NexumPredict;