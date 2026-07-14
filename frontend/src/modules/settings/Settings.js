// src/modules/settings/Settings.js
import React, { useState } from 'react';
import { 
  Card, Tabs, Form, Input, Button, Select, 
  Switch, List, Avatar, Tag, Space, message,
  Divider, InputNumber, Table, Modal, Popconfirm,
  Radio, Slider, Alert, Descriptions,
  Badge, Row, Col
} from 'antd';
import { 
  SettingOutlined, UserOutlined, LockOutlined,
  BellOutlined, GlobalOutlined, DatabaseOutlined,
  ApiOutlined, SaveOutlined,
  SunOutlined, MoonOutlined,
  PlusOutlined, DeleteOutlined, EditOutlined,
  ExperimentOutlined
} from '@ant-design/icons';

const { Option } = Select;

const Settings = () => {
  const [activeTab, setActiveTab] = useState('preferences');
  const [loading, setLoading] = useState(false);
  const [rulesForm] = Form.useForm();
  const [integrationForm] = Form.useForm();
  
  // États pour les règles métier
  const [businessRules, setBusinessRules] = useState([
    { id: 1, name: 'Détection fraude', condition: 'montant > 10000', action: 'bloquer', priority: 'high', enabled: true },
    { id: 2, name: 'Alerte transaction', condition: 'fréquence > 5/jour', action: 'alerter', priority: 'medium', enabled: true },
    { id: 3, name: 'Validation manager', condition: 'client segment = premium', action: 'valider', priority: 'low', enabled: false },
  ]);
  const [rulesModalVisible, setRulesModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  
  // États pour les intégrations
  const [integrations, setIntegrations] = useState([
    { id: 1, name: 'API Bancaire', type: 'rest', status: 'active', url: 'https://api.bank.com/v1', credentials: '••••••••' },
    { id: 2, name: 'Google Maps', type: 'rest', status: 'active', url: 'https://maps.googleapis.com/maps/api', credentials: 'AIza••••••' },
    { id: 3, name: 'CRM Externe', type: 'soap', status: 'inactive', url: 'https://crm.company.com/api', credentials: '••••••••' },
  ]);
  const [integrationModalVisible, setIntegrationModalVisible] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState(null);
  
  // Préférences utilisateur
  const [preferences, setPreferences] = useState({
    theme: 'light',
    language: 'fr',
    notifications: {
      email: true,
      security: true,
      weekly_report: false,
      fraud_alerts: true
    },
    appearance: {
      compact: false,
      fontSize: 14,
      animations: true
    }
  });

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      message.success('Paramètres sauvegardés avec succès');
      setLoading(false);
    }, 1000);
  };

  // Gestion des règles métier
  const handleAddRule = (values) => {
    if (editingRule) {
      setBusinessRules(rules => rules.map(r => 
        r.id === editingRule.id ? { ...values, id: r.id } : r
      ));
      message.success('Règle modifiée avec succès');
    } else {
      const newRule = {
        id: businessRules.length + 1,
        ...values,
        enabled: true
      };
      setBusinessRules([...businessRules, newRule]);
      message.success('Règle ajoutée avec succès');
    }
    setRulesModalVisible(false);
    setEditingRule(null);
    rulesForm.resetFields();
  };

  const handleDeleteRule = (ruleId) => {
    setBusinessRules(rules => rules.filter(r => r.id !== ruleId));
    message.success('Règle supprimée');
  };

  const toggleRuleStatus = (ruleId) => {
    setBusinessRules(rules => rules.map(r => 
      r.id === ruleId ? { ...r, enabled: !r.enabled } : r
    ));
    message.info('Statut de la règle modifié');
  };

  // Gestion des intégrations
  const handleAddIntegration = (values) => {
    if (editingIntegration) {
      setIntegrations(integrations => integrations.map(i => 
        i.id === editingIntegration.id ? { ...values, id: i.id } : i
      ));
      message.success('Intégration modifiée avec succès');
    } else {
      const newIntegration = {
        id: integrations.length + 1,
        ...values,
        status: 'inactive'
      };
      setIntegrations([...integrations, newIntegration]);
      message.success('Intégration ajoutée avec succès');
    }
    setIntegrationModalVisible(false);
    setEditingIntegration(null);
    integrationForm.resetFields();
  };

  const testIntegration = (integration) => {
    message.loading('Test de connexion...', 1);
    setTimeout(() => {
      if (integration.status === 'active') {
        message.success('Connexion réussie');
      } else {
        message.error('Échec de la connexion');
      }
    }, 1000);
  };

  const ruleColumns = [
    { title: <span style={{ color: '#000000' }}>Nom</span>, dataIndex: 'name', key: 'name', width: 150 },
    { title: <span style={{ color: '#000000' }}>Condition</span>, dataIndex: 'condition', key: 'condition' },
    { title: <span style={{ color: '#000000' }}>Action</span>, dataIndex: 'action', key: 'action', width: 100 },
    { 
      title: <span style={{ color: '#000000' }}>Priorité</span>, 
      dataIndex: 'priority', 
      key: 'priority',
      width: 100,
      render: (priority) => (
        <Tag color={priority === 'high' ? 'red' : priority === 'medium' ? 'orange' : 'blue'}>
          {priority === 'high' ? 'Haute' : priority === 'medium' ? 'Moyenne' : 'Basse'}
        </Tag>
      )
    },
    {
      title: <span style={{ color: '#000000' }}>Statut</span>,
      dataIndex: 'enabled',
      key: 'enabled',
      width: 100,
      render: (enabled, record) => (
        <Switch 
          size="small" 
          checked={enabled} 
          onChange={() => toggleRuleStatus(record.id)}
        />
      )
    },
    {
      title: <span style={{ color: '#000000' }}>Actions</span>,
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => {
              setEditingRule(record);
              rulesForm.setFieldsValue(record);
              setRulesModalVisible(true);
            }}
          />
          <Popconfirm
            title="Supprimer cette règle ?"
            onConfirm={() => handleDeleteRule(record.id)}
            okText="Oui"
            cancelText="Non"
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  const integrationColumns = [
    { title: <span style={{ color: '#000000' }}>Nom</span>, dataIndex: 'name', key: 'name' },
    { title: <span style={{ color: '#000000' }}>Type</span>, dataIndex: 'type', key: 'type', render: (t) => <Tag>{t.toUpperCase()}</Tag> },
    {
      title: <span style={{ color: '#000000' }}>Statut</span>,
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Badge 
          status={status === 'active' ? 'success' : 'error'} 
          text={<span style={{ color: '#000000' }}>{status === 'active' ? 'Actif' : 'Inactif'}</span>}
        />
      )
    },
    { title: <span style={{ color: '#000000' }}>URL</span>, dataIndex: 'url', key: 'url', ellipsis: true },
    {
      title: <span style={{ color: '#000000' }}>Actions</span>,
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<ApiOutlined />} onClick={() => testIntegration(record)}>Tester</Button>
          <Button 
            size="small" 
            icon={<EditOutlined />}
            onClick={() => {
              setEditingIntegration(record);
              integrationForm.setFieldsValue(record);
              setIntegrationModalVisible(true);
            }}
          />
          <Popconfirm
            title="Supprimer cette intégration ?"
            onConfirm={() => {
              setIntegrations(integrations.filter(i => i.id !== record.id));
              message.success('Intégration supprimée');
            }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div className="settings-module" style={{ 
      maxWidth: 1400, 
      margin: '0 auto', 
      padding: 24,
      background: '#f8f9fa',
      minHeight: '100vh'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: 24 
      }}>
        <div>
          <h1 style={{ margin: 0, color: '#000000' }}>
            <SettingOutlined style={{ marginRight: 12, color: '#2d6a4f' }} />
            Paramètres
          </h1>
          <p style={{ margin: '4px 0 0', color: '#000000' }}>
            Configurez votre système, préférences et intégrations
          </p>
        </div>
        <Button 
          type="primary" 
          icon={<SaveOutlined />}
          onClick={handleSave}
          loading={loading}
          style={{ background: '#2d6a4f', border: 'none' }}
        >
          Sauvegarder
        </Button>
      </div>

      <Card style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          style={{ color: '#000000' }}
          items={[
            {
              key: 'preferences',
              label: <span style={{ color: activeTab === 'preferences' ? '#2d6a4f' : '#000000' }}><SunOutlined /> Préférences</span>,
              children: (
                <Form layout="vertical">
                  <Alert 
                    message={<span style={{ color: '#000000' }}>Préférences utilisateur</span>}
                    description={<span style={{ color: '#000000' }}>Personnalisez l'apparence et les notifications du système</span>}
                    type="info"
                    showIcon
                    style={{ marginBottom: 24, borderRadius: 12 }}
                  />
                  
                  <Row gutter={24}>
                    <Col span={12}>
                      <Form.Item label={<span style={{ color: '#000000' }}>Thème</span>}>
                        <Radio.Group 
                          value={preferences.theme}
                          onChange={(e) => setPreferences({...preferences, theme: e.target.value})}
                        >
                          <Radio.Button value="light"><SunOutlined /> Clair</Radio.Button>
                          <Radio.Button value="dark"><MoonOutlined /> Sombre</Radio.Button>
                          <Radio.Button value="auto">Auto</Radio.Button>
                        </Radio.Group>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label={<span style={{ color: '#000000' }}>Langue</span>}>
                        <Select 
                          value={preferences.language}
                          onChange={(v) => setPreferences({...preferences, language: v})}
                          style={{ width: '100%' }}
                        >
                          <Option value="fr">Français</Option>
                          <Option value="en">English</Option>
                          <Option value="es">Español</Option>
                          <Option value="de">Deutsch</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>
                  
                  <Form.Item label={<span style={{ color: '#000000' }}>Taille de police</span>}>
                    <Slider
                      min={12}
                      max={20}
                      value={preferences.appearance.fontSize}
                      onChange={(v) => setPreferences({
                        ...preferences,
                        appearance: {...preferences.appearance, fontSize: v}
                      })}
                    />
                  </Form.Item>
                  
                  <Divider style={{ borderColor: '#e9ecef', color: '#000000' }}>Notifications</Divider>
                  
                  <List>
                    <List.Item>
                      <List.Item.Meta
                        title={<span style={{ color: '#000000' }}>Notifications email</span>}
                        description={<span style={{ color: '#000000' }}>Recevoir les notifications par email</span>}
                      />
                      <Switch 
                        checked={preferences.notifications.email}
                        onChange={(v) => setPreferences({
                          ...preferences,
                          notifications: {...preferences.notifications, email: v}
                        })}
                      />
                    </List.Item>
                    <List.Item>
                      <List.Item.Meta
                        title={<span style={{ color: '#000000' }}>Alertes de sécurité</span>}
                        description={<span style={{ color: '#000000' }}>Être alerté en cas d'activité suspecte</span>}
                      />
                      <Switch 
                        checked={preferences.notifications.security}
                        onChange={(v) => setPreferences({
                          ...preferences,
                          notifications: {...preferences.notifications, security: v}
                        })}
                      />
                    </List.Item>
                    <List.Item>
                      <List.Item.Meta
                        title={<span style={{ color: '#000000' }}>Alertes de fraude</span>}
                        description={<span style={{ color: '#000000' }}>Notifications en temps réel pour détection de fraude</span>}
                      />
                      <Switch 
                        checked={preferences.notifications.fraud_alerts}
                        onChange={(v) => setPreferences({
                          ...preferences,
                          notifications: {...preferences.notifications, fraud_alerts: v}
                        })}
                      />
                    </List.Item>
                    <List.Item>
                      <List.Item.Meta
                        title={<span style={{ color: '#000000' }}>Rapports hebdomadaires</span>}
                        description={<span style={{ color: '#000000' }}>Recevoir un rapport d'activité chaque semaine</span>}
                      />
                      <Switch 
                        checked={preferences.notifications.weekly_report}
                        onChange={(v) => setPreferences({
                          ...preferences,
                          notifications: {...preferences.notifications, weekly_report: v}
                        })}
                      />
                    </List.Item>
                  </List>
                  
                  <Divider style={{ borderColor: '#e9ecef', color: '#000000' }}>Apparence</Divider>
                  
                  <Row gutter={24}>
                    <Col span={12}>
                      <Form.Item label={<span style={{ color: '#000000' }}>Mode compact</span>}>
                        <Switch 
                          checked={preferences.appearance.compact}
                          onChange={(v) => setPreferences({
                            ...preferences,
                            appearance: {...preferences.appearance, compact: v}
                          })}
                        />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label={<span style={{ color: '#000000' }}>Animations</span>}>
                        <Switch 
                          checked={preferences.appearance.animations}
                          onChange={(v) => setPreferences({
                            ...preferences,
                            appearance: {...preferences.appearance, animations: v}
                          })}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              )
            },
            {
              key: 'business-rules',
              label: <span style={{ color: activeTab === 'business-rules' ? '#2d6a4f' : '#000000' }}><ExperimentOutlined /> Règles métier</span>,
              children: (
                <>
                  <Alert 
                    message={<span style={{ color: '#000000' }}>Règles métier</span>}
                    description={<span style={{ color: '#000000' }}>Définissez les conditions et actions pour automatiser les processus</span>}
                    type="warning"
                    showIcon
                    style={{ marginBottom: 24, borderRadius: 12 }}
                  />
                  
                  <div style={{ marginBottom: 16, textAlign: 'right' }}>
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setEditingRule(null);
                        rulesForm.resetFields();
                        setRulesModalVisible(true);
                      }}
                      style={{ background: '#2d6a4f', border: 'none' }}
                    >
                      Ajouter une règle
                    </Button>
                  </div>
                  
                  <Table 
                    columns={ruleColumns} 
                    dataSource={businessRules} 
                    rowKey="id"
                    pagination={false}
                    style={{ color: '#000000' }}
                  />
                  
                  <Modal
                    title={<span style={{ color: '#000000' }}>{editingRule ? "Modifier la règle" : "Ajouter une règle métier"}</span>}
                    open={rulesModalVisible}
                    onCancel={() => setRulesModalVisible(false)}
                    footer={null}
                    styles={{ body: { color: '#000000' } }}
                  >
                    <Form form={rulesForm} layout="vertical" onFinish={handleAddRule}>
                      <Form.Item name="name" label={<span style={{ color: '#000000' }}>Nom de la règle</span>} rules={[{ required: true }]}>
                        <Input placeholder="ex: Détection fraude" />
                      </Form.Item>
                      <Form.Item name="condition" label={<span style={{ color: '#000000' }}>Condition</span>} rules={[{ required: true }]}>
                        <Input.TextArea placeholder="ex: montant > 10000 ET client.risque = élevé" rows={3} />
                      </Form.Item>
                      <Form.Item name="action" label={<span style={{ color: '#000000' }}>Action</span>} rules={[{ required: true }]}>
                        <Select>
                          <Option value="bloquer">Bloquer la transaction</Option>
                          <Option value="alerter">Envoyer une alerte</Option>
                          <Option value="valider">Demander validation</Option>
                          <Option value="journaliser">Journaliser uniquement</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item name="priority" label={<span style={{ color: '#000000' }}>Priorité</span>} initialValue="medium">
                        <Select>
                          <Option value="high">Haute</Option>
                          <Option value="medium">Moyenne</Option>
                          <Option value="low">Basse</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" htmlType="submit" block style={{ background: '#2d6a4f', border: 'none' }}>
                          {editingRule ? "Modifier" : "Ajouter"}
                        </Button>
                      </Form.Item>
                    </Form>
                  </Modal>
                </>
              )
            },
            {
              key: 'integrations',
              label: <span style={{ color: activeTab === 'integrations' ? '#2d6a4f' : '#000000' }}><ApiOutlined /> Intégrations</span>,
              children: (
                <>
                  <Alert 
                    message={<span style={{ color: '#000000' }}>Intégrations API</span>}
                    description={<span style={{ color: '#000000' }}>Configurez les connexions avec les services externes</span>}
                    type="info"
                    showIcon
                    style={{ marginBottom: 24, borderRadius: 12 }}
                  />
                  
                  <div style={{ marginBottom: 16, textAlign: 'right' }}>
                    <Button 
                      type="primary" 
                      icon={<PlusOutlined />}
                      onClick={() => {
                        setEditingIntegration(null);
                        integrationForm.resetFields();
                        setIntegrationModalVisible(true);
                      }}
                      style={{ background: '#2d6a4f', border: 'none' }}
                    >
                      Ajouter une intégration
                    </Button>
                  </div>
                  
                  <Table 
                    columns={integrationColumns} 
                    dataSource={integrations} 
                    rowKey="id"
                    pagination={false}
                  />
                  
                  <Modal
                    title={<span style={{ color: '#000000' }}>{editingIntegration ? "Modifier l'intégration" : "Ajouter une intégration"}</span>}
                    open={integrationModalVisible}
                    onCancel={() => setIntegrationModalVisible(false)}
                    footer={null}
                    width={500}
                  >
                    <Form form={integrationForm} layout="vertical" onFinish={handleAddIntegration}>
                      <Form.Item name="name" label={<span style={{ color: '#000000' }}>Nom</span>} rules={[{ required: true }]}>
                        <Input placeholder="ex: API Bancaire" />
                      </Form.Item>
                      <Form.Item name="type" label={<span style={{ color: '#000000' }}>Type</span>} rules={[{ required: true }]}>
                        <Select>
                          <Option value="rest">REST API</Option>
                          <Option value="soap">SOAP</Option>
                          <Option value="graphql">GraphQL</Option>
                          <Option value="webhook">Webhook</Option>
                        </Select>
                      </Form.Item>
                      <Form.Item name="url" label={<span style={{ color: '#000000' }}>URL</span>} rules={[{ required: true }]}>
                        <Input placeholder="https://api.service.com/v1" />
                      </Form.Item>
                      <Form.Item name="credentials" label={<span style={{ color: '#000000' }}>Credentials / API Key</span>}>
                        <Input.Password placeholder="Clé API ou token" />
                      </Form.Item>
                      <Form.Item label={<span style={{ color: '#000000' }}>Mapping des données</span>}>
                        <Input.TextArea placeholder='{"client_id": "id", "amount": "montant"}' rows={4} />
                      </Form.Item>
                      <Form.Item>
                        <Button type="primary" htmlType="submit" block style={{ background: '#2d6a4f', border: 'none' }}>
                          {editingIntegration ? "Modifier" : "Ajouter"}
                        </Button>
                      </Form.Item>
                    </Form>
                  </Modal>
                </>
              )
            },
            {
              key: 'security',
              label: <span style={{ color: activeTab === 'security' ? '#2d6a4f' : '#000000' }}><LockOutlined /> Sécurité</span>,
              children: (
                <Form layout="vertical">
                  <Alert 
                    message={<span style={{ color: '#000000' }}>Sécurité</span>}
                    description={<span style={{ color: '#000000' }}>Configurez les paramètres de sécurité du système</span>}
                    type="warning"
                    showIcon
                    style={{ marginBottom: 24, borderRadius: 12 }}
                  />
                  
                  <Form.Item label={<span style={{ color: '#000000' }}>Authentification à deux facteurs</span>}>
                    <Switch defaultChecked />
                  </Form.Item>
                  <Form.Item label={<span style={{ color: '#000000' }}>Expiration du mot de passe (jours)</span>}>
                    <Select defaultValue="90" style={{ width: '100%' }}>
                      <Option value="30">30 jours</Option>
                      <Option value="60">60 jours</Option>
                      <Option value="90">90 jours</Option>
                      <Option value="never">Jamais</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item label={<span style={{ color: '#000000' }}>Session timeout (minutes)</span>}>
                    <InputNumber min={5} max={120} defaultValue={30} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item label={<span style={{ color: '#000000' }}>Tentatives de connexion max</span>}>
                    <InputNumber min={3} max={10} defaultValue={5} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item label={<span style={{ color: '#000000' }}>IP autorisées</span>}>
                    <Input.TextArea placeholder="192.168.1.1&#10;10.0.0.0/24" rows={3} />
                  </Form.Item>
                </Form>
              )
            },
            {
              key: 'users',
              label: <span style={{ color: activeTab === 'users' ? '#2d6a4f' : '#000000' }}><UserOutlined /> Utilisateurs</span>,
              children: (
                <>
                  <List
                    itemLayout="horizontal"
                    dataSource={[
                      { id: 1, name: 'Admin', email: 'admin@neuradecide.com', role: 'Administrateur', lastLogin: '2024-01-15' },
                      { id: 2, name: 'Alice Martin', email: 'a.martin@neuradecide.com', role: 'Manager', lastLogin: '2024-01-14' },
                      { id: 3, name: 'Bob Dupuis', email: 'b.dupuis@neuradecide.com', role: 'Utilisateur', lastLogin: '2024-01-13' },
                    ]}
                    renderItem={item => (
                      <List.Item
                        key={item.id}
                        actions={[
                          <Button key="edit" size="small" icon={<EditOutlined />}>Modifier</Button>,
                          <Button key="delete" size="small" danger icon={<DeleteOutlined />}>Désactiver</Button>
                        ]}
                      >
                        <List.Item.Meta
                          avatar={<Avatar icon={<UserOutlined />} style={{ backgroundColor: '#2d6a4f' }} />}
                          title={<span style={{ color: '#000000' }}>{item.name}</span>}
                          description={<span style={{ color: '#000000' }}>{item.email}</span>}
                        />
                        <Space>
                          <Tag color="blue">{item.role}</Tag>
                          <Tag style={{ color: '#000000' }}>Dernière connexion: {item.lastLogin}</Tag>
                        </Space>
                      </List.Item>
                    )}
                  />
                  <Button type="primary" style={{ marginTop: 16, background: '#2d6a4f', border: 'none' }} icon={<PlusOutlined />}>
                    Inviter un utilisateur
                  </Button>
                </>
              )
            },
            {
              key: 'database',
              label: <span style={{ color: activeTab === 'database' ? '#2d6a4f' : '#000000' }}><DatabaseOutlined /> Base de données</span>,
              children: (
                <>
                  <Descriptions bordered column={2} style={{ color: '#000000' }}>
                    <Descriptions.Item label={<span style={{ color: '#000000' }}>Hôte</span>}><span style={{ color: '#000000' }}>postgres</span></Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#000000' }}>Port</span>}><span style={{ color: '#000000' }}>5432</span></Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#000000' }}>Base de données</span>}><span style={{ color: '#000000' }}>erp</span></Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#000000' }}>Utilisateur</span>}><span style={{ color: '#000000' }}>odoo</span></Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#000000' }}>Taille</span>}><span style={{ color: '#000000' }}>2.3 GB</span></Descriptions.Item>
                    <Descriptions.Item label={<span style={{ color: '#000000' }}>Statut</span>}>
                      <Badge status="success" text={<span style={{ color: '#000000' }}>Connecté</span>} />
                    </Descriptions.Item>
                  </Descriptions>
                  
                  <Divider style={{ borderColor: '#e9ecef' }} />
                  
                  <Alert 
                    message={<span style={{ color: '#000000' }}>Opérations sensibles</span>}
                    description={<span style={{ color: '#000000' }}>Ces actions sont irréversibles et peuvent affecter l'intégrité des données</span>}
                    type="error"
                    showIcon
                    style={{ marginBottom: 16, borderRadius: 12 }}
                  />
                  
                  <Space>
                    <Button danger>Exporter la base</Button>
                    <Popconfirm
                      title="Confirmer la réinitialisation ?"
                      description="Cette action supprimera toutes les données. Une sauvegarde est recommandée."
                      onConfirm={() => message.warning('Fonctionnalité désactivée en démonstration')}
                    >
                      <Button danger>Réinitialiser la base</Button>
                    </Popconfirm>
                  </Space>
                </>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default Settings;