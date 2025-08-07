import * as vscode from 'vscode';
import { GitExtension, Repository } from './types/git';

async function getActiveRepository(): Promise<Repository | undefined> {
    try {
        const extension = vscode.extensions.getExtension<GitExtension>('vscode.git');
        if (!extension) {
            vscode.window.showWarningMessage('VS Code Git eklentisi bulunamadı.');
            return undefined;
        }
        if (!extension.isActive) await extension.activate();
        const api = extension.exports.getAPI(1);
        if (api.repositories.length > 0) return api.repositories[0];
        return await new Promise((resolve) => {
            const disposable = api.onDidOpenRepository(repo => {
                disposable.dispose();
                resolve(repo);
            });
        });
    } catch (error) {
        console.error("Git eklentisi API'sini alırken bir hata oluştu:", error);
        return undefined;
    }
}

export async function askToCommitAllChanges(customMessage?: string) {
    const repo = await getActiveRepository();
    if (!repo) {
        vscode.window.showWarningMessage('Commit atılacak aktif bir Git deposu bulunamadı.');
        return;
    }
    const choice = await vscode.window.showInformationMessage(
        `Uygulanan değişiklikler için ne yapmak istersiniz?`, 
        { modal: true }, 'Commit & Push', 'Sadece Commit At', 'Daha Sonra'
    );
    if (!choice || choice === 'Daha Sonra') return;

    try {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Git işlemi yürütülüyor...',
            cancellable: false
        }, async (progress) => {
            progress.report({ message: 'Değişiklikler stage ediliyor...' });
            await vscode.commands.executeCommand('git.stageAll');
            progress.report({ message: 'Değişiklikler commit ediliyor...' });
            const commitMessage = customMessage || `fix(security): Fortify AI tarafından birden fazla düzeltme uygulandı`;
            await repo.commit(commitMessage);
            vscode.window.showInformationMessage('✅ Değişiklikler başarıyla commit edildi.');
            if (choice === 'Commit & Push') {
                progress.report({ message: 'Değişiklikler GitHub\'a gönderiliyor (push)...' });
                await repo.push();
                vscode.window.showInformationMessage('✅ Değişiklikler başarıyla GitHub\'a gönderildi!');
            }
        });
    } catch (error: any) {
        if (error.message.includes('no changes to commit')) vscode.window.showInformationMessage('Commit atılacak bir değişiklik bulunamadı.');
        else if (error.message.includes('No remote configured')) vscode.window.showErrorMessage('Push işlemi başarısız: Projeniz için bir uzak depo (remote) ayarlanmamış.');
        else {
            console.error("Git işlemi başarısız oldu:", error);
            vscode.window.showErrorMessage(`Git işlemi başarısız oldu: ${error.message}`);
        }
    }
}