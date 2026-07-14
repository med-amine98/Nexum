// src/components/RiskRadar.jsx
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';

const RiskRadar = ({ data, title }) => {
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: 'var(--bg-secondary)', padding: '8px 12px', border: '1px solid #ccc', borderRadius: 4 }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{payload[0].payload.category}</p>
          <p style={{ margin: 0, color: '#f5222d' }}>Score: {payload[0].value}%</p>
          <p style={{ margin: 0, fontSize: 12, color: '#666' }}>
            Niveau: {payload[0].value > 70 ? 'Critique' : payload[0].value > 40 ? 'Élevé' : 'Modéré'}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div>
      <h4 style={{ textAlign: 'center', marginBottom: 16 }}>{title}</h4>
      <ResponsiveContainer width="100%" height={300}>
        <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
          <PolarGrid />
          <PolarAngleAxis dataKey="category" tick={{ fontSize: 12 }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
          <Radar
            name="Risque"
            dataKey="score"
            stroke="#f5222d"
            fill="#f5222d"
            fillOpacity={0.3}
          />
          <Tooltip content={<CustomTooltip />} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RiskRadar;