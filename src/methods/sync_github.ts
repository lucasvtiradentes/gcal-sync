import { TParsedGithubCommit, getAllGithubCommits, parseGithubEmojisString } from '../classes/Github';
import { getGASProperty, updateGASProperty } from '../classes/GoogleAppsScript';
import { TGcalPrivateGithub, TGoogleCalendar, TGoogleEvent, TParsedGoogleEvent, addEventToCalendar, getCalendarByName, getTasksFromGoogleCalendars, removeCalendarEvent } from '../classes/GoogleCalendar';
import { CONFIGS } from '../consts/configs';
import { TConfigs, githubConfigsKey } from '../consts/types';
import { logger } from '../utils/abstractions/logger';
import { getUniqueElementsOnArrays } from '../utils/javascript/array_utils';

type TInfo = {
  githubCommits: TParsedGithubCommit[];
  githubGcalCommits: TParsedGoogleEvent<TGcalPrivateGithub>[];
};

type TResultSyncGithubCommitsToAdd = {
  commitsTrackedToBeAdded: TAddType[];
  commitsAdded: TParsedGithubCommit[];
};

type TResultSyncGithubCommitsToDelete = {
  commitsDeleted: TParsedGoogleEvent<TGcalPrivateGithub>[];
  commitsTrackedToBeDelete: TParsedGoogleEvent<TGcalPrivateGithub>[];
};

type TResultInfo = TResultSyncGithubCommitsToAdd & TResultSyncGithubCommitsToDelete;

function resetGithubSyncProperties() {
  updateGASProperty('github_commit_changes_count', '0');
  updateGASProperty('github_last_added_commits', []);
  updateGASProperty('github_last_deleted_commits', []);
}

export async function syncGithub(configs: TConfigs) {
  const info: TInfo = {
    githubCommits: await getAllGithubCommits(configs[githubConfigsKey].username, configs[githubConfigsKey].personal_token),
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
  }

  const githubCalendar = getCalendarByName(configs[githubConfigsKey].commits_configs.commits_calendar);
  const commitsSortedByDate = info.githubCommits.sort((a, b) => Number(new Date(b.commitDate)) - Number(new Date(a.commitDate)));
  const onlyCommitsOnUserRepositories = commitsSortedByDate.filter((item) => item.repository.includes(configs[githubConfigsKey].username));
  const onlyCommitsFromValidRepositories = onlyCommitsOnUserRepositories.filter((item) => configs[githubConfigsKey].commits_configs.ignored_repos.includes(item.repositoryName) === false);

  const result: TResultInfo = {
    ...(await syncGithubCommitsToAdd({ currentGithubSyncIndex, githubCalendar, githubGcalCommits: info.githubGcalCommits, onlyCommitsFromValidRepositories, parseCommitEmojis: configs[githubConfigsKey].commits_configs.parse_commit_emojis })),
    ...(await syncGithubCommitsToDelete({ currentGithubSyncIndex, githubCalendar, githubGcalCommits: info.githubGcalCommits, onlyCommitsFromValidRepositories }))
  };

  if (result.commitsTrackedToBeAdded.length === 0 && result.commitsTrackedToBeDelete.length === 0) {
    logger.info(`reset github commit properties due found no commits tracked`);
    resetGithubSyncProperties();
  }

  return result;
}

// =============================================================================

type TSyncGithubCommitsToAdd = {
  onlyCommitsFromValidRepositories: TParsedGithubCommit[];
  githubCalendar: TGoogleCalendar;
  currentGithubSyncIndex: number;
  githubGcalCommits: TParsedGoogleEvent<TGcalPrivateGithub>[];
  parseCommitEmojis: boolean;
};

type TAddType = {
  commit: TParsedGithubCommit;
  gcalEvent: TGoogleEvent;
};

async function syncGithubCommitsToAdd({ onlyCommitsFromValidRepositories, currentGithubSyncIndex, githubCalendar, githubGcalCommits, parseCommitEmojis }: TSyncGithubCommitsToAdd) {
  const githubSessionStats: TResultSyncGithubCommitsToAdd = {
    commitsTrackedToBeAdded: [],
    commitsAdded: []
  };

  for (const githubCommitItem of onlyCommitsFromValidRepositories) {
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
          commitId: githubCommitItem.commitId
        }
      };

      const taskEvent: TGoogleEvent = {
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

      githubSessionStats.commitsTrackedToBeAdded.push({ commit: githubCommitItem, gcalEvent: taskEvent });
    }
  }

  if (currentGithubSyncIndex === 1) {
    updateGASProperty(
      'github_last_added_commits',
      githubSessionStats.commitsTrackedToBeAdded.map((item) => item.commit)
    );
    return githubSessionStats;
  }

  const lastAddedCommits = getGASProperty('github_last_added_commits');
  const lastAddedCommitsIds = lastAddedCommits.map((item) => item.commitId);
  const currentIterationCommitsIds = githubSessionStats.commitsTrackedToBeAdded.map((item) => item.commit.commitId);
  const remainingCommits = getUniqueElementsOnArrays(lastAddedCommitsIds, currentIterationCommitsIds);

  if (remainingCommits.length > 0) {
    logger.info(`reset github commit properties due differences in added commits`);
    resetGithubSyncProperties();
    return githubSessionStats;
  }

  if (currentGithubSyncIndex === CONFIGS.REQUIRED_GITHUB_VALIDATIONS_COUNT) {
    logger.info(`add commits to gcal:`);

    for (let x = 0; x < githubSessionStats.commitsTrackedToBeAdded.length; x++) {
      try {
        const item = githubSessionStats.commitsTrackedToBeAdded[x];
        const commitGcalEvent = addEventToCalendar(githubCalendar, item.gcalEvent);
        githubSessionStats.commitsAdded.push(item.commit);
        logger.info(`${x + 1}/${githubSessionStats.commitsTrackedToBeAdded.length} add new commit to gcal: ${item.commit.commitDate} - ${commitGcalEvent.extendedProperties.private.repositoryName} - ${commitGcalEvent.extendedProperties.private.commitMessage}`);
      } catch (e: any) {
        throw new Error(e.message);
      } finally {
        resetGithubSyncProperties();
      }
    }
  }
}

type TSyncGithubCommitsToDelete = {
  onlyCommitsFromValidRepositories: TParsedGithubCommit[];
  githubCalendar: TGoogleCalendar;
  currentGithubSyncIndex: number;
  githubGcalCommits: TParsedGoogleEvent<TGcalPrivateGithub>[];
};

async function syncGithubCommitsToDelete({ githubGcalCommits, githubCalendar, currentGithubSyncIndex, onlyCommitsFromValidRepositories }: TSyncGithubCommitsToDelete) {
  const githubSessionStats: TResultSyncGithubCommitsToDelete = {
    commitsDeleted: [],
    commitsTrackedToBeDelete: []
  };

  githubGcalCommits.forEach((gcalItem) => {
    const gcalProperties = gcalItem.extendedProperties.private;
    const onlySameRepoCommits = onlyCommitsFromValidRepositories.filter((item) => item.repository === gcalProperties.repository);

    const commitStillExistsOnGithub = onlySameRepoCommits.find((item) => item.commitDate === gcalProperties.commitDate && parseGithubEmojisString(item.commitMessage) === parseGithubEmojisString(gcalProperties.commitMessage));

    if (!commitStillExistsOnGithub) {
      githubSessionStats.commitsTrackedToBeDelete.push(gcalItem);
    }
  });

  if (currentGithubSyncIndex === 1) {
    updateGASProperty('github_last_deleted_commits', githubSessionStats.commitsTrackedToBeDelete);
    return githubSessionStats;
  }

  const lastDeletedCommits = getGASProperty('github_last_deleted_commits');
  const lastDeletedCommitsIds = lastDeletedCommits.map((item) => item.extendedProperties.private.repository);
  const currentIterationDeletedCommitsIds = githubSessionStats.commitsTrackedToBeDelete.map((item) => item.extendedProperties.private.commitId);
  const remainingDeletedCommits = getUniqueElementsOnArrays(lastDeletedCommitsIds, currentIterationDeletedCommitsIds);

  if (remainingDeletedCommits.length > 0) {
    logger.info(`reset github commit properties due differences in deleted commits`);
    resetGithubSyncProperties();
    return githubSessionStats;
  }

  if (currentGithubSyncIndex === CONFIGS.REQUIRED_GITHUB_VALIDATIONS_COUNT) {
    logger.info(`delete commits on gcal:`);

    for (let x = 0; x < githubSessionStats.commitsTrackedToBeDelete.length; x++) {
      try {
        const item = githubSessionStats.commitsTrackedToBeDelete[x];
        removeCalendarEvent(githubCalendar, item);
        githubSessionStats.commitsDeleted.push(item);
        logger.info(`${x + 1}/${githubSessionStats.commitsTrackedToBeDelete.length} deleted commit on gcal: ${item.extendedProperties.private.commitDate} - ${item.extendedProperties.private.repositoryName} - ${item.extendedProperties.private.commitMessage}`);
      } catch (e: any) {
        throw new Error(e.message);
      } finally {
        resetGithubSyncProperties();
      }
    }
  }

  return githubSessionStats;
}
