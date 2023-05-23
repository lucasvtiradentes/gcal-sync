/* eslint-disable @typescript-eslint/no-unused-vars */

type IcsCalendarLink = string;
type IcsTaskGcal = string;
type IcsCompletedTaskGcal = string;
type CalendarOptions = {
  tag?: string;
  ignoredTags?: string[];
  color?: number;
};

type CalendarItem = [IcsCalendarLink, IcsTaskGcal, IcsCompletedTaskGcal, CalendarOptions];

type Config = {
  ticktickSync: {
    icsCalendars: CalendarItem[];
  };
  githubSync: {
    username: string;
    googleCalendar: string;
    personalToken: string;
    ignoredRepos: string[];
    parseGithubEmojis: boolean;
  };
  datetime: {
    dailyEmailsTime: string;
    timeZoneCorrection: number;
  };
  options: {
    syncTicktick: boolean;
    syncGithub: boolean;
    emailErrors: boolean;
    emailSession: boolean;
    emailDailySummary: boolean;
    emailNewRelease: boolean;
    showLogs: boolean;
    maintanceMode: boolean;
  };
  settings: {
    syncFunction: string;
    updateFrequency: number;
  };
};

/* UTIL TYPES --------------------------------------------------------------- */

type Environment = 'production' | 'development';

type SessionStats = {
  addedTicktickTasks: string;
  updatedTicktickTasks: string;
  completedTicktickTasks: string;
  addedGithubCommits: string;
  deletedGithubCommits: string;
};

/* GOOGLE TYPES ------------------------------------------------------------- */

type GoogleEvent = GoogleAppsScript.Calendar.Schema.Event;

type ParsedGoogleEvent = Pick<GoogleEvent, 'colorId' | 'id' | 'summary' | 'description' | 'htmlLink' | 'attendees' | 'visibility' | 'reminders' | 'start' | 'end' | 'created' | 'updated' | 'extendedProperties'>;

/* TICKTICK TYPES ----------------------------------------------------------- */

type IcsEvent = {
  DSTAMP: string;
  DTSTART: string;
  DTEND: string;
  SUMMARY: string;
  UID: string;
  DESCRIPTION: string;
  SEQUENCE: string;
  TZID: string;
  ALARM_TRIGGER: string;
  ALARM_ACTION: string;
  ALARM_DESCRIPTION: string;
};

type ParsedIcsEvent = {
  id: string;
  name: string;
  description: string;
  tzid: string;
  start: any;
  end: any;
  taskCalendar?: string;
};

/* TICKTICK SYNC RELATED TYPES ---------------------------------------------- */

type IcsCalendarResult = {
  icsCal: string;
  gCalCorresponding: string;
  completedCal: string;
  calendarOptions: CalendarOptions;
  tasksFromIcs: ParsedIcsEvent[];
  addedTasks: GoogleEvent[];
  updatedTasks: GoogleEvent[];
};

type TicktickSessionStats = {
  addedEvents: GoogleEvent[];
  updatedEvents: GoogleEvent[];
  completedEvents: GoogleEvent[];
};

type GcalPrivateTicktick = {
  tickTaskId: string;
  calendar: string;
  completedCalendar: string;
};

type ParsedResult = {
  added: GoogleEvent[];
  updated: GoogleEvent[];
  taggedIcsTasks: ParsedIcsEvent[];
};

/* GITHUB SYNC RELATED TYPES ------------------------------------------------ */

type ParsedGithubCommit = {
  commitDate: string;
  commitMessage: string;
  commitId: string;
  commitUrl: string;
  repository: string;
  repositoryId: string;
  repositoryName: string;
  repositoryOwner: string;
  repositoryDescription: string;
  isRepositoryPrivate: boolean;
  isRepositoryFork: boolean;
};

type GithubSessionStats = {
  addedCommits: GoogleEvent[];
  deletedCommits: GoogleEvent[];
};

type GcalPrivateGithub = Omit<ParsedGithubCommit, 'isRepositoryPrivate' | 'isRepositoryFork'>;

export default class GcalSync {
  public config: Config;

  VERSION = ''; // version
  APPNAME = 'gcal-sync';
  GITHUB_REPOSITORY = 'lucasvtiradentes/gcal-sync';
  ENVIRONMENT = this.detectEnvironment();
  TODAY_DATE = '';
  SESSION_LOGS = [];
  USER_EMAIL = this.ENVIRONMENT === 'production' ? this.getUserEmail() : '';
  EVENTS_DIVIDER = ` | `;
  GITHUB_REQUIRED_VALIDATIONS = 3; // it takes 'x' syncs with the same changed data in order to update in the google calendar
  APPS_SCRIPTS_PROPERTIES = {
    lastReleasedVersionAlerted: 'lastReleasedVersionAlerted',
    lastDailyEmailSentDate: 'lastDailyEmailSentDate',
    todayTicktickAddedTasks: 'todayTicktickAddedTasks',
    todayTicktickUpdateTasks: 'todayTicktickUpdateTasks',
    todayTicktickCompletedTasks: 'todayTicktickCompletedTasks',
    todayGithubAddedCommits: 'todayGithubAddedCommits',
    todayGithubDeletedCommits: 'todayGithubDeletedCommits',

    githubCommitChangesCount: 'githubCommitChangesCount',
    githubLastAddedCommits: 'githubLastAddedCommits',
    githubLastDeletedCommits: 'githubLastDeletedCommits'
  };
  ERRORS = {
    productionOnly: 'This method cannot run in non-production environments',
    incorrectIcsCalendar: 'The link you provided is not a valid ICS calendar: ',
    mustSpecifyConfig: 'You must specify the settings when starting the class',
    httpsError: 'You provided an invalid ICS calendar link: ',
    invalidGithubToken: 'You provided an invalid github token',
    invalidGithubUsername: 'You provided an invalid github username',
    abusiveGoogleCalendarApiUse: 'Due to the numerous operations in the last few hours, the google api is not responding.'
  };

  constructor(config: Config) {
    this.validateConfigs(config);
    this.config = config;
    this.TODAY_DATE = this.getDateFixedByTimezone(this.config.datetime.timeZoneCorrection).toISOString().split('T')[0];
    this.logger(`${this.APPNAME} is running at version ${this.VERSION} in ${this.ENVIRONMENT} environment`);
    this.logger(`check the docs for your version here: ${`https://github.com/${this.GITHUB_REPOSITORY}/tree/v${this.VERSION}#readme`}`);
  }

  private validateConfigs(config: Config) {
    if (!config) {
      throw new Error(this.ERRORS.mustSpecifyConfig);
    }

    const validationArr = [
      { objToCheck: config, requiredKeys: ['ticktickSync', 'githubSync', 'datetime', 'options', 'settings'], name: 'configs' },
      { objToCheck: config.ticktickSync, requiredKeys: ['icsCalendars'], name: 'configs.ticktickSync' },
      { objToCheck: config.githubSync, requiredKeys: ['username', 'googleCalendar', 'personalToken', 'ignoredRepos', 'parseGithubEmojis'], name: 'configs.githubSync' },
      { objToCheck: config.datetime, requiredKeys: ['dailyEmailsTime', 'timeZoneCorrection'], name: 'configs.datetime' },
      { objToCheck: config.options, requiredKeys: ['syncTicktick', 'syncGithub', 'showLogs', 'maintanceMode', 'emailNewRelease', 'emailDailySummary', 'emailSession', 'emailErrors'], name: 'configs.options' },
      { objToCheck: config.settings, requiredKeys: ['syncFunction', 'updateFrequency'], name: 'config.settings' }
    ];

    validationArr.forEach((item) => {
      const { objToCheck, requiredKeys, name } = item;
      requiredKeys.forEach((key) => {
        if (!objToCheck || !Object.keys(objToCheck).includes(key)) {
          throw new Error(`missing key in ${name}: ${key}`);
        }
      });
    });
  }

  private detectEnvironment(): Environment {
    if (typeof Calendar === 'undefined') {
      return 'development';
    } else {
      return 'production';
    }
  }

  private logger(message: string) {
    this.SESSION_LOGS.push(message);

    if (this.config.options.showLogs) {
      console.log(message);
    }
  }

  /* HELPER FUNCTIONS ======================================================= */

  private getStrBetween(str: string, substr1: string, substr2: string) {
    const newStr = str.slice(str.search(substr1)).replace(substr1, '');
    return newStr.slice(0, newStr.search(substr2));
  }

  private getParsedTimeStamp(stamp: string) {
    const splitArr = stamp.split('T');

    const year = splitArr[0].substring(0, 4);
    const month = splitArr[0].substring(4, 6);
    const day = splitArr[0].substring(6, 8);
    const hours = splitArr[1] ? splitArr[1].substring(0, 2) : '00';
    const minutes = splitArr[1] ? splitArr[1].substring(2, 4) : '00';
    const seconds = splitArr[1] ? splitArr[1].substring(4, 6) : '00';

    return { year, month, day, hours, minutes, seconds };
  }

  private getDateFixedByTimezone(timeZoneIndex: number) {
    const date = new Date();
    date.setHours(date.getHours() + timeZoneIndex);
    return date;
  }

  private isCurrentTimeAfter(timeToCompare: string) {
    const dateFixedByTimezone = this.getDateFixedByTimezone(this.config.datetime.timeZoneCorrection);
    const curStamp = Number(dateFixedByTimezone.getHours()) * 60 + Number(dateFixedByTimezone.getMinutes());

    const timeArr = timeToCompare.split(':');
    const specifiedStamp = Number(timeArr[0]) * 60 + Number(timeArr[1]);

    return curStamp >= specifiedStamp;
  }

  /* ICS CALENDARS FUNCTIONS ================================================ */

  private getIcsCalendarStr(icsCalendarLink: IcsCalendarLink) {
    const url = icsCalendarLink.replace('webcal://', 'https://');
    const urlResponse = this.getGoogleFetch().fetch(url, { validateHttpsCertificates: false, muteHttpExceptions: true });

    if (urlResponse.getResponseCode() !== 200) {
      throw new Error(this.ERRORS.httpsError + url);
    }

    const icalStr = urlResponse.getContentText() || '';

    if (icalStr.search('BEGIN:VCALENDAR') === -1) {
      throw new Error(this.ERRORS.incorrectIcsCalendar + url);
    }

    return icalStr;
  }

  private getIcsEvents(icalStr: string) {
    const eventsArr = icalStr.split('BEGIN:VEVENT\r\n').filter((item) => item.search('SUMMARY') > -1);

    const allEventsArr: IcsEvent[] = eventsArr.reduce((acc, cur) => {
      const alarmArr = cur.split('BEGIN:VALARM\r\n');
      const eventObj = {
        DSTAMP: this.getStrBetween(cur, 'DTSTAMP:', '\r\n'),
        DTSTART: this.getStrBetween(cur, 'DTSTART;', '\r\n'),
        DTEND: this.getStrBetween(cur, 'DTEND;', '\r\n'),
        SUMMARY: this.getStrBetween(cur, 'SUMMARY:', '\r\n'),
        UID: this.getStrBetween(cur, 'UID:', '\r\n'),
        DESCRIPTION: this.getStrBetween(cur, 'DESCRIPTION:', '\r\n'),
        SEQUENCE: this.getStrBetween(cur, 'SEQUENCE:', '\r\n'),
        TZID: this.getStrBetween(cur, 'TZID:', '\r\n'),
        ALARM_TRIGGER: alarmArr.length === 1 ? '' : this.getStrBetween(alarmArr[1], 'TRIGGER:', '\r\n'),
        ALARM_ACTION: alarmArr.length === 1 ? '' : this.getStrBetween(alarmArr[1], 'ACTION:', '\r\n'),
        ALARM_DESCRIPTION: alarmArr.length === 1 ? '' : this.getStrBetween(alarmArr[1], 'DESCRIPTION:', '\r\n')
      };
      return [...acc, eventObj];
    }, []);

    return allEventsArr;
  }

  private getParsedIcsDatetimes(dtstart: string, dtend: string, timezone: string) {
    let finalDtstart: any = dtstart;
    let finalDtend: any = dtend;

    finalDtstart = finalDtstart.slice(finalDtstart.search(':') + 1);
    finalDtend = finalDtend.slice(finalDtend.search(':') + 1);

    if (finalDtend === '') {
      const startDateObj = this.getParsedTimeStamp(finalDtstart);
      const nextDate = new Date(Date.UTC(Number(startDateObj.year), Number(startDateObj.month) - 1, Number(startDateObj.day), 0, 0, 0));
      nextDate.setDate(nextDate.getDate() + 1);
      finalDtend = { date: nextDate.toISOString().split('T')[0] };
      finalDtstart = { date: `${startDateObj.year}-${startDateObj.month}-${startDateObj.day}` };
    } else {
      const startDateObj = this.getParsedTimeStamp(finalDtstart);
      const endDateObj = this.getParsedTimeStamp(finalDtend);

      const getTimeZoneFixedString = (fixer: number) => {
        if (fixer === 0) {
          return '';
        }
        return `${fixer < 0 ? '-' : '+'}${String(Math.abs(fixer)).padStart(2, '0')}:00`;
      };
      const timezoneFixedString = getTimeZoneFixedString(this.config.datetime.timeZoneCorrection);

      finalDtstart = {
        dateTime: `${startDateObj.year}-${startDateObj.month}-${startDateObj.day}T${startDateObj.hours}:${startDateObj.minutes}:${startDateObj.seconds}${timezoneFixedString}`,
        timeZone: timezone
      };
      finalDtend = {
        dateTime: `${endDateObj.year}-${endDateObj.month}-${endDateObj.day}T${endDateObj.hours}:${endDateObj.minutes}:${endDateObj.seconds}${timezoneFixedString}`,
        timeZone: timezone
      };
    }

    return {
      finalDtstart,
      finalDtend
    };
  }

  private parseIcsEvents(icsEvents: IcsEvent[]) {
    const parsedIcsEvents: ParsedIcsEvent[] = icsEvents.reduce((acc, cur) => {
      const parsedDateTime = this.getParsedIcsDatetimes(cur.DTSTART, cur.DTEND, cur.TZID);
      const eventObj = {
        id: cur.UID,
        name: cur.SUMMARY,
        description: cur.DESCRIPTION,
        tzid: cur.TZID,
        start: parsedDateTime.finalDtstart,
        end: parsedDateTime.finalDtend
      };
      return [...acc, eventObj];
    }, []);

    return parsedIcsEvents;
  }

  private getEventsFromIcsCalendar(icsCalendarLink: IcsCalendarLink) {
    const icsString = this.getIcsCalendarStr(icsCalendarLink);
    const icsEvents = icsString.search('SUMMARY:No task.') > 0 ? [] : this.getIcsEvents(icsString);
    const parsedIcsEvents = this.parseIcsEvents(icsEvents);
    return parsedIcsEvents;
  }

  /* GOOGL APSS SCRIPT EMAIL ================================================ */
  private getGoogleSessionObject() {
    if (this.ENVIRONMENT === 'development') {
      throw new Error(this.ERRORS.productionOnly);
    }

    const Obj = Session;
    return Obj;
  }

  private getUserEmail() {
    return this.getGoogleSessionObject().getActiveUser().getEmail();
  }

  /* GOOGLE APPS SCRIPT PROPPERTIES ========================================= */

  private getGoogleAppsScriptsObject() {
    if (this.ENVIRONMENT === 'development') {
      throw new Error(this.ERRORS.productionOnly);
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const Obj = PropertiesService.getScriptProperties();
    return Obj;
  }

  private getAppsScriptsProperties() {
    const scriptProperties = this.getGoogleAppsScriptsObject();
    return scriptProperties.getKeys();
  }

  private getAppsScriptsProperty(propertyName: string) {
    const scriptProperties = this.getGoogleAppsScriptsObject();
    return scriptProperties.getProperty(propertyName);
  }

  private updateAppsScriptsProperty(propertyToUpdate: string, newValue: string) {
    const scriptProperties = this.getGoogleAppsScriptsObject();
    scriptProperties.setProperty(propertyToUpdate, newValue);
  }

  private removeAppsScriptsProperty(propertyToDelete: string) {
    const scriptProperties = this.getGoogleAppsScriptsObject();
    scriptProperties.deleteProperty(propertyToDelete);
  }

  /* GOOGLE APPS SCRIPTS FETCH ============================================== */

  private getGoogleFetch() {
    if (this.ENVIRONMENT === 'development') {
      throw new Error(this.ERRORS.productionOnly);
    }

    return UrlFetchApp;
  }

  /* GOOGLE APPS SCRIPTS TRIGGERS =========================================== */

  private getGoogleAppsScriptsTriggerObj() {
    if (this.ENVIRONMENT === 'development') {
      throw new Error(this.ERRORS.productionOnly);
    }

    return ScriptApp;
  }

  private getAppsScriptsTriggers() {
    return this.getGoogleAppsScriptsTriggerObj().getProjectTriggers();
  }

  private addAppsScriptsTrigger(functionName: string, minutesLoop: number) {
    this.getGoogleAppsScriptsTriggerObj().newTrigger(functionName).timeBased().everyMinutes(minutesLoop).create();
  }

  private removeAppsScriptsTrigger(functionName: string) {
    const allAppsScriptTriggers = this.getAppsScriptsTriggers();
    const tickSyncTrigger = allAppsScriptTriggers.find((item) => item.getHandlerFunction() === functionName);

    if (tickSyncTrigger) {
      this.getGoogleAppsScriptsTriggerObj().deleteTrigger(tickSyncTrigger);
    }
  }

  /* GOOGLE CALENDAR FUNCTIONS ============================================== */

  private getGoogleCalendarObj() {
    if (this.ENVIRONMENT === 'development') {
      throw new Error(this.ERRORS.productionOnly);
    }

    return Calendar;
  }

  /* GOOGLE CALENDAR - CALENDARS ======================== */

  private getAllCalendars() {
    const calendars = this.getGoogleCalendarObj().CalendarList.list({ showHidden: true }).items;
    return calendars;
  }

  private getAllOwnedCalendars() {
    const owenedCalendars = this.getGoogleCalendarObj()
      .CalendarList.list({ showHidden: true })
      .items.filter((cal) => cal.accessRole === 'owner');
    return owenedCalendars;
  }

  private getCalendarByName(calName: string) {
    const calendar = this.getAllCalendars().find((cal) => cal.summary === calName);
    return calendar;
  }

  private createCalendar(calName: string) {
    const calendarObj = this.getGoogleCalendarObj();
    const doesCalendarExists = this.getAllOwnedCalendars()
      .map((cal) => cal.summary)
      .includes(calName);

    if (doesCalendarExists) {
      throw new Error(`calendar ${calName} already exists!`);
    }

    const tmpCalendar = calendarObj.newCalendar();
    tmpCalendar.summary = calName;
    tmpCalendar.timeZone = calendarObj.Settings.get('timezone').value;

    const calendar = calendarObj.Calendars.insert(tmpCalendar);
    return calendar;
  }

  private deleteCalendar(calName: string) {
    const calendarObj = this.getGoogleCalendarObj();
    const calendar = this.getCalendarByName(calName);

    if (calendar) {
      calendarObj.Calendars.remove(calendar.id);
      this.logger(`deleted calendar ${calendar.summary}`);
    }
  }

  /* GOOGLE CALENDAR - EVENTS =========================== */

  private getEventsFromCalendar(calendar: GoogleAppsScript.Calendar.Schema.Calendar) {
    const allEvents = this.getGoogleCalendarObj().Events.list(calendar.id, { maxResults: 2500 }).items;
    const parsedEventsArr = allEvents.map((ev) => this.parseGoogleEvent(ev));
    return parsedEventsArr;
  }

  private parseGoogleEvent(ev: GoogleEvent) {
    const parsedGoogleEvent: ParsedGoogleEvent = {
      id: ev.id,
      summary: ev.summary,
      description: ev.description ?? '',
      htmlLink: ev.htmlLink,
      attendees: ev.attendees ?? [],
      reminders: ev.reminders ?? {},
      visibility: ev.visibility ?? 'default',
      start: ev.start,
      end: ev.end,
      created: ev.created,
      updated: ev.updated,
      colorId: ev.colorId,
      extendedProperties: ev.extendedProperties ?? {}
    };

    return parsedGoogleEvent;
  }

  private addEventToCalendar(calendar: GoogleAppsScript.Calendar.Schema.Calendar, event: GoogleEvent) {
    try {
      const eventFinal = this.getGoogleCalendarObj().Events.insert(event, calendar.id);
      return eventFinal;
    } catch (e: any) {
      this.logger(`error when adding event [${event.summary}] to gcal: ${e.message}`);
      return event;
    }
  }

  private updateEventFromCalendar(calendar: GoogleAppsScript.Calendar.Schema.Calendar, event: GoogleEvent, updatedProps: any) {
    const updatedEvent = this.getEventById(calendar, event.id);

    const finalObj = {
      ...updatedEvent,
      ...updatedProps
    };

    this.getGoogleCalendarObj().Events.update(finalObj, calendar.id, event.id);
  }

  private moveEventToOtherCalendar(calendar: GoogleAppsScript.Calendar.Schema.Calendar, event: GoogleEvent, newCalendar: GoogleAppsScript.Calendar.Schema.Calendar) {
    this.removeCalendarEvent(calendar, event);
    const newEvent = this.addEventToCalendar(newCalendar, event);
    return newEvent;
  }

  private removeCalendarEvent(calendar: GoogleAppsScript.Calendar.Schema.Calendar, event: GoogleEvent) {
    try {
      this.getGoogleCalendarObj().Events.remove(calendar.id, event.id);
    } catch (e: any) {
      this.logger(`error when deleting event [${event.summary}] to gcal: ${e.message}`);
    }
  }

  private getEventById(calendar: GoogleAppsScript.Calendar.Schema.Calendar, eventId: string) {
    const event = this.getGoogleCalendarObj().Events.get(calendar.id, eventId);
    return event;
  }

  /* GOOGLE UTILTITIES FUNCTIONS ============================================ */

  private getGoogleUtilities() {
    if (this.ENVIRONMENT === 'development') {
      throw new Error(this.ERRORS.productionOnly);
    }

    return Utilities;
  }

  /* GOOGLE MAIL APP FUNCTIONS ============================================== */

  private getGoogleEmailObj() {
    if (this.ENVIRONMENT === 'development') {
      throw new Error(this.ERRORS.productionOnly);
    }

    return MailApp;
  }

  private sendEmail(emailObj: GoogleAppsScript.Mail.MailAdvancedParameters) {
    this.getGoogleEmailObj().sendEmail(emailObj);
  }

  /* GCALSYNC - SETUP / REMOVE ============================================== */

  installGcalSync() {
    this.removeAppsScriptsTrigger(this.config.settings.syncFunction);
    this.addAppsScriptsTrigger(this.config.settings.syncFunction, this.config.settings.updateFrequency);
    this.createMissingAppsScriptsProperties();

    this.logger(`${this.APPNAME} was set to run function "${this.config.settings.syncFunction}" every ${this.config.settings.updateFrequency} minutes`);
  }

  uninstallGcalSync() {
    this.removeAppsScriptsTrigger(this.config.settings.syncFunction);
    this.removeAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickAddedTasks);
    this.removeAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickUpdateTasks);
    this.removeAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickCompletedTasks);
    this.removeAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayGithubAddedCommits);
    this.removeAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayGithubDeletedCommits);
    this.removeAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.lastReleasedVersionAlerted);
    this.removeAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.lastDailyEmailSentDate);

    this.logger(`${this.APPNAME} automation was removed from appscript!`);
  }

  /* GCALSYNC - PROPERTIES ================================================== */

  createMissingAppsScriptsProperties() {
    Object.keys(this.APPS_SCRIPTS_PROPERTIES).forEach((key) => {
      const doesPropertyExist = this.getAppsScriptsProperties().includes(key);
      if (!doesPropertyExist) {
        this.logger(`created missing apps script property: ${key}`);
        this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES[key], '');
      }
    });
  }

  cleanTodayEventsStats() {
    this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickAddedTasks, '');
    this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickUpdateTasks, '');
    this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickCompletedTasks, '');
    this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayGithubAddedCommits, '');
    this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayGithubDeletedCommits, '');

    this.logger(`${this.TODAY_DATE} stats were reseted!`);
  }

  showTodayEventsStats() {
    // prettier-ignore
    const formatEventsList = (arrStr: string) => arrStr.split('\n').filter(item => item.length > 0).map((item) => `- ${item}`).join('\n')
    const TODAY_SESSION = this.getTodayEvents();

    this.logger(`stats for ${this.TODAY_DATE}`);
    this.logger(`ticktick sync - added tasks    : ${this.stringToArray(TODAY_SESSION.addedTicktickTasks).length}${this.stringToArray(TODAY_SESSION.addedTicktickTasks).length > 0 ? `\n\n${formatEventsList(TODAY_SESSION.addedTicktickTasks)}` : ''}`);
    this.logger(`ticktick sync - updated tasks  : ${this.stringToArray(TODAY_SESSION.updatedTicktickTasks).length}${this.stringToArray(TODAY_SESSION.updatedTicktickTasks).length > 0 ? `\n\n${formatEventsList(TODAY_SESSION.updatedTicktickTasks)}` : ''}`);
    this.logger(`ticktick sync - completed tasks: ${this.stringToArray(TODAY_SESSION.completedTicktickTasks).length}${this.stringToArray(TODAY_SESSION.completedTicktickTasks).length > 0 ? `\n\n${formatEventsList(TODAY_SESSION.completedTicktickTasks)}` : ''}`);
    this.logger(`github sync   - added commmits : ${this.stringToArray(TODAY_SESSION.addedGithubCommits).length}${this.stringToArray(TODAY_SESSION.addedGithubCommits).length > 0 ? `\n\n${formatEventsList(TODAY_SESSION.addedGithubCommits)}` : ''}`);
    this.logger(`github sync   - deleted commits: ${this.stringToArray(TODAY_SESSION.deletedGithubCommits).length}${this.stringToArray(TODAY_SESSION.deletedGithubCommits).length > 0 ? `\n\n${formatEventsList(TODAY_SESSION.deletedGithubCommits)}` : ''}`);
  }

  getTodayEvents() {
    const TODAY_SESSION: SessionStats = {
      addedGithubCommits: this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayGithubAddedCommits),
      addedTicktickTasks: this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickAddedTasks),
      completedTicktickTasks: this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickCompletedTasks),
      deletedGithubCommits: this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayGithubDeletedCommits),
      updatedTicktickTasks: this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickUpdateTasks)
    };
    return TODAY_SESSION;
  }

  private formatSessionStats(session: SessionStats) {
    const countitems = (item: string) => item.split('\n').filter((item) => item.length > 0).length;

    const formatedSession = {
      addedTicktickTasks: countitems(session.addedTicktickTasks),
      updatedTicktickTasks: countitems(session.updatedTicktickTasks),
      completedTicktickTasks: countitems(session.completedTicktickTasks),
      addedGithubCommits: countitems(session.addedGithubCommits),
      deletedGithubCommits: countitems(session.deletedGithubCommits)
    };

    return formatedSession;
  }

  /* GCALSYNC - SYNC ======================================================== */

  sync() {
    this.createMissingAppsScriptsProperties();

    if (this.config.options.syncTicktick) {
      const allGcalendarsNames = [...new Set([...this.config.ticktickSync.icsCalendars.map((item) => item[1]), ...this.config.ticktickSync.icsCalendars.map((item) => item[2])])];
      this.createMissingGoogleCalendars(allGcalendarsNames);
    }

    if (this.config.options.syncGithub) {
      this.createMissingGoogleCalendars([this.config.githubSync.googleCalendar]);
    }

    if (this.config.options.maintanceMode) {
      this.logger('sync skiped due to maintance mode');
      return;
    }

    const ticktickSessionStats = this.syncTicktick();
    const sessionAddedEventsQuantity = ticktickSessionStats.addedEvents.length;
    const sessionUpdatedEventsQuantity = ticktickSessionStats.updatedEvents.length;
    const sessionCompletedEventsQuantity = ticktickSessionStats.completedEvents.length;

    if (this.config.options.syncTicktick) {
      this.logger(`ticktick sync - added tasks    : ${sessionAddedEventsQuantity}`);
      this.logger(`ticktick sync - updated tasks  : ${sessionUpdatedEventsQuantity}`);
      this.logger(`ticktick sync - completed tasks: ${sessionCompletedEventsQuantity}`);
    }

    const githubSessionStats = this.syncGihub();
    const addedCommitsQuantity = githubSessionStats.addedCommits.length;
    const deletedCommitsQuantity = githubSessionStats.deletedCommits.length;

    if (this.config.options.syncGithub) {
      this.logger(`github sync   - added commits  : ${addedCommitsQuantity}`);
      this.logger(`github sync   - deleted commits: ${deletedCommitsQuantity}`);
    }

    const CUR_SESSION: SessionStats = {
      addedTicktickTasks: '',
      updatedTicktickTasks: '',
      completedTicktickTasks: '',
      addedGithubCommits: '',
      deletedGithubCommits: ''
    };

    if (sessionAddedEventsQuantity + sessionUpdatedEventsQuantity + sessionCompletedEventsQuantity > 0) {
      const todayAddedEvents = this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickAddedTasks);
      const todayUpdatedEvents = this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickUpdateTasks);
      const todayCompletedEvents = this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickCompletedTasks);

      const formatTicktickItem = (gcalEvent: GoogleEvent) => {
        const date = gcalEvent.start.date ? gcalEvent.start.date : gcalEvent.start.dateTime.split('T')[0];
        return [date, gcalEvent.extendedProperties.private.calendar, gcalEvent.summary, gcalEvent.htmlLink].join(this.EVENTS_DIVIDER);
      };

      CUR_SESSION.addedTicktickTasks = ticktickSessionStats.addedEvents.map((item) => formatTicktickItem(item)).join('\n');
      CUR_SESSION.updatedTicktickTasks = ticktickSessionStats.updatedEvents.map((item) => formatTicktickItem(item)).join('\n');
      CUR_SESSION.completedTicktickTasks = ticktickSessionStats.completedEvents.map((item) => formatTicktickItem(item)).join('\n');

      this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickAddedTasks, `${todayAddedEvents ? todayAddedEvents + '\n' : ''}${CUR_SESSION.addedTicktickTasks}`);
      this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickUpdateTasks, `${todayUpdatedEvents ? todayUpdatedEvents + '\n' : ''}${CUR_SESSION.updatedTicktickTasks}`);
      this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickCompletedTasks, `${todayCompletedEvents ? todayCompletedEvents + '\n' : ''}${CUR_SESSION.completedTicktickTasks}`);
    }

    if (addedCommitsQuantity + deletedCommitsQuantity > 0) {
      const todayAddedGithubCommits = this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayGithubAddedCommits);
      const todayDeletedGithubCommits = this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayGithubDeletedCommits);

      const formatGithubCommitItem = (gcalEvent: GoogleEvent) => {
        const gcalPrivateProperties = gcalEvent.extendedProperties.private as GcalPrivateGithub;
        const date = gcalPrivateProperties.commitDate.split('T')[0];
        const repository = gcalPrivateProperties.repository.replace(`${this.config.githubSync.username}/`, '');
        const commitMessage = this.config.githubSync.parseGithubEmojis ? this.parseGithubEmojisString(gcalPrivateProperties.commitMessage) : gcalPrivateProperties.commitMessage;
        return [date, repository, commitMessage, gcalEvent.htmlLink].join(this.EVENTS_DIVIDER);
      };

      CUR_SESSION.addedGithubCommits = githubSessionStats.addedCommits.map((item) => formatGithubCommitItem(item)).join('\n');
      CUR_SESSION.deletedGithubCommits = githubSessionStats.deletedCommits.map((item) => formatGithubCommitItem(item)).join('\n');

      this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayGithubAddedCommits, `${todayAddedGithubCommits ? todayAddedGithubCommits + '\n' : ''}${CUR_SESSION.addedGithubCommits}`);
      this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayGithubDeletedCommits, `${todayDeletedGithubCommits ? todayDeletedGithubCommits + '\n' : ''}${CUR_SESSION.deletedGithubCommits}`);
    }

    this.sendAfterSyncEmails(CUR_SESSION);

    return this.formatSessionStats(CUR_SESSION);
  }

  /* PRE SYNC FUNCTIONS ========================== */

  private createMissingGoogleCalendars(allGcalendarsNames: string[]) {
    let createdCalendar = false;
    allGcalendarsNames.forEach((calName: string) => {
      if (!this.getCalendarByName(calName)) {
        this.createCalendar(calName);
        this.logger(`created google calendar: [${calName}]`);
        createdCalendar = true;
      }
    });

    if (createdCalendar) {
      this.getGoogleUtilities().sleep(2000);
    }
  }

  private getTasksFromGoogleCalendars(allCalendars: string[]) {
    const tasks: ParsedGoogleEvent[] = allCalendars.reduce((acc, cur) => {
      const taskCalendar = cur;
      const calendar = this.getCalendarByName(taskCalendar);
      const tasksArray = this.getEventsFromCalendar(calendar);
      return [...acc, ...tasksArray];
    }, []);

    return tasks;
  }

  /* GITHUB SYNC FUNCTIONS ======================= */

  private syncGihub() {
    const githubSessionStats: GithubSessionStats = {
      addedCommits: [],
      deletedCommits: []
    };

    if (!this.config.options.syncGithub) {
      return githubSessionStats;
    }

    const resetProperties = () => {
      this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.githubCommitChangesCount, '1');
      this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.githubLastAddedCommits, '');
      this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.githubLastDeletedCommits, '');
    };

    if (this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.githubCommitChangesCount) === '') {
      resetProperties();
    }

    if (Number(this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.githubCommitChangesCount)) > this.GITHUB_REQUIRED_VALIDATIONS) {
      resetProperties();
    }

    const currentGithubSyncIndex = Number(this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.githubCommitChangesCount));
    if (currentGithubSyncIndex > 1) {
      this.logger(`checking commit changes: ${currentGithubSyncIndex}/${this.GITHUB_REQUIRED_VALIDATIONS}`);
    }

    this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.githubCommitChangesCount, (Number(currentGithubSyncIndex) + 1).toString());
    this.createMissingGoogleCalendars([this.config.githubSync.googleCalendar]);

    const githubCalendar = this.getCalendarByName(this.config.githubSync.googleCalendar);
    const allCommitsInGoogleCalendar = this.getTasksFromGoogleCalendars([this.config.githubSync.googleCalendar]);
    const allCommitsInGithub = this.getAllGithubCommits();

    const parsedCommits = allCommitsInGithub.map((it) => {
      const commitObj: ParsedGithubCommit = {
        commitDate: it.commit.author.date,
        commitMessage: it.commit.message.split('\n')[0],
        commitId: it.html_url.split('commit/')[1],
        commitUrl: it.html_url,
        repository: it.repository.full_name,
        repositoryId: it.repository.id,
        repositoryName: it.repository.name,
        repositoryOwner: it.repository.owner.login,
        repositoryDescription: it.repository.description,
        isRepositoryPrivate: it.repository.private,
        isRepositoryFork: it.repository.fork
      };
      return commitObj;
    });

    const filteredCommitsByRepository = parsedCommits.filter((item) => item.repository.search(this.config.githubSync.username) > -1);
    const onlyValidRepositories = filteredCommitsByRepository.filter((githubItem) => this.config.githubSync.ignoredRepos.includes(githubItem.repositoryName) === false);

    const addedTmpCommits: GoogleAppsScript.Calendar.Schema.Event[] = [];

    onlyValidRepositories.forEach((githubItem) => {
      const onlySameRepoCommits = allCommitsInGoogleCalendar.filter((gcalItem) => gcalItem.extendedProperties.private.repository === githubItem.repository);
      const onlySameDateTimeCommits = onlySameRepoCommits.filter((gcalItem) => gcalItem.extendedProperties.private.commitDate === githubItem.commitDate);
      const gcalEvent = onlySameDateTimeCommits.find((gcalItem) => this.parseGithubEmojisString(gcalItem.extendedProperties.private.commitMessage) === this.parseGithubEmojisString(githubItem.commitMessage));

      if (!gcalEvent) {
        const commitMessage = this.config.githubSync.parseGithubEmojis ? this.parseGithubEmojisString(githubItem.commitMessage) : githubItem.commitMessage;

        const extendProps: GcalPrivateGithub = {
          commitDate: githubItem.commitDate,
          commitMessage: commitMessage,
          commitId: githubItem.commitId,
          commitUrl: githubItem.commitUrl,
          repository: githubItem.repository,
          repositoryId: githubItem.repositoryId,
          repositoryName: githubItem.repositoryName,
          repositoryOwner: githubItem.repositoryOwner,
          repositoryDescription: githubItem.repositoryDescription ?? ''
        };

        const taskEvent: GoogleEvent = {
          summary: `${githubItem.repositoryName} - ${commitMessage}`,
          description: `repository: https://github.com/${githubItem.repository}\ncommit: ${githubItem.commitUrl}`,
          start: { dateTime: githubItem.commitDate },
          end: { dateTime: githubItem.commitDate },
          reminders: {
            useDefault: false,
            overrides: []
          },
          extendedProperties: {
            private: extendProps
          }
        };

        addedTmpCommits.push(taskEvent);
        this.logger(`detect a new commit to be added: ${githubItem.repositoryName} - ${commitMessage}`);
      }
    });

    const curTmpAddedCommits = addedTmpCommits.map((event) => `${event.summary} - ${event.start.dateTime}`).join('\n');
    if (currentGithubSyncIndex === 1) {
      this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.githubLastAddedCommits, curTmpAddedCommits);
    } else {
      const lastAddedCommits = this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.githubLastAddedCommits);
      if (curTmpAddedCommits !== lastAddedCommits) {
        this.logger(`reset github commit properties due differences in added commits`);
        resetProperties();
        return githubSessionStats;
      }
    }

    if (currentGithubSyncIndex === this.GITHUB_REQUIRED_VALIDATIONS) {
      addedTmpCommits.forEach((event) => {
        try {
          const commitGcalEvent = this.addEventToCalendar(githubCalendar, event);
          githubSessionStats.addedCommits.push(commitGcalEvent);
          this.logger(`add new commit to gcal: ${commitGcalEvent.extendedProperties.private.repositoryName} - ${commitGcalEvent.extendedProperties.private.commitMessage}`);
        } catch (e: any) {
          resetProperties();
          throw new Error(e.message);
        }
      });
    }

    /* ---------------------------------------------------------------------- */

    const deletedTmpCommits: GoogleAppsScript.Calendar.Schema.Event[] = [];

    this.getEventsFromCalendar(githubCalendar).forEach((gcalItem) => {
      const gcalEventProperties = gcalItem.extendedProperties.private as GcalPrivateGithub;
      const onlySameRepoCommits = onlyValidRepositories.filter((githubItem) => githubItem.repository === gcalEventProperties.repository);
      const onlySameDateTimeCommits = onlySameRepoCommits.filter((githubItem) => githubItem.commitDate === gcalEventProperties.commitDate);
      const commitGithub = onlySameDateTimeCommits.find((githubItem) => this.parseGithubEmojisString(githubItem.commitMessage) === this.parseGithubEmojisString(gcalEventProperties.commitMessage));

      if (!commitGithub) {
        deletedTmpCommits.push(gcalItem);
        this.logger(`detect a commit to be deleted in gcal: ${gcalItem.extendedProperties.private.repositoryName} - ${gcalItem.extendedProperties.private.commitMessage}`);
      }
    });

    const curTmpDeletedCommits = deletedTmpCommits.map((event) => `${event.summary} - ${event.start.dateTime}`).join('\n');

    if (currentGithubSyncIndex === 1) {
      this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.githubLastDeletedCommits, curTmpDeletedCommits);
    } else {
      const lastDeletedCommits = this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.githubLastDeletedCommits);
      if (curTmpDeletedCommits !== lastDeletedCommits) {
        this.logger(`reset github commit properties due differences in deleted commits`);
        resetProperties();
        return githubSessionStats;
      }
    }

    if (currentGithubSyncIndex === this.GITHUB_REQUIRED_VALIDATIONS) {
      deletedTmpCommits.forEach((event) => {
        const commitGcalEvent = this.getEventById(githubCalendar, event.id);
        this.removeCalendarEvent(githubCalendar, event);
        githubSessionStats.deletedCommits.push(commitGcalEvent);
        this.logger(`deleted new commit to gcal: ${commitGcalEvent.extendedProperties.private.repositoryName} - ${commitGcalEvent.extendedProperties.private.commitMessage}`);
      });
    }

    if (currentGithubSyncIndex === this.GITHUB_REQUIRED_VALIDATIONS) {
      this.logger(`reset github commit properties since the changes were made`);
      resetProperties();
    }

    if (addedTmpCommits.length + deletedTmpCommits.length === 0) {
      this.logger(`reset github commit properties since there are no changes to track`);
      resetProperties();
    }

    return githubSessionStats;
  }

  private getAllGithubCommits() {
    const allCommitsArr = [];

    let pageNumber = 1;
    let shouldBreak = false;

    while (shouldBreak === false) {
      const url = `https://api.github.com/search/commits?q=author:${this.config.githubSync.username}&page=${pageNumber}&sort=committer-date&per_page=100`;

      let response: GoogleAppsScript.URL_Fetch.HTTPResponse;

      if (this.config.githubSync.personalToken !== '') {
        response = this.getGoogleFetch().fetch(url, { muteHttpExceptions: true, headers: { Authorization: `Bearer ${this.config.githubSync.personalToken}` } });
      } else {
        response = this.getGoogleFetch().fetch(url, { muteHttpExceptions: true });
      }

      const data = JSON.parse(response.getContentText()) ?? {};

      if (response.getResponseCode() !== 200) {
        if (data.message === 'Validation Failed') {
          throw new Error(this.ERRORS.invalidGithubUsername);
        }

        if (data.message === 'Bad credentials') {
          throw new Error(this.ERRORS.invalidGithubToken);
        }

        throw new Error(data.message);
      }

      const commits = data.items;

      if (commits.length === 0) {
        shouldBreak = true;
        break;
      }

      allCommitsArr.push(...commits);
      pageNumber++;

      if (pageNumber > 10) {
        shouldBreak = true;
        break;
      }
    }

    return allCommitsArr;
  }

  private parseGithubEmojisString(str: string) {
    const gitmojiObj = {
      ':art:': '🎨',
      ':zap:': '⚡️',
      ':fire:': '🔥',
      ':bug:': '🐛',
      ':ambulance:': '🚑️',
      ':sparkles:': '✨',
      ':memo:': '📝',
      ':rocket:': '🚀',
      ':lipstick:': '💄',
      ':tada:': '🎉',
      ':white_check_mark:': '✅',
      ':lock:': '🔒️',
      ':closed_lock_with_key:': '🔐',
      ':bookmark:': '🔖',
      ':rotating_light:': '🚨',
      ':construction:': '🚧',
      ':green_heart:': '💚',
      ':arrow_down:': '⬇️',
      ':arrow_up:': '⬆️',
      ':pushpin:': '📌',
      ':construction_worker:': '👷',
      ':chart_with_upwards_trend:': '📈',
      ':recycle:': '♻️',
      ':heavy_plus_sign:': '➕',
      ':heavy_minus_sign:': '➖',
      ':wrench:': '🔧',
      ':hammer:': '🔨',
      ':globe_with_meridians:': '🌐',
      ':pencil2:': '✏️',
      ':poop:': '💩',
      ':rewind:': '⏪️',
      ':twisted_rightwards_arrows:': '🔀',
      ':package:': '📦️',
      ':alien:': '👽️',
      ':truck:': '🚚',
      ':page_facing_up:': '📄',
      ':boom:': '💥',
      ':bento:': '🍱',
      ':wheelchair:': '♿️',
      ':bulb:': '💡',
      ':beers:': '🍻',
      ':speech_balloon:': '💬',
      ':card_file_box:': '🗃️',
      ':loud_sound:': '🔊',
      ':mute:': '🔇',
      ':busts_in_silhouette:': '👥',
      ':children_crossing:': '🚸',
      ':building_construction:': '🏗️',
      ':iphone:': '📱',
      ':clown_face:': '🤡',
      ':egg:': '🥚',
      ':see_no_evil:': '🙈',
      ':camera_flash:': '📸',
      ':alembic:': '⚗️',
      ':mag:': '🔍️',
      ':label:': '🏷️',
      ':seedling:': '🌱',
      ':triangular_flag_on_post:': '🚩',
      ':goal_net:': '🥅',
      ':dizzy:': '💫',
      ':wastebasket:': '🗑️',
      ':passport_control:': '🛂',
      ':adhesive_bandage:': '🩹',
      ':monocle_face:': '🧐',
      ':coffin:': '⚰️',
      ':test_tube:': '🧪',
      ':necktie:': '👔',
      ':stethoscope:': '🩺',
      ':bricks:': '🧱',
      ':technologist:': '🧑‍💻',
      ':money_with_wings:': '💸',
      ':thread:': '🧵',
      ':safety_vest:': '🦺'
    };

    let curString = str;
    for (const [key, value] of Object.entries(gitmojiObj)) {
      curString = curString.replace(key, value);
    }

    return curString;
  }

  /* TICKTICK SYNC FUNCTIONS ===================== */

  private syncTicktick() {
    const sessionStats: TicktickSessionStats = {
      addedEvents: [],
      updatedEvents: [],
      completedEvents: []
    };

    if (!this.config.options.syncTicktick) {
      return sessionStats;
    }

    const allGcalendarsNames = [...new Set([...this.config.ticktickSync.icsCalendars.map((item) => item[1]), ...this.config.ticktickSync.icsCalendars.map((item) => item[2])])];
    this.createMissingGoogleCalendars(allGcalendarsNames);

    const tasksFromGoogleCalendars = this.getTasksFromGoogleCalendars(this.config.ticktickSync.icsCalendars.map((item) => item[1]));

    const taggedCalendars = this.config.ticktickSync.icsCalendars.filter((item) => typeof item[3]?.tag === 'string');
    const taggedResults = taggedCalendars.map((item) => this.checkCalendarItem(item, tasksFromGoogleCalendars));
    const taggedTmp = this.parseResults(taggedResults);

    const nonTaggedCalendars = this.config.ticktickSync.icsCalendars.filter((item) => !item[3] || (item[3] && !item[3].tag));
    const nonTaggedResults = nonTaggedCalendars.map((item) => this.checkCalendarItem(item, tasksFromGoogleCalendars, taggedResults));
    const nonTaggedTmp = this.parseResults(nonTaggedResults);
    const allTickTickTasks: ParsedIcsEvent[] = [...taggedTmp.taggedIcsTasks, ...nonTaggedTmp.taggedIcsTasks];

    sessionStats.completedEvents = this.checkCalendarCompletedTasks(tasksFromGoogleCalendars, allTickTickTasks);
    sessionStats.addedEvents = [...taggedTmp.added, ...nonTaggedTmp.added];
    sessionStats.updatedEvents = [...taggedTmp.updated, ...nonTaggedTmp.updated];

    return sessionStats;
  }

  private checkCalendarItem(calendarItem: CalendarItem, tasksFromGoogleCalendars: ParsedGoogleEvent[], taggedCalendarsResults?: IcsCalendarResult[]) {
    const [icsCal, gCalCorresponding, completedCal, calendarOptions] = calendarItem;
    let tasksFromIcs = this.getEventsFromIcsCalendar(icsCal);

    if (calendarOptions?.ignoredTags && taggedCalendarsResults) {
      calendarOptions?.ignoredTags?.forEach((tagIgnored) => {
        const ignoredCalendarInfo = taggedCalendarsResults.find((item) => item.calendarOptions.tag === tagIgnored);
        if (ignoredCalendarInfo) {
          const ignoredCalTasksIds = ignoredCalendarInfo.tasksFromIcs.map((item) => item.id);
          tasksFromIcs = tasksFromIcs.filter((task) => ignoredCalTasksIds.includes(task.id) === false);
        }
      });
    }

    const [addedTasks, updatedTasks] = this.checkTicktickAddedAndUpdatedTasks(calendarItem, tasksFromIcs, tasksFromGoogleCalendars);
    const result: IcsCalendarResult = {
      icsCal,
      gCalCorresponding,
      completedCal,
      calendarOptions: calendarOptions ?? {},
      tasksFromIcs,
      addedTasks,
      updatedTasks
    };

    return result;
  }

  private checkTicktickAddedAndUpdatedTasks(icsItem: CalendarItem, tasksFromIcs: ParsedIcsEvent[], tasksFromGoogleCalendars: ParsedGoogleEvent[]) {
    const [_icsCal, gCalCorresponding, completedCal, calendarOptions] = icsItem;
    const addedTasks: GoogleEvent[] = [];
    const updatedTasks: GoogleEvent[] = [];

    const taskCalendar = this.getCalendarByName(gCalCorresponding);
    const generateGcalDescription = (curIcsTask: ParsedIcsEvent) => `task: https://ticktick.com/webapp/#q/all/tasks/${curIcsTask.id.split('@')[0]}${curIcsTask.description ? '\n\n' + curIcsTask.description.replace(/\\n/g, '\n') : ''}`;

    const getFixedTaskName = (str: string) => {
      let fixedName = str;
      fixedName = fixedName.replace(/\\,/g, ',');
      fixedName = fixedName.replace(/\\;/g, ';');
      fixedName = fixedName.replace(/\\"/g, '"');
      fixedName = fixedName.replace(/\\\\/g, '\\');
      return fixedName;
    };

    tasksFromIcs.forEach((curIcsTask, index) => {
      const taskOnGcal = tasksFromGoogleCalendars.find((item) => item?.extendedProperties?.private?.tickTaskId === curIcsTask.id);

      if (!taskOnGcal) {
        const extendProps: GcalPrivateTicktick = {
          tickTaskId: curIcsTask.id,
          calendar: gCalCorresponding,
          completedCalendar: completedCal
        };

        const otherOptions = calendarOptions?.color ? { colorId: calendarOptions.color.toString() } : {};

        const taskEvent: GoogleEvent = {
          summary: getFixedTaskName(curIcsTask.name),
          description: generateGcalDescription(curIcsTask),
          start: curIcsTask.start,
          end: curIcsTask.end,
          reminders: {
            useDefault: true
          },
          extendedProperties: {
            private: extendProps
          },
          ...otherOptions
        };

        try {
          const addedGcalEvent = this.addEventToCalendar(taskCalendar, taskEvent);
          addedTasks.push(addedGcalEvent);
        } catch (e: any) {
          if (e.message.search('API call to calendar.events.insert failed with error: Required') > -1) {
            throw new Error(this.ERRORS.abusiveGoogleCalendarApiUse);
          } else {
            throw new Error(e.message);
          }
        }

        this.logger(`ticktick task was added to gcal: ${taskEvent.summary}`);
      } else {
        const gcalTask = tasksFromGoogleCalendars.find((gevent) => gevent?.extendedProperties?.private?.tickTaskId === curIcsTask.id);
        const changedTaskName = getFixedTaskName(curIcsTask.name) !== gcalTask.summary;
        const changedDateFormat = Object.keys(curIcsTask.start).length !== Object.keys(gcalTask.start).length;
        const changedIntialDate = curIcsTask.start['date'] !== gcalTask.start['date'] || curIcsTask.start['dateTime'] !== gcalTask.start['dateTime'];
        const changedFinalDate = curIcsTask.end['date'] !== gcalTask.end['date'] || curIcsTask.end['dateTime'] !== gcalTask.end['dateTime'];
        const changedCalendar = gCalCorresponding !== taskOnGcal.extendedProperties.private.calendar;

        let changedColor = false;
        if (calendarOptions?.color === undefined) {
          changedColor = gcalTask.colorId !== undefined;
        } else {
          changedColor = calendarOptions.color.toString() !== gcalTask.colorId;
        }

        const extendProps: GcalPrivateTicktick = {
          tickTaskId: curIcsTask.id,
          calendar: gCalCorresponding,
          completedCalendar: completedCal
        };

        const modifiedFields = {
          summary: curIcsTask.name,
          description: generateGcalDescription(curIcsTask),
          start: curIcsTask.start,
          end: curIcsTask.end,
          extendedProperties: {
            private: extendProps
          },
          colorId: calendarOptions?.color ? calendarOptions?.color.toString() : undefined
        };

        if (changedCalendar) {
          const finalGcalEvent = { ...gcalTask, ...modifiedFields };
          const oldCalendar = this.getCalendarByName(taskOnGcal.extendedProperties.private.calendar);
          this.moveEventToOtherCalendar(oldCalendar, finalGcalEvent, this.getCalendarByName(gCalCorresponding));
          updatedTasks.push(finalGcalEvent);
          this.logger(`ticktick task was moved to other calendar: ${modifiedFields.summary}`);
        } else if (changedTaskName || changedDateFormat || changedIntialDate || changedFinalDate || changedColor) {
          this.updateEventFromCalendar(taskCalendar, gcalTask, modifiedFields);
          const finalGcalEvent = { ...gcalTask, ...modifiedFields };
          updatedTasks.push(finalGcalEvent);

          this.logger(`ticktick task was updated: ${modifiedFields.summary}`);
        }
      }
    });

    return [addedTasks, updatedTasks];
  }

  private checkCalendarCompletedTasks(tasksFromGoogleCalendars: ParsedGoogleEvent[], allTickTickTasks: ParsedIcsEvent[]) {
    const completedTasks: GoogleEvent[] = [];
    const onlyTickEventsInGcal = tasksFromGoogleCalendars.filter((item) => item?.extendedProperties?.private?.tickTaskId);

    onlyTickEventsInGcal.forEach((gcalEvent) => {
      const isTaskStillInTickTick = allTickTickTasks.map((item) => item.id).includes(gcalEvent?.extendedProperties?.private?.tickTaskId);

      if (!isTaskStillInTickTick) {
        const oldCalendar = this.getCalendarByName(gcalEvent.extendedProperties.private.calendar);
        const completedCalendar = this.getCalendarByName(gcalEvent.extendedProperties.private.completedCalendar);

        const returnedEv = this.moveEventToOtherCalendar(oldCalendar, { ...gcalEvent, colorId: undefined }, completedCalendar);
        this.getGoogleUtilities().sleep(2000);
        completedTasks.push(returnedEv);

        this.logger(`ticktick task was completed: ${gcalEvent.summary}`);
      }
    });

    return completedTasks;
  }

  private parseResults(taggedResults: IcsCalendarResult[]): ParsedResult {
    if (taggedResults.length === 0) {
      return {
        added: [],
        taggedIcsTasks: [],
        updated: []
      };
    }

    const taggedTmp = taggedResults.reduce((acc, cur) => {
      if (!acc['added']) {
        acc.added = [];
        acc.updated = [];
        acc.taggedIcsTasks = [];
      }

      acc.added.push(...cur.addedTasks);
      acc.updated.push(...cur.updatedTasks);
      acc.taggedIcsTasks.push(...cur.tasksFromIcs);
      return acc;
    }, {} as ParsedResult);

    return taggedTmp;
  }

  /* GCALSYNC - EMAIL ======================================================= */

  private sendAfterSyncEmails(curSession: SessionStats) {
    if (this.config.options.emailSession) {
      this.sendSessionEmail(curSession);
    }

    const alreadySentTodayEmails = this.TODAY_DATE === this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.lastDailyEmailSentDate);

    if (this.isCurrentTimeAfter(this.config.datetime.dailyEmailsTime) && !alreadySentTodayEmails) {
      this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.lastDailyEmailSentDate, this.TODAY_DATE);

      if (this.config.options.emailDailySummary) {
        this.sendDailySummaryEmail(this.getTodayEvents());
        this.cleanTodayEventsStats();
      }

      if (this.config.options.emailNewRelease) {
        const latestRelease = this.getLatestGcalSyncRelease();
        const latestVersion = this.parseGcalVersion(latestRelease.tag_name);
        const currentVersion = this.parseGcalVersion(this.VERSION);
        const lastAlertedVersion = this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.lastReleasedVersionAlerted) ?? '';

        if (latestVersion > currentVersion && latestVersion.toString() != lastAlertedVersion) {
          this.sendNewReleaseEmail(latestRelease);
          this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.lastReleasedVersionAlerted, latestVersion.toString());
        }
      }
    }
  }

  /* EMAIL FUNCTIONS ============================= */

  private sendNewReleaseEmail(lastReleaseObj: any) {
    const message = `Hi!
      <br/><br/>
      a new <a href="https://github.com/${this.GITHUB_REPOSITORY}">${this.APPNAME}</a> version is available: <br/>
      <ul>
        <li>new version: ${lastReleaseObj.tag_name}</li>
        <li>published at: ${lastReleaseObj.published_at}</li>
        <li>details: <a href="https://github.com/${this.GITHUB_REPOSITORY}/releases">here</a></li>
      </ul>
      to update, replace the old version number in your apps scripts <a href="https://script.google.com/">gcal sync project</a> to the new version: ${lastReleaseObj.tag_name.replace('v', '')}<br/>
      and also check if you need to change the setup code in the <a href='https://github.com/${this.GITHUB_REPOSITORY}#installation'>installation section</a>.
      <br /><br />
      Regards,
      your <a href='https://github.com/${this.GITHUB_REPOSITORY}'>${this.APPNAME}</a> bot
    `;

    const emailObj = {
      to: this.USER_EMAIL,
      name: `${this.APPNAME}`,
      subject: `new version [${lastReleaseObj.tag_name}] was released - ${this.APPNAME}`,
      htmlBody: message
    };

    this.sendEmail(emailObj);
    this.logger(`new release email was sent to ${this.USER_EMAIL}`);
  }

  private sendSessionEmail(sessionStats: SessionStats) {
    const content = this.generateReportEmailContent(sessionStats);
    if (!content) {
      return;
    }
    const message = {
      to: this.USER_EMAIL,
      name: `${this.APPNAME}`,
      subject: `session report - ${this.getTotalSessionEvents(sessionStats)} modifications - ${this.APPNAME}`,
      htmlBody: content
    };

    this.sendEmail(message);

    this.logger(`session email was sent to ${this.USER_EMAIL}`);
  }

  private sendDailySummaryEmail(todaySession: SessionStats) {
    const content = this.generateReportEmailContent(todaySession);
    if (!content) {
      return;
    }

    const message = {
      to: this.USER_EMAIL,
      name: `${this.APPNAME}`,
      subject: `daily report for ${this.TODAY_DATE} - ${this.getTotalSessionEvents(todaySession)} modifications - ${this.APPNAME}`,
      htmlBody: content
    };

    this.sendEmail(message);

    this.logger(`summary email was sent to ${this.USER_EMAIL}`);
  }

  sendErrorEmail(errorMessage: string) {
    if (!this.config.options.emailErrors || !errorMessage) {
      return;
    }
    this.logger(`an error occurred: `);
    this.logger(errorMessage);

    const content = `Hi!
    <br/><br/>
    an error recently occurred: <br/><br/>
    <b>${errorMessage}</b>
    <br /><br />
    Regards,
    your <a href='https://github.com/${this.GITHUB_REPOSITORY}'>${this.APPNAME}</a> bot
  `;

    const message = {
      to: this.USER_EMAIL,
      name: `${this.APPNAME}`,
      subject: `an error occurred - ${this.APPNAME}`,
      htmlBody: content
    };

    this.sendEmail(message);

    this.logger(`error email was sent to ${this.USER_EMAIL}`);
  }

  /* EMAIL HELPER FUNCTIONS ====================== */

  private parseGcalVersion(v: string) {
    return Number(v.replace('v', '').split('.').join(''));
  }

  private getLatestGcalSyncRelease() {
    const json_encoded = this.getGoogleFetch().fetch(`https://api.github.com/repos/${this.GITHUB_REPOSITORY}/releases?per_page=1`);
    const lastReleaseObj = JSON.parse(json_encoded.getContentText())[0] ?? {};

    if (Object.keys(lastReleaseObj).length === 0) {
      return; // no releases were found
    }

    return lastReleaseObj;
  }

  private generateReportEmailContent(session: SessionStats) {
    const addedTicktickTasks = this.stringToArray(session.addedTicktickTasks);
    const updatedTicktickTasks = this.stringToArray(session.updatedTicktickTasks);
    const completedTicktickTasks = this.stringToArray(session.completedTicktickTasks);
    const addedGithubCommits = this.stringToArray(session.addedGithubCommits);
    const removedGithubCommits = this.stringToArray(session.deletedGithubCommits);

    const todayEventsCount = this.getTotalSessionEvents(session);

    if (todayEventsCount === 0) {
      return;
    }

    const tableStyle = `style="border: 1px solid #333; width: 90%"`;
    const tableRowStyle = `style="width: 100%"`;
    const tableRowColumnStyle = `style="border: 1px solid #333"`;

    const getTableBodyItemsHtml = (itemsArr: any[]) => {
      if (!itemsArr || itemsArr.length === 0) {
        return ``;
      }

      const arr = itemsArr.map((item) => item.split(this.EVENTS_DIVIDER));
      const arrSortedByDate = arr.sort((a, b) => Number(new Date(a[0])) - Number(new Date(b[0])));

      // prettier-ignore
      const tableItems = arrSortedByDate.map((item: any[]) => {
        const [date, category, message, link] = item;
        const itemHtmlRow = [date, category, `<a href="${link}">${message}</a>`].map(it => `<td ${tableRowColumnStyle}>&nbsp;&nbsp;${it}</td>`).join('\n')
        return `<tr ${tableRowStyle}">\n${itemHtmlRow}\n</tr>`
      }).join('\n');

      return `${tableItems}`;
    };

    const ticktickTableHeader = `<tr ${tableRowStyle}">\n<th ${tableRowColumnStyle} width="80px">date</th><th ${tableRowColumnStyle} width="130px">calendar</th><th ${tableRowColumnStyle} width="auto">task</th>\n</tr>`;
    const githubTableHeader = `<tr ${tableRowStyle}">\n<th ${tableRowColumnStyle} width="80px">date</th><th ${tableRowColumnStyle} width="130px">repository</th><th ${tableRowColumnStyle} width="auto">commit</th>\n</tr>`;

    let content = '';
    content = `Hi!<br/><br/>there were ${todayEventsCount} changes made to your google calendar:<br/>\n`;

    content += addedTicktickTasks.length > 0 ? `<br/>added ticktick events    : ${addedTicktickTasks.length}<br/><br/> \n <center>\n<table ${tableStyle}>\n${ticktickTableHeader}\n${getTableBodyItemsHtml(addedTicktickTasks)}\n</table>\n</center>\n` : '';
    content += updatedTicktickTasks.length > 0 ? `<br/>updated ticktick events  : ${updatedTicktickTasks.length}<br/><br/> \n <center>\n<table ${tableStyle}>\n${ticktickTableHeader}\n${getTableBodyItemsHtml(updatedTicktickTasks)}\n</table>\n</center>\n` : '';
    content += completedTicktickTasks.length > 0 ? `<br/>completed ticktick events: ${completedTicktickTasks.length}<br/><br/> \n <center>\n<table ${tableStyle}>\n${ticktickTableHeader}\n${getTableBodyItemsHtml(completedTicktickTasks)}\n</table>\n</center>\n` : '';
    content += addedGithubCommits.length > 0 ? `<br/>added commits events     : ${addedGithubCommits.length}<br/><br/> \n <center>\n<table ${tableStyle}>\n${githubTableHeader}\n${getTableBodyItemsHtml(addedGithubCommits)}\n</table>\n</center>\n` : '';
    content += removedGithubCommits.length > 0 ? `<br/>removed commits events   : ${removedGithubCommits.length}<br/><br/> \n <center>\n<table ${tableStyle}>\n${githubTableHeader}\n${getTableBodyItemsHtml(removedGithubCommits)}\n</table>\n</center>\n` : '';

    content += `<br/>Regards,<br/>your <a href='https://github.com/${this.GITHUB_REPOSITORY}'>${this.APPNAME}</a> bot`;
    return content;
  }

  private getTotalSessionEvents(session: SessionStats) {
    const todayEventsCount = this.stringToArray(session.addedTicktickTasks).length + this.stringToArray(session.updatedTicktickTasks).length + this.stringToArray(session.completedTicktickTasks).length + this.stringToArray(session.addedGithubCommits).length + this.stringToArray(session.deletedGithubCommits).length;
    return todayEventsCount;
  }

  private stringToArray(arrStr: string) {
    return arrStr.split('\n').filter((item) => item.length > 0);
  }
}
