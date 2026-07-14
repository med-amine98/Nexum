import React from 'react';
import { Card, Tag, Button } from 'antd';
import { ThunderboltOutlined, StarOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import './MagicTask.css';

const MagicTask = ({ task, onComplete }) => {
  // ✅ Sécurité : si task est undefined/null, on affiche un message ou on ne rend rien
  if (!task) {
    return (
      <Card className="magic-task-card" style={{ opacity: 0.5 }}>
        <p style={{ color: '#999', textAlign: 'center' }}>Tâche indisponible</p>
      </Card>
    );
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -5 }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="magic-task-container"
    >
      <Card className="magic-task-card">
        <div className="magic-glow" />
        <div className="magic-header">
          <div className="magic-icon-wrapper">
            <ThunderboltOutlined className="magic-wand" />
          </div>
          <div className="magic-info">
            <h4 className="magic-title">{task.title || 'Tâche sans titre'}</h4>
            <Tag color="purple" className="magic-tag">AI Suggested</Tag>
          </div>
        </div>
        
        <p className="magic-description">{task.description || 'Aucune description'}</p>
        
        <div className="magic-footer">
          <div className="magic-impact">
            <StarOutlined />
            <span>Impact: {task.impact || 'Non défini'}</span>
          </div>
          <Button 
            type="primary" 
            className="magic-button"
            onClick={() => onComplete && onComplete(task)}
          >
            Exécuter la Magie
          </Button>
        </div>
      </Card>
    </motion.div>
  );
};

// ✅ Valeurs par défaut pour les props (bonne pratique)
MagicTask.defaultProps = {
  task: {
    title: 'Tâche par défaut',
    description: 'Description manquante',
    impact: 'Moyen'
  },
  onComplete: () => {}
};

export default MagicTask;