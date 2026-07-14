// src/modules/customer/OmnichannelPortal.js
import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, Tabs, Timeline, List, Avatar, 
  Tag, Button, Space, Row, Col, Typography, 
  Spin, message, Tooltip, Alert, Statistic, 
  Progress, Modal, Drawer, Table, Empty, Descriptions,
  Form, Input, Select, Radio, Badge, Divider, InputNumber,
  theme, Skeleton
} from 'antd';
import { 
  MessageOutlined, GlobalOutlined, DatabaseOutlined, CustomerServiceOutlined,
  LineChartOutlined, UserOutlined, BulbOutlined,
  ThunderboltOutlined, HeartOutlined, CodeOutlined,
  HistoryOutlined, ReloadOutlined, BellOutlined,
  SendOutlined, QuestionCircleOutlined, FileTextOutlined,
  RiseOutlined, FallOutlined, DashboardOutlined,
  TrophyOutlined, ClockCircleOutlined, StarOutlined,
  WalletOutlined, CreditCardOutlined, PhoneOutlined,
  BankOutlined, ShopOutlined, SafetyCertificateOutlined,
  TeamOutlined, CarOutlined, HomeOutlined, MedicineBoxOutlined,
  ShoppingCartOutlined, PlusOutlined, CheckCircleOutlined,
  AlertOutlined, RocketOutlined, GiftOutlined, ExperimentOutlined,
  PieChartOutlined, SmileOutlined, FrownOutlined, MehOutlined,
  ArrowUpOutlined, ArrowDownOutlined, EyeOutlined
} from '@ant-design/icons';
import { Radar, Column, Line } from '@ant-design/charts';
import api from '../../services/api';
import { motion } from 'framer-motion';

const { Text, Title } = Typography;
const { Option } = Select;
const { useToken } = theme;

// ==================== COMPOSANTS STYLISÉS ====================

const GradientCard = ({ children, title, icon, extra, color, loading = false }) => {
  const { token } = useToken();
  const gradientColor = color || token.colorPrimary;
  
  if (loading) {
    return (
      <Card style={{ borderRadius: 20, background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <Skeleton active paragraph={{ rows: 3 }} />
      </Card>
    );
  }
  
  return (
    <Card
      style={{
        borderRadius: 20,
        background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
        overflow: 'hidden'
      }}
      styles={{ body: { padding: 24 } }}
      title={
        <Space>
          <div style={{ 
            width: 32, height: 32, 
            background: `linear-gradient(135deg, ${gradientColor}20, ${gradientColor}40)`,
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            {icon}
          </div>
          <span style={{ color: 'white', fontWeight: 600 }}>{title}</span>
        </Space>
      }
      extra={extra}
    >
      {children}
    </Card>
  );
};

const StatsCard = ({ title, value, icon, color, suffix = '', loading = false }) => {
  if (loading) {
    return (
      <Card style={{ borderRadius: 16, background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)', border: '1px solid rgba(255,255,255,0.05)' }}>
        <Skeleton active paragraph={{ rows: 2 }} />
      </Card>
    );
  }
  
  return (
    <Card style={{ 
      borderRadius: 16, 
      background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
      border: '1px solid rgba(255,255,255,0.05)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
    }}>
      <Space direction="vertical" size={4} style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{title}</Text>
          <Avatar size={32} icon={icon} style={{ backgroundColor: color, boxShadow: `0 4px 12px ${color}40` }} />
        </div>
        <Title level={2} style={{ margin: 0, color: color }}>
          {value !== undefined && value !== null ? value : 0}{suffix}
        </Title>
      </Space>
    </Card>
  );
};

// ==================== QUIZ RESULTS VIEWER ====================

const QuizResultsViewer = ({ userId }) => {
  const [loading, setLoading] = useState(true);
  const [quizzes, setQuizzes] = useState([]);

  useEffect(() => {
    if (!userId) return;
    fetchQuizResults();
    const interval = setInterval(fetchQuizResults, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchQuizResults = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/discord/quiz/results/${userId}`);
      if (response.data && response.data.success) {
        setQuizzes(response.data.quizzes || []);
      }
    } catch (error) {
      console.error('Erreur chargement résultats quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spin style={{ color: '#00d4ff' }} />;
  
  if (!quizzes || quizzes.length === 0) {
    return <Empty description={<span style={{ color: 'rgba(255,255,255,0.5)' }}>Aucun quiz complété pour le moment</span>} />;
  }

  return (
    <div>
      {quizzes.map((quiz, idx) => (
        <Card key={idx} style={{ 
          marginBottom: 16, 
          borderRadius: 16,
          background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Tag color="blue" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}>
              Quiz complété le {quiz.completed_at ? new Date(quiz.completed_at).toLocaleString() : 'Date inconnue'}
            </Tag>
            <Divider style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
            {quiz.answers && quiz.answers.map((answer, aIdx) => (
              <div key={aIdx} style={{ marginBottom: 12 }}>
                <Text style={{ color: 'white' }}>Q{aIdx + 1}: {answer.question?.title || 'Question'}</Text>
                <br />
                <Text style={{ color: 'rgba(255,255,255,0.6)' }}>R: {answer.answer}</Text>
              </div>
            ))}
            <Divider style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '8px 0' }} />
            <Text style={{ color: 'rgba(255,255,255,0.5)' }}>Score: {quiz.answers?.length || 0}/{quiz.questions?.length || 0}</Text>
          </Space>
        </Card>
      ))}
    </div>
  );
};

// ==================== SEND QUIZ MODAL ====================

const SendQuizModal = ({ visible, onClose, onSend, userProfile }) => {
  const [form] = Form.useForm();
  const [sending, setSending] = useState(false);
  const { token } = useToken();

  const handleSend = async () => {
    try {
      const values = await form.validateFields();
      setSending(true);
      
      const questions = [
        { 
          title: values.question1, 
          type: "radio", 
          options: values.options1?.split(',').map(o => o.trim()) || [
            "Acheter une maison", 
            "Financer un projet", 
            "Consolider des dettes", 
            "Préparer ma retraite"
          ] 
        },
        { 
          title: values.question2 || "Quel montant souhaitez-vous financer ?", 
          type: "number", 
          placeholder: "Ex: 25000" 
        },
        { 
          title: values.question3 || "Sur quelle durée ?", 
          type: "select", 
          options: values.durations?.split(',').map(o => o.trim()) || [
            "1 an", "2 ans", "3 ans", "4 ans", "5 ans"
          ] 
        }
      ];
      
      await onSend({ user_id: userProfile?.user_id, questions });
      message.success('Quiz envoyé sur Discord !');
      form.resetFields();
      onClose();
    } catch (error) { 
      message.error('Erreur lors de l\'envoi'); 
    } finally { 
      setSending(false); 
    }
  };

  return (
    <Modal
      title={
        <Space>
          <div style={{ 
            width: 40, height: 40, 
            background: `linear-gradient(135deg, ${token.colorPrimary}20, ${token.colorPrimary}40)`, 
            borderRadius: 12, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <QuestionCircleOutlined style={{ fontSize: 20, color: token.colorPrimary }} />
          </div>
          <span style={{ color: 'white' }}>Envoyer un quiz sur Discord</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose} style={{ color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
          Annuler
        </Button>,
        <Button key="send" type="primary" onClick={handleSend} loading={sending} style={{ background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)', border: 'none', boxShadow: '0 4px 20px rgba(0,212,255,0.3)' }}>
          Envoyer le quiz
        </Button>
      ]}
      width={600}
      bodyStyle={{ background: '#1a1a1a' }}
      style={{ top: 20 }}
    >
      <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
        <Form.Item 
          name="question1" 
          label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Question 1</span>} 
          initialValue="Quel est votre objectif financier principal ?"
        >
          <Input placeholder="Question 1" style={{ background: '#2a2a2a', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }} />
        </Form.Item>
        <Form.Item 
          name="options1" 
          label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Options (séparées par des virgules)</span>} 
          initialValue="Acheter une maison,Financer un projet,Consolider des dettes,Préparer ma retraite"
        >
          <Input placeholder="Option1,Option2,Option3" style={{ background: '#2a2a2a', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }} />
        </Form.Item>
        <Form.Item 
          name="question2" 
          label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Question 2</span>}
        >
          <Input placeholder="Quel montant souhaitez-vous financer ?" style={{ background: '#2a2a2a', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }} />
        </Form.Item>
        <Form.Item 
          name="question3" 
          label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Question 3</span>}
        >
          <Input placeholder="Sur quelle durée ?" style={{ background: '#2a2a2a', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }} />
        </Form.Item>
        <Form.Item 
          name="durations" 
          label={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Durées possibles</span>} 
          initialValue="1 an,2 ans,3 ans,4 ans,5 ans"
        >
          <Input placeholder="1 an,2 ans,3 ans,4 ans,5 ans" style={{ background: '#2a2a2a', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// ==================== ANALYSE DE SENTIMENT ====================

const SentimentAnalysisCard = ({ userId }) => {
  const [sentiment, setSentiment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lineChartData, setLineChartData] = useState([]);

  useEffect(() => {
    if (!userId) return;
    fetchSentiment();
    const interval = setInterval(fetchSentiment, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const fetchSentiment = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/discord/analytics/user/${userId}/sentiment`);
      if (response.data && response.data.success) {
        setSentiment(response.data.sentiment);
        
        if (response.data.sentiment?.trends) {
          const chartData = [];
          response.data.sentiment.trends.forEach(t => {
            chartData.push({ 
              day: t.day, 
              value: t.count || 0, 
              type: t.sentiment === 'positif' ? 'Positif' : t.sentiment === 'negatif' ? 'Négatif' : 'Neutre' 
            });
          });
          setLineChartData(chartData);
        }
      }
    } catch (error) {
      console.error('Erreur chargement sentiment:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <GradientCard title="Analyse de sentiment" icon={<HeartOutlined />} loading />;
  
  if (!sentiment || sentiment.total_messages === 0) {
    return (
      <GradientCard title="Analyse de sentiment" icon={<HeartOutlined />} extra={<Tag color="blue" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}>IA temps réel</Tag>}>
        <Empty description={<span style={{ color: 'rgba(255,255,255,0.5)' }}>Aucun message analysé. Envoyez des messages sur Discord pour voir l'analyse de sentiment.</span>} />
      </GradientCard>
    );
  }

  const lineConfig = {
    data: lineChartData,
    xField: 'day',
    yField: 'value',
    seriesField: 'type',
    color: ['#00d4ff', '#ff4757', '#ffb700'],
    smooth: true,
    point: { size: 4 },
    legend: { position: 'top' },
    theme: { backgroundColor: 'transparent' }
  };

  return (
    <GradientCard title="Analyse de sentiment" icon={<HeartOutlined />} extra={<Tag color="blue" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}>IA temps réel</Tag>}>
      <Row gutter={16}>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)' }}>Sentiment général</Text>
            <Title level={2} style={{ 
              color: sentiment.global === 'positif' ? '#00d4ff' : sentiment.global === 'negatif' ? '#ff4757' : '#ffb700',
              margin: 0
            }}>
              {sentiment.global === 'positif' ? <SmileOutlined /> : sentiment.global === 'negatif' ? <FrownOutlined /> : <MehOutlined />} {sentiment.global}
            </Title>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)' }}>Messages analysés</Text>
            <Title level={2} style={{ color: 'white', margin: 0 }}>{sentiment.total_messages || 0}</Title>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)' }}>Satisfaction</Text>
            <Title level={2} style={{ color: '#00d4ff', margin: 0 }}>{sentiment.percentages?.positif || 0}%</Title>
          </Card>
        </Col>
        <Col span={6}>
          <Card size="small" style={{ textAlign: 'center', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)' }}>Insatisfaction</Text>
            <Title level={2} style={{ color: '#ff4757', margin: 0 }}>{sentiment.percentages?.negatif || 0}%</Title>
          </Card>
        </Col>
      </Row>

      <Divider style={{ borderColor: 'rgba(255,255,255,0.05)' }} />

      <Row gutter={24}>
        <Col span={12}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Text style={{ color: 'white' }}>Distribution des sentiments</Text>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: 30, background: '#00d4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>{sentiment.percentages?.positif || 0}%</Text>
              </div>
              <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Positif</Text>
              <br />
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{sentiment.distribution?.positif || 0} msg</Text>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: 30, background: '#ffb700', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>{sentiment.percentages?.neutre || 0}%</Text>
              </div>
              <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Neutre</Text>
              <br />
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{sentiment.distribution?.neutre || 0} msg</Text>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: 30, background: '#ff4757', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: 'white', fontSize: 20, fontWeight: 'bold' }}>{sentiment.percentages?.negatif || 0}%</Text>
              </div>
              <Text style={{ color: 'rgba(255,255,255,0.7)' }}>Négatif</Text>
              <br />
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{sentiment.distribution?.negatif || 0} msg</Text>
            </div>
          </div>
        </Col>
        <Col span={12}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Text style={{ color: 'white' }}>Évolution sur 7 jours</Text>
          </div>
          {lineChartData.length > 0 ? (
            <Line {...lineConfig} height={250} />
          ) : (
            <Empty description={<span style={{ color: 'rgba(255,255,255,0.5)' }}>Pas assez de données pour la tendance</span>} /> 
          )}
        </Col>
      </Row>

      <Divider style={{ borderColor: 'rgba(255,255,255,0.05)' }} />

      <Row gutter={16}>
        <Col span={8}>
          <Progress 
            percent={sentiment.percentages?.positif || 0} 
            strokeColor="#00d4ff"
            format={(percent) => `${percent}% positif`}
          />
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{sentiment.distribution?.positif || 0} messages positifs</Text>
        </Col>
        <Col span={8}>
          <Progress 
            percent={sentiment.percentages?.neutre || 0} 
            strokeColor="#ffb700"
            format={(percent) => `${percent}% neutre`}
          />
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{sentiment.distribution?.neutre || 0} messages neutres</Text>
        </Col>
        <Col span={8}>
          <Progress 
            percent={sentiment.percentages?.negatif || 0} 
            strokeColor="#ff4757"
            format={(percent) => `${percent}% négatif`}
          />
          <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{sentiment.distribution?.negatif || 0} messages négatifs</Text>
        </Col>
      </Row>
    </GradientCard>
  );
};

// ==================== SUGGESTIONS EN TEMPS RÉEL ====================

const RealTimeSuggestions = ({ sentiment, userNeeds, onTakeAction }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [currentTip, setCurrentTip] = useState(0);

  useEffect(() => {
    const generateSuggestions = () => {
      const newSuggestions = [];
      
      if (sentiment?.global === 'negatif' && (sentiment.percentages?.negatif || 0) > 20) {
        newSuggestions.push({
          id: 'sentiment_negatif',
          title: "Amélioration de l'expérience",
          description: "Nous avons détecté une baisse de satisfaction. Un conseiller va vous contacter sous 24h.",
          action: 'Contacter un conseiller',
          icon: <HeartOutlined />,
          priority: 'high',
          color: '#ff4757'
        });
      }
      
      if (sentiment?.global === 'positif' && (sentiment.percentages?.positif || 0) > 30) {
        newSuggestions.push({
          id: 'sentiment_positif',
          title: 'Programme de fidélité',
          description: "Vous êtes un client satisfait ! Profitez de 100 points offerts sur votre prochain achat.",
          action: 'Obtenir mes points',
          icon: <GiftOutlined />,
          priority: 'medium',
          color: '#00d4ff'
        });
      }
      
      if (userNeeds?.needs) {
        const creditNeed = userNeeds.needs.find(n => n.type === 'credit' && n.score > 0);
        if (creditNeed) {
          newSuggestions.push({
            id: 'credit_need',
            title: 'Offre de crédit personnalisée',
            description: "Basé sur votre intérêt pour le crédit (niveau " + (creditNeed.level || 'modéré') + "), découvrez notre offre à taux réduit.",
            action: 'Simuler un crédit',
            icon: <CreditCardOutlined />,
            priority: 'high',
            color: '#1890ff'
          });
        }
        
        const epargneNeed = userNeeds.needs.find(n => n.type === 'epargne' && n.score > 0);
        if (epargneNeed) {
          newSuggestions.push({
            id: 'epargne_need',
            title: "Optimisez votre épargne",
            description: "Placez votre argent avec un rendement jusqu'à 3% par an.",
            action: 'Simuler un placement',
            icon: <RiseOutlined />,
            priority: 'medium',
            color: '#ffb700'
          });
        }
      }
      
      if (newSuggestions.length === 0) {
        newSuggestions.push({
          id: 'default_1',
          title: "Découvrez nos offres",
          description: "Crédit conso à partir de 4.5% TAEG. Simulation gratuite en 2min.",
          action: 'Je simule',
          icon: <ExperimentOutlined />,
          priority: 'low',
          color: '#722ed1'
        });
        newSuggestions.push({
          id: 'default_2',
          title: 'Programme de parrainage',
          description: "Parrainez un ami et gagnez 50€ sur votre compte.",
          action: 'Je parraine',
          icon: <TeamOutlined />,
          priority: 'low',
          color: '#13c2c2'
        });
      }
      
      setSuggestions(newSuggestions);
    };
    
    generateSuggestions();
    
    const interval = setInterval(() => {
      if (suggestions.length > 0) {
        setCurrentTip(prev => (prev + 1) % suggestions.length);
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [sentiment, userNeeds]);
  
  if (!suggestions || suggestions.length === 0) return null;
  
  const currentSuggestion = suggestions[currentTip % suggestions.length];
  
  if (!currentSuggestion) return null;
  
  return (
    <GradientCard 
      title="💡 Suggestions personnalisées" 
      icon={<BulbOutlined />} 
      extra={<Tag color="green" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}>Temps réel</Tag>}
      color="#ffb700"
    >
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>
          {currentSuggestion.icon}
        </div>
        <Title level={4} style={{ color: 'white' }}>{currentSuggestion.title}</Title>
        <Text style={{ color: 'rgba(255,255,255,0.7)' }}>{currentSuggestion.description}</Text>
        <br />
        <Button 
          type="primary" 
          style={{ 
            marginTop: 16, 
            background: currentSuggestion.color, 
            borderColor: currentSuggestion.color,
            boxShadow: `0 4px 20px ${currentSuggestion.color}40`
          }}
          onClick={() => onTakeAction(currentSuggestion.action)}
        >
          {currentSuggestion.action}
        </Button>
      </div>
      
      <Divider style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '16px 0' }} />
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
        {suggestions.map((_, idx) => (
          <div 
            key={idx}
            style={{ 
              width: 8, 
              height: 8, 
              borderRadius: '50%', 
              background: idx === currentTip ? '#ffb700' : 'rgba(255,255,255,0.2)',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onClick={() => setCurrentTip(idx)}
          />
        ))}
      </div>
    </GradientCard>
  );
};

// ==================== ACTIONS RAPIDES ====================

const QuickActions = ({ onAction }) => {
  const actions = [
    { id: 1, title: 'Simuler crédit', icon: <CreditCardOutlined />, color: '#1890ff', command: '!credit 10000 36' },
    { id: 2, title: 'Voir mes points', icon: <StarOutlined />, color: '#ffb700', command: '!points' },
    { id: 3, title: 'Faire un virement', icon: <SendOutlined />, color: '#00d4ff', command: '!send @user 50' },
    { id: 4, title: 'Obtenir mon bonus', icon: <GiftOutlined />, color: '#722ed1', command: '!bonus' },
    { id: 5, title: 'Contacter le support', icon: <CustomerServiceOutlined />, color: '#ff4757', command: '!aide' },
  ];
  
  return (
    <GradientCard title="⚡ Actions rapides" icon={<RocketOutlined />} color="#1890ff">
      <Row gutter={[16, 16]}>
        {actions.map(action => (
          <Col xs={24} sm={12} md={8} lg={4} key={action.id}>
            <Card 
              hoverable 
              style={{ 
                textAlign: 'center', 
                cursor: 'pointer', 
                borderRadius: 12,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              onClick={() => onAction(action.command)}
            >
              <Avatar size={40} icon={action.icon} style={{ backgroundColor: action.color, marginBottom: 8 }} />
              <div>
                <Text style={{ color: 'white' }}>{action.title}</Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </GradientCard>
  );
};

// ==================== TIPS & CONSEILS ====================

const TipsCarousel = () => {
  const tips = [
    { id: 1, title: "Économisez automatiquement", description: "Activez l'épargne automatique pour mettre de côté chaque mois.", icon: <WalletOutlined /> },
    { id: 2, title: "Suivez vos dépenses", description: "Catégorisez vos transactions pour mieux gérer votre budget.", icon: <LineChartOutlined /> },
    { id: 3, title: "Gagnez des points", description: "Utilisez votre carte pour cumuler des points de fidélité.", icon: <StarOutlined /> },
    { id: 4, title: "Sécurisez vos comptes", description: "Activez la double authentification pour plus de sécurité.", icon: <SafetyCertificateOutlined /> },
  ];
  
  const [currentTip, setCurrentTip] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);
  
  const tip = tips[currentTip];
  
  return (
    <GradientCard title="📚 Conseil du moment" icon={<BulbOutlined />} color="#722ed1">
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Avatar size={48} icon={tip.icon} style={{ backgroundColor: '#722ed1' }} />
        <div>
          <Text style={{ color: 'white' }}>{tip.title}</Text>
          <br />
          <Text style={{ color: 'rgba(255,255,255,0.6)' }}>{tip.description}</Text>
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
        {tips.map((_, idx) => (
          <div 
            key={idx}
            style={{ 
              width: 6, 
              height: 6, 
              borderRadius: '50%', 
              background: idx === currentTip ? '#722ed1' : 'rgba(255,255,255,0.2)',
              cursor: 'pointer'
            }}
            onClick={() => setCurrentTip(idx)}
          />
        ))}
      </div>
    </GradientCard>
  );
};

// ==================== ANALYSE DES BESOINS ====================

const UserNeedsCard = ({ needs, onSendQuiz, onVoiceCall, loading = false }) => {
  if (loading) {
    return <GradientCard title="🎯 Analyse des besoins" icon={<ThunderboltOutlined />} loading />;
  }

  const hasNeedsData = needs && needs.needs && needs.needs.length > 0;
  
  if (!hasNeedsData) {
    return (
      <GradientCard title="🎯 Analyse des besoins" icon={<ThunderboltOutlined />} color="#2563eb">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Text style={{ color: 'rgba(255,255,255,0.6)' }}>En attente de données...</Text>
          <br />
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>
            Utilisez les commandes suivantes sur Discord :<br/>
            <Tag color="blue" style={{ marginTop: 8 }}>!credit 10000 36</Tag>
            <Tag color="green">!send @user 50</Tag>
            <Tag color="orange">!solde</Tag>
          </Text>
          <Button 
            type="primary" 
            icon={<QuestionCircleOutlined />}
            onClick={onSendQuiz}
            style={{ 
              marginTop: 16,
              background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
              border: 'none',
              boxShadow: '0 4px 20px rgba(0,212,255,0.3)'
            }}
          >
            Envoyer un quiz
          </Button>
        </div>
      </GradientCard>
    );
  }

  const displayNeeds = needs.needs.slice(0, 3);
  
  return (
    <GradientCard 
      title="🎯 Analyse des besoins" 
      icon={<ThunderboltOutlined />}
      extra={<Tag color="blue" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}>IA temps réel</Tag>}
      color="#2563eb"
    >
      <Row gutter={[16, 16]}>
        {displayNeeds.map((need, idx) => {
          let displayType = need.type;
          if (need.type === 'simuler_credit') displayType = 'Crédit';
          else if (need.type === 'faire_virement') displayType = 'Virement';
          else if (need.type === 'consulter_solde') displayType = 'Solde';
          else if (need.type === 'credit') displayType = 'Crédit';
          else if (need.type === 'epargne') displayType = 'Épargne';
          
          const percent = Math.max(Math.min((need.score || 0) * 10, 100), need.score > 0 ? 5 : 0);
          
          return (
            <Col span={8} key={idx}>
              <Card size="small" style={{ textAlign: 'center', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <Text style={{ color: 'white', textTransform: 'capitalize' }}>{displayType}</Text>
                <Progress 
                  percent={percent} 
                  size="small" 
                  strokeColor={need.level === 'élevé' ? '#ff4757' : need.level === 'moyen' ? '#ffb700' : '#00d4ff'} 
                />
                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>
                  Niveau: {need.level === 'élevé' ? 'Élevé' : need.level === 'moyen' ? 'Moyen' : 'Faible'}
                </Text>
                <br />
                <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                  {need.score || 0} interaction(s)
                </Text>
              </Card>
            </Col>
          );
        })}
        <Col span={8}>
          <Button 
            type="primary" 
            icon={<QuestionCircleOutlined />}
            onClick={onSendQuiz}
            style={{ 
              width: '100%', 
              marginBottom: 8,
              background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
              border: 'none',
              boxShadow: '0 4px 20px rgba(0,212,255,0.3)'
            }}
          >
            Envoyer un quiz
          </Button>
          <Button 
            icon={<PhoneOutlined />}
            onClick={onVoiceCall}
            style={{ 
              width: '100%', 
              background: '#ffb700', 
              borderColor: '#ffb700',
              color: '#0a0a0a',
              fontWeight: 500
            }}
          >
            Appel vocal
          </Button>
        </Col>
      </Row>
    </GradientCard>
  );
};

// ==================== TABLEAUX ====================

const CommandTable = ({ commands, loading = false }) => {
  const columns = [
    { title: <span style={{ color: 'rgba(255,255,255,0.7)' }}>Commande</span>, dataIndex: 'command', key: 'command', render: (text) => <Tag color="blue" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}>!{text}</Tag> },
    { title: <span style={{ color: 'rgba(255,255,255,0.7)' }}>Arguments</span>, dataIndex: 'args', key: 'args', render: (args) => <span style={{ color: 'rgba(255,255,255,0.85)' }}>{args || '-'}</span> },
    { title: <span style={{ color: 'rgba(255,255,255,0.7)' }}>Date</span>, dataIndex: 'timestamp', key: 'timestamp', render: (ts) => <span style={{ color: 'rgba(255,255,255,0.6)' }}>{ts ? new Date(ts).toLocaleString() : 'N/A'}</span> }
  ];
  
  return (
    <Table 
      dataSource={commands || []} 
      columns={columns} 
      size="small" 
      pagination={{ pageSize: 10 }}
      rowKey="timestamp"
      loading={loading}
      className="dark-table"
    />
  );
};

// ==================== SECTEUR BANQUE ====================

const BankDashboard = ({ userProfile, userAnalytics, collectedData, userNeeds, onSendQuiz, onVoiceCall, discordUserId, onQuickAction }) => {
  const [sentiment, setSentiment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!discordUserId) return;
    fetchSentiment();
    const interval = setInterval(fetchSentiment, 30000);
    return () => clearInterval(interval);
  }, [discordUserId]);

  const fetchSentiment = async () => {
    try {
      const response = await api.get(`/discord/analytics/user/${discordUserId}/sentiment`);
      if (response.data && response.data.success) {
        setSentiment(response.data.sentiment);
      }
    } catch (error) {
      console.error('Erreur chargement sentiment:', error);
    } finally {
      setLoading(false);
    }
  };

  // Données réelles depuis l'API
  const balance = userProfile?.balance || 0;
  const points = userProfile?.points || 0;
  const commandsCount = userProfile?.commands_count || 0;
  const engagementScore = userAnalytics?.activity_score || 0;

  return (
    <>
      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={12} lg={6}>
          <StatsCard title="Solde" value={balance} icon={<WalletOutlined />} color="#00d4ff" suffix=" €" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatsCard title="Points" value={points} icon={<StarOutlined />} color="#ffb700" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatsCard title="Commandes" value={commandsCount} icon={<CodeOutlined />} color="#00d4ff" />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <StatsCard title="Engagement" value={engagementScore} icon={<TrophyOutlined />} color="#722ed1" suffix="/100" />
        </Col>
      </Row>

      <Row style={{ marginBottom: 24 }}>
        <Col span={24}>
          <SentimentAnalysisCard userId={discordUserId} />
        </Col>
      </Row>

      <Row style={{ marginBottom: 24 }}>
        <Col span={24}>
          <RealTimeSuggestions 
            sentiment={sentiment}
            userNeeds={userNeeds}
            onTakeAction={onQuickAction}
          />
        </Col>
      </Row>

      <Row style={{ marginBottom: 24 }}>
        <Col span={24}>
          <QuickActions onAction={onQuickAction} />
        </Col>
      </Row>

      <Row style={{ marginBottom: 24 }}>
        <Col span={24}>
          <TipsCarousel />
        </Col>
      </Row>

      <Row style={{ marginBottom: 24 }}>
        <Col span={24}>
          <UserNeedsCard 
            needs={userNeeds}
            onSendQuiz={onSendQuiz}
            onVoiceCall={onVoiceCall}
            loading={loading}
          />
        </Col>
      </Row>
    </>
  );
};

// ==================== COMPOSANT PRINCIPAL ====================

const OmnichannelPortal = () => {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);
  const [userAnalytics, setUserAnalytics] = useState(null);
  const [collectedData, setCollectedData] = useState(null);
  const [userNeeds, setUserNeeds] = useState(null);
  const [showAnalyticsDrawer, setShowAnalyticsDrawer] = useState(false);
  const [showDiscordData, setShowDiscordData] = useState(false);
  const [showSendQuiz, setShowSendQuiz] = useState(false);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const [showSendRecommendation, setShowSendRecommendation] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [realtimeMessages, setRealtimeMessages] = useState([]);
  const [lastMessageId, setLastMessageId] = useState(0);
  const [loadingData, setLoadingData] = useState(false);
  
  const pollingInterval = useRef(null);
  const { token } = useToken();
  
  const getDiscordUserId = () => {
    const savedId = localStorage.getItem('discord_user_id');
    if (savedId) return savedId;
    return "812418704494166017";
  };
  
  const [discordUserId, setDiscordUserId] = useState(getDiscordUserId());
  
  const currentUser = {
    id: discordUserId,
    name: "Client Discord"
  };

  const updateDiscordUserId = (newId) => {
    localStorage.setItem('discord_user_id', newId);
    setDiscordUserId(newId);
    message.success(`ID Discord mis à jour: ${newId}`);
    setTimeout(() => window.location.reload(), 1000);
  };

  const showDiscordIdHelp = () => {
    Modal.info({
      title: <span style={{ color: 'white' }}>🔧 Configuration de l'ID Discord</span>,
      content: (
        <div>
          <p style={{ color: 'rgba(255,255,255,0.85)' }}><strong>Pour recevoir des quiz personnalisés :</strong></p>
          <ol style={{ color: 'rgba(255,255,255,0.7)' }}>
            <li>Sur Discord, tapez <Tag color="blue" style={{ background: 'rgba(0,212,255,0.1)', border: '1px solid rgba(0,212,255,0.2)', color: '#00d4ff' }}>!monid</Tag></li>
            <li>Copiez l'ID affiché</li>
            <li>Collez-le ci-dessous et cliquez "Sauvegarder"</li>
          </ol>
          <Input 
            placeholder="Entrez votre ID Discord" 
            id="discordIdInput"
            defaultValue={discordUserId}
            style={{ marginTop: 10, background: '#2a2a2a', borderColor: 'rgba(255,255,255,0.1)', color: 'white' }}
          />
          <Button 
            type="primary" 
            style={{ 
              marginTop: 15,
              background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
              border: 'none',
              boxShadow: '0 4px 20px rgba(0,212,255,0.3)'
            }}
            onClick={() => {
              const input = document.getElementById('discordIdInput');
              if (input && input.value && input.value.trim()) {
                updateDiscordUserId(input.value.trim());
              }
            }}
          >
            Sauvegarder
          </Button>
        </div>
      ),
      width: 500,
      icon: null,
      okText: 'Fermer',
      bodyStyle: { background: '#1a1a1a' },
      style: { top: 20 }
    });
  };

  const startPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
    
    pollingInterval.current = setInterval(async () => {
      try {
        const response = await api.get(`/discord/bank/messages/${currentUser.id}`, {
          params: { last_id: lastMessageId }
        });
        
        if (response.data && response.data.success && response.data.messages && response.data.messages.length > 0) {
          setRealtimeMessages(prev => [...response.data.messages, ...prev]);
          if (response.data.last_id > lastMessageId) {
            setLastMessageId(response.data.last_id);
          }
          loadAllData();
        }
      } catch (error) {
        console.error('Erreur polling:', error);
      }
    }, 3000);
  };
  
  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
  };
  
  const clearRealtimeMessages = () => {
    setRealtimeMessages([]);
    message.success('Messages effacés');
  };

  useEffect(() => {
    loadAllData();
    startPolling();
    analyzeUserNeeds();
    
    const interval = setInterval(() => {
      analyzeUserNeeds();
    }, 60000);
    
    return () => {
      stopPolling();
      clearInterval(interval);
    };
  }, [discordUserId]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadProfile(), loadFullData()]);
    } catch (error) { 
      console.error('Erreur chargement:', error); 
    } finally { 
      setLoading(false); 
    }
  };

  const loadProfile = async () => {
    try {
      const response = await api.get(`/discord/analytics/user/${currentUser.id}/profile`);
      if (response.data) { 
        setUserProfile(response.data.profile); 
        setUserAnalytics(response.data.analytics); 
      }
    } catch (error) { 
      console.error('Erreur profil:', error); 
    }
  };

  const loadFullData = async () => {
    try {
      const response = await api.get(`/discord/analytics/user/${currentUser.id}/full`);
      if (response.data && response.data.success) {
        setCollectedData(response.data.data);
      }
    } catch (error) { 
      console.error('Erreur données complètes:', error); 
    }
  };

  const analyzeUserNeeds = async () => {
    try {
      const response = await api.get(`/discord/analytics/user/${currentUser.id}/needs`);
      if (response.data && response.data.success) {
        setUserNeeds(response.data.needs);
      }
    } catch (error) {
      console.error('Erreur analyse besoins:', error);
    }
  };

  const sendRecommendationToUser = async (recommendation) => {
    try {
      await api.post('/discord/recommendation/send', { ...recommendation, user_id: currentUser.id });
      message.success(`Recommandation "${recommendation.title}" envoyée`);
    } catch (error) { 
      console.error('Erreur envoi recommandation:', error); 
      throw error; 
    }
  };

  const sendQuizToUser = async (quizData) => {
    try {
      await api.post('/discord/quiz/create', {
        user_id: currentUser.id,
        questions: quizData.questions
      });
      message.success(`Quiz envoyé à l'utilisateur Discord !`);
    } catch (error) { 
      console.error('Erreur envoi quiz:', error); 
      message.error('Erreur lors de l\'envoi du quiz');
    }
  };

  const startVoiceCall = async () => {
    try {
      await api.post('/discord/voice/start', {
        user_id: currentUser.id,
        message: "Un conseiller souhaite vous parler. Tapez !rejoindre_appel sur Discord."
      });
      message.success("Demande d'appel vocal envoyée sur Discord !");
      setShowVoiceCall(true);
    } catch (error) {
      console.error('Erreur appel vocal:', error);
    }
  };

  const handleQuickAction = (action) => {
    message.info(`Action "${action}" déclenchée. La commande sera exécutée sur Discord.`);
  };

  const UserProfileCard = ({ profile, analytics, loading }) => {
    if (loading) return <Skeleton active paragraph={{ rows: 4 }} />;
    if (!profile) return <Empty description={<span style={{ color: 'rgba(255,255,255,0.5)' }}>Aucune donnée de profil</span>} />;
    
    return (
      <Card style={{ 
        marginBottom: 16, 
        background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: 16
      }}>
        <Row gutter={16}>
          <Col span={12}>
            <Descriptions column={1} size="small" title={<span style={{ color: 'white' }}>Informations client</span>}>
              <Descriptions.Item label={<span style={{ color: 'rgba(255,255,255,0.5)' }}>🆔 ID Client</span>}>
                <span style={{ color: 'rgba(255,255,255,0.85)' }}>{profile.user_id || 'N/A'}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: 'rgba(255,255,255,0.5)' }}>💻 Commandes Discord</span>}>
                <span style={{ color: 'rgba(255,255,255,0.85)' }}>{profile.commands_count || 0}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: 'rgba(255,255,255,0.5)' }}>💬 Messages Discord</span>}>
                <span style={{ color: 'rgba(255,255,255,0.85)' }}>{profile.messages_count || 0}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: 'rgba(255,255,255,0.5)' }}>⭐ Points fidélité</span>}>
                <span style={{ color: '#ffb700' }}>{profile.points || 0}</span>
              </Descriptions.Item>
            </Descriptions>
          </Col>
          <Col span={12}>
            <Descriptions column={1} size="small" title={<span style={{ color: 'white' }}>Statistiques</span>}>
              <Descriptions.Item label={<span style={{ color: 'rgba(255,255,255,0.5)' }}>💰 Solde</span>}>
                <span style={{ color: '#00d4ff' }}>{profile.balance || 0} €</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: 'rgba(255,255,255,0.5)' }}>📊 Score engagement</span>}>
                <span style={{ color: (analytics?.activity_score || 0) > 70 ? '#00d4ff' : '#ffb700' }}>
                  {analytics?.activity_score || 0}/100
                </span>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: 'rgba(255,255,255,0.5)' }}>📅 Dernière activité</span>}>
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {profile.last_activity ? new Date(profile.last_activity).toLocaleString() : 'N/A'}
                </span>
              </Descriptions.Item>
            </Descriptions>
          </Col>
        </Row>
      </Card>
    );
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#0a0a0a' }}>
        <Spin size="large" tip="Chargement de votre tableau de bord..." style={{ color: '#00d4ff' }} ><div/></Spin>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, background: '#0a0a0a', minHeight: '100vh' }}>
      {/* EN-TÊTE */}
      <motion.div initial={{ y: -20 }} animate={{ y: 0 }} style={{ 
        background: 'linear-gradient(135deg, #0f0f0f 0%, #1a1a1a 50%, #0d0d0d 100%)',
        borderRadius: 28, 
        padding: '32px 40px', 
        marginBottom: 32,
        border: '1px solid rgba(255,255,255,0.05)',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.05)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 400,
          height: 400,
          background: 'radial-gradient(circle, rgba(0,212,255,0.03) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />
        <div style={{
          position: 'absolute',
          bottom: -150,
          left: -150,
          width: 500,
          height: 500,
          background: 'radial-gradient(circle, rgba(100,100,255,0.03) 0%, transparent 70%)',
          borderRadius: '50%'
        }} />
        
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="large">
              <div style={{ 
                width: 80, height: 80, 
                background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
                borderRadius: 24, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                boxShadow: '0 8px 32px rgba(0,212,255,0.3)'
              }}>
                <DashboardOutlined style={{ fontSize: 40, color: 'white' }} />
              </div>
              <div>
                <Title level={1} style={{ 
                  margin: 0, 
                  color: 'white', 
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #ffffff 0%, #a0a0a0 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>NEXUM Bank - Analytics</Title>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>Analyse IA • Communication Discord</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Space size={12}>
              <Tooltip title="Configurer votre ID Discord">
                <Button 
                  icon={<UserOutlined />} 
                  onClick={showDiscordIdHelp} 
                  style={{ 
                    background: 'rgba(255,255,255,0.05)', 
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.85)'
                  }}
                >
                  ID Discord
                </Button>
              </Tooltip>
              <Tooltip title="Voir les résultats des quiz">
                <Button 
                  icon={<FileTextOutlined />} 
                  onClick={() => setShowQuizResults(true)}
                  style={{ 
                    background: 'rgba(255,255,255,0.05)', 
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.85)'
                  }}
                >
                  Quiz
                </Button>
              </Tooltip>
              <Tooltip title="Données Discord">
                <Button 
                  icon={<DatabaseOutlined />} 
                  onClick={() => setShowDiscordData(true)}
                  style={{ 
                    background: 'rgba(255,255,255,0.05)', 
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.85)'
                  }}
                >
                  Données
                </Button>
              </Tooltip>
              <Tooltip title="Mon Profil">
                <Button 
                  icon={<LineChartOutlined />} 
                  onClick={() => setShowAnalyticsDrawer(true)}
                  style={{ 
                    background: 'rgba(255,255,255,0.05)', 
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.85)'
                  }}
                >
                  Profil
                </Button>
              </Tooltip>
              <Tooltip title="Actualiser">
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={loadAllData}
                  style={{ 
                    background: 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
                    border: 'none',
                    color: 'white',
                    borderRadius: 12,
                    boxShadow: '0 4px 20px rgba(0,212,255,0.3)'
                  }}
                />
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </motion.div>

      {/* DASHBOARD */}
      <BankDashboard 
        userProfile={userProfile}
        userAnalytics={userAnalytics}
        collectedData={collectedData}
        userNeeds={userNeeds}
        onSendQuiz={() => setShowSendQuiz(true)}
        onVoiceCall={startVoiceCall}
        realtimeMessages={realtimeMessages}
        onClearMessages={clearRealtimeMessages}
        discordUserId={discordUserId}
        onQuickAction={handleQuickAction}
      />

      {/* DRAWER PROFIL */}
      <Drawer 
        title={<span style={{ color: 'white' }}>Mon Profil Analytics</span>} 
        placement="right" 
        width={600} 
        onClose={() => setShowAnalyticsDrawer(false)} 
        open={showAnalyticsDrawer}
        bodyStyle={{ background: '#0a0a0a' }}
        headerStyle={{ background: '#1a1a1a', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
      >
        <UserProfileCard profile={userProfile} analytics={userAnalytics} loading={false} />
        <Card title={<span style={{ color: 'white' }}>Commandes récentes</span>} style={{ marginTop: 16, borderRadius: 16, background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)', border: '1px solid rgba(255,255,255,0.05)' }}>
          <CommandTable commands={userAnalytics?.recent_commands} />
        </Card>
      </Drawer>

// ==================== MODAL DONNEES DISCORD ====================
<Modal 
  title={<span style={{ color: 'white' }}>Données Discord</span>} 
  open={showDiscordData} 
  onCancel={() => setShowDiscordData(false)} 
  width={900} 
  footer={null}
  bodyStyle={{ background: '#1a1a1a' }}
  style={{ top: 20 }}
>
  <Tabs 
    defaultActiveKey="commands" 
    style={{ color: 'rgba(255,255,255,0.85)' }}
    items={[
      {
        key: 'commands',
        label: <span style={{ color: 'rgba(255,255,255,0.7)' }}>Commandes</span>,
        children: (
          <CommandTable commands={collectedData?.commands} />
        )
      },
      {
        key: 'messages',
        label: <span style={{ color: 'rgba(255,255,255,0.7)' }}>Messages</span>,
        children: (
          <Table 
            dataSource={collectedData?.messages || []} 
            columns={[
              { 
                title: <span style={{ color: 'rgba(255,255,255,0.7)' }}>Message</span>, 
                dataIndex: 'content', 
                key: 'content', 
                ellipsis: true, 
                render: (text) => <span style={{ color: 'rgba(255,255,255,0.85)' }}>{text}</span> 
              },
              { 
                title: <span style={{ color: 'rgba(255,255,255,0.7)' }}>Date</span>, 
                dataIndex: 'timestamp', 
                key: 'timestamp', 
                render: (ts) => <span style={{ color: 'rgba(255,255,255,0.6)' }}>{ts ? new Date(ts).toLocaleString() : 'N/A'}</span> 
              }
            ]} 
            size="small" 
            pagination={{ pageSize: 10 }}
            rowKey="timestamp"
            className="dark-table"
          />
        )
      },
      {
        key: 'stats',
        label: <span style={{ color: 'rgba(255,255,255,0.7)' }}>Statistiques</span>,
        children: (
          <Descriptions bordered column={2} style={{ background: '#0d0d0d', borderRadius: 8 }}>
            <Descriptions.Item label={<span style={{ color: 'rgba(255,255,255,0.5)' }}>Total commandes</span>}>
              <span style={{ color: 'rgba(255,255,255,0.85)' }}>{collectedData?.stats?.total_commands || 0}</span>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: 'rgba(255,255,255,0.5)' }}>Total messages</span>}>
              <span style={{ color: 'rgba(255,255,255,0.85)' }}>{collectedData?.stats?.total_messages || 0}</span>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: 'rgba(255,255,255,0.5)' }}>Total intentions</span>}>
              <span style={{ color: 'rgba(255,255,255,0.85)' }}>{collectedData?.stats?.total_intents || 0}</span>
            </Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: 'rgba(255,255,255,0.5)' }}>Score intérêts</span>}>
              <span style={{ color: 'rgba(255,255,255,0.85)' }}>{collectedData?.stats?.total_interest_score || 0}</span>
            </Descriptions.Item>
          </Descriptions>
        )
      }
    ]}
  />
</Modal>

      {/* MODAL QUIZ RESULTS */}
      <Modal 
        title={<span style={{ color: 'white' }}>Résultats des quiz</span>} 
        open={showQuizResults} 
        onCancel={() => setShowQuizResults(false)} 
        width={700} 
        footer={null}
        bodyStyle={{ background: '#1a1a1a' }}
        style={{ top: 20 }}
      >
        <QuizResultsViewer userId={currentUser.id} />
      </Modal>

      {/* MODAL SEND QUIZ */}
      <SendQuizModal 
        visible={showSendQuiz} 
        onClose={() => setShowSendQuiz(false)} 
        onSend={sendQuizToUser} 
        userProfile={{ user_id: currentUser.id }} 
      />

      {/* MODAL VOICE CALL */}
      <Modal 
        title={<span style={{ color: 'white' }}>Appel vocal</span>} 
        open={showVoiceCall} 
        onCancel={() => setShowVoiceCall(false)} 
        footer={null}
        bodyStyle={{ background: '#1a1a1a' }}
        style={{ top: 20 }}
      >
        <Alert 
          message={<span style={{ color: 'white' }}>Demande d'appel vocal envoyée</span>} 
          description={<span style={{ color: 'rgba(255,255,255,0.7)' }}>Une notification a été envoyée sur Discord. L'utilisateur doit taper !rejoindre_appel pour accepter l'appel.</span>} 
          type="info" 
          showIcon 
          style={{ 
            borderRadius: 12,
            background: 'rgba(0,212,255,0.05)',
            border: '1px solid rgba(0,212,255,0.1)'
          }}
        />
      </Modal>

      {/* STYLES CSS */}
      <style jsx>{`
        .dark-table .ant-table {
          background: transparent !important;
        }
        .dark-table .ant-table-thead > tr > th {
          background: rgba(255,255,255,0.03) !important;
          color: rgba(255,255,255,0.7) !important;
          border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        }
        .dark-table .ant-table-tbody > tr > td {
          border-bottom: 1px solid rgba(255,255,255,0.03) !important;
          color: rgba(255,255,255,0.85) !important;
        }
        .dark-table .ant-table-tbody > tr:hover > td {
          background: rgba(255,255,255,0.02) !important;
        }
        .dark-table .ant-empty-description {
          color: rgba(255,255,255,0.3) !important;
        }
        .ant-tabs-tab {
          color: rgba(255,255,255,0.5) !important;
        }
        .ant-tabs-tab-active {
          color: #00d4ff !important;
        }
        .ant-tabs-ink-bar {
          background: #00d4ff !important;
        }
        .ant-descriptions-item-label {
          background: rgba(255,255,255,0.03) !important;
          color: rgba(255,255,255,0.5) !important;
          border-color: rgba(255,255,255,0.05) !important;
        }
        .ant-descriptions-item-content {
          background: rgba(255,255,255,0.02) !important;
          border-color: rgba(255,255,255,0.05) !important;
        }
        .ant-modal-content {
          background: #1a1a1a !important;
          border-radius: 16 !important;
          border: 1px solid rgba(255,255,255,0.05) !important;
        }
        .ant-modal-header {
          background: #1a1a1a !important;
          border-bottom: 1px solid rgba(255,255,255,0.05) !important;
          border-radius: 16px 16px 0 0 !important;
        }
        .ant-modal-close {
          color: rgba(255,255,255,0.5) !important;
        }
        .ant-modal-close:hover {
          color: white !important;
        }
        .ant-drawer-content {
          background: #0a0a0a !important;
        }
        .ant-drawer-header {
          background: #1a1a1a !important;
          border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        }
      `}</style>
    </div>
  );
};

export default OmnichannelPortal;