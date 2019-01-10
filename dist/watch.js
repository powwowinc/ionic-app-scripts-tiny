"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var buildTask = require("./build");
var copy_1 = require("./copy");
var logger_1 = require("./logger/logger");
var transpile_1 = require("./transpile");
var interfaces_1 = require("./util/interfaces");
function watch(context) {
    // Override all build options if watch is ran.
    context.isProd = false;
    context.optimizeJs = false;
    context.runMinifyJs = false;
    context.runMinifyCss = false;
    context.runAot = false;
    // Ensure that watch is true in context
    context.isWatch = true;
    context.sassState = interfaces_1.BuildState.RequiresBuild;
    context.transpileState = interfaces_1.BuildState.RequiresBuild;
    context.bundleState = interfaces_1.BuildState.RequiresBuild;
    context.deepLinkState = interfaces_1.BuildState.RequiresBuild;
    var logger = new logger_1.Logger('watch');
    function buildDone() {
        // Start reading from stdin so we don't exit.
        process.stdin.resume();
        process.on('message', function (message) {
            if (message.event === 'FILES_CHANGED') {
                var changedFiles = runBuildUpdate(context, message.data);
                queueOrRunBuildUpdate(changedFiles, context);
                copy_1.copyUpdate(changedFiles, context).catch(function (e) { return console.log(e); });
            }
        });
        logger.ready();
        if (process.send) {
            process.send({ event: 'READY' });
        }
    }
    return buildTask.build(context)
        .then(buildDone, function (err) {
        if (err && err.isFatal) {
            throw err;
        }
        else {
            buildDone();
        }
    })
        .catch(function (err) {
        throw logger.fail(err);
    });
}
exports.watch = watch;
// exported just for use in unit testing
exports.buildUpdatePromise = null;
exports.queuedChangedFileMap = new Map();
function queueOrRunBuildUpdate(changedFiles, context) {
    if (exports.buildUpdatePromise) {
        // there is an active build going on, so queue our changes and run
        // another build when this one finishes
        // in the event this is called multiple times while queued, we are following a "last event wins" pattern
        // so if someone makes an edit, and then deletes a file, the last "ChangedFile" is the one we act upon
        changedFiles.forEach(function (changedFile) {
            exports.queuedChangedFileMap.set(changedFile.filePath, changedFile);
        });
        return exports.buildUpdatePromise;
    }
    else {
        // there is not an active build going going on
        // clear out any queued file changes, and run the build
        exports.queuedChangedFileMap.clear();
        var buildUpdateCompleteCallback_1 = function () {
            // the update is complete, so check if there are pending updates that need to be run
            exports.buildUpdatePromise = null;
            if (exports.queuedChangedFileMap.size > 0) {
                var queuedChangeFileList_1 = [];
                exports.queuedChangedFileMap.forEach(function (changedFile) {
                    queuedChangeFileList_1.push(changedFile);
                });
                return queueOrRunBuildUpdate(queuedChangeFileList_1, context);
            }
            return Promise.resolve();
        };
        exports.buildUpdatePromise = buildTask.buildUpdate(changedFiles, context);
        return exports.buildUpdatePromise.then(buildUpdateCompleteCallback_1).catch(function (err) {
            console.log(err);
            return buildUpdateCompleteCallback_1();
        });
    }
}
exports.queueOrRunBuildUpdate = queueOrRunBuildUpdate;
function runBuildUpdate(context, changedFiles) {
    if (!changedFiles || !changedFiles.length) {
        return null;
    }
    var jsFiles = changedFiles.filter(function (f) { return f.ext === '.js'; });
    if (jsFiles.length) {
        // this is mainly for linked modules
        // if a linked library has changed (which would have a js extention)
        // we should do a full transpile build because of this
        context.bundleState = interfaces_1.BuildState.RequiresUpdate;
    }
    var tsFiles = changedFiles.filter(function (f) { return f.ext === '.ts'; });
    if (tsFiles.length) {
        var requiresFullBuild = false;
        for (var _i = 0, tsFiles_1 = tsFiles; _i < tsFiles_1.length; _i++) {
            var tsFile = tsFiles_1[_i];
            if (!transpile_1.canRunTranspileUpdate(tsFile.event, tsFiles[0].filePath, context)) {
                requiresFullBuild = true;
                break;
            }
        }
        if (requiresFullBuild) {
            // .ts file was added or deleted, we need a full rebuild
            context.transpileState = interfaces_1.BuildState.RequiresBuild;
            context.deepLinkState = interfaces_1.BuildState.RequiresBuild;
        }
        else {
            // .ts files have changed, so we can get away with doing an update
            context.transpileState = interfaces_1.BuildState.RequiresUpdate;
            context.deepLinkState = interfaces_1.BuildState.RequiresUpdate;
        }
    }
    var sassFiles = changedFiles.filter(function (f) { return /^\.s(c|a)ss$/.test(f.ext); });
    if (sassFiles.length) {
        // .scss or .sass file was changed/added/deleted, lets do a sass update
        context.sassState = interfaces_1.BuildState.RequiresUpdate;
    }
    var sassFilesNotChanges = changedFiles.filter(function (f) { return f.ext === '.ts' && f.event !== 'change'; });
    if (sassFilesNotChanges.length) {
        // .ts file was either added or deleted, so we'll have to
        // run sass again to add/remove that .ts file's potential .scss file
        context.sassState = interfaces_1.BuildState.RequiresUpdate;
    }
    var htmlFiles = changedFiles.filter(function (f) { return f.ext === '.html'; });
    if (htmlFiles.length) {
        if (context.bundleState === interfaces_1.BuildState.SuccessfulBuild && htmlFiles.every(function (f) { return f.event === 'change'; })) {
            // .html file was changed
            // just doing a template update is fine
            context.templateState = interfaces_1.BuildState.RequiresUpdate;
        }
        else {
            // .html file was added/deleted
            // we should do a full transpile build because of this
            context.transpileState = interfaces_1.BuildState.RequiresBuild;
            context.deepLinkState = interfaces_1.BuildState.RequiresBuild;
        }
    }
    if (context.transpileState === interfaces_1.BuildState.RequiresUpdate || context.transpileState === interfaces_1.BuildState.RequiresBuild) {
        if (context.bundleState === interfaces_1.BuildState.SuccessfulBuild || context.bundleState === interfaces_1.BuildState.RequiresUpdate) {
            // transpiling needs to happen
            // and there has already been a successful bundle before
            // so let's just do a bundle update
            context.bundleState = interfaces_1.BuildState.RequiresUpdate;
        }
        else {
            // transpiling needs to happen
            // but we've never successfully bundled before
            // so let's do a full bundle build
            context.bundleState = interfaces_1.BuildState.RequiresBuild;
        }
    }
    return changedFiles.concat();
}
exports.runBuildUpdate = runBuildUpdate;
