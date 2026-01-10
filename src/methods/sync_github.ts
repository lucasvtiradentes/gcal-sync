import { TParsedGithubCommit, getAllGithubCommits, parseGithubEmojisString, getGithubDateRange } from '../modules/Github';
import { getGASProperty, updateGASProperty } from '../modules/GoogleAppsScript';
import { TGcalPrivateGithub, TGoogleCalendar, TParsedGoogleEvent, addEventsToCalendarBatch, getCalendarByName, getTasksFromGoogleCalendarsWithDateRange, removeCalendarEvent } from '../modules/GoogleCalendar';
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

  const dateRange = getGithubDateRange();
  logger.info(`[DEBUG] github date range: ${dateRange.startDate} to ${dateRange.endDate}`);

  const githubCommits = getAllGithubCommits(configs[githubConfigsKey].username, configs[githubConfigsKey].personal_token);
  logger.info(`[DEBUG] fetched ${githubCommits.length} total commits from github`);

  const githubGcalCommits = getTasksFromGoogleCalendarsWithDateRange<TGcalPrivateGithub>(
    [configs[githubConfigsKey].commits_configs.commits_calendar],
    dateRange.startDate,
    dateRange.endDate
  );
  logger.info(`[DEBUG] fetched ${githubGcalCommits.length} events from gcal within date range`);

  const info: TInfo = {
    githubCommits,
    githubGcalCommits
  };

  const oldGithubSyncIndex = getGASProperty('github_commit_changes_count');
  const currentGithubSyncIndex = Number(oldGithubSyncIndex) + 1;
  logger.info(`[DEBUG] sync index: ${oldGithubSyncIndex} -> ${currentGithubSyncIndex}`);

  if (oldGithubSyncIndex === null) {
    logger.info(`[DEBUG] oldGithubSyncIndex is null, resetting properties`);
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
  logger.info(`[DEBUG] filtering removed ${info.githubCommits.length - filteredRepos.length} commits`);

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
  logger.info(`[DEBUG][ADD] starting syncGithubCommitsToAdd`);
  logger.info(`[DEBUG][ADD] filteredRepos: ${filteredRepos.length}, gcalCommits: ${githubGcalCommits.length}, parseEmojis: ${parseCommitEmojis}`);

  const githubSessionStats: TResultInfoAdded = {
    commits_tracked_to_be_added: [],
    commits_added: []
  };

  const uniqueRepos = new Set(filteredRepos.map((c) => c.repository));
  const gcalRepos = new Set(githubGcalCommits.map((c) => c.extendedProperties?.private?.repository).filter(Boolean));
  logger.info(`[DEBUG][ADD] unique github repos: ${uniqueRepos.size}, unique gcal repos: ${gcalRepos.size}`);

  const missingRepos = [...uniqueRepos].filter((r) => !gcalRepos.has(r));
  if (missingRepos.length > 0) {
    logger.info(`[DEBUG][ADD] repos in github but NOT in gcal: ${missingRepos.join(', ')}`);
  }

  const gcalCommitsByRepo = new Map<string, typeof githubGcalCommits>();
  for (const gcalItem of githubGcalCommits) {
    const repo = gcalItem.extendedProperties?.private?.repository;
    if (repo) {
      if (!gcalCommitsByRepo.has(repo)) {
        gcalCommitsByRepo.set(repo, []);
      }
      gcalCommitsByRepo.get(repo)!.push(gcalItem);
    }
  }

  let matchedCount = 0;
  let noMatchReasonStats = { noSameRepo: 0, noDateMatch: 0, noMessageMatch: 0 };
  const sampleMismatches: { repo: string; ghDate: string; ghMsg: string }[] = [];

  for (const githubCommitItem of filteredRepos) {
    const sameRepoCommits = gcalCommitsByRepo.get(githubCommitItem.repository) ?? [];

    if (sameRepoCommits.length === 0) {
      noMatchReasonStats.noSameRepo++;

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
        reminders: { useDefault: false, overrides: [] },
        extendedProperties: extendProps
      };
      githubSessionStats.commits_tracked_to_be_added.push(taskEvent);

      if (sampleMismatches.length < 5) {
        sampleMismatches.push({ repo: githubCommitItem.repository, ghDate: githubCommitItem.commitDate, ghMsg: githubCommitItem.commitMessage.slice(0, 50) });
      }
      continue;
    }

    let foundMatch = false;
    let hadDateMismatch = false;
    let hadMessageMismatch = false;

    for (const gcalItem of sameRepoCommits) {
      const gcalPrivate = gcalItem.extendedProperties?.private;
      if (!gcalPrivate) continue;

      const dateMatch = gcalPrivate.commitDate === githubCommitItem.commitDate;
      const gcalMsg = parseGithubEmojisString(gcalPrivate.commitMessage || '');
      const ghMsg = parseGithubEmojisString(githubCommitItem.commitMessage);
      const msgMatch = gcalMsg === ghMsg;

      if (dateMatch && msgMatch) {
        foundMatch = true;
        break;
      }

      if (!dateMatch) hadDateMismatch = true;
      if (dateMatch && !msgMatch) hadMessageMismatch = true;
    }

    if (foundMatch) {
      matchedCount++;
    } else {
      if (hadMessageMismatch) noMatchReasonStats.noMessageMatch++;
      else if (hadDateMismatch) noMatchReasonStats.noDateMatch++;

      if (sampleMismatches.length < 5) {
        sampleMismatches.push({ repo: githubCommitItem.repository, ghDate: githubCommitItem.commitDate, ghMsg: githubCommitItem.commitMessage.slice(0, 50) });
      }

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

  logger.info(`[DEBUG][ADD] matched ${matchedCount}/${filteredRepos.length} commits`);
  logger.info(`[DEBUG][ADD] commits to add: ${githubSessionStats.commits_tracked_to_be_added.length}`);
  logger.info(`[DEBUG][ADD] no match reasons: noSameRepo=${noMatchReasonStats.noSameRepo}, noDateMatch=${noMatchReasonStats.noDateMatch}, noMessageMatch=${noMatchReasonStats.noMessageMatch}`);

  if (sampleMismatches.length > 0) {
    logger.info(`[DEBUG][ADD] sample commits that didn't match (first ${sampleMismatches.length}):`);
    sampleMismatches.forEach((m, i) => {
      logger.info(`[DEBUG][ADD]   ${i + 1}. repo=${m.repo} date=${m.ghDate} msg=${m.ghMsg}`);
    });
  }

  if (githubSessionStats.commits_tracked_to_be_added.length > 0 && githubSessionStats.commits_tracked_to_be_added.length <= 10) {
    logger.info(`[DEBUG][ADD] commits to add details:`);
    githubSessionStats.commits_tracked_to_be_added.forEach((c, i) => {
      logger.info(`[DEBUG][ADD]   ${i + 1}. ${c.extendedProperties.private.repository} - ${c.extendedProperties.private.commitDate.slice(0, 10)} - ${c.extendedProperties.private.commitMessage.slice(0, 50)}`);
    });
  }

  const commitIdsToAdd = githubSessionStats.commits_tracked_to_be_added.map((item) => item.extendedProperties.private.commitId);
  const currentHash = computeHash(commitIdsToAdd);
  logger.info(`[DEBUG][ADD] computed hash for ${commitIdsToAdd.length} commitIds: ${currentHash.slice(0, 16)}...`);

  if (currentGithubSyncIndex === 1) {
    logger.info(`storing hash for ${commitIdsToAdd.length} commits to track for addition`);
    updateGASProperty('github_commits_tracked_to_be_added_hash', currentHash);
    return githubSessionStats;
  }

  const lastHash = getGASProperty('github_commits_tracked_to_be_added_hash');
  logger.info(`[DEBUG][ADD] lastHash from storage: ${lastHash ? lastHash.slice(0, 16) + '...' : 'null'}`);

  if (!lastHash) {
    logger.info(`no stored hash found, resetting to step 1`);
    resetGithubSyncProperties();
    updateGASProperty('github_commits_tracked_to_be_added_hash', currentHash);
    return githubSessionStats;
  }

  logger.info(`comparing hashes: stored=${lastHash.slice(0, 8)}... current=${currentHash.slice(0, 8)}...`);

  if (lastHash !== currentHash) {
    logger.info(`reset github commit properties due hash mismatch in added commits`);
    logger.info(`[DEBUG][ADD] hash mismatch: stored=${lastHash}, current=${currentHash}`);
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

    logger.info(`[DEBUG][ADD] finished adding commits, resetting properties`);
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
  logger.info(`[DEBUG][DEL] starting syncGithubCommitsToDelete`);
  logger.info(`[DEBUG][DEL] gcalCommits: ${githubGcalCommits.length}, filteredRepos: ${filteredRepos.length}`);

  const githubSessionStats: TResultInfoDeleted = {
    commits_deleted: [],
    commits_tracked_to_be_deleted: []
  };

  let matchedCount = 0;
  let noMatchReasonStats = { noSameRepo: 0, noDateMatch: 0, noMessageMatch: 0 };

  githubGcalCommits.forEach((gcalItem) => {
    const gcalProperties = gcalItem.extendedProperties?.private;
    if (!gcalProperties) {
      logger.info(`[DEBUG][DEL] skipping gcal item without private properties: ${gcalItem.id}`);
      return;
    }

    const onlySameRepoCommits = filteredRepos.filter((item) => item.repository === gcalProperties.repository);

    if (onlySameRepoCommits.length === 0) {
      noMatchReasonStats.noSameRepo++;
    }

    const commitStillExistsOnGithub = onlySameRepoCommits.find((item) => {
      const dateMatch = item.commitDate === gcalProperties.commitDate;
      const ghMsg = parseGithubEmojisString(item.commitMessage);
      const gcalMsg = parseGithubEmojisString(gcalProperties.commitMessage || '');
      const msgMatch = ghMsg === gcalMsg;

      if (!dateMatch && onlySameRepoCommits.length > 0) noMatchReasonStats.noDateMatch++;
      if (dateMatch && !msgMatch) noMatchReasonStats.noMessageMatch++;

      return dateMatch && msgMatch;
    });

    if (commitStillExistsOnGithub) {
      matchedCount++;
    } else {
      githubSessionStats.commits_tracked_to_be_deleted.push(gcalItem);
    }
  });

  logger.info(`[DEBUG][DEL] matched ${matchedCount}/${githubGcalCommits.length} gcal commits still exist on github`);
  logger.info(`[DEBUG][DEL] commits to delete: ${githubSessionStats.commits_tracked_to_be_deleted.length}`);
  logger.info(`[DEBUG][DEL] no match reasons: noSameRepo=${noMatchReasonStats.noSameRepo}, noDateMatch=${noMatchReasonStats.noDateMatch}, noMessageMatch=${noMatchReasonStats.noMessageMatch}`);

  if (githubSessionStats.commits_tracked_to_be_deleted.length > 0 && githubSessionStats.commits_tracked_to_be_deleted.length <= 10) {
    logger.info(`[DEBUG][DEL] commits to delete details:`);
    githubSessionStats.commits_tracked_to_be_deleted.forEach((c, i) => {
      const priv = c.extendedProperties?.private;
      logger.info(`[DEBUG][DEL]   ${i + 1}. ${priv?.repository} - ${priv?.commitDate?.slice(0, 10)} - ${priv?.commitMessage?.slice(0, 50)}`);
    });
  }

  const commitIdsToDelete = githubSessionStats.commits_tracked_to_be_deleted.map((item) => item.extendedProperties.private.commitId);
  const currentHash = computeHash(commitIdsToDelete);
  logger.info(`[DEBUG][DEL] computed hash for ${commitIdsToDelete.length} commitIds: ${currentHash.slice(0, 16)}...`);

  if (currentGithubSyncIndex === 1) {
    logger.info(`storing hash for ${commitIdsToDelete.length} commits to track for deletion`);
    updateGASProperty('github_commits_tracked_to_be_deleted_hash', currentHash);
    return githubSessionStats;
  }

  const lastHash = getGASProperty('github_commits_tracked_to_be_deleted_hash');
  logger.info(`[DEBUG][DEL] lastHash from storage: ${lastHash ? lastHash.slice(0, 16) + '...' : 'null'}`);

  if (!lastHash) {
    logger.info(`no stored delete hash found, resetting to step 1`);
    resetGithubSyncProperties();
    updateGASProperty('github_commits_tracked_to_be_deleted_hash', currentHash);
    return githubSessionStats;
  }

  logger.info(`comparing delete hashes: stored=${lastHash.slice(0, 8)}... current=${currentHash.slice(0, 8)}...`);

  if (lastHash !== currentHash) {
    logger.info(`reset github commit properties due hash mismatch in deleted commits`);
    logger.info(`[DEBUG][DEL] hash mismatch: stored=${lastHash}, current=${currentHash}`);
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
    logger.info(`[DEBUG][DEL] finished deleting commits, resetting properties`);
    resetGithubSyncProperties();
  }

  return githubSessionStats;
}
