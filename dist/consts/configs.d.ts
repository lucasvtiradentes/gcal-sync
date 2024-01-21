export declare const CONFIGS: {
    readonly DEBUG_MODE: true;
    readonly MAX_GCAL_TASKS: 2500;
    readonly EVENTS_DIVIDER: " | ";
};
export declare const GAS_PROPERTIES: {
    readonly todayTicktickAddedTasks: {
        readonly key: "todayTicktickAddedTasks";
        readonly schema: string;
    };
    readonly todayTicktickUpdateTasks: {
        readonly key: "todayTicktickUpdateTasks";
        readonly schema: string;
    };
    readonly todayTicktickCompletedTasks: {
        readonly key: "todayTicktickCompletedTasks";
        readonly schema: string;
    };
    readonly todayGithubAddedCommits: {
        readonly key: "todayGithubAddedCommits";
        readonly schema: string;
    };
    readonly todayGithubDeletedCommits: {
        readonly key: "todayGithubDeletedCommits";
        readonly schema: string;
    };
    readonly lastReleasedVersionAlerted: {
        readonly key: "lastReleasedVersionAlerted";
        readonly schema: string;
    };
    readonly lastDailyEmailSentDate: {
        readonly key: "lastDailyEmailSentDate";
        readonly schema: string;
    };
    readonly githubLastAddedCommits: {
        readonly key: "githubLastAddedCommits";
        readonly schema: string;
    };
    readonly githubLastDeletedCommits: {
        readonly key: "githubLastDeletedCommits";
        readonly schema: string;
    };
    readonly githubCommitChangesCount: {
        readonly key: "githubCommitChangesCount";
        readonly schema: string;
    };
};
export type TGasPropertiesSchema = typeof GAS_PROPERTIES;
export type TGasPropertiesSchemaKeys = keyof TGasPropertiesSchema;
