import { useState, useEffect, useCallback } from 'react';
import { ChatContainer } from './chat';
import { ConfigStatus } from './ConfigStatus';
import { isConfigured } from '@/lib/configLoader';
import './styles.css';

type ConfigState = 'loading' | 'configured' | 'not-configured';

const Layout = () => {
  const [configState, setConfigState] = useState<ConfigState>('loading');

  const checkConfiguration = useCallback(async () => {
    try {
      const configured = await isConfigured();
      setConfigState(configured ? 'configured' : 'not-configured');
    } catch (error) {
      console.error('Failed to check configuration:', error);
      setConfigState('not-configured');
    }
  }, []);

  useEffect(() => {
    checkConfiguration();
  }, [checkConfiguration]);

  switch (configState) {
    case 'loading':
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <p className="text-muted-foreground">Loading configuration...</p>
        </div>
      );
    case 'not-configured':
      return <ConfigStatus />;
    case 'configured':
      return <ChatContainer />;
  }
};

export default Layout;
