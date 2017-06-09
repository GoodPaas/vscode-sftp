import * as path from 'path';

import * as output from './output';
import { transport, sync, remove } from './conveyer';
import getRemoteFs from './remoteFs';
import LocalFileSystem from '../model/Fs/LocalFileSystem';
import { disableWatcher, enableWatcher } from './fileWatcher';

function failedTask(result, index, array) {
  return result && result.error;
}

function printFailTask(result) {
  return output.print([
    '',
    '------',
    `target: ${result.target}`,
    `context: ${result.op}`,
    `reason: ${result.payload.message}`,
    '------',
    '',
  ].join('\n'));
}

function printResult(msg, result, silent) {
  output.debug(`task ${msg} finish`);
  const fails = [].concat(result).filter(failedTask)
  if (fails.length) {
    fails.forEach(printFailTask);
    output.showOutPutChannel();
    output.status.msg(`${msg} failed`, 2000);
  } else {
    if (!silent) {
      output.status.msg(`${msg} done`, 2000);
    }
  }
}

const getHostInfo = config => ({
  protocol: config.protocol,
  host: config.host,
  port: config.port,
  username: config.username,
  password: config.password,
  privateKeyPath: config.privateKeyPath,
  passphrase: config.passphrase,
  passive: config.passive,
});

const createTask = (name, func) => (source, config, silent: boolean = false) =>
  getRemoteFs(getHostInfo(config))
    .then(remotefs => func(source, config, remotefs))
    .then(result => printResult(name, result, silent));
  

export const upload = createTask('upload', (source, config, remotefs) => transport(
  source,
  config.remotePath,
  new LocalFileSystem(path),
  remotefs,
  {
    ignore: config.ignore,
  }
));

export const download = createTask('download', (source, config, remotefs) => {
  disableWatcher();
  return transport(
    config.remotePath,
    source,
    remotefs,
    new LocalFileSystem(path),
    {
      ignore: config.ignore,
    }
  ).then(r => {
    enableWatcher();
    return r;
  }, e => {
    enableWatcher();
    throw e;
  });
});

export const sync2Remote = createTask('sync remote', (source, config, remotefs) => sync(
  source,
  config.remotePath,
  new LocalFileSystem(path),
  remotefs,
  {
    ignore: config.ignore,
    model: config.syncMode,
    
  }
));

export const sync2Local = createTask('sync local', (source, config, remotefs) => {
  disableWatcher();
  return sync(
    config.remotePath,
    source,
    remotefs,
    new LocalFileSystem(path),
    {
      ignore: config.ignore,
      model: config.syncMode,
    }
  ).then(r => {
    enableWatcher();
    return r;
  }, e => {
    enableWatcher();
    throw e;
  });
});

export const removeRemote = createTask('remove', (source, config, remotefs) => remove(
  source,
  remotefs,
  {
    ignore: config.ignore,
    skipDir: config.skipDir,
  }
));
