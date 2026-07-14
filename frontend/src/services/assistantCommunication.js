import { message as antMessage } from 'antd';

class AssistantCommunication {
  constructor() {
    this.listeners = new Map();
    this.messageHistory = [];
    this.activeAssistant = null;
    this.copilotActive = false;
    this.notificationCallbacks = new Map(); // Pour les notifications
  }

  // S'abonner aux messages d'un assistant
  subscribe(assistantId, callback) {
    if (!this.listeners.has(assistantId)) {
      this.listeners.set(assistantId, []);
    }
    this.listeners.get(assistantId).push(callback);
    
    return () => {
      const callbacks = this.listeners.get(assistantId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      }
    };
  }

  // S'abonner aux notifications
  subscribeToNotifications(assistantId, callback) {
    if (!this.notificationCallbacks.has(assistantId)) {
      this.notificationCallbacks.set(assistantId, []);
    }
    this.notificationCallbacks.get(assistantId).push(callback);
    
    return () => {
      const callbacks = this.notificationCallbacks.get(assistantId);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) callbacks.splice(index, 1);
      }
    };
  }

  // Envoyer une notification
  sendNotification(fromId, toId, notification) {
    const notifObj = {
      id: Date.now(),
      from: fromId,
      to: toId,
      type: 'notification',
      title: notification.title || 'Nouvelle notification',
      message: notification.message,
      severity: notification.severity || 'info', // 'info', 'warning', 'error', 'success'
      data: notification.data,
      timestamp: new Date(),
      read: false,
      actionable: notification.actionable || false,
      action: notification.action || null
    };
    
    // Log dans la console
    
    // Afficher une notification Ant Design
    switch(notifObj.severity) {
      case 'success':
        antMessage.success(notifObj.message);
        break;
      case 'warning':
        antMessage.warning(notifObj.message);
        break;
      case 'error':
        antMessage.error(notifObj.message);
        break;
      default:
        antMessage.info(notifObj.message);
    }
    
    // Notifier les abonnés
    const callbacks = this.notificationCallbacks.get(toId);
    if (callbacks) {
      callbacks.forEach(cb => cb(notifObj));
    }
    
    // Si c'est pour le copilot, aussi notifier les listeners normaux
    if (toId === 'copilot') {
      const copilotCallbacks = this.listeners.get('copilot');
      if (copilotCallbacks) {
        copilotCallbacks.forEach(cb => cb(notifObj));
      }
    }
    
    // Ajouter à l'historique
    this.messageHistory.push(notifObj);
    
    return notifObj;
  }

  // Envoyer un message du Copilot vers un assistant
  copilotToAssistant(assistantId, message, context = {}) {
    
    const messageObj = {
      id: Date.now(),
      from: 'copilot',
      to: assistantId,
      content: message,
      context,
      timestamp: new Date(),
      read: false,
      type: message.type || 'message'
    };
    
    this.messageHistory.push(messageObj);
    
    // Notifier l'assistant
    const callbacks = this.listeners.get(assistantId);
    if (callbacks) {
      callbacks.forEach(cb => cb(messageObj));
    }
    
    return messageObj;
  }

  // Envoyer un message d'un assistant vers le Copilot
  assistantToCopilot(assistantId, message, context = {}) {
    
    const messageObj = {
      id: Date.now(),
      from: assistantId,
      to: 'copilot',
      content: message,
      context,
      timestamp: new Date(),
      read: false,
      type: message.type || 'message'
    };
    
    this.messageHistory.push(messageObj);
    
    // Notifier le Copilot
    const copilotCallbacks = this.listeners.get('copilot');
    if (copilotCallbacks) {
      copilotCallbacks.forEach(cb => cb(messageObj));
    }
    
    return messageObj;
  }

  // Communication entre assistants
  assistantToAssistant(fromId, toId, message, context = {}) {
    
    const messageObj = {
      id: Date.now(),
      from: fromId,
      to: toId,
      content: message,
      context,
      timestamp: new Date(),
      read: false,
      type: message.type || 'message'
    };
    
    this.messageHistory.push(messageObj);
    
    const callbacks = this.listeners.get(toId);
    if (callbacks) {
      callbacks.forEach(cb => cb(messageObj));
    }
    
    return messageObj;
  }

  // Déléguer une tâche
  delegateTask(from, to, task, priority = 'medium', dueDate = null) {
    const delegationMessage = {
      type: 'delegation',
      task: task,
      priority: priority,
      dueDate: dueDate,
      status: 'pending',
      from: from,
      to: to
    };
    
    return this.assistantToAssistant(from, to, delegationMessage);
  }

  // Répondre à une délégation
  respondToDelegation(from, to, originalTaskId, response, status = 'completed') {
    const responseMessage = {
      type: 'delegation_response',
      originalTaskId: originalTaskId,
      response: response,
      status: status,
      from: from,
      to: to
    };
    
    return this.assistantToAssistant(from, to, responseMessage);
  }

  // Demander une analyse
  requestAnalysis(from, to, query, data = {}) {
    const analysisRequest = {
      type: 'analysis_request',
      query: query,
      data: data,
      from: from,
      to: to
    };
    
    return this.assistantToAssistant(from, to, analysisRequest);
  }

  // Répondre à une analyse
  respondToAnalysis(from, to, originalRequestId, results) {
    const analysisResponse = {
      type: 'analysis_response',
      originalRequestId: originalRequestId,
      results: results,
      from: from,
      to: to
    };
    
    return this.assistantToAssistant(from, to, analysisResponse);
  }

  // Demander une action spécifique
  requestAction(from, to, action, data = {}) {
    const actionMessage = {
      type: 'action',
      action,
      data,
      from,
      to,
      id: Date.now(),
      timestamp: new Date()
    };
    
    return this.assistantToAssistant(from, to, actionMessage);
  }

  // Obtenir l'historique des messages
  getHistory(assistantId = null, limit = 50) {
    if (assistantId) {
      return this.messageHistory
        .filter(m => m.from === assistantId || m.to === assistantId)
        .slice(-limit);
    }
    return this.messageHistory.slice(-limit);
  }

  // Obtenir les messages non lus
  getUnreadMessages(assistantId) {
    return this.messageHistory.filter(
      m => (m.to === assistantId || m.from === assistantId) && !m.read
    );
  }

  // Marquer comme lu
  markAsRead(messageId) {
    const message = this.messageHistory.find(m => m.id === messageId);
    if (message) {
      message.read = true;
    }
  }

  // Marquer tous les messages comme lus pour un assistant
  markAllAsRead(assistantId) {
    this.messageHistory.forEach(m => {
      if (m.to === assistantId || m.from === assistantId) {
        m.read = true;
      }
    });
  }

  // Vérifier si un assistant est en ligne
  isAssistantOnline(assistantId) {
    // À implémenter avec WebSocket si besoin
    return true;
  }

  // Nettoyer l'historique
  clearHistory() {
    this.messageHistory = [];
  }

  // Obtenir les statistiques de communication
  getStats() {
    const stats = {
      totalMessages: this.messageHistory.length,
      byAssistant: {},
      byType: {}
    };
    
    this.messageHistory.forEach(msg => {
      // Stats par assistant
      if (!stats.byAssistant[msg.from]) {
        stats.byAssistant[msg.from] = { sent: 0, received: 0 };
      }
      if (!stats.byAssistant[msg.to]) {
        stats.byAssistant[msg.to] = { sent: 0, received: 0 };
      }
      
      stats.byAssistant[msg.from].sent++;
      stats.byAssistant[msg.to].received++;
      
      // Stats par type
      const type = msg.type || 'message';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    });
    
    return stats;
  }
}

export default new AssistantCommunication();