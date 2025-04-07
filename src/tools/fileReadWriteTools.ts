import { z } from 'zod';
import * as vscode from 'vscode';
import { logger } from '../utils/logger';
import { ToolResultPayload, FilesystemResultPayload, postToolResult, handleToolError } from './coreTools';
import * as pathUtils from 'path'; // Use pathUtils to avoid conflict with args.path

/**
 * Reads file content with optional line range support.
 */
export const readFileToolDefinition = {
    description: 'Reads file content with optional line range support. Returns truncated content for AI context.',
    parameters: z.object({
        path: z.string().describe('File path relative to workspace root (e.g., "src/main.ts")'),
        startLine: z.number().int().positive().optional().describe('Starting line number (1-based)'),
        endLine: z.number().int().positive().optional().describe('Ending line number (1-based, inclusive)')
    }),
    /**
     * Executes the read file tool.
     * @param args - The arguments for the tool.
     * @param currentPanel - The active webview panel.
     * @returns An object indicating success or failure, including truncated content for the AI model.
     */
    async execute(args: { path: string, startLine?: number, endLine?: number }, currentPanel?: vscode.WebviewPanel): Promise<object> {
        const { path: relativePath, startLine, endLine } = args;
        const lineInfo = (startLine || endLine) ? ` [Lines ${startLine ?? 'start'}-${endLine ?? 'end'}]` : '';
        logger.info(`[Tool] Executing readFile: ${relativePath}${lineInfo}`);

        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders?.length) {
                throw new Error('No workspace folder open');
            }
            const rootUri = workspaceFolders[0].uri;
            const absolutePath = vscode.Uri.joinPath(rootUri, relativePath);

            // Verify exists and is a file
             try {
                const stat = await vscode.workspace.fs.stat(absolutePath);
                 if (stat.type !== vscode.FileType.File) {
                    throw new Error('Path is not a file.');
                }
            } catch (statError: any) {
                 if (statError.code === 'FileNotFound' || statError.code === 'EntryNotFound') {
                     throw new Error(`File not found at path: ${relativePath}`);
                 }
                 throw statError; // Re-throw other stat errors
            }


            const fileContentBytes = await vscode.workspace.fs.readFile(absolutePath);
            let fileContent = new TextDecoder().decode(fileContentBytes);
            const originalLineCount = fileContent.split('\n').length;

            // Handle line range if specified
            let isRangeApplied = false;
            if (startLine !== undefined || endLine !== undefined) {
                const lines = fileContent.split('\n');
                // Adjust to 0-based index, ensure within bounds
                const start = startLine ? Math.max(0, startLine - 1) : 0;
                const end = endLine ? Math.min(lines.length, endLine) : lines.length;
                if (start < end) {
                    fileContent = lines.slice(start, end).join('\n');
                    isRangeApplied = true;
                } else {
                     logger.warn(`[Tool] Invalid line range for readFile ${relativePath}: start ${startLine}, end ${endLine}. Reading full file.`);
                     // Optionally throw an error or just read the whole file
                }
            }

            const successMsgBase = `Successfully read file: ${relativePath}`;
            const successMsg = isRangeApplied ? `${successMsgBase} (lines ${startLine}-${endLine})` : successMsgBase;
            logger.info(`[Tool] ${successMsg}`);

            // Truncate content for AI model context
            const maxChars = 8000; // Increased limit slightly
            const isTruncated = fileContent.length > maxChars;
            const truncatedContent = isTruncated
                ? fileContent.substring(0, maxChars) + '\n... [truncated]'
                : fileContent;

            const resultPayload: FilesystemResultPayload = {
                toolName: 'readFile',
                success: true,
                message: successMsg,
                path: relativePath,
                // Optionally include full content in the message posted to webview if needed,
                // but keep the AI return payload truncated.
                // content: fileContent // Full content for webview if necessary
            };
            postToolResult(currentPanel, resultPayload);

            // Return truncated content for the AI model
            return {
                success: true,
                path: relativePath,
                content: truncatedContent,
                originalLineCount: originalLineCount,
                returnedLineCount: truncatedContent.split('\n').length,
                isTruncated: isTruncated,
                isRangeApplied: isRangeApplied,
             };

        } catch (error) {
            const { returnPayload } = handleToolError(error, 'readFile', currentPanel, args);
            return returnPayload;
        }
    }
};

/**
 * Writes content to a file.
 */
export const writeFileToolDefinition = {
    description: 'Writes content to a file, creating parent directories if needed. Use with caution, especially with overwrite=true.',
    parameters: z.object({
        path: z.string().describe('File path relative to workspace root (e.g., "src/newFile.ts")'),
        content: z.string().describe('File content to write'),
        overwrite: z.boolean().default(false).describe('Set to true to overwrite an existing file. Defaults to false to prevent accidental data loss.')
    }),
    /**
     * Executes the write file tool.
     * @param args - The arguments for the tool.
     * @param currentPanel - The active webview panel.
     * @returns An object indicating success or failure for the AI model.
     */
    async execute(args: { path: string, content: string, overwrite: boolean }, currentPanel?: vscode.WebviewPanel): Promise<object> {
        const { path: relativePath, content, overwrite } = args;
        logger.info(`[Tool] Executing writeFile: ${relativePath} (overwrite: ${overwrite})`);

        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders?.length) {
                throw new Error('No workspace folder open');
            }
            const rootUri = workspaceFolders[0].uri;
            const absolutePath = vscode.Uri.joinPath(rootUri, relativePath);

            // Check if file exists if not overwriting
            let fileExists = false;
            try {
                const stat = await vscode.workspace.fs.stat(absolutePath);
                 if (stat.type === vscode.FileType.Directory) {
                     throw new Error('Path exists and is a directory. Cannot overwrite a directory with a file.');
                 }
                fileExists = true;
            } catch (statError: any) {
                 if (statError.code !== 'FileNotFound' && statError.code !== 'EntryNotFound') {
                     throw statError; // Re-throw unexpected errors
                 }
                 // File does not exist, which is fine
            }

            if (fileExists && !overwrite) {
                throw new Error(`File already exists at "${relativePath}" and overwrite is set to false.`);
            }

            // Create parent directories if needed
            const dirUri = vscode.Uri.joinPath(absolutePath, '..'); // Get parent directory URI
            await vscode.workspace.fs.createDirectory(dirUri); // createDirectory handles recursive creation

            await vscode.workspace.fs.writeFile(
                absolutePath,
                new TextEncoder().encode(content)
            );

            const successMsg = `Successfully wrote file: ${relativePath}`;
            logger.info(`[Tool] ${successMsg}`);
            const resultPayload: FilesystemResultPayload = {
                toolName: 'writeFile',
                success: true,
                message: successMsg,
                path: relativePath
            };
            postToolResult(currentPanel, resultPayload);
            return { success: true, path: relativePath };

        } catch (error) {
            const { returnPayload } = handleToolError(error, 'writeFile', currentPanel, args);
            return returnPayload;
        }
    }
};
