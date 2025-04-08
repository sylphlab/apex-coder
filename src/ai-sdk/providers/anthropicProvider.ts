import type { LanguageModel } from "ai";
import { BaseAIProvider } from "./baseProvider";
import { logger } from "../../utils/logger";

/**
 * Anthropic (Claude) provider implementation
 */
export class AnthropicProvider extends BaseAIProvider {
  constructor() {
    super("anthropic");
  }

  async createModel(
    modelId: string,
    credentials: Record<string, unknown>,
  ): Promise<LanguageModel> {
    try {
      // Explicitly type apiKey
      const apiKey = credentials.apiKey as string | undefined;
      if (!apiKey) {
        throw new Error("API key is required for Anthropic");
      }

      // Import the Anthropic SDK
      const { createAnthropic } = await import("@ai-sdk/anthropic");

      // Create the provider instance
      const provider = createAnthropic({
        apiKey: apiKey,
      });

      // Return the model instance
      return provider(modelId);
    } catch (error: unknown) {
      logger.error("Failed to create Anthropic model:", error);
      throw new Error(
        `Failed to create Anthropic model: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Keeping async to match BaseAIProvider interface, even if currently static
  // eslint-disable-next-line @typescript-eslint/require-await
  async getAvailableModels(
    _credentials?: Record<string, unknown>,
  ): Promise<string[]> {
    logger.info("Returning static list of Anthropic models.");
    return [
      "claude-3-5-sonnet-20240620",
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307",
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
      const { createAnthropic } = await import("@ai-sdk/anthropic");
      // Assign to underscore variable as it's not used beyond creation check
      const _provider = createAnthropic({ apiKey: apiKey });

      // Just creating the provider instance is a basic check
      return true;
    } catch (error: unknown) {
      logger.error("Failed to validate Anthropic credentials:", error);
      return false;
    }
  }

  getRequiredCredentialFields(): string[] {
    return ["apiKey"];
  }
}

// Export a singleton instance
export const anthropicProvider = new AnthropicProvider();
