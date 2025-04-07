import type { LanguageModel } from 'ai';
import { BaseAIProvider } from './baseProvider';
import { logger } from '../../utils/logger';

/**
 * Ollama provider implementation
 */
export class OllamaProvider extends BaseAIProvider {
    constructor() {
        super('ollama');
    }
    
    async createModel(modelId: string, credentials: Record<string, any>): Promise<LanguageModel> {
        try {
            // Validate required credentials
            if (!credentials.baseUrl) {
                // Default to localhost if not provided
                credentials.baseUrl = 'http://localhost:11434';
                logger.info('Using default Ollama base URL: http://localhost:11434');
            }
            
            try {
                // Try to dynamically import the Ollama provider
                // This is wrapped in a try-catch because the package might not be installed
                // Use Function constructor to avoid TypeScript error for missing module
                const dynamicImport = new Function('modulePath', 'return import(modulePath)');
                const ollamaModule = await dynamicImport('ollama-ai-provider');
                
                // Create the provider instance
                const provider = ollamaModule.createOllama({
                    baseURL: credentials.baseUrl
                });
                
                // Return the model instance
                return provider(modelId);
            } catch (importError) {
                logger.error('Failed to import Ollama provider:', importError);
                throw new Error('Ollama provider package is not installed. Please install the ollama-ai-provider package.');
            }
        } catch (error) {
            logger.error('Failed to create Ollama model:', error);
            throw new Error(`Failed to create Ollama model: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    async getAvailableModels(credentials?: Record<string, any>): Promise<string[]> {
        try {
            // Use provided baseUrl or default
            const baseUrl = credentials?.baseUrl || 'http://localhost:11434';
            
            // In a real implementation, this would fetch models from the Ollama API
            // For example:
            // const response = await fetch(`${baseUrl}/api/tags`);
            // const data = await response.json();
            // return data.models.map((model: any) => model.name);
            
            // For now, return a static list of common models
            return [
                'llama3',
                'mistral',
                'codellama',
                'phi3'
            ];
        } catch (error) {
            logger.error('Failed to fetch Ollama models:', error);
            // Return default models on error
            return ['llama3', 'mistral', 'codellama', 'phi3'];
        }
    }
    
    async validateCredentials(credentials: Record<string, any>): Promise<boolean> {
        try {
            // For Ollama, we just need to check if the baseUrl is reachable
            const baseUrl = credentials?.baseUrl || 'http://localhost:11434';
            
            // In a real implementation, you would make a test request to the Ollama API
            // For example:
            // const response = await fetch(`${baseUrl}/api/version`);
            // return response.ok;
            
            // For now, just return true if the baseUrl is provided or using default
            return true;
        } catch (error) {
            logger.error('Failed to validate Ollama credentials:', error);
            return false;
        }
    }
    
    getRequiredCredentialFields(): string[] {
        // baseUrl is optional, as we default to localhost
        return [];
    }
}

// Export a singleton instance
export const ollamaProvider = new OllamaProvider();