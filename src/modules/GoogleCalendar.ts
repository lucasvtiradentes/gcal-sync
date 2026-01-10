import { CONFIGS } from '../consts/configs';
import { logger } from '../utils/abstractions/logger';


export type TGoogleCalendar = GoogleAppsScript.Calendar.Schema.Calendar;
export type TGoogleEvent = GoogleAppsScript.Calendar.Schema.Event;

export type TGcalPrivateGithub = {
  private: {
    repository: string;
    commitDate: string;
    commitMessage: string;
    repositoryName: string;
    repositoryLink: string;
    commitId: string;
  };
};

type GcalCommon = Pick<TGoogleEvent, 'colorId' | 'id' | 'summary' | 'description' | 'htmlLink' | 'attendees' | 'visibility' | 'reminders' | 'start' | 'end' | 'created' | 'updated'>;

export type TParsedGoogleEvent<TPrivate> = GcalCommon & { extendedProperties: TPrivate };

// =============================================================================

export const getCurrentTimezoneFromGoogleCalendar = () => {
  return CalendarApp.getDefaultCalendar().getTimeZone();
};

export const createMissingCalendars = (allGcalendarsNames: string[]) => {
  let createdCalendar = false;
  logger.info(`checking calendars to create: ${JSON.stringify(allGcalendarsNames)}`);

  allGcalendarsNames.forEach((calName: string) => {
    const exists = checkIfCalendarExists(calName);
    logger.info(`calendar "${calName}" exists: ${!!exists}`);
    if (!exists) {
      createCalendar(calName);
      logger.info(`created google calendar: [${calName}]`);
      createdCalendar = true;
    }
  });

  if (createdCalendar) {
    Utilities.sleep(2000);
  }
};

export const getAllCalendars = () => {
  const calendars = Calendar.CalendarList!.list({ showHidden: true }).items ?? [];
  return calendars;
};

const checkIfCalendarExists = (calendarName: string) => {
  const allCalendars = getAllCalendars();
  const calendar = allCalendars.find((cal) => cal.summary === calendarName);
  return calendar;
};

const createCalendar = (calName: string) => {
  const calendarObj = Calendar;
  const owenedCalendars = calendarObj.CalendarList!.list({ showHidden: true }).items!.filter((cal) => cal.accessRole === 'owner');
  const doesCalendarExists = owenedCalendars.map((cal) => cal.summary).includes(calName);

  if (doesCalendarExists) {
    throw new Error(`calendar ${calName} already exists!`);
  }

  const tmpCalendar = calendarObj.newCalendar();
  tmpCalendar.summary = calName;
  tmpCalendar.timeZone = calendarObj.Settings!.get('timezone').value;

  const calendar = calendarObj.Calendars!.insert(tmpCalendar);
  return calendar;
};

export function getCalendarByName(calName: string) {
  const calendar = getAllCalendars().find((cal) => cal.summary === calName);
  return calendar;
}

function parseGoogleEvent<TPrivate>(ev: TGoogleEvent) {
  const parsedGoogleEvent: TParsedGoogleEvent<TPrivate> = {
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
    extendedProperties: (ev.extendedProperties ?? {}) as TPrivate
  };

  return parsedGoogleEvent;
}

function getEventsFromCalendar(calendar: TGoogleCalendar) {
  const allEvents = Calendar.Events.list(calendar.id, { maxResults: CONFIGS.MAX_GCAL_TASKS }).items;
  const parsedEventsArr = allEvents.map((ev) => parseGoogleEvent(ev));
  return parsedEventsArr;
}

function getEventsFromCalendarWithDateRange(calendar: TGoogleCalendar, startDate: string, endDate: string) {
  logger.info(`[DEBUG][GCAL] fetching events from ${calendar.id} between ${startDate} and ${endDate}`);

  const allEvents: GoogleAppsScript.Calendar.Schema.Event[] = [];
  let pageToken: string | undefined = undefined;
  let pageCount = 0;

  do {
    const response = Calendar.Events.list(calendar.id, {
      maxResults: 2500,
      timeMin: new Date(startDate).toISOString(),
      timeMax: new Date(endDate).toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      pageToken: pageToken
    });

    const items = response.items ?? [];
    allEvents.push(...items);
    pageToken = response.nextPageToken;
    pageCount++;

    logger.info(`[DEBUG][GCAL] page ${pageCount}: fetched ${items.length} events (total: ${allEvents.length})`);
  } while (pageToken);

  logger.info(`[DEBUG][GCAL] fetched ${allEvents.length} total events from calendar in ${pageCount} pages`);

  const parsedEventsArr = allEvents.map((ev) => parseGoogleEvent(ev));
  return parsedEventsArr;
}

export function getTasksFromGoogleCalendars<TPrivate>(allCalendars: string[]) {
  const tasks: TParsedGoogleEvent<TPrivate>[] = allCalendars.reduce((acc, cur) => {
    const taskCalendar = cur;
    const calendar = getCalendarByName(taskCalendar);
    const tasksArray = getEventsFromCalendar(calendar);
    return [...acc, ...tasksArray];
  }, []);

  return tasks;
}

export function getTasksFromGoogleCalendarsWithDateRange<TPrivate>(allCalendars: string[], startDate: string, endDate: string) {
  logger.info(`[DEBUG][GCAL] getTasksFromGoogleCalendarsWithDateRange called for ${allCalendars.length} calendars`);

  const tasks: TParsedGoogleEvent<TPrivate>[] = allCalendars.reduce((acc, cur) => {
    const taskCalendar = cur;
    const calendar = getCalendarByName(taskCalendar);
    if (!calendar) {
      logger.info(`[DEBUG][GCAL] calendar "${taskCalendar}" not found`);
      return acc;
    }
    const tasksArray = getEventsFromCalendarWithDateRange(calendar, startDate, endDate);
    return [...acc, ...tasksArray];
  }, []);

  logger.info(`[DEBUG][GCAL] total tasks from all calendars: ${tasks.length}`);
  return tasks;
}

export function addEventToCalendar(calendar: TGoogleCalendar, event: TGoogleEvent) {
  const eventFinal = Calendar.Events.insert(event, calendar.id);
  return eventFinal;
}

export function addEventsToCalendarBatch(calendar: TGoogleCalendar, events: TGoogleEvent[]) {
  if (events.length === 0) return [];

  const token = ScriptApp.getOAuthToken();
  const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar.id)}/events`;

  const requests = events.map((event) => ({
    url: baseUrl,
    method: 'post' as const,
    contentType: 'application/json',
    headers: { Authorization: `Bearer ${token}` },
    payload: JSON.stringify(event),
    muteHttpExceptions: true
  }));

  const responses = UrlFetchApp.fetchAll(requests);

  const results = responses.map((response, index) => {
    if (response.getResponseCode() === 200) {
      return JSON.parse(response.getContentText());
    } else {
      logger.info(`failed to add event ${index}: ${response.getContentText()}`);
      return null;
    }
  });

  return results.filter((r) => r !== null);
}

export function updateEventFromCalendar(calendar: TGoogleCalendar, event: TGoogleEvent, updatedProps: any) {
  const updatedEvent = getEventById(calendar, event.id);

  const finalObj = {
    ...updatedEvent,
    ...updatedProps
  };

  return Calendar.Events.update(finalObj, calendar.id, event.id);
}

export function moveEventToOtherCalendar(calendar: TGoogleCalendar, newCalendar: TGoogleCalendar, event: TGoogleEvent) {
  removeCalendarEvent(calendar, event);
  Utilities.sleep(2000);
  const newEvent = addEventToCalendar(newCalendar, event);
  return newEvent;
}

export function removeCalendarEvent(calendar: TGoogleCalendar, event: TGoogleEvent) {
  Calendar.Events.remove(calendar.id, event.id);
}

export function getEventById(calendar: TGoogleCalendar, eventId: string) {
  const event = Calendar.Events.get(calendar.id, eventId);
  return event;
}
