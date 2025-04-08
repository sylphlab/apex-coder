import type { LanguageModel } from "ai";
import { BaseAIProvider } from "./baseProvider";
import { logger } from "../../utils/logger";

/**
 * Ollama provider implementation
 */
export class OllamaProvider extends BaseAIProvider {
  private readonly defaultBaseUrl = "http://localhost:11434";

  constructor() {
    super("ollama");
  }

  async createModel(
    modelId: string,
    credentials: Record<string, unknown>,
  ): Promise<LanguageModel> {
    const baseUrl =
      (credentials.baseUrl as string | undefined) ?? this.defaultBaseUrl;
    logger.info(`Using Ollama base URL: ${baseUrl}`);

    try {
      const { createOllama } = await import("ollama-ai-provider");

      if (typeof createOllama !== "function") {
        throw new Error(
          "createOllama function not found in ollama-ai-provider module.",
        );
      }

      const provider = createOllama({
        baseURL: baseUrl,
      });

      return provider(modelId);
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "MODULE_NOT_FOUND"
      ) {
        logger.error(
          "Ollama provider package 'ollama-ai-provider' is not installed.",
          error,
        );
        throw new Error(
          "Ollama provider package is not installed. Please run `pnpm add ollama-ai-provider`.",
        );
      }
      logger.error("Failed to create Ollama model:", errorMsg, error);
      throw new Error(`Failed to create Ollama model: ${errorMsg}`);
    }
  }

  // getAvailableModels should ideally use the logic from ProviderService
  // but keeping static list for now as ProviderService needs refactoring
  // Keeping async to match BaseAIProvider interface, even if currently static
  // eslint-disable-next-line @typescript-eslint/require-await
  async getAvailableModels(
    _credentials?: Record<string, unknown>,
  ): Promise<string[]> {
    logger.warn(
      "Returning static list for Ollama models. Dynamic fetching via ProviderService is preferred.",
    );
    return ["llama3", "mistral", "codellama", "phi3"];
  }

  async validateCredentials(
    credentials: Record<string, unknown>,
  ): Promise<boolean> {
    const baseUrl =
      (credentials.baseUrl as string | undefined) ?? this.defaultBaseUrl;
    logger.info(`Validating Ollama credentials with base URL: ${baseUrl}`);

    try {
      const response = await fetch(`${baseUrl}/api/tags`);
      return response.ok;
    } catch (error: unknown) {
      logger.error(
        `Failed to validate Ollama credentials at ${baseUrl}:`,
        error,
      );
      return false;
    }
  }

  getRequiredCredentialFields(): string[] {
    return [];
  }
}

export const ollamaProvider = new OllamaProvider();
