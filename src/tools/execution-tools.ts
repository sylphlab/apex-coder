import * as vscode from 'vscode';
import * as z from 'zod';
import { logger } from '../utils/logger.js';
import { handleToolError, postToolResult } from './coreTools';
import type { ToolContext } from '../types/tool-context.js';

// Define the parameter schema
export const runCommandParameters = z.object({
  command: z.string(),
  workingDirectory: z.string().optional(),
  terminalId: z.string().optional(),
});

// Define the result type
interface RunCommandResult {
  success: boolean;
  output?: string;
  error?: string;
}

// --- runCommand Tool ---
export class RunCommandTool {
  async execute(
    arguments_: z.infer<typeof runCommandParameters>,
    currentPanel?: vscode.WebviewPanel,
    context?: ToolContext,
  ): Promise<RunCommandResult> {
    const toolName = 'runCommand';
    const { command, workingDirectory, terminalId } = arguments_;
    const sessionId = context?.sessionId || 'unknown_session';
    logger.warn(
      `[Tool][${sessionId}] Executing ${toolName}: command="${command}", cwd="${workingDirectory ?? 'default'}", terminalId=${terminalId ?? 'new'}`,
    );

    try {
      // Create or get terminal
      const terminal = terminalId
        ? vscode.window.terminals.find((t) => t.name === terminalId) ||
          vscode.window.createTerminal(terminalId)
        : vscode.window.createTerminal('RunCommand');

      // Change directory if specified
      if (workingDirectory) {
        terminal.sendText(`cd "${workingDirectory}"`);
      }

      // Execute command
      terminal.sendText(command);

      // Return success
      const result: RunCommandResult = {
        success: true,
        output: `Command "${command}" executed in terminal`,
      };

      postToolResult(currentPanel, {
        toolName,
        success: true,
        message: result.output,
      });

      return result;
    } catch (error) {
      const errorResult = handleToolError(error, toolName, currentPanel, arguments_);
      return {
        success: false,
        error: errorResult.message,
      };
    }
  }
}
