import { TGithubSyncResultInfo } from '../methods/sync_github';
import { TTicktickSyncResultInfo } from '../methods/sync_ticktick';

export type TSessionStats = TTicktickSyncResultInfo & Omit<TGithubSyncResultInfo, 'commits_tracked_to_be_added' | 'commits_tracked_to_be_deleted'>;

export type TIcsCalendar = {
  link: string;
  gcal: string;
  gcal_done: string;
  color?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
  tag?: string;
  ignoredTags?: string[];
};

export type TTicktickSync = {
  ics_calendars: TIcsCalendar[];
};

export type TGithubSync = {
  username: string;
  personal_token: string;
  commits_configs: {
    commits_calendar: string;
    ignored_repos: string[];
    parse_commit_emojis: boolean;
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
    // daily_summary
    email_new_gcal_sync_release: boolean;
    email_daily_summary: boolean;
    daily_summary_email_time: string;
  };
};

export const ticktickConfigsKey = 'ticktick_sync' as const;
export const githubConfigsKey = 'github_sync' as const;

export type TConfigs = TBasicConfig & { [ticktickConfigsKey]?: TTicktickSync } & { [githubConfigsKey]?: TGithubSync };
