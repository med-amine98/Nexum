import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TeamOutlined, CloseOutlined } from '@ant-design/icons';
import DraggableBubble from '../DraggableBubble';
import AssistantPopup from './AssistantPopup';
import './Assistant.css';

const AssistantBubble = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [isHovered, setIsHovered] = useState(false);



  // CORRECTION 1: Utiliser un toggle au lieu de set à true
  const handleBubbleClick = useCallback(() => {


    setShowPopup(prev => {
      const newState = !prev;

      return newState;
    });
  }, [showPopup]);

  // CORRECTION 2: Fermer le popup
  const handleClosePopup = useCallback(() => {

    setShowPopup(false);
  }, []);

  // CORRECTION 3: Sélection d'assistant
  const handleSelectAssistant = useCallback((assistant) => {

    setShowPopup(false);
  }, []);

  return (
    <>
      <DraggableBubble
        icon={showPopup ? <CloseOutlined /> : <TeamOutlined />}
        color="transparent"
        tooltip={showPopup ? "Fermer" : "Choisir votre assistant IA"} // CORRECTION 4: Tooltip dynamique
        onClick={handleBubbleClick}
        initialPosition={{ bottom: 120, right: 30 }}
        zIndex={9998}
        size={70}
        customContent={
          <div 
            className={`assistant-bubble-modern ${showPopup ? 'open' : ''}`}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ // CORRECTION 5: Style inline pour s'assurer que tout est visible
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: showPopup 
                ? 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)' 
                : 'linear-gradient(135deg, #4158D0 0%, #C850C0 100%)',
              cursor: 'pointer',
              position: 'relative',
              boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
            }}
          >
            <div className="assistant-halo"></div>
            <div className="assistant-core">
              <div className="assistant-reflet"></div>
              <div className="assistant-icon-wrapper">
                {showPopup ? <CloseOutlined style={{ fontSize: 28, color: 'white' }} /> : <TeamOutlined style={{ fontSize: 28, color: 'white' }} />}
              </div>
            </div>
            <div className="assistant-ring ring1"></div>
            <div className="assistant-ring ring2"></div>
            <div className="assistant-ring ring3"></div>
            <div className="light-point lp1"></div>
            <div className="light-point lp2"></div>
            <div className="light-point lp3"></div>
            {!showPopup && (
              <div className="assistant-count-badge" style={{ // CORRECTION 6: Style inline pour le badge
                position: 'absolute',
                top: -5,
                right: -5,
                background: '#ff4d4f',
                color: 'white',
                borderRadius: '50%',
                width: 24,
                height: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 12,
                fontWeight: 'bold',
                border: '2px solid white'
              }}>
                <span>3</span>
              </div>
            )}
          </div>
        }
      />

      <AnimatePresence>
        {showPopup && (
          <motion.div
            className="assistant-popup-modern"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            style={{
              position: 'fixed',
              bottom: 200,
              right: 30,
              zIndex: 10000,
              pointerEvents: 'auto',
              width: 320, // CORRECTION 7: Ajouter une largeur fixe
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)', // CORRECTION 8: Ajouter une ombre
              borderRadius: 16 // CORRECTION 9: Ajouter un border radius
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <AssistantPopup 
              onClose={handleClosePopup}
              onSelect={handleSelectAssistant}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AssistantBubble;