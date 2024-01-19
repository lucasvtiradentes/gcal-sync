export const CONFIGS = {
  DEBUG_MODE: true
} as const;

export type TGasPropertiesSchema = {
  todayGithubAddedCommits: string;
  todayTicktickAddedTasks: string;
  todayTicktickUpdateTasks: string;
  lastReleasedVersionAlerted: string;
  githubLastAddedCommits: string;
  lastDailyEmailSentDate: string;
  todayTicktickCompletedTasks: string;
  githubLastDeletedCommits: string;
  githubCommitChangesCount: string;
  todayGithubDeletedCommits: string;
};

export type TGasPropertiesSchemaKeys = keyof TGasPropertiesSchema;
