"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var bundle_components_1 = require("./core/bundle-components");
var logger_1 = require("./logger/logger");
var errors_1 = require("./util/errors");
function preprocess(context) {
    var logger = new logger_1.Logger("preprocess");
    return preprocessWorker(context).then(function () {
        logger.finish();
    })
        .catch(function (err) {
        var error = new errors_1.BuildError(err.message);
        error.isFatal = true;
        throw logger.fail(error);
    });
}
exports.preprocess = preprocess;
function preprocessWorker(context) {
    var bundlePromise = bundle_components_1.bundleCoreComponents(context);
    return Promise.all([bundlePromise]);
}
