import { useState, useEffect, useCallback } from 'react';
import assistantComm from '../services/assistantCommunication';

export const useAssistantCommunication = (assistantId) => {
  const [inbox, setInbox] = useState([]);
  const [outbox, setOutbox] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [activeConversations, setActiveConversations] = useState([]);

  // S'abonner aux messages
  useEffect(() => {
    const handleMessage = (message) => {
      // Message reçu
      if (message.to === assistantId) {
        setInbox(prev => [message, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Mettre à jour les conversations actives
        updateActiveConversations(message.from);
      }
      
      // Message envoyé
      if (message.from === assistantId) {
        setOutbox(prev => [message, ...prev]);
        updateActiveConversations(message.to);
      }
    };

    const unsubscribe = assistantComm.subscribe(assistantId, handleMessage);
    
    // S'abonner aux notifications
    const handleNotification = (notification) => {
      setNotifications(prev => [notification, ...prev]);
      if (!notification.read) {
        setUnreadNotifications(prev => prev + 1);
      }
    };

    const unsubscribeNotif = assistantComm.subscribeToNotifications(assistantId, handleNotification);
    
    // S'abonner aussi au Copilot si c'est le Copilot
    if (assistantId === 'copilot') {
      assistantComm.subscribe('copilot', handleMessage);
    }

    return () => {
      unsubscribe();
      unsubscribeNotif();
    };
  }, [assistantId]);

  // Mettre à jour les conversations actives
  const updateActiveConversations = (otherParty) => {
    setActiveConversations(prev => {
      if (!prev.includes(otherParty)) {
        return [...prev, otherParty];
      }
      return prev;
    });
  };

  // Envoyer un message au Copilot
  const sendToCopilot = useCallback((message, context = {}) => {
    return assistantComm.assistantToCopilot(assistantId, message, context);
  }, [assistantId]);

  // Envoyer un message à un autre assistant
  const sendToAssistant = useCallback((toId, message, context = {}) => {
    return assistantComm.assistantToAssistant(assistantId, toId, message, context);
  }, [assistantId]);

  // Déléguer une tâche
  const delegateTask = useCallback((to, task, priority = 'medium', dueDate = null) => {
    return assistantComm.delegateTask(assistantId, to, task, priority, dueDate);
  }, [assistantId]);

  // Répondre à une délégation
  const respondToDelegation = useCallback((to, originalTaskId, response, status = 'completed') => {
    return assistantComm.respondToDelegation(assistantId, to, originalTaskId, response, status);
  }, [assistantId]);

  // Demander une analyse
  const requestAnalysis = useCallback((to, query, data = {}) => {
    return assistantComm.requestAnalysis(assistantId, to, query, data);
  }, [assistantId]);

  // Répondre à une analyse
  const respondToAnalysis = useCallback((to, originalRequestId, results) => {
    return assistantComm.respondToAnalysis(assistantId, to, originalRequestId, results);
  }, [assistantId]);

  // Demander une action
  const requestAction = useCallback((to, action, data = {}) => {
    return assistantComm.requestAction(assistantId, to, action, data);
  }, [assistantId]);

  // Envoyer une notification
  const sendNotification = useCallback((to, notification) => {
    return assistantComm.sendNotification(assistantId, to, notification);
  }, [assistantId]);

  // Marquer comme lu
  const markAsRead = useCallback((messageId) => {
    assistantComm.markAsRead(messageId);
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Marquer une notification comme lue
  const markNotificationAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadNotifications(prev => Math.max(0, prev - 1));
    assistantComm.markAsRead(notificationId);
  }, []);

  // Marquer tous les messages comme lus
  const markAllAsRead = useCallback(() => {
    assistantComm.markAllAsRead(assistantId);
    setUnreadCount(0);
  }, [assistantId]);

  // Répondre à un message
  const reply = useCallback((originalMessage, response) => {
    return sendToAssistant(originalMessage.from, response, {
      inReplyTo: originalMessage.id,
      originalContent: originalMessage.content
    });
  }, [sendToAssistant]);

  // Obtenir les messages avec un assistant spécifique
  const getConversationWith = useCallback((otherParty) => {
    return [...inbox, ...outbox]
      .filter(m => (m.from === otherParty || m.to === otherParty))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }, [inbox, outbox]);

  // Obtenir les statistiques
  const getStats = useCallback(() => {
    return {
      totalReceived: inbox.length,
      totalSent: outbox.length,
      unread: unreadCount,
      notifications: notifications.length,
      unreadNotifications,
      conversations: activeConversations.length
    };
  }, [inbox, outbox, unreadCount, notifications, unreadNotifications, activeConversations]);

  return {
    // Messages
    inbox,
    outbox,
    unreadCount,
    notifications,
    unreadNotifications,
    activeConversations,
    
    // Envoi
    sendToCopilot,
    sendToAssistant,
    sendNotification,
    
    // Délégation
    delegateTask,
    respondToDelegation,
    
    // Analyse
    requestAnalysis,
    respondToAnalysis,
    
    // Actions
    requestAction,
    
    // Gestion
    markAsRead,
    markNotificationAsRead,
    markAllAsRead,
    reply,
    getConversationWith,
    getStats
  };
};