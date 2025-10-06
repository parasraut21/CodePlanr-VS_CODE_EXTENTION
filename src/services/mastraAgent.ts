import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

interface TaskStep {
    id: number;
    description: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    result?: string;
    error?: string;
    action?: string;
    file?: string;
}

interface TaskPlan {
    task: string;
    steps: TaskStep[];
}

export class MastraAgentService {
    private currentPlan: TaskPlan | null = null;
    private apiKey: string = '';

    constructor() {}

    setApiKey(key: string) {
        this.apiKey = key;
    }

    async createPlan(userRequest: string): Promise<TaskPlan> {
        const planningPrompt = `Break down this task into clear steps: "${userRequest}"
        
        Return ONLY a JSON array of steps, each with:
        - description: what to do
        - action: one of [create_file, write_code, check_errors, modify_file]
        - file: filename if applicable
        
        Example for "create a cpp file for addition of 2 numbers":
        [
            {"description": "Create addition.cpp file", "action": "create_file", "file": "addition.cpp"},
            {"description": "Write C++ code for addition", "action": "write_code", "file": "addition.cpp"},
            {"description": "Check for compilation errors", "action": "check_errors", "file": "addition.cpp"}
        ]
        
        Return ONLY the JSON array, no other text.`;

        try {
            const response = await this.callOpenAI(planningPrompt);
            const stepsData = this.extractJsonFromResponse(response);
            
            const steps: TaskStep[] = stepsData.map((step: any, index: number) => ({
                id: index + 1,
                description: step.description,
                status: 'pending' as const,
                action: step.action,
                file: step.file
            }));

            this.currentPlan = {
                task: userRequest,
                steps
            };

            return this.currentPlan;
        } catch (error) {
            throw new Error(`Failed to create plan: ${error}`);
        }
    }

    private async callOpenAI(prompt: string): Promise<string> {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful coding assistant. Always return valid JSON when requested.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json() as any;
        return data.choices[0].message.content;
    }

    async executePlan(
        plan: TaskPlan,
        onProgress: (step: TaskStep) => void
    ): Promise<void> {
        for (const step of plan.steps) {
            step.status = 'in-progress';
            onProgress(step);

            try {
                const result = await this.executeStep(step);
                step.status = 'completed';
                step.result = result;
                onProgress(step);
            } catch (error) {
                step.status = 'failed';
                step.error = error instanceof Error ? error.message : String(error);
                onProgress(step);
                throw error;
            }
        }
    }

    private async executeStep(step: any): Promise<string> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder open');
        }

        const action = step.action || this.inferAction(step.description);
        
        switch (action) {
            case 'create_file':
                return await this.createFile(step.file, workspaceFolder);
            
            case 'write_code':
                return await this.writeCode(step.file, step.description, workspaceFolder);
            
            case 'check_errors':
                return await this.checkErrors(step.file, workspaceFolder);
            
            case 'modify_file':
                return await this.modifyFile(step.file, step.description, workspaceFolder);
            
            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }

    private inferAction(description: string): string {
        const lower = description.toLowerCase();
        if (lower.includes('create') && lower.includes('file')) return 'create_file';
        if (lower.includes('write') || lower.includes('code')) return 'write_code';
        if (lower.includes('check') || lower.includes('error')) return 'check_errors';
        if (lower.includes('modify') || lower.includes('update')) return 'modify_file';
        return 'write_code';
    }

    private async createFile(filename: string, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
        const filePath = path.join(workspaceFolder.uri.fsPath, filename);
        
        if (fs.existsSync(filePath)) {
            return `File ${filename} already exists`;
        }

        fs.writeFileSync(filePath, '', 'utf8');
        return `Created file: ${filename}`;
    }

    private async writeCode(filename: string, description: string, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
        const filePath = path.join(workspaceFolder.uri.fsPath, filename);
        const ext = path.extname(filename);
        
        let codePrompt = `Generate complete, working code for: ${description}
        File: ${filename}
        Language: ${this.getLanguageFromExtension(ext)}
        
        Return ONLY the code, no explanations or markdown formatting.`;

        const response = await this.callOpenAI(codePrompt);
        let code = response.trim();
        
        // Clean up markdown code blocks if present
        code = code.replace(/```[\w]*\n/g, '').replace(/```$/g, '').trim();
        
        fs.writeFileSync(filePath, code, 'utf8');
        
        // Open the file in editor
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);
        
        return `Wrote code to ${filename}`;
    }

    private async checkErrors(filename: string, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
        const filePath = path.join(workspaceFolder.uri.fsPath, filename);
        const uri = vscode.Uri.file(filePath);
        
        // Get diagnostics from VS Code
        const diagnostics = vscode.languages.getDiagnostics(uri);
        
        if (diagnostics.length === 0) {
            return `No errors found in ${filename}`;
        }

        const errors = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Error);
        const warnings = diagnostics.filter(d => d.severity === vscode.DiagnosticSeverity.Warning);
        
        return `Found ${errors.length} errors and ${warnings.length} warnings in ${filename}`;
    }

    private async modifyFile(filename: string, description: string, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
        const filePath = path.join(workspaceFolder.uri.fsPath, filename);
        
        if (!fs.existsSync(filePath)) {
            throw new Error(`File ${filename} does not exist`);
        }

        const currentContent = fs.readFileSync(filePath, 'utf8');
        
        const modifyPrompt = `Modify this code according to: ${description}
        
        Current code:
        ${currentContent}
        
        Return ONLY the complete modified code, no explanations or markdown.`;

        const response = await this.callOpenAI(modifyPrompt);
        let code = response.trim();
        
        code = code.replace(/```[\w]*\n/g, '').replace(/```$/g, '').trim();
        
        fs.writeFileSync(filePath, code, 'utf8');
        
        return `Modified ${filename}`;
    }

    private getLanguageFromExtension(ext: string): string {
        const langMap: { [key: string]: string } = {
            '.cpp': 'C++',
            '.c': 'C',
            '.js': 'JavaScript',
            '.ts': 'TypeScript',
            '.py': 'Python',
            '.java': 'Java',
            '.cs': 'C#',
            '.go': 'Go',
            '.rs': 'Rust'
        };
        return langMap[ext] || 'code';
    }

    private extractJsonFromResponse(text: string): any[] {
        // Try to find JSON array in the response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        // Fallback: try to parse the whole response
        try {
            return JSON.parse(text);
        } catch {
            throw new Error('Could not extract valid JSON from response');
        }
    }

    getCurrentPlan(): TaskPlan | null {
        return this.currentPlan;
    }
}
