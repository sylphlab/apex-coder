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
    // Add the new RAG tool
    searchCodebase: tool({
      description: searchCodebaseToolDefinition.description,
      parameters: searchCodebaseToolDefinition.parameters,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      execute: async (args: any) => searchCodebaseToolDefinition.execute(args, panel),
    }),
    // VS Code Interaction Tools
    getOpenTabs: tool({
        description: getOpenTabsToolDefinition.description,
        parameters: getOpenTabsToolDefinition.parameters,
        execute: async (args: any) => getOpenTabsToolDefinition.execute(args, panel),
    }),
    getActiveTerminals: tool({
        description: getActiveTerminalsToolDefinition.description,
        parameters: getActiveTerminalsToolDefinition.parameters,
        execute: async (args: any) => getActiveTerminalsToolDefinition.execute(args, panel),
    }),
    // System Info Tools
    getCurrentTime: tool({
        description: getCurrentTimeToolDefinition.description,
        parameters: getCurrentTimeToolDefinition.parameters,
        execute: async (args: any) => getCurrentTimeToolDefinition.execute(args, panel),
    }),
    getSystemInfo: tool({
        description: getSystemInfoToolDefinition.description,
        parameters: getSystemInfoToolDefinition.parameters,
        execute: async (args: any) => getSystemInfoToolDefinition.execute(args, panel),
    }),
    // Web Access Tools
    fetch: tool({
        description: fetchToolDefinition.description,
        parameters: fetchToolDefinition.parameters,
        execute: async (args: any) => fetchToolDefinition.execute(args, panel),
    }),
    "browser/search": tool({
        description: searchToolDefinition.description,
        parameters: searchToolDefinition.parameters,
        execute: async (args: any) => searchToolDefinition.execute(args, panel),
    }),
    // Patch Tool
    applyDiff: tool({
        description: applyDiffToolDefinition.description,
        parameters: applyDiffToolDefinition.parameters,
        execute: async (args: any) => applyDiffToolDefinition.execute(args, panel),
    }),
    // Execution Tool
    runCommand: tool({
        description: runCommandToolDefinition.description,
        parameters: runCommandToolDefinition.parameters,
        execute: async (args: any) => runCommandToolDefinition.execute(args, panel),
    }),
    // Scheduling Tool
    scheduleAction: tool({
        description: scheduleActionToolDefinition.description,
        parameters: scheduleActionToolDefinition.parameters,
        // IMPORTANT: This execute wrapper needs modification to pass currentSessionId
        execute: async (args: any) => {
            // How to get currentSessionId here? 
            // Option 1: Modify createAllTools to accept session context?
            // Option 2: The calling code in panelManager needs to inject it.
            // For now, call without it (will fail inside execute)
            logger.warn("[CoreTools] scheduleAction called, but currentSessionId passing is not implemented in wrapper.");
            return scheduleActionToolDefinition.execute(args, panel, undefined);
        },
    }),
  };
}

// Export a named alias for backward compatibility
export const createCoreTools = createAllTools;
