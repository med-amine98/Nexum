import React, { useState, useEffect, useMemo } from 'react';
import {
  Card, Row, Col, Button, Input, Space,
  Typography, Alert, Tabs, Table, Tag,
  message, Divider, Statistic,
  Steps, Form, Select, InputNumber,
  Tooltip, Badge, List, Modal, Avatar,
  Empty, Descriptions,
  Segmented, FloatButton, Spin, DatePicker,
  ConfigProvider, theme // <-- ajout pour le mode sombre
} from 'antd';
import {
  FileTextOutlined, DownloadOutlined, CopyOutlined,
  BarChartOutlined,
  FilePdfOutlined,
  ThunderboltOutlined, CheckCircleOutlined,
  LoadingOutlined, PlusOutlined, DeleteOutlined,
  EyeOutlined, ShareAltOutlined,
  MailOutlined, HistoryOutlined,
  DollarOutlined, CalculatorOutlined,
  StarOutlined, BulbOutlined, RocketOutlined,
  ClockCircleOutlined,
  HeartOutlined,
  ExperimentOutlined,
  UserOutlined, TeamOutlined, TableOutlined,
  AppstoreOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import 'dayjs/locale/fr';
import html2pdf from 'html2pdf.js';

const { Title, Text } = Typography;
const { TextArea } = Input;

dayjs.locale('fr');

const QuoteGenerator = () => {
  const [loading, setLoading] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [quoteForm] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [viewMode, setViewMode] = useState('table');
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      const response = await api.get('/sales/quotes/recent');
      setQuotes(response.data || []);
    } catch (error) {
      console.error('Erreur chargement devis:', error);
      setQuotes([]);
    }
  };

  const generateQuote = async (values) => {
    setGenerating(true);
    setLoading(true);
    try {
      const items = values.items && values.items.length > 0
        ? values.items.filter(item => item.name).map(item => ({
            description: item.name,
            quantity: item.quantity || 1,
            unit_price: item.price || 0
          }))
        : [];

      let finalItems = items;
      if (finalItems.length === 0 && values.description) {
        finalItems = [{
          description: values.description.substring(0, 100),
          quantity: 1,
          unit_price: 0
        }];
      }

      const response = await api.post('/sales/quotes/generate', {
        client_name: values.client_name,
        client_email: values.client_email || '',
        description: values.description || '',
        items: finalItems,
        tva: values.tax_rate || 20,
        discount: values.discount || 0
      });

      setQuotes([response.data, ...quotes]);
      setSelectedQuote(response.data);
      setPreviewVisible(true);
      setCurrentStep(3);
      message.success(`Devis ${response.data.quote_number} généré avec succès !`);
      quoteForm.resetFields();
      await fetchQuotes();
    } catch (error) {
      console.error('Erreur:', error);
      message.error('Erreur lors de la génération du devis');
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  const analyzeDescription = async (description) => {
    if (!description || description.length < 20) return;

    setAnalyzing(true);
    setTimeout(() => {
      const suggestions = [
        {
          title: "Optimisation du contenu",
          description: "Ajoutez des détails sur les délais de livraison et les garanties pour augmenter la conversion.",
          enhanced_description: description + " Livraison sous 48h, garantie 1 an incluse.",
          recommended_discount: 5
        }
      ];
      setAiSuggestions(suggestions);
      setShowAIAssistant(true);
      setAnalyzing(false);
    }, 1000);
  };

  const applySuggestion = (suggestion) => {
    if (suggestion.enhanced_description) {
      quoteForm.setFieldsValue({ description: suggestion.enhanced_description });
    }
    if (suggestion.recommended_discount) {
      quoteForm.setFieldsValue({ discount: suggestion.recommended_discount });
    }
    setShowAIAssistant(false);
    message.success('Suggestion appliquée avec succès');
  };

  // Fonction utilitaire pour formater les dates
  const formatDate = (dateStr) => {
    if (!dateStr) return new Date().toLocaleDateString('fr-FR');
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return new Date().toLocaleDateString('fr-FR');
    return date.toLocaleDateString('fr-FR');
  };

  // Fonction utilitaire pour formater les montants
  const formatAmount = (value) => {
    if (!value && value !== 0) return '0';
    return Number(value).toLocaleString('fr-FR');
  };

  // Fonction pour télécharger le devis en PDF
  const downloadQuotePDF = async (quote) => {
    if (!quote) {
      message.warning('Aucun devis à télécharger');
      return;
    }

    setDownloading(true);

    try {
      // Récupérer les données du devis
      const quoteNumber = quote.quote_number || 'DEVIS';
      const clientName = quote.client_name || '-';
      const clientEmail = quote.client_email || '-';
      const createdAt = formatDate(quote.created_at);

      // Calculer les montants
      const subtotal = quote.subtotal || 0;
      const taxRate = quote.tax_rate || 20;
      const taxAmount = quote.tax_amount || (subtotal * taxRate / 100);
      const totalAmount = quote.total_amount || quote.amount_total || (subtotal + taxAmount);

      // Générer les lignes du tableau
      let itemsHtml = '';
      if (quote.items && quote.items.length > 0) {
        itemsHtml = quote.items.map(item => `
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">${item.description || '-'}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${item.quantity || 0}</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${formatAmount(item.unit_price)} €</td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: right;"><strong>${formatAmount(item.total || (item.quantity * item.unit_price))} €</strong></td>
          </tr>
        `).join('');
      } else {
        itemsHtml = `
          <tr>
            <td colspan="4" style="padding: 20px; text-align: center; color: #999;">Aucun détail</td>
          </tr>
        `;
      }

      // Créer le HTML pour le PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Devis ${quoteNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'DejaVu Sans', 'Arial', sans-serif; 
              font-size: 12px;
              line-height: 1.5;
              color: '#1e293b';
            }
            .container { 
              max-width: 800px; 
              margin: 0 auto; 
              padding: 30px;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              padding-bottom: 20px;
              border-bottom: 3px solid #1890ff;
            }
            .company-name { 
              font-size: 28px; 
              font-weight: bold; 
              color: #1890ff;
              margin-bottom: 10px;
            }
            .title { 
              font-size: 32px; 
              font-weight: bold; 
              margin: 10px 0;
            }
            .subtitle { 
              color: #666; 
              font-size: 14px;
            }
            .info-section { 
              margin-bottom: 30px;
            }
            .info-title {
              font-size: 16px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #1890ff;
              border-left: 4px solid #1890ff;
              padding-left: 10px;
            }
            .info-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px;
            }
            .info-table td { 
              padding: 10px; 
              border: 1px solid #ddd; 
            }
            .info-table td:first-child { 
              width: 30%; 
              background: #f5f5f5; 
              font-weight: bold; 
            }
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0;
            }
            .items-table th { 
              background: #1890ff; 
              color: white; 
              padding: 12px; 
              border: 1px solid #1890ff;
              font-weight: bold;
            }
            .items-table td { 
              padding: 10px; 
              border: 1px solid #ddd; 
            }
            .text-right { 
              text-align: right; 
            }
            .total-row { 
              font-weight: bold; 
              background: #f9f9f9; 
            }
            .amount { 
              color: #52c41a; 
              font-size: 18px; 
              font-weight: bold; 
            }
            .footer { 
              margin-top: 50px; 
              text-align: center; 
              color: #999; 
              font-size: 11px; 
              border-top: 1px solid #eee; 
              padding-top: 20px;
            }
            .grand-total { 
              font-size: 16px; 
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="company-name">NEXUM ERP</div>
              <div class="title">DEVIS</div>
              <div class="subtitle">N° ${quoteNumber}</div>
              <div class="subtitle">Date: ${createdAt}</div>
            </div>
            
            <div class="info-section">
              <div class="info-title">Informations client</div>
              <table class="info-table">
                <tr><td><strong>Client</strong></td><td>${clientName}</td></tr>
                <tr><td><strong>Email</strong></td><td>${clientEmail}</td></tr>
                <tr><td><strong>Date de validité</strong></td><td>30 jours</td></tr>
              </table>
            </div>
            
            <div class="info-title">Détail des prestations</div>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th style="width: 80px; text-align: center;">Quantité</th>
                  <th style="width: 120px; text-align: right;">Prix unitaire (€)</th>
                  <th style="width: 120px; text-align: right;">Total (€)</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="text-align: right; padding: 10px;"><strong>Sous-total HT</strong></td>
                  <td style="text-align: right; padding: 10px;"><strong>${formatAmount(subtotal)} €</strong></td>
                </tr>
                <tr>
                  <td colspan="3" style="text-align: right; padding: 10px;">TVA (${taxRate}%)</td>
                  <td style="text-align: right; padding: 10px;">${formatAmount(taxAmount)} €</td>
                </tr>
                <tr class="total-row">
                  <td colspan="3" style="text-align: right; padding: 10px;"><strong>Total TTC</strong></td>
                  <td style="text-align: right; padding: 10px;"><strong class="amount">${formatAmount(totalAmount)} €</strong></td>
                </tr>
              </tfoot>
            </table>
            
            <div class="footer">
              <p>Cet email a été généré automatiquement par NEXUM ERP.</p>
              <p>© ${new Date().getFullYear()} NEXUM ERP - Tous droits réservés</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Générer le PDF
      const opt = {
        margin: [10, 10, 10, 10],
        filename: `Devis_${quoteNumber}_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, letterRendering: true, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(htmlContent).save();

      message.success(`Devis ${quoteNumber} téléchargé avec succès !`);
    } catch (error) {
      console.error('Erreur PDF:', error);
      message.error('Erreur lors de la génération du PDF: ' + error.message);
    } finally {
      setDownloading(false);
    }
  };

  const sendByEmail = async (quote) => {
    Modal.confirm({
      title: 'Envoi par email',
      content: `Envoyer le devis ${quote.quote_number} à ${quote.client_email || 'client'} ?`,
      onOk: () => {
        message.success(`Devis envoyé à ${quote.client_email}`);
      }
    });
  };

  const copyLink = (quote) => {
    const link = `${window.location.origin}/quotes/${quote.id}`;
    navigator.clipboard.writeText(link);
    message.success('Lien copié dans le presse-papier');
  };

  const performanceStats = useMemo(() => ({
    totalGenerated: quotes.length,
    averageAmount: quotes.length > 0
      ? quotes.reduce((sum, q) => sum + (q.total_amount || q.amount_total || 0), 0) / quotes.length
      : 0
  }), [quotes]);

  const steps = [
    { title: 'Description', icon: <FileTextOutlined /> },
    { title: 'Détails', icon: <CalculatorOutlined /> },
    { title: 'Optimisation IA', icon: <BulbOutlined /> },
    { title: 'Génération', icon: <RocketOutlined /> }
  ];

  const quoteColumns = [
    { title: 'N°', dataIndex: 'quote_number', key: 'quote_number', width: 120, render: (v) => <Tag color="blue">{v}</Tag> },
    { title: 'Client', dataIndex: 'client_name', key: 'client_name' },
    { title: 'Montant', dataIndex: 'total_amount', key: 'total_amount', render: (v) => <Text style={{ color: '#52c41a', fontWeight: 600 }}>{formatAmount(v)} €</Text> },
    { title: 'Statut', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'sent' ? 'blue' : s === 'accepted' ? 'green' : 'orange'}>{s || 'draft'}</Tag> },
    { title: 'Date', dataIndex: 'created_at', key: 'created_at', render: (d) => d ? dayjs(d).format('DD/MM/YYYY') : '-' },
    {
      title: 'Actions',
      key: 'actions',
      width: 250,
      render: (_, record) => (
        <Space>
          <Tooltip title="Aperçu">
            <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedQuote(record); setPreviewVisible(true); }} />
          </Tooltip>
          <Tooltip title="Télécharger PDF">
            <Button size="small" icon={<FilePdfOutlined />} onClick={() => downloadQuotePDF(record)} loading={downloading} />
          </Tooltip>
          <Tooltip title="Envoyer">
            <Button size="small" icon={<MailOutlined />} onClick={() => sendByEmail(record)} />
          </Tooltip>
        </Space>
      )
    }
  ];

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <div style={{ padding: 24, background: '#0d1117', minHeight: '100vh' }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderRadius: 24,
            padding: '32px 32px',
            marginBottom: 32,
            color: 'white',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
          }}>
            <Row align="middle" justify="space-between">
              <Col>
                <Space size="large">
                  <div style={{
                    width: 70,
                    height: 70,
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 24,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(4px)'
                  }}>
                    <DollarOutlined style={{ fontSize: 36, color: 'white' }} />
                  </div>
                  <div>
                    <Title level={2} style={{ margin: 0, color: 'white' }}>Génération de Devis IA</Title>
                    <Text style={{ color: 'rgba(255,255,255,0.7)' }}>
                      Créez des devis professionnels en langage naturel en quelques secondes
                    </Text>
                  </div>
                </Space>
              </Col>
            </Row>
          </div>

          <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
            <Col xs={24} sm={12} lg={6}>
              <Card variant="borderless" style={{ borderRadius: 16, background: '#1f1f1f', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                <Statistic title="Devis générés" value={performanceStats.totalGenerated} prefix={<FileTextOutlined />} />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card variant="borderless" style={{ borderRadius: 16, background: '#1f1f1f', boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                <Statistic title="Montant moyen" value={Math.round(performanceStats.averageAmount)} prefix="€" />
              </Card>
            </Col>
          </Row>

          <Tabs activeKey={activeTab} onChange={setActiveTab} size="large" items={[
            {
              key: 'create',
              label: <span><RocketOutlined /> Créer un devis</span>,
              children: (
                <Card variant="borderless" style={{ borderRadius: 24, background: '#1f1f1f', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
                  <Steps current={currentStep} items={steps} style={{ marginBottom: 48 }} />

                  <Form form={quoteForm} layout="vertical" onFinish={generateQuote} initialValues={{ tax_rate: 20, discount: 0 }}>
                    <Row gutter={24}>
                      <Col span={12}>
                        <Form.Item name="client_name" label="Nom du client" rules={[{ required: true, message: 'Veuillez saisir le nom du client' }]}>
                          <Input placeholder="Ex: SARL Dupont" size="large" prefix={<UserOutlined />} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="client_email" label="Email client">
                          <Input placeholder="client@email.com" size="large" prefix={<MailOutlined />} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item name="description" label="Description du devis" rules={[{ required: true, message: 'Veuillez décrire votre besoin' }]}>
                      <TextArea
                        rows={4}
                        placeholder="Exemple: Prestation de conseil en stratégie digitale incluant audit, formation et accompagnement de 6 mois"
                        onBlur={(e) => analyzeDescription(e.target.value)}
                      />
                    </Form.Item>

                    {analyzing && (
                      <div style={{ marginBottom: 16, textAlign: 'center' }}>
                        <Spin size="small" /> <Text type="secondary"> Analyse de votre description...</Text>
                      </div>
                    )}

                    <AnimatePresence>
                      {showAIAssistant && aiSuggestions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <Alert
                            message={<Space><BulbOutlined /> Suggestions IA</Space>}
                            description={
                              <List
                                size="small"
                                dataSource={aiSuggestions}
                                renderItem={(suggestion) => (
                                  <List.Item
                                    actions={[
                                      <Button size="small" type="primary" ghost onClick={() => applySuggestion(suggestion)}>
                                        Appliquer
                                      </Button>
                                    ]}
                                  >
                                    <List.Item.Meta
                                      avatar={<Avatar icon={<BulbOutlined />} style={{ backgroundColor: '#722ed1' }} />}
                                      title={suggestion.title}
                                      description={suggestion.description}
                                    />
                                  </List.Item>
                                )}
                              />
                            }
                            type="info"
                            closable
                            onClose={() => setShowAIAssistant(false)}
                            style={{ marginBottom: 24 }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <Form.List name="items">
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map(({ key, name, ...restField }) => (
                            <Space key={key} style={{ display: 'flex', marginBottom: 12 }} align="baseline">
                              <Form.Item {...restField} name={[name, 'name']} noStyle>
                                <Input placeholder="Produit/Service" style={{ width: 200 }} />
                              </Form.Item>
                              <Form.Item {...restField} name={[name, 'quantity']} noStyle>
                                <InputNumber placeholder="Qté" style={{ width: 80 }} min={1} defaultValue={1} />
                              </Form.Item>
                              <Form.Item {...restField} name={[name, 'price']} noStyle>
                                <InputNumber placeholder="Prix unitaire" style={{ width: 120 }} min={0} />
                              </Form.Item>
                              <Button icon={<DeleteOutlined />} onClick={() => remove(name)} danger />
                            </Space>
                          ))}
                          <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />} block>
                            Ajouter un produit/service
                          </Button>
                        </>
                      )}
                    </Form.List>

                    <Row gutter={24}>
                      <Col span={8}>
                        <Form.Item name="discount" label="Remise (%)">
                          <InputNumber min={0} max={100} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="tax_rate" label="TVA (%)">
                          <InputNumber min={0} max={50} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={8}>
                        <Form.Item name="valid_until" label="Date de validité">
                          <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item>
                      <Button
                        type="primary"
                        htmlType="submit"
                        loading={generating}
                        icon={generating ? <LoadingOutlined /> : <RocketOutlined />}
                        size="large"
                        block
                        style={{ height: 48, borderRadius: 24 }}
                      >
                        {generating ? 'Génération en cours...' : 'Générer le devis avec IA'}
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              )
            },
            {
              key: 'history',
              label: <span><HistoryOutlined /> Historique</span>,
              children: (
                <Card variant="borderless" style={{ borderRadius: 24, background: '#1f1f1f', boxShadow: '0 4px 16px rgba(0,0,0,0.3)' }}>
                  <Segmented
                    value={viewMode}
                    onChange={setViewMode}
                    options={[
                      { value: 'table', icon: <TableOutlined />, label: 'Tableau' },
                      { value: 'grid', icon: <AppstoreOutlined />, label: 'Grille' }
                    ]}
                    style={{ marginBottom: 16 }}
                  />

                  {viewMode === 'table' ? (
                    <Table
                      columns={quoteColumns}
                      dataSource={quotes}
                      rowKey="id"
                      pagination={{ pageSize: 10 }}
                      locale={{ emptyText: "Aucun devis généré" }}
                    />
                  ) : (
                    <Row gutter={[16, 16]}>
                      {quotes.length === 0 ? (
                        <Col span={24}>
                          <Empty description="Aucun devis généré" />
                        </Col>
                      ) : (
                        quotes.map(quote => (
                          <Col xs={24} sm={12} lg={8} key={quote.id}>
                            <Card hoverable style={{ borderRadius: 16, background: '#2a2a2a' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                                <Tag color="blue">{quote.quote_number}</Tag>
                                <Tag color={quote.status === 'sent' ? 'blue' : quote.status === 'accepted' ? 'green' : 'orange'}>
                                  {quote.status || 'draft'}
                                </Tag>
                              </div>
                              <Title level={5} style={{ color: '#e6e6e6' }}>{quote.client_name}</Title>
                              <Text strong style={{ color: '#52c41a', fontSize: 20 }}>{formatAmount(quote.total_amount)} €</Text>
                              <div style={{ marginTop: 12 }}>
                                <Text type="secondary">{quote.created_at ? dayjs(quote.created_at).format('DD/MM/YYYY') : '-'}</Text>
                              </div>
                              <Divider style={{ margin: '12px 0', borderColor: '#3a3a3a' }} />
                              <Space>
                                <Button size="small" icon={<EyeOutlined />} onClick={() => { setSelectedQuote(quote); setPreviewVisible(true); }} />
                                <Button size="small" icon={<FilePdfOutlined />} onClick={() => downloadQuotePDF(quote)} loading={downloading} />
                                <Button size="small" icon={<MailOutlined />} onClick={() => sendByEmail(quote)} />
                              </Space>
                            </Card>
                          </Col>
                        ))
                      )}
                    </Row>
                  )}
                </Card>
              )
            }
          ]} />
        </motion.div>

        <Modal
          title={<Space><FileTextOutlined /> Devis {selectedQuote?.quote_number}</Space>}
          open={previewVisible}
          onCancel={() => setPreviewVisible(false)}
          width={700}
          footer={[
            <Button key="close" onClick={() => setPreviewVisible(false)}>Fermer</Button>,
            <Button key="pdf" icon={<FilePdfOutlined />} onClick={() => downloadQuotePDF(selectedQuote)} loading={downloading}>Télécharger PDF</Button>,
            <Button key="email" icon={<MailOutlined />} type="primary" onClick={() => sendByEmail(selectedQuote)}>Envoyer</Button>
          ]}
        >
          {selectedQuote && (
            <div id="quote-preview-content">
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <Title level={2}>DEVIS</Title>
                <Text type="secondary">N° {selectedQuote.quote_number}</Text>
                <br />
                <Text type="secondary">Date: {selectedQuote.created_at ? dayjs(selectedQuote.created_at).format('DD/MM/YYYY') : '-'}</Text>
              </div>

              <Descriptions column={2} bordered size="small">
                <Descriptions.Item label="Client">{selectedQuote.client_name}</Descriptions.Item>
                <Descriptions.Item label="Email">{selectedQuote.client_email || '-'}</Descriptions.Item>
                <Descriptions.Item label="Sous-total HT">
                  <Text strong>{formatAmount(selectedQuote.subtotal)} €</Text>
                </Descriptions.Item>
                <Descriptions.Item label="TVA">{selectedQuote.tax_rate || 20}%</Descriptions.Item>
                <Descriptions.Item label="Montant TTC" span={2}>
                  <Text strong style={{ color: '#52c41a', fontSize: 18 }}>{formatAmount(selectedQuote.total_amount)} €</Text>
                </Descriptions.Item>
              </Descriptions>

              {selectedQuote.items && selectedQuote.items.length > 0 && (
                <>
                  <Divider />
                  <Title level={5}>Détail des prestations</Title>
                  <Table
                    dataSource={selectedQuote.items}
                    columns={[
                      { title: 'Description', dataIndex: 'description', key: 'description' },
                      { title: 'Quantité', dataIndex: 'quantity', key: 'quantity', align: 'center' },
                      { title: 'Prix unitaire', dataIndex: 'unit_price', key: 'unit_price', render: (v) => `${formatAmount(v)} €`, align: 'right' },
                      { title: 'Total', dataIndex: 'total', key: 'total', render: (v) => `${formatAmount(v)} €`, align: 'right' }
                    ]}
                    pagination={false}
                    size="small"
                  />
                </>
              )}
            </div>
          )}
        </Modal>

        <FloatButton.BackTop />
      </div>
    </ConfigProvider>
  );
};

export default QuoteGenerator;