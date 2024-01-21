import { TGcalPrivateGithub, TParsedGoogleEvent } from '../classes/GoogleCalendar';
import { TConfigs } from '../consts/types';
type TResultInfoAdded = {
    commits_tracked_to_be_added: TParsedGoogleEvent<TGcalPrivateGithub>[];
    commits_added: TParsedGoogleEvent<TGcalPrivateGithub>[];
};
type TResultInfoDeleted = {
    commits_deleted: TParsedGoogleEvent<TGcalPrivateGithub>[];
    commits_tracked_to_be_deleted: TParsedGoogleEvent<TGcalPrivateGithub>[];
};
export type TGithubSyncResultInfo = TResultInfoAdded & TResultInfoDeleted;
export declare function syncGithub(configs: TConfigs): Promise<TGithubSyncResultInfo>;
export {};
