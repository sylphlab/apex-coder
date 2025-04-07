import type { LanguageModel } from 'ai';
import { BaseAIProvider } from './baseProvider';
import { logger } from '../../utils/logger';

/**
 * DeepSeek provider implementation
 */
export class DeepSeekProvider extends BaseAIProvider {
    constructor() {
        super('deepseek');
    }
    
    async createModel(modelId: string, credentials: Record<string, any>): Promise<LanguageModel> {
        try {
            // Validate required credentials
            if (!credentials.apiKey) {
                throw new Error('API key is required for DeepSeek');
            }
            
            // Import the DeepSeek SDK
            const { createDeepSeek } = await import('@ai-sdk/deepseek');
            
            // Create the provider instance
            const provider = createDeepSeek({ 
                apiKey: credentials.apiKey 
            });
            
            // Return the model instance
            return provider(modelId);
        } catch (error) {
            logger.error('Failed to create DeepSeek model:', error);
            throw new Error(`Failed to create DeepSeek model: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    async getAvailableModels(credentials?: Record<string, any>): Promise<string[]> {
        // In a real implementation, this would fetch models from the DeepSeek API
        // For now, return a static list of common models
        return [
            'deepseek-chat',
            'deepseek-coder',
            'deepseek-llm-67b',
            'deepseek-math'
        ];
    }
    
    async validateCredentials(credentials: Record<string, any>): Promise<boolean> {
        try {
            if (!credentials.apiKey) {
                return false;
            }
            
            // Try to create a model with the credentials
            const { createDeepSeek } = await import('@ai-sdk/deepseek');
            const provider = createDeepSeek({ apiKey: credentials.apiKey });
            
            // Just create the provider, don't actually call the API
            // In a real implementation, you might make a test API call
            return true;
        } catch (error) {
            logger.error('Failed to validate DeepSeek credentials:', error);
            return false;
        }
    }
    
    getRequiredCredentialFields(): string[] {
        return ['apiKey'];
    }
}

// Export a singleton instance
export const deepseekProvider = new DeepSeekProvider();