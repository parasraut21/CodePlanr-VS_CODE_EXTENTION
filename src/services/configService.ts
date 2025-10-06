import * as vscode from 'vscode';
import { DEFAULT_MODEL } from '../utils/constants';

export class ConfigService {
    private static readonly CONFIG_KEY = 'CodePlanr';
    private static readonly API_KEY_FIELD = 'openaiApiKey';
    private static readonly MODEL_FIELD = 'model';

    static async getApiKey(): Promise<string | null> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_KEY);
        const apiKey = config.get<string>(this.API_KEY_FIELD);
        
        if (apiKey && apiKey.trim()) {
            return apiKey.trim();
        }

        const envApiKey = process.env.OPENAI_API_KEY;
        if (envApiKey && envApiKey.trim()) {
            return envApiKey.trim();
        }

        return null;
    }

    static async setApiKey(apiKey: string): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_KEY);
        await config.update(this.API_KEY_FIELD, apiKey, vscode.ConfigurationTarget.Global);
    }

    static getModel(): string {
        const config = vscode.workspace.getConfiguration(this.CONFIG_KEY);
        return config.get<string>(this.MODEL_FIELD) || DEFAULT_MODEL;
    }

    static async setModel(model: string): Promise<void> {
        const config = vscode.workspace.getConfiguration(this.CONFIG_KEY);
        await config.update(this.MODEL_FIELD, model, vscode.ConfigurationTarget.Global);
    }

    static async promptForApiKey(): Promise<string | undefined> {
        return await vscode.window.showInputBox({
            prompt: 'Enter your OpenAI API Key',
            placeHolder: 'sk-...',
            password: true,
            ignoreFocusOut: true,
            title: 'Configure OpenAI API Key'
        });
    }
}
