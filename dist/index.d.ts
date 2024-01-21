import { TConfigs, TSessionStats } from './consts/types';
declare class GcalSync {
    private configs;
    private today_date;
    private is_gas_environment;
    constructor(configs: TConfigs);
    private parseGcalVersion;
    private getLatestGcalSyncRelease;
    install(): Promise<void>;
    uninstall(): Promise<void>;
    clearTodayEvents(): void;
    getTodayEvents(): TSessionStats;
    sync(): Promise<void>;
}
export default GcalSync;
