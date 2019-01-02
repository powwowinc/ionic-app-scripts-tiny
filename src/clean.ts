import { emptyDirSync } from 'fs-extra';
import { Logger } from './logger/logger';
import { BuildError } from './util/errors';
import { BuildContext } from './util/interfaces';


export function clean(context: BuildContext) {
  return new Promise((resolve, reject) => {
    const logger = new Logger('clean');

    try {
      Logger.debug(`[Clean] clean: cleaning ${context.buildDir}`);

      emptyDirSync(context.buildDir);
      logger.finish();

    } catch (ex) {
      reject(logger.fail(new BuildError(`Failed to clean directory ${context.buildDir} - ${ex.message}`)));
    }
    resolve();
  });
}
