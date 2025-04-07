import * as vscode from 'vscode';
import { logger } from '../utils/logger';
import { z } from 'zod'; // Keep Zod import if needed for shared types/functions later

// Define interfaces for tool results to ensure consistency
export interface ToolResultPayload {
    toolName: string;
    success: boolean;
    message: string;
    path?: string; // Make path optional as not all tools might have it
    error?: string;
    content?: string; // For readFileTool or similar
    // Add other potential shared fields if needed
}

// Define a more specific type for filesystem results if common fields exist
// Example (can be refined or moved to specific tool files if too diverse):
export interface FilesystemResultPayload extends ToolResultPayload {
    path: string; // Filesystem tools usually have a path
    isDirectory?: boolean;
    stats?: {
        isFile: boolean;
        isDirectory: boolean;
        size: number;
        ctime: number; // Creation time (milliseconds since epoch)
        mtime: number; // Modification time (milliseconds since epoch)
    };
    items?: string[]; // For listDirectory
}


/**
 * Helper function to post tool results back to the webview.
 * @param panel The current webview panel or undefined.
 * @param payload The result payload.
 */
export function postToolResult(panel: vscode.WebviewPanel | undefined, payload: ToolResultPayload): void {
    if (!panel) {
        logger.warn(`[Tool] Attempted to post result for ${payload.toolName} but panel is undefined.`);
        return;
    }
    try {
        panel.webview.postMessage({ command: 'toolResult', payload });
        logger.info(`[Tool] Posted result for ${payload.toolName} to webview.`);
    } catch (error) {
        logger.error(`[Tool] Failed to post message to webview for ${payload.toolName}:`, error);
        // Consider if we should show a VS Code error message here as well
    }
}

/**
 * Standardized error handler for tools.
 * Logs the error, shows a VS Code error message, posts the result to the webview,
 * and returns a standardized error payload for the AI model.
 * @param error The caught error object.
 * @param toolName The name of the tool where the error occurred.
 * @param panel The active webview panel.
 * @param args The arguments passed to the tool (used to extract path primarily).
 * @returns A standardized error object for the AI model.
 */
export function handleToolError(
    error: unknown,
    toolName: string,
    panel: vscode.WebviewPanel | undefined,
    args: { path?: string; directoryPath?: string; [key: string]: any } // Expect path or directoryPath in args if relevant
): ToolResultPayload & { returnPayload: object } { // Combine for easier handling
    const path = args.path ?? args.directoryPath ?? 'N/A'; // Use path or directoryPath from args if available
    const errorMessage = error instanceof Error ? error.message : String(error);
    const fullErrorMsg = `Error in tool "${toolName}" for path "${path}": ${errorMessage}`;

    logger.error(`[Tool] ${fullErrorMsg}`, error);
    vscode.window.showErrorMessage(fullErrorMsg); // Inform user directly

    const errorPayload: ToolResultPayload = {
        toolName,
        success: false,
        message: fullErrorMsg,
        path: path !== 'N/A' ? path : undefined,
        error: errorMessage,
    };

    postToolResult(panel, errorPayload);

    // Return payload specifically for the AI model's context
    const returnPayload = {
        success: false,
        toolName: toolName, // Include tool name for clarity in AI context
        path: path !== 'N/A' ? path : undefined,
        error: errorMessage,
    };

    return { ...errorPayload, returnPayload };
}


// Import tool definitions from specialized files
import { tool } from 'ai';
import { openFileToolDefinition } from './editorTools';
import { readFileToolDefinition, writeFileToolDefinition } from './fileReadWriteTools';
import { listDirectoryToolDefinition, createDirectoryToolDefinition, deleteDirectoryToolDefinition } from './directoryTools';
import { fileStatsToolDefinition, searchFilesToolDefinition } from './fileSystemQueryTools';

/**
 * Creates all tools, injecting the webview panel for message posting.
 * @param panel The current webview panel or undefined.
 * @returns Object containing all tools that can be passed to Vercel AI SDK.
 */
export function createAllTools(panel: vscode.WebviewPanel | undefined) {
    return {
        // Editor tools
        openFile: tool({
            ...openFileToolDefinition,
            execute: (args) => openFileToolDefinition.execute(args, panel),
        }),

        // File read/write tools
        readFile: tool({
            ...readFileToolDefinition,
            execute: (args) => readFileToolDefinition.execute(args, panel),
        }),
        writeFile: tool({
            ...writeFileToolDefinition,
            execute: (args) => writeFileToolDefinition.execute(args, panel),
        }),

        // Directory tools
        listDirectory: tool({
            ...listDirectoryToolDefinition,
            execute: (args) => listDirectoryToolDefinition.execute(args, panel),
        }),
        createDirectory: tool({
            ...createDirectoryToolDefinition,
            execute: (args) => createDirectoryToolDefinition.execute(args, panel),
        }),
        deleteDirectory: tool({
            ...deleteDirectoryToolDefinition,
            execute: (args) => deleteDirectoryToolDefinition.execute(args, panel),
        }),

        // File system query tools
        fileStats: tool({
            ...fileStatsToolDefinition,
            execute: (args) => fileStatsToolDefinition.execute(args, panel),
        }),
        searchFiles: tool({
            ...searchFilesToolDefinition,
            execute: (args) => searchFilesToolDefinition.execute(args, panel),
        }),
    };
}

// Export a named alias for backward compatibility
export const createCoreTools = createAllTools;
