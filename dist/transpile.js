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
var Constants = require("./util/constants");
var interfaces_1 = require("./util/interfaces");
var errors_1 = require("./util/errors");
var bundle_1 = require("./bundle");
var template_1 = require("./template");
var logger_1 = require("./logger/logger");
var fs_1 = require("fs");
var logger_typescript_1 = require("./logger/logger-typescript");
var logger_diagnostics_1 = require("./logger/logger-diagnostics");
var path = require("path");
var ts = require("typescript");
function transpile(context) {
    var workerConfig = {
        configFile: getTsConfigPath(context),
        writeInMemory: true,
        sourceMaps: true,
        cache: true,
        inlineTemplate: context.inlineTemplates
    };
    var logger = new logger_1.Logger('transpile');
    return transpileWorker(context, workerConfig)
        .then(function () {
        context.transpileState = interfaces_1.BuildState.SuccessfulBuild;
        logger.finish();
    })
        .catch(function (err) {
        context.transpileState = interfaces_1.BuildState.RequiresBuild;
        throw logger.fail(err);
    });
}
exports.transpile = transpile;
/*
export function transpileUpdate(changedFiles: ChangedFile[], context: BuildContext) {
  const workerConfig: TranspileWorkerConfig = {
    configFile: getTsConfigPath(context),
    writeInMemory: true,
    sourceMaps: true,
    cache: false,
    inlineTemplate: context.inlineTemplates
  };

  const logger = new Logger('transpile update');

  const changedTypescriptFiles = changedFiles.filter(changedFile => changedFile.ext === '.ts');

  const promises: Promise<void>[] = [];
  for (const changedTypescriptFile of changedTypescriptFiles) {
    promises.push(transpileUpdateWorker(changedTypescriptFile.event, changedTypescriptFile.filePath, context, workerConfig));
  }

  return Promise.all(promises)
    .then(() => {
      context.transpileState = BuildState.SuccessfulBuild;
      logger.finish();
    })
    .catch(err => {
      context.transpileState = BuildState.RequiresBuild;
      throw logger.fail(err);
    });

}
*/
function transpileWorker(context, workerConfig) {
    // let's do this
    return new Promise(function (resolve, reject) {
        logger_diagnostics_1.clearDiagnostics(context, logger_diagnostics_1.DiagnosticsType.TypeScript);
        // get the tsconfig data
        var tsConfig = getTsConfig(context, workerConfig.configFile);
        if (workerConfig.sourceMaps === false) {
            // the worker config say, "hey, don't ever bother making a source map, because."
            tsConfig.options.sourceMap = false;
        }
        else {
            // build the ts source maps if the bundler is going to use source maps
            tsConfig.options.sourceMap = bundle_1.buildJsSourceMaps(context);
        }
        // collect up all the files we need to transpile, tsConfig itself does all this for us
        var tsFileNames = cleanFileNames(context, tsConfig.fileNames);
        // for dev builds let's not create d.ts files
        tsConfig.options.declaration = undefined;
        // let's start a new tsFiles object to cache all the transpiled files in
        var host = ts.createCompilerHost(tsConfig.options);
        var program = ts.createProgram(tsFileNames, tsConfig.options, host, cachedProgram);
        program.emit(undefined, function (path, data, writeByteOrderMark, onError, sourceFiles) {
            if (workerConfig.writeInMemory) {
                writeSourceFiles(context.fileCache, sourceFiles);
                writeTranspiledFilesCallback(context.fileCache, path, data, workerConfig.inlineTemplate);
            }
        });
        // cache the typescript program for later use
        cachedProgram = program;
        var tsDiagnostics = program.getSyntacticDiagnostics()
            .concat(program.getSemanticDiagnostics())
            .concat(program.getOptionsDiagnostics());
        var diagnostics = logger_typescript_1.runTypeScriptDiagnostics(context, tsDiagnostics);
        if (diagnostics.length) {
            // darn, we've got some things wrong, transpile failed :(
            logger_diagnostics_1.printDiagnostics(context, logger_diagnostics_1.DiagnosticsType.TypeScript, diagnostics, true, true);
            reject(new errors_1.BuildError('Failed to transpile program'));
        }
        else {
            // transpile success :)
            resolve();
        }
    });
}
exports.transpileWorker = transpileWorker;
function cleanFileNames(context, fileNames) {
    // make sure we're not transpiling the prod when dev and stuff
    return fileNames;
}
function writeSourceFiles(fileCache, sourceFiles) {
    for (var _i = 0, sourceFiles_1 = sourceFiles; _i < sourceFiles_1.length; _i++) {
        var sourceFile = sourceFiles_1[_i];
        var fileName = path.normalize(path.resolve(sourceFile.fileName));
        fileCache.set(fileName, { path: fileName, content: sourceFile.text });
    }
}
function writeTranspiledFilesCallback(fileCache, sourcePath, data, shouldInlineTemplate) {
    sourcePath = path.normalize(path.resolve(sourcePath));
    if (sourcePath.endsWith('.js')) {
        var file = fileCache.get(sourcePath);
        if (!file) {
            file = { content: '', path: sourcePath };
        }
        if (shouldInlineTemplate) {
            file.content = template_1.inlineTemplate(data, sourcePath);
        }
        else {
            file.content = data;
        }
        fileCache.set(sourcePath, file);
    }
    else if (sourcePath.endsWith('.js.map')) {
        var file = fileCache.get(sourcePath);
        if (!file) {
            file = { content: '', path: sourcePath };
        }
        file.content = data;
        fileCache.set(sourcePath, file);
    }
}
function getTsConfigAsync(context, tsConfigPath) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getTsConfig(context, tsConfigPath)];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
exports.getTsConfigAsync = getTsConfigAsync;
function getTsConfig(context, tsConfigPath) {
    var config = null;
    tsConfigPath = tsConfigPath || getTsConfigPath(context);
    var tsConfigFile = ts.readConfigFile(tsConfigPath, function (path) { return fs_1.readFileSync(path, 'utf8'); });
    if (!tsConfigFile) {
        throw new errors_1.BuildError("tsconfig: invalid tsconfig file, \"" + tsConfigPath + "\"");
    }
    else if (tsConfigFile.error && tsConfigFile.error.messageText) {
        throw new errors_1.BuildError("tsconfig: " + tsConfigFile.error.messageText);
    }
    else if (!tsConfigFile.config) {
        throw new errors_1.BuildError("tsconfig: invalid config, \"" + tsConfigPath + "\"\"");
    }
    else {
        var parsedConfig = ts.parseJsonConfigFileContent(tsConfigFile.config, ts.sys, context.rootDir, {}, tsConfigPath);
        var diagnostics = logger_typescript_1.runTypeScriptDiagnostics(context, parsedConfig.errors);
        if (diagnostics.length) {
            logger_diagnostics_1.printDiagnostics(context, logger_diagnostics_1.DiagnosticsType.TypeScript, diagnostics, true, true);
            throw new errors_1.BuildError("tsconfig: invalid config, \"" + tsConfigPath + "\"\"");
        }
        config = {
            options: parsedConfig.options,
            fileNames: parsedConfig.fileNames,
            raw: parsedConfig.raw
        };
    }
    return config;
}
exports.getTsConfig = getTsConfig;
function transpileTsString(context, filePath, stringToTranspile) {
    if (!cachedTsConfig) {
        cachedTsConfig = getTsConfig(context);
    }
    var transpileOptions = {
        compilerOptions: cachedTsConfig.options,
        fileName: filePath,
        reportDiagnostics: true,
    };
    transpileOptions.compilerOptions.allowJs = true;
    transpileOptions.compilerOptions.sourceMap = true;
    // transpile this one module
    return ts.transpileModule(stringToTranspile, transpileOptions);
}
exports.transpileTsString = transpileTsString;
var cachedProgram = null;
var cachedTsConfig = null;
function getTsConfigPath(context) {
    return process.env[Constants.ENV_TS_CONFIG];
}
exports.getTsConfigPath = getTsConfigPath;
