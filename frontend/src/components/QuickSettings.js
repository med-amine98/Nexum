// src/components/QuickSettings.js
import React from 'react';
import { Card, Switch, Select, Space, Typography } from 'antd';
import { useTheme } from '../context/ThemeContext';

const { Option } = Select;
const { Text } = Typography;

const QuickSettings = () => {
  const { theme, toggleTheme, language, changeLanguage } = useTheme();

  return (
    <Card className="quick-settings-card" title="Paramètres rapides"
      extra={
        <Space>
          <Text>Thème</Text>
          <Switch
            checked={theme === 'dark'}
            onChange={toggleTheme}
            checkedChildren="Sombre"
            unCheckedChildren="Clair"
          />
        </Space>
      }
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        <Select
          value={language}
          onChange={changeLanguage}
          style={{ width: '100%' }}
        >
          <Option value="fr">Français</Option>
          <Option value="en">English</Option>
        </Select>
      </Space>
    </Card>
  );
};

export default QuickSettings;
