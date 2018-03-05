import { getContext } from '../util/helpers';
import { getCommonChunksPlugin } from './common-chunks-plugins';
import { IonicEnvironmentPlugin } from './ionic-environment-plugin';
import { provideCorrectSourcePath } from './source-mapper';

export function getIonicEnvironmentPlugin() {
  const context = getContext();
  return new IonicEnvironmentPlugin(context, true);
}

export function getSourceMapperFunction(): Function {
  return provideCorrectSourcePath;
}

export { getCommonChunksPlugin };
