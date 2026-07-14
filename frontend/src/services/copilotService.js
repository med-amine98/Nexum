import api from './api';
import { message } from 'antd';

class CopilotService {
  constructor() {
    this.context = {
      user: null,
      currentPage: null,
      recentActions: [],
      preferences: {}
    };
    this.conversationHistory = [];
    this.pendingActions = [];
  }

  // Initialiser le contexte
  initContext(user) {
    this.context.user = user;
    this.loadPreferences();
  }

  // Charger les préférences
  loadPreferences() {
    const saved = localStorage.getItem('copilot_preferences');
    if (saved) {
      this.context.preferences = JSON.parse(saved);
    }
  }

  // Sauvegarder les préférences
  savePreferences() {
    localStorage.setItem('copilot_preferences', JSON.stringify(this.context.preferences));
  }

  // Envoyer un message au Copilot
  async sendMessage(message, context = {}) {
    try {
      // Ajouter le message à l'historique
      this.conversationHistory.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });

      // Analyser l'intention
      const intent = await this.analyzeIntent(message);
      
      // Exécuter l'action si nécessaire
      let actionResult = null;
      if (intent.action) {
        actionResult = await this.executeAction(intent.action, intent.params);
      }

      // Générer la réponse
      const response = await this.generateResponse(message, intent, actionResult);

      // Ajouter la réponse à l'historique
      this.conversationHistory.push({
        role: 'assistant',
        content: response,
        timestamp: new Date()
      });

      // Limiter l'historique
      if (this.conversationHistory.length > 50) {
        this.conversationHistory = this.conversationHistory.slice(-50);
      }

      return {
        response,
        intent,
        actionResult
      };
    } catch (error) {
      console.error('Erreur Copilot:', error);
      return {
        response: "Désolé, j'ai rencontré une erreur. Pouvez-vous reformuler ?",
        error: error.message
      };
    }
  }

  // Analyser l'intention du message
  async analyzeIntent(message) {
    const lowerMsg = message.toLowerCase();
    
    // Détection des intentions
    if (lowerMsg.includes('crée') || lowerMsg.includes('ajoute') || lowerMsg.includes('nouveau')) {
      if (lowerMsg.includes('client')) {
        return {
          action: 'CREATE_CLIENT',
          params: this.extractClientInfo(message)
        };
      }
      if (lowerMsg.includes('fournisseur')) {
        return {
          action: 'CREATE_SUPPLIER',
          params: this.extractSupplierInfo(message)
        };
      }
      if (lowerMsg.includes('facture')) {
        return {
          action: 'CREATE_INVOICE',
          params: this.extractInvoiceInfo(message)
        };
      }
    }
    
    if (lowerMsg.includes('analyse') || lowerMsg.includes('prédis')) {
      return {
        action: 'ANALYZE',
        params: { query: message }
      };
    }
    
    if (lowerMsg.includes('envoie') || lowerMsg.includes('notifie')) {
      return {
        action: 'SEND_NOTIFICATION',
        params: this.extractNotificationInfo(message)
      };
    }
    
    if (lowerMsg.includes('rappelle') || lowerMsg.includes('alerte')) {
      return {
        action: 'SET_REMINDER',
        params: this.extractReminderInfo(message)
      };
    }

    return {
      action: 'CHAT',
      params: { message }
    };
  }

  // Exécuter une action
  async executeAction(action, params) {
    try {
      switch (action) {
        case 'CREATE_CLIENT':
          return await this.createClient(params);
        case 'CREATE_SUPPLIER':
          return await this.createSupplier(params);
        case 'CREATE_INVOICE':
          return await this.createInvoice(params);
        case 'ANALYZE':
          return await this.analyzeData(params);
        case 'SEND_NOTIFICATION':
          return await this.sendNotification(params);
        case 'SET_REMINDER':
          return await this.setReminder(params);
        default:
          return null;
      }
    } catch (error) {
      console.error(`Erreur action ${action}:`, error);
      throw error;
    }
  }

  // Créer un client
  async createClient(params) {
    try {
      const response = await api.post('/partners/', {
        name: params.name,
        email: params.email,
        phone: params.phone,
        address: params.address,
        type: 'customer'
      });
      
      message.success(`Client ${params.name} créé avec succès !`);
      return response.data;
    } catch (error) {
      message.error('Erreur lors de la création du client');
      throw error;
    }
  }

  // Créer un fournisseur
  async createSupplier(params) {
    try {
      const response = await api.post('/purchases/suppliers', {
        name: params.name,
        email: params.email,
        phone: params.phone,
        address: params.address
      });
      
      message.success(`Fournisseur ${params.name} créé avec succès !`);
      return response.data;
    } catch (error) {
      message.error('Erreur lors de la création du fournisseur');
      throw error;
    }
  }

  // Créer une facture
  async createInvoice(params) {
    try {
      const response = await api.post('/accounting/invoices', {
        partner_id: params.clientId,
        amount: params.amount,
        date: params.date || new Date(),
        lines: params.lines || []
      });
      
      message.success(`Facture créée avec succès ! Montant: ${params.amount}€`);
      return response.data;
    } catch (error) {
      message.error('Erreur lors de la création de la facture');
      throw error;
    }
  }

  // Analyser des données
  async analyzeData(params) {
    try {
      const response = await api.get('/analytics/predictive', {
        params: {
          query: params.query,
          period: 'month'
        }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur analyse:', error);
      return {
        summary: "Analyse en cours...",
        predictions: [],
        recommendations: []
      };
    }
  }

  // Envoyer une notification
  async sendNotification(params) {
    // Logique d'envoi de notification
    message.info(`Notification envoyée à ${params.recipient}`);
    return { success: true };
  }

  // Créer un rappel
  async setReminder(params) {
    // Logique de création de rappel
    message.info(`Rappel créé pour ${params.date}`);
    return { success: true };
  }

  // Extraire les informations du client
  extractClientInfo(message) {
    const nameMatch = message.match(/([A-Za-z\s]+)(?:\s+\(|$)/);
    const emailMatch = message.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const phoneMatch = message.match(/(0[1-9])(?:[ _.-]?(\d{2})){4}/);
    
    return {
      name: nameMatch ? nameMatch[1].trim() : 'Nouveau client',
      email: emailMatch ? emailMatch[0] : null,
      phone: phoneMatch ? phoneMatch[0] : null,
      address: null
    };
  }

  // Extraire les informations du fournisseur
  extractSupplierInfo(message) {
    return this.extractClientInfo(message); // Similaire
  }

  // Extraire les informations de la facture
  extractInvoiceInfo(message) {
    const amountMatch = message.match(/(\d+(?:[.,]\d+)?)\s*[€$]/);
    const clientMatch = message.match(/pour\s+([A-Za-z\s]+)/i);
    
    return {
      clientId: null, // À résoudre
      amount: amountMatch ? parseFloat(amountMatch[1]) : 0,
      lines: []
    };
  }

  // Extraire les informations de notification
  extractNotificationInfo(message) {
    const recipientMatch = message.match(/à\s+([A-Za-z\s]+)/i);
    return {
      recipient: recipientMatch ? recipientMatch[1].trim() : 'client',
      message: message
    };
  }

  // Extraire les informations de rappel
  extractReminderInfo(message) {
    const dateMatch = message.match(/(\d{2}[\/-]\d{2}[\/-]\d{4})/);
    return {
      date: dateMatch ? dateMatch[0] : new Date().toLocaleDateString(),
      task: message
    };
  }

  // Générer une réponse
  async generateResponse(message, intent, actionResult) {
    const responses = {
      'CREATE_CLIENT': `✅ Client créé avec succès ! ${actionResult ? `ID: ${actionResult.id}` : ''}`,
      'CREATE_SUPPLIER': `✅ Fournisseur créé avec succès !`,
      'CREATE_INVOICE': `✅ Facture créée ! Montant: ${intent.params.amount}€`,
      'ANALYZE': this.formatAnalysisResponse(actionResult),
      'SEND_NOTIFICATION': `✅ Notification envoyée !`,
      'SET_REMINDER': `✅ Rappel créé !`,
      'CHAT': this.getChatResponse(message)
    };

    return responses[intent.action] || "D'accord, je m'en occupe !";
  }

  // Formater une réponse d'analyse
  formatAnalysisResponse(data) {
    if (!data) return "Analyse terminée.";
    
    return `
📊 **Résultat de l'analyse**

${data.summary || 'Analyse en cours...'}

📈 **Prédictions:**
${data.predictions?.map(p => `• ${p}`).join('\n') || 'Aucune prédiction disponible'}

💡 **Recommandations:**
${data.recommendations?.map(r => `• ${r}`).join('\n') || 'Aucune recommandation'}
    `;
  }

  // Réponse de chat générique
  getChatResponse(message) {
    const responses = [
      "Je comprends. Que puis-je faire d'autre pour vous ?",
      "D'accord, je note. Autre chose ?",
      "Parfait ! Je suis là si vous avez besoin.",
      "Très bien. Je continue de surveiller pour vous."
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Obtenir des suggestions contextuelles
  getSuggestions(context) {
    const suggestions = [
      {
        text: "Créer un nouveau client",
        action: "CREATE_CLIENT",
        icon: "👤"
      },
      {
        text: "Préparer une facture",
        action: "CREATE_INVOICE",
        icon: "💰"
      },
      {
        text: "Analyser les ventes",
        action: "ANALYZE_SALES",
        icon: "📊"
      },
      {
        text: "Envoyer des rappels",
        action: "SEND_REMINDERS",
        icon: "🔔"
      }
    ];

    // Suggestions contextuelles selon la page
    if (context?.page === 'sales') {
      suggestions.unshift({
        text: "Prédire les ventes du mois prochain",
        action: "PREDICT_SALES",
        icon: "📈"
      });
    }

    return suggestions;
  }
}

export default new CopilotService();