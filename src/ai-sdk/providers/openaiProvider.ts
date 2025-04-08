import type { LanguageModel } from 'ai';
import { BaseAIProvider } from './baseProvider.js';
import { logger } from '../../utils/logger.js';

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider extends BaseAIProvider {
  constructor() {
    super('openai');
  }

  async createModel(modelId: string, credentials: Record<string, unknown>): Promise<LanguageModel> {
    try {
      // Explicitly type credentials
      const apiKey = credentials.apiKey as string | undefined;
      const baseUrl = credentials.baseUrl as string | undefined;

      if (!apiKey) {
        throw new Error('API key is required for OpenAI');
      }

      // Import the OpenAI SDK
      const { createOpenAI } = await import('@ai-sdk/openai');

      // Prepare options with known types
      const options: { apiKey: string; baseUrl?: string } = {
        apiKey: apiKey,
      };

      if (baseUrl) {
        options.baseUrl = baseUrl;
      }

      // Create the provider instance
      const provider = createOpenAI(options);

      // Return the model instance
      return provider(modelId);
    } catch (error: unknown) {
      logger.error('Failed to create OpenAI model:', error);
      throw new Error(
        `Failed to create OpenAI model: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getAvailableModels(credentials?: Record<string, unknown>): Promise<string[]> {
    if (credentials) {
      // Validate credentials even though we don't use them for the static list
      await this.validateCredentials(credentials);
    }
    logger.info('Returning static list of OpenAI models.');
    return ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'];
  }

  async validateCredentials(credentials: Record<string, unknown>): Promise<boolean> {
    try {
      // Explicitly type credentials
      const apiKey = credentials.apiKey as string | undefined;
      const baseUrl = credentials.baseUrl as string | undefined;

      if (!apiKey) {
        return false;
      }

      // Try to create a provider instance with the credentials
      const { createOpenAI } = await import('@ai-sdk/openai');
      const options: { apiKey: string; baseUrl?: string } = { apiKey: apiKey };

      if (baseUrl) {
        options.baseUrl = baseUrl;
      }

      // Use the imported creator function directly
      createOpenAI(options);
      logger.info(`OpenAI provider initialized successfully (simulated).`);
      return true;
    } catch (error: unknown) {
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
