/* eslint-disable @typescript-eslint/no-unused-vars */

/* CONFIGS TYPES ------------------------------------------------------------ */

type IcsCalendarLink = string;
type IcsTaskGcal = string;
type IcsCompletedTaskGcal = string;
type CalendarOptions = {
  tag?: string;
  ignoredTags?: string[];
};

type CalendarItem = [IcsCalendarLink, IcsTaskGcal, IcsCompletedTaskGcal, CalendarOptions];

type Config = {
  ticktickSync: {
    icsCalendars: CalendarItem[];
    syncFunction: string;
    updateFrequency: number;
    syncTicktick: boolean;
  };
  githubSync: {
    username: string;
    googleCalendar: string;
    startDate: string;
    parseGithubEmojis: boolean;
    syncGithub: boolean;
  };
  notifications: {
    email: string;
    timeToEmail: string;
    timeZoneCorrection: number;
    emailDailySummary: boolean;
    emailNewRelease: boolean;
    emailSession: boolean;
  };
  options: {
    showLogs: boolean;
    maintanceMode: boolean;
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

type ParsedGoogleEvent = Pick<GoogleEvent, 'id' | 'summary' | 'description' | 'htmlLink' | 'attendees' | 'visibility' | 'reminders' | 'start' | 'end' | 'created' | 'updated' | 'extendedProperties'>;

/* TICKTICK SYNC RELATED TYPES ---------------------------------------------- */

type ParsedIcsEvent = {
  id: string;
  name: string;
  description: string;
  tzid: string;
  start: any;
  end: any;
  taskCalendar?: string;
};

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

type GithubSessionStats = {
  addedCommits: ParsedGithubCommit[];
  deletedCommits: ParsedGithubCommit[];
};

type ParsedGithubCommit = {
  commitUrl: string;
  commitRepository: string;
  commitMessage: string;
  commitDate: string;
};

type GcalPrivateGithub = ParsedGithubCommit;

/* MAIN CLASS --------------------------------------------------------------- */

class GcalSync {
  public config: Config;

  VERSION = ''; // version
  APPNAME = 'gcal-sync';
  GITHUB_REPOSITORY = 'lucasvtiradentes/gcal-sync';
  TODAY_DATE = new Date().toISOString().split('T')[0];
  ENVIRONMENT = this.detectEnvironment();
  APPS_SCRIPTS_PROPERTIES = {
    todayTicktickAddedTasks: 'todayTicktickAddedTasks',
    todayTicktickUpdateTasks: 'todayTicktickUpdateTasks',
    todayTicktickCompletedTasks: 'todayTicktickCompletedTasks',
    todayGithubAddedCommits: 'todayGithubAddedCommits',
    todayGithubDeletedCommits: 'todayGithubDeletedCommits',
    lastReleasedVersionAlerted: 'lastReleasedVersionAlerted'
  };
  ERRORS = {
    productionOnly: 'This method cannot run in non-production environments',
    mustSpecifyConfig: 'You must specify the settings when starting the class',
    incorrectIcsCalendar: 'The provided ics/ical URL is incorrect: ',
    httpsError: 'There was a HTTP error when accessing: '
  };

  constructor(config: Config) {
    this.validateConfigs(config);
    this.config = config;

    this.logger(`${this.APPNAME} is running at version ${this.VERSION} in ${this.ENVIRONMENT} environment`);
    this.logger(`check the docs for your version here: ${`https://github.com/${this.GITHUB_REPOSITORY}/tree/v${this.VERSION}#readme`}`);
  }

  private validateConfigs(config: Config) {
    if (!config) {
      throw new Error(this.ERRORS.mustSpecifyConfig);
    }

    const validationArr = [
      { objToCheck: config, requiredKeys: ['ticktickSync', 'githubSync', 'notifications', 'options'], name: 'configs' },
      { objToCheck: config.ticktickSync, requiredKeys: ['icsCalendars', 'syncFunction', 'updateFrequency', 'syncTicktick'], name: 'configs.ticktickSync' },
      { objToCheck: config.githubSync, requiredKeys: ['username', 'googleCalendar', 'syncGithub', 'parseGithubEmojis'], name: 'configs.githubSync' },
      { objToCheck: config.notifications, requiredKeys: ['email', 'timeToEmail', 'timeZoneCorrection', 'emailNewRelease', 'emailDailySummary', 'emailSession'], name: 'configs.notifications' },
      { objToCheck: config.options, requiredKeys: ['showLogs', 'maintanceMode'], name: 'configs.options' }
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
    const dateFixedByTimezone = this.getDateFixedByTimezone(this.config.notifications.timeZoneCorrection);
    const curStamp = Number(dateFixedByTimezone.getHours()) * 60 + Number(dateFixedByTimezone.getMinutes());

    const timeArr = timeToCompare.split(':');
    const specifiedStamp = Number(timeArr[0]) * 60 + Number(timeArr[1]);

    return curStamp >= specifiedStamp;
  }

  /* DETECT ENVIRONMENT FUNCTION============================================= */
  private detectEnvironment(): Environment {
    if (typeof Calendar === 'undefined') {
      return 'development';
    } else {
      return 'production';
    }
  }

  /* LOGGER FUNCTIONS ======================================================= */

  private logger(message: string) {
    if (this.config.options.showLogs) {
      console.log(message);
    }
  }

  /* ICS CALENDARS FUNCTIONS ================================================ */

  private parseIcsStringIntoEvents(icalStr: string) {
    const eventsArr = icalStr.split('BEGIN:VEVENT\r\n').filter((item) => item.search('SUMMARY') > -1);

    const allEventsArr: ParsedIcsEvent[] = eventsArr.reduce((acc, cur) => {
      const timezone = this.getStrBetween(cur, 'TZID:', '\r\n');
      let dtstart: any = this.getStrBetween(cur, 'DTSTART;', '\r\n');
      dtstart = dtstart.slice(dtstart.search(':') + 1);
      let dtend: any = this.getStrBetween(cur, 'DTEND;', '\r\n');
      dtend = dtend.slice(dtend.search(':') + 1);

      if (dtend === '') {
        const startDateObj = this.getParsedTimeStamp(dtstart);
        const nextDate = new Date(Date.UTC(Number(startDateObj.year), Number(startDateObj.month) - 1, Number(startDateObj.day), 0, 0, 0));
        nextDate.setDate(nextDate.getDate() + 1);
        dtend = { date: nextDate.toISOString().split('T')[0] };
        dtstart = { date: `${startDateObj.year}-${startDateObj.month}-${startDateObj.day}` };
      } else {
        const startDateObj = this.getParsedTimeStamp(dtstart);
        const endDateObj = this.getParsedTimeStamp(dtend);
        dtstart = {
          dateTime: `${startDateObj.year}-${startDateObj.month}-${startDateObj.day}T${startDateObj.hours}:${startDateObj.minutes}:${startDateObj.seconds}-03:00`,
          timeZone: timezone
        };
        dtend = {
          dateTime: `${endDateObj.year}-${endDateObj.month}-${endDateObj.day}T${endDateObj.hours}:${endDateObj.minutes}:${endDateObj.seconds}-03:00`,
          timeZone: timezone
        };
      }

      const eventObj = {
        id: this.getStrBetween(cur, 'UID:', '\r\n'),
        name: this.getStrBetween(cur, 'SUMMARY:', '\r\n'),
        description: this.getStrBetween(cur, 'DESCRIPTION:', '\r\n'),
        tzid: timezone,
        start: dtstart,
        end: dtend
      };
      acc.push(eventObj);
      return acc;
    }, []);

    return allEventsArr;
  }

  private getEventsFromIcsCalendar(icsCalendarLink: IcsCalendarLink) {
    let icalStr = '';

    const url = icsCalendarLink.replace('webcal://', 'https://');
    const urlResponse = this.getGoogleFetch().fetch(url, { validateHttpsCertificates: false, muteHttpExceptions: true });
    if (urlResponse.getResponseCode() == 200) {
      icalStr = urlResponse.getContentText();

      if (icalStr.search('BEGIN:VCALENDAR') === -1) {
        throw new Error(this.ERRORS.incorrectIcsCalendar + url);
      }
    } else {
      throw new Error(this.ERRORS.httpsError + url);
    }

    const eventsArr = icalStr.search('SUMMARY:No task.') > 0 ? [] : this.parseIcsStringIntoEvents(icalStr);

    return eventsArr;
  }

  /* APPS SCRIPT PROPPERTIES ================================================ */

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

  /* APPS SCRIPTS TRIGGERS ================================================== */

  private getGoogleFetch() {
    if (this.ENVIRONMENT === 'development') {
      throw new Error(this.ERRORS.productionOnly);
    }

    return UrlFetchApp;
  }

  /* APPS SCRIPTS TRIGGERS ================================================== */

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

  /* GCAL CALENDARS ======================== */

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
    const callendarObj = this.getGoogleCalendarObj();
    const doesCalendarExists = this.getAllOwnedCalendars()
      .map((cal) => cal.summary)
      .includes(calName);

    if (doesCalendarExists) {
      throw new Error(`calendar ${calName} already exists!`);
    }

    const tmpCalendar = callendarObj.newCalendar();
    tmpCalendar.summary = calName;
    tmpCalendar.timeZone = callendarObj.Settings.get('timezone').value;

    const calendar = callendarObj.Calendars.insert(tmpCalendar);
    return calendar;
  }

  private deleteCalendar(calName: string) {
    const callendarObj = this.getGoogleCalendarObj();
    const calendar = this.getCalendarByName(calName);

    if (calendar) {
      callendarObj.Calendars.remove(calendar.id);
      this.logger(`deleted calendar ${calendar.summary}`);
    }
  }

  /* GCAL EVENTS =========================== */

  private getEventsFromCalendar(calendar: GoogleAppsScript.Calendar.Schema.Calendar) {
    const allEvents = this.getGoogleCalendarObj().Events.list(calendar.id, {}).items;
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
      extendedProperties: ev.extendedProperties ?? {}
    };

    return parsedGoogleEvent;
  }

  private addEventToCalendar(calendar: GoogleAppsScript.Calendar.Schema.Calendar, event: GoogleEvent) {
    const eventFinal = this.getGoogleCalendarObj().Events.insert(event, calendar.id);
    return eventFinal;
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
    this.getGoogleCalendarObj().Events.move(calendar.id, event.id, newCalendar.id);
  }

  private getEventById(calendar: GoogleAppsScript.Calendar.Schema.Calendar, eventId: string) {
    const event = this.getGoogleCalendarObj().Events.get(calendar.id, eventId);
    return event;
  }

  /* MAIL APP FUNCTIONS ===================================================== */

  private getGoogleEmailObj() {
    if (this.ENVIRONMENT === 'development') {
      throw new Error(this.ERRORS.productionOnly);
    }

    return MailApp;
  }

  private sendEmail(emailObj: GoogleAppsScript.Mail.MailAdvancedParameters) {
    this.getGoogleEmailObj().sendEmail(emailObj);
  }

  /* SETUP GCAL SYNC FUNCTIONS ============================================== */

  installGcalSync() {
    this.removeAppsScriptsTrigger(this.config.ticktickSync.syncFunction);
    this.addAppsScriptsTrigger(this.config.ticktickSync.syncFunction, this.config.ticktickSync.updateFrequency);

    this.logger(`${this.APPNAME} was set to run ${this.config.ticktickSync.syncFunction} every ${this.config.ticktickSync.updateFrequency} minutes`);
  }

  uninstallGcalSync() {
    this.removeAppsScriptsTrigger(this.config.ticktickSync.syncFunction);
    this.removeAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickAddedTasks);
    this.removeAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickUpdateTasks);
    this.removeAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickCompletedTasks);
    this.removeAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayGithubAddedCommits);
    this.removeAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayGithubDeletedCommits);
    this.removeAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.lastReleasedVersionAlerted);

    this.logger(`${this.APPNAME} automation was removed from appscript!`);
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

  private getTodayEvents() {
    const TODAY_SESSION: SessionStats = {
      addedGithubCommits: this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayGithubAddedCommits),
      addedTicktickTasks: this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickAddedTasks),
      completedTicktickTasks: this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickCompletedTasks),
      deletedGithubCommits: this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayGithubDeletedCommits),
      updatedTicktickTasks: this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickUpdateTasks)
    };
    return TODAY_SESSION;
  }

  sync() {
    const ticktickSessionStats = this.syncTicktick();
    const sessionAddedEventsQuantity = ticktickSessionStats.addedEvents.length;
    const sessionUpdatedEventsQuantity = ticktickSessionStats.updatedEvents.length;
    const sessionCompletedEventsQuantity = ticktickSessionStats.completedEvents.length;

    if (this.config.ticktickSync.syncTicktick) {
      this.logger(`ticktick sync - added tasks    : ${sessionAddedEventsQuantity}`);
      this.logger(`ticktick sync - updated tasks  : ${sessionUpdatedEventsQuantity}`);
      this.logger(`ticktick sync - completed tasks: ${sessionCompletedEventsQuantity}`);
    }

    const githubSessionStats = this.syncGihub();
    const addedCommitsQuantity = githubSessionStats.addedCommits.length;
    const deletedCommitsQuantity = githubSessionStats.deletedCommits.length;

    if (this.config.githubSync.syncGithub) {
      this.logger(`github sync   - added commits  : ${addedCommitsQuantity}`);
      this.logger(`github sync   - deleted commits: ${deletedCommitsQuantity}`);
    }

    /* -------------------------------------------------- */

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
        return `${date} | ${gcalEvent.extendedProperties.private.calendar} | ${gcalEvent.summary}`;
      };

      CUR_SESSION.addedTicktickTasks = ticktickSessionStats.addedEvents.map((item) => formatTicktickItem(item)).join('\n');
      this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickAddedTasks, `${todayAddedEvents ? todayAddedEvents + '\n' : ''}${CUR_SESSION.addedTicktickTasks}`);

      CUR_SESSION.updatedTicktickTasks = ticktickSessionStats.updatedEvents.map((item) => formatTicktickItem(item)).join('\n');
      this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickUpdateTasks, `${todayUpdatedEvents ? todayUpdatedEvents + '\n' : ''}${CUR_SESSION.updatedTicktickTasks}`);

      CUR_SESSION.completedTicktickTasks = ticktickSessionStats.completedEvents.map((item) => formatTicktickItem(item)).join('\n');
      this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickCompletedTasks, `${todayCompletedEvents ? todayCompletedEvents + '\n' : ''}${CUR_SESSION.completedTicktickTasks}`);
    }

    if (addedCommitsQuantity + deletedCommitsQuantity > 0) {
      const todayAddedGithubCommits = this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayGithubAddedCommits);
      const todayDeletedGithubCommits = this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayGithubDeletedCommits);

      const formatGithubCommitItem = (item: ParsedGithubCommit) => {
        const date = item.commitDate.split('T')[0];
        const repository = item.commitRepository.replace(`${this.config.githubSync.username}/`, '');
        const commitMessage = this.config.githubSync.parseGithubEmojis ? this.parseGithubEmojisString(item.commitMessage) : item.commitMessage;
        return `${date} | ${repository} | ${commitMessage}`;
      };

      CUR_SESSION.addedGithubCommits = githubSessionStats.addedCommits.map((item) => formatGithubCommitItem(item)).join('\n');
      this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayGithubAddedCommits, `${todayAddedGithubCommits ? todayAddedGithubCommits + '\n' : ''}${CUR_SESSION.addedGithubCommits}`);

      CUR_SESSION.deletedGithubCommits = githubSessionStats.deletedCommits.map((item) => formatGithubCommitItem(item)).join('\n');
      this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayGithubDeletedCommits, `${todayDeletedGithubCommits ? todayDeletedGithubCommits + '\n' : ''}${CUR_SESSION.deletedGithubCommits}`);

      this.logger('added github sync session stats to today stats');
    }

    /* -------------------------------------------------- */

    if (this.config.options.maintanceMode) {
      return;
    }

    if (this.config.notifications.emailSession) {
      this.sendSessionEmail(CUR_SESSION);
    }

    if (this.isCurrentTimeAfter(this.config.notifications.timeToEmail)) {
      if (this.config.notifications.emailDailySummary) {
        this.sendDailySummaryEmail(this.getTodayEvents());
      }

      if (this.config.notifications.emailNewRelease) {
        this.sendNewReleaseEmail();
      }
    }
  }

  /* GITHUB SYNC FUNCTIONS ================================================== */

  private syncGihub() {
    const githubSessionStats: GithubSessionStats = {
      addedCommits: [],
      deletedCommits: []
    };

    if (!this.config.githubSync.syncGithub) {
      return githubSessionStats;
    }

    if (!this.getCalendarByName(this.config.githubSync.googleCalendar)) {
      this.createCalendar(this.config.githubSync.googleCalendar);
      this.logger(`created google calendar: [${this.config.githubSync.googleCalendar}]`);
    }

    const githubCalendar = this.getCalendarByName(this.config.githubSync.googleCalendar);
    const allCommitsInGoogleCalendar = this.getEventsFromCalendar(githubCalendar);

    const allCommitsInGithub = this.getAllGithubCommits();

    const parsedCommits = allCommitsInGithub.map((item) => {
      const commitObj: ParsedGithubCommit = {
        commitUrl: item.html_url,
        commitRepository: item.commit.tree.url.replace('https://api.github.com/repos/', '').split('/git')[0],
        commitMessage: item.commit.message.split('\n')[0],
        commitDate: item.commit.author.date
      };
      return commitObj;
    });

    const filteredCommitsByRepository = parsedCommits.filter((item) => {
      const itemSearch = item.commitRepository.search(this.config.githubSync.username);
      return itemSearch > -1;
    });

    filteredCommitsByRepository.forEach((githubItem) => {
      const gcalEvent = allCommitsInGoogleCalendar.find((gcalItem) => gcalItem.extendedProperties.private.commitUrl === githubItem.commitUrl);

      const shortnedRepository = githubItem.commitRepository.replace(`${this.config.githubSync.username}/`, '');
      const commitMessage = this.config.githubSync.parseGithubEmojis ? this.parseGithubEmojisString(githubItem.commitMessage) : githubItem.commitMessage;

      if (!gcalEvent) {
        const extendProps: GcalPrivateGithub = {
          commitUrl: githubItem.commitUrl,
          commitRepository: githubItem.commitRepository,
          commitMessage: commitMessage,
          commitDate: githubItem.commitDate
        };

        const taskEvent: GoogleEvent = {
          summary: `${shortnedRepository} - ${commitMessage}`,
          description: `repository: https://github.com/${githubItem.commitRepository}\ncommit: ${githubItem.commitUrl}`,
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

        this.addEventToCalendar(githubCalendar, taskEvent);
        this.logger(`add commit to gcal: ${shortnedRepository} - ${commitMessage}`);
        githubSessionStats.addedCommits.push(githubItem);
      }
    });

    this.getEventsFromCalendar(githubCalendar).forEach((item) => {
      const commitGithub = filteredCommitsByRepository.find((commit) => commit.commitUrl === item.extendedProperties.private.commitUrl);
      if (!commitGithub) {
        this.logger(`commit ${item.extendedProperties.private.commitUrl} was deleted`);
        githubSessionStats.addedCommits.push(item.extendedProperties.private as ParsedGithubCommit);
      }
    });

    return githubSessionStats;
  }

  private getAllGithubCommits() {
    const allCommitsArr = [];

    let pageNumber = 1;
    let shouldBreak = false;

    while (shouldBreak === false) {
      const url = `https://api.github.com/search/commits?q=author:${this.config.githubSync.username}&page=${pageNumber}&sort=committer-date&per_page=100`;
      const response = this.getGoogleFetch().fetch(url);
      const data = JSON.parse(response.getContentText()) ?? {};
      const commits = data.items;

      if (commits.length === 0) {
        shouldBreak = true;
        break;
      }

      allCommitsArr.push(...commits);
      pageNumber++;
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

  /* TICKTICK SYNC FUNCTIONS ================================================ */

  private syncTicktick() {
    const sessionStats: TicktickSessionStats = {
      addedEvents: [],
      updatedEvents: [],
      completedEvents: []
    };

    if (!this.config.ticktickSync.syncTicktick) {
      return sessionStats;
    }

    this.createMissingGoogleCalendars();
    this.createMissingAppsScriptsProperties();

    const tasksFromGoogleCalendars = this.getTasksFromGoogleCalendars();

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

  private createMissingGoogleCalendars() {
    const allGcalendarsNames = [...new Set([...this.config.ticktickSync.icsCalendars.map((item) => item[1]), ...this.config.ticktickSync.icsCalendars.map((item) => item[2])])];
    allGcalendarsNames.forEach((calName: string) => {
      if (!this.getCalendarByName(calName)) {
        this.createCalendar(calName);
        this.logger(`created google calendar: [${calName}]`);
      }
    });
  }

  private createMissingAppsScriptsProperties() {
    if (!this.getAppsScriptsProperties().includes(this.APPS_SCRIPTS_PROPERTIES.todayTicktickAddedTasks)) {
      this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickAddedTasks, '');
      this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickUpdateTasks, '');
      this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.todayTicktickCompletedTasks, '');
    }
  }

  private getTasksFromGoogleCalendars() {
    const tasks: ParsedGoogleEvent[] = this.config.ticktickSync.icsCalendars.reduce((acc, cur) => {
      const taskCalendar = cur[1];
      const calendar = this.getCalendarByName(taskCalendar);
      const tasksArray = this.getEventsFromCalendar(calendar);
      acc = [].concat.apply(acc, tasksArray);
      return acc;
    }, []);

    return tasks;
  }

  private checkCalendarItem(calendarItem: CalendarItem, tasksFromGoogleCalendars: ParsedGoogleEvent[], taggedCalendarsResults?: IcsCalendarResult[]) {
    const [icsCal, gCalCorresponding, completedCal, calendarOptions] = calendarItem;
    let tasksFromIcs = this.getEventsFromIcsCalendar(icsCal);

    if (calendarOptions.ignoredTags && taggedCalendarsResults) {
      calendarOptions.ignoredTags.forEach((tagIgnored) => {
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
      calendarOptions,
      tasksFromIcs,
      addedTasks,
      updatedTasks
    };

    return result;
  }

  private checkTicktickAddedAndUpdatedTasks(icsItem: CalendarItem, tasksFromIcs: ParsedIcsEvent[], tasksFromGoogleCalendars: ParsedGoogleEvent[]) {
    const [icsCal, gCalCorresponding, completedCal, ignoredTags] = icsItem;
    const addedTasks: GoogleEvent[] = [];
    const updatedTasks: GoogleEvent[] = [];

    const taskCalendar = this.getCalendarByName(gCalCorresponding);

    tasksFromIcs.forEach((curIcsTask) => {
      const taskOnGcal = tasksFromGoogleCalendars.find((item) => item.extendedProperties.private.tickTaskId === curIcsTask.id);

      if (!taskOnGcal) {
        const extendProps: GcalPrivateTicktick = {
          tickTaskId: curIcsTask.id,
          calendar: gCalCorresponding,
          completedCalendar: completedCal
        };

        const taskEvent: GoogleEvent = {
          summary: curIcsTask.name,
          description: `task: https://ticktick.com/webapp/#q/all/tasks/${curIcsTask.id.split('@')[0]}\ndescription: ${curIcsTask.description}`,
          start: curIcsTask.start,
          end: curIcsTask.end,
          reminders: {
            useDefault: true
          },
          extendedProperties: {
            private: extendProps
          }
        };

        if (!this.config.options.maintanceMode) {
          this.addEventToCalendar(taskCalendar, taskEvent);
        }

        addedTasks.push(taskEvent);
        this.logger(`ticktick task was added to gcal: ${taskEvent.summary}`);
      } else {
        const gcalTask = tasksFromGoogleCalendars.find((gevent) => gevent.extendedProperties.private.tickTaskId === curIcsTask.id);

        const changedTaskName = curIcsTask.name !== gcalTask.summary;
        const changedDateFormat = Object.keys(curIcsTask.start).length !== Object.keys(gcalTask.start).length;
        const changedAllDate = curIcsTask.start['date'] !== gcalTask.start['date'];
        const changedSpecificDate = curIcsTask.start['dateTime'] !== gcalTask.start['dateTime'];

        if (changedTaskName || changedDateFormat || changedAllDate || changedSpecificDate) {
          const modifiedFields = {
            summary: curIcsTask.name,
            description: curIcsTask.description,
            start: curIcsTask.start,
            end: curIcsTask.end
          };

          if (!this.config.options.maintanceMode) {
            this.updateEventFromCalendar(taskCalendar, gcalTask, modifiedFields);
          }

          const finalGcalEvent = { ...gcalTask, ...modifiedFields };
          updatedTasks.push(finalGcalEvent);
          this.logger(`ticktick task was updated: ${finalGcalEvent.summary}`);
        }
      }
    });

    return [addedTasks, updatedTasks];
  }

  private checkCalendarCompletedTasks(tasksFromGoogleCalendars: ParsedGoogleEvent[], allTickTickTasks: ParsedIcsEvent[]) {
    const completedTasks: GoogleEvent[] = [];
    const onlyTickEventsInGcal = tasksFromGoogleCalendars.filter((item) => item.extendedProperties.private.tickTaskId);

    onlyTickEventsInGcal.forEach((gcalEvent) => {
      const isTaskStillInTickTick = allTickTickTasks.map((item) => item.id).includes(gcalEvent.extendedProperties.private.tickTaskId);

      if (!isTaskStillInTickTick) {
        const oldCalendar = this.getCalendarByName(gcalEvent.extendedProperties.private.calendar);
        const completedCalendar = this.getCalendarByName(gcalEvent.extendedProperties.private.completedCalendar); // this.config.ticktickSync.gcalCompleted

        if (!this.config.options.maintanceMode) {
          this.moveEventToOtherCalendar(oldCalendar, gcalEvent, completedCalendar);
        }

        completedTasks.push(gcalEvent);
        this.logger(`ticktick task was completed: ${gcalEvent.summary}`);
      }
    });

    return completedTasks;
  }

  private parseResults(taggedResults: IcsCalendarResult[]) {
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

  /* EMAIL FUNCTIONS ======================================================== */

  private sendNewReleaseEmail() {
    const lastAlertedVersion = this.getAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.lastReleasedVersionAlerted) ?? '';
    const parseVersion = (v: string) => Number(v.replace('v', '').split('.').join(''));

    const json_encoded = this.getGoogleFetch().fetch(`https://api.github.com/repos/${this.GITHUB_REPOSITORY}/releases?per_page=1`);
    const lastReleaseObj = JSON.parse(json_encoded.getContentText())[0] ?? {};

    if (Object.keys(lastReleaseObj).length === 0) {
      return; // no releases were found
    }

    const latestVersion = parseVersion(lastReleaseObj.tag_name);
    const thisVersion = parseVersion(this.VERSION);

    if (latestVersion > thisVersion && latestVersion.toString() != lastAlertedVersion) {
      const message = `Hi!
      <br/><br/>
      a new <a href="https://github.com/${this.GITHUB_REPOSITORY}">${this.APPNAME}</a> version is available: <br/>
      <ul>
        <li>new version: ${lastReleaseObj.tag_name}</li>
        <li>published at: ${lastReleaseObj.published_at}</li>
      </ul>
      you can check details <a href="https://github.com/${this.GITHUB_REPOSITORY}/releases">here</a>.
      `;

      const emailObj = {
        to: this.config.notifications.email,
        name: `${this.APPNAME}`,
        subject: `new version [${lastReleaseObj.tag_name}] was released - ${this.APPNAME}`,
        htmlBody: message
      };

      this.sendEmail(emailObj);

      this.updateAppsScriptsProperty(this.APPS_SCRIPTS_PROPERTIES.lastReleasedVersionAlerted, latestVersion.toString());
      this.logger(`a new release email was sent to ${this.config.notifications.email}`);
    }
  }

  private sendSessionEmail(sessionStats: SessionStats) {
    const content = this.generateReportEmailContent(sessionStats);
    if (!content) {
      return;
    }
    const message = {
      to: this.config.notifications.email,
      name: `${this.APPNAME}`,
      subject: `session report - ${this.getTotalSessionEvents(sessionStats)} modifications - ${this.APPNAME}`,
      htmlBody: content
    };

    this.sendEmail(message);

    this.logger(`session email was sent to ${this.config.notifications.email}`);
  }

  private sendDailySummaryEmail(todaySession: SessionStats) {
    const content = this.generateReportEmailContent(todaySession);
    if (!content) {
      return;
    }
    const message = {
      to: this.config.notifications.email,
      name: `${this.APPNAME}`,
      subject: `daily report for ${this.TODAY_DATE} - ${this.getTotalSessionEvents(todaySession)} modifications - ${this.APPNAME}`,
      htmlBody: content
    };

    this.sendEmail(message);

    this.logger(`summary email was sent to ${this.config.notifications.email}`);

    this.cleanTodayEventsStats();
  }

  /* EMAIL HELPER FUNCTIONS ================================================= */

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
      const arrSortedByDate = this.sortArrayByDate(itemsArr, 0);
      const tableItems = arrSortedByDate.map((item: any[]) => `<tr ${tableRowStyle}">\n${item.map((it) => `<td ${tableRowColumnStyle}>&nbsp;&nbsp;${it}</td>`).join('\n')}\n</tr>`).join('\n');
      return `${tableItems}`;
    };

    const ticktickTableHeader = `<tr ${tableRowStyle}">\n<th ${tableRowColumnStyle} width="80px">date</th><th ${tableRowColumnStyle} width="130px">calendar</th><th ${tableRowColumnStyle} width="auto">task</th>\n</tr>`;
    const githubTableHeader = `<tr ${tableRowStyle}">\n<th ${tableRowColumnStyle} width="80px">date</th><th ${tableRowColumnStyle} width="130px">repository</th><th ${tableRowColumnStyle} width="auto">commit</th>\n</tr>`;

    let content = '';
    content = `Hi!<br/><br/>${this.APPNAME} made ${todayEventsCount} changes to your calendar:<br/>\n`;

    content += addedTicktickTasks.length > 0 ? `<br/>added ticktick events    : ${addedTicktickTasks.length}<br/><br/> \n <center>\n<table ${tableStyle}>\n${ticktickTableHeader}\n${getTableBodyItemsHtml(addedTicktickTasks)}\n</table>\n</center>\n` : '';
    content += updatedTicktickTasks.length > 0 ? `<br/>updated ticktick events  : ${updatedTicktickTasks.length}<br/><br/> \n <center>\n<table ${tableStyle}>\n${ticktickTableHeader}\n${getTableBodyItemsHtml(updatedTicktickTasks)}\n</table>\n</center>\n` : '';
    content += completedTicktickTasks.length > 0 ? `<br/>completed ticktick events: ${completedTicktickTasks.length}<br/><br/> \n <center>\n<table ${tableStyle}>\n${ticktickTableHeader}\n${getTableBodyItemsHtml(completedTicktickTasks)}\n</table>\n</center>\n` : '';
    content += addedGithubCommits.length > 0 ? `<br/>added commits events     : ${addedGithubCommits.length}<br/><br/> \n <center>\n<table ${tableStyle}>\n${githubTableHeader}\n${getTableBodyItemsHtml(addedGithubCommits)}\n</table>\n</center>\n` : '';
    content += removedGithubCommits.length > 0 ? `<br/>removed commits events   : ${removedGithubCommits.length}<br/><br/> \n <center>\n<table ${tableStyle}>\n${githubTableHeader}\n${getTableBodyItemsHtml(removedGithubCommits)}\n</table>\n</center>\n` : '';

    content += `<br/>If you want to share feedback, please contact us at <a href='https://github.com/${this.GITHUB_REPOSITORY}'>github</a>.`;

    return content;
  }

  private getTotalSessionEvents(session: SessionStats) {
    const todayEventsCount = this.stringToArray(session.addedTicktickTasks).length + this.stringToArray(session.updatedTicktickTasks).length + this.stringToArray(session.completedTicktickTasks).length + this.stringToArray(session.addedGithubCommits).length + this.stringToArray(session.deletedGithubCommits).length;
    return todayEventsCount;
  }

  private stringToArray(arrStr: string) {
    return arrStr.split('\n').filter((item) => item.length > 0);
  }

  private sortArrayByDate(arrToSortByDate: any[], indexToSort: number) {
    if (!arrToSortByDate) {
      return [];
    }

    const arr = arrToSortByDate.map((item) => item.split(' | '));
    const sortedArr = arr.sort((a, b) => Number(new Date(a[indexToSort])) - Number(new Date(b[indexToSort])));

    return sortedArr;
  }
}
