import { z } from 'zod';
import * as vscode from 'vscode';
import { logger } from '../utils/logger';
import { FilesystemResultPayload, postToolResult, handleToolError } from './coreTools';

/**
 * Lists directory contents.
 */
export const listDirectoryToolDefinition = {
    description: 'Lists contents (files and subdirectories) of a specified directory.',
    parameters: z.object({
        path: z.string().describe('Directory path relative to workspace root (e.g., "src/utils")'),
        // recursive: z.boolean().default(false).describe('List recursively (Not yet implemented)') // Keep recursive param but note limitation
    }),
    /**
     * Executes the list directory tool.
     * @param args - The arguments for the tool.
     * @param currentPanel - The active webview panel.
     * @returns An object indicating success or failure, including the list of items for the AI model.
     */
    async execute(args: { path: string/*, recursive: boolean*/ }, currentPanel?: vscode.WebviewPanel): Promise<object> {
        const { path: relativePath/*, recursive*/ } = args;
        // const recursiveInfo = recursive ? ' (recursive)' : ''; // Add back when implemented
        logger.info(`[Tool] Executing listDirectory: ${relativePath}`);

        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders?.length) {
                throw new Error('No workspace folder open');
            }
            const rootUri = workspaceFolders[0].uri;
            const absolutePath = relativePath === '.' || relativePath === ''
                ? rootUri // Handle root case
                : vscode.Uri.joinPath(rootUri, relativePath);


            // Verify it's a directory
             let stat: vscode.FileStat;
             try {
                 stat = await vscode.workspace.fs.stat(absolutePath);
             } catch (statError: any) {
                 if (statError.code === 'FileNotFound' || statError.code === 'EntryNotFound') {
                     throw new Error(`Directory not found at path: ${relativePath}`);
                 }
                 throw statError; // Re-throw other stat errors
             }
             if (stat.type !== vscode.FileType.Directory) {
                throw new Error(`Path "${relativePath}" is not a directory.`);
            }

            // List contents (non-recursive for now)
            // TODO: Implement recursive listing if needed
            // if (recursive) {
            //     logger.warn('[Tool] Recursive listing not yet implemented for listDirectory.');
            // }
            const items = await vscode.workspace.fs.readDirectory(absolutePath);
            // Format: [name, type]
            const formattedItems = items.map(([name, type]) => ({
                name,
                type: type === vscode.FileType.Directory ? 'directory' : (type === vscode.FileType.File ? 'file' : 'other')
            }));

            const successMsg = `Successfully listed directory: ${relativePath}`;
            logger.info(`[Tool] ${successMsg}`);
            const resultPayload: FilesystemResultPayload = {
                toolName: 'listDirectory',
                success: true,
                message: successMsg,
                path: relativePath,
                items: formattedItems.map(item => `${item.name}${item.type === 'directory' ? '/' : ''}`), // Simple string list for webview
                isDirectory: true
            };
            postToolResult(currentPanel, resultPayload);

            // Return structured data for AI model
            return {
                success: true,
                path: relativePath,
                items: formattedItems
            };

        } catch (error) {
            const { returnPayload } = handleToolError(error, 'listDirectory', currentPanel, args);
            return returnPayload;
        }
    }
};

/**
 * Creates a directory.
 */
export const createDirectoryToolDefinition = {
    description: 'Creates a directory, including any necessary parent directories.',
    parameters: z.object({
        path: z.string().describe('Directory path relative to workspace root to create (e.g., "src/new_module/utils")')
    }),
     /**
     * Executes the create directory tool.
     * @param args - The arguments for the tool.
     * @param currentPanel - The active webview panel.
     * @returns An object indicating success or failure for the AI model.
     */
    async execute(args: { path: string }, currentPanel?: vscode.WebviewPanel): Promise<object> {
        const { path: relativePath } = args;
        logger.info(`[Tool] Executing createDirectory: ${relativePath}`);

        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders?.length) {
                throw new Error('No workspace folder open');
            }
            const rootUri = workspaceFolders[0].uri;
            const absolutePath = vscode.Uri.joinPath(rootUri, relativePath);

             // Check if path already exists
             try {
                 const stat = await vscode.workspace.fs.stat(absolutePath);
                 // If stat succeeds, path exists. Check if it's a directory.
                 if (stat.type === vscode.FileType.Directory) {
                     // Directory already exists - arguably success or at least not an error
                     const warnMsg = `Directory already exists: ${relativePath}`;
                     logger.warn(`[Tool] ${warnMsg}`);
                     const resultPayload: FilesystemResultPayload = {
                         toolName: 'createDirectory',
                         success: true, // Treat as success
                         message: warnMsg,
                         path: relativePath,
                         isDirectory: true
                     };
                     postToolResult(currentPanel, resultPayload);
                     return { success: true, path: relativePath, message: 'Directory already exists.' };
                 } else {
                     // Exists but is not a directory (e.g., a file)
                     throw new Error(`Path "${relativePath}" already exists but is not a directory.`);
                 }
             } catch (statError: any) {
                 if (statError.code !== 'FileNotFound' && statError.code !== 'EntryNotFound') {
                     throw statError; // Re-throw unexpected errors
                 }
                 // File/Dir does not exist, proceed with creation
             }


            await vscode.workspace.fs.createDirectory(absolutePath); // createDirectory is recursive

            const successMsg = `Successfully created directory: ${relativePath}`;
            logger.info(`[Tool] ${successMsg}`);
            const resultPayload: FilesystemResultPayload = {
                toolName: 'createDirectory',
                success: true,
                message: successMsg,
                path: relativePath,
                isDirectory: true
            };
            postToolResult(currentPanel, resultPayload);
            return { success: true, path: relativePath };

        } catch (error) {
            const { returnPayload } = handleToolError(error, 'createDirectory', currentPanel, args);
            return returnPayload;
        }
    }
};


/**
 * Deletes a directory (recursively).
 */
export const deleteDirectoryToolDefinition = {
    description: 'Deletes a directory and all its contents recursively. Use with extreme caution!',
    parameters: z.object({
        path: z.string().describe('Directory path relative to workspace root to delete (e.g., "dist" or "temp_files")')
    }),
    /**
     * Executes the delete directory tool.
     * @param args - The arguments for the tool.
     * @param currentPanel - The active webview panel.
     * @returns An object indicating success or failure for the AI model.
     */
    async execute(args: { path: string }, currentPanel?: vscode.WebviewPanel): Promise<object> {
        const { path: relativePath } = args;
        logger.warn(`[Tool] Executing deleteDirectory (recursive): ${relativePath}`); // Log as warning due to destructive nature

        // Basic safety check: prevent deleting root or very short paths accidentally
        if (!relativePath || relativePath === '.' || relativePath === '/' || relativePath.length < 3) {
             const errMsg = `Safety check failed: Attempted to delete potentially dangerous path "${relativePath}". Operation aborted.`;
             logger.error(`[Tool] ${errMsg}`);
             vscode.window.showErrorMessage(errMsg);
             const resultPayload: FilesystemResultPayload = {
                 toolName: 'deleteDirectory',
                 success: false,
                 message: errMsg,
                 path: relativePath,
                 error: 'Safety check failed'
             };
             postToolResult(currentPanel, resultPayload);
             return { success: false, path: relativePath, error: 'Safety check failed' };
        }


        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders?.length) {
                throw new Error('No workspace folder open');
            }
            const rootUri = workspaceFolders[0].uri;
            const absolutePath = vscode.Uri.joinPath(rootUri, relativePath);

            // Verify it exists and is a directory before attempting delete
             try {
                 const stat = await vscode.workspace.fs.stat(absolutePath);
                 if (stat.type !== vscode.FileType.Directory) {
                     throw new Error(`Path "${relativePath}" is not a directory.`);
                 }
             } catch (statError: any) {
                 if (statError.code === 'FileNotFound' || statError.code === 'EntryNotFound') {
                     throw new Error(`Directory not found at path: ${relativePath}`);
                 }
                 throw statError; // Re-throw other stat errors
             }


            await vscode.workspace.fs.delete(absolutePath, { recursive: true, useTrash: false }); // Ensure recursive, consider useTrash preference

            const successMsg = `Successfully deleted directory: ${relativePath}`;
            logger.info(`[Tool] ${successMsg}`);
            const resultPayload: FilesystemResultPayload = {
                toolName: 'deleteDirectory',
                success: true,
                message: successMsg,
                path: relativePath,
                isDirectory: true // It *was* a directory
            };
            postToolResult(currentPanel, resultPayload);
            return { success: true, path: relativePath };

        } catch (error) {
            const { returnPayload } = handleToolError(error, 'deleteDirectory', currentPanel, args);
            return returnPayload;
        }
    }
};

// Note: deleteFileTool was defined in filesystemTools.ts but not exported or used in createFilesystemTools.
// If needed, it should be added here or in fileReadWriteTools.ts.
// Example:
/*
export const deleteFileToolDefinition = { ... };
*/
