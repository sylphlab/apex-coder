import type { LanguageModel } from 'ai';
import { BaseAIProvider } from './baseProvider.js';
import { logger } from '../../utils/logger.js';

/**
 * Google AI (Gemini) provider implementation
 */
export class GoogleAIProvider extends BaseAIProvider {
  constructor() {
    super('googleai');
  }

  async createModel(modelId: string, credentials: Record<string, unknown>): Promise<LanguageModel> {
    try {
      // Explicitly type apiKey
      const apiKey = credentials.apiKey as string | undefined;
      if (!apiKey) {
        throw new Error('API key is required for Google AI');
      }

      // Import the Google AI SDK
      const { createGoogleGenerativeAI } = await import('@ai-sdk/google');

      // Create the provider instance
      const provider = createGoogleGenerativeAI({
        apiKey: apiKey,
      });

      // Return the model instance
      return provider(modelId);
    } catch (error: unknown) {
      logger.error('Failed to create Google AI model:', error);
      throw new Error(
        `Failed to create Google AI model: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async getAvailableModels(credentials?: Record<string, unknown>): Promise<string[]> {
    if (credentials) {
      // Validate credentials even though we don't use them for the static list
      await this.validateCredentials(credentials);
    }
    logger.info('Returning static list of Google AI models.');
    return [
      'gemini-1.5-flash',
      'gemini-1.5-pro',
      'gemini-pro',
      // Add other known models if necessary
    ];
  }

  async validateCredentials(credentials: Record<string, unknown>): Promise<boolean> {
    try {
      // Explicitly type apiKey
      const apiKey = credentials.apiKey as string | undefined;
      if (!apiKey) {
        return false;
      }

      // Try to create a provider instance with the credentials
      const { createGoogleGenerativeAI } = await import('@ai-sdk/google');

      // Use the imported creator function directly
      createGoogleGenerativeAI({ apiKey: apiKey });
      logger.info(`Google AI provider initialized successfully (simulated).`);
      return true;
    } catch (error: unknown) {
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
