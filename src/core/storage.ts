import * as vscode from 'vscode';
import { Vulnerability } from './group';

const FALSE_POSITIVE_KEY = 'fortifyFalsePositives';
const FIXED_ISSUES_KEY = 'fortifyFixedIssues';

export function createIssueId(vulnerability: Vulnerability): string {
    return `${vulnerability.filePath}:${vulnerability.line}:${vulnerability.category}`;
}

export class ExtensionStorage {
    private storage: vscode.Memento;

    constructor(context: vscode.ExtensionContext) {
        this.storage = context.workspaceState;
    }

    // --- False Positive Fonksiyonları ---
    public getFalsePositives(): string[] {
        return this.storage.get<string[]>(FALSE_POSITIVE_KEY, []);
    }

    public async addFalsePositive(issueId: string): Promise<void> {
        const currentList = this.getFalsePositives();
        if (!currentList.includes(issueId)) {
            const newList = [...currentList, issueId];
            await this.storage.update(FALSE_POSITIVE_KEY, newList);
        }
    }

    public async removeFalsePositive(issueId: string): Promise<void> {
        const currentList = this.getFalsePositives();
        const newList = currentList.filter(id => id !== issueId);
        await this.storage.update(FALSE_POSITIVE_KEY, newList);
    }

    public getFixedIssues(): string[] {
        return this.storage.get<string[]>(FIXED_ISSUES_KEY, []);
    }

    public async addFixedIssue(issueId: string): Promise<void> {
        const currentList = this.getFixedIssues();
        if (!currentList.includes(issueId)) {
            await this.storage.update(FIXED_ISSUES_KEY, [...currentList, issueId]);
        }
    }

    public async clearAllStatus(): Promise<void> {
        await this.storage.update(FALSE_POSITIVE_KEY, []);
        await this.storage.update(FIXED_ISSUES_KEY, []);
    }

      public async removeFixedIssue(issueId: string): Promise<void> {
        const currentList = this.getFixedIssues();
        const newList = currentList.filter(id => id !== issueId);
        await this.storage.update(FIXED_ISSUES_KEY, newList);
    }
}