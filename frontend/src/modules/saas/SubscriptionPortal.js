import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Typography, Button, Tag, 
  List, Divider, Table, Badge, Modal, message, 
  Result, Space, Progress, Skeleton, Alert as AntAlert,
  Tooltip, Steps, Statistic, Timeline, Descriptions
} from 'antd';
import { 
  CrownOutlined, CheckCircleOutlined, 
  FilePdfOutlined, CreditCardOutlined, 
  HistoryOutlined, RocketOutlined,
  ThunderboltOutlined, SecurityScanOutlined,
  GiftOutlined, StarOutlined, 
  TeamOutlined, DatabaseOutlined,
  CloudOutlined, BulbOutlined,
  ExperimentOutlined, DollarOutlined,
  ClockCircleOutlined, ArrowRightOutlined
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import api from '../../services/api';
import './SubscriptionPortal.css';

const { Title, Text, Paragraph } = Typography;

const SubscriptionPortal = () => {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [plans, setPlans] = useState([]);
  const [showPlans, setShowPlans] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  // Packs par défaut (fallback si API non disponible)
  const defaultPlans = [
    {
      id: 1,
      code: 'essential',
      name: 'Essential',
      price: 29,
      original_price: 49,
      discount: 40,
      users: 5,
      storage: 10,
      features: [
        'Jusqu\'à 5 utilisateurs',
        'Ventes & Achats',
        'CRM de base',
        'Comptabilité simple',
        'Gestion de stock',
        'Rapports standards',
        'API limitée (500 req/jour)'
      ],
      badge: 'POPULAIRE',
      badgeColor: 'blue',
      trial: 7,
      recommended: false
    },
    {
      id: 2,
      code: 'business',
      name: 'Business',
      price: 59,
      original_price: 99,
      discount: 40,
      users: 20,
      storage: 50,
      features: [
        'Jusqu\'à 20 utilisateurs',
        'Toutes fonctionnalités Essential',
        'RH & Paie',
        'Support prioritaire 24/7',
        'API illimitée',
        'Rapports avancés',
        'Workflows personnalisés'
      ],
      badge: 'RECOMMANDÉ',
      badgeColor: 'gold',
      trial: 7,
      recommended: true
    },
    {
      id: 3,
      code: 'enterprise',
      name: 'Enterprise',
      price: 149,
      original_price: 299,
      discount: 50,
      users: 999,
      storage: 500,
      features: [
        'Utilisateurs illimités',
        'Toutes fonctionnalités Business',
        'BI avancée & Analytics',
        'Hébergement dédié',
        'SLA 99.9%',
        'Support dédié',
        'Formation incluse',
        'Audit sécurité annuel'
      ],
      badge: 'PREMIUM',
      badgeColor: 'purple',
      trial: 14,
      recommended: false
    }
  ];

  const fetchSubscription = async () => {
    try {
      const res = await api.get('/saas/my-subscription');
      setSubscription(res.data);
    } catch (e) {
      console.error(e);
      // Données de démonstration si API non disponible
      setSubscription({
        tier: 'business',
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        users_used: 8,
        users_limit: 20,
        storage_used: 12.5,
        storage_limit: 50,
        reports_used: 45,
        reports_limit: 500,
        features: [
          'Accès IA avancée',
          'Rapports personnalisés',
          'Cloud Sync temps réel',
          'Support prioritaire 24/7',
          'API illimitée'
        ],
        payment_history: [
          { id: 1, created_at: new Date().toISOString(), amount: 59, status: 'paid' },
          { id: 2, created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), amount: 59, status: 'paid' }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await api.get('/saas/plans');
      setPlans(res.data);
    } catch (e) {
      console.error(e);
      setPlans(defaultPlans);
    }
  };

  useEffect(() => {
    fetchSubscription();
    fetchPlans();
  }, []);

  const handleSubscribe = (plan) => {
    Modal.confirm({
      title: `Confirmation d'abonnement`,
      content: (
        <div>
          <p>Souhaitez-vous souscrire au pack <strong>{plan.name}</strong> ?</p>
          <p style={{ color: '#000000' }}>🎁 {plan.trial} jours d'essai gratuit inclus !</p>
          <p>Prix après essai: <strong>{plan.price}€/mois</strong></p>
          <small>Une intention de paiement sera créée. Après validation, votre pack sera activé.</small>
        </div>
      ),
      okText: 'Confirmer',
      cancelText: 'Annuler',
      onOk: async () => {
        setCheckoutLoading(true);
        try {
          const res = await api.post(`/saas/subscribe?plan_code=${plan.code}`);
          message.success(`Pack ${plan.name} activé avec succès ! ${plan.trial} jours d'essai gratuit.`);
          setShowPlans(false);
          fetchSubscription();
        } catch (e) {
          message.error('Erreur lors de la souscription');
        } finally {
          setCheckoutLoading(false);
        }
      }
    });
  };

  const handleInvoiceClick = (invoice) => {
    setSelectedInvoice(invoice);
    setInvoiceModalVisible(true);
  };

  const getRemainingDays = () => {
    if (!subscription?.expires) return 0;
    const diff = new Date(subscription.expires) - new Date();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const remainingDays = getRemainingDays();
  const isExpiringSoon = remainingDays > 0 && remainingDays <= 7;

  if (loading) return (
    <div style={{ padding: 50, background: '#f8f9fa', minHeight: '100vh' }}>
      <Skeleton active avatar paragraph={{ rows: 8 }} />
    </div>
  );

  return (
    <div className="subscription-portal-container" style={{ padding: 24, background: '#f8f9fa', minHeight: '100vh' }}>
      
      {/* En-tête */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Title level={2} style={{ margin: 0, color: '#000000' }}>
              <CrownOutlined style={{ color: '#f5a623', marginRight: 12 }} />
              Mon Abonnement SaaS
            </Title>
            <Text style={{ color: '#000000' }}>Gérez votre pack Nexum ERP, consultez vos factures et optimisez vos ressources IA.</Text>
          </div>
          <Tooltip title="Changer de pack">
            <Button 
              type="primary" 
              icon={<RocketOutlined />} 
              onClick={() => setShowPlans(true)}
              style={{ background: '#2d6a4f', border: 'none', borderRadius: 12, height: 44 }}
            >
              Changer de pack
            </Button>
          </Tooltip>
        </div>
      </motion.div>

      <Row gutter={[24, 24]}>
        {/* CARTE PACK ACTUEL */}
        <Col xs={24} lg={16}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <Card 
              className="current-plan-card"
              style={{ 
                background: 'linear-gradient(135deg, #1b4332 0%, #2d6a4f 100%)',
                borderRadius: 24,
                overflow: 'hidden',
                border: 'none',
                boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
              }}
              bodyStyle={{ padding: '28px' }}
            >
              <Row align="middle" justify="space-between" style={{ marginBottom: 20 }}>
                <Col>
                  {subscription?.grace_period_until ? (
                    <Tag color="red" style={{ marginBottom: 12, fontWeight: 'bold', borderRadius: 12, padding: '4px 12px', color: '#fff' }}>
                      🚨 Période de grâce - Suspension imminente
                    </Tag>
                  ) : (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Tag color="gold" style={{ borderRadius: 12, padding: '4px 12px', fontWeight: 600, color: '#fff' }}>PACK ACTUEL</Tag>
                      {isExpiringSoon && (
                        <Tag color="orange" style={{ borderRadius: 12, padding: '4px 12px', color: '#fff' }}>
                          <ClockCircleOutlined /> Expire dans {remainingDays} jours
                        </Tag>
                      )}
                    </div>
                  )}
                  <Title level={1} style={{ color: '#ffffff', margin: '16px 0 8px 0' }}>
                    Pack {subscription?.tier?.toUpperCase() || 'Essential'}
                  </Title>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
                    {subscription?.grace_period_until ? 
                      `Suspendu le : ${new Date(subscription.grace_period_until).toLocaleDateString()}` : 
                      `Expire le : ${subscription?.expires ? new Date(subscription.expires).toLocaleDateString('fr-FR') : 'N/A'}`
                    }
                  </Text>
                </Col>
              </Row>
              
              <Divider style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '20px 0' }} />
              
              <Row gutter={[24, 24]}>
                <Col xs={24} sm={8}>
                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>Utilisateurs</Text>
                    <div style={{ fontSize: 28, fontWeight: 'bold', color: '#ffffff', margin: '8px 0' }}>
                      {subscription?.users_used || 0} / {subscription?.users_limit || 5}
                    </div>
                    <Progress 
                      percent={Math.round(((subscription?.users_used || 0) / (subscription?.users_limit || 5)) * 100)} 
                      size="small" 
                      showInfo={false} 
                      strokeColor="#52c41a"
                      trailColor="rgba(255,255,255,0.2)"
                    />
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>Stockage IA</Text>
                    <div style={{ fontSize: 28, fontWeight: 'bold', color: '#ffffff', margin: '8px 0' }}>
                      {subscription?.storage_used || 0} / {subscription?.storage_limit || 10} Go
                    </div>
                    <Progress 
                      percent={Math.round(((subscription?.storage_used || 0) / (subscription?.storage_limit || 10)) * 100)} 
                      size="small" 
                      showInfo={false} 
                      strokeColor="#1890ff"
                      trailColor="rgba(255,255,255,0.2)"
                    />
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ textAlign: 'center' }}>
                    <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13 }}>Rapports mensuels</Text>
                    <div style={{ fontSize: 28, fontWeight: 'bold', color: '#ffffff', margin: '8px 0' }}>
                      {subscription?.reports_used || 0} / {subscription?.reports_limit || 100}
                    </div>
                    <Progress 
                      percent={Math.round(((subscription?.reports_used || 0) / (subscription?.reports_limit || 100)) * 100)} 
                      size="small" 
                      showInfo={false} 
                      strokeColor="#faad14"
                      trailColor="rgba(255,255,255,0.2)"
                    />
                  </div>
                </Col>
              </Row>
            </Card>
          </motion.div>

          {/* Historique des factures */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <Card 
              title={<Space><HistoryOutlined style={{ color: '#2d6a4f' }} /><span style={{ color: '#000000' }}>Historique des Factures</span></Space>}
              style={{ marginTop: 24, borderRadius: 20, border: '1px solid #e9ecef', background: '#ffffff' }}
              headStyle={{ borderBottom: '1px solid #e9ecef', color: '#000000' }}
            >
              <Table 
                dataSource={subscription?.payment_history || []}
                rowKey="id"
                pagination={{ pageSize: 5 }}
                className="invoice-table"
                columns={[
                  { title: <span style={{ color: '#000000' }}>Date</span>, dataIndex: 'created_at', key: 'date', render: (d) => <span style={{ color: '#000000' }}>{new Date(d).toLocaleDateString('fr-FR')}</span> },
                  { title: <span style={{ color: '#000000' }}>Montant</span>, dataIndex: 'amount', key: 'amount', render: (a) => <strong style={{ color: '#2d6a4f' }}>{a}€ HT</strong> },
                  { title: <span style={{ color: '#000000' }}>Statut</span>, dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'paid' ? 'success' : 'warning'} style={{ borderRadius: 12, color: '#fff' }}>{s === 'paid' ? 'Payée' : 'En attente'}</Tag> },
                  { 
                    title: <span style={{ color: '#000000' }}>Facture</span>, 
                    key: 'action', 
                    render: (_, record) => (
                      record.status === 'paid' ? 
                      <Button icon={<FilePdfOutlined />} size="small" type="link" style={{ color: '#2d6a4f' }} onClick={() => handleInvoiceClick(record)}>
                        Télécharger
                      </Button> :
                      <Text style={{ color: '#666' }}>En attente</Text>
                    )
                  }
                ]}
              />
            </Card>
          </motion.div>
        </Col>

        {/* Sidebar Avantages */}
        <Col xs={24} lg={8}>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
            <Card 
              title={<Space><StarOutlined style={{ color: '#f5a623' }} /><span style={{ color: '#000000' }}>Avantages de votre pack</span></Space>}
              style={{ borderRadius: 20, border: '1px solid #e9ecef', background: '#ffffff', height: 'auto' }}
              headStyle={{ borderBottom: '1px solid #e9ecef', color: '#000000' }}
            >
              <List
                dataSource={subscription?.features || [
                  "Accès IA Standard",
                  "Rapports PDF",
                  "Cloud Sync",
                  "Support email"
                ]}
                renderItem={item => (
                  <List.Item style={{ borderBottom: '1px solid #f0f0f0', padding: '12px 0' }}>
                    <Space><CheckCircleOutlined style={{ color: '#52c41a' }} /> <span style={{ color: '#000000' }}>{item}</span></Space>
                  </List.Item>
                )}
              />
              <Divider />
              <AntAlert
                message={<span style={{ color: '#000000' }}>Support & Assistance</span>}
                description={<span style={{ color: '#000000' }}>Une question sur votre facturation ? Notre équipe support est disponible 24/7.</span>}
                type="info"
                showIcon
                icon={<ThunderboltOutlined />}
                style={{ borderRadius: 12 }}
              />
              <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 12 }}>
                <Space>
                  <SecurityScanOutlined style={{ color: '#2d6a4f' }} />
                  <Text style={{ fontSize: 12, color: '#000000' }}>Données sécurisées et hébergées en France</Text>
                </Space>
              </div>
            </Card>
          </motion.div>
        </Col>
      </Row>

      {/* MODAL DES PLANS */}
      <Modal
        title={
          <Space>
            <RocketOutlined style={{ color: '#2d6a4f' }} />
            <span style={{ color: '#000000', fontSize: 20, fontWeight: 600 }}>Choisissez votre pack Nexum</span>
          </Space>
        }
        open={showPlans}
        onCancel={() => setShowPlans(false)}
        width={1100}
        footer={null}
        styles={{ body: { padding: '24px', background: '#f8f9fa' } }}
      >
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <Tag color="gold" style={{ borderRadius: 12, padding: '4px 16px', color: '#fff' }}>🎁 7 jours gratuits sur tous les packs</Tag>
          <Text style={{ display: 'block', marginTop: 12, color: '#000000' }}>Sans engagement - Résiliation possible à tout moment</Text>
        </div>

        <Row gutter={[24, 24]}>
          {plans.map((plan, index) => (
            <Col xs={24} md={8} key={plan.id}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card 
                  className={`plan-card ${subscription?.tier === plan.code ? 'active-plan' : ''}`}
                  hoverable
                  style={{ 
                    textAlign: 'center',
                    border: subscription?.tier === plan.code ? '2px solid #2d6a4f' : '1px solid #e9ecef',
                    borderRadius: 20,
                    position: 'relative',
                    overflow: 'hidden',
                    background: '#ffffff',
                    boxShadow: subscription?.tier === plan.code ? '0 8px 25px rgba(45, 106, 79, 0.15)' : '0 2px 8px rgba(0,0,0,0.05)'
                  }}
                >
                  {plan.recommended && (
                    <div style={{
                      position: 'absolute',
                      top: 12,
                      right: -30,
                      background: '#2d6a4f',
                      color: 'white',
                      padding: '4px 30px',
                      fontSize: 12,
                      fontWeight: 'bold',
                      transform: 'rotate(45deg)'
                    }}>
                      RECOMMANDÉ
                    </div>
                  )}
                  
                  <div style={{ marginBottom: 16 }}>
                    <Tag color={plan.badgeColor} style={{ borderRadius: 12, marginBottom: 12, color: '#fff' }}>
                      {plan.badge}
                    </Tag>
                    <Title level={3} style={{ margin: 0, color: '#000000' }}>{plan.name}</Title>
                    <Text style={{ color: '#666' }}>Solution ERP {plan.name === 'Essential' ? 'essentielle' : plan.name === 'Business' ? 'complète' : 'sur mesure'}</Text>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 36, fontWeight: 'bold', color: '#2d6a4f' }}>
                      {plan.price}€
                      <small style={{ fontSize: 14, fontWeight: 'normal', color: '#666' }}>/mois</small>
                    </div>
                    {plan.original_price && (
                      <div style={{ textDecoration: 'line-through', color: '#999', fontSize: 14 }}>
                        {plan.original_price}€
                      </div>
                    )}
                    <Tag color="green" style={{ marginTop: 8, borderRadius: 12, color: '#fff' }}>Économisez {plan.discount}%</Tag>
                  </div>

                  <Divider style={{ margin: '16px 0' }} />

                  <div style={{ marginBottom: 16 }}>
                    <Space direction="vertical" size={4}>
                      <div style={{ color: '#000000' }}><TeamOutlined style={{ color: '#2d6a4f', marginRight: 8 }} /> Jusqu'à {plan.users} utilisateurs</div>
                      <div style={{ color: '#000000' }}><DatabaseOutlined style={{ color: '#2d6a4f', marginRight: 8 }} /> {plan.storage} Go stockage</div>
                      <div style={{ color: '#000000' }}><GiftOutlined style={{ color: '#f5a623', marginRight: 8 }} /> {plan.trial} jours d'essai</div>
                    </Space>
                  </div>

                  <List
                    size="small"
                    dataSource={plan.features.slice(0, 6)}
                    renderItem={f => (
                      <div style={{ padding: '6px 0', textAlign: 'left' }}>
                        <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8, fontSize: 12 }} />
                        <span style={{ fontSize: 13, color: '#000000' }}>{f}</span>
                      </div>
                    )}
                  />

                  {plan.features.length > 6 && (
                    <div style={{ marginTop: 8, textAlign: 'left' }}>
                      <Text style={{ fontSize: 12, color: '#666' }}>+ {plan.features.length - 6} fonctionnalités exclusives</Text>
                    </div>
                  )}

                  <Button 
                    type={subscription?.tier === plan.code ? 'default' : 'primary'}
                    block 
                    size="large" 
                    disabled={subscription?.tier === plan.code}
                    onClick={() => handleSubscribe(plan)}
                    style={{ 
                      marginTop: 24,
                      borderRadius: 12,
                      height: 44,
                      background: subscription?.tier === plan.code ? undefined : '#2d6a4f',
                      border: subscription?.tier === plan.code ? '1px solid #2d6a4f' : 'none',
                      color: subscription?.tier === plan.code ? '#2d6a4f' : '#ffffff',
                      fontWeight: 600
                    }}
                  >
                    {subscription?.tier === plan.code ? 'Pack Actuel' : 'Commencer l\'essai gratuit'}
                  </Button>
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>

        <Divider style={{ margin: '24px 0 16px' }} />

        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <Text style={{ color: '#000000' }}>
            <DollarOutlined style={{ marginRight: 8 }} />
            Paiement sécurisé • Sans engagement • Support inclus 24/7
          </Text>
        </div>
      </Modal>

      {/* MODAL FACTURE */}
      <Modal
        title={<Space><FilePdfOutlined /><span style={{ color: '#000000' }}>Détails de la facture</span></Space>}
        open={invoiceModalVisible}
        onCancel={() => setInvoiceModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setInvoiceModalVisible(false)}>Fermer</Button>,
          <Button key="download" type="primary" icon={<FilePdfOutlined />} style={{ background: '#2d6a4f' }}>Télécharger PDF</Button>
        ]}
        width={600}
      >
        {selectedInvoice && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label={<span style={{ color: '#000000' }}>Numéro facture</span>}><span style={{ color: '#000000' }}>FACT-{selectedInvoice.id}-{new Date(selectedInvoice.created_at).getFullYear()}</span></Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#000000' }}>Date</span>}><span style={{ color: '#000000' }}>{new Date(selectedInvoice.created_at).toLocaleDateString('fr-FR')}</span></Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#000000' }}>Montant HT</span>}><span style={{ color: '#000000' }}>{selectedInvoice.amount} €</span></Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#000000' }}>TVA (20%)</span>}><span style={{ color: '#000000' }}>{(selectedInvoice.amount * 0.2).toFixed(2)} €</span></Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#000000' }}>Montant TTC</span>}><strong style={{ color: '#2d6a4f' }}>{(selectedInvoice.amount * 1.2).toFixed(2)} €</strong></Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#000000' }}>Statut</span>}><Tag color="success" style={{ color: '#fff' }}>Payée</Tag></Descriptions.Item>
            <Descriptions.Item label={<span style={{ color: '#000000' }}>Moyen de paiement</span>}><span style={{ color: '#000000' }}>Carte bancaire / Virement</span></Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <style>{`
        .subscription-portal-container .ant-table-thead > tr > th {
          background: #f8f9fa !important;
          color: #000000 !important;
          font-weight: 600 !important;
        }
        .subscription-portal-container .ant-table-tbody > tr > td {
          color: #000000 !important;
        }
        .subscription-portal-container .ant-card-head-title {
          color: #000000 !important;
        }
        .plan-card {
          transition: all 0.3s ease;
        }
        .plan-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.15);
        }
        .active-plan {
          border: 2px solid #2d6a4f !important;
          box-shadow: 0 8px 25px rgba(45, 106, 79, 0.2);
        }
        .invoice-table .ant-table {
          border-radius: 12px;
          overflow: hidden;
        }
        .ant-modal-title {
          color: #000000 !important;
        }
        .ant-descriptions-item-label {
          color: #000000 !important;
        }
        .ant-descriptions-item-content {
          color: #000000 !important;
        }
        .ant-typography {
          color: #000000 !important;
        }
        .ant-statistic-title {
          color: #000000 !important;
        }
        .ant-statistic-content {
          color: #000000 !important;
        }
      `}</style>
    </div>
  );
};

export default SubscriptionPortal;