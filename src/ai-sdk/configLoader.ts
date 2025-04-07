import { LanguageModel } from 'ai'; // Removed createLanguageModel, ProviderMetadata
// Removed logger import, using the one defined below
import * as vscode from 'vscode'; // Needed for potential logging or config access

// Define the expected configuration structure from the extension host
// Matches the structure used in extension.ts for reading settings/secrets
export interface AiConfig {
    provider: string;
    modelId?: string; // Optional, specific model ID (e.g., 'gemini-1.5-flash', 'gemma', 'gpt-4o')
    apiKey?: string; // API key if required by the provider
    baseUrl?: string; // Base URL for self-hosted models like Ollama
    location?: string; // Location for cloud providers like Vertex AI
    // Add other potential config fields as needed (e.g., project ID for Vertex)
}

// Store the initialized model instance
let languageModelInstance: LanguageModel | null = null;
let currentConfig: AiConfig | null = null;

/**
 * Initializes the Vercel AI SDK LanguageModel dynamically based on the provided configuration.
 * This should be called when the extension activates or when the configuration changes.
 * @param config The AI configuration object.
 */
export async function initializeAiSdkModel(config: AiConfig): Promise<void> {
    logger.info(`Initializing AI SDK for provider: ${config.provider} with model: ${config.modelId || 'default'}`);
    currentConfig = config; // Store current config

    try {
        let providerInstance: any; // To hold the specific provider instance (e.g., google, openai)
        let modelIdentifier: string; // The ID string for the model

        switch (config.provider.toLowerCase()) {
            case 'googleai': {
                const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
                providerInstance = createGoogleGenerativeAI({ apiKey: config.apiKey }); // Uses env var if apiKey is undefined
                modelIdentifier = config.modelId || 'gemini-1.5-flash'; // Default model
                break;
            }
            case 'openai': {
                const { createOpenAI } = await import('@ai-sdk/openai');
                providerInstance = createOpenAI({ apiKey: config.apiKey }); // Uses env var if apiKey is undefined
                modelIdentifier = config.modelId || 'gpt-4o'; // Default model
                break;
            }
            case 'anthropic': {
                const { createAnthropic } = await import('@ai-sdk/anthropic');
                providerInstance = createAnthropic({ apiKey: config.apiKey }); // Uses env var if apiKey is undefined
                modelIdentifier = config.modelId || 'claude-3-5-sonnet'; // Default model
                break;
            }
            case 'ollama': {
                const { createOllama } = await import('ollama-ai-provider');
                providerInstance = createOllama({ baseURL: config.baseUrl }); // Uses default localhost if baseUrl undefined
                modelIdentifier = config.modelId || 'llama3'; // Default model
                break;
            }
            // Add cases for other providers like vertexai, mistral, cohere etc.
            // case 'vertexai': {
            //     const { createVertex } = await import('@ai-sdk/google-vertex'); // Check actual package name
            //     providerInstance = createVertex({ location: config.location || 'us-central1' });
            //     modelIdentifier = config.modelId || 'gemini-1.5-flash';
            //     break;
            // }
            default:
                logger.error(`Unsupported AI provider in configLoader: ${config.provider}`);
                throw new Error(`Unsupported AI provider: ${config.provider}`);
        }

        // Get the specific model instance from the provider
        // The createLanguageModel function wraps the provider-specific model
        languageModelInstance = providerInstance(modelIdentifier);

        logger.info(`AI SDK Model initialized successfully: ${providerInstance.provider}/${modelIdentifier}`);

    } catch (error) {
        logger.error(`Failed to initialize AI SDK Model for provider ${config.provider}:`, error);
        languageModelInstance = null; // Reset instance on failure
        currentConfig = null;
        throw new Error(`AI SDK Model initialization failed: ${error}`);
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

// Simple logger implementation (replace with a more robust one if needed)
// Create a separate logger.ts file if preferred
namespace logger {
    export function info(message: string, ...optionalParams: any[]): void {
        console.log(`[INFO] ${message}`, ...optionalParams);
        // Potentially write to VS Code OutputChannel
    }
    export function warn(message: string, ...optionalParams: any[]): void {
        console.warn(`[WARN] ${message}`, ...optionalParams);
        vscode.window.showWarningMessage(message);
    }
    export function error(message: string, ...optionalParams: any[]): void {
        console.error(`[ERROR] ${message}`, ...optionalParams);
        vscode.window.showErrorMessage(message);
    }
}