import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';

const container = document.getElementById('root');
if (container) {
  try {
    const root = createRoot(container);
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (err: any) {
    console.error('Fatal client startup error:', err);
    container.innerHTML = `
      <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #050505; color: #f43f5e; padding: 24px; font-family: monospace; text-align: center;">
        <h2 style="font-size: 16px; margin-bottom: 8px;">INTERRUPCIÓN DE MONTAJE DEL TERMINAL PII-LCC</h2>
        <p style="font-size: 12px; color: #a1a1aa; max-width: 500px; margin-bottom: 16px;">${(err && err.message) || 'Error durante la inicialización'}</p>
        <button onclick="window.location.reload()" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 12px;">RECONECTAR TERMINAL</button>
      </div>
    `;
  }
}

