import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook personnalisé pour gérer les connexions WebSocket
 * @param {string} sector - Le secteur à écouter (banking, insurance, enterprise, all)
 * @param {Function} onMessage - Callback appelé lors de la réception d'un message
 */
export const useWebSocket = (sector = 'all', onMessage) => {
  const ws = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  const connect = useCallback(() => {
    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
      const wsUrl = `${protocol}//${host}/api/v1/ws/notifications?sector=${sector}`;
      
      // Note: On utilise le endpoint assurance par défaut car il est déjà configuré dans main.py
      // Mais on pourrait utiliser /ws/notifications si on l'ajoute au main.py
      
      ws.current = new WebSocket(wsUrl);

      ws.current.onopen = () => {
        setConnected(true);
        setError(null);
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (onMessage) {
            onMessage(data);
          }
        } catch (e) {
          console.error('Erreur parsing message WebSocket:', e);
        }
      };

      ws.current.onerror = (e) => {
        console.error(`❌ Erreur WebSocket (${sector}):`, e);
        setError('Erreur de connexion');
      };

      ws.current.onclose = () => {
        setConnected(false);
        // Tentative de reconnexion après 5 secondes
        setTimeout(connect, 5000);
      };
    } catch (e) {
      console.error('Erreur création WebSocket:', e);
    }
  }, [sector, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((msg) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(typeof msg === 'string' ? msg : JSON.stringify(msg));
    }
  }, []);

  return { connected, error, sendMessage };
};

export default useWebSocket;
