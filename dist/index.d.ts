import { TConfigs } from './schemas/configs.schema';
declare class GcalSync {
    private configs;
    today_date: string;
    isGASEnvironment: boolean;
    constructor(configs: TConfigs);
    sync(): Promise<void>;
}
export default GcalSync;
