import { logger } from '../utils/logger';
import { PROVIDER_INFO, ProviderInfo, AiConfig } from './configLoader';
import axios from 'axios';

/**
 * Interface for model information
 */
export interface ModelInfo {
    id: string;
    name: string;
    description?: string;
    // Add other model properties as needed
}

/**
 * Interface for provider details with models
 */
export interface ProviderDetails {
    id: string;
    name: string;
    category: string;
    requiresApiKey: boolean;
    requiresBaseUrl: boolean;
    allowCustomModel: boolean;
    models: ModelInfo[];
    isConfigured?: boolean;
    isWorking?: boolean;
}

/**
 * Service for managing AI providers and their models
 */
export class ProviderService {
    /**
     * Get all supported providers with their details
     */
    public static async getAllProviders(): Promise<ProviderDetails[]> {
        try {
            // Convert the PROVIDER_INFO to ProviderDetails format
            const providers = Object.entries(PROVIDER_INFO).map(([id, info]) => {
                return {
                    id,
                    name: this.getProviderDisplayName(id),
                    category: info.category,
                    requiresApiKey: this.requiresApiKey(id),
                    requiresBaseUrl: this.requiresBaseUrl(id),
                    allowCustomModel: this.allowsCustomModel(id),
                    models: [] // Will be populated on demand
                };
            });

            return providers;
        } catch (error) {
            logger.error('Error getting providers:', error);
            throw new Error(`Failed to get providers: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get models for a specific provider
     * @param providerId The provider ID
     * @param config Optional configuration for providers that need it (like baseUrl for Ollama)
     */
    public static async getModelsForProvider(providerId: string, config?: Partial<AiConfig>): Promise<ModelInfo[]> {
        try {
            const providerLower = providerId.toLowerCase();

            // For Ollama, fetch models dynamically if baseUrl is provided
            if (providerLower === 'ollama' && config?.baseUrl) {
                return await this.fetchOllamaModels(config.baseUrl);
            }

            // For other providers, return predefined models
            return this.getPredefinedModels(providerLower);
        } catch (error) {
            logger.error(`Error getting models for provider ${providerId}:`, error);
            throw new Error(`Failed to get models for provider ${providerId}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Fetch models from Ollama API
     * @param baseUrl The Ollama base URL
     */
    private static async fetchOllamaModels(baseUrl: string): Promise<ModelInfo[]> {
        try {
            // Normalize the baseUrl
            const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
            
            // Fetch models from Ollama API
            const response = await axios.get(`${normalizedBaseUrl}/api/tags`);
            
            if (response.data && Array.isArray(response.data.models)) {
                // Map Ollama models to ModelInfo format
                return response.data.models.map((model: any) => ({
                    id: model.name,
                    name: model.name,
                    description: `Size: ${this.formatSize(model.size)}`
                }));
            }
            
            // Fallback to default models if API response is not as expected
            logger.warn('Unexpected Ollama API response format, using default models');
            return this.getPredefinedModels('ollama');
        } catch (error) {
            logger.error('Error fetching Ollama models:', error);
            // Return default models on error
            return this.getPredefinedModels('ollama');
        }
    }

    /**
     * Format file size in bytes to human-readable format
     */
    private static formatSize(bytes: number): string {
        if (bytes < 1024) { return bytes + ' B'; }
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Get predefined models for a provider
     * @param providerId The provider ID
     */
    private static getPredefinedModels(providerId: string): ModelInfo[] {
        // This is a temporary solution until we implement dynamic model fetching for all providers
        // In the future, this could be replaced with API calls to fetch models from the provider
        switch (providerId) {
            case 'googleai':
                return [
                    { id: 'models/gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
                    { id: 'models/gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
                    { id: 'models/gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B' },
                    { id: 'models/gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
                    { id: 'models/gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite' },
                    { id: 'models/gemini-2.5-pro-preview-03-25', name: 'Gemini 2.5 Pro (Preview 03-25)' },
                ];
            case 'openai':
                return [
                    { id: 'gpt-4o', name: 'GPT-4o' },
                    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
                    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
                ];
            case 'anthropic':
                return [
                    { id: 'claude-3-5-sonnet-20240620', name: 'Claude 3.5 Sonnet' },
                    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
                    { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
                    { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
                ];
            case 'ollama':
                return [
                    { id: 'llama3', name: 'Llama 3' },
                    { id: 'mistral', name: 'Mistral' },
                    { id: 'codellama', name: 'Code Llama' },
                    { id: 'phi3', name: 'Phi-3' },
                ];
            // Add cases for other providers as needed
            default:
                // For unknown providers, return an empty array
                return [];
        }
    }

    /**
     * Get display name for a provider
     */
    private static getProviderDisplayName(providerId: string): string {
        // Map provider IDs to display names
        const displayNames: Record<string, string> = {
            'googleai': 'Google AI (Gemini)',
            'openai': 'OpenAI (GPT)',
            'anthropic': 'Anthropic (Claude)',
            'ollama': 'Ollama (Local)',
            'deepseek': 'DeepSeek',
            'vertexai': 'Google Vertex AI',
            'cohere': 'Cohere',
            'mistral': 'Mistral AI',
            'perplexity': 'Perplexity AI',
            'replicate': 'Replicate',
            'aws': 'AWS Bedrock',
            'bedrock': 'AWS Bedrock',
            'azure': 'Azure OpenAI',
            'groq': 'Groq',
            'chromeai': 'Chrome AI',
            'openrouter': 'OpenRouter',
            // Add more mappings as needed
        };

        return displayNames[providerId] || providerId;
    }

    /**
     * Check if a provider requires an API key
     */
    private static requiresApiKey(providerId: string): boolean {
        // Most providers require an API key except for Ollama and ChromeAI
        return !['ollama', 'chromeai'].includes(providerId.toLowerCase());
    }

    /**
     * Check if a provider requires a base URL
     */
    private static requiresBaseUrl(providerId: string): boolean {
        // Only Ollama and Azure require a base URL by default
        return ['ollama', 'azure'].includes(providerId.toLowerCase());
    }

    /**
     * Check if a provider allows custom model IDs
     */
    private static allowsCustomModel(providerId: string): boolean {
        // Only Ollama and Replicate allow custom model IDs by default
        return ['ollama', 'replicate'].includes(providerId.toLowerCase());
    }
}
