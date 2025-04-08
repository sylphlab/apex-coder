/**
 * @refresh reset
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useConfig } from '../contexts/ConfigContext';

// Define the Provider interface
interface ProviderDetails {
  id: string;
  name: string;
}

// Mock ProviderService for now - this would be replaced with actual API calls
const ProviderService = {
  getAllProviders: async (): Promise<ProviderDetails[]> => {
    // Simulate API call
    return [
      { id: 'openai', name: 'OpenAI' },
      { id: 'google', name: 'Google AI' },
      { id: 'anthropic', name: 'Anthropic' },
      { id: 'mistral', name: 'Mistral AI' },
      { id: 'ollama', name: 'Ollama' },
      { id: 'groq', name: 'Groq' },
    ];
  },
  clearCache: () => {
    // Mock implementation
  }
};

const ApiKeysView: React.FC = () => {
  const { state, requestConfigStatus } = useConfig();
  const { provider: configuredProvider, isConfigured, isModelInitialized } = state;
  const navigate = useNavigate();

  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');

  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  // Providers state
  const [providers, setProviders] = useState<ProviderDetails[]>([]);

  // Animation states
  const [isLoaded, setIsLoaded] = useState(false);

  // Fetch providers on mount
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        setIsLoading(true);
        setLoadingError(null);
        const data = await ProviderService.getAllProviders();
        setProviders(data);
        setIsLoading(false);
      } catch (error) {
        setIsLoading(false);
        setLoadingError(error instanceof Error ? error.message : 'Failed to load providers');
        console.error('Error loading providers:', error);
      }
    };

    fetchProviders();

    // Set isLoaded to true after a short delay to trigger animations
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Filtered providers based on search
  const filteredProviders = searchQuery.trim()
    ? providers.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.id.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : providers;

  // Check if a provider is configured and working
  const isProviderConfigured = (providerId: string) => {
    return configuredProvider === providerId && isModelInitialized;
  };

  // Check if a provider is configured but not working
  const isProviderError = (providerId: string) => {
    return configuredProvider === providerId && !isModelInitialized;
  };

  // Navigate to setup page for a specific provider
  const configureProvider = (providerId: string) => {
    navigate(`/setup?provider=${providerId}`);
  };

  // Refresh status
  const refreshStatus = async () => {
    requestConfigStatus();
    
    // Also refresh providers list
    try {
      setIsLoading(true);
      setLoadingError(null);
      // Clear cache to force refresh
      ProviderService.clearCache();
      const data = await ProviderService.getAllProviders();
      setProviders(data);
      setIsLoading(false);
    } catch (error) {
      setIsLoading(false);
      setLoadingError(error instanceof Error ? error.message : 'Failed to refresh providers');
      console.error('Error refreshing providers:', error);
    }
  };

  return (
    <div className="flex flex-col h-full animate-nordic-fade-in">
      {/* Header */}
      <div className="px-6 py-4 border-b border-nordic-bg-light">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-light text-nordic-text-primary">API Key Settings</h1>
          <div className="flex space-x-2">
            <button 
              onClick={refreshStatus} 
              className="btn-nordic-ghost text-xs flex items-center px-2.5 py-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              Refresh
            </button>
            <button 
              onClick={() => navigate('/')} 
              className="btn-nordic-ghost text-xs flex items-center px-2.5 py-1.5"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back
            </button>
          </div>
        </div>
        
        {/* Search bar */}
        <div className="mt-4 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-nordic-text-muted" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            type="text"
            placeholder="Search providers..."
            className="input-nordic pl-10"
          />
        </div>
      </div>
      
      {/* Provider list with status indicators */}
      <div
        className={`flex-grow overflow-y-auto p-6 custom-scrollbar transition-all duration-500 ${isLoaded ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}
        style={{ transitionDelay: '100ms' }}
      >
        {/* Loading state */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full text-nordic-text-muted">
            <div className="w-16 h-16 mb-4 rounded-full bg-nordic-bg-light flex items-center justify-center animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-nordic-text-muted" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm mb-2">Loading providers...</p>
          </div>
        ) : loadingError ? (
          /* Error state */
          <div className="flex flex-col items-center justify-center h-full text-nordic-text-muted">
            <div className="w-16 h-16 mb-4 rounded-full bg-nordic-error bg-opacity-10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-nordic-error" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm mb-2 text-nordic-error">Error loading providers</p>
            <p className="text-xs max-w-md text-center">{loadingError}</p>
            <button
              onClick={refreshStatus}
              className="btn-nordic-primary text-xs px-3 py-2 mt-4"
            >
              Try Again
            </button>
          </div>
        ) : filteredProviders.length === 0 ? (
          /* Empty state when search has no results */
          <div className="flex flex-col items-center justify-center h-full text-nordic-text-muted">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-nordic-text-muted opacity-50" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <p className="text-sm mb-2">No providers found</p>
            <p className="text-xs max-w-md text-center">Try a different search term</p>
          </div>
        ) : (
          /* Provider List */
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredProviders.map(provider => (
                <div
                  key={provider.id}
                  className="card-nordic flex items-center justify-between p-4 hover:shadow-nordic-md"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-nordic-bg-light flex items-center justify-center mr-3">
                      <span className="text-sm font-medium text-nordic-primary">{provider.name.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-nordic-text-primary">{provider.name}</h3>
                      <p className="text-xs text-nordic-text-muted">{provider.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {/* Status indicator */}
                    {isProviderConfigured(provider.id) ? (
                      <div className="mr-3 w-6 h-6 rounded-full bg-nordic-success bg-opacity-20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-nordic-success" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : isProviderError(provider.id) ? (
                      <div className="mr-3 w-6 h-6 rounded-full bg-nordic-error bg-opacity-20 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-nordic-error" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </div>
                    ) : (
                      <div className="mr-3 w-6 h-6 rounded-full bg-nordic-bg flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-nordic-text-muted" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    {/* Configure button */}
                    <button
                      onClick={() => configureProvider(provider.id)}
                      className="btn-nordic-ghost text-xs px-2.5 py-1.5"
                    >
                      Configure
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="px-6 py-4 border-t border-nordic-bg-light">
        <div className="flex justify-between items-center">
          <p className="text-xs text-nordic-text-muted">
            {isLoading ? 'Loading...' : `${filteredProviders.length} providers available`}
          </p>
          <button 
            onClick={() => navigate('/setup')} 
            className="btn-nordic-primary text-xs px-3 py-2"
          >
            Add New Provider
          </button>
        </div>
      </div>

      {/* Custom scrollbar styling is now in the nordic-theme.css file */}
    </div>
  );
};

export default ApiKeysView;