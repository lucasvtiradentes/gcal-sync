import { TGcalPrivateGithub, TParsedGoogleEvent } from '../modules/GoogleCalendar';
import { asConstArrayToObject } from '../utils/javascript/array_utils';

export const CONFIGS = {
  DEBUG_MODE: true,
  MAX_GCAL_TASKS: 2500,
  REQUIRED_GITHUB_VALIDATIONS_COUNT: 3,
  BATCH_SIZE: 15,
  BATCH_DELAY_MS: 2000,
  GITHUB_MAX_PAGES_PER_RANGE: 10,
  GITHUB_MONTHS_TO_FETCH: 6,
  GITHUB_DELAY_BETWEEN_PAGES_MS: 2100,
  GITHUB_DELAY_BETWEEN_RANGES_MS: 1000,
  IS_TEST_ENVIRONMENT: typeof process !== 'object' ? false : process?.env?.NODE_ENV
} as const;

const GAS_PROPERTIES = [
  {
    key: 'today_github_added_commits',
    initial_value: [] as TParsedGoogleEvent<TGcalPrivateGithub>[]
  },
  {
    key: 'today_github_deleted_commits',
    initial_value: [] as TParsedGoogleEvent<TGcalPrivateGithub>[]
  },
  {
    key: 'last_released_version_alerted',
    initial_value: '' as string
  },
  {
    key: 'last_released_version_sent_date',
    initial_value: '' as string
  },
  {
    key: 'last_daily_email_sent_date',
    initial_value: '' as string
  },
  {
    key: 'github_commits_tracked_to_be_added_hash',
    initial_value: '' as string
  },
  {
    key: 'github_commits_tracked_to_be_deleted_hash',
    initial_value: '' as string
  },
  {
    key: 'github_commit_changes_count',
    initial_value: '' as string
  }
] as const;

export const GAS_PROPERTIES_INITIAL_VALUE_ENUM = asConstArrayToObject(GAS_PROPERTIES, 'key', 'initial_value');
export type TGasPropertiesSchema = typeof GAS_PROPERTIES_INITIAL_VALUE_ENUM;

export const GAS_PROPERTIES_ENUM = asConstArrayToObject(GAS_PROPERTIES, 'key', 'key');
export type TGasPropertiesSchemaKeys = (typeof GAS_PROPERTIES_ENUM)[keyof typeof GAS_PROPERTIES_ENUM];
