// src/modules/enterprise/components/EnterpriseAssistant.js
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
  AuditOutlined, ReconciliationOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;

const EnterpriseAssistant = ({ onClose }) => {
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      type: 'bot', 
      text: "👋 Bonjour ! Je suis votre **assistant entreprise hybride**, à la fois comptable et assistante administrative. Je peux vous aider à :\n\n💰 **Comptabilité** : Factures, devis, bilan, TVA\n📧 **Administratif** : Emails, réunions, rendez-vous\n📊 **Reporting** : Tableaux de bord, analyses\n💡 **Suggestions** : Optimisations, alertes\n\nComment puis-je vous aider aujourd'hui ?",
      time: new Date().toLocaleTimeString(),
      suggestions: [
        'Créer une facture',
        'Planifier une réunion',
        'Analyser les comptes',
        'Voir les suggestions'
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
  const [invoices, setInvoices] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [scheduledMeetings, setScheduledMeetings] = useState([]);
  const [pendingEmails, setPendingEmails] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [clients, setClients] = useState([]);
  const [employees, setEmployees] = useState([]);
  
  const messagesEndRef = useRef(null);

  // === FONCTIONS UTILITAIRES ===
  const extractSubject = (text) => {
    const words = text.split(' ');
    const subjectWords = words.filter(w => w.length > 3).slice(0, 5);
    return subjectWords.join(' ') || 'Sans sujet';
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  // Charger les données depuis localStorage
  useEffect(() => {
    const loadData = () => {
      // Factures
      const savedInvoices = localStorage.getItem('enterprise-invoices');
      if (savedInvoices) setInvoices(JSON.parse(savedInvoices));
      
      // Devis
      const savedQuotes = localStorage.getItem('enterprise-quotes');
      if (savedQuotes) setQuotes(JSON.parse(savedQuotes));
      
      // Dépenses
      const savedExpenses = localStorage.getItem('enterprise-expenses');
      if (savedExpenses) setExpenses(JSON.parse(savedExpenses));
      
      // Réunions
      const savedMeetings = localStorage.getItem('enterprise-meetings');
      if (savedMeetings) setScheduledMeetings(JSON.parse(savedMeetings));
      
      // Emails
      const savedEmails = localStorage.getItem('enterprise-emails');
      if (savedEmails) setPendingEmails(JSON.parse(savedEmails));
      
      // Rendez-vous
      const savedAppointments = localStorage.getItem('enterprise-appointments');
      if (savedAppointments) setAppointments(JSON.parse(savedAppointments));
      
      // Tâches récentes
      const savedTasks = localStorage.getItem('enterprise-tasks');
      if (savedTasks) setRecentTasks(JSON.parse(savedTasks));
      
      // Générer suggestions
      generateDailySuggestions();
      
      // Clients fictifs
      setClients([
        { id: 1, name: 'TechCorp SAS', email: 'factures@techcorp.fr', siret: '12345678901234', tva: 'FR12345678901' },
        { id: 2, name: 'InnovStart', email: 'compta@innovstart.com', siret: '98765432109876', tva: 'FR98765432109' },
        { id: 3, name: 'Groupe Moreau', email: 'finance@groupe-moreau.fr', siret: '45678901234567', tva: 'FR45678901234' },
        { id: 4, name: 'Lambert SARL', email: 'contact@lambert-sarl.fr', siret: '78901234567890', tva: 'FR78901234567' },
      ]);
      
      // Employés fictifs
      setEmployees([
        { id: 1, name: 'Jean Martin', email: 'j.martin@entreprise.fr', service: 'Commercial', manager: 'Marie Dubois' },
        { id: 2, name: 'Marie Dubois', email: 'm.dubois@entreprise.fr', service: 'Direction', manager: 'Pierre Durand' },
        { id: 3, name: 'Pierre Durand', email: 'p.durand@entreprise.fr', service: 'Développement', manager: 'Sophie Petit' },
      ]);
    };
    
    loadData();
  }, []);

  // Générer des suggestions quotidiennes
  const generateDailySuggestions = () => {
    const newSuggestions = [
      {
        id: 1,
        type: 'invoice',
        title: 'Factures en retard',
        description: '3 factures impayées depuis plus de 30 jours',
        priority: 'haute',
        action: 'Relancer les clients',
        amount: 45600
      },
      {
        id: 2,
        type: 'tax',
        title: 'Déclaration TVA',
        description: 'Échéance dans 5 jours',
        priority: 'haute',
        action: 'Préparer la déclaration',
        deadline: '25/03/2025'
      },
      {
        id: 3,
        type: 'meeting',
        title: 'Réunion comité de direction',
        description: 'Préparer les indicateurs clés',
        priority: 'moyenne',
        action: 'Générer le reporting'
      },
      {
        id: 4,
        type: 'expense',
        title: 'Dépenses exceptionnelles',
        description: 'Frais de déplacement à valider (8 dossiers)',
        priority: 'moyenne',
        action: 'Voir les notes de frais'
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
  const saveInvoice = (invoice) => {
    const newInvoices = [...invoices, { ...invoice, id: Date.now(), status: 'brouillon' }];
    setInvoices(newInvoices);
    localStorage.setItem('enterprise-invoices', JSON.stringify(newInvoices));
    return newInvoices[newInvoices.length - 1];
  };

  const saveMeeting = (meeting) => {
    const newMeetings = [...scheduledMeetings, { ...meeting, id: Date.now(), status: 'planifié' }];
    setScheduledMeetings(newMeetings);
    localStorage.setItem('enterprise-meetings', JSON.stringify(newMeetings));
    return newMeetings[newMeetings.length - 1];
  };

  const saveEmail = (email) => {
    const newEmails = [...pendingEmails, { ...email, id: Date.now(), status: 'brouillon' }];
    setPendingEmails(newEmails);
    localStorage.setItem('enterprise-emails', JSON.stringify(newEmails));
    return newEmails[newEmails.length - 1];
  };

  const saveAppointment = (appointment) => {
    const newAppointments = [...appointments, { ...appointment, id: Date.now(), status: 'planifié' }];
    setAppointments(newAppointments);
    localStorage.setItem('enterprise-appointments', JSON.stringify(newAppointments));
    return newAppointments[newAppointments.length - 1];
  };

  const saveTask = (task) => {
    const newTasks = [...recentTasks, { ...task, id: Date.now(), timestamp: new Date().toISOString() }];
    setRecentTasks(newTasks.slice(-10));
    localStorage.setItem('enterprise-tasks', JSON.stringify(newTasks.slice(-10)));
  };

  // Fonctions d'envoi simulées
  const sendEmail = async (emailData) => {
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { success: true, messageId: 'MSG-' + Date.now() };
  };

  const createMeeting = async (meetingData) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const meetingLink = meetingData.isVideo 
      ? `https://meet.google.com/${Math.random().toString(36).substring(7)}`
      : `https://calendar.google.com/event?eid=${Date.now()}`;
    return { success: true, meetingId: 'MEET-' + Date.now(), meetingLink };
  };

  const createAppointment = async (appointmentData) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: true, appointmentId: 'APT-' + Date.now() };
  };

  const generateInvoice = async (invoiceData) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return { success: true, invoiceNumber: 'FAC-' + Date.now(), pdfUrl: '/invoices/facture.pdf' };
  };

  // Analyse de l'intention
  const analyzeIntent = (message) => {
    const lowerMsg = message.toLowerCase();
    
    // COMPTABILITÉ
    if (lowerMsg.includes('facture') || lowerMsg.includes('facturer')) {
      return { type: 'invoice', confidence: 0.98, entities: extractInvoiceEntities(message) };
    }
    if (lowerMsg.includes('devis') || lowerMsg.includes('devis')) {
      return { type: 'quote', confidence: 0.97, entities: extractQuoteEntities(message) };
    }
    if (lowerMsg.includes('dépense') || lowerMsg.includes('frais') || lowerMsg.includes('achat')) {
      return { type: 'expense', confidence: 0.95, entities: extractExpenseEntities(message) };
    }
    if (lowerMsg.includes('bilan') || lowerMsg.includes('compte') || lowerMsg.includes('résultat')) {
      return { type: 'balance', confidence: 0.96, entities: {} };
    }
    if (lowerMsg.includes('tva') || lowerMsg.includes('taxe') || lowerMsg.includes('déclaration')) {
      return { type: 'tax', confidence: 0.94, entities: {} };
    }
    if (lowerMsg.includes('trésorerie') || lowerMsg.includes('cash') || lowerMsg.includes('flux')) {
      return { type: 'cashflow', confidence: 0.93, entities: {} };
    }
    
    // ADMINISTRATIF
    if (lowerMsg.includes('email') || lowerMsg.includes('mail') || lowerMsg.includes('envoyer')) {
      return { type: 'email', confidence: 0.95, entities: extractEmailEntities(message) };
    }
    if (lowerMsg.includes('réunion') || lowerMsg.includes('meet') || lowerMsg.includes('point')) {
      return { type: 'meeting', confidence: 0.94, entities: extractMeetingEntities(message) };
    }
    if (lowerMsg.includes('rendez-vous') || lowerMsg.includes('rdv')) {
      return { type: 'appointment', confidence: 0.96, entities: extractAppointmentEntities(message) };
    }
    
    // SUGGESTIONS
    if (lowerMsg.includes('suggestion') || lowerMsg.includes('idée') || lowerMsg.includes('conseil')) {
      return { type: 'suggestion', confidence: 0.92, entities: {} };
    }
    if (lowerMsg.includes('rapport') || lowerMsg.includes('reporting')) {
      return { type: 'report', confidence: 0.93, entities: extractReportEntities(message) };
    }
    
    return { type: 'unknown', confidence: 0.3 };
  };

  // Extracteurs d'entités
  const extractInvoiceEntities = (text) => {
    const clientMatch = clients.find(c => text.toLowerCase().includes(c.name.toLowerCase()));
    const amountMatch = text.match(/(\d+[\s\d]*)\s*[€e]uros?/i);
    
    return {
      client: clientMatch?.name || 'Client',
      clientEmail: clientMatch?.email || '',
      amount: amountMatch ? amountMatch[1] : null,
      subject: extractSubject(text),
      dueDate: extractDate(text)
    };
  };

  const extractQuoteEntities = (text) => extractInvoiceEntities(text);

  const extractExpenseEntities = (text) => {
    return {
      description: text.replace(/dépense|frais|achat/i, '').trim() || 'Dépense',
      amount: text.match(/(\d+)/)?.[1] || null,
      category: text.includes('transport') ? 'transport' : 
               text.includes('fourniture') ? 'fournitures' : 'divers'
    };
  };

  const extractEmailEntities = (text) => {
    const emailRegex = /[\w.-]+@[\w.-]+\.\w+/;
    const match = text.match(emailRegex);
    const clientMatch = clients.find(c => text.toLowerCase().includes(c.name.toLowerCase()));
    
    return {
      to: match ? match[0] : (clientMatch?.email || 'contact@client.fr'),
      clientName: clientMatch?.name || '',
      subject: extractSubject(text),
      priority: text.includes('urgent') ? 'haute' : 'normale'
    };
  };

  const extractMeetingEntities = (text) => {
    return {
      title: text.replace(/r[eé]union|meeting|point/i, '').trim() || 'Point',
      date: extractDate(text),
      time: extractTime(text),
      participants: extractParticipants(text),
      isVideo: text.includes('visio') || text.includes('vidéo')
    };
  };

  const extractAppointmentEntities = (text) => {
    const clientMatch = clients.find(c => text.toLowerCase().includes(c.name.toLowerCase()));
    
    return {
      client: clientMatch?.name || 'Client',
      clientEmail: clientMatch?.email || '',
      purpose: text.includes('facture') ? 'Facture' : 
               text.includes('contrat') ? 'Contrat' : 'Rendez-vous',
      date: extractDate(text),
      time: extractTime(text)
    };
  };

  const extractReportEntities = (text) => {
    if (text.includes('vente')) return 'sales';
    if (text.includes('financier')) return 'financial';
    if (text.includes('projet')) return 'project';
    return 'general';
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
    employees.forEach(emp => {
      if (text.toLowerCase().includes(emp.name.toLowerCase())) {
        participants.push(emp.email);
      }
    });
    return participants.length > 0 ? participants : ['equipe@entreprise.fr'];
  };

  // Générer réponse
  const generateAIResponse = (intent, message) => {
    switch(intent.type) {
      case 'invoice':
        return {
          text: `💰 Je crée une facture pour ${intent.entities.client}. Je prépare le formulaire.`,
          action: 'invoice',
          data: intent.entities
        };
        
      case 'quote':
        return {
          text: `📝 Je prépare un devis pour ${intent.entities.client}.`,
          action: 'quote',
          data: intent.entities
        };
        
      case 'expense':
        return {
          text: `💳 Je saisis une dépense de ${intent.entities.amount || '...'}€ pour ${intent.entities.description}.`,
          action: 'expense',
          data: intent.entities
        };
        
      case 'balance':
        return {
          text: `📊 Voici le résumé de vos comptes :\n\n` +
                `• Chiffre d'affaires: 1 250 000 €\n` +
                `• Charges: 850 000 €\n` +
                `• Résultat net: 400 000 €\n` +
                `• Trésorerie: 245 000 €\n\nVoulez-vous un rapport détaillé ?`,
          action: null,
          data: {}
        };
        
      case 'tax':
        return {
          text: `🧾 Prochaine échéance TVA: 25/03/2025\n` +
                `TVA collectée: 45 200 €\n` +
                `TVA déductible: 12 800 €\n` +
                `TVA à payer: 32 400 €\n\nJe prépare la déclaration.`,
          action: 'tax',
          data: {}
        };
        
      case 'cashflow':
        return {
          text: `💶 Trésorerie actuelle: 245 000 €\n` +
                `Entrées prévues (30j): +125 000 €\n` +
                `Sorties prévues (30j): -95 000 €\n` +
                `Solde prévisionnel: 275 000 €\n\nBesoin d'une analyse plus détaillée ?`,
          action: null,
          data: {}
        };
        
      case 'email':
        return {
          text: `📧 J'envoie un email à ${intent.entities.to || '...'}.`,
          action: 'email',
          data: intent.entities
        };
        
      case 'meeting':
        return {
          text: `📅 Je planifie une réunion sur "${intent.entities.title}".`,
          action: 'meeting',
          data: intent.entities
        };
        
      case 'appointment':
        return {
          text: `📆 Je fixe un rendez-vous avec ${intent.entities.client}.`,
          action: 'appointment',
          data: intent.entities
        };
        
      case 'suggestion':
        return {
          text: `💡 **Suggestions du jour** :\n\n${suggestions.map(s => 
            `• ${s.title} (${s.priority}) : ${s.description}`
          ).join('\n')}`,
          action: 'suggestions',
          data: suggestions
        };
        
      default:
        return {
          text: "Je suis votre assistant hybride (comptable + assistante). Je peux vous aider avec :\n\n💰 **Comptabilité** : Factures, devis, TVA, bilan\n📧 **Administratif** : Emails, réunions, rendez-vous\n💡 **Suggestions** : Alertes, optimisations\n\nQue souhaitez-vous faire ?",
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

      if (response.action && !['suggestions', 'balance', 'cashflow', 'tax'].includes(response.action)) {
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
  const handleCreateInvoice = async (values) => {
    try {
      const result = await generateInvoice(values);
      saveInvoice(values);
      message.success(`💰 Facture ${result.invoiceNumber} créée`);
      
      const botMessage = {
        id: messages.length + 3,
        type: 'bot',
        text: `💰 Facture créée pour **${values.client}** - Montant: ${formatCurrency(values.amount)}`,
        time: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, botMessage]);
      saveTask({ type: 'invoice', description: `Facture ${values.client}`, result: 'succès' });
      
    } catch (error) {
      message.error('❌ Erreur création facture');
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

  const handleSendEmail = async (values) => {
    try {
      const result = await sendEmail(values);
      saveEmail(values);
      message.success(`📧 Email envoyé à ${values.to}`);
      
      const botMessage = {
        id: messages.length + 3,
        type: 'bot',
        text: `📧 Email envoyé à **${values.to}**`,
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

  const handleCreateAppointment = async (values) => {
    try {
      const appointmentData = {
        ...values,
        date: values.date.format('DD/MM/YYYY'),
        time: values.time.format('HH:mm'),
        created: new Date().toISOString()
      };
      const result = await createAppointment(appointmentData);
      saveAppointment(appointmentData);
      message.success(`✅ Rendez-vous avec ${appointmentData.client} confirmé`);
      
      const botMessage = {
        id: messages.length + 3,
        type: 'bot',
        text: `✅ Rendez-vous avec **${appointmentData.client}** le ${appointmentData.date} à ${appointmentData.time}`,
        time: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, botMessage]);
      saveTask({ type: 'appointment', description: `RDV: ${appointmentData.client}`, result: 'succès' });
      
    } catch (error) {
      message.error('❌ Erreur création rendez-vous');
    }
    setModalVisible(false); 
    form.resetFields();
  };

  // Rendu des modals
  const renderModal = () => {
    switch(modalType) {
      case 'invoice':
        return (
          <Modal
            title={<><FileTextOutlined style={{ color: '#722ed1' }} /> Créer une facture</>}
            open={modalVisible} 
            onCancel={() => setModalVisible(false)} 
            footer={null} 
            width={550}
          >
            <Form form={form} layout="vertical" onFinish={handleCreateInvoice}>
              <Form.Item name="client" label="Client" rules={[{ required: true }]}>
                <Select showSearch placeholder="Sélectionner un client">
                  {clients.map(c => <Option key={c.id} value={c.name}>{c.name}</Option>)}
                </Select>
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="amount" label="Montant HT" rules={[{ required: true }]}>
                    <Input prefix={<EuroOutlined />} type="number" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="tva" label="TVA" initialValue={20}>
                    <Select>
                      <Option value={20}>20%</Option>
                      <Option value={10}>10%</Option>
                      <Option value={5.5}>5.5%</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="dueDate" label="Date d'échéance">
                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
              </Form.Item>
              <Form.Item name="description" label="Description">
                <TextArea rows={3} placeholder="Prestations..." />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block>Générer la facture</Button>
              </Form.Item>
            </Form>
          </Modal>
        );
        
      case 'meeting':
        return (
          <Modal
            title={<><CalendarOutlined style={{ color: '#722ed1' }} /> Planifier réunion</>}
            open={modalVisible} 
            onCancel={() => setModalVisible(false)} 
            footer={null} 
            width={550}
          >
            <Form form={form} layout="vertical" onFinish={handleCreateMeeting}>
              <Form.Item name="title" label="Titre" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="date" label="Date">
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="time" label="Heure">
                    <TimePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="participants" label="Participants">
                <Select mode="tags" placeholder="Emails">
                  {employees.map(e => <Option key={e.id} value={e.email}>{e.name}</Option>)}
                </Select>
              </Form.Item>
              <Form.Item name="isVideo" valuePropName="checked">
                <Checkbox>Visioconférence</Checkbox>
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block>Planifier</Button>
              </Form.Item>
            </Form>
          </Modal>
        );
        
      case 'email':
        return (
          <Modal
            title={<><MailOutlined style={{ color: '#722ed1' }} /> Envoyer un email</>}
            open={modalVisible} 
            onCancel={() => setModalVisible(false)} 
            footer={null} 
            width={550}
          >
            <Form form={form} layout="vertical" onFinish={handleSendEmail}>
              <Form.Item name="to" label="Destinataire" rules={[{ required: true, type: 'email' }]}>
                <Input />
              </Form.Item>
              <Form.Item name="subject" label="Sujet" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
              <Form.Item name="body" label="Message" rules={[{ required: true }]}>
                <TextArea rows={5} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block>Envoyer</Button>
              </Form.Item>
            </Form>
          </Modal>
        );
        
      case 'appointment':
        return (
          <Modal
            title={<><ScheduleOutlined style={{ color: '#722ed1' }} /> Fixer rendez-vous</>}
            open={modalVisible} 
            onCancel={() => setModalVisible(false)} 
            footer={null} 
            width={550}
          >
            <Form form={form} layout="vertical" onFinish={handleCreateAppointment}>
              <Form.Item name="client" label="Client" rules={[{ required: true }]}>
                <Select showSearch>
                  {clients.map(c => <Option key={c.id} value={c.name}>{c.name}</Option>)}
                </Select>
              </Form.Item>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="date" label="Date">
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="time" label="Heure">
                    <TimePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="purpose" label="Objet">
                <Select>
                  <Option value="facture">Facture</Option>
                  <Option value="contrat">Contrat</Option>
                  <Option value="projet">Projet</Option>
                  <Option value="autre">Autre</Option>
                </Select>
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block>Confirmer</Button>
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
      <div className="enterprise-assistant-card">
        <div className="assistant-header" style={{ background: 'linear-gradient(135deg, #722ed1, #b37feb)' }}>
          <Space>
            <Avatar icon={<ApartmentOutlined />} style={{ background: '#531dab' }} />
            <div>
              <Text strong style={{ color: 'white', fontSize: '14px' }}>Assistant Entreprise</Text>
              <br />
              <Badge status="processing" text="Comptable + Assistante" style={{ color: '#efdbff', fontSize: '11px' }} />
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
                  icon={<ApartmentOutlined />} 
                  size="small" 
                  style={{ background: '#722ed1', marginRight: '6px', width: '24px', height: '24px', fontSize: '12px' }} 
                />
              )}
              <div className="message-content" style={{
                maxWidth: '85%', 
                padding: '6px 10px', 
                borderRadius: '12px',
                background: msg.type === 'user' ? '#722ed1' : 'white',
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
                icon={<ApartmentOutlined />} 
                size="small" 
                style={{ background: '#722ed1', marginRight: '6px', width: '24px', height: '24px' }} 
              />
              <div className="typing-dots" style={{ display: 'flex', gap: '4px', padding: '6px 10px', background: 'white', borderRadius: '12px' }}>
                {[0,1,2].map(i => (
                  <span 
                    key={i} 
                    style={{ 
                      width: '6px', 
                      height: '6px', 
                      background: '#722ed1', 
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
              {['Créer une facture', 'Planifier réunion', 'Voir les suggestions', 'Envoyer email'].map((sugg, idx) => (
                <Tag 
                  key={idx} 
                  className="suggestion-tag" 
                  style={{ 
                    cursor: 'pointer', 
                    background: '#f9f0ff', 
                    borderColor: '#d3adf7', 
                    color: '#722ed1', 
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

        <div className="assistant-input" style={{ padding: '10px', borderTop: '1px solid #f0f0f0', background: 'white' }}>
          <Input.TextArea 
            rows={2} 
            value={inputValue} 
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ex: 'Crée une facture pour TechCorp'"
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
            style={{ marginTop: '6px', width: '100%', background: '#722ed1', borderColor: '#722ed1', height: '32px', fontSize: '12px' }}
          >
            Envoyer
          </Button>
        </div>

        {renderModal()}

        <style>{`
          .enterprise-assistant-card { 
            width: 100%; 
            background: white; 
            border-radius: 12px; 
            box-shadow: 0 8px 24px rgba(0,0,0,0.15); 
            overflow: hidden; 
            border: 1px solid #722ed1; 
          }
          .assistant-header { 
            background: linear-gradient(135deg, #722ed1, #b37feb); 
            padding: 10px; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
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

export default EnterpriseAssistant;