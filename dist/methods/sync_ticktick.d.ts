/// <reference types="google-apps-script" />
import { TGcalPrivateTicktick, TGoogleCalendar, TParsedGoogleEvent } from '../classes/GoogleCalendar';
import { TExtendedParsedTicktickTask } from '../classes/ICS';
import { TConfigs, TIcsCalendar } from '../consts/types';
type TInfo = {
    ticktickTasks: TExtendedParsedTicktickTask[];
    ticktickGcalTasks: TParsedGoogleEvent<TGcalPrivateTicktick>[];
};
export type TTicktickSyncResultInfo = {
    added_tasks: TParsedGoogleEvent<TGcalPrivateTicktick>[];
    updated_tasks: TParsedGoogleEvent<TGcalPrivateTicktick>[];
    completed_tasks: TParsedGoogleEvent<TGcalPrivateTicktick>[];
};
export declare function syncTicktick(configs: TConfigs): Promise<TTicktickSyncResultInfo>;
export declare const getFixedTaskName: (str: string) => string;
export declare function addTicktickTaskToGcal(gcal: TGoogleCalendar, ticktickTask: TExtendedParsedTicktickTask): Promise<GoogleAppsScript.Calendar.Schema.Event>;
export declare function checkIfTicktickTaskInfoWasChanged(ticktickTask: TExtendedParsedTicktickTask, taskOnGcal: TParsedGoogleEvent<TGcalPrivateTicktick>): Promise<string[]>;
export declare function getTicktickTasks(icsCalendarsArr: TIcsCalendar[], timezoneCorrection: number): Promise<TExtendedParsedTicktickTask[]>;
export declare function getAllTicktickTasks(icsCalendars: TIcsCalendar[], timezoneCorrection: number): Promise<TExtendedParsedTicktickTask[]>;
export declare function addAndUpdateTasksOnGcal({ ticktickGcalTasks, ticktickTasks }: TInfo): Promise<{
    added_tasks: TParsedGoogleEvent<TGcalPrivateTicktick>[];
    updated_tasks: TParsedGoogleEvent<TGcalPrivateTicktick>[];
}>;
export declare function moveCompletedTasksToDoneGcal({ ticktickGcalTasks, ticktickTasks }: TInfo): Promise<{
    completed_tasks: TParsedGoogleEvent<TGcalPrivateTicktick>[];
}>;
export {};
