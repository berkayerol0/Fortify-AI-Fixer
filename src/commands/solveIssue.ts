import * as vscode from 'vscode';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { VulnerabilityTreeItem } from '../tree/FortifyTreeItem';
import { generateChosenIssuePrompt } from '../prompts/chosenIssuePrompt';
import { callAIApiForFix, ParsedAIResponse } from '../api/gemini';
import { applyMultipleFixes } from '../core/fix';
import { offerToRunBuild } from '../core/build';
import { askToCommitAllChanges } from '../git';
import { createIssueId, ExtensionStorage } from '../core/storage';
import { Vulnerability } from '../core/group';
import { getFullCodeContext } from '../core/contextResolver';

export async function solveIssue(
    treeItem: VulnerabilityTreeItem, 
    workspaceRoot: string,
    storage: ExtensionStorage
): Promise<boolean> {
    if (!treeItem || !treeItem.vulnerability) {
        vscode.window.showErrorMessage('Düzeltilecek bir sorun seçilmedi.');
        return false;
    }
    const vulnerability = treeItem.vulnerability;
    let tempFileUri: vscode.Uri | undefined;

    try {
        // --- DEĞİŞİKLİK BURADA BAŞLIYOR ---
        // 1. Sadece bir dosya yerine, tüm ilişkili dosyaların içeriğini topla.
        const allContexts = await getFullCodeContext(vulnerability, workspaceRoot);

        // 2. Bu toplanan bağlam listesiyle prompt'u oluştur.
        const prompt = generateChosenIssuePrompt(vulnerability, allContexts);
        // --- DEĞİŞİKLİK BİTTİ ---
        
        let aiResponse: ParsedAIResponse | undefined;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `AI, "${vulnerability.category}" sorununa çözüm arıyor...`,
            cancellable: true,
        }, async (progress, token) => {
            const apiKey = vscode.workspace.getConfiguration('fortify-plugin-deneme1').get<string>('geminiApiKey');
            if (!apiKey) { throw new Error("Gemini API anahtarı bulunamadı. Lütfen ayarlardan girin."); }
            aiResponse = await callAIApiForFix(prompt, apiKey);
            if (token.isCancellationRequested) { aiResponse = undefined; }
        });
        if (!aiResponse) { return false; }

        const mainFilePath = aiResponse.codeBlocks.keys().next().value;
        if (mainFilePath) {
            const originalUri = vscode.Uri.file(path.resolve(workspaceRoot, vulnerability.filePath));
            const fixedContent = aiResponse.codeBlocks.get(mainFilePath) ?? '';
            const tempDir = os.tmpdir();
            const tempFilePath = path.join(tempDir, `fixed-${path.basename(mainFilePath)}`);
            fs.writeFileSync(tempFilePath, fixedContent);
            tempFileUri = vscode.Uri.file(tempFilePath);
            await vscode.commands.executeCommand('vscode.diff', originalUri, tempFileUri, `Öneri: ${path.basename(mainFilePath)} (SOL: Mevcut, SAĞ: AI Önerisi)`);
        }
        const userChoice = await vscode.window.showInformationMessage(
            `AI bir çözüm önerdi. Değişiklikleri uygulamak istiyor musunuz? (${aiResponse.codeBlocks.size} dosya etkilenecek)`,
            { modal: true, detail: `AI Description: ${aiResponse.explanation}` }, 'Değişiklikleri Uygula'
        );
        if (userChoice === 'Değişiklikleri Uygula') {
            const affectedDocuments = await applyMultipleFixes(aiResponse.codeBlocks, workspaceRoot);
            vscode.window.showInformationMessage(`✅ Düzeltme başarıyla ${affectedDocuments.length} dosyaya uygulandı.`);
            
            const issueId = createIssueId(vulnerability);
            await storage.addFixedIssue(issueId);

            vscode.commands.executeCommand('fortify-plugin-deneme1.refreshIssues');
        
            await offerToRunBuild(workspaceRoot);
            await askToCommitAllChanges(`fix(security): Fortify AI ile ${vulnerability.category} sorunu düzeltildi`);
            return true;
        }
        return false;
    } catch (error: any) {
        vscode.window.showErrorMessage(`❌ Düzeltme işlemi başarısız oldu: ${error.message}`);
        return false;
    } finally {
        if (tempFileUri) { fs.unlinkSync(tempFileUri.fsPath); }
    }
}