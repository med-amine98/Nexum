import { useState, useEffect, useCallback } from 'react';
import copilotService from '../services/copilotService';
import { message } from 'antd';

export const useCopilot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [context, setContext] = useState({});

  // Initialiser le service
  useEffect(() => {
    copilotService.initContext({ id: 'current-user' });
    
    // Message de bienvenue
    setMessages([
      {
        id: 1,
        type: 'assistant',
        content: "Bonjour ! Je suis votre Copilot ERP. Comment puis-je vous aider aujourd'hui ?",
        timestamp: new Date()
      }
    ]);
  }, []);

  // Mettre à jour les suggestions quand le contexte change
  useEffect(() => {
    const newSuggestions = copilotService.getSuggestions(context);
    setSuggestions(newSuggestions);
  }, [context]);

  // Envoyer un message
  const sendMessage = useCallback(async (content) => {
    if (!content.trim()) return;

    // Ajouter le message utilisateur
    const userMessage = {
      id: messages.length + 1,
      type: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Appeler le service
      const result = await copilotService.sendMessage(content, context);

      // Ajouter la réponse
      const assistantMessage = {
        id: messages.length + 2,
        type: 'assistant',
        content: result.response,
        timestamp: new Date(),
        intent: result.intent,
        data: result.actionResult
      };
      setMessages(prev => [...prev, assistantMessage]);

      // Notification pour les actions réussies
      if (result.actionResult) {
        message.success('Action exécutée avec succès !');
      }
    } catch (error) {
      message.error('Erreur lors du traitement');
    } finally {
      setIsTyping(false);
    }
  }, [messages, context]);

  // Exécuter une suggestion
  const executeSuggestion = useCallback(async (suggestion) => {
    await sendMessage(suggestion.text);
  }, [sendMessage]);

  // Mettre à jour le contexte
  const updateContext = useCallback((newContext) => {
    setContext(prev => ({ ...prev, ...newContext }));
  }, []);

  // Effacer la conversation
  const clearConversation = useCallback(() => {
    setMessages([
      {
        id: 1,
        type: 'assistant',
        content: "Conversation effacée. Comment puis-je vous aider ?",
        timestamp: new Date()
      }
    ]);
  }, []);

  // Exporter l'historique
  const exportHistory = useCallback(() => {
    const history = messages.map(m => ({
      role: m.type,
      content: m.content,
      time: m.timestamp.toLocaleString()
    }));
    return JSON.stringify(history, null, 2);
  }, [messages]);

  return {
    isOpen,
    setIsOpen,
    messages,
    isTyping,
    suggestions,
    sendMessage,
    executeSuggestion,
    updateContext,
    clearConversation,
    exportHistory
  };
};