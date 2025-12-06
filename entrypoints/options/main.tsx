import React from 'react';
import ReactDOM from 'react-dom/client';
import OptionsPage from './OptionsPage.tsx';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import './style.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <OptionsPage />
    </ErrorBoundary>
  </React.StrictMode>
);
