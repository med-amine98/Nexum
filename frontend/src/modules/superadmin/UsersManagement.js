import React, { useState, useEffect } from 'react';

import {
  Card, Table, Button, Space, Tag, Modal, message,
  Input, Select, Form, Popconfirm, Tooltip, Avatar,
  Badge, Typography, Descriptions, Drawer, Row, Col
} from 'antd';
import {
  UserOutlined, EditOutlined, DeleteOutlined, EyeOutlined,
  SearchOutlined, ReloadOutlined, PlusOutlined,
  CheckCircleOutlined, CloseCircleOutlined, MailOutlined,
  PhoneOutlined, BankOutlined, IdcardOutlined, TeamOutlined
} from '@ant-design/icons';
import { superAdminApi } from '../../services/superadminApi';
import './SuperAdmin.css';

const { Text } = Typography;
const { Option } = Select;

const UsersManagement = () => {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [selectedUser, setSelectedUser] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    status: ''
  });
  const [form] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await superAdminApi.getUsers(0, 100);
      setUsers(response.data.users || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      message.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setDrawerVisible(true);
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    form.setFieldsValue({
      full_name: user.full_name,
      email: user.email,
      role: user.role,
      status: user.status
    });
    setEditModal(true);
  };

  const handleUpdateUser = async (values) => {
    try {
      await superAdminApi.updateUser(selectedUser.id, values);
      message.success('Utilisateur mis à jour avec succès');
      setEditModal(false);
      fetchUsers();
    } catch (error) {
      message.error('Erreur lors de la mise à jour');
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await superAdminApi.deleteUser(userId);
      message.success('Utilisateur supprimé avec succès');
      fetchUsers();
    } catch (error) {
      message.error('Erreur lors de la suppression');
    }
  };

  const getFilteredUsers = () => {
    return users.filter(user => {
      if (filters.search && !user.email?.toLowerCase().includes(filters.search.toLowerCase()) &&
          !user.full_name?.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.role && user.role !== filters.role) return false;
      if (filters.status && user.status !== filters.status) return false;
      return true;
    });
  };

  const columns = [
    {
      title: 'Utilisateur',
      key: 'user',
      render: (_, record) => (
        <Space>
          <Avatar icon={<UserOutlined />} />
          <div>
            <div style={{ fontWeight: 'bold' }}>{record.full_name || record.email}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{record.email}</Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Rôle',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        const colors = {
          'super_admin': 'purple',
          'admin': 'red',
          'member': 'blue'
        };
        return <Tag color={colors[role] || 'default'}>{role}</Tag>;
      }
    },
    {
      title: 'Statut',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'active' ? 'success' : 'warning'}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Entreprise',
      key: 'company',
      render: (_, record) => record.company_name || <Text type="secondary">-</Text>
    },
    {
      title: 'Connexions',
      key: 'login',
      render: (_, record) => (
        <Tooltip title={`Dernière connexion: ${record.last_login || 'Jamais'}`}>
          <Badge status="processing" text={`${record.login_count} fois`} />
        </Tooltip>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="Voir détails">
            <Button icon={<EyeOutlined />} size="small" onClick={() => handleViewUser(record)} />
          </Tooltip>
          <Tooltip title="Modifier">
            <Button icon={<EditOutlined />} size="small" onClick={() => handleEditUser(record)} />
          </Tooltip>
          {record.role !== 'super_admin' && (
            <Tooltip title="Supprimer">
              <Popconfirm
                title="Supprimer l'utilisateur"
                description="Êtes-vous sûr de vouloir supprimer cet utilisateur ?"
                onConfirm={() => handleDeleteUser(record.id)}
                okText="Oui"
                cancelText="Non"
              >
                <Button icon={<DeleteOutlined />} size="small" danger />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  const filteredUsers = getFilteredUsers();

  return (
    <div className="superadmin-page">
      <Card
        title={
          <Space>
            <TeamOutlined />
            <span>Gestion des Utilisateurs</span>
            <Badge count={filteredUsers.length} style={{ backgroundColor: '#1890ff' }} />
          </Space>
        }
        extra={
          <Space>
            <Input
              placeholder="Rechercher..."
              prefix={<SearchOutlined />}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              style={{ width: 200 }}
              allowClear
            />
            <Select
              placeholder="Filtrer par rôle"
              value={filters.role}
              onChange={(value) => setFilters({ ...filters, role: value })}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="super_admin">Super Admin</Option>
              <Option value="admin">Admin</Option>
              <Option value="member">Membre</Option>
            </Select>
            <Select
              placeholder="Filtrer par statut"
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="active">Actif</Option>
              <Option value="inactive">Inactif</Option>
              <Option value="pending">En attente</Option>
              <Option value="suspended">Suspendu</Option>
            </Select>
            <Tooltip title="Actualiser">
              <Button icon={<ReloadOutlined />} onClick={fetchUsers} />
            </Tooltip>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={filteredUsers}
          rowKey="id"
          loading={loading}
          pagination={{
            total: filteredUsers.length,
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} utilisateurs`
          }}
        />
      </Card>

      {/* Drawer détails utilisateur */}
      <Drawer
        title="Détails de l'utilisateur"
        placement="right"
        width={600}
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
      >
        {selectedUser && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="ID">{selectedUser.id}</Descriptions.Item>
            <Descriptions.Item label="Email">{selectedUser.email}</Descriptions.Item>
            <Descriptions.Item label="Nom complet">{selectedUser.full_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Nom d'utilisateur">{selectedUser.username || '-'}</Descriptions.Item>
            <Descriptions.Item label="Rôle">
              <Tag color={selectedUser.role === 'super_admin' ? 'purple' : selectedUser.role === 'admin' ? 'red' : 'blue'}>
                {selectedUser.role}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Statut">
              <Tag color={selectedUser.status === 'active' ? 'success' : 'warning'}>
                {selectedUser.status}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Email vérifié">
              {selectedUser.email_verified ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#f5222d' }} />}
            </Descriptions.Item>
            <Descriptions.Item label="Entreprise">{selectedUser.company_name || '-'}</Descriptions.Item>
            <Descriptions.Item label="ID Entreprise">{selectedUser.company_id || '-'}</Descriptions.Item>
            <Descriptions.Item label="Dernière connexion">{selectedUser.last_login || 'Jamais'}</Descriptions.Item>
            <Descriptions.Item label="Nombre de connexions">{selectedUser.login_count}</Descriptions.Item>
            <Descriptions.Item label="Date de création">{new Date(selectedUser.created_at).toLocaleString()}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      {/* Modal édition utilisateur */}
      <Modal
        title="Modifier l'utilisateur"
        open={editModal}
        onCancel={() => setEditModal(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpdateUser}
        >
          <Form.Item
            name="full_name"
            label="Nom complet"
          >
            <Input prefix={<UserOutlined />} />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ type: 'email', message: 'Email invalide' }]}
          >
            <Input prefix={<MailOutlined />} />
          </Form.Item>
          <Form.Item
            name="role"
            label="Rôle"
          >
            <Select>
              <Option value="super_admin">Super Admin</Option>
              <Option value="admin">Admin</Option>
              <Option value="member">Membre</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="status"
            label="Statut"
          >
            <Select>
              <Option value="active">Actif</Option>
              <Option value="inactive">Inactif</Option>
              <Option value="pending">En attente</Option>
              <Option value="suspended">Suspendu</Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setEditModal(false)}>Annuler</Button>
              <Button type="primary" htmlType="submit">
                Mettre à jour
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UsersManagement;