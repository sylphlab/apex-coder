import type { LanguageModel } from 'ai';
import { logger } from '../utils/logger';

// Define the expected configuration structure
export interface AiConfig {
    provider: string;
    modelId?: string;
    apiKey?: string;
    baseUrl?: string;
    location?: string; // For Vertex AI
    // Add other potential config fields
}

// Provider information structure
export interface ProviderInfo {
    defaultModel: string;
    importPath: string;
    creatorFunction: string;
    category: 'core' | 'cloud' | 'enterprise' | 'community';
}

// Define provider information with default models and import details
export const PROVIDER_INFO: Record<string, ProviderInfo> = {
    // Core providers
    googleai: {
        defaultModel: 'gemini-1.5-flash',
        importPath: '@ai-sdk/google',
        creatorFunction: 'createGoogleGenerativeAI',
        category: 'core'
    },
    openai: {
        defaultModel: 'gpt-4o',
        importPath: '@ai-sdk/openai',
        creatorFunction: 'createOpenAI',
        category: 'core'
    },
    anthropic: {
        defaultModel: 'claude-3-5-sonnet',
        importPath: '@ai-sdk/anthropic',
        creatorFunction: 'createAnthropic',
        category: 'core'
    },
    ollama: {
        defaultModel: 'llama3',
        importPath: 'ollama-ai-provider',
        creatorFunction: 'createOllama',
        category: 'core'
    },
    deepseek: {
        defaultModel: 'deepseek-chat',
        importPath: '@ai-sdk/deepseek',
        creatorFunction: 'createDeepSeek',
        category: 'core'
    },
    xai: {
        defaultModel: 'grok-2-1212',
        importPath: '@ai-sdk/xai',
        creatorFunction: 'createXai',
        category: 'core'
    },
    cerebras: {
        defaultModel: 'llama3.1-70b',
        importPath: '@ai-sdk/cerebras',
        creatorFunction: 'createCerebras',
        category: 'core'
    },
    
    // Cloud providers
    vertexai: {
        defaultModel: 'gemini-1.5-flash',
        importPath: '@ai-sdk/google-vertex',
        creatorFunction: 'createVertex',
        category: 'cloud'
    },
    cohere: {
        defaultModel: 'command',
        importPath: '@ai-sdk/cohere',
        creatorFunction: 'createCohere',
        category: 'cloud'
    },
    mistral: {
        defaultModel: 'mistral-large-latest',
        importPath: '@ai-sdk/mistral',
        creatorFunction: 'createMistral',
        category: 'cloud'
    },
    perplexity: {
        defaultModel: 'sonar-medium-online',
        importPath: '@ai-sdk/perplexity',
        creatorFunction: 'createPerplexity',
        category: 'cloud'
    },
    replicate: {
        defaultModel: 'meta/llama-3-70b-instruct',
        importPath: '@ai-sdk/replicate',
        creatorFunction: 'createReplicate',
        category: 'cloud'
    },
    fireworks: {
        defaultModel: 'llama-v3-70b-instruct',
        importPath: '@ai-sdk/fireworks',
        creatorFunction: 'createFireworks',
        category: 'cloud'
    },
    together: {
        defaultModel: 'togethercomputer/llama-3-70b-instruct',
        importPath: '@ai-sdk/togetherai',
        creatorFunction: 'createTogetherAI',
        category: 'cloud'
    },
    deepinfra: {
        defaultModel: 'meta-llama/Meta-Llama-3-70B-Instruct',
        importPath: '@ai-sdk/deepinfra',
        creatorFunction: 'createDeepInfra',
        category: 'cloud'
    },
    
    // Enterprise providers
    aws: {
        defaultModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        importPath: '@ai-sdk/amazon-bedrock',
        creatorFunction: 'createAmazonBedrock',
        category: 'enterprise'
    },
    bedrock: {
        defaultModel: 'anthropic.claude-3-sonnet-20240229-v1:0',
        importPath: '@ai-sdk/amazon-bedrock',
        creatorFunction: 'createAmazonBedrock',
        category: 'enterprise'
    },
    azure: {
        defaultModel: 'gpt-4',
        importPath: '@ai-sdk/azure',
        creatorFunction: 'createAzure',
        category: 'enterprise'
    },
    groq: {
        defaultModel: 'llama3-70b-8192',
        importPath: '@ai-sdk/groq',
        creatorFunction: 'createGroq',
        category: 'enterprise'
    },
    
    // Community providers
    chromeai: {
        defaultModel: 'gemini-1.5-pro',
        importPath: 'chrome-ai',
        creatorFunction: 'polyfillChromeAI',
        category: 'community'
    },
    openrouter: {
        defaultModel: 'openai/gpt-4',
        importPath: '@openrouter/ai-sdk-provider',
        creatorFunction: 'createOpenRouter',
        category: 'community'
    }
};

// Helper function to get default model for a provider
export function getDefaultModel(providerName: string): string | undefined {
    const providerLower = providerName.toLowerCase();
    const info = PROVIDER_INFO[providerLower];
    return info?.defaultModel;
}

// Store the initialized model instance and config
let languageModelInstance: LanguageModel | null = null;
let currentConfig: AiConfig | null = null;

// Type for the provider creation functions
type ProviderCreator = (options?: { apiKey?: string; baseURL?: string; baseUrl?: string; location?: string; [key: string]: any }) => any;

/**
 * Loads the appropriate provider creation function dynamically.
 * @param providerName Lowercase provider name.
 * @returns The provider creation function.
 */
async function loadProviderCreator(providerName: string): Promise<ProviderCreator> {
    try {
        const providerLower = providerName.toLowerCase();
        const info = PROVIDER_INFO[providerLower];
        
        if (!info) {
            throw new Error(`Unsupported AI provider: ${providerName}`);
        }
        
        try {
            const module = await import(info.importPath);
            const creatorFunction = module[info.creatorFunction];
            
            if (!creatorFunction) {
                throw new Error(`Creator function '${info.creatorFunction}' not found in module '${info.importPath}'`);
            }
            
            return creatorFunction as ProviderCreator;
        } catch (importError) {
            // Handle missing package error
            throw new Error(`Provider package '${info.importPath}' is not installed or has an incorrect export. Please check your dependencies.`);
        }
    } catch (error) {
        // Provide a more helpful error message
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("Cannot find module") || errorMessage.includes("Failed to resolve")) {
            throw new Error(`Provider package for '${providerName}' is not installed. Please install it using npm/pnpm.`);
        }
        throw error;
    }
}

/**
 * Initializes the Vercel AI SDK LanguageModel dynamically based on the provided configuration.
 * @param config The AI configuration object.
 */
export async function initializeAiSdkModel(config: AiConfig): Promise<void> {
    const providerLower = config.provider.toLowerCase();
    const modelIdentifier = config.modelId || getDefaultModel(providerLower) || '';
    logger.info(`Initializing AI SDK for provider: ${providerLower} with model: ${modelIdentifier}`);

    if (!modelIdentifier) {
        logger.error(`No model ID specified and no default found for provider: ${providerLower}`);
        throw new Error(`No model ID specified and no default found for provider: ${providerLower}`);
    }

    currentConfig = config; // Store config before attempting initialization

    try {
        const createProvider = await loadProviderCreator(providerLower);

        // Prepare options, filtering out undefined values
        const providerOptions: Record<string, string | undefined> = {
            apiKey: config.apiKey,
            // Handle potential naming difference for Ollama's baseURL
            [providerLower === 'ollama' ? 'baseURL' : 'baseUrl']: config.baseUrl,
            location: config.location,
        };
        Object.keys(providerOptions).forEach(key => providerOptions[key] === undefined && delete providerOptions[key]);

        const providerInstance = createProvider(providerOptions);

        // Get the specific model instance from the provider
        languageModelInstance = providerInstance(modelIdentifier);

        logger.info(`AI SDK Model initialized successfully: ${providerLower}/${modelIdentifier}`);

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`Failed to initialize AI SDK Model for provider ${providerLower}:`, errorMessage, error);
        languageModelInstance = null; // Reset instance on failure
        currentConfig = null;
        // Re-throw a more specific error or the original one
        throw new Error(`AI SDK Model initialization failed for ${providerLower}: ${errorMessage}`);
    }
}

/**
 * Returns the initialized LanguageModel instance.
 * Throws an error if the model is not initialized.
 */
export function getLanguageModel(): LanguageModel {
    if (!languageModelInstance) {
        throw new Error('AI SDK Model has not been initialized. Call initializeAiSdkModel first.');
    }
    return languageModelInstance;
}

/**
 * Returns the configuration that was used to initialize the current model.
 */
export function getCurrentAiConfig(): AiConfig | null {
    return currentConfig;
}

/**
 * Resets the initialized model and configuration.
 * Useful for testing or re-initialization.
 */
export function resetAiSdkModel(): void {
    logger.info('Resetting AI SDK Model and configuration.');
    languageModelInstance = null;
    currentConfig = null;
}

/**
 * Returns a list of all supported providers with their categories.
 */
export function getSupportedProviders(): { name: string; category: string; defaultModel: string }[] {
    return Object.entries(PROVIDER_INFO).map(([name, info]) => ({
        name,
        category: info.category,
        defaultModel: info.defaultModel
    }));
}
