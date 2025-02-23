import { TGcalPrivateGithub, TParsedGoogleEvent } from '../modules/GoogleCalendar';
import { asConstArrayToObject } from '../utils/javascript/array_utils';

export const CONFIGS = {
  DEBUG_MODE: true,
  MAX_GCAL_TASKS: 2500,
  REQUIRED_GITHUB_VALIDATIONS_COUNT: 3,
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
    key: 'github_commits_tracked_to_be_added',
    initial_value: [] as TParsedGoogleEvent<TGcalPrivateGithub>[]
  },
  {
    key: 'github_commits_tracked_to_be_deleted',
    initial_value: [] as TParsedGoogleEvent<TGcalPrivateGithub>[]
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
