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
      const originalLineCount = fileContent.split("\n").length;

      // Handle line range
      let isRangeApplied = false;
      let returnedLineCount = originalLineCount;
      if (startLine !== undefined || endLine !== undefined) {
        const lines = fileContent.split("\n");
        const start = startLine ? Math.max(0, startLine - 1) : 0;
        const end = endLine ? Math.min(lines.length, endLine) : lines.length;
        if (start < end) {
          fileContent = lines.slice(start, end).join("\n");
          returnedLineCount = end - start;
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
        // Add originalLineCount, returnedLineCount, isTruncated, isRangeApplied if needed
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
    "Writes content to a file, creating parent directories if needed. Use with caution, especially with overwrite=true.",
  parameters: z.object({
    path: z
      .string()
      .describe(
        'File path relative to workspace root (e.g., "src/newFile.ts")',
      ),
    content: z.string().describe("File content to write"),
    overwrite: z
      .boolean()
      .default(false)
      .describe(
        "Set to true to overwrite an existing file. Defaults to false to prevent accidental data loss.",
      ),
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
  ): Promise<WriteFileResult> {
    const toolName = "writeFile";
    const { path: relativePath, content, overwrite } = args;
    logger.info(
      `[Tool] Executing writeFile: ${relativePath} (overwrite: ${String(overwrite)})`,
    );

    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders?.length) {
        throw new Error("No workspace folder open");
      }
      const rootUri = workspaceFolders[0].uri;
      const absolutePath = vscode.Uri.joinPath(rootUri, relativePath);

      // Check if file exists if not overwriting
      let fileExists = false;
      try {
        const stat = await vscode.workspace.fs.stat(absolutePath);
        if (stat.type === vscode.FileType.Directory) {
          throw new Error(
            "Path exists and is a directory. Cannot overwrite a directory with a file.",
          );
        }
        fileExists = true;
      } catch (statError: unknown) {
        if (
          statError instanceof Error &&
          (statError as vscode.FileSystemError).code !== "FileNotFound" &&
          (statError as vscode.FileSystemError).code !== "EntryNotFound"
        ) {
          throw statError; // Re-throw unexpected errors
        }
        // File does not exist, which is fine
      }

      if (fileExists && !overwrite) {
        throw new Error(
          `File already exists at "${relativePath}" and overwrite is set to false.`,
        );
      }

      // Create parent directories if needed
      const dirUri = vscode.Uri.joinPath(absolutePath, "..");
      await vscode.workspace.fs.createDirectory(dirUri);

      await vscode.workspace.fs.writeFile(
        absolutePath,
        new TextEncoder().encode(content),
      );

      const successMsg = `Successfully wrote file: ${relativePath}`;
      logger.info(`[Tool] ${successMsg}`);

      // Post result to webview
      const postPayload: FilesystemResultPayload = {
        toolName: toolName,
        success: true,
        message: successMsg,
        path: relativePath,
      };
      postToolResult(currentPanel, postPayload);

      // Return structure matching WriteFileResult for AI
      const result: WriteFileResult = {
        toolName: toolName,
        success: true,
        message: successMsg,
        path: relativePath,
      };
      return result;
    } catch (error: unknown) {
      return handleToolError(
        error,
        toolName,
        currentPanel,
        args,
      ) as unknown as WriteFileResult; // Need cast due to handleToolError's return type
    }
  },
};
