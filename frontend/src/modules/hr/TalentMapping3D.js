import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Typography, Spin, Badge, Space, Alert, Statistic, Row, Col, 
  Tooltip, Segmented, Modal, Button, Divider, Tag, Select, Slider,
  Progress, Empty, message
} from 'antd';
import { 
  TeamOutlined, TrophyOutlined, UserOutlined, StarOutlined, 
  BarChartOutlined, PlusCircleOutlined, MinusCircleOutlined,
  ReloadOutlined, EyeOutlined, InfoCircleOutlined, 
  RiseOutlined, FallOutlined, CrownOutlined, ExperimentOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import api from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// Service de gestion des talents
class TalentAnalyticsService {
  static async fetchTalentData(filters = {}) {
    try {
      const response = await api.get('/digital-twins/talent-mapping-3d', {
        params: {
          timestamp: Date.now(),
          department: filters.department || 'all',
          performance: filters.performance || 'all',
          ...filters
        },
        timeout: 10000
      });
      
      if (response.data && response.data.tree) {
        return this.validateAndFormatTree(response.data.tree);
      }
      throw new Error('Données invalides');
    } catch (error) {
      console.error('API Error:', error);
      throw new Error('Impossible de charger les données des talents');
    }
  }

  static validateAndFormatTree(nodes) {
    if (!nodes || !Array.isArray(nodes)) return [];
    
    const formatNode = (node) => {
      if (!node || typeof node !== 'object') return null;
      
      const formattedNode = {
        name: node.name || 'Non défini',
        value: Math.max(0, Math.min(100, node.value || 50)),
        department: node.department || 'Général',
        performance: node.performance || 'Moyen',
        growth: node.growth || 0,
        skills: node.skills || [],
        tenure: node.tenure || 0,
        status: node.status || 'Actif'
      };
      
      if (node.children && Array.isArray(node.children)) {
        formattedNode.children = node.children
          .map(child => formatNode(child))
          .filter(child => child !== null);
      }
      
      return formattedNode;
    };
    
    return nodes.map(node => formatNode(node)).filter(node => node !== null);
  }

  static calculateStats(treeData) {
    if (!treeData || treeData.length === 0) return null;
    
    const allValues = [];
    const allGrowth = [];
    let totalEmployees = 0;
    
    const traverse = (node) => {
      if (node.value) allValues.push(node.value);
      if (node.growth) allGrowth.push(node.growth);
      totalEmployees++;
      
      if (node.children) {
        node.children.forEach(child => traverse(child));
      }
    };
    
    treeData.forEach(node => traverse(node));
    
    const avgPerformance = allValues.reduce((a, b) => a + b, 0) / allValues.length;
    const avgGrowth = allGrowth.reduce((a, b) => a + b, 0) / allGrowth.length;
    const topPerformers = allValues.filter(v => v >= 80).length;
    const criticalTalents = allValues.filter(v => v < 50).length;
    
    return {
      totalEmployees,
      avgPerformance,
      avgGrowth,
      topPerformers,
      criticalTalents,
      performanceScore: Math.round(avgPerformance),
      healthScore: Math.round(70 + (avgGrowth / 2))
    };
  }
}

const TalentMapping3D = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [treeData, setTreeData] = useState([]);
  const [stats, setStats] = useState(null);
  const [viewMode, setViewMode] = useState('radial');
  const [autoRotate, setAutoRotate] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [filters, setFilters] = useState({
    department: 'all',
    performance: 'all',
    minScore: 0,
    maxScore: 100
  });
  const [chartKey, setChartKey] = useState(Date.now());

  const loadTalentData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await TalentAnalyticsService.fetchTalentData(filters);
      setTreeData(data);
      
      const calculatedStats = TalentAnalyticsService.calculateStats(data);
      setStats(calculatedStats);
      
      if (data.length === 0) {
        message.warning('Aucune donnée trouvée pour les filtres sélectionnés');
      }
    } catch (err) {
      console.error('Failed to load talent data:', err);
      setError(err.message);
      setTreeData([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadTalentData();
  }, [loadTalentData]);

  const applyFilters = () => {
    setChartKey(Date.now());
    loadTalentData();
  };

  const resetFilters = () => {
    setFilters({
      department: 'all',
      performance: 'all',
      minScore: 0,
      maxScore: 100
    });
    setChartKey(Date.now());
  };

  const getPerformanceColor = (value) => {
    if (value >= 80) return '#10b981';
    if (value >= 60) return '#3b82f6';
    if (value >= 40) return '#f59e0b';
    return '#ef4444';
  };

  const getGrowthIcon = (growth) => {
    if (growth > 5) return <RiseOutlined style={{ color: '#10b981' }} />;
    if (growth < -5) return <FallOutlined style={{ color: '#ef4444' }} />;
    return <ExperimentOutlined style={{ color: '#94a3b8' }} />;
  };

  const getOption = useMemo(() => {
    if (!treeData || treeData.length === 0) return null;

    const processTreeData = (node) => {
      return {
        name: node.name,
        value: node.value,
        department: node.department,
        performance: node.performance,
        growth: node.growth,
        skills: node.skills,
        tenure: node.tenure,
        status: node.status,
        itemStyle: {
          color: getPerformanceColor(node.value)
        },
        label: {
          show: viewMode !== 'compact',
          formatter: `${node.name}\n${node.value}%`
        },
        children: node.children ? node.children.map(child => processTreeData(child)) : undefined
      };
    };

    const formattedData = treeData.map(node => processTreeData(node));

    return {
      backgroundColor: 'transparent',
      title: {
        show: false
      },
      tooltip: {
        trigger: 'item',
        triggerOn: 'mousemove|click',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#f472b6',
        borderWidth: 1,
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: (params) => {
          if (!params.data) return '';
          const data = params.data;
          return `
            <div style="padding: 12px; min-width: 220px;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                <strong style="color: #f472b6; font-size: 14px;">${data.name}</strong>
                ${data.performance === 'Excellent' ? '<span style="color: #ffd700;">👑</span>' : ''}
              </div>
              <div style="margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span>Performance</span>
                  <strong style="color: ${getPerformanceColor(data.value)}">${data.value}%</strong>
                </div>
                <Progress percent={data.value} size="small" showInfo={false} strokeColor={getPerformanceColor(data.value)} />
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
                <div>
                  <Text style={{ fontSize: '11px', color: '#94a3b8' }}>Département</Text>
                  <div><Text style={{ fontSize: '12px', color: '#f8fafc' }}>${data.department}</Text></div>
                </div>
                <div>
                  <Text style={{ fontSize: '11px', color: '#94a3b8' }}>Croissance</Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    ${data.growth > 5 ? '↑' : data.growth < -5 ? '↓' : '→'}
                    <Text style={{ fontSize: '12px', color: data.growth > 0 ? '#10b981' : data.growth < 0 ? '#ef4444' : '#94a3b8' }}>
                      ${data.growth > 0 ? '+' : ''}${data.growth}%
                    </Text>
                  </div>
                </div>
                <div>
                  <Text style={{ fontSize: '11px', color: '#94a3b8' }}>Ancienneté</Text>
                  <div><Text style={{ fontSize: '12px', color: '#f8fafc' }}>${data.tenure} ans</Text></div>
                </div>
                <div>
                  <Text style={{ fontSize: '11px', color: '#94a3b8' }}>Compétences</Text>
                  <div><Text style={{ fontSize: '12px', color: '#f8fafc' }}>${data.skills?.length || 0}</Text></div>
                </div>
              </div>
              ${data.skills && data.skills.length > 0 ? `
                <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
                  <Text style={{ fontSize: '11px', color: '#94a3b8' }}>Compétences clés</Text>
                  <div style="display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px;">
                    ${data.skills.slice(0, 3).map(skill => `<span style="background: rgba(244, 114, 182, 0.2); padding: 2px 6px; border-radius: 4px; font-size: 10px; color: #f472b6;">${skill}</span>`).join('')}
                  </div>
                </div>
              ` : ''}
            </div>
          `;
        }
      },
      series: [{
        type: 'tree',
        name: 'Talent Tree',
        data: formattedData,
        top: '12%',
        left: '5%',
        bottom: '8%',
        right: '5%',
        symbolSize: (value) => Math.max(20, Math.min(40, value / 3)),
        symbol: 'circle',
        orient: viewMode === 'vertical' ? 'LR' : 'TB',
        layout: viewMode === 'radial' ? 'radial' : 'orthogonal',
        initialTreeDepth: 3,
        roam: true,
        expandAndCollapse: true,
        animationDuration: 500,
        animationDurationUpdate: 500,
        nodePadding: 20,
        layerPadding: 40,
        edgeShape: 'curve',
        emphasis: {
          focus: 'descendant',
          scale: true
        },
        select: {
          disabled: false,
          itemStyle: {
            borderWidth: 2,
            borderColor: '#f472b6'
          }
        },
        itemStyle: {
          borderWidth: 2,
          borderColor: '#fff',
          shadowBlur: 10,
          shadowColor: 'rgba(0,0,0,0.3)'
        },
        lineStyle: {
          color: 'rgba(244, 114, 182, 0.3)',
          width: 2,
          curveness: 0.5,
          type: 'solid'
        },
        label: {
          show: true,
          position: 'right',
          offset: [8, 0],
          fontSize: 11,
          fontWeight: '500',
          color: '#f8fafc',
          formatter: '{b}',
          rich: {
            name: {
              fontSize: 11,
              fontWeight: 'bold',
              color: '#f8fafc'
            },
            value: {
              fontSize: 10,
              color: '#94a3b8'
            }
          }
        },
        leaves: {
          label: {
            position: 'right',
            offset: [8, 0],
            formatter: '{b}'
          }
        },
        roamZoom: true,
        roamPan: true
      }],
      toolbox: {
        show: true,
        feature: {
          saveAsImage: { title: 'Exporter l\'organigramme' },
          restore: { title: 'Réinitialiser la vue' }
        },
        right: 20,
        top: 10,
        iconStyle: { borderColor: '#94a3b8' },
        emphasis: { iconStyle: { borderColor: '#f472b6' } }
      }
    };
  }, [treeData, viewMode]);

  const KPICard = ({ title, value, suffix, icon, color, tooltip, children }) => (
    <Col span={6}>
      <Tooltip title={tooltip}>
        <div style={{ 
          background: 'rgba(255,255,255,0.05)', 
          borderRadius: '12px', 
          padding: '16px',
          transition: 'all 0.3s',
          cursor: 'pointer',
          border: `1px solid ${color}20`
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text style={{ color: '#94a3b8', fontSize: '12px' }}>{title}</Text>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f8fafc', marginTop: '8px' }}>
                {value}{suffix}
              </div>
            </div>
            <div style={{ fontSize: '32px', color: color }}>{icon}</div>
          </div>
        </div>
      </Tooltip>
    </Col>
  );

  if (loading && treeData.length === 0) {
    return (
      <Card style={{ 
        height: '100%', 
        background: 'linear-gradient(145deg, #0f172a 0%, #1e293b 100%)', 
        border: 'none' 
      }}>
        <div style={{ height: 650, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', gap: 20 }}>
          <Spin size="large" />
          <Text style={{ color: '#94a3b8' }}>Chargement de l'organigramme des talents...</Text>
          <Text style={{ color: '#64748b', fontSize: '12px' }}>Synchronisation avec HR Analytics</Text>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card 
        style={{ 
          height: '100%',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.98) 100%)',
          border: '1px solid rgba(244, 114, 182, 0.2)',
          borderRadius: '20px',
          overflow: 'hidden',
          backdropFilter: 'blur(10px)'
        }}
        bodyStyle={{ padding: 0 }}
      >
        {/* Header */}
        <div style={{ 
          padding: '20px 24px',
          borderBottom: '1px solid rgba(244, 114, 182, 0.1)',
          background: 'linear-gradient(90deg, rgba(244, 114, 182, 0.05) 0%, transparent 100%)'
        }}>
          <Row justify="space-between" align="middle" gutter={16}>
            <Col flex="auto">
              <Space size="middle">
                <div style={{ 
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, #f472b6 0%, #ec4899 100%)',
                  borderRadius: '14px',
                  boxShadow: '0 4px 15px rgba(244, 114, 182, 0.3)'
                }}>
                  <TeamOutlined style={{ fontSize: 22, color: '#fff' }} />
                </div>
                <div>
                  <Title level={4} style={{ color: '#f8fafc', margin: 0, fontWeight: 700 }}>
                    Cartographie des Talents 3D
                  </Title>
                  <Space size={12} style={{ marginTop: 6 }}>
                    <Text style={{ color: '#94a3b8', fontSize: '12px' }}>
                      HR Analytics • Structure organisationnelle temps réel
                    </Text>
                    <Badge 
                      status="processing" 
                      text={
                        <Text style={{ color: '#10b981', fontSize: '11px' }}>
                          Données temps réel
                        </Text>
                      } 
                    />
                  </Space>
                </div>
              </Space>
            </Col>
            
            <Col>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={loadTalentData}
                disabled={loading}
              >
                Actualiser
              </Button>
            </Col>
          </Row>
          
          {error && (
            <Alert
              message="Erreur de chargement"
              description={error}
              type="error"
              showIcon
              closable
              style={{ marginTop: 16 }}
              onClose={() => setError(null)}
            />
          )}
        </div>

        {/* KPI Dashboard */}
        {stats && (
          <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
            <Row gutter={16}>
              <KPICard 
                title="Effectif total" 
                value={stats.totalEmployees} 
                suffix=""
                icon={<TeamOutlined />}
                color="#f472b6"
                tooltip="Nombre total d'employés dans l'organigramme"
              />
              <KPICard 
                title="Performance moyenne" 
                value={stats.performanceScore} 
                suffix="%"
                icon={<TrophyOutlined />}
                color="#10b981"
                tooltip="Score de performance moyen"
              />
              <KPICard 
                title="Talents d'élite" 
                value={stats.topPerformers} 
                suffix=""
                icon={<CrownOutlined />}
                color="#ffd700"
                tooltip="Employés avec performance > 80%"
              />
              <KPICard 
                title="Croissance moyenne" 
                value={stats.avgGrowth > 0 ? `+${stats.avgGrowth.toFixed(1)}` : stats.avgGrowth.toFixed(1)} 
                suffix="%"
                icon={stats.avgGrowth > 0 ? <RiseOutlined /> : <FallOutlined />}
                color={stats.avgGrowth > 0 ? "#10b981" : "#ef4444"}
                tooltip="Taux de croissance annuel moyen"
              />
            </Row>
          </div>
        )}

        {/* Filters & Controls */}
        <div style={{ 
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}>
          <Space size={12} wrap>
            <Text style={{ color: '#94a3b8', fontSize: '12px' }}>Filtres:</Text>
            
            <Select
              placeholder="Département"
              style={{ width: 140 }}
              value={filters.department}
              onChange={(value) => setFilters({ ...filters, department: value })}
              size="small"
            >
              <Option value="all">Tous départements</Option>
              <Option value="IT">IT</Option>
              <Option value="Marketing">Marketing</Option>
              <Option value="Sales">Sales</Option>
              <Option value="RH">RH</Option>
            </Select>
            
            <Select
              placeholder="Performance"
              style={{ width: 130 }}
              value={filters.performance}
              onChange={(value) => setFilters({ ...filters, performance: value })}
              size="small"
            >
              <Option value="all">Tous niveaux</Option>
              <Option value="high">Excellent (&gt;80%)</Option>
              <Option value="medium">Moyen (60-80%)</Option>
              <Option value="low">À améliorer (&lt;60%)</Option>
            </Select>
            
            <Button 
              type="primary" 
              size="small"
              onClick={applyFilters}
              loading={loading}
            >
              Appliquer
            </Button>
            <Button size="small" onClick={resetFilters}>
              Réinitialiser
            </Button>
          </Space>
          
          <Space size={12}>
            <Tooltip title="Mode d'affichage">
              <Segmented
                size="small"
                options={[
                  { label: 'Radial', value: 'radial' },
                  { label: 'Arborescence', value: 'vertical' }
                ]}
                value={viewMode}
                onChange={(value) => setViewMode(value)}
              />
            </Tooltip>
            
            <Tooltip title="Rotation automatique">
              <Segmented
                size="small"
                options={[
                  { label: 'Auto', value: true },
                  { label: 'Fixer', value: false }
                ]}
                value={autoRotate}
                onChange={setAutoRotate}
              />
            </Tooltip>
            
            <Button 
              size="small" 
              icon={<InfoCircleOutlined />}
              onClick={() => {
                setSelectedNode(null);
                setShowDetails(true);
              }}
            >
              Légende
            </Button>
          </Space>
        </div>

        {/* 3D Tree Visualization */}
        <div style={{ 
          height: 550, 
          width: '100%', 
          position: 'relative',
          background: 'radial-gradient(circle at center, #020617 0%, #0f172a 100%)'
        }}>
          {treeData.length === 0 && !loading && (
            <div style={{ 
              height: '100%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 16
            }}>
              <Empty 
                description={
                  <Text style={{ color: '#64748b' }}>
                    Aucune donnée disponible
                  </Text>
                }
              />
              <Text style={{ color: '#94a3b8', fontSize: '12px' }}>
                Vérifiez vos filtres ou rechargez les données
              </Text>
            </div>
          )}
          
          {treeData.length > 0 && getOption && (
            <ReactECharts 
              key={chartKey}
              option={getOption} 
              style={{ height: '100%', width: '100%' }} 
              opts={{ renderer: 'canvas' }}
              notMerge={false}
              lazyUpdate={true}
              onEvents={{
                click: (params) => {
                  if (params.data) {
                    setSelectedNode(params.data);
                    setShowDetails(true);
                  }
                }
              }}
            />
          )}
          
          {/* Instructions overlay */}
          <div style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            background: 'rgba(15, 23, 42, 0.9)',
            backdropFilter: 'blur(8px)',
            padding: '6px 12px',
            borderRadius: '20px',
            border: '1px solid rgba(244, 114, 182, 0.3)',
            fontSize: '10px',
            color: '#94a3b8',
            pointerEvents: 'none'
          }}>
            🖱️ Click sur un nœud = détails • Scroll = zoom • Drag = déplacer
          </div>
        </div>

        {/* Footer Stats */}
        {stats && (
          <div style={{ 
            padding: '12px 24px',
            borderTop: '1px solid rgba(255,255,255,0.05)',
            background: 'rgba(0,0,0,0.2)'
          }}>
            <Row justify="space-between" align="middle">
              <Col>
                <Space size={24}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#10b981' }} />
                    <Text style={{ color: '#94a3b8', fontSize: '11px' }}>Excellent (&gt;80%)</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#3b82f6' }} />
                    <Text style={{ color: '#94a3b8', fontSize: '11px' }}>Bon (60-80%)</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#f59e0b' }} />
                    <Text style={{ color: '#94a3b8', fontSize: '11px' }}>Moyen (40-60%)</Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ef4444' }} />
                    <Text style={{ color: '#94a3b8', fontSize: '11px' }}>Critique (&lt;40%)</Text>
                  </div>
                </Space>
              </Col>
              <Col>
                <Text style={{ color: '#64748b', fontSize: '11px' }}>
                  Dernière mise à jour: {new Date().toLocaleTimeString()}
                </Text>
              </Col>
            </Row>
          </div>
        )}
      </Card>

      {/* Modal Détails */}
      <Modal
        title={
          <Space>
            <UserOutlined style={{ color: '#f472b6' }} />
            <span>Détails du talent</span>
          </Space>
        }
        open={showDetails && selectedNode !== null}
        onCancel={() => {
          setSelectedNode(null);
          setShowDetails(false);
        }}
        footer={[
          <Button key="close" onClick={() => {
            setSelectedNode(null);
            setShowDetails(false);
          }}>
            Fermer
          </Button>
        ]}
        width={500}
        styles={{ body: { padding: '24px', background: '#0f172a' } }}
      >
        {selectedNode && (
          <div>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ 
                width: 80, 
                height: 80, 
                borderRadius: '50%', 
                background: `linear-gradient(135deg, ${getPerformanceColor(selectedNode.value)}20, transparent)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto',
                border: `2px solid ${getPerformanceColor(selectedNode.value)}`
              }}>
                <UserOutlined style={{ fontSize: 40, color: getPerformanceColor(selectedNode.value) }} />
              </div>
              <Title level={4} style={{ color: '#f8fafc', marginTop: 16 }}>
                {selectedNode.name}
              </Title>
              <Tag color={selectedNode.performance === 'Excellent' ? 'gold' : 'blue'}>
                {selectedNode.performance}
              </Tag>
            </div>
            
            <Divider style={{ borderColor: '#334155' }} />
            
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Text style={{ color: '#94a3b8', fontSize: '12px' }}>Score performance</Text>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: getPerformanceColor(selectedNode.value) }}>
                  {selectedNode.value}%
                </div>
              </Col>
              <Col span={12}>
                <Text style={{ color: '#94a3b8', fontSize: '12px' }}>Département</Text>
                <div style={{ fontSize: '16px', color: '#f8fafc' }}>
                  {selectedNode.department}
                </div>
              </Col>
              <Col span={12}>
                <Text style={{ color: '#94a3b8', fontSize: '12px' }}>Croissance annuelle</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {getGrowthIcon(selectedNode.growth)}
                  <span style={{ fontSize: '16px', color: selectedNode.growth > 0 ? '#10b981' : '#ef4444' }}>
                    {selectedNode.growth > 0 ? '+' : ''}{selectedNode.growth}%
                  </span>
                </div>
              </Col>
              <Col span={12}>
                <Text style={{ color: '#94a3b8', fontSize: '12px' }}>Ancienneté</Text>
                <div style={{ fontSize: '16px', color: '#f8fafc' }}>
                  {selectedNode.tenure} ans
                </div>
              </Col>
            </Row>
            
            {selectedNode.skills && selectedNode.skills.length > 0 && (
              <>
                <Divider style={{ borderColor: '#334155' }}>
                  <Text style={{ color: '#94a3b8', fontSize: '12px' }}>Compétences</Text>
                </Divider>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {selectedNode.skills.map((skill, idx) => (
                    <Tag key={idx} color="magenta">{skill}</Tag>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Légende Modal */}
      <Modal
        title={
          <Space>
            <InfoCircleOutlined style={{ color: '#f472b6' }} />
            <span>Guide d'utilisation</span>
          </Space>
        }
        open={showDetails && selectedNode === null}
        onCancel={() => setShowDetails(false)}
        footer={[
          <Button key="close" onClick={() => setShowDetails(false)}>
            Fermer
          </Button>
        ]}
        width={600}
        styles={{ body: { padding: '24px', background: '#0f172a' } }}
      >
        <div style={{ color: '#f8fafc' }}>
          <Paragraph>
            <strong style={{ color: '#f472b6' }}>📊 Cartographie des Talents - Guide</strong>
          </Paragraph>
          
          <Divider style={{ borderColor: '#334155' }} />
          
          <div>
            <Text strong style={{ color: '#f472b6' }}>🎨 Interprétation des couleurs :</Text>
            <ul style={{ marginTop: 12, color: '#cbd5e1' }}>
              <li>🟢 <strong style={{ color: '#10b981' }}>Vert</strong> : Performance excellente (&gt;80%)</li>
              <li>🔵 <strong style={{ color: '#3b82f6' }}>Bleu</strong> : Performance bonne (60-80%)</li>
              <li>🟠 <strong style={{ color: '#f59e0b' }}>Orange</strong> : Performance moyenne (40-60%)</li>
              <li>🔴 <strong style={{ color: '#ef4444' }}>Rouge</strong> : Performance critique (&lt;40%)</li>
            </ul>
          </div>
          
          <Divider style={{ borderColor: '#334155' }} />
          
          <div>
            <Text strong style={{ color: '#f472b6' }}>🖱️ Interactions :</Text>
            <ul style={{ marginTop: 12, color: '#cbd5e1' }}>
              <li>Click sur un nœud : Voir les détails du talent</li>
              <li>Scroll souris : Zoom avant/arrière</li>
              <li>Drag : Déplacer la vue</li>
              <li>Click sur +/- : Développer/réduire les branches</li>
            </ul>
          </div>
          
          <Divider style={{ borderColor: '#334155' }} />
          
          <Alert
            message="💡 Analyse temps réel"
            description="Les données sont synchronisées en temps réel avec le système RH. Les KPI sont mis à jour automatiquement."
            type="info"
            showIcon
            style={{ background: 'rgba(244, 114, 182, 0.1)', border: 'none' }}
          />
        </div>
      </Modal>
    </>
  );
};

export default TalentMapping3D;