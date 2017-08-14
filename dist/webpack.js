"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var webpackApi = require("webpack");
var logger_1 = require("./logger/logger");
var config_1 = require("./util/config");
var errors_1 = require("./util/errors");
var interfaces_1 = require("./util/interfaces");
/*
const eventEmitter = new EventEmitter();
const INCREMENTAL_BUILD_FAILED = 'incremental_build_failed';
const INCREMENTAL_BUILD_SUCCESS = 'incremental_build_success';
*/
/*
 * Due to how webpack watch works, sometimes we start an update event
 * but it doesn't affect the bundle at all, for example adding a new typescript file
 * not imported anywhere or adding an html file not used anywhere.
 * In this case, we'll be left hanging and have screwed up logging when the bundle is modified
 * because multiple promises will resolve at the same time (we queue up promises waiting for an event to occur)
 * To mitigate this, store pending "webpack watch"/bundle update promises in this array and only resolve the
 * the most recent one. reject all others at that time with an IgnorableError.
 */
/*
let pendingPromises: Promise<any>[] = [];
*/
function webpack(context, configFile) {
    configFile = config_1.getUserConfigFile(context, taskInfo, configFile);
    var logger = new logger_1.Logger('webpack');
    return webpackWorker(context, configFile)
        .then(function () {
        context.bundleState = interfaces_1.BuildState.SuccessfulBuild;
        logger.finish();
    })
        .catch(function (err) {
        context.bundleState = interfaces_1.BuildState.RequiresBuild;
        throw logger.fail(err);
    });
}
exports.webpack = webpack;
/*
export function webpackUpdate(changedFiles: ChangedFile[], context: BuildContext, configFile?: string) {
  const logger = new Logger('webpack update');
  const webpackConfig = getWebpackConfig(context, configFile);
  Logger.debug('webpackUpdate: Starting Incremental Build');
  const promisetoReturn = runWebpackIncrementalBuild(false, context, webpackConfig);
  emit(EventType.WebpackFilesChanged, null);
  return promisetoReturn.then((stats: any) => {
      // the webpack incremental build finished, so reset the list of pending promises
      pendingPromises = [];
      Logger.debug('webpackUpdate: Incremental Build Done, processing Data');
      return webpackBuildComplete(stats, context, webpackConfig);
    }).then(() => {
      context.bundleState = BuildState.SuccessfulBuild;
      return logger.finish();
    }).catch(err => {
      context.bundleState = BuildState.RequiresBuild;
      if (err instanceof IgnorableError) {
        throw err;
      }

      throw logger.fail(err);
    });
}
*/
function webpackWorker(context, configFile) {
    var webpackConfig = getWebpackConfig(context, configFile);
    /*
    let promise: Promise<any> = null;
    if (context.isWatch) {
      promise = runWebpackIncrementalBuild(!context.webpackWatch, context, webpackConfig);
    } else {
      promise = runWebpackFullBuild(webpackConfig);
    }
    */
    var promise = runWebpackFullBuild(webpackConfig);
    return promise
        .then(function (stats) {
        return webpackBuildComplete(stats, context, webpackConfig);
    });
}
exports.webpackWorker = webpackWorker;
function webpackBuildComplete(stats, context, webpackConfig) {
    // if (getBooleanPropertyValue(Constants.ENV_PRINT_WEBPACK_DEPENDENCY_TREE)) {
    //   Logger.debug('Webpack Dependency Map Start');
    //   const dependencyMap = webpackStatsToDependencyMap(context, stats);
    //   printDependencyMap(dependencyMap);
    //   Logger.debug('Webpack Dependency Map End');
    // }
    // set the module files used in this bundle
    // this reference can be used elsewhere in the build (sass)
    if (!context.isProd || !context.optimizeJs) {
        var files = stats.compilation.modules.map(function (webpackObj) {
            if (webpackObj.resource) {
                return webpackObj.resource;
            }
            else {
                return webpackObj.context;
            }
        }).filter(function (path) {
            // just make sure the path is not null
            return path && path.length > 0;
        });
        context.moduleFiles = files;
    }
    return setBundledFiles(context);
}
function setBundledFiles(context) {
    var bundledFilesToWrite = context.fileCache.getAll().filter(function (file) {
        return path_1.dirname(file.path).indexOf(context.buildDir) >= 0 && (file.path.endsWith('.js') || file.path.endsWith('.js.map'));
    });
    context.bundledFilePaths = bundledFilesToWrite.map(function (bundledFile) { return bundledFile.path; });
}
exports.setBundledFiles = setBundledFiles;
function runWebpackFullBuild(config) {
    return new Promise(function (resolve, reject) {
        var callback = function (err, stats) {
            if (err) {
                reject(new errors_1.BuildError(err));
            }
            else {
                var info = stats.toJson();
                if (stats.hasErrors()) {
                    reject(new errors_1.BuildError(info.errors));
                }
                else if (stats.hasWarnings()) {
                    logger_1.Logger.debug(info.warnings);
                    resolve(stats);
                }
                else {
                    resolve(stats);
                }
            }
        };
        var compiler = webpackApi(config);
        compiler.run(callback);
    });
}
exports.runWebpackFullBuild = runWebpackFullBuild;
/*
function runWebpackIncrementalBuild(initializeWatch: boolean, context: BuildContext, config: WebpackConfig) {
  const promise = new Promise((resolve, reject) => {
    // start listening for events, remove listeners once an event is received
    eventEmitter.on(INCREMENTAL_BUILD_FAILED, (err: Error) => {
      Logger.debug('Webpack Bundle Update Failed');
      eventEmitter.removeAllListeners();
      handleWebpackBuildFailure(resolve, reject, err, promise, pendingPromises);
    });

    eventEmitter.on(INCREMENTAL_BUILD_SUCCESS, (stats: any) => {
      Logger.debug('Webpack Bundle Updated');
      eventEmitter.removeAllListeners();
      handleWebpackBuildSuccess(resolve, reject, stats, promise, pendingPromises);
    });

    if (initializeWatch) {
      startWebpackWatch(context, config);
    }
  });

  pendingPromises.push(promise);

  return promise;
}
*/
/*
function handleWebpackBuildFailure(resolve: Function, reject: Function, error: Error, promise: Promise<any>, pendingPromises: Promise<void>[]) {
  // check if the promise if the last promise in the list of pending promises
  if (pendingPromises.length > 0 && pendingPromises[pendingPromises.length - 1] === promise) {
    // reject this one with a build error
    reject(new BuildError(error));
    return;
  }
  // for all others, reject with an ignorable error
  reject(new IgnorableError());
}
*/
/*
function handleWebpackBuildSuccess(resolve: Function, reject: Function, stats: any, promise: Promise<any>, pendingPromises: Promise<void>[]) {
  // check if the promise if the last promise in the list of pending promises
  if (pendingPromises.length > 0 && pendingPromises[pendingPromises.length - 1] === promise) {
    Logger.debug('handleWebpackBuildSuccess: Resolving with Webpack data');
    resolve(stats);
    return;
  }
  // for all others, reject with an ignorable error
  Logger.debug('handleWebpackBuildSuccess: Rejecting with ignorable error');
  reject(new IgnorableError());
}
*/
/*
function startWebpackWatch(context: BuildContext, config: WebpackConfig) {
  Logger.debug('Starting Webpack watch');
  const compiler = webpackApi(config);
  context.webpackWatch = compiler.watch({}, (err: Error, stats: any) => {
    if (err) {
      eventEmitter.emit(INCREMENTAL_BUILD_FAILED, err);
    } else {
      eventEmitter.emit(INCREMENTAL_BUILD_SUCCESS, stats);
    }
  });
}
*/
function getWebpackConfig(context, configFile) {
    configFile = config_1.getUserConfigFile(context, taskInfo, configFile);
    var webpackConfig = config_1.fillConfigDefaults(configFile, taskInfo.defaultConfigFile);
    webpackConfig.entry = config_1.replacePathVars(context, webpackConfig.entry);
    webpackConfig.output.path = config_1.replacePathVars(context, webpackConfig.output.path);
    return webpackConfig;
}
exports.getWebpackConfig = getWebpackConfig;
/*
export function getOutputDest(context: BuildContext) {
  const webpackConfig = getWebpackConfig(context, null);
  return join(webpackConfig.output.path, webpackConfig.output.filename);
}
*/
var taskInfo = {
    fullArg: '--webpack',
    shortArg: '-w',
    envVar: 'IONIC_WEBPACK',
    packageConfig: 'ionic_webpack',
    defaultConfigFile: 'webpack.config'
};
