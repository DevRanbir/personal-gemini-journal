"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuthContext } from '@/contexts/auth-context';
import { getChatOwnerId } from '@/lib/local-user';
import { 
  getChatHistory, 
  subscribeToChatHistory,
  updateChatTitle, 
  deleteChatHistory,
  ChatHistory 
} from '@/lib/firebase-service';

interface ChatHistoryContextType {
  chatHistory: ChatHistory[];
  isLoading: boolean;
  refreshHistory: () => Promise<void>;
  updateChatTitle: (date: string, title: string) => Promise<boolean>;
  deleteChatSession: (date: string) => Promise<boolean>;
  clearAllHistory: () => void;
}

const ChatHistoryContext = createContext<ChatHistoryContextType | undefined>(undefined);

export function ChatHistoryProvider({ children }: { children: React.ReactNode }) {
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user, loading: authLoading } = useAuthContext();
  const chatOwnerId = getChatOwnerId(user);

  const refreshHistory = async () => {
    if (authLoading) return;
    setIsLoading(true);
    try {
      const history = await getChatHistory(chatOwnerId);
      setChatHistory(history);
    } catch (error) {
      console.error('Failed to load chat history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateTitle = async (date: string, title: string): Promise<boolean> => {
    try {
      const success = await updateChatTitle(chatOwnerId, date, title);
      if (success) {
        setChatHistory(prev => 
          prev.map(chat => 
            chat.date === date ? { ...chat, title } : chat
          )
        );
      }
      return success;
    } catch (error) {
      console.error('Failed to update chat title:', error);
      return false;
    }
  };

  const deleteChatSession = async (date: string): Promise<boolean> => {
    try {
      const success = await deleteChatHistory(chatOwnerId, date);
      if (success) {
        setChatHistory(prev => prev.filter(chat => chat.date !== date));
      }
      return success;
    } catch (error) {
      console.error('Failed to delete chat session:', error);
      return false;
    }
  };

  // Real-time listener for chat history
  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }
    setIsLoading(true);
    const unsubscribe = subscribeToChatHistory(chatOwnerId, (history) => {
      setChatHistory(history);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [chatOwnerId, authLoading]);

  // Function to clear all chat history from memory
  const clearAllHistory = () => {
    setChatHistory([]);
    setIsLoading(false);
  };

  return (
    <ChatHistoryContext.Provider value={{
      chatHistory,
      isLoading,
      refreshHistory,
      updateChatTitle: updateTitle,
      deleteChatSession,
      clearAllHistory,
    }}>
      {children}
    </ChatHistoryContext.Provider>
  );
}

export function useChatHistory() {
  const context = useContext(ChatHistoryContext);
  if (context === undefined) {
    throw new Error('useChatHistory must be used within a ChatHistoryProvider');
  }
  return context;
}
