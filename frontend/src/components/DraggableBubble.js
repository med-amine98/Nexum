import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Tooltip, Avatar } from 'antd';
import './DraggableBubble.css';

const DraggableBubble = ({ 
  icon, 
  color, 
  tooltip, 
  onClick,
  initialPosition = { bottom: 30, right: 30 },
  zIndex = 9999,
  size = 60,
  customContent
}) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const bubbleRef = useRef(null);
  const dragStartTime = useRef(0);
  const clickPrevented = useRef(false);

  // Charger la position sauvegardée
  useEffect(() => {
    const savedPos = localStorage.getItem(`bubble-${tooltip}`);
    if (savedPos) {
      try {
        const parsed = JSON.parse(savedPos);
        setPosition(parsed);
      } catch (e) {
        console.error('Erreur chargement position:', e);
      }
    }
  }, [tooltip]);

  // Sauvegarder la position
  const savePosition = (newPos) => {
    localStorage.setItem(`bubble-${tooltip}`, JSON.stringify(newPos));
  };

  const handleMouseDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragStartTime.current = Date.now();
    setIsDragging(true);
    setStartPos({
      x: e.clientX,
      y: e.clientY
    });
    clickPrevented.current = false;
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    e.preventDefault();
    e.stopPropagation();

    const dx = startPos.x - e.clientX;
    const dy = startPos.y - e.clientY;

    // Si le déplacement est significatif, on considère que c'est un drag
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      clickPrevented.current = true;
    }

    const newBottom = Math.max(10, Math.min(window.innerHeight - 100, position.bottom + dy));
    const newRight = Math.max(10, Math.min(window.innerWidth - 100, position.right + dx));

    setPosition({
      bottom: newBottom,
      right: newRight
    });
  };

  const handleMouseUp = (e) => {
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      
      const dragDuration = Date.now() - dragStartTime.current;
      
      // Si ce n'est pas un drag (pas de déplacement significatif) et que c'est un clic court
      if (!clickPrevented.current && dragDuration < 300 && onClick) {
        onClick();
      }
      
      setIsDragging(false);
      savePosition(position);
      clickPrevented.current = false;
    }
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position]);

  // Gestion du clic direct sur le contenu personnalisé
  const handleContentClick = (e) => {
    e.stopPropagation();
    if (!isDragging && onClick) {
      onClick();
    }
  };

  return (
    <motion.div
      ref={bubbleRef}
      className={`draggable-bubble ${isDragging ? 'dragging' : ''}`}
      style={{
        position: 'fixed',
        bottom: position.bottom,
        right: position.right,
        zIndex: isDragging ? 99999 : zIndex,
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none'
      }}
      animate={{
        scale: isDragging ? 1.05 : 1,
        transition: { duration: 0.2 }
      }}
      onMouseDown={handleMouseDown}
    >
      <Tooltip title={tooltip} placement="left">
        <div onClick={handleContentClick} style={{ display: 'inline-block' }}>
          {customContent ? (
            customContent
          ) : (
            <Avatar
              size={size}
              icon={icon}
              style={{
                backgroundColor: color,
                boxShadow: isDragging 
                  ? '0 10px 30px rgba(0,0,0,0.3)' 
                  : '0 5px 20px rgba(0,0,0,0.2)',
                cursor: 'inherit',
                transition: 'box-shadow 0.2s ease'
              }}
            />
          )}
        </div>
      </Tooltip>
    </motion.div>
  );
};

export default DraggableBubble;