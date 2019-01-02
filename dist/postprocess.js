"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs_extra_1 = require("fs-extra");
var path_1 = require("path");
var inject_scripts_1 = require("./core/inject-scripts");
var logger_1 = require("./logger/logger");
var Constants = require("./util/constants");
var helpers_1 = require("./util/helpers");
var source_maps_1 = require("./util/source-maps");
function postprocess(context) {
    var logger = new logger_1.Logger("postprocess");
    return postprocessWorker(context).then(function () {
        logger.finish();
    })
        .catch(function (err) {
        throw logger.fail(err);
    });
}
exports.postprocess = postprocess;
function postprocessWorker(context) {
    var promises = [];
    promises.push(source_maps_1.purgeSourceMapsIfNeeded(context));
    promises.push(inject_scripts_1.updateIndexHtml(context));
    if (helpers_1.getBooleanPropertyValue(Constants.ENV_AOT_WRITE_TO_DISK)) {
        promises.push(writeFilesToDisk(context));
    }
    return Promise.all(promises);
}
function writeFilesToDisk(context) {
    fs_extra_1.emptyDirSync(context.tmpDir);
    var files = context.fileCache.getAll();
    files.forEach(function (file) {
        var dirName = path_1.dirname(file.path);
        var relativePath = path_1.relative(process.cwd(), dirName);
        var tmpPath = path_1.join(context.tmpDir, relativePath);
        var fileName = path_1.basename(file.path);
        var fileToWrite = path_1.join(tmpPath, fileName);
        fs_extra_1.mkdirpSync(tmpPath);
        fs_extra_1.writeFileSync(fileToWrite, file.content);
    });
    return Promise.resolve();
}
exports.writeFilesToDisk = writeFilesToDisk;
