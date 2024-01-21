import { TParsedGithubCommit } from '../classes/Github';
import { TGcalPrivateGithub, TParsedGoogleEvent } from '../classes/GoogleCalendar';
import { TExtendedParsedTicktickTask } from '../classes/ICS';

export const CONFIGS = {
  DEBUG_MODE: true,
  MAX_GCAL_TASKS: 2500,
  REQUIRED_GITHUB_VALIDATIONS_COUNT: 3,
  EVENTS_DIVIDER: ' | '
} as const;

export const GAS_PROPERTIES = {
  today_ticktick_added_tasks: {
    key: 'today_ticktick_added_tasks',
    schema: {} as TExtendedParsedTicktickTask[]
  },
  today_ticktick_updated_tasks: {
    key: 'today_ticktick_updated_tasks',
    schema: {} as TExtendedParsedTicktickTask[]
  },
  today_ticktick_completed_tasks: {
    key: 'today_ticktick_completed_tasks',
    schema: {} as TExtendedParsedTicktickTask[]
  },
  today_github_added_commits: {
    key: 'today_github_added_commits',
    schema: {} as TParsedGithubCommit[]
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

  github_last_added_commits: {
    key: 'github_last_added_commits',
    schema: {} as TParsedGithubCommit[]
  },
  github_last_deleted_commits: {
    key: 'github_last_deleted_commits',
    schema: {} as TParsedGoogleEvent<TGcalPrivateGithub>[]
  },
  github_commit_changes_count: {
    key: 'github_commit_changes_count',
    schema: {} as string
  }
} as const;

export type TGasPropertiesSchema = typeof GAS_PROPERTIES;

export type TGasPropertiesSchemaKeys = keyof TGasPropertiesSchema;
