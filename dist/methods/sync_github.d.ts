import { TGcalPrivateGithub, TParsedGoogleEvent } from '../classes/GoogleCalendar';
import { TConfigs } from '../consts/types';
type TResultSyncGithubCommitsToAdd = {
    commitsTrackedToBeAdded: TParsedGoogleEvent<TGcalPrivateGithub>[];
    commitsAdded: TParsedGoogleEvent<TGcalPrivateGithub>[];
};
type TResultSyncGithubCommitsToDelete = {
    commitsDeleted: TParsedGoogleEvent<TGcalPrivateGithub>[];
    commitsTrackedToBeDelete: TParsedGoogleEvent<TGcalPrivateGithub>[];
};
type TResultInfo = TResultSyncGithubCommitsToAdd & TResultSyncGithubCommitsToDelete;
export declare function syncGithub(configs: TConfigs): Promise<TResultInfo>;
export {};
