import type { AIProvider } from "./baseProvider";
import { googleAIProvider } from "./googleProvider";
import { openAIProvider } from "./openaiProvider";
import { anthropicProvider } from "./anthropicProvider";
import { ollamaProvider } from "./ollamaProvider";
import { mistralProvider } from "./mistralProvider";
import { azureProvider } from "./azureProvider";
import { cohereProvider } from "./cohereProvider";
import { deepseekProvider } from "./deepseekProvider";

// Map of provider ID to provider instance
const providers: Record<string, AIProvider> = {
  googleai: googleAIProvider,
  openai: openAIProvider,
  anthropic: anthropicProvider,
  ollama: ollamaProvider,
  mistral: mistralProvider,
  azure: azureProvider,
  cohere: cohereProvider,
  deepseek: deepseekProvider,
};

/**
 * Get a provider by ID
 * @param providerId The provider ID
 * @returns The provider instance or undefined if not found
 */
export function getProvider(providerId: string): AIProvider | undefined {
  return providers[providerId.toLowerCase()];
}

/**
 * Get all available providers
 * @returns Array of provider instances
 */
export function getAllProviders(): AIProvider[] {
  return Object.values(providers);
}

/**
 * Register a new provider
 * @param providerId The provider ID
 * @param provider The provider instance
 */
export function registerProvider(
  providerId: string,
  provider: AIProvider,
): void {
  providers[providerId.toLowerCase()] = provider;
}

// Export all providers
export {
  googleAIProvider,
  openAIProvider,
  anthropicProvider,
  ollamaProvider,
  mistralProvider,
  azureProvider,
  cohereProvider,
  deepseekProvider,
};

// Export provider interfaces
export * from "./baseProvider";
