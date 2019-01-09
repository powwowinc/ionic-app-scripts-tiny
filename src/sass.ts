import { dirname, join } from 'path';
import { BuildContext, BuildState, ChangedFile, TaskInfo } from './util/interfaces';
import { BuildError } from './util/errors';
import { bundle } from './bundle';
import { ensureDirSync, writeFile } from 'fs-extra';
import { fillConfigDefaults, getUserConfigFile } from './util/config';
import { Logger } from './logger/logger';
import { runSassDiagnostics } from './logger/logger-sass';
import { clearDiagnostics, DiagnosticsType, printDiagnostics } from './logger/logger-diagnostics';
import { render as nodeSassRender, Result, SassError } from 'node-sass';


export function sass(context: BuildContext, configFile?: string) {
  configFile = getUserConfigFile(context, taskInfo, configFile);

  const logger = new Logger('sass');

  return sassWorker(context, configFile)
    .then(outFile => {
      context.sassState = BuildState.SuccessfulBuild;
      logger.finish();
      return outFile;
    })
    .catch(err => {
      context.sassState = BuildState.RequiresBuild;
      throw logger.fail(err);
    });
}


export function sassUpdate(changedFiles: ChangedFile[], context: BuildContext) {
  const configFile = getUserConfigFile(context, taskInfo, null);

  const logger = new Logger('sass update');

  return sassWorker(context, configFile)
    .then(outFile => {
      context.sassState = BuildState.SuccessfulBuild;
      logger.finish();
      return outFile;
    })
    .catch(err => {
      context.sassState = BuildState.RequiresBuild;
      throw logger.fail(err);
    });
}


export function sassWorker(context: BuildContext, configFile: string) {
  const sassConfig: SassConfig = getSassConfig(context, configFile);

  const bundlePromise: Promise<any>[] = [];
  if (!context.moduleFiles && !sassConfig.file) {
    // sass must always have a list of all the used module files
    // so ensure we bundle if moduleFiles are currently unknown
    bundlePromise.push(bundle(context));
  }

  return Promise.all(bundlePromise).then(() => {
    clearDiagnostics(context, DiagnosticsType.Sass);

    // where the final css output file is saved
    if (!sassConfig.outFile) {
      sassConfig.outFile = join(context.buildDir, sassConfig.outputFilename);
    }
    Logger.debug(`sass outFile: ${sassConfig.outFile}`);

    // import paths where the sass compiler will look for imports
    sassConfig.includePaths.unshift(join(context.srcDir));
    Logger.debug(`sass includePaths: ${sassConfig.includePaths}`);

    // sass import sorting algorithms incase there was something to tweak
    sassConfig.sortComponentPathsFn = (sassConfig.sortComponentPathsFn || defaultSortComponentPathsFn);
    sassConfig.sortComponentFilesFn = (sassConfig.sortComponentFilesFn || defaultSortComponentFilesFn);

    return render(context, sassConfig);
  });
}

export function getSassConfig(context: BuildContext, configFile: string): SassConfig {
  configFile = getUserConfigFile(context, taskInfo, configFile);
  return fillConfigDefaults(configFile, taskInfo.defaultConfigFile);
}

function render(context: BuildContext, sassConfig: SassConfig): Promise<string> {
  return new Promise((resolve, reject) => {

    sassConfig.omitSourceMapUrl = false;

    nodeSassRender(sassConfig, (sassError: SassError, sassResult: Result) => {
      const diagnostics = runSassDiagnostics(context, sassError);

      if (diagnostics.length) {
        printDiagnostics(context, DiagnosticsType.Sass, diagnostics, true, true);
        // sass render error :(
        reject(new BuildError('Failed to render sass to css'));

      } else {
        // sass render success :)
        renderSassSuccess(context, sassResult, sassConfig).then(outFile => {
          resolve(outFile);

        }).catch(err => {
          reject(new BuildError(err));
        });
      }
    });
  });
}


function renderSassSuccess(context: BuildContext, sassResult: Result, sassConfig: SassConfig): Promise<string> {
  return writeOutput(context, sassConfig, sassResult.css.toString());
}

function writeOutput(context: BuildContext, sassConfig: SassConfig, cssOutput: string): Promise<string> {
  return new Promise((resolve, reject) => {

    Logger.debug(`sass start write output: ${sassConfig.outFile}`);

    const buildDir = dirname(sassConfig.outFile);
    ensureDirSync(buildDir);

    writeFile(sassConfig.outFile, cssOutput, (cssWriteErr: any) => {
      if (cssWriteErr) {
        reject(new BuildError(`Error writing css file, ${sassConfig.outFile}: ${cssWriteErr}`));

      } else {
        Logger.debug(`sass saved output: ${sassConfig.outFile}`);

        // css file all saved
        // note that we're not waiting on the css map to finish saving
        resolve(sassConfig.outFile);
      }
    });
  });
}


function defaultSortComponentPathsFn(a: any, b: any): number {
  const aIndexOfNodeModules = a.indexOf('node_modules');
  const bIndexOfNodeModules = b.indexOf('node_modules');

  if (aIndexOfNodeModules > -1 && bIndexOfNodeModules > -1) {
    return (a > b) ? 1 : -1;
  }

  if (aIndexOfNodeModules > -1 && bIndexOfNodeModules === -1) {
    return -1;
  }

  if (aIndexOfNodeModules === -1 && bIndexOfNodeModules > -1) {
    return 1;
  }

  return (a > b) ? 1 : -1;
}


function defaultSortComponentFilesFn(a: any, b: any): number {
  const aPeriods = a.split('.').length;
  const bPeriods = b.split('.').length;
  const aDashes = a.split('-').length;
  const bDashes = b.split('-').length;

  if (aPeriods > bPeriods) {
    return 1;
  } else if (aPeriods < bPeriods) {
    return -1;
  }

  if (aDashes > bDashes) {
    return 1;
  } else if (aDashes < bDashes) {
    return -1;
  }

  return (a > b) ? 1 : -1;
}


const taskInfo: TaskInfo = {
  fullArg: '--sass',
  shortArg: '-s',
  envVar: 'IONIC_SASS',
  packageConfig: 'ionic_sass',
  defaultConfigFile: 'sass.config'
};


export interface SassConfig {
  // https://www.npmjs.com/package/node-sass
  outputFilename?: string;
  outFile?: string;
  file?: string;
  data?: string;
  includePaths?: string[];
  excludeModules?: string[];
  includeFiles?: RegExp[];
  excludeFiles?: RegExp[];
  directoryMaps?: { [key: string]: string };
  sortComponentPathsFn?: (a: any, b: any) => number;
  sortComponentFilesFn?: (a: any, b: any) => number;
  variableSassFiles?: string[];
  sourceMap?: string;
  omitSourceMapUrl?: boolean;
  sourceMapContents?: boolean;
}
