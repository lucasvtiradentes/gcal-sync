export type TTicktickSync = {
  ics_calendars: [];
};

export type TGithubSync = {
  username: string;
  personal_token: string;
  commits_configs: {
    commits_calendar: string;
    ignored_repos: string[];
    parse_commit_emojis: boolean;
  };
  issues_configs: {
    issues_calendar: string;
  };
};

export type TBasicConfig = {
  settings: {
    timezone_correction: number;
    sync_function: string;
    update_frequency: number;
  };
  options: {
    email_errors: boolean;
    email_session: boolean;
    email_new_gcal_sync_release: boolean;
    // daily_summary
    email_daily_summary: boolean;
    daily_summary_email_time: string;
    // dev options
    show_logs: boolean;
    maintenance_mode: boolean;
  };
};

export const ticktickConfigsKey = 'ticktick_sync' as const;
export const githubConfigsKey = 'github_sync' as const;

export type TConfigs = TBasicConfig & { [ticktickConfigsKey]?: TTicktickSync } & { [githubConfigsKey]?: TGithubSync };
