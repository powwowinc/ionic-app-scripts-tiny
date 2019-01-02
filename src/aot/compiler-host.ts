import { normalize } from 'path';
import { CancellationToken, CompilerHost, CompilerOptions, createCompilerHost, ScriptTarget, SourceFile } from 'typescript';
import { Logger } from '../logger/logger';
import { VirtualFileSystem } from '../util/interfaces';
import { getTypescriptSourceFile } from '../util/typescript-utils';

export interface OnErrorFn {
  (message: string): void;
}

export class InMemoryCompilerHost implements CompilerHost {
  private sourceFileMap: Map<string, SourceFile>;
  private diskCompilerHost: CompilerHost;

  constructor(private options: CompilerOptions, private fileSystem: VirtualFileSystem, private setParentNodes = true) {
    this.diskCompilerHost = createCompilerHost(this.options, this.setParentNodes);
    this.sourceFileMap = new Map<string, SourceFile>();
  }

  fileExists(filePath: string): boolean {
    filePath = normalize(filePath);
    const fileContent = this.fileSystem.getFileContent(filePath);
    if (fileContent) {
      return true;
    }
    return this.diskCompilerHost.fileExists(filePath);
  }

  readFile(filePath: string): string {
    filePath = normalize(filePath);
    const fileContent = this.fileSystem.getFileContent(filePath);
    if (fileContent) {
      return fileContent;
    }
    return this.diskCompilerHost.readFile(filePath);
  }

  directoryExists(directoryPath: string): boolean {
    directoryPath = normalize(directoryPath);
    const stats = this.fileSystem.getDirectoryStats(directoryPath);
    if (stats) {
      return true;
    }
    return this.diskCompilerHost.directoryExists(directoryPath);
  }

  getFiles(directoryPath: string): string[] {
    directoryPath = normalize(directoryPath);
    return this.fileSystem.getFileNamesInDirectory(directoryPath);
  }

  getDirectories(directoryPath: string): string[] {
    directoryPath = normalize(directoryPath);
    const subdirs = this.fileSystem.getSubDirs(directoryPath);

    let delegated: string[];
    try {
      delegated = this.diskCompilerHost.getDirectories(directoryPath);
    } catch (e) {
      delegated = [];
    }
    return delegated.concat(subdirs);
  }

  getSourceFile(filePath: string, languageVersion: ScriptTarget, onError?: OnErrorFn) {
    filePath = normalize(filePath);
    const existingSourceFile = this.sourceFileMap.get(filePath);
    if (existingSourceFile) {
      return existingSourceFile;
    }
    // we haven't created a source file for this yet, so try to use what's in memory
    const fileContentFromMemory = this.fileSystem.getFileContent(filePath);
    if (fileContentFromMemory) {
      const typescriptSourceFile = getTypescriptSourceFile(filePath, fileContentFromMemory, languageVersion, this.setParentNodes);
      this.sourceFileMap.set(filePath, typescriptSourceFile);
      return typescriptSourceFile;
    }
    const diskSourceFile = this.diskCompilerHost.getSourceFile(filePath, languageVersion, onError);
    this.sourceFileMap.set(filePath, diskSourceFile);
    return diskSourceFile;
  }

  removeSourceFile(filePath: string) {
    filePath = normalize(filePath);
    this.sourceFileMap.delete(filePath);
  }

  getCancellationToken(): CancellationToken {
    return this.diskCompilerHost.getCancellationToken();
  }

  getDefaultLibFileName(options: CompilerOptions) {
    return this.diskCompilerHost.getDefaultLibFileName(options);
  }

  writeFile(fileName: string, data: string, writeByteOrderMark: boolean, onError?: OnErrorFn) {
    fileName = normalize(fileName);
    Logger.debug(`[NgcCompilerHost] writeFile: adding ${fileName} to virtual file system`);
    this.fileSystem.addVirtualFile(fileName, data);
  }

  getCurrentDirectory(): string {
    return this.diskCompilerHost.getCurrentDirectory();
  }

  getCanonicalFileName(fileName: string): string {
    return this.diskCompilerHost.getCanonicalFileName(fileName);
  }

  useCaseSensitiveFileNames(): boolean {
    return this.diskCompilerHost.useCaseSensitiveFileNames();
  }

  getNewLine(): string {
    return this.diskCompilerHost.getNewLine();
  }
}
