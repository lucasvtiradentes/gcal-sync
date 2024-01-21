import { TConfigs } from './consts/types';
import { TGithubSyncResultInfo } from './methods/sync_github';
import { TTicktickSyncResultInfo } from './methods/sync_ticktick';
export type TSessionStats = TTicktickSyncResultInfo & Omit<TGithubSyncResultInfo, 'commits_tracked_to_be_added' | 'commits_tracked_to_be_deleted'>;
declare class GcalSync {
    private configs;
    private today_date;
    private user_email;
    constructor(configs: TConfigs);
    install(): Promise<void>;
    uninstall(): Promise<void>;
    clearTodayEvents(): void;
    getTodayEvents(): TSessionStats;
    sync(): Promise<void>;
    private handleSessionData;
}
export default GcalSync;
