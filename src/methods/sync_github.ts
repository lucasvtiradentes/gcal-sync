import { TParsedGithubCommit, getAllGithubCommits, parseGithubEmojisString } from '../classes/Github';
import { TGcalPrivateGithub, TGoogleEvent, TParsedGoogleEvent, getTasksFromGoogleCalendars } from '../classes/GoogleCalendar';
import { TConfigs, githubConfigsKey } from '../consts/types';

type TInfo = {
  githubCommits: TParsedGithubCommit[];
  githubGcalCommits: TParsedGoogleEvent<TGcalPrivateGithub>[];
};

export async function syncGithub(configs: TConfigs) {
  const info: TInfo = {
    githubCommits: await getAllGithubCommits(configs[githubConfigsKey].username, configs[githubConfigsKey].personal_token),
    githubGcalCommits: getTasksFromGoogleCalendars([configs[githubConfigsKey].commits_configs.commits_calendar])
  };

  console.log(info.githubCommits.length);

  const sortedCommits = info.githubCommits.sort((a, b) => Number(new Date(b.commitDate)) - Number(new Date(a.commitDate)));
  const onlyCommitsOnUserRepositories = sortedCommits.filter((item) => item.repository.includes(configs[githubConfigsKey].username));
  const onlyCommitsFromValidRepositories = onlyCommitsOnUserRepositories.filter((item) => configs[githubConfigsKey].commits_configs.ignored_repos.includes(item.repositoryName) === false);
  console.log({ onlyCommitsFromValidRepositories });

  for (const githubCommitItem of onlyCommitsFromValidRepositories) {
    console.log(githubCommitItem);
    const sameRepoCommits = info.githubGcalCommits.filter((gcalItem) => gcalItem.extendedProperties.private.repository === githubCommitItem.repository);
    const hasEquivalentGcalTask = sameRepoCommits.find((gcalItem) => gcalItem.extendedProperties.private.commitDate === githubCommitItem.commitDate && parseGithubEmojisString(gcalItem.extendedProperties.private.commitMessage) === parseGithubEmojisString(githubCommitItem.commitMessage));

    if (!hasEquivalentGcalTask) {
      const commitMessage = configs[githubConfigsKey].commits_configs.parse_commit_emojis ? parseGithubEmojisString(githubCommitItem.commitMessage) : githubCommitItem.commitMessage;

      const extendProps: TGcalPrivateGithub = {
        private: {
          commitDate: githubCommitItem.commitDate,
          commitMessage: commitMessage,
          repository: githubCommitItem.repository
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

      console.log(`add commit to gcal: ${githubCommitItem.repositoryName}`);
    }
  }
}
