// OCR.js - Version corrigée avec Ant Design 5.x
import React, { useState, useEffect } from 'react';
import { 
  Card, Typography, Space, Upload, Button, message, 
  Table, Tag, Progress, Tabs, Modal, Descriptions, 
  Empty, Spin, Alert, Statistic, Row, Col, Divider,
  Timeline, Tooltip, Badge, Form, Input, Select, Switch,
  Collapse, List, Avatar, Steps, Result, InputNumber
} from 'antd';
import { 
  ScanOutlined, InboxOutlined, FileTextOutlined, 
  DownloadOutlined, DeleteOutlined, EyeOutlined,
  QrcodeOutlined, BarcodeOutlined, FilePdfOutlined,
  FileImageOutlined, FileWordOutlined, FileExcelOutlined,
  CheckCircleOutlined, ReloadOutlined, BarChartOutlined,
  HistoryOutlined, UploadOutlined, EuroCircleOutlined,
  CalendarOutlined, IdcardOutlined, BankOutlined,
  WarningOutlined, SafetyCertificateOutlined, 
  FileProtectOutlined, VerifiedOutlined, ExperimentOutlined,
  ThunderboltOutlined, RobotOutlined, SecurityScanOutlined,
  HighlightOutlined, DiffOutlined, BugOutlined,
  PlusOutlined, EditOutlined, SaveOutlined,
  CloseCircleOutlined, InfoCircleOutlined, 
  MoonOutlined, SunOutlined, GradientOutlined
} from '@ant-design/icons';
import api from '../../services/api';

const { Title, Text, Paragraph } = Typography;
const { Dragger } = Upload;
const { Option } = Select;
const { TextArea } = Input;

// ============================================
// CONFIGURATION DES ENDPOINTS - UNIFORMISÉS
// ============================================

const API_ENDPOINTS = {
  OCR_STATS: '/ocr/stats',
  OCR_DOCUMENTS: '/ocr/documents',
  OCR_EXTRACTION_RULES: '/ocr/extraction-rules',
  OCR_CORRECTIONS: '/ocr/corrections',
  OCR_UPLOAD: '/ocr/upload',
  OCR_PROCESS: '/ocr/process',
  OCR_EXTRACT: '/ocr/extract',
  OCR_DOCUMENT: '/ocr/documents',
};

// ========== FONCTIONS UTILITAIRES ==========
const safeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (!data) return [];
  if (data.items && Array.isArray(data.items)) return data.items;
  if (data.data && Array.isArray(data.data)) return data.data;
  return [];
};

const safeObject = (obj, defaultValue = {}) => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return defaultValue;
  return obj;
};

const safeNumber = (num, defaultValue = 0) => {
  if (typeof num === 'number' && !isNaN(num)) return num;
  const parsed = parseFloat(num);
  return isNaN(parsed) ? defaultValue : parsed;
};

const OCR = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  
  const [documents, setDocuments] = useState([]);
  const [extractionRules, setExtractionRules] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    processed: 0,
    pending: 0,
    failed: 0,
    avgConfidence: 0,
    fraudDetected: 0
  });
  
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(null);
  
  const [documentModalVisible, setDocumentModalVisible] = useState(false);
  const [ruleModalVisible, setRuleModalVisible] = useState(false);
  const [correctionModalVisible, setCorrectionModalVisible] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState(null);
  
  const [documentType, setDocumentType] = useState('all');
  const [activeTab, setActiveTab] = useState('documents');
  
  const [ruleForm] = Form.useForm();
  const [correctionForm] = Form.useForm();

  // ========== CHARGEMENT DES DONNÉES ==========
  const fetchDocuments = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    try {
      const response = await api.get(API_ENDPOINTS.OCR_DOCUMENTS);
      const data = safeArray(response.data);
      setDocuments(data);
    } catch (error) {
      console.error('❌ Erreur chargement documents:', error);
      setError("Impossible de charger les documents");
    } finally {
      if (showRefreshing) setRefreshing(false);
    }
  };

  const fetchExtractionRules = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.OCR_EXTRACTION_RULES);
      setExtractionRules(safeArray(response.data));
    } catch (error) {
      console.error('❌ Erreur chargement règles:', error);
    }
  };

  const fetchCorrections = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.OCR_CORRECTIONS);
      setCorrections(safeArray(response.data));
    } catch (error) {
      console.error('❌ Erreur chargement corrections:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.OCR_STATS);
      const data = response.data;
      
      const newStats = {
        total: data?.total || documents.length || 0,
        processed: data?.processed || documents.filter(d => d.status === 'completed' || d.status === 'processed').length || 0,
        pending: data?.pending || documents.filter(d => d.status === 'pending').length || 0,
        failed: data?.failed || documents.filter(d => d.status === 'failed').length || 0,
        avgConfidence: data?.avgConfidence || 0,
        fraudDetected: data?.fraudDetected || 0
      };
      
      setStats(newStats);
    } catch (error) {
      console.error('❌ Erreur chargement stats:', error);
    }
  };

  // ========== CRUD DOCUMENTS ==========
  const handleUpload = async (options) => {
    const { file, onSuccess, onError } = options;
    setUploading(true);
    setProcessing({ fileName: file.name, progress: 0, stage: 'upload' });

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType !== 'all' ? documentType : 'other');

    try {
      setProcessing(prev => ({ ...prev, progress: 30, stage: 'upload' }));
      const uploadResponse = await api.post(API_ENDPOINTS.OCR_UPLOAD, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (uploadResponse.data && uploadResponse.data.id) {
        setProcessing(prev => ({ ...prev, progress: 60, stage: 'ocr' }));
        await api.post(`${API_ENDPOINTS.OCR_PROCESS}/${uploadResponse.data.id}`, { language: 'fra+eng' });

        setProcessing(prev => ({ ...prev, progress: 90, stage: 'extraction' }));
        await api.post(`${API_ENDPOINTS.OCR_EXTRACT}/${uploadResponse.data.id}`);

        setProcessing(prev => ({ ...prev, progress: 100, stage: 'complete' }));
        message.success(`Document traité: ${file.name}`);
        await fetchDocuments(true);
        await fetchStats();
        onSuccess('ok');
      } else {
        throw new Error('ID du document non reçu');
      }
    } catch (error) {
      console.error('❌ Erreur traitement:', error);
      message.error("Erreur de traitement OCR");
      onError(error);
    } finally {
      setUploading(false);
      setProcessing(null);
    }
  };

  const handleDeleteDocument = async (id) => {
    try {
      await api.delete(`${API_ENDPOINTS.OCR_DOCUMENT}/${id}`);
      message.success('Document supprimé');
      await fetchDocuments(true);
      await fetchStats();
    } catch (error) {
      message.error('Erreur suppression');
    }
  };

  // ========== CRUD RÈGLES D'EXTRACTION ==========
  const handleAddRule = async (values) => {
    try {
      await api.post(API_ENDPOINTS.OCR_EXTRACTION_RULES, values);
      message.success('Règle d\'extraction ajoutée');
      setRuleModalVisible(false);
      ruleForm.resetFields();
      fetchExtractionRules();
    } catch (error) {
      message.error('Erreur lors de l\'ajout');
    }
  };

  const handleDeleteRule = async (ruleId) => {
    try {
      await api.delete(`${API_ENDPOINTS.OCR_EXTRACTION_RULES}/${ruleId}`);
      message.success('Règle supprimée');
      fetchExtractionRules();
    } catch (error) {
      message.error('Erreur lors de la suppression');
    }
  };

  // ========== CRUD CORRECTIONS ==========
  const handleAddCorrection = async (values) => {
    try {
      await api.post(API_ENDPOINTS.OCR_CORRECTIONS, values);
      message.success('Correction enregistrée');
      setCorrectionModalVisible(false);
      correctionForm.resetFields();
      fetchCorrections();
    } catch (error) {
      message.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleValidateCorrection = async (correctionId, validated) => {
    try {
      await api.patch(`${API_ENDPOINTS.OCR_CORRECTIONS}/${correctionId}`, { validated });
      message.success('Correction mise à jour');
      fetchCorrections();
    } catch (error) {
      message.error('Erreur');
    }
  };

  // Chargement initial
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDocuments(),
        fetchExtractionRules(),
        fetchCorrections(),
        fetchStats()
      ]);
      setLoading(false);
    };
    loadData();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  // ========== COLONNES DU TABLEAU DES DOCUMENTS ==========
  const documentColumns = [
    { 
      title: 'Document', 
      dataIndex: 'original_filename', 
      key: 'original_filename',
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text style={{ color: '#e8e8e8', fontWeight: 'bold' }}>{text || record?.name || 'Sans nom'}</Text>
          <Tag>{record.document_type || record?.type || 'Général'}</Tag>
        </Space>
      )
    },
    { 
      title: 'Date', 
      dataIndex: 'uploaded_at', 
      key: 'uploaded_at',
      render: (date) => <span style={{ color: '#a8a8a8' }}>{date ? new Date(date).toLocaleDateString() : '-'}</span>
    },
    { 
      title: 'Taille', 
      dataIndex: 'file_size', 
      key: 'file_size',
      render: (size) => <span style={{ color: '#a8a8a8' }}>{size ? `${(size / 1024).toFixed(0)} Ko` : '-'}</span>
    },
    { 
      title: 'Confiance', 
      dataIndex: 'ocr_confidence', 
      key: 'ocr_confidence',
      render: (conf) => {
        const val = safeNumber(conf);
        const color = val > 80 ? '#52c41a' : val > 50 ? '#faad14' : '#f5222d';
        return <Progress percent={val} size="small" strokeColor={color} trailColor="#2a2a2a" style={{ width: 100 }} />;
      }
    },
    { 
      title: 'Fraude', 
      dataIndex: 'fraud_level', 
      key: 'fraud_level',
      render: (level) => {
        if (!level || level === 'none') return <Tag color="green">Aucune</Tag>;
        if (level === 'critical') return <Tag color="red">Critique</Tag>;
        if (level === 'high') return <Tag color="orange">Élevée</Tag>;
        if (level === 'medium') return <Tag color="orange">Moyenne</Tag>;
        return <Tag color="blue">Faible</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Button 
            icon={<EyeOutlined />} 
            size="small" 
            onClick={() => { 
              setSelectedDocument(record); 
              setDocumentModalVisible(true); 
            }}
            style={{ 
              color: '#e8e8e8',
              background: 'rgba(24, 144, 255, 0.15)',
              border: '1px solid rgba(24, 144, 255, 0.3)'
            }}
          >
            Détails
          </Button>
          <Button 
            icon={<DeleteOutlined />} 
            size="small" 
            danger 
            onClick={() => handleDeleteDocument(record.id)} 
          />
        </Space>
      )
    }
  ];

  // ========== COLONNES DES RÈGLES D'EXTRACTION ==========
  const ruleColumns = [
    { title: 'Champ', dataIndex: 'field_name', key: 'field_name', render: (text) => <span style={{ color: '#e8e8e8' }}>{text}</span> },
    { title: 'Pattern', dataIndex: 'pattern', key: 'pattern', ellipsis: true, render: (text) => <span style={{ color: '#a8a8a8' }}>{text}</span> },
    { title: 'Position', dataIndex: 'position', key: 'position', render: (text) => <span style={{ color: '#a8a8a8' }}>{text || '-'}</span> },
    { title: 'Type document', dataIndex: 'document_type', key: 'document_type', render: (text) => <span style={{ color: '#a8a8a8' }}>{text || 'other'}</span> },
    { title: 'Regex', dataIndex: 'is_regex', key: 'is_regex', render: (val) => val ? <Tag color="blue">Oui</Tag> : <Tag>Non</Tag> },
    { title: 'Actions', key: 'actions', width: 80, render: (_, record) => (
      <Button icon={<DeleteOutlined />} size="small" danger onClick={() => handleDeleteRule(record.id)} />
    )}
  ];

  // ========== COLONNES DES CORRECTIONS ==========
  const correctionColumns = [
    { title: 'Document', dataIndex: 'document_name', key: 'document_name', render: (text) => <span style={{ color: '#e8e8e8' }}>{text?.substring(0, 30) || '-'}</span> },
    { title: 'Champ', dataIndex: 'field_name', key: 'field_name', render: (text) => <span style={{ color: '#e8e8e8' }}>{text}</span> },
    { title: 'Texte original', dataIndex: 'original_text', key: 'original_text', ellipsis: true, render: (text) => <span style={{ color: '#a8a8a8' }}>{text}</span> },
    { title: 'Texte corrigé', dataIndex: 'corrected_text', key: 'corrected_text', ellipsis: true, render: (text) => <span style={{ color: '#a8a8a8' }}>{text}</span> },
    { 
      title: 'Validé', 
      dataIndex: 'validated', 
      key: 'validated', 
      render: (val, record) => val ? 
        <Tag color="green">Validé</Tag> : 
        <Button size="small" style={{ 
          background: 'rgba(24, 144, 255, 0.15)',
          border: '1px solid rgba(24, 144, 255, 0.3)',
          color: '#1890ff'
        }} onClick={() => handleValidateCorrection(record.id, true)}>Valider</Button>
    }
  ];

  // ========== RENDU DES DONNÉES EXTRAITES ==========
  const renderExtractedData = (data) => {
    if (!data || Object.keys(data).length === 0) {
      return (
        <div style={{ 
          textAlign: 'center', 
          padding: 40,
          background: 'rgba(30, 30, 30, 0.6)',
          borderRadius: 8,
          border: '1px solid #2a2a2a'
        }}>
          <InfoCircleOutlined style={{ fontSize: 48, color: '#1890ff' }} />
          <p style={{ marginTop: 16, fontSize: 16, color: '#e8e8e8' }}>Aucune donnée extraite</p>
          <Text style={{ color: '#888' }}>
            Ajoutez des règles d'extraction pour extraire des champs spécifiques
          </Text>
          <br />
          <Button 
            type="primary" 
            size="small" 
            style={{ marginTop: 12 }}
            onClick={() => setRuleModalVisible(true)}
          >
            Ajouter une règle
          </Button>
        </div>
      );
    }

    return (
      <Descriptions bordered column={2} size="small">
        {Object.entries(data).map(([key, value]) => {
          let displayValue = value;
          if (value === null || value === undefined) {
            displayValue = 'Non trouvé';
          } else if (typeof value === 'object') {
            displayValue = JSON.stringify(value);
          } else if (typeof value === 'number') {
            displayValue = value.toLocaleString('fr-FR');
          }
          
          return (
            <Descriptions.Item 
              key={key} 
              label={
                <span style={{ color: '#e8e8e8', fontWeight: 'bold' }}>
                  {key.replace(/_/g, ' ').toUpperCase()}
                </span>
              }
            >
              <span style={{ color: '#c8c8c8' }}>
                {displayValue}
              </span>
            </Descriptions.Item>
          );
        })}
      </Descriptions>
    );
  };

  // ========== RENDU DE L'ANALYSE DE FRAUDE ==========
  const renderFraudAnalysis = (doc) => {
    const fraudScore = safeNumber(doc.fraud_score);
    const authenticityScore = safeNumber(doc.authenticity_score);
    
    let fraudStatus = 'Aucune fraude détectée';
    let fraudColor = 'green';
    let fraudIcon = <CheckCircleOutlined style={{ color: '#52c41a' }} />;
    
    if (fraudScore > 80) {
      fraudStatus = 'Fraude critique - Bloquer immédiatement';
      fraudColor = 'red';
      fraudIcon = <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
    } else if (fraudScore > 60) {
      fraudStatus = 'Fraude élevée - Investigation requise';
      fraudColor = 'orange';
      fraudIcon = <WarningOutlined style={{ color: '#fa8c16' }} />;
    } else if (fraudScore > 40) {
      fraudStatus = 'Fraude moyenne - Vérification manuelle';
      fraudColor = 'orange';
      fraudIcon = <WarningOutlined style={{ color: '#faad14' }} />;
    } else if (fraudScore > 20) {
      fraudStatus = 'Fraude faible - Surveillance recommandée';
      fraudColor = 'blue';
      fraudIcon = <InfoCircleOutlined style={{ color: '#1890ff' }} />;
    }

    return (
      <div>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 12,
          padding: 16,
          background: 'rgba(30, 30, 30, 0.6)',
          borderRadius: 8,
          border: '1px solid #2a2a2a',
          marginBottom: 16
        }}>
          {fraudIcon}
          <Text strong style={{ color: '#e8e8e8', fontSize: 16 }}>
            {fraudStatus}
          </Text>
        </div>
        
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card size="small" style={{ background: 'rgba(30, 30, 30, 0.6)', border: '1px solid #2a2a2a' }}>
              <Statistic 
                title={<span style={{ color: '#888' }}>Score de fraude</span>}
                value={fraudScore}
                suffix="%"
                valueStyle={{ color: fraudScore > 60 ? '#ff4d4f' : fraudScore > 30 ? '#faad14' : '#52c41a' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ background: 'rgba(30, 30, 30, 0.6)', border: '1px solid #2a2a2a' }}>
              <Statistic 
                title={<span style={{ color: '#888' }}>Authenticité</span>}
                value={authenticityScore}
                suffix="%"
                valueStyle={{ color: authenticityScore > 70 ? '#52c41a' : '#faad14' }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" style={{ background: 'rgba(30, 30, 30, 0.6)', border: '1px solid #2a2a2a' }}>
              <Statistic 
                title={<span style={{ color: '#888' }}>Régions manipulées</span>}
                value={doc.manipulated_regions?.length || 0}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
        </Row>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0a' }}>
        <Spin size="large" tip="Chargement des données..." />
      </div>
    );
  }

  // ========== DÉFINITION DES ONGLETS AVEC items ==========
  const tabItems = [
    {
      key: 'documents',
      label: <span style={{ color: '#e8e8e8' }}><FileTextOutlined /> Documents</span>,
      children: (
        <>
          <Dragger
            name="file"
            multiple={false}
            customRequest={handleUpload}
            showUploadList={false}
            style={{ 
              marginBottom: 24, 
              padding: 40,
              background: 'rgba(30, 30, 30, 0.4)',
              borderColor: 'rgba(255,255,255,0.08)',
              borderStyle: 'dashed',
              borderWidth: 2,
              borderRadius: 12,
              transition: 'all 0.3s ease'
            }}
            disabled={uploading}
            accept=".pdf,.jpg,.jpeg,.png,.tiff"
          >
            <p className="ant-upload-drag-icon"><InboxOutlined style={{ fontSize: 48, color: '#1890ff' }} /></p>
            <p className="ant-upload-text" style={{ color: '#e8e8e8', fontSize: 16 }}>Déposez un document pour extraction</p>
            <p className="ant-upload-hint" style={{ color: '#666', fontSize: 13 }}>Support PDF, JPEG, PNG, TIFF</p>
          </Dragger>

          {processing && (
            <Card size="small" style={{ 
              marginBottom: 24,
              background: 'rgba(30, 30, 30, 0.6)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 10
            }}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text style={{ color: '#e8e8e8' }} strong>{processing.fileName}</Text>
                <Progress 
                  percent={processing.progress} 
                  status="active" 
                  strokeColor={{ 
                    '0%': '#667eea', 
                    '100%': '#764ba2' 
                  }} 
                  trailColor="#2a2a2a" 
                />
                <Steps
                  size="small"
                  current={processing.stage === 'upload' ? 0 : processing.stage === 'ocr' ? 1 : 2}
                  items={[
                    { title: <span style={{ color: '#888' }}>Upload</span> },
                    { title: <span style={{ color: '#888' }}>OCR</span> },
                    { title: <span style={{ color: '#888' }}>Extraction</span> }
                  ]}
                />
              </Space>
            </Card>
          )}

          <Table 
            columns={documentColumns} 
            dataSource={documents} 
            rowKey="id"
            pagination={{ 
              pageSize: 10,
              style: { color: '#e8e8e8' }
            }}
            locale={{ emptyText: 'Aucun document' }}
            className="dark-table"
          />
        </>
      )
    },
    {
      key: 'rules',
      label: <span style={{ color: '#e8e8e8' }}><ExperimentOutlined /> Règles d'extraction</span>,
      children: (
        <>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setRuleModalVisible(true)}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: 10,
                height: 40
              }}
            >
              Ajouter une règle
            </Button>
          </div>
          <Table 
            columns={ruleColumns} 
            dataSource={extractionRules} 
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'Aucune règle d\'extraction' }}
            className="dark-table"
          />
        </>
      )
    },
    {
      key: 'corrections',
      label: <span style={{ color: '#e8e8e8' }}><EditOutlined /> Corrections</span>,
      children: (
        <>
          <div style={{ marginBottom: 16, textAlign: 'right' }}>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setCorrectionModalVisible(true)}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: 10,
                height: 40
              }}
            >
              Ajouter une correction
            </Button>
          </div>
          <Table 
            columns={correctionColumns} 
            dataSource={corrections} 
            rowKey="id"
            pagination={{ pageSize: 10 }}
            locale={{ emptyText: 'Aucune correction' }}
            className="dark-table"
          />
        </>
      )
    }
  ];

  // ========== ONGLETS DU MODAL DOCUMENT ==========
  const documentTabItems = selectedDocument ? [
    {
      key: 'extracted',
      label: <span style={{ color: '#e8e8e8' }}>📊 Données extraites</span>,
      children: (
        <>
          <Descriptions bordered column={2} size="small">
            <Descriptions.Item label={<span style={{ color: '#e8e8e8' }}>Statut</span>}>
              <Tag color={selectedDocument.status === 'completed' ? 'success' : 'warning'}>
                {selectedDocument.status || selectedDocument.state || 'pending'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#e8e8e8' }}>Confiance</span>}>
              <Progress 
                percent={selectedDocument.ocr_confidence || selectedDocument.confidence || 0} 
                size="small" 
                strokeColor={{ '0%': '#667eea', '100%': '#764ba2' }} 
                trailColor="#2a2a2a" 
              />
            </Descriptions.Item>
          </Descriptions>
          
          <Divider orientation="left" style={{ borderColor: '#2a2a2a', color: '#e8e8e8' }}>Champs extraits</Divider>
          {renderExtractedData(selectedDocument.extracted_data || selectedDocument.data || {})}
          
          <Divider orientation="left" style={{ borderColor: '#2a2a2a', color: '#e8e8e8' }}>Données brutes (JSON)</Divider>
          <pre style={{ 
            background: 'rgba(30, 30, 30, 0.6)', 
            padding: 16, 
            borderRadius: 8, 
            overflow: 'auto', 
            maxHeight: 150, 
            color: '#c8c8c8',
            fontSize: 12,
            border: '1px solid #2a2a2a',
            fontFamily: 'monospace'
          }}>
            {JSON.stringify(selectedDocument.extracted_data || selectedDocument.data || {}, null, 2)}
          </pre>
        </>
      )
    },
    {
      key: 'text',
      label: <span style={{ color: '#e8e8e8' }}>📝 Texte extrait</span>,
      children: (
        <div style={{ 
          background: 'rgba(30, 30, 30, 0.6)', 
          padding: 16, 
          borderRadius: 8, 
          maxHeight: 400, 
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          color: '#c8c8c8',
          fontFamily: 'monospace',
          fontSize: 14,
          border: '1px solid #2a2a2a'
        }}>
          {selectedDocument.extracted_text || selectedDocument.text || 'Aucun texte extrait'}
        </div>
      )
    },
    {
      key: 'fraud',
      label: <span style={{ color: '#e8e8e8' }}>🔒 Analyse fraude</span>,
      children: renderFraudAnalysis(selectedDocument)
    },
    {
      key: 'metadata',
      label: <span style={{ color: '#e8e8e8' }}>📋 Métadonnées</span>,
      children: (
        <Descriptions bordered column={2} size="small">
          <Descriptions.Item label={<span style={{ color: '#e8e8e8' }}>Nom original</span>}>
            <span style={{ color: '#c8c8c8' }}>{selectedDocument.original_filename || selectedDocument.name}</span>
          </Descriptions.Item>
          <Descriptions.Item label={<span style={{ color: '#e8e8e8' }}>Type</span>}>
            <span style={{ color: '#c8c8c8' }}>{selectedDocument.document_type || selectedDocument.type}</span>
          </Descriptions.Item>
          <Descriptions.Item label={<span style={{ color: '#e8e8e8' }}>Taille</span>}>
            <span style={{ color: '#c8c8c8' }}>{selectedDocument.file_size ? `${(selectedDocument.file_size / 1024).toFixed(0)} Ko` : '-'}</span>
          </Descriptions.Item>
          <Descriptions.Item label={<span style={{ color: '#e8e8e8' }}>Type MIME</span>}>
            <span style={{ color: '#c8c8c8' }}>{selectedDocument.mime_type || '-'}</span>
          </Descriptions.Item>
          <Descriptions.Item label={<span style={{ color: '#e8e8e8' }}>Date d'upload</span>}>
            <span style={{ color: '#c8c8c8' }}>{selectedDocument.uploaded_at ? new Date(selectedDocument.uploaded_at).toLocaleString() : '-'}</span>
          </Descriptions.Item>
          <Descriptions.Item label={<span style={{ color: '#e8e8e8' }}>Date de traitement</span>}>
            <span style={{ color: '#c8c8c8' }}>{selectedDocument.processed_at ? new Date(selectedDocument.processed_at).toLocaleString() : '-'}</span>
          </Descriptions.Item>
          <Descriptions.Item label={<span style={{ color: '#e8e8e8' }}>Score de fraude</span>}>
            <Tag color={selectedDocument.fraud_score > 60 ? 'red' : selectedDocument.fraud_score > 30 ? 'orange' : 'green'}>
              {selectedDocument.fraud_score || 0}%
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label={<span style={{ color: '#e8e8e8' }}>Niveau de fraude</span>}>
            <Tag color={selectedDocument.fraud_level === 'critical' ? 'red' : selectedDocument.fraud_level === 'high' ? 'orange' : 'green'}>
              {selectedDocument.fraud_level || 'none'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      )
    }
  ] : [];

  return (
    <div style={{ 
      padding: 24, 
      background: 'linear-gradient(145deg, #080808 0%, #141414 40%, #0a0a0a 100%)', 
      minHeight: '100vh' 
    }}>
      {/* En-tête avec effet de verre */}
      <div style={{ 
        background: 'linear-gradient(135deg, #0f0a2a 0%, #1a0f3a 30%, #0d0a20 60%, #1a0f3a 100%)',
        padding: '28px 36px',
        borderRadius: 16,
        marginBottom: 24,
        color: 'white',
        border: '1px solid rgba(102, 126, 234, 0.25)',
        boxShadow: '0 8px 40px rgba(102, 126, 234, 0.12), inset 0 1px 0 rgba(255,255,255,0.05)',
        backdropFilter: 'blur(10px)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: '-50%',
          right: '-10%',
          width: '400px',
          height: '400px',
          background: 'radial-gradient(circle, rgba(102, 126, 234, 0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />
        <div style={{
          position: 'absolute',
          bottom: '-30%',
          left: '20%',
          width: '300px',
          height: '300px',
          background: 'radial-gradient(circle, rgba(118, 75, 162, 0.06) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }} />
        
        <Row align="middle" justify="space-between" style={{ position: 'relative', zIndex: 1 }}>
          <Col>
            <Space size="large">
              <div style={{ 
                width: 56, 
                height: 56, 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)'
              }}>
                <ScanOutlined style={{ fontSize: 28, color: 'white' }} />
              </div>
              <div>
                <h1 style={{ 
                  margin: 0, 
                  color: 'white', 
                  textShadow: '0 2px 20px rgba(0,0,0,0.5)',
                  fontSize: 28,
                  fontWeight: 700,
                  letterSpacing: '-0.5px'
                }}>
                  OCR Intelligent
                  <span style={{ 
                    fontSize: 12, 
                    marginLeft: 12,
                    background: 'rgba(102, 126, 234, 0.3)',
                    padding: '2px 12px',
                    borderRadius: 20,
                    fontWeight: 400,
                    color: 'rgba(255,255,255,0.7)'
                  }}>
                    v2.0
                  </span>
                </h1>
                <p style={{ 
                  margin: '4px 0 0 0', 
                  opacity: 0.7, 
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 14,
                  letterSpacing: '0.3px'
                }}>
                  Extraction de texte • Règles personnalisées • Corrections
                </p>
              </div>
            </Space>
          </Col>
          <Col>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={() => {
                fetchDocuments(true);
                fetchStats();
              }} 
              loading={refreshing}
              style={{ 
                background: 'rgba(255,255,255,0.06)', 
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                backdropFilter: 'blur(10px)',
                borderRadius: 10,
                padding: '0 20px',
                height: 40
              }}
            >
              Actualiser
            </Button>
          </Col>
        </Row>
      </div>

      {/* KPIs avec effet de verre */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <Card style={{ 
            background: 'rgba(20, 20, 20, 0.92)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            borderRadius: 14,
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            cursor: 'default'
          }}
          hoverable>
            <Statistic 
              title={<span style={{ color: '#888', fontSize: 13, fontWeight: 500 }}>Documents</span>} 
              value={stats.total || 0} 
              prefix={<FileTextOutlined style={{ color: '#1890ff', fontSize: 20 }} />}
              valueStyle={{ color: '#e8e8e8', fontSize: 28, fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ 
            background: 'rgba(20, 20, 20, 0.92)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            borderRadius: 14,
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            cursor: 'default'
          }}
          hoverable>
            <Statistic 
              title={<span style={{ color: '#888', fontSize: 13, fontWeight: 500 }}>Traités</span>} 
              value={stats.processed || 0} 
              prefix={<CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />}
              valueStyle={{ color: '#e8e8e8', fontSize: 28, fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ 
            background: 'rgba(20, 20, 20, 0.92)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            borderRadius: 14,
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            cursor: 'default'
          }}
          hoverable>
            <Statistic 
              title={<span style={{ color: '#888', fontSize: 13, fontWeight: 500 }}>En attente</span>} 
              value={stats.pending || 0} 
              valueStyle={{ color: '#faad14', fontSize: 28, fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card style={{ 
            background: 'rgba(20, 20, 20, 0.92)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
            borderRadius: 14,
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            cursor: 'default'
          }}
          hoverable>
            <Statistic 
              title={<span style={{ color: '#888', fontSize: 13, fontWeight: 500 }}>Confiance moyenne</span>} 
              value={stats.avgConfidence || 0} 
              suffix="%" 
              prefix={<VerifiedOutlined style={{ color: '#52c41a', fontSize: 20 }} />}
              valueStyle={{ color: '#e8e8e8', fontSize: 28, fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Onglets principaux avec effet de verre */}
      <Card style={{ 
        marginTop: 16, 
        borderRadius: 14,
        background: 'rgba(20, 20, 20, 0.92)',
        border: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
        backdropFilter: 'blur(10px)'
      }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>

      {/* ============================================
          MODAL DÉTAILS DOCUMENT
          ============================================ */}
      <Modal
        title={<span style={{ color: '#e8e8e8', fontSize: 18, fontWeight: 600 }}>{selectedDocument?.original_filename || selectedDocument?.name || 'Détails du document'}</span>}
        open={documentModalVisible}
        onCancel={() => setDocumentModalVisible(false)}
        width={900}
        style={{ 
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(20px)',
          borderRadius: 16
        }}
        bodyStyle={{ 
          background: '#1a1a1a',
          borderRadius: '0 0 16 16',
          padding: 24
        }}
        footer={[
          <Button key="close" onClick={() => setDocumentModalVisible(false)} style={{ color: '#a8a8a8' }}>
            Fermer
          </Button>,
          <Button 
            key="process" 
            type="primary" 
            onClick={async () => {
              if (selectedDocument?.id) {
                try {
                  message.loading('Traitement en cours...', 1);
                  await api.post(`${API_ENDPOINTS.OCR_PROCESS}/${selectedDocument.id}`);
                  await api.post(`${API_ENDPOINTS.OCR_EXTRACT}/${selectedDocument.id}`);
                  message.success('Document traité avec succès');
                  await fetchDocuments(true);
                  await fetchStats();
                  const updatedDoc = documents.find(d => d.id === selectedDocument.id);
                  if (updatedDoc) setSelectedDocument(updatedDoc);
                } catch (error) {
                  console.error('❌ Erreur re-traitement:', error);
                  message.error('Erreur de traitement');
                }
              }
            }}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              borderRadius: 10
            }}
          >
            Re-traiter
          </Button>
        ]}
      >
        {selectedDocument && (
          <Tabs 
            defaultActiveKey="extracted"
            items={documentTabItems}
          />
        )}
      </Modal>

      {/* Modal Ajouter Règle */}
      <Modal
        title={<span style={{ color: '#e8e8e8', fontSize: 18, fontWeight: 600 }}>Ajouter une règle d'extraction</span>}
        open={ruleModalVisible}
        onCancel={() => { setRuleModalVisible(false); ruleForm.resetFields(); }}
        footer={null}
        width={500}
        style={{ 
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(20px)',
          borderRadius: 16
        }}
        bodyStyle={{ 
          background: '#1a1a1a',
          borderRadius: '0 0 16 16',
          padding: 24
        }}
      >
        <Form form={ruleForm} layout="vertical" onFinish={handleAddRule}>
          <Form.Item 
            name="field_name" 
            label={<span style={{ color: '#e8e8e8', fontWeight: 500 }}>Nom du champ</span>} 
            rules={[{ required: true }]}
          >
            <Input placeholder="Ex: montant_total, date_facture" style={{ 
              background: '#2a2a2a', 
              border: '1px solid #333', 
              color: '#e8e8e8',
              borderRadius: 8,
              padding: 10
            }} />
          </Form.Item>
          <Form.Item 
            name="pattern" 
            label={<span style={{ color: '#e8e8e8', fontWeight: 500 }}>Pattern</span>} 
            rules={[{ required: true }]}
          >
            <TextArea rows={3} placeholder="Ex: \d{1,3}(?:[\s.,]\d{3})*(?:[.,]\d{2})? €" style={{ 
              background: '#2a2a2a', 
              border: '1px solid #333', 
              color: '#e8e8e8',
              borderRadius: 8,
              padding: 10
            }} />
          </Form.Item>
          <Form.Item 
            name="position" 
            label={<span style={{ color: '#e8e8e8', fontWeight: 500 }}>Position dans le document</span>}
          >
            <Input placeholder="Ex: début, fin, page 1" style={{ 
              background: '#2a2a2a', 
              border: '1px solid #333', 
              color: '#e8e8e8',
              borderRadius: 8,
              padding: 10
            }} />
          </Form.Item>
          <Form.Item 
            name="document_type" 
            label={<span style={{ color: '#e8e8e8', fontWeight: 500 }}>Type de document</span>} 
            initialValue="other"
          >
            <Select style={{ 
              background: '#2a2a2a', 
              border: '1px solid #333', 
              color: '#e8e8e8',
              borderRadius: 8
            }}>
              <Option value="other">Général</Option>
              <Option value="invoice">Facture</Option>
              <Option value="contract">Contrat</Option>
              <Option value="id_card">Carte d'identité</Option>
              <Option value="receipt">Reçu</Option>
              <Option value="passport">Passeport</Option>
              <Option value="bank_statement">Relevé bancaire</Option>
            </Select>
          </Form.Item>
          <Form.Item name="is_regex" label={<span style={{ color: '#e8e8e8', fontWeight: 500 }}>Utiliser regex</span>} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: 10,
                height: 40,
                width: '100%'
              }}
            >
              Ajouter
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Ajouter Correction */}
      <Modal
        title={<span style={{ color: '#e8e8e8', fontSize: 18, fontWeight: 600 }}>Ajouter une correction</span>}
        open={correctionModalVisible}
        onCancel={() => { setCorrectionModalVisible(false); correctionForm.resetFields(); }}
        footer={null}
        width={500}
        style={{ 
          background: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(20px)',
          borderRadius: 16
        }}
        bodyStyle={{ 
          background: '#1a1a1a',
          borderRadius: '0 0 16 16',
          padding: 24
        }}
      >
        <Form form={correctionForm} layout="vertical" onFinish={handleAddCorrection}>
          <Form.Item 
            name="document_id" 
            label={<span style={{ color: '#e8e8e8', fontWeight: 500 }}>Document</span>} 
            rules={[{ required: true }]}
          >
            <Select placeholder="Sélectionner un document" showSearch style={{ 
              background: '#2a2a2a', 
              border: '1px solid #333', 
              color: '#e8e8e8',
              borderRadius: 8
            }}>
              {documents.map(doc => (
                <Option key={doc.id} value={doc.id}>{doc.original_filename || doc.name || `Document ${doc.id}`}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item 
            name="field_name" 
            label={<span style={{ color: '#e8e8e8', fontWeight: 500 }}>Champ</span>} 
            rules={[{ required: true }]}
          >
            <Input placeholder="Ex: montant_total" style={{ 
              background: '#2a2a2a', 
              border: '1px solid #333', 
              color: '#e8e8e8',
              borderRadius: 8,
              padding: 10
            }} />
          </Form.Item>
          <Form.Item 
            name="original_text" 
            label={<span style={{ color: '#e8e8e8', fontWeight: 500 }}>Texte original</span>} 
            rules={[{ required: true }]}
          >
            <TextArea rows={2} style={{ 
              background: '#2a2a2a', 
              border: '1px solid #333', 
              color: '#e8e8e8',
              borderRadius: 8,
              padding: 10
            }} />
          </Form.Item>
          <Form.Item 
            name="corrected_text" 
            label={<span style={{ color: '#e8e8e8', fontWeight: 500 }}>Texte corrigé</span>} 
            rules={[{ required: true }]}
          >
            <TextArea rows={2} style={{ 
              background: '#2a2a2a', 
              border: '1px solid #333', 
              color: '#e8e8e8',
              borderRadius: 8,
              padding: 10
            }} />
          </Form.Item>
          <Form.Item name="validated" label={<span style={{ color: '#e8e8e8', fontWeight: 500 }}>Validé</span>} valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: 10,
                height: 40,
                width: '100%'
              }}
            >
              Enregistrer
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default OCR;