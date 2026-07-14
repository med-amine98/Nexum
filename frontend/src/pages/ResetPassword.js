import React, { useState, useEffect } from 'react';
import { 
  Form, Input, Button, Card, Typography, 
  Alert, Space, Progress, message
} from 'antd';
import { 
  LockOutlined, EyeOutlined, EyeInvisibleOutlined, 
  CheckCircleOutlined, CloseCircleOutlined, RocketOutlined, KeyOutlined 
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import './ResetPassword.css';

const { Title, Text, Paragraph } = Typography;


const ResetPassword = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setError("Le lien de réinitialisation est invalide ou manquant.");
    }
  }, [token]);

  const checkPasswordStrength = (password) => {
    if (!password) {
      setPasswordStrength(0);
      return 0;
    }
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
    
    setPasswordStrength(strength);
    return strength;
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength <= 2) return 'var(--error)';
    if (passwordStrength <= 3) return 'var(--warning)';
    if (passwordStrength <= 4) return 'var(--info)';
    return 'var(--success)';
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength <= 2) return 'Faible';
    if (passwordStrength <= 3) return 'Moyen';
    if (passwordStrength <= 4) return 'Fort';
    return 'Très fort';
  };

  const handleSubmit = async (values) => {
    if (!token) {
      message.error("Token manquant.");
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await api.post('/auth/reset-password', {
        token: token,
        password: values.password
      });
      
      setSuccess(true);
      message.success('Mot de passe mis à jour avec succès !');
      
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 3000);
      
    } catch (err) {
      console.error('Erreur réinitialisation:', err);
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.message || "Une erreur est survenue";
      setError(errorMsg);
      message.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="reset-password-page" style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: `linear-gradient(135deg, ${'var(--gray900)'} 0%, ${'var(--gray800)'} 100%)`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div className="login-bg-particles" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              background: Math.random() > 0.5 ? 'var(--primary)' : 'var(--accent)',
              borderRadius: '50%',
              opacity: Math.random() * 0.15,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{ y: [0, -30, 0], opacity: [0, 0.2, 0] }}
            transition={{ duration: Math.random() * 10 + 10, repeat: Infinity, ease: "linear" }}
          />
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ width: '100%', maxWidth: 440, padding: 24, zIndex: 10 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: 12, 
            padding: '8px 20px', 
            background: 'rgba(255,255,255,0.05)', 
            borderRadius: 100, 
            backdropFilter: 'blur(10px)' 
          }}>
            <RocketOutlined style={{ color: 'var(--white)', fontSize: 20 }} />
            <Title level={4} style={{ margin: 0, color: 'var(--white)', fontWeight: 700 }}>
              NEXUM<span style={{ color: 'var(--primary)' }}>.</span>
            </Title>
          </div>
        </div>

        <Card style={{ 
          borderRadius: 24, 
          border: 'none',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden'
        }}>
          <div style={{ height: 4, background: `linear-gradient(90deg, ${'var(--primary)'}, ${'var(--accent)'})`, position: 'absolute', top: 0, left: 0, right: 0 }} />
          
          <div style={{ padding: '32px 24px' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{
                width: 64, height: 64,
                background: `linear-gradient(135deg, ${'var(--primary)'}20, ${'var(--accent)'}20)`,
                borderRadius: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <KeyOutlined style={{ fontSize: 28, color: 'var(--primary)' }} />
              </div>
              <Title level={3} style={{ margin: 0 }}>Nouveau mot de passe</Title>
              <Text type="secondary" style={{ display: 'block', marginTop: 8 }}>
                Créez un nouveau mot de passe sécurisé
              </Text>
            </div>

            <AnimatePresence>
              {error && !success && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                  <Alert message="Erreur" description={error} type="error" showIcon style={{ marginBottom: 24, borderRadius: 12 }} />
                </motion.div>
              )}
            </AnimatePresence>

            {success ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '24px 0' }}>
                <CheckCircleOutlined style={{ fontSize: 64, color: 'var(--success)', marginBottom: 16 }} />
                <Title level={4}>Mot de passe mis à jour !</Title>
                <Paragraph type="secondary">Vous allez être redirigé vers la page de connexion dans un instant...</Paragraph>
                <Button type="primary" onClick={() => navigate('/login')} style={{ marginTop: 16, borderRadius: 10 }}>
                  Retour à la connexion
                </Button>
              </motion.div>
            ) : (
              <Form 
                form={form} 
                layout="vertical" 
                size="large" 
                onFinish={handleSubmit}
                onValuesChange={(changed) => { if (changed.password) checkPasswordStrength(changed.password); }}
              >
                <Form.Item
                  name="password"
                  rules={[
                    { required: true, message: 'Veuillez créer un mot de passe' },
                    { min: 8, message: 'Minimum 8 caractères' }
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: 'var(--gray400)' }} />}
                    placeholder="Nouveau mot de passe"
                    visibilityToggle={{ visible: passwordVisible, onVisibleChange: setPasswordVisible }}
                    iconRender={visible => visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                    style={{ borderRadius: 12 }}
                  />
                </Form.Item>

                {form.getFieldValue('password') && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: -12, marginBottom: 24 }}>
                    <Progress percent={(passwordStrength / 5) * 100} strokeColor={getPasswordStrengthColor()} showInfo={false} size="small" />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <Text style={{ color: getPasswordStrengthColor(), fontSize: 12 }}>Force : {getPasswordStrengthText()}</Text>
                      <Text style={{ color: 'var(--gray500)', fontSize: 12 }}>{passwordStrength}/5 critères</Text>
                    </div>
                  </motion.div>
                )}

                <Form.Item
                  name="confirmPassword"
                  dependencies={['password']}
                  rules={[
                    { required: true, message: 'Veuillez confirmer votre mot de passe' },
                    ({ getFieldValue }) => ({
                      validator(_, value) {
                        if (!value || getFieldValue('password') === value) return Promise.resolve();
                        return Promise.reject('Les mots de passe ne correspondent pas');
                      },
                    }),
                  ]}
                >
                  <Input.Password
                    prefix={<LockOutlined style={{ color: 'var(--gray400)' }} />}
                    placeholder="Confirmez le mot de passe"
                    visibilityToggle={{ visible: confirmPasswordVisible, onVisibleChange: setConfirmPasswordVisible }}
                    iconRender={visible => visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                    style={{ borderRadius: 12 }}
                  />
                </Form.Item>

                <Button 
                  type="primary" 
                  htmlType="submit" 
                  block 
                  size="large"
                  loading={loading}
                  disabled={!token || error.includes("invalide")}
                  style={{ 
                    background: `linear-gradient(135deg, ${'var(--primary)'}, ${'var(--accent)'})`,
                    border: 'none', borderRadius: 12, height: 48, fontWeight: 600, marginTop: 8
                  }}
                >
                  Réinitialiser le mot de passe
                </Button>
              </Form>
            )}
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
