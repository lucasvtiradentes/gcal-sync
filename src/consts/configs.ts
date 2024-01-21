import { TGcalPrivateGithub, TGcalPrivateTicktick, TParsedGoogleEvent } from '../classes/GoogleCalendar';

export const CONFIGS = {
  DEBUG_MODE: true,
  MAX_GCAL_TASKS: 2500,
  REQUIRED_GITHUB_VALIDATIONS_COUNT: 3,
  EVENTS_DIVIDER: ' | '
} as const;

export const GAS_PROPERTIES = {
  today_ticktick_added_tasks: {
    key: 'today_ticktick_added_tasks',
    schema: {} as TParsedGoogleEvent<TGcalPrivateTicktick>[]
  },
  today_ticktick_updated_tasks: {
    key: 'today_ticktick_updated_tasks',
    schema: {} as TParsedGoogleEvent<TGcalPrivateTicktick>[]
  },
  today_ticktick_completed_tasks: {
    key: 'today_ticktick_completed_tasks',
    schema: {} as TParsedGoogleEvent<TGcalPrivateTicktick>[]
  },
  today_github_added_commits: {
    key: 'today_github_added_commits',
    schema: {} as TParsedGoogleEvent<TGcalPrivateGithub>[]
  },
  today_github_deleted_commits: {
    key: 'today_github_deleted_commits',
    schema: {} as TParsedGoogleEvent<TGcalPrivateGithub>[]
  },

  last_released_version_alerted: {
    key: 'last_released_version_alerted',
    schema: {} as string
  },
  last_daily_email_sent_date: {
    key: 'last_daily_email_sent_date',
    schema: {} as string
  },

  github_commits_tracked_to_be_added: {
    key: 'github_commits_tracked_to_be_added',
    schema: {} as TParsedGoogleEvent<TGcalPrivateGithub>[]
  },
  github_commits_tracked_to_be_deleted: {
    key: 'github_commits_tracked_to_be_deleted',
    schema: {} as TParsedGoogleEvent<TGcalPrivateGithub>[]
  },
  github_commit_changes_count: {
    key: 'github_commit_changes_count',
    schema: {} as string
  }
} as const;

export type TGasPropertiesSchema = typeof GAS_PROPERTIES;

export type TGasPropertiesSchemaKeys = keyof TGasPropertiesSchema;
