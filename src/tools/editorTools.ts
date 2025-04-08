import { z } from "zod";
import * as vscode from "vscode";
import { logger } from "../utils/logger";
import type { ToolResultPayload, OpenFileResult } from "./coreTools";
import { postToolResult, handleToolError } from "./coreTools";

// Zod schema for the parameters
const OpenFileParams = z.object({
  path: z.string().describe("The absolute or relative path to the file."),
});

/**
 * Opens a file in the VS Code editor.
 * @param args Object containing the path to the file.
 * @param panel Optional webview panel to post results.
 * @returns A promise resolving to an object indicating success or failure.
 */
async function executeOpenFile(
  args: z.infer<typeof OpenFileParams>,
  panel: vscode.WebviewPanel | undefined,
): Promise<OpenFileResult> {
  const toolName = "openFile";
  try {
    const uri = vscode.Uri.file(args.path);
    const document = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(document);
    const result: OpenFileResult = {
      toolName,
      success: true,
      message: `Successfully opened file: ${args.path}`,
      path: args.path,
    };
    postToolResult(panel, result);
    return result;
  } catch (error) {
    return handleToolError(
      error,
      toolName,
      panel,
      args,
    ) as unknown as OpenFileResult;
  }
}

// Tool definition
export const openFileToolDefinition = {
  description: "Opens a specified file in the editor.",
  parameters: OpenFileParams,
  execute: executeOpenFile,
};
