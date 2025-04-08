import * as vscode from 'vscode';
import * as z from 'zod';
import * as diff from 'diff';
import { logger } from '../utils/logger.js';
import type { ToolResultPayload } from "./core-tools.js";
import type { ToolContext } from "../types/tool-context.js";
import { acquireLock } from "../utils/file-lock-manager.js";

type ReleaseLockFunction = () => Promise<void>;
type ApplyDiffResult = ToolResultPayload & {
  status: 'success' | 'failed';
};

const applyDiffParameters = z.object({
  filePath: z.string(),
  diffContent: z.string(),
});

export const patchTool = {
  name: 'applyDiff',
  description: 'Applies a diff/patch to a file',
  parameters: applyDiffParameters,
  execute: async (
    args: z.infer<typeof applyDiffParameters>,
    currentPanel?: vscode.WebviewPanel,
    context?: ToolContext
  ): Promise<ApplyDiffResult> => {
    const toolName = "applyDiff";
    const { filePath, diffContent } = args;
    const sessionId = context?.sessionId || 'unknown_session';
    
    logger.info(`[Tool][${sessionId}] Executing ${toolName} on: ${filePath}`);

    let fileUri: vscode.Uri;
    let originalContent = '';
    let status: ApplyDiffResult['status'] = 'failed';
    let releaseLock: ReleaseLockFunction | null = null;

    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders?.length) {
        throw new Error('No workspace folder open');
      }

      const rootUri = workspaceFolders[0].uri;
      fileUri = vscode.Uri.joinPath(rootUri, filePath);
      const absolutePath = fileUri.fsPath;

      logger.info(`[Tool][${sessionId}] Attempting to acquire lock for ${absolutePath}`);
      releaseLock = await acquireLock(absolutePath);
      logger.info(`[Tool][${sessionId}] Lock acquired for ${absolutePath}`);

      try {
        originalContent = (await vscode.workspace.fs.readFile(fileUri)).toString();
        const patchedContent = diff.applyPatch(originalContent, diffContent);

        if (patchedContent === false) {
          throw new Error(`Failed to apply patch to ${filePath}. Content might have changed, or patch format is invalid.`);
        }

        await vscode.workspace.fs.writeFile(fileUri, Buffer.from(patchedContent, 'utf-8'));
        status = 'success';
        const successMsg = `Successfully applied patch to ${filePath}.`;
        return { toolName, success: true, output: successMsg, status };
      } catch (error) {
        const errorResult = handleToolError(error, toolName, currentPanel);
        return { ...errorResult, status };
      }
    } finally {
      if (releaseLock) {
        logger.info(`[Tool][${sessionId}] Releasing lock for ${filePath}`);
        await releaseLock();
      }
    }
  },
};

function handleToolError(error: unknown, toolName: string, _panel?: vscode.WebviewPanel): ToolResultPayload { // eslint-disable-line @typescript-eslint/no-unused-vars
  const errorMessage = error instanceof Error ? error.message : String(error);
  return { toolName, success: false, error: errorMessage };
}
