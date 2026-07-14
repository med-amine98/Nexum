import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { 
  SortableContext, 
  verticalListSortingStrategy 
} from '@dnd-kit/sortable';
import { Typography, Badge } from 'antd';
import KanbanItem from './KanbanItem';

const { Title } = Typography;

const KanbanColumn = ({ id, title, tasks, color }) => {
  const { setNodeRef } = useDroppable({
    id: id,
  });

  return (
    <div 
      ref={setNodeRef}
      style={{ 
        background: '#f1f5f9', 
        borderRadius: 16, 
        minWidth: 340, 
        width: 340,
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        border: '1px solid #e2e8f0',
        maxHeight: 'calc(100vh - 180px)',
        overflowY: 'auto'
      }}
      className="kanban-column-container"
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <Title level={5} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 700, color: '#475569' }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: color, boxShadow: `0 0 8px ${color}` }} />
          {title}
        </Title>
        <Badge 
          count={tasks.length} 
          style={{ 
            backgroundColor: 'white', 
            color: '#64748b', 
            border: '1px solid #e2e8f0',
            fontWeight: 700,
            fontSize: 11
          }} 
        />
      </div>

      <SortableContext 
        id={id}
        items={tasks.map(t => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 150 }}>
          {tasks.map((task) => (
            <KanbanItem key={task.id} task={task} />
          ))}
          {tasks.length === 0 && (
            <div style={{ 
              height: 120, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              border: '2px dashed #cbd5e1',
              borderRadius: 12,
              color: '#94a3b8',
              fontSize: 13,
              fontWeight: 500,
              backgroundColor: 'rgba(255,255,255,0.4)'
            }}>
              Déposer ici
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

export default KanbanColumn;
