import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import '@styles/theme.css';
import '@styles/app.css';
import '@styles/chat.css';

// Initialize theme before first paint
const theme = localStorage.getItem('crow-theme') || 'system';
const resolved = theme === 'system'
  ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
  : theme;
document.documentElement.setAttribute('data-theme', resolved);

// Initialize RTL if needed
const locale = localStorage.getItem('crow-locale') || navigator.language.split('-')[0];
const rtlLocales = new Set(['ar', 'ur', 'fa', 'he']);
if (rtlLocales.has(locale)) {
  document.documentElement.setAttribute('dir', 'rtl');
}

const root = createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
