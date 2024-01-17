import { TConfigs } from './schemas/configs.schema';
declare class GcalSync {
    private configs;
    today_date: string;
    isGASEnvironment: boolean;
    constructor(configs: TConfigs);
    showConfigs(): void;
    sync(): Promise<void>;
}
export default GcalSync;
export { TConfigs };
