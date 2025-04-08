import { logger } from "../utils/logger";
import {
  getModelsForProvider as fetchModelsFromConfig,
  getSupportedProviders,
} from "./configLoader";

/**
 * Interface for model information
 */
export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  // Add other model properties as needed
}

/**
 * Interface for provider details with models
 */
export interface ProviderDetails {
  id: string;
  name: string;
  requiresApiKey: boolean;
  requiresBaseUrl: boolean;
  allowCustomModel: boolean;
  models: ModelInfo[];
  isConfigured?: boolean;
  isWorking?: boolean;
}

// Define type for Ollama API model response
interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
  // Add other fields if needed
}

/**
 * Formats file size in bytes to human-readable format.
 */
function formatSize(bytes: number): string {
  if (bytes < 0) return "0 B";
  if (bytes < 1024) return `${String(bytes)} B`; // Convert bytes to string
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const sizeIndex = Math.max(
    0,
    Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1),
  );
  const formattedSize = parseFloat(
    (bytes / Math.pow(k, sizeIndex)).toFixed(2),
  );
  return `${formattedSize.toLocaleString()} ${sizes[sizeIndex]}`;
}

/**
 * Format a model ID into a display name
 * @param modelId The model ID
 */
function formatModelName(modelId: string): string {
  const cleanId = modelId.replace(/^models\//, "");
  const spacedId = cleanId.replace(/[-_]/g, " ");
  return spacedId.replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Get display name for a provider
 */
function getProviderDisplayName(providerId: string): string {
  const displayNames: Record<string, string> = {
    googleai: "Google AI (Gemini)",
    openai: "OpenAI (GPT)",
    anthropic: "Anthropic (Claude)",
    ollama: "Ollama (Local)",
    deepseek: "DeepSeek",
    vertexai: "Google Vertex AI",
    cohere: "Cohere",
    mistral: "Mistral AI",
    perplexity: "Perplexity AI",
    replicate: "Replicate",
    aws: "AWS Bedrock",
    bedrock: "AWS Bedrock",
    azure: "Azure OpenAI",
    groq: "Groq",
    chromeai: "Chrome AI",
    openrouter: "OpenRouter",
  };
  return displayNames[providerId] || providerId;
}

/**
 * Check if a provider allows custom model IDs
 */
function allowsCustomModel(providerId: string): boolean {
  return ["ollama", "replicate"].includes(providerId.toLowerCase());
}

/**
 * Get default models for a provider (Internal helper)
 * @param providerId The provider ID
 */
function getDefaultModels(providerId: string): ModelInfo[] {
  switch (providerId) {
    case "ollama":
      return [
        { id: "llama3", name: "Llama 3" },
        { id: "mistral", name: "Mistral" },
        { id: "codellama", name: "Code Llama" },
        { id: "phi3", name: "Phi-3" },
      ];
    default:
      return [];
  }
}

/**
 * Fetches models from Ollama API.
 * @param baseUrl The Ollama base URL
 */
async function fetchOllamaModels(baseUrl: string): Promise<ModelInfo[]> {
  try {
    const normalizedBaseUrl = baseUrl.endsWith("/")
      ? baseUrl.slice(0, -1)
      : baseUrl;
    const response = await fetch(`${normalizedBaseUrl}/api/tags`);

    if (response.ok) {
      const data = (await response.json()) as { models: OllamaModel[] };
      if (Array.isArray(data.models)) {
        return data.models.map((model) => ({
          id: model.name,
          name: model.name,
          description: `Size: ${formatSize(model.size)}`,
        }));
      }
      logger.warn(
        "Ollama API response missing or malformed models array, using defaults",
      );
    } else {
      logger.warn(
        `Ollama API request failed with status ${response.status}, using defaults`,
      );
    }
    return getDefaultModels("ollama"); // Fallback
  } catch (error: unknown) {
    logger.error("Error fetching Ollama models:", error);
    return getDefaultModels("ollama"); // Fallback on fetch error
  }
}

/**
 * Get all supported providers with their details.
 */
export function getAllProviders(): ProviderDetails[] {
  try {
    const providers = getSupportedProviders();
    return providers.map((provider) => ({
      id: provider.id,
      name: getProviderDisplayName(provider.id),
      requiresApiKey: provider.requiredCredentials.includes("apiKey"),
      requiresBaseUrl: provider.requiredCredentials.includes("baseUrl"),
      allowCustomModel: allowsCustomModel(provider.id),
      models: [], // Models fetched on demand
    }));
  } catch (error: unknown) {
    logger.error("Error getting providers:", error);
    throw new Error(
      `Failed to get providers: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Gets models for a specific provider.
 * @param providerId The provider ID
 * @param credentials Optional credentials (like baseUrl for Ollama)
 */
export async function getModelsForProviderDetails(
  providerId: string,
  credentials?: Record<string, unknown>,
): Promise<ModelInfo[]> {
  try {
    const providerLower = providerId.toLowerCase();
    const baseUrl = credentials?.baseUrl as string | undefined;

    if (providerLower === "ollama" && baseUrl) {
      return await fetchOllamaModels(baseUrl);
    }

    // Fetch models from configLoader for other providers
    const modelIds = await fetchModelsFromConfig(providerLower, credentials);
    return modelIds.map((id) => ({
      id,
      name: formatModelName(id),
    }));
  } catch (error: unknown) {
    logger.error(`Error getting models for provider ${providerId}:`, error);
    throw new Error(
      `Failed to get models for provider ${providerId}: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
