import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, Typography, Space, Tag, Avatar, Tooltip } from 'antd';
import { ClockCircleOutlined, UserOutlined } from '@ant-design/icons';

const { Text, Title } = Typography;

const KanbanItem = ({ task, isOverlay }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    cursor: 'grab',
    touchAction: 'none'
  };

  const getPriorityStyle = (p) => {
    switch (p) {
      case 'high': return { color: '#ff4d4f', bg: '#fff1f0', border: '#ffa39e' };
      case 'medium': return { color: '#fa8c16', bg: '#fff7e6', border: '#ffd591' };
      case 'low': return { color: '#52c41a', bg: '#f6ffed', border: '#b7eb8f' };
      default: return { color: '#8c8c8c', bg: '#f5f5f5', border: '#d9d9d9' };
    }
  };

  const pStyle = getPriorityStyle(task.priority);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="kanban-item-wrapper">
      <Card 
        size="small" 
        className={`kanban-card-premium ${isOverlay ? 'overlay' : ''}`}
        style={{ 
          borderRadius: 12, 
          boxShadow: isOverlay ? '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' : '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
          borderLeft: `4px solid ${pStyle.color}`,
          background: 'white',
          marginBottom: 12
        }}
        bodyStyle={{ padding: '16px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <Tag 
            style={{ 
              margin: 0, 
              fontSize: 10, 
              fontWeight: 700,
              borderRadius: 6,
              backgroundColor: pStyle.bg,
              color: pStyle.color,
              borderColor: pStyle.border
            }}
          >
            {task.priority?.toUpperCase()}
          </Tag>
          <Tooltip title={task.assignee || 'Unassigned'}>
            <Avatar size={24} icon={<UserOutlined />} style={{ backgroundColor: '#f1f5f9', color: '#64748b' }} />
          </Tooltip>
        </div>
        
        <Title level={5} style={{ margin: '0 0 8px 0', fontSize: 14, fontWeight: 600, color: '#0f172a' }}>
          {task.title}
        </Title>
        
        <Text type="secondary" style={{ fontSize: 12, lineHeight: 1.5, color: '#64748b' }} ellipsis={{ rows: 2 }}>
          {task.description}
        </Text>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: '1px dotted #e2e8f0' }}>
          <Space size={4} style={{ color: '#94a3b8' }}>
            <ClockCircleOutlined style={{ fontSize: 12 }} />
            <Text style={{ fontSize: 11, color: '#94a3b8' }}>{new Date(task.created_at).toLocaleDateString()}</Text>
          </Space>
          <Text style={{ fontSize: 11, fontWeight: 500, color: '#64748b' }}>{task.assignee}</Text>
        </div>
      </Card>

      <style>{`
        .kanban-item-wrapper {
          transition: transform 0.2s ease;
        }
        .kanban-card-premium {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .kanban-card-premium:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        .overlay {
          transform: rotate(2deg) scale(1.02);
        }
      `}</style>
    </div>
  );
};

export default KanbanItem;
