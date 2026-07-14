// src/modules/ai/shared/TypingIndicator.js
import React from 'react';
import { motion } from 'framer-motion';

export const TypingIndicator = ({ color = '#1890ff' }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', background: '#f0f0f0', borderRadius: '18px', width: 'fit-content' }}>
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: color
          }}
          animate={{
            y: [0, -5, 0],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  );
};