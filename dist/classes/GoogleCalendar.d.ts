/// <reference types="google-apps-script" />
export type TGoogleCalendar = GoogleAppsScript.Calendar.Schema.Calendar;
export type TGoogleEvent = GoogleAppsScript.Calendar.Schema.Event;
export type TGcalPrivateTicktick = {
    private: {
        tickTaskId: string;
        calendar: string;
        completedCalendar: string;
    };
};
export type TGcalPrivateGithub = {
    private: {
        repository: string;
        commitDate: string;
        commitMessage: string;
    };
};
type GcalCommon = Pick<TGoogleEvent, 'colorId' | 'id' | 'summary' | 'description' | 'htmlLink' | 'attendees' | 'visibility' | 'reminders' | 'start' | 'end' | 'created' | 'updated'>;
export type TParsedGoogleEvent<TPrivate> = GcalCommon & {
    extendedProperties: TPrivate;
};
export declare const createMissingCalendars: (allGcalendarsNames: string[]) => void;
export declare const getAllCalendars: () => GoogleAppsScript.Calendar.Schema.CalendarListEntry[];
export declare function getCalendarByName(calName: string): GoogleAppsScript.Calendar.Schema.CalendarListEntry;
export declare function getTasksFromGoogleCalendars<TPrivate>(allCalendars: string[]): TParsedGoogleEvent<TPrivate>[];
export declare function addEventToCalendar(calendar: TGoogleCalendar, event: TGoogleEvent): GoogleAppsScript.Calendar.Schema.Event;
export declare function moveEventToOtherCalendar(calendar: TGoogleCalendar, newCalendar: TGoogleCalendar, event: TGoogleEvent): GoogleAppsScript.Calendar.Schema.Event;
export declare function getEventById(calendar: TGoogleCalendar, eventId: string): GoogleAppsScript.Calendar.Schema.Event;
export {};
