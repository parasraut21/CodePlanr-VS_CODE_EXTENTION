import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { CodeChange, PlanStep } from './openaiService';
import { WorkspaceScanner } from './workspaceScanner';

export class CodeApplier {
  private workspaceScanner: WorkspaceScanner;

  constructor() {
    this.workspaceScanner = new WorkspaceScanner();
  }

  public async applyStepChanges(
    step: PlanStep,
    changes: CodeChange[]
  ): Promise<void> {
    if (changes.length === 0) {
      vscode.window.showInformationMessage('No changes to apply for this step.');
      return;
    }

    // Show confirmation dialog
    const confirmMessage = `Apply ${changes.length} changes for step: ${step.title}?`;
    const userChoice = await vscode.window.showWarningMessage(
      confirmMessage,
      { modal: true },
      'Apply Changes',
      'Review Changes',
      'Cancel'
    );

    if (userChoice === 'Cancel') {
      return;
    }

    if (userChoice === 'Review Changes') {
      await this.showChangesReview(step, changes);
      return;
    }

    // Apply changes
    await this.executeChanges(changes);
  }

  public async showChangesReview(
    step: PlanStep,
    changes: CodeChange[]
  ): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      'codePlanrReview',
      `Review Changes - ${step.title}`,
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    const html = this.generateReviewHtml(step, changes);
    panel.webview.html = html;

    panel.webview.onDidReceiveMessage(async message => {
      switch (message.command) {
        case 'applyChanges':
          await this.executeChanges(changes);
          panel.dispose();
          break;
        case 'cancel':
          panel.dispose();
          break;
        case 'previewFile':
          await this.previewFile(message.filePath, message.content);
          break;
      }
    });
  }

  private generateReviewHtml(step: PlanStep, changes: CodeChange[]): string {
    const changesHtml = changes.map(change => this.generateChangeHtml(change)).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Review Changes</title>
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
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 10px;
            color: var(--vscode-textLink-foreground);
        }
        .change {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .change-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        .change-title {
            font-size: 16px;
            font-weight: 600;
            color: var(--vscode-textLink-foreground);
        }
        .change-action {
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .action-create {
            background: #d4edda;
            color: #155724;
        }
        .action-modify {
            background: #fff3cd;
            color: #856404;
        }
        .action-delete {
            background: #f8d7da;
            color: #721c24;
        }
        .change-description {
            color: var(--vscode-descriptionForeground);
            margin-bottom: 15px;
        }
        .code-preview {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            padding: 15px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            white-space: pre-wrap;
            max-height: 200px;
            overflow-y: auto;
        }
        .actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-panel-border);
        }
        .btn {
            padding: 10px 20px;
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
    </style>
</head>
<body>
    <div class="header">
        <h1 class="title">Review Changes</h1>
        <p>Step: ${step.title}</p>
    </div>

    <div class="changes">
        ${changesHtml}
    </div>

    <div class="actions">
        <button class="btn btn-primary" onclick="applyChanges()">
            ✅ Apply All Changes
        </button>
        <button class="btn btn-secondary" onclick="cancel()">
            ❌ Cancel
        </button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function applyChanges() {
            vscode.postMessage({
                command: 'applyChanges'
            });
        }

        function cancel() {
            vscode.postMessage({
                command: 'cancel'
            });
        }

        function previewFile(filePath, content) {
            vscode.postMessage({
                command: 'previewFile',
                filePath: filePath,
                content: content
            });
        }
    </script>
</body>
</html>`;
  }

  private generateChangeHtml(change: CodeChange): string {
    const actionClass = `action-${change.action}`;
    const actionText = change.action.charAt(0).toUpperCase() + change.action.slice(1);

    return `
    <div class="change">
        <div class="change-header">
            <div class="change-title">${change.file}</div>
            <div class="change-action ${actionClass}">${actionText}</div>
        </div>
        <div class="change-description">${change.description}</div>
        ${change.content ? `
        <div class="code-preview" onclick="previewFile('${change.file}', \`${change.content.replace(/`/g, '\\`')}\`)">
${change.content}
        </div>
        ` : ''}
    </div>`;
  }

  private async previewFile(filePath: string, content: string): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceRoot) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    const fullPath = vscode.Uri.joinPath(workspaceRoot.uri, filePath);
    
    try {
      // Create a temporary document to preview the content
      const document = await vscode.workspace.openTextDocument({
        content: content,
        language: this.getLanguageFromFile(filePath)
      });
      await vscode.window.showTextDocument(document, { preview: true });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to preview file: ${filePath}`);
    }
  }

  private getLanguageFromFile(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.ts':
      case '.tsx':
        return 'typescript';
      case '.js':
      case '.jsx':
        return 'javascript';
      case '.json':
        return 'json';
      case '.html':
        return 'html';
      case '.css':
        return 'css';
      case '.scss':
        return 'scss';
      default:
        return 'plaintext';
    }
  }

  private async executeChanges(changes: CodeChange[]): Promise<void> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceRoot) {
      throw new Error('No workspace folder found');
    }

    const results: string[] = [];

    for (const change of changes) {
      try {
        const fullPath = vscode.Uri.joinPath(workspaceRoot.uri, change.file);
        const filePath = fullPath.fsPath;

        switch (change.action) {
          case 'create':
            await this.createFile(filePath, change.content || '');
            results.push(`✅ Created: ${change.file}`);
            break;

          case 'modify':
            await this.modifyFile(filePath, change.content || '', change.lineNumber);
            results.push(`✅ Modified: ${change.file}`);
            break;

          case 'delete':
            await this.deleteFile(filePath);
            results.push(`✅ Deleted: ${change.file}`);
            break;
        }
      } catch (error) {
        results.push(`❌ Failed to ${change.action} ${change.file}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Show results
    const successCount = results.filter(r => r.startsWith('✅')).length;
    const failCount = results.filter(r => r.startsWith('❌')).length;

    if (failCount === 0) {
      vscode.window.showInformationMessage(`Successfully applied ${successCount} changes!`);
    } else {
      vscode.window.showWarningMessage(`Applied ${successCount} changes, ${failCount} failed. Check the output for details.`);
    }

    // Log detailed results
    console.log('CodePlanr - Change Results:', results);
  }

  private async createFile(filePath: string, content: string): Promise<void> {
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
  }

  private async modifyFile(filePath: string, content: string, lineNumber?: number): Promise<void> {
    if (!await fs.pathExists(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    const existingContent = await fs.readFile(filePath, 'utf-8');
    
    if (lineNumber && lineNumber > 0) {
      // Insert at specific line
      const lines = existingContent.split('\n');
      lines.splice(lineNumber - 1, 0, content);
      await fs.writeFile(filePath, lines.join('\n'), 'utf-8');
    } else {
      // Append to file
      await fs.writeFile(filePath, existingContent + '\n' + content, 'utf-8');
    }
  }

  private async deleteFile(filePath: string): Promise<void> {
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    }
  }
}
