import React, { useState, useEffect } from 'react';
import { Modal, Input, List, Avatar, Tag } from 'antd';
import { 
  SearchOutlined, 
  UserOutlined, 
  ShoppingOutlined,
  FileTextOutlined,
  BarChartOutlined,
  RobotOutlined
} from '@ant-design/icons';
import { useCopilot } from '../../hooks/useCopilot';

const CopilotCommandBar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { sendMessage } = useCopilot();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const commands = [
    {
      category: 'Clients',
      items: [
        { icon: <UserOutlined />, text: 'Créer un nouveau client', action: 'Créer un client' },
        { icon: <SearchOutlined />, text: 'Rechercher un client', action: 'Rechercher client' },
        { icon: <FileTextOutlined />, text: 'Voir les derniers clients', action: 'Afficher les clients récents' }
      ]
    },
    {
      category: 'Factures',
      items: [
        { icon: <FileTextOutlined />, text: 'Créer une facture', action: 'Créer une facture' },
        { icon: <SearchOutlined />, text: 'Factures impayées', action: 'Afficher les factures impayées' },
        { icon: <BarChartOutlined />, text: 'Chiffre d\'affaires', action: 'Analyser le CA' }
      ]
    },
    {
      category: 'Analyses',
      items: [
        { icon: <BarChartOutlined />, text: 'Analyser les ventes', action: 'Analyser les ventes du mois' },
        { icon: <RobotOutlined />, text: 'Prédictions', action: 'Faire des prédictions' },
        { icon: <ShoppingOutlined />, text: 'Stocks critiques', action: 'Voir les stocks bas' }
      ]
    }
  ];

  const filteredCommands = commands.map(cat => ({
    ...cat,
    items: cat.items.filter(item => 
      item.text.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0);

  const handleSelect = (action) => {
    sendMessage(action);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <RobotOutlined style={{ color: '#4158D0' }} />
          <span>Commandes Copilot</span>
          <Tag color="blue">Ctrl+K</Tag>
        </div>
      }
      open={isOpen}
      onCancel={() => setIsOpen(false)}
      footer={null}
      width={600}
      className="command-bar-modal"
    >
      <Input
        placeholder="Rechercher une commande..."
        prefix={<SearchOutlined />}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        autoFocus
        size="large"
        style={{ marginBottom: 16 }}
      />

      <div className="commands-list" style={{ maxHeight: 400, overflowY: 'auto' }}>
        {filteredCommands.map((category, idx) => (
          <div key={idx} style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#666' }}>
              {category.category}
            </div>
            <List
              size="small"
              dataSource={category.items}
              renderItem={item => (
                <List.Item
                  onClick={() => handleSelect(item.action)}
                  style={{ cursor: 'pointer', padding: '8px 12px' }}
                  className="command-item"
                >
                  <List.Item.Meta
                    avatar={<Avatar icon={item.icon} size="small" style={{ backgroundColor: '#4158D0' }} />}
                    title={item.text}
                  />
                </List.Item>
              )}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 16, color: '#999', fontSize: 12 }}>
        Tapez une commande ou utilisez les flèches pour naviguer
      </div>
    </Modal>
  );
};

export default CopilotCommandBar;