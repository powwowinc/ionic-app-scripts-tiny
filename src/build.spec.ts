import * as Constants from './util/constants';
import { BuildContext } from './util/interfaces';
import * as helpers from './util/helpers';
import * as build from './build';
import * as buildUtils from './build/util';

import * as bundle from './bundle';
import * as copy from './copy';
import * as clean from './clean';
import * as deepLinking from './deep-linking';

import * as postprocess from './postprocess';
import * as preprocess from './preprocess';
import * as sass from './sass';
import * as transpile from './transpile';

describe('build', () => {
  beforeEach(() => {
    spyOn(clean, 'clean');
    spyOn(helpers, helpers.readFileAsync.name).and.returnValue(Promise.resolve());
    spyOn(transpile, transpile.getTsConfigAsync.name).and.callFake(() => {
      return Promise.resolve({
        'options': {
          'sourceMap': true
        }
      });
    });

    spyOn(buildUtils, buildUtils.scanSrcTsFiles.name).and.returnValue(Promise.resolve());
    spyOn(buildUtils, buildUtils.validateRequiredFilesExist.name).and.returnValue(Promise.resolve(['fileOneContent', 'fileTwoContent']));
    spyOn(buildUtils, buildUtils.validateTsConfigSettings.name).and.returnValue(Promise.resolve());
    spyOn(buildUtils, buildUtils.readVersionOfDependencies.name).and.returnValue(Promise.resolve());
    spyOn(bundle, bundle.bundle.name).and.returnValue(Promise.resolve());
    spyOn(copy, copy.copy.name).and.returnValue(Promise.resolve());
    spyOn(deepLinking, deepLinking.deepLinking.name).and.returnValue(Promise.resolve());
    spyOn(postprocess, postprocess.postprocess.name).and.returnValue(Promise.resolve());
    spyOn(preprocess, preprocess.preprocess.name).and.returnValue(Promise.resolve());
    spyOn(sass, sass.sass.name).and.returnValue(Promise.resolve());
    spyOn(transpile, transpile.transpile.name).and.returnValue(Promise.resolve());
  });

  it('should do a dev build', () => {
    let context: BuildContext = {
      isProd: false,
      optimizeJs: false,
      runMinifyJs: false,
      runMinifyCss: false,
      runAot: false
    };

    const getBooleanPropertyValueSpy = spyOn(helpers, helpers.getBooleanPropertyValue.name).and.returnValue(true);

    return build.build(context).then(() => {
      expect(buildUtils.scanSrcTsFiles).toHaveBeenCalled();
      expect(copy.copy).toHaveBeenCalled();
      expect(deepLinking.deepLinking).toHaveBeenCalled();
      expect(transpile.transpile).toHaveBeenCalled();
      expect(bundle.bundle).toHaveBeenCalled();
      expect(sass.sass).toHaveBeenCalled();
      expect(postprocess.postprocess).toHaveBeenCalled();
      expect(preprocess.preprocess).toHaveBeenCalled();
    });
  });
});

describe('test project requirements before building', () => {
  it('should fail if APP_ENTRY_POINT file does not exist', () => {
    process.env[Constants.ENV_APP_ENTRY_POINT] = 'src/app/main.ts';
    process.env[Constants.ENV_TS_CONFIG] = 'tsConfig.js';
    const error = new Error('App entry point was not found');

    spyOn(helpers, 'readFileAsync').and.returnValue(Promise.reject(error));

    return build.build({}).catch((e) => {
      expect(helpers.readFileAsync).toHaveBeenCalledTimes(1);
      expect(e).toEqual(error);
    });
  });

  it('should fail if IONIC_TS_CONFIG file does not exist', () => {
    process.env[Constants.ENV_APP_ENTRY_POINT] = 'src/app/main.ts';
    process.env[Constants.ENV_TS_CONFIG] = 'tsConfig.js';
    const error = new Error('Config was not found');

    spyOn(helpers, helpers.readFileAsync.name).and.returnValues(Promise.resolve());
    spyOn(transpile, transpile.getTsConfigAsync.name).and.returnValues(Promise.reject(error));

    return build.build({}).catch((e) => {
      expect(transpile.getTsConfigAsync).toHaveBeenCalledTimes(1);
      expect(helpers.readFileAsync).toHaveBeenCalledTimes(1);
      expect(e).toEqual(error);
    });
  });

  it('should fail fataly if IONIC_TS_CONFIG file does not contain valid JSON', () => {
    process.env[Constants.ENV_APP_ENTRY_POINT] = 'src/app/main.ts';
    process.env[Constants.ENV_TS_CONFIG] = 'tsConfig.js';
    spyOn(transpile, transpile.getTsConfigAsync.name).and.callFake(() => {
      return Promise.resolve(`{
        "options" {
          "sourceMap": false
        }
      }
      `);
    });
    spyOn(buildUtils, buildUtils.scanSrcTsFiles.name).and.returnValue(Promise.resolve());
    spyOn(buildUtils, buildUtils.readVersionOfDependencies.name).and.returnValue(Promise.resolve());

    return build.build({}).catch((e) => {
      expect(transpile.getTsConfigAsync).toHaveBeenCalledTimes(1);
      expect(e.isFatal).toBeTruthy();
    });
  });

  it('should fail fataly if IONIC_TS_CONFIG file does not contain compilerOptions.sourceMap === true', () => {
    process.env[Constants.ENV_APP_ENTRY_POINT] = 'src/app/main.ts';
    process.env[Constants.ENV_TS_CONFIG] = 'tsConfig.js';
    spyOn(transpile, transpile.getTsConfigAsync.name).and.callFake(() => {
      return Promise.resolve(`{
        "options": {
          "sourceMap": false
        }
      }
      `);
    });
    spyOn(buildUtils, buildUtils.scanSrcTsFiles.name).and.returnValue(Promise.resolve());
    spyOn(buildUtils, buildUtils.readVersionOfDependencies.name).and.returnValue(Promise.resolve());

    return build.build({}).catch((e) => {
      expect(transpile.getTsConfigAsync).toHaveBeenCalledTimes(1);
      expect(e.isFatal).toBeTruthy();
    });
  });
});
