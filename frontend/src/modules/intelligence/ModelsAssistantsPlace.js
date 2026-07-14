import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Stars, Float } from '@react-three/drei';
import { 
  Input, Button, Typography, Space, Switch, Modal, Tag, 
  Timeline, Badge, Tooltip, Empty, message
} from 'antd';
import { 
  SendOutlined, RobotOutlined, TeamOutlined, 
  HistoryOutlined, ThunderboltOutlined, 
  MessageOutlined, DeleteOutlined,
  ClockCircleOutlined, CloseOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

// ========== CONFIGURATION DES 7 ASSISTANTS ==========
const ASSISTANTS = [
  { id: 'copilot', name: 'Copilot', color: '#eb2f96', role: 'Directeur', position: [0, 0, -3.5] },
  { id: 'risk', name: 'Sophie', color: '#ef4444', role: 'Risk Expert', position: [-2, 0, -2] },
  { id: 'growth', name: 'Elena', color: '#10b981', role: 'Growth Expert', position: [2, 0, -2] },
  { id: 'predict', name: 'James', color: '#3b82f6', role: 'Data Expert', position: [-1, 0, 3] },
  { id: 'compliance', name: 'Compliance', color: '#8b5cf6', role: 'Conformité', position: [1, 0, 3] },
  { id: 'operations', name: 'Operations', color: '#f59e0b', role: 'Supply Chain', position: [3, 0, 1] },
  { id: 'analytics', name: 'Analytics', color: '#ec4899', role: 'Data Viz', position: [-3, 0, 1] },
];

const API_BASE = 'http://localhost:8000/api/v1';

// ========== COMPOSANT 3D ==========
const HologramCore = ({ color, isTalking }) => {
  const crystalRef = useRef();
  
  useFrame((state) => {
    if (crystalRef.current) {
      crystalRef.current.rotation.y += 0.02;
      crystalRef.current.rotation.x += 0.01;
      if (isTalking) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 15) * 0.1;
        crystalRef.current.scale.set(scale, scale, scale);
      }
    }
  });

  return (
    <group>
      <mesh ref={crystalRef} castShadow position={[0, 0.5, 0]}>
        <octahedronGeometry args={[0.3, 0]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={isTalking ? 3 : 1.5} wireframe />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.55, 32, 32]} />
        <meshPhysicalMaterial 
          color="#ffffff" transmission={0.9} transparent={true}
          opacity={1} metalness={0.1} roughness={0.1} ior={1.5} thickness={0.5} 
        />
      </mesh>
      <mesh position={[0, -0.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.6, 0.015, 16, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.6} />
      </mesh>
    </group>
  );
};

const AssistantAvatar3D = ({ assistant, isTalking, message }) => {
  const meshRef = useRef();
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.y = assistant.position[1] + Math.sin(state.clock.elapsedTime * 2 + assistant.position[0]) * 0.1;
      if (isTalking) {
        meshRef.current.rotation.y += 0.05;
      }
    }
  });

  return (
    <group position={assistant.position}>
      <Float speed={2} rotationIntensity={0.5} floatIntensity={1}>
        <group ref={meshRef}>
          <HologramCore color={assistant.color} isTalking={isTalking} />
          
          <Html position={[0, -1, 0]} center>
            <div style={{ 
              background: 'rgba(0,0,0,0.7)', color: 'white', padding: '2px 12px', 
              borderRadius: '20px', fontSize: '11px', whiteSpace: 'nowrap',
              border: `1px solid ${assistant.color}`
            }}>
              {assistant.name}
              <span style={{ fontSize: '9px', marginLeft: '6px', opacity: 0.7 }}>({assistant.role})</span>
            </div>
          </Html>

          {message && (
            <Html position={[0, 1.5, 0]} center>
              <div style={{
                background: assistant.color, color: 'white', padding: '6px 12px',
                borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                maxWidth: '200px', textAlign: 'center', fontSize: '11px',
                animation: 'fadeInUp 0.3s ease'
              }}>
                {message}
                <div style={{
                  position: 'absolute', bottom: '-5px', left: '50%', transform: 'translateX(-50%)',
                  width: 0, height: 0, borderLeft: '6px solid transparent',
                  borderRight: '6px solid transparent', borderTop: `6px solid ${assistant.color}`
                }} />
              </div>
            </Html>
          )}
        </group>
      </Float>
    </group>
  );
};

// ========== COMPOSANT PRINCIPAL ==========
const ModelsAssistantsPlace = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [activeSpeech, setActiveSpeech] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutonomousMode, setIsAutonomousMode] = useState(false);
  const [isTeamMeeting, setIsTeamMeeting] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState(null);
  const [isMeetingCancelled, setIsMeetingCancelled] = useState(false);
  const meetingIntervalRef = useRef(null);
  const chatEndRef = useRef(null);
  const messageIdCounter = useRef(0);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    loadConversationHistory();
    return () => {
      if (meetingIntervalRef.current) clearInterval(meetingIntervalRef.current);
    };
  }, []);

  // --- API calls ---
  const loadConversationHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/assistants/conversations?limit=50`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) setConversationHistory(data.data);
      }
    } catch (e) {
      console.error('Erreur historique:', e);
    }
  };

  const sendChat = async (query) => {
    try {
      const res = await fetch(`${API_BASE}/assistants/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agent_name: 'copilot', query, user_id: 1 })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      console.error('Erreur chat:', e);
      return null;
    }
  };

  const sendTeamChat = async (message) => {
    try {
      const res = await fetch(`${API_BASE}/assistants/team-chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speaker: 'user', message })
      });
      return res.ok;
    } catch (e) {
      console.error('Erreur team-chat:', e);
      return false;
    }
  };

  const sendTalk = async (source, target, msg) => {
    try {
      const res = await fetch(`${API_BASE}/assistants/talk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source, target, message: msg })
      });
      return res.ok;
    } catch (e) {
      console.error('Erreur talk:', e);
      return false;
    }
  };

  // --- UI helpers ---
  const addBotMessage = (assistant, text) => {
    const id = ++messageIdCounter.current;
    setActiveSpeech(prev => ({ ...prev, [assistant.id]: text }));
    setMessages(prev => [...prev, {
      id,
      sender: assistant.name,
      text,
      color: assistant.color,
      timestamp: new Date().toLocaleTimeString()
    }]);
    setTimeout(() => {
      setActiveSpeech(prev => {
        const next = { ...prev };
        if (next[assistant.id] === text) delete next[assistant.id];
        return next;
      });
    }, 4000);
  };

  const addSystemMessage = (text) => {
    const id = ++messageIdCounter.current;
    setMessages(prev => [...prev, {
      id,
      sender: 'Système',
      text,
      isSystem: true,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const addUserMessage = (text) => {
    const id = ++messageIdCounter.current;
    setMessages(prev => [...prev, {
      id,
      sender: 'Vous',
      text,
      isUser: true,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const clearHistory = () => {
    setMessages([]);
    addSystemMessage('🧹 Historique des messages effacé');
  };

  // --- Processus principal ---
  const processUserQuery = async (query) => {
    addUserMessage(query);
    setIsProcessing(true);

    try {
      const result = await sendChat(query);
      if (result) {
        const copilot = ASSISTANTS.find(a => a.id === 'copilot');
        addBotMessage(copilot, result.response || 'Je n\'ai pas de réponse.');
        if (result.actions && result.actions.length) {
          addSystemMessage(`📌 Actions suggérées: ${result.actions.map(a => a.label).join(', ')}`);
        }
        await loadConversationHistory();
      } else {
        addSystemMessage('❌ Erreur de communication avec le serveur.');
      }
    } catch (error) {
      addSystemMessage(`❌ Erreur: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Auto-apprentissage ---
  useEffect(() => {
    let interval;
    if (isAutonomousMode) {
      addSystemMessage('🧠 Mode apprentissage autonome activé - Les assistants échangent entre eux');
      triggerAutonomousExchange();
      interval = setInterval(triggerAutonomousExchange, 10000);
    }
    return () => clearInterval(interval);
  }, [isAutonomousMode]);

  const triggerAutonomousExchange = async () => {
    const agentIds = ['risk', 'growth', 'predict', 'compliance', 'operations', 'analytics'];
    const source = agentIds[Math.floor(Math.random() * agentIds.length)];
    const targets = agentIds.filter(a => a !== source);
    const target = targets[Math.floor(Math.random() * targets.length)];
    
    const messagesList = [
      "Partage d'information sur les risques détectés",
      "Analyse des tendances de croissance",
      "Prédiction des comportements clients",
      "Évaluation des opportunités de marché",
      "Mise à jour des modèles prédictifs",
      "Synthèse des données du trimestre"
    ];
    const msg = messagesList[Math.floor(Math.random() * messagesList.length)];
    
    const ok = await sendTalk(source, target, msg);
    if (ok) {
      const src = ASSISTANTS.find(a => a.id === source);
      const tgt = ASSISTANTS.find(a => a.id === target);
      if (src && tgt) {
        addBotMessage(src, `→ ${tgt.name}: ${msg}`);
        await loadConversationHistory();
      }
    }
  };

  // --- Réunion d'équipe ---
  const startTeamMeeting = async () => {
    setIsMeetingCancelled(false);
    setIsTeamMeeting(true);
    addSystemMessage('🎤 DÉBUT DE LA RÉUNION D\'ÉQUIPE - Tous les assistants sont réunis');
    
    const topics = [
      "Analyse des risques actuels",
      "Stratégie de croissance Q3",
      "Prédictions financières",
      "Opportunités de marché",
      "Performance des modèles IA"
    ];
    
    for (let i = 0; i < topics.length; i++) {
      if (isMeetingCancelled) break;
      const topic = topics[i];
      setCurrentSpeaker(`Discussion sur: ${topic}`);
      addSystemMessage(`📢 Sujet ${i+1}: ${topic}`);
      
      await sendTeamChat(topic);
      
      for (const assistant of ASSISTANTS) {
        if (isMeetingCancelled) break;
        if (assistant.id === 'copilot') continue;
        await new Promise(resolve => setTimeout(resolve, 1200));
        const opinions = {
          risk: `🔴 Analyse: ${topic} - Niveau de risque modéré à élevé`,
          growth: `🟢 Croissance: ${topic} - Opportunité de +15%`,
          predict: `🔵 Données: ${topic} - Confiance à 87%`,
          compliance: `🟣 Conformité: ${topic} - Vérification réglementaire recommandée`,
          operations: `🟠 Supply: ${topic} - Optimisation possible`,
          analytics: `📊 Données: ${topic} - Tendances observées`
        };
        if (opinions[assistant.id]) {
          addBotMessage(assistant, opinions[assistant.id]);
        }
      }
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    if (!isMeetingCancelled) {
      addSystemMessage('✅ FIN DE LA RÉUNION - Synthèse collaborative complétée');
    }
    setIsTeamMeeting(false);
    setCurrentSpeaker(null);
  };

  const cancelTeamMeeting = () => {
    setIsMeetingCancelled(true);
    addSystemMessage('⏹️ RÉUNION ANNULÉE');
    setIsTeamMeeting(false);
    setCurrentSpeaker(null);
  };

  // --- Submit ---
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;
    const query = inputValue.trim();
    setInputValue('');
    await processUserQuery(query);
  };

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', background: '#000' }}>
      
      {/* Header */}
      <div style={{ padding: '12px 24px', background: 'rgba(15, 23, 42, 0.9)', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 10, flexWrap: 'wrap', gap: 10 }}>
        <Space>
          <RobotOutlined style={{ fontSize: 24, color: '#1890ff' }} />
          <Title level={4} style={{ color: 'white', margin: 0 }}>Place des Assistants 3D</Title>
          <Badge count={ASSISTANTS.length} style={{ backgroundColor: '#1890ff' }} />
        </Space>
        
        <Space wrap>
          <Tooltip title="Historique des conversations">
            <Button icon={<HistoryOutlined />} onClick={() => setHistoryModalVisible(true)}>
              Historique ({conversationHistory.length})
            </Button>
          </Tooltip>
          <Tooltip title="Nettoyer l'historique">
            <Button icon={<DeleteOutlined />} onClick={clearHistory} danger>
              Effacer
            </Button>
          </Tooltip>
          <Button 
            type="primary" 
            icon={<TeamOutlined />} 
            onClick={startTeamMeeting}
            loading={isTeamMeeting}
            disabled={isTeamMeeting}
            style={{ background: '#722ed1' }}
          >
            Réunion d'équipe
          </Button>
          {isTeamMeeting && (
            <Button 
              danger 
              icon={<CloseOutlined />} 
              onClick={cancelTeamMeeting}
              size="small"
            >
              Annuler
            </Button>
          )}
          <Space size="small">
            <Text style={{ color: isAutonomousMode ? '#52c41a' : 'rgba(255,255,255,0.6)', fontSize: '11px' }}>
              {isAutonomousMode ? 'Auto-apprentissage Actif' : 'Auto-apprentissage Inactif'}
            </Text>
            <Switch checked={isAutonomousMode} onChange={setIsAutonomousMode} />
          </Space>
        </Space>
      </div>

      {/* 3D Canvas */}
      <div style={{ flex: 1, position: 'relative', minHeight: '400px' }}>
        <Canvas camera={{ position: [0, 5, 10], fov: 50 }}>
          <color attach="background" args={['#050505']} />
          <fog attach="fog" args={['#050505', 8, 20]} />
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <pointLight position={[-10, 10, -10]} intensity={0.5} color="#1890ff" />
          
          <Stars radius={50} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />
          
          <gridHelper args={[20, 20, '#1890ff', '#111']} position={[0, -1.5, 0]} />

          {ASSISTANTS.map(assistant => (
            <AssistantAvatar3D 
              key={assistant.id} 
              assistant={assistant} 
              isTalking={!!activeSpeech[assistant.id]}
              message={activeSpeech[assistant.id]}
            />
          ))}

          <OrbitControls 
            enablePan={false} 
            minPolarAngle={Math.PI / 4} 
            maxPolarAngle={Math.PI / 2 - 0.1} 
            minDistance={5} 
            maxDistance={15} 
          />
        </Canvas>
        
        {/* Meeting indicator */}
        {isTeamMeeting && (
          <div style={{
            position: 'absolute', top: 20, left: '50%', transform: 'translateX(-50%)',
            background: '#722ed1', color: 'white', padding: '8px 20px',
            borderRadius: '30px', fontSize: '14px', fontWeight: 'bold',
            boxShadow: '0 4px 12px rgba(114,46,209,0.5)',
            whiteSpace: 'nowrap',
            zIndex: 100
          }}>
            <TeamOutlined style={{ marginRight: 8 }} />
            RÉUNION D'ÉQUIPE EN COURS {currentSpeaker && `- ${currentSpeaker}`}
          </div>
        )}
      </div>

      {/* Chat Panel */}
      <div style={{ width: '100%', height: '300px', background: '#0f172a', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '8px 16px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Space>
            <MessageOutlined style={{ color: '#1890ff' }} />
            <Text strong style={{ color: 'white' }}>Terminal de Communication</Text>
            {isTeamMeeting && <Tag color="purple" icon={<TeamOutlined />}>Réunion en cours</Tag>}
            {isAutonomousMode && <Tag color="green" icon={<ThunderboltOutlined />}>Auto-apprentissage</Tag>}
          </Space>
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>
            {messages.length} messages
          </Text>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', marginTop: '20px' }}>
              <RobotOutlined style={{ fontSize: '32px', marginBottom: '12px' }} />
              <br />
              Les 7 assistants sont prêts à collaborer.
              <br />
              <span style={{ fontSize: '12px' }}>Posez une question, activez l'auto-apprentissage ou lancez une réunion d'équipe !</span>
            </div>
          )}
          
          {messages.map((msg) => (
            <div key={msg.id} style={{ 
              alignSelf: msg.isUser ? 'flex-end' : 'flex-start',
              maxWidth: '75%',
              background: msg.isSystem ? 'transparent' : (msg.isUser ? '#1890ff' : `rgba(0,0,0,0.6)`),
              padding: msg.isSystem ? '4px 0' : '8px 12px',
              borderRadius: '12px',
              borderLeft: !msg.isUser && !msg.isSystem ? `3px solid ${msg.color}` : 'none',
              color: msg.isSystem ? 'rgba(255,255,255,0.5)' : 'white',
              fontStyle: msg.isSystem ? 'italic' : 'normal',
              textAlign: msg.isSystem ? 'center' : 'left',
              width: msg.isSystem ? '100%' : 'auto'
            }}>
              {!msg.isUser && !msg.isSystem && (
                <div style={{ fontSize: '10px', color: msg.color, marginBottom: '4px', fontWeight: 'bold' }}>
                  {msg.sender}
                </div>
              )}
              <div style={{ fontSize: '12px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</div>
              {msg.timestamp && !msg.isSystem && (
                <div style={{ fontSize: '9px', opacity: 0.5, marginTop: '4px' }}>
                  <ClockCircleOutlined style={{ marginRight: '4px' }} />
                  {msg.timestamp}
                </div>
              )}
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        <div style={{ padding: '12px 16px', background: 'rgba(0,0,0,0.3)', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Space.Compact style={{ width: '100%' }}>
            <Input 
              placeholder={isAutonomousMode ? "Mode auto-apprentissage actif - Les assistants échangent entre eux" : "Posez votre question aux 7 assistants..."}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onPressEnter={handleSendMessage}
              disabled={isProcessing || isAutonomousMode || isTeamMeeting}
              style={{ background: 'rgba(255,255,255,0.05)', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}
            />
            <Button type="primary" icon={<SendOutlined />} onClick={handleSendMessage} disabled={isProcessing || isAutonomousMode || isTeamMeeting} loading={isProcessing} />
          </Space.Compact>
        </div>
      </div>

      {/* History Modal */}
      <Modal
        title={<Space><HistoryOutlined /> Historique des conversations</Space>}
        open={historyModalVisible}
        onCancel={() => setHistoryModalVisible(false)}
        width={700}
        footer={null}
      >
        <div style={{ maxHeight: 400, overflowY: 'auto' }}>
          <Timeline>
            {conversationHistory.slice(0, 30).map((conv, idx) => (
              <Timeline.Item key={idx} color="blue">
                <strong>{conv.from || conv.source || 'Assistant'}</strong> → <strong>{conv.to || conv.target || 'Assistant'}</strong>
                <div style={{ marginTop: 4 }}>{conv.message}</div>
                <Text type="secondary" style={{ fontSize: 11 }}>{conv.timestamp}</Text>
              </Timeline.Item>
            ))}
            {conversationHistory.length === 0 && (
              <Empty description="Aucune conversation enregistrée" />
            )}
          </Timeline>
        </div>
      </Modal>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .ant-timeline-item-content {
          color: #fff !important;
        }
      `}</style>
    </div>
  );
};

export default ModelsAssistantsPlace;