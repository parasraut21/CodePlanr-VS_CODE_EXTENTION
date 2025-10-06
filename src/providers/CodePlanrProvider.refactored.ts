import * as vscode from 'vscode';
import { MessageHandler } from './MessageHandler';
import { FileHandler } from './FileHandler';
import { ConfigHandler } from './ConfigHandler';
import { WebviewTemplate } from './WebviewTemplate';

/**
 * Main provider for CodePlanr webview
 * Coordinates between different handlers
 */
export class CodePlanrProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codePlanrChat';
    private _view?: vscode.WebviewView;
    private messageHandler?: MessageHandler;
    private fileHandler: FileHandler;
    private configHandler: ConfigHandler;

    constructor(private readonly _extensionUri: vscode.Uri) {
        this.fileHandler = new FileHandler();
        this.configHandler = new ConfigHandler();
    }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        _context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = WebviewTemplate.getHtml(webviewView.webview);

        // Initialize message handler
        this.messageHandler = new MessageHandler(
            webviewView,
            () => this.configHandler.getCurrentModel(),
            () => this.configHandler.getApiKey()
        );

        // Send current model to webview
        setTimeout(() => {
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'setModel',
                    model: this.configHandler.getCurrentModel()
                });
            }
        }, 100);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            async message => {
                switch (message.type) {
                    case 'sendMessage':
                        await this.messageHandler?.handleSendMessage(message.text);
                        break;
                    case 'sendAgentTask':
                        await this.messageHandler?.handleAgentTask(message.text);
                        break;
                    case 'configureApiKey':
                        await this.handleConfigureApiKey();
                        break;
                    case 'clearChat':
                        this.handleClearChat();
                        break;
                    case 'exportPlan':
                        await this.handleExportPlan();
                        break;
                    case 'copyCode':
                        await this.fileHandler.handleCopyCode(message.code);
                        break;
                    case 'openFile':
                        await this.fileHandler.handleOpenFile(message.filePath);
                        break;
                    case 'uploadFile':
                        await this.handleFileUpload();
                        break;
                    case 'changeModel':
                        await this.handleModelChange(message.model);
                        break;
                }
            },
            null,
            []
        );
    }

    private async handleConfigureApiKey() {
        await this.configHandler.configureApiKey();
        
        if (this._view) {
            this._view.webview.postMessage({
                type: 'showNotification',
                message: '✅ API Key configured successfully!'
            });
        }
    }

    private handleClearChat() {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'clearMessages'
            });
        }
    }

    private async handleExportPlan() {
        const plan = this.messageHandler?.getCurrentPlan();
        if (!plan) {
            vscode.window.showWarningMessage('No plan to export');
            return;
        }

        const planText = `# ${plan.task}\n\n${plan.steps.map(s => `${s.id}. [${s.status}] ${s.description}`).join('\n')}`;
        await this.fileHandler.handleExportPlan(planText);
    }

    private async handleFileUpload() {
        const fileData = await this.fileHandler.handleFileUpload();
        
        if (fileData && this._view) {
            this._view.webview.postMessage({
                type: 'fileUploaded',
                fileName: fileData.fileName,
                filePath: fileData.filePath,
                content: fileData.content
            });
        }
    }

    private async handleModelChange(model: string) {
        await this.configHandler.changeModel(model);
        
        if (this._view) {
            this._view.webview.postMessage({
                type: 'showNotification',
                message: `✅ Model changed to ${model}`
            });
        }
    }
}
