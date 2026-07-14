import React, { useState } from 'react';
import { Card, Input, Button, Space, Typography, Alert, Spin, Divider, Tag } from 'antd';
import { RobotOutlined, SendOutlined, BulbOutlined, ThunderboltOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import api from '../../../services/api';

const { TextArea } = Input;
const { Title, Text } = Typography;

const AIAssistant = () => {
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversation, setConversation] = useState([]);

  const handleSend = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setConversation(prev => [...prev, { role: 'user', content: query }]);
    
    try {
      const res = await api.post('/assistants/chat', { query, agent_name: 'copilot' });
      const botResponse = res.data.response || res.data.message || 'Je n\'ai pas compris votre demande';
      
      setConversation(prev => [...prev, { role: 'assistant', content: botResponse }]);
      setResponse(botResponse);
    } catch (error) {
      setConversation(prev => [...prev, { role: 'assistant', content: 'Erreur de connexion au service IA' }]);
    } finally {
      setLoading(false);
      setQuery('');
    }
  };

  return (
    <Card title={<Space><RobotOutlined /> Assistant IA Administrateur</Space>}>
      <Alert
        message="Assistant IA pour l'administration"
        description="Posez vos questions sur la gestion du système, les utilisateurs, les paiements, ou demandez des analyses."
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
      />
      
      <div style={{ height: 400, overflowY: 'auto', marginBottom: 16, padding: 16, background: '#f5f5f5', borderRadius: 8 }}>
        {conversation.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#999', padding: 40 }}>
            <RobotOutlined style={{ fontSize: 48, marginBottom: 16 }} />
            <div>Posez votre première question administrative</div>
            <Divider />
            <Space wrap>
              <Tag icon={<BulbOutlined />}>Quel est le chiffre d'affaires total ?</Tag>
              <Tag icon={<ThunderboltOutlined />}>Combien d'utilisateurs sont actifs ?</Tag>
              <Tag icon={<SafetyCertificateOutlined />}>Y a-t-il des alertes de sécurité ?</Tag>
            </Space>
          </div>
        ) : (
          conversation.map((msg, idx) => (
            <div key={idx} style={{ textAlign: msg.role === 'user' ? 'right' : 'left', marginBottom: 12 }}>
              <div style={{ display: 'inline-block', maxWidth: '80%', background: msg.role === 'user' ? '#1890ff' : '#f0f0f0', padding: '8px 12px', borderRadius: 12, color: msg.role === 'user' ? 'white' : 'black' }}>
                <Text strong>{msg.role === 'user' ? 'Vous' : 'Assistant IA'}:</Text>
                <div style={{ marginTop: 4 }}>{msg.content}</div>
              </div>
            </div>
          ))
        )}
        {loading && <div style={{ textAlign: 'center' }}><Spin /> L'assistant réfléchit...</div>}
      </div>
      
      <Space.Compact style={{ width: '100%' }}>
        <TextArea
          rows={2}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onPressEnter={handleSend}
          placeholder="Posez votre question administrative..."
          disabled={loading}
        />
        <Button type="primary" icon={<SendOutlined />} onClick={handleSend} loading={loading} style={{ height: 'auto' }} />
      </Space.Compact>
    </Card>
  );
};

export default AIAssistant;