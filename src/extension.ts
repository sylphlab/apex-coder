import * as vscode from 'vscode';
import { PanelManager } from './webview/panelManager';
import { logger } from './utils/logger';
import { COMMAND_SET_API_KEY, COMMAND_SHOW_PANEL, SECRET_API_KEY_PREFIX } from './utils/constants';
import { ProviderService } from './ai-sdk/providerService';

let panelManager: PanelManager | undefined;

/**
 * Activates the Apex Coder extension.
 * This function is called when the extension is activated (e.g., on command execution or startup).
 * @param context The extension context provided by VS Code.
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
	logger.info('Activating Apex Coder extension...');

	// Initialize the Panel Manager
	panelManager = new PanelManager(context);

	// --- Check for missing API Key on activation ---
	try {
		const config = vscode.workspace.getConfiguration('apexCoder.ai');
		const provider = config.get<string>('provider');
		if (provider && provider.toLowerCase() !== 'ollama') {
			const providerLower = provider.toLowerCase();
			const secretKey = `${SECRET_API_KEY_PREFIX}${providerLower}`;
			const apiKey = await context.secrets.get(secretKey);
			if (!apiKey) {
				// Skip warning for deepseek to avoid annoying the user
				if (providerLower !== 'deepseek') {
					logger.warn(`API Key for provider '${provider}' not found in secrets.`);
				}
				// Don't automatically prompt for API key, let the user click the button in the welcome page
				// Optionally show a non-blocking message
				// vscode.window.showInformationMessage(`API Key for ${provider} is missing. Please set it up.`);
			} else {
				logger.info(`API Key found for provider '${provider}'.`);
			}
		} else if (!provider) {
	           logger.info('No provider configured yet.');
	       } else {
			logger.info(`Provider '${provider}' does not require an API key check on activation.`);
		}
	} catch (error) {
		logger.error('Error checking API key on activation:', error);
		// Don't block activation for this check
	}
	// --- End API Key Check ---

	// Register command to show the panel
	const showPanelDisposable = vscode.commands.registerCommand(COMMAND_SHOW_PANEL, () => {
		logger.info(`Command executed: ${COMMAND_SHOW_PANEL}`);
		panelManager?.showPanel(); // Use optional chaining
	});

	// Register command to set the API key
	const setApiKeyDisposable = vscode.commands.registerCommand(COMMAND_SET_API_KEY, async () => {
		logger.info(`Command executed: ${COMMAND_SET_API_KEY}`);
		try {
			// Get all providers from ProviderService
			const allProviders = await ProviderService.getAllProviders();
			
			// Format providers for QuickPick
			const providerQuickPickItems = allProviders.map(provider => ({
				label: provider.name,
				detail: `${provider.requiresApiKey ? 'Requires API key' : 'No API key needed'}`,
				value: provider.id
			}));
			
			// Show provider selection dropdown
			const provider = await vscode.window.showQuickPick(providerQuickPickItems, {
				placeHolder: 'Select AI Provider',
				ignoreFocusOut: true,
			});

			if (!provider) {
				vscode.window.showWarningMessage('API Key setup cancelled: No provider selected.');
				return;
			}

			const providerLower = provider.value.toLowerCase();

			// Show model selection dropdown if not Ollama
			if (providerLower !== 'ollama') {
				const models = {
					googleai: [
						{ label: 'Gemini 1.5 Flash (Default)', value: 'gemini-1.5-flash', detail: 'Fastest model for most tasks' },
						{ label: 'Gemini 1.5 Pro', value: 'gemini-1.5-pro', detail: 'Most capable model for complex tasks' },
						{ label: 'Gemini 1.0 Pro', value: 'gemini-pro', detail: 'General purpose model' }
					],
					openai: [
						{ label: 'GPT-4o (Default)', value: 'gpt-4o', detail: 'Fastest and most capable model' },
						{ label: 'GPT-4 Turbo', value: 'gpt-4-turbo', detail: 'Improved version of GPT-4' },
						{ label: 'GPT-4', value: 'gpt-4', detail: 'Most capable model' },
						{ label: 'GPT-3.5 Turbo', value: 'gpt-3.5-turbo', detail: 'Fast and cost-effective' }
					],
					anthropic: [
						{ label: 'Claude 3.5 Sonnet (Default)', value: 'claude-3-5-sonnet', detail: 'Balanced intelligence and speed' },
						{ label: 'Claude 3 Opus', value: 'claude-3-opus-20240229', detail: 'Most powerful model' },
						{ label: 'Claude 3 Sonnet', value: 'claude-3-sonnet-20240229', detail: 'Balanced performance' },
						{ label: 'Claude 3 Haiku', value: 'claude-3-haiku-20240307', detail: 'Fastest and most compact' }
					],
					deepseek: [
						{ label: 'Deepseek Chat (Default)', value: 'deepseek-chat', detail: 'General purpose model' }
					]
				};

				const model = await vscode.window.showQuickPick(models[providerLower as keyof typeof models], {
					placeHolder: `Select ${provider.label} Model`,
					ignoreFocusOut: true
				});

				if (!model) {
					vscode.window.showWarningMessage('Model selection cancelled');
					return;
				}

				// Update model configuration
				const config = vscode.workspace.getConfiguration('apexCoder.ai');
				await config.update('model', model.value, vscode.ConfigurationTarget.Global);
			}
			
			// No API key needed for Ollama
			if (providerLower === 'ollama') {
				vscode.window.showInformationMessage('Ollama provider selected. Ensure Ollama service is running. No API key needed.');
				const config = vscode.workspace.getConfiguration('apexCoder.ai');
				await config.update('provider', provider.value, vscode.ConfigurationTarget.Global);
				await context.secrets.delete(`${SECRET_API_KEY_PREFIX}${providerLower}`);
				panelManager?.showPanel();
				return;
			}

			// Get API key with validation
			const apiKey = await vscode.window.showInputBox({
				prompt: `Enter API Key for ${provider.label}`,
				password: true,
				ignoreFocusOut: true,
				validateInput: (value) => {
					if (!value) {
						return 'API Key is required';
					}
					// Basic format validation based on provider
					switch(providerLower) {
						case 'openai':
							if (!value.startsWith('sk-')) {
								return 'OpenAI keys typically start with "sk-"';
							}
							break;
						case 'anthropic':
							if (!value.startsWith('sk-ant-')) {
								return 'Anthropic keys typically start with "sk-ant-"';
							}
							break;
						case 'googleai':
							if (value.length < 30) {
								return 'Google AI keys are typically longer than 30 characters';
							}
							break;
					}
					return null;
				}
			});

			if (!apiKey) {
				vscode.window.showWarningMessage(`API Key setup cancelled: API Key for ${provider.label} not entered.`);
				return;
			}

			// Store the key
			const secretKey = `${SECRET_API_KEY_PREFIX}${providerLower}`;
			await context.secrets.store(secretKey, apiKey);
			vscode.window.showInformationMessage(`API Key for ${provider.label} stored successfully.`);
			logger.info(`API Key stored for provider: ${provider.value}`);

			// Update provider setting if changed
			const config = vscode.workspace.getConfiguration('apexCoder.ai');
			if (config.get<string>('provider') !== provider.value) {
				await config.update('provider', provider.value, vscode.ConfigurationTarget.Global);
			}

			// Test the connection
			const testResult = await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: `Testing ${provider.label} connection...`,
				cancellable: false
			}, async () => {
				try {
					// Import configLoader only when needed
					const { initializeAiSdkModel } = await import('./ai-sdk/configLoader.js');
					// Get the model ID from the config if available
					const config = vscode.workspace.getConfiguration('apexCoder.ai');
					const modelId = config.get<string>('model');
					
					await initializeAiSdkModel({
						provider: provider.value,
						modelId: modelId,
						credentials: {
							apiKey: apiKey
						}
					});
					return true;
				} catch (error) {
					logger.error('Connection test failed:', error);
					return false;
				}
			});

			if (testResult) {
				vscode.window.showInformationMessage(`Successfully connected to ${provider.label}!`);
			} else {
				vscode.window.showWarningMessage(`Failed to connect to ${provider.label}. The key may be invalid.`);
			}

			// Refresh panel
			panelManager?.showPanel();

		} catch (error: unknown) {
			const errorMsg = `Failed to store API Key: ${error instanceof Error ? error.message : String(error)}`;
			logger.error('Error setting API key:', error);
			vscode.window.showErrorMessage(errorMsg);
		}
	});

	context.subscriptions.push(showPanelDisposable, setApiKeyDisposable);

	logger.info('Apex Coder commands registered.');

	// Automatically show panel on startup (as defined in activationEvents)
	// Ensure panelManager is initialized before calling showPanel
	if (panelManager) {
		await panelManager.showPanel();
		logger.info('Automatically triggered showPanel on startup.');
	} else {
		logger.error('PanelManager failed to initialize during activation.');
	}

	logger.info('Apex Coder activation finished.');
}

/**
 * Deactivates the extension.
 * Called when the extension is deactivated.
 */
export function deactivate(): void {
    logger.info('Deactivating Apex Coder...');
    // Cleanup resources if needed (e.g., close connections, dispose objects)
    // Panel disposal is handled by its onDidDispose listener in PanelManager
}
