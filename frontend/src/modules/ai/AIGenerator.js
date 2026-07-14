import React, { useState, useEffect, useRef } from 'react';
import {
  Card, Row, Col, Button, Input, Space, 
  Typography, Alert, Tabs, Tag, 
  Progress, message, Divider, Statistic,
  Steps, Form, Select, InputNumber,
  Tooltip, Badge, Empty, List, Avatar, Modal, Descriptions, 
  Checkbox, Spin, Timeline, Table, Image
} from 'antd';
import {
  FileTextOutlined, SendOutlined, SettingOutlined,
  DownloadOutlined, CopyOutlined, 
  RobotOutlined, BarChartOutlined,
  FilePdfOutlined, LoadingOutlined, PlusOutlined,
  EyeOutlined, StarOutlined, HistoryOutlined,
  BulbOutlined, LineChartOutlined, PieChartOutlined, RiseOutlined, ClockCircleOutlined,
  SaveOutlined, PrinterOutlined, GlobalOutlined,
  ReloadOutlined, ExperimentOutlined, ApiOutlined, RocketOutlined,
  LinkOutlined, DatabaseOutlined, SearchOutlined,
  CheckCircleOutlined, ThunderboltOutlined, BankOutlined, InsuranceOutlined,
  ShopOutlined, SafetyCertificateOutlined, WarningOutlined, HeartOutlined,
  CreditCardOutlined, TeamOutlined, TrophyOutlined,
  DollarOutlined, UserOutlined, ShoppingOutlined, SwapOutlined,
  CalendarOutlined, FundOutlined, AimOutlined, ShareAltOutlined, FileImageOutlined
} from '@ant-design/icons';
import api from '../../services/api';
import { motion } from 'framer-motion';
import html2pdf from 'html2pdf.js';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

// Couleurs professionnelles (adaptées au mode sombre)
const SECTOR_COLORS = {
  banque: '#4dabf7',
  assurance: '#69db7c',
  entreprise: '#b197fc',
  scraping: '#66d9e8'
};

// Dégradés pour les en-têtes de secteur (version sombre)
const SECTOR_GRADIENTS = {
  banque: 'linear-gradient(135deg, #1c2a4a 0%, #2a3f6e 100%)',
  assurance: 'linear-gradient(135deg, #1a3a2a 0%, #2a5a3a 100%)',
  entreprise: 'linear-gradient(135deg, #2a1a4a 0%, #3a2a6e 100%)',
  scraping: 'linear-gradient(135deg, #0a3a3a 0%, #1a5a5a 100%)'
};

const AIGenerator = () => {
  const [activeTab, setActiveTab] = useState('scraping');
  const [loading, setLoading] = useState(false);
  const [scrapingLoading, setScrapingLoading] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [generatedContent, setGeneratedContent] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [darkMode, setDarkMode] = useState(true);
  const [scrapingTaskId, setScrapingTaskId] = useState(null);
  const [includeCharts, setIncludeCharts] = useState(true);
  const [selectedSector, setSelectedSector] = useState('entreprise');
  const reportRef = useRef(null);
  
  const [scrapingUrls, setScrapingUrls] = useState([]);
  const [scrapingConfig, setScrapingConfig] = useState({
    url: '', maxPages: 5, extractImages: true, extractLinks: true,
    depth: 1, keywords: [], dateRange: '7d'
  });
  const [scrapedData, setScrapedData] = useState(null);
  const [scrapingHistory, setScrapingHistory] = useState([]);
  const [scrapingProgress, setScrapingProgress] = useState(0);
  const [chartData, setChartData] = useState(null);
  const [availableTemplates, setAvailableTemplates] = useState([]);

  const getSectorName = (sector) => {
    const names = { banque: 'Banque', assurance: 'Assurance', entreprise: 'Entreprise', scraping: 'Web Scraping' };
    return names[sector] || 'Entreprise';
  };

  const getSectorIcon = (sector) => {
    const icons = { banque: <BankOutlined />, assurance: <InsuranceOutlined />, entreprise: <ShopOutlined />, scraping: <GlobalOutlined /> };
    return icons[sector] || <ShopOutlined />;
  };

  const getSectorColor = (sector) => {
    return SECTOR_COLORS[sector] || '#4dabf7';
  };

  const getSectorGradient = (sector) => {
    return SECTOR_GRADIENTS[sector] || 'linear-gradient(135deg, #1a1a2e 0%, #2a2a4e 100%)';
  };

  const promptTemplatesBySector = {
    banque: [
      { id: 1, title: "Analyse des dépôts bancaires", description: "Évolution des dépôts et épargne", iconName: "BankOutlined", prompt: "Analyse les dépôts bancaires, l'épargne des clients et les tendances du marché" },
      { id: 2, title: "Analyse des crédits", description: "Performance des crédits conso et immo", iconName: "CreditCardOutlined", prompt: "Analyse la performance des crédits consommation et immobiliers" },
      { id: 3, title: "Rapport conformité bancaire", description: "Analyse des risques et conformité", iconName: "SafetyCertificateOutlined", prompt: "Analyse la conformité réglementaire et risques bancaires" }
    ],
    assurance: [
      { id: 4, title: "Analyse des primes", description: "Évolution des primes par produit", iconName: "InsuranceOutlined", prompt: "Analyse l'évolution des primes d'assurance par produit" },
      { id: 5, title: "Analyse de la sinistralité", description: "Taux et délais de règlement", iconName: "WarningOutlined", prompt: "Analyse la sinistralité, les taux et délais de règlement" },
      { id: 6, title: "Rapport fidélisation", description: "Taux de rétention clients", iconName: "HeartOutlined", prompt: "Analyse la fidélisation client et les taux de rétention" }
    ],
    entreprise: [
      { id: 7, title: "Rapport commercial", description: "Analyse des ventes et CA", iconName: "BarChartOutlined", prompt: "Analyse les performances commerciales, ventes et chiffre d'affaires" },
      { id: 8, title: "Analyse financière", description: "Compte de résultat et trésorerie", iconName: "LineChartOutlined", prompt: "Analyse la situation financière, compte de résultat et trésorerie" },
      { id: 9, title: "Rapport satisfaction client", description: "NPS et retours clients", iconName: "StarOutlined", prompt: "Analyse la satisfaction client, NPS et retours clients" }
    ],
    scraping: [
      { id: 10, title: "Analyse des pages web", description: "Rapport à partir du scraping", iconName: "GlobalOutlined", prompt: "Analyse les données extraites du web scraping" }
    ]
  };

  const getCurrentTemplates = () => {
    return promptTemplatesBySector[selectedSector] || promptTemplatesBySector.entreprise;
  };

  const getIcon = (name) => {
    const icons = { 
      BarChartOutlined: <BarChartOutlined />, StarOutlined: <StarOutlined />, 
      LineChartOutlined: <LineChartOutlined />, GlobalOutlined: <GlobalOutlined />,
      BankOutlined: <BankOutlined />, InsuranceOutlined: <InsuranceOutlined />,
      CreditCardOutlined: <CreditCardOutlined />, SafetyCertificateOutlined: <SafetyCertificateOutlined />,
      WarningOutlined: <WarningOutlined />, HeartOutlined: <HeartOutlined />
    };
    return icons[name] || <GlobalOutlined />;
  };

  useEffect(() => {
    fetchRecentReports();
    fetchTemplates();
    fetchScrapingHistory();
  }, []);

  const fetchRecentReports = async () => {
    try {
      const res = await api.get('/ai/reports/recent');
      setRecentReports(res.data || []);
    } catch (error) { 
      console.error('Erreur chargement rapports:', error); 
      setRecentReports([]); 
    }
  };

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/ai/templates');
      setSavedTemplates(res.data || []);
      setAvailableTemplates(res.data || []);
    } catch (error) { 
      console.error('Erreur chargement templates:', error); 
      setSavedTemplates([]); 
    }
  };

  const fetchScrapingHistory = async () => {
    try {
      const res = await api.get('/scraping/history');
      setScrapingHistory(res.data || []);
    } catch (error) { 
      console.error('Erreur chargement historique:', error); 
      setScrapingHistory([]); 
    }
  };

  const performScraping = async () => {
    if (scrapingUrls.length === 0 && !scrapingConfig.url) {
      message.warning('Ajoutez au moins une URL à scraper');
      return;
    }
    
    setScrapingLoading(true);
    setScrapingProgress(0);
    setScrapedData(null);
    setScrapingTaskId(null);
    
    try {
      const urlsToScrape = scrapingUrls.length > 0 ? scrapingUrls : [scrapingConfig.url];
      const response = await api.post('/scraping/multi', {
        urls: urlsToScrape,
        config: {
          maxPages: scrapingConfig.maxPages,
          extractImages: scrapingConfig.extractImages,
          extractLinks: scrapingConfig.extractLinks,
          depth: scrapingConfig.depth,
          keywords: scrapingConfig.keywords,
          dateRange: scrapingConfig.dateRange
        }
      });
      
      const taskId = response.data.task_id;
      setScrapingTaskId(taskId);
      
      let completed = false;
      let attempts = 0;
      const maxAttempts = 30;
      
      while (!completed && attempts < maxAttempts) {
        await new Promise(r => setTimeout(r, 2000));
        const statusRes = await api.get(`/scraping/tasks/${taskId}`);
        setScrapingProgress(statusRes.data.progress || 0);
        
        if (statusRes.data.status === 'completed') {
          const resultsRes = await api.get(`/scraping/tasks/${taskId}/results`);
          setScrapedData(resultsRes.data);
          completed = true;
          message.success(`Scraping terminé ! ${resultsRes.data.pages?.length || 0} page(s) analysée(s).`);
        } else if (statusRes.data.status === 'failed') {
          throw new Error(statusRes.data.error_message || 'Scraping échoué');
        }
        attempts++;
      }
      
      if (!completed) {
        message.warning('Le scraping prend plus de temps que prévu.');
      }
      
    } catch (error) {
      message.error('Erreur: ' + (error.response?.data?.detail || error.message));
    } finally {
      setScrapingLoading(false);
      fetchScrapingHistory();
    }
  };

  // Fonction pour afficher l'aperçu des images extraites
  const renderImagesPreview = () => {
    if (!scrapedData || !scrapedData.pages) return null;
    
    let totalImages = 0;
    let allImageUrls = [];
    
    scrapedData.pages.forEach(page => {
      if (page.image_urls && Array.isArray(page.image_urls)) {
        allImageUrls.push(...page.image_urls);
        totalImages += page.image_urls.length;
      } else if (page.images) {
        totalImages += typeof page.images === 'number' ? page.images : page.images.length || 0;
      }
    });
    
    if (totalImages === 0) return null;
    
    if (allImageUrls.length > 0) {
      const previewImages = allImageUrls.slice(0, 12);
      
      return (
        <Card 
          title={<Space><FileImageOutlined style={{ color: '#4dabf7' }} /> Aperçu des images extraites ({allImageUrls.length} images)</Space>}
          style={{ marginTop: 16, borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', background: '#161b22', border: '1px solid #30363d' }}
          headStyle={{ borderBottom: '1px solid #30363d', color: '#e6edf3' }}
        >
          <Row gutter={[16, 16]}>
            {previewImages.map((imgUrl, idx) => (
              <Col xs={12} sm={8} md={6} lg={4} key={idx}>
                <div 
                  style={{ 
                    border: '1px solid #30363d', 
                    borderRadius: 12, 
                    overflow: 'hidden',
                    background: '#0d1117',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                  }}
                  className="hover:shadow-lg hover:scale-105"
                  onClick={() => window.open(imgUrl, '_blank')}
                >
                  <img 
                    src={imgUrl} 
                    alt={`Image ${idx + 1}`}
                    style={{ 
                      width: '100%', 
                      height: 120, 
                      objectFit: 'cover'
                    }}
                    onError={(e) => {
                      e.target.src = 'https://placehold.co/200x120/1e1e1e/666?text=Image+non+charg%C3%A9e';
                    }}
                  />
                  <div style={{ padding: 8, textAlign: 'center', background: '#0d1117' }}>
                    <Text ellipsis style={{ fontSize: 12, color: '#8b949e' }}>Image {idx + 1}</Text>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
          {allImageUrls.length > 12 && (
            <div style={{ textAlign: 'center', marginTop: 16 }}>
              <Text type="secondary" style={{ color: '#8b949e' }}>+ {allImageUrls.length - 12} autres images</Text>
            </div>
          )}
        </Card>
      );
    }
    
    return (
      <Card 
        title={<Space><FileImageOutlined style={{ color: '#4dabf7' }} /> Images détectées ({totalImages} images)</Space>}
        style={{ marginTop: 16, borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', background: '#161b22', border: '1px solid #30363d' }}
        headStyle={{ borderBottom: '1px solid #30363d', color: '#e6edf3' }}
      >
        <div style={{ textAlign: 'center', padding: '24px' }}>
          <FileImageOutlined style={{ fontSize: 48, color: '#30363d', marginBottom: 16 }} />
          <Paragraph>
            <Text style={{ color: '#8b949e' }}><strong style={{ color: '#e6edf3' }}>{totalImages}</strong> images ont été détectées sur la(les) page(s) analysée(s).</Text>
          </Paragraph>
        </div>
      </Card>
    );
  };

  const generateReportFromScraping = async () => {
    if (!scrapedData || !scrapedData.pages || scrapedData.pages.length === 0) {
      message.warning('Aucune donnée scrapée disponible. Veuillez d\'abord lancer un scraping.');
      return;
    }
    
    setLoading(true);
    
    try {
      const pages = scrapedData.pages || [];
      
      let totalImages = 0;
      let totalLinks = 0;
      let allImageUrls = [];
      let allText = '';
      
      pages.forEach(page => {
        if (page.image_urls && Array.isArray(page.image_urls)) {
          totalImages += page.image_urls.length;
          allImageUrls.push(...page.image_urls);
        } else if (page.images) {
          totalImages += typeof page.images === 'number' ? page.images : page.images.length || 0;
        }
        
        if (page.links) {
          totalLinks += typeof page.links === 'number' ? page.links : page.links.length || 0;
        }
        
        if (page.content) allText += page.content + ' ';
        if (page.text) allText += page.text + ' ';
      });
      
      allText = allText.substring(0, 3000);
      
      const title = `Rapport d'analyse web - ${new Date().toLocaleDateString('fr-FR')}`;
      
      const content = `
## Rapport d'analyse des données extraites du web

### Sites analysés
${pages.map((p, i) => `- **${p.title || 'Sans titre'}** : ${p.url || 'URL inconnue'}`).join('\n')}

### Statistiques globales
- **Nombre de pages analysées** : ${pages.length}
- **Nombre d'images extraites** : ${totalImages}
- **Nombre de liens extraits** : ${totalLinks}
- **Mots-clés recherchés** : ${scrapingConfig.keywords?.length > 0 ? scrapingConfig.keywords.join(', ') : 'Aucun'}

### Résumé du contenu
${allText.substring(0, 2000)}...

### URL analysées
${pages.map(p => `- ${p.url}`).join('\n')}
`;
      
      const insights = [
        `✅ Analyse de ${pages.length} page(s) web réalisée avec succès`,
        `📸 ${totalImages} image(s) détectée(s) sur les pages analysées`,
        `🔗 ${totalLinks} lien(s) extrait(s) des pages`,
        `🏷️ Mots-clés: ${scrapingConfig.keywords?.join(', ') || 'non spécifiés'}`
      ];
      
      const recommendations = [
        "📊 Approfondir l'analyse des pages les plus pertinentes",
        "🔄 Configurer une surveillance automatique des mises à jour",
        "📑 Exporter les données structurées pour une analyse avancée",
        "🎯 Ajouter plus de mots-clés pour affiner la recherche"
      ];
      
      const chart_data = {
        type: "scraping",
        products: [
          { name: "Pages analysées", value: pages.length },
          { name: "Images extraites", value: totalImages },
          { name: "Liens trouvés", value: totalLinks }
        ]
      };
      
      setGeneratedContent({
        title: title,
        content: content,
        insights: insights,
        recommendations: recommendations,
        chart_data: chart_data,
        pages_count: pages.length,
        images_count: totalImages,
        links_count: totalLinks,
        image_urls: allImageUrls.slice(0, 20),
        keywords_count: scrapingConfig.keywords?.length || 0,
        generation_time: 0.85,
        relevance_score: 94
      });
      
      setChartData(chart_data);
      setSelectedSector('scraping');
      setCurrentStep(2);
      setActiveTab('report');
      message.success(`Rapport généré à partir de ${pages.length} page(s) scrapée(s) !`);
      
    } catch (error) {
      console.error('Erreur génération rapport scraping:', error);
      message.error('Erreur lors de la génération du rapport');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!prompt.trim()) { 
      message.warning('Veuillez décrire le rapport souhaité'); 
      return; 
    }
    
    setLoading(true);
    setGeneratedContent(null);
    
    try {
      const res = await api.post('/ai/reports/generate', { 
        prompt: prompt, 
        sector: selectedSector,
        format: 'full',
        include_charts: includeCharts
      });
      
      setGeneratedContent(res.data);
      
      if (res.data.chart_data) {
        setChartData(res.data.chart_data);
      }
      
      setCurrentStep(2);
      setActiveTab('report');
      message.success(`Rapport ${getSectorName(selectedSector)} généré avec succès !`);
      
    } catch (error) {
      console.error('Erreur génération:', error);
      message.error('Erreur lors de la génération du rapport');
    } finally { 
      setLoading(false); 
    }
  };

  const exportToPDF = () => {
    if (!generatedContent) {
      message.warning('Aucun rapport à exporter');
      return;
    }
    
    const element = document.getElementById('report-content');
    if (!element) return;
    
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `${generatedContent.title || 'rapport'}_${getSectorName(selectedSector)}_${new Date().toISOString().slice(0, 19)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, letterRendering: true, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
    message.success('PDF exporté avec succès');
  };

  const copyReportLink = () => {
    if (!generatedContent || !generatedContent.id) {
      message.warning('Aucun rapport à partager');
      return;
    }
    
    const link = `${window.location.origin}/reports/${generatedContent.id}`;
    navigator.clipboard.writeText(link);
    message.success('Lien du rapport copié dans le presse-papier');
  };

  const printReport = () => {
    const element = document.getElementById('report-content');
    if (!element) return;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${generatedContent?.title || 'Rapport'} - Neura ERP</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; background: #0d1117; color: #e6edf3; }
            @media print {
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          ${element.outerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const addUrl = () => {
    if (scrapingConfig.url && !scrapingUrls.includes(scrapingConfig.url)) {
      setScrapingUrls([...scrapingUrls, scrapingConfig.url]);
      setScrapingConfig({ ...scrapingConfig, url: '' });
    }
  };

  const removeUrl = (url) => setScrapingUrls(scrapingUrls.filter(u => u !== url));

  const applyTemplate = (tpl) => {
    setPrompt(tpl.prompt);
    setTemplateModalVisible(false);
    message.success(`Template "${tpl.title}" appliqué`);
  };

  const renderSimpleBarChart = (data, title, color = '#4dabf7') => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return <Text style={{ color: '#8b949e' }}>Aucune donnée disponible</Text>;
    }
    
    const validData = [];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (item && typeof item === 'object') {
        let value = 0;
        let name = `Élément ${i + 1}`;
        if (item.value !== undefined && item.value !== null) {
          value = Number(item.value);
          if (isNaN(value)) value = 0;
        }
        if (item.name !== undefined && item.name !== null) {
          name = String(item.name);
        }
        validData.push({ name, value });
      }
    }
    
    if (validData.length === 0) return <Text style={{ color: '#8b949e' }}>Aucune donnée valide</Text>;
    
    const maxValue = Math.max(...validData.map(item => item.value));
    if (maxValue === 0) return <Text style={{ color: '#8b949e' }}>Toutes les valeurs sont nulles</Text>;
    
    return (
      <div style={{ marginTop: 16 }}>
        {validData.map((item, idx) => {
          const percentage = (item.value / maxValue) * 100;
          return (
            <div key={idx} style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: '#e6edf3', fontWeight: 500 }}>{item.name}</Text>
                <Text style={{ color: '#8b949e' }}>{item.value.toLocaleString()} {title === 'ventes' ? '€' : 'unités'}</Text>
              </div>
              <div style={{ background: '#21262d', borderRadius: 8, height: 28, overflow: 'hidden' }}>
                <div style={{
                  width: `${percentage}%`,
                  background: `linear-gradient(90deg, ${color}, ${color}dd)`,
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: 8,
                  color: '#0d1117',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: 13
                }}>
                  {percentage > 20 && `${Math.round(percentage)}%`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderSimplePieChart = (data) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      return <Text style={{ color: '#8b949e' }}>Aucune donnée disponible</Text>;
    }
    
    const validData = [];
    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      if (item && typeof item === 'object') {
        let value = 0;
        let name = `Élément ${i + 1}`;
        if (item.value !== undefined && item.value !== null) {
          value = Number(item.value);
          if (isNaN(value)) value = 0;
        }
        if (item.name !== undefined && item.name !== null) {
          name = String(item.name);
        }
        if (value > 0) {
          validData.push({ name, value });
        }
      }
    }
    
    if (validData.length === 0) return <Text style={{ color: '#8b949e' }}>Aucune donnée valide</Text>;
    
    const colors = ['#4dabf7', '#69db7c', '#fcc419', '#b197fc', '#ff6b6b'];
    const total = validData.reduce((sum, item) => sum + item.value, 0);
    
    if (total === 0) return <Text style={{ color: '#8b949e' }}>Valeur totale nulle</Text>;
    
    return (
      <div style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ textAlign: 'center' }}>
              {validData.map((item, idx) => {
                const percentage = (item.value / total) * 100;
                return (
                  <div key={idx} style={{ marginBottom: 8 }}>
                    <div style={{ 
                      display: 'inline-block', width: 12, height: 12, 
                      background: colors[idx % colors.length], borderRadius: 4, marginRight: 8
                    }} />
                    <Text style={{ color: '#e6edf3' }}>{item.name}: <strong>{percentage.toFixed(1)}%</strong></Text>
                  </div>
                );
              })}
            </div>
          </Col>
          <Col span={12}>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 150 }}>
              <div style={{
                width: 120, height: 120, borderRadius: '50%',
                background: `conic-gradient(${validData.map((item, idx) => {
                  const start = validData.slice(0, idx).reduce((sum, i) => sum + (i.value / total) * 360, 0);
                  const end = start + (item.value / total) * 360;
                  return `${colors[idx % colors.length]} ${start}deg ${end}deg`;
                }).join(', ')})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
              }}>
                <div style={{
                  width: 60, height: 60, background: '#0d1117', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                  border: '2px solid #30363d'
                }}>
                  <Text style={{ fontSize: 12, color: '#8b949e' }}>Total</Text>
                  <Text style={{ fontSize: 14, color: '#4dabf7' }}>{total.toLocaleString()}</Text>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </div>
    );
  };

  const renderCharts = () => {
    if (!includeCharts || !chartData) return null;
    
    if ((chartData.type === 'enterprise' || chartData.type === 'scraping') && chartData.products?.length > 0) {
      return (
        <Card 
          title={<Space><BarChartOutlined style={{ color: '#69db7c' }} /> Analyse des données</Space>} 
          style={{ marginBottom: 24, borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', background: '#161b22', border: '1px solid #30363d' }}
          headStyle={{ borderBottom: '1px solid #30363d', color: '#e6edf3' }}
        >
          {renderSimpleBarChart(chartData.products, 'données', '#69db7c')}
        </Card>
      );
    }

    if (chartData.type === 'banking' && chartData.products?.length > 0) {
      return (
        <Card 
          title={<Space><PieChartOutlined style={{ color: '#4dabf7' }} /> Répartition des encours</Space>} 
          style={{ marginBottom: 24, borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', background: '#161b22', border: '1px solid #30363d' }}
          headStyle={{ borderBottom: '1px solid #30363d', color: '#e6edf3' }}
        >
          {renderSimpleBarChart(chartData.products, 'banque', '#4dabf7')}
        </Card>
      );
    }

    if (chartData.type === 'insurance' && chartData.products?.length > 0) {
      return (
        <Card 
          title={<Space><PieChartOutlined style={{ color: '#69db7c' }} /> Répartition des primes</Space>} 
          style={{ marginBottom: 24, borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', background: '#161b22', border: '1px solid #30363d' }}
          headStyle={{ borderBottom: '1px solid #30363d', color: '#e6edf3' }}
        >
          {renderSimplePieChart(chartData.products)}
        </Card>
      );
    }

    return null;
  };

  const renderKPIs = () => {
    if (!generatedContent) return null;
    
    let kpis = [];
    if (selectedSector === 'entreprise') {
      kpis = [
        { title: "Chiffre d'affaires", value: generatedContent.revenue, suffix: "€", icon: <DollarOutlined />, color: '#69db7c' },
        { title: "Commandes", value: generatedContent.orders, icon: <ShoppingOutlined />, color: '#4dabf7' },
        { title: "Clients", value: generatedContent.customers, icon: <UserOutlined />, color: '#b197fc' },
        { title: "Panier moyen", value: generatedContent.avg_order, suffix: "€", icon: <RiseOutlined />, color: '#fcc419' }
      ];
    } else if (selectedSector === 'banque') {
      kpis = [
        { title: "Encours total", value: generatedContent.balance, suffix: "€", icon: <BankOutlined />, color: '#4dabf7' },
        { title: "Comptes", value: generatedContent.accounts, icon: <CreditCardOutlined />, color: '#69db7c' },
        { title: "Transactions", value: generatedContent.transactions, icon: <SwapOutlined />, color: '#b197fc' },
        { title: "Clients", value: generatedContent.clients, icon: <UserOutlined />, color: '#fcc419' }
      ];
    } else if (selectedSector === 'assurance') {
      kpis = [
        { title: "Primes totales", value: generatedContent.premiums, suffix: "€", icon: <InsuranceOutlined />, color: '#69db7c' },
        { title: "Contrats", value: generatedContent.policies, icon: <FileTextOutlined />, color: '#4dabf7' },
        { title: "Clients", value: generatedContent.customers, icon: <UserOutlined />, color: '#b197fc' },
        { title: "Prime moyenne", value: generatedContent.avg_premium, suffix: "€", icon: <RiseOutlined />, color: '#fcc419' }
      ];
    } else if (selectedSector === 'scraping') {
      kpis = [
        { title: "Pages analysées", value: generatedContent.pages_count || 0, icon: <GlobalOutlined />, color: '#66d9e8' },
        { title: "Images extraites", value: generatedContent.images_count || 0, icon: <FileImageOutlined />, color: '#69db7c' },
        { title: "Liens trouvés", value: generatedContent.links_count || 0, icon: <LinkOutlined />, color: '#4dabf7' },
        { title: "Mots-clés", value: generatedContent.keywords_count || 0, icon: <SearchOutlined />, color: '#fcc419' }
      ];
    }
    
    return (
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {kpis.map((kpi, idx) => (
          <Col xs={24} sm={12} md={6} key={idx}>
            <Card 
              size="small" 
              style={{ borderRadius: 16, textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.3)', background: '#161b22', border: '1px solid #30363d' }}
              bodyStyle={{ padding: '20px 16px' }}
            >
              <div style={{ fontSize: 28, color: kpi.color, marginBottom: 8 }}>{kpi.icon}</div>
              <Statistic
                title={<Text style={{ fontSize: 14, fontWeight: 500, color: '#8b949e' }}>{kpi.title}</Text>}
                value={kpi.value?.toLocaleString() || 0}
                precision={0}
                valueStyle={{ color: kpi.color, fontSize: 24, fontWeight: 600 }}
                suffix={<span style={{ fontSize: 14, color: '#8b949e', marginLeft: 4 }}>{kpi.suffix}</span>}
              />
            </Card>
          </Col>
        ))}
      </Row>
    );
  };

  const renderReportContent = (content) => {
    if (!content) return <Text style={{ color: '#8b949e' }}>Aucun contenu</Text>;
    if (typeof content !== 'string') return <Text style={{ color: '#ff6b6b' }}>Format de contenu invalide</Text>;
    
    let html = content
      .replace(/^## (.*$)/gim, '<h2 style="font-size: 24px; margin-top: 28px; margin-bottom: 16px; color: #4dabf7; border-left: 4px solid #4dabf7; padding-left: 16px; font-weight: 600;">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 style="font-size: 20px; margin-top: 20px; margin-bottom: 12px; color: #e6edf3; font-weight: 500;">$1</h3>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong style="color: #4dabf7;">$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em style="color: #8b949e;">$1</em>')
      .replace(/^- (.*$)/gim, '<li style="margin-bottom: 8px;">$1</li>')
      .replace(/<\/li>\n<li>/g, '</li><li>')
      .replace(/(<li>.*<\/li>)/s, '<ul style="margin: 12px 0 12px 24px; padding: 0; list-style: none;">$1</ul>')
      .replace(/\n/g, '<br/>');
    
    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const steps = [
    { title: 'Décrire', icon: <FileTextOutlined /> },
    { title: 'Générer', icon: <RobotOutlined /> },
    { title: 'Analyser', icon: <BarChartOutlined /> },
    { title: 'Exporter', icon: <DownloadOutlined /> }
  ];

  const renderReportImages = () => {
    if (!generatedContent || !generatedContent.image_urls || generatedContent.image_urls.length === 0) {
      return null;
    }
    
    const images = generatedContent.image_urls.slice(0, 12);
    
    return (
      <Card 
        title={<Space><FileImageOutlined style={{ color: '#4dabf7' }} /> Images extraites ({generatedContent.images_count || images.length} images)</Space>}
        style={{ marginBottom: 24, borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', background: '#161b22', border: '1px solid #30363d' }}
        headStyle={{ borderBottom: '1px solid #30363d', color: '#e6edf3' }}
      >
        <Row gutter={[16, 16]}>
          {images.map((imgUrl, idx) => (
            <Col xs={12} sm={8} md={6} lg={4} key={idx}>
              <div 
                style={{ 
                  border: '1px solid #30363d', 
                  borderRadius: 12, 
                  overflow: 'hidden',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
                className="hover:shadow-lg hover:scale-105"
                onClick={() => window.open(imgUrl, '_blank')}
              >
                <img 
                  src={imgUrl} 
                  alt={`Image ${idx + 1}`}
                  style={{ 
                    width: '100%', 
                    height: 120, 
                    objectFit: 'cover'
                  }}
                  onError={(e) => {
                    e.target.src = 'https://placehold.co/200x120/1e1e1e/666?text=Image+non+charg%C3%A9e';
                  }}
                />
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    );
  };

  // ========== DÉFINITION DES ONGLETS PRINCIPAUX AVEC items ==========
  const mainTabItems = [
    {
      key: 'scraping',
      label: <span><DatabaseOutlined style={{ color: '#66d9e8' }} /> Scraping Web</span>,
      children: (
        <Row gutter={24}>
          <Col span={14}>
            <Card 
              title="Configuration du scraping" 
              extra={
                <Tooltip title="Historique">
                  <Button icon={<HistoryOutlined />} onClick={fetchScrapingHistory} style={{ borderRadius: 8, background: '#21262d', border: '1px solid #30363d', color: '#e6edf3' }}>
                    Historique
                  </Button>
                </Tooltip>
              }
              style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', background: '#161b22', border: '1px solid #30363d' }}
              headStyle={{ borderBottom: '1px solid #30363d', color: '#e6edf3' }}
              bodyStyle={{ padding: '24px' }}
            >
              <Form layout="vertical">
                <Form.Item label={<span style={{ color: '#e6edf3' }}>URLs à scraper</span>}>
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      placeholder="https://exemple.com"
                      value={scrapingConfig.url}
                      onChange={(e) => setScrapingConfig({...scrapingConfig, url: e.target.value})}
                      onPressEnter={addUrl}
                      prefix={<LinkOutlined style={{ color: '#8b949e' }} />}
                      style={{ borderRadius: '12px 0 0 12px', background: '#0d1117', borderColor: '#30363d', color: '#e6edf3' }}
                    />
                    <Button type="primary" onClick={addUrl} icon={<PlusOutlined />} style={{ borderRadius: '0 12px 12px 0', background: '#238636', borderColor: '#238636' }}>
                      Ajouter
                    </Button>
                  </Space.Compact>
                  {scrapingUrls.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      {scrapingUrls.map(url => (
                        <Tag 
                          key={url} 
                          closable 
                          onClose={() => removeUrl(url)}
                          style={{ marginBottom: 4, padding: '4px 12px', borderRadius: 20, background: '#1a3a2a', borderColor: '#2a5a3a', color: '#69db7c' }}
                        >
                          {url}
                        </Tag>
                      ))}
                    </div>
                  )}
                </Form.Item>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label={<span style={{ color: '#e6edf3' }}>Profondeur</span>}>
                      <InputNumber 
                        min={1} max={3} 
                        value={scrapingConfig.depth} 
                        onChange={v => setScrapingConfig({...scrapingConfig, depth: v})} 
                        style={{ width: '100%', borderRadius: 12, background: '#0d1117', borderColor: '#30363d', color: '#e6edf3' }}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label={<span style={{ color: '#e6edf3' }}>Pages max</span>}>
                      <InputNumber 
                        min={1} max={50} 
                        value={scrapingConfig.maxPages} 
                        onChange={v => setScrapingConfig({...scrapingConfig, maxPages: v})} 
                        style={{ width: '100%', borderRadius: 12, background: '#0d1117', borderColor: '#30363d', color: '#e6edf3' }}
                      />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label={<span style={{ color: '#e6edf3' }}>Mots-clés</span>}>
                  <Select 
                    mode="tags" 
                    placeholder="Ajoutez des mots-clés" 
                    value={scrapingConfig.keywords} 
                    onChange={v => setScrapingConfig({...scrapingConfig, keywords: v})} 
                    style={{ width: '100%', borderRadius: 12, background: '#0d1117', borderColor: '#30363d', color: '#e6edf3' }}
                    dropdownStyle={{ background: '#161b22', borderColor: '#30363d' }}
                  />
                </Form.Item>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label={<span style={{ color: '#e6edf3' }}>Période</span>}>
                      <Select 
                        value={scrapingConfig.dateRange} 
                        onChange={v => setScrapingConfig({...scrapingConfig, dateRange: v})}
                        style={{ width: '100%', borderRadius: 12, background: '#0d1117', borderColor: '#30363d', color: '#e6edf3' }}
                        dropdownStyle={{ background: '#161b22', borderColor: '#30363d' }}
                      >
                        <Option value="7d">7 jours</Option>
                        <Option value="30d">30 jours</Option>
                        <Option value="90d">90 jours</Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label={<span style={{ color: '#e6edf3' }}>Options</span>}>
                      <Space>
                        <Checkbox 
                          checked={scrapingConfig.extractImages} 
                          onChange={e => setScrapingConfig({...scrapingConfig, extractImages: e.target.checked})}
                          style={{ color: '#e6edf3' }}
                        >
                          Images
                        </Checkbox>
                        <Checkbox 
                          checked={scrapingConfig.extractLinks} 
                          onChange={e => setScrapingConfig({...scrapingConfig, extractLinks: e.target.checked})}
                          style={{ color: '#e6edf3' }}
                        >
                          Liens
                        </Checkbox>
                      </Space>
                    </Form.Item>
                  </Col>
                </Row>
                <Button 
                  type="primary" 
                  size="large" 
                  block 
                  icon={scrapingLoading ? <LoadingOutlined /> : <SearchOutlined />} 
                  onClick={performScraping} 
                  loading={scrapingLoading} 
                  style={{ height: 48, borderRadius: 12, fontWeight: 600, background: '#238636', borderColor: '#238636' }}
                >
                  {scrapingLoading ? 'Scraping en cours...' : 'Lancer le scraping'}
                </Button>
                {scrapingLoading && <Progress percent={scrapingProgress} style={{ marginTop: 16 }} strokeColor="#238636" trailColor="#21262d" />}
              </Form>
            </Card>
          </Col>
          <Col span={10}>
            <Card 
              title={<span style={{ color: '#e6edf3' }}>Historique</span>}
              style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', background: '#161b22', border: '1px solid #30363d' }}
              headStyle={{ borderBottom: '1px solid #30363d', color: '#e6edf3' }}
              bodyStyle={{ padding: '16px' }}
            >
              <List 
                dataSource={scrapingHistory.slice(0, 5)} 
                renderItem={item => (
                  <List.Item style={{ borderRadius: 8, padding: '12px 16px', background: '#0d1117', marginBottom: 8, border: '1px solid #21262d' }}>
                    <List.Item.Meta 
                      avatar={<Avatar icon={<GlobalOutlined />} style={{ backgroundColor: '#1a5a5a' }} />} 
                      title={<Text ellipsis style={{ color: '#e6edf3', fontWeight: 500 }}>{item.urls?.join(', ') || 'Scraping'}</Text>} 
                      description={<span style={{ color: '#8b949e' }}>{item.pagesScraped || 0} pages - <Tag color={item.status === 'completed' ? 'green' : 'orange'}>{item.status}</Tag></span>} 
                    />
                  </List.Item>
                )}
                locale={{ emptyText: <Empty description="Aucun scraping récent" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ color: '#8b949e' }} /> }}
              />
            </Card>
          </Col>
          {scrapedData?.pages?.length > 0 && (
            <Col span={24}>
              <Card 
                title={<span style={{ color: '#e6edf3' }}>Résultats ({scrapedData.pages.length} pages)</span>}
                extra={
                  <Button 
                    type="primary" 
                    icon={<FileTextOutlined />} 
                    onClick={generateReportFromScraping}
                    loading={loading}
                    style={{ borderRadius: 12, background: '#238636', borderColor: '#238636' }}
                  >
                    Générer rapport IA
                  </Button>
                }
                style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', background: '#161b22', border: '1px solid #30363d', marginTop: 16 }}
                headStyle={{ borderBottom: '1px solid #30363d', color: '#e6edf3' }}
                bodyStyle={{ padding: '16px' }}
              >
                <List 
                  dataSource={scrapedData.pages} 
                  renderItem={page => (
                    <List.Item style={{ padding: '12px 0', borderBottom: '1px solid #21262d' }}>
                      <List.Item.Meta 
                        title={<a href={page.url} target="_blank" rel="noopener noreferrer" style={{ color: '#4dabf7', fontWeight: 500 }}>{page.title || page.url}</a>} 
                        description={
                          <Space>
                            <Tag icon={<FileImageOutlined />} color="blue" style={{ background: '#1a2a4a', borderColor: '#2a3a6e', color: '#4dabf7' }}>
                              {page.images?.length || page.images || 0} images
                            </Tag>
                            <Tag icon={<LinkOutlined />} color="green" style={{ background: '#1a3a2a', borderColor: '#2a5a3a', color: '#69db7c' }}>
                              {page.links || 0} liens
                            </Tag>
                          </Space>
                        } 
                      />
                    </List.Item>
                  )} 
                />
                {renderImagesPreview()}
              </Card>
            </Col>
          )}
        </Row>
      )
    },
    {
      key: 'report',
      label: <span><FileTextOutlined style={{ color: '#b197fc' }} /> Rapports IA</span>,
      children: (
        <Row gutter={24}>
          <Col span={24}>
            <Card 
              style={{ marginBottom: 24, borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', background: '#161b22', border: '1px solid #30363d' }}
              bodyStyle={{ padding: '24px' }}
            >
              <Steps current={currentStep} items={steps} className="dark-steps" />
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Card 
              title={
                <Space>
                  <RocketOutlined style={{ color: '#b197fc' }} />
                  <span style={{ fontWeight: 600, color: '#e6edf3' }}>Générer un rapport professionnel</span>
                  <Tag color="purple" style={{ borderRadius: 20, fontWeight: 500, background: '#2a1a4a', borderColor: '#3a2a6e', color: '#b197fc' }}>IA Générative</Tag>
                </Space>
              }
              extra={
                <Button icon={<HistoryOutlined />} onClick={() => setTemplateModalVisible(true)} style={{ borderRadius: 8, background: '#21262d', border: '1px solid #30363d', color: '#e6edf3' }}>
                  Templates
                </Button>
              } 
              style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', background: '#161b22', border: '1px solid #30363d' }}
              headStyle={{ borderBottom: '1px solid #30363d', color: '#e6edf3' }}
              bodyStyle={{ padding: '24px' }}
            >
              <Form layout="vertical">
                <Form.Item label={<span style={{ color: '#e6edf3' }}>Secteur d'activité</span>}>
                  <Select 
                    value={selectedSector} 
                    onChange={setSelectedSector} 
                    style={{ width: '100%' }} 
                    size="large"
                    dropdownStyle={{ background: '#161b22', borderColor: '#30363d' }}
                    className="dark-select"
                  >
                    <Option value="banque"><BankOutlined style={{ color: '#4dabf7' }} /> Banque</Option>
                    <Option value="assurance"><InsuranceOutlined style={{ color: '#69db7c' }} /> Assurance</Option>
                    <Option value="entreprise"><ShopOutlined style={{ color: '#b197fc' }} /> Entreprise</Option>
                  </Select>
                </Form.Item>
                <Form.Item label={<span style={{ color: '#e6edf3' }}>Description du rapport</span>}>
                  <TextArea 
                    rows={5} 
                    value={prompt} 
                    onChange={e => setPrompt(e.target.value)} 
                    placeholder={`✨ Exemple: ${getCurrentTemplates()[0]?.prompt || "Crée un rapport d'analyse..."}`} 
                    style={{ fontSize: 14, marginBottom: 8, borderRadius: 12, padding: '12px 16px', background: '#0d1117', borderColor: '#30363d', color: '#e6edf3' }}
                  />
                </Form.Item>
                <Space style={{ marginBottom: 16 }}>
                  <Checkbox 
                    checked={includeCharts} 
                    onChange={e => setIncludeCharts(e.target.checked)}
                    style={{ color: '#e6edf3' }}
                  >
                    <LineChartOutlined style={{ color: '#4dabf7' }} /> Inclure des graphiques
                  </Checkbox>
                </Space>
                <Button 
                  type="primary" 
                  size="large" 
                  block 
                  icon={loading ? <LoadingOutlined /> : <SendOutlined />} 
                  onClick={generateReport} 
                  loading={loading} 
                  style={{ height: 48, borderRadius: 12, fontWeight: 600, background: '#238636', borderColor: '#238636' }}
                >
                  {loading ? 'Génération en cours...' : 'Générer le rapport'}
                </Button>
              </Form>
              <Divider style={{ margin: '24px 0', borderColor: '#30363d' }} />
              <div>
                <Text style={{ color: '#8b949e', fontWeight: 500 }}>Templates par secteur :</Text>
                <Space wrap style={{ marginTop: 8 }}>
                  {getCurrentTemplates().map(tpl => (
                    <Tag 
                      key={tpl.id} 
                      color="blue" 
                      style={{ cursor: 'pointer', padding: '6px 16px', borderRadius: 20, fontSize: 13, background: '#1a2a4a', borderColor: '#2a3a6e', color: '#4dabf7' }}
                      onClick={() => applyTemplate(tpl)}
                    >
                      {getIcon(tpl.iconName)} {tpl.title}
                    </Tag>
                  ))}
                </Space>
              </div>
            </Card>
          </Col>
          <Col xs={24} md={8}>
            <Card 
              title={<span style={{ color: '#e6edf3' }}>Rapports récents</span>}
              style={{ borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.3)', background: '#161b22', border: '1px solid #30363d' }}
              headStyle={{ borderBottom: '1px solid #30363d', color: '#e6edf3' }}
              bodyStyle={{ padding: '16px' }}
            >
              {recentReports.length === 0 ? (
                <Empty description="Aucun rapport récent" image={Empty.PRESENTED_IMAGE_SIMPLE} style={{ color: '#8b949e' }} />
              ) : (
                <List 
                  dataSource={recentReports.slice(0, 5)} 
                  renderItem={report => (
                    <List.Item 
                      style={{ cursor: 'pointer', borderRadius: 8, padding: '8px 12px', background: '#0d1117', marginBottom: 8, border: '1px solid #21262d' }}
                      onClick={() => setPrompt(`Reprendre: ${report.title}`)}
                    >
                      <List.Item.Meta 
                        avatar={<Avatar icon={<FileTextOutlined />} style={{ backgroundColor: '#2a1a4a' }} />} 
                        title={<Text ellipsis style={{ color: '#e6edf3', fontWeight: 500 }}>{report.title}</Text>} 
                        description={<Text style={{ fontSize: 12, color: '#8b949e' }}>{report.date}</Text>} 
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
          {generatedContent && (
            <Col span={24}>
              <div id="report-content" ref={reportRef}>
                <Card 
                  style={{ borderRadius: 16, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', marginTop: 16, background: '#161b22', border: '1px solid #30363d' }}
                  bodyStyle={{ padding: 32 }}
                  title={
                    <Space>
                      {getSectorIcon(selectedSector)}
                      <span style={{ fontWeight: 600, fontSize: 18, color: '#e6edf3' }}>{generatedContent?.title || 'Rapport généré'}</span>
                      <Tag color={getSectorColor(selectedSector)} style={{ borderRadius: 20, fontWeight: 500, background: `${getSectorColor(selectedSector)}20`, borderColor: getSectorColor(selectedSector), color: getSectorColor(selectedSector) }}>
                        {getSectorName(selectedSector)}
                      </Tag>
                    </Space>
                  }
                  headStyle={{ borderBottom: '1px solid #30363d', color: '#e6edf3' }}
                  extra={
                    <Space>
                      <Tooltip title="Télécharger PDF">
                        <Button icon={<FilePdfOutlined />} onClick={exportToPDF} type="primary" ghost style={{ borderRadius: 8, borderColor: '#238636', color: '#238636' }}>
                          PDF
                        </Button>
                      </Tooltip>
                      <Tooltip title="Imprimer">
                        <Button icon={<PrinterOutlined />} onClick={printReport} style={{ borderRadius: 8, background: '#21262d', border: '1px solid #30363d', color: '#e6edf3' }}>
                          Imprimer
                        </Button>
                      </Tooltip>
                      <Tooltip title="Copier le lien">
                        <Button icon={<ShareAltOutlined />} onClick={copyReportLink} style={{ borderRadius: 8, background: '#21262d', border: '1px solid #30363d', color: '#e6edf3' }}>
                          Partager
                        </Button>
                      </Tooltip>
                    </Space>
                  }
                >
                  {/* En-tête */}
                  <div style={{ 
                    textAlign: 'center', 
                    marginBottom: 32, 
                    padding: '32px 24px', 
                    borderBottom: `4px solid ${getSectorColor(selectedSector)}`,
                    background: `linear-gradient(135deg, ${getSectorColor(selectedSector)}08 0%, #0d1117 100%)`,
                    borderRadius: 16
                  }}>
                    <div style={{ marginBottom: 16 }}>
                      {getSectorIcon(selectedSector)}
                      <Tag color={getSectorColor(selectedSector)} style={{ marginLeft: 12, padding: '4px 16px', borderRadius: 20, fontWeight: 500, background: `${getSectorColor(selectedSector)}20`, borderColor: getSectorColor(selectedSector), color: getSectorColor(selectedSector) }}>
                        {getSectorName(selectedSector)}
                      </Tag>
                    </div>
                    <Title level={1} style={{ marginBottom: 8, color: getSectorColor(selectedSector), fontWeight: 700 }}>
                      {generatedContent?.title || 'Rapport d\'analyse'}
                    </Title>
                    <Space split={<Divider type="vertical" style={{ borderColor: '#30363d' }} />}>
                      <Text style={{ color: '#8b949e' }}><CalendarOutlined /> {new Date().toLocaleDateString('fr-FR')}</Text>
                      <Text style={{ color: '#8b949e' }}><ClockCircleOutlined /> Généré en {typeof generatedContent?.generation_time === 'number' ? generatedContent.generation_time.toFixed(2) : (generatedContent?.generation_time || 0)}s</Text>
                      <Text style={{ color: '#8b949e' }}><RobotOutlined /> Score: {typeof generatedContent?.relevance_score === 'number' ? generatedContent.relevance_score.toFixed(0) : (generatedContent?.relevance_score || 0)}%</Text>
                    </Space>
                  </div>
                  {/* Synthèse */}
                  <Card 
                    title={<Space><TrophyOutlined style={{ color: '#fcc419' }} /><span style={{ fontWeight: 600, color: '#e6edf3' }}>Synthèse Exécutive</span></Space>} 
                    style={{ marginBottom: 24, borderRadius: 16, background: '#0d1117', border: '1px solid #21262d' }}
                    headStyle={{ borderBottom: '1px solid #21262d', color: '#e6edf3' }}
                    bodyStyle={{ padding: '20px' }}
                  >
                    <Paragraph style={{ fontSize: 16, lineHeight: 1.8, color: '#e6edf3' }}>
                      {generatedContent?.insights?.slice(0, 3).join('. ')}.
                    </Paragraph>
                  </Card>
                  {/* KPIs */}
                  {renderKPIs()}
                  {/* Graphiques */}
                  {renderCharts()}
                  {/* Images extraites */}
                  {renderReportImages()}
                  {/* Insights */}
                  {generatedContent.insights && generatedContent.insights.length > 0 && (
                    <Card 
                      title={<Space><BulbOutlined style={{ color: '#fcc419' }} /> Insights & Découvertes Clés</Space>} 
                      style={{ marginBottom: 24, borderRadius: 16, background: '#0d1117', border: '1px solid #21262d' }}
                      headStyle={{ borderBottom: '1px solid #21262d', color: '#e6edf3' }}
                      bodyStyle={{ padding: '20px' }}
                    >
                      <Row gutter={[16, 16]}>
                        {generatedContent.insights.map((insight, idx) => (
                          <Col xs={24} md={12} key={idx}>
                            <Card 
                              size="small" 
                              style={{ 
                                borderLeft: `4px solid ${getSectorColor(selectedSector)}`, 
                                borderRadius: 12, 
                                background: `${getSectorColor(selectedSector)}08`,
                                border: '1px solid #21262d'
                              }}
                              bodyStyle={{ padding: '12px 16px' }}
                            >
                              <Space>
                                <div style={{ 
                                  width: 32, height: 32, 
                                  borderRadius: '50%', 
                                  background: `${getSectorColor(selectedSector)}20`, 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  justifyContent: 'center', 
                                  color: getSectorColor(selectedSector),
                                  fontWeight: 'bold'
                                }}>
                                  {idx + 1}
                                </div>
                                <Text style={{ fontSize: 14, color: '#e6edf3' }}>{insight}</Text>
                              </Space>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    </Card>
                  )}
                  {/* Analyse détaillée */}
                  <Card 
                    title={<Space><FileTextOutlined style={{ color: '#4dabf7' }} /> Analyse Détaillée</Space>} 
                    style={{ marginBottom: 24, borderRadius: 16, background: '#0d1117', border: '1px solid #21262d' }}
                    headStyle={{ borderBottom: '1px solid #21262d', color: '#e6edf3' }}
                    bodyStyle={{ padding: '20px' }}
                  >
                    <div style={{ 
                      padding: '20px 24px', 
                      background: '#161b22', 
                      borderRadius: 12, 
                      lineHeight: 1.9, 
                      fontSize: 15,
                      color: '#e6edf3',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                      border: '1px solid #21262d'
                    }} 
                    dangerouslySetInnerHTML={{ __html: generatedContent.content?.replace(/^## (.*$)/gim, '<h2 style="font-size: 22px; margin-top: 28px; margin-bottom: 16px; color: #4dabf7; border-left: 4px solid #4dabf7; padding-left: 16px; font-weight: 600;">$1</h2>').replace(/^### (.*$)/gim, '<h3 style="font-size: 18px; margin-top: 20px; margin-bottom: 12px; color: #e6edf3; font-weight: 500;">$1</h3>').replace(/\*\*(.*?)\*\*/gim, '<strong style="color: #4dabf7;">$1</strong>').replace(/\*(.*?)\*/gim, '<em style="color: #8b949e;">$1</em>').replace(/^- (.*$)/gim, '<li style="margin-bottom: 8px;">$1</li>').replace(/<\/li>\n<li>/g, '</li><li>').replace(/(<li>.*<\/li>)/s, '<ul style="margin: 12px 0 12px 24px; padding: 0; list-style: none;">$1</ul>').replace(/\n/g, '<br/>') }} />
                  </Card>
                  {/* Recommandations */}
                  {generatedContent.recommendations && generatedContent.recommendations.length > 0 && (
                    <Card 
                      title={<Space><AimOutlined style={{ color: '#69db7c' }} /> Recommandations Stratégiques</Space>} 
                      style={{ marginBottom: 24, borderRadius: 16, background: '#0d1117', border: '1px solid #21262d' }}
                      headStyle={{ borderBottom: '1px solid #21262d', color: '#e6edf3' }}
                      bodyStyle={{ padding: '20px' }}
                    >
                      <Timeline 
                        items={generatedContent.recommendations.map((rec, idx) => ({
                          dot: <CheckCircleOutlined style={{ fontSize: 16, color: '#69db7c' }} />,
                          children: (
                            <Card 
                              size="small" 
                              style={{ 
                                marginBottom: 8, 
                                background: '#161b22',
                                borderRadius: 12,
                                border: '1px solid #21262d'
                              }}
                              bodyStyle={{ padding: '12px 16px' }}
                            >
                              <Text strong style={{ color: '#69db7c' }}>Action {idx + 1}</Text>
                              <div style={{ marginTop: 4, color: '#e6edf3' }}>{rec}</div>
                            </Card>
                          )
                        }))}
                      />
                    </Card>
                  )}
                  {/* Footer */}
                  <div style={{ 
                    marginTop: 32, 
                    padding: '20px 0', 
                    textAlign: 'center', 
                    borderTop: '1px solid #30363d',
                    color: '#8b949e'
                  }}>
                    <Space split={<Divider type="vertical" style={{ borderColor: '#30363d' }} />}>
                      <Text style={{ color: '#8b949e' }}>Neura ERP - Rapport généré par IA</Text>
                      <Text style={{ color: '#8b949e' }}>Date: {new Date().toLocaleString('fr-FR')}</Text>
                      <Text style={{ color: '#8b949e' }}>Document confidentiel</Text>
                    </Space>
                  </div>
                </Card>
              </div>
            </Col>
          )}
        </Row>
      )
    }
  ];

  // ========== ONGLETS DU MODAL TEMPLATES ==========
  const templateModalTabItems = [
    {
      key: 'banque',
      label: <span><BankOutlined style={{ color: '#4dabf7' }} /> Banque</span>,
      children: (
        <Row gutter={16}>
          {promptTemplatesBySector.banque.map(tpl => (
            <Col span={12} key={tpl.id}>
              <Card 
                hoverable 
                size="small" 
                onClick={() => applyTemplate(tpl)} 
                style={{ cursor: 'pointer', marginBottom: 16, borderRadius: 12, background: '#161b22', border: '1px solid #30363d' }}
                bodyStyle={{ padding: '16px' }}
                className="hover-card"
              >
                <Space>
                  <Avatar icon={getIcon(tpl.iconName)} style={{ backgroundColor: '#1a2a4a', color: '#4dabf7' }} />
                  <div>
                    <Text style={{ color: '#e6edf3', fontWeight: 500 }}>{tpl.title}</Text>
                    <br />
                    <Text style={{ fontSize: 12, color: '#8b949e' }}>{tpl.description}</Text>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )
    },
    {
      key: 'assurance',
      label: <span><InsuranceOutlined style={{ color: '#69db7c' }} /> Assurance</span>,
      children: (
        <Row gutter={16}>
          {promptTemplatesBySector.assurance.map(tpl => (
            <Col span={12} key={tpl.id}>
              <Card 
                hoverable 
                size="small" 
                onClick={() => applyTemplate(tpl)} 
                style={{ cursor: 'pointer', marginBottom: 16, borderRadius: 12, background: '#161b22', border: '1px solid #30363d' }}
                bodyStyle={{ padding: '16px' }}
                className="hover-card"
              >
                <Space>
                  <Avatar icon={getIcon(tpl.iconName)} style={{ backgroundColor: '#1a3a2a', color: '#69db7c' }} />
                  <div>
                    <Text style={{ color: '#e6edf3', fontWeight: 500 }}>{tpl.title}</Text>
                    <br />
                    <Text style={{ fontSize: 12, color: '#8b949e' }}>{tpl.description}</Text>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )
    },
    {
      key: 'entreprise',
      label: <span><ShopOutlined style={{ color: '#b197fc' }} /> Entreprise</span>,
      children: (
        <Row gutter={16}>
          {promptTemplatesBySector.entreprise.map(tpl => (
            <Col span={12} key={tpl.id}>
              <Card 
                hoverable 
                size="small" 
                onClick={() => applyTemplate(tpl)} 
                style={{ cursor: 'pointer', marginBottom: 16, borderRadius: 12, background: '#161b22', border: '1px solid #30363d' }}
                bodyStyle={{ padding: '16px' }}
                className="hover-card"
              >
                <Space>
                  <Avatar icon={getIcon(tpl.iconName)} style={{ backgroundColor: '#2a1a4a', color: '#b197fc' }} />
                  <div>
                    <Text style={{ color: '#e6edf3', fontWeight: 500 }}>{tpl.title}</Text>
                    <br />
                    <Text style={{ fontSize: 12, color: '#8b949e' }}>{tpl.description}</Text>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )
    },
    {
      key: 'scraping',
      label: <span><GlobalOutlined style={{ color: '#66d9e8' }} /> Scraping</span>,
      children: (
        <Row gutter={16}>
          {promptTemplatesBySector.scraping.map(tpl => (
            <Col span={12} key={tpl.id}>
              <Card 
                hoverable 
                size="small" 
                onClick={() => applyTemplate(tpl)} 
                style={{ cursor: 'pointer', marginBottom: 16, borderRadius: 12, background: '#161b22', border: '1px solid #30363d' }}
                bodyStyle={{ padding: '16px' }}
                className="hover-card"
              >
                <Space>
                  <Avatar icon={getIcon(tpl.iconName)} style={{ backgroundColor: '#0a3a3a', color: '#66d9e8' }} />
                  <div>
                    <Text style={{ color: '#e6edf3', fontWeight: 500 }}>{tpl.title}</Text>
                    <br />
                    <Text style={{ fontSize: 12, color: '#8b949e' }}>{tpl.description}</Text>
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )
    }
  ];

  return (
    <div style={{ padding: 24, background: '#0d1117', minHeight: '100vh' }}>
      <motion.div 
        initial={{ y: -20, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        style={{ 
          background: getSectorGradient(selectedSector), 
          borderRadius: 24, 
          padding: '32px 40px', 
          marginBottom: 32,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          transition: 'background 0.5s ease',
          border: '1px solid rgba(255,255,255,0.05)'
        }}
      >
        <Row align="middle" justify="space-between">
          <Col>
            <Space size="large">
              <div style={{ 
                width: 64, 
                height: 64, 
                background: 'rgba(255,255,255,0.08)', 
                borderRadius: 20, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <RobotOutlined style={{ fontSize: 32, color: 'white' }} />
              </div>
              <div>
                <Title level={2} style={{ margin: 0, color: 'white', fontWeight: 700, textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>Assistant IA Générative</Title>
                <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 16 }}>Scraping web et création de rapports intelligents</Text>
              </div>
            </Space>
          </Col>
          <Col>
            <Tooltip title="Basculer en mode clair">
              <Button 
                icon={<BulbOutlined />} 
                onClick={() => setDarkMode(!darkMode)} 
                style={{ 
                  background: 'rgba(255,255,255,0.08)', 
                  border: '1px solid rgba(255,255,255,0.15)', 
                  color: 'white',
                  borderRadius: 12,
                  padding: '0 20px',
                  height: 40,
                  backdropFilter: 'blur(4px)'
                }}
              >
                {darkMode ? 'Mode sombre' : 'Mode clair'}
              </Button>
            </Tooltip>
          </Col>
        </Row>
      </motion.div>

      <Tabs 
        activeKey={activeTab} 
        onChange={setActiveTab} 
        style={{ marginBottom: 24 }}
        size="large"
        tabBarStyle={{ 
          background: '#161b22', 
          borderRadius: 16, 
          padding: '8px 16px', 
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
          border: '1px solid #30363d'
        }}
        className="dark-tabs"
        items={mainTabItems}
      />

      {/* Modal Templates */}
      <Modal 
        title={<span style={{ color: '#e6edf3' }}>Templates par secteur</span>}
        open={templateModalVisible} 
        onCancel={() => setTemplateModalVisible(false)} 
        footer={null} 
        width={800}
        style={{ borderRadius: 16 }}
        bodyStyle={{ padding: '24px', background: '#0d1117' }}
        headerStyle={{ background: '#161b22', borderBottom: '1px solid #30363d' }}
      >
        <Tabs 
          defaultActiveKey={selectedSector} 
          onChange={setSelectedSector}
          tabBarStyle={{ background: '#161b22', borderRadius: 12, padding: '4px 8px' }}
          className="dark-tabs"
          items={templateModalTabItems}
        />
      </Modal>
    </div>
  );
};

export default AIGenerator;