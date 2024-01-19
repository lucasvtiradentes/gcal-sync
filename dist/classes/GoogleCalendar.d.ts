/// <reference types="google-apps-script" />
type TGoogleEvent = GoogleAppsScript.Calendar.Schema.Event;
type TParsedGoogleEvent = Pick<TGoogleEvent, 'colorId' | 'id' | 'summary' | 'description' | 'htmlLink' | 'attendees' | 'visibility' | 'reminders' | 'start' | 'end' | 'created' | 'updated' | 'extendedProperties'>;
export declare const createMissingCalendars: (allGcalendarsNames: string[]) => void;
export declare const getAllCalendars: () => GoogleAppsScript.Calendar.Schema.CalendarListEntry[];
export declare function getTasksFromGoogleCalendars(allCalendars: string[]): TParsedGoogleEvent[];
export {};
