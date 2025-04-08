import * as vscode from 'vscode';

/**
 * Simple logger implementation.
 * TODO: Replace with a more robust logging library if needed.
 */
// Use simple exported functions instead of namespace

let outputChannel: vscode.OutputChannel;

function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('Apex Coder');
  }
  return outputChannel;
}

export function info(message: string, ...optionalParameters: unknown[]): void {
  const fullMessage = `[INFO] ${message} ${optionalParameters.map(p => String(p)).join(' ')}`;
  getOutputChannel().appendLine(fullMessage);
}

export function warn(message: string, ...optionalParameters: unknown[]): void {
  const fullMessage = `[WARN] ${message} ${optionalParameters.map(p => String(p)).join(' ')}`;
  getOutputChannel().appendLine(fullMessage);
  void vscode.window.showWarningMessage(message);
}

export function error(message: string, ...optionalParameters: unknown[]): void {
  const fullMessage = `[ERROR] ${message} ${optionalParameters.map(p => String(p)).join(' ')}`;
  getOutputChannel().appendLine(fullMessage);
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
