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
    return webpack_1.webpack(context, configFile);
}
function buildJsSourceMaps(context) {
    var webpackConfig = webpack_1.getWebpackConfig(context, null);
    return !!(webpackConfig.devtool && webpackConfig.devtool.length > 0);
}
exports.buildJsSourceMaps = buildJsSourceMaps;
