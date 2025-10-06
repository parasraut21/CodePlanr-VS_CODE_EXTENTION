import * as vscode from 'vscode';

/**
 * Handles configuration and settings management
 */
export class ConfigHandler {
    public async configureApiKey(): Promise<void> {
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
            return;
        }
    }

    public async changeModel(model: string): Promise<void> {
        const config = vscode.workspace.getConfiguration('CodePlanr');
        await config.update('model', model, vscode.ConfigurationTarget.Global);
    }

    public getCurrentModel(): string {
        const config = vscode.workspace.getConfiguration('CodePlanr');
        return config.get<string>('model') || 'gpt-4o';
    }

    public async getApiKey(): Promise<string | null> {
        const config = vscode.workspace.getConfiguration('CodePlanr');
        const apiKey = config.get<string>('openaiApiKey');
        if (apiKey && apiKey.trim()) {
            return apiKey.trim();
        }

        const envApiKey = process.env.OPENAI_API_KEY;
        if (envApiKey && envApiKey.trim()) {
            return envApiKey.trim();
        }

        return null;
    }
}
