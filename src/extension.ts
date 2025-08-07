import * as vscode from 'vscode';
import { FortifyTreeDataProvider } from './tree/FortifyTreeDataProvider';
import { SeverityTreeItem, VulnerabilityTreeItem } from './tree/FortifyTreeItem';
import { parseFprFile } from './core/parser';
import { solveIssue } from './commands/solveIssue';
import { refreshIssues } from './commands/refresh';
import { solveAllIssues } from './commands/solveAll';
import { askToCommitAllChanges } from './git';
import { ExtensionStorage, createIssueId } from './core/storage';
import { offerToRunBuild } from './core/build';

export function activate(context: vscode.ExtensionContext) {
    let lastLoadedReportPath: string | undefined;
    const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    if (!workspaceRoot) { return; }

    const storage = new ExtensionStorage(context);
    const fortifyDataProvider = new FortifyTreeDataProvider(workspaceRoot);
    vscode.window.createTreeView('fortifyVulnerabilityExplorer', { treeDataProvider: fortifyDataProvider });

    const loadReportCommand = vscode.commands.registerCommand('fortify-plugin-deneme1.loadReport', async () => {
        const fileUris = await vscode.window.showOpenDialog({ 
            canSelectMany: false,
            openLabel: 'Fortify Raporu (.fpr) Seç',
            filters: { 'Fortify Raporları': ['fpr'] }
        });
        if (!fileUris || fileUris.length === 0) { return; }
        const filePath = fileUris[0].fsPath;
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "Fortify raporu işleniyor...",
            cancellable: false
        }, async (progress, token) => {
            const issues = await parseFprFile(filePath, workspaceRoot);
            const falsePositives = storage.getFalsePositives();
            const fixedIssues = storage.getFixedIssues();
            fortifyDataProvider.refresh(issues, falsePositives, fixedIssues);
            lastLoadedReportPath = filePath;
        });
    });

    const fixWithAICommand = vscode.commands.registerCommand('fortify-plugin-deneme1.fixWithAI', (treeItem: VulnerabilityTreeItem) => {
        if (treeItem instanceof VulnerabilityTreeItem) {
            solveIssue(treeItem, workspaceRoot, storage); 
        }
    });

    const refreshIssuesCommand = vscode.commands.registerCommand('fortify-plugin-deneme1.refreshIssues', () => {
        refreshIssues(lastLoadedReportPath, fortifyDataProvider, workspaceRoot, storage); 
    });

    const solveAllCommand = vscode.commands.registerCommand('fortify-plugin-deneme1.solveAllIssues', async () => {
        await solveAllIssues(fortifyDataProvider, workspaceRoot, storage); 
    });

    const solveSeverityGroupCommand = vscode.commands.registerCommand('fortify-plugin-deneme1.solveSeverityGroup', async (treeItem: SeverityTreeItem) => {
        if (treeItem instanceof SeverityTreeItem && treeItem.severityKey) {
            await solveAllIssues(fortifyDataProvider, workspaceRoot, storage, treeItem.severityKey);
        }
    });
    
    const commitChangesCommand = vscode.commands.registerCommand('fortify-plugin-deneme1.commitChanges', async () => {
        await askToCommitAllChanges();
    });

    const markAsFalsePositiveCommand = vscode.commands.registerCommand('fortify-plugin-deneme1.markAsFalsePositive', async (treeItem: VulnerabilityTreeItem) => {
        if (treeItem && treeItem.vulnerability) {
            const issueId = createIssueId(treeItem.vulnerability);
            await storage.addFalsePositive(issueId);
            vscode.commands.executeCommand('fortify-plugin-deneme1.refreshIssues');
            vscode.window.showInformationMessage(`Sorun False Positive olarak işaretlendi.`);
        }
    });

    const unmarkAsFalsePositiveCommand = vscode.commands.registerCommand('fortify-plugin-deneme1.unmarkAsFalsePositive', async (treeItem: VulnerabilityTreeItem) => {
        if (treeItem && treeItem.vulnerability) {
            const issueId = createIssueId(treeItem.vulnerability);
            await storage.removeFalsePositive(issueId);
            vscode.commands.executeCommand('fortify-plugin-deneme1.refreshIssues');
            vscode.window.showInformationMessage(`Sorunun işareti kaldırıldı.`);
        }
    });

    // --- EKSİK OLAN KOMUT KAYDI İŞTE BURADA ---
    const unfixIssueCommand = vscode.commands.registerCommand('fortify-plugin-deneme1.unfixIssue', async (treeItem: VulnerabilityTreeItem) => {
        if (treeItem && treeItem.vulnerability) {
            const issueId = createIssueId(treeItem.vulnerability);
            await storage.removeFixedIssue(issueId); // Depolamadan siliyoruz
            vscode.commands.executeCommand('fortify-plugin-deneme1.refreshIssues'); // Paneli yeniliyoruz
            vscode.window.showInformationMessage(`Sorunun 'Düzeltildi' işareti kaldırıldı.`);
        }
    });

    // --- VE BURADA LİSTEYE EKLENİYOR ---
    context.subscriptions.push(
        loadReportCommand, fixWithAICommand, refreshIssuesCommand,
        solveAllCommand, solveSeverityGroupCommand, commitChangesCommand,
        markAsFalsePositiveCommand, unmarkAsFalsePositiveCommand,
        unfixIssueCommand // unfixIssueCommand'ı aboneliklere ekliyoruz
    );
}

export function deactivate() {}