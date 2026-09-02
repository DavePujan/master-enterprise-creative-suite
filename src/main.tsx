import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './client/app/App.js';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <App />,
);

