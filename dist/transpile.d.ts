import { BuildContext } from './util/interfaces';
import * as ts from 'typescript';
export declare function transpile(context: BuildContext): Promise<void>;
export declare function transpileWorker(context: BuildContext, workerConfig: TranspileWorkerConfig): Promise<{}>;
export interface TranspileWorkerMessage {
    rootDir?: string;
    buildDir?: string;
    configFile?: string;
    transpileSuccess?: boolean;
}
export declare function getTsConfigAsync(context: BuildContext, tsConfigPath?: string): Promise<TsConfig>;
export declare function getTsConfig(context: BuildContext, tsConfigPath?: string): TsConfig;
export declare function transpileTsString(context: BuildContext, filePath: string, stringToTranspile: string): ts.TranspileOutput;
export declare function getTsConfigPath(context: BuildContext): any;
export interface TsConfig {
    options: ts.CompilerOptions;
    fileNames: string[];
    raw: any;
}
export interface TranspileWorkerConfig {
    configFile: string;
    writeInMemory: boolean;
    sourceMaps: boolean;
    cache: boolean;
    inlineTemplate: boolean;
}
