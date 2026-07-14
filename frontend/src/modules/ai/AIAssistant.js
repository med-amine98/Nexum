// src/modules/ai/AIAssistant.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, Input, Button, Avatar, Space, Typography, 
  Spin, Alert, message, Tag, Tooltip, Badge,
  Modal, Row, Col, Divider, Progress
} from 'antd';
import { 
  RobotOutlined, UserOutlined, SendOutlined, 
  BulbOutlined, ClearOutlined, FullscreenOutlined, 
  CloseOutlined, MessageOutlined, ThunderboltOutlined,
  StarOutlined, FireOutlined, HeartOutlined,
  StarFilled,
  CameraOutlined,
  AudioOutlined,
  PictureOutlined,
  ScanOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';

const { Text, Title } = Typography;

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Avatar attirant - Animation de particules
const assistantAvatar = "https://cdn-icons-png.flaticon.com/512/4712/4712109.png";

const AIAssistant = () => {
  const [messages, setMessages] = useState([
    { 
      role: 'ai', 
      content: '✨ Bonjour ! Je suis Nova, votre assistant IA. Comment puis-je vous aider aujourd\'hui ? ✨',
      timestamp: new Date(),
      suggestions: ['📊 Voir les statistiques', '📈 Rapport des ventes', '👥 Liste des clients', '💰 Factures en attente']
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [fullscreen, setFullscreen] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isTyping, setIsTyping] = useState(false);
  const [visionMode, setVisionMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const videoRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    checkBackendConnection();
    inputRef.current?.focus();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch(`${API_BASE}/health`);
      if (response.ok) {
        setBackendStatus('online');
        message.success('✨ Nova est en ligne ✨');
      } else {
        setBackendStatus('offline');
      }
    } catch (error) {
      console.error('Backend hors ligne:', error);
      setBackendStatus('offline');
    }
  };

  const simulateTyping = async (text, setMessage) => {
    setIsTyping(true);
    const words = text.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
      currentText += words[i] + ' ';
      setMessage(currentText);
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    setIsTyping(false);
  };

  const handleSend = async (customMessage = null) => {
    const messageToSend = customMessage || input;
    if (!messageToSend?.trim()) return;
    
    const userMessage = { 
      role: 'user', 
      content: messageToSend,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    
    setShowSuggestions(false);
    setInput('');
    setLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(`${API_BASE}/api/v1/ai/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ message: messageToSend }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Erreur HTTP ${response.status}`);
      }
      
      const data = await response.json();
      
      if (!currentConversationId && data.conversation_id) {
        setCurrentConversationId(data.conversation_id);
      }
      
      const assistantResponse = data.response || "✨ Je n'ai pas bien compris, peux-tu reformuler ? ✨";
      
      let tempContent = '';
      const newMessage = { 
        role: 'ai', 
        content: tempContent,
        timestamp: new Date(),
        suggestions: data.suggestions || []
      };
      setMessages(prev => [...prev, newMessage]);
      
      await simulateTyping(assistantResponse, (text) => {
        setMessages(prev => {
          const lastMessage = prev[prev.length - 1];
          if (lastMessage.role === 'ai' && lastMessage.content === tempContent) {
            return [...prev.slice(0, -1), { ...lastMessage, content: text }];
          }
          return prev;
        });
        tempContent = text;
      });
      
    } catch (error) {
      console.error('Erreur:', error);
      
      let errorMessage = "💫 Désolé, une erreur est survenue. Peux-tu réessayer ? 💫";
      
      if (error.name === 'AbortError') {
        errorMessage = "⏱️ Le délai est dépassé. Je suis un peu fatigué, réessaie ? 💫";
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = "🔌 Je n'arrive pas à joindre le serveur. Vérifie la connexion ! 💫";
      }
      
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: errorMessage,
        timestamp: new Date(),
        isError: true
      }]);
      
      message.error('💫 Oups, une petite erreur technique 💫');
    } finally {
      setLoading(false);
    }
  };

  const handleVisionAnalysis = async () => {
    setVisionMode(true);
    message.loading("Initialisation de la vision multimodale...");
    // Simuler le démarrage de la webcam
    setTimeout(() => {
      message.success("Caméra connectée. Nova vous observe. ✨");
    }, 1000);
  };

  const processVision = async () => {
    setLoading(true);
    setVisionMode(false);
    const userMsg = { role: 'user', content: "[Analyse de document via caméra]", timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    
    await new Promise(r => setTimeout(r, 2000));
    const aiMsg = { 
      role: 'ai', 
      content: "✨ J'ai analysé le document. Il s'agit d'un graphique de performance Q4. Je détecte une tendance haussière de 12% et une anomalie potentielle sur les coûts fixes. Voulez-vous un rapport détaillé ? ✨",
      timestamp: new Date()
    };
    setMessages(prev => [...prev, aiMsg]);
    setLoading(false);
  };

  const clearConversation = () => {
    Modal.confirm({
      title: '✨ Nouvelle conversation ✨',
      content: 'Veux-tu vraiment effacer notre conversation ?',
      okText: 'Oui',
      cancelText: 'Non',
      onOk: () => {
        setMessages([{
          role: 'ai', 
          content: '✨ Bonjour ! Je suis Nova, votre assistant IA. Comment puis-je vous aider aujourd\'hui ? ✨',
          timestamp: new Date(),
          suggestions: ['📊 Voir les statistiques', '📈 Rapport des ventes', '👥 Liste des clients', '💰 Factures en attente']
        }]);
        setCurrentConversationId(null);
        setShowSuggestions(true);
        message.success('✨ Nouvelle conversation démarrée ✨');
      }
    });
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  if (backendStatus === 'offline') {
    return (
      <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
        <Card style={{ borderRadius: 24, background: '#f0f2f5' }}>
          <Alert
            message="🌟 Nova est hors ligne 🌟"
            description="Le service n'est pas accessible. Vérifie la connexion au serveur."
            type="error"
            showIcon
            action={
              <Button type="primary" onClick={checkBackendConnection} style={{ borderRadius: 20 }}>
                Réessayer
              </Button>
            }
            style={{ borderRadius: 16 }}
          />
        </Card>
      </div>
    );
  }

  if (backendStatus === 'checking') {
    return (
      <div style={{ padding: 24, maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16, color: '#667eea' }}>🌟 Connexion à Nova... 🌟</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{ padding: 24, background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)', minHeight: '100vh' }}
    >
      <Card 
        className={fullscreen ? 'assistant-fullscreen' : ''}
        style={{ 
          borderRadius: 32, 
          maxWidth: fullscreen ? '100%' : 900, 
          margin: '0 auto',
          height: fullscreen ? 'calc(100vh - 48px)' : 650,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
          background: '#ffffff',
          border: 'none'
        }}
        bodyStyle={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          padding: 0
        }}
      >
        {/* En-tête avec avatar animé */}
        <div style={{ 
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '32px 32px 0 0',
          color: 'white'
        }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Space size="large">
                <motion.div
                  animate={{ 
                    scale: [1, 1.05, 1],
                    rotate: [0, 5, -5, 0]
                  }}
                  transition={{ 
                    duration: 3,
                    repeat: Infinity,
                    repeatType: "reverse"
                  }}
                >
                  <Avatar 
                    src={assistantAvatar}
                    size={56} 
                    style={{ 
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      border: '2px solid white',
                      cursor: 'pointer',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.2)'
                    }}
                  />
                </motion.div>
                <div>
                  <Title level={4} style={{ margin: 0, color: 'white' }}>
                    <StarFilled /> Nova <StarFilled />  {/* ← Changé ici */}
                  </Title>
                  <Space>
                    <Badge status="success" color="#52c41a" />
                    <Text style={{ color: 'rgba(255,255,255,0.9)', fontSize: 12 }}>
                      <HeartOutlined /> Toujours là pour toi <HeartOutlined />
                    </Text>
                  </Space>
                </div>
              </Space>
            </Col>
            <Col>
              <Space>
                <Tooltip title="Nouvelle conversation">
                  <Button 
                    icon={<ClearOutlined />} 
                    onClick={clearConversation}
                    style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: 20 }}
                  />
                </Tooltip>
                <Tooltip title={fullscreen ? "Quitter plein écran" : "Plein écran"}>
                  <Button 
                    icon={fullscreen ? <CloseOutlined /> : <FullscreenOutlined />} 
                    onClick={() => setFullscreen(!fullscreen)}
                    style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: 20 }}
                  />
                </Tooltip>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Zone de messages */}
        <div style={{ 
          flex: 1, 
          overflowY: 'auto', 
          padding: '24px',
          background: '#fafaff'
        }}>
          <AnimatePresence>
            {messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                style={{ 
                  display: 'flex', 
                  justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 20
                }}
              >
                {msg.role === 'ai' && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Avatar 
                      src={assistantAvatar}
                      size={40} 
                      style={{ 
                        marginRight: 12, 
                        flexShrink: 0, 
                        border: '2px solid #667eea',
                        boxShadow: '0 4px 12px rgba(102,126,234,0.3)'
                      }} 
                    />
                  </motion.div>
                )}
                <div style={{ 
                  maxWidth: '70%',
                  minWidth: 100,
                  position: 'relative'
                }}>
                  <div style={{ 
                    padding: '12px 20px',
                    borderRadius: msg.role === 'user' ? '24px 24px 8px 24px' : '24px 24px 24px 8px',
                    background: msg.role === 'user' ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f0f2ff',
                    color: msg.role === 'user' ? '#ffffff' : '#2d2d5a',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    border: msg.role === 'ai' ? '1px solid #e8eaff' : 'none'
                  }}>
                    {msg.content}
                  </div>
                  <div style={{ 
                    fontSize: 10, 
                    color: '#999', 
                    marginTop: 4,
                    textAlign: msg.role === 'user' ? 'right' : 'left'
                  }}>
                    {formatTime(msg.timestamp)}
                  </div>
                  
                  {msg.role === 'ai' && msg.suggestions && msg.suggestions.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <Space wrap>
                        {msg.suggestions.map((suggestion, idx) => (
                          <Tag 
                            key={idx}
                            style={{ 
                              background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
                              borderColor: '#667eea',
                              color: '#667eea',
                              cursor: 'pointer',
                              borderRadius: 20,
                              padding: '4px 12px',
                              transition: 'all 0.3s'
                            }}
                            onClick={() => handleSend(suggestion)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.05)';
                              e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                              e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.background = 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)';
                              e.currentTarget.style.color = '#667eea';
                            }}
                          >
                            {suggestion}
                          </Tag>
                        ))}
                      </Space>
                    </div>
                  )}
                </div>
                {msg.role === 'user' && (
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Avatar 
                      icon={<UserOutlined />}
                      size={40} 
                      style={{ 
                        backgroundColor: '#52c41a', 
                        marginLeft: 12, 
                        flexShrink: 0,
                        boxShadow: '0 4px 12px rgba(82,196,26,0.3)'
                      }} 
                    />
                  </motion.div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          
          {(loading || isTyping) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 20 }}
            >
              <Avatar 
                src={assistantAvatar}
                size={40} 
                style={{ marginRight: 12, border: '2px solid #667eea' }} 
              />
              <div style={{ 
                padding: '12px 20px',
                borderRadius: '24px 24px 24px 8px',
                background: '#f0f2ff',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                border: '1px solid #e8eaff'
              }}>
                <Space>
                  <Spin size="small" />
                  <Text style={{ color: '#667eea' }}>Nova réfléchit... ✨</Text>
                </Space>
              </div>
            </motion.div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions rapides */}
        {showSuggestions && messages.length <= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            style={{ padding: '16px 24px', background: '#ffffff', borderTop: '1px solid #f0f0f0' }}
          >
            <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
              <BulbOutlined /> Suggestions pour toi
            </Text>
            <Space wrap>
              {['📊 Voir les statistiques', '📈 Rapport des ventes', '👥 Liste des clients', '💰 Factures en attente'].map((suggestion, idx) => (
                <Tag 
                  key={idx}
                  style={{ 
                    background: 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)',
                    borderColor: '#667eea',
                    color: '#667eea',
                    cursor: 'pointer',
                    borderRadius: 20,
                    padding: '4px 12px',
                    transition: 'all 0.3s'
                  }}
                  onClick={() => handleSend(suggestion)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                    e.currentTarget.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.background = 'linear-gradient(135deg, #667eea15 0%, #764ba215 100%)';
                    e.currentTarget.style.color = '#667eea';
                  }}
                >
                  {suggestion}
                </Tag>
              ))}
            </Space>
          </motion.div>
        )}

        {/* Zone de saisie */}
        <div style={{ 
          padding: '16px 24px', 
          background: '#ffffff', 
          borderTop: '1px solid #f0f0f0',
          borderRadius: '0 0 32px 32px'
        }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <Input 
              ref={inputRef}
              placeholder="Dis-moi tout... ✨"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={handleSend}
              size="large"
              disabled={loading}
              style={{ 
                borderRadius: 24, 
                borderColor: '#667eea',
                transition: 'all 0.3s'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#764ba2';
                e.target.style.boxShadow = '0 0 0 2px rgba(102,126,234,0.2)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = 'none';
              }}
            />
            <Space>
              <Tooltip title="Mode Vision IA">
                <Button 
                  shape="circle" 
                  icon={<CameraOutlined />} 
                  onClick={handleVisionAnalysis}
                  style={{ border: '1px solid #667eea', color: '#667eea' }}
                />
              </Tooltip>
              <Tooltip title="Saisie Vocale">
                <Button 
                  shape="circle" 
                  icon={<AudioOutlined />} 
                  onClick={() => {
                    setIsRecording(!isRecording);
                    if(!isRecording) message.info("Microphone activé... Parlez à Nova.");
                  }}
                  style={{ 
                    border: '1px solid #667eea', 
                    color: isRecording ? 'red' : '#667eea',
                    animation: isRecording ? 'pulse 1s infinite' : 'none'
                  }}
                />
              </Tooltip>
            </Space>
            <Button 
              type="primary" 
              icon={<SendOutlined />} 
              onClick={handleSend}
              loading={loading}
              size="large"
              style={{ 
                borderRadius: 24, 
                minWidth: 100,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                fontWeight: 'bold'
              }}
            >
              Envoyer
            </Button>
          </div>
          <div style={{ marginTop: 12, textAlign: 'center' }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <MessageOutlined /> Nova • Assistant IA • Réponses instantanées
            </Text>
          </div>
        </div>
      </Card>

      {/* MODAL VISION */}
      <Modal
        title={<Space><CameraOutlined /> Analyse Multimodale Nova</Space>}
        open={visionMode}
        onCancel={() => setVisionMode(false)}
        onOk={processVision}
        okText="Analyser l'image"
        cancelText="Fermer"
        width={600}
      >
        <div style={{ 
          height: 350, 
          background: '#000', 
          borderRadius: 12, 
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{ color: 'white', textAlign: 'center' }}>
            <ScanOutlined style={{ fontSize: 60, color: '#00d1ff', marginBottom: 16 }} />
            <p>FLUX CAMÉRA ACTIF</p>
            <Text type="secondary" style={{ color: 'rgba(255,255,255,0.5)' }}>Placez le document devant la caméra</Text>
          </div>
          <div className="vision-scanline" style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, height: 2,
            background: '#00d1ff',
            boxShadow: '0 0 10px #00d1ff',
            animation: 'scan 2s linear infinite'
          }} />
        </div>
      </Modal>

      <style jsx>{`
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100%; }
        }
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
      `}</style>
    </motion.div>
  );
};

export default AIAssistant;