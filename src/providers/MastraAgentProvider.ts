import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface AgentTask {
    id: string;
    description: string;
    status: 'pending' | 'in-progress' | 'completed' | 'failed';
    result?: string;
    error?: string;
}

export interface AgentPlan {
    userRequest: string;
    tasks: AgentTask[];
    currentTaskIndex: number;
    status: 'planning' | 'executing' | 'completed' | 'failed';
}

export class MastraAgentProvider {
    private outputChannel: vscode.OutputChannel;
    private currentPlan: AgentPlan | null = null;
    private statusBarItem: vscode.StatusBarItem;

    constructor() {
        this.outputChannel = vscode.window.createOutputChannel('Mastra Agent');
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    }

    public async executeAgentRequest(userRequest: string): Promise<void> {
        this.outputChannel.clear();
        this.outputChannel.show();
        this.outputChannel.appendLine('🤖 Mastra Agent Starting...');
        this.outputChannel.appendLine(`📝 Request: ${userRequest}\n`);

        try {
            // Phase 1: Planning
            this.updateStatus('🧠 Planning...');
            await this.createPlan(userRequest);

            // Phase 2: Execution
            this.updateStatus('⚙️ Executing...');
            await this.executePlan();

            // Phase 3: Verification
            this.updateStatus('✅ Verifying...');
            await this.verifyResults();

            // Phase 4: Success
            this.showSuccess();

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.outputChannel.appendLine(`\n❌ Error: ${errorMessage}`);
            this.updateStatus('❌ Failed');
            vscode.window.showErrorMessage(`Agent failed: ${errorMessage}`);
        }
    }

    private async createPlan(userRequest: string): Promise<void> {
        this.outputChannel.appendLine('📋 Creating execution plan...\n');

        const apiKey = await this.getApiKey();
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        // Use LLM to create a structured plan
        const planningPrompt = `You are a coding assistant. Break down this request into specific, actionable tasks.

User Request: "${userRequest}"

Return a JSON array of tasks. Each task should have:
- description: Clear description of what to do
- type: "create_file" | "write_code" | "check_errors" | "verify"

Example:
[
  {"description": "Create directory structure", "type": "create_file"},
  {"description": "Create main.cpp file", "type": "create_file"},
  {"description": "Write C++ code for addition of 2 numbers", "type": "write_code"},
  {"description": "Check for compilation errors", "type": "check_errors"},
  {"description": "Verify implementation", "type": "verify"}
]

Return ONLY the JSON array, no markdown, no backticks, no other text. Just the raw JSON array.`;

        const response = await this.callLLM(apiKey, planningPrompt);
        // Clean response - remove markdown code blocks if present
        const cleanResponse = response.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
        const tasks = JSON.parse(cleanResponse);

        this.currentPlan = {
            userRequest,
            tasks: tasks.map((task: any, index: number) => ({
                id: `task-${index + 1}`,
                description: task.description,
                status: 'pending' as const
            })),
            currentTaskIndex: 0,
            status: 'planning'
        };

        this.outputChannel.appendLine('✅ Plan created:\n');
        this.currentPlan.tasks.forEach((task, index) => {
            this.outputChannel.appendLine(`  ${index + 1}. [ ] ${task.description}`);
        });
        this.outputChannel.appendLine('');
    }

    private async executePlan(): Promise<void> {
        if (!this.currentPlan) {
            throw new Error('No plan available');
        }

        this.currentPlan.status = 'executing';
        this.outputChannel.appendLine('🚀 Executing plan...\n');

        for (let i = 0; i < this.currentPlan.tasks.length; i++) {
            const task = this.currentPlan.tasks[i];
            this.currentPlan.currentTaskIndex = i;

            this.outputChannel.appendLine(`▶️  Task ${i + 1}/${this.currentPlan.tasks.length}: ${task.description}`);
            task.status = 'in-progress';

            try {
                await this.executeTask(task);
                task.status = 'completed';
                this.outputChannel.appendLine(`   ✅ Completed\n`);

                // Update checklist
                this.printChecklist();

            } catch (error) {
                task.status = 'failed';
                task.error = error instanceof Error ? error.message : 'Unknown error';
                this.outputChannel.appendLine(`   ❌ Failed: ${task.error}\n`);
                throw error;
            }
        }

        this.currentPlan.status = 'completed';
    }

    private async executeTask(task: AgentTask): Promise<void> {
        const apiKey = await this.getApiKey();
        if (!apiKey) {
            throw new Error('OpenAI API key not configured');
        }

        // Determine task type and execute accordingly
        if (task.description.toLowerCase().includes('create') && task.description.toLowerCase().includes('file')) {
            await this.handleFileCreation(task, apiKey);
        } else if (task.description.toLowerCase().includes('write') || task.description.toLowerCase().includes('code')) {
            await this.handleCodeGeneration(task, apiKey);
        } else if (task.description.toLowerCase().includes('check') || task.description.toLowerCase().includes('error')) {
            await this.handleErrorCheck(task);
        } else if (task.description.toLowerCase().includes('verify')) {
            await this.handleVerification(task);
        } else {
            // Generic task execution
            await this.handleGenericTask(task, apiKey);
        }
    }

    private async handleFileCreation(task: AgentTask, apiKey: string): Promise<void> {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            throw new Error('No workspace folder found');
        }

        // Ask LLM what file to create
        const prompt = `Based on this task: "${task.description}" and the original request: "${this.currentPlan?.userRequest}"
        
What file should be created? Return ONLY the relative file path (e.g., "src/main.cpp" or "examples/addition.cpp").
No explanations, no quotes, no markdown, just the path.`;

        let filePath = (await this.callLLM(apiKey, prompt)).trim();
        // Clean response - remove quotes and markdown
        filePath = filePath.replace(/['"` ]/g, '').replace(/```/g, '');
        const fullPath = path.join(workspaceRoot, filePath);

        // Create directory if needed
        const dir = path.dirname(fullPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            this.outputChannel.appendLine(`   📁 Created directory: ${path.relative(workspaceRoot, dir)}`);
        }

        // Create empty file
        fs.writeFileSync(fullPath, '');
        this.outputChannel.appendLine(`   📄 Created file: ${filePath}`);

        task.result = filePath;
    }

    private async handleCodeGeneration(task: AgentTask, apiKey: string): Promise<void> {
        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            throw new Error('No workspace folder found');
        }

        // Find the file to write to (from previous task or ask LLM)
        let targetFile = this.findLastCreatedFile();

        if (!targetFile) {
            const prompt = `What file should contain the code for: "${task.description}"? Return ONLY the file path.`;
            targetFile = (await this.callLLM(apiKey, prompt)).trim().replace(/['"]/g, '');
        }

        // Generate code
        const codePrompt = `Generate code for: "${task.description}"
Original request: "${this.currentPlan?.userRequest}"
Target file: ${targetFile}

Return ONLY the code, no explanations, no markdown code blocks, no backticks. Just the raw code.`;

        let code = await this.callLLM(apiKey, codePrompt);
        // Clean response - remove markdown code blocks if present
        code = code.replace(/```[\w]*\s*/g, '').replace(/```\s*/g, '').trim();

        // Write code to file
        const fullPath = path.join(workspaceRoot, targetFile);
        fs.writeFileSync(fullPath, code.trim());

        this.outputChannel.appendLine(`   💾 Wrote code to: ${targetFile}`);
        this.outputChannel.appendLine(`   📝 Lines: ${code.split('\n').length}`);

        // Open file in editor
        const document = await vscode.workspace.openTextDocument(fullPath);
        await vscode.window.showTextDocument(document);

        task.result = targetFile;
    }

    private async handleErrorCheck(task: AgentTask): Promise<void> {
        const targetFile = this.findLastCreatedFile();
        if (!targetFile) {
            this.outputChannel.appendLine(`   ⚠️  No file to check`);
            return;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            throw new Error('No workspace folder found');
        }

        const fullPath = path.join(workspaceRoot, targetFile);
        const uri = vscode.Uri.file(fullPath);

        // Get diagnostics
        const diagnostics = vscode.languages.getDiagnostics(uri);

        if (diagnostics.length === 0) {
            this.outputChannel.appendLine(`   ✅ No errors found in ${targetFile}`);
        } else {
            this.outputChannel.appendLine(`   ⚠️  Found ${diagnostics.length} issue(s) in ${targetFile}:`);
            diagnostics.forEach(diag => {
                this.outputChannel.appendLine(`      Line ${diag.range.start.line + 1}: ${diag.message}`);
            });
        }

        task.result = `Checked ${targetFile}: ${diagnostics.length} issues`;
    }

    private async handleVerification(task: AgentTask): Promise<void> {
        const targetFile = this.findLastCreatedFile();
        if (!targetFile) {
            this.outputChannel.appendLine(`   ⚠️  No file to verify`);
            task.result = 'No file to verify';
            return;
        }

        const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspaceRoot) {
            throw new Error('No workspace folder found');
        }

        const fullPath = path.join(workspaceRoot, targetFile);

        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n').length;
            const size = content.length;

            this.outputChannel.appendLine(`   ✅ File verified: ${targetFile}`);
            this.outputChannel.appendLine(`      Lines: ${lines}, Size: ${size} bytes`);

            task.result = `Verified ${targetFile}`;
        } else {
            // File doesn't exist but don't fail - just note it
            this.outputChannel.appendLine(`   ⚠️  File not found for verification: ${targetFile}`);
            task.result = `File not found: ${targetFile}`;
        }
    }

    private async handleGenericTask(task: AgentTask, _apiKey: string): Promise<void> {
        this.outputChannel.appendLine(`   ℹ️  Executing generic task...`);
        task.result = 'Completed';
    }

    private findLastCreatedFile(): string | null {
        if (!this.currentPlan) return null;

        for (let i = this.currentPlan.currentTaskIndex; i >= 0; i--) {
            const task = this.currentPlan.tasks[i];
            if (task.result && task.result.includes('.')) {
                return task.result;
            }
        }
        return null;
    }

    private async verifyResults(): Promise<void> {
        this.outputChannel.appendLine('\n🔍 Verifying results...\n');

        const completedTasks = this.currentPlan?.tasks.filter(t => t.status === 'completed') || [];
        const failedTasks = this.currentPlan?.tasks.filter(t => t.status === 'failed') || [];

        this.outputChannel.appendLine(`✅ Completed: ${completedTasks.length} tasks`);
        this.outputChannel.appendLine(`❌ Failed: ${failedTasks.length} tasks`);

        if (failedTasks.length > 0) {
            throw new Error(`${failedTasks.length} task(s) failed`);
        }
    }

    private showSuccess(): void {
        this.outputChannel.appendLine('\n' + '='.repeat(50));
        this.outputChannel.appendLine('🎉 SUCCESS! All tasks completed!');
        this.outputChannel.appendLine('='.repeat(50) + '\n');

        this.printChecklist();

        this.updateStatus('✅ Completed');
        vscode.window.showInformationMessage('🎉 Agent completed successfully!');

        // Hide status bar after 5 seconds
        setTimeout(() => {
            this.statusBarItem.hide();
        }, 5000);
    }

    private printChecklist(): void {
        if (!this.currentPlan) return;

        this.outputChannel.appendLine('\n📋 Progress Checklist:');
        this.currentPlan.tasks.forEach((task, index) => {
            const checkbox = task.status === 'completed' ? '✅' :
                task.status === 'failed' ? '❌' :
                    task.status === 'in-progress' ? '⏳' : '⬜';
            this.outputChannel.appendLine(`  ${checkbox} ${index + 1}. ${task.description}`);
        });
        this.outputChannel.appendLine('');
    }

    private updateStatus(message: string): void {
        this.statusBarItem.text = `$(robot) ${message}`;
        this.statusBarItem.show();
    }

    private async getApiKey(): Promise<string | null> {
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

    private async callLLM(apiKey: string, prompt: string): Promise<string> {
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
                        content: 'You are a helpful coding assistant. Be concise and precise.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 2000,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json() as any;
        return data.choices[0].message.content.trim();
    }

    public dispose(): void {
        this.outputChannel.dispose();
        this.statusBarItem.dispose();
    }
}
