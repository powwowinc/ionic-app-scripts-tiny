import { BuildContext, CoreCompiler } from '../util/interfaces';
import { Logger } from '../logger/logger';
import * as fs from 'fs';
import * as path from 'path';
import * as nodeSass from 'node-sass';
import * as typescript from 'typescript';

export function bundleCoreComponents(context: BuildContext) {
  const compiler = getCoreCompiler(context);

  if (!compiler) {
    Logger.debug(`skipping core component bundling`);
    return Promise.resolve();
  }

  const config = {
    srcDir: context.coreDir,
    destDir: context.buildDir,
    attrCase: 'lower',
    packages: {
      fs: fs,
      path: path,
      nodeSass: nodeSass,
      typescript: typescript
    },
    watch: context.isWatch
  };

  return compiler.bundle(config).then(results => {
    if (results.errors) {
      results.errors.forEach((err: string) => {
        Logger.error(`compiler.bundle, results: ${err}`);
      });

    } else if (results.componentRegistry) {
      // add the component registry to the global window.Ionic
      context.ionicGlobal = context.ionicGlobal || {};
      context.ionicGlobal['components'] = results.componentRegistry;
    }
  }).catch(err => {
    if (err) {
      if (err.stack) {
        Logger.error(`compiler.bundle: ${err.stack}`);
      } else {
        Logger.error(`compiler.bundle: ${err}`);
      }
    } else {
      Logger.error(`compiler.bundle error`);
    }
  });
}


function getCoreCompiler(context: BuildContext): CoreCompiler {
  try {
    return require(context.coreCompilerFilePath);
  } catch (e) {
    Logger.debug(`error loading core compiler: ${context.coreCompilerFilePath}, ${e}`);
  }
  return null;
}
