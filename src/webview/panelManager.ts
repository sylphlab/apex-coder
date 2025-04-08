import * as vscode from "vscode";
import { getWebviewContent } from "./contentProvider";
import { logger } from "../utils/logger";
import type { AiConfig } from "../ai-sdk/configLoader";
import {
  getLanguageModel,
  initializeAiSdkModel,
  resetAiSdkModel,
} from "../ai-sdk/configLoader";
import {
  getAllProviders,
  getModelsForProviderDetails,
} from "../ai-sdk/providerService";
import type { Tool } from "ai";
import { streamText, StreamTextResult as AISdkStreamTextResult } from "ai";
// Import Message type from Vercel AI SDK
import type { Message } from "ai";
import { createAllTools } from "../tools/coreTools";
// Assuming assistantManager is correctly structured for import
import {
  getAssistantProfiles,
  deleteAssistantProfile,
  addAssistantProfile,
  updateAssistantProfile,
  getAssistantProfileById,
} from "../assistantManager";
// Import the type definition
import type { AssistantProfile } from "../types/assistantProfile";
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
// Import SessionManager and SessionState
import type { SessionManager } from "../core/sessionManager";
import type { SessionState, ScheduledAction } from "../types/sessionState";
// Import uuid
import { v4 as uuidv4 } from 'uuid';

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

// Define ToolContext type
interface ToolContext {
  sessionId: string;
  assistantId: string;
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
  private currentAssistants: string[] = []; // Now managed by session state
  private currentSessionId: string | null = null; // Track current active session
  private readonly sessionManager: SessionManager; // Add session manager instance
  private readonly messageHandlers: Record<
    string,
    (payload: unknown) => Promise<void> | void
  >;

  constructor(
    context: vscode.ExtensionContext,
    extensionMode: vscode.ExtensionMode,
    workspaceRootPath: string | undefined,
    sessionManager: SessionManager, // Inject SessionManager
  ) {
    this.extensionUri = context.extensionUri;
    this.context = context;
    this.extensionMode = extensionMode;
    this.workspaceRootPath = workspaceRootPath;
    this.sessionManager = sessionManager; // Store instance
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
      getAssistantProfiles: () => this.handleGetAssistantProfiles(),
      deleteAssistantProfile: (payload) =>
        this.handleDeleteAssistantProfile(payload),
      addAssistantProfile: (payload) =>
        this.handleAddAssistantProfile(payload),
      updateAssistantProfile: (payload) =>
        this.handleUpdateAssistantProfile(payload),
      getAvailableTools: () => this.handleGetAvailableTools(),
    };
  }

  /**
   * Creates or reveals the webview panel.
   * Needs to handle loading the state for a specific session.
   */
  public async showPanel(sessionId?: string): Promise<void> { // Allow specifying session ID
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

    // Create a new session if no ID is provided or found?
    if (!sessionId) {
        const newSession = this.sessionManager.createSession(); // Create default session
        sessionId = newSession.sessionId;
        logger.info(`No session ID provided, created and using new session: ${sessionId}`);
    }
    this.currentSessionId = sessionId ?? null;
    // Load session state AFTER panel creation but before sending initial status?
    if (this.currentSessionId) { // Check if we have a valid ID before trying to load
      const sessionState = this.sessionManager.getSession(this.currentSessionId);
      if (sessionState) {
          this.currentAssistants = sessionState.activeAssistantIds; // Load assistants from session
          // ** Send initial messages history to webview **
          PanelManager.currentPanel?.webview.postMessage({
              command: 'loadChatHistory', 
              payload: { messages: sessionState.messages }
          });
          logger.info(`Loaded state and message history for session: ${this.currentSessionId}`);
      } else {
          logger.error(`Could not find session state for ID: ${this.currentSessionId}. Creating new.`);
          const newSession = this.sessionManager.createSession();
          this.currentSessionId = newSession.sessionId ?? null; // Ensure null if undefined
          this.currentAssistants = [];
          // ** Send empty message list for new session **
          PanelManager.currentPanel?.webview.postMessage({
              command: 'loadChatHistory', 
              payload: { messages: [] }
          });
      }
    } else {
        // This case should ideally not happen if we always ensure a session ID
        logger.error("showPanel called without a valid currentSessionId.");
        // Optionally create a session here too?
        PanelManager.currentPanel?.webview.postMessage({
              command: 'loadChatHistory', 
              payload: { messages: [] }
        });
    }

    // Send initial config status (now potentially session-aware if needed)
    await this.sendConfigStatus();
  }

  /**
   * Handles request to get all available providers
   */
  private async handleGetProviders(): Promise<void> {
    logger.info("Handling getProviders command...");
    try {
      const providers = getAllProviders();

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

      // Use the imported function directly
      const models = await getModelsForProviderDetails(providerId, {
        ...(config ?? {}),
        baseUrl: baseUrl ?? (config?.baseUrl as string | undefined),
      });

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
   * Handles request to get all assistant profiles.
   */
  private async handleGetAssistantProfiles(): Promise<void> {
    logger.info("Handling getAssistantProfiles command...");
    try {
      const profiles = getAssistantProfiles(); // Uses the function from assistantManager
      PanelManager.currentPanel?.webview.postMessage({
        command: "assistantProfilesList", // Command for the webview to listen to
        payload: profiles,
      });
      logger.info(`Sent ${profiles.length} assistant profiles to webview`);
    } catch (error) {
      logger.error("Error getting assistant profiles:", error);
      this.postErrorToWebview(
        `Failed to get assistant profiles: ${error instanceof Error ? error.message : String(error)}`,
        "getAssistantProfiles",
      );
    }
  }

  /**
   * Handles request to delete an assistant profile.
   * @param payload The payload containing the profile ID.
   */
  private async handleDeleteAssistantProfile(payload: unknown): Promise<void> {
    let profileId: string | undefined;
    if (typeof payload === "object" && payload !== null) {
      profileId =
        typeof (payload as { profileId?: unknown }).profileId === "string"
          ? (payload as { profileId: string }).profileId
          : undefined;
    }

    logger.info(
      `Handling deleteAssistantProfile command for ID: ${profileId ?? "undefined"}`,
    );

    if (!profileId) {
      this.postErrorToWebview("Profile ID is required for deletion");
      return;
    }

    try {
      const success = await deleteAssistantProfile(profileId);
      PanelManager.currentPanel?.webview.postMessage({
        command: "assistantProfileDeleted",
        payload: { success, profileId }, // Send success status back
      });
      if (success) {
        logger.info(`Deleted assistant profile ${profileId}`);
        // Optionally refresh the list in the webview by sending the updated list
        // await this.handleGetAssistantProfiles();
      } else {
        logger.warn(`Assistant profile ${profileId} not found for deletion.`);
        // Error might have already been shown by deleteAssistantProfile
      }
    } catch (error) {
      logger.error(`Error deleting assistant profile ${profileId}:`, error);
      this.postErrorToWebview(
        `Failed to delete profile ${profileId}: ${error instanceof Error ? error.message : String(error)}`,
        "deleteAssistantProfile",
      );
    }
  }

  /**
   * Handles request to add a new assistant profile.
   * @param payload The payload containing the new profile data.
   */
  private async handleAddAssistantProfile(payload: unknown): Promise<void> {
    logger.info("Handling addAssistantProfile command...");
    // TODO: Add validation for the payload structure against AssistantProfile interface
    // This requires importing AssistantProfile type
    const newProfile = payload as any; // Use any temporarily, replace with AssistantProfile and validation
    if (!newProfile || typeof newProfile !== 'object' || !newProfile.id || !newProfile.name) {
        this.postErrorToWebview("Invalid profile data received for add.", "addAssistantProfile");
        return;
    }

    try {
      // Ensure correct type is passed if validation is added
      await addAssistantProfile(newProfile);
      logger.info(`Added assistant profile ${newProfile.id} - ${newProfile.name}`);
      // Post success message or the updated list back to webview
      PanelManager.currentPanel?.webview.postMessage({
          command: "assistantProfileAdded",
          payload: { success: true, profile: newProfile }
      });
      // Optionally refresh the full list
      // await this.handleGetAssistantProfiles();
    } catch (error) {
      logger.error(`Error adding assistant profile ${newProfile.id}:`, error);
      this.postErrorToWebview(
        `Failed to add profile ${newProfile.name}: ${error instanceof Error ? error.message : String(error)}`,
        "addAssistantProfile",
      );
    }
  }

  /**
   * Handles request to update an existing assistant profile.
   * @param payload The payload containing the updated profile data.
   */
  private async handleUpdateAssistantProfile(payload: unknown): Promise<void> {
    logger.info("Handling updateAssistantProfile command...");
    // TODO: Add validation for the payload structure against AssistantProfile interface
    // This requires importing AssistantProfile type
    const updatedProfile = payload as any; // Use any temporarily, replace with AssistantProfile and validation
     if (!updatedProfile || typeof updatedProfile !== 'object' || !updatedProfile.id || !updatedProfile.name) {
        this.postErrorToWebview("Invalid profile data received for update.", "updateAssistantProfile");
        return;
    }

    try {
      // Ensure correct type is passed if validation is added
      const success = await updateAssistantProfile(updatedProfile);
      logger.info(`Updated assistant profile ${updatedProfile.id} - ${updatedProfile.name}`);
      PanelManager.currentPanel?.webview.postMessage({
          command: "assistantProfileUpdated",
          payload: { success: success, profile: updatedProfile }
      });
      if (!success) {
         logger.warn(`Profile ${updatedProfile.id} not found for update.`);
         // Maybe send specific feedback?
      }
      // Optionally refresh the full list
      // await this.handleGetAssistantProfiles();
    } catch (error) {
      logger.error(`Error updating assistant profile ${updatedProfile.id}:`, error);
      this.postErrorToWebview(
        `Failed to update profile ${updatedProfile.name}: ${error instanceof Error ? error.message : String(error)}`,
        "updateAssistantProfile",
      );
    }
  }

  /**
   * Handles request to get the names of all available tools.
   */
  private handleGetAvailableTools(): void {
    logger.info("Handling getAvailableTools command...");
    try {
      // We need the panel context to potentially create tools if not already done,
      // but here we assume they might be accessible statically or pre-created.
      // For simplicity, let's just get the keys from a dummy creation.
      // A better approach might involve a dedicated ToolRegistry service.
      const tools = createAllTools(undefined); // Pass undefined as panel might not be needed just for keys
      const toolNames = Object.keys(tools);
      
      PanelManager.currentPanel?.webview.postMessage({
        command: "availableToolsList",
        payload: toolNames,
      });
      logger.info(`Sent ${toolNames.length} available tool names to webview.`);
    } catch (error) {
      logger.error("Error getting available tools:", error);
      this.postErrorToWebview(
        `Failed to get available tools: ${error instanceof Error ? error.message : String(error)}`,
        "getAvailableTools",
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
   * Handles processing a user message, potentially targeting an assistant.
   * Currently implements basic target recognition and Vercel SDK streaming.
   */
  private async handleSendMessage(payload: SendMessagePayload): Promise<void> {
    if (!this.currentSessionId) {
        this.postErrorToWebview("No active session found.", "sendMessage");
        return;
    }
    const sessionState = this.sessionManager.getSession(this.currentSessionId);
    if (!sessionState) {
        this.postErrorToWebview(`Session ${this.currentSessionId} not found.`, "sendMessage");
        return;
    }
    // Update local currentAssistants based on loaded session state
    this.currentAssistants = sessionState.activeAssistantIds;

    if (!this.isModelInitialized) {
      this.postErrorToWebview(
        "AI model is not initialized. Please check configuration.",
      );
      return;
    }
    const { id: streamId, text } = payload;
    logger.info(`Handling sendMessage command for stream ${streamId}: "${text}"`);

    // --- Basic Target Assistant Identification (Placeholder) ---
    let targetAssistantId: string | null = null;
    const mentionMatch = text.match(/^@([\w-]+):\s*/);
    if (mentionMatch) {
      const mentionedName = mentionMatch[1];
      // Use session's active assistants
      if (sessionState.activeAssistantIds.includes(mentionedName)) { 
        targetAssistantId = mentionedName;
        logger.info(`Message targets assistant: ${targetAssistantId}`);
        // TODO: Remove the mention from the text passed to the model?
        // text = text.substring(mentionMatch[0].length);
      } else {
         logger.warn(`Mentioned assistant '${mentionedName}' not found in current session.`);
      }
    } else if (sessionState.activeAssistantIds.length === 1) {
        targetAssistantId = sessionState.activeAssistantIds[0];
        logger.info(`Message implicitly targets the only assistant: ${targetAssistantId}`);
    } else {
        targetAssistantId = sessionState.activeAssistantIds.length > 0 ? sessionState.activeAssistantIds[0] : null;
        logger.info(`Multiple assistants, defaulting target to: ${targetAssistantId ?? 'None (logic TBD)'}`);
    }
    // TODO: Use the targetAssistantId to select the correct profile/model
    let assistantProfile: AssistantProfile | undefined;
    if (targetAssistantId) {
        assistantProfile = getAssistantProfileById(targetAssistantId);
        if (!assistantProfile) {
            logger.error(`Could not find profile for targeted assistant ID: ${targetAssistantId}`);
            // Maybe post an error back to the UI?
            // For now, proceed without a specific profile, using the default model.
        } else {
            logger.info(`Using profile for assistant: ${assistantProfile.name}`);
            // TODO: Load model based on profile.modelConfig
            // model = await getLanguageModelForProfile(assistantProfile);
            // If model loading fails, fallback or error?
        }
    }
    // --- End Placeholder ---

    // Use the profile-specific model if loaded, otherwise the default
    const modelToUse = getLanguageModel(); // Placeholder: model; // Replace with actual logic
    if (!modelToUse) {
      this.postErrorToWebview(
        "AI model is not initialized. Check configuration.",
      );
      return;
    }

    try {
      // Prepend profile instructions if available
      const systemPrompt = assistantProfile?.instructions ? `${assistantProfile.instructions}\n\n---\n\n` : "";
      const userMessageText = systemPrompt + text;

      // ** Add user message to session state BEFORE sending to AI **
      const userMessageForState: Message = {
          id: uuidv4(), // Add unique ID
          role: 'user',
          content: text 
      };
      sessionState.messages.push(userMessageForState);
      // No need to await save here, save after AI response

      // Replace deprecated CoreTool with Tool
      const tools: Record<string, Tool> = createAllTools(PanelManager.currentPanel) as Record<string, Tool>; // Cast needed due to wrapper return type

      logger.info(`[${streamId}] Sending to AI: ${userMessageText}`);
      logger.info(
        `[${streamId}] Tools configured: ${Object.keys(tools).join(", ") || "None"}`,
      );
      logger.info(`[${streamId}] Attempting streamText...`);

      // Infer streamResult type directly, providing both generic arguments
      let streamResult: AISdkStreamTextResult<typeof tools, never> | null =
        null;

      try {
        streamResult = await streamText({
          model: modelToUse,
          // Send combined prompt to model, but use original text for history
          prompt: userMessageText, 
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
        // ** Save session even if stream fails? Or only on success? **
        // Consider saving here to capture the user message at least
        await this.sessionManager.saveSession(this.currentSessionId);
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

      // --- After AI response is complete ---
      // Add AI response and tool results/calls to messages array and save
      if (streamResult) {
          try {
              // Get the final assistant message content
              const assistantContent = await streamResult.text;
              if (assistantContent) {
                 sessionState.messages.push({ 
                     id: uuidv4(), // Add unique ID
                     role: 'assistant',
                     content: assistantContent 
                 });
              }

              // Handle tool calls and results
              const toolCalls = await streamResult.toolCalls;
              const toolResults = await streamResult.toolResults;

              // Vercel SDK Message type can handle tool_calls and tool_results roles directly
              // Assuming toolCalls/toolResults are structured appropriately
              if (Array.isArray(toolCalls) && toolCalls.length > 0) {
                 sessionState.messages.push({ 
                    id: uuidv4(), // Add unique ID
                    role: 'assistant', // Tool calls are from assistant
                    content: '', // Content might be empty for tool calls
                    toolCalls: toolCalls // Use the dedicated property
                 }); 
              }
              if (Array.isArray(toolResults) && toolResults.length > 0) {
                 sessionState.messages.push({ 
                    id: uuidv4(), // Add unique ID
                    role: 'tool', // Use 'tool' role for results
                    content: '', // Content might be empty for tool results
                    toolResults: toolResults // Use the dedicated property
                 });
              }
          } catch (resultProcessingError) {
              logger.error(`[${streamId}] Error processing stream final result:`, resultProcessingError);
              sessionState.messages.push({ 
                  id: uuidv4(), // Add unique ID
                  role: 'assistant',
                  content: "[Error processing final response]" 
              });
          }
      } else {
          sessionState.messages.push({ 
              id: uuidv4(), // Add unique ID
              role: 'assistant',
              content: "[Error: No response stream result]" 
          });
      }
      
      // ** Save the updated session state **
      await this.sessionManager.saveSession(this.currentSessionId); 
      // --- End Example ---
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

  // --- Method to set current assistants (Placeholder) ---
  /**
   * Sets the list of active assistant IDs for the current session.
   * In a real implementation, this would likely be tied to specific chat sessions.
   * @param assistantIds An array of assistant profile IDs.
   */
  public setCurrentAssistants(assistantIds: string[]): void {
    // TODO: Integrate with actual session management
    this.currentAssistants = assistantIds;
    this.currentSessionId = "session_" + Date.now(); // Simple session ID for now
    logger.info(`Set current assistants for session ${this.currentSessionId}: ${assistantIds.join(", ")}`);
    // Example: Add a default assistant if none are set (for testing)
    if (this.currentAssistants.length === 0) {
        const profiles = getAssistantProfiles();
        if (profiles.length > 0) {
            this.currentAssistants.push(profiles[0].id);
             logger.info(`Added default assistant: ${profiles[0].id}`);
        }
    }
  }

  // Example: Method to add assistant to current session
  public async addAssistantToCurrentSession(assistantId: string): Promise<void> {
      if (!this.currentSessionId) {
          logger.warn("Cannot add assistant: No active session.");
          return;
      }
      const sessionState = this.sessionManager.getSession(this.currentSessionId);
      if (sessionState && !sessionState.activeAssistantIds.includes(assistantId)) {
          sessionState.activeAssistantIds.push(assistantId);
          this.currentAssistants = sessionState.activeAssistantIds; // Update local copy
          await this.sessionManager.saveSession(this.currentSessionId);
          logger.info(`Added assistant ${assistantId} to session ${this.currentSessionId}`);
          // TODO: Notify webview?
      }
  }

  // TODO: Add removeAssistantFromCurrentSession

  // --- Scheduled Action Execution --- 
  /**
   * Executes a scheduled action for a given session.
   * This is intended to be called by the background timer/scheduler.
   * @param sessionId The ID of the session the action belongs to.
   * @param action The ScheduledAction object to execute.
   */
  public async executeScheduledAction(sessionId: string, action: ScheduledAction): Promise<void> {
      logger.info(`[PanelManager] Executing scheduled action ${action.id} for session ${sessionId}`);
      
      // Ensure the action is still marked as executing (prevent race conditions?)
      const sessionState = this.sessionManager.getSession(sessionId);
      const actionInState = sessionState?.scheduledActions?.find((a: ScheduledAction) => a.id === action.id);

      if (!sessionState || !actionInState || actionInState.status !== 'executing') {
          logger.warn(`[PanelManager] Action ${action.id} in session ${sessionId} is not in executing state or session not found. Skipping.`);
          // Optionally update status back to pending or failed?
          if (sessionState && actionInState) {
             await this.sessionManager.updateScheduledActionStatus(sessionId, action.id, 'failed');
          }
          return;
      }

      let success = false;
      try {
          // --- Action Execution Logic --- 
          switch (action.actionType) {
              case 'sendMessage': { // Example: Send a message as the target assistant
                  const messageText = action.actionPayload?.text as string;
                  const targetProfile = getAssistantProfileById(action.targetAssistantId);
                  if (!messageText) throw new Error('Missing text in sendMessage actionPayload');
                  if (!targetProfile) throw new Error(`Target assistant profile ${action.targetAssistantId} not found.`);
                  
                  logger.info(` -> Action Type: sendMessage, Target: ${targetProfile.name}, Text: "${messageText}"`);
                  // Construct the message and add to state
                  const assistantMessage: Message = {
                      id: uuidv4(),
                      role: 'assistant', 
                      // TODO: Figure out how to attribute this message to the targetAssistantId
                      // Maybe add assistantId to the Message interface?
                      content: messageText,
                      // Optionally include model info from targetProfile?
                  };
                  sessionState.messages.push(assistantMessage);
                  // Notify webview to display the new message
                  PanelManager.currentPanel?.webview.postMessage({
                      command: 'aiResponseChunk', // Reuse chunk command for simplicity?
                      payload: { streamId: `scheduled_${action.id}`, textChunk: messageText }
                  });
                  PanelManager.currentPanel?.webview.postMessage({ 
                      command: 'aiResponseComplete', 
                      payload: { streamId: `scheduled_${action.id}` } 
                  }); 
                  success = true;
                  break;
              }

              case 'callTool': { // Example: Call a tool as the target assistant
                  const toolName = action.actionPayload?.toolName as string;
                  const toolArgs = action.actionPayload?.args as any;
                  const targetProfile = getAssistantProfileById(action.targetAssistantId);
                  if (!toolName || !toolArgs) throw new Error('Missing toolName or args in callTool actionPayload');
                   if (!targetProfile) throw new Error(`Target assistant profile ${action.targetAssistantId} not found.`);

                  logger.info(` -> Action Type: callTool, Target: ${targetProfile.name}, Tool: ${toolName}, Args: ${JSON.stringify(toolArgs)}`);

                  // Check if tool is allowed for the profile
                  if (!targetProfile.allowedTools.includes(toolName)) {
                     throw new Error(`Tool '${toolName}' is not allowed for assistant profile '${targetProfile.name}'.`);
                  }

                  const tools = createAllTools(PanelManager.currentPanel);
                  const toolToCall = tools[toolName];
                  if (!toolToCall || typeof toolToCall.execute !== 'function') {
                      throw new Error(`Tool '${toolName}' not found or does not have an executable function.`);
                  }

                  // ** Create ToolContext **
                  const toolContext: ToolContext = {
                      sessionId: sessionId,
                      assistantId: action.targetAssistantId
                  };

                  // Execute the tool, passing context
                  const toolResult = await toolToCall.execute(toolArgs, toolContext);
                  logger.info(` -> Tool ${toolName} executed. Result: ${JSON.stringify(toolResult)}`);

                  // Add tool result message to state
                  sessionState.messages.push({
                      id: uuidv4(),
                      role: 'tool',
                      toolResults: [{ toolName: toolName, result: toolResult }],
                      content: '',
                  });
                   // Notify webview?
                  success = true;
                  break;
              }

              default:
                  logger.warn(`[PanelManager] Unknown scheduled action type: ${action.actionType}`);
                  throw new Error(`Unknown scheduled action type: ${action.actionType}`);
          }
          // ---------------------------

          // Update status to completed on success
          await this.sessionManager.updateScheduledActionStatus(sessionId, action.id, 'completed');

      } catch (error) {
          logger.error(`[PanelManager] Error executing scheduled action ${action.id}:`, error);
          // Update status to failed
          await this.sessionManager.updateScheduledActionStatus(sessionId, action.id, 'failed');
          // Optionally add an error message to the chat?
          sessionState.messages.push({
              id: uuidv4(),
              role: 'system', // Or 'assistant'?
              content: `[Error executing scheduled action ${action.id}: ${error instanceof Error ? error.message : String(error)}]`
          });
          // Notify webview of the error message?
      }
      // Save session state again after execution (success or fail) and status update
      await this.sessionManager.saveSession(sessionId);
  }
  // --- End Scheduled Action Execution --- 
}
