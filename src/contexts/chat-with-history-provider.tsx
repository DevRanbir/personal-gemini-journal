"use client";

import React from 'react';
import { ChatProvider } from '@/contexts/chat-context';
import { ChatHistoryProvider, useChatHistory } from '@/contexts/chat-history-context';

function ChatProviderWithHistoryUpdate({ children }: { children: React.ReactNode }) {
  const { refreshHistory } = useChatHistory();
  const lastUpdateRef = React.useRef<number>(0);
  
  const handleHistoryUpdate = React.useCallback(async () => {
    // Throttle history updates to prevent excessive calls
    const now = Date.now();
    if (now - lastUpdateRef.current < 1000) { // Minimum 1 second between updates
      return;
    }
    
    lastUpdateRef.current = now;
    // Refresh the history without remounting
    await refreshHistory();
  }, [refreshHistory]);

  return (
    <ChatProvider onHistoryUpdate={handleHistoryUpdate}>
      {children}
    </ChatProvider>
  );
}

export function ChatWithHistoryProvider({ children }: { children: React.ReactNode }) {
  return (
    <ChatHistoryProvider>
      <ChatProviderWithHistoryUpdate>
        {children}
      </ChatProviderWithHistoryUpdate>
    </ChatHistoryProvider>
  );
}
