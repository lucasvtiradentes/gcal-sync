import { TParsedGithubCommit } from '../classes/Github';
import { TGcalPrivateGithub, TGoogleEvent, TParsedGoogleEvent } from '../classes/GoogleCalendar';
import { TConfigs } from '../consts/types';
type TResultSyncGithubCommitsToAdd = {
    commitsTrackedToBeAdded: TAddType[];
    commitsAdded: TParsedGithubCommit[];
};
type TResultSyncGithubCommitsToDelete = {
    commitsDeleted: TParsedGoogleEvent<TGcalPrivateGithub>[];
    commitsTrackedToBeDelete: TParsedGoogleEvent<TGcalPrivateGithub>[];
};
type TResultInfo = TResultSyncGithubCommitsToAdd & TResultSyncGithubCommitsToDelete;
export declare function syncGithub(configs: TConfigs): Promise<TResultInfo>;
type TAddType = {
    commit: TParsedGithubCommit;
    gcalEvent: TGoogleEvent;
};
export {};
