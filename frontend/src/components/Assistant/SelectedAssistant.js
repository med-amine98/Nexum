import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloseOutlined,
  SendOutlined,
  RobotOutlined,
  UserOutlined,
  MinusOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  RiseOutlined
} from '@ant-design/icons';
import { Card, Avatar, Button, Input, Space, Tag, Badge, Tooltip, Typography } from 'antd';
import { useAssistant } from '../../context/AssistantContext'; // ← Chemin corrigé (2 niveaux)
import './Assistant.css'; // ← Fichier CSS local

const { Text } = Typography;

// Données des assistants
const assistantsData = {
  'assistant-predict': {
    id: 'assistant-predict',
    name: 'Nexy Predict',
    color: '#1890ff',
    icon: <BankOutlined />,
    shortName: 'Predict',
    suggestions: [
      'Analyser un dossier de crédit',
      'Détecter des fraudes potentielles',
      'Prévoir la trésorerie',
      'Conseils d\'investissement'
    ]
  },
  'assistant-risk': {
    id: 'assistant-risk',
    name: 'Nexy Risk',
    color: '#52c41a',
    icon: <SafetyCertificateOutlined />,
    shortName: 'Risk',
    suggestions: [
      'Traiter un sinistre',
      'Évaluer un risque client',
      'Modéliser une catastrophe',
      'Optimiser les primes'
    ]
  },
  'assistant-growth': {
    id: 'assistant-growth',
    name: 'Nexy Growth',
    color: '#722ed1',
    icon: <RiseOutlined />,
    shortName: 'Growth',
    suggestions: [
      'Analyser les ventes',
      'Prédire l\'attrition',
      'Recommandations cross-selling',
      'Optimiser le pipeline'
    ]
  }
};

// Fonctions de réponse par assistant
const getBotResponse = (type, message) => {
  const lowerMsg = message.toLowerCase();
  
  if (type === 'assistant-predict') {
    if (lowerMsg.includes('crédit') || lowerMsg.includes('credit')) {
      return "📊 **Analyse de crédit** : D'après mes modèles prédictifs, un scoring optimal nécessite l'analyse de 5 facteurs clés : historique de paiement (35%), niveau d'endettement (30%), ancienneté des comptes (15%), type de crédits (10%), et demandes récentes (10%).";
    }
    if (lowerMsg.includes('fraude')) {
      return "🚨 **Détection de fraude** : Mes algorithmes analysent en temps réel les transactions suspectes. J'ai détecté 3 patterns de fraude courants dans votre secteur.";
    }
    if (lowerMsg.includes('trésorerie') || lowerMsg.includes('cashflow')) {
      return "💰 **Prévision de trésorerie** : Sur la base de vos données, je prévois une tension de trésorerie de -15% au prochain trimestre. Je vous suggère de mettre en place une ligne de crédit préventive.";
    }
  }
  
  else if (type === 'assistant-risk') {
    if (lowerMsg.includes('sinistre')) {
      return "📋 **Traitement de sinistre** : J'ai analysé votre dossier. La probabilité de fraude est faible (2.3%). Le montant estimé est de 12 500€.";
    }
    if (lowerMsg.includes('risque') || lowerMsg.includes('scoring')) {
      return "⚠️ **Scoring des risques** : Le nouveau client présente un profil de risque modéré (score: 67/100). Je recommande une prime majorée de 15%.";
    }
    if (lowerMsg.includes('catastrophe')) {
      return "🌪️ **Modélisation catastrophe** : Mes modèles prédisent une augmentation de 23% des risques d'intempéries dans votre région.";
    }
  }
  
  else if (type === 'assistant-growth') {
    if (lowerMsg.includes('vente')) {
      return "📈 **Analyse des ventes** : Vos ventes sont en hausse de 12% ce mois-ci. Je détecte une opportunité de cross-selling sur 45 clients.";
    }
    if (lowerMsg.includes('attrition') || lowerMsg.includes('fidélisation')) {
      return "🎯 **Prédiction d'attrition** : 15 clients avec un CA > 100k€ présentent un risque d'attrition de 34% dans les 3 mois.";
    }
    if (lowerMsg.includes('pipeline')) {
      return "🔄 **Optimisation du pipeline** : 23 opportunités sont bloquées en phase de négociation. Je recommande une relance automatique.";
    }
  }
  
  return "Merci pour votre question ! 🤖 Je vais analyser cela avec mes capacités prédictives. Pour une réponse plus précise, pourriez-vous me donner plus de détails ?";
};

const SelectedAssistant = () => {
  // Tous les Hooks doivent être appelés au début, sans condition

  
  // Hooks d'état
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const messagesEndRef = useRef(null);
  
  // Hook de contexte
  const assistantContext = useAssistant();

  
  const { selectedAssistant, assistantEnabled, toggleAssistant, disableAssistant } = assistantContext;
  



  // Récupérer les données de l'assistant si sélectionné
  const assistant = selectedAssistant ? assistantsData[selectedAssistant.key] : null;

  // Effets
  useEffect(() => {
    if (assistant && messages.length === 0) {
      setMessages([
        { 
          id: 1, 
          type: 'bot', 
          text: `Bonjour ! Je suis ${assistant.name}, votre assistant personnel. Comment puis-je vous aider aujourd'hui ?`,
          time: new Date().toLocaleTimeString()
        }
      ]);
    }
  }, [assistant, messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fonctions de gestion
  const handleSendMessage = () => {
    if (!newMessage.trim() || !assistant) return;
    
    const userMsg = {
      id: messages.length + 1,
      type: 'user',
      text: newMessage,
      time: new Date().toLocaleTimeString()
    };
    setMessages([...messages, userMsg]);
    setNewMessage('');
    setIsTyping(true);
    
    setTimeout(() => {
      const botResponse = {
        id: messages.length + 2,
        type: 'bot',
        text: getBotResponse(assistant.id, userMsg.text),
        time: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, botResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSuggestionClick = (suggestion) => {
    setNewMessage(suggestion);
  };

  const clearConversation = () => {
    if (!assistant) return;
    setMessages([
      { 
        id: 1, 
        type: 'bot', 
        text: `Bonjour ! Je suis ${assistant.name}, votre assistant personnel. Comment puis-je vous aider aujourd'hui ?`,
        time: new Date().toLocaleTimeString()
      }
    ]);
  };

  // Rendu conditionnel APRÈS tous les Hooks
  if (!assistantEnabled || !selectedAssistant || !assistant) {

    return null;
  }



  return (
    <div className="assistant-floating-container">
      <AnimatePresence>
        {!isMinimized ? (
          <motion.div
            key="chat"
            initial={{ scale: 0.5, opacity: 0, y: 100 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.5, opacity: 0, y: 100 }}
            transition={{ type: 'spring', stiffness: 100 }}
            className="assistant-floating-window"
          >
            <Card
              className="assistant-floating-card"
              style={{
                borderTop: `4px solid ${assistant.color}`,
                boxShadow: `0 10px 40px ${assistant.color}40`,
              }}
              title={
                <div className="assistant-header">
                  <div className="assistant-header-left">
                    <Avatar 
                      icon={assistant.icon}
                      size={40}
                      style={{ backgroundColor: assistant.color }}
                    />
                    <div>
                      <div className="assistant-name">{assistant.name}</div>
                      <div className="assistant-status">
                        <Badge status="processing" color={assistant.color} text="En ligne" />
                      </div>
                    </div>
                  </div>
                  <div className="assistant-header-actions">
                    <Tooltip title="Réduire">
                      <Button 
                        type="text" 
                        icon={<MinusOutlined />} 
                        onClick={() => setIsMinimized(true)}
                        size="small"
                      />
                    </Tooltip>
                    <Tooltip title="Fermer">
                      <Button 
                        type="text" 
                        icon={<CloseOutlined />} 
                        onClick={disableAssistant}
                        size="small"
                      />
                    </Tooltip>
                  </div>
                </div>
              }
              extra={null}
            >
              {/* Messages */}
              <div className="assistant-messages">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`message ${msg.type === 'user' ? 'user-message' : 'bot-message'}`}
                  >
                    {msg.type === 'bot' && (
                      <Avatar icon={<RobotOutlined />} size={28} style={{ backgroundColor: assistant.color }} />
                    )}
                    <div className="message-bubble">
                      <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                      <div className="message-time">{msg.time}</div>
                    </div>
                    {msg.type === 'user' && (
                      <Avatar icon={<UserOutlined />} size={28} style={{ backgroundColor: '#C850C0' }} />
                    )}
                  </div>
                ))}
                
                {isTyping && (
                  <div className="typing-indicator">
                    <Avatar icon={<RobotOutlined />} size={28} style={{ backgroundColor: assistant.color }} />
                    <div className="typing-bubble">
                      <span></span><span></span><span></span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions */}
              <div className="assistant-suggestions">
                <Text type="secondary" style={{ fontSize: 11 }}>Suggestions :</Text>
                <Space wrap size={[4, 4]} style={{ marginTop: 4 }}>
                  {assistant.suggestions.map((sugg, idx) => (
                    <Tag
                      key={idx}
                      color={assistant.color}
                      style={{ cursor: 'pointer', fontSize: 11 }}
                      onClick={() => handleSuggestionClick(sugg)}
                    >
                      {sugg}
                    </Tag>
                  ))}
                </Space>
              </div>

              {/* Input */}
              <div className="assistant-input">
                <Input
                  placeholder="Posez votre question..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onPressEnter={handleSendMessage}
                  size="middle"
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSendMessage}
                  style={{ backgroundColor: assistant.color, borderColor: assistant.color }}
                />
              </div>

              {/* Footer */}
              <div className="assistant-footer">
                <Button type="link" size="small" onClick={clearConversation}>
                  Nouvelle conversation
                </Button>
              </div>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key="minimized"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="assistant-minimized"
            style={{ backgroundColor: assistant.color }}
            onClick={() => setIsMinimized(false)}
          >
            <Tooltip title={`Ouvrir ${assistant.shortName}`}>
              <Avatar 
                icon={assistant.icon} 
                size={50} 
                style={{ 
                  backgroundColor: 'white', 
                  color: assistant.color,
                  cursor: 'pointer',
                  boxShadow: `0 5px 15px ${assistant.color}80`
                }} 
              />
            </Tooltip>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SelectedAssistant;