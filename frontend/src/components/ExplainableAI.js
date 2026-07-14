// src/components/ExplainableAI.js - Version corrigée
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Tabs, Space, Tag, Progress, Button, Spin, Alert, Divider, Tooltip, Empty, Typography } from 'antd';
import { 
  BulbOutlined, InfoCircleOutlined, ShareAltOutlined, 
  ThunderboltFilled, WarningOutlined, CheckCircleOutlined,
  ReloadOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import api from '../services/api';

const { Text } = Typography;

const ExplainableAI = ({ transactionId, visible, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState(null);
  const [activeTab, setActiveTab] = useState('shap');
  const [error, setError] = useState(null);

  const fetchExplanation = async () => {
    if (!transactionId) return;
    
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/xai/explain/${transactionId}`);
      
      if (response.data?.status === 'success') {
        setExplanation(response.data.data);
      } else {
        setError('Erreur lors de la génération de l\'explication');
      }
    } catch (err) {
      setError(err.message || 'Erreur de connexion au service XAI');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible && transactionId) {
      fetchExplanation();
    }
  }, [visible, transactionId]);

  // ============================================
  // COMPOSANT SHAP
  // ============================================
  const SHAPView = ({ shap }) => {
    if (!shap) return null;
    
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <ThunderboltFilled style={{ color: '#10b981' }} />
            <Text style={{ color: '#94a3b8', fontWeight: 600 }}>Importance des features</Text>
            <Tag color="gold">SHAP</Tag>
          </Space>
        </div>
        
        <div style={{ marginBottom: 12 }}>
          {shap.features?.map((feature, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text style={{ color: '#cbd5e1', fontSize: 13 }}>{feature.name}</Text>
                <Space>
                  <Text style={{ color: '#94a3b8', fontSize: 12, fontWeight: 600 }}>
                    {(feature.shap * 100).toFixed(0)}%
                  </Text>
                  {feature.shap > 0.6 && <WarningOutlined style={{ color: '#ef4444', fontSize: 12 }} />}
                  {feature.shap > 0.3 && feature.shap <= 0.6 && <InfoCircleOutlined style={{ color: '#10b981', fontSize: 12 }} />}
                  {feature.shap <= 0.3 && <CheckCircleOutlined style={{ color: '#10b981', fontSize: 12 }} />}
                </Space>
              </div>
              <div style={{
                width: '100%',
                height: 8,
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  width: `${feature.shap * 100}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, 
                    ${feature.shap > 0.6 ? '#ef4444' : feature.shap > 0.3 ? '#10b981' : '#10b981'}, 
                    ${feature.shap > 0.6 ? '#f87171' : feature.shap > 0.3 ? '#fbbf24' : '#34d399'})`,
                  borderRadius: 4,
                  transition: 'width 0.6s ease'
                }} />
              </div>
            </div>
          ))}
        </div>
        
        <Divider style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <Text style={{ color: '#64748b', fontSize: 11 }}>Prédiction</Text>
            <Tag color={shap.prediction === 'FRAUD' ? 'error' : shap.prediction === 'SUSPECT' ? 'warning' : 'success'}>
              {shap.prediction}
            </Tag>
          </div>
          <div>
            <Text style={{ color: '#64748b', fontSize: 11 }}>Confiance</Text>
            <Text style={{ color: '#10b981', fontSize: 18, fontWeight: 700 }}>
              {(shap.confidence * 100).toFixed(0)}%
            </Text>
          </div>
          <div>
            <Text style={{ color: '#64748b', fontSize: 11 }}>Méthode</Text>
            <Tag color="blue">SHAP</Tag>
          </div>
        </div>
      </div>
    );
  };

  // ============================================
  // COMPOSANT GNNExplainer
  // ============================================
  const GNNView = ({ gnn }) => {
    if (!gnn) return null;
    
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <Space>
            <ShareAltOutlined style={{ color: '#475569' }} />
            <Text style={{ color: '#94a3b8', fontWeight: 600 }}>Analyse du graphe</Text>
            <Tag color="purple">GNNExplainer</Tag>
          </Space>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
          {gnn.nodes?.map((node, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: 8,
              border: `1px solid ${node.color}30`
            }}>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: node.color,
                flexShrink: 0
              }} />
              <div style={{ flex: 1 }}>
                <Text style={{ color: '#cbd5e1', fontSize: 12, fontWeight: 500 }}>{node.label}</Text>
                <Tooltip title={node.details}>
                  <Text style={{ color: '#64748b', fontSize: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {node.details}
                  </Text>
                </Tooltip>
              </div>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `2px solid ${node.color}40`
              }}>
                <Text style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700 }}>
                  {(node.importance * 100).toFixed(0)}%
                </Text>
              </div>
            </div>
          ))}
        </div>
        
        <Divider style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
        
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div>
            <Text style={{ color: '#64748b', fontSize: 11 }}>Prédiction</Text>
            <Tag color={gnn.prediction === 'FRAUD' ? 'error' : gnn.prediction === 'SUSPECT' ? 'warning' : 'success'}>
              {gnn.prediction}
            </Tag>
          </div>
          <div>
            <Text style={{ color: '#64748b', fontSize: 11 }}>Confiance</Text>
            <Text style={{ color: '#10b981', fontSize: 18, fontWeight: 700 }}>
              {(gnn.confidence * 100).toFixed(0)}%
            </Text>
          </div>
          <div>
            <Text style={{ color: '#64748b', fontSize: 11 }}>Nœuds</Text>
            <Text style={{ color: '#94a3b8' }}>{gnn.graph_metrics?.nodes_count}</Text>
          </div>
          <div>
            <Text style={{ color: '#64748b', fontSize: 11 }}>Arêtes</Text>
            <Text style={{ color: '#94a3b8' }}>{gnn.graph_metrics?.edges_count}</Text>
          </div>
        </div>
        
        <Divider style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
        
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
          <Text style={{ color: '#64748b', fontSize: 10 }}>🔗 Relations clés: </Text>
          {gnn.edges?.filter(e => e.weight > 0.7).map((e, i) => (
            <Tag key={i} color="purple" style={{ fontSize: 9, borderRadius: 10 }}>
              {e.source}→{e.target} ({(e.weight * 100).toFixed(0)}%)
            </Tag>
          ))}
        </div>
      </div>
    );
  };

  // ============================================
  // COMPOSANT RÉSUMÉ
  // ============================================
  const SummaryView = ({ summary }) => {
    if (!summary) return null;
    
    return (
      <div style={{ 
        background: 'rgba(255,255,255,0.05)', 
        borderRadius: 12, 
        padding: 16,
        marginBottom: 16,
        border: '1px solid rgba(255,255,255,0.05)'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
          <div>
            <Text style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Verdict</Text>
            <Tag color={summary.final_verdict === 'FRAUD' ? 'error' : summary.final_verdict === 'SUSPECT' ? 'warning' : 'success'} style={{ fontSize: 13, padding: '2px 12px' }}>
              {summary.final_verdict}
            </Tag>
          </div>
          <div>
            <Text style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Score final</Text>
            <Text style={{ color: '#10b981', fontSize: 20, fontWeight: 700 }}>
              {(summary.final_score * 100).toFixed(0)}%
            </Text>
          </div>
          <div>
            <Text style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Niveau de risque</Text>
            <Tag color={summary.risk_level === 'high' ? 'error' : summary.risk_level === 'medium' ? 'warning' : 'success'}>
              {summary.risk_level?.toUpperCase()}
            </Tag>
          </div>
          <div>
            <Text style={{ color: '#64748b', fontSize: 10, textTransform: 'uppercase' }}>Montant</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>
              {summary.amount?.toLocaleString()} €
            </Text>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#94a3b8' }}>Génération de l'explication...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="Erreur"
        description={error}
        type="error"
        showIcon
        style={{ borderRadius: 12 }}
      />
    );
  }

  if (!explanation) {
    return (
      <div style={{ textAlign: 'center', padding: 50, color: '#64748b' }}>
        <BulbOutlined style={{ fontSize: 48, marginBottom: 16 }} />
        <div style={{ fontSize: 16, fontWeight: 600 }}>Aucune donnée disponible</div>
        <div style={{ fontSize: 13, marginTop: 4 }}>Sélectionnez une transaction pour l'analyser</div>
      </div>
    );
  }

  return (
    <div>
      <SummaryView summary={explanation.summary} />
      
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab}
        style={{ marginTop: 8 }}
        items={[
          {
            key: 'shap',
            label: <span><ThunderboltFilled /> SHAP</span>,
            children: <SHAPView shap={explanation.shap} />
          },
          {
            key: 'gnn',
            label: <span><ShareAltOutlined /> GNNExplainer</span>,
            children: <GNNView gnn={explanation.gnn} />
          }
        ]}
      />
      
      <Divider style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#64748b', fontSize: 11 }}>
          🧠 Analyse par Intelligence Artificielle Quantique
        </Text>
        <Button 
          size="small" 
          icon={<ReloadOutlined />} 
          onClick={fetchExplanation}
          style={{ color: '#94a3b8' }}
        >
          Rafraîchir
        </Button>
      </div>
    </div>
  );
};

export default ExplainableAI;