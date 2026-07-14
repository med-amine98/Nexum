import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  SendOutlined, 
  CloseOutlined,
  RobotOutlined,
  UserOutlined,
  BulbOutlined,
  SoundOutlined,
  DeleteOutlined,
  DownloadOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  RiseOutlined,
  NotificationOutlined,
  CheckCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { 
  Input, 
  Button, 
  Avatar, 
  Space, 
  Tag, 
  Tooltip, 
  Popconfirm, 
  Badge, 
  message, 
  Divider, 
  List,
  Typography,
  Card
} from 'antd';
import { useCopilot } from '../../hooks/useCopilot';
import { useAssistantCommunication } from '../../hooks/useAssistantCommunication';
import CopilotSuggestions from './CopilotSuggestions';
import './Copilot.css';

const { Text, Paragraph } = Typography;

const CopilotChat = ({ onClose }) => {
  const { 
    messages, 
    isTyping, 
    sendMessage,
    executeSuggestion,
    clearConversation,
    exportHistory 
  } = useCopilot();
  
  // Communication avec les assistants
  const { 
    sendToAssistant, 
    sendNotification,
    delegateTask,
    requestAnalysis,
    inbox, 
    notifications,
    unreadCount,
    unreadNotifications,
    activeConversations,
    getConversationWith,
    markAsRead,
    markNotificationAsRead,
    getStats
  } = useAssistantCommunication('copilot');
  
  const [inputValue, setInputValue] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [context, setContext] = useState('dashboard');
  const [showAssistantMenu, setShowAssistantMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [assistantMessages, setAssistantMessages] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  
  // État pour les réponses des assistants
  const [assistantResponses, setAssistantResponses] = useState([]);
  const [showResponse, setShowResponse] = useState(false);
  const [currentResponse, setCurrentResponse] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);
  const responseTimerRef = useRef(null);

  // Détecter le contexte basé sur l'URL
  useEffect(() => {
    const path = window.location.pathname;
    if (path.includes('sale') || path.includes('ventes')) setContext('sales');
    else if (path.includes('crm')) setContext('crm');
    else if (path.includes('account')) setContext('accounting');
    else if (path.includes('stock')) setContext('stock');
    else if (path.includes('hr')) setContext('hr');
    else if (path.includes('banking')) setContext('banking');
    else if (path.includes('insurance')) setContext('insurance');
    else if (path.includes('assistant/predict')) setContext('predict');
    else if (path.includes('assistant/risk')) setContext('risk');
    else if (path.includes('assistant/growth')) setContext('growth');
    else setContext('dashboard');
  }, []);

  // Écouter les messages des assistants
  useEffect(() => {
    const newMessages = inbox.filter(m => !m.read && m.from !== 'copilot');
    
    newMessages.forEach(msg => {
      // Traiter selon le type de message
      if (msg.content.type === 'delegation_response') {
        handleDelegationResponse(msg);
      } else if (msg.content.type === 'analysis_response') {
        handleAnalysisResponse(msg);
      } else {
        // Créer une réponse attrayante
        const response = createAssistantResponse(msg);
        setAssistantResponses(prev => [response, ...prev].slice(0, 5));
        
        // Afficher la réponse
        setCurrentResponse(response);
        setShowResponse(true);
        
        // Auto-cacher après 8 secondes
        if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
        responseTimerRef.current = setTimeout(() => {
          setShowResponse(false);
        }, 8000);
        
        // Ajouter aux messages assistants
        setAssistantMessages(prev => [msg, ...prev].slice(0, 10));
      }
      
      markAsRead(msg.id);
    });
  }, [inbox, markAsRead]);

  // Écouter les notifications
  useEffect(() => {
    const newNotifications = notifications.filter(n => !n.read);
    
    newNotifications.forEach(notif => {
      // Créer une réponse pour la notification
      const response = createNotificationResponse(notif);
      setAssistantResponses(prev => [response, ...prev].slice(0, 5));
      
      setCurrentResponse(response);
      setShowResponse(true);
      
      if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
      responseTimerRef.current = setTimeout(() => {
        setShowResponse(false);
      }, 6000);
      
      setAssistantMessages(prev => [notif, ...prev].slice(0, 10));
    });
  }, [notifications]);

  // Nettoyer le timer
  useEffect(() => {
    return () => {
      if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    };
  }, []);

  // Auto-scroll vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus sur l'input à l'ouverture
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Créer une réponse attrayante d'assistant
  const createAssistantResponse = (msg) => {
    const assistantName = getAssistantName(msg.from);
    const assistantColor = getAssistantColor(msg.from);
    const assistantIcon = getAssistantIcon(msg.from);
    
    let title = "Message de l'assistant";
    let content = msg.content?.message || 'Nouveau message';
    let details = [];
    let recommendation = '';
    let confidence = null;
    
    // Personnaliser selon le type
    if (msg.content.type === 'analysis') {
      title = "📊 Analyse terminée";
      details = ["Résultats disponibles", "Cliquez pour voir les détails"];
    } else if (msg.content.type === 'alert') {
      title = "🚨 Alerte importante";
      recommendation = "Action recommandée";
    }
    
    return {
      id: msg.id,
      assistant: msg.from,
      name: assistantName,
      color: assistantColor,
      icon: assistantIcon,
      title: title,
      content: content,
      details: details,
      recommendation: recommendation,
      confidence: confidence,
      timestamp: msg.timestamp || new Date()
    };
  };

  // Créer une réponse pour les notifications
  const createNotificationResponse = (notif) => {
    const assistantName = getAssistantName(notif.from);
    const assistantColor = getAssistantColor(notif.from);
    const assistantIcon = getAssistantIcon(notif.from);
    
    let bgColor = '#1890ff';
    let icon = <NotificationOutlined />;
    
    switch(notif.severity) {
      case 'success':
        bgColor = '#52c41a';
        icon = <CheckCircleOutlined />;
        break;
      case 'warning':
        bgColor = '#faad14';
        icon = <WarningOutlined />;
        break;
      case 'error':
        bgColor = '#f5222d';
        icon = <CloseOutlined />;
        break;
    }
    
    return {
      id: notif.id,
      assistant: notif.from,
      name: assistantName,
      color: assistantColor,
      icon: assistantIcon,
      title: notif.title || 'Notification',
      content: notif.message,
      details: [],
      recommendation: notif.action || '',
      confidence: null,
      severity: notif.severity,
      bgColor: bgColor,
      severityIcon: icon,
      timestamp: notif.timestamp || new Date()
    };
  };

  // Gérer la réponse à une délégation
  const handleDelegationResponse = (msg) => {
    const { status, response } = msg.content;
    
    if (status === 'completed') {
      message.success(`✅ Tâche terminée par ${getAssistantName(msg.from)}`);
      
      // Créer une réponse de succès
      const successResponse = {
        id: msg.id,
        assistant: msg.from,
        name: getAssistantName(msg.from),
        color: getAssistantColor(msg.from),
        icon: getAssistantIcon(msg.from),
        title: "✅ Tâche accomplie",
        content: response,
        details: ["Tâche terminée avec succès"],
        recommendation: "Voir les résultats",
        confidence: 100,
        timestamp: new Date()
      };
      
      setAssistantResponses(prev => [successResponse, ...prev].slice(0, 5));
      setCurrentResponse(successResponse);
      setShowResponse(true);
      
      if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
      responseTimerRef.current = setTimeout(() => {
        setShowResponse(false);
      }, 8000);
      
      // Retirer des tâches en attente
      setPendingTasks(prev => prev.filter(t => t.id !== msg.content.originalTaskId));
    } else {
      message.warning(`⚠️ ${getAssistantName(msg.from)}: ${response}`);
    }
  };

  // Gérer la réponse à une analyse
  const handleAnalysisResponse = (msg) => {
    const { results } = msg.content;
    
    // Créer une réponse d'analyse
    const analysisResponse = {
      id: msg.id,
      assistant: msg.from,
      name: getAssistantName(msg.from),
      color: getAssistantColor(msg.from),
      icon: getAssistantIcon(msg.from),
      title: "📊 Analyse complétée",
      content: "Analyse terminée avec succès",
      details: results?.summary || ["Résultats disponibles"],
      recommendation: "Explorer les données",
      confidence: results?.confidence || 95,
      data: results,
      timestamp: new Date()
    };
    
    setAssistantResponses(prev => [analysisResponse, ...prev].slice(0, 5));
    setCurrentResponse(analysisResponse);
    setShowResponse(true);
    
    if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
    responseTimerRef.current = setTimeout(() => {
      setShowResponse(false);
    }, 10000);
    
    message.success(`📊 Analyse reçue de ${getAssistantName(msg.from)}`);
  };

  // Déléguer une tâche à un assistant
  const delegateToAssistant = (assistantId, task, priority = 'medium') => {
    const taskId = Date.now();
    
    delegateTask(assistantId, task, priority);
    
    // Ajouter aux tâches en attente
    setPendingTasks(prev => [...prev, {
      id: taskId,
      assistant: assistantId,
      task: task,
      priority: priority,
      timestamp: new Date()
    }]);
    
    message.success(`🤖 Tâche déléguée à ${getAssistantName(assistantId)}`);
  };

  // Demander une analyse à un assistant
  const askAssistant = (assistantId, query, data = {}) => {
    requestAnalysis(assistantId, query, data);
    message.info(`🔍 Question envoyée à ${getAssistantName(assistantId)}`);
  };

  // Envoyer une notification
  const sendNotificationTo = (assistantId, notif) => {
    sendNotification(assistantId, notif);
  };

  // Obtenir le nom de l'assistant
  const getAssistantName = (id) => {
    const names = {
      'predict': 'Nexy Predict',
      'risk': 'Nexy Risk',
      'growth': 'Nexy Growth',
      'copilot': 'Copilot'
    };
    return names[id] || id;
  };

  // Obtenir l'icône de l'assistant
  const getAssistantIcon = (id) => {
    const icons = {
      'predict': <BankOutlined style={{ color: '#1890ff' }} />,
      'risk': <SafetyCertificateOutlined style={{ color: '#52c41a' }} />,
      'growth': <RiseOutlined style={{ color: '#722ed1' }} />
    };
    return icons[id] || <RobotOutlined />;
  };

  // Obtenir la couleur de l'assistant
  const getAssistantColor = (id) => {
    const colors = {
      'predict': '#1890ff',
      'risk': '#52c41a',
      'growth': '#722ed1'
    };
    return colors[id] || '#4158D0';
  };

  // Gérer l'envoi avec détection de commande spéciale
  const handleSend = async () => {
    if (!inputValue.trim()) return;
    
    const command = inputValue.toLowerCase();
    
    // Commandes spéciales
    if (command.startsWith('/predict ')) {
      const query = inputValue.substring(9);
      askAssistant('predict', query);
      setInputValue('');
      return;
    }
    
    if (command.startsWith('/risk ')) {
      const query = inputValue.substring(6);
      askAssistant('risk', query);
      setInputValue('');
      return;
    }
    
    if (command.startsWith('/growth ')) {
      const query = inputValue.substring(8);
      askAssistant('growth', query);
      setInputValue('');
      return;
    }
    
    if (command.startsWith('/delegate ')) {
      const parts = inputValue.substring(10).split(' ');
      if (parts.length >= 2) {
        const assistant = parts[0];
        const task = parts.slice(1).join(' ');
        delegateToAssistant(assistant, task);
        setInputValue('');
        return;
      }
    }
    
    if (command.startsWith('/notify ')) {
      const parts = inputValue.substring(8).split(' ');
      if (parts.length >= 2) {
        const assistant = parts[0];
        const notifMsg = parts.slice(1).join(' ');
        sendNotificationTo(assistant, {
          title: 'Notification du Copilot',
          message: notifMsg,
          severity: 'info'
        });
        setInputValue('');
        return;
      }
    }
    
    // Commande normale
    await sendMessage(inputValue);
    setInputValue('');
  };

  // Gérer la saisie vocale
  const toggleVoice = () => {
    setIsListening(!isListening);
    if (!isListening) {
      setTimeout(() => {
        setIsListening(false);
        setInputValue("Crée un nouveau client");
      }, 2000);
    }
  };

  // Gérer la sélection d'une suggestion
  const handleSuggestionSelect = (suggestion) => {
    setInputValue(suggestion.action);
    setTimeout(() => {
      handleSend();
    }, 500);
  };

  // Formater le timestamp
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="copilot-chat" ref={chatContainerRef}>
      {/* Bulle de réponse flottante */}
      <AnimatePresence>
        {showResponse && currentResponse && (
          <motion.div
            className="floating-response"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              position: 'fixed',
              bottom: 100,
              right: 30,
              width: 350,
              zIndex: 10001,
              pointerEvents: 'auto'
            }}
          >
            <Card
              className={`assistant-response-card ${currentResponse.severity || 'info'}`}
              style={{
                borderRadius: 16,
                boxShadow: `0 15px 35px ${currentResponse.color}40`,
                border: `1px solid ${currentResponse.color}30`,
                overflow: 'hidden'
              }}
            >
              {/* En-tête */}
              <div className="response-header" style={{
                background: `linear-gradient(135deg, ${currentResponse.color}, ${currentResponse.color}dd)`,
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: 12
              }}>
                <Avatar 
                  icon={currentResponse.icon || currentResponse.severityIcon} 
                  style={{ background: 'white', color: currentResponse.color }} 
                />
                <div style={{ flex: 1 }}>
                  <Text strong style={{ color: 'white', fontSize: 14 }}>{currentResponse.name}</Text>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Tag color="white" style={{ color: currentResponse.color, border: 'none' }}>
                      {currentResponse.title}
                    </Tag>
                    {currentResponse.confidence && (
                      <Tag color="white" style={{ color: currentResponse.color, border: 'none' }}>
                        Confiance {currentResponse.confidence}%
                      </Tag>
                    )}
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

              {/* Corps */}
              <div style={{ padding: 16 }}>
                <div style={{ 
                  background: '#f8f9fa', 
                  borderRadius: 12, 
                  padding: 12,
                  marginBottom: 12
                }}>
                  <Text style={{ fontSize: 15, display: 'block' }}>
                    {currentResponse.content}
                  </Text>
                </div>

                {currentResponse.details?.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    {currentResponse.details.map((detail, idx) => (
                      <div key={idx} style={{
                        padding: '8px 12px',
                        borderBottom: idx < currentResponse.details.length - 1 ? '1px dashed #f0f0f0' : 'none',
                        fontSize: 14,
                        color: "var(--text-primary)"
                      }}>
                        {detail}
                      </div>
                    ))}
                  </div>
                )}

                {currentResponse.recommendation && (
                  <div style={{
                    background: `${currentResponse.color}10`,
                    padding: '10px 12px',
                    borderRadius: 8,
                    borderLeft: `3px solid ${currentResponse.color}`,
                    marginBottom: 8
                  }}>
                    <Text>{currentResponse.recommendation}</Text>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {formatTime(currentResponse.timestamp)}
                  </Text>
                  <Button type="link" size="small" style={{ color: currentResponse.color }}>
                    Voir détails
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reste du composant existant... */}
      {/* En-tête */}
      <div className="chat-header">
        <Space>
          <Avatar icon={<RobotOutlined />} style={{ backgroundColor: '#4158D0' }} />
          <div>
            <div className="chat-title">Copilot ERP</div>
            <div className="chat-status">
              <Badge status="success" text="En ligne" />
            </div>
          </div>
        </Space>
        <Space>
          {/* Notifications */}
          <Badge count={unreadNotifications} offset={[-5, 5]}>
            <Tooltip title="Notifications">
              <Button 
                type="text" 
                icon={<NotificationOutlined />} 
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ color: '#faad14' }}
              />
            </Tooltip>
          </Badge>
          
          {/* Messages assistants */}
          <Badge count={unreadCount} offset={[-5, 5]}>
            <Tooltip title="Messages des assistants">
              <Button 
                type="text" 
                icon={<RobotOutlined />} 
                onClick={() => setShowAssistantMenu(!showAssistantMenu)}
                style={{ color: '#4158D0' }}
              />
            </Tooltip>
          </Badge>
          
          <Tooltip title="Exporter">
            <Button type="text" icon={<DownloadOutlined />} onClick={exportHistory} />
          </Tooltip>
          
          <Popconfirm title="Effacer la conversation ?" onConfirm={clearConversation}>
            <Tooltip title="Nouvelle conversation">
              <Button type="text" icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
          
          <Button type="text" icon={<CloseOutlined />} onClick={onClose} />
        </Space>
      </div>

      {/* Panneau des notifications */}
      <AnimatePresence>
        {showNotifications && (
          <motion.div 
            className="notifications-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="notifications-header">
              <span>Notifications</span>
              <Button type="link" size="small" onClick={() => setShowNotifications(false)}>
                Fermer
              </Button>
            </div>
            <List
              size="small"
              dataSource={notifications.slice(0, 5)}
              renderItem={item => (
                <List.Item className={`notification-item ${item.severity}`}>
                  <List.Item.Meta
                    avatar={getAssistantIcon(item.from)}
                    title={item.title}
                    description={item.message}
                  />
                  <span className="notification-time">
                    {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </List.Item>
              )}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menu des assistants */}
      <AnimatePresence>
        {showAssistantMenu && (
          <motion.div 
            className="assistant-quick-menu"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="assistant-menu-content">
              <div className="assistant-menu-title">Assistants disponibles</div>
              
              {/* Statut des assistants */}
              <div className="assistant-status-list">
                <div className="assistant-status-item">
                  <Badge status="success" />
                  <BankOutlined style={{ color: '#1890ff' }} />
                  <span>Nexy Predict</span>
                  {activeConversations.includes('predict') && 
                    <Tag size="small" color="blue">actif</Tag>
                  }
                </div>
                <div className="assistant-status-item">
                  <Badge status="success" />
                  <SafetyCertificateOutlined style={{ color: '#52c41a' }} />
                  <span>Nexy Risk</span>
                  {activeConversations.includes('risk') && 
                    <Tag size="small" color="green">actif</Tag>
                  }
                </div>
                <div className="assistant-status-item">
                  <Badge status="success" />
                  <RiseOutlined style={{ color: '#722ed1' }} />
                  <span>Nexy Growth</span>
                  {activeConversations.includes('growth') && 
                    <Tag size="small" color="purple">actif</Tag>
                  }
                </div>
              </div>

              <Divider style={{ margin: '8px 0' }} />

              {/* Tâches en cours */}
              {pendingTasks.length > 0 && (
                <>
                  <div className="assistant-menu-title">Tâches en cours</div>
                  {pendingTasks.map(task => (
                    <div key={task.id} className="pending-task-item">
                      <Space direction="vertical" size={0}>
                        <Text strong>{task.task}</Text>
                        <Space size={4}>
                          {getAssistantIcon(task.assistant)}
                          <Text type="secondary">{getAssistantName(task.assistant)}</Text>
                          <Tag color={task.priority === 'high' ? 'red' : 'blue'}>
                            {task.priority}
                          </Tag>
                        </Space>
                      </Space>
                    </div>
                  ))}
                  <Divider style={{ margin: '8px 0' }} />
                </>
              )}

              <div className="assistant-menu-title">Actions rapides</div>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button 
                  size="small"
                  block 
                  icon={<BankOutlined />}
                  onClick={() => setInputValue('/delegate predict ')}
                >
                  Déléguer à Predict
                </Button>
                <Button 
                  size="small"
                  block 
                  icon={<SafetyCertificateOutlined />}
                  onClick={() => setInputValue('/delegate risk ')}
                >
                  Déléguer à Risk
                </Button>
                <Button 
                  size="small"
                  block 
                  icon={<RiseOutlined />}
                  onClick={() => setInputValue('/delegate growth ')}
                >
                  Déléguer à Growth
                </Button>
              </Space>

              <Divider style={{ margin: '8px 0' }} />

              <div className="assistant-menu-title">Commandes</div>
              <Space wrap size={[4, 4]}>
                <Tag color="blue" style={{ cursor: 'pointer' }} onClick={() => setInputValue('/predict ')}>
                  /predict
                </Tag>
                <Tag color="green" style={{ cursor: 'pointer' }} onClick={() => setInputValue('/risk ')}>
                  /risk
                </Tag>
                <Tag color="purple" style={{ cursor: 'pointer' }} onClick={() => setInputValue('/growth ')}>
                  /growth
                </Tag>
                <Tag color="orange" style={{ cursor: 'pointer' }} onClick={() => setInputValue('/notify ')}>
                  /notify
                </Tag>
              </Space>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Suggestions intelligentes */}
      <div className="suggestions-container">
        <CopilotSuggestions 
          context={context}
          history={messages}
          onSelect={handleSuggestionSelect}
        />
      </div>

      {/* Messages des assistants */}
      {assistantMessages.length > 0 && (
        <div className="assistant-messages-preview">
          {assistantMessages.slice(0, 2).map(msg => (
            <div key={msg.id} className="assistant-message-preview">
              <Space>
                {getAssistantIcon(msg.from)}
                <Text type="secondary">{getAssistantName(msg.from)}</Text>
                <Text>{msg.message || msg.content?.message || 'Nouveau message'}</Text>
              </Space>
            </div>
          ))}
        </div>
      )}

      {/* Messages principaux */}
      <div className="chat-messages-container">
        <div className="chat-messages">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`message ${msg.type === 'user' ? 'user' : msg.type === 'system' ? 'system' : 'assistant'}`}
            >
              <Avatar
                icon={msg.type === 'user' ? <UserOutlined /> : 
                      msg.type === 'system' ? <RobotOutlined /> : <RobotOutlined />}
                size={32}
                style={{ 
                  backgroundColor: msg.type === 'user' ? '#C850C0' : 
                                 msg.type === 'system' ? '#faad14' : '#4158D0'
                }}
              />
              <div className="message-content">
                <div className="message-bubble">
                  <div className="message-text">{msg.content}</div>
                  {msg.data && (
                    <div className="message-data">
                      <pre>{JSON.stringify(msg.data, null, 2)}</pre>
                    </div>
                  )}
                </div>
                <div className="message-time">{formatTime(msg.timestamp)}</div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="message assistant">
              <Avatar icon={<RobotOutlined />} size={32} style={{ backgroundColor: '#4158D0' }} />
              <div className="typing-indicator">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="chat-input-container">
        <div className="chat-input">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onPressEnter={handleSend}
            placeholder={isListening ? "J'écoute..." : "/predict, /risk, /growth, /delegate, /notify..."}
            disabled={isListening}
            prefix={isListening && <SoundOutlined spin style={{ color: '#ff4d4f' }} />}
            suffix={
              <Space>
                {inputValue.startsWith('/') && (
                  <Tag color="processing">Cmd</Tag>
                )}
                <Tooltip title="Commande vocale">
                  <Button
                    type="text"
                    icon={<SoundOutlined />}
                    onClick={toggleVoice}
                  />
                </Tooltip>
              </Space>
            }
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            style={{ backgroundColor: '#4158D0' }}
          />
        </div>

        {/* Raccourcis */}
        <div className="chat-shortcuts">
          <Tag>Ctrl+K</Tag>
          <Tag color="blue">/predict</Tag>
          <Tag color="green">/risk</Tag>
          <Tag color="purple">/growth</Tag>
          <Tag color="orange">/notify</Tag>
        </div>
      </div>
    </div>
  );
};

export default CopilotChat;