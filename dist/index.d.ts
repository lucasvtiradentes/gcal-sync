import { TParsedGoogleEvent } from './classes/GoogleCalendar';
import { TExtendedParsedTicktickTask } from './classes/ICS';
import { TConfigs, TIcsCalendar } from './schemas/configs.schema';
declare class GcalSync {
    private configs;
    today_date: string;
    isGASEnvironment: boolean;
    constructor(configs: TConfigs);
    sync(): Promise<void>;
    syncTicktick(): Promise<void>;
    checkIfTicktickTaskInfoWasChanged(ticktickTask: TExtendedParsedTicktickTask, taskOnGcal: TParsedGoogleEvent): Promise<string[]>;
    getTicktickTasks(icsCalendarsArr: TIcsCalendar[]): Promise<TExtendedParsedTicktickTask[]>;
    syncGithub(): Promise<void>;
}
export default GcalSync;
