import { z } from "zod";
import * as vscode from "vscode";
import { logger } from "../utils/logger";
import type {
  FilesystemResultPayload,
  ReadFileResult,
  WriteFileResult,
} from "./coreTools";
import {
  postToolResult,
  handleToolError,
} from "./coreTools";
// import * as pathUtils from "path"; // Remove unused import for now
import { acquireLock } from "../utils/fileLockManager";
import type { ToolContext } from "../types/toolContext";

/**
 * Reads file content with optional line range support.
 */
export const readFileToolDefinition = {
  description:
    "Reads file content with optional line range support. Returns truncated content for AI context.",
  parameters: z.object({
    path: z
      .string()
      .describe('File path relative to workspace root (e.g., "src/main.ts")'),
    startLine: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Starting line number (1-based)"),
    endLine: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Ending line number (1-based, inclusive)"),
  }),
  /**
   * Executes the read file tool.
   * @param args - The arguments for the tool.
   * @param currentPanel - The active webview panel.
   * @returns An object indicating success or failure, including truncated content for the AI model.
   */
  async execute(
    args: { path: string; startLine?: number; endLine?: number },
    currentPanel?: vscode.WebviewPanel,
  ): Promise<ReadFileResult> {
    const toolName = "readFile";
    const { path: relativePath, startLine, endLine } = args;
    const lineInfo =
      startLine !== undefined || endLine !== undefined
        ? ` [Lines ${startLine ?? "start"}-${endLine ?? "end"}]`
        : "";
    logger.info(`[Tool] Executing readFile: ${relativePath}${lineInfo}`);

    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders?.length) {
        throw new Error("No workspace folder open");
      }
      const rootUri = workspaceFolders[0].uri;
      const absolutePath = vscode.Uri.joinPath(rootUri, relativePath);

      // Verify exists and is a file
      try {
        const stat = await vscode.workspace.fs.stat(absolutePath);
        if (stat.type !== vscode.FileType.File) {
          throw new Error("Path is not a file.");
        }
      } catch (statError: unknown) {
        if (
          statError instanceof Error &&
          ((statError as vscode.FileSystemError).code === "FileNotFound" ||
            (statError as vscode.FileSystemError).code === "EntryNotFound")
        ) {
          throw new Error(`File not found at path: ${relativePath}`);
        }
        throw statError; // Re-throw other stat errors
      }

      const fileContentBytes = await vscode.workspace.fs.readFile(absolutePath);
      let fileContent = new TextDecoder().decode(fileContentBytes);

      // Handle line range
      let isRangeApplied = false;
      if (startLine !== undefined || endLine !== undefined) {
        const lines = fileContent.split("\n");
        const start = startLine ? Math.max(0, startLine - 1) : 0;
        const end = endLine ? Math.min(lines.length, endLine) : lines.length;
        if (start < end) {
          fileContent = lines.slice(start, end).join("\n");
          isRangeApplied = true;
        } else {
          logger.warn(
            `[Tool] Invalid line range for readFile ${relativePath}: start ${startLine ?? "undefined"}, end ${endLine ?? "undefined"}. Reading full file.`,
          );
        }
      }

      const successMsgBase = `Successfully read file: ${relativePath}`;
      const successMsg = isRangeApplied
        ? `${successMsgBase} (lines ${startLine ?? 'start'}-${endLine ?? 'end'})`
        : successMsgBase;
      logger.info(`[Tool] ${successMsg}`);

      // Truncate for AI
      const maxChars = 8000;
      const isTruncated = fileContent.length > maxChars;
      const truncatedContent = isTruncated
        ? fileContent.substring(0, maxChars) + "\n... [truncated]"
        : fileContent;

      // Post full result (without truncated content) to webview
      const postPayload: FilesystemResultPayload = {
        toolName: toolName,
        success: true,
        message: successMsg,
        path: relativePath,
        // Potentially add full content here if needed by webview?
        // content: fileContent, // Or maybe not?
      };
      postToolResult(currentPanel, postPayload);

      // Return structure matching ReadFileResult for AI
      const result: ReadFileResult = {
        toolName: toolName,
        success: true,
        message: successMsg,
        path: relativePath,
        content: truncatedContent, // Return truncated content for AI
        // Add originalLineCount, isTruncated, isRangeApplied if needed
        // These might not be standard in ToolResultPayload, so ReadFileResult might need adjustment
      };
      return result;
    } catch (error: unknown) {
      return handleToolError(
        error,
        toolName,
        currentPanel,
        args,
      ) as unknown as ReadFileResult; // Need cast due to handleToolError's return type
    }
  },
};

/**
 * Writes content to a file.
 */
export const writeFileToolDefinition = {
  description:
    "Writes the given content to a specified file. Optionally overwrites existing files.",
  parameters: z.object({
    path: z.string().describe('File path relative to workspace root (e.g., "src/newFile.ts").'),
    content: z.string().describe("The content to write to the file."),
    overwrite: z.boolean().default(false).describe("Whether to overwrite the file if it already exists."),
  }),
  /**
   * Executes the write file tool.
   * @param args - The arguments for the tool.
   * @param currentPanel - The active webview panel.
   * @returns An object indicating success or failure for the AI model.
   */
  async execute(
    args: { path: string; content: string; overwrite: boolean },
    currentPanel?: vscode.WebviewPanel,
    context?: ToolContext
  ): Promise<WriteFileResult> {
    const toolName = "writeFile";
    const { path: relativePath, content, overwrite } = args;
    const sessionId = context?.sessionId || 'unknown_session';
    logger.info(`[Tool][${sessionId}] Executing ${toolName}: ${relativePath}`);

    let releaseLock: (() => void) | null = null;

    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders?.length) {
        throw new Error("No workspace folder open");
      }
      const rootUri = workspaceFolders[0].uri;
      const fileUri = vscode.Uri.joinPath(rootUri, relativePath);
      const absolutePath = fileUri.fsPath;

      // 1. Acquire Lock
      logger.info(`[Tool][${sessionId}] Attempting to acquire lock for ${absolutePath}`);
      releaseLock = await acquireLock(absolutePath);
      logger.info(`[Tool][${sessionId}] Lock acquired for ${absolutePath}`);

      // 2. Check if file exists and handle overwrite logic
      let fileExists = false;
      try {
        await vscode.workspace.fs.stat(fileUri);
        fileExists = true;
      } catch (statError: any) {
        if (statError?.code !== 'FileNotFound' && statError?.code !== 'EntryNotFound') {
          throw statError; // Re-throw unexpected stat errors
        }
        // File does not exist, which is fine
      }

      if (fileExists && !overwrite) {
        throw new Error(
          `File "${relativePath}" already exists. Use overwrite: true to replace it.`,
        );
      }

      // 3. Write the file
      await vscode.workspace.fs.writeFile(fileUri, Buffer.from(content, 'utf-8'));

      const successMsg = `Successfully wrote content to ${relativePath}.`;
      logger.info(`[Tool][${sessionId}] ${successMsg}`);
      postToolResult(currentPanel, { toolName, success: true, message: successMsg, path: relativePath });
      
      // 4. Release lock (early release on success)
      if (releaseLock) {
          logger.info(`[Tool][${sessionId}] Releasing lock for ${relativePath} after write.`);
          releaseLock();
          releaseLock = null; // Prevent release in finally block
      }

      return {
        toolName: toolName,
        success: true,
        message: successMsg,
        path: relativePath,
      };
    } catch (error) {
      const errorResult = handleToolError(
        error,
        toolName,
        currentPanel,
        args,
      ) as unknown as WriteFileResult;
      return {
        toolName: toolName,
        success: false,
        message: errorResult.message || `Failed to write to ${relativePath}.`,
        path: relativePath,
        error: errorResult.error,
      };
    } finally {
        // Ensure lock is always released, even if write succeeded but something else failed
        if (releaseLock) {
            logger.info(`[Tool][${sessionId}] Releasing lock for ${relativePath} in finally block.`);
            releaseLock();
        }
    }
  },
};
