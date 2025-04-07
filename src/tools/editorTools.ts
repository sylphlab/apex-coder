import { z } from 'zod';
import * as vscode from 'vscode';
import { logger } from '../utils/logger';
import { ToolResultPayload, postToolResult, handleToolError } from './coreTools';

/**
 * Defines the tool for opening a file in the VS Code editor.
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
     * @returns An object indicating success or failure for the AI model.
     */
    async execute(args: { path: string }, currentPanel: vscode.WebviewPanel | undefined): Promise<object> {
        const { path: relativePath } = args;
        logger.info(`[Tool] Executing openFile for path: ${relativePath}`);
        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders || workspaceFolders.length === 0) {
                throw new Error('No workspace folder is open.');
            }
            const rootUri = workspaceFolders[0].uri;
            const absolutePath = vscode.Uri.joinPath(rootUri, relativePath);

            // Check if the file exists before trying to open it
            try {
                const stat = await vscode.workspace.fs.stat(absolutePath);
                 if (stat.type === vscode.FileType.Directory) {
                    throw new Error('Path is a directory, not a file.');
                }
            } catch (statError: any) {
                 if (statError.code === 'FileNotFound' || statError.code === 'EntryNotFound') {
                     throw new Error(`File not found at path: ${relativePath}`);
                 }
                 throw statError; // Re-throw other stat errors
            }

            const document = await vscode.workspace.openTextDocument(absolutePath);
            await vscode.window.showTextDocument(document);

            const successMsg = `Successfully opened file: ${relativePath}`;
            logger.info(`[Tool] ${successMsg}`);
            const resultPayload: ToolResultPayload = {
                toolName: 'openFile',
                success: true,
                message: successMsg,
                path: relativePath
            };
            postToolResult(currentPanel, resultPayload);
            // Return success payload for AI model
            return { success: true, path: relativePath };

        } catch (error: unknown) {
            const { returnPayload } = handleToolError(error, 'openFile', currentPanel, args);
            return returnPayload; // Return standardized error payload for AI model
        }
    }
};
