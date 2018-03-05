import { CleanCssConfig } from './util/clean-css-factory';
import { BuildContext, TaskInfo } from './util/interfaces';
export declare function cleancss(context: BuildContext, configFile?: string): Promise<void>;
export declare function cleancssWorker(context: BuildContext, configFile: string): Promise<any>;
export declare function runCleanCss(cleanCssConfig: CleanCssConfig, fileContent: string): Promise<string>;
export declare const taskInfo: TaskInfo;
