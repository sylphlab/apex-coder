import type { LanguageModel } from 'ai';
import { BaseAIProvider } from './baseProvider';
import { logger } from '../../utils/logger';

/**
 * Anthropic (Claude) provider implementation
 */
export class AnthropicProvider extends BaseAIProvider {
    constructor() {
        super('anthropic');
    }
    
    async createModel(modelId: string, credentials: Record<string, any>): Promise<LanguageModel> {
        try {
            // Validate required credentials
            if (!credentials.apiKey) {
                throw new Error('API key is required for Anthropic');
            }
            
            // Import the Anthropic SDK
            const { createAnthropic } = await import('@ai-sdk/anthropic');
            
            // Create the provider instance
            const provider = createAnthropic({ 
                apiKey: credentials.apiKey 
            });
            
            // Return the model instance
            return provider(modelId);
        } catch (error) {
            logger.error('Failed to create Anthropic model:', error);
            throw new Error(`Failed to create Anthropic model: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    async getAvailableModels(credentials?: Record<string, any>): Promise<string[]> {
        // In a real implementation, this would fetch models from the Anthropic API
        // For now, return a static list of common models
        return [
            'claude-3-5-sonnet',
            'claude-3-opus-20240229',
            'claude-3-sonnet-20240229',
            'claude-3-haiku-20240307'
        ];
    }
    
    async validateCredentials(credentials: Record<string, any>): Promise<boolean> {
        try {
            if (!credentials.apiKey) {
                return false;
            }
            
            // Try to create a model with the credentials
            const { createAnthropic } = await import('@ai-sdk/anthropic');
            const provider = createAnthropic({ apiKey: credentials.apiKey });
            
            // Just create the provider, don't actually call the API
            // In a real implementation, you might make a test API call
            return true;
        } catch (error) {
            logger.error('Failed to validate Anthropic credentials:', error);
            return false;
        }
    }
    
    getRequiredCredentialFields(): string[] {
        return ['apiKey'];
    }
}

// Export a singleton instance
export const anthropicProvider = new AnthropicProvider();