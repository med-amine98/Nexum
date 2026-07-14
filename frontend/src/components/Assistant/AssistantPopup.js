import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BankOutlined, 
  SafetyCertificateOutlined, 
  RiseOutlined,
  CloseOutlined,
  ArrowRightOutlined,
  RobotOutlined,
  DragOutlined
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './Assistant.css';

const assistants = [
  {
    id: 'predict',
    name: 'Nexy Predict',
    role: 'Expert Banque & Finance',
    color: '#1890ff',
    icon: <BankOutlined />,
    description: 'Scoring crédit, détection de fraude, prévisions financières',
    longDescription: 'Analyse la solvabilité et détecte les fraudes en temps réel avec une précision de 98%.',
    tags: ['IA', 'Prédictif', 'Finance'],
    path: '/assistant/predict'
  },
  {
    id: 'risk',
    name: 'Nexy Risk',
    role: 'Expert Assurance & Risques',
    color: '#52c41a',
    icon: <SafetyCertificateOutlined />,
    description: 'Traitement sinistres, scoring risques, modélisation catastrophe',
    longDescription: 'Évalue les risques et automatise le traitement des sinistres avec une précision de 95%.',
    tags: ['IA', 'Risques', 'Assurance'],
    path: '/assistant/risk'
  },
  {
    id: 'growth',
    name: 'Nexy Growth',
    role: 'Expert Commercial & Stratégie',
    color: '#722ed1',
    icon: <RiseOutlined />,
    description: 'Optimisation ventes, prédiction attrition, cross-selling',
    longDescription: 'Booste votre croissance commerciale avec des analyses prédictives avancées.',
    tags: ['IA', 'Ventes', 'CRM'],
    path: '/assistant/growth'
  }
];

const AssistantPopup = ({ onClose, onSelect }) => {
  const navigate = useNavigate();
  const popupRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const popupStartPos = useRef({ x: 0, y: 0 });

  // Gestion du drag
  const handleDragStart = (e) => {
    // Ne pas drag si on clique sur un bouton
    if (e.target.closest('.popup-close-btn') || 
        e.target.closest('.assistant-select-btn') ||
        e.target.closest('.popup-footer-link')) {
      return;
    }
    
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    popupStartPos.current = { ...position };
    
    // Changer le curseur
    document.body.style.cursor = 'grabbing';
    e.preventDefault();
  };

  const handleDragMove = (e) => {
    if (!isDragging) return;
    
    const dx = e.clientX - dragStartPos.current.x;
    const dy = e.clientY - dragStartPos.current.y;
    
    setPosition({
      x: popupStartPos.current.x + dx,
      y: popupStartPos.current.y + dy
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    document.body.style.cursor = 'default';
  };

  // Ajouter les écouteurs d'événements globaux pour le drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleDragMove);
      window.addEventListener('mouseup', handleDragEnd);
    }

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
    };
  }, [isDragging]);

  // Fermer le popup quand on clique à l'extérieur (seulement si on ne drag pas)
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDragging) return;
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, isDragging]);

  // Empêcher le scroll du body quand le popup est ouvert (mobile)
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleSelect = (assistant) => {
    onSelect(assistant);
    onClose();
    navigate(assistant.path);
  };

  return (
    <motion.div
      ref={popupRef}
      className={`assistant-popup-modern ${isDragging ? 'dragging' : ''}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ 
        opacity: 1, 
        y: 0, 
        scale: 1,
        x: position.x,
        y: position.y
      }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ 
        type: 'spring', 
        stiffness: 300, 
        damping: 25,
        x: { duration: 0 },
        y: { duration: 0 }
      }}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflowY: 'auto',
        zIndex: 10000,
        boxShadow: isDragging 
          ? '0 35px 70px rgba(0, 0, 0, 0.4)' 
          : '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleDragStart}
    >
      {/* Handle de drag (optionnel) */}
      <div className="drag-handle">
        <DragOutlined /> Déplacer
      </div>

      {/* Header */}
      <div className="popup-header-modern">
        <div className="popup-header-content">
          <div className="popup-header-icon">
            <RobotOutlined />
          </div>
          <div className="popup-header-text">
            <h2>Choisissez votre assistant</h2>
            <p>3 assistants IA spécialisés</p>
          </div>
          <button className="popup-close-btn" onClick={onClose}>
            <CloseOutlined />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="popup-body" style={{ padding: '16px' }}>
        {assistants.map((assistant) => (
          <motion.div
            key={assistant.id}
            className="assistant-card-modern"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelect(assistant)}
            style={{ cursor: 'pointer', marginBottom: '12px' }}
          >
            <div 
              className="assistant-card-avatar"
              style={{ background: `linear-gradient(135deg, ${assistant.color}, ${assistant.color}dd)` }}
            >
              {assistant.icon}
            </div>
            <div className="assistant-card-info">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <h3>{assistant.name}</h3>
                <span className="assistant-card-badge">{assistant.role}</span>
              </div>
              <p className="assistant-card-description">{assistant.longDescription}</p>
              <div className="assistant-card-footer">
                <div className="assistant-tags">
                  {assistant.tags.map((tag, idx) => (
                    <span key={idx} className="assistant-tag">{tag}</span>
                  ))}
                </div>
                <motion.button 
                  className="assistant-select-btn"
                  style={{ background: assistant.color }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(assistant);
                  }}
                >
                  Choisir <ArrowRightOutlined style={{ marginLeft: 4, fontSize: 10 }} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Footer */}
      <div className="popup-footer">
        <span className="popup-footer-text">
          Assistants propulsés par l'IA
        </span>
        <motion.span 
          className="popup-footer-link" 
          onClick={onClose}
          whileHover={{ x: 5 }}
          style={{ cursor: 'pointer' }}
        >
          Plus tard →
        </motion.span>
      </div>
    </motion.div>
  );
};

export default AssistantPopup;