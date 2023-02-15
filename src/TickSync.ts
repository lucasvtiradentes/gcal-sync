/* eslint-disable @typescript-eslint/no-unused-vars */

type icsCalendarLink = string;
type googleCalendar = string;
type calendar = [icsCalendarLink, googleCalendar];

type Config = {
  email: string;
  icsCalendars: calendar[];
  gcalCompletedCalendar: string;
  startDate: string;
  options: {
    emailSummary: boolean;
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
  private CONFIG_KEYS: string[] = ['email', 'icsCalendars', 'gcalCompletedCalendar', 'startDate', 'options'];

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
    // return `${year}-${month}-${day}`;
    // return new Date(Date.UTC(year, month, day, 0, 0, 0));
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

  private getEventsFromIcsCalendar(icsCalendarLink: string) {
    let icalStr = '';

    const url = icsCalendarLink.replace('webcal://', 'https://');
    const urlResponse = UrlFetchApp.fetch(url, { validateHttpsCertificates: false, muteHttpExceptions: true });
    if (urlResponse.getResponseCode() == 200) {
      const urlContent = RegExp('(BEGIN:VCALENDAR.*?END:VCALENDAR)', 's').exec(urlResponse.getContentText());
      if (urlContent == null) {
        throw new Error('[ERROR] Incorrect ics/ical URL: ' + url);
      } else {
        icalStr = urlContent[0];
      }
    } else {
      throw new Error('Error: Encountered HTTP error ' + urlResponse.getResponseCode() + ' when accessing ' + url);
    }

    const eventsArr = this.parseIcsStringIntoEvents(icalStr);
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
      attendees: ev.attendees.length > 0 ? ev.attendees : [],
      visibility: ev.visibility,
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
    tmpCalendar.description = 'Created by GAS';
    tmpCalendar.timeZone = Calendar.Settings.get('timezone').value;

    const calendar = Calendar.Calendars.insert(tmpCalendar);
    console.log(`Created the calendar ${calendar.summary}, with the ID ${calendar.id}`);

    return calendar;
  }

  private addEventToCalendar(calendar: GoogleAppsScript.Calendar.Schema.Calendar, event: GoogleAppsScript.Calendar.Schema.Event) {
    const eventFinal = Calendar.Events.insert(event, calendar.id);
    console.log(`event ${eventFinal.summary} was added to calendar ${calendar.summary}`);

    return eventFinal;
  }

  /* ======================================================================== */

  getTasksFromIcsCalendars() {
    const tasks: ParsedIcsEvent[] = this.config.icsCalendars.reduce((acc, cur) => {
      const [icsCalendar, taskCalendar] = cur;
      const tasksArray = this.getEventsFromIcsCalendar(icsCalendar).map((item) => {
        return { ...item, taskCalendar };
      });
      acc = [].concat.apply(acc, tasksArray);
      return acc;
    }, []);
    return tasks;
  }

  getTasksFromGoogleCalendars() {
    const tasks: ParsedGoogleEvent[] = this.config.icsCalendars.reduce((acc, cur) => {
      const taskCalendar = cur[1];
      const calendar = this.getCalendarByName(taskCalendar);
      const tasksArray = this.getEventsFromCalendar(calendar);
      acc = [].concat.apply(acc, tasksArray);
      return acc;
    }, []);
    return tasks;
  }

  private createCalendars() {
    const allGcalendarsNames = [this.config.gcalCompletedCalendar, ...this.config.icsCalendars.map((item) => item[1])];
    allGcalendarsNames.forEach((calName: string) => {
      if (!this.getCalendarByName(calName)) {
        this.createCalendar(calName);
      }
    });
  }

  syncEvents() {
    console.log(1);
    this.createCalendars();
    console.log(2);
    const tasksFromIcsCalendars = this.getTasksFromIcsCalendars();
    console.log(3);
    const tasksFromGoogleCalendars = this.getTasksFromGoogleCalendars();
    console.log(4);

    tasksFromIcsCalendars.forEach((curIcsTask) => {
      const doesTaksExistsOnGcal = tasksFromGoogleCalendars.map((item) => item.id).includes(curIcsTask.id);
      const taskCalendar = this.getCalendarByName(curIcsTask.taskCalendar);

      if (!doesTaksExistsOnGcal) {
        const extendProps = {
          private: {
            tickSync: true,
            tickTaskId: curIcsTask.id
          }
        } as any;

        const taskEvent: GoogleAppsScript.Calendar.Schema.Event = {
          summary: curIcsTask.name,
          description: curIcsTask.description,
          start: curIcsTask.start,
          end: curIcsTask.end,
          extendedProperties: extendProps
        };

        console.log(`${curIcsTask.name} - create task on gcal`);
        this.addEventToCalendar(taskCalendar, taskEvent);
      } else {
        // if (curIcsTask) {
        //   // check if datetime is the same
        //   console.log(`${curIcsTask.name} - dont modify`);
        // } else {
        //   console.log(`${curIcsTask.name} - change date`);
        // }
      }
    });

    tasksFromGoogleCalendars.forEach((gcalEvent) => {
      console.log(gcalEvent.extendedProperties);
    });

    console.log(tasksFromIcsCalendars);
    console.log(tasksFromGoogleCalendars);
  }
}

/*
      summary: event.summary ?? '',
      location: event.location ?? '',
      description: event.description ?? '',
      start: event.start,
      end: event.end,
      attendees: event.attendees ? event.attendees.map((em) => ({ email: em })) : [],
      reminders: Array.from(event.reminders as any).length > 0 ? { useDefault: false, overrides: event.reminders } : { useDefault: true },
      extendedProperties: event.extendedProperties ?? {}
*/
