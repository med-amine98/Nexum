// src/modules/ai/assistants/NexyPredict/NexyPredictAssistant.js
import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, Space, Avatar, Tag, Typography, Progress, Tooltip, message } from 'antd';
import { FundOutlined, SendOutlined, UserOutlined, CloseOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';

const { Text } = Typography;
const { TextArea } = Input;

const NexyPredictAssistant = ({ onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const suggestions = [
    { text: "📈 Prévisions des ventes", prompt: "Prévisions des ventes pour le mois prochain" },
    { text: "📊 Scoring de crédit", prompt: "Analyse le score de crédit" },
    { text: "⚠️ Prédiction attrition", prompt: "Clients à risque d'attrition" }
  ];

  useEffect(() => {
    setMessages([
      { id: 1, type: 'bot', text: "📊 **Nexy Predict** - Expert en analyses prédictives\n\nComment puis-je vous aider ?", time: new Date().toLocaleTimeString() }
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
        text: "📈 **Prévisions des ventes**\n\nCroissance: +15.3%\nConfiance: 92%\n\nFacteurs clés:\n• Saisonnalité (+25%)\n• Marketing (+35%)",
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
      {[0, 1, 2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#1890ff', animation: 'bounce 0.6s infinite', animationDelay: `${i * 0.2}s` }} />)}
      <style>{`@keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }`}</style>
    </div>
  );

  const MessageBubble = ({ msg }) => {
    const isBot = msg.type === 'bot';
    return (
      <div style={{ display: 'flex', justifyContent: isBot ? 'flex-start' : 'flex-end', marginBottom: 16 }}>
        {isBot && <Avatar icon={<FundOutlined />} size="small" style={{ background: '#1890ff', marginRight: 8 }} />}
        <div style={{ maxWidth: '85%', padding: '10px 14px', borderRadius: isBot ? '18px 18px 18px 4px' : '18px 18px 4px 18px', background: isBot ? '#f5f5f5' : '#1890ff', color: isBot ? '#333' : 'white' }}>
          <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{msg.text}</div>
          <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7, textAlign: 'right' }}>{msg.time}</div>
        </div>
        {!isBot && <Avatar icon={<UserOutlined />} size="small" style={{ background: '#52c41a', marginLeft: 8 }} />}
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9, y: 20 }} style={{ position: 'fixed', bottom: 100, right: 30, width: 380, zIndex: 10000 }}>
      <Card style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 40px rgba(24,144,255,0.25)', border: '1px solid #40a9ff', padding: 0 }}>
        <div style={{ background: '#1890ff', padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space><Avatar icon={<FundOutlined />} style={{ background: '#096dd9' }} /><div><span style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Nexy Predict</span><br /><span style={{ color: '#bae7ff', fontSize: 11 }}>Expert prédictif</span></div></Space>
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
            {suggestions.map((s, i) => (<Tag key={i} style={{ cursor: 'pointer', background: '#e6f7ff', borderColor: '#91d5ff', color: '#1890ff' }} onClick={() => handleSuggestion(s.prompt)}>{s.text}</Tag>))}
          </div>
        </div>

        <div style={{ padding: 12, borderTop: '1px solid #f0f0f0', background: 'white' }}>
          <TextArea ref={inputRef} rows={2} value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Posez votre question..." onPressEnter={(e) => { e.preventDefault(); handleSendMessage(); }} style={{ borderRadius: 8, resize: 'none', fontSize: 12 }} />
          <Button type="primary" icon={<SendOutlined />} onClick={handleSendMessage} style={{ marginTop: 8, width: '100%', background: '#1890ff', borderColor: '#1890ff' }}>Envoyer</Button>
        </div>
      </Card>
    </motion.div>
  );
};

export default NexyPredictAssistant;