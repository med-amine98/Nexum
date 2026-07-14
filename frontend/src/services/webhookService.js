// frontend/src/services/webhookService.js
const API_URL = 'http://localhost:8000/api/v1';

export const registerWebhook = async (url, events, sector = null) => {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_URL}/webhooks/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ url, events, sector })
  });
  return response.json();
};

// frontend/src/hooks/useNotifications.js
import { useState, useEffect, useCallback } from 'react';

export const useNotifications = (sector = null) => {
  const [notifications, setNotifications] = useState([]);
  const [ws, setWs] = useState(null);

  useEffect(() => {
    // WebSocket pour les notifications en temps réel
    const socket = new WebSocket(`ws://localhost:8000/ws/notifications?token=${localStorage.getItem('token')}`);
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (!sector || data.sector === sector) {
        setNotifications(prev => [data, ...prev].slice(0, 50));
      }
    };

    setWs(socket);
    return () => socket.close();
  }, [sector]);

  const clearNotifications = () => setNotifications([]);

  return { notifications, clearNotifications };
};