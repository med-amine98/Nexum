import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  DndContext, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragOverlay,
  defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  rectSortingStrategy
} from '@dnd-kit/sortable';
import { 
  Card, Typography, Button, Space, 
  Avatar, Tag, Modal, Form, Input, 
  Select, message, Divider, Empty
} from 'antd';
import { 
  PlusOutlined, 
  MoreOutlined, 
  UserOutlined, 
  ClockCircleOutlined,
  ProjectOutlined
} from '@ant-design/icons';
import KanbanColumn from './components/KanbanColumn';
import KanbanItem from './components/KanbanItem';

const { Title, Text } = Typography;
const { Option } = Select;

const COLUMNS = [
  { id: 'todo', title: 'À Faire', color: '#64748b' },
  { id: 'in-progress', title: 'En Cours', color: '#3b82f6' },
  { id: 'done', title: 'Terminé', color: '#10b981' }
];

const KanbanBoard = () => {
  const [tasks, setTasks] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/project/kanban/tasks');
      setTasks(res.data || []);
    } catch (error) {
      message.error('Erreur lors du chargement des tâches');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeTask = tasks.find(t => t.id === activeId);
    const overTask = tasks.find(t => t.id === overId);
    
    // Si on survole une colonne vide
    const overColumn = COLUMNS.find(c => c.id === overId);

    if (overColumn) {
      if (activeTask.status !== overId) {
        setTasks(prev => prev.map(t => t.id === activeId ? { ...t, status: overId } : t));
      }
      return;
    }

    if (activeTask && overTask && activeTask.status !== overTask.status) {
      setTasks(prev => prev.map(t => t.id === activeId ? { ...t, status: overTask.status } : t));
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) {
      setActiveId(null);
      return;
    }

    const activeId = active.id;
    const overId = over.id;
    const activeTask = tasks.find(t => t.id === activeId);

    // Sync with backend
    try {
      await api.put(`/project/kanban/tasks/${activeId}`, {
        status: activeTask.status,
        order: 0 // Simplifié pour la démo
      });
    } catch (error) {
      console.error('Failed to sync kanban', error);
    }

    if (active.id !== over.id) {
      const oldIndex = tasks.findIndex(t => t.id === active.id);
      const newIndex = tasks.findIndex(t => t.id === over.id);
      setTasks((items) => arrayMove(items, oldIndex, newIndex));
    }

    setActiveId(null);
  };

  const addTask = async (values) => {
    try {
      const res = await api.post(`/project/kanban/tasks?title=${encodeURIComponent(values.title)}&description=${encodeURIComponent(values.description || '')}&priority=${values.priority}&assignee=${encodeURIComponent(values.assignee || '')}`);
      setTasks([...tasks, res.data]);
      setIsModalVisible(false);
      form.resetFields();
      message.success('Tâche ajoutée au Kanban');
    } catch (error) {
      message.error('Erreur lors de la création de la tâche');
    }
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <div style={{ 
      padding: '32px 24px', 
      minHeight: 'calc(100vh - 64px)',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)'
    }} className="animate-fadeIn">
      <div style={{ marginBottom: 40, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <Title level={2} style={{ margin: 0, fontWeight: 800, letterSpacing: '-0.5px', color: '#0f172a' }}>
            <ProjectOutlined style={{ marginRight: 16, color: '#3b82f6' }} />
            Gestion de Projet Kanban
          </Title>
          <Text style={{ fontSize: 16, color: '#64748b', marginTop: 8, display: 'block' }}>
            Pilotez vos flux de travail stratégiques avec agilité et précision.
          </Text>
        </div>
        <Button 
          type="primary" 
          icon={<PlusOutlined />} 
          size="large" 
          style={{ 
            borderRadius: 12, 
            height: 48, 
            padding: '0 24px',
            fontWeight: 600,
            background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
            border: 'none',
            boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)'
          }}
          onClick={() => setIsModalVisible(true)}
        >
          Nouvelle Tâche
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div style={{ 
          display: 'flex', 
          gap: 24, 
          overflowX: 'auto', 
          paddingBottom: 24,
          paddingTop: 8
        }}>
          {COLUMNS.map(column => (
            <KanbanColumn 
              key={column.id} 
              id={column.id} 
              title={column.title} 
              color={column.color}
              tasks={tasks.filter(t => t.status === column.id)}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{
          sideEffects: defaultDropAnimationSideEffects({
            styles: {
              active: {
                opacity: '0.5',
              },
            },
          }),
        }}>
          {activeId ? (
            <KanbanItem task={activeTask} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>

      <Modal
        title="Ajouter une tâche"
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={addTask}>
          <Form.Item name="title" label="Titre" rules={[{ required: true, message: 'Le titre est requis' }]}>
            <Input placeholder="Nom de la tâche" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea placeholder="Détails de la tâche..." rows={3} />
          </Form.Item>
          <Form.Item name="priority" label="Priorité" initialValue="medium">
            <Select>
              <Option value="high">Haute</Option>
              <Option value="medium">Moyenne</Option>
              <Option value="low">Basse</Option>
            </Select>
          </Form.Item>
          <Form.Item name="assignee" label="Assigné à">
            <Input placeholder="Nom du responsable" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default KanbanBoard;
