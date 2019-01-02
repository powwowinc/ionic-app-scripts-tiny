import { BuildError } from './util/errors';
import { BuildContext } from './util/interfaces';
import { getWebpackConfig, webpack } from './webpack';


export function bundle(context: BuildContext, configFile?: string) {
  return bundleWorker(context, configFile)
    .catch((err: Error) => {
      throw new BuildError(err);
    });
}


function bundleWorker(context: BuildContext, configFile: string) {
  return webpack(context, configFile);
}

export function buildJsSourceMaps(context: BuildContext) {
  const webpackConfig = getWebpackConfig(context, null);
  return !!(webpackConfig.devtool && webpackConfig.devtool.length > 0);
}
