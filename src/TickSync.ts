/* eslint-disable @typescript-eslint/no-unused-vars */

// type icsCalendarLink = string;
// type googleCalendar = string;
// type ignoreTagsArr = string[];

type calendar = [string, string, string[]];

type Config = {
  email: string;
  icsCalendars: calendar[];
  gcalCompletedCalendar: string;
  options: {
    emailSummary: boolean;
    showLogs: boolean;
    debugMode: boolean;
    updateFrequency: number;
  };
};

type ParsedGoogleEvent = {
  id: string;
  summary: string;
  description: string;
  link: string;
  attendees: any[];
  visibility: string;
  dateStart: any;
  dateEnd: any;
  dateCreated: any;
  dateLastUpdated: any;
  extendedProperties: any;
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

class TickSync {
  public config: Config;
  private CONFIG_KEYS: string[] = ['email', 'icsCalendars', 'gcalCompletedCalendar', 'options'];

  constructor(config: Config) {
    this.parseConfigs(config);
    this.config = config;
  }

  private parseConfigs(config: Config) {
    this.CONFIG_KEYS.forEach((key) => {
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
    const hours = splitArr[1].substring(0, 2);
    const minutes = splitArr[1].substring(2, 4);
    const seconds = splitArr[1].substring(4, 6);

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
        const startDateObj = this.getParsedTimeStamp(`${dtstart}T000000`);
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
      link: ev.htmlLink,
      attendees: ev.attendees ?? [],
      visibility: ev.visibility ?? 'default',
      dateStart: ev.start,
      dateEnd: ev.end,
      dateCreated: ev.created,
      dateLastUpdated: ev.updated,
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

  /* ======================================================================== */

  private createCalendars() {
    const allGcalendarsNames = [this.config.gcalCompletedCalendar, ...this.config.icsCalendars.map((item) => item[1])];
    allGcalendarsNames.forEach((calName: string) => {
      if (!this.getCalendarByName(calName)) {
        this.createCalendar(calName);
        if (this.config.options.showLogs) {
          console.log(`Created the calendar ${calName}`);
        }
      }
    });
  }

  private getTasksFromIcsCalendars() {
    const tasks: ParsedIcsEvent[] = this.config.icsCalendars.reduce((acc, cur) => {
      const [icsCalendar, taskCalendar, ignoreTagsArr] = cur;

      const tasksArray = ignoreTagsArr ? this.getEventsFromIcsCalendar(icsCalendar, ignoreTagsArr) : this.getEventsFromIcsCalendar(icsCalendar);
      const tasks = tasksArray.map((item) => {
        return { ...item, taskCalendar };
      });

      acc = [].concat.apply(acc, tasks);
      return acc;
    }, []);
    return tasks;
  }

  private getTasksFromGoogleCalendars() {
    const tasks: ParsedGoogleEvent[] = this.config.icsCalendars.reduce((acc, cur) => {
      const taskCalendar = cur[1];
      const calendar = this.getCalendarByName(taskCalendar);
      const tasksArray = this.getEventsFromCalendar(calendar);
      acc = [].concat.apply(acc, tasksArray);
      return acc;
    }, []);
    return tasks;
  }

  setupTickSync() {
    const updateFrequency = this.config.options.updateFrequency;
    const tickFunctionName = 'tickSync';
    const triggers = ScriptApp.getProjectTriggers();
    const tickSyncTrigger = triggers.find((item) => item.getHandlerFunction() === tickFunctionName);

    if (tickSyncTrigger) {
      ScriptApp.deleteTrigger(tickSyncTrigger);
    }

    ScriptApp.newTrigger(tickFunctionName).timeBased().everyMinutes(updateFrequency).create();
  }

  syncEvents() {
    const syncNumbers = {
      addedEvents: [],
      updatedEvents: [],
      completedEvents: []
    };

    this.createCalendars();
    const tasksFromIcsCalendars = this.getTasksFromIcsCalendars();
    const tasksFromGoogleCalendars = this.getTasksFromGoogleCalendars();

    tasksFromIcsCalendars.forEach((curIcsTask) => {
      const doesTaksExistsOnGcal = tasksFromGoogleCalendars.map((item) => item.extendedProperties.private.tickTaskId).includes(curIcsTask.id);
      const taskCalendar = this.getCalendarByName(curIcsTask.taskCalendar);

      if (!doesTaksExistsOnGcal) {
        const extendProps = {
          private: {
            tickSync: true,
            tickTaskId: curIcsTask.id,
            calendar: curIcsTask.taskCalendar
          }
        } as any;

        const taskEvent: GoogleAppsScript.Calendar.Schema.Event = {
          summary: curIcsTask.name,
          description: curIcsTask.description,
          start: curIcsTask.start,
          end: curIcsTask.end,
          reminders: {
            useDefault: true,
            overrides: []
          },
          extendedProperties: extendProps
        };

        if (!this.config.options.debugMode) {
          this.addEventToCalendar(taskCalendar, taskEvent);
        }

        if (this.config.options.showLogs) {
          syncNumbers.addedEvents.push(`${taskCalendar.summary}: ${curIcsTask.name}`);
          console.log(`added event to gcal     : [${curIcsTask.name}] / [${taskCalendar.summary}]`);
        }
      } else {
        const gcalTask = tasksFromGoogleCalendars.find((gevent) => gevent.extendedProperties.private.tickTaskId === curIcsTask.id);

        const changeTaskName = curIcsTask.name !== gcalTask.summary;
        const changeTaskDescription = curIcsTask.description !== gcalTask.description;
        const changeDateFormat = Object.keys(curIcsTask.start).length !== Object.keys(gcalTask.dateStart).length;
        const changeAllDate = curIcsTask.start['date'] !== gcalTask.dateStart['date'];
        const changeSpecificDate = curIcsTask.start['dateTime'] !== gcalTask.dateStart['dateTime'];

        if (changeTaskName || changeTaskDescription || changeDateFormat || changeAllDate || changeSpecificDate) {
          const modifiedFields = {
            summary: curIcsTask.name,
            description: curIcsTask.description,
            start: curIcsTask.start,
            end: curIcsTask.end
          };

          if (!this.config.options.debugMode) {
            this.updateEventFromCalendar(taskCalendar, gcalTask, modifiedFields);
          }

          if (this.config.options.showLogs) {
            syncNumbers.updatedEvents.push(`${taskCalendar.summary}: ${curIcsTask.name}`);
            console.log(`gcal event was updated  : [${curIcsTask.name}] / [${taskCalendar.summary}]`);
          }
        }
      }
    });

    const onlyTickEventsInGcal = tasksFromGoogleCalendars.filter((item) => item.extendedProperties.private.tickTaskId);

    onlyTickEventsInGcal.forEach((gcalEvent) => {
      const isTaskStillInTickTick = tasksFromIcsCalendars.map((item) => item.id).includes(gcalEvent.extendedProperties.private.tickTaskId);

      if (!isTaskStillInTickTick) {
        const oldCalendar = this.getCalendarByName(gcalEvent.extendedProperties.private.calendar);
        const completedCalendar = this.getCalendarByName(this.config.gcalCompletedCalendar);

        if (!this.config.options.debugMode) {
          this.moveEventToOtherCalendar(oldCalendar, gcalEvent, completedCalendar);
        }

        if (this.config.options.showLogs) {
          syncNumbers.completedEvents.push(`${gcalEvent.extendedProperties.private.calendar}: ${gcalEvent.summary}`);
          console.log(`gcal event was completed: [${gcalEvent.summary}]`);
        }
      }
    });

    if (this.config.options.showLogs) {
      console.log('------------------------------------------\n');

      console.log(`addedEvents: ${syncNumbers.addedEvents.length}`);
      console.log(syncNumbers.addedEvents);

      console.log(`updatedEvents: ${syncNumbers.updatedEvents.length}`);
      console.log(syncNumbers.updatedEvents);

      console.log(`completedEvents: ${syncNumbers.completedEvents.length}`);
      console.log(syncNumbers.completedEvents);
    }
  }
}
