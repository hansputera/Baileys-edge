import fetch from 'undici';
import fs from 'node:fs';
import semver from 'semver';

import {baileysPackageJsonUrl, edgeUrl} from './const';

export const readEdgeFile = (file) => {
  const contents = fs.readFileSync(file, {
    encoding: 'utf8',
  });

  return JSON.parse(contents);
};

/**
 * Get latest commit date
 * @return {Promise<string>}
 */
export const getLatestCommitDate = async () => {
  const response = await fetch.request(edgeUrl)
      .catch(() => undefined);
  if (!response) return '';
  else {
    const data = await response.json()[0];
    return data['commit']['comitter']['date'];
  }
};

/**
 * Get baileys edge version
 * @return {Promise<string>}
 */
export const getBaileysEdgeVersion = async () => {
  const response = await fetch.request(baileysPackageJsonUrl)
      .catch(() => undefined);

  if (!response) return '';
  else {
    const data = await response.json();
    return data['version'] ?? '';
  }
};

/**
 * Compare 2 date
 * @param {string} date1 Date 1
 * @param {string} date2 Date 2
 * @return {Promise<boolean>}
 */
export const compareDate = (date1, date2) => {
  const aDate1 = new Date(date1);
  const bDate2 = new Date(date2);

  if (aDate1.getTime() > bDate2.getTime()) {
    return 1;
  } else {
    return 0;
  }
};

export const initialEdgeInfo = async (edgeFile) => {
  const metadata = {
    latestCommitDate: await getLatestCommitDate(),
    version: await getBaileysEdgeVersion(),
    baileysVersion: '',
  };

  metadata.baileysVersion = metadata.version;

  await fs.promises.writeFile(edgeFile, JSON.stringify(metadata))
      .catch(() => {});
  return metadata;
};

export const processEdgeInfo = async (edgeFile, force) => {
  const latestCommitDate2 = await getLatestCommitDate();
  if (!latestCommitDate2) return {};

  const {
    latestCommitDate,
    version,
    baileysVersion,
  } = readEdgeFile(edgeFile);

  if (!compareDate(latestCommitDate2, latestCommitDate) && !force) return {};

  const metadata = {
    version: '',
    baileysVersion: await getBaileysEdgeVersion(),
    latestCommitDate: latestCommitDate2,
  };

  if (semver.gt(metadata.baileysVersion, baileysVersion)) {
    metadata.version = metadata.baileysVersion;
  } else {
    metadata.version = semver.inc(version, 'minor');
  }

  await fs.promises.writeFile(edgeFile, JSON.stringify(metadata, 0, 2))
      .catch(() => {});

  return metadata;
};
