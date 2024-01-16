import { isObject } from '../utils/object_utils';
import { validateObjectSchema } from '../utils/validate_object_schema';
import { githubConfigsKey, ticktickConfigsKey } from './configs.schema';
const basicRequiredObjectShape = {
    settings: {
        sync_function: '',
        timezone_correction: -3,
        update_frequency: 4
    },
    options: {
        daily_summary_email_time: '15:00',
        email_daily_summary: false,
        email_errors: false,
        email_new_gcal_sync_release: false,
        email_session: false,
        maintenance_mode: false,
        show_logs: false
    }
};
const ticktickRequiredObjectShape = {
    ics_calendars: []
};
const githubRequiredObjectShape = {
    username: '',
    commits_configs: {
        commits_calendar: '',
        ignored_repos: [],
        parse_commit_emojis: false
    },
    issues_configs: {
        issues_calendar: ''
    },
    personal_token: ''
};
export function validateConfigs(configs) {
    if (!isObject(configs))
        return false;
    const isValid = {
        basic: true,
        ticktick: true,
        github: true
    };
    isValid.basic = validateObjectSchema(configs, basicRequiredObjectShape);
    if (ticktickConfigsKey in configs) {
        isValid.ticktick = validateObjectSchema(configs[ticktickConfigsKey], ticktickRequiredObjectShape);
    }
    if (githubConfigsKey in configs) {
        isValid.github = validateObjectSchema(configs[githubConfigsKey], githubRequiredObjectShape);
    }
    return Object.values(isValid).every((isSchemaValid) => isSchemaValid === true);
}
