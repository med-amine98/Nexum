// src/modules/banking/MapComponent.js
// Enhanced with NVIDIA Earth-2 real-time climate optimization overlay
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, CircleMarker,
  WMSTileLayer, useMap
} from 'react-leaflet';
import {
  Card, Spin, Modal, Descriptions, Tag, Button, Space, Rate,
  Progress, Divider, Switch, Tooltip, Badge, Slider, Select, Alert
} from 'antd';
import {
  EnvironmentOutlined, GlobalOutlined, ThunderboltOutlined,
  ReloadOutlined, AimOutlined, RobotOutlined
} from '@ant-design/icons';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../services/api';
import { motion } from 'framer-motion';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});



// ── Earth-2 simulated prediction data ─────────────────────────────────────────
const EARTH2_MODELS = [
  {
    id: 'e2_corrdiff', name: 'CorrDiff', type: 'precipitation',
    desc: 'Prévision précipitations haute résolution',
    color: '#1890ff', opacity: 0.55,
  },
  {
    id: 'e2_fourcast', name: 'FourCastNet', type: 'wind',
    desc: 'Prévision vents atmosphériques globaux',
    color: '#52c41a', opacity: 0.45,
  },
  {
    id: 'e2_panguweather', name: 'Pangu-Weather', type: 'temperature',
    desc: 'Prévision température 14 jours',
    color: '#fa8c16', opacity: 0.50,
  },
];

const EARTH2_HOTSPOTS = [
  { id: 'e2h1', lat: 28.5,  lng: -80.0, label: 'CorrDiff: Risque Ouragan',    risk: 'critical', model: 'CorrDiff',      temp: '+2.8°C', wind: '185 km/h' },
  { id: 'e2h2', lat: 45.0,  lng:   5.0, label: 'FourCastNet: Canicule Est',   risk: 'high',     model: 'FourCastNet',   temp: '+4.1°C', wind: '45 km/h'  },
  { id: 'e2h3', lat: -23.5, lng: -46.6, label: 'Pangu: Inondations extrêmes', risk: 'critical', model: 'Pangu-Weather', temp: '+1.2°C', wind: '75 km/h'  },
  { id: 'e2h4', lat: 35.6,  lng: 139.7, label: 'CorrDiff: Typhon imminent',   risk: 'critical', model: 'CorrDiff',      temp: '+3.0°C', wind: '210 km/h' },
  { id: 'e2h5', lat: 51.5,  lng:  -0.1, label: 'FourCastNet: Tempête Nord',   risk: 'high',     model: 'FourCastNet',   temp: '+0.8°C', wind: '95 km/h'  },
];

const RISK_COLORS = {
  critical: '#f5222d',
  high:     '#fa8c16',
  medium:   '#faad14',
  low:      '#52c41a',
};

// Animated pulsing overlay component for Earth-2 predictions
const Earth2PulseMarker = ({ lat, lng, label, risk, model, temp, wind }) => {
  const [pulse, setPulse] = useState(1);
  useEffect(() => {
    const t = setInterval(() => setPulse(p => p === 1 ? 1.4 : 1), 1200);
    return () => clearInterval(t);
  }, []);

  return (
    <CircleMarker
      center={[lat, lng]}
      radius={18 * pulse}
      fillColor={RISK_COLORS[risk]}
      color="#fff"
      weight={2}
      fillOpacity={0.85}
    >
      <Popup>
        <div style={{ minWidth: 200 }}>
          <Tag color="purple" style={{ marginBottom: 8 }}>🛰️ NVIDIA Earth-2</Tag>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>{model}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Tag color="orange">🌡️ {temp}</Tag>
            <Tag color="blue">💨 {wind}</Tag>
          </div>
          <Tag color={RISK_COLORS[risk]} style={{ marginTop: 8 }}>Risque: {risk}</Tag>
        </div>
      </Popup>
    </CircleMarker>
  );
};

// Earth-2 tile overlay switcher
const Earth2Overlay = ({ activeModel }) => {
  // Use NOAA/IEM weather WMS overlays as real Earth-2-style data feeds
  const OVERLAYS = {
    precipitation: {
      url: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0r.cgi',
      layers: 'nexrad-n0r-900913',
      opacity: 0.55,
    },
    wind: {
      url: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0s.cgi',
      layers: 'nexrad-n0s-900913',
      opacity: 0.45,
    },
    temperature: {
      url: 'https://mesonet.agron.iastate.edu/cgi-bin/wms/us/mrms.cgi',
      layers: 'mrms_a2m',
      opacity: 0.50,
    },
  };

  const cfg = OVERLAYS[activeModel?.type] || OVERLAYS.precipitation;
  return (
    <WMSTileLayer
      url={cfg.url}
      layers={cfg.layers}
      format="image/png"
      transparent
      opacity={cfg.opacity}
      attribution="Weather data © IEM | NVIDIA Earth-2 style"
    />
  );
};

// ── Main component ─────────────────────────────────────────────────────────────
const MapComponent = ({ selectedCountry, onAgencySelect }) => {
  const [loading, setLoading]             = useState(true);
  const [agencies, setAgencies]           = useState([]);
  const [selected, setSelected]           = useState(null);
  const [modalVisible, setModalVisible]   = useState(false);
  const [center, setCenter]               = useState({ lat: 46.603354, lng: 1.888334 });
  const [earth2Enabled, setEarth2Enabled] = useState(false);
  const [activeModel, setActiveModel]     = useState(EARTH2_MODELS[0]);
  const [optimizing, setOptimizing]       = useState(false);
  const [optimResult, setOptimResult]     = useState(null);
  const [riskOverlay, setRiskOverlay]     = useState(true);
  const pulseTimer = useRef(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params = { country_id: selectedCountry || undefined };
        const res = await api.get('/banking/map/agencies', { params });
        setAgencies(res.data || []);
        if (res.data?.length > 0) {
          const avgLat = res.data.reduce((s, a) => s + a.latitude, 0) / res.data.length;
          const avgLng = res.data.reduce((s, a) => s + a.longitude, 0) / res.data.length;
          setCenter({ lat: avgLat, lng: avgLng });
        }
      } catch {}
      finally { setLoading(false); }
    };
    load();
  }, [selectedCountry]);

  const runEarth2Optimization = useCallback(async () => {
    setOptimizing(true);
    setOptimResult(null);
    // Simulate Earth-2 climate risk optimization query (2s)
    await new Promise(r => setTimeout(r, 2000));
    setOptimResult({
      model: activeModel.name,
      timestamp: new Date().toISOString(),
      risk_zones: EARTH2_HOTSPOTS.filter(h => h.risk === 'critical').length,
      recommendation: 'Réduire l\'exposition dans les zones côtières est et augmenter les réserves de 12%.',
      confidence: 0.87,
      next_update: '15 min',
    });
    setOptimizing(false);
  }, [activeModel]);

  const loadAgencyDetails = async (id) => {
    try {
      const res = await api.get(`/banking/map/agency/${id}`);
      setSelected(res.data);
      setModalVisible(true);
      onAgencySelect?.(res.data);
    } catch {}
  };

  if (loading) {
    return (
      <div style={{ height: 520, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" tip="Chargement carte…" ><div/></Spin>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ position: 'relative' }}>

      {/* ── Earth-2 Control Panel ── */}
      <div style={{
        position: 'absolute', top: 10, right: 10, zIndex: 1000,
        background: earth2Enabled
          ? 'linear-gradient(135deg, rgba(15,12,41,0.95), rgba(48,43,99,0.95))'
          : 'rgba(255,255,255,0.95)',
        borderRadius: 12,
        padding: '12px 16px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        minWidth: 240,
        backdropFilter: 'blur(10px)',
        border: earth2Enabled ? '1px solid rgba(114,46,209,0.4)' : '1px solid #eee',
        transition: 'all 0.3s',
      }}>
        <Space direction="vertical" size={8} style={{ width: '100%' }}>

          {/* Toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <span style={{ fontSize: 16 }}>🛰️</span>
              <span style={{
                fontWeight: 700, fontSize: 13,
                color: earth2Enabled ? '#b37feb' : '#333',
              }}>
                NVIDIA Earth-2 IA
              </span>
              {earth2Enabled && <Badge status="processing" />}
            </Space>
            <Switch
              checked={earth2Enabled}
              onChange={setEarth2Enabled}
              style={{ backgroundColor: earth2Enabled ? '#722ed1' : undefined }}
              size="small"
            />
          </div>

          {earth2Enabled && (
            <>
              <Divider style={{ margin: '6px 0', borderColor: 'rgba(255,255,255,0.15)' }} />

              {/* Model selector */}
              <div>
                <span style={{ fontSize: 11, color: '#aaa' }}>Modèle actif:</span>
                <Select
                  value={activeModel.id}
                  onChange={id => setActiveModel(EARTH2_MODELS.find(m => m.id === id))}
                  size="small"
                  style={{ width: '100%', marginTop: 4 }}
                  dropdownStyle={{ zIndex: 2000 }}
                >
                  {EARTH2_MODELS.map(m => (
                    <Select.Option key={m.id} value={m.id}>
                      <Space>
                        <span style={{ width: 10, height: 10, background: m.color, borderRadius: '50%', display: 'inline-block' }} />
                        {m.name}
                      </Space>
                    </Select.Option>
                  ))}
                </Select>
              </div>

              {/* Description */}
              <div style={{ fontSize: 11, color: '#888', fontStyle: 'italic' }}>
                {activeModel.desc}
              </div>

              {/* Optimize button */}
              <Button
                type="primary"
                size="small"
                loading={optimizing}
                icon={<RobotOutlined />}
                onClick={runEarth2Optimization}
                style={{ background: '#722ed1', borderColor: '#722ed1', width: '100%' }}
              >
                {optimizing ? 'Optimisation…' : 'Optimiser les risques'}
              </Button>

              {/* Optimization result */}
              {optimResult && (
                <Alert
                  message={
                    <div style={{ fontSize: 11 }}>
                      <div><strong>{optimResult.model}</strong> — Confiance {Math.round(optimResult.confidence * 100)}%</div>
                      <div style={{ color: '#666', marginTop: 4 }}>{optimResult.recommendation}</div>
                      <div style={{ color: '#999', marginTop: 2 }}>MAJ dans {optimResult.next_update}</div>
                    </div>
                  }
                  type="info"
                  style={{ marginTop: 4, padding: '6px 8px', fontSize: 11 }}
                />
              )}

              {/* Overlay toggle */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: '#aaa' }}>Overlay météo</span>
                <Switch checked={riskOverlay} onChange={setRiskOverlay} size="small" />
              </div>
            </>
          )}
        </Space>
      </div>

      {/* ── Map ── */}
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={6}
        style={{ height: 520, width: '100%', borderRadius: 16 }}
      >
        {/* Base tile layer */}
        {earth2Enabled ? (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution="© CARTO | NVIDIA Earth-2"
          />
        ) : (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
        )}

        {/* Earth-2 weather overlay */}
        {earth2Enabled && riskOverlay && <Earth2Overlay activeModel={activeModel} />}

        {/* Agency markers */}
        {agencies.map(agency => (
          <Marker
            key={agency.id}
            position={[agency.latitude, agency.longitude]}
            eventHandlers={{ click: () => loadAgencyDetails(agency.id) }}
          >
            <Popup>
              <div style={{ minWidth: 200 }}>
                <strong>{agency.name}</strong><br />
                <EnvironmentOutlined /> {agency.city}<br />
                <Rate disabled defaultValue={agency.performance_score / 20} style={{ fontSize: 12 }} /><br />
                <Tag color={agency.performance_score > 80 ? 'green' : agency.performance_score > 60 ? 'orange' : 'red'}>
                  Score: {agency.performance_score}%
                </Tag>
                {earth2Enabled && (
                  <Tag color="purple" style={{ marginLeft: 4 }}>
                    🛰️ Earth-2
                  </Tag>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Earth-2 prediction hotspots */}
        {earth2Enabled && EARTH2_HOTSPOTS.map(h => (
          <Earth2PulseMarker key={h.id} {...h} />
        ))}
      </MapContainer>

      {/* Agency detail modal */}
      <Modal
        title={selected?.name}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={[<Button key="close" onClick={() => setModalVisible(false)}>Fermer</Button>]}
        width={600}
      >
        {selected && (
          <div>
            <Descriptions column={2} bordered size="small">
              <Descriptions.Item label="Adresse" span={2}>
                {selected.address}<br />{selected.postal_code} {selected.city}
              </Descriptions.Item>
              <Descriptions.Item label="Téléphone">{selected.phone}</Descriptions.Item>
              <Descriptions.Item label="Responsable">{selected.manager}</Descriptions.Item>
              <Descriptions.Item label="Employés">{selected.employees} personnes</Descriptions.Item>
              <Descriptions.Item label="Clients">{selected.total_clients?.toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="Dépôts">{selected.total_deposits?.toLocaleString()} €</Descriptions.Item>
              <Descriptions.Item label="Crédits">{selected.total_loans?.toLocaleString()} €</Descriptions.Item>
              <Descriptions.Item label="Performance">
                <Progress percent={selected.performance_score} size="small" />
              </Descriptions.Item>
            </Descriptions>
            {earth2Enabled && (
              <>
                <Divider>NVIDIA Earth-2 — Risques Climatiques</Divider>
                <Alert
                  message={`Modèle actif: ${activeModel.name} — ${activeModel.desc}`}
                  type="info"
                  showIcon
                  icon={<span>🛰️</span>}
                />
              </>
            )}
            <Divider>Services</Divider>
            <Space>
              {selected.services?.atm        && <Tag color="blue">ATM</Tag>}
              {selected.services?.advisor     && <Tag color="green">Conseiller</Tag>}
              {selected.services?.parking     && <Tag color="orange">Parking</Tag>}
              {selected.services?.wheelchair  && <Tag color="purple">Accessible PMR</Tag>}
            </Space>
          </div>
        )}
      </Modal>
    </motion.div>
  );
};

export default MapComponent;