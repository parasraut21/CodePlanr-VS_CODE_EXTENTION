import * as vscode from 'vscode';
import { CodePlanrProvider } from './providers/CodePlanrProvider';
import { MastraAgentProvider } from './providers/MastraAgentProvider';

export function activate(context: vscode.ExtensionContext) {
    console.log('CodePlanr is now active!');

    // Create the chat webview provider
    const chatProvider = new CodePlanrProvider(context.extensionUri);

    // Register the webview provider for sidebar
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('codePlanrChat', chatProvider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

    // Create Mastra Agent provider
    const mastraAgent = new MastraAgentProvider();

    // Configure API Key command
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
            vscode.window.showInformationMessage('✅ API Key configured successfully!');
        }
    });

    // Agent Mode command
    const agentCommand = vscode.commands.registerCommand('CodePlanr.agent', async () => {
        const userRequest = await vscode.window.showInputBox({
            prompt: 'What would you like me to do?',
            placeHolder: 'e.g., Create a C++ file for addition of 2 numbers',
            ignoreFocusOut: true,
            title: '🤖 AI Agent'
        });

        if (!userRequest) return;

        try {
            await vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: '🤖 Agent working...',
                cancellable: false
            }, async () => {
                await mastraAgent.executeAgentRequest(userRequest);
            });
        } catch (error) {
            vscode.window.showErrorMessage(`❌ Agent failed: ${error}`);
        }
    });

    context.subscriptions.push(
        configureApiKeyCommand,
        agentCommand,
        mastraAgent
    );
}

export function deactivate() {
    // Clean up resources if needed
}