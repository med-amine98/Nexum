// src/modules/shared/DocumentIntelligence.js - Version corrigée avec calcul des stats

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Card, Row, Col, Statistic, Table, Tag, Space, Button, Upload, 
  Progress, Spin, message, Modal, Descriptions, Divider, Tooltip,
  Select, DatePicker, Tabs, Input, Alert, Badge, Timeline, Steps,
  Collapse, Avatar, List, Switch, Result, Form, InputNumber,
  Tree, Popconfirm, Radio, Checkbox, Drawer, Empty, Typography
} from 'antd';
import { 
  BookOutlined, UploadOutlined, 
  FileTextOutlined, CheckCircleOutlined,
  ReloadOutlined, DownloadOutlined, FilterOutlined,
  EyeOutlined, DeleteOutlined, SearchOutlined,
  PieChartOutlined, BarChartOutlined, WarningOutlined,
  RobotOutlined, SafetyOutlined, ThunderboltOutlined,
  ScanOutlined, FileProtectOutlined, IdcardOutlined,
  FileSearchOutlined, SecurityScanOutlined,
  CloseCircleOutlined, ExclamationCircleOutlined,
  EditOutlined, SaveOutlined, PlusOutlined,
  AppstoreOutlined, FormatPainterOutlined,
  VerifiedOutlined, AuditOutlined, ApiOutlined, LayoutOutlined,
  ClockCircleOutlined, TrophyOutlined, SyncOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';

const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Dragger } = Upload;
const { Text } = Typography;

// Animations
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

const staggerContainer = {
  visible: { transition: { staggerChildren: 0.1 } }
};

// ===== FONCTIONS UTILITAIRES POUR EXTRAIRE LES DONNÉES =====
const extractDataArray = (responseData, fallback = []) => {
  if (Array.isArray(responseData)) return responseData;
  if (responseData && typeof responseData === 'object' && Array.isArray(responseData.data)) {
    return responseData.data;
  }
  if (responseData && typeof responseData === 'object' && Array.isArray(responseData.results)) {
    return responseData.results;
  }
  return fallback;
};

const extractDataObject = (responseData, fallback = {}) => {
  if (responseData && typeof responseData === 'object') {
    if (responseData.data && typeof responseData.data === 'object') {
      return responseData.data;
    }
    return responseData;
  }
  return fallback;
};

const DocumentIntelligence = () => {
  // ========== ÉTATS ==========
  const [loading, setLoading] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [stats, setStats] = useState({
    totalProcessed: 0,
    successRate: 0,
    avgTime: '0s',
    documentsToday: 0,
    fraudDetected: 0,
    fraudPreventionRate: 0,
    extractionAccuracy: 0
  });
  const [documentTypes, setDocumentTypes] = useState({
    contrats: 0,
    factures: 0,
    releves: 0,
    identite: 0
  });
  const [fraudDistribution, setFraudDistribution] = useState({
    forged_documents: 0,
    fraudulent_contracts: 0,
    identity_theft: 0,
    data_inconsistency: 0
  });
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [fraudModalVisible, setFraudModalVisible] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [correctionModalVisible, setCorrectionModalVisible] = useState(false);
  const [validationModalVisible, setValidationModalVisible] = useState(false);
  const [fraudAnalysis, setFraudAnalysis] = useState(null);
  const [autoDetect, setAutoDetect] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [activeTab, setActiveTab] = useState('documents');
  const [extractedData, setExtractedData] = useState({});
  const [correctedData, setCorrectedData] = useState({});
  const [validationNotes, setValidationNotes] = useState('');
  const [templateFields, setTemplateFields] = useState([]);

  // Formulaires
  const [templateForm] = Form.useForm();
  const [correctionForm] = Form.useForm();

  // États pour les filtres
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterFraudRisk, setFilterFraudRisk] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [searchText, setSearchText] = useState('');

  // Upload
  const [uploadLoading, setUploadLoading] = useState(false);

  // Types de documents
  const documentTypeOptions = [
    { value: 'contrat', label: 'Contrat', icon: <FileTextOutlined />, color: '#1890ff' },
    { value: 'facture', label: 'Facture', icon: <FileTextOutlined />, color: '#52c41a' },
    { value: 'releve', label: 'Relevé bancaire', icon: <FileTextOutlined />, color: '#faad14' },
    { value: 'identite', label: 'Pièce d\'identité', icon: <IdcardOutlined />, color: '#722ed1' },
    { value: 'certificat', label: 'Certificat', icon: <VerifiedOutlined />, color: '#13c2c2' }
  ];

  // ===== CHARGEMENT DES DONNÉES AVEC CALCUL DES STATS =====
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      
      if (filterType !== 'all') params.document_type = filterType;
      if (filterStatus !== 'all') params.status = filterStatus;
      if (filterFraudRisk !== 'all') params.fraud_risk = filterFraudRisk;
      if (dateRange && dateRange[0] && dateRange[1]) {
        params.date_from = dateRange[0].format('YYYY-MM-DD');
        params.date_to = dateRange[1].format('YYYY-MM-DD');
      }
      if (searchText) params.search = searchText;
      
      const [documentsRes, statsRes, fraudAlertsRes, templatesRes] = await Promise.allSettled([
        api.get('/document-intelligence/documents', { params }),
        api.get('/document-intelligence/dashboard'),
        api.get('/document-intelligence/fraud-alerts'),
        api.get('/document-intelligence/templates')
      ]);

      // ✅ Extraction des documents
      let docs = [];
      if (documentsRes.status === 'fulfilled') {
        docs = extractDataArray(documentsRes.value.data, []);
        setDocuments(docs);
      } else {
        setDocuments([]);
      }
      
      // ✅ Calcul des statistiques à partir des documents
      const totalDocs = docs.length;
      const processedDocs = docs.filter(d => 
        d.status === 'completed' || 
        d.processing_status === 'completed' ||
        d.status === 'COMPLETED' ||
        d.processing_status === 'COMPLETED'
      ).length;
      
      // ✅ Calcul de la précision d'extraction moyenne
      const accuracies = docs
        .filter(d => d.extraction_accuracy && d.extraction_accuracy > 0)
        .map(d => Number(d.extraction_accuracy));
      const avgAccuracy = accuracies.length > 0 
        ? Math.round(accuracies.reduce((a, b) => a + b, 0) / accuracies.length) 
        : 0;
      
      // ✅ Calcul du taux de réussite (documents traités avec succès)
      const successRate = totalDocs > 0 ? Math.round((processedDocs / totalDocs) * 100) : 0;
      
      // ✅ Compter les fraudes détectées (fraud_score > 50 ou fraud_risk élevé)
      const fraudCount = docs.filter(d => 
        (d.fraud_score && d.fraud_score > 50) || 
        d.fraud_risk === 'high' || 
        d.fraud_risk === 'critical' ||
        d.fraud_risk === 'HIGH' ||
        d.fraud_risk === 'CRITICAL'
      ).length;
      
      // ✅ Distribution des types de documents
      const byType = {};
      docs.forEach(doc => {
        const type = doc.document_type || doc.type || 'other';
        byType[type] = (byType[type] || 0) + 1;
      });
      
      // ✅ Distribution des fraudes
      const fraudDist = {
        forged_documents: docs.filter(d => d.fraud_type === 'forged_documents' || d.fraud_type === 'FORGED_DOCUMENTS').length,
        fraudulent_contracts: docs.filter(d => d.fraud_type === 'fraudulent_contracts' || d.fraud_type === 'FRAUDULENT_CONTRACTS').length,
        identity_theft: docs.filter(d => d.fraud_type === 'identity_theft' || d.fraud_type === 'IDENTITY_THEFT').length,
        data_inconsistency: docs.filter(d => d.fraud_type === 'data_inconsistency' || d.fraud_type === 'DATA_INCONSISTENCY').length
      };
      
      // ✅ Mise à jour des statistiques
      setStats({
        totalProcessed: totalDocs,
        successRate: successRate,
        avgTime: statsRes.status === 'fulfilled' ? (statsRes.value.data?.avg_time || '0s') : '0s',
        documentsToday: statsRes.status === 'fulfilled' ? (statsRes.value.data?.documents_today || 0) : 0,
        fraudDetected: fraudCount,
        fraudPreventionRate: statsRes.status === 'fulfilled' ? (statsRes.value.data?.fraud_prevention_rate || 99) : 99,
        extractionAccuracy: avgAccuracy
      });
      
      // ✅ Mise à jour des types de documents
      setDocumentTypes({
        contrats: byType.contrat || byType.contract || 0,
        factures: byType.facture || byType.invoice || 0,
        releves: byType.releve || byType.statement || 0,
        identite: byType.identite || byType.identity || 0
      });
      
      // ✅ Mise à jour de la distribution des fraudes
      setFraudDistribution(fraudDist);
      
      // ✅ Extraction des alertes de fraude
      if (fraudAlertsRes.status === 'fulfilled') {
        const alerts = extractDataArray(fraudAlertsRes.value.data, []);
        setFraudAlerts(alerts);
      } else {
        setFraudAlerts([]);
      }
      
      // ✅ Extraction des templates
      if (templatesRes.status === 'fulfilled') {
        const templatesData = extractDataArray(templatesRes.value.data, []);
        setTemplates(templatesData);
      } else {
        setTemplates([]);
      }

    } catch (error) {
      console.error('Erreur chargement documents:', error);
      if (error.response?.status === 401) {
        message.error('Session expirée, veuillez vous reconnecter');
        localStorage.removeItem('access_token');
        localStorage.removeItem('token');
        setTimeout(() => window.location.href = '/login', 1500);
      } else {
        message.error('Erreur lors du chargement des données');
      }
      setDocuments([]);
      setFraudAlerts([]);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus, filterFraudRisk, dateRange, searchText]);

  useEffect(() => {
    setAuthChecked(true);
    fetchData();
  }, [fetchData]);

  // ========== GESTION DES TEMPLATES ==========
  const addTemplateField = useCallback(() => {
    setTemplateFields(prev => [...prev, { name: '', type: 'text', required: false, regex: '' }]);
  }, []);

  const updateTemplateField = useCallback((index, field, value) => {
    setTemplateFields(prev => {
      const newFields = [...prev];
      newFields[index][field] = value;
      return newFields;
    });
  }, []);

  const removeTemplateField = useCallback((index) => {
    setTemplateFields(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddTemplate = async (values) => {
    if (templateFields.length === 0) {
      message.warning('Ajoutez au moins un champ à extraire');
      return;
    }

    const templateData = {
      name: values.name,
      document_type: values.document_type,
      fields: templateFields.map(field => ({
        name: field.name,
        type: field.type || 'text',
        required: field.required || false,
        regex: field.regex || null
      }))
    };

    try {
      const response = await api.post('/document-intelligence/templates', templateData);
      const newTemplate = response.data?.data || response.data;
      message.success('Template créé avec succès');
      setTemplateModalVisible(false);
      templateForm.resetFields();
      setTemplateFields([]);
      setTemplates(prev => [newTemplate, ...prev]);
      fetchData();
    } catch (error) {
      console.error('Erreur création template:', error);
      message.error(error.response?.data?.detail || 'Erreur lors de la création du template');
    }
  };

  // ========== GESTION DES DOCUMENTS ==========
  const handleUpload = async (file) => {
    setUploadLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', 'other');

    try {
      const response = await api.post('/document-intelligence/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const result = response.data?.data || response.data;
      
      if (result.fraud_alert || result.fraud_score > 50) {
        message.warning(`⚠️ Alerte: Fraude potentielle détectée - Score: ${result.fraud_score || 0}%`);
        if (autoDetect && result.id) {
          handleFraudAnalysis(result.id);
        }
      } else {
        message.success('Document uploadé avec succès');
      }
      fetchData();
    } catch (error) {
      if (error.response?.status === 401) {
        message.error('Session expirée, veuillez vous reconnecter');
        localStorage.removeItem('access_token');
        localStorage.removeItem('token');
        setTimeout(() => window.location.href = '/login', 1500);
      } else {
        message.error('Erreur lors de l\'upload');
      }
    } finally {
      setUploadLoading(false);
    }
    return false;
  };

  const handleFraudAnalysis = async (documentId) => {
    try {
      const response = await api.post(`/document-intelligence/documents/${documentId}/fraud-analysis`, {});
      setFraudAnalysis(response.data?.data || response.data);
      setFraudModalVisible(true);
    } catch (error) {
      message.error('Erreur lors de l\'analyse');
    }
  };

  const handleViewDetails = async (document) => {
    try {
      const response = await api.get(`/document-intelligence/documents/${document.id}`);
      const data = response.data?.data || response.data;
      setSelectedDocument(data);
      setExtractedData(data.extracted_data || {});
      setCorrectedData(data.extracted_data || {});
      setDetailsModalVisible(true);
    } catch (error) {
      message.error('Erreur lors du chargement des détails');
    }
  };

  const handleCorrectData = async () => {
    try {
      await api.post(`/document-intelligence/documents/${selectedDocument.id}/correct`, {
        corrected_data: correctedData,
        notes: validationNotes
      });
      message.success('Données corrigées avec succès');
      setCorrectionModalVisible(false);
      setDetailsModalVisible(false);
      fetchData();
    } catch (error) {
      message.error('Erreur lors de la correction');
    }
  };

  const handleValidateData = async () => {
    try {
      await api.post(`/document-intelligence/documents/${selectedDocument.id}/validate`, {
        validated_data: extractedData,
        notes: validationNotes
      });
      message.success('Document validé avec succès');
      setValidationModalVisible(false);
      setDetailsModalVisible(false);
      fetchData();
    } catch (error) {
      message.error('Erreur lors de la validation');
    }
  };

  const handleDeleteDocument = async (documentId) => {
    Modal.confirm({
      title: 'Supprimer le document',
      content: 'Êtes-vous sûr de vouloir supprimer ce document ?',
      okText: 'Supprimer',
      okType: 'danger',
      cancelText: 'Annuler',
      onOk: async () => {
        try {
          await api.delete(`/document-intelligence/documents/${documentId}`);
          message.success('Document supprimé');
          setDocuments(prev => prev.filter(d => d.id !== documentId));
          setDetailsModalVisible(false);
          fetchData();
        } catch (error) {
          message.error('Erreur lors de la suppression');
        }
      }
    });
  };

  const handleReprocess = async (documentId) => {
    try {
      await api.post(`/document-intelligence/documents/${documentId}/process`, {});
      message.success('Traitement relancé');
      setDetailsModalVisible(false);
      fetchData();
    } catch (error) {
      message.error('Erreur lors du traitement');
    }
  };

  const resetFilters = useCallback(() => {
    setFilterType('all');
    setFilterStatus('all');
    setFilterFraudRisk('all');
    setDateRange(null);
    setSearchText('');
  }, []);

  // ========== COLONNES DU TABLEAU ==========
  const columns = useMemo(() => [
    { 
      title: 'Document', 
      dataIndex: 'filename', 
      key: 'filename',
      width: 250,
      render: (text, record) => (
        <Space>
          <FileTextOutlined style={{ color: record.fraud_risk === 'high' || record.fraud_risk === 'critical' ? '#f5222d' : '#1890ff' }} />
          <a onClick={() => handleViewDetails(record)} style={{ fontWeight: 500, color: '#fff' }}>{text}</a>
          {record.fraud_risk === 'critical' && <Badge dot color="red" />}
        </Space>
      )
    },
    { 
      title: 'Type', 
      dataIndex: 'document_type', 
      key: 'document_type',
      width: 120,
      render: (type) => {
        const typeConfig = documentTypeOptions.find(t => t.value === type);
        return typeConfig ? (
          <Tag color={typeConfig.color} icon={typeConfig.icon} style={{ background: 'rgba(255,255,255,0.1)', border: 'none' }}>
            {typeConfig.label}
          </Tag>
        ) : type;
      }
    },
    { 
      title: 'Extraction', 
      dataIndex: 'extraction_accuracy', 
      key: 'extraction_accuracy',
      width: 140,
      render: (accuracy) => (
        <Tooltip title={`Précision d'extraction: ${accuracy}%`}>
          <Progress 
            percent={accuracy || 0} 
            size="small" 
            status={accuracy >= 85 ? 'success' : accuracy >= 60 ? 'normal' : 'exception'} 
            strokeColor={accuracy >= 85 ? '#52c41a' : accuracy >= 60 ? '#1890ff' : '#f5222d'}
            trailColor="rgba(255,255,255,0.1)"
          />
        </Tooltip>
      )
    },
    { 
      title: 'Risque Fraude', 
      dataIndex: 'fraud_risk', 
      key: 'fraud_risk',
      width: 130,
      render: (risk) => {
        const config = {
          'critical': { color: 'red', icon: <CloseCircleOutlined />, text: 'Critique', bg: 'rgba(245,34,45,0.2)' },
          'high': { color: 'orange', icon: <WarningOutlined />, text: 'Élevé', bg: 'rgba(250,140,22,0.2)' },
          'medium': { color: 'gold', icon: <ExclamationCircleOutlined />, text: 'Moyen', bg: 'rgba(250,173,20,0.2)' },
          'low': { color: 'green', icon: <CheckCircleOutlined />, text: 'Faible', bg: 'rgba(82,196,26,0.2)' }
        };
        const { color, icon, text, bg } = config[risk] || { color: 'default', icon: null, text: risk, bg: 'rgba(255,255,255,0.05)' };
        return <Tag color={color} icon={icon} style={{ background: bg, border: 'none' }}>{text}</Tag>;
      }
    },
    { 
      title: 'Confiance', 
      dataIndex: 'confidence_score', 
      key: 'confidence_score',
      width: 120,
      render: (score) => (
        <Tooltip title={`Score: ${score?.toFixed(1)}%`}>
          <Progress 
            percent={Math.round(score || 0)} 
            size="small" 
            strokeColor={score >= 80 ? '#52c41a' : score >= 50 ? '#faad14' : '#f5222d'}
            trailColor="rgba(255,255,255,0.1)"
          />
        </Tooltip>
      )
    },
    { 
      title: 'Statut', 
      dataIndex: 'processing_status', 
      key: 'processing_status',
      width: 110,
      render: (status) => {
        const config = {
          'completed': { color: 'green', text: '✅ Traité', icon: <CheckCircleOutlined /> },
          'processing': { color: 'processing', text: '⏳ En cours', icon: <SyncOutlined spin /> },
          'pending': { color: 'default', text: '⏰ En attente', icon: <ClockCircleOutlined /> },
          'failed': { color: 'error', text: '❌ Échec', icon: <CloseCircleOutlined /> },
          'validated': { color: 'success', text: '✓ Validé', icon: <TrophyOutlined /> },
          'corrected': { color: 'blue', text: '✎ Corrigé', icon: <EditOutlined /> }
        };
        const { color, text, icon } = config[status] || { color: 'default', text: status, icon: null };
        return <Tag color={color} icon={icon} style={{ background: 'rgba(255,255,255,0.05)', border: 'none' }}>{text}</Tag>;
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title="Voir détails">
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetails(record)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff' }} />
          </Tooltip>
          {(record.fraud_risk === 'high' || record.fraud_risk === 'critical') && (
            <Tooltip title="Analyser fraude">
              <Button size="small" icon={<SafetyOutlined />} danger onClick={() => handleFraudAnalysis(record.id)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none' }} />
            </Tooltip>
          )}
          {record.processing_status === 'failed' && (
            <Tooltip title="Relancer le traitement">
              <Button size="small" type="primary" icon={<ReloadOutlined />} onClick={() => handleReprocess(record.id)} style={{ background: 'rgba(24,144,255,0.2)', border: 'none' }} />
            </Tooltip>
          )}
          <Tooltip title="Corriger les données">
            <Button size="small" icon={<EditOutlined />} onClick={() => {
              setSelectedDocument(record);
              setCorrectionModalVisible(true);
            }} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff' }} />
          </Tooltip>
          <Tooltip title="Supprimer">
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => handleDeleteDocument(record.id)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none' }} />
          </Tooltip>
        </Space>
      )
    }
  ], []);

  // Données pour la distribution des fraudes
  const fraudTypesData = useMemo(() => {
    const data = [
      { type: 'forged_documents', label: 'Documents falsifiés', icon: <FileProtectOutlined />, percent: fraudDistribution.forged_documents || 0, color: '#f5222d' },
      { type: 'fraudulent_contracts', label: 'Contrats frauduleux', icon: <FileTextOutlined />, percent: fraudDistribution.fraudulent_contracts || 0, color: '#fa8c16' },
      { type: 'identity_theft', label: 'Usurpation identité', icon: <IdcardOutlined />, percent: fraudDistribution.identity_theft || 0, color: '#722ed1' },
      { type: 'data_inconsistency', label: 'Incohérence données', icon: <ExclamationCircleOutlined />, percent: fraudDistribution.data_inconsistency || 0, color: '#eb2f96' }
    ];
    return data.filter(item => item.percent > 0);
  }, [fraudDistribution]);

  const documentTypesData = useMemo(() => {
    return [
      { type: 'contrats', label: 'Contrats', count: documentTypes.contrats || 0, icon: <FileTextOutlined />, color: '#1890ff' },
      { type: 'factures', label: 'Factures', count: documentTypes.factures || 0, icon: <FileTextOutlined />, color: '#52c41a' },
      { type: 'releves', label: 'Relevés', count: documentTypes.releves || 0, icon: <FileTextOutlined />, color: '#faad14' },
      { type: 'identite', label: 'Identités', count: documentTypes.identite || 0, icon: <IdcardOutlined />, color: '#722ed1' }
    ];
  }, [documentTypes]);

  // ✅ Vérification que les données sont bien des tableaux
  const safeDocuments = Array.isArray(documents) ? documents : [];
  const safeFraudAlerts = Array.isArray(fraudAlerts) ? fraudAlerts : [];
  const safeTemplates = Array.isArray(templates) ? templates : [];

  if (!authChecked) {
    return (
      <div style={{ padding: 24, textAlign: 'center', minHeight: '100vh', background: '#0b0b0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="Vérification de l'authentification..." ><div/></Spin>
      </div>
    );
  }

  if (loading && safeDocuments.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', minHeight: '100vh', background: '#0b0b0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spin size="large" tip="Chargement des documents..." ><div/></Spin>
      </div>
    );
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={staggerContainer}
      style={{ padding: 24, background: '#0b0b0b', minHeight: '100vh', color: '#fff' }}
    >
      {/* En-tête Premium Dark */}
      <motion.div variants={fadeInUp}>
        <div style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24,
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)', 
          padding: '20px 28px', borderRadius: 16, 
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)'
        }}>
          <div>
            <h1 style={{ margin: 0, color: '#fff', fontSize: 28, fontWeight: 700, letterSpacing: '0.5px' }}>
              <BookOutlined style={{ marginRight: 12, color: '#52c41a' }} />
              Intelligence Documentaire & Anti-Fraude
            </h1>
            <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
              Extraction automatique • Classification intelligente • Validation • Détection de falsifications
            </p>
          </div>
          <Space size="middle">
            <Tooltip title={autoDetect ? "Détection automatique activée" : "Détection automatique désactivée"}>
              <Switch 
                checkedChildren="Auto" 
                unCheckedChildren="Manuel" 
                checked={autoDetect} 
                onChange={setAutoDetect}
                style={{ backgroundColor: autoDetect ? '#52c41a' : undefined }}
              />
            </Tooltip>
            <Button icon={<AppstoreOutlined />} onClick={() => setTemplateModalVisible(true)} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
              Templates
            </Button>
            <Button icon={<ReloadOutlined />} onClick={fetchData} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
              Actualiser
            </Button>
            <Button icon={<DownloadOutlined />} onClick={() => message.info('Export en cours...')} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}>
              Exporter
            </Button>
            <Upload beforeUpload={handleUpload} showUploadList={false} accept=".pdf,.jpg,.jpeg,.png,.tiff">
              <Button type="primary" icon={<UploadOutlined />} loading={uploadLoading} style={{ background: '#52c41a', border: 'none', boxShadow: '0 0 20px rgba(82,196,26,0.3)' }}>
                Analyser un document
              </Button>
            </Upload>
          </Space>
        </div>
      </motion.div>

      {/* Alertes de fraude */}
      <AnimatePresence>
        {safeFraudAlerts.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ marginBottom: 16 }}
          >
            <Alert
              message={<span><WarningOutlined /> {safeFraudAlerts.length} alerte(s) de fraude détectée(s)</span>}
              description="Des documents suspects ont été identifiés. Une analyse approfondie est recommandée."
              type="error"
              showIcon
              style={{ borderRadius: 12, background: 'rgba(245,34,45,0.15)', border: '1px solid rgba(245,34,45,0.3)', color: '#fff' }}
              action={
                <Space>
                  <Button size="small" type="primary" danger onClick={() => setFilterFraudRisk('high')}>
                    Voir les alertes
                  </Button>
                  <Button size="small" onClick={() => setFraudAlerts([])} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff' }}>
                    Ignorer
                  </Button>
                </Space>
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filtres */}
      <motion.div variants={fadeInUp}>
        <Card style={{ marginBottom: 24, borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }} bodyStyle={{ padding: '16px 24px' }}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={12} md={6}>
              <Input.Search 
                placeholder="Rechercher un document..." 
                value={searchText} 
                onChange={(e) => setSearchText(e.target.value)} 
                onSearch={() => fetchData()} 
                allowClear 
                size="large"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
              />
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select 
                placeholder="Type document" 
                style={{ width: '100%' }} 
                value={filterType} 
                onChange={setFilterType}
                size="large"
                allowClear
                dropdownStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <Option value="all">📄 Tous</Option>
                {documentTypeOptions.map(doc => (
                  <Option key={doc.value} value={doc.value} style={{ color: '#fff' }}>{doc.icon} {doc.label}</Option>
                ))}
              </Select>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select 
                placeholder="Risque fraude" 
                style={{ width: '100%' }} 
                value={filterFraudRisk} 
                onChange={setFilterFraudRisk}
                size="large"
                allowClear
                dropdownStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <Option value="all">⚠️ Tous</Option>
                <Option value="critical">🔴 Critique</Option>
                <Option value="high">🟠 Élevé</Option>
                <Option value="medium">🟡 Moyen</Option>
                <Option value="low">🟢 Faible</Option>
              </Select>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Select 
                placeholder="Statut" 
                style={{ width: '100%' }} 
                value={filterStatus} 
                onChange={setFilterStatus}
                size="large"
                allowClear
                dropdownStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                <Option value="all">📊 Tous</Option>
                <Option value="completed">✅ Traité</Option>
                <Option value="processing">⏳ En cours</Option>
                <Option value="failed">❌ Échec</Option>
                <Option value="validated">🏆 Validé</Option>
              </Select>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <RangePicker 
                style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} 
                onChange={setDateRange} 
                size="large"
                placeholder={['Début', 'Fin']}
              />
            </Col>
            <Col xs={24} sm={24} md={2}>
              <Button 
                icon={<FilterOutlined />} 
                onClick={resetFilters} 
                size="large"
                block
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              >
                Reset
              </Button>
            </Col>
          </Row>
        </Card>
      </motion.div>

      {/* KPIs */}
      <motion.div variants={fadeInUp}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: 16, background: 'rgba(102,126,234,0.1)', border: '1px solid rgba(102,126,234,0.2)' }}>
              <Statistic 
                title={<span style={{ color: 'rgba(255,255,255,0.6)' }}>📊 Documents analysés</span>} 
                value={stats.totalProcessed} 
                valueStyle={{ color: '#667eea', fontWeight: 'bold' }}
                suffix={<span style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>documents</span>}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: 16, background: 'rgba(82,196,26,0.1)', border: '1px solid rgba(82,196,26,0.2)' }}>
              <Statistic 
                title={<span style={{ color: 'rgba(255,255,255,0.6)' }}>🎯 Précision extraction</span>} 
                value={stats.extractionAccuracy} 
                suffix="%" 
                valueStyle={{ color: '#52c41a', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: 16, background: 'rgba(245,34,45,0.1)', border: '1px solid rgba(245,34,45,0.2)' }}>
              <Statistic 
                title={<span style={{ color: 'rgba(255,255,255,0.6)' }}>🚨 Fraudes détectées</span>} 
                value={stats.fraudDetected} 
                valueStyle={{ color: '#f5222d', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Card style={{ borderRadius: 16, background: 'rgba(24,144,255,0.1)', border: '1px solid rgba(24,144,255,0.2)' }}>
              <Statistic 
                title={<span style={{ color: 'rgba(255,255,255,0.6)' }}>✅ Taux de réussite</span>} 
                value={stats.successRate} 
                suffix="%" 
                valueStyle={{ color: '#1890ff', fontWeight: 'bold' }}
              />
            </Card>
          </Col>
        </Row>
      </motion.div>

      {/* Distribution et Tableau */}
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={8}>
          <motion.div variants={fadeInUp}>
            <Card 
              title={<span style={{ color: '#fff' }}><PieChartOutlined /> Distribution des fraudes</span>} 
              style={{ borderRadius: 16, marginBottom: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              headStyle={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#fff' }}
            >
              {fraudTypesData.length > 0 ? (
                fraudTypesData.map(item => (
                  <div key={item.type} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Space>
                        <span style={{ color: item.color }}>{item.icon}</span>
                        <span style={{ fontWeight: 500, color: '#fff' }}>{item.label}</span>
                      </Space>
                      <span style={{ color: item.color, fontWeight: 'bold' }}>{item.percent}%</span>
                    </div>
                    <Progress 
                      percent={item.percent} 
                      size="small" 
                      strokeColor={item.color} 
                      showInfo={false}
                      trailColor="rgba(255,255,255,0.1)"
                    />
                  </div>
                ))
              ) : (
                <Empty description="Aucune donnée de fraude" style={{ color: 'rgba(255,255,255,0.4)' }} />
              )}
            </Card>

            <Card 
              title={<span style={{ color: '#fff' }}><FileTextOutlined /> Types de documents</span>} 
              style={{ borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              headStyle={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#fff' }}
            >
              {documentTypesData.map(item => {
                const total = stats.totalProcessed || 1;
                const percent = Math.round((item.count / total) * 100);
                return (
                  <div key={item.type} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Space>
                        <span style={{ color: item.color }}>{item.icon}</span>
                        <span style={{ fontWeight: 500, color: '#fff' }}>{item.label}</span>
                      </Space>
                      <span style={{ color: item.color, fontWeight: 'bold' }}>{item.count} ({percent}%)</span>
                    </div>
                    <Progress 
                      percent={percent} 
                      size="small" 
                      strokeColor={item.color} 
                      showInfo={false}
                      trailColor="rgba(255,255,255,0.1)"
                    />
                  </div>
                );
              })}
            </Card>
          </motion.div>
        </Col>
        <Col xs={24} lg={16}>
          <motion.div variants={fadeInUp}>
            <Card 
              title={
                <Space style={{ color: '#fff' }}>
                  <FileTextOutlined />
                  <span>Documents traités</span>
                  <Badge count={safeDocuments.length} showZero style={{ backgroundColor: '#1890ff' }} />
                </Space>
              } 
              extra={
                <Tabs 
                  size="small" 
                  onChange={(key) => {
                    if (key === 'all') setFilterStatus('all');
                    if (key === 'fraud') setFilterFraudRisk('high');
                    if (key === 'completed') setFilterStatus('completed');
                  }}
                  tabBarStyle={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          items={[
            {
              key: 'all',
              label: <span style={{ color: 'rgba(255,255,255,0.6)' }}>Tous</span>
            },
            {
              key: 'fraud',
              label: <span style={{ color: 'rgba(255,255,255,0.6)' }}>⚠️ Risque fraude</span>
            },
            {
              key: 'completed',
              label: <span style={{ color: 'rgba(255,255,255,0.6)' }}>✅ Traités</span>
            }
          ]}
        />
              }
              style={{ borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
              headStyle={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#fff' }}
              bodyStyle={{ padding: 0, overflowX: 'auto' }}
            >
              <Table 
                columns={columns} 
                dataSource={safeDocuments} 
                rowKey="id" 
                pagination={{ 
                  pageSize: 10, 
                  showTotal: (total) => `${total} document(s)`,
                  showSizeChanger: true,
                  showQuickJumper: true,
                }} 
                scroll={{ x: 1000 }}
                locale={{ emptyText: <Empty description="Aucun document trouvé" style={{ color: 'rgba(255,255,255,0.4)' }} /> }}
                style={{ background: 'transparent' }}
                rowClassName={() => 'dark-table-row'}
              />
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* Modal Template */}
      <Modal 
        title={<Space style={{ color: '#fff' }}><AppstoreOutlined /> Créer un template d'extraction</Space>} 
        open={templateModalVisible} 
        onCancel={() => { 
          setTemplateModalVisible(false); 
          templateForm.resetFields(); 
          setTemplateFields([]); 
        }} 
        footer={null} 
        width={700}
        style={{ top: 20 }}
        bodyStyle={{ background: '#1a1a1a', color: '#fff' }}
        headerStyle={{ background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <Form form={templateForm} layout="vertical" onFinish={handleAddTemplate}>
          <Form.Item name="name" label={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Nom du template</span>} rules={[{ required: true, message: 'Veuillez saisir un nom' }]}>
            <Input placeholder="Ex: Facture standard" size="large" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
          </Form.Item>
          <Form.Item name="document_type" label={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Type de document</span>} rules={[{ required: true }]}>
            <Select placeholder="Sélectionner le type" size="large" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} dropdownStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
              {documentTypeOptions.map(doc => (
                <Option key={doc.value} value={doc.value} style={{ color: '#fff' }}>
                  {doc.icon} {doc.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Divider style={{ borderColor: 'rgba(255,255,255,0.06)' }}>Champs à extraire</Divider>
          
          <Button 
            type="dashed" 
            icon={<PlusOutlined />} 
            onClick={addTemplateField} 
            block 
            style={{ marginBottom: 16, borderColor: 'rgba(255,255,255,0.1)', color: '#fff' }}
          >
            Ajouter un champ
          </Button>
          
          <AnimatePresence>
            {templateFields.map((field, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card size="small" style={{ marginBottom: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <Row gutter={12}>
                    <Col span={7}>
                      <Input 
                        placeholder="Nom du champ" 
                        value={field.name} 
                        onChange={(e) => updateTemplateField(idx, 'name', e.target.value)} 
                        size="small"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                      />
                    </Col>
                    <Col span={5}>
                      <Select 
                        placeholder="Type" 
                        value={field.type} 
                        onChange={(val) => updateTemplateField(idx, 'type', val)}
                        size="small"
                        style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                        dropdownStyle={{ background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}
                      >
                        <Option value="text" style={{ color: '#fff' }}>📝 Texte</Option>
                        <Option value="number" style={{ color: '#fff' }}>🔢 Nombre</Option>
                        <Option value="date" style={{ color: '#fff' }}>📅 Date</Option>
                        <Option value="amount" style={{ color: '#fff' }}>💰 Montant</Option>
                      </Select>
                    </Col>
                    <Col span={4}>
                      <Checkbox 
                        checked={field.required} 
                        onChange={(e) => updateTemplateField(idx, 'required', e.target.checked)}
                        style={{ color: '#fff' }}
                      >
                        Obligatoire
                      </Checkbox>
                    </Col>
                    <Col span={6}>
                      <Input 
                        placeholder="Regex (optionnel)" 
                        value={field.regex} 
                        onChange={(e) => updateTemplateField(idx, 'regex', e.target.value)} 
                        size="small"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                      />
                    </Col>
                    <Col span={2}>
                      <Button 
                        danger 
                        icon={<DeleteOutlined />} 
                        onClick={() => removeTemplateField(idx)} 
                        size="small"
                        style={{ background: 'rgba(255,255,255,0.05)', border: 'none' }}
                      />
                    </Col>
                  </Row>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
          
          <Form.Item style={{ marginTop: 16 }}>
            <Button type="primary" htmlType="submit" block size="large" style={{ background: '#1890ff', border: 'none' }}>
              Créer le template
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Détails Document */}
      <Modal 
        title={`📄 ${selectedDocument?.filename || 'Détails du document'}`} 
        open={detailsModalVisible} 
        onCancel={() => setDetailsModalVisible(false)} 
        width={800} 
        bodyStyle={{ background: '#1a1a1a', color: '#fff' }}
        headerStyle={{ background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#fff' }}
        footer={[
          <Button key="close" onClick={() => setDetailsModalVisible(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff' }}>Fermer</Button>,
          (selectedDocument?.fraud_risk === 'high' || selectedDocument?.fraud_risk === 'critical') && (
            <Button key="fraud" danger onClick={() => handleFraudAnalysis(selectedDocument.id)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none' }}>
              Analyser fraude
            </Button>
          ),
          selectedDocument?.processing_status === 'failed' && (
            <Button key="reprocess" type="primary" onClick={() => handleReprocess(selectedDocument.id)} style={{ background: 'rgba(24,144,255,0.2)', border: 'none' }}>
              Relancer
            </Button>
          ),
          <Button key="correct" icon={<EditOutlined />} onClick={() => setCorrectionModalVisible(true)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff' }}>
            Corriger données
          </Button>,
          <Button key="validate" type="primary" icon={<CheckCircleOutlined />} onClick={() => setValidationModalVisible(true)} style={{ background: '#52c41a', border: 'none' }}>
            Valider
          </Button>,
          <Button key="delete" danger icon={<DeleteOutlined />} onClick={() => handleDeleteDocument(selectedDocument?.id)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none' }}>
            Supprimer
          </Button>
        ]}
      >
        {selectedDocument && (
          <div>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <Descriptions.Item label="Document" span={2} labelStyle={{ color: 'rgba(255,255,255,0.6)' }} contentStyle={{ color: '#fff' }}>
                <Text strong style={{ color: '#fff' }}>{selectedDocument.filename}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Type" labelStyle={{ color: 'rgba(255,255,255,0.6)' }} contentStyle={{ color: '#fff' }}>
                <Tag color="blue" style={{ background: 'rgba(24,144,255,0.2)', border: 'none' }}>{selectedDocument.document_type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Score confiance" labelStyle={{ color: 'rgba(255,255,255,0.6)' }} contentStyle={{ color: '#fff' }}>
                <Progress 
                  percent={Math.round(selectedDocument.confidence_score || 0)} 
                  size="small" 
                  width={80}
                  strokeColor={selectedDocument.confidence_score >= 80 ? '#52c41a' : '#faad14'}
                  trailColor="rgba(255,255,255,0.1)"
                />
              </Descriptions.Item>
              <Descriptions.Item label="Risque fraude" labelStyle={{ color: 'rgba(255,255,255,0.6)' }} contentStyle={{ color: '#fff' }}>
                <Tag color={selectedDocument.fraud_risk === 'critical' ? 'red' : selectedDocument.fraud_risk === 'high' ? 'orange' : 'green'} style={{ background: 'rgba(255,255,255,0.05)', border: 'none' }}>
                  {selectedDocument.fraud_risk}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Statut" labelStyle={{ color: 'rgba(255,255,255,0.6)' }} contentStyle={{ color: '#fff' }}>
                <Tag color={selectedDocument.processing_status === 'completed' ? 'green' : 'blue'} style={{ background: 'rgba(255,255,255,0.05)', border: 'none' }}>
                  {selectedDocument.processing_status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Date soumission" labelStyle={{ color: 'rgba(255,255,255,0.6)' }} contentStyle={{ color: '#fff' }}>
                {new Date(selectedDocument.submitted_at).toLocaleString()}
              </Descriptions.Item>
            </Descriptions>

            <Card size="small" title="Données extraites" style={{ marginBottom: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }} headStyle={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {Object.keys(extractedData).length > 0 ? (
                <Descriptions column={1} size="small">
                  {Object.entries(extractedData).map(([key, value]) => (
                    <Descriptions.Item key={key} label={<strong style={{ color: 'rgba(255,255,255,0.7)' }}>{key}</strong>} contentStyle={{ color: '#fff' }}>
                      {value}
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              ) : (
                <Empty description="Aucune donnée extraite" style={{ color: 'rgba(255,255,255,0.4)' }} />
              )}
            </Card>

            {selectedDocument.fraud_indicators?.length > 0 && (
              <Card size="small" title="Indicateurs de fraude" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }} headStyle={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <Space wrap>
                  {selectedDocument.fraud_indicators.map((ind, i) => (
                    <Tag key={i} color="red" icon={<WarningOutlined />} style={{ background: 'rgba(245,34,45,0.2)', border: 'none' }}>{ind}</Tag>
                  ))}
                </Space>
              </Card>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Correction Données */}
      <Modal 
        title="✎ Corriger les données extraites" 
        open={correctionModalVisible} 
        onCancel={() => {
          setCorrectionModalVisible(false);
          setValidationNotes('');
        }} 
        onOk={handleCorrectData} 
        width={600}
        bodyStyle={{ background: '#1a1a1a', color: '#fff' }}
        headerStyle={{ background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#fff' }}
      >
        {selectedDocument && (
          <Form form={correctionForm} layout="vertical" initialValues={correctedData}>
            {Object.entries(correctedData).map(([key, value]) => (
              <Form.Item key={key} name={key} label={<span style={{ color: 'rgba(255,255,255,0.8)' }}>{key}</span>} initialValue={value}>
                <Input size="large" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
              </Form.Item>
            ))}
            <Form.Item label={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Notes de correction</span>}>
              <TextArea 
                rows={3} 
                value={validationNotes} 
                onChange={(e) => setValidationNotes(e.target.value)} 
                placeholder="Notes sur les corrections effectuées..."
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Modal Validation */}
      <Modal 
        title="✓ Valider les données extraites" 
        open={validationModalVisible} 
        onCancel={() => {
          setValidationModalVisible(false);
          setValidationNotes('');
        }} 
        onOk={handleValidateData} 
        width={600}
        bodyStyle={{ background: '#1a1a1a', color: '#fff' }}
        headerStyle={{ background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#fff' }}
      >
        {selectedDocument && (
          <div>
            <Card size="small" title="Données à valider" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }} headStyle={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {Object.keys(extractedData).length > 0 ? (
                <Descriptions column={1} size="small">
                  {Object.entries(extractedData).map(([key, value]) => (
                    <Descriptions.Item key={key} label={<strong style={{ color: 'rgba(255,255,255,0.7)' }}>{key}</strong>} contentStyle={{ color: '#fff' }}>
                      {value}
                    </Descriptions.Item>
                  ))}
                </Descriptions>
              ) : (
                <Empty description="Aucune donnée à valider" style={{ color: 'rgba(255,255,255,0.4)' }} />
              )}
            </Card>
            <Form.Item label={<span style={{ color: 'rgba(255,255,255,0.8)' }}>Notes de validation</span>} style={{ marginTop: 16 }}>
              <TextArea 
                rows={3} 
                value={validationNotes} 
                onChange={(e) => setValidationNotes(e.target.value)} 
                placeholder="Notes de validation..."
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
              />
            </Form.Item>
          </div>
        )}
      </Modal>

      {/* Modal Analyse Fraude */}
      <Modal 
        title="🔍 Analyse Anti-Fraude" 
        open={fraudModalVisible} 
        onCancel={() => setFraudModalVisible(false)} 
        footer={[<Button key="close" onClick={() => setFraudModalVisible(false)} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#fff' }}>Fermer</Button>]}
        width={700}
        bodyStyle={{ background: '#1a1a1a', color: '#fff' }}
        headerStyle={{ background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.06)', color: '#fff' }}
      >
        {fraudAnalysis && (
          <div>
            <Alert 
              message={`Score de risque: ${fraudAnalysis.fraud_score}%`}
              description={`Niveau: ${fraudAnalysis.fraud_level || 'Élevé'}`}
              type="error" 
              showIcon 
              style={{ marginBottom: 16, borderRadius: 12, background: 'rgba(245,34,45,0.15)', border: '1px solid rgba(245,34,45,0.3)', color: '#fff' }}
            />
            
            <Card title="🚨 Indicateurs détectés" style={{ marginBottom: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }} headStyle={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Space wrap>
                {fraudAnalysis.indicators?.map((ind, i) => (
                  <Tag key={i} color="red" icon={<WarningOutlined />} style={{ background: 'rgba(245,34,45,0.2)', border: 'none' }}>{ind}</Tag>
                )) || <Empty description="Aucun indicateur" style={{ color: 'rgba(255,255,255,0.4)' }} />}
              </Space>
            </Card>

            <Card title="📋 Recommandation" style={{ marginBottom: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }} headStyle={{ color: '#fff', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Alert 
                message={fraudAnalysis.recommendation || "Une vérification manuelle est recommandée"}
                type="info" 
                showIcon
                style={{ borderRadius: 8, background: 'rgba(24,144,255,0.1)', border: '1px solid rgba(24,144,255,0.2)', color: '#fff' }}
              />
            </Card>
          </div>
        )}
      </Modal>

      {/* Style global pour les composants Ant Design sombres */}
      <style jsx global>{`
        .ant-select-selector, .ant-input, .ant-picker {
          background: rgba(255,255,255,0.05) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: #fff !important;
        }
        .ant-select-arrow, .ant-picker-suffix {
          color: rgba(255,255,255,0.4) !important;
        }
        .ant-select-dropdown {
          background: #1a1a1a !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
        }
        .ant-select-item-option {
          color: #fff !important;
        }
        .ant-select-item-option:hover {
          background: rgba(255,255,255,0.05) !important;
        }
        .ant-table {
          background: transparent !important;
          color: #fff !important;
        }
        .ant-table-thead > tr > th {
          background: rgba(255,255,255,0.05) !important;
          color: rgba(255,255,255,0.85) !important;
          border-bottom: 1px solid rgba(255,255,255,0.06) !important;
        }
        .ant-table-tbody > tr > td {
          border-bottom: 1px solid rgba(255,255,255,0.04) !important;
          color: rgba(255,255,255,0.85) !important;
        }
        .ant-table-tbody > tr:hover > td {
          background: rgba(255,255,255,0.03) !important;
        }
        .ant-pagination-item, .ant-pagination-prev, .ant-pagination-next {
          background: rgba(255,255,255,0.05) !important;
          border: 1px solid rgba(255,255,255,0.1) !important;
          color: #fff !important;
        }
        .ant-pagination-item a {
          color: #fff !important;
        }
        .ant-pagination-item-active {
          background: #1890ff !important;
          border-color: #1890ff !important;
        }
        .ant-pagination-item-active a {
          color: #fff !important;
        }
        .ant-pagination-disabled .ant-pagination-item-link {
          color: rgba(255,255,255,0.2) !important;
        }
        .ant-empty-description {
          color: rgba(255,255,255,0.4) !important;
        }
        .ant-modal-content {
          background: #1a1a1a !important;
          color: #fff !important;
        }
        .ant-modal-header {
          background: #1a1a1a !important;
          border-bottom: 1px solid rgba(255,255,255,0.06) !important;
        }
        .ant-modal-title {
          color: #fff !important;
        }
        .ant-modal-close {
          color: rgba(255,255,255,0.4) !important;
        }
        .ant-modal-close:hover {
          color: #fff !important;
        }
        .ant-modal-footer {
          border-top: 1px solid rgba(255,255,255,0.06) !important;
        }
        .ant-statistic-title {
          color: rgba(255,255,255,0.6) !important;
        }
        .ant-statistic-content {
          color: #fff !important;
        }
        .ant-tabs-tab {
          color: rgba(255,255,255,0.6) !important;
        }
        .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #1890ff !important;
        }
        .ant-tabs-ink-bar {
          background: #1890ff !important;
        }
        .ant-upload-drag {
          background: rgba(255,255,255,0.02) !important;
          border: 2px dashed rgba(255,255,255,0.1) !important;
        }
        .ant-upload-drag-icon {
          color: rgba(255,255,255,0.4) !important;
        }
        .ant-upload-text {
          color: rgba(255,255,255,0.6) !important;
        }
      `}</style>
    </motion.div>
  );
};

export default DocumentIntelligence;