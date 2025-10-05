import OpenAI from 'openai';
import * as vscode from 'vscode';

export interface CodePlan {
  title: string;
  description: string;
  steps: PlanStep[];
  estimatedTime: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface PlanStep {
  id: string;
  title: string;
  description: string;
  files: string[];
  codeChanges?: CodeChange[];
  order: number;
}

export interface CodeChange {
  file: string;
  action: 'create' | 'modify' | 'delete';
  content?: string;
  lineNumber?: number;
  description: string;
}

export class OpenAIService {
  private client: OpenAI | null = null;
  private apiKey: string | undefined;

  constructor() {
    this.loadApiKey();
  }

  private loadApiKey(): void {
    const config = vscode.workspace.getConfiguration('CodePlanr');
    this.apiKey = config.get<string>('openaiApiKey');
    
    if (this.apiKey) {
      this.client = new OpenAI({
        apiKey: this.apiKey,
      });
    }
  }

  public async setApiKey(apiKey: string): Promise<void> {
    const config = vscode.workspace.getConfiguration('CodePlanr');
    await config.update('openaiApiKey', apiKey, vscode.ConfigurationTarget.Global);
    this.apiKey = apiKey;
    this.client = new OpenAI({
      apiKey: this.apiKey,
    });
  }

  public isConfigured(): boolean {
    return this.client !== null && this.apiKey !== undefined;
  }

  public async generateCodePlan(
    task: string,
    workspaceFiles: WorkspaceFile[]
  ): Promise<CodePlan> {
    if (!this.client) {
      throw new Error('OpenAI client not configured. Please set your API key.');
    }

    const workspaceContext = this.buildWorkspaceContext(workspaceFiles);
    
    const prompt = `
You are an expert software architect and developer. Generate a detailed coding plan for the following task:

TASK: ${task}

WORKSPACE CONTEXT:
${workspaceContext}

Please provide a comprehensive plan that includes:
1. A clear title and description
2. Step-by-step implementation plan
3. Files that need to be created or modified
4. Estimated time and difficulty level
5. Specific code changes for each step

Format your response as a JSON object with the following structure:
{
  "title": "Plan title",
  "description": "Detailed description of what will be implemented",
  "steps": [
    {
      "id": "step-1",
      "title": "Step title",
      "description": "What this step accomplishes",
      "files": ["file1.ts", "file2.ts"],
      "order": 1,
      "codeChanges": [
        {
          "file": "file1.ts",
          "action": "create|modify|delete",
          "content": "code content if creating/modifying",
          "lineNumber": 10,
          "description": "What this change does"
        }
      ]
    }
  ],
  "estimatedTime": "2-3 hours",
  "difficulty": "Medium"
}

Focus on practical, implementable steps that work with the existing codebase structure.
`;

    try {
      const completion = await this.client.chat.completions.create({
        model: vscode.workspace.getConfiguration('CodePlanr').get('model', 'gpt-4o'),
        messages: [
          {
            role: 'system',
            content: 'You are an expert software architect who creates detailed, practical coding plans. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      // Parse the JSON response
      const planData = JSON.parse(response);
      return planData as CodePlan;
    } catch (error) {
      console.error('Error generating code plan:', error);
      throw new Error(`Failed to generate code plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async generateCodeSuggestions(
    step: PlanStep,
    currentFileContent: string,
    context: string
  ): Promise<CodeChange[]> {
    if (!this.client) {
      throw new Error('OpenAI client not configured. Please set your API key.');
    }

    const prompt = `
You are an expert developer. Generate specific code changes for the following step:

STEP: ${step.title}
DESCRIPTION: ${step.description}
FILES TO MODIFY: ${step.files.join(', ')}

CURRENT FILE CONTENT:
${currentFileContent}

ADDITIONAL CONTEXT:
${context}

Provide specific code changes as an array of objects with this structure:
[
  {
    "file": "filename.ts",
    "action": "create|modify|delete",
    "content": "exact code to add/modify",
    "lineNumber": 10,
    "description": "What this change accomplishes"
  }
]

Focus on:
- Exact code that can be directly applied
- Proper imports and dependencies
- Following existing code patterns
- Type safety and best practices
`;

    try {
      const completion = await this.client.chat.completions.create({
        model: vscode.workspace.getConfiguration('CodePlanr').get('model', 'gpt-4o'),
        messages: [
          {
            role: 'system',
            content: 'You are an expert developer who generates precise, implementable code changes. Always respond with valid JSON array.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2,
        max_tokens: 2000,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response from OpenAI');
      }

      const changes = JSON.parse(response);
      return changes as CodeChange[];
    } catch (error) {
      console.error('Error generating code suggestions:', error);
      throw new Error(`Failed to generate code suggestions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private buildWorkspaceContext(files: WorkspaceFile[]): string {
    return files
      .map(file => `File: ${file.path}\n${file.content.substring(0, 1000)}${file.content.length > 1000 ? '...' : ''}`)
      .join('\n\n');
  }
}

export interface WorkspaceFile {
  path: string;
  content: string;
  type: 'typescript' | 'javascript' | 'json' | 'html' | 'css' | 'other';
}
