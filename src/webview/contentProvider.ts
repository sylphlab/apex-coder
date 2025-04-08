import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

// --- Development Flag & Settings ---
// Development Flag & Settings --- (Removed IS_DEVELOPMENT constant)
const DEV_SERVER_URL = 'http://127.0.0.1:5173'; // Restore hardcoded URL
// const DEFAULT_VITE_PORT = 5173; // Remove default port variable

/**
 * Generates the HTML content for the webview panel.
 * Handles loading from Vite dev server in development or from the build output in production.
 * @param webview The webview instance.
 * @param extensionUri The extension's root URI.
 * @returns The HTML string for the webview.
 */
export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, extensionMode: vscode.ExtensionMode): string {
    const nonce = getNonce();
    const isDevelopment = extensionMode === vscode.ExtensionMode.Development; // Restore original check
    // Reverted: Force production mode logic even during development to bypass Vite dev server issues
    // const isDevelopment = false;

    if (isDevelopment) {
        logger.info('Generating webview content for DEVELOPMENT (Vite dev server)...');

		let localPort = "5173"; // Default fallback
		try {
			const fs = require("fs");
			const path = require("path");
			const portFilePath = path.resolve(__dirname, "../.vite-port");

			if (fs.existsSync(portFilePath)) {
				localPort = fs.readFileSync(portFilePath, "utf8").trim();
				console.log(`[Apex Coder] Vite port read from file: ${localPort}`);
			} else {
				console.log(`[Apex Coder] Vite port file not found. Using default port: ${localPort}`);
			}
		} catch (err) {
			console.error("[Apex Coder] Error reading Vite port file:", err);
			// Continue with default port if file reading fails
		}

        // Removed dynamic port reading logic
        const localServerUrl = 'localhost:' + localPort; // Use hardcoded URL
        const devServerHttpUri = 'http://localhost:' + localPort; // Use hardcoded URL

		const csp = [
			"default-src 'none'",
			`font-src ${webview.cspSource}`,
			`style-src ${webview.cspSource} 'unsafe-inline' https://* http://${localServerUrl} http://0.0.0.0:${localPort}`,
			`img-src ${webview.cspSource} data:`,
			`script-src 'unsafe-eval' ${webview.cspSource} https://* https://*.posthog.com http://${localServerUrl} http://0.0.0.0:${localPort} 'nonce-${nonce}'`,
			`connect-src https://* https://*.posthog.com ws://${localServerUrl} ws://0.0.0.0:${localPort} http://${localServerUrl} http://0.0.0.0:${localPort}`,
		];

		const reactRefresh = /*html*/ `
			<script nonce="${nonce}" type="module">
				import RefreshRuntime from "http://localhost:${localPort}/@react-refresh"
				RefreshRuntime.injectIntoGlobalHook(window)
				window.$RefreshReg$ = () => {}
				window.$RefreshSig$ = () => (type) => type
				window.__vite_plugin_react_preamble_installed__ = true
			</script>
		`;


        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="${csp.join("; ")}">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Apex Coder (Dev)</title>
            <script type="module" nonce="${nonce}" src="${devServerHttpUri}/@vite/client"></script>
            <script type="module" nonce="${nonce}" src="${devServerHttpUri}/src/main.tsx"></script>
        </head>
        <body>
            <div id="app">
				${reactRefresh}
            </div>
        </body>
        </html>`;
    } else {
        logger.info('Generating webview content for PRODUCTION (dist build)...');
        const buildPath = vscode.Uri.joinPath(extensionUri, 'webview-ui', 'dist');
        const indexPath = vscode.Uri.joinPath(buildPath, 'index.html');

        if (!fs.existsSync(indexPath.fsPath)) {
            logger.error(`Error: index.html not found at ${indexPath.fsPath}. Did you run 'pnpm --filter webview-ui build'?`);
            return `<!DOCTYPE html><html><body><h1>Error</h1><p>Webview UI not built. Please run 'pnpm --filter webview-ui build' in the project root.</p></body></html>`;
        }

        let html = fs.readFileSync(indexPath.fsPath, 'utf8');

        // Replace asset paths with webview URIs
        // Use a more general regex to capture all root-relative paths starting with /
        html = html.replace(/(href|src)="(\/[^\"\?]+)(\?[^\"]*)?"/g, (match, p1Attribute, p2Path, p3Query) => {
            const assetPath = p2Path.substring(1); // Remove leading slash
            const assetUri = webview.asWebviewUri(vscode.Uri.joinPath(buildPath, assetPath));
            // logger.info(`Replacing asset path: ${p2Path} -> ${assetUri}`);
            return `${p1Attribute}="${assetUri}${p3Query || ''}"`;
        });

        // Inject CSP meta tag and nonce
        const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:; connect-src ${webview.cspSource}; font-src ${webview.cspSource};`;
        html = html.replace(
            '<head>',
            `<head>
            <meta http-equiv="Content-Security-Policy" content="${csp}">`
        );
        html = html.replace(/<script /g, `<script nonce="${nonce}" `);
        // Also add nonce to link tags with rel="modulepreload" if Vite generates them
        html = html.replace(/<link rel="modulepreload" /g, `<link rel="modulepreload" nonce="${nonce}" `);

        logger.info('Production webview content generated successfully.');
        return html;
    }
}

/**
 * Generates a random nonce string for Content Security Policy.
 * @returns A random nonce string.
 */
function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
