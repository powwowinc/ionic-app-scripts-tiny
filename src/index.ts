export { build } from './build';
export { bundle, bundleUpdate } from './bundle';
export { clean } from './clean';
export { copy, copyUpdate } from './copy';
export { sass, sassUpdate } from './sass';
export { transpile } from './transpile';
export { watch } from './watch';
export * from './util/config';
export * from './util/helpers';
export * from './util/interfaces';
export * from './util/constants';

export { getDeepLinkData } from './deep-linking/util';

import { generateContext } from './util/config';
import { getAppScriptsVersion, setContext } from './util/helpers';
import { Logger } from './logger/logger';

export function run(task: string) {
  try {
    Logger.info(`ionic-app-scripts-tiny ${getAppScriptsVersion()}`, 'cyan');
  } catch (e) {}

  try {
    const context = generateContext(null);
    setContext(context);
    require(`../dist/${task}`)[task](context).catch((err: any) => {
      errorLog(task, err);
    });
  } catch (e) {
    errorLog(task, e);
  }
}

function errorLog(task: string, e: any) {
  Logger.error(`ionic-app-script task: "${task}"`);
  if (e && e.toString() !== 'Error') {
    Logger.error(`${e}`);
  }
  if (e.stack) {
    Logger.unformattedError(e.stack);
  }
  process.exit(1);
}
