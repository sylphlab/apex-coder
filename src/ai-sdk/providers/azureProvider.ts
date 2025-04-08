import type { LanguageModel } from "ai";
import { BaseAIProvider } from "./baseProvider";
import { logger } from "../../utils/logger";

/**
 * Azure OpenAI provider implementation
 */
export class AzureProvider extends BaseAIProvider {
  constructor() {
    super("azure");
  }

  async createModel(
    modelId: string,
    credentials: Record<string, unknown>,
  ): Promise<LanguageModel> {
    try {
      // Explicitly type credentials
      const apiKey = credentials.apiKey as string | undefined;
      const baseUrl = credentials.baseUrl as string | undefined;
      const deploymentName = credentials.deploymentName as string | undefined;

      if (!apiKey) {
        throw new Error("API key is required for Azure OpenAI");
      }
      if (!baseUrl) {
        throw new Error("Base URL is required for Azure OpenAI");
      }

      // Import the Azure SDK
      const { createAzure } = await import("@ai-sdk/azure");

      // Prepare options with known types
      const options: {
        apiKey: string;
        baseUrl: string;
        deploymentName?: string;
      } = {
        apiKey: apiKey,
        baseUrl: baseUrl,
      };

      if (deploymentName) {
        options.deploymentName = deploymentName;
      }

      // Create the provider instance
      const provider = createAzure(options);

      // Return the model instance
      return provider(modelId);
    } catch (error: unknown) {
      logger.error("Failed to create Azure OpenAI model:", error);
      throw new Error(
        `Failed to create Azure OpenAI model: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  // Keeping async to match BaseAIProvider interface, even if currently static
  // eslint-disable-next-line @typescript-eslint/require-await
  async getAvailableModels(
    _credentials?: Record<string, unknown>,
  ): Promise<string[]> {
    logger.info("Returning static list of Azure OpenAI models.");
    return [
      "gpt-4o",
      "gpt-4",
      "gpt-4-turbo",
      "gpt-35-turbo",
      "text-embedding-ada-002",
    ];
  }

  async validateCredentials(
    credentials: Record<string, unknown>,
  ): Promise<boolean> {
    try {
      // Explicitly type credentials
      const apiKey = credentials.apiKey as string | undefined;
      const baseUrl = credentials.baseUrl as string | undefined;
      const deploymentName = credentials.deploymentName as string | undefined;

      if (!apiKey || !baseUrl) {
        return false;
      }

      // Try to create a provider instance with the credentials
      const { createAzure } = await import("@ai-sdk/azure");
      const options: {
        apiKey: string;
        baseUrl: string;
        deploymentName?: string;
      } = {
        apiKey: apiKey,
        baseUrl: baseUrl,
      };

      if (deploymentName) {
        options.deploymentName = deploymentName;
      }

      const _provider = createAzure(options);

      // Just creating the provider instance is a basic check
      return true;
    } catch (error: unknown) {
      logger.error("Failed to validate Azure OpenAI credentials:", error);
      return false;
    }
  }

  getRequiredCredentialFields(): string[] {
    return ["apiKey", "baseUrl"];
  }
}

// Export a singleton instance
export const azureProvider = new AzureProvider();
