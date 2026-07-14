// components/Assistant/VoiceActivatedAssistant.js
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  RobotOutlined, 
  CloseOutlined,
  SendOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  RiseOutlined,
  ThunderboltOutlined,
  AudioOutlined,
  AudioMutedOutlined,
  SoundOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { Input, Button, Tag, Space, Typography, Avatar, message } from 'antd';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';
import DraggableBubble from '../DraggableBubble';
import api from '../../services/api';
import './VoiceActivatedAssistant.css';

const { Text, Paragraph } = Typography;

const VoiceActivatedAssistant = ({ type, color, name, icon, initialPosition }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  const [voiceActivated, setVoiceActivated] = useState(false);
  
  const inputRef = useRef(null);
  const { isListening, transcript, error, startListening, stopListening } = useVoiceAssistant();

  // Mots de réveil pour chaque assistant
  const wakeWords = {
    predict: ['nexy predict', 'nexypredict', 'predict', 'prédict'],
    risk: ['nexy risk', 'nexyrusk', 'risk', 'risque'],
    growth: ['nexy growth', 'nexygrow', 'growth', 'croissance']
  };

  // Vérifier si le mot de réveil est détecté
  useEffect(() => {
    if (transcript) {
      const lowerTranscript = transcript.toLowerCase();
      const words = wakeWords[type] || [];
      
      const detected = words.some(word => lowerTranscript.includes(word));
      
      if (detected && !isOpen) {
        setWakeWordDetected(true);
        setIsOpen(true);
        setVoiceActivated(true);
        
        // Réponse vocale
        speak(`Bonjour ! Je suis ${name}. Comment puis-je vous aider ?`);
        
        // Effacer le message après 3 secondes
        setTimeout(() => setWakeWordDetected(false), 3000);
      }
    }
  }, [transcript, type, name, isOpen]);

  // Synthèse vocale
  const speak = (text) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.9;
      utterance.pitch = 1;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Suggestions basées sur le type d'assistant
  const getSuggestions = () => {
    switch(type) {
      case 'predict':
        return [
          'Quel est le score de crédit ?',
          'Détecte des fraudes',
          'Prévisions de ventes',
          'Analyse les tendances'
        ];
      case 'risk':
        return [
          'Évalue ce sinistre',
          'Clients à risque',
          'Vérifie la conformité',
          'Scoring des risques'
        ];
      case 'growth':
        return [
          'Analyse mes ventes',
          'Attrition clients',
          'Opportunités',
          'Optimise pipeline'
        ];
      default:
        return ['Aide-moi', 'Que peux-tu faire ?'];
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSuggestions(getSuggestions());
      setTimeout(() => inputRef.current?.focus(), 300);
    } else {
      setQuestion('');
      setResponse(null);
      setVoiceActivated(false);
    }
  }, [isOpen, type]);

  // Utiliser la transcription vocale comme question
  useEffect(() => {
    if (voiceActivated && transcript && !question) {
      // Enlever le mot de réveil de la transcription
      const words = wakeWords[type] || [];
      let cleanTranscript = transcript;
      
      words.forEach(word => {
        cleanTranscript = cleanTranscript.replace(new RegExp(word, 'gi'), '');
      });
      
      cleanTranscript = cleanTranscript.trim();
      
      if (cleanTranscript) {
        setQuestion(cleanTranscript);
        // Envoyer automatiquement après un court délai
        setTimeout(() => handleQuestion(), 1000);
      }
    }
  }, [transcript, voiceActivated]);

  const handleQuestion = async () => {
    if (!question.trim()) return;
    setIsLoading(true);

    try {
      const response = await api.post('/assistants/chat', {
        agent_name: type,
        query: question,
        context: {}
      });
      
      const data = response.data;
      
      setResponse({
        title: `📊 Analyse ${name}`,
        content: data.response,
        details: data.interconnected_insights?.map(agent => `• Insight de ${agent}`) || [],
        recommendation: data.confidence > 0.9 ? "✅ Analyse de haute précision" : "💬 Conseil stratégique expert",
        confidence: Math.round(data.confidence * 100) || 85,
        actions: data.actions || []
      });
      
      // Réponse vocale
      speak(data.response);
    } catch (error) {
      console.error('Erreur assistant:', error);
      message.error("Erreur lors de la communication avec l'assistant");
      setResponse({
        title: "❌ Erreur",
        content: "Désolé, je rencontre une difficulté technique.",
        details: ["Veuillez réessayer dans un instant"],
        recommendation: "Le système est en cours de synchronisation",
        confidence: 0
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAIResponse = (type, question) => {
    const lowerQ = question.toLowerCase();
    
    const responses = {
      predict: {
        credit: {
          title: "📊 Analyse de crédit",
          content: "Score calculé : **87/100** (Excellent)",
          details: [
            "• Historique de paiement: Parfait",
            "• Capacité de remboursement: 4.2x",
            "• Stabilité: 8 ans"
          ],
          recommendation: "✅ Approbation recommandée",
          confidence: 94
        },
        fraude: {
          title: "🚨 Détection de fraude",
          content: "3 transactions suspectes détectées",
          details: [
            "• Transaction #2389: 12 500€ - Risque 89%",
            "• Transaction #2390: 8 300€ - Risque 76%",
            "• Transaction #2391: 3 200€ - Risque 92%"
          ],
          recommendation: "⚠️ Action immédiate requise",
          confidence: 97
        },
        prevision: {
          title: "📈 Prévisions financières",
          content: "Projections pour le prochain trimestre",
          details: [
            "• Croissance ventes: +15.3%",
            "• Trésorerie: +8.7%",
            "• Nouveaux clients: +22%"
          ],
          recommendation: "📊 Confiance: 94%",
          confidence: 94
        }
      },
      risk: {
        sinistre: {
          title: "📋 Évaluation de sinistre",
          content: "Analyse du dossier #SIN-2025-123",
          details: [
            "• Montant estimé: 12 500€",
            "• Risque de fraude: 2.3%",
            "• Délai: 48h"
          ],
          recommendation: "✅ Approbation recommandée",
          confidence: 96
        },
        risque: {
          title: "⚠️ Scoring des risques",
          content: "Répartition des risques clients",
          details: [
            "• Risque élevé: 12 clients",
            "• Risque moyen: 45 clients",
            "• Risque faible: 93 clients"
          ],
          recommendation: "📊 Voir la liste détaillée",
          confidence: 95
        }
      },
      growth: {
        vente: {
          title: "📈 Analyse des ventes",
          content: "Performance du mois en cours",
          details: [
            "• Chiffre d'affaires: +15.3%",
            "• Transactions: +22%",
            "• Panier moyen: +8%"
          ],
          recommendation: "🎯 Top secteur: Banque (+28%)",
          confidence: 93
        },
        attrition: {
          title: "🎯 Prédiction d'attrition",
          content: "3 clients à risque détectés",
          details: [
            "• Client A: Probabilité 89% ⚠️",
            "• Client B: Probabilité 76% ⚠️",
            "• Client C: Probabilité 68% ⚠️"
          ],
          recommendation: "💡 Offre de fidélisation",
          confidence: 91
        }
      }
    };

    for (const [key, value] of Object.entries(responses[type] || {})) {
      if (lowerQ.includes(key)) {
        return value;
      }
    }

    return {
      title: "🤖 Assistant",
      content: "J'ai bien reçu votre question",
      details: [
        "Je peux vous aider avec :",
        "• Analyses et prédictions",
        "• Gestion des risques",
        "• Stratégies de croissance"
      ],
      recommendation: "💬 Posez une question plus spécifique",
      confidence: 100
    };
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuestion();
    }
  };

  const handleVoiceInput = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
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
        icon={icon || <ThunderboltOutlined />}
        color={color}
        tooltip={`Ouvrir ${name}`}
        onClick={() => setIsOpen(true)}
        initialPosition={initialPosition}
        size={55}
      />

      {/* Notification de réveil vocal */}
      <AnimatePresence>
        {wakeWordDetected && (
          <motion.div
            className="wake-notification"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{
              position: 'fixed',
              top: '100px',
              right: '30px',
              background: color,
              color: 'white',
              padding: '12px 24px',
              borderRadius: '50px',
              boxShadow: '0 5px 20px rgba(0,0,0,0.2)',
              zIndex: 10001
            }}
          >
            <Space>
              <CheckCircleOutlined />
              <span>Assistant activé !</span>
            </Space>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="assistant-response-card"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              position: 'fixed',
              ...initialPosition,
              width: '400px',
              zIndex: 10000,
              background: 'white',
              borderRadius: '24px',
              boxShadow: '0 30px 60px rgba(0,0,0,0.3)',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div className="assistant-header" style={{ background: color }}>
              <Space>
                <Avatar icon={getAssistantIcon()} style={{ background: 'white', color }} />
                <div>
                  <Text strong style={{ color: 'white', fontSize: 16 }}>{name}</Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Tag color="white" style={{ color, border: 'none' }}>En ligne</Tag>
                    {isListening && (
                      <Tag color="white" style={{ color: '#52c41a', border: 'none' }}>
                        <AudioOutlined /> Écoute...
                      </Tag>
                    )}
                  </div>
                </div>
              </Space>
              <Button 
                type="text" 
                icon={<CloseOutlined style={{ color: 'white' }} />}
                onClick={() => setIsOpen(false)}
                size="small"
              />
            </div>

            {/* Zone de question */}
            <div className="assistant-question-area">
              <div style={{ position: 'relative' }}>
                <Input.TextArea
                  ref={inputRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isListening ? "J'écoute..." : "Posez votre question..."}
                  autoSize={{ minRows: 2, maxRows: 4 }}
                  style={{
                    borderRadius: '16px',
                    border: `1px solid ${color}40`,
                    padding: '12px 80px 12px 12px',
                    fontSize: '14px',
                    background: isListening ? `${color}10` : 'white'
                  }}
                />
                <Space className="input-actions" style={{ position: 'absolute', right: 8, bottom: 8 }}>
                  <Tooltip title={isListening ? 'Arrêter' : 'Commande vocale'}>
                    <Button
                      type="text"
                      icon={isListening ? <AudioMutedOutlined style={{ color }} /> : <AudioOutlined style={{ color }} />}
                      onClick={handleVoiceInput}
                      size="small"
                    />
                  </Tooltip>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleQuestion}
                    loading={isLoading}
                    size="small"
                    style={{ background: color, border: 'none' }}
                  />
                </Space>
              </div>

              {error && (
                <Text type="danger" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
                  {error}
                </Text>
              )}
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && !response && (
              <div className="assistant-suggestions">
                <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                  Suggestions :
                </Text>
                <Space wrap size={[4, 4]}>
                  {suggestions.map((sugg, idx) => (
                    <Tag
                      key={idx}
                      style={{ 
                        cursor: 'pointer',
                        background: `${color}10`,
                        borderColor: color,
                        color: color,
                        padding: '6px 14px',
                        borderRadius: '25px',
                        fontSize: 13
                      }}
                      onClick={() => setQuestion(sugg)}
                    >
                      {sugg}
                    </Tag>
                  ))}
                </Space>
              </div>
            )}

            {/* Réponse */}
            {response && (
              <motion.div
                className="assistant-response"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="response-header">
                  <Avatar icon={getAssistantIcon()} size={32} style={{ background: color, color: 'white' }} />
                  <div style={{ flex: 1 }}>
                    <Text strong style={{ fontSize: 16 }}>{response.title}</Text>
                  </div>
                  <Tag color={color} style={{ borderRadius: '20px' }}>
                    {response.confidence}% confiance
                  </Tag>
                </div>

                <Paragraph style={{ fontSize: 15, margin: '16px 0' }}>
                  {response.content}
                </Paragraph>

                <div className="response-details">
                  {response.details.map((detail, idx) => (
                    <div key={idx} className="detail-item">
                      {detail}
                    </div>
                  ))}
                </div>

                <div className="response-recommendation" style={{ borderTopColor: color }}>
                  <Text>{response.recommendation}</Text>
                  <SoundOutlined style={{ marginLeft: 8, color }} />
                </div>

                <Button 
                  type="link" 
                  style={{ color, marginTop: 12 }}
                  onClick={() => setResponse(null)}
                >
                  Poser une autre question
                </Button>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default VoiceActivatedAssistant;