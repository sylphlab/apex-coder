import { vscode } from '../vscode.ts';

/**
 * Interface for model information
 */
export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
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

/**
 * Service for fetching provider and model information from the extension
 */
export class ProviderService {
  private static providers: ProviderDetails[] = [];
  private static modelCache: Record<string, ModelInfo[]> = {};

  /**
   * Get all available providers
   */
  public static async getAllProviders(): Promise<ProviderDetails[]> {
    return new Promise((resolve, reject) => {
      // If we already have providers cached, return them
      if (this.providers.length > 0) {
        resolve(this.providers);
        return;
      }

      // Set up a one-time message handler for the response
      const messageHandler = (event: MessageEvent) => {
        const message = event.data;
        if (message.command === 'providersResult') {
          // Remove the event listener
          window.removeEventListener('message', messageHandler);

          // Cache and return the providers
          this.providers = message.payload.providers || [];
          resolve(this.providers);
        } else if (message.command === 'error') {
          // Check if this error is related to our request
          const payload = message.payload || {};
          const errorSource = typeof payload === 'object' ? payload.source : null;
          const errorMessage = typeof payload === 'object' ? payload.message : payload;

          if (errorSource === 'getProviders') {
            // Remove the event listener
            window.removeEventListener('message', messageHandler);

            reject(new Error(errorMessage || 'Failed to get providers'));
          }
        }
      };

      // Add the event listener
      window.addEventListener('message', messageHandler);

      // Send the request to the extension
      vscode.postMessage({ command: 'getProviders' });

      // Set a timeout to reject the promise if we don't get a response
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        reject(new Error('Timeout waiting for providers'));
      }, 5000);
    });
  }

  /**
   * Get models for a specific provider
   * @param providerId The provider ID
   * @param forceRefresh Whether to force a refresh from the server
   */
  public static async getModelsForProvider(
    providerId: string,
    forceRefresh = false,
  ): Promise<ModelInfo[]> {
    return new Promise((resolve, reject) => {
      // If we have models cached for this provider and don't need to refresh, return them
      if (!forceRefresh && this.modelCache[providerId]) {
        resolve(this.modelCache[providerId]);
        return;
      }

      // Set up a one-time message handler for the response
      const messageHandler = (event: MessageEvent) => {
        const message = event.data;
        if (message.command === 'modelsResult' && message.payload?.providerId === providerId) {
          // Remove the event listener
          window.removeEventListener('message', messageHandler);

          // Cache and return the models
          this.modelCache[providerId] = message.payload.models || [];
          resolve(this.modelCache[providerId]);
        } else if (message.command === 'error') {
          // Check if this error is related to our request
          const payload = message.payload || {};
          const errorSource = typeof payload === 'object' ? payload.source : null;
          const errorMessage = typeof payload === 'object' ? payload.message : payload;

          if (errorSource === 'getModelsForProvider') {
            // Remove the event listener
            window.removeEventListener('message', messageHandler);

            reject(new Error(errorMessage || `Failed to get models for provider ${providerId}`));
          }
        }
      };

      // Add the event listener
      window.addEventListener('message', messageHandler);

      // Send the request to the extension
      vscode.postMessage({
        command: 'getModelsForProvider',
        payload: { providerId },
      });

      // Set a timeout to reject the promise if we don't get a response
      setTimeout(() => {
        window.removeEventListener('message', messageHandler);
        reject(new Error(`Timeout waiting for models for provider ${providerId}`));
      }, 5000);
    });
  }

  /**
   * Clear the provider and model cache
   */
  public static clearCache(): void {
    this.providers = [];
    this.modelCache = {};
  }
}
