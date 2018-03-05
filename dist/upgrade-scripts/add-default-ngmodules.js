"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var path_1 = require("path");
var config_1 = require("../util/config");
var glob_util_1 = require("../util/glob-util");
var helpers_1 = require("../util/helpers");
function getTsFilePaths(context) {
    var tsFileGlobString = path_1.join(context.srcDir, '**', '*.ts');
    return glob_util_1.globAll([tsFileGlobString]).then(function (results) {
        return results.map(function (result) { return result.absolutePath; });
    });
}
exports.getTsFilePaths = getTsFilePaths;
function readTsFiles(context, tsFilePaths) {
    var promises = tsFilePaths.map(function (tsFilePath) {
        var promise = helpers_1.readFileAsync(tsFilePath);
        promise.then(function (fileContent) {
            context.fileCache.set(tsFilePath, { path: tsFilePath, content: fileContent });
        });
        return promise;
    });
    return Promise.all(promises);
}
exports.readTsFiles = readTsFiles;
function generateAndWriteNgModules(fileCache) {
    // fileCache.getAll().forEach(file => {
    //   const sourceFile = getTypescriptSourceFile(file.path, file.content);
    //   const deepLinkDecoratorData = getDeepLinkDecoratorContentForSourceFile(sourceFile);
    //   if (deepLinkDecoratorData) {
    //     // we have a valid DeepLink decorator
    //     const correspondingNgModulePath = getNgModulePathFromCorrespondingPage(file.path);
    //     const ngModuleFile = fileCache.get(correspondingNgModulePath);
    //     if (!ngModuleFile) {
    //       // the ngModule file does not exist, so go ahead and create a default one
    //       const defaultNgModuleContent = generateDefaultDeepLinkNgModuleContent(file.path, deepLinkDecoratorData.className);
    //       const ngModuleFilePath = changeExtension(file.path, getStringPropertyValue(Constants.ENV_NG_MODULE_FILE_NAME_SUFFIX));
    //       writeFileSync(ngModuleFilePath, defaultNgModuleContent);
    //     }
    //   }
    // });
}
exports.generateAndWriteNgModules = generateAndWriteNgModules;
function run() {
    var context = config_1.generateContext();
    // find out what files to read
    return getTsFilePaths(context).then(function (filePaths) {
        // read the files
        return readTsFiles(context, filePaths);
    }).then(function () {
        generateAndWriteNgModules(context.fileCache);
    });
}
run();
