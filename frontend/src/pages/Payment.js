// src/pages/Payment.js - Version corrigée
import React, { useState, useEffect } from 'react';
import {
  Layout, Typography, Button, Row, Col, Card,
  Space, Divider, Tag, Steps, Form, Input,
  Checkbox, Alert, message, Descriptions,
  Result, Avatar, List, Spin
} from 'antd';
import {
  RocketOutlined, LockOutlined, SafetyCertificateOutlined,
  CreditCardOutlined,
  CheckCircleOutlined,
  ArrowRightOutlined, ArrowLeftOutlined,
  FileTextOutlined, DownloadOutlined,
  QuestionCircleOutlined, CustomerServiceOutlined,
  GiftOutlined, AppstoreOutlined, TeamOutlined
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import api from '../services/api';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;
const { Step } = Steps;

// Palette de couleurs
const colors = {
  primary: '#2563eb',
  primaryLight: '#3b82f6',
  accent: '#10b981',
  success: '#10b981',
  error: '#ef4444',
  info: '#0ea5e9',
  white: '#ffffff',
  gray50: '#f9fafb',
  gray100: '#f3f4f6',
  gray200: '#e5e7eb',
  gray300: '#d1d5db',
  gray400: '#9ca3af',
  gray500: '#6b7280',
  gray600: '#4b5563',
  gray700: '#374151',
  gray800: '#1f2937',
  gray900: '#111827',
};

// ✅ Clé publique Stripe CORRECTE (depuis votre dashboard)
const STRIPE_PUBLIC_KEY = 'pk_test_51TdWO7CqwQMJhbzhTP3aIvK7pIObocOxOjZZIWszRx8BknomgGC3qGqtl9FBBextBuc5BLw5r89fARtbUUDOxwUQ00wuWunby9';

let stripePromise = null;
const getStripePromise = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLIC_KEY);
  }
  return stripePromise;
};

// Composant de formulaire de paiement Stripe
const PaymentForm = ({ total, selectedPlan, onSuccess, onError, userEmail, userName }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [cardComplete, setCardComplete] = useState(false);
  const [cardError, setCardError] = useState('');

  const handleSubmit = async (event) => {
  event.preventDefault();
  
  
  if (!stripe || !elements) {
    console.error('❌ Stripe non initialisé');
    message.warning('Chargement du système de paiement...');
    return;
  }

  if (!cardComplete) {
    console.warn('⚠️ Carte incomplète');
    message.warning('Veuillez remplir les informations de carte');
    return;
  }

  setProcessing(true);
  setCardError('');

  try {
    // ✅ Convertir le montant en nombre valide
    let amountValue = 79; // valeur par défaut
    
    if (typeof total === 'number') {
      amountValue = total;
    } else if (typeof total === 'string') {
      // Extraire le premier nombre valide
      const match = total.match(/[\d.]+/);
      if (match) {
        amountValue = parseFloat(match[0]);
      }
    }
    
    // S'assurer que c'est un nombre valide
    if (isNaN(amountValue) || amountValue <= 0) {
      amountValue = 79;
    }
    
    
    // 1. Créer le PaymentIntent via le backend
    const { data: paymentIntent } = await api.post('/stripe/create-payment-intent', {
      amount: amountValue,  // ✅ Maintenant c'est un nombre propre
      planName: selectedPlan?.name || 'Premium',
      userEmail: userEmail,
      userName: userName,
      planId: selectedPlan?.id || 1
    });


    // 2. Confirmer le paiement avec Stripe
    const { error, paymentIntent: confirmedPayment } = await stripe.confirmCardPayment(
      paymentIntent.clientSecret,
      {
        payment_method: {
          card: elements.getElement(CardElement),
          billing_details: {
            name: userName,
            email: userEmail,
          },
        },
      }
    );

    if (error) {
      console.error('❌ Erreur Stripe:', error);
      setCardError(error.message);
      onError(error.message);
    } else if (confirmedPayment && confirmedPayment.status === 'succeeded') {
      
      // 3. Confirmer le paiement côté backend
      await api.post('/stripe/confirm-payment', {
        paymentIntentId: confirmedPayment.id,
        planId: selectedPlan?.id || 1
      });
      
      onSuccess(confirmedPayment);
    } else {
      console.warn('⚠️ Statut inattendu:', confirmedPayment?.status);
    }
  } catch (err) {
    console.error('❌ Erreur générale:', err);
    const errorMsg = err.response?.data?.detail || err.message || 'Erreur de paiement';
    setCardError(errorMsg);
    onError(errorMsg);
  } finally {
    setProcessing(false);
  }
};
  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        letterSpacing: '0.025em',
        fontFamily: 'Source Code Pro, monospace',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
    hidePostalCode: true,
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: 24 }}>
      <div style={{
        padding: '20px',
        border: `1px solid ${colors.gray200}`,
        borderRadius: 12,
        background: colors.white,
        marginBottom: 20
      }}>
        <CardElement
          options={cardElementOptions}
          onChange={(event) => {
            setCardComplete(event.complete);
            if (event.error) {
              setCardError(event.error.message);
            } else {
              setCardError('');
            }
          }}
        />
        {cardError && (
          <div style={{ color: colors.error, fontSize: 12, marginTop: 8 }}>
            {cardError}
          </div>
        )}
      </div>

      <Button
        type="primary"
        size="large"
        block
        htmlType="submit"
        loading={processing}
        disabled={!stripe || !cardComplete || processing}
        style={{
          background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
          border: 'none',
          borderRadius: 12,
          height: 50,
          fontWeight: 600,
          fontSize: 16
        }}
      >
        {processing ? 'Traitement en cours...' : `Payer ${total}€`}
      </Button>

      <div style={{ textAlign: 'center', marginTop: 16 }}>
        <LockOutlined style={{ color: colors.gray400, marginRight: 8 }} />
        <Text type="secondary" style={{ fontSize: 12 }}>
          Paiement sécurisé par Stripe
        </Text>
      </div>
    </form>
  );
};

// Composant de paiement sécurisé
const SecurePayment = ({ total, selectedPlan, onSuccess, onError, userEmail, userName }) => {
  const [stripeInitialized, setStripeInitialized] = useState(false);
  const stripePromise = getStripePromise();

  useEffect(() => {
    if (stripePromise) {
      stripePromise.then(() => {
        setStripeInitialized(true);
      }).catch(err => {
        console.error('❌ Erreur initialisation Stripe:', err);
      });
    }
  }, [stripePromise]);

  if (!stripeInitialized) {
    return (
      <div style={{ textAlign: 'center', padding: 40 }}>
        <Spin size="large" tip="Chargement de la plateforme de paiement..." ><div/></Spin>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <PaymentForm
        total={total}
        selectedPlan={selectedPlan}
        onSuccess={onSuccess}
        onError={onError}
        userEmail={userEmail}
        userName={userName}
      />
    </Elements>
  );
};

const Payment = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [paymentError, setPaymentError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  const selectedModule = location.state?.module;
  const isModule = !!selectedModule;
  const selectedPlanFromState = location.state?.plan;
  const userFromSignup = location.state?.user;
  
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  // Récupération des données initiales
  useEffect(() => {
    
    // Récupérer depuis localStorage
    let planFromStorage = null;
    const storedPlan = localStorage.getItem('selectedPlan');
    if (storedPlan) {
      try {
        const parsed = JSON.parse(storedPlan);
        if (parsed && (parsed.name || parsed.planName)) {
          planFromStorage = {
            id: parsed.id || parsed.code,
            name: parsed.name || parsed.planName,
            price: parsed.price || 79,
            code: parsed.code || 'premium',
            billing: parsed.billingCycle || 'monthly'
          };
        }
      } catch (e) {
        console.error('Erreur parsing localStorage:', e);
      }
    }
    
    // Récupérer depuis location.state
    let planFromState = null;
    if (selectedPlanFromState) {
      if (typeof selectedPlanFromState === 'object' && selectedPlanFromState.name) {
        planFromState = {
          id: selectedPlanFromState.code || selectedPlanFromState.id,
          name: selectedPlanFromState.name,
          price: selectedPlanFromState.price || 79,
          code: selectedPlanFromState.code || selectedPlanFromState.id,
          billing: selectedPlanFromState.billingCycle || 'monthly'
        };
      } else if (typeof selectedPlanFromState === 'string') {
        planFromState = {
          name: selectedPlanFromState,
          code: selectedPlanFromState.toLowerCase(),
          price: selectedPlanFromState === 'basic' ? 29 : selectedPlanFromState === 'premium' ? 79 : 199
        };
      }
    }
    
    // Plan par défaut
    const finalPlan = planFromState || planFromStorage || { 
      name: 'Premium', 
      price: 79, 
      code: 'premium',
      billing: 'monthly',
      users: 20,
      freeTrial: 14
    };
    
    setSelectedPlan(finalPlan);
    
    // Récupérer les infos utilisateur
    if (userFromSignup) {
      setUserEmail(userFromSignup.email || '');
      setUserName(userFromSignup.name || '');
    } else {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          setUserEmail(userData.email || '');
          setUserName(userData.full_name || userData.name || '');
        } catch (e) {}
      }
    }
    
    localStorage.removeItem('selectedPlan');
  }, [selectedPlanFromState, userFromSignup]);

  // Calculs
  const subtotal = isModule ? (selectedModule?.price || 0) : (selectedPlan?.price || 0);
  const tax = isModule ? 0 : subtotal * 0.2;
  const discount = promoApplied ? subtotal * 0.1 : 0;
  const total = isModule ? subtotal - discount : subtotal + tax - discount;
  const savings = isModule ? 0 : (selectedPlan?.originalPrice ? selectedPlan.originalPrice - selectedPlan.price : 0);
  const billingPeriod = isModule ? 'Paiement unique' : (selectedPlan?.billing === 'monthly' ? 'TTC/mois' : 'TTC/an');

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentStep]);

  const steps = [
    { title: 'Récapitulatif', icon: <FileTextOutlined /> },
    { title: 'Paiement', icon: <CreditCardOutlined /> },
    { title: 'Confirmation', icon: <CheckCircleOutlined /> }
  ];

  const handleNext = () => {
    if (currentStep === 0 && termsAccepted) {
      setCurrentStep(1);
    } else if (!termsAccepted) {
      message.warning('Veuillez accepter les conditions générales');
    }
  };

  const handlePrev = () => {
    setCurrentStep(currentStep - 1);
  };

  const handlePaymentSuccess = async (paymentIntent) => {
    setProcessing(false);
    setPaymentComplete(true);
    setCurrentStep(2);
    
    setInvoiceData({
      number: `FAC-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
      date: new Date().toLocaleDateString('fr-FR'),
      plan: isModule ? selectedModule?.name : selectedPlan?.name,
      amount: total,
      method: 'Carte bancaire (Stripe)',
      billing: billingPeriod,
      freeTrial: isModule ? 0 : (selectedPlan?.freeTrial || 7),
      transactionId: paymentIntent.id
    });
    
    message.success({
      content: `Paiement effectué avec succès !`,
      icon: <CheckCircleOutlined style={{ color: colors.success }} />,
    });
  };

  const handlePaymentError = (error) => {
    setProcessing(false);
    setPaymentError(error);
    message.error(error || "Une erreur est survenue lors du paiement.");
  };

  const handleFinish = () => {
    navigate('/dashboard');
  };

  const getPlanFeatures = () => {
    if (selectedModule) {
      return [
        'Accès complet au module',
        selectedModule?.description || 'Fonctionnalité avancée',
        'Support technique dédié',
        'Mises à jour et sécurité',
        'Intégration transparente'
      ];
    }
    
    const baseFeatures = [
      'Tous les modules du plan',
      'Support technique',
      'Mises à jour incluses',
      'Sauvegardes quotidiennes'
    ];
    
    if (selectedPlan?.name === 'Premium') {
      baseFeatures.push('Support prioritaire', 'Analytics avancés');
    } else if (selectedPlan?.name === 'Enterprise') {
      baseFeatures.push('Support dédié 24/7', 'IA prédictive', 'SLA garanti');
    }
    
    return baseFeatures;
  };

  const handleDownloadInvoice = () => {
    if (!invoiceData) return;
    const blob = new Blob([JSON.stringify(invoiceData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${invoiceData.number || 'invoice'}.json`;
    a.click();
    URL.revokeObjectURL(url);
    message.success('Facture téléchargée');
  };

  const handlePromoApply = () => {
    if (!promoCode) {
      message.warning('Veuillez entrer un code promo');
      return;
    }
    setPromoApplied(true);
    message.success('Code promo appliqué avec succès');
  };

  if (loadingPlans && !selectedPlan) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Chargement des plans..." ><div/></Spin>
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: colors.gray50 }}>
      <Header style={{ 
        background: colors.white, 
        padding: '0 24px', 
        position: 'sticky', 
        top: 0, 
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
        height: 64,
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => navigate('/')}>
            <RocketOutlined style={{ fontSize: 24, color: colors.primary }} />
            <span style={{ fontSize: 20, fontWeight: 700, color: colors.gray800 }}>Nexum</span>
            <Tag color="gold" style={{ background: colors.accent, border: 'none', color: colors.white }}>Paiement sécurisé</Tag>
          </div>
          <Steps current={currentStep} size="small" style={{ width: 300 }}>
            {steps.map((step, index) => (
              <Step key={index} title={step.title} icon={step.icon} />
            ))}
          </Steps>
          <div style={{ width: 80 }} />
        </div>
      </Header>

      <Content style={{ padding: '40px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Row gutter={[32, 32]}>
            <Col xs={24} lg={16}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: currentStep > 0 ? 30 : -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: currentStep > 0 ? -30 : 30 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: 'none' }}>
                    
                    {/* Étape 1 - Récapitulatif */}
                    {currentStep === 0 && (
                      <div>
                        <Title level={3}>Récapitulatif</Title>
                        
                        {!isModule && selectedPlan?.freeTrial > 0 && (
                          <Alert
                            message={`🎁 ${selectedPlan.freeTrial} jours d'essai gratuit`}
                            description="Vous ne serez facturé qu'à la fin de la période d'essai."
                            type="info"
                            showIcon
                            style={{ marginBottom: 24, borderRadius: 12 }}
                          />
                        )}
                        
                        <Descriptions bordered column={1} size="middle">
                          <Descriptions.Item label="Produit">
                            <strong>{isModule ? selectedModule?.name : selectedPlan?.name}</strong>
                            <Tag style={{ marginLeft: 12 }}>{billingPeriod}</Tag>
                          </Descriptions.Item>
                          {!isModule && selectedPlan && (
                            <Descriptions.Item label="Utilisateurs">
                              <TeamOutlined /> {selectedPlan.users} utilisateurs
                            </Descriptions.Item>
                          )}
                          <Descriptions.Item label="Prix">
                            {subtotal.toFixed(2)}€
                          </Descriptions.Item>
                          {!isModule && savings > 0 && (
                            <Descriptions.Item label="Réduction">
                              -{savings.toFixed(2)}€
                            </Descriptions.Item>
                          )}
                          {!isModule && (
                            <Descriptions.Item label="TVA (20%)">
                              {tax.toFixed(2)}€
                            </Descriptions.Item>
                          )}
                          {promoApplied && (
                            <Descriptions.Item label="Code promo">
                              -{discount.toFixed(2)}€
                            </Descriptions.Item>
                          )}
                          <Descriptions.Item label="Total" labelStyle={{ fontWeight: 'bold' }}>
                            <span style={{ fontSize: 20, fontWeight: 'bold', color: colors.accent }}>
                              {total.toFixed(2)}€
                            </span>
                          </Descriptions.Item>
                        </Descriptions>

                        <Divider />

                        <div>
                          <Title level={5}>✨ Fonctionnalités incluses</Title>
                          <List
                            size="small"
                            dataSource={getPlanFeatures()}
                            renderItem={item => (
                              <List.Item style={{ padding: '4px 0', border: 'none' }}>
                                <CheckCircleOutlined style={{ color: colors.success, marginRight: 8 }} />
                                {item}
                              </List.Item>
                            )}
                          />
                        </div>

                        <Divider />

                        <Checkbox 
                          checked={termsAccepted}
                          onChange={(e) => setTermsAccepted(e.target.checked)}
                        >
                          J'accepte les conditions générales de vente et la politique de confidentialité
                        </Checkbox>
                      </div>
                    )}

                    {/* Étape 2 - Paiement */}
                    {currentStep === 1 && !paymentComplete && (
                      <div>
                        <Title level={3}>Paiement sécurisé</Title>
                        
                        <div style={{ marginBottom: 24 }}>
                          <div style={{ 
                            background: `linear-gradient(135deg, ${colors.primary}10, ${colors.accent}10)`,
                            borderRadius: 12,
                            padding: '16px 20px',
                            marginBottom: 20
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                              <div>
                                <Text strong style={{ fontSize: 16 }}>À payer :</Text>
                                <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.primary, marginLeft: 12 }}>
                                  {total.toFixed(2)}€
                                </Text>
                              </div>
                              <Tag color="gold" style={{ background: `${colors.accent}20`, border: 'none' }}>
                                <SafetyCertificateOutlined /> Paiement sécurisé Stripe
                              </Tag>
                            </div>
                          </div>
                          
                          <Alert
                            message="Informations de paiement"
                            description="Vos informations bancaires sont cryptées et sécurisées par Stripe. Nous ne stockons aucune donnée de carte bancaire."
                            type="info"
                            showIcon
                            style={{ borderRadius: 12, marginBottom: 20 }}
                          />
                          
                          <SecurePayment
                            total={total.toFixed(2)}
                            selectedPlan={selectedPlan}
                            onSuccess={handlePaymentSuccess}
                            onError={handlePaymentError}
                            userEmail={userEmail}
                            userName={userName}
                          />
                          
                          {paymentError && (
                            <Alert
                              message="Erreur de paiement"
                              description={paymentError}
                              type="error"
                              showIcon
                              style={{ marginTop: 16, borderRadius: 12 }}
                            />
                          )}
                        </div>

                        <Divider />

                        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap' }}>
                          <LockOutlined style={{ color: colors.success }} />
                          <Text type="secondary">Paiement 100% sécurisé</Text>
                          <Text type="secondary">SSL Encryption</Text>
                          <Text type="secondary">PCI DSS Compliant</Text>
                        </div>
                      </div>
                    )}

                    {/* Étape 3 - Confirmation */}
                    {currentStep === 2 && paymentComplete && (
                      <div style={{ textAlign: 'center' }}>
                        <Result
                          status="success"
                          icon={<CheckCircleOutlined style={{ color: colors.success }} />}
                          title="Paiement confirmé !"
                          subTitle={isModule ? 
                            `Le module ${selectedModule?.name} a été activé avec succès.` : 
                            `Votre abonnement ${selectedPlan?.name} est actif.`
                          }
                          extra={[
                            <Button 
                              type="primary" 
                              key="dashboard"
                              onClick={handleFinish}
                              style={{ background: colors.primary, borderRadius: 10 }}
                            >
                              Accéder au dashboard
                            </Button>,
                            <Button 
                              key="invoice"
                              onClick={handleDownloadInvoice}
                              icon={<DownloadOutlined />}
                            >
                              Télécharger la facture
                            </Button>
                          ]}
                        />

                        {invoiceData && (
                          <Card style={{ marginTop: 24, textAlign: 'left', borderRadius: 12 }}>
                            <Title level={5}>Détails de la transaction</Title>
                            <Descriptions column={1} size="small">
                              <Descriptions.Item label="Facture N°">{invoiceData.number}</Descriptions.Item>
                              <Descriptions.Item label="Date">{invoiceData.date}</Descriptions.Item>
                              <Descriptions.Item label="Montant">{invoiceData.amount?.toFixed(2)}€</Descriptions.Item>
                              <Descriptions.Item label="Mode de paiement">{invoiceData.method}</Descriptions.Item>
                              {invoiceData.transactionId && (
                                <Descriptions.Item label="ID Transaction">{invoiceData.transactionId}</Descriptions.Item>
                              )}
                            </Descriptions>
                          </Card>
                        )}
                      </div>
                    )}

                    {/* Boutons de navigation */}
                    {currentStep === 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32 }}>
                        <Button
                          type="primary"
                          size="large"
                          onClick={handleNext}
                          style={{ 
                            marginLeft: 'auto',
                            background: colors.primary,
                            borderRadius: 10
                          }}
                        >
                          Continuer vers paiement
                          <ArrowRightOutlined style={{ marginLeft: 8 }} />
                        </Button>
                      </div>
                    )}
                    
                    {currentStep === 1 && !paymentComplete && (
                      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 32 }}>
                        <Button size="large" onClick={handlePrev} icon={<ArrowLeftOutlined />}>
                          Retour
                        </Button>
                      </div>
                    )}
                  </Card>
                </motion.div>
              </AnimatePresence>
            </Col>

            {/* Colonne de droite - Résumé */}
            <Col xs={24} lg={8}>
              <Card style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: 'none', position: 'sticky', top: 80 }}>
                <Title level={4}>Résumé</Title>
                
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <Avatar 
                    icon={isModule ? <AppstoreOutlined /> : <RocketOutlined />} 
                    style={{ 
                      background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent})`,
                      width: 56,
                      height: 56,
                      marginBottom: 12
                    }} 
                  />
                  <Title level={5}>{isModule ? selectedModule?.name : selectedPlan?.name}</Title>
                  <Text type="secondary">{billingPeriod}</Text>
                </div>

                <Divider />

                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text>Sous-total</Text>
                    <Text>{subtotal.toFixed(2)}€</Text>
                  </div>
                  {!isModule && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text>TVA (20%)</Text>
                      <Text>{tax.toFixed(2)}€</Text>
                    </div>
                  )}
                  {promoApplied && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <Text>Réduction</Text>
                      <Text style={{ color: colors.success }}>-{discount.toFixed(2)}€</Text>
                    </div>
                  )}
                  <Divider style={{ margin: '12px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text strong>Total</Text>
                    <Text strong style={{ fontSize: 20, color: colors.accent }}>
                      {total.toFixed(2)}€
                    </Text>
                  </div>
                </div>

                {!isModule && selectedPlan?.freeTrial > 0 && (
                  <Tag color="gold" icon={<GiftOutlined />} style={{ background: colors.accent, color: colors.white, marginBottom: 16, width: '100%', textAlign: 'center' }}>
                    🎁 {selectedPlan.freeTrial} jours gratuits
                  </Tag>
                )}

                <Divider />

                <div style={{ marginBottom: 16 }}>
                  <Title level={5}>Code promo</Title>
                  <Input.Group compact>
                    <Input 
                      style={{ width: '65%', borderRadius: '8px 0 0 8px' }}
                      placeholder="CODE10"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      disabled={promoApplied}
                    />
                    <Button 
                      style={{ width: '35%', borderRadius: '0 8px 8px 0', background: promoApplied ? colors.success : colors.primary }}
                      onClick={handlePromoApply}
                      disabled={promoApplied}
                    >
                      {promoApplied ? 'Appliqué' : 'Appliquer'}
                    </Button>
                  </Input.Group>
                </div>

                <Divider />

                <div>
                  <Title level={5}>Sécurité garantie</Title>
                  <Space direction="vertical" size="small">
                    <Text><LockOutlined style={{ color: colors.success }} /> Paiement sécurisé Stripe</Text>
                    <Text><SafetyCertificateOutlined style={{ color: colors.success }} /> Garantie 30 jours</Text>
                    <Text><CustomerServiceOutlined style={{ color: colors.success }} /> Support 24/7</Text>
                    <Text><CreditCardOutlined style={{ color: colors.success }} /> PCI DSS Level 1</Text>
                  </Space>
                </div>

                <Divider />

                <div style={{ textAlign: 'center' }}>
                  <Button type="link" icon={<QuestionCircleOutlined />}>Besoin d'aide ?</Button>
                </div>
              </Card>
            </Col>
          </Row>
        </div>
      </Content>

      <Footer style={{ textAlign: 'center', background: colors.white, borderTop: `1px solid ${colors.gray200}` }}>
        <Text type="secondary">© 2025 Nexum. Tous droits réservés.</Text>
      </Footer>
    </Layout>
  );
};

export default Payment;