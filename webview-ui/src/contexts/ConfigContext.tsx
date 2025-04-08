import React, { createContext, useContext, useState, useCallback } from 'react';
import { vscode } from '../vscode';

// Define the state interface
interface ConfigState {
  provider: string | null;
  modelId: string | null;
  baseUrl: string | null;
  isConfigured: boolean;
  isLoading: boolean;
  error: string | null;
  isModelInitialized: boolean;
}

// Define the context interface
interface ConfigContextProps {
  state: ConfigState;
  requestConfigStatus: () => void;
  saveConfiguration: (config: { provider: string | null; modelId: string | null; apiKey: string | null; baseUrl: string | null }) => void;
  handleConfigStatus: (status: { isConfigured: boolean; isModelInitialized?: boolean; provider?: string; modelId?: string; baseUrl?: string }) => void;
  handleConfigSaved: (success: boolean, error?: string) => void;
  resetError: () => void;
}

// Create the context
const ConfigContext = createContext<ConfigContextProps | undefined>(undefined);

// Create the provider component
export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Use useState instead of useReducer
  const [state, setState] = useState<ConfigState>({
    provider: null,
    modelId: null,
    baseUrl: null,
    isConfigured: false,
    isLoading: false,
    error: null,
    isModelInitialized: false,
  });

  // Define actions
  const setLoading = useCallback((isLoading: boolean) => {
    setState(prev => ({ ...prev, isLoading, error: null }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  const requestConfigStatus = useCallback(() => {
    setLoading(true);
    vscode.postMessage({ command: 'getConfigStatus' });
  }, [setLoading]);

  const saveConfiguration = useCallback((config: { provider: string | null; modelId: string | null; apiKey: string | null; baseUrl: string | null }) => {
    setLoading(true);
    const payload = {
      provider: config.provider,
      modelId: config.modelId,
      apiKey: config.apiKey || undefined,
      baseUrl: config.baseUrl || undefined,
    };
    vscode.postMessage({ command: 'saveConfiguration', payload });
  }, [setLoading]);

  const handleConfigStatus = useCallback((status: { isConfigured: boolean; isModelInitialized?: boolean; provider?: string; modelId?: string; baseUrl?: string }) => {
    setState(prev => ({
      ...prev,
      isLoading: false,
      isConfigured: status.isConfigured,
      isModelInitialized: status.isModelInitialized || false,
      provider: status.provider || null,
      modelId: status.modelId || null,
      baseUrl: status.baseUrl || null,
      error: null,
    }));
  }, []);

  const handleConfigSaved = useCallback((success: boolean, error?: string) => {
    if (success) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isConfigured: true,
        error: null,
      }));
    } else {
      setState(prev => ({
        ...prev,
        isLoading: false,
        isConfigured: false,
        error: error || 'Failed to save configuration.',
      }));
    }
  }, []);

  const resetError = useCallback(() => {
    setError(null);
  }, [setError]);

  // Create the context value
  const value = {
    state,
    requestConfigStatus,
    saveConfiguration,
    handleConfigStatus,
    handleConfigSaved,
    resetError,
  };

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
};

// Create the hook for consuming the context
export const useConfig = (): ConfigContextProps => {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within a ConfigProvider');
  }
  return context;
};