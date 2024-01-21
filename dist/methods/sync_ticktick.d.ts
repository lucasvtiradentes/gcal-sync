/// <reference types="google-apps-script" />
import { TGoogleCalendar, TParsedGoogleEvent } from '../classes/GoogleCalendar';
import { TExtendedParsedTicktickTask } from '../classes/ICS';
import { TConfigs, TIcsCalendar, TInfo } from '../consts/types';
export declare function syncTicktick(configs: TConfigs): Promise<void>;
export declare const getFixedTaskName: (str: string) => string;
export declare function addTicktickTaskToGcal(gcal: TGoogleCalendar, ticktickTask: TExtendedParsedTicktickTask): Promise<GoogleAppsScript.Calendar.Schema.Event>;
export declare function checkIfTicktickTaskInfoWasChanged(ticktickTask: TExtendedParsedTicktickTask, taskOnGcal: TParsedGoogleEvent): Promise<string[]>;
export declare function getTicktickTasks(icsCalendarsArr: TIcsCalendar[], timezoneCorrection: number): Promise<TExtendedParsedTicktickTask[]>;
export declare function getAllTicktickTasks(icsCalendars: TIcsCalendar[], timezoneCorrection: number): Promise<TExtendedParsedTicktickTask[]>;
export declare function addAndUpdateTasksOnGcal({ ticktickGcalTasks, ticktickTasks }: TInfo): Promise<{
    added_tasks: GoogleAppsScript.Calendar.Schema.Event[];
    updated_tasks: GoogleAppsScript.Calendar.Schema.Event[];
}>;
export declare function moveCompletedTasksToDoneGcal({ ticktickGcalTasks, ticktickTasks }: TInfo): Promise<{
    completed_tasks: GoogleAppsScript.Calendar.Schema.Event[];
}>;
