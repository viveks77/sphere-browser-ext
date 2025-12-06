import React from 'react';
import ReactDOM from 'react-dom/client';
import './style.css';
import Layout from '@/components/layout';
import { ErrorBoundary } from '@/components/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Layout />
    </ErrorBoundary>
  </React.StrictMode>,
);
