import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface PlanStep {
    id: number;
    description: string;
    file: string;
    action: 'add' | 'edit' | 'create';
}

export interface Plan {
    task: string;
    steps: PlanStep[];
}

export class TraycerProvider {
    private outputChannel: vscode.OutputChannel;
    private currentPlan: Plan | null = null;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Traycer-Lite');
    }

    public async generatePlan(task: string, agent: string = 'general'): Promise<Plan> {
        this.outputChannel.appendLine(`🤖 Generating plan for: "${task}"`);
        this.outputChannel.appendLine(`🎯 Using agent: ${agent}`);
        this.outputChannel.show();

        try {
            const apiKey = await this.getApiKey();
            if (!apiKey) {
                throw new Error('OpenAI API key not configured');
            }

            const systemPrompt = this.getSystemPrompt(agent);
            const response = await this.callLLM(apiKey, systemPrompt, task);
            
            // Parse JSON response
            const plan = JSON.parse(response) as Plan;
            this.currentPlan = plan;
            
            this.outputChannel.appendLine(`✅ Plan generated successfully!`);
            this.outputChannel.appendLine(`📋 Task: ${plan.task}`);
            this.outputChannel.appendLine(`📝 Steps: ${plan.steps.length}`);
            
            // Display plan steps
            plan.steps.forEach((step, index) => {
                this.outputChannel.appendLine(`  ${index + 1}. ${step.description} (${step.action} ${step.file})`);
            });

            return plan;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.outputChannel.appendLine(`❌ Error generating plan: ${errorMessage}`);
            throw error;
        }
    }

    public async executePlan(): Promise<void> {
        if (!this.currentPlan) {
            vscode.window.showErrorMessage('No plan available. Please generate a plan first.');
            return;
        }

        this.outputChannel.appendLine(`🚀 Executing plan: ${this.currentPlan.task}`);
        this.outputChannel.show();

        try {
            const apiKey = await this.getApiKey();
            if (!apiKey) {
                throw new Error('OpenAI API key not configured');
            }

            for (const step of this.currentPlan.steps) {
                this.outputChannel.appendLine(`\n📝 Step ${step.id}: ${step.description}`);
                
                // Generate code for this step
                const code = await this.generateCodeForStep(apiKey, step);
                
                // Apply code to file
                await this.applyCodeToFile(step, code);
                
                this.outputChannel.appendLine(`✅ Step ${step.id} completed`);
            }

            this.outputChannel.appendLine(`\n🎉 Plan execution completed successfully!`);
            vscode.window.showInformationMessage('Plan executed successfully!');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.outputChannel.appendLine(`❌ Error executing plan: ${errorMessage}`);
            vscode.window.showErrorMessage(`Plan execution failed: ${errorMessage}`);
        }
    }

    private getSystemPrompt(agent: string): string {
        const basePrompt = `You are a coding assistant that generates structured plans for development tasks. 
Return ONLY a valid JSON object with this exact structure:
{
  "task": "Brief description of the task",
  "steps": [
    {
      "id": 1,
      "description": "Clear step description",
      "file": "relative/path/to/file.ext",
      "action": "add|edit|create"
    }
  ]
}

Guidelines:
- Keep steps simple and focused
- Use relative file paths from project root
- For "add" action: append code to existing file
- For "edit" action: modify existing code in file
- For "create" action: create new file
- Maximum 5 steps per plan
- Be specific about file paths and actions`;

        const agentPrompts: { [key: string]: string } = {
            'frontend': basePrompt + '\n\nSpecialization: Focus on React, Vue, Angular, HTML, CSS, JavaScript/TypeScript frontend development.',
            'backend': basePrompt + '\n\nSpecialization: Focus on Node.js, Express, API development, database integration, server-side logic.',
            'general': basePrompt + '\n\nSpecialization: General purpose development assistance for any technology stack.'
        };

        return agentPrompts[agent] || agentPrompts['general'];
    }

    private async generateCodeForStep(apiKey: string, step: PlanStep): Promise<string> {
        const prompt = `Generate code for this step: "${step.description}"
File: ${step.file}
Action: ${step.action}

Return ONLY the code without explanations or markdown formatting.`;

        const response = await this.callLLM(apiKey, 'You are a code generator. Return only clean, executable code.', prompt);
        return response.trim();
    }

    private async applyCodeToFile(step: PlanStep, code: string): Promise<void> {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            throw new Error('No workspace folder found');
        }

        const filePath = path.join(workspaceRoot, step.file);
        const fileUri = vscode.Uri.file(filePath);

        try {
            let document: vscode.TextDocument;
            
            // Check if file exists
            if (fs.existsSync(filePath)) {
                document = await vscode.workspace.openTextDocument(fileUri);
            } else {
                // Create new file if it doesn't exist
                if (step.action === 'create') {
                    const dir = path.dirname(filePath);
                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true });
                    }
                    fs.writeFileSync(filePath, '');
                    document = await vscode.workspace.openTextDocument(fileUri);
                } else {
                    throw new Error(`File ${step.file} does not exist`);
                }
            }

            const edit = new vscode.WorkspaceEdit();
            
            if (step.action === 'add') {
                // Append to end of file
                const endPosition = new vscode.Position(document.lineCount, 0);
                edit.insert(fileUri, endPosition, '\n' + code);
            } else if (step.action === 'edit') {
                // For simplicity, append to end (in real implementation, you'd want smarter editing)
                const endPosition = new vscode.Position(document.lineCount, 0);
                edit.insert(fileUri, endPosition, '\n' + code);
            } else if (step.action === 'create') {
                // Replace entire file content
                edit.replace(fileUri, new vscode.Range(0, 0, document.lineCount, 0), code);
            }

            await vscode.workspace.applyEdit(edit);
            await document.save();
            
            this.outputChannel.appendLine(`📁 Applied changes to ${step.file}`);
        } catch (error) {
            this.outputChannel.appendLine(`❌ Failed to apply changes to ${step.file}: ${error}`);
            throw error;
        }
    }

    private async getApiKey(): Promise<string | null> {
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

    private async callLLM(apiKey: string, systemPrompt: string, userPrompt: string): Promise<string> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ],
                max_tokens: 2000,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any;
        return data.choices[0].message.content;
    }

    public getCurrentPlan(): Plan | null {
        return this.currentPlan;
    }

    public clearPlan(): void {
        this.currentPlan = null;
        this.outputChannel.appendLine('🗑️ Plan cleared');
    }
}
