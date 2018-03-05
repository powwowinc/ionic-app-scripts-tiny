import { dirname } from 'path';

import * as webpackApi from 'webpack';

import { Logger } from './logger/logger';
import { fillConfigDefaults, getUserConfigFile, replacePathVars } from './util/config';
import * as Constants from './util/constants';
import { BuildError } from './util/errors';
import { getBooleanPropertyValue, printDependencyMap, webpackStatsToDependencyMap } from './util/helpers';
import { BuildContext, BuildState, TaskInfo } from './util/interfaces';

/*
 * Due to how webpack watch works, sometimes we start an update event
 * but it doesn't affect the bundle at all, for example adding a new typescript file
 * not imported anywhere or adding an html file not used anywhere.
 * In this case, we'll be left hanging and have screwed up logging when the bundle is modified
 * because multiple promises will resolve at the same time (we queue up promises waiting for an event to occur)
 * To mitigate this, store pending "webpack watch"/bundle update promises in this array and only resolve the
 * the most recent one. reject all others at that time with an IgnorableError.
 */
let pendingPromises: Promise<any>[] = [];

export function webpack(context: BuildContext, configFile: string) {
  configFile = getUserConfigFile(context, taskInfo, configFile);

  const logger = new Logger('webpack');

  return webpackWorker(context, configFile)
    .then(() => {
      context.bundleState = BuildState.SuccessfulBuild;
      logger.finish();
    })
    .catch(err => {
      context.bundleState = BuildState.RequiresBuild;
      throw logger.fail(err);
    });
}

export function webpackWorker(context: BuildContext, configFile: string): Promise<any> {
  const webpackConfig = getWebpackConfig(context, configFile);

  let promise: Promise<any> = null;
  if (context.isWatch) {
    throw 'runWebpackIncrementalBuild';
    // promise = runWebpackIncrementalBuild(!context.webpackWatch, context, webpackConfig);
  } else {
    promise = runWebpackFullBuild(webpackConfig);
  }

  return promise
    .then((stats: any) => {
      return webpackBuildComplete(stats, context, webpackConfig);
    });
}

function webpackBuildComplete(stats: any, context: BuildContext, webpackConfig: WebpackConfig) {
  if (getBooleanPropertyValue(Constants.ENV_PRINT_WEBPACK_DEPENDENCY_TREE)) {
    Logger.debug('Webpack Dependency Map Start');
    const dependencyMap = webpackStatsToDependencyMap(context, stats);
    printDependencyMap(dependencyMap);
    Logger.debug('Webpack Dependency Map End');
  }

  // set the module files used in this bundle
  // this reference can be used elsewhere in the build (sass)
  const files: string[] = [];
  stats.compilation.modules.forEach((webpackModule: any) => {
    if (webpackModule.resource) {
      files.push(webpackModule.resource);
    } else if (webpackModule.context) {
      files.push(webpackModule.context);
    } else if (webpackModule.fileDependencies) {
      webpackModule.fileDependencies.forEach((filePath: string) => {
        files.push(filePath);
      });
    }
  });

  const trimmedFiles = files.filter(file => file && file.length > 0);

  context.moduleFiles = trimmedFiles;

  return setBundledFiles(context);
}

export function setBundledFiles(context: BuildContext) {
  const bundledFilesToWrite = context.fileCache.getAll().filter(file => {
    return dirname(file.path).indexOf(context.buildDir) >= 0 && (file.path.endsWith('.js') || file.path.endsWith('.js.map'));
  });
  context.bundledFilePaths = bundledFilesToWrite.map(bundledFile => bundledFile.path);
}

export function runWebpackFullBuild(config: WebpackConfig) {
  return new Promise((resolve, reject) => {
    const callback = (err: Error, stats: any) => {
      if (err) {
        reject(new BuildError(err));
      } else {
        const info = stats.toJson();

        if (stats.hasErrors()) {
          reject(new BuildError(info.errors));
        } else if (stats.hasWarnings()) {
          Logger.debug(info.warnings);
          resolve(stats);
        } else {
          resolve(stats);
        }
      }
    };
    const compiler = webpackApi(config as any);
    compiler.run(callback);
  });
}

export function getWebpackConfig(context: BuildContext, configFile: string): WebpackConfig {
  configFile = getUserConfigFile(context, taskInfo, configFile);
  const webpackConfigDictionary = fillConfigDefaults(configFile, taskInfo.defaultConfigFile);
  const webpackConfig: WebpackConfig = getWebpackConfigFromDictionary(context, webpackConfigDictionary);
  webpackConfig.entry = replacePathVars(context, webpackConfig.entry);
  webpackConfig.output.path = replacePathVars(context, webpackConfig.output.path);

  return webpackConfig;
}

export function getWebpackConfigFromDictionary(context: BuildContext, webpackConfigDictionary: any): WebpackConfig {
  // todo, support more ENV here
  if (context.runAot) {
    return webpackConfigDictionary['prod'];
  }
  return webpackConfigDictionary['dev'];
}

const taskInfo: TaskInfo = {
  fullArg: '--webpack',
  shortArg: '-w',
  envVar: 'IONIC_WEBPACK',
  packageConfig: 'ionic_webpack',
  defaultConfigFile: 'webpack.config'
};


export interface WebpackConfig {
  // https://www.npmjs.com/package/webpack
  devtool: string;
  entry: string | { [key: string]: any };
  output: WebpackOutputObject;
  resolve: WebpackResolveObject;
}

export interface WebpackOutputObject {
  path: string;
  filename: string;
}

export interface WebpackResolveObject {
  extensions: string[];
  modules: string[];
}
