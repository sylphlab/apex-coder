import * as vscode from "vscode";
import { logger } from "../utils/logger";

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

// Define specific result types for each tool
// These inherit or compose ToolResultPayload as needed
export interface OpenFileResult extends ToolResultPayload {}
export interface ReadFileResult extends ToolResultPayload {
  content?: string; // Already in ToolResultPayload, but explicit here
}
export interface WriteFileResult extends ToolResultPayload {}
export interface ListDirectoryResult extends FilesystemResultPayload {
  items?: string[]; // Already in FilesystemResultPayload, but explicit
}
export interface DirectoryActionResult extends ToolResultPayload {}
export interface FileStatsResult extends FilesystemResultPayload {}
export interface SearchFilesResult extends ToolResultPayload {
  results: string[]; // Specific to search results
}

/**
 * Helper function to post tool results back to the webview.
 * Kept as a regular function.
 * @param panel The current webview panel or undefined.
 * @param payload The result payload.
 */
export function postToolResult(
  panel: vscode.WebviewPanel | undefined,
  payload: ToolResultPayload,
): void {
  if (!panel) {
    logger.warn(
      `[Tool] Attempted to post result for ${payload.toolName} but panel is undefined.`,
    );
    return;
  }
  try {
    panel.webview.postMessage({ command: "toolResult", payload });
    logger.info(`[Tool] Posted result for ${payload.toolName} to webview.`);
  } catch (error) {
    logger.error(
      `[Tool] Failed to post message to webview for ${payload.toolName}:`,
      error,
    );
  }
}

/**
 * Standardized error handler for tools.
 * Kept as a regular function.
 * @param error The caught error object.
 * @param toolName The name of the tool where the error occurred.
 * @param panel The active webview panel.
 * @param args The arguments passed to the tool (typed as unknown).
 * @returns A standardized error object for the AI model.
 */
export function handleToolError(
  error: unknown,
  toolName: string,
  panel: vscode.WebviewPanel | undefined,
  args: unknown,
): ToolResultPayload & { returnPayload: object } {
  let path: string | undefined = undefined;
  if (typeof args === "object" && args !== null) {
    path =
      (args as { path?: string }).path ??
      (args as { directoryPath?: string }).directoryPath ??
      undefined;
  }
  const pathString = path ?? "N/A";

  const errorMessage = error instanceof Error ? error.message : String(error);
  const fullErrorMsg = `Error in tool "${toolName}" for path "${pathString}": ${errorMessage}`;

  logger.error(`[Tool] ${fullErrorMsg}`, error);
  void vscode.window.showErrorMessage(fullErrorMsg);

  const errorPayload: ToolResultPayload = {
    toolName,
    success: false,
    message: fullErrorMsg,
    path: pathString !== "N/A" ? pathString : undefined,
    error: errorMessage,
  };

  postToolResult(panel, errorPayload);

  const returnPayload = {
    success: false,
    toolName: toolName,
    path: pathString !== "N/A" ? pathString : undefined,
    error: errorMessage,
  };

  return { ...errorPayload, returnPayload };
}

// --- Tool Definitions and Creation ---

import { tool } from "ai";
// Import the definitions
import { openFileToolDefinition } from "./editorTools";
import {
  readFileToolDefinition,
  writeFileToolDefinition,
} from "./fileReadWriteTools";
import {
  listDirectoryToolDefinition,
  createDirectoryToolDefinition,
  deleteDirectoryToolDefinition,
} from "./directoryTools";
import {
  fileStatsToolDefinition,
  searchFilesToolDefinition,
} from "./fileSystemQueryTools";

/**
 * Creates all tools, injecting the webview panel for message posting.
 * @param panel The current webview panel or undefined.
 * @returns Object containing all tools that can be passed to Vercel AI SDK.
 */
export function createAllTools(
  panel: vscode.WebviewPanel | undefined,
): Record<string, ReturnType<typeof tool>> {
  // Define tools directly, wrapping execute inline
  return {
    openFile: tool({
      description: openFileToolDefinition.description,
      parameters: openFileToolDefinition.parameters,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (args: any) => openFileToolDefinition.execute(args, panel),
    }),
    readFile: tool({
      description: readFileToolDefinition.description,
      parameters: readFileToolDefinition.parameters,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (args: any) => readFileToolDefinition.execute(args, panel),
    }),
    writeFile: tool({
      description: writeFileToolDefinition.description,
      parameters: writeFileToolDefinition.parameters,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (args: any) => writeFileToolDefinition.execute(args, panel),
    }),
    listDirectory: tool({
      description: listDirectoryToolDefinition.description,
      parameters: listDirectoryToolDefinition.parameters,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (args: any) =>
        listDirectoryToolDefinition.execute(args, panel),
    }),
    createDirectory: tool({
      description: createDirectoryToolDefinition.description,
      parameters: createDirectoryToolDefinition.parameters,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (args: any) =>
        createDirectoryToolDefinition.execute(args, panel),
    }),
    deleteDirectory: tool({
      description: deleteDirectoryToolDefinition.description,
      parameters: deleteDirectoryToolDefinition.parameters,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (args: any) =>
        deleteDirectoryToolDefinition.execute(args, panel),
    }),
    fileStats: tool({
      description: fileStatsToolDefinition.description,
      parameters: fileStatsToolDefinition.parameters,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (args: any) => fileStatsToolDefinition.execute(args, panel),
    }),
    searchFiles: tool({
      description: searchFilesToolDefinition.description,
      parameters: searchFilesToolDefinition.parameters,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (args: any) =>
        searchFilesToolDefinition.execute(args, panel),
    }),
  };
}

// Export a named alias for backward compatibility
export const createCoreTools = createAllTools;
