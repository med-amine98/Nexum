import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Statistic, Badge, Space, Typography, Tag, Spin, Progress } from 'antd';
import { 
  ThunderboltOutlined, DatabaseOutlined, 
  SafetyCertificateOutlined, GlobalOutlined,
  ApiOutlined, NodeIndexOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import api from '../../services/api';

const { Title, Text } = Typography;

// --- NŒUDS DU RÉSEAU ---
const NETWORK_NODES = [
  { id: 'kafka',     name: 'Kafka Broker',     color: '#1890ff', risk: 0.1, x: 300, y: 200, size: 60 },
  { id: 'spark',     name: 'Spark Engine',     color: '#722ed1', risk: 0.15, x: 500, y: 100, size: 55 },
  { id: 'neo4j',     name: 'Neo4j Graph DB',   color: '#52c41a', risk: 0.1, x: 700, y: 200, size: 55 },
  { id: 'gnn',       name: 'GNN Transformer',  color: '#fa8c16', risk: 0.2, x: 600, y: 350, size: 65 },
  { id: 'grover',    name: 'Grover Orchestrator', color: '#00d1ff', risk: 0.05, x: 400, y: 350, size: 70 },
  { id: 'bot_bank',  name: 'Bot Discord Bank', color: '#eb2f96', risk: 0.05, x: 200, y: 100, size: 50 },
  { id: 'bot_insur', name: 'Bot Discord Insur', color: '#eb2f96', risk: 0.05, x: 800, y: 100, size: 50 },
  { id: 'bot_ent',   name: 'Bot Discord Ent',   color: '#eb2f96', risk: 0.05, x: 500, y: 50, size: 50 },
  { id: 'blockchain',name: 'Blockchain Ledger',color: '#13c2c2', risk: 0.05, x: 500, y: 480, size: 50 },
  { id: 'suspect1',  name: 'IP Suspecte',      color: '#f5222d', risk: 0.95, x: 150, y: 350, size: 45 },
  { id: 'suspect2',  name: 'Shell Account',    color: '#f5222d', risk: 0.88, x: 850, y: 350, size: 45 },
];

const EDGES = [
  { source: 'kafka', target: 'spark' },
  { source: 'kafka', target: 'grover' },
  { source: 'kafka', target: 'bot_bank' },
  { source: 'kafka', target: 'bot_insur' },
  { source: 'kafka', target: 'bot_ent' },
  { source: 'spark', target: 'neo4j' },
  { source: 'neo4j', target: 'gnn' },
  { source: 'gnn', target: 'grover' },
  { source: 'grover', target: 'blockchain' },
  { source: 'suspect1', target: 'kafka' },
  { source: 'suspect2', target: 'neo4j' },
  { source: 'suspect1', target: 'suspect2' },
];const Advanced3DTwin = () => {
  const [tick, setTick] = useState(0);
  const [stats, setStats] = useState({ total_transactions: 84231, total_frauds: 47 });
  const [nodesData, setNodesData] = useState(NETWORK_NODES);
  const [edgesData, setEdgesData] = useState(EDGES);
  const [prediction, setPrediction] = useState({ score: 0.05, label: 'Stable' });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('/pipeline/stats');
        if (res.data) {
          setStats(res.data);
          // Simulate prediction based on fraud rate
          const fraudRate = res.data.detection_rate || 0;
          if (fraudRate > 5) {
            setPrediction({ score: 0.85, label: 'Alerte Haute' });
          } else if (fraudRate > 2) {
            setPrediction({ score: 0.45, label: 'Vigilance' });
          } else {
            setPrediction({ score: 0.05, label: 'Stable' });
          }
        }
      } catch (err) {
        console.error('Failed to fetch pipeline stats', err);
      }
    };
    
    const fetchGraph = async () => {
      try {
        const res = await api.get('/pipeline/graph');
        if (res.data && res.data.nodes && res.data.edges) {
          // Enrich nodes with prediction status
          const enrichedNodes = res.data.nodes.map(node => {
            if (node.id === 'gnn' || node.id === 'grover') {
              return { ...node, status: 'optimizing' };
            }
            return { ...node, status: 'active' };
          });
          setNodesData(enrichedNodes);
          setEdgesData(res.data.edges);
        }
      } catch (err) {
        console.error('Failed to fetch pipeline graph', err);
      }
    };

    fetchStats();
    fetchGraph();
    const statsInterval = setInterval(fetchStats, 5000);
    const graphInterval = setInterval(fetchGraph, 10000);
    const tickInterval = setInterval(() => setTick(t => t + 1), 2000);
    
    return () => {
      clearInterval(statsInterval);
      clearInterval(graphInterval);
      clearInterval(tickInterval);
    };
  }, []);

  const option = {
    backgroundColor: '#050510',
    tooltip: {
      formatter: (params) => {
        if (params.dataType === 'node') {
          const node = nodesData.find(n => n.id === params.data.id);
          return `<b>${params.data.name}</b><br/>Risque: ${(node?.risk * 100 || 0).toFixed(0)}%<br/>Status: ${node?.status || 'Online'}`;
        }
        return '';
      }
    },
    series: [{
      type: 'graph',
      layout: 'none',
      symbolSize: (val, params) => params.data.size,
      roam: true,
      label: {
        show: true,
        color: '#fff',
        fontSize: 11,
        position: 'bottom'
      },
      edgeSymbol: ['none', 'arrow'],
      edgeSymbolSize: [4, 8],
      lineStyle: {
        opacity: 0.5,
        width: 1.5,
        curveness: 0.2
      },
      emphasis: {
        focus: 'adjacency',
        lineStyle: { width: 3 }
      },
      data: nodesData.map(node => ({
        id: node.id,
        name: node.name,
        size: node.size,
        x: node.x,
        y: node.y,
        itemStyle: {
          color: node.color,
          shadowBlur: node.risk > 0.8 ? 30 + Math.sin(tick) * 10 : 15,
          shadowColor: node.color,
          borderColor: node.risk > 0.8 ? '#f5222d' : 'rgba(255,255,255,0.2)',
          borderWidth: node.risk > 0.8 ? 2 : 1,
        },
        label: { 
          color: node.risk > 0.8 ? '#f5222d' : '#fff',
          formatter: node.status === 'optimizing' ? '{b}\n(AI Core)' : '{b}'
        }
      })),
      edges: edgesData.map(e => ({
        source: e.source,
        target: e.target,
        lineStyle: {
          color: (e.source === 'suspect1' || e.source === 'suspect2' || e.target === 'suspect2')
            ? '#f5222d' : '#1890ff',
          width: (e.source === 'suspect1' || e.source === 'suspect2') ? 2 : 1,
          type: (e.source === 'suspect1' || e.source === 'suspect2') ? 'dashed' : 'solid',
        }
      }))
    }]
  };

  return (
    <div style={{ background: '#050510', minHeight: '100vh', color: 'white', padding: 0, position: 'relative' }}>
      {/* HUD Header */}
      <div style={{
        position: 'absolute', top: 24, left: 24, zIndex: 10,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)',
        padding: '16px 24px', borderRadius: 16,
        border: '1px solid rgba(0, 209, 255, 0.2)'
      }}>
        <Title level={3} style={{ color: 'white', margin: 0, letterSpacing: 2, textTransform: 'uppercase' }}>
          <NodeIndexOutlined style={{ color: '#00d1ff', marginRight: 12 }} />
          Digital Twin Infrastructure
        </Title>
        <Text style={{ color: '#00d1ff', fontSize: 12, letterSpacing: 1 }}>
          Blockchain & AI Monitoring Hub — V3.5
        </Text>
      </div>

      {/* Prediction HUD Top Right */}
      <div style={{
        position: 'absolute', top: 24, right: 24, zIndex: 10,
        display: 'flex', flexDirection: 'column', gap: 12
      }}>
        <div style={{ 
          background: 'rgba(0,0,0,0.8)', 
          backdropFilter: 'blur(12px)', 
          padding: '15px 20px', 
          borderRadius: 12, 
          border: `1px solid ${prediction.score > 0.5 ? '#f5222d' : '#00d1ff'}` 
        }}>
          <Space direction="vertical" size={2}>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, textTransform: 'uppercase' }}>Prédiction IA 1H</Text>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Title level={4} style={{ color: prediction.score > 0.5 ? '#f5222d' : '#00d1ff', margin: 0 }}>
                {prediction.label}
              </Title>
              <Progress 
                type="circle" 
                percent={Math.round(prediction.score * 100)} 
                width={30} 
                strokeColor={prediction.score > 0.5 ? '#f5222d' : '#00d1ff'}
                format={() => ''}
              />
            </div>
          </Space>
        </div>

        <div style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }}>
          <Space direction="vertical" size={6}>
            <Badge status="processing" text={<Text style={{ color: 'white', fontSize: 11 }}>Kafka: <b>Active</b></Text>} />
            <Badge status="processing" text={<Text style={{ color: 'white', fontSize: 11 }}>Grover: <b>Running</b></Text>} />
            <Badge status="processing" text={<Text style={{ color: 'white', fontSize: 11 }}>Neo4j: <b>Connected</b></Text>} />
            <Badge status="warning" text={<Text style={{ color: 'white', fontSize: 11 }}>Blockchain: <b>Sync</b></Text>} />
          </Space>
        </div>
      </div>

      {/* Main Graph */}
      <div style={{ height: '70vh', width: '100%' }}>
        <ReactECharts option={option} style={{ height: '100%', width: '100%' }} />
      </div>

      {/* Bottom Traceability Bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
        background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(20px)',
        borderTop: '2px solid rgba(0, 209, 255, 0.3)',
        padding: '20px 40px'
      }}>
        <Row gutter={32} align="middle">
          <Col span={4}>
            <Title level={5} style={{ color: '#00d1ff', margin: 0 }}>TRAÇABILITÉ</Title>
            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Blockchain Ledger Hash</Text>
          </Col>
          <Col span={20}>
            <div style={{ display: 'flex', gap: 20, overflowX: 'auto', paddingBottom: 10 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  padding: '8px 12px', 
                  borderRadius: 8, 
                  border: '1px solid rgba(255,255,255,0.1)',
                  minWidth: 150
                }}>
                  <div style={{ color: '#52c41a', fontSize: 10 }}>BLOCK #{(28410 + i).toLocaleString()}</div>
                  <div style={{ color: 'white', fontSize: 12, fontFamily: 'monospace' }}>0x{Math.random().toString(16).substring(2, 10)}...</div>
                </div>
              ))}
            </div>
          </Col>
        </Row>
      </div>

      <style>{`
        .echarts-for-react canvas { cursor: grab; }
        ::-webkit-scrollbar { height: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(0, 209, 255, 0.3); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default Advanced3DTwin;
