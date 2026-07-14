import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BulbOutlined,
  RobotOutlined,
  CloseOutlined,
  RightOutlined,
  BankOutlined,
  SafetyCertificateOutlined,
  RiseOutlined,
  ShoppingOutlined,
  FileTextOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  // Icônes manquantes ajoutées
  BarChartOutlined,
  TeamOutlined,
  WalletOutlined,
  DatabaseOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { Card, Tag, Space, Typography, Button, Tooltip, Badge } from 'antd';
import { useCopilot } from '../../hooks/useCopilot';
import './Copilot.css';

const { Text, Title } = Typography;

// Suggestions contextuelles par type
const contextualSuggestions = {
  dashboard: [
    { icon: <BarChartOutlined />, text: "Analyser les performances du mois", action: "Analyse les performances du mois", priority: 95 },
    { icon: <WarningOutlined />, text: "Voir les alertes critiques", action: "Affiche les alertes critiques", priority: 90 },
    { icon: <RiseOutlined />, text: "Prévisions pour le prochain trimestre", action: "Fais des prévisions pour le prochain trimestre", priority: 85 }
  ],
  sales: [
    { icon: <ShoppingOutlined />, text: "Créer une nouvelle facture", action: "Crée une nouvelle facture", priority: 98 },
    { icon: <RiseOutlined />, text: "Analyser les ventes du mois", action: "Analyse les ventes du mois", priority: 92 },
    { icon: <WarningOutlined />, text: "Clients à relancer", action: "Affiche les clients à relancer", priority: 88 }
  ],
  crm: [
    { icon: <TeamOutlined />, text: "Ajouter un nouveau client", action: "Ajoute un nouveau client", priority: 96 },
    { icon: <BulbOutlined />, text: "Opportunités à suivre", action: "Affiche les opportunités à suivre", priority: 89 },
    { icon: <WarningOutlined />, text: "Risques d'attrition", action: "Analyse les risques d'attrition", priority: 87 }
  ],
  accounting: [
    { icon: <WalletOutlined />, text: "Générer un rapport financier", action: "Génère un rapport financier", priority: 94 },
    { icon: <WarningOutlined />, text: "Factures impayées", action: "Affiche les factures impayées", priority: 91 },
    { icon: <FileTextOutlined />, text: "Préparer la déclaration TVA", action: "Prépare la déclaration TVA", priority: 86 }
  ],
  stock: [
    { icon: <DatabaseOutlined />, text: "Vérifier les stocks bas", action: "Vérifie les stocks bas", priority: 93 },
    { icon: <ShoppingOutlined />, text: "Réapprovisionnement suggéré", action: "Suggère un réapprovisionnement", priority: 88 },
    { icon: <WarningOutlined />, text: "Mouvements anormaux", action: "Analyse les mouvements anormaux", priority: 84 }
  ],
  hr: [
    { icon: <TeamOutlined />, text: "Nouvel employé", action: "Ajoute un nouvel employé", priority: 92 },
    { icon: <CalendarOutlined />, text: "Congés à valider", action: "Affiche les congés à valider", priority: 89 },
    { icon: <RiseOutlined />, text: "Analyse des performances RH", action: "Analyse les performances RH", priority: 83 }
  ],
  banking: [
    { icon: <BankOutlined />, text: "Analyser un dossier de crédit", action: "Analyse un dossier de crédit", priority: 97 },
    { icon: <SafetyCertificateOutlined />, text: "Détecter des fraudes", action: "Détecte des fraudes potentielles", priority: 95 },
    { icon: <RiseOutlined />, text: "Prévisions financières", action: "Fais des prévisions financières", priority: 90 }
  ],
  insurance: [
    { icon: <SafetyCertificateOutlined />, text: "Traiter un sinistre", action: "Traite un nouveau sinistre", priority: 96 },
    { icon: <WarningOutlined />, text: "Évaluer un risque", action: "Évalue le risque d'un client", priority: 91 },
    { icon: <FileTextOutlined />, text: "Générer un rapport", action: "Génère un rapport d'activité", priority: 86 }
  ]
};

// Suggestions intelligentes basées sur l'heure
const timeBasedSuggestions = () => {
  const hour = new Date().getHours();
  
  if (hour < 10) {
    return [
      { icon: <RiseOutlined />, text: "Résumé de la matinée", action: "Donne-moi un résumé de la matinée" },
      { icon: <CalendarOutlined />, text: "Planning du jour", action: "Affiche mon planning du jour" }
    ];
  } else if (hour < 14) {
    return [
      { icon: <ShoppingOutlined />, text: "Commandes en attente", action: "Affiche les commandes en attente" },
      { icon: <TeamOutlined />, text: "Réunion d'équipe", action: "Prépare la réunion d'équipe" }
    ];
  } else if (hour < 18) {
    return [
      { icon: <BarChartOutlined />, text: "Bilan de l'après-midi", action: "Fais le bilan de l'après-midi" },
      { icon: <WarningOutlined />, text: "Points d'attention", action: "Affiche les points d'attention" }
    ];
  } else {
    return [
      { icon: <CheckCircleOutlined />, text: "Tâches accomplies", action: "Récapitule les tâches accomplies" },
      { icon: <RiseOutlined />, text: "Prévisions demain", action: "Donne-moi les prévisions pour demain" }
    ];
  }
};

// Suggestions personnalisées basées sur l'historique
const getPersonalizedSuggestions = (history) => {
  if (!history || history.length === 0) return [];
  
  // Analyser les actions fréquentes
  const actionCounts = {};
  history.forEach(msg => {
    if (msg.type === 'user') {
      const action = msg.content.toLowerCase();
      actionCounts[action] = (actionCounts[action] || 0) + 1;
    }
  });
  
  // Suggestions basées sur les actions fréquentes
  const suggestions = [];
  if (actionCounts['facture'] > 2) {
    suggestions.push({
      icon: <FileTextOutlined />,
      text: "Créer une facture récurrente",
      action: "Crée une facture récurrente"
    });
  }
  if (actionCounts['client'] > 2) {
    suggestions.push({
      icon: <TeamOutlined />,
      text: "Importer des clients",
      action: "Importe une liste de clients"
    });
  }
  
  return suggestions;
};

const CopilotSuggestions = ({ context = 'dashboard', history = [], onSelect }) => {
  const { executeSuggestion } = useCopilot();
  const [suggestions, setSuggestions] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState(null);

  // Générer les suggestions
  useEffect(() => {
    const contextSuggestions = contextualSuggestions[context] || contextualSuggestions.dashboard;
    const timeSuggestions = timeBasedSuggestions();
    const personalizedSuggestions = getPersonalizedSuggestions(history);
    
    // Combiner et trier par priorité
    const allSuggestions = [
      ...contextSuggestions,
      ...timeSuggestions,
      ...personalizedSuggestions
    ].sort((a, b) => (b.priority || 50) - (a.priority || 50));
    
    // Limiter le nombre
    setSuggestions(expanded ? allSuggestions : allSuggestions.slice(0, 5));
  }, [context, history, expanded]);

  const handleSuggestionClick = (suggestion) => {
    if (onSelect) {
      onSelect(suggestion);
    } else {
      executeSuggestion(suggestion);
    }
  };

  if (suggestions.length === 0) return null;

  return (
    <motion.div 
      className="copilot-suggestions"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="suggestions-header">
        <Space>
          <BulbOutlined style={{ color: '#faad14' }} />
          <Text strong>Suggestions intelligentes</Text>
          <Badge count={suggestions.length} style={{ backgroundColor: '#4158D0' }} />
        </Space>
        <Tooltip title={expanded ? "Voir moins" : "Voir plus"}>
          <Button 
            type="text" 
            size="small"
            icon={<RightOutlined style={{ transform: expanded ? 'rotate(90deg)' : 'none' }} />}
            onClick={() => setExpanded(!expanded)}
          />
        </Tooltip>
      </div>

      <div className="suggestions-list">
        <AnimatePresence>
          {suggestions.map((sugg, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ delay: index * 0.05 }}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <Tag
                className={`suggestion-tag ${hoveredIndex === index ? 'hovered' : ''}`}
                style={{
                  cursor: 'pointer',
                  padding: '8px 12px',
                  margin: '4px',
                  fontSize: '13px',
                  border: hoveredIndex === index ? `2px solid ${sugg.color || '#4158D0'}` : '1px solid #d9d9d9',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => handleSuggestionClick(sugg)}
              >
                <Space>
                  <span style={{ color: sugg.color || '#4158D0', fontSize: '16px' }}>
                    {sugg.icon || <BulbOutlined />}
                  </span>
                  <span>{sugg.text}</span>
                  {sugg.priority && (
                    <span style={{ 
                      fontSize: '10px', 
                      color: sugg.priority > 90 ? '#52c41a' : '#faad14',
                      marginLeft: '4px'
                    }}>
                      {sugg.priority}%
                    </span>
                  )}
                </Space>
              </Tag>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {suggestions.length > 0 && (
        <div className="suggestions-footer">
          <Text type="secondary" style={{ fontSize: '11px' }}>
            Basé sur votre contexte et vos habitudes
          </Text>
        </div>
      )}
    </motion.div>
  );
};

export default CopilotSuggestions;