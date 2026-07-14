// src/modules/ai/assistants/NexyGrowth/NexyGrowthAssistant.js
import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, Space, Avatar, Tag, Typography, message } from 'antd';
import { RiseOutlined, SendOutlined, UserOutlined, CloseOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';

const { Text } = Typography;
const { TextArea } = Input;

const NexyGrowthAssistant = ({ onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const suggestions = [
    { text: "🚀 Opportunités", prompt: "Quelles sont les opportunités de croissance ?" },
    { text: "📈 Stratégie marketing", prompt: "Quelle stratégie marketing recommandes-tu ?" },
    { text: "🌍 Expansion", prompt: "Quels sont les marchés porteurs ?" }
  ];

  useEffect(() => {
    setMessages([
      { id: 1, type: 'bot', text: "📈 **Nexy Growth** - Expert en stratégie de croissance\n\nComment puis-je vous aider ?", time: new Date().toLocaleTimeString() }
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    setMessages(prev => [...prev, { id: prev.length + 1, type: 'user', text: inputValue, time: new Date().toLocaleTimeString() }]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: prev.length + 1,
        type: 'bot',
        text: "🚀 **Opportunités de croissance**\n\n**1. Expansion géographique**\n• Asie: +45% potentiel\n**2. Nouveaux segments**\n• PME: +65% conversion\n\n**ROI estimé:** +185%",
        time: new Date().toLocaleTimeString()
      }]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSuggestion = (prompt) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  const TypingIndicator = () => (
    <div style={{ display: 'flex', gap: 4, padding: '8px 12px', background: '#f0f0f0', borderRadius: 18, width: 'fit-content' }}>
      {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#52c41a', animation: 'bounce 0.6s infinite', animationDelay: `${i * 0.2}s` }} />)}
      <style>{`@keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }`}</style>
    </div>
  );

  const MessageBubble = ({ msg }) => {
    const isBot = msg.type === 'bot';
    return (
      <div style={{ display: 'flex', justifyContent: isBot ? 'flex-start' : 'flex-end', marginBottom: 16 }}>
        {isBot && <Avatar icon={<RiseOutlined />} size="small" style={{ background: '#52c41a', marginRight: 8 }} />}
        <div style={{ maxWidth: '85%', padding: '10px 14px', borderRadius: isBot ? '18px 18px 18px 4px' : '18px 18px 4px 18px', background: isBot ? '#f5f5f5' : '#52c41a', color: isBot ? '#333' : 'white' }}>
          <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{msg.text}</div>
          <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7, textAlign: 'right' }}>{msg.time}</div>
        </div>
        {!isBot && <Avatar icon={<UserOutlined />} size="small" style={{ background: '#52c41a', marginLeft: 8 }} />}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} style={{ position: 'fixed', bottom: 100, right: 30, width: 380, zIndex: 10000 }}>
      <Card style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 40px rgba(82,196,26,0.25)', border: '1px solid #95de64', padding: 0 }}>
        <div style={{ background: '#52c41a', padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space><Avatar icon={<RiseOutlined />} style={{ background: '#389e0d' }} /><div><span style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Nexy Growth</span><br /><span style={{ color: '#d9f7be', fontSize: 11 }}>Expert croissance</span></div></Space>
          <Button type="text" icon={<CloseOutlined style={{ color: 'white' }} />} onClick={onClose} size="small" />
        </div>

        <div style={{ height: 320, overflowY: 'auto', padding: 16, background: '#fafafa' }}>
          {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        <div style={{ padding: 12, borderTop: '1px solid #f0f0f0', background: 'white' }}>
          <span style={{ fontSize: 11, color: '#999' }}>Actions rapides:</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {suggestions.map((s, i) => (<Tag key={i} style={{ cursor: 'pointer', background: '#f6ffed', borderColor: '#b7eb8f', color: '#52c41a' }} onClick={() => handleSuggestion(s.prompt)}>{s.text}</Tag>))}
          </div>
        </div>

        <div style={{ padding: 12, borderTop: '1px solid #f0f0f0', background: 'white' }}>
          <TextArea ref={inputRef} rows={2} value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Posez votre question..." onPressEnter={(e) => { e.preventDefault(); handleSendMessage(); }} style={{ borderRadius: 8, resize: 'none', fontSize: 12 }} />
          <Button type="primary" icon={<SendOutlined />} onClick={handleSendMessage} style={{ marginTop: 8, width: '100%', background: '#52c41a', borderColor: '#52c41a' }}>Envoyer</Button>
        </div>
      </Card>
    </motion.div>
  );
};

export default NexyGrowthAssistant;