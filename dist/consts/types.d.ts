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
        email_new_gcal_sync_release: boolean;
        email_daily_summary: boolean;
        daily_summary_email_time: string;
    };
};
export declare const ticktickConfigsKey: "ticktick_sync";
export declare const githubConfigsKey: "github_sync";
export type TConfigs = TBasicConfig & {
    [ticktickConfigsKey]?: TTicktickSync;
} & {
    [githubConfigsKey]?: TGithubSync;
};
