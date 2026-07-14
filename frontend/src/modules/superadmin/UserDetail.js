import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Space, Button, Spin,
  Typography, Avatar, Divider, Timeline, message
} from 'antd';
import {
  UserOutlined, MailOutlined, PhoneOutlined,
  BankOutlined, ArrowLeftOutlined, CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons';
import { superAdminApi } from '../../services/superadminApi';

const { Title, Text } = Typography;

const UserDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      const response = await superAdminApi.getUser(id);
      setUser(response.data);
    } catch (error) {
      message.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Spin size="large" />;

  return (
    <div style={{ padding: 24 }}>
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/superadmin/users')}
        style={{ marginBottom: 16 }}
      >
        Retour
      </Button>

      <Card>
        <Space align="center" style={{ marginBottom: 24 }}>
          <Avatar size={64} icon={<UserOutlined />} />
          <div>
            <Title level={3}>{user?.full_name || user?.email}</Title>
            <Tag color={user?.role === 'super_admin' ? 'purple' : user?.role === 'admin' ? 'red' : 'blue'}>
              {user?.role}
            </Tag>
          </div>
        </Space>

        <Divider />

        <Descriptions bordered column={2}>
          <Descriptions.Item label="ID">{user?.id}</Descriptions.Item>
          <Descriptions.Item label="Email">{user?.email}</Descriptions.Item>
          <Descriptions.Item label="Nom d'utilisateur">{user?.username || '-'}</Descriptions.Item>
          <Descriptions.Item label="Téléphone">{user?.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="Statut">
            <Tag color={user?.status === 'active' ? 'success' : 'warning'}>
              {user?.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Email vérifié">
            {user?.email_verified ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <CloseCircleOutlined style={{ color: '#f5222d' }} />}
          </Descriptions.Item>
          <Descriptions.Item label="Entreprise">{user?.company_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="ID Entreprise">{user?.company_id || '-'}</Descriptions.Item>
          <Descriptions.Item label="Dernière connexion">{user?.last_login ? new Date(user.last_login).toLocaleString() : 'Jamais'}</Descriptions.Item>
          <Descriptions.Item label="Nombre de connexions">{user?.login_count}</Descriptions.Item>
          <Descriptions.Item label="Date de création" span={2}>
            {user?.created_at ? new Date(user.created_at).toLocaleString() : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default UserDetail;