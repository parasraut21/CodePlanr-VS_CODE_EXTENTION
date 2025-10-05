import * as vscode from 'vscode';
import { CodePlan, PlanStep } from './openaiService';

export class MarkdownViewer {
  private panel: vscode.WebviewPanel | undefined;
  private plan: CodePlan | undefined;

  public showPlan(plan: CodePlan): void {
    this.plan = plan;
    
    if (this.panel) {
      this.panel.reveal();
    } else {
      this.panel = vscode.window.createWebviewPanel(
        'codePlanr',
        'CodePlanr - AI Coding Plan',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true
        }
      );

      this.panel.onDidDispose(() => {
        this.panel = undefined;
      });

      this.panel.webview.onDidReceiveMessage(
        message => {
          switch (message.command) {
            case 'openFile':
              this.openFile(message.filePath);
              break;
            case 'applyStep':
              this.applyStep(message.stepId);
              break;
            case 'generateCode':
              this.generateCodeForStep(message.stepId);
              break;
          }
        }
      );
    }

    this.updateContent();
  }

  private updateContent(): void {
    if (!this.panel || !this.plan) return;

    const html = this.generateHtml();
    this.panel.webview.html = html;
  }

  private generateHtml(): string {
    if (!this.plan) return '';

    const stepsHtml = this.plan.steps
      .sort((a, b) => a.order - b.order)
      .map(step => this.generateStepHtml(step))
      .join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CodePlanr - AI Coding Plan</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
        }
        .header {
            border-bottom: 2px solid var(--vscode-panel-border);
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .title {
            font-size: 28px;
            font-weight: 600;
            margin-bottom: 10px;
            color: var(--vscode-textLink-foreground);
        }
        .description {
            font-size: 16px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 15px;
        }
        .meta-info {
            display: flex;
            gap: 20px;
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
        }
        .meta-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        .step {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            transition: all 0.2s ease;
        }
        .step:hover {
            border-color: var(--vscode-focusBorder);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .step-header {
            display: flex;
            justify-content: between;
            align-items: flex-start;
            margin-bottom: 15px;
        }
        .step-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--vscode-textLink-foreground);
        }
        .step-description {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 15px;
        }
        .step-files {
            margin-bottom: 15px;
        }
        .files-label {
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--vscode-textPreformat-foreground);
        }
        .file-list {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }
        .file-tag {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            transition: background-color 0.2s ease;
        }
        .file-tag:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .step-actions {
            display: flex;
            gap: 10px;
            margin-top: 15px;
        }
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .btn-primary:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .difficulty-badge {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .difficulty-easy {
            background: #d4edda;
            color: #155724;
        }
        .difficulty-medium {
            background: #fff3cd;
            color: #856404;
        }
        .difficulty-hard {
            background: #f8d7da;
            color: #721c24;
        }
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
            color: var(--vscode-descriptionForeground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">${this.plan.title}</h1>
        <p class="description">${this.plan.description}</p>
        <div class="meta-info">
            <div class="meta-item">
                <span>⏱️</span>
                <span>Estimated Time: ${this.plan.estimatedTime}</span>
            </div>
            <div class="meta-item">
                <span>📊</span>
                <span class="difficulty-badge difficulty-${this.plan.difficulty.toLowerCase()}">${this.plan.difficulty}</span>
            </div>
        </div>
    </div>

    <div class="steps">
        ${stepsHtml}
    </div>

    <div class="loading" id="loading">
        <p>Generating code suggestions...</p>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function openFile(filePath) {
            vscode.postMessage({
                command: 'openFile',
                filePath: filePath
            });
        }

        function generateCode(stepId) {
            document.getElementById('loading').style.display = 'block';
            vscode.postMessage({
                command: 'generateCode',
                stepId: stepId
            });
        }

        function applyStep(stepId) {
            vscode.postMessage({
                command: 'applyStep',
                stepId: stepId
            });
        }
    </script>
</body>
</html>`;
  }

  private generateStepHtml(step: PlanStep): string {
    const filesHtml = step.files
      .map(file => `<span class="file-tag" onclick="openFile('${file}')">${file}</span>`)
      .join('');

    return `
    <div class="step">
        <div class="step-header">
            <div>
                <h3 class="step-title">Step ${step.order}: ${step.title}</h3>
                <p class="step-description">${step.description}</p>
            </div>
        </div>
        
        <div class="step-files">
            <div class="files-label">Files to modify:</div>
            <div class="file-list">
                ${filesHtml}
            </div>
        </div>
        
        <div class="step-actions">
            <button class="btn btn-primary" onclick="generateCode('${step.id}')">
                🤖 Generate Code
            </button>
            <button class="btn btn-secondary" onclick="applyStep('${step.id}')">
                ✅ Apply Changes
            </button>
        </div>
    </div>`;
  }

  private async openFile(filePath: string): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    const fullPath = vscode.Uri.joinPath(workspaceRoot.uri, filePath);
    
    try {
      const document = await vscode.workspace.openTextDocument(fullPath);
      await vscode.window.showTextDocument(document);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${filePath}`);
    }
  }

  private async applyStep(stepId: string): Promise<void> {
    if (!this.plan) return;

    const step = this.plan.steps.find(s => s.id === stepId);
    if (!step) return;

    vscode.window.showInformationMessage(`Applying step: ${step.title}`);
    // This will be handled by the main extension
  }

  private async generateCodeForStep(stepId: string): Promise<void> {
    if (!this.plan) return;

    const step = this.plan.steps.find(s => s.id === stepId);
    if (!step) return;

    vscode.window.showInformationMessage(`Generating code for step: ${step.title}`);
    // This will be handled by the main extension
  }
}
