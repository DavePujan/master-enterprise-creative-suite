import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './app/App.js';
import { ErrorBoundary } from './shared/components/ErrorBoundary.js';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

