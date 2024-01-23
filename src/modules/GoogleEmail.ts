export type TEmail = GoogleAppsScript.Mail.MailAdvancedParameters;

export function getUserEmail() {
  return Session.getActiveUser().getEmail();
}

export function sendEmail(emailObj: TEmail) {
  MailApp.sendEmail(emailObj);
}
