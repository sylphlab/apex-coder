/**
 * @refresh reset
 */
import React, { useState, useEffect } from 'react'; // Import useState, useEffect
import { useConfig } from '../contexts/ConfigContext'; // Use Context hook

// Mock provider options - ideally fetch these or define centrally
const providerOptions = [
  { value: 'google', label: 'Google Gemini' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'ollama', label: 'Ollama' },
  // Add other providers as needed
];

// Mock model options per provider - ideally fetch or define centrally
const modelOptions: { [key: string]: { value: string; label: string }[] } = {
  google: [
    { value: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash' },
    { value: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro' },
    { value: 'gemini-1.0-pro', label: 'Gemini 1.0 Pro' },
  ],
  openai: [
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
  ],
  anthropic: [
    { value: 'claude-3-5-sonnet-20240620', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
  ],
  ollama: [
    { value: 'llama3', label: 'Llama 3' },
    { value: 'mistral', label: 'Mistral' },
    { value: 'custom', label: 'Custom Model ID...' }, // Option for custom input
  ],
};


const SetupView: React.FC = () => {
  // Use context hook
  const { state, saveConfiguration, resetError } = useConfig();
  const { isLoading, error, provider, modelId, baseUrl } = state; // Destructure state

  // Local form state
  const [selectedProvider, setSelectedProvider] = useState(state.provider || ''); // Use state.provider
  const [selectedModelId, setSelectedModelId] = useState(state.modelId || ''); // Use state.modelId
  const [customModelId, setCustomModelId] = useState('');
  const [apiKey, setApiKey] = useState(''); // API Key is not stored in Zustand state directly
  const [selectedBaseUrl, setSelectedBaseUrl] = useState(state.baseUrl || ''); // Use state.baseUrl

  // Update local state if store changes (e.g., after initial load)
   useEffect(() => {
     setSelectedProvider(provider || '');
     setSelectedModelId(modelId || '');
     setSelectedBaseUrl(baseUrl || '');
   }, [state.provider, state.modelId, state.baseUrl]); // Use state properties in dependency array

  // Determine if custom model ID input should be shown
  const showCustomModelInput = selectedProvider === 'ollama' && selectedModelId === 'custom';
  // Determine if API key is needed (e.g., not for Ollama by default)
  const needsApiKey = selectedProvider && selectedProvider !== 'ollama';
   // Determine if Base URL is needed (e.g., only for Ollama or custom providers)
  const needsBaseUrl = selectedProvider === 'ollama';


  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    resetError(); // Clear previous errors

    const finalModelId = showCustomModelInput ? customModelId : selectedModelId;

    if (!selectedProvider || !finalModelId || (needsApiKey && !apiKey)) {
      // Basic validation feedback (could be more sophisticated)
      alert('Please fill in all required fields.');
      return;
    }

    saveConfiguration({
      provider: selectedProvider,
      modelId: finalModelId,
      apiKey: needsApiKey ? apiKey : null, // Only send API key if needed
      baseUrl: needsBaseUrl ? selectedBaseUrl : null, // Only send Base URL if needed
    });
  };

  return (
    <div className="p-4 border rounded bg-gray-50">
      <h2 className="text-lg font-semibold mb-3">Setup AI Provider</h2>
      {error && (
        <div className="mb-3 p-2 border border-red-400 bg-red-100 text-red-700 rounded">
          <span>Error: {error}</span>
          <button onClick={resetError} className="ml-2 text-sm font-bold">Dismiss</button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Provider Selection */}
        <div>
          <label htmlFor="provider" className="block text-sm font-medium text-gray-700 mb-1">AI Provider</label>
          <select
            id="provider"
            value={selectedProvider}
            onChange={(e) => {
              setSelectedProvider(e.target.value);
              setSelectedModelId(''); // Reset model when provider changes
              setCustomModelId('');
              setApiKey('');
              setSelectedBaseUrl('');
            }}
            required
            className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="" disabled>Select a provider</option>
            {providerOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Model Selection (conditional based on provider) */}
        {selectedProvider && modelOptions[selectedProvider] && (
          <div>
            <label htmlFor="modelId" className="block text-sm font-medium text-gray-700 mb-1">Model ID</label>
            <select
              id="modelId"
              value={selectedModelId}
              onChange={(e) => setSelectedModelId(e.target.value)}
              required
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" disabled>Select a model</option>
              {modelOptions[selectedProvider].map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* Custom Model ID Input (conditional) */}
        {showCustomModelInput && (
           <div>
             <label htmlFor="customModelId" className="block text-sm font-medium text-gray-700 mb-1">Custom Model ID</label>
             <input
               type="text"
               id="customModelId"
               value={customModelId}
               onChange={(e) => setCustomModelId(e.target.value)}
               required
               placeholder="e.g., my-custom-model"
               className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
             />
           </div>
        )}


        {/* API Key Input (conditional) */}
        {needsApiKey && (
          <div>
            <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700 mb-1">API Key</label>
            <input
              type="password"
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              required
              placeholder="Enter your API Key"
              className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        )}

         {/* Base URL Input (conditional) */}
         {needsBaseUrl && (
           <div>
             <label htmlFor="baseUrl" className="block text-sm font-medium text-gray-700 mb-1">Base URL (Optional for Ollama)</label>
             <input
               type="url"
               id="baseUrl"
               value={selectedBaseUrl}
               onChange={(e) => setSelectedBaseUrl(e.target.value)}
               placeholder="e.g., http://localhost:11434"
               className="w-full p-2 border rounded focus:ring-blue-500 focus:border-blue-500"
             />
           </div>
         )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save Configuration'}
        </button>
      </form>
    </div>
  );
};

export default SetupView;