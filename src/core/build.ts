import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Proje türünü belirlemek için enum kullanalım
export enum ProjectType {
    Maven,
    Gradle,
    Unknown
}

/**
 * Proje kök dizinindeki dosyalara bakarak proje türünü tespit eder.
 * @param workspaceRoot Projenin kök dizini.
 */
function detectProjectType(workspaceRoot: string): ProjectType {
    if (fs.existsSync(path.join(workspaceRoot, 'pom.xml'))) {
        return ProjectType.Maven;
    }
    if (fs.existsSync(path.join(workspaceRoot, 'build.gradle')) || fs.existsSync(path.join(workspaceRoot, 'build.gradle.kts'))) {
        return ProjectType.Gradle;
    }
    return ProjectType.Unknown;
}

/**
 * Belirtilen proje türü için uygun build komutunu döndürür.
 * @param projectType Tespit edilen proje türü.
 * @param workspaceRoot Projenin kök dizini.
 */
function getBuildCommand(projectType: ProjectType, workspaceRoot: string): string | undefined {
    switch (projectType) {
        case ProjectType.Maven:
            // 'mvnw' (Maven Wrapper) varsa onu kullanmak daha güvenlidir.
            const mvnwPath = path.join(workspaceRoot, 'mvnw');
            const mvnCommand = fs.existsSync(mvnwPath) ? (process.platform === 'win32' ? '.\\mvnw' : './mvnw') : 'mvn';
            // Bu komut, testleri çalıştırmadan hızlı bir derleme yapar.
            return `${mvnCommand} clean install -DskipTests`; 
        case ProjectType.Gradle:
            // 'gradlew' (Gradle Wrapper) varsa onu kullanmak daha güvenlidir.
            const gradlewPath = path.join(workspaceRoot, 'gradlew');
            const gradleCommand = fs.existsSync(gradlewPath) ? (process.platform === 'win32' ? '.\\gradlew' : './gradlew') : 'gradle';
            return `${gradleCommand} build -x test`;
        default:
            return undefined;
    }
}

/**
 * Kullanıcının projesini yeniden derlemeyi (build) teklif eder ve işlemi başlatır.
 * @param workspaceRoot Projenin kök dizini.
 */
export async function offerToRunBuild(workspaceRoot: string): Promise<void> {
    const projectType = detectProjectType(workspaceRoot);
    const buildCommand = getBuildCommand(projectType, workspaceRoot);

    if (!buildCommand) {
        vscode.window.showWarningMessage('Proje türü (Maven/Gradle) tespit edilemedi. Lütfen projenizi manuel olarak derleyin.');
        return;
    }

    const choice = await vscode.window.showInformationMessage(
        `Düzeltmeler uygulandı. Değişikliklerin geçerli olması için projenin yeniden derlenmesi gerekiyor. Derleme işlemini şimdi başlatmak istiyor musunuz?`,
        { 
            modal: true,
            detail: `Komut: ${buildCommand}` // Komutu detayda gösterelim
        },
        'Evet, Derlemeyi Başlat'
    );

    if (choice !== 'Evet, Derlemeyi Başlat') {
        vscode.window.showInformationMessage('Derleme işlemi atlandı. Lütfen projenizi manuel olarak derleyin.');
        return;
    }

    // Mevcut bir "Build" terminali varsa onu kullan, yoksa yeni oluştur.
    let terminal = vscode.window.terminals.find(t => t.name === 'Fortify AI Fixer Build');
    if (!terminal) {
        terminal = vscode.window.createTerminal('Fortify AI Fixer Build');
    }
    
    terminal.sendText(buildCommand);
    terminal.show(); // Terminali kullanıcıya göster

    vscode.window.showInformationMessage('Derleme işlemi başlatıldı. Lütfen terminali takip edin.');
}