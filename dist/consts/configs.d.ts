export declare const CONFIGS: {
    readonly DEBUG_MODE: true;
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
