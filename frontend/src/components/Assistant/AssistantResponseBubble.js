// components/Assistant/AssistantResponseBubble.js
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RobotOutlined, 
  CloseOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  RiseOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  SoundOutlined
} from '@ant-design/icons';
import { Tag, Space, Typography, Avatar, Tooltip,Button } from 'antd';
import DraggableBubble from '../DraggableBubble';
import './AssistantResponseBubble.css';

const { Text, Paragraph } = Typography;

const AssistantResponseBubble = ({ 
  type, 
  color, 
  name, 
  icon, 
  initialPosition,
  onResponse 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // Suggestions basées sur le contexte
  const getSuggestions = () => {
    switch(type) {
      case 'predict':
        return [
          'Score de crédit',
          'Détection fraude',
          'Prévisions ventes'
        ];
      case 'risk':
        return [
          'Évaluer sinistre',
          'Clients à risque',
          'Conformité'
        ];
      case 'growth':
        return [
          'Analyse ventes',
          'Attrition clients',
          'Opportunités'
        ];
      default:
        return ['Aide', 'Info'];
    }
  };

  useEffect(() => {
    setSuggestions(getSuggestions());
  }, [type]);

  // Simuler une question rapide
  const askQuickQuestion = (query) => {
    setQuestion(query);
    setIsLoading(true);
    setShowResponse(false);

    // Simuler une réponse
    setTimeout(() => {
      const answer = getAIResponse(type, query);
      setResponse(answer);
      setIsLoading(false);
      setShowResponse(true);
      
      // Appeler le callback si fourni
      if (onResponse) onResponse(answer);
    }, 1000);
  };

  // Obtenir la réponse de l'IA
  const getAIResponse = (type, query) => {
    const lowerQ = query.toLowerCase();
    
    const responses = {
      predict: {
        credit: {
          title: "📊 Score de crédit",
          content: "**87/100** - Excellent",
          details: ["Historique: Parfait", "Capacité: 4.2x", "Stabilité: 8 ans"],
          recommendation: "✅ Approbation recommandée",
          confidence: 94
        },
        fraude: {
          title: "🚨 Détection de fraude",
          content: "**3 transactions** suspectes",
          details: ["12 500€ - Risque 89%", "8 300€ - Risque 76%", "3 200€ - Risque 92%"],
          recommendation: "⚠️ Action requise",
          confidence: 97
        },
        prevision: {
          title: "📈 Prévisions",
          content: "**+15.3%** de croissance",
          details: ["Ventes: +15.3%", "Trésorerie: +8.7%", "Clients: +22%"],
          recommendation: "📊 Confiance: 94%",
          confidence: 94
        }
      },
      risk: {
        sinistre: {
          title: "📋 Évaluation sinistre",
          content: "**12 500€** estimés",
          details: ["Risque fraude: 2.3%", "Délai: 48h", "Priorité: Haute"],
          recommendation: "✅ Approbation",
          confidence: 96
        },
        risque: {
          title: "⚠️ Clients à risque",
          content: "**12 clients** à risque élevé",
          details: ["Risque élevé: 12", "Risque moyen: 45", "Risque faible: 93"],
          recommendation: "📊 Voir la liste",
          confidence: 95
        }
      },
      growth: {
        vente: {
          title: "📈 Analyse ventes",
          content: "**+15.3%** ce mois",
          details: ["Transactions: +22%", "Panier moyen: +8%", "Top secteur: Banque"],
          recommendation: "🎯 Performance excellente",
          confidence: 93
        },
        attrition: {
          title: "🎯 Attrition clients",
          content: "**3 clients** à risque",
          details: ["Client A: 89%", "Client B: 76%", "Client C: 68%"],
          recommendation: "💡 Offre de fidélisation",
          confidence: 91
        }
      }
    };

    // Rechercher une réponse appropriée
    for (const [key, value] of Object.entries(responses[type] || {})) {
      if (lowerQ.includes(key)) {
        return value;
      }
    }

    // Réponse par défaut
    return {
      title: "🤖 Assistant",
      content: "Comment puis-je vous aider ?",
      details: ["Analyses", "Prédictions", "Conseils"],
      recommendation: "Posez votre question",
      confidence: 100
    };
  };

  const getAssistantIcon = () => {
    switch(type) {
      case 'predict': return <BankOutlined />;
      case 'risk': return <SafetyCertificateOutlined />;
      case 'growth': return <RiseOutlined />;
      default: return <RobotOutlined />;
    }
  };

  return (
    <>
      <DraggableBubble
        icon={<ThunderboltOutlined />}
        color="transparent"
        tooltip={name}
        onClick={() => setIsOpen(!isOpen)}
        initialPosition={initialPosition}
        size={55}
        customContent={
          <div 
            className={`assistant-bubble ${type}`}
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: `radial-gradient(circle at 30% 30%, ${color}, ${color}dd)`,
              boxShadow: `0 5px 20px ${color}80`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.3s ease',
              position: 'relative'
            }}
          >
            <div className="bubble-core">
              {icon || getAssistantIcon()}
            </div>
            
            {/* Indicateur de réponse */}
            {showResponse && (
              <div className="response-indicator" style={{
                position: 'absolute',
                top: -5,
                right: -5,
                width: 12,
                height: 12,
                background: '#52c41a',
                borderRadius: '50%',
                border: '2px solid white',
                animation: 'pulse 2s infinite'
              }} />
            )}
          </div>
        }
      />

      {/* Bulle de réponse */}
      <AnimatePresence>
        {showResponse && response && (
          <motion.div
            className="response-bubble"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            style={{
              position: 'fixed',
              ...initialPosition,
              bottom: (initialPosition?.bottom || 0) + 70,
              right: initialPosition?.right || 30,
              width: 320,
              background: 'white',
              borderRadius: '16px',
              boxShadow: `0 15px 35px ${color}40`,
              zIndex: 10000,
              overflow: 'hidden',
              border: `1px solid ${color}30`
            }}
          >
            {/* En-tête */}
            <div className="response-header" style={{
              background: `linear-gradient(135deg, ${color}, ${color}dd)`,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12
            }}>
              <Avatar icon={getAssistantIcon()} style={{ background: 'white', color }} />
              <div style={{ flex: 1 }}>
                <Text strong style={{ color: 'white', fontSize: 14 }}>{name}</Text>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag color="white" style={{ color, border: 'none' }}>
                    Confiance {response.confidence}%
                  </Tag>
                </div>
              </div>
              <Tooltip title="Fermer">
                <Button
                  type="text"
                  icon={<CloseOutlined style={{ color: 'white' }} />}
                  onClick={() => setShowResponse(false)}
                  size="small"
                />
              </Tooltip>
            </div>

            {/* Corps de la réponse */}
            <div style={{ padding: 16 }}>
              <div style={{ 
                background: '#f8f9fa', 
                borderRadius: 12, 
                padding: 12,
                marginBottom: 12
              }}>
                <Text strong style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
                  {response.title}
                </Text>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color }}>
                  {response.content}
                </Text>
              </div>

              <div style={{ marginBottom: 12 }}>
                {response.details.map((detail, idx) => (
                  <div key={idx} style={{
                    padding: '8px 12px',
                    borderBottom: idx < response.details.length - 1 ? '1px dashed #f0f0f0' : 'none',
                    fontSize: 14,
                    color: "var(--text-primary)"
                  }}>
                    {detail}
                  </div>
                ))}
              </div>

              <div style={{
                background: `${color}10`,
                padding: '10px 12px',
                borderRadius: 8,
                borderLeft: `3px solid ${color}`
              }}>
                <Text>{response.recommendation}</Text>
              </div>

              {/* Suggestions rapides */}
              <div style={{ marginTop: 12 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>Questions rapides :</Text>
                <Space wrap size={[4, 4]} style={{ marginTop: 8 }}>
                  {suggestions.map((sugg, idx) => (
                    <Tag
                      key={idx}
                      style={{
                        cursor: 'pointer',
                        background: `${color}10`,
                        borderColor: color,
                        color,
                        padding: '4px 10px',
                        borderRadius: 20
                      }}
                      onClick={() => askQuickQuestion(sugg)}
                    >
                      {sugg}
                    </Tag>
                  ))}
                </Space>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AssistantResponseBubble;