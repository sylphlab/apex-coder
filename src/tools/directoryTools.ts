import { z } from "zod";
import * as vscode from "vscode";
import { logger } from "../utils/logger";
import type {
  FilesystemResultPayload,
  ListDirectoryResult,
  DirectoryActionResult,
  ToolResultPayload,
} from "./coreTools";
import { postToolResult, handleToolError } from "./coreTools";

/**
 * Lists directory contents.
 */
export const listDirectoryToolDefinition = {
  description:
    "Lists contents (files and subdirectories) of a specified directory.",
  parameters: z.object({
    path: z
      .string()
      .describe(
        'Directory path relative to workspace root (e.g., "src/utils")',
      ),
    // recursive: z.boolean().default(false).describe('List recursively (Not yet implemented)') // Keep recursive param but note limitation
  }),
  /**
   * Executes the list directory tool.
   * @param args - The arguments for the tool.
   * @param currentPanel - The active webview panel.
   * @returns An object indicating success or failure, including the list of items for the AI model.
   */
  async execute(
    args: { path: string /*, recursive: boolean*/ },
    currentPanel?: vscode.WebviewPanel,
  ): Promise<ListDirectoryResult> {
    const toolName = "listDirectory";
    const { path: relativePath /*, recursive*/ } = args;
    // const recursiveInfo = recursive ? ' (recursive)' : ''; // Add back when implemented
    logger.info(`[Tool] Executing listDirectory: ${relativePath}`);

    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders?.length) {
        throw new Error("No workspace folder open");
      }
      const rootUri = workspaceFolders[0].uri;
      const absolutePath =
        relativePath === "." || relativePath === ""
          ? rootUri // Handle root case
          : vscode.Uri.joinPath(rootUri, relativePath);

      // Verify it's a directory
      let stat: vscode.FileStat;
      try {
        stat = await vscode.workspace.fs.stat(absolutePath);
      } catch (statError: unknown) {
        if (
          (statError instanceof Error &&
            (statError as vscode.FileSystemError).code === "FileNotFound") ||
          (statError as vscode.FileSystemError).code === "EntryNotFound"
        ) {
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
      const formattedItems = items.map(([name, type]) => {
        const itemType =
          type === vscode.FileType.Directory
            ? "directory"
            : type === vscode.FileType.File
              ? "file"
              : "other";
        return {
          name,
          type: itemType as 'directory' | 'file' | 'other', // Explicitly cast type again
        };
      });

      const successMsg = `Successfully listed directory: ${relativePath}`;
      logger.info(`[Tool] ${successMsg}`);

      // Post result to webview - Note: FilesystemResultPayload no longer has 'items'
      // We might need a different payload type or adjust this if webview needs the list.
      const postPayload: Omit<FilesystemResultPayload, 'items'> & { itemsDescription?: string } = {
        toolName: toolName,
        success: true,
        message: successMsg,
        path: relativePath,
        // items: formattedItems.map( // Cannot assign to postPayload now
        //   (item) => `${item.name}${item.type === "directory" ? "/" : ""}`,
        // ),
        itemsDescription: `Found ${formattedItems.length} items.`, // Send a description instead
        isDirectory: true,
      };
      postToolResult(currentPanel, postPayload as ToolResultPayload); // Cast needed as we modified the structure

      // Return structure matching ListDirectoryResult for AI
      const result: ListDirectoryResult = {
        toolName: toolName,
        success: true,
        message: successMsg,
        path: relativePath,
        items: formattedItems,
        isDirectory: true,
      };
      return result;
    } catch (error) {
      const errorResult = handleToolError(
        error,
        toolName,
        currentPanel,
        args,
      ) as unknown as ListDirectoryResult;
      return {
        toolName: toolName,
        success: false,
        message: errorResult.message || "Failed to list directory.",
        path: relativePath,
        items: [],
        error: errorResult.error,
        isDirectory: undefined,
      };
    }
  },
};

/**
 * Creates a directory.
 */
export const createDirectoryToolDefinition = {
  description:
    "Creates a directory, including any necessary parent directories.",
  parameters: z.object({
    path: z
      .string()
      .describe(
        'Directory path relative to workspace root to create (e.g., "src/new_module/utils")',
      ),
  }),
  /**
   * Executes the create directory tool.
   * @param args - The arguments for the tool.
   * @param currentPanel - The active webview panel.
   * @returns An object indicating success or failure for the AI model.
   */
  async execute(
    args: { path: string },
    currentPanel?: vscode.WebviewPanel,
  ): Promise<DirectoryActionResult> {
    const toolName = "createDirectory";
    const { path: relativePath } = args;
    logger.info(`[Tool] Executing createDirectory: ${relativePath}`);

    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders?.length) {
        throw new Error("No workspace folder open");
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
            toolName: toolName,
            success: true, // Treat as success
            message: warnMsg,
            path: relativePath,
            isDirectory: true,
          };
          postToolResult(currentPanel, resultPayload);
          return {
            toolName: toolName,
            success: true,
            message: "Directory already exists.",
            path: relativePath,
          };
        } else {
          // Exists but is not a directory (e.g., a file)
          throw new Error(
            `Path "${relativePath}" already exists but is not a directory.`,
          );
        }
      } catch (statError: unknown) {
        if (
          statError instanceof Error &&
          (statError as vscode.FileSystemError).code !== "FileNotFound" &&
          (statError as vscode.FileSystemError).code !== "EntryNotFound"
        ) {
          throw statError; // Re-throw unexpected errors
        }
        // File/Dir does not exist, proceed with creation
      }

      await vscode.workspace.fs.createDirectory(absolutePath); // createDirectory is recursive

      const successMsg = `Successfully created directory: ${relativePath}`;
      logger.info(`[Tool] ${successMsg}`);
      const resultPayload: FilesystemResultPayload = {
        toolName: toolName,
        success: true,
        message: successMsg,
        path: relativePath,
        isDirectory: true,
      };
      postToolResult(currentPanel, resultPayload);
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
      ) as unknown as DirectoryActionResult;
      return {
        toolName: toolName,
        success: false,
        message: errorResult.message || "Failed to create directory.",
        path: relativePath,
        error: errorResult.error,
      };
    }
  },
};

/**
 * Deletes a directory (recursively).
 */
export const deleteDirectoryToolDefinition = {
  description:
    "Deletes a directory and all its contents recursively. Use with extreme caution!",
  parameters: z.object({
    path: z
      .string()
      .describe(
        'Directory path relative to workspace root to delete (e.g., "dist" or "temp_files")',
      ),
  }),
  /**
   * Executes the delete directory tool.
   * @param args - The arguments for the tool.
   * @param currentPanel - The active webview panel.
   * @returns An object indicating success or failure for the AI model.
   */
  async execute(
    args: { path: string },
    currentPanel?: vscode.WebviewPanel,
  ): Promise<DirectoryActionResult> {
    const toolName = "deleteDirectory";
    const { path: relativePath } = args;
    logger.warn(
      `[Tool] Executing deleteDirectory (recursive): ${relativePath}`,
    ); // Log as warning due to destructive nature

    // Basic safety check: prevent deleting root or very short paths accidentally
    if (
      !relativePath ||
      relativePath === "." ||
      relativePath === "/" ||
      relativePath.length < 3
    ) {
      const errMsg = `Safety check failed: Attempted to delete potentially dangerous path "${relativePath}". Operation aborted.`;
      logger.error(`[Tool] ${errMsg}`);
      vscode.window.showErrorMessage(errMsg);
      const resultPayload: FilesystemResultPayload = {
        toolName: toolName,
        success: false,
        message: errMsg,
        path: relativePath,
        error: "Safety check failed",
      };
      postToolResult(currentPanel, resultPayload);
      const result: DirectoryActionResult = {
        toolName: toolName,
        success: false,
        message: errMsg,
        path: relativePath,
        error: "Safety check failed",
      };
      return result;
    }

    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders?.length) {
        throw new Error("No workspace folder open");
      }
      const rootUri = workspaceFolders[0].uri;
      const absolutePath = vscode.Uri.joinPath(rootUri, relativePath);

      // Verify it exists and is a directory before attempting delete
      try {
        const stat = await vscode.workspace.fs.stat(absolutePath);
        if (stat.type !== vscode.FileType.Directory) {
          throw new Error(`Path "${relativePath}" is not a directory.`);
        }
      } catch (statError: unknown) {
        if (
          (statError instanceof Error &&
            (statError as vscode.FileSystemError).code === "FileNotFound") ||
          (statError as vscode.FileSystemError).code === "EntryNotFound"
        ) {
          throw new Error(`Directory not found at path: ${relativePath}`);
        }
        throw statError; // Re-throw other stat errors
      }

      await vscode.workspace.fs.delete(absolutePath, {
        recursive: true,
        useTrash: false,
      }); // Ensure recursive, consider useTrash preference

      const successMsg = `Successfully deleted directory: ${relativePath}`;
      logger.info(`[Tool] ${successMsg}`);
      const resultPayload: FilesystemResultPayload = {
        toolName: toolName,
        success: true,
        message: successMsg,
        path: relativePath,
        isDirectory: true, // It *was* a directory
      };
      postToolResult(currentPanel, resultPayload);
      const result: DirectoryActionResult = {
        toolName: toolName,
        success: true,
        message: successMsg,
        path: relativePath,
      };
      return result;
    } catch (error) {
      const errorResult = handleToolError(
        error,
        toolName,
        currentPanel,
        args,
      ) as unknown as DirectoryActionResult;
      return {
        toolName: toolName,
        success: false,
        message: errorResult.message || "Failed to delete directory.",
        path: relativePath,
        error: errorResult.error,
      };
    }
  },
};

// Note: deleteFileTool was defined in filesystemTools.ts but not exported or used in createFilesystemTools.
// If needed, it should be added here or in fileReadWriteTools.ts.
// Example:
/*
export const deleteFileToolDefinition = { ... };
*/
