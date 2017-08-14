"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var Constants = require("./util/constants");
var errors_1 = require("./util/errors");
var helpers_1 = require("./util/helpers");
var bundle_1 = require("./bundle");
var clean_1 = require("./clean");
var copy_1 = require("./copy");
var logger_1 = require("./logger/logger");
var transpile_1 = require("./transpile");
var postprocess_1 = require("./postprocess");
var preprocess_1 = require("./preprocess");
var sass_1 = require("./sass");
var transpile_2 = require("./transpile");
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
    return Promise.resolve().then(function () {
        // load any 100% required files to ensure they exist
        return validateRequiredFilesExist(context);
    })
        .then(function (_a) {
        var _ = _a[0], tsConfigContents = _a[1];
        return validateTsConfigSettings(tsConfigContents);
    })
        .then(function () {
        return buildProject(context);
    });
}
function validateRequiredFilesExist(context) {
    return Promise.all([
        helpers_1.readFileAsync(process.env[Constants.ENV_APP_ENTRY_POINT]),
        transpile_1.getTsConfigAsync(context, process.env[Constants.ENV_TS_CONFIG])
    ]).catch(function (error) {
        if (error.code === 'ENOENT' && error.path === process.env[Constants.ENV_APP_ENTRY_POINT]) {
            error = new errors_1.BuildError(error.path + " was not found. The \"main.dev.ts\" and \"main.prod.ts\" files have been deprecated. Please create a new file \"main.ts\" containing the content of \"main.dev.ts\", and then delete the deprecated files.\n                            For more information, please see the default Ionic project main.ts file here:\n                            https://github.com/ionic-team/ionic2-app-base/tree/master/src/app/main.ts");
            error.isFatal = true;
            throw error;
        }
        if (error.code === 'ENOENT' && error.path === process.env[Constants.ENV_TS_CONFIG]) {
            error = new errors_1.BuildError([error.path + " was not found. The \"tsconfig.json\" file is missing. This file is required.",
                'For more information please see the default Ionic project tsconfig.json file here:',
                'https://github.com/ionic-team/ionic2-app-base/blob/master/tsconfig.json'].join('\n'));
            error.isFatal = true;
            throw error;
        }
        error.isFatal = true;
        throw error;
    });
}
function validateTsConfigSettings(tsConfigFileContents) {
    return new Promise(function (resolve, reject) {
        try {
            var isValid = tsConfigFileContents.options &&
                tsConfigFileContents.options.sourceMap === true;
            if (!isValid) {
                var error = new errors_1.BuildError(['The "tsconfig.json" file must have compilerOptions.sourceMap set to true.',
                    'For more information please see the default Ionic project tsconfig.json file here:',
                    'https://github.com/ionic-team/ionic2-app-base/blob/master/tsconfig.json'].join('\n'));
                error.isFatal = true;
                return reject(error);
            }
            resolve();
        }
        catch (e) {
            var error = new errors_1.BuildError('The "tsconfig.json" file contains malformed JSON.');
            error.isFatal = true;
            return reject(error);
        }
    });
}
function buildProject(context) {
    // sync empty the www/build directory
    clean_1.clean(context);
    buildId++;
    var copyPromise = copy_1.copy(context);
    // const compilePromise = (context.runAot) ? ngc(context) : transpile(context);
    var compilePromise = transpile_2.transpile(context);
    return compilePromise
        .then(function () {
        return preprocess_1.preprocess(context);
    })
        .then(function () {
        return bundle_1.bundle(context);
    })
        .then(function () {
        // const minPromise = (context.runMinifyJs) ? minifyJs(context) : Promise.resolve();
        var minPromise = Promise.resolve();
        var sassPromise = sass_1.sass(context)
            .then(function () {
            // return (context.runMinifyCss) ? minifyCss(context) : Promise.resolve();
            return Promise.resolve();
        });
        return Promise.all([
            minPromise,
            sassPromise,
            copyPromise
        ]);
    })
        .then(function () {
        return postprocess_1.postprocess(context);
    })
        .then(function () {
        /*
        if (getBooleanPropertyValue(Constants.ENV_ENABLE_LINT)) {
          // kick off the tslint after everything else
          // nothing needs to wait on its completion unless bailing on lint error is enabled
          const result = lint(context, null, false);
          if (getBooleanPropertyValue(Constants.ENV_BAIL_ON_LINT_ERROR)) {
            return result;
          }
        }
        */
    })
        .catch(function (err) {
        throw new errors_1.BuildError(err);
    });
}
/*
export function buildUpdate(changedFiles: ChangedFile[], context: BuildContext) {
  return new Promise(resolve => {
    const logger = new Logger('build');

    buildId++;

    const buildUpdateMsg: BuildUpdateMessage = {
      buildId: buildId,
      reloadApp: false
    };
    emit(EventType.BuildUpdateStarted, buildUpdateMsg);

    function buildTasksDone(resolveValue: BuildTaskResolveValue) {
      // all build tasks have been resolved or one of them
      // bailed early, stopping all others to not run

      parallelTasksPromise.then(() => {
        // all parallel tasks are also done
        // so now we're done done
        const buildUpdateMsg: BuildUpdateMessage = {
          buildId: buildId,
          reloadApp: resolveValue.requiresAppReload
        };
        emit(EventType.BuildUpdateCompleted, buildUpdateMsg);

        if (!resolveValue.requiresAppReload) {
          // just emit that only a certain file changed
          // this one is useful when only a sass changed happened
          // and the webpack only needs to livereload the css
          // but does not need to do a full page refresh
          emit(EventType.FileChange, resolveValue.changedFiles);
        }

        let requiresLintUpdate = false;
        for (const changedFile of changedFiles) {
          if (changedFile.ext === '.ts') {
            if (changedFile.event === 'change' || changedFile.event === 'add') {
              requiresLintUpdate = true;
              break;
            }
          }
        }
        if (requiresLintUpdate) {
          // a ts file changed, so let's lint it too, however
          // this task should run as an after thought
          if (getBooleanPropertyValue(Constants.ENV_ENABLE_LINT)) {
            lintUpdate(changedFiles, context, false);
          }
        }

        logger.finish('green', true);
        Logger.newLine();

        // we did it!
        resolve();
      });
    }

    // kick off all the build tasks
    // and the tasks that can run parallel to all the build tasks
    const buildTasksPromise = buildUpdateTasks(changedFiles, context);
    const parallelTasksPromise = buildUpdateParallelTasks(changedFiles, context);

    // whether it was resolved or rejected, we need to do the same thing
    buildTasksPromise
      .then(buildTasksDone)
      .catch(() => {
        buildTasksDone({
          requiresAppReload: false,
          changedFiles: changedFiles
        });
      });
  });
}
*/
/*
function buildUpdateTasks(changedFiles: ChangedFile[], context: BuildContext) {
  const resolveValue: BuildTaskResolveValue = {
    requiresAppReload: false,
    changedFiles: []
  };

  return loadFiles(changedFiles, context)
    .then(() => {
      // TEMPLATE
      if (context.templateState === BuildState.RequiresUpdate) {
        resolveValue.requiresAppReload = true;
        return templateUpdate(changedFiles, context);
      }
      // no template updates required
      return Promise.resolve();

    })
    .then(() => {
      // TRANSPILE
      if (context.transpileState === BuildState.RequiresUpdate) {
        resolveValue.requiresAppReload = true;
        // we've already had a successful transpile once, only do an update
        // not that we've also already started a transpile diagnostics only
        // build that only needs to be completed by the end of buildUpdate
        return transpileUpdate(changedFiles, context);

      } else if (context.transpileState === BuildState.RequiresBuild) {
        // run the whole transpile
        resolveValue.requiresAppReload = true;
        return transpile(context);
      }
      // no transpiling required
      return Promise.resolve();

    })
    .then(() => {
      // PREPROCESS
      return preprocessUpdate(changedFiles, context);
    })
    .then(() => {
      // BUNDLE
      if (context.bundleState === BuildState.RequiresUpdate) {
        // we need to do a bundle update
        resolveValue.requiresAppReload = true;
        return bundleUpdate(changedFiles, context);

      } else if (context.bundleState === BuildState.RequiresBuild) {
        // we need to do a full bundle build
        resolveValue.requiresAppReload = true;
        return bundle(context);
      }
      // no bundling required
      return Promise.resolve();

    })
    .then(() => {
      // SASS
      if (context.sassState === BuildState.RequiresUpdate) {
        // we need to do a sass update
        return sassUpdate(changedFiles, context).then(outputCssFile => {
          const changedFile: ChangedFile = {
            event: Constants.FILE_CHANGE_EVENT,
            ext: '.css',
            filePath: outputCssFile
          };

          context.fileCache.set(outputCssFile, { path: outputCssFile, content: outputCssFile });

          resolveValue.changedFiles.push(changedFile);
        });

      } else if (context.sassState === BuildState.RequiresBuild) {
        // we need to do a full sass build
        return sass(context).then(outputCssFile => {
          const changedFile: ChangedFile = {
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
    .then(() => {
      return resolveValue;
    });
}
*/
/*
function loadFiles(changedFiles: ChangedFile[], context: BuildContext) {
  // UPDATE IN-MEMORY FILE CACHE
  let promises: Promise<any>[] = [];
  for (const changedFile of changedFiles) {
    if (changedFile.event === Constants.FILE_DELETE_EVENT) {
      // remove from the cache on delete
      context.fileCache.remove(changedFile.filePath);
    } else {
      // load the latest since the file changed
      const promise = readFileAsync(changedFile.filePath);
      promises.push(promise);
      promise.then((content: string) => {
        context.fileCache.set(changedFile.filePath, { path: changedFile.filePath, content: content });
      });
    }
  }

  return Promise.all(promises);
}
*/
/*
interface BuildTaskResolveValue {
  requiresAppReload: boolean;
  changedFiles: ChangedFile[];
}

function buildUpdateParallelTasks(changedFiles: ChangedFile[], context: BuildContext) {
  const parallelTasks: Promise<any>[] = [];

  if (context.transpileState === BuildState.RequiresUpdate) {
    parallelTasks.push(transpileDiagnosticsOnly(context));
  }

  return Promise.all(parallelTasks);
}
*/
var buildId = 0;
