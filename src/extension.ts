import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { initializeAiSdkModel, getLanguageModel, AiConfig, getCurrentAiConfig } from './ai-sdk/configLoader';
import { streamText } from 'ai'; // Import streamText

// --- Development Flag ---
// Set to true to load from Vite dev server (run `pnpm --filter webview-ui dev` first)
// Set to false to load from the production build in `dist`
const IS_DEVELOPMENT = true; // <<< CHANGE THIS FOR PRODUCTION BUILD
const DEV_SERVER_URL = 'http://localhost:5173'; // Default Vite dev server port
export async function activate(context: vscode.ExtensionContext) { // Make activate async

	console.log('[Apex Coder] Activating extension...');

	// Model initialization state - managed dynamically now
	let isModelInitialized = false;
	let currentAiConfig: AiConfig | null = null; // Store the active config

	// Helper function to attempt model initialization
	async function tryInitializeModel(forceReinitialize = false): Promise<boolean> {
		if (isModelInitialized && !forceReinitialize) {
			console.log('[Apex Coder] Model already initialized.');
			return true;
		}
		console.log('[Apex Coder] Attempting to initialize AI model...');
		isModelInitialized = false; // Reset status before attempt
		currentAiConfig = null;

		try {
			const config = vscode.workspace.getConfiguration('apexCoder.ai');
			const provider = config.get<string>('provider');
			const modelId = config.get<string>('modelId');
			const baseUrl = config.get<string>('baseUrl');

			if (!provider) {
				console.warn('[Apex Coder] AI provider not configured.');
				return false; // Cannot initialize without provider
			}

			const secretKey = `apexCoder.apiKey.${provider.toLowerCase()}`;
			const apiKey = await context.secrets.get(secretKey);

			if (!apiKey && provider.toLowerCase() !== 'ollama') {
				console.warn(`[Apex Coder] API key for ${provider} not found.`);
				return false; // Cannot initialize without API key (except Ollama)
			}

			const aiConfig: AiConfig = { provider, modelId, apiKey, baseUrl };
			await initializeAiSdkModel(aiConfig);
			currentAiConfig = aiConfig; // Store successful config
			isModelInitialized = true;
			console.log('[Apex Coder] AI Model initialized successfully.');
			return true;
		} catch (error) {
			console.error('[Apex Coder] Failed to initialize AI model:', error);
			vscode.window.showErrorMessage(`Apex Coder: Failed to initialize AI model - ${error}`);
			isModelInitialized = false;
			currentAiConfig = null;
			return false;
		}
	}

	// Attempt initial initialization silently on activation (optional, can be deferred)
	// await tryInitializeModel(); // We'll let the panel trigger the check/init

	// Register command to show the panel
	let currentPanel: vscode.WebviewPanel | undefined = undefined;

	const showPanelCommand = vscode.commands.registerCommand('apex-coder.showPanel', async () => { // Make async
		const columnToShowIn = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		console.log('[Apex Coder] Show Panel command triggered.');

		// If we already have a panel, show it and send current status.
		if (currentPanel) {
			currentPanel.reveal(columnToShowIn);
			console.log('[Apex Coder] Revealed existing panel.');
			// Send current status when revealing existing panel
			const config = vscode.workspace.getConfiguration('apexCoder.ai');
			const provider = config.get<string>('provider');
			const secretKey = provider ? `apexCoder.apiKey.${provider.toLowerCase()}` : undefined;
			const apiKeySet = secretKey ? !!(await context.secrets.get(secretKey)) : false;
			currentPanel.webview.postMessage({
				command: 'configStatus',
				payload: {
					providerSet: !!provider,
					apiKeySet: apiKeySet || provider?.toLowerCase() === 'ollama', // Ollama might not need key
					provider: provider,
					modelId: config.get<string>('modelId')
				}
			});
			return;
		}

		// Otherwise, create a new panel.
		currentPanel = vscode.window.createWebviewPanel(
			'apexCoderPanel',
			'Apex Coder',
			columnToShowIn || vscode.ViewColumn.One,
			{
				enableScripts: true,
				localResourceRoots: [context.extensionUri], // Allow access to the entire extension root (diagnostic step)
				retainContextWhenHidden: true // Keep state when panel is hidden
			}
		);
		console.log('[Apex Coder] Created new panel.');

		// Set the webview's initial html content
		// Set HTML content first
		currentPanel.webview.html = getWebviewContent(currentPanel.webview, context.extensionUri);
		console.log('[Apex Coder] Set panel HTML content.');

		// Send initial config status AFTER panel is created and HTML is set
		const config = vscode.workspace.getConfiguration('apexCoder.ai');
		const provider = config.get<string>('provider');
		const secretKey = provider ? `apexCoder.apiKey.${provider.toLowerCase()}` : undefined;
		const apiKeySet = secretKey ? !!(await context.secrets.get(secretKey)) : false;
		currentPanel.webview.postMessage({
			command: 'configStatus',
			payload: {
				providerSet: !!provider,
				apiKeySet: apiKeySet || provider?.toLowerCase() === 'ollama', // Ollama might not need key
				provider: provider,
				modelId: config.get<string>('modelId')
			}
		});
		console.log('[Apex Coder] Sent initial configStatus to webview.');

		// Handle messages from the webview
	 currentPanel.webview.onDidReceiveMessage(
	 	async message => {
	 		console.log('[Apex Coder] Received message from webview:', message);

	 		switch (message.command) {
	 			case 'alert':
	 				vscode.window.showErrorMessage(message.text);
	 				return;

	 			case 'checkStatus': // Renamed to getConfigStatus for clarity
	 			case 'getConfigStatus':
	 				console.log('[Apex Coder] Handling getConfigStatus command...');
	 				const config = vscode.workspace.getConfiguration('apexCoder.ai');
	 				const provider = config.get<string>('provider');
	 				const secretKey = provider ? `apexCoder.apiKey.${provider.toLowerCase()}` : undefined;
	 				const apiKeySet = secretKey ? !!(await context.secrets.get(secretKey)) : false;
	 				// Also try to initialize model if config seems complete
	 				let modelCheckSuccess = false;
	 				if (provider && (apiKeySet || provider.toLowerCase() === 'ollama')) {
	 					modelCheckSuccess = await tryInitializeModel(); // Attempt init if not already done
	 				} else {
	 					isModelInitialized = false; // Ensure state is false if config incomplete
	 					currentAiConfig = null;
	 				}
	 				currentPanel?.webview.postMessage({
	 					command: 'configStatus', // Send back configStatus
	 					payload: {
	 						providerSet: !!provider,
	 						apiKeySet: apiKeySet || provider?.toLowerCase() === 'ollama',
	 						isModelInitialized: modelCheckSuccess, // Reflects the latest attempt
	 						provider: provider,
	 						modelId: config.get<string>('modelId')
	 					}
	 				});
	 				console.log('[Apex Coder] Sent configStatus to webview.');
	 				return;

	 			case 'saveConfiguration':
	 				console.log('[Apex Coder] Handling saveConfiguration command...');
	 				const { provider: newProvider, modelId: newModelId, apiKey: newApiKey, baseUrl: newBaseUrl } = message.payload;

	 				if (!newProvider) {
	 					vscode.window.showErrorMessage('Provider name is required.');
	 					currentPanel?.webview.postMessage({ command: 'configError', payload: 'Provider name is required.' });
	 					return;
	 				}
	 				if (!newApiKey && newProvider.toLowerCase() !== 'ollama') {
	 					vscode.window.showErrorMessage(`API Key is required for ${newProvider}.`);
	 					currentPanel?.webview.postMessage({ command: 'configError', payload: `API Key is required for ${newProvider}.` });
	 					return;
	 				}

	 				try {
	 					// Update settings (Global scope)
	 					const config = vscode.workspace.getConfiguration('apexCoder.ai');
	 					await config.update('provider', newProvider, vscode.ConfigurationTarget.Global);
	 					await config.update('modelId', newModelId || undefined, vscode.ConfigurationTarget.Global); // Store undefined if empty
	 					await config.update('baseUrl', newBaseUrl || undefined, vscode.ConfigurationTarget.Global); // Store undefined if empty

	 					// Store API key
	 					if (newApiKey) {
	 						const secretKey = `apexCoder.apiKey.${newProvider.toLowerCase()}`;
	 						await context.secrets.store(secretKey, newApiKey);
	 						console.log(`[Apex Coder] API Key stored for provider: ${newProvider}`);
	 					}

	 					// Attempt to initialize the model with new config
	 					const initSuccess = await tryInitializeModel(true); // Force re-initialization

	 					vscode.window.showInformationMessage(`Configuration for ${newProvider} saved successfully.`);
	 					currentPanel?.webview.postMessage({
	 						command: 'configSaved',
	 						payload: {
	 							providerSet: true,
	 							apiKeySet: !!newApiKey || newProvider.toLowerCase() === 'ollama',
	 							isModelInitialized: initSuccess,
	 							provider: newProvider,
	 							modelId: newModelId
	 						}
	 					});
	 					console.log('[Apex Coder] Configuration saved and model re-initialization attempted.');

	 				} catch (error) {
	 					console.error('[Apex Coder] Error saving configuration:', error);
	 					vscode.window.showErrorMessage(`Failed to save configuration: ${error}`);
	 					currentPanel?.webview.postMessage({ command: 'configError', payload: `Failed to save configuration: ${error}` });
	 					isModelInitialized = false; // Ensure state reflects failure
	 					currentAiConfig = null;
	 				}
	 				return;

	 			case 'sendMessage':
	 				console.log('[Apex Coder] Handling sendMessage command...');
	 				// Ensure model is initialized before sending
	 				if (!isModelInitialized) {
	 					// Try to initialize again, maybe config was just set
	 					const initSuccess = await tryInitializeModel();
	 					if (!initSuccess) {
	 						vscode.window.showErrorMessage('Apex Coder: AI Model is not initialized. Please check configuration.');
	 						currentPanel?.webview.postMessage({ command: 'error', payload: 'AI Model not initialized. Check configuration.' });
	 						return;
	 					}
	 				}
	 				if (!message.payload || !message.payload.text) {
	 					vscode.window.showWarningMessage('Apex Coder: Received empty message from webview.');
	 					return;
	 				}

	 				try {
	 					const model = getLanguageModel(); // Should be initialized now
	 					const userMessage = message.payload.text;
	 					console.log(`[Apex Coder] Sending to AI: ${userMessage}`);

	 					const { textStream } = await streamText({ model: model, prompt: userMessage });

	 					const streamId = message.payload.id || Date.now().toString();
	 					console.log(`[Apex Coder] Starting stream ${streamId} to webview...`);
	 					for await (const textPart of textStream) {
	 						currentPanel?.webview.postMessage({
	 							command: 'aiResponseChunk',
	 							payload: { id: streamId, text: textPart }
	 						});
	 					}
	 					console.log(`[Apex Coder] Finished stream ${streamId}.`);
	 					currentPanel?.webview.postMessage({ command: 'aiResponseComplete', payload: { id: streamId } });

	 				} catch (error) {
	 					console.error('[Apex Coder] Error processing AI request:', error);
	 					vscode.window.showErrorMessage(`Apex Coder: AI Request Failed - ${error}`);
	 					currentPanel?.webview.postMessage({ command: 'error', payload: `AI Request Failed: ${error}` });
	 				}
	 				return;
	 		}
	 	},
	 	undefined,
	 	context.subscriptions
	 );
	       console.log('[Apex Coder] Added message listener.');


		// Reset currentPanel when the panel is closed
		currentPanel.onDidDispose(
			() => {
				currentPanel = undefined;
				console.log('[Apex Coder] Panel disposed.');
			},
			null,
			context.subscriptions
		);
	});

	// Register command to set the API key
	const setApiKeyCommand = vscode.commands.registerCommand('apex-coder.setApiKey', async () => {
		console.log('[Apex Coder] Set API Key command triggered.');

		// 1. Prompt for AI Provider
		const provider = await vscode.window.showInputBox({
			prompt: 'Enter AI Provider name (e.g., google, openai, anthropic, ollama)',
			placeHolder: 'google',
			ignoreFocusOut: true, // Keep input box open even if focus moves
		});

		if (!provider) {
			vscode.window.showWarningMessage('API Key setup cancelled: Provider name not entered.');
			return;
		}

		// 2. Prompt for API Key
		const apiKey = await vscode.window.showInputBox({
			prompt: `Enter API Key for ${provider}`,
			password: true, // Mask the input
			ignoreFocusOut: true,
		});

		if (!apiKey) {
			vscode.window.showWarningMessage(`API Key setup cancelled: API Key for ${provider} not entered.`);
			return;
		}

		// 3. Store the API Key securely
		const secretKey = `apexCoder.apiKey.${provider.toLowerCase()}`;
		try {
			await context.secrets.store(secretKey, apiKey);
			vscode.window.showInformationMessage(`API Key for ${provider} stored successfully.`);
			console.log(`[Apex Coder] API Key stored for provider: ${provider}`);
		} catch (error) {
			vscode.window.showErrorMessage(`Failed to store API Key for ${provider}: ${error}`);
			console.error(`[Apex Coder] Error storing API key for ${provider}:`, error);
		}
	});

	context.subscriptions.push(showPanelCommand, setApiKeyCommand);

	console.log('[Apex Coder] Commands registered. Activation finished.');
}

// This method is called when your extension is deactivated
export function deactivate() {
    console.log('[Apex Coder] Deactivating...');
    // Cleanup resources if needed
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
	const nonce = getNonce();

	if (IS_DEVELOPMENT) {
		console.log('[Apex Coder] Generating webview content for DEVELOPMENT (Vite dev server)...');
		// Allow connecting to Vite server (including HMR WebSocket)
		const cspSource = webview.cspSource;
        const devServerSource = DEV_SERVER_URL.replace(/^http:/, 'http:').replace(/^https:/, 'https:'); // Allow http/https
        const wsSource = DEV_SERVER_URL.replace(/^http/, 'ws'); // For HMR WebSocket

		return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<!-- Allow connection to Vite server and inline styles/scripts for HMR -->
			<meta http-equiv="Content-Security-Policy" content="
				default-src 'none';
				connect-src ${cspSource} ${devServerSource} ${wsSource};
				img-src ${cspSource} ${devServerSource} data:;
				script-src 'nonce-${nonce}' ${devServerSource} 'unsafe-eval';
				style-src ${cspSource} ${devServerSource} 'unsafe-inline';
				font-src ${cspSource} ${devServerSource};
			">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Apex Coder (Dev)</title>
			<!-- Inject Vite client and entry point -->
			<script type="module" nonce="${nonce}" src="${DEV_SERVER_URL}/@vite/client"></script>
			<script type="module" nonce="${nonce}" src="${DEV_SERVER_URL}/src/main.ts"></script>
		</head>
		<body>
			<div id="app"></div>
		</body>
		</html>`;

	} else {
		console.log('[Apex Coder] Generating webview content for PRODUCTION (dist build)...');
		const buildPath = vscode.Uri.joinPath(extensionUri, 'webview-ui', 'dist');
		const indexPath = vscode.Uri.joinPath(buildPath, 'index.html');

		if (!fs.existsSync(indexPath.fsPath)) {
			console.error(`[Apex Coder] Error: index.html not found at ${indexPath.fsPath}. Did you run 'pnpm --filter webview-ui build'?`);
			return `<!DOCTYPE html><html><body><h1>Error</h1><p>Webview UI not built. Please run 'pnpm --filter webview-ui build' in the project root.</p></body></html>`;
		}

		let html = fs.readFileSync(indexPath.fsPath, 'utf8');

		// Replace asset paths with webview URIs
		html = html.replace(/(href|src)="(\/assets\/[^"]+)"/g, (match, p1Attribute, p2Path) => {
			const assetPath = p2Path.substring(1);
			const assetUri = webview.asWebviewUri(vscode.Uri.joinPath(buildPath, assetPath));
			console.log(`[Apex Coder] Replacing asset path: ${p2Path} -> ${assetUri}`);
			return `${p1Attribute}="${assetUri}"`;
		});

		// Add production CSP
		html = html.replace(
			'<head>',
			`<head>
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:; connect-src ${webview.cspSource}; font-src ${webview.cspSource};">`
			// No <base> tag needed if paths are absolute webview URIs
		);

		// Add nonce to script tags
		html = html.replace(/<script /g, `<script nonce="${nonce}" `);

		console.log('[Apex Coder] Production webview content generated successfully.');
		return html;
	}
}


// Removed erroneous lines from previous diff

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
