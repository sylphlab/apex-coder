import type { LanguageModel } from "ai";
import { BaseAIProvider } from "./baseProvider";
import { logger } from "../../utils/logger";

/**
 * DeepSeek provider implementation
 */
export class DeepSeekProvider extends BaseAIProvider {
  constructor() {
    super("deepseek");
  }

  async createModel(
    modelId: string,
    credentials: Record<string, unknown>,
  ): Promise<LanguageModel> {
    try {
      // Explicitly type apiKey
      const apiKey = credentials.apiKey as string | undefined;
      if (!apiKey) {
        throw new Error("API key is required for DeepSeek");
      }

      // Import the DeepSeek SDK
      const { createDeepSeek } = await import("@ai-sdk/deepseek");

      // Create the provider instance
      const provider = createDeepSeek({
        apiKey: apiKey,
      });

      // Return the model instance
      return provider(modelId);
    } catch (error: unknown) {
      logger.error("Failed to create DeepSeek model:", error);
      throw new Error(
        `Failed to create DeepSeek model: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Keeping async to match BaseAIProvider interface, even if currently static
  // eslint-disable-next-line @typescript-eslint/require-await
  async getAvailableModels(
    _credentials?: Record<string, unknown>,
  ): Promise<string[]> {
    logger.info("Returning static list of DeepSeek models.");
    // For now, return a static list of common models
    return [
      "deepseek-chat",
      "deepseek-coder",
      "deepseek-llm-67b",
      "deepseek-math",
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
      const { createDeepSeek } = await import("@ai-sdk/deepseek");

      // Use the imported creator function directly
      createDeepSeek({ apiKey: apiKey });
      logger.info(`DeepSeek provider initialized successfully (simulated).`);
      return true;
    } catch (error: unknown) {
      logger.error("Failed to validate DeepSeek credentials:", error);
      return false;
    }
  }

  getRequiredCredentialFields(): string[] {
    return ["apiKey"];
  }
}

// Export a singleton instance
export const deepseekProvider = new DeepSeekProvider();
