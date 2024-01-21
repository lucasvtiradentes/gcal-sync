import { TGcalPrivateGithub, TGcalPrivateTicktick, TParsedGoogleEvent } from '../classes/GoogleCalendar';
export declare const CONFIGS: {
    readonly DEBUG_MODE: true;
    readonly MAX_GCAL_TASKS: 2500;
    readonly REQUIRED_GITHUB_VALIDATIONS_COUNT: 3;
    readonly EVENTS_DIVIDER: " | ";
};
export declare const GAS_PROPERTIES: {
    readonly today_ticktick_added_tasks: {
        readonly key: "today_ticktick_added_tasks";
        readonly schema: TParsedGoogleEvent<TGcalPrivateTicktick>[];
    };
    readonly today_ticktick_updated_tasks: {
        readonly key: "today_ticktick_updated_tasks";
        readonly schema: TParsedGoogleEvent<TGcalPrivateTicktick>[];
    };
    readonly today_ticktick_completed_tasks: {
        readonly key: "today_ticktick_completed_tasks";
        readonly schema: TParsedGoogleEvent<TGcalPrivateTicktick>[];
    };
    readonly today_github_added_commits: {
        readonly key: "today_github_added_commits";
        readonly schema: TParsedGoogleEvent<TGcalPrivateGithub>[];
    };
    readonly today_github_deleted_commits: {
        readonly key: "today_github_deleted_commits";
        readonly schema: TParsedGoogleEvent<TGcalPrivateGithub>[];
    };
    readonly last_released_version_alerted: {
        readonly key: "last_released_version_alerted";
        readonly schema: string;
    };
    readonly last_daily_email_sent_date: {
        readonly key: "last_daily_email_sent_date";
        readonly schema: string;
    };
    readonly github_commits_tracked_to_be_added: {
        readonly key: "github_commits_tracked_to_be_added";
        readonly schema: TParsedGoogleEvent<TGcalPrivateGithub>[];
    };
    readonly github_commits_tracked_to_be_deleted: {
        readonly key: "github_commits_tracked_to_be_deleted";
        readonly schema: TParsedGoogleEvent<TGcalPrivateGithub>[];
    };
    readonly github_commit_changes_count: {
        readonly key: "github_commit_changes_count";
        readonly schema: string;
    };
};
export type TGasPropertiesSchema = typeof GAS_PROPERTIES;
export type TGasPropertiesSchemaKeys = keyof TGasPropertiesSchema;
