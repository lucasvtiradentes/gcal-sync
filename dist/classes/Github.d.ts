export type TParsedGithubCommit = {
    commitDate: string;
    commitMessage: string;
    commitId: string;
    commitUrl: string;
    repository: string;
    repositoryId: string;
    repositoryName: string;
    repositoryOwner: string;
    repositoryDescription: string;
    isRepositoryPrivate: boolean;
    isRepositoryFork: boolean;
};
export declare function getAllGithubCommits(username: string, personalToken: string): Promise<TParsedGithubCommit[]>;
export declare function parseGithubEmojisString(str: string): string;
