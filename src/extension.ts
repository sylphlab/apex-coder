import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { initializeAiSdkModel, getLanguageModel, AiConfig } from './ai-sdk/configLoader';
import { streamText, tool } from 'ai';
import { z } from 'zod';

// --- Development Flag ---
const IS_DEVELOPMENT = true; // <<< CHANGE THIS FOR PRODUCTION BUILD
const DEV_SERVER_URL = 'http://localhost:5173'; // Default Vite dev server port

export async function activate(context: vscode.ExtensionContext) {

	console.log('[Apex Coder] Activating extension...');

	// Model initialization state
	let isModelInitialized = false;
	let currentAiConfig: AiConfig | null = null;

	// Webview Panel state
	let currentPanel: vscode.WebviewPanel | undefined = undefined;

	// --- Tool Definitions (Defined inside activate to access currentPanel) ---

	const openFileTool = tool({
		description: 'Opens a file in the VSCode editor using a relative path from the workspace root.',
		parameters: z.object({
			path: z.string().describe('Workspace-relative file path (e.g., "src/extension.ts")'),
		}),
		async execute({ path: relativePath }) {
			console.log(`[Apex Coder Tool EXECUTE] openFileTool called with path: ${relativePath}`);
			try {
				const workspaceFolders = vscode.workspace.workspaceFolders;
				if (!workspaceFolders) throw new Error('No workspace folder open.');
				const absolutePath = vscode.Uri.joinPath(workspaceFolders[0].uri, relativePath);
				const document = await vscode.workspace.openTextDocument(absolutePath);
				await vscode.window.showTextDocument(document);
				const successMsg = `Successfully opened file: ${relativePath}`;
				console.log(`[Apex Coder Tool] ${successMsg}`);
				// Send result back to webview BEFORE returning result to SDK
				currentPanel?.webview.postMessage({ command: 'toolResult', payload: { toolName: 'openFile', success: true, message: successMsg, path: relativePath } });
				return { success: true, path: relativePath }; // Return result for AI SDK
			} catch (error: any) {
				const errorMsg = `Failed to open file "${relativePath}": ${error.message}`;
				console.error(`[Apex Coder Tool] Error opening file ${relativePath}:`, error);
				vscode.window.showErrorMessage(errorMsg);
				// Send result back to webview BEFORE returning result to SDK
				currentPanel?.webview.postMessage({ command: 'toolResult', payload: { toolName: 'openFile', success: false, message: errorMsg, path: relativePath, error: error.message } });
				return { success: false, path: relativePath, error: error.message }; // Return result for AI SDK
			}
		}
	});

	const readFileTool = tool({
		description: 'Reads the content of a specified file in the VS Code workspace.',
		parameters: z.object({
			path: z.string().describe('The relative path to the file to read (e.g., "src/main.ts").'),
		}),
		async execute({ path: relativePath }) {
			console.log(`[Apex Coder Tool EXECUTE] readFileTool called with path: ${relativePath}`);
			try {
				const workspaceFolders = vscode.workspace.workspaceFolders;
				if (!workspaceFolders) throw new Error('No workspace folder open.');
				const absolutePath = vscode.Uri.joinPath(workspaceFolders[0].uri, relativePath);
				const fileContentBytes = await vscode.workspace.fs.readFile(absolutePath);
				const fileContent = new TextDecoder().decode(fileContentBytes);
				console.log(`[Apex Coder Tool] Successfully read file: ${relativePath}`);
				const maxChars = 5000;
				const truncatedContent = fileContent.length > maxChars
					? fileContent.substring(0, maxChars) + '\n... [truncated]'
					: fileContent;
				const successMsg = `Successfully read file: ${relativePath}`;
				console.log(`[Apex Coder Tool] ${successMsg}`);
				// Send result back to webview BEFORE returning result to SDK
				currentPanel?.webview.postMessage({ command: 'toolResult', payload: { toolName: 'readFile', success: true, message: successMsg, path: relativePath } });
				// Return content for the AI model
				return { success: true, path: relativePath, content: truncatedContent }; // Return result for AI SDK
			} catch (error: any) {
				const errorMsg = `Failed to read file "${relativePath}": ${error.message}`;
				console.error(`[Apex Coder Tool] Error reading file ${relativePath}:`, error);
				vscode.window.showErrorMessage(errorMsg);
				// Send result back to webview BEFORE returning result to SDK
				currentPanel?.webview.postMessage({ command: 'toolResult', payload: { toolName: 'readFile', success: false, message: errorMsg, path: relativePath, error: error.message } });
				return { success: false, path: relativePath, error: error.message }; // Return result for AI SDK
			}
		}
	});
	// --- End Tool Definitions ---

	// Helper function to attempt model initialization
	async function tryInitializeModel(forceReinitialize = false): Promise<boolean> {
		if (isModelInitialized && !forceReinitialize) {
			console.log('[Apex Coder] Model already initialized.');
			return true;
		}
		console.log('[Apex Coder] Attempting to initialize AI model...');
		isModelInitialized = false;
		currentAiConfig = null;
		try {
			const config = vscode.workspace.getConfiguration('apexCoder.ai');
			const provider = config.get<string>('provider');
			const modelId = config.get<string>('modelId');
			const baseUrl = config.get<string>('baseUrl');
			if (!provider) {
				console.warn('[Apex Coder] AI provider not configured.');
				return false;
			}
			const secretKey = `apexCoder.apiKey.${provider.toLowerCase()}`;
			const apiKey = await context.secrets.get(secretKey);
			if (!apiKey && provider.toLowerCase() !== 'ollama') {
				console.warn(`[Apex Coder] API key for ${provider} not found.`);
				return false;
			}
			const aiConfig: AiConfig = { provider, modelId, apiKey, baseUrl };
			await initializeAiSdkModel(aiConfig);
			currentAiConfig = aiConfig;
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

	// Register command to show the panel
	const showPanelCommand = vscode.commands.registerCommand('apex-coder.showPanel', async () => {
		const columnToShowIn = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;
		console.log('[Apex Coder] Show Panel command triggered.');
		if (currentPanel) {
			currentPanel.reveal(columnToShowIn);
			console.log('[Apex Coder] Revealed existing panel.');
			const config = vscode.workspace.getConfiguration('apexCoder.ai');
			const provider = config.get<string>('provider');
			const secretKey = provider ? `apexCoder.apiKey.${provider.toLowerCase()}` : undefined;
			const apiKeySet = secretKey ? !!(await context.secrets.get(secretKey)) : false;
			currentPanel.webview.postMessage({
				command: 'configStatus',
				payload: {
					providerSet: !!provider,
					apiKeySet: apiKeySet || provider?.toLowerCase() === 'ollama',
					provider: provider,
					modelId: config.get<string>('modelId')
				}
			});
			return;
		}
		currentPanel = vscode.window.createWebviewPanel(
			'apexCoderPanel', 'Apex Coder', columnToShowIn || vscode.ViewColumn.One,
			{ enableScripts: true, localResourceRoots: [context.extensionUri], retainContextWhenHidden: true }
		);
		console.log('[Apex Coder] Created new panel.');
		currentPanel.webview.html = getWebviewContent(currentPanel.webview, context.extensionUri);
		console.log('[Apex Coder] Set panel HTML content.');
		const config = vscode.workspace.getConfiguration('apexCoder.ai');
		const provider = config.get<string>('provider');
		const secretKey = provider ? `apexCoder.apiKey.${provider.toLowerCase()}` : undefined;
		const apiKeySet = secretKey ? !!(await context.secrets.get(secretKey)) : false;
		currentPanel.webview.postMessage({
			command: 'configStatus',
			payload: {
				providerSet: !!provider,
				apiKeySet: apiKeySet || provider?.toLowerCase() === 'ollama',
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
					case 'checkStatus':
					case 'getConfigStatus':
						console.log('[Apex Coder] Handling getConfigStatus command...');
						const config = vscode.workspace.getConfiguration('apexCoder.ai');
						const provider = config.get<string>('provider');
						const secretKey = provider ? `apexCoder.apiKey.${provider.toLowerCase()}` : undefined;
						const apiKeySet = secretKey ? !!(await context.secrets.get(secretKey)) : false;
						let modelCheckSuccess = false;
						if (provider && (apiKeySet || provider.toLowerCase() === 'ollama')) {
							modelCheckSuccess = await tryInitializeModel();
						} else {
							isModelInitialized = false;
							currentAiConfig = null;
						}
						currentPanel?.webview.postMessage({
							command: 'configStatus',
							payload: {
								providerSet: !!provider,
								apiKeySet: apiKeySet || provider?.toLowerCase() === 'ollama',
								isModelInitialized: modelCheckSuccess,
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
							const config = vscode.workspace.getConfiguration('apexCoder.ai');
							await config.update('provider', newProvider, vscode.ConfigurationTarget.Global);
							await config.update('modelId', newModelId || undefined, vscode.ConfigurationTarget.Global);
							await config.update('baseUrl', newBaseUrl || undefined, vscode.ConfigurationTarget.Global);
							if (newApiKey) {
								const secretKey = `apexCoder.apiKey.${newProvider.toLowerCase()}`;
								await context.secrets.store(secretKey, newApiKey);
								console.log(`[Apex Coder] API Key stored for provider: ${newProvider}`);
							}
							const initSuccess = await tryInitializeModel(true);
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
							isModelInitialized = false;
							currentAiConfig = null;
						}
						return;
					case 'sendMessage':
						console.log('[Apex Coder] Handling sendMessage command...');
						if (!isModelInitialized) {
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
							const model = getLanguageModel();
							const userMessage = message.payload.text;
							const streamId = message.payload.id || Date.now().toString();
							// Define the tools object with both tools (now inside activate scope)
							const toolsToPass = {
								openFile: openFileTool,
								readFile: readFileTool
							};
							console.log(`[Apex Coder] Sending to AI: ${userMessage}`);
							console.log('[Apex Coder] Tools being passed to streamText:', Object.keys(toolsToPass));

							// Call streamText with tools and onChunk handler
							const result = await streamText({
								model: model,
								prompt: userMessage,
								tools: toolsToPass, // Pass both tools
								async onChunk({ chunk }) {
									// console.log('[Apex Coder] Received chunk:', chunk);
									switch (chunk.type) {
										case 'text-delta':
											currentPanel?.webview.postMessage({
												command: 'aiResponseChunk',
												payload: { id: streamId, text: chunk.textDelta }
											});
											break;
										case 'reasoning':
											console.log(`[Apex Coder] Received chunk type: ${chunk.type}`, chunk.textDelta);
											currentPanel?.webview.postMessage({
												command: 'aiThinkingStep',
												payload: { id: streamId, text: chunk.textDelta }
											});
											break;
										case 'tool-call':
											console.log(`[Apex Coder] Received chunk type: ${chunk.type}`, chunk);
											currentPanel?.webview.postMessage({
												command: 'aiThinkingStep',
												payload: { id: streamId, text: `Calling tool: ${chunk.toolName}...` }
											});
											break;
										case 'source':
										case 'tool-call-streaming-start':
										case 'tool-call-delta':
											console.log(`[Apex Coder] Received chunk type: ${chunk.type}`, chunk);
											break;
									}
								}
							});

							// Await the streamText promise to complete the full cycle, including tool execution and final response generation
							const finalResult = await result;

							// Log the final result object after the stream is fully processed
							try {
								console.log('[Apex Coder] streamText final result properties:', {
									finishReason: finalResult.finishReason,
									usage: finalResult.usage,
									// toolCalls: finalResult.toolCalls, // Optional: Log if needed
									// toolResults: finalResult.toolResults // Optional: Log if needed
								});
							} catch (logError) {
								console.error('[Apex Coder] Error logging final streamText result:', logError);
							}

							console.log(`[Apex Coder] Finished stream ${streamId}. Sending aiResponseComplete.`);
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
		const provider = await vscode.window.showInputBox({
			prompt: 'Enter AI Provider name (e.g., google, openai, anthropic, ollama)',
			placeHolder: 'google',
			ignoreFocusOut: true,
		});
		if (!provider) {
			vscode.window.showWarningMessage('API Key setup cancelled: Provider name not entered.');
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

	vscode.commands.executeCommand('apex-coder.showPanel');
	console.log('[Apex Coder] Automatically triggered showPanel command on startup.');
}

export function deactivate() {
    console.log('[Apex Coder] Deactivating...');
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
	const nonce = getNonce();
	if (IS_DEVELOPMENT) {
		console.log('[Apex Coder] Generating webview content for DEVELOPMENT (Vite dev server)...');
		const cspSource = webview.cspSource;
        const devServerSource = DEV_SERVER_URL.replace(/^http:/, 'http:').replace(/^https:/, 'https:');
        const wsSource = DEV_SERVER_URL.replace(/^http/, 'ws');
		return `<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
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
		html = html.replace(/(href|src)="(\/assets\/[^"]+)"/g, (match, p1Attribute, p2Path) => {
			const assetPath = p2Path.substring(1);
			const assetUri = webview.asWebviewUri(vscode.Uri.joinPath(buildPath, assetPath));
			console.log(`[Apex Coder] Replacing asset path: ${p2Path} -> ${assetUri}`);
			return `${p1Attribute}="${assetUri}"`;
		});
		html = html.replace(
			'<head>',
			`<head>
			<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:; connect-src ${webview.cspSource}; font-src ${webview.cspSource};">`
		);
		html = html.replace(/<script /g, `<script nonce="${nonce}" `);
		console.log('[Apex Coder] Production webview content generated successfully.');
		return html;
	}
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
