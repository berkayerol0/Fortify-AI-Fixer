import { Uri, Event, Disposable } from 'vscode';

export interface API {
    readonly state: 'uninitialized' | 'initialized';
    readonly onDidChangeState: Event<'uninitialized' | 'initialized'>;
    readonly repositories: Repository[];
    readonly onDidOpenRepository: Event<Repository>;
    readonly onDidCloseRepository: Event<Repository>;
    getAPI(version: 1): API;
}

export interface GitExtension {
    readonly enabled: boolean;
    readonly onDidChangeEnablement: Event<boolean>;
    getAPI(version: 1): API;
}

export interface Ref {
    readonly type: RefType;
    readonly name?: string;
    readonly commit?: string;
}

export declare const enum RefType {
    Head = 0,
    RemoteHead = 1,
    Tag = 2
}

export interface Branch extends Ref {
    readonly upstream?: {
        readonly remote: string;
        readonly name: string;
    };
    readonly ahead?: number;
    readonly behind?: number;
}

export interface RepositoryState {
    readonly HEAD: Branch | undefined;
    readonly onDidChange: Event<void>;
}

export interface Repository {
    readonly rootUri: Uri;
    readonly state: RepositoryState;
    add(paths: string[]): Promise<void>;
    commit(message: string, opts?: any): Promise<void>;
    push(remoteName?: string, branchName?: string, setUpstream?: boolean, force?: any): Promise<void>;
}