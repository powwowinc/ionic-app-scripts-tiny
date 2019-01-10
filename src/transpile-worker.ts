import { BuildContext } from './util/interfaces';
import { transpileWorker, TranspileWorkerConfig, TranspileWorkerMessage } from './transpile';


const context: BuildContext = {};

process.on('message', (incomingMsg: TranspileWorkerMessage) => {
  context.rootDir = incomingMsg.rootDir;
  context.buildDir = incomingMsg.buildDir;

  const workerConfig: TranspileWorkerConfig = {
    configFile: incomingMsg.configFile,
    writeInMemory: false,
    sourceMaps: false,
    cache: false,
    inlineTemplate: false,
    useTransforms: false
  };

  transpileWorker(context, workerConfig)
    .then(() => {
      const outgoingMsg: TranspileWorkerMessage = {
        transpileSuccess: true
      };
      if (process.send) {
        process.send(outgoingMsg);
      }
    })
    .catch(() => {
      const outgoingMsg: TranspileWorkerMessage = {
        transpileSuccess: false
      };
      if (process.send) {
        process.send(outgoingMsg);
      }
    });

});
