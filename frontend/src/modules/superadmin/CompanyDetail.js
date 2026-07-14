import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Descriptions, Tag, Space, Button, Spin,
  Typography, Avatar, Divider, Table, message
} from 'antd';
import {
  ShopOutlined, ArrowLeftOutlined, BankOutlined,
  GlobalOutlined, PhoneOutlined, MailOutlined,
  TeamOutlined
} from '@ant-design/icons';
import { superAdminApi } from '../../services/superadminApi';

const { Title, Text } = Typography;

const CompanyDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    fetchCompany();
  }, [id]);

  const fetchCompany = async () => {
    try {
      const response = await superAdminApi.getCompany(id);
      setCompany(response.data);
    } catch (error) {
      message.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getSectorColor = (sector) => {
    const colors = {
      'bank': '#1890ff',
      'insurance': '#52c41a',
      'enterprise': '#722ed1',
      'tech': '#13c2c2',
      'commerce': '#fa8c16',
      'industry': '#eb2f96'
    };
    return colors[sector] || '#8c8c8c';
  };

  if (loading) return <Spin size="large" />;

  return (
    <div style={{ padding: 24 }}>
      <Button 
        icon={<ArrowLeftOutlined />} 
        onClick={() => navigate('/superadmin/companies')}
        style={{ marginBottom: 16 }}
      >
        Retour
      </Button>

      <Card>
        <Space align="center" style={{ marginBottom: 24 }}>
          <Avatar 
            size={64} 
            icon={<ShopOutlined />} 
            style={{ backgroundColor: getSectorColor(company?.sector) }} 
          />
          <div>
            <Title level={3}>{company?.name}</Title>
            <Tag color={getSectorColor(company?.sector)}>{company?.sector}</Tag>
          </div>
        </Space>

        <Divider />

        <Descriptions bordered column={2}>
          <Descriptions.Item label="ID">{company?.id}</Descriptions.Item>
          <Descriptions.Item label="Nom légal">{company?.legal_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Secteur">{company?.sector}</Descriptions.Item>
          <Descriptions.Item label="Taille">{company?.size || '-'}</Descriptions.Item>
          <Descriptions.Item label="Ville">{company?.city || '-'}</Descriptions.Item>
          <Descriptions.Item label="Pays">{company?.country || '-'}</Descriptions.Item>
          <Descriptions.Item label="Téléphone">{company?.phone || '-'}</Descriptions.Item>
          <Descriptions.Item label="Email">{company?.email || '-'}</Descriptions.Item>
          <Descriptions.Item label="Site web">
            {company?.website ? <a href={company.website} target="_blank">{company.website}</a> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Statut">
            <Tag color={company?.is_active ? 'success' : 'error'}>
              {company?.is_active ? 'Actif' : 'Inactif'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Abonnement">{company?.subscription_tier}</Descriptions.Item>
          <Descriptions.Item label="Nombre d'utilisateurs">{company?.users_count}</Descriptions.Item>
          <Descriptions.Item label="Date création" span={2}>
            {company?.created_at ? new Date(company.created_at).toLocaleString() : '-'}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default CompanyDetail;