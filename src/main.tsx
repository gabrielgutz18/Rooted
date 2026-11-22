import './lib/install'; // first, to catch the browser's install prompt
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Vercel's page-view counts. This is a Vite app, so it's the React version, not '/next'.
// It sees only page addresses (/, /developer), never anyone's notes.
import { Analytics } from '@vercel/analytics/react';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
);
