import * as vscode from 'vscode';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {

	console.log('[Apex Coder Minimal] Activating...'); // Minimal log

	// Register a very simple command
	const disposable = vscode.commands.registerCommand('apex-coder.helloSimple', () => {
		vscode.window.showInformationMessage('Hello Simple from Apex Coder!');
	});

	context.subscriptions.push(disposable);

	console.log('[Apex Coder Minimal] Activation finished.'); // Minimal log
}

// This method is called when your extension is deactivated
export function deactivate() {
    console.log('[Apex Coder Minimal] Deactivating...');
}
