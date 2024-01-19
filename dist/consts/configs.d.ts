export declare const CONFIGS: {
    readonly DEBUG_MODE: true;
    readonly MAX_GCAL_TASKS: 2500;
};
export type TGasPropertiesSchema = {
    todayGithubAddedCommits: string;
    todayTicktickAddedTasks: string;
    todayTicktickUpdateTasks: string;
    lastReleasedVersionAlerted: string;
    githubLastAddedCommits: string;
    lastDailyEmailSentDate: string;
    todayTicktickCompletedTasks: string;
    githubLastDeletedCommits: string;
    githubCommitChangesCount: string;
    todayGithubDeletedCommits: string;
};
export type TGasPropertiesSchemaKeys = keyof TGasPropertiesSchema;
