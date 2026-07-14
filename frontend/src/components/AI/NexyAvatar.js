import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, MeshDistortMaterial } from '@react-three/drei';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { useVoiceAssistant } from '../../hooks/useVoiceAssistant';
import { 
  SendOutlined, 
  RobotOutlined, 
  ThunderboltOutlined, 
  LineChartOutlined,
  CustomerServiceOutlined,
  ClearOutlined,
  MessageOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import { Input, Button, Card, Avatar, Tag, Space, Typography, List, Divider, Progress, Empty, Badge } from 'antd';
import ReactECharts from 'echarts-for-react';

const { Title, Text, Paragraph } = Typography;
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// ─── 3D COMPONENTS (Nexy Visual Core) ──────────────────────────────────────────

function ParticleAura({ speaking }) {
  const points = useRef();
  useFrame(({ clock }) => {
    if (!points.current) return;
    const time = clock.getElapsedTime();
    points.current.rotation.y = time * 0.1;
    points.current.rotation.z = time * 0.05;
    
    const scale = speaking ? 1 + Math.sin(time * 10) * 0.1 : 1;
    points.current.scale.set(scale, scale, scale);
  });

  return (
    <points ref={points}>
      <sphereGeometry args={[1.8, 64, 64]} />
      <pointsMaterial 
        size={0.015} 
        color={speaking ? "#00d4ff" : "#3b82f6"} 
        transparent 
        opacity={0.4} 
        sizeAttenuation 
      />
    </points>
  );
}

function AnimatedMouth({ speaking }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const intensity = speaking ? Math.abs(Math.sin(clock.elapsedTime * 25)) : 0;
    ref.current.scale.y = 0.1 + intensity * 0.8;
    ref.current.scale.x = 1 + intensity * 0.2;
  });
  return (
    <mesh ref={ref} position={[0, -0.4, 0.82]}>
      <boxGeometry args={[0.45, 0.2, 0.05]} />
      <meshStandardMaterial color="#0a0a0a" emissive="#00d4ff" emissiveIntensity={speaking ? 0.5 : 0} />
    </mesh>
  );
}

function GlowingEye({ x, speaking }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = speaking ? 15 : 3;
    ref.current.material.emissiveIntensity = 2 + Math.sin(clock.elapsedTime * pulse) * 1;
  });
  return (
    <mesh ref={ref} position={[x, 0.3, 0.82]}>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshStandardMaterial color="#ffffff" emissive="#00d4ff" emissiveIntensity={2} />
    </mesh>
  );
}

function NexyHead({ speaking }) {
  return (
    <group>
      <ParticleAura speaking={speaking} />
      <mesh>
        <sphereGeometry args={[1, 64, 64]} />
        <MeshDistortMaterial
          color="#1e40af"
          speed={speaking ? 5 : 2}
          distort={speaking ? 0.4 : 0.2}
          roughness={0.05}
          metalness={0.8}
        />
      </mesh>
      
      <group rotation={[Math.PI / 2, 0, 0]}>
        <mesh>
          <torusGeometry args={[1.2, 0.01, 16, 100]} />
          <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={2} />
        </mesh>
        <mesh rotation={[0, Math.PI / 4, 0]}>
          <torusGeometry args={[1.4, 0.005, 16, 100]} />
          <meshStandardMaterial color="#3b82f6" emissive="#3b82f6" emissiveIntensity={1} transparent opacity={0.3} />
        </mesh>
      </group>

      <GlowingEye x={-0.35} speaking={speaking} />
      <GlowingEye x={0.35} speaking={speaking} />
      
      <mesh position={[0, -0.1, 0.9]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={2} />
      </mesh>
      
      <AnimatedMouth speaking={speaking} />
      
      <mesh position={[0, 1.2, 0]}>
        <cylinderGeometry args={[0.02, 0.04, 0.5, 8]} />
        <meshStandardMaterial color="#4b5563" metalness={1} roughness={0} />
      </mesh>
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshStandardMaterial color="#00d4ff" emissive="#00d4ff" emissiveIntensity={speaking ? 5 : 2} />
      </mesh>
    </group>
  );
}

// ─── UI COMPONENTS (HUD & Intelligence) ───────────────────────────────────────

const VisualInsight = ({ data }) => {
  if (!data) return null;

  const getOption = () => {
    const commonStyles = {
      backgroundColor: 'transparent',
      textStyle: { color: '#94a3b8' },
      tooltip: { 
        trigger: 'axis', 
        backgroundColor: 'rgba(15, 23, 42, 0.9)', 
        borderColor: '#3b82f6', 
        textStyle: { color: '#fff' },
        borderWidth: 1,
        borderRadius: 8
      }
    };

    switch (data.type) {
      case 'bar':
        return {
          ...commonStyles,
          xAxis: { type: 'category', data: data.labels, axisLabel: { color: '#94a3b8', fontSize: 10 } },
          yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
          series: [{ data: data.values, type: 'bar', itemStyle: { color: '#3b82f6', borderRadius: [4, 4, 0, 0] } }]
        };
      case 'line':
        return {
          ...commonStyles,
          xAxis: { type: 'category', data: data.labels, axisLabel: { color: '#94a3b8', fontSize: 10 } },
          yAxis: { type: 'value', axisLabel: { color: '#94a3b8' }, splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } } },
          series: [{ 
            data: data.values, 
            type: 'line', 
            smooth: true, 
            symbol: 'circle', 
            itemStyle: { color: '#475569' },
            areaStyle: { color: 'rgba(139, 92, 246, 0.1)' } 
          }]
        };
      case 'radar':
        return {
          ...commonStyles,
          tooltip: { trigger: 'item' },
          radar: {
            indicator: data.indicators,
            axisName: { color: '#94a3b8', fontSize: 10 },
            splitArea: { show: false },
            splitLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
          },
          series: [{
            type: 'radar',
            data: [{ value: data.values, name: 'Analyse' }],
            itemStyle: { color: '#3b82f6' },
            areaStyle: { color: 'rgba(59, 130, 246, 0.2)' }
          }]
        };
      default:
        return null;
    }
  };

  if (data.type === 'indicator') {
    return (
      <div className="indicator-card" style={{ 
        background: 'rgba(255,255,255,0.03)', 
        padding: 12, 
        borderRadius: 12, 
        border: '1px solid rgba(255,255,255,0.08)',
        marginBottom: 8
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text style={{ color: '#94a3b8', fontSize: 11 }}>{data.title}</Text>
          <Text style={{ color: '#3b82f6', fontSize: 11, fontWeight: 'bold' }}>{data.value}%</Text>
        </div>
        <Progress 
          percent={data.value} 
          size="small"
          showInfo={false}
          strokeColor={{ '0%': '#3b82f6', '100%': '#475569' }} 
          trailColor="rgba(255,255,255,0.05)" 
        />
      </div>
    );
  }

  const option = getOption();
  if (!option) return null;

  return (
    <Card 
      size="small" 
      style={{ 
        background: 'rgba(2, 6, 23, 0.6)', 
        border: '1px solid rgba(59, 130, 246, 0.3)', 
        borderRadius: 16, 
        marginTop: 12,
        overflow: 'hidden'
      }}
      bodyStyle={{ padding: '12px' }}
    >
      <Title level={5} style={{ color: '#fff', fontSize: 13, marginBottom: 12, borderLeft: '3px solid #3b82f6', paddingLeft: 8 }}>{data.title}</Title>
      <ReactECharts option={option} style={{ height: '180px' }} />
    </Card>
  );
};

// ─── MAIN AVATAR MODULE ───────────────────────────────────────────────────────

export default function NexyAvatar() {
  const [speaking, setSpeaking] = useState(false);
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    { 
      id: 1, 
      role: 'assistant', 
      content: 'Bienvenue dans l\'écosystème NEXUM. 🌐 Je suis Nexy, votre intelligence centrale. Je supervise vos données de ventes, de risques et de croissance. Que puis-je analyser pour vous aujourd\'hui ?',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);
  const audioRef = useRef(null);

  const { isListening, transcript, startListening, stopListening } = useVoiceAssistant();

  // Écoute continue pour le mot de réveil "Bonjour"
  useEffect(() => {
    if (transcript && transcript.toLowerCase().includes('bonjour')) {
      setMessages(prev => [...prev, { 
        id: Date.now(), 
        role: 'assistant', 
        content: 'Bonjour ! Je vous écoute. Comment puis-je vous aider ?',
        timestamp: new Date().toLocaleTimeString()
      }]);
      handleSpeak('Bonjour ! Je vous écoute. Comment puis-je vous aider ?');
    }
  }, [transcript]);

  useEffect(() => {
    startListening();
    return () => {
      stopListening();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [startListening, stopListening]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleQuery = async (text = query) => {
    if (!text.trim()) return;
    
    const userMessage = { id: Date.now(), role: 'user', content: text, timestamp: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, userMessage]);
    setQuery('');
    setIsLoading(true);

    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const companyId = user.company_id || 'default';

      const aiResponse = await api.post('/assistant/query', {
        assistant: 'copilot',
        query: text,
        user_data: {
          company_id: companyId,
          sector: user.sector || 'enterprise'
        }
      });

      const data = aiResponse.data;
      const assistantMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: data.response,
        visuals: data.visualizations || [],
        actions: data.actions || [],
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      setIsLoading(false);

      // ✅ Déclencher la synthèse vocale
      if (data.response) {
        handleSpeak(data.response);
      }

    } catch (error) {
      console.error('Erreur Nexy:', error);
      setIsLoading(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        content: "Désolé, je rencontre une difficulté technique pour analyser votre demande.",
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  };

  // ===================================================
  // ✅ TTS CORRIGÉ - VERSION AVEC BASE64
  // ===================================================
  const handleSpeak = async (text) => {
    // Arrêter l'audio en cours
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      audioRef.current.src = '';
    }
    
    setSpeaking(true);
    
    try {
      // ✅ Appel à l'API TTS
      const response = await api.get('/assistant/speak', {
        params: { text, lang: 'fr' }
      });
      
      // ✅ Vérifier si la réponse contient de l'audio en base64
      if (response.data && response.data.success && response.data.audio) {
        // Convertir le base64 en blob audio
        const audioData = response.data.audio;
        const byteCharacters = atob(audioData);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        
        // Créer l'élément audio s'il n'existe pas
        if (!audioRef.current) {
          audioRef.current = new Audio();
        }
        
        audioRef.current.src = url;
        
        // Jouer l'audio
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
            })
            .catch((error) => {
              console.error('❌ Échec lecture audio:', error);
              setSpeaking(false);
              // Fallback vers Web Speech API
              fallbackSpeak(text);
            });
        }

        audioRef.current.onended = () => {
          setSpeaking(false);
          URL.revokeObjectURL(url);
          startListening();
        };
        
        audioRef.current.onerror = () => {
          console.error('❌ Erreur audio');
          setSpeaking(false);
          startListening();
        };
      } else {
        // Fallback si pas d'audio dans la réponse
        console.warn('⚠️ Pas d\'audio dans la réponse, fallback Web Speech');
        fallbackSpeak(text);
      }
      
    } catch (e) {
      console.error('❌ Erreur TTS:', e);
      setSpeaking(false);
      // Fallback vers Web Speech API
      fallbackSpeak(text);
    }
  };

  // ===================================================
  // ✅ FALLBACK : Web Speech API (intégrée au navigateur)
  // ===================================================
  const fallbackSpeak = (text) => {
    if (!window.speechSynthesis) {
      console.warn('⚠️ Web Speech API non disponible');
      setSpeaking(false);
      startListening();
      return;
    }
    
    // Arrêter la synthèse en cours
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    
    setSpeaking(true);
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Choisir une voix française
    const voices = window.speechSynthesis.getVoices();
    const frenchVoice = voices.find(voice => voice.lang.startsWith('fr'));
    if (frenchVoice) {
      utterance.voice = frenchVoice;
    }
    
    utterance.onstart = () => {
    };
    
    utterance.onend = () => {
      setSpeaking(false);
      startListening();
    };
    
    utterance.onerror = (event) => {
      console.error('❌ Erreur synthèse vocale:', event);
      setSpeaking(false);
      startListening();
    };
    
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div style={styles.container}>
      <div style={styles.layout}>
        
        {/* LEFT PANEL: 3D AVATAR VIEWPORT */}
        <div style={styles.viewport}>
          <div style={styles.canvasHeader}>
            <div style={styles.statusBadge(speaking)}>
              <div style={styles.pulseDot(speaking)} />
              {speaking ? 'Nexy parle...' : 'Nexy · En ligne'}
            </div>
          </div>

          <Canvas camera={{ position: [0, 0, 4.5], fov: 40 }} style={{ height: '70%' }}>
            <ambientLight intensity={0.4} />
            <pointLight position={[5, 5, 5]} intensity={1.2} color="#ffffff" />
            <pointLight position={[-5, -5, 5]} intensity={0.6} color="#3b82f6" />
            <spotLight position={[0, 8, 3]} angle={0.3} penumbra={1} intensity={0.8} color="#00d4ff" />
            <Float speed={2.5} rotationIntensity={0.5} floatIntensity={0.8}>
              <NexyHead speaking={speaking} />
            </Float>
            <OrbitControls enableZoom={false} enablePan={false} />
          </Canvas>

          <div style={styles.viewportFooter}>
            <Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 700 }}>Nexy AI Agent 3D</Title>
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Architecture Neural Decision System v1.0</Text>
          </div>
        </div>

        {/* RIGHT PANEL: INTELLIGENT HUD (CHAT & INSIGHTS) */}
        <div style={styles.hud}>
          <div style={styles.hudHeader}>
            <Space>
              <Avatar icon={<RobotOutlined />} style={{ background: '#3b82f6', boxShadow: '0 0 15px rgba(59, 130, 246, 0.5)' }} />
              <div>
                <Title level={5} style={{ color: '#fff', margin: 0, fontSize: 15 }}>Intelligence Hub</Title>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Badge status={speaking ? 'processing' : 'success'} />
                  <Text style={{ color: '#94a3b8', fontSize: 11 }}>{speaking ? 'Nexy analyse...' : 'Prêt à vous aider'}</Text>
                </div>
              </div>
            </Space>
            
            {/* Audio Wave Visualizer */}
            <div style={styles.audioWave(speaking)}>
              {[...Array(8)].map((_, i) => (
                <div key={i} className={`wave-bar wave-bar-${i}`} />
              ))}
            </div>

            <Button 
              type="text" 
              shape="circle"
              icon={<ClearOutlined style={{ color: '#64748b' }} />} 
              onClick={() => setMessages([messages[0]])}
            />
          </div>

          <div style={styles.messageArea}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, x: msg.role === 'user' ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                style={styles.messageRow(msg.role)}
              >
                <div style={styles.messageBubble(msg.role)}>
                  <Paragraph style={{ color: '#fff', margin: 0, fontSize: 14, lineHeight: '1.6' }}>
                    {msg.content}
                  </Paragraph>
                  
                  {msg.visuals && msg.visuals.map((vis, i) => (
                    <VisualInsight key={i} data={vis} />
                  ))}

                  {msg.actions && msg.actions.length > 0 && (
                    <Space wrap style={{ marginTop: 12 }}>
                      {msg.actions.map((action, i) => (
                        <Button key={i} size="small" type="primary" ghost style={{ borderRadius: 20, fontSize: 11 }}>
                          {action.label}
                        </Button>
                      ))}
                    </Space>
                  )}
                  
                  <div style={styles.messageTime}>{msg.timestamp}</div>
                </div>
              </motion.div>
            ))}
            {isLoading && (
              <div style={styles.messageRow('assistant')}>
                <div style={styles.messageBubble('assistant')}>
                  <div className="typing-dots">
                    <span>.</span><span>.</span><span>.</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div style={styles.inputArea}>
            <div style={styles.inputContainer}>
              <Input
                placeholder="Posez une question sur vos données..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onPressEnter={() => handleQuery()}
                variant="borderless"
                style={styles.inputField}
              />
              <Button 
                type="primary" 
                icon={<SendOutlined />} 
                onClick={() => handleQuery()}
                loading={isLoading}
                style={styles.sendButton}
              />
            </div>
            <div style={styles.suggestions}>
              <Text style={{ color: '#64748b', fontSize: 11, marginRight: 8 }}>Suggestions:</Text>
              <Space wrap>
                {['Prévisions ventes', 'Analyse risques', 'Statut stock'].map(s => (
                  <Tag 
                    key={s} 
                    style={styles.suggestionTag}
                    onClick={() => handleQuery(s)}
                  >
                    {s}
                  </Tag>
                ))}
              </Space>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .wave-bar {
          width: 3px;
          height: 10px;
          background: #3b82f6;
          border-radius: 2px;
        }
        .wave-bar-0 { animation: wave 1s infinite 0.1s; }
        .wave-bar-1 { animation: wave 1.2s infinite 0.3s; }
        .wave-bar-2 { animation: wave 0.8s infinite 0.5s; }
        .wave-bar-3 { animation: wave 1.1s infinite 0.2s; }
        .wave-bar-4 { animation: wave 0.9s infinite 0.4s; }
        .wave-bar-5 { animation: wave 1.3s infinite 0.1s; }
        .wave-bar-6 { animation: wave 0.7s infinite 0.3s; }
        .wave-bar-7 { animation: wave 1.0s infinite 0.5s; }

        @keyframes wave {
          0%, 100% { height: 5px; }
          50% { height: 18px; }
        }

        .typing-dots span {
          animation: blink 1s infinite;
          font-size: 20px;
          margin: 0 2px;
          color: #3b82f6;
        }
        .typing-dots span:nth-child(2) { animation-delay: 0.2s; }
        .typing-dots span:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink { 0% { opacity: 0; } 50% { opacity: 1; } 100% { opacity: 0; } }
      `}</style>
    </div>
  );
}

// ─── STYLES (PREMIUM DARK HUD) ────────────────────────────────────────────────

const styles = {
  container: {
    padding: '20px',
    height: 'calc(100vh - 120px)',
    minHeight: '700px',
  },
  layout: {
    display: 'flex',
    height: '100%',
    background: '#020617',
    borderRadius: '32px',
    overflow: 'hidden',
    boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
    border: '1px solid rgba(255,255,255,0.05)',
  },
  viewport: {
    flex: 1,
    position: 'relative',
    background: 'radial-gradient(circle at center, #1e293b 0%, #020617 100%)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  },
  canvasHeader: {
    position: 'absolute',
    top: 30,
    left: 30,
    zIndex: 10,
  },
  statusBadge: (speaking) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    background: 'rgba(0,0,0,0.4)',
    backdropFilter: 'blur(10px)',
    padding: '8px 16px',
    borderRadius: '20px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: 600,
    border: `1px solid ${speaking ? '#10b981' : 'rgba(255,255,255,0.1)'}`,
  }),
  pulseDot: (speaking) => ({
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: speaking ? '#10b981' : '#3b82f6',
    boxShadow: speaking ? '0 0 10px #10b981' : 'none',
  }),
  viewportFooter: {
    padding: '0 40px 40px',
    textAlign: 'center',
  },
  hud: {
    width: '450px',
    background: 'rgba(15, 23, 42, 0.8)',
    backdropFilter: 'blur(30px)',
    borderLeft: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    flexDirection: 'column',
  },
  hudHeader: {
    padding: '24px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  audioWave: (speaking) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    height: '20px',
    opacity: speaking ? 1 : 0,
    transition: 'opacity 0.3s ease',
  }),
  messageArea: {
    flex: 1,
    overflowY: 'auto',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  messageRow: (role) => ({
    display: 'flex',
    justifyContent: role === 'user' ? 'flex-end' : 'flex-start',
  }),
  messageBubble: (role) => ({
    maxWidth: '85%',
    padding: '16px',
    borderRadius: role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
    background: role === 'user' ? '#3b82f6' : 'rgba(255,255,255,0.05)',
    border: role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.1)',
    position: 'relative',
  }),
  messageTime: {
    fontSize: '10px',
    color: 'rgba(255,255,255,0.3)',
    marginTop: '8px',
    textAlign: 'right',
  },
  inputArea: {
    padding: '24px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  inputContainer: {
    display: 'flex',
    background: 'rgba(255,255,255,0.05)',
    padding: '6px',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  inputField: {
    flex: 1,
    color: '#fff',
    padding: '8px 12px',
  },
  sendButton: {
    borderRadius: '12px',
    width: '40px',
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestions: {
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
  },
  suggestionTag: {
    background: 'rgba(59, 130, 246, 0.1)',
    color: '#3b82f6',
    border: '1px solid rgba(59, 130, 246, 0.2)',
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '11px',
    '&:hover': {
      background: 'rgba(59, 130, 246, 0.2)',
    }
  }
};