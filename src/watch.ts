import * as buildTask from './build';
import { copyUpdate as copyUpdateHandler } from './copy';
import { Logger } from './logger/logger';
import { canRunTranspileUpdate } from './transpile';
import { BuildError } from './util/errors';
import { BuildContext, BuildState, ChangedFile } from './util/interfaces';

export function watch(context?: BuildContext) {
  // Override all build options if watch is ran.
  context.isProd = false;
  context.optimizeJs = false;
  context.runMinifyJs = false;
  context.runMinifyCss = false;
  context.runAot = false;

  // Ensure that watch is true in context
  context.isWatch = true;

  context.sassState = BuildState.RequiresBuild;
  context.transpileState = BuildState.RequiresBuild;
  context.bundleState = BuildState.RequiresBuild;
  context.deepLinkState = BuildState.RequiresBuild;

  const logger = new Logger('watch');

  function buildDone() {
    // Start reading from stdin so we don't exit.
    process.stdin.resume();

    process.on('message', message => {
      if (message.event === 'FILES_CHANGED') {
        let changedFiles = runBuildUpdate(context, message.data);
        queueOrRunBuildUpdate(changedFiles, context);
        copyUpdateHandler(changedFiles, context).catch(e => console.log(e));
      }
    });

    logger.ready();
    process.send({event: 'READY'});
  }

  return buildTask.build(context)
    .then(buildDone, (err: BuildError) => {
      if (err && err.isFatal) {
        throw err;
      } else {
        buildDone();
      }
    })
    .catch(err => {
      throw logger.fail(err);
    });
}

// exported just for use in unit testing
export let buildUpdatePromise: Promise<any> = null;
export let queuedChangedFileMap = new Map<string, ChangedFile>();

export function queueOrRunBuildUpdate(changedFiles: ChangedFile[], context: BuildContext) {
  if (buildUpdatePromise) {
    // there is an active build going on, so queue our changes and run
    // another build when this one finishes

    // in the event this is called multiple times while queued, we are following a "last event wins" pattern
    // so if someone makes an edit, and then deletes a file, the last "ChangedFile" is the one we act upon
    changedFiles.forEach(changedFile => {
      queuedChangedFileMap.set(changedFile.filePath, changedFile);
    });
    return buildUpdatePromise;
  } else {
    // there is not an active build going going on
    // clear out any queued file changes, and run the build
    queuedChangedFileMap.clear();

    const buildUpdateCompleteCallback: () => Promise<any> = () => {
      // the update is complete, so check if there are pending updates that need to be run
      buildUpdatePromise = null;
      if (queuedChangedFileMap.size > 0) {
        const queuedChangeFileList: ChangedFile[] = [];
        queuedChangedFileMap.forEach(changedFile => {
          queuedChangeFileList.push(changedFile);
        });
        return queueOrRunBuildUpdate(queuedChangeFileList, context);
      }
      return Promise.resolve();
    };

    buildUpdatePromise = buildTask.buildUpdate(changedFiles, context);
    return buildUpdatePromise.then(buildUpdateCompleteCallback).catch((err: Error) => {
      console.log(err);
      return buildUpdateCompleteCallback();
    });
  }
}

export function runBuildUpdate(context: BuildContext, changedFiles: ChangedFile[]) {
  if (!changedFiles || !changedFiles.length) {
    return null;
  }

  const jsFiles = changedFiles.filter(f => f.ext === '.js');
  if (jsFiles.length) {
    // this is mainly for linked modules
    // if a linked library has changed (which would have a js extention)
    // we should do a full transpile build because of this
    context.bundleState = BuildState.RequiresUpdate;
  }

  const tsFiles = changedFiles.filter(f => f.ext === '.ts');
  if (tsFiles.length) {
    let requiresFullBuild = false;
    for (const tsFile of tsFiles) {
      if (!canRunTranspileUpdate(tsFile.event, tsFiles[0].filePath, context)) {
        requiresFullBuild = true;
        break;
      }
    }

    if (requiresFullBuild) {
      // .ts file was added or deleted, we need a full rebuild
      context.transpileState = BuildState.RequiresBuild;
      context.deepLinkState = BuildState.RequiresBuild;
    } else {
      // .ts files have changed, so we can get away with doing an update
      context.transpileState = BuildState.RequiresUpdate;
      context.deepLinkState = BuildState.RequiresUpdate;
    }
  }

  const sassFiles = changedFiles.filter(f => /^\.s(c|a)ss$/.test(f.ext));
  if (sassFiles.length) {
    // .scss or .sass file was changed/added/deleted, lets do a sass update
    context.sassState = BuildState.RequiresUpdate;
  }

  const sassFilesNotChanges = changedFiles.filter(f => f.ext === '.ts' && f.event !== 'change');
  if (sassFilesNotChanges.length) {
    // .ts file was either added or deleted, so we'll have to
    // run sass again to add/remove that .ts file's potential .scss file
    context.sassState = BuildState.RequiresUpdate;
  }

  const htmlFiles = changedFiles.filter(f => f.ext === '.html');
  if (htmlFiles.length) {
    if (context.bundleState === BuildState.SuccessfulBuild && htmlFiles.every(f => f.event === 'change')) {
      // .html file was changed
      // just doing a template update is fine
      context.templateState = BuildState.RequiresUpdate;

    } else {
      // .html file was added/deleted
      // we should do a full transpile build because of this
      context.transpileState = BuildState.RequiresBuild;
      context.deepLinkState = BuildState.RequiresBuild;
    }
  }

  if (context.transpileState === BuildState.RequiresUpdate || context.transpileState === BuildState.RequiresBuild) {
    if (context.bundleState === BuildState.SuccessfulBuild || context.bundleState === BuildState.RequiresUpdate) {
      // transpiling needs to happen
      // and there has already been a successful bundle before
      // so let's just do a bundle update
      context.bundleState = BuildState.RequiresUpdate;
    } else {
      // transpiling needs to happen
      // but we've never successfully bundled before
      // so let's do a full bundle build
      context.bundleState = BuildState.RequiresBuild;
    }
  }
  return changedFiles.concat();
}
