/* eslint-disable @typescript-eslint/no-unused-vars */

type icsCalendarLink = string;
type googleCalendar = string;
type calendar = [icsCalendarLink, googleCalendar];

type Config = {
  email: string;
  icsTasksCalendars: calendar[];
  gcalCompletedCalendar: string;
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
  dtstamp: string;
  dtstart: string;
  name: string;
  id: string;
  description: string;
  sequence: string;
  tzid: string;
  taskCalendar?: string;
};

class TickSync {
  public config: Config;
  private CONFIG_KEYS: string[] = ['email', 'icsTasksCalendars', 'gcalCompletedCalendar', 'options'];

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

  private parseIcsStringIntoEvents(icalStr: string) {
    const eventsArr = icalStr.split('BEGIN:VEVENT\r\n').filter((item) => item.search('SUMMARY') > -1);

    const allEventsArr: ParsedIcsEvent[] = eventsArr.reduce((acc, cur) => {
      const eventObj = {
        dtstamp: this.getBetween(cur, 'DTSTAMP:', '\r\n'),
        dtstart: this.getBetween(cur, 'DTSTART;VALUE=DATE:', '\r\n'),
        name: this.getBetween(cur, 'SUMMARY:', '\r\n'),
        id: this.getBetween(cur, 'UID:', '\r\n'),
        description: this.getBetween(cur, 'DESCRIPTION:', '\r\n'),
        sequence: this.getBetween(cur, 'SEQUENCE:', '\r\n'),
        tzid: this.getBetween(cur, 'TZID:', '\r\n')
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

  /* ======================================================================== */

  getTasksFromIcsCalendars() {
    const tasks: ParsedIcsEvent[] = this.config.icsTasksCalendars.reduce((acc, cur) => {
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
    const tasks: ParsedGoogleEvent[] = this.config.icsTasksCalendars.reduce((acc, cur) => {
      const taskCalendar = cur[1];
      const calendar = this.getCalendarByName(taskCalendar);
      const tasksArray = this.getEventsFromCalendar(calendar);
      acc = [].concat.apply(acc, tasksArray);
      return acc;
    }, []);
    return tasks;
  }

  private createCalendars() {
    const allGcalendarsNames = [this.config.gcalCompletedCalendar, ...this.config.icsTasksCalendars.map((item) => item[1])];
    console.log('allGcalendarsNames: ', allGcalendarsNames);
    allGcalendarsNames.forEach((calName: string) => {
      if (!this.getCalendarByName(calName)) {
        this.createCalendar(calName);
      }
    });
  }

  syncEvents() {
    this.createCalendars();
    const tasksFromIcsCalendars = this.getTasksFromIcsCalendars();
    const tasksFromGoogleCalendars = this.getTasksFromGoogleCalendars();

    tasksFromIcsCalendars.forEach((curIcsTask) => {
      const doesTaksExistsOnGcal = tasksFromGoogleCalendars.map((item) => item.id).includes(curIcsTask.id);

      if (doesTaksExistsOnGcal) {
        if (curIcsTask) {
          // check if datetime is the same
          console.log(`${curIcsTask.name} - dont modify`);
        } else {
          console.log(`${curIcsTask.name} - change date`);
        }
      } else {
        console.log(`${curIcsTask.name} - create task on gcal`);
      }
    });

    tasksFromGoogleCalendars.forEach((gcalEvent) => {
      console.log(gcalEvent.extendedProperties);
    });

    console.log(tasksFromIcsCalendars);
    console.log(tasksFromGoogleCalendars);
  }
}
