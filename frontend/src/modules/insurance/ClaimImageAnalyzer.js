// src/modules/insurance/ClaimImageAnalyzer.js
// YOLO + CNN real-time claim damage analyzer
import React, { useState, useCallback, useRef } from 'react';
import {
  Card, Upload, Button, Progress, Tag, Spin, Row, Col,
  Statistic, Alert, Divider, Space, Badge, Tooltip, Table,
  Typography, Steps, Result
} from 'antd';
import {
  InboxOutlined, RobotOutlined, EyeOutlined, ThunderboltOutlined,
  SafetyOutlined, DollarOutlined, WarningOutlined, CheckCircleOutlined,
  CameraOutlined, ScanOutlined, BarChartOutlined, ReloadOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

const { Dragger } = Upload;
const { Title, Text } = Typography;
const { Step } = Steps;



const SEVERITY_CONFIG = {
  critical: { color: '#f5222d', bg: '#fff1f0', label: 'Critique', icon: '🔴' },
  high:     { color: '#fa8c16', bg: '#fff7e6', label: 'Élevé',    icon: '🟠' },
  medium:   { color: '#faad14', bg: '#fffbe6', label: 'Moyen',    icon: '🟡' },
  low:      { color: '#52c41a', bg: '#f6ffed', label: 'Faible',   icon: '🟢' },
};

const CLAIM_TYPES = [
  { value: 'auto',         label: '🚗 Accident Auto' },
  { value: 'habitation',   label: '🏠 Sinistre Habitation' },
  { value: 'fire',         label: '🔥 Incendie' },
  { value: 'flood',        label: '🌊 Inondation' },
  { value: 'catastrophe',  label: '⛈️ Catastrophe naturelle' },
];

const ClaimImageAnalyzer = () => {
  const [claimType, setClaimType]         = useState('auto');
  const [analyzing, setAnalyzing]         = useState(false);
  const [step, setStep]                   = useState(0);
  const [result, setResult]               = useState(null);
  const [previewUrl, setPreviewUrl]       = useState(null);
  const [error, setError]                 = useState(null);
  const [multiFiles, setMultiFiles]       = useState([]);
  const [batchResults, setBatchResults]   = useState(null);
  const fileRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    setError(null);
    setResult(null);
    setBatchResults(null);
    setStep(1);

    // Preview
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    setAnalyzing(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('claim_type', claimType);

      setStep(2);
      const res = await api.post('/claims/analyze/image', form, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000,
      });
      setStep(3);
      setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'analyse YOLO+CNN');
      setStep(0);
    } finally {
      setAnalyzing(false);
    }
    return false; // prevent antd auto-upload
  }, [claimType]);

  const resetAll = () => {
    setResult(null);
    setError(null);
    setPreviewUrl(null);
    setStep(0);
    setBatchResults(null);
  };

  const severityConf = result
    ? SEVERITY_CONFIG[result.damage_summary?.severity] || SEVERITY_CONFIG.medium
    : null;

  const detectionColumns = [
    {
      title: 'Objet détecté',
      dataIndex: 'label',
      render: (l) => <Tag color="blue">{l}</Tag>,
    },
    {
      title: 'Confiance',
      dataIndex: 'confidence',
      render: (c) => (
        <Progress
          percent={Math.round(c * 100)}
          size="small"
          strokeColor={c > 0.7 ? '#52c41a' : c > 0.4 ? '#faad14' : '#f5222d'}
          style={{ minWidth: 120 }}
        />
      ),
    },
    {
      title: 'Position',
      dataIndex: 'bbox',
      render: (b) => b ? <Text code style={{ fontSize: 11 }}>{b.x1},{b.y1} → {b.x2},{b.y2}</Text> : '-',
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: 24 }}
    >
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #0f0c29, #302b63, #24243e)',
        padding: '24px 32px',
        borderRadius: 16,
        marginBottom: 24,
        color: 'white',
      }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="large">
              <div style={{
                width: 60, height: 60,
                background: 'linear-gradient(135deg, #6a11cb, #2575fc)',
                borderRadius: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <ScanOutlined style={{ fontSize: 30, color: 'white' }} />
              </div>
              <div>
                <Title level={3} style={{ margin: 0, color: 'white' }}>
                  Analyse IA des Sinistres
                </Title>
                <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
                  YOLOv8 Object Detection + ResNet50 CNN Damage Classification
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Badge status="processing" text={<span style={{ color: 'white' }}>YOLO Actif</span>} />
              <Badge status="processing" text={<span style={{ color: 'white' }}>CNN Actif</span>} />
            </Space>
          </Col>
        </Row>
      </div>

      {/* Claim type selector */}
      <Card style={{ marginBottom: 24, borderRadius: 12 }}>
        <Text strong>Type de sinistre :</Text>
        <div style={{ display: 'flex', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
          {CLAIM_TYPES.map(ct => (
            <Button
              key={ct.value}
              type={claimType === ct.value ? 'primary' : 'default'}
              onClick={() => setClaimType(ct.value)}
              style={{ borderRadius: 8 }}
            >
              {ct.label}
            </Button>
          ))}
        </div>
      </Card>

      {/* Pipeline steps */}
      <Card style={{ marginBottom: 24, borderRadius: 12 }}>
        <Steps current={step} size="small">
          <Step title="Upload" icon={<CameraOutlined />} />
          <Step title="Prétraitement" icon={<ScanOutlined />} />
          <Step title="YOLO + CNN" icon={<RobotOutlined />} />
          <Step title="Résultats" icon={<BarChartOutlined />} />
        </Steps>
      </Card>

      <Row gutter={[24, 24]}>
        {/* Upload zone */}
        <Col xs={24} lg={result ? 10 : 24}>
          <Card
            style={{ borderRadius: 12, minHeight: 300 }}
            title={<Space><InboxOutlined /> Zone d'upload</Space>}
            extra={result && <Button icon={<ReloadOutlined />} onClick={resetAll}>Nouvelle analyse</Button>}
          >
            {!analyzing && !result ? (
              <Dragger
                beforeUpload={handleFile}
                accept="image/*"
                showUploadList={false}
                style={{ borderRadius: 12, background: 'rgba(114,46,209,0.03)', borderColor: '#722ed1' }}
              >
                <p style={{ fontSize: 48, margin: '16px 0' }}>🔍</p>
                <p style={{ fontSize: 16, fontWeight: 600, color: '#722ed1' }}>
                  Glissez une photo du sinistre ici
                </p>
                <p style={{ color: '#888' }}>
                  Support: JPG, PNG, WebP — YOLO v8 + CNN ResNet50
                </p>
              </Dragger>
            ) : (
              <div style={{ textAlign: 'center' }}>
                {previewUrl && (
                  <img
                    src={previewUrl}
                    alt="sinistre"
                    style={{ maxWidth: '100%', maxHeight: 280, borderRadius: 8, objectFit: 'contain' }}
                  />
                )}
                {analyzing && (
                  <div style={{ marginTop: 16 }}>
                    <Spin size="large" />
                    <p style={{ color: '#722ed1', marginTop: 12, fontWeight: 600 }}>
                      Analyse YOLO + CNN en cours…
                    </p>
                  </div>
                )}
              </div>
            )}
          </Card>
        </Col>

        {/* Results panel */}
        <AnimatePresence>
          {result && (
            <Col xs={24} lg={14}>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
              >
                {/* Damage summary */}
                <Card
                  style={{
                    borderRadius: 12,
                    marginBottom: 16,
                    borderLeft: `4px solid ${severityConf.color}`,
                    background: severityConf.bg,
                  }}
                  title={
                    <Space>
                      <span style={{ fontSize: 22 }}>{severityConf.icon}</span>
                      <span style={{ color: severityConf.color, fontWeight: 700 }}>
                        Sévérité: {severityConf.label}
                      </span>
                    </Space>
                  }
                >
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic
                        title="Objets détectés"
                        value={result.yolo_analysis?.total_objects}
                        prefix={<EyeOutlined />}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Objets endommagés"
                        value={result.damage_summary?.damage_objects}
                        prefix={<WarningOutlined />}
                        valueStyle={{ color: severityConf.color }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic
                        title="Score fraude"
                        value={result.damage_summary?.fraud_risk_score}
                        suffix="%"
                        prefix={<SafetyOutlined />}
                        valueStyle={{ color: result.damage_summary?.fraud_risk_score > 60 ? '#f5222d' : '#52c41a' }}
                      />
                    </Col>
                  </Row>

                  <Divider />

                  <Row gutter={16}>
                    <Col span={12}>
                      <Text strong>Type de dommage: </Text>
                      <Tag color="purple">{result.cnn_analysis?.top_damage_class?.replace('_', ' ')}</Tag>
                    </Col>
                    <Col span={12}>
                      <Text strong>Confiance CNN: </Text>
                      <Progress
                        percent={Math.round((result.cnn_analysis?.confidence || 0) * 100)}
                        size="small"
                        strokeColor="#722ed1"
                      />
                    </Col>
                  </Row>

                  {/* Fraud alert */}
                  {result.damage_summary?.fraud_risk_score > 30 && (
                    <Alert
                      style={{ marginTop: 12 }}
                      message={`Risque fraude: ${result.damage_summary?.fraud_level}`}
                      type={result.damage_summary?.fraud_risk_score > 60 ? 'error' : 'warning'}
                      showIcon
                    />
                  )}
                </Card>

                {/* Cost estimate */}
                <Card
                  style={{ borderRadius: 12, marginBottom: 16 }}
                  title={<Space><DollarOutlined /> Estimation des coûts</Space>}
                >
                  <Row gutter={16}>
                    <Col span={8}>
                      <Statistic
                        title="Estimation"
                        value={result.cost_estimate?.estimated_amount}
                        suffix="€"
                        valueStyle={{ color: '#722ed1', fontWeight: 700 }}
                      />
                    </Col>
                    <Col span={8}>
                      <Statistic title="Minimum" value={result.cost_estimate?.min_amount} suffix="€" />
                    </Col>
                    <Col span={8}>
                      <Statistic title="Maximum" value={result.cost_estimate?.max_amount} suffix="€" />
                    </Col>
                  </Row>
                </Card>

                {/* YOLO detections */}
                {result.yolo_analysis?.detections?.length > 0 && (
                  <Card
                    style={{ borderRadius: 12, marginBottom: 16 }}
                    title={<Space><ThunderboltOutlined style={{ color: '#722ed1' }} /> Détections YOLO</Space>}
                    size="small"
                  >
                    <Table
                      dataSource={result.yolo_analysis.detections}
                      columns={detectionColumns}
                      rowKey={(r, i) => i}
                      pagination={{ pageSize: 5, size: 'small' }}
                      size="small"
                    />
                  </Card>
                )}

                {/* CNN damage scores */}
                <Card
                  style={{ borderRadius: 12, marginBottom: 16 }}
                  title={<Space><BarChartOutlined /> Scores CNN par catégorie</Space>}
                  size="small"
                >
                  {Object.entries(result.cnn_analysis?.damage_scores || {}).map(([cat, score]) => (
                    <div key={cat} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>{cat.replace(/_/g, ' ')}</Text>
                        <Text strong>{Math.round(score * 100)}%</Text>
                      </div>
                      <Progress
                        percent={Math.round(score * 100)}
                        size="small"
                        strokeColor="#722ed1"
                        showInfo={false}
                      />
                    </div>
                  ))}
                </Card>

                {/* Recommendations */}
                <Card style={{ borderRadius: 12 }} title="Recommandations IA" size="small">
                  {result.recommendations?.map((rec, i) => (
                    <Alert key={i} message={rec} type="info" showIcon style={{ marginBottom: 8 }} />
                  ))}
                </Card>
              </motion.div>
            </Col>
          )}
        </AnimatePresence>
      </Row>

      {error && (
        <Alert
          message="Erreur d'analyse"
          description={error}
          type="error"
          showIcon
          style={{ marginTop: 16, borderRadius: 8 }}
        />
      )}
    </motion.div>
  );
};

export default ClaimImageAnalyzer;
