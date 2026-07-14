import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Avatar, Tabs, Form, Input,
  Button, Upload, message, Descriptions, Tag,
  Switch, List, Modal, Typography, Space, Divider,
  Select, DatePicker, Badge, Progress, Tooltip,
  Alert, Statistic, Timeline, Spin, Result, Empty,
} from 'antd';
import {
  UserOutlined, MailOutlined, PhoneOutlined,
  EnvironmentOutlined, LockOutlined, SafetyOutlined,
  EditOutlined, SaveOutlined, CameraOutlined,
  GlobalOutlined, GithubOutlined, LinkedinOutlined,
  TwitterOutlined, BankOutlined, IdcardOutlined,
  HistoryOutlined, BellOutlined, SecurityScanOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  KeyOutlined, LogoutOutlined, StarOutlined,
  TrophyOutlined, ThunderboltOutlined, LoadingOutlined,
  QrcodeOutlined, SyncOutlined, DeleteOutlined,
  PictureOutlined
} from '@ant-design/icons';
import { useAuth } from '../services/auth';
import profileApi from '../services/profileApi';
import { motion } from 'framer-motion';
import './Profile.css';

const { Title, Text } = Typography;
const { Option } = Select;
const { Password } = Input;
const { TextArea } = Input;

// ==================== COMPOSANTS RÉUTILISABLES ====================

const StatCard = ({ title, value, suffix, prefix, securityScore }) => (
  <Card className="stat-card">
    <Statistic 
      title={title} 
      value={value} 
      suffix={suffix}
      prefix={prefix}
    />
    {securityScore && (
      <Progress 
        percent={value} 
        size="small" 
        showInfo={false}
        strokeColor="#52c41a"
      />
    )}
  </Card>
);

const ProfileHeader = ({ user, editMode, avatarUrl, coverUrl, avatarUploading, coverUploading, onEditToggle, onLogout, onAvatarChange, onCoverChange, onAvatarSelect, onCoverSelect }) => (
  <motion.div className="profile-header" variants={itemVariants}>
    <div className="header-cover-container">
      <div 
        className="header-cover" 
        style={{ backgroundImage: coverUrl ? `url(${coverUrl})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
      >
        {editMode && (
          <Upload
            name="cover"
            showUploadList={false}
            customRequest={onCoverChange}
            beforeUpload={onCoverSelect}
            action={`${process.env.REACT_APP_API_URL}/profile/cover`}
            headers={{ Authorization: `Bearer ${localStorage.getItem('access_token')}` }}
          >
            <Button 
              icon={<PictureOutlined />} 
              className="cover-upload-btn"
              loading={coverUploading}
            >
              Changer la couverture
            </Button>
          </Upload>
        )}
      </div>
    </div>
    <div className="header-info">
      <div className="profile-avatar-container">
        <Badge count={editMode ? <CameraOutlined style={{ color: '#fff' }} /> : 0} offset={[-20, 100]}>
          <Avatar 
            size={140} 
            src={avatarUrl || `https://ui-avatars.com/api/?name=${user?.firstName}+${user?.lastName}&size=140&background=4158D0&color=fff`}
            className="profile-avatar"
          />
        </Badge>
      </div>
      
      {editMode && (
        <Upload
          name="avatar"
          showUploadList={false}
          customRequest={onAvatarChange}
          beforeUpload={onAvatarSelect}
          action={`${process.env.REACT_APP_API_URL}/profile/avatar`}
          headers={{ Authorization: `Bearer ${localStorage.getItem('access_token')}` }}
        >
          <Button 
            icon={<CameraOutlined />} 
            size="small"
            className="avatar-upload-btn"
            loading={avatarUploading}
          >
            Changer l'avatar
          </Button>
        </Upload>
      )}
      
      <div className="profile-title">
        <Title level={2} style={{ margin: 0 }}>
          {user?.firstName} {user?.lastName}
        </Title>
        <Text type="secondary">{user?.position} chez {user?.company}</Text>
        <div className="profile-badges">
          <Tag color="purple" icon={<StarOutlined />}>Admin</Tag>
          <Tag color="blue" icon={<ThunderboltOutlined />}>Actif</Tag>
          {user?.emailVerified && (
            <Tag color="green" icon={<CheckCircleOutlined />}>Vérifié</Tag>
          )}
        </div>
      </div>
      
      <div className="profile-actions">
        <Button 
          type="primary" 
          icon={editMode ? <CloseCircleOutlined /> : <EditOutlined />}
          onClick={onEditToggle}
        >
          {editMode ? 'Annuler' : 'Modifier profil'}
        </Button>
        <Button 
          danger 
          icon={<LogoutOutlined />}
          onClick={onLogout}
        >
          Déconnexion
        </Button>
      </div>
    </div>
  </motion.div>
);

// ==================== COMPOSANT PRINCIPAL ====================

const Profile = () => {
  // États
  const { user, updateUser, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  
  // États pour l'avatar
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  
  // États pour la couverture
  const [coverUrl, setCoverUrl] = useState(user?.cover || '');
  const [coverFile, setCoverFile] = useState(null);
  const [coverUploading, setCoverUploading] = useState(false);
  
  // Modals
  const [passwordModal, setPasswordModal] = useState(false);
  const [twoFAModal, setTwoFAModal] = useState(false);
  const [twoFASecret, setTwoFASecret] = useState('');
  const [twoFAQrCode, setTwoFAQrCode] = useState('');
  const [twoFAVerifying, setTwoFAVerifying] = useState(false);
  
  // Données
  const [activityLog, setActivityLog] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [notificationSettings, setNotificationSettings] = useState({});
  const [securitySettings, setSecuritySettings] = useState({});
  const [userStats, setUserStats] = useState({});
  
  // Forms
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [twoFAForm] = Form.useForm();

  // ==================== CHARGEMENT DES DONNÉES ====================

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        company: user.company || '',
        position: user.position || '',
        bio: user.bio || '',
        website: user.website || '',
        github: user.github || '',
        linkedin: user.linkedin || '',
        twitter: user.twitter || '',
      });
      setAvatarUrl(user.avatar || '');
      setCoverUrl(user.cover || '');
    }
  }, [user, form]);

  const loadAllData = async () => {
    setInitialLoading(true);
    try {
      const [activities, sessionsData, notifications, stats] = await Promise.all([
        profileApi.getActivity().catch(() => []),
        profileApi.getSessions().catch(() => []),
        profileApi.getNotificationSettings().catch(() => ({})),
        profileApi.getStats().catch(() => ({}))
      ]);
      
      setActivityLog(activities);
      setSessions(sessionsData);
      setNotificationSettings(notifications);
      setUserStats(stats);
    } catch (error) {
      message.error('Erreur lors du chargement des données');
      console.error('Erreur chargement:', error);
    } finally {
      setInitialLoading(false);
    }
  };

  // ==================== GESTION DU PROFIL ====================

  const handleUpdateProfile = async (values) => {
    setLoading(true);
    try {
      let avatar = avatarUrl;
      let cover = coverUrl;
      
      // 1. Upload avatar si nécessaire
      if (avatarFile) {
        avatar = await profileApi.uploadAvatar(avatarFile);
        setAvatarUrl(avatar);
        setAvatarFile(null);
      }
      
      // 2. Upload cover si nécessaire
      if (coverFile) {
        cover = await profileApi.uploadCover(coverFile);
        setCoverUrl(cover);
        setCoverFile(null);
      }
      
      // 3. Mettre à jour le profil
      const updatedProfile = await profileApi.updateProfile({
        ...values,
        avatar,
        cover
      });
      
      // 4. Mettre à jour le contexte
      updateUser(updatedProfile);
      
      message.success('Profil mis à jour avec succès');
      setEditMode(false);
      
      // 5. Recharger les stats
      const stats = await profileApi.getStats();
      setUserStats(stats);
      
    } catch (error) {
      message.error(error.response?.data?.detail || 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  // ==================== GESTION DE L'AVATAR ====================

  const handleAvatarChange = async (info) => {
    setAvatarUploading(true);
    
    try {
      if (info.file.status === 'done') {
        setAvatarUrl(info.file.response.url);
        message.success('Avatar uploadé avec succès');
      } else if (info.file.status === 'error') {
        message.error('Erreur upload avatar');
      }
    } catch (error) {
      message.error('Erreur lors de l\'upload');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleAvatarSelect = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Vous ne pouvez uploader que des images');
      return false;
    }
    
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('L\'image doit faire moins de 2MB');
      return false;
    }
    
    setAvatarFile(file);
    
    // Aperçu local
    const reader = new FileReader();
    reader.onload = (e) => {
      setAvatarUrl(e.target.result);
    };
    reader.readAsDataURL(file);
    
    return false;
  };

  // ==================== GESTION DE LA COUVERTURE ====================

  const handleCoverChange = async (info) => {
    setCoverUploading(true);
    
    try {
      if (info.file.status === 'done') {
        setCoverUrl(info.file.response.url);
        message.success('Image de couverture uploadée avec succès');
      } else if (info.file.status === 'error') {
        message.error('Erreur upload de la couverture');
      }
    } catch (error) {
      message.error('Erreur lors de l\'upload');
    } finally {
      setCoverUploading(false);
    }
  };

  const handleCoverSelect = (file) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('Vous ne pouvez uploader que des images');
      return false;
    }
    
    const isLt5M = file.size / 1024 / 1024 < 5;
    if (!isLt5M) {
      message.error('L\'image de couverture doit faire moins de 5MB');
      return false;
    }
    
    setCoverFile(file);
    
    // Aperçu local
    const reader = new FileReader();
    reader.onload = (e) => {
      setCoverUrl(e.target.result);
    };
    reader.readAsDataURL(file);
    
    return false;
  };

  // ==================== GESTION DU MOT DE PASSE ====================

  const handleChangePassword = async (values) => {
    setLoading(true);
    try {
      await profileApi.changePassword(values);
      message.success('Mot de passe modifié avec succès');
      setPasswordModal(false);
      passwordForm.resetFields();
      
      const stats = await profileApi.getStats();
      setUserStats(stats);
    } catch (error) {
      message.error(error.response?.data?.detail || 'Erreur lors du changement de mot de passe');
    } finally {
      setLoading(false);
    }
  };

  // ==================== GESTION 2FA ====================

  const handleSetup2FA = async () => {
    try {
      const data = await profileApi.setup2FA();
      setTwoFASecret(data.secret);
      setTwoFAQrCode(data.provisioning_uri);
      setTwoFAModal(true);
    } catch (error) {
      message.error('Erreur lors de la configuration 2FA');
    }
  };

  const handleVerify2FA = async (values) => {
    setTwoFAVerifying(true);
    try {
      await profileApi.verify2FA({ code: values.code });
      message.success('2FA activée avec succès');
      setTwoFAModal(false);
      twoFAForm.resetFields();
      
      const settings = await profileApi.getSecuritySettings();
      setSecuritySettings(settings);
    } catch (error) {
      message.error('Code invalide');
    } finally {
      setTwoFAVerifying(false);
    }
  };

  const handleDisable2FA = () => {
    Modal.confirm({
      title: 'Désactiver la 2FA',
      content: 'Êtes-vous sûr de vouloir désactiver l\'authentification à deux facteurs ?',
      onOk: async () => {
        try {
          await profileApi.disable2FA();
          message.success('2FA désactivée');
          
          const settings = await profileApi.getSecuritySettings();
          setSecuritySettings(settings);
        } catch (error) {
          message.error('Erreur lors de la désactivation');
        }
      }
    });
  };

  // ==================== GESTION DES SESSIONS ====================

  const handleTerminateSession = (sessionId) => {
    Modal.confirm({
      title: 'Déconnecter cet appareil',
      content: 'Cette action déconnectera immédiatement cette session.',
      onOk: async () => {
        try {
          await profileApi.terminateSession(sessionId);
          setSessions(sessions.filter(s => s.id !== sessionId));
          message.success('Session déconnectée');
        } catch (error) {
          message.error('Erreur lors de la déconnexion');
        }
      }
    });
  };

  const handleTerminateAllSessions = () => {
    Modal.confirm({
      title: 'Déconnecter tous les appareils',
      content: 'Vous serez déconnecté de tous vos autres appareils.',
      onOk: async () => {
        try {
          await profileApi.terminateAllSessions();
          
          const sessionsData = await profileApi.getSessions();
          setSessions(sessionsData);
          
          message.success('Toutes les autres sessions ont été déconnectées');
        } catch (error) {
          message.error('Erreur lors de la déconnexion');
        }
      }
    });
  };

  // ==================== GESTION DES NOTIFICATIONS ====================

  const handleNotificationChange = async (key, value) => {
    const newSettings = { ...notificationSettings, [key]: value };
    setNotificationSettings(newSettings);
    
    try {
      await profileApi.updateNotificationSettings(newSettings);
      message.success('Préférences mises à jour');
    } catch (error) {
      message.error('Erreur de mise à jour');
      setNotificationSettings(notificationSettings);
    }
  };

  // ==================== GESTION DE LA SÉCURITÉ ====================

  const handleSecuritySettingChange = async (key, value) => {
    const newSettings = { ...securitySettings, [key]: value };
    setSecuritySettings(newSettings);
    
    try {
      await profileApi.updateSecuritySettings({ [key]: value });
      message.success('Paramètres sécurité mis à jour');
    } catch (error) {
      message.error('Erreur de mise à jour');
      setSecuritySettings(securitySettings);
    }
  };

  // ==================== DÉCONNEXION ====================

  const handleLogout = () => {
    Modal.confirm({
      title: 'Déconnexion',
      content: 'Êtes-vous sûr de vouloir vous déconnecter ?',
      onOk: logout
    });
  };

  // ==================== COMPOSANTS DE FORMULAIRES ====================

  const ProfileInfoForm = () => (
    <Form form={form} layout="vertical" onFinish={handleUpdateProfile} disabled={!editMode}>
      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Form.Item name="firstName" label="Prénom" rules={[{ required: true, message: 'Prénom requis' }]}>
            <Input prefix={<UserOutlined />} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="lastName" label="Nom" rules={[{ required: true, message: 'Nom requis' }]}>
            <Input prefix={<UserOutlined />} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Form.Item name="email" label="Email" rules={[
            { required: true, message: 'Email requis' },
            { type: 'email', message: 'Email invalide' }
          ]}>
            <Input prefix={<MailOutlined />} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="phone" label="Téléphone">
            <Input prefix={<PhoneOutlined />} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="address" label="Adresse">
        <Input prefix={<EnvironmentOutlined />} />
      </Form.Item>

      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Form.Item name="company" label="Entreprise">
            <Input prefix={<BankOutlined />} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="position" label="Poste">
            <Input prefix={<IdcardOutlined />} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item name="bio" label="Biographie">
        <TextArea rows={4} />
      </Form.Item>

      <Divider orientation="left">Réseaux sociaux</Divider>

      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Form.Item name="website" label="Site web">
            <Input prefix={<GlobalOutlined />} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="github" label="GitHub">
            <Input prefix={<GithubOutlined />} />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={24}>
        <Col xs={24} md={12}>
          <Form.Item name="linkedin" label="LinkedIn">
            <Input prefix={<LinkedinOutlined />} />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item name="twitter" label="Twitter">
            <Input prefix={<TwitterOutlined />} />
          </Form.Item>
        </Col>
      </Row>

      {editMode && (
        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />} size="large" block>
            Sauvegarder toutes les modifications
          </Button>
        </Form.Item>
      )}
    </Form>
  );

  const SecuritySettingsCard = () => (
    <Card title="Statut du compte" className="security-card">
      <Descriptions column={1}>
        <Descriptions.Item label="Authentification 2FA">
          <Space>
            <Switch 
              checked={securitySettings.two_factor_enabled}
              onChange={(checked) => checked ? handleSetup2FA() : handleDisable2FA()}
              checkedChildren="Activé" 
              unCheckedChildren="Désactivé" 
            />
            {securitySettings.two_factor_enabled && <Tag color="green">Sécurisé</Tag>}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="Notifications de connexion">
          <Switch 
            checked={securitySettings.login_notifications}
            onChange={(val) => handleSecuritySettingChange('login_notifications', val)}
          />
        </Descriptions.Item>
        <Descriptions.Item label="Alertes email">
          <Switch 
            checked={securitySettings.email_alerts}
            onChange={(val) => handleSecuritySettingChange('email_alerts', val)}
          />
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );

  const PasswordCard = () => (
    <Card title="Mot de passe" className="security-card">
      <div className="password-info">
        <Progress 
          type="circle" 
          percent={userStats.security_score || 0} 
          width={80} 
          format={() => userStats.security_score > 80 ? 'Fort' : 
                          userStats.security_score > 50 ? 'Moyen' : 'Faible'} 
          strokeColor={userStats.security_score > 80 ? '#52c41a' :
                       userStats.security_score > 50 ? '#faad14' : '#f5222d'}
        />
        <div>
          <Text>Dernière modification : il y a 3 mois</Text>
          <br />
          <Button type="link" icon={<KeyOutlined />} onClick={() => setPasswordModal(true)}>
            Changer le mot de passe
          </Button>
        </div>
      </div>
    </Card>
  );

  const SessionsList = () => (
    <Card 
      title="Sessions actives" 
      className="security-card"
      extra={sessions.length > 1 && (
        <Button type="link" size="small" onClick={handleTerminateAllSessions}>
          Déconnecter tous
        </Button>
      )}
    >
      <List
        dataSource={sessions}
        renderItem={session => (
          <List.Item
            actions={[
              !session.current && (
                <Button 
                  type="text" 
                  danger 
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => handleTerminateSession(session.id)}
                />
              )
            ]}
          >
            <List.Item.Meta
              avatar={<Badge status={session.current ? "success" : "default"} dot />}
              title={
                <Space>
                  <Text strong>{session.device}</Text>
                  {session.current && <Tag color="blue">Session actuelle</Tag>}
                </Space>
              }
              description={
                <div>
                  <Text type="secondary">{session.location} • {session.ip}</Text>
                  <br />
                  <Text type="secondary">Dernière activité : {session.lastActive}</Text>
                </div>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );

  const ActivityTimeline = () => (
    activityLog.length === 0 ? (
      <Empty description="Aucune activité récente" />
    ) : (
      <Timeline mode="left" className="activity-timeline">
        {activityLog.map(activity => (
          <Timeline.Item 
            key={activity.id}
            color={activity.status === 'success' ? 'green' :
                   activity.status === 'warning' ? 'orange' : 'red'}
          >
            <div className="activity-item">
              <div className="activity-header">
                <Text strong>{activity.action}</Text>
                <Tag color={activity.status === 'success' ? 'success' :
                           activity.status === 'warning' ? 'warning' : 'error'}>
                  {activity.status}
                </Tag>
              </div>
              <div className="activity-details">
                <Text type="secondary">{activity.location}</Text>
                <Text type="secondary">{activity.device}</Text>
              </div>
              <Text type="secondary" style={{ fontSize: 12 }}>{activity.time}</Text>
            </div>
          </Timeline.Item>
        ))}
      </Timeline>
    )
  );

  const NotificationSettingsList = () => (
    <List>
      <List.Item>
        <List.Item.Meta
          title="Alertes sécurité"
          description="Recevoir des alertes en cas de connexion suspecte"
        />
        <Switch 
          checked={notificationSettings.security_alerts}
          onChange={(val) => handleNotificationChange('security_alerts', val)}
        />
      </List.Item>
      <List.Item>
        <List.Item.Meta
          title="Nouvelles fonctionnalités"
          description="Être informé des nouvelles fonctionnalités"
        />
        <Switch 
          checked={notificationSettings.new_features}
          onChange={(val) => handleNotificationChange('new_features', val)}
        />
      </List.Item>
      <List.Item>
        <List.Item.Meta
          title="Rapports hebdomadaires"
          description="Recevoir un résumé de votre activité chaque semaine"
        />
        <Switch 
          checked={notificationSettings.weekly_reports}
          onChange={(val) => handleNotificationChange('weekly_reports', val)}
        />
      </List.Item>
      <List.Item>
        <List.Item.Meta
          title="Mises à jour système"
          description="Notifications des mises à jour et maintenance"
        />
        <Switch 
          checked={notificationSettings.system_updates}
          onChange={(val) => handleNotificationChange('system_updates', val)}
        />
      </List.Item>
    </List>
  );

  // ==================== DÉFINITION DES ONGLETS AVEC items ====================
  const tabItems = [
    {
      key: '1',
      label: <span><UserOutlined />Informations</span>,
      children: <ProfileInfoForm />
    },
    {
      key: '2',
      label: <span><LockOutlined />Sécurité</span>,
      children: (
        <Row gutter={24}>
          <Col xs={24} md={12}>
            <SecuritySettingsCard />
            <PasswordCard />
          </Col>
          <Col xs={24} md={12}>
            <SessionsList />
          </Col>
        </Row>
      )
    },
    {
      key: '3',
      label: <span><HistoryOutlined />Activité</span>,
      children: <ActivityTimeline />
    },
    {
      key: '4',
      label: <span><BellOutlined />Notifications</span>,
      children: <NotificationSettingsList />
    }
  ];

  // ==================== MODALS ====================

  const PasswordChangeModal = () => (
    <Modal title="Changer le mot de passe" open={passwordModal} onCancel={() => setPasswordModal(false)} footer={null} destroyOnClose>
      <Form form={passwordForm} layout="vertical" onFinish={handleChangePassword}>
        <Form.Item name="currentPassword" label="Mot de passe actuel" rules={[{ required: true, message: 'Mot de passe actuel requis' }]}>
          <Password prefix={<LockOutlined />} />
        </Form.Item>

        <Form.Item name="newPassword" label="Nouveau mot de passe" rules={[
          { required: true, message: 'Nouveau mot de passe requis' },
          { min: 8, message: 'Minimum 8 caractères' },
          { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
            message: 'Doit contenir majuscule, minuscule, chiffre et caractère spécial'
          }
        ]}>
          <Password prefix={<LockOutlined />} />
        </Form.Item>

        <Form.Item name="confirmPassword" label="Confirmer le mot de passe" dependencies={['newPassword']} rules={[
          { required: true, message: 'Confirmation requise' },
          ({ getFieldValue }) => ({
            validator(_, value) {
              if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
              return Promise.reject(new Error('Les mots de passe ne correspondent pas'));
            },
          }),
        ]}>
          <Password prefix={<LockOutlined />} />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            Changer le mot de passe
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );

  const TwoFAModalComponent = () => (
    <Modal title="Configurer l'authentification à deux facteurs" open={twoFAModal} onCancel={() => setTwoFAModal(false)} footer={null} width={500}>
      <div className="twofa-setup">
        <Alert
          message="Scannez le QR code"
          description="Utilisez Google Authenticator ou une application compatible pour scanner ce QR code."
          type="info"
          showIcon
          style={{ marginBottom: 24 }}
        />
        
        {twoFAQrCode && (
          <div className="qr-code-container">
            <QrcodeOutlined style={{ fontSize: 200 }} />
            <div style={{ marginTop: 16 }}>
              <Text copyable={{ text: twoFASecret }}>{twoFASecret}</Text>
            </div>
          </div>
        )}

        <Divider>Ou entrez le code manuellement</Divider>

        <Form form={twoFAForm} layout="vertical" onFinish={handleVerify2FA}>
          <Form.Item name="code" label="Code de vérification" rules={[
            { required: true, message: 'Code requis' },
            { len: 6, message: 'Le code doit faire 6 caractères' }
          ]}>
            <Input prefix={<LockOutlined />} placeholder="123456" maxLength={6} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block loading={twoFAVerifying}>
              Vérifier et activer
            </Button>
          </Form.Item>
        </Form>
      </div>
    </Modal>
  );

  // ==================== RENDU PRINCIPAL ====================

  if (initialLoading) {
    return (
      <div className="loading-container">
        <Spin size="large" tip="Chargement de votre profil...">
          <div style={{ height: 100 }} />
        </Spin>
      </div>
    );
  }

  return (
    <motion.div className="profile-page" initial="hidden" animate="visible" variants={containerVariants}>
      <ProfileHeader 
        user={user}
        editMode={editMode}
        avatarUrl={avatarUrl}
        coverUrl={coverUrl}
        avatarUploading={avatarUploading}
        coverUploading={coverUploading}
        onEditToggle={() => setEditMode(!editMode)}
        onLogout={handleLogout}
        onAvatarChange={handleAvatarChange}
        onCoverChange={handleCoverChange}
        onAvatarSelect={handleAvatarSelect}
        onCoverSelect={handleCoverSelect}
      />

      {/* FORCER 3 cartes sur une ligne - TOUS ÉCRANS */}
      <Row gutter={16} className="stats-row" style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card className="stat-card">
            <Statistic 
              title="Projets actifs" 
              value={userStats.active_projects || 0} 
              suffix={` / ${userStats.total_projects || 0}`}
              prefix={<TrophyOutlined />}
            />
          </Card>
        </Col>
        
        <Col span={8}>
          <Card className="stat-card">
            <Statistic 
              title="Connexions" 
              value={userStats.connections || 0} 
              prefix={<HistoryOutlined />}
            />
          </Card>
        </Col>
        
        <Col span={8}>
          <Card className="stat-card">
            <Statistic 
              title="Score sécurité" 
              value={userStats.security_score || 0} 
              suffix="%" 
              prefix={<SafetyOutlined />}
            />
            <Progress 
              percent={userStats.security_score || 0} 
              size="small" 
              showInfo={false}
              strokeColor="#52c41a"
              style={{ marginTop: 12 }}
            />
          </Card>
        </Col>
      </Row>

      <motion.div variants={itemVariants}>
        <Card className="profile-content">
          <Tabs 
            defaultActiveKey="1" 
            items={tabItems}
          />
        </Card>
      </motion.div>

      <PasswordChangeModal />
      <TwoFAModalComponent />
    </motion.div>
  );
};

// ==================== VARIABLES D'ANIMATION ====================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

export default Profile;