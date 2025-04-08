import type * as vscode from 'vscode';
import { tool, type Tool } from 'ai';
import type { ToolExecutionOptions } from 'ai';

// Base result interface
export interface ToolResult {
  toolName: string;
  success: boolean;
  message: string;
  path?: string;
  error?: string;
  content?: string;
}

// Specific tool result types
export interface OpenFileResult extends ToolResult {
  path: string;
}

// Utility functions for tool operations
export function handleToolError(
  error: unknown,
  toolName: string,
  panel?: vscode.WebviewPanel,
  _arguments_?: Record<string, unknown> // eslint-disable-line @typescript-eslint/no-unused-vars
): ToolResult {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const result: ToolResult = {
    toolName,
    success: false,
    message: `Tool ${toolName} failed: ${errorMessage}`,
    error: errorMessage,
  };
  if (panel) {
    panel.webview.postMessage({
      command: 'toolError',
      data: result, // Added comma
    });
  }
  return result;
}

export function postToolResult(
  panel: vscode.WebviewPanel | undefined,
  result: ToolResult, // Fixed formatting
): void {
  if (panel) {
    panel.webview.postMessage({
      command: 'toolResult',
      data: result, // Added comma
    });
  }
}

// Import all tool definitions
import { openFileToolDefinition } from './editor-tools.js';
import { readFileToolDefinition } from './file-read-write-tools.js';
import { writeFileToolDefinition } from './file-read-write-tools.js';
import { listDirectoryToolDefinition } from './directory-tools.js';
import { createDirectoryToolDefinition } from './directory-tools.js';
import { deleteDirectoryToolDefinition } from './directory-tools.js';
import { fileStatsToolDefinition } from './file-system-query-tools.js';
import { searchFilesToolDefinition } from './file-system-query-tools.js';
import { generateObjectToolDefinition } from './object-generation-tools.js';

// Helper to create tools with proper typing
function createTool<T>(definition: {
  description: string;
  parameters: unknown;
  execute: (arguments_: unknown, panel?: vscode.WebviewPanel) => Promise<T & ToolResult>;
}): Tool {
  return tool({
    description: definition.description,
    parameters: definition.parameters,
    execute: (arguments_: unknown, options: ToolExecutionOptions) => {
      const panel = (options.context as { panel?: vscode.WebviewPanel }).panel;
      return definition.execute(arguments_, panel);
    },
  });
}

// Create all tools with proper type checking
export function createAllTools(): Record<string, Tool> {
  return {
    openFile: createTool({
      ...openFileToolDefinition,
      execute: async (arguments_, panel) => {
        if (typeof arguments_ !== 'object' || arguments_ === null || !('path' in arguments_)) {
          throw new Error('Invalid arguments for openFile');
        }
        // Type is already correct from the generic parameter in createTool
        return openFileToolDefinition.execute(arguments_, panel);
      },
    }),
    readFile: createTool({
      ...readFileToolDefinition,
      execute: async (arguments_, panel) => {
        if (typeof arguments_ !== 'object' || arguments_ === null || !('path' in arguments_)) {
          throw new Error('Invalid arguments for readFile');
        }
        return readFileToolDefinition.execute(arguments_, panel) as Promise<ToolResult>;
      },
    }),
    writeFile: createTool({
      ...writeFileToolDefinition,
      execute: async (arguments_, panel) => {
        if (
          typeof arguments_ !== 'object' ||
          arguments_ === null ||
          !('path' in arguments_) ||
          !('content' in arguments_) ||
          !('overwrite' in arguments_)
        ) {
          throw new Error('Invalid arguments for writeFile');
        }
        return writeFileToolDefinition.execute(arguments_, panel) as Promise<ToolResult>;
      },
    }),
    listDirectory: createTool({
      ...listDirectoryToolDefinition,
      execute: async (arguments_, panel) => {
        if (typeof arguments_ !== 'object' || arguments_ === null || !('path' in arguments_)) {
          throw new Error('Invalid arguments for listDirectory');
        }
        const result = (await listDirectoryToolDefinition.execute(arguments_, panel)) as ToolResult;
        return {
          ...result,
          toolName: 'listDirectory',
          message: 'Directory listed',
        } as ToolResult;
      },
    }),
    createDirectory: createTool({
      ...createDirectoryToolDefinition,
      execute: async (arguments_, panel) => {
        if (typeof arguments_ !== 'object' || arguments_ === null || !('path' in arguments_)) {
          throw new Error('Invalid arguments for createDirectory');
        }
        return createDirectoryToolDefinition.execute(arguments_, panel) as Promise<ToolResult>;
      },
    }),
    deleteDirectory: createTool({
      ...deleteDirectoryToolDefinition,
      execute: async (arguments_, panel) => {
        if (typeof arguments_ !== 'object' || arguments_ === null || !('path' in arguments_)) {
          throw new Error('Invalid arguments for deleteDirectory');
        }
        return deleteDirectoryToolDefinition.execute(arguments_, panel) as Promise<ToolResult>;
      },
    }),
    fileStats: createTool({
      ...fileStatsToolDefinition,
      execute: async (arguments_, panel) => {
        if (typeof arguments_ !== 'object' || arguments_ === null || !('path' in arguments_)) {
          throw new Error('Invalid arguments for fileStats');
        }
        const result = (await fileStatsToolDefinition.execute(arguments_, panel)) as ToolResult;
        return {
          ...result,
          toolName: 'fileStats',
          message: 'File stats retrieved',
        } as ToolResult;
      },
    }),
    searchFiles: createTool({
      ...searchFilesToolDefinition,
      execute: async (arguments_, panel) => {
        if (
          typeof arguments_ !== 'object' ||
          arguments_ === null ||
          !('directoryPath' in arguments_) ||
          !('pattern' in arguments_)
        ) {
          throw new Error('Invalid arguments for searchFiles');
        }
        const result = (await searchFilesToolDefinition.execute(arguments_, panel)) as ToolResult;
        return {
          ...result,
          toolName: 'searchFiles',
          message: 'Search completed',
        } as ToolResult;
      },
    }),
    generateObject: createTool({
      ...generateObjectToolDefinition,
      execute: async (arguments_, panel) => {
        const result = (await generateObjectToolDefinition.execute(
          arguments_,
          panel,
        )) as ToolResult;
        return {
          ...result,
          toolName: 'generateObject',
          message: 'Object generated',
        } as ToolResult;
      },
    }),
  };
}
