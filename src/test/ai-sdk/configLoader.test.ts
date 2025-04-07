// Vitest tests for configLoader.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { initializeAiSdkModel, getLanguageModel, getCurrentAiConfig, resetAiSdkModel, AiConfig } from '../../ai-sdk/configLoader';
import { LanguageModel } from 'ai';

// Mock the provider creation functions
// We need to mock the dynamic imports
vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => (modelId: string) => ({ modelId, provider: 'googleai' } as LanguageModel)),
}));
vi.mock('@ai-sdk/openai', () => ({
  createOpenAI: vi.fn(() => (modelId: string) => ({ modelId, provider: 'openai' } as LanguageModel)),
}));
vi.mock('@ai-sdk/anthropic', () => ({
  createAnthropic: vi.fn(() => (modelId: string) => ({ modelId, provider: 'anthropic' } as LanguageModel)),
}));
vi.mock('ollama-ai-provider', () => ({
  createOllama: vi.fn(() => (modelId: string) => ({ modelId, provider: 'ollama' } as LanguageModel)),
}));
vi.mock('@ai-sdk/deepseek', () => ({
    createDeepSeek: vi.fn(() => (modelId: string) => ({ modelId, provider: 'deepseek' } as LanguageModel)),
}));

// Mock the providers module
vi.mock('../../ai-sdk/providers', () => {
  const mockGoogleProvider = {
    getName: () => 'googleai',
    createModel: vi.fn(async (modelId, credentials) => ({ modelId: modelId || 'gemini-1.5-flash', provider: 'googleai' } as LanguageModel)),
    getAvailableModels: vi.fn(async () => ['gemini-1.5-flash', 'gemini-1.5-pro']),
    validateCredentials: vi.fn(async () => true),
    getRequiredCredentialFields: vi.fn(() => ['apiKey'])
  };
  
  const mockOpenAIProvider = {
    getName: () => 'openai',
    createModel: vi.fn(async (modelId, credentials) => ({ modelId: modelId || 'gpt-4o', provider: 'openai' } as LanguageModel)),
    getAvailableModels: vi.fn(async () => ['gpt-4o', 'gpt-3.5-turbo']),
    validateCredentials: vi.fn(async () => true),
    getRequiredCredentialFields: vi.fn(() => ['apiKey'])
  };
  
  const mockAnthropicProvider = {
    getName: () => 'anthropic',
    createModel: vi.fn(async (modelId, credentials) => ({ modelId: modelId || 'claude-3-5-sonnet', provider: 'anthropic' } as LanguageModel)),
    getAvailableModels: vi.fn(async () => ['claude-3-5-sonnet', 'claude-3-opus']),
    validateCredentials: vi.fn(async () => true),
    getRequiredCredentialFields: vi.fn(() => ['apiKey'])
  };
  
  const mockOllamaProvider = {
    getName: () => 'ollama',
    createModel: vi.fn(async (modelId, credentials) => ({ modelId: modelId || 'llama3', provider: 'ollama' } as LanguageModel)),
    getAvailableModels: vi.fn(async () => ['llama3', 'mistral']),
    validateCredentials: vi.fn(async () => true),
    getRequiredCredentialFields: vi.fn(() => ['baseUrl'])
  };
  
  const mockDeepseekProvider = {
    getName: () => 'deepseek',
    createModel: vi.fn(async (modelId, credentials) => ({ modelId: modelId || 'deepseek-chat', provider: 'deepseek' } as LanguageModel)),
    getAvailableModels: vi.fn(async () => ['deepseek-chat']),
    validateCredentials: vi.fn(async () => true),
    getRequiredCredentialFields: vi.fn(() => ['apiKey'])
  };
  
  return {
    getProvider: vi.fn((providerId) => {
      const providers: Record<string, any> = {
        'googleai': mockGoogleProvider,
        'openai': mockOpenAIProvider,
        'anthropic': mockAnthropicProvider,
        'ollama': mockOllamaProvider,
        'deepseek': mockDeepseekProvider
      };
      return providers[providerId];
    }),
    getAllProviders: vi.fn(() => [
      mockGoogleProvider,
      mockOpenAIProvider,
      mockAnthropicProvider,
      mockOllamaProvider,
      mockDeepseekProvider
    ])
  };
});

// Mock vscode API for logger (optional, depends on testing logger interaction)
vi.mock('vscode', () => ({
    window: {
        showWarningMessage: vi.fn(),
        showErrorMessage: vi.fn(),
    },
    // Add other vscode mocks if needed
}));

describe('AI SDK Config Loader', () => {

  // Reset mocks and potentially the internal state before each test
  beforeEach(() => {
    vi.clearAllMocks();
    resetAiSdkModel(); // Reset state before each test
  });

  it('should throw error if getLanguageModel is called before initialization', () => {
    // State is reset by beforeEach, so this test should work correctly.
    expect(() => getLanguageModel()).toThrow('AI SDK Model has not been initialized');
  });

  it('should initialize OpenAI model with default ID', async () => {
    const config: AiConfig = { 
      provider: 'openai', 
      credentials: { apiKey: 'test-key' } 
    };
    await initializeAiSdkModel(config);
    const model = getLanguageModel();
    const currentConfig = getCurrentAiConfig();

    expect(model).toBeDefined();
    expect((model as any).provider).toBe('openai');
    expect((model as any).modelId).toBe('gpt-4o'); // Default for openai
    expect(currentConfig).toEqual(config);
  });

  it('should initialize OpenAI model with specific ID', async () => {
    const config: AiConfig = { 
      provider: 'openai', 
      modelId: 'gpt-3.5-turbo', 
      credentials: { apiKey: 'test-key' } 
    };
    await initializeAiSdkModel(config);
    const model = getLanguageModel();
    expect((model as any).modelId).toBe('gpt-3.5-turbo');
  });

   it('should initialize Google AI model with default ID', async () => {
    const config: AiConfig = { 
      provider: 'googleai', 
      credentials: { apiKey: 'test-key' } 
    };
    await initializeAiSdkModel(config);
    const model = getLanguageModel();
    expect((model as any).provider).toBe('googleai');
    expect((model as any).modelId).toBe('gemini-1.5-flash'); // Default for googleai
  });

  it('should initialize Anthropic model with default ID', async () => {
    const config: AiConfig = { 
      provider: 'anthropic', 
      credentials: { apiKey: 'test-key' } 
    };
    await initializeAiSdkModel(config);
    const model = getLanguageModel();
    expect((model as any).provider).toBe('anthropic');
    expect((model as any).modelId).toBe('claude-3-5-sonnet'); // Default for anthropic
  });

  it('should initialize Ollama model with default ID and base URL', async () => {
    const config: AiConfig = { 
      provider: 'ollama', 
      credentials: { baseUrl: 'http://localhost:11434' } 
    };
    await initializeAiSdkModel(config);
    const model = getLanguageModel();
    expect((model as any).provider).toBe('ollama');
    expect((model as any).modelId).toBe('llama3'); // Default for ollama
  });

  it('should initialize DeepSeek model with default ID', async () => {
    const config: AiConfig = { 
      provider: 'deepseek', 
      credentials: { apiKey: 'test-key' } 
    };
    await initializeAiSdkModel(config);
    const model = getLanguageModel();
    expect((model as any).provider).toBe('deepseek');
    expect((model as any).modelId).toBe('deepseek-chat'); // Default for deepseek
  });

  it('should throw error for unsupported provider', async () => {
    const config: AiConfig = { 
      provider: 'unsupported-provider', 
      credentials: {} 
    };
    await expect(initializeAiSdkModel(config)).rejects.toThrow('Unsupported AI provider: unsupported-provider');
    // Verify state is reset (or remains uninitialized)
    expect(() => getLanguageModel()).toThrow('AI SDK Model has not been initialized');
    expect(getCurrentAiConfig()).not.toBeNull(); // Config is stored even on failure
  });

  it('should update current config on successful initialization', async () => {
    const config1: AiConfig = { 
      provider: 'openai', 
      credentials: { apiKey: 'key1' } 
    };
    const config2: AiConfig = { 
      provider: 'googleai', 
      modelId: 'gemma', 
      credentials: { apiKey: 'key2' } 
    };

    await initializeAiSdkModel(config1);
    expect(getCurrentAiConfig()).toEqual(config1);
    let model1 = getLanguageModel();
    expect((model1 as any).provider).toBe('openai');

    await initializeAiSdkModel(config2);
    expect(getCurrentAiConfig()).toEqual(config2);
    let model2 = getLanguageModel();
    expect((model2 as any).provider).toBe('googleai');
    expect((model2 as any).modelId).toBe('gemma');
  });

  // Add more tests for edge cases, missing API keys (if handled differently than env vars), etc.

});
