"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var errors_1 = require("./util/errors");
var webpack_1 = require("./webpack");
function bundle(context, configFile) {
    return bundleWorker(context, configFile)
        .catch(function (err) {
        throw new errors_1.BuildError(err);
    });
}
exports.bundle = bundle;
function bundleWorker(context, configFile) {
    /*
    if (context.bundler === Constants.BUNDLER_ROLLUP) {
      return rollup(context, configFile);
    }
    */
    return webpack_1.webpack(context, configFile);
}
/*
export function bundleUpdate(changedFiles: ChangedFile[], context: BuildContext) {
  if (context.bundler === Constants.BUNDLER_ROLLUP) {
    return rollupUpdate(changedFiles, context)
      .catch(err => {
        throw new BuildError(err);
      });
  }

  return webpackUpdate(changedFiles, context)
    .catch(err => {
      if (err instanceof IgnorableError) {
        throw err;
      }
      throw new BuildError(err);
    });
}
*/
function buildJsSourceMaps(context) {
    /*
    if (context.bundler === Constants.BUNDLER_ROLLUP) {
      const rollupConfig = getRollupConfig(context, null);
      return rollupConfig.sourceMap;
    }
    */
    var webpackConfig = webpack_1.getWebpackConfig(context, null);
    return !!(webpackConfig.devtool && webpackConfig.devtool.length > 0);
}
exports.buildJsSourceMaps = buildJsSourceMaps;
/*
export function getJsOutputDest(context: BuildContext) {
  if (context.bundler === Constants.BUNDLER_ROLLUP) {
    const rollupConfig = getRollupConfig(context, null);
    return rollupGetOutputDest(context, rollupConfig);
  }

  return webpackGetOutputDest(context);
}
*/
