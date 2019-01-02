"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var webpackApi = require("webpack");
var logger_1 = require("./logger/logger");
var config_1 = require("./util/config");
var Constants = require("./util/constants");
var errors_1 = require("./util/errors");
var helpers_1 = require("./util/helpers");
var interfaces_1 = require("./util/interfaces");
/*
 * Due to how webpack watch works, sometimes we start an update event
 * but it doesn't affect the bundle at all, for example adding a new typescript file
 * not imported anywhere or adding an html file not used anywhere.
 * In this case, we'll be left hanging and have screwed up logging when the bundle is modified
 * because multiple promises will resolve at the same time (we queue up promises waiting for an event to occur)
 * To mitigate this, store pending "webpack watch"/bundle update promises in this array and only resolve the
 * the most recent one. reject all others at that time with an IgnorableError.
 */
var pendingPromises = [];
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
function webpackWorker(context, configFile) {
    var webpackConfig = getWebpackConfig(context, configFile);
    var promise = null;
    if (context.isWatch) {
        throw 'runWebpackIncrementalBuild';
        // promise = runWebpackIncrementalBuild(!context.webpackWatch, context, webpackConfig);
    }
    else {
        promise = runWebpackFullBuild(webpackConfig);
    }
    return promise
        .then(function (stats) {
        return webpackBuildComplete(stats, context, webpackConfig);
    });
}
exports.webpackWorker = webpackWorker;
function webpackBuildComplete(stats, context, webpackConfig) {
    if (helpers_1.getBooleanPropertyValue(Constants.ENV_PRINT_WEBPACK_DEPENDENCY_TREE)) {
        logger_1.Logger.debug('Webpack Dependency Map Start');
        var dependencyMap = helpers_1.webpackStatsToDependencyMap(context, stats);
        helpers_1.printDependencyMap(dependencyMap);
        logger_1.Logger.debug('Webpack Dependency Map End');
    }
    // set the module files used in this bundle
    // this reference can be used elsewhere in the build (sass)
    var files = [];
    stats.compilation.modules.forEach(function (webpackModule) {
        if (webpackModule.resource) {
            files.push(webpackModule.resource);
        }
        else if (webpackModule.context) {
            files.push(webpackModule.context);
        }
        else if (webpackModule.fileDependencies) {
            webpackModule.fileDependencies.forEach(function (filePath) {
                files.push(filePath);
            });
        }
    });
    var trimmedFiles = files.filter(function (file) { return file && file.length > 0; });
    context.moduleFiles = trimmedFiles;
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
function getWebpackConfig(context, configFile) {
    configFile = config_1.getUserConfigFile(context, taskInfo, configFile);
    var webpackConfigDictionary = config_1.fillConfigDefaults(configFile, taskInfo.defaultConfigFile);
    var webpackConfig = getWebpackConfigFromDictionary(context, webpackConfigDictionary);
    webpackConfig.entry = config_1.replacePathVars(context, webpackConfig.entry);
    webpackConfig.output.path = config_1.replacePathVars(context, webpackConfig.output.path);
    return webpackConfig;
}
exports.getWebpackConfig = getWebpackConfig;
function getWebpackConfigFromDictionary(context, webpackConfigDictionary) {
    // todo, support more ENV here
    if (context.runAot) {
        return webpackConfigDictionary['prod'];
    }
    return webpackConfigDictionary['dev'];
}
exports.getWebpackConfigFromDictionary = getWebpackConfigFromDictionary;
var taskInfo = {
    fullArg: '--webpack',
    shortArg: '-w',
    envVar: 'IONIC_WEBPACK',
    packageConfig: 'ionic_webpack',
    defaultConfigFile: 'webpack.config'
};
