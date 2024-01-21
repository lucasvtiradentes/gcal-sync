export const CONFIGS = {
  DEBUG_MODE: true,
  MAX_GCAL_TASKS: 2500,
  REQUIRED_GITHUB_VALIDATIONS_COUNT: 3,
  EVENTS_DIVIDER: ' | '
} as const;

export const GAS_PROPERTIES = {
  todayTicktickAddedTasks: {
    key: 'todayTicktickAddedTasks',
    schema: {} as string
  },
  todayTicktickUpdateTasks: {
    key: 'todayTicktickUpdateTasks',
    schema: {} as string
  },
  todayTicktickCompletedTasks: {
    key: 'todayTicktickCompletedTasks',
    schema: {} as string
  },
  todayGithubAddedCommits: {
    key: 'todayGithubAddedCommits',
    schema: {} as string
  },
  todayGithubDeletedCommits: {
    key: 'todayGithubDeletedCommits',
    schema: {} as string
  },

  lastReleasedVersionAlerted: {
    key: 'lastReleasedVersionAlerted',
    schema: {} as string
  },
  lastDailyEmailSentDate: {
    key: 'lastDailyEmailSentDate',
    schema: {} as string
  },

  githubLastAddedCommits: {
    key: 'githubLastAddedCommits',
    schema: {} as string
  },
  githubLastDeletedCommits: {
    key: 'githubLastDeletedCommits',
    schema: {} as string
  },
  githubCommitChangesCount: {
    key: 'githubCommitChangesCount',
    schema: {} as string
  }
} as const;

export type TGasPropertiesSchema = typeof GAS_PROPERTIES;

export type TGasPropertiesSchemaKeys = keyof TGasPropertiesSchema;
