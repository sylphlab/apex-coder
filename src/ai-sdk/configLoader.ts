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
    googleai: 'gemini-1.5-flash',
    openai: 'gpt-4o',
    anthropic: 'claude-3-5-sonnet',
    ollama: 'llama3',
    deepseek: 'deepseek-chat',
    // vertexai: 'gemini-1.5-flash',
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
    switch (providerName) {
        case 'googleai':
            return (await import('@ai-sdk/google')).createGoogleGenerativeAI;
        case 'openai':
            return (await import('@ai-sdk/openai')).createOpenAI;
        case 'anthropic':
            return (await import('@ai-sdk/anthropic')).createAnthropic;
        case 'ollama':
            // Ollama provider might have different signature, adjust type/call if needed
            return (await import('ollama-ai-provider')).createOllama as ProviderCreator;
        case 'deepseek':
            return (await import('@ai-sdk/deepseek')).createDeepSeek;
        // case 'vertexai':
        //     return (await import('@ai-sdk/google-vertex')).createVertex;
        default:
            throw new Error(`Unsupported AI provider: ${providerName}`);
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
