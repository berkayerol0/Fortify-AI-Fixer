import * as vscode from 'vscode';
import { parseFprFile } from '../core/parser';
import { FortifyTreeDataProvider } from '../tree/FortifyTreeDataProvider';
import { ExtensionStorage } from '../core/storage';

export async function refreshIssues(
    lastLoadedReportPath: string | undefined, 
    provider: FortifyTreeDataProvider, 
    workspaceRoot: string,
    storage: ExtensionStorage
) {
    if (lastLoadedReportPath) {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Fortify raporu yeniden işleniyor...",
            cancellable: false
        }, async (progress, token) => {
            try {
                const issues = await parseFprFile(lastLoadedReportPath, workspaceRoot);
                const falsePositives = storage.getFalsePositives();
                const fixedIssues = storage.getFixedIssues(); // Düzeltilmişleri de oku
                provider.refresh(issues, falsePositives, fixedIssues); // Hepsini provider'a ver
                vscode.window.showInformationMessage('Rapor başarıyla yenilendi.');
            } catch (error: any) {
                vscode.window.showErrorMessage(`Rapor yenilenirken bir hata oluştu: ${error.message}`);
            }
        });
    } else {
        vscode.window.showInformationMessage('Yenilenecek bir rapor bulunamadı. Lütfen yeni bir .fpr raporu seçin.');
        vscode.commands.executeCommand('fortify-plugin-deneme1.loadReport');
    }
}