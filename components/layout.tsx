import { useState } from 'react';
import { ChatContainer } from './chat';
import './styles.css';

const Layout = () => {
  // Using a placeholder tab ID for now
  const tabId = 'placeholder-tab';

  return (
    <ChatContainer tabId={tabId} />
  );
};

export default Layout;