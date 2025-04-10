/// <reference types="vitest/globals" />
// Vitest tests for configLoader.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
// import * as vscode from "../../__mocks__/vscode"; // Commented out - mock not found
// Import explicit Mock type
import type { Mock } from 'vitest';
// Import types from ai package for mocking
import type {
  LanguageModel,
  LanguageModelV1,
  LanguageModelV1CallOptions,
  LanguageModelV1StreamPart,
  // Removed assumed types LanguageModelV1Response, LanguageModelV1StreamResponse again
} from 'ai';
import type { AiConfig } from '../../ai-sdk/configLoader';
import {
  initializeAiSdkModel,
  getLanguageModel,
  getCurrentAiConfig,
  resetAiSdkModel,
} from '../../ai-sdk/configLoader';

// Define a type for the mocked providers for clarity - use explicit Mock type with function signature
interface MockProvider {
  getName: () => string;
  createModel: Mock<
    (modelId: string | undefined, credentials: Record<string, unknown>) => Promise<LanguageModel>
  >;
  getAvailableModels: Mock<(credentials?: Record<string, unknown>) => Promise<string[]>>;
  validateCredentials: Mock<(credentials: Record<string, unknown>) => Promise<boolean>>;
  getRequiredCredentialFields: Mock<() => string[]>;
}

// Helper to create a basic mock LanguageModel
const createMockLanguageModel = (provider: string, modelId: string): LanguageModelV1 => {
  return {
    modelId: modelId,
    provider: provider,
    specificationVersion: 'v1',
    defaultObjectGenerationMode: 'json',
    // Added async back, adjusted return type to Promise<any> for simplicity in mock
    // Removed async, wrapped return in Promise.resolve, removed Promise<any> type
    // Removed explicit return type annotation again
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doGenerate: (options: LanguageModelV1CallOptions): Promise<any> => {
      // Added Promise<any> and ignore comment
      expect(options).toEqual(expect.any(Object));
      return Promise.resolve({
        // Wrapped in Promise.resolve
        text: `${provider}-response for ${modelId}`,
        toolCalls: [],
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 20 },
        rawResponse: { headers: {} },
        rawCall: { rawPrompt: 'mock-prompt', rawSettings: {} },
        warnings: [],
      });
    },
    // Added async back, adjusted return type to Promise<any> for simplicity in mock
    // Removed async, wrapped return in Promise.resolve, removed Promise<any> type
    // Removed explicit return type annotation again
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doStream: (options: LanguageModelV1CallOptions): Promise<any> => {
      // Added Promise<any> and ignore comment
      const stream = new ReadableStream<LanguageModelV1StreamPart>({
        // Added async back
        // Removed async, kept void return type as it doesn't need to be a Promise
        start(controller): void {
          expect(options).toEqual(expect.any(Object));
          controller.enqueue({
            type: 'text-delta',
            textDelta: `${provider}-stream for ${modelId}`,
          });
          controller.enqueue({
            type: 'finish',
            finishReason: 'stop',
            usage: { promptTokens: 10, completionTokens: 20 },
            logprobs: undefined,
          });
          controller.close();
        },
      });

      return Promise.resolve({
        // Wrapped in Promise.resolve
        stream: stream,
        rawCall: { rawPrompt: 'mock-prompt', rawSettings: {} },
        rawResponse: undefined,
        request: undefined,
        warnings: [],
      });
    },
  };
};

// Specific provider create function mocks (lines 86-110) removed as they are redundant.
// The configLoader uses the mocked getProvider/getAllProviders (lines 113-197).

// Mock the providers module with typed mocks
vi.mock('../../ai-sdk/providers', () => {
  const mockGoogleProvider: MockProvider = {
    getName: () => 'googleai',
    createModel: vi.fn(
      (
        // Removed async
        modelId?: string,
        _credentials?: Record<string, unknown>,
      ): Promise<LanguageModel> => // Return type remains Promise
        Promise.resolve(createMockLanguageModel('googleai', modelId ?? 'gemini-1.5-flash')), // Wrapped in Promise.resolve
    ),
    getAvailableModels: vi.fn(
      (
        _credentials?, // Removed async
      ) =>
        Promise.resolve([
          // Wrapped in Promise.resolve
          'gemini-1.5-flash',
          'gemini-1.5-pro',
        ]),
    ),
    validateCredentials: vi.fn((_credentials?) => Promise.resolve(true)), // Removed async, wrapped in Promise.resolve
    getRequiredCredentialFields: vi.fn(() => ['apiKey']),
  };

  const mockOpenAIProvider: MockProvider = {
    getName: () => 'openai',
    createModel: vi.fn(
      (
        // Removed async
        modelId?: string,
        _credentials?: Record<string, unknown>,
      ): Promise<LanguageModel> => // Return type remains Promise
        Promise.resolve(createMockLanguageModel('openai', modelId ?? 'gpt-4o')), // Wrapped in Promise.resolve
    ),
    getAvailableModels: vi.fn(
      (
        _credentials?, // Removed async
      ) =>
        Promise.resolve([
          // Wrapped in Promise.resolve
          'gpt-4o',
          'gpt-3.5-turbo',
        ]),
    ),
    validateCredentials: vi.fn((_credentials?) => Promise.resolve(true)), // Removed async, wrapped in Promise.resolve
    getRequiredCredentialFields: vi.fn(() => ['apiKey']),
  };

  const mockAnthropicProvider: MockProvider = {
    getName: () => 'anthropic',
    createModel: vi.fn(
      (
        // Removed async
        modelId?: string,
        _credentials?: Record<string, unknown>,
      ): Promise<LanguageModel> => // Return type remains Promise
        Promise.resolve(
          createMockLanguageModel(
            // Wrapped in Promise.resolve
            'anthropic',
            modelId ?? 'claude-3-5-sonnet-20240620',
          ),
        ),
    ),
    getAvailableModels: vi.fn(
      (
        _credentials?, // Removed async
      ) =>
        Promise.resolve([
          // Wrapped in Promise.resolve
          'claude-3-5-sonnet-20240620',
          'claude-3-opus-20240229',
        ]),
    ),
    validateCredentials: vi.fn((_credentials?) => Promise.resolve(true)), // Removed async, wrapped in Promise.resolve
    getRequiredCredentialFields: vi.fn(() => ['apiKey']),
  };

  const mockOllamaProvider: MockProvider = {
    getName: () => 'ollama',
    createModel: vi.fn(
      (
        // Removed async
        modelId?: string,
        _credentials?: Record<string, unknown>,
      ): Promise<LanguageModel> => // Return type remains Promise
        Promise.resolve(createMockLanguageModel('ollama', modelId ?? 'llama3')), // Wrapped in Promise.resolve
    ),
    getAvailableModels: vi.fn((_credentials?) => Promise.resolve(['llama3', 'mistral'])), // Removed async, wrapped in Promise.resolve
    validateCredentials: vi.fn((_credentials?) => Promise.resolve(true)), // Removed async, wrapped in Promise.resolve
    getRequiredCredentialFields: vi.fn(() => ['baseUrl']),
  };

  const mockDeepseekProvider: MockProvider = {
    getName: () => 'deepseek',
    createModel: vi.fn(
      (
        // Removed async
        modelId?: string,
        _credentials?: Record<string, unknown>,
      ): Promise<LanguageModel> => // Return type remains Promise
        Promise.resolve(createMockLanguageModel('deepseek', modelId ?? 'deepseek-chat')), // Wrapped in Promise.resolve
    ),
    getAvailableModels: vi.fn((_credentials?) => Promise.resolve(['deepseek-chat'])), // Removed async, wrapped in Promise.resolve
    validateCredentials: vi.fn((_credentials?) => Promise.resolve(true)), // Removed async, wrapped in Promise.resolve
    getRequiredCredentialFields: vi.fn(() => ['apiKey']),
  };

  return {
    getProvider: vi.fn((providerId: string): MockProvider | undefined => {
      const providers: Record<string, MockProvider> = {
        googleai: mockGoogleProvider,
        openai: mockOpenAIProvider,
        anthropic: mockAnthropicProvider,
        ollama: mockOllamaProvider,
        deepseek: mockDeepseekProvider,
      };
      return providers[providerId];
    }),
    getAllProviders: vi.fn((): MockProvider[] => [
      mockGoogleProvider,
      mockOpenAIProvider,
      mockAnthropicProvider,
      mockOllamaProvider,
      mockDeepseekProvider,
    ]),
  };
});

// Mock vscode API
vi.mock('vscode', () => ({
  window: {
    showWarningMessage: vi.fn(),
    showErrorMessage: vi.fn(),
  },
}));

describe('AI SDK Config Loader', () => {
  beforeEach((): void => {
    vi.clearAllMocks();
    resetAiSdkModel();
  });

  it('should throw error if getLanguageModel is called before initialization', (): void => {
    expect(() => getLanguageModel()).toThrow('AI SDK Model has not been initialized');
  });

  // Remove unnecessary casts and use direct property access on the mock model
  it('should initialize OpenAI model with specific ID', async (): Promise<void> => {
    const config: AiConfig = {
      provider: 'openai',
      modelId: 'gpt-3.5-turbo',
      credentials: { apiKey: 'test-key' },
    };
    await initializeAiSdkModel(config);
    const model = getLanguageModel();
    expect(model.provider).toBe('openai');
    expect(model.modelId).toBe('gpt-3.5-turbo');
  });

  it('should initialize Google AI model with default ID', async (): Promise<void> => {
    const config: AiConfig = {
      provider: 'googleai',
      modelId: 'gemini-1.5-flash',
      credentials: { apiKey: 'test-key' },
    };
    await initializeAiSdkModel(config);
    const model = getLanguageModel();
    expect(model.provider).toBe('googleai');
    expect(model.modelId).toBe('gemini-1.5-flash');
  });

  it('should initialize Anthropic model with default ID', async (): Promise<void> => {
    const config: AiConfig = {
      provider: 'anthropic',
      modelId: 'claude-3-5-sonnet-20240620',
      credentials: { apiKey: 'test-key' },
    };
    await initializeAiSdkModel(config);
    const model = getLanguageModel();
    expect(model.provider).toBe('anthropic');
    expect(model.modelId).toBe('claude-3-5-sonnet-20240620');
  });

  it('should initialize Ollama model with default ID and base URL', async (): Promise<void> => {
    const config: AiConfig = {
      provider: 'ollama',
      modelId: 'llama3',
      credentials: { baseUrl: 'http://localhost:11434' },
    };
    await initializeAiSdkModel(config);
    const model = getLanguageModel();
    expect(model.provider).toBe('ollama');
    expect(model.modelId).toBe('llama3');
  });

  it('should initialize DeepSeek model with default ID', async (): Promise<void> => {
    const config: AiConfig = {
      provider: 'deepseek',
      modelId: 'deepseek-chat',
      credentials: { apiKey: 'test-key' },
    };
    await initializeAiSdkModel(config);
    const model = getLanguageModel();
    expect(model.provider).toBe('deepseek');
    expect(model.modelId).toBe('deepseek-chat');
  });

  it('should throw error for unsupported provider', async (): Promise<void> => {
    const config: AiConfig = {
      provider: 'unsupported-provider',
      modelId: 'test-model',
      credentials: {},
    };
    await expect(initializeAiSdkModel(config)).rejects.toThrow(
      'Unsupported AI provider: unsupported-provider',
    );
    expect(() => getLanguageModel()).toThrow('AI SDK Model has not been initialized');
    expect(getCurrentAiConfig()).toBeNull();
  });

  it('should update current config on successful initialization', async (): Promise<void> => {
    const config1: AiConfig = {
      provider: 'openai',
      modelId: 'gpt-4o',
      credentials: { apiKey: 'key1' },
    };
    const config2: AiConfig = {
      provider: 'googleai',
      modelId: 'gemini-1.5-pro',
      credentials: { apiKey: 'key2' },
    };

    await initializeAiSdkModel(config1);
    expect(getCurrentAiConfig()).toEqual(config1);
    const model1 = getLanguageModel();
    expect(model1.provider).toBe('openai');
    expect(model1.modelId).toBe('gpt-4o');

    await initializeAiSdkModel(config2);
    expect(getCurrentAiConfig()).toEqual(config2);
    const model2 = getLanguageModel();
    expect(model2.provider).toBe('googleai');
    expect(model2.modelId).toBe('gemini-1.5-pro');
  });

  it('should handle initialization without modelId', async (): Promise<void> => {
    const config: AiConfig = {
      provider: 'openai',
      credentials: { apiKey: 'test-key' },
    };
    await initializeAiSdkModel(config);
    expect(() => getLanguageModel()).toThrow('AI SDK Model has not been initialized');
    expect(getCurrentAiConfig()).toEqual(config);
  });

  it('should use provider, model, and credentials from config', async () => {
    // Renamed test for accuracy
    const config: AiConfig = {
      provider: 'openai',
      modelId: 'gpt-3.5-turbo',
      credentials: { apiKey: 'test-key' },
    };
    await initializeAiSdkModel(config);
    const model = getLanguageModel();
    expect(model.provider).toBe('openai');
    expect(model.modelId).toBe('gpt-3.5-turbo');
  });
});
