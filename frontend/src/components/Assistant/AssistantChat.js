import React, { useState, useRef, useEffect } from 'react';
import { Card, Input, Button, Avatar, Space, Tag, Tooltip, Modal, Rate } from 'antd';
import { SendOutlined, RobotOutlined, UserOutlined, CloseOutlined, DislikeOutlined } from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';

const AssistantChat = ({ assistantType, assistantColor, assistantName }) => {
  const [messages, setMessages] = useState([
    { id: 1, type: 'bot', text: `Bonjour ! Je suis ${assistantName}. Comment puis-je vous aider ?` }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackAnswer, setFeedbackAnswer] = useState('');
  const [feedbackScore, setFeedbackScore] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const openFeedback = (question) => {
    setCurrentQuestion(question);
    setFeedbackAnswer('');
    setFeedbackScore(0);
    setShowFeedback(true);
  };

  const submitFeedback = async () => {
    try {
      const payload = {
        assistant: 'omnichannel',
        question: currentQuestion,
        correct_answer: feedbackAnswer,
        feedback_score: feedbackScore,
      };
      await fetch('/analytics/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error('Feedback submission failed', e);
    } finally {
      setShowFeedback(false);
      setFeedbackAnswer('');
      setFeedbackScore(0);
    }
  };

  const handleSend = () => {
  if (!newMessage.trim()) return;
  const userMsg = { id: messages.length + 1, type: 'user', text: newMessage };
  setMessages([...messages, userMsg]);
  setCurrentQuestion(newMessage);
  setIsTyping(true);
  setNewMessage('');
  setTimeout(() => {
    const botMsg = { id: messages.length + 2, type: 'bot', text: getBotResponse(assistantType, newMessage) };
    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
  }, 1500);
};

  const getBotResponse = (type, msg) => {
    const lowerMsg = msg.toLowerCase();
    
    if (type === 'predict') {
      if (lowerMsg.includes('crédit')) return "D'après mon analyse, votre dossier présente un score de 87/100. C'est très bon !";
      if (lowerMsg.includes('fraude')) return "Je détecte 3 transactions suspectes. Voulez-vous les voir ?";
      return "Je peux vous aider avec le scoring crédit, la détection de fraude ou les prévisions financières.";
    }
    
    if (type === 'risk') {
      if (lowerMsg.includes('sinistre')) return "J'ai analysé votre sinistre. Le montant estimé est de 12 500€ avec un risque de fraude de 2.3%.";
      return "Je peux vous aider avec les sinistres, l'évaluation des risques ou la modélisation catastrophe.";
    }
    
    if (type === 'growth') {
      if (lowerMsg.includes('vente')) return "Vos ventes sont en hausse de 12% ce mois-ci. Je détecte 15 opportunités de cross-selling.";
      return "Je peux vous aider avec l'analyse des ventes, la prédiction d'attrition ou l'optimisation du pipeline.";
    }
    
    return "Merci pour votre question ! Je vais analyser cela.";
  };

  return (
    <Card className="assistant-chat-card" style={{ borderTop: `3px solid ${assistantColor}` }}>
      <div className="chat-header">
        <Space>
          <Avatar icon={<RobotOutlined />} style={{ backgroundColor: assistantColor }} />
          <div>
            <strong>{assistantName}</strong>
            <div><Tag color={assistantColor}>En ligne</Tag></div>
          </div>
        </Space>
      </div>

      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id} className={`message ${msg.type === 'user' ? 'user' : 'bot'}`}>
            {msg.type === 'bot' && <Avatar icon={<RobotOutlined />} size="small" style={{ backgroundColor: assistantColor }} />}
            <div className="message-bubble" style={{ backgroundColor: msg.type === 'user' ? assistantColor : '#f0f0f0', color: msg.type === 'user' ? '#fff' : '#000' }}>
              {msg.text}
            </div>
            <>
                {msg.type === 'bot' && (
                  <Button
                    size="small"
                    type="text"
                    onClick={() => {
                      Modal.confirm({
                        title: 'Confirmez que la réponse n\'est pas utile',
                        icon: <DislikeOutlined style={{ color: '#ff4d4f' }} />, 
                        onOk: () => openFeedback(msg.text),
                        okText: 'Oui',
                        cancelText: 'Non',
                      });
                    }}
                    style={{ marginLeft: 8, color: '#ff4d4f' }}
                  >
                    Pas inutile
                  </Button>
                )}
              {msg.type === 'user' && <Avatar icon={<UserOutlined />} size="small" style={{ backgroundColor: '#C850C0' }} />}
            </>
          </div>
        ))}
        {isTyping && (
          <div className="typing">
            <Avatar icon={<RobotOutlined />} size="small" style={{ backgroundColor: assistantColor }} />
            <div className="typing-dots">
              <span>.</span><span>.</span><span>.</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <Input 
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          onPressEnter={handleSend}
          placeholder="Posez votre question..."
        />
        <Button type="primary" icon={<SendOutlined />} onClick={handleSend} style={{ backgroundColor: assistantColor }} />
      </div>
            <Modal
          title="Feedback"
          open={showFeedback}
          onCancel={() => setShowFeedback(false)}
          onOk={submitFeedback}
          okText="Envoyer"
        >
          <p>Quelle aurait été la bonne réponse ?</p>
          <Input.TextArea
            value={feedbackAnswer}
            onChange={e => setFeedbackAnswer(e.target.value)}
            rows={4}
          />
          <div style={{ marginTop: 8 }}>
            <span>Score (0-5): </span>
            <Rate count={5} value={feedbackScore} onChange={setFeedbackScore} />
          </div>
        </Modal>
      </Card>
  );
};

export default AssistantChat;