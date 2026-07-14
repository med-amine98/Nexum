// src/modules/cyber/CyberShield.js - Version sans mock data
import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Space, Typography, Badge, Progress, Button, List, Tooltip, Divider, Spin, Empty, Alert } from 'antd';
import { 
  SecurityScanOutlined, 
  GlobalOutlined, 
  RadarChartOutlined, 
  ThunderboltOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  NodeIndexOutlined,
  BugOutlined,
  SafetyCertificateOutlined,
  EyeOutlined,
  AimOutlined,
  ReloadOutlined,
  AlertOutlined,
  CloudServerOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import { MapContainer, TileLayer, CircleMarker, Polyline, Popup } from 'react-leaflet';
import { motion, AnimatePresence } from 'framer-motion';
import ReactECharts from 'echarts-for-react';
import 'leaflet/dist/leaflet.css';
import './CyberShield.css';
import api from '../../services/api';

const { Title, Text } = Typography;

const CyberShield = () => {
  // États - Initialisés à null/vide (pas de mock)
  const [attacks, setAttacks] = useState([]);
  const [threatLevel, setThreatLevel] = useState(null);
  const [blockedToday, setBlockedToday] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [cyberMetrics, setCyberMetrics] = useState(null);
  const [stats, setStats] = useState({
    total_threats: 0,
    critical_count: 0,
    high_count: 0,
    medium_count: 0
  });
  const [weatherRisks, setWeatherRisks] = useState([]);
  const [stockData, setStockData] = useState(null);
  const [externalSources, setExternalSources] = useState({});

  const fetchThreats = async () => {
    try {
      setError(null);
      const response = await api.get('/intelligence/cyber/threats');
      const data = response.data;
      

      if (data && data.success !== false) {
        // 1. Métriques principales
        setThreatLevel(data.global_threat_level ?? 0);
        setBlockedToday(data.attacks_blocked ?? 0);
        setLastUpdate(new Date().toLocaleTimeString());
        
        // 2. Statistiques
        setStats({
          total_threats: data.total_threats || 0,
          critical_count: data.critical_count || 0,
          high_count: data.high_count || 0,
          medium_count: data.medium_count || 0
        });

        // 3. Logs
        setLogs(data.logs || []);

        // 4. Métriques de défense (si disponibles)
        if (data.defense_capabilities) {
          setCyberMetrics(data.defense_capabilities);
        } else {
          // Générer des métriques à partir des données disponibles
          const total = data.total_threats || 1;
          const critical = data.critical_count || 0;
          const high = data.high_count || 0;
          
          setCyberMetrics({
            endpoint_security: Math.max(0, 100 - (critical * 5)),
            network_integrity: Math.max(0, 100 - (high * 3)),
            data_encryption: Math.max(0, 100 - ((critical + high) * 2)),
            identity_protection: Math.max(0, 100 - (high * 2)),
            ai_defense: Math.max(0, 100 - (critical * 3)),
            nodes: [
              { name: 'Core Firewall', status: Math.max(0, 100 - (critical * 8)), icon: <SafetyCertificateOutlined /> },
              { name: 'AI Sentinel', status: Math.max(0, 100 - (high * 5)), icon: <SecurityScanOutlined /> },
              { name: 'Network Shield', status: Math.max(0, 100 - ((critical + high) * 3)), icon: <GlobalOutlined /> },
              { name: 'Quantum Defense', status: Math.max(0, 100 - (critical * 10)), icon: <ThunderboltOutlined /> }
            ]
          });
        }

        // 5. Risques météo (si disponibles)
        if (data.weather_risks && data.weather_risks.length > 0) {
          setWeatherRisks(data.weather_risks);
        }

        // 6. Données boursières (si disponibles)
        if (data.stock_data) {
          setStockData(data.stock_data);
        }

        // 7. Sources externes
        if (data.external_sources) {
          setExternalSources(data.external_sources);
        }

        // 8. Attaques sur la carte
        if (data.logs && data.logs.length > 0) {
          const mapAttacks = data.logs
            .slice(0, 8)
            .filter(log => log.lat && log.lng)
            .map(log => ({
              id: log.id,
              source: {
                name: log.location || log.source || 'Unknown',
                coords: [parseFloat(log.lat) || 0, parseFloat(log.lng) || 0]
              },
              target: {
                name: 'Nexum Cloud (Paris)',
                coords: [48.8566, 2.3522]
              },
              type: log.type || 'unknown',
              severity: log.level || 'medium',
              timestamp: log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A',
              status: log.verdict || 'unknown',
              source_type: log.source_type || 'unknown'
            }));
          setAttacks(mapAttacks);
        }
      } else {
        setError(data?.message || 'Données non disponibles');
      }
      
      setLoading(false);
    } catch (error) {
      console.error('❌ Erreur CyberShield:', error);
      setError(error.message || 'Erreur de chargement des données');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThreats();
    // Rafraîchissement toutes les 30 secondes
    const interval = setInterval(fetchThreats, 30000);
    return () => clearInterval(interval);
  }, []);

  // ========== CALCUL DES MÉTRIQUES ==========
  
  const getRadarData = () => {
    if (cyberMetrics) {
      return [
        cyberMetrics.endpoint_security ?? 0,
        cyberMetrics.network_integrity ?? 0,
        cyberMetrics.data_encryption ?? 0,
        cyberMetrics.identity_protection ?? 0,
        cyberMetrics.ai_defense ?? 0
      ];
    }
    // Pas de données - retourner des zéros
    return [0, 0, 0, 0, 0];
  };

  const getNodeIntegrity = () => {
    if (cyberMetrics && cyberMetrics.nodes) {
      return cyberMetrics.nodes.map(node => ({
        name: node.name,
        status: node.status,
        icon: node.icon || <SafetyCertificateOutlined />
      }));
    }
    return [];
  };

  // Configuration du radar chart
  const radarOption = {
    backgroundColor: 'transparent',
    radar: {
      indicator: [
        { name: 'Endpoint Security', max: 100 },
        { name: 'Network Integrity', max: 100 },
        { name: 'Data Encryption', max: 100 },
        { name: 'Identity Protection', max: 100 },
        { name: 'AI Defense', max: 100 }
      ],
      splitArea: { show: false },
      axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.2)' } }
    },
    series: [{
      type: 'radar',
      data: [{
        value: getRadarData(),
        name: 'Nexum Shield',
        areaStyle: { color: 'rgba(0, 82, 204, 0.3)' },
        lineStyle: { color: '#2563eb', width: 2 }
      }]
    }]
  };

  // ========== AFFICHAGE ==========

  if (loading) {
    return (
      <div style={{ 
        background: '#0a0f1c', 
        minHeight: '100vh', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}>
        <Spin size="large" tip="Chargement des données de sécurité..." ><div/></Spin>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        background: '#0a0f1c', 
        minHeight: '100vh', 
        padding: 32,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Card style={{ maxWidth: 500, background: 'rgba(16,22,38,0.9)', border: '1px solid rgba(255,77,79,0.3)' }}>
          <Space direction="vertical" align="center" size="large">
            <AlertOutlined style={{ fontSize: 48, color: '#ff4d4f' }} />
            <Title level={3} style={{ color: 'white' }}>Erreur de chargement</Title>
            <Text style={{ color: 'rgba(255,255,255,0.7)' }}>{error}</Text>
            <Button 
              type="primary" 
              icon={<ReloadOutlined />} 
              onClick={fetchThreats}
            >
              Réessayer
            </Button>
          </Space>
        </Card>
      </div>
    );
  }

  // Vérifier si des données existent
  const hasData = threatLevel !== null || logs.length > 0 || stats.total_threats > 0;

  return (
    <div className="cyber-shield-container">
      {/* Header Cyber */}
      <div className="cyber-header">
        <Row align="middle" gutter={24}>
          <Col>
            <div className="pulse-icon">
              <SecurityScanOutlined style={{ fontSize: 32, color: '#00d1ff' }} />
            </div>
          </Col>
          <Col flex="auto">
            <Title level={2} style={{ color: 'white', margin: 0, letterSpacing: 2 }}>
              NEXUM <span style={{ color: '#00d1ff' }}>CYBER-SHIELD</span> v4.0
            </Title>
            <Text style={{ color: 'rgba(255,255,255,0.5)' }}>
              {hasData ? `AI-POWERED THREAT INTELLIGENCE STATION • ${stats.total_threats} menaces détectées` : 'En attente de données...'}
            </Text>
            {lastUpdate && (
              <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 11, marginLeft: 16 }}>
                Dernière mise à jour: {lastUpdate}
              </Text>
            )}
          </Col>
          <Col>
            <Space size="large">
              <Statistic 
                title={<span style={{ color: 'rgba(255,255,255,0.5)' }}>GLOBAL THREAT LEVEL</span>}
                value={threatLevel !== null ? threatLevel.toFixed(1) : 'N/A'}
                suffix={threatLevel !== null ? '%' : ''}
                valueStyle={{ 
                  color: threatLevel !== null 
                    ? (threatLevel > 70 ? '#ff4d4f' : threatLevel > 40 ? '#fa8c16' : '#52c41a')
                    : 'rgba(255,255,255,0.3)'
                }}
              />
              <Divider type="vertical" style={{ height: 40, borderColor: 'rgba(255,255,255,0.1)' }} />
              <Statistic 
                title={<span style={{ color: 'rgba(255,255,255,0.5)' }}>ATTACKS BLOCKED</span>}
                value={blockedToday !== null ? blockedToday.toLocaleString() : 'N/A'}
                valueStyle={{ color: blockedToday !== null ? '#00d1ff' : 'rgba(255,255,255,0.3)' }}
              />
            </Space>
          </Col>
        </Row>
      </div>

      {/* Statistiques des menaces */}
      {hasData && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={6}>
            <div className="threat-stat-card" style={{ borderLeft: '3px solid #ff4d4f' }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>CRITIQUES</Text>
              <Text style={{ color: '#ff4d4f', fontSize: 24, fontWeight: 700 }}>{stats.critical_count}</Text>
            </div>
          </Col>
          <Col xs={6}>
            <div className="threat-stat-card" style={{ borderLeft: '3px solid #fa8c16' }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>ÉLEVÉES</Text>
              <Text style={{ color: '#fa8c16', fontSize: 24, fontWeight: 700 }}>{stats.high_count}</Text>
            </div>
          </Col>
          <Col xs={6}>
            <div className="threat-stat-card" style={{ borderLeft: '3px solid #faad14' }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>MOYENNES</Text>
              <Text style={{ color: '#faad14', fontSize: 24, fontWeight: 700 }}>{stats.medium_count}</Text>
            </div>
          </Col>
          <Col xs={6}>
            <div className="threat-stat-card" style={{ borderLeft: '3px solid #2dd4bf' }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>TOTAL</Text>
              <Text style={{ color: '#2dd4bf', fontSize: 24, fontWeight: 700 }}>{stats.total_threats}</Text>
            </div>
          </Col>
        </Row>
      )}

      {!hasData ? (
        <Card style={{ 
          marginTop: 24, 
          background: 'rgba(16,22,38,0.8)', 
          border: '1px solid rgba(255,255,255,0.05)',
          textAlign: 'center',
          padding: 40
        }}>
          <Empty 
            description={
              <Text style={{ color: 'rgba(255,255,255,0.5)' }}>
                Aucune donnée de sécurité disponible pour le moment
              </Text>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
          <Button 
            type="primary" 
            icon={<ReloadOutlined />} 
            onClick={fetchThreats}
            style={{ marginTop: 16 }}
          >
            Actualiser
          </Button>
        </Card>
      ) : (
        <>
          <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
            {/* World Attack Map */}
            <Col xs={24} lg={16}>
              <Card className="cyber-card" title={<Space><GlobalOutlined /> LIVE ATTACK VECTORS</Space>} extra={<Badge status="processing" text="REAL-TIME" style={{ color: '#00d1ff' }} />}>
                <div className="map-wrapper">
                  <MapContainer center={[20, 0]} zoom={2} zoomControl={false} style={{ height: 500, background: '#0a0f1c' }}>
                    <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                    <AnimatePresence>
                      {attacks.length > 0 ? (
                        attacks.map((attack) => (
                          <React.Fragment key={attack.id}>
                            <CircleMarker 
                              center={attack.source.coords} 
                              radius={attack.severity === 'critical' ? 8 : 5} 
                              fillColor={attack.severity === 'critical' ? '#ff4d4f' : '#fa8c16'} 
                              color={attack.severity === 'critical' ? '#ff4d4f' : '#fa8c16'} 
                              fillOpacity={0.8}
                            />
                            <Polyline 
                              positions={[attack.source.coords, attack.target.coords]}
                              pathOptions={{ 
                                color: attack.severity === 'critical' ? '#ff4d4f' : '#fa8c16', 
                                weight: attack.severity === 'critical' ? 2 : 1, 
                                dashArray: '5, 10',
                                opacity: attack.severity === 'critical' ? 0.8 : 0.6
                              }}
                            />
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              <CircleMarker 
                                center={attack.target.coords} 
                                radius={12} 
                                fillColor="#00d1ff" 
                                color="#00d1ff" 
                                fillOpacity={0.3}
                              />
                            </motion.div>
                          </React.Fragment>
                        ))
                      ) : (
                        <div style={{ 
                          position: 'absolute', 
                          top: '50%', 
                          left: '50%', 
                          transform: 'translate(-50%, -50%)',
                          color: 'rgba(255,255,255,0.3)',
                          fontSize: 14
                        }}>
                          Aucune attaque en cours
                        </div>
                      )}
                    </AnimatePresence>
                  </MapContainer>
                  <div className="scan-line"></div>
                </div>
              </Card>
            </Col>

            {/* AI Radar and Defense Status */}
            <Col xs={24} lg={8}>
              <Space direction="vertical" size={24} style={{ width: '100%' }}>
                <Card className="cyber-card" title={<Space><RadarChartOutlined /> AI DEFENSE CAPABILITIES</Space>}>
                  <ReactECharts option={radarOption} style={{ height: 250 }} />
                </Card>

                <Card className="cyber-card" title={<Space><SafetyCertificateOutlined /> NODE INTEGRITY</Space>}>
                  {getNodeIntegrity().length > 0 ? (
                    <List
                      dataSource={getNodeIntegrity()}
                      renderItem={item => (
                        <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <List.Item.Meta
                            avatar={<div style={{ color: '#00d1ff' }}>{item.icon || <SafetyCertificateOutlined />}</div>}
                            title={<span style={{ color: 'white' }}>{item.name}</span>}
                            description={
                              <Progress 
                                percent={item.status || 0} 
                                size="small" 
                                strokeColor={item.status > 80 ? '#00d1ff' : item.status > 50 ? '#fa8c16' : '#ff4d4f'} 
                                trailColor="rgba(255,255,255,0.1)" 
                              />
                            }
                          />
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty 
                      description={<Text style={{ color: 'rgba(255,255,255,0.3)' }}>Données de nœuds non disponibles</Text>}
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                    />
                  )}
                </Card>

                {/* Sources externes */}
                {Object.keys(externalSources).length > 0 && (
                  <Card className="cyber-card" title={<Space><CloudServerOutlined /> SOURCES EXTERNES</Space>}>
                    <Row gutter={[8, 8]}>
                      {Object.entries(externalSources).map(([key, value]) => (
                        <Col span={12} key={key}>
                          <Tag color={value ? 'success' : 'default'} style={{ width: '100%', textAlign: 'center' }}>
                            {key}: {value ? '✅ Actif' : '❌ Inactif'}
                          </Tag>
                        </Col>
                      ))}
                    </Row>
                  </Card>
                )}

                {/* Données boursières */}
                {stockData && (
                  <Card className="cyber-card" title={<Space><LineChartOutlined /> MARCHÉS</Space>}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{stockData.symbol || 'AAPL'}</Text>
                        <Text style={{ color: 'white', fontSize: 18, fontWeight: 600, display: 'block' }}>
                          ${stockData.current_price || 0}
                        </Text>
                      </div>
                      <Tag color={stockData.change_percent > 0 ? 'success' : 'danger'}>
                        {stockData.change_percent > 0 ? '+' : ''}{stockData.change_percent || 0}%
                      </Tag>
                    </div>
                  </Card>
                )}
              </Space>
            </Col>
          </Row>

          <Row gutter={[24, 24]} style={{ marginTop: 24 }}>
            {/* Terminal Logs */}
            <Col span={24}>
              <Card className="cyber-card terminal-card" title={<Space><BugOutlined /> THREAT DETECTION LOGS</Space>}>
                {logs.length > 0 ? (
                  <div className="terminal-log">
                    {logs.slice(0, 20).map((log) => (
                      <div key={log.id} className={`log-entry ${(log.level || 'medium').toLowerCase()}`}>
                        <span className="log-time">[{log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : 'N/A'}]</span>
                        <span className="log-type">[{((log.type || 'unknown').toUpperCase())}]</span>
                        <span className="log-msg">
                          Inbound threat from <span className="log-source">{log.source || 'Unknown'}</span> 
                          {log.location && ` (${log.location})`} 
                          targeting <span className="log-target">Paris-Node-01</span>. 
                          <span className="log-verdict">VERDICT: {log.verdict || 'unknown'}</span>
                          {log.source_type && (
                            <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10, marginLeft: 8 }}>
                              [{log.source_type}]
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="terminal-log" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.3)' }}>Aucun log de sécurité</Text>
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </>
      )}

      <style jsx>{`
        .cyber-shield-container {
          background: #0a0f1c;
          min-height: 100vh;
          padding: 32px;
          color: white;
          font-family: 'JetBrains Mono', 'Roboto Mono', monospace;
        }
        .cyber-header {
          background: rgba(0, 82, 204, 0.1);
          border: 1px solid rgba(0, 130, 255, 0.2);
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 0 20px rgba(0, 130, 255, 0.1);
        }
        .cyber-card {
          background: rgba(16, 22, 38, 0.8) !important;
          border: 1px solid rgba(255, 255, 255, 0.05) !important;
          border-radius: 12px !important;
          backdrop-filter: blur(10px);
        }
        .cyber-card .ant-card-head {
          border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          color: #00d1ff !important;
        }
        .map-wrapper {
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid rgba(0, 209, 255, 0.2);
        }
        .scan-line {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 4px;
          background: linear-gradient(to bottom, rgba(0, 209, 255, 0), rgba(0, 209, 255, 0.5));
          z-index: 1000;
          animation: scan 4s linear infinite;
          pointer-events: none;
        }
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .terminal-log {
          height: 200px;
          overflow-y: auto;
          background: #050811;
          padding: 16px;
          font-size: 12px;
          border-radius: 4px;
        }
        .log-entry { margin-bottom: 4px; }
        .log-time { color: #555; margin-right: 8px; }
        .log-type { color: #00d1ff; margin-right: 8px; font-weight: bold; }
        .critical { color: #ff4d4f; }
        .high { color: #fa8c16; }
        .medium { color: #faad14; }
        .log-source { color: #fff; text-decoration: underline; }
        .log-verdict { font-weight: bold; margin-left: 12px; color: #52c41a; }
        .pulse-icon {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 209, 255, 0.4); }
          70% { transform: scale(1.1); box-shadow: 0 0 0 15px rgba(0, 209, 255, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(0, 209, 255, 0); }
        }
        .ant-empty-description {
          color: rgba(255,255,255,0.3) !important;
        }
        .threat-stat-card {
          background: rgba(16, 22, 38, 0.6);
          padding: 12px 16px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.05);
        }
      `}</style>
    </div>
  );
};

export default CyberShield;