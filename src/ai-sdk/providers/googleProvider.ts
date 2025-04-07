import type { LanguageModel } from 'ai';
import { BaseAIProvider } from './baseProvider';
import { logger } from '../../utils/logger';

/**
 * Google AI (Gemini) provider implementation
 */
export class GoogleAIProvider extends BaseAIProvider {
    constructor() {
        super('googleai');
    }
    
    async createModel(modelId: string, credentials: Record<string, any>): Promise<LanguageModel> {
        try {
            // Validate required credentials
            if (!credentials.apiKey) {
                throw new Error('API key is required for Google AI');
            }
            
            // Import the Google AI SDK
            const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
            
            // Create the provider instance
            const provider = createGoogleGenerativeAI({ 
                apiKey: credentials.apiKey 
            });
            
            // Return the model instance
            return provider(modelId);
        } catch (error) {
            logger.error('Failed to create Google AI model:', error);
            throw new Error(`Failed to create Google AI model: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    async getAvailableModels(credentials?: Record<string, any>): Promise<string[]> {
        // In a real implementation, this would fetch models from the Google AI API
        // For now, return a static list of common models
        return [
            'gemini-1.5-flash',
            'gemini-1.5-pro',
            'gemini-1.5-flash-8b',
            'gemini-2.0-flash',
            'gemini-2.0-flash-lite',
            'gemini-2.5-pro-preview-03-25'
        ];
    }
    
    async validateCredentials(credentials: Record<string, any>): Promise<boolean> {
        try {
            if (!credentials.apiKey) {
                return false;
            }
            
            // Try to create a model with the credentials
            const { createGoogleGenerativeAI } = await import('@ai-sdk/google');
            const provider = createGoogleGenerativeAI({ apiKey: credentials.apiKey });
            
            // Just create the provider, don't actually call the API
            // In a real implementation, you might make a test API call
            return true;
        } catch (error) {
            logger.error('Failed to validate Google AI credentials:', error);
            return false;
        }
    }
    
    getRequiredCredentialFields(): string[] {
        return ['apiKey'];
    }
}

// Export a singleton instance
export const googleAIProvider = new GoogleAIProvider();