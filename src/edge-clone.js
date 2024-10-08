/** @typedef {import('actions-toolkit').Toolkit} Toolkit */

import fs from 'node:fs';
import path from 'node:path';
import npmPublish from '@jsdevtools/npm-publish';

import {baileysRepositoryUrl} from './const';

export const readClonePackageJson = async (file) => {
  const contents = await fs.promises.readFile(file, {encoding: 'utf8'});
  return JSON.parse(contents);
};

/**
 * Edge clone process
 * @param {Toolkit} toolkit Toolkit stuff
 * @param {string} cloneDir Clone directory target
 * @param {string} nextVersion Next update version
 * @return {Promise<boolean>}
 */
export const processEdgeClone = async (toolkit, cloneDir, nextVersion) => {
  await toolkit.exec('git', [
    'clone',
    baileysRepositoryUrl,
    cloneDir,
    '--branch',
    'master',
  ]);

  await toolkit.exec('npm', ['install'], {
    cwd: cloneDir,
  });

  toolkit.log.warn('Extracting WAProto');
  await toolkit.exec('npm', ['install'], {
    cwd: path.resolve(cloneDir, 'proto-extract'),
  });
  await toolkit.exec('npm', ['start'], {
    cwd: path.resolve(cloneDir, 'proto-extract'),
  }).catch(() => {
    toolkit.log.error('Fail to regenerating the WAProto');
  });

  toolkit.log.warn('Installing protobufjs-cli');
  await toolkit.exec('npm', ['install', 'protobufjs-cli', '-D'], {
    cwd: cloneDir,
  });

  toolkit.log.warn('Regenerating WAProto protobuf');
  await toolkit.exec('npm', ['run', 'gen:protobuf'], {
    cwd: cloneDir,
  });

  toolkit.log.warn('Rewriting package name...');

  const json = await readClonePackageJson(
      path.resolve(cloneDir, 'package.json'),
  );
  json['name'] = '@gampang-pkg/baileys-edge';
  json['version'] = nextVersion;

  await fs.promises.writeFile(
      path.resolve(cloneDir, 'package.json'),
      JSON.stringify(json, 0, 2),
  );

  toolkit.log.warn('Compiling entire library');
  await toolkit.exec('npm', ['run', 'build:tsc'], {
    cwd: cloneDir,
  });

  toolkit.log.warn('Publishing to NPM!');
  await npmPublish({
    package: path.resolve(cloneDir, 'package.json'),
    token: process.env.NPM_TOKEN,
    access: 'public',
  }).catch((err) => {
    tool.log.warn('Fail to publish the npm package');
    tool.log.error(err);
  });

  toolkit.log.warn('Cleaning up the ' + cloneDir);
  await toolkit.exec('rm', ['-rf', cloneDir]);
};
