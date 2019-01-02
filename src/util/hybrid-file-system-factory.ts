import { getContext } from './helpers';
import { HybridFileSystem } from './hybrid-file-system';

let instance: HybridFileSystem = null;

export function getInstance(writeToDisk: boolean) {
  if (!instance) {
    instance = new HybridFileSystem(getContext().fileCache);
  }
  instance.setWriteToDisk(writeToDisk);
  return instance;
}
