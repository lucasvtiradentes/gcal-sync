/// <reference types="google-apps-script" />
import { TSessionStats } from '..';
import { TDate } from '../classes/ICS';
export declare function getSessionEmail(sendToEmail: string, sessionStats: TSessionStats): GoogleAppsScript.Mail.MailAdvancedParameters;
export declare function getDailySummaryEmail(sendToEmail: string, todaySession: TSessionStats, todayDate: string): GoogleAppsScript.Mail.MailAdvancedParameters;
export declare function getNewReleaseEmail(sendToEmail: string, lastReleaseObj: {
    tag_name: string;
    published_at: string;
}): GoogleAppsScript.Mail.MailAdvancedParameters;
export declare function getErrorEmail(sendToEmail: string, errorMessage: string): GoogleAppsScript.Mail.MailAdvancedParameters;
export declare const getParsedDateTime: (str: TDate) => string;
