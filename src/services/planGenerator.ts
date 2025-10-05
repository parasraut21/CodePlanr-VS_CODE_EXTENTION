import * as vscode from 'vscode';
import { OpenAIService, CodePlan, WorkspaceFile } from './openaiService';
import { WorkspaceScanner } from './workspaceScanner';

export class PlanGenerator {
  private openaiService: OpenAIService;
  private workspaceScanner: WorkspaceScanner;

  constructor() {
    this.openaiService = new OpenAIService();
    this.workspaceScanner = new WorkspaceScanner();
  }

  public async generatePlan(task: string): Promise<CodePlan> {
    try {
      // Show progress notification
      await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "CodePlanr",
        cancellable: false
      }, async (progress) => {
        progress.report({ message: "Scanning workspace..." });
        
        // Scan workspace for relevant files
        const relevantFiles = await this.workspaceScanner.scanRelevantFiles(task);
        
        progress.report({ message: "Analyzing codebase..." });
        
        // Generate plan using OpenAI
        const plan = await this.openaiService.generateCodePlan(task, relevantFiles);
        
        progress.report({ message: "Plan generated successfully!" });
        
        return plan;
      });

      // Get the plan (the progress callback doesn't return the value)
      const relevantFiles = await this.workspaceScanner.scanRelevantFiles(task);
      return await this.openaiService.generateCodePlan(task, relevantFiles);
    } catch (error) {
      console.error('Error generating plan:', error);
      throw error;
    }
  }

  public async generateStepCodeSuggestions(
    step: any,
    workspaceFiles: WorkspaceFile[]
  ): Promise<any[]> {
    try {
      const suggestions: any[] = [];
      
      for (const filePath of step.files) {
        const file = workspaceFiles.find(f => f.path === filePath);
        if (!file) {
          // File doesn't exist, might need to be created
          const context = this.buildContextForFile(workspaceFiles, filePath);
          const changes = await this.openaiService.generateCodeSuggestions(
            step,
            '', // Empty content for new files
            context
          );
          suggestions.push(...changes);
        } else {
          // File exists, generate modifications
          const context = this.buildContextForFile(workspaceFiles, filePath);
          const changes = await this.openaiService.generateCodeSuggestions(
            step,
            file.content,
            context
          );
          suggestions.push(...changes);
        }
      }
      
      return suggestions;
    } catch (error) {
      console.error('Error generating step suggestions:', error);
      throw error;
    }
  }

  private buildContextForFile(workspaceFiles: WorkspaceFile[], targetFile: string): string {
    const relatedFiles = workspaceFiles
      .filter(file => this.isRelatedFile(file.path, targetFile))
      .slice(0, 5) // Limit to 5 related files
      .map(file => `File: ${file.path}\n${file.content.substring(0, 500)}...`)
      .join('\n\n');

    return `Related files in workspace:\n${relatedFiles}`;
  }

  private isRelatedFile(filePath: string, targetFile: string): boolean {
    const targetDir = targetFile.split('/').slice(0, -1).join('/');
    const fileDir = filePath.split('/').slice(0, -1).join('/');
    
    // Same directory
    if (targetDir === fileDir) return true;
    
    // Parent/child directory relationship
    if (targetDir.startsWith(fileDir) || fileDir.startsWith(targetDir)) return true;
    
    // Same file type
    const targetExt = targetFile.split('.').pop();
    const fileExt = filePath.split('.').pop();
    if (targetExt === fileExt) return true;
    
    return false;
  }

  public isConfigured(): boolean {
    return this.openaiService.isConfigured();
  }

  public async setApiKey(apiKey: string): Promise<void> {
    await this.openaiService.setApiKey(apiKey);
  }

  public async configureApiKey(): Promise<void> {
    const apiKey = await vscode.window.showInputBox({
      prompt: 'Enter your OpenAI API Key',
      placeHolder: 'sk-...',
      password: true,
      validateInput: (value) => {
        if (!value || !value.startsWith('sk-')) {
          return 'Please enter a valid OpenAI API key starting with "sk-"';
        }
        return null;
      }
    });

    if (apiKey) {
      await this.openaiService.setApiKey(apiKey);
      vscode.window.showInformationMessage('OpenAI API key configured successfully!');
    }
  }
}
