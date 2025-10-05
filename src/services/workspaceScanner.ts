import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { glob } from 'glob';
import { WorkspaceFile } from './openaiService';

export class WorkspaceScanner {
  private readonly relevantExtensions = [
    '.ts', '.tsx', '.js', '.jsx', '.json', '.html', '.css', '.scss', '.vue', '.svelte'
  ];

  private readonly ignorePatterns = [
    'node_modules/**',
    '.git/**',
    'dist/**',
    'build/**',
    'coverage/**',
    '.vscode/**',
    '*.log',
    '*.tmp',
    '.DS_Store'
  ];

  public async scanWorkspace(): Promise<WorkspaceFile[]> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error('No workspace folder found');
    }

    const files: WorkspaceFile[] = [];
    
    try {
      // Get all relevant files using glob
      const pattern = this.buildGlobPattern();
      const filePaths = await glob(pattern, {
        cwd: workspaceRoot,
        ignore: this.ignorePatterns,
        absolute: true
      });

      // Process files in batches to avoid overwhelming the system
      const batchSize = 10;
      for (let i = 0; i < filePaths.length; i += batchSize) {
        const batch = filePaths.slice(i, i + batchSize);
        const batchPromises = batch.map(filePath => this.processFile(filePath, workspaceRoot));
        const batchResults = await Promise.all(batchPromises);
        files.push(...batchResults.filter(file => file !== null) as WorkspaceFile[]);
      }

      return files;
    } catch (error) {
      console.error('Error scanning workspace:', error);
      throw new Error(`Failed to scan workspace: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  public async scanRelevantFiles(task: string): Promise<WorkspaceFile[]> {
    const allFiles = await this.scanWorkspace();
    
    // Filter files based on task relevance
    const relevantFiles = allFiles.filter(file => 
      this.isFileRelevantToTask(file, task)
    );

    // Sort by relevance score
    return relevantFiles.sort((a, b) => 
      this.calculateRelevanceScore(b, task) - this.calculateRelevanceScore(a, task)
    ).slice(0, 20); // Limit to top 20 most relevant files
  }

  private buildGlobPattern(): string {
    const extensions = this.relevantExtensions.map(ext => `**/*${ext}`);
    return `{${extensions.join(',')}}`;
  }

  private async processFile(filePath: string, workspaceRoot: string): Promise<WorkspaceFile | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const relativePath = path.relative(workspaceRoot, filePath);
      const extension = path.extname(filePath).toLowerCase();
      
      return {
        path: relativePath,
        content,
        type: this.getFileType(extension)
      };
    } catch (error) {
      console.warn(`Failed to read file ${filePath}:`, error);
      return null;
    }
  }

  private getFileType(extension: string): WorkspaceFile['type'] {
    switch (extension) {
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
      case '.scss':
        return 'css';
      default:
        return 'other';
    }
  }

  private isFileRelevantToTask(file: WorkspaceFile, task: string): boolean {
    const taskKeywords = this.extractKeywords(task.toLowerCase());
    const filePath = file.path.toLowerCase();
    const content = file.content.toLowerCase();

    // Check if file path contains relevant keywords
    const pathRelevance = taskKeywords.some(keyword => filePath.includes(keyword));
    
    // Check if file content contains relevant keywords
    const contentRelevance = taskKeywords.some(keyword => content.includes(keyword));

    // Check for common patterns
    const hasCommonPatterns = this.hasCommonPatterns(file, task);

    return pathRelevance || contentRelevance || hasCommonPatterns;
  }

  private extractKeywords(task: string): string[] {
    // Extract meaningful keywords from the task
    const words = task.split(/\s+/)
      .filter(word => word.length > 2)
      .map(word => word.replace(/[^\w]/g, ''))
      .filter(word => !this.isCommonWord(word));

    return words;
  }

  private isCommonWord(word: string): boolean {
    const commonWords = [
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'from', 'up', 'about', 'into', 'through', 'during', 'before',
      'after', 'above', 'below', 'between', 'among', 'add', 'create', 'make',
      'build', 'implement', 'feature', 'function', 'component', 'page'
    ];
    return commonWords.includes(word.toLowerCase());
  }

  private hasCommonPatterns(file: WorkspaceFile, task: string): boolean {
    const taskLower = task.toLowerCase();
    
    // Check for common development patterns
    if (taskLower.includes('login') || taskLower.includes('auth')) {
      return file.path.includes('auth') || 
             file.path.includes('login') || 
             file.path.includes('user') ||
             file.content.includes('authentication') ||
             file.content.includes('login');
    }

    if (taskLower.includes('api') || taskLower.includes('endpoint')) {
      return file.path.includes('api') || 
             file.path.includes('route') || 
             file.path.includes('controller') ||
             file.content.includes('router') ||
             file.content.includes('endpoint');
    }

    if (taskLower.includes('database') || taskLower.includes('db')) {
      return file.path.includes('model') || 
             file.path.includes('schema') || 
             file.path.includes('migration') ||
             file.content.includes('database') ||
             file.content.includes('model');
    }

    if (taskLower.includes('ui') || taskLower.includes('component')) {
      return file.path.includes('component') || 
             file.path.includes('ui') || 
             file.path.includes('view') ||
             file.content.includes('component') ||
             file.content.includes('render');
    }

    return false;
  }

  private calculateRelevanceScore(file: WorkspaceFile, task: string): number {
    let score = 0;
    const taskKeywords = this.extractKeywords(task.toLowerCase());
    const filePath = file.path.toLowerCase();
    const content = file.content.toLowerCase();

    // Path relevance (higher weight)
    taskKeywords.forEach(keyword => {
      if (filePath.includes(keyword)) {
        score += 3;
      }
    });

    // Content relevance
    taskKeywords.forEach(keyword => {
      const matches = (content.match(new RegExp(keyword, 'g')) || []).length;
      score += matches;
    });

    // File type relevance
    if (file.type === 'typescript' || file.type === 'javascript') {
      score += 2;
    }

    // Common patterns
    if (this.hasCommonPatterns(file, task)) {
      score += 5;
    }

    return score;
  }

  public async getFileContent(filePath: string): Promise<string> {
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) {
      throw new Error('No workspace folder found');
    }

    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(workspaceRoot, filePath);
    
    try {
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
