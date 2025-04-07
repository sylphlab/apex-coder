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
    const config: AiConfig = { provider: 'openai', apiKey: 'test-key' };
    await initializeAiSdkModel(config);
    const model = getLanguageModel();
    const currentConfig = getCurrentAiConfig();

    expect(model).toBeDefined();
    expect((model as any).provider).toBe('openai');
    expect((model as any).modelId).toBe('gpt-4o'); // Default for openai
    expect(currentConfig).toEqual(config);
  });

  it('should initialize OpenAI model with specific ID', async () => {
    const config: AiConfig = { provider: 'openai', apiKey: 'test-key', modelId: 'gpt-3.5-turbo' };
    await initializeAiSdkModel(config);
    const model = getLanguageModel();
    expect((model as any).modelId).toBe('gpt-3.5-turbo');
  });

   it('should initialize Google AI model with default ID', async () => {
    const config: AiConfig = { provider: 'googleai', apiKey: 'test-key' };
    await initializeAiSdkModel(config);
    const model = getLanguageModel();
    expect((model as any).provider).toBe('googleai');
    expect((model as any).modelId).toBe('gemini-1.5-flash'); // Default for googleai
  });

  it('should initialize Anthropic model with default ID', async () => {
    const config: AiConfig = { provider: 'anthropic', apiKey: 'test-key' };
    await initializeAiSdkModel(config);
    const model = getLanguageModel();
    expect((model as any).provider).toBe('anthropic');
    expect((model as any).modelId).toBe('claude-3-5-sonnet'); // Default for anthropic
  });

  it('should initialize Ollama model with default ID and base URL', async () => {
    const config: AiConfig = { provider: 'ollama', baseUrl: 'http://localhost:11434' };
    await initializeAiSdkModel(config);
    const model = getLanguageModel();
    expect((model as any).provider).toBe('ollama');
    expect((model as any).modelId).toBe('llama3'); // Default for ollama
    // We can't easily check the baseUrl from the mock, but we check the provider was called
    const { createOllama } = await import('ollama-ai-provider');
    expect(createOllama).toHaveBeenCalledWith({ baseURL: 'http://localhost:11434' });
  });

  it('should initialize DeepSeek model with default ID', async () => {
    const config: AiConfig = { provider: 'deepseek', apiKey: 'test-key' };
    await initializeAiSdkModel(config);
    const model = getLanguageModel();
    expect((model as any).provider).toBe('deepseek');
    expect((model as any).modelId).toBe('deepseek-chat'); // Default for deepseek
  });

  it('should throw error for unsupported provider', async () => {
    const config: AiConfig = { provider: 'unsupported-provider' };
    // Updated expectation due to check before provider loading
    await expect(initializeAiSdkModel(config)).rejects.toThrow('No model ID specified and no default found for provider: unsupported-provider');
    // Verify state is reset (or remains uninitialized)
    expect(() => getLanguageModel()).toThrow('AI SDK Model has not been initialized');
    expect(getCurrentAiConfig()).toBeNull();
  });

  it('should update current config on successful initialization', async () => {
    const config1: AiConfig = { provider: 'openai', apiKey: 'key1' };
    const config2: AiConfig = { provider: 'googleai', apiKey: 'key2', modelId: 'gemma' };

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
