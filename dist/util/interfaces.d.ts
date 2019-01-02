/// <reference types="node" />
import { FileCache } from './file-cache';
import { VirtualDirStats, VirtualFileStats } from './virtual-file-utils';
export interface SemverVersion {
    major: number;
    minor: number;
    patch: number;
}
export interface BuildContext {
    rootDir?: string;
    tmpDir?: string;
    srcDir?: string;
    pagesDir?: string;
    componentsDir?: string;
    directivesDir?: string;
    pipesDir?: string;
    providersDir?: string;
    wwwDir?: string;
    wwwIndex?: string;
    buildDir?: string;
    outputJsFileName?: string;
    outputCssFileName?: string;
    nodeModulesDir?: string;
    angularCoreDir?: string;
    typescriptDir?: string;
    ionicAngularDir?: string;
    coreCompilerFilePath?: string;
    coreDir?: string;
    bundledFilePaths?: string[];
    moduleFiles?: string[];
    appNgModulePath?: string;
    componentsNgModulePath?: string;
    pipesNgModulePath?: string;
    directivesNgModulePath?: string;
    isProd?: boolean;
    isWatch?: boolean;
    runAot?: boolean;
    runMinifyJs?: boolean;
    runMinifyCss?: boolean;
    optimizeJs?: boolean;
    bundler?: string;
    fileCache?: FileCache;
    inlineTemplates?: boolean;
    webpackWatch?: any;
    ionicGlobal?: any;
    sourcemapDir?: string;
    sassState?: BuildState;
    transpileState?: BuildState;
    templateState?: BuildState;
    bundleState?: BuildState;
    deepLinkState?: BuildState;
    target?: string;
    platform?: string;
    angularVersion?: SemverVersion;
    ionicAngularVersion?: SemverVersion;
    typescriptVersion?: SemverVersion;
}
export declare enum BuildState {
    SuccessfulBuild = 0,
    RequiresUpdate = 1,
    RequiresBuild = 2,
}
export interface WorkerMessage {
    taskModule?: string;
    taskWorker?: string;
    context?: BuildContext;
    workerConfig?: any;
    resolve?: any;
    reject?: any;
    error?: any;
    pid?: number;
}
export interface WorkerProcess {
    task: string;
    worker: any;
}
export interface TaskInfo {
    fullArg: string;
    shortArg: string;
    envVar: string;
    packageConfig: string;
    defaultConfigFile: string;
}
export interface File {
    path: string;
    content: string;
    timestamp?: number;
}
export interface Diagnostic {
    level: string;
    type: string;
    language: string;
    header: string;
    code: string;
    messageText: string;
    absFileName: string;
    relFileName: string;
    lines: PrintLine[];
}
export interface PrintLine {
    lineIndex: number;
    lineNumber: number;
    text: string;
    html: string;
    errorCharStart: number;
    errorLength: number;
}
export interface BuildUpdateMessage {
    buildId: number;
    reloadApp: boolean;
}
export interface ChangedFile {
    event: string;
    filePath: string;
    ext: string;
}
export interface FileSystem {
    isSync(): boolean;
    stat(path: string, callback: Function): any;
    readdir(path: string, callback: Function): any;
    readFile(path: string, callback: Function): any;
    readJson(path: string, callback: Function): any;
    readlink(path: string, callback: Function): any;
    purge(what: any): void;
    writeFile(filePath: string, fileContent: Buffer, callback: Function): void;
    mkdirp(filePath: string, callback: Function): void;
    mkdir(filePath: string, callback: Function): void;
    rmdir(filePath: string, callback: Function): void;
    unlink(filePath: string, callback: Function): void;
}
export interface VirtualFileSystem {
    addVirtualFile(filePath: string, fileContent: string): void;
    getFileContent(filePath: string): string;
    getDirectoryStats(path: string): VirtualDirStats;
    getSubDirs(directoryPath: string): string[];
    getFileNamesInDirectory(directoryPath: string): string[];
    getAllFileStats(): {
        [filePath: string]: VirtualFileStats;
    };
    getAllDirStats(): {
        [filePath: string]: VirtualDirStats;
    };
}
export interface DeepLinkDecoratorAndClass {
    name: string;
    segment: string;
    defaultHistory: string[];
    priority: string;
    rawString: string;
    className: string;
}
export interface DeepLinkPathInfo {
    absolutePath: string;
    userlandModulePath: string;
    className: string;
}
export interface DeepLinkConfigEntry extends DeepLinkDecoratorAndClass, DeepLinkPathInfo {
}
export interface WebpackStats {
    modules: WebpackModule[];
}
export interface WebpackModule {
    identifier: string;
    reasons: WebpackDependency[];
}
export interface WebpackDependency {
    moduleIdentifier: string;
}
export interface CoreCompiler {
    bundle: {
        (config: {
            srcDir: string;
            destDir: string;
            packages: Packages;
            debug?: boolean;
        }): Promise<any>;
    };
}
export interface Packages {
    path?: any;
    fs?: any;
    typescript?: any;
    nodeSass?: any;
}
