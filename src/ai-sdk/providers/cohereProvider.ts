import type { LanguageModel } from "ai";
import { BaseAIProvider } from "./baseProvider";
import { logger } from "../../utils/logger";

/**
 * Cohere provider implementation
 */
export class CohereProvider extends BaseAIProvider {
  constructor() {
    super("cohere");
  }

  async createModel(
    modelId: string,
    credentials: Record<string, unknown>,
  ): Promise<LanguageModel> {
    try {
      // Explicitly type apiKey
      const apiKey = credentials.apiKey as string | undefined;
      if (!apiKey) {
        throw new Error("API key is required for Cohere");
      }

      // Import the Cohere SDK
      const { createCohere } = await import("@ai-sdk/cohere");

      // Create the provider instance
      const provider = createCohere({
        apiKey: apiKey,
      });

      // Return the model instance
      return provider(modelId);
    } catch (error: unknown) {
      logger.error("Failed to create Cohere model:", error);
      throw new Error(
        `Failed to create Cohere model: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Keeping async to match BaseAIProvider interface, even if currently static
  // eslint-disable-next-line @typescript-eslint/require-await
  async getAvailableModels(
    _credentials?: Record<string, unknown>,
  ): Promise<string[]> {
    logger.info("Returning static list of Cohere models.");
    return ["command", "command-light", "command-r", "command-r-plus"];
  }

  async validateCredentials(
    credentials: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      // Explicitly type apiKey
      const apiKey = credentials.apiKey as string | undefined;
      if (!apiKey) {
        return false;
      }

      // Try to create a provider instance with the credentials
      const { createCohere } = await import("@ai-sdk/cohere");
      // Assign to underscore variable as it's not used beyond creation check
      const _provider = createCohere({ apiKey: apiKey });

      // Just creating the provider instance is a basic check
      return true;
    } catch (error: unknown) {
      logger.error("Failed to validate Cohere credentials:", error);
      return false;
    }
  }

  getRequiredCredentialFields(): string[] {
    return ["apiKey"];
  }
}

// Export a singleton instance
export const cohereProvider = new CohereProvider();
