import * as vscode from 'vscode';

/**
 * Generates the complete HTML template for the webview
 */
export class WebviewTemplate {
    public static getHtml(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodePlanr AI</title>
    ${this.getStyles()}
</head>
<body>
    ${this.getBody()}
    ${this.getScripts()}
</body>
</html>`;
    }

    private static getStyles(): string {
        return `<style>
        :root {
            --bg-primary: #0a0a0f;
            --bg-secondary: #12121a;
            --bg-tertiary: #1a1a24;
            --bg-elevated: #1e1e2e;
            --accent-primary: #00d4ff;
            --accent-secondary: #0099ff;
            --accent-tertiary: #0066cc;
            --text-primary: #e8e8ea;
            --text-secondary: #a0a0a8;
            --text-tertiary: #6b6b75;
            --border-subtle: rgba(255, 255, 255, 0.06);
            --border-medium: rgba(255, 255, 255, 0.12);
            --success: #00e676;
            --warning: #ffab00;
            --error: #ff5252;
            --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.4);
            --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.5);
            --shadow-lg: 0 8px 32px rgba(0, 0, 0, 0.6);
            --radius-sm: 6px;
            --radius-md: 10px;
            --radius-lg: 14px;
        }
        
        * { box-sizing: border-box; margin: 0; padding: 0; }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 13px;
            line-height: 1.5;
            color: var(--text-primary);
            background: var(--bg-primary);
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            -webkit-font-smoothing: antialiased;
        }

        .header {
            background: var(--bg-secondary);
            padding: 14px 18px;
            border-bottom: 1px solid var(--border-subtle);
            display: flex;
            align-items: center;
            justify-content: space-between;
            box-shadow: var(--shadow-sm);
        }

        .header-left { display: flex; align-items: center; gap: 10px; }
        
        .logo {
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
            border-radius: var(--radius-sm);
            font-size: 16px;
            font-weight: 700;
            color: var(--bg-primary);
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
        }

        .header h1 { font-size: 14px; font-weight: 600; color: var(--text-primary); }
        .header-controls { display: flex; gap: 6px; }
        
        .control-btn {
            padding: 6px 12px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-sm);
            color: var(--text-secondary);
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            gap: 5px;
        }

        .control-btn:hover {
            background: var(--bg-elevated);
            border-color: var(--border-medium);
            color: var(--text-primary);
            transform: translateY(-1px);
        }

        .chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            scroll-behavior: smooth;
        }

        .chat-container::-webkit-scrollbar { width: 6px; }
        .chat-container::-webkit-scrollbar-thumb { background: var(--bg-elevated); border-radius: 3px; }

        .message {
            display: flex;
            flex-direction: column;
            gap: 4px;
            animation: messageSlide 0.3s ease;
        }

        @keyframes messageSlide {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .message-header {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: var(--text-tertiary);
            padding: 0 4px;
        }

        .message.user .message-header { justify-content: flex-end; display: flex; }

        .message-content {
            padding: 12px 14px;
            border-radius: var(--radius-md);
            word-wrap: break-word;
            line-height: 1.6;
            border: 1px solid var(--border-subtle);
            background: var(--bg-secondary);
        }

        .message.user .message-content { margin-left: 48px; border-top-right-radius: 4px; }
        .message.assistant .message-content { margin-right: 48px; border-top-left-radius: 4px; }

        .typing-indicator {
            display: none;
            align-items: center;
            gap: 10px;
            padding: 12px 14px;
            margin-right: 48px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
        }

        .typing-dots { display: flex; gap: 3px; }
        
        .typing-dot {
            width: 6px;
            height: 6px;
            background: var(--accent-primary);
            border-radius: 50%;
            animation: typingBounce 1.2s infinite ease-in-out;
        }

        .typing-dot:nth-child(1) { animation-delay: 0s; }
        .typing-dot:nth-child(2) { animation-delay: 0.15s; }
        .typing-dot:nth-child(3) { animation-delay: 0.3s; }

        @keyframes typingBounce {
            0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
            30% { transform: translateY(-6px); opacity: 1; }
        }

        .input-container {
            padding: 14px 16px;
            border-top: 1px solid var(--border-subtle);
            background: var(--bg-secondary);
            box-shadow: var(--shadow-md);
        }

        .input-header { display: flex; gap: 8px; margin-bottom: 10px; align-items: center; }
        
        .mode-toggle {
            display: flex;
            gap: 4px;
            flex: 1;
            padding: 3px;
            background: var(--bg-tertiary);
            border-radius: var(--radius-md);
            border: 1px solid var(--border-subtle);
        }

        .model-selector {
            padding: 7px 12px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            color: var(--text-secondary);
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            outline: none;
        }

        .mode-btn {
            flex: 1;
            padding: 7px 12px;
            background: transparent;
            border: none;
            border-radius: var(--radius-sm);
            color: var(--text-tertiary);
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
            transition: all 0.2s ease;
        }

        .mode-btn.active {
            background: var(--accent-primary);
            color: var(--bg-primary);
            box-shadow: 0 0 12px rgba(0, 212, 255, 0.3);
        }

        .input-wrapper { display: flex; gap: 8px; align-items: center; }
        
        .upload-btn {
            padding: 10px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            color: var(--text-secondary);
            cursor: pointer;
            font-size: 16px;
        }

        .input-field {
            flex: 1;
            background: var(--bg-tertiary);
            color: var(--text-primary);
            border: 1px solid var(--border-subtle);
            padding: 10px 14px;
            border-radius: var(--radius-md);
            font-family: inherit;
            font-size: 13px;
        }

        .input-field:focus {
            outline: none;
            border-color: var(--accent-primary);
            background: var(--bg-elevated);
        }

        .send-btn {
            background: var(--accent-primary);
            color: var(--bg-primary);
            border: none;
            padding: 10px 20px;
            border-radius: var(--radius-md);
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
        }

        .send-btn:disabled {
            background: var(--bg-elevated);
            color: var(--text-tertiary);
            cursor: not-allowed;
        }

        .welcome-message {
            text-align: center;
            padding: 48px 24px;
        }

        .welcome-icon {
            width: 56px;
            height: 56px;
            margin: 0 auto 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, var(--accent-primary), var(--accent-secondary));
            border-radius: var(--radius-lg);
            font-size: 28px;
            font-weight: 700;
            color: var(--bg-primary);
        }

        .welcome-message h3 { margin: 0 0 8px 0; font-size: 20px; font-weight: 700; }
        .welcome-message p { color: var(--text-secondary); font-size: 13px; margin: 6px 0; }
        
        .feature-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
            margin-top: 20px;
        }

        .feature-card {
            background: var(--bg-secondary);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            padding: 14px;
            text-align: left;
        }

        .feature-icon { font-size: 20px; margin-bottom: 6px; }
        .feature-title { font-size: 11px; font-weight: 600; color: var(--text-primary); }
        .feature-desc { font-size: 10px; color: var(--text-tertiary); }

        .notification {
            position: fixed;
            top: 16px;
            right: 16px;
            background: var(--success);
            color: var(--bg-primary);
            padding: 10px 16px;
            border-radius: var(--radius-md);
            font-size: 12px;
            font-weight: 600;
            z-index: 1000;
            display: none;
        }

        .plan-container {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            padding: 14px;
            margin: 8px 0;
        }

        .plan-step {
            display: flex;
            gap: 10px;
            padding: 10px;
            margin: 6px 0;
            background: var(--bg-secondary);
            border-radius: var(--radius-sm);
            border-left: 2px solid var(--text-tertiary);
        }

        .plan-step.completed { border-left-color: var(--success); opacity: 0.7; }
        .plan-step.failed { border-left-color: var(--error); }
        
        .file-attachment {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-sm);
            margin-bottom: 8px;
            font-size: 12px;
        }

        .file-attachment-name { flex: 1; color: var(--text-primary); font-weight: 500; }
        
        .file-attachment-remove {
            padding: 2px 6px;
            background: var(--bg-elevated);
            border: 1px solid var(--border-subtle);
            border-radius: 4px;
            color: var(--text-tertiary);
            cursor: pointer;
            font-size: 10px;
        }
    </style>`;
    }

    private static getBody(): string {
        return `
    <div class="header">
        <div class="header-left">
            <div class="logo">CP</div>
            <h1>CodePlanr AI</h1>
        </div>
        <div class="header-controls">
            <button class="control-btn" id="exportBtn">
                <span>📤</span>
                <span>Export</span>
            </button>
            <button class="control-btn" id="clearBtn">
                <span>🗑️</span>
                <span>Clear</span>
            </button>
            <button class="control-btn" id="configBtn">
                <span>⚙️</span>
                <span>Settings</span>
            </button>
        </div>
    </div>

    <div class="chat-container" id="chatContainer">
        <div class="welcome-message" id="welcomeMessage">
            <div class="welcome-icon">CP</div>
            <h3>CodePlanr AI</h3>
            <p>Professional AI coding assistant</p>
            <p>Create files, write code, and automate development tasks</p>
            <div class="feature-grid">
                <div class="feature-card">
                    <div class="feature-icon">🎯</div>
                    <div class="feature-title">Smart Planning</div>
                    <div class="feature-desc">AI breaks down complex tasks</div>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">⚡</div>
                    <div class="feature-title">Auto Execute</div>
                    <div class="feature-desc">Runs plans automatically</div>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">🔍</div>
                    <div class="feature-title">Error Check</div>
                    <div class="feature-desc">Validates code quality</div>
                </div>
                <div class="feature-card">
                    <div class="feature-icon">💬</div>
                    <div class="feature-title">Chat Mode</div>
                    <div class="feature-desc">Ask coding questions</div>
                </div>
            </div>
        </div>
    </div>

    <div class="typing-indicator" id="typingIndicator">
        <div>AI is thinking</div>
        <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    </div>

    <div class="input-container">
        <div class="input-header">
            <div class="mode-toggle">
                <button class="mode-btn" id="chatModeBtn">💬 Chat</button>
                <button class="mode-btn active" id="agentModeBtn">⚡ Agent</button>
            </div>
            <select class="model-selector" id="modelSelector">
                <optgroup label="GPT-4o Series">
                    <option value="gpt-4o">GPT-4o</option>
                    <option value="gpt-4o-mini">GPT-4o Mini</option>
                </optgroup>
                <optgroup label="GPT-4 Series">
                    <option value="gpt-4-turbo">GPT-4 Turbo</option>
                    <option value="gpt-4">GPT-4</option>
                </optgroup>
                <optgroup label="O1 Series">
                    <option value="o1-preview">O1 Preview</option>
                    <option value="o1-mini">O1 Mini</option>
                </optgroup>
            </select>
        </div>
        <div id="fileAttachmentContainer"></div>
        <div class="input-wrapper">
            <button class="upload-btn" id="uploadBtn" title="Upload file">📎</button>
            <input type="text" class="input-field" id="messageInput" placeholder="Describe what you want to create..." />
            <button class="send-btn" id="sendBtn">Send</button>
        </div>
    </div>

    <div class="notification" id="notification"></div>`;
    }

    private static getScripts(): string {
        return `<script>
        const vscode = acquireVsCodeApi();
        const chatContainer = document.getElementById('chatContainer');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const welcomeMessage = document.getElementById('welcomeMessage');
        const typingIndicator = document.getElementById('typingIndicator');
        const clearBtn = document.getElementById('clearBtn');
        const configBtn = document.getElementById('configBtn');
        const exportBtn = document.getElementById('exportBtn');
        const uploadBtn = document.getElementById('uploadBtn');
        const notification = document.getElementById('notification');
        const chatModeBtn = document.getElementById('chatModeBtn');
        const agentModeBtn = document.getElementById('agentModeBtn');
        const modelSelector = document.getElementById('modelSelector');
        const fileAttachmentContainer = document.getElementById('fileAttachmentContainer');

        let isProcessing = false;
        let currentMode = 'agent';
        let uploadedFile = null;

        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text || isProcessing) return;

            let messageText = text;
            if (uploadedFile) {
                messageText = \`[File: \${uploadedFile.fileName}]\\n\\n\${text}\\n\\nFile content:\\n\${uploadedFile.content}\`;
            }

            messageInput.value = '';
            sendBtn.disabled = true;
            isProcessing = true;

            addMessage('user', text);

            if (currentMode === 'agent') {
                vscode.postMessage({ type: 'sendAgentTask', text: messageText });
            } else {
                vscode.postMessage({ type: 'sendMessage', text: messageText });
            }

            if (uploadedFile) removeFileAttachment();
        }

        function addMessage(type, content) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${type}\`;
            
            const header = type === 'user' ? '👤 YOU' : '🤖 AI';
            const formattedContent = content.replace(/\\n/g, '<br>');
            
            messageDiv.innerHTML = \`
                <div class="message-header">\${header}</div>
                <div class="message-content">\${formattedContent}</div>
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

        function clearChat() {
            chatContainer.innerHTML = '';
            const welcomeClone = welcomeMessage.cloneNode(true);
            chatContainer.appendChild(welcomeClone);
        }

        function showFileAttachment(fileName) {
            fileAttachmentContainer.innerHTML = \`
                <div class="file-attachment">
                    <span>📎</span>
                    <span class="file-attachment-name">\${fileName}</span>
                    <button class="file-attachment-remove" onclick="removeFileAttachment()">✕</button>
                </div>
            \`;
        }

        function removeFileAttachment() {
            uploadedFile = null;
            fileAttachmentContainer.innerHTML = '';
        }

        window.removeFileAttachment = removeFileAttachment;

        messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        sendBtn.addEventListener('click', sendMessage);
        clearBtn.addEventListener('click', () => vscode.postMessage({ type: 'clearChat' }));
        configBtn.addEventListener('click', () => vscode.postMessage({ type: 'configureApiKey' }));
        exportBtn.addEventListener('click', () => vscode.postMessage({ type: 'exportPlan' }));
        uploadBtn.addEventListener('click', () => vscode.postMessage({ type: 'uploadFile' }));

        chatModeBtn.addEventListener('click', () => {
            currentMode = 'chat';
            chatModeBtn.classList.add('active');
            agentModeBtn.classList.remove('active');
            messageInput.placeholder = 'Ask me anything about coding...';
        });

        agentModeBtn.addEventListener('click', () => {
            currentMode = 'agent';
            agentModeBtn.classList.add('active');
            chatModeBtn.classList.remove('active');
            messageInput.placeholder = 'Describe what you want to create...';
        });

        modelSelector.addEventListener('change', (e) => {
            vscode.postMessage({ type: 'changeModel', model: e.target.value });
        });

        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'addMessage':
                    hideTyping();
                    addMessage(message.message.type, message.message.content);
                    isProcessing = false;
                    sendBtn.disabled = false;
                    messageInput.focus();
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
                    notification.textContent = message.message;
                    notification.style.display = 'block';
                    setTimeout(() => notification.style.display = 'none', 3000);
                    break;
                case 'fileUploaded':
                    uploadedFile = {
                        fileName: message.fileName,
                        filePath: message.filePath,
                        content: message.content
                    };
                    showFileAttachment(message.fileName);
                    break;
                case 'setModel':
                    modelSelector.value = message.model;
                    break;
                case 'updateStep':
                    addMessage('assistant', message.message);
                    break;
            }
        });

        messageInput.focus();
    </script>`;
    }
}
