import { TGithubSyncResultInfo } from '../methods/sync_github';

export type TSessionStats = Omit<TGithubSyncResultInfo, 'commits_tracked_to_be_added' | 'commits_tracked_to_be_deleted'>;

export type TExtendedSessionStats = TGithubSyncResultInfo;

export type TIcsCalendar = {
  link: string;
  gcal: string;
  gcal_done: string;
  color?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
  tag?: string;
  ignoredTags?: string[];
};

export type TGithubSync = {
  username: string;
  personal_token: string;
  commits_configs: {
    should_sync: boolean;
    commits_calendar: string;
    ignored_repos: string[];
    parse_commit_emojis: boolean;
  };
};

export type TBasicConfig = {
  settings: {
    timezone_offset_correction: number;
    sync_function: string;
    update_frequency: number;
    skip_mode: boolean;
    per_day_emails: {
      time_to_send: string;
      email_new_gcal_sync_release: boolean;
      email_daily_summary: boolean;
    };
    per_sync_emails: {
      email_errors: boolean;
      email_session: boolean;
    };
  };
};

export const githubConfigsKey = 'github_sync' as const;

export type TConfigs = TBasicConfig & { [githubConfigsKey]: TGithubSync };

export type TExtendedConfigs = {
  timezone: string;
  timezone_offset: number;
  today_date: string;
  user_email: string;
  configs: TConfigs;
};
