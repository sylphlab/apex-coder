import type { LanguageModel } from "ai";
import { BaseAIProvider } from "./baseProvider";
import { logger } from "../../utils/logger";

/**
 * OpenAI provider implementation
 */
export class OpenAIProvider extends BaseAIProvider {
  constructor() {
    super("openai");
  }

  async createModel(
    modelId: string,
    credentials: Record<string, unknown>,
  ): Promise<LanguageModel> {
    try {
      // Explicitly type credentials
      const apiKey = credentials.apiKey as string | undefined;
      const baseUrl = credentials.baseUrl as string | undefined;

      if (!apiKey) {
        throw new Error("API key is required for OpenAI");
      }

      // Import the OpenAI SDK
      const { createOpenAI } = await import("@ai-sdk/openai");

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
      logger.error("Failed to create OpenAI model:", error);
      throw new Error(
        `Failed to create OpenAI model: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Keeping async to match BaseAIProvider interface, even if currently static
  // eslint-disable-next-line @typescript-eslint/require-await
  async getAvailableModels(
    _credentials?: Record<string, unknown>,
  ): Promise<string[]> {
    logger.info("Returning static list of OpenAI models.");
    return ["gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"];
  }

  async validateCredentials(
    credentials: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      // Explicitly type credentials
      const apiKey = credentials.apiKey as string | undefined;
      const baseUrl = credentials.baseUrl as string | undefined;

      if (!apiKey) {
        return false;
      }

      // Try to create a provider instance with the credentials
      const { createOpenAI } = await import("@ai-sdk/openai");
      const options: { apiKey: string; baseUrl?: string } = { apiKey: apiKey };

      if (baseUrl) {
        options.baseUrl = baseUrl;
      }

      // Assign to underscore variable as it's not used beyond creation check
      const _provider = createOpenAI(options);

      // Just creating the provider instance is a basic check
      return true;
    } catch (error: unknown) {
      logger.error("Failed to validate OpenAI credentials:", error);
      return false;
    }
  }

  getRequiredCredentialFields(): string[] {
    return ["apiKey"];
  }
}

// Export a singleton instance
export const openAIProvider = new OpenAIProvider();
