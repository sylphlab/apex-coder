import * as vscode from 'vscode';
import { getWebviewContent } from './contentProvider';
import { logger } from '../utils/logger';
import { AiConfig, getCurrentAiConfig, getLanguageModel, initializeAiSdkModel, resetAiSdkModel } from '../ai-sdk/configLoader';
import { ProviderService } from '../ai-sdk/providerService';
import { streamText } from 'ai'; // Keep this import
import { createAllTools } from '../tools/coreTools';
// Corrected single import for constants
import {
    CONFIG_NAMESPACE,
    CONFIG_PROVIDER,
    CONFIG_MODEL_ID,
    CONFIG_BASE_URL,
    PANEL_ID,
    PANEL_TITLE,
    SECRET_API_KEY_PREFIX
} from '../utils/constants';

// Define the structure for messages sent to/from the webview
interface WebviewMessage {
    command: string;
    payload?: any;
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
    private readonly extensionMode: vscode.ExtensionMode; // Store the mode
    private isModelInitialized: boolean = false;

    constructor(context: vscode.ExtensionContext, extensionMode: vscode.ExtensionMode) { // Add extensionMode parameter
        this.extensionUri = context.extensionUri;
        this.context = context;
        this.extensionMode = extensionMode; // Assign it
    }

    /**
     * Creates or reveals the webview panel.
     */
    public async showPanel(): Promise<void> {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (PanelManager.currentPanel) {
            logger.info('Revealing existing panel.');
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
            }
        );
        logger.info('Created new panel.');

        PanelManager.currentPanel.webview.html = getWebviewContent(PanelManager.currentPanel.webview, this.extensionUri, this.extensionMode); // Pass extensionMode here
        logger.info('Set panel HTML content.');

        // Set up message listener
        PanelManager.currentPanel.webview.onDidReceiveMessage(
            (message: WebviewMessage) => this.handleMessage(message),
            undefined,
            this.context.subscriptions
        );
        logger.info('Added message listener.');

        // Set up dispose listener
        PanelManager.currentPanel.onDidDispose(
            () => this.disposePanel(),
            null,
            this.context.subscriptions
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
            case 'alert':
                vscode.window.showErrorMessage(message.payload?.text || 'Unknown alert from webview');
                return;
            case 'getConfigStatus':
                await this.sendConfigStatus();
                return;
            case 'saveConfiguration':
                await this.handleSaveConfiguration(message.payload as SaveConfigPayload);
                return;
            case 'sendMessage':
                await this.handleSendMessage(message.payload as SendMessagePayload);
                return;
            case 'getProviders':
                await this.handleGetProviders();
                return;
            case 'getModelsForProvider':
                await this.handleGetModelsForProvider(message.payload);
                return;
            default:
                logger.warn(`Received unknown command from webview: ${message.command}`);
        }
    }

    /**
     * Handles request to get all available providers
     */
    private async handleGetProviders(): Promise<void> {
        logger.info('Handling getProviders command...');
        try {
            const providers = await ProviderService.getAllProviders();
            
            // Add configuration status to each provider
            const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE.split('.')[0]);
            const currentProvider = config.get<string>(CONFIG_PROVIDER.split('.').pop()!);
            
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
                command: 'providersResult',
                payload: { providers }
            });
            logger.info(`Sent ${providers.length} providers to webview`);
        } catch (error) {
            logger.error('Error getting providers:', error);
            this.postErrorToWebview(`Failed to get providers: ${error instanceof Error ? error.message : String(error)}`, 'getProviders');
        }
    }

    /**
     * Handles request to get models for a specific provider
     * @param payload The payload containing the provider ID and optional configuration
     */
    private async handleGetModelsForProvider(payload: any): Promise<void> {
        const { providerId, config } = payload || {};
        logger.info(`Handling getModelsForProvider command for provider: ${providerId}`);
        
        if (!providerId) {
            this.postErrorToWebview('Provider ID is required to get models');
            return;
        }
        
        try {
            // If the provider is Ollama, get the baseUrl from settings
            let baseUrl: string | undefined;
            if (providerId.toLowerCase() === 'ollama') {
                const vsConfig = vscode.workspace.getConfiguration(CONFIG_NAMESPACE.split('.')[0]);
                baseUrl = vsConfig.get<string>(CONFIG_BASE_URL.split('.').pop()!);
            }
            
            const models = await ProviderService.getModelsForProvider(providerId, {
                ...config,
                baseUrl: baseUrl || config?.baseUrl
            });
            
            PanelManager.currentPanel?.webview.postMessage({
                command: 'modelsResult',
                payload: {
                    providerId,
                    models
                }
            });
            logger.info(`Sent ${models.length} models for provider ${providerId} to webview`);
        } catch (error) {
            logger.error(`Error getting models for provider ${providerId}:`, error);
            this.postErrorToWebview(`Failed to get models for provider ${providerId}: ${error instanceof Error ? error.message : String(error)}`, 'getModelsForProvider');
        }
    }

    /**
     * Sends the current configuration and model initialization status to the webview.
     */
    private async sendConfigStatus(): Promise<void> {
        logger.info('Handling getConfigStatus command...');
        const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE.split('.')[0]); // Get root config section
        const provider = config.get<string>(CONFIG_PROVIDER.split('.').pop()!); // Get specific key
        const modelId = config.get<string>(CONFIG_MODEL_ID.split('.').pop()!); // Get specific key
        const secretKey = provider ? `${SECRET_API_KEY_PREFIX}${provider.toLowerCase()}` : undefined;
        const apiKeySet = secretKey ? !!(await this.context.secrets.get(secretKey)) : false;

        // Attempt to initialize model only if basic config seems present
        if (provider && (apiKeySet || provider.toLowerCase() === 'ollama')) {
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
            apiKeySet: apiKeySet || provider?.toLowerCase() === 'ollama',
            isModelInitialized: this.isModelInitialized,
            provider: provider,
            modelId: modelId
        };

        PanelManager.currentPanel?.webview.postMessage({ command: 'configStatus', payload });
        logger.info('Sent configStatus to webview:', payload);
    }

    /**
     * Handles saving configuration received from the webview.
     * @param payload Configuration data from the webview.
     */
    private async handleSaveConfiguration(payload: SaveConfigPayload): Promise<void> {
        logger.info('Handling saveConfiguration command...');
        const { provider, modelId, apiKey, baseUrl } = payload;

        if (!provider) {
            this.postErrorToWebview('Provider name is required.', 'saveConfiguration');
            return;
        }
        if (!apiKey && provider.toLowerCase() !== 'ollama') {
            this.postErrorToWebview(`API Key is required for ${provider}.`, 'saveConfiguration');
            return;
        }

        try {
            const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE.split('.')[0]);
            // Update configuration globally
            await config.update(CONFIG_PROVIDER.split('.').pop()!, provider, vscode.ConfigurationTarget.Global);
            await config.update(CONFIG_MODEL_ID.split('.').pop()!, modelId || undefined, vscode.ConfigurationTarget.Global);
            await config.update(CONFIG_BASE_URL.split('.').pop()!, baseUrl || undefined, vscode.ConfigurationTarget.Global);

            if (apiKey) {
                const secretKey = `${SECRET_API_KEY_PREFIX}${provider.toLowerCase()}`;
                await this.context.secrets.store(secretKey, apiKey);
                logger.info(`API Key stored for provider: ${provider}`);
            }

            // Create AiConfig object for initialization
            const aiConfig: AiConfig = {
                provider,
                modelId,
                credentials: {}
            };
            
            // Add credentials based on provider
            if (apiKey) {
                aiConfig.credentials.apiKey = apiKey;
            }
            if (baseUrl) {
                aiConfig.credentials.baseUrl = baseUrl;
            }
            
            // Force re-initialization after saving new config
            const initSuccess = await this.tryInitializeModel(true, aiConfig);

            vscode.window.showInformationMessage(`Configuration for ${provider} saved successfully.`);
            logger.info('Configuration saved and model re-initialization attempted.');

            // Send updated status back
            const finalPayload: ConfigStatusPayload = {
                providerSet: true,
                apiKeySet: !!apiKey || provider.toLowerCase() === 'ollama',
                isModelInitialized: initSuccess,
                provider: provider,
                modelId: modelId
            };
            PanelManager.currentPanel?.webview.postMessage({ command: 'configSaved', payload: finalPayload });

        } catch (error: unknown) {
            const errorMsg = `Failed to save configuration: ${error instanceof Error ? error.message : String(error)}`;
            logger.error('Error saving configuration:', error);
            this.postErrorToWebview(errorMsg, 'saveConfiguration');
            this.isModelInitialized = false; // Reset state on error
            resetAiSdkModel();
        }
    }

    /**
     * Handles sending a message to the AI model.
     * @param payload Message data from the webview.
     */
    private async handleSendMessage(payload: SendMessagePayload): Promise<void> {
        logger.info('Handling sendMessage command...');
        if (!payload || !payload.text) {
            logger.warn('Received empty message from webview.');
            return;
        }

        if (!this.isModelInitialized) {
            const initSuccess = await this.tryInitializeModel();
            if (!initSuccess) {
                this.postErrorToWebview('AI Model not initialized. Check configuration.', 'sendMessage');
                return;
            }
        }

        try {
            const model = getLanguageModel();
            const userMessage = payload.text;
            const streamId = payload.id || Date.now().toString(); // Use ID from payload or generate one

            // Create tools instance, passing the current panel for message posting
            const tools = createAllTools(PanelManager.currentPanel);

            logger.info(`Sending to AI: ${userMessage}`);
            logger.info('Tools being passed to streamText:', Object.keys(tools));

            const result = await streamText({
                model: model,
                prompt: userMessage,
                tools: tools,
                async onChunk({ chunk }) {
                    // logger.info('Received chunk:', chunk); // Verbose logging
                    switch (chunk.type) {
                        case 'text-delta':
                            PanelManager.currentPanel?.webview.postMessage({
                                command: 'aiResponseChunk',
                                payload: { id: streamId, text: chunk.textDelta }
                            });
                            break;
                        case 'tool-call':
                            logger.info(`Received chunk type: ${chunk.type}`, chunk);
                            PanelManager.currentPanel?.webview.postMessage({
                                command: 'aiThinkingStep',
                                payload: { id: streamId, text: `Calling tool: ${chunk.toolName}...` }
                            });
                            break;
                        // Add cases for other chunk types if needed (e.g., reasoning, source)
                        default:
                            // Optional: Log other chunk types if needed for debugging
                            // logger.info(`Received chunk type: ${chunk.type}`, chunk);
                            break;
                    }
                }
            });

            // Log final result details after stream completion
            try {
                logger.info('streamText final result properties:', {
                    finishReason: result.finishReason,
                    usage: result.usage,
                    // toolCalls: result.toolCalls, // Optional
                    // toolResults: result.toolResults // Optional
                });
            } catch (logError) {
                logger.error('Error logging final streamText result:', logError);
            }

            logger.info(`Finished stream ${streamId}. Sending aiResponseComplete.`);
            PanelManager.currentPanel?.webview.postMessage({ command: 'aiResponseComplete', payload: { id: streamId } });

        } catch (error: unknown) {
            const errorMsg = `AI Request Failed: ${error instanceof Error ? error.message : String(error)}`;
            logger.error('Error processing AI request:', error);
            this.postErrorToWebview(errorMsg, 'sendMessage');
        }
    }

    /**
     * Attempts to initialize the AI model based on current configuration.
     * Updates the internal `isModelInitialized` state.
     * @param forceReinitialize If true, forces re-initialization even if already initialized.
     * @returns True if initialization was successful, false otherwise.
     */
    private async tryInitializeModel(forceReinitialize: boolean = false, config?: AiConfig): Promise<boolean> {
        if (this.isModelInitialized && !forceReinitialize) {
            logger.info('Model already initialized.');
            return true;
        }
        logger.info('Attempting to initialize AI model...');
        this.isModelInitialized = false; // Assume failure until success
        resetAiSdkModel(); // Reset core SDK state before trying

        try {
            // Use provided config or load from settings
            const aiConfig = config || await this.loadConfiguration();
            if (!aiConfig) {
                logger.warn('AI configuration is incomplete. Cannot initialize model.');
                return false;
            }
            await initializeAiSdkModel(aiConfig);
            this.isModelInitialized = true;
            logger.info('AI Model initialized successfully.');
            return true;
        } catch (error) {
            logger.error('Failed to initialize AI model:', error);
            // Don't show error message here, let the calling function decide
            this.isModelInitialized = false;
            return false;
        }
    }

    /**
     * Loads configuration from VS Code settings and secrets.
     * @returns The AiConfig object or null if configuration is incomplete.
     */
    private async loadConfiguration(): Promise<AiConfig | null> {
        const config = vscode.workspace.getConfiguration(CONFIG_NAMESPACE.split('.')[0]);
        const provider = config.get<string>(CONFIG_PROVIDER.split('.').pop()!);
        if (!provider) { return null; }

        const modelId = config.get<string>(CONFIG_MODEL_ID.split('.').pop()!);
        const baseUrl = config.get<string>(CONFIG_BASE_URL.split('.').pop()!); // Allow undefined
        const secretKey = `${SECRET_API_KEY_PREFIX}${provider.toLowerCase()}`;
        const apiKey = await this.context.secrets.get(secretKey);

        if (!apiKey && provider.toLowerCase() !== 'ollama') {
            logger.warn(`API key for ${provider} not found.`);
            return null; // API key required (except for Ollama)
        }

        // Create credentials object based on provider
        const credentials: Record<string, string> = {};
        if (apiKey) {
            credentials.apiKey = apiKey;
        }
        if (baseUrl) {
            credentials.baseUrl = baseUrl;
        }

        return {
            provider,
            modelId,
            credentials
        };
    }

    /**
     * Posts an error message to the webview.
     * @param message The error message text.
     */
    private postErrorToWebview(message: string, source?: string): void {
        vscode.window.showErrorMessage(`Apex Coder: ${message}`);
        PanelManager.currentPanel?.webview.postMessage({
            command: 'error',
            payload: source ? { message, source } : message
        });
    }

    /**
     * Cleans up resources when the panel is disposed.
     */
    private disposePanel(): void {
        PanelManager.currentPanel = undefined;
        this.isModelInitialized = false; // Reset state when panel closes
        resetAiSdkModel();
        logger.info('Panel disposed and AI state reset.');
        // Dispose of any other resources if needed
    }
}
