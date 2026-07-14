// src/modules/stock/StockDashboard.js - Version professionnelle avec palette Corporate Trust
import React, { useState, useEffect } from 'react';
import { 
  Card, Row, Col, Table, Button, Space, 
  Tag, Progress, Input, Select, Tooltip,
  Badge, Modal, Form, message, Spin, Alert, Avatar,
  Popconfirm, Typography, Empty, Divider,
  Descriptions, Popover, notification
} from 'antd';
import { 
  DatabaseOutlined, RiseOutlined, FallOutlined,
  PlusOutlined, FilterOutlined, DownloadOutlined,
  EditOutlined, DeleteOutlined,
  WarningOutlined,
  ImportOutlined, ReloadOutlined,
  TagOutlined, BoxPlotOutlined,
  ShoppingCartOutlined, DollarOutlined,
  ThunderboltOutlined, FireOutlined,
  TrophyOutlined, HeartOutlined,
  ClockCircleOutlined, CheckCircleOutlined,
  DiscordOutlined, ExportOutlined,
  EyeOutlined, SendOutlined,
  ExclamationCircleOutlined, StockOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import api from '../../services/api';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Search } = Input;

// ============================================
// PALETTE "CORPORATE TRUST" - Cohérente
// ============================================

const COLORS = {
  // Bleu Électrique - Primaire
  primary: '#1a56db',
  primaryDark: '#1e3a5f',
  primaryLight: '#3b82f6',
  primaryLighter: '#93b5e8',
  primarySurface: '#e8edf5',
  
  // Ardoise - Secondaire
  slate: '#475569',
  slateLight: '#94a3b8',
  slateLighter: '#cbd5e1',
  slateSurface: '#f1f5f9',
  
  // Marine Profond
  navy: '#0f172a',
  navyLight: '#1e293b',
  
  // Vert Émeraude - Accent Succès
  emerald: '#059669',
  emeraldLight: '#34d399',
  emeraldSurface: '#ecfdf5',
  
  // Rouge - Danger
  red: '#dc2626',
  redLight: '#fca5a5',
  
  // Ambre - Warning
  amber: '#d97706',
  amberLight: '#fbbf24',
  
  // Cyan - Info
  cyan: '#0891b2',
  cyanLight: '#67e8f9',
  cyanSurface: '#ecfeff',
  
  // Teal - Stock
  teal: '#0d9488',
  tealLight: '#5eead4',
  tealSurface: '#ecfdf5',
  
  // Blanc et Gris
  white: '#ffffff',
  gray50: '#f8fafc',
  gray100: '#f1f5f9',
  gray200: '#e2e8f0',
  gray300: '#cbd5e1',
  gray400: '#94a3b8',
  gray500: '#64748b',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1e293b',
  gray900: '#0f172a',
  
  // Discord
  discord: '#5865F2',
  discordSurface: '#eef2ff',
};

// ============================================
// CONFIGURATION DES STATUTS
// ============================================

const STOCK_STATUS_CONFIG = {
  'out': { 
    color: COLORS.red, 
    bg: '#fef2f2',
    icon: <FireOutlined />, 
    label: 'Rupture',
    badgeColor: COLORS.red
  },
  'low': { 
    color: COLORS.amber, 
    bg: '#fef3c7',
    icon: <WarningOutlined />, 
    label: 'Stock faible',
    badgeColor: COLORS.amber
  },
  'ok': { 
    color: COLORS.emerald, 
    bg: COLORS.emeraldSurface,
    icon: <CheckCircleOutlined />, 
    label: 'Stock OK',
    badgeColor: COLORS.emerald
  }
};

// ============================================
// COMPOSANTS STYLISÉS
// ============================================

const StatusBadge = ({ status }) => {
  const config = STOCK_STATUS_CONFIG[status] || STOCK_STATUS_CONFIG['ok'];
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 14px',
      borderRadius: 20,
      background: config.bg,
      color: config.color,
      fontWeight: 500,
      fontSize: 13,
    }}>
      {config.icon}
      <span>{config.label}</span>
    </div>
  );
};

const KpiCard = ({ title, value, icon, trend, prefix, suffix, color }) => (
  <motion.div
    whileHover={{ y: -4, transition: { duration: 0.2 } }}
    style={{ height: '100%' }}
  >
    <Card
      style={{
        borderRadius: 16,
        border: `1px solid ${COLORS.gray200}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        height: '100%',
        transition: 'all 0.3s ease',
      }}
      bodyStyle={{ padding: '20px 24px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <Text style={{ color: COLORS.slate, fontSize: 13, fontWeight: 500, letterSpacing: '0.3px', textTransform: 'uppercase' }}>
            {title}
          </Text>
          <div style={{ 
            fontSize: 28, 
            fontWeight: 700, 
            color: COLORS.gray900,
            marginTop: 8,
            letterSpacing: '-0.5px'
          }}>
            {prefix && <span style={{ fontSize: 18, color: COLORS.slate, marginRight: 2 }}>{prefix}</span>}
            {typeof value === 'number' ? value.toLocaleString() : value}
            {suffix && <span style={{ fontSize: 16, color: COLORS.slate, marginLeft: 2 }}>{suffix}</span>}
          </div>
        </div>
        <div style={{
          width: 48,
          height: 48,
          borderRadius: 12,
          background: color || COLORS.primarySurface,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 22,
          color: color || COLORS.primary,
        }}>
          {icon}
        </div>
      </div>
      {trend !== undefined && (
        <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          <Tag 
            color={trend >= 0 ? 'success' : 'error'} 
            style={{ 
              borderRadius: 12, 
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              margin: 0
            }}
          >
            {trend >= 0 ? <RiseOutlined /> : <FallOutlined />}
            {Math.abs(trend)}%
          </Tag>
          <Text style={{ color: COLORS.slateLight, fontSize: 12 }}>vs mois dernier</Text>
        </div>
      )}
    </Card>
  </motion.div>
);

const CategoryProgress = ({ category, stockValue, productCount, totalValue, color }) => {
  const percent = totalValue > 0 ? Math.min(100, Math.round((stockValue / totalValue) * 100)) : 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      style={{ height: '100%' }}
    >
      <Card 
        hoverable 
        size="small" 
        style={{ 
          borderRadius: 14, 
          textAlign: 'center', 
          height: '100%',
          border: `1px solid ${COLORS.gray200}`,
          transition: 'all 0.3s ease',
        }}
      >
        <Progress
          type="circle"
          percent={percent}
          width={80}
          strokeColor={color || COLORS.primary}
          strokeWidth={6}
          format={() => (
            <div>
              <Text strong style={{ fontSize: 16, color: color || COLORS.primary }}>
                {percent}%
              </Text>
              <br />
              <Text type="secondary" style={{ fontSize: 9, color: COLORS.slateLight }}>
                valeur
              </Text>
            </div>
          )}
        />
        <div style={{ marginTop: 12 }}>
          <Text strong style={{ color: COLORS.gray800, fontSize: 13 }}>
            {category || 'Sans nom'}
          </Text>
          <div style={{ fontSize: 11, color: COLORS.slateLight, marginTop: 2 }}>
            {productCount} produit{productCount > 1 ? 's' : ''}
          </div>
          <div style={{ marginTop: 4 }}>
            <Text strong style={{ color: COLORS.primary, fontSize: 14 }}>
              {stockValue.toLocaleString()} €
            </Text>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const StockDashboard = () => {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [locations, setLocations] = useState([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [kpiData, setKpiData] = useState([]);
  const [categoryStats, setCategoryStats] = useState([]);
  const [animateValues, setAnimateValues] = useState({});
  const [stockUpdateAlert, setStockUpdateAlert] = useState(null);
  
  const [isProductModalVisible, setIsProductModalVisible] = useState(false);
  const [isMovementModalVisible, setIsMovementModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterLocation, setFilterLocation] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  
  const [form] = Form.useForm();
  const [movementForm] = Form.useForm();
  const [categoryForm] = Form.useForm();

  // Animation des valeurs
  useEffect(() => {
    const interval = setInterval(() => {
      setAnimateValues({
        stock: Math.random() * 10,
        products: Math.random() * 10
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Écouter les événements de mise à jour de stock depuis Discord
  useEffect(() => {
    const handleStockUpdated = (event) => {
      if (event.detail?.productName && event.detail?.quantity) {
        setStockUpdateAlert({
          productName: event.detail.productName,
          oldQuantity: event.detail.oldQuantity,
          newQuantity: event.detail.newQuantity,
          timestamp: new Date()
        });
        notification.success({
          message: '📦 Stock mis à jour',
          description: `${event.detail.productName} - Nouveau stock: ${event.detail.newQuantity} unités`,
          placement: 'topRight',
          duration: 5,
          icon: <StockOutlined style={{ color: COLORS.primary }} />
        });
        fetchData();
      }
    };
  
    window.addEventListener('stock-updated', handleStockUpdated);
    return () => window.removeEventListener('stock-updated', handleStockUpdated);
  }, []);

  // Polling pour les mises à jour de stock
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // ===== FONCTION UTILITAIRE POUR EXTRAIRE LES DONNÉES =====
  const extractData = (response, fallback = []) => {
    if (!response) return fallback;
    
    // Si c'est un objet Axios avec data
    if (response.data) {
      // Si response.data a une propriété 'data' qui est un tableau (backend renvoie { data: [...] })
      if (response.data.data && Array.isArray(response.data.data)) {
        return response.data.data;
      }
      // Si response.data est un tableau
      if (Array.isArray(response.data)) {
        return response.data;
      }
      // Si response.data a une propriété 'items'
      if (response.data.items && Array.isArray(response.data.items)) {
        return response.data.items;
      }
      // Si response.data a une propriété 'results'
      if (response.data.results && Array.isArray(response.data.results)) {
        return response.data.results;
      }
      // Si response.data a une propriété 'products'
      if (response.data.products && Array.isArray(response.data.products)) {
        return response.data.products;
      }
      // Si response.data a une propriété 'categories'
      if (response.data.categories && Array.isArray(response.data.categories)) {
        return response.data.categories;
      }
      // Si response.data a une propriété 'movements'
      if (response.data.movements && Array.isArray(response.data.movements)) {
        return response.data.movements;
      }
    }
    
    // Si c'est déjà un tableau
    if (Array.isArray(response)) return response;
    
    // Si c'est un objet avec une propriété 'data' qui est un tableau
    if (response.data && Array.isArray(response.data)) return response.data;
    
    // Si c'est un objet avec une propriété 'items' qui est un tableau
    if (response.items && Array.isArray(response.items)) return response.items;
    
    // Si c'est un objet avec une propriété 'results' qui est un tableau
    if (response.results && Array.isArray(response.results)) return response.results;
    
    // Si c'est un objet avec une propriété 'products' qui est un tableau
    if (response.products && Array.isArray(response.products)) return response.products;
    
    // Si c'est un objet avec une propriété 'categories' qui est un tableau
    if (response.categories && Array.isArray(response.categories)) return response.categories;
    
    // Si c'est un objet avec une propriété 'movements' qui est un tableau
    if (response.movements && Array.isArray(response.movements)) return response.movements;
    
    // Sinon, retourner le fallback
    return fallback;
  };

  // ===== FONCTIONS DE CHARGEMENT =====
  const fetchData = async () => {
    setLoading(true);
    try {
      const params = { limit: 500 };
      if (filterCategory !== 'all' && filterCategory) params.category_id = filterCategory;
      if (searchText) params.search = searchText;
      
      const [productsRes, kpiRes, catStatsRes] = await Promise.allSettled([
        api.get('/stock/products', { params }),
        api.get('/stock/dashboard/kpi'),
        api.get('/stock/dashboard/categories')
      ]);
      
      // ✅ Extraction robuste des produits
      if (productsRes.status === 'fulfilled') {
        const productsData = extractData(productsRes.value, []);
        
        const productsWithFlag = productsData.map(p => ({
          ...p,
          updated_from_discord: p.last_updated_from_discord || false
        }));
        setProducts(productsWithFlag);
      } else {
        console.warn('⚠️ Erreur produits:', productsRes.reason);
        setProducts([]);
      }
      
      // ✅ Extraction robuste des KPIs
      if (kpiRes.status === 'fulfilled') {
        const kpiDataValue = extractData(kpiRes.value, []);
        setKpiData(kpiDataValue);
      } else {
        setKpiData([]);
      }
      
      // ✅ Extraction robuste des catégories
      if (catStatsRes.status === 'fulfilled') {
        const catStatsData = extractData(catStatsRes.value, []);
        setCategoryStats(catStatsData);
      } else {
        setCategoryStats([]);
      }

      await fetchCategories();
      await fetchLocations();
    } catch (error) {
      console.error('❌ Erreur fetchData:', error);
      message.error('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    setCategoriesLoading(true);
    try {
      const response = await api.get('/stock/categories');
      const categoriesData = extractData(response, []);
      setCategories(categoriesData);
    } catch (error) {
      console.error('⚠️ Erreur chargement catégories:', error);
      setCategories([]);
    } finally {
      setCategoriesLoading(false);
    }
  };

  const fetchLocations = async () => {
    setLocationsLoading(true);
    try {
      const response = await api.get('/stock/locations');
      const locationsData = extractData(response, []);
      setLocations(locationsData);
    } catch (error) {
      console.error('⚠️ Erreur chargement emplacements:', error);
      setLocations([]);
    } finally {
      setLocationsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchData();
    }, 500);
    return () => clearTimeout(debounceTimer);
  }, [filterCategory, searchText]);

  useEffect(() => {
    if (isProductModalVisible) {
      fetchCategories();
      fetchLocations();
    }
  }, [isProductModalVisible]);

  // ===== GESTION DES CATÉGORIES =====
  const handleCreateCategory = async (values) => {
    setUpdateLoading(true);
    try {
      const categoryData = {
        name: values.name,
        description: values.description || null
      };

      await api.post('/stock/categories', categoryData);
      message.success('Catégorie créée avec succès');
      setIsCategoryModalVisible(false);
      categoryForm.resetFields();
      await fetchCategories();
      await fetchData();
    } catch (error) {
      console.error('❌ Erreur création catégorie:', error);
      message.error('Erreur lors de la création de la catégorie');
    } finally {
      setUpdateLoading(false);
    }
  };

  // ===== GESTION DES PRODUITS =====
  const handleCreateProduct = async (values) => {
    setUpdateLoading(true);
    try {
      const productData = {
        name: values.name,
        sku: values.code,
        barcode: values.barcode || null,
        description: values.description || null,
        category_id: values.category_id,
        unit_price: parseFloat(values.selling_price) || 0,
        cost_price: parseFloat(values.purchase_price) || 0,
        min_stock: parseInt(values.min_stock) || 5,
        max_stock: parseInt(values.max_stock) || 100,
        reorder_level: parseInt(values.reorder_point) || 10,
        is_active: true
      };

      await api.post('/stock/products', productData);
      message.success('Produit créé avec succès');
      setIsProductModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      console.error('❌ Erreur création produit:', error);
      message.error('Erreur lors de la création du produit');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleCreateMovement = async (values) => {
    setUpdateLoading(true);
    try {
      const movementData = {
        product_id: selectedProduct.id,
        quantity: Math.abs(parseFloat(values.quantity)),
        movement_type: values.movement_type === 'réception' ? 'RECEIPT' : 'SHIPMENT',
        notes: values.notes || null
      };

      await api.post('/stock/movements', movementData);
      message.success('Mouvement enregistré');
      setIsMovementModalVisible(false);
      movementForm.resetFields();
      fetchData();
    } catch (error) {
      console.error('❌ Erreur mouvement:', error);
      message.error('Erreur lors du mouvement');
    } finally {
      setUpdateLoading(false);
    }
  };

  const handleDeleteProduct = async (productId) => {
    setUpdateLoading(true);
    try {
      await api.delete(`/stock/products/${productId}`);
      message.success('Produit désactivé avec succès');
      fetchData();
    } catch (error) {
      console.error('❌ Erreur suppression:', error);
      message.error('Erreur lors de la suppression');
    } finally {
      setUpdateLoading(false);
    }
  };

  const getStockStatus = (product) => {
    const stock = product?.quantity || 0;
    const reorderLevel = product?.reorder_level || 0;
    
    if (stock === 0) return { status: 'out', color: COLORS.red, bg: '#fef2f2', icon: <FireOutlined />, label: 'Rupture' };
    if (stock <= reorderLevel) return { status: 'low', color: COLORS.amber, bg: '#fef3c7', icon: <WarningOutlined />, label: 'Stock faible' };
    return { status: 'ok', color: COLORS.emerald, bg: COLORS.emeraldSurface, icon: <CheckCircleOutlined />, label: 'Stock OK' };
  };

  // ===== RENDU FILTRES =====
  const renderCategorySelect = () => {
    if (!categories || categoriesLoading) {
      return (
        <Select disabled placeholder="Chargement des catégories..." style={{ borderRadius: 10 }}>
          <Option value="">Chargement...</Option>
        </Select>
      );
    }
    
    if (!Array.isArray(categories) || categories.length === 0) {
      return (
        <Select placeholder="Aucune catégorie disponible" style={{ borderRadius: 10 }}>
          <Option value="">Aucune catégorie</Option>
        </Select>
      );
    }
    
    return (
      <Select 
        placeholder="Choisir une catégorie"
        loading={categoriesLoading}
        showSearch
        optionFilterProp="children"
        style={{ borderRadius: 10 }}
        suffixIcon={<TagOutlined style={{ color: COLORS.slateLight }} />}
      >
        {categories.map(cat => (
          <Option key={cat.id} value={cat.id}>
            <Space>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: COLORS.primary,
              }} />
              {cat.name}
            </Space>
          </Option>
        ))}
      </Select>
    );
  };

  const renderCategoryFilter = () => {
    if (!categories || categoriesLoading) {
      return (
        <Select placeholder="Catégorie" style={{ width: '100%', borderRadius: 10 }} disabled>
          <Option value="all">Chargement...</Option>
        </Select>
      );
    }
    
    if (!Array.isArray(categories) || categories.length === 0) {
      return (
        <Select 
          placeholder="Catégorie" 
          style={{ width: '100%', borderRadius: 10 }}
          value={filterCategory}
          onChange={setFilterCategory}
        >
          <Option value="all">Toutes catégories</Option>
        </Select>
      );
    }
    
    return (
      <Select 
        placeholder="Catégorie" 
        style={{ width: '100%', borderRadius: 10 }}
        value={filterCategory}
        onChange={setFilterCategory}
        allowClear
        loading={categoriesLoading}
        suffixIcon={<TagOutlined style={{ color: COLORS.slateLight }} />}
      >
        <Option value="all">Toutes catégories</Option>
        {categories.map(cat => (
          <Option key={cat.id} value={cat.id}>
            <Space>
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: cat.color || COLORS.primary,
              }} />
              {cat.name}
            </Space>
          </Option>
        ))}
      </Select>
    );
  };

  const renderCategoryTag = (record) => {
    if (!categories || !Array.isArray(categories)) {
      return <Tag style={{ borderRadius: 20, background: COLORS.slateSurface, color: COLORS.slate, border: 'none' }}>Chargement...</Tag>;
    }
    
    const category = categories.find(c => c.id === record?.category_id);
    return category ? (
      <Tag 
        style={{ 
          borderRadius: 20, 
          padding: '4px 14px',
          background: COLORS.primarySurface,
          color: COLORS.primary,
          border: 'none',
          fontWeight: 500,
        }}
      >
        {category.name}
      </Tag>
    ) : (
      <Tag style={{ borderRadius: 20, background: COLORS.slateSurface, color: COLORS.slateLight, border: 'none' }}>
        Non catégorisé
      </Tag>
    );
  };

  // ===== COLONNES TABLEAU =====
  const columns = [
    { 
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>SKU</span>, 
      dataIndex: 'sku', 
      key: 'sku',
      width: 120,
      fixed: 'left',
      render: (text) => text ? (
        <Tag 
          style={{ 
            borderRadius: 20, 
            background: COLORS.primarySurface,
            color: COLORS.primary,
            border: 'none',
            fontWeight: 500,
            padding: '4px 12px',
          }}
        >
          {text}
        </Tag>
      ) : <span style={{ color: COLORS.slateLight }}>-</span>
    },
    { 
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Produit</span>, 
      dataIndex: 'name', 
      key: 'name',
      width: 220,
      render: (text, record) => (
        <div>
          <Text strong style={{ color: COLORS.gray800, fontSize: 14 }}>
            {text || 'Sans nom'}
          </Text>
          {record?.description && (
            <div style={{ fontSize: 12, color: COLORS.slateLight, marginTop: 2 }}>
              {record.description.length > 60 ? record.description.substring(0, 60) + '...' : record.description}
            </div>
          )}
          {record.updated_from_discord && (
            <Tag 
              icon={<DiscordOutlined />} 
              style={{ 
                marginTop: 6, 
                borderRadius: 12, 
                fontSize: 10,
                background: COLORS.discordSurface,
                color: COLORS.discord,
                border: 'none',
              }}
            >
              Discord
            </Tag>
          )}
        </div>
      )
    },
    { 
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Catégorie</span>, 
      key: 'category',
      width: 140,
      render: (_, record) => renderCategoryTag(record)
    },
    { 
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Stock</span>, 
      dataIndex: 'quantity', 
      key: 'stock',
      width: 160,
      sorter: (a, b) => (a?.quantity || 0) - (b?.quantity || 0),
      render: (stock, record) => {
        const stockValue = stock || 0;
        const status = getStockStatus(record);
        const percent = Math.min(100, Math.round((stockValue / (record?.max_stock || 100)) * 100));
        
        return (
          <div>
            <Space>
              <Badge 
                status={status.status === 'out' ? 'error' : status.status === 'low' ? 'warning' : 'success'} 
              />
              <Text strong style={{ color: status.color, fontSize: 18 }}>
                {stockValue}
              </Text>
              <Text type="secondary" style={{ fontSize: 12, color: COLORS.slateLight }}>unités</Text>
            </Space>
            <Progress 
              percent={percent} 
              size="small" 
              strokeColor={status.color}
              showInfo={false}
              style={{ marginTop: 4, width: 120 }}
            />
            {stockValue <= (record?.reorder_level || 0) && stockValue > 0 && (
              <Tooltip title={`Seuil critique: ${record?.reorder_level || 0}`}>
                <WarningOutlined style={{ color: COLORS.amber, fontSize: 12, marginLeft: 8 }} />
              </Tooltip>
            )}
          </div>
        );
      }
    },
    { 
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Limites</span>, 
      key: 'stock_limits',
      width: 100,
      render: (_, record) => (
        <Tooltip title={`Min: ${record?.min_stock || 0}, Max: ${record?.max_stock || 0}`}>
          <div>
            <Text strong style={{ color: COLORS.slate }}>
              {record?.min_stock || 0}
            </Text>
            <Text style={{ color: COLORS.slateLight }}> / </Text>
            <Text strong style={{ color: COLORS.slate }}>
              {record?.max_stock || 0}
            </Text>
          </div>
          <div style={{ fontSize: 11, color: COLORS.slateLight, marginTop: 2 }}>
            Seuil: {record?.reorder_level || 0}
          </div>
        </Tooltip>
      )
    },
    { 
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Prix vente</span>, 
      dataIndex: 'unit_price', 
      key: 'unit_price',
      width: 110,
      align: 'right',
      render: (price) => price ? (
        <Text strong style={{ color: COLORS.primary, fontSize: 14 }}>
          {price.toFixed(2)} €
        </Text>
      ) : <span style={{ color: COLORS.slateLight }}>-</span>
    },
    { 
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Valeur totale</span>, 
      key: 'total_value',
      width: 130,
      align: 'right',
      render: (_, record) => {
        const total = ((record?.quantity || 0) * (record?.unit_price || 0));
        return (
          <Text strong style={{ color: COLORS.emerald, fontSize: 14 }}>
            {total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €
          </Text>
        );
      }
    },
    {
      title: <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Actions</span>,
      key: 'actions',
      width: 130,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Mouvement de stock">
            <Button 
              type="text" 
              icon={<ImportOutlined style={{ color: COLORS.primary }} />} 
              onClick={() => {
                setSelectedProduct(record);
                setIsMovementModalVisible(true);
              }}
            />
          </Tooltip>
          <Tooltip title="Voir détails">
            <Button 
              type="text" 
              icon={<EyeOutlined style={{ color: COLORS.slate }} />} 
              onClick={() => {
                setSelectedProduct(record);
                // Vue rapide des détails
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Désactiver le produit"
            description="Êtes-vous sûr de vouloir désactiver ce produit ?"
            onConfirm={() => handleDeleteProduct(record.id)}
            okText="Oui"
            cancelText="Non"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Désactiver">
              <Button type="text" icon={<DeleteOutlined />} danger />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ===== CALCULS =====
  const totalProducts = products.length;
  const lowStockProducts = products.filter(p => p.quantity <= p.reorder_level && p.quantity > 0).length;
  const outOfStockProducts = products.filter(p => p.quantity === 0).length;
  const totalValue = products.reduce((sum, p) => sum + ((p.quantity || 0) * (p.unit_price || 0)), 0);

  const kpiIcons = [<DollarOutlined />, <BoxPlotOutlined />, <WarningOutlined />, <ShoppingCartOutlined />];
  const kpiColors = [COLORS.primary, COLORS.primary, COLORS.red, COLORS.emerald];
  const displayKpis = kpiData.length > 0 ? kpiData : [
    { title: 'Valeur du stock', value: totalValue, trend: 0, color: COLORS.primary, prefix: '€' },
    { title: 'Produits', value: totalProducts, trend: 0, color: COLORS.primary },
    { title: 'Alertes stock', value: lowStockProducts + outOfStockProducts, trend: 0, color: COLORS.red },
    { title: 'En rupture', value: outOfStockProducts, trend: 0, color: COLORS.red }
  ];

  // ===== RENDU =====

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      style={{ 
        padding: 24, 
        background: COLORS.slateSurface, 
        minHeight: '100vh' 
      }}
    >
      {/* ========== ALERTE MISE À JOUR STOCK ========== */}
      <AnimatePresence>
        {stockUpdateAlert && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ marginBottom: 16 }}
          >
            <Alert
              message={
                <Space size="middle">
                  <div style={{ 
                    width: 32, 
                    height: 32, 
                    background: COLORS.discord, 
                    borderRadius: 8, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center' 
                  }}>
                    <DiscordOutlined style={{ color: COLORS.white, fontSize: 16 }} />
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 14, color: COLORS.gray800 }}>
                      Stock mis à jour
                    </Text>
                    <Text style={{ display: 'block', fontSize: 13, color: COLORS.slate }}>
                      "{stockUpdateAlert.productName}" — {stockUpdateAlert.oldQuantity} → {stockUpdateAlert.newQuantity} unités
                    </Text>
                  </div>
                </Space>
              }
              type="info"
              showIcon={false}
              closable
              onClose={() => setStockUpdateAlert(null)}
              style={{ 
                borderRadius: 16, 
                background: COLORS.white, 
                border: `1px solid ${COLORS.gray200}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              }}
              action={
                <Button 
                  size="middle" 
                  type="primary" 
                  icon={<EyeOutlined />} 
                  onClick={() => setStockUpdateAlert(null)}
                  style={{ 
                    background: COLORS.primary, 
                    border: 'none',
                    borderRadius: 10,
                  }}
                >
                  Voir le produit
                </Button>
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ========== EN-TÊTE ========== */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: 28,
          padding: '20px 28px',
          background: COLORS.white,
          borderRadius: 20,
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          border: `1px solid ${COLORS.gray200}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ 
            width: 52, 
            height: 52, 
            background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.navy})`,
            borderRadius: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(26,86,219,0.25)',
          }}>
            <DatabaseOutlined style={{ fontSize: 26, color: COLORS.white }} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0, color: COLORS.gray900, fontWeight: 700 }}>
              Gestion de Stock
            </Title>
            <Text style={{ color: COLORS.slate, fontSize: 14 }}>
              Gérez vos produits, inventaires et mouvements
            </Text>
          </div>
        </div>
        <Space size="middle" wrap>
          <Badge dot={products.filter(p => p.updated_from_discord).length > 0}>
            <Tooltip title={`${products.filter(p => p.updated_from_discord).length} produit(s) mis à jour par Discord`}>
              <Button 
                icon={<DiscordOutlined />} 
                style={{ 
                  borderRadius: 12, 
                  color: COLORS.discord,
                  borderColor: COLORS.gray200,
                }}
              >
                Discord ({products.filter(p => p.updated_from_discord).length})
              </Button>
            </Tooltip>
          </Badge>
          <Tooltip title="Actualiser">
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchData}
              loading={loading}
              style={{ borderRadius: 12 }}
            >
              Actualiser
            </Button>
          </Tooltip>
          <Tooltip title="Exporter les données">
            <Button 
              icon={<ExportOutlined />} 
              onClick={() => {
                message.info('Export en cours de développement');
              }}
              style={{ borderRadius: 12 }}
            >
              Exporter
            </Button>
          </Tooltip>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setIsProductModalVisible(true)}
            style={{ 
              background: `linear-gradient(135deg, ${COLORS.emerald}, ${COLORS.primary})`, 
              border: 'none',
              borderRadius: 12,
              boxShadow: '0 4px 12px rgba(26,86,219,0.3)',
            }}
          >
            Nouveau produit
          </Button>
        </Space>
      </motion.div>

      {/* ========== CHARGEMENT ========== */}
      {loading && products.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80 }}>
          <Spin size="large" tip="Chargement des données..." ><div/></Spin>
        </div>
      ) : (
        <>
          {/* ========== KPIS ========== */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              {displayKpis.map((kpi, index) => (
                <Col xs={24} sm={12} lg={6} key={index}>
                  <KpiCard
                    title={kpi.title}
                    value={kpi.value}
                    prefix={kpi.prefix}
                    icon={kpiIcons[index] || <BoxPlotOutlined />}
                    trend={kpi.trend || 0}
                    color={kpi.color || kpiColors[index]}
                  />
                </Col>
              ))}
            </Row>
          </motion.div>

          {/* ========== INVENTAIRE PAR CATÉGORIE ========== */}
          {categoryStats && Array.isArray(categoryStats) && categoryStats.length > 0 && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
            >
              <div style={{ marginBottom: 24 }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 12, 
                  marginBottom: 16 
                }}>
                  <div style={{
                    width: 32,
                    height: 32,
                    background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.primary})`,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <TagOutlined style={{ color: COLORS.white, fontSize: 16 }} />
                  </div>
                  <Title level={4} style={{ margin: 0, color: COLORS.gray800 }}>
                    Inventaire par catégorie
                  </Title>
                  <Tag style={{ borderRadius: 20, background: COLORS.slateSurface, color: COLORS.slate, border: 'none' }}>
                    {categoryStats.length} catégories
                  </Tag>
                </div>
                <Row gutter={[16, 16]}>
                  {categoryStats.map((cat, index) => {
                    const stockValue = cat?.stock_value || 0;
                    const productCount = cat?.product_count || 0;
                    const totalStockValue = categoryStats.reduce((sum, c) => sum + (c?.stock_value || 0), 0);
                    const color = cat?.color || COLORS.primary;
                    
                    return (
                      <Col xs={12} sm={8} md={6} lg={4} key={index}>
                        <CategoryProgress
                          category={cat?.name}
                          stockValue={stockValue}
                          productCount={productCount}
                          totalValue={totalStockValue}
                          color={color}
                        />
                      </Col>
                    );
                  })}
                </Row>
              </div>
            </motion.div>
          )}

          {/* ========== ALERTE STOCK CRITIQUE ========== */}
          {(lowStockProducts > 0 || outOfStockProducts > 0) && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Alert
                message={
                  <Space>
                    <div style={{
                      width: 28,
                      height: 28,
                      background: COLORS.amber,
                      borderRadius: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <WarningOutlined style={{ color: COLORS.white, fontSize: 14 }} />
                    </div>
                    <Text strong style={{ color: COLORS.gray800 }}>Alertes stock</Text>
                  </Space>
                }
                description={
                  <div>
                    {outOfStockProducts > 0 && (
                      <div>
                        <Text strong style={{ color: COLORS.red }}>
                          {outOfStockProducts} produit{outOfStockProducts > 1 ? 's' : ''} en rupture
                        </Text>
                        <Text style={{ color: COLORS.slate }}> — Réapprovisionnement urgent</Text>
                      </div>
                    )}
                    {lowStockProducts > 0 && (
                      <div>
                        <Text strong style={{ color: COLORS.amber }}>
                          {lowStockProducts} produit{lowStockProducts > 1 ? 's' : ''} en stock faible
                        </Text>
                        <Text style={{ color: COLORS.slate }}> — Pensez à réapprovisionner</Text>
                      </div>
                    )}
                  </div>
                }
                type="warning"
                showIcon={false}
                style={{ 
                  marginBottom: 24, 
                  borderRadius: 14,
                  background: COLORS.white,
                  border: `1px solid ${COLORS.gray200}`,
                }}
                action={
                  <Button 
                    size="middle" 
                    type="primary" 
                    danger 
                    onClick={() => setFilterStatus('low')}
                    style={{ borderRadius: 10 }}
                  >
                    Voir les alertes
                  </Button>
                }
              />
            </motion.div>
          )}

          {/* ========== FILTRES ========== */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.35 }}
          >
            <Card 
              style={{ 
                marginBottom: 24, 
                borderRadius: 16, 
                border: `1px solid ${COLORS.gray200}`, 
                background: COLORS.white,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
              bodyStyle={{ padding: '16px 20px' }}
            >
              <Row gutter={[16, 12]} align="middle">
                <Col xs={24} md={7}>
                  <Search 
                    placeholder="Rechercher un produit..." 
                    enterButton={<FilterOutlined />}
                    onSearch={setSearchText}
                    allowClear
                    onChange={(e) => !e.target.value && setSearchText('')}
                    style={{ borderRadius: 10 }}
                  />
                </Col>
                <Col xs={12} md={5}>
                  {renderCategoryFilter()}
                </Col>
                <Col xs={12} md={5}>
                  <Select 
                    placeholder="Statut stock" 
                    style={{ width: '100%', borderRadius: 10 }}
                    value={filterStatus}
                    onChange={setFilterStatus}
                    allowClear
                    suffixIcon={<ExclamationCircleOutlined style={{ color: COLORS.slateLight }} />}
                  >
                    <Option value="all">Tous les statuts</Option>
                    <Option value="ok">Stock OK</Option>
                    <Option value="low">Stock faible</Option>
                    <Option value="out">Rupture</Option>
                  </Select>
                </Col>
                <Col xs={24} md={7}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button 
                      type="primary"
                      icon={<FilterOutlined />} 
                      onClick={fetchData} 
                      block
                      style={{ 
                        background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, 
                        border: 'none',
                        borderRadius: 10,
                      }}
                    >
                      Appliquer
                    </Button>
                    <Button 
                      icon={<ReloadOutlined />} 
                      onClick={() => {
                        setFilterCategory('all');
                        setFilterStatus('all');
                        setSearchText('');
                        fetchData();
                      }}
                      style={{ borderRadius: 10 }}
                    >
                      Réinitialiser
                    </Button>
                  </div>
                </Col>
              </Row>
            </Card>
          </motion.div>

          {/* ========== TABLEAU DES PRODUITS ========== */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card 
              title={
                <Space size="middle">
                  <div style={{ 
                    width: 36, 
                    height: 36, 
                    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                    <BoxPlotOutlined style={{ color: COLORS.white, fontSize: 16 }} />
                  </div>
                  <span style={{ fontWeight: 600, color: COLORS.gray800, fontSize: 16 }}>
                    Inventaire des produits
                  </span>
                  <Tag style={{ borderRadius: 20, background: COLORS.slateSurface, color: COLORS.slate, border: 'none' }}>
                    {totalProducts}
                  </Tag>
                  {outOfStockProducts > 0 && (
                    <Tag 
                      color="error" 
                      style={{ borderRadius: 20 }}
                    >
                      {outOfStockProducts} rupture{outOfStockProducts > 1 ? 's' : ''}
                    </Tag>
                  )}
                </Space>
              }
              extra={
                <Space size="middle">
                  <Badge 
                    status="success" 
                    text={<span style={{ color: COLORS.emerald, fontWeight: 500 }}>Stock OK</span>} 
                  />
                  <Badge 
                    status="warning" 
                    text={<span style={{ color: COLORS.amber, fontWeight: 500 }}>Stock faible</span>} 
                  />
                  <Badge 
                    status="error" 
                    text={<span style={{ color: COLORS.red, fontWeight: 500 }}>Rupture</span>} 
                  />
                  <Button 
                    type="link" 
                    icon={<TagOutlined />}
                    onClick={() => setIsCategoryModalVisible(true)}
                    style={{ color: COLORS.primary }}
                  >
                    Gérer catégories
                  </Button>
                </Space>
              }
              style={{ 
                borderRadius: 16, 
                border: `1px solid ${COLORS.gray200}`, 
                background: COLORS.white,
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
            >
              <Spin spinning={loading}>
                {products.length === 0 ? (
                  <Empty 
                    description={
                      <div>
                        <Text style={{ color: COLORS.slate }}>Aucun produit trouvé</Text>
                        <br />
                        <Button 
                          type="primary" 
                          icon={<PlusOutlined />} 
                          onClick={() => setIsProductModalVisible(true)}
                          style={{ marginTop: 12, borderRadius: 10 }}
                        >
                          Ajouter un produit
                        </Button>
                      </div>
                    }
                    style={{ padding: '40px 0' }}
                  />
                ) : (
                  <Table 
                    columns={columns} 
                    dataSource={products}
                    rowKey="id"
                    pagination={{ 
                      pageSize: 10, 
                      showSizeChanger: true, 
                      showTotal: (total) => (
                        <span style={{ color: COLORS.slate }}>
                          📊 Total: {total} produit{total > 1 ? 's' : ''}
                        </span>
                      ),
                      pageSizeOptions: ['10', '20', '50'],
                      showQuickJumper: true
                    }}
                    scroll={{ x: 1200 }}
                    size="middle"
                    style={{ borderRadius: 12 }}
                    rowClassName={(record) => {
                      if (record.quantity === 0) return 'row-out-of-stock';
                      if (record.quantity <= record.reorder_level) return 'row-low-stock';
                      if (record.updated_from_discord) return 'row-discord';
                      return '';
                    }}
                  />
                )}
              </Spin>
            </Card>
          </motion.div>
        </>
      )}

      {/* ========== MODAL CRÉATION PRODUIT ========== */}
      <Modal
        title={
          <Space size="middle">
            <div style={{ 
              width: 32, 
              height: 32, 
              background: `linear-gradient(135deg, ${COLORS.emerald}, ${COLORS.primary})`, 
              borderRadius: 10, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <PlusOutlined style={{ color: COLORS.white, fontSize: 16 }} />
            </div>
            <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Nouveau produit</span>
          </Space>
        }
        open={isProductModalVisible}
        onCancel={() => {
          setIsProductModalVisible(false);
          form.resetFields();
        }}
        width={720}
        footer={null}
        destroyOnClose
        style={{ borderRadius: 20 }}
        bodyStyle={{ paddingTop: 8 }}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateProduct}>
          <Card 
            title={
              <Space>
                <TagOutlined style={{ color: COLORS.primary }} />
                <span style={{ color: COLORS.gray800 }}>Informations générales</span>
              </Space>
            }
            size="small"
            style={{ 
              marginBottom: 16, 
              background: COLORS.gray50, 
              borderRadius: 14, 
              border: `1px solid ${COLORS.gray200}`,
            }}
            headStyle={{ borderBottom: `1px solid ${COLORS.gray200}` }}
          >
            <Form.Item 
              name="name" 
              label="Nom du produit" 
              rules={[{ required: true, message: 'Nom requis' }]}
              style={{ marginBottom: 8 }}
            >
              <Input placeholder="Ex: iPhone 15 Pro" style={{ borderRadius: 10 }} />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="code" 
                  label="Code SKU" 
                  rules={[{ required: true, message: 'SKU requis' }]}
                  style={{ marginBottom: 8 }}
                >
                  <Input placeholder="SKU-001" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="barcode" label="Code-barres" style={{ marginBottom: 8 }}>
                  <Input placeholder="1234567890123" style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item name="description" label="Description" style={{ marginBottom: 8 }}>
              <Input.TextArea rows={2} placeholder="Description du produit" style={{ borderRadius: 10 }} />
            </Form.Item>
          </Card>

          <Card 
            title={
              <Space>
                <ShoppingCartOutlined style={{ color: COLORS.primary }} />
                <span style={{ color: COLORS.gray800 }}>Prix et stock</span>
              </Space>
            }
            size="small"
            style={{ 
              marginBottom: 16, 
              background: COLORS.gray50, 
              borderRadius: 14, 
              border: `1px solid ${COLORS.gray200}`,
            }}
            headStyle={{ borderBottom: `1px solid ${COLORS.gray200}` }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  name="selling_price" 
                  label="Prix de vente (€)" 
                  rules={[{ required: true, message: 'Prix requis' }]}
                  style={{ marginBottom: 8 }}
                >
                  <Input 
                    type="number" 
                    min={0} 
                    step={0.01} 
                    prefix="€"
                    placeholder="0.00" 
                    style={{ borderRadius: 10 }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="purchase_price" label="Prix d'achat (€)" style={{ marginBottom: 8 }}>
                  <Input 
                    type="number" 
                    min={0} 
                    step={0.01} 
                    prefix="€"
                    placeholder="0.00" 
                    style={{ borderRadius: 10 }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item 
                  name="min_stock" 
                  label="Stock minimum" 
                  initialValue={5}
                  style={{ marginBottom: 8 }}
                >
                  <Input type="number" min={0} step={1} style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item 
                  name="max_stock" 
                  label="Stock maximum" 
                  initialValue={100}
                  style={{ marginBottom: 8 }}
                >
                  <Input type="number" min={0} step={1} style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item 
                  name="reorder_point" 
                  label="Seuil de réapprovisionnement" 
                  initialValue={10}
                  style={{ marginBottom: 8 }}
                >
                  <Input type="number" min={0} step={1} style={{ borderRadius: 10 }} />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card 
            title={
              <Space>
                <TagOutlined style={{ color: COLORS.primary }} />
                <span style={{ color: COLORS.gray800 }}>Catégorie</span>
              </Space>
            }
            size="small"
            style={{ 
              marginBottom: 16, 
              background: COLORS.gray50, 
              borderRadius: 14, 
              border: `1px solid ${COLORS.gray200}`,
            }}
            headStyle={{ borderBottom: `1px solid ${COLORS.gray200}` }}
          >
            <Row gutter={16}>
              <Col span={18}>
                <Form.Item 
                  name="category_id" 
                  label="Catégorie" 
                  rules={[{ required: true, message: 'Catégorie requise' }]}
                  style={{ marginBottom: 8 }}
                >
                  {renderCategorySelect()}
                </Form.Item>
              </Col>
              <Col span={6}>
                <Button 
                  type="dashed" 
                  icon={<PlusOutlined />} 
                  onClick={() => setIsCategoryModalVisible(true)}
                  style={{ marginTop: 30, borderRadius: 10 }}
                  block
                >
                  Nouvelle
                </Button>
              </Col>
            </Row>
          </Card>

          <Form.Item style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button 
                onClick={() => {
                  setIsProductModalVisible(false);
                  form.resetFields();
                }} 
                size="large" 
                style={{ borderRadius: 10 }}
              >
                Annuler
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large" 
                loading={updateLoading}
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS.emerald}, ${COLORS.primary})`, 
                  border: 'none', 
                  borderRadius: 10,
                  padding: '0 40px',
                  boxShadow: '0 4px 12px rgba(26,86,219,0.3)',
                }}
              >
                Créer le produit
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* ========== MODAL MOUVEMENT DE STOCK ========== */}
      <Modal
        title={
          <Space size="middle">
            <div style={{ 
              width: 32, 
              height: 32, 
              background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, 
              borderRadius: 10, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <ImportOutlined style={{ color: COLORS.white, fontSize: 16 }} />
            </div>
            <span style={{ color: COLORS.gray800, fontWeight: 600 }}>
              Mouvement de stock
            </span>
            {selectedProduct && (
              <Tag style={{ borderRadius: 20, background: COLORS.primarySurface, color: COLORS.primary, border: 'none' }}>
                {selectedProduct.name}
              </Tag>
            )}
          </Space>
        }
        open={isMovementModalVisible}
        onCancel={() => {
          setIsMovementModalVisible(false);
          movementForm.resetFields();
          setSelectedProduct(null);
        }}
        width={520}
        footer={null}
        destroyOnClose
        style={{ borderRadius: 20 }}
      >
        <Form form={movementForm} layout="vertical" onFinish={handleCreateMovement}>
          <Alert 
            message={
              <Space>
                <BoxPlotOutlined style={{ color: COLORS.primary }} />
                <span>Stock actuel: <Text strong>{selectedProduct?.quantity || 0}</Text> unités</span>
              </Space>
            } 
            type="info" 
            showIcon={false}
            style={{ marginBottom: 16, borderRadius: 12, background: COLORS.primarySurface, border: `1px solid ${COLORS.primaryLighter}` }}
          />

          <Form.Item name="movement_type" label="Type de mouvement" rules={[{ required: true, message: 'Type requis' }]}>
            <Select 
              placeholder="Sélectionner" 
              style={{ borderRadius: 10 }}
            >
              <Option value="réception"><RiseOutlined style={{ color: COLORS.emerald }} /> Réception</Option>
              <Option value="expédition"><FallOutlined style={{ color: COLORS.red }} /> Expédition</Option>
            </Select>
          </Form.Item>

          <Form.Item name="quantity" label="Quantité" rules={[{ required: true, message: 'Quantité requise' }]}>
            <Input 
              type="number" 
              min={1} 
              step={1} 
              placeholder="Nombre d'unités" 
              style={{ borderRadius: 10 }}
            />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={3} placeholder="Informations complémentaires..." style={{ borderRadius: 10 }} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button 
                onClick={() => {
                  setIsMovementModalVisible(false);
                  movementForm.resetFields();
                  setSelectedProduct(null);
                }} 
                size="large" 
                style={{ borderRadius: 10 }}
              >
                Annuler
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large" 
                loading={updateLoading}
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.primaryDark})`, 
                  border: 'none', 
                  borderRadius: 10,
                  padding: '0 32px',
                  boxShadow: '0 4px 12px rgba(26,86,219,0.3)',
                }}
              >
                Valider le mouvement
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* ========== MODAL CRÉATION CATÉGORIE ========== */}
      <Modal
        title={
          <Space size="middle">
            <div style={{ 
              width: 32, 
              height: 32, 
              background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.primary})`, 
              borderRadius: 10, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center' 
            }}>
              <TagOutlined style={{ color: COLORS.white, fontSize: 16 }} />
            </div>
            <span style={{ color: COLORS.gray800, fontWeight: 600 }}>Nouvelle catégorie</span>
          </Space>
        }
        open={isCategoryModalVisible}
        onCancel={() => {
          setIsCategoryModalVisible(false);
          categoryForm.resetFields();
        }}
        width={520}
        footer={null}
        destroyOnClose
        style={{ borderRadius: 20 }}
      >
        <Form form={categoryForm} layout="vertical" onFinish={handleCreateCategory}>
          <Card 
            style={{ 
              marginBottom: 16, 
              borderRadius: 14, 
              border: `1px solid ${COLORS.gray200}`,
              background: COLORS.gray50,
            }}
            size="small"
          >
            <Form.Item name="name" label="Nom de la catégorie" rules={[{ required: true, message: 'Nom requis' }]}>
              <Input placeholder="Ex: Électronique" style={{ borderRadius: 10 }} />
            </Form.Item>

            <Form.Item name="description" label="Description">
              <Input.TextArea rows={3} placeholder="Description de la catégorie" style={{ borderRadius: 10 }} />
            </Form.Item>
          </Card>

          <Form.Item style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <Button onClick={() => setIsCategoryModalVisible(false)} size="large" style={{ borderRadius: 10 }}>
                Annuler
              </Button>
              <Button 
                type="primary" 
                htmlType="submit" 
                size="large" 
                loading={updateLoading}
                style={{ 
                  background: `linear-gradient(135deg, ${COLORS.teal}, ${COLORS.primary})`, 
                  border: 'none', 
                  borderRadius: 10,
                  padding: '0 32px',
                }}
              >
                Créer la catégorie
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* Styles CSS globaux */}
      <style jsx="true">{`
        .row-out-of-stock {
          background: #fef2f2 !important;
        }
        .row-out-of-stock:hover {
          background: #fee2e2 !important;
        }
        .row-low-stock {
          background: #fef3c7 !important;
        }
        .row-low-stock:hover {
          background: #fde68a !important;
        }
        .row-discord {
          background: ${COLORS.discordSurface} !important;
        }
        .row-discord:hover {
          background: #e0e7ff !important;
        }
        .ant-table-row {
          transition: background 0.2s ease;
        }
        .ant-table-row:hover {
          background: ${COLORS.gray50} !important;
        }
        .ant-tabs-tab-active .ant-tabs-tab-btn {
          color: ${COLORS.primary} !important;
        }
        .ant-tabs-ink-bar {
          background: ${COLORS.primary} !important;
        }
      `}</style>
    </motion.div>
  );
};

export default StockDashboard;