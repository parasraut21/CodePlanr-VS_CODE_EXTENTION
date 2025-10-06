import * as vscode from 'vscode';
import { MastraAgentService } from '../services/mastraAgent';

/**
 * Handles all message-related operations between webview and extension
 */
export class MessageHandler {
    private agentService: MastraAgentService;

    constructor(
        private view: vscode.WebviewView,
        private getCurrentModel: () => string,
        private getApiKey: () => Promise<string | null>
    ) {
        this.agentService = new MastraAgentService();
    }

    public async handleSendMessage(text: string): Promise<void> {
        this.showTyping();

        try {
            const apiKey = await this.getApiKey();
            if (!apiKey) {
                this.hideTyping();
                this.addMessage('assistant', '🔑 API Key Required\n\nPlease configure your OpenAI API key:\n\n1. Click the ⚙️ Settings button above\n2. Enter your API key from https://platform.openai.com/api-keys\n3. Try again\n\nAlternatively, set the OPENAI_API_KEY environment variable.');
                return;
            }

            const response = await this.callOpenAI(apiKey, text);
            this.hideTyping();
            this.addMessage('assistant', response);

        } catch (error) {
            this.hideTyping();
            this.handleError(error);
        }
    }

    public async handleAgentTask(text: string): Promise<void> {
        try {
            const apiKey = await this.getApiKey();
            if (!apiKey) {
                this.addMessage('assistant', '🔑 API Key Required\n\nPlease configure your OpenAI API key:\n\n1. Click the ⚙️ Settings button above\n2. Enter your API key from https://platform.openai.com/api-keys\n3. Try again\n\nAlternatively, set the OPENAI_API_KEY environment variable.');
                return;
            }

            this.agentService.setApiKey(apiKey);
            this.agentService.setModel(this.getCurrentModel());

            this.addMessage('assistant', '🤖 Agent Mode: Creating plan...');

            const plan = await this.agentService.createPlan(text);
            
            let planText = `📋 Plan Created:\n\n`;
            plan.steps.forEach(step => {
                planText += `${step.id}. [ ] ${step.description}\n`;
            });
            this.addMessage('assistant', planText);

            this.addMessage('assistant', '⚡ Executing plan...\n');

            await this.agentService.executePlan(plan, (step) => {
                let statusIcon = '⏳';
                if (step.status === 'completed') statusIcon = '✅';
                if (step.status === 'failed') statusIcon = '❌';
                
                const message = `${statusIcon} Step ${step.id}: ${step.description}${step.result ? '\n   ' + step.result : ''}${step.error ? '\n   Error: ' + step.error : ''}`;
                
                this.updatePlanProgress(step.id, step.status, message);
            });

            this.addMessage('assistant', '🎉 All tasks completed successfully!');

        } catch (error) {
            this.handleAgentError(error);
        }
    }

    private async callOpenAI(apiKey: string, message: string): Promise<string> {
        const model = this.getCurrentModel();
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model,
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
        
        content = content
            .replace(/\*\*(.*?)\*\*/g, '$1')
            .replace(/\*(.*?)\*/g, '$1')
            .replace(/^[\s]*[-*]\s*/gm, '• ')
            .replace(/^[\s]*\d+\.\s*/gm, '')
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/#{1,6}\s*/g, '')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .trim();
            
        return content;
    }

    private handleError(error: unknown): void {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('401') || errorMessage.includes('Unauthorized')) {
            this.addMessage('assistant', '🔑 Invalid API Key\n\nYour OpenAI API key is invalid or expired.\n\nPlease:\n1. Click the ⚙️ Settings button above\n2. Get a valid API key from https://platform.openai.com/api-keys\n3. Enter the new key\n4. Try again');
        } else if (errorMessage.includes('429')) {
            this.addMessage('assistant', '⏰ Rate Limit Exceeded\n\nYou have exceeded the OpenAI API rate limit.\n\nPlease wait a moment and try again.');
        } else if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
            this.addMessage('assistant', '🌐 Server Error\n\nOpenAI servers are experiencing issues.\n\nPlease try again in a few minutes.');
        } else {
            this.addMessage('assistant', `❌ Error: ${errorMessage}\n\nIf this is an API key issue, click ⚙️ Settings to configure your key.`);
        }
    }

    private handleAgentError(error: unknown): void {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (errorMessage.includes('NOT_A_CODING_TASK')) {
            this.addMessage('assistant', '💬 Not a Coding Task\n\nI\'m designed to help with coding tasks like:\n• Creating files\n• Writing code\n• Modifying existing code\n• Checking for errors\n\nFor general questions, switch to 💬 Chat mode!\n\nExamples:\n• "create a python file for sorting"\n• "make a javascript function for validation"\n• "create a cpp file for addition"');
        } else if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('API key')) {
            this.addMessage('assistant', '🔑 Invalid API Key\n\nYour OpenAI API key is invalid or expired.\n\nPlease:\n1. Click the ⚙️ Settings button above\n2. Get a valid API key from https://platform.openai.com/api-keys\n3. Enter the new key\n4. Try again');
        } else if (errorMessage.includes('429')) {
            this.addMessage('assistant', '⏰ Rate Limit Exceeded\n\nYou have exceeded the OpenAI API rate limit.\n\nPlease wait a moment and try again.');
        } else if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
            this.addMessage('assistant', '🌐 Server Error\n\nOpenAI servers are experiencing issues.\n\nPlease try again in a few minutes.');
        } else {
            this.addMessage('assistant', `❌ Error: ${errorMessage}\n\nIf this is an API key issue, click ⚙️ Settings to configure your key.`);
        }
    }

    private addMessage(type: 'user' | 'assistant', content: string): void {
        this.view.webview.postMessage({
            type: 'addMessage',
            message: {
                type: type,
                content: content,
                timestamp: new Date().toISOString()
            }
        });
    }

    private showTyping(): void {
        this.view.webview.postMessage({ type: 'showTyping' });
    }

    private hideTyping(): void {
        this.view.webview.postMessage({ type: 'hideTyping' });
    }

    private updatePlanProgress(stepId: number, status: string, message: string): void {
        this.view.webview.postMessage({
            type: 'updateStep',
            stepId: stepId,
            status: status,
            message: message
        });
    }

    public getCurrentPlan() {
        return this.agentService.getCurrentPlan();
    }
}
