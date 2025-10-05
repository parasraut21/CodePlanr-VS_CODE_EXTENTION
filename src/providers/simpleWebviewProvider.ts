import * as vscode from 'vscode';
import { SimpleChatProvider } from './simpleChatProvider';

export class SimpleWebviewProvider implements vscode.WebviewViewProvider {
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

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

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
          case 'generateCode':
            await this.chatProvider.generateCodeForPlan(message.plan);
            this.updateWebview();
            break;
          case 'applyChanges':
            await this.chatProvider.applyPlanChanges(message.plan);
            this.updateWebview();
            break;
          case 'applyStep':
            await this.chatProvider.applyStepChanges(message.step, message.changes);
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

  private _getHtmlForWebview(webview: vscode.Webview) {
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
            display: flex;
            flex-direction: column;
            gap: 5px;
            padding: 10px;
            border-radius: 8px;
            max-width: 100%;
            word-wrap: break-word;
        }
        
        .message.user {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            align-self: flex-end;
            margin-left: 20px;
        }
        
        .message.assistant {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            align-self: flex-start;
            margin-right: 20px;
        }
        
        .message.system {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            align-self: center;
            text-align: center;
            font-size: 0.9em;
        }
        
        .message-header {
            display: flex;
            align-items: center;
            gap: 8px;
            font-weight: 600;
            font-size: 0.9em;
        }
        
        .message-content {
            line-height: 1.4;
        }
        
        .message-content h1, .message-content h2, .message-content h3 {
            margin: 10px 0 5px 0;
            color: var(--vscode-textLink-foreground);
        }
        
        .message-content code {
            background: var(--vscode-textCodeBlock-background);
            padding: 2px 4px;
            border-radius: 3px;
            font-family: var(--vscode-editor-font-family);
        }
        
        .message-content pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 10px;
            border-radius: 5px;
            overflow-x: auto;
            margin: 10px 0;
        }
        
        .message-content pre code {
            background: none;
            padding: 0;
        }
        
        .files-list {
            display: flex;
            flex-wrap: wrap;
            gap: 5px;
            margin: 10px 0;
        }
        
        .file-tag {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.8em;
            cursor: pointer;
        }
        
        .file-tag:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .actions {
            display: flex;
            gap: 8px;
            margin-top: 10px;
            flex-wrap: wrap;
        }
        
        .action-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 0.9em;
            transition: background-color 0.2s;
        }
        
        .action-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .action-btn.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .action-btn.secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
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
            border-radius: 4px;
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

        // Handle message sending
        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text) return;

            // Add user message to UI
            addMessage('user', text);
            messageInput.value = '';
            sendBtn.disabled = true;

            // Send to extension
            vscode.postMessage({
                type: 'sendMessage',
                text: text
            });
        }

        // Handle Enter key
        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Handle send button
        sendBtn.addEventListener('click', sendMessage);

        // Add message to chat
        function addMessage(type, content, files = [], actions = []) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${type}\`;
            
            let header = '';
            if (type === 'user') {
                header = '👤 You';
            } else if (type === 'assistant') {
                header = '🤖 CodePlanr AI';
            } else {
                header = 'ℹ️ System';
            }

            let filesHtml = '';
            if (files && files.length > 0) {
                filesHtml = \`<div class="files-list">\${files.map(file => \`<span class="file-tag">\${file}</span>\`).join('')}</div>\`;
            }

            let actionsHtml = '';
            if (actions && actions.length > 0) {
                actionsHtml = \`<div class="actions">\${actions.map(action => \`<button class="action-btn" onclick="handleAction('\${action.id}', '\${action.command}')">\${action.label}</button>\`).join('')}</div>\`;
            }

            messageDiv.innerHTML = \`
                <div class="message-header">\${header}</div>
                <div class="message-content">\${formatContent(content)}\${filesHtml}\${actionsHtml}</div>
            \`;

            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            emptyState.style.display = 'none';
        }

        // Format message content (basic markdown)
        function formatContent(content) {
            return content
                .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
                .replace(/\\*(.*?)\\*/g, '<em>$1</em>')
                .replace(/\`(.*?)\`/g, '<code>$1</code>')
                .replace(/\`\`\`([\\s\\S]*?)\`\`\`/g, '<pre><code>$1</code></pre>')
                .replace(/\\n/g, '<br>');
        }

        // Handle actions
        function handleAction(id, command) {
            vscode.postMessage({
                type: command,
                id: id
            });
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'updateMessages':
                    chatContainer.innerHTML = '';
                    emptyState.style.display = message.messages.length === 0 ? 'block' : 'none';
                    
                    message.messages.forEach(msg => {
                        addMessage(msg.type, msg.content, msg.files, msg.actions);
                    });
                    break;
            }
        });

        // Focus input on load
        messageInput.focus();
    </script>
</body>
</html>`;
  }
}
