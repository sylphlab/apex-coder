import type { LanguageModel } from 'ai';
import { BaseAIProvider } from './baseProvider';
import { logger } from '../../utils/logger';

/**
 * Azure OpenAI provider implementation
 */
export class AzureProvider extends BaseAIProvider {
    constructor() {
        super('azure');
    }
    
    async createModel(modelId: string, credentials: Record<string, any>): Promise<LanguageModel> {
        try {
            // Validate required credentials
            if (!credentials.apiKey) {
                throw new Error('API key is required for Azure OpenAI');
            }
            if (!credentials.baseUrl) {
                throw new Error('Base URL is required for Azure OpenAI');
            }
            
            // Import the Azure SDK
            const { createAzure } = await import('@ai-sdk/azure');
            
            // Prepare options
            const options: Record<string, string> = { 
                apiKey: credentials.apiKey,
                baseUrl: credentials.baseUrl
            };
            
            // Add optional deployment name if provided
            if (credentials.deploymentName) {
                options.deploymentName = credentials.deploymentName;
            }
            
            // Create the provider instance
            const provider = createAzure(options);
            
            // Return the model instance
            return provider(modelId);
        } catch (error) {
            logger.error('Failed to create Azure OpenAI model:', error);
            throw new Error(`Failed to create Azure OpenAI model: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    async getAvailableModels(credentials?: Record<string, any>): Promise<string[]> {
        // In a real implementation, this would fetch models from the Azure API
        // For now, return a static list of common models
        return [
            'gpt-4',
            'gpt-4-turbo',
            'gpt-35-turbo',
            'text-embedding-ada-002'
        ];
    }
    
    async validateCredentials(credentials: Record<string, any>): Promise<boolean> {
        try {
            if (!credentials.apiKey || !credentials.baseUrl) {
                return false;
            }
            
            // Try to create a model with the credentials
            const { createAzure } = await import('@ai-sdk/azure');
            const options: Record<string, string> = { 
                apiKey: credentials.apiKey,
                baseUrl: credentials.baseUrl
            };
            
            if (credentials.deploymentName) {
                options.deploymentName = credentials.deploymentName;
            }
            
            const provider = createAzure(options);
            
            // Just create the provider, don't actually call the API
            // In a real implementation, you might make a test API call
            return true;
        } catch (error) {
            logger.error('Failed to validate Azure OpenAI credentials:', error);
            return false;
        }
    }
    
    getRequiredCredentialFields(): string[] {
        return ['apiKey', 'baseUrl'];
    }
}

// Export a singleton instance
export const azureProvider = new AzureProvider();