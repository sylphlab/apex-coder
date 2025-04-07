import type { LanguageModel } from 'ai';
import { BaseAIProvider } from './baseProvider';
import { logger } from '../../utils/logger';

/**
 * Mistral AI provider implementation
 */
export class MistralProvider extends BaseAIProvider {
    constructor() {
        super('mistral');
    }
    
    async createModel(modelId: string, credentials: Record<string, any>): Promise<LanguageModel> {
        try {
            // Validate required credentials
            if (!credentials.apiKey) {
                throw new Error('API key is required for Mistral AI');
            }
            
            // Import the Mistral SDK
            const { createMistral } = await import('@ai-sdk/mistral');
            
            // Create the provider instance
            const provider = createMistral({ 
                apiKey: credentials.apiKey 
            });
            
            // Return the model instance
            return provider(modelId);
        } catch (error) {
            logger.error('Failed to create Mistral AI model:', error);
            throw new Error(`Failed to create Mistral AI model: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    async getAvailableModels(credentials?: Record<string, any>): Promise<string[]> {
        // In a real implementation, this would fetch models from the Mistral API
        // For now, return a static list of common models
        return [
            'mistral-large-latest',
            'mistral-medium-latest',
            'mistral-small-latest',
            'mistral-tiny-latest'
        ];
    }
    
    async validateCredentials(credentials: Record<string, any>): Promise<boolean> {
        try {
            if (!credentials.apiKey) {
                return false;
            }
            
            // Try to create a model with the credentials
            const { createMistral } = await import('@ai-sdk/mistral');
            const provider = createMistral({ apiKey: credentials.apiKey });
            
            // Just create the provider, don't actually call the API
            // In a real implementation, you might make a test API call
            return true;
        } catch (error) {
            logger.error('Failed to validate Mistral AI credentials:', error);
            return false;
        }
    }
    
    getRequiredCredentialFields(): string[] {
        return ['apiKey'];
    }
}

// Export a singleton instance
export const mistralProvider = new MistralProvider();