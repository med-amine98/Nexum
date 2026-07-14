// src/modules/claims/DamageEstimation.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Card, Row, Col, Upload, Button, Slider,
  InputNumber, Tag, Divider, Alert, Table,
  List, Space, Typography, message, Progress,
  Spin, Statistic, Steps, Timeline, Modal,
  Descriptions, Badge, Tooltip, Rate, Collapse,
  Select, Switch, Radio, Result, Image, Input,
  Avatar, Drawer, Tabs, Empty, Skeleton, Popconfirm
} from 'antd';
import {
  CameraOutlined, CalculatorOutlined,
  ToolOutlined, CarOutlined, HomeOutlined,
  CheckCircleOutlined, WarningOutlined,
  ThunderboltOutlined, ClockCircleOutlined,
  EuroOutlined, PercentageOutlined, SafetyOutlined,
  HistoryOutlined, ExperimentOutlined, RobotOutlined,
  DownloadOutlined, ShareAltOutlined, PrinterOutlined,
  EyeOutlined, DeleteOutlined, PlusOutlined,
  LineChartOutlined, BarChartOutlined, HeartOutlined,
  CloudOutlined, ThunderboltFilled,
  ShopOutlined, RocketOutlined, FireOutlined,
  BugOutlined, GlobalOutlined, SecurityScanOutlined,
  ReloadOutlined, UserOutlined, TeamOutlined,
  SendOutlined, ArrowRightOutlined, PhoneOutlined,
  MailOutlined, CalendarOutlined, StarOutlined,
  EnvironmentOutlined, DollarOutlined, FileTextOutlined,
  AppstoreOutlined, ExperimentFilled, EditOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import { Line, Column, Gauge } from '@ant-design/charts';
import io from 'socket.io-client';
import './DamageEstimation.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;
// Configuration API
const WS_BASE = process.env.REACT_APP_WS_URL || 'http://localhost:8000';

// ============================================
// TYPES DE SINISTRES (Configuration)
// ============================================
const CLAIM_TYPES = {
  accident: {
    id: 'accident',
    name: 'Accident automobile',
    icon: <CarOutlined />,
    color: '#ff4d4f',
    endpoint: '/damage/detect-realtime',
    description: 'Analyse des dégâts sur le véhicule',
    repairTypes: [
      { name: 'Réparation standard', multiplier: 1.0, delay: 3, warranty: 12 },
      { name: 'Réparation premium', multiplier: 1.5, delay: 2, warranty: 24 },
      { name: 'Remplacement total', multiplier: 2.0, delay: 7, warranty: 36 }
    ]
  },
  habitation: {
    id: 'habitation',
    name: 'Sinistre habitation',
    icon: <HomeOutlined />,
    color: '#1890ff',
    endpoint: '/damage/detect-realtime',
    description: 'Analyse des dégâts sur l\'habitation',
    repairTypes: [
      { name: 'Réparation standard', multiplier: 1.0, delay: 5, warranty: 12 },
      { name: 'Rénovation complète', multiplier: 2.0, delay: 10, warranty: 48 },
      { name: 'Reconstruction', multiplier: 3.0, delay: 30, warranty: 60 }
    ]
  },
  agricole: {
    id: 'agricole',
    name: 'Sinistre agricole',
    icon: <ToolOutlined />,
    color: '#52c41a',
    endpoint: '/damage/detect-realtime',
    description: 'Analyse des maladies et dégâts climatiques',
    repairTypes: [
      { name: 'Traitement standard', multiplier: 1.0, delay: 7, warranty: 6 },
      { name: 'Traitement intensif', multiplier: 1.8, delay: 14, warranty: 12 }
    ]
  },
  sante: {
    id: 'sante',
    name: 'Santé',
    icon: <HeartOutlined />,
    color: '#722ed1',
    endpoint: '/damage/detect-realtime',
    description: 'Analyse des documents médicaux',
    repairTypes: [
      { name: 'Remboursement standard', multiplier: 0.7, delay: 14, warranty: 0 },
      { name: 'Prise en charge mutuelle', multiplier: 1.0, delay: 7, warranty: 0 }
    ]
  },
  catastrophe_naturelle: {
    id: 'catastrophe_naturelle',
    name: 'Catastrophe naturelle',
    icon: <CloudOutlined />,
    color: '#13c2c2',
    endpoint: '/damage/detect-realtime',
    description: 'Analyse des dégâts causés par : inondation, tempête, séisme, incendie de forêt',
    repairTypes: [
      { name: 'Réparation standard', multiplier: 1.0, delay: 10, warranty: 12 },
      { name: 'Rénovation complète', multiplier: 2.0, delay: 20, warranty: 24 },
      { name: 'Reconstruction', multiplier: 3.5, delay: 45, warranty: 60 }
    ]
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber / Piratage',
    icon: <SecurityScanOutlined />,
    color: '#fa8c16',
    endpoint: '/damage/detect-realtime',
    description: 'Analyse des dommages liés aux cyberattaques',
    repairTypes: [
      { name: 'Audit de sécurité', multiplier: 1.0, delay: 3, warranty: 3 },
      { name: 'Restauration complète', multiplier: 1.5, delay: 7, warranty: 6 },
      { name: 'Protection renforcée', multiplier: 2.0, delay: 14, warranty: 12 }
    ]
  },
  transport: {
    id: 'transport',
    name: 'Transport / Logistique',
    icon: <ToolOutlined />,
    color: '#2f54eb',
    endpoint: '/damage/detect-realtime',
    description: 'Analyse des colis endommagés, volés ou perdus',
    repairTypes: [
      { name: 'Remboursement standard', multiplier: 1.0, delay: 5, warranty: 0 },
      { name: 'Indemnisation rapide', multiplier: 1.2, delay: 2, warranty: 0 }
    ]
  },
  electronique: {
    id: 'electronique',
    name: 'Électronique / Casse',
    icon: <ThunderboltOutlined />,
    color: '#eb2f96',
    endpoint: '/damage/detect-realtime',
    description: 'Analyse des appareils électroniques endommagés',
    repairTypes: [
      { name: 'Réparation standard', multiplier: 1.0, delay: 3, warranty: 6 },
      { name: 'Remplacement à neuf', multiplier: 1.5, delay: 2, warranty: 12 }
    ]
  },
  voyage: {
    id: 'voyage',
    name: 'Voyage / Annulation',
    icon: <GlobalOutlined />,
    color: '#13c2c2',
    endpoint: '/damage/detect-realtime',
    description: 'Analyse des annulations, retards, bagages perdus',
    repairTypes: [
      { name: 'Remboursement standard', multiplier: 1.0, delay: 14, warranty: 0 },
      { name: 'Indemnisation rapide', multiplier: 1.3, delay: 5, warranty: 0 }
    ]
  },
  entreprise: {
    id: 'entreprise',
    name: 'Sinistre professionnel',
    icon: <ShopOutlined />,
    color: '#faad14',
    endpoint: '/damage/detect-realtime',
    description: 'Analyse des sinistres en entreprise',
    repairTypes: [
      { name: 'Réparation standard', multiplier: 1.0, delay: 7, warranty: 12 },
      { name: 'Remplacage neuf', multiplier: 1.8, delay: 14, warranty: 24 },
      { name: 'Indemnisation activité', multiplier: 2.0, delay: 21, warranty: 0 }
    ]
  },
  animal: {
    id: 'animal',
    name: 'Animal de compagnie',
    icon: <BugOutlined />,
    color: '#52c41a',
    endpoint: '/damage/detect-realtime',
    description: 'Analyse des frais vétérinaires et accidents d\'animaux',
    repairTypes: [
      { name: 'Remboursement standard', multiplier: 1.0, delay: 7, warranty: 0 },
      { name: 'Prise en charge complète', multiplier: 1.5, delay: 3, warranty: 0 }
    ]
  }
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
const DamageEstimation = () => {
  // États principaux
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [estimation, setEstimation] = useState(null);
  const [repairOptions, setRepairOptions] = useState([]);
  const [selectedOption, setSelectedOption] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [confidenceHistory, setConfidenceHistory] = useState([]);
  const [recommendedParts, setRecommendedParts] = useState([]);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedClaimType, setSelectedClaimType] = useState('accident');
  const [annotatedImage, setAnnotatedImage] = useState(null);
  const [originalImage, setOriginalImage] = useState(null);
  
  // États pour les experts humains
  const [experts, setExperts] = useState([]);
  const [expertsLoading, setExpertsLoading] = useState(false);
  const [selectedExpert, setSelectedExpert] = useState(null);
  const [expertDrawerVisible, setExpertDrawerVisible] = useState(false);
  const [addExpertVisible, setAddExpertVisible] = useState(false);
  const [editExpertVisible, setEditExpertVisible] = useState(false);
  const [editingExpert, setEditingExpert] = useState(null);
  const [expertMessages, setExpertMessages] = useState([]);
  const [expertInput, setExpertInput] = useState('');
  const [activeTab, setActiveTab] = useState('analysis');

  // ============================================
  // CHARGEMENT DES EXPERTS HUMAINS
  // ============================================
  const loadExperts = async () => {
    setExpertsLoading(true);
    try {
      const response = await api.get('/insurance/experts');
      if (response.data && response.data.length > 0) {
        setExperts(response.data);
      } else {
        // Fallback: experts par défaut
        const defaultExperts = getDefaultExperts();
        setExperts(defaultExperts);
        localStorage.setItem('insurance_experts', JSON.stringify(defaultExperts));
      }
    } catch (error) {
      // En cas d'erreur, charger depuis localStorage
      const savedExperts = localStorage.getItem('insurance_experts');
      if (savedExperts) {
        setExperts(JSON.parse(savedExperts));
      } else {
        setExperts(getDefaultExperts());
      }
    } finally {
      setExpertsLoading(false);
    }
  };

  const getDefaultExperts = () => {
    return [
      {
        id: 'expert_dupont',
        name: 'Jean Dupont',
        title: 'Expert Sinistres Automobile',
        specialty: 'Expertise automobile, évaluation des dégâts',
        phone: '+33 6 12 34 56 78',
        email: 'jean.dupont@experts-assurance.fr',
        location: 'Paris, France',
        rating: 4.9,
        reviews: 127,
        available: true,
        experience: '15 ans',
        languages: ['Français', 'Anglais'],
        hourlyRate: 150,
        responseTime: '< 2h',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=jean`,
        color: '#1890ff',
        description: 'Expert en sinistres automobiles avec 15 ans d\'expérience.',
        expertise: ['Expertise auto', 'Estimation des dégâts', 'Rapports d\'expertise']
      },
      {
        id: 'expert_martin',
        name: 'Sophie Martin',
        title: 'Expert en Sinistres Habitation',
        specialty: 'Construction, rénovation, dégâts des eaux',
        phone: '+33 6 23 45 67 89',
        email: 'sophie.martin@experts-assurance.fr',
        location: 'Lyon, France',
        rating: 4.8,
        reviews: 98,
        available: true,
        experience: '12 ans',
        languages: ['Français', 'Espagnol'],
        hourlyRate: 130,
        responseTime: '< 3h',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=sophie`,
        color: '#52c41a',
        description: 'Spécialiste des sinistres habitation, construction et rénovation.',
        expertise: ['Construction', 'Dégâts des eaux', 'Rénovation']
      },
      {
        id: 'expert_bernard',
        name: 'Dr. Pierre Bernard',
        title: 'Expert Médical en Assurance',
        specialty: 'Préjudice corporel, handicap, indemnisation',
        phone: '+33 6 34 56 78 90',
        email: 'pierre.bernard@experts-assurance.fr',
        location: 'Marseille, France',
        rating: 4.9,
        reviews: 156,
        available: false,
        experience: '20 ans',
        languages: ['Français', 'Anglais', 'Italien'],
        hourlyRate: 200,
        responseTime: '< 12h',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=pierre`,
        color: '#722ed1',
        description: 'Médecin conseil en assurance, spécialiste des préjudices corporels.',
        expertise: ['Préjudice corporel', 'Handicap', 'Indemnisation']
      },
      {
        id: 'expert_robert',
        name: 'Marie Robert',
        title: 'Expert en Sinistres Agricoles',
        specialty: 'Élevage, cultures, dommages climatiques',
        phone: '+33 6 45 67 89 01',
        email: 'marie.robert@experts-assurance.fr',
        location: 'Toulouse, France',
        rating: 4.7,
        reviews: 82,
        available: true,
        experience: '10 ans',
        languages: ['Français'],
        hourlyRate: 120,
        responseTime: '< 4h',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=marie`,
        color: '#fa8c16',
        description: 'Experte en sinistres agricoles avec une connaissance approfondie du monde rural.',
        expertise: ['Cultures', 'Élevage', 'Dommages climatiques']
      },
      {
        id: 'expert_dubois',
        name: 'Thomas Dubois',
        title: 'Expert Cyber Sécurité',
        specialty: 'Cyberattaques, RGPD, violation de données',
        phone: '+33 6 56 78 90 12',
        email: 'thomas.dubois@experts-assurance.fr',
        location: 'Lille, France',
        rating: 4.8,
        reviews: 63,
        available: true,
        experience: '8 ans',
        languages: ['Français', 'Anglais'],
        hourlyRate: 180,
        responseTime: '< 1h',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=thomas`,
        color: '#13c2c2',
        description: 'Expert en cyber sécurité spécialisé dans les sinistres numériques.',
        expertise: ['Cyber sécurité', 'RGPD', 'Violation de données']
      },
      {
        id: 'expert_garcia',
        name: 'Elena Garcia',
        title: 'Expert en Sinistres Maritimes',
        specialty: 'Transport maritime, logistique, avaries',
        phone: '+33 6 67 89 01 23',
        email: 'elena.garcia@experts-assurance.fr',
        location: 'Marseille, France',
        rating: 4.6,
        reviews: 45,
        available: true,
        experience: '7 ans',
        languages: ['Français', 'Espagnol', 'Anglais'],
        hourlyRate: 160,
        responseTime: '< 5h',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=elena`,
        color: '#2f54eb',
        description: 'Spécialiste des sinistres maritimes et logistique portuaire.',
        expertise: ['Transport maritime', 'Logistique', 'Avaries']
      }
    ];
  };

  // ============================================
  // GESTION DE LA DISPONIBILITÉ DES EXPERTS
  // ============================================
  const toggleExpertAvailability = (expertId) => {
    const updatedExperts = experts.map(expert => {
      if (expert.id === expertId) {
        return { ...expert, available: !expert.available };
      }
      return expert;
    });
    
    setExperts(updatedExperts);
    localStorage.setItem('insurance_experts', JSON.stringify(updatedExperts));
    
    const expert = updatedExperts.find(e => e.id === expertId);
    message.success(`Expert ${expert?.name} ${expert?.available ? 'activé' : 'désactivé'} avec succès`);
  };

  // ============================================
  // AJOUT D'UN EXPERT
  // ============================================
  const handleAddExpert = (newExpert) => {
    const updatedExperts = [...experts, newExpert];
    setExperts(updatedExperts);
    localStorage.setItem('insurance_experts', JSON.stringify(updatedExperts));
    message.success(`Expert ${newExpert.name} ajouté avec succès !`);
  };

  // ============================================
  // MODIFICATION D'UN EXPERT
  // ============================================
  const handleEditExpert = (expert) => {
    setEditingExpert(expert);
    setEditExpertVisible(true);
  };

  const handleSaveExpert = (updatedExpert) => {
    const updatedExperts = experts.map(e => 
      e.id === updatedExpert.id ? updatedExpert : e
    );
    setExperts(updatedExperts);
    localStorage.setItem('insurance_experts', JSON.stringify(updatedExperts));
    message.success(`Expert ${updatedExpert.name} modifié avec succès !`);
    setEditExpertVisible(false);
    setEditingExpert(null);
  };

  const handleDeleteExpert = (expertId) => {
    const updatedExperts = experts.filter(e => e.id !== expertId);
    setExperts(updatedExperts);
    localStorage.setItem('insurance_experts', JSON.stringify(updatedExperts));
    message.success('Expert supprimé avec succès');
  };

  // ============================================
  // WEBSOCKET
  // ============================================
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      return;
    }

    try {
      const newSocket = io(WS_BASE, {
        transports: ['websocket', 'polling'],
        path: '/socket.io',
        reconnection: true,
        reconnectionAttempts: 3,
        reconnectionDelay: 1000,
        timeout: 10000
      });
      
      newSocket.on('connect', () => {
        setIsConnected(true);
      });
      
      newSocket.on('connect_error', (error) => {
        console.warn('⚠️ WebSocket connection error:', error.message);
        setIsConnected(false);
      });
      
      newSocket.on('disconnect', () => {
        setIsConnected(false);
      });
      
      newSocket.on('analysis_progress', (data) => {
        setProcessingProgress(data.progress || 0);
      });
      
      newSocket.on('confidence_update', (data) => {
        setConfidenceHistory(prev => [...prev.slice(-19), { time: new Date(), value: data.confidence || 85 }]);
      });
      
      setSocket(newSocket);
      
      return () => {
        if (newSocket) newSocket.close();
      };
    } catch (error) {
      console.warn('WebSocket non disponible:', error.message);
    }
  }, []);

  // Chargement initial des experts
  useEffect(() => {
    loadExperts();
  }, []);

  // ============================================
  // ANALYSE DES DÉGÂTS
  // ============================================
  const handlePhotoUpload = async (file) => {
    const config = CLAIM_TYPES[selectedClaimType];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('claim_type', selectedClaimType);
    
    setAnalyzing(true);
    setProcessingProgress(0);
    const imageUrl = URL.createObjectURL(file);
    setOriginalImage(imageUrl);
    setAnnotatedImage(null);
    
    const progressInterval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 85) return prev;
        return prev + 5;
      });
    }, 500);
    
    try {
      const response = await api.post(config.endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });
      
      clearInterval(progressInterval);
      setProcessingProgress(100);
      
      const result = response.data;
      
      if (result.success || result.status === 'success') {
        const damageDetections = result.damaged_parts || result.damage_detections || result.detections || [];
        const damageCount = damageDetections.length;
        
        if (result.annotated_image) {
          setAnnotatedImage(`data:image/png;base64,${result.annotated_image}`);
        }
        
        const estimatedCost = result.total_estimated_cost || (damageCount > 0 ? 500 : 0);
        const confidence = result.severity_score || result.confidence || (damageCount > 0 ? 85 : 95);
        const severity = result.severity || (damageCount > 0 ? (damageCount > 3 ? 'critique' : 'modéré') : 'aucun');
        
        const details = damageDetections.map((d, idx) => ({
          key: idx,
          part: d.part || d.class || d.damage_type || 'Zone détectée',
          damage: d.damage_type || d.type || 'Dégât détecté',
          repair: d.repair || `Réparation ${d.part || 'standard'}`,
          cost: d.cost || d.estimated_cost || Math.round(estimatedCost / (damageDetections.length || 1)),
          urgency: severity === 'critique' ? 'haute' : 'normale',
          confidence: d.confidence || confidence
        }));
        
        const options = config.repairTypes.map(repairType => ({
          id: Math.random(),
          name: repairType.name,
          description: `Option ${repairType.name.toLowerCase()} pour ${config.name}`,
          cost: Math.round(estimatedCost * repairType.multiplier),
          delay: repairType.delay,
          warranty: repairType.warranty,
          recommended: repairType.multiplier === 1.0,
          included: ['Main d\'œuvre', 'Pièces détachées', 'Garantie', 'Suivi de dossier']
        }));
        
        setEstimation({
          id: Date.now(),
          total: estimatedCost,
          confidence: confidence,
          severity_level: severity,
          details: details,
          options: options,
          claim_type: selectedClaimType,
          claim_type_name: config.name,
          damage_count: damageCount,
          damage_detections: damageDetections
        });
        
        setRepairOptions(options);
        setRecommendedParts(damageDetections.map(d => d.part || d.class || d.damage_type || 'Zone'));
        
        setPhotos(prev => [...prev.slice(-4), { 
          file, 
          analysis: result,
          id: Date.now(),
          timestamp: new Date(),
          image_url: imageUrl,
          damage_severity: confidence,
          estimated_cost: estimatedCost,
          detected_parts: damageDetections.map(d => d.part || d.class || d.damage_type),
          claim_type: selectedClaimType,
          annotated_image: result.annotated_image
        }]);
        
        if (damageCount > 0) {
          message.success(`${damageCount} dégât(s) détecté(s) - Estimation: ${estimatedCost}€`);
        } else {
          message.success('✅ Aucun dégât détecté - Image en bon état');
        }
        
        if (socket && socket.connected) {
          socket.emit('estimation_complete', { confidence, parts: damageDetections });
        }
      } else {
        message.warning(result.message || result.error || 'Analyse terminée avec résultats limités');
        setEstimation(null);
        setRepairOptions([]);
        setAnnotatedImage(null);
      }
    } catch (error) {
      console.error('Erreur analyse:', error);
      message.error('Erreur lors de l\'analyse de l\'image');
      setAnnotatedImage(null);
    } finally {
      clearInterval(progressInterval);
      setAnalyzing(false);
    }
    return false;
  };

  const handleSelectOption = (option) => {
    setSelectedOption(option);
    setModalVisible(true);
  };

  const confirmRepair = async () => {
    try {
      await api.post('/claims/confirm-repair', {
        estimation_id: estimation?.id,
        option_id: selectedOption?.id,
        claim_type: selectedClaimType
      });
      message.success('Option confirmée avec succès');
      setModalVisible(false);
    } catch (error) {
      message.success('Option confirmée avec succès');
      setModalVisible(false);
    }
  };

  const resetEstimation = () => {
    setPhotos([]);
    setEstimation(null);
    setRepairOptions([]);
    setRecommendedParts([]);
    setConfidenceHistory([]);
    setAnnotatedImage(null);
    setOriginalImage(null);
    setProcessingProgress(0);
    message.info('Estimation réinitialisée');
  };

  // ============================================
  // FONCTIONS POUR LES EXPERTS HUMAINS
  // ============================================
  const handleConsultExpert = (expert) => {
    setSelectedExpert(expert);
    setExpertDrawerVisible(true);
    setExpertMessages([
      { 
        role: 'assistant', 
        content: `Bonjour, je suis ${expert.name}. ${expert.description}\n\nComment puis-je vous aider concernant votre sinistre ?`
      }
    ]);
    setExpertInput('');
  };

  const handleContactExpert = (expert, method) => {
    if (method === 'phone') {
      message.info(`📞 Contactez ${expert.name} au ${expert.phone}`);
    } else if (method === 'email') {
      message.info(`📧 Envoyez un email à ${expert.email}`);
    }
  };

  const handleSendExpertMessage = async () => {
    if (!expertInput.trim() || !selectedExpert) return;
    
    const message = expertInput.trim();
    setExpertInput('');
    setExpertMessages(prev => [...prev, { role: 'user', content: message }]);
    
    // Simuler une réponse de l'expert
    setTimeout(() => {
      const responses = [
        `D'après mon analyse de votre dossier, je vous recommande de programmer une expertise sur place.`,
        `Je comprends votre situation. ${selectedExpert.name} vous propose de vous accompagner dans vos démarches.`,
        `En tant qu'expert en ${selectedExpert.expertise[0] || 'assurance'}, je vous conseille de contacter votre assureur dans les plus brefs délais.`
      ];
      setExpertMessages(prev => [...prev, { 
        role: 'assistant', 
        content: responses[Math.floor(Math.random() * responses.length)]
      }]);
    }, 1500);
  };

  const config = CLAIM_TYPES[selectedClaimType];

  // Colonnes du tableau des détails
  const columns = [
    { title: 'Pièce/Zone', dataIndex: 'part', key: 'part', render: (text) => <Text strong style={{ color: '#e8e8e8' }}>{text}</Text> },
    { title: 'Dommage', dataIndex: 'damage', key: 'damage', render: (text) => <Tag color="orange">{text}</Tag> },
    { title: 'Intervention', dataIndex: 'repair', key: 'repair', render: (text) => <Text style={{ color: '#c8c8c8' }}>{text}</Text> },
    { title: 'Coût', dataIndex: 'cost', key: 'cost', render: (c) => <Text strong style={{ color: '#faad14' }}>{c} €</Text> },
    { title: 'Confiance', dataIndex: 'confidence', key: 'confidence', render: (c) => <Progress percent={c} size="small" width={50} strokeColor="#1890ff" /> },
    { title: 'Urgence', dataIndex: 'urgency', key: 'urgency', render: (u) => <Tag color={u === 'haute' ? 'red' : 'orange'}>{u === 'haute' ? 'Urgent' : 'Normal'}</Tag> }
  ];

  // Configuration du graphique de confiance
  const confidenceConfig = {
    data: confidenceHistory.slice(-20),
    xField: 'time',
    yField: 'value',
    smooth: true,
    areaStyle: { fill: 'l(270) 0:#1a1a1a 0.5:#2d2d2d 1:#1890ff', fillOpacity: 0.4 },
    line: { color: '#1890ff', lineWidth: 2 },
    point: { size: 4, shape: 'circle', color: '#1890ff' }
  };

  // ============================================
  // COMPOSANTS INTERNES
  // ============================================
  
  // Carte d'expert humain
  const ExpertCard = ({ expert, onConsult, onContact, onToggleAvailability, onEdit, onDelete, isSelected }) => {
    return (
      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
        <Card
          hoverable
          style={{ 
            borderRadius: 16,
            background: isSelected ? `linear-gradient(135deg, ${expert.color}22, ${expert.color}11)` : 'rgba(30, 30, 30, 0.6)',
            border: isSelected ? `2px solid ${expert.color}` : '1px solid #2a2a2a',
            cursor: 'pointer',
            transition: 'all 0.3s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Avatar 
              size={56} 
              src={expert.avatar} 
              style={{ 
                border: `2px solid ${expert.color}`,
                flexShrink: 0
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text strong style={{ color: '#e8e8e8', fontSize: 16 }}>{expert.name}</Text>
                {expert.isCustom && <Tag color="orange">Personnalisé</Tag>}
                <Tooltip title={expert.available ? 'Disponible' : 'Indisponible'}>
                  <Badge 
                    status={expert.available ? 'success' : 'error'} 
                    text={expert.available ? 'Disponible' : 'Indisponible'}
                  />
                </Tooltip>
              </div>
              <Text style={{ color: '#888', fontSize: 12 }}>{expert.title}</Text>
              <div style={{ marginTop: 4 }}>
                <Space wrap>
                  <Rate disabled defaultValue={expert.rating} style={{ fontSize: 12 }} />
                  <Text style={{ color: '#888', fontSize: 11 }}>({expert.reviews})</Text>
                  <Tag style={{ fontSize: 10, margin: 0 }} color="blue">{expert.experience}</Tag>
                </Space>
              </div>
              <div style={{ marginTop: 4 }}>
                <Space wrap>
                  {expert.expertise.slice(0, 3).map((exp, idx) => (
                    <Tag key={idx} style={{ fontSize: 10, margin: 0 }} color="blue">{exp}</Tag>
                  ))}
                  {expert.expertise.length > 3 && (
                    <Tag style={{ fontSize: 10, margin: 0 }}>+{expert.expertise.length - 3}</Tag>
                  )}
                </Space>
              </div>
            </div>
          </div>
          <Divider style={{ margin: '12px 0', borderColor: '#2a2a2a' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Space size="small">
                <Tooltip title="Téléphone">
                  <Button 
                    type="text" 
                    icon={<PhoneOutlined />} 
                    size="small"
                    onClick={(e) => { e.stopPropagation(); onContact(expert, 'phone'); }}
                    style={{ color: expert.color }}
                  />
                </Tooltip>
                <Tooltip title="Email">
                  <Button 
                    type="text" 
                    icon={<MailOutlined />} 
                    size="small"
                    onClick={(e) => { e.stopPropagation(); onContact(expert, 'email'); }}
                    style={{ color: expert.color }}
                  />
                </Tooltip>
                <Tooltip title="Localisation">
                  <Text style={{ color: '#888', fontSize: 11 }}>
                    <EnvironmentOutlined /> {expert.location}
                  </Text>
                </Tooltip>
              </Space>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Text style={{ color: '#faad14', fontSize: 14, fontWeight: 'bold' }}>
                {expert.hourlyRate}€/h
              </Text>
              <Tooltip title={expert.available ? 'Désactiver' : 'Activer'}>
                <Switch
                  checked={expert.available}
                  onChange={() => onToggleAvailability(expert.id)}
                  size="small"
                />
              </Tooltip>
              <Tooltip title="Modifier">
                <Button 
                  type="text" 
                  icon={<EditOutlined />} 
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onEdit(expert); }}
                  style={{ color: expert.color }}
                />
              </Tooltip>
              <Popconfirm
                title="Supprimer cet expert ?"
                description="Cette action est irréversible."
                onConfirm={() => onDelete(expert.id)}
                okText="Oui"
                cancelText="Non"
              >
                <Button 
                  type="text" 
                  icon={<DeleteOutlined />} 
                  size="small"
                  danger
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
              <Button 
                type="primary"
                size="small"
                icon={isSelected ? <CheckCircleOutlined /> : <ArrowRightOutlined />}
                onClick={() => onConsult(expert)}
                style={{ 
                  background: isSelected ? expert.color : undefined,
                  borderColor: isSelected ? expert.color : undefined
                }}
              >
                {isSelected ? 'Consultation' : 'Consulter'}
              </Button>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  };

  // ============================================
  // MODAL D'AJOUT D'EXPERT
  // ============================================
  const AddExpertModal = ({ visible, onCancel, onAdd }) => {
    const [expert, setExpert] = useState({
      name: '',
      title: '',
      specialty: '',
      phone: '',
      email: '',
      location: '',
      hourlyRate: '',
      experience: '',
      description: '',
      expertise: [],
      color: '#1890ff'
    });
    const [newExpertise, setNewExpertise] = useState('');

    const handleAddExpertise = () => {
      if (newExpertise.trim()) {
        setExpert({...expert, expertise: [...expert.expertise, newExpertise.trim()]});
        setNewExpertise('');
      }
    };

    const handleRemoveExpertise = (index) => {
      const newList = expert.expertise.filter((_, i) => i !== index);
      setExpert({...expert, expertise: newList});
    };

    const handleSubmit = () => {
      if (!expert.name.trim()) {
        message.error('Veuillez entrer un nom pour l\'expert');
        return;
      }
      const newExpert = {
        id: `expert_${Date.now()}`,
        name: expert.name.trim(),
        title: expert.title.trim() || 'Expert Consultant',
        specialty: expert.specialty.trim() || 'Consultation générale',
        phone: expert.phone.trim() || 'Non renseigné',
        email: expert.email.trim() || 'Non renseigné',
        location: expert.location.trim() || 'France',
        rating: 0,
        reviews: 0,
        available: true,
        experience: expert.experience.trim() || 'Non renseigné',
        languages: ['Français'],
        hourlyRate: parseFloat(expert.hourlyRate) || 100,
        responseTime: '< 24h',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${expert.name.replace(/\s/g, '')}`,
        color: expert.color,
        description: expert.description.trim() || `Expert personnalisé : ${expert.name}`,
        expertise: expert.expertise.length > 0 ? expert.expertise : ['Consultation générale'],
        isCustom: true
      };
      onAdd(newExpert);
      setExpert({
        name: '',
        title: '',
        specialty: '',
        phone: '',
        email: '',
        location: '',
        hourlyRate: '',
        experience: '',
        description: '',
        expertise: [],
        color: '#1890ff'
      });
      onCancel();
    };

    return (
      <Modal
        title={<span style={{ color: '#e8e8e8' }}>Ajouter un expert</span>}
        open={visible}
        onCancel={onCancel}
        footer={[
          <Button key="cancel" onClick={onCancel}>Annuler</Button>,
          <Button key="submit" type="primary" onClick={handleSubmit} icon={<CheckCircleOutlined />}>
            Ajouter l'expert
          </Button>
        ]}
        width={700}
        style={{ background: 'rgba(0,0,0,0.8)' }}
        bodyStyle={{ background: '#1a1a1a', maxHeight: '80vh', overflowY: 'auto' }}
      >
        {/* Formulaire d'ajout */}
        <div style={{ padding: '16px 0' }}>
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Nom complet *</Text>
                <Input 
                  value={expert.name} 
                  onChange={(e) => setExpert({...expert, name: e.target.value})} 
                  placeholder="Ex: Jean Dupont"
                  style={{ background: '#2a2a2a', borderColor: '#3a3a3a', color: '#e8e8e8' }}
                />
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Titre</Text>
                <Input 
                  value={expert.title} 
                  onChange={(e) => setExpert({...expert, title: e.target.value})} 
                  placeholder="Ex: Expert en sinistres"
                  style={{ background: '#2a2a2a', borderColor: '#3a3a3a', color: '#e8e8e8' }}
                />
              </div>
            </Col>
          </Row>
          <div style={{ marginBottom: 16 }}>
            <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Spécialité</Text>
            <Input 
              value={expert.specialty} 
              onChange={(e) => setExpert({...expert, specialty: e.target.value})} 
              placeholder="Ex: Expertise automobile, évaluation des dégâts"
              style={{ background: '#2a2a2a', borderColor: '#3a3a3a', color: '#e8e8e8' }}
            />
          </div>
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Téléphone</Text>
                <Input 
                  value={expert.phone} 
                  onChange={(e) => setExpert({...expert, phone: e.target.value})} 
                  placeholder="+33 6 12 34 56 78"
                  style={{ background: '#2a2a2a', borderColor: '#3a3a3a', color: '#e8e8e8' }}
                />
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Email</Text>
                <Input 
                  value={expert.email} 
                  onChange={(e) => setExpert({...expert, email: e.target.value})} 
                  placeholder="expert@mail.com"
                  style={{ background: '#2a2a2a', borderColor: '#3a3a3a', color: '#e8e8e8' }}
                />
              </div>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Localisation</Text>
                <Input 
                  value={expert.location} 
                  onChange={(e) => setExpert({...expert, location: e.target.value})} 
                  placeholder="Paris, France"
                  style={{ background: '#2a2a2a', borderColor: '#3a3a3a', color: '#e8e8e8' }}
                />
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Tarif horaire (€)</Text>
                <Input 
                  value={expert.hourlyRate} 
                  onChange={(e) => setExpert({...expert, hourlyRate: e.target.value})} 
                  placeholder="150"
                  style={{ background: '#2a2a2a', borderColor: '#3a3a3a', color: '#e8e8e8' }}
                />
              </div>
            </Col>
          </Row>
          <div style={{ marginBottom: 16 }}>
            <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Expérience</Text>
            <Input 
              value={expert.experience} 
              onChange={(e) => setExpert({...expert, experience: e.target.value})} 
              placeholder="15 ans d'expérience"
              style={{ background: '#2a2a2a', borderColor: '#3a3a3a', color: '#e8e8e8' }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Description</Text>
            <Input.TextArea 
              value={expert.description} 
              onChange={(e) => setExpert({...expert, description: e.target.value})} 
              placeholder="Description de l'expert..."
              rows={2}
              style={{ background: '#2a2a2a', borderColor: '#3a3a3a', color: '#e8e8e8' }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Couleur</Text>
            <Input 
              type="color" 
              value={expert.color} 
              onChange={(e) => setExpert({...expert, color: e.target.value})}
              style={{ width: 60, height: 40, padding: 0, border: 'none', cursor: 'pointer' }}
            />
          </div>
          <div>
            <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Domaines d'expertise</Text>
            <Space.Compact style={{ width: '100%' }}>
              <Input 
                value={newExpertise} 
                onChange={(e) => setNewExpertise(e.target.value)} 
                placeholder="Ajouter une expertise"
                style={{ background: '#2a2a2a', borderColor: '#3a3a3a', color: '#e8e8e8' }}
                onPressEnter={handleAddExpertise}
              />
              <Button type="primary" onClick={handleAddExpertise} icon={<PlusOutlined />} />
            </Space.Compact>
            <div style={{ marginTop: 8 }}>
              <Space wrap>
                {expert.expertise.map((exp, idx) => (
                  <Tag key={idx} closable onClose={() => handleRemoveExpertise(idx)} color="blue">
                    {exp}
                  </Tag>
                ))}
              </Space>
            </div>
          </div>
        </div>
      </Modal>
    );
  };

  // ============================================
  // MODAL DE MODIFICATION D'EXPERT
  // ============================================
  const EditExpertModal = ({ visible, onCancel, onSave, expert }) => {
    const [formData, setFormData] = useState({
      name: '',
      title: '',
      specialty: '',
      phone: '',
      email: '',
      location: '',
      hourlyRate: '',
      experience: '',
      description: '',
      expertise: [],
      color: '#1890ff'
    });
    const [newExpertise, setNewExpertise] = useState('');

    useEffect(() => {
      if (expert) {
        setFormData({
          name: expert.name || '',
          title: expert.title || '',
          specialty: expert.specialty || '',
          phone: expert.phone || '',
          email: expert.email || '',
          location: expert.location || '',
          hourlyRate: expert.hourlyRate || '',
          experience: expert.experience || '',
          description: expert.description || '',
          expertise: expert.expertise || [],
          color: expert.color || '#1890ff'
        });
      }
    }, [expert]);

    const handleAddExpertise = () => {
      if (newExpertise.trim()) {
        setFormData({...formData, expertise: [...formData.expertise, newExpertise.trim()]});
        setNewExpertise('');
      }
    };

    const handleRemoveExpertise = (index) => {
      const newList = formData.expertise.filter((_, i) => i !== index);
      setFormData({...formData, expertise: newList});
    };

    const handleSubmit = () => {
      if (!formData.name.trim()) {
        message.error('Veuillez entrer un nom pour l\'expert');
        return;
      }
      onSave({
        ...expert,
        name: formData.name.trim(),
        title: formData.title.trim(),
        specialty: formData.specialty.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim(),
        location: formData.location.trim(),
        hourlyRate: parseFloat(formData.hourlyRate) || 0,
        experience: formData.experience.trim(),
        description: formData.description.trim(),
        expertise: formData.expertise,
        color: formData.color
      });
    };

    return (
      <Modal
        title={<span style={{ color: '#e8e8e8' }}>Modifier l'expert</span>}
        open={visible}
        onCancel={onCancel}
        footer={[
          <Button key="cancel" onClick={onCancel}>Annuler</Button>,
          <Button key="submit" type="primary" onClick={handleSubmit} icon={<CheckCircleOutlined />}>
            Enregistrer
          </Button>
        ]}
        width={700}
        style={{ background: 'rgba(0,0,0,0.8)' }}
        bodyStyle={{ background: '#1a1a1a', maxHeight: '80vh', overflowY: 'auto' }}
      >
        {/* Formulaire de modification */}
        <div style={{ padding: '16px 0' }}>
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Nom complet *</Text>
                <Input 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})} 
                  placeholder="Ex: Jean Dupont"
                  style={{ background: '#2a2a2a', borderColor: '#3a3a3a', color: '#e8e8e8' }}
                />
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Titre</Text>
                <Input 
                  value={formData.title} 
                  onChange={(e) => setFormData({...formData, title: e.target.value})} 
                  placeholder="Ex: Expert en sinistres"
                  style={{ background: '#2a2a2a', borderColor: '#3a3a3a', color: '#e8e8e8' }}
                />
              </div>
            </Col>
          </Row>
          <div style={{ marginBottom: 16 }}>
            <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Spécialité</Text>
            <Input 
              value={formData.specialty} 
              onChange={(e) => setFormData({...formData, specialty: e.target.value})} 
              placeholder="Ex: Expertise automobile, évaluation des dégâts"
              style={{ background: '#2a2a2a', borderColor: '#3a3a3a', color: '#e8e8e8' }}
            />
          </div>
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Téléphone</Text>
                <Input 
                  value={formData.phone} 
                  onChange={(e) => setFormData({...formData, phone: e.target.value})} 
                  placeholder="+33 6 12 34 56 78"
                  style={{ background: '#2a2a2a', borderColor: '#3a3a3a', color: '#e8e8e8' }}
                />
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Email</Text>
                <Input 
                  value={formData.email} 
                  onChange={(e) => setFormData({...formData, email: e.target.value})} 
                  placeholder="expert@mail.com"
                  style={{ background: '#2a2a2a', borderColor: '#3a3a3a', color: '#e8e8e8' }}
                />
              </div>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Localisation</Text>
                <Input 
                  value={formData.location} 
                  onChange={(e) => setFormData({...formData, location: e.target.value})} 
                  placeholder="Paris, France"
                  style={{ background: '#2a2a2a', borderColor: '#3a3a3a', color: '#e8e8e8' }}
                />
              </div>
            </Col>
            <Col span={12}>
              <div style={{ marginBottom: 16 }}>
                <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Tarif horaire (€)</Text>
                <Input 
                  value={formData.hourlyRate} 
                  onChange={(e) => setFormData({...formData, hourlyRate: e.target.value})} 
                  placeholder="150"
                  style={{ background: '#2a2a2a', borderColor: '#3a3a3a', color: '#e8e8e8' }}
                />
              </div>
            </Col>
          </Row>
          <div style={{ marginBottom: 16 }}>
            <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Expérience</Text>
            <Input 
              value={formData.experience} 
              onChange={(e) => setFormData({...formData, experience: e.target.value})} 
              placeholder="15 ans d'expérience"
              style={{ background: '#2a2a2a', borderColor: '#3a3a3a', color: '#e8e8e8' }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Description</Text>
            <Input.TextArea 
              value={formData.description} 
              onChange={(e) => setFormData({...formData, description: e.target.value})} 
              placeholder="Description de l'expert..."
              rows={2}
              style={{ background: '#2a2a2a', borderColor: '#3a3a3a', color: '#e8e8e8' }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Couleur</Text>
            <Input 
              type="color" 
              value={formData.color} 
              onChange={(e) => setFormData({...formData, color: e.target.value})}
              style={{ width: 60, height: 40, padding: 0, border: 'none', cursor: 'pointer' }}
            />
          </div>
          <div>
            <Text style={{ color: '#e8e8e8', display: 'block', marginBottom: 8 }}>Domaines d'expertise</Text>
            <Space.Compact style={{ width: '100%' }}>
              <Input 
                value={newExpertise} 
                onChange={(e) => setNewExpertise(e.target.value)} 
                placeholder="Ajouter une expertise"
                style={{ background: '#2a2a2a', borderColor: '#3a3a3a', color: '#e8e8e8' }}
                onPressEnter={handleAddExpertise}
              />
              <Button type="primary" onClick={handleAddExpertise} icon={<PlusOutlined />} />
            </Space.Compact>
            <div style={{ marginTop: 8 }}>
              <Space wrap>
                {formData.expertise.map((exp, idx) => (
                  <Tag key={idx} closable onClose={() => handleRemoveExpertise(idx)} color="blue">
                    {exp}
                  </Tag>
                ))}
              </Space>
            </div>
          </div>
        </div>
      </Modal>
    );
  };

  // ============================================
  // DÉFINITION DES ONGLETS AVEC items
  // ============================================
  const tabItems = [
    {
      key: 'analysis',
      label: <span style={{ color: activeTab === 'analysis' ? '#1890ff' : '#888' }}>🔍 Analyse</span>,
      children: (
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            {/* Upload */}
            <Card 
              variant="borderless" 
              style={{ 
                borderRadius: 24, 
                background: 'rgba(20, 20, 20, 0.95)',
                border: '1px solid #2a2a2a',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                marginBottom: 24
              }}
            >
              <Upload.Dragger
                accept="image/*"
                beforeUpload={() => false}
                onChange={({ file }) => handlePhotoUpload(file)}
                showUploadList={false}
                style={{ 
                  borderRadius: 16,
                  background: 'rgba(30, 30, 30, 0.6)',
                  borderColor: config.color
                }}
                disabled={analyzing}
              >
                <p className="ant-upload-drag-icon"><CameraOutlined style={{ fontSize: 48, color: config.color }} /></p>
                <p className="ant-upload-text" style={{ color: '#e8e8e8' }}>Cliquez ou glissez pour ajouter des photos</p>
                <p className="ant-upload-hint" style={{ color: '#888' }}>Support JPEG, PNG, JPG. L'IA analysera automatiquement les dommages</p>
              </Upload.Dragger>

              {analyzing && (
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                  <Spin size="large" />
                  <Progress 
                    percent={processingProgress} 
                    style={{ marginTop: 16 }} 
                    strokeColor={config.color}
                    trailColor="#2a2a2a"
                  />
                  <Text style={{ color: '#888', display: 'block', marginTop: 8 }}>
                    Analyse en cours, veuillez patienter...
                  </Text>
                </div>
              )}
            </Card>

            {/* Images */}
            {(originalImage || annotatedImage) && (
              <Row gutter={16} style={{ marginBottom: 24 }}>
                {originalImage && (
                  <Col span={annotatedImage ? 12 : 24}>
                    <Card 
                      title={<span style={{ color: '#e8e8e8' }}>📷 Image originale</span>}
                      variant="borderless"
                      style={{ 
                        borderRadius: 24, 
                        background: 'rgba(20, 20, 20, 0.95)',
                        border: '1px solid #2a2a2a',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                      }}
                      headStyle={{ borderBottom: '1px solid #2a2a2a' }}
                    >
                      <img src={originalImage} alt="original" style={{ width: '100%', borderRadius: 8, border: '1px solid #2a2a2a' }} />
                    </Card>
                  </Col>
                )}
                {annotatedImage && (
                  <Col span={originalImage ? 12 : 24}>
                    <Card 
                      title={
                        <Space>
                          <span style={{ color: '#e8e8e8' }}>🎯 Zones endommagées détectées</span>
                          <Tag color="red">{estimation?.damage_count || 0} dégât(s)</Tag>
                        </Space>
                      }
                      variant="borderless"
                      style={{ 
                        borderRadius: 24, 
                        background: 'rgba(20, 20, 20, 0.95)',
                        border: '1px solid #2a2a2a',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                      }}
                      headStyle={{ borderBottom: '1px solid #2a2a2a' }}
                    >
                      <img src={annotatedImage} alt="annotated" style={{ width: '100%', borderRadius: 8, border: '1px solid #2a2a2a' }} />
                      <div style={{ marginTop: 12, textAlign: 'center' }}>
                        <Text style={{ color: '#888' }}>
                          🔴 Cadres rouges = zones endommagées détectées
                        </Text>
                      </div>
                    </Card>
                  </Col>
                )}
              </Row>
            )}

            {/* Estimation */}
            {estimation && (
              <Card 
                title={
                  <Space>
                    <CalculatorOutlined style={{ color: '#e8e8e8' }} />
                    <span style={{ color: '#e8e8e8' }}>Estimation détaillée - {estimation.claim_type_name}</span>
                    <Tooltip title={`Confiance: ${estimation.confidence}%`}>
                      <Progress 
                        type="circle" 
                        percent={estimation.confidence} 
                        width={40} 
                        strokeColor={estimation.confidence > 80 ? '#52c41a' : estimation.confidence > 60 ? '#faad14' : '#ff4d4f'}
                        format={(percent) => null}
                      />
                    </Tooltip>
                  </Space>
                }
                variant="borderless"
                style={{ 
                  borderRadius: 24, 
                  background: 'rgba(20, 20, 20, 0.95)',
                  border: '1px solid #2a2a2a',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  marginTop: 24
                }}
                headStyle={{ borderBottom: '1px solid #2a2a2a' }}
              >
                <Alert
                  message={estimation.damage_count === 0 ? "✅ AUCUN DÉGÂT DÉTECTÉ" : `⚠️ ${estimation.damage_count} DÉGÂT(S) DÉTECTÉ(S)`}
                  description={`Montant estimé total: ${estimation.total} € - Niveau de gravité: ${estimation.severity_level}`}
                  type={estimation.damage_count === 0 ? "success" : "warning"}
                  showIcon
                  style={{ marginBottom: 24, borderRadius: 16 }}
                />
                
                <Progress 
                  percent={estimation.confidence} 
                  status="active" 
                  strokeColor={estimation.confidence > 80 ? '#52c41a' : estimation.confidence > 60 ? '#faad14' : '#ff4d4f'}
                  trailColor="#2a2a2a"
                  style={{ marginBottom: 24 }}
                />
                
                {estimation.details && estimation.details.length > 0 && (
                  <Table
                    columns={columns}
                    dataSource={estimation.details}
                    size="middle"
                    pagination={false}
                    style={{ marginBottom: 24 }}
                    rowKey="key"
                    className="dark-table"
                  />
                )}
                
                {recommendedParts.length > 0 && (
                  <div>
                    <Divider style={{ borderColor: '#2a2a2a', color: '#888' }}>Éléments concernés</Divider>
                    <Space wrap>
                      {recommendedParts.slice(0, 8).map((part, idx) => (
                        <Tag key={idx} color={config.color} icon={<ToolOutlined />}>
                          {part}
                        </Tag>
                      ))}
                    </Space>
                  </div>
                )}
              </Card>
            )}
          </Col>

          <Col xs={24} lg={8}>
            {/* Options de réparation */}
            {repairOptions.length > 0 && (
              <Card 
                title={
                  <Space>
                    <ToolOutlined style={{ color: '#e8e8e8' }} />
                    <span style={{ color: '#e8e8e8' }}>Options de réparation</span>
                  </Space>
                }
                variant="borderless"
                style={{ 
                  borderRadius: 24, 
                  background: 'rgba(20, 20, 20, 0.95)',
                  border: '1px solid #2a2a2a',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  marginBottom: 24
                }}
                headStyle={{ borderBottom: '1px solid #2a2a2a' }}
              >
                <Row gutter={[16, 16]}>
                  {repairOptions.map((option, idx) => (
                    <Col span={24} key={idx}>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Card
                          hoverable
                          style={{ 
                            borderRadius: 16,
                            background: 'rgba(30, 30, 30, 0.6)',
                            border: option.recommended ? `2px solid ${config.color}` : '1px solid #2a2a2a'
                          }}
                        >
                          <Row justify="space-between" align="middle">
                            <Col span={16}>
                              <Title level={5} style={{ margin: 0, color: '#e8e8e8' }}>{option.name}</Title>
                              <Text style={{ color: '#888' }}>{option.description}</Text>
                              <div style={{ marginTop: 12 }}>
                                <Space>
                                  <Tag icon={<ClockCircleOutlined />}>Délai: {option.delay} jours</Tag>
                                  {option.warranty > 0 && (
                                    <Tag icon={<SafetyOutlined />}>Garantie: {option.warranty} mois</Tag>
                                  )}
                                </Space>
                              </div>
                            </Col>
                            <Col span={8} style={{ textAlign: 'right' }}>
                              <Title level={4} style={{ margin: 0, color: '#faad14' }}>{option.cost} €</Title>
                              {option.recommended && (
                                <Tag color="green" icon={<CheckCircleOutlined />} style={{ marginTop: 8 }}>
                                  Recommandé
                                </Tag>
                              )}
                            </Col>
                          </Row>
                          <Divider style={{ margin: '12px 0', borderColor: '#2a2a2a' }} />
                          <Button 
                            type="primary" 
                            block 
                            onClick={() => handleSelectOption(option)}
                            icon={<CheckCircleOutlined />}
                            style={{ background: config.color, borderColor: config.color }}
                          >
                            Choisir cette option
                          </Button>
                        </Card>
                      </motion.div>
                    </Col>
                  ))}
                </Row>
              </Card>
            )}

            {/* Graphique de confiance */}
            {confidenceHistory.length > 0 && (
              <Card 
                title={
                  <Space>
                    <LineChartOutlined style={{ color: '#e8e8e8' }} />
                    <span style={{ color: '#e8e8e8' }}>Évolution de la confiance</span>
                  </Space>
                }
                variant="borderless"
                style={{ 
                  borderRadius: 24, 
                  background: 'rgba(20, 20, 20, 0.95)',
                  border: '1px solid #2a2a2a',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  marginBottom: 24
                }}
                headStyle={{ borderBottom: '1px solid #2a2a2a' }}
              >
                <Line {...confidenceConfig} height={200} />
              </Card>
            )}

            {/* Conseils d'experts */}
            <Card 
              title={
                <Space>
                  <HistoryOutlined style={{ color: '#e8e8e8' }} />
                  <span style={{ color: '#e8e8e8' }}>Conseils d'experts</span>
                </Space>
              }
              variant="borderless"
              style={{ 
                borderRadius: 24, 
                background: 'rgba(20, 20, 20, 0.95)',
                border: '1px solid #2a2a2a',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                marginBottom: 24
              }}
              headStyle={{ borderBottom: '1px solid #2a2a2a' }}
            >
              <Timeline>
                <Timeline.Item color="green">
                  <strong style={{ color: '#e8e8e8' }}>Faites plusieurs photos</strong>
                  <br />
                  <Text style={{ color: '#888' }}>Sous différents angles pour une meilleure précision</Text>
                </Timeline.Item>
                <Timeline.Item color="blue">
                  <strong style={{ color: '#e8e8e8' }}>Documentez tous les dégâts</strong>
                  <br />
                  <Text style={{ color: '#888' }}>Prenez des photos avant et après</Text>
                </Timeline.Item>
                <Timeline.Item color="orange">
                  <strong style={{ color: '#e8e8e8' }}>Contactez rapidement un expert</strong>
                  <br />
                  <Text style={{ color: '#888' }}>Pour les dommages structurels importants</Text>
                </Timeline.Item>
                <Timeline.Item color="red">
                  <strong style={{ color: '#e8e8e8' }}>Ne réparez pas avant expertise</strong>
                  <br />
                  <Text style={{ color: '#888' }}>Sauf urgence absolue</Text>
                </Timeline.Item>
              </Timeline>
            </Card>
          </Col>
        </Row>
      )
    },
    {
      key: 'experts',
      label: <span style={{ color: activeTab === 'experts' ? '#1890ff' : '#888' }}>👨‍⚖️ Experts terrain</span>,
      children: (
        <Card
          title={
            <Space>
              <TeamOutlined style={{ color: '#e8e8e8' }} />
              <span style={{ color: '#e8e8e8' }}>Experts en déplacement</span>
              <Badge count={experts.length} style={{ backgroundColor: '#1890ff' }} />
              <Badge 
                count={experts.filter(e => e.available).length} 
                style={{ backgroundColor: '#52c41a' }} 
                title="Disponibles"
              />
            </Space>
          }
          extra={
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setAddExpertVisible(true)}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              Ajouter un expert
            </Button>
          }
          variant="borderless"
          style={{
            borderRadius: 24,
            background: 'rgba(20, 20, 20, 0.95)',
            border: '1px solid #2a2a2a',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            marginTop: 24
          }}
          headStyle={{ borderBottom: '1px solid #2a2a2a' }}
        >
          {expertsLoading ? (
            <div style={{ padding: 40, textAlign: 'center' }}>
              <Spin size="large" />
            </div>
          ) : experts.length === 0 ? (
            <Empty 
              description={<span style={{ color: '#888' }}>Aucun expert disponible. Ajoutez-en un !</span>}
              style={{ padding: 40 }}
            />
          ) : (
            <Row gutter={[16, 16]}>
              {experts.map((expert) => (
                <Col xs={24} sm={12} lg={8} key={expert.id}>
                  <ExpertCard 
                    expert={expert} 
                    onConsult={handleConsultExpert}
                    onContact={handleContactExpert}
                    onToggleAvailability={toggleExpertAvailability}
                    onEdit={handleEditExpert}
                    onDelete={handleDeleteExpert}
                    isSelected={selectedExpert?.id === expert.id}
                  />
                </Col>
              ))}
            </Row>
          )}
        </Card>
      )
    }
  ];

  // ============================================
  // RENDU PRINCIPAL
  // ============================================
  return (
    <div style={{ 
      padding: 24, 
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 30%, #0d0d0d 100%)', 
      minHeight: '100vh' 
    }}>
      {/* EN-TÊTE */}
      <div style={{ 
        background: `linear-gradient(135deg, ${config.color}dd 0%, ${config.color}55 50%, #0d0d0d 100%)`,
        borderRadius: 24,
        padding: '32px 32px',
        marginBottom: 32,
        color: 'white',
        border: `1px solid ${config.color}44`,
        boxShadow: `0 8px 32px ${config.color}22`
      }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="large">
              <div style={{ 
                width: 70, 
                height: 70, 
                background: `linear-gradient(135deg, ${config.color} 0%, ${config.color}88 100%)`,
                borderRadius: 24, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: `0 4px 20px ${config.color}44`
              }}>
                {config.icon}
              </div>
              <div>
                <Title level={2} style={{ margin: 0, color: 'white', textShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
                  Estimation Automatique - {config.name}
                </Title>
                <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {config.description}
                </Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space>
              <Select
                value={selectedClaimType}
                onChange={setSelectedClaimType}
                style={{ 
                  width: 220, 
                  background: 'rgba(255,255,255,0.08)', 
                  borderRadius: 8,
                  border: `1px solid ${config.color}44`
                }}
                dropdownStyle={{ 
                  borderRadius: 12,
                  background: '#1a1a1a',
                  border: '1px solid #333'
                }}
              >
                {Object.entries(CLAIM_TYPES).map(([key, type]) => (
                  <Option key={key} value={key} style={{ color: '#e8e8e8' }}>
                    <Space>{type.icon}{type.name}</Space>
                  </Option>
                ))}
              </Select>
              <Button 
                icon={<ReloadOutlined />} 
                onClick={resetEstimation}
                style={{ 
                  background: 'rgba(255,255,255,0.08)', 
                  color: 'white', 
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(10px)'
                }}
              >
                Nouvelle estimation
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* CONTENU PRINCIPAL AVEC ONGLETS */}
      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        style={{ color: '#e8e8e8' }}
        items={tabItems}
      />

      {/* ALERTE PROCHAINES ÉTAPES */}
      {estimation && estimation.damage_count > 0 && (
        <Alert
          message="Prochaines étapes"
          description={
            <div>
              <Text style={{ color: '#e8e8e8' }}>Un expert peut être mandaté pour valider l'estimation.</Text>
              <div style={{ marginTop: 12 }}>
                <Space>
                  <Button type="primary" size="small" onClick={() => {
                    const availableExpert = experts.find(e => e.available);
                    if (availableExpert) {
                      handleConsultExpert(availableExpert);
                    } else {
                      message.info('Aucun expert disponible pour le moment.');
                    }
                  }}>
                    Planifier expertise
                  </Button>
                  <Button size="small" onClick={() => {
                    const availableExpert = experts.find(e => e.available);
                    if (availableExpert) {
                      handleContactExpert(availableExpert, 'phone');
                    } else {
                      message.info('Aucun expert disponible.');
                    }
                  }}>
                    Contacter un expert
                  </Button>
                </Space>
              </div>
            </div>
          }
          type="info"
          showIcon
          style={{ marginTop: 24, borderRadius: 16, background: 'rgba(24, 144, 255, 0.15)', border: '1px solid #1890ff44' }}
        />
      )}

      {/* MODALS ET DRAWERS */}
      {/* Modal confirmation option */}
      <Modal
        title={<span style={{ color: '#e8e8e8' }}>Confirmation de l'option</span>}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>Annuler</Button>,
          <Button key="confirm" type="primary" onClick={confirmRepair} icon={<CheckCircleOutlined />}>
            Confirmer
          </Button>
        ]}
        style={{ background: 'rgba(0,0,0,0.8)' }}
        bodyStyle={{ background: '#1a1a1a' }}
      >
        {selectedOption && (
          <div>
            <Alert
              message={selectedOption.name}
              description={selectedOption.description}
              type="info"
              showIcon
              style={{ marginBottom: 16, background: 'rgba(24, 144, 255, 0.15)', border: '1px solid #1890ff44' }}
            />
            <Descriptions column={1} bordered>
              <Descriptions.Item label="Coût total">
                <Text strong style={{ color: '#faad14', fontSize: 18 }}>{selectedOption.cost} €</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Délai">
                {selectedOption.delay} jours
              </Descriptions.Item>
              {selectedOption.warranty > 0 && (
                <Descriptions.Item label="Garantie">
                  {selectedOption.warranty} mois
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Inclus">
                <Space wrap>
                  {selectedOption.included?.map((item, idx) => (
                    <Tag key={idx} color="green">{item}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* Modal visualisation photo */}
      <Modal
        title={<span style={{ color: '#e8e8e8' }}>Détails de l'analyse</span>}
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>Fermer</Button>,
          <Button key="download" icon={<DownloadOutlined />}>Télécharger le rapport</Button>
        ]}
        width={800}
        style={{ background: 'rgba(0,0,0,0.8)' }}
        bodyStyle={{ background: '#1a1a1a' }}
      >
        {selectedPhoto && (
          <div>
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" title={<span style={{ color: '#e8e8e8' }}>Image originale</span>} style={{ background: '#2a2a2a', border: '1px solid #333' }}>
                  <img 
                    src={selectedPhoto.image_url || URL.createObjectURL(selectedPhoto.file)} 
                    alt="original"
                    style={{ width: '100%', borderRadius: 8 }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title={<span style={{ color: '#e8e8e8' }}>Analyse IA</span>} style={{ background: '#2a2a2a', border: '1px solid #333' }}>
                  {selectedPhoto.annotated_image ? (
                    <img 
                      src={`data:image/png;base64,${selectedPhoto.annotated_image}`} 
                      alt="annotated"
                      style={{ width: '100%', borderRadius: 8 }}
                    />
                  ) : (
                    <img 
                      src={selectedPhoto.image_url || URL.createObjectURL(selectedPhoto.file)} 
                      alt="original"
                      style={{ width: '100%', borderRadius: 8 }}
                    />
                  )}
                </Card>
              </Col>
            </Row>
            <Divider style={{ borderColor: '#2a2a2a' }} />
            <Descriptions bordered column={1}>
              <Descriptions.Item label="Gravité">
                <Tag color="red">{selectedPhoto.damage_severity}%</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Coût estimé">
                <Tag color="green">{selectedPhoto.estimated_cost} €</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Éléments détectés">
                <Space wrap>
                  {selectedPhoto.detected_parts?.slice(0, 5).map((part, i) => (
                    <Tag key={i} color="blue">{part}</Tag>
                  ))}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Description">
                <span style={{ color: '#c8c8c8' }}>{selectedPhoto.analysis?.description || 'Analyse terminée'}</span>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>

      {/* Drawer consultation expert */}
      <Drawer
        title={
          <Space>
            <Avatar 
              src={selectedExpert?.avatar} 
              style={{ border: `2px solid ${selectedExpert?.color || '#1890ff'}` }}
            />
            <div>
              <Text strong style={{ color: '#e8e8e8', display: 'block' }}>{selectedExpert?.name}</Text>
              <Text style={{ color: '#888', fontSize: 12 }}>{selectedExpert?.title}</Text>
            </div>
          </Space>
        }
        placement="right"
        open={expertDrawerVisible}
        onClose={() => setExpertDrawerVisible(false)}
        width={480}
        style={{ background: '#0a0a0a' }}
        headerStyle={{ background: '#1a1a1a', borderBottom: '1px solid #2a2a2a' }}
        bodyStyle={{ background: '#0a0a0a', padding: '16px 24px', display: 'flex', flexDirection: 'column', height: 'calc(100% - 70px)' }}
      >
        {selectedExpert && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ 
              background: `linear-gradient(135deg, ${selectedExpert.color}22, ${selectedExpert.color}11)`,
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
              border: `1px solid ${selectedExpert.color}33`
            }}>
              <Row gutter={8}>
                <Col span={12}>
                  <Text style={{ color: '#888', fontSize: 11 }}>📞 {selectedExpert.phone}</Text>
                </Col>
                <Col span={12}>
                  <Text style={{ color: '#888', fontSize: 11 }}>✉️ {selectedExpert.email}</Text>
                </Col>
                <Col span={12}>
                  <Text style={{ color: '#888', fontSize: 11 }}>📍 {selectedExpert.location}</Text>
                </Col>
                <Col span={12}>
                  <Text style={{ color: '#888', fontSize: 11 }}>⭐ {selectedExpert.rating} ({selectedExpert.reviews} avis)</Text>
                </Col>
                <Col span={24}>
                  <Space wrap>
                    {selectedExpert.expertise.map((exp, idx) => (
                      <Tag key={idx} color="blue" style={{ fontSize: 11 }}>{exp}</Tag>
                    ))}
                  </Space>
                </Col>
              </Row>
            </div>

            <div style={{ 
              flex: 1,
              overflowY: 'auto',
              marginBottom: 16,
              padding: '0 4px'
            }}>
              {expertMessages.map((msg, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 12
                }}>
                  <div style={{
                    maxWidth: '80%',
                    padding: '10px 16px',
                    borderRadius: 16,
                    background: msg.role === 'user' ? selectedExpert.color : 'rgba(30, 41, 59, 0.6)',
                    color: msg.role === 'user' ? 'white' : '#e8e8e8',
                    border: msg.role === 'assistant' ? `1px solid ${selectedExpert.color}33` : 'none'
                  }}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {expertMessages.length === 0 && (
                <div style={{ textAlign: 'center', color: '#888', marginTop: 40 }}>
                  <RobotOutlined style={{ fontSize: 48, color: selectedExpert.color }} />
                  <div style={{ marginTop: 16 }}>Posez votre question à {selectedExpert.name}</div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #2a2a2a', paddingTop: 16 }}>
              <Input 
                placeholder="Posez votre question à l'expert..."
                value={expertInput}
                onChange={(e) => setExpertInput(e.target.value)}
                onPressEnter={handleSendExpertMessage}
                style={{ 
                  flex: 1,
                  background: '#2a2a2a',
                  borderColor: '#3a3a3a',
                  color: '#e8e8e8'
                }}
              />
              <Button 
                type="primary" 
                icon={<SendOutlined />}
                onClick={handleSendExpertMessage}
                style={{ background: selectedExpert.color, borderColor: selectedExpert.color }}
              />
            </div>
          </div>
        )}
      </Drawer>

      {/* Modal ajout expert */}
      <AddExpertModal
        visible={addExpertVisible}
        onCancel={() => setAddExpertVisible(false)}
        onAdd={handleAddExpert}
      />

      {/* Modal modification expert */}
      <EditExpertModal
        visible={editExpertVisible}
        onCancel={() => {
          setEditExpertVisible(false);
          setEditingExpert(null);
        }}
        onSave={handleSaveExpert}
        expert={editingExpert}
      />
    </div>
  );
};

// ============================================
// STYLES
// ============================================
const DAMAGE_COLORS = {
  accident: { border: '#ff4d4f', bg: 'rgba(255, 77, 79, 0.2)' },
  habitation: { border: '#1890ff', bg: 'rgba(24, 144, 255, 0.2)' },
  agricole: { border: '#52c41a', bg: 'rgba(82, 196, 26, 0.2)' },
  sante: { border: '#722ed1', bg: 'rgba(114, 46, 209, 0.2)' },
  transport: { border: '#2f54eb', bg: 'rgba(47, 84, 235, 0.2)' },
  electronique: { border: '#eb2f96', bg: 'rgba(235, 47, 150, 0.2)' },
  catastrophe_naturelle: { border: '#13c2c2', bg: 'rgba(19, 194, 194, 0.2)' },
  cyber: { border: '#fa8c16', bg: 'rgba(250, 140, 22, 0.2)' },
  voyage: { border: '#13c2c2', bg: 'rgba(19, 194, 194, 0.2)' },
  entreprise: { border: '#faad14', bg: 'rgba(250, 173, 20, 0.2)' },
  animal: { border: '#52c41a', bg: 'rgba(82, 196, 26, 0.2)' }
};

export default DamageEstimation;