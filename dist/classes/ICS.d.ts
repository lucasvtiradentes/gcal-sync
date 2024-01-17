type TParsedTicktickTask = {
    id: string;
    name: string;
    description: string;
    tzid: string;
    start: TDate;
    end: TDate;
};
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
export {};
