/// <reference types="google-apps-script" />
import { TParsedGoogleEvent } from './classes/GoogleCalendar';
import { TExtendedParsedTicktickTask } from './classes/ICS';
import { TConfigs, TIcsCalendar } from './schemas/configs.schema';
type TInfo = {
    ticktickTasks: TExtendedParsedTicktickTask[];
    ticktickGcalTasks: TParsedGoogleEvent[];
};
declare class GcalSync {
    private configs;
    today_date: string;
    isGASEnvironment: boolean;
    constructor(configs: TConfigs);
    sync(): Promise<void>;
    getAllTicktickTasks(icsCalendars: TIcsCalendar[], timezoneCorrection: number): Promise<TExtendedParsedTicktickTask[]>;
    addAndUpdateTasksOnGcal({ ticktickGcalTasks, ticktickTasks }: TInfo): Promise<{
        added_tasks: GoogleAppsScript.Calendar.Schema.Event[];
        updated_tasks: GoogleAppsScript.Calendar.Schema.Event[];
    }>;
    moveCompletedTasksToDoneGcal({ ticktickGcalTasks, ticktickTasks }: TInfo): Promise<{
        completed_tasks: GoogleAppsScript.Calendar.Schema.Event[];
    }>;
    syncTicktick(): Promise<void>;
    syncGithub(): Promise<void>;
}
export default GcalSync;
