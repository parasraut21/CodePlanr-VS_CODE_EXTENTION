import * as vscode from 'vscode';
import * as fs from 'fs';
import { FILE_SIZE_LIMIT, FILE_CONTENT_PREVIEW_LIMIT } from './constants';

export interface FileUploadResult {
    fileName: string;
    filePath: string;
    content: string;
}

export async function selectAndReadFile(): Promise<FileUploadResult | null> {
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
    
    if (!fileUri || !fileUri[0]) {
        return null;
    }

    const filePath = fileUri[0].fsPath;
    const fileName = filePath.split(/[\\/]/).pop() || 'file';

    const stats = fs.statSync(filePath);
    if (stats.size > FILE_SIZE_LIMIT) {
        throw new Error('File is too large. Maximum size is 10MB.');
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    return {
        fileName,
        filePath,
        content: fileContent.substring(0, FILE_CONTENT_PREVIEW_LIMIT)
    };
}

export async function openFileInEditor(filePath: string): Promise<void> {
    const uri = vscode.Uri.file(filePath);
    const doc = await vscode.workspace.openTextDocument(uri);
    await vscode.window.showTextDocument(doc);
}
