export declare function getDateFixedByTimezone(timeZoneIndex: number): Date;
export declare function getParsedTimeStamp(stamp: string): {
    year: string;
    month: string;
    day: string;
    hours: string;
    minutes: string;
    seconds: string;
};
export declare function isCurrentTimeAfter(timeToCompare: string, timezone: number): boolean;
