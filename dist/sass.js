"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var interfaces_1 = require("./util/interfaces");
var errors_1 = require("./util/errors");
var bundle_1 = require("./bundle");
var fs_extra_1 = require("fs-extra");
var config_1 = require("./util/config");
var logger_1 = require("./logger/logger");
var logger_sass_1 = require("./logger/logger-sass");
var logger_diagnostics_1 = require("./logger/logger-diagnostics");
var node_sass_1 = require("node-sass");
function sass(context, configFile) {
    configFile = config_1.getUserConfigFile(context, taskInfo, configFile);
    var logger = new logger_1.Logger('sass');
    return sassWorker(context, configFile)
        .then(function (outFile) {
        context.sassState = interfaces_1.BuildState.SuccessfulBuild;
        logger.finish();
        return outFile;
    })
        .catch(function (err) {
        context.sassState = interfaces_1.BuildState.RequiresBuild;
        throw logger.fail(err);
    });
}
exports.sass = sass;
function sassUpdate(changedFiles, context) {
    var configFile = config_1.getUserConfigFile(context, taskInfo, null);
    var logger = new logger_1.Logger('sass update');
    return sassWorker(context, configFile)
        .then(function (outFile) {
        context.sassState = interfaces_1.BuildState.SuccessfulBuild;
        logger.finish();
        return outFile;
    })
        .catch(function (err) {
        context.sassState = interfaces_1.BuildState.RequiresBuild;
        throw logger.fail(err);
    });
}
exports.sassUpdate = sassUpdate;
function sassWorker(context, configFile) {
    var sassConfig = getSassConfig(context, configFile);
    var bundlePromise = [];
    if (!context.moduleFiles && !sassConfig.file) {
        // sass must always have a list of all the used module files
        // so ensure we bundle if moduleFiles are currently unknown
        bundlePromise.push(bundle_1.bundle(context));
    }
    return Promise.all(bundlePromise).then(function () {
        logger_diagnostics_1.clearDiagnostics(context, logger_diagnostics_1.DiagnosticsType.Sass);
        // where the final css output file is saved
        if (!sassConfig.outFile) {
            sassConfig.outFile = path_1.join(context.buildDir, sassConfig.outputFilename);
        }
        logger_1.Logger.debug("sass outFile: " + sassConfig.outFile);
        // import paths where the sass compiler will look for imports
        sassConfig.includePaths.unshift(path_1.join(context.srcDir));
        logger_1.Logger.debug("sass includePaths: " + sassConfig.includePaths);
        // sass import sorting algorithms incase there was something to tweak
        sassConfig.sortComponentPathsFn = (sassConfig.sortComponentPathsFn || defaultSortComponentPathsFn);
        sassConfig.sortComponentFilesFn = (sassConfig.sortComponentFilesFn || defaultSortComponentFilesFn);
        return render(context, sassConfig);
    });
}
exports.sassWorker = sassWorker;
function getSassConfig(context, configFile) {
    configFile = config_1.getUserConfigFile(context, taskInfo, configFile);
    return config_1.fillConfigDefaults(configFile, taskInfo.defaultConfigFile);
}
exports.getSassConfig = getSassConfig;
function render(context, sassConfig) {
    return new Promise(function (resolve, reject) {
        sassConfig.omitSourceMapUrl = false;
        node_sass_1.render(sassConfig, function (sassError, sassResult) {
            var diagnostics = logger_sass_1.runSassDiagnostics(context, sassError);
            if (diagnostics.length) {
                logger_diagnostics_1.printDiagnostics(context, logger_diagnostics_1.DiagnosticsType.Sass, diagnostics, true, true);
                // sass render error :(
                reject(new errors_1.BuildError('Failed to render sass to css'));
            }
            else {
                // sass render success :)
                renderSassSuccess(context, sassResult, sassConfig).then(function (outFile) {
                    resolve(outFile);
                }).catch(function (err) {
                    reject(new errors_1.BuildError(err));
                });
            }
        });
    });
}
function renderSassSuccess(context, sassResult, sassConfig) {
    return writeOutput(context, sassConfig, sassResult.css.toString());
}
function writeOutput(context, sassConfig, cssOutput) {
    return new Promise(function (resolve, reject) {
        logger_1.Logger.debug("sass start write output: " + sassConfig.outFile);
        var buildDir = path_1.dirname(sassConfig.outFile);
        fs_extra_1.ensureDirSync(buildDir);
        fs_extra_1.writeFile(sassConfig.outFile, cssOutput, function (cssWriteErr) {
            if (cssWriteErr) {
                reject(new errors_1.BuildError("Error writing css file, " + sassConfig.outFile + ": " + cssWriteErr));
            }
            else {
                logger_1.Logger.debug("sass saved output: " + sassConfig.outFile);
                // css file all saved
                // note that we're not waiting on the css map to finish saving
                resolve(sassConfig.outFile);
            }
        });
    });
}
function defaultSortComponentPathsFn(a, b) {
    var aIndexOfNodeModules = a.indexOf('node_modules');
    var bIndexOfNodeModules = b.indexOf('node_modules');
    if (aIndexOfNodeModules > -1 && bIndexOfNodeModules > -1) {
        return (a > b) ? 1 : -1;
    }
    if (aIndexOfNodeModules > -1 && bIndexOfNodeModules === -1) {
        return -1;
    }
    if (aIndexOfNodeModules === -1 && bIndexOfNodeModules > -1) {
        return 1;
    }
    return (a > b) ? 1 : -1;
}
function defaultSortComponentFilesFn(a, b) {
    var aPeriods = a.split('.').length;
    var bPeriods = b.split('.').length;
    var aDashes = a.split('-').length;
    var bDashes = b.split('-').length;
    if (aPeriods > bPeriods) {
        return 1;
    }
    else if (aPeriods < bPeriods) {
        return -1;
    }
    if (aDashes > bDashes) {
        return 1;
    }
    else if (aDashes < bDashes) {
        return -1;
    }
    return (a > b) ? 1 : -1;
}
var taskInfo = {
    fullArg: '--sass',
    shortArg: '-s',
    envVar: 'IONIC_SASS',
    packageConfig: 'ionic_sass',
    defaultConfigFile: 'sass.config'
};
