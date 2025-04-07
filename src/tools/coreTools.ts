import { tool } from 'ai';
import { z } from 'zod';
import * as vscode from 'vscode';
import { logger } from '../utils/logger';

// Define interfaces for tool results to ensure consistency
interface ToolResultPayload {
    toolName: string;
    success: boolean;
    message: string;
    path: string;
    error?: string;
    content?: string; // For readFileTool
}

/**
 * Helper function to post tool results back to the webview.
 * @param panel The current webview panel or undefined.
 * @param payload The result payload.
 */
function postToolResult(panel: vscode.WebviewPanel | undefined, payload: ToolResultPayload): void {
    panel?.webview.postMessage({ command: 'toolResult', payload });
}

/**
 * Defines the tool for opening a file in the VS Code editor.
 * Note: The execute function needs the currentPanel to post messages back.
 */
export const openFileToolDefinition = {
    description: 'Opens a file in the VSCode editor using a relative path from the workspace root.',
    parameters: z.object({
        path: z.string().describe('Workspace-relative file path (e.g., "src/extension.ts")'),
    }),
    /**
     * Executes the open file tool.
     * @param args - The arguments for the tool.
     * @param args.path - The relative path of the file to open.
     * @param currentPanel - The active webview panel to post messages to.
     * @returns An object indicating success or failure, including the path.
     */
    async execute(args: { path: string }, currentPanel: vscode.WebviewPanel | undefined): Promise<object> {
        const { path: relativePath } = args;
        logger.info(`[Tool] Executing openFileTool for path: ${relativePath}`);
        let resultPayload: ToolResultPayload | undefined = undefined; // Initialize here
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                throw new Error('No workspace folder is open.');
            }
            // Use the first workspace folder as the root
            const rootUri = workspaceFolders[0].uri;
            const absolutePath = vscode.Uri.joinPath(rootUri, relativePath);

            // Check if the file exists before trying to open it
            try {
                await vscode.workspace.fs.stat(absolutePath);
            } catch (statError) {
                throw new Error(`File not found at path: ${relativePath}`);
            }

            const document = await vscode.workspace.openTextDocument(absolutePath);
            await vscode.window.showTextDocument(document);
            const successMsg = `Successfully opened file: ${relativePath}`;
            logger.info(`[Tool] ${successMsg}`);
            resultPayload = { toolName: 'openFile', success: true, message: successMsg, path: relativePath };
        } catch (error: unknown) {
            const errorMsg = `Failed to open file "${relativePath}": ${error instanceof Error ? error.message : String(error)}`;
            logger.error(`[Tool] Error opening file ${relativePath}:`, error);
            vscode.window.showErrorMessage(errorMsg);
            resultPayload = { toolName: 'openFile', success: false, message: errorMsg, path: relativePath, error: error instanceof Error ? error.message : String(error) };
        } finally {
             if (resultPayload !== undefined) { // Now this check is safe
                 postToolResult(currentPanel, resultPayload);
             }
        }
         // Return based on the final state of resultPayload
        return resultPayload ? { success: resultPayload.success, path: resultPayload.path, error: resultPayload.error } : { success: false, path: relativePath, error: 'Unknown error occurred' };
    }
};

/**
 * Defines the tool for reading the content of a file.
 * Note: The execute function needs the currentPanel to post messages back.
 */
export const readFileToolDefinition = {
    description: 'Reads the content of a specified file in the VS Code workspace.',
    parameters: z.object({
        path: z.string().describe('The relative path to the file to read (e.g., "src/main.ts").'),
    }),
    /**
     * Executes the read file tool.
     * @param args - The arguments for the tool.
     * @param args.path - The relative path of the file to read.
     * @param currentPanel - The active webview panel to post messages to.
     * @returns An object indicating success or failure, including the path and truncated content.
     */
    async execute(args: { path: string }, currentPanel: vscode.WebviewPanel | undefined): Promise<object> {
        const { path: relativePath } = args;
        logger.info(`[Tool] Executing readFileTool for path: ${relativePath}`);
        let resultPayload: ToolResultPayload | undefined = undefined; // Initialize here
        let returnPayload: object | undefined = undefined; // Separate payload for return value
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                throw new Error('No workspace folder is open.');
            }
            const rootUri = workspaceFolders[0].uri;
            const absolutePath = vscode.Uri.joinPath(rootUri, relativePath);

            // Check if the file exists before trying to read it
            try {
                await vscode.workspace.fs.stat(absolutePath);
            } catch (statError) {
                throw new Error(`File not found at path: ${relativePath}`);
            }

            const fileContentBytes = await vscode.workspace.fs.readFile(absolutePath);
            const fileContent = new TextDecoder().decode(fileContentBytes);
            const successMsg = `Successfully read file: ${relativePath}`;
            logger.info(`[Tool] ${successMsg}`);

            // Truncate content for AI model context
            const maxChars = 5000; // Limit context size
            const truncatedContent = fileContent.length > maxChars
                ? fileContent.substring(0, maxChars) + '\n... [truncated]'
                : fileContent;

            resultPayload = { toolName: 'readFile', success: true, message: successMsg, path: relativePath };
            // Return truncated content for the AI model
            returnPayload = { success: true, path: relativePath, content: truncatedContent };

        } catch (error: unknown) {
            const errorMsg = `Failed to read file "${relativePath}": ${error instanceof Error ? error.message : String(error)}`;
            logger.error(`[Tool] Error reading file ${relativePath}:`, error);
            vscode.window.showErrorMessage(errorMsg);
            resultPayload = { toolName: 'readFile', success: false, message: errorMsg, path: relativePath, error: error instanceof Error ? error.message : String(error) };
            // Return error status for the AI model
            returnPayload = { success: false, path: relativePath, error: resultPayload.error };
        } finally {
            // Ensure message is posted even if return happens earlier in try block
            if (resultPayload !== undefined) {
                postToolResult(currentPanel, resultPayload);
            }
        }
        return returnPayload ?? { success: false, path: relativePath, error: 'Unknown error occurred' }; // Return the prepared payload or a default error
    }
};

// Function to create the tools object, injecting the panel dependency
export function createCoreTools(panel: vscode.WebviewPanel | undefined) {
    return {
        openFile: tool({
            ...openFileToolDefinition,
            execute: (args) => openFileToolDefinition.execute(args, panel),
        }),
        readFile: tool({
            ...readFileToolDefinition,
            execute: (args) => readFileToolDefinition.execute(args, panel),
        }),
    };
}
