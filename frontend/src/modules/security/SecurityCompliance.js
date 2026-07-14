import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Typography, List, Badge, 
  Tag, Table, Progress, Statistic, Tabs, Alert, Button, Modal, Descriptions, Space, Empty, Spin
} from 'antd';
import { 
  SafetyCertificateOutlined, SafetyOutlined, 
  LockOutlined, AuditOutlined, CloudServerOutlined,
  FileProtectOutlined, CheckCircleOutlined, SyncOutlined,
  CloseOutlined, ReloadOutlined, EyeOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const { Title, Text } = Typography;

const SecurityCompliance = () => {
  const [complianceScore, setComplianceScore] = useState(0);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [checklistLoading, setChecklistLoading] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedControl, setSelectedControl] = useState(null);
  const [checklistData, setChecklistData] = useState([]);
  const [stats, setStats] = useState({
    totalControls: 0,
    compliant: 0,
    warning: 0,
    nonCompliant: 0
  });
  const [dataLakeStatus, setDataLakeStatus] = useState({
    buckets: [],
    totalStorage: 0,
    encryption: 'active'
  });

  // Fonction pour récupérer les logs d'audit
  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/security/audit-logs');
      if (res.data && Array.isArray(res.data)) {
        setAuditLogs(res.data);
      } else {
        setAuditLogs([]);
      }
    } catch (err) {
      console.error('Erreur lors du chargement des logs:', err);
      setAuditLogs([]);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour récupérer la checklist ISO
  const fetchChecklist = async () => {
    try {
      setChecklistLoading(true);
      const res = await api.get('/security/iso-checklist');
      if (res.data && Array.isArray(res.data)) {
        setChecklistData(res.data);
        // Calculer les stats
        const compliant = res.data.filter(item => item.status === 'compliant').length;
        const warning = res.data.filter(item => item.status === 'warning').length;
        const nonCompliant = res.data.filter(item => item.status === 'non-compliant').length;
        setStats({
          totalControls: res.data.length,
          compliant,
          warning,
          nonCompliant
        });
        // Calculer le score de conformité
        if (res.data.length > 0) {
          const score = Math.round((compliant / res.data.length) * 100);
          setComplianceScore(score);
        }
      } else {
        setChecklistData([]);
        setComplianceScore(0);
      }
    } catch (err) {
      console.error('Erreur lors du chargement de la checklist:', err);
      setChecklistData([]);
      setComplianceScore(0);
    } finally {
      setChecklistLoading(false);
    }
  };

  // Fonction pour récupérer le statut du Data Lake
  const fetchDataLakeStatus = async () => {
    try {
      const res = await api.get('/security/data-lake-status');
      if (res.data) {
        setDataLakeStatus({
          buckets: res.data.buckets || [],
          totalStorage: res.data.totalStorage || 0,
          encryption: res.data.encryption || 'active'
        });
      }
    } catch (err) {
      console.error('Erreur lors du chargement du status Data Lake:', err);
    }
  };

  // Fonction pour tout rafraîchir
  const refreshAll = async () => {
    await Promise.all([
      fetchAuditLogs(),
      fetchChecklist(),
      fetchDataLakeStatus()
    ]);
  };

  // Effet pour charger les données au montage
  useEffect(() => {
    refreshAll();
  }, []);

  const generateAuditReport = () => {
    try {
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(45, 106, 79);
      doc.text('NEXUM ERP - RAPPORT D\'AUDIT ISO 27001', 14, 22);
      
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.text(`Généré le : ${new Date().toLocaleString()}`, 14, 30);
      doc.text(`Score de conformité : ${complianceScore}%`, 14, 35);
      
      // Checklist Table
      if (checklistData.length > 0) {
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text('1. Checklist de Contrôle ISO', 14, 50);
        
        const tableColumn = ["Contrôle", "Statut", "Dernier Audit"];
        const tableRows = checklistData.map(item => [
          item.control,
          item.status === 'compliant' ? 'CONFORME' : item.status === 'warning' ? 'EN RÉVISION' : 'NON CONFORME',
          item.lastAudit || 'N/A'
        ]);
        
        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 55,
          theme: 'grid',
          headStyles: { fillColor: [45, 106, 79] }
        });
      }
      
      // Audit Logs
      const finalY = doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 70;
      doc.text('2. Journaux d\'Audit Récents', 14, finalY);
      
      const logRows = auditLogs.slice(0, 10).map(log => [
        log.event || 'N/A',
        log.user || 'N/A',
        (log.status || 'info').toUpperCase(),
        log.ip || 'N/A',
        log.timestamp ? new Date(log.timestamp).toLocaleString() : 'N/A'
      ]);
      
      if (logRows.length > 0) {
        autoTable(doc, {
          head: [["Événement", "Utilisateur", "Statut", "IP", "Date"]],
          body: logRows,
          startY: finalY + 5,
          theme: 'striped'
        });
      } else {
        doc.text('Aucun journal d\'audit disponible', 14, finalY + 10);
      }
      
      doc.save(`Audit_ISO27001_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
    }
  };

  // Fonction pour afficher les détails
  const showDetails = (record) => {
    setSelectedControl(record);
    setDetailsModalVisible(true);
  };

  // Columns pour le tableau
  const checklistColumns = [
    { 
      title: <span style={{ color: '#000000' }}>Contrôle ISO</span>, 
      dataIndex: 'control', 
      key: 'control',
      render: (text) => <span style={{ color: '#000000' }}>{text}</span>
    },
    { 
      title: <span style={{ color: '#000000' }}>Statut</span>, 
      dataIndex: 'status', 
      key: 'status',
      render: (status) => {
        const statusMap = {
          'compliant': { color: 'green', text: 'CONFORME' },
          'warning': { color: 'gold', text: 'EN RÉVISION' },
          'non-compliant': { color: 'red', text: 'NON CONFORME' }
        };
        const statusInfo = statusMap[status] || { color: 'default', text: status.toUpperCase() };
        return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
      }
    },
    { 
      title: <span style={{ color: '#000000' }}>Dernier Audit</span>, 
      dataIndex: 'lastAudit', 
      key: 'lastAudit',
      render: (text) => <span style={{ color: '#000000' }}>{text || 'N/A'}</span>
    },
    { 
      title: <span style={{ color: '#000000' }}>Action</span>, 
      key: 'action',
      render: (_, record) => (
        <Button 
          type="link" 
          icon={<EyeOutlined />}
          style={{ color: '#2d6a4f' }} 
          onClick={() => showDetails(record)}
        >
          Détails
        </Button>
      )
    }
  ];

  return (
    <div style={{ 
      padding: '24px', 
      background: '#f8f9fa', 
      minHeight: '100vh' 
    }}>
      {/* En-tête */}
      <div style={{ 
        marginBottom: '24px', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <Title level={2} style={{ margin: 0, color: '#000000' }}>
            <SafetyCertificateOutlined style={{ color: '#2d6a4f', marginRight: '12px' }} />
            Centre de Conformité ISO 27001
          </Title>
          <Text style={{ color: '#000000' }}>Monitorage en temps réel des standards de sécurité Nexum AI</Text>
        </div>
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={refreshAll}
            loading={loading || checklistLoading}
            style={{ color: '#000000', borderColor: '#e9ecef' }}
          >
            Rafraîchir
          </Button>
          <Button 
            type="primary" 
            icon={<FileProtectOutlined />} 
            onClick={generateAuditReport}
            disabled={checklistData.length === 0}
            style={{ background: '#2d6a4f', border: 'none' }}
          >
            Exporter Rapport PDF
          </Button>
        </Space>
      </div>

      {/* Ligne 1 - Score et Alert */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={8}>
          <Card 
            variant="borderless" 
            style={{ 
              borderRadius: 16, 
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              height: '100%'
            }}
          >
            <Statistic
              title={<span style={{ color: '#000000' }}>Score de Conformité Global</span>}
              value={complianceScore}
              precision={1}
              suffix="%"
              valueStyle={{ color: '#000000', fontWeight: 700, fontSize: '32px' }}
              prefix={<SafetyOutlined style={{ color: '#2d6a4f' }} />}
            />
            <Progress 
              percent={complianceScore} 
              strokeColor={{ '0%': '#2d6a4f', '100%': '#40916c' }}
              status="active" 
              style={{ marginTop: '20px' }}
            />
            <div style={{ marginTop: '20px' }}>
              <div style={{ marginBottom: '8px' }}>
                <Badge status={dataLakeStatus.encryption === 'active' ? 'processing' : 'error'} 
                       text={<span style={{ color: '#000000' }}>
                         Cryptage {dataLakeStatus.encryption === 'active' ? 'AES-256 Actif' : 'Désactivé'}
                       </span>} 
                />
              </div>
              <div style={{ marginBottom: '8px' }}>
                <Badge status={dataLakeStatus.buckets.length > 0 ? 'processing' : 'default'} 
                       text={<span style={{ color: '#000000' }}>
                         Isolation Multi-Tenant {dataLakeStatus.buckets.length > 0 ? 'OK' : 'Non configurée'}
                       </span>} 
                />
              </div>
              <div>
                <Badge status="processing" text={<span style={{ color: '#000000' }}>Audit Blockchain Synchronisé</span>} />
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Alert
            message={<span style={{ color: '#000000' }}>Conformité ISO 27001</span>}
            description={<span style={{ color: '#000000' }}>Le système Neura ERP utilise une traçabilité blockchain pour assurer l'intégrité des données selon la norme ISO 27001:2022.</span>}
            type="success"
            showIcon
            icon={<FileProtectOutlined />}
            style={{ 
              height: '100%', 
              borderRadius: 16,
              alignItems: 'center'
            }}
          />
        </Col>
      </Row>

      {/* Ligne 2 - Tabs */}
      <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
        <Col span={24}>
          <Card 
            variant="borderless" 
            style={{ 
              borderRadius: 16, 
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}
          >
            <Tabs 
              defaultActiveKey="1"
              style={{ color: '#000000' }}
              items={[
                {
                  key: '1',
                  label: <span style={{ color: '#000000' }}><AuditOutlined /> Checklist de Contrôle</span>,
                  children: (
                    <Spin spinning={checklistLoading}>
                      {checklistData.length > 0 ? (
                        <Table 
                          dataSource={checklistData} 
                          columns={checklistColumns} 
                          rowKey="key"
                          pagination={false}
                        />
                      ) : (
                        <Empty 
                          description={<span style={{ color: '#000000' }}>Aucun contrôle ISO configuré</span>}
                          style={{ padding: '40px 0' }}
                        />
                      )}
                    </Spin>
                  )
                },
                {
                  key: '2',
                  label: <span style={{ color: '#000000' }}><LockOutlined /> Journaux d'Audit</span>,
                  children: (
                    <Spin spinning={loading}>
                      {auditLogs.length > 0 ? (
                        <List
                          itemLayout="horizontal"
                          dataSource={auditLogs}
                          renderItem={item => (
                            <List.Item
                              style={{ padding: '12px 0' }}
                              actions={[
                                <Tag color={item.status === 'success' ? 'blue' : item.status === 'warning' ? 'gold' : 'red'}>
                                  {(item.status || 'INFO').toUpperCase()}
                                </Tag>
                              ]}
                            >
                              <List.Item.Meta
                                avatar={<Badge status={item.status === 'success' ? 'success' : item.status === 'warning' ? 'warning' : 'error'} />}
                                title={<span style={{ color: '#000000', fontWeight: 500 }}>{item.event || 'Événement'} - {item.user || 'Système'}</span>}
                                description={<span style={{ color: '#000000' }}>
                                  IP: {item.ip || 'N/A'} | {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'N/A'}
                                </span>}
                              />
                            </List.Item>
                          )}
                        />
                      ) : (
                        <Empty 
                          description={<span style={{ color: '#000000' }}>Aucun journal d'audit disponible</span>}
                          style={{ padding: '40px 0' }}
                        />
                      )}
                    </Spin>
                  )
                },
                {
                  key: '3',
                  label: <span style={{ color: '#000000' }}><CloudServerOutlined /> Data Lake (MinIO)</span>,
                  children: (
                    <Row gutter={[16, 16]}>
                      <Col xs={24} md={12}>
                        <Card 
                          size="small" 
                          title={<span style={{ color: '#000000' }}>État des Buckets</span>}
                          style={{ borderRadius: 12 }}
                        >
                          {dataLakeStatus.buckets.length > 0 ? (
                            <List size="small">
                              {dataLakeStatus.buckets.map((bucket, index) => (
                                <List.Item key={index}>
                                  <span style={{ color: '#000000' }}>{bucket.name}: </span>
                                  <Tag color={bucket.status === 'online' ? 'green' : 'red'}>
                                    {bucket.status?.toUpperCase() || 'UNKNOWN'}
                                  </Tag>
                                </List.Item>
                              ))}
                            </List>
                          ) : (
                            <Empty description="Aucun bucket configuré" />
                          )}
                        </Card>
                      </Col>
                      <Col xs={24} md={12}>
                        <Card 
                          size="small" 
                          title={<span style={{ color: '#000000' }}>Stockage Quantum-Resistant</span>}
                          style={{ borderRadius: 12 }}
                        >
                          <Statistic 
                            title={<span style={{ color: '#000000' }}>Données Protégées</span>} 
                            value={dataLakeStatus.totalStorage || 0} 
                            suffix="GB"
                            precision={1}
                            valueStyle={{ color: '#000000', fontWeight: 600 }}
                          />
                          <Text style={{ color: '#000000', marginTop: 8, display: 'block' }}>
                            Chiffrement à la volée via QNN Layer {dataLakeStatus.encryption === 'active' ? '✅' : '❌'}
                          </Text>
                        </Card>
                      </Col>
                    </Row>
                  )
                }
              ]}
            />
          </Card>
        </Col>
      </Row>

      {/* Modal des détails */}
      <Modal
        title={
          <span style={{ color: '#000000' }}>
            <SafetyCertificateOutlined style={{ color: '#2d6a4f', marginRight: '8px' }} />
            Détails du contrôle
          </span>
        }
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailsModalVisible(false)} style={{ color: '#000000' }}>
            Fermer
          </Button>
        ]}
        width={700}
        style={{ borderRadius: 16 }}
      >
        {selectedControl && (
          <div>
            <Descriptions bordered column={1} style={{ marginBottom: 16 }}>
              <Descriptions.Item label={<span style={{ color: '#000000', fontWeight: 600 }}>Contrôle</span>}>
                <span style={{ color: '#000000' }}>{selectedControl.control}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: '#000000', fontWeight: 600 }}>Statut</span>}>
                <Tag color={selectedControl.status === 'compliant' ? 'green' : selectedControl.status === 'warning' ? 'gold' : 'red'}>
                  {selectedControl.status === 'compliant' ? 'CONFORME' : selectedControl.status === 'warning' ? 'EN RÉVISION' : 'NON CONFORME'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: '#000000', fontWeight: 600 }}>Description</span>}>
                <span style={{ color: '#000000' }}>{selectedControl.description || 'Aucune description disponible'}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: '#000000', fontWeight: 600 }}>Contrôles mis en place</span>}>
                {selectedControl.controls && selectedControl.controls.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 20 }}>
                    {selectedControl.controls.map((control, index) => (
                      <li key={index} style={{ color: '#000000' }}>{control}</li>
                    ))}
                  </ul>
                ) : (
                  <span style={{ color: '#000000' }}>Aucun contrôle listé</span>
                )}
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: '#000000', fontWeight: 600 }}>Preuves d'audit</span>}>
                <span style={{ color: '#000000' }}>{selectedControl.evidence || 'Non spécifié'}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: '#000000', fontWeight: 600 }}>Dernier audit</span>}>
                <span style={{ color: '#000000' }}>{selectedControl.lastAudit || 'N/A'}</span>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ color: '#000000', fontWeight: 600 }}>Prochain audit</span>}>
                <span style={{ color: '#000000' }}>{selectedControl.nextAudit || 'N/A'}</span>
              </Descriptions.Item>
              {selectedControl.actionRequired && (
                <Descriptions.Item label={<span style={{ color: '#000000', fontWeight: 600 }}>Action requise</span>}>
                  <span style={{ color: '#e74c3c' }}>{selectedControl.actionRequired}</span>
                </Descriptions.Item>
              )}
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SecurityCompliance;