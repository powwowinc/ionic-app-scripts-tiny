import { ServeConfig } from './dev-server/serve-config';
import { BuildContext } from './util/interfaces';
export declare function serve(context: BuildContext): Promise<ServeConfig>;
export declare function getNotificationPort(context: BuildContext): number;
