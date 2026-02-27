import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Suppress Recharts defaultProps warning in React 18
// This is a known issue in Recharts v2.x with React 18+
const originalError = console.error;
console.error = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('defaultProps will be removed from function components')) {
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