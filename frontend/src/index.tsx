import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './i18n';
import App from './App';
import { ThemeProvider } from './context/ThemeContext';
import { ConfigProvider, App as AntdApp } from 'antd';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <ConfigProvider>
      <AntdApp>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>
);