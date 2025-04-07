import type { LanguageModel } from 'ai';
import { BaseAIProvider } from './baseProvider';
import { logger } from '../../utils/logger';

/**
 * Cohere provider implementation
 */
export class CohereProvider extends BaseAIProvider {
    constructor() {
        super('cohere');
    }
    
    async createModel(modelId: string, credentials: Record<string, any>): Promise<LanguageModel> {
        try {
            // Validate required credentials
            if (!credentials.apiKey) {
                throw new Error('API key is required for Cohere');
            }
            
            // Import the Cohere SDK
            const { createCohere } = await import('@ai-sdk/cohere');
            
            // Create the provider instance
            const provider = createCohere({ 
                apiKey: credentials.apiKey 
            });
            
            // Return the model instance
            return provider(modelId);
        } catch (error) {
            logger.error('Failed to create Cohere model:', error);
            throw new Error(`Failed to create Cohere model: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    async getAvailableModels(credentials?: Record<string, any>): Promise<string[]> {
        // In a real implementation, this would fetch models from the Cohere API
        // For now, return a static list of common models
        return [
            'command',
            'command-light',
            'command-r',
            'command-r-plus'
        ];
    }
    
    async validateCredentials(credentials: Record<string, any>): Promise<boolean> {
        try {
            if (!credentials.apiKey) {
                return false;
            }
            
            // Try to create a model with the credentials
            const { createCohere } = await import('@ai-sdk/cohere');
            const provider = createCohere({ apiKey: credentials.apiKey });
            
            // Just create the provider, don't actually call the API
            // In a real implementation, you might make a test API call
            return true;
        } catch (error) {
            logger.error('Failed to validate Cohere credentials:', error);
            return false;
        }
    }
    
    getRequiredCredentialFields(): string[] {
        return ['apiKey'];
    }
}

// Export a singleton instance
export const cohereProvider = new CohereProvider();