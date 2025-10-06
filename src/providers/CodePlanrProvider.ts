import * as vscode from 'vscode';
import { MastraAgentService } from '../services/mastraAgent';

export class CodePlanrProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'codePlanrChat';
    private _view?: vscode.WebviewView;
    private _agentService: MastraAgentService;

    constructor(private readonly _extensionUri: vscode.Uri) {
        this._agentService = new MastraAgentService();
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
                        await this._handleSendMessage(message.text);
                        break;
                    case 'sendAgentTask':
                        await this._handleAgentTask(message.text);
                        break;
                    case 'configureApiKey':
                        await this._handleConfigureApiKey();
                        break;
                    case 'clearChat':
                        this._handleClearChat();
                        break;
                    case 'exportPlan':
                        await this._handleExportPlan();
                        break;
                    case 'copyCode':
                        await this._handleCopyCode(message.code);
                        break;
                    case 'openFile':
                        await this._handleOpenFile(message.filePath);
                        break;
                    case 'uploadFile':
                        await this._handleFileUpload();
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

        // Show typing indicator immediately
        this._showTyping();

        try {
            // Get API key
            const apiKey = await this._getApiKey();
            if (!apiKey) {
                this._hideTyping();
                this._addMessage('assistant', '🔑 API Key Required\n\nPlease configure your OpenAI API key:\n\n1. Click the ⚙️ Settings button above\n2. Enter your API key from https://platform.openai.com/api-keys\n3. Try again\n\nAlternatively, set the OPENAI_API_KEY environment variable.');
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
                this._addMessage('assistant', '🔑 Invalid API Key\n\nYour OpenAI API key is invalid or expired.\n\nPlease:\n1. Click the ⚙️ Settings button above\n2. Get a valid API key from https://platform.openai.com/api-keys\n3. Enter the new key\n4. Try again');
            } else if (errorMessage.includes('429')) {
                this._addMessage('assistant', '⏰ Rate Limit Exceeded\n\nYou have exceeded the OpenAI API rate limit.\n\nPlease wait a moment and try again.');
            } else if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
                this._addMessage('assistant', '🌐 Server Error\n\nOpenAI servers are experiencing issues.\n\nPlease try again in a few minutes.');
            } else {
                this._addMessage('assistant', `❌ Error: ${errorMessage}\n\nIf this is an API key issue, click ⚙️ Settings to configure your key.`);
            }
        }
    }

    private async _handleAgentTask(text: string) {
        if (!this._view) {
            console.error('No webview available');
            return;
        }

        try {
            // Get API key
            const apiKey = await this._getApiKey();
            if (!apiKey) {
                this._addMessage('assistant', '🔑 API Key Required\n\nPlease configure your OpenAI API key:\n\n1. Click the ⚙️ Settings button above\n2. Enter your API key from https://platform.openai.com/api-keys\n3. Try again\n\nAlternatively, set the OPENAI_API_KEY environment variable.');
                return;
            }

            // Set API key for agent
            this._agentService.setApiKey(apiKey);

            this._addMessage('assistant', '🤖 Agent Mode: Creating plan...');

            // Create plan
            const plan = await this._agentService.createPlan(text);
            
            // Show plan
            let planText = `📋 Plan Created:\n\n`;
            plan.steps.forEach(step => {
                planText += `${step.id}. [ ] ${step.description}\n`;
            });
            this._addMessage('assistant', planText);

            // Execute plan
            this._addMessage('assistant', '⚡ Executing plan...\n');

            await this._agentService.executePlan(plan, (step) => {
                let statusIcon = '⏳';
                if (step.status === 'completed') statusIcon = '✅';
                if (step.status === 'failed') statusIcon = '❌';
                
                const message = `${statusIcon} Step ${step.id}: ${step.description}${step.result ? '\n   ' + step.result : ''}${step.error ? '\n   Error: ' + step.error : ''}`;
                
                this._updatePlanProgress(step.id, step.status, message);
            });

            this._addMessage('assistant', '🎉 All tasks completed successfully!');

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            // Check for non-coding task
            if (errorMessage.includes('NOT_A_CODING_TASK')) {
                this._addMessage('assistant', '💬 Not a Coding Task\n\nI\'m designed to help with coding tasks like:\n• Creating files\n• Writing code\n• Modifying existing code\n• Checking for errors\n\nFor general questions, switch to 💬 Chat mode!\n\nExamples:\n• "create a python file for sorting"\n• "make a javascript function for validation"\n• "create a cpp file for addition"');
            }
            // Check for API key errors
            else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('API key')) {
                this._addMessage('assistant', '🔑 Invalid API Key\n\nYour OpenAI API key is invalid or expired.\n\nPlease:\n1. Click the ⚙️ Settings button above\n2. Get a valid API key from https://platform.openai.com/api-keys\n3. Enter the new key\n4. Try again');
            } else if (errorMessage.includes('429')) {
                this._addMessage('assistant', '⏰ Rate Limit Exceeded\n\nYou have exceeded the OpenAI API rate limit.\n\nPlease wait a moment and try again.');
            } else if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
                this._addMessage('assistant', '🌐 Server Error\n\nOpenAI servers are experiencing issues.\n\nPlease try again in a few minutes.');
            } else {
                this._addMessage('assistant', `❌ Error: ${errorMessage}\n\nIf this is an API key issue, click ⚙️ Settings to configure your key.`);
            }
        }
    }

    private _updatePlanProgress(stepId: number, status: string, message: string) {
        if (!this._view) return;

        this._view.webview.postMessage({
            type: 'updateStep',
            stepId: stepId,
            status: status,
            message: message
        });
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

    private async _handleExportPlan() {
        const plan = this._agentService.getCurrentPlan();
        if (!plan) {
            vscode.window.showWarningMessage('No plan to export');
            return;
        }

        const planText = `# ${plan.task}\n\n${plan.steps.map(s => `${s.id}. [${s.status}] ${s.description}`).join('\n')}`;
        const doc = await vscode.workspace.openTextDocument({ content: planText, language: 'markdown' });
        await vscode.window.showTextDocument(doc);
    }

    private async _handleCopyCode(code: string) {
        await vscode.env.clipboard.writeText(code);
        vscode.window.showInformationMessage('Code copied to clipboard');
    }

    private async _handleOpenFile(filePath: string) {
        const uri = vscode.Uri.file(filePath);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
    }

    private async _handleFileUpload() {
        const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            openLabel: 'Upload File',
            filters: {
                'All Files': ['*'],
                'Images': ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'],
                'Documents': ['txt', 'md', 'pdf', 'doc', 'docx'],
                'Code': ['js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs']
            }
        };

        const fileUri = await vscode.window.showOpenDialog(options);
        
        if (fileUri && fileUri[0]) {
            const filePath = fileUri[0].fsPath;
            const fileName = fileUri[0].fsPath.split(/[\\/]/).pop() || 'file';
            const fs = require('fs');
            
            try {
                // Check file size (limit to 10MB)
                const stats = fs.statSync(filePath);
                if (stats.size > 10 * 1024 * 1024) {
                    vscode.window.showErrorMessage('File is too large. Maximum size is 10MB.');
                    return;
                }

                // Read file content
                const fileContent = fs.readFileSync(filePath, 'utf8');
                
                // Send file info to webview
                if (this._view) {
                    this._view.webview.postMessage({
                        type: 'fileUploaded',
                        fileName: fileName,
                        filePath: filePath,
                        content: fileContent.substring(0, 5000) // Limit preview to 5000 chars
                    });
                }
                
                vscode.window.showInformationMessage(`File uploaded: ${fileName}`);
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to read file: ${error}`);
            }
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
                        content: 'You are CodePlanr AI, a helpful coding assistant created by Paras Raut. Help users with their coding tasks, provide step-by-step plans, and suggest code implementations. Be concise and practical. Always respond in plain text without markdown formatting, bullet points, or special characters. Just provide clear, readable text. If anyone asks who created you or who made you, tell them Paras Raut created you.'
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
            const errorText = await response.text();
            console.error('OpenAI API error:', response.status, errorText);
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any;
        let content = data.choices[0].message.content;
        
        // Clean up the response - remove markdown formatting
        content = content
            .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold formatting
            .replace(/\*(.*?)\*/g, '$1') // Remove italic formatting
            .replace(/^[\s]*[-*]\s*/gm, '• ') // Convert list items to bullet points
            .replace(/^[\s]*\d+\.\s*/gm, '') // Remove numbered lists
            .replace(/```[\s\S]*?```/g, '') // Remove code blocks
            .replace(/`([^`]+)`/g, '$1') // Remove inline code formatting
            .replace(/#{1,6}\s*/g, '') // Remove headers
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
            .trim();
            
        return content;
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
        
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        
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
            -moz-osx-font-smoothing: grayscale;
        }

        .header {
            background: var(--bg-secondary);
            padding: 14px 18px;
            border-bottom: 1px solid var(--border-subtle);
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: relative;
            z-index: 100;
            box-shadow: var(--shadow-sm);
        }

        .header::before {
            content: '';
            position: absolute;
            bottom: -1px;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--accent-primary), transparent);
            opacity: 0.3;
        }

        .header-left {
            display: flex;
            align-items: center;
            gap: 10px;
        }

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

        .header h1 {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
            letter-spacing: -0.2px;
        }

        .header-controls {
            display: flex;
            gap: 6px;
        }

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
            white-space: nowrap;
        }

        .control-btn:hover {
            background: var(--bg-elevated);
            border-color: var(--border-medium);
            color: var(--text-primary);
            transform: translateY(-1px);
            box-shadow: var(--shadow-sm);
        }

        .control-btn:active {
            transform: translateY(0);
        }

        .btn-icon {
            font-size: 12px;
        }

        .btn-text {
            font-size: 11px;
        }

        .chat-container {
            flex: 1;
            overflow-y: auto;
            padding: 16px;
            display: flex;
            flex-direction: column;
            gap: 12px;
            scroll-behavior: smooth;
            background: var(--bg-primary);
        }

        .chat-container::-webkit-scrollbar {
            width: 6px;
        }

        .chat-container::-webkit-scrollbar-track {
            background: transparent;
        }

        .chat-container::-webkit-scrollbar-thumb {
            background: var(--bg-elevated);
            border-radius: 3px;
        }

        .chat-container::-webkit-scrollbar-thumb:hover {
            background: var(--border-medium);
        }

        .message {
            display: flex;
            flex-direction: column;
            gap: 4px;
            animation: messageSlide 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            opacity: 0;
            animation-fill-mode: forwards;
        }

        @keyframes messageSlide {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        .message-header {
            font-size: 10px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 0 4px;
        }

        .message.user .message-header {
            color: var(--text-tertiary);
            justify-content: flex-end;
        }

        .message.assistant .message-header {
            color: var(--text-tertiary);
        }

        .message-content {
            padding: 12px 14px;
            border-radius: var(--radius-md);
            word-wrap: break-word;
            line-height: 1.6;
            position: relative;
            border: 1px solid var(--border-subtle);
            transition: all 0.2s ease;
        }

        .message.user .message-content {
            background: var(--bg-secondary);
            margin-left: 48px;
            border-top-right-radius: 4px;
        }

        .message.assistant .message-content {
            background: var(--bg-secondary);
            margin-right: 48px;
            border-top-left-radius: 4px;
        }

        .message:hover .message-content {
            border-color: var(--border-medium);
            box-shadow: var(--shadow-sm);
        }

        .message-actions {
            display: flex;
            gap: 4px;
            margin-top: 4px;
            opacity: 0;
            transition: opacity 0.2s;
        }

        .message:hover .message-actions {
            opacity: 1;
        }

        .action-btn {
            padding: 4px 8px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-sm);
            color: var(--text-tertiary);
            font-size: 10px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .action-btn:hover {
            background: var(--bg-elevated);
            color: var(--text-secondary);
            border-color: var(--border-medium);
        }

        .typing-indicator {
            display: none;
            align-items: center;
            gap: 10px;
            padding: 12px 14px;
            margin-right: 48px;
            background: var(--bg-secondary);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            border-top-left-radius: 4px;
            animation: fadeIn 0.2s ease;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        .typing-text {
            font-size: 12px;
            color: var(--text-secondary);
            font-weight: 500;
        }

        .typing-dots {
            display: flex;
            gap: 3px;
        }

        .typing-dot {
            width: 6px;
            height: 6px;
            background: var(--accent-primary);
            border-radius: 50%;
            animation: typingBounce 1.2s infinite ease-in-out;
        }

        .typing-dot:nth-child(1) {
            animation-delay: 0s;
        }

        .typing-dot:nth-child(2) {
            animation-delay: 0.15s;
        }

        .typing-dot:nth-child(3) {
            animation-delay: 0.3s;
        }

        @keyframes typingBounce {
            0%, 60%, 100% {
                transform: translateY(0);
                opacity: 0.5;
            }
            30% {
                transform: translateY(-6px);
                opacity: 1;
            }
        }

        .input-container {
            padding: 14px 16px;
            border-top: 1px solid var(--border-subtle);
            background: var(--bg-secondary);
            box-shadow: var(--shadow-md);
        }

        .mode-toggle {
            display: flex;
            gap: 4px;
            margin-bottom: 10px;
            padding: 3px;
            background: var(--bg-tertiary);
            border-radius: var(--radius-md);
            border: 1px solid var(--border-subtle);
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
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
        }

        .mode-btn.active {
            background: var(--accent-primary);
            color: var(--bg-primary);
            box-shadow: 0 0 12px rgba(0, 212, 255, 0.3);
        }

        .mode-btn:hover:not(.active) {
            background: var(--bg-elevated);
            color: var(--text-secondary);
        }

        .input-wrapper {
            display: flex;
            gap: 8px;
            align-items: center;
        }

        .upload-btn {
            padding: 10px;
            background: var(--bg-tertiary);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.2s ease;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
        }

        .upload-btn:hover {
            background: var(--bg-elevated);
            border-color: var(--accent-primary);
            color: var(--accent-primary);
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
            transition: all 0.2s ease;
        }

        .input-field::placeholder {
            color: var(--text-tertiary);
        }

        .input-field:focus {
            outline: none;
            border-color: var(--accent-primary);
            background: var(--bg-elevated);
            box-shadow: 0 0 0 2px rgba(0, 212, 255, 0.1);
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
            transition: all 0.2s ease;
            box-shadow: 0 0 16px rgba(0, 212, 255, 0.3);
        }

        .send-btn:hover:not(:disabled) {
            background: var(--accent-secondary);
            transform: translateY(-1px);
            box-shadow: 0 0 20px rgba(0, 212, 255, 0.5);
        }

        .send-btn:active:not(:disabled) {
            transform: translateY(0);
        }

        .send-btn:disabled {
            background: var(--bg-elevated);
            color: var(--text-tertiary);
            cursor: not-allowed;
            box-shadow: none;
        }

        .welcome-message {
            text-align: center;
            padding: 48px 24px;
            animation: fadeInUp 0.5s ease-out;
        }

        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
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
            box-shadow: 0 0 32px rgba(0, 212, 255, 0.4);
        }

        .welcome-message h3 {
            margin: 0 0 8px 0;
            font-size: 20px;
            font-weight: 700;
            color: var(--text-primary);
            letter-spacing: -0.5px;
        }

        .welcome-message p {
            color: var(--text-secondary);
            font-size: 13px;
            line-height: 1.5;
            margin: 6px 0;
        }

        .setup-notice {
            background: var(--bg-secondary);
            border: 1px solid var(--accent-primary);
            border-radius: var(--radius-md);
            padding: 10px 14px;
            margin: 16px 0;
            font-size: 12px;
            color: var(--text-secondary);
            text-align: left;
        }

        .setup-notice strong {
            color: var(--text-primary);
        }

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
            transition: all 0.2s ease;
            cursor: pointer;
        }

        .feature-card:hover {
            background: var(--bg-tertiary);
            border-color: var(--border-medium);
            transform: translateY(-2px);
            box-shadow: var(--shadow-sm);
        }

        .feature-icon {
            font-size: 20px;
            margin-bottom: 6px;
        }

        .feature-title {
            font-size: 11px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 3px;
        }

        .feature-desc {
            font-size: 10px;
            color: var(--text-tertiary);
            line-height: 1.3;
        }

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
            box-shadow: var(--shadow-lg);
            animation: slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }

        @keyframes slideInRight {
            from {
                opacity: 0;
                transform: translateX(50px);
            }
            to {
                opacity: 1;
                transform: translateX(0);
            }
        }

        .error-notification {
            background: var(--error);
        }

        .plan-container {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            padding: 14px;
            margin: 8px 0;
        }

        .plan-header {
            font-size: 13px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 6px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--border-subtle);
        }

        .plan-step {
            display: flex;
            align-items: flex-start;
            gap: 10px;
            padding: 10px;
            margin: 6px 0;
            background: var(--bg-secondary);
            border-radius: var(--radius-sm);
            border-left: 2px solid transparent;
            transition: all 0.3s ease;
            position: relative;
        }

        .plan-step.pending {
            border-left-color: var(--text-tertiary);
        }

        .plan-step.in-progress {
            border-left-color: var(--warning);
            background: var(--bg-elevated);
            animation: pulseBorder 1.5s infinite;
        }

        @keyframes pulseBorder {
            0%, 100% { border-left-color: var(--warning); }
            50% { border-left-color: var(--accent-primary); }
        }

        .plan-step.completed {
            border-left-color: var(--success);
            opacity: 0.7;
        }

        .plan-step.completed .step-title {
            text-decoration: line-through;
            color: var(--text-secondary);
        }

        .plan-step.failed {
            border-left-color: var(--error);
        }

        .step-checkbox {
            width: 18px;
            height: 18px;
            min-width: 18px;
            border: 2px solid var(--border-medium);
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            transition: all 0.3s ease;
            margin-top: 2px;
        }

        .plan-step.pending .step-checkbox {
            border-color: var(--text-tertiary);
            background: transparent;
        }

        .plan-step.in-progress .step-checkbox {
            border-color: var(--warning);
            background: transparent;
        }

        .plan-step.in-progress .step-checkbox::after {
            content: '';
            width: 8px;
            height: 8px;
            background: var(--warning);
            border-radius: 50%;
            animation: pulse 1s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(0.8); }
        }

        .plan-step.completed .step-checkbox {
            border-color: var(--success);
            background: var(--success);
            color: var(--bg-primary);
        }

        .plan-step.completed .step-checkbox::after {
            content: '✓';
            font-weight: bold;
        }

        .plan-step.failed .step-checkbox {
            border-color: var(--error);
            background: var(--error);
            color: var(--bg-primary);
        }

        .plan-step.failed .step-checkbox::after {
            content: '✕';
            font-weight: bold;
        }

        .step-content {
            flex: 1;
        }

        .step-title {
            font-size: 12px;
            font-weight: 500;
            color: var(--text-primary);
            margin-bottom: 3px;
            transition: all 0.3s ease;
        }

        .step-result {
            font-size: 11px;
            color: var(--text-tertiary);
            margin-top: 3px;
        }

        .loader {
            display: inline-block;
            width: 14px;
            height: 14px;
            border: 2px solid var(--border-subtle);
            border-top-color: var(--accent-primary);
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .stats-bar {
            display: flex;
            gap: 12px;
            padding: 10px;
            background: var(--bg-tertiary);
            border-radius: var(--radius-sm);
            margin-top: 8px;
            font-size: 11px;
        }

        .stat-item {
            display: flex;
            align-items: center;
            gap: 4px;
            color: var(--text-secondary);
        }

        .stat-value {
            font-weight: 600;
            color: var(--text-primary);
        }

        .code-block {
            background: var(--bg-primary);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-sm);
            padding: 10px;
            margin: 8px 0;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 11px;
            color: var(--text-secondary);
            overflow-x: auto;
        }

        .code-block::-webkit-scrollbar {
            height: 4px;
        }

        .code-block::-webkit-scrollbar-thumb {
            background: var(--border-medium);
            border-radius: 2px;
        }

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

        .file-attachment-icon {
            font-size: 16px;
        }

        .file-attachment-name {
            flex: 1;
            color: var(--text-primary);
            font-weight: 500;
        }

        .file-attachment-remove {
            padding: 2px 6px;
            background: var(--bg-elevated);
            border: 1px solid var(--border-subtle);
            border-radius: 4px;
            color: var(--text-tertiary);
            cursor: pointer;
            font-size: 10px;
            transition: all 0.2s;
        }

        .file-attachment-remove:hover {
            background: var(--error);
            color: var(--bg-primary);
            border-color: var(--error);
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-left">
            <div class="logo">CP</div>
            <h1>CodePlanr AI</h1>
        </div>
        <div class="header-controls">
            <button class="control-btn" id="exportBtn">
                <span class="btn-icon">📤</span>
                <span class="btn-text">Export</span>
            </button>
            <button class="control-btn" id="clearBtn">
                <span class="btn-icon">🗑️</span>
                <span class="btn-text">Clear</span>
            </button>
            <button class="control-btn" id="configBtn">
                <span class="btn-icon">⚙️</span>
                <span class="btn-text">Settings</span>
            </button>
        </div>
    </div>

    <div class="chat-container" id="chatContainer">
        <div class="welcome-message" id="welcomeMessage">
            <div class="welcome-icon">CP</div>
            <h3>CodePlanr AI</h3>
            <p>Professional AI coding assistant</p>
            <p>Create files, write code, and automate development tasks</p>
            <div class="setup-notice">
                <strong>🔑 First time?</strong> Click <strong>⚙️ Settings</strong> to configure your API key
            </div>
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
        <div class="typing-text">AI is thinking</div>
        <div class="typing-dots">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    </div>

    <div class="input-container">
        <div class="mode-toggle">
            <button class="mode-btn" id="chatModeBtn">💬 Chat</button>
            <button class="mode-btn active" id="agentModeBtn">⚡ Agent</button>
        </div>
        <div id="fileAttachmentContainer"></div>
        <div class="input-wrapper">
            <button class="upload-btn" id="uploadBtn" title="Upload file">📎</button>
            <input type="text" class="input-field" id="messageInput" placeholder="Describe what you want to create..." />
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
        const exportBtn = document.getElementById('exportBtn');
        const uploadBtn = document.getElementById('uploadBtn');
        const notification = document.getElementById('notification');
        const chatModeBtn = document.getElementById('chatModeBtn');
        const agentModeBtn = document.getElementById('agentModeBtn');
        const fileAttachmentContainer = document.getElementById('fileAttachmentContainer');

        let isProcessing = false;
        let currentMode = 'agent';
        let messageCount = 0;
        let uploadedFile = null;

        function sendMessage() {
            const text = messageInput.value.trim();
            if (!text || isProcessing) return;

            // Prepare message with file context if available
            let messageText = text;
            if (uploadedFile) {
                messageText = \`[File: \${uploadedFile.fileName}]\\n\\n\${text}\\n\\nFile content:\\n\${uploadedFile.content}\`;
            }

            // Clear input and disable button immediately
            messageInput.value = '';
            sendBtn.disabled = true;
            isProcessing = true;

            // Add user message to chat
            addMessage('user', text);

            // Send to extension based on mode
            if (currentMode === 'agent') {
                vscode.postMessage({
                    type: 'sendAgentTask',
                    text: messageText
                });
            } else {
                vscode.postMessage({
                    type: 'sendMessage',
                    text: messageText
                });
            }

            // Clear uploaded file after sending
            if (uploadedFile) {
                removeFileAttachment();
            }
        }

        function showFileAttachment(fileName) {
            fileAttachmentContainer.innerHTML = \`
                <div class="file-attachment">
                    <span class="file-attachment-icon">📎</span>
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

        function addMessage(type, content) {
            messageCount++;
            const messageDiv = document.createElement('div');
            messageDiv.className = \`message \${type}\`;
            messageDiv.dataset.messageId = messageCount;
            
            const header = type === 'user' ? '👤 YOU' : '🤖 AI';
            
            // Check if content contains plan steps
            let formattedContent = content;
            if (content.includes('📋 Plan Created:') || content.includes('Step')) {
                formattedContent = formatPlanContent(content);
            } else {
                formattedContent = content.replace(/\\n/g, '<br>');
            }
            
            messageDiv.innerHTML = \`
                <div class="message-header">\${header}</div>
                <div class="message-content">\${formattedContent}</div>
            \`;

            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
            welcomeMessage.style.display = 'none';
        }

        function formatPlanContent(content) {
            // Format plan steps with better UI
            if (content.includes('📋 Plan Created:')) {
                const lines = content.split('\\n');
                let html = '<div class="plan-container"><div class="plan-header">📋 Plan Created</div>';
                
                lines.forEach(line => {
                    if (line.match(/^\\d+\\./)) {
                        const stepNum = line.match(/^(\\d+)\\./)[1];
                        const stepText = line.replace(/^\\d+\\.\\s*\\[\\s*\\]\\s*/, '');
                        html += \`
                            <div class="plan-step pending" data-step="\${stepNum}" id="step-\${stepNum}">
                                <div class="step-checkbox"></div>
                                <div class="step-content">
                                    <div class="step-title">\${stepText}</div>
                                </div>
                            </div>
                        \`;
                    }
                });
                
                html += '</div>';
                return html;
            }
            
            // Format step updates
            if (content.includes('Step')) {
                const isCompleted = content.includes('✅');
                const isFailed = content.includes('❌');
                const isInProgress = content.includes('⏳');
                
                let icon = '⏳';
                let status = 'in-progress';
                if (isCompleted) {
                    icon = '✅';
                    status = 'completed';
                } else if (isFailed) {
                    icon = '❌';
                    status = 'failed';
                }
                
                return content.replace(/\\n/g, '<br>');
            }
            
            return content.replace(/\\n/g, '<br>');
        }

        function updateStepStatus(stepId, status) {
            const stepElement = document.getElementById(\`step-\${stepId}\`);
            if (stepElement) {
                stepElement.className = \`plan-step \${status}\`;
            }
        }

        function showTyping() {
            typingIndicator.style.display = 'flex';
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function hideTyping() {
            typingIndicator.style.display = 'none';
        }

        function showNotification(message) {
            if (message.includes('Error') || message.includes('❌')) {
                showErrorNotification(message);
            } else {
                showSuccessNotification(message);
            }
        }

        function clearChat() {
            chatContainer.innerHTML = '';
            const welcomeClone = welcomeMessage.cloneNode(true);
            chatContainer.appendChild(welcomeClone);
            messageCount = 0;
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

        exportBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'exportPlan' });
        });

        uploadBtn.addEventListener('click', () => {
            vscode.postMessage({ type: 'uploadFile' });
        });

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

        function showErrorNotification(message) {
            notification.textContent = message;
            notification.className = 'notification error-notification';
            notification.style.display = 'block';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 4000);
        }

        function showSuccessNotification(message) {
            notification.textContent = message;
            notification.className = 'notification';
            notification.style.display = 'block';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 3000);
        }

        // Handle messages from extension
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
                    showNotification(message.message);
                    break;

                case 'updateStep':
                    updateStepStatus(message.stepId, message.status);
                    if (message.status === 'completed' || message.status === 'failed') {
                        addMessage('assistant', message.message);
                    }
                    break;

                case 'fileUploaded':
                    uploadedFile = {
                        fileName: message.fileName,
                        filePath: message.filePath,
                        content: message.content
                    };
                    showFileAttachment(message.fileName);
                    break;
            }
        });

        messageInput.focus();
    </script>
</body>
</html>`;
    }
}
