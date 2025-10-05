import * as vscode from 'vscode';
import * as path from 'path';
import { SidebarWebviewProvider } from './providers/sidebarWebviewProvider';

export function activate(context: vscode.ExtensionContext) {
	console.log('CodePlanr extension is now active!');

    // Create sidebar webview provider
    const sidebarProvider = new SidebarWebviewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(SidebarWebviewProvider.viewType, sidebarProvider, {
            webviewOptions: { retainContextWhenHidden: true }
        })
    );

	// Register the command to open the chat panel
	const openChatCommand = vscode.commands.registerCommand('CodePlanr.openChat', () => {
		ChatPanel.createOrShow(context.extensionUri);
	});

	// Register other commands
	const generatePlanCommand = vscode.commands.registerCommand('CodePlanr.generatePlan', async () => {
		await handleGeneratePlan();
	});

	const applyChangesCommand = vscode.commands.registerCommand('CodePlanr.applyChanges', async () => {
		await handleApplyChanges();
	});

	const configureApiKeyCommand = vscode.commands.registerCommand('CodePlanr.configureApiKey', async () => {
		await handleConfigureApiKey();
	});

	// Add all commands to subscriptions
	context.subscriptions.push(
		openChatCommand,
		generatePlanCommand,
		applyChangesCommand,
		configureApiKeyCommand
	);

	// Note: Sidebar will be available in the Activity Bar
}

export function deactivate() {
	// Clean up resources if needed
}

class ChatPanel {
	public static currentPanel: ChatPanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it
		if (ChatPanel.currentPanel) {
			ChatPanel.currentPanel._panel.reveal(column);
			return;
		}

		// Otherwise, create a new panel
		const panel = vscode.window.createWebviewPanel(
			'codePlanrChat',
			'CodePlanr AI Chat',
			column || vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true,
				localResourceRoots: [
					vscode.Uri.joinPath(extensionUri, 'media')
				]
			}
		);

		ChatPanel.currentPanel = new ChatPanel(panel, extensionUri);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'sendMessage':
						this._handleSendMessage(message.text);
						return;
					case 'clearChat':
						this._handleClearChat();
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public dispose() {
		ChatPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _handleSendMessage(text: string) {
		console.log('Received message:', text);
		
		// Don't add user message here - it's already added in the webview
		// Just process the AI response
		this._processAIResponse(text);
	}

	private _handleClearChat() {
		console.log('Clearing chat');
		this._panel.webview.postMessage({
			command: 'clearMessages'
		});
	}

	private async _processAIResponse(text: string) {
		try {
			// Get API key from settings or environment
			const apiKey = await this._getApiKey();
			if (!apiKey) {
				this._addMessage('assistant', 'Please configure your OpenAI API key in VS Code settings or set OPENAI_API_KEY environment variable.');
				return;
			}

			// Call OpenAI API
			const response = await this._callOpenAI(apiKey, text);
			this._addMessage('assistant', response);
		} catch (error) {
			console.error('Error processing AI response:', error);
			this._addMessage('assistant', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
		}
	}

	private async _getApiKey(): Promise<string | null> {
		// Try VS Code settings first
		const config = vscode.workspace.getConfiguration('CodePlanr');
		const apiKey = config.get<string>('openaiApiKey');
		if (apiKey && apiKey.trim()) {
			return apiKey.trim();
		}

		// Try environment variable
		const envApiKey = process.env.OPENAI_API_KEY;
		if (envApiKey && envApiKey.trim()) {
			return envApiKey.trim();
		}

		return null;
	}

	private async _callOpenAI(apiKey: string, message: string): Promise<string> {
		const response = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				'Authorization': `Bearer ${apiKey}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: 'gpt-4o',
				messages: [
					{
						role: 'system',
						content: 'You are CodePlanr AI, a helpful coding assistant. Help users with their coding tasks, provide step-by-step plans, and suggest code implementations. Be concise and practical.'
					},
					{
						role: 'user',
						content: message
					}
				],
				max_tokens: 1000,
				temperature: 0.7
			})
		});

		if (!response.ok) {
			throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
		}

		const data = await response.json() as any;
		return data.choices[0].message.content;
	}

	private _addMessage(type: 'user' | 'assistant', content: string) {
		this._panel.webview.postMessage({
			command: 'addMessage',
			type: type,
			content: content
		});
	}

	private _update() {
		const webview = this._panel.webview;
		this._panel.webview.html = this._getHtmlForWebview(webview);
	}

	private _getHtmlForWebview(webview: vscode.Webview): string {
		const nonce = getNonce();
		
		return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>CodePlanr Chat</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            margin: 0;
            padding: 20px;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .header {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            padding: 15px;
            text-align: center;
            font-weight: bold;
            margin: -20px -20px 20px -20px;
            border-radius: 0 0 8px 8px;
        }
        
        .chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 10px 0;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        
        .message {
            padding: 12px 16px;
            border-radius: 8px;
            margin: 5px 0;
            max-width: 80%;
            word-wrap: break-word;
        }
        
        .message.user {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-left: auto;
            text-align: right;
        }
        
        .message.assistant {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            margin-right: auto;
        }
        
        .input-container {
            display: flex;
            gap: 10px;
            padding: 15px 0;
            border-top: 1px solid var(--vscode-panel-border);
        }
        
        .input-field {
            flex: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 10px 15px;
            border-radius: 6px;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
        }
        
        .input-field:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        .send-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
        }
        
        .send-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .send-btn:disabled {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: not-allowed;
        }
        
        .empty-state {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            padding: 40px 20px;
        }
    </style>
</head>
<body>
    <div class="header">🤖 CodePlanr AI Chat</div>
    
    <div class="chat-container" id="chatContainer">
        <div class="empty-state" id="emptyState">
            <h3>👋 Welcome to CodePlanr!</h3>
            <p>I can help you plan and implement coding tasks. What would you like to work on?</p>
        </div>
    </div>
    
    <div class="input-container">
        <input type="text" class="input-field" id="messageInput" placeholder="Describe what you want to implement..." />
        <button class="send-btn" id="sendBtn">Send</button>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const chatContainer = document.getElementById('chatContainer');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const emptyState = document.getElementById('emptyState');

        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text) return;

            console.log('Sending message:', text);
            addMessage('user', text);
            messageInput.value = '';
            sendBtn.disabled = true;

            vscode.postMessage({
                command: 'sendMessage',
                text: text
            });
        }

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        sendBtn.addEventListener('click', sendMessage);

        function addMessage(type, content) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${type}\`;
            
            let header = type === 'user' ? '👤 You' : '🤖 CodePlanr AI';
            messageDiv.innerHTML = \`
                <div style="font-weight: bold; margin-bottom: 5px;">\${header}</div>
                <div>\${content.replace(/\\n/g, '<br>')}</div>
            \`;

            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            emptyState.style.display = 'none';
            sendBtn.disabled = false;
        }

        // Handle messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            console.log('Received message from extension:', message);
            
            switch (message.command) {
                case 'addMessage':
                    addMessage(message.type, message.content);
                    break;
                case 'clearMessages':
                    chatContainer.innerHTML = '';
                    emptyState.style.display = 'block';
                    break;
            }
        });

        messageInput.focus();
        console.log('Chat interface ready');
    </script>
</body>
</html>`;
	}
}

function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

async function handleGeneratePlan() {
	// TODO: Implement plan generation
	vscode.window.showInformationMessage('Generate Plan command triggered!');
}

async function handleApplyChanges() {
	// TODO: Implement change application
	vscode.window.showInformationMessage('Apply Changes command triggered!');
}

async function handleConfigureApiKey() {
	const apiKey = await vscode.window.showInputBox({
		prompt: 'Enter your OpenAI API Key',
		placeHolder: 'sk-...',
		password: true,
		ignoreFocusOut: true
	});

	if (apiKey) {
		const config = vscode.workspace.getConfiguration('CodePlanr');
		await config.update('openaiApiKey', apiKey, vscode.ConfigurationTarget.Global);
		vscode.window.showInformationMessage('OpenAI API Key configured successfully!');
	}
}