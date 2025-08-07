export interface Vulnerability {
    category: string;
    filePath: string;
    line: number;
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    language: string;
    codeSnippet: string;
    abstract: string;
    fullFileContent: string; 
}