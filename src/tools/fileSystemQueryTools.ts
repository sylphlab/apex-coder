import { z } from 'zod';
import * as vscode from 'vscode';
import { logger } from '../utils/logger';
import { FilesystemResultPayload, postToolResult, handleToolError } from './coreTools';
import * as pathUtils from 'path'; // Use pathUtils to avoid conflict

/**
 * Gets file/directory stats.
 */
export const fileStatsToolDefinition = {
    description: 'Gets detailed status information (type, size, modification time) about a file or directory.',
    parameters: z.object({
        path: z.string().describe('Path relative to workspace root (e.g., "package.json" or "src/utils")')
    }),
    /**
     * Executes the file stats tool.
     * @param args - The arguments for the tool.
     * @param currentPanel - The active webview panel.
     * @returns An object indicating success or failure, including the stats for the AI model.
     */
    async execute(args: { path: string }, currentPanel?: vscode.WebviewPanel): Promise<object> {
        const { path: relativePath } = args;
        logger.info(`[Tool] Executing fileStats for: ${relativePath}`);

        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders?.length) {
                throw new Error('No workspace folder open');
            }
            const rootUri = workspaceFolders[0].uri;
            const absolutePath = vscode.Uri.joinPath(rootUri, relativePath);

            let stat: vscode.FileStat;
             try {
                 stat = await vscode.workspace.fs.stat(absolutePath);
             } catch (statError: any) {
                 if (statError.code === 'FileNotFound' || statError.code === 'EntryNotFound') {
                     throw new Error(`File or directory not found at path: ${relativePath}`);
                 }
                 throw statError; // Re-throw other stat errors
             }


            const isFile = stat.type === vscode.FileType.File;
            const isDirectory = stat.type === vscode.FileType.Directory;

            const statsData = {
                isFile: isFile,
                isDirectory: isDirectory,
                size: stat.size,
                ctime: stat.ctime, // Creation time (milliseconds since epoch)
                mtime: stat.mtime  // Modification time (milliseconds since epoch)
            };

            const successMsg = `Successfully retrieved stats for: ${relativePath}`;
            logger.info(`[Tool] ${successMsg}`);
            const resultPayload: FilesystemResultPayload = {
                toolName: 'fileStats',
                success: true,
                message: successMsg,
                path: relativePath,
                stats: statsData,
                isDirectory: isDirectory // Include for consistency if needed elsewhere
            };
            postToolResult(currentPanel, resultPayload);

            // Return detailed stats for AI model
            return {
                success: true,
                path: relativePath,
                stats: statsData
            };

        } catch (error) {
            const { returnPayload } = handleToolError(error, 'fileStats', currentPanel, args);
            return returnPayload;
        }
    }
};

/**
 * Searches files using regex pattern. (Basic Implementation)
 * Note: This is a simplified version using basic Node fs for broader compatibility
 * if vscode.workspace.findFiles proves too complex or slow for simple cases.
 * A more robust implementation might use ripgrep or VS Code's search provider API if available.
 */
export const searchFilesToolDefinition = {
    description: 'Searches files within a specified directory for content matching a regex pattern. Returns a list of matching files and snippets.',
    parameters: z.object({
        directoryPath: z.string().describe('Directory path relative to workspace root to search within (e.g., "src").'),
        pattern: z.string().describe('JavaScript-compatible Regex pattern string to search for (e.g., "const\\s+\\w+\\s*=").'),
        fileGlobPattern: z.string().optional().describe('Optional glob pattern to filter files (e.g., "*.ts", "**/*.{js,ts}"). Defaults to searching all files.')
    }),
     /**
     * Executes the search files tool.
     * @param args - The arguments for the tool.
     * @param currentPanel - The active webview panel.
     * @returns An object indicating success or failure, including search results for the AI model.
     */
    async execute(args: { directoryPath: string, pattern: string, fileGlobPattern?: string }, currentPanel?: vscode.WebviewPanel): Promise<object> {
        const { directoryPath: relativeDirPath, pattern, fileGlobPattern = '**/*' } = args; // Default glob to all files if not provided
        logger.info(`[Tool] Executing searchFiles in "${relativeDirPath}" for pattern "${pattern}" matching files "${fileGlobPattern}"`);

        // Rename args.path to args.directoryPath for clarity in handleToolError
        const toolArgs = { ...args, path: relativeDirPath }; // Use path for handleToolError compatibility

        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders?.length) {
                throw new Error('No workspace folder open');
            }
            const rootUri = workspaceFolders[0].uri;

            // Construct the absolute directory path to search within
            const absoluteDirPathUri = relativeDirPath === '.' || relativeDirPath === ''
                ? rootUri
                : vscode.Uri.joinPath(rootUri, relativeDirPath);

            // Verify the directory exists
             try {
                 const stat = await vscode.workspace.fs.stat(absoluteDirPathUri);
                 if (stat.type !== vscode.FileType.Directory) {
                     throw new Error(`Search path "${relativeDirPath}" is not a directory.`);
                 }
             } catch (statError: any) {
                 if (statError.code === 'FileNotFound' || statError.code === 'EntryNotFound') {
                     throw new Error(`Search directory not found at path: ${relativeDirPath}`);
                 }
                 throw statError; // Re-throw other stat errors
             }


            // Use VS Code's findFiles API for efficient searching
            // Construct a relative pattern for findFiles based on the absolute search directory
            const relativeGlobPattern = new vscode.RelativePattern(absoluteDirPathUri, fileGlobPattern);

            const files = await vscode.workspace.findFiles(relativeGlobPattern, '**/.git/**', 1000); // Exclude .git, limit results

            const results: Array<{ file: string; line: number; match: string; context: string }> = [];
            const regex = new RegExp(pattern, 'g'); // Global flag is important

            for (const fileUri of files) {
                try {
                    const fileContentBytes = await vscode.workspace.fs.readFile(fileUri);
                    const fileContent = new TextDecoder().decode(fileContentBytes);
                    const lines = fileContent.split('\n');

                    lines.forEach((lineContent, index) => {
                        let match;
                        // Reset lastIndex for global regex
                        regex.lastIndex = 0;
                        while ((match = regex.exec(lineContent)) !== null) {
                             // Provide context around the match
                             const contextStart = Math.max(0, index - 1);
                             const contextEnd = Math.min(lines.length, index + 2);
                             const contextSnippet = lines.slice(contextStart, contextEnd).join('\n');

                            results.push({
                                file: vscode.workspace.asRelativePath(fileUri), // Get workspace relative path
                                line: index + 1, // 1-based line number
                                match: match[0], // The matched string
                                context: contextSnippet // Few lines around the match
                            });
                        }
                    });
                 } catch (readError) {
                     logger.warn(`[Tool] searchFiles: Could not read file ${fileUri.fsPath}: ${readError}`);
                     // Continue searching other files
                 }
            }

            const successMsg = `Search complete. Found ${results.length} matches in ${files.length} files scanned.`;
            logger.info(`[Tool] ${successMsg}`);
            const resultPayload: FilesystemResultPayload = { // Use FilesystemResultPayload or a dedicated SearchResultPayload
                toolName: 'searchFiles',
                success: true,
                message: successMsg,
                path: relativeDirPath, // Path searched
                content: JSON.stringify(results.slice(0, 50), null, 2) + (results.length > 50 ? '\n... [results truncated]' : '') // Truncate results for webview message
            };
            postToolResult(currentPanel, resultPayload);

            // Return potentially truncated results for AI model
            const maxResultsForAI = 100;
            const truncatedResults = results.slice(0, maxResultsForAI);
            const isTruncated = results.length > maxResultsForAI;

            return {
                success: true,
                directoryPath: relativeDirPath,
                pattern: pattern,
                fileGlobPattern: fileGlobPattern,
                matchesFound: results.length,
                filesScanned: files.length,
                results: truncatedResults,
                resultsTruncated: isTruncated
            };

        } catch (error) {
            // Use toolArgs which has 'path' set correctly for handleToolError
            const { returnPayload } = handleToolError(error, 'searchFiles', currentPanel, toolArgs);
            return returnPayload;
        }
    }
};
