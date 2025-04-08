import * as vscode from 'vscode';
import { z } from 'zod';
import { handleToolError, postToolResult, type OpenFileResult } from './core-tools.ts';

// Zod schema for the parameters
const OpenFileParameters = z.object({
  path: z.string().describe('The absolute or relative path to the file.'),
});

/**
 * Opens a file in the VS Code editor.
 * @param args Object containing the path to the file.
 * @param panel Optional webview panel to post results.
 * @returns A promise resolving to an object indicating success or failure.
 */
async function executeOpenFile(
  arguments_: z.infer<typeof OpenFileParameters>,
  panel: vscode.WebviewPanel | undefined,
): Promise<OpenFileResult> {
  const toolName = 'openFile';
  try {
    const uri = vscode.Uri.file(arguments_.path);
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
    const result: OpenFileResult = {
      toolName,
      success: true,
      message: `Successfully opened file: ${arguments_.path}`,
      path: arguments_.path,
    };
    postToolResult(panel, result);
    return result;
  } catch (error) {
    return handleToolError(error, toolName, panel, arguments_) as unknown as OpenFileResult;
  }
}

// Tool definition
export const openFileToolDefinition = {
  description: 'Opens a specified file in the editor.',
  parameters: OpenFileParameters,
  execute: executeOpenFile,
};
