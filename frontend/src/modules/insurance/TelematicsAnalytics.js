import React from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Space, Progress } from 'antd';
import { 
  CarOutlined, DashboardOutlined, 
  WarningOutlined, CheckCircleOutlined
} from '@ant-design/icons';

const TelematicsAnalytics = () => {
  const telematicsStats = {
    totalVehicles: 1250,
    activeToday: 876,
    avgSpeed: 52,
    hardBraking: 234,
    speeding: 89,
    ecoScore: 78
  };

  const drivers = [
    { id: 1, name: 'Jean Dupont', vehicle: 'Renault Clio', score: 92, trips: 45, incidents: 2, status: 'safe' },
    { id: 2, name: 'Marie Laurent', vehicle: 'Peugeot 308', score: 78, trips: 38, incidents: 5, status: 'warning' },
    { id: 3, name: 'Pierre Martin', vehicle: 'Tesla Model 3', score: 98, trips: 62, incidents: 1, status: 'safe' },
  ];

  const columns = [
    { title: 'Conducteur', dataIndex: 'name', key: 'name' },
    { title: 'Véhicule', dataIndex: 'vehicle', key: 'vehicle' },
    { 
      title: 'Score', 
      dataIndex: 'score', 
      key: 'score',
      render: (score) => (
        <Progress 
          percent={score} 
          size="small" 
          status={score > 80 ? 'success' : score > 60 ? 'normal' : 'exception'}
          format={() => score}
        />
      )
    },
    { title: 'Trajets', dataIndex: 'trips', key: 'trips' },
    { title: 'Incidents', dataIndex: 'incidents', key: 'incidents' },
    { 
      title: 'Statut', 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => (
        <Tag color={status === 'safe' ? 'green' : 'orange'}>
          {status === 'safe' ? 'Sécuritaire' : 'À surveiller'}
        </Tag>
      )
    },
  ];

  // Données radar simplifiées
  const behaviorData = [
    { indicator: 'Vitesse', value: 85, max: 100 },
    { indicator: 'Freinage', value: 92, max: 100 },
    { indicator: 'Accélération', value: 78, max: 100 },
    { indicator: 'Virages', value: 88, max: 100 },
    { indicator: 'Conduite nuit', value: 65, max: 100 },
    { indicator: 'Éco-conduite', value: 82, max: 100 },
  ];

  return (
    <div className="telematics" style={{ padding: 24 }}>
      <div className="page-header">
        <h2>
          <CarOutlined style={{ color: '#1890ff', marginRight: 10 }} />
          Télématique Auto
        </h2>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic title="Véhicules suivis" value={telematicsStats.totalVehicles} prefix={<CarOutlined />} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Actifs aujourd'hui" value={telematicsStats.activeToday} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Freinages brusques" value={telematicsStats.hardBraking} valueStyle={{ color: '#fa8c16' }} />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Excès de vitesse" value={telematicsStats.speeding} valueStyle={{ color: '#f5222d' }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="Score de conduite moyen">
            <Progress 
              type="dashboard" 
              percent={telematicsStats.ecoScore} 
              format={percent => `${percent}/100`}
              strokeColor="#1890ff"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Analyse comportementale">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {behaviorData.map(item => (
                <div key={item.indicator}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span>{item.indicator}</span>
                    <span style={{ color: '#1890ff' }}>{item.value}%</span>
                  </div>
                  <Progress 
                    percent={item.value} 
                    strokeColor="#1890ff"
                    showInfo={false}
                  />
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="Classement des conducteurs" style={{ marginTop: 16 }}>
        <Table columns={columns} dataSource={drivers} />
      </Card>
    </div>
  );
};

export default TelematicsAnalytics;