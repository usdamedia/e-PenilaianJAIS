import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Suppress Recharts defaultProps warnings (React 18.3+ known issue)
const originalWarn = console.warn;
const originalError = console.error;

console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('Support for defaultProps will be removed from function components')) {
    return;
  }
  originalWarn(...args);
};

console.error = (...args) => {
  const firstArg = typeof args[0] === 'string' ? args[0] : (args[0]?.message || '');
  if (
    firstArg.includes('Support for defaultProps will be removed from function components') ||
    firstArg.includes('Gagal tarik data cleaned') ||
    firstArg.includes('Load failed') ||
    firstArg.includes('Failed to fetch')
  ) {
    // Demote network/library noise to console.warn
    originalWarn(...args);
    return;
  }
  originalError(...args);
};

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);