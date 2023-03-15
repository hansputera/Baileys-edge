import {Toolkit} from 'actions-toolkit';
import fs from 'node:fs';
import path from 'node:path';

import {initialEdgeInfo, processEdgeInfo} from './edge-check';
import {processEdgeClone} from './edge-clone';

Toolkit.run(async (tool) => {
  const {cloneDir, checkFile} = tool.inputs;
  let forceUp = false;

  if (!cloneDir || !checkFile) {
    return tool.exit.failure('Missing \'cloneDir\' or \'checkFile\' params');
  }

  tool.log.debug('Inputs:', {cloneDir, checkFile});

  const statCloneDir = await fs.promises.stat(
      path.resolve(tool.workspace, cloneDir),
  ).catch(() => undefined);
  if (!statCloneDir?.isDirectory()) {
    tool.log.info('Removing exist clone folder');
    await fs.promises.rm(path.resolve(tool.workspace, cloneDir), {
      recursive: true,
    })
        .catch(() => {});
  }

  const statEdgeFile = await fs.promises.stat(
      path.resolve(tool.workspace, checkFile),
  ).catch(() => undefined);

  if (!statEdgeFile?.isFile()) {
    tool.log.warn('Initializing edge file');
    await initialEdgeInfo(path.resolve(tool.workspace, checkFile));
    forceUp = true;
  }

  tool.log.info('Processing edge file information');
  const next = await processEdgeInfo(
      path.resolve(tool.workspace, checkFile), forceUp,
  );

  if (!('version' in next)) {
    tool.exit.success('No available updates');
  } else {
    tool.log.warn('Setting up git');
    await tool.exec('git', [
      'config',
      '--global',
      'user.email',
      'github-actions[bot]@users.noreply.github.com',
    ]);
    await tool.exec('git', [
      'config',
      '--global',
      'user.name',
      'github-actions[bot]',
    ]);
    tool.log.info('Updates is available, processing...');
    processEdgeClone(
        tool,
        path.resolve(tool.workspace, cloneDir),
        next.version,
    ).catch(() => {
      tool.exit.failure('Fail to process the edge!');
    }).then(async () => {
      tool.log.info('Edge process done, pushing metadata...');
      await tool.exec('git', ['add', '.']);
      await tool.exec('git', ['commit', '-m', 'feat: update details']);
      await tool.exec('git', ['push']);

      tool.exit.success('Success!');
    });
  }
}, {
  secrets: ['NPM_TOKEN'],
  event: ['schedule', 'workflow_dispatch', 'push'],
});
