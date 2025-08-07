import * as vscode from 'vscode';
import { FortifyTreeDataProvider } from '../tree/FortifyTreeDataProvider';
import { generateChosenIssuePrompt } from '../prompts/chosenIssuePrompt';
import { callAIApiForFix } from '../api/gemini';
import { applyMultipleFixes } from '../core/fix';
import { askToCommitAllChanges } from '../git';
import { Vulnerability } from '../core/group';
import { offerToRunBuild } from '../core/build';
import { createIssueId, ExtensionStorage } from '../core/storage';
import { getFullCodeContext, CodeContext } from '../core/contextResolver'; // Yeni importlar

export async function solveAllIssues(
    provider: FortifyTreeDataProvider, 
    workspaceRoot: string,
    storage: ExtensionStorage,
    severityToFix?: Vulnerability['severity'] 
) {
    const vulnerabilitiesToFix = provider.getVulnerabilitiesToFix(severityToFix);
    const severityName = severityToFix || 'Tüm';

    if (vulnerabilitiesToFix.length === 0) {
        const message = `Düzeltilecek yeni ("${severityName}") sorun bulunamadı. (Daha önce düzeltilenler ve False Positive'ler atlandı)`;
        vscode.window.showInformationMessage(message);
        return;
    }

    const choice = await vscode.window.showWarningMessage(
        `Toplam ${vulnerabilitiesToFix.length} adet yeni ("${severityName}") sorun bulundu. Bunları otomatik olarak düzeltmek istiyor musunuz?`,
        { modal: true }, 'Evet, Düzelt'
    );
    if (choice !== 'Evet, Düzelt') { return; }
    
    // Hafızadaki dosyalar artık 'CodeContext' nesneleri tutacak
    const inMemoryFiles = new Map<string, CodeContext>();
    let successfulFixes = 0;
    let failedFixes = 0;
    const successfullyFixedVulnerabilities: Vulnerability[] = [];

    // --- DEĞİŞİKLİK: Sadece dosya içeriğini değil, tüm bağlamı önceden yükle ---
    // Bu, her döngüde tekrar tekrar dosya okumayı önler.
    for (const vuln of vulnerabilitiesToFix) {
        const contexts = await getFullCodeContext(vuln, workspaceRoot);
        for (const context of contexts) {
            if (!inMemoryFiles.has(context.filePath)) {
                inMemoryFiles.set(context.filePath, context);
            }
        }
    }

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: `"${severityName}" sorunlar düzeltiliyor...`,
        cancellable: true,
    }, async (progress, token) => {
        const apiKey = vscode.workspace.getConfiguration('fortify-plugin-deneme1').get<string>('geminiApiKey');
        if (!apiKey) { throw new Error("Gemini API anahtarı bulunamadı."); }
        
        for (let i = 0; i < vulnerabilitiesToFix.length; i++) {
            if (token.isCancellationRequested) { break; }
            const vulnerability = vulnerabilitiesToFix[i];
            progress.report({ message: `(${i + 1}/${vulnerabilitiesToFix.length}) ${vulnerability.category} işleniyor...`, increment: 100 / vulnerabilitiesToFix.length });
            
            try {
                // --- DEĞİŞİKLİK: İlgili tüm bağlamları topla ve prompt'u oluştur ---
                const relatedContexts: CodeContext[] = [inMemoryFiles.get(vulnerability.filePath)!];
                const relatedFilePaths = (await getFullCodeContext(vulnerability, workspaceRoot)).map(c => c.filePath);
                
                for(const filePath of relatedFilePaths) {
                    if (filePath !== vulnerability.filePath && inMemoryFiles.has(filePath)) {
                        relatedContexts.push(inMemoryFiles.get(filePath)!);
                    }
                }

                const prompt = generateChosenIssuePrompt(vulnerability, relatedContexts);
                const aiResponse = await callAIApiForFix(prompt, apiKey);

                // --- DEĞİŞİKLİK: Dönen tüm düzeltmeleri hafızaya uygula ---
                for (const [filePath, newCode] of aiResponse.codeBlocks.entries()) {
                    const existingContext = inMemoryFiles.get(filePath);
                    if (existingContext) {
                        existingContext.content = newCode; // Sadece içeriği güncelle
                        inMemoryFiles.set(filePath, existingContext);
                    }
                }

                successfullyFixedVulnerabilities.push(vulnerability);
                successfulFixes++;
            } catch (error) {
                console.error(`Düzeltme başarısız: ${vulnerability.category} - ${vulnerability.filePath}`, error);
                failedFixes++;
            }
        }
    });

    if (successfulFixes === 0) {
        vscode.window.showInformationMessage(`Hiçbir sorun için geçerli bir düzeltme üretilemedi. (${failedFixes} başarısız deneme)`);
        return;
    }

    try {
        // Hafızadaki son halleri alıp applyMultipleFixes'e uygun hale getir
        const finalFixes = new Map<string, string>();
        for (const context of inMemoryFiles.values()) {
            finalFixes.set(context.filePath, context.content);
        }

        await applyMultipleFixes(finalFixes, workspaceRoot);
        
        for (const vuln of successfullyFixedVulnerabilities) {
            const issueId = createIssueId(vuln);
            await storage.addFixedIssue(issueId);
        }
        
        vscode.commands.executeCommand('fortify-plugin-deneme1.refreshIssues');

        const summary = `${successfulFixes} sorun için düzeltme üretildi ve ${finalFixes.size} dosyaya uygulandı. ${failedFixes > 0 ? `(${failedFixes} sorun düzeltilemedi.)` : ''}`;
        vscode.window.showInformationMessage(`✅ Toplu düzeltme tamamlandı. ${summary}`);
        
        await offerToRunBuild(workspaceRoot);
        await askToCommitAllChanges(`fix(security): Fortify AI ile ${successfulFixes} adet "${severityName}" seviyesindeki sorun düzeltildi`);
    } catch (error: any) {
        vscode.window.showErrorMessage(`Toplu düzeltmeler uygulanırken hata oluştu: ${error.message}`);
    }
}