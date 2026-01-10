import { TParsedGithubCommit, getAllGithubCommits, parseGithubEmojisString } from '../modules/Github';
import { getGASProperty, updateGASProperty } from '../modules/GoogleAppsScript';
import { TGcalPrivateGithub, TGoogleCalendar, TParsedGoogleEvent, addEventsToCalendarBatch, getCalendarByName, getTasksFromGoogleCalendars, removeCalendarEvent } from '../modules/GoogleCalendar';
import { CONFIGS } from '../consts/configs';
import { TConfigs, githubConfigsKey } from '../consts/types';
import { logger } from '../utils/abstractions/logger';

function computeHash(ids: string[]): string {
  const sorted = [...ids].sort().join(',');
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, sorted);
  return digest.map((b) => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
}

type TInfo = {
  githubCommits: TParsedGithubCommit[];
  githubGcalCommits: TParsedGoogleEvent<TGcalPrivateGithub>[];
};

type TResultInfoAdded = {
  commits_tracked_to_be_added: TParsedGoogleEvent<TGcalPrivateGithub>[];
  commits_added: TParsedGoogleEvent<TGcalPrivateGithub>[];
};

type TResultInfoDeleted = {
  commits_deleted: TParsedGoogleEvent<TGcalPrivateGithub>[];
  commits_tracked_to_be_deleted: TParsedGoogleEvent<TGcalPrivateGithub>[];
};

export type TGithubSyncResultInfo = TResultInfoAdded & TResultInfoDeleted;

function resetGithubSyncProperties() {
  updateGASProperty('github_commit_changes_count', '0');
  updateGASProperty('github_commits_tracked_to_be_added_hash', '');
  updateGASProperty('github_commits_tracked_to_be_deleted_hash', '');
}

export function getFilterGithubRepos(configs: TConfigs, commits: TParsedGithubCommit[]) {
  const commitsSortedByDate = commits.sort((a, b) => Number(new Date(b.commitDate)) - Number(new Date(a.commitDate)));
  const onlyCommitsOnUserRepositories = commitsSortedByDate.filter((item) => item.repository.includes(configs[githubConfigsKey].username));
  const filteredRepos = onlyCommitsOnUserRepositories.filter((item) => configs[githubConfigsKey].commits_configs.ignored_repos.includes(item.repositoryName) === false);
  return filteredRepos;
}

export function syncGithub(configs: TConfigs) {
  logger.info(`syncing github commits`);

  const info: TInfo = {
    githubCommits: getAllGithubCommits(configs[githubConfigsKey].username, configs[githubConfigsKey].personal_token),
    githubGcalCommits: getTasksFromGoogleCalendars([configs[githubConfigsKey].commits_configs.commits_calendar])
  };

  const oldGithubSyncIndex = getGASProperty('github_commit_changes_count');
  const currentGithubSyncIndex = Number(oldGithubSyncIndex) + 1;

  if (oldGithubSyncIndex === null) {
    resetGithubSyncProperties();
  }

  updateGASProperty('github_commit_changes_count', currentGithubSyncIndex.toString());

  if (currentGithubSyncIndex === 1) {
    logger.info(`checking commit changes: ${currentGithubSyncIndex}/${CONFIGS.REQUIRED_GITHUB_VALIDATIONS_COUNT}`);
  } else if (currentGithubSyncIndex > 1 && currentGithubSyncIndex < CONFIGS.REQUIRED_GITHUB_VALIDATIONS_COUNT) {
    logger.info(`confirming commit changes: ${currentGithubSyncIndex}/${CONFIGS.REQUIRED_GITHUB_VALIDATIONS_COUNT}`);
  } else if (currentGithubSyncIndex === CONFIGS.REQUIRED_GITHUB_VALIDATIONS_COUNT) {
    logger.info(`making commit changes if succeed: ${currentGithubSyncIndex}/${CONFIGS.REQUIRED_GITHUB_VALIDATIONS_COUNT}`);
  }

  const filteredRepos = getFilterGithubRepos(configs, info.githubCommits);
  logger.info(`found ${filteredRepos.length} commits after filtering`);

  const githubCalendar = getCalendarByName(configs[githubConfigsKey].commits_configs.commits_calendar);
  logger.info(`github calendar "${configs[githubConfigsKey].commits_configs.commits_calendar}" found: ${!!githubCalendar}, id: ${githubCalendar?.id ?? 'N/A'}`);
  const result: TGithubSyncResultInfo = {
    ...syncGithubCommitsToAdd({ currentGithubSyncIndex, githubCalendar, githubGcalCommits: info.githubGcalCommits, filteredRepos: filteredRepos, parseCommitEmojis: configs[githubConfigsKey].commits_configs.parse_commit_emojis }),
    ...syncGithubCommitsToDelete({ currentGithubSyncIndex, githubCalendar, githubGcalCommits: info.githubGcalCommits, filteredRepos: filteredRepos })
  };

  if (result.commits_tracked_to_be_added.length === 0 && result.commits_tracked_to_be_deleted.length === 0) {
    logger.info(`reset github commit properties due found no commits tracked`);
    resetGithubSyncProperties();
  }

  return result;
}

// =============================================================================

type TSyncGithubCommitsToAdd = {
  filteredRepos: TParsedGithubCommit[];
  githubCalendar: TGoogleCalendar;
  currentGithubSyncIndex: number;
  githubGcalCommits: TParsedGoogleEvent<TGcalPrivateGithub>[];
  parseCommitEmojis: boolean;
};

function syncGithubCommitsToAdd({ filteredRepos, currentGithubSyncIndex, githubCalendar, githubGcalCommits, parseCommitEmojis }: TSyncGithubCommitsToAdd) {
  const githubSessionStats: TResultInfoAdded = {
    commits_tracked_to_be_added: [],
    commits_added: []
  };

  for (const githubCommitItem of filteredRepos) {
    const sameRepoCommits = githubGcalCommits.filter((gcalItem) => gcalItem.extendedProperties.private.repository === githubCommitItem.repository);
    const hasEquivalentGcalTask = sameRepoCommits.find((gcalItem) => gcalItem.extendedProperties.private.commitDate === githubCommitItem.commitDate && parseGithubEmojisString(gcalItem.extendedProperties.private.commitMessage) === parseGithubEmojisString(githubCommitItem.commitMessage));

    if (!hasEquivalentGcalTask) {
      const commitMessage = parseCommitEmojis ? parseGithubEmojisString(githubCommitItem.commitMessage) : githubCommitItem.commitMessage;

      const extendProps: TGcalPrivateGithub = {
        private: {
          commitMessage,
          commitDate: githubCommitItem.commitDate,
          repository: githubCommitItem.repository,
          repositoryName: githubCommitItem.repositoryName,
          repositoryLink: githubCommitItem.repositoryLink,
          commitId: githubCommitItem.commitId
        }
      };

      const taskEvent: TParsedGoogleEvent<TGcalPrivateGithub> = {
        summary: `${githubCommitItem.repositoryName} - ${commitMessage}`,
        description: `repository: https://github.com/${githubCommitItem.repository}\ncommit: ${githubCommitItem.commitUrl}`,
        start: { dateTime: githubCommitItem.commitDate },
        end: { dateTime: githubCommitItem.commitDate },
        reminders: {
          useDefault: false,
          overrides: []
        },
        extendedProperties: extendProps
      };

      githubSessionStats.commits_tracked_to_be_added.push(taskEvent);
    }
  }

  const commitIdsToAdd = githubSessionStats.commits_tracked_to_be_added.map((item) => item.extendedProperties.private.commitId);
  const currentHash = computeHash(commitIdsToAdd);

  if (currentGithubSyncIndex === 1) {
    logger.info(`storing hash for ${commitIdsToAdd.length} commits to track for addition`);
    updateGASProperty('github_commits_tracked_to_be_added_hash', currentHash);
    return githubSessionStats;
  }

  const lastHash = getGASProperty('github_commits_tracked_to_be_added_hash');

  if (!lastHash) {
    logger.info(`no stored hash found, resetting to step 1`);
    resetGithubSyncProperties();
    updateGASProperty('github_commits_tracked_to_be_added_hash', currentHash);
    return githubSessionStats;
  }

  logger.info(`comparing hashes: stored=${lastHash.slice(0, 8)}... current=${currentHash.slice(0, 8)}...`);

  if (lastHash !== currentHash) {
    logger.info(`reset github commit properties due hash mismatch in added commits`);
    resetGithubSyncProperties();
    return githubSessionStats;
  }

  if (currentGithubSyncIndex === CONFIGS.REQUIRED_GITHUB_VALIDATIONS_COUNT && githubSessionStats.commits_tracked_to_be_added.length > 0) {
    const totalCommits = githubSessionStats.commits_tracked_to_be_added.length;
    const totalBatches = Math.ceil(totalCommits / CONFIGS.BATCH_SIZE);

    logger.info(`adding ${totalCommits} commits to gcal in ${totalBatches} batches of ${CONFIGS.BATCH_SIZE}`);

    for (let i = 0; i < totalCommits; i += CONFIGS.BATCH_SIZE) {
      const batch = githubSessionStats.commits_tracked_to_be_added.slice(i, i + CONFIGS.BATCH_SIZE);
      const addedEvents = addEventsToCalendarBatch(githubCalendar, batch);
      githubSessionStats.commits_added.push(...(addedEvents as TParsedGoogleEvent<TGcalPrivateGithub>[]));
      logger.info(`batch ${Math.floor(i / CONFIGS.BATCH_SIZE) + 1}/${totalBatches}: added ${addedEvents.length} commits`);

      if (i + CONFIGS.BATCH_SIZE < totalCommits) {
        Utilities.sleep(CONFIGS.BATCH_DELAY_MS);
      }
    }

    resetGithubSyncProperties();
  }

  return githubSessionStats;
}

type TSyncGithubCommitsToDelete = {
  filteredRepos: TParsedGithubCommit[];
  githubCalendar: TGoogleCalendar;
  currentGithubSyncIndex: number;
  githubGcalCommits: TParsedGoogleEvent<TGcalPrivateGithub>[];
};

function syncGithubCommitsToDelete({ githubGcalCommits, githubCalendar, currentGithubSyncIndex, filteredRepos }: TSyncGithubCommitsToDelete) {
  const githubSessionStats: TResultInfoDeleted = {
    commits_deleted: [],
    commits_tracked_to_be_deleted: []
  };

  githubGcalCommits.forEach((gcalItem) => {
    const gcalProperties = gcalItem.extendedProperties.private;
    const onlySameRepoCommits = filteredRepos.filter((item) => item.repository === gcalProperties.repository);

    const commitStillExistsOnGithub = onlySameRepoCommits.find((item) => item.commitDate === gcalProperties.commitDate && parseGithubEmojisString(item.commitMessage) === parseGithubEmojisString(gcalProperties.commitMessage));

    if (!commitStillExistsOnGithub) {
      githubSessionStats.commits_tracked_to_be_deleted.push(gcalItem);
    }
  });

  const commitIdsToDelete = githubSessionStats.commits_tracked_to_be_deleted.map((item) => item.extendedProperties.private.commitId);
  const currentHash = computeHash(commitIdsToDelete);

  if (currentGithubSyncIndex === 1) {
    logger.info(`storing hash for ${commitIdsToDelete.length} commits to track for deletion`);
    updateGASProperty('github_commits_tracked_to_be_deleted_hash', currentHash);
    return githubSessionStats;
  }

  const lastHash = getGASProperty('github_commits_tracked_to_be_deleted_hash');

  if (!lastHash) {
    logger.info(`no stored delete hash found, resetting to step 1`);
    resetGithubSyncProperties();
    updateGASProperty('github_commits_tracked_to_be_deleted_hash', currentHash);
    return githubSessionStats;
  }

  logger.info(`comparing delete hashes: stored=${lastHash.slice(0, 8)}... current=${currentHash.slice(0, 8)}...`);

  if (lastHash !== currentHash) {
    logger.info(`reset github commit properties due hash mismatch in deleted commits`);
    resetGithubSyncProperties();
    return githubSessionStats;
  }

  if (currentGithubSyncIndex === CONFIGS.REQUIRED_GITHUB_VALIDATIONS_COUNT && githubSessionStats.commits_tracked_to_be_deleted.length > 0) {
    logger.info(`deleting ${githubSessionStats.commits_tracked_to_be_deleted.length} commits on gcal`);

    for (let x = 0; x < githubSessionStats.commits_tracked_to_be_deleted.length; x++) {
      const item = githubSessionStats.commits_tracked_to_be_deleted[x];
      removeCalendarEvent(githubCalendar, item);
      githubSessionStats.commits_deleted.push(item);
      if (x % 50 === 0 || x === githubSessionStats.commits_tracked_to_be_deleted.length - 1) {
        logger.info(`${x + 1}/${githubSessionStats.commits_tracked_to_be_deleted.length} commits deleted from gcal`);
      }
    }
    resetGithubSyncProperties();
  }

  return githubSessionStats;
}
