import { isObject } from '../utils/javascript/object_utils';
import { validateObjectSchema } from '../utils/validate_object_schema';
import { TBasicConfig, TGithubSync, TTicktickSync, githubConfigsKey, ticktickConfigsKey } from '../consts/types';

const basicRequiredObjectShape: TBasicConfig = {
  settings: {
    sync_function: '',
    timezone_correction: -3,
    update_frequency: 4,
    per_day_emails: {
      time_to_send: '15:00',
      email_new_gcal_sync_release: false,
      email_daily_summary: false
    },
    per_sync_emails: {
      email_errors: false,
      email_session: false
    }
  }
};

const ticktickRequiredObjectShape: TTicktickSync = {
  should_sync: false,
  ics_calendars: []
};

const githubRequiredObjectShape: TGithubSync = {
  username: '',
  commits_configs: {
    should_sync: false,
    commits_calendar: '',
    ignored_repos: [],
    parse_commit_emojis: false
  },
  personal_token: ''
};

export function validateConfigs(configs: unknown) {
  if (!isObject(configs)) return false;

  const isValid = {
    basic: true,
    ticktick: true,
    github: true
  };

  isValid.basic = validateObjectSchema(configs, basicRequiredObjectShape);
  isValid.ticktick = validateObjectSchema(configs[ticktickConfigsKey], ticktickRequiredObjectShape);
  isValid.github = validateObjectSchema(configs[githubConfigsKey], githubRequiredObjectShape);

  return Object.values(isValid).every((isSchemaValid) => isSchemaValid === true);
}
