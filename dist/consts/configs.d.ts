import { TGcalPrivateGithub, TGcalPrivateTicktick, TParsedGoogleEvent } from '../classes/GoogleCalendar';
export declare const CONFIGS: {
    readonly DEBUG_MODE: true;
    readonly MAX_GCAL_TASKS: 2500;
    readonly REQUIRED_GITHUB_VALIDATIONS_COUNT: 3;
};
export declare const GAS_PROPERTIES: {
    readonly today_ticktick_added_tasks: {
        readonly key: "today_ticktick_added_tasks";
        readonly initialValue: TParsedGoogleEvent<TGcalPrivateTicktick>[];
    };
    readonly today_ticktick_updated_tasks: {
        readonly key: "today_ticktick_updated_tasks";
        readonly initialValue: TParsedGoogleEvent<TGcalPrivateTicktick>[];
    };
    readonly today_ticktick_completed_tasks: {
        readonly key: "today_ticktick_completed_tasks";
        readonly initialValue: TParsedGoogleEvent<TGcalPrivateTicktick>[];
    };
    readonly today_github_added_commits: {
        readonly key: "today_github_added_commits";
        readonly initialValue: TParsedGoogleEvent<TGcalPrivateGithub>[];
    };
    readonly today_github_deleted_commits: {
        readonly key: "today_github_deleted_commits";
        readonly initialValue: TParsedGoogleEvent<TGcalPrivateGithub>[];
    };
    readonly last_released_version_alerted: {
        readonly key: "last_released_version_alerted";
        readonly initialValue: string;
    };
    readonly last_released_version_sent_date: {
        readonly key: "last_released_version_sent_date";
        readonly initialValue: string;
    };
    readonly last_daily_email_sent_date: {
        readonly key: "last_daily_email_sent_date";
        readonly initialValue: string;
    };
    readonly github_commits_tracked_to_be_added: {
        readonly key: "github_commits_tracked_to_be_added";
        readonly initialValue: TParsedGoogleEvent<TGcalPrivateGithub>[];
    };
    readonly github_commits_tracked_to_be_deleted: {
        readonly key: "github_commits_tracked_to_be_deleted";
        readonly initialValue: TParsedGoogleEvent<TGcalPrivateGithub>[];
    };
    readonly github_commit_changes_count: {
        readonly key: "github_commit_changes_count";
        readonly initialValue: string;
    };
};
export type TGasPropertiesSchema = typeof GAS_PROPERTIES;
export type TGasPropertiesSchemaKeys = keyof TGasPropertiesSchema;
