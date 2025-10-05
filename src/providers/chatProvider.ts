import * as vscode from 'vscode';
import { PlanGenerator } from '../services/planGenerator';
import { WorkspaceScanner } from '../services/workspaceScanner';
import { CodeApplier } from '../services/codeApplier';

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  files?: string[];
  actions?: ChatAction[];
}

export interface ChatAction {
  id: string;
  label: string;
  command: string;
  args?: any[];
}

export class ChatProvider implements vscode.TreeDataProvider<ChatMessage> {
  private _onDidChangeTreeData: vscode.EventEmitter<ChatMessage | undefined | null | void> = new vscode.EventEmitter<ChatMessage | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ChatMessage | undefined | null | void> = this._onDidChangeTreeData.event;

  private messages: ChatMessage[] = [];
  private planGenerator: PlanGenerator;
  private workspaceScanner: WorkspaceScanner;
  private codeApplier: CodeApplier;
  private isAnalyzing: boolean = false;

  constructor() {
    this.planGenerator = new PlanGenerator();
    this.workspaceScanner = new WorkspaceScanner();
    this.codeApplier = new CodeApplier();
    
    // Add welcome message
    this.addSystemMessage("👋 Hi! I'm CodePlanr AI. I can help you plan and implement coding tasks. What would you like to work on?");
  }

  getTreeItem(element: ChatMessage): vscode.TreeItem {
    const item = new vscode.TreeItem(element.content, vscode.TreeItemCollapsibleState.None);
    
    if (element.type === 'user') {
      item.iconPath = new vscode.ThemeIcon('person');
      item.contextValue = 'userMessage';
    } else if (element.type === 'assistant') {
      item.iconPath = new vscode.ThemeIcon('robot');
      item.contextValue = 'assistantMessage';
    } else {
      item.iconPath = new vscode.ThemeIcon('info');
      item.contextValue = 'systemMessage';
    }

    if (element.files && element.files.length > 0) {
      item.description = `📁 ${element.files.length} files`;
    }

    if (element.actions && element.actions.length > 0) {
      item.description = `${item.description || ''} • ${element.actions.length} actions`;
    }

    return item;
  }

  getChildren(element?: ChatMessage): ChatMessage[] {
    if (!element) {
      return this.messages;
    }
    return [];
  }

  public async sendMessage(content: string): Promise<void> {
    // Add user message
    this.addUserMessage(content);

    // Check if API key is configured
    if (!this.planGenerator.isConfigured()) {
      this.addSystemMessage("⚠️ OpenAI API key not configured. Please set OPENAI_API_KEY environment variable or configure it in settings.");
      return;
    }

    // Show analyzing message
    this.addSystemMessage("🔍 Analyzing your workspace...");
    this.isAnalyzing = true;
    this.refresh();

    try {
      // Analyze workspace
      const relevantFiles = await this.workspaceScanner.scanRelevantFiles(content);
      
      // Show which files are being analyzed
      if (relevantFiles.length > 0) {
        const fileList = relevantFiles.slice(0, 5).map(f => f.path).join(', ');
        const moreFiles = relevantFiles.length > 5 ? ` and ${relevantFiles.length - 5} more files` : '';
        this.addSystemMessage(`📁 Analyzing ${relevantFiles.length} relevant files: ${fileList}${moreFiles}`);
      }

      // Generate plan
      this.addSystemMessage("🤖 Generating AI coding plan...");
      const plan = await this.planGenerator.generatePlan(content);

      // Add plan as assistant message
      this.addAssistantMessage(
        `## ${plan.title}\n\n${plan.description}\n\n**Estimated Time:** ${plan.estimatedTime}\n**Difficulty:** ${plan.difficulty}\n\n### Steps:\n${plan.steps.map((step, index) => `${index + 1}. **${step.title}**\n   - ${step.description}\n   - Files: ${step.files.join(', ')}`).join('\n\n')}`,
        plan.steps.flatMap(step => step.files),
        [
          {
            id: 'generate-code',
            label: '🤖 Generate Code',
            command: 'CodePlanr.generateCodeForPlan',
            args: [plan]
          },
          {
            id: 'apply-changes',
            label: '✅ Apply Changes',
            command: 'CodePlanr.applyPlanChanges',
            args: [plan]
          }
        ]
      );

    } catch (error) {
      this.addSystemMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.isAnalyzing = false;
      this.refresh();
    }
  }

  public async generateCodeForPlan(plan: any): Promise<void> {
    this.addSystemMessage("🔧 Generating code for each step...");
    
    try {
      for (const step of plan.steps) {
        this.addSystemMessage(`📝 Generating code for: ${step.title}`);
        
        // Generate code suggestions for this step
        const suggestions = await this.planGenerator.generateStepCodeSuggestions(step, []);
        
        if (suggestions.length > 0) {
          this.addAssistantMessage(
            `### Code for: ${step.title}\n\n\`\`\`typescript\n${suggestions.map(s => s.content).join('\n\n')}\n\`\`\``,
            suggestions.map(s => s.file),
            [
              {
                id: 'apply-step',
                label: '✅ Apply This Step',
                command: 'CodePlanr.applyStepChanges',
                args: [step, suggestions]
              }
            ]
          );
        }
      }
    } catch (error) {
      this.addSystemMessage(`❌ Error generating code: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async applyPlanChanges(plan: any): Promise<void> {
    this.addSystemMessage("🚀 Applying all changes from the plan...");
    
    try {
      for (const step of plan.steps) {
        this.addSystemMessage(`📝 Applying: ${step.title}`);
        
        if (step.codeChanges && step.codeChanges.length > 0) {
          await this.codeApplier.applyStepChanges(step, step.codeChanges);
          this.addSystemMessage(`✅ Applied: ${step.title}`);
        }
      }
      
      this.addSystemMessage("🎉 All changes applied successfully!");
    } catch (error) {
      this.addSystemMessage(`❌ Error applying changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async applyStepChanges(step: any, changes: any[]): Promise<void> {
    this.addSystemMessage(`📝 Applying changes for: ${step.title}`);
    
    try {
      await this.codeApplier.applyStepChanges(step, changes);
      this.addSystemMessage(`✅ Applied: ${step.title}`);
    } catch (error) {
      this.addSystemMessage(`❌ Error applying step: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private addUserMessage(content: string): void {
    const message: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    };
    this.messages.push(message);
    this.refresh();
  }

  private addAssistantMessage(content: string, files?: string[], actions?: ChatAction[]): void {
    const message: ChatMessage = {
      id: Date.now().toString(),
      type: 'assistant',
      content,
      timestamp: new Date(),
      files,
      actions
    };
    this.messages.push(message);
    this.refresh();
  }

  private addSystemMessage(content: string): void {
    const message: ChatMessage = {
      id: Date.now().toString(),
      type: 'system',
      content,
      timestamp: new Date()
    };
    this.messages.push(message);
    this.refresh();
  }

  private refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public clearChat(): void {
    this.messages = [];
    this.addSystemMessage("👋 Chat cleared. What would you like to work on?");
  }

  public getMessages(): ChatMessage[] {
    return this.messages;
  }
}
