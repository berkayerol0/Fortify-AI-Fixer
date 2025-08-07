import * as vscode from 'vscode';
import * as path from 'path';
import { Vulnerability } from '../core/group';

export class BaseTreeItem extends vscode.TreeItem {}

export class SeverityTreeItem extends BaseTreeItem {
    public readonly severityKey: Vulnerability['severity']; 

    constructor(label: string, severityKey: Vulnerability['severity'], collapsibleState: vscode.TreeItemCollapsibleState) {
        super(label, collapsibleState);
        this.severityKey = severityKey;
        this.contextValue = 'severityGroup';
    }
}

export class VulnerabilityTreeItem extends BaseTreeItem {
    public readonly vulnerability: Vulnerability;
    private originalLabel: string;
    
    constructor(vulnerability: Vulnerability, workspaceRoot: string) {
        const label = `${vulnerability.category} in ${path.basename(vulnerability.filePath)}`;
        super(label, vscode.TreeItemCollapsibleState.None);
        
        this.originalLabel = label;
        this.vulnerability = vulnerability;
        this.description = `L:${vulnerability.line}`;
        this.tooltip = new vscode.MarkdownString(/*...*/);
        this.contextValue = 'vulnerability'; 
        this.iconPath = new vscode.ThemeIcon('bug');

        const finalPath = path.resolve(workspaceRoot, vulnerability.filePath);
        this.command = {
            command: 'vscode.open',
            title: 'Open File',
            arguments: [ vscode.Uri.file(finalPath), { selection: new vscode.Range(vulnerability.line - 1, 0, vulnerability.line - 1, 0) } ],
        };
    }

    public setAsFixed() {
        this.label = `[FIXED] ${this.originalLabel}`;
        this.iconPath = new vscode.ThemeIcon('check', new vscode.ThemeColor('testing.iconPassed'));
        this.contextValue = 'vulnerability-fixed'; 
    }

    public setAsFalsePositive() {
        this.label = `[IGNORED] ${this.originalLabel}`;
        this.iconPath = new vscode.ThemeIcon('issue-closed', new vscode.ThemeColor('testing.iconSkipped'));
        this.contextValue = 'vulnerability-ignored'; 
    }
}