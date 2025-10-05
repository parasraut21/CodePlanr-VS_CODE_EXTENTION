import * as vscode from 'vscode';
import { SimpleChatProvider } from './simpleChatProvider';

export class BasicWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codePlanrChat';
  private _view?: vscode.WebviewView;
  private chatProvider: SimpleChatProvider;

  constructor(private readonly _extensionUri: vscode.Uri, chatProvider: SimpleChatProvider) {
    this.chatProvider = chatProvider;
  }

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

    webviewView.webview.html = this.getHtmlContent();

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(
      async message => {
        switch (message.type) {
          case 'sendMessage':
            await this.chatProvider.sendMessage(message.text);
            this.updateWebview();
            break;
          case 'clearChat':
            this.chatProvider.clearChat();
            this.updateWebview();
            break;
        }
      }
    );
  }

  private updateWebview() {
    if (this._view) {
      const messages = this.chatProvider.getMessages();
      this._view.webview.postMessage({
        type: 'updateMessages',
        messages: messages
      });
    }
  }

  private getHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodePlanr Chat</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            margin: 0;
            padding: 10px;
            height: 100vh;
            display: flex;
            flex-direction: column;
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
            padding: 10px;
            border-radius: 8px;
            margin: 5px 0;
        }
        
        .message.user {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            margin-left: 20px;
        }
        
        .message.assistant {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            margin-right: 20px;
        }
        
        .input-container {
            display: flex;
            gap: 8px;
            padding: 10px 0;
            border-top: 1px solid var(--vscode-panel-border);
        }
        
        .input-field {
            flex: 1;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 8px 12px;
            border-radius: 4px;
        }
        
        .send-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
        }
        
        .empty-state {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            padding: 20px;
        }
    </style>
</head>
<body>
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

    <script>
        const vscode = acquireVsCodeApi();
        const chatContainer = document.getElementById('chatContainer');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const emptyState = document.getElementById('emptyState');

        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text) return;

            addMessage('user', text);
            messageInput.value = '';
            sendBtn.disabled = true;

            vscode.postMessage({
                type: 'sendMessage',
                text: text
            });
        }

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
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
        }

        window.addEventListener('message', event => {
            const message = event.data;
            
            if (message.type === 'updateMessages') {
                chatContainer.innerHTML = '';
                emptyState.style.display = message.messages.length === 0 ? 'block' : 'none';
                
                message.messages.forEach(msg => {
                    addMessage(msg.type, msg.content);
                });
            }
        });

        messageInput.focus();
    </script>
</body>
</html>`;
  }
}
