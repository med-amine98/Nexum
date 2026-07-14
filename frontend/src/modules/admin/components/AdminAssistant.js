// src/modules/admin/components/AdminAssistant.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, Input, Button, Space, Avatar, Tag, 
  Typography, Divider, List, Modal, Form,
  DatePicker, TimePicker, Select, message,
  Tooltip, Badge, Progress, Timeline, Radio,
  Checkbox, Alert, Steps, Row, Col,
  Table, Statistic, Descriptions
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
  ShopOutlined, ApartmentOutlined,
  CalculatorOutlined, PercentageOutlined,
  ScheduleOutlined, FieldTimeOutlined,
  EnvironmentOutlined, LinkOutlined,
  CopyOutlined, StarOutlined, RiseOutlined,
  FallOutlined, DollarOutlined, WalletOutlined,
  FileExcelOutlined, FilePdfOutlined,
  PrinterOutlined, BarcodeOutlined,
  AuditOutlined, ReconciliationOutlined,
  CrownOutlined, GiftOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const AdminAssistant = ({ onClose }) => {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      type: 'bot', 
      text: "👋 Bonjour ! Je suis votre **assistant administratif**. Je peux vous aider à gérer votre équipe, planifier des réunions, envoyer des emails, et suivre les activités importantes.\n\n📧 **Emails** : Envoyer des communications\n📅 **Réunions** : Planifier des rendez-vous\n📊 **Rapports** : Générer des analyses\n💡 **Suggestions** : Optimiser la gestion\n\nComment puis-je vous aider aujourd'hui ?",
      time: new Date().toLocaleTimeString(),
      suggestions: [
        'Envoyer un email à l\'équipe',
        'Planifier une réunion',
        'Voir les rappels',
        'Analyser les performances'
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
  const [reminders, setReminders] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [admins, setAdmins] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  
  const messagesEndRef = useRef(null);

  // === FONCTIONS UTILITAIRES ===
  const extractSubject = (text) => {
    const words = text.split(' ');
    const subjectWords = words.filter(w => w.length > 3).slice(0, 5);
    return subjectWords.join(' ') || 'Sans sujet';
  };

  // Charger les données depuis localStorage
  useEffect(() => {
    const loadData = () => {
      // Réunions
      const savedMeetings = localStorage.getItem('admin-meetings');
      if (savedMeetings) setScheduledMeetings(JSON.parse(savedMeetings));
      
      // Emails
      const savedEmails = localStorage.getItem('admin-emails');
      if (savedEmails) setPendingEmails(JSON.parse(savedEmails));
      
      // Rappels
      const savedReminders = localStorage.getItem('admin-reminders');
      if (savedReminders) setReminders(JSON.parse(savedReminders));
      
      // Tâches récentes
      const savedTasks = localStorage.getItem('admin-tasks');
      if (savedTasks) setRecentTasks(JSON.parse(savedTasks));
      
      // Générer suggestions
      generateDailySuggestions();
      
      // Équipe admin fictive
      setTeamMembers([
        { id: 1, name: 'Sophie Martin', email: 's.martin@nexum.com', role: 'Super Admin', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
        { id: 2, name: 'Thomas Dubois', email: 't.dubois@nexum.com', role: 'Admin', avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
        { id: 3, name: 'Marie Lambert', email: 'm.lambert@nexum.com', role: 'Manager', avatar: 'https://randomuser.me/api/portraits/women/68.jpg' },
        { id: 4, name: 'Pierre Moreau', email: 'p.moreau@nexum.com', role: 'Admin', avatar: 'https://randomuser.me/api/portraits/men/75.jpg' },
      ]);
      
      // Approbations en attente
      setPendingApprovals([
        { id: 1, type: 'user', title: 'Nouvel admin', name: 'Julie Bernard', status: 'en attente', date: '2025-03-18' },
        { id: 2, type: 'offer', title: 'Offre Enterprise', name: 'Client TechCorp', status: 'à valider', date: '2025-03-17' },
        { id: 3, type: 'payment', title: 'Remboursement', name: 'Client InnovStart', amount: 1250, status: 'en attente', date: '2025-03-16' },
      ]);
    };
    
    loadData();
  }, []);

  // Générer des suggestions quotidiennes
  const generateDailySuggestions = () => {
    const newSuggestions = [
      {
        id: 1,
        type: 'approval',
        title: 'Approbations en attente',
        description: `${pendingApprovals.length} demandes nécessitent votre validation`,
        priority: 'haute',
        action: 'Voir les approbations'
      },
      {
        id: 2,
        type: 'report',
        title: 'Rapport hebdomadaire',
        description: 'Générer le rapport d\'activité de la semaine',
        priority: 'moyenne',
        action: 'Générer le rapport'
      },
      {
        id: 3,
        type: 'meeting',
        title: 'Réunion d\'équipe',
        description: 'Préparer l\'ordre du jour pour la réunion de demain',
        priority: 'moyenne',
        action: 'Préparer la réunion'
      },
      {
        id: 4,
        type: 'review',
        title: 'Revue des performances',
        description: 'Analyser les KPIs du mois écoulé',
        priority: 'basse',
        action: 'Voir les analyses'
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
    localStorage.setItem('admin-meetings', JSON.stringify(newMeetings));
    return newMeetings[newMeetings.length - 1];
  };

  const saveEmail = (email) => {
    const newEmails = [...pendingEmails, { ...email, id: Date.now(), status: 'brouillon' }];
    setPendingEmails(newEmails);
    localStorage.setItem('admin-emails', JSON.stringify(newEmails));
    return newEmails[newEmails.length - 1];
  };

  const saveReminder = (reminder) => {
    const newReminders = [...reminders, { ...reminder, id: Date.now(), status: 'actif' }];
    setReminders(newReminders);
    localStorage.setItem('admin-reminders', JSON.stringify(newReminders));
    return newReminders[newReminders.length - 1];
  };

  const saveTask = (task) => {
    const newTasks = [...recentTasks, { ...task, id: Date.now(), timestamp: new Date().toISOString() }];
    setRecentTasks(newTasks.slice(-10));
    localStorage.setItem('admin-tasks', JSON.stringify(newTasks.slice(-10)));
  };

  // Fonctions d'envoi simulées
  const sendEmail = async (emailData) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { success: true, messageId: 'ADM-' + Date.now() };
  };

  const createMeeting = async (meetingData) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const meetingLink = meetingData.isVideo 
      ? `https://meet.google.com/${Math.random().toString(36).substring(7)}`
      : `https://calendar.google.com/event?eid=${Date.now()}`;
    return { success: true, meetingId: 'MEET-' + Date.now(), meetingLink };
  };

  const generateReport = async (reportData) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { success: true, reportId: 'RPT-' + Date.now(), pdfUrl: '/reports/admin-report.pdf' };
  };

  // Analyse de l'intention
  const analyzeIntent = (message) => {
    const lowerMsg = message.toLowerCase();
    
    // EMAILS
    if (lowerMsg.includes('email') || lowerMsg.includes('mail') || lowerMsg.includes('envoyer') || 
        lowerMsg.includes('communication')) {
      return { type: 'email', confidence: 0.95, entities: extractEmailEntities(message) };
    }
    
    // RÉUNIONS
    if (lowerMsg.includes('réunion') || lowerMsg.includes('meet') || lowerMsg.includes('point') || 
        lowerMsg.includes('équipe')) {
      return { type: 'meeting', confidence: 0.94, entities: extractMeetingEntities(message) };
    }
    
    // RAPPELS
    if (lowerMsg.includes('rappel') || lowerMsg.includes('rappeler') || lowerMsg.includes('souvenir')) {
      return { type: 'reminder', confidence: 0.93, entities: extractReminderEntities(message) };
    }
    
    // RAPPORTS
    if (lowerMsg.includes('rapport') || lowerMsg.includes('report') || lowerMsg.includes('bilan')) {
      return { type: 'report', confidence: 0.92, entities: extractReportEntities(message) };
    }
    
    // APPROBATIONS
    if (lowerMsg.includes('approbation') || lowerMsg.includes('valider') || lowerMsg.includes('approuver')) {
      return { type: 'approval', confidence: 0.91, entities: {} };
    }
    
    // SUGGESTIONS
    if (lowerMsg.includes('suggestion') || lowerMsg.includes('idée') || lowerMsg.includes('proposition')) {
      return { type: 'suggestion', confidence: 0.9, entities: {} };
    }
    
    return { type: 'unknown', confidence: 0.3 };
  };

  // Extracteurs d'entités
  const extractEmailEntities = (text) => {
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
    const match = text.match(emailRegex);
    const teamMatch = teamMembers.find(m => text.toLowerCase().includes(m.name.toLowerCase()));
    
    return {
      to: match ? match[0] : (teamMatch?.email || 'equipe@nexum.com'),
      recipientName: teamMatch?.name || 'Équipe',
      subject: extractSubject(text),
      priority: text.includes('urgent') ? 'haute' : text.includes('important') ? 'haute' : 'normale'
    };
  };

  const extractMeetingEntities = (text) => {
    return {
      title: extractTitle(text) || 'Réunion d\'équipe',
      date: extractDate(text),
      time: extractTime(text),
      participants: extractParticipants(text),
      isVideo: text.includes('visio') || text.includes('vidéo') || text.includes('zoom')
    };
  };

  const extractReminderEntities = (text) => {
    return {
      title: text.replace(/rappel|rappeler|souvenir/i, '').trim() || 'Rappel',
      date: extractDate(text),
      time: extractTime(text),
      priority: text.includes('urgent') ? 'haute' : 'normale'
    };
  };

  const extractReportEntities = (text) => {
    if (text.includes('activité') || text.includes('activity')) return 'activity';
    if (text.includes('performance') || text.includes('kpi')) return 'performance';
    if (text.includes('financier') || text.includes('finance')) return 'financial';
    if (text.includes('client')) return 'clients';
    return 'general';
  };

  const extractTitle = (text) => {
    const words = text.replace(/r[eé]union|meeting|point|équipe|team/i, '')
                     .split(' ')
                     .filter(w => w.length > 3)
                     .slice(0, 4)
                     .join(' ');
    return words || 'Point administratif';
  };

  const extractDate = (text) => {
    if (text.includes('demain')) {
      const date = new Date(); date.setDate(date.getDate() + 1); return date;
    }
    if (text.includes('aujourd')) return new Date();
    if (text.includes('lundi')) return getNextDay(1);
    if (text.includes('mardi')) return getNextDay(2);
    if (text.includes('mercredi')) return getNextDay(3);
    if (text.includes('jeudi')) return getNextDay(4);
    if (text.includes('vendredi')) return getNextDay(5);
    
    const date = new Date(); date.setDate(date.getDate() + 1); return date;
  };

  const getNextDay = (dayOfWeek) => {
    const date = new Date();
    date.setDate(date.getDate() + ((dayOfWeek + 7 - date.getDay()) % 7));
    return date;
  };

  const extractTime = (text) => {
    const timeRegex = /(\d{1,2})h(\d{2})?/;
    const match = text.match(timeRegex);
    return match ? `${match[1]}:${match[2] || '00'}` : '10:00';
  };

  const extractParticipants = (text) => {
    const participants = [];
    teamMembers.forEach(member => {
      if (text.toLowerCase().includes(member.name.toLowerCase())) {
        participants.push(member.email);
      }
    });
    return participants.length > 0 ? participants : ['equipe@nexum.com'];
  };

  // Générer réponse
  const generateAIResponse = (intent, message) => {
    switch(intent.type) {
      case 'email':
        return {
          text: `📧 Je prépare un email pour ${intent.entities.recipientName || 'l\'équipe'}.`,
          action: 'email',
          data: intent.entities
        };
        
      case 'meeting':
        return {
          text: `📅 Je planifie une réunion sur "${intent.entities.title}" ${intent.entities.date ? 'pour le ' + intent.entities.date.toLocaleDateString() : ''}.`,
          action: 'meeting',
          data: intent.entities
        };
        
      case 'reminder':
        return {
          text: `⏰ Je crée un rappel pour "${intent.entities.title}" le ${intent.entities.date?.toLocaleDateString() || 'demain'}.`,
          action: 'reminder',
          data: intent.entities
        };
        
      case 'report':
        return {
          text: `📊 Je génère un rapport ${intent.entities} pour vous.`,
          action: 'report',
          data: { type: intent.entities }
        };
        
      case 'approval':
        return {
          text: `✅ Vous avez ${pendingApprovals.length} approbations en attente :\n\n${pendingApprovals.map(a => 
            `• ${a.title} - ${a.name} (${a.status})`
          ).join('\n')}`,
          action: 'approvals',
          data: pendingApprovals
        };
        
      case 'suggestion':
        return {
          text: `💡 **Suggestions pour aujourd'hui** :\n\n${suggestions.map(s => 
            `• ${s.title} (${s.priority}) : ${s.description}`
          ).join('\n')}`,
          action: 'suggestions',
          data: suggestions
        };
        
      default:
        return {
          text: "Je suis votre assistant administratif. Je peux vous aider avec :\n\n📧 **Emails** : Communications d'équipe\n📅 **Réunions** : Planification\n⏰ **Rappels** : Tâches importantes\n📊 **Rapports** : Analyses\n\nQue souhaitez-vous faire ?",
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
        data: response.data
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
      setShowSuggestions(true);

      if (response.action && !['approvals', 'suggestions'].includes(response.action)) {
        setPendingAction(response);
        setModalType(response.action);
        setModalVisible(true);
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
      const result = await sendEmail(values);
      saveEmail(values);
      message.success(`📧 Email envoyé à ${values.to}`);
      
      const botMessage = {
        id: messages.length + 3,
        type: 'bot',
        text: `📧 Email envoyé à **${values.to}** avec le sujet "${values.subject}"`,
        time: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, botMessage]);
      saveTask({ type: 'email', description: `Email à: ${values.to}`, result: 'succès' });
      
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
        text: `✅ Réunion **"${meetingData.title}"** programmée le ${meetingData.date} à ${meetingData.time}`,
        time: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, botMessage]);
      saveTask({ type: 'meeting', description: `Réunion: ${meetingData.title}`, result: 'succès' });
      
    } catch (error) {
      message.error('❌ Erreur création réunion');
    }
    setModalVisible(false); 
    form.resetFields();
  };

  const handleCreateReminder = async (values) => {
    try {
      const reminderData = {
        ...values,
        date: values.date.format('DD/MM/YYYY'),
        time: values.time.format('HH:mm'),
        created: new Date().toISOString()
      };
      saveReminder(reminderData);
      message.success(`⏰ Rappel créé pour ${reminderData.date} à ${reminderData.time}`);
      
      const botMessage = {
        id: messages.length + 3,
        type: 'bot',
        text: `⏰ Rappel **"${reminderData.title}"** programmé le ${reminderData.date} à ${reminderData.time}`,
        time: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, botMessage]);
      saveTask({ type: 'reminder', description: `Rappel: ${reminderData.title}`, result: 'succès' });
      
    } catch (error) {
      message.error('❌ Erreur création rappel');
    }
    setModalVisible(false); 
    form.resetFields();
  };

  const handleGenerateReport = async (values) => {
    try {
      const result = await generateReport(values);
      message.success(`📊 Rapport ${values.type} généré avec succès`);
      
      const botMessage = {
        id: messages.length + 3,
        type: 'bot',
        text: `📊 Rapport ${values.type} généré. Vous pouvez le télécharger.`,
        time: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, botMessage]);
      saveTask({ type: 'report', description: `Rapport: ${values.type}`, result: 'succès' });
      
    } catch (error) {
      message.error('❌ Erreur génération rapport');
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
            title={<><MailOutlined style={{ color: '#4158D0' }} /> Envoyer un email</>}
            open={modalVisible} 
            onCancel={() => setModalVisible(false)} 
            footer={null} 
            width={500}
          >
            <Form form={form} layout="vertical" onFinish={handleSendEmail}>
              <Form.Item name="to" label="Destinataire" rules={[{ required: true, type: 'email' }]}>
                <Select showSearch placeholder="Sélectionner ou saisir un email">
                  {teamMembers.map(m => (
                    <Option key={m.id} value={m.email}>{m.name} - {m.email}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="subject" label="Sujet" rules={[{ required: true }]}>
                <Input placeholder="Sujet de l'email" />
              </Form.Item>
              <Form.Item name="body" label="Message" rules={[{ required: true }]}>
                <TextArea rows={4} placeholder="Votre message..." />
              </Form.Item>
              <Form.Item name="priority" label="Priorité">
                <Radio.Group>
                  <Radio value="basse">Basse</Radio>
                  <Radio value="normale">Normale</Radio>
                  <Radio value="haute">Haute</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block>Envoyer</Button>
              </Form.Item>
            </Form>
          </Modal>
        );
        
      case 'meeting':
        return (
          <Modal
            title={<><CalendarOutlined style={{ color: '#4158D0' }} /> Planifier une réunion</>}
            open={modalVisible} 
            onCancel={() => setModalVisible(false)} 
            footer={null} 
            width={500}
          >
            <Form form={form} layout="vertical" onFinish={handleCreateMeeting}>
              <Form.Item name="title" label="Titre" rules={[{ required: true }]}>
                <Input placeholder="Ex: Réunion d'équipe hebdomadaire" />
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
              <Form.Item name="participants" label="Participants">
                <Select mode="multiple" placeholder="Sélectionner les participants">
                  {teamMembers.map(m => (
                    <Option key={m.id} value={m.email}>{m.name}</Option>
                  ))}
                </Select>
              </Form.Item>
              <Form.Item name="isVideo" valuePropName="checked">
                <Checkbox>Ajouter un lien de visioconférence</Checkbox>
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block>Planifier</Button>
              </Form.Item>
            </Form>
          </Modal>
        );
        
      case 'reminder':
        return (
          <Modal
            title={<><ClockCircleOutlined style={{ color: '#4158D0' }} /> Créer un rappel</>}
            open={modalVisible} 
            onCancel={() => setModalVisible(false)} 
            footer={null} 
            width={500}
          >
            <Form form={form} layout="vertical" onFinish={handleCreateReminder}>
              <Form.Item name="title" label="Titre" rules={[{ required: true }]}>
                <Input placeholder="Ex: Appeler le client" />
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
              <Form.Item name="priority" label="Priorité">
                <Select>
                  <Option value="basse">Basse</Option>
                  <Option value="normale">Normale</Option>
                  <Option value="haute">Haute</Option>
                </Select>
              </Form.Item>
              <Form.Item name="description" label="Description">
                <TextArea rows={3} placeholder="Détails du rappel..." />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block>Créer le rappel</Button>
              </Form.Item>
            </Form>
          </Modal>
        );
        
      case 'report':
        return (
          <Modal
            title={<><FileTextOutlined style={{ color: '#4158D0' }} /> Générer un rapport</>}
            open={modalVisible} 
            onCancel={() => setModalVisible(false)} 
            footer={null} 
            width={500}
          >
            <Form form={form} layout="vertical" onFinish={handleGenerateReport}>
              <Form.Item name="type" label="Type de rapport" rules={[{ required: true }]}>
                <Select>
                  <Option value="activity">Rapport d'activité</Option>
                  <Option value="performance">Rapport de performance</Option>
                  <Option value="financial">Rapport financier</Option>
                  <Option value="clients">Rapport clients</Option>
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
                <Button type="primary" htmlType="submit" block>Générer</Button>
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
      style={{ width: '320px' }}
    >
      <div className="admin-assistant-card">
        <div className="assistant-header" style={{ background: 'linear-gradient(135deg, #4158D0, #C850C0)' }}>
          <Space>
            <Avatar icon={<CrownOutlined />} style={{ background: '#3046b0' }} />
            <div>
              <Text strong style={{ color: 'white', fontSize: '14px' }}>Assistant Admin</Text>
              <br />
              <Badge status="processing" text="En ligne" style={{ color: '#efdbff', fontSize: '11px' }} />
            </div>
          </Space>
          <Button 
            type="text" 
            icon={<CloseCircleOutlined style={{ color: 'white', fontSize: '14px' }} />} 
            onClick={onClose} 
            size="small" 
          />
        </div>

        <div className="assistant-messages" style={{ height: 260, overflowY: 'auto', padding: '10px', background: '#f8f9fa' }}>
          {messages.map(msg => (
            <motion.div 
              key={msg.id} 
              className={`message ${msg.type === 'user' ? 'user-message' : ''}`}
              style={{ display: 'flex', marginBottom: '10px', justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start' }}
            >
              {msg.type === 'bot' && (
                <Avatar 
                  icon={<CrownOutlined />} 
                  size="small" 
                  style={{ background: '#4158D0', marginRight: '6px', width: '24px', height: '24px', fontSize: '12px' }} 
                />
              )}
              <div className="message-content" style={{
                maxWidth: '85%', 
                padding: '6px 10px', 
                borderRadius: '12px',
                background: msg.type === 'user' ? '#4158D0' : 'white',
                color: msg.type === 'user' ? 'white' : 'inherit',
                fontSize: '12px'
              }}>
                <div className="message-text" style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                <div className="message-time" style={{ 
                  fontSize: '9px', 
                  color: msg.type === 'user' ? 'rgba(255,255,255,0.8)' : '#999', 
                  marginTop: '4px', 
                  textAlign: 'right' 
                }}>
                  {msg.time}
                </div>
              </div>
              {msg.type === 'user' && (
                <Avatar 
                  icon={<UserOutlined />} 
                  size="small" 
                  style={{ background: '#52c41a', marginLeft: '6px', width: '24px', height: '24px', fontSize: '12px' }} 
                />
              )}
            </motion.div>
          ))}
          {isTyping && (
            <div className="typing-indicator" style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
              <Avatar 
                icon={<CrownOutlined />} 
                size="small" 
                style={{ background: '#4158D0', marginRight: '6px', width: '24px', height: '24px' }} 
              />
              <div className="typing-dots" style={{ display: 'flex', gap: '4px', padding: '6px 10px', background: 'white', borderRadius: '12px' }}>
                {[0,1,2].map(i => (
                  <span 
                    key={i} 
                    style={{ 
                      width: '6px', 
                      height: '6px', 
                      background: '#4158D0', 
                      borderRadius: '50%', 
                      animation: 'bounce 1.4s infinite', 
                      animationDelay: `${i * 0.2}s` 
                    }} 
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {showSuggestions && (
          <div className="assistant-suggestions" style={{ padding: '6px 10px', background: 'white', borderTop: '1px solid #f0f0f0' }}>
            <Text type="secondary" style={{ fontSize: '10px', marginLeft: '8px' }}>Actions rapides :</Text>
            <div className="suggestion-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
              {['Envoyer un email', 'Planifier réunion', 'Créer rappel', 'Voir suggestions'].map((sugg, idx) => (
                <Tag 
                  key={idx} 
                  className="suggestion-tag" 
                  style={{ 
                    cursor: 'pointer', 
                    background: '#f0f5ff', 
                    borderColor: '#adc6ff', 
                    color: '#4158D0', 
                    padding: '2px 6px', 
                    borderRadius: '12px', 
                    fontSize: '10px', 
                    margin: '2px' 
                  }}
                  onClick={() => handleSuggestionClick(sugg)}
                >
                  {sugg}
                </Tag>
              ))}
            </div>
          </div>
        )}

        {pendingApprovals.length > 0 && (
          <div className="assistant-approvals" style={{ padding: '0 10px 8px' }}>
            <Divider style={{ margin: '8px 0' }}><WarningOutlined /> Approbations</Divider>
            {pendingApprovals.slice(0, 2).map(a => (
              <Alert
                key={a.id}
                message={a.title}
                description={`${a.name} - ${a.date}`}
                type="warning"
                showIcon
                style={{ marginBottom: 4, fontSize: '11px' }}
                action={
                  <Button size="small" type="link" onClick={() => message.info('Module d\'approbation à venir')}>
                    Voir
                  </Button>
                }
              />
            ))}
          </div>
        )}

        <div className="assistant-input" style={{ padding: '10px', borderTop: '1px solid #f0f0f0', background: 'white' }}>
          <Input.TextArea 
            rows={2} 
            value={inputValue} 
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ex: 'Envoie un email à l'équipe' ou 'Planifie une réunion demain'"
            style={{ fontSize: '12px', padding: '6px' }}
            onPressEnter={(e) => { 
              e.preventDefault(); 
              handleSendMessage(); 
            }} 
          />
          <Button 
            type="primary" 
            icon={<SendOutlined />} 
            onClick={handleSendMessage}
            style={{ marginTop: '6px', width: '100%', background: 'linear-gradient(135deg, #4158D0, #C850C0)', border: 'none', height: '32px', fontSize: '12px' }}
          >
            Envoyer
          </Button>
        </div>

        {renderModal()}

        <style>{`
          .admin-assistant-card { 
            width: 100%; 
            background: white; 
            border-radius: 12px; 
            box-shadow: 0 8px 24px rgba(65,88,208,0.2); 
            overflow: hidden; 
            border: 1px solid #4158D0; 
          }
          .assistant-header { 
            background: linear-gradient(135deg, #4158D0, #C850C0); 
            padding: 10px; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
          }
          .assistant-approvals {
            max-height: 100px;
            overflow-y: auto;
          }
          .suggestion-tag:hover {
            background: #4158D0 !important;
            color: white !important;
          }
          @keyframes bounce { 
            0%,60%,100% { transform: translateY(0); } 
            30% { transform: translateY(-4px); } 
          }
        `}</style>
      </div>
    </motion.div>
  );
};

export default AdminAssistant;