import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { callOpenAI } from '../utils/openai';

export interface TaskStep {
    id: number;
    description: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    result?: string;
    error?: string;
    action?: string;
    file?: string;
}

export interface TaskPlan {
    task: string;
    steps: TaskStep[];
}

export class MastraAgentService {
    private currentPlan: TaskPlan | null = null;
    private apiKey: string = '';
    private model: string = 'gpt-4o';

    setApiKey(key: string): void {
        this.apiKey = key;
    }

    setModel(model: string): void {
        this.model = model;
    }

    async createPlan(userRequest: string): Promise<TaskPlan> {
        await this.validateCodingTask(userRequest);
        
        const planningPrompt = this.buildPlanningPrompt(userRequest);
        const response = await callOpenAI(
            this.apiKey,
            this.model,
            planningPrompt,
            'You are a helpful coding assistant. Always return valid JSON when requested.'
        );
        
        const stepsData = this.extractJsonFromResponse(response);
        const steps = this.mapStepsData(stepsData);

        this.currentPlan = { task: userRequest, steps };
        return this.currentPlan;
    }

    async executePlan(plan: TaskPlan, onProgress: (step: TaskStep) => void): Promise<void> {
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

    getCurrentPlan(): TaskPlan | null {
        return this.currentPlan;
    }

    private async validateCodingTask(userRequest: string): Promise<void> {
        const validationPrompt = `Is this a request to create, modify, or work with code/files? Answer ONLY "yes" or "no".\n\nRequest: "${userRequest}"\n\nAnswer:`;
        const response = await callOpenAI(this.apiKey, this.model, validationPrompt);
        
        if (!response.toLowerCase().trim().includes('yes')) {
            throw new Error('NOT_A_CODING_TASK');
        }
    }

    private buildPlanningPrompt(userRequest: string): string {
        return `Break down this coding task into clear, specific steps: "${userRequest}"
        
        Return ONLY a JSON array of steps, each with:
        - description: what to do (be specific)
        - action: one of [create_file, write_code, check_errors, modify_file]
        - file: filename if applicable
        
        Example for "create a cpp file for addition of 2 numbers":
        [
            {"description": "Create addition.cpp file", "action": "create_file", "file": "addition.cpp"},
            {"description": "Write C++ code for addition of two numbers", "action": "write_code", "file": "addition.cpp"},
            {"description": "Check for compilation errors", "action": "check_errors", "file": "addition.cpp"}
        ]
        
        Return ONLY the JSON array, no other text.`;
    }

    private mapStepsData(stepsData: any[]): TaskStep[] {
        return stepsData.map((step: any, index: number) => ({
            id: index + 1,
            description: step.description,
            status: 'pending' as const,
            action: step.action,
            file: step.file
        }));
    }

    private async executeStep(step: TaskStep): Promise<string> {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder open');
        }

        const action = step.action || this.inferAction(step.description);
        
        switch (action) {
            case 'create_file':
                return await this.createFile(step.file!, workspaceFolder);
            case 'write_code':
                return await this.writeCode(step.file!, step.description, workspaceFolder);
            case 'check_errors':
                return await this.checkErrors(step.file!, workspaceFolder);
            case 'modify_file':
                return await this.modifyFile(step.file!, step.description, workspaceFolder);
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
        
        const codePrompt = `Generate complete, working code for: ${description}\nFile: ${filename}\nLanguage: ${this.getLanguageFromExtension(ext)}\n\nReturn ONLY the code, no explanations or markdown formatting.`;
        const response = await callOpenAI(this.apiKey, this.model, codePrompt);
        const code = response.trim().replace(/```[\w]*\n/g, '').replace(/```$/g, '').trim();
        
        fs.writeFileSync(filePath, code, 'utf8');
        
        const document = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(document);
        
        return `Wrote code to ${filename}`;
    }

    private async checkErrors(filename: string, workspaceFolder: vscode.WorkspaceFolder): Promise<string> {
        const filePath = path.join(workspaceFolder.uri.fsPath, filename);
        const uri = vscode.Uri.file(filePath);
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
        const modifyPrompt = `Modify this code according to: ${description}\n\nCurrent code:\n${currentContent}\n\nReturn ONLY the complete modified code, no explanations or markdown.`;
        const response = await callOpenAI(this.apiKey, this.model, modifyPrompt);
        const code = response.trim().replace(/```[\w]*\n/g, '').replace(/```$/g, '').trim();
        
        fs.writeFileSync(filePath, code, 'utf8');
        
        return `Modified ${filename}`;
    }

    private getLanguageFromExtension(ext: string): string {
        const langMap: Record<string, string> = {
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
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        
        try {
            return JSON.parse(text);
        } catch {
            throw new Error('Could not extract valid JSON from response');
        }
    }
}
