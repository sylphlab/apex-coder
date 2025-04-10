import type { LanguageModel } from 'ai';
import { logger } from '../utils/logger.js';
import { getProvider, getAllProviders } from './providers/index.js';

// Define the expected configuration structure
export interface AiConfig {
  provider: string;
  modelId?: string;
  credentials: Record<string, unknown>;
}

// Store the initialized model instance and config
let languageModelInstance: LanguageModel | undefined = undefined;
let currentConfig: AiConfig | undefined = undefined;

// Cache for available models by provider
const modelCache: Record<string, string[]> = {};

/**
 * Initialize an AI model based on the provided configuration
 * @param config The AI configuration
 */
export async function initializeAiSdkModel(config: AiConfig): Promise<void> {
  const providerLower = config.provider.toLowerCase();
  const modelId = config.modelId ?? '';

  logger.info(`Initializing AI SDK for provider: ${providerLower} with model: ${modelId}`);

  // Reset model instance and config
  languageModelInstance = undefined;
  currentConfig = undefined;

  // Check if model ID is provided
  if (!modelId) {
    logger.warn(
      `No model ID specified for provider: ${providerLower}. User will need to select a model.`,
    );
    currentConfig = config; // Save config even without modelId
    return;
  }

  try {
    // Get the provider
    const provider = getProvider(providerLower);
    if (!provider) {
      throw new Error(`Unsupported AI provider: ${providerLower}`);
    }

    // Set config only after provider validation
    currentConfig = config;

    // Create the model
    languageModelInstance = await provider.createModel(modelId, config.credentials);

    logger.info(`AI SDK Model initialized successfully: ${providerLower}/${modelId}`);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(
      `Failed to initialize AI SDK Model for provider ${providerLower}:`,
      errorMessage,
      error,
    );
    languageModelInstance = undefined;
    // Re-throw a more specific error or the original one
    throw new Error(`AI SDK Model initialization failed for ${providerLower}: ${errorMessage}`);
  }
}

/**
 * Get the initialized language model
 * @returns The initialized language model
 * @throws Error if the model is not initialized
 */
export function getLanguageModel(): LanguageModel {
  if (!languageModelInstance) {
    throw new Error('AI SDK Model has not been initialized. Call initializeAiSdkModel first.');
  }
  return languageModelInstance;
}

/**
 * Get the current AI configuration
 * @returns The current AI configuration or null if not initialized
 */
export function getCurrentAiConfig(): AiConfig | undefined {
  return currentConfig;
}

/**
 * Reset the AI SDK model and configuration
 */
export function resetAiSdkModel(): void {
  logger.info('Resetting AI SDK Model and configuration.');
  languageModelInstance = undefined;
  currentConfig = undefined;
}

/**
 * Get available models for a provider
 * @param providerId The provider ID
 * @param credentials Optional credentials for providers that require them to list models
 * @param forceRefresh Whether to force a refresh of the cached models
 * @returns Array of available model IDs
 */
export async function getModelsForProvider(
  providerId: string,
  credentials?: Record<string, unknown>,
  forceRefresh = false,
): Promise<string[]> {
  const providerLower = providerId.toLowerCase();

  // Return cached models if available and not forcing refresh
  if (!forceRefresh && providerLower in modelCache) {
    return modelCache[providerLower];
  }

  try {
    // Get the provider
    const provider = getProvider(providerLower);
    if (!provider) {
      throw new Error(`Unsupported AI provider: ${providerLower}`);
    }

    // Get available models
    const models = await provider.getAvailableModels(credentials);

    // Cache the models
    modelCache[providerLower] = models;

    return models;
  } catch (error: unknown) {
    logger.error(`Failed to get models for provider ${providerLower}:`, error);
    return [];
  }
}

/**
 * Get information about all supported providers
 * @returns Array of provider information
 */
export function getSupportedProviders(): {
  id: string;
  name: string;
  requiredCredentials: string[];
}[] {
  return getAllProviders().map((provider) => ({
    id: provider.getName().toLowerCase(),
    name: provider.getName(),
    requiredCredentials: provider.getRequiredCredentialFields(),
  }));
}

/**
 * Validate credentials for a provider
 * @param providerId The provider ID
 * @param credentials The credentials to validate
 * @returns Whether the credentials are valid
 */
export async function validateProviderCredentials(
  providerId: string,
  credentials: Record<string, unknown>,
): Promise<boolean> {
  try {
    const provider = getProvider(providerId.toLowerCase());
    if (!provider) {
      throw new Error(`Unsupported AI provider: ${providerId}`);
    }

    return await provider.validateCredentials(credentials);
  } catch (error: unknown) {
    logger.error(`Failed to validate credentials for provider ${providerId}:`, error);
    return false;
  }
}
