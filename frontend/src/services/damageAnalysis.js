// src/services/damageAnalysis.js
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

export const analyzeDamageImage = async (file, token) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_URL}/damage-ai/upload-and-analyze`, {
    method: 'POST',
    body: formData,
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Erreur lors de l\'analyse');
  }
  
  return await response.json();
};

export const analyzeImageWithFallback = async (file, token) => {
  try {
    const result = await analyzeDamageImage(file, token);
    return result;
  } catch (error) {
    console.warn('Analyse IA échouée, utilisation du fallback:', error);
    return {
      success: true,
      damages: [
        { partId: 'pare_chocs_avant', severity: 0.6, confidence: 0.5 },
        { partId: 'capot', severity: 0.3, confidence: 0.4 }
      ],
      totalCost: 850,
      confidence: 0.6,
      analysisTime: '1.5',
      fallback: true
    };
  }
};