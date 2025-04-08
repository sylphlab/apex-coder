import type { LanguageModel } from "ai";
import { BaseAIProvider } from "./baseProvider";
import { logger } from "../../utils/logger";

/**
 * Mistral AI provider implementation
 */
export class MistralProvider extends BaseAIProvider {
  constructor() {
    super("mistral");
  }

  async createModel(
    modelId: string,
    credentials: Record<string, unknown>,
  ): Promise<LanguageModel> {
    try {
      // Explicitly type apiKey
      const apiKey = credentials.apiKey as string | undefined;
      if (!apiKey) {
        throw new Error("API key is required for Mistral AI");
      }

      // Import the Mistral SDK
      const { createMistral } = await import("@ai-sdk/mistral");

      // Create the provider instance
      const provider = createMistral({
        apiKey: apiKey,
      });

      // Return the model instance
      return provider(modelId);
    } catch (error: unknown) {
      logger.error("Failed to create Mistral AI model:", error);
      throw new Error(
        `Failed to create Mistral AI model: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Keeping async to match BaseAIProvider interface, even if currently static
  // eslint-disable-next-line @typescript-eslint/require-await
  async getAvailableModels(
    _credentials?: Record<string, unknown>,
  ): Promise<string[]> {
    logger.info("Returning static list of Mistral AI models.");
    return [
      "mistral-large-latest",
      "mistral-medium-latest",
      "mistral-small-latest",
      "open-mistral-7b",
      "open-mixtral-8x7b",
    ];
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
      const { createMistral } = await import("@ai-sdk/mistral");
      // Assign to underscore variable as it's not used beyond creation check
      const _provider = createMistral({ apiKey: apiKey });

      // Just creating the provider instance is a basic check
      return true;
    } catch (error: unknown) {
      logger.error("Failed to validate Mistral AI credentials:", error);
      return false;
    }
  }

  getRequiredCredentialFields(): string[] {
    return ["apiKey"];
  }
}

// Export a singleton instance
export const mistralProvider = new MistralProvider();
