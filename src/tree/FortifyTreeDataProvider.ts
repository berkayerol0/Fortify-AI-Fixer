import * as vscode from 'vscode';
import { Vulnerability } from '../core/group';
import { BaseTreeItem, SeverityTreeItem, VulnerabilityTreeItem } from './FortifyTreeItem';
import { createIssueId } from '../core/storage';

export class FortifyTreeDataProvider implements vscode.TreeDataProvider<BaseTreeItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<BaseTreeItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;
    
    private vulnerabilities: Vulnerability[] = [];
    private workspaceRoot: string;
    private falsePositiveIds: string[] = [];
    private fixedIssueIds: string[] = []; 

    constructor(workspaceRoot: string) { this.workspaceRoot = workspaceRoot; }
    
    public refresh(data: Vulnerability[], falsePositives: string[], fixedIds: string[]): void { 
        this.vulnerabilities = data;
        this.falsePositiveIds = falsePositives;
        this.fixedIssueIds = fixedIds;
        this._onDidChangeTreeData.fire();
    }
    
    public getVulnerabilitiesToFix(severityToFix?: Vulnerability['severity']): Vulnerability[] {
        return this.vulnerabilities.filter(vuln => {
            const issueId = createIssueId(vuln);
            const isFixed = this.fixedIssueIds.includes(issueId);
            const isFalsePositive = this.falsePositiveIds.includes(issueId);

            if (isFixed || isFalsePositive) { return false; }
            if (severityToFix) { return vuln.severity === severityToFix; }
            return true;
        });
    }

    public getTreeItem(element: BaseTreeItem): vscode.TreeItem { return element; }

    getChildren(element?: BaseTreeItem): vscode.ProviderResult<BaseTreeItem[]> {
        if (!this.workspaceRoot) { return []; }

        if (element instanceof SeverityTreeItem) {
            const severity = element.severityKey;
            return this.vulnerabilities
                .filter(vuln => vuln.severity === severity)
                .map(vuln => {
                    const treeItem = new VulnerabilityTreeItem(vuln, this.workspaceRoot);
                    const issueId = createIssueId(vuln);
                    
                    if (this.falsePositiveIds.includes(issueId)) {
                        treeItem.setAsFalsePositive();
                    } else if (this.fixedIssueIds.includes(issueId)) {
                        treeItem.setAsFixed();
                    }
                    
                    return treeItem;
                });
        } 
        
        if (!element) {
            const grouped = this.groupBySeverity();
            return Object.entries(grouped)
                .filter(([key, vulnerabilities]) => vulnerabilities.length > 0)
                .map(([key, vulnerabilities]) => {
                    return new SeverityTreeItem(`${key} (${vulnerabilities.length})`, key as Vulnerability['severity'], vscode.TreeItemCollapsibleState.Collapsed);
                });
        }

        return [];
    }

    private groupBySeverity(): { [key in Vulnerability['severity']]: Vulnerability[] } {
        const groups: { [key in Vulnerability['severity']]: Vulnerability[] } = {
            Critical: [], High: [], Medium: [], Low: []
        };
        this.vulnerabilities.forEach(issue => { groups[issue.severity].push(issue); });
        return groups;
    }
}