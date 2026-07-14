// CopilotBubble.js - Version avec 6 assistants (Risk, Growth, Predict, Compliance, Operations, Analytics)
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CloseOutlined,
  SendOutlined,
  AudioOutlined,
  AudioMutedOutlined,
  CheckCircleOutlined,
  StarOutlined,
  BulbOutlined,
  LoadingOutlined,
  LikeOutlined,
  DislikeOutlined,
  SmileOutlined,
  EditOutlined,
  SaveOutlined,
  SecurityScanOutlined,
  RiseOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import { Space, Button, Input, Tag, Typography, message, Badge } from 'antd';
import DraggableBubble from '../DraggableBubble';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';
import './Copilot.css';
import api from '../../services/api';

const { Text } = Typography;

// ========== COMPOSANT VIDEO ASSISTANT AVEC RAG ET ENSEIGNEMENT ==========
const VideoAssistantPopup = ({ assistant, isOpen, onClose, position, onMouseDown, isDragging, onMessageFromCopilot }) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [lastQuestion, setLastQuestion] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [showTeachInput, setShowTeachInput] = useState(false);
  const [teachAnswer, setTeachAnswer] = useState('');
  const [isTeaching, setIsTeaching] = useState(false);
  const videoRef = useRef(null);
  const chatEndRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const popupRef = useRef(null);
  const recognitionRef = useRef(null);

  // Configuration des 6 assistants
  const assistantsConfig = {
    risk: {
      name: 'Sophie Laurent',
      title: 'Risk Management Director',
      video: '/video/Risk.mp4',
      color: '#ef4444',
      quote: 'Un risque bien identifié est un risque à moitié maîtrisé.',
      greeting: 'Bonjour, je suis Sophie Laurent, directrice de la gestion des risques. Comment puis-je vous aider à sécuriser vos activités ?',
      voiceGender: 'female',
      icon: <SecurityScanOutlined />
    },
    growth: {
      name: 'Elena Petrova',
      title: 'Business Growth Strategist',
      video: '/video/growth.mp4',
      color: '#10b981',
      quote: 'La croissance n\'est pas un hasard, c\'est une stratégie.',
      greeting: 'Bonjour, je suis Elena Petrova. Je suis là pour vous aider à développer votre activité et saisir de nouvelles opportunités.',
      voiceGender: 'female',
      icon: <RiseOutlined />
    },
    predict: {
      name: 'James O\'Connor',
      title: 'Lead Data Scientist',
      video: '/video/predict.mp4',
      color: '#3b82f6',
      quote: 'Les données ne mentent jamais, il faut juste savoir les interpréter.',
      greeting: 'Bonjour, je suis James O\'Connor. Je transforme vos données en prédictions précises pour éclairer vos décisions.',
      voiceGender: 'male',
      icon: <BulbOutlined />
    },
    compliance: {
      name: 'Risk',
      title: 'Compliance & AML Officer',
      video: '/video/compliance.mp4',
      color: '#8b5cf6',
      quote: 'La conformité n\'est pas une contrainte, c\'est un avantage compétitif.',
      greeting: 'Bonjour, je suis Risk. Je vous aide à naviguer dans les régulations.',
      voiceGender: 'female',
      icon: <SafetyCertificateOutlined />
    },
    operations: {
      name: 'predict',
      title: 'Operations & Supply Chain Director',
      video: '/video/operations.mp4',
      color: '#f59e0b',
      quote: 'Une chaîne d\'approvisionnement optimisée est la clé de la performance.',
      greeting: 'Bonjour, je suis predict. Je vous accompagne pour optimiser vos opérations et votre supply chain.',
      voiceGender: 'male',
      icon: <ThunderboltOutlined />
    },
    analytics: {
      name: 'growth',
      title: 'Chief Data & Analytics Officer',
      video: '/video/analytics.mp4',
      color: '#ec4899',
      quote: 'La donnée est le nouveau pétrole, encore faut-il savoir la raffiner.',
      greeting: 'Bonjour, je suis growth. Je vous aide à extraire toute la valeur de vos données pour prendre de meilleures décisions.',
      voiceGender: 'female',
      icon: <LineChartOutlined />
    }
  };

  const config = assistantsConfig[assistant];

  // Appel API RAG unifié
  const queryRAG = async (query) => {
    try {
      const payload = {
        agent_name: assistant,
        query: query,
        context: {}
      };
      
      const response = await api.post(`/assistants/chat`, payload);
      return response.data;
    } catch (error) {
      console.error('Erreur API Assistant:', error);
      return {
        response: "Désolé, je rencontre une difficulté technique. Pouvez-vous reformuler ?",
        confidence: 0
      };
    }
  };

  // Enseigner la bonne réponse à l'assistant
  const teachAssistant = async () => {
    if (!teachAnswer.trim()) {
      message.warning("Veuillez entrer la bonne réponse");
      return;
    }
    
    setIsTeaching(true);
    try {
      await api.post(`/assistant/teach`, {
        assistant: assistant,
        question: lastQuestion,
        correct_answer: teachAnswer
      });
      
      message.success({
        content: "L'assistant a appris la bonne réponse !",
        icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />
      });
      
      setMessages(prev => [...prev, { 
        type: 'assistant', 
        text: `Merci pour votre enseignement !\n\nJ'ai appris que pour "${lastQuestion}", la bonne réponse est :\n\n"${teachAnswer}"\n\nJe m'en souviendrai pour la prochaine fois !`,
        isTeachingFeedback: true,
        timestamp: new Date() 
      }]);
      
      setShowTeachInput(false);
      setTeachAnswer('');
      setFeedbackGiven(true);
      
    } catch (error) {
      console.error('Erreur enseignement:', error);
      if (error.response?.status === 404) {
        message.error("L'API d'enseignement n'est pas encore disponible. Veuillez contacter l'administrateur.");
      } else {
        message.error("Erreur lors de l'enseignement");
      }
    } finally {
      setIsTeaching(false);
    }
  };

  // Envoyer le feedback simple
  const sendFeedback = async (score) => {
    setFeedbackGiven(true);
    setFeedbackRating(score);
    
    try {
      await api.post(`/assistant/learn-from-feedback`, {
        assistant: assistant,
        question: lastQuestion,
        answer: lastResponse,
        feedback_score: score
      });
      
      if (score >= 4) {
        message.success("🌟 Merci ! L'assistant a renforcé cette connaissance.");
      } else if (score <= 2) {
        setShowTeachInput(true);
        message.info("📝 Souhaitez-vous enseigner la bonne réponse ?");
      } else {
        message.success("👍 Merci pour votre feedback !");
      }
    } catch (error) {
      console.error('Erreur feedback:', error);
      if (score <= 2) {
        setShowTeachInput(true);
        message.info("📝 Enseignez la bonne réponse à l'assistant.");
      }
    }
  };

  // Initialiser la reconnaissance vocale
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'fr-FR';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setVoiceTranscript(transcript);
        setQuestion(transcript);
      };

      recognitionRef.current.onend = () => {
        setIsVoiceListening(false);
        if (voiceTranscript) {
          handleVoiceSubmit(voiceTranscript);
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Erreur reconnaissance vocale:', event.error);
        setIsVoiceListening(false);
        message.error("Je n'ai pas compris, veuillez réessayer");
      };
    } else {
      console.warn('Reconnaissance vocale non supportée');
    }
  }, []);

  const startVoiceInput = () => {
    if (recognitionRef.current) {
      setVoiceTranscript('');
      recognitionRef.current.start();
      setIsVoiceListening(true);
      message.info("🎤 Parlez maintenant...", 2);
    } else {
      message.error("Reconnaissance vocale non supportée par votre navigateur");
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsVoiceListening(false);
    }
  };

  const handleVoiceSubmit = (text) => {
    if (text && text.trim()) {
      handleSubmit(text);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsVoiceListening(false);
      setFeedbackGiven(false);
      setFeedbackRating(0);
      setShowTeachInput(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        const isBubbleClick = event.target.closest('.draggable-bubble-wrapper');
        if (!isBubbleClick) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (chatEndRef.current && isOpen) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (config && isOpen && messages.length === 0) {
      const timer = setTimeout(() => {
        speak(config.greeting);
        setMessages([{ type: 'assistant', text: config.greeting, confidence: 100, timestamp: new Date() }]);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, messages.length, config]);

  useEffect(() => {
    if (onMessageFromCopilot && isOpen && onMessageFromCopilot !== messages[messages.length - 1]?.text) {
      setMessages(prev => [...prev, { type: 'assistant', text: `🤖 Copilot : ${onMessageFromCopilot}`, isFromCopilot: true, timestamp: new Date() }]);
      speak(onMessageFromCopilot);
    }
  }, [onMessageFromCopilot, isOpen]);

  useEffect(() => { if (videoRef.current && config) videoRef.current.load(); }, [config]);

  const speak = (text) => {
    if ('speechSynthesis' in window && !isSpeakingRef.current && config && isOpen) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      if (config.voiceGender === 'male') {
        utterance.rate = 0.85;
        utterance.pitch = 0.8;
      } else {
        utterance.rate = 0.95;
        utterance.pitch = 1.2;
      }
      utterance.volume = 1;
      isSpeakingRef.current = true;
      utterance.onend = () => { isSpeakingRef.current = false; };
      utterance.onerror = () => { isSpeakingRef.current = false; };
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSubmit = async (textToSubmit = null) => {
    const finalQuestion = textToSubmit !== null ? textToSubmit : question;
    if (!finalQuestion.trim()) { 
      message.warning("Veuillez poser une question"); 
      return; 
    }
    
    setFeedbackGiven(false);
    setFeedbackRating(0);
    setShowTeachInput(false);
    setLastQuestion(finalQuestion);
    
    setMessages(prev => [...prev, { type: 'user', text: finalQuestion, timestamp: new Date() }]);
    setLoading(true);
    setQuestion('');
    setVoiceTranscript('');
    
    try {
      const ragResponse = await queryRAG(finalQuestion);
      setLastResponse(ragResponse.response);
      
      setMessages(prev => [...prev, { 
        type: 'assistant', 
        text: ragResponse.response,
        confidence: ragResponse.confidence ? Math.round(ragResponse.confidence * 100) : 85,
        actions: ragResponse.actions,
        interconnected_insights: ragResponse.interconnected_insights,
        timestamp: new Date() 
      }]);
      speak(ragResponse.response);
    } catch (error) {
      console.error('Erreur:', error);
      setMessages(prev => [...prev, { 
        type: 'assistant', 
        text: "Désolé, une erreur s'est produite. Veuillez réessayer.",
        timestamp: new Date() 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = async (action) => {
    if (action.type === 'install_module') {
      try {
        message.loading(`Installation du module ${action.module_name}...`);
        await api.post(`/modules/${action.module_key}/install`);
        message.success(`Module ${action.module_name} installé !`);
        window.dispatchEvent(new CustomEvent('modulesUpdated'));
        setMessages(prev => [...prev, { 
          type: 'assistant', 
          text: `✅ Le module **${action.module_name}** est maintenant actif.`,
          timestamp: new Date() 
        }]);
      } catch (error) {
        message.error("Erreur lors de l'installation");
      }
    } else if (action.type === 'send_email') {
      try {
        message.loading("Envoi de l'email...");
        await api.post(`/assistants/send-email`, action.params);
        message.success("Email envoyé !");
        setMessages(prev => [...prev, { 
          type: 'assistant', 
          text: `📧 L'email a été envoyé à **${action.params.to_email}**.`,
          timestamp: new Date() 
        }]);
      } catch (error) {
        message.error("Erreur d'envoi");
      }
    } else if (action.type === 'start_debate') {
        handleSubmit("Lancer un débat collectif sur ce sujet");
    }
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } };
  if (!config) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popupRef}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          style={{
            position: 'fixed',
            left: position.x || (window.innerWidth - 520),
            top: position.y || (window.innerHeight - 700),
            width: '520px',
            height: '700px',
            zIndex: 10000,
            cursor: isDragging ? 'grabbing' : 'default',
            boxShadow: `0 25px 50px -12px ${config.color}80, 0 0 0 1px ${config.color}20`,
            borderRadius: '28px',
            overflow: 'hidden',
            background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: 'column'
          }}
          onMouseDown={onMouseDown}
        >
          <div style={{ position: 'relative', height: '250px', background: '#000' }}>
            <video ref={videoRef} src={config.video} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: `linear-gradient(transparent, ${config.color}cc)`, padding: '16px 20px', color: 'white' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '10px', height: '10px', background: '#4caf50', borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
                <Text strong style={{ color: 'white', fontSize: '18px' }}>{config.name}</Text>
                <Text style={{ color: 'white', fontSize: '13px', opacity: 0.9 }}>{config.title}</Text>
              </div>
              <Text style={{ color: 'white', fontSize: '13px', fontStyle: 'italic', marginTop: '6px' }}>"{config.quote}"</Text>
            </div>
            <Button type="text" icon={<CloseOutlined style={{ color: 'white', fontSize: '18px' }} />} onClick={onClose} style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.5)', borderRadius: '50%', width: '34px', height: '34px' }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: 'transparent', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
                <div style={{ maxWidth: '80%', padding: '12px 16px', borderRadius: '18px', background: msg.type === 'user' ? config.color : msg.isFromCopilot ? 'rgba(37, 99, 235, 0.15)' : msg.isTeachingFeedback ? `${config.color}20` : 'rgba(30, 41, 59, 0.6)', color: msg.type === 'user' ? '#ffffff' : '#f8fafc', backdropFilter: msg.type === 'user' ? 'none' : 'blur(10px)', border: msg.type === 'user' ? 'none' : '1px solid rgba(255,255,255,0.05)', border: msg.type === 'assistant' ? `1px solid ${msg.isFromCopilot ? '#ff6b9d' : config.color}30` : 'none', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                  {msg.type === 'assistant' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <Text strong style={{ fontSize: '13px', color: msg.isFromCopilot ? '#ff6b9d' : config.color }}>{msg.isFromCopilot ? '🤖 Copilot' : config.name}</Text>
                      {msg.confidence && !msg.isFromCopilot && (
                        <Tag color={assistant === 'risk' ? 'red' : assistant === 'growth' ? 'green' : assistant === 'predict' ? 'blue' : assistant === 'compliance' ? 'purple' : assistant === 'operations' ? 'orange' : 'pink'} style={{ fontSize: '10px', margin: 0, padding: '0 8px' }}>
                          Confiance {msg.confidence}%
                        </Tag>
                      )}
                      {msg.learned && (
                        <Tag color="purple" style={{ fontSize: '10px' }}>
                          Savoir acquis
                        </Tag>
                      )}
                    </div>
                  )}
                  <Text style={{ fontSize: '14px', lineHeight: '1.5', whiteSpace: 'pre-wrap', color: '#f8fafc' }}>{msg.text}</Text>
                  
                  {msg.actions && msg.actions.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {msg.actions.map((action, actionIdx) => (
                        <Button 
                          key={actionIdx}
                          size="small"
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          onClick={() => handleExecuteAction(action)}
                          style={{ 
                            background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', 
                            color: config.color, 
                            borderColor: config.color,
                            borderRadius: 15,
                            fontSize: 12,
                            fontWeight: 600
                          }}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}

                  <Text type="secondary" style={{ fontSize: '10px', display: 'block', marginTop: '6px', textAlign: 'right', color: '#666' }}>
                    {msg.timestamp.toLocaleTimeString()}
                  </Text>
                </div>
              </div>
            ))}
            
            {!loading && messages.length > 0 && messages[messages.length-1].type === 'assistant' && !feedbackGiven && !messages[messages.length-1]?.isTeachingFeedback && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'flex-start', 
                  marginTop: 8, 
                  marginBottom: 8,
                  padding: '12px 16px',
                  background: '#f0f7ff',
                  borderRadius: '16px',
                  border: `1px solid ${config.color}20`
                }}
              >
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: 12, color: '#f8fafc' }}>
                    <SmileOutlined style={{ marginRight: 6 }} />
                    Cette réponse vous a-t-elle aidé ?
                  </Text>
                  <Space size={12}>
                    <Button size="small" icon={<LikeOutlined />} onClick={() => sendFeedback(5)}>Très utile</Button>
                    <Button size="small" icon={<LikeOutlined />} onClick={() => sendFeedback(3)}>Utile</Button>
                    <Button size="small" icon={<DislikeOutlined />} onClick={() => sendFeedback(1)} danger>Pas utile</Button>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 10, color: '#666' }}>Votre feedback aide l'assistant à s'améliorer</Text>
                </Space>
              </motion.div>
            )}
            
            {showTeachInput && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                style={{ 
                  marginTop: 8,
                  padding: '16px',
                  background: 'rgba(255, 204, 0, 0.1)',
                  borderRadius: '16px',
                  border: '1px solid #ffc53d'
                }}
              >
                <Space direction="vertical" size={12} style={{ width: '100%' }}>
                  <div>
                    <EditOutlined style={{ color: '#faad14', marginRight: 8 }} />
                    <Text strong style={{ color: '#f8fafc' }}>Enseignez la bonne réponse à l'assistant :</Text>
                  </div>
                  <Input.TextArea 
                    placeholder="Entrez la réponse correcte..."
                    value={teachAnswer}
                    onChange={(e) => setTeachAnswer(e.target.value)}
                    autoSize={{ minRows: 2, maxRows: 4 }}
                    style={{ borderRadius: '12px' }}
                  />
                  <Space>
                    <Button type="primary" icon={<SaveOutlined />} onClick={teachAssistant} loading={isTeaching} style={{ background: '#52c41a' }}>
                      Enseigner la bonne réponse
                    </Button>
                    <Button onClick={() => setShowTeachInput(false)}>Annuler</Button>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 11, color: '#666' }}>L'assistant mémorisera cette réponse pour les questions similaires</Text>
                </Space>
              </motion.div>
            )}
            
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ background: 'var(--bg-secondary)', padding: '12px 18px', borderRadius: '18px', border: `1px solid ${config.color}30`, display: 'flex', gap: '5px' }}>
                  {[0, 1, 2].map(i => <motion.div key={i} animate={{ y: [0, -5, 0] }} transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.2 }} style={{ width: '8px', height: '8px', background: config.color, borderRadius: '50%' }} />)}
                  <Text style={{ marginLeft: '8px', fontSize: '12px', color: '#666' }}>Recherche dans la base...</Text>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: '10px' }}>
            <Input.TextArea 
              value={question} 
              onChange={(e) => setQuestion(e.target.value)} 
              onKeyPress={handleKeyPress} 
              placeholder="Écrivez votre question..." 
              autoSize={{ minRows: 1, maxRows: 3 }} 
              style={{ borderRadius: '24px', borderColor: config.color, resize: 'none', fontSize: '14px', flex: 1 }} 
            />
            <Button 
              type={isVoiceListening ? "danger" : "default"}
              icon={isVoiceListening ? <LoadingOutlined /> : <AudioOutlined />} 
              onClick={isVoiceListening ? stopVoiceInput : startVoiceInput}
              style={{ borderRadius: '50%', width: '40px', height: '40px', background: isVoiceListening ? '#ff4d4f' : config.color, borderColor: config.color, color: 'white' }} 
            />
            <Button type="primary" icon={<SendOutlined />} onClick={() => handleSubmit()} loading={loading} style={{ background: config.color, borderColor: config.color, borderRadius: '50%', width: '40px', height: '40px' }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ========== COMPOSANT COPILOT PRINCIPAL ==========
const CopilotPopup = ({ isOpen, onClose, position, onMouseDown, isDragging, onSendToAssistant }) => {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [lastQuestion, setLastQuestion] = useState('');
  const [lastResponse, setLastResponse] = useState('');
  const [showTeachInput, setShowTeachInput] = useState(false);
  const [teachAnswer, setTeachAnswer] = useState('');
  const [isTeaching, setIsTeaching] = useState(false);
  const videoRef = useRef(null);
  const chatEndRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const popupRef = useRef(null);
  const recognitionRef = useRef(null);

  const copilotConfig = {
    name: 'Nexy Copilot',
    title: 'Assistant Stratégique IA',
    video: '/video/copilot.mp4',
    color: '#2563eb',
    quote: 'Votre partenaire intelligent pour des décisions éclairées.',
    greeting: 'Bonjour ! Je suis Nexy Copilot, votre assistant stratégique. Je peux vous orienter vers nos experts : Sophie, Elena, James, Risk, predict, growth. Comment puis-je vous aider ?',
    voiceGender: 'male'
  };

  const queryRAG = async (query) => {
    try {
      const endpoint = query.toLowerCase().includes("débat") ? "/assistants/debate" : "/assistants/chat";
      const payload = endpoint === "/assistants/debate" ? { query } : { agent_name: 'copilot', query };
      
      const response = await api.post(endpoint, payload);
      return response.data;
    } catch (error) {
      console.error('Erreur RAG Copilot:', error);
      return { response: "Désolé, je n'arrive pas à accéder à ma base de connaissances." };
    }
  };

  const teachAssistant = async () => {
    if (!teachAnswer.trim()) {
      message.warning("Veuillez entrer la bonne réponse");
      return;
    }
    
    setIsTeaching(true);
    try {
      await api.post(`/assistant/teach`, {
        assistant: 'copilot',
        question: lastQuestion,
        correct_answer: teachAnswer
      });
      
      message.success("✅ L'assistant a appris la bonne réponse !");
      setMessages(prev => [...prev, { 
        type: 'assistant', 
        text: `📚 Merci ! J'ai appris que pour "${lastQuestion}", la réponse est : "${teachAnswer}"`,
        timestamp: new Date() 
      }]);
      setShowTeachInput(false);
      setTeachAnswer('');
      setFeedbackGiven(true);
    } catch (error) {
      console.error('Erreur enseignement:', error);
      if (error.response?.status === 404) {
        message.error("L'API d'enseignement n'est pas encore disponible.");
      } else {
        message.error("Erreur lors de l'enseignement");
      }
    } finally {
      setIsTeaching(false);
    }
  };

  const sendFeedback = async (score) => {
    setFeedbackGiven(true);
    try {
      await api.post(`/assistant/learn-from-feedback`, {
        assistant: 'copilot',
        question: lastQuestion,
        answer: lastResponse,
        feedback_score: score
      });
      
      if (score >= 4) {
        message.success("🌟 Merci !");
      } else if (score <= 2) {
        setShowTeachInput(true);
        message.info("📝 Enseignez la bonne réponse ?");
      }
    } catch (error) {
      console.error('Erreur feedback:', error);
      if (score <= 2) {
        setShowTeachInput(true);
        message.info("📝 Enseignez la bonne réponse à l'assistant.");
      }
    }
  };

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'fr-FR';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setVoiceTranscript(transcript);
        setQuestion(transcript);
      };
      recognitionRef.current.onend = () => {
        setIsVoiceListening(false);
        if (voiceTranscript) handleVoiceSubmit(voiceTranscript);
      };
      recognitionRef.current.onerror = () => {
        setIsVoiceListening(false);
        message.error("Je n'ai pas compris");
      };
    }
  }, []);

  const startVoiceInput = () => {
    if (recognitionRef.current) {
      setVoiceTranscript('');
      recognitionRef.current.start();
      setIsVoiceListening(true);
      message.info("🎤 Parlez maintenant...", 2);
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) recognitionRef.current.stop();
    setIsVoiceListening(false);
  };

  const handleVoiceSubmit = (text) => {
    if (text && text.trim()) handleSubmit(text);
  };

  useEffect(() => {
    if (!isOpen) {
      if ('speechSynthesis' in window) window.speechSynthesis.cancel();
      if (recognitionRef.current) recognitionRef.current.stop();
      setIsVoiceListening(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        const isBubbleClick = event.target.closest('.draggable-bubble-wrapper');
        if (!isBubbleClick) onClose();
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (chatEndRef.current && isOpen) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setTimeout(() => {
        speak(copilotConfig.greeting);
        setMessages([{ type: 'assistant', text: copilotConfig.greeting, timestamp: new Date() }]);
      }, 500);
    }
  }, [isOpen, messages.length]);

  useEffect(() => { if (videoRef.current) videoRef.current.load(); }, []);

  const speak = (text) => {
    if ('speechSynthesis' in window && !isSpeakingRef.current && isOpen) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = 0.85;
      utterance.pitch = 0.8;
      isSpeakingRef.current = true;
      utterance.onend = () => { isSpeakingRef.current = false; };
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSubmit = async (textToSubmit = null) => {
    const finalQuestion = textToSubmit !== null ? textToSubmit : question;
    if (!finalQuestion.trim()) {
      message.warning("Veuillez poser une question");
      return;
    }
    
    setFeedbackGiven(false);
    setShowTeachInput(false);
    setLastQuestion(finalQuestion);
    
    setMessages(prev => [...prev, { type: 'user', text: finalQuestion, timestamp: new Date() }]);
    setLoading(true);
    setQuestion('');
    setVoiceTranscript('');
    
    const lowerQ = finalQuestion.toLowerCase();
    
    const isInstallIntent = ["installe", "active", "ajouter", "mettre en place"].some(word => lowerQ.includes(word));
    
    let targetAssistant = null;
    
    if (!isInstallIntent) {
      if (lowerQ.includes('risque') || lowerQ.includes('sinistre') || lowerQ.includes('fraude')) targetAssistant = 'risk';
      else if (lowerQ.includes('croissance') || lowerQ.includes('vente') || lowerQ.includes('marketing')) targetAssistant = 'growth';
      else if (lowerQ.includes('prédiction') || lowerQ.includes('crédit') || lowerQ.includes('score')) targetAssistant = 'predict';
      else if (lowerQ.includes('conformité') || lowerQ.includes('aml') || lowerQ.includes('blanchiment')) targetAssistant = 'compliance';
      else if (lowerQ.includes('opération') || lowerQ.includes('supply') || lowerQ.includes('chaîne')) targetAssistant = 'operations';
      else if (lowerQ.includes('donnée') || lowerQ.includes('analytique') || lowerQ.includes('data')) targetAssistant = 'analytics';
    }
    
    try {
      if (targetAssistant) {
        const assistantNames = {
          risk: 'Sophie Laurent',
          growth: 'Elena Petrova',
          predict: 'James O\'Connor',
          compliance: 'Risk',
          operations: 'predict',
          analytics: 'growth'
        };
        const response = `Je vous connecte avec ${assistantNames[targetAssistant]}. Un instant...`;
        setMessages(prev => [...prev, { type: 'assistant', text: response, timestamp: new Date() }]);
        speak(response);
        setTimeout(() => onSendToAssistant(targetAssistant, finalQuestion), 2000);
      } else {
        const ragResponse = await queryRAG(finalQuestion);
        setLastResponse(ragResponse.response);
        
        const actions = ragResponse.actions || [];
        
        setMessages(prev => [...prev, { 
          type: 'assistant', 
          text: ragResponse.response, 
          actions: actions,
          timestamp: new Date() 
        }]);
        
        speak(ragResponse.response);
        
        const installAction = actions.find(a => a.type === 'install_module');
        if (installAction && (lowerQ.includes('installe') || lowerQ.includes('active'))) {
           handleExecuteAction(installAction);
        }
      }
    } catch (error) {
      setMessages(prev => [...prev, { type: 'assistant', text: "Désolé, une erreur s'est produite.", timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteAction = async (action) => {
    if (action.type === 'install_module') {
      try {
        message.loading(`Installation du module ${action.module_name}...`);
        await api.post(`/modules/${action.module_key}/install`);
        
        message.success(`Module ${action.module_name} installé avec succès !`);
        window.dispatchEvent(new CustomEvent('modulesUpdated'));
        
        setMessages(prev => [...prev, { 
          type: 'assistant', 
          text: `✅ C'est fait ! Le module **${action.module_name}** est maintenant actif dans votre barre latérale.`,
          timestamp: new Date() 
        }]);
      } catch (error) {
        message.error("Erreur lors de l'installation");
      }
    } else if (action.type === 'send_email') {
      try {
        message.loading("Envoi de l'email...");
        await api.post(`/assistant/send-email`, action.params);
        
        message.success("Email envoyé avec succès !");
        
        setMessages(prev => [...prev, { 
          type: 'assistant', 
          text: `📧 L'email a été envoyé à **${action.params.to_email}** avec succès.`,
          timestamp: new Date() 
        }]);
      } catch (error) {
        message.error("Erreur lors de l'envoi de l'email");
      }
    }
  };

  const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={popupRef}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            position: 'fixed',
            left: position.x || (window.innerWidth - 520),
            top: position.y || (window.innerHeight - 700),
            width: '520px',
            height: '700px',
            zIndex: 10000,
            cursor: isDragging ? 'grabbing' : 'default',
            boxShadow: `0 25px 50px -12px ${copilotConfig.color}80`,
            borderRadius: '28px',
            overflow: 'hidden',
            background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)',
            display: 'flex',
            flexDirection: 'column'
          }}
          onMouseDown={onMouseDown}
        >
          <div style={{ position: 'relative', height: '250px', background: 'linear-gradient(135deg, #1e1b4b, #312e81)' }}>
            <video ref={videoRef} src={copilotConfig.video} autoPlay loop muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent, rgba(0,0,0,0.7))', padding: '20px', color: 'white' }}>
              <Text strong style={{ color: 'white', fontSize: '20px' }}>{copilotConfig.name}</Text>
              <Text style={{ color: 'white', fontSize: '13px', opacity: 0.9 }}>{copilotConfig.title}</Text>
              <Text style={{ color: 'white', fontSize: '12px', fontStyle: 'italic' }}>"{copilotConfig.quote}"</Text>
            </div>
            <Button type="text" icon={<CloseOutlined style={{ color: 'white' }} />} onClick={onClose} style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '50%' }} />
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px', background: 'transparent' }}>
            {messages.map((msg, idx) => (
              <div key={idx} style={{ textAlign: msg.type === 'user' ? 'right' : 'left', marginBottom: 16 }}>
                <div style={{ 
                  display: 'inline-block', 
                  padding: '12px 16px', 
                  borderRadius: 20, 
                  background: msg.type === 'user' ? copilotConfig.color : 'rgba(30, 41, 59, 0.6)', 
                  color: msg.type === 'user' ? '#ffffff' : '#f8fafc', backdropFilter: msg.type === 'user' ? 'none' : 'blur(10px)', border: msg.type === 'user' ? 'none' : '1px solid rgba(255,255,255,0.05)', 
                  border: msg.type === 'assistant' ? `1px solid ${copilotConfig.color}20` : 'none',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                  maxWidth: '85%'
                }}>
                  <Text style={{ fontSize: 14, color: msg.type === 'user' ? '#ffffff' : '#f8fafc' }}>{msg.text}</Text>
                  
                  {msg.actions && msg.actions.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {msg.actions.map((action, actionIdx) => (
                        <Button 
                          key={actionIdx}
                          size="small"
                          type="primary"
                          icon={<CheckCircleOutlined />}
                          onClick={() => handleExecuteAction(action)}
                          style={{ 
                            background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', 
                            color: copilotConfig.color, 
                            borderColor: copilotConfig.color,
                            borderRadius: 15,
                            fontSize: 12,
                            fontWeight: 600
                          }}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  <Text type="secondary" style={{ fontSize: 10, display: 'block', marginTop: 6, opacity: 0.7, color: '#666' }}>{msg.timestamp.toLocaleTimeString()}</Text>
                </div>
              </div>
            ))}
            
            {!loading && messages.length > 0 && messages[messages.length-1].type === 'assistant' && !feedbackGiven && (
              <div style={{ marginTop: 8 }}>
                <Button size="small" onClick={() => sendFeedback(5)}>👍 Utile</Button>
                <Button size="small" danger onClick={() => sendFeedback(1)} style={{ marginLeft: 8 }}>👎 Pas utile</Button>
              </div>
            )}
            
            {showTeachInput && (
              <div style={{ marginTop: 12, padding: 12, background: 'rgba(255, 204, 0, 0.1)', borderRadius: 12 }}>
                <Text strong style={{ color: '#f8fafc' }}>Enseignez la bonne réponse :</Text>
                <Input.TextArea value={teachAnswer} onChange={(e) => setTeachAnswer(e.target.value)} rows={2} style={{ marginTop: 8 }} />
                <Button type="primary" onClick={teachAssistant} loading={isTeaching} style={{ marginTop: 8, background: '#52c41a' }}>Enseigner</Button>
              </div>
            )}
            
            {loading && <Text style={{ marginLeft: 8, color: '#666' }}>Analyse en cours...</Text>}
            <div ref={chatEndRef} />
          </div>
          <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', gap: 8 }}>
            <Input.TextArea value={question} onChange={(e) => setQuestion(e.target.value)} onKeyPress={handleKeyPress} placeholder="Posez votre question..." autoSize={{ minRows: 1, maxRows: 2 }} style={{ flex: 1, borderRadius: 24 }} />
            <Button icon={isVoiceListening ? <AudioMutedOutlined /> : <AudioOutlined />} onClick={isVoiceListening ? stopVoiceInput : startVoiceInput} style={{ borderRadius: '50%' }} />
            <Button type="primary" icon={<SendOutlined />} onClick={() => handleSubmit()} loading={loading} style={{ borderRadius: '50%' }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ========== COMPOSANT PRINCIPAL ==========
const CopilotBubble = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [activeAssistant, setActiveAssistant] = useState(null);
  const [assistantPositions, setAssistantPositions] = useState({
    risk: { x: 0, y: 0 },
    growth: { x: 0, y: 0 },
    predict: { x: 0, y: 0 },
    compliance: { x: 0, y: 0 },
    operations: { x: 0, y: 0 },
    analytics: { x: 0, y: 0 }
  });
  const [isAssistantDragging, setIsAssistantDragging] = useState({
    risk: false,
    growth: false,
    predict: false,
    compliance: false,
    operations: false,
    analytics: false
  });
  const [showBubbles, setShowBubbles] = useState({
    risk: false,
    growth: false,
    predict: false,
    compliance: false,
    operations: false,
    analytics: false
  });
  const [pendingQuestion, setPendingQuestion] = useState({ assistant: null, question: null });
  const [wakeWordDetected, setWakeWordDetected] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const voiceAssistant = useVoiceAssistant();
  const { isListening: voiceIsListening, transcript, error: voiceError, supported, startListening, stopListening } = voiceAssistant;

  const copilotColor = '#2563eb';
  const copilotColorDark = '#2563eb';

  const assistantsConfig = {
    risk: { name: 'Sophie Laurent', title: 'Risk Management Director', color: '#ef4444', greeting: 'Bonjour, je suis Sophie Laurent.', voiceGender: 'female', icon: <SecurityScanOutlined /> },
    growth: { name: 'Elena Petrova', title: 'Business Growth Strategist', color: '#10b981', greeting: 'Bonjour, je suis Elena Petrova.', voiceGender: 'female', icon: <RiseOutlined /> },
    predict: { name: 'James O\'Connor', title: 'Lead Data Scientist', color: '#3b82f6', greeting: 'Bonjour, je suis James O\'Connor.', voiceGender: 'male', icon: <BulbOutlined /> },
    compliance: { name: 'Risk', title: 'Compliance & AML Officer', color: '#8b5cf6', greeting: 'Bonjour, je suis Risk.', voiceGender: 'female', icon: <SafetyCertificateOutlined /> },
    operations: { name: 'predict', title: 'Operations & Supply Chain Director', color: '#f59e0b', greeting: 'Bonjour, je suis predict.', voiceGender: 'male', icon: <ThunderboltOutlined /> },
    analytics: { name: 'growth', title: 'Chief Data & Analytics Officer', color: '#ec4899', greeting: 'Bonjour, je suis growth.', voiceGender: 'female', icon: <LineChartOutlined /> }
  };

  const speak = (text, voiceGender) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'fr-FR';
      utterance.rate = voiceGender === 'male' ? 0.85 : 0.95;
      utterance.pitch = voiceGender === 'male' ? 0.8 : 1.2;
      window.speechSynthesis.speak(utterance);
    }
  };

  const wakeWords = {
    risk: ['sophie', 'laurent', 'risk', 'risque'],
    growth: ['elena', 'petrova', 'growth', 'croissance'],
    predict: ['james', 'oconnor', 'predict', 'prédict'],
    compliance: ['compliance', 'conformité', 'aml', 'blanchiment'],
    operations: ['operations', 'opération', 'supply', 'chaîne', 'logistique'],
    analytics: ['analytics', 'analytique', 'data', 'donnée', 'maria'],
    copilot: ['copilot', 'assistant', 'aide', 'nexy'],
    hide: ['cache toi', 'disparais', 'ferme', 'au revoir', 'bye']
  };

  useEffect(() => { if (voiceError) message.error(voiceError); }, [voiceError]);
  useEffect(() => { if (!supported) message.warning('Reconnaissance vocale non supportée'); }, [supported]);
  useEffect(() => { setIsListening(voiceIsListening); }, [voiceIsListening]);

  useEffect(() => {
    if (transcript) {
      const lowerTranscript = transcript.toLowerCase().trim();
      if (wakeWords.hide.some(word => lowerTranscript.includes(word))) handleHideAll();
      else if (wakeWords.copilot.some(word => lowerTranscript.includes(word))) handleWakeWord('copilot');
      else {
        // Vérifier les assistants
        for (const [key, words] of Object.entries(wakeWords)) {
          if (key !== 'copilot' && key !== 'hide' && words.some(word => lowerTranscript.includes(word))) {
            handleWakeWord(key);
            break;
          }
        }
      }
    }
  }, [transcript]);

  useEffect(() => {
    const savedPos = localStorage.getItem('copilot-popup-position');
    if (savedPos) setPosition(JSON.parse(savedPos));
    ['risk', 'growth', 'predict', 'compliance', 'operations', 'analytics'].forEach(assistant => {
      const savedPos = localStorage.getItem(`${assistant}-video-position`);
      if (savedPos) setAssistantPositions(prev => ({ ...prev, [assistant]: JSON.parse(savedPos) }));
      else {
        const yOffset = ['risk', 'growth', 'predict', 'compliance', 'operations', 'analytics'].indexOf(assistant) * 70 + 100;
        setAssistantPositions(prev => ({ ...prev, [assistant]: { x: window.innerWidth - 540, y: yOffset } }));
      }
    });
  }, []);

  const handleHideAll = () => {
    setActiveAssistant(null);
    setIsOpen(false);
    setShowBubbles({ risk: false, growth: false, predict: false, compliance: false, operations: false, analytics: false });
    setWakeWordDetected('hide');
    speak("Au revoir !", 'female');
    stopListening();
    setTimeout(() => setWakeWordDetected(null), 2000);
  };

  const handleWakeWord = (assistant) => {
    setWakeWordDetected(assistant);
    if (assistant === 'copilot') {
      setIsOpen(true);
    } else {
      setShowBubbles(prev => ({ ...prev, [assistant]: true }));
      setTimeout(() => {
        setActiveAssistant(assistant);
        speak(assistantsConfig[assistant].greeting, assistantsConfig[assistant].voiceGender);
      }, 300);
    }
    stopListening();
    setTimeout(() => setWakeWordDetected(null), 3000);
  };

  const handleSendToAssistant = (assistant, question) => {
    setPendingQuestion({ assistant, question });
    setShowBubbles(prev => ({ ...prev, [assistant]: true }));
    setTimeout(() => setActiveAssistant(assistant), 500);
  };

  const startGlobalListening = () => {
    if (!supported) {
      message.error('Reconnaissance vocale non supportée');
      return;
    }
    startListening();
    message.info("🎤 J'écoute... dites un mot-clé : Copilot, Risk, Growth, Predict, Compliance, Operations, Analytics", 3);
  };
  const stopGlobalListening = () => {
    stopListening();
    message.info("👋 Écoute arrêtée");
  };

  const handleAssistantMouseDown = (assistant, e) => {
    e.stopPropagation();
    if (e.target.closest('textarea') || e.target.closest('button')) return;
    setIsAssistantDragging(prev => ({ ...prev, [assistant]: true }));
    const currentPos = assistantPositions[assistant];
    dragStartPos.current = { x: e.clientX - (currentPos.x || window.innerWidth - 520), y: e.clientY - (currentPos.y || window.innerHeight - 700) };
    e.preventDefault();
  };

  const handleAssistantMouseMove = (e) => {
    Object.keys(isAssistantDragging).forEach(assistant => {
      if (isAssistantDragging[assistant]) {
        const newX = e.clientX - dragStartPos.current.x;
        const newY = e.clientY - dragStartPos.current.y;
        setAssistantPositions(prev => ({ ...prev, [assistant]: { x: Math.max(10, Math.min(window.innerWidth - 520, newX)), y: Math.max(10, Math.min(window.innerHeight - 700, newY)) } }));
      }
    });
  };

  const handleAssistantMouseUp = () => {
    Object.keys(isAssistantDragging).forEach(assistant => {
      if (isAssistantDragging[assistant]) {
        setIsAssistantDragging(prev => ({ ...prev, [assistant]: false }));
        localStorage.setItem(`${assistant}-video-position`, JSON.stringify(assistantPositions[assistant]));
      }
    });
  };

  useEffect(() => {
    if (Object.values(isAssistantDragging).some(v => v)) {
      window.addEventListener('mousemove', handleAssistantMouseMove);
      window.addEventListener('mouseup', handleAssistantMouseUp);
    }
    return () => { window.removeEventListener('mousemove', handleAssistantMouseMove); window.removeEventListener('mouseup', handleAssistantMouseUp); };
  }, [isAssistantDragging]);

  const handleCopilotMouseDown = (e) => {
    e.stopPropagation();
    if (e.target.closest('textarea') || e.target.closest('button')) return;
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    e.preventDefault();
  };

  const handleCopilotMouseMove = (e) => {
    if (isDragging) setPosition({ x: Math.max(10, Math.min(window.innerWidth - 520, e.clientX - dragStartPos.current.x)), y: Math.max(10, Math.min(window.innerHeight - 700, e.clientY - dragStartPos.current.y)) });
  };

  const handleCopilotMouseUp = () => {
    if (isDragging) { setIsDragging(false); localStorage.setItem('copilot-popup-position', JSON.stringify(position)); }
  };

  useEffect(() => {
    if (isDragging) { window.addEventListener('mousemove', handleCopilotMouseMove); window.addEventListener('mouseup', handleCopilotMouseUp); }
    return () => { window.removeEventListener('mousemove', handleCopilotMouseMove); window.removeEventListener('mouseup', handleCopilotMouseUp); };
  }, [isDragging]);

  // Icônes pour les bulles
  const bubbleIcons = {
    risk: '🛡️',
    growth: '📈',
    predict: '🔮',
    compliance: '⚖️',
    operations: '⚙️',
    analytics: '📊'
  };

  const assistantKeys = ['risk', 'growth', 'predict', 'compliance', 'operations', 'analytics'];

  return (
    <>
      <motion.div style={{ position: 'fixed', bottom: 350, right: 30, zIndex: 10001 }}>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isListening ? stopGlobalListening : startGlobalListening}
          style={{
            width: 56, height: 56, borderRadius: '50%', border: 'none',
            background: isListening ? '#ef4444' : `linear-gradient(135deg, ${copilotColor}, ${copilotColorDark})`,
            boxShadow: isListening ? '0 0 0 0 rgba(239,68,68,0.7)' : `0 8px 25px ${copilotColor}60`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: isListening ? 'ripple 1.5s infinite' : 'none'
          }}
        >
          {isListening ? <AudioMutedOutlined style={{ fontSize: '28px', color: 'white' }} /> : <AudioOutlined style={{ fontSize: '28px', color: 'white' }} />}
        </motion.button>
      </motion.div>

      <AnimatePresence>
        {wakeWordDetected && wakeWordDetected !== 'hide' && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            style={{
              position: 'fixed', top: 20, right: 30,
              background: assistantsConfig[wakeWordDetected]?.color || copilotColor,
              color: 'white', padding: '12px 24px', borderRadius: '50px', zIndex: 10002, display: 'flex', alignItems: 'center', gap: 10,
              boxShadow: '0 5px 20px rgba(0,0,0,0.2)'
            }}
          >
            <motion.div animate={{ rotate: 360 }}><StarOutlined /></motion.div>
            <span style={{ fontWeight: 'bold' }}>
              {wakeWordDetected === 'risk' ? 'Sophie Laurent activée ✨' :
               wakeWordDetected === 'growth' ? 'Elena Petrova activée 📈' :
               wakeWordDetected === 'predict' ? 'James O\'Connor activé 🔮' :
               wakeWordDetected === 'compliance' ? 'Risk activé ⚖️' :
               wakeWordDetected === 'operations' ? 'predict activé ⚙️' :
               wakeWordDetected === 'analytics' ? 'growth activé 📊' :
               'Nexy Copilot activé 🤖'}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulle principale Copilot */}
      <DraggableBubble
        icon={
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }} style={{
            width: '100%', height: '100%', borderRadius: '50%',
            background: `linear-gradient(135deg, ${copilotColor}, ${copilotColorDark})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
            cursor: 'pointer', boxShadow: `0 8px 25px ${copilotColor}80`
          }}>
            <BulbOutlined style={{ fontSize: '36px', color: 'white', zIndex: 1 }} />
          </motion.div>
        }
        color="transparent"
        tooltip="Nexy Copilot - Assistant Stratégique"
        onClick={() => setIsOpen(true)}
        initialPosition={{ bottom: 30, right: 30 }}
        zIndex={9999}
        size={70}
      />

      {/* Bulles des 6 assistants */}
      {assistantKeys.map((key, index) => {
        const config = assistantsConfig[key];
        const bottomOffset = 120 + index * 70;
        return showBubbles[key] && (
          <DraggableBubble
            key={key}
            icon={
              <div style={{
                width: '100%', height: '100%', borderRadius: '50%',
                background: config.color,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px'
              }}>
                {bubbleIcons[key]}
              </div>
            }
            color={config.color}
            tooltip={config.name}
            onClick={() => setActiveAssistant(key)}
            initialPosition={{ bottom: bottomOffset, right: 30 }}
            zIndex={9998 - index}
            size={55}
          />
        );
      })}

      <CopilotPopup isOpen={isOpen} onClose={() => setIsOpen(false)} position={position} onMouseDown={handleCopilotMouseDown} isDragging={isDragging} onSendToAssistant={handleSendToAssistant} />
      
      {assistantKeys.map((key) => (
        <VideoAssistantPopup
          key={key}
          assistant={key}
          isOpen={activeAssistant === key}
          onClose={() => setActiveAssistant(null)}
          position={assistantPositions[key]}
          onMouseDown={(e) => handleAssistantMouseDown(key, e)}
          isDragging={isAssistantDragging[key]}
          onMessageFromCopilot={pendingQuestion.assistant === key ? pendingQuestion.question : null}
        />
      ))}

      <style>{`
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.2); } }
        @keyframes ripple { 0% { box-shadow: 0 0 0 0 rgba(99,102,241,0.7); } 70% { box-shadow: 0 0 0 15px rgba(99,102,241,0); } 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); } }
      `}</style>
    </>
  );
};

export default CopilotBubble;