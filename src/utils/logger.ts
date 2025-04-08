import * as vscode from "vscode";

/**
 * Simple logger implementation.
 * TODO: Replace with a more robust logging library if needed.
 */
// Use simple exported functions instead of namespace

export function info(message: string, ...optionalParams: unknown[]): void {
  console.info(`[INFO] ${message}`, ...optionalParams); // Use console.info
  // TODO: Implement writing to VS Code OutputChannel if desired
  // Example: getOutputChannel().appendLine(`[INFO] ${message} ${optionalParams.map(p => String(p)).join(' ')}`);
}

export function warn(message: string, ...optionalParams: unknown[]): void {
  console.warn(`[WARN] ${message}`, ...optionalParams);
  // Use void to handle floating promise from showWarningMessage
  void vscode.window.showWarningMessage(message);
}

export function error(message: string, ...optionalParams: unknown[]): void {
  console.error(`[ERROR] ${message}`, ...optionalParams);
  // Avoid showing raw error details in message box for security/UX
  // Use void to handle floating promise from showErrorMessage
  void vscode.window.showErrorMessage(
    `Apex Coder Error: ${message}. Check console/logs for details.`,
  );
}

// Combine logger functions into an object if preferred for namespacing feel
export const logger = { info, warn, error };

// Placeholder for getting/creating an output channel
// let outputChannel: vscode.OutputChannel | undefined;
// function getOutputChannel(): vscode.OutputChannel {
//     if (!outputChannel) {
//         outputChannel = vscode.window.createOutputChannel('Apex Coder');
//     }
//     return outputChannel;
// }
