export const ERRORS = {
  invalid_configs: 'schema invalid',
  production_only: 'This method cannot run in non-production environments',
  incorrect_ics_calendar: 'The link you provided is not a valid ICS calendar: ',
  abusive_google_calendar_api_use: 'Due to the numerous operations in the last few hours, the google api is not responding.',
  invalid_ics_calendar_link: 'You provided an invalid ICS calendar link: ',
  invalid_github_token: 'You provided an invalid github token',
  invalid_github_username: 'You provided an invalid github username'
} as const;
