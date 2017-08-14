import { BuildContext } from './util/interfaces';
export declare function bundle(context: BuildContext, configFile?: string): Promise<void>;
export declare function buildJsSourceMaps(context: BuildContext): boolean;
