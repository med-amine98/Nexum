import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

interface UIStrategy {
  mode: string;
  theme: string;
  priority_widget: string;
  ai_copilot_state: string;
  message: string;
}

interface ThemeContextType {
  strategy: UIStrategy;
  refreshStrategy: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [strategy, setStrategy] = useState<UIStrategy>({
    mode: 'STANDARD',
    theme: 'theme-premium-glassmorphism',
    priority_widget: 'global_performance',
    ai_copilot_state: 'idle',
    message: 'Chargement de la stratégie IA...'
  });

  const refreshStrategy = async () => {
    try {
      const response = await axios.get('http://localhost:8000/api/v1/insights/ui-strategy');
      const data = response.data;
      
      // Mapper les thèmes backend aux classes CSS
      const themeMap: Record<string, string> = {
        'dark-red-neon': 'theme-critical-alert',
        'vibrant-growth-green': 'theme-growth-focus',
        'premium-glassmorphism': 'theme-premium-glassmorphism'
      };

      const newStrategy = {
        ...data,
        theme: themeMap[data.theme] || 'theme-premium-glassmorphism'
      };

      setStrategy(newStrategy);
      
      // Appliquer la classe au body
      document.body.className = '';
      document.body.classList.add(newStrategy.theme);
    } catch (error) {
      console.error('Erreur lors de la récupération de la stratégie UI:', error);
    }
  };

  useEffect(() => {
    refreshStrategy();
    const interval = setInterval(refreshStrategy, 30000); // Rafraîchir toutes les 30s
    return () => clearInterval(interval);
  }, []);

  return (
    <ThemeContext.Provider value={{ strategy, refreshStrategy }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
