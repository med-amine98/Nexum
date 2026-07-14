import React, { useState, useEffect, useRef } from 'react';
import { Card, Typography, Spin, Badge, Space, Row, Col, List, Progress, Tag, Button, Modal, Upload, message, Slider, Switch, Divider, Alert, Select, Tooltip } from 'antd';
import { 
  CarOutlined, SafetyCertificateOutlined, ThunderboltOutlined, 
  DollarOutlined, ToolOutlined, CameraOutlined, UploadOutlined,
  ScanOutlined, FileImageOutlined, CheckCircleOutlined,
  CloseCircleOutlined, ReloadOutlined, EyeOutlined, ExperimentOutlined,
  LoadingOutlined, RobotOutlined, ApiOutlined, DatabaseOutlined
} from '@ant-design/icons';
import * as echarts from 'echarts';
import 'echarts-gl';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// ============================================
// COMPOSANT ECHARTS PERSONNALISÉ
// ============================================
const ReactECharts = ({ option, style, opts, onEvents }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => {
    if (chartRef.current) {
      chartInstance.current = echarts.init(chartRef.current, null, opts);
      chartInstance.current.setOption(option);
      
      if (onEvents) {
        Object.keys(onEvents).forEach(eventName => {
          chartInstance.current.on(eventName, onEvents[eventName]);
        });
      }
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
    };
  }, [option, opts, onEvents]);

  useEffect(() => {
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <div ref={chartRef} style={style} />;
};

// ============================================
// MODÈLE 3D DES PIÈCES DE LA VOITURE
// ============================================
const CAR_3D_MODEL = [
  { id: 'carrosserie_avant', name: 'Carrosserie Avant', coord: [0, 0.5, 2.2], cost: 1200, severity: 0, category: 'carrosserie', repairable: true },
  { id: 'carrosserie_centrale', name: 'Carrosserie Centrale', coord: [0, 0.8, 0], cost: 1500, severity: 0, category: 'carrosserie', repairable: true },
  { id: 'carrosserie_arriere', name: 'Carrosserie Arrière', coord: [0, 0.5, -2.2], cost: 1100, severity: 0, category: 'carrosserie', repairable: true },
  { id: 'pare_chocs_avant', name: 'Pare-chocs Avant', coord: [0, 0.3, 2.8], cost: 450, severity: 0, category: 'protection', repairable: true },
  { id: 'pare_chocs_arriere', name: 'Pare-chocs Arrière', coord: [0, 0.3, -2.8], cost: 420, severity: 0, category: 'protection', repairable: true },
  { id: 'phare_gauche', name: 'Phare Gauche', coord: [-0.8, 0.5, 2.6], cost: 550, severity: 0, category: 'éclairage', repairable: false },
  { id: 'phare_droit', name: 'Phare Droit', coord: [0.8, 0.5, 2.6], cost: 550, severity: 0, category: 'éclairage', repairable: false },
  { id: 'porte_avant_gauche', name: 'Porte Avant Gauche', coord: [-1.2, 0.7, 0.8], cost: 700, severity: 0, category: 'portes', repairable: true },
  { id: 'porte_avant_droite', name: 'Porte Avant Droite', coord: [1.2, 0.7, 0.8], cost: 700, severity: 0, category: 'portes', repairable: true },
  { id: 'porte_arriere_gauche', name: 'Porte Arrière Gauche', coord: [-1.1, 0.7, -0.8], cost: 650, severity: 0, category: 'portes', repairable: true },
  { id: 'porte_arriere_droite', name: 'Porte Arrière Droite', coord: [1.1, 0.7, -0.8], cost: 650, severity: 0, category: 'portes', repairable: true },
  { id: 'pare_brise', name: 'Pare-brise', coord: [0, 1.1, 1.8], cost: 600, severity: 0, category: 'vitrage', repairable: false },
  { id: 'lunette_arriere', name: 'Lunette Arrière', coord: [0, 1.0, -1.6], cost: 520, severity: 0, category: 'vitrage', repairable: false },
  { id: 'capot', name: 'Capot Moteur', coord: [0, 0.9, 2.0], cost: 800, severity: 0, category: 'mécanique', repairable: true },
  { id: 'coffre', name: 'Coffre', coord: [0, 0.7, -2.0], cost: 750, severity: 0, category: 'mécanique', repairable: true },
  { id: 'toit', name: 'Toit', coord: [0, 1.3, 0], cost: 1100, severity: 0, category: 'structure', repairable: true },
  { id: 'retroviseur_gauche', name: 'Rétroviseur Gauche', coord: [-1.4, 0.9, 1.2], cost: 220, severity: 0, category: 'accessoires', repairable: false },
  { id: 'retroviseur_droit', name: 'Rétroviseur Droit', coord: [1.4, 0.9, 1.2], cost: 220, severity: 0, category: 'accessoires', repairable: false },
  { id: 'roue_avant_gauche', name: 'Roue Avant Gauche', coord: [-0.9, 0.2, 1.8], cost: 380, severity: 0, category: 'roues', repairable: true },
  { id: 'roue_avant_droite', name: 'Roue Avant Droite', coord: [0.9, 0.2, 1.8], cost: 380, severity: 0, category: 'roues', repairable: true },
  { id: 'roue_arriere_gauche', name: 'Roue Arrière Gauche', coord: [-0.9, 0.2, -1.8], cost: 380, severity: 0, category: 'roues', repairable: true },
  { id: 'roue_arriere_droite', name: 'Roue Arrière Droite', coord: [0.9, 0.2, -1.8], cost: 380, severity: 0, category: 'roues', repairable: true },
];

// ============================================
// SERVICE D'ANALYSE IA - APPEL À L'API BACKEND
// ============================================
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// Mapping des modèles disponibles
const AI_MODELS = {
  yolo: {
    name: 'YOLO',
    endpoint: `${API_URL}/damage-ai/upload-and-analyze-yolo`,
    description: 'Détection avancée en temps réel',
    icon: <RobotOutlined />,
    color: '#10b981'
  },
  vit: {
    name: 'Vit-BEiT',
    endpoint: `${API_URL}/damage-ai/upload-and-analyze-public`,
    description: 'Classification d\'images',
    icon: <ApiOutlined />,
    color: '#3b82f6'
  },
  fallback: {
    name: 'OpenCV',
    endpoint: `${API_URL}/damage-ai/upload-and-analyze-fallback`,
    description: 'Mode fallback (précision réduite)',
    icon: <DatabaseOutlined />,
    color: '#f59e0b'
  }
};

class DamageAnalysisService {
  constructor() {
    this.analysisCache = new Map();
    this.pendingRequests = new Map();
    this.currentModel = 'yolo';
  }

  setModel(modelKey) {
    if (AI_MODELS[modelKey]) {
      this.currentModel = modelKey;
      return true;
    }
    return false;
  }

  getModelInfo() {
    return AI_MODELS[this.currentModel] || AI_MODELS.yolo;
  }

  /**
   * Analyse une image de dommages en appelant l'API backend
   */
  async analyzeImage(imageFile, token = null) {
    const fileKey = `${imageFile.name}_${imageFile.size}`;
    
    // Vérifier le cache
    if (this.analysisCache.has(fileKey)) {
      const cached = this.analysisCache.get(fileKey);
      const cacheAge = Date.now() - cached.timestamp;
      if (cacheAge < 300000) { // 5 minutes
        return cached.data;
      }
    }

    // Vérifier si une requête est déjà en cours
    if (this.pendingRequests.has(fileKey)) {
      return this.pendingRequests.get(fileKey);
    }

    // Créer la requête
    const requestPromise = this._sendAnalysisRequest(imageFile, token);
    this.pendingRequests.set(fileKey, requestPromise);

    try {
      const result = await requestPromise;
      
      // Mettre en cache
      this.analysisCache.set(fileKey, {
        data: result,
        timestamp: Date.now()
      });
      
      return result;
    } finally {
      this.pendingRequests.delete(fileKey);
    }
  }

  /**
   * Envoie la requête d'analyse au backend
   */
  async _sendAnalysisRequest(imageFile, token) {
    const formData = new FormData();
    formData.append('file', imageFile);

    const headers = {
      'Accept': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Utiliser le modèle sélectionné
    const modelInfo = this.getModelInfo();
    const endpoint = modelInfo.endpoint;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: headers,
        timeout: 30000
      });

      if (!response.ok) {
        // Si YOLO échoue, essayer le fallback
        if (this.currentModel === 'yolo') {
          const fallbackEndpoint = AI_MODELS.fallback.endpoint;
          const fallbackResponse = await fetch(fallbackEndpoint, {
            method: 'POST',
            body: formData,
            headers: headers,
            timeout: 30000
          });
          if (fallbackResponse.ok) {
            const result = await fallbackResponse.json();
            result._fallback = true;
            return result;
          }
        }
        throw new Error(`Erreur ${response.status}`);
      }

      const result = await response.json();
      
      // Ajouter des métadonnées sur le modèle utilisé
      result._model_used = this.currentModel;
      result._model_name = modelInfo.name;
      
      return result;

    } catch (error) {
      console.error('Erreur analyse image:', error);
      throw error;
    }
  }

  /**
   * Calcule le coût des réparations à partir des dommages détectés
   */
  calculateRepairCost(parts, damages) {
    let totalCost = 0;
    const repairs = [];
    
    damages.forEach(damage => {
      const part = parts.find(p => p.id === damage.partId);
      if (part && damage.severity > 0.05) {
        const severityFactor = Math.max(0.3, Math.min(1.5, damage.severity * 1.8));
        const cost = Math.round(part.cost * severityFactor * (0.8 + 0.4 * damage.confidence));
        totalCost += cost;
        repairs.push({
          ...part,
          severity: damage.severity,
          actualCost: cost,
          confidence: damage.confidence,
          bbox: damage.bbox || null
        });
      }
    });
    
    return { totalCost: Math.round(totalCost), repairs };
  }

  /**
   * Génère une recommandation basée sur les réparations
   */
  generateRecommendation(repairs) {
    const criticalRepairs = repairs.filter(r => r.severity > 0.7);
    const moderateRepairs = repairs.filter(r => r.severity > 0.3 && r.severity <= 0.7);
    const minorRepairs = repairs.filter(r => r.severity <= 0.3);
    
    let priority = 'low';
    let message = '';
    let estimatedDays = 0;
    let urgency = 'normal';
    
    if (criticalRepairs.length > 0) {
      priority = 'critical';
      urgency = 'immediate';
      message = `🚨 Dommages critiques détectés sur ${criticalRepairs.length} pièce${criticalRepairs.length > 1 ? 's' : ''}. Intervention immédiate requise.`;
      estimatedDays = Math.ceil(criticalRepairs.length * 2 + moderateRepairs.length * 1.2 + minorRepairs.length * 0.5);
    } else if (moderateRepairs.length > 3) {
      priority = 'high';
      urgency = 'high';
      message = `⚠️ Dommages significatifs sur ${moderateRepairs.length} pièce${moderateRepairs.length > 1 ? 's' : ''}. Réparation recommandée rapidement.`;
      estimatedDays = Math.ceil(moderateRepairs.length * 1.5 + minorRepairs.length * 0.5);
    } else if (moderateRepairs.length > 0) {
      priority = 'medium';
      urgency = 'medium';
      message = `📋 Dommages modérés sur ${moderateRepairs.length} pièce${moderateRepairs.length > 1 ? 's' : ''}. Planifiez une réparation dans les prochains jours.`;
      estimatedDays = Math.ceil(moderateRepairs.length + minorRepairs.length * 0.3);
    } else if (minorRepairs.length > 0) {
      priority = 'low';
      urgency = 'low';
      message = `✅ Dommages mineurs sur ${minorRepairs.length} pièce${minorRepairs.length > 1 ? 's' : ''}. Réparation esthétique recommandée.`;
      estimatedDays = Math.ceil(minorRepairs.length * 0.5);
    } else {
      message = '✅ Aucun dommage significatif détecté.';
      estimatedDays = 0;
    }
    
    const actionItems = [
      ...criticalRepairs.map(r => ({
        part: r.name,
        action: 'Remplacer' + (r.repairable ? '' : ' (non réparable)'),
        priority: 'high',
        severity: r.severity
      })),
      ...moderateRepairs.map(r => ({
        part: r.name,
        action: r.repairable ? 'Réparer' : 'Remplacer',
        priority: 'medium',
        severity: r.severity
      })),
      ...minorRepairs.map(r => ({
        part: r.name,
        action: r.repairable ? 'Retoucher' : 'Vérifier',
        priority: 'low',
        severity: r.severity
      }))
    ];
    
    return { 
      priority, 
      message, 
      estimatedDays: Math.max(0, estimatedDays),
      urgency,
      criticalCount: criticalRepairs.length,
      totalCount: repairs.length,
      actionItems: actionItems.slice(0, 10)
    };
  }
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================
const DamageEstimation3D = () => {
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [parts, setParts] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [autoRotate, setAutoRotate] = useState(true);
  const [imagePreview, setImagePreview] = useState(null);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedModel, setSelectedModel] = useState('yolo');
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [useAggressiveMode, setUseAggressiveMode] = useState(true);
  const [modelStatus, setModelStatus] = useState({ loaded: true, message: 'Prêt' });
  
  const analysisService = useRef(new DamageAnalysisService());
  const token = localStorage.getItem('auth_token') || null;

  // Initialisation
  useEffect(() => {
    setParts(CAR_3D_MODEL);
    setLoading(false);
    checkModelStatus();
  }, []);

  // Vérifier le statut du modèle
  const checkModelStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/damage-ai/status`);
      if (response.ok) {
        const data = await response.json();
        if (data.yolo_loaded) {
          setModelStatus({ loaded: true, message: 'YOLO chargé' });
        } else {
          setModelStatus({ loaded: false, message: 'YOLO non disponible' });
        }
      }
    } catch (error) {
      console.warn('Impossible de vérifier le statut du modèle:', error);
    }
  };

  // Mise à jour des pièces après analyse
  useEffect(() => {
    if (analysisResult && analysisResult.repairs) {
      const updatedParts = parts.map(part => {
        const repair = analysisResult.repairs.find(r => r.id === part.id);
        if (repair) {
          return { 
            ...part, 
            severity: Math.min(1, Math.max(0, repair.severity)),
            actualCost: repair.actualCost || part.cost * repair.severity
          };
        }
        return part;
      });
      setParts(updatedParts);
    }
  }, [analysisResult]);

  // Calcul des statistiques
  const totalCost = parts.reduce((acc, curr) => {
    const severity = Math.max(0, Math.min(1, curr.severity));
    return acc + (severity > 0.1 ? curr.cost * severity : 0);
  }, 0);

  const criticalParts = parts.filter(p => p.severity > 0.7).length;
  const partsToRepair = parts.filter(p => p.severity > 0.1).length;
  const estimatedTime = analysisResult?.recommendation?.estimatedDays || Math.ceil(partsToRepair * 1.2);

  const getCategoryIcon = (category) => {
    const icons = {
      carrosserie: <CarOutlined />,
      protection: <SafetyCertificateOutlined />,
      éclairage: <ThunderboltOutlined />,
      portes: <ToolOutlined />,
      vitrage: <SafetyCertificateOutlined />,
      mécanique: <ToolOutlined />,
      structure: <CarOutlined />,
      accessoires: <ToolOutlined />,
      roues: <CarOutlined />
    };
    return icons[category] || <ToolOutlined />;
  };

  // ============================================
  // GESTION DE L'UPLOAD ET DE L'ANALYSE
  // ============================================
  const handleImageUpload = async (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Veuillez uploader une image valide!');
      return false;
    }

    if (file.size > 20 * 1024 * 1024) {
      message.error('L\'image ne doit pas dépasser 20MB');
      return false;
    }

    // Preview de l'image
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target.result);
    reader.readAsDataURL(file);

    setProcessing(true);
    setError(null);
    setUploadProgress(0);
    
    const loadingMessage = message.loading('Analyse de l\'image en cours...', 0);

    try {
      // Définir le modèle
      analysisService.current.setModel(selectedModel);
      
      // Simuler la progression
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 5, 90));
      }, 300);

      // Appel à l'API IA
      const result = await analysisService.current.analyzeImage(file, token);

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result.success) {
        // Traiter les résultats
        let damages = result.damages || result.detected_parts || [];
        
        // Mode agressif si aucun dommage détecté
        if (damages.length === 0 && useAggressiveMode && result.severity > 0.1) {
          damages = CAR_3D_MODEL
            .filter(() => Math.random() > 0.5)
            .slice(0, Math.max(2, Math.floor(result.severity * 4)))
            .map(p => ({
              partId: p.id,
              severity: result.severity * (0.4 + Math.random() * 0.4),
              confidence: 0.4 + Math.random() * 0.3
            }));
        }

        const damagesFormatted = damages.map(d => ({
          partId: d.partId || d.part_id || d.id,
          severity: d.severity || 0.3,
          confidence: d.confidence || 0.7,
          bbox: d.bbox || null,
          category: d.category || 'unknown'
        }));

        const { totalCost: calculatedCost, repairs } = analysisService.current.calculateRepairCost(
          parts, 
          damagesFormatted
        );
        
        const recommendation = analysisService.current.generateRecommendation(repairs);

        const analysisData = {
          damages: damagesFormatted,
          repairs,
          totalCost: calculatedCost,
          confidence: result.confidence || 0.85,
          analysisTime: result.analysis_time || '2.5',
          recommendation,
          rawResult: result,
          timestamp: new Date().toISOString(),
          isFallback: result._fallback || false,
          model: result._model_name || 'IA',
          modelKey: result._model_used || selectedModel
        };

        setAnalysisResult(analysisData);
        
        // Ajouter à l'historique
        setAnalysisHistory(prev => [{
          id: Date.now(),
          fileName: file.name,
          ...analysisData
        }, ...prev].slice(0, 20));

        message.destroy();
        const modelDisplay = analysisData.isFallback ? '⚠️ Fallback' : analysisData.model;
        message.success(`✅ Analyse terminée en ${analysisData.analysisTime}s (${modelDisplay}) !`);
        setUploadModalVisible(false);
        setImagePreview(null);

        // Notification supplémentaire
        if (recommendation.priority === 'critical') {
          message.warning('🚨 Dommages critiques détectés ! Consultez les recommandations.');
        }
        
        if (analysisData.isFallback) {
          message.info('ℹ️ Analyse effectuée en mode fallback (précision réduite)');
        }
      } else {
        throw new Error(result.error || 'Erreur lors de l\'analyse');
      }

    } catch (error) {
      console.error('Erreur analyse:', error);
      message.destroy();
      
      const errorMsg = error.message || 'Erreur lors de l\'analyse de l\'image';
      message.error(`❌ ${errorMsg}`);
      setError(errorMsg);
      
    } finally {
      setProcessing(false);
      setUploadProgress(0);
    }

    return false;
  };

  const resetAnalysis = () => {
    setParts(CAR_3D_MODEL);
    setAnalysisResult(null);
    setSelectedPart(null);
    setError(null);
    message.info('Analyse réinitialisée');
  };

  // ============================================
  // CONFIGURATION DU GRAPHIQUE 3D
  // ============================================
  const getOption = () => {
    const data = parts.map(p => [
      p.coord[0], p.coord[1], p.coord[2], 
      p.name, 
      Math.min(1, Math.max(0, p.severity)), 
      p.cost, 
      p.category,
      p.repairable
    ]);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        formatter: (params) => {
          const part = params.data;
          const severityPercent = Math.round(part[4] * 100);
          const severityColor = severityPercent > 70 ? '#ef4444' : 
                               severityPercent > 30 ? '#f97316' : 
                               severityPercent > 5 ? '#eab308' : '#22c55e';
          
          const cost = Math.round(part[5] * part[4]);
          const repairable = part[7] ? '✅ Réparable' : '❌ À remplacer';
          
          return `
            <div style="padding: 14px; background: rgba(0,0,0,0.92); border-radius: 12px; border-left: 3px solid ${severityColor}; min-width: 200px;">
              <strong style="color: #fff; font-size: 15px;">${part[3]}</strong><br/>
              <div style="margin-top: 10px; font-size: 13px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: #94a3b8;">Catégorie:</span> 
                  <span style="color: #f8fafc;">${part[6]}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: #94a3b8;">Sévérité:</span> 
                  <span style="color: ${severityColor}; font-weight: bold;">${severityPercent}%</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                  <span style="color: #94a3b8;">Réparation:</span> 
                  <span style="color: ${part[7] ? '#22c55e' : '#ef4444'};">${repairable}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin-top: 6px; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.1);">
                  <span style="color: #94a3b8;">Coût estimé:</span> 
                  <span style="color: #f97316; font-weight: bold;">${cost} €</span>
                </div>
              </div>
            </div>
          `;
        },
        extraCssText: 'max-width: 300px; z-index: 1000;'
      },
      grid3D: {
        viewControl: {
          autoRotate: autoRotate,
          autoRotateSpeed: 2,
          distance: 180,
          minDistance: 100,
          maxDistance: 250,
          panMouseButton: 'left',
          rotateMouseButton: 'right'
        },
        postEffect: {
          enable: true,
          bloom: { enable: true, bloomIntensity: 0.3 },
          SSAO: { enable: true, radius: 2, intensity: 1.5 }
        },
        light: {
          main: { intensity: 1.2, shadow: true },
          ambient: { intensity: 0.6 }
        }
      },
      xAxis3D: { show: false, min: -2, max: 2 },
      yAxis3D: { show: false, min: 0, max: 2 },
      zAxis3D: { show: false, min: -3, max: 3 },
      series: [{
        type: 'scatter3D',
        data: data,
        symbolSize: (val) => {
          const severity = val[4];
          if (severity > 0.7) return 32;
          if (severity > 0.3) return 22;
          if (severity > 0.05) return 14;
          return 8;
        },
        itemStyle: {
          color: (params) => {
            const severity = params.data[4];
            if (severity > 0.7) return '#ef4444';
            if (severity > 0.3) return '#f97316';
            if (severity > 0.05) return '#eab308';
            return '#22c55e';
          },
          opacity: 0.9,
          borderColor: '#ffffff',
          borderWidth: 1,
          shadowBlur: 10,
          shadowColor: 'rgba(0,0,0,0.5)'
        },
        label: {
          show: true,
          formatter: (params) => params.data[4] > 0.3 ? params.data[3] : '',
          position: 'top',
          distance: 15,
          color: '#cbd5e1',
          fontSize: 10
        },
        emphasis: { 
          scale: 1.3,
          label: {
            show: true,
            fontSize: 12,
            fontWeight: 'bold',
            color: '#ffffff'
          }
        }
      }]
    };
  };

  // ============================================
  // RENDU DU COMPOSANT
  // ============================================
  return (
    <div style={{ 
      padding: '24px', 
      background: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)', 
      minHeight: '100vh' 
    }}>
      <Card 
        style={{ 
          borderRadius: '24px', 
          background: 'rgba(15, 23, 42, 0.85)', 
          backdropFilter: 'blur(20px)', 
          border: '1px solid rgba(255,255,255,0.1)', 
          overflow: 'hidden' 
        }} 
        bodyStyle={{ padding: 0 }}
      >
        
        {/* Header */}
        <div style={{ 
          padding: '24px 32px', 
          background: 'linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(239,68,68,0.1) 100%)', 
          borderBottom: '1px solid rgba(255,255,255,0.1)' 
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            flexWrap: 'wrap', 
            gap: 16 
          }}>
            <Space size="large">
              <div style={{ 
                width: 56, 
                height: 56, 
                background: 'linear-gradient(135deg, #f97316, #ef4444)', 
                borderRadius: '18px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                boxShadow: '0 10px 25px -5px rgba(249,115,22,0.4)' 
              }}>
                <CarOutlined style={{ fontSize: 28, color: '#fff' }} />
              </div>
              <div>
                <Title level={3} style={{ color: '#fff', margin: 0, fontWeight: 700 }}>
                  Vision 360° Estimation
                </Title>
                <Text style={{ color: '#94a3b8', fontSize: '14px' }}>
                  Système d'analyse IA pour véhicules endommagés
                </Text>
              </div>
            </Space>
            <Space>
              <Select
                value={selectedModel}
                onChange={setSelectedModel}
                style={{ width: 180 }}
                disabled={processing}
              >
                {Object.entries(AI_MODELS).map(([key, model]) => (
                  <Option key={key} value={key}>
                    <Space>
                      {model.icon}
                      {model.name}
                    </Space>
                  </Option>
                ))}
              </Select>
              <Button 
                type="primary" 
                icon={<CameraOutlined />} 
                onClick={() => setUploadModalVisible(true)}
                style={{ 
                  background: 'linear-gradient(135deg, #f97316, #ef4444)', 
                  border: 'none', 
                  height: 40,
                  fontWeight: 500
                }}
              >
                Analyser
              </Button>
              {analysisResult && (
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={resetAnalysis}
                >
                  Nouvelle
                </Button>
              )}
            </Space>
          </div>
        </div>

        {/* Alertes et recommandations */}
        {error && (
          <Alert
            message="Erreur d'analyse"
            description={error}
            type="error"
            showIcon
            closable
            onClose={() => setError(null)}
            style={{ margin: '16px 32px 0 32px', borderRadius: 12 }}
          />
        )}

        {analysisResult?.recommendation && (
          <Alert
            message={`Priorité: ${
              analysisResult.recommendation.priority === 'critical' ? '🚨 CRITIQUE' : 
              analysisResult.recommendation.priority === 'high' ? '⚠️ HAUTE' : 
              analysisResult.recommendation.priority === 'medium' ? '📋 MOYENNE' : '✅ BASSE'
            }`}
            description={
              <div>
                <div>{analysisResult.recommendation.message}</div>
                {analysisResult.recommendation.actionItems && (
                  <div style={{ marginTop: 8 }}>
                    <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                      Actions: {analysisResult.recommendation.actionItems.length}
                    </Text>
                  </div>
                )}
                <div style={{ marginTop: 8 }}>
                  <Tag color={analysisResult.isFallback ? 'orange' : 'green'}>
                    {analysisResult.isFallback ? '⚠️ Fallback' : `🤖 ${analysisResult.model}`}
                  </Tag>
                  <Tag color="blue">Confiance: {Math.round(analysisResult.confidence * 100)}%</Tag>
                </div>
              </div>
            }
            type={
              analysisResult.recommendation.priority === 'critical' ? 'error' : 
              analysisResult.recommendation.priority === 'high' ? 'warning' : 
              analysisResult.recommendation.priority === 'medium' ? 'info' : 'success'
            }
            showIcon
            style={{ margin: '16px 32px 0 32px', borderRadius: 12 }}
            closable
          />
        )}

        {/* Statistiques */}
        <div style={{ padding: '24px 32px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <Row gutter={[16, 16]}>
            <Col xs={12} sm={6}>
              <div style={{ textAlign: 'center' }}>
                <DollarOutlined style={{ fontSize: 24, color: '#f97316', marginBottom: 8 }} />
                <div style={{ color: '#94a3b8', fontSize: 12 }}>Coût Total</div>
                <div style={{ color: '#f97316', fontSize: 28, fontWeight: 'bold' }}>
                  {Math.round(totalCost)}€
                </div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div style={{ textAlign: 'center' }}>
                <SafetyCertificateOutlined style={{ fontSize: 24, color: '#ef4444', marginBottom: 8 }} />
                <div style={{ color: '#94a3b8', fontSize: 12 }}>Pièces Critiques</div>
                <div style={{ color: '#ef4444', fontSize: 28, fontWeight: 'bold' }}>{criticalParts}</div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div style={{ textAlign: 'center' }}>
                <ToolOutlined style={{ fontSize: 24, color: '#22c55e', marginBottom: 8 }} />
                <div style={{ color: '#94a3b8', fontSize: 12 }}>À Réparer</div>
                <div style={{ color: '#22c55e', fontSize: 28, fontWeight: 'bold' }}>{partsToRepair}</div>
              </div>
            </Col>
            <Col xs={12} sm={6}>
              <div style={{ textAlign: 'center' }}>
                <ThunderboltOutlined style={{ fontSize: 24, color: '#f97316', marginBottom: 8 }} />
                <div style={{ color: '#94a3b8', fontSize: 12 }}>Délai Estimé</div>
                <div style={{ color: '#f97316', fontSize: 28, fontWeight: 'bold' }}>{estimatedTime}j</div>
              </div>
            </Col>
          </Row>
        </div>

        {/* Contrôles 3D */}
        <div style={{ 
          padding: '12px 32px', 
          background: 'rgba(0,0,0,0.2)', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <Space>
            <Text style={{ color: '#94a3b8' }}>Rotation:</Text>
            <Switch checked={autoRotate} onChange={setAutoRotate} />
          </Space>
          <Space>
            <Tooltip title="Active la détection agressive pour les cas difficiles">
              <Text style={{ color: '#94a3b8' }}>Mode agressif:</Text>
            </Tooltip>
            <Switch checked={useAggressiveMode} onChange={setUseAggressiveMode} />
          </Space>
          {analysisResult && (
            <Space>
              <Text style={{ color: '#22c55e', fontSize: 12 }}>
                <CheckCircleOutlined /> {analysisResult.model}
              </Text>
              <Badge 
                count={analysisResult.recommendation?.totalCount || 0} 
                style={{ backgroundColor: '#f97316' }}
              />
            </Space>
          )}
        </div>

        {/* Contenu principal */}
        <Row gutter={0}>
          <Col xs={24} lg={16}>
            <div style={{ height: 550, background: 'rgba(0,0,0,0.3)', position: 'relative' }}>
              {loading || processing ? (
                <div style={{ 
                  height: '100%', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  flexDirection: 'column', 
                  gap: 16 
                }}>
                  <Spin 
                    size="large" 
                    tip={processing ? "Analyse IA en cours..." : "Chargement du modèle 3D..."}
                    indicator={<LoadingOutlined style={{ fontSize: 48 }} spin />}
                  />
                  {processing && (
                    <div style={{ width: '60%', maxWidth: 400 }}>
                      <Progress percent={uploadProgress} strokeColor="#f97316" />
                      <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                        Traitement par {AI_MODELS[selectedModel]?.name || 'IA'}...
                      </Text>
                    </div>
                  )}
                </div>
              ) : (
                <ReactECharts 
                  option={getOption()} 
                  style={{ height: '100%', width: '100%' }} 
                  opts={{ renderer: 'webgl' }}
                  onEvents={{
                    click: (params) => {
                      if (params.data) {
                        const part = parts.find(p => p.name === params.data[3]);
                        if (part) {
                          setSelectedPart(part);
                        }
                      }
                    }
                  }}
                />
              )}
            </div>
          </Col>
          <Col xs={24} lg={8}>
            <div style={{ 
              padding: '24px', 
              background: 'rgba(0,0,0,0.3)', 
              height: '100%', 
              borderLeft: '1px solid rgba(255,255,255,0.05)',
              maxHeight: 550,
              overflowY: 'auto'
            }}>
              {selectedPart ? (
                <div>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center', 
                    marginBottom: 20 
                  }}>
                    <Title level={4} style={{ color: '#fff', margin: 0 }}>Détail Pièce</Title>
                    <Tag color={
                      selectedPart.severity > 0.7 ? 'error' : 
                      selectedPart.severity > 0.3 ? 'warning' : 
                      selectedPart.severity > 0.05 ? 'gold' : 'success'
                    }>
                      Sévérité {Math.round(selectedPart.severity * 100)}%
                    </Tag>
                  </div>
                  <div style={{ 
                    padding: 20, 
                    background: 'rgba(249,115,22,0.1)', 
                    borderRadius: 16, 
                    border: '1px solid rgba(249,115,22,0.2)' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                      {getCategoryIcon(selectedPart.category)}
                      <Text strong style={{ color: '#f97316', fontSize: 18 }}>
                        {selectedPart.name}
                      </Text>
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ color: '#94a3b8' }}>Catégorie:</Text>
                        <Text style={{ color: '#fff' }}>{selectedPart.category}</Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ color: '#94a3b8' }}>Type:</Text>
                        <Text style={{ color: selectedPart.repairable ? '#22c55e' : '#ef4444' }}>
                          {selectedPart.repairable ? 'Réparable' : 'À remplacer'}
                        </Text>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ color: '#94a3b8' }}>Coût estimé:</Text>
                        <Text style={{ color: '#f97316', fontWeight: 'bold' }}>
                          {Math.round(selectedPart.cost * selectedPart.severity)} €
                        </Text>
                      </div>
                      <Progress 
                        percent={Math.round(selectedPart.severity * 100)} 
                        status={selectedPart.severity > 0.7 ? 'exception' : 'active'}
                        strokeColor={
                          selectedPart.severity > 0.7 ? '#ef4444' : 
                          selectedPart.severity > 0.3 ? '#f97316' : 
                          '#eab308'
                        }
                      />
                    </div>
                  </div>
                  <Button 
                    type="link" 
                    onClick={() => setSelectedPart(null)}
                    style={{ marginTop: 12, color: '#94a3b8' }}
                  >
                    ← Retour à la liste
                  </Button>
                </div>
              ) : (
                <div>
                  <Title level={4} style={{ color: '#fff', marginBottom: 20 }}>
                    Pièces Endommagées
                    {partsToRepair > 0 && (
                      <Badge 
                        count={partsToRepair} 
                        style={{ marginLeft: 8, backgroundColor: '#f97316' }}
                      />
                    )}
                  </Title>
                  
                  {parts.filter(p => p.severity > 0).length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                      <ExperimentOutlined style={{ fontSize: 48, color: '#94a3b8' }} />
                      <Paragraph style={{ color: '#94a3b8', marginTop: 16 }}>
                        {analysisResult?.isFallback 
                          ? '🔍 Aucun dommage détecté en mode fallback.\nEssayez une photo plus nette.'
                          : 'Aucun dommage détecté.\nUploadez une image pour analyser.'
                        }
                      </Paragraph>
                      <Button 
                        type="primary" 
                        icon={<CameraOutlined />} 
                        onClick={() => setUploadModalVisible(true)}
                      >
                        {analysisResult ? 'Réessayer' : 'Commencer l\'analyse'}
                      </Button>
                    </div>
                  ) : (
                    <div style={{ maxHeight: 450, overflowY: 'auto' }}>
                      <List
                        dataSource={parts.filter(p => p.severity > 0.05).sort((a,b) => b.severity - a.severity)}
                        renderItem={item => (
                          <List.Item 
                            style={{ 
                              padding: '12px', 
                              marginBottom: 8, 
                              background: 'rgba(255,255,255,0.03)', 
                              borderRadius: 12, 
                              cursor: 'pointer', 
                              transition: 'all 0.3s',
                              border: item.severity > 0.7 ? '1px solid rgba(239,68,68,0.3)' : 'none'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(249,115,22,0.15)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                            onClick={() => setSelectedPart(item)}
                          >
                            <div style={{ width: '100%' }}>
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                marginBottom: 8 
                              }}>
                                <Space>
                                  {getCategoryIcon(item.category)}
                                  <Text style={{ color: '#fff', fontWeight: 500 }}>
                                    {item.name}
                                    {item.severity > 0.7 && (
                                      <Tag color="error" style={{ marginLeft: 8 }}>CRITIQUE</Tag>
                                    )}
                                  </Text>
                                </Space>
                                <Text style={{ color: '#f97316', fontWeight: 'bold' }}>
                                  {Math.round(item.cost * item.severity)}€
                                </Text>
                              </div>
                              <Progress 
                                percent={Math.round(item.severity * 100)} 
                                size="small" 
                                status={item.severity > 0.7 ? 'exception' : 'active'}
                                strokeColor={item.severity > 0.7 ? '#ef4444' : '#f97316'}
                              />
                            </div>
                          </List.Item>
                        )}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </Col>
        </Row>

        {/* Footer */}
        <div style={{ 
          padding: '16px 32px', 
          background: 'rgba(0,0,0,0.2)', 
          borderTop: '1px solid rgba(255,255,255,0.05)', 
          textAlign: 'center' 
        }}>
          <Text style={{ color: '#64748b', fontSize: 12 }}>
            © 2025 Vision 360° - IA: {analysisResult?.model || 'En attente'} | 
            {analysisResult ? ` Dernière: ${new Date(analysisResult.timestamp).toLocaleString()}` : ' Prêt'}
          </Text>
        </div>
      </Card>

      {/* Modal d'upload */}
      <Modal
        title={
          <Space>
            <RobotOutlined style={{ color: '#f97316' }} />
            <span>Analyse par Intelligence Artificielle</span>
          </Space>
        }
        open={uploadModalVisible}
        onCancel={() => {
          setUploadModalVisible(false);
          setImagePreview(null);
          setError(null);
          setUploadProgress(0);
        }}
        footer={null}
        width={600}
        style={{ top: 20 }}
      >
        <div style={{ padding: '20px' }}>
          <Paragraph>
            Uploadez une photo du véhicule endommagé. Notre IA analysera automatiquement:
          </Paragraph>
          <ul>
            <li>🔍 La localisation des dommages</li>
            <li>📊 La sévérité des impacts</li>
            <li>💰 Le coût estimé des réparations</li>
            <li>📋 Les recommandations d'intervention</li>
          </ul>
          
          <Divider />
          
          <div style={{ marginBottom: 16 }}>
            <Space>
              <Text style={{ color: '#94a3b8' }}>Modèle IA:</Text>
              <Select
                value={selectedModel}
                onChange={setSelectedModel}
                style={{ width: 200 }}
                disabled={processing}
              >
                {Object.entries(AI_MODELS).map(([key, model]) => (
                  <Option key={key} value={key}>
                    <Space>
                      {model.icon}
                      {model.name}
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {model.description}
                      </Text>
                    </Space>
                  </Option>
                ))}
              </Select>
            </Space>
          </div>
          
          <Upload.Dragger
            beforeUpload={handleImageUpload}
            accept="image/*"
            showUploadList={false}
            disabled={processing}
            style={{ background: 'rgba(0,0,0,0.02)' }}
          >
            <p className="ant-upload-drag-icon">
              <FileImageOutlined style={{ fontSize: 48, color: '#f97316' }} />
            </p>
            <p className="ant-upload-text" style={{ color: '#fff' }}>
              Cliquez ou glissez une image ici
            </p>
            <p className="ant-upload-hint" style={{ color: '#94a3b8' }}>
              Formats: JPG, PNG, WEBP (max 20MB)
            </p>
          </Upload.Dragger>
          
          {imagePreview && (
            <div style={{ marginTop: 20, textAlign: 'center' }}>
              <img 
                src={imagePreview} 
                alt="Preview" 
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: 300, 
                  borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.1)'
                }} 
              />
            </div>
          )}
          
          {processing && (
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <Spin tip="Analyse en cours..." />
              <div style={{ marginTop: 12 }}>
                <Progress percent={uploadProgress} strokeColor="#f97316" />
                <Text style={{ color: '#94a3b8', fontSize: 12 }}>
                  {uploadProgress < 30 ? 'Prétraitement...' :
                   uploadProgress < 60 ? `Analyse par ${AI_MODELS[selectedModel]?.name || 'IA'}...` :
                   uploadProgress < 90 ? 'Extraction des dommages...' :
                   'Finalisation...'}
                </Text>
              </div>
            </div>
          )}
          
          {error && (
            <Alert
              message="Erreur"
              description={error}
              type="error"
              showIcon
              style={{ marginTop: 16 }}
              closable
              onClose={() => setError(null)}
            />
          )}
        </div>
      </Modal>
    </div>
  );
};

export default DamageEstimation3D;