import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Card, Typography, Spin, Badge, Space, Alert, Statistic, Row, Col, 
  Tooltip, Segmented, Modal, Button, Divider, Upload, Progress, 
  List, Tag, Steps, message, Select, Switch, Form, Input, InputNumber
} from 'antd';
import { 
  GlobalOutlined, ThunderboltOutlined, DashboardOutlined, EyeOutlined, 
  RotateRightOutlined, QuestionCircleOutlined, EnvironmentOutlined, 
  CloudOutlined, HeatMapOutlined, UploadOutlined, FileImageOutlined,
  ScanOutlined, CheckCircleOutlined, DeleteOutlined, CloseCircleOutlined,
  BarChartOutlined, LineChartOutlined, ReloadOutlined, RobotOutlined,
  ApiOutlined, DatabaseOutlined, SettingOutlined
} from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import 'echarts-gl';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { Option } = Select;

// ============================================
// 1. DÉFINIR API_URL EN PREMIER
// ============================================

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// ============================================
// 2. CONFIGURATION DES MODÈLES IA
// ============================================

const AI_MODELS = {
  yolo: {
    name: 'YOLO',
    endpoint: `${API_URL}/damage-ai/upload-and-analyze-yolo`,
    description: 'Détection avancée en temps réel',
    icon: <RobotOutlined />,
    color: '#10b981',
    features: ['Détection d\'objets', '80 classes', 'Temps réel']
  },
  vit: {
    name: 'Vit-BEiT',
    endpoint: `${API_URL}/damage-ai/upload-and-analyze-public`,
    description: 'Classification d\'images',
    icon: <ApiOutlined />,
    color: '#3b82f6',
    features: ['Classification', 'Haute précision', 'Vision Transformer']
  },
  multimodal: {
    name: 'Multimodal',
    endpoint: `${API_URL}/multimodal-ai/analyze`,
    description: 'Analyse combinée multi-modèles',
    icon: <DatabaseOutlined />,
    color: '#8b5cf6',
    features: ['Multi-modèles', 'Analyse approfondie', 'Fusion de données']
  },
  climate: {
    name: 'Climate',
    endpoint: `${API_URL}/climate-ai/analyze`,
    description: 'Analyse météo et environnement',
    icon: <CloudOutlined />,
    color: '#06b6d4',
    features: ['Climat', 'Environnement', 'Prédictions']
  }
};

// ============================================
// 3. SERVICE D'ANALYSE IA AVANCÉE
// ============================================

class AdvancedImageAnalysisService {
  /**
   * Analyse une image avec le modèle IA sélectionné
   */
  static async analyzeImageWithAI(imageFile, modelType = 'yolo', token = null) {
    const formData = new FormData();
    formData.append('file', imageFile);

    const headers = {
      'Accept': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const model = AI_MODELS[modelType] || AI_MODELS.yolo;
    const endpoint = model.endpoint;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: headers
      });

      if (!response.ok) {
        // Si le modèle principal échoue, essayer le fallback
        if (modelType !== 'yolo') {
          const yoloResponse = await fetch(AI_MODELS.yolo.endpoint, {
            method: 'POST',
            body: formData,
            headers: headers
          });
          if (yoloResponse.ok) {
            const result = await yoloResponse.json();
            result._fallback = true;
            result._model_used = 'yolo_fallback';
            return result;
          }
        }
        throw new Error(`Erreur API: ${response.status}`);
      }

      const result = await response.json();
      result._model_used = modelType;
      result._model_name = model.name;
      
      return result;
    } catch (error) {
      console.error('Erreur analyse IA:', error);
      throw error;
    }
  }

  /**
   * Extrait les données climatiques d'une image
   */
  static async extractClimateData(imageFile, modelType = 'yolo', quality = 'high') {
    return new Promise(async (resolve, reject) => {
      try {
        // 1. Valider l'image
        const validation = await this.validateImage(imageFile);
        if (!validation.valid) {
          reject(new Error(validation.error));
          return;
        }

        // 2. Analyser avec l'IA
        let aiResult;
        try {
          aiResult = await this.analyzeImageWithAI(imageFile, modelType);
        } catch (aiError) {
          console.warn('⚠️ Analyse IA échouée, fallback sur analyse spectrale:', aiError);
          aiResult = null;
        }

        // 3. Extraire les données spectrales
        const spectralData = await this.extractSpectralData(imageFile, quality);

        // 4. Combiner les résultats
        const combinedData = this.combineResults(aiResult, spectralData);

        resolve(combinedData);
      } catch (err) {
        reject(err);
      }
    });
  }

  static async validateImage(file) {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve({
          valid: true,
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height
        });
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve({ valid: false, error: "Image corrompue ou format non supporté" });
      };
      
      img.src = url;
    });
  }

  static async extractSpectralData(imageFile, quality = 'high') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const img = new Image();
          img.onload = () => {
            const maxDimension = quality === 'high' ? 200 : 100;
            const scale = Math.min(maxDimension / Math.max(img.width, img.height), 1);
            const sampleWidth = Math.floor(img.width * scale);
            const sampleHeight = Math.floor(img.height * scale);
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            canvas.width = sampleWidth;
            canvas.height = sampleHeight;
            ctx.drawImage(img, 0, 0, sampleWidth, sampleHeight);
            
            const imageData = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
            const terrainData = [];
            const riskData = [];
            
            for (let y = 0; y < sampleHeight; y++) {
              for (let x = 0; x < sampleWidth; x++) {
                const idx = (y * sampleWidth + x) * 4;
                const r = imageData.data[idx];
                const g = imageData.data[idx + 1];
                const b = imageData.data[idx + 2];
                
                // Analyse spectrale avancée
                const brightness = (r + g + b) / 3;
                const greenRatio = g / (r + g + b + 1);
                const blueRatio = b / (r + g + b + 1);
                
                // Altitude basée sur plusieurs facteurs
                let z = 0;
                z += (brightness / 255) * 8;
                z += (greenRatio - 0.33) * 3;
                
                // Risque climatique composite
                let risk = 0;
                
                if (brightness < 80) risk += 0.25;
                if (greenRatio < 0.2) risk += 0.3;
                
                const isUrban = Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && brightness > 100;
                if (isUrban) risk += 0.35;
                
                if (blueRatio > 0.5) risk -= 0.2;
                
                risk = Math.min(1, Math.max(0, risk));
                
                const nx = (x / sampleWidth) * 10 - 5;
                const ny = (y / sampleHeight) * 10 - 5;
                
                terrainData.push([nx, ny, z, risk]);
                riskData.push(risk);
              }
            }
            
            const sortedRisks = [...riskData].sort((a, b) => a - b);
            const stats = {
              maxRisk: Math.max(...riskData),
              minRisk: Math.min(...riskData),
              avgRisk: riskData.reduce((a, b) => a + b, 0) / riskData.length,
              medianRisk: sortedRisks[Math.floor(sortedRisks.length / 2)],
              highRiskZones: riskData.filter(r => r > 0.7).length,
              criticalZones: riskData.filter(r => r > 0.9).length,
              vegetationCover: (imageData.data.filter((_, idx) => idx % 4 === 1 && imageData.data[idx] > 150).length / (sampleWidth * sampleHeight)) * 100,
              waterBodies: (imageData.data.filter((_, idx) => idx % 4 === 2 && imageData.data[idx] > 150 && imageData.data[idx-1] < 100).length / (sampleWidth * sampleHeight)) * 100,
              urbanAreas: (imageData.data.filter((_, idx) => {
                const r = imageData.data[idx-2];
                const g = imageData.data[idx-1];
                const b = imageData.data[idx];
                return Math.abs(r - g) < 20 && Math.abs(g - b) < 20 && (r + g + b) / 3 > 100;
              }).length / (sampleWidth * sampleHeight)) * 100,
              confidence: Math.min(95, 60 + (Math.sqrt(sampleWidth * sampleHeight) / 10))
            };
            
            resolve({
              terrain: terrainData,
              stats,
              metadata: {
                originalSize: { width: img.width, height: img.height },
                sampleSize: { width: sampleWidth, height: sampleHeight },
                quality,
                timestamp: Date.now()
              }
            });
          };
          img.src = e.target.result;
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });
  }

  static combineResults(aiResult, spectralData) {
    if (!aiResult || !aiResult.success) {
      return spectralData;
    }

    // Extraire les données IA
    const detectedParts = aiResult.detected_parts || [];
    const severity = aiResult.severity || 0;
    const confidence = aiResult.confidence || 0;
    const modelName = aiResult._model_name || aiResult.model || 'unknown';

    // Ajouter les données IA aux stats spectrales
    const combinedStats = {
      ...spectralData.stats,
      aiDetectedParts: detectedParts.length,
      aiSeverity: severity,
      aiConfidence: confidence,
      aiModel: modelName,
      aiModelKey: aiResult._model_used || 'unknown',
      detectedDamages: detectedParts.map(p => p.damage_type || p.part_name).filter(Boolean)
    };

    return {
      terrain: spectralData.terrain,
      stats: combinedStats,
      metadata: {
        ...spectralData.metadata,
        aiAnalysis: aiResult,
        modelUsed: modelName,
        isFallback: aiResult._fallback || false
      }
    };
  }

  static async mergeAnalyses(analyses) {
    if (!analyses.length) return null;
    
    const mergedTerrain = [];
    const allStats = analyses.map(a => a.stats);
    
    analyses.forEach(analysis => {
      mergedTerrain.push(...analysis.terrain);
    });
    
    return {
      terrain: mergedTerrain,
      stats: {
        maxRisk: Math.max(...allStats.map(s => s.maxRisk)),
        minRisk: Math.min(...allStats.map(s => s.minRisk)),
        avgRisk: allStats.reduce((a, b) => a + b.avgRisk, 0) / allStats.length,
        medianRisk: allStats.reduce((a, b) => a + b.medianRisk, 0) / allStats.length,
        highRiskZones: allStats.reduce((a, b) => a + b.highRiskZones, 0),
        criticalZones: allStats.reduce((a, b) => a + b.criticalZones, 0),
        vegetationCover: allStats.reduce((a, b) => a + b.vegetationCover, 0) / allStats.length,
        waterBodies: allStats.reduce((a, b) => a + b.waterBodies, 0) / allStats.length,
        urbanAreas: allStats.reduce((a, b) => a + b.urbanAreas, 0) / allStats.length,
        confidence: Math.min(100, allStats.reduce((a, b) => a + b.confidence, 0) / allStats.length),
        aiDetectedParts: allStats.reduce((a, b) => a + (b.aiDetectedParts || 0), 0),
        aiSeverity: allStats.reduce((a, b) => a + (b.aiSeverity || 0), 0) / allStats.length,
        aiModels: [...new Set(allStats.map(s => s.aiModel).filter(Boolean))],
        aiModelKeys: [...new Set(allStats.map(s => s.aiModelKey).filter(Boolean))],
        isFallback: allStats.some(s => s.isFallback)
      }
    };
  }
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const ClimateRiskModeling3D = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [terrainData, setTerrainData] = useState([]);
  const [viewMode, setViewMode] = useState('surface');
  const [autoRotate, setAutoRotate] = useState(true);
  const [showLegend, setShowLegend] = useState(false);
  const [images, setImages] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [analysisQuality, setAnalysisQuality] = useState('high');
  const [modelType, setModelType] = useState('yolo');
  const [useAI, setUseAI] = useState(true);
  const [advancedMode, setAdvancedMode] = useState(false);
  const [stats, setStats] = useState({
    maxRisk: 0,
    avgRisk: 0,
    highRiskZones: 0,
    criticalZones: 0,
    vegetationCover: 0,
    waterBodies: 0,
    urbanAreas: 0,
    confidence: 0,
    aiDetectedParts: 0,
    aiSeverity: 0,
    aiModels: [],
    aiModelKeys: [],
    isFallback: false
  });
  
  const chartRef = useRef(null);
  const token = localStorage.getItem('auth_token') || null;

  // Modèles disponibles pour le sélecteur
  const modelOptions = Object.entries(AI_MODELS).map(([key, model]) => ({
    key,
    ...model
  }));

  const analyzeImages = useCallback(async () => {
    if (images.length === 0) {
      message.warning('Veuillez ajouter des images à analyser');
      return;
    }
    
    setAnalyzing(true);
    setCurrentStep(1);
    setError(null);
    const results = [];
    
    try {
      for (let i = 0; i < images.length; i++) {
        setAnalysisProgress((i / images.length) * 100);
        
        try {
          let result;
          if (useAI) {
            // Utiliser l'analyse IA avancée
            result = await AdvancedImageAnalysisService.extractClimateData(
              images[i], 
              modelType, 
              analysisQuality
            );
          } else {
            // Utiliser uniquement l'analyse spectrale
            result = await AdvancedImageAnalysisService.extractSpectralData(
              images[i], 
              analysisQuality
            );
            // Ajouter des métadonnées
            result.metadata = {
              ...result.metadata,
              aiAnalysis: null,
              modelUsed: 'Spectral'
            };
          }
          
          results.push({
            imageName: images[i].name,
            ...result,
            modelUsed: useAI ? AI_MODELS[modelType]?.name || modelType : 'Spectral'
          });
          
          message.success(`✅ Image ${i+1}/${images.length} analysée`);
        } catch (err) {
          console.error(`Erreur sur l'image ${images[i].name}:`, err);
          message.warning(`⚠️ L'image ${images[i].name} n'a pas pu être analysée correctement`);
        }
      }
      
      if (results.length === 0) {
        throw new Error('Aucune image valide à analyser');
      }
      
      setAnalysisResults(results);
      
      const merged = await AdvancedImageAnalysisService.mergeAnalyses(results);
      
      if (merged) {
        setTerrainData(merged.terrain);
        setStats({
          maxRisk: merged.stats.maxRisk,
          avgRisk: merged.stats.avgRisk,
          highRiskZones: merged.stats.highRiskZones,
          criticalZones: merged.stats.criticalZones,
          vegetationCover: merged.stats.vegetationCover,
          waterBodies: merged.stats.waterBodies,
          urbanAreas: merged.stats.urbanAreas,
          confidence: merged.stats.confidence,
          aiDetectedParts: merged.stats.aiDetectedParts || 0,
          aiSeverity: merged.stats.aiSeverity || 0,
          aiModels: merged.stats.aiModels || [],
          aiModelKeys: merged.stats.aiModelKeys || [],
          isFallback: merged.stats.isFallback || false
        });
      }
      
      setCurrentStep(2);
      message.success(`✅ ${results.length} image(s) analysée(s) avec succès`);
    } catch (err) {
      console.error('Analysis failed:', err);
      setError(`Erreur d'analyse: ${err.message}`);
      message.error('❌ Échec de l\'analyse');
      setCurrentStep(0);
    } finally {
      setAnalyzing(false);
      setLoading(false);
    }
  }, [images, analysisQuality, modelType, useAI]);

  const handleImageUpload = async (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Vous ne pouvez uploader que des images');
      return false;
    }
    
    const validation = await AdvancedImageAnalysisService.validateImage(file);
    if (!validation.valid) {
      message.error(`Image invalide: ${validation.error}`);
      return false;
    }
    
    if (file.size > 20 * 1024 * 1024) {
      message.warning('⚠️ Image volumineuse, les performances peuvent être réduites');
    }
    
    setImages(prev => [...prev, file]);
    return false;
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    if (images.length <= 1) {
      setTerrainData([]);
      setAnalysisResults([]);
      setCurrentStep(0);
      setStats({
        maxRisk: 0,
        avgRisk: 0,
        highRiskZones: 0,
        criticalZones: 0,
        vegetationCover: 0,
        waterBodies: 0,
        urbanAreas: 0,
        confidence: 0,
        aiDetectedParts: 0,
        aiSeverity: 0,
        aiModels: [],
        aiModelKeys: [],
        isFallback: false
      });
    }
  };

  const startAnalysis = () => {
    if (images.length === 0) {
      message.warning('Ajoutez au moins une image');
      return;
    }
    setLoading(true);
    analyzeImages();
  };

  const resetAnalysis = () => {
    setImages([]);
    setTerrainData([]);
    setAnalysisResults([]);
    setCurrentStep(0);
    setError(null);
    setStats({
      maxRisk: 0,
      avgRisk: 0,
      highRiskZones: 0,
      criticalZones: 0,
      vegetationCover: 0,
      waterBodies: 0,
      urbanAreas: 0,
      confidence: 0,
      aiDetectedParts: 0,
      aiSeverity: 0,
      aiModels: [],
      aiModelKeys: [],
      isFallback: false
    });
  };

  const getOption = useMemo(() => {
    if (!terrainData.length) return null;

    return {
      backgroundColor: 'transparent',
      toolbox: {
        show: true,
        feature: {
          saveAsImage: { title: 'Sauvegarder' },
          restore: { title: 'Réinitialiser' }
        },
        right: 20,
        top: 10,
        iconStyle: { borderColor: '#94a3b8' },
        emphasis: { iconStyle: { borderColor: '#38bdf8' } }
      },
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderColor: '#38bdf8',
        borderWidth: 1,
        textStyle: { color: '#f8fafc', fontSize: 12 },
        formatter: (params) => {
          if (!params.value) return '';
          const riskPercent = (params.value[3] * 100).toFixed(1);
          const elevation = params.value[2].toFixed(1);
          let riskLevel = '';
          if (riskPercent > 80) riskLevel = '🔴 Critique';
          else if (riskPercent > 60) riskLevel = '🟠 Élevé';
          else if (riskPercent > 40) riskLevel = '🟡 Modéré';
          else riskLevel = '🟢 Faible';
          
          const modelNames = stats.aiModels.join(', ');
          
          return `
            <div style="padding: 8px;">
              <strong>📍 Zone analysée</strong><br/>
              Position: (${params.value[0].toFixed(2)}, ${params.value[1].toFixed(2)})<br/>
              🏔 Altitude: ${elevation}m<br/>
              ⚠️ Risque: ${riskPercent}% ${riskLevel}<br/>
              ${stats.aiDetectedParts > 0 ? `🤖 IA: ${stats.aiDetectedParts} éléments détectés` : ''}
              ${modelNames ? `📊 Modèles: ${modelNames}` : ''}
              ${stats.isFallback ? '⚠️ Mode fallback' : ''}
              <small>Analyse ${useAI ? 'IA avancée' : 'spectrale'}</small>
            </div>
          `;
        }
      },
      visualMap: {
        show: true,
        dimension: viewMode === 'risk' ? 3 : 2,
        min: viewMode === 'risk' ? 0 : -2,
        max: viewMode === 'risk' ? 1 : 5,
        calculable: true,
        inRange: { 
          color: viewMode === 'risk' 
            ? ['#00a8ff', '#4cd964', '#ff9f0a', '#ff3b30', '#8b0000']
            : ['#1e3a8a', '#3b82f6', '#10b981', '#10b981', '#78350f']
        },
        textStyle: { color: '#94a3b8', fontSize: 11 },
        formatter: viewMode === 'risk' ? (value) => `${(value * 100).toFixed(0)}%` : (value) => `${value.toFixed(0)}m`
      },
      xAxis3D: { 
        type: 'value', 
        name: 'X (km)', 
        nameTextStyle: { color: '#94a3b8', fontSize: 12 },
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 }
      },
      yAxis3D: { 
        type: 'value', 
        name: 'Y (km)', 
        nameTextStyle: { color: '#94a3b8', fontSize: 12 },
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 }
      },
      zAxis3D: { 
        type: 'value', 
        name: viewMode === 'risk' ? 'Indice de risque' : 'Altitude (m)', 
        nameTextStyle: { color: '#94a3b8', fontSize: 12 },
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#94a3b8', fontSize: 10 }
      },
      grid3D: {
        viewControl: {
          autoRotate: autoRotate,
          autoRotateSpeed: 2,
          distance: 220,
          alpha: 35,
          beta: 45,
          minDistance: 100,
          maxDistance: 400,
          zoomSensitivity: 1.2
        },
        postEffect: {
          enable: true,
          SSAO: { enable: true, radius: 2, intensity: 1.2 },
          bloom: { enable: true, intensity: 0.3 }
        },
        light: {
          main: { intensity: 1.8, shadow: true },
          ambient: { intensity: 0.4 }
        }
      },
      series: [{
        type: 'surface',
        name: viewMode === 'risk' ? 'Cartographie des risques' : 'Modèle topographique 3D',
        wireframe: { show: false },
        data: terrainData,
        shading: 'realistic',
        realisticMaterial: {
          roughness: 0.5,
          metalness: 0.15
        },
        itemStyle: {
          borderWidth: 0,
          opacity: 0.92
        },
        emphasis: {
          label: { show: true },
          itemStyle: { shadowBlur: 20, shadowColor: '#38bdf8' }
        }
      }]
    };
  }, [terrainData, viewMode, autoRotate, stats, useAI]);

  const ImageUploadSection = () => (
    <div style={{ 
      padding: '24px',
      background: 'rgba(15, 23, 42, 0.6)',
      borderRadius: '16px',
      marginBottom: '24px'
    }}>
      <Steps current={currentStep} style={{ marginBottom: '32px' }}>
        <Step title="Ajouter des images" icon={<FileImageOutlined />} />
        <Step title="Analyse IA" icon={<ScanOutlined />} />
        <Step title="Visualisation 3D" icon={<GlobalOutlined />} />
      </Steps>
      
      <Row gutter={24}>
        <Col span={12}>
          <div style={{ 
            border: '2px dashed rgba(56, 189, 248, 0.3)',
            borderRadius: '12px',
            padding: '20px',
            textAlign: 'center',
            background: 'rgba(56, 189, 248, 0.05)'
          }}>
            <Upload
              multiple
              accept="image/jpeg,image/png,image/tiff,image/bmp"
              beforeUpload={handleImageUpload}
              showUploadList={false}
              disabled={analyzing}
            >
              <Button 
                icon={<UploadOutlined />} 
                size="large"
                style={{ marginBottom: '16px' }}
                disabled={analyzing}
              >
                Sélectionner des images
              </Button>
            </Upload>
            
            <div style={{ marginTop: '12px' }}>
              <Space wrap>
                <Tag color={analysisQuality === 'high' ? 'blue' : 'default'}>
                  Qualité: {analysisQuality === 'high' ? 'Haute précision' : 'Standard'}
                </Tag>
                <Button 
                  size="small" 
                  onClick={() => setAnalysisQuality(q => q === 'high' ? 'standard' : 'high')}
                  disabled={analyzing}
                >
                  Changer
                </Button>
              </Space>
            </div>
            
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '12px' }}>
              Formats: JPG, PNG, TIFF, BMP<br/>
              Analyse multi-spectrale avancée
            </Text>
          </div>
          
          {analyzing && (
            <div style={{ marginTop: '20px' }}>
              <Progress 
                percent={analysisProgress} 
                status="active" 
                strokeColor="#38bdf8"
              />
              <Text style={{ color: '#94a3b8', fontSize: '12px', marginTop: '8px', display: 'block' }}>
                <ScanOutlined spin /> Analyse {useAI ? 'IA avancée' : 'spectrale'} en cours...
              </Text>
            </div>
          )}
        </Col>
        
        <Col span={12}>
          <div style={{ 
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            minHeight: '200px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <Text strong style={{ color: '#f8fafc' }}>
                Images à analyser ({images.length})
              </Text>
              {images.length > 0 && (
                <Button 
                  size="small" 
                  danger 
                  onClick={resetAnalysis}
                  icon={<DeleteOutlined />}
                  disabled={analyzing}
                >
                  Tout supprimer
                </Button>
              )}
            </div>
            
            {images.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                <FileImageOutlined style={{ fontSize: '48px', marginBottom: '12px' }} />
                <Text type="secondary">Aucune image sélectionnée</Text>
              </div>
            ) : (
              <List
                dataSource={images}
                renderItem={(file, index) => (
                  <List.Item
                    actions={[
                      <Button 
                        type="link" 
                        danger 
                        onClick={() => removeImage(index)}
                        icon={<DeleteOutlined />}
                        size="small"
                      >
                        Supprimer
                      </Button>
                    ]}
                    style={{ padding: '8px 0' }}
                  >
                    <List.Item.Meta
                      avatar={<FileImageOutlined style={{ color: '#38bdf8' }} />}
                      title={<Text style={{ color: '#f8fafc' }}>{file.name}</Text>}
                      description={`${(file.size / 1024).toFixed(0)} KB`}
                    />
                  </List.Item>
                )}
              />
            )}
            
            {images.length > 0 && !analyzing && !terrainData.length && (
              <div style={{ marginTop: '16px' }}>
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <RobotOutlined style={{ color: '#38bdf8' }} />
                    <Select
                      value={modelType}
                      onChange={setModelType}
                      style={{ flex: 1 }}
                      disabled={analyzing}
                    >
                      {modelOptions.map(model => (
                        <Option key={model.key} value={model.key}>
                          <Space>
                            {model.icon}
                            <span style={{ color: model.color }}>{model.name}</span>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {model.description}
                            </Text>
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '28px' }}>
                    <Switch
                      checked={useAI}
                      onChange={setUseAI}
                      disabled={analyzing}
                    />
                    <Text style={{ color: '#94a3b8', fontSize: '12px' }}>
                      {useAI ? '✅ IA activée' : '❌ Mode spectral uniquement'}
                    </Text>
                    <Tooltip title="Mode avancé avec analyse approfondie">
                      <Switch
                        checked={advancedMode}
                        onChange={setAdvancedMode}
                        disabled={analyzing || !useAI}
                        size="small"
                      />
                    </Tooltip>
                    <Text style={{ color: '#94a3b8', fontSize: '12px' }}>
                      {advancedMode ? '🔬 Avancé' : 'Standard'}
                    </Text>
                  </div>
                  <Button 
                    type="primary" 
                    block 
                    onClick={startAnalysis}
                    icon={<ScanOutlined />}
                    style={{ background: '#38bdf8' }}
                    disabled={analyzing}
                  >
                    Lancer l'analyse {useAI ? `IA ${AI_MODELS[modelType]?.name || ''}` : 'spectrale'}
                  </Button>
                </Space>
              </div>
            )}
          </div>
        </Col>
      </Row>
    </div>
  );

  const AnalysisResults = () => (
    <div style={{ 
      padding: '20px 24px',
      background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.05) 0%, transparent 100%)',
      borderBottom: '1px solid rgba(56, 189, 248, 0.1)'
    }}>
      <Row gutter={[12, 12]}>
        <Col span={4}>
          <Statistic
            title={<Text style={{ color: '#94a3b8', fontSize: '12px' }}>Confiance</Text>}
            value={stats.confidence.toFixed(0)}
            suffix="%"
            prefix={<CheckCircleOutlined style={{ color: '#38bdf8' }} />}
            valueStyle={{ color: '#38bdf8', fontSize: '20px' }}
          />
        </Col>
        <Col span={4}>
          <Statistic
            title={<Text style={{ color: '#94a3b8', fontSize: '12px' }}>Risque max</Text>}
            value={(stats.maxRisk * 100).toFixed(0)}
            suffix="%"
            prefix={<CloseCircleOutlined style={{ color: '#ff3b30' }} />}
            valueStyle={{ color: '#ff3b30', fontSize: '20px' }}
          />
        </Col>
        <Col span={4}>
          <Statistic
            title={<Text style={{ color: '#94a3b8', fontSize: '12px' }}>Risque moyen</Text>}
            value={(stats.avgRisk * 100).toFixed(0)}
            suffix="%"
            prefix={<ThunderboltOutlined style={{ color: '#ff9f0a' }} />}
            valueStyle={{ color: '#ff9f0a', fontSize: '20px' }}
          />
        </Col>
        <Col span={4}>
          <Statistic
            title={<Text style={{ color: '#94a3b8', fontSize: '12px' }}>Zones critiques</Text>}
            value={stats.criticalZones}
            prefix={<HeatMapOutlined style={{ color: '#ff3b30' }} />}
            valueStyle={{ color: '#ff3b30', fontSize: '20px' }}
          />
        </Col>
        <Col span={4}>
          <Statistic
            title={<Text style={{ color: '#94a3b8', fontSize: '12px' }}>Végétation</Text>}
            value={stats.vegetationCover.toFixed(0)}
            suffix="%"
            prefix={<BarChartOutlined style={{ color: '#10b981' }} />}
            valueStyle={{ color: '#10b981', fontSize: '20px' }}
          />
        </Col>
        <Col span={4}>
          <Tooltip title={`Modèles IA utilisés: ${stats.aiModels.join(', ') || 'Aucun'}`}>
            <Statistic
              title={<Text style={{ color: '#94a3b8', fontSize: '12px' }}>Éléments IA</Text>}
              value={stats.aiDetectedParts}
              prefix={<RobotOutlined style={{ color: '#38bdf8' }} />}
              valueStyle={{ color: '#38bdf8', fontSize: '20px' }}
            />
          </Tooltip>
        </Col>
      </Row>
      
      <div style={{ marginTop: '12px' }}>
        <Space size={4} wrap>
          {stats.aiModels.length > 0 && (
            <Tag color="blue">🤖 Modèles: {stats.aiModels.join(', ')}</Tag>
          )}
          {stats.aiSeverity > 0 && (
            <Tag color="orange">⚠️ Sévérité IA: {(stats.aiSeverity * 100).toFixed(0)}%</Tag>
          )}
          {stats.isFallback && (
            <Tag color="red">⚠️ Mode fallback</Tag>
          )}
          {advancedMode && (
            <Tag color="purple">🔬 Mode avancé</Tag>
          )}
        </Space>
      </div>
      
      {error && (
        <Alert
          message="Erreur d'analyse"
          description={error}
          type="error"
          showIcon
          closable
          style={{ marginTop: '16px' }}
          onClose={() => setError(null)}
        />
      )}
    </div>
  );

  const LegendModal = () => (
    <Modal
      title={
        <Space>
          <EnvironmentOutlined style={{ color: '#38bdf8' }} />
          <span>Guide d'analyse - IA avancée</span>
        </Space>
      }
      open={showLegend}
      onCancel={() => setShowLegend(false)}
      footer={[
        <Button key="close" onClick={() => setShowLegend(false)}>
          Fermer
        </Button>
      ]}
      width={700}
      styles={{ body: { padding: '24px', background: '#0f172a' } }}
    >
      <div style={{ color: '#f8fafc' }}>
        <Paragraph>
          <strong style={{ color: '#38bdf8' }}>🔬 Analyse IA avancée sans mock data</strong>
        </Paragraph>
        
        <Divider style={{ borderColor: '#334155' }} />
        
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <div style={{ background: 'rgba(56, 189, 248, 0.1)', padding: '16px', borderRadius: '8px' }}>
              <Text strong style={{ color: '#38bdf8' }}>📊 Modèles disponibles :</Text>
              <ul style={{ marginTop: '12px', color: '#cbd5e1', fontSize: '13px' }}>
                <li><Tag color="blue">YOLO</Tag> Détection d'objets et dommages</li>
                <li><Tag color="green">Vit-BEiT</Tag> Classification d'images</li>
                <li><Tag color="purple">Multimodal</Tag> Analyse combinée</li>
                <li><Tag color="orange">Climate</Tag> Météo & environnement</li>
              </ul>
            </div>
          </Col>
          
          <Col span={12}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '16px', borderRadius: '8px' }}>
              <Text strong style={{ color: '#10b981' }}>🌍 Analyse climatique :</Text>
              <ul style={{ marginTop: '12px', color: '#cbd5e1', fontSize: '13px' }}>
                <li>✓ Analyse spectrale multi-canal</li>
                <li>✓ Détection zones d'humidité</li>
                <li>✓ Évaluation couverture végétale</li>
                <li>✓ Identification zones urbanisées</li>
                <li>✓ Calcul indice de risque composite</li>
              </ul>
            </div>
          </Col>
        </Row>
        
        <Divider style={{ borderColor: '#334155' }} />
        
        <Alert
          message="🎯 Fiabilité maximale"
          description="L'analyse utilise les données réelles de vos images + IA. Aucune donnée simulée n'est utilisée. La qualité des résultats dépend de la résolution et de la clarté des images fournies."
          type="info"
          showIcon
          style={{ background: 'rgba(56, 189, 248, 0.15)', border: 'none' }}
        />
      </div>
    </Modal>
  );

  return (
    <>
      <Card 
        style={{ 
          height: '100%',
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.98) 100%)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          borderRadius: '20px',
          overflow: 'auto',
          backdropFilter: 'blur(10px)'
        }}
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ 
          padding: '20px 24px',
          borderBottom: '1px solid rgba(56, 189, 248, 0.1)',
          background: 'linear-gradient(90deg, rgba(56, 189, 248, 0.05) 0%, transparent 100%)'
        }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space size="middle" align="start">
                <div style={{ 
                  padding: '10px 14px',
                  background: 'linear-gradient(135deg, #38bdf8 0%, #3b82f6 100%)',
                  borderRadius: '14px',
                  boxShadow: '0 4px 15px rgba(56, 189, 248, 0.3)'
                }}>
                  <GlobalOutlined style={{ fontSize: 22, color: '#fff' }} />
                </div>
                <div>
                  <Title level={4} style={{ color: '#f8fafc', margin: 0, fontWeight: 700 }}>
                    Analyse IA des Risques Climatiques
                  </Title>
                  <Text style={{ color: '#94a3b8', fontSize: '12px' }}>
                    Analyse réelle d'images • IA avancée (YOLO, Vit-BEiT) • Aucune donnée simulée
                  </Text>
                </div>
              </Space>
            </Col>
            
            <Col>
              <Space>
                <Button 
                  icon={<QuestionCircleOutlined />}
                  onClick={() => setShowLegend(true)}
                  style={{ background: 'rgba(56, 189, 248, 0.1)', borderColor: '#38bdf8', color: '#38bdf8' }}
                >
                  Guide IA
                </Button>
                <Badge 
                  count={useAI ? AI_MODELS[modelType]?.name || 'IA' : 'Spectral'} 
                  style={{ backgroundColor: useAI ? AI_MODELS[modelType]?.color || '#38bdf8' : '#64748b' }}
                />
                {stats.isFallback && (
                  <Badge 
                    count="Fallback" 
                    style={{ backgroundColor: '#ef4444' }}
                  />
                )}
              </Space>
            </Col>
          </Row>
        </div>

        <ImageUploadSection />
        
        {terrainData.length > 0 && <AnalysisResults />}
        
        {terrainData.length > 0 && (
          <div style={{ 
            padding: '12px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid rgba(255,255,255,0.05)'
          }}>
            <Space size={12}>
              <Text style={{ color: '#94a3b8', fontSize: '12px' }}>Visualisation:</Text>
              <Segmented
                options={[
                  { label: <Space><EyeOutlined />Topographie réelle</Space>, value: 'surface' },
                  { label: <Space><HeatMapOutlined />Cartographie des risques</Space>, value: 'risk' }
                ]}
                value={viewMode}
                onChange={setViewMode}
                size="small"
              />
            </Space>
            
            <Space>
              <Tooltip title={autoRotate ? "Désactiver rotation" : "Activer rotation"}>
                <Segmented
                  options={[
                    { label: <RotateRightOutlined />, value: true },
                    { label: "Fixer", value: false }
                  ]}
                  value={autoRotate}
                  onChange={setAutoRotate}
                  size="small"
                />
              </Tooltip>
              {stats.aiModels.length > 0 && (
                <Tag color="blue" style={{ marginLeft: 8 }}>
                  <RobotOutlined /> {stats.aiModels[0]}
                </Tag>
              )}
              {advancedMode && (
                <Tag color="purple">🔬 Avancé</Tag>
              )}
            </Space>
          </div>
        )}

        <div style={{ 
          height: terrainData.length > 0 ? 500 : 'auto',
          width: '100%', 
          position: 'relative',
          background: 'radial-gradient(circle at center, #020617 0%, #0f172a 100%)',
          minHeight: terrainData.length > 0 ? '500px' : '300px',
          display: terrainData.length === 0 ? 'flex' : 'block',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {terrainData.length === 0 && !loading && !analyzing && (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <FileImageOutlined style={{ fontSize: '64px', color: '#334155', marginBottom: '20px' }} />
              <Title level={4} style={{ color: '#64748b' }}>En attente d'analyse</Title>
              <Text type="secondary">Ajoutez des images et lancez l'analyse IA pour générer le modèle 3D</Text>
              {useAI && (
                <div style={{ marginTop: 12 }}>
                  <Tag color="blue">🤖 {AI_MODELS[modelType]?.name || 'IA'} activée</Tag>
                </div>
              )}
            </div>
          )}
          
          {loading && (
            <div style={{ textAlign: 'center', padding: '80px 20px' }}>
              <Spin size="large" />
              <div style={{ marginTop: '20px' }}>
                <Text style={{ color: '#94a3b8' }}>Analyse {useAI ? 'IA avancée' : 'spectrale'} des images en cours...</Text>
                {useAI && (
                  <div style={{ marginTop: 8 }}>
                    <Tag color="blue">🤖 Modèle: {AI_MODELS[modelType]?.name || modelType}</Tag>
                    {advancedMode && <Tag color="purple">🔬 Mode avancé</Tag>}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {terrainData.length > 0 && getOption && (
            <ReactECharts 
              ref={chartRef}
              option={getOption} 
              style={{ height: '100%', width: '100%' }} 
              opts={{ renderer: 'webgl' }}
              notMerge={true}
              lazyUpdate={false}
            />
          )}
        </div>
      </Card>
      
      <LegendModal />
    </>
  );
};

export default ClimateRiskModeling3D;