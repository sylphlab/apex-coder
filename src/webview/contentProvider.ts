import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../utils/logger';

// --- Development Flag & Settings ---
// Default port if .vite.port file is not found or invalid
const DEFAULT_DEV_PORT = 5173;

/**
 * Generates the HTML content for the webview panel.
 * Handles loading from Vite dev server in development or from the build output in production.
 * @param webview The webview instance.
 * @param extensionUri The extension's root URI.
 * @returns The HTML string for the webview.
 */
export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri, extensionMode: vscode.ExtensionMode): string {
    const nonce = getNonce();
    const isDevelopment = extensionMode === vscode.ExtensionMode.Development;

    if (isDevelopment) {
        logger.info('Generating webview content for DEVELOPMENT (Vite dev server).');

        let devPort = DEFAULT_DEV_PORT;
        // Construct the path to the .vite.port file in the workspace root
        const portFilePath = path.join(extensionUri.fsPath, '..', '.vite.port'); // Go up one level from extension root

        try {
            if (fs.existsSync(portFilePath)) {
                const portFileContent = fs.readFileSync(portFilePath, 'utf8').trim();
                const parsedPort = parseInt(portFileContent, 10);
                if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort < 65536) {
                    devPort = parsedPort;
                    logger.info(`Successfully read Vite dev server port ${devPort} from ${portFilePath}`);
                } else {
                    logger.warn(`Invalid port number "${portFileContent}" found in ${portFilePath}. Falling back to default port ${DEFAULT_DEV_PORT}.`);
                }
            } else {
                logger.warn(`.vite.port file not found at ${portFilePath}. Falling back to default port ${DEFAULT_DEV_PORT}.`);
            }
        } catch (error) {
            logger.error(`Error reading or parsing ${portFilePath}: ${error}. Falling back to default port ${DEFAULT_DEV_PORT}.`);
        }

        const devServerBaseUrl = `http://127.0.0.1:${devPort}`;
        const devServerHttpUri = devServerBaseUrl; // HTTP is the same
        const devServerWsUri = devServerBaseUrl.replace(/^http/, 'ws'); // Replace http with ws for WebSocket

        // In development, we need to allow connections to the Vite dev server
        // Note: Looser CSP for development convenience.
        const cspSource = webview.cspSource;

        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta http-equiv="Content-Security-Policy" content="
                default-src 'none';
                connect-src ${cspSource} ${devServerHttpUri} ${devServerWsUri};
                img-src ${cspSource} ${devServerHttpUri} data:;
                script-src 'nonce-${nonce}' ${devServerHttpUri} 'unsafe-eval'; /* Keep unsafe-eval for HMR */
                style-src ${cspSource} ${devServerHttpUri} 'unsafe-inline';
                font-src ${cspSource} ${devServerHttpUri};
            ">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Apex Coder (Dev)</title>
            <script type="module" nonce="${nonce}" src="${devServerHttpUri}/@vite/client"></script>
            <script type="module" nonce="${nonce}" src="${devServerHttpUri}/src/main.ts"></script>
        </head>
        <body>
            <div id="app"></div>
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
        html = html.replace(/(href|src)="(\/assets\/[^\"\?]+)(\?[^\"]*)?"/g, (match, p1Attribute, p2Path, p3Query) => {
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
