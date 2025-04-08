import * as vscode from "vscode";
import { getWebviewContent } from "./contentProvider";
import { logger } from "../utils/logger";
import type { AiConfig } from "../ai-sdk/configLoader";
import {
  getCurrentAiConfig,
  getLanguageModel,
  initializeAiSdkModel,
  resetAiSdkModel,
} from "../ai-sdk/configLoader";
import { ProviderService } from "../ai-sdk/providerService";
import type { Tool } from "ai";
import { streamText, StreamTextResult as AISdkStreamTextResult } from "ai";
import { createAllTools, ToolResultPayload } from "../tools/coreTools";
// Corrected single import for constants
import {
  CONFIG_NAMESPACE,
  CONFIG_PROVIDER,
  CONFIG_MODEL_ID,
  CONFIG_BASE_URL,
  PANEL_ID,
  PANEL_TITLE,
  SECRET_API_KEY_PREFIX,
} from "../utils/constants";

// Define types for message payloads more strictly
// Use unknown for generic payloads, define specific interfaces where structure is known
interface WebviewMessage {
  command: string;
  payload?: unknown;
}

interface ConfigStatusPayload {
  providerSet: boolean;
  apiKeySet: boolean;
  isModelInitialized: boolean;
  provider?: string;
  modelId?: string;
}

interface SaveConfigPayload {
  provider: string;
  modelId?: string;
  apiKey?: string;
  baseUrl?: string;
}

interface SendMessagePayload {
  id: string; // Unique ID for the stream
  text: string;
}

/**
 * Manages the state and interactions of the Apex Coder webview panel.
 */
export class PanelManager {
  private static currentPanel: vscode.WebviewPanel | undefined;
  private readonly extensionUri: vscode.Uri;
  private readonly context: vscode.ExtensionContext;
  private readonly extensionMode: vscode.ExtensionMode;
  private readonly workspaceRootPath: string | undefined;
  private isModelInitialized = false;
  private readonly messageHandlers: Record<
    string,
    (payload: unknown) => Promise<void> | void
  >;

  constructor(
    context: vscode.ExtensionContext,
    extensionMode: vscode.ExtensionMode,
    workspaceRootPath: string | undefined,
  ) {
    this.extensionUri = context.extensionUri;
    this.context = context;
    this.extensionMode = extensionMode;
    this.workspaceRootPath = workspaceRootPath;
    logger.info(
      `PanelManager initialized with workspaceRootPath: ${this.workspaceRootPath ?? "undefined"}`,
    );
    // Initialize message handlers here
    this.messageHandlers = {
      alert: (payload) => {
        this.handleAlert(payload);
      },
      getConfigStatus: () => this.sendConfigStatus(),
      saveConfiguration: (payload) =>
        this.handleSaveConfiguration(payload as SaveConfigPayload),
      sendMessage: (payload) =>
        this.handleSendMessage(payload as SendMessagePayload),
      getProviders: () => this.handleGetProviders(),
      getModelsForProvider: (payload) =>
        this.handleGetModelsForProvider(payload),
    };
  }

  /**
   * Creates or reveals the webview panel.
   */
  public async showPanel(): Promise<void> {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (PanelManager.currentPanel) {
      logger.info("Revealing existing panel.");
      PanelManager.currentPanel.reveal(column);
      // Resend config status when revealing existing panel
      await this.sendConfigStatus();
      return;
    }

    // Create a new panel.
    PanelManager.currentPanel = vscode.window.createWebviewPanel(
      PANEL_ID,
      PANEL_TITLE,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [this.extensionUri],
        retainContextWhenHidden: true, // Keep state when panel is hidden
      },
    );
    logger.info("Created new panel.");

    PanelManager.currentPanel.webview.html = getWebviewContent(
      PanelManager.currentPanel.webview,
      this.extensionUri,
      this.extensionMode,
      this.workspaceRootPath,
    );
    logger.info("Set panel HTML content.");

    // Set up message listener using the handler map
    PanelManager.currentPanel.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        const handler = this.messageHandlers[message.command];
        if (handler) {
          try {
            await handler(message.payload);
          } catch (error) {
            logger.error(
              `Error handling webview command '${message.command}':`,
              error,
            );
            this.postErrorToWebview(
              `Internal error handling command: ${message.command}`,
              message.command,
            );
          }
        } else {
          logger.warn(
            `Received unknown command from webview: ${message.command}`,
          );
        }
      },
      undefined,
      this.context.subscriptions,
    );

    // Set up dispose listener
    PanelManager.currentPanel.onDidDispose(
      () => {
        this.disposePanel();
      },
      null,
      this.context.subscriptions,
    );

    // Send initial config status
    await this.sendConfigStatus();
  }

  /**
   * Handles messages received from the webview.
   * @param message The message object from the webview.
   */
  private async handleMessage(message: WebviewMessage): Promise<void> {
    logger.info(`Received message command: ${message.command}`);
    switch (message.command) {
      case "alert":
        await this.sendConfigStatus();
        return;
      case "getConfigStatus":
        await this.sendConfigStatus();
        return;
      case "saveConfiguration":
        await this.handleSaveConfiguration(
          message.payload as SaveConfigPayload,
        );
        return;
      case "sendMessage":
        await this.handleSendMessage(message.payload as SendMessagePayload);
        return;
      case "getProviders":
        await this.handleGetProviders();
        return;
      case "getModelsForProvider":
        await this.handleGetModelsForProvider(message.payload);
        return;
      default:
        logger.warn(
          `Received unknown command from webview: ${message.command}`,
        );
    }
  }

  /**
   * Handles request to get all available providers
   */
  private async handleGetProviders(): Promise<void> {
    logger.info("Handling getProviders command...");
    try {
      const providers = await ProviderService.getAllProviders();

      // Add configuration status to each provider
      const config = vscode.workspace.getConfiguration(
        // Extract key safely
        CONFIG_NAMESPACE.split(".")[0] ?? "apexCoder",
      );
      const providerConfigKey = CONFIG_PROVIDER.split(".").pop();
      const currentProvider = providerConfigKey
        ? config.get<string>(providerConfigKey)
        : undefined;

      if (currentProvider) {
        const currentProviderLower = currentProvider.toLowerCase();
        // Check if the current provider is initialized
        for (const provider of providers) {
          if (provider.id.toLowerCase() === currentProviderLower) {
            provider.isConfigured = true;
            provider.isWorking = this.isModelInitialized;
          }
        }
      }

      PanelManager.currentPanel?.webview.postMessage({
        command: "providersResult",
        payload: { providers },
      });
      logger.info(`Sent ${providers.length} providers to webview`);
    } catch (error) {
      logger.error("Error getting providers:", error);
      this.postErrorToWebview(
        `Failed to get providers: ${error instanceof Error ? error.message : String(error)}`,
        "getProviders",
      );
    }
  }

  /**
   * Handles request to get models for a specific provider
   * @param payload The payload containing the provider ID and optional configuration
   */
  private async handleGetModelsForProvider(payload: unknown): Promise<void> {
    // Safely extract properties with refined type guards
    let providerId: string | undefined;
    let config: Record<string, unknown> | undefined;
    if (typeof payload === "object" && payload !== null) {
      providerId =
        typeof (payload as { providerId?: unknown }).providerId === "string"
          ? (payload as { providerId: string }).providerId
          : undefined;
      config =
        typeof (payload as { config?: unknown }).config === "object" &&
        (payload as { config: unknown }).config !== null
          ? (payload as { config: Record<string, unknown> }).config
          : undefined;
    }

    logger.info(
      `Handling getModelsForProvider command for provider: ${providerId ?? "undefined"}`,
    );

    if (!providerId) {
      this.postErrorToWebview("Provider ID is required to get models");
      return;
    }

    try {
      let baseUrl: string | undefined;
      if (providerId.toLowerCase() === "ollama") {
        const vsConfig = vscode.workspace.getConfiguration(
          CONFIG_NAMESPACE.split(".")[0] ?? "apexCoder",
        );
        const baseConfigKey = CONFIG_BASE_URL.split(".").pop();
        if (baseConfigKey) {
          baseUrl = vsConfig.get<string>(baseConfigKey);
        }
      }

      // Use the static method from ProviderService class
      const models = await ProviderService.getModelsForProviderDetails(
        providerId,
        {
          ...(config ?? {}),
          baseUrl: baseUrl ?? (config?.baseUrl as string | undefined),
        },
      );

      PanelManager.currentPanel?.webview.postMessage({
        command: "modelsResult",
        payload: {
          providerId,
          models,
        },
      });
      logger.info(
        `Sent ${models.length} models for provider ${providerId} to webview`,
      );
    } catch (error) {
      logger.error(`Error getting models for provider ${providerId}:`, error);
      this.postErrorToWebview(
        `Failed to get models for provider ${providerId}: ${error instanceof Error ? error.message : String(error)}`,
        "getModelsForProvider",
      );
    }
  }

  /**
   * Sends the current configuration and model initialization status to the webview.
   */
  private async sendConfigStatus(): Promise<void> {
    logger.info("Handling getConfigStatus command...");
    const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    // Safe key derivation
    const providerConfigKey = CONFIG_PROVIDER.split(".").pop();
    const modelConfigKey = CONFIG_MODEL_ID.split(".").pop();

    if (!providerConfigKey || !modelConfigKey) {
      logger.error("Internal error: Could not derive configuration keys.");
      // Optionally post error to webview
      this.postErrorToWebview(
        "Internal error retrieving configuration keys.",
        "getConfigStatus",
      );
      return;
    }

    const provider = config.get<string>(providerConfigKey);
    const modelId = config.get<string>(modelConfigKey);
    const secretKey = provider
      ? `${SECRET_API_KEY_PREFIX}${provider.toLowerCase()}`
      : undefined;
    const apiKeySet = secretKey
      ? !!(await this.context.secrets.get(secretKey))
      : false;

    // Attempt to initialize model only if basic config seems present
    if (provider && (apiKeySet || provider.toLowerCase() === "ollama")) {
      // Use the already initialized state if available, otherwise try initializing
      if (!this.isModelInitialized) {
        await this.tryInitializeModel(); // Update internal state
      }
    } else {
      this.isModelInitialized = false; // Ensure state reflects lack of config
      resetAiSdkModel(); // Reset core SDK state if config is missing
    }

    const payload: ConfigStatusPayload = {
      providerSet: !!provider,
      apiKeySet: apiKeySet || provider?.toLowerCase() === "ollama",
      isModelInitialized: this.isModelInitialized,
      provider: provider, // OK if provider is undefined
      modelId: modelId, // OK if modelId is undefined
    };

    // Use optional chaining for postMessage
    PanelManager.currentPanel?.webview.postMessage({
      command: "configStatus",
      payload,
    });
    logger.info("Sent configStatus to webview:", payload);
  }

  /**
   * Handles saving configuration received from the webview.
   * Reduced complexity by extracting update logic.
   */
  private async handleSaveConfiguration(
    payload: SaveConfigPayload,
  ): Promise<void> {
    logger.info("Handling saveConfiguration command...");
    const { provider, modelId, apiKey, baseUrl } = payload;

    if (!this.validateSaveConfigPayload(payload)) return; // Validation helper

    try {
      await this.updateVsCodeConfiguration(provider, modelId, baseUrl);

      if (apiKey && provider.toLowerCase() !== "ollama") {
        // Only store if provided and not ollama
        await this.storeApiKey(provider, apiKey);
      }

      const aiConfig = this.createAiConfig(payload);
      const initSuccess = await this.tryInitializeModel(true, aiConfig);

      void vscode.window.showInformationMessage(
        // Floating promise ok here
        `Configuration for ${provider} saved successfully.`,
      );
      logger.info("Configuration saved and model re-initialization attempted.");

      await this.sendConfigSavedStatus(
        provider,
        !!apiKey,
        initSuccess,
        modelId,
      );
    } catch (error: unknown) {
      this.handleSaveConfigError(error);
    }
  }

  // --- Helper methods for handleSaveConfiguration ---
  private validateSaveConfigPayload(payload: SaveConfigPayload): boolean {
    const { provider, apiKey } = payload;
    if (!provider) {
      this.postErrorToWebview(
        "Provider name is required.",
        "saveConfiguration",
      );
      return false;
    }
    // API key is required unless it's Ollama
    if (!apiKey && provider.toLowerCase() !== "ollama") {
      this.postErrorToWebview(
        `API Key is required for ${provider}.`,
        "saveConfiguration",
      );
      return false;
    }
    return true;
  }

  private async updateVsCodeConfiguration(
    provider: string,
    modelId?: string,
    baseUrl?: string,
  ): Promise<void> {
    const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    const providerKey = CONFIG_PROVIDER.split(".").pop();
    const modelKey = CONFIG_MODEL_ID.split(".").pop();
    const baseUrlKey = CONFIG_BASE_URL.split(".").pop();

    if (!providerKey || !modelKey || !baseUrlKey) {
      throw new Error("Internal error: Could not derive configuration keys.");
    }

    await config.update(
      providerKey,
      provider,
      vscode.ConfigurationTarget.Global,
    );
    await config.update(
      modelKey,
      modelId ?? undefined,
      vscode.ConfigurationTarget.Global,
    );
    await config.update(
      baseUrlKey,
      baseUrl ?? undefined,
      vscode.ConfigurationTarget.Global,
    );
  }

  private async storeApiKey(provider: string, apiKey: string): Promise<void> {
    const secretKey = `${SECRET_API_KEY_PREFIX}${provider.toLowerCase()}`;
    await this.context.secrets.store(secretKey, apiKey);
    logger.info(`API Key stored for provider: ${provider}`);
  }

  private createAiConfig(payload: SaveConfigPayload): AiConfig {
    const { provider, modelId, apiKey, baseUrl } = payload;
    const credentials: Record<string, unknown> = {};
    if (apiKey) credentials.apiKey = apiKey;
    if (baseUrl) credentials.baseUrl = baseUrl;
    return { provider, modelId, credentials };
  }

  private async sendConfigSavedStatus(
    provider: string,
    apiKeySet: boolean,
    initSuccess: boolean,
    modelId?: string,
  ): Promise<void> {
    const finalPayload: ConfigStatusPayload = {
      providerSet: true,
      apiKeySet: apiKeySet || provider.toLowerCase() === "ollama",
      isModelInitialized: initSuccess,
      provider: provider,
      modelId: modelId,
    };
    // Use optional chaining
    PanelManager.currentPanel?.webview.postMessage({
      command: "configSaved",
      payload: finalPayload,
    });
  }

  private handleSaveConfigError(error: unknown): void {
    logger.error("Error saving configuration:", error);
    const errorMsg = `Failed to save configuration. Check logs. Error: ${error instanceof Error ? error.message : String(error)}`;
    this.postErrorToWebview(errorMsg, "saveConfiguration");
    this.isModelInitialized = false;
    resetAiSdkModel();
  }
  // --- End Save Config Helpers ---

  /**
   * Handles sending a message to the AI model.
   * Refactored slightly to reduce complexity, but still long.
   */
  private async handleSendMessage(payload: SendMessagePayload): Promise<void> {
    logger.info("Handling sendMessage command...");
    if (!payload.text) {
      logger.warn("Received empty message from webview.");
      return;
    }

    if (!this.isModelInitialized) {
      const initSuccess = await this.tryInitializeModel();
      if (!initSuccess) {
        this.postErrorToWebview(
          "AI Model not initialized. Check configuration.",
          "sendMessage",
        );
        return;
      }
    }

    try {
      const model = getLanguageModel();
      const userMessage = payload.text;
      const streamId = payload.id ?? Date.now().toString(); // Use ?? for default

      // Replace deprecated CoreTool with Tool
      const tools: Record<string, Tool> = createAllTools(PanelManager.currentPanel) as Record<string, Tool>; // Cast needed due to wrapper return type

      logger.info(`[${streamId}] Sending to AI: ${userMessage}`);
      logger.info(
        `[${streamId}] Tools configured: ${Object.keys(tools).join(", ") || "None"}`,
      );
      logger.info(`[${streamId}] Attempting streamText...`);

      // Infer streamResult type directly, providing both generic arguments
      let streamResult: AISdkStreamTextResult<typeof tools, never> | null =
        null;

      try {
        streamResult = await streamText({
          model: model,
          prompt: userMessage,
          tools: tools,
          async onChunk({ chunk }) {
            // console.log('CHUNK:', chunk); // Debugging
            switch (chunk.type) {
              case "text-delta":
                PanelManager.currentPanel?.webview.postMessage({
                  command: "aiResponseChunk",
                  payload: { id: streamId, text: chunk.textDelta },
                });
                break;
              case "tool-call":
                PanelManager.currentPanel?.webview.postMessage({
                  command: "aiThinkingStep",
                  payload: {
                    id: streamId,
                    text: `Calling tool: ${chunk.toolName}...`,
                  },
                });
                break;
              // Handle other chunk types if necessary
            }
          },
        });
        logger.info(`[${streamId}] streamText call completed successfully.`);
      } catch (streamError: unknown) {
        logger.error(
          `[${streamId}] Error during streamText call:`,
          streamError,
        );
        this.postErrorToWebview(
          `AI Stream Request Failed: ${streamError instanceof Error ? streamError.message : String(streamError)}`,
          "sendMessage",
        );
        return;
      }

      // --- Fallback Logic Removed ---

      // Log final result details
      try {
        // Access properties safely using optional chaining and checking existence
        const finishReason = streamResult.finishReason;
        const usage = streamResult.usage;
        const textExists = !!streamResult.text;
        // Await toolCalls before accessing length
        const toolCallsResult = await streamResult.toolCalls;
        const toolCallsCount = Array.isArray(toolCallsResult)
          ? toolCallsResult.length
          : 0;

        logger.info(`[${streamId}] Final stream result details:`, {
          finishReason,
          usage,
          textExists, // Log presence of text promise
          toolCalls: toolCallsCount, // Log number of tool calls
        });
      } catch (logError: unknown) {
        logger.error("Error logging final stream result:", logError);
      }

      logger.info(`Finished request ${streamId}. Sending aiResponseComplete.`);
      PanelManager.currentPanel?.webview.postMessage({
        command: "aiResponseComplete",
        payload: { id: streamId },
      });
    } catch (error: unknown) {
      const errorMsg = `AI Request Failed: ${error instanceof Error ? error.message : String(error)}`;
      logger.error("Error processing AI request:", error);
      this.postErrorToWebview(errorMsg, "sendMessage");
    }
  }

  /**
   * Attempts to initialize the AI model based on current configuration.
   * Updates the internal `isModelInitialized` state.
   * @param forceReinitialize If true, forces re-initialization even if already initialized.
   * @returns True if initialization was successful, false otherwise.
   */
  private async tryInitializeModel(
    forceReinitialize = false,
    config?: AiConfig,
  ): Promise<boolean> {
    if (this.isModelInitialized && !forceReinitialize) {
      logger.info("Model already initialized.");
      return true;
    }
    logger.info("Attempting to initialize AI model...");
    this.isModelInitialized = false; // Assume failure until success
    resetAiSdkModel(); // Reset core SDK state before trying

    try {
      const aiConfig = config ?? (await this.loadConfiguration()); // Use ??
      if (!aiConfig) {
        logger.warn("AI configuration is incomplete. Cannot initialize model.");
        return false;
      }
      await initializeAiSdkModel(aiConfig);
      this.isModelInitialized = true;
      logger.info("AI Model initialized successfully.");
      return true;
    } catch (error: unknown) {
      // Use unknown
      logger.error("Failed to initialize AI model:", error);
      this.isModelInitialized = false;
      return false;
    }
  }

  /**
   * Loads configuration from VS Code settings and secrets.
   * @returns The AiConfig object or null if configuration is incomplete.
   */
  private async loadConfiguration(): Promise<AiConfig | null> {
    const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE);
    // Safe key derivation
    const providerConfigKey = CONFIG_PROVIDER.split(".").pop();
    const modelConfigKey = CONFIG_MODEL_ID.split(".").pop();
    const baseConfigKey = CONFIG_BASE_URL.split(".").pop();

    if (!providerConfigKey || !modelConfigKey || !baseConfigKey) {
      logger.error(
        "Internal error: Could not derive configuration keys for loading.",
      );
      return null;
    }

    const provider = config.get<string>(providerConfigKey);
    if (!provider) {
      return null;
    }

    const modelId = config.get<string>(modelConfigKey);
    const baseUrl = config.get<string>(baseConfigKey);
    const secretKey = `${SECRET_API_KEY_PREFIX}${provider.toLowerCase()}`;
    const apiKey = await this.context.secrets.get(secretKey);

    if (!apiKey && provider.toLowerCase() !== "ollama") {
      logger.warn(`API key for ${provider} not found.`);
      return null;
    }

    // Create credentials object with explicit checks for undefined
    const credentials: Record<string, string> = {};
    if (apiKey) {
      credentials.apiKey = apiKey;
    }
    if (baseUrl) {
      credentials.baseUrl = baseUrl;
    }

    return {
      provider,
      modelId: modelId ?? undefined, // Ensure modelId is string | undefined
      credentials, // Credentials object now correctly typed
    };
  }

  /**
   * Posts an error message to the webview.
   * @param message The error message text.
   */
  private postErrorToWebview(message: string, source?: string): void {
    // Use void for floating promise
    void vscode.window.showErrorMessage(`Apex Coder: ${message}`);
    PanelManager.currentPanel?.webview.postMessage({
      command: "error",
      payload: source ? { message, source } : { message },
    });
  }

  /**
   * Cleans up resources when the panel is disposed.
   */
  private disposePanel(): void {
    PanelManager.currentPanel = undefined;
    this.isModelInitialized = false; // Reset state when panel closes
    resetAiSdkModel();
    logger.info("Panel disposed and AI state reset.");
    // Dispose of any other resources if needed
  }

  // --- Message Handlers ---
  private handleAlert(payload: unknown): void {
    // Refined type guard for payload with text property, checking for key existence
    let message = "Unknown alert from webview";
    if (
      typeof payload === "object" &&
      payload !== null &&
      Object.prototype.hasOwnProperty.call(payload, "text")
    ) {
      const textValue = (payload as { text: unknown }).text;
      if (typeof textValue === "string") {
        message = textValue;
      } else {
        message = `Received alert with non-string text: ${String(textValue)}`;
      }
    } else if (payload !== null) {
      message = `Received non-object alert payload: ${String(payload)}`;
    }
    // Still use void for floating promise
    void vscode.window.showErrorMessage(message);
  }
}
