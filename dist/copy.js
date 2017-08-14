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
/*
export function copyUpdate(changedFiles: ChangedFile[], context: BuildContext) {
  const logger = new Logger('copy update');
  const configFile = getUserConfigFile(context, taskInfo, null);
  const copyConfig: CopyConfig = fillConfigDefaults(configFile, taskInfo.defaultConfigFile);
  const keys = Object.keys(copyConfig);
  const directoriesToCreate = new Set<string>();
  const toCopyList: CopyToFrom[] = [];
  return Promise.resolve().then(() => {
    changedFiles.forEach(changedFile => Logger.debug(`copyUpdate, event: ${changedFile.event}, path: ${changedFile.filePath}`));
    // for each entry, make sure each glob in the list of globs has had string replacement performed on it
    cleanConfigContent(keys, copyConfig, context);

    return getFilesPathsForConfig(keys, copyConfig);
  }).then((resultMap: Map<string, GlobResult[]>) => {
    // sweet, we have the absolute path of the files in the glob, and the ability to get the relative path
    // basically, we've got a stew goin'
    return populateFileAndDirectoryInfo(resultMap, copyConfig, toCopyList, directoriesToCreate);
  }).then(() => {
    // first, process any deleted directories
    const promises: Promise<void>[] = [];
    const directoryDeletions = changedFiles.filter(changedFile => changedFile.event === 'unlinkDir');
    directoryDeletions.forEach(changedFile => promises.push(processRemoveDir(changedFile)));
    return Promise.all(promises);
  }).then(() => {
    // process any deleted files
    const promises: Promise<void>[] = [];
    const fileDeletions = changedFiles.filter(changedFile => changedFile.event === 'unlink');
    fileDeletions.forEach(changedFile => promises.push(processRemoveFile(changedFile)));
    return Promise.all(promises);
  }).then(() => {
    const promises: Promise<void>[] = [];
    const additions = changedFiles.filter(changedFile => changedFile.event === 'change' || changedFile.event === 'add' || changedFile.event === 'addDir');
    additions.forEach(changedFile => {
      const matchingItems = toCopyList.filter(toCopyEntry => toCopyEntry.absoluteSourcePath === changedFile.filePath);
      matchingItems.forEach(matchingItem => {
        // create the directories first (if needed)
        mkdirpSync(pathDirname(matchingItem.absoluteDestPath));
        // cache the data and copy the files
        cacheCopyData(matchingItem);
        promises.push(copyFileAsync(matchingItem.absoluteSourcePath, matchingItem.absoluteDestPath));
        emit(EventType.FileChange, additions);
      });
    });
    return Promise.all(promises);
  }).then(() => {
    logger.finish('green', true);
    Logger.newLine();
  }).catch(err => {
    throw logger.fail(err);
  });
}
*/
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
/*
function processRemoveFile(changedFile: ChangedFile) {
  // delete any destination files that match the source file
  const list = copyFilePathCache.get(changedFile.filePath) || [];
  copyFilePathCache.delete(changedFile.filePath);
  const promises: Promise<void[]>[] = [];
  const deletedFilePaths: string[] = [];
  list.forEach(copiedFile => {
    const promise = unlinkAsync(copiedFile.absoluteDestPath);
    promises.push(promise);
    promise.catch(err => {
      if (err && err.message && err.message.indexOf('ENOENT') >= 0) {
        Logger.warn(`Failed to delete ${copiedFile.absoluteDestPath} because it doesn't exist`);
        return;
      }
      throw err;
    });
    deletedFilePaths.push(copiedFile.absoluteDestPath);
  });
  emit(EventType.FileDelete, deletedFilePaths);
  return Promise.all(promises).catch(err => {
  });
}

function processRemoveDir(changedFile: ChangedFile): Promise<any> {
  // remove any files from the cache where the dirname equals the provided path
  const keysToRemove: string[] = [];
  const directoriesToRemove = new Set<string>();
  copyFilePathCache.forEach((copiedFiles: CopyToFrom[], filePath: string) => {
    if (pathDirname(filePath) === changedFile.filePath) {
      keysToRemove.push(filePath);
      copiedFiles.forEach(copiedFile => directoriesToRemove.add(pathDirname(copiedFile.absoluteDestPath)));
    }
  });
  keysToRemove.forEach(keyToRemove => copyFilePathCache.delete(keyToRemove));
  // the entries are removed from the cache, now just rim raf the directoryPath
  const promises: Promise<void>[] = [];
  directoriesToRemove.forEach(directoryToRemove => {
    promises.push(rimRafAsync(directoryToRemove));
  });
  emit(EventType.DirectoryDelete, Array.from(directoriesToRemove));
  return Promise.all(promises);
}
*/
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
/*
export function copyConfigToWatchConfig(context: BuildContext): Watcher {
  if (!context) {
    context = generateContext(context);
  }
  const configFile = getUserConfigFile(context, taskInfo, '');
  const copyConfig: CopyConfig = fillConfigDefaults(configFile, taskInfo.defaultConfigFile);
  let results: GlobObject[] = [];
  for (const key of Object.keys(copyConfig)) {
    if (copyConfig[key] && copyConfig[key].src) {
      const list = generateGlobTasks(copyConfig[key].src, {});
      results = results.concat(list);
    }
  }

  const paths: string[] = [];
  let ignored: string[] = [];
  for (const result of results) {
    paths.push(result.pattern);
    if (result.opts && result.opts.ignore) {
      ignored = ignored.concat(result.opts.ignore);
    }
  }

  return {
    paths: paths,
    options: {
      ignored: ignored
    },
    callback: watchCopyUpdate
  };
}

export interface CopySrcToDestResult {
  success: boolean;
  src: string;
  dest: string;
  errorMessage: string;
}
*/
exports.taskInfo = {
    fullArg: '--copy',
    shortArg: '-y',
    envVar: 'IONIC_COPY',
    packageConfig: 'ionic_copy',
    defaultConfigFile: 'copy.config'
};
