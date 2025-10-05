import * as vscode from 'vscode';
import { CodePlanrProvider } from './providers/CodePlanrProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('CodePlanr extension is now active!');

    // Create the webview provider
    const provider = new CodePlanrProvider(context.extensionUri);

    // Register the webview provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('codePlanrChat', provider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    // Register commands
    const configureApiKeyCommand = vscode.commands.registerCommand('CodePlanr.configureApiKey', async () => {
        const apiKey = await vscode.window.showInputBox({
            prompt: 'Enter your OpenAI API Key',
            placeHolder: 'sk-...',
            password: true,
            ignoreFocusOut: true,
            title: 'Configure OpenAI API Key'
        });

        if (apiKey) {
            const config = vscode.workspace.getConfiguration('CodePlanr');
            await config.update('openaiApiKey', apiKey, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage('OpenAI API Key configured successfully!');
        }
    });

    context.subscriptions.push(configureApiKeyCommand);
}

export function deactivate() {
    // Clean up resources if needed
}