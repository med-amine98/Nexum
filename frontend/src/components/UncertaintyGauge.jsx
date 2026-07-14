// src/components/UncertaintyGauge.jsx
import React from 'react';
import { Progress, Tooltip } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

const UncertaintyGauge = ({ value, uncertainty, title, size = 120 }) => {
  const lowerBound = Math.max(0, value - uncertainty);
  const upperBound = Math.min(100, value + uncertainty);
  
  return (
    <div style={{ textAlign: 'center' }}>
      <Tooltip title={`Intervalle de confiance: ${lowerBound.toFixed(1)}% - ${upperBound.toFixed(1)}%`}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <Progress
            type="circle"
            percent={value}
            width={size}
            strokeColor={value > 70 ? '#f5222d' : value > 40 ? '#faad14' : '#52c41a'}
            format={(percent) => `${percent}%`}
          />
          <div style={{ position: 'absolute', top: -5, right: -5 }}>
            <InfoCircleOutlined style={{ color: '#1890ff', fontSize: 16 }} />
          </div>
        </div>
      </Tooltip>
      <div style={{ marginTop: 8 }}>
        <div><strong>{title}</strong></div>
        <div style={{ fontSize: 12, color: '#666' }}>
          ±{uncertainty.toFixed(1)}% d'incertitude
        </div>
        <div style={{ fontSize: 11, color: '#999' }}>
          IC 95%: [{lowerBound.toFixed(0)}% - {upperBound.toFixed(0)}%]
        </div>
      </div>
    </div>
  );
};

export default UncertaintyGauge;