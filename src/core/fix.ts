import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs/promises'; 

export async function applyMultipleFixes(
    codeBlocks: Map<string, string>,
    workspaceRoot: string
): Promise<vscode.TextDocument[]> {

    const affectedDocuments: vscode.TextDocument[] = [];

    const writePromises = Array.from(codeBlocks.entries()).map(async ([relativeFilePath, newCode]) => {
        const fullPath = path.resolve(workspaceRoot, relativeFilePath);
        try {
            await fs.writeFile(fullPath, newCode, 'utf-8');

            const openDocument = vscode.workspace.textDocuments.find(doc => doc.uri.fsPath === fullPath);
            if (openDocument) {
                affectedDocuments.push(openDocument);
            }
        } catch (error: any) {
            throw new Error(`Dosyaya yazma işlemi başarısız oldu: ${relativeFilePath}. Hata: ${error.message}`);
        }
    });

    try {
        await Promise.all(writePromises);
    } catch (error) {
        throw error;
    }

    return affectedDocuments;
}