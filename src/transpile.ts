import { readFileSync } from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { getInMemoryCompilerHostInstance } from './aot/compiler-host-factory';
import { buildJsSourceMaps } from './bundle';
import { Logger } from './logger/logger';
import { clearDiagnostics, DiagnosticsType, printDiagnostics } from './logger/logger-diagnostics';
import { runTypeScriptDiagnostics } from './logger/logger-typescript';
import { inlineTemplate } from './template';
import * as Constants from './util/constants';
import { BuildError } from './util/errors';
import { FileCache } from './util/file-cache';
import { changeExtension } from './util/helpers';
import { BuildContext, BuildState } from './util/interfaces';

export function transpile(context: BuildContext) {

  const workerConfig: TranspileWorkerConfig = {
    configFile: getTsConfigPath(context),
    writeInMemory: true,
    sourceMaps: true,
    cache: true,
    inlineTemplate: context.inlineTemplates,
    useTransforms: true
  };

  const logger = new Logger('transpile');

  return transpileWorker(context, workerConfig)
    .then(() => {
      context.transpileState = BuildState.SuccessfulBuild;
      logger.finish();
    })
    .catch(err => {
      context.transpileState = BuildState.RequiresBuild;
      throw logger.fail(err);
    });
}

/**
 * The full TS build for all app files.
 */
export function transpileWorker(context: BuildContext, workerConfig: TranspileWorkerConfig) {

  // let's do this
  return new Promise((resolve, reject) => {

    clearDiagnostics(context, DiagnosticsType.TypeScript);

    // get the tsconfig data
    const tsConfig = getTsConfig(context, workerConfig.configFile);

    if (workerConfig.sourceMaps === false) {
      // the worker config say, "hey, don't ever bother making a source map, because."
      tsConfig.options.sourceMap = false;

    } else {
      // build the ts source maps if the bundler is going to use source maps
      tsConfig.options.sourceMap = buildJsSourceMaps(context);
    }

    // collect up all the files we need to transpile, tsConfig itself does all this for us
    const tsFileNames = cleanFileNames(context, tsConfig.fileNames);

    // for dev builds let's not create d.ts files
    tsConfig.options.declaration = undefined;

    // let's start a new tsFiles object to cache all the transpiled files in
    const host = getInMemoryCompilerHostInstance(tsConfig.options);

    const program = ts.createProgram(tsFileNames, tsConfig.options, host, cachedProgram);

    resetSourceFiles(context.fileCache);

    const beforeArray: ts.TransformerFactory<ts.SourceFile>[] = [];

    program.emit(undefined, (path: string, data: string, writeByteOrderMark: boolean, onError: Function, sourceFiles: ts.SourceFile[]) => {
      if (workerConfig.writeInMemory) {
        writeTranspiledFilesCallback(context.fileCache, path, data, workerConfig.inlineTemplate);
      }
    });

    // cache the typescript program for later use
    cachedProgram = program;

    const tsDiagnostics = program.getSyntacticDiagnostics()
      .concat(program.getSemanticDiagnostics())
      .concat(program.getOptionsDiagnostics());

    const diagnostics = runTypeScriptDiagnostics(context, tsDiagnostics);

    if (diagnostics.length) {
      // darn, we've got some things wrong, transpile failed :(
      printDiagnostics(context, DiagnosticsType.TypeScript, diagnostics, true, true);

      reject(new BuildError('Failed to transpile program'));

    } else {
      // transpile success :)
      resolve();
    }
  });
}


export interface TranspileWorkerMessage {
  rootDir?: string;
  buildDir?: string;
  configFile?: string;
  transpileSuccess?: boolean;
}


function cleanFileNames(context: BuildContext, fileNames: string[]) {
  // make sure we're not transpiling the prod when dev and stuff
  return fileNames;
}

function writeTranspiledFilesCallback(fileCache: FileCache, sourcePath: string, data: string, shouldInlineTemplate: boolean) {
  sourcePath = path.normalize(path.resolve(sourcePath));

  if (sourcePath.endsWith('.js')) {
    let file = fileCache.get(sourcePath);
    if (!file) {
      file = { content: '', path: sourcePath };
    }

    if (shouldInlineTemplate) {
      file.content = inlineTemplate(data, sourcePath);
    } else {
      file.content = data;
    }

    fileCache.set(sourcePath, file);

  } else if (sourcePath.endsWith('.js.map')) {

    let file = fileCache.get(sourcePath);
    if (!file) {
      file = { content: '', path: sourcePath };
    }
    file.content = data;

    fileCache.set(sourcePath, file);
  }
}

export async function getTsConfigAsync(context: BuildContext, tsConfigPath?: string): Promise<TsConfig> {
  return await getTsConfig(context, tsConfigPath);
}

export function getTsConfig(context: BuildContext, tsConfigPath?: string): TsConfig {
  let config: TsConfig = null;
  tsConfigPath = tsConfigPath || getTsConfigPath(context);

  const tsConfigFile = ts.readConfigFile(tsConfigPath, path => readFileSync(path, 'utf8'));

  if (!tsConfigFile) {
    throw new BuildError(`tsconfig: invalid tsconfig file, "${tsConfigPath}"`);

  } else if (tsConfigFile.error && tsConfigFile.error.messageText) {
    throw new BuildError(`tsconfig: ${tsConfigFile.error.messageText}`);

  } else if (!tsConfigFile.config) {
    throw new BuildError(`tsconfig: invalid config, "${tsConfigPath}""`);

  } else {
    const parsedConfig = ts.parseJsonConfigFileContent(
      tsConfigFile.config,
      ts.sys, context.rootDir,
      {}, tsConfigPath);

    const diagnostics = runTypeScriptDiagnostics(context, parsedConfig.errors);

    if (diagnostics.length) {
      printDiagnostics(context, DiagnosticsType.TypeScript, diagnostics, true, true);
      throw new BuildError(`tsconfig: invalid config, "${tsConfigPath}""`);
    }

    config = {
      options: parsedConfig.options,
      fileNames: parsedConfig.fileNames,
      raw: parsedConfig.raw
    };
  }

  return config;
}

export function resetSourceFiles(fileCache: FileCache) {
  fileCache.getAll().forEach(file => {
    if (path.extname(file.path) === `.ts${inMemoryFileCopySuffix}`) {
      const originalExtension = changeExtension(file.path, '.ts');
      fileCache.set(originalExtension, {
        path: originalExtension,
        content: file.content
      });
      fileCache.getRawStore().delete(file.path);
    }
  });
}

export const inMemoryFileCopySuffix = 'original';

let cachedProgram: ts.Program = null;
let cachedTsConfig: TsConfig = null;

export function getTsConfigPath(context: BuildContext) {
  return process.env[Constants.ENV_TS_CONFIG];
}

export interface TsConfig {
  options: ts.CompilerOptions;
  fileNames: string[];
  raw: any;
}

export interface TranspileWorkerConfig {
  configFile: string;
  writeInMemory: boolean;
  sourceMaps: boolean;
  cache: boolean;
  inlineTemplate: boolean;
  useTransforms: boolean;
}
