/* eslint-disable @typescript-eslint/no-unused-vars */

type icsCalendarLink = string;
type icsTaskGcal = string;
type icsCompletedTaskGcal = string;
type calendarOptions = {
  tag?: string;
  ignoredTags?: string[];
};

type calendarItem = [icsCalendarLink, icsTaskGcal, icsCompletedTaskGcal, calendarOptions];

type IcsCalendarResult = {
  icsCal: string;
  gCalCorresponding: string;
  completedCal: string;
  calendarOptions: calendarOptions;
  tasksFromIcs: ParsedIcsEvent[];
  addedTasks: string[];
  updatedTasks: string[];
};

type Config = {
  synchronization: {
    icsCalendars: calendarItem[];
    syncFunction: string;
    updateFrequency: number;
  };
  notifications: {
    email: string;
    timeToEmail: string;
    timeZoneCorrection: number;
    emailSummary: boolean;
    emailNewRelease: boolean;
  };
  options: {
    showLogs: boolean;
    maintanceMode: boolean;
  };
};

type ParsedGoogleEvent = Pick<GoogleAppsScript.Calendar.Schema.Event, 'id' | 'summary' | 'description' | 'htmlLink' | 'attendees' | 'visibility' | 'reminders' | 'start' | 'end' | 'created' | 'updated' | 'extendedProperties'>;

type ParsedIcsEvent = {
  id: string;
  name: string;
  description: string;
  tzid: string;
  start: any;
  end: any;
  taskCalendar?: string;
};

type SyncStats = {
  addedEvents: string[];
  updatedEvents: string[];
  completedEvents: string[];
};

class TickSync {
  public config: Config;

  version = ''; // version
  appName = 'ticktick-gcal-sync';
  githubRepository = 'lucasvtiradentes/ticktick-gcal-sync';
  todayDate = new Date().toISOString().split('T')[0];
  appsScriptsProperties = {
    todayAddedEvents: 'todayAddedEvents',
    todayUpdateEvents: 'todayUpdateEvents',
    todayCompletedEvents: 'todayCompletedEvents',
    lastReleasedVersionAlerted: 'lastReleasedVersionAlerted'
  };

  constructor(config: Config) {
    this.validateConfigs(config);
    this.config = config;

    this.logger(`${this.appName} is running at version ${this.version}`);
  }

  private validateConfigs(config: Config) {
    const validationArr = [
      { objToCheck: config, requiredKeys: ['synchronization', 'notifications', 'options'], name: 'configs' },
      { objToCheck: config.synchronization, requiredKeys: ['icsCalendars', 'syncFunction', 'updateFrequency'], name: 'configs.synchronization' },
      { objToCheck: config.notifications, requiredKeys: ['email', 'timeToEmail', 'timeZoneCorrection', 'emailSummary', 'emailNewRelease'], name: 'configs.notifications' },
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

  private getEventsFromIcsCalendar(icsCalendarLink: string) {
    let icalStr = '';

    const url = icsCalendarLink.replace('webcal://', 'https://');
    const urlResponse = UrlFetchApp.fetch(url, { validateHttpsCertificates: false, muteHttpExceptions: true });
    if (urlResponse.getResponseCode() == 200) {
      icalStr = urlResponse.getContentText();

      if (icalStr.search('BEGIN:VCALENDAR') === -1) {
        throw new Error('[ERROR] Incorrect ics/ical URL: ' + url);
      }
    } else {
      throw new Error('Error: Encountered HTTP error ' + urlResponse.getResponseCode() + ' when accessing ' + url);
    }

    const eventsArr = icalStr.search('SUMMARY:No task.') > 0 ? [] : this.parseIcsStringIntoEvents(icalStr);

    return eventsArr;
  }

  /* APPS SCRIPT PROPPERTIES ================================================ */

  private getGoogleAppsScriptsObject() {
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

  private getGoogleAppsScriptsTriggerObj() {
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

  /* GCAL EVENTS =========================== */

  private getEventsFromCalendar(calendar: GoogleAppsScript.Calendar.Schema.Calendar) {
    const allEvents = this.getGoogleCalendarObj().Events.list(calendar.id, {}).items;
    const parsedEventsArr = allEvents.map((ev) => this.parseGoogleEvent(ev));
    return parsedEventsArr;
  }

  private parseGoogleEvent(ev: GoogleAppsScript.Calendar.Schema.Event) {
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

  private addEventToCalendar(calendar: GoogleAppsScript.Calendar.Schema.Calendar, event: GoogleAppsScript.Calendar.Schema.Event) {
    const eventFinal = this.getGoogleCalendarObj().Events.insert(event, calendar.id);
    return eventFinal;
  }

  private updateEventFromCalendar(calendar: GoogleAppsScript.Calendar.Schema.Calendar, event: GoogleAppsScript.Calendar.Schema.Event, updatedProps: any) {
    const updatedEvent = this.getEventById(calendar, event.id);

    const finalObj = {
      ...updatedEvent,
      ...updatedProps
    };

    this.getGoogleCalendarObj().Events.update(finalObj, calendar.id, event.id);
  }

  private moveEventToOtherCalendar(calendar: GoogleAppsScript.Calendar.Schema.Calendar, event: GoogleAppsScript.Calendar.Schema.Event, newCalendar: GoogleAppsScript.Calendar.Schema.Calendar) {
    this.getGoogleCalendarObj().Events.move(calendar.id, event.id, newCalendar.id);
  }

  private getEventById(calendar: GoogleAppsScript.Calendar.Schema.Calendar, eventId: string) {
    const event = this.getGoogleCalendarObj().Events.get(calendar.id, eventId);
    return event;
  }

  /* MAIL APP FUNCTIONS ===================================================== */

  private getGoogleEmailObj() {
    return MailApp;
  }

  private sendEmail(emailObj: GoogleAppsScript.Mail.MailAdvancedParameters) {
    this.getGoogleEmailObj().sendEmail(emailObj);
  }

  /* SETUP TICK SYNC FUNCTIONS ============================================== */

  installTickSync() {
    this.removeAppsScriptsTrigger(this.config.synchronization.syncFunction);
    this.addAppsScriptsTrigger(this.config.synchronization.syncFunction, this.config.synchronization.updateFrequency);

    this.logger(`${this.appName} was set to run ${this.config.synchronization.syncFunction} every ${this.config.synchronization.updateFrequency} minutes`);
  }

  uninstallTickSync() {
    this.removeAppsScriptsTrigger(this.config.synchronization.syncFunction);
    this.removeAppsScriptsProperty(this.appsScriptsProperties.todayAddedEvents);
    this.removeAppsScriptsProperty(this.appsScriptsProperties.todayUpdateEvents);
    this.removeAppsScriptsProperty(this.appsScriptsProperties.todayCompletedEvents);
    this.removeAppsScriptsProperty(this.appsScriptsProperties.lastReleasedVersionAlerted);

    this.logger(`${this.appName} automation was removed from appscript!`);
  }

  cleanTodayEventsStats() {
    this.updateAppsScriptsProperty(this.appsScriptsProperties.todayAddedEvents, '');
    this.updateAppsScriptsProperty(this.appsScriptsProperties.todayUpdateEvents, '');
    this.updateAppsScriptsProperty(this.appsScriptsProperties.todayCompletedEvents, '');

    this.logger(`${this.todayDate} stats were reseted!`);
  }

  showTodayEventsStats() {
    const getItems = (arrStr: string) => arrStr.split('\n').filter((item) => item.length > 0);

    this.logger(`stats for ${this.todayDate}`);

    const addedEvents = this.getAppsScriptsProperty(this.appsScriptsProperties.todayAddedEvents);
    const updatedEvents = this.getAppsScriptsProperty(this.appsScriptsProperties.todayUpdateEvents);
    const completedEvents = this.getAppsScriptsProperty(this.appsScriptsProperties.todayCompletedEvents);

    this.logger(`addedEvents: ${getItems(addedEvents).length}${getItems(addedEvents).length > 0 ? `\n\n${this.formatEventsList(addedEvents)}` : ''}`);
    this.logger(`updatedEvents: ${getItems(updatedEvents).length}${getItems(updatedEvents).length > 0 ? `\n\n${this.formatEventsList(updatedEvents)}` : ''}`);
    this.logger(`completedEvents: ${getItems(completedEvents).length}${getItems(completedEvents).length > 0 ? `\n\n${this.formatEventsList(completedEvents)}` : ''}`);
  }

  /* EMAILS FUNCTIONS ======================================================= */

  private sendNewReleaseEmail() {
    const lastAlertedVersion = this.getAppsScriptsProperty(this.appsScriptsProperties.lastReleasedVersionAlerted) ?? '';
    const parseVersion = (v: string) => Number(v.replace('v', '').split('.').join(''));

    const json_encoded = UrlFetchApp.fetch(`https://api.github.com/repos/${this.githubRepository}/releases?per_page=1`);
    const lastReleaseObj = JSON.parse(json_encoded.getContentText())[0] ?? {};

    if (Object.keys(lastReleaseObj).length === 0) {
      return; // no releases were found
    }

    const latestVersion = parseVersion(lastReleaseObj.tag_name);
    const thisVersion = parseVersion(this.version);

    if (latestVersion > thisVersion && latestVersion.toString() != lastAlertedVersion) {
      const message = `Hi!
      <br/><br/>
      a new <a href="https://github.com/${this.githubRepository}">${this.appName}</a> version is available: <br/>
      <ul>
        <li>new version: ${lastReleaseObj.tag_name}</li>
        <li>published at: ${lastReleaseObj.published_at}</li>
      </ul>
      you can check details <a href="https://github.com/${this.githubRepository}/releases">here</a>.
      `;

      const emailObj = {
        to: this.config.notifications.email,
        name: `${this.appName} bot`,
        subject: `new ${this.appName} version [${lastReleaseObj.tag_name}] was released!`,
        htmlBody: message
      };

      this.sendEmail(emailObj);

      this.updateAppsScriptsProperty(this.appsScriptsProperties.lastReleasedVersionAlerted, latestVersion.toString());
      this.logger(`a new release email was sent to ${this.config.notifications.email}`);
    }
  }

  private sendSummaryEmail() {
    const fixStr = (arrStr: string) => arrStr.split('\n').filter((item) => item.length > 0);

    const addEv = fixStr(this.getAppsScriptsProperty(this.appsScriptsProperties.todayAddedEvents));
    const updEv = fixStr(this.getAppsScriptsProperty(this.appsScriptsProperties.todayUpdateEvents));
    const comEv = fixStr(this.getAppsScriptsProperty(this.appsScriptsProperties.todayCompletedEvents));

    const todayEventsCount = addEv.length + updEv.length + comEv.length;
    if (todayEventsCount > 0) {
      const todayEvents: SyncStats = {
        addedEvents: addEv,
        updatedEvents: updEv,
        completedEvents: comEv
      };

      const allModifications = todayEvents.addedEvents.length + todayEvents.updatedEvents.length + todayEvents.completedEvents.length;

      const formatedAddedEventsArr = todayEvents.addedEvents.length === 0 ? [] : this.formatSummary(todayEvents.addedEvents.join('\n')).split('\n');
      const formatedUpdatedEventsArr = todayEvents.updatedEvents.length === 0 ? [] : this.formatSummary(todayEvents.updatedEvents.join('\n')).split('\n');
      const formatedCompletedEventsArr = todayEvents.completedEvents.length === 0 ? [] : this.formatSummary(todayEvents.completedEvents.join('\n')).split('\n');

      let content = '';
      content = `Hi!<br/><br/>${this.appName} made ${allModifications} changes to your calendar:<br/><br/>\n`;
      const addedTasks = formatedAddedEventsArr.map((item: string) => `<li>${item}</li>`);
      const updatedTasks = formatedUpdatedEventsArr.map((item: string) => `<li>${item}</li>`);
      const completedTasks = formatedCompletedEventsArr.map((item: string) => `<li>${item}</li>`);
      content += addedTasks.length > 0 ? `added events: ${addedTasks.length}<br/> \n <ul>\n${addedTasks.join('\n')}</ul>\n` : '';
      content += updatedTasks.length > 0 ? `updated events: ${updatedTasks.length}<br/> \n <ul>\n${updatedTasks.join('\n')}</ul>\n` : '';
      content += completedTasks.length > 0 ? `completed events: ${completedTasks.length}<br/> \n <ul>\n${completedTasks.join('\n')}</ul>\n` : '';
      content += `If you want to share feedback, please contact us at <a href='https://github.com/${this.githubRepository}'>github</a>.`;

      const message = {
        to: this.config.notifications.email,
        name: `${this.appName} bot`,
        subject: `${this.appName} summary for ${this.todayDate} - ${allModifications} modifications`,
        htmlBody: content
      };

      this.sendEmail(message);

      this.logger(`summary email was sent to ${this.config.notifications.email}`);

      this.cleanTodayEventsStats();
    }
  }

  private formatSummary(summary: string) {
    if (summary === '' || !summary) {
      return '';
    }

    const arr = summary.split('\n').map((item) => item.split(' | '));
    const sortedArr = arr.sort((a, b) => Number(new Date(a[0])) - Number(new Date(b[0])));

    const maxCalendar = Math.max(...sortedArr.map((item) => item[1].length));
    const fixedCalendarArr = sortedArr.map((item) => {
      const [date, calendar, task] = item;
      const diffIndex = maxCalendar - calendar.length;
      const newCalendar = diffIndex === 0 ? calendar : calendar + '_'.repeat(diffIndex);
      return [date, newCalendar, task];
    });

    const strSorted = fixedCalendarArr.map((item) => item.join(' | ')).join('\n');
    return strSorted;
  }

  /* TICKSYNC SYNC FUNCTIONS ================================================ */

  syncEvents() {
    const sessionStats: SyncStats = {
      addedEvents: [],
      updatedEvents: [],
      completedEvents: []
    };

    this.createMissingGoogleCalendars();
    this.createMissingAppsScriptsProperties();

    const tasksFromGoogleCalendars = this.getTasksFromGoogleCalendars();
    const taggedCalendars = this.config.synchronization.icsCalendars.filter((item) => typeof item[3]?.tag === 'string');

    const taggedResults = taggedCalendars.map((item) => this.checkCalendarItem(item, tasksFromGoogleCalendars));
    const taggedTmp = taggedResults.reduce((acc, cur) => {
      if (!acc['added']) {
        acc['added'] = [];
        acc['updated'] = [];
        acc['taggedIcsTasks'] = [];
      }

      acc['added'].push(...cur.addedTasks);
      acc['updated'].push(...cur.updatedTasks);
      acc['taggedIcsTasks'].push(...cur.tasksFromIcs);
      return acc;
    }, {});

    sessionStats.addedEvents.push(...taggedTmp['added']);
    sessionStats.updatedEvents.push(...taggedTmp['updated']);

    const nonTaggedCalendars = this.config.synchronization.icsCalendars.filter((item) => !item[3] || (item[3] && !item[3].tag));
    const nonTaggedResults = nonTaggedCalendars.map((item) => this.checkCalendarItem(item, tasksFromGoogleCalendars, taggedResults));
    const nonTaggedTmp = nonTaggedResults.reduce((acc, cur) => {
      if (!acc['added']) {
        acc['added'] = [];
        acc['updated'] = [];
        acc['taggedIcsTasks'] = [];
      }

      acc['added'].push(...cur.addedTasks);
      acc['updated'].push(...cur.updatedTasks);
      acc['taggedIcsTasks'].push(...cur.tasksFromIcs);
      return acc;
    }, {});

    sessionStats.addedEvents.push(...nonTaggedTmp['added']);
    sessionStats.updatedEvents.push(...nonTaggedTmp['updated']);

    const allTickTickTasks: ParsedIcsEvent[] = [...taggedTmp['taggedIcsTasks'], ...nonTaggedTmp['taggedIcsTasks']];
    sessionStats.completedEvents = this.checkCalendarCompletedTasks(tasksFromGoogleCalendars, allTickTickTasks);

    this.logger(`addedEvents: ${sessionStats.addedEvents.length}`);
    this.logger(`updatedEvents: ${sessionStats.updatedEvents.length}`);
    this.logger(`completedEvents: ${sessionStats.completedEvents.length}`);

    const sessionEventsCount = sessionStats.addedEvents.length + sessionStats.updatedEvents.length + sessionStats.completedEvents.length;
    const addEv = this.getAppsScriptsProperty(this.appsScriptsProperties.todayAddedEvents);
    const updEv = this.getAppsScriptsProperty(this.appsScriptsProperties.todayUpdateEvents);
    const comEv = this.getAppsScriptsProperty(this.appsScriptsProperties.todayCompletedEvents);

    if (sessionEventsCount > 0) {
      this.updateAppsScriptsProperty(this.appsScriptsProperties.todayAddedEvents, `${addEv ? addEv + '\n' : ''}${sessionStats.addedEvents.join('\n')}`);
      this.updateAppsScriptsProperty(this.appsScriptsProperties.todayUpdateEvents, `${updEv ? updEv + '\n' : ''}${sessionStats.updatedEvents.join('\n')}`);
      this.updateAppsScriptsProperty(this.appsScriptsProperties.todayCompletedEvents, `${comEv ? comEv + '\n' : ''}${sessionStats.completedEvents.join('\n')}`);

      this.logger('adding date stats to properties');
    }

    if (this.isCurrentTimeAfter(this.config.notifications.timeToEmail)) {
      if (this.config.notifications.emailSummary) {
        this.sendSummaryEmail();
      }

      if (this.config.notifications.emailNewRelease) {
        this.sendNewReleaseEmail();
      }
    }
  }

  private createMissingGoogleCalendars() {
    const allGcalendarsNames = [...new Set([...this.config.synchronization.icsCalendars.map((item) => item[1]), ...this.config.synchronization.icsCalendars.map((item) => item[2])])];
    allGcalendarsNames.forEach((calName: string) => {
      if (!this.getCalendarByName(calName)) {
        this.createCalendar(calName);
        this.logger(`created google calendar: [${calName}]`);
      }
    });
  }

  private createMissingAppsScriptsProperties() {
    if (!this.getAppsScriptsProperties().includes(this.appsScriptsProperties.todayAddedEvents)) {
      this.updateAppsScriptsProperty(this.appsScriptsProperties.todayAddedEvents, '');
      this.updateAppsScriptsProperty(this.appsScriptsProperties.todayUpdateEvents, '');
      this.updateAppsScriptsProperty(this.appsScriptsProperties.todayCompletedEvents, '');
    }
  }

  private checkTicktickAddedAndUpdatedTasks(icsItem: calendarItem, tasksFromIcs: ParsedIcsEvent[], tasksFromGoogleCalendars: ParsedGoogleEvent[]) {
    const [icsCal, gCalCorresponding, completedCal, ignoredTags] = icsItem;
    const addedTasks: string[] = [];
    const updatedTasks: string[] = [];

    const taskCalendar = this.getCalendarByName(gCalCorresponding);

    tasksFromIcs.forEach((curIcsTask) => {
      const doesTaksExistsOnGcal = tasksFromGoogleCalendars.map((item) => item.extendedProperties.private.tickTaskId).includes(curIcsTask.id);

      if (!doesTaksExistsOnGcal) {
        const extendProps = {
          private: {
            tickTaskId: curIcsTask.id,
            calendar: gCalCorresponding,
            completedCalendar: completedCal
          }
        } as any;

        const taskEvent: GoogleAppsScript.Calendar.Schema.Event = {
          summary: curIcsTask.name,
          description: curIcsTask.description,
          start: curIcsTask.start,
          end: curIcsTask.end,
          reminders: {
            useDefault: true
          },
          extendedProperties: extendProps
        };

        if (!this.config.options.maintanceMode) {
          this.addEventToCalendar(taskCalendar, taskEvent);
        }

        const date = curIcsTask.start.date ? curIcsTask.start.date : curIcsTask.start.dateTime.split('T')[0];
        const taskRow = `${date} | ${taskCalendar.summary} | ${curIcsTask.name}`;
        addedTasks.push(taskRow);
        this.logger(`added event to gcal     : ${taskRow}`);
      } else {
        const gcalTask = tasksFromGoogleCalendars.find((gevent) => gevent.extendedProperties.private.tickTaskId === curIcsTask.id);

        const changeTaskName = curIcsTask.name !== gcalTask.summary;
        const changeTaskDescription = curIcsTask.description !== gcalTask.description;
        const changeDateFormat = Object.keys(curIcsTask.start).length !== Object.keys(gcalTask.start).length;
        const changeAllDate = curIcsTask.start['date'] !== gcalTask.start['date'];
        const changeSpecificDate = curIcsTask.start['dateTime'] !== gcalTask.start['dateTime'];

        if (changeTaskName || changeTaskDescription || changeDateFormat || changeAllDate || changeSpecificDate) {
          const modifiedFields = {
            summary: curIcsTask.name,
            description: curIcsTask.description,
            start: curIcsTask.start,
            end: curIcsTask.end
          };

          if (!this.config.options.maintanceMode) {
            this.updateEventFromCalendar(taskCalendar, gcalTask, modifiedFields);
          }

          const date = curIcsTask.start.date ? curIcsTask.start.date : curIcsTask.start.dateTime.split('T')[0];
          const taskRow = `${date} | ${taskCalendar.summary} | ${curIcsTask.name}`;
          updatedTasks.push(taskRow);
          this.logger(`gcal event was updated  : ${taskRow}`);
        }
      }
    });

    return [addedTasks, updatedTasks];
  }

  private checkCalendarCompletedTasks(tasksFromGoogleCalendars: ParsedGoogleEvent[], allTickTickTasks: ParsedIcsEvent[]) {
    const completedTasks: string[] = [];
    const onlyTickEventsInGcal = tasksFromGoogleCalendars.filter((item) => item.extendedProperties.private.tickTaskId);

    onlyTickEventsInGcal.forEach((gcalEvent) => {
      const isTaskStillInTickTick = allTickTickTasks.map((item) => item.id).includes(gcalEvent.extendedProperties.private.tickTaskId);

      if (!isTaskStillInTickTick) {
        const oldCalendar = this.getCalendarByName(gcalEvent.extendedProperties.private.calendar);
        const completedCalendar = this.getCalendarByName(gcalEvent.extendedProperties.private.completedCalendar); // this.config.synchronization.gcalCompleted

        if (!this.config.options.maintanceMode) {
          this.moveEventToOtherCalendar(oldCalendar, gcalEvent, completedCalendar);
        }

        const date = gcalEvent.start.date ? gcalEvent.start.date : gcalEvent.start.dateTime.split('T')[0];
        const taskRow = `${date} | ${gcalEvent.extendedProperties.private.calendar} | ${gcalEvent.summary}`;
        completedTasks.push(taskRow);
        this.logger(`gcal event was completed: ${taskRow}`);
      }
    });

    return completedTasks;
  }

  private formatEventsList(arrStr: string) {
    // prettier-ignore
    return this.formatSummary(arrStr.split('\n').filter(item => item.length > 0).map((item) => `- ${item}`).join('\n'));
  }

  private checkCalendarItem(calendarItem: calendarItem, tasksFromGoogleCalendars: ParsedGoogleEvent[], taggedCalendarsResults?: IcsCalendarResult[]) {
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

  private getTasksFromGoogleCalendars() {
    const tasks: ParsedGoogleEvent[] = this.config.synchronization.icsCalendars.reduce((acc, cur) => {
      const taskCalendar = cur[1];
      const calendar = this.getCalendarByName(taskCalendar);
      const tasksArray = this.getEventsFromCalendar(calendar);
      acc = [].concat.apply(acc, tasksArray);
      return acc;
    }, []);
    return tasks;
  }
}
