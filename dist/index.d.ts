import { TConfigs } from './consts/types';
import { TGithubSyncResultInfo } from './methods/sync_github';
import { TTicktickSyncResultInfo } from './methods/sync_ticktick';
export type TSessionStats = TTicktickSyncResultInfo & Omit<TGithubSyncResultInfo, 'commits_tracked_to_be_added' | 'commits_tracked_to_be_deleted'>;
declare class GcalSync {
    private configs;
    private today_date;
    constructor(configs: TConfigs);
    private createMissingGASProperties;
    private createMissingGcalCalendars;
    install(): Promise<void>;
    uninstall(): Promise<void>;
    private getTodayStats;
    showTodayStats(): void;
    clearTodayEvents(): void;
    sync(): Promise<void>;
    private handleSessionData;
}
export default GcalSync;
