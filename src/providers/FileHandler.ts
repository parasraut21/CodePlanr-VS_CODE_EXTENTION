import * as vscode from 'vscode';
import * as fs from 'fs';

/**
 * Handles file operations like upload, open, copy
 */
export class FileHandler {
    public async handleFileUpload(): Promise<{ fileName: string; filePath: string; content: string } | null> {
        const options: vscode.OpenDialogOptions = {
            canSelectMany: false,
            openLabel: 'Upload File',
            filters: {
                'All Files': ['*'],
                'Images': ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'svg'],
                'Documents': ['txt', 'md', 'pdf', 'doc', 'docx'],
                'Code': ['js', 'ts', 'py', 'java', 'cpp', 'c', 'cs', 'go', 'rs']
            }
        };

        const fileUri = await vscode.window.showOpenDialog(options);
        
        if (fileUri && fileUri[0]) {
            const filePath = fileUri[0].fsPath;
            const fileName = fileUri[0].fsPath.split(/[\\/]/).pop() || 'file';
            
            try {
                const stats = fs.statSync(filePath);
                if (stats.size > 10 * 1024 * 1024) {
                    vscode.window.showErrorMessage('File is too large. Maximum size is 10MB.');
                    return null;
                }

                const fileContent = fs.readFileSync(filePath, 'utf8');
                
                vscode.window.showInformationMessage(`File uploaded: ${fileName}`);
                
                return {
                    fileName: fileName,
                    filePath: filePath,
                    content: fileContent.substring(0, 5000)
                };
            } catch (error) {
                vscode.window.showErrorMessage(`Failed to read file: ${error}`);
                return null;
            }
        }
        
        return null;
    }

    public async handleOpenFile(filePath: string): Promise<void> {
        const uri = vscode.Uri.file(filePath);
        const doc = await vscode.workspace.openTextDocument(uri);
        await vscode.window.showTextDocument(doc);
    }

    public async handleCopyCode(code: string): Promise<void> {
        await vscode.env.clipboard.writeText(code);
        vscode.window.showInformationMessage('Code copied to clipboard');
    }

    public async handleExportPlan(planText: string): Promise<void> {
        const doc = await vscode.workspace.openTextDocument({ 
            content: planText, 
            language: 'markdown' 
        });
        await vscode.window.showTextDocument(doc);
    }
}
