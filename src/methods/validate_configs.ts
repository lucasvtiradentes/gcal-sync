import { isObject } from '../utils/javascript/object_utils';
import { validateObjectSchema } from '../utils/validate_object_schema';
import { TBasicConfig, TGithubSync, TIcsCalendar, TTicktickSync, githubConfigsKey, ticktickConfigsKey } from '../consts/types';

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

const ticktickCalItemObjectShape: TIcsCalendar = {
  gcal: '',
  gcal_done: '',
  link: ''
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
    ticktickIcsItems: true,
    github: true,
    githubIgnoredRepos: true
  };

  isValid.basic = validateObjectSchema(configs, basicRequiredObjectShape);
  isValid.github = validateObjectSchema(configs[githubConfigsKey], githubRequiredObjectShape);
  isValid.ticktick = validateObjectSchema(configs[ticktickConfigsKey], ticktickRequiredObjectShape);

  if (typeof configs[ticktickConfigsKey] === 'object' && 'ics_calendars' in configs[ticktickConfigsKey] && Array.isArray(configs[ticktickConfigsKey].ics_calendars)) {
    const itemsValidationArr = configs[ticktickConfigsKey].ics_calendars.map((item) => validateObjectSchema(item, ticktickCalItemObjectShape));
    isValid.ticktickIcsItems = itemsValidationArr.every((item) => item === true);
  }

  if (typeof configs[githubConfigsKey] === 'object' && 'ignored_repos' in configs[githubConfigsKey] && Array.isArray(configs[githubConfigsKey].ignored_repos)) {
    const itemsValidationArr = configs[githubConfigsKey].ignored_repos.map((item) => typeof item === 'string');
    isValid.githubIgnoredRepos = itemsValidationArr.every((item) => item === true);
  }

  return Object.values(isValid).every((isSchemaValid) => isSchemaValid === true);
}
