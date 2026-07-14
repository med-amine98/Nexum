// src/modules/claims/ClaimDeclaration.js - Version complète corrigée
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Card, Row, Col, Button, Steps, Form, Input, Upload, 
  message, Typography, Progress, Alert, Image, List,
  Tag, Space, Divider, Result, Spin, Select, DatePicker,
  Modal, Timeline, Descriptions, Badge, Statistic, Tooltip,
  Collapse, Skeleton, Rate, Switch, Slider, Radio, Tabs, Table,
  Drawer, Empty, Avatar, Checkbox
} from 'antd';
import { 
  CameraOutlined, UploadOutlined, FileTextOutlined,
  CheckCircleOutlined, LoadingOutlined, EyeOutlined,
  DeleteOutlined, PlusOutlined, RobotOutlined,
  ThunderboltOutlined, SafetyOutlined, ClockCircleOutlined,
  EuroOutlined, EnvironmentOutlined, UserOutlined,
  PhoneOutlined, MailOutlined, SendOutlined,
  VideoCameraOutlined, ScanOutlined, CloudUploadOutlined,
  FilePdfOutlined, PrinterOutlined, WhatsAppOutlined,
  ShareAltOutlined, HistoryOutlined, ExperimentOutlined, DownloadOutlined,
  MessageOutlined, DiscordOutlined, ReloadOutlined, BellOutlined, WarningOutlined, CarOutlined,
  CloseOutlined, PlayCircleOutlined, BarChartOutlined, InfoCircleOutlined, CheckOutlined,
  HomeOutlined, HeartOutlined, ToolOutlined, SignatureOutlined, FieldTimeOutlined,
  MenuOutlined, SettingOutlined, CloudOutlined,
  SecurityScanOutlined,
  GlobalOutlined,
  ShopOutlined,
  BugOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../services/api';
import dayjs from 'dayjs';
import './ClaimDeclaration.css';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { TextArea } = Input;
const { Option } = Select;
const { Panel } = Collapse;
// ============================================
// CONFIGURATION
// ============================================

const COLORS = {
  primary: '#667eea',
  secondary: '#764ba2',
  success: '#52c41a',
  warning: '#faad14',
  danger: '#ff4d4f',
  info: '#1890ff',
  gold: '#f3c300',
  purple: '#722ed1',
  cyan: '#13c2c2',
  pink: '#eb2f96',
  darkBg: '#0a0a0f',
  darkCard: '#14141e',
  darkBorder: '#2a2a3a',
  discord: '#5865F2'
};

const GRADIENTS = {
  primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  dark: 'linear-gradient(135deg, #0a0a0f 0%, #14141e 50%, #1a1a2e 100%)',
  discord: 'linear-gradient(135deg, #5865F2 0%, #4752C4 100%)'
};

// Configuration des types de sinistres avec endpoints CORRECTS (/upload)
const CLAIM_TYPES = {
  accident: {
    id: 'accident',
    name: 'Accident automobile',
    icon: <CarOutlined />,
    color: '#ff4d4f',
    bgColor: 'rgba(255, 77, 79, 0.1)',
    endpoint: '/claims/analyze-photo-public/upload',
    description: 'Analyse des dégâts sur le véhicule',
    requiredPhotos: 4,
    maxPhotos: 12,
    questions: [
      'Où et quand l\'accident a-t-il eu lieu ?',
      'Y a-t-il d\'autres véhicules impliqués ?',
      'Y a-t-il des blessés ?',
      'Un constat amiable a-t-il été rempli ?'
    ],
    steps: [
      "📸 Chargement de l'image du véhicule...",
      "🔍 Détection des pièces endommagées...",
      "📊 Analyse de la gravité des dégâts...",
      "💰 Calcul de l'estimation des réparations...",
      "⚠️ Détection des fraudes..."
    ]
  },
  habitation: {
    id: 'habitation',
    name: 'Sinistre habitation',
    icon: <HomeOutlined />,
    color: '#1890ff',
    bgColor: 'rgba(24, 144, 255, 0.1)',
    endpoint: '/claims/analyze-photo-public/upload',
    description: 'Analyse des dégâts sur l\'habitation',
    requiredPhotos: 5,
    maxPhotos: 15,
    questions: [
      'Quelle est la nature du sinistre ?',
      'Quand l\'incident s\'est-il produit ?',
      'Des personnes sont-elles blessées ?'
    ],
    steps: [
      "📸 Chargement de l'image du bâtiment...",
      "🔍 Détection des zones endommagées...",
      "📊 Analyse de l'étendue des dégâts...",
      "💰 Calcul de l'estimation des réparations..."
    ]
  },
  sante: {
    id: 'sante',
    name: 'Santé',
    icon: <HeartOutlined />,
    color: '#52c41a',
    bgColor: 'rgba(82, 196, 26, 0.1)',
    endpoint: '/claims/analyze-photo-public/upload',
    description: 'Analyse des documents médicaux',
    requiredPhotos: 2,
    maxPhotos: 10,
    questions: [
      'Type de soin ?',
      'Date des soins ?',
      'Médecin traitant ?'
    ],
    steps: [
      "📸 Chargement du document médical...",
      "🔍 Extraction des informations...",
      "📊 Vérification de la cohérence...",
      "💰 Calcul du remboursement estimé..."
    ]
  },
  agricole: {
    id: 'agricole',
    name: 'Sinistre agricole',
    icon: <ToolOutlined />,
    color: '#52c41a',
    bgColor: 'rgba(82, 196, 26, 0.1)',
    endpoint: '/claims/analyze-photo-public/upload',
    description: 'Analyse des maladies animales, végétales',
    requiredPhotos: 5,
    maxPhotos: 15,
    questions: [
      'Quel type de culture/élevage ?',
      'Quand les symptômes sont-ils apparus ?'
    ],
    steps: [
      "🌾 Chargement de l'image...",
      "🔍 Détection des anomalies...",
      "🦠 Analyse des symptômes...",
      "💰 Calcul de l'estimation..."
    ]
  },
  catastrophe_naturelle: {
    id: 'catastrophe_naturelle',
    name: 'Catastrophe naturelle',
    icon: <CloudOutlined />,
    color: '#13c2c2',
    bgColor: 'rgba(19, 194, 194, 0.1)',
    endpoint: '/claims/analyze-photo-public/upload',
    description: 'Analyse des dégâts causés par : inondation, tempête, séisme, incendie de forêt',
    requiredPhotos: 6,
    maxPhotos: 20,
    questions: [
      'Quel type de catastrophe ?',
      'Quand s\'est-elle produite ?',
      'Quelle est l\'étendue des dégâts ?'
    ],
    steps: [
      "📸 Chargement de l'image...",
      "🔍 Détection des dégâts...",
      "🌊 Analyse de l'impact...",
      "💰 Calcul de l'estimation..."
    ]
  },
  cyber: {
    id: 'cyber',
    name: 'Cyber / Piratage',
    icon: <SecurityScanOutlined />,
    color: '#fa8c16',
    bgColor: 'rgba(250, 140, 22, 0.1)',
    endpoint: '/claims/analyze-photo-public/upload',
    description: 'Analyse des dommages liés aux cyberattaques',
    requiredPhotos: 3,
    maxPhotos: 10,
    questions: [
      'Type d\'attaque ?',
      'Quand a-t-elle eu lieu ?',
      'Quelles sont les données compromises ?'
    ],
    steps: [
      "📸 Chargement de l'image...",
      "🔍 Analyse des dommages...",
      "🛡️ Évaluation de la sécurité...",
      "💰 Calcul de l'estimation..."
    ]
  },
  transport: {
    id: 'transport',
    name: 'Transport / Logistique',
    icon: <ToolOutlined />,
    color: '#2f54eb',
    bgColor: 'rgba(47, 84, 235, 0.1)',
    endpoint: '/claims/analyze-photo-public/upload',
    description: 'Analyse des colis endommagés, volés ou perdus',
    requiredPhotos: 3,
    maxPhotos: 10,
    questions: [
      'Type de colis ?',
      'Quand a-t-il été endommagé ?',
      'Quelle est la valeur du colis ?'
    ],
    steps: [
      "📸 Chargement de l'image du colis...",
      "🔍 Détection des dommages...",
      "📊 Analyse de la valeur...",
      "💰 Calcul de l'indemnisation..."
    ]
  },
  electronique: {
    id: 'electronique',
    name: 'Électronique / Casse',
    icon: <ThunderboltOutlined />,
    color: '#eb2f96',
    bgColor: 'rgba(235, 47, 150, 0.1)',
    endpoint: '/claims/analyze-photo-public/upload',
    description: 'Analyse des appareils électroniques endommagés',
    requiredPhotos: 3,
    maxPhotos: 10,
    questions: [
      'Type d\'appareil ?',
      'Quand a-t-il été endommagé ?',
      'Quelle est la valeur de l\'appareil ?'
    ],
    steps: [
      "📸 Chargement de l'image de l'appareil...",
      "🔍 Détection des dommages...",
      "📊 Analyse de la valeur...",
      "💰 Calcul de l'estimation..."
    ]
  },
  voyage: {
    id: 'voyage',
    name: 'Voyage / Annulation',
    icon: <GlobalOutlined />,
    color: '#13c2c2',
    bgColor: 'rgba(19, 194, 194, 0.1)',
    endpoint: '/claims/analyze-photo-public/upload',
    description: 'Analyse des annulations, retards, bagages perdus',
    requiredPhotos: 2,
    maxPhotos: 8,
    questions: [
      'Type de voyage ?',
      'Quand a-t-il été annulé ?',
      'Quel est le montant du voyage ?'
    ],
    steps: [
      "📸 Chargement du document...",
      "🔍 Analyse des informations...",
      "📊 Vérification de la validité...",
      "💰 Calcul du remboursement..."
    ]
  },
  entreprise: {
    id: 'entreprise',
    name: 'Sinistre professionnel',
    icon: <ShopOutlined />,
    color: '#faad14',
    bgColor: 'rgba(250, 173, 20, 0.1)',
    endpoint: '/claims/analyze-photo-public/upload',
    description: 'Analyse des sinistres en entreprise',
    requiredPhotos: 5,
    maxPhotos: 15,
    questions: [
      'Nature du sinistre ?',
      'Quand s\'est-il produit ?',
      'Quel est l\'impact sur l\'activité ?'
    ],
    steps: [
      "📸 Chargement de l'image...",
      "🔍 Détection des dommages...",
      "📊 Analyse de l'impact...",
      "💰 Calcul de l'indemnisation..."
    ]
  },
  animal: {
    id: 'animal',
    name: 'Animal de compagnie',
    icon: <BugOutlined />,
    color: '#52c41a',
    bgColor: 'rgba(82, 196, 26, 0.1)',
    endpoint: '/claims/analyze-photo-public/upload',
    description: 'Analyse des frais vétérinaires et accidents d\'animaux',
    requiredPhotos: 2,
    maxPhotos: 8,
    questions: [
      'Type d\'animal ?',
      'Quand l\'accident s\'est-il produit ?',
      'Quel est le montant des frais ?'
    ],
    steps: [
      "📸 Chargement de l'image...",
      "🔍 Analyse des frais...",
      "📊 Vérification de la validité...",
      "💰 Calcul du remboursement..."
    ]
  }
};

// ============================================
// STYLES CSS PERSONNALISÉS
// ============================================

const globalStyles = `
  .claim-declaration {
    background: #0a0a0f;
    min-height: 100vh;
    padding: 24px;
  }
  
  .claim-declaration .ant-card {
    background: #14141e !important;
    border: 1px solid #2a2a3a !important;
    border-radius: 20px !important;
  }
  
  .claim-declaration .ant-card-head {
    border-bottom: 1px solid #2a2a3a !important;
  }
  
  .claim-declaration .ant-card-head-title {
    color: #f1f5f9 !important;
  }
  
  .claim-declaration .ant-steps-item-title {
    color: #f1f5f9 !important;
  }
  
  .claim-declaration .ant-steps-item-description {
    color: #8c8c8c !important;
  }
  
  .claim-declaration .ant-steps-item-wait .ant-steps-item-icon {
    background: #2a2a3a !important;
    border-color: #2a2a3a !important;
  }
  
  .claim-declaration .ant-steps-item-wait .ant-steps-item-icon .ant-steps-icon {
    color: #8c8c8c !important;
  }
  
  .claim-declaration .ant-form-item-label > label {
    color: #8c8c8c !important;
  }
  
  .claim-declaration .ant-input,
  .claim-declaration .ant-input-number,
  .claim-declaration .ant-select-selector,
  .claim-declaration .ant-picker {
    background: #0a0a0f !important;
    border-color: #2a2a3a !important;
    color: #f1f5f9 !important;
  }
  
  .claim-declaration .ant-input::placeholder,
  .claim-declaration .ant-select-selection-placeholder {
    color: #555 !important;
  }
  
  .claim-declaration .ant-input-textarea-show-count::after {
    color: #555 !important;
  }
  
  .claim-declaration .ant-upload-drag {
    background: #0a0a0f !important;
    border-color: #2a2a3a !important;
    border-radius: 16px !important;
  }
  
  .claim-declaration .ant-upload-drag:hover {
    border-color: #667eea !important;
  }
  
  .claim-declaration .ant-upload-text {
    color: #f1f5f9 !important;
  }
  
  .claim-declaration .ant-upload-hint {
    color: #8c8c8c !important;
  }
  
  .claim-declaration .ant-tabs-tab {
    color: #8c8c8c !important;
  }
  
  .claim-declaration .ant-tabs-tab-active .ant-tabs-tab-btn {
    color: #f1f5f9 !important;
  }
  
  .claim-declaration .ant-tabs-ink-bar {
    background: #667eea !important;
  }
  
  .claim-declaration .ant-tabs-tab:hover {
    color: #f1f5f9 !important;
  }
  
  .claim-declaration .ant-timeline-item-content {
    color: #f1f5f9 !important;
  }
  
  .claim-declaration .ant-typography {
    color: #f1f5f9 !important;
  }
  
  .claim-declaration .ant-typography-secondary {
    color: #8c8c8c !important;
  }
  
  .claim-declaration .ant-table {
    background: transparent !important;
  }
  
  .claim-declaration .ant-table-thead > tr > th {
    background: #0a0a0f !important;
    color: #8c8c8c !important;
    border-bottom: 1px solid #2a2a3a !important;
  }
  
  .claim-declaration .ant-table-tbody > tr > td {
    background: #14141e !important;
    color: #f1f5f9 !important;
    border-color: #2a2a3a !important;
  }
  
  .claim-declaration .ant-table-tbody > tr:hover > td {
    background: #1a1a2e !important;
  }
  
  .claim-declaration .ant-modal-content {
    background: #14141e !important;
  }
  
  .claim-declaration .ant-modal-header {
    background: #14141e !important;
    border-bottom: 1px solid #2a2a3a !important;
  }
  
  .claim-declaration .ant-modal-title {
    color: #f1f5f9 !important;
  }
  
  .claim-declaration .ant-modal-close {
    color: #8c8c8c !important;
  }
  
  .claim-declaration .ant-modal-close:hover {
    color: #f1f5f9 !important;
  }
  
  .claim-declaration .ant-drawer-content {
    background: #14141e !important;
  }
  
  .claim-declaration .ant-drawer-header {
    background: #14141e !important;
    border-bottom: 1px solid #2a2a3a !important;
  }
  
  .claim-declaration .ant-drawer-title {
    color: #f1f5f9 !important;
  }
  
  .claim-declaration .ant-drawer-close {
    color: #8c8c8c !important;
  }
  
  .claim-declaration .ant-drawer-close:hover {
    color: #f1f5f9 !important;
  }
  
  .claim-declaration .ant-descriptions-item-label {
    color: #8c8c8c !important;
    background: #0a0a0f !important;
    border-color: #2a2a3a !important;
  }
  
  .claim-declaration .ant-descriptions-item-content {
    color: #f1f5f9 !important;
    background: #14141e !important;
    border-color: #2a2a3a !important;
  }
  
  .claim-declaration .ant-progress-text {
    color: #8c8c8c !important;
  }
  
  .claim-declaration .ant-statistic-title {
    color: #8c8c8c !important;
  }
  
  .claim-declaration .ant-statistic-content {
    color: #f1f5f9 !important;
  }
  
  .claim-declaration .ant-tag {
    color: #f1f5f9 !important;
  }
  
  .claim-declaration .ant-badge-status-text {
    color: #8c8c8c !important;
  }
  
  .claim-declaration .ant-result-title {
    color: #f1f5f9 !important;
  }
  
  .claim-declaration .ant-result-subtitle {
    color: #8c8c8c !important;
  }
  
  .claim-declaration .ant-alert {
    background: rgba(20, 20, 30, 0.8) !important;
    border-color: #2a2a3a !important;
  }
  
  .claim-declaration .ant-alert-description {
    color: #8c8c8c !important;
  }
  
  .claim-declaration .ant-select-dropdown {
    background: #14141e !important;
  }
  
  .claim-declaration .ant-select-item {
    color: #f1f5f9 !important;
  }
  
  .claim-declaration .ant-select-item-option-active {
    background: #1a1a2e !important;
  }
  
  .claim-declaration .ant-picker-panel {
    background: #14141e !important;
  }
  
  .claim-declaration .ant-picker-header {
    color: #f1f5f9 !important;
    border-bottom: 1px solid #2a2a3a !important;
  }
  
  .claim-declaration .ant-picker-cell {
    color: #8c8c8c !important;
  }
  
  .claim-declaration .ant-picker-cell-in-view {
    color: #f1f5f9 !important;
  }
  
  .claim-declaration .ant-picker-cell-selected .ant-picker-cell-inner {
    background: #667eea !important;
  }
  
  .claim-declaration .ant-picker-cell-today .ant-picker-cell-inner::before {
    border-color: #667eea !important;
  }
  
  .constat-container {
    background: #0a0a0f !important;
    color: #f1f5f9 !important;
    padding: 20px;
    border-radius: 16px;
  }
  
  .constat-header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 30px;
    border-radius: 12px;
    text-align: center;
    margin-bottom: 24px;
  }
  
  .constat-header h2 {
    color: white !important;
    margin: 0;
  }
  
  .constat-card {
    background: #14141e !important;
    border: 1px solid #2a2a3a !important;
    border-radius: 12px !important;
    margin-bottom: 16px;
  }
  
  .constat-card .ant-card-head {
    border-bottom: 1px solid #2a2a3a !important;
  }
  
  .constat-card .ant-card-head-title {
    color: #f1f5f9 !important;
  }
  
  .section-subtitle {
    color: #667eea !important;
    font-weight: 600;
    margin: 12px 0 8px 0;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .info-item {
    padding: 6px 0;
    border-bottom: 1px solid rgba(42, 42, 58, 0.5);
    color: #f1f5f9;
  }
  
  .info-item strong {
    color: #8c8c8c;
  }
  
  .damage-box {
    background: #0a0a0f !important;
    padding: 12px 16px;
    border-radius: 8px;
    margin-top: 12px;
    border-left: 3px solid #667eea;
  }
  
  .circumstance-item {
    display: flex;
    align-items: center;
    padding: 4px 0;
    color: #f1f5f9;
  }
  
  .circumstance-item .ant-checkbox-disabled .ant-checkbox-inner {
    background-color: #2a2a3a !important;
    border-color: #2a2a3a !important;
  }
  
  .signature-box {
    background: #0a0a0f !important;
    padding: 20px;
    border-radius: 12px;
    border: 2px dashed #2a2a3a;
    min-height: 120px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
  
  .signature-line {
    width: 100%;
    max-width: 200px;
    height: 2px;
    background: #2a2a3a;
    margin: 16px 0;
    position: relative;
  }
  
  .signature-line::after {
    content: '✍️';
    position: absolute;
    left: 50%;
    top: -12px;
    transform: translateX(-50%);
    font-size: 20px;
  }
  
  .signature-info {
    margin-top: 8px;
    text-align: center;
  }
  
  .constat-footer {
    text-align: center;
    padding: 16px;
    border-top: 1px solid #2a2a3a;
    margin-top: 24px;
    color: #8c8c8c;
    font-size: 12px;
  }
  
  .constat-badge {
    margin-top: 12px;
  }
  
  .dark-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  
  .dark-scrollbar::-webkit-scrollbar-track {
    background: #0a0a0f;
  }
  
  .dark-scrollbar::-webkit-scrollbar-thumb {
    background: #2a2a3a;
    border-radius: 3px;
  }
  
  .dark-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #3a3a4a;
  }
`;

// Ajouter les styles dynamiquement
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = globalStyles;
  document.head.appendChild(styleSheet);
}

// ============================================
// COMPOSANTS ENFANTS
// ============================================

// Composant de graphique simple
const SimplePieChart = ({ data, colors, title }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  let startAngle = 0;
  
  return (
    <div style={{ textAlign: 'center' }}>
      <svg width="200" height="200" viewBox="0 0 200 200">
        {data.map((item, index) => {
          const angle = (item.value / total) * 360;
          const endAngle = startAngle + angle;
          const startRad = (startAngle * Math.PI) / 180;
          const endRad = (endAngle * Math.PI) / 180;
          const x1 = 100 + 80 * Math.cos(startRad);
          const y1 = 100 + 80 * Math.sin(startRad);
          const x2 = 100 + 80 * Math.cos(endRad);
          const y2 = 100 + 80 * Math.sin(endRad);
          const largeArc = angle > 180 ? 1 : 0;
          
          const path = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;
          startAngle = endAngle;
          
          return <path key={index} d={path} fill={colors[index]} stroke="#14141e" strokeWidth="2" />;
        })}
        <circle cx="100" cy="100" r="40" fill="#14141e" />
        <text x="100" y="105" textAnchor="middle" fontSize="14" fontWeight="bold" fill="#f1f5f9">{total}</text>
      </svg>
      <div style={{ marginTop: 16 }}>
        {data.map((item, index) => (
          <div key={index} style={{ display: 'inline-block', marginRight: 16 }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, background: colors[index], borderRadius: 2, marginRight: 4 }}></span>
            <span style={{ color: '#f1f5f9' }}>{item.type}: {item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Composant pour afficher l'image avec les bounding boxes
const ImageWithBoundingBoxes = ({ imageSrc, boundingBoxes, onBoxClick, claimType }) => {
  const [imgSize, setImgSize] = useState({ width: 1, height: 1 });
  const imgRef = useRef(null);
  
  useEffect(() => {
    if (imgRef.current) {
      const updateSize = () => {
        setImgSize({
          width: imgRef.current.clientWidth,
          height: imgRef.current.clientHeight
        });
      };
      updateSize();
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, [imageSrc]);
  
  if (!imageSrc) return null;
  
  const getBoxColor = (part) => {
    if (claimType === 'accident') {
      if (part?.includes('Pare-chocs')) return '#ff4d4f';
      if (part?.includes('Aile') || part?.includes('Porte')) return '#1890ff';
      if (part?.includes('Capot') || part?.includes('Coffre')) return '#52c41a';
      return '#13c2c2';
    } else if (claimType === 'habitation') {
      if (part?.includes('feu') || part?.includes('brûlure')) return '#ff4d4f';
      if (part?.includes('eau') || part?.includes('humidité')) return '#1890ff';
      if (part?.includes('effraction')) return '#722ed1';
      return '#faad14';
    } else {
      return '#52c41a';
    }
  };
  
  return (
    <div style={{ position: 'relative', display: 'inline-block', width: '100%' }}>
      <img 
        ref={imgRef}
        src={imageSrc} 
        alt="Analyse IA" 
        style={{ width: '100%', borderRadius: 12 }}
        onLoad={() => {
          if (imgRef.current) {
            setImgSize({
              width: imgRef.current.clientWidth,
              height: imgRef.current.clientHeight
            });
          }
        }}
      />
      {boundingBoxes && boundingBoxes.map((box, idx) => {
        if (!box.bbox) return null;
        
        const scaleX = imgSize.width / 640;
        const scaleY = imgSize.height / 480;
        
        const left = box.bbox[0] * scaleX;
        const top = box.bbox[1] * scaleY;
        const width = (box.bbox[2] - box.bbox[0]) * scaleX;
        const height = (box.bbox[3] - box.bbox[1]) * scaleY;
        
        const boxColor = getBoxColor(box.part);
        
        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: `${left}px`,
              top: `${top}px`,
              width: `${width}px`,
              height: `${height}px`,
              border: `3px solid ${boxColor}`,
              borderRadius: 4,
              cursor: 'pointer',
              transition: 'all 0.2s',
              backgroundColor: `${boxColor}20`
            }}
            onClick={() => onBoxClick && onBoxClick(box)}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${boxColor}50`;
              e.currentTarget.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${boxColor}20`;
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <div style={{
              position: 'absolute',
              top: -28,
              left: 0,
              background: boxColor,
              color: 'white',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 11,
              whiteSpace: 'nowrap',
              fontWeight: 'bold',
              zIndex: 10
            }}>
              {box.part} ({Math.round(box.confidence * 100)}%)
            </div>
            <div style={{
              position: 'absolute',
              bottom: -25,
              left: 0,
              background: boxColor,
              color: 'white',
              padding: '2px 8px',
              borderRadius: 4,
              fontSize: 10,
              whiteSpace: 'nowrap'
            }}>
              ~{box.estimated_cost || 200}€
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Composant Dashboard de statistiques
const StatisticsDashboard = ({ photos, claims, claimType }) => {
  const config = CLAIM_TYPES[claimType] || CLAIM_TYPES.accident;
  
  const severityData = [
    { type: 'Mineur', value: photos.filter(p => p.damage_severity < 30).length, color: '#52c41a' },
    { type: 'Modéré', value: photos.filter(p => p.damage_severity >= 30 && p.damage_severity < 60).length, color: '#faad14' },
    { type: 'Sévère', value: photos.filter(p => p.damage_severity >= 60 && p.damage_severity < 80).length, color: '#fa8c16' },
    { type: 'Critique', value: photos.filter(p => p.damage_severity >= 80).length, color: '#ff4d4f' }
  ];
  
  const fraudData = [
    { type: 'Normal', value: photos.filter(p => p.fraud_score < 30).length, color: '#52c41a' },
    { type: 'Suspect', value: photos.filter(p => p.fraud_score >= 30 && p.fraud_score < 70).length, color: '#faad14' },
    { type: 'Fraude', value: photos.filter(p => p.fraud_score >= 70).length, color: '#ff4d4f' }
  ];
  
  if (photos.length === 0) {
    return <Empty description="Aucune donnée à analyser" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }
  
  return (
    <div style={{ background: '#14141e', borderRadius: 16, padding: 16 }}>
      <Title level={4} style={{ color: '#f1f5f9' }}>📊 Dashboard - {config.name}</Title>
      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card size="small" style={{ background: '#0a0a0f', border: '1px solid #2a2a3a' }}>
            <Statistic title="Total documents analysés" value={photos.length} prefix={<CameraOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ background: '#0a0a0f', border: '1px solid #2a2a3a' }}>
            <Statistic 
              title="Estimation moyenne" 
              value={Math.round(photos.reduce((s, p) => s + (p.estimated_cost || 0), 0) / photos.length)} 
              prefix="€" 
              suffix="/doc"
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card size="small" style={{ background: '#0a0a0f', border: '1px solid #2a2a3a' }}>
            <Statistic 
              title="Score fraude moyen" 
              value={Math.round(photos.reduce((s, p) => s + (p.fraud_score || 0), 0) / photos.length)} 
              suffix="%" 
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>
      
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="Répartition par gravité" size="small" style={{ background: '#0a0a0f', border: '1px solid #2a2a3a' }}>
            <SimplePieChart data={severityData.filter(d => d.value > 0)} colors={severityData.map(d => d.color)} />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Analyse des fraudes" size="small" style={{ background: '#0a0a0f', border: '1px solid #2a2a3a' }}>
            <SimplePieChart data={fraudData.filter(d => d.value > 0)} colors={fraudData.map(d => d.color)} />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

// Composant ConstatModal
const ConstatModal = ({ visible, report, onClose, onGeneratePDF }) => {
  if (!report) return null;
  
  const constatData = report.constat_data || {};
  
  const getRiskColor = (score) => {
    if (score > 70) return '#ff4d4f';
    if (score > 40) return '#faad14';
    return '#52c41a';
  };

  const circumstancesOptions = [
    "En stationnement",
    "Quittait un stationnement",
    "Prenait un stationnement",
    "Sortait d'un parking / lieu privé",
    "S'engageait dans un parking / lieu privé",
    "Arrêt de circulation",
    "Frottement sans changement de file",
    "Heurtait à l'arrière",
    "Roulait dans le même sens et même file",
    "Changeait de file",
    "Doublait",
    "Virait à droite",
    "Virait à gauche",
    "Reculait",
    "Empiétait sur la chaussée réservée",
    "Venait de droite",
    "N'avait pas respecté un signal de priorité"
  ];

  const selectedCircumstances = constatData.circumstances || [];
  const signatureA = constatData.signature_a || {};
  const signatureB = constatData.signature_b || {};
  
  return (
    <Modal
      title={
        <Space>
          <FileTextOutlined style={{ color: '#1890ff' }} />
          <span style={{ color: '#f1f5f9' }}>📄 CONSTAT AMIABLE D'ACCIDENT - {report.claim_number}</span>
          <Tag color={report.fraud_score > 70 ? 'red' : report.fraud_score > 40 ? 'orange' : 'green'}>
            Score fraude: {report.fraud_score}%
          </Tag>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="close" onClick={onClose}>Fermer</Button>,
        <Button key="pdf" type="primary" icon={<FilePdfOutlined />} onClick={() => onGeneratePDF && onGeneratePDF(report)}>
          Télécharger PDF
        </Button>,
        <Button key="print" icon={<PrinterOutlined />} onClick={() => window.print()}>Imprimer</Button>
      ]}
    >
      <div className="constat-container">
        <div className="constat-header">
          <Title level={2} style={{ color: 'white', margin: 0 }}>CONSTAT AMIABLE D'ACCIDENT</Title>
          <Text style={{ color: 'white', opacity: 0.9 }}>Formulaire européen de constat amiable d'accident automobile</Text>
          <div className="constat-badge">
            <Badge status="processing" text={<span style={{ color: 'white' }}>Document officiel - À conserver</span>} />
          </div>
        </div>

        <Card title="📋 1. INFORMATIONS GÉNÉRALES" size="small" className="constat-card">
          <Row gutter={16}>
            <Col span={12}>
              <div className="info-item"><strong>Date de l'accident:</strong> {constatData.accident_date || 'Non renseigné'} à {constatData.accident_time || 'Non renseigné'}</div>
              <div className="info-item"><strong>Lieu:</strong> {constatData.address || 'Non renseigné'}, {constatData.zipcode || ''} {constatData.city || ''}</div>
              <div className="info-item"><strong>Blessés:</strong> <Tag color={constatData.injuries === 'Oui' ? 'red' : 'green'}>{constatData.injuries || 'Non renseigné'}</Tag></div>
              <div className="info-item"><strong>Dégâts matériels autres:</strong> {constatData.other_damages || 'Non renseigné'}</div>
            </Col>
            <Col span={12}>
              <div className="info-item"><strong>Témoins:</strong> {constatData.witness_name || 'Aucun témoin'}</div>
              {constatData.witness_name && (
                <>
                  <div className="info-item"><strong>Adresse témoin:</strong> {constatData.witness_address || 'Non renseigné'}</div>
                  <div className="info-item"><strong>Téléphone témoin:</strong> {constatData.witness_phone || 'Non renseigné'}</div>
                </>
              )}
            </Col>
          </Row>
        </Card>

        <Card title="🚗 2. VÉHICULE A (Votre véhicule)" size="small" className="constat-card">
          <Row gutter={16}>
            <Col span={12}>
              <div className="section-subtitle">🔹 Société d'assurance</div>
              <div className="info-item"><strong>Assurance:</strong> {constatData.vehicle_a_insurance_company || 'Non renseigné'}</div>
              <div className="info-item"><strong>Police:</strong> {constatData.vehicle_a_policy_number || 'Non renseigné'}</div>
              <div className="info-item"><strong>Agence:</strong> {constatData.vehicle_a_agency || 'Non renseigné'}</div>
              <div className="info-item"><strong>Attestation valable jusqu'au:</strong> {constatData.vehicle_a_certificate_valid_until || 'Non renseigné'}</div>
              
              <div className="section-subtitle">🔹 Conducteur</div>
              <div className="info-item"><strong>Nom:</strong> {constatData.vehicle_a_driver_lastname || 'Non renseigné'} {constatData.vehicle_a_driver_firstname || ''}</div>
              <div className="info-item"><strong>Adresse:</strong> {constatData.vehicle_a_driver_address || 'Non renseigné'}</div>
              <div className="info-item"><strong>Permis n°:</strong> {constatData.vehicle_a_driver_license_number || 'Non renseigné'}</div>
              <div className="info-item"><strong>Délivré le:</strong> {constatData.vehicle_a_driver_license_date || 'Non renseigné'}</div>
            </Col>
            <Col span={12}>
              <div className="section-subtitle">🔹 Assuré</div>
              <div className="info-item"><strong>Nom:</strong> {constatData.vehicle_a_insured_lastname || 'Non renseigné'} {constatData.vehicle_a_insured_firstname || ''}</div>
              <div className="info-item"><strong>Adresse:</strong> {constatData.vehicle_a_insured_address || 'Non renseigné'}</div>
              <div className="info-item"><strong>Téléphone:</strong> {constatData.vehicle_a_insured_phone || 'Non renseigné'}</div>
              
              <div className="section-subtitle">🔹 Véhicule</div>
              <div className="info-item"><strong>Marque:</strong> {constatData.vehicle_a_brand || 'Non renseigné'}</div>
              <div className="info-item"><strong>Modèle:</strong> {constatData.vehicle_a_model || 'Non renseigné'}</div>
              <div className="info-item"><strong>Immatriculation:</strong> {constatData.vehicle_a_plate || 'Non renseigné'}</div>
              <div className="info-item"><strong>Sens:</strong> Venant de {constatData.vehicle_a_direction_from || '?'} → Allant à {constatData.vehicle_a_direction_to || '?'}</div>
            </Col>
          </Row>
          <div className="damage-box">
            <strong>💥 Point de choc initial:</strong> {constatData.vehicle_a_impact_point || 'Non précisé'}
          </div>
          <div className="damage-box">
            <strong>🔧 Dégâts apparents:</strong> {constatData.vehicle_a_damages || 'Aucun dégât déclaré'}
          </div>
        </Card>

        <Card title="🚙 3. VÉHICULE B (Autre véhicule)" size="small" className="constat-card">
          <Row gutter={16}>
            <Col span={12}>
              <div className="section-subtitle">🔹 Société d'assurance</div>
              <div className="info-item"><strong>Assurance:</strong> {constatData.vehicle_b_insurance_company || 'Non renseigné'}</div>
              <div className="info-item"><strong>Police:</strong> {constatData.vehicle_b_policy_number || 'Non renseigné'}</div>
              <div className="info-item"><strong>Agence:</strong> {constatData.vehicle_b_agency || 'Non renseigné'}</div>
              <div className="info-item"><strong>Attestation valable jusqu'au:</strong> {constatData.vehicle_b_certificate_valid_until || 'Non renseigné'}</div>
              
              <div className="section-subtitle">🔹 Conducteur</div>
              <div className="info-item"><strong>Nom:</strong> {constatData.vehicle_b_driver_lastname || 'Non renseigné'} {constatData.vehicle_b_driver_firstname || ''}</div>
              <div className="info-item"><strong>Adresse:</strong> {constatData.vehicle_b_driver_address || 'Non renseigné'}</div>
              <div className="info-item"><strong>Permis n°:</strong> {constatData.vehicle_b_driver_license_number || 'Non renseigné'}</div>
              <div className="info-item"><strong>Délivré le:</strong> {constatData.vehicle_b_driver_license_date || 'Non renseigné'}</div>
            </Col>
            <Col span={12}>
              <div className="section-subtitle">🔹 Assuré</div>
              <div className="info-item"><strong>Nom:</strong> {constatData.vehicle_b_insured_lastname || 'Non renseigné'} {constatData.vehicle_b_insured_firstname || ''}</div>
              <div className="info-item"><strong>Adresse:</strong> {constatData.vehicle_b_insured_address || 'Non renseigné'}</div>
              <div className="info-item"><strong>Téléphone:</strong> {constatData.vehicle_b_insured_phone || 'Non renseigné'}</div>
              
              <div className="section-subtitle">🔹 Véhicule</div>
              <div className="info-item"><strong>Marque:</strong> {constatData.vehicle_b_brand || 'Non renseigné'}</div>
              <div className="info-item"><strong>Modèle:</strong> {constatData.vehicle_b_model || 'Non renseigné'}</div>
              <div className="info-item"><strong>Immatriculation:</strong> {constatData.vehicle_b_plate || 'Non renseigné'}</div>
              <div className="info-item"><strong>Sens:</strong> Venant de {constatData.vehicle_b_direction_from || '?'} → Allant à {constatData.vehicle_b_direction_to || '?'}</div>
            </Col>
          </Row>
          <div className="damage-box">
            <strong>💥 Point de choc initial:</strong> {constatData.vehicle_b_impact_point || 'Non précisé'}
          </div>
          <div className="damage-box">
            <strong>🔧 Dégâts apparents:</strong> {constatData.vehicle_b_damages || 'Aucun dégât déclaré'}
          </div>
        </Card>

        <Card title="⚠️ 4. CIRCONSTANCES DE L'ACCIDENT" size="small" className="constat-card">
          <Row gutter={16}>
            {circumstancesOptions.map((circumstance, idx) => (
              <Col span={12} key={idx}>
                <div className="circumstance-item">
                  <Checkbox checked={selectedCircumstances.includes(circumstance)} disabled />
                  <span style={{ marginLeft: 8 }}>{circumstance}</span>
                </div>
              </Col>
            ))}
          </Row>
          <Divider style={{ borderColor: '#2a2a3a' }} />
          <div className="info-item">
            <strong>Nombre de cases cochées:</strong> {selectedCircumstances.length}
          </div>
        </Card>

        <Card title="✍️ 5. OBSERVATIONS" size="small" className="constat-card">
          <Paragraph style={{ color: '#f1f5f9' }}>
            {constatData.observations || 'Aucune observation complémentaire'}
          </Paragraph>
        </Card>

        <Card title="✒️ 6. SIGNATURES ÉLECTRONIQUES" size="small" className="constat-card">
          <Row gutter={40}>
            <Col span={12} style={{ textAlign: 'center' }}>
              <div className="signature-box">
                <Text strong style={{ color: '#f1f5f9', fontSize: 16 }}>Signature conducteur A</Text>
                <div className="signature-line"></div>
                {signatureA.lastname || signatureA.firstname ? (
                  <div className="signature-info">
                    <Text style={{ color: '#f1f5f9', fontSize: 14 }}>
                      <strong>{signatureA.firstname || '_____'} {signatureA.lastname || '_____'}</strong>
                    </Text>
                    <br />
                    <Text type="secondary" style={{ color: '#8c8c8c', fontSize: 11 }}>
                      Signé le: {signatureA.timestamp ? new Date(signatureA.timestamp).toLocaleString() : '_____'}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ color: '#8c8c8c', fontSize: 10 }}>
                      IP/Discord ID: {signatureA.user_id || '_____'}
                    </Text>
                  </div>
                ) : (
                  <Text type="secondary" style={{ color: '#8c8c8c', fontSize: 12 }}>En attente de signature</Text>
                )}
              </div>
            </Col>
            <Col span={12} style={{ textAlign: 'center' }}>
              <div className="signature-box">
                <Text strong style={{ color: '#f1f5f9', fontSize: 16 }}>Signature conducteur B</Text>
                <div className="signature-line"></div>
                {signatureB.lastname || signatureB.firstname ? (
                  <div className="signature-info">
                    <Text style={{ color: '#f1f5f9', fontSize: 14 }}>
                      <strong>{signatureB.firstname || '_____'} {signatureB.lastname || '_____'}</strong>
                    </Text>
                    <br />
                    <Text type="secondary" style={{ color: '#8c8c8c', fontSize: 11 }}>
                      Signé le: {signatureB.timestamp ? new Date(signatureB.timestamp).toLocaleString() : '_____'}
                    </Text>
                    <br />
                    <Text type="secondary" style={{ color: '#8c8c8c', fontSize: 10 }}>
                      IP/Discord ID: {signatureB.user_id || '_____'}
                    </Text>
                  </div>
                ) : (
                  <Text type="secondary" style={{ color: '#8c8c8c', fontSize: 12 }}>En attente de signature</Text>
                )}
              </div>
            </Col>
          </Row>
          <Divider style={{ borderColor: '#2a2a3a' }} />
          <div style={{ textAlign: 'center', marginTop: 16 }}>
            <Alert
              message="Valeur juridique de la signature électronique"
              description="Conformément au règlement eIDAS, la signature électronique a la même valeur juridique qu'une signature manuscrite. En signant, vous certifiez l'exactitude des informations fournies."
              type="info"
              showIcon
              style={{ background: 'rgba(20, 20, 30, 0.8)', borderColor: '#2a2a3a' }}
            />
          </div>
        </Card>

        {constatData.photos && constatData.photos.length > 0 && (
          <Card title="📸 PHOTOS" size="small" className="constat-card">
            <Row gutter={16}>
              {constatData.photos.map((photo, idx) => (
                <Col span={6} key={idx}>
                  <Image src={photo} style={{ width: '100%', borderRadius: 8 }} />
                </Col>
              ))}
            </Row>
          </Card>
        )}

        <div className="constat-footer">
          <Text type="secondary">Document généré automatiquement par Neura ERP AI - Conforme RGPD</Text>
          <Text type="secondary" style={{ display: 'block', fontSize: 10 }}>À envoyer à votre assurance dans les 5 jours ouvrés</Text>
        </div>
      </div>
    </Modal>
  );
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const ClaimDeclaration = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [form] = Form.useForm();
  const [photos, setPhotos] = useState([]);
  const [claimData, setClaimData] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [liveAnalysis, setLiveAnalysis] = useState(null);
  const [weatherData, setWeatherData] = useState(null);
  const [riskAssessment, setRiskAssessment] = useState(null);
  const [similarClaims, setSimilarClaims] = useState([]);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [reportGenerating, setReportGenerating] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationDrawerVisible, setNotificationDrawerVisible] = useState(false);
  const [selectedClaimType, setSelectedClaimType] = useState('accident');
  
  const [discordClaims, setDiscordClaims] = useState([]);
  const [loadingDiscord, setLoadingDiscord] = useState(false);
  const [selectedDiscordClaim, setSelectedDiscordClaim] = useState(null);
  const [discordModalVisible, setDiscordModalVisible] = useState(false);
  const [newClaimsCount, setNewClaimsCount] = useState(0);
  const [importing, setImporting] = useState(false);
  
  const [constatVisible, setConstatVisible] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(false);
  
  const [analysisVisible, setAnalysisVisible] = useState(false);
  const [analysisSteps, setAnalysisSteps] = useState([]);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [detectedParts, setDetectedParts] = useState([]);
  const [fraudScore, setFraudScore] = useState(0);
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [analyzedImage, setAnalyzedImage] = useState(null);
  const [selectedBoundingBox, setSelectedBoundingBox] = useState(null);
  const [autoTransitionTimer, setAutoTransitionTimer] = useState(null);

  const WS_BASE = process.env.REACT_APP_WS_URL || 'ws://localhost:8000';

  // ============================================
  // FONCTIONS
  // ============================================

  const addNotification = (title, messageText, type = 'info', claim = null) => {
    const newNotification = {
      id: Date.now(),
      title,
      message: messageText,
      type,
      claim,
      read: false,
      timestamp: new Date()
    };
    setNotifications(prev => [newNotification, ...prev]);
    
    switch(type) {
      case 'success': message.success(messageText); break;
      case 'error': message.error(messageText); break;
      case 'warning': message.warning(messageText); break;
      default: message.info(messageText);
    }
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev => prev.map(notif => notif.id === notificationId ? { ...notif, read: true } : notif));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
  };

  const processDiscordNotification = (claim) => {
    addNotification('📱 Nouvelle déclaration Discord', `Nouvelle déclaration de ${claim.client}`, 'info', claim);
    setNewClaimsCount(prev => prev + 1);
  };

  const generatePDFReport = () => {
    const formValues = form.getFieldsValue();
    const config = CLAIM_TYPES[selectedClaimType];
    
    const claimNumber = claimData?.claim_number || `C-${Date.now()}`;
    const claimDescription = claimData?.description || formValues.description || 'Aucune description';
    const claimLocation = claimData?.location || formValues.location || 'Non spécifié';
    const claimPhone = claimData?.contact_phone || formValues.contact_phone || 'Non renseigné';
    
    setReportGenerating(true);
    
    try {
      const reportHtml = `<!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Rapport de sinistre - ${claimNumber}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0f; padding: 40px; }
          .report-container { max-width: 1000px; margin: 0 auto; background: #14141e; border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,0.5); overflow: hidden; border: 1px solid #2a2a3a; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }
          .header h1 { font-size: 28px; margin-bottom: 10px; }
          .content { padding: 40px; color: #f1f5f9; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 18px; font-weight: bold; color: #667eea; border-left: 4px solid #667eea; padding-left: 15px; margin-bottom: 20px; }
          .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; background: #0a0a0f; border-radius: 12px; padding: 20px; border: 1px solid #2a2a3a; }
          .info-item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #2a2a3a; }
          .info-label { font-weight: 600; color: #8c8c8c; }
          .fraud-high { color: #ff4d4f; font-weight: bold; }
          .fraud-medium { color: #faad14; font-weight: bold; }
          .fraud-low { color: #52c41a; font-weight: bold; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #2a2a3a; padding: 12px; text-align: left; }
          th { background: #0a0a0f; font-weight: 600; color: #f1f5f9; }
          td { color: #f1f5f9; }
          .footer { background: #0a0a0f; padding: 20px 40px; text-align: center; font-size: 12px; color: #8c8c8c; border-top: 1px solid #2a2a3a; }
        </style>
      </head>
      <body>
        <div class="report-container">
          <div class="header"><h1>📄 RAPPORT DE SINISTRE</h1><p>${config.name}</p><p>Généré le ${new Date().toLocaleString()}</p></div>
          <div class="content">
            <div class="section"><div class="section-title">📋 INFORMATIONS GÉNÉRALES</div>
              <div class="info-grid">
                <div class="info-item"><span class="info-label">N° Sinistre :</span><span class="info-value"><strong>${claimNumber}</strong></span></div>
                <div class="info-item"><span class="info-label">Type :</span><span class="info-value">${config.name}</span></div>
                <div class="info-item"><span class="info-label">Lieu :</span><span class="info-value">${claimLocation}</span></div>
                <div class="info-item"><span class="info-label">Contact :</span><span class="info-value">${claimPhone}</span></div>
              </div>
            </div>
            <div class="section"><div class="section-title">📝 DESCRIPTION</div><div style="background:#0a0a0f;padding:20px;border-radius:12px;border:1px solid #2a2a3a;"><p>${claimDescription.replace(/\n/g, '<br>')}</p></div></div>
            <div class="section"><div class="section-title">🔬 RÉSULTATS</div>
              <div class="info-grid">
                <div class="info-item"><span class="info-label">Documents :</span><span class="info-value">${photos.length}</span></div>
                <div class="info-item"><span class="info-label">Estimation :</span><span class="info-value"><strong style="color:#52c41a;">${getEstimatedAmount()} €</strong></span></div>
                <div class="info-item"><span class="info-label">Score fraude :</span><span class="info-value ${getFraudScore() > 70 ? 'fraud-high' : getFraudScore() > 40 ? 'fraud-medium' : 'fraud-low'}">${getFraudScore()}%</span></div>
              </div>
            </div>
          </div>
          <div class="footer"><p>Document généré par l'assurance IA</p></div>
        </div>
      </body>
      </html>`;
      
      const blob = new Blob([reportHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `rapport_sinistre_${claimNumber}.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      message.success('📄 Rapport généré !');
    } catch (error) {
      message.error('❌ Erreur génération rapport');
    } finally {
      setReportGenerating(false);
    }
  };

  const generateSimpleReport = () => {
    const reportData = {
      claim_number: claimData?.claim_number || Date.now(),
      date: new Date().toLocaleString(),
      claim_type: selectedClaimType,
      photos_count: photos.length,
      total_estimation: getEstimatedAmount(),
      average_fraud_score: getFraudScore(),
      photos: photos.map(p => ({
        estimated_cost: p.estimated_cost,
        fraud_score: p.fraud_score,
        detected_parts: p.detected_parts
      }))
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport_analyse_${reportData.claim_number}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('Rapport JSON exporté !');
  };

  const fetchDiscordClaims = useCallback(async () => {
    setLoadingDiscord(true);
    try {
      const response = await api.get('/insurance/claims/discord');
      if (response.data && response.data.claims) {
        setDiscordClaims(response.data.claims);
        const newCount = response.data.claims.filter(c => c.status === 'pending').length;
        setNewClaimsCount(newCount);
      }
    } catch (error) {
      console.error('Erreur chargement déclarations Discord:', error);
    } finally {
      setLoadingDiscord(false);
    }
  }, []);

  const fetchDiscordReport = async (claimId) => {
    setLoadingReport(true);
    try {
      const response = await api.get(`/insurance/claim/${claimId}/report`);
      if (response.data && response.data.report) {
        setCurrentReport(response.data.report);
        setConstatVisible(true);
      } else {
        message.error('Impossible de charger le constat');
      }
    } catch (error) {
      console.error('Erreur chargement constat:', error);
      message.error('Erreur lors du chargement du constat');
    } finally {
      setLoadingReport(false);
    }
  };

  const generateConstatPDF = (report) => {
    if (!report) return;
    
    const constatData = report.constat_data || {};
    const signatureA = constatData.signature_a || {};
    const signatureB = constatData.signature_b || {};
    
    const pdfHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Constat ${report.claim_number}</title>
        <style>
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #0a0a0f; padding: 40px; color: #f1f5f9; }
          .container { max-width: 1000px; margin: 0 auto; background: #14141e; border-radius: 16px; border: 1px solid #2a2a3a; overflow: hidden; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
          .content { padding: 20px; }
          .info { background: #0a0a0f; padding: 15px; border-radius: 8px; margin: 10px 0; border: 1px solid #2a2a3a; }
          .signature { margin-top: 30px; border-top: 1px solid #2a2a3a; padding-top: 20px; text-align: center; }
          .signature-name { font-family: 'Courier New', monospace; font-size: 16px; margin-top: 10px; color: #f1f5f9; }
          .footer { text-align: center; padding: 16px; border-top: 1px solid #2a2a3a; color: #8c8c8c; font-size: 11px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header"><h1>📄 CONSTAT DE SINISTRE</h1><p>${report.claim_number}</p></div>
          <div class="content">
            <div class="info"><strong>Client:</strong> ${report.client}</div>
            <div class="info"><strong>Type:</strong> ${report.type}</div>
            <div class="info"><strong>Date:</strong> ${new Date(report.date).toLocaleString()}</div>
            <div class="info"><strong>Description:</strong> ${report.description}</div>
            <div class="info"><strong>Score fraude:</strong> ${report.fraud_score}%</div>
            <div class="signature">
              <h3 style="color: #f1f5f9;">Signatures électroniques</h3>
              <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                <div style="text-align: center; width: 45%;">
                  <p><strong style="color: #f1f5f9;">Conducteur A</strong></p>
                  <div class="signature-name">${signatureA.firstname || '_____'} ${signatureA.lastname || '_____'}</div>
                  <p style="font-size: 11px; color: #8c8c8c;">Signé le: ${signatureA.timestamp ? new Date(signatureA.timestamp).toLocaleString() : '_____'}</p>
                </div>
                <div style="text-align: center; width: 45%;">
                  <p><strong style="color: #f1f5f9;">Conducteur B</strong></p>
                  <div class="signature-name">${signatureB.firstname || '_____'} ${signatureB.lastname || '_____'}</div>
                  <p style="font-size: 11px; color: #8c8c8c;">Signé le: ${signatureB.timestamp ? new Date(signatureB.timestamp).toLocaleString() : '_____'}</p>
                </div>
              </div>
            </div>
          </div>
          <div class="footer">Document généré par Neura ERP AI - Signature électronique conforme eIDAS</div>
        </div>
      </body>
      </html>
    `;
    
    const blob = new Blob([pdfHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `constat_${report.claim_number}.html`;
    link.click();
    URL.revokeObjectURL(url);
    message.success('Constat téléchargé !');
  };

  const autoTransitionToConfirmation = useCallback(() => {
    const requiredPhotos = CLAIM_TYPES[selectedClaimType]?.requiredPhotos || 4;
    
    if (photos.length >= requiredPhotos && !analyzing && currentStep === 1) {
      if (autoTransitionTimer) {
        clearTimeout(autoTransitionTimer);
      }
      
      const timer = setTimeout(() => {
        setAnalysisVisible(false);
        setCurrentStep(2);
        message.success(`🎉 ${photos.length} documents analysés avec succès ! Passage à la confirmation...`);
        
        if (photos.length > 0) {
          setTimeout(() => {
            Modal.confirm({
              title: '📄 Générer le rapport ?',
              content: 'Voulez-vous générer le rapport PDF maintenant ?',
              okText: 'Oui',
              cancelText: 'Plus tard',
              onOk: () => generatePDFReport()
            });
          }, 500);
        }
      }, 1500);
      
      setAutoTransitionTimer(timer);
    }
  }, [photos.length, analyzing, currentStep, selectedClaimType, autoTransitionTimer]);

  // ============================================
  // WEBSOCKET
  // ============================================

  useEffect(() => {
    let ws = null;
    const connectWebSocket = () => {
      try {
        ws = new WebSocket(`${WS_BASE.replace('http', 'ws')}/api/v1/ws/notifications?sector=insurance`);
        ws.onopen = () => { console.log('WebSocket connecté'); setIsConnected(true); };
        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'new_claim') {
              setDiscordClaims(prev => [data.data, ...prev]);
              processDiscordNotification(data.data);
            }
          } catch (e) { console.error(e); }
        };
        ws.onerror = () => { setIsConnected(false); setTimeout(connectWebSocket, 5000); };
        ws.onclose = () => { setIsConnected(false); setTimeout(connectWebSocket, 5000); };
      } catch (error) { setTimeout(connectWebSocket, 5000); }
    };
    connectWebSocket();
    return () => { if (ws) ws.close(); };
  }, []);

  useEffect(() => {
    fetchDiscordClaims();
    const interval = setInterval(fetchDiscordClaims, 30000);
    return () => clearInterval(interval);
  }, [fetchDiscordClaims]);

  useEffect(() => {
    autoTransitionToConfirmation();
  }, [photos, autoTransitionToConfirmation]);

  useEffect(() => {
    return () => {
      if (autoTransitionTimer) {
        clearTimeout(autoTransitionTimer);
      }
    };
  }, [autoTransitionTimer]);

  // ============================================
  // ANALYSE D'IMAGE - CORRIGÉE
  // ============================================

  const analyzeImage = async (file) => {
    const config = CLAIM_TYPES[selectedClaimType];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('claim_type', selectedClaimType);
    
    setAnalyzing(true);
    setProcessingProgress(0);
    setAnalysisVisible(true);
    setAnalysisSteps(config.steps.map((msg, i) => ({ step: i + 1, message: msg, status: i === 0 ? 'processing' : 'pending' })));
    
    const imageUrl = URL.createObjectURL(file);
    setAnalyzedImage(imageUrl);
    
    try {
      for (let i = 1; i <= config.steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 600));
        setAnalysisSteps(prev => prev.map(s => s.step === i ? { ...s, status: 'completed' } : s.step === i + 1 ? { ...s, status: 'processing' } : s));
        setProcessingProgress(i * (100 / config.steps.length));
      }
      
      const response = await api.post(config.endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });
      
      const analysis = response.data;
      const resultData = analysis.data || analysis;
      
      if (resultData.annotated_image) {
        setAnalyzedImage(`data:image/jpeg;base64,${resultData.annotated_image}`);
      }
      
      let hasDamage = false;
      let resultDescription = '';
      let estimatedAmount = 0;
      let damageParts = [];
      let confidenceValue = resultData.severity_score || resultData.confidence || 0;
      
      // ✅ Normaliser les données
      if (resultData.detected_parts && Array.isArray(resultData.detected_parts)) {
        damageParts = resultData.detected_parts.map(p => {
          if (typeof p === 'string') return p;
          if (typeof p === 'object') return p.part || p.class || p.name || p.type || 'Pièce détectée';
          return String(p);
        });
      } else if (resultData.damage_detections && Array.isArray(resultData.damage_detections)) {
        damageParts = resultData.damage_detections.map(d => {
          if (typeof d === 'string') return d;
          return d.part || d.class || d.damage_type || d.type || 'Dégât détecté';
        });
      }
      
      if (selectedClaimType === 'accident') {
        hasDamage = confidenceValue > 50;
        resultDescription = hasDamage ? `🚗 Dégâts détectés (${confidenceValue.toFixed(1)}%)` : `✅ Aucun dégât (${confidenceValue.toFixed(1)}%)`;
        estimatedAmount = hasDamage ? (resultData.total_estimated_cost || 1500) : 0;
      } else if (selectedClaimType === 'habitation') {
        hasDamage = resultData.class_name === 'fire_damage';
        resultDescription = hasDamage ? `🔥 Incendie détecté (${confidenceValue.toFixed(1)}%)` : `✅ Aucun sinistre`;
        estimatedAmount = hasDamage ? (resultData.total_estimated_cost || 8000) : 0;
      } else {
        hasDamage = confidenceValue > 50;
        resultDescription = resultData.description || `Analyse terminée (${confidenceValue.toFixed(1)}%)`;
        estimatedAmount = resultData.total_estimated_cost || 0;
      }
      
      setAnalysisResults({ ...resultData, description: resultDescription, has_damage: hasDamage, confidence: confidenceValue });
      setDetectedParts(damageParts);
      setFraudScore(resultData.fraud_score || 0);
      setEstimatedCost(estimatedAmount);
      
      setPhotos(prev => [...prev, { 
        file, 
        analysis: resultData, 
        id: Date.now(), 
        damage_severity: confidenceValue,
        estimated_cost: estimatedAmount, 
        detected_parts: damageParts,
        bounding_boxes: resultData.bounding_boxes || [], 
        fraud_score: resultData.fraud_score || 0,
        description: resultDescription, 
        image_url: imageUrl, 
        timestamp: new Date().toISOString(),
        has_damage: hasDamage, 
        claim_type: selectedClaimType
      }]);
      
      message.success(hasDamage ? '⚠️ Dégâts détectés' : '✅ Analyse terminée');
      addNotification('🔬 Analyse terminée', resultDescription, hasDamage ? 'warning' : 'success');
      
    } catch (error) {
      console.error('Erreur analyse:', error);
      if (error.response) {
        console.error('  - Status:', error.response.status);
        console.error('  - Data:', error.response.data);
        message.error(`Erreur ${error.response.status}: ${error.response.data?.detail || 'Analyse impossible'}`);
      } else {
        message.error('❌ Erreur lors de l\'analyse');
      }
      URL.revokeObjectURL(imageUrl);
    } finally {
      setAnalyzing(false);
    }
    return false;
  };

  const analyzeDiscordImage = async (imageUrl) => {
    const config = CLAIM_TYPES[selectedClaimType];
    setAnalyzing(true);
    setProcessingProgress(0);
    setAnalysisVisible(true);
    setAnalysisSteps(config.steps.map((msg, i) => ({ step: i + 1, message: msg, status: i === 0 ? 'processing' : 'pending' })));
    setAnalyzedImage(imageUrl);
    
    try {
      for (let i = 1; i <= config.steps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 600));
        setAnalysisSteps(prev => prev.map(s => s.step === i ? { ...s, status: 'completed' } : s.step === i + 1 ? { ...s, status: 'processing' } : s));
        setProcessingProgress(i * (100 / config.steps.length));
      }
      
      const imageResponse = await fetch(imageUrl);
      const imageBlob = await imageResponse.blob();
      const file = new File([imageBlob], 'discord_photo.jpg', { type: 'image/jpeg' });
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('claim_type', selectedClaimType);
      
      const response = await api.post(config.endpoint, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 60000
      });
      
      const analysis = response.data;
      const resultData = analysis.data || analysis;
      
      if (resultData.annotated_image) {
        setAnalyzedImage(`data:image/jpeg;base64,${resultData.annotated_image}`);
      }
      
      setAnalysisResults(resultData);
      setDetectedParts(resultData.detected_parts || []);
      setFraudScore(resultData.fraud_score || 0);
      setEstimatedCost(resultData.estimated_cost || 0);
      
      return resultData;
    } catch (error) {
      console.error('Erreur:', error);
      throw error;
    } finally {
      setAnalyzing(false);
    }
  };

  // ============================================
  // IMPORT DISCORD
  // ============================================

  const importDiscordClaim = async (claim) => {
    setImporting(true);
    try {
      form.setFieldsValue({
        type: selectedClaimType,
        description: claim.description,
        location: claim.address || '',
        contact_phone: claim.phone || '',
        contact_email: ''
      });
      
      setCurrentStep(1);
      setDiscordModalVisible(false);
      
      if (claim.image_url) {
        const analysisResult = await analyzeDiscordImage(claim.image_url);
        const newPhoto = {
          file: { name: `discord_${claim.claim_number}.jpg`, url: claim.image_url },
          image_url: claim.image_url,
          analysis: analysisResult,
          id: Date.now(),
          damage_severity: analysisResult.severity_score,
          estimated_cost: analysisResult.estimated_cost,
          detected_parts: analysisResult.detected_parts,
          bounding_boxes: analysisResult.bounding_boxes,
          source: 'discord',
          fraud_score: analysisResult.fraud_score || 0
        };
        setPhotos(prev => [...prev, newPhoto]);
        
        if (analysisResult.fraud_score > 70) {
          message.error(`⚠️ Fraude potentielle! Score: ${analysisResult.fraud_score}%`);
        } else {
          message.success(`✅ Analyse terminée. Estimation: ${analysisResult.estimated_cost}€`);
        }
      }
      message.success('Déclaration importée avec succès');
    } catch (error) {
      message.error('Erreur lors de l\'importation');
    } finally {
      setImporting(false);
    }
  };

  // ============================================
  // SOUMISSION
  // ============================================

  const handleManualSubmit = async () => {
    const type = form.getFieldValue('type');
    const description = form.getFieldValue('description');
    const config = CLAIM_TYPES[selectedClaimType];
    
    if (!type) { 
      message.error('❌ Veuillez sélectionner le type de sinistre'); 
      return; 
    }
    if (!description || description.trim() === '') { 
      message.error('❌ Veuillez décrire le sinistre'); 
      return; 
    }
    if (photos.length < config.requiredPhotos) { 
      message.error(`❌ Veuillez ajouter au moins ${config.requiredPhotos} document(s)`); 
      return; 
    }
    
    setLoading(true);
    try {
      const submitData = {
        type: type,
        description: description,
        location: form.getFieldValue('location') || 'Non spécifié',
        contact_phone: form.getFieldValue('contact_phone') || 'Non renseigné',
        contact_email: form.getFieldValue('contact_email') || 'Non renseigné',
        incident_date: form.getFieldValue('incident_date') ? dayjs(form.getFieldValue('incident_date')).format('YYYY-MM-DD HH:mm:ss') : new Date().toISOString(),
        claim_type: selectedClaimType,
        photos: photos.map(p => ({
          damage_severity: p.damage_severity,
          estimated_cost: p.estimated_cost,
          detected_parts: p.detected_parts,
          source: p.source || 'web',
          image_url: p.image_url,
          fraud_score: p.fraud_score || 0
        })),
        submitted_at: new Date().toISOString()
      };
      
      let response = await api.post('/claims/submit', submitData);
      
      setClaimData(response.data);
      setCurrentStep(2);
      message.success('✅ Déclaration enregistrée !');
      
      setTimeout(() => {
        Modal.confirm({
          title: '📄 Télécharger le rapport',
          content: 'Télécharger le rapport PDF ?',
          okText: 'Oui',
          cancelText: 'Plus tard',
          onOk: () => generatePDFReport()
        });
      }, 500);
      
    } catch (error) {
      console.error('Erreur soumission:', error);
      message.error('❌ Erreur lors de la soumission');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePhoto = (index) => {
    Modal.confirm({
      title: 'Supprimer',
      content: 'Supprimer ce document ?',
      okText: 'Supprimer',
      okType: 'danger',
      onOk: () => {
        setPhotos(photos.filter((_, i) => i !== index));
        message.success('Document supprimé');
      }
    });
  };

  // ============================================
  // CALCULS
  // ============================================

  const getTotalDamageScore = useCallback(() => {
    if (photos.length === 0) return 0;
    return Math.round(photos.reduce((sum, p) => sum + (p.damage_severity || 0), 0) / photos.length);
  }, [photos]);

  const getEstimatedAmount = useCallback(() => {
    if (photos.length === 0) return 0;
    return photos.reduce((sum, p) => sum + (p.estimated_cost || 0), 0);
  }, [photos]);

  const getFraudScore = useCallback(() => {
    if (photos.length === 0) return 0;
    return Math.round(photos.reduce((sum, p) => sum + (p.fraud_score || 0), 0) / photos.length);
  }, [photos]);

  // ============================================
  // COLONNES TABLEAU DISCORD
  // ============================================

  const discordClaimColumns = [
    { title: 'N° Sinistre', dataIndex: 'claim_number', key: 'claim_number', render: (text) => <code style={{ color: '#f1f5f9' }}>{text}</code> },
    { title: 'Client', dataIndex: 'client', key: 'client', render: (text) => <><UserOutlined style={{ color: '#8c8c8c' }} /> <span style={{ color: '#f1f5f9' }}>{text}</span></> },
    { title: 'Type', dataIndex: 'type', key: 'type', render: (type) => <Tag color="blue">{type}</Tag> },
    { title: 'Date', dataIndex: 'created_at', key: 'created_at', render: (date) => <span style={{ color: '#f1f5f9' }}>{new Date(date).toLocaleString()}</span> },
    { 
      title: 'Actions', 
      key: 'actions', 
      render: (_, record) => (
        <Space>
          <Button type="primary" size="small" icon={<SendOutlined />} onClick={() => importDiscordClaim(record)} loading={importing}>
            Traiter
          </Button>
          <Button size="small" icon={<FileTextOutlined />} onClick={() => fetchDiscordReport(record.id)} loading={loadingReport}>
            Constat
          </Button>
        </Space>
      ) 
    }
  ];

  // ============================================
  // STEPS
  // ============================================

  const steps = [
    { title: 'Description', icon: <FileTextOutlined />, description: 'Informations du sinistre' },
    { title: 'Documents', icon: <CameraOutlined />, description: 'Analyse IA' },
    { title: 'Confirmation', icon: <CheckCircleOutlined />, description: 'Validation' }
  ];

  const timelineItems = analysisSteps.map((step, idx) => ({
    key: idx,
    color: step.status === 'completed' ? 'green' : step.status === 'processing' ? 'blue' : 'gray',
    children: (
      <div>
        <Text strong style={{ color: '#f1f5f9' }}>Étape {step.step}</Text>
        <div style={{ fontSize: 12, color: '#8c8c8c' }}>{step.message}</div>
        {step.status === 'processing' && <Spin size="small" style={{ marginLeft: 8 }} />}
        {step.status === 'completed' && <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 8 }} />}
      </div>
    )
  }));

  // ============================================
  // MODAL ANALYSIS
  // ============================================

  const AnalysisModal = () => {
    const config = CLAIM_TYPES[selectedClaimType];
    const hasDamage = analysisResults?.has_damage;
    const confidenceValue = analysisResults?.confidence || 0;
    
    let verdictMessage = '';
    let verdictType = 'success';
    let verdictIcon = null;
    
    if (selectedClaimType === 'accident') {
      if (hasDamage) {
        verdictMessage = '🚗 DÉGÂTS DÉTECTÉS SUR LE VÉHICULE';
        verdictType = 'warning';
        verdictIcon = <CarOutlined />;
      } else {
        verdictMessage = '✅ VÉHICULE EN BON ÉTAT';
        verdictType = 'success';
        verdictIcon = <CheckCircleOutlined />;
      }
    } else if (selectedClaimType === 'habitation') {
      if (hasDamage) {
        verdictMessage = '🔥 SINISTRE DÉTECTÉ';
        verdictType = 'error';
        verdictIcon = <WarningOutlined />;
      } else {
        verdictMessage = '✅ PAS DE SINISTRE';
        verdictType = 'success';
        verdictIcon = <CheckCircleOutlined />;
      }
    } else {
      if (hasDamage) {
        verdictMessage = '⚠️ ANOMALIE DÉTECTÉE';
        verdictType = 'warning';
        verdictIcon = <WarningOutlined />;
      } else {
        verdictMessage = '✅ AUCUNE ANOMALIE';
        verdictType = 'success';
        verdictIcon = <CheckCircleOutlined />;
      }
    }
    
    return (
      <Drawer
        title={<Space><ExperimentOutlined style={{ color: config.color }} /><span style={{ color: '#f1f5f9' }}>🔬 Analyse IA - {config.name}</span><Tag color={config.color}>IA</Tag></Space>}
        placement="right" width={600} open={analysisVisible} onClose={() => setAnalysisVisible(false)} closable={!analyzing}
      >
        <div style={{ padding: '16px 0' }}>
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><Text style={{ color: '#8c8c8c' }}>Progression</Text><Text style={{ color: '#f1f5f9' }}>{processingProgress}%</Text></div>
            <Progress percent={processingProgress} status={analyzing ? 'active' : 'success'} strokeColor={config.color} />
          </div>
          
          {analyzedImage && (
            <Card size="small" style={{ marginBottom: 16, borderRadius: 12, background: '#0a0a0f', border: '1px solid #2a2a3a' }}>
              <div style={{ textAlign: 'center', marginBottom: 8 }}><Text style={{ color: '#8c8c8c' }}>🖼️ Document analysé</Text></div>
              <ImageWithBoundingBoxes 
                imageSrc={analyzedImage} 
                boundingBoxes={analysisResults?.bounding_boxes} 
                claimType={selectedClaimType} 
                onBoxClick={(box) => message.info(`${box.part} - ${Math.round(box.confidence * 100)}%`)} 
              />
            </Card>
          )}
          
          <div style={{ marginBottom: 24 }}><Text style={{ color: '#f1f5f9' }}>Étapes</Text><Timeline items={timelineItems} style={{ marginTop: 16 }} /></div>
          
          {analysisResults && (
            <>
              <Divider style={{ borderColor: '#2a2a3a' }}>Résultats</Divider>
              <Alert 
                message={<span style={{ color: '#f1f5f9' }}>{verdictMessage}</span>} 
                description={analysisResults.description} 
                type={verdictType} 
                showIcon icon={verdictIcon} 
                style={{ marginBottom: 16, borderRadius: 12, background: 'rgba(20, 20, 30, 0.8)', borderColor: '#2a2a3a' }} 
              />
              <Row gutter={16} style={{ marginTop: 16 }}>
                <Col span={12}>
                  <Card size="small" style={{ background: 'rgba(20, 20, 30, 0.6)', border: '1px solid #2a2a3a' }}>
                    <Statistic title="Confiance IA" value={confidenceValue} suffix="%" valueStyle={{ color: hasDamage ? '#ff4d4f' : '#52c41a' }} />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card size="small" style={{ background: 'rgba(20, 20, 30, 0.6)', border: '1px solid #2a2a3a' }}>
                    <Statistic title="Score fraude" value={fraudScore} suffix="%" valueStyle={{ color: fraudScore > 50 ? '#ff4d4f' : '#52c41a' }} />
                    <Progress percent={fraudScore} size="small" strokeColor={fraudScore > 50 ? '#ff4d4f' : '#52c41a'} />
                  </Card>
                </Col>
              </Row>
              {detectedParts.length > 0 && (
                <Card size="small" style={{ marginTop: 16, background: '#0a0a0f', border: '1px solid #2a2a3a' }}>
                  <Text style={{ color: '#f1f5f9' }}>Éléments détectés</Text>
                  <div style={{ marginTop: 8 }}>
                    <Space wrap>
                      {detectedParts.map((p, i) => {
                        const partName = typeof p === 'string' ? p : p.part || p.class || p.name || 'Pièce';
                        return <Tag key={i} color={hasDamage ? 'red' : 'blue'}>{partName}</Tag>;
                      })}
                    </Space>
                  </div>
                </Card>
              )}
            </>
          )}
          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <Button type="primary" onClick={() => setAnalysisVisible(false)}>Fermer</Button>
          </div>
        </div>
      </Drawer>
    );
  };

  // ============================================
  // MODAL DISCORD
  // ============================================

  const DiscordModal = () => (
    <Modal 
      title={<Space><DiscordOutlined style={{ color: '#5865F2' }} /><span style={{ color: '#f1f5f9' }}>Import Discord</span><Badge count={newClaimsCount} /></Space>} 
      open={discordModalVisible} onCancel={() => setDiscordModalVisible(false)} width={900} footer={null}
      styles={{ body: { background: '#14141e' }, header: { background: '#14141e', borderBottom: '1px solid #2a2a3a' } }}
    >
      <Tabs defaultActiveKey="list" className="dark-tabs">
        <TabPane tab={<span style={{ color: '#f1f5f9' }}>Liste</span>} key="list">
          <Table 
            columns={discordClaimColumns} 
            dataSource={discordClaims} 
            rowKey="id" 
            loading={loadingDiscord} 
            pagination={{ pageSize: 5 }}
            className="dark-table"
          />
        </TabPane>
        {selectedDiscordClaim && (
          <TabPane tab={<span style={{ color: '#f1f5f9' }}>Détails</span>} key="details">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="N° Sinistre" span={2}><code style={{ color: '#f1f5f9' }}>{selectedDiscordClaim.claim_number}</code></Descriptions.Item>
              <Descriptions.Item label="Client"><UserOutlined style={{ color: '#8c8c8c' }} /> <span style={{ color: '#f1f5f9' }}>{selectedDiscordClaim.client}</span></Descriptions.Item>
              <Descriptions.Item label="Type"><Tag color="blue">{selectedDiscordClaim.type}</Tag></Descriptions.Item>
              <Descriptions.Item label="Date"><span style={{ color: '#f1f5f9' }}>{new Date(selectedDiscordClaim.created_at).toLocaleString()}</span></Descriptions.Item>
              <Descriptions.Item label="Description" span={2}><span style={{ color: '#f1f5f9' }}>{selectedDiscordClaim.description}</span></Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Button type="primary" icon={<SendOutlined />} onClick={() => importDiscordClaim(selectedDiscordClaim)} loading={importing}>
                Importer
              </Button>
            </div>
          </TabPane>
        )}
      </Tabs>
    </Modal>
  );

  // ============================================
  // DRAWER NOTIFICATIONS
  // ============================================

  const NotificationDrawer = () => (
    <Drawer
      title={<Space><BellOutlined style={{ color: '#f1f5f9' }} /><span style={{ color: '#f1f5f9' }}>Notifications</span>{notifications.filter(n => !n.read).length > 0 && (<Badge count={notifications.filter(n => !n.read).length} />)}</Space>}
      placement="right" width={400} open={notificationDrawerVisible} onClose={() => setNotificationDrawerVisible(false)}
      extra={<Button size="small" onClick={markAllAsRead}>Tout lire</Button>}
      styles={{ body: { background: '#14141e' }, header: { background: '#14141e', borderBottom: '1px solid #2a2a3a' } }}
    >
      {notifications.length === 0 ? (<Empty description="Aucune notification" />) : (
        <List dataSource={notifications} renderItem={(item) => (
          <List.Item style={{ background: item.read ? 'transparent' : 'rgba(102, 126, 234, 0.1)', cursor: 'pointer', borderRadius: 8, marginBottom: 8, padding: 12, border: '1px solid #2a2a3a' }}
            onClick={() => { markAsRead(item.id); if (item.claim) { setSelectedDiscordClaim(item.claim); setDiscordModalVisible(true); } }}
          >
            <List.Item.Meta 
              avatar={<Avatar icon={item.type === 'discord' ? <DiscordOutlined /> : <BellOutlined />} style={{ backgroundColor: item.type === 'discord' ? '#5865F2' : '#faad14' }} />}
              title={<Text strong style={{ color: '#f1f5f9' }}>{item.title}</Text>}
              description={<div><Text type="secondary" style={{ fontSize: 12, color: '#8c8c8c' }}>{item.message}</Text><br /><Text type="secondary" style={{ fontSize: 11, color: '#555' }}>{item.timestamp.toLocaleTimeString()}</Text></div>}
            />
          </List.Item>
        )} />
      )}
    </Drawer>
  );

  // ============================================
  // RENDU PRINCIPAL
  // ============================================

  return (
    <div className="claim-declaration">
      <AnalysisModal />
      <DiscordModal />
      <NotificationDrawer />
      <ConstatModal 
        visible={constatVisible} 
        report={currentReport} 
        onClose={() => setConstatVisible(false)} 
        onGeneratePDF={generateConstatPDF}
      />
      
      <AnimatePresence>
        {showStats && photos.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} style={{ marginBottom: 24 }}>
            <Card style={{ background: '#14141e', border: '1px solid #2a2a3a' }}>
              <StatisticsDashboard photos={photos} claims={claimData} claimType={selectedClaimType} />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Card style={{ background: '#14141e', border: '1px solid #2a2a3a', borderRadius: 20 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Title level={2} style={{ color: '#f1f5f9' }}>
            <RobotOutlined style={{ marginRight: 12, color: '#667eea' }} />
            Déclaration de sinistre assistée par IA
          </Title>
          <Paragraph style={{ color: '#8c8c8c' }}>Notre IA analyse vos documents selon le type de sinistre</Paragraph>
          <Space>
            <Button 
              icon={<DiscordOutlined />} 
              onClick={() => setDiscordModalVisible(true)} 
              type={newClaimsCount > 0 ? 'primary' : 'default'} 
              style={{ backgroundColor: newClaimsCount > 0 ? '#5865F2' : undefined }}
            >
              Discord {newClaimsCount > 0 && `(${newClaimsCount})`}
            </Button>
            <Button icon={<BellOutlined />} onClick={() => setNotificationDrawerVisible(true)}>
              Notifications {notifications.filter(n => !n.read).length > 0 && `(${notifications.filter(n => !n.read).length})`}
            </Button>
            <Button icon={<BarChartOutlined />} onClick={() => setShowStats(!showStats)}>
              {showStats ? 'Masquer stats' : 'Afficher stats'}
            </Button>
            {photos.length > 0 && (
              <Button icon={<DownloadOutlined />} onClick={generateSimpleReport}>
                Exporter JSON
              </Button>
            )}
          </Space>
        </div>

        <Steps current={currentStep} items={steps} style={{ marginBottom: 32 }} />

        <Form form={form} layout="vertical" initialValues={{ type: 'accident', contact_phone: '', contact_email: '', location: '' }}>
          {currentStep === 0 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item name="type" label="Type de sinistre" rules={[{ required: true }]}>
                    <Select 
                      placeholder="Sélectionnez le type" 
                      size="large" 
                      onChange={(value) => setSelectedClaimType(value)}
                      className="dark-select"
                    >
                      {Object.entries(CLAIM_TYPES).map(([key, config]) => (
                        <Option key={key} value={key}>
                          <Space>
                            {config.icon}
                            <span style={{ color: '#f1f5f9' }}>{config.name}</span>
                          </Space>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                  <Form.Item name="description" label="Description" rules={[{ required: true }]}>
                    <TextArea 
                      rows={4} 
                      placeholder={`Décrivez le sinistre...\n\n${CLAIM_TYPES[selectedClaimType]?.questions.map(q => `- ${q}`).join('\n')}`} 
                      className="dark-textarea"
                    />
                  </Form.Item>
                  <Form.Item name="location" label="Lieu">
                    <Input prefix={<EnvironmentOutlined style={{ color: '#8c8c8c' }} />} placeholder="Adresse" className="dark-input" />
                  </Form.Item>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="contact_phone" label="Téléphone">
                        <Input prefix={<PhoneOutlined style={{ color: '#8c8c8c' }} />} className="dark-input" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="contact_email" label="Email">
                        <Input prefix={<MailOutlined style={{ color: '#8c8c8c' }} />} className="dark-input" />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Form.Item name="incident_date" label="Date du sinistre">
                    <DatePicker style={{ width: '100%' }} showTime format="DD/MM/YYYY HH:mm" className="dark-picker" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Card 
                    title="Conseils" 
                    style={{ background: CLAIM_TYPES[selectedClaimType]?.bgColor, border: '1px solid #2a2a3a' }}
                  >
                    <List>
                      <List.Item><Text style={{ color: '#f1f5f9' }}>📸 Documents clairs et lisibles</Text></List.Item>
                      <List.Item><Text style={{ color: '#f1f5f9' }}>🔍 Photographiez sous différents angles</Text></List.Item>
                      <List.Item><Text style={{ color: '#f1f5f9' }}>📝 Description précise</Text></List.Item>
                      <List.Item><Text style={{ color: '#f1f5f9' }}>📄 Minimum {CLAIM_TYPES[selectedClaimType]?.requiredPhotos} document(s)</Text></List.Item>
                    </List>
                  </Card>
                  <Alert 
                    message="Protection des données" 
                    description="Conforme RGPD" 
                    type="info" 
                    showIcon 
                    style={{ marginTop: 16, background: 'rgba(20, 20, 30, 0.8)', borderColor: '#2a2a3a' }}
                  />
                </Col>
              </Row>
              <div style={{ textAlign: 'center', marginTop: 32 }}>
                <Button type="primary" size="large" onClick={() => setCurrentStep(1)} icon={<CameraOutlined />}>
                  Continuer
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 1 && (
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <Card 
                title={<span style={{ color: '#f1f5f9' }}>📸 Documents - {CLAIM_TYPES[selectedClaimType]?.name}</span>}
                style={{ background: '#0a0a0f', border: '1px solid #2a2a3a' }}
              >
                <Upload.Dragger 
                  beforeUpload={analyzeImage} 
                  showUploadList={false} 
                  accept="image/*" 
                  multiple 
                  disabled={analyzing}
                  style={{ background: '#0a0a0f', borderColor: '#2a2a3a' }}
                >
                  <p className="ant-upload-drag-icon">
                    <CameraOutlined style={{ fontSize: 48, color: CLAIM_TYPES[selectedClaimType]?.color }} />
                  </p>
                  <p className="ant-upload-text" style={{ color: '#f1f5f9' }}>Cliquez ou glissez-déposez</p>
                  <p className="ant-upload-hint" style={{ color: '#8c8c8c' }}>
                    JPEG, PNG, HEIC. Minimum {CLAIM_TYPES[selectedClaimType]?.requiredPhotos} documents
                  </p>
                </Upload.Dragger>
                
                {analyzing && (
                  <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <Spin />
                    <div style={{ marginTop: 16 }}>
                      <Progress percent={processingProgress} status="active" strokeColor={CLAIM_TYPES[selectedClaimType]?.color} />
                      <Text style={{ color: '#f1f5f9' }}>Analyse en cours...</Text>
                    </div>
                  </div>
                )}
                
                {photos.length >= CLAIM_TYPES[selectedClaimType]?.requiredPhotos && !analyzing && currentStep === 1 && (
                  <Alert
                    message="✅ Tous les documents requis sont analysés"
                    description={`Vous avez ${photos.length}/${CLAIM_TYPES[selectedClaimType]?.requiredPhotos} documents. Passage automatique à l'étape de confirmation...`}
                    type="success"
                    showIcon
                    style={{ marginTop: 16, borderRadius: 12, background: 'rgba(82, 196, 26, 0.1)', borderColor: '#52c41a' }}
                  />
                )}
                
                {photos.length > 0 && (
                  <div style={{ marginTop: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <Title level={4} style={{ color: '#f1f5f9' }}>
                        Documents ({photos.length}/{CLAIM_TYPES[selectedClaimType]?.maxPhotos})
                      </Title>
                      <Space>
                        <Progress 
                          type="circle" 
                          percent={Math.round((photos.length / CLAIM_TYPES[selectedClaimType]?.requiredPhotos) * 100)} 
                          size={60}
                          format={(percent) => `${photos.length}/${CLAIM_TYPES[selectedClaimType]?.requiredPhotos}`}
                          strokeColor={photos.length >= CLAIM_TYPES[selectedClaimType]?.requiredPhotos ? '#52c41a' : '#667eea'}
                        />
                        <Button 
                          icon={<ExperimentOutlined />} 
                          onClick={() => setAnalysisVisible(true)} 
                          type="primary" 
                          ghost
                        >
                          Voir analyse
                        </Button>
                      </Space>
                    </div>
                    <Row gutter={[16, 16]}>
                      {photos.map((photo, index) => (
                        <Col key={index} xs={24} sm={12} md={8} lg={6}>
                          <Card 
                            hoverable 
                            cover={
                              <div style={{ position: 'relative' }}>
                                <img src={photo.image_url} style={{ height: 180, objectFit: 'cover' }} alt="doc" />
                                {photo.fraud_score > 70 && (
                                  <Tag color="error" style={{ position: 'absolute', top: 8, right: 8 }}>
                                    ⚠️ Fraude
                                  </Tag>
                                )}
                              </div>
                            }
                            actions={[
                              <EyeOutlined onClick={() => { setSelectedPhoto(photo); setPreviewVisible(true); }} style={{ color: '#8c8c8c' }} />,
                              <DeleteOutlined onClick={() => handleDeletePhoto(index)} style={{ color: '#ff4d4f' }} />
                            ]}
                            style={{ background: '#0a0a0f', border: '1px solid #2a2a3a' }}
                          >
                            <Card.Meta 
                              title={<span style={{ color: '#f1f5f9' }}>Estimation: {photo.estimated_cost}€</span>}
                              description={
                                <div>
                                  <Tag color={photo.fraud_score > 70 ? 'error' : photo.fraud_score > 40 ? 'warning' : 'success'}>
                                    Score fraude: {Math.round(photo.fraud_score)}%
                                  </Tag>
                                  {photo.detected_parts && photo.detected_parts.length > 0 && (
                                    <div style={{ marginTop: 4 }}>
                                      <Text style={{ color: '#8c8c8c', fontSize: 11 }}>
                                        {Array.isArray(photo.detected_parts) 
                                          ? photo.detected_parts.map(p => typeof p === 'string' ? p : p.part || p.class || p.name || 'Pièce').join(', ')
                                          : 'Aucune pièce détectée'
                                        }
                                      </Text>
                                    </div>
                                  )}
                                </div>
                              }
                            />
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </div>
                )}
              </Card>
              <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
                <Button size="large" onClick={() => setCurrentStep(0)} style={{ color: '#f1f5f9', borderColor: '#2a2a3a' }}>
                  Retour
                </Button>
                <Button 
                  type="primary" 
                  size="large" 
                  onClick={handleManualSubmit} 
                  loading={loading} 
                  icon={<SendOutlined />}
                >
                  Soumettre
                </Button>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && claimData && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <Result 
                status="success" 
                title={<span style={{ color: '#f1f5f9' }}>Déclaration enregistrée !</span>}
                subTitle={<span style={{ color: '#8c8c8c' }}>N° sinistre: {claimData.claim_number}</span>}
                extra={[
                  <Button 
                    type="primary" 
                    key="pdf" 
                    icon={<FilePdfOutlined />} 
                    onClick={generatePDFReport} 
                    loading={reportGenerating}
                    style={{ backgroundColor: '#ff4d4f' }}
                  >
                    Rapport PDF
                  </Button>,
                  <Button key="print" icon={<PrinterOutlined />} onClick={() => window.print()}>
                    Imprimer
                  </Button>,
                  <Button key="share" icon={<ShareAltOutlined />}>
                    Partager
                  </Button>
                ]}
              />
              <Card style={{ background: '#0a0a0f', border: '1px solid #2a2a3a' }}>
                <Title level={4} style={{ color: '#f1f5f9' }}>Récapitulatif</Title>
                <Descriptions bordered column={2}>
                  <Descriptions.Item label="N° Sinistre">
                    <strong style={{ color: '#f1f5f9' }}>{claimData.claim_number}</strong>
                  </Descriptions.Item>
                  <Descriptions.Item label="Type">
                    <Tag color={CLAIM_TYPES[selectedClaimType]?.color}>
                      {CLAIM_TYPES[selectedClaimType]?.name}
                    </Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Documents">
                    <span style={{ color: '#f1f5f9' }}>{photos.length}</span>
                  </Descriptions.Item>
                  <Descriptions.Item label="Estimation totale">
                    <strong style={{ color: '#52c41a', fontSize: 18 }}>{getEstimatedAmount()}€</strong>
                  </Descriptions.Item>
                  <Descriptions.Item label="Score fraude" span={2}>
                    <Progress 
                      percent={getFraudScore()} 
                      strokeColor={getFraudScore() > 70 ? '#ff4d4f' : '#52c41a'} 
                    />
                    <Text style={{ color: '#8c8c8c' }}>
                      {getFraudScore() > 70 ? "⚠️ Risque élevé" : getFraudScore() > 40 ? "⚠️ Risque modéré" : "✓ Aucune anomalie"}
                    </Text>
                  </Descriptions.Item>
                </Descriptions>
              </Card>
              <div style={{ textAlign: 'center', marginTop: 24 }}>
                <Button 
                  type="primary" 
                  size="large" 
                  icon={<HistoryOutlined />} 
                  onClick={() => window.location.reload()}
                >
                  Nouvelle déclaration
                </Button>
              </div>
            </motion.div>
          )}
        </Form>
      </Card>

      <Modal 
        open={previewVisible} 
        title={<span style={{ color: '#f1f5f9' }}>Détails analyse IA</span>} 
        footer={null} 
        onCancel={() => setPreviewVisible(false)} 
        width={800}
        styles={{ body: { background: '#14141e' }, header: { background: '#14141e', borderBottom: '1px solid #2a2a3a' } }}
      >
        {selectedPhoto && (
          <div>
            <Image src={selectedPhoto.image_url} style={{ width: '100%', borderRadius: 8 }} />
            <Divider style={{ borderColor: '#2a2a3a' }} />
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Gravité">
                <Progress percent={Math.min(selectedPhoto.damage_severity, 100)} size="small" strokeColor={selectedPhoto.damage_severity > 70 ? '#ff4d4f' : '#52c41a'} />
              </Descriptions.Item>
              <Descriptions.Item label="Estimation">
                <Text strong style={{ fontSize: 18, color: '#52c41a' }}>{selectedPhoto.estimated_cost}€</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Score fraude" span={2}>
                <Progress 
                  percent={selectedPhoto.fraud_score} 
                  strokeColor={selectedPhoto.fraud_score > 70 ? '#ff4d4f' : '#52c41a'} 
                />
                {selectedPhoto.fraud_score > 70 && (
                  <Alert message="⚠️ Suspicion de fraude" type="error" showIcon style={{ marginTop: 8, background: 'rgba(255, 77, 79, 0.1)', borderColor: '#ff4d4f' }} />
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Éléments détectés" span={2}>
                <Space wrap>
                  {selectedPhoto.detected_parts && Array.isArray(selectedPhoto.detected_parts) ? (
                    selectedPhoto.detected_parts.map((part, idx) => {
                      const partName = typeof part === 'string' ? part : (part.part || part.class || part.name || 'Pièce');
                      return <Tag key={idx} color="blue">{partName}</Tag>;
                    })
                  ) : (
                    <Text style={{ color: '#8c8c8c' }}>Aucun élément détecté</Text>
                  )}
                </Space>
              </Descriptions.Item>
              <Descriptions.Item label="Description IA" span={2}>
                <span style={{ color: '#f1f5f9' }}>{selectedPhoto.analysis?.description || selectedPhoto.description}</span>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ClaimDeclaration;