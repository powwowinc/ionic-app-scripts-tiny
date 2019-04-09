"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = y[op[0] & 2 ? "return" : op[0] ? "throw" : "next"]) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [0, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("./build/util");
var bundle_1 = require("./bundle");
var copy_1 = require("./copy");
var deep_linking_1 = require("./deep-linking");
var logger_1 = require("./logger/logger");
var postprocess_1 = require("./postprocess");
var preprocess_1 = require("./preprocess");
var sass_1 = require("./sass");
var template_1 = require("./template");
var transpile_1 = require("./transpile");
var Constants = require("./util/constants");
var errors_1 = require("./util/errors");
var events_1 = require("./util/events");
var helpers_1 = require("./util/helpers");
var interfaces_1 = require("./util/interfaces");
var compiler_host_factory_1 = require("./aot/compiler-host-factory");
function build(context) {
    helpers_1.setContext(context);
    var logger = new logger_1.Logger("build " + (context.isProd ? 'prod' : 'dev'));
    return buildWorker(context)
        .then(function () {
        // congrats, we did it!  (•_•) / ( •_•)>⌐■-■ / (⌐■_■)
        logger.finish();
    })
        .catch(function (err) {
        if (err.isFatal) {
            throw err;
        }
        throw logger.fail(err);
    });
}
exports.build = build;
function buildWorker(context) {
    return __awaiter(this, void 0, void 0, function () {
        var promises, results, tsConfigContents;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    promises = [];
                    promises.push(util_1.validateRequiredFilesExist(context));
                    promises.push(util_1.readVersionOfDependencies(context));
                    return [4 /*yield*/, Promise.all(promises)];
                case 1:
                    results = _a.sent();
                    tsConfigContents = results[0][1];
                    return [4 /*yield*/, util_1.validateTsConfigSettings(tsConfigContents)];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, buildProject(context)];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function buildProject(context) {
    buildId++;
    return copy_1.copy(context)
        .then(function () {
        return util_1.scanSrcTsFiles(context);
    })
        .then(function () {
        if (helpers_1.getBooleanPropertyValue(Constants.ENV_PARSE_DEEPLINKS)) {
            return deep_linking_1.deepLinking(context);
        }
    })
        .then(function () {
        return transpile_1.transpile(context);
    })
        .then(function () {
        return preprocess_1.preprocess(context);
    })
        .then(function () {
        return bundle_1.bundle(context);
    })
        .then(function () {
        return sass_1.sass(context);
    })
        .then(function () {
        return postprocess_1.postprocess(context);
    })
        .catch(function (err) {
        throw new errors_1.BuildError(err);
    });
}
function buildUpdate(changedFiles, context) {
    return new Promise(function (resolve) {
        var logger = new logger_1.Logger('build');
        if (process.send) {
            process.send({ event: 'BUILD_STARTED' });
        }
        buildId++;
        var buildUpdateMsg = {
            buildId: buildId,
            reloadApp: false
        };
        events_1.emit(events_1.EventType.BuildUpdateStarted, buildUpdateMsg);
        function buildTasksDone(resolveValue) {
            // all build tasks have been resolved or one of them
            // bailed early, stopping all others to not run
            var buildUpdateMsg = {
                buildId: buildId,
                reloadApp: resolveValue.requiresAppReload
            };
            events_1.emit(events_1.EventType.BuildUpdateCompleted, buildUpdateMsg);
            if (!resolveValue.requiresAppReload) {
                // just emit that only a certain file changed
                // this one is useful when only a sass changed happened
                // and the webpack only needs to livereload the css
                // but does not need to do a full page refresh
                events_1.emit(events_1.EventType.FileChange, resolveValue.changedFiles);
            }
            logger.finish('green', true);
            if (process.send) {
                process.send({ event: 'BUILD_FINISHED', data: changedFiles });
            }
            logger_1.Logger.newLine();
            // we did it!
            resolve();
        }
        // whether it was resolved or rejected, we need to do the same thing
        buildUpdateTasks(changedFiles, context)
            .then(buildTasksDone)
            .catch(function (err) {
            console.log(err);
            buildTasksDone({
                requiresAppReload: false,
                changedFiles: changedFiles
            });
        });
    });
}
exports.buildUpdate = buildUpdate;
/**
 * Collection of all the build tasks than need to run
 * Each task will only run if it's set with eacn BuildState.
 */
function buildUpdateTasks(changedFiles, context) {
    var resolveValue = {
        requiresAppReload: false,
        changedFiles: []
    };
    return loadFiles(changedFiles, context)
        .then(function () {
        // DEEP LINKING
        if (helpers_1.getBooleanPropertyValue(Constants.ENV_PARSE_DEEPLINKS)) {
            return deep_linking_1.deepLinkingUpdate(changedFiles, context);
        }
    })
        .then(function () {
        // TEMPLATE
        if (context.templateState === interfaces_1.BuildState.RequiresUpdate) {
            resolveValue.requiresAppReload = true;
            return template_1.templateUpdate(changedFiles, context);
        }
        // no template updates required
        return Promise.resolve();
    })
        .then(function () {
        // TRANSPILE
        if (context.transpileState === interfaces_1.BuildState.RequiresUpdate) {
            resolveValue.requiresAppReload = true;
            // we've already had a successful transpile once, only do an update
            // not that we've also already started a transpile diagnostics only
            // build that only needs to be completed by the end of buildUpdate
            return transpile_1.transpileUpdate(changedFiles, context);
        }
        else if (context.transpileState === interfaces_1.BuildState.RequiresBuild) {
            // cleanup changed source files from the cache
            var tsConfig = transpile_1.getTsConfig(context);
            var host_1 = compiler_host_factory_1.getInMemoryCompilerHostInstance(tsConfig.options);
            if (changedFiles.length) {
                // in case of iterative build:
                changedFiles.forEach(function (file) {
                    if (file.ext === '.ts' && file.event === 'change') {
                        host_1.removeSourceFile(file.filePath);
                    }
                });
            }
            else {
                // in case of rebuild:
                host_1.clear();
            }
            // run the whole transpile
            resolveValue.requiresAppReload = true;
            return transpile_1.transpile(context);
        }
        // no transpiling required
        return Promise.resolve();
    })
        .then(function () {
        // PREPROCESS
        return preprocess_1.preprocessUpdate(changedFiles, context);
    })
        .then(function () {
        // BUNDLE
        if (context.bundleState === interfaces_1.BuildState.RequiresUpdate) {
            // we need to do a bundle update
            resolveValue.requiresAppReload = true;
            return bundle_1.bundleUpdate(changedFiles, context);
        }
        else if (context.bundleState === interfaces_1.BuildState.RequiresBuild) {
            // we need to do a full bundle build
            resolveValue.requiresAppReload = true;
            return bundle_1.bundle(context);
        }
        // no bundling required
        return Promise.resolve();
    })
        .then(function () {
        // SASS
        if (context.sassState === interfaces_1.BuildState.RequiresUpdate) {
            // we need to do a sass update
            return sass_1.sassUpdate(changedFiles, context).then(function (outputCssFile) {
                var changedFile = {
                    event: Constants.FILE_CHANGE_EVENT,
                    ext: '.css',
                    filePath: outputCssFile
                };
                context.fileCache.set(outputCssFile, { path: outputCssFile, content: outputCssFile });
                resolveValue.changedFiles.push(changedFile);
            });
        }
        else if (context.sassState === interfaces_1.BuildState.RequiresBuild) {
            // we need to do a full sass build
            return sass_1.sass(context).then(function (outputCssFile) {
                var changedFile = {
                    event: Constants.FILE_CHANGE_EVENT,
                    ext: '.css',
                    filePath: outputCssFile
                };
                context.fileCache.set(outputCssFile, { path: outputCssFile, content: outputCssFile });
                resolveValue.changedFiles.push(changedFile);
            });
        }
        // no sass build required
        return Promise.resolve();
    })
        .then(function () {
        return resolveValue;
    });
}
function loadFiles(changedFiles, context) {
    // UPDATE IN-MEMORY FILE CACHE
    var promises = [];
    var _loop_1 = function (changedFile) {
        if (changedFile.event === Constants.FILE_DELETE_EVENT) {
            // remove from the cache on delete
            context.fileCache.remove(changedFile.filePath);
        }
        else {
            // load the latest since the file changed
            var promise = helpers_1.readFileAsync(changedFile.filePath);
            promises.push(promise);
            promise.then(function (content) {
                context.fileCache.set(changedFile.filePath, { path: changedFile.filePath, content: content });
            });
        }
    };
    for (var _i = 0, changedFiles_1 = changedFiles; _i < changedFiles_1.length; _i++) {
        var changedFile = changedFiles_1[_i];
        _loop_1(changedFile);
    }
    return Promise.all(promises);
}
var buildId = 0;
