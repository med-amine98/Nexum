// src/modules/banking/KYCAutomation.js
// Version corrigée avec design sombre et professionnel

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Card, Row, Col, Statistic, Table, Tag, Space, Button, Steps, 
  Upload, Progress, Spin, message, Modal, Select, DatePicker, 
  Descriptions, Input, Tooltip, Divider, Badge, Alert,
  Timeline, Result, Avatar, Form, InputNumber, List, Upload as AntUpload,
  Typography
} from 'antd';
import { 
  ScanOutlined, CheckCircleOutlined, 
  CloseCircleOutlined, UploadOutlined,
  ReloadOutlined, DownloadOutlined, FilterOutlined, ClockCircleOutlined, PlusOutlined,
  EyeOutlined, DeleteOutlined,
  UserOutlined, FileTextOutlined, SafetyOutlined,
  RobotOutlined, 
  IdcardOutlined, WarningOutlined,
  VideoCameraOutlined, LockOutlined, ApiOutlined,
  BellOutlined, SettingOutlined,
  HomeOutlined, CameraOutlined,
  FormOutlined 
} from '@ant-design/icons';
import api from '../../services/api';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { motion } from 'framer-motion';

const { Title, Text } = Typography;
const { Step } = Steps;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { confirm } = Modal;
const { Dragger } = AntUpload;

// ============================================
// COULEURS DESIGN SOMBRE
// ============================================

const COLORS = {
  bgDark: '#0f172a',
  bgCard: '#1e293b',
  bgCardHover: '#334155',
  border: '#334155',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#64748b',
  primary: '#1890ff',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  purple: '#8b5cf6',
  pink: '#ec4899',
  cyan: '#06b6d4'
};

// ============================================
// STYLES
// ============================================

const styles = {
  page: {
    background: COLORS.bgDark,
    minHeight: '100vh',
    padding: 24
  },
  header: {
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    padding: '20px 24px',
    borderRadius: 16,
    marginBottom: 24,
    border: `1px solid ${COLORS.border}`,
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)'
  },
  card: {
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
  },
  kpiCard: {
    background: COLORS.bgCard,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    padding: '16px 20px',
    transition: 'all 0.3s ease'
  }
};

// ============================================
// ERROR BOUNDARY
// ============================================

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert 
          message="Une erreur est survenue" 
          description="L'application a rencontré une erreur. Veuillez rafraîchir la page."
          type="error" 
          showIcon 
          style={{ borderRadius: 12 }}
        />
      );
    }
    return this.props.children;
  }
}

const KYCAutomation = () => {
  const navigate = useNavigate();
  
  // ========== ÉTATS ==========
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [fraudAlerts, setFraudAlerts] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    verified: 0,
    rejected: 0,
    avgTime: '2.5 min',
    successRate: 0,
    fraudDetected: 0,
    fraudPreventionRate: 0
  });
  const [rules, setRules] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [fraudModalVisible, setFraudModalVisible] = useState(false);
  const [fraudAnalysis, setFraudAnalysis] = useState(null);
  const [rulesModalVisible, setRulesModalVisible] = useState(false);
  const [addDocumentModalVisible, setAddDocumentModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [documentList, setDocumentList] = useState([]);
  const [selfieFile, setSelfieFile] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState({});

  const [newRuleForm] = Form.useForm();
  const [kycForm] = Form.useForm();

  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDocument, setFilterDocument] = useState('all');
  const [filterFraudRisk, setFilterFraudRisk] = useState('all');
  const [dateRange, setDateRange] = useState(null);

  const documentTypes = [
    { value: 'passeport', label: 'Passeport', icon: <IdcardOutlined /> },
    { value: 'cin', label: 'Carte d\'identité', icon: <IdcardOutlined /> },
    { value: 'permis', label: 'Permis de conduire', icon: <IdcardOutlined /> }
  ];

  const proofTypes = [
    { value: 'facture', label: 'Facture', icon: <FileTextOutlined /> },
    { value: 'attestation', label: 'Attestation', icon: <HomeOutlined /> },
    { value: 'avis_imposition', label: 'Avis d\'imposition', icon: <FileTextOutlined /> },
    { value: 'quittance', label: 'Quittance de loyer', icon: <HomeOutlined /> }
  ];

  const kycQuestions = [
    { id: 'employment', question: 'Situation professionnelle ?', options: ['Salarié', 'Indépendant', 'Entrepreneur', 'Retraité', 'Sans emploi', 'Étudiant'] },
    { id: 'income', question: 'Revenu annuel ?', options: ['Moins de 20k€', '20k€-40k€', '40k€-60k€', '60k€-80k€', '80k€-100k€', 'Plus de 100k€'] },
    { id: 'purpose', question: 'Objectif du compte ?', options: ['Épargne', 'Investissement', 'Transactions', 'Crédit', 'Autre'] },
    { id: 'source_funds', question: 'Source des fonds ?', options: ['Salaire', 'Revenus pro', 'Héritage', 'Investissements', 'Épargne', 'Autre'] }
  ];

  const innovativeTechniques = [
    { title: "Zero-Knowledge Proof", icon: <LockOutlined />, benefit: "-99% risque", color: COLORS.primary },
    { title: "AI Document Forensics", icon: <RobotOutlined />, benefit: "+85% détection", color: COLORS.success },
    { title: "Anti-Deepfake", icon: <VideoCameraOutlined />, benefit: "-95% bypass", color: COLORS.warning },
    { title: "Cross-Domain", icon: <ApiOutlined />, benefit: "+70% détection", color: COLORS.purple }
  ];

  // ========== CHARGEMENT DES DONNÉES (CORRIGÉ) ==========
  const fetchData = useCallback(async () => {
    if (refreshing) return;
    
    setLoading(true);
    setRefreshing(true);
    try {
      const [documentsRes, statsRes, fraudAlertsRes, rulesRes] = await Promise.allSettled([
        api.get('/kyc/documents', { params: { 
          status: filterStatus, 
          document_type: filterDocument, 
          fraud_risk: filterFraudRisk, 
          date_from: dateRange?.[0]?.format('YYYY-MM-DD'), 
          date_to: dateRange?.[1]?.format('YYYY-MM-DD') 
        } }),
        api.get('/kyc/dashboard'),
        api.get('/kyc/fraud-alerts'),
        api.get('/kyc/rules')
      ]);

      // ✅ Documents : le backend renvoie directement un tableau
      if (documentsRes.status === 'fulfilled' && Array.isArray(documentsRes.value)) {
        setDocuments(documentsRes.value);
      } else {
        setDocuments([]);
      }
      
      // ✅ Stats : le backend renvoie un objet directement (pas de clé "data")
      if (statsRes.status === 'fulfilled' && statsRes.value) {
        const data = statsRes.value;
        setStats({
          pending: data.pending || 0,
          verified: data.verified || 0,
          rejected: data.rejected || 0,
          avgTime: data.avg_time || '2.5 min',
          successRate: data.success_rate || 0,
          fraudDetected: data.fraud_detected || 0,
          fraudPreventionRate: data.fraud_prevention_rate || 87.5
        });
      }
      
      // ✅ Alertes : le backend renvoie un tableau
      if (fraudAlertsRes.status === 'fulfilled' && Array.isArray(fraudAlertsRes.value)) {
        setFraudAlerts(fraudAlertsRes.value);
      } else {
        setFraudAlerts([]);
      }
      
      // ✅ Règles : le backend renvoie un tableau
      if (rulesRes.status === 'fulfilled' && Array.isArray(rulesRes.value)) {
        setRules(rulesRes.value);
      } else {
        setRules([]);
      }

    } catch (error) {
      console.error('Erreur:', error);
      setDocuments([]);
      if (error.response?.status === 401) {
        message.error('Session expirée');
        localStorage.removeItem('access_token');
        localStorage.removeItem('token');
        setTimeout(() => navigate('/login'), 1500);
      } else {
        message.error('Erreur de chargement');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterStatus, filterDocument, filterFraudRisk, dateRange, navigate, refreshing]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ========== GESTION FICHIERS ==========
  const handleDocumentUpload = (file) => {
    setDocumentList(prev => [...prev, { id: Date.now(), file, name: file.name, size: file.size }]);
    return false;
  };

  const removeDocument = (id) => {
    setDocumentList(prev => prev.filter(d => d.id !== id));
  };

  const handleSelfieUpload = (file) => {
    setSelfieFile(file);
    return false;
  };

  const handleProofUpload = (file) => {
    setProofFile(file);
    return false;
  };

  const handleQuestionnaireChange = (questionId, answer) => {
    setQuestionnaireAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  // ========== SOUMISSION (CORRIGÉE) ==========
  const handleSubmitKYC = async () => {
    try {
      // 1. Valider tous les champs du formulaire (y compris ceux des autres étapes)
      const formValues = await kycForm.validateFields();

      // 2. Vérifications supplémentaires (fichiers)
      if (documentList.length === 0) {
        message.error('Veuillez télécharger au moins un document d\'identité');
        return;
      }
      
      if (!selfieFile) {
        message.error('Veuillez télécharger une photo selfie');
        return;
      }
      
      if (!proofFile) {
        message.error('Veuillez télécharger un justificatif de domicile');
        return;
      }

      // 3. Construction du FormData
      setUploadLoading(true);
      const formData = new FormData();
      
      // Champs texte
      formData.append('client_name', formValues.client_name.trim());
      formData.append('document_type', formValues.document_type);
      
      if (formValues.client_email) formData.append('client_email', formValues.client_email);
      if (formValues.client_phone) formData.append('client_phone', formValues.client_phone);
      if (formValues.client_address) formData.append('client_address', formValues.client_address);
      if (formValues.document_number) formData.append('document_number', formValues.document_number);
      if (formValues.issuing_country) formData.append('document_country', formValues.issuing_country);
      if (formValues.proof_type) formData.append('proof_type', formValues.proof_type);
      
      // Dates
      if (formValues.client_birth_date) {
        const birthDate = dayjs(formValues.client_birth_date);
        if (birthDate.isValid()) {
          formData.append('client_birth_date', birthDate.format('YYYY-MM-DD'));
        }
      }
      
      if (formValues.issue_date) {
        const issueDate = dayjs(formValues.issue_date);
        if (issueDate.isValid()) {
          formData.append('document_issue_date', issueDate.format('YYYY-MM-DD'));
        }
      }
      
      if (formValues.expiry_date) {
        const expiryDate = dayjs(formValues.expiry_date);
        if (expiryDate.isValid()) {
          formData.append('document_expiry', expiryDate.format('YYYY-MM-DD'));
        }
      }
      
      if (formValues.proof_date) {
        const proofDate = dayjs(formValues.proof_date);
        if (proofDate.isValid()) {
          formData.append('proof_date', proofDate.format('YYYY-MM-DD'));
        }
      }
      
      // Fichiers
      documentList.forEach(doc => {
        formData.append('identity_documents', doc.file);
      });
      
      formData.append('selfie', selfieFile);
      formData.append('proof', proofFile);
      
      if (Object.keys(questionnaireAnswers).length > 0) {
        formData.append('questionnaire_answers', JSON.stringify(questionnaireAnswers));
      }

      // 4. Envoi
      const response = await api.post('/kyc/complete', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data && response.data.success) {
        message.success('Demande KYC soumise avec succès');
        if (response.data.fraud_alert) {
          message.warning(`⚠️ Alerte anti-fraude - Score: ${response.data.fraud_score}%`);
        }
      } else {
        message.success('Demande soumise avec succès');
      }
      
      // 5. Réinitialisation
      setAddDocumentModalVisible(false);
      setCurrentStep(0);
      setDocumentList([]);
      setSelfieFile(null);
      setProofFile(null);
      setQuestionnaireAnswers({});
      kycForm.resetFields();
      fetchData();
      
    } catch (error) {
      // Si l'erreur vient de la validation du formulaire, Ant Design affiche déjà les messages
      if (error?.errorFields) {
        console.warn('Erreurs de validation:', error.errorFields);
        // On laisse Ant Design gérer l'affichage
        return;
      }
      
      console.error('Erreur soumission:', error);
      if (error.response) {
        console.error('Détails erreur:', error.response.data);
        message.error(error.response.data?.detail || 'Erreur lors de la soumission');
      } else {
        message.error('Erreur de connexion au serveur');
      }
    } finally {
      setUploadLoading(false);
    }
  };

  // ========== AUTRES FONCTIONS ==========
  const handleFraudAnalysis = async (documentId) => {
    const hide = message.loading('Analyse IA...', 0);
    try {
      const res = await api.post(`/kyc/documents/${documentId}/fraud-analysis`, {});
      hide();
      setFraudAnalysis(res.data);
      setFraudModalVisible(true);
    } catch (error) {
      hide();
      message.error('Erreur analyse');
    }
  };

  const handleViewDetails = async (document) => {
    try {
      const res = await api.get(`/kyc/documents/${document.id}`);
      setSelectedDocument(res.data);
      setDetailsModalVisible(true);
    } catch (error) {
      message.error('Erreur chargement détails');
    }
  };

  const handleVerify = async (documentId) => {
    confirm({
      title: 'Vérifier',
      icon: <CheckCircleOutlined />,
      content: 'Confirmer la vérification ?',
      onOk: async () => {
        try {
          await api.post(`/kyc/documents/${documentId}/verify`, {});
          message.success('Document vérifié');
          fetchData();
        } catch (error) {
          message.error('Erreur');
        }
      }
    });
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      message.warning('Veuillez saisir une raison');
      return;
    }

    try {
      await api.post(
        `/kyc/documents/${selectedDocument.id}/reject`,
        { reason: rejectReason }
      );
      message.success('Document rejeté');
      setRejectModalVisible(false);
      setRejectReason('');
      fetchData();
      setDetailsModalVisible(false);
    } catch (error) {
      message.error('Erreur rejet');
    }
  };

  const handleRequestReview = async (documentId) => {
    try {
      await api.post(`/kyc/documents/${documentId}/review`, {});
      message.success('Revue demandée');
      fetchData();
    } catch (error) {
      message.error('Erreur');
    }
  };

  const applyAutoRules = async (documentId) => {
    const hide = message.loading('Application...', 0);
    try {
      const res = await api.post(`/kyc/documents/${documentId}/auto-validate`, {});
      hide();
      if (res.data && res.data.auto_validated) {
        message.success(`Validé auto - ${res.data.reason || ''}`);
      } else {
        message.info(`En attente revue - ${res.data?.reason || ''}`);
      }
      fetchData();
    } catch (error) {
      hide();
      message.error('Erreur');
    }
  };

  const handleCreateRule = async (values) => {
    try {
      await api.post('/kyc/rules', values);
      message.success('Règle créée');
      setRulesModalVisible(false);
      newRuleForm.resetFields();
      fetchData();
    } catch (error) {
      message.error('Erreur création');
    }
  };

  // ========== COLONNES TABLEAU ==========
  const columns = [
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Client</span>,
      dataIndex: 'client_name', 
      key: 'client_name',
      width: 150,
      render: (text, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} size="small" style={{ background: COLORS.primary }} />
          <a onClick={() => handleViewDetails(record)} style={{ color: COLORS.primary }}>{text || '-'}</a>
        </Space>
      )
    },
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Document</span>,
      dataIndex: 'document_type', 
      key: 'document_type',
      width: 120,
      render: (type) => {
        const types = { 'passeport': 'Passeport', 'cin': 'CIN', 'permis': 'Permis' };
        return <span style={{ color: COLORS.textPrimary }}>{types[type] || type || '-'}</span>;
      }
    },
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Confiance</span>,
      dataIndex: 'confidence_score', 
      key: 'confidence_score',
      width: 120,
      render: (score) => {
        const val = Math.round(score || 0);
        return (
          <Tooltip title={`Confiance: ${val}%`}>
            <Progress 
              percent={val} 
              size="small" 
              format={() => `${val}%`}
              strokeColor={val > 70 ? COLORS.success : val > 40 ? COLORS.warning : COLORS.danger}
            />
          </Tooltip>
        );
      }
    },
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Risque</span>,
      dataIndex: 'fraud_risk', 
      key: 'fraud_risk',
      width: 100,
      render: (risk) => {
        const colors = { critical: 'red', high: 'orange', medium: 'gold', low: 'green' };
        const labels = { critical: 'Critique', high: 'Élevé', medium: 'Moyen', low: 'Faible' };
        return <Tag color={colors[risk] || 'default'} style={{ borderRadius: 12 }}>{labels[risk] || risk || 'Faible'}</Tag>;
      }
    },
    { 
      title: <span style={{ color: COLORS.textPrimary }}>Statut</span>,
      dataIndex: 'status', 
      key: 'status',
      width: 100,
      render: (status) => {
        const config = { 
          pending: { color: 'processing', text: 'En attente' }, 
          verified: { color: 'success', text: 'Vérifié' }, 
          rejected: { color: 'error', text: 'Rejeté' } 
        };
        const { color, text } = config[status] || { color: 'default', text: status || 'En attente' };
        return <Tag color={color} style={{ borderRadius: 12 }}>{text}</Tag>;
      }
    },
    {
      title: <span style={{ color: COLORS.textPrimary }}>Actions</span>,
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Détails">
            <Button size="small" icon={<EyeOutlined />} onClick={() => handleViewDetails(record)} style={{ borderRadius: 8 }} />
          </Tooltip>
          {record.status === 'pending' && (
            <>
              <Tooltip title="Vérifier">
                <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleVerify(record.id)} style={{ borderRadius: 8 }} />
              </Tooltip>
              <Tooltip title="Règles auto">
                <Button size="small" icon={<RobotOutlined />} onClick={() => applyAutoRules(record.id)} style={{ borderRadius: 8 }} />
              </Tooltip>
            </>
          )}
        </Space>
      )
    }
  ];

  // ========== RENDER ÉTAPES ==========
  const renderStep1 = () => (
    <div>
      <Alert 
        message="Pièce d'identité" 
        description="L'IA analysera votre document" 
        type="info" 
        showIcon 
        style={{ marginBottom: 24, borderRadius: 8, background: COLORS.primary + '20', border: `1px solid ${COLORS.primary}` }}
      />
      <Form.Item 
        name="client_name" 
        label={<span style={{ color: COLORS.textSecondary }}>Nom complet</span>} 
        rules={[{ required: true, message: 'Le nom est requis' }]}
      >
        <Input placeholder="Nom et prénom" style={{ borderRadius: 10 }} />
      </Form.Item>
      <Form.Item 
        name="client_email" 
        label={<span style={{ color: COLORS.textSecondary }}>Email</span>} 
        rules={[{ type: 'email', message: 'Email invalide' }]}
      >
        <Input type="email" placeholder="email@exemple.com" style={{ borderRadius: 10 }} />
      </Form.Item>
      <Form.Item name="client_phone" label={<span style={{ color: COLORS.textSecondary }}>Téléphone</span>}>
        <Input placeholder="+33 6 12 34 56 78" style={{ borderRadius: 10 }} />
      </Form.Item>
      <Form.Item name="client_birth_date" label={<span style={{ color: COLORS.textSecondary }}>Date de naissance</span>}>
        <DatePicker style={{ width: '100%', borderRadius: 10 }} format="DD/MM/YYYY" />
      </Form.Item>
      <Form.Item name="client_address" label={<span style={{ color: COLORS.textSecondary }}>Adresse</span>}>
        <TextArea rows={2} placeholder="Adresse" style={{ borderRadius: 10 }} />
      </Form.Item>
      <Divider style={{ borderColor: COLORS.border }} />
      <Form.Item 
        name="document_type" 
        label={<span style={{ color: COLORS.textSecondary }}>Type de document</span>} 
        rules={[{ required: true, message: 'Le type de document est requis' }]}
      >
        <Select placeholder="Sélectionnez" style={{ borderRadius: 10 }}>
          {documentTypes.map(doc => (
            <Option key={doc.value} value={doc.value}>
              <Space>{doc.icon}<span style={{ color: COLORS.textPrimary }}>{doc.label}</span></Space>
            </Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item name="document_number" label={<span style={{ color: COLORS.textSecondary }}>Numéro de document</span>}>
        <Input placeholder="Numéro" style={{ borderRadius: 10 }} />
      </Form.Item>
      <Form.Item name="issue_date" label={<span style={{ color: COLORS.textSecondary }}>Date de délivrance</span>}>
        <DatePicker style={{ width: '100%', borderRadius: 10 }} format="DD/MM/YYYY" />
      </Form.Item>
      <Form.Item name="expiry_date" label={<span style={{ color: COLORS.textSecondary }}>Date d'expiration</span>}>
        <DatePicker style={{ width: '100%', borderRadius: 10 }} format="DD/MM/YYYY" />
      </Form.Item>
      <Form.Item name="issuing_country" label={<span style={{ color: COLORS.textSecondary }}>Pays de délivrance</span>}>
        <Input placeholder="Pays" style={{ borderRadius: 10 }} />
      </Form.Item>

      <Divider style={{ borderColor: COLORS.border }}>
        <span style={{ color: COLORS.textSecondary }}>Documents (recto/verso)</span>
      </Divider>
      <Dragger 
        beforeUpload={handleDocumentUpload} 
        showUploadList={false} 
        multiple
        style={{ borderRadius: 12, background: COLORS.bgDark, borderColor: COLORS.border }}
      >
        <p className="ant-upload-drag-icon"><UploadOutlined style={{ color: COLORS.primary }} /></p>
        <p className="ant-upload-text" style={{ color: COLORS.textPrimary }}>Cliquez ou glissez les fichiers</p>
        <p className="ant-upload-hint" style={{ color: COLORS.textMuted }}>JPEG, PNG, PDF (max 10MB)</p>
      </Dragger>
      
      {documentList.map(doc => (
        <Card key={doc.id} size="small" style={{ marginTop: 8, background: COLORS.bgDark, borderColor: COLORS.border }}>
          <Row gutter={16} align="middle">
            <Col span={20}>
              <Space>
                <FileTextOutlined style={{ color: COLORS.primary }} />
                <span style={{ color: COLORS.textPrimary }}>{doc.name}</span>
                <Tag style={{ borderRadius: 12 }}>{(doc.size / 1024).toFixed(0)} KB</Tag>
              </Space>
            </Col>
            <Col span={4}>
              <Button danger icon={<DeleteOutlined />} onClick={() => removeDocument(doc.id)} style={{ borderRadius: 8 }} />
            </Col>
          </Row>
        </Card>
      ))}
    </div>
  );

  const renderStep2 = () => (
    <div>
      <Alert 
        message="Justificatif de domicile" 
        description="Document de moins de 3 mois" 
        type="info" 
        showIcon 
        style={{ marginBottom: 24, borderRadius: 8, background: COLORS.primary + '20', border: `1px solid ${COLORS.primary}` }}
      />
      <Form.Item name="proof_type" label={<span style={{ color: COLORS.textSecondary }}>Type de justificatif</span>}>
        <Select placeholder="Sélectionnez" style={{ borderRadius: 10 }}>
          {proofTypes.map(proof => (
            <Option key={proof.value} value={proof.value}>
              <Space>{proof.icon}<span style={{ color: COLORS.textPrimary }}>{proof.label}</span></Space>
            </Option>
          ))}
        </Select>
      </Form.Item>
      <Form.Item name="proof_date" label={<span style={{ color: COLORS.textSecondary }}>Date du document</span>}>
        <DatePicker style={{ width: '100%', borderRadius: 10 }} format="DD/MM/YYYY" />
      </Form.Item>

      <Divider style={{ borderColor: COLORS.border }}>
        <span style={{ color: COLORS.textSecondary }}>Justificatif</span>
      </Divider>
      <Dragger 
        beforeUpload={handleProofUpload} 
        showUploadList={false}
        style={{ borderRadius: 12, background: COLORS.bgDark, borderColor: COLORS.border }}
      >
        <p className="ant-upload-drag-icon"><UploadOutlined style={{ color: COLORS.primary }} /></p>
        <p className="ant-upload-text" style={{ color: COLORS.textPrimary }}>Cliquez ou glissez le fichier</p>
        <p className="ant-upload-hint" style={{ color: COLORS.textMuted }}>Facture EDF, quittance de loyer, attestation...</p>
      </Dragger>
      
      {proofFile && (
        <Card size="small" style={{ marginTop: 8, background: COLORS.bgDark, borderColor: COLORS.border }}>
          <Row gutter={16} align="middle">
            <Col span={20}>
              <Space>
                <FileTextOutlined style={{ color: COLORS.success }} />
                <span style={{ color: COLORS.textPrimary }}>{proofFile.name}</span>
              </Space>
            </Col>
            <Col span={4}>
              <Button danger icon={<DeleteOutlined />} onClick={() => setProofFile(null)} style={{ borderRadius: 8 }} />
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );

  const renderStep3 = () => (
    <div>
      <Alert 
        message="Vérification faciale" 
        description="Selfie avec votre pièce d'identité" 
        type="info" 
        showIcon 
        style={{ marginBottom: 24, borderRadius: 8, background: COLORS.primary + '20', border: `1px solid ${COLORS.primary}` }}
      />
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <CameraOutlined style={{ fontSize: 48, color: COLORS.primary }} />
        <p style={{ color: COLORS.textSecondary }}>Photo selfie avec votre pièce d'identité visible</p>
      </div>
      <Dragger 
        beforeUpload={handleSelfieUpload} 
        showUploadList={false}
        style={{ borderRadius: 12, background: COLORS.bgDark, borderColor: COLORS.border }}
      >
        <p className="ant-upload-drag-icon"><CameraOutlined style={{ color: COLORS.primary }} /></p>
        <p className="ant-upload-text" style={{ color: COLORS.textPrimary }}>Cliquez ou glissez votre selfie</p>
        <p className="ant-upload-hint" style={{ color: COLORS.textMuted }}>Photo où vous tenez votre pièce d'identité à côté de votre visage</p>
      </Dragger>
      {selfieFile && (
        <Card size="small" style={{ marginTop: 8, background: COLORS.bgDark, borderColor: COLORS.border }}>
          <Row gutter={16} align="middle">
            <Col span={20}>
              <Space>
                <CameraOutlined style={{ color: COLORS.warning }} />
                <span style={{ color: COLORS.textPrimary }}>{selfieFile.name}</span>
              </Space>
            </Col>
            <Col span={4}>
              <Button danger icon={<DeleteOutlined />} onClick={() => setSelfieFile(null)} style={{ borderRadius: 8 }} />
            </Col>
          </Row>
        </Card>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div>
      <Alert 
        message="Questionnaire KYC" 
        description="Complétez votre profil" 
        type="info" 
        showIcon 
        style={{ marginBottom: 24, borderRadius: 8, background: COLORS.primary + '20', border: `1px solid ${COLORS.primary}` }}
      />
      {kycQuestions.map((q) => (
        <Form.Item key={q.id} label={<span style={{ color: COLORS.textSecondary }}>{q.question}</span>}>
          <Select 
            placeholder="Sélectionnez"
            value={questionnaireAnswers[q.id]}
            onChange={(val) => handleQuestionnaireChange(q.id, val)}
            allowClear
            style={{ borderRadius: 10 }}
          >
            {q.options.map(opt => <Option key={opt} value={opt} style={{ color: COLORS.textPrimary }}>{opt}</Option>)}
          </Select>
        </Form.Item>
      ))}
      <Form.Item label={<span style={{ color: COLORS.textSecondary }}>Informations complémentaires</span>}>
        <TextArea rows={3} placeholder="Informations supplémentaires..." style={{ borderRadius: 10 }} />
      </Form.Item>
    </div>
  );

  if (loading && documents.length === 0) {
    return (
      <div style={{ ...styles.page, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" tip={<span style={{ color: COLORS.textPrimary }}>Chargement...</span>} ><div/></Spin>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div style={styles.page}>
        {/* EN-TÊTE */}
        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <div style={styles.header}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 52,
                    height: 52,
                    background: `linear-gradient(135deg, ${COLORS.success}, ${COLORS.primary})`,
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.3)',
                  }}>
                    <ScanOutlined style={{ fontSize: 26, color: COLORS.textPrimary }} />
                  </div>
                  <div>
                    <Title level={3} style={{ margin: 0, color: COLORS.textPrimary, fontWeight: 700 }}>
                      KYC Automatisé & Anti-Fraude IA
                    </Title>
                    <Text style={{ color: COLORS.textSecondary }}>
                      Vérification d'identité par IA • Détection de fraude en temps réel
                    </Text>
                  </div>
                </div>
              </div>
              <Space size="middle" wrap>
                <Button 
                  icon={<ReloadOutlined spin={refreshing} />} 
                  onClick={fetchData}
                  loading={refreshing}
                  style={{ borderRadius: 10, borderColor: COLORS.border, color: COLORS.textPrimary }}
                >
                  Actualiser
                </Button>
                <Button 
                  type="primary" 
                  icon={<UserOutlined />} 
                  onClick={() => setAddDocumentModalVisible(true)} 
                  style={{ background: COLORS.success, borderColor: COLORS.success, borderRadius: 10 }}
                >
                  Nouvelle demande
                </Button>
              </Space>
            </div>
          </div>
        </motion.div>

        {/* ALERTES FRAUDE */}
        {fraudAlerts.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <Alert
              message={`${fraudAlerts.length} alerte(s) de fraude détectée(s)`}
              type="error"
              showIcon
              style={{ marginBottom: 16, borderRadius: 12, background: COLORS.danger + '20', border: `1px solid ${COLORS.danger}` }}
            />
          </motion.div>
        )}

        {/* TECHNIQUES INNOVANTES */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15 }}>
          <Card style={styles.card}>
            <Row gutter={[16, 16]}>
              {innovativeTechniques.map((tech, idx) => (
                <Col xs={24} sm={12} lg={6} key={idx}>
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '16px 8px',
                    background: COLORS.bgDark,
                    borderRadius: 12,
                    borderTop: `3px solid ${tech.color}`
                  }}>
                    <div style={{ fontSize: 32, color: tech.color }}>{tech.icon}</div>
                    <Text style={{ color: COLORS.textPrimary, fontWeight: 600, display: 'block', marginTop: 8 }}>
                      {tech.title}
                    </Text>
                    <Tag color={tech.color} style={{ marginTop: 8, borderRadius: 12 }}>{tech.benefit}</Tag>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </motion.div>

        {/* FILTRES */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card style={{ ...styles.card, marginTop: 16, marginBottom: 16 }}>
            <Row gutter={[16, 16]} align="middle">
              <Col xs={24} sm={12} md={4}>
                <Select 
                  placeholder="Statut" 
                  style={{ width: '100%', borderRadius: 10 }} 
                  value={filterStatus} 
                  onChange={setFilterStatus}
                >
                  <Option value="all">Tous</Option>
                  <Option value="pending">En attente</Option>
                  <Option value="verified">Vérifié</Option>
                  <Option value="rejected">Rejeté</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Select 
                  placeholder="Type" 
                  style={{ width: '100%', borderRadius: 10 }} 
                  value={filterDocument} 
                  onChange={setFilterDocument}
                >
                  <Option value="all">Tous</Option>
                  <Option value="passeport">Passeport</Option>
                  <Option value="cin">CIN</Option>
                  <Option value="permis">Permis</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={4}>
                <Select 
                  placeholder="Risque IA" 
                  style={{ width: '100%', borderRadius: 10 }} 
                  value={filterFraudRisk} 
                  onChange={setFilterFraudRisk}
                >
                  <Option value="all">Tous</Option>
                  <Option value="high">Élevé</Option>
                  <Option value="medium">Moyen</Option>
                  <Option value="low">Faible</Option>
                </Select>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <RangePicker style={{ width: '100%', borderRadius: 10 }} onChange={setDateRange} />
              </Col>
              <Col xs={24} sm={24} md={4}>
                <Button 
                  icon={<FilterOutlined />} 
                  onClick={() => { 
                    setFilterStatus('all'); 
                    setFilterDocument('all'); 
                    setFilterFraudRisk('all'); 
                    setDateRange(null); 
                  }} 
                  block
                  style={{ borderRadius: 10, borderColor: COLORS.border, color: COLORS.textPrimary }}
                >
                  Reset
                </Button>
              </Col>
            </Row>
          </Card>
        </motion.div>

        {/* KPIS */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }}>
          <Row gutter={[16, 16]}>
            <Col xs={12} md={6}>
              <div style={styles.kpiCard}>
                <Statistic 
                  title={<span style={{ color: COLORS.textSecondary }}>En attente</span>} 
                  value={stats.pending} 
                  valueStyle={{ color: COLORS.warning }} 
                  prefix={<ClockCircleOutlined />} 
                />
              </div>
            </Col>
            <Col xs={12} md={6}>
              <div style={styles.kpiCard}>
                <Statistic 
                  title={<span style={{ color: COLORS.textSecondary }}>Vérifiés</span>} 
                  value={stats.verified} 
                  valueStyle={{ color: COLORS.success }} 
                  prefix={<CheckCircleOutlined />} 
                />
              </div>
            </Col>
            <Col xs={12} md={6}>
              <div style={styles.kpiCard}>
                <Statistic 
                  title={<span style={{ color: COLORS.textSecondary }}>Fraude détectée</span>} 
                  value={stats.fraudDetected} 
                  valueStyle={{ color: COLORS.danger }} 
                  prefix={<WarningOutlined />} 
                />
              </div>
            </Col>
            <Col xs={12} md={6}>
              <div style={styles.kpiCard}>
                <Statistic 
                  title={<span style={{ color: COLORS.textSecondary }}>Prévention</span>} 
                  value={stats.fraudPreventionRate} 
                  suffix="%" 
                  valueStyle={{ color: COLORS.primary }} 
                  prefix={<SafetyOutlined />} 
                />
              </div>
            </Col>
          </Row>
        </motion.div>

        {/* TABLEAU */}
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.3 }}>
          <Card style={{ ...styles.card, marginTop: 16 }}>
            <Table 
              columns={columns} 
              dataSource={documents} 
              rowKey="id" 
              pagination={{ pageSize: 10 }}
              scroll={{ x: true }}
              className="kyc-table-dark"
            />
          </Card>
        </motion.div>

        {/* ============================================
            MODAL NOUVELLE DEMANDE
            ============================================ */}
        <Modal
          title={<Space><RobotOutlined style={{ color: COLORS.primary }} /> <span style={{ color: COLORS.textPrimary }}>Nouvelle demande KYC</span></Space>}
          open={addDocumentModalVisible}
          onCancel={() => { 
            setAddDocumentModalVisible(false); 
            setCurrentStep(0); 
            setDocumentList([]); 
            setSelfieFile(null); 
            setProofFile(null); 
            setQuestionnaireAnswers({}); 
            kycForm.resetFields(); 
          }}
          footer={null}
          width={800}
          styles={{ body: { background: COLORS.bgCard }, header: { background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}` } }}
        >
          <Form form={kycForm} layout="vertical">
            <Steps 
              current={currentStep} 
              onChange={setCurrentStep} 
              items={[
                { title: 'Identité', icon: <IdcardOutlined /> },
                { title: 'Domicile', icon: <HomeOutlined /> },
                { title: 'Visage', icon: <CameraOutlined /> },
                { title: 'Questionnaire', icon: <FormOutlined /> }
              ]} 
              style={{ marginBottom: 24 }}
            />
            
            {currentStep === 0 && renderStep1()}
            {currentStep === 1 && renderStep2()}
            {currentStep === 2 && renderStep3()}
            {currentStep === 3 && renderStep4()}
            
            <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
              <Button 
                onClick={() => setCurrentStep(p => p - 1)} 
                disabled={currentStep === 0}
                style={{ borderRadius: 10, borderColor: COLORS.border, color: COLORS.textPrimary }}
              >
                Précédent
              </Button>
              {currentStep < 3 ? (
                <Button 
                  type="primary" 
                  onClick={() => setCurrentStep(p => p + 1)}
                  style={{ borderRadius: 10 }}
                >
                  Suivant
                </Button>
              ) : (
                <Button 
                  type="primary" 
                  onClick={handleSubmitKYC} 
                  loading={uploadLoading} 
                  icon={<RobotOutlined />}
                  style={{ background: COLORS.success, borderColor: COLORS.success, borderRadius: 10 }}
                >
                  {uploadLoading ? 'Analyse en cours...' : 'Soumettre'}
                </Button>
              )}
            </div>
          </Form>
        </Modal>

        {/* ============================================
            MODAL DÉTAILS
            ============================================ */}
        {selectedDocument && selectedDocument.id && (
          <Modal
            title={<span style={{ color: COLORS.textPrimary }}>Détails - {selectedDocument.document_id || 'Document'}</span>}
            open={detailsModalVisible}
            onCancel={() => setDetailsModalVisible(false)}
            width={700}
            footer={[
              <Button key="close" onClick={() => setDetailsModalVisible(false)} style={{ borderRadius: 8 }}>Fermer</Button>,
              selectedDocument.status === 'pending' && (
                <>
                  <Button key="review" onClick={() => { handleRequestReview(selectedDocument.id); setDetailsModalVisible(false); }} style={{ borderRadius: 8 }}>Revue</Button>
                  <Button key="reject" danger onClick={() => { setDetailsModalVisible(false); setRejectModalVisible(true); }} style={{ borderRadius: 8 }}>Rejeter</Button>
                  <Button key="verify" type="primary" onClick={() => handleVerify(selectedDocument.id)} style={{ borderRadius: 8 }}>Vérifier</Button>
                </>
              )
            ]}
            styles={{ body: { background: COLORS.bgCard }, header: { background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}` } }}
          >
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label={<span style={{ color: COLORS.textSecondary }}>Client</span>}>
                <span style={{ color: COLORS.textPrimary }}>{selectedDocument.client_name || '-'}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: COLORS.textSecondary }}>Document</span>}>
                <span style={{ color: COLORS.textPrimary }}>{selectedDocument.document_type || '-'}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: COLORS.textSecondary }}>Score IA</span>}>
                <span style={{ color: COLORS.textPrimary }}>{selectedDocument.confidence_score || 0}%</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: COLORS.textSecondary }}>Risque</span>}>
                <span style={{ color: COLORS.textPrimary }}>{selectedDocument.fraud_risk || 'low'}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: COLORS.textSecondary }}>Statut</span>}>
                <span style={{ color: COLORS.textPrimary }}>{selectedDocument.status || 'pending'}</span>
              </Descriptions.Item>
            </Descriptions>
            {selectedDocument.fraud_indicators && selectedDocument.fraud_indicators.length > 0 && (
              <Card size="small" title={<span style={{ color: COLORS.textPrimary }}>Indicateurs</span>} style={{ marginTop: 16, background: COLORS.bgDark, borderColor: COLORS.border }}>
                <Space wrap>
                  {selectedDocument.fraud_indicators.map((ind, i) => (
                    <Tag key={i} color="red" style={{ borderRadius: 12 }}>{ind}</Tag>
                  ))}
                </Space>
              </Card>
            )}
          </Modal>
        )}

        {/* ============================================
            MODAL REJET
            ============================================ */}
        <Modal 
          title={<span style={{ color: COLORS.textPrimary }}>Rejeter</span>} 
          open={rejectModalVisible} 
          onCancel={() => { setRejectModalVisible(false); setRejectReason(''); }} 
          onOk={handleReject}
          styles={{ body: { background: COLORS.bgCard }, header: { background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}` } }}
        >
          <TextArea 
            rows={4} 
            value={rejectReason} 
            onChange={(e) => setRejectReason(e.target.value)} 
            placeholder="Raison du rejet..."
            style={{ borderRadius: 10 }}
          />
        </Modal>

        {/* ============================================
            MODAL ANALYSE FRAUDE
            ============================================ */}
        <Modal 
          title={<Space><WarningOutlined style={{ color: COLORS.danger }} /> <span style={{ color: COLORS.textPrimary }}>Analyse Anti-Fraude</span></Space>} 
          open={fraudModalVisible} 
          onCancel={() => setFraudModalVisible(false)} 
          footer={[<Button key="close" onClick={() => setFraudModalVisible(false)} style={{ borderRadius: 8 }}>Fermer</Button>]}
          width={600}
          styles={{ body: { background: COLORS.bgCard }, header: { background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}` } }}
        >
          {fraudAnalysis && (
            <div>
              <Alert 
                message={`Score: ${fraudAnalysis.fraud_score}% - ${fraudAnalysis.fraud_level}`} 
                type="error" 
                showIcon 
                style={{ borderRadius: 8, background: COLORS.danger + '20', border: `1px solid ${COLORS.danger}` }}
              />
              <Card 
                title={<span style={{ color: COLORS.textPrimary }}>Indicateurs</span>} 
                style={{ marginTop: 16, background: COLORS.bgDark, borderColor: COLORS.border }}
              >
                <Space wrap>
                  {fraudAnalysis.indicators?.map((ind, i) => (
                    <Tag key={i} color="red" style={{ borderRadius: 12 }}>{ind}</Tag>
                  ))}
                </Space>
              </Card>
              <Card 
                title={<span style={{ color: COLORS.textPrimary }}>Recommandation</span>} 
                style={{ marginTop: 16, background: COLORS.bgDark, borderColor: COLORS.border }}
              >
                <Alert 
                  message={fraudAnalysis.recommendation} 
                  type="info" 
                  style={{ borderRadius: 8, background: COLORS.primary + '20', border: `1px solid ${COLORS.primary}` }}
                />
              </Card>
            </div>
          )}
        </Modal>

        {/* ============================================
            MODAL RÈGLES
            ============================================ */}
        <Modal 
          title={<span style={{ color: COLORS.textPrimary }}>Règles IA</span>} 
          open={rulesModalVisible} 
          onCancel={() => setRulesModalVisible(false)} 
          width={500} 
          footer={[<Button key="close" onClick={() => setRulesModalVisible(false)} style={{ borderRadius: 8 }}>Fermer</Button>]}
          styles={{ body: { background: COLORS.bgCard }, header: { background: COLORS.bgCard, borderBottom: `1px solid ${COLORS.border}` } }}
        >
          <Form form={newRuleForm} layout="vertical" onFinish={handleCreateRule}>
            <Form.Item name="rule_name" label={<span style={{ color: COLORS.textSecondary }}>Nom</span>} rules={[{ required: true }]}>
              <Input style={{ borderRadius: 10 }} />
            </Form.Item>
            <Form.Item name="rule_type" label={<span style={{ color: COLORS.textSecondary }}>Type</span>} rules={[{ required: true }]}>
              <Select style={{ borderRadius: 10 }}>
                <Option value="confidence_score">Score confiance</Option>
                <Option value="fraud_score">Score fraude</Option>
              </Select>
            </Form.Item>
            <Form.Item name="operator" label={<span style={{ color: COLORS.textSecondary }}>Opérateur</span>} rules={[{ required: true }]}>
              <Select style={{ borderRadius: 10 }}>
                <Option value="gte">{'≥'}</Option>
                <Option value="lte">{'≤'}</Option>
              </Select>
            </Form.Item>
            <Form.Item name="value" label={<span style={{ color: COLORS.textSecondary }}>Valeur</span>} rules={[{ required: true }]}>
              <InputNumber style={{ width: '100%', borderRadius: 10 }} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" htmlType="submit" block style={{ borderRadius: 10 }}>
                Ajouter
              </Button>
            </Form.Item>
          </Form>
        </Modal>

        {/* STYLES CSS GLOBAUX */}
        <style>{`
          .kyc-table-dark .ant-table {
            background: transparent !important;
            color: ${COLORS.textPrimary} !important;
          }
          .kyc-table-dark .ant-table-thead > tr > th {
            background: ${COLORS.bgDark} !important;
            color: ${COLORS.textSecondary} !important;
            font-weight: 600 !important;
            border-bottom: 1px solid ${COLORS.border} !important;
          }
          .kyc-table-dark .ant-table-tbody > tr > td {
            background: ${COLORS.bgCard} !important;
            color: ${COLORS.textPrimary} !important;
            border-color: ${COLORS.border} !important;
          }
          .kyc-table-dark .ant-table-tbody > tr:hover > td {
            background: ${COLORS.bgCardHover} !important;
          }
          .ant-table-pagination .ant-pagination-item a {
            color: ${COLORS.textPrimary} !important;
          }
          .ant-pagination-item-active {
            border-color: ${COLORS.primary} !important;
          }
          .ant-pagination-item-active a {
            color: ${COLORS.primary} !important;
          }
          .ant-steps-item-title {
            color: ${COLORS.textPrimary} !important;
          }
          .ant-steps-item-description {
            color: ${COLORS.textSecondary} !important;
          }
          .ant-steps-item-wait .ant-steps-item-icon {
            background: ${COLORS.bgDark} !important;
            border-color: ${COLORS.border} !important;
          }
          .ant-steps-item-wait .ant-steps-item-icon .ant-steps-icon {
            color: ${COLORS.textSecondary} !important;
          }
          .ant-select-selector {
            background: ${COLORS.bgCard} !important;
            border-color: ${COLORS.border} !important;
            color: ${COLORS.textPrimary} !important;
            border-radius: 10px !important;
          }
          .ant-select-dropdown {
            background: ${COLORS.bgCard} !important;
          }
          .ant-select-item-option {
            color: ${COLORS.textPrimary} !important;
          }
          .ant-select-item-option:hover {
            background: ${COLORS.bgCardHover} !important;
          }
          .ant-input {
            background: ${COLORS.bgCard} !important;
            border-color: ${COLORS.border} !important;
            color: ${COLORS.textPrimary} !important;
          }
          .ant-input:hover, .ant-input:focus {
            border-color: ${COLORS.primary} !important;
          }
          .ant-picker {
            background: ${COLORS.bgCard} !important;
            border-color: ${COLORS.border} !important;
            color: ${COLORS.textPrimary} !important;
          }
          .ant-picker-input > input {
            color: ${COLORS.textPrimary} !important;
          }
          .ant-modal-content {
            background: ${COLORS.bgCard} !important;
          }
          .ant-modal-close {
            color: ${COLORS.textSecondary} !important;
          }
          .ant-modal-close:hover {
            color: ${COLORS.textPrimary} !important;
          }
          .ant-descriptions-item-label {
            background: ${COLORS.bgDark} !important;
            color: ${COLORS.textSecondary} !important;
            border-color: ${COLORS.border} !important;
          }
          .ant-descriptions-item-content {
            background: ${COLORS.bgCard} !important;
            color: ${COLORS.textPrimary} !important;
            border-color: ${COLORS.border} !important;
          }
          .ant-form-item-label > label {
            color: ${COLORS.textSecondary} !important;
          }
          .ant-input-number {
            background: ${COLORS.bgCard} !important;
            border-color: ${COLORS.border} !important;
            color: ${COLORS.textPrimary} !important;
          }
          .ant-input-number-input {
            color: ${COLORS.textPrimary} !important;
          }
          .ant-upload-drag {
            background: ${COLORS.bgDark} !important;
            border-color: ${COLORS.border} !important;
          }
          .ant-upload-text {
            color: ${COLORS.textPrimary} !important;
          }
          .ant-upload-hint {
            color: ${COLORS.textMuted} !important;
          }
          .ant-upload-drag-icon {
            color: ${COLORS.primary} !important;
          }
        `}</style>
      </div>
    </ErrorBoundary>
  );
};

export default KYCAutomation;