/* eslint-disable @typescript-eslint/no-unused-vars */

type calendarItem = [string, string, string, string[]];

// gcalCompleted: string;
type Config = {
  synchronization: {
    icsCalendars: calendarItem[];
    syncFunction: string;
    updateFrequency: number;
  };
  summary: {
    email: string;
    timeZoneCorrection: number;
    timeToEmail: string;
  };
  options: {
    emailSummary: boolean;
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

  constructor(config: Config) {
    this.parseConfigs(config);
    this.config = config;
  }

  private parseConfigs(config: Config) {
    const CONFIG_KEYS: string[] = ['synchronization', 'summary', 'options'];
    CONFIG_KEYS.forEach((key) => {
      if (!Object.keys(config).includes(key)) {
        throw new Error(`missing key in configs: ${key}`);
      }
    });
  }

  /* ICS CALENDARS FUNCTIONS ================================================ */

  private getBetween(str: string, substr1: string, substr2: string) {
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

  private parseIcsStringIntoEvents(icalStr: string) {
    const eventsArr = icalStr.split('BEGIN:VEVENT\r\n').filter((item) => item.search('SUMMARY') > -1);

    const allEventsArr: ParsedIcsEvent[] = eventsArr.reduce((acc, cur) => {
      const timezone = this.getBetween(cur, 'TZID:', '\r\n');
      let dtstart: any = this.getBetween(cur, 'DTSTART;', '\r\n');
      dtstart = dtstart.slice(dtstart.search(':') + 1);
      let dtend: any = this.getBetween(cur, 'DTEND;', '\r\n');
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
        id: this.getBetween(cur, 'UID:', '\r\n'),
        name: this.getBetween(cur, 'SUMMARY:', '\r\n'),
        description: this.getBetween(cur, 'DESCRIPTION:', '\r\n'),
        tzid: timezone,
        start: dtstart,
        end: dtend
      };
      acc.push(eventObj);
      return acc;
    }, []);

    return allEventsArr;
  }

  private getEventsFromIcsCalendar(icsCalendarLink: string, ignoreTagsArr?: string[]) {
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

    const eventsArr = this.parseIcsStringIntoEvents(icalStr);

    if (ignoreTagsArr) {
      return eventsArr.filter((item) => {
        const hasIgnoredTag = ignoreTagsArr.some((ignored) => {
          return item.name.search(ignored) > -1;
        });
        return hasIgnoredTag === false;
      });
    }

    return eventsArr;
  }

  /* GOOGLE AGENDA FUNCTIONS ================================================ */

  private getAllCalendars() {
    const calendars = Calendar.CalendarList.list({ showHidden: true }).items;
    return calendars;
  }

  private getCalendarByName(calName: string) {
    const calendar = this.getAllCalendars().find((cal) => cal.summary === calName);
    return calendar;
  }

  private getEventsFromCalendar(calendar: GoogleAppsScript.Calendar.Schema.Calendar) {
    const allEvents = Calendar.Events.list(calendar.id, {}).items;
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
      visibility: ev.visibility ?? 'default',
      reminders: ev.reminders ?? {},
      start: ev.start,
      end: ev.end,
      created: ev.created,
      updated: ev.updated,
      extendedProperties: ev.extendedProperties ?? {}
    };

    return parsedGoogleEvent;
  }

  private getAllOwnedCalendars() {
    const owenedCalendars = Calendar.CalendarList.list({ showHidden: true }).items.filter((cal) => cal.accessRole === 'owner');
    return owenedCalendars;
  }

  private createCalendar(calName: string) {
    const doesCalendarExists = this.getAllOwnedCalendars()
      .map((cal) => cal.summary)
      .includes(calName);

    if (doesCalendarExists) {
      throw new Error(`calendar ${calName} already exists!`);
    }

    const tmpCalendar = Calendar.newCalendar();
    tmpCalendar.summary = calName;
    tmpCalendar.timeZone = Calendar.Settings.get('timezone').value;

    const calendar = Calendar.Calendars.insert(tmpCalendar);
    return calendar;
  }

  private addEventToCalendar(calendar: GoogleAppsScript.Calendar.Schema.Calendar, event: GoogleAppsScript.Calendar.Schema.Event) {
    const eventFinal = Calendar.Events.insert(event, calendar.id);
    return eventFinal;
  }

  private moveEventToOtherCalendar(calendar: GoogleAppsScript.Calendar.Schema.Calendar, event: GoogleAppsScript.Calendar.Schema.Event, newCalendar: GoogleAppsScript.Calendar.Schema.Calendar) {
    Calendar.Events.move(calendar.id, event.id, newCalendar.id);
  }

  private getEventById(calendar: GoogleAppsScript.Calendar.Schema.Calendar, eventId: string) {
    const event = Calendar.Events.get(calendar.id, eventId);
    return event;
  }

  private updateEventFromCalendar(calendar: GoogleAppsScript.Calendar.Schema.Calendar, event: GoogleAppsScript.Calendar.Schema.Event, updatedProps: any) {
    const updatedEvent = this.getEventById(calendar, event.id);

    const finalObj = {
      ...updatedEvent,
      ...updatedProps
    };
    Calendar.Events.update(finalObj, calendar.id, event.id);
  }

  /* TICKSYNC PRIVATE FUNCTIONS ============================================= */

  private createCalendars() {
    const allGcalendarsNames = [...new Set([...this.config.synchronization.icsCalendars.map((item) => item[1]), ...this.config.synchronization.icsCalendars.map((item) => item[2])])];
    allGcalendarsNames.forEach((calName: string) => {
      if (!this.getCalendarByName(calName)) {
        this.createCalendar(calName);
        if (this.config.options.showLogs) {
          console.log(`Created the calendar ${calName}`);
        }
      }
    });
  }

  private shouldSendEmail() {
    const timeArr = this.config.summary.timeToEmail.split(':');
    const specifiedStamp = Number(timeArr[0]) * 60 + Number(timeArr[1]);

    const date = new Date();
    date.setHours(date.getHours() + this.config.summary.timeZoneCorrection);
    const curStamp = Number(date.getHours()) * 60 + Number(date.getMinutes());

    return curStamp >= specifiedStamp;
  }

  private emailSummary(syncStats: SyncStats) {
    const allModifications = syncStats.addedEvents.length + syncStats.updatedEvents.length + syncStats.completedEvents.length;

    let content = '';
    content = `TickSync made ${allModifications} changes to your calendar:<br/><br/>\n`;
    const addedTasks = syncStats.addedEvents.map((item: string) => `<li>${item}</li>`);
    const updatedTasks = syncStats.updatedEvents.map((item: string) => `<li>${item}</li>`);
    const completedTasks = syncStats.completedEvents.map((item: string) => `<li>${item}</li>`);
    content += addedTasks.length > 0 ? `added events:<br/> \n <ul>\n${addedTasks.join('\n')}</ul>\n` : '';
    content += updatedTasks.length > 0 ? `updated events:<br/> \n <ul>\n${updatedTasks.join('\n')}</ul>\n` : '';
    content += completedTasks.length > 0 ? `completed events:<br/> \n <ul>\n${completedTasks.join('\n')}</ul>\n` : '';
    content += "If you want to share feedback, please contact us at <a href='https://github.com/lucasvtiradentes/ticktick-gcal-sync'>github</a>.";

    const message = {
      to: this.config.summary.email,
      name: 'TickSync bot',
      subject: `TickSync summary for ${new Date().toLocaleString('pt-br').split(', ')[0]} - ${allModifications} modifications`,
      htmlBody: content
    };

    MailApp.sendEmail(message);

    if (this.config.options.showLogs) {
      console.log(`summary email was sent to ${this.config.summary.email}`);
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

        if (this.config.options.showLogs) {
          const date = curIcsTask.start.date ? curIcsTask.start.date : curIcsTask.start.dateTime.split('T')[0];
          const taskRow = `${date} | ${taskCalendar.summary} | ${curIcsTask.name}`;
          addedTasks.push(taskRow);
          console.log(`added event to gcal     : ${taskRow}`);
        }
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

          if (this.config.options.showLogs) {
            const date = curIcsTask.start.date ? curIcsTask.start.date : curIcsTask.start.dateTime.split('T')[0];
            const taskRow = `${date} | ${taskCalendar.summary} | ${curIcsTask.name}`;
            updatedTasks.push(taskRow);
            console.log(`gcal event was updated  : ${taskRow}`);
          }
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

        if (this.config.options.showLogs) {
          const date = gcalEvent.start.date ? gcalEvent.start.date : gcalEvent.start.dateTime.split('T')[0];
          const taskRow = `${date} | ${gcalEvent.extendedProperties.private.calendar} | ${gcalEvent.summary}`;
          completedTasks.push(taskRow);
          console.log(`gcal event was completed: ${taskRow}`);
        }
      }
    });

    return completedTasks;
  }

  /* TICKSYNC PUBLIC FUNCTIONS ============================================== */

  setupTickSync() {
    const tickSyncTrigger = ScriptApp.getProjectTriggers().find((item) => item.getHandlerFunction() === this.config.synchronization.syncFunction);

    if (tickSyncTrigger) {
      ScriptApp.deleteTrigger(tickSyncTrigger);
    }

    ScriptApp.newTrigger(this.config.synchronization.syncFunction).timeBased().everyMinutes(this.config.synchronization.updateFrequency).create();

    if (this.config.options.showLogs) {
      console.log(`setup TickSync to run ${this.config.synchronization.syncFunction} update every ${this.config.synchronization.updateFrequency} minutes`);
    }
  }

  uninstallTickSync() {
    const tickSyncTrigger = ScriptApp.getProjectTriggers().find((item) => item.getHandlerFunction() === this.config.synchronization.syncFunction);

    if (tickSyncTrigger) {
      ScriptApp.deleteTrigger(tickSyncTrigger);
      if (this.config.options.showLogs) {
        console.log(`TickSync looping funtion trigger was removed!`);
      }
    }
  }

  cleanTodayEventsStats() {
    const scriptProperties = PropertiesService.getScriptProperties();

    scriptProperties.setProperty('addedEvents', '');
    scriptProperties.setProperty('updatedEvents', '');
    scriptProperties.setProperty('completedEvents', '');

    if (this.config.options.showLogs) {
      console.log(`${new Date().toLocaleString('pt-br').split(', ')[0]} stats were reseted!`);
    }
  }

  showTodayEventsStats() {
    const scriptProperties = PropertiesService.getScriptProperties();

    console.log(`stats for ${new Date().toLocaleString('pt-br').split(', ')[0]}`);

    // prettier-ignore
    const fixList = (arrStr: string) => arrStr.split('\n').filter(item => item.length > 0).map((item) => `- ${item}`).join('\n');

    const addedEvents = scriptProperties.getProperty('addedEvents');
    const updatedEvents = scriptProperties.getProperty('updatedEvents');
    const completedEvents = scriptProperties.getProperty('completedEvents');

    console.log(`addedEvents: ${addedEvents.length}`, addedEvents.length > 0 ? `\n\n${fixList(addedEvents)}` : '');
    console.log(`updatedEvents: ${addedEvents.length}`, updatedEvents.length > 0 ? `\n\n${fixList(updatedEvents)}` : '');
    console.log(`completedEvents: ${addedEvents.length}`, completedEvents.length > 0 ? `\n\n${fixList(completedEvents)}` : '');
  }

  getTasksFromGoogleCalendars() {
    const tasks: ParsedGoogleEvent[] = this.config.synchronization.icsCalendars.reduce((acc, cur) => {
      const taskCalendar = cur[1];
      const calendar = this.getCalendarByName(taskCalendar);
      const tasksArray = this.getEventsFromCalendar(calendar);
      acc = [].concat.apply(acc, tasksArray);
      return acc;
    }, []);
    return tasks;
  }

  syncEvents() {
    const sessionStats: SyncStats = {
      addedEvents: [],
      updatedEvents: [],
      completedEvents: []
    };

    this.createCalendars();

    const tasksFromGoogleCalendars = this.getTasksFromGoogleCalendars();
    const allTickTickTasks: ParsedIcsEvent[] = [];

    this.config.synchronization.icsCalendars.forEach((icsItem) => {
      const [icsCal, gCalCorresponding, completedCal, ignoredTags] = icsItem;
      const tasksFromIcs = ignoredTags ? this.getEventsFromIcsCalendar(icsCal, ignoredTags) : this.getEventsFromIcsCalendar(icsCal);
      allTickTickTasks.push(...tasksFromIcs);
      const [added, updated] = this.checkTicktickAddedAndUpdatedTasks(icsItem, tasksFromIcs, tasksFromGoogleCalendars);
      sessionStats.addedEvents.push(...added);
      sessionStats.updatedEvents.push(...updated);
    });

    sessionStats.completedEvents = this.checkCalendarCompletedTasks(tasksFromGoogleCalendars, allTickTickTasks);

    if (this.config.options.showLogs) {
      console.log(`addedEvents: ${sessionStats.addedEvents.length}`);
      console.log(`updatedEvents: ${sessionStats.updatedEvents.length}`);
      console.log(`completedEvents: ${sessionStats.completedEvents.length}`);
    }

    if (this.config.options.emailSummary && !this.config.options.maintanceMode) {
      const scriptProperties = PropertiesService.getScriptProperties();

      if (!scriptProperties.getKeys().includes('addedEvents')) {
        scriptProperties.setProperties({
          addedEvents: '',
          updatedEvents: '',
          completedEvents: ''
        });
      }

      const sessionEventsCount = sessionStats.addedEvents.length + sessionStats.updatedEvents.length + sessionStats.completedEvents.length;
      const addEv = scriptProperties.getProperty('addedEvents');
      const updEv = scriptProperties.getProperty('updatedEvents');
      const comEv = scriptProperties.getProperty('completedEvents');

      if (sessionEventsCount > 0) {
        scriptProperties.setProperty('addedEvents', `${addEv ? addEv + '\n' : ''}${sessionStats.addedEvents.join('\n')}`);
        scriptProperties.setProperty('updatedEvents', `${updEv ? updEv + '\n' : ''}${sessionStats.updatedEvents.join('\n')}`);
        scriptProperties.setProperty('completedEvents', `${comEv ? comEv + '\n' : ''}${sessionStats.completedEvents.join('\n')}`);

        if (this.config.options.showLogs) {
          console.log('adding date stats to properties');
        }
      }

      const todayEventsCount = addEv.split('\n').filter((item) => item.length > 0).length + updEv.split('\n').filter((item) => item.length > 0).length + comEv.split('\n').filter((item) => item.length > 0).length;
      if (todayEventsCount > 0 && this.shouldSendEmail()) {
        const dateStats: SyncStats = {
          // prettier-ignore
          addedEvents: scriptProperties.getProperty('addedEvents').split('\n').filter(item => item.length > 0),
          // prettier-ignore
          updatedEvents: scriptProperties.getProperty('updatedEvents').split('\n').filter(item => item.length > 0),
          // prettier-ignore
          completedEvents: scriptProperties.getProperty('completedEvents').split('\n').filter(item => item.length > 0)
        };

        this.emailSummary(dateStats);

        this.cleanTodayEventsStats();
      }
    }
  }
}
