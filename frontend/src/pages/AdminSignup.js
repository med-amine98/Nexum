// src/pages/AdminSignup.js
import React, { useState, useEffect } from 'react';
import { 
  Form, Input, Button, Card, Checkbox, Typography, 
  Divider, Alert, Space, Steps, Select, DatePicker,
  Progress, message, Avatar, Tag, Modal, Descriptions,
  Radio, Tooltip
} from 'antd';
import { 
  UserOutlined, LockOutlined, MailOutlined, 
  PhoneOutlined, HomeOutlined, BankOutlined,
  GlobalOutlined, SafetyCertificateOutlined,
  ArrowLeftOutlined, ArrowRightOutlined,
  CheckCircleOutlined, CloseCircleOutlined,
  EyeOutlined, EyeInvisibleOutlined,
  GoogleOutlined, GithubOutlined,
  RocketOutlined, CrownOutlined,
  WarningOutlined, SecurityScanOutlined,
  KeyOutlined, IdcardOutlined,
  ShopOutlined, ApartmentOutlined,
  CodeOutlined, DatabaseOutlined,
  CloudServerOutlined, TeamOutlined
} from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import './AdminSignup.css';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { Option } = Select;
const { TextArea } = Input;

// ========== FONCTIONS UTILITAIRES ==========


const AdminSignup = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [adminLevel, setAdminLevel] = useState('super_admin');
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [previewModal, setPreviewModal] = useState(false);
  const [securityQuestions, setSecurityQuestions] = useState([]);
  
  const navigate = useNavigate();
  const [form] = Form.useForm();

  const passwordChecks = {
    length: (pwd) => pwd?.length >= 12,
    uppercase: (pwd) => /[A-Z]/.test(pwd),
    lowercase: (pwd) => /[a-z]/.test(pwd),
    number: (pwd) => /[0-9]/.test(pwd),
    special: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd)
  };

  const validatePassword = (password) => {
    const checks = Object.values(passwordChecks).map(check => check(password));
    const strength = checks.filter(Boolean).length;
    setPasswordStrength(strength);
    return strength;
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole');
    if (token && userRole === 'admin') {
      navigate('/admin/dashboard');
    } else if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleNext = async () => {
    try {
      await form.validateFields();
      setCurrentStep(currentStep + 1);
    } catch (error) {
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    setError('');
    
    try {
      // Préparer les données pour l'API
      const signupData = {
        email: values.email,
        full_name: values.fullname,
        phone: values.phone,
        password: values.password,
        confirm_password: values.confirmPassword,
        role: 'admin',
        admin_level: adminLevel,
        company: {
          name: values.companyName,
          size: values.companySize,
          registration_number: values.registrationNumber || null,
          address: values.address,
          city: values.city,
          country: values.country,
          siret: values.siret || null,
          website: values.website || null,
          description: values.companyDescription || null
        },
        security: {
          two_factor_enabled: values.twoFactor || false,
          security_question: values.securityQuestion,
          security_answer: values.securityAnswer,
          backup_email: values.backupEmail || null,
          admin_code: values.adminCode
        }
      };

      // Appel API réel
      const response = await api.post('/auth/register-admin', signupData);
      
      const data = response.data;
      
      if (data.success) {
        localStorage.setItem('token', data.token.access_token);
        localStorage.setItem('refresh_token', data.token.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.token.user));
        localStorage.setItem('userRole', 'admin');
        
        setSuccess(data.message || 'Compte administrateur créé avec succès ! Redirection...');
        message.success(`Bienvenue ${data.token.user.full_name || ''} !`);
        
        setTimeout(() => {
          navigate('/admin/dashboard');
        }, 2000);
      } else {
        setError(data.message || 'Une erreur est survenue lors de l\'inscription');
        message.error('Échec de l\'inscription');
      }
    } catch (err) {
      console.error('Erreur inscription admin:', err);
      
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          const errors = err.response.data.detail.map(e => e.msg).join(', ');
          setError(errors);
        } else {
          setError(err.response.data.detail);
        }
      } else {
        setError('Une erreur est survenue lors de l\'inscription. Vérifiez votre connexion.');
      }
      
      message.error('Échec de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return '#ff4d4f';
    if (passwordStrength <= 3) return '#faad14';
    if (passwordStrength <= 4) return '#52c41a';
    return '#1890ff';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 2) return 'Faible';
    if (passwordStrength <= 3) return 'Moyen';
    if (passwordStrength <= 4) return 'Fort';
    return 'Très fort';
  };

  const adminPermissions = {
    super_admin: [
      'Gestion complète des utilisateurs et rôles',
      'Configuration système avancée',
      'Accès à tous les modules sans restriction',
      'Journal d\'audit et logs système',
      'Gestion des sauvegardes et restaurations',
      'Configuration de la sécurité globale',
      'Gestion des API et intégrations',
      'Supervision des performances'
    ],
    system_admin: [
      'Administration technique du système',
      'Gestion des serveurs et bases de données',
      'Configuration des services',
      'Monitoring et alertes',
      'Gestion des mises à jour',
      'Sécurité infrastructure'
    ],
    security_admin: [
      'Gestion de la sécurité',
      'Configuration 2FA',
      'Gestion des certificats',
      'Audit de sécurité',
      'Gestion des accès privilégiés',
      'Politiques de sécurité'
    ]
  };

  return (
    <div className="admin-signup-page">
      <div className="admin-signup-container">
        <div className="admin-signup-header">
          <div className="header-logo">
            <div className="logo-icon">
              <RocketOutlined />
            </div>
            <Title level={2}>Nexum</Title>
            <Tag color="gold" className="admin-tag">ADMIN</Tag>
          </div>
          <Text type="secondary">Créez votre compte administrateur</Text>
          
          <Alert
            message="Accès administrateur"
            description="Cette inscription est réservée aux administrateurs système. Vous allez créer un compte avec des privilèges élevés."
            type="warning"
            showIcon
            icon={<SecurityScanOutlined />}
            className="security-alert"
          />
        </div>

        <Card className="steps-card">
          <Steps current={currentStep} className="admin-steps">
            <Step title="Admin" description="Compte personnel" />
            <Step title="Entreprise" description="Structure" />
            <Step title="Sécurité" description="Configuration avancée" />
            <Step title="Confirmation" description="Validation" />
          </Steps>
        </Card>

        <Card className="admin-signup-card">
          {error && (
            <Alert
              message="Erreur d'inscription administrateur"
              description={error}
              type="error"
              showIcon
              closable
              className="signup-alert"
            />
          )}

          {success && (
            <Alert
              message="Succès"
              description={success}
              type="success"
              showIcon
              className="signup-alert"
            />
          )}

          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            size="large"
            className="admin-signup-form"
          >
            {currentStep === 0 && (
              <div className="step-content">
                <Title level={4}>
                  <CrownOutlined /> Informations administrateur
                </Title>

                <Form.Item
                  name="fullname"
                  label="Nom complet"
                  rules={[{ required: true, message: 'Veuillez entrer votre nom complet' }]}
                >
                  <Input 
                    prefix={<UserOutlined className="input-icon" />}
                    placeholder="Jean Dupont"
                  />
                </Form.Item>

                <Form.Item
                  name="email"
                  label="Email professionnel"
                  rules={[
                    { required: true, message: 'Veuillez entrer votre email' },
                    { type: 'email', message: 'Email invalide' }
                  ]}
                >
                  <Input 
                    prefix={<MailOutlined className="input-icon" />}
                    placeholder="admin@entreprise.com"
                  />
                </Form.Item>

                <Form.Item
                  name="phone"
                  label="Téléphone professionnel"
                  rules={[{ required: true, message: 'Veuillez entrer votre téléphone' }]}
                >
                  <Input 
                    prefix={<PhoneOutlined className="input-icon" />}
                    placeholder="+33 6 12 34 56 78"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label="Mot de passe administrateur"
                  extra="Minimum 12 caractères avec majuscules, minuscules, chiffres et caractères spéciaux"
                  rules={[
                    { required: true, message: 'Veuillez entrer votre mot de passe' },
                    { validator: (_, value) => {
                        if (!value || validatePassword(value) >= 4) {
                          return Promise.resolve();
                        }
                        return Promise.reject('Le mot de passe administrateur doit être fort');
                      }
                    }
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined className="input-icon" />}
                    placeholder="********"
                    iconRender={visible => visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                  />
                </Form.Item>

                {form.getFieldValue('password') && (
                  <div className="password-strength">
                    <Progress 
                      percent={(passwordStrength / 5) * 100} 
                      strokeColor={getPasswordStrengthColor()}
                      showInfo={false}
                      size="small"
                    />
                    <Text className="strength-text" style={{ color: getPasswordStrengthColor() }}>
                      {getPasswordStrengthText()}
                    </Text>
                    
                    <div className="password-checks">
                      <div className="check-item">
                        {passwordChecks.length(form.getFieldValue('password')) ? 
                          <CheckCircleOutlined className="check-valid" /> : 
                          <CloseCircleOutlined className="check-invalid" />
                        }
                        <Text>12 caractères minimum</Text>
                      </div>
                      <div className="check-item">
                        {passwordChecks.uppercase(form.getFieldValue('password')) ? 
                          <CheckCircleOutlined className="check-valid" /> : 
                          <CloseCircleOutlined className="check-invalid" />
                        }
                        <Text>Une majuscule</Text>
                      </div>
                      <div className="check-item">
                        {passwordChecks.lowercase(form.getFieldValue('password')) ? 
                          <CheckCircleOutlined className="check-valid" /> : 
                          <CloseCircleOutlined className="check-invalid" />
                        }
                        <Text>Une minuscule</Text>
                      </div>
                      <div className="check-item">
                        {passwordChecks.number(form.getFieldValue('password')) ? 
                          <CheckCircleOutlined className="check-valid" /> : 
                          <CloseCircleOutlined className="check-invalid" />
                        }
                        <Text>Un chiffre</Text>
                      </div>
                      <div className="check-item">
                        {passwordChecks.special(form.getFieldValue('password')) ? 
                          <CheckCircleOutlined className="check-valid" /> : 
                          <CloseCircleOutlined className="check-invalid" />
                        }
                        <Text>Un caractère spécial</Text>
                      </div>
                    </div>
                  </div>
                )}

                <Form.Item
                  name="confirmPassword"
                  label="Confirmer le mot de passe"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: 'Veuillez confirmer votre mot de passe' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) {
                          return Promise.resolve();
                        }
                        return Promise.reject('Les mots de passe ne correspondent pas');
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined className="input-icon" />}
                    placeholder="********"
                  />
                </Form.Item>

                <Form.Item
                  name="adminCode"
                  label="Code d'invitation administrateur"
                  rules={[{ required: true, message: 'Code d\'invitation requis' }]}
                  extra="Ce code vous a été fourni par l'équipe Nexum"
                >
                  <Input 
                    prefix={<KeyOutlined className="input-icon" />}
                    placeholder="ADMIN-XXXX-XXXX"
                  />
                </Form.Item>
              </div>
            )}

            {currentStep === 1 && (
              <div className="step-content">
                <Title level={4}>
                  <ApartmentOutlined /> Informations de l'entreprise
                </Title>

                <Form.Item
                  name="companyName"
                  label="Nom de l'entreprise"
                  rules={[{ required: true, message: 'Veuillez entrer le nom de votre entreprise' }]}
                >
                  <Input 
                    prefix={<BankOutlined className="input-icon" />}
                    placeholder="Nexum SAS"
                  />
                </Form.Item>

                <Form.Item
                  name="companySize"
                  label="Taille de l'entreprise"
                  rules={[{ required: true }]}
                >
                  <Select placeholder="Sélectionnez">
                    <Option value="1-10">Startup (1-10 employés)</Option>
                    <Option value="11-50">PME (11-50 employés)</Option>
                    <Option value="51-200">ETI (51-200 employés)</Option>
                    <Option value="201-500">Grande entreprise (201-500)</Option>
                    <Option value="500+">Groupe (500+ employés)</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="website"
                  label="Site web"
                >
                  <Input 
                    prefix={<GlobalOutlined className="input-icon" />}
                    placeholder="https://www.entreprise.com"
                  />
                </Form.Item>

                <Form.Item
                  name="companyDescription"
                  label="Description de l'entreprise"
                >
                  <TextArea 
                    rows={3}
                    placeholder="Brève description de votre activité..."
                  />
                </Form.Item>

                <Form.Item
                  name="registrationNumber"
                  label="Numéro d'immatriculation"
                >
                  <Input placeholder="SIREN, SIRET, RCS..." />
                </Form.Item>

                <Form.Item
                  name="address"
                  label="Adresse"
                  rules={[{ required: true }]}
                >
                  <Input 
                    prefix={<HomeOutlined className="input-icon" />}
                    placeholder="123 Rue de l'Innovation"
                  />
                </Form.Item>

                <Form.Item
                  name="city"
                  label="Ville"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Paris" />
                </Form.Item>

                <Form.Item
                  name="country"
                  label="Pays"
                  rules={[{ required: true }]}
                >
                  <Select placeholder="Sélectionnez">
                    <Option value="fr">France</Option>
                    <Option value="be">Belgique</Option>
                    <Option value="ch">Suisse</Option>
                    <Option value="ca">Canada</Option>
                    <Option value="lu">Luxembourg</Option>
                  </Select>
                </Form.Item>
              </div>
            )}

            {currentStep === 2 && (
              <div className="step-content">
                <Title level={4}>
                  <SafetyCertificateOutlined /> Configuration de sécurité
                </Title>

                <Form.Item
                  name="adminLevel"
                  label="Niveau d'administration"
                  initialValue="super_admin"
                >
                  <Radio.Group onChange={(e) => setAdminLevel(e.target.value)}>
                    <Radio.Button value="super_admin">
                      <CrownOutlined /> Super Admin
                    </Radio.Button>
                    <Radio.Button value="system_admin">
                      <DatabaseOutlined /> System Admin
                    </Radio.Button>
                    <Radio.Button value="security_admin">
                      <SecurityScanOutlined /> Security Admin
                    </Radio.Button>
                  </Radio.Group>
                </Form.Item>

                <div className="permissions-preview">
                  <Title level={5}>Permissions incluses :</Title>
                  <ul>
                    {adminPermissions[adminLevel].map((perm, index) => (
                      <li key={index}>
                        <CheckCircleOutlined className="perm-check" />
                        {perm}
                      </li>
                    ))}
                  </ul>
                </div>

                <Form.Item
                  name="twoFactor"
                  valuePropName="checked"
                  initialValue={true}
                >
                  <Checkbox>
                    Activer l'authentification à deux facteurs (recommandé)
                  </Checkbox>
                </Form.Item>

                <Form.Item
                  name="backupEmail"
                  label="Email de secours"
                  rules={[{ type: 'email', message: 'Email invalide' }]}
                >
                  <Input 
                    prefix={<MailOutlined className="input-icon" />}
                    placeholder="backup@email.com"
                  />
                </Form.Item>

                <Form.Item
                  name="securityQuestion"
                  label="Question de sécurité"
                  rules={[{ required: true }]}
                >
                  <Select placeholder="Sélectionnez une question">
                    <Option value="pet">Nom de votre premier animal de compagnie ?</Option>
                    <Option value="school">Nom de votre école primaire ?</Option>
                    <Option value="city">Ville de naissance de votre mère ?</Option>
                    <Option value="book">Titre de votre livre préféré ?</Option>
                  </Select>
                </Form.Item>

                <Form.Item
                  name="securityAnswer"
                  label="Réponse"
                  rules={[{ required: true }]}
                >
                  <Input placeholder="Votre réponse" />
                </Form.Item>
              </div>
            )}

            {currentStep === 3 && (
              <div className="step-content confirmation-step">
                <Title level={4}>
                  <SafetyCertificateOutlined /> Vérification finale
                </Title>

                <div className="admin-summary">
                  <Avatar 
                    size={64}
                    icon={<CrownOutlined />}
                    className="admin-avatar"
                    style={{ backgroundColor: '#722ed1' }}
                  />
                  <div className="admin-info">
                    <Title level={5}>
                      {form.getFieldValue('fullname')}
                    </Title>
                    <Tag color="gold">Administrateur</Tag>
                    <Tag color="blue">{adminLevel}</Tag>
                  </div>
                </div>

                <div className="company-summary">
                  <Title level={5}>Résumé entreprise :</Title>
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="Entreprise">
                      {form.getFieldValue('companyName')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Taille">
                      {form.getFieldValue('companySize')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Localisation">
                      {form.getFieldValue('city')}, {form.getFieldValue('country')}
                    </Descriptions.Item>
                    <Descriptions.Item label="Sécurité">
                      {form.getFieldValue('twoFactor') ? '2FA activée' : '2FA désactivée'}
                    </Descriptions.Item>
                  </Descriptions>
                </div>

                <Alert
                  message="Avertissement de sécurité"
                  description="En tant qu'administrateur, vous aurez accès à des données sensibles. Assurez-vous de protéger vos identifiants."
                  type="warning"
                  showIcon
                  icon={<WarningOutlined />}
                  className="warning-alert"
                />

                <Divider />

                <Form.Item
                  name="terms"
                  valuePropName="checked"
                  rules={[
                    { validator: (_, value) => 
                        value ? Promise.resolve() : Promise.reject('Vous devez accepter les conditions')
                    }
                  ]}
                >
                  <Checkbox onChange={(e) => setTermsAccepted(e.target.checked)}>
                    J'accepte les{' '}
                    <a href="/admin/terms" target="_blank" rel="noopener noreferrer">conditions d'utilisation administrateur</a>
                    {' '}et la{' '}
                    <a href="/admin/privacy" target="_blank" rel="noopener noreferrer">charte de sécurité</a>
                  </Checkbox>
                </Form.Item>

                <Form.Item
                  name="audit"
                  valuePropName="checked"
                  rules={[{ required: true, message: 'Vous devez accepter la politique d\'audit' }]}
                >
                  <Checkbox>
                    J'accepte que mes actions soient enregistrées à des fins d'audit
                  </Checkbox>
                </Form.Item>
              </div>
            )}

            <div className="step-navigation">
              {currentStep > 0 && (
                <Button 
                  onClick={handlePrev}
                  icon={<ArrowLeftOutlined />}
                  size="large"
                >
                  Étape précédente
                </Button>
              )}
              
              {currentStep < 3 ? (
                <Button 
                  type="primary" 
                  onClick={handleNext}
                  icon={<ArrowRightOutlined />}
                  size="large"
                  className="next-button admin"
                >
                  Étape suivante
                </Button>
              ) : (
                <Button 
                  type="primary" 
                  htmlType="submit"
                  loading={loading}
                  icon={<CrownOutlined />}
                  size="large"
                  block
                  className="submit-button admin"
                  disabled={!termsAccepted}
                >
                  Créer mon compte administrateur
                </Button>
              )}
            </div>
          </Form>

          <div className="login-link">
            <Text type="secondary">
              Déjà un compte administrateur ?{' '}
              <Link to="/admin/login" className="login-link-text">
                Se connecter
              </Link>
            </Text>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdminSignup;