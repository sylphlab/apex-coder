import type { LanguageModel } from 'ai';
import { BaseAIProvider } from './baseProvider.js';
import { logger } from '../../utils/logger.js';

/**
 * Cohere provider implementation
 */
export class CohereProvider extends BaseAIProvider {
  constructor() {
    super('cohere');
  }

  async createModel(modelId: string, credentials: Record<string, unknown>): Promise<LanguageModel> {
    try {
      // Explicitly type apiKey
      const apiKey = credentials.apiKey as string | undefined;
      if (!apiKey) {
        throw new Error('API key is required for Cohere');
      }

      // Import the Cohere SDK
      const { createCohere } = await import('@ai-sdk/cohere');

      // Create the provider instance
      const provider = createCohere({
        apiKey: apiKey,
      });

      // Return the model instance
      return provider(modelId);
    } catch (error: unknown) {
      logger.error('Failed to create Cohere model:', error);
      throw new Error(
        `Failed to create Cohere model: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getAvailableModels(credentials?: Record<string, unknown>): Promise<string[]> {
    if (credentials) {
      // Validate credentials even though we don't use them for the static list
      await this.validateCredentials(credentials);
    }
    logger.info('Returning static list of Cohere models.');
    return ['command', 'command-light', 'command-r', 'command-r-plus'];
  }

  async validateCredentials(credentials: Record<string, unknown>): Promise<boolean> {
    try {
      // Explicitly type apiKey
      const apiKey = credentials.apiKey as string | undefined;
      if (!apiKey) {
        return false;
      }

      // Try to create a provider instance with the credentials
      const { createCohere } = await import('@ai-sdk/cohere');

      // Use the imported creator function directly
      createCohere({ apiKey: apiKey });
      logger.info(`Cohere provider initialized successfully (simulated).`);
      return true;
    } catch (error: unknown) {
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
