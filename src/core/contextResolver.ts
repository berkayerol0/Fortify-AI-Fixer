import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { Vulnerability } from './group';

export interface CodeContext {
    filePath: string;
    language: string;
    content: string;
}

async function findFileInWorkspace(fileName: string, workspaceRoot: string): Promise<string | null> {
    const files = await vscode.workspace.findFiles(`**/${fileName}`, '**/node_modules/**', 1);
    return files.length > 0 ? files[0].fsPath : null;
}

async function findRelatedFilePaths(mainFileContent: string, workspaceRoot: string): Promise<string[]> {
    const relatedFilePaths: string[] = [];
    const importRegex = /import\s+org\.example\.kutuphaneotomasyon\.(repository|service)\.([A-Za-z]+);/g;
    let match;
    const promises: Promise<string | null>[] = [];

    while ((match = importRegex.exec(mainFileContent)) !== null) {
        const className = match[2];
        const fileName = `${className}.java`;
        promises.push(findFileInWorkspace(fileName, workspaceRoot));
    }

    const results = await Promise.all(promises);
    return results.filter((p): p is string => p !== null);
}

export async function getFullCodeContext(vulnerability: Vulnerability, workspaceRoot: string): Promise<CodeContext[]> {
    const allContexts: CodeContext[] = [];

    allContexts.push({
        filePath: vulnerability.filePath,
        language: vulnerability.language,
        content: vulnerability.fullFileContent
    });

    const relatedFilePaths = await findRelatedFilePaths(vulnerability.fullFileContent, workspaceRoot);

    for (const fullPath of relatedFilePaths) {
        try {
            const content = await vscode.workspace.fs.readFile(vscode.Uri.file(fullPath));
            const relativePath = path.relative(workspaceRoot, fullPath).replace(/\\/g, '/');
            allContexts.push({
                filePath: relativePath,
                language: 'java',
                content: Buffer.from(content).toString('utf-8')
            });
        } catch (error) {
            console.error(`İlişkili dosya okunamadı: ${fullPath}`, error);
        }
    }

    return allContexts;
}