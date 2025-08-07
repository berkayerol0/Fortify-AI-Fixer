import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import JSZip from 'jszip'; 
import { parseStringPromise } from 'xml2js';
import { Vulnerability } from './group';

function mapBuildPathToSourcePath(buildPath: string): string { //kaynak dosyası yolu 
    let sourcePath = buildPath;
    if (sourcePath.startsWith('target/classes/')) {
        let potentialJavaPath = buildPath.replace(/^target\/classes\//, 'src/main/java/');
        if (potentialJavaPath.endsWith('.class')) {
            potentialJavaPath = potentialJavaPath.slice(0, -'.class'.length) + '.java';
        }
        if (fs.existsSync(path.resolve(vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '', potentialJavaPath))) {
            return potentialJavaPath;
        }
        return buildPath.replace(/^target\/classes\//, 'src/main/resources/');
    }
    if (sourcePath.startsWith('build/classes/java/main/')) {
        return path.join('src/main/java/', sourcePath.substring('build/classes/java/main/'.length));
    }
    if (sourcePath.startsWith('build/resources/main/')) {
        return path.join('src/main/resources/', sourcePath.substring('build/resources/main/'.length));
    }
    return sourcePath;
}

function normalizeSeverity(severityString: string): Vulnerability['severity'] {
    if (!severityString) {return 'Low';}
    const severity = parseFloat(severityString);
    if (isNaN(severity)) {return 'Low'; }
    if (severity >= 4.5) {return 'Critical';}
    if (severity >= 3.0) {return 'High';}
    if (severity > 2.0) {return 'Medium';}

    return 'Low';
}

async function getSnippetFromLocation(locationNode: any, zip: JSZip): Promise<string> {
    const snippetAttribute = locationNode?.$?.snippet;
    if (!snippetAttribute) return 'Snippet not available.';
    const [hash] = snippetAttribute.split('#');
    if (!hash) return 'Invalid snippet format.';
    const snippetFile = zip.file(`Snippets/${hash}`);
    if (snippetFile) {
        return (await snippetFile.async('string')).trim();
    }
    return 'Snippet reference found, but content file is missing in ZIP.';
}

export async function parseFprFile(fprPath: string, workspaceRoot: string): Promise<Vulnerability[]> {
    try {
        const fileContent = fs.readFileSync(fprPath);
        const zip = await JSZip.loadAsync(fileContent);
        const fvdlFile = zip.file('audit.fvdl');
        if (!fvdlFile) throw new Error('audit.fvdl dosyası .fpr içinde bulunamadı.');
        
        const fvdlContent = await fvdlFile.async('string');
        const parsedXml = await parseStringPromise(fvdlContent);
        
        const issues = parsedXml.FVDL?.Vulnerabilities?.[0]?.Vulnerability;
        if (!issues || !Array.isArray(issues)) {
            vscode.window.showInformationMessage('Raporda güvenlik açığı listesi (Vulnerabilities) bulunamadı.');
            return [];
        }

        const vulnerabilities: Vulnerability[] = [];
        for (const issue of issues) {
            const primaryLocationNode = issue.AnalysisInfo?.[0]?.Unified?.[0]?.Trace?.[0]?.Primary?.[0]?.Entry?.[0]?.Node?.[0]?.SourceLocation?.[0];
            const classInfo = issue.ClassInfo?.[0];
            const instanceInfo = issue.InstanceInfo?.[0];
            if (!primaryLocationNode || !classInfo || !instanceInfo) continue;
            
            const primaryLocation = primaryLocationNode.$;
            const rawSeverity = instanceInfo.InstanceSeverity?.[0];
            const sourcePath = mapBuildPathToSourcePath(primaryLocation.path);
            
            if (rawSeverity) {
                let fullFileContent = '';
                try {
                    const fullFilePath = path.resolve(workspaceRoot, sourcePath);
                    if (fs.existsSync(fullFilePath)) {
                        fullFileContent = fs.readFileSync(fullFilePath, 'utf-8');
                    } else {
                        fullFileContent = `Kaynak dosya bulunamadı: ${sourcePath}`;
                    }
                } catch (readError) {
                    fullFileContent = 'Dosya içeriği okunamadı.';
                }

                const codeSnippet = await getSnippetFromLocation(primaryLocationNode, zip);
                vulnerabilities.push({
                    category: classInfo.Type?.[0] ?? 'Bilinmeyen Kategori',
                    filePath: sourcePath,
                    line: parseInt(primaryLocation.line, 10),
                    severity: normalizeSeverity(rawSeverity),
                    language: path.extname(sourcePath).substring(1) || 'plaintext',
                    codeSnippet: codeSnippet,
                    abstract: classInfo.Subtype?.[0] ?? classInfo.Type?.[0] ?? 'Açıklama yok.',
                    fullFileContent: fullFileContent,
                });
            }
        }
        
        vscode.window.showInformationMessage(`Analiz tamamlandı. ${vulnerabilities.length} adet sorun bulundu.`);
        return vulnerabilities;
    } catch (error: any) {
        vscode.window.showErrorMessage(`.fpr dosyası okunurken hata oluştu: ${error.message}`);
        return [];
    }
}