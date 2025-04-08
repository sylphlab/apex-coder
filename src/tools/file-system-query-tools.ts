import { z } from 'zod';
import * as vscode from 'vscode';
import { logger } from '../utils/logger.js';
import type { FilesystemResultPayload } from './coreTools';
import { postToolResult, handleToolError } from './coreTools';
// import * as pathUtils from "path"; // Remove unused import

// Define specific result types
interface FileStatsResult {
  success: boolean;
  path: string;
  stats?: {
    isFile: boolean;
    isDirectory: boolean;
    size: number;
    ctime: number;
    mtime: number;
  };
  error?: string;
}

interface SearchFilesResult {
  success: boolean;
  directoryPath: string;
  pattern: string;
  fileGlobPattern: string;
  matchesFound: number;
  filesScanned: number;
  results: {
    file: string;
    line: number;
    match: string;
    context: string;
  }[];
  resultsTruncated: boolean;
  error?: string;
}

/**
 * Gets file/directory stats.
 */
export const fileStatsToolDefinition = {
  description:
    'Gets detailed status information (type, size, modification time) about a file or directory.',
  parameters: z.object({
    path: z
      .string()
      .describe('Path relative to workspace root (e.g., "package.json" or "src/utils")'),
  }),
  /**
   * Executes the file stats tool.
   * @param args - The arguments for the tool.
   * @param currentPanel - The active webview panel.
   * @returns An object indicating success or failure, including the stats for the AI model.
   */
  async execute(
    arguments_: { path: string },
    currentPanel?: vscode.WebviewPanel,
  ): Promise<FileStatsResult> {
    // Use specific return type
    const { path: relativePath } = arguments_;
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
      } catch (statError: unknown) {
        // Use unknown
        if (
          statError instanceof Error &&
          ((statError as vscode.FileSystemError).code === 'FileNotFound' ||
            (statError as vscode.FileSystemError).code === 'EntryNotFound')
        ) {
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
        ctime: stat.ctime,
        mtime: stat.mtime,
      };

      const successMessage = `Successfully retrieved stats for: ${relativePath}`;
      logger.info(`[Tool] ${successMessage}`);
      const resultPayload: FilesystemResultPayload = {
        toolName: 'fileStats',
        success: true,
        message: successMessage,
        path: relativePath,
        stats: statsData,
        isDirectory: isDirectory,
      };
      postToolResult(currentPanel, resultPayload);

      // Return detailed stats for AI model with correct type
      return {
        success: true,
        path: relativePath,
        stats: statsData,
      };
    } catch (error: unknown) {
      // Use unknown
      const { returnPayload } = handleToolError(error, 'fileStats', currentPanel, arguments_);
      // Ensure returnPayload conforms to FileStatsResult
      return {
        success: false,
        path: relativePath,
        ...(returnPayload as { error?: string }),
      };
    }
  },
};

/**
 * Searches files using regex pattern.
 */
export const searchFilesToolDefinition = {
  description:
    'Searches files within a specified directory for content matching a regex pattern. Returns a list of matching files and snippets.',
  parameters: z.object({
    directoryPath: z
      .string()
      .describe('Directory path relative to workspace root to search within (e.g., "src").'),
    pattern: z
      .string()
      .describe(
        String.raw`JavaScript-compatible Regex pattern string to search for (e.g., "const\s+\w+\s*=").`,
      ),
    fileGlobPattern: z
      .string()
      .optional()
      .describe(
        'Optional glob pattern to filter files (e.g., "*.ts", "**/*.{js,ts}"). Defaults to searching all files.',
      ),
  }),
  /**
   * Executes the search files tool.
   * @param args - The arguments for the tool.
   * @param currentPanel - The active webview panel.
   * @returns An object indicating success or failure, including search results for the AI model.
   */
  async execute(
    arguments_: { directoryPath: string; pattern: string; fileGlobPattern?: string },
    currentPanel?: vscode.WebviewPanel,
  ): Promise<SearchFilesResult> {
    // Use specific return type
    const { directoryPath: relativeDirPath, pattern, fileGlobPattern = '**/*' } = arguments_;
    logger.info(
      `[Tool] Executing searchFiles in "${relativeDirPath}" for pattern "${pattern}" matching files "${fileGlobPattern}"`,
    );

    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders?.length) {
        throw new Error('No workspace folder open');
      }
      const rootUri = workspaceFolders[0].uri;

      const absoluteDirPathUri =
        relativeDirPath === '.' || relativeDirPath === ''
          ? rootUri
          : vscode.Uri.joinPath(rootUri, relativeDirPath);

      // Verify the directory exists
      try {
        const stat = await vscode.workspace.fs.stat(absoluteDirPathUri);
        if (stat.type !== vscode.FileType.Directory) {
          throw new Error(`Search path "${relativeDirPath}" is not a directory.`);
        }
      } catch (statError: unknown) {
        // Use unknown
        if (
          statError instanceof Error &&
          ((statError as vscode.FileSystemError).code === 'FileNotFound' ||
            (statError as vscode.FileSystemError).code === 'EntryNotFound')
        ) {
          throw new Error(`Search directory not found at path: ${relativeDirPath}`);
        }
        throw statError; // Re-throw other stat errors
      }

      const relativeGlobPattern = new vscode.RelativePattern(absoluteDirPathUri, fileGlobPattern);

      const files = await vscode.workspace.findFiles(relativeGlobPattern, '**/.git/**', 1000);

      const results: {
        file: string;
        line: number;
        match: string;
        context: string;
      }[] = [];
      const regex = new RegExp(pattern, 'g');

      for (const fileUri of files) {
        try {
          const fileContentBytes = await vscode.workspace.fs.readFile(fileUri);
          const fileContent = new TextDecoder().decode(fileContentBytes);
          const lines = fileContent.split('\n');

          for (const [index, lineContent] of lines.entries()) {
            let match;
            regex.lastIndex = 0;
            while ((match = regex.exec(lineContent)) !== null) {
              const contextStart = Math.max(0, index - 1);
              const contextEnd = Math.min(lines.length, index + 2);
              const contextSnippet = lines.slice(contextStart, contextEnd).join('\n');

              results.push({
                file: vscode.workspace.asRelativePath(fileUri),
                line: index + 1,
                match: match[0],
                context: contextSnippet,
              });
            }
          }
        } catch (readError: unknown) {
          // Use unknown
          logger.warn(
            `[Tool] searchFiles: Could not read file ${fileUri.fsPath}: ${String(readError)}`, // Stringify unknown error
          );
        }
      }

      const successMessage = `Search complete. Found ${results.length} matches in ${files.length} files scanned.`; // Ensure numbers are used correctly
      logger.info(`[Tool] ${successMessage}`);
      const resultPayload: FilesystemResultPayload = {
        toolName: 'searchFiles',
        success: true,
        message: successMessage,
        path: relativeDirPath,
        content:
          JSON.stringify(results.slice(0, 50), null, 2) +
          (results.length > 50 ? '\n... [results truncated]' : ''),
      };
      postToolResult(currentPanel, resultPayload);

      const maxResultsForAI = 100;
      const truncatedResults = results.slice(0, maxResultsForAI);
      const isTruncated = results.length > maxResultsForAI;

      // Return results conforming to SearchFilesResult
      return {
        success: true,
        directoryPath: relativeDirPath,
        pattern: pattern,
        fileGlobPattern: fileGlobPattern,
        matchesFound: results.length,
        filesScanned: files.length,
        results: truncatedResults,
        resultsTruncated: isTruncated,
      };
    } catch (error: unknown) {
      // Use unknown
      const { returnPayload } = handleToolError(error, 'searchFiles', currentPanel, arguments_);
      // Ensure returnPayload conforms to SearchFilesResult
      return {
        success: false,
        directoryPath: relativeDirPath,
        pattern: pattern,
        fileGlobPattern: fileGlobPattern,
        matchesFound: 0,
        filesScanned: 0,
        results: [],
        resultsTruncated: false,
        ...(returnPayload as { error?: string }),
      };
    }
  },
};
