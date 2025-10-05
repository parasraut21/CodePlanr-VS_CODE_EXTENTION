import * as vscode from 'vscode';
import * as path from 'path';

export class SidebarWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'codePlanrChat';
  private _view?: vscode.WebviewView;
  private _disposables: vscode.Disposable[] = [];

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
          case 'generatePlan':
            await this._handleGeneratePlan(message.task);
            break;
          case 'applyChanges':
            await this._handleApplyChanges(message.plan);
            break;
          case 'clearChat':
            this._handleClearChat();
            break;
        }
      },
      null,
      this._disposables
    );
  }

  private async _handleSendMessage(text: string) {
    console.log('Received message:', text);
    
    // Add user message to chat
    this._addMessage('user', text);
    
    // Process with AI
    await this._processAIResponse(text);
  }

  private async _handleGeneratePlan(task: string) {
    console.log('Generating plan for:', task);
    
    // Add user message
    this._addMessage('user', `Generate a plan for: ${task}`);
    
    // Generate plan with AI
    await this._generateCodingPlan(task);
  }

  private async _handleApplyChanges(plan: any) {
    console.log('Applying changes for plan:', plan);
    
    // Show confirmation dialog
    const result = await vscode.window.showInformationMessage(
      'Do you want to apply these changes?',
      'Yes', 'No'
    );
    
    if (result === 'Yes') {
      await this._applyPlanChanges(plan);
    }
  }

  private _handleClearChat() {
    console.log('Clearing chat');
    this._view?.webview.postMessage({
      type: 'clearMessages'
    });
  }

  private async _processAIResponse(text: string) {
    try {
      const apiKey = await this._getApiKey();
      if (!apiKey) {
        this._addMessage('assistant', 'Please configure your OpenAI API key first. Use the command "CodePlanr: Configure OpenAI API Key".');
        return;
      }

      const response = await this._callOpenAI(apiKey, text);
      this._addMessage('assistant', response);
    } catch (error) {
      console.error('Error processing AI response:', error);
      this._addMessage('assistant', `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async _generateCodingPlan(task: string) {
    try {
      const apiKey = await this._getApiKey();
      if (!apiKey) {
        this._addMessage('assistant', 'Please configure your OpenAI API key first.');
        return;
      }

      const prompt = `Create a detailed coding plan for: "${task}". 
      
      Please provide:
      1. A step-by-step plan
      2. Files that need to be created/modified
      3. Code examples for each step
      4. Dependencies that might be needed
      
      Format your response as a structured plan that can be applied to a codebase.`;

      const response = await this._callOpenAI(apiKey, prompt);
      this._addMessage('assistant', response);
      
      // Send plan data to webview for display
      this._view?.webview.postMessage({
        type: 'showPlan',
        plan: {
          task: task,
          steps: this._parsePlanSteps(response),
          content: response
        }
      });
    } catch (error) {
      console.error('Error generating plan:', error);
      this._addMessage('assistant', `Error generating plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async _applyPlanChanges(plan: any) {
    // TODO: Implement actual file changes
    this._addMessage('assistant', 'Plan changes applied successfully! (This is a demo - actual file changes not implemented yet)');
  }

  private _parsePlanSteps(planContent: string): string[] {
    // Simple parsing of plan steps
    const lines = planContent.split('\n');
    const steps: string[] = [];
    
    for (const line of lines) {
      if (line.match(/^\d+\./)) {
        steps.push(line.trim());
      }
    }
    
    return steps;
  }

  private async _getApiKey(): Promise<string | null> {
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
    this._view?.webview.postMessage({
      type: 'addMessage',
      message: {
        type: type,
        content: content,
        timestamp: new Date().toISOString()
      }
    });
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const nonce = getNonce();
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>CodePlanr AI</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background: var(--vscode-sideBar-background);
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
            gap: 8px;
        }
        
        .header h3 {
            margin: 0;
            font-size: 14px;
            font-weight: 600;
        }
        
        .chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }
        
        .message {
            padding: 8px 12px;
            border-radius: 6px;
            margin: 4px 0;
            max-width: 100%;
            word-wrap: break-word;
            font-size: 13px;
            line-height: 1.4;
        }
        
        .message.user {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            margin-left: 20px;
            text-align: right;
        }
        
        .message.assistant {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            margin-right: 20px;
        }
        
        .message.system {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            text-align: center;
            font-size: 12px;
            margin: 8px 0;
        }
        
        .input-container {
            padding: 12px;
            border-top: 1px solid var(--vscode-panel-border);
            background: var(--vscode-sideBar-background);
        }
        
        .input-field {
            width: 100%;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            padding: 8px 12px;
            border-radius: 4px;
            font-family: var(--vscode-font-family);
            font-size: 13px;
            resize: none;
        }
        
        .input-field:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
        }
        
        .button-container {
            display: flex;
            gap: 8px;
            margin-top: 8px;
        }
        
        .btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 500;
        }
        
        .btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
        
        .btn.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .btn.secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        
        .empty-state {
            text-align: center;
            color: var(--vscode-descriptionForeground);
            padding: 20px;
            font-size: 13px;
        }
        
        .plan-container {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 12px;
            margin: 8px 0;
        }
        
        .plan-header {
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--vscode-textLink-foreground);
        }
        
        .plan-step {
            margin: 4px 0;
            padding: 4px 0;
            border-left: 2px solid var(--vscode-textLink-foreground);
            padding-left: 8px;
        }
        
        .apply-btn {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            margin-top: 8px;
        }
        
        .apply-btn:hover {
            background: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="header">
        <span>🤖</span>
        <h3>CodePlanr AI</h3>
    </div>
    
    <div class="chat-container" id="chatContainer">
        <div class="empty-state" id="emptyState">
            <h4>👋 Welcome to CodePlanr!</h4>
            <p>I can help you plan and implement coding tasks. What would you like to work on?</p>
        </div>
    </div>
    
    <div class="input-container">
        <textarea class="input-field" id="messageInput" placeholder="Describe what you want to implement..." rows="2"></textarea>
        <div class="button-container">
            <button class="btn" id="sendBtn">Send</button>
            <button class="btn secondary" id="clearBtn">Clear</button>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const chatContainer = document.getElementById('chatContainer');
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const clearBtn = document.getElementById('clearBtn');
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
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        sendBtn.addEventListener('click', sendMessage);
        clearBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'clearChat' });
        });

        function addMessage(type, content) {
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${type}\`;
            
            let header = type === 'user' ? '👤 You' : '🤖 CodePlanr AI';
            messageDiv.innerHTML = \`
                <div style="font-weight: 600; margin-bottom: 4px; font-size: 12px;">\${header}</div>
                <div>\${content.replace(/\\n/g, '<br>')}</div>
            \`;

            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            emptyState.style.display = 'none';
            sendBtn.disabled = false;
        }

        function showPlan(plan) {
            const planDiv = document.createElement('div');
            planDiv.className = 'plan-container';
            planDiv.innerHTML = \`
                <div class="plan-header">📋 Coding Plan: \${plan.task}</div>
                <div>\${plan.steps.map(step => \`<div class="plan-step">\${step}</div>\`).join('')}</div>
                <button class="apply-btn" onclick="applyPlan('\${plan.task}')">Apply Changes</button>
            \`;
            
            chatContainer.appendChild(planDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function applyPlan(task) {
            vscode.postMessage({
                type: 'applyChanges',
                plan: { task: task }
            });
        }

        // Handle messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
                case 'addMessage':
                    addMessage(message.message.type, message.message.content);
                    break;
                case 'clearMessages':
                    chatContainer.innerHTML = '';
                    emptyState.style.display = 'block';
                    break;
                case 'showPlan':
                    showPlan(message.plan);
                    break;
            }
        });

        messageInput.focus();
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
