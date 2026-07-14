// hooks/useVoiceAssistant.js
import { useState, useEffect, useCallback, useRef } from 'react';

export const useVoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState(null);
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef(null);
  const timeoutRef = useRef(null);
  const isStartedRef = useRef(false);

  useEffect(() => {
    // Vérifier le support du navigateur
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setSupported(false);
      setError('Votre navigateur ne supporte pas la reconnaissance vocale');
      return;
    }

    // Initialiser la reconnaissance vocale
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    
    // Configuration - CORRECTION: continuous à true
    recognitionRef.current.continuous = true; // ← Changé à true pour écouter en continu
    recognitionRef.current.interimResults = true; // ← Changé à true pour voir les résultats intermédiaires
    recognitionRef.current.lang = 'fr-FR';
    recognitionRef.current.maxAlternatives = 1;

    // Gestionnaires d'événements
    recognitionRef.current.onresult = (event) => {
      const last = event.results.length - 1;
      const text = event.results[last][0].transcript;
      setTranscript(text);
      
      // Réinitialiser le timeout à chaque parole détectée
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      // Arrêter automatiquement après 2 secondes de silence
      timeoutRef.current = setTimeout(() => {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      }, 2000);
    };

    recognitionRef.current.onerror = (event) => {
      console.error('❌ Erreur reconnaissance vocale:', event.error);
      
      // Ignorer l'erreur "no-speech" qui est normale
      if (event.error !== 'no-speech') {
        setError(`Erreur: ${event.error}`);
      }
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
      isStartedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };

    recognitionRef.current.onstart = () => {
      setIsListening(true);
      isStartedRef.current = true;
    };

    // Nettoyage
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.error('Erreur nettoyage:', e);
        }
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      setError('Reconnaissance vocale non initialisée');
      return;
    }

    if (isStartedRef.current) {
      return;
    }

    try {
      setError(null);
      setTranscript('');
      isStartedRef.current = true;
      recognitionRef.current.start();
    } catch (err) {
      console.error('❌ Erreur au démarrage:', err);
      isStartedRef.current = false;
      setIsListening(false);
      setError('Erreur au démarrage');
    }
  }, []); // Retiré isListening des dépendances

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        console.error('❌ Erreur à l\'arrêt:', err);
      }
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return {
    isListening,
    transcript,
    error,
    supported,
    startListening,
    stopListening
  };
};