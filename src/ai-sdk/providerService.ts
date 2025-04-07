import { logger } from '../utils/logger';
import { AiConfig, getModelsForProvider, getSupportedProviders } from './configLoader';

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
            // Get providers from the configLoader
            const providers = getSupportedProviders();
            
            // Convert to ProviderDetails format
            return providers.map(provider => {
                return {
                    id: provider.id,
                    name: this.getProviderDisplayName(provider.id),
                    requiresApiKey: provider.requiredCredentials.includes('apiKey'),
                    requiresBaseUrl: provider.requiredCredentials.includes('baseUrl'),
                    allowCustomModel: this.allowsCustomModel(provider.id),
                    models: [] // Will be populated on demand
                };
            });
        } catch (error) {
            logger.error('Error getting providers:', error);
            throw new Error(`Failed to get providers: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    /**
     * Get models for a specific provider
     * @param providerId The provider ID
     * @param credentials Optional credentials for providers that require them to list models
     */
    public static async getModelsForProvider(providerId: string, credentials?: Record<string, any>): Promise<ModelInfo[]> {
        try {
            const providerLower = providerId.toLowerCase();
            
            // For Ollama, fetch models dynamically if baseUrl is provided
            if (providerLower === 'ollama' && credentials?.baseUrl) {
                return await this.fetchOllamaModels(credentials.baseUrl);
            }
            
            // For other providers, use the configLoader
            const modelIds = await getModelsForProvider(providerLower, credentials);
            
            // Convert to ModelInfo format
            return modelIds.map(id => ({
                id,
                name: this.formatModelName(id)
            }));
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
            const response = await fetch(`${normalizedBaseUrl}/api/tags`);
            
            if (response.ok) {
                const data = await response.json();
                if (data && Array.isArray(data.models)) {
                    // Map Ollama models to ModelInfo format
                    return data.models.map((model: any) => ({
                        id: model.name,
                        name: model.name,
                        description: `Size: ${this.formatSize(model.size)}`
                    }));
                }
            }
            
            // Fallback to default models if API response is not as expected
            logger.warn('Unexpected Ollama API response format, using default models');
            return this.getDefaultModels('ollama');
        } catch (error) {
            logger.error('Error fetching Ollama models:', error);
            // Return default models on error
            return this.getDefaultModels('ollama');
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
     * Get default models for a provider
     * @param providerId The provider ID
     */
    private static getDefaultModels(providerId: string): ModelInfo[] {
        // This is a temporary solution until we implement dynamic model fetching for all providers
        switch (providerId) {
            case 'ollama':
                return [
                    { id: 'llama3', name: 'Llama 3' },
                    { id: 'mistral', name: 'Mistral' },
                    { id: 'codellama', name: 'Code Llama' },
                    { id: 'phi3', name: 'Phi-3' },
                ];
            default:
                // For unknown providers, return an empty array
                return [];
        }
    }

    /**
     * Format a model ID into a display name
     * @param modelId The model ID
     */
    private static formatModelName(modelId: string): string {
        // Remove any prefixes like 'models/'
        const cleanId = modelId.replace(/^models\//, '');
        
        // Replace hyphens and underscores with spaces
        const spacedId = cleanId.replace(/[-_]/g, ' ');
        
        // Capitalize words
        return spacedId.replace(/\b\w/g, c => c.toUpperCase());
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
     * Check if a provider allows custom model IDs
     */
    private static allowsCustomModel(providerId: string): boolean {
        // Only Ollama and Replicate allow custom model IDs by default
        return ['ollama', 'replicate'].includes(providerId.toLowerCase());
    }
}
