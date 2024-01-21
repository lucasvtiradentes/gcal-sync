/// <reference types="google-apps-script" />
export type TEmail = GoogleAppsScript.Mail.MailAdvancedParameters;
export declare function getUserEmail(): string;
export declare function sendEmail(emailObj: TEmail): void;
