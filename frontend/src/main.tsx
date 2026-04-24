import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { getLang, setLang } from './i18n';

// Initialize language/RTL on load
setLang(getLang());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
