import { bundleCoreComponents } from './core/bundle-components';
import { Logger } from './logger/logger';
import { BuildError } from './util/errors';
import { BuildContext } from './util/interfaces';

export function preprocess(context: BuildContext) {
  const logger = new Logger(`preprocess`);
  return preprocessWorker(context).then(() => {
      logger.finish();
    })
    .catch((err: Error) => {
      const error = new BuildError(err.message);
      error.isFatal = true;
      throw logger.fail(error);
    });
}

function preprocessWorker(context: BuildContext) {
  const bundlePromise = bundleCoreComponents(context);

  return Promise.all([bundlePromise]);
}
