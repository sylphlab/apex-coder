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
  // items?: string[]; // Removed from base interface
}

// Define a type for directory item details
export interface DirectoryItem {
  name: string;
  type: 'directory' | 'file' | 'other'; // Add more types if needed (e.g., symlink)
  // Add other potential details like size, modified date if available/needed
  size?: number;
  mtime?: number;
}

// Define specific result types for each tool
// These inherit or compose ToolResultPayload as needed
export interface OpenFileResult extends ToolResultPayload {}
export interface ReadFileResult extends ToolResultPayload {
  content?: string; // Already in ToolResultPayload, but explicit here
}
export interface WriteFileResult extends ToolResultPayload {}
export interface ListDirectoryResult extends FilesystemResultPayload {
  items?: DirectoryItem[]; // Keep the detailed items definition here
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
// Import the RAG tool definition
import { searchCodebaseToolDefinition } from "./ragTools";
// Import VS Code interaction tools
import {
    getOpenTabsToolDefinition,
    getActiveTerminalsToolDefinition,
} from "./vscodeInteractionTools";
// Import System Info tools
import {
    getCurrentTimeToolDefinition,
    getSystemInfoToolDefinition,
} from "./systemInfoTools";
// Import Web Access tools
import {
    fetchToolDefinition,
    searchToolDefinition,
} from "./webAccessTools";
// Import Patch tool
import { applyDiffToolDefinition } from "./patchTools";
// Import Execution tool
import { runCommandToolDefinition } from "./executionTools";
// Import Scheduling tool
import { scheduleActionToolDefinition } from "./schedulingTools";
// Import ToolContext
import type { ToolContext } from "../types/toolContext";

/**
 * Creates all tools, injecting the webview panel and potentially session context.
 * @param panel The current webview panel or undefined.
 * @returns Object containing all tools that can be passed to Vercel AI SDK.
 */
export function createAllTools(
  panel: vscode.WebviewPanel | undefined,
  // Context might not be available at creation time, 
  // it needs to be passed during execution.
): Record<string, ReturnType<typeof tool>> {
  // The execute function passed to Vercel needs to accept context.
  // We modify the wrapper here.
  const createToolExecutor = (definition: any) => 
    async (args: any, context?: ToolContext) => definition.execute(args, panel, context);

  return {
    openFile: tool({
      description: openFileToolDefinition.description,
      parameters: openFileToolDefinition.parameters,
      execute: createToolExecutor(openFileToolDefinition),
    }),
    readFile: tool({
      description: readFileToolDefinition.description,
      parameters: readFileToolDefinition.parameters,
      execute: createToolExecutor(readFileToolDefinition),
    }),
    writeFile: tool({
      description: writeFileToolDefinition.description,
      parameters: writeFileToolDefinition.parameters,
      execute: createToolExecutor(writeFileToolDefinition),
    }),
    listDirectory: tool({
      description: listDirectoryToolDefinition.description,
      parameters: listDirectoryToolDefinition.parameters,
      execute: createToolExecutor(listDirectoryToolDefinition),
    }),
    createDirectory: tool({
      description: createDirectoryToolDefinition.description,
      parameters: createDirectoryToolDefinition.parameters,
      execute: createToolExecutor(createDirectoryToolDefinition),
    }),
    deleteDirectory: tool({
      description: deleteDirectoryToolDefinition.description,
      parameters: deleteDirectoryToolDefinition.parameters,
      execute: createToolExecutor(deleteDirectoryToolDefinition),
    }),
    fileStats: tool({
      description: fileStatsToolDefinition.description,
      parameters: fileStatsToolDefinition.parameters,
      execute: createToolExecutor(fileStatsToolDefinition),
    }),
    searchFiles: tool({
      description: searchFilesToolDefinition.description,
      parameters: searchFilesToolDefinition.parameters,
      execute: createToolExecutor(searchFilesToolDefinition),
    }),
    searchCodebase: tool({
        description: searchCodebaseToolDefinition.description,
        parameters: searchCodebaseToolDefinition.parameters,
        execute: createToolExecutor(searchCodebaseToolDefinition),
    }),
    getOpenTabs: tool({
        description: getOpenTabsToolDefinition.description,
        parameters: getOpenTabsToolDefinition.parameters,
        execute: createToolExecutor(getOpenTabsToolDefinition),
    }),
    getActiveTerminals: tool({
        description: getActiveTerminalsToolDefinition.description,
        parameters: getActiveTerminalsToolDefinition.parameters,
        execute: createToolExecutor(getActiveTerminalsToolDefinition),
    }),
    getCurrentTime: tool({
        description: getCurrentTimeToolDefinition.description,
        parameters: getCurrentTimeToolDefinition.parameters,
        execute: createToolExecutor(getCurrentTimeToolDefinition),
    }),
    getSystemInfo: tool({
        description: getSystemInfoToolDefinition.description,
        parameters: getSystemInfoToolDefinition.parameters,
        execute: createToolExecutor(getSystemInfoToolDefinition),
    }),
    fetch: tool({
        description: fetchToolDefinition.description,
        parameters: fetchToolDefinition.parameters,
        execute: createToolExecutor(fetchToolDefinition),
    }),
    "browser/search": tool({
        description: searchToolDefinition.description,
        parameters: searchToolDefinition.parameters,
        execute: createToolExecutor(searchToolDefinition),
    }),
    applyDiff: tool({
        description: applyDiffToolDefinition.description,
        parameters: applyDiffToolDefinition.parameters,
        execute: createToolExecutor(applyDiffToolDefinition),
    }),
    runCommand: tool({
        description: runCommandToolDefinition.description,
        parameters: runCommandToolDefinition.parameters,
        execute: createToolExecutor(runCommandToolDefinition),
    }),
    scheduleAction: tool({
        description: scheduleActionToolDefinition.description,
        parameters: scheduleActionToolDefinition.parameters,
        // Now the executor created by createToolExecutor will pass the context
        execute: createToolExecutor(scheduleActionToolDefinition),
    }),
  };
}

// Export a named alias for backward compatibility
export const createCoreTools = createAllTools;
