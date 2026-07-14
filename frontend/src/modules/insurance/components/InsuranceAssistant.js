// src/modules/insurance/components/InsuranceAssistant.js (sans react-draggable)
import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, Input, Button, Space, Avatar, Tag, 
  Typography, Divider, List, Modal, Form,
  DatePicker, TimePicker, Select, message,
  Tooltip, Badge, Progress, Timeline
} from 'antd';
import { 
  RobotOutlined, SendOutlined, MailOutlined,
  CalendarOutlined, TeamOutlined, FileTextOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  PhoneOutlined, VideoCameraOutlined,
  EuroOutlined, WarningOutlined, SafetyCertificateOutlined,
  ThunderboltOutlined, ClockCircleOutlined,
  UserOutlined, PlusOutlined, DeleteOutlined,
  EditOutlined, ExportOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const InsuranceAssistant = ({ onClose, position }) => {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      type: 'bot', 
      text: "👋 Bonjour ! Je suis votre assistant administratif pour l'assurance. Je peux vous aider à gérer les emails, planifier des réunions, et automatiser vos tâches. Comment puis-je vous aider ?",
      time: new Date().toLocaleTimeString(),
      suggestions: [
        'Planifier une réunion',
        'Envoyer un email',
        'Gérer les sinistres',
        'Analyser fraude'
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [scheduledMeetings, setScheduledMeetings] = useState([]);
  const [pendingEmails, setPendingEmails] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [form] = Form.useForm();
  
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Charger les données depuis localStorage
  useEffect(() => {
    const savedMeetings = localStorage.getItem('insurance-meetings');
    if (savedMeetings) setScheduledMeetings(JSON.parse(savedMeetings));
    
    const savedEmails = localStorage.getItem('insurance-emails');
    if (savedEmails) setPendingEmails(JSON.parse(savedEmails));
    
    const savedTasks = localStorage.getItem('insurance-tasks');
    if (savedTasks) setRecentTasks(JSON.parse(savedTasks));
  }, []);

  // Sauvegarder les données
  const saveMeeting = (meeting) => {
    const newMeetings = [...scheduledMeetings, { ...meeting, id: Date.now(), status: 'planifié' }];
    setScheduledMeetings(newMeetings);
    localStorage.setItem('insurance-meetings', JSON.stringify(newMeetings));
    return newMeetings[newMeetings.length - 1];
  };

  const saveEmail = (email) => {
    const newEmails = [...pendingEmails, { ...email, id: Date.now(), status: 'brouillon' }];
    setPendingEmails(newEmails);
    localStorage.setItem('insurance-emails', JSON.stringify(newEmails));
    return newEmails[newEmails.length - 1];
  };

  const saveTask = (task) => {
    const newTasks = [...recentTasks, { ...task, id: Date.now(), timestamp: new Date().toISOString() }];
    setRecentTasks(newTasks.slice(-10)); // Garder seulement les 10 dernières
    localStorage.setItem('insurance-tasks', JSON.stringify(newTasks.slice(-10)));
  };

  // Fonction pour envoyer un email réel (simulé)
  const sendEmail = async (emailData) => {
    // Ici vous pouvez intégrer un service d'envoi d'email réel
    // Par exemple avec EmailJS, SendGrid, ou votre propre API
    
    // Simulation d'envoi
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return { success: true, messageId: 'MSG-' + Date.now() };
  };

  // Fonction pour créer une réunion (intégration Google Calendar, Outlook, etc.)
  const createMeeting = async (meetingData) => {
    
    // Ici vous pouvez intégrer Google Calendar API, Outlook API, etc.
    // Simulation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { 
      success: true, 
      meetingId: 'MEET-' + Date.now(),
      calendarLink: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(meetingData.title)}&dates=${meetingData.date}`
    };
  };

  // Fonction pour générer un rapport PDF
  const generateReport = async (type, data) => {
    
    // Ici vous pouvez intégrer une librairie comme jsPDF
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return { success: true, fileUrl: '/reports/rapport-' + Date.now() + '.pdf' };
  };

  // Analyse de la requête utilisateur avec NLP simulé
  const analyzeIntent = (message) => {
    const lowerMsg = message.toLowerCase();
    
    // Intentions de réunion
    if (lowerMsg.includes('réunion') || lowerMsg.includes('meet') || 
        lowerMsg.includes('rdv') || lowerMsg.includes('rencontre')) {
      return {
        type: 'meeting',
        confidence: 0.95,
        entities: extractMeetingEntities(message)
      };
    }
    
    // Intentions d'email
    if (lowerMsg.includes('email') || lowerMsg.includes('mail') || 
        lowerMsg.includes('envoyer') || lowerMsg.includes('contact')) {
      return {
        type: 'email',
        confidence: 0.92,
        entities: extractEmailEntities(message)
      };
    }
    
    // Intentions de rapport
    if (lowerMsg.includes('rapport') || lowerMsg.includes('report') || 
        lowerMsg.includes('pdf') || lowerMsg.includes('export')) {
      return {
        type: 'report',
        confidence: 0.88,
        entities: { type: extractReportType(message) }
      };
    }
    
    // Intentions de sinistre
    if (lowerMsg.includes('sinistre') || lowerMsg.includes('claim') || 
        lowerMsg.includes('accident')) {
      return {
        type: 'claim',
        confidence: 0.9,
        entities: extractClaimEntities(message)
      };
    }
    
    // Intentions de fraude
    if (lowerMsg.includes('fraude') || lowerMsg.includes('fraud') || 
        lowerMsg.includes('suspect') || lowerMsg.includes('doute')) {
      return {
        type: 'fraud',
        confidence: 0.93,
        entities: {}
      };
    }
    
    return { type: 'unknown', confidence: 0.3 };
  };

  // Extraction d'entités pour les réunions
  const extractMeetingEntities = (text) => {
    const entities = {
      title: extractTitle(text),
      date: extractDate(text),
      time: extractTime(text),
      participants: extractParticipants(text)
    };
    return entities;
  };

  // Extraction d'entités pour les emails
  const extractEmailEntities = (text) => {
    const entities = {
      to: extractEmailAddress(text),
      subject: extractSubject(text),
      body: extractBody(text)
    };
    return entities;
  };

  // Helpers d'extraction (simples simulations)
  const extractTitle = (text) => {
    const words = text.split(' ');
    return words.slice(0, 5).join(' ') + '...';
  };

  const extractDate = (text) => {
    // Simulation - retourne la date du jour + 1 jour
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().split('T')[0];
  };

  const extractTime = (text) => '14:00';

  const extractParticipants = (text) => ['client@email.com'];

  const extractEmailAddress = (text) => {
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
    const match = text.match(emailRegex);
    return match ? match[0] : 'contact@entreprise.com';
  };

  const extractSubject = (text) => 'Sujet de la réunion';

  const extractBody = (text) => text;

  const extractReportType = (text) => {
    if (text.includes('sinistre')) return 'claims';
    if (text.includes('fraude')) return 'fraud';
    if (text.includes('financier')) return 'financial';
    return 'general';
  };

  const extractClaimEntities = (text) => {
    return {
      id: extractClaimId(text),
      client: extractClientName(text)
    };
  };

  const extractClaimId = (text) => {
    const idRegex = /[A-Z]{3}-\d{4}/;
    const match = text.match(idRegex);
    return match ? match[0] : 'SIN-2025-123';
  };

  const extractClientName = (text) => {
    // Simulation
    return 'Client X';
  };

  // Générer une réponse intelligente
  const generateAIResponse = (intent, message) => {
    switch(intent.type) {
      case 'meeting':
        return {
          text: `📅 J'ai détecté que vous voulez planifier une réunion. Voulez-vous que je crée un événement pour "${intent.entities.title}" le ${intent.entities.date} à ${intent.entities.time} ?`,
          action: 'meeting',
          data: intent.entities
        };
        
      case 'email':
        return {
          text: `📧 Je peux vous aider à rédiger un email. À qui souhaitez-vous l'envoyer ?`,
          action: 'email',
          data: intent.entities
        };
        
      case 'report':
        return {
          text: `📊 Je génère un rapport ${intent.entities.type} pour vous...`,
          action: 'report',
          data: intent.entities
        };
        
      case 'claim':
        return {
          text: `🔍 Je cherche des informations sur le sinistre ${intent.entities.id} pour le client ${intent.entities.client}.`,
          action: 'claim',
          data: intent.entities
        };
        
      case 'fraud':
        return {
          text: `🚨 Je vais analyser les cas de fraude récents avec le système IA.`,
          action: 'fraud',
          data: {}
        };
        
      default:
        return {
          text: "Je peux vous aider à gérer vos réunions, envoyer des emails, générer des rapports ou analyser des sinistres. Que souhaitez-vous faire ?",
          action: null,
          data: {}
        };
    }
  };

  // Gestionnaire d'envoi de message
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      text: inputValue,
      time: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);
    setShowSuggestions(false);

    // Analyser l'intention
    const intent = analyzeIntent(inputValue);

    // Générer la réponse
    setTimeout(() => {
      const response = generateAIResponse(intent, inputValue);
      const botMessage = {
        id: messages.length + 2,
        type: 'bot',
        text: response.text,
        time: new Date().toLocaleTimeString(),
        action: response.action,
        data: response.data,
        suggestions: response.action ? [] : [
          'Planifier réunion',
          'Envoyer email',
          'Générer rapport',
          'Analyser sinistre'
        ]
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
      setShowSuggestions(true);

      // Si une action est détectée, ouvrir le modal correspondant
      if (response.action) {
        setPendingAction(response);
        setModalType(response.action);
        setModalVisible(true);
      }
    }, 1500);
  };

  // Gestionnaire de suggestion
  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    handleSendMessage();
  };

  // Gestionnaire de création de réunion
  const handleCreateMeeting = async (values) => {
    const meetingData = {
      ...values,
      date: values.date.format('YYYY-MM-DD'),
      time: values.time.format('HH:mm'),
      created: new Date().toISOString()
    };

    try {
      const result = await createMeeting(meetingData);
      const savedMeeting = saveMeeting(meetingData);
      
      message.success(`✅ Réunion créée avec succès ! ID: ${result.meetingId}`);
      
      const botMessage = {
        id: messages.length + 3,
        type: 'bot',
        text: `✅ Réunion "${meetingData.title}" programmée pour le ${meetingData.date} à ${meetingData.time}. Un lien d'invitation a été généré.`,
        time: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, botMessage]);
      
      saveTask({ type: 'meeting', description: `Réunion: ${meetingData.title}`, result: 'succès' });
      
    } catch (error) {
      message.error('❌ Erreur lors de la création de la réunion');
    }
    
    setModalVisible(false);
    form.resetFields();
  };

  // Gestionnaire d'envoi d'email
  const handleSendEmail = async (values) => {
    try {
      const result = await sendEmail(values);
      const savedEmail = saveEmail(values);
      
      message.success(`📧 Email envoyé avec succès ! ID: ${result.messageId}`);
      
      const botMessage = {
        id: messages.length + 3,
        type: 'bot',
        text: `📧 Email envoyé à ${values.to} avec le sujet "${values.subject}"`,
        time: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, botMessage]);
      
      saveTask({ type: 'email', description: `Email à: ${values.to}`, result: 'succès' });
      
    } catch (error) {
      message.error('❌ Erreur lors de l\'envoi de l\'email');
    }
    
    setModalVisible(false);
    form.resetFields();
  };

  // Gestionnaire de génération de rapport
  const handleGenerateReport = async (values) => {
    try {
      const result = await generateReport(values.type, values);
      
      message.success(`📊 Rapport généré avec succès !`);
      
      const botMessage = {
        id: messages.length + 3,
        type: 'bot',
        text: `📊 Rapport ${values.type} généré. Vous pouvez le télécharger.`,
        time: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, botMessage]);
      
      saveTask({ type: 'report', description: `Rapport: ${values.type}`, result: 'succès' });
      
    } catch (error) {
      message.error('❌ Erreur lors de la génération du rapport');
    }
    
    setModalVisible(false);
    form.resetFields();
  };

  // Rendu des modals
  const renderModal = () => {
    switch(modalType) {
      case 'meeting':
        return (
          <Modal
            title={<><CalendarOutlined /> Créer une réunion</>}
            open={modalVisible}
            onCancel={() => setModalVisible(false)}
            footer={null}
            width={500}
          >
            <Form form={form} layout="vertical" onFinish={handleCreateMeeting}>
              <Form.Item name="title" label="Titre" rules={[{ required: true }]}>
                <Input placeholder="Ex: Réunion sinistre Client X" />
              </Form.Item>
              
              <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
              
              <Form.Item name="time" label="Heure" rules={[{ required: true }]}>
                <TimePicker style={{ width: '100%' }} format="HH:mm" />
              </Form.Item>
              
              <Form.Item name="participants" label="Participants">
                <Select mode="tags" placeholder="Emails des participants">
                  <Option value="client1@email.com">Client 1</Option>
                  <Option value="expert@assurance.fr">Expert</Option>
                </Select>
              </Form.Item>
              
              <Form.Item name="description" label="Description">
                <TextArea rows={3} />
              </Form.Item>
              
              <Form.Item>
                <Button type="primary" htmlType="submit" block>
                  Créer la réunion
                </Button>
              </Form.Item>
            </Form>
          </Modal>
        );
        
      case 'email':
        return (
          <Modal
            title={<><MailOutlined /> Envoyer un email</>}
            open={modalVisible}
            onCancel={() => setModalVisible(false)}
            footer={null}
            width={500}
          >
            <Form form={form} layout="vertical" onFinish={handleSendEmail}>
              <Form.Item name="to" label="Destinataire" rules={[{ required: true, type: 'email' }]}>
                <Input placeholder="email@exemple.com" />
              </Form.Item>
              
              <Form.Item name="subject" label="Sujet" rules={[{ required: true }]}>
                <Input placeholder="Sujet de l'email" />
              </Form.Item>
              
              <Form.Item name="body" label="Message" rules={[{ required: true }]}>
                <TextArea rows={5} placeholder="Votre message..." />
              </Form.Item>
              
              <Form.Item name="attachments" label="Pièces jointes">
                <Select mode="tags" placeholder="Ajouter des pièces jointes">
                  <Option value="rapport.pdf">rapport.pdf</Option>
                  <Option value="sinistre.pdf">sinistre.pdf</Option>
                </Select>
              </Form.Item>
              
              <Form.Item>
                <Button type="primary" htmlType="submit" block>
                  Envoyer l'email
                </Button>
              </Form.Item>
            </Form>
          </Modal>
        );
        
      case 'report':
        return (
          <Modal
            title={<><FileTextOutlined /> Générer un rapport</>}
            open={modalVisible}
            onCancel={() => setModalVisible(false)}
            footer={null}
            width={500}
          >
            <Form form={form} layout="vertical" onFinish={handleGenerateReport}>
              <Form.Item name="type" label="Type de rapport" rules={[{ required: true }]}>
                <Select>
                  <Option value="claims">Rapport sinistres</Option>
                  <Option value="fraud">Rapport anti-fraude</Option>
                  <Option value="financial">Rapport financier</Option>
                  <Option value="performance">Rapport performance</Option>
                </Select>
              </Form.Item>
              
              <Form.Item name="period" label="Période">
                <RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
              
              <Form.Item name="format" label="Format">
                <Select defaultValue="pdf">
                  <Option value="pdf">PDF</Option>
                  <Option value="excel">Excel</Option>
                  <Option value="csv">CSV</Option>
                </Select>
              </Form.Item>
              
              <Form.Item>
                <Button type="primary" htmlType="submit" block>
                  Générer le rapport
                </Button>
              </Form.Item>
            </Form>
          </Modal>
        );
        
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      style={{
        position: 'fixed',
        bottom: 100,
        right: 30,
        width: '350px',
        zIndex: 10000,
        pointerEvents: 'auto'
      }}
    >
      <div className="insurance-assistant-card">
        {/* En-tête */}
        <div className="assistant-header">
          <Space>
            <Avatar icon={<RobotOutlined />} style={{ background: '#52c41a' }} />
            <div>
              <Text strong style={{ color: 'white' }}>Assistante Administrative</Text>
              <br />
              <Badge status="processing" text="En ligne" style={{ color: '#a6d7ff' }} />
            </div>
          </Space>
          <Button 
            type="text" 
            icon={<CloseCircleOutlined style={{ color: 'white' }} />}
            onClick={onClose}
            size="small"
          />
        </div>

        {/* Messages */}
        <div className="assistant-messages">
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`message ${msg.type === 'user' ? 'user-message' : 'bot-message'}`}
            >
              {msg.type === 'bot' && (
                <Avatar icon={<RobotOutlined />} size="small" style={{ background: '#52c41a', marginRight: 8 }} />
              )}
              <div className="message-content">
                <div className="message-text">{msg.text}</div>
                <div className="message-time">{msg.time}</div>
              </div>
              {msg.type === 'user' && (
                <Avatar icon={<UserOutlined />} size="small" style={{ background: '#1890ff', marginLeft: 8 }} />
              )}
            </motion.div>
          ))}
          
          {isTyping && (
            <div className="typing-indicator">
              <Avatar icon={<RobotOutlined />} size="small" style={{ background: '#52c41a', marginRight: 8 }} />
              <div className="typing-dots">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        {showSuggestions && (
          <div className="assistant-suggestions">
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 12 }}>Suggestions :</Text>
            <div className="suggestion-tags">
              {['Planifier réunion', 'Envoyer email', 'Générer rapport', 'Analyser sinistre'].map((sugg, idx) => (
                <Tag
                  key={idx}
                  className="suggestion-tag"
                  onClick={() => handleSuggestionClick(sugg)}
                >
                  {sugg}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {/* Récapitulatif des tâches */}
        {recentTasks.length > 0 && (
          <div className="assistant-tasks">
            <Divider style={{ margin: '8px 0' }}>Tâches récentes</Divider>
            <Timeline size="small">
              {recentTasks.slice(-3).map(task => (
                <Timeline.Item key={task.id} color="green">
                  <Text style={{ fontSize: 11 }}>{task.description}</Text>
                </Timeline.Item>
              ))}
            </Timeline>
          </div>
        )}

        {/* Input */}
        <div className="assistant-input">
          <Input.TextArea
            rows={2}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Par exemple: 'Planifie une réunion demain' ou 'Envoie un email au client'"
            onPressEnter={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSendMessage}
            style={{ marginTop: 8, width: '100%', background: '#52c41a', borderColor: '#52c41a' }}
          >
            Envoyer
          </Button>
        </div>

        {/* Modal contextuel */}
        {renderModal()}

        <style>{`
          .insurance-assistant-card {
            width: 100%;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            overflow: hidden;
            border: 1px solid #52c41a;
          }

          .assistant-header {
            background: linear-gradient(135deg, #52c41a, #73d13d);
            padding: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: default;
          }

          .assistant-messages {
            height: 300px;
            overflow-y: auto;
            padding: 12px;
            background: #f8f9fa;
          }

          .message {
            display: flex;
            margin-bottom: 12px;
            animation: slideIn 0.3s ease;
          }

          .user-message {
            justify-content: flex-end;
          }

          .message-content {
            max-width: 80%;
            padding: 8px 12px;
            border-radius: 12px;
            background: white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
          }

          .user-message .message-content {
            background: #52c41a;
            color: white;
          }

          .message-text {
            font-size: 13px;
            white-space: pre-wrap;
            word-break: break-word;
          }

          .message-time {
            font-size: 10px;
            color: #999;
            margin-top: 4px;
            text-align: right;
          }

          .user-message .message-time {
            color: rgba(255,255,255,0.8);
          }

          .typing-indicator {
            display: flex;
            align-items: center;
            margin-bottom: 12px;
          }

          .typing-dots {
            display: flex;
            gap: 4px;
            padding: 8px 12px;
            background: white;
            border-radius: 12px;
          }

          .typing-dots span {
            width: 8px;
            height: 8px;
            background: #52c41a;
            border-radius: 50%;
            animation: bounce 1.4s infinite;
          }

          .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
          .typing-dots span:nth-child(3) { animation-delay: 0.4s; }

          @keyframes bounce {
            0%, 60%, 100% { transform: translateY(0); }
            30% { transform: translateY(-5px); }
          }

          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .assistant-suggestions {
            padding: 8px 12px;
            background: white;
            border-top: 1px solid #f0f0f0;
          }

          .suggestion-tags {
            display: flex;
            flex-wrap: wrap;
            gap: 4px;
            margin-top: 4px;
          }

          .suggestion-tag {
            cursor: pointer;
            background: #f6ffed;
            border-color: #b7eb8f;
            color: #52c41a;
            padding: 4px 8px;
            border-radius: 16px;
            font-size: 12px;
            transition: all 0.2s;
          }

          .suggestion-tag:hover {
            background: #52c41a;
            color: white;
            transform: scale(1.05);
          }

          .assistant-tasks {
            padding: 0 12px 8px;
          }

          .assistant-input {
            padding: 12px;
            border-top: 1px solid #f0f0f0;
            background: white;
          }
        `}</style>
      </div>
    </motion.div>
  );
};

export default InsuranceAssistant;