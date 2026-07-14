// src/modules/banking/components/BankingAssistant.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, Input, Button, Space, Avatar, Tag, 
  Typography, Divider, List, Modal, Form,
  DatePicker, TimePicker, Select, message,
  Tooltip, Badge, Progress, Timeline, Radio,
  Checkbox, Alert, Steps, Row, Col  // ← AJOUT de Row et Col
} from 'antd';
import { 
  RobotOutlined, SendOutlined, MailOutlined,
  CalendarOutlined, TeamOutlined, FileTextOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  PhoneOutlined, VideoCameraOutlined,
  EuroOutlined, WarningOutlined, SafetyCertificateOutlined,
  ThunderboltOutlined, ClockCircleOutlined,
  UserOutlined, PlusOutlined, DeleteOutlined,
  EditOutlined, ExportOutlined, BankOutlined,
  CreditCardOutlined, TransactionOutlined,
  SafetyOutlined, FileSearchOutlined,
  ScheduleOutlined, FieldTimeOutlined,
  EnvironmentOutlined, LinkOutlined,
  CopyOutlined, StarOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const BankingAssistant = ({ onClose, position }) => {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      type: 'bot', 
      text: "👋 Bonjour ! Je suis votre **assistant administratif bancaire**. Je peux vous aider à :\n\n📧 Envoyer des emails\n📅 Planifier des réunions\n📝 Préparer des rendez-vous clients\n💡 Suggérer des actions\n\nComment puis-je vous aider aujourd'hui ?",
      time: new Date().toLocaleTimeString(),
      suggestions: [
        'Envoyer un email à un client',
        'Planifier une réunion d\'équipe',
        'Fixer un rendez-vous',
        'Voir les suggestions du jour'
      ]
    }
  ]);
  
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState(null);
  const [pendingAction, setPendingAction] = useState(null);
  const [form] = Form.useForm();
  
  // États pour les données
  const [scheduledMeetings, setScheduledMeetings] = useState([]);
  const [pendingEmails, setPendingEmails] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [clients, setClients] = useState([]);
  
  const messagesEndRef = useRef(null);

  // === FONCTIONS MANQUANTES DÉFINIES ===
  const extractSubject = (text) => {
    // Extraire un sujet à partir du texte
    const words = text.split(' ');
    const subjectWords = words.filter(w => w.length > 3).slice(0, 5);
    return subjectWords.join(' ') || 'Sans sujet';
  };

  // Charger les données depuis localStorage
  useEffect(() => {
    const loadData = () => {
      // Réunions
      const savedMeetings = localStorage.getItem('banking-meetings');
      if (savedMeetings) setScheduledMeetings(JSON.parse(savedMeetings));
      
      // Emails
      const savedEmails = localStorage.getItem('banking-emails');
      if (savedEmails) setPendingEmails(JSON.parse(savedEmails));
      
      // Rendez-vous
      const savedAppointments = localStorage.getItem('banking-appointments');
      if (savedAppointments) setAppointments(JSON.parse(savedAppointments));
      
      // Tâches récentes
      const savedTasks = localStorage.getItem('banking-tasks');
      if (savedTasks) setRecentTasks(JSON.parse(savedTasks));
      
      // Suggestions (générées dynamiquement)
      generateDailySuggestions();
      
      // Clients fictifs
      setClients([
        { id: 1, name: 'Jean Dupont', email: 'jean.dupont@email.com', phone: '01 23 45 67 89', type: 'particulier' },
        { id: 2, name: 'Marie Martin', email: 'marie.martin@email.com', phone: '01 98 76 54 32', type: 'particulier' },
        { id: 3, name: 'TechCorp SAS', email: 'contact@techcorp.fr', phone: '01 45 67 89 12', type: 'entreprise' },
        { id: 4, name: 'InnovStart', email: 'info@innovstart.com', phone: '01 34 56 78 90', type: 'startup' },
        { id: 5, name: 'Groupe Moreau', email: 'finance@groupe-moreau.fr', phone: '01 56 78 90 12', type: 'entreprise' }
      ]);
    };
    
    loadData();
  }, []);

  // Générer des suggestions quotidiennes
  const generateDailySuggestions = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const dayOfMonth = today.getDate();
    
    const newSuggestions = [
      {
        id: 1,
        type: 'email',
        title: 'Relance client',
        description: '3 clients n\'ont pas répondu à votre dernier email',
        priority: 'haute',
        action: 'Envoyer un rappel'
      },
      {
        id: 2,
        type: 'meeting',
        title: 'Réunion d\'équipe',
        description: 'Réunion hebdomadaire prévue demain à 10h',
        priority: 'moyenne',
        action: 'Confirmer les participants'
      },
      {
        id: 3,
        type: 'appointment',
        title: 'Rendez-vous client',
        description: 'M. Dupont attend une confirmation pour son rendez-vous',
        priority: 'haute',
        action: 'Confirmer le rendez-vous'
      },
      {
        id: 4,
        type: 'task',
        title: 'Rapport mensuel',
        description: 'Le rapport de conformité est à rendre dans 3 jours',
        priority: 'moyenne',
        action: 'Préparer le rapport'
      }
    ];
    
    setSuggestions(newSuggestions);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fonctions de sauvegarde
  const saveMeeting = (meeting) => {
    const newMeetings = [...scheduledMeetings, { ...meeting, id: Date.now(), status: 'planifié' }];
    setScheduledMeetings(newMeetings);
    localStorage.setItem('banking-meetings', JSON.stringify(newMeetings));
    return newMeetings[newMeetings.length - 1];
  };

  const saveEmail = (email) => {
    const newEmails = [...pendingEmails, { ...email, id: Date.now(), status: 'brouillon' }];
    setPendingEmails(newEmails);
    localStorage.setItem('banking-emails', JSON.stringify(newEmails));
    return newEmails[newEmails.length - 1];
  };

  const saveAppointment = (appointment) => {
    const newAppointments = [...appointments, { ...appointment, id: Date.now(), status: 'planifié' }];
    setAppointments(newAppointments);
    localStorage.setItem('banking-appointments', JSON.stringify(newAppointments));
    return newAppointments[newAppointments.length - 1];
  };

  const saveTask = (task) => {
    const newTasks = [...recentTasks, { ...task, id: Date.now(), timestamp: new Date().toISOString() }];
    setRecentTasks(newTasks.slice(-10));
    localStorage.setItem('banking-tasks', JSON.stringify(newTasks.slice(-10)));
  };

  // Fonctions d'envoi simulées
  const sendEmail = async (emailData) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { success: true, messageId: 'MSG-' + Date.now() };
  };

  const createMeeting = async (meetingData) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Générer un lien de réunion (Google Meet, Zoom, etc.)
    const meetingLink = meetingData.isVideo 
      ? `https://meet.google.com/${Math.random().toString(36).substring(7)}`
      : `https://calendar.google.com/event?eid=${Date.now()}`;
    
    return { 
      success: true, 
      meetingId: 'MEET-' + Date.now(),
      meetingLink: meetingLink
    };
  };

  const createAppointment = async (appointmentData) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { 
      success: true, 
      appointmentId: 'APT-' + Date.now(),
      calendarLink: `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(appointmentData.title)}&dates=${appointmentData.date}`
    };
  };

  // Analyse de l'intention
  const analyzeIntent = (message) => {
    const lowerMsg = message.toLowerCase();
    
    // Email
    if (lowerMsg.includes('email') || lowerMsg.includes('mail') || 
        lowerMsg.includes('envoyer') || lowerMsg.includes('contact') ||
        lowerMsg.includes('écrire') || lowerMsg.includes('message')) {
      return {
        type: 'email',
        confidence: 0.95,
        entities: extractEmailEntities(message)
      };
    }
    
    // Réunion
    if (lowerMsg.includes('réunion') || lowerMsg.includes('meet') || 
        lowerMsg.includes('reunion') || lowerMsg.includes('équipe') ||
        lowerMsg.includes('team') || lowerMsg.includes('point')) {
      return {
        type: 'meeting',
        confidence: 0.94,
        entities: extractMeetingEntities(message)
      };
    }
    
    // Rendez-vous
    if (lowerMsg.includes('rendez-vous') || lowerMsg.includes('rdv') || 
        lowerMsg.includes('appointment') || lowerMsg.includes('client') ||
        lowerMsg.includes('rencontrer') || lowerMsg.includes('voir')) {
      return {
        type: 'appointment',
        confidence: 0.96,
        entities: extractAppointmentEntities(message)
      };
    }
    
    // Suggestion
    if (lowerMsg.includes('suggestion') || lowerMsg.includes('idée') || 
        lowerMsg.includes('proposition') || lowerMsg.includes('conseil') ||
        lowerMsg.includes('recommande') || lowerMsg.includes('quoi faire')) {
      return {
        type: 'suggestion',
        confidence: 0.92,
        entities: {}
      };
    }
    
    // Planning/Agenda
    if (lowerMsg.includes('planning') || lowerMsg.includes('agenda') || 
        lowerMsg.includes('emploi du temps') || lowerMsg.includes('programme')) {
      return {
        type: 'schedule',
        confidence: 0.9,
        entities: {}
      };
    }
    
    return { type: 'unknown', confidence: 0.3 };
  };

  // Extracteurs d'entités
  const extractEmailEntities = (text) => {
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
    const match = text.match(emailRegex);
    
    // Chercher un client dans le texte
    const clientMatch = clients.find(c => 
      text.toLowerCase().includes(c.name.toLowerCase()) ||
      (c.email && text.includes(c.email))
    );
    
    return {
      to: match ? match[0] : (clientMatch?.email || ''),
      clientName: clientMatch?.name || '',
      subject: extractSubject(text),
      priority: text.includes('urgent') ? 'haute' : 'normale'
    };
  };

  const extractMeetingEntities = (text) => {
    return {
      title: extractTitle(text),
      date: extractDate(text),
      time: extractTime(text),
      duration: text.includes('heure') ? '1h' : '30min',
      isVideo: text.includes('visio') || text.includes('vidéo') || text.includes('zoom'),
      participants: extractParticipants(text)
    };
  };

  const extractAppointmentEntities = (text) => {
    const clientMatch = clients.find(c => 
      text.toLowerCase().includes(c.name.toLowerCase())
    );
    
    return {
      client: clientMatch?.name || 'Client',
      clientEmail: clientMatch?.email || '',
      clientPhone: clientMatch?.phone || '',
      purpose: extractPurpose(text),
      date: extractDate(text),
      time: extractTime(text),
      isUrgent: text.includes('urgent') || text.includes('rapidement')
    };
  };

  const extractTitle = (text) => {
    // Enlever les mots courants pour garder le sujet
    const words = text.replace(/email|mail|réunion|meeting|rdv|rendez-vous|client/i, '')
                     .split(' ')
                     .filter(w => w.length > 2)
                     .slice(0, 5)
                     .join(' ');
    return words || 'Sans titre';
  };

  const extractDate = (text) => {
    // Analyse simple de date
    if (text.includes('demain')) {
      const date = new Date();
      date.setDate(date.getDate() + 1);
      return date;
    }
    if (text.includes('aujourd')) {
      return new Date();
    }
    if (text.includes('lundi')) return getNextDay(1);
    if (text.includes('mardi')) return getNextDay(2);
    if (text.includes('mercredi')) return getNextDay(3);
    if (text.includes('jeudi')) return getNextDay(4);
    if (text.includes('vendredi')) return getNextDay(5);
    
    // Par défaut: demain
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date;
  };

  const getNextDay = (dayOfWeek) => {
    const date = new Date();
    date.setDate(date.getDate() + ((dayOfWeek + 7 - date.getDay()) % 7));
    return date;
  };

  const extractTime = (text) => {
    const timeRegex = /(\d{1,2})h(\d{2})?/;
    const match = text.match(timeRegex);
    if (match) {
      return `${match[1]}:${match[2] || '00'}`;
    }
    return '10:00'; // Heure par défaut
  };

  const extractParticipants = (text) => {
    const participants = [];
    
    // Chercher des emails
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/g;
    const emails = text.match(emailRegex);
    if (emails) participants.push(...emails);
    
    // Chercher des noms de clients
    clients.forEach(client => {
      if (text.toLowerCase().includes(client.name.toLowerCase())) {
        participants.push(client.email);
      }
    });
    
    return participants.length > 0 ? participants : ['equipe@banque.fr'];
  };

  const extractPurpose = (text) => {
    if (text.includes('crédit') || text.includes('prêt')) return 'Demande de crédit';
    if (text.includes('compte')) return 'Ouverture de compte';
    if (text.includes('placement') || text.includes('épargne')) return 'Conseil en placement';
    if (text.includes('fraude') || text.includes('sécurité')) return 'Sécurité compte';
    return 'Entretien client';
  };

  // Générer réponse
  const generateAIResponse = (intent, message) => {
    switch(intent.type) {
      case 'email':
        return {
          text: `📧 Je vois que vous voulez envoyer un email. ${
            intent.entities.clientName ? `Pour ${intent.entities.clientName}` : ''
          }. Je prépare le formulaire d'envoi.`,
          action: 'email',
          data: intent.entities
        };
        
      case 'meeting':
        return {
          text: `📅 Je planifie une réunion sur "${intent.entities.title}" ${
            intent.entities.date ? `pour le ${intent.entities.date.toLocaleDateString()}` : ''
          }.`,
          action: 'meeting',
          data: intent.entities
        };
        
      case 'appointment':
        return {
          text: `📆 Je fixe un rendez-vous avec ${intent.entities.client}. ${
            intent.entities.isUrgent ? 'Je note l\'urgence.' : ''
          }`,
          action: 'appointment',
          data: intent.entities
        };
        
      case 'suggestion':
        return {
          text: `💡 Voici mes suggestions pour aujourd'hui :\n\n${
            suggestions.map(s => `• ${s.title} (${s.priority})`).join('\n')
          }\n\nQue souhaitez-vous traiter en priorité ?`,
          action: 'suggestions',
          data: suggestions
        };
        
      case 'schedule':
        return {
          text: `📋 Votre agenda aujourd'hui :\n\n${
            appointments.filter(a => {
              const today = new Date().toDateString();
              return new Date(a.date).toDateString() === today;
            }).length
          } rendez-vous\n${
            scheduledMeetings.length
          } réunions prévues\n\nVoulez-vous voir le détail ?`,
          action: 'schedule',
          data: {}
        };
        
      default:
        return {
          text: "Je suis votre assistant administratif. Je peux vous aider à :\n\n📧 **Envoyer des emails**\n📅 **Planifier des réunions**\n📆 **Fixer des rendez-vous**\n💡 **Suggérer des actions**\n\nQue souhaitez-vous faire ?",
          action: null,
          data: {}
        };
    }
  };

  // Gestionnaire d'envoi
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

    const intent = analyzeIntent(inputValue);

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
          'Envoyer un email',
          'Planifier une réunion',
          'Fixer un rendez-vous',
          'Voir les suggestions'
        ]
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
      setShowSuggestions(true);

      if (response.action && response.action !== 'suggestions' && response.action !== 'schedule') {
        setPendingAction(response);
        setModalType(response.action);
        setModalVisible(true);
      }
      
      if (response.action === 'suggestions') {
        // Afficher les suggestions
        const suggestionsList = response.data;
        const suggestionText = suggestionsList.map(s => 
          `• **${s.title}** (${s.priority}) : ${s.description}`
        ).join('\n\n');
        
        setTimeout(() => {
          const followUpMessage = {
            id: messages.length + 3,
            type: 'bot',
            text: `💡 Suggestions détaillées :\n\n${suggestionText}\n\nPuis-je vous aider à traiter l'une d'elles ?`,
            time: new Date().toLocaleTimeString(),
            suggestions: suggestionsList.map(s => s.action)
          };
          setMessages(prev => [...prev, followUpMessage]);
        }, 1000);
      }
    }, 1500);
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    handleSendMessage();
  };

  // Gestionnaires CRUD
  const handleSendEmail = async (values) => {
    try {
      const emailData = {
        ...values,
        to: values.to || values.clientEmail,
        sentAt: new Date().toISOString()
      };
      
      const result = await sendEmail(emailData);
      saveEmail(emailData);
      
      message.success(`📧 Email envoyé à ${emailData.to}`);
      
      const botMessage = {
        id: messages.length + 3,
        type: 'bot',
        text: `✅ Email envoyé avec succès à **${emailData.to}**\nSujet: ${emailData.subject}`,
        time: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, botMessage]);
      
      saveTask({ 
        type: 'email', 
        description: `Email à ${emailData.to}`, 
        result: 'succès',
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      message.error('❌ Erreur envoi email');
    }
    
    setModalVisible(false);
    form.resetFields();
  };

  const handleCreateMeeting = async (values) => {
    try {
      const meetingData = {
        ...values,
        date: values.date.format('DD/MM/YYYY'),
        time: values.time.format('HH:mm'),
        created: new Date().toISOString()
      };
      
      const result = await createMeeting(meetingData);
      saveMeeting(meetingData);
      
      message.success(`✅ Réunion "${meetingData.title}" planifiée`);
      
      const botMessage = {
        id: messages.length + 3,
        type: 'bot',
        text: `✅ Réunion **"${meetingData.title}"** programmée pour le ${meetingData.date} à ${meetingData.time}\nLien: ${result.meetingLink}`,
        time: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, botMessage]);
      
      saveTask({ 
        type: 'meeting', 
        description: `Réunion: ${meetingData.title}`, 
        result: 'succès' 
      });
      
    } catch (error) {
      message.error('❌ Erreur création réunion');
    }
    
    setModalVisible(false);
    form.resetFields();
  };

  const handleCreateAppointment = async (values) => {
    try {
      const appointmentData = {
        ...values,
        client: values.client,
        date: values.date ? values.date.format('DD/MM/YYYY') : '',
        time: values.time ? values.time.format('HH:mm') : '',
        created: new Date().toISOString()
      };
      
      const result = await createAppointment(appointmentData);
      saveAppointment(appointmentData);
      
      message.success(`✅ Rendez-vous avec ${appointmentData.client} confirmé`);
      
      const botMessage = {
        id: messages.length + 3,
        type: 'bot',
        text: `✅ Rendez-vous avec **${appointmentData.client}** programmé le ${appointmentData.date} à ${appointmentData.time}\nObjet: ${appointmentData.purpose}`,
        time: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, botMessage]);
      
      saveTask({ 
        type: 'appointment', 
        description: `Rendez-vous: ${appointmentData.client}`, 
        result: 'succès' 
      });
      
    } catch (error) {
      message.error('❌ Erreur création rendez-vous');
    }
    
    setModalVisible(false);
    form.resetFields();
  };

  // Rendu des modals
  const renderModal = () => {
    switch(modalType) {
      case 'email':
        return (
          <Modal
            title={<><MailOutlined style={{ color: '#1890ff' }} /> Envoyer un email</>}
            open={modalVisible}
            onCancel={() => setModalVisible(false)}
            footer={null}
            width={550}
          >
            <Form form={form} layout="vertical" onFinish={handleSendEmail} initialValues={pendingAction?.data}>
              <Form.Item name="to" label="Destinataire" rules={[{ required: true, type: 'email' }]}>
                <Input 
                  placeholder="client@exemple.com" 
                  prefix={<MailOutlined />}
                  addonBefore={
                    <Select defaultValue="direct" style={{ width: 100 }}>
                      <Option value="direct">À</Option>
                      <Option value="cc">Cc</Option>
                      <Option value="bcc">Cci</Option>
                    </Select>
                  }
                />
              </Form.Item>
              
              <Form.Item name="subject" label="Sujet" rules={[{ required: true }]}>
                <Input placeholder="Sujet de l'email" />
              </Form.Item>
              
              <Form.Item name="body" label="Message" rules={[{ required: true }]}>
                <TextArea rows={5} placeholder="Votre message..." />
              </Form.Item>
              
              <Form.Item name="priority" label="Priorité">
                <Radio.Group>
                  <Radio value="basse">Basse</Radio>
                  <Radio value="normale">Normale</Radio>
                  <Radio value="haute">Haute</Radio>
                </Radio.Group>
              </Form.Item>
              
              <Form.Item name="attachments" label="Pièces jointes">
                <Select mode="tags" placeholder="Ajouter des pièces jointes">
                  <Option value="rapport.pdf">rapport.pdf</Option>
                  <Option value="contrat.pdf">contrat.pdf</Option>
                  <Option value="facture.pdf">facture.pdf</Option>
                </Select>
              </Form.Item>
              
              <Form.Item>
                <Button type="primary" htmlType="submit" block size="large">
                  Envoyer l'email
                </Button>
              </Form.Item>
            </Form>
          </Modal>
        );
        
      case 'meeting':
        return (
          <Modal
            title={<><CalendarOutlined style={{ color: '#1890ff' }} /> Planifier une réunion</>}
            open={modalVisible}
            onCancel={() => setModalVisible(false)}
            footer={null}
            width={550}
          >
            <Form form={form} layout="vertical" onFinish={handleCreateMeeting}>
              <Form.Item name="title" label="Titre de la réunion" rules={[{ required: true }]}>
                <Input placeholder="Ex: Point hebdomadaire équipe risque" />
              </Form.Item>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="time" label="Heure" rules={[{ required: true }]}>
                    <TimePicker style={{ width: '100%' }} format="HH:mm" />
                  </Form.Item>
                </Col>
              </Row>
              
              <Form.Item name="duration" label="Durée">
                <Select>
                  <Option value="30min">30 minutes</Option>
                  <Option value="1h">1 heure</Option>
                  <Option value="1h30">1h30</Option>
                  <Option value="2h">2 heures</Option>
                </Select>
              </Form.Item>
              
              <Form.Item name="participants" label="Participants">
                <Select mode="tags" placeholder="Emails des participants">
                  <Option value="conformite@banque.fr">Service conformité</Option>
                  <Option value="risques@banque.fr">Service risques</Option>
                  <Option value="fraude@banque.fr">Anti-fraude</Option>
                  <Option value="direction@banque.fr">Direction</Option>
                </Select>
              </Form.Item>
              
              <Form.Item name="isVideo" valuePropName="checked">
                <Checkbox>Activer la visioconférence</Checkbox>
              </Form.Item>
              
              <Form.Item name="description" label="Ordre du jour">
                <TextArea rows={3} placeholder="Points à aborder..." />
              </Form.Item>
              
              <Form.Item>
                <Button type="primary" htmlType="submit" block size="large">
                  Planifier la réunion
                </Button>
              </Form.Item>
            </Form>
          </Modal>
        );
        
      case 'appointment':
        return (
          <Modal
            title={<><ScheduleOutlined style={{ color: '#1890ff' }} /> Fixer un rendez-vous</>}
            open={modalVisible}
            onCancel={() => setModalVisible(false)}
            footer={null}
            width={550}
          >
            <Form form={form} layout="vertical" onFinish={handleCreateAppointment}>
              <Form.Item name="client" label="Client" rules={[{ required: true }]}>
                <Select 
                  showSearch 
                  placeholder="Sélectionner un client"
                  optionFilterProp="children"
                >
                  {clients.map(client => (
                    <Option key={client.id} value={client.name}>
                      {client.name} - {client.email}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
              
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="date" label="Date" rules={[{ required: true }]}>
                    <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="time" label="Heure" rules={[{ required: true }]}>
                    <TimePicker style={{ width: '100%' }} format="HH:mm" />
                  </Form.Item>
                </Col>
              </Row>
              
              <Form.Item name="purpose" label="Objet du rendez-vous" rules={[{ required: true }]}>
                <Select>
                  <Option value="credit">Demande de crédit</Option>
                  <Option value="account">Ouverture de compte</Option>
                  <Option value="investment">Conseil en placement</Option>
                  <Option value="security">Sécurité compte</Option>
                  <Option value="other">Autre</Option>
                </Select>
              </Form.Item>
              
              <Form.Item name="location" label="Lieu">
                <Input 
                  placeholder="Agence, téléphone, visio..." 
                  prefix={<EnvironmentOutlined />}
                />
              </Form.Item>
              
              <Form.Item name="notes" label="Notes">
                <TextArea rows={3} placeholder="Informations complémentaires..." />
              </Form.Item>
              
              <Form.Item name="sendReminder" valuePropName="checked">
                <Checkbox>Envoyer un rappel 24h avant</Checkbox>
              </Form.Item>
              
              <Form.Item>
                <Button type="primary" htmlType="submit" block size="large">
                  Confirmer le rendez-vous
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
        width: '380px',
        zIndex: 10000,
        pointerEvents: 'auto'
      }}
    >
      <div className="banking-assistant-card">
        {/* En-tête */}
        <div className="assistant-header">
          <Space>
            <Avatar icon={<BankOutlined />} style={{ background: '#1890ff' }} />
            <div>
              <Text strong style={{ color: 'white' }}>Assistant Administratif</Text>
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
                <Avatar icon={<BankOutlined />} size="small" style={{ background: '#1890ff', marginRight: 8 }} />
              )}
              <div className="message-content">
                <div className="message-text">{msg.text}</div>
                <div className="message-time">{msg.time}</div>
              </div>
              {msg.type === 'user' && (
                <Avatar icon={<UserOutlined />} size="small" style={{ background: '#52c41a', marginLeft: 8 }} />
              )}
            </motion.div>
          ))}
          
          {isTyping && (
            <div className="typing-indicator">
              <Avatar icon={<BankOutlined />} size="small" style={{ background: '#1890ff', marginRight: 8 }} />
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
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 12 }}>Actions rapides :</Text>
            <div className="suggestion-tags">
              {['Envoyer un email', 'Planifier réunion', 'Fixer rendez-vous', 'Voir suggestions'].map((sugg, idx) => (
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

        {/* Prochains rendez-vous */}
        {appointments.length > 0 && (
          <div className="assistant-upcoming">
            <Divider style={{ margin: '8px 0' }}>
              <ClockCircleOutlined /> Prochains rendez-vous
            </Divider>
            <div className="upcoming-list">
              {appointments.slice(-3).map(apt => (
                <div key={apt.id} className="upcoming-item">
                  <Tag color="blue" style={{ marginRight: 8 }}>{apt.time}</Tag>
                  <Text style={{ fontSize: 12 }}>{apt.client}</Text>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions prioritaires */}
        {suggestions.length > 0 && (
          <div className="assistant-suggestions-list">
            <Divider style={{ margin: '8px 0' }}>
              <StarOutlined /> Suggestions
            </Divider>
            {suggestions.slice(0, 2).map(s => (
              <Alert
                key={s.id}
                message={s.title}
                description={s.description}
                type={s.priority === 'haute' ? 'warning' : 'info'}
                showIcon
                style={{ marginBottom: 4, fontSize: 12 }}
                action={
                  <Button size="small" type="link" onClick={() => handleSuggestionClick(s.action)}>
                    Traiter
                  </Button>
                }
              />
            ))}
          </div>
        )}

        {/* Input */}
        <div className="assistant-input">
          <Input.TextArea
            rows={2}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ex: 'Envoie un email à M. Dupont' ou 'Planifie une réunion demain'"
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
            style={{ marginTop: 8, width: '100%', background: '#1890ff', borderColor: '#1890ff' }}
          >
            Envoyer
          </Button>
        </div>

        {renderModal()}

        <style>{`
          .banking-assistant-card {
            width: 100%;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            overflow: hidden;
            border: 1px solid #1890ff;
          }

          .assistant-header {
            background: linear-gradient(135deg, #1890ff, #40a9ff);
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
            background: #1890ff;
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
            background: #1890ff;
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
            background: #e6f7ff;
            border-color: #91d5ff;
            color: #1890ff;
            padding: 4px 8px;
            border-radius: 16px;
            font-size: 12px;
            transition: all 0.2s;
          }

          .suggestion-tag:hover {
            background: #1890ff;
            color: white;
            transform: scale(1.05);
          }

          .assistant-upcoming {
            padding: 0 12px 8px;
          }

          .upcoming-list {
            max-height: 80px;
            overflow-y: auto;
          }

          .upcoming-item {
            display: flex;
            align-items: center;
            padding: 4px 0;
          }

          .assistant-suggestions-list {
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

export default BankingAssistant;