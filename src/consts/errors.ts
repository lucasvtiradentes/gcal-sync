export const ERRORS = {
  productionOnly: 'This method cannot run in non-production environments',
  incorrectIcsCalendar: 'The link you provided is not a valid ICS calendar: ',
  mustSpecifyConfig: 'You must specify the settings when starting the class',
  httpsError: 'You provided an invalid ICS calendar link: ',
  invalidGithubToken: 'You provided an invalid github token',
  invalidGithubUsername: 'You provided an invalid github username',
  abusiveGoogleCalendarApiUse: 'Due to the numerous operations in the last few hours, the google api is not responding.'
} as const;
