// src/modules/ocr/OCRScanner.js
import React, { useState, useCallback } from 'react';
import {
  Layout, Card, Row, Col, Button, Upload, message,
  Typography, Space, Progress, Table, Tabs, Descriptions,
  Tag, Statistic, Divider, Alert, Modal, Form, Input,
  Select, DatePicker, Steps, Result, Spin
} from 'antd';
import {
  UploadOutlined, FileTextOutlined, ScanOutlined,
  SaveOutlined, EditOutlined, DeleteOutlined,
  CheckCircleOutlined, WarningOutlined,
  ShoppingOutlined, UserOutlined, DollarOutlined,
  FilePdfOutlined, FileImageOutlined,
  InboxOutlined, RobotOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import './OCRScanner.css';

// Ne pas importer useDropzone directement pour éviter les problèmes de hooks
// On va utiliser Upload d'Ant Design à la place

const { Title, Text } = Typography;
const { Option } = Select;
const { Step } = Steps;
const { Dragger } = Upload;

const OCRScanner = () => {
  const [files, setFiles] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [extractedData, setExtractedData] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [errors, setErrors] = useState([]);
  const [extractedText, setExtractedText] = useState('');

  // Configuration du téléchargement avec Ant Design
  const uploadProps = {
    name: 'file',
    multiple: true,
    accept: '.pdf,.png,.jpg,.jpeg,.tiff,.bmp',
    beforeUpload: (file) => {
      // Vérifier la taille (10MB max)
      const isLessThan10MB = file.size / 1024 / 1024 < 10;
      if (!isLessThan10MB) {
        message.error(`${file.name} dépasse la taille limite de 10MB`);
        return Upload.LIST_IGNORE;
      }
      
      // Ajouter le fichier à la liste
      setFiles(prev => [...prev, {
        file,
        preview: URL.createObjectURL(file),
        id: Date.now() + Math.random(),
        name: file.name,
        size: file.size
      }]);
      
      return false; // Empêcher l'upload automatique
    },
    onRemove: (file) => {
      setFiles(prev => prev.filter(f => f.file.uid !== file.uid));
    },
    fileList: files.map(f => ({
      uid: f.id,
      name: f.name,
      status: 'done',
      size: f.size
    }))
  };

  // Fonction de scan simulée (remplacez par votre logique OCR réelle)
  const scanDocument = async () => {
    if (files.length === 0) {
      message.warning('Veuillez d\'abord ajouter des fichiers');
      return;
    }

    setScanning(true);
    setCurrentStep(1);
    setErrors([]);

    try {
      const formData = new FormData();
      formData.append('file', files[0].file);
      formData.append('document_type', 'invoice');
      
      const uploadRes = await api.post('/ocr/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const uploadData = uploadRes.data;
      
      setScanProgress(50);
      
      const processRes = await api.post(`/ocr/process/${uploadData.id}`);
      const processData = processRes.data;
      
      setScanProgress(100);
      
      const data = processData.extracted_data || {};
      
      setExtractedData({
        client: data.client || {},
        invoices: data.invoices || [],
        items: data.items || [],
        totals: data.totals || {}
      });
      setExtractedText(processData.text || JSON.stringify(data, null, 2));
      setCurrentStep(3);
      
      message.success(`Fichier scanné avec succès`);
    } catch (error) {
      console.error('Erreur OCR:', error);
      setErrors(prev => [...prev, error.message]);
      message.error('Erreur lors du scan');
      setCurrentStep(0);
    } finally {
      setScanning(false);
    }
  };

  // Sauvegarder les données
  const saveData = () => {
    message.success('Données sauvegardées avec succès');
    setModalVisible(false);
  };

  // Colonnes du tableau des articles
  const itemColumns = [
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Quantité',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
    },
    {
      title: 'Prix unitaire (€)',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 150,
      render: (price) => price?.toFixed(2)
    },
    {
      title: 'Total (€)',
      dataIndex: 'total',
      key: 'total',
      width: 150,
      render: (total) => total?.toFixed(2)
    }
  ];

  return (
    <Layout className="ocr-scanner">
      {/* Header */}
      <div className="ocr-header">
        <div className="header-content">
          <Space align="center" size="large">
            <RobotOutlined className="header-icon" />
            <div>
              <Title level={2} style={{ margin: 0, color: 'white' }}>Scanner de factures OCR</Title>
              <Text style={{ color: 'rgba(255,255,255,0.8)' }}>
                Importez vos factures (PDF ou images) pour extraire automatiquement les données
              </Text>
            </div>
          </Space>
        </div>
      </div>

      <div className="ocr-content">
        <Row gutter={[24, 24]}>
          {/* Colonne gauche - Upload */}
          <Col xs={24} lg={10}>
            <Card className="upload-card">
              <Steps current={currentStep} size="small" style={{ marginBottom: 24 }}>
                <Step title="Import" icon={<UploadOutlined />} />
                <Step title="Scan" icon={<ScanOutlined />} />
                <Step title="Validation" icon={<CheckCircleOutlined />} />
              </Steps>

              {/* Zone de drop avec Upload Ant Design */}
              <Dragger {...uploadProps}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">Cliquez ou glissez des fichiers ici</p>
                <p className="ant-upload-hint">
                  Support PDF, PNG, JPG, TIFF (max 10MB)
                </p>
              </Dragger>

              {/* Barre de progression */}
              {scanning && (
                <div className="progress-section">
                  <Progress percent={scanProgress} status="active" />
                  <Text type="secondary">Scan en cours...</Text>
                </div>
              )}

              {/* Boutons d'action */}
              <div className="action-buttons">
                <Button
                  type="primary"
                  icon={<ScanOutlined />}
                  onClick={scanDocument}
                  loading={scanning}
                  disabled={files.length === 0}
                  block
                  size="large"
                >
                  Lancer le scan
                </Button>
              </div>

              {/* Messages d'erreur */}
              {errors.length > 0 && (
                <Alert
                  message="Erreurs détectées"
                  description={errors.join(', ')}
                  type="error"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}
            </Card>
          </Col>

          {/* Colonne droite - Résultats */}
          <Col xs={24} lg={14}>
            {extractedData ? (
              <Card className="results-card" loading={scanning}>
                <Tabs defaultActiveKey="1"
          items={[
            {
              key: '1',
              label: <span><UserOutlined />Client</span>,
              children: (
                <Descriptions bordered column={1}>
                      <Descriptions.Item label="Nom">
                        {extractedData.client?.name || 'Non détecté'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Email">
                        {extractedData.client?.email || 'Non détecté'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Téléphone">
                        {extractedData.client?.phone || 'Non détecté'}
                      </Descriptions.Item>
                      <Descriptions.Item label="Adresse">
                        {extractedData.client?.address || 'Non détecté'}
                      </Descriptions.Item>
                      <Descriptions.Item label="SIRET">
                        {extractedData.client?.siret || 'Non détecté'}
                      </Descriptions.Item>
                    </Descriptions>
                    
                    <div style={{ marginTop: 16 }}>
                      <Button icon={<EditOutlined />}>Modifier</Button>
                    </div>
                  </TabPane>

                  <TabPane 
                    tab={<span><ShoppingOutlined />Articles</span>} 
                    key="2"
                  >
                    <Table
                      columns={itemColumns}
                      dataSource={extractedData.items}
                      rowKey={(record, index) => index}
                      pagination={false}
                      size="small"
                      footer={() => (
                        <div style={{ textAlign: 'right' }}>
                          <Text strong>Total HT: </Text>
                          <Text>{extractedData?.totals?.subtotal?.toFixed(2) || '0.00'} €</Text>
                          <br />
                          <Text strong>TVA: </Text>
                          <Text>{extractedData?.totals?.tax?.toFixed(2) || '0.00'} €</Text>
                          <br />
                          <Text strong>Total TTC: </Text>
                          <Text type="success">{extractedData?.totals?.total?.toFixed(2) || '0.00'} €</Text>
                        </div>
                      )}
                    />
                  </TabPane>

                  <TabPane 
                    tab={<span><FileTextOutlined />Texte extrait</span>} 
                    key="3"
                  >
                    <pre className="extracted-text">
                      {extractedText}
                    </pre>
              )
            }
          ]}
        />

                <Divider />

                <div className="action-bar">
                  <Space>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={() => setModalVisible(true)}
                    >
                      Sauvegarder
                    </Button>
                    <Button icon={<EditOutlined />}>
                      Modifier
                    </Button>
                  </Space>
                </div>
              </Card>
            ) : (
              <Card className="empty-state">
                <Result
                  icon={<FileTextOutlined />}
                  title="Aucune donnée extraite"
                  subTitle="Importez des factures et lancez le scan pour voir les résultats"
                />
              </Card>
            )}
          </Col>
        </Row>
      </div>

      {/* Modal de sauvegarde */}
      <Modal
        title="Sauvegarder les données"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            Annuler
          </Button>,
          <Button key="save" type="primary" onClick={saveData}>
            Sauvegarder
          </Button>,
        ]}
      >
        <Form layout="vertical">
          <Form.Item label="Module de destination" required>
            <Select defaultValue="sales">
              <Option value="sales">Ventes</Option>
              <Option value="purchase">Achats</Option>
              <Option value="accounting">Comptabilité</Option>
              <Option value="crm">CRM</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Catégorie">
            <Select>
              <Option value="invoice">Facture fournisseur</Option>
              <Option value="invoice_client">Facture client</Option>
              <Option value="quote">Devis</Option>
              <Option value="receipt">Reçu</Option>
            </Select>
          </Form.Item>
          <Form.Item label="Notes">
            <Input.TextArea rows={4} />
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
};

export default OCRScanner;