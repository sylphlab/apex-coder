import type { LanguageModel } from 'ai';
import { BaseAIProvider } from './baseProvider';
import { logger } from '../../utils/logger';

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider extends BaseAIProvider {
    constructor() {
        super('openai');
    }
    
    async createModel(modelId: string, credentials: Record<string, any>): Promise<LanguageModel> {
        try {
            // Validate required credentials
            if (!credentials.apiKey) {
                throw new Error('API key is required for OpenAI');
            }
            
            // Import the OpenAI SDK
            const { createOpenAI } = await import('@ai-sdk/openai');
            
            // Prepare options
            const options: Record<string, string> = { 
                apiKey: credentials.apiKey 
            };
            
            // Add optional baseUrl if provided
            if (credentials.baseUrl) {
                options.baseUrl = credentials.baseUrl;
            }
            
            // Create the provider instance
            const provider = createOpenAI(options);
            
            // Return the model instance
            return provider(modelId);
        } catch (error) {
            logger.error('Failed to create OpenAI model:', error);
            throw new Error(`Failed to create OpenAI model: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    async getAvailableModels(credentials?: Record<string, any>): Promise<string[]> {
        // In a real implementation, this would fetch models from the OpenAI API
        // For now, return a static list of common models
        return [
            'gpt-4o',
            'gpt-4-turbo',
            'gpt-4',
            'gpt-3.5-turbo'
        ];
    }
    
    async validateCredentials(credentials: Record<string, any>): Promise<boolean> {
        try {
            if (!credentials.apiKey) {
                return false;
            }
            
            // Try to create a model with the credentials
            const { createOpenAI } = await import('@ai-sdk/openai');
            const options: Record<string, string> = { apiKey: credentials.apiKey };
            
            if (credentials.baseUrl) {
                options.baseUrl = credentials.baseUrl;
            }
            
            const provider = createOpenAI(options);
            
            // Just create the provider, don't actually call the API
            // In a real implementation, you might make a test API call
            return true;
        } catch (error) {
            logger.error('Failed to validate OpenAI credentials:', error);
            return false;
        }
    }
    
    getRequiredCredentialFields(): string[] {
        return ['apiKey'];
    }
}

// Export a singleton instance
export const openAIProvider = new OpenAIProvider();