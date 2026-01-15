import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@/components/ThemeProvider';
import App from './App.jsx';
import './index.css';

// Protection renforcée contre les erreurs d'extensions externes
const originalErrorHandler = window.onerror;
window.onerror = function(message, source, lineno, colno, error) {
  // Bloquer toutes les erreurs kwift
  if (source && (
    source.includes('chrome-extension://') ||
    source.includes('kwift') ||
    source.includes('extension://') ||
    message?.includes('kwift') ||
    error?.stack?.includes('kwift')
  )) {
    console.warn('Erreur d\'extension bloquée:', message);
    return true; // Empêcher la propagation
  }
  // Appeler le handler original si ce n'est pas une extension
  if (originalErrorHandler) {
    return originalErrorHandler.call(this, message, source, lineno, colno, error);
  }
  return false;
};

window.addEventListener('error', (event) => {
  // Ignorer les erreurs provenant d'extensions Chrome
  if (event.filename && (
    event.filename.includes('chrome-extension://') ||
    event.filename.includes('kwift') ||
    event.filename.includes('extension://')
  )) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    console.warn('Erreur d\'extension ignorée:', event.message);
    return false;
  }
}, true); // Capture phase pour intercepter avant propagation

// Protection contre les erreurs non capturées
window.addEventListener('unhandledrejection', (event) => {
  if (event.reason && (
    event.reason.stack?.includes('chrome-extension://') ||
    event.reason.stack?.includes('kwift') ||
    event.reason.stack?.includes('extension://') ||
    String(event.reason).includes('kwift')
  )) {
    event.preventDefault();
    event.stopPropagation();
    console.warn('Promesse rejetée d\'extension ignorée:', event.reason);
    return false;
  }
}, true);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider defaultTheme="dark" storageKey="bonkont-theme">
      <App />
    </ThemeProvider>
  </StrictMode>
);