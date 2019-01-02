"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs_extra_1 = require("fs-extra");
var path_1 = require("path");
var logger_1 = require("./logger/logger");
var config_1 = require("./util/config");
var Constants = require("./util/constants");
var glob_util_1 = require("./util/glob-util");
var helpers_1 = require("./util/helpers");
var copyFilePathCache = new Map();
var FILTER_OUT_DIRS_FOR_CLEAN = ['{{WWW}}', '{{BUILD}}'];
function copy(context, configFile) {
    configFile = config_1.getUserConfigFile(context, exports.taskInfo, configFile);
    var logger = new logger_1.Logger('copy');
    return copyWorker(context, configFile)
        .then(function () {
        logger.finish();
    })
        .catch(function (err) {
        throw logger.fail(err);
    });
}
exports.copy = copy;
function copyWorker(context, configFile) {
    var copyConfig = config_1.fillConfigDefaults(configFile, exports.taskInfo.defaultConfigFile);
    var keys = Object.keys(copyConfig);
    var directoriesToCreate = new Set();
    var toCopyList = [];
    return Promise.resolve().then(function () {
        // for each entry, make sure each glob in the list of globs has had string replacement performed on it
        cleanConfigContent(keys, copyConfig, context);
        return getFilesPathsForConfig(keys, copyConfig);
    }).then(function (resultMap) {
        // sweet, we have the absolute path of the files in the glob, and the ability to get the relative path
        // basically, we've got a stew goin'
        return populateFileAndDirectoryInfo(resultMap, copyConfig, toCopyList, directoriesToCreate);
    }).then(function () {
        if (helpers_1.getBooleanPropertyValue(Constants.ENV_CLEAN_BEFORE_COPY)) {
            cleanDirectories(context, directoriesToCreate);
        }
    }).then(function () {
        // create the directories synchronously to avoid any disk locking issues
        var directoryPathList = Array.from(directoriesToCreate);
        for (var _i = 0, directoryPathList_1 = directoryPathList; _i < directoryPathList_1.length; _i++) {
            var directoryPath = directoryPathList_1[_i];
            fs_extra_1.mkdirpSync(directoryPath);
        }
    }).then(function () {
        // sweet, the directories are created, so now let's stream the files
        var promises = [];
        var _loop_1 = function (file) {
            cacheCopyData(file);
            var promise = helpers_1.copyFileAsync(file.absoluteSourcePath, file.absoluteDestPath);
            promise.then(function () {
                logger_1.Logger.debug("Successfully copied " + file.absoluteSourcePath + " to " + file.absoluteDestPath);
            }).catch(function (err) {
                logger_1.Logger.warn("Failed to copy " + file.absoluteSourcePath + " to " + file.absoluteDestPath);
            });
            promises.push(promise);
        };
        for (var _i = 0, toCopyList_1 = toCopyList; _i < toCopyList_1.length; _i++) {
            var file = toCopyList_1[_i];
            _loop_1(file);
        }
        return Promise.all(promises);
    });
}
exports.copyWorker = copyWorker;
function cleanDirectories(context, directoriesToCreate) {
    var filterOut = config_1.replacePathVars(context, FILTER_OUT_DIRS_FOR_CLEAN);
    var directoryPathList = Array.from(directoriesToCreate);
    // filter out any directories that we don't want to allow a clean on
    var cleanableDirectories = directoryPathList.filter(function (directoryPath) {
        for (var _i = 0, filterOut_1 = filterOut; _i < filterOut_1.length; _i++) {
            var uncleanableDir = filterOut_1[_i];
            if (uncleanableDir === directoryPath) {
                return false;
            }
        }
        return true;
    });
    return deleteDirectories(cleanableDirectories);
}
function deleteDirectories(directoryPaths) {
    var promises = [];
    for (var _i = 0, directoryPaths_1 = directoryPaths; _i < directoryPaths_1.length; _i++) {
        var directoryPath = directoryPaths_1[_i];
        promises.push(helpers_1.rimRafAsync(directoryPath));
    }
    return Promise.all(promises);
}
function cacheCopyData(copyObject) {
    var list = copyFilePathCache.get(copyObject.absoluteSourcePath);
    if (!list) {
        list = [];
    }
    list.push(copyObject);
    copyFilePathCache.set(copyObject.absoluteSourcePath, list);
}
function getFilesPathsForConfig(copyConfigKeys, copyConfig) {
    // execute the glob functions to determine what files match each glob
    var srcToResultsMap = new Map();
    var promises = [];
    copyConfigKeys.forEach(function (key) {
        var copyOptions = copyConfig[key];
        if (copyOptions && copyOptions.src) {
            var promise = glob_util_1.globAll(copyOptions.src);
            promises.push(promise);
            promise.then(function (globResultList) {
                srcToResultsMap.set(key, globResultList);
            });
        }
    });
    return Promise.all(promises).then(function () {
        return srcToResultsMap;
    });
}
function populateFileAndDirectoryInfo(resultMap, copyConfig, toCopyList, directoriesToCreate) {
    resultMap.forEach(function (globResults, dictionaryKey) {
        globResults.forEach(function (globResult) {
            // get the relative path from the of each file from the glob
            var relativePath = path_1.relative(globResult.base, globResult.absolutePath);
            // append the relative path to the dest
            var destFileName = path_1.resolve(path_1.join(copyConfig[dictionaryKey].dest, relativePath));
            // store the file information
            toCopyList.push({
                absoluteSourcePath: globResult.absolutePath,
                absoluteDestPath: destFileName
            });
            var directoryToCreate = path_1.dirname(destFileName);
            directoriesToCreate.add(directoryToCreate);
        });
    });
}
function cleanConfigContent(dictionaryKeys, copyConfig, context) {
    dictionaryKeys.forEach(function (key) {
        var copyOption = copyConfig[key];
        if (copyOption && copyOption.src && copyOption.src.length) {
            var cleanedUpSrc = config_1.replacePathVars(context, copyOption.src);
            copyOption.src = cleanedUpSrc;
            var cleanedUpDest = config_1.replacePathVars(context, copyOption.dest);
            copyOption.dest = cleanedUpDest;
        }
    });
}
exports.taskInfo = {
    fullArg: '--copy',
    shortArg: '-y',
    envVar: 'IONIC_COPY',
    packageConfig: 'ionic_copy',
    defaultConfigFile: 'copy.config'
};
