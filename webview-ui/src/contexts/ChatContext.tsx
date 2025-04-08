import React, { createContext, useContext, useState, useCallback } from 'react';
import { vscode } from '../vscode';

// Define the message interface
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'error';
  content: string;
}

// Define the state interface
interface ChatState {
  messages: ChatMessage[];
  isAssistantResponding: boolean;
  currentAssistantMessageId: string | null;
}

// Define the context interface
interface ChatContextProps {
  state: ChatState;
  sendMessage: (content: string) => void;
  handleAiChunk: (chunk: string) => void;
  handleAiComplete: () => void;
  handleAiError: (error: string) => void;
  clearChat: () => void;
}

// Create the context
const ChatContext = createContext<ChatContextProps | undefined>(undefined);

// Create the provider component
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use useState instead of useReducer
  const [state, setState] = useState<ChatState>({
    messages: [],
    isAssistantResponding: false,
    currentAssistantMessageId: null,
  });

  // Define actions
  const sendMessage = useCallback((content: string) => {
    if (!content.trim() || state.isAssistantResponding) return;
    
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: content.trim(),
    };
    
    // Send message to extension
    vscode.postMessage({ command: 'sendMessage', payload: content.trim() });
    
    // Update state
    setState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isAssistantResponding: true,
      currentAssistantMessageId: null,
    }));
  }, [state.isAssistantResponding]);

  const handleAiChunk = useCallback((chunk: string) => {
    setState(prev => {
      const currentId = prev.currentAssistantMessageId;
      
      if (currentId) {
        // Update existing message
        const updatedMessages = prev.messages.map(msg =>
          msg.id === currentId ? { ...msg, content: msg.content + chunk } : msg
        );
        
        return {
          ...prev,
          messages: updatedMessages,
          isAssistantResponding: true,
        };
      } else {
        // Create new message
        const newAssistantId = `assistant-${Date.now()}`;
        const newAssistantMessage: ChatMessage = {
          id: newAssistantId,
          role: 'assistant',
          content: chunk,
        };
        
        return {
          ...prev,
          messages: [...prev.messages, newAssistantMessage],
          isAssistantResponding: true,
          currentAssistantMessageId: newAssistantId,
        };
      }
    });
  }, []);

  const handleAiComplete = useCallback(() => {
    setState(prev => ({
      ...prev,
      isAssistantResponding: false,
      currentAssistantMessageId: null,
    }));
  }, []);

  const handleAiError = useCallback((error: string) => {
    setState(prev => {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'error',
        content: error || 'An unknown error occurred.',
      };
      
      return {
        ...prev,
        messages: [...prev.messages, errorMessage],
        isAssistantResponding: false,
        currentAssistantMessageId: null,
      };
    });
  }, []);

  const clearChat = useCallback(() => {
    setState({
      messages: [],
      isAssistantResponding: false,
      currentAssistantMessageId: null,
    });
  }, []);

  // Create the context value
  const value = {
    state,
    sendMessage,
    handleAiChunk,
    handleAiComplete,
    handleAiError,
    clearChat,
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

// Create the hook for consuming the context
export const useChat = (): ChatContextProps => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};