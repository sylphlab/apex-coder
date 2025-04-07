import type { LanguageModel } from 'ai';
import { logger } from '../utils/logger'; // Import from separate file

// Define the expected configuration structure
export interface AiConfig {
    provider: string;
    modelId?: string;
    apiKey?: string;
    baseUrl?: string;
    location?: string; // For Vertex AI
    // Add other potential config fields
}

// Define default model IDs as constants
const DEFAULT_MODELS: Record<string, string> = {
    // Core providers
    googleai: 'gemini-1.5-flash',
    openai: 'gpt-4o',
    anthropic: 'claude-3-5-sonnet',
    ollama: 'llama3',
    deepseek: 'deepseek-chat',
    
    // Cloud providers
    vertexai: 'gemini-1.5-flash',
    cohere: 'command',
    mistral: 'mistral-large-latest',
    perplexity: 'sonar-medium-online',
    replicate: 'meta/llama-3-70b-instruct',
    fireworks: 'llama-v3-70b-instruct',
    together: 'togethercomputer/llama-3-70b-instruct',
    huggingface: 'mistralai/Mistral-7B-Instruct-v0.2',
    anyscale: 'meta-llama/Llama-3-70b-chat-hf',
    deepinfra: 'meta-llama/Meta-Llama-3-70B-Instruct',
    
    // Enterprise providers
    aws: 'anthropic.claude-3-sonnet-20240229-v1:0',
    bedrock: 'anthropic.claude-3-sonnet-20240229-v1:0',
    azure: 'gpt-4',
    groq: 'llama3-70b-8192',
};

// Store the initialized model instance and config
let languageModelInstance: LanguageModel | null = null;
let currentConfig: AiConfig | null = null;

// Type for the provider creation functions (adjust as needed based on actual provider types)
// Type for the provider creation functions (adjust as needed based on actual provider types)
// TODO: Find the correct type for LanguageModelProvider or use a more specific union type
type ProviderCreator = (options?: { apiKey?: string; baseURL?: string; baseUrl?: string; location?: string; /* other options */ }) => any;

/**
 * Loads the appropriate provider creation function dynamically.
 * @param providerName Lowercase provider name.
 * @returns The provider creation function.
 */
async function loadProviderCreator(providerName: string): Promise<ProviderCreator> {
    try {
        // Core providers - these are installed by default
        switch (providerName) {
            case 'googleai':
                return (await import('@ai-sdk/google')).createGoogleGenerativeAI;
            case 'openai':
                return (await import('@ai-sdk/openai')).createOpenAI;
            case 'anthropic':
                return (await import('@ai-sdk/anthropic')).createAnthropic;
            case 'ollama':
                return (await import('ollama-ai-provider')).createOllama as ProviderCreator;
            case 'deepseek':
                return (await import('@ai-sdk/deepseek')).createDeepSeek;
        }
        
        // Additional providers - these require installation via install-providers.js
        // We use dynamic imports with try/catch to handle missing packages gracefully
        try {
            switch (providerName) {
                // Cloud providers
                case 'vertexai':
                    return (await import('@ai-sdk/google-vertex')).createVertex;
                case 'cohere':
                    return (await import('@ai-sdk/cohere')).createCohere;
                case 'mistral':
                    return (await import('@ai-sdk/mistral')).createMistral;
                case 'perplexity':
                    return (await import('@ai-sdk/perplexity')).createPerplexity;
                case 'replicate':
                    return (await import('@ai-sdk/replicate')).createReplicate;
                case 'fireworks':
                    return (await import('@ai-sdk/fireworks')).createFireworks;
                case 'together':
                    return (await import('@ai-sdk/togetherai')).createTogether;
                case 'huggingface':
                    return (await import('@ai-sdk/huggingface')).createHuggingFace;
                case 'anyscale':
                    return (await import('@ai-sdk/anyscale')).createAnyscale;
                case 'deepinfra':
                    return (await import('@ai-sdk/deepinfra')).createDeepInfra;
                    
                // Enterprise providers
                case 'bedrock':
                case 'aws':
                    return (await import('@ai-sdk/amazon-bedrock')).createAmazonBedrock;
                case 'azure':
                    return (await import('@ai-sdk/azure')).createAzure;
                case 'groq':
                    return (await import('@ai-sdk/groq')).createGroq;
            }
        } catch (importError) {
            // Handle missing package error
            throw new Error(`Provider package for '${providerName}' is not installed. Please run 'node install-providers.js --providers=${providerName}' to install it.`);
        }
        
        // If we get here, the provider is not supported
        throw new Error(`Unsupported AI provider: ${providerName}`);
    } catch (error) {
        // Provide a more helpful error message
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("Cannot find module") || errorMessage.includes("Failed to resolve")) {
            throw new Error(`Provider package for '${providerName}' is not installed. Please run 'node install-providers.js --providers=${providerName}' to install it.`);
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
    const modelIdentifier = config.modelId || DEFAULT_MODELS[providerLower] || '';
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

        // Attempt a simple check if possible (optional, might require specific provider knowledge)
        // e.g., if (typeof languageModelInstance?.generate !== 'function') throw new Error('Invalid model instance');

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
