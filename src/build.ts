import {
  readVersionOfDependencies,
  scanSrcTsFiles,
  validateRequiredFilesExist,
  validateTsConfigSettings
} from './build/util';
import {bundle, bundleUpdate} from './bundle';
import {copy} from './copy';
import {deepLinking, deepLinkingUpdate} from './deep-linking';
import {Logger} from './logger/logger';
import {postprocess} from './postprocess';
import {preprocess, preprocessUpdate} from './preprocess';
import {sass, sassUpdate} from './sass';
import {templateUpdate} from './template';
import {getTsConfig, transpile, transpileUpdate} from './transpile';
import * as Constants from './util/constants';
import {BuildError} from './util/errors';
import {emit, EventType} from './util/events';
import {getBooleanPropertyValue, readFileAsync, setContext} from './util/helpers';
import {BuildContext, BuildState, BuildUpdateMessage, ChangedFile} from './util/interfaces';
import {getInMemoryCompilerHostInstance} from './aot/compiler-host-factory';

export function build(context: BuildContext) {
  setContext(context);
  const logger = new Logger(`build ${(context.isProd ? 'prod' : 'dev')}`);

  return buildWorker(context)
    .then(() => {
      // congrats, we did it!  (•_•) / ( •_•)>⌐■-■ / (⌐■_■)
      logger.finish();
    })
    .catch(err => {
      if (err.isFatal) {
        throw err;
      }
      throw logger.fail(err);
    });
}

async function buildWorker(context: BuildContext) {
  const promises: Promise<any>[] = [];
  promises.push(validateRequiredFilesExist(context));
  promises.push(readVersionOfDependencies(context));
  const results = await Promise.all(promises);
  const tsConfigContents = results[0][1];
  await validateTsConfigSettings(tsConfigContents);
  await buildProject(context);

}

function buildProject(context: BuildContext) {
  buildId++;

  return copy(context)
    .then(() => {
      return scanSrcTsFiles(context);
    })
    .then(() => {
      if (getBooleanPropertyValue(Constants.ENV_PARSE_DEEPLINKS)) {
        return deepLinking(context);
      }
    })
    .then(() => {
      return transpile(context);
    })
    .then(() => {
      return preprocess(context);
    })
    .then(() => {
      return bundle(context);
    })
    .then(() => {
      return sass(context);
    })
    .then(() => {
      return postprocess(context);
    })
    .catch(err => {
      throw new BuildError(err);
    });
}

export function buildUpdate(changedFiles: ChangedFile[], context: BuildContext) {
  return new Promise(resolve => {
    const logger = new Logger('build');
    if (process.send) {
      process.send({event: 'BUILD_STARTED'});
    }

    buildId++;

    const buildUpdateMsg: BuildUpdateMessage = {
      buildId: buildId,
      reloadApp: false
    };
    emit(EventType.BuildUpdateStarted, buildUpdateMsg);

    function buildTasksDone(resolveValue: BuildTaskResolveValue) {
      // all build tasks have been resolved or one of them
      // bailed early, stopping all others to not run
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

      logger.finish('green', true);
      if (process.send) {
        process.send({ event: 'BUILD_FINISHED', data: changedFiles});
      }
      Logger.newLine();

      // we did it!
      resolve();
    }

    // whether it was resolved or rejected, we need to do the same thing
    buildUpdateTasks(changedFiles, context)
      .then(buildTasksDone)
      .catch(err => {
        console.log(err);
        buildTasksDone({
          requiresAppReload: false,
          changedFiles: changedFiles
        });
      });
  });
}

/**
 * Collection of all the build tasks than need to run
 * Each task will only run if it's set with eacn BuildState.
 */
function buildUpdateTasks(changedFiles: ChangedFile[], context: BuildContext) {
  const resolveValue: BuildTaskResolveValue = {
    requiresAppReload: false,
    changedFiles: []
  };

  return loadFiles(changedFiles, context)
    .then(() => {
      // DEEP LINKING
      if (getBooleanPropertyValue(Constants.ENV_PARSE_DEEPLINKS)) {
        return deepLinkingUpdate(changedFiles, context);
      }
    })
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
        // cleanup changed source files from the cache
        let tsConfig = getTsConfig(context);
        let host = getInMemoryCompilerHostInstance(tsConfig.options);
        if (changedFiles.length) {
          // in case of iterative build:
          changedFiles.forEach(file => {
            if (file.ext === '.ts' && file.event === 'change') {
              host.removeSourceFile(file.filePath);
            }
          });
        } else {
          // in case of rebuild:
          host.clear();
        }
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

          context.fileCache.set(outputCssFile, {path: outputCssFile, content: outputCssFile});

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

          context.fileCache.set(outputCssFile, {path: outputCssFile, content: outputCssFile});

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
        context.fileCache.set(changedFile.filePath, {path: changedFile.filePath, content: content});
      });
    }
  }

  return Promise.all(promises);
}

interface BuildTaskResolveValue {
  requiresAppReload: boolean;
  changedFiles: ChangedFile[];
}

let buildId = 0;
