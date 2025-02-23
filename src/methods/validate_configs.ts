import { TBasicConfig, TGithubSync, githubConfigsKey } from '../consts/types';
import { isObject } from '../utils/javascript/object_utils';
import { validateObjectSchema } from '../utils/validate_object_schema';

const basicRequiredObjectShape: TBasicConfig = {
  settings: {
    sync_function: '',
    skip_mode: false,
    timezone_offset_correction: 0,
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
    github: true,
    githubIgnoredRepos: true
  };

  isValid.basic = validateObjectSchema(configs, basicRequiredObjectShape);
  isValid.github = validateObjectSchema(configs[githubConfigsKey], githubRequiredObjectShape);

  if (typeof configs[githubConfigsKey] === 'object' && 'ignored_repos' in configs[githubConfigsKey] && Array.isArray(configs[githubConfigsKey].ignored_repos)) {
    const itemsValidationArr = configs[githubConfigsKey].ignored_repos.map((item) => typeof item === 'string');
    isValid.githubIgnoredRepos = itemsValidationArr.every((item) => item === true);
  }

  return Object.values(isValid).every((isSchemaValid) => isSchemaValid === true);
}
