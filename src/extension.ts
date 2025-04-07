import * as vscode from 'vscode';
import { PanelManager } from './webview/panelManager';
import { logger } from './utils/logger';
import { COMMAND_SET_API_KEY, COMMAND_SHOW_PANEL, SECRET_API_KEY_PREFIX } from './utils/constants';

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

	// Register command to show the panel
	const showPanelDisposable = vscode.commands.registerCommand(COMMAND_SHOW_PANEL, () => {
		logger.info(`Command executed: ${COMMAND_SHOW_PANEL}`);
		panelManager?.showPanel(); // Use optional chaining
	});

	// Register command to set the API key
	const setApiKeyDisposable = vscode.commands.registerCommand(COMMAND_SET_API_KEY, async () => {
		logger.info(`Command executed: ${COMMAND_SET_API_KEY}`);
		try {
			const provider = await vscode.window.showInputBox({
				prompt: 'Enter AI Provider name (e.g., google, openai, anthropic, ollama)',
				placeHolder: 'openai',
				ignoreFocusOut: true,
			});

			if (!provider) {
				vscode.window.showWarningMessage('API Key setup cancelled: Provider name not entered.');
				return;
			}

			const providerLower = provider.toLowerCase();
			// No API key needed for Ollama
			if (providerLower === 'ollama') {
				vscode.window.showInformationMessage('Ollama provider selected. Ensure Ollama service is running. No API key needed.');
				// Optionally trigger a config update/check here if needed
				const config = vscode.workspace.getConfiguration('apexCoder.ai');
				await config.update('provider', provider, vscode.ConfigurationTarget.Global);
				// Clear potentially stored key for ollama
				await context.secrets.delete(`${SECRET_API_KEY_PREFIX}${providerLower}`);
				panelManager?.showPanel(); // Re-show panel to potentially trigger re-init
				return;
			}

			const apiKey = await vscode.window.showInputBox({
				prompt: `Enter API Key for ${provider}`,
				password: true,
				ignoreFocusOut: true,
			});

			if (!apiKey) {
				vscode.window.showWarningMessage(`API Key setup cancelled: API Key for ${provider} not entered.`);
				return;
			}

			const secretKey = `${SECRET_API_KEY_PREFIX}${providerLower}`;
			await context.secrets.store(secretKey, apiKey);
			vscode.window.showInformationMessage(`API Key for ${provider} stored successfully.`);
			logger.info(`API Key stored for provider: ${provider}`);

			// Optionally update provider setting if it changed or wasn't set
			const config = vscode.workspace.getConfiguration('apexCoder.ai');
			if (config.get<string>('provider') !== provider) {
				await config.update('provider', provider, vscode.ConfigurationTarget.Global);
			}
			// Trigger panel show/refresh to potentially re-initialize model with new key
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
