import { BuildContext, ChangedFile } from './util/interfaces';
export declare function watch(context?: BuildContext): Promise<void>;
export declare let buildUpdatePromise: Promise<any>;
export declare let queuedChangedFileMap: Map<string, ChangedFile>;
export declare function queueOrRunBuildUpdate(changedFiles: ChangedFile[], context: BuildContext): Promise<any>;
export declare function runBuildUpdate(context: BuildContext, changedFiles: ChangedFile[]): ChangedFile[];
