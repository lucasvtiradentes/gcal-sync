import { TGcalPrivateGithub, TGcalPrivateTicktick, TParsedGoogleEvent } from '../classes/GoogleCalendar';

export const CONFIGS = {
  DEBUG_MODE: true,
  MAX_GCAL_TASKS: 2500,
  REQUIRED_GITHUB_VALIDATIONS_COUNT: 3
} as const;

export const GAS_PROPERTIES = {
  today_ticktick_added_tasks: {
    key: 'today_ticktick_added_tasks',
    initialValue: [] as TParsedGoogleEvent<TGcalPrivateTicktick>[]
  },
  today_ticktick_updated_tasks: {
    key: 'today_ticktick_updated_tasks',
    initialValue: [] as TParsedGoogleEvent<TGcalPrivateTicktick>[]
  },
  today_ticktick_completed_tasks: {
    key: 'today_ticktick_completed_tasks',
    initialValue: [] as TParsedGoogleEvent<TGcalPrivateTicktick>[]
  },
  today_github_added_commits: {
    key: 'today_github_added_commits',
    initialValue: [] as TParsedGoogleEvent<TGcalPrivateGithub>[]
  },
  today_github_deleted_commits: {
    key: 'today_github_deleted_commits',
    initialValue: [] as TParsedGoogleEvent<TGcalPrivateGithub>[]
  },

  last_released_version_alerted: {
    key: 'last_released_version_alerted',
    initialValue: '' as string
  },
  last_released_version_sent_date: {
    key: 'last_released_version_sent_date',
    initialValue: '' as string
  },
  last_daily_email_sent_date: {
    key: 'last_daily_email_sent_date',
    initialValue: '' as string
  },

  github_commits_tracked_to_be_added: {
    key: 'github_commits_tracked_to_be_added',
    initialValue: [] as TParsedGoogleEvent<TGcalPrivateGithub>[]
  },
  github_commits_tracked_to_be_deleted: {
    key: 'github_commits_tracked_to_be_deleted',
    initialValue: [] as TParsedGoogleEvent<TGcalPrivateGithub>[]
  },
  github_commit_changes_count: {
    key: 'github_commit_changes_count',
    initialValue: '' as string
  }
} as const;

export type TGasPropertiesSchema = typeof GAS_PROPERTIES;

export type TGasPropertiesSchemaKeys = keyof TGasPropertiesSchema;
