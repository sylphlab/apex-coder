import * as vscode from 'vscode';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { logger } from '../utils/logger';

// --- Development Flag & Settings ---
// Default port if .vite.port file is not found or invalid
const DEFAULT_DEV_PORT = 5173;

// --- Moved Helper ---
/**
 * Generates a random nonce string for Content Security Policy.
 * @returns A random nonce string.
 */
function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let index = 0; index < 32; index++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

/**
 * Generates the HTML content for the webview panel.
 * Handles loading from Vite dev server in development or from the build output in production.
 * @param webview The webview instance.
 * @param extensionUri The extension's root URI.
 * @param extensionMode The current VS Code extension mode (Development or Production).
 * @param workspaceRootPath The determined workspace root path (passed from PanelManager).
 * @returns The HTML string for the webview.
 */
export function getWebviewContent(
  webview: vscode.Webview,
  extensionUri: vscode.Uri,
  extensionMode: vscode.ExtensionMode,
  workspaceRootPath: string | undefined,
): string {
  const nonce = getNonce();
  const isDevelopment = extensionMode === vscode.ExtensionMode.Development;

  if (isDevelopment) {
    logger.info('Generating webview content for DEVELOPMENT (Vite dev server).');

    let developmentPort = DEFAULT_DEV_PORT;
    let portFilePath = '';

    // Use the workspace root path passed from PanelManager
    if (workspaceRootPath) {
      portFilePath = path.join(workspaceRootPath, '.vite.port');
      logger.info(`Using workspace root path provided by PanelManager: ${workspaceRootPath}`);
      logger.info(`Looking for .vite.port file at: ${portFilePath}`);

      try {
        if (fs.existsSync(portFilePath)) {
          const portFileContent = fs.readFileSync(portFilePath, 'utf8').trim();
          const parsedPort = Number.parseInt(portFileContent, 10);
          if (!isNaN(parsedPort) && parsedPort > 0 && parsedPort < 65_536) {
            developmentPort = parsedPort;
            logger.info(
              `Successfully read Vite dev server port ${developmentPort} from ${portFilePath}`,
            );
          } else {
            logger.warn(
              `Invalid port number "${portFileContent}" found in ${portFilePath}. Falling back to default port ${DEFAULT_DEV_PORT}.`,
            );
          }
        } else {
          logger.warn(
            `.vite.port file not found at ${portFilePath}. Falling back to default port ${DEFAULT_DEV_PORT}.`,
          );
        }
      } catch (error) {
        logger.error(
          `Error reading or parsing ${portFilePath}: ${error}. Falling back to default port ${DEFAULT_DEV_PORT}.`,
        );
      }
    } else {
      // This case should ideally not happen if activation logic is correct, but good to handle.
      logger.error(
        'Workspace root path was not provided to getWebviewContent. Cannot locate .vite.port. Falling back to default port.',
      );
    }

    const developmentServerBaseUrl = `http://127.0.0.1:${developmentPort}`;
    const developmentServerHttpUri = developmentServerBaseUrl;
    // const devServerWsUri = devServerBaseUrl.replace(/^http/, "ws"); // Unused variable

    // In development, we need to allow connections to the Vite dev server
    // Note: Looser CSP for development convenience.
    const csp = `
            default-src 'none';
            connect-src 'self' ${webview.cspSource} http://127.0.0.1:${String(developmentPort)} ws://127.0.0.1:${String(developmentPort)} http://localhost:* ws://localhost:*;
            img-src 'self' ${webview.cspSource} http://127.0.0.1:${String(developmentPort)} http://localhost:* data:;
            script-src 'self' ${webview.cspSource} http://127.0.0.1:${String(developmentPort)} http://localhost:* 'unsafe-inline' 'unsafe-eval';
            style-src 'self' ${webview.cspSource} http://127.0.0.1:${String(developmentPort)} http://localhost:* 'unsafe-inline';
            font-src 'self' ${webview.cspSource} http://127.0.0.1:${String(developmentPort)} http://localhost:*;
        `
      .replaceAll(/\s{2,}/g, ' ')
      .trim();

    // Note: Nonce is still generated but not used in script-src for dev mode currently
    return `<!DOCTYPE html>\n        <html lang="en">\n        <head>\n            <meta charset="UTF-8">\n            <meta http-equiv="Content-Security-Policy" content="${csp}">\n            <meta name="viewport" content="width=device-width, initial-scale=1.0">\n            <title>Apex Coder (Dev)</title>\n            <script type="module" nonce="${nonce}" src="${developmentServerHttpUri}/@vite/client"></script>\n            <script type="module" nonce="${nonce}" src="${developmentServerHttpUri}/src/main.ts"></script>\n        </head>\n        <body>\n            <div id="app"></div>\n        </body>\n        </html>`;
  } else {
    logger.info('Generating webview content for PRODUCTION (dist build)...');
    const buildPath = vscode.Uri.joinPath(extensionUri, 'webview-ui', 'dist');
    const indexPath = vscode.Uri.joinPath(buildPath, 'index.html');

    if (!fs.existsSync(indexPath.fsPath)) {
      logger.error(
        `Error: index.html not found at ${indexPath.fsPath}. Did you run 'pnpm --filter webview-ui build'?`,
      );
      return `<!DOCTYPE html><html><body><h1>Error</h1><p>Webview UI not built. Please run 'pnpm --filter webview-ui build' in the project root.</p></body></html>`;
    }

    let html = fs.readFileSync(indexPath.fsPath, 'utf8');

    // Replace asset paths with webview URIs
    html = html.replaceAll(
      /(href|src)="(\/assets\/[^"?]+)(\?[^"]*)?"/g,
      (_match, p1Attribute: string, p2Path: string, p3Query?: string): string => {
        const assetPath = p2Path.slice(1);
        const assetUri = webview.asWebviewUri(vscode.Uri.joinPath(buildPath, assetPath));
        return `${p1Attribute}="${assetUri.toString(true)}${p3Query ?? ''}"`;
      },
    );

    // Inject CSP meta tag and nonce
    // Define CSP string directly without unnecessary replacements
    const csp = `default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src ${webview.cspSource} data:; connect-src ${webview.cspSource}; font-src ${webview.cspSource};`;
    // Ensure replacement happens correctly
    html = html.replace(
      '<head>',
      `<head>\n            <meta http-equiv="Content-Security-Policy" content="${csp}">`,
    );
    // Use global flag for script and link replacements
    html = html.replaceAll('<script ', `<script nonce="${nonce}" `);
    html = html.replaceAll(
      '<link rel="modulepreload" ',
      `<link rel="modulepreload" nonce="${nonce}" `,
    );

    logger.info('Production webview content generated successfully.');
    return html;
  }
}
