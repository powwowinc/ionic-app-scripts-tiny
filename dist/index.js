"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var build_1 = require("./build");
exports.build = build_1.build;
var bundle_1 = require("./bundle");
exports.bundle = bundle_1.bundle;
var clean_1 = require("./clean");
exports.clean = clean_1.clean;
var copy_1 = require("./copy");
exports.copy = copy_1.copy;
var sass_1 = require("./sass");
exports.sass = sass_1.sass;
var transpile_1 = require("./transpile");
exports.transpile = transpile_1.transpile;
__export(require("./util/config"));
__export(require("./util/helpers"));
__export(require("./util/interfaces"));
__export(require("./util/constants"));
var config_1 = require("./util/config");
var helpers_1 = require("./util/helpers");
var logger_1 = require("./logger/logger");
function run(task) {
    try {
        logger_1.Logger.info("ionic-app-scripts " + helpers_1.getAppScriptsVersion(), 'cyan');
    }
    catch (e) { }
    try {
        var context = config_1.generateContext(null);
        require("../dist/" + task)[task](context).catch(function (err) {
            errorLog(task, err);
        });
    }
    catch (e) {
        errorLog(task, e);
    }
}
exports.run = run;
function errorLog(task, e) {
    logger_1.Logger.error("ionic-app-script task: \"" + task + "\"");
    if (e && e.toString() !== 'Error') {
        logger_1.Logger.error("" + e);
    }
    if (e.stack) {
        logger_1.Logger.unformattedError(e.stack);
    }
    process.exit(1);
}
