// src/modules/ai/shared/MessageBubble.js
import React from 'react';
import { Avatar, Typography } from 'antd';
import { UserOutlined, RobotOutlined } from '@ant-design/icons';

const { Text } = Typography;

export const MessageBubble = ({ message, avatarIcon, avatarColor, children }) => {
  const isBot = message.type === 'bot';
  
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isBot ? 'flex-start' : 'flex-end',
        marginBottom: 16
      }}
    >
      {isBot && (
        <Avatar
          icon={avatarIcon || <RobotOutlined />}
          size="small"
          style={{ background: avatarColor || '#1890ff', marginRight: 8, flexShrink: 0 }}
        />
      )}
      <div
        style={{
          maxWidth: '85%',
          padding: '10px 14px',
          borderRadius: isBot ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
          background: isBot ? '#f5f5f5' : '#1890ff',
          color: isBot ? 'inherit' : 'white',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {children}
        </div>
        <div
          style={{
            fontSize: 10,
            marginTop: 4,
            opacity: 0.7,
            textAlign: 'right'
          }}
        >
          {message.timestamp}
        </div>
      </div>
      {!isBot && (
        <Avatar
          icon={avatarIcon || <UserOutlined />}
          size="small"
          style={{ background: avatarColor || '#52c41a', marginLeft: 8, flexShrink: 0 }}
        />
      )}
    </div>
  );
};