/// <reference types="google-apps-script" />
export declare const createMissingCalendars: (allGcalendarsNames: string[]) => void;
export declare const getAllCalendars: () => GoogleAppsScript.Calendar.Schema.CalendarListEntry[];
export declare const checkIfCalendarExists: (calendarName: string) => GoogleAppsScript.Calendar.Schema.CalendarListEntry;
export declare const createCalendar: (calName: string) => GoogleAppsScript.Calendar.Schema.Calendar;
