import * as vscode from 'vscode';

export class CodePlanrProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codePlanrChat';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) {}

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        // Handle messages from the webview
        webviewView.webview.onDidReceiveMessage(
            async message => {
                switch (message.type) {
                    case 'sendMessage':
                        await this._handleSendMessage(message.text);
                        break;
                    case 'configureApiKey':
                        await this._handleConfigureApiKey();
                        break;
                    case 'clearChat':
                        this._handleClearChat();
                        break;
                }
            },
            null,
            []
        );
    }

    private async _handleSendMessage(text: string) {
        if (!this._view) {
            console.error('No webview available');
            return;
        }

        // Add user message
        this._addMessage('user', text);

        // Show typing indicator
        this._showTyping();

        try {
            // Get API key
            const apiKey = await this._getApiKey();
            if (!apiKey) {
                this._hideTyping();
                this._addMessage('assistant', '⚠️ OpenAI API key not configured. Please set it up first:\n\n- Set environment variable `OPENAI_API_KEY`\n- Or run "CodePlanr: Configure OpenAI API Key" command\n- Then reload the window');
                return;
            }

            // Call OpenAI API
            const response = await this._callOpenAI(apiKey, text);
            this._hideTyping();
            this._addMessage('assistant', response);

        } catch (error) {
            this._hideTyping();
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
                this._addMessage('assistant', '🔑 API Key Error: Your OpenAI API key is invalid or missing.\n\nPlease:\n1. Get a valid API key from https://platform.openai.com/api-keys\n2. Set it via "CodePlanr: Configure OpenAI API Key" command\n3. Reload the window');
            } else {
                this._addMessage('assistant', `❌ Error: ${errorMessage}`);
            }
        }
    }

    private async _handleConfigureApiKey() {
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
            
            if (this._view) {
                this._view.webview.postMessage({
                    type: 'showNotification',
                    message: '✅ API Key configured successfully!'
                });
            }
        }
    }

    private _handleClearChat() {
        if (this._view) {
            this._view.webview.postMessage({
                type: 'clearMessages'
            });
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
                max_tokens: 2000,
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
        if (!this._view) return;

        this._view.webview.postMessage({
            type: 'addMessage',
            message: {
                type: type,
                content: content,
                timestamp: new Date().toISOString()
            }
        });
    }

    private _showTyping() {
        if (!this._view) return;

        this._view.webview.postMessage({
            type: 'showTyping'
        });
    }

    private _hideTyping() {
        if (!this._view) return;

        this._view.webview.postMessage({
            type: 'hideTyping'
        });
    }

    private _getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodePlanr AI</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            margin: 0;
            padding: 0;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .header {
            background: var(--vscode-titleBar-activeBackground);
            color: var(--vscode-titleBar-activeForeground);
            padding: 12px 16px;
            border-bottom: 1px solid var(--vscode-panel-border);
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .logo {
            font-size: 18px;
        }

        .header h1 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
        }

        .header-controls {
            display: flex;
            gap: 8px;
        }

        .control-btn {
            padding: 4px 8px;
            background: var(--vscode-button-secondaryBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            color: var(--vscode-button-secondaryForeground);
            font-size: 12px;
            cursor: pointer;
            transition: background-color 0.2s;
        }

        .control-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }

        .chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
        }

        .message {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .message-header {
            font-size: 12px;
            font-weight: 600;
            color: var(--vscode-descriptionForeground);
        }

        .message-content {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 8px;
            padding: 12px;
            word-wrap: break-word;
            line-height: 1.4;
        }

        .message.user .message-content {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-left: 20px;
        }

        .message.assistant .message-content {
            margin-right: 20px;
        }

        .typing-indicator {
            display: none;
            align-items: center;
            gap: 8px;
            padding: 12px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }

        .typing-dots {
            display: flex;
            gap: 2px;
        }

        .typing-dot {
            width: 4px;
            height: 4px;
            background: var(--vscode-descriptionForeground);
            border-radius: 50%;
            animation: typing 1.4s infinite;
        }

        .typing-dot:nth-child(2) {
            animation-delay: 0.2s;
        }

        .typing-dot:nth-child(3) {
            animation-delay: 0.4s;
        }

        @keyframes typing {
            0%, 60%, 100% {
                opacity: 0.3;
            }
            30% {
                opacity: 1;
            }
        }

        .input-container {
            padding: 16px;
            border-top: 1px solid var(--vscode-panel-border);
            background: var(--vscode-editor-background);
        }

        .input-wrapper {
            display: flex;
            gap: 8px;
        }

        .input-field {
            flex: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 8px 12px;
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
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            transition: background-color 0.2s;
        }

        .send-btn:hover:not(:disabled) {
            background: var(--vscode-button-hoverBackground);
        }

        .send-btn:disabled {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            cursor: not-allowed;
        }

        .welcome-message {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            padding: 40px 20px;
        }

        .welcome-message h3 {
            margin: 0 0 8px 0;
            color: var(--vscode-foreground);
        }

        .notification {
            position: fixed;
            top: 10px;
            right: 10px;
            background: var(--vscode-notificationsInfoIcon-foreground);
            color: var(--vscode-notificationsInfoIcon-background);
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            z-index: 1000;
            display: none;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <div class="logo">🤖</div>
            <h1>CodePlanr AI</h1>
        </div>
        <div class="header-controls">
            <button class="control-btn" id="clearBtn">🗑️ Clear</button>
            <button class="control-btn" id="configBtn">⚙️ Config</button>
        </div>
    </div>

    <div class="chat-container" id="chatContainer">
        <div class="welcome-message" id="welcomeMessage">
            <h3>👋 Welcome to CodePlanr AI!</h3>
            <p>I can help you with coding tasks, generate plans, and suggest implementations.</p>
            <p>What would you like to work on today?</p>
        </div>
    </div>

    <div class="typing-indicator" id="typingIndicator">
        <span>CodePlanr AI is thinking</span>
        <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    </div>

    <div class="input-container">
        <div class="input-wrapper">
            <input type="text" class="input-field" id="messageInput" placeholder="Ask me anything about coding..." />
            <button class="send-btn" id="sendBtn">Send</button>
        </div>
    </div>

    <div class="notification" id="notification"></div>

    <script>
        const vscode = acquireVsCodeApi();
        const chatContainer = document.getElementById('chatContainer');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const welcomeMessage = document.getElementById('welcomeMessage');
        const typingIndicator = document.getElementById('typingIndicator');
        const clearBtn = document.getElementById('clearBtn');
        const configBtn = document.getElementById('configBtn');
        const notification = document.getElementById('notification');

        let isProcessing = false;

        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text || isProcessing) return;

            // Add user message
            addMessage('user', text);
            messageInput.value = '';
            sendBtn.disabled = true;
            isProcessing = true;

            // Send to extension
            vscode.postMessage({
                type: 'sendMessage',
                text: text
            });
        }

        function addMessage(type, content) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${type}\`;
            
            const header = type === 'user' ? '👤 You' : '🤖 CodePlanr AI';
            messageDiv.innerHTML = \`
                <div class="message-header">\${header}</div>
                <div class="message-content">\${content.replace(/\\n/g, '<br>')}</div>
            \`;

            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            welcomeMessage.style.display = 'none';
        }

        function showTyping() {
            typingIndicator.style.display = 'flex';
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function hideTyping() {
            typingIndicator.style.display = 'none';
        }

        function showNotification(message) {
            notification.textContent = message;
            notification.style.display = 'block';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }

        function clearChat() {
            chatContainer.innerHTML = '';
            welcomeMessage.style.display = 'block';
        }

        // Event listeners
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        sendBtn.addEventListener('click', sendMessage);
        clearBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'clearChat' });
        });
        configBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'configureApiKey' });
        });

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'addMessage':
                    hideTyping();
                    addMessage(message.message.type, message.message.content);
                    isProcessing = false;
                    sendBtn.disabled = false;
                    break;
                    
                case 'showTyping':
                    showTyping();
                    break;
                    
                case 'hideTyping':
                    hideTyping();
                    break;
                    
                case 'clearMessages':
                    clearChat();
                    break;
                    
                case 'showNotification':
                    showNotification(message.message);
                    break;
            }
        });

        messageInput.focus();
    </script>
</body>
</html>`;
    }
}
