import type { ToolResultPayload } from "./coreTools";
import * as diff from 'diff';
// Import ToolContext
import type { ToolContext } from "../types/toolContext";
// Import file lock manager
import { acquireLock } from "../utils/fileLockManager";

// --- applyDiff Tool ---
// ... existing code ...
    async execute(
        args: z.infer<typeof applyDiffParameters>,
        currentPanel?: vscode.WebviewPanel,
        context?: ToolContext // Add context parameter
    ): Promise<ApplyDiffResult> {
        const toolName = "applyDiff";
        const { filePath, diffContent } = args;
        // Log session info if available
        const sessionId = context?.sessionId || 'unknown_session';
        logger.info(`[Tool][${sessionId}] Executing ${toolName} on: ${filePath}`);

        let fileUri: vscode.Uri;
        let originalContent: string = '';
        let status: ApplyDiffResult['status'] = 'failed';
        let releaseLock: ReleaseLockFunction | null = null; // Variable to hold the release function

        try {
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (!workspaceFolders?.length) {
                throw new Error("No workspace folder open");
            }
            const rootUri = workspaceFolders[0].uri;
            fileUri = vscode.Uri.joinPath(rootUri, filePath);
            const absolutePath = fileUri.fsPath; // Use absolute path for locking

            // 1. Acquire Lock
            logger.info(`[Tool][${sessionId}] Attempting to acquire lock for ${absolutePath}`);
            releaseLock = await acquireLock(absolutePath);
            logger.info(`[Tool][${sessionId}] Lock acquired for ${absolutePath}`);

            // 2. Read the file
            try {
// ... (rest of try block) ...
            }

            // 3. Apply the patch
            const patchedContent = diff.applyPatch(originalContent, diffContent);

            if (patchedContent === false) {
                status = 'failed';
                throw new Error(`Failed to apply patch to ${filePath}. Content might have changed, or patch format is invalid.`);
            }

            // 4. Write the patched content back
            await vscode.workspace.fs.writeFile(fileUri, Buffer.from(patchedContent, 'utf-8'));
            status = 'applied';

            const successMsg = `Successfully applied patch to ${filePath}.`;
// ... (rest of try block) ...
        } catch (error) {
            const errorResult = handleToolError(
// ... (catch block) ...
        } finally {
            // 5. Release Lock
            if (releaseLock) {
                logger.info(`[Tool][${sessionId}] Releasing lock for ${filePath}`);
                releaseLock();
            }
        }
    },
};
