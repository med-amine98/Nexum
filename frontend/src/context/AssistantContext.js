import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuth } from '../services/auth';

const AssistantContext = createContext();

export const useAssistant = () => {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant must be used within an AssistantProvider');
  }
  return context;
};


export const AssistantProvider = ({ children }) => {
  const { user } = useAuth();
  const [selectedAssistant, setSelectedAssistant] = useState(null);
  const [assistantEnabled, setAssistantEnabled] = useState(false);
  const [assistantInitialized, setAssistantInitialized] = useState(false);

  // Charger l'assistant depuis le localStorage au démarrage
  useEffect(() => {
    const assistantKey = `selectedAssistant_${user?.id || 'default'}`;
    const enabledKey = `assistantEnabled_${user?.id || 'default'}`;
    
    const savedAssistant = localStorage.getItem(assistantKey);
    const savedEnabled = localStorage.getItem(enabledKey);
    
    if (savedAssistant) {
      try {
        setSelectedAssistant(JSON.parse(savedAssistant));
      } catch (e) {
        console.error('Erreur parsing assistant:', e);
      }
    } else {
      setSelectedAssistant(null);
    }
    
    if (savedEnabled) {
      setAssistantEnabled(savedEnabled === 'true');
    } else {
      setAssistantEnabled(false);
    }
    
    setAssistantInitialized(true);
  }, [user]);

  // Sauvegarder dans localStorage quand l'assistant change
  useEffect(() => {
    const assistantKey = `selectedAssistant_${user?.id || 'default'}`;
    if (selectedAssistant) {
      localStorage.setItem(assistantKey, JSON.stringify(selectedAssistant));
      // Activer automatiquement l'assistant quand il est sélectionné
      setAssistantEnabled(true);
    } else {
      localStorage.removeItem(assistantKey);
      setAssistantEnabled(false);
    }
  }, [selectedAssistant, user]);

  // Sauvegarder l'état d'activation
  useEffect(() => {
    const enabledKey = `assistantEnabled_${user?.id || 'default'}`;
    localStorage.setItem(enabledKey, assistantEnabled.toString());
  }, [assistantEnabled, user]);

  const enableAssistant = () => {
    setAssistantEnabled(true);
  };

  const disableAssistant = () => {
    setAssistantEnabled(false);
  };

  const toggleAssistant = () => {
    setAssistantEnabled(prev => !prev);
  };

  const value = {
    selectedAssistant,
    setSelectedAssistant,
    assistantEnabled,
    enableAssistant,
    disableAssistant,
    toggleAssistant,
    assistantInitialized
  };

  return (
    <AssistantContext.Provider value={value}>
      {children}
    </AssistantContext.Provider>
  );
};