// src/modules/ai/assistants/NexyRisk/NexyRiskAssistant.js
import React, { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, Space, Avatar, Tag, Typography, Divider, Progress, Tooltip, Modal, Form, Select, message } from 'antd';
import { SafetyCertificateOutlined, SendOutlined, UserOutlined, CloseOutlined, WarningOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';

const { Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const NexyRiskAssistant = ({ onClose }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const suggestions = [
    { text: "⚠️ Détecter des fraudes", prompt: "Analyse les transactions suspectes" },
    { text: "📄 Analyse AML", prompt: "Vérifie la conformité AML" },
    { text: "📊 Scoring risque", prompt: "Évalue le score de risque" },
    { text: "⚡ Alertes critiques", prompt: "Liste les alertes critiques" }
  ];

  useEffect(() => {
    setMessages([
      {
        id: 1,
        type: 'bot',
        text: "🛡️ **Nexy Risk** - Expert en gestion des risques\n\nJe peux vous aider à détecter les fraudes et analyser les risques.\n\nComment puis-je vous aider ?",
        time: new Date().toLocaleTimeString()
      }
    ]);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMsg = {
      id: messages.length + 1,
      type: 'user',
      text: inputValue,
      time: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const botMsg = {
        id: messages.length + 2,
        type: 'bot',
        text: "🔍 **Analyse des risques**\n\n• 12 transactions suspectes détectées\n• Niveau de risque: Élevé\n• Actions: Bloquer les transactions > 10 000€\n\nConfiance: 94%",
        time: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, botMsg]);
      setIsTyping(false);
    }, 1500);
  };

  const handleSuggestion = (prompt) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  const handleAnalyze = () => {
    setModalVisible(true);
  };

  const TypingIndicator = () => (
    <div style={{ display: 'flex', gap: 4, padding: '8px 12px', background: '#f0f0f0', borderRadius: 18, width: 'fit-content' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#f5222d', animation: 'bounce 0.6s infinite', animationDelay: `${i * 0.2}s` }} />
      ))}
      <style>{`@keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }`}</style>
    </div>
  );

  const MessageBubble = ({ msg }) => {
    const isBot = msg.type === 'bot';
    return (
      <div style={{ display: 'flex', justifyContent: isBot ? 'flex-start' : 'flex-end', marginBottom: 16 }}>
        {isBot && <Avatar icon={<SafetyCertificateOutlined />} size="small" style={{ background: '#f5222d', marginRight: 8 }} />}
        <div style={{
          maxWidth: '85%',
          padding: '10px 14px',
          borderRadius: isBot ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
          background: isBot ? '#f5f5f5' : '#f5222d',
          color: isBot ? '#333' : 'white'
        }}>
          <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{msg.text}</div>
          <div style={{ fontSize: 10, marginTop: 4, opacity: 0.7, textAlign: 'right' }}>{msg.time}</div>
        </div>
        {!isBot && <Avatar icon={<UserOutlined />} size="small" style={{ background: '#52c41a', marginLeft: 8 }} />}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      style={{ position: 'fixed', bottom: 100, right: 30, width: 380, zIndex: 10000 }}
    >
      <Card style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 10px 40px rgba(245,34,45,0.25)', border: '1px solid #ff7875', padding: 0 }}>
        {/* Header */}
        <div style={{ background: '#f5222d', padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Avatar icon={<SafetyCertificateOutlined />} style={{ background: '#b91c1c' }} />
            <div>
              <span style={{ color: 'white', fontWeight: 'bold', fontSize: 14 }}>Nexy Risk</span>
              <br />
              <span style={{ color: '#ffccc7', fontSize: 11 }}>Expert en risques</span>
            </div>
          </Space>
          <Button type="text" icon={<CloseOutlined style={{ color: 'white' }} />} onClick={onClose} size="small" />
        </div>

        {/* Messages */}
        <div style={{ height: 320, overflowY: 'auto', padding: 16, background: '#fafafa' }}>
          {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
          {isTyping && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestions */}
        <div style={{ padding: 12, borderTop: '1px solid #f0f0f0', background: 'white' }}>
          <span style={{ fontSize: 11, color: '#999' }}>Actions rapides:</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {suggestions.map((s, i) => (
              <Tag key={i} style={{ cursor: 'pointer', background: '#fff1f0', borderColor: '#ffa39e', color: '#f5222d' }} onClick={() => handleSuggestion(s.prompt)}>
                {s.text}
              </Tag>
            ))}
          </div>
        </div>

        {/* Input */}
        <div style={{ padding: 12, borderTop: '1px solid #f0f0f0', background: 'white' }}>
          <TextArea
            ref={inputRef}
            rows={2}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Posez votre question..."
            onPressEnter={(e) => { e.preventDefault(); handleSendMessage(); }}
            style={{ borderRadius: 8, resize: 'none', fontSize: 12 }}
          />
          <Button type="primary" icon={<SendOutlined />} onClick={handleSendMessage} style={{ marginTop: 8, width: '100%', background: '#f5222d', borderColor: '#f5222d' }}>
            Envoyer
          </Button>
        </div>

        {/* Modal Analyse */}
        <Modal title="Analyse de risque" open={modalVisible} onCancel={() => setModalVisible(false)} footer={null}>
          <Form form={form} layout="vertical">
            <Form.Item label="Type">
              <Select>
                <Option value="transaction">Transaction</Option>
                <Option value="aml">AML</Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Button type="primary" block style={{ background: '#f5222d', borderColor: '#f5222d' }} onClick={() => { setModalVisible(false); message.success('Analyse lancée'); }}>
                Lancer
              </Button>
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </motion.div>
  );
};

export default NexyRiskAssistant;