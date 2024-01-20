import { TIcsCalendar } from '../schemas/configs.schema';
import { TGoogleCalendar } from './GoogleCalendar';
export type TParsedTicktickTask = {
    id: string;
    name: string;
    description: string;
    tzid: string;
    start: TDate;
    end: TDate;
};
export type TExtendedParsedTicktickTask = TParsedTicktickTask & Pick<TIcsCalendar, 'gcal' | 'gcal_done' | 'color' | 'tag' | 'ignoredTags'>;
type TDate = {
    date: string;
} | {
    dateTime: string;
    timeZone: string;
};
export declare const getIcsCalendarTasks: (icsLink: string, timezoneCorrection: number) => Promise<TParsedTicktickTask[]>;
export declare function getParsedIcsDatetimes(dtstart: string, dtend: string, timezone: string, timezoneCorrection: number): {
    finalDtstart: {
        date: string;
    } | {
        dateTime: string;
        timeZone: string;
    };
    finalDtend: {
        date: string;
    } | {
        dateTime: string;
        timeZone: string;
    };
};
export declare const getFixedTaskName: (str: string) => string;
export declare function addTicktickTaskToGcal(gcal: TGoogleCalendar, ticktickTask: TExtendedParsedTicktickTask): Promise<void>;
export {};
