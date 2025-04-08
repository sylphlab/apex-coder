import { logger } from "../utils/logger";
import { handleToolError, postToolResult } from "./coreTools";
import type { ToolResultPayload } from "./coreTools";
import type { ToolContext } from "../types/toolContext";

// --- runCommand Tool ---
async execute(
    args: z.infer<typeof runCommandParameters>,
    currentPanel?: vscode.WebviewPanel,
    context?: ToolContext
): Promise<RunCommandResult> {
    const toolName = "runCommand";
    const { command, workingDirectory, terminalId } = args;
    const sessionId = context?.sessionId || 'unknown_session';
    logger.warn(`[Tool][${sessionId}] Executing ${toolName}: command="${command}", cwd="${workingDirectory ?? 'default'}", terminalId=${terminalId ?? 'new'}`);

    // ... rest of execute method ...
} 